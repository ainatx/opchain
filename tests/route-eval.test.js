// The skill-router evaluation harness (scripts/route-eval.mjs).
//
// Two halves. `build-dataset` turns Claude Code transcripts into labelled
// prompt rows; the cases below are the ways a label could be wrong — a slash
// command or task notification counted as a human prompt, a subagent file
// scanned as a session, an `opchain:` prefix left on a skill id, a git commit
// not recognised as implied oc-git-ops. `run` routes those rows and writes a
// report; its cases pin the precision/recall arithmetic and the no-re-query
// cache, using a fake route module so nothing here depends on the real router
// (plugins/opchain/hooks/lib/route-dispatch.cjs) or on an API key.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  allowlistSuppression,
  buildDataset,
  formatDatasetSummary,
  computeMetrics,
  DEFAULTS,
  describeThresholds,
  readOutcomeRecords,
  floorSweep,
  pOf,
  readLabels,
  readRouteRecords,
  renderOutcomesReport,
  scoreRoutes,
  transcriptIndex,
  rowHash,
  summarizeOutcomes,
  deriveLabel,
  humanPromptText,
  renderReport,
  rowsFromRecords,
  runEval,
  stratifiedSample,
  suggestedAt,
  thresholdSweep,
  usageFromTrace,
  FileCache,
} from "../scripts/route-eval.mjs";

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SCRIPT = join(REPO_ROOT, "scripts", "route-eval.mjs");

// ---------------------------------------------------------------------------
// Transcript fixture builders
// ---------------------------------------------------------------------------

let t = 0;
const stamp = (dayOffset = 0) => new Date(Date.UTC(2026, 9, 1 + dayOffset, 12, 0, t++)).toISOString();

const base = (cwd, branch, extra = {}) => ({ cwd, gitBranch: branch, uuid: `u${t}`, sessionId: "s", ...extra });

function user(text, cwd, branch, extra = {}) {
  return { type: "user", timestamp: stamp(extra.dayOffset ?? 0), message: { role: "user", content: text }, ...base(cwd, branch), ...extra };
}
function userParts(parts, cwd, branch, extra = {}) {
  return { type: "user", timestamp: stamp(), message: { role: "user", content: parts }, ...base(cwd, branch), ...extra };
}
function assistant(parts, cwd, branch, extra = {}) {
  return { type: "assistant", timestamp: stamp(), message: { role: "assistant", model: "claude-test", content: parts, usage: { input_tokens: 10, output_tokens: 5 } }, ...base(cwd, branch), ...extra };
}
const text = (s) => ({ type: "text", text: s });
const toolUse = (name, input) => ({ type: "tool_use", id: `tu${t++}`, name, input });
const toolResult = (content) => ({ type: "tool_result", tool_use_id: "tu0", content });

function writeSession(root, projectDir, session, records) {
  mkdirSync(join(root, projectDir), { recursive: true });
  writeFileSync(join(root, projectDir, `${session}.jsonl`), records.map((r) => JSON.stringify(r)).join("\n") + "\n");
}

const DW = "/Users/me/deftwright-site";
const OC = "/Users/me/repos/opchain/.claude/worktrees/fix-x";

function buildFixtureCorpus(root) {
  // Session 1 — explicit Skill call (with the plugin prefix), then a duplicate prompt.
  writeSession(root, "-Users-me-deftwright-site", "s1", [
    user("audit the checkout flow for correctness", DW, "feat/checkout"),
    assistant([text("Running the auditor.")], DW, "feat/checkout"),
    assistant([toolUse("Skill", { skill: "opchain:oc-code-auditor", args: "/oc-audit checkout" })], DW, "feat/checkout"),
    userParts([toolResult("audit output")], DW, "feat/checkout"),
    assistant([text("Done.")], DW, "feat/checkout"),
    user("audit the checkout flow for correctness", DW, "feat/checkout"), // duplicate — dropped
    assistant([toolUse("Skill", { skill: "oc-bug-check" })], DW, "feat/checkout"),
  ]);

  // Session 2 — implied labels from Bash commands; a Bash non-match first.
  writeSession(root, "-Users-me-deftwright-site", "s2", [
    user("commit this and open a PR", DW, "feat/pr"),
    assistant([toolUse("Bash", { command: "git status --short" })], DW, "feat/pr"),
    assistant([toolUse("Bash", { command: 'git commit -m "feat: thing"' })], DW, "feat/pr"),
    assistant([toolUse("Bash", { command: "gh pr create --fill" })], DW, "feat/pr"),
    user("ship it to staging", DW, "feat/pr"),
    assistant([toolUse("Bash", { command: "npm run deploy:staging" })], DW, "feat/pr"),
  ]);

  // Session 3 — things that are NOT human prompts, around one real `none` prompt
  // and one pre-cutoff prompt.
  writeSession(root, "-Users-me-repos-opchain--claude-worktrees-fix-x", "s3", [
    user("<command-message>oc-app</command-message>\n<command-name>/oc-app</command-name>", OC, "fix/x"),
    user("Base directory for this skill: /x\n# App Architect", OC, "fix/x", { isMeta: true }),
    assistant([toolUse("Skill", { skill: "oc-app-architect" })], OC, "fix/x"), // belongs to the slash command, not to a prompt
    user("<task-notification>\n<task-id>abc</task-id>\n</task-notification>", OC, "fix/x"),
    user("[Request interrupted by user]", OC, "fix/x"),
    user("Request directory approved", OC, "fix/x"),
    userParts([toolResult("ok")], OC, "fix/x"),
    user("what does this function do", OC, "fix/x"),
    assistant([text("It parses the config and returns a map.")], OC, "fix/x"),
    user("sidechain prompt that must be ignored", OC, "fix/x", { isSidechain: true }),
    assistant([toolUse("Bash", { command: "git push" })], OC, "fix/x", { isSidechain: true }),
    { ...user("prompt from before the cutoff", OC, "fix/x"), timestamp: "2026-09-01T00:00:00.000Z" },
    assistant([toolUse("Bash", { command: "git commit -m old" })], OC, "fix/x"),
  ]);

  // Session 4 — text-only /oc-audit mention; a non-oc Skill followed by git push.
  writeSession(root, "-Users-me-repos-opchain", "s4", [
    user("is this safe to merge?", OC, "main"),
    assistant([text("I'd run /oc-audit on it first; here is what I see…")], OC, "main"),
    user("push it up", OC, "main"),
    assistant([toolUse("Skill", { skill: "claude-api" })], OC, "main"),
    assistant([toolUse("Bash", { command: "git push origin main" })], OC, "main"),
  ]);

  // Subagent transcript — must never be scanned.
  mkdirSync(join(root, "-Users-me-deftwright-site", "subagents"), { recursive: true });
  writeFileSync(
    join(root, "-Users-me-deftwright-site", "subagents", "agent-1.jsonl"),
    JSON.stringify(user("subagent prompt that must be ignored", DW, "x")) + "\n",
  );
  // A project dir outside the glob — must never be scanned.
  writeSession(root, "-Users-me-other-project", "s9", [user("unrelated prompt", "/Users/me/other", "main")]);
}

// ---------------------------------------------------------------------------
// build-dataset
// ---------------------------------------------------------------------------

