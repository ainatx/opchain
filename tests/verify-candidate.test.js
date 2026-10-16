// Fixture-based coverage for the I-03 / I-04 / I-05 verifier release
// (docs/audits/2026-10-08-opchain-effectiveness-audit.md §4). Every test
// builds a throwaway enrolled Git repository, copies the verifier runtime into
// it, and drives it through spawnSync exactly the way the pre-commit hook does.

import { spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { dependencyDemands, dependencyRootStatus } from "../scripts/verify-candidate.mjs";

const SOURCE_ROOT = resolve(import.meta.dirname, "..");
const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
  GIT_AUTHOR_NAME: "Verifier Fixture",
  GIT_AUTHOR_EMAIL: "verifier@example.invalid",
  GIT_COMMITTER_NAME: "Verifier Fixture",
  GIT_COMMITTER_EMAIL: "verifier@example.invalid",
};
delete GIT_ENV.OPCHAIN_BYPASS;
delete GIT_ENV.OPCHAIN_GATE;
const scratches = [];

afterEach(() => {
  while (scratches.length) rmSync(scratches.pop(), { recursive: true, force: true });
});

function git(root, ...args) {
  const result = spawnSync("git", args, { cwd: root, env: GIT_ENV, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function commit(root, message) {
  return git(root, "-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", "commit", "-q", "-m", message);
}

function copyRuntime(root) {
  mkdirSync(join(root, "scripts", "lib"), { recursive: true });
  for (const file of ["verify-candidate.mjs", "lib/verification-receipt.cjs", "lib/bypass-record.cjs"]) {
    cpSync(join(SOURCE_ROOT, "scripts", file), join(root, "scripts", file));
  }
}

function policy(overrides = {}) {
  return `${JSON.stringify({
    mode: "strict",
    verification: {
      required_checks: ["tests"],
      commands: { tests: ["node", "check.mjs"] },
      timeout_ms: 10_000,
      ...overrides,
    },
  })}\n`;
}

/**
 * Enrolled fixture repository. `files` are written and committed as the seed;
 * the default check passes.
 */
function initialize({ files = {}, policyText = policy(), container } = {}) {
  const base = container || mkdtempSync(join(tmpdir(), "opchain-verifier-fixture-"));
  if (!container) scratches.push(base);
  const root = container ? join(base, "main") : base;
  mkdirSync(join(root, ".opchain"), { recursive: true });
  git(root, "init", "-q", "-b", "main");
  writeFileSync(join(root, ".opchain", "enrolled"), "candidate verification enabled\n");
  copyRuntime(root);
  writeFileSync(join(root, ".bugcheck.json"), policyText);
  writeFileSync(join(root, ".gitignore"), "node_modules/\n");
  writeFileSync(join(root, "check.mjs"), "process.exit(0);\n");
  writeFileSync(join(root, "subject.txt"), "seed\n");
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(join(root, name, ".."), { recursive: true });
    writeFileSync(join(root, name), content);
  }
  git(root, "add", "-A");
  commit(root, "seed");
  return root;
}

function verifier(root, args, { env = {}, cwd = root } = {}) {
  return spawnSync(process.execPath, [join(root, "scripts", "verify-candidate.mjs"), ...args, "--repo", root], {
    cwd,
    env: { ...GIT_ENV, ...env },
    encoding: "utf8",
  });
}

function commonDir(root) {
  const value = git(root, "rev-parse", "--git-common-dir");
  return realpathSync(isAbsolute(value) ? value : resolve(root, value));
}

function filesUnder(directory, suffix) {
  if (!existsSync(directory)) return [];
  const output = [];
  const visit = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else if (entry.name.endsWith(suffix)) output.push(fullPath);
    }
  };
  visit(directory);
  return output;
}

function receiptFiles(root) {
  return filesUnder(join(commonDir(root), "opchain", "verification-receipts"), ".json");
}

function receipts(root) {
  return receiptFiles(root).map((file) => JSON.parse(readFileSync(file, "utf8")));
}

