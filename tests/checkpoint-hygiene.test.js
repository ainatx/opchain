// Offline replay of the Stop hook .claude/hooks/checkpoint-hygiene.sh against
// fixture transcripts (JSONL assistant tool_use events) with a fake
// $CLAUDE_PROJECT_DIR. Covers the 2026-10-08 audit fixes (I-06, Q5-F5, H4-7):
// repo scoping, the one-shot decline, gate-skill handoff satisfaction, the
// $CLAUDE_PROJECT_DIR / cwd-fallback resolution and the incremental offset.
//
// The hook runs under whatever `bash` is on PATH — bash 3.2 on macOS — so this
// suite is also the bash-3.2 compatibility check.
import { describe, it, expect, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, appendFileSync, statSync, existsSync, readdirSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const REPO = join(import.meta.dirname, "..");
const HOOK = join(REPO, ".claude", "hooks", "checkpoint-hygiene.sh");
const RELEASE_EVIDENCE = join(REPO, "scripts", "lib", "release-evidence.mjs");
const hasJq = spawnSync("jq", ["--version"], { encoding: "utf8" }).status === 0;

const scratch = [];
afterAll(() => scratch.forEach((d) => rmSync(d, { recursive: true, force: true })));

function git(args, cwd) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
  return r.stdout.trim();
}

/** A scratch project: git repo with one commit, an empty .checkpoints/, a tmp dir
 *  for the hook's marker, and a transcript path. */
function project() {
  const root = mkdtempSync(join(tmpdir(), "oc-hygiene-"));
  scratch.push(root);
  git(["init", "-q", "-b", "main"], root);
  git(["config", "user.email", "t@t"], root);
  git(["config", "user.name", "t"], root);
  writeFileSync(join(root, "README.md"), "x\n");
  git(["add", "-A"], root);
  git(["-c", "core.hooksPath=/dev/null", "commit", "-qm", "init"], root);
  mkdirSync(join(root, ".checkpoints"));
  const tmp = join(root, ".tmp");
  mkdirSync(tmp);
  return { root, tmp, transcript: join(root, "transcript.jsonl") };
}

const T0 = "2026-10-08T10:00:00.000Z";
const T1 = "2026-10-08T10:01:00.000Z";
const T2 = "2026-10-08T10:02:00.000Z";
const BEFORE = "2026-10-08T09:00:00.000Z";

function event(ts, cwd, toolUse) {
  return JSON.stringify({
    type: "assistant",
    timestamp: ts,
    cwd,
    sessionId: "fixture",
    message: { role: "assistant", content: [{ type: "text", text: "…" }, { type: "tool_use", id: "t", ...toolUse }] },
  });
}
const skillCall = (ts, cwd, skill) => event(ts, cwd, { name: "Skill", input: { skill, args: "" } });
const writeCall = (ts, cwd, file_path) => event(ts, cwd, { name: "Write", input: { file_path, content: "x" } });
const bashCall = (ts, cwd, command) => event(ts, cwd, { name: "Bash", input: { command } });
// A user line that mentions tool_use/assistant in prose must not confuse the pre-filter.
const userNoise = JSON.stringify({ type: "user", timestamp: T0, message: { role: "user", content: 'the "assistant" made a "tool_use" earlier' } });

function transcript(p, lines) {
  writeFileSync(p.transcript, `${lines.join("\n")}\n`);
}

function checkpoint(skill, extra = {}) {
  return {
    protocol_version: "1.1",
    skill,
    project: "t",
    project_dir: "/nowhere",
    created_at: BEFORE,
    updated_at: BEFORE,
    record_updated_at: BEFORE,
    phase: "p",
    step: "s",
    status: "complete",
    progress_summary: "summary.",
    ...extra,
  };
}

function runHook(p, { sessionId = "sess-1", cwd = p.root, projectDir = p.root, stopHookActive = false, home = process.env.HOME } = {}) {
  const env = { ...process.env, OPCHAIN_SKILLS_DIR: join(REPO, "skills"), TMPDIR: p.tmp, HOME: home };
  if (projectDir === null) delete env.CLAUDE_PROJECT_DIR;
  else env.CLAUDE_PROJECT_DIR = projectDir;
  const input = JSON.stringify({ session_id: sessionId, transcript_path: p.transcript, cwd, hook_event_name: "Stop", stop_hook_active: stopHookActive });
  const r = spawnSync("bash", [HOOK], { input, encoding: "utf8", env, cwd });
  let decision = null;
  if (r.stdout.trim()) decision = JSON.parse(r.stdout);
  return { code: r.status, stdout: r.stdout, stderr: r.stderr, decision, marker: join(p.tmp, `opchain-hygiene-${sessionId}.json`) };
}

