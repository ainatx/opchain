#!/usr/bin/env node
// opchain plugin — UserPromptSubmit hook. Routes a prompt to ONE opchain skill.
//
// ── Why this exists ─────────────────────────────────────────────────────────
// docs/audits/2026-10-08-opchain-effectiveness-audit.md §3.1, I-08: skills
// were never invoked by description matching (0/229 PR gates), but a prompt
// that says `invoke the Skill tool with skill "<id>" and args "<verb>"` got
// 72/72 compliance. So this hook asks TypeSafe/Jev which skill owns the
// request and (in live mode) injects exactly one such line as
// additionalContext. Nothing else: no prose, no menu, no second suggestion.
//
// ── Modes ───────────────────────────────────────────────────────────────────
// SHADOW IS THE DEFAULT. OPCHAIN_ROUTE_MODE unset (or anything but "live")
// routes and logs but injects nothing, from a detached child so the prompt
// never waits on it; OPCHAIN_ROUTE_MODE=live must be set explicitly to inject. Shadow runs are what the day-8 go/no-go check in
// docs/runbooks/skill-router-eval.md (`route-eval outcomes`) is computed from.
//
// ── Hook contract (code.claude.com/docs/en/hooks, verified 2026-10-08) ──────
// stdin  JSON: { session_id, transcript_path, cwd, permission_mode,
//               hook_event_name: "UserPromptSubmit", prompt, ...common fields }
// stdout exit 0 + JSON:
//   {"hookSpecificOutput":{"hookEventName":"UserPromptSubmit",
//                          "additionalContext":"<line>"}}
//   additionalContext is "added to Claude's context alongside the submitted
//   prompt" (injected as a system reminder that starts with the hook's name;
//   no transcript entry). Plain-text stdout would ALSO be added as context on
//   this event, which is why silence here means EMPTY stdout, never a log line.
//   exit 2 blocks the prompt; this hook never exits non-zero (fail open).
// timeout: Claude Code lowers the default to 30s for UserPromptSubmit; the
//   plugin registers 10s and the hook budgets 8s for itself, measured from
//   process start: every synchronous git/gh call shares a 4s deadline
//   (spawnSync blocks the event loop, so the watchdog cannot preempt it), and
//   the watchdog covers the rest, including the async HTTPS requests. `open_pr`
//   (`gh pr view`, the slowest call) is cached per repo + branch + HEAD for 60s, and an
//   explicit `/oc-*` mention skips it and the HTTPS requests altogether.
//
// ── What the router sees ────────────────────────────────────────────────────
// state = { request, repo } by default. With OPCHAIN_ROUTE_CONTEXT=1 (opt-in,
// experimental; it cut precision 0.81 → 0.51 on the 2026-10-09 eval):
// state = { request, conversation: { previous_request, assistant_last }, repo }
//   conversation  from the transcript tail (last 256 KB): the previous human
//                 prompt (≤200 chars) and the END of the last assistant message
//                 before this prompt (≤400 chars) — where the agent proposes
//                 next steps, so "merge" / "yes" / "go" can be resolved.
//                 Both pass through redactSecrets before anything else.
//   repo          branch, ahead/behind origin/main, dirty count, open_pr,
//                 enrolled, the newest in-progress checkpoint.
//
// ── Outcome records (self-labelling) ────────────────────────────────────────
// Before routing, the hook finds this session's previous routing record in
// the log (last ~200 lines), reads the transcript records after that record's
// prompt up to the end of its reply turn, the next human turn or 30 min
// (dispatch.outcomeWindow), and appends { type: "outcome", for_prompt_hash,
// suggested, mode, skill_calls, raw: { git_commit, git_push, git_sync,
// gh_pr_create, gh_pr_merge, deploy, merge_handoff }, followed, window_end }.
// Bounded reads; skipped if it takes > 300 ms. These records are the
// fallback: `route-eval outcomes` rescores every routed prompt from the full
// transcripts (subagents included) when it can find them.
//
// ── Silence rules (exit 0, no stdout) ───────────────────────────────────────
//   no TYPESAFE_API_KEY · OPCHAIN_ROUTE=0 · prompt starts with "/" (slash
//   command) or "<" (task-notification / system envelopes) · prompt < 2 chars
//   · with OPCHAIN_ROUTE_CONTEXT=1 only: prompt < 12 chars UNLESS the
//   transcript has an assistant message for it to follow up on · the repo is
//   not an opchain project (.checkpoints/ dir, .bugcheck.json, or
//   .claude/skills/oc-*) · shadow mode (routes and logs, injects nothing) ·
//   any failure anywhere (logged, never surfaced)
//
// ── Env ─────────────────────────────────────────────────────────────────────
//   TYPESAFE_API_KEY                 required; never logged
//   OPCHAIN_ROUTE=0                  disable
//   OPCHAIN_ROUTE_MODE=live          inject the suggestion (default: shadow — log only)
//   OPCHAIN_ROUTE_GATE / _FITS       threshold overrides (0..1); _FITS replaces the tiered
//                                    bar (core skills 0.6, all others 0.9)
//   OPCHAIN_ROUTE_SUGGEST_ALL=1      ignore the suggest allowlist (diagnostics only)
//   OPCHAIN_ROUTE_CONTEXT=1          send conversation context (experimental, off by default)
//   OPCHAIN_ROUTE_LOG                JSONL path (default $TMPDIR/opchain-route-log.jsonl)
//   OPCHAIN_ROUTE_CACHE_DIR          decision cache dir (default $TMPDIR/opchain-route-cache)
//   OPCHAIN_ROUTE_SYNC=1             shadow mode routes inline instead of in a detached child
//   OPCHAIN_ROUTE_TRANSPORT_FIXTURE  test seam: canned answers JSON, no network
//   OPCHAIN_ROUTE_TRANSPORT_CAPTURE  test seam: with the fixture, append each request body here
//
// Every routing attempt appends one JSONL record: { at, session_id,
// prompt_hash, prompt_head, repoState, conversation (heads), decision, mode,
// injected, trace: { top3, gate, fits, usage, ms, cached, error, reason,
// suppressed } }. Pre-flight silences are not logged (they would fire on
// every slash command in every repo); outcome records are.

