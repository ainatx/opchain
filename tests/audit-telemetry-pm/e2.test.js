import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildPmMarker, reconcilePmComment } from "../../scripts/lib/pm-mcp-checks.mjs";

const ROOT = join(import.meta.dirname, "..", "..");

function telemetry(root, ...args) {
  return spawnSync(process.execPath, [join(ROOT, "scripts", "telemetry.mjs"), ...args], {
    cwd: ROOT, env: { ...process.env, OPCHAIN_ROOT: root }, encoding: "utf8",
  });
}

function setupMeteredRuns({ count = 5 } = {}) {
  const root = mkdtempSync(join(tmpdir(), "oc-e2-"));
  expect(spawnSync("git", ["init", "--quiet", root]).status).toBe(0);
  expect(telemetry(root, "enable").status).toBe(0);
  for (let index = 0; index < count; index += 1) {
    expect(telemetry(
      root, "record", "--skill=oc-app-architect", "--phase=build", "--command=/oc-build",
      "--tier=sonnet", "--cost=2", `--at=2026-09-${String(index + 1).padStart(2, "0")}T12:00:00Z`,
    ).status).toBe(0);
  }
  return root;
}

describe("audit remediation E2: local aggregate, export, and checkpoint store", () => {
  it("builds a versioned, privacy-suppressed preview with explicit denominator handling", () => {
    const root = setupMeteredRuns();
    const result = telemetry(root, "aggregate", "--shipped-features=2");
    expect(result.status).toBe(0);
    const aggregate = JSON.parse(result.stdout);
    expect(aggregate.schema).toBe("opchain-usage-aggregate/1.0");
    expect(aggregate.totals.avg_cost_per_feature_usd).toBe(5);
    expect(aggregate.by_skill).toEqual([{ skill: "oc-app-architect", runs: 5 }]);
    expect(aggregate.model_tier_distribution).toEqual([{ tier: "sonnet", share: 1 }]);
    expect(aggregate.privacy.raw_rows_exported).toBe(false);
    expect(aggregate.privacy.handles_exported).toBe(false);
    const checkpoint = join(root, ".checkpoints", ".local", "telemetry", ".checkpoints", "oc-telemetry-ops.checkpoint.json");
    expect(existsSync(checkpoint)).toBe(true);
    expect(spawnSync("git", ["check-ignore", "-q", ".checkpoints/.local/telemetry/.checkpoints/oc-telemetry-ops.checkpoint.json"], { cwd: root }).status).toBe(0);
    expect(existsSync(join(root, ".checkpoints", "oc-telemetry-ops.checkpoint.json"))).toBe(false);
    expect(JSON.parse(readFileSync(checkpoint, "utf8")).skill_state.telemetry.schema).toBe(aggregate.schema);
  });

  it("marks an absent denominator unavailable rather than dividing by zero", () => {
    const root = setupMeteredRuns();
    const aggregate = JSON.parse(telemetry(root, "aggregate").stdout);
    expect(aggregate.denominator).toEqual({ name: "shipped_features", value: null, status: "unavailable" });
    expect(aggregate.totals.avg_cost_per_feature_usd).toBeNull();
  });

  it("restricts event values and exports only to a new explicit local file", () => {
    const root = setupMeteredRuns();
    for (let run = 1; run <= 5; run += 1) {
      expect(telemetry(root, "event", `--run=${run}`, "--kind=eval", "--score=0.8", "--label=complete", "--at=2026-09-01T12:00:00Z").status).toBe(0);
    }
    expect(telemetry(root, "event", "--run=1", "--kind=eval", "--label=user@example.test").status).toBe(1);
    const output = "telemetry-export.json";
    expect(telemetry(root, "export", `--out=${output}`, "--shipped-features=1").status).toBe(0);
    const exported = readFileSync(join(root, output), "utf8");
    expect(exported).not.toContain("anon-");
    expect(exported).not.toContain("started_at");
    expect(JSON.parse(exported).eval_score_trend).toEqual([{ week: "2026-W35", avg: 0.8, runs: 5 }]);
    expect(telemetry(root, "export", `--out=${output}`).status).toBe(1);
  });
}, 30_000);

describe("audit remediation E2: PM retry and revision identities", () => {
  it("reconciles uncertain retries while differentiating fail-to-pass and revisions", async () => {
    const base = { skill: "oc-app-architect", correlationId: "sprint-2", revision: "r1" };
    const failed = buildPmMarker({ ...base, event: "sprint-result-fail", payload: { outcome: "fail", score: 0.2 } });
    const passed = buildPmMarker({ ...base, event: "sprint-result-pass", payload: { outcome: "pass", score: 0.9 } });
    const revised = buildPmMarker({ ...base, event: "sprint-contract", revision: "r2", payload: { scope: "revised" } });
    const comments = [];
    const provider = {
      async listComments() { return comments; },
      async addComment(comment) {
        comments.push({ body: comment.body }); // provider accepted it, then the client lost its response
        throw new Error("uncertain delivery");
      },
    };
    await expect(reconcilePmComment({ ticket: "TEST-2", markerInput: { ...base, event: "sprint-result-fail", payload: { outcome: "fail", score: 0.2 } }, body: "failed", provider })).rejects.toThrow("uncertain delivery");
    await expect(reconcilePmComment({ ticket: "TEST-2", markerInput: { ...base, event: "sprint-result-fail", payload: { outcome: "fail", score: 0.2 } }, body: "failed", provider })).resolves.toMatchObject({ status: "reconciled", marker: failed });
    provider.addComment = async (comment) => {
      comments.push({ body: comment.body });
      return { id: `comment-${comments.length}` };
    };
    await expect(reconcilePmComment({ ticket: "TEST-2", markerInput: { ...base, event: "sprint-result-pass", payload: { outcome: "pass", score: 0.9 } }, body: "passed", provider })).resolves.toMatchObject({ status: "written", marker: passed });
    await expect(reconcilePmComment({ ticket: "TEST-2", markerInput: { ...base, event: "sprint-contract", revision: "r2", payload: { scope: "revised" } }, body: "revised", provider })).resolves.toMatchObject({ status: "written", marker: revised });
    expect(passed).not.toBe(failed);
    expect(revised).not.toBe(failed);
    expect(comments).toHaveLength(3);
  });
});
