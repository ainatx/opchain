import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { findPmAwareSkills, parsePmYaml } from "../../scripts/lib/pm-mcp-checks.mjs";

const ROOT = join(import.meta.dirname, "..", "..");

function rootWithLegacyCheckpoint() {
  const root = mkdtempSync(join(tmpdir(), "oc-e1-"));
  mkdirSync(join(root, ".checkpoints"), { recursive: true });
  writeFileSync(join(root, ".checkpoints", "oc-telemetry-ops.checkpoint.json"), JSON.stringify({
    telemetry_handle: { enabled: true, id: "cloned-handle" },
  }));
  return root;
}

function telemetry(root, ...args) {
  return spawnSync(process.execPath, [join(ROOT, "scripts", "telemetry.mjs"), ...args], {
    cwd: ROOT, env: { ...process.env, OPCHAIN_ROOT: root }, encoding: "utf8",
  });
}

describe("audit remediation E1: local consent and telemetry validation", () => {
  it("does not infer consent from a cloned tracked checkpoint", () => {
    const root = rootWithLegacyCheckpoint();
    const result = telemetry(root, "record", "--skill=oc-app-architect", "--command=/oc-build");
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
    expect(() => readFileSync(join(root, ".checkpoints", "usage.sqlite"))).toThrow();
  });

  it("ignores invalid record flags only while local consent is off", () => {
    const root = rootWithLegacyCheckpoint();
    const skipped = telemetry(root, "record", "--unexpected=1", "not-a-flag");
    expect(skipped.status).toBe(0);
    expect(skipped.stderr).toBe("");
    expect(() => readFileSync(join(root, ".checkpoints", "usage.sqlite"))).toThrow();
    expect(telemetry(root, "enable").status).toBe(0);
    expect(telemetry(root, "record", "--skill=oc-app-architect", "--unexpected=1").status).toBe(1);
  });

  it("rejects empty, whitespace-only, and valueless numeric flags", { timeout: 20_000 }, () => {
    const root = rootWithLegacyCheckpoint();
    expect(telemetry(root, "enable").status).toBe(0);
    for (const flag of ["cost", "in", "out", "duration"]) {
      for (const argument of [`--${flag}=`, `--${flag}= `, `--${flag}`]) {
        expect(telemetry(root, "record", "--skill=oc-app-architect", argument).status).toBe(1);
      }
    }
    expect(telemetry(root, "status").stdout).toContain("0 metered run");
  });

  it("keeps consent local across enable, disable, and re-enable", () => {
    const root = rootWithLegacyCheckpoint();
    expect(telemetry(root, "enable").status).toBe(0);
    expect(telemetry(root, "record", "--skill=oc-app-architect", "--phase=build", "--command=/oc-build", "--in=1").status).toBe(0);
    expect(telemetry(root, "disable").status).toBe(0);
    expect(telemetry(root, "record", "--skill=oc-app-architect", "--command=/oc-build").status).toBe(0);
    expect(telemetry(root, "enable").status).toBe(0);
    const status = telemetry(root, "status");
    expect(status.status).toBe(0);
    expect(status.stdout).toContain("rows:   1 metered run");
  });

  it("rejects PII-shaped command values, unknown catalog IDs, and malformed numeric inputs", () => {
    const root = rootWithLegacyCheckpoint();
    expect(telemetry(root, "enable").status).toBe(0);
    for (const args of [
      ["record", "--skill=oc-not-a-skill"],
      ["record", "--skill=oc-app-architect", "--command=/oc-build user@example.test"],
      ["record", "--skill=oc-app-architect", "--in=1.5"],
      ["record", "--skill=oc-app-architect", "--cost=NaN"],
      ["record", "--skill=oc-app-architect", "--tier=full-model-name"],
    ]) expect(telemetry(root, ...args).status).toBe(1);
  });
}, 30_000);

describe("audit remediation E1: PM contract inventory and identities", () => {
  it("discovers every PM-aware skill instead of a fixed five-skill allowlist", () => {
    const ids = findPmAwareSkills(join(ROOT, "skills"));
    expect(ids).toContain("oc-release-ops");
    expect(ids).toContain("oc-code-auditor");
    expect(ids.length).toBeGreaterThan(5);
  });

  it("parses nested PM configuration with the full YAML parser", () => {
    expect(parsePmYaml("states:\n  extended:\n    blocked: Blocked\ntool_overrides:\n  get_issue: mcp__corp__get_issue\n")).toEqual({
      states: { extended: { blocked: "Blocked" } }, tool_overrides: { get_issue: "mcp__corp__get_issue" },
    });
  });

  it("documents distinct retry, outcome, and revision identities", () => {
    const protocol = readFileSync(join(ROOT, "skills/oc-integrations-engineer/references/pm-mcp-protocol.md"), "utf8");
    const architect = readFileSync(join(ROOT, "skills/oc-app-architect/SKILL.md"), "utf8");
    expect(protocol).toContain("<revision>:<payload-hash>");
    expect(protocol).toContain("retry identity");
    expect(architect).toContain("sprint-result-pass");
    expect(architect).toContain("sprint-result-fail");
  });
});
