import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import worker from "../../src/index.js";

const docs = join(import.meta.dirname, "../../public/docs");
const skill = "oc-app-architect";
const canonical = `opchain://skill/${skill}/references/v1/spec-template.md`;
const manifestUri = `opchain://skill/${skill}/references/v1/manifest.json`;

function fixture() {
  const requests = [];
  const env = { ASSETS: { async fetch(request) {
    requests.push(new URL(request.url).pathname);
    const relative = new URL(request.url).pathname.slice("/docs/".length);
    const path = join(docs, relative);
    return existsSync(path) ? new Response(readFileSync(path)) : new Response("", { status: 404 });
  } } };
  async function rpc(method, params) {
    const response = await worker.fetch(new Request("https://opchain.dev/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://opchain.dev" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }), env, { waitUntil() {} });
    expect(response.status).toBe(200);
    return response.json();
  }
  return { rpc, requests };
}

describe("hosted MCP packaged references", () => {
  it("advertises a versioned manifest whose metadata matches the published files", async () => {
    const { rpc } = fixture();
    const listed = await rpc("resources/list", {});
    expect(listed.result.resources.some(r => r.uri === manifestUri)).toBe(true);
    const response = await rpc("resources/read", { uri: manifestUri });
    const manifest = JSON.parse(response.result.contents[0].text);
    expect(manifest.files.some(f => f.uri === canonical)).toBe(true);
    for (const file of manifest.files) {
      const body = readFileSync(join(docs, skill, file.path));
      expect(body.length).toBe(file.bytes);
      expect(createHash("sha256").update(body).digest("hex")).toBe(file.sha256);
    }
  });

  it("loads canonical and compatibility reference URIs through the Worker ASSETS binding", async () => {
    const { rpc, requests } = fixture();
    const expected = readFileSync(join(docs, skill, "references/spec-template.md"), "utf8");
    for (const uri of [canonical, `opchain://skill/${skill}/references/spec-template.md`]) {
      const response = await rpc("resources/read", { uri });
      expect(response.result.contents[0].text).toBe(expected);
    }
    expect(requests).toEqual(Array(2).fill(`/docs/${skill}/references/spec-template.md`));
  });

  it("rejects traversal before asset access and reports missing references", async () => {
    const { rpc, requests } = fixture();
    for (const path of ["../SKILL.md", "%2e%2e/SKILL.md"]) {
      const response = await rpc("resources/read", { uri: `opchain://skill/${skill}/references/v1/${path}` });
      expect(response.error.code).toBe(-32602);
    }
    expect(requests).toEqual([]);
    const missing = await rpc("resources/read", { uri: `opchain://skill/${skill}/references/v1/missing-audit-fixture.md` });
    expect(missing.error.code).toBe(-32602);
  });
});
