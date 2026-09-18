import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { formatProgress, validate } from "../scripts/checkpoint.mjs";

const cli = join(import.meta.dirname, "..", "scripts", "checkpoint.mjs");
const roots = [];
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));

function checkpoint(extra = {}) {
  return {
    protocol_version: "1.1", skill: "oc-test", project: "test", project_dir: "/tmp/test",
    created_at: "2026-09-15T00:00:00Z", updated_at: "2026-09-15T00:00:00Z",
    phase: "build", step: "sprint-1", status: "in_progress", progress_summary: "Release underway.",
    next_actions: ["Publish release notes"], ...extra,
  };
}

function fixture(data) {
  const root = mkdtempSync(join(tmpdir(), "opchain-progress-"));
  roots.push(root);
  const dir = join(root, ".checkpoints");
  mkdirSync(dir);
  const file = join(dir, "oc-test.checkpoint.json");
  writeFileSync(file, JSON.stringify(data, null, 2));
  const snapshot = () => ({ files: readdirSync(root, { recursive: true }), bytes: readFileSync(file), mtime: statSync(file).mtimeMs });
  const run = (...args) => spawnSync(process.execPath, [cli, ...args], {
    cwd: root, encoding: "utf8",
    env: { ...process.env, OPCHAIN_ROOT: root, OPCHAIN_CHECKPOINTS_DIR: dir },
  });
  return { root, run, snapshot };
}

describe("checkpoint progress presentation", () => {
  it("keeps legacy checkpoints valid and omits absent planning data", () => {
    for (const protocol_version of ["1.0", "1.1"]) {
      const data = checkpoint({ protocol_version });
      expect(validate("oc-test.checkpoint.json", data).errors).toEqual([]);
      expect(formatProgress(data)).toBe("");
      data.skill_state = { goal: "Ship the patch after required checks pass." };
      data.progress_table = [{ id: "checks", label: "Required checks", status: "in_progress", estimate: "10–20 min if CI is available" }];
      expect(validate("oc-test.checkpoint.json", data).errors).toEqual([]);
      expect(formatProgress(data)).toContain("**Goal:** Ship the patch after required checks pass.");
      expect(formatProgress(data)).toContain("(estimate: 10–20 min if CI is available)");
    }
  });

  it("renders a minimal saved plan with goal, current work, and evidence", () => {
    const data = checkpoint({
      skill_state: { goal: "Add CSV output without changing the existing report." },
      progress_table: [
        { id: "implementation", label: "Implement CSV output", status: "complete", notes: "npm test passed" },
        { id: "acceptance", label: "Verify CSV escaping", status: "in_progress", estimate: "2–5 min", notes: "byte-level CLI check" },
      ],
      next_actions: ["Run the CSV acceptance check"],
    });
    expect(validate("oc-test.checkpoint.json", data).errors).toEqual([]);
    const output = formatProgress(data);
    expect(output).toContain("**Goal:** Add CSV output without changing the existing report.");
    expect(output).toContain("- [x] implementation: Implement CSV output");
    expect(output).toContain("- [ ] acceptance: Verify CSV escaping");
    expect(output).toContain("npm test passed");
  });

  it("renders recorded actuals beside estimates and omits missing times", () => {
    const data = checkpoint({
      skill_state: { goal: "Ship the patch after required checks pass." },
      progress_table: [
        {
          id: "implementation", label: "Implement the policy", status: "complete",
          estimate: "8–12 min", started_at: "2026-09-17T19:00:00Z",
          completed_at: "2026-09-17T19:18:00Z", actual: "18 min wall-clock",
        },
        { id: "checks", label: "Required checks", status: "in_progress", estimate: "12–20 min, revised after implementation ran long", started_at: "2026-09-17T19:18:00Z" },
        { id: "publish", label: "Publish patch", status: "not_started", estimate: "unknown" },
      ],
    });
    expect(validate("oc-test.checkpoint.json", data).errors).toEqual([]);
    const output = formatProgress(data);
    expect(output).toContain("estimate: 8–12 min; actual: 18 min wall-clock; started: 2026-09-17T19:00:00Z; completed: 2026-09-17T19:18:00Z");
    expect(output).toContain("estimate: 12–20 min, revised after implementation ran long; started: 2026-09-17T19:18:00Z");
    expect(output).toContain("estimate: unknown");
    expect(output).not.toMatch(/publish:.*actual:/);
  });

  it("checks only completed tasks and names every other state separately", () => {
    const statuses = ["complete", "in_progress", "not_started", "blocked", "failed", "skipped", "deferred"];
    const data = checkpoint({ progress_table: statuses.map(status => ({ id: status, label: `${status} task`, status })) });
    const before = JSON.stringify(data);
    const output = formatProgress(data);
    expect(output).toContain("**Progress:** 1/7 tasks complete");
    expect(output.match(/^- \[x\]/gm)).toHaveLength(1);
    expect(output).toContain("- [x] complete: complete task");
    for (const status of statuses.slice(1)) expect(output).toContain(`- [ ] ${status}: ${status} task`);
    for (const heading of ["Completed", "Current", "Upcoming", "Blocked", "Failed", "Skipped", "Deferred"]) {
      expect(output).toContain(`**${heading} (1):**`);
    }
    expect(output).not.toContain("estimate:");
    expect(JSON.stringify(data)).toBe(before);
  });

  it("ignores malformed optional goal, estimate and notes without losing usable rows", () => {
    for (const goal of [undefined, null, 4, {}, [], "  "]) {
      const output = formatProgress(checkpoint({
        skill_state: { goal }, progress_table: [null, {}, [], "bad", { id: "unknown", label: "Unknown", status: "unknown" },
          { id: "check", label: "Verify patch", status: "in_progress", estimate: { minutes: 5 }, actual: { minutes: 8 }, started_at: 12, completed_at: [], notes: ["wrong shape"] }],
      }));
      expect(output).not.toContain("**Goal:");
      expect(output).not.toContain("estimate:");
      expect(output).not.toContain("actual:");
      expect(output).not.toContain("started:");
      expect(output).not.toContain("[object Object]");
      expect(output).toContain("- [ ] check: Verify patch");
      expect(output).toContain("5 malformed progress row(s) omitted");
    }
    expect(formatProgress(checkpoint({ skill_state: null, progress_table: {} }))).toBe("");
  });

  it("bounds large tables and long text without hiding whole task states", () => {
    const statuses = ["complete", "in_progress", "not_started", "blocked", "failed", "skipped", "deferred"];
    const output = formatProgress(checkpoint({
      skill_state: { goal: "Goal ".repeat(1000) },
      progress_table: statuses.flatMap(status => Array.from({ length: 100 }, (_, i) => ({
        id: `${status}-${i}`, label: "Task ".repeat(1000), status,
        estimate: "Time ".repeat(1000), notes: "Notes ".repeat(1000),
      }))),
    }));
    expect(output).toContain("**Progress:** 100/700 tasks complete");
    expect(output.match(/^- \[[x ]\]/gm)).toHaveLength(21);
    expect(output.match(/97 more/g)).toHaveLength(7);
    expect(output).toContain("chars omitted");
    expect(output.length).toBeLessThan(15000);
  });
});