describe("route-eval build-dataset", () => {
  let root;
  let out;
  let result;

  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), "route-eval-corpus-"));
    buildFixtureCorpus(root);
    out = join(root, "out", "dataset.jsonl");
    result = await buildDataset({ projectsRoot: root, projects: ["-Users-me-deftwright-site*", "-Users-me-repos-opchain*"], since: "2026-09-14", out });
  });
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  const byPrompt = (p) => result.rows.find((r) => r.prompt === p);

  it("scans only main-session files inside the project globs", () => {
    expect(result.files).toBe(4);
    const prompts = result.rows.map((r) => r.prompt);
    expect(prompts).not.toContain("subagent prompt that must be ignored");
    expect(prompts).not.toContain("unrelated prompt");
    expect(prompts).not.toContain("sidechain prompt that must be ignored");
  });

  it("drops slash commands, meta records, notifications, envelopes, tool results and pre-cutoff prompts", () => {
    const prompts = result.rows.map((r) => r.prompt);
    expect(prompts.some((p) => p.includes("<command-name>"))).toBe(false);
    expect(prompts.some((p) => p.startsWith("<"))).toBe(false);
    expect(prompts.some((p) => p.startsWith("Base directory"))).toBe(false);
    expect(prompts).not.toContain("[Request interrupted by user]");
    expect(prompts).not.toContain("Request directory approved");
    expect(prompts).not.toContain("prompt from before the cutoff");
  });

  it("labels an explicit Skill call, stripping the opchain: prefix", () => {
    const r = byPrompt("audit the checkout flow for correctness");
    expect(r.label).toEqual({ kind: "skill", skill: "oc-code-auditor", evidence: "Skill oc-code-auditor /oc-audit checkout" });
    expect(r.turnsUntilNextPrompt).toBe(3);
    expect(r.repoState).toMatchObject({ gitBranch: "feat/checkout", isDeftwright: true, isWorktree: false });
    expect(r.project_dir).toBe("-Users-me-deftwright-site");
    expect(r.session).toBe("s1");
  });

  it("dedupes identical prompts within a session", () => {
    expect(result.rows.filter((r) => r.prompt === "audit the checkout flow for correctness")).toHaveLength(1);
  });

  it("derives implied labels from git / deploy commands and /oc-audit text", () => {
    expect(byPrompt("commit this and open a PR").label).toMatchObject({ kind: "implied", skill: "oc-git-ops", evidence: 'Bash git commit -m "feat: thing"' });
    expect(byPrompt("ship it to staging").label).toMatchObject({ kind: "implied", skill: "oc-deploy-ops" });
    expect(byPrompt("is this safe to merge?").label).toMatchObject({ kind: "implied", skill: "oc-code-auditor" });
    // A non-oc Skill call is not a label; the git push after it is.
    expect(byPrompt("push it up").label).toMatchObject({ kind: "implied", skill: "oc-git-ops" });
  });

  it("labels prompts with no skill signal as none and attributes slash-command Skill calls to nothing", () => {
    const r = byPrompt("what does this function do");
    expect(r.label).toEqual({ kind: "none", skill: null, evidence: "" });
    expect(r.repoState).toMatchObject({ isDeftwright: false, isWorktree: true, gitBranch: "fix/x" });
    // oc-app-architect was invoked by /oc-app, which is not a prompt — no row carries it.
    expect(result.rows.some((r) => r.label.skill === "oc-app-architect")).toBe(false);
  });

  it("reports counts per kind and per skill and the first words of none prompts", () => {
    expect(result.rows).toHaveLength(6);
    expect(Object.fromEntries(result.summary.byKind)).toEqual({ skill: 1, implied: 4, none: 1 });
    expect(Object.fromEntries(result.summary.bySkill)).toEqual({
      "oc-code-auditor (skill)": 1,
      "oc-git-ops (implied)": 2,
      "oc-deploy-ops (implied)": 1,
      "oc-code-auditor (implied)": 1,
    });
    expect(result.summary.noneFirstWords).toEqual([["what", 1]]);
  });

  it("writes JSONL rows with the documented shape", () => {
    const rows = readFileSync(out, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(rows).toHaveLength(6);
    for (const r of rows) {
      expect(Object.keys(r).sort()).toEqual(["at", "conversation", "cwd", "gitBranch", "id", "label", "project_dir", "prompt", "repoState", "session", "turnsUntilNextPrompt"]);
      expect(Object.keys(r.conversation)).toEqual(["previous_request", "assistant_last"]);
      expect(r.prompt.length).toBeLessThanOrEqual(2000);
      expect(r.label.evidence.length).toBeLessThanOrEqual(120);
    }
  });

  it("captures the conversation the hook would send: previous human prompt and the last assistant text", () => {
    // First prompt of a session: nothing before it.
    expect(byPrompt("audit the checkout flow for correctness").conversation).toEqual({ previous_request: null, assistant_last: null });
    // Assistant turns with only tool calls leave assistant_last empty.
    expect(byPrompt("ship it to staging").conversation).toEqual({ previous_request: "commit this and open a PR", assistant_last: null });
    expect(byPrompt("push it up").conversation).toEqual({ previous_request: "is this safe to merge?", assistant_last: "I'd run /oc-audit on it first; here is what I see…" });
    // Slash commands, meta records, notifications and envelopes are not "previous prompts".
    expect(byPrompt("what does this function do").conversation).toEqual({ previous_request: null, assistant_last: null });
  });

  it("runs end to end through the CLI", () => {
    const cliOut = join(root, "out", "cli.jsonl");
    const res = spawnSync(process.execPath, [SCRIPT, "build-dataset", "--projects-root", root, "--projects", "-Users-me-deftwright-site*,-Users-me-repos-opchain*", "--out", cliOut], { encoding: "utf8" });
    expect(res.status).toBe(0);
    expect(res.stdout).toMatch(/6 labelled prompt\(s\)/);
    expect(res.stdout).toMatch(/implied\s+4/);
    expect(res.stdout).toMatch(/oc-git-ops \(implied\)\s+2/);
    expect(existsSync(cliOut)).toBe(true);
  });
});

describe("route-eval labelling primitives", () => {
  it("humanPromptText accepts string and text-part content and rejects envelopes", () => {
    expect(humanPromptText({ type: "user", message: { content: "hi" } })).toBe("hi");
    expect(humanPromptText({ type: "user", message: { content: [{ type: "text", text: " hi " }] } })).toBe("hi");
    expect(humanPromptText({ type: "user", message: { content: [{ type: "text", text: "x" }, { type: "tool_result" }] } })).toBeNull();
    expect(humanPromptText({ type: "user", isMeta: true, message: { content: "x" } })).toBeNull();
    expect(humanPromptText({ type: "assistant", message: { content: "x" } })).toBeNull();
    expect(humanPromptText({ type: "user", message: { content: "<system-reminder>x</system-reminder>" } })).toBeNull();
    // A desktop prompt behind reminder blocks is the human's text (the hook routes it too).
    expect(humanPromptText({ type: "user", message: { content: [{ type: "text", text: "<system-reminder>x</system-reminder>" }, { type: "text", text: "Merge PR #254." }] } })).toBe("Merge PR #254.");
    expect(humanPromptText({ type: "user", message: { content: "<system-reminder>x</system-reminder>\n<task-notification>y</task-notification>" } })).toBeNull();
  });

  it("rowsFromRecords routes a brief's Task paragraph and drops a brief without one", () => {
    const brief = "Background (from the session that started this one):\nlots of context\n\nTask:\nOpen a PR for the fix.\n\nRead first:\n- x";
    const rows = rowsFromRecords([user(brief, DW, "main"), user("Background (from the session that started this one):\nno task", DW, "main")], { projectDir: "p", session: "s" });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ prompt: "Open a PR for the fix.", brief: true });
  });

  it("deriveLabel prefers a Skill call over an earlier implied command", () => {
    const label = deriveLabel([
      assistant([toolUse("Bash", { command: "git commit -m x" })]),
      assistant([toolUse("Skill", { skill: "oc-git-ops", args: "/oc-pr" })]),
    ]);
    expect(label).toMatchObject({ kind: "skill", skill: "oc-git-ops" });
  });

  it("deriveLabel keeps the first implied match in transcript order", () => {
    const label = deriveLabel([assistant([toolUse("Bash", { command: "wrangler deploy" })]), assistant([toolUse("Bash", { command: "git push" })])]);
    expect(label).toMatchObject({ kind: "implied", skill: "oc-deploy-ops" });
  });

  it("rowsFromRecords: assistant_last is the redacted END (≤400) of the whole last message, grouped by message.id", () => {
    const secret = "ghp_abcdefghijklmnopqrstuvwxyz0123456789";
    const msg = (parts, id) => ({ ...assistant(parts, DW, "main"), message: { id, role: "assistant", content: parts } });
    const rows = rowsFromRecords(
      [
        user(`open the PR please, token ${secret}`, DW, "main"),
        msg([text("Old message from another turn.")], "m0"),
        msg([text(`${"Checks are running. ".repeat(40)}Token ${secret}.`)], "m1"),
        msg([toolUse("Bash", { command: "gh pr checks" })], "m1"),
        userParts([toolResult("ok")], DW, "main"),
        msg([text("PR #590 is green — want me to merge it?")], "m1"),
        user("merge", DW, "main"),
      ],
      { projectDir: "p", session: "s" },
    );
    const c = rows.find((r) => r.prompt === "merge").conversation;
    expect(c.previous_request).toBe("open the PR please, token [REDACTED]");
    expect(c.assistant_last.length).toBeLessThanOrEqual(400);
    expect(c.assistant_last.startsWith("…")).toBe(true);
    expect(c.assistant_last.endsWith("Token [REDACTED].\nPR #590 is green — want me to merge it?")).toBe(true);
    // Prompts, label evidence and the conversation are all stored redacted.
    expect(JSON.stringify(rows)).not.toContain(secret.slice(0, 20));
    expect(rows[0].prompt).toBe("open the PR please, token [REDACTED]");
  });

  it("rowsFromRecords redacts secrets in the prompt before truncating, and in label evidence", () => {
    const key = `apikey_${"0123456789abcdef".repeat(4)}`;
    const rows = rowsFromRecords(
      [
        user(`${"x".repeat(1990)} ${key}`, DW, "main"),
        assistant([toolUse("Bash", { command: `curl -H "Authorization: Bearer ${"t".repeat(32)}" && git push` })], DW, "main"),
      ],
      { projectDir: "p", session: "s" },
    );
    expect(rows[0].prompt).toBe(`${"x".repeat(1990)} [REDACTED]`.slice(0, 2000));
    expect(rows[0].prompt).not.toContain("apikey_");
    expect(rows[0].label).toMatchObject({ kind: "implied", skill: "oc-git-ops" });
    expect(rows[0].label.evidence).not.toContain("t".repeat(32));
  });

  it("buildDataset keeps one row per id when a session transcript exists in two project dirs", async () => {
    const root = mkdtempSync(join(tmpdir(), "route-eval-dup-"));
    try {
      const recs = [user("ship the fix", DW, "main", { dayOffset: 20, uuid: "dup-1" })];
      writeSession(root, "-Users-me-deftwright-site", "sess", recs);
      writeSession(root, "-Users-me-deftwright-site--claude-worktrees-x", "sess", recs);
      const res = await buildDataset({ projectsRoot: root, projects: ["-Users-me-deftwright-site*"], since: "2026-09-14" });
      expect(res.rows.map((r) => r.id)).toEqual(["sess:dup-1"]);
      expect(res.duplicates).toBe(1);
      expect(formatDatasetSummary(res)).toContain("1 duplicate id(s) from copied transcripts dropped");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rowsFromRecords truncates long prompts to 2000 chars", () => {
    const rows = rowsFromRecords([user("x".repeat(5000), DW, "main")], { projectDir: "p", session: "s" });
    expect(rows[0].prompt).toHaveLength(2000);
  });
});

