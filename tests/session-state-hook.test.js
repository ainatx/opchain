// plugins/opchain/hooks/session-state.cjs had no tests. The 2026-09-11 skill-chain
// audit found it printed "[object Object]" for the { text, done_when } next_actions
// form the checkpoint protocol blesses, and picked "next" by alphabetical file
// order (v1.9.1 Sprint 2).
import { describe, it, expect, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const HOOK = join(import.meta.dirname, "..", "plugins", "opchain", "hooks", "session-state.cjs");
const scratch = [];
afterAll(() => scratch.forEach((d) => rmSync(d, { recursive: true, force: true })));

function project(checkpoints) {
  const root = mkdtempSync(join(tmpdir(), "oc-ss-"));
  scratch.push(root);
  spawnSync("git", ["init", "-q"], { cwd: root });
  mkdirSync(join(root, ".checkpoints"));
  for (const [skill, data] of Object.entries(checkpoints)) {
    writeFileSync(join(root, ".checkpoints", `${skill}.checkpoint.json`), JSON.stringify({ skill, ...data }));
  }
  const r = spawnSync("node", [HOOK], { input: JSON.stringify({ cwd: root }), encoding: "utf8" });
  return r.stdout;
}

const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString();

describe("session-state hook", () => {
  it("renders an object-form next action as its text", () => {
    const out = project({
      "oc-app-architect": {
        status: "in_progress",
        updated_at: hoursAgo(1),
        next_actions: [{ text: "Re-run the evaluator on sprint 2", done_when: "npm test" }],
      },
    });
    expect(out).toContain("next: oc-app-architect: Re-run the evaluator on sprint 2");
    expect(out).not.toContain("[object Object]");
  });

  it("leads with the most recently touched in_progress work", () => {
    const out = project({
      "oc-a-older": { status: "in_progress", updated_at: hoursAgo(48), next_actions: ["older work"] },
      "oc-z-newer": { status: "in_progress", updated_at: hoursAgo(1), next_actions: ["newer work"] },
    });
    expect(out).toContain("next: oc-z-newer: newer work");
  });

  it("does not repeat work already awaiting the user as next", () => {
    const out = project({
      "oc-a-waiting": {
        status: "in_progress",
        updated_at: hoursAgo(1),
        next_actions: ["decide"],
        blockers: [{ id: "b1", description: "choose a stack", needs: "user_decision" }],
      },
      "oc-b-working": { status: "in_progress", updated_at: hoursAgo(5), next_actions: ["keep building"] },
    });
    expect(out).toContain("AWAITING YOU: oc-a-waiting: choose a stack");
    expect(out).toContain("next: oc-b-working: keep building");
  });
});

// 2.0.1 promised every task begins with a stamp; the 2.0.3 audit found that
// resume and compact re-stamped the same task as a fresh start.
describe("session-state task stamp", () => {
  function stamp(source, { checkpoints = true } = {}) {
    const root = mkdtempSync(join(tmpdir(), "oc-ss-"));
    scratch.push(root);
    spawnSync("git", ["init", "-q"], { cwd: root });
    if (checkpoints) mkdirSync(join(root, ".checkpoints"));
    const r = spawnSync("node", [HOOK], {
      input: JSON.stringify({ cwd: root, source }), encoding: "utf8",
      env: { ...process.env, TZ: "America/Chicago" },
    });
    return r.stdout.split("\n")[0];
  }
  const at = String.raw`\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2} [A-Z]{2,5} \(America\/Chicago\)`;

  it.each(["startup", "clear", undefined])("starts the task on source=%s", (source) => {
    expect(stamp(source)).toMatch(new RegExp(`^Task started: ${at}$`));
  });

  it.each(["resume", "compact"])("resumes, not restarts, the task on source=%s", (source) => {
    expect(stamp(source)).toMatch(new RegExp(`^Task resumed: ${at}$`));
  });

  it("stamps a repo with no .checkpoints/ too", () => {
    expect(stamp("startup", { checkpoints: false })).toMatch(new RegExp(`^Task started: ${at}$`));
  });
});
