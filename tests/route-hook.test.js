// plugins/opchain/hooks/route-prompt.cjs — the UserPromptSubmit hook, spawned
// as Claude Code would spawn it, with a canned transport (never the network).
//
// Same discipline as test-suggestion.cjs: SILENT and CRASHED both produce
// empty stdout, so every silence case also asserts exit 0, and the speaking
// case asserts the exact JSON envelope the hooks contract accepts.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync, appendFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const HOOK = join(ROOT, "plugins", "opchain", "hooks", "route-prompt.cjs");
const LINE_RE = /^opchain route \(p=0\.\d\d\): invoke the Skill tool with skill "oc-git-ops" and args "\/oc-git-sync" \(Full workflow: branch \(from convention\) → commit → push → PR\)\. Skip this if the request means something else\.$/;
const REMINDER = "<system-reminder>\nThe user can follow this conversation from another device.\n</system-reminder>";

let scratch;
let fixture;
let gateFailFixture;
let errorFixture;
let repo;
let plainDir;
let seq = 0;

function git(args, cwd) {
  return spawnSync("git", args, { cwd, encoding: "utf8" });
}

function mkRepo({ opchain = true } = {}) {
  const dir = mkdtempSync(join(scratch, "repo-"));
  git(["init", "-q", "-b", "main"], dir);
  git(["config", "user.email", "t@t"], dir);
  git(["config", "user.name", "t"], dir);
  writeFileSync(join(dir, "README.md"), "x\n");
  git(["add", "-A"], dir);
  git(["-c", "core.hooksPath=/dev/null", "commit", "-qm", "init"], dir);
  if (opchain) {
    mkdirSync(join(dir, ".checkpoints"));
    writeFileSync(
      join(dir, ".checkpoints", "oc-app-architect.checkpoint.json"),
      JSON.stringify({ skill: "oc-app-architect", status: "in_progress", phase: "build", updated_at: "2026-10-01T00:00:00Z", next_actions: ["Finish sprint 3 then commit"] }),
    );
    writeFileSync(
      join(dir, ".checkpoints", "oc-code-auditor.checkpoint.json"),
      JSON.stringify({ skill: "oc-code-auditor", status: "complete", updated_at: "2026-10-05T00:00:00Z", next_actions: ["ignored: complete"] }),
    );
  }
  return dir;
}

function answers() {
  return {
    request1: {
      model: "jev-1.13.0",
      usage: { input_tokens: 900, output_tokens: 10 },
      answers: {
        which: { type: "choice", choice: "oc-git-ops", probabilities: { "oc-git-ops": 0.7, "oc-release-ops": 0.2, "oc-deploy-ops": 0.05, none: 0.05 } },
        acts: { type: "noul", noul: 0.9 },
        procedure: { type: "noul", noul: 0.8 },
        prose: { type: "noul", noul: 0.1 },
      },
    },
    request2: {
      model: "jev-1.13.0",
      usage: { input_tokens: 700, output_tokens: 10 },
      answers: {
        rerank: { type: "choice", choice: "oc-git-ops", probabilities: { "oc-git-ops": 0.9, "oc-release-ops": 0.06, "oc-deploy-ops": 0.03, none: 0.01 } },
        "fits::oc-git-ops": { type: "noul", noul: 0.88 },
        "fits::oc-release-ops": { type: "noul", noul: 0.2 },
        "fits::oc-deploy-ops": { type: "noul", noul: 0.1 },
        "verb::oc-git-ops": { type: "choice", choice: "/oc-git-sync", probabilities: { "/oc-git-sync": 0.8, "/oc-commit": 0.15, unspecified: 0.05 } },
      },
    },
  };
}

function transcript(dir, prevPrompt) {
  const file = join(dir, "transcript.jsonl");
  writeFileSync(
    file,
    [
      JSON.stringify({ type: "user", message: { role: "user", content: prevPrompt } }),
      JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "ok" }] } }),
      JSON.stringify({ type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "x", content: "done" }] } }),
    ].join("\n") + "\n",
  );
  return file;
}