// ---------------------------------------------------------------------------
// run — metrics arithmetic
// ---------------------------------------------------------------------------

const d = (skill, fits, gate, confidence = fits) => ({ skill, verb: null, args: null, confidence, probabilities: { [skill]: confidence }, gate, fits });
const row = (id, kind, skill, decision, prompt = `prompt ${id}`) => ({ id, label: { kind, skill, evidence: "" }, prompt, decision, trace: { usage: { input_tokens: 100, output_tokens: 10 } } });

const TINY = [
  row("a", "skill", "oc-git-ops", d("oc-git-ops", 0.9, 0.9)), // TP git
  row("b", "implied", "oc-git-ops", d("oc-deploy-ops", 0.8, 0.9)), // FN git, FP deploy
  row("c", "implied", "oc-deploy-ops", d("oc-deploy-ops", 0.6, 0.7)), // TP deploy
  row("d", "implied", "oc-git-ops", d("oc-git-ops", 0.4, 0.9)), // below fits 0.5 → FN git
  row("e", "none", null, d("oc-git-ops", 0.7, 0.6)), // FP git (false suggestion)
  row("f", "none", null, null), // router abstained → correct
  row("g", "none", null, d("oc-code-auditor", 0.9, 0.2)), // gate below 0.5 → no suggestion → correct
];