function installFixtureTool(root, { hollow = false } = {}) {
  const nodeModules = join(root, "node_modules");
  rmSync(nodeModules, { recursive: true, force: true });
  mkdirSync(join(nodeModules, ".vite"), { recursive: true });
  writeFileSync(join(nodeModules, ".vite", "results.json"), "{}\n");
  if (hollow) return;
  mkdirSync(join(nodeModules, "fixture-tool"), { recursive: true });
  writeFileSync(join(nodeModules, "fixture-tool", "package.json"), '{"name":"fixture-tool","version":"1.0.0","bin":"cli.sh"}\n');
  mkdirSync(join(nodeModules, ".bin"), { recursive: true });
  writeFileSync(join(nodeModules, ".bin", "fixture-tool"), "#!/bin/sh\nexit 0\n");
  chmodSync(join(nodeModules, ".bin", "fixture-tool"), 0o755);
}

const DEPENDENT_FILES = {
  "package.json": '{"name":"fixture","private":true,"scripts":{"test":"fixture-tool"},"devDependencies":{"fixture-tool":"1.0.0"}}\n',
};

describe("I-03 (a): diagnostics on the hook path", () => {
  it("prints each failing check with its diagnostic tail, writes a log sidecar, and explains it later", { timeout: 30_000 }, () => {
    const root = initialize({
      files: {
        "check.mjs": 'for (let i = 0; i < 60; i += 1) process.stderr.write(`line ${i}\\n`);\nprocess.stderr.write("useful assertion failure\\n");\nprocess.exit(1);\n',
      },
    });

    const result = verifier(root, ["run", "--commit-boundary"]);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    const stderrLines = result.stderr.trimEnd().split("\n");
    expect(stderrLines[0]).toBe("  ✗ tests FAIL exit=1");
    expect(result.stderr).toContain("useful assertion failure");
    expect(result.stderr).toContain("[... earlier output in the log sidecar]");
    expect(result.stderr).not.toContain("line 5\n");
    expect(result.stderr).toMatch(/ {2}receipt: \S+\.json/);
    expect(result.stderr).toMatch(/ {2}log: \S+\.log/);
    expect(stderrLines.at(-1)).toBe("[opchain] candidate verification failed: checks did not produce an enforceable PASS receipt");

    const [receiptFile] = receiptFiles(root);
    const logFile = receiptFile.replace(/\.json$/, ".log");
    expect(existsSync(logFile)).toBe(true);
    const log = readFileSync(logFile, "utf8");
    expect(log).toContain("## tests FAIL exit=1");
    expect(log).toContain("line 5\n");
    expect(log).toContain("useful assertion failure");
    const receipt = JSON.parse(readFileSync(receiptFile, "utf8"));
    expect(JSON.stringify(receipt)).not.toContain("useful assertion failure");

    const byRunId = verifier(root, ["explain", receipt.run_id]);
    expect(byRunId.status, byRunId.stderr).toBe(0);
    expect(byRunId.stdout).toContain(`receipt ${receipt.run_id} verdict=FAIL`);
    expect(byRunId.stdout).toContain("  ✗ tests FAIL exit=1");
    expect(byRunId.stdout).toContain("useful assertion failure");

    const byPath = verifier(root, ["explain", receiptFile, "--json"]);
    expect(byPath.status, byPath.stderr).toBe(0);
    const explained = JSON.parse(byPath.stdout);
    expect(explained).toMatchObject({ ok: true, verdict: "FAIL", run_id: receipt.run_id });
    expect(explained.failures[0].diagnostic).toContain("line 5");
  });

  it("does not write a log sidecar outside the commit boundary and keeps the JSON contract", { timeout: 30_000 }, () => {
    const root = initialize({ files: { "check.mjs": 'process.stderr.write("boom\\n"); process.exit(1);\n' } });
    const result = verifier(root, ["run", "--json"]);
    expect(result.status).toBe(1);
    const output = JSON.parse(result.stdout);
    expect(output).toMatchObject({ ok: false, verdict: "FAIL", error: "checks did not produce an enforceable PASS receipt" });
    expect(output.failures).toEqual([expect.objectContaining({ id: "tests", status: "FAIL", exit_code: 1 })]);
    expect(output.log_path).toBeUndefined();
    expect(filesUnder(join(commonDir(root), "opchain", "verification-receipts"), ".log")).toHaveLength(0);
  });
});

