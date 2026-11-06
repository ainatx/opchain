# Jev integration: performance since install

**Date:** 2026-11-05
**Scope:** every Jev use since the router hook was installed user-wide on 2026-10-19. J1 (prompt routing) is the only use with production traffic, so most of this covers J1. §1 gives the status of the others. This follows `2026-10-23-jev-router-shadow-performance.md` (days 1–5) and `2026-10-26-jev-day8-and-route4.md` (day 8).
**Data:** `~/.claude/opchain-route/route-log.jsonl`. It holds 311 routed prompts from 2026-10-19 17:58Z to 2026-11-05 19:40Z, 17 days in all. Each prompt was rescored from its transcript by `npm run route:eval -- outcomes`.
**Labels:** 86 earlier labels from `~/.claude/opchain-route/route-labels.jsonl` (through 10-28), plus **219 new labels from this analysis**. The new ones judge the prompt text only, and the owner approved writing them to the labels file on 2026-11-05. Earlier owner rulings showed that label judgement can move the verdict, so §7 lists the judgement calls.
**Builds:** the log has no spec or build field, so rows are split by the times `~/repos/opchain-router` moved, taken from its reflog:

| Build | Checkout | In use from (UTC) | What it adds |
|---|---|---|---|
| b1 | `754be8c5` | 10-19 17:44 | the shadow router as first installed |
| b2 | `681abc04` (#654) | 10-24 00:42 | Week-0: the leading `<system-reminder>` is stripped, Auto-fix and question-about-a-skill rules, A/B arm logging |
| b3 | `e828cec4` (#663) | 10-29 17:36 | p ≥ 0.6 floor (#655), shared Jev client (#658), spec `+route4` (#659) |

## Summary

1. **Each build has been better than the last, and the current build clears the precision and silent bars on its own.** With the hand labels, precision went 0.75 → 0.85 → 0.88, the silent rate 0.93 → 0.96 → 0.97, and recall 0.80 → 0.89 → 0.82. On b3 that means 22 of 25 suggestions were right, and the router suggested something on 3 of 91 ordinary prompts. The samples are small: b3's precision has a 95% interval of 0.70–0.96.
2. **The day-8 gate passes once the rows are labelled.** The unlabelled report says NO-GO, with precision 0.508 and silent rate 0.878. Most of that is the proxy. It scores "Yes. Merge 262…", "Check and merge" and "merge?" as false because the merge happened through auto-merge, a command handed to the owner, or another session. With every row now labelled, every check passes: 65 suggestions, 48 pipeline prompts, precision 0.836, recall 0.836, silent rate 0.954. The verdict is GO.
3. **Live mode has run since 10-30, but only in deftwright-site, and a shown suggestion is followed about one time in three.** `~/deftwright-site/.claude/settings.json`, which is untracked, sets `OPCHAIN_ROUTE_MODE=live`. The router showed 13 suggestions there, and 11 were right. On 4 of those 11 the agent then used the skill. On 3 it did the same work with raw commands. On the other 4 there was nothing to do, the owner deferred it, or the agent did it raw after a compaction (§4). The report's 8.2× projected lift assumes every shown suggestion is followed, and the measured rate is well below that.
4. **The current build's remaining errors are narrow.** Its misses:
   - Compound requests ("Merge both + deploy", "Merge when green + deploy"), where `fits` scores the whole request against one skill (0.24 and 0.31).
   - "push to staging and apply 0045", at `fits` 0.58, just under the 0.6 bar.
   - A bare "rebase" that resolved to the `/oc-git` menu verb and was dropped.

   Its false suggestions were "Yes, start PR 1" and "Yes, start PR 2" (both shown, both ignored, no harm done) and a REL-01 build brief sent to oc-release-ops.
5. **Jev is reliable, but its latency rose on the service side, and in live mode the user waits for it.** There were 311 calls and 4 errors. All 4 were 3-second timeouts, and the router stayed silent on each. Jev's median time rose from about 300 ms to 440–850 ms between 10-28 and 11-04, and on 11-05 it is back at 311 ms. The rise began before b3 was in use, so it comes from TypeSafe, not the router code. In live mode the hook runs before the prompt reaches the model: median 1.4 s, 90th percentile 3.1 s, worst 5.1 s. The cost is negligible: 1.29M input tokens, about $0.05 at the runbook's rate.
6. **The other uses have done nothing in production yet.** J5's flag is off. J8's `/oc-docs pr` hint has never been run on a real PR. J2 and J9 are evals only.

## 1. What is running

| Use | Status | Production effect since install |
|---|---|---|
| J1 prompt routing | Shadow user-wide (`~/.claude/settings.json`); live in deftwright-site sessions since 10-30 | 311 prompts routed, 65 suggestions, 13 shown |
| J2 outcome judge | `outcomes --judge jev`, report-only | None. It agreed with 14 of 21 labelled rows on 10-27, so it is not trusted on unlabelled rows |
| J5 feedback triage | Worker code merged (#665). The flag `platform.security.feedback-triage` defaults to off and `wrangler.jsonc` has no override | None. Whether the `TYPESAFE_API_KEY` Worker secret is set was not checked |
| J8 PR-docs completeness | Eval, `jev J8 --pr <n>`, hint step in `/oc-docs pr` | 0 runs on a real PR. Transcripts since 10-29 show only the session that built it |
| J9 embedded instructions | Eval; waits on ow-tools S6 | None |
| J3, J4, J7 / J6 | Ruled out / skipped | — |

## 2. Volume and coverage

| | b1 | b2 | b3 | All |
|---|---:|---:|---:|---:|
| Days in use | 4.3 | 5.7 | 7.1 | 17 |
| Routed prompts | 86 | 98 | 127 | 311 |
| Suggestions (after the p floor) | 20 | 20 | 25 | 65 |
| Pipeline prompts (labelled) | 15 | 19 | 27 | 61 |
| Explicit `/oc-*` routes | 0 | 2 | 4 | 6 |
| Prompts routed after stripping a leading `<system-reminder>` | 0 | 11 | 58 | 69 |
| Live-mode prompts | 0 | 0 | 51 | 51 |

The coverage fix from Week-0 works. Before b2 the hook silenced every prompt that started with `<`. Since then it has routed 69 such prompts, and they include all 6 explicit `/oc-*` routes. In b3, 46% of routed prompts arrived with a leading reminder.

## 3. Accuracy

Scored like the day-8 report: core skills, ambiguous rows left out, the p ≥ 0.6 floor re-applied to logged rows.

| | Precision | Recall | Silent on ordinary prompts |
|---|---:|---:|---:|
| Proxy report, unlabelled rows (all builds) | 0.508 | 0.517 | 0.878 |
| **Hand labels, all builds** | **0.836** (51/61) | **0.836** (51/61) | **0.954** (207/217) |
| b1 | 0.750 (12/16) | 0.800 | 0.927 |
| b2 | 0.850 (17/20) | 0.895 | 0.958 |
| **b3** | **0.880** (22/25) | **0.815** (22/27) | **0.967** (88/91) |
| b3 shadow rows | 0.917 | 0.786 | 0.982 |
| b3 live rows | 0.846 | 0.846 | 0.943 |

The 95% intervals are wide. For b3, precision is 0.70–0.96, recall 0.63–0.92 and the silent rate 0.91–0.99. If the 4 suggestions on ambiguous rows are counted as wrong, all-build precision drops to 0.785 and the silent rate to 0.937. That case does not apply to b3, which made no suggestions on ambiguous rows.

### Day-8 gate, all builds, hand labels

| Check | Value | Pass |
|---|---:|---|
| suggestions ≥ 30 | 65 | yes |
| pipeline prompts observed ≥ 30 | 48 | yes |
| projected skill use ≥ 1.5× the baseline | 8.2× | yes |
| precision on core skills ≥ 0.8 | 0.836 | yes |
| silent rate on non-pipeline prompts ≥ 0.95 | 0.954 | yes |
| every suggestion hand-labelled | 65/65 | yes |

The gate still pools all three builds. On 10-27 the owner asked to log the spec version on each route row and to count only current-spec rows. That was never built: `route-prompt.cjs` writes no spec field. So the b1/b2/b3 split above is by date.

## 4. Live mode: what happened after a shown suggestion

| When (UTC) | Prompt | Shown | Label | What the agent did |
|---|---|---|---|---|
| 10-30 18:03 | create pr and merge | `/oc-git-sync` | git-ops | Found nothing to open a PR for. Correct no-op |
| 10-30 18:05 | needs a github pr | `/oc-git-sync` | git-ops | **Skill oc-git-ops** |
| 10-30 18:09 | auto merge whe completwe | `/oc-merge` | git-ops | **Skill oc-git-ops** |
| 10-30 23:37 | Yes, merge and stage | `/oc-merge` | git-ops | **Skill oc-git-ops**, then oc-code-auditor |
| 10-31 02:19 | Yes, merge #275 | `/oc-merge` | git-ops | Compaction landed 2 s later; then raw `gh` checks and merge |
| 10-31 22:33 | Commit after midnight | `/oc-commit` | git-ops | Waited for midnight as asked; nothing in the scored window |
| 11-01 06:44 | Merge and stage | `/oc-merge` | git-ops | Raw `gh pr merge` + staging deploy |
| 11-02 22:31 | Yes, start PR 1 | `/oc-git-sync` | none | Ignored (correctly) |
| 11-04 20:22 | Yes, start PR 2 | `/oc-git-sync` | none | Ignored (correctly) |
| 11-05 03:56 | merge? | `/oc-merge` | git-ops | Compaction landed 2 s later; found PR #284 already merged |
| 11-05 03:56 | rebate and mergfe | `/oc-merge` | git-ops | **Skill oc-git-ops** |
| 11-05 03:57 | merge | `/oc-merge` | git-ops | Raw `gh pr merge --squash` |
| 11-05 03:57 | Apply to staging | `/oc-deploy staging` | deploy-ops | Raw `wrangler d1 migrations apply --env staging` |

Two `oc-app-architect` lines were also shown for explicit mentions, and one was followed. Explicit routes are left out of every rate.

On pipeline prompts, the agent used the needed skill on **4 of 11 where the suggestion was shown** (36%, 95% interval 0.15–0.65). On prompts where nothing was shown it did so on **6 of 50** (12%, 0.06–0.24). The direction is right, but the comparison is confounded. Every shown suggestion was in deftwright-site, and most never-shown pipeline prompts were in opchain. Each verb that was followed matched the shown verb, 4 of 4.

Why a shown suggestion is not followed:

- **The agent takes the shorter path.** On 3 rows ("Merge and stage", "merge", "Apply to staging") it ran the raw command the skill would have wrapped. The injected line is a hint, and the prompt already says what to do.
- **A compaction lands right after the prompt.** On 3 of the 13 shown suggestions, a context compaction fired within 2 s of the prompt. The hook's context was written before the compaction boundary. Whether the model still sees the line afterwards was not tested.

## 5. The current build's errors

| Prompt | Mode | Router trace | Error |
|---|---|---|---|
| "Merge both + deploy" | shadow | top-1 git-ops 0.63, deploy-ops 0.29; fits 0.24 | miss: compound request, `fits` judges the whole thing |
| "Merge when green + deploy" | shadow | git-ops 0.63, deploy-ops 0.28; fits 0.31 | miss: same |
| "push to staging and apply 0045" | live | deploy-ops 0.68; fits 0.58 | miss: 0.02 under the bar |
| "rebase" | live | git-ops 0.97; fits 0.72; verb `/oc-git` | miss: the menu verb is dropped |
| Release-PR brief (11-01 06:53, "Prepare the v2.1.0 release PR … following `skills/oc-release-ops/SKILL.md`") | shadow | silent | miss: briefs route only their `Task:` paragraph |
| "Yes, start PR 1" | live | git-ops 1.00; fits 0.94 | false: "start PR N" means build planned PR N |
| "Yes, start PR 2" | live | git-ops 0.93; fits 0.83 | false: same |
| REL-01 brief ("Build REL-01 of the 2.1.0 release: distribution and integrity…") | shadow | release-ops; p 0.70 | false: build work that names a release |

This is the pattern from the first audit, one level down. Ranking is right on every miss. The misses come from `fits` judging a two-skill request against one skill, and from the menu-verb rule. Both false suggestions come from the token "PR".

## 6. Latency, reliability, cost

| | b1 | b2 | b3 |
|---|---:|---:|---:|
| Jev calls / errors | 86 / 0 | 98 / 1 | 127 / 3 |
| Jev ms p50 / p90 / max | 331 / 422 / 603 | 325 / 585 / 6,840 | 479 / 805 / 3,004 |
| Hook ms p50 / p90 / max | 1,042 / 1,395 / 2,509 | 1,037 / 1,585 / 11,197 | 1,255 / 2,113 / 5,092 |
| Input / output tokens per call | 4,342 / 745 | 4,017 / 637 | 4,096 / 641 |

- All 4 errors were `timeout after 3000ms`, and the router stayed silent on each. There were no retries and no other failures.
- Jev's daily median was 220–360 ms from 10-19 to 10-27, then 439–845 ms from 10-28 to 11-04, and 311 ms on 11-05. The rise began on b2, before the checkout moved, so it comes from the service side.
- In live mode the hook runs before the prompt reaches the model. On the 51 live prompts it took a median of 1.37 s, a 90th percentile of 3.10 s and at worst 5.09 s. 6 of the 51 waited more than 3 s.
- Over 17 days the 311 calls used 1.29M input tokens and 208k output tokens. At the runbook's $0.042 per million input tokens that is about $0.05. The runbook gives no output-token price. The decision cache hit 3 times, because its key includes repo state.

## 7. Scorer gaps found, and the labelling calls

**Scorer gaps:**

1. **Compaction blind spot.** On 4 rows a compaction landed within 15 s of the prompt. The rescorer recorded an empty window on all 4, but the transcripts show the agent working (§4).
2. **Proxy false positives on merges.** The proxy needs related activity in the window. A merge that auto-merge already queued, that was handed to the owner as a command, or that another session ran counts as a false suggestion. This is most of the gap between 0.508 and 0.836.
3. **The raw deploy class misses D1 migrations.** `wrangler d1 migrations apply --env staging` is not in the oc-deploy-ops pattern (`route-eval.mjs:220`).
4. **No spec version on route rows** (§3).

**Labelling calls in the 219 new labels.** 161 are none, 36 oc-git-ops, 5 oc-deploy-ops, 4 oc-release-ops and 13 ambiguous. Each follows an earlier label or owner ruling where one existed:

- A compound "merge … + deploy" request is labelled by its first action, oc-git-ops, as "Merge 249 and rebate 251" was.
- "give me auto merge comman" and "show em a command to auto merge when ready" are oc-git-ops, as "Give me the gh pr merge command…" was.
- "Yes, Auto-fix" is none, following the Auto-fix ruling. So are "Retry now" (as "Try again" was) and "Yes, start PR N".
- Status questions ("is 260 ready to be merged/", "is there anything left to do before we roll out 2.1") are ambiguous, as "when will it merge" was.
- So are "Arm it", "fix merge conflicts", "build", "do it", "yes", "Write the spec with those four defaults" and "build a follow-up PR here: …".
- These are oc-release-ops: "advance everything so 2.1 shows as the released item in staging", "confirm what's going into this release", "separate out the ow-skills part of the release … so that 2.1 becomes a jev-only release", and the brief that says to follow oc-release-ops plan → draft → bump.
- Session briefs are labelled by their `Task:` paragraph.

## 8. What would move the numbers

In order of effect on what agents actually do:

1. **Make shown suggestions stick.** The router is now right far more often than it is followed, so the lever is follow-through, not accuracy. Test whether the injected line survives a compaction that fires right after the prompt. Then compare the injected wording against what the agent did on the 3 raw-command rows.
2. **Score compound requests per action.** Two of b3's five misses are "merge … + deploy". Possible fixes: give `fits` a "first step" reading, or let the rerank accept a request whose first action fits.
3. **Add `notFor` copy for "start PR N" on oc-git-ops,** in the narrow, skill-scoped style that `+route4` used. Check it with ×5 live reruns of the touched rows.
4. **Close the scorer gaps:** the compaction window, the D1 migration deploy class, and a spec version on each route row, so the gate counts only the build it is judging.
5. **Decide on live mode outside deftwright-site.** With every row labelled, the gate says GO on all builds pooled. A b3-only gate needs a spec field first.