"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const dispatch = require("./lib/route-dispatch.cjs");

const BUDGET_MS = 8000;
const OUTCOME_BUDGET_MS = 300;
const REQUEST_TIMEOUT_MS = 3000;
const GIT_TIMEOUT_MS = 1500;
const GH_TIMEOUT_MS = 2000;
// All synchronous spawns (git, gh) share one deadline from process start; the
// watchdog (BUDGET_MS) cannot fire while spawnSync blocks (audit B-05).
const SYNC_BUDGET_MS = 4000;
const OPEN_PR_TTL_MS = 60 * 1000;
const MIN_PROMPT_CHARS = 12;
const MIN_FOLLOWUP_CHARS = 2;
const TRANSCRIPT_TAIL_BYTES = 256 * 1024;
const LOG_TAIL_BYTES = 512 * 1024;
const LOG_TAIL_LINES = 200;
const started = Date.now();
const env = process.env;

let input = {};
let rawInput = "";
try {
  rawInput = fs.readFileSync(0, "utf8");
  input = JSON.parse(rawInput || "{}");
} catch {
  input = {};
}

// Redact credentials at the source: the prompt is hashed, logged and sent to a third-party
// API below, and none of those may ever see a pasted key. If the redactor cannot load,
// treat the prompt as empty (silent) rather than risk sending it raw.
let prompt = "";
try {
  const raw = typeof input.prompt === "string" ? input.prompt.trim() : "";
  prompt = raw ? dispatch.redactSecrets(raw) : "";
} catch {
  prompt = "";
}
const sessionId = input.session_id ? String(input.session_id) : null;
const promptHash = dispatch.promptHash(prompt);
const logFile = env.OPCHAIN_ROUTE_LOG || path.join(os.tmpdir(), "opchain-route-log.jsonl");
const mode = env.OPCHAIN_ROUTE_MODE === "live" ? "live" : "shadow";

function appendRaw(record) {
  try {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    fs.appendFileSync(logFile, JSON.stringify(record) + "\n");
  } catch {
    /* logging is best effort */
  }
}

function appendLog(record) {
  appendRaw({ at: new Date().toISOString(), session_id: sessionId, prompt_hash: promptHash, ...record });
}

function silent() {
  process.exit(0);
}

/** Last `maxBytes` of a file as complete lines (the first, possibly partial, line is dropped when cut). */
function tailLines(file, maxBytes) {
  let fd = null;
  try {
    const st = fs.statSync(file);
    const size = Math.min(st.size, maxBytes);
    if (!size) return [];
    const buf = Buffer.alloc(size);
    fd = fs.openSync(file, "r");
    fs.readSync(fd, buf, 0, size, st.size - size);
    const lines = buf.toString("utf8").split("\n");
    if (size < st.size) lines.shift();
    return lines;
  } catch {
    return [];
  } finally {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch {
        /* ignore */
      }
    }
  }
}

function parseJsonLines(lines) {
  const out = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t || t[0] !== "{") continue;
    try {
      out.push(JSON.parse(t));
    } catch {
      /* partial line */
    }
  }
  return out;
}

