import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { addElsewhereEvidence, githubEvidence, otherSessionEvidence, prRefsIn, repoRootOf, summarizeOutcomes } from "../scripts/route-eval.mjs";

const require = createRequire(import.meta.url);
const ROOT = resolve(import.meta.dirname, "..");
const dispatch = require(join(ROOT, "plugins/opchain/hooks/lib/route-dispatch.cjs"));

const AT = "2026-11-05T03:56:00.000Z";
const row = (over = {}) => ({ session_id: "s1", for_prompt_hash: "h1", at: AT, request: "merge 284", branch: "claude/feature-x", cwd: "/r/site/.claude/worktrees/feature-x", suggested: "oc-git-ops", suggested_args: "/oc-merge", mode: "live", injected: true, skill_calls: [], raw: {}, ...over });

describe("work done elsewhere", () => {
  it("finds the main checkout of a worktree", () => {
    expect(repoRootOf("/r/site/.claude/worktrees/feature-x")).toBe("/r/site");
    expect(repoRootOf("/r/site/.claude/worktrees/feature-x/sub")).toBe("/r/site");
    expect(repoRootOf("/r/site")).toBe("/r/site");
    expect(repoRootOf(null)).toBe(null);
  });

  it("reads PR numbers a request names", () => {
    expect([...prRefsIn("Yes, merge #275")]).toEqual([275]);
    expect([...prRefsIn("Merge 252")]).toEqual([252]);
    expect([...prRefsIn("Yes. Merge 259, then 261, then 260 (rebase it)")].sort()).toEqual([259, 260, 261]);
    expect([...prRefsIn("Merge 249 and rebate 251")].sort()).toEqual([249, 251]);
    expect(prRefsIn("apply migration 0045 to staging").size).toBe(0);
  });

  it("credits a merge, an auto-merge or an opened PR in the window, by number or branch", () => {
    const prs = [
      { number: 284, headRefName: "other", mergedAt: "2026-11-05T04:10:00Z" },
      { number: 9, headRefName: "claude/feature-x", createdAt: "2026-11-05T03:57:00Z", autoMergeAt: ["2026-11-05T03:58:00Z"] },
      { number: 7, headRefName: "unrelated", mergedAt: "2026-11-05T04:00:00Z" },
    ];
    const ev = githubEvidence(row(), prs);
    expect(ev.raw).toEqual({ gh_pr_merge: true, gh_pr_create: true });
    expect(ev.notes).toEqual(["GitHub: #284 merged", "GitHub: #9 set to auto-merge", "GitHub: #9 opened"]);
  });

  it("ignores state changes before the prompt or after the window", () => {
    const prs = [{ number: 284, mergedAt: "2026-11-05T03:50:00Z" }, { number: 284, mergedAt: "2026-11-05T09:00:00Z" }];
    expect(githubEvidence(row(), prs).raw).toEqual({});
    expect(githubEvidence(row(), prs, { hours: 6 }).raw).toEqual({ gh_pr_merge: true });
  });

  it("credits another session in the same repository, never this one or another repo", () => {
    const bash = (command, ts = "2026-11-05T04:00:00Z") => ({ type: "assistant", timestamp: ts, message: { content: [{ type: "tool_use", name: "Bash", input: { command } }] } });
    const sessions = [
      { session_id: "s1", root: "/r/site", records: [bash("gh pr merge 284 --squash")] },
      { session_id: "s2", root: "/r/other", records: [bash("gh pr merge 284 --squash")] },
      { session_id: "s3", root: "/r/site", records: [bash("gh pr merge 2840 --squash"), bash("npm run deploy:staging")] },
    ];
    expect(otherSessionEvidence(row(), sessions).raw).toEqual({ deploy: true });
    sessions.push({ session_id: "s4", root: "/r/site", records: [bash("gh pr merge 284 --squash --auto")] });
    const ev = otherSessionEvidence(row(), sessions);
    expect(ev.raw).toEqual({ deploy: true, gh_pr_merge: true });
    expect(ev.notes).toContain("session s4: gh pr merge");
  });

  it("feeds the follow-through table and leaves hand labels alone", () => {
    const rows = [
      row({ for_prompt_hash: "a", label: "oc-git-ops" }),
      row({ for_prompt_hash: "b", label: "oc-git-ops", skill_calls: ["oc-git-ops"] }),
      row({ for_prompt_hash: "c", label: "oc-git-ops", raw: { gh_pr_merge: true } }),
      row({ for_prompt_hash: "d", label: "none", request: "Yes, start PR 1" }),
      row({ for_prompt_hash: "e", label: "oc-git-ops", request: "merge 1", redirects: ["block"], skill_calls: ["oc-git-ops"] }),
    ];
    addElsewhereEvidence(rows, { prsByRoot: new Map([["/r/site", [{ number: 284, mergedAt: "2026-11-05T04:10:00Z" }]]]) });
    const S = summarizeOutcomes(rows);
    expect(S.follow).toMatchObject({ shown: 5, right: 4, wrong: 1, viaSkill: 2, rawInSession: 1, elsewhere: 1, notDone: 0 });
    expect(S.redirects).toEqual({ block: 1, override: 0, blockThenSkill: 1 });
    // The labelled "none" row stays a false suggestion whatever GitHub shows.
    expect(S.proxy.fp).toBe(1);
  });
});

describe("compaction summaries are not a person's turn", () => {
  const summary = { type: "user", isCompactSummary: true, timestamp: "2026-11-05T03:56:02Z", message: { role: "user", content: "This session is being continued from a previous conversation that ran out of context." } };
  it("humanText and isHumanTurn skip them, so the outcome window stays open", () => {
    expect(dispatch.humanText(summary)).toBe(null);
    expect(dispatch.isHumanTurn(summary)).toBe(false);
    const prompt = { type: "user", timestamp: "2026-11-05T03:56:00Z", message: { role: "user", content: "merge 284" } };
    const merge = { type: "assistant", timestamp: "2026-11-05T03:56:10Z", message: { content: [{ type: "tool_use", name: "Bash", input: { command: "gh pr merge 284" } }] } };
    const hash = dispatch.promptHash(dispatch.redactSecrets("merge 284"));
    const out = dispatch.outcomeFromRecords([prompt, summary, merge], { forPromptHash: hash });
    expect(out.raw.gh_pr_merge).toBe(true);
  });

  it("counts a remote D1 migration as deploy work, not a local one", () => {
    expect(dispatch.rawCommandClasses("npx wrangler d1 migrations apply DB --env staging --remote").deploy).toBe(true);
    expect(dispatch.rawCommandClasses("npx wrangler d1 migrations apply DB --local").deploy).toBe(false);
  });
});
