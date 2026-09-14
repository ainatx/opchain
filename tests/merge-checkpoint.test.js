// scripts/merge-checkpoint.mjs had no tests. The 2026-09-11 skill-chain audit
// found it applied telemetry newer-wins before the base==ours shortcut, so a
// one-sided telemetry update from the side with the older updated_at was
// silently discarded (v1.9.1 Sprint 2).
import { describe, it, expect, afterAll } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const DRIVER = join(import.meta.dirname, "..", "scripts", "merge-checkpoint.mjs");
const scratch = [];
afterAll(() => scratch.forEach((d) => rmSync(d, { recursive: true, force: true })));

function merge(base, ours, theirs) {
  const dir = mkdtempSync(join(tmpdir(), "oc-merge-"));
  scratch.push(dir);
  const [b, o, t] = ["base", "ours", "theirs"].map((n) => join(dir, `${n}.json`));
  writeFileSync(b, JSON.stringify(base));
  writeFileSync(o, JSON.stringify(ours));
  writeFileSync(t, JSON.stringify(theirs));
  const r = spawnSync("node", [DRIVER, b, o, t, "x.checkpoint.json"], { encoding: "utf8" });
  let result;
  try { result = JSON.parse(readFileSync(o, "utf8")); } catch { result = undefined; }
  return { code: r.status, result };
}

const base = {
  updated_at: "2026-09-10T00:00:00Z",
  progress_summary: "base.",
  skill_state: { last_run: { at: "2026-09-10T00:00:00Z", verdict: "PASS" } },
};

describe("merge-checkpoint driver", () => {
  it("keeps a one-sided telemetry update even from the older side", () => {
    // Theirs edits a different skill_state key, so the merge must descend into
    // skill_state and meet last_run itself — where newer-wins used to run first.
    const ours = { ...base, updated_at: "2026-09-11T00:00:00Z", skill_state: { last_run: { at: "2026-09-11T00:00:00Z", verdict: "FAIL" } } };
    const theirs = { ...base, updated_at: "2026-09-12T00:00:00Z", skill_state: { ...base.skill_state, config_hash: "abc" } };
    const { code, result } = merge(base, ours, theirs);
    expect(code).toBe(0);
    expect(result.skill_state.last_run).toEqual({ at: "2026-09-11T00:00:00Z", verdict: "FAIL" });
    expect(result.skill_state.config_hash).toBe("abc");
    expect(result.updated_at).toBe("2026-09-12T00:00:00Z");
  });

  it("takes the newer side when both sides changed telemetry", () => {
    const ours = { ...base, updated_at: "2026-09-11T00:00:00Z", skill_state: { last_run: { at: "2026-09-11T00:00:00Z", verdict: "FAIL" } } };
    const theirs = { ...base, updated_at: "2026-09-12T00:00:00Z", skill_state: { last_run: { at: "2026-09-12T00:00:00Z", verdict: "PASS" } } };
    const { code, result } = merge(base, ours, theirs);
    expect(code).toBe(0);
    expect(result.skill_state.last_run.at).toBe("2026-09-12T00:00:00Z");
  });

  it("still stops on a real content conflict", () => {
    const ours = { ...base, progress_summary: "ours." };
    const theirs = { ...base, progress_summary: "theirs." };
    expect(merge(base, ours, theirs).code).toBe(1);
  });
});
