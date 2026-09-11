#!/usr/bin/env node
// opchain plugin — PreToolUse(Bash) gate on `git commit`.
//
// This is the one mechanism in opchain that makes a check run without the user
// asking for it by name. Skill-description matching produced zero autonomous
// invocations across 87 measured transcripts; a PreToolUse deny produces 100%,
// because it is not a suggestion.
//
// ── v2, after an adversarial audit found five real bypasses in v1 ────────────
// Every fix below has a reproduction in test-gate.cjs. The v1 defects were:
//
//   GATE-01  `git commit -a`, `-am`, `<pathspec>`, and `git add -A && commit`
//            all defeated the tree binding, because `git write-tree` hashes the
//            index as it stands BEFORE the command runs — and those forms stage
//            their content afterwards. Verified: an `eval(process.env.PAYLOAD)`
//            appended to a tracked file committed cleanly past a green gate.
//            Fixed by computing the PROSPECTIVE tree (what the commit will
//            actually contain) in a scratch index.
//   GATE-01b `--no-verify` was matched against the raw command, so a commit
//            *message* mentioning it disabled the gate. Fixed by matching the
//            quote-stripped string, in argument position.
//   GATE-03  Any uncaught throw produced empty stdout, and empty stdout means
//            ALLOW. `JSON.parse("null")` reached a property access and did
//            exactly that. Fixed by a top-level handler that denies.
//   GATE-04  `git -C <dir> commit` and `sh -c '…'` were not detected, because
//            options taking a separate value token broke the matcher. `git -C`
//            is how an agent commits from a worktree. Fixed.
//   GATE-05  A checkpoint with no `updated_at` skipped the freshness backstop,
//            so the cheapest forgery was `{"last_run_verdict":"PASS"}` with no
//            timestamp at all. Fixed by denying when the time is unknowable.
//   GATE-06  A PASS with no `verified_tree` was still allowed for 10 minutes —
//            the tree-less window of the repo-local ancestor, in which any
//            fresh PASS cleared any commit whatever changed after the check.
//            Meanwhile oc-bug-check's SKILL.md documented the verdict only at
//            `skill_state.last_run.verdict`, with no tree, so a skill following
//            its own docs was denied by the gate that ships — while the opchain
//            repo itself kept running the ancestor, which accepted exactly that
//            shape. Fixed: the tree is mandatory at every age, `last_run.verdict`
//            is read, verdict fields that disagree deny, and the repo's own
//            sessions run this file.
//   GATE-07  The wrapper re-scan for `sh -c '…'` failed both ways. It covered
//            the WHOLE command once a wrapper appeared anywhere, so a quoted
//            JSON dry-run payload mentioning `git commit`, piped into this
//            gate, plus an unrelated `sh -c` on the next line was denied as a
//            commit. And its anchor was looser than the one for `git`, so
//            `FOO=1 bash -c`, `/bin/sh -c`, `nice sh -c` and `then sh -c` each
//            ran a commit past the gate. Its prefix grammar also backtracked
//            exponentially: 26 × `time` outran the hook's 10s timeout, and a
//            killed hook writes no deny. And `\'` inside single quotes was read
//            as an escape, hiding `echo 'a\' ; git commit …` in a span bash had
//            closed. Fixed: the re-scan covers only what the wrapper can run, a
//            wrapper is found in the same command position as `git`, the prefix
//            grammar parses one way, and quote spans follow bash's rules.
//
// The through-line: every one of these failed OPEN. A gate whose error path is
// "allow" is a formality, not a gate. Hence rule 0.
//
// Rules:
//   0. FAIL CLOSED. Any state we cannot evaluate is a deny, never an allow.
//   1. NODE, NOT BASH+JQ. The retired repo-local ancestor soft-skipped when
//      `jq` was missing, so a fresh container silently had no gate. Node
//      always exists.
//   2. VERDICTS BOUND TO CONTENT. `write_checkpoint` is a public MCP tool and
//      the agent authors the file, so a bare `verdict: PASS` is self-attestation.
//      Binding it to a tree hash makes a stale or forged PASS NON-MATCHING.
//   3. OPT-IN PER REPO. Plugins install globally. A gate that denies commits in
//      unrelated repos gets uninstalled, taking the protection with it.
//   4. UNSUPPORTED != PASS. A gate that could not read your stack must not
//      report green.
//
// Contract: stdin is the hook JSON; stdout is either nothing (allow) or a
// PreToolUse deny object; exit 0 either way.

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

