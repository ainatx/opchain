import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const SOURCE_CLI = join(ROOT, "scripts", "checkpoint.mjs");
const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "opchain-c3-writer-"));
  const cli = join(root, "checkpoint.mjs");
  copyFileSync(SOURCE_CLI, cli);
  return { root, cli, checkpointDir: join(root, ".checkpoints") };
}

function run(cli, root, args) {
  const child = spawn(process.execPath, [cli, ...args], {
    env: { ...process.env, OPCHAIN_ROOT: root, OPCHAIN_CHECKPOINTS_DIR: join(root, ".checkpoints") },
    stdio: ["ignore", "pipe", "pipe"],
  });
  return new Promise((resolveExit) => {
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.once("exit", (code, signal) => resolveExit({ code, signal, output }));
  });
}

async function waitForFile(path, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (existsSync(path)) return;
    await delay(20);
  }
  throw new Error(`timed out waiting for ${path}`);
}

describe("C3 standalone checkpoint writer", () => {
  it("serializes concurrent read/merge/write updates in a copied single-file CLI", async () => {
    const { root, cli, checkpointDir } = fixture();
    try {
      expect((await run(cli, root, ["update", "oc-a", "--status=in_progress", "--phase=p", "--step=s", "--progress_summary=start", '--next_actions:json=["next"]', "--skill_state:json={}"])).code).toBe(0);
      const writes = await Promise.all([
        run(cli, root, ["update", "oc-a", '--skill_state.events:json+={"id":"a"}']),
        run(cli, root, ["update", "oc-a", '--skill_state.events:json+={"id":"b"}']),
      ]);
      expect(writes.map((result) => result.code)).toEqual([0, 0]);
      const checkpoint = JSON.parse(readFileSync(join(checkpointDir, "oc-a.checkpoint.json"), "utf8"));
      expect(checkpoint.skill_state.events.map((event) => event.id).sort()).toEqual(["a", "b"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 15_000);

  it("leaves the accepted file intact when a copied writer dies after its temp write", async () => {
    const { root, cli, checkpointDir } = fixture();
    const target = join(checkpointDir, "oc-a.checkpoint.json");
    const marker = join(root, "temp-ready");
    try {
      mkdirSync(checkpointDir);
      const accepted = {
        protocol_version: "1.1",
        skill: "oc-a",
        project: "demo",
        project_dir: root,
        created_at: "2026-09-13T10:00:00Z",
        updated_at: "2026-09-13T10:00:00Z",
        phase: "p",
        step: "accepted",
        status: "complete",
        progress_summary: "accepted",
      };
      writeFileSync(target, `${JSON.stringify(accepted)}\n`);
      const script = `
        import { writeFileSync } from "node:fs";
        import { atomicWriteFile } from ${JSON.stringify(pathToFileURL(cli).href)};
        atomicWriteFile(${JSON.stringify(target)}, '{"accepted":false}\\n', {
          onTempReady() {
            writeFileSync(${JSON.stringify(marker)}, "ready");
            while (true) {}
          }
        });
      `;
      const writer = spawn(process.execPath, ["--input-type=module", "-e", script], { stdio: "ignore" });
      await waitForFile(marker);
      writer.kill("SIGKILL");
      await new Promise((resolveExit) => writer.once("exit", resolveExit));
      expect(JSON.parse(readFileSync(target, "utf8")).step).toBe("accepted");
      expect((await run(cli, root, ["update", "oc-a", "--status=complete", "--phase=p", "--step=recovered", "--progress_summary=recovered"])).code).toBe(0);
      expect(JSON.parse(readFileSync(target, "utf8")).step).toBe("recovered");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 15_000);
});
