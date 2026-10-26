# Jev router: §3 spec copy (`+route4`) and the day-8 re-run

**Date:** 2026-10-26
**Scope:** §3 of `docs/plans/2026-10-24-jev-integration-plan.md`. It checks what landed from the 2026-10-23 audit's §4 copy fixes, fixes what still failed on the J1 gold set, re-runs the 574-row blind-labelled offline set, and runs the day-8 shadow report.
**Model:** `jev-1.13.0`, every run live with the owner's key. Total spend was under $0.40.
**Baseline:** `main` @ `30c13338` (#658), spec `2.0.4+route3`, p floor 0.6 from #655.

## Summary

1. **All four audit §4 fixes were already on main, from #654, not #655.** #655 added the p ≥ 0.6 floor. The copy is below.
2. **Live, main's spec still failed 3 of 27 J1 rows.** It misrouted a release plan to deploy-ops. It suggested bug-check on "and bug check". It picked the `/oc-git` menu verb for "Open a … PR", so that row went silent.
3. **`+route4` fixes all three with narrow, skill-scoped copy.** J1 is now 27 of 27 in five separate live runs. The 574-row blind set is unchanged: precision 1.000, recall 0.805, silent 1.000, with no row fixed or broken.
4. **Two broader wordings were tried and rejected.** A global request rule fixed "and bug check" but silenced "MERGE?" in 5 of 5 runs and pushed "check" to bug-check. A release verb question that named the semver turned "so we can version it" into a release suggestion in 4 of 5 runs. Both fixes now live in the one skill they concern.
5. **Day 8 is still NO-GO, but not on precision.** The report's 0.571 precision and 0.899 silent rate score decisions the hook logged with older router builds. Re-routing the same production prompts gives precision 1.000, recall 0.917 and silent 1.000 on main, and 1.000 on all three with `+route4`. The real blockers are volume, unlabelled suggestions, and a production hook that runs #654.

## 1. What landed from audit §4

| Audit §4 fix | Where it lives | PR |
|---|---|---|
| "Open / raise a PR" is oc-git-ops whatever the PR is about | `REQUEST_RULES.verb_not_content`; oc-git-ops `notFor` | #654 |
| A question about a skill is not a request to run it | `REQUEST_RULES.request_vs_question`; oc-bug-check `notFor` | #654 |
| Toggling Auto-fix or CI monitoring is not oc-git-ops | `NONE_DESCRIPTION`; oc-git-ops `notFor` | #654 |
| Planning a release to staging then production is oc-release-ops | oc-release-ops `index` | #654 |

## 2. J1 on main, live

24 of 27 were correct. The #654 copy fixed one of the two "Open a PR" misses and, together with the #655 floor, the Auto-fix toggle. Still wrong:

| Row | Prompt (head) | Got | Why |
|---|---|---|---|
| j1-08 | "Plan a deftwright-site release of origin/main to staging, then production" | oc-deploy-ops `/oc-deploy staging`, p 0.62 | request 1 ranked release-ops first; the rerank took deploy-ops |
| j1-16 | "and bug check" | oc-bug-check, p 0.60 | exactly on the floor; a bare skill name read as a request |
| j1-07 | "Open a deftwright-site PR that records the 2026-10-20 production release" | silent | right skill, but the verb Choice picked `/oc-git`, the menu |

## 3. The `+route4` copy

All changes are in `scripts/route-spec.overrides.json`. `SPEC_SCHEMA_VERSION` 3 → 4, which re-keys the decision cache and the eval's row hash.

| Fixes | Change |
|---|---|
| j1-07 | oc-git-ops `/oc-git-sync`: "Open or raise a PR: branch, commit, push and create it in one run, whatever the PR is about." The live hook injects this text, so it stays under the 120-character cut. `/oc-pr`: "Draft the PR description only … it does not open the PR." The verb question says opening or raising a PR is the full sync. |
| j1-08 (deploy side) | oc-deploy-ops `notFor` + "A request to plan a release (what ships, in what order, to staging then production) is oc-release-ops even when it names staging or production." |
| j1-08 (release side) | oc-release-ops `notFor` + "Planning which commits ship, and in what order to staging then production, IS this skill, even when the request names the environments." Without it the row went silent (release-ops fits 0.19) rather than routed. |
| j1-08 (verb) | oc-release-ops `/oc-release plan`: "Plan a release: decide what ships and the order it goes to staging then production; proposes the next semver." Without it the row reached release-ops but fell to the `/oc-release` menu verb in 2 of 3 runs. |
| j1-16 | oc-bug-check `notFor` + "not a message that only names the checks ('and bug check') without asking for a run." |

**Rejected: a global `bare_reference` request rule.** The same rows were rerun five times on each spec:

| Prompt | main | first wording | narrowed wording | final (bug-check `notFor`) |
|---|---|---|---|---|
| "and bug check" | 2/5 bug-check | 0/5 | 0/5 | **0/5** |
| "MERGE?" | 5/5 git-ops | **0/5** | 5/5 | 5/5 |
| "check" | 0/5 | 2/5 bug-check | **5/5 bug-check** | 0/5 |
| "merge", "merge?", "Merge 252" | 5/5 | 5/5 | 5/5 | 5/5 |
| "by the way please auto-merge everything…" | 1/5 | 2/5 | 3/5 | 1/5 (jitter) |

A rule sent with every request reaches every skill. The first wording ("names a skill, a tool or a check") silenced a bare verb. The second ("a bare verb still asks for that action") made "check" a request. Scoped to the one skill it concerns, the fix touches nothing else.

**Rejected: a release verb question naming the semver.** Rewording the oc-release-ops verb question to "planning it (what ships, the semver, staging then production)" fixed j1-08 but turned "so we can version it" (blind label `none`) into a `/oc-release plan` suggestion in 4 of 5 runs. On main that prompt also reaches release-ops, but its verb falls to the menu. The shipped copy leaves the verb question as it was and puts the order-to-environments wording in the `plan` verb's own description. "so we can version it" is back to the menu in 5 of 5 runs.

## 4. Offline and gold-set results

| Run | J1 live | 574-row blind set: all P / R / silent | Holdout P / R / silent |
|---|---:|---:|---:|
| main `+route3`, p ≥ 0.6 | 24/27 | 1.000 / 0.805 / 1.000 | 1.000 / 0.880 / 1.000 |
| **`+route4`, p ≥ 0.6** | **27/27 (×5)** | **1.000 / 0.805 / 1.000** | **1.000 / 0.880 / 1.000** |

The offline set is scored like the runbook's §4 table: blind labels, lenient, ambiguous dropped, allowlist on, and the hook's menu and floor rules applied. The 2026-10-24 run of the same spec scored precision 0.971, one false positive more. That one-row difference is the run-to-run jitter the runbook describes.

## 5. Day-8 shadow report

`route:eval -- outcomes` over `~/.claude/opchain-route/route-log.jsonl` covers 2026-10-19 to 10-26. It has 118 routed prompts, all rescored from transcripts, and 75 hand-labelled.

| Check | Value | Pass |
|---|---:|---|
| suggestions ≥ 30 | 23 | no |
| pipeline prompts observed ≥ 30 | 16 | no |
| projected skill use ≥ 1.5× the baseline | 2.333× (6 → 14 of 16) | yes |
| precision on core skills ≥ 0.8 | 0.571 | no |
| silent rate on non-pipeline prompts ≥ 0.95 | 0.899 | no |
| every suggestion hand-labelled | 14/23 | no |

**The precision and silent rows measure old routers.** The hook runs from `~/repos/opchain-router`, which sits at `681abc04` (#654). Rows before 2026-10-24 came from earlier builds. The log does not record a spec version, so the split is by date. The report re-applies the p floor but cannot re-apply copy. So the 93 logged prompts that could be matched to their transcripts by prompt hash were re-routed live. The other 20 are mostly session briefs, where the hook routes only the `Task:` paragraph. Both routers were then scored against the hand labels:

| Router, on the 60 hand-labelled production prompts | Precision | Recall | Silent |
|---|---:|---:|---:|
| main (`+route3`, floor) | 1.000 | 0.917 | 1.000 |
| `+route4` | 1.000 | 1.000 | 1.000 |

`+route4` adds one true positive, the release plan, which main missed. The ambiguous "can i see it in staging" also changes: main suggests deploy-ops and `+route4` stays silent.

## 6. What still blocks live mode

1. **Volume.** There are 23 suggestions against a bar of 30, and 16 pipeline prompts against a bar of 30. At the current rate the bar falls around 2026-10-30.
2. **Nine unlabelled suggestions.** The gate needs the owner's labels; judge the prompt text alone. Proposed labels, not written:

   | When (UTC) | Suggested | Prompt (head) | Proposed |
   |---|---|---|---|
   | 10-23 18:54 | oc-git-ops `/oc-git-sync` | "Commit the scoring rework and the audit doc, and open a PR…" | oc-git-ops |
   | 10-23 18:56 | oc-code-auditor | "before moving to the PR, I want you to run another chat with a fable 5…" | ambiguous |
   | 10-23 18:57 | oc-release-ops | "# Codex → Claude: Opchain v2.1 Handoff…" | ambiguous |
   | 10-23 20:15 | oc-git-ops `/oc-git-sync` | "Commit the Week-0 build on claude/jev-week0 through the gate and open…" | oc-git-ops |
   | 10-23 20:21 | oc-git-ops `/oc-git` | "Try again" | none |
   | 10-24 00:41 | oc-git-ops `/oc-git` | "Fetch origin and move the detached ~/repos/opchain-router checkout to…" | none |
   | 10-24 01:20 | oc-git-ops `/oc-push` | "Both #655 and #656 have merged now: move ~/repos/opchain-router to ori…" | none |
   | 10-24 01:27 | oc-git-ops `/oc-merge` | "Check whether #656 has merged yet and, if so, move ~/repos/opchain-rou…" | none |
   | 10-24 01:46 | oc-git-ops `/oc-merge` | "Give me the gh pr merge command pinned to the new head so I re-arm aut…" | oc-git-ops |

   Two of these, "Try again" and "Fetch origin…", resolved to the `/oc-git` menu verb, which the current router drops anyway.
3. **The production hook lags main.** `~/repos/opchain-router` is at #654, without the p floor (#655), the shared client (#658) or `+route4`. Until it moves, new log rows keep measuring the #654 router.

## 7. Next

- Move `~/repos/opchain-router` to `main` once this PR merges, so shadow rows measure the shipped router.
- Label the nine rows above with `route:eval -- label <session> <hash> <label>`.
- Re-run day 8 when suggestions reach 30, which should be around 2026-10-30.
