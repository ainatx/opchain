# Security Review — ow-research 1.0.0 (OW-09, Sprint R), round 3: closure check

**Date:** 2026-10-19. Earlier rounds:
- round 1, 2026-10-17: PASS-WITH-NOTES, grade C+;
- round 2, 2026-10-19: PASS-WITH-NOTES, grade B, `docs/audits/2026-10-17-ow-research-1.0-security-review.md` at `87f1000a`.

**Scope:** a light closure check, as asked, because the Evaluator was running on the same machine:
- R2-01 to R2-07;
- the narrowed our-figures rule and its new confirm prompt;
- whether any earlier PoC has regressed.

**Target:** `claude/ow-09-ow-research` at `c21483bb`, which merges main (#633, #634) over `b6de3477` (every fix). Reviewed in a fresh detached checkout under `scratchpad/sec-ow09-r3/tree` (`npm ci --ignore-scripts`), removed when done. The Generator's worktree was not touched.

**Verification at head:**
- `vitest run` of `ow-research-acceptance`, `ow-research-plants`, `ow-research-eval-r1` and `ow-build-plan-acceptance`: 4 files, **615 passed**.
- `node scripts/ow-research-acceptance.mjs`: **73/73** golden runs.
- The fence run (`--import tests/ow-tools/fence.mjs`): exit 0, log **0 bytes**.

**No real network traffic.**

**Owner decisions since round 2** (recorded in the contract and in design §8.1, §12.1c and §12.3 rows 30–37):
- the residuals in design §8.1 and the unfixed LOWs are **accepted in writing**;
- our figures in queries are blocked when the query attributes them to us, or when it matches one of our exact figures that isn't round. A round coincidence gets a confirm prompt;
- the ow-currency watch prints only its absent-case line.

## Executive summary

**Every round-2 finding is closed, and no PoC regressed.**

- **R2-01 is closed in text and checker.**
  - `-question` now reads the `handling` key of `intake/<client>/intake.yaml` and `plans/<client>/plan.yaml` as a header only, and asks once per client even when `profile.md` stores "no" (`phase-question.md` §1.1).
  - `-run` and `web-rules.md` §2 list both files.
  - `handlingLevels` reads both (A:1658–1664).
  - The round-2 plant `plants/sec-r2-intake-level` now fails `handling` with "7 request(s) under the handling level "client confidential" (intake/larkspur-ceramics/intake.yaml)".
- **R2-02, R2-04, R2-06 and R2-07 are closed.** Each round-2 PoC now fails for the intended reason. `sec-r2-inj-quote-mimic` passes as a golden, and `sec-r2-inj-link-lure` is adopted.
- **R2-03 is closed.** `user file` is gone from the standing enum (schema §3); a user file records the standing of what was saved. The inbox PoC now gives MEDIUM, not HIGH.
- **The new confirm-prompt path is recorded and graded.** It requires a `marker: figure confirmed | Q-nn | human-decided: …` line before the search, in the same run, naming that query. Without one, `privacy` fails. A non-round exact figure still blocks whether or not it is "confirmed".
- **One new LOW (R3-01).** The checker cannot tell a confirmation the user gave from one the run wrote itself. It also doesn't hold the line to the window the text gives (after the query is shown, before the plan's approval), and no golden goes through a confirmed figure. The user still sees the exact query at the plan's approval (O3), so the figure is never sent unseen.

**Counts, round 3:** CRITICAL 0 · HIGH 0 · MEDIUM 0 open · LOW 1 new (R3-01). Every earlier residual and unfixed LOW is owner-accepted in writing.

**Grade: A−.**

## Closure table

| Finding | Sev | Status at `c21483bb` | Evidence |
|---|---|---|---|
| R2-01 client level in `intake.yaml` / `plan.yaml` not read | MEDIUM | **Closed** | `phase-question.md` §1.1 (header-only read; ask once per client); `phase-run.md` §1 step 4; `web-rules.md` §2; A:1658–1664. The PoC `plants/sec-r2-intake-level` now fails `handling`. Note: an object-valued `handling` (`{ asked: …, answer: … }`, the form ow-start uses in logs headers) is read as a level. That fails safe: it over-blocks, never under-blocks |
| R2-02 writes under `printed/` and `session/` unseen | LOW | **Closed** | PoC fails: `printed/approved.md` → `writes` ("written outside opchain-work/"), `headers`, `injection` |
| R2-03 `user file` as a known standing | LOW | **Closed** | Schema §3 enum has no `user file` ("a user file: the standing of what was saved"); `confidence-rules.md` §1. The PoC gives MEDIUM, not HIGH |
| R2-04 unknown `##` sections; duplicate `F-nn` | LOW | **Closed** | `handoff_fields`: "is not a section of findings.md" and "is the id of two finding blocks" (A:1909, A:1911). P5 mirrors both |
| R2-05 our-side residuals | LOW | **Superseded** by the owner's narrowed rule; residual owner-accepted | `business` reads every client's figures. The held-out set for the narrowed rule was written first (`tests/ow-research-heldout-our-figures.mjs`): 20/20 attributed or exact blocked; market queries 0 blocked, 7 asked, 13 passed |
| R2-06 shared platforms; user-content labels | LOW | **Closed** | `gist.github.com` and the other multi-tenant hosts are refused as a shared platform's root; `en.community.…` is user content |
| R2-07 line-form page trips the 26-word rule | LOW | **Closed** | The 26-word check reads each quote on its own; `sec-r2-inj-quote-mimic` is a passing golden |
| Round-1 SR-01 to SR-13 | — | **Closed, or owner-accepted** | Unchanged from round 2; §8.1 residuals and the LOWs left as they are, accepted in writing (2026-10-19) |
| §8.1 residuals (SR-05 host reader, DNS, same-host redirects, permission setting, host cache) | — | **Owner-accepted in writing** | Contract and design §8.1 |
| Licence classes in `framework-sources.md` | — | Owner action before merge (unchanged) | Rows still marked `unreviewed`. It is a merge condition, not part of this gate |