function allow() {
  process.exit(0);
}

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

// RULE 0. Without this, any thrown error exits non-zero with empty stdout —
// which the hook contract reads as "allow". v1 shipped that hole (GATE-03).
process.on("uncaughtException", (e) => {
  deny(
    `opchain: the commit gate errored (${e && e.message}) and refuses to allow an ` +
      "unverified commit. This is a bug in the gate — please report it. To proceed " +
      "anyway: `git commit --no-verify`.",
  );
});

function git(args, cwd, env) {
  const r = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    env: env ? { ...process.env, ...env } : process.env,
  });
  return r.status === 0 ? (r.stdout || "").trim() : null;
}

// ── parse hook input ────────────────────────────────────────────────────────
let input;
try {
  input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
} catch {
  allow(); // malformed harness input is not the user's problem
}
if (!input || typeof input !== "object" || input.tool_name !== "Bash") allow();

const rawCommand = String((input.tool_input && input.tool_input.command) || "");

// Quoted literals are data, not syntax. Strip them ONCE and use the result for
// every structural decision — v1 stripped for the commit match but not for the
// bypass match, so a commit message could turn the gate off (GATE-01b).
//
// Spans follow bash's quoting rules, in one left-to-right pass: outside quotes
// `\x` is an escaped character; `'…'` has no escapes and ends at the next `'`;
// `"…"` honours `\`. `-m "he said \" --no-verify \""` is one argument, so a
// `"[^"]*"` span ending at the escaped quote left `--no-verify` exposed
// (GATE-01b, round 2). That round's fix — neutralising every `\"` and `\'`
// before finding spans — was wrong inside single quotes, where bash has no
// escapes: `echo 'a\' ; git commit -m x ; echo ''` hid a real commit inside a
// span bash had already closed (GATE-07).
const SPAN = /\\[\s\S]|'[^']*'|"(?:[^"\\]|\\[\s\S])*"/g;
const joined = rawCommand.replace(/\\\n/g, " ");
const stripped = joined.replace(SPAN, (m) => (m[0] === "\\" ? m : ""));

/**
 * Does this command actually INVOKE `git commit`?
 *
 * Substring matching is wrong and harmful: it blocks `echo "git commit"`,
 * heredocs, and `grep -r 'git commit' docs/`. (The retired repo-local ancestor
 * did exactly that, and it blocked this file's own test runs twice.) False
 * positives teach people to bypass, which costs the true positives too.
 *
 * So: `git` must be in command position — start of string, or after a shell
 * separator or group opener — and `commit` must be its subcommand. Global
 * options taking a SEPARATE value token (`-C <dir>`, `-c <k=v>`) are consumed
 * explicitly; v1 missed those (GATE-04).
 */
const CMD_POS = String.raw`(?:^|[;&|\n(){]|&&|\|\||\bdo\b|\bthen\b|\belse\b)`;
const ENVPFX = String.raw`(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)*`;
// Prefix commands that exec git transparently — `nice git`, `stdbuf -oL git`,
// `time git`, `flock /l git`, `xargs git`. Allow a chain of them, each with its
// own flags/values, between command position and git (GATE-04 r2). A value may
// not itself be a prefix name: if it could, `time time … ls` parses 2^n ways,
// and 26 of them outran the hook's 10s timeout — a killed hook writes no deny
// (GATE-07). No match is lost: such a token still parses as the next prefix.
const PREFIXES = "nice|stdbuf|time|setsid|flock|ionice|timeout|env|command|sudo|nohup|xargs";
const PREFIX = String.raw`(?:(?:${PREFIXES})(?:\s+-\S+|\s+(?!(?:${PREFIXES})\s)[^\s-]\S*)*\s+)*`;
// `git`, or an absolute/relative path to it (`/usr/bin/git`) — GATE-04 r2.
const GIT = String.raw`(?:[^\s;&|()]*/)?git`;
const GITOPT = String.raw`(?:(?:-[cC]|--git-dir|--work-tree|--namespace|--exec-path)\s+\S+\s+|-[^\s]+\s+|--\S+\s+)*`;
const GIT_COMMIT = new RegExp(`${CMD_POS}\\s*${ENVPFX}${PREFIX}${GIT}\\s+${GITOPT}commit(?![-\\w])`);