/** A linked worktree of `p` where the desktop app puts them: <root>/.claude/worktrees/<name>. */
function nestedWorktree(p, name) {
  const dir = join(p.root, ".claude", "worktrees", name);
  git(["worktree", "add", "-q", "-b", `wt-${name}`, dir], p.root);
  mkdirSync(join(dir, ".checkpoints"));
  return dir;
}

/** A scratch $HOME holding another project's checkout at <home>/<rel> (one commit,
 *  an empty .checkpoints/), like ~/deftwright-site-worktrees/<wt>. */
function otherRepo(rel) {
  const home = mkdtempSync(join(tmpdir(), "oc-hygiene-home-"));
  scratch.push(home);
  const root = join(home, rel);
  mkdirSync(root, { recursive: true });
  git(["init", "-q", "-b", "main"], root);
  git(["config", "user.email", "t@t"], root);
  git(["config", "user.name", "t"], root);
  writeFileSync(join(root, "README.md"), "other\n");
  git(["add", "-A"], root);
  git(["-c", "core.hooksPath=/dev/null", "commit", "-qm", "init"], root);
  mkdirSync(join(root, ".checkpoints"));
  return { home, root };
}

function candidateOf(root) {
  const r = spawnSync("node", [RELEASE_EVIDENCE, "--repo", root, "--print-candidate", "--json"], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr);
  return JSON.parse(r.stdout);
}