describe("I-03 (b): dependency validation and the ancestor walk", () => {
  it("treats a hollow node_modules as absent and BLOCKs before any check runs", { timeout: 30_000 }, () => {
    const root = initialize({ files: DEPENDENT_FILES, policyText: policy({ commands: { tests: ["npm", "test"] } }) });
    installFixtureTool(root, { hollow: true });

    const blocked = verifier(root, ["run", "--commit-boundary"]);
    expect(blocked.status).toBe(3);
    expect(blocked.stderr).toContain(`[opchain] BLOCKED — dependencies not installed for ${realpathSync(root)} (run npm ci there); no receipt written`);
    expect(blocked.stderr).toContain("node_modules is absent or hollow");
    expect(receiptFiles(root)).toHaveLength(0);

    const blockedJson = verifier(root, ["run", "--json"]);
    expect(blockedJson.status).toBe(3);
    expect(JSON.parse(blockedJson.stdout)).toMatchObject({ ok: false, blocked: true });

    installFixtureTool(root);
    const passed = verifier(root, ["run", "--json"]);
    expect(passed.status, passed.stderr).toBe(0);
    expect(JSON.parse(passed.stdout)).toMatchObject({ ok: true, verdict: "PASS" });
    expect(git(root, "ls-files")).not.toContain("node_modules");
  });

  it("blocks when the installed node_modules lacks the .bin entry a check needs", { timeout: 30_000 }, () => {
    const root = initialize({ files: DEPENDENT_FILES, policyText: policy({ commands: { tests: ["npm", "test"] } }) });
    installFixtureTool(root);
    rmSync(join(root, "node_modules", ".bin"), { recursive: true, force: true });
    const blocked = verifier(root, ["run"]);
    expect(blocked.status).toBe(3);
    expect(blocked.stderr).toContain("node_modules/.bin/fixture-tool is missing");
    expect(receiptFiles(root)).toHaveLength(0);
  });

  it("resolves a nested worktree's dependencies from the ancestor checkout", { timeout: 30_000 }, () => {
    const container = mkdtempSync(join(tmpdir(), "opchain-verifier-ancestor-"));
    scratches.push(container);
    mkdirSync(join(container, "main"));
    const root = initialize({ files: DEPENDENT_FILES, policyText: policy({ commands: { tests: ["npm", "test"] } }), container });
    installFixtureTool(root);
    const linked = join(root, ".claude", "worktrees", "feature");
    git(root, "worktree", "add", "-q", "-b", "feature", linked, "HEAD");
    expect(existsSync(join(linked, "node_modules"))).toBe(false);

    const result = verifier(linked, ["run", "--json"]);
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ ok: true, verdict: "PASS" });
    expect(existsSync(join(linked, "node_modules"))).toBe(false);
  });

  it("leaves untargeted nested packages and dependency-free roots alone", { timeout: 30_000 }, () => {
    const root = initialize({
      files: {
        "package.json": '{"name":"fixture","private":true}\n',
        "tools/runtime/package.json": '{"name":"runtime","dependencies":{"never-installed":"1.0.0"}}\n',
      },
    });
    const result = verifier(root, ["run", "--json"]);
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ ok: true, verdict: "PASS" });
  });

  it("derives bins per targeted package from commands and their npm scripts", () => {
    const root = mkdtempSync(join(tmpdir(), "opchain-verifier-demands-"));
    scratches.push(root);
    mkdirSync(join(root, "site"));
    writeFileSync(join(root, "package.json"), '{"scripts":{"test":"vitest run","build":"node build.mjs","prebuild":"npm run gen && cd site && astro build","gen":"node gen.mjs"}}\n');
    writeFileSync(join(root, "site", "package.json"), '{"scripts":{"check":"astro check"}}\n');
    const demands = dependencyDemands(root, {
      type_safety: ["npm", "--prefix", "site", "run", "check"],
      tests: ["npm", "test"],
      build: ["npm", "run", "build"],
      lint: ["node", "lint.mjs"],
      audit: ["npm", "audit"],
    });
    expect([...demands.get(".")]).toEqual(["vitest"]);
    expect([...demands.get("site")]).toEqual(["astro"]);
    expect(demands.has("tools")).toBe(false);
  });

  it("judges a dependency root by presence, bins, direct deps, and lockfile agreement", () => {
    const root = mkdtempSync(join(tmpdir(), "opchain-verifier-root-status-"));
    scratches.push(root);
    writeFileSync(join(root, "package.json"), '{"devDependencies":{"fixture-tool":"1.0.0"}}\n');
    writeFileSync(join(root, "package-lock.json"), '{"packages":{"node_modules/fixture-tool":{"version":"1.0.0"},"node_modules/platform-only":{"version":"2.0.0","optional":true}}}\n');
    expect(dependencyRootStatus(root, root, new Set())).toMatchObject({ ok: false, reason: "node_modules is absent or hollow" });
    installFixtureTool(root, { hollow: true });
    expect(dependencyRootStatus(root, root, new Set())).toMatchObject({ ok: false, reason: "node_modules is absent or hollow" });
    installFixtureTool(root);
    expect(dependencyRootStatus(root, root, new Set(["fixture-tool"]))).toEqual({ ok: true });
    expect(dependencyRootStatus(root, root, new Set(["astro"])).reason).toBe("node_modules/.bin/astro is missing");
    writeFileSync(join(root, "node_modules", ".package-lock.json"), '{"packages":{"node_modules/fixture-tool":{"version":"0.9.0"}}}\n');
    expect(dependencyRootStatus(root, root, new Set()).reason).toContain("package-lock.json wants 1.0.0");
  });
});

