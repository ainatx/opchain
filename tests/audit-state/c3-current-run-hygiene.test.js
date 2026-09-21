import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const HOOK = join(ROOT, ".claude", "hooks", "checkpoint-hygiene.sh");
const CLI = join(ROOT, "scripts", "checkpoint.mjs");

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "opchain-c3-hygiene-"));
  mkdirSync(join(root, "skills", "oc-code-auditor"), { recursive: true });
  mkdirSync(join(root, "skills", "oc-orchestrator"), { recursive: true });
  mkdirSync(join(root, ".checkpoints"));
  writeFileSync(join(root, "skills", "oc-code-auditor", "SKILL.md"), "---\nname: oc-code-auditor\n---\n");
  writeFileSync(join(root, "skills", "oc-orchestrator", "SKILL.md"), "---\nname: oc-orchestrator\n---\n");
  return root;
}

function checkpoint(root, updatedAt) {
  writeFileSync(join(root, ".checkpoints", "oc-code-auditor.checkpoint.json"), JSON.stringify({
    protocol_version: "1.1",
    skill: "oc-code-auditor",
    project: "demo",
    project_dir: root,
    created_at: "2026-09-13T10:00:00Z",
    updated_at: updatedAt,
    record_updated_at: updatedAt,
    phase: "audit",
    step: "complete",
    status: "complete",
    progress_summary: "Audit complete.",
  }));
}

function transcript(root, invokedAt, ...skills) {
  const path = join(root, "transcript.jsonl");
  writeFileSync(path, (skills.length ? skills : ["opchain:oc-code-auditor"]).map((skill) => `${JSON.stringify({
    timestamp: invokedAt,
    message: { content: [{ type: "tool_use", name: "plugin/Skill", input: { skill } }] },
  })}\n`).join(""));
  return path;
}

function run(root, transcriptPath, extra = {}) {
  return spawnSync("bash", [HOOK], {
    input: JSON.stringify({ cwd: root, transcript_path: transcriptPath, ...extra }),
    encoding: "utf8",
  });
}

