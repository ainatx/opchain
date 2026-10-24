# Jev router: shadow-mode performance, days 1–5

**Date:** 2026-10-23
**Scope:** the skill router (`plugins/opchain/hooks/route-prompt.cjs` + `lib/route-dispatch.cjs`, model `jev-1.13.0`) running in shadow mode from the user-level hook in `~/.claude/settings.json` (checkout `~/repos/opchain-router` at `754be8c5`; its router files are byte-identical to `main` `809ed373`).
**Data:** `~/.claude/opchain-route/route-log.jsonl`: 64 routing records and 60 outcome records, 2026-10-19 17:58Z → 2026-10-23 18:06Z, across six sessions (five opchain, one deftwright-site). Coverage was cross-checked against every main-session transcript under `~/.claude/projects/` for the same window.
**Method:** `npm run route:eval -- outcomes` (the runbook's proxy report). Then all 64 prompts were labelled by hand, prompt text only, to match the router's context-off request shape. Proxy disagreements were checked against the transcripts. Scripts and the raw report are in the session scratchpad (not tracked). §7 covers the scoring rework made the same day, which re-scored 75 prompts (the original 64 plus 11 logged during the analysis) with the labels kept in `~/.claude/opchain-route/route-labels.jsonl`.
**Baseline:** the shipped-threshold row of `docs/runbooks/skill-router-eval.md` §4 (574 blind-labelled prompts, 2026-10-09): **P 0.860 / R 0.902 / silent 0.987**.

## Summary

The runbook's report says **NO-GO**, with precision 0.31, recall 0.29 and a silent rate of 0.78. Those numbers mostly measure the outcome proxy, not Jev. The hand-labelled numbers are better, though still below the offline eval and still NO-GO:

| | Offline eval (10-09) | Production, proxy report | **Production, hand-labelled** |
|---|---:|---:|---:|
| Suggestions | n/a | 16 | 17 |
| Precision | 0.860 | 0.313 | **0.714** (0.59–0.76 depending on 3 ambiguous rows) |
| Recall | 0.902 | 0.294 | **0.769** (10/13) |
| Silent on ordinary prompts | 0.987 | 0.780 | **0.897** (35/39) |

1. **Ranking is fine; the `fits` score is the weak link.** Jev's top-1 was the right skill on **13 of 13** prompts that clearly called for one. All three misses came from the second request's `fits` score falling under the bar. All four false suggestions had `fits` at or above it. The fits score is under-confident on some true cases and over-confident on some false ones, so no single threshold separates the two groups (§4).
2. **The errors fall into two patterns:**
   - False suggestions: "Turn on Auto-fix for PR N" → oc-git-ops (×2), and questions that *name* a skill ("and bug check", "Bug check should be in there shouldn't it") → oc-bug-check (×2).
   - Misses: long "Open a deftwright-site PR that …" prompts → oc-git-ops (×2), and "Plan a … release to staging, then production" → oc-release-ops (×1).
   - Fixing the spec copy for these two patterns would have made every unambiguous row correct in this sample. The sample is small (13 positives), so treat that as a direction, not a result.
3. **Coverage bug: the hook never routes desktop-app prompts that open with a system reminder.** `route-prompt.cjs:281` silences any prompt that starts with `<`. In this window, 10 of 11 such prompts went unrouted, against 3 of 71 plain prompts. They are disproportionately the task-defining ones: the first prompt of a worktree session, two `/oc-*` commands, and two merge requests. That is why the log has **0 explicit `/oc-*` routes**.
4. **Latency and cost are not a concern.** Over 64 calls there were 0 errors, 0 timeouts and 0 retries. Jev's time was p50 332 ms, p90 423 ms, max 603 ms. The whole hook took p50 1.04 s, p90 1.26 s, max 2.5 s against an 8 s budget. Input tokens came to 278k, about **$0.012** at the runbook's $0.042/M input rate (output tokens, 48.6k, are unpriced there). The decision cache never hit, because its key includes repo state.
5. **The day-8 gate couldn't pass as written; the scorer is now fixed (§7).** Shadow mode's "follow rate" (0.063) only measures what the agent did without being told: nobody saw the suggestion. The proxy also couldn't see several kinds of correct follow-through (§3). Even with clean labels, 17 suggestions in four days puts the ≥ 30 bar at about day 7 (2026-10-26), and that's before the coverage fix adds the missing prompts.

## 1. What the router decided

| Outcome | Rows | Note |
|---|---:|---|
| Suggested | 17 | 9 oc-git-ops, 6 oc-deploy-ops, 2 oc-bug-check |
| Silent: `fits` under the bar | 17 | 7 of these are non-core skills held by the 0.9 bar (orchestrator ×3, ux-engineer, dash-forge, prompt-ops, update) |
| Silent: request 1 chose `none` | 13 | 9 are the repeated "ask me questions using AskUserQuestion tool" template, all `none`, all consistent |
| Silent: `gate` < 0.5 | 13 | |
| Silent: rerank chose `none` | 4 | |
| Suppressed by allowlist / explicit / error | 0 / 0 / 0 | |

oc-git-ops is the default attractor. It ranked first on 11 of 51 rows that were not clear git work, including "7.8 is a shitty passing grade", "im back on my machine" and "Try again". The `gate` and `fits` checks held 7 of those back; 2 leaked (the Auto-fix rows) and 2 are ambiguous.

The router isn't fully deterministic at the boundary, which the runbook already notes. "Turn on Auto-fix for PR N" appeared 5 times. Twice it reached `fits` exactly 0.60 (the bar) and suggested oc-git-ops; three times the rerank chose `none`.

## 2. Hand-labelled errors

**False suggestions (4 of 39 clear-negative rows):**

| # | Prompt (head) | Suggested | fits | Pattern |
|---|---|---|---:|---|
| 11 | "and bug check" (follow-up to "where is code auditor") | oc-bug-check | 0.90 | question naming a skill |
| 45 | "Bug check should be in there shouldn't it" | oc-bug-check | 0.79 | question naming a skill |
| 24 | "Turn on Auto-fix for PR 247." | oc-git-ops | 0.60 | app feature, not a git operation |
| 37 | "Turn on Auto-fix for PR 251." | oc-git-ops | 0.60 | same |

**Misses (3 of 13 clear-positive rows), all with the right top-1:**

| # | Prompt (head) | Top-1 (rerank) | fits | Bar |
|---|---|---|---:|---:|
| 13 | "Open a deftwright-site fix PR for A-001 (purge deletes or detaches lea…" | oc-git-ops (0.71) | 0.55 | 0.6 |
| 18 | "Open a deftwright-site PR that records the 2026-10-20 production relea…" | oc-git-ops (0.58) | 0.47 | 0.6 |
| 9 | "Plan a deftwright-site release of origin/main to staging, then product…" | oc-release-ops (0.80) | 0.25 | 0.6 |

In #13 and #18, most of the text describes the PR's *content*, and `fits` seems to judge that content, not the verb "Open a PR". #9 is the starkest case: rerank 0.80 against fits 0.25.

**Ambiguous (12 rows, excluded from P/R/silent).** Three of these got suggestions:
- #12 "so we're close to merge/" → git-ops
- #23 "Run a fourth audit round …; if it passes, commit" → git-ops; the code auditor is the primary skill here
- #29 "can i see it in staging" → deploy-ops

The rest are context-dependent assents ("Approved … then build it", "do it") or design-skill requests where the 0.9 non-core bar held a plausible suggestion back.

## 3. Why the proxy report is wrong

Of the proxy's 11 false positives, only 4 are real (§2). 3 are ambiguous. The other 4 were correct suggestions that the proxy couldn't see being followed:

| # | Prompt | What actually happened | Proxy blind spot |
|---|---|---|---|
| 36 | "merge" | PR #643 already had auto-merge queued; the agent confirmed with `gh pr view` | Only `gh pr merge` counts. On ainatx/opchain the human runs the squash-merge, so a correct merge turn often has no merge command |
| 39 | "Merge 249 and rebate 251" | the agent started the merge (fetch, checkout, merge main through the gate), then the user's next prompt closed the window | A queued follow-up prompt ends the window early |
| 40 | "Run the staging command too" | the agent read `scripts/deploy.mjs` and deferred the staging deploy until #251 was rebased | Work deferred past the window; `node scripts/deploy.mjs` doesn't match the deploy regex anyway |
| 49 | "it looks good deploy to prod" | the agent ran the pre-deploy gate: bug-check, `oc-code-auditor` pre-deploy, `oc-security-auditor` posture | oc-deploy-ops' own first step (the audit gate) counts as unrelated |

Of the proxy's 12 false negatives, 2 are real router misses (#13, #18). 4 depend on context the router doesn't get by design ("do it", "im back on my machine", "Approved … then build it", "I will be asleep …"). 1 is a status question ("when will it merge"). #9, a real miss, isn't in the proxy's count at all because nothing ran in its window.

The other 5 (after "ask me questions using AskUserQuestion tool", ×4, and "is 647 next?") were windows that stayed open too long. The hook closes a prompt's window when the session's next UserPromptSubmit fires, whatever it is. Over an idle stretch that can be a day or more: one window ran from 2026-10-20 05:36 to 2026-10-21 17:28 and collected every commit, push, PR and deploy in between; the longest ran 69 h. *(Corrected 2026-10-24: this paragraph first said task notifications never fire the hook. They do, and so do CI monitor events, `!` commands and other sessions' messages: of the 60 stored outcomes, 22 were closed by one of these, often seconds after the prompt. So windows also closed too early. The hook now records outcomes only on a person's turn.)* A first reading blamed checkpoint commits; that was wrong. Those commits are the oc-docs-forge / oc-repo-ops evidence binding, which is oc-git-ops work.

Smaller blind spots:
- Subagent activity is skipped (`isSidechain`).
- MCP tools are invisible (`ccd_pr` Auto-fix, auto-merge).
- 19 of 60 stored outcomes couldn't find their prompt in the transcript and fell back to a time anchor. The hook reads only a 256 KB tail, which a busy turn outgrows.
- Raw-command regexes match mentions as well as commands (`grep "git commit"`).
- In shadow mode, the `followed` field as a whole means nothing.

## 4. Thresholds: no fix there

What-if on the core `fits` bar, same rows, same labels:

| Core fits ≥ | TP | FN | FP | Ambiguous suggested |
|---:|---:|---:|---:|---:|
| 0.50 | 11 | 2 | 6 | 4 |
| 0.55 | 11 | 2 | 4 | 4 |
| **0.60 (shipped)** | **10** | **3** | **4** | **3** |
| 0.65 | 10 | 3 | 2 | 3 |
| 0.70 | 9 | 4 | 2 | 2 |

Raising the bar to 0.65 removes the two Auto-fix false positives without losing a true one here, but the lowest true positive (#49) sits at 0.66. Lowering it to 0.55 recovers #13 but not #18 or #9. Neither change touches the bug-check questions (fits 0.79 and 0.90). Don't move the bar on 64 rows. The fix belongs in the spec copy that drives `fits`:
- "Open / raise a PR" is oc-git-ops whatever the PR is about.
- A question *about* a skill ("where is X", "should X be in there") is not a request to run it.
- Toggling the app's Auto-fix or CI monitoring is not oc-git-ops.
- Planning a release to staging/production is oc-release-ops.

After the fix, re-run the 574-row offline set to check that it holds.

## 5. Coverage

| | Prompts | Routed |
|---|---:|---:|
| Plain human prompts (opchain + deftwright-site) | 71 | 68 |
| Prompts whose first content block is a desktop-app `<system-reminder>` | 11 | 1 |

Among the unrouted reminder-prefixed prompts:
- "run /oc-app-architect and find the docs and uat SK…"
- "Run /oc-audit pre-deploy and /oc-security posture …"
- "Merge the release record PR #254."
- "Go: merge PR #255 with gh pr merge 255 --squash …"
- "Turn on Auto-fix for PR #244 …"
- "run an analysis on JEV performance" (twice: this session and a parallel one)

The hook reads `input.prompt` and silences on `startsWith("<")` (line 281). That rule was meant for task notifications. The transcripts store these prompts as a reminder text block followed by the human's block, so `prompt` very likely starts with `<system-reminder>`. The 10/11 vs 3/71 split supports that reading. Confirming it from the hook's stdin would close it. The fix is to strip leading `<system-reminder>…</system-reminder>` blocks before the envelope check, and to keep silencing prompts that are *only* an envelope (`<task-notification>`). `route-eval build-dataset` has the same blind spot, so the offline corpus is also missing these prompts.

Three plain prompts weren't routed: two compaction-continuation summaries (correct to skip) and one "Squash-merge PR 247 with --auto …" on 10-21 19:15Z, cause unknown.

## 6. Recommendations, in order

1. **Fix the envelope silence** in `route-prompt.cjs` and in `route-eval build-dataset`, with a hook test for a reminder-prefixed prompt. It restores the explicit-mention path and the highest-value prompts.
2. ~~**Fix the outcome proxy** before day 8, or the gate stays NO-GO whatever Jev does.~~ Done the same day (§7).
3. **Spec copy for `fits`:** the four rules in §4. Then re-run the offline eval. Keep the core bar at 0.6 until that run says otherwise.
4. **Re-run this analysis on 2026-10-27** (day 8). At the current rate there should be about 30 suggestions by then, more once (1) lands.

## 7. Scoring rework (same day)

`route-eval outcomes` now scores the router, not the scorer (`docs/runbooks/skill-router-eval.md` §6):

- **Rescored from transcripts.** Every routing record is rescored from its session's full transcript plus subagent transcripts, anchored on the prompt copy that was routed. The hook's stored record is used only when the transcript is gone.
- **The window is the reply turn.** It closes at the first `end_turn`, the next human turn, or 30 min.
- **Related activity includes a skill's own steps:**
  - deploy-ops: the code + security audit gate
  - git-ops: bug-check, docs-forge, repo-ops
  - git-ops also gets merge/rebase, auto-merge via MCP, and a `gh pr merge …` handed to the user
  - deploy-ops also gets `node scripts/deploy.mjs`
- **Command-position regexes.** Mentions of a command no longer count.
- **Hand labels override the proxy.** A fourth go/no-go check requires every suggestion to be labelled before live mode.
- **Follow rate is live-only.** In shadow, the same number is reported as the unprompted baseline.

Same log (75 routed prompts, 71 stored outcome records), three scorers:

| | Scorer on `main` (stored records) | New proxy, no labels | New, with hand labels |
|---|---:|---:|---:|
| Suggestions | 16 | 17 | 17 |
| Core precision | 0.313 | 0.588 | **0.714** |
| Recall | 0.278 | 0.323 | **0.769** |
| Silent rate | 0.824 | 0.881 | **0.920** |
| Verdict | NO-GO | NO-GO | NO-GO (17 < 30, 0.71 < 0.8, 0.92 < 0.95) |

The labelled column matches the hand count in the summary (precision 0.714, recall 0.769). The silent rate is 0.920 rather than 0.897 because the 11 prompts logged during this analysis were all correctly left alone.

**Window choice.** Two windows were tried against the 63 hand-labelled rows:
- **Reply turn (shipped):** agreed with the labels on 46 rows and 12 of 14 suggestions. It errs low: precision 0.57 against a true 0.71.
- **Next human prompt:** agreed on 38 rows and 11 of 14 suggestions. It errs high: precision 0.79.

The reply turn shipped because a gate's proxy should err conservative, and because the labels now settle the suggestion rows anyway.

**The verdict is still NO-GO, and now it's Jev's own.** Precision 0.71 against a 0.8 bar comes from 4 false suggestions (two Auto-fix toggles, two bug-check questions); silent 0.92 against 0.95 comes from the same 4. The §4 spec-copy fixes target exactly those. The volume bar should clear around 2026-10-26, sooner once the §5 coverage bug is fixed.
