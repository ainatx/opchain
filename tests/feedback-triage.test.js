// Jev J5 on /api/feedback's public roadmap path (src/lib/feedback-triage.js).
// A roadmap request becomes a public GitHub issue, so a likely security report
// is filed privately in Linear instead. Off unless the flag is on AND the key
// is set; any Jev failure keeps the form's path. No test reaches the network.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../src/index.js";
import { J5, TRIAGE_FLAG, triageFeedback } from "../src/lib/feedback-triage.js";
import { FLAGS, PUBLIC_FLAG_NAMES } from "../src/lib/flags/registry.js";

const TYPESAFE = "https://api.typesafe.ai/v1/systemone";

function jevAnswer(probabilities) {
  const choice = Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0][0];
  return new Response(JSON.stringify({ answers: { J5: { type: "choice", choice, probabilities } }, usage: { input_tokens: 580, output_tokens: 55 }, model: "jev-1.13.0" }), { status: 200, headers: { "Content-Type": "application/json" } });
}
const SECURITY = { bug: 0, feature: 0, general: 0, improvement: 0, security: 1 };
const FEATURE = { bug: 0, feature: 1, general: 0, improvement: 0, security: 0 };
const PRIVACY_QUESTION = { bug: 0, feature: 0, general: 0.56, improvement: 0, security: 0.44 };

function githubIssueOk() {
  return new Response(JSON.stringify({ number: 42, html_url: "https://github.com/asfbay-bit/opchain-skills/issues/42" }), { status: 201, headers: { "Content-Type": "application/json" } });
}
function linearOk() {
  return new Response(JSON.stringify({ data: { issueCreate: { success: true, issue: { id: "abc", identifier: "OPC-77", url: "https://linear.app/opchain/issue/OPC-77" } } } }), { status: 200, headers: { "Content-Type": "application/json" } });
}

