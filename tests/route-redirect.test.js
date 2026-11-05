import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const ROOT = resolve(import.meta.dirname, "..");
const HOOK = join(ROOT, "plugins/opchain/hooks/route-redirect.cjs");
const dispatch = require(join(ROOT, "plugins/opchain/hooks/lib/route-dispatch.cjs"));
const redirect = require(HOOK);

const SID = "sess-1";
const PROMPT = "merge 675";
const HASH = dispatch.promptHash(dispatch.redactSecrets(PROMPT));
const AT = "2026-11-05T20:00:00.000Z";

function route(over = {}) {
  return { at: AT, session_id: SID, prompt_hash: HASH, mode: "live", injected: true, decision: { skill: "oc-git-ops", args: "/oc-merge", p: 0.8 }, ...over };
}
const userPrompt = (text, ts = "2026-11-05T19:59:59.900Z") => ({ type: "user", timestamp: ts, message: { role: "user", content: text } });
const bash = (command, ts = "2026-11-05T20:00:05.000Z") => ({ type: "assistant", timestamp: ts, message: { role: "assistant", content: [{ type: "tool_use", name: "Bash", input: { command } }] } });
const skill = (id, args, ts = "2026-11-05T20:00:03.000Z") => ({ type: "assistant", timestamp: ts, message: { role: "assistant", content: [{ type: "tool_use", name: "Skill", input: { skill: id, args } }] } });
const endTurn = (ts = "2026-11-05T20:00:09.000Z") => ({ type: "assistant", timestamp: ts, message: { role: "assistant", stop_reason: "end_turn", content: [{ type: "text", text: "done" }] } });

function decide({ command = "gh pr merge 675 --squash", log = [route()], transcript = [userPrompt(PROMPT)] } = {}) {
  return redirect.decide({ command, sessionId: SID, logRecords: log, transcriptRecords: transcript });
}

describe("route-redirect decide()", () => {
  it("blocks a raw merge in the turn the router sent to oc-git-ops", () => {
    const d = decide();
    expect(d).toMatchObject({ action: "block", cls: "gh_pr_merge", skill: "oc-git-ops", args: "/oc-merge" });
    expect(redirect.reasonFor(d)).toContain('invoke the Skill tool with skill "oc-git-ops" and args "/oc-merge"');
  });

  it("lets the same class through on the second attempt and calls it an override", () => {
    const log = [route(), { type: "redirect", at: "2026-11-05T20:00:06.000Z", session_id: SID, for_prompt_hash: HASH, for_route_at: AT, class: "gh_pr_merge", action: "block" }];
    expect(decide({ log }).action).toBe("override");
  });

  it("does not let a block from an earlier copy of the same prompt count for this turn", () => {
    const earlier = { ...route(), at: "2026-11-05T19:00:00.000Z" };
    const oldBlock = { type: "redirect", at: "2026-11-05T19:00:05.000Z", session_id: SID, for_prompt_hash: HASH, for_route_at: earlier.at, class: "gh_pr_merge", action: "block" };
    expect(decide({ log: [earlier, oldBlock, route()] }).action).toBe("block");
    const legacyBlock = { ...oldBlock, for_route_at: undefined };
    expect(decide({ log: [earlier, legacyBlock, route()] }).action).toBe("block");
  });

  it("allows once the suggested skill was invoked this turn", () => {
    expect(decide({ transcript: [userPrompt(PROMPT), skill("opchain:oc-git-ops", "/oc-merge 675")] }).action).toBe("allow");
  });

  it("allows when the suggestion was not shown (shadow, control arm)", () => {
    expect(decide({ log: [route({ injected: false, mode: "shadow" })] }).action).toBe("allow");
  });

  it("allows once the routed prompt's turn is over", () => {
    expect(decide({ transcript: [userPrompt(PROMPT), endTurn()] }).action).toBe("allow");
    expect(decide({ transcript: [userPrompt(PROMPT), endTurn(), userPrompt("now something else", "2026-11-05T20:01:00.000Z")] }).action).toBe("allow");
  });

  it("allows a raw command for a different skill than the one suggested", () => {
    expect(decide({ command: "npm run deploy:staging" }).action).toBe("allow");
    expect(decide({ command: "npm run deploy:staging", log: [route({ decision: { skill: "oc-deploy-ops", args: "/oc-deploy staging" } })] })).toMatchObject({ action: "block", cls: "deploy", args: "/oc-deploy staging" });
  });

  it("maps PR creation and remote D1 migrations to their skills", () => {
    expect(decide({ command: "gh pr create --title x --body y" })).toMatchObject({ action: "block", cls: "gh_pr_create" });
    const deploy = [route({ decision: { skill: "oc-deploy-ops", args: "/oc-deploy staging" } })];
    expect(decide({ command: "npx wrangler d1 migrations apply DB --env staging --remote", log: deploy }).action).toBe("block");
    expect(decide({ command: "npx wrangler d1 migrations apply DB --local", log: deploy }).action).toBe("allow");
  });

  it("ignores commands that only mention the raw command", () => {
    for (const command of ['grep -n "gh pr merge" docs/x.md', "echo 'gh pr merge 1'", "git commit -m 'gh pr merge later'", "gh pr view 675"]) {
      expect(redirect.redirectClasses(command)).toEqual([]);
    }
  });

  it("reads only the session's newest routing record", () => {
    const newer = { ...route({ prompt_hash: "ffff", decision: null, injected: false }), at: "2026-11-05T20:05:00.000Z" };
    expect(decide({ log: [route(), newer] }).action).toBe("allow");
    const otherSession = { ...route(), session_id: "other" };
    expect(decide({ log: [otherSession] }).action).toBe("allow");
  });

  it("sees through a compaction that lands right after the prompt", () => {
    const summary = { type: "user", isCompactSummary: true, timestamp: "2026-11-05T20:00:01.000Z", message: { role: "user", content: "This session is being continued from a previous conversation…" } };
    expect(decide({ transcript: [userPrompt(PROMPT), summary] }).action).toBe("block");
  });
});

