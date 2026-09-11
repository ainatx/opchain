// Liveness guard for `npm run telemetry -- status` (v1.9): enabled=true with
// no store on disk is the "enabled-but-silent" failure the monitoring-ops
// assessment documented (24 days undetected in 2026-06/07) — status must exit
// non-zero and say so, never print ENABLED ✅ over an absent sink.
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function runStatus(handle) {
  const root = mkdtempSync(join(tmpdir(), "oc-tele-"));
  mkdirSync(join(root, ".checkpoints"), { recursive: true });
  writeFileSync(
    join(root, ".checkpoints", "oc-telemetry-ops.checkpoint.json"),
    JSON.stringify({
      protocol_version: "1.1",
      skill: "oc-telemetry-ops",
      project: "t",
      project_dir: root,
      created_at: "2026-08-28T00:00:00Z",
      updated_at: "2026-08-28T00:00:00Z",
      phase: "metering",
      step: "s",
      status: "in_progress",
      progress_summary: "t",
      telemetry_handle: handle,
    }),
  );
  return spawnSync(process.execPath, ["scripts/telemetry.mjs", "status"], {
    env: { ...process.env, OPCHAIN_ROOT: root },
    encoding: "utf8",
  });
}

describe("telemetry status liveness guard", () => {
  it("exits 1 and warns when enabled=true with no store", () => {
    const r = runStatus({
      enabled: true,
      id: "anon-test",
      sink: ".checkpoints/usage.sqlite",
      since: "2026-08-28T00:00:00Z",
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/LIVENESS FAIL/);
  });

  it("exits 0 when disabled, store absent", () => {
    const r = runStatus({ enabled: false });
    expect(r.status).toBe(0);
    expect(r.stderr ?? "").not.toMatch(/LIVENESS/);
  });
});