describe("I-03 (c)/(d): timeouts, exit 127, and the gate lock", () => {
  it("records a timeout as INCONCLUSIVE and leaves no surviving process in the group", { timeout: 40_000 }, () => {
    const marker = `opchain-verifier-sleeper-${process.pid}-${Date.now()}`;
    const root = initialize({
      files: {
        "check.mjs": `import { spawn } from "node:child_process";
process.on("SIGTERM", () => {});
spawn(process.execPath, ["-e", "process.on('SIGTERM', () => {}); setTimeout(() => {}, 60000)", "--", ${JSON.stringify(marker)}], { stdio: "inherit" });
setTimeout(() => {}, 60000);
`,
      },
      policyText: policy({ timeout_ms: 1000 }),
    });

    const result = verifier(root, ["run", "--commit-boundary"]);
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/\[opchain\] candidate verification inconclusive: tests timed out after \d+ ms under load [\d.]+ — retry when load drops/);
    expect(result.stderr).toContain("  ✗ tests TIMEOUT exit=124");
    const [receipt] = receipts(root);
    expect(receipt.verdict).toBe("INCONCLUSIVE");
    expect(receipt.checks[0]).toMatchObject({ id: "tests", status: "TIMEOUT", exit_code: 124 });
    expect(typeof receipt.environment.loadavg_1m).toBe("number");

    const survivors = spawnSync("pgrep", ["-f", marker], { encoding: "utf8" });
    expect(survivors.stdout.trim(), `surviving processes: ${survivors.stdout}`).toBe("");

    const enforced = verifier(root, ["enforce", "--json"]);
    expect(enforced.status).toBe(1);
    expect(JSON.parse(enforced.stdout)).toMatchObject({ ok: false, error: "no matching PASS receipt" });
  });

  it("maps exit 127 inside a check to UNSUPPORTED_ENV and an INCONCLUSIVE verdict", { timeout: 30_000 }, () => {
    const root = initialize({ policyText: policy({ commands: { tests: ["sh", "-c", "exit 127"] } }) });
    const result = verifier(root, ["run"]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("  ✗ tests UNSUPPORTED_ENV exit=127");
    expect(result.stderr).toContain("[opchain] candidate verification inconclusive: tests exited 127 (command not found)");
    const [receipt] = receipts(root);
    expect(receipt.verdict).toBe("INCONCLUSIVE");
    expect(receipt.checks[0].status).toBe("UNSUPPORTED_ENV");
  });

  it("waits on a held gate lock, reports the holder, and goes INCONCLUSIVE after the wait budget", { timeout: 30_000 }, () => {
    const root = initialize();
    const lockDir = join(commonDir(root), "opchain", "commit-gate", "lock");
    mkdirSync(lockDir, { recursive: true });
    writeFileSync(join(lockDir, "owner.json"), `${JSON.stringify({ pid: process.pid, at: new Date().toISOString(), worktree: "/elsewhere/worktree" })}\n`);

    const waited = verifier(root, ["run"], {
      env: { OPCHAIN_GATE_LOCK_WAIT_MS: "1200", OPCHAIN_GATE_LOCK_POLL_MS: "200", OPCHAIN_GATE_LOCK_REPORT_MS: "300" },
    });
    expect(waited.status).toBe(2);
    expect(waited.stderr).toContain(`[opchain] waiting for another verification in /elsewhere/worktree (pid ${process.pid})`);
    expect(waited.stderr).toContain("[opchain] candidate verification inconclusive: another verification in /elsewhere/worktree");
    expect(receiptFiles(root)).toHaveLength(0);
    expect(existsSync(lockDir)).toBe(true);

    const dead = spawnSync(process.execPath, ["-e", "0"]);
    writeFileSync(join(lockDir, "owner.json"), `${JSON.stringify({ pid: dead.pid, at: new Date().toISOString(), worktree: "/gone" })}\n`);
    const recovered = verifier(root, ["run", "--json"]);
    expect(recovered.status, recovered.stderr).toBe(0);
    expect(JSON.parse(recovered.stdout)).toMatchObject({ ok: true, verdict: "PASS" });
    expect(existsSync(lockDir)).toBe(false);
  });
});

