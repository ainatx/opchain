// plugins/opchain/hooks/lib/jev-client.cjs — the one TypeSafe/Jev transport
// every use shares (docs/plans/2026-10-24-jev-integration-plan.md §2).
//
// The transport, retry and redaction behaviour is pinned in
// tests/route-dispatch.test.js through route-dispatch's re-exports; this file
// covers what is new (ask, the answer readers, apiKeyFrom) and that the
// re-exports are the same functions, so the hook's behaviour cannot drift from
// the client's.
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const c = require("../plugins/opchain/hooks/lib/jev-client.cjs");
const d = require("../plugins/opchain/hooks/lib/route-dispatch.cjs");

describe("jev-client: re-exports", () => {
  it("route-dispatch re-exports the client's transport, redaction and confidence functions unchanged", () => {
    for (const k of ["DEFAULT_ENDPOINT", "DEFAULT_MODEL", "MAX_OPTIONS", "httpTransport", "fixtureTransport", "redactSecrets", "redactDeep", "computeConfidence"]) {
      expect(d[k], k).toBe(c[k]);
    }
    expect(c.DEFAULT_MODEL).toBe("jev-1.13.0");
    expect(c.DEFAULT_ENDPOINT).toBe("https://api.typesafe.ai/v1/systemone");
    expect(c.API_KEY_ENV).toBe("TYPESAFE_API_KEY");
  });
});

describe("jev-client: apiKeyFrom", () => {
  it("reads TYPESAFE_API_KEY, trimmed; null when unset or blank", () => {
    // Always pass an env object: the default is process.env, which may hold a real key.
    expect(c.apiKeyFrom({ TYPESAFE_API_KEY: " k1 " })).toBe("k1");
    expect(c.apiKeyFrom({})).toBeNull();
    expect(c.apiKeyFrom({ TYPESAFE_API_KEY: "   " })).toBeNull();
    expect(c.apiKeyFrom({ TYPESAFE_API_KEY: 7 })).toBeNull();
  });
});

describe("jev-client: ask", () => {
  const NOUL = { type: "noul", instructions: { criterion: "x" }, criteria: { true: "t", false: "f" } };

  it("sends redacted state and the questions, returns answers, usage, model and ms", async () => {
    const sent = [];
    const transport = async (body) => {
      sent.push(body);
      return { answers: { q: { type: "noul", noul: 0.8 } }, usage: { input_tokens: 10, output_tokens: 2 }, model: "jev-1.13.0" };
    };
    const out = await c.ask({ transport, state: { text: "token=abcdefghijkl and plain words" }, questions: { q: NOUL } });
    expect(out.answers.q.noul).toBe(0.8);
    expect(out.usage).toEqual({ input_tokens: 10, output_tokens: 2 });
    expect(out.model).toBe("jev-1.13.0");
    expect(out.ms).toBeGreaterThanOrEqual(0);
    expect(sent).toHaveLength(1);
    expect(sent[0].state.text).toBe("token=[REDACTED] and plain words");
    expect(sent[0].questions).toEqual({ q: NOUL });
    expect(sent[0].model).toBeUndefined();
  });

  it("passes an explicit model through and tolerates a response with no usage", async () => {
    const out = await c.ask({ transport: async (b) => ({ answers: {}, model: b.model }), state: {}, questions: { q: NOUL }, model: "jev-latest" });
    expect(out.model).toBe("jev-latest");
    expect(out.usage).toEqual({ input_tokens: 0, output_tokens: 0 });
    expect(out.answers).toEqual({});
  });

  it("rejects a missing transport, empty questions, an unknown type and a Choice with too few or too many options", async () => {
    await expect(c.ask({ state: {}, questions: { q: NOUL } })).rejects.toThrow(/transport is required/);
    await expect(c.ask({ transport: async () => ({}), state: {}, questions: {} })).rejects.toThrow(/questions is required/);
    await expect(c.ask({ transport: async () => ({}), state: {}, questions: { q: { type: "essay" } } })).rejects.toThrow(/unknown type "essay"/);
    await expect(c.ask({ transport: async () => ({}), state: {}, questions: { q: { type: "choice", criteria: { a: "a" } } } })).rejects.toThrow(/at least two options/);
    const many = Object.fromEntries(Array.from({ length: 256 }, (_, i) => [`k${i}`, "d"]));
    await expect(c.ask({ transport: async () => ({}), state: {}, questions: { q: { type: "choice", criteria: many } } })).rejects.toThrow(/exceeds the 255-option limit/);
  });

  it("lets a transport error through (callers that must never throw catch it themselves)", async () => {
    const t = c.fixtureTransport({ error: "typesafe 529: overloaded" });
    await expect(c.ask({ transport: t, state: {}, questions: { q: NOUL } })).rejects.toThrow(/529/);
  });
});

describe("jev-client: answer readers", () => {
  const answers = {
    yes: { type: "noul", noul: 0.73 },
    over: { type: "noul", noul: 1.7 },
    bad: { type: "noul", noul: "nope" },
    pick: { type: "choice", choice: "b", probabilities: { a: 0.2, b: 0.7, c: 0.1 } },
    conf: { type: "choice", choice: "a", probabilities: { a: 0.9, b: 0.1 }, confidence: 0.42 },
    nochoice: { type: "choice", probabilities: { a: 1 } },
  };

  it("noul() clamps to [0,1] and returns null for a missing or non-numeric answer", () => {
    expect(c.noul(answers, "yes")).toBe(0.73);
    expect(c.noul(answers, "over")).toBe(1);
    expect(c.noul(answers, "bad")).toBeNull();
    expect(c.noul(answers, "missing")).toBeNull();
    expect(c.noul(null, "yes")).toBeNull();
    expect(c.noul(answers, "pick")).toBeNull();
  });

  it("choice() returns the pick, its probability and the API's confidence or the computed one", () => {
    const p = c.choice(answers, "pick");
    expect(p.choice).toBe("b");
    expect(p.probability).toBe(0.7);
    expect(p.probabilities).toEqual({ a: 0.2, b: 0.7, c: 0.1 });
    // (0.7 − 1/3) / (1 − 1/3)
    expect(p.confidence).toBeCloseTo(0.55, 4);
    expect(c.choice(answers, "conf").confidence).toBe(0.42);
    expect(c.choice(answers, "nochoice")).toBeNull();
    expect(c.choice(answers, "yes")).toBeNull();
    expect(c.choice(undefined, "pick")).toBeNull();
  });

  it("usageOf / addUsage total token counts and ignore malformed usage", () => {
    expect(c.usageOf({ usage: { input_tokens: 5, output_tokens: "7" } })).toEqual({ input_tokens: 5, output_tokens: 7 });
    expect(c.usageOf({})).toEqual({ input_tokens: 0, output_tokens: 0 });
    const total = { input_tokens: 1, output_tokens: 1 };
    c.addUsage(total, { usage: { input_tokens: 2, output_tokens: 3 } });
    c.addUsage(total, { usage: { input_tokens: "x" } });
    expect(total).toEqual({ input_tokens: 3, output_tokens: 4 });
  });
});