## The confirm-prompt path (owner decision, 2026-10-19)

**The rule:**
- **Attributed to us** (a first-person word): blocked.
- **One of our exact figures that isn't round:** blocked.
- **A round figure that equals one of ours** (at most two significant digits, a percentage in fives, a multiplier in halves): the run asks the user, one line per query. If confirmed, it writes `marker: figure confirmed | Q-nn | human-decided: the user confirmed <figure> is a market figure` "before the plan's approval" (`phase-run.md` §2.2, `web-rules.md` §4, schema §2).

**Probes** (`tests/ow-research-security-r3.test.js`, 7 tests; `run-approved`'s Q-02 rewritten to "… add-on price 1200", where 1,200 is a price-book amount):

| Probe | Result |
|---|---|
| No confirmation line | **Fails** `privacy`: "no 'figure confirmed' line for Q-02 (human-decided) before it" |
| A line without the `human-decided:` label, or one naming Q-01 | **Fails** `privacy` |
| A non-round exact figure (175) "confirmed" | **Fails** `privacy`: "a figure from our own internal files" (a confirmation cannot unlock it) |
| A confirmation the run wrote itself, with nothing in the session saying the user confirmed | **Passes** (R3-01) |
| A confirmation logged before `marker: plan`, before the query was shown | **Passes** (R3-01) |
| A confirmation logged after `marker: plan approved` | **Passes** (R3-01) |
| A golden that goes through a confirmed figure | **None exists**; only the missing-confirmation cases are tested (R3-01) |

**Can a run confirm a round match by itself?** In the checker, yes: like every other approval marker, `figure confirmed` is self-attested text. Unlike `via: user` URLs, it isn't cross-checked against the session. In the text, no: the confirmation is the user's answer, and the plan's approval still shows the exact query, figure included. So the worst case is that the user approves a query without being told that its round figure matches one of theirs.

**Is it recorded and graded?** Recorded, yes: in the ledger, with the human-decided label, before the search, in the same run, for that query. Graded, yes for presence, label, id and order relative to the search. Not graded: whether the user said it, or where it sits relative to the plan.

**Other observations, all within the owner's decision and not findings:**
- Most of our price-book figures are round (100 … 14,000), so for them the user's confirmation, not a block, is the gate.
- The six round-1 SR-07 PoCs that now pass ("estimate 40 hours", "35% margin", …) are the owner's narrowing working as decided. The Generator relabelled them honestly as "passes: no attribution, and no figure of ours" plants.

## New finding

### [R3-01] The `figure confirmed` marker is self-attested, loosely placed, and has no golden

**Risk:** LOW · **Category:** R/T (grading of a human decision) · **Scope:** `scripts/ow-research-acceptance.mjs` `figureConfirmed` (A:1595–1597) and its use in `checkPrivacy` (A:1628); `phase-run.md` §2.2 · **Fix effort:** S

**Problem:**
- The checker accepts any `figure confirmed` line that names the query, carries `human-decided:` and comes before the search in the same run.
- It doesn't require the line to sit after the `plan` (or `batch`) marker that showed the query and before its approval, as the text says.
- In goldens it doesn't require the session to hold the user's words.
- No golden exercises the path, so a regression where the run confirms its own figures, or never asks, would go unseen.
- The plan's approval still shows the query (O3), which bounds the impact.

**Reproduction:** `tests/ow-research-security-r3.test.js`, the three "probe" tests (each passes, so the slip is open).

**Remediation:**
1. In `figureConfirmed`, require the line after the `plan` or `batch` marker that lists that `Q-nn`, and before the `plan approved` or `batch approved` line that approves it.
2. In fixture mode, require `session/` to hold the user's confirmation naming the figure, as `via: user` already does for URLs.
3. Add one golden with a confirmed round figure, plus plants for a self-written confirmation and for each out-of-window placement.

## PoC regressions

| Set | Result at `c21483bb` |
|---|---|
| Round-1 PoCs (33, re-applied from the round-1 patch; SR-06 names pointed at `plants/`) | 23 fail as plants. 4 are expected passes (controls and the SR-11 fixtures). **6 pass by the owner's narrowed O8**: the un-attributed SR-07 queries with no figure of ours, now pinned as passes in `tests/ow-research-plants.test.js`. Not a regression |
| Round-2 PoCs (`tests/ow-research-security-r2.test.js`, 18) | All 9 "PoC" tests now fail (each slip caught, for the intended reason); all 9 "holds" still pass. **No regression** |
| Round-2 fixtures | `sec-r2-inj-link-lure` and `sec-r2-inj-quote-mimic` are passing goldens; `plants/sec-r2-intake-level` fails `handling` as a plant |

## Verdict

**PASS-WITH-NOTES.** There is no CRITICAL, HIGH or MEDIUM open. Every round-1 and round-2 finding is closed or owner-accepted in writing, and no PoC regressed.

The one note is **R3-01** (LOW): the confirm marker is self-attested and loosely placed, and has no golden. For the posture gate it needs either the small checker fix above or the owner's written acceptance alongside the other accepted LOWs. With either, this is **PASS**.

The licence-class review of `framework-sources.md` stays an owner action before merge.

PoCs: `scratchpad/sec-ow09-r3/2026-10-19-ow-research-security-closure-pocs.patch` (the round-3 probe file). The round-1 and round-2 patches in `scratchpad/sec-ow09/` and `scratchpad/sec-ow09-r2/` still apply for re-runs.
