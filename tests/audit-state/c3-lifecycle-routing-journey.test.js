import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { createMcpServer } from "../../src/lib/mcp/server.js";
import catalog from "../../src/generated/mcp-catalog.json" with { type: "json" };

const ROOT = join(import.meta.dirname, "..", "..");
const SESSION_HOOK = join(ROOT, "plugins", "opchain", "hooks", "session-state.cjs");
const SUGGESTION_HOOK = join(ROOT, "plugins", "opchain", "hooks", "next-suggestion.cjs");

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "opchain-c3-lifecycle-"));
  mkdirSync(join(root, ".checkpoints"));
  return root;
}

function checkpoint(root, extra = {}) {
  const now = new Date().toISOString();
  const data = {
    protocol_version: "1.1",
    skill: "oc-code-auditor",
    project: "demo",
    project_dir: root,
    created_at: now,
    updated_at: now,
    record_updated_at: now,
    phase: "audit",
    step: "handoff",
    status: "complete",
    progress_summary: "Audit handoff.",
    next_actions: ["Hand off to oc-data-ops for pipeline design."],
    ...extra,
  };
  writeFileSync(join(root, ".checkpoints", "oc-code-auditor.checkpoint.json"), `${JSON.stringify(data, null, 2)}\n`);
  return data;
}

function hook(script, root, sessionId) {
  return spawnSync(process.execPath, [script], {
    input: JSON.stringify({ cwd: root, session_id: sessionId }),
    encoding: "utf8",
  });
}

async function route(server, query) {
  const response = await server.handle({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: "route", arguments: { query } },
  });
  return JSON.parse(response.result.content[0].text);
}

describe("C3 lifecycle and routing journey", () => {
  it("delivers a first-turn suggestion for a never-used downstream skill", () => {
    const root = fixture();
    const session = `c3-first-use-${process.pid}-${Date.now()}`;
    const stateFile = join(tmpdir(), `opchain-suggest-${session}.json`);
    try {
      checkpoint(root, { record_updated_at: "2026-09-13T10:00:00Z", updated_at: "2026-09-13T10:00:00Z" });
      expect(hook(SESSION_HOOK, root, session).status).toBe(0);
      expect(JSON.parse(readFileSync(stateFile, "utf8")).fingerprint).toContain("oc-code-auditor@2026-09-13T10:00:00Z");
      checkpoint(root);
      const stop = hook(SUGGESTION_HOOK, root, session);
      expect(stop.status).toBe(0);
      expect(JSON.parse(stop.stdout)).toMatchObject({
        systemMessage: expect.stringContaining("/oc-data-ops"),
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(stateFile, { force: true });
    }
  });

  it("does not let a metadata-only restamp hide stale verified evidence", () => {
    const root = fixture();
    const old = new Date(Date.now() - 20 * 86_400_000).toISOString();
    try {
      checkpoint(root, {
        verified_at: old,
        candidate: { kind: "git_commit", id: "abc123" },
      });
      const start = hook(SESSION_HOOK, root, `c3-freshness-${process.pid}-${Date.now()}`);
      expect(start.stdout).toContain("stale checkpoints: oc-code-auditor (complete, 20d)");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("routes fresh MCP consumers across the corrected catalog intents", async () => {
    const server = createMcpServer({ catalog });
    const cases = new Map([
      ["Generate the PR docs", "oc-docs-forge"],
      ["Repo hygiene", "oc-repo-ops"],
      ["Data pipeline", "oc-data-ops"],
      ["SOC 2 evidence", "oc-compliance-ops"],
      ["Harden this", "oc-security-hardening"],
      ["Tag the release", "oc-git-ops"],
    ]);
    for (const [query, skill] of cases) expect(await route(server, query)).toMatchObject({ skill, confident: true });
  });
});