describe.skipIf(!hasJq)("checkpoint-hygiene Stop hook", () => {
  it("(i) skill invoked, writes only outside the repo → no block", () => {
    const p = project();
    transcript(p, [
      userNoise,
      skillCall(T0, p.root, "oc-code-auditor"),
      writeCall(T1, p.root, "/Users/someone/repos/deftwright-site/docs/market-research.md"),
      bashCall(T1, p.root, "cd /Users/someone/repos/deftwright-site && npm test"),
    ]);
    const r = runHook(p);
    expect(r.code).toBe(0);
    expect(r.stdout).toBe("");
    expect(r.stderr).toBe("");
  });

  it("(ii) writes inside the repo with no checkpoint → block with the exact CLI", () => {
    const p = project();
    transcript(p, [
      skillCall(T0, p.root, "opchain:oc-code-auditor"),
      writeCall(T1, p.root, join(p.root, "docs", "audit.md")),
    ]);
    const r = runHook(p);
    expect(r.code).toBe(0);
    expect(r.decision?.decision).toBe("block");
    expect(r.decision.reason).toContain("  - oc-code-auditor");
    expect(r.decision.reason).toContain("node scripts/checkpoint.mjs update <skill>");
    expect(r.decision.reason).toContain(`--next_actions:json='["<the next concrete action>"]'`);
    expect(r.decision.reason).toContain(p.root);
    // A non-gate skill gets no handoff hint.
    expect(r.decision.reason).not.toContain("checkpoint.mjs handoff");
  });

  it("a Bash `git -C <repo>` target after the invocation counts as work in this repo", () => {
    const p = project();
    transcript(p, [
      skillCall(T0, p.root, "oc-code-auditor"),
      bashCall(T1, "/elsewhere", `git -C ${p.root} status --short`),
    ]);
    expect(runHook(p).decision?.decision).toBe("block");
  });

  it("a relative Write path resolves against the event cwd", () => {
    const p = project();
    transcript(p, [
      skillCall(T0, p.root, "oc-code-auditor"),
      writeCall(T1, p.root, "docs/notes.md"),
    ]);
    expect(runHook(p).decision?.decision).toBe("block");
  });

  it("a current-run checkpoint (record_updated_at ≥ invocation) satisfies it", () => {
    const p = project();
    transcript(p, [skillCall(T0, p.root, "oc-code-auditor"), writeCall(T1, p.root, join(p.root, "x.md"))]);
    writeFileSync(join(p.root, ".checkpoints", "oc-code-auditor.checkpoint.json"),
      JSON.stringify(checkpoint("oc-code-auditor", { updated_at: T2, record_updated_at: T2 })));
    const r = runHook(p);
    expect(r.code).toBe(0);
    expect(r.stdout).toBe("");
  });

  it("(iii) blocks twice for the same skill set, then declines once with a stderr note", () => {
    const p = project();
    transcript(p, [skillCall(T0, p.root, "oc-code-auditor"), writeCall(T1, p.root, join(p.root, "x.md"))]);
    const first = runHook(p, { sessionId: "sess-decline" });
    const second = runHook(p, { sessionId: "sess-decline" });
    const third = runHook(p, { sessionId: "sess-decline" });
    expect(first.decision?.decision).toBe("block");
    expect(second.decision?.decision).toBe("block");
    expect(third.code).toBe(0);
    expect(third.stdout).toBe("");
    expect(third.stderr).toContain("already blocked twice this session for oc-code-auditor");
    const marker = JSON.parse(readFileSync(third.marker, "utf8"));
    expect(marker.blocks["oc-code-auditor"]).toBe(2);
    // A different session is a fresh count.
    expect(runHook(p, { sessionId: "sess-other" }).decision?.decision).toBe("block");
  });

  it("(iv) a gate skill with a PASS handoff bound to the current candidate is satisfied; a stale binding is not", () => {
    const p = project();
    transcript(p, [skillCall(T0, p.root, "oc-docs-forge"), writeCall(T1, p.root, join(p.root, "README.md"))]);
    const cand = candidateOf(p.root);
    const handoff = (id) => ({
      id: `oc-docs-forge-pr-docs-v1-${id.slice(7, 19)}`,
      contract_version: "1.0",
      type: "verification.verdict",
      created_at: BEFORE,
      verified_at: BEFORE,
      producer: { skill: "oc-docs-forge", run_id: "fixture" },
      candidate: { kind: "git_tree_projection", id },
      payload: { verdict: "PASS", policy: "pr-docs-v1", scope: "fixture" },
    });
    const file = join(p.root, ".checkpoints", "oc-docs-forge.checkpoint.json");

    // record_updated_at predates the invocation, so only the handoff can satisfy it.
    writeFileSync(file, JSON.stringify(checkpoint("oc-docs-forge", { handoffs: [handoff(`sha256:${"0".repeat(64)}`)] })));
    const stale = runHook(p, { sessionId: "gate-stale" });
    expect(stale.decision?.decision).toBe("block");
    expect(stale.decision.reason).toContain("node scripts/checkpoint.mjs handoff oc-docs-forge --policy pr-docs-v1 --verdict PASS");

    writeFileSync(file, JSON.stringify(checkpoint("oc-docs-forge", { handoffs: [handoff(cand.candidate_identity.id)] })));
    const bound = runHook(p, { sessionId: "gate-bound" });
    expect(bound.code).toBe(0);
    expect(bound.stdout).toBe("");
  });

  it("(iv-b) a PASS in the per-branch handoff store satisfies a gate skill with no shared checkpoint at all", () => {
    const p = project();
    transcript(p, [skillCall(T0, p.root, "oc-docs-forge"), writeCall(T1, p.root, join(p.root, "README.md"))]);
    const cand = candidateOf(p.root);
    const stored = (skill, id) => ({
      id: `${skill}-pr-docs-v1-${id.slice(7, 19)}`,
      contract_version: "1.0",
      type: "verification.verdict",
      created_at: BEFORE,
      verified_at: BEFORE,
      producer: { skill, run_id: "fixture" },
      candidate: { kind: "git_tree_projection", id },
      payload: { verdict: "PASS", policy: "pr-docs-v1", scope: "fixture" },
    });
    const dir = join(p.root, ".checkpoints", "handoffs", "pr-docs-v1", "claude");
    mkdirSync(dir, { recursive: true });
    const file = join(dir, "feature.json");
    expect(existsSync(join(p.root, ".checkpoints", "oc-docs-forge.checkpoint.json"))).toBe(false);

    // Another skill's verdict, or one bound to another candidate, is not this skill's evidence.
    writeFileSync(file, JSON.stringify(stored("oc-repo-ops", cand.candidate_identity.id)));
    expect(runHook(p, { sessionId: "store-other-skill" }).decision?.decision).toBe("block");
    writeFileSync(file, JSON.stringify(stored("oc-docs-forge", `sha256:${"0".repeat(64)}`)));
    const stale = runHook(p, { sessionId: "store-stale" });
    expect(stale.decision?.decision).toBe("block");
    expect(stale.decision.reason).toContain(".checkpoints/handoffs/<policy>/<branch>.json");

    writeFileSync(file, JSON.stringify(stored("oc-docs-forge", cand.candidate_identity.id)));
    const bound = runHook(p, { sessionId: "store-bound" });
    expect(bound.code).toBe(0);
    expect(bound.stdout).toBe("");
  });

  it("without $CLAUDE_PROJECT_DIR, a cwd in some other checkout is not policed", () => {
    const p = project();
    transcript(p, [skillCall(T0, p.root, "oc-code-auditor"), writeCall(T1, p.root, join(p.root, "x.md"))]);
    const r = runHook(p, { projectDir: null, cwd: p.root });
    expect(r.code).toBe(0);
    expect(r.stdout).toBe("");
    expect(r.stderr).toBe("");
  });

  it("stop_hook_active short-circuits", () => {
    const p = project();
    transcript(p, [skillCall(T0, p.root, "oc-code-auditor"), writeCall(T1, p.root, join(p.root, "x.md"))]);
    const r = runHook(p, { stopHookActive: true });
    expect(r.code).toBe(0);
    expect(r.stdout).toBe("");
  });

  it("reads the transcript incrementally from the cached offset", () => {
    const p = project();
    transcript(p, [skillCall(T0, p.root, "oc-code-auditor"), writeCall(T1, "/elsewhere", "/elsewhere/notes.md")]);
    const first = runHook(p, { sessionId: "incr" });
    expect(first.stdout).toBe("");
    expect(existsSync(first.marker)).toBe(true);
    expect(JSON.parse(readFileSync(first.marker, "utf8")).offset).toBe(statSync(p.transcript).size);

    // Later in the same session the skill's work lands in this repo.
    appendFileSync(p.transcript, `${writeCall(T2, p.root, join(p.root, "docs", "later.md"))}\n`);
    const second = runHook(p, { sessionId: "incr" });
    expect(second.decision?.decision).toBe("block");
    expect(JSON.parse(readFileSync(second.marker, "utf8")).offset).toBe(statSync(p.transcript).size);
  });

  it("a Bash `cd` into a nested .claude/worktrees/<name> checkout is not work in the outer checkout", () => {
    const p = project();
    const wt = nestedWorktree(p, "x");
    transcript(p, [
      skillCall(T0, p.root, "oc-app-architect"),
      bashCall(T1, p.root, `cd ${wt} && git status --short`),
      writeCall(T1, wt, join(wt, "docs", "spec.md")),
    ]);
    const r = runHook(p, { sessionId: "nested-cd" });
    expect(r.code).toBe(0);
    expect(r.stdout).toBe("");
    // The outer checkout is still policed for its own work.
    appendFileSync(p.transcript, `${writeCall(T2, p.root, join(p.root, "docs", "outer.md"))}\n`);
    const outer = runHook(p, { sessionId: "nested-cd" });
    expect(outer.decision?.decision).toBe("block");
    expect(outer.decision.reason).toContain(`worked in ${p.root}, `);
  });

  it("a session whose cwd is the nested worktree is held to the worktree's checkpoint, not the outer checkout's (2026-10-19)", () => {
    const p = project();
    const wt = nestedWorktree(p, "blissful");
    transcript(p, [
      skillCall(T0, wt, "oc-app-architect"),
      bashCall(T1, wt, `cd ${wt} && npm test`),
      writeCall(T1, wt, join(wt, "docs", "plan.md")),
    ]);
    const missing = runHook(p, { sessionId: "wt-missing", cwd: wt });
    expect(missing.decision?.decision).toBe("block");
    expect(missing.decision.reason).toContain(`worked in ${wt}, `);

    writeFileSync(join(wt, ".checkpoints", "oc-app-architect.checkpoint.json"),
      JSON.stringify(checkpoint("oc-app-architect", { updated_at: T2, record_updated_at: T2 })));
    const current = runHook(p, { sessionId: "wt-current", cwd: wt });
    expect(current.code).toBe(0);
    expect(current.stdout).toBe("");
    expect(existsSync(join(p.root, ".checkpoints", "oc-app-architect.checkpoint.json"))).toBe(false);
  });

  it("a nested checkout outside .claude/worktrees/ is attributed by its git toplevel", () => {
    const p = project();
    const nested = join(p.root, "vendor", "other");
    mkdirSync(nested, { recursive: true });
    git(["init", "-q"], nested);
    transcript(p, [
      skillCall(T0, p.root, "oc-code-auditor"),
      writeCall(T1, p.root, join(nested, "src", "new-dir", "a.js")),
      bashCall(T1, p.root, `git -C ${nested} status`),
    ]);
    const r = runHook(p);
    expect(r.code).toBe(0);
    expect(r.stdout).toBe("");
  });

  it("a removed nested worktree still counts as another checkout", () => {
    const p = project();
    const gone = join(p.root, ".claude", "worktrees", "gone");
    transcript(p, [
      skillCall(T0, p.root, "oc-code-auditor"),
      bashCall(T1, p.root, `cd "${gone}" && npm test`),
      writeCall(T1, gone, "notes.md"),
      bashCall(T1, p.root, `cd ${join(p.root, "docs")}/../.claude/worktrees/gone`),
    ]);
    const r = runHook(p);
    expect(r.code).toBe(0);
    expect(r.stdout).toBe("");
  });

  it("re-reads the transcript when the session's cwd moves to another checkout", () => {
    const p = project();
    const wt = nestedWorktree(p, "moved");
    transcript(p, [skillCall(T0, wt, "oc-code-auditor"), writeCall(T1, wt, join(wt, "x.md"))]);
    expect(runHook(p, { sessionId: "moved", cwd: wt }).decision?.decision).toBe("block");
    // Judged against the outer checkout, the same transcript holds no work there.
    const outer = runHook(p, { sessionId: "moved", cwd: p.root });
    expect(outer.code).toBe(0);
    expect(outer.stdout).toBe("");
  });

  it("exempt skills are never demanded", () => {
    const p = project();
    transcript(p, [skillCall(T0, p.root, "oc-update"), skillCall(T0, p.root, "oc-orchestrator"), writeCall(T1, p.root, join(p.root, "x.md"))]);
    const r = runHook(p);
    expect(r.code).toBe(0);
    expect(r.stdout).toBe("");
  });

  // 2026-10-22: a session in an opchain worktree ran five skills against a Deftwright
  // worktree with `cd ~/deftwright-site-worktrees/<wt> && …`, and their checkpoints
  // landed in that repo's .checkpoints/. `~` was absolutized against the session cwd,
  // so the hook blocked twice demanding opchain checkpoints for all five.
  it("skills that worked in another repo via `cd ~/…` are never asked for a checkpoint here (2026-10-22)", () => {
    const p = project();
    const other = otherRepo("deftwright-site-worktrees/wt");
    const skills = ["oc-app-architect", "oc-bug-check", "oc-code-auditor", "oc-git-ops", "oc-ux-engineer"];
    transcript(p, [
      ...skills.map((s) => skillCall(T0, p.root, `opchain:${s}`)),
      bashCall(T1, p.root, "cd ~/deftwright-site-worktrees/wt && npm test"),
      bashCall(T1, p.root, "cd ~/deftwright-site-worktrees/wt && git add -A && git commit -m wip"),
      bashCall(T1, p.root, `cd ~/deftwright-site-worktrees/wt && OPCHAIN_ROOT=$PWD node ${REPO}/scripts/checkpoint.mjs update oc-git-ops --status=complete`),
    ]);
    const r = runHook(p, { sessionId: "cross-repo", home: other.home });
    expect(r.code).toBe(0);
    expect(r.stdout).toBe("");
    expect(r.stderr).toBe("");
    const marker = JSON.parse(readFileSync(r.marker, "utf8"));
    for (const s of skills) expect(marker.skills[s].repos).toEqual([realpathSync(other.root)]);
    expect(readdirSync(join(p.root, ".checkpoints"))).toEqual([]);
  });

  it("a skill that worked here and elsewhere is satisfied by a current-run checkpoint in the other repo", () => {
    const p = project();
    const other = otherRepo("deftwright-site-worktrees/wt");
    transcript(p, [
      skillCall(T0, p.root, "oc-code-auditor"),
      bashCall(T1, p.root, "cd ~/deftwright-site-worktrees/wt && npm run lint"),
      // Unrelated work in this repo later in the same session.
      writeCall(T1, p.root, join(p.root, "docs", "notes.md")),
    ]);
    const missing = runHook(p, { sessionId: "both-missing", home: other.home });
    expect(missing.decision?.decision).toBe("block");
    expect(missing.decision.reason).toContain(`  - oc-code-auditor (it also worked in ${realpathSync(other.root)}; a current-run checkpoint there satisfies this too)`);
    expect(missing.decision.reason).toContain("Never copy another project's state into these checkpoints");

    writeFileSync(join(other.root, ".checkpoints", "oc-code-auditor.checkpoint.json"),
      JSON.stringify(checkpoint("oc-code-auditor", { updated_at: T2, record_updated_at: T2 })));
    const satisfied = runHook(p, { sessionId: "both-satisfied", home: other.home });
    expect(satisfied.code).toBe(0);
    expect(satisfied.stdout).toBe("");
    expect(existsSync(join(p.root, ".checkpoints", "oc-code-auditor.checkpoint.json"))).toBe(false);
  });

  it("a gate skill's PASS handoff bound to the other repo's candidate satisfies it; OPCHAIN_ROOT names that repo", () => {
    const p = project();
    const other = otherRepo("dw");
    transcript(p, [
      skillCall(T0, p.root, "oc-docs-forge"),
      writeCall(T1, p.root, join(p.root, "README.md")),
      // The checkpoint CLI run from this repo's cwd, writing the other repo's state.
      bashCall(T1, p.root, "OPCHAIN_ROOT=~/dw node scripts/checkpoint.mjs handoff oc-docs-forge --policy pr-docs-v1 --verdict PASS"),
    ]);
    const handoff = (id) => ({
      id: `oc-docs-forge-pr-docs-v1-${id.slice(7, 19)}`,
      contract_version: "1.0",
      type: "verification.verdict",
      created_at: BEFORE,
      verified_at: BEFORE,
      producer: { skill: "oc-docs-forge", run_id: "fixture" },
      candidate: { kind: "git_tree_projection", id },
      payload: { verdict: "PASS", policy: "pr-docs-v1", scope: "fixture" },
    });
    const file = join(other.root, ".checkpoints", "oc-docs-forge.checkpoint.json");
    // record_updated_at predates the invocation, so only the handoff can satisfy it.
    writeFileSync(file, JSON.stringify(checkpoint("oc-docs-forge", { handoffs: [handoff(candidateOf(p.root).candidate_identity.id)] })));
    const wrongRepo = runHook(p, { sessionId: "gate-other-wrong", home: other.home });
    expect(wrongRepo.decision?.decision).toBe("block");

    writeFileSync(file, JSON.stringify(checkpoint("oc-docs-forge", { handoffs: [handoff(candidateOf(other.root).candidate_identity.id)] })));
    const bound = runHook(p, { sessionId: "gate-other-bound", home: other.home });
    expect(bound.code).toBe(0);
    expect(bound.stdout).toBe("");
  });

  it("relative targets follow the command's own `cd`; unresolvable ones are dropped, never pinned on the session cwd", () => {
    const p = project();
    const other = otherRepo("dw");
    transcript(p, [
      skillCall(T0, p.root, "oc-git-ops"),
      bashCall(T1, p.root, "cd ~/dw && git -C . status && cd docs && git -C .. log -1"),
      bashCall(T1, p.root, 'WT=~/dw; cd "$WT" && git -C . status'),
      bashCall(T1, p.root, "cd $(git -C ~/dw rev-parse --show-toplevel) && cd -P sub"),
      bashCall(T1, p.root, "if [ -d ~/dw ]; then cd ~/dw; git -C . status; fi"),
      bashCall(T1, p.root, "cd -"),
    ]);
    const r = runHook(p, { sessionId: "relative", home: other.home });
    expect(r.code).toBe(0);
    expect(r.stdout).toBe("");
    expect(JSON.parse(readFileSync(r.marker, "utf8")).skills["oc-git-ops"].repos).toEqual([realpathSync(other.root)]);
  });

  it("a Write/Edit path is literal: a `$` in a file name is not a shell variable", () => {
    const p = project();
    transcript(p, [skillCall(T0, p.root, "oc-code-auditor"), writeCall(T1, p.root, join(p.root, "app", "routes", "posts.$slug.tsx"))]);
    expect(runHook(p).decision?.decision).toBe("block");
  });

  it("`~` expands to $HOME, so `cd ~/<this repo>` is still work here", () => {
    const p = project();
    transcript(p, [skillCall(T0, p.root, "oc-code-auditor"), bashCall(T1, "/elsewhere", `cd ~/${basename(p.root)} && npm test`)]);
    const r = runHook(p, { home: dirname(p.root) });
    expect(r.decision?.decision).toBe("block");
    expect(r.decision.reason).toContain("  - oc-code-auditor\n");
  });
});
