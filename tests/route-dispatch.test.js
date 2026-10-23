// plugins/opchain/hooks/lib/route-dispatch.cjs — the router core, driven by a
// fake transport that returns canned TypeSafe answers.
//
// The cases are the ways the router could speak when it should stay quiet
// (gate / fits / top-probability below threshold, transport failure) and the
// one way it must speak: the exact single line the audit measured at 72/72.
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const d = require("../plugins/opchain/hooks/lib/route-dispatch.cjs");
const spec = require("../plugins/opchain/hooks/route-spec.json");

const PROMPT = "commit this and open a PR against main";
const REPO = { branch: "feat/x", ahead: 2, behind: 0, dirty: 3, open_pr: false, enrolled: true, checkpoint: null };

function answers1({ top = "oc-git-ops", choice, acts = 0.9, procedure = 0.8, prose = 0.1 } = {}) {
  return {
    model: "jev-1.13.0",
    usage: { input_tokens: 1000, output_tokens: 12 },
    answers: {
      which: {
        type: "choice",
        choice: choice ?? top,
        probabilities: { [top]: 0.7, "oc-release-ops": 0.15, "oc-deploy-ops": 0.1, none: 0.05 },
        confidence: 0.69,
      },
      acts: { type: "noul", noul: acts },
      procedure: { type: "noul", noul: procedure },
      prose: { type: "noul", noul: prose },
    },
  };
}

function answers2({ skill = "oc-git-ops", top = 0.9, fits = 0.85, verb = "/oc-git-sync", verbP = 0.8 } = {}) {
  const rest = 1 - top;
  return {
    model: "jev-1.13.0",
    usage: { input_tokens: 800, output_tokens: 20 },
    answers: {
      rerank: {
        type: "choice",
        choice: skill,
        probabilities: { [skill]: top, "oc-release-ops": rest * 0.6, "oc-deploy-ops": rest * 0.3, none: rest * 0.1 },
      },
      [`fits::${skill}`]: { type: "noul", noul: fits },
      "fits::oc-release-ops": { type: "noul", noul: 0.2 },
      "fits::oc-deploy-ops": { type: "noul", noul: 0.1 },
      [`verb::${skill}`]: { type: "choice", choice: verb, probabilities: { [verb]: verbP, unspecified: 1 - verbP } },
    },
  };
}

function fakeTransport(r1, r2) {
  const calls = [];
  const fn = async (body) => {
    calls.push(body);
    return structuredClone("which" in body.questions ? r1 : r2);
  };
  fn.calls = calls;
  return fn;
}

const HAPPY_LINE =
  'opchain route (p=0.85): invoke the Skill tool with skill "oc-git-ops" and args "/oc-git-sync". Skip this if the request means something else.';

