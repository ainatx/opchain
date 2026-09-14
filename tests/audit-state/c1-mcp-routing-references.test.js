import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { createMcpServer } from "../../src/lib/mcp/server.js";
import realCatalog from "../../src/generated/mcp-catalog.json" with { type: "json" };

const ROOT = join(import.meta.dirname, "..", "..");
const LOCAL_SERVER = join(ROOT, "mcp", "local-server.mjs");
const rpc = (method, params, id) => ({ jsonrpc: "2.0", id, method, params });

function runLocal(messages) {
  const result = spawnSync("node", [LOCAL_SERVER], {
    cwd: ROOT,
    env: { ...process.env, OPCHAIN_SKILLS_DIR: join(ROOT, "skills") },
    input: messages.map((message) => JSON.stringify(message)).join("\n") + "\n",
    encoding: "utf8",
    timeout: 15_000,
  });
  if (result.status !== 0) throw new Error(result.stderr || `local MCP exited ${result.status}`);
  return result.stdout.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

describe("C1 real MCP router", () => {
  const server = createMcpServer({ catalog: realCatalog });
  const inputs = readFileSync(join(ROOT, "prompts", "opchain-eval", "inputs.jsonl"), "utf8")
    .trim().split("\n").map((line) => JSON.parse(line));
  const expected = new Map(
    readFileSync(join(ROOT, "prompts", "opchain-eval", "expected.jsonl"), "utf8")
      .trim().split("\n").map((line) => JSON.parse(line)).map((row) => [row.id, row.expect.all[0]]),
  );

  for (const item of inputs) {
    it(`${item.id} routes through the MCP tool`, async () => {
      const response = await server.handle(rpc("tools/call", { name: "route", arguments: { query: item.input } }, 1));
      const route = JSON.parse(response.result.content[0].text);
      expect(route.skill).toBe(expected.get(item.id));
    });
  }
});

describe("C1 MCP-only reference retrieval", () => {
  it("advertises a versioned manifest and loads mandatory references", () => {
    const [listed, manifestResult, canonicalResult, compatibilityResult] = runLocal([
      rpc("resources/list", {}, 1),
      rpc("resources/read", { uri: "opchain://skill/oc-app-architect/references/v1/manifest.json" }, 2),
      rpc("resources/read", { uri: "opchain://skill/oc-app-architect/references/v1/spec-template.md" }, 3),
      rpc("resources/read", { uri: "opchain://skill/oc-app-architect/references/spec-template.md" }, 4),
    ]);
    expect(listed.result.resources.map((resource) => resource.uri))
      .toContain("opchain://skill/oc-app-architect/references/v1/manifest.json");
    const manifest = JSON.parse(manifestResult.result.contents[0].text);
    expect(manifest.schema).toBe("opchain.skill-references/1.0");
    expect(manifest.files.map((file) => file.path)).toContain("references/spec-template.md");
    expect(canonicalResult.result.contents[0].text).toContain("Spec Template");
    expect(compatibilityResult.result.contents[0].text).toContain("Spec Template");
  });

  it("rejects traversal and unadvertised files", () => {
    const [traversal, missing] = runLocal([
      rpc("resources/read", { uri: "opchain://skill/oc-app-architect/references/v1/../SKILL.md" }, 1),
      rpc("resources/read", { uri: "opchain://skill/oc-app-architect/references/v1/not-advertised.md" }, 2),
    ]);
    expect(traversal.error.code).toBe(-32602);
    expect(missing.error.code).toBe(-32602);
  });
});
