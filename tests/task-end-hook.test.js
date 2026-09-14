import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const HOOK = join(import.meta.dirname, "..", "plugins", "opchain", "hooks", "task-end.cjs");

describe("task-end hook", () => {
  it("emits an ending date, time, and time zone", () => {
    const root = mkdtempSync(join(tmpdir(), "oc-end-"));
    spawnSync("git", ["init", "-q"], { cwd: root });
    mkdirSync(join(root, ".checkpoints"));
    const result = spawnSync("node", [HOOK], {
      cwd: root, input: JSON.stringify({ cwd: root }), encoding: "utf8",
      env: { ...process.env, TZ: "America/Chicago" },
    });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).systemMessage).toMatch(
      /^Task ended: \d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2} [A-Z]{2,5} \([A-Za-z_]+\/[A-Za-z_]+\)$/,
    );
  });
});