describe("route(): decisions", () => {
  it("happy path yields exactly one Skill-tool line, p = min(top, fits, gate)", async () => {
    const transport = fakeTransport(answers1(), answers2());
    const { decision, trace } = await d.route({ prompt: PROMPT, repoState: REPO, spec, transport, cache: false });
    expect(decision).toMatchObject({ skill: "oc-git-ops", verb: "/oc-git-sync", args: "/oc-git-sync", fits: 0.85, topProbability: 0.9 });
    // gate = mean(0.9, 0.8, 1 − 0.1) = 0.8667 → p = min(0.9, 0.85, 0.8667) = 0.85
    expect(decision.gate).toBeCloseTo(0.8667, 3);
    expect(decision.p).toBe(0.85);
    expect(d.decisionText(decision)).toBe(HAPPY_LINE);
    expect(transport.calls).toHaveLength(2);
    expect(trace.cached).toBe(false);
    expect(trace.usage).toEqual({ input_tokens: 1800, output_tokens: 32 });
    expect(trace.request1.top3[0]).toEqual(["oc-git-ops", 0.7]);
    expect(trace.request2.fits).toBe(0.85);
    expect(trace.error).toBeNull();
  });

  it("gate below threshold → null, and request 2 is never sent", async () => {
    const transport = fakeTransport(answers1({ acts: 0.2, procedure: 0.3, prose: 0.9 }), answers2());
    const { decision, trace } = await d.route({ prompt: PROMPT, repoState: REPO, spec, transport, cache: false });
    expect(decision).toBeNull();
    expect(transport.calls).toHaveLength(1);
    expect(trace.reason).toMatch(/^gate 0\.20 < 0\.5/);
    expect(trace.request2).toBeNull();
  });

  it("request 1 choosing none → null without a rerank", async () => {
    const transport = fakeTransport(answers1({ choice: "none" }), answers2());
    const { decision, trace } = await d.route({ prompt: PROMPT, repoState: REPO, spec, transport, cache: false });
    expect(decision).toBeNull();
    expect(transport.calls).toHaveLength(1);
    expect(trace.reason).toBe("request 1 chose none");
  });

  it("fits below threshold → null", async () => {
    const transport = fakeTransport(answers1(), answers2({ fits: 0.3 }));
    const { decision, trace } = await d.route({ prompt: PROMPT, repoState: REPO, spec, transport, cache: false });
    expect(decision).toBeNull();
    expect(trace.reason).toMatch(/fits 0\.30 < 0\.6 for oc-git-ops/);
    expect(transport.calls).toHaveLength(2);
  });

  it("tiered bar: a core skill clears at fits 0.65, a long-tail skill needs 0.9", async () => {
    const core = await d.route({ prompt: PROMPT, repoState: REPO, spec, transport: fakeTransport(answers1(), answers2({ fits: 0.65 })), cache: false });
    expect(core.decision).toMatchObject({ skill: "oc-git-ops", fits: 0.65 });
    const tail = (fits) => fakeTransport(
      answers1({ top: "oc-ux-engineer" }),
      answers2({ skill: "oc-ux-engineer", fits, verb: "unspecified" }),
    );
    const weak = await d.route({ prompt: PROMPT, repoState: REPO, spec, transport: tail(0.8), cache: false });
    expect(weak.decision).toBeNull();
    expect(weak.trace.reason).toMatch(/fits 0\.80 < 0\.9 for oc-ux-engineer/);
    const strong = await d.route({ prompt: PROMPT, repoState: REPO, spec, transport: tail(0.93), cache: false });
    expect(strong.decision).toMatchObject({ skill: "oc-ux-engineer" });
  });

  it("an explicit fits threshold overrides both tiers (eval open query, OPCHAIN_ROUTE_FITS)", async () => {
    const open = await d.route({
      prompt: PROMPT, repoState: REPO, spec, cache: false, thresholds: { fits: 0 },
      transport: fakeTransport(answers1({ top: "oc-ux-engineer" }), answers2({ skill: "oc-ux-engineer", fits: 0.2, verb: "unspecified" })),
    });
    expect(open.decision).toMatchObject({ skill: "oc-ux-engineer", fits: 0.2 });
    expect(d.thresholdsFromEnv({ OPCHAIN_ROUTE_FITS: "0.6" }).fits).toBe(0.6);
    expect(d.thresholdsFromEnv({}).fits).toBeNull();
    expect(d.fitsThreshold(d.DEFAULT_THRESHOLDS, "oc-git-ops")).toBe(0.6);
    expect(d.fitsThreshold(d.DEFAULT_THRESHOLDS, "oc-compliance-ops")).toBe(0.9);
  });

  it("a core skill below the 0.6 core bar stays silent (bare assents after a PR turn score ~0.5)", async () => {
    const at = (fits) => d.route({ prompt: "yes", repoState: REPO, spec, cache: false, transport: fakeTransport(answers1(), answers2({ fits })) });
    expect((await at(0.5)).decision).toBeNull();
    expect((await at(0.6)).decision).toMatchObject({ skill: "oc-git-ops", fits: 0.6 });
  });

  it("a prompt that names one skill outright routes deterministically with no model call", async () => {
    const transport = fakeTransport(answers1({ choice: "none" }), answers2());
    const audit = await d.route({ prompt: "Take a step back and run /oc-code-auditor on the ow-skill pack", repoState: REPO, spec, transport, cache: false });
    expect(audit.decision).toMatchObject({ skill: "oc-code-auditor", explicit: true, p: 1 });
    expect(audit.trace).toMatchObject({ usage: { input_tokens: 0, output_tokens: 0 }, request1: null });
    const sync = await d.route({ prompt: "ok /oc-git-sync it", repoState: REPO, spec, transport, cache: false });
    expect(sync.decision).toMatchObject({ skill: "oc-git-ops", verb: "/oc-git-sync", explicit: true });
    const sub = await d.route({ prompt: "please /oc-audit diff the branch", repoState: REPO, spec, transport, cache: false });
    expect(sub.decision).toMatchObject({ skill: "oc-code-auditor", verb: "/oc-audit diff" });
    expect(transport.calls).toHaveLength(0);
    expect(d.decisionText(audit.decision)).toContain('skill "oc-code-auditor"');
  });

  it("explicit mention is ignored when two skills are named, or the name is not a declared command", () => {
    expect(d.explicitMention("run /oc-audit then /oc-deploy staging", spec)).toBeNull();
    expect(d.explicitMention("the /oc-not-a-thing command", spec)).toBeNull();
    expect(d.explicitMention("commit it, no slash command here", spec)).toBeNull();
    expect(d.explicitMention("see docs/oc-git-ops notes", spec)).toBeNull();
  });

  it("a negated, questioned or path-embedded /oc-* mention is not an instruction (B-02)", async () => {
    // The three prompts reproduced in the 2026-10-09 audit, plus close variants.
    for (const p of [
      "do not run /oc-deploy prod yet",
      "what does /oc-deploy do?",
      "path /oc-audit/foo",
      "don't /oc-deploy until the tests pass",
      "never run /oc-commit on main",
      "/oc-deploy not yet",
      "should I run /oc-deploy now?",
      "I think /oc-deploy is broken",
      "see /oc-deploy.md",
    ]) {
      expect(d.explicitMention(p, spec), p).toBeNull();
    }
    // Still instructions: clause start, fillers, imperative verb, sequencing "then".
    expect(d.explicitMention("/oc-deploy staging", spec)).toMatchObject({ skill: "oc-deploy-ops", verb: "/oc-deploy staging" });
    expect(d.explicitMention("run /oc-deploy.", spec)).toMatchObject({ skill: "oc-deploy-ops" });
    expect(d.explicitMention("can you run /oc-audit?", spec)).toMatchObject({ skill: "oc-code-auditor" });
    expect(d.explicitMention("fix the bug then /oc-commit", spec)).toMatchObject({ skill: "oc-git-ops", verb: "/oc-commit" });
    expect(d.explicitMention("run `/oc-audit` on the agent component", spec)).toMatchObject({ skill: "oc-code-auditor" });
    // Falls through to the normal gated route (a model call), never p=1.
    const transport = fakeTransport(answers1({ choice: "none" }), answers2());
    const r = await d.route({ prompt: "do not run /oc-deploy prod yet", repoState: REPO, spec, transport, cache: false });
    expect(r.decision).toBeNull();
    expect(transport.calls.length).toBeGreaterThan(0);
  });

  it("credentials never reach the transport, the cache key, or the cache file", async () => {
    const secrets = [
      "apikey_210834e7fe6be7744a5086cf605e9d88ad90_6badfd08b2535d96b73eca479a74ddeb947b9182c774aaf3c9d2e9dec9ec5d1f",
      "sk-ant-api03-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789",
      "ghp_abcdefghijklmnopqrstuvwxyz0123456789",
      "AKIAIOSFODNN7EXAMPLE",
      "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk",
    ];
    const prompt = `merge it. here is the key ${secrets.join(" and ")} also TYPESAFE_API_KEY=abc12345678def`;
    const dir = mkdtempSync(join(tmpdir(), "oc-route-redact-"));
    try {
      const transport = fakeTransport(answers1(), answers2());
      await d.route({ prompt, repoState: { lastPrompt: `see ${secrets[0]}` }, spec, transport, cache: { dir } });
      const sent = JSON.stringify(transport.calls);
      for (const s of secrets) expect(sent).not.toContain(s.slice(0, 24));
      expect(sent).not.toContain("abc12345678def");
      expect(sent).toContain("merge it");
      const files = readdirSync(dir);
      expect(files.length).toBeGreaterThan(0);
      const { readFileSync } = await import("node:fs");
      for (const f of files) {
        const body = readFileSync(join(dir, f), "utf8");
        for (const s of secrets) expect(body).not.toContain(s.slice(0, 24));
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    expect(d.redactSecrets("a normal sentence about a 40 char sha 0123456789abcdef0123456789abcdef01234567")).toContain("0123456789abcdef0123456789abcdef01234567");
    expect(d.redactSecrets("password: hunter2hunter2")).toBe("password: [REDACTED]");
  });

  it("redaction stays linear on a 240 KB prompt (B-07)", () => {
    // Unbounded name runs around KEY/TOKEN backtracked quadratically: ~9 s here.
    for (const big of ["KEY".repeat(80000), "TOKEN_".repeat(40000), "KEYx".repeat(60000), "a=aaaaaaaa".repeat(24000), `KEY${" ".repeat(240000)}x`, "KEY=abcdefghi ".repeat(18000)]) {
      const t0 = Date.now();
      d.redactSecrets(big);
      expect(Date.now() - t0).toBeLessThan(1000);
    }
    expect(d.redactSecrets("export MY_SERVICE_API_KEY=abcdef123456 ok")).toBe("export MY_SERVICE_API_KEY=[REDACTED] ok");
    // Names of any length still redact (the first B-07 fix capped them at 64 chars a side).
    const longBefore = `${"A".repeat(70)}_API_KEY`;
    expect(d.redactSecrets(`${longBefore}=abcdef123456`)).toBe(`${longBefore}=[REDACTED]`);
    const longAfter = `API_KEY_${"B".repeat(70)}`;
    expect(d.redactSecrets(`${longAfter}=abcdef123456`)).toBe(`${longAfter}=[REDACTED]`);
    // A non-secret assignment does not swallow a secret one glued to it.
    expect(d.redactSecrets("a=1234567890;API_KEY=secretvalue1")).toBe("a=1234567890;API_KEY=[REDACTED]");
    expect(d.redactSecrets('password: "hunter2hunter2"')).toBe('password: "[REDACTED]"');
  });

  it("rerank top probability below minTopProb → null; rerank none → null", async () => {
    const low = await d.route({ prompt: PROMPT, repoState: REPO, spec, transport: fakeTransport(answers1(), answers2({ top: 0.3 })), cache: false });
    expect(low.decision).toBeNull();
    expect(low.trace.reason).toMatch(/rerank top 0\.30 < 0\.35/);
    const none = answers2();
    none.answers.rerank.choice = "none";
    const n = await d.route({ prompt: PROMPT, repoState: REPO, spec, transport: fakeTransport(answers1(), none), cache: false });
    expect(n.decision).toBeNull();
    expect(n.trace.reason).toBe("rerank chose none");
  });

  it("verb unspecified → the skill's base verb", async () => {
    const transport = fakeTransport(answers1(), answers2({ verb: "unspecified", verbP: 0.9 }));
    const { decision } = await d.route({ prompt: PROMPT, repoState: REPO, spec, transport, cache: false });
    expect(decision.args).toBe(spec.skills["oc-git-ops"].baseVerb);
    expect(decision.args).toBe("/oc-git");
    expect(decision.reason).toMatch(/unspecified → base verb/);
  });

  it("verb probability below 0.5 → base verb; undeclared verb → base verb", async () => {
    const weak = await d.route({ prompt: PROMPT, repoState: REPO, spec, transport: fakeTransport(answers1(), answers2({ verbP: 0.4 })), cache: false });
    expect(weak.decision.args).toBe("/oc-git");
    expect(weak.decision.verbProbability).toBe(0.4);
    const bogus = await d.route({ prompt: PROMPT, repoState: REPO, spec, transport: fakeTransport(answers1(), answers2({ verb: "/oc-made-up", verbP: 0.99 })), cache: false });
    expect(bogus.decision.args).toBe("/oc-git");
  });

  it("thresholds: env overrides and eval-style {fits:0, gate:0} both work", async () => {
    expect(d.thresholdsFromEnv({ OPCHAIN_ROUTE_GATE: "0.2", OPCHAIN_ROUTE_FITS: "0.9" })).toMatchObject({ gate: 0.2, fits: 0.9, minTopProb: 0.35 });
    expect(d.thresholdsFromEnv({ OPCHAIN_ROUTE_GATE: "nope" }).gate).toBe(0.5);
    expect(d.thresholdsFromEnv({})).toEqual(d.DEFAULT_THRESHOLDS);
    const strict = await d.route({ prompt: PROMPT, repoState: REPO, spec, transport: fakeTransport(answers1(), answers2()), thresholds: { fits: 0.9 }, cache: false });
    expect(strict.decision).toBeNull();
    const loose = await d.route({ prompt: PROMPT, repoState: REPO, spec, transport: fakeTransport(answers1({ acts: 0.2, procedure: 0.2, prose: 0.9 }), answers2({ fits: 0.1 })), thresholds: { fits: 0, gate: 0 }, cache: false });
    expect(loose.decision).toMatchObject({ skill: "oc-git-ops", fits: 0.1 });
    expect(loose.decision.gate).toBeCloseTo(0.1667, 3);
  });

  it("transport throws → decision null with the error in the trace, never a rejection", async () => {
    const transport = async () => {
      throw new Error("typesafe 401: bad key");
    };
    const { decision, trace } = await d.route({ prompt: PROMPT, repoState: REPO, spec, transport, cache: false });
    expect(decision).toBeNull();
    expect(trace.error).toBe("typesafe 401: bad key");
    expect(trace.ms).toBeGreaterThanOrEqual(0);
  });

  it("malformed responses → null with a reason, not a throw", async () => {
    const empty = await d.route({ prompt: PROMPT, repoState: REPO, spec, transport: async () => ({}), cache: false });
    expect(empty.decision).toBeNull();
    expect(empty.trace.reason).toMatch(/no `which` answer/);
  });
});

describe("route(): conversation context", () => {
  it("context is off by default: both requests carry {request, repo} and no follow-up or conversation rules", async () => {
    const transport = fakeTransport(answers1(), answers2());
    await d.route({ prompt: "merge", repoState: REPO, conversation: { previous_request: "open a PR", assistant_last: "Want me to merge it?" }, spec, transport, cache: false });
    expect(d.DEFAULT_THRESHOLDS.context).toBe(false);
    expect(transport.calls).toHaveLength(2);
    for (const body of transport.calls) {
      expect(Object.keys(body.state)).toEqual(["request", "repo"]);
      const text = JSON.stringify(body);
      const enc = (x) => JSON.stringify(x).slice(1, -1);
      expect(text).not.toContain("Want me to merge it?");
      expect(text).not.toContain(enc(d.CONTEXT_RULES.follow_ups));
      expect(text).not.toContain(enc(d.CONTEXT_RULES.conversation));
      expect(text).not.toContain("`conversation`");
      expect(text).toContain(enc(d.CONTEXT_RULES.repo));
    }
    expect(d.thresholdsFromEnv({ OPCHAIN_ROUTE_CONTEXT: "1" }).context).toBe(true);
    expect(d.thresholdsFromEnv({}).context).toBe(false);
  });

  it("with context on, both requests carry {request, conversation, repo}; conversation is redacted and assistant_last keeps the END", async () => {
    const secret = "ghp_abcdefghijklmnopqrstuvwxyz0123456789";
    const long = `${"Earlier narration about the build. ".repeat(30)}Token ${secret}. CI is green on PR #590 — want me to merge it?`;
    const transport = fakeTransport(answers1(), answers2());
    await d.route({
      prompt: "merge",
      repoState: { ...REPO, open_pr: { number: 590, state: "OPEN" } },
      conversation: { previous_request: `open the PR, key sk-ant-api03-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789`, assistant_last: long },
      spec,
      transport,
      cache: false,
      thresholds: { context: true },
    });
    expect(transport.calls).toHaveLength(2);
    for (const body of transport.calls) {
      expect(Object.keys(body.state)).toEqual(["request", "conversation", "repo"]);
      expect(body.state.request).toBe("merge");
      expect(body.state.repo.open_pr).toEqual({ number: 590, state: "OPEN" });
      const c = body.state.conversation;
      expect(c.previous_request).toBe("open the PR, key [REDACTED]");
      expect(c.assistant_last.length).toBeLessThanOrEqual(d.ASSISTANT_LAST_MAX);
      expect(c.assistant_last.startsWith("…")).toBe(true);
      expect(c.assistant_last.endsWith("want me to merge it?")).toBe(true);
      expect(c.assistant_last).toContain("Token [REDACTED].");
      expect(JSON.stringify(body)).not.toContain(secret.slice(0, 20));
    }
  });

  it("context on, no conversation → both fields null (the shape is always present)", async () => {
    const transport = fakeTransport(answers1(), answers2());
    await d.route({ prompt: PROMPT, repoState: REPO, spec, transport, cache: false, thresholds: { context: true } });
    expect(transport.calls[0].state.conversation).toEqual({ previous_request: null, assistant_last: null });
  });

  it("conversationFromRecords: previous human prompt + every text block of the last assistant message", () => {
    const recs = [
      { type: "user", message: { content: "open a PR for the auth fix" } },
      { type: "assistant", message: { id: "m1", content: [{ type: "text", text: "Opening it." }] } },
      { type: "assistant", message: { id: "m2", content: [{ type: "text", text: "PR #590 is open and CI is green." }] } },
      { type: "assistant", message: { id: "m2", content: [{ type: "tool_use", name: "Bash", input: { command: "gh pr checks" } }] } },
      { type: "user", message: { content: [{ type: "tool_result", content: "ok" }] } },
      { type: "assistant", message: { id: "m2", content: [{ type: "text", text: "Want me to merge it?" }] } },
      { type: "user", isMeta: true, message: { content: "meta noise" } },
      { type: "user", message: { content: "<task-notification>x</task-notification>" } },
      { type: "user", message: { content: "merge" } }, // the current prompt, already written
    ];
    expect(d.conversationFromRecords(recs, "merge")).toEqual({
      previous_request: "open a PR for the auth fix",
      assistant_last: "PR #590 is open and CI is green.\nWant me to merge it?",
    });
    expect(d.conversationFromRecords([], "merge")).toEqual({ previous_request: null, assistant_last: null });
  });

  it("outcomeFromRecords: Skill ids (prefix stripped) and raw command classes after the anchored prompt", () => {
    const first = "commit this and open a PR against main";
    const recs = [
      { type: "user", message: { content: "earlier prompt" } },
      { type: "assistant", message: { content: [{ type: "tool_use", name: "Bash", input: { command: "npm run deploy" } }] } },
      { type: "user", message: { content: first } },
      { type: "assistant", message: { content: [{ type: "tool_use", name: "Skill", input: { skill: "opchain:oc-git-ops", args: "/oc-pr" } }] } },
      { type: "assistant", isSidechain: true, message: { content: [{ type: "tool_use", name: "Bash", input: { command: "wrangler deploy" } }] } },
      { type: "assistant", message: { content: [{ type: "tool_use", name: "Bash", input: { command: "gh pr merge 590 --squash" } }] } },
    ];
    expect(d.outcomeFromRecords(recs, { forPromptHash: d.promptHash(first) })).toEqual({
      anchor: "prompt",
      skill_calls: ["oc-git-ops"],
      raw: { git_commit: false, git_push: false, git_sync: false, gh_pr_create: false, gh_pr_merge: true, deploy: false, merge_handoff: false },
      window_end: "open",
    });
    expect(d.outcomeFromRecords(recs, { forPromptHash: "0000000000000000" })).toBeNull();
    expect(d.rawCommandClasses("git -C repo commit -m x && git push origin HEAD")).toMatchObject({ git_commit: true, git_push: true });
    expect(d.rawCommandClasses("git log --grep commit")).toMatchObject({ git_commit: false });
  });
});

// The outcome scoring the day-8 go/no-go rests on (2026-10-23 rework): which
// records close a prompt's window, and what counts as a skill's work inside it.
describe("outcome windows and activity", () => {
  const T = (min) => new Date(Date.UTC(2026, 9, 21, 12, min)).toISOString();
  const human = (text, min) => ({ type: "user", timestamp: T(min), message: { role: "user", content: text } });
  const bash = (command, min, extra = {}) => ({ type: "assistant", timestamp: T(min), ...extra, message: { content: [{ type: "tool_use", name: "Bash", input: { command } }] } });
  const reply = (text, min, stop = "end_turn") => ({ type: "assistant", timestamp: T(min), message: { stop_reason: stop, content: [{ type: "text", text }] } });

  it("rawCommandClasses counts commands that run, not commands that are mentioned", () => {
    const yes = {
      git_commit: ["git add . && git commit -m x", "git commit -q -F - <<'EOF'\nmsg\nEOF", "cd repo; git -C sub commit -m y"],
      git_push: ["timeout 60 git push -u origin HEAD"],
      git_sync: ["git fetch -q origin && git merge origin/main", "git rebase origin/main"],
      gh_pr_merge: ["cd ~/d && gh pr merge 245 --squash 2>&1 | tail -2", "for i in 1 2; do gh pr merge $i --auto; done"],
      deploy: ["DEFTWRIGHT_PROD_GO=yes npm run deploy", "npm run deploy:staging", "npx wrangler deploy --env staging", "node scripts/deploy.mjs --staging"],
    };
    const no = {
      git_commit: ["git log --grep commit", 'grep -n "git commit" file'],
      git_sync: ["git merge-base HEAD origin/main", "sed -i 's|(git commit/push/merge/rebase|x|' f"],
      gh_pr_merge: ["h=$(gh pr view 1); echo gh pr merge later"],
      deploy: ["sed -n 1,60p scripts/deploy.mjs | grep main"],
    };
    for (const [k, cmds] of Object.entries(yes)) for (const c of cmds) expect(d.rawCommandClasses(c)[k], `${k}: ${c}`).toBe(true);
    for (const [k, cmds] of Object.entries(no)) for (const c of cmds) expect(d.rawCommandClasses(c)[k], `${k}: ${c}`).toBe(false);
  });

  it("isHumanTurn: typed prompts, slash commands and reminder-prefixed desktop prompts; not envelopes or tool results", () => {
    expect(d.isHumanTurn(human("merge 252", 0))).toBe(true);
    expect(d.isHumanTurn(human("<command-name>/oc-deploy</command-name>", 0))).toBe(true);
    const desktop = { type: "user", message: { content: [{ type: "text", text: "<system-reminder>\nworktree\n</system-reminder>" }, { type: "text", text: "Merge the release record PR #254." }] } };
    expect(d.isHumanTurn(desktop)).toBe(true);
    expect(d.isHumanTurn(human("<task-notification>\n<task-id>x</task-id>", 0))).toBe(false);
    expect(d.isHumanTurn(human("<bash-input>gh pr merge 244 --auto</bash-input>", 0))).toBe(false);
    expect(d.isHumanTurn({ type: "user", message: { content: [{ type: "text", text: "<system-reminder>only</system-reminder>" }] } })).toBe(false);
    expect(d.isHumanTurn({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: "t", content: "Yes, merge it" }] } })).toBe(false);
  });

  it("a window closes at the end of the reply turn, the next human turn, or the horizon", () => {
    const p = "merge 252";
    const hash = d.promptHash(p);
    // Reply turn ends at 1; the agent works again after a task notification at 5.
    const turn = [human(p, 0), bash("gh pr view 252", 0), reply("Armed auto-merge.", 1), human("<task-notification>done</task-notification>", 5), bash("git commit -m later", 6)];
    expect(d.outcomeWindow(turn, { forPromptHash: hash })).toMatchObject({ start: 1, end: 3, endReason: "turn_end", anchor: "prompt" });
    expect(d.outcomeFromRecords(turn, { forPromptHash: hash }).raw.git_commit).toBe(false);
    // Without the turn boundary the later commit would count.
    expect(d.outcomeWindow(turn, { forPromptHash: hash, endAtTurn: false })).toMatchObject({ endReason: "open", end: 5 });
    // A queued follow-up closes it mid-turn.
    const queued = [human(p, 0), bash("git fetch", 0, { message: { stop_reason: "tool_use", content: [{ type: "tool_use", name: "Bash", input: { command: "git fetch" } }] } }), human("Run the staging command too", 1), bash("npm run deploy:staging", 2)];
    expect(d.outcomeWindow(queued, { forPromptHash: hash })).toMatchObject({ end: 2, endReason: "next_prompt" });
    expect(d.outcomeFromRecords(queued, { forPromptHash: hash }).raw.deploy).toBe(false);
    // An autonomous stretch with no turn end is cut at the horizon.
    const long = [human(p, 0), bash("git status", 10), bash("git commit -m x", 45)];
    expect(d.outcomeWindow(long, { forPromptHash: hash })).toMatchObject({ end: 2, endReason: "horizon" });
    expect(d.outcomeWindow(long, { forPromptHash: hash, windowMs: 0 })).toMatchObject({ endReason: "open" });
  });

  it("`before` anchors a repeated prompt on the copy that was routed", () => {
    const p = "ask me questions using AskUserQuestion tool";
    const recs = [human(p, 0), reply("Asked.", 1), human("ok", 10), reply("Done.", 11), human(p, 20), reply("Asked again.", 21)];
    expect(d.outcomeWindow(recs, { forPromptHash: d.promptHash(p) })).toMatchObject({ start: 5 });
    expect(d.outcomeWindow(recs, { forPromptHash: d.promptHash(p), before: T(1) })).toMatchObject({ start: 1, startAt: T(0) });
  });

  it("addRecordActivity: MCP auto-merge, a handed-over merge command, `!` bash input; sidechains only on request", () => {
    const acc = { skill_calls: [], raw: d.emptyRaw() };
    d.addRecordActivity(acc, { type: "assistant", message: { content: [{ type: "tool_use", name: "mcp__ccd_pr__set_auto_merge", input: {} }] } });
    expect(acc.raw.gh_pr_merge).toBe(true);
    d.addRecordActivity(acc, { type: "assistant", message: { content: [{ type: "text", text: "Run `gh pr merge 643 --squash --auto` when CI is green." }] } });
    expect(acc.raw.merge_handoff).toBe(true);
    d.addRecordActivity(acc, { type: "user", message: { content: "<bash-input>DEFTWRIGHT_PROD_GO=yes npm run deploy</bash-input><bash-stdout>ok</bash-stdout>" } });
    expect(acc.raw.deploy).toBe(true);
    const side = { type: "assistant", isSidechain: true, message: { content: [{ type: "tool_use", name: "Skill", input: { skill: "opchain:oc-code-auditor" } }] } };
    d.addRecordActivity(acc, side);
    expect(acc.skill_calls).toEqual([]);
    d.addRecordActivity(acc, side, { includeSidechain: true });
    expect(acc.skill_calls).toEqual(["oc-code-auditor"]);
    // Prose that names a merge without a command in backticks is not a handoff.
    const prose = { skill_calls: [], raw: d.emptyRaw() };
    d.addRecordActivity(prose, { type: "assistant", message: { content: [{ type: "text", text: "I'll gh pr merge it once CI passes." }] } });
    expect(prose.raw.merge_handoff).toBe(false);
  });
});