describe("I-03 (e): policy preflight", () => {
  it("refuses a policy without a verification block and writes no receipt", { timeout: 30_000 }, () => {
    const root = initialize({ policyText: '{"mode":"strict","checks":{"tests":{"enabled":true}}}\n' });
    const result = verifier(root, ["run", "--commit-boundary"]);
    expect(result.status).toBe(3);
    expect(result.stderr).toContain('[opchain] BLOCKED — .bugcheck.json predates the commit gate (no "verification" block); merge main or run /oc-enroll; no receipt written');
    expect(receiptFiles(root)).toHaveLength(0);

    const missing = initialize();
    rmSync(join(missing, ".bugcheck.json"));
    git(missing, "add", "-A");
    const absent = verifier(missing, ["run", "--json"]);
    expect(absent.status).toBe(3);
    expect(JSON.parse(absent.stdout)).toMatchObject({ ok: false, blocked: true, error: expect.stringContaining("missing") });
    expect(receiptFiles(missing)).toHaveLength(0);
  });
});

describe("I-05: receipt reuse", () => {
  it("reuses an enforceable PASS receipt for an identical tree instead of re-running", { timeout: 30_000 }, () => {
    const root = initialize();
    const first = verifier(root, ["run", "--json"]);
    expect(first.status, first.stderr).toBe(0);
    const firstReceipt = JSON.parse(readFileSync(JSON.parse(first.stdout).receipt_path, "utf8"));

    const second = verifier(root, ["run", "--commit-boundary"]);
    expect(second.status, second.stderr).toBe(0);
    expect(second.stdout.trim()).toBe(`[opchain] receipt reused (${firstReceipt.run_id}, ${firstReceipt.verified_at})`);
    expect(receiptFiles(root)).toHaveLength(1);

    const asJson = verifier(root, ["run", "--json"]);
    expect(JSON.parse(asJson.stdout)).toMatchObject({ ok: true, reused: "identical", run_id: firstReceipt.run_id });
  });

  it("inherits the PASS of the projection when the staged diff touches only .checkpoints/", { timeout: 30_000 }, () => {
    const root = initialize();
    const first = verifier(root, ["run", "--json"]);
    expect(first.status, first.stderr).toBe(0);
    const firstRunId = JSON.parse(readFileSync(JSON.parse(first.stdout).receipt_path, "utf8")).run_id;

    mkdirSync(join(root, ".checkpoints"), { recursive: true });
    writeFileSync(join(root, ".checkpoints", "oc-demo.checkpoint.json"), '{"step":"after"}\n');
    git(root, "add", ".checkpoints");
    const tree = git(root, "write-tree");

    const reused = verifier(root, ["run"]);
    expect(reused.status, reused.stderr).toBe(0);
    expect(reused.stdout).toContain(`[opchain] receipt reused (${firstRunId},`);
    expect(reused.stdout).toContain("checkpoint-only change");
    const derived = receipts(root).find((receipt) => receipt.candidate.tree === tree);
    expect(derived).toMatchObject({ verdict: "PASS", environment: { reused_from: { run_id: firstRunId } } });

    const enforced = verifier(root, ["enforce", "--json"]);
    expect(enforced.status, enforced.stderr).toBe(0);

    writeFileSync(join(root, "subject.txt"), "code change too\n");
    git(root, "add", "subject.txt");
    const rerun = verifier(root, ["run"]);
    expect(rerun.status, rerun.stderr).toBe(0);
    expect(rerun.stdout).toContain("[opchain] verified staged candidate");
    expect(rerun.stdout).not.toContain("receipt reused");
  });
});

