# v2.1 — focused-execution salvage scoping

**Date:** 2026-09-27 · **Status:** decided by the owner 2026-09-27 — features 1 and 2 port in Sprint 2 with the trim; feature 3 follows option (a) · **Source branch:** `origin/fix/2.0.3-session-clock` (tip `31a8c2d`, forked from `e7a7584`; PR #552 closed 2026-09-26 with the work folded into 2.1).

## What is on the branch

Nine commits, 129 files against its fork point. Most of the bulk is release plumbing for a v2.0.3 that never shipped under that name: version claims, staging-audit evidence, regenerated MCP catalog hashes, and the protocol copied into every skill's `references/`. None of that is salvageable as-is; v2.0.3 and v2.0.4 have since shipped as different releases.

What remains is four features:

| # | Feature | Where | Already on `main`? |
|---|---|---|---|
| 1 | **Execution Discipline, `orchestrator.md` §0** — eight rules every skill applies before skill-specific work: define the outcome, smallest complete solution, a proportional saved plan, deliberate delegation, resources matched to difficulty, verified progress with the local time each turn, estimates from evidence, persist to completion | `skills/orchestrator.md` (+106 lines), a one-line pointer in every `SKILL.md`, the MCP server's `get_skill`/`get_orchestrator` descriptions, `tests/execution-discipline-required.test.js` | **No** |
| 2 | **Visible checkpoint progress** — `checkpoint status` renders each skill's goal and a completed / current / upcoming checklist from `progress_table`, with estimate and actual beside each row; malformed rows are counted, not rendered | `scripts/checkpoint.mjs` `formatProgress()` (+76 lines, copied into five skill runtimes), `tests/checkpoint-progress.test.js` (211 lines) | **No** |
| 3 | **Wall-clock actuals** — rows stamp `started_at` when they begin and `completed_at` + `actual` from elapsed wall-clock when they finish; remaining estimates are revised from actuals | same CLI + §0 rule 7 | **No** |
| 4 | **Release-surface probes** — full-semver checks on the changelog hero and README | `scripts/check-release-surfaces.mjs` | **Yes** — landed through #553 / #564 |

v2.0.4's task start / resumed / end stamps (#564) came from the same audit but are a different feature (hook output, not checkpoint rows).

## Recommendation

**Salvage 1 and 2 in v2.1 Sprint 2, re-authored against current `main` rather than cherry-picked. Hold 3 until it is reconciled with oc-time-ops.**

- **Why Sprint 2, not now.** Features 1 and 2 touch `skills/`, `plugins/` and `scripts/checkpoint.mjs`, all inside the OSS-split path freeze (Sprint 1). Landing them before the split means porting them twice. Sprint 2 already reworks the checkpoint read/write path for runtime-free mode, so the progress renderer and the fallback belong in the same change.
- **Why re-author.** The branch predates #549, #564, #568 and the v2.0.4 lockstep bump; a cherry-pick drags 100+ stale bundle copies and version claims. The two test files are the valuable, portable part — bring them over first and make them pass.
- **§0 needs a trim before it ships.** Two of its rules duplicate or overreach:
  - "show the current local date and time at skill start and on every turn" duplicates the plugin's `Task started/resumed/ended` stamps where hooks exist. Keep it only as the no-hook fallback.
  - "choose a model and reasoning effort" is guidance a skill cannot act on in most hosts; state it as "respect the user's and host's settings".
  
  The rest — outcome, smallest complete change, saved plan, verified progress, persist to completion — is the useful core, and it is instruction to the *running* skill, so it is not subject to the "prose doesn't chain skills" finding.
- **Why hold 3.** oc-time-ops (Codex, sprints 1–2 merged as #569 and #571) derives elapsed time from Claude Code transcripts. Checkpoint `actual` would be a second, differently computed source of "how long did this take". Decide one of:
  - **(a)** oc-time-ops reads checkpoint `started_at`/`completed_at` as a signal and remains the only source of totals;
  - **(b)** checkpoint actuals stay planning-only and are labelled so, with no totals;
  - **(c)** drop 3.
  
  This is a decision for whoever owns oc-time-ops. I recommend (a).

## Size

Roughly CLAUDE 6–10h for features 1 and 2, including the trim, bundle sync and the ported tests, inside Sprint 2. Feature 3 is not sized until the decision above.

## Owner decisions needed

1. Accept "salvage 1 and 2 in Sprint 2, re-authored"?
2. The §0 trim above?
3. Feature 3: (a), (b) or (c)?

## Owner decisions — 2026-09-27

1. **Accepted:** salvage features 1 and 2 in v2.1 Sprint 2, re-authored against `main`.
2. **Accepted:** the §0 trim — the per-turn time rule becomes a no-hook fallback, and the model/effort rule becomes "respect the user's and host's settings".
3. **Option (a):** checkpoint rows record `started_at` / `completed_at`; oc-time-ops reads them as a signal and remains the only source of time totals.