let transcriptCache;
function transcriptRecords() {
  if (transcriptCache !== undefined) return transcriptCache;
  const tp = input.transcript_path;
  transcriptCache = tp && typeof tp === "string" ? parseJsonLines(tailLines(tp, TRANSCRIPT_TAIL_BYTES)) : [];
  return transcriptCache;
}

// ── Pre-flight ──────────────────────────────────────────────────────────────
if (!env.TYPESAFE_API_KEY) silent();
if (env.OPCHAIN_ROUTE === "0") silent();

// ── Shadow mode never blocks the prompt (2026-10-09 audit B-05) ─────────────
// Shadow output is never injected, so the prompt must not wait for git, gh or
// the HTTPS requests. The hook hands its stdin to a detached copy of itself
// (OPCHAIN_ROUTE_DETACHED=1, stdout/stderr ignored) that does all the work and
// logging, and exits at once. Live mode stays inline: it needs the answer.
// The stdin payload goes over a pipe, never a temp file (it is not redacted
// yet). OPCHAIN_ROUTE_SYNC=1 keeps shadow inline (tests, debugging). If the
// spawn fails, the hook just carries on inline.
if (mode === "shadow" && env.OPCHAIN_ROUTE_DETACHED !== "1" && env.OPCHAIN_ROUTE_SYNC !== "1") {
  try {
    const child = spawn(process.execPath, [__filename], {
      detached: true,
      stdio: ["pipe", "ignore", "ignore"],
      env: { ...env, OPCHAIN_ROUTE_DETACHED: "1" },
    });
    child.on("error", () => process.exit(0));
    child.unref();
    child.stdin.on("error", () => process.exit(0));
    child.stdin.end(rawInput, () => process.exit(0));
    // Fail-safe: never hold the prompt longer than the pipe write needs.
    setTimeout(() => process.exit(0), 1000).unref();
    return;
  } catch {
    /* fall through: route inline */
  }
}

// ── Outcome of this session's previous routed prompt ────────────────────────
// Runs before the prompt-based silences so a slash command or short prompt
// still closes the previous prompt's window. Only a session that already has a
// routing record (so: an opchain project with routing on) gets an outcome.
function recordPreviousOutcome() {
  if (!sessionId || !input.transcript_path) return;
  const deadline = Date.now() + OUTCOME_BUDGET_MS;
  const lines = tailLines(logFile, LOG_TAIL_BYTES).slice(-LOG_TAIL_LINES);
  let prev = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    const t = lines[i].trim();
    if (!t || !t.includes(sessionId)) continue;
    let rec;
    try {
      rec = JSON.parse(t);
    } catch {
      continue;
    }
    if (rec.session_id !== sessionId) continue;
    prev = rec;
    break;
  }
  // No record, or the newest one is already an outcome (the prompt in between
  // was silenced): nothing open to close.
  if (!prev || prev.type === "outcome" || !prev.prompt_hash) return;
  if (Date.now() > deadline) return;
  const records = transcriptRecords();
  if (Date.now() > deadline) return;
  const found = dispatch.outcomeFromRecords(records, { forPromptHash: prev.prompt_hash, afterAt: prev.at, deadline });
  if (!found || Date.now() > deadline) return;
  const suggested = prev.decision && prev.decision.skill ? prev.decision.skill : null;
  appendRaw({
    type: "outcome",
    session_id: sessionId,
    for_prompt_hash: prev.prompt_hash,
    at: new Date().toISOString(),
    suggested,
    explicit: Boolean(prev.decision && prev.decision.explicit),
    mode: prev.mode || null,
    skill_calls: found.skill_calls,
    raw: found.raw,
    followed: suggested ? found.skill_calls.includes(suggested) : null,
    anchor: found.anchor,
    window_end: found.window_end,
  });
}
try {
  recordPreviousOutcome();
} catch {
  /* outcome recording is best effort */
}

if (!prompt) silent();
if (prompt.startsWith("/") || prompt.startsWith("<")) silent();

// Conversation context, opt-in. With context on, a prompt under
// MIN_PROMPT_CHARS routes only as a follow-up (an assistant message precedes
// it). With context off, every prompt of MIN_FOLLOWUP_CHARS+ routes: the
// 12-char floor silenced every bare "merge" (the commonest correct git-ops
// suggestion) and lowered precision on the 2026-10-09 eval (0.86 → 0.78).
const thresholds = dispatch.thresholdsFromEnv(env);
let conversation = { previous_request: null, assistant_last: null };
if (thresholds.context) {
  try {
    conversation = dispatch.conversationFromRecords(transcriptRecords(), prompt);
  } catch {
    /* context is best effort */
  }
}
if (prompt.length < MIN_FOLLOWUP_CHARS) silent();
if (thresholds.context && prompt.length < MIN_PROMPT_CHARS && !conversation.assistant_last) silent();