/** Spawn the hook. `env` overrides; `dropKey` removes TYPESAFE_API_KEY. */
function run({ prompt, cwd = repo, env = {}, dropKey = false, transcript_path, logFile, cacheDir, sessionId } = {}) {
  seq += 1;
  const log = logFile ?? join(scratch, `log-${seq}.jsonl`);
  const cache = cacheDir ?? join(scratch, `cache-${seq}`);
  const childEnv = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    TMPDIR: scratch,
    TYPESAFE_API_KEY: "test-key-do-not-log",
    OPCHAIN_ROUTE_TRANSPORT_FIXTURE: fixture,
    OPCHAIN_ROUTE_LOG: log,
    OPCHAIN_ROUTE_CACHE_DIR: cache,
    // Shadow mode normally hands off to a detached child; inline here so the log
    // is complete when spawnSync returns (the detached path has its own test).
    OPCHAIN_ROUTE_SYNC: "1",
    ...env,
  };
  if (dropKey) delete childEnv.TYPESAFE_API_KEY;
  const payload = JSON.stringify({ session_id: sessionId ?? `s-${seq}`, cwd, prompt, transcript_path, hook_event_name: "UserPromptSubmit" });
  const r = spawnSync(process.execPath, [HOOK], { input: payload, encoding: "utf8", env: childEnv, timeout: 20_000 });
  const logLines = existsSync(log) ? readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  return { ...r, log, logLines, cache };
}