// Wrappers that execute nested command text (`sh -c '…'`, `eval "…"`, `… | sh`).
// That text lives INSIDE quotes, so `stripped` deleted it. For these, re-scan a
// variant where the quote characters become whitespace — keeping the nested
// command as syntax rather than discarding it as data. A wrapper is found in the
// same command position as `git` itself (env prefix, `nice`-style prefix, path);
// a looser anchor let `FOO=1 bash -c`, `/bin/sh -c` and `then sh -c` through.
const WRAPPER = new RegExp(
  `${CMD_POS}\\s*${ENVPFX}${PREFIX}(?:[^\\s;&|()]*/)?(?:sh|bash|zsh|env|eval|xargs|command|sudo|timeout|nohup)(?![-\\w])`,
);

// Position-aligned views of `joined`, built from the SAME spans as `stripped`:
// `masked` blanks each quoted span (structure only), `unquoted` blanks just the
// quote characters (nested commands survive as syntax). Because the spans are
// shared, text outside a span is always visible to the strict matcher.
const masked = joined.replace(SPAN, (m) => (m[0] === "\\" ? m : " ".repeat(m.length)));
const unquoted = joined.replace(/['"]/g, " ");

// Inside a wrapper's argument the nested command follows `-c` and whitespace,
// not a shell separator, so the strict command-position anchor cannot match.
// Having already established this IS a wrapper invocation, accept `git … commit`
// at any whitespace boundary within it.
const GIT_COMMIT_LOOSE = new RegExp(String.raw`(?:^|\s)${ENVPFX}${PREFIX}${GIT}\s+${GITOPT}commit(?![-\w])`);

/**
 * The simple commands of `masked`, as [start, end, piped]. Split at unquoted
 * `;` `&` `&&` `|` `||` newline and subshell parens — not at redirections
 * (`2>&1`, `&>`, `>|`), nor inside `$(…)` `<(…)` `>(…)` or backticks, which
 * belong to the word they appear in. `piped`: stdin is the previous stage.
 */
function simpleCommands(s) {
  const out = [];
  let start = 0;
  let piped = false;
  let depth = 0;
  let tick = false;
  const cut = (i, width, nextPiped) => {
    out.push([start, i, piped]);
    start = i + width;
    piped = nextPiped;
    return width - 1;
  };
  for (let i = 0; i < s.length; i++) {
    const p = s[i - 1];
    const c = s[i];
    const n = s[i + 1];
    if (c === "`") tick = !tick;
    if (tick || c === "`") continue;
    if (c === "(" && (depth > 0 || p === "$" || p === "<" || p === ">")) depth++;
    else if (c === ")" && depth > 0) depth--;
    else if (depth > 0) continue;
    else if (c === "(" || c === ")" || c === ";" || c === "\n") i += cut(i, 1, false);
    else if (c === "&" && n === "&") i += cut(i, 2, false);
    else if (c === "&" && p !== ">" && p !== "<" && n !== ">") i += cut(i, 1, false);
    else if (c === "|" && n === "|") i += cut(i, 2, false);
    else if (c === "|" && p !== ">") i += cut(i, n === "&" ? 2 : 1, true);
  }
  out.push([start, s.length, piped]);
  return out;
}

/**
 * Does a wrapper run `git commit`? The loose re-scan covers only text that
 * wrapper can execute. It once covered the whole command whenever a wrapper
 * appeared anywhere, so a quoted JSON dry-run payload mentioning `git commit`
 * on one line plus an unrelated `sh -c` on the next was denied (GATE-07).
 *
 * The scope is the wrapper's own simple command, not just its `-c` argument:
 * finding that argument means parsing each shell's flags (`-lc`, `-o pipefail
 * -c`) with a regex — the unwinnable game v3 walked away from. It widens, and
 * never narrows, where stdin can carry commands in: piped into (`… | sh`) it
 * covers everything before, since a group, subshell or loop upstream can feed
 * it; with a here-doc (`sh <<EOF`) it covers everything after, where the body is.
 */
function wrapperRunsCommit() {
  for (const [start, end, piped] of simpleCommands(masked)) {
    const own = masked.slice(start, end);
    if (!WRAPPER.test(own)) continue;
    const scope = unquoted.slice(piped ? 0 : start, own.includes("<<") ? masked.length : end);
    if (GIT_COMMIT_LOOSE.test(scope)) return true;
  }
  return false;
}

if (!(GIT_COMMIT.test(stripped) || wrapperRunsCommit())) {
  allow();
}

const cwd = input.cwd || process.cwd();
const repoRoot = git(["rev-parse", "--show-toplevel"], cwd) || cwd;

/** Only gate repos that asked for it — rule 3. */
if (
  !(
    process.env.OPCHAIN_GATE === "1" ||
    fs.existsSync(path.join(repoRoot, ".checkpoints")) ||
    fs.existsSync(path.join(repoRoot, ".opchain"))
  )
) {
  allow();
}

// Explicit, logged bypass — matched on `stripped`, in argument position, so a
// commit message mentioning the flag cannot trigger it (GATE-01b).
if (/(?:^|\s)(?:--no-verify|OPCHAIN_BYPASS=1)(?:\s|$)/.test(stripped)) {
  process.stderr.write("[opchain] ⚠ commit gate bypassed explicitly (--no-verify / OPCHAIN_BYPASS=1)\n");
  allow();
}

// ── read the bug-check verdict ──────────────────────────────────────────────
const cpPath = path.join(repoRoot, ".checkpoints", "oc-bug-check.checkpoint.json");

const INVOKE =
  'Run the gate, then retry:\n\n    Skill(skill="oc-bug-check", args="/oc-bugcheck run")\n\n' +
  "If it returns PASS the commit proceeds. If FAIL, fix what it surfaces. If\n" +
  "UNSUPPORTED, the gate could not read this stack — that is not a pass; either\n" +
  "add stack support or bypass deliberately with `git commit --no-verify`.";

if (!fs.existsSync(cpPath)) {
  deny(`opchain: oc-bug-check has not run in this repo, so this commit is unverified.\n\n${INVOKE}`);
}

let cp;
try {
  cp = JSON.parse(fs.readFileSync(cpPath, "utf8"));
} catch (e) {
  deny(`opchain: .checkpoints/oc-bug-check.checkpoint.json is not valid JSON (${e.message}).\n\n${INVOKE}`);
}
if (!cp || typeof cp !== "object" || Array.isArray(cp)) {
  deny(`opchain: .checkpoints/oc-bug-check.checkpoint.json is not a JSON object.\n\n${INVOKE}`);
}

const st = (cp.skill_state && typeof cp.skill_state === "object" && cp.skill_state) || {};

// The verdict is recorded in up to three places: `last_run_verdict` (the flat
// field this gate reads first), `verdict`, and `last_run.verdict` (the detailed
// record oc-bug-check's SKILL.md has always documented, and all the retired
// repo-local gate read). Any of them counts, but every one present must agree —
// a checkpoint saying PASS in one field and FAIL in another is not evidence of
// a pass (RULE 0). Without this, a stale flat PASS could outvote a fresh FAIL.
const lastRun = (st.last_run && typeof st.last_run === "object" && st.last_run) || {};
const recorded = [
  ...new Set(
    [st.last_run_verdict, st.verdict, lastRun.verdict]
      .filter((v) => v !== undefined && v !== null && v !== "")
      .map((v) => String(v).toUpperCase()),
  ),
];

if (recorded.includes("UNSUPPORTED")) {
  deny(
    "opchain: oc-bug-check returned UNSUPPORTED — it did not recognize this stack,\n" +
      "so types, lint, tests and build were never run. An absence of findings is not\n" +
      "a pass.\n\nAdd stack support (skills/oc-bug-check/SKILL.md § Stack-Specific\n" +
      "Adaptations) or bypass deliberately with `git commit --no-verify`.",
  );
}
if (recorded.length > 1) {
  deny(
    `opchain: the oc-bug-check checkpoint records conflicting verdicts (${recorded.join(", ")}),\n` +
      "so it is not evidence of a PASS.\n\n" +
      INVOKE,
  );
}
if (recorded[0] !== "PASS") {
  deny(`opchain: last oc-bug-check verdict was ${recorded[0] || "(none recorded)"}, not PASS.\n\n${INVOKE}`);
}

// ── an unknowable time is not evidence (GATE-05) ────────────────────────────
const ts = Date.parse(cp.updated_at || "");
if (Number.isNaN(ts)) {
  deny(
    "opchain: the oc-bug-check checkpoint records a PASS but no readable `updated_at`,\n" +
      "so there is no way to tell when — or whether — it ran.\n\n" +
      INVOKE,
  );
}

// ── the tree is mandatory at every age (GATE-06) ────────────────────────────
// Recency is not coverage: a PASS recorded one minute ago says nothing about a
// file edited thirty seconds ago. Only the tree hash can say that.
const verifiedTree = st.verified_tree || st.verified_for_tree || null;
if (!verifiedTree) {
  deny(
    "opchain: oc-bug-check recorded a PASS but no `skill_state.verified_tree`, so there is\n" +
      "no way to tell whether it covered the code you are committing — however recently\n" +
      "it ran. The run must record the tree hash alongside the verdict\n" +
      "(skills/oc-bug-check/SKILL.md § Commit gate contract).\n\n" +
      INVOKE,
  );
}

// ── bind the verdict to the FULL working-tree state ─────────────────────────
/**
 * v2 tried to PREDICT what a command would stage — parse the shell, classify
 * `-a` vs pathspec vs `git add … &&`, hash a matching scratch index. A re-audit
 * broke it three ways in a day (`git add <path> && commit`, `-C <ref>`,
 * `--fixup`). Predicting arbitrary bash with a regex is unwinnable, and every
 * missed form fails OPEN.
 *
 * v3 stops predicting. It binds the PASS to the ENTIRE current state of the
 * repo — every tracked modification and every untracked, non-ignored file —
 * computed as `git add -A` in a throwaway index. The invariant:
 *
 *     if the full working state equals what oc-bug-check verified, then NO
 *     commit form can introduce unverified content, because there is none
 *     present to introduce — staged, unstaged, or brand-new.
 *
 * This is airtight against `-a`, `-am`, pathspecs, `git add <anything> &&`,
 * `--fixup`, and forms not yet invented, because it never inspects the command
 * at all. The cost is a stricter contract: the tree must be clean relative to
 * what was verified. That is the honest meaning of "bug-check passed on this
 * code" — and oc-bug-check records `verified_tree` the same way (`git add -A`),
 * so a plain `/oc-bugcheck` run followed by an immediate commit still passes.
 */
function fullWorkingTree() {
  const scratch = path.join(os.tmpdir(), `opchain-idx-${process.pid}-${Date.now()}`);
  try {
    const rel = git(["rev-parse", "--git-path", "index"], repoRoot);
    const realIdx = rel && path.isAbsolute(rel) ? rel : path.join(repoRoot, rel || ".git/index");
    if (fs.existsSync(realIdx)) fs.copyFileSync(realIdx, scratch);
    const env = { GIT_INDEX_FILE: scratch }; // isolates all writes from the real index
    if (!fs.existsSync(scratch) && git(["read-tree", "HEAD"], repoRoot, env) === null) return null;
    if (git(["add", "-A", "--", "."], repoRoot, env) === null) return null;
    return git(["write-tree"], repoRoot, env);
  } finally {
    try {
      fs.rmSync(scratch, { force: true });
    } catch {
      /* scratch cleanup is best-effort */
    }
  }
}

const actual = fullWorkingTree();

// RULE 0: if we cannot hash the state, we cannot claim it was verified.
if (!actual) {
  deny(
    "opchain: could not hash the working tree (unmerged index, index.lock held, or\n" +
      "git unavailable), so the recorded PASS cannot be bound to this commit. Resolve\n" +
      "the repo state and retry, or bypass with `git commit --no-verify`.",
  );
}

if (verifiedTree !== actual) {
  deny(
    "opchain: the repo has changed since oc-bug-check passed, so the PASS does not\n" +
      "cover what you are about to commit.\n\n" +
      `    verified:      ${String(verifiedTree).slice(0, 12)}\n` +
      `    working tree:  ${String(actual).slice(0, 12)}\n\n` +
      "Some tracked or untracked file differs from the state that was checked. (If\n" +
      "nothing changed, the tree was recorded wrongly — it must be the full working\n" +
      "tree, not bare `git write-tree`; see oc-bug-check § Commit gate contract.)\n" +
      "Re-run the gate so the verdict covers the current code:\n\n" +
      INVOKE,
  );
}

allow();