describe("route(): evidence-gated suggestions (spec.suggestAllow)", () => {
  const tail = (skill, fits = 0.95) => fakeTransport(answers1({ top: skill }), answers2({ skill, fits, verb: "unspecified" }));

  it("the tracked spec carries an allowlist that includes the seven core skills", () => {
    expect(Array.isArray(spec.suggestAllow)).toBe(true);
    for (const id of d.CORE_SKILLS) expect(spec.suggestAllow).toContain(id);
    expect(spec.suggestAllow).not.toContain("oc-compliance-ops");
  });

  it("a winner outside the allowlist yields no decision with the reason, even above every threshold", async () => {
    const r = await d.route({ prompt: "map our controls to SOC2 evidence", repoState: REPO, spec, transport: tail("oc-compliance-ops"), cache: false });
    expect(r.decision).toBeNull();
    expect(r.trace.reason).toBe("skill oc-compliance-ops not in suggest allowlist (no labelled evidence)");
    expect(r.trace.suppressed).toBe("oc-compliance-ops");
    // It was still an option in request 1 (absorbing probability, not misrouting).
    const req1 = d.buildRequest1(spec, { request: "x", conversation: null, repo: {} });
    expect(Object.keys(req1.questions.which.criteria)).toContain("oc-compliance-ops");
  });

  it("an explicit mention bypasses the allowlist (the user named it)", async () => {
    const t = tail("oc-compliance-ops");
    const r = await d.route({ prompt: "run /oc-comply gaps for the SOC2 audit", repoState: REPO, spec, transport: t, cache: false });
    expect(r.decision).toMatchObject({ skill: "oc-compliance-ops", verb: "/oc-comply gaps", explicit: true });
    expect(t.calls).toHaveLength(0);
  });

  it("OPCHAIN_ROUTE_SUGGEST_ALL=1 restores the suppressed winner", async () => {
    const T = d.thresholdsFromEnv({ OPCHAIN_ROUTE_SUGGEST_ALL: "1" });
    expect(T.suggestAll).toBe(true);
    expect(d.thresholdsFromEnv({}).suggestAll).toBe(false);
    const r = await d.route({ prompt: "map our controls to SOC2 evidence", repoState: REPO, spec, transport: tail("oc-compliance-ops"), thresholds: T, cache: false });
    expect(r.decision).toMatchObject({ skill: "oc-compliance-ops" });
    expect(r.trace.suppressed).toBeNull();
  });

  it("a listed long-tail skill still routes; a spec without suggestAllow gates nothing", async () => {
    const listed = await d.route({ prompt: PROMPT, repoState: REPO, spec, transport: tail("oc-ux-engineer"), cache: false });
    expect(listed.decision).toMatchObject({ skill: "oc-ux-engineer" });
    const { suggestAllow: _drop, ...ungated } = spec;
    const open = await d.route({ prompt: PROMPT, repoState: REPO, spec: ungated, transport: tail("oc-compliance-ops"), cache: false });
    expect(open.decision).toMatchObject({ skill: "oc-compliance-ops" });
  });
});