describe("route-eval metrics", () => {
  it("suggestedAt applies both thresholds and treats missing gate as open", () => {
    expect(suggestedAt(d("oc-git-ops", 0.5, 0.5), { fits: 0.5, gate: 0.5 })).toBe("oc-git-ops");
    expect(suggestedAt(d("oc-git-ops", 0.49, 0.5), { fits: 0.5, gate: 0.5 })).toBeNull();
    expect(suggestedAt(d("oc-git-ops", 0.9, 0.49), { fits: 0.5, gate: 0.5 })).toBeNull();
    expect(suggestedAt({ skill: "oc-git-ops", fits: 0.9 }, { fits: 0.5, gate: 0.5 })).toBe("oc-git-ops");
    expect(suggestedAt({ skill: "oc-git-ops", fits: 0.9, gate: false }, { fits: 0.5, gate: 0.5 })).toBeNull();
    expect(suggestedAt(null, { fits: 0, gate: 0 })).toBeNull();
    // A menu-verb decision (kept by the open query) is dropped unless the report allows menus.
    const menu = { ...d("oc-git-ops", 0.9, 0.9), args: "/oc-git", menu: true };
    expect(suggestedAt(menu, { fits: 0.5, gate: 0.5 })).toBeNull();
    expect(suggestedAt(menu, { fits: 0.5, gate: 0.5, allowMenus: true })).toBe("oc-git-ops");
    expect(suggestedAt({ ...menu, explicit: true }, { fits: 0.5, gate: 0.5 })).toBe("oc-git-ops");
  });

  it("default report thresholds are the shipped tiered bar: core 0.6, others 0.9, gate 0.5 (B-03)", async () => {
    const router = await import("../plugins/opchain/hooks/lib/route-dispatch.cjs");
    const T = DEFAULTS.thresholds;
    expect(T).toMatchObject({ gate: router.DEFAULT_THRESHOLDS.gate, fits: null, coreFits: router.DEFAULT_THRESHOLDS.coreFits, otherFits: router.DEFAULT_THRESHOLDS.otherFits });
    expect(DEFAULTS.coreSkills).toEqual([...router.CORE_SKILLS]);
    expect(suggestedAt(d("oc-git-ops", 0.6, 0.6), T)).toBe("oc-git-ops");
    expect(suggestedAt(d("oc-git-ops", 0.59, 0.6), T)).toBeNull();
    // The p floor: gate 0.55 clears the 0.5 gate bar but p = min(top, fits, gate) = 0.55 < 0.6.
    expect(suggestedAt(d("oc-git-ops", 0.65, 0.55), T)).toBeNull();
    expect(suggestedAt(d("oc-git-ops", 0.65, 0.55), { ...T, minP: 0 })).toBe("oc-git-ops");
    expect(suggestedAt({ ...d("oc-git-ops", 0.65, 0.55), p: 0.62 }, T)).toBe("oc-git-ops");
    expect(suggestedAt({ ...d("oc-git-ops", 0.3, 0.3), explicit: true }, { ...T, fits: 0, gate: 0 })).toBe("oc-git-ops");
    expect(suggestedAt(d("oc-ux-engineer", 0.85, 0.9), T)).toBeNull();
    expect(suggestedAt(d("oc-ux-engineer", 0.9, 0.9), T)).toBe("oc-ux-engineer");
    // An explicit fits (CLI --thresholds fits=X, hook OPCHAIN_ROUTE_FITS) is a flat bar for every skill.
    expect(suggestedAt(d("oc-ux-engineer", 0.5, 0.5), { fits: 0.5, gate: 0.5 })).toBe("oc-ux-engineer");
    expect(describeThresholds(T)).toBe("fits ≥ 0.6 (core) / 0.9 (other), gate ≥ 0.5, p ≥ 0.6");
    expect(describeThresholds({ fits: 0.5, gate: 0.5 })).toBe("fits ≥ 0.5, gate ≥ 0.5");
    // p = min(top, fits, gate): stored decision.p wins; otherwise the parts the decision carries.
    expect(pOf({ p: 0.71, fits: 0.9, gate: 0.9 })).toBe(0.71);
    expect(pOf({ topProbability: 0.43, fits: 0.6, gate: 0.84 })).toBe(0.43);
    expect(Number.isNaN(pOf({}))).toBe(true);
    expect(renderReport({ results: TINY, stats: {}, generatedAt: "x" })).toContain("Default thresholds: fits ≥ 0.6 (core) / 0.9 (other), gate ≥ 0.5, p ≥ 0.6.");
    expect(renderReport({ results: TINY, stats: {}, generatedAt: "x" })).toMatch(/## p floor sweep/);
  });

  it("floorSweep: the p floor drops c and e (p 0.6) at 0.65 — one true, one false suggestion", () => {
    // Flat fits 0.5 / gate 0.5. Suggested: a git (p 0.9, TP), b deploy (0.8, FP on a git row), c deploy (0.6, TP), e git (0.6, FP on none).
    const [open, floored] = floorSweep(TINY, { fits: 0.5, gate: 0.5 }, { floors: [0, 0.65] });
    expect(open).toMatchObject({ minP: 0, precision: 0.5, recall: 0.5 });
    expect(open.noneHoldRate).toBeCloseTo(2 / 3);
    expect(floored).toMatchObject({ minP: 0.65, precision: 0.5, recall: 0.25, noneHoldRate: 1 });
  });

  it("computes top-1, precision, recall, F1 and the false-suggestion rate at fits 0.5 / gate 0.5", () => {
    const m = computeMetrics(TINY, { fits: 0.5, gate: 0.5 });
    expect(m.total).toBe(7);
    expect(m.labelled).toBe(4);
    expect(m.none).toBe(3);
    // Suggestions made: a(git ✓), b(deploy ✗), c(deploy ✓), e(git ✗) → 4 suggested, 2 correct.
    expect(m.suggestionRate).toBeCloseTo(4 / 7);
    expect(m.precision).toBeCloseTo(2 / 4);
    // Labelled rows correct: a, c → 2/4.
    expect(m.top1Accuracy).toBeCloseTo(0.5);
    expect(m.recall).toBeCloseTo(0.5);
    // none rows: e suggested, f and g not → 1/3.
    expect(m.falseSuggestionRate).toBeCloseTo(1 / 3);
    expect(m.noneHoldRate).toBeCloseTo(2 / 3);

    const git = m.perSkill.find((s) => s.skill === "oc-git-ops");
    expect(git).toMatchObject({ support: 3, tp: 1, fp: 1, fn: 2 });
    expect(git.precision).toBeCloseTo(1 / 2);
    expect(git.recall).toBeCloseTo(1 / 3);
    expect(git.f1).toBeCloseTo((2 * 0.5 * (1 / 3)) / (0.5 + 1 / 3));

    const deploy = m.perSkill.find((s) => s.skill === "oc-deploy-ops");
    expect(deploy).toMatchObject({ support: 1, tp: 1, fp: 1, fn: 0 });
    expect(deploy.precision).toBeCloseTo(0.5);
    expect(deploy.recall).toBeCloseTo(1);

    expect(m.confusions).toEqual([
      ["(none) → oc-git-ops", 1],
      ["oc-git-ops → (none)", 1],
      ["oc-git-ops → oc-deploy-ops", 1],
    ]);
    expect(m.lowestConfidentCorrect.map((r) => r.id)).toEqual(["c", "a"]);
    expect(m.highestConfidentWrong.map((r) => r.id)).toEqual(["b", "e"]);
  });

  it("sweeps thresholds from stored values and lowering fits raises recall", () => {
    const sw = thresholdSweep(TINY, { fits: [0.3, 0.5], gate: [0.5] });
    expect(sw.map((r) => [r.fits, r.gate])).toEqual([
      [0.3, 0.5],
      [0.5, 0.5],
    ]);
    // At fits 0.3, row d (0.4) becomes a correct suggestion: recall 3/4, precision 3/5.
    expect(sw[0].recall).toBeCloseTo(3 / 4);
    expect(sw[0].precision).toBeCloseTo(3 / 5);
    expect(sw[1].recall).toBeCloseTo(2 / 4);
  });

  it("extracts token usage from nested traces", () => {
    expect(usageFromTrace({ usage: { input_tokens: 5, output_tokens: 2 } })).toEqual({ input: 5, output: 2 });
    expect(usageFromTrace({ calls: [{ usage: { prompt_tokens: 3 } }, { usage: { inputTokens: 4, completion_tokens: 1 } }] })).toEqual({ input: 7, output: 1 });
    expect(usageFromTrace(null)).toEqual({ input: 0, output: 0 });
  });

  it("stratified sampling keeps every stratum and is deterministic", () => {
    const rows = [];
    for (let i = 0; i < 50; i++) rows.push(row(`n${i}`, "none", null, null));
    for (let i = 0; i < 10; i++) rows.push(row(`g${i}`, "implied", "oc-git-ops", null));
    rows.push(row("x", "skill", "oc-ux-engineer", null));
    const a = stratifiedSample(rows, 12, 7);
    const b = stratifiedSample(rows, 12, 7);
    expect(a).toHaveLength(12);
    expect(a.map((r) => r.id)).toEqual(b.map((r) => r.id));
    expect(a.some((r) => r.label.skill === "oc-ux-engineer")).toBe(true);
    expect(a.some((r) => r.label.skill === "oc-git-ops")).toBe(true);
    expect(a.some((r) => r.label.kind === "none")).toBe(true);
  });

  it("allowlist: suppresses non-listed suggestions (not explicit mentions) and reports what it removes", () => {
    const explicitRow = row("h", "skill", "oc-compliance-ops", { ...d("oc-compliance-ops", 1, 1), explicit: true });
    const results = [...TINY, explicitRow];
    const T = { fits: 0.5, gate: 0.5 };
    expect(suggestedAt(d("oc-deploy-ops", 0.9, 0.9), T, ["oc-git-ops"])).toBeNull();
    expect(suggestedAt(explicitRow.decision, T, ["oc-git-ops"])).toBe("oc-compliance-ops");
    const sup = allowlistSuppression(results, T, ["oc-git-ops"]);
    // b (deploy on a git row → wrong) and c (deploy on a deploy row → matched) are suppressed.
    expect(sup.total).toBe(2);
    expect(sup.perSkill).toEqual([{ skill: "oc-deploy-ops", suppressed: 2, matchedLabel: 1, wrong: 1 }]);
    // Gated: a(git ✓), e(git ✗), h(explicit ✓) suggested → precision 2/3; labelled correct a, h → 2/5.
    expect(sup.gated.precision).toBeCloseTo(2 / 3);
    expect(sup.gated.recall).toBeCloseTo(2 / 5);
    expect(allowlistSuppression(results, T, null)).toBeNull();
    const md = renderReport({ results, stats: {}, thresholds: T, allow: ["oc-git-ops"], generatedAt: "x" });
    expect(md).toContain("## Suppressed by allowlist");
    expect(md).toMatch(/suppresses \*\*2\*\* suggestion\(s\)/);
    expect(md).toMatch(/\| oc-deploy-ops \| 2 \| 1 \| 1 \|/);
    expect(md).toMatch(/\| Precision of suggestions \| 0\.600 \| 0\.667 \|/);
    expect(renderReport({ results: TINY, stats: {}, generatedAt: "x" })).toMatch(/No `suggestAllow` in the spec/);
  });

  it("renders every report section", () => {
    const md = renderReport({ results: TINY, stats: { queried: 7, reused: 0, retries: 1, wallMs: 1234 }, thresholds: { fits: 0.5, gate: 0.5 }, datasetPath: "x.jsonl", generatedAt: "2026-10-08T00:00:00Z" });
    for (const h of ["## Overall", "## Per-skill precision / recall / F1", "## Threshold sweep", "## Confusions (label → suggested)", "## Lowest-confidence correct suggestions", "## Highest-confidence wrong suggestions", "## Suppressed by allowlist", "## Cost and time"]) {
      expect(md).toContain(h);
    }
    expect(md).toMatch(/\| Top-1 accuracy \(skill \+ implied\) \| 0\.500 \|/);
    expect(md).toMatch(/\| False-suggestion rate on `none` rows \| 0\.333 \|/);
    expect(md).toMatch(/\| oc-git-ops \| 3 \| 1 \| 1 \| 2 \| 0\.500 \| 0\.333 \| 0\.400 \|/);
    // 7 rows × 100 input tokens at $0.042/M.
    expect(md).toMatch(/\| Input tokens \(all stored traces\) \| 700 \|/);
    expect(md).toMatch(/\| Estimated cost at \$0\.042\/M input tokens \| \$0\.0000 \|/);
    expect(md).toMatch(/\| 429 retries \| 1 \|/);
    expect(md).toMatch(/\| Wall time \| 1\.2s \|/);
    // The sweep has 5 × 2 rows.
    expect((md.match(/^\| 0\.\d \| 0\.\d \| /gm) ?? []).length).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// run — routing, cache, backoff, CLI
// ---------------------------------------------------------------------------

/** A route() that answers from the fixture transport's canned map. */
function fakeRoute(calls) {
  return async ({ prompt, transport, thresholds }) => {
    calls.push(prompt);
    const answers = await transport({ prompt });
    const a = answers.byPrompt?.[prompt] ?? answers.default ?? null;
    const decision = a && a.fits >= thresholds.fits && a.gate >= thresholds.gate ? a : null;
    return { decision, trace: { thresholds, usage: { input_tokens: 50, output_tokens: 4 } } };
  };
}

const ANSWERS = {
  default: null,
  byPrompt: {
    "commit this and open a PR": d("oc-git-ops", 0.9, 0.9),
    "ship it to staging": d("oc-deploy-ops", 0.7, 0.8),
    "what does this function do": d("oc-code-auditor", 0.35, 0.4),
  },
};

const EVAL_ROWS = [
  { id: "r1", prompt: "commit this and open a PR", label: { kind: "implied", skill: "oc-git-ops", evidence: "" }, repoState: { gitBranch: "x" } },
  { id: "r2", prompt: "ship it to staging", label: { kind: "implied", skill: "oc-deploy-ops", evidence: "" }, repoState: { gitBranch: "x" } },
  { id: "r3", prompt: "what does this function do", label: { kind: "none", skill: null, evidence: "" }, repoState: { gitBranch: "x" } },
  { id: "r4", prompt: "unknown prompt", label: { kind: "none", skill: null, evidence: "" }, repoState: { gitBranch: "x" } },
];

describe("route-eval run", () => {
  let dir;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "route-eval-run-"));
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("passes row.conversation to route() and keys the row hash on it", async () => {
    const seen = [];
    const routeFn = async (args) => {
      seen.push(args);
      return { decision: null, trace: {} };
    };
    const conversation = { previous_request: "open a PR", assistant_last: "PR #590 is green. Merge it?" };
    const rows = [{ id: "c1", prompt: "merge", label: { kind: "implied", skill: "oc-git-ops", evidence: "" }, repoState: {}, conversation }];
    const { results } = await runEval({ rows, routeFn, transport: null, spec: { version: "t" }, cache: null });
    expect(seen[0].conversation).toEqual(conversation);
    expect(seen[0].thresholds).toMatchObject({ fits: 0, gate: 0, suggestAll: true });
    expect(results[0].conversation).toEqual(conversation);
    // Context off (default): the conversation is not sent, so it does not key the row.
    const other = { ...rows[0], conversation: { ...conversation, assistant_last: "Deploy?" } };
    expect(rowHash(rows[0])).toBe(rowHash(other));
    // Context on: it does, and the two modes never share a hash.
    expect(rowHash(rows[0], { context: true })).not.toBe(rowHash(other, { context: true }));
    expect(rowHash(rows[0], { context: true })).not.toBe(rowHash(rows[0]));
  });

  it("queries at open thresholds, stores decisions, and reuses previous results without re-querying", async () => {
    const calls = [];
    const { fixtureTransport } = await import("../scripts/route-eval.mjs");
    const transport = fixtureTransport(ANSWERS);
    const cacheFile = join(dir, "cache.json");
    const first = await runEval({ rows: EVAL_ROWS, routeFn: fakeRoute(calls), transport, spec: { version: "t1", skills: {} }, cache: new FileCache(cacheFile), concurrency: 4 });
    expect(calls).toHaveLength(4);
    expect(first.stats).toMatchObject({ queried: 4, reused: 0, specVersion: "t1" });
    expect(first.results.find((r) => r.id === "r3").decision).toMatchObject({ skill: "oc-code-auditor", fits: 0.35 });
    expect(first.results.find((r) => r.id === "r4").decision).toBeNull();
    expect(existsSync(cacheFile)).toBe(true);

    // Second pass: previous results + file cache → zero route() calls.
    const calls2 = [];
    const second = await runEval({ rows: EVAL_ROWS, routeFn: fakeRoute(calls2), transport, spec: { version: "t1", skills: {} }, cache: new FileCache(cacheFile), previous: first.results });
    expect(calls2).toHaveLength(0);
    expect(second.stats).toMatchObject({ queried: 0, reused: 4 });
    expect(second.results.every((r) => r.cached)).toBe(true);

    // A new spec version invalidates the hash and queries again.
    const calls3 = [];
    const third = await runEval({ rows: EVAL_ROWS, routeFn: fakeRoute(calls3), transport, spec: { version: "t2", skills: {} }, cache: new FileCache(cacheFile), previous: first.results });
    expect(calls3).toHaveLength(4);
    expect(third.stats.queried).toBe(4);

    // Metrics on the stored decisions at the default thresholds: r1, r2 correct; r3 held back by fits.
    const m = computeMetrics(first.results, { fits: 0.5, gate: 0.5 });
    expect(m.top1Accuracy).toBe(1);
    expect(m.falseSuggestionRate).toBe(0);
    const loose = computeMetrics(first.results, { fits: 0.3, gate: 0.3 });
    expect(loose.falseSuggestionRate).toBeCloseTo(0.5);
  });

  it("retries on 429 with backoff and records a router error without aborting the run", async () => {
    let attempts = 0;
    const routeFn = async ({ prompt }) => {
      if (prompt === "ship it to staging") {
        attempts++;
        if (attempts < 3) {
          const err = new Error("429 Too Many Requests");
          err.status = 429;
          err.retryAfterMs = 1;
          throw err;
        }
      }
      if (prompt === "unknown prompt") throw new Error("boom");
      return { decision: d("oc-git-ops", 0.9, 0.9), trace: {} };
    };
    const waits = [];
    const { results, stats } = await runEval({ rows: EVAL_ROWS, routeFn, transport: null, spec: {}, cache: null, sleepFn: async (ms) => waits.push(ms) });
    expect(attempts).toBe(3);
    expect(stats.retries).toBe(2);
    expect(waits).toEqual([1, 1]);
    const failed = results.find((r) => r.id === "r4");
    expect(failed.error).toMatch(/boom/);
    expect(failed.decision).toBeNull();
    expect(results.filter((r) => !r.error)).toHaveLength(3);
  });

  it("treats route()'s trace.error as an error: retries 429/5xx, never caches or reuses the row (B-01)", async () => {
    // route() never throws on a transport failure; it returns decision null + trace.error.
    let calls = 0;
    const failing = (msg, failures) => async ({ prompt }) => {
      calls++;
      if (prompt === "ship it to staging" && calls <= failures) return { decision: null, trace: { error: msg } };
      return { decision: d("oc-git-ops", 0.9, 0.9), trace: {} };
    };
    const rows = EVAL_ROWS.slice(1, 2);
    const waits = [];
    const sleepFn = async (ms) => waits.push(ms);
    // 529 twice, then success: retried, not an error row.
    const ok = await runEval({ rows, routeFn: failing("typesafe 529: overloaded", 2), transport: null, spec: {}, cache: null, sleepFn });
    expect(ok.stats.retries).toBe(2);
    expect(ok.results[0].error).toBeUndefined();
    expect(ok.results[0].decision).toMatchObject({ skill: "oc-git-ops" });

    // A persistent 503: retried to maxAttempts, then an error row with the trace kept.
    calls = 0;
    const cache = new FileCache(null);
    const bad = await runEval({ rows, routeFn: failing("typesafe 503: unavailable", 99), transport: null, spec: {}, cache, sleepFn });
    expect(calls).toBe(DEFAULTS.maxAttempts);
    expect(bad.results[0].error).toMatch(/typesafe 503/);
    expect(bad.results[0].trace).toMatchObject({ error: "typesafe 503: unavailable" });
    expect(cache.has(`route:${bad.results[0].hash}`)).toBe(false);

    // A non-retryable trace error (401) is one call, still an error row.
    calls = 0;
    const auth = await runEval({ rows, routeFn: failing("typesafe 401: bad key", 99), transport: null, spec: {}, cache, sleepFn });
    expect(calls).toBe(1);
    expect(auth.results[0].error).toMatch(/401/);

    // The next run neither reuses the previous error row nor a poisoned cache entry.
    cache.set(`route:${auth.results[0].hash}`, { decision: null, trace: { error: "typesafe 401: bad key" } });
    calls = 0;
    const again = await runEval({ rows, routeFn: failing("x", 0), transport: null, spec: {}, cache, previous: auth.results, sleepFn });
    expect(calls).toBe(1);
    expect(again.stats).toMatchObject({ queried: 1, reused: 0 });
    expect(again.results[0].decision).toMatchObject({ skill: "oc-git-ops" });
  });

  it("exits 2 with a clear message when TYPESAFE_API_KEY is missing and no fixture is given", () => {
    const dataset = join(dir, "ds.jsonl");
    writeFileSync(dataset, EVAL_ROWS.map((r) => JSON.stringify(r)).join("\n") + "\n");
    const env = { ...process.env };
    delete env.TYPESAFE_API_KEY;
    const res = spawnSync(process.execPath, [SCRIPT, "run", "--dataset", dataset, "--out", join(dir, "x.jsonl"), "--report", join(dir, "x.md")], { encoding: "utf8", env });
    expect(res.status).toBe(2);
    expect(res.stderr).toMatch(/TYPESAFE_API_KEY is not set/);
    expect(res.stderr).toMatch(/--fixture/);
  });

  it("exits 2 when the route module has not landed", () => {
    const dataset = join(dir, "ds.jsonl");
    const answers = join(dir, "answers.json");
    writeFileSync(answers, JSON.stringify(ANSWERS));
    const res = spawnSync(process.execPath, [SCRIPT, "run", "--dataset", dataset, "--fixture", answers, "--route-module", join(dir, "missing.cjs"), "--out", join(dir, "x.jsonl"), "--report", join(dir, "x.md")], { encoding: "utf8" });
    expect(res.status).toBe(2);
    expect(res.stderr).toMatch(/route module not found/);
  });

  it("run --fixture with a fake route module writes results and a report through the CLI, and a re-run reuses them", () => {
    const dataset = join(dir, "ds.jsonl");
    const answers = join(dir, "answers.json");
    const counter = join(dir, "calls.txt");
    const fakeModule = join(dir, "fake-route.cjs");
    writeFileSync(
      fakeModule,
      `const fs = require("node:fs");
module.exports.httpTransport = () => { throw new Error("must not be called under --fixture"); };
module.exports.route = async ({ prompt, transport, thresholds }) => {
  fs.appendFileSync(${JSON.stringify(counter)}, prompt + "\\n");
  const answers = await transport({ prompt });
  const a = (answers.byPrompt && answers.byPrompt[prompt]) || answers.default || null;
  const decision = a && a.fits >= thresholds.fits && a.gate >= thresholds.gate ? a : null;
  return { decision, trace: { usage: { input_tokens: 1000, output_tokens: 8 } } };
};`,
    );
    const out = join(dir, "eval.jsonl");
    const report = join(dir, "eval.md");
    const cache = join(dir, "cli-cache.json");
    const argv = [SCRIPT, "run", "--dataset", dataset, "--fixture", answers, "--route-module", fakeModule, "--out", out, "--report", report, "--cache", cache];
    const env = { ...process.env };
    delete env.TYPESAFE_API_KEY;

    const res = spawnSync(process.execPath, argv, { encoding: "utf8", env });
    expect(res.stderr).toBe("");
    expect(res.status).toBe(0);
    expect(res.stdout).toMatch(/routed 4 row\(s\): 4 queried, 0 reused/);
    expect(res.stdout).toMatch(/top-1 1\.000 · precision 1\.000 · recall 1\.000 · false-suggestion on none 0\.000/);
    expect(readFileSync(counter, "utf8").trim().split("\n")).toHaveLength(4);

    const results = readFileSync(out, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(results).toHaveLength(4);
    expect(results.find((r) => r.id === "r1").decision.skill).toBe("oc-git-ops");

    const md = readFileSync(report, "utf8");
    expect(md).toContain("# Skill router evaluation");
    expect(md).toContain("## Threshold sweep");
    expect(md).toMatch(/\| Rows \| 4 \|/);
    expect(md).toMatch(/\| Rows labelled `none` \| 2 \|/);
    expect(md).toMatch(/\| Input tokens \(all stored traces\) \| 4000 \|/);
    // At fits 0.3 / gate 0.3 the oc-code-auditor guess on a `none` row becomes a false suggestion.
    expect(md).toMatch(/\| 0\.3 \| 0\.3 \| 0\.750 \| 0\.667 \| 1\.000 \| 0\.500 \| 0\.500 \|/);
    expect(md).toMatch(/\| 0\.5 \| 0\.5 \| 0\.500 \| 1\.000 \| 1\.000 \| 0\.000 \| 1\.000 \|/);

    // Re-run: everything comes from the stored results; the fake route is not called again.
    const again = spawnSync(process.execPath, argv, { encoding: "utf8", env });
    expect(again.status).toBe(0);
    expect(again.stdout).toMatch(/routed 4 row\(s\): 0 queried, 4 reused/);
    expect(readFileSync(counter, "utf8").trim().split("\n")).toHaveLength(4);
    expect(readFileSync(report, "utf8")).toMatch(/\| Rows reused from cache \| 4 \|/);
  });
});

// ---------------------------------------------------------------------------
// outcomes — production self-labels
// ---------------------------------------------------------------------------

const RAW0 = { git_commit: false, git_push: false, git_sync: false, gh_pr_create: false, gh_pr_merge: false, deploy: false, merge_handoff: false };
const oc = (n, { mode = "shadow", suggested = null, skill_calls = [], raw = {}, at = "2026-10-09T12:00:00.000Z" } = {}) => ({
  type: "outcome", session_id: "s", for_prompt_hash: `h${n}`, at, suggested, mode, skill_calls, raw: { ...RAW0, ...raw },
  followed: suggested ? skill_calls.includes(suggested) : null,
});
const OUTCOMES = [
  oc(1, { suggested: "oc-git-ops", skill_calls: ["oc-git-ops"], raw: { gh_pr_merge: true } }), // TP, followed
  oc(2, { suggested: "oc-git-ops", raw: { git_commit: true } }), // TP via raw
  oc(3, { suggested: "oc-deploy-ops" }), // FP (core)
  oc(4, { suggested: "oc-ux-engineer", skill_calls: ["oc-ux-engineer"] }), // TP, followed (non-core)
  oc(5, { raw: { deploy: true } }), // FN deploy
  oc(6), // TN
  oc(7, { mode: "live", suggested: "oc-git-ops", skill_calls: ["oc-git-ops"] }), // TP, followed
  oc(8), // TN
  oc(9, { suggested: "oc-dash-forge" }), // FP (non-core)
];

describe("route-eval outcomes", () => {
  it("computes follow rate, proxy TP/FP/FN, core precision, silent rate and the verdict", () => {
    const s = summarizeOutcomes(OUTCOMES);
    // followed / followRate are live-mode only: in shadow nobody saw the suggestion.
    expect(s).toMatchObject({ total: 9, suggestions: 6, followed: 1, followRate: 1, unprompted: { calls: 2, suggestions: 5 }, unlabelledSuggestions: 6 });
    expect(s.proxy).toMatchObject({ tp: 4, fp: 2, fn: 1, tn: 2, coreTp: 3, coreFp: 1, nonPipeline: 4 });
    expect(s.proxy.precision).toBeCloseTo(4 / 6);
    expect(s.proxy.recall).toBeCloseTo(4 / 5);
    expect(s.proxy.corePrecision).toBeCloseTo(0.75);
    expect(s.proxy.silentRate).toBeCloseTo(0.5);
    expect(s.byMode).toEqual([
      { mode: "live", outcomes: 1, suggestions: 1, followed: 1, followedWithVerb: 0, followRate: 1 },
      { mode: "shadow", outcomes: 8, suggestions: 5, followed: 2, followedWithVerb: 0, followRate: 0.4 },
    ]);
    // These fixtures predate skill_args, so no follow can be credited with its verb.
    expect(s.verbFidelity).toBe(0);
    expect(s.byArm).toEqual([]);
    const git = s.perSkill.find((r) => r.skill === "oc-git-ops");
    expect(git).toMatchObject({ suggestions: 3, followed: 2, relatedRaw: 2, tp: 3, fp: 0, fn: 0 });
    expect(s.perSkill.find((r) => r.skill === "oc-deploy-ops")).toMatchObject({ suggestions: 1, followed: 0, tp: 0, fp: 1, fn: 1 });
    expect(s.transitions).toContainEqual({ mode: "shadow", suggested: "oc-git-ops", then: "Skill oc-git-ops + raw git", count: 1 });
    expect(s.transitions).toContainEqual({ mode: "shadow", suggested: "oc-git-ops", then: "raw git", count: 1 });
    expect(s.transitions).toContainEqual({ mode: "shadow", suggested: "oc-deploy-ops", then: "nothing", count: 1 });
    expect(s.goNoGo.go).toBe(false);
    // suggestions, pipeline prompts, lift, core precision, silent rate, labelled.
    expect(s.goNoGo.checks.map((c) => c.pass)).toEqual([false, false, true, false, false, false]);
    expect(s.goNoGo.checks[5]).toMatchObject({ name: "every suggestion hand-labelled", value: "0/6" });
    // Baseline over shadow rows with pipeline work: h1 (git-ops, skill called), h2 (raw commit, router named
    // git-ops: a gap closed), h4 (ux-engineer called), h5 (raw deploy, no suggestion). h7 is live.
    expect(s.baseline).toMatchObject({ pipeline: 4, agentUsed: 2, routerRight: 3, gapsClosed: 1, projected: 3, lift: 1.5 });
    expect(s.liveUse).toMatchObject({ pipeline: 1, used: 1 });
    // Every unlabelled suggestion is listed for labelling, plus the proxy misses.
    expect(s.review.map((r) => `${r.for_prompt_hash}:${r.verdict}`).sort()).toEqual(["h1:TP", "h2:TP", "h3:FP", "h4:TP", "h5:FN", "h7:TP", "h9:FP"]);

    const md = renderOutcomesReport(s, { logPath: "log.jsonl", generatedAt: "x" });
    for (const h of ["## Go / no-go (day 8)", "## Overall", "## Per skill", "## What happened after each suggestion", "## Rows to review"]) expect(md).toContain(h);
    expect(md).toMatch(/\| Follow rate, live mode \(suggested skill then called\) \| 1\.000 \|/);
    expect(md).toMatch(/\| Shadow: suggested skill called unprompted \(baseline, nobody saw the suggestion\) \| 2 \/ 5 \|/);
    expect(md).toMatch(/\| TP \/ FP \/ FN \/ TN \| 4 \/ 2 \/ 1 \/ 2 \|/);
    expect(md).toMatch(/\| oc-git-ops \| 3 \| 2 \| 2 \| 3 \| 0 \| 1\.000 \| 0 \|/);
    expect(md).toMatch(/\| shadow \| oc-git-ops \| raw git \| 1 \|/);
    expect(md).toMatch(/\| every suggestion hand-labelled \| 0\/6 \| \*\*no\*\* \|/);
    expect(md).toMatch(/### Unlabelled suggestions \(6\): the gate waits on these/);
    expect(md).toMatch(/### Unlabelled proxy misses \(1\)/);
    expect(md).toMatch(/NO-GO — stay in shadow/);
  });

  it("splits A/B arms and counts follows that used the suggested verb", () => {
    const rows = [
      { session_id: "a", suggested: "oc-git-ops", suggested_args: "/oc-merge", mode: "live", arm: "live", skill_calls: ["oc-git-ops"], skill_args: { "oc-git-ops": "/oc-merge 252" }, followed_with_verb: true, raw: {} },
      { session_id: "b", suggested: "oc-git-ops", suggested_args: "/oc-git-sync", mode: "live", arm: "live", skill_calls: ["oc-git-ops"], skill_args: { "oc-git-ops": "/oc-pr" }, followed_with_verb: false, raw: {} },
      { session_id: "c", suggested: "oc-deploy-ops", suggested_args: "/oc-deploy staging", mode: "live", arm: "control", skill_calls: [], skill_args: {}, followed_with_verb: false, raw: { deploy: true } },
      { session_id: "d", suggested: null, mode: "live", arm: "control", skill_calls: [], skill_args: {}, followed_with_verb: null, raw: {} },
    ];
    const s = summarizeOutcomes(rows);
    expect(s.byArm).toEqual([
      { arm: "control", outcomes: 2, suggestions: 1, followed: 0, followedWithVerb: 0, followRate: 0 },
      { arm: "live", outcomes: 2, suggestions: 2, followed: 2, followedWithVerb: 1, followRate: 1 },
    ]);
    expect(s.verbFidelity).toBeCloseTo(0.5);
    const md = renderOutcomesReport(s, { logPath: "/x/route-log.jsonl" });
    expect(md).toContain("### A/B arms (OPCHAIN_ROUTE_AB=1)");
    expect(md).toContain("| live | 2 | 2 | 2 | 1 | 1.000 |");
    expect(md).toContain("node scripts/route-eval.mjs label <session> <prompt hash>");
  });

  it("hand labels override the proxy; ambiguous rows leave every rate", () => {
    const L = (o, label) => ({ ...o, label });
    const s = summarizeOutcomes([
      L(oc(1, { suggested: "oc-git-ops" }), "oc-git-ops"), // TP although nothing ran (merge handed off later)
      L(oc(2, { suggested: "oc-git-ops", raw: { git_commit: true } }), "none"), // FP although a commit followed
      L(oc(3, { suggested: "oc-git-ops" }), "oc-deploy-ops"), // FP for git-ops and FN for deploy-ops
      L(oc(4, { raw: { git_commit: true } }), "none"), // TN: the commit was not what the prompt asked for
      L(oc(5), "oc-release-ops"), // FN
      L(oc(6, { suggested: "oc-bug-check" }), "ambiguous"), // counted as a suggestion, left out of the rates
    ]);
    expect(s).toMatchObject({ suggestions: 4, labelled: 5, ambiguous: 1, unlabelledSuggestions: 0 });
    expect(s.proxy).toMatchObject({ tp: 1, fp: 2, fn: 2, tn: 1, nonPipeline: 2, coreTp: 1, coreFp: 2 });
    expect(s.proxy.silentRate).toBeCloseTo(0.5);
    expect(s.perSkill.find((r) => r.skill === "oc-deploy-ops")).toMatchObject({ fn: 1 });
    expect(s.review).toEqual([]);
    expect(s.goNoGo.checks.find((c) => c.name === "every suggestion hand-labelled")).toMatchObject({ value: "4/4", pass: true });
    // Labels decide which skill a prompt needed: h3 (deploy-ops) and h5 (release-ops) are pipeline prompts the
    // agent went around; h1's suggestion matched its label but nothing ran, so it closes a gap.
    expect(s.baseline).toMatchObject({ pipeline: 3, agentUsed: 0, routerRight: 1, gapsClosed: 1 });
  });

  it("the proxy credits a skill's own steps and a handed-over merge", () => {
    const s = summarizeOutcomes([
      oc(1, { suggested: "oc-deploy-ops", skill_calls: ["oc-code-auditor", "oc-security-auditor"] }), // the audit gate opens a deploy
      oc(2, { suggested: "oc-git-ops", skill_calls: ["oc-docs-forge", "oc-repo-ops"] }), // the pre-PR gate
      oc(3, { suggested: "oc-git-ops", raw: { merge_handoff: true } }),
      oc(4, { suggested: "oc-git-ops", raw: { git_sync: true } }),
      oc(5, { suggested: "oc-code-auditor", skill_calls: ["oc-security-auditor"] }), // not a step of the auditor
    ]);
    expect(s.proxy).toMatchObject({ tp: 4, fp: 1 });
  });

  it("re-applies the p floor to logged suggestions that carry p, scoring them as no suggestion", () => {
    const s = summarizeOutcomes([
      { ...oc(1, { suggested: "oc-git-ops" }), p: 0.43, label: "none" }, // the Auto-fix shape: floored → silent
      { ...oc(2, { suggested: "oc-git-ops", raw: { gh_pr_merge: true } }), p: 0.9 }, // kept
      { ...oc(3, { suggested: "oc-deploy-ops" }), p: 0.55, label: "oc-deploy-ops" }, // floored → a miss
      oc(4, { suggested: "oc-git-ops", raw: { git_push: true } }), // no p (older log): kept
    ]);
    expect(s.floored.map((o) => o.for_prompt_hash)).toEqual(["h1", "h3"]);
    expect(s.suggestions).toBe(2);
    expect(s.proxy).toMatchObject({ tp: 2, fp: 0, fn: 1, tn: 1 });
    expect(summarizeOutcomes([{ ...oc(1, { suggested: "oc-git-ops" }), p: 0.43 }], { minP: 0 }).floored).toEqual([]);
    expect(renderOutcomesReport(s, { generatedAt: "x" })).toMatch(/\| Logged suggestions under the p ≥ 0\.6 floor \(scored as no suggestion\) \| 2 \|/);
  });

  it("lift: ∞ when nothing was used unprompted but the router closes a gap; n/a with no pipeline prompts", () => {
    const gap = summarizeOutcomes([oc(1, { suggested: "oc-git-ops", raw: { git_push: true } })]);
    expect(gap.baseline).toMatchObject({ pipeline: 1, agentUsed: 0, gapsClosed: 1, projected: 1, lift: Infinity });
    expect(gap.goNoGo.checks.find((c) => c.name.startsWith("projected skill use")).pass).toBe(true);
    expect(renderOutcomesReport(gap, { generatedAt: "x" })).toMatch(/Lift: \*\*∞ \(baseline 0\)×\*\*/);
    const none = summarizeOutcomes([oc(1)]);
    expect(Number.isNaN(none.baseline.lift)).toBe(true);
    expect(none.goNoGo.checks.find((c) => c.name.startsWith("projected skill use")).pass).toBe(false);
  });

  it("says GO when ≥30 suggestions, core precision ≥0.8, silent rate ≥0.95 and every suggestion is labelled", () => {
    const recs = [];
    for (let i = 0; i < 30; i++) recs.push(oc(i, { suggested: "oc-git-ops", raw: { git_push: true } }));
    for (let i = 0; i < 40; i++) recs.push(oc(100 + i));
    const proxyOnly = summarizeOutcomes(recs);
    expect(proxyOnly.proxy.corePrecision).toBe(1);
    expect(proxyOnly.proxy.silentRate).toBe(1);
    // Proxy numbers alone never switch live mode on.
    expect(proxyOnly.goNoGo.go).toBe(false);
    const s = summarizeOutcomes(recs.map((o) => (o.suggested ? { ...o, label: "oc-git-ops" } : o)));
    expect(s.goNoGo.go).toBe(true);
  });

  it("leaves explicit-mention outcomes out of every go/no-go metric and reports them separately (B-04)", () => {
    const explicit = (n, followed) => ({ ...oc(n, { suggested: "oc-git-ops", skill_calls: followed ? ["oc-git-ops"] : [] }), explicit: true });
    const recs = [...OUTCOMES, ...Array.from({ length: 40 }, (_, i) => explicit(200 + i, i % 2 === 0))];
    const s = summarizeOutcomes(recs);
    const base = summarizeOutcomes(OUTCOMES);
    expect(s.total).toBe(49);
    expect(s.routed).toBe(9);
    expect(s.explicit).toMatchObject({ total: 40, followed: 20, followRate: 0.5 });
    // Same numbers as without the explicit rows: 40 p=1 "suggestions" do not reach the ≥30 bar or the precision proxy.
    expect(s.suggestions).toBe(base.suggestions);
    expect(s.proxy).toEqual(base.proxy);
    expect(s.goNoGo).toEqual(base.goNoGo);
    expect(renderOutcomesReport(s, { generatedAt: "x" })).toMatch(/\| Explicit `\/oc-\*` mentions \(excluded from every metric here; 20 followed\) \| 40 \|/);
  });

  it("reads only outcome records (after --since) from a route log, through the CLI", () => {
    const dir = mkdtempSync(join(tmpdir(), "route-eval-outcomes-"));
    try {
      const log = join(dir, "route-log.jsonl");
      const lines = [
        { at: "2026-10-09T11:00:00.000Z", session_id: "s", prompt_hash: "h1", decision: { skill: "oc-git-ops" }, mode: "shadow" }, // a routing record
        oc(0, { suggested: "oc-git-ops", at: "2026-10-01T00:00:00.000Z" }), // before --since
        ...OUTCOMES,
      ];
      writeFileSync(log, lines.map((l) => JSON.stringify(l)).join("\n") + "\nnot json\n");
      expect(readOutcomeRecords(log, { since: "2026-10-05" })).toHaveLength(9);
      expect(readOutcomeRecords(log)).toHaveLength(10);
      const report = join(dir, "outcomes.md");
      const res = spawnSync(process.execPath, [SCRIPT, "outcomes", "--log", log, "--since", "2026-10-05", "--report", report, "--no-rescore"], { encoding: "utf8" });
      expect(res.status, res.stderr).toBe(0);
      expect(res.stdout).toMatch(/9 outcome\(s\) \(stored outcome records; 0 labelled\) · 6 suggestion\(s\) · 0 explicit \(excluded\) · 0 under the p floor · pipeline prompts 4: baseline skill use 2, projected 3 \(lift 1\.500×\) · core precision 0\.750 · recall 0\.800 · silent rate 0\.500 → NO-GO/);
      expect(readFileSync(report, "utf8")).toContain("# Skill router outcomes");
      const printed = spawnSync(process.execPath, [SCRIPT, "outcomes", "--log", log, "--no-rescore"], { encoding: "utf8" });
      expect(printed.status).toBe(0);
      expect(printed.stdout).toMatch(/\| Routed prompts scored \| 10 \|/);
      const missing = spawnSync(process.execPath, [SCRIPT, "outcomes", "--log", join(dir, "nope.jsonl"), "--no-rescore"], { encoding: "utf8" });
      expect(missing.status).toBe(2);
      expect(missing.stderr).toMatch(/no route log/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("label: --list shows unlabelled suggestions; a label is validated and appended beside the log", () => {
    const dir = mkdtempSync(join(tmpdir(), "route-eval-label-"));
    try {
      const log = join(dir, "route-log.jsonl");
      const recs = [
        { at: "2026-10-21T21:27:00.000Z", session_id: "s1", prompt_hash: "aaaa000000000001", prompt_head: "merge", decision: { skill: "oc-git-ops", args: "/oc-merge" }, mode: "shadow" },
        { at: "2026-10-21T21:28:00.000Z", session_id: "s1", prompt_hash: "aaaa000000000002", prompt_head: "good luck!", decision: null, mode: "shadow" },
      ];
      writeFileSync(log, recs.map((l) => JSON.stringify(l)).join("\n") + "\n");
      const list = spawnSync(process.execPath, [SCRIPT, "label", "--list", "--log", log], { encoding: "utf8" });
      expect(list.status, list.stderr).toBe(0);
      expect(list.stdout.trim().split("\n")).toEqual([expect.stringMatching(/^s1 aaaa000000000001 10-21T21:27 oc-git-ops \/oc-merge \| merge$/)]);
      expect(spawnSync(process.execPath, [SCRIPT, "label", "--list", "--all", "--log", log], { encoding: "utf8" }).stdout.trim().split("\n")).toHaveLength(2);
      const bad = spawnSync(process.execPath, [SCRIPT, "label", "s1", "aaaa000000000001", "oc-made-up", "--log", log], { encoding: "utf8" });
      expect(bad.status).toBe(2);
      expect(bad.stderr).toMatch(/not a skill id/);
      const unknown = spawnSync(process.execPath, [SCRIPT, "label", "s1", "ffff000000000000", "none", "--log", log], { encoding: "utf8" });
      expect(unknown.status).toBe(2);
      const ok = spawnSync(process.execPath, [SCRIPT, "label", "s1", "aaaa000000000001", "oc-git-ops", "--note", "merge prompt", "--log", log], { encoding: "utf8" });
      expect(ok.status, ok.stderr).toBe(0);
      expect(ok.stdout).toMatch(/^labelled aaaa000000000001 → oc-git-ops: merge/);
      expect(JSON.parse(readFileSync(join(dir, "route-labels.jsonl"), "utf8").trim())).toEqual({ session_id: "s1", prompt_hash: "aaaa000000000001", label: "oc-git-ops", note: "merge prompt" });
      const again = spawnSync(process.execPath, [SCRIPT, "label", "s1", "aaaa000000000001", "ambiguous", "--log", log], { encoding: "utf8" });
      expect(again.stdout).toMatch(/^relabelled \(was oc-git-ops\)/);
      expect(readLabels(join(dir, "route-labels.jsonl")).get("s1|aaaa000000000001")).toBe("ambiguous");
      expect(spawnSync(process.execPath, [SCRIPT, "label", "--list", "--log", log], { encoding: "utf8" }).stdout).toBe("nothing to label\n");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rescores routed prompts from the transcripts (subagents in, later turns out), falls back to stored outcomes, reads labels beside the log", () => {
    const dir = mkdtempSync(join(tmpdir(), "route-eval-rescore-"));
    try {
      const at = (min, sec = 0) => new Date(Date.UTC(2026, 9, 21, 12, min, sec)).toISOString();
      const hash = (t) => createHash("sha256").update(t).digest("hex").slice(0, 16);
      const human = (text, min) => ({ type: "user", timestamp: at(min), message: { role: "user", content: text } });
      const tool = (name, input, min, sec = 0) => ({ type: "assistant", timestamp: at(min, sec), message: { stop_reason: "tool_use", content: [{ type: "tool_use", name, input }] } });
      const reply = (text, min) => ({ type: "assistant", timestamp: at(min), message: { stop_reason: "end_turn", content: [{ type: "text", text }] } });
      const projects = join(dir, "projects");
      const proj = join(projects, "-Users-me-repo");
      mkdirSync(join(proj, "sess-a", "subagents"), { recursive: true });
      const [p1, p2, p3] = ["merge 590", "how is CI looking", "deploy to staging"];
      const main = [
        human(p1, 0),
        tool("Bash", { command: "gh pr view 590" }, 0, 20),
        reply("Green. Run `gh pr merge 590 --squash` when you're ready.", 1),
        human("<task-notification>\n<task-id>x</task-id>\n</task-notification>", 5),
        tool("Bash", { command: "git commit -m later" }, 6), // after the reply turn: not p1's
        reply("Committed.", 6),
        human(p2, 10),
        tool("Agent", { description: "check CI", run_in_background: true }, 10, 5),
        reply("Checking in the background.", 11),
        human(p3, 20),
        reply("Which commit?", 21),
      ];
      writeFileSync(join(proj, "sess-a.jsonl"), main.map((r) => JSON.stringify(r)).join("\n") + "\n");
      const sub = [
        { ...tool("Bash", { command: "git push origin HEAD" }, 10, 30), isSidechain: true }, // inside p2's window
        { ...tool("Bash", { command: "npm run deploy" }, 15), isSidechain: true }, // after it closed
      ];
      writeFileSync(join(proj, "sess-a", "subagents", "agent-1.jsonl"), sub.map((r) => JSON.stringify(r)).join("\n") + "\n");
      const logDir = join(dir, "log");
      mkdirSync(logDir);
      const log = join(logDir, "route-log.jsonl");
      const route = (sid, text, min, skill) => ({ at: at(min, 1), session_id: sid, prompt_hash: hash(text), prompt_head: text, decision: skill ? { skill } : null, mode: "shadow" });
      writeFileSync(log, [
        route("sess-a", p1, 0, "oc-git-ops"),
        route("sess-a", p2, 10, null),
        route("sess-a", p3, 20, "oc-deploy-ops"),
        route("sess-b", "merge 7", 0, "oc-git-ops"), // transcript gone: the stored outcome scores it
        { type: "outcome", session_id: "sess-b", for_prompt_hash: hash("merge 7"), at: at(2), suggested: "oc-git-ops", mode: "shadow", skill_calls: [], raw: { ...RAW0, gh_pr_merge: true } },
        route("sess-c", "anything", 0, null), // neither: unscored
      ].map((r) => JSON.stringify(r)).join("\n") + "\n");
      writeFileSync(join(logDir, "route-labels.jsonl"), "// labels\n" + JSON.stringify({ session_id: "sess-a", prompt_hash: hash(p3), label: "oc-deploy-ops" }) + "\n");

      expect(readRouteRecords(log)).toHaveLength(5);
      expect(transcriptIndex(projects).get("sess-a")).toBe(join(proj, "sess-a.jsonl"));
      expect(readLabels(join(logDir, "route-labels.jsonl")).get(`sess-a|${hash(p3)}`)).toBe("oc-deploy-ops");

      const rowsOut = join(dir, "rows.jsonl");
      const res = spawnSync(process.execPath, [SCRIPT, "outcomes", "--log", log, "--projects-root", projects, "--rows", rowsOut, "--report", join(dir, "o.md")], { encoding: "utf8" });
      expect(res.status, res.stderr).toBe(0);
      expect(res.stdout).toMatch(/4 outcome\(s\) \(3 rescored from transcripts, 1 from stored records, 1 unscored; 1 labelled\) · 3 suggestion\(s\) · 0 explicit \(excluded\) · 0 under the p floor · pipeline prompts 4: baseline skill use 0, projected 3 \(lift ∞×\) · core precision 1\.000 · recall 0\.750 · silent rate n\/a → NO-GO/);
      const rows = readFileSync(rowsOut, "utf8").trim().split("\n").map((l) => JSON.parse(l));
      const byHash = Object.fromEntries(rows.map((r) => [r.for_prompt_hash, r]));
      expect(byHash[hash(p1)]).toMatchObject({ source: "transcript", anchor: "prompt", window_end: "turn_end", raw: { merge_handoff: true, git_commit: false } });
      expect(byHash[hash(p2)]).toMatchObject({ source: "transcript", window_end: "turn_end", raw: { git_push: true, deploy: false } });
      expect(byHash[hash(p3)]).toMatchObject({ label: "oc-deploy-ops", skill_calls: [], raw: { deploy: false } });
      expect(byHash[hash("merge 7")]).toMatchObject({ source: "log", raw: { gh_pr_merge: true } });
      const md = readFileSync(join(dir, "o.md"), "utf8");
      expect(md).toMatch(/\| Scored from transcripts \/ stored outcome records \| 3 \/ 1 \|/);
      expect(md).toMatch(/\| Window closed by end of reply turn \/ next human turn \/ horizon \/ still open \| 3 \/ 0 \/ 0 \/ 0 \|/);
      expect(md).toMatch(/### Unlabelled suggestions \(2\)/);
      expect(md).toContain(`| sess-a | ${hash(p2)} | how is CI looking | — | raw git | FN |`);

      const badWindow = spawnSync(process.execPath, [SCRIPT, "outcomes", "--log", log, "--window-minutes", "-1"], { encoding: "utf8" });
      expect(badWindow.status).toBe(2);
      const badLabels = spawnSync(process.execPath, [SCRIPT, "outcomes", "--log", log, "--labels", join(dir, "nope.jsonl")], { encoding: "utf8" });
      expect(badLabels.status).toBe(2);
      expect(badLabels.stderr).toMatch(/no labels file/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