beforeAll(() => {
  scratch = mkdtempSync(join(tmpdir(), "oc-route-hook-"));
  fixture = join(scratch, "fixture.json");
  writeFileSync(fixture, JSON.stringify(answers()));
  const gf = answers();
  gf.request1.answers.acts.noul = 0.1;
  gf.request1.answers.procedure.noul = 0.1;
  gf.request1.answers.prose.noul = 0.95;
  gateFailFixture = join(scratch, "gate-fail.json");
  writeFileSync(gateFailFixture, JSON.stringify(gf));
  errorFixture = join(scratch, "error.json");
  writeFileSync(errorFixture, JSON.stringify({ error: "typesafe 529: overloaded" }));
  repo = mkRepo();
  plainDir = mkdtempSync(join(scratch, "plain-"));
});

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe("route-prompt hook: speaking", () => {
  it("OPCHAIN_ROUTE_MODE=live emits the UserPromptSubmit additionalContext envelope with exactly one Skill-tool line, and logs the attempt", () => {
    const tp = transcript(repo, "earlier: please refactor the auth module");
    const r = run({ prompt: "commit this and open a PR against main", transcript_path: tp, env: { OPCHAIN_ROUTE_MODE: "live", OPCHAIN_ROUTE_CONTEXT: "1" } });
    expect(r.status, r.stderr).toBe(0);
    expect(r.stderr).toBe("");
    const out = JSON.parse(r.stdout);
    expect(Object.keys(out)).toEqual(["hookSpecificOutput"]);
    expect(out.hookSpecificOutput.hookEventName).toBe("UserPromptSubmit");
    expect(out.hookSpecificOutput.additionalContext).toMatch(LINE_RE);
    expect(out.hookSpecificOutput.additionalContext.split("\n")).toHaveLength(1);

    expect(r.logLines).toHaveLength(1);
    const rec = r.logLines[0];
    expect(rec.session_id).toBe(`s-${seq}`);
    expect(rec.prompt_hash).toMatch(/^[0-9a-f]{16}$/);
    expect(rec.prompt_head).toBe("commit this and open a PR against main");
    expect(rec.decision).toMatchObject({ skill: "oc-git-ops", args: "/oc-git-sync" });
    expect(rec).toMatchObject({ mode: "live", injected: true });
    expect(rec.trace).toMatchObject({ cached: false, error: null, suppressed: null });
    expect(rec.trace.top3[0][0]).toBe("oc-git-ops");
    expect(rec.trace.gate).toBeCloseTo(0.8667, 3);
    expect(rec.trace.fits).toBe(0.88);
    expect(rec.trace.usage).toEqual({ input_tokens: 1600, output_tokens: 20 });
    // Repo state was gathered.
    expect(rec.repoState.branch).toBe("main");
    expect(rec.repoState.dirty).toBeGreaterThanOrEqual(1); // untracked .checkpoints/ + transcript
    expect(rec.repoState.enrolled).toBe(false);
    // A non-core checkpoint from weeks ago is a standing condition, not context.
    expect(rec.repoState.checkpoint).toBeNull();
    expect(rec).toMatchObject({ repo: expect.any(String), cwd: repo, envelope: null, brief: false, prompt_raw_head: null, arm: null });
    expect(rec.line).toBe(out.hookSpecificOutput.additionalContext);
    // The previous prompt moved from repoState.last_prompt to conversation.
    expect(rec.repoState.last_prompt).toBeUndefined();
    expect(rec.conversation).toEqual({ previous_request: "earlier: please refactor the auth module", assistant_last: "ok" });
    // The key never reaches the log.
    expect(readFileSync(r.log, "utf8")).not.toContain("test-key-do-not-log");
  });

  it("serves a repeated prompt from the cache (logged as cached, no transport)", () => {
    const cacheDir = join(scratch, "shared-cache");
    const a = run({ prompt: "commit this and open a PR against main", cacheDir });
    expect(a.logLines[0].trace.cached).toBe(false);
    const b = run({ prompt: "commit this and open a PR against main", cacheDir, env: { OPCHAIN_ROUTE_TRANSPORT_FIXTURE: errorFixture, OPCHAIN_ROUTE_MODE: "live" } });
    expect(b.status).toBe(0);
    expect(JSON.parse(b.stdout).hookSpecificOutput.additionalContext).toMatch(LINE_RE);
    expect(b.logLines[0].trace.cached).toBe(true);
  });

  it("default mode is shadow: routes and logs `mode: \"shadow\"` but injects nothing", () => {
    const r = run({ prompt: "commit this and open a PR against main" });
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toBe("");
    expect(r.logLines).toHaveLength(1);
    expect(r.logLines[0]).toMatchObject({ mode: "shadow", injected: false, decision: { skill: "oc-git-ops", args: "/oc-git-sync" } });
    // Anything other than the literal "live" is shadow.
    const typo = run({ prompt: "commit this and open a PR against main", env: { OPCHAIN_ROUTE_MODE: "on" } });
    expect(typo.stdout).toBe("");
    expect(typo.logLines[0].mode).toBe("shadow");
  });

  it("OPCHAIN_ROUTE_CONTEXT=1 sends the conversation (previous prompt + END of the last assistant message), redacted; a short follow-up is routed", () => {
    const secret = "ghp_abcdefghijklmnopqrstuvwxyz0123456789";
    const file = join(scratch, `conv-${seq}.jsonl`);
    const capture = join(scratch, `capture-${seq}.jsonl`);
    writeFileSync(
      file,
      [
        { type: "user", message: { role: "user", content: `open a PR for the auth fix, token ${secret}` } },
        { type: "assistant", message: { id: "m1", role: "assistant", content: [{ type: "text", text: `${"Long narration about checks. ".repeat(30)}PR #590 is open and CI is green. Want me to merge it?` }] } },
      ].map((x) => JSON.stringify(x)).join("\n") + "\n",
    );
    const r = run({ prompt: "merge", transcript_path: file, env: { OPCHAIN_ROUTE_TRANSPORT_CAPTURE: capture, OPCHAIN_ROUTE_CONTEXT: "1" } });
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toBe(""); // shadow
    expect(r.logLines).toHaveLength(1);
    const bodies = readFileSync(capture, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(bodies).toHaveLength(2);
    for (const body of bodies) {
      expect(body.state.request).toBe("merge");
      expect(body.state.conversation.previous_request).toBe("open a PR for the auth fix, token [REDACTED]");
      expect(body.state.conversation.assistant_last.length).toBeLessThanOrEqual(400);
      expect(body.state.conversation.assistant_last.endsWith("PR #590 is open and CI is green. Want me to merge it?")).toBe(true);
      expect(body.state.repo.last_prompt).toBeUndefined();
    }
    const raw = readFileSync(capture, "utf8") + readFileSync(r.log, "utf8");
    expect(raw).not.toContain(secret.slice(0, 20));
    expect(r.logLines[0].conversation.assistant_last.endsWith("Want me to merge it?")).toBe(true);
  });

  it("context off (default): no conversation is sent; a short prompt is routed on its own", () => {
    const file = join(scratch, `noctx-${seq}.jsonl`);
    const capture = join(scratch, `capture-noctx-${seq}.jsonl`);
    writeFileSync(
      file,
      [
        { type: "user", message: { role: "user", content: "open a PR for the auth fix" } },
        { type: "assistant", message: { id: "m1", role: "assistant", content: [{ type: "text", text: "PR #590 is green. Want me to merge it?" }] } },
      ].map((x) => JSON.stringify(x)).join("\n") + "\n",
    );
    const short = run({ prompt: "merge", transcript_path: file, env: { OPCHAIN_ROUTE_TRANSPORT_CAPTURE: capture } });
    expect(short.status, short.stderr).toBe(0);
    expect(short.logLines).toHaveLength(1);
    const bodies = readFileSync(capture, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(bodies).toHaveLength(2);
    for (const body of bodies) expect(Object.keys(body.state)).toEqual(["request", "repo"]);
    expect(short.logLines[0].conversation).toEqual({ previous_request: null, assistant_last: null });
    const one = run({ prompt: "y", transcript_path: file });
    expect(one.logLines).toHaveLength(0);
  });

  it("writes an outcome record for the previous prompt on the session's next prompt", () => {
    const sessionId = "sess-outcome";
    const log = join(scratch, "outcome-log.jsonl");
    const file = join(scratch, "outcome-transcript.jsonl");
    const first = "commit this and open a PR against main";
    writeFileSync(file, JSON.stringify({ type: "user", message: { role: "user", content: "earlier context prompt" } }) + "\n");
    const a = run({ prompt: first, transcript_path: file, logFile: log, sessionId });
    expect(a.status, a.stderr).toBe(0);
    expect(a.logLines).toHaveLength(1);
    // The session continues: the prompt, a Skill call, a gh pr merge, a closing message.
    const recs = [
      { type: "user", timestamp: "2026-01-01T00:00:00.000Z", message: { role: "user", content: first } },
      { type: "assistant", message: { id: "a1", content: [{ type: "tool_use", id: "t1", name: "Skill", input: { skill: "opchain:oc-git-ops", args: "/oc-pr" } }] } },
      { type: "user", message: { content: [{ type: "tool_result", tool_use_id: "t1", content: "done" }] } },
      { type: "assistant", message: { id: "a2", content: [{ type: "tool_use", id: "t2", name: "Bash", input: { command: "gh pr merge 590 --squash --delete-branch" } }] } },
      { type: "user", message: { content: [{ type: "tool_result", tool_use_id: "t2", content: "merged" }] } },
      { type: "assistant", message: { id: "a3", content: [{ type: "text", text: "Merged #590. Deploy to staging next?" }] } },
    ];
    appendFileSync(file, recs.map((x) => JSON.stringify(x)).join("\n") + "\n");
    const b = run({ prompt: "yes deploy it to staging now", transcript_path: file, logFile: log, sessionId, env: { OPCHAIN_ROUTE_CONTEXT: "1" } });
    expect(b.status, b.stderr).toBe(0);
    expect(b.logLines).toHaveLength(3);
    const [route1, outcome, route2] = b.logLines;
    expect(route1.mode).toBe("shadow");
    expect(outcome).toMatchObject({
      type: "outcome",
      session_id: sessionId,
      for_prompt_hash: route1.prompt_hash,
      suggested: "oc-git-ops",
      mode: "shadow",
      skill_calls: ["oc-git-ops"],
      skill_args: { "oc-git-ops": "/oc-pr" },
      raw: { git_commit: false, git_push: false, gh_pr_create: false, gh_pr_merge: true, deploy: false },
      followed: true,
      // Suggested /oc-git-sync; the session ran /oc-pr.
      followed_with_verb: false,
      arm: null,
      injected: false,
      anchor: "prompt",
    });
    expect(route1.prompt_hash).toBe(createHash("sha256").update(first).digest("hex").slice(0, 16));
    expect(route2.conversation.assistant_last).toBe("Merged #590. Deploy to staging next?");
    // A silenced next prompt (slash command) still closes route2's window — once.
    appendFileSync(file, JSON.stringify({ type: "user", message: { role: "user", content: "yes deploy it to staging now" } }) + "\n");
    const c = run({ prompt: "/oc-deploy staging", transcript_path: file, logFile: log, sessionId });
    expect(c.status).toBe(0);
    expect(c.stdout).toBe("");
    const outcomes = c.logLines.filter((l) => l.type === "outcome");
    expect(outcomes).toHaveLength(2);
    expect(outcomes[1]).toMatchObject({ for_prompt_hash: route2.prompt_hash, anchor: "prompt", skill_calls: [], followed: false });
    const d = run({ prompt: "/oc-deploy staging", transcript_path: file, logFile: log, sessionId });
    expect(d.logLines.filter((l) => l.type === "outcome")).toHaveLength(2);
  });

  it("sends a core checkpoint written in the last day, and only that", () => {
    const dir = mkRepo();
    writeFileSync(
      join(dir, ".checkpoints", "oc-git-ops.checkpoint.json"),
      JSON.stringify({ skill: "oc-git-ops", status: "in_progress", phase: "pr-open", updated_at: new Date().toISOString(), next_actions: ["Merge #650 once evidence:pr passes"] }),
    );
    const r = run({ prompt: "commit this and open a PR against main", cwd: dir });
    expect(r.logLines[0].repoState.checkpoint).toEqual({ skill: "oc-git-ops", phase: "pr-open", next_action: "Merge #650 once evidence:pr passes" });
  });

  it("a desktop prompt behind <system-reminder> blocks is routed on the human's text, hashed so the scorer finds it", () => {
    const capture = join(scratch, `capture-reminder-${seq}.jsonl`);
    const body = "commit this and open a PR against main";
    const r = run({ prompt: `${REMINDER}\n${REMINDER}\n${body}`, env: { OPCHAIN_ROUTE_TRANSPORT_CAPTURE: capture } });
    expect(r.status, r.stderr).toBe(0);
    expect(r.logLines).toHaveLength(1);
    const rec = r.logLines[0];
    expect(rec).toMatchObject({ prompt_head: body, envelope: "reminder", brief: false, decision: { skill: "oc-git-ops" } });
    expect(rec.prompt_raw_head).toBe(`${REMINDER}\n${REMINDER}`.slice(0, 40));
    expect(rec.prompt_hash).toBe(createHash("sha256").update(body).digest("hex").slice(0, 16));
    for (const b of readFileSync(capture, "utf8").trim().split("\n").map((l) => JSON.parse(l))) expect(b.state.request).toBe(body);
    // An explicit mention behind a reminder routes without a model call.
    const named = run({ prompt: `${REMINDER}\nrun /oc-audit pre-deploy on the release checkout` });
    expect(named.logLines[0].decision).toMatchObject({ skill: "oc-code-auditor", args: "/oc-audit pre-deploy", explicit: true });
  });

  it("a brief from another session routes its Task paragraph; a brief with none is silent", () => {
    const capture = join(scratch, `capture-brief-${seq}.jsonl`);
    const brief = "Background (from the session that started this one):\nopchain context, several paragraphs.\n\nTask:\ncommit this and open a PR against main\n\nRead first:\n- docs/x.md";
    const r = run({ prompt: `${REMINDER}\n${brief}`, env: { OPCHAIN_ROUTE_TRANSPORT_CAPTURE: capture } });
    expect(r.status, r.stderr).toBe(0);
    expect(r.logLines[0]).toMatchObject({ brief: true, envelope: "reminder", prompt_head: "commit this and open a PR against main" });
    expect(r.logLines[0].prompt_hash).toBe(createHash("sha256").update(brief).digest("hex").slice(0, 16));
    for (const b of readFileSync(capture, "utf8").trim().split("\n").map((l) => JSON.parse(l))) expect(b.state.request).toBe("commit this and open a PR against main");
    const none = run({ prompt: "Background (from the session that started this one):\njust context, no task" });
    expect(none.status).toBe(0);
    expect(none.stdout).toBe("");
    expect(none.logLines).toHaveLength(0);
  });

  it("OPCHAIN_ROUTE_AB=1: the live arm injects, the control arm routes and logs the line it withheld", () => {
    const live = run({ prompt: "commit this and open a PR against main", sessionId: "1a000000-live", env: { OPCHAIN_ROUTE_MODE: "live", OPCHAIN_ROUTE_AB: "1" } });
    expect(JSON.parse(live.stdout).hookSpecificOutput.additionalContext).toMatch(LINE_RE);
    expect(live.logLines[0]).toMatchObject({ mode: "live", arm: "live", injected: true });
    const control = run({ prompt: "commit this and open a PR against main", sessionId: "0f000000-control", env: { OPCHAIN_ROUTE_MODE: "live", OPCHAIN_ROUTE_AB: "1" } });
    expect(control.status, control.stderr).toBe(0);
    expect(control.stdout).toBe("");
    expect(control.logLines[0]).toMatchObject({ mode: "live", arm: "control", injected: false, decision: { skill: "oc-git-ops" } });
    expect(control.logLines[0].line).toMatch(LINE_RE);
  });

  it("threshold env overrides reach the decision", () => {
    const r = run({ prompt: "commit this and open a PR against main", env: { OPCHAIN_ROUTE_FITS: "0.95" } });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("");
    expect(r.logLines[0].decision).toBeNull();
    expect(r.logLines[0].trace.reason).toMatch(/fits 0\.88 < 0\.95/);
  });
});

describe("route-prompt hook: silence (exit 0, empty stdout)", () => {
  it("slash commands", () => {
    const r = run({ prompt: "/oc-commit everything please" });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("");
    expect(r.logLines).toHaveLength(0);
  });

  it("system / task-notification envelopes", () => {
    const r = run({ prompt: "<task-notification>agent finished</task-notification>" });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("");
    expect(r.logLines).toHaveLength(0);
  });

  it("with context on, short prompts with no assistant message to follow up on", () => {
    const r = run({ prompt: "ship it now", env: { OPCHAIN_ROUTE_CONTEXT: "1" } });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("");
    expect(r.logLines).toHaveLength(0);
  });

  it("missing TYPESAFE_API_KEY (even with the fixture seam set)", () => {
    const r = run({ prompt: "commit this and open a PR against main", dropKey: true });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("");
    expect(r.logLines).toHaveLength(0);
  });

  it("OPCHAIN_ROUTE=0", () => {
    const r = run({ prompt: "commit this and open a PR against main", env: { OPCHAIN_ROUTE: "0" } });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("");
    expect(r.logLines).toHaveLength(0);
  });

  it("a cwd that is not an opchain project", () => {
    const r = run({ prompt: "commit this and open a PR against main", cwd: plainDir });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("");
    expect(r.logLines).toHaveLength(0);
    const nonOpchainRepo = mkRepo({ opchain: false });
    const r2 = run({ prompt: "commit this and open a PR against main", cwd: nonOpchainRepo });
    expect(r2.status).toBe(0);
    expect(r2.stdout).toBe("");
  });

  it("malformed stdin", () => {
    const r = spawnSync(process.execPath, [HOOK], { input: "not json", encoding: "utf8", env: { PATH: process.env.PATH, TYPESAFE_API_KEY: "x" }, timeout: 20_000 });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("");
  });

  it("gate below threshold: silent but logged with decision null", () => {
    const r = run({ prompt: "what does the word idempotent mean in this context", env: { OPCHAIN_ROUTE_TRANSPORT_FIXTURE: gateFailFixture } });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("");
    expect(r.logLines).toHaveLength(1);
    expect(r.logLines[0].decision).toBeNull();
    expect(r.logLines[0].trace.reason).toMatch(/^gate/);
  });

  it("transport failure: fail open, error recorded in the log", () => {
    const r = run({ prompt: "commit this and open a PR against main", env: { OPCHAIN_ROUTE_TRANSPORT_FIXTURE: errorFixture } });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("");
    expect(r.stderr).toBe("");
    expect(r.logLines).toHaveLength(1);
    expect(r.logLines[0].decision).toBeNull();
    expect(r.logLines[0].trace.error).toBe("typesafe 529: overloaded");
  });
});

describe("route-prompt hook: latency (B-05)", () => {
  // A fake `gh` first on PATH: logs each call, prints an open PR, or (FAKE_GH_SLOW=1) hangs.
  let bin;
  let calls;
  beforeAll(() => {
    bin = mkdtempSync(join(scratch, "bin-"));
    calls = join(bin, "calls.log");
    writeFileSync(
      join(bin, "gh"),
      `#!/bin/sh\necho "$*" >> "${calls}"\nif [ "$FAKE_GH_SLOW" = "1" ]; then exec sleep 30; fi\necho '{"number":7,"state":"OPEN"}'\n`,
      { mode: 0o755 },
    );
  });
  const ghCalls = () => (existsSync(calls) ? readFileSync(calls, "utf8").trim().split("\n").filter(Boolean).length : 0);
  const withGh = (extra = {}) => ({ PATH: `${bin}:${process.env.PATH}`, ...extra });

  it("caches open_pr per repo + branch + HEAD: one `gh pr view` per key, not per prompt", () => {
    const dir = mkRepo();
    const cacheDir = join(scratch, "pr-cache");
    const before = ghCalls();
    const a = run({ prompt: "commit this and open a PR against main", cwd: dir, cacheDir, env: withGh() });
    const b = run({ prompt: "push the branch and update the PR", cwd: dir, cacheDir, env: withGh() });
    expect(ghCalls() - before).toBe(1);
    expect(a.logLines[0].repoState.open_pr).toEqual({ number: 7, state: "OPEN" });
    expect(b.logLines[0].repoState.open_pr).toEqual({ number: 7, state: "OPEN" });
    // A new HEAD is a new key.
    git(["-c", "core.hooksPath=/dev/null", "commit", "-q", "--allow-empty", "-m", "next"], dir);
    run({ prompt: "commit this and open a PR against main", cwd: dir, cacheDir, env: withGh() });
    expect(ghCalls() - before).toBe(2);
    // So is a new branch at the same commit: it must not be served the old branch's PR.
    git(["checkout", "-q", "-b", "feat/other"], dir);
    run({ prompt: "commit this and open a PR against main", cwd: dir, cacheDir, env: withGh() });
    expect(ghCalls() - before).toBe(3);
  }, 20_000);

  it("an explicit /oc-* mention skips `gh` and the model requests", () => {
    const before = ghCalls();
    const capture = join(scratch, `capture-explicit-${seq}.jsonl`);
    const r = run({ prompt: "run /oc-audit diff on this branch", env: withGh({ OPCHAIN_ROUTE_TRANSPORT_CAPTURE: capture }) });
    expect(r.status, r.stderr).toBe(0);
    expect(ghCalls() - before).toBe(0);
    expect(existsSync(capture)).toBe(false);
    expect(r.logLines[0]).toMatchObject({ decision: { skill: "oc-code-auditor", explicit: true }, repoState: { open_pr: null } });
  }, 20_000);

  it("a hanging `gh` cannot push the hook past its budget", () => {
    const t0 = Date.now();
    const r = run({ prompt: "commit this and open a PR against main", env: withGh({ FAKE_GH_SLOW: "1" }) });
    const wall = Date.now() - t0;
    expect(r.status, r.stderr).toBe(0);
    expect(r.logLines[0].repoState.open_pr).toBeNull();
    expect(r.logLines[0].total_ms).toBeLessThan(8000);
    expect(wall).toBeLessThan(9500); // under the 10s hooks.json timeout, with spawn overhead
  }, 20_000);

  it("default shadow mode returns at once and routes in a detached child", async () => {
    const t0 = Date.now();
    const r = run({ prompt: "commit this and open a PR against main", env: withGh({ FAKE_GH_SLOW: "1", OPCHAIN_ROUTE_SYNC: "" }) });
    const wall = Date.now() - t0;
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toBe("");
    expect(wall).toBeLessThan(1900); // the hanging gh alone would cost 2s inline
    expect(r.logLines).toHaveLength(0); // nothing logged yet by the parent
    let lines = [];
    for (let i = 0; i < 100 && !lines.length; i++) {
      await new Promise((res) => setTimeout(res, 100));
      lines = existsSync(r.log) ? readFileSync(r.log, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
    }
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ mode: "shadow", injected: false, decision: { skill: "oc-git-ops" } });
    expect(lines[0].repoState.open_pr).toBeNull();
  }, 20_000);
});

describe("route-prompt hook: registration", () => {
  it("is registered in plugins/opchain/hooks/hooks.json under UserPromptSubmit with a 10s timeout", () => {
    const hooks = JSON.parse(readFileSync(join(ROOT, "plugins", "opchain", "hooks", "hooks.json"), "utf8"));
    const entries = hooks.hooks.UserPromptSubmit.flatMap((g) => g.hooks);
    const mine = entries.find((h) => h.command.includes("route-prompt.cjs"));
    expect(mine).toMatchObject({ type: "command", timeout: 10 });
    expect(mine.command).toContain("${CLAUDE_PLUGIN_ROOT}/hooks/route-prompt.cjs");
  });
});
