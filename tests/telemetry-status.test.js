// Consent is machine-local: a tracked checkpoint copied from another machine
// cannot make status claim that this machine has enabled recording.
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

describe("telemetry status local-consent boundary", () => {
  it("reports OFF when a legacy checkpoint says enabled but no local store exists", () => {
    const r = runStatus({
      enabled: true,
      id: "anon-test",
      sink: ".checkpoints/usage.sqlite",
      since: "2026-08-28T00:00:00Z",
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("OFF");
    expect(r.stdout).not.toContain("ENABLED");
    expect(r.stderr).not.toMatch(/LIVENESS FAIL/);
  });

  it("exits 0 when disabled, store absent", () => {
    const r = runStatus({ enabled: false });
    expect(r.status).toBe(0);
    expect(r.stderr ?? "").not.toMatch(/LIVENESS/);
  });
});
