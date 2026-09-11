import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import worker from "../src/index.js";

function makeKv() {
  const store = new Map();
  const puts = [];
  const gets = [];
  return {
    store,
    puts,
    gets,
    async get(key) { gets.push(key); return store.get(key) ?? null; },
    async put(key, value, options) { puts.push({ key, value, options }); store.set(key, value); },
  };
}

function makeRateLimiter(limit = 30) {
  const counts = new Map();
  return {
    counts,
    async limit({ key }) {
      const next = (counts.get(key) || 0) + 1;
      counts.set(key, next);
      return { success: next <= limit };
    },
  };
}

function parseJsonc(path) {
  const source = readFileSync(path, "utf8");
  let json = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (inString) {
      json += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
      json += char;
    } else if (char === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") i += 1;
      json += "\n";
    } else {
      json += char;
    }
  }
  return JSON.parse(json);
}

// ASSETS stub: serves a fake SKILL.md for /docs/<id>/SKILL.md, 404s otherwise.
function envWith(overrides = {}) {
  return {
    ASSETS: {
      async fetch(req) {
        const u = new URL(req.url);
        if (u.pathname.startsWith("/docs/") && u.pathname.endsWith("/SKILL.md")) {
          return new Response(`# ${u.pathname}\nstub skill body`, { status: 200 });
        }
        return new Response("", { status: 404 });
      },
    },
    NOTIFY: makeKv(),
    MCP_WRITE_RATE_LIMITER: makeRateLimiter(),
    MCP_SESSION_SIGNING_KEY: "test-only-session-signing-key-32-bytes-minimum",
    ...overrides,
  };
}

function post(body, env = envWith()) {
  return worker.fetch(
    new Request("https://opchain.dev/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://opchain.dev" },
      body: JSON.stringify(body),
    }),
    env,
    { waitUntil() {} },
  );
}

const rpc = (method, params, id = 1) => ({ jsonrpc: "2.0", id, method, params });
const SESSION_A = "2dbf0d8e-c62a-43f8-8a50-7a456445c50c";
const SESSION_B = "a3e80944-351e-41d8-bbac-d784082c1263";

async function createSession(env) {
  const res = await post(rpc("tools/call", { name: "create_checkpoint_session", arguments: {} }), env);
  expect(res.status).toBe(200);
  const body = await res.json();
  return JSON.parse(body.result.content[0].text).sessionId;
}

