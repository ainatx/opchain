import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const HOOK = join(import.meta.dirname, "..", "plugins", "opchain", "hooks", "task-end.cjs");
const STAMP = /^Task ended: \d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2} [A-Z]{2,5} \([A-Za-z_]+\/[A-Za-z_]+\)$/;

function runHook(root, input) {
  return spawnSync("node", [HOOK], {
    cwd: root, input, encoding: "utf8",
    env: { ...process.env, TZ: "America/Chicago" },
  });
}

describe("task-end hook", () => {
  it("emits an ending date, time, and time zone", () => {
    const root = mkdtempSync(join(tmpdir(), "oc-end-"));
    spawnSync("git", ["init", "-q"], { cwd: root });
    mkdirSync(join(root, ".checkpoints"));
    const result = runHook(root, JSON.stringify({ cwd: root }));
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).systemMessage).toMatch(STAMP);
  });

  // The start stamp prints everywhere, so the end stamp must too: the 2.0.3
  // audit found a start with no end in every repo before its first checkpoint.
  it.each([
    ["a Git repo with no .checkpoints/", true, (root) => JSON.stringify({ cwd: root })],
    ["a directory outside Git", false, (root) => JSON.stringify({ cwd: root })],
    ["unreadable hook input", true, () => "not-json"],
  ])("still ends the task in %s", (_label, gitInit, input) => {
    const root = mkdtempSync(join(tmpdir(), "oc-end-"));
    if (gitInit) spawnSync("git", ["init", "-q"], { cwd: root });
    const result = runHook(root, input(root));
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).systemMessage).toMatch(STAMP);
  });
});
