import { describe, expect, it } from "vitest";
import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  CHECKPOINT_WIRE_VERSION,
  HANDOFF_CONTRACT_VERSION,
  HANDOFF_TYPES,
  checkpointRecordUpdatedAt,
  getCheckpointHandoff,
  validateCheckpointEnvelope,
} from "../../src/lib/mcp/checkpoint-contract.js";
import {
  CHECKPOINT_STORE_API_VERSION,
  CheckpointStoreContractError,
  readCheckpointRecord,
  validateCheckpointStoreProvider,
  writeCheckpointRecord,
} from "../../src/lib/mcp/checkpoint-store.js";

const now = "2026-09-13T18:00:00Z";
const verified = "2026-09-13T17:55:00Z";
const ROOT = join(import.meta.dirname, "..", "..");

function checkpoint(extra = {}) {
  return {
    protocol_version: CHECKPOINT_WIRE_VERSION,
    skill: "oc-code-auditor",
    project: "demo",
    project_dir: "/tmp/demo",
    created_at: verified,
    updated_at: now,
    phase: "audit",
    step: "handoff",
    status: "complete",
    progress_summary: "Audit complete.",
    ...extra,
  };
}

function verdict(extra = {}) {
  return {
    id: "audit-abc123-policy-v1",
    contract_version: HANDOFF_CONTRACT_VERSION,
    type: HANDOFF_TYPES.VERIFICATION_VERDICT,
    created_at: verified,
    verified_at: verified,
    producer: { skill: "oc-code-auditor", run_id: "run-42" },
    candidate: { kind: "git_commit", id: "abc123" },
    payload: { verdict: "PASS", policy: "pre-deploy-v1" },
    ...extra,
  };
}

describe("C1 checkpoint envelope", () => {
  it("keeps legacy 1.0 and current 1.1 envelopes compatible", () => {
    expect(validateCheckpointEnvelope(checkpoint({ protocol_version: "1.0" })).ok).toBe(true);
    expect(validateCheckpointEnvelope(checkpoint({ protocol_version: "1.1" })).ok).toBe(true);
  });

  it("rejects an empty checkpoint and a skill mismatch", () => {
    expect(validateCheckpointEnvelope({}).errors).toContain('missing required field "protocol_version"');
    expect(validateCheckpointEnvelope(checkpoint(), { expectedSkill: "oc-git-ops" }).errors)
      .toContain('skill must match the requested skill "oc-git-ops"');
  });

  it("separates record mutation time from verification identity", () => {
    const data = checkpoint({
      record_updated_at: now,
      verified_at: verified,
      candidate: { kind: "git_commit", id: "abc123" },
    });
    expect(validateCheckpointEnvelope(data).ok).toBe(true);
    expect(checkpointRecordUpdatedAt(data)).toBe(now);
    expect(checkpointRecordUpdatedAt(checkpoint({ protocol_version: "1.0" }))).toBe(now);
    expect(validateCheckpointEnvelope(checkpoint({ verified_at: verified })).errors)
      .toContain("candidate must be an object with kind + id");
  });

  it("requires explicit finding lifecycle for verified evidence", () => {
    const invalid = checkpoint({
      findings: [{ id: "F-003", status: "verified", record_updated_at: now }],
    });
    expect(validateCheckpointEnvelope(invalid).errors).toContain("findings[0].verified_at required for verified findings");
  });
});

describe("C1 typed handoffs", () => {
  it("returns one validated handoff bound to an immutable candidate", () => {
    const data = checkpoint({ handoffs: [verdict()] });
    expect(validateCheckpointEnvelope(data).ok).toBe(true);
    expect(getCheckpointHandoff(data, { type: HANDOFF_TYPES.VERIFICATION_VERDICT }).candidate.id).toBe("abc123");
  });

  it("fails closed on an unusable verdict or ambiguous read", () => {
    const unusable = checkpoint({ handoffs: [verdict({ candidate: undefined })] });
    expect(validateCheckpointEnvelope(unusable).errors.join("\n")).toContain("handoff.candidate");
    const ambiguous = checkpoint({ handoffs: [verdict(), verdict({ id: "audit-def456-policy-v1" })] });
    expect(() => getCheckpointHandoff(ambiguous, { type: HANDOFF_TYPES.VERIFICATION_VERDICT }))
      .toThrow(/multiple verification\.verdict handoffs matched/);
  });
});

describe("C1 atomic store interface", () => {
  function store(capabilities = {}) {
    let value = null;
    let revision = "r0";
    return {
      apiVersion: CHECKPOINT_STORE_API_VERSION,
      capabilities: {
        durability: "filesystem",
        scope: "project",
        atomicReplace: true,
        compareAndSwap: true,
        ...capabilities,
      },
      async createSession() { return "session"; },
      async hasSession() { return true; },
      async read() { return value === null ? null : { checkpoint: value, revision }; },
      async write(_skill, _session, checkpointValue, { expectedRevision } = {}) {
        if (expectedRevision && expectedRevision !== revision) throw new Error("conflict");
        value = checkpointValue;
        revision = "r1";
        return { revision };
      },
    };
  }

  it("declares the capabilities required by the C2 local provider", () => {
    expect(validateCheckpointStoreProvider(store(), { requireAtomic: true, requireDurable: true }).ok).toBe(true);
    expect(validateCheckpointStoreProvider(store({ compareAndSwap: false }), { requireAtomic: true }).errors)
      .toContain("checkpoint store must provide atomicReplace + compareAndSwap");
  });

  it("normalizes versioned reads and enforces revision-bearing CAS writes", async () => {
    const provider = store();
    expect(await readCheckpointRecord(provider, "oc-code-auditor", "session"))
      .toEqual({ checkpoint: null, revision: null });
    expect(await writeCheckpointRecord(provider, "oc-code-auditor", "session", checkpoint(), { expectedRevision: "r0" }))
      .toEqual({ revision: "r1" });
    expect((await readCheckpointRecord(provider, "oc-code-auditor", "session")).revision).toBe("r1");
  });

  it("refuses optimistic concurrency on a store that cannot provide it", async () => {
    const provider = store({ compareAndSwap: false });
    await expect(writeCheckpointRecord(provider, "oc-code-auditor", "session", checkpoint(), { expectedRevision: "r0" }))
      .rejects.toBeInstanceOf(CheckpointStoreContractError);
  });
});

describe("C1 portable checkpoint artifact", () => {
  it("runs when copied outside the source checkout", () => {
    const artifactDir = mkdtempSync(join(tmpdir(), "oc-checkpoint-artifact-"));
    const projectDir = mkdtempSync(join(tmpdir(), "oc-checkpoint-project-"));
    try {
      const copied = join(artifactDir, "checkpoint.mjs");
      copyFileSync(join(ROOT, "scripts", "checkpoint.mjs"), copied);
      const run = spawnSync("node", [copied, "init"], {
        cwd: artifactDir,
        env: { ...process.env, OPCHAIN_ROOT: projectDir, OPCHAIN_CHECKPOINTS_DIR: join(projectDir, ".checkpoints") },
        encoding: "utf8",
      });
      expect(run.status, run.stderr).toBe(0);
      expect(run.stdout).toContain("Next:");
    } finally {
      rmSync(artifactDir, { recursive: true, force: true });
      rmSync(projectDir, { recursive: true, force: true });
    }
  });
});
