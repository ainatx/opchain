import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { createLocalCheckpointStore, resolveLocalCheckpointLock } from "../../src/lib/mcp/local-checkpoint-store.js";
import { createMcpServer } from "../../src/lib/mcp/server.js";

const now = "2026-09-13T18:00:00Z";
const ROOT = join(import.meta.dirname, "..", "..");

function checkpoint(extra = {}) {
  return {
    protocol_version: "1.1",
    skill: "oc-code-auditor",
    project: "demo",
    project_dir: "/tmp/demo",
    created_at: now,
    updated_at: now,
    record_updated_at: now,
    phase: "audit",
    step: "write",
    status: "in_progress",
    progress_summary: "Working.",
    next_actions: ["Finish focused test."],
    ...extra,
  };
}

function project() {
  return mkdtempSync(join(tmpdir(), "opchain-c2-local-"));
}

function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
}

const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));

async function waitForFile(path, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (existsSync(path)) return;
    await delay(20);
  }
  throw new Error(`timed out waiting for ${path}`);
}

async function call(server, name, args, id = 1) {
  const response = await server.handle({ jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } });
  return response.result;
}

describe("C2 local durable checkpoint provider", () => {
  it("fails before use when Linux flock is missing or the platform is unsupported", () => {
    const dir = project();
    try {
      expect(() => createLocalCheckpointStore({ projectDir: dir, platform: "linux", pathEnv: dir }))
        .toThrow(/Linux requires the `flock` executable on PATH/);
      expect(() => resolveLocalCheckpointLock({ platform: "win32", pathEnv: "" }))
        .toThrow(/supports macOS .* and Linux .*; win32 is unsupported/);
      expect(existsSync(join(dir, ".checkpoints"))).toBe(false);
    } finally {
      cleanup(dir);
    }
  });

  it("persists issued sessions across restart while sharing one project checkpoint", async () => {
    const dir = project();
    try {
      const first = createLocalCheckpointStore({ projectDir: dir });
      const session = await first.createSession();
      expect(readFileSync(join(dir, ".checkpoints", ".gitignore"), "utf8")).toBe(
        ".mcp-sessions.json\n*.lock\n.*.tmp\n.local/\n",
      );
      const written = await first.write("oc-code-auditor", session, checkpoint(), { expectedRevision: null });
      const restarted = createLocalCheckpointStore({ projectDir: dir });
      expect(await restarted.hasSession(session)).toBe(true);
      expect(await restarted.read("oc-code-auditor", session)).toEqual({ checkpoint: checkpoint(), revision: written.revision });
      const secondSession = await restarted.createSession();
      expect(await restarted.read("oc-code-auditor", secondSession)).toEqual({ checkpoint: checkpoint(), revision: written.revision });
      const concurrentSessions = await Promise.all([restarted.createSession(), restarted.createSession()]);
      expect(await Promise.all(concurrentSessions.map((issued) => createLocalCheckpointStore({ projectDir: dir }).hasSession(issued))))
        .toEqual([true, true]);
      const fabricated = "11111111-1111-4111-8111-111111111111";
      expect(await restarted.hasSession(fabricated)).toBe(false);
      await expect(restarted.read("oc-code-auditor", fabricated)).rejects.toMatchObject({ name: "CheckpointStoreContractError" });
    } finally {
      cleanup(dir);
    }
  });

  it("allows one create-only winner and rejects stale competing writes", async () => {
    const dir = project();
    try {
      const store = createLocalCheckpointStore({ projectDir: dir });
      const session = await store.createSession();
      const settled = await Promise.allSettled([
        store.write("oc-code-auditor", session, checkpoint({ step: "first" }), { expectedRevision: null }),
        store.write("oc-code-auditor", session, checkpoint({ step: "second" }), { expectedRevision: null }),
      ]);
      expect(settled.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      expect(settled.filter((result) => result.status === "rejected")[0].reason.name).toBe("CheckpointConflictError");
      const stored = await store.read("oc-code-auditor", session);
      await expect(store.write("oc-code-auditor", session, checkpoint({ step: "stale" }), { expectedRevision: "not-current" }))
        .rejects.toMatchObject({ name: "CheckpointConflictError" });
      expect((await store.read("oc-code-auditor", session)).revision).toBe(stored.revision);
    } finally {
      cleanup(dir);
    }
  });

  it("ignores an interrupted temporary write and keeps the last complete record", async () => {
    const dir = project();
    try {
      const store = createLocalCheckpointStore({ projectDir: dir });
      const session = await store.createSession();
      await store.write("oc-code-auditor", session, checkpoint({ step: "complete" }), { expectedRevision: null });
      const cpDir = join(dir, ".checkpoints");
      writeFileSync(join(cpDir, ".oc-code-auditor.interrupted.tmp"), "{not-json");
      expect((await createLocalCheckpointStore({ projectDir: dir }).read("oc-code-auditor", session)).checkpoint.step).toBe("complete");
    } finally {
      cleanup(dir);
    }
  });

  it("releases a killed writer's OS lock, protects a live owner, and serializes concurrent recovery", async () => {
    const dir = project();
    const marker = join(dir, "writer-holds-lock");
    const store = createLocalCheckpointStore({ projectDir: dir });
    const storeModule = pathToFileURL(join(ROOT, "src/lib/mcp/local-checkpoint-store.js")).href;
    const childScript = `
      import { writeFileSync } from "node:fs";
      import { createLocalCheckpointStore } from ${JSON.stringify(storeModule)};
      const store = createLocalCheckpointStore({ projectDir: ${JSON.stringify(dir)} });
      const session = await store.createSession();
      await store.write("oc-code-auditor", session, {
        toJSON() {
          writeFileSync(${JSON.stringify(marker)}, "locked");
          while (true) {}
        }
      }, { expectedRevision: null });
    `;
    const writer = spawn(process.execPath, ["--input-type=module", "-e", childScript], { stdio: "ignore" });
    try {
      // Process startup may contend with other Git/Node fixtures in the full suite.
      await waitForFile(marker, 15_000);
      const session = await store.createSession();
      let completed = 0;
      const contenders = ["recovery-a", "recovery-b"].map((step) =>
        store.write("oc-code-auditor", session, checkpoint({ step }), { expectedRevision: null })
          .finally(() => { completed += 1; }),
      );
      await delay(150);
      expect(completed).toBe(0);

      writer.kill("SIGKILL");
      await new Promise((resolveExit) => writer.once("exit", resolveExit));
      const settled = await Promise.allSettled(contenders);
      expect(settled.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      expect(settled.filter((result) => result.status === "rejected")[0].reason.name).toBe("CheckpointConflictError");
      expect(["recovery-a", "recovery-b"]).toContain((await store.read("oc-code-auditor", session)).checkpoint.step);
    } finally {
      if (writer.exitCode === null && writer.signalCode === null) writer.kill("SIGKILL");
      cleanup(dir);
    }
  }, 30_000);
});

describe("C2 strict local MCP wiring", () => {
  it("requires typed envelopes and returns revisions for local reads/writes", async () => {
    const dir = project();
    try {
      const store = createLocalCheckpointStore({ projectDir: dir });
      const server = createMcpServer({
        catalog: { skills: [{ id: "oc-code-auditor", commands: [] }], orchestrator: "" },
        checkpoints: store,
        checkpointValidation: "strict",
      });
      const session = JSON.parse((await call(server, "create_checkpoint_session", {})).content[0].text).sessionId;
      const fabricatedRead = await call(server, "read_checkpoint", {
        skill: "oc-code-auditor",
        sessionId: "11111111-1111-4111-8111-111111111111",
      });
      expect(fabricatedRead.isError).toBe(true);
      const rejected = await call(server, "write_checkpoint", { skill: "oc-code-auditor", sessionId: session, checkpoint: { skill: "oc-code-auditor" } });
      expect(rejected.isError).toBe(true);
      const write = JSON.parse((await call(server, "write_checkpoint", {
        skill: "oc-code-auditor", sessionId: session, checkpoint: checkpoint(), expectedRevision: null,
      })).content[0].text);
      expect(write.revision).toMatch(/^[a-f0-9]{64}$/);
      const read = JSON.parse((await call(server, "read_checkpoint", { skill: "oc-code-auditor", sessionId: session })).content[0].text);
      expect(read).toMatchObject({ checkpoint: checkpoint(), revision: write.revision });
    } finally {
      cleanup(dir);
    }
  });
});

describe("C2 lifecycle hook compatibility", () => {
  it("seeds the Stop baseline at SessionStart and counts only open typed findings", () => {
    const dir = project();
    const session = "c2-hook-session";
    try {
      mkdirSync(join(dir, ".checkpoints"));
      writeFileSync(join(dir, ".checkpoints", "oc-code-auditor.checkpoint.json"), JSON.stringify(checkpoint({
        status: "complete",
        findings: [
          { id: "fixed-high", severity: "high", status: "fixed", record_updated_at: now },
          { id: "open-high", severity: "high", status: "open", record_updated_at: now },
        ],
      })));
      const input = JSON.stringify({ cwd: dir, session_id: session });
      const start = spawnSync("node", [join(ROOT, "plugins/opchain/hooks/session-state.cjs")], { input, encoding: "utf8" });
      expect(start.stdout).toContain("0 critical / 1 high open");
      const stop = spawnSync("node", [join(ROOT, "plugins/opchain/hooks/next-suggestion.cjs")], { input, encoding: "utf8" });
      expect(stop.stdout).toBe("");
    } finally {
      cleanup(dir);
    }
  });
});