const cwd = input.cwd && typeof input.cwd === "string" ? input.cwd : process.cwd();

const syncDeadline = started + SYNC_BUDGET_MS;

/** spawnSync bounded by its own timeout AND the shared sync deadline; null when out of time. */
function spawnBounded(cmd, args, { timeout = GIT_TIMEOUT_MS, cwd: dir = cwd } = {}) {
  const left = syncDeadline - Date.now();
  if (left < 50) return null;
  try {
    return spawnSync(cmd, args, { cwd: dir, encoding: "utf8", timeout: Math.min(timeout, left), killSignal: "SIGKILL", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

function run(cmd, args, opts) {
  const r = spawnBounded(cmd, args, opts);
  if (!r || r.error || r.status !== 0) return null;
  return (r.stdout || "").trim();
}

const root = run("git", ["rev-parse", "--show-toplevel"]) || cwd;

function isOpchainProject(dir) {
  try {
    if (fs.statSync(path.join(dir, ".checkpoints")).isDirectory()) return true;
  } catch {
    /* next */
  }
  if (fs.existsSync(path.join(dir, ".bugcheck.json"))) return true;
  try {
    return fs.readdirSync(path.join(dir, ".claude", "skills")).some((n) => n.startsWith("oc-"));
  } catch {
    return false;
  }
}

if (!isOpchainProject(root)) silent();

// ── Watchdog: the whole hook must finish inside BUDGET_MS of process start ──
const watchdog = setTimeout(() => {
  appendLog({ prompt_head: prompt.slice(0, 80), mode, error: `budget of ${BUDGET_MS}ms exceeded`, ms: Date.now() - started });
  process.exit(0);
}, Math.max(0, BUDGET_MS - (Date.now() - started)));

// The spec is loaded before repo state so an explicit mention can skip the
// slow calls (it routes without a model request; route() re-checks it).
let spec;
try {
  spec = require("./route-spec.json");
} catch (err) {
  appendLog({ prompt_head: prompt.slice(0, 80), mode, error: `route-spec.json unreadable: ${err.message}` });
  clearTimeout(watchdog);
  silent();
}
let explicit = false;
try {
  explicit = Boolean(dispatch.explicitMention(prompt, spec));
} catch {
  explicit = false;
}

// ── Repo state (best effort, each call bounded) ─────────────────────────────
function aheadBehind() {
  const out = run("git", ["rev-list", "--left-right", "--count", "origin/main...HEAD"]);
  if (!out) return { ahead: null, behind: null };
  const [behind, ahead] = out.split(/\s+/).map((n) => Number(n));
  return { ahead: Number.isFinite(ahead) ? ahead : null, behind: Number.isFinite(behind) ? behind : null };
}

function dirtyCount() {
  const out = run("git", ["status", "--porcelain"]);
  if (out === null) return null;
  return out ? out.split("\n").filter(Boolean).length : 0;
}

function ghOpenPr() {
  const r = spawnBounded("gh", ["pr", "view", "--json", "number,state"], { cwd: root, timeout: GH_TIMEOUT_MS });
  if (!r || r.error) return null; // gh missing, timed out, or no time left: unknown
  if (r.status !== 0) return false; // no PR for this branch
  try {
    const j = JSON.parse(r.stdout || "{}");
    return j && j.number ? { number: j.number, state: j.state || null } : false;
  } catch {
    return null;
  }
}

// `gh pr view` is a network call (up to GH_TIMEOUT_MS) on every prompt, so a
// known answer is cached per repo root + branch + HEAD for OPEN_PR_TTL_MS next
// to the decision cache (a new branch at the same commit has its own PR, or
// none). Unknown (null) is never cached.
function openPr(head, branchName) {
  if (!head || !branchName) return ghOpenPr();
  const dir = env.OPCHAIN_ROUTE_CACHE_DIR || dispatch.defaultCacheDir();
  const file = path.join(dir, `open-pr-${dispatch.promptHash(root)}.json`);
  try {
    const hit = JSON.parse(fs.readFileSync(file, "utf8"));
    if (hit && hit.head === head && hit.branch === branchName && Date.now() - Number(hit.at) < OPEN_PR_TTL_MS) return hit.value;
  } catch {
    /* miss */
  }
  const value = ghOpenPr();
  if (value !== null) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify({ head, branch: branchName, value, at: Date.now() }));
      fs.renameSync(tmp, file);
    } catch {
      /* cache is best effort */
    }
  }
  return value;
}

function enrolled() {
  const common = run("git", ["rev-parse", "--git-common-dir"]);
  if (!common) return false;
  const dir = path.isAbsolute(common) ? common : path.join(root, common);
  return fs.existsSync(path.join(dir, "opchain", "commit-gate", "v1", "verify-candidate.mjs"));
}

function activeCheckpoint() {
  const dir = path.join(root, ".checkpoints");
  let best = null;
  let files = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith(".checkpoint.json"));
  } catch {
    return null;
  }
  for (const f of files) {
    try {
      const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      if (!d || d.status !== "in_progress") continue;
      const at = Date.parse(d.record_updated_at || d.updated_at || "") || 0;
      if (!best || at > best.at) {
        const next = Array.isArray(d.next_actions) && d.next_actions.length ? String(d.next_actions[0]) : null;
        best = { at, skill: d.skill || f.replace(/\.checkpoint\.json$/, ""), phase: d.phase || null, next_action: next ? next.slice(0, 200) : null };
      }
    } catch {
      /* skip unreadable checkpoint */
    }
  }
  if (!best) return null;
  return { skill: best.skill, phase: best.phase, next_action: best.next_action };
}