const ON = { FLAG_PLATFORM_SECURITY_FEEDBACK_TRIAGE: "true", TYPESAFE_API_KEY: "ts_test_key" };
function env(overrides = {}) {
  return { LINEAR_API_KEY: "lin_test_key", ROADMAP_GITHUB_TOKEN: "gh_test_token", ASSETS: { async fetch() { return new Response(""); } }, ...overrides };
}
function post(body) {
  return new Request("https://opchain.dev/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
const VOTES_BYPASS = {
  type: "feature",
  category: "feature",
  title: "Roadmap idea: votes",
  description: "Heads up, POST /api/votes/:id accepts the same vote again with a new X-Forwarded-For header.",
};

describe("J5 feedback triage: registry and flag", () => {
  it("uses the registry's J5 question, positive and threshold", () => {
    expect(J5.kind).toBe("choice");
    expect(J5.positive).toBe("security");
    expect(J5.threshold).toBe(0.3);
    expect(Object.keys(J5.question.criteria).sort()).toEqual(["bug", "feature", "general", "improvement", "security"]);
  });

  it("the flag defaults off and never reaches the browser", () => {
    const f = FLAGS[TRIAGE_FLAG];
    expect(f).toMatchObject({ type: "boolean", default: false });
    expect(PUBLIC_FLAG_NAMES).not.toContain(TRIAGE_FLAG);
  });
});

describe("triageFeedback", () => {
  it("calls security at p ≥ 0.3 even when another option is on top, and sends only redacted title + description", async () => {
    const sent = [];
    const transport = async (body) => {
      sent.push(body);
      return { answers: { J5: { type: "choice", choice: "general", probabilities: PRIVACY_QUESTION } }, model: "jev-1.13.0" };
    };
    const t = await triageFeedback({ title: "q", description: "key sk-ant-abcdefghijklmnopqrstuvwxyz123456 leaked" }, { transport });
    expect(t).toEqual({ security: true, choice: "general", pSecurity: 0.44, model: "jev-1.13.0" });
    expect(Object.keys(sent[0].state)).toEqual(["title", "description"]);
    expect(sent[0].state.description).not.toContain("sk-ant-");
    expect(sent[0].questions.J5).toEqual(J5.question);
  });

  it("is not security below the threshold, and throws on an answer with no J5 choice", async () => {
    const low = async () => ({ answers: { J5: { type: "choice", choice: "feature", probabilities: { ...FEATURE, feature: 0.8, security: 0.2 } } } });
    expect((await triageFeedback({ title: "t" }, { transport: low })).security).toBe(false);
    await expect(triageFeedback({ title: "t" }, { transport: async () => ({ answers: {} }) })).rejects.toThrow(/no J5 choice/);
  });
});

describe("POST /api/feedback roadmap path with J5", () => {
  let fetchMock;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());
  const urls = () => fetchMock.mock.calls.map((c) => c[0]);

  it("files a likely security report privately in Linear, not as a public GitHub issue", async () => {
    fetchMock.mockResolvedValueOnce(jevAnswer(SECURITY)).mockResolvedValueOnce(linearOk());
    const res = await worker.fetch(post(VOTES_BYPASS), env(ON));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true, id: "OPC-77", url: null, routed: "security" });
    expect(urls()).toEqual([TYPESAFE, "https://api.linear.app/graphql"]);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer ts_test_key");
    const input = JSON.parse(fetchMock.mock.calls[1][1].body).variables.input;
    expect(input.title).toBe("[SECURITY] Roadmap idea: votes");
    expect(input.description).toContain("## Triage");
    expect(input.description).toContain("Sent through the public roadmap form as `feature` (category `feature`)");
    expect(input.description).toContain("p(security) 1");
    expect(input.description).toContain("X-Forwarded-For");
  });

  it("keeps an ordinary request on the public path", async () => {
    fetchMock.mockResolvedValueOnce(jevAnswer(FEATURE)).mockResolvedValueOnce(githubIssueOk());
    const res = await worker.fetch(post({ ...VOTES_BYPASS, title: "GitLab support", description: "Open merge requests on GitLab too?" }), env(ON));
    expect(res.status).toBe(201);
    expect((await res.json()).url).toBe("https://github.com/asfbay-bit/opchain-skills/issues/42");
    expect(urls()).toEqual([TYPESAFE, "https://api.github.com/repos/asfbay-bit/opchain-skills/issues"]);
  });

  it("falls back to the form's path when Jev fails", async () => {
    fetchMock.mockResolvedValueOnce(new Response("down", { status: 500 })).mockResolvedValueOnce(githubIssueOk());
    const res = await worker.fetch(post(VOTES_BYPASS), env(ON));
    expect(res.status).toBe(201);
    expect(urls()).toEqual([TYPESAFE, "https://api.github.com/repos/asfbay-bit/opchain-skills/issues"]);
  });

  it("makes no Jev call with the flag off or the key unset", async () => {
    for (const e of [env({ TYPESAFE_API_KEY: "ts_test_key" }), env({ FLAG_PLATFORM_SECURITY_FEEDBACK_TRIAGE: "true" })]) {
      fetchMock.mockReset();
      fetchMock.mockResolvedValueOnce(githubIssueOk());
      const res = await worker.fetch(post(VOTES_BYPASS), e);
      expect(res.status).toBe(201);
      expect(urls()).toEqual(["https://api.github.com/repos/asfbay-bit/opchain-skills/issues"]);
    }
  });

  it("on a dry run (staging) reports what J5 would have done and files nothing", async () => {
    fetchMock.mockResolvedValueOnce(jevAnswer(SECURITY));
    const res = await worker.fetch(post(VOTES_BYPASS), env({ ...ON, FEEDBACK_DRY_RUN: "true" }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true, id: "STAGING-DRY-RUN", url: null, dryRun: true, triage: { security: true, choice: "security", p_security: 1, would_file: "linear-security" } });
    expect(urls()).toEqual([TYPESAFE]);
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(jevAnswer(FEATURE));
    expect((await (await worker.fetch(post(VOTES_BYPASS), env({ ...ON, FEEDBACK_DRY_RUN: "true" }))).json()).triage).toMatchObject({ security: false, would_file: "github" });
    // Flag off: the dry run is unchanged and makes no call.
    fetchMock.mockReset();
    const off = await worker.fetch(post(VOTES_BYPASS), env({ FEEDBACK_DRY_RUN: "true" }));
    expect(await off.json()).toEqual({ ok: true, id: "STAGING-DRY-RUN", url: null, dryRun: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never triages the private Linear types", async () => {
    fetchMock.mockResolvedValueOnce(linearOk());
    const res = await worker.fetch(post({ type: "bug", title: "Install link 404s", description: "The zip link 404s." }), env(ON));
    expect(res.status).toBe(201);
    expect(urls()).toEqual(["https://api.linear.app/graphql"]);
  });
});
