import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const roots = [];

function fixture(manifest, files = {}) {
  const root = mkdtempSync(join(tmpdir(), "opchain-hardening-"));
  roots.push(root);
  mkdirSync(join(root, ".opchain"), { recursive: true });
  if (manifest !== null) writeFileSync(join(root, ".opchain/hardening.yaml"), manifest);
  for (const [path, value] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), value);
  }
  return root;
}

function run(root, args = ["--pre-deploy"]) {
  return spawnSync(process.execPath, ["scripts/check-hardening.mjs", ...args], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
    env: { ...process.env, OPCHAIN_HARDENING_ROOT: root },
  });
}

afterEach(() => {
  while (roots.length) rmSync(roots.pop(), { recursive: true, force: true });
});

describe("hardening manifest deploy gate", () => {
  it("deploys only a clean generated tree and rejects test-only gate overrides", () => {
    const source = readFileSync(join(new URL("..", import.meta.url).pathname, "scripts/deploy.mjs"), "utf8");
    const prebuild = source.lastIndexOf('run("npm", ["run", "prebuild"])');
    const generatedClean = source.lastIndexOf('assertCleanCheckout("after prebuild")');
    const hardening = source.lastIndexOf('run("npm", ["run", "hardening:verify"])');
    const deploy = source.lastIndexOf('run("npx", STAGING ? ["wrangler", "deploy"');
    expect(prebuild).toBeGreaterThan(0);
    expect(prebuild).toBeLessThan(generatedClean);
    expect(generatedClean).toBeLessThan(hardening);
    expect(hardening).toBeLessThan(deploy);
    expect(source).toContain('assertCleanCheckout("preflight")');
    expect(source).toContain('assertNoHardeningOverrides()');
    expect(source).toContain('["OPCHAIN_HARDENING_ROOT", "OPCHAIN_HARDENING_PATH"]');
  });

  it("captures rollback state and auto-rolls back failed live verification", () => {
    const source = readFileSync(join(new URL("..", import.meta.url).pathname, "scripts/deploy.mjs"), "utf8");
    expect(source).toContain("const rollbackVersion = captureRollbackVersion()");
    expect(source).toContain("rollbackAfterFailure(rollbackVersion, versionCheck.detail)");
    expect(source).toContain("rollbackAfterFailure(rollbackVersion, label)");
    expect(source).toContain('"wrangler", "rollback", versionId');
  });

  it("deploys only the exact fetched origin/main and narrows the tag bypass", () => {
    const source = readFileSync(join(new URL("..", import.meta.url).pathname, "scripts/deploy.mjs"), "utf8");
    expect(source).toContain("if (head !== main)");
    expect(source).toContain("HEAD matches fetched origin/main");
    expect(source).toContain('new Set(["missing-tag", "unpushed-tag"])');
    expect(source).toContain("bypassableReasons.has(result.reason)");
  });

  it("bounds every smoke curl so rollback cannot wait indefinitely", () => {
    const source = readFileSync(join(new URL("..", import.meta.url).pathname, "scripts/smoke.sh"), "utf8");
    expect(source).toContain('command curl --connect-timeout "$SMOKE_CONNECT_TIMEOUT" --max-time "$SMOKE_MAX_TIME"');
    expect(source.match(/\bcurl\s+-/g) || []).toHaveLength(1);
  });

  it("parses the live MCP probe as JSON-RPC and validates a signed token", () => {
    const runner = readFileSync(join(new URL("..", import.meta.url).pathname, "scripts/check-hardening.mjs"), "utf8");
    expect(runner).toContain('spec.response_shape !== "mcp-session-token"');
    expect(runner).toContain('envelope.jsonrpc !== "2.0"');
    expect(runner).toContain("MCP session probe did not return a signed token");
  });

  it("stays additive when no manifest exists", () => {
    const result = run(fixture(null));
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("conditional gate inactive");
  });

  it("passes a config control confined to the repository", () => {
    const root = fixture(
      "version: 1\ncontrols:\n  - id: headers.test\n    control: test header\n    verify:\n      method: config\n      path: src/header.js\n      contains: Strict-Transport-Security\n",
      { "src/header.js": 'headers.set("Strict-Transport-Security", "max-age=1")\n' },
    );
    const result = run(root);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("headers.test/config");
  });

  it("fails closed on malformed and unknown verify methods", () => {
    const result = run(fixture(
      "version: 1\ncontrols:\n  - id: broken\n    control: broken\n    verify:\n      method: magic\n",
    ));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("unknown verify method");
  });

  it("fails closed on an empty verify list", () => {
    const result = run(fixture(
      "version: 1\ncontrols:\n  - id: empty\n    control: no checks\n    verify: []\n",
    ));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("must not be empty");
  });

  it("rejects shell syntax in test commands", () => {
    const result = run(fixture(
      "version: 1\ncontrols:\n  - id: unsafe\n    control: unsafe command\n    verify:\n      method: test\n      cmd: npm test && touch escaped\n",
    ));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("unsafe or unsupported test command");
  });

  it("skips an HTTP-only control pre-deploy for mandatory live replay", () => {
    const result = run(fixture(
      "version: 1\ncontrols:\n  - id: unsound\n    control: live only\n    verify:\n      method: http\n      url: /\n      status: 200\n",
    ));
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("live HTTP replay waits for a deploy target");
  });

  it("validates HTTP schemas before a pre-deploy live skip", () => {
    for (const verify of [
      "method: http\n      url: https://evil.example\n      status: 200",
      "method: http\n      url: /\n      request_method: DELETE\n      status: 200",
      "method: http\n      url: /\n      request_method: POST\n      status: 200",
      "method: http\n      url: /",
    ]) {
      const result = run(fixture(
        `version: 1\ncontrols:\n  - id: malformed.http\n    control: malformed live check\n    verify:\n      ${verify}\n`,
      ));
      expect(result.status).toBe(1);
    }
  });

  it("rejects mutating package scripts and CLIs in test checks", () => {
    for (const cmd of ["npm run deploy", "npx --no -- wrangler deploy"]) {
      const result = run(fixture(
        `version: 1\ncontrols:\n  - id: unsafe\n    control: unsafe command\n    verify:\n      method: test\n      cmd: "${cmd}"\n`,
      ));
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("unsafe or unsupported test command");
    }
  });

  it("fails closed on invalid manual freshness configuration", () => {
    const result = run(fixture(
      "version: 1\ncontrols:\n  - id: manual.invalid\n    control: invalid freshness\n    verify:\n      method: manual\n      instructions: verify it\n      last_manual_check: 2026-09-01\n      max_age_days: nope\n",
    ));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("finite non-negative");
  });

  it("refuses CSP enforce without a reviewed stage-history stamp", () => {
    const result = run(fixture(
      "version: 1\ncontrols:\n  - id: csp.stage\n    control: CSP rollout\n    stage: enforce\n    stage_history:\n      - stage: inventory\n        date: 2026-09-01\n      - stage: enforce\n        date: 2026-09-02\n    verify:\n      method: config\n      path: csp.txt\n      contains: enforce\n",
      { "csp.txt": "enforce\n" },
    ));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("requires a reviewed");
  });

  it("accepts CSP enforce only after an ordered reviewed stamp", () => {
    const result = run(fixture(
      "version: 1\ncontrols:\n  - id: csp.stage\n    control: CSP rollout\n    stage: enforce\n    stage_history:\n      - stage: inventory\n        date: 2026-08-20\n      - stage: report-only\n        date: 2026-08-21\n      - stage: reviewed\n        date: 2026-09-01\n      - stage: enforce\n        date: 2026-09-02\n    verify:\n      method: config\n      path: csp.txt\n      contains: enforce\n",
      { "csp.txt": "enforce\n" },
    ));
    expect(result.status).toBe(0);
  });

  it("refuses CSP history that skips report-only", () => {
    const result = run(fixture(
      "version: 1\ncontrols:\n  - id: csp.stage\n    control: CSP rollout\n    stage: reviewed\n    stage_history:\n      - stage: inventory\n        date: 2026-08-20\n      - stage: reviewed\n        date: 2026-09-01\n    verify:\n      method: config\n      path: csp.txt\n      contains: reviewed\n",
      { "csp.txt": "reviewed\n" },
    ));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("cannot skip rollout stages");
  });

  it("refuses retrograde or future CSP history dates", () => {
    const histories = [
      "      - { stage: inventory, date: 2026-09-02 }\n      - { stage: report-only, date: 2026-09-01 }",
      "      - { stage: inventory, date: 2999-01-01 }",
    ];
    for (const history of histories) {
      const stage = history.includes("report-only") ? "report-only" : "inventory";
      const result = run(fixture(
        `version: 1\ncontrols:\n  - id: csp.stage\n    control: CSP rollout\n    stage: ${stage}\n    stage_history:\n${history}\n    verify:\n      method: config\n      path: csp.txt\n      contains: ${stage}\n`,
        { "csp.txt": `${stage}\n` },
      ));
      expect(result.status).toBe(1);
    }
  });

  it("refuses a report-only CSP window more than 14 days overdue", () => {
    const result = run(fixture(
      "version: 1\ncontrols:\n  - id: csp.stage\n    control: CSP rollout\n    stage: report-only\n    review_window_ends: 2020-01-01\n    stage_history:\n      - stage: inventory\n        date: 2019-12-01\n      - stage: report-only\n        date: 2019-12-02\n    verify:\n      method: config\n      path: csp.txt\n      contains: report-only\n",
      { "csp.txt": "report-only\n" },
    ));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("more than 14 days overdue");
  });
});
