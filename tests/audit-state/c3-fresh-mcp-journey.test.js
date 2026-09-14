import { copyFileSync, cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const require = createRequire(import.meta.url);
const packageRoot = (name) => dirname(require.resolve(`${name}/package.json`));

function copy(root, relative) {
  const destination = join(root, relative);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(join(ROOT, relative), destination);
}

function artifact() {
  const root = mkdtempSync(join(tmpdir(), "opchain-c3-artifact-"));
  for (const relative of [
    "mcp/local-server.mjs",
    "scripts/gen-mcp-catalog.mjs",
    "scripts/lib/frontmatter.mjs",
    "src/lib/mcp/checkpoint-contract.js",
    "src/lib/mcp/checkpoint-store.js",
    "src/lib/mcp/local-checkpoint-store.js",
    "src/lib/mcp/references.js",
    "src/lib/mcp/routing.js",
    "src/lib/mcp/server.js",
  ]) copy(root, relative);
  writeFileSync(join(root, "package.json"), '{"type":"module"}\n');
  mkdirSync(join(root, "node_modules"));
  cpSync(packageRoot("js-yaml"), join(root, "node_modules", "js-yaml"), { recursive: true });
  cpSync(packageRoot("argparse"), join(root, "node_modules", "argparse"), { recursive: true });
  mkdirSync(join(root, "skills", "oc-producer", "references"), { recursive: true });
  writeFileSync(join(root, "skills", "orchestrator.md"), "# Orchestrator\n");
  writeFileSync(join(root, "skills", "oc-producer", "SKILL.md"), [
    "---",
    "name: oc-producer",
    "displayName: Producer",
    "version: 1.0.0",
    "shortDesc: Produces a typed handoff.",
    "phases: [build]",
    "triAgent: false",
    "commands: [/oc-produce]",
    "description: Produces a typed handoff.",
    "---",
    "# Producer",
    "",
  ].join("\n"));
  writeFileSync(join(root, "skills", "oc-producer", "references", "guide.md"), "# Producer guide\n");
  return root;
}

function startServer(artifactRoot, projectDir) {
  const child = spawn(process.execPath, [join(artifactRoot, "mcp", "local-server.mjs")], {
    cwd: artifactRoot,
    env: {
      ...process.env,
      OPCHAIN_SKILLS_DIR: join(artifactRoot, "skills"),
      OPCHAIN_PROJECT_DIR: projectDir,
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  let nextId = 1;
  let buffer = "";
  const pending = [];
  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    while (buffer.includes("\n")) {
      const end = buffer.indexOf("\n");
      const line = buffer.slice(0, end);
      buffer = buffer.slice(end + 1);
      if (line && pending.length) pending.shift().resolve(JSON.parse(line));
    }
  });
  child.once("error", (error) => {
    while (pending.length) pending.shift().reject(error);
  });
  return {
    request(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.push({ resolve, reject });
        child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
      });
    },
    async close() {
      if (child.exitCode !== null || child.signalCode !== null) return;
      child.stdin.end();
      await new Promise((resolveExit) => child.once("exit", resolveExit));
    },
  };
}

function tool(name, args) {
  return { name, arguments: args };
}

describe("C3 fresh artifact-only MCP journey", () => {
  it("loads advertised references, routes, restarts, resumes, and consumes a typed handoff", async () => {
    const artifactRoot = artifact();
    const projectDir = mkdtempSync(join(tmpdir(), "opchain-c3-project-"));
    let first;
    let restarted;
    try {
      first = startServer(artifactRoot, projectDir);
      const resources = await first.request("resources/list");
      const manifestUri = "opchain://skill/oc-producer/references/v1/manifest.json";
      expect(resources.result.resources.map((resource) => resource.uri)).toContain(manifestUri);
      const manifest = await first.request("resources/read", { uri: manifestUri });
      expect(JSON.parse(manifest.result.contents[0].text).files.map((file) => file.path)).toContain("references/guide.md");
      const guide = await first.request("resources/read", { uri: "opchain://skill/oc-producer/references/v1/guide.md" });
      expect(guide.result.contents[0].text).toContain("Producer guide");
      const routed = await first.request("tools/call", tool("route", { query: "/oc-produce" }));
      expect(JSON.parse(routed.result.content[0].text)).toMatchObject({ skill: "oc-producer" });

      const issued = await first.request("tools/call", tool("create_checkpoint_session", {}));
      const session = JSON.parse(issued.result.content[0].text).sessionId;
      const at = new Date().toISOString();
      const checkpoint = {
        protocol_version: "1.1",
        skill: "oc-producer",
        project: "fresh-project",
        project_dir: projectDir,
        created_at: at,
        updated_at: at,
        record_updated_at: at,
        phase: "handoff",
        step: "ready",
        status: "complete",
        progress_summary: "Typed handoff ready.",
        handoffs: [{
          id: "producer-artifact-v1",
          contract_version: "1.0",
          type: "evidence.reference",
          created_at: at,
          producer: { skill: "oc-producer", run_id: "fresh-run" },
          artifact: { kind: "file", id: "artifact-1", path: "evidence.json" },
          payload: { purpose: "downstream-read" },
        }],
      };
      const written = await first.request("tools/call", tool("write_checkpoint", {
        skill: "oc-producer", sessionId: session, checkpoint, expectedRevision: null,
      }));
      expect(JSON.parse(written.result.content[0].text).revision).toMatch(/^[a-f0-9]{64}$/);
      await first.close();
      first = null;

      restarted = startServer(artifactRoot, projectDir);
      const secondIssued = await restarted.request("tools/call", tool("create_checkpoint_session", {}));
      const secondSession = JSON.parse(secondIssued.result.content[0].text).sessionId;
      const resumed = await restarted.request("tools/call", tool("read_checkpoint", {
        skill: "oc-producer", sessionId: secondSession,
      }));
      const resumedCheckpoint = JSON.parse(resumed.result.content[0].text).checkpoint;
      const contract = await import(pathToFileURL(join(artifactRoot, "src/lib/mcp/checkpoint-contract.js")).href);
      expect(contract.getCheckpointHandoff(resumedCheckpoint, { type: "evidence.reference" })).toMatchObject({
        artifact: { id: "artifact-1" },
        payload: { purpose: "downstream-read" },
      });
    } finally {
      if (first) await first.close();
      if (restarted) await restarted.close();
      rmSync(artifactRoot, { recursive: true, force: true });
      rmSync(projectDir, { recursive: true, force: true });
    }
  }, 20_000);
});
