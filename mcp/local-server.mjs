#!/usr/bin/env node
// opchain MCP server — local stdio transport.
//
// Wraps the same transport-agnostic core (src/lib/mcp/server.js) the Cloudflare
// Worker serves at https://opchain.dev/mcp, but speaks newline-delimited
// JSON-RPC over stdio and reads the skill catalog + bodies straight from disk.
// This is the offline / air-gapped alternative to the hosted endpoint.
//
// Register with Codex (~/.codex/config.toml):
//
//   [mcp_servers.opchain]
//   command = "node"
//   args = ["/abs/path/to/opchain/mcp/local-server.mjs"]
//   # env = { OPCHAIN_SKILLS_DIR = "/abs/path/to/skills" }   # optional override
//
// Checkpoints persist under <project>/.checkpoints (the hosted endpoint keeps
// separate advisory/session state in KV). Set OPCHAIN_PROJECT_DIR to choose
// that project and OPCHAIN_SKILLS_DIR to point at any skills/ tree.
// Durable local writes support macOS with /usr/bin/lockf and Linux with flock
// on PATH. Store construction fails before issuing a session or touching
// project state when that process-owned advisory-lock capability is absent.

import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import { isAbsolute, join, dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createInterface } from "node:readline";
import { buildCatalog } from "../scripts/gen-mcp-catalog.mjs";
import { createMcpServer } from "../src/lib/mcp/server.js";
import { createLocalCheckpointStore } from "../src/lib/mcp/local-checkpoint-store.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = process.env.OPCHAIN_SKILLS_DIR || join(ROOT, "skills");
const SKILLS_ROOT = realpathSync(resolve(SKILLS_DIR));
const PROJECT_DIR = resolve(process.env.OPCHAIN_PROJECT_DIR || process.cwd());

function isContained(root, target) {
  const rel = relative(root, target);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

function trustedPath(root, target, kind) {
  const absolute = resolve(target);
  if (!isContained(root, absolute)) return null;
  const rel = relative(root, absolute);
  let current = root;
  try {
    for (const segment of rel.split(sep).filter(Boolean)) {
      current = join(current, segment);
      const stat = lstatSync(current);
      if (stat.isSymbolicLink()) return null;
    }
    const stat = lstatSync(absolute);
    if (stat.isSymbolicLink()) return null;
    if (kind === "file" && !stat.isFile()) return null;
    if (kind === "directory" && !stat.isDirectory()) return null;
    const canonical = realpathSync(absolute);
    return isContained(root, canonical) ? canonical : null;
  } catch {
    return null;
  }
}

function trustedSkillRoot(id) {
  return trustedPath(SKILLS_ROOT, join(SKILLS_ROOT, id), "directory");
}

function readTrustedFile(root, target) {
  const canonical = trustedPath(root, target, "file");
  if (!canonical) return null;
  let descriptor;
  try {
    descriptor = openSync(canonical, constants.O_RDONLY | constants.O_NOFOLLOW);
    if (!fstatSync(descriptor).isFile()) return null;
    return readFileSync(descriptor);
  } catch {
    return null;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

// buildCatalog reads these entry points eagerly, so reject unsafe roots before
// it can follow them. Nested reference symlinks are ignored by both its Dirent
// walk and the canonical manifest below.
function assertCatalogEntryPoints() {
  const orchestrator = join(SKILLS_ROOT, "orchestrator.md");
  if (existsSync(orchestrator) && !trustedPath(SKILLS_ROOT, orchestrator, "file")) {
    throw new Error("local MCP refused an unsafe orchestrator.md path");
  }
  for (const entry of readdirSync(SKILLS_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillRoot = trustedSkillRoot(entry.name);
    if (!skillRoot) continue;
    const skill = join(skillRoot, "SKILL.md");
    if (existsSync(skill) && !trustedPath(skillRoot, skill, "file")) {
      throw new Error(`local MCP refused an unsafe SKILL.md path for ${entry.name}`);
    }
    const references = join(skillRoot, "references");
    if (existsSync(references) && !trustedPath(skillRoot, references, "directory")) {
      throw new Error(`local MCP refused an unsafe references path for ${entry.name}`);
    }
  }
}

function referenceFiles(id) {
  const skillRoot = trustedSkillRoot(id);
  if (!skillRoot) return [];
  const root = join(skillRoot, "references");
  if (!trustedPath(skillRoot, root, "directory")) return [];
  const files = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory() && trustedPath(root, path, "directory")) visit(path);
      else if (entry.isFile()) {
        const body = readTrustedFile(root, path);
        if (!body) continue;
        files.push({
          path: relative(skillRoot, path).split(sep).join("/"),
          bytes: body.length,
          sha256: createHash("sha256").update(body).digest("hex"),
        });
      }
    }
  };
  visit(root);
  return files;
}

function readReference(id, path, manifest) {
  const member = manifest.find((entry) => entry.path === path);
  const skillRoot = trustedSkillRoot(id);
  if (!member || !skillRoot) return null;
  const body = readTrustedFile(skillRoot, join(skillRoot, path));
  if (!body || body.length !== member.bytes) return null;
  if (createHash("sha256").update(body).digest("hex") !== member.sha256) return null;
  return body.toString("utf8");
}

function serverVersion() {
  // Mirror build.mjs: git short SHA, falling back to "dev" outside a repo.
  try {
    return execSync("git rev-parse --short HEAD", { cwd: ROOT, encoding: "utf8" }).trim() || "dev";
  } catch {
    return "dev";
  }
}

assertCatalogEntryPoints();
const catalog = buildCatalog(SKILLS_ROOT);
const referenceManifests = new Map(catalog.skills.map((skill) => [skill.id, referenceFiles(skill.id)]));

const server = createMcpServer({
  catalog,
  serverVersion: serverVersion(),
  loadBody: async (id) => {
    const skillRoot = trustedSkillRoot(id);
    if (!skillRoot) return null;
    return readTrustedFile(skillRoot, join(skillRoot, "SKILL.md"))?.toString("utf8") ?? null;
  },
  listReferences: async (id) => referenceManifests.get(id) ?? [],
  loadReference: async (id, path) => readReference(id, path, referenceManifests.get(id) ?? []),
  checkpoints: createLocalCheckpointStore({ projectDir: PROJECT_DIR }),
  checkpointValidation: "strict",
});

function write(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

const rl = createInterface({ input: process.stdin });
rl.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let message;
  try {
    message = JSON.parse(trimmed);
  } catch {
    write({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
    return;
  }
  // Single message or JSON-RPC batch — mirror the Worker transport.
  if (Array.isArray(message)) {
    const responses = (await Promise.all(message.map((m) => server.handle(m)))).filter((r) => r !== null);
    if (responses.length) write(responses);
    return;
  }
  const response = await server.handle(message);
  if (response !== null) write(response);
});