describe("checkpoint status planning CLI", () => {
  it("ignores unrelated null, array and primitive checkpoints when choosing a named brief action", () => {
    const { root, run, snapshot } = fixture(checkpoint({ next_actions: ["Merge #123", "Run required checks"] }));
    const dir = join(root, ".checkpoints");
    writeFileSync(join(dir, "oc-evidence.checkpoint.json"), JSON.stringify(checkpoint({
      skill: "oc-evidence", status: "complete", next_actions: [],
      progress_table: [{ id: "pr-123", label: "PR #123", status: "complete" }],
    })));
    const baseline = run("status", "oc-test", "--brief");
    expect(baseline.status, baseline.stderr).toBe(0);
    expect(baseline.stdout).toContain("Next: Run required checks");
    const malformed = [null, [], "PR #124", 42, true].map((data, i) => {
      const file = join(dir, `oc-malformed-${i}.checkpoint.json`);
      const contents = JSON.stringify(data);
      writeFileSync(file, contents);
      return { file, contents };
    });
    const before = snapshot();
    const result = run("status", "oc-test", "--brief");
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe(baseline.stdout);
    expect(snapshot()).toEqual(before);
    for (const { file, contents } of malformed) expect(readFileSync(file, "utf8")).toBe(contents);
  });

  it("shows bounded plans in named and full views, respects --since, and never rewrites state", () => {
    const { run, snapshot } = fixture(checkpoint({
      skill_state: { goal: "Ship a verified patch." },
      progress_table: [
        ...Array.from({ length: 8 }, (_, i) => ({ id: `done-${i}`, label: `Finished task ${i}`, status: "complete" })),
        { id: "check", label: "Run checks", status: "in_progress", estimate: "5–15 min assuming no failures" },
        { id: "publish", label: "Publish patch", status: "not_started" },
      ],
    }));
    const before = snapshot();
    const named = run("status", "oc-test");
    const all = run("status");
    for (const result of [named, all]) {
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain("**Goal:** Ship a verified patch.");
      expect(result.stdout).toContain("**Progress:** 8/10 tasks complete");
      expect(result.stdout).toContain("- [ ] check: Run checks (estimate: 5–15 min assuming no failures)");
      expect(result.stdout).toContain("- [ ] publish: Publish patch");
      expect(result.stdout).toContain("1. Publish release notes");
    }
    expect(named.stdout).toContain("5 more completed task(s) omitted");
    expect(all.stdout).toContain("7 more completed task(s) omitted");
    const filtered = run("status", "--since=2026-09-16T00:00:00Z");
    expect(filtered.status, filtered.stderr).toBe(0);
    expect(filtered.stdout).not.toContain("**Goal:");
    expect(filtered.stdout).not.toContain("**Progress:");
    expect(snapshot()).toEqual(before);
  });

  it("keeps both brief views compact and preserves stale-action filtering even with malformed rows", () => {
    const { run, snapshot } = fixture(checkpoint({
      skill_state: { goal: "Ship the patch." },
      progress_table: [null, { id: "pr-123", label: "PR #123", status: "complete" },
        { id: "pr-124", label: "PR #124", status: "skipped" },
        ...Array.from({ length: 100 }, (_, i) => ({ id: `task-${i}`, label: `Future task ${i}`, status: "not_started" }))],
      next_actions: ["Merge #123", "Review #124", "Publish release notes"],
    }));
    const before = snapshot();
    for (const args of [["status", "--brief"], ["status", "oc-test", "--brief"], ["next"]]) {
      const result = run(...args);
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain(args[0] === "next" ? "Action: Review #124" : "Next: Review #124");
      expect(result.stdout).not.toContain("Future task");
      expect(result.stdout).not.toContain("**Progress:");
      expect(result.stdout.trim().split("\n").length).toBeLessThan(10);
    }
    expect(snapshot()).toEqual(before);
  });
});
