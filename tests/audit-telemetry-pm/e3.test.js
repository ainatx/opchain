import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { reconcilePmComment } from "../../scripts/lib/pm-mcp-checks.mjs";

const ROOT = join(import.meta.dirname, "..", "..");

function telemetry(root, ...args) {
  return spawnSync(process.execPath, [join(ROOT, "scripts", "telemetry.mjs"), ...args], {
    cwd: ROOT, env: { ...process.env, OPCHAIN_ROOT: root }, encoding: "utf8",
  });
}

function freshGitProject() {
  const root = mkdtempSync(join(tmpdir(), "oc-e3-"));
  expect(spawnSync("git", ["init", "--quiet", root]).status).toBe(0);
  return root;
}

describe("audit remediation E3: fresh-consumer privacy and export journey", () => {
  it("requires local consent, initializes a private C-backed metadata root, and preserves disable/re-enable", () => {
    const root = freshGitProject();
    expect(telemetry(root, "record", "--skill=oc-app-architect", "--command=/oc-build").status).toBe(0);
    expect(existsSync(join(root, ".checkpoints", "usage.sqlite"))).toBe(false);

    expect(telemetry(root, "enable").status).toBe(0);
    expect(telemetry(root, "record", "--skill=oc-app-architect", "--phase=build", "--command=/oc-build", "--tier=sonnet", "--cost=2", "--at=2026-09-01T12:00:00Z").status).toBe(0);
    expect(telemetry(root, "disable").status).toBe(0);
    expect(telemetry(root, "record", "--skill=oc-app-architect", "--command=/oc-build", "--cost=not-a-number").status).toBe(0);
    expect(telemetry(root, "enable").status).toBe(0);
    expect(telemetry(root, "record", "--skill=oc-app-architect", "--command=/oc-build", "--cost=not-a-number").status).toBe(1);

    for (let run = 2; run <= 5; run += 1) {
      expect(telemetry(root, "record", "--skill=oc-app-architect", "--phase=build", "--command=/oc-build", "--tier=sonnet", "--cost=2", `--at=2026-09-0${run}T12:00:00Z`).status).toBe(0);
    }
    for (let run = 1; run <= 4; run += 1) {
      expect(telemetry(root, "record", "--skill=oc-bug-check", "--phase=build", "--command=/oc-bugcheck", "--tier=haiku", `--at=2026-09-0${run}T12:00:00Z`).status).toBe(0);
    }
    // Run 1 predates disable/re-enable and belongs to the retired local handle.
    // Events must attach only to the current consent epoch's runs.
    for (let run = 2; run <= 6; run += 1) {
      expect(telemetry(root, "event", `--run=${run}`, "--kind=eval", "--score=0.8", "--at=2026-09-01T12:00:00Z").status).toBe(0);
    }
    expect(telemetry(root, "event", "--run=1", "--kind=eval", "--score=1.1").status).toBe(1);

    const preview = telemetry(root, "aggregate");
    expect(preview.status).toBe(0);
    const aggregate = JSON.parse(preview.stdout);
    expect(aggregate.denominator.status).toBe("unavailable");
    expect(aggregate.totals.avg_cost_per_feature_usd).toBeNull();
    expect(aggregate.by_skill).toEqual(expect.arrayContaining([{ skill: "oc-app-architect", runs: 5 }, { skill: "other", runs: 4 }]));
    expect(aggregate.suppressed.by_skill_runs).toBe(4);
    expect(telemetry(root, "export", "--out=aggregate.json", "--shipped-features=2").status).toBe(0);
    const exported = readFileSync(join(root, "aggregate.json"), "utf8");
    expect(exported).not.toMatch(/anon-|started_at|label/);
    expect(JSON.parse(exported).totals.avg_cost_per_feature_usd).toBe(5);
    expect(existsSync(join(root, ".checkpoints", "oc-telemetry-ops.checkpoint.json"))).toBe(false);
    expect(spawnSync("git", ["check-ignore", "-q", ".checkpoints/.local/telemetry/.checkpoints/oc-telemetry-ops.checkpoint.json"], { cwd: root }).status).toBe(0);
  }, 45_000);

  it("fails closed for aggregate metadata in a non-Git project", () => {
    const root = mkdtempSync(join(tmpdir(), "oc-e3-nongit-"));
    expect(telemetry(root, "enable").status).toBe(0);
    expect(telemetry(root, "record", "--skill=oc-app-architect", "--command=/oc-build").status).toBe(0);
    const aggregate = telemetry(root, "aggregate");
    expect(aggregate.status).toBe(1);
    expect(aggregate.stderr).toContain("not ignored");
  });
});

describe("audit remediation E3: mocked PM update journey", () => {
  it("reconciles uncertain retry and writes distinct revised outcome comments", async () => {
    const comments = [];
    const provider = {
      async listComments() { return comments; },
      async addComment(comment) { comments.push({ body: comment.body }); throw new Error("uncertain delivery"); },
    };
    const failed = { skill: "oc-app-architect", event: "sprint-result-fail", correlationId: "sprint-3", revision: "r1", payload: { outcome: "fail" } };
    await expect(reconcilePmComment({ ticket: "TEST-3", markerInput: failed, body: "failed", provider })).rejects.toThrow("uncertain delivery");
    await expect(reconcilePmComment({ ticket: "TEST-3", markerInput: failed, body: "failed", provider })).resolves.toMatchObject({ status: "reconciled" });
    provider.addComment = async (comment) => { comments.push({ body: comment.body }); return { id: "next" }; };
    await expect(reconcilePmComment({ ticket: "TEST-3", markerInput: { ...failed, event: "sprint-result-pass", payload: { outcome: "pass" } }, body: "passed", provider })).resolves.toMatchObject({ status: "written" });
    await expect(reconcilePmComment({ ticket: "TEST-3", markerInput: { ...failed, event: "sprint-contract", revision: "r2", payload: { scope: "revised" } }, body: "revised", provider })).resolves.toMatchObject({ status: "written" });
    expect(comments).toHaveLength(3);
  });
});