describe("route(): cache", () => {
  it("a second identical call is served from the file cache without touching the transport", async () => {
    const dir = mkdtempSync(join(tmpdir(), "oc-route-cache-"));
    try {
      const first = await d.route({ prompt: PROMPT, repoState: REPO, spec, transport: fakeTransport(answers1(), answers2()), cache: { dir } });
      expect(first.trace.cached).toBe(false);
      expect(readdirSync(dir)).toHaveLength(1);
      const silentTransport = fakeTransport(answers1(), answers2());
      const second = await d.route({ prompt: PROMPT, repoState: REPO, spec, transport: silentTransport, cache: { dir } });
      expect(silentTransport.calls).toHaveLength(0);
      expect(second.trace.cached).toBe(true);
      expect(d.decisionText(second.decision)).toBe(HAPPY_LINE);
      // Different repo state → different key → transport consulted again.
      const other = fakeTransport(answers1(), answers2());
      await d.route({ prompt: PROMPT, repoState: { ...REPO, branch: "main" }, spec, transport: other, cache: { dir } });
      expect(other.calls).toHaveLength(2);
      // Expired entries are ignored.
      const expired = fakeTransport(answers1(), answers2());
      await d.route({ prompt: PROMPT, repoState: REPO, spec, transport: expired, cache: { dir, ttlMs: -1 } });
      expect(expired.calls).toHaveLength(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("accepts a caller-provided get/set store (the eval's FileCache)", async () => {
    const map = new Map();
    const store = { get: (k) => map.get(k), set: (k, v) => map.set(k, v) };
    await d.route({ prompt: PROMPT, repoState: REPO, spec, transport: fakeTransport(answers1(), answers2()), cache: store });
    expect(map.size).toBe(1);
    const t = fakeTransport(answers1(), answers2());
    const hit = await d.route({ prompt: PROMPT, repoState: REPO, spec, transport: t, cache: store });
    expect(t.calls).toHaveLength(0);
    expect(hit.trace.cached).toBe(true);
  });

  it("cache key covers prompt, repo state, conversation, spec version and the suggest gate", () => {
    const a = d.cacheKey("p", { x: 1 }, { version: "v1" });
    expect(d.cacheKey("p", { x: 1 }, { version: "v1" })).toBe(a);
    expect(d.cacheKey("q", { x: 1 }, { version: "v1" })).not.toBe(a);
    expect(d.cacheKey("p", { x: 2 }, { version: "v1" })).not.toBe(a);
    expect(d.cacheKey("p", { x: 1 }, { version: "v2" })).not.toBe(a);
    const conv = { previous_request: "open the PR", assistant_last: "PR #590 is green. Merge it?" };
    const withConv = d.cacheKey("p", { x: 1 }, { version: "v1" }, conv);
    expect(withConv).not.toBe(a);
    expect(d.cacheKey("p", { x: 1 }, { version: "v1" }, { ...conv, assistant_last: "Deploy to production?" })).not.toBe(withConv);
    // The allowlist lives in overrides and does not bump spec.version, so it is keyed separately.
    expect(d.cacheKey("p", { x: 1 }, { version: "v1", suggestAllow: ["oc-git-ops"] })).not.toBe(a);
    expect(d.cacheKey("p", { x: 1 }, { version: "v1" }, null, { suggestAll: true })).not.toBe(a);
    // B-08: effective thresholds are part of the key; the defaults key like no thresholds.
    expect(d.cacheKey("p", { x: 1 }, { version: "v1" }, null, { thresholds: d.DEFAULT_THRESHOLDS })).toBe(a);
    expect(d.cacheKey("p", { x: 1 }, { version: "v1" }, null, { thresholds: { fits: 0.3 } })).not.toBe(a);
    expect(d.cacheKey("p", { x: 1 }, { version: "v1" }, null, { thresholds: { gate: 0.7 } })).not.toBe(a);
    expect(d.cacheKey("p", { x: 1 }, { version: "v1" }, null, { thresholds: { coreFits: 0.4 } })).not.toBe(a);
  });

  it("a decision cached under one fits override is not served under another (B-08)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "oc-route-cache-thr-"));
    try {
      const t1 = fakeTransport(answers1(), answers2({ fits: 0.5 }));
      const loose = await d.route({ prompt: PROMPT, repoState: REPO, spec, transport: t1, cache: { dir }, thresholds: { fits: 0.3 } });
      expect(loose.decision).not.toBeNull();
      const t2 = fakeTransport(answers1(), answers2({ fits: 0.5 }));
      const shipped = await d.route({ prompt: PROMPT, repoState: REPO, spec, transport: t2, cache: { dir } });
      expect(t2.calls.length).toBeGreaterThan(0);
      expect(shipped.trace.cached).toBe(false);
      expect(shipped.decision).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("the same short prompt with a different conversation is a cache miss", async () => {
    const dir = mkdtempSync(join(tmpdir(), "oc-route-cache-conv-"));
    try {
      const conv = (assistant_last) => ({ previous_request: "open a PR for this", assistant_last });
      const t1 = fakeTransport(answers1(), answers2());
      const on = { context: true };
      await d.route({ prompt: "merge", repoState: REPO, conversation: conv("PR #590 is green. Want me to merge it?"), spec, transport: t1, cache: { dir }, thresholds: on });
      const t2 = fakeTransport(answers1(), answers2());
      await d.route({ prompt: "merge", repoState: REPO, conversation: conv("PR #590 is green. Want me to merge it?"), spec, transport: t2, cache: { dir }, thresholds: on });
      expect(t2.calls).toHaveLength(0);
      const t3 = fakeTransport(answers1(), answers2());
      await d.route({ prompt: "merge", repoState: REPO, conversation: conv("Staging looks good. Promote to production?"), spec, transport: t3, cache: { dir }, thresholds: on });
      expect(t3.calls).toHaveLength(2);
      // Context off is a different request shape: never served from a context-on entry.
      const t4 = fakeTransport(answers1(), answers2());
      await d.route({ prompt: "merge", repoState: REPO, conversation: conv("PR #590 is green. Want me to merge it?"), spec, transport: t4, cache: { dir } });
      expect(t4.calls).toHaveLength(2);
      // …and off, the conversation is not part of the key.
      const t5 = fakeTransport(answers1(), answers2());
      await d.route({ prompt: "merge", repoState: REPO, conversation: conv("Something else entirely."), spec, transport: t5, cache: { dir } });
      expect(t5.calls).toHaveLength(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("request bodies", () => {
  // Context-on shape (OPCHAIN_ROUTE_CONTEXT=1); the default shape is tested below.
  const state = { request: PROMPT, conversation: { previous_request: null, assistant_last: null }, repo: REPO };

  it("without `conversation` in the state (the default), only the repo rule is sent", () => {
    const plain = { request: PROMPT, repo: REPO };
    const r1 = d.buildRequest1(spec, plain);
    expect(Object.keys(r1.questions.which.instructions)).toEqual(["task", "repo"]);
    expect(r1.questions.which.instructions.task).not.toContain("`conversation`");
    for (const g of ["acts", "procedure", "prose"]) expect(Object.keys(r1.questions[g].instructions)).toEqual(["criterion"]);
    const r2 = d.buildRequest2(spec, plain, ["oc-git-ops"]);
    expect(Object.keys(r2.questions.rerank.instructions)).toEqual(["task", "repo"]);
    expect(r2.questions.rerank.instructions.task).not.toContain("`conversation`");
    expect(Object.keys(r2.questions["fits::oc-git-ops"].instructions)).toEqual(["question", "skill", "repo"]);
    expect(Object.keys(r2.questions["verb::oc-git-ops"].instructions)).toEqual(["question", "options"]);
  });

  it("request 1: one Choice over every routable skill (≤255, with none) plus the three Noul gates", () => {
    const req = d.buildRequest1(spec, state);
    expect(req.state).toBe(state);
    const keys = Object.keys(req.questions.which.criteria);
    expect(keys.length).toBeLessThanOrEqual(255);
    expect(keys).toContain("none");
    expect(keys).toContain("oc-git-ops");
    expect(keys).not.toContain("oc-checkpoint-protocol"); // no verbs → not routable
    for (const k of keys) if (k !== "none") expect(req.questions.which.criteria[k]).toBe(spec.skills[k].index);
    for (const g of ["acts", "procedure", "prose"]) {
      expect(req.questions[g].type).toBe("noul");
      expect(req.questions[g].instructions.criterion).toBe(spec.gates[g]);
      expect(req.questions[g].instructions.follow_ups).toBe(d.CONTEXT_RULES.follow_ups);
    }
    expect(Object.keys(req.questions)).toEqual(["which", "acts", "procedure", "prose"]);
    // Instructions are named-field objects that teach the model to read the context.
    const which = req.questions.which.instructions;
    expect(Object.keys(which)).toEqual(["task", "follow_ups", "conversation", "repo"]);
    expect(which.follow_ups).toMatch(/"merge", "yes", "go", "do it" or "ship it"/);
    expect(which.follow_ups).toContain("`conversation.assistant_last`");
    expect(which.repo).toMatch(/`repo\.open_pr` set .* a bare "merge" is a PR merge/);
    expect(which.repo).toMatch(/`repo\.dirty` counts uncommitted files and `repo\.ahead`/);
  });

  it("request 2: rerank with full+notFor text, per-candidate fits:: Noul and speculative verb:: Choice", () => {
    const shortlist = ["oc-git-ops", "oc-release-ops", "oc-deploy-ops"];
    const req = d.buildRequest2(spec, state, shortlist);
    expect(Object.keys(req.questions.rerank.criteria)).toEqual([...shortlist, "none"]);
    expect(req.questions.rerank.criteria["oc-git-ops"]).toContain(spec.skills["oc-git-ops"].full);
    expect(req.questions.rerank.criteria["oc-git-ops"]).toContain(spec.skills["oc-git-ops"].notFor);
    for (const id of shortlist) {
      expect(req.questions[`fits::${id}`].type).toBe("noul");
      const verbQ = req.questions[`verb::${id}`];
      expect(verbQ.type).toBe("choice");
      const opts = Object.keys(verbQ.criteria);
      expect(opts).toContain("unspecified");
      expect(opts.length).toBeLessThanOrEqual(255);
      for (const v of Object.keys(spec.skills[id].verbs)) expect(opts).toContain(v);
      expect(verbQ.instructions.question).toBe(spec.skills[id].verbQuestion);
      expect(verbQ.instructions.follow_ups).toBe(d.CONTEXT_RULES.follow_ups);
      const fitsQ = req.questions[`fits::${id}`].instructions;
      expect(fitsQ.question).toContain(`(${id}) owns`);
      expect(fitsQ.skill).toContain(spec.skills[id].full);
      expect(fitsQ.follow_ups).toBe(d.CONTEXT_RULES.follow_ups);
      expect(fitsQ.repo).toBe(d.CONTEXT_RULES.repo);
    }
    expect(req.questions.rerank.instructions).toMatchObject({ follow_ups: d.CONTEXT_RULES.follow_ups, repo: d.CONTEXT_RULES.repo });
    expect(Object.keys(req.questions)).toHaveLength(1 + shortlist.length * 2);
  });

  it("every skill's verb Choice fits the option budget", () => {
    for (const id of Object.keys(spec.skills)) {
      if (!spec.skills[id].baseVerb) continue;
      const req = d.buildRequest2(spec, state, [id]);
      expect(Object.keys(req.questions[`verb::${id}`].criteria).length).toBeLessThanOrEqual(255);
    }
  });

  it("shortlist is the top-3 non-none skills by request-1 probability", () => {
    expect(d.shortlistFrom(answers1().answers, spec)).toEqual(["oc-git-ops", "oc-release-ops", "oc-deploy-ops"]);
    const probs = { none: 0.9, "oc-git-ops": 0.1 };
    expect(d.shortlistFrom({ which: { choice: "none", probabilities: probs } }, spec)).toEqual(["oc-git-ops"]);
  });
});

describe("math", () => {
  it("confidence = (pmax − 1/n)/(1 − 1/n)", () => {
    expect(d.computeConfidence({ a: 1, b: 0 })).toBe(1);
    expect(d.computeConfidence({ a: 0.5, b: 0.5 })).toBe(0);
    expect(d.computeConfidence({ a: 0.7, b: 0.2, c: 0.1 })).toBeCloseTo((0.7 - 1 / 3) / (1 - 1 / 3), 6);
  });

  it("gate is the mean of acts, procedure and inverted prose; missing parts are skipped", () => {
    expect(d.gateScore(answers1().answers)).toBeCloseTo(0.8667, 3);
    expect(d.gateScore({ acts: { noul: 1 } })).toBe(1);
    expect(d.gateScore({})).toBeNull();
  });

  it("decide() is evaluate().decision", () => {
    expect(d.decide(spec, answers1().answers, answers2().answers)).toMatchObject({ skill: "oc-git-ops" });
    expect(d.decide(spec, answers1({ choice: "none" }).answers, answers2().answers)).toBeNull();
  });
});

describe("httpTransport", () => {
  function fakeFetch(responses) {
    const calls = [];
    const fn = async (url, init) => {
      calls.push({ url, init });
      const next = responses.shift();
      return {
        ok: next.status >= 200 && next.status < 300,
        status: next.status,
        json: async () => next.body,
        text: async () => JSON.stringify(next.body ?? ""),
      };
    };
    fn.calls = calls;
    return fn;
  }

  it("posts bearer auth + pinned model, and retries once on 429", async () => {
    const fetchImpl = fakeFetch([{ status: 429, body: { error: "slow down" } }, { status: 200, body: answers1() }]);
    const t = d.httpTransport({ apiKey: "sk-test", fetchImpl, retryDelayMs: 1 });
    const res = await t(d.buildRequest1(spec, { request: PROMPT, repo: REPO }));
    expect(res.answers.which.choice).toBe("oc-git-ops");
    expect(fetchImpl.calls).toHaveLength(2);
    const { url, init } = fetchImpl.calls[0];
    expect(url).toBe(d.DEFAULT_ENDPOINT);
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer sk-test");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body).model).toBe("jev-1.13.0");
  });

  it("retries once on 529 and then throws; throws immediately on 401 without leaking the key", async () => {
    const twice = d.httpTransport({ apiKey: "sk-secret", fetchImpl: fakeFetch([{ status: 529 }, { status: 529 }]), retryDelayMs: 1 });
    await expect(twice({ questions: {} })).rejects.toThrow(/typesafe 529/);
    const unauth = fakeFetch([{ status: 401, body: { error: "unauthorized" } }]);
    const t = d.httpTransport({ apiKey: "sk-secret", fetchImpl: unauth, retryDelayMs: 1 });
    await expect(t({ questions: {} })).rejects.toThrow(/typesafe 401/);
    expect(unauth.calls).toHaveLength(1);
    try {
      await t({ questions: {} });
    } catch (err) {
      expect(String(err.message)).not.toContain("sk-secret");
    }
  });

  it("requires an api key", () => {
    expect(() => d.httpTransport({})).toThrow(/apiKey/);
  });

  it("times out via AbortController", async () => {
    const fetchImpl = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
      });
    const t = d.httpTransport({ apiKey: "k", fetchImpl, timeoutMs: 5 });
    await expect(t({ questions: {} })).rejects.toThrow(/timeout after 5ms/);
  });
});

describe("fixtureTransport", () => {
  it("selects request1/request2 by the presence of `which`, and can simulate an error", async () => {
    const t = d.fixtureTransport({ request1: answers1(), request2: answers2() });
    expect((await t({ questions: { which: {} } })).answers.which).toBeDefined();
    expect((await t({ questions: { rerank: {} } })).answers.rerank).toBeDefined();
    const bad = d.fixtureTransport({ error: "boom" });
    await expect(bad({ questions: {} })).rejects.toThrow("boom");
  });
});