describe("I-04: bypass records", () => {
  it("records an uncovered commit, appends to the oc-bug-check checkpoint, and stays silent for a covered tree", { timeout: 30_000 }, () => {
    const root = initialize({ files: { ".checkpoints/.keep": "" } });
    const sha = git(root, "rev-parse", "HEAD");
    const tree = git(root, "rev-parse", "HEAD^{tree}");

    const recorded = verifier(root, ["bypass-record", "--commit", "HEAD", "--reason", "pre-existing gate failures", "--source", "no-verify"]);
    expect(recorded.status, recorded.stderr).toBe(0);
    expect(recorded.stderr.trim()).toBe(`[opchain] ⚠ commit ${sha} bypassed the gate — recorded`);
    const recordFile = join(commonDir(root), "opchain", "bypasses", "v1", `${sha}.json`);
    expect(JSON.parse(readFileSync(recordFile, "utf8"))).toMatchObject({
      schema: "opchain.bypass-record",
      version: 1,
      commit: sha,
      tree,
      source: "no-verify",
      reason: "pre-existing gate failures",
      approved_by: null,
    });
    const checkpointFile = join(root, ".checkpoints", "oc-bug-check.checkpoint.json");
    const checkpoint = JSON.parse(readFileSync(checkpointFile, "utf8"));
    for (const field of ["protocol_version", "skill", "project", "project_dir", "created_at", "updated_at", "phase", "step", "status", "progress_summary"]) {
      expect(checkpoint[field], field).toBeTruthy();
    }
    expect(checkpoint.skill).toBe("oc-bug-check");
    expect(checkpoint.skill_state.bypasses).toEqual([expect.objectContaining({ commit: sha, tree, reason: "pre-existing gate failures" })]);

    const again = verifier(root, ["bypass-record", "--commit", "HEAD"]);
    expect(again.status).toBe(0);
    expect(JSON.parse(readFileSync(checkpointFile, "utf8")).skill_state.bypasses).toHaveLength(1);

    const passed = verifier(root, ["run", "--json"]);
    expect(passed.status, passed.stderr).toBe(0);
    const covered = verifier(root, ["bypass-record", "--commit", "HEAD", "--json"]);
    expect(covered.status).toBe(0);
    expect(JSON.parse(covered.stdout)).toMatchObject({ ok: true, recorded: false });
  });

  it("honours OPCHAIN_BYPASS=1 only at the commit boundary and finalises the pending record post-commit", { timeout: 30_000 }, () => {
    const root = initialize();
    writeFileSync(join(root, "subject.txt"), "bypassed change\n");
    git(root, "add", "subject.txt");
    const tree = git(root, "write-tree");

    const bypassed = verifier(root, ["run", "--commit-boundary"], { env: { OPCHAIN_BYPASS: "1", OPCHAIN_BYPASS_REASON: "owner said 1" } });
    expect(bypassed.status, bypassed.stderr).toBe(0);
    expect(bypassed.stderr.trim()).toBe("[opchain] ⚠ gate bypassed via OPCHAIN_BYPASS=1 — will be recorded post-commit");
    const pendingFile = join(commonDir(root), "opchain", "bypasses", "v1", `${tree}.pending.json`);
    expect(JSON.parse(readFileSync(pendingFile, "utf8"))).toMatchObject({ source: "env", tree, commit: null, reason: "owner said 1" });
    expect(receiptFiles(root)).toHaveLength(0);

    commit(root, "bypassed");
    const sha = git(root, "rev-parse", "HEAD");
    const finalised = verifier(root, ["bypass-record", "--commit", sha, "--json"]);
    expect(finalised.status, finalised.stderr).toBe(0);
    expect(JSON.parse(finalised.stdout)).toMatchObject({ recorded: true, record: { commit: sha, source: "env", reason: "owner said 1" } });
    expect(existsSync(pendingFile)).toBe(false);
    expect(existsSync(join(commonDir(root), "opchain", "bypasses", "v1", `${sha}.json`))).toBe(true);

    const notBoundary = verifier(root, ["run", "--json"], { env: { OPCHAIN_BYPASS: "1" } });
    expect(notBoundary.status, notBoundary.stderr).toBe(0);
    expect(JSON.parse(notBoundary.stdout)).toMatchObject({ ok: true, verdict: "PASS" });
    expect(receiptFiles(root)).toHaveLength(1);
  });

  it("lists receipt, record, and trailer status for every commit in a range", { timeout: 30_000 }, () => {
    const root = initialize();
    const base = git(root, "rev-parse", "HEAD");

    writeFileSync(join(root, "subject.txt"), "verified\n");
    git(root, "add", "subject.txt");
    expect(verifier(root, ["run", "--json"]).status).toBe(0);
    commit(root, "verified change");
    const verified = git(root, "rev-parse", "HEAD");

    writeFileSync(join(root, "subject.txt"), "recorded bypass\n");
    git(root, "add", "subject.txt");
    commit(root, "recorded bypass");
    const recorded = git(root, "rev-parse", "HEAD");
    expect(verifier(root, ["bypass-record", "--commit", recorded]).status).toBe(0);

    writeFileSync(join(root, "subject.txt"), "trailer only\n");
    git(root, "add", "subject.txt");
    commit(root, "trailer only\n\nbugcheck: bypassed (owner replied 1)");
    const trailer = git(root, "rev-parse", "HEAD");

    const listed = verifier(root, ["bypass-list", "--range", `${base}..${trailer}`, "--json"]);
    expect(listed.status, listed.stderr).toBe(0);
    expect(JSON.parse(listed.stdout)).toEqual([
      expect.objectContaining({ commit: verified, receipt: "PASS", bypassRecord: false, trailer: false }),
      expect.objectContaining({ commit: recorded, receipt: "none", bypassRecord: true, trailer: false }),
      expect.objectContaining({ commit: trailer, receipt: "none", bypassRecord: false, trailer: true }),
    ]);

    const human = verifier(root, ["bypass-list", "--range", `${base}..${trailer}`]);
    expect(human.stdout).toContain(`${recorded.slice(0, 12)} receipt=none bypass=yes trailer=no recorded bypass`);
    expect(human.stdout).toContain(`${trailer.slice(0, 12)} receipt=none bypass=no trailer=yes trailer only`);

    const withTrailerReason = verifier(root, ["bypass-record", "--commit", trailer, "--json"]);
    expect(JSON.parse(withTrailerReason.stdout).record.reason).toBe("owner replied 1");
  });

  it("counts only a real Git trailer with a value as a bypass trailer (A-08)", { timeout: 30_000 }, () => {
    const root = initialize();
    const base = git(root, "rev-parse", "HEAD");
    const messages = {
      prose: "mentions Opchain-Bypass: in a sentence\n\nand bugcheck: bypassed (not a trailer) in prose, then more text",
      empty: "empty value\n\nOpchain-Bypass:",
      legacyNoReason: "legacy without a reason\n\nbugcheck: bypassed",
      explicit: "explicit\n\nOpchain-Bypass: owner approved in chat",
      legacy: "legacy\n\nbugcheck: bypassed (owner replied 1)",
    };
    const shas = {};
    for (const [name, message] of Object.entries(messages)) {
      writeFileSync(join(root, "subject.txt"), `${name}\n`);
      git(root, "add", "subject.txt");
      commit(root, message);
      shas[name] = git(root, "rev-parse", "HEAD");
    }
    const listed = JSON.parse(verifier(root, ["bypass-list", "--range", `${base}..HEAD`, "--json"]).stdout);
    const trailer = Object.fromEntries(listed.map((row) => [Object.keys(shas).find((name) => shas[name] === row.commit), row.trailer]));
    expect(trailer).toEqual({ prose: false, empty: false, legacyNoReason: false, explicit: true, legacy: true });
  });

  it("does not let a PASS under a different policy suppress the bypass record (A-08)", { timeout: 30_000 }, () => {
    const root = initialize({ files: { "alt.json": policy({ required_checks: ["anti_patterns"] }) } });
    const passed = verifier(root, ["run", "--json", "--policy", "alt.json"]);
    expect(passed.status, passed.stderr).toBe(0);
    expect(receipts(root).map((receipt) => receipt.verdict)).toEqual(["PASS"]);
    const recorded = verifier(root, ["bypass-record", "--commit", "HEAD", "--json"]);
    expect(recorded.status, recorded.stderr).toBe(0);
    expect(JSON.parse(recorded.stdout)).toMatchObject({ recorded: true });
    // bypass-list agrees: that PASS is not coverage on the push path.
    const listed = JSON.parse(verifier(root, ["bypass-list", "--range", "HEAD^!", "--json"]).stdout);
    expect(listed[0].receipt).toBe("PASS_UNMATCHED");
  });

  it("weak-policy repro: PASS under weak.json, real policy FAILs, --no-verify commit is uncovered (A-08)", { timeout: 30_000 }, () => {
    const root = initialize({ files: { "check.mjs": "process.exit(1);\n", "weak.json": policy({ required_checks: ["secrets"], commands: {} }) } });
    const base = git(root, "rev-parse", "HEAD");
    writeFileSync(join(root, "subject.txt"), "weakly verified\n");
    git(root, "add", "subject.txt");
    expect(verifier(root, ["run", "--json", "--policy", "weak.json"]).status).toBe(0);
    expect(verifier(root, ["run", "--json"]).status).not.toBe(0);
    commit(root, "weakly verified");
    const sha = git(root, "rev-parse", "HEAD");
    expect(JSON.parse(verifier(root, ["bypass-record", "--commit", sha, "--json"]).stdout)).toMatchObject({ recorded: true });
    const rows = JSON.parse(verifier(root, ["bypass-list", "--range", `${base}..${sha}`, "--json"]).stdout);
    expect(rows).toEqual([expect.objectContaining({ commit: sha, receipt: "PASS_UNMATCHED", bypassRecord: true, trailer: false, rewrite: false })]);
    // Nor does that PASS excuse a rewrite of the commit.
    writeFileSync(join(root, "subject.txt"), "replayed\n");
    git(root, "add", "subject.txt");
    commit(root, "replayed");
    const replay = git(root, "rev-parse", "HEAD");
    expect(verifier(root, ["bypass-record", "--commit", replay, "--source", "rebase", "--rewritten-from", sha]).status).toBe(0);
    const replayRow = JSON.parse(verifier(root, ["bypass-list", "--range", `${replay}^!`, "--json"]).stdout)[0];
    expect(replayRow.rewrite).toBe(false);
  });

  it("excuses a rewrite only when the picked commit was accountable (A-01)", { timeout: 30_000 }, () => {
    const root = initialize();
    const base = git(root, "rev-parse", "HEAD");
    const make = (content, message) => {
      writeFileSync(join(root, "subject.txt"), `${content}\n`);
      git(root, "add", "subject.txt");
      commit(root, message);
      return git(root, "rev-parse", "HEAD");
    };
    writeFileSync(join(root, "subject.txt"), "gated original\n");
    git(root, "add", "subject.txt");
    expect(verifier(root, ["run", "--json"]).status).toBe(0);
    commit(root, "gated original");
    const gated = git(root, "rev-parse", "HEAD");
    const ungated = make("ungated original", "ungated original");
    const fromGated = make("replay of gated", "replay of gated");
    const fromUngated = make("replay of ungated", "replay of ungated");
    const saysSo = make("claims a rewrite", "claims a rewrite");
    const chained = make("replay of the replay", "replay of the replay");
    expect(verifier(root, ["bypass-record", "--commit", fromGated, "--source", "rebase", "--rewritten-from", gated]).status).toBe(0);
    expect(verifier(root, ["bypass-record", "--commit", fromUngated, "--source", "rebase", "--rewritten-from", ungated]).status).toBe(0);
    expect(verifier(root, ["bypass-record", "--commit", saysSo, "--source", "rebase", "--reason", "rewritten by rebase; the original commits were gated"]).status).toBe(0);
    expect(verifier(root, ["bypass-record", "--commit", chained, "--source", "rebase", "--rewritten-from", fromGated]).status).toBe(0);
    const rows = JSON.parse(verifier(root, ["bypass-list", "--range", `${base}..HEAD`, "--json"]).stdout);
    const rewrite = Object.fromEntries(rows.map((row) => [row.commit, row.rewrite]));
    expect(rewrite[fromGated]).toBe(true);
    expect(rewrite[chained]).toBe(true);
    expect(rewrite[fromUngated]).toBe(false);
    expect(rewrite[saysSo]).toBe(false);
    expect(rows.find((row) => row.commit === fromGated).rewritten_from).toBe(gated);
  });
});