// One spawn for branch + HEAD sha (the open_pr cache key).
const [headSha = null, branch = null] = (run("git", ["rev-parse", "HEAD", "--abbrev-ref", "HEAD"]) || "").split("\n");
const repoState = {
  branch: branch || null,
  ...aheadBehind(),
  dirty: dirtyCount(),
  // Explicit mention: the user already chose the skill, so skip `gh` (null = unknown).
  open_pr: explicit ? null : openPr(headSha || null, branch || null),
  enrolled: enrolled(),
  checkpoint: activeCheckpoint(),
};

// ── Route ───────────────────────────────────────────────────────────────────

let transport;
try {
  transport = env.OPCHAIN_ROUTE_TRANSPORT_FIXTURE
    ? dispatch.fixtureTransport(env.OPCHAIN_ROUTE_TRANSPORT_FIXTURE, { captureFile: env.OPCHAIN_ROUTE_TRANSPORT_CAPTURE || null })
    : dispatch.httpTransport({ apiKey: env.TYPESAFE_API_KEY, timeoutMs: REQUEST_TIMEOUT_MS });
} catch (err) {
  appendLog({ prompt_head: prompt.slice(0, 80), mode, error: `transport: ${err.message}` });
  clearTimeout(watchdog);
  silent();
}

function traceSummary(trace) {
  if (!trace) return null;
  return {
    top3: (trace.request2 && trace.request2.top3) || (trace.request1 && trace.request1.top3) || [],
    top3_request1: (trace.request1 && trace.request1.top3) || [],
    gate: trace.request1 ? trace.request1.gate : null,
    fits: trace.request2 ? trace.request2.fits : null,
    verb: trace.request2 ? trace.request2.verb : null,
    usage: trace.usage || null,
    ms: trace.ms,
    cached: Boolean(trace.cached),
    error: trace.error || null,
    reason: trace.reason || null,
    suppressed: trace.suppressed || null,
  };
}

(async () => {
  let result;
  try {
    result = await dispatch.route({
      prompt,
      repoState,
      conversation,
      spec,
      transport,
      thresholds,
      cache: { dir: env.OPCHAIN_ROUTE_CACHE_DIR || dispatch.defaultCacheDir() },
    });
  } catch (err) {
    result = { decision: null, trace: { error: String((err && err.message) || err), ms: Date.now() - started } };
  }
  const { decision, trace } = result;
  const line = dispatch.decisionText(decision);
  const inject = Boolean(line && mode === "live");
  if (inject) {
    process.stdout.write(
      JSON.stringify({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: line } }) + "\n",
    );
  }
  appendLog({
    prompt_head: prompt.slice(0, 80),
    repoState,
    conversation: {
      previous_request: conversation.previous_request ? conversation.previous_request.slice(0, 80) : null,
      assistant_last: conversation.assistant_last ? dispatch.tailText(conversation.assistant_last, 120) : null,
    },
    decision: decision
      ? { skill: decision.skill, args: decision.args, p: decision.p, confidence: decision.confidence, gate: decision.gate, fits: decision.fits, explicit: decision.explicit === true }
      : null,
    mode,
    injected: inject,
    trace: traceSummary(trace),
    total_ms: Date.now() - started,
  });
  clearTimeout(watchdog);
  process.exit(0);
})();