describe("C3 current-run checkpoint hygiene", () => {
  it("normalizes namespaced catalog invocations and rejects an older checkpoint", () => {
    const root = fixture();
    try {
      checkpoint(root, "2026-09-13T10:00:00Z");
      const result = run(root, transcript(root, "2026-09-13T10:01:00Z"));
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('"decision": "block"');
      expect(result.stdout).toContain("oc-code-auditor");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("accepts a current-run receipt and does not loop on a repeated Stop", () => {
    const root = fixture();
    try {
      const transcriptPath = transcript(root, "2026-09-13T10:01:00Z");
      checkpoint(root, "2026-09-13T10:00:00Z");
      const write = spawnSync(process.execPath, [CLI, "update", "oc-code-auditor", "--progress_summary=Current run complete."], {
        env: { ...process.env, OPCHAIN_ROOT: root, OPCHAIN_CHECKPOINTS_DIR: join(root, ".checkpoints") },
        encoding: "utf8",
      });
      expect(write.status, `${write.stdout}${write.stderr}`).toBe(0);
      expect(run(root, transcriptPath).stdout).toBe("");
      checkpoint(root, "2026-09-13T10:00:00Z");
      expect(run(root, transcriptPath, { stop_hook_active: true }).stdout).toBe("");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("derives the enforced inventory instead of accepting an unknown old subset", () => {
    const root = fixture();
    try {
      mkdirSync(join(root, "skills", "oc-new-skill"));
      writeFileSync(join(root, "skills", "oc-new-skill", "SKILL.md"), "---\nname: oc-new-skill\n---\n");
      const result = run(root, transcript(root, "2026-09-13T10:01:00Z", "vendor:oc-new-skill"));
      expect(result.stdout).toContain("oc-new-skill");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not demand a checkpoint from oc-update, whose contract forbids writing one", () => {
    const contract = readFileSync(join(ROOT, "skills", "oc-update", "SKILL.md"), "utf8").replace(/\s+/g, " ");
    expect(contract).toContain("do not write or reconcile any `.checkpoints/` files as a side effect of updating, including this skill's own checkpoint");
    const root = fixture();
    try {
      mkdirSync(join(root, "skills", "oc-update"));
      writeFileSync(join(root, "skills", "oc-update", "SKILL.md"), "---\nname: oc-update\n---\n");
      for (const skill of ["oc-update", "opchain:oc-update"]) {
        const result = run(root, transcript(root, "2026-09-14T10:01:00Z", skill));
        expect(result.status).toBe(0);
        expect(result.stdout).toBe("");
      }
      const mixed = run(root, transcript(root, "2026-09-14T10:01:00Z", "opchain:oc-update", "opchain:oc-code-auditor"));
      expect(mixed.stdout).toContain('"decision": "block"');
      expect(mixed.stdout).toContain("oc-code-auditor");
      expect(mixed.stdout).not.toContain("oc-update");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it.each([null, "2026-09-14T10:00:00Z", "2026-09-14T10:02:00Z"])(
    "exempts telemetry with private checkpoint timestamp %s without weakening other skills",
    (privateTimestamp) => {
      const root = fixture();
      try {
        const privatePath = join(root, ".checkpoints/.local/telemetry/.checkpoints/oc-telemetry-ops.checkpoint.json");
        const privateContent = JSON.stringify({ record_updated_at: privateTimestamp });
        if (privateTimestamp) {
          mkdirSync(join(root, ".checkpoints/.local/telemetry/.checkpoints"), { recursive: true });
          writeFileSync(privatePath, privateContent);
        }
        // Use the real inventory so an absent fixture skill cannot fake an exemption.
        const env = { ...process.env, OPCHAIN_SKILLS_DIR: join(ROOT, "skills") };
        for (const skill of ["oc-telemetry-ops", "opchain:oc-telemetry-ops"]) {
          const result = spawnSync("bash", [HOOK], {
            env,
            input: JSON.stringify({ cwd: root, transcript_path: transcript(root, "2026-09-14T10:01:00Z", skill) }),
            encoding: "utf8",
          });
          expect(result.status, result.stderr).toBe(0);
          expect(result.stdout).toBe("");
        }
        // A stale tracked receipt for a different skill must still block.
        checkpoint(root, "2026-09-14T10:00:00Z");
        const mixed = spawnSync("bash", [HOOK], {
          env,
          input: JSON.stringify({ cwd: root, transcript_path: transcript(root, "2026-09-14T10:01:00Z",
            "opchain:oc-update", "opchain:oc-telemetry-ops", "opchain:oc-code-auditor") }),
          encoding: "utf8",
        });
        expect(mixed.status, mixed.stderr).toBe(0);
        const block = JSON.parse(mixed.stdout);
        expect(block.decision).toBe("block");
        expect(block.reason).toContain("oc-code-auditor");
        expect(block.reason).not.toMatch(/oc-update|oc-telemetry-ops/);
        expect(existsSync(join(root, ".checkpoints/oc-telemetry-ops.checkpoint.json"))).toBe(false);
        if (privateTimestamp) expect(readFileSync(privatePath, "utf8")).toBe(privateContent);
        else expect(existsSync(privatePath)).toBe(false);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
    // Three hook spawns against the real skill inventory take ~0.8s idle but
    // 5.5-6s on a loaded machine; at vitest's 5s default this flaked the
    // commit gate's tests check.
    30_000,
  );

  it("allows real telemetry status and opted-out recording without creating a checkpoint", () => {
    const root = fixture();
    try {
      mkdirSync(join(root, "skills", "oc-telemetry-ops"));
      writeFileSync(join(root, "skills", "oc-telemetry-ops", "SKILL.md"), "---\nname: oc-telemetry-ops\n---\n");
      const transcriptPath = transcript(root, new Date().toISOString(), "opchain:oc-telemetry-ops");
      for (const command of ["status", "disable", "record"]) {
        const result = spawnSync(process.execPath, [join(ROOT, "scripts/telemetry.mjs"), command], {
          env: { ...process.env, OPCHAIN_ROOT: root, OPCHAIN_CHECKPOINTS_DIR: join(root, ".checkpoints") },
          encoding: "utf8",
        });
        expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
      }
      const stop = run(root, transcriptPath);
      expect(stop.status, stop.stderr).toBe(0);
      expect(stop.stdout).toBe("");
      expect(existsSync(join(root, ".checkpoints/usage.sqlite"))).toBe(false);
      expect(existsSync(join(root, ".checkpoints/.local"))).toBe(false);
      expect(existsSync(join(root, ".checkpoints/oc-telemetry-ops.checkpoint.json"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