describe("POST /mcp", () => {
  it("pins distinct production and staging edge mutation budgets", () => {
    const config = parseJsonc(join(dirname(fileURLToPath(import.meta.url)), "..", "wrangler.jsonc"));
    const prod = config.ratelimits.find((binding) => binding.name === "MCP_WRITE_RATE_LIMITER");
    const staging = config.env.staging.ratelimits.find((binding) => binding.name === "MCP_WRITE_RATE_LIMITER");
    expect(prod).toEqual({ namespace_id: "19001", name: "MCP_WRITE_RATE_LIMITER", simple: { limit: 30, period: 60 } });
    expect(staging).toEqual({ namespace_id: "19002", name: "MCP_WRITE_RATE_LIMITER", simple: { limit: 30, period: 60 } });
    expect(staging.namespace_id).not.toBe(prod.namespace_id);
  });

  it("initialize identifies the server as opchain", async () => {
    const res = await post(rpc("initialize", { protocolVersion: "2025-06-18" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.serverInfo.name).toBe("opchain");
    expect(body.result.serverInfo.version).toBe("test"); // __OPCHAIN_VERSION__ define
  });

  it("list_skills returns the full generated catalog (every skills/ directory)", async () => {
    const res = await post(rpc("tools/call", { name: "list_skills" }));
    const body = await res.json();
    const parsed = JSON.parse(body.result.content[0].text);
    // Count derives from the real tree so adding the 30th skill doesn't need
    // this literal touched (a hard-coded 29 was S2 audit finding F05/F17).
    const skillsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "skills");
    const expected = readdirSync(skillsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && existsSync(join(skillsDir, e.name, "SKILL.md"))).length;
    expect(expected).toBeGreaterThanOrEqual(29);
    expect(parsed.skills.length).toBe(expected);
    expect(parsed.skills.map((s) => s.id)).toContain("oc-release-ops");
    expect(parsed.skills.map((s) => s.id)).toContain("oc-claude-api");
    expect(parsed.skills.map((s) => s.id)).toContain("oc-cost-ops");
    expect(parsed.skills.map((s) => s.id)).toContain("oc-telemetry-ops");
    expect(parsed.skills.map((s) => s.id)).toContain("oc-signal-forge");
    expect(parsed.skills.map((s) => s.id)).toContain("oc-modularize-ops");
    expect(parsed.skills.map((s) => s.id)).toContain("oc-fleet-ops");
    expect(parsed.skills.map((s) => s.id)).toContain("oc-docs-forge");
    expect(parsed.skills.map((s) => s.id)).toContain("oc-repo-ops");
  });

  it("get_skill streams the SKILL.md from the ASSETS binding", async () => {
    const res = await post(rpc("tools/call", { name: "get_skill", arguments: { id: "oc-git-ops" } }));
    const body = await res.json();
    expect(body.result.content[0].text).toContain("/docs/oc-git-ops/SKILL.md");
  });

  it("checkpoints persist in KV across calls", async () => {
    const env = envWith();
    const sessionId = await createSession(env);
    await post(rpc("tools/call", {
      name: "write_checkpoint",
      arguments: { skill: "oc-app-architect", sessionId, checkpoint: { phase: "spec" } },
    }), env);
    const res = await post(rpc("tools/call", {
      name: "read_checkpoint",
      arguments: { skill: "oc-app-architect", sessionId },
    }), env);
    const body = await res.json();
    expect(JSON.parse(body.result.content[0].text).checkpoint).toEqual({ phase: "spec" });
    // Stored under a namespaced key so it can't collide with lead/vote keys.
    expect([...env.NOTIFY.store.keys()].find((key) => key.startsWith("mcp-checkpoint:")))
      .toBe(`mcp-checkpoint:${sessionId}:oc-app-architect`);
    const checkpointPut = env.NOTIFY.puts.find((entry) => entry.key.startsWith("mcp-checkpoint:"));
    expect(checkpointPut.options).toEqual({ expirationTtl: 30 * 24 * 60 * 60 });
  });

  it("keeps checkpoint sessions isolated", async () => {
    const env = envWith();
    const sessionA = await createSession(env);
    const sessionB = await createSession(env);
    await post(rpc("tools/call", {
      name: "write_checkpoint",
      arguments: { skill: "oc-app-architect", sessionId: sessionA, checkpoint: { secret: "a" } },
    }), env);
    const res = await post(rpc("tools/call", {
      name: "read_checkpoint",
      arguments: { skill: "oc-app-architect", sessionId: sessionB },
    }), env);
    const body = await res.json();
    expect(JSON.parse(body.result.content[0].text).checkpoint).toBeNull();
  });

  it("rejects syntactically valid sessions that were never issued by the server", async () => {
    const env = envWith();
    const res = await post(rpc("tools/call", {
      name: "read_checkpoint",
      arguments: { skill: "oc-app-architect", sessionId: SESSION_A },
    }), env);
    const body = await res.json();
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toContain("create_checkpoint_session");
  });

  it("rejects non-canonical or wrong-key signatures", async () => {
    const issuer = envWith();
    const issued = await createSession(issuer);
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    const finalIndex = alphabet.indexOf(issued.at(-1));
    expect(finalIndex % 4).toBe(0);
    const alias = `${issued.slice(0, -1)}${alphabet[finalIndex + 1]}`;

    for (const [env, sessionId] of [
      [issuer, alias],
      [envWith({ MCP_SESSION_SIGNING_KEY: "different-test-session-key-at-least-32-bytes" }), issued],
    ]) {
      const res = await post(rpc("tools/call", {
        name: "read_checkpoint",
        arguments: { skill: "oc-app-architect", sessionId },
      }), env);
      const body = await res.json();
      expect(body.result.isError).toBe(true);
      expect(body.result.content[0].text).toContain("create_checkpoint_session");
    }
  });

  it("fails session issuance closed when the signing secret is unavailable", async () => {
    const env = envWith({ MCP_SESSION_SIGNING_KEY: undefined });
    const res = await post(rpc("tools/call", {
      name: "create_checkpoint_session",
      arguments: {},
    }), env);
    const body = await res.json();
    expect(body.error.code).toBe(-32603);
    expect(body.error.message).toContain("signing key");
    expect(env.NOTIFY.puts).toHaveLength(0);
  });

  it("rejects oversized request bodies before JSON-RPC dispatch", async () => {
    const res = await worker.fetch(
      new Request("https://opchain.dev/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: "x".repeat(257 * 1024) }),
      }),
      envWith(),
      { waitUntil() {} },
    );
    expect(res.status).toBe(413);
    expect((await res.json()).error.message).toContain("too large");
  });

  it("rate-limits checkpoint writes per IP without throttling read-only calls", async () => {
    const env = envWith();
    // Mint each token through an equivalent server environment so each write
    // targets a distinct KV key. Workers KV independently limits a single key
    // to one write/second; this test isolates the edge/IP budget contract.
    const sessionIds = [];
    for (let i = 0; i < 31; i++) sessionIds.push(await createSession(envWith()));
    for (let i = 0; i < 30; i++) {
      const res = await worker.fetch(
        new Request("https://opchain.dev/mcp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "CF-Connecting-IP": "203.0.113.10",
          },
          body: JSON.stringify(rpc("tools/call", {
            name: "write_checkpoint",
            arguments: { skill: "oc-app-architect", sessionId: sessionIds[i], checkpoint: { i } },
          }, i)),
        }),
        env,
        { waitUntil() {} },
      );
      expect(res.status).toBe(200);
    }

    const limited = await worker.fetch(
      new Request("https://opchain.dev/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.10" },
        body: JSON.stringify(rpc("tools/call", {
          name: "write_checkpoint",
          arguments: { skill: "oc-app-architect", sessionId: sessionIds[30], checkpoint: { i: 31 } },
        })),
      }),
      env,
      { waitUntil() {} },
    );
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("60");

    const readOnly = await post(rpc("tools/call", { name: "list_skills" }), env);
    expect(readOnly.status).toBe(200);
  });

  it("counts every checkpoint mutation in a JSON-RPC batch toward the limit", async () => {
    const env = envWith();
    const batch = Array.from({ length: 25 }, (_, i) => rpc("tools/call", {
      name: "create_checkpoint_session",
      arguments: {},
    }, i));
    expect((await post(batch, env)).status).toBe(200);

    const tooMany = Array.from({ length: 6 }, (_, i) => rpc("tools/call", {
      name: "create_checkpoint_session",
      arguments: {},
    }, i + 25));
    const limited = await post(tooMany, env);
    expect(limited.status).toBe(429);
  });

  it("fails checkpoint writes closed when the edge limiter is unavailable", async () => {
    const env = envWith({ MCP_WRITE_RATE_LIMITER: undefined });
    const unavailable = await post(rpc("tools/call", {
      name: "write_checkpoint",
      arguments: { skill: "oc-app-architect", sessionId: SESSION_A, checkpoint: { phase: "spec" } },
    }), env);
    expect(unavailable.status).toBe(503);
    expect((await unavailable.json()).error.message).toContain("protection unavailable");

    const readOnly = await post(rpc("tools/call", { name: "list_skills" }), env);
    expect(readOnly.status).toBe(200);
  });

  it("rejects an untrusted Origin before parsing, KV, or rate limiting", async () => {
    const env = envWith();
    const res = await worker.fetch(
      new Request("https://opchain.dev/mcp", {
        method: "POST",
        headers: { "Content-Type": "text/plain", Origin: "https://evil.example.com" },
        body: JSON.stringify(rpc("tools/call", { name: "create_checkpoint_session", arguments: {} })),
      }),
      env,
      { waitUntil() {} },
    );
    expect(res.status).toBe(403);
    expect(env.NOTIFY.gets).toHaveLength(0);
    expect(env.NOTIFY.puts).toHaveLength(0);
    expect(env.MCP_WRITE_RATE_LIMITER.counts.size).toBe(0);
  });

  it("a notification (no id) gets 202 with no body", async () => {
    const res = await post({ jsonrpc: "2.0", method: "notifications/initialized" });
    expect(res.status).toBe(202);
    expect(await res.text()).toBe("");
  });

  it("a JSON-RPC batch returns an array of responses", async () => {
    const res = await post([rpc("ping", {}, 1), rpc("tools/list", {}, 2)]);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);
  });

  it("malformed JSON → 400 parse error", async () => {
    const res = await worker.fetch(
      new Request("https://opchain.dev/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not json",
      }),
      envWith(),
      { waitUntil() {} },
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe(-32700);
  });

  it("GET /mcp → 405 (POST-only transport)", async () => {
    const res = await worker.fetch(
      new Request("https://opchain.dev/mcp", { method: "GET" }),
      envWith(),
      { waitUntil() {} },
    );
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toContain("POST");
  });

  it("OPTIONS /mcp → 204 preflight", async () => {
    const res = await worker.fetch(
      new Request("https://opchain.dev/mcp", { method: "OPTIONS", headers: { Origin: "https://opchain.dev" } }),
      envWith(),
      { waitUntil() {} },
    );
    expect(res.status).toBe(204);
  });

  it("the api-mcp kill switch returns 503", async () => {
    const res = await post(rpc("initialize"), envWith({ FLAG_SITE_OPS_API_MCP_KILL: "true" }));
    expect(res.status).toBe(503);
  });
});