describe("route-redirect as a hook process", () => {
  const dirs = [];
  afterEach(() => {
    while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true });
  });

  function setup() {
    const dir = mkdtempSync(join(tmpdir(), "route-redirect-"));
    dirs.push(dir);
    const log = join(dir, "log.jsonl");
    const transcript = join(dir, "t.jsonl");
    writeFileSync(log, JSON.stringify(route()) + "\n");
    writeFileSync(transcript, JSON.stringify(userPrompt(PROMPT)) + "\n");
    const run = (command, env = {}) =>
      spawnSync(process.execPath, [HOOK], {
        input: JSON.stringify({ session_id: SID, transcript_path: transcript, tool_name: "Bash", tool_input: { command }, hook_event_name: "PreToolUse" }),
        env: { ...process.env, OPCHAIN_ROUTE_LOG: log, ...env },
        encoding: "utf8",
      });
    return { log, run };
  }

  it("denies the first raw merge, allows the retry, and logs both", () => {
    const { log, run } = setup();
    const first = run("gh pr merge 675 --squash");
    expect(first.status).toBe(0);
    expect(JSON.parse(first.stdout).hookSpecificOutput).toMatchObject({ hookEventName: "PreToolUse", permissionDecision: "deny" });
    const second = run("gh pr merge 675 --squash");
    expect(second.status).toBe(0);
    expect(second.stdout).toBe("");
    const actions = readFileSync(log, "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((r) => r.type === "redirect").map((r) => r.action);
    expect(actions).toEqual(["block", "override"]);
  });

  it("stays silent for ordinary commands, bad input and OPCHAIN_ROUTE_REDIRECT=0", () => {
    const { run } = setup();
    expect(run("ls -la").stdout).toBe("");
    expect(run("gh pr merge 675", { OPCHAIN_ROUTE_REDIRECT: "0" }).stdout).toBe("");
    const bad = spawnSync(process.execPath, [HOOK], { input: "not json", encoding: "utf8" });
    expect(bad.status).toBe(0);
    expect(bad.stdout).toBe("");
  });
});
