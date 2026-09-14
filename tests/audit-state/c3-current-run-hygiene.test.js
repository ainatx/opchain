import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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

function transcript(root, invokedAt, skill = "opchain:oc-code-auditor") {
  const path = join(root, "transcript.jsonl");
  writeFileSync(path, `${JSON.stringify({
    timestamp: invokedAt,
    message: { content: [{ type: "tool_use", name: "plugin/Skill", input: { skill } }] },
  })}\n`);
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
});
