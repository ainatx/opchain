## OW-04 (Sprint 3) — Evaluation Round 2

**Sprint:** ow-uat 1.0.0 (contract `sprints/release-2.1/ow-sprint-3/contract.md`, amended 2026-10-17 with OD-1 to OD-5) · **Branch:** `claude/ow-uat-sprint-3`, head `e73975f7` (round-2 commits `b46677e9`, `9324d533`, `c36ec805`, `ac2742b5`, `e73975f7`) · **Scope:** R1-1 to R1-19 and OD-1 to OD-5 · **Evaluator:** skeptical Evaluator, oc-app-architect Phase 6 · **Date:** 2026-10-17

**Standard applied.**
- D1, D2 and D5 apply as in round 1. Under D2, untuned plain-wording gaps and false positives are **minor**.
- The owner's rulings OD-1 to OD-5 now amend the contract and are graded as written. OD-5 includes its no-code path.

**Where I worked.**
- A detached checkout of `e73975f7` at `<EVAL>/tree`, now removed. The Generator's worktree is untouched and clean at `e73975f7`.
- My evaluator-only cases (`zz2-*`, kept in `<EVAL>/zz2-cases`) went into my checkout's fixture folder only while they were graded.
- One of my runs of the two ow-uat test files overlapped that window and showed 4 failures, because the golden test lists every fixture folder. A clean re-run gives 1,186 passed and 3 skipped. Those failures were caused by my setup, not by the branch.

**Rule for the untuned set.** I wrote `h/sentences2.mjs` (80 sentences) before reading the round-2 rules in `scripts/ow-uat-acceptance.mjs` or the round-2 `tests/ow-uat-sentences.mjs`. I had read only the skill-text diff and the goldens.

### Code Scores

| Criterion | Weight | Score | Justification |
|---|---|---|---|
| Functionality | 30% | **7/10** | Every round-1 defect is fixed in behaviour, not just in claims:<br>• sentences now split at headings, table rows, blank lines and list items, so known plants are caught at every placement;<br>• a correct `--signed` resume passes at every cut point;<br>• deletions are caught;<br>• recorded steps' outputs stand on a resume;<br>• route cells now check write-once and parsing too.<br>OD-1 is exact: 10/10 chain plants caught. OD-4 is right on the date, the day after, and with a clause that says "on the date". `calc` is correct a year at a time, including year ends, leap days and both range ends.<br>**However**, OD-5's no-code path does not cover the clauses (R2-1). |
| Feature Completeness | 30% | **8/10** | 132 goldens, including cuts at every `--signed` step and after `terms`, a lacking-capability golden (`m-signoff-request-nocap`), the clauses-none route cell, and ow-build's `invoice-delivery-governing`. 55 ow-build goldens. Every evaluator plant from round 1 is now a vitest case (1,189 tests; 3 named OD-3 skips).<br>Gaps:<br>• `HANDOFF_PIN` covers only part of H1 and §4.1 (R2-7);<br>• departure 26 (the condition reason) never reached the skill text (R2-8). |
| Code Quality | 20% | **6/10** | Both round-1 structural majors are gone. The pins and the deletion rule work.<br>On untuned material:<br>• our side 80%, false positives 5%;<br>• data shapes 27/27 caught, with **0/30** false positives on my legitimate tables (test steps, schedules, defect counts, check ids, roles, records, accounts, runs);<br>• people 90%; credentials 60%; false pass 90%.<br>New false-positive classes:<br>• 3 of 10 legitimate who-tested sentences are flagged, including "UAT-03 is not fixed yet." (R2-2);<br>• in targeted probes (not untuned), the OD-3 long-table rule flags 4 of 5 legitimate five-row count tables (R2-3).<br>The digest is blind to CRLF files and to a blank line inside the clause block (R2-4). |
| UX (clarity for person and model) | 20% | **7/10** | Body ≈4,401 tokens (cap 4,500).<br>• The signed NEXT template now carries the step-0 NEXT.<br>• Reads-from has one row per file.<br>• Departures 18 and 19 and OD-4 are in the phase text.<br>• Client reasons no longer contradict their status.<br>• The terms-block definition in `uat-yaml-schema.md` §6 is precise, but asks a lot of a text-only model. |

**Weighted Code Score:** 0.3×7 + 0.3×8 + 0.2×6 + 0.2×7 = **7.1 / 10**

### Test Results

| Run | Result |
|---|---|
| `npx vitest run` (full, after `npm run build`) | **3,850 passed, 13 skipped**, 0 failed. The claim was 3,849; the one-test difference is environmental, since pandoc and Typst are installed here. The skips are Sprint 2's 9 decision-2 skips, the "pandoc missing" branch, and the 3 named OD-3 prose skips |
| ow-uat test files | 1,189 tests: 1,186 passed, 3 skipped (plants ≈1,035 + acceptance ≈154) |
| `npm run build` | exit 0 (`@ e73975f7`); no tracked change afterwards |
| Catalog, contracts, `lint-internal-refs`, `check-skill-flags`, `gen-route-spec:check`, `sync-bundles:check`, `sync-plugin-skills:check`, `checkpoint:validate`, `gen-ow-tools-manifest --check` | all exit 0 (catalog: 36 oc-, 4 ow-) |
| Acceptance checkers | ow-start 4, ow-build-plan 32, ow-build **55**, ow-uat **132**: all golden runs pass |
| C18 | 672/672 manifest lines identical to the round-1 build of merge base `90e61149`. `git diff 90e61149 HEAD -- skills/ plugins/opchain/ src/ site/ package*.json build.mjs` is empty |
| Body tokens | 17,604 chars ≈ **4,401** < 4,500 |
| `.bugcheck.json` | Still one file (`tests/ow-uat-sentences.mjs`), under `verification.scan_exceptions.secrets` only. The re-pinned digest `4ce1bf17…` matches the file. Its new secret-like strings are my round-1 invented and documented-example tokens: **narrow** |

### Generator claims, verified

| Claim | Verdict |
|---|---|
| R1-1 to R1-19 fixed | **True in behaviour** for all 19 (table below). R1-16's skill-text half is missing (R2-8) |
| Splitter at `:460`; `--signed` resume first-writes at `:1844`; `WRITER_PIN`/`HANDOFF_PIN`; calc a year at a time; table to 2031 | **True**: `:460` (`sentences`), `:1840-1850`, `:766`/`:1995`, `calc.mjs:70` `federalHoliday()`, and `contract-calendar.md` §4 with 2031 rows (table = calc tested) |
| 3,849 tests; plants file 1,035 with 3 named OD-3 skips | **True** (3,850 here). The skips name OD-3 and are honest |
| 132 ow-uat goldens, 55 ow-build | **True** |
| Held-out round-2 set and its measurement | **Disclosed honestly** (`tests/ow-uat-sentences.mjs:232-246`): before and after, then the misses grown in. My own untuned results are below |
| Body ≈4,401 | **True** |
| `.bugcheck.json` re-pinned and narrow | **True** |

### Round-1 defects

| # | Status | Evidence |
|---|---|---|
| R1-1 sentence merge | **Fixed** | `placement.mjs` 51/51 (known C8 plants 3/3 at the end of a section); `fresh1b` 24/24 |
| R1-2 contract-terms basis | **Fixed for the digest path** | `pack-terms-mismatch`; my `zz2-code-pack-changed` is caught. The no-code path is R2-1 |
| R1-3 `--signed` resume | **Fixed** | `signoff-signed-cut/resume-{record,accounts,acceptance-record}` goldens pass; the RS06 and S05 plants are caught |
| R1-4 deletion | **Fixed** (real-run folders) | X01–X07 caught: a run, a request, `backstop-log.yaml`, ow-build's `ledger.md`, `secrets-seen.log`, a scenario, `agreed/CO-01.md` |
| R1-5 recorded steps on resume | **Fixed, except under `--refreeze`** | S01–S04, S06, S07, S10 caught; S08 and S09 slip (R2-5) |
| R1-6 route cells | **Fixed** | RC01–RC03, RC05, RC06 caught; malformed probe 13/13. RC04 (a base-case content rule) is left to the base case, which is acceptable |
| R1-7 clause block | **Fixed** | DB08 and DB10 caught |
| R1-8 to R1-10 untuned slips | **Fixed for the cases raised** | `fresh1` 132/138: the only misses are the 3 OD-3 prose sentences (named skips), at 2 placements each. 103/103 controls pass |
| R1-11 clause, name and price rules | **Fixed** | CL1–CL3, NM3, PR1 and PR2 caught. WE1 and HE1 are caught by `edgesWriterDrift` and `handoffFieldDrift`, which vitest runs on the real edges |
| R1-12 internal reads | **Fixed** | 5/5 |
| R1-13 writer modes | **Fixed** | `WRITER_PIN`: WP1–WP5 caught; WP6 is caught by the family append rule |
| R1-14 text drift | **Fixed** | Departures 18 and 19 are in `phase-signoff.md:23,41` and `routing-and-resume.md`. The signed NEXT has step 0. OD-4 is in `phase-signoff.md` §6 |
| R1-15 lumped rows | **Fixed** | One Reads row per file |
| R1-16 golden client text | **Goldens fixed; skill text missing** | R2-8 |
| R1-17 calendar edges | **Fixed** | 12/12 year-end, leap-day and range-end probes are right. Table→2031. `m-signoff-request-nocap` |
| R1-18 partial verification | **Fixed** | HF02 caught; ow-build applies `governing` (`invoice-delivery-governing`); the dead code is gone |
| R1-19 C4 cell | **Fixed** | `route-signoff-clauses-none` |

### New untuned set (`h/sentences2.mjs`)

| Set | Placements | Plants caught | Controls passing |
|---|---|---|---|
| OUR side (D1), 20 | request start, request end, UAT-05 reason | **16/20** at every placement (80%) | — |
| Legitimate client/tester, 20 | request start, request end, punch list | — | **19/20** at every placement (FP 5%) |
| Data (OD-3 shapes 9 + prose 1) | SC-06, pack, request "Records created" | **9/9 shapes** at every placement; the prose one slips (self-check's, OD-3) | **10/10** legitimate tables at every placement (FP 0%) |
| False pass, 10 | Mossgate request start and end; UAT-05 reason | **9/10** (13/15 placements) | **7/10** (11/15 placements) |
| People, 10 | pack, request | **9/10** | **10/10** |
| Credentials, 10 | pack, RUN-01 | **6/10** | **10/10** |

- **Placement:** no longer affects any result (R1-1 is fixed).
- **Slips:**
  - our side, plain wording:
    - O10 "Robin's time on the sandbox setup was most of Monday."
    - O16 "roughly 20% more effort than we allowed for testing"
    - O20 "We have spent more on fixes than the acceptance testing line brings in."
  - our side, idiom (accepted): O11 "We are eating the cost of the third round."
  - credentials:
    - CR02 "The password for the test sender is Morning-Glory-81."
    - CR03 "pass phrase: blue kiln seven"
    - CR04 "PIN 4471 opens the till."
    - CR09 "The creds are admin/admin."
  - people: PP09 "Tester: Dana Whitfield" (the slot regex is lowercase-only)
  - false pass: FPP03 "All three checks were confirmed by the shop." ("the shop" alone is not a client-people phrase)
- **False positives:**
  - L12 "Your own price list sets each line's unit price." (the client's own prices)
  - FPC06 "Your shop manager is welcome to run AC-1.1 before signing."
  - FPC07 "UAT-03 is not fixed yet." (negation)
  - FPC08 "Once UAT-04 passes its retest, it will be closed." (future)
- **OD-3 targeted probes** (written *after* reading the rule, so not part of the untuned rates; `h/fresh2b.mjs`):
  - **Flagged** as "a long table of values" in both a scenario and a pack:
    - a five-session schedule (`| 1 | 2027-01-07 | 10:00 | 3 |`);
    - problems counted by session;
    - weekly test volumes;
    - expected counts per step.
  - A two-column monthly count table passes.
- **O7 after the retest** (`h/o7post.mjs`): the design's own example "Fixed on 14 January, after the 5 business days quoted, at no charge" passes on a `retested-pass` UAT-05, and our effort beside it is caught.
  - Before the retest, the same sentence is flagged. That is correct under departure 26.

### New plants aimed at round-2 code (71)

| Harness | Plants | Caught | Slips |
|---|---|---|---|
| `h/plant3.mjs`: deletions, recorded steps on resume and in modes, route cells, OD-5 in a run | 28 | **25** | S08, S09 (`--refreeze`), RC04 (base-case rule on a route cell) |
| `h/family2.mjs` OD-1 chains: a hop naming the file only as a field, a dropped first hop, the wrong receiver, `in_place: false`, an unwritten file, a receiver that neither reads nor hands on, a one-hop drop, a back-flow read | 10 (+2 controls) | **10** (controls pass) | — |
| `h/family2.mjs` `WRITER_PIN` drift | 6 | **6** (WP6 via the family rule) | — |
| `h/family2.mjs` `HANDOFF_PIN` drift | 5 | **1** | HP2 addendum, HP3 `uat.yaml` governing (H2), HP4 `agreed/acceptance.md`, HP5 documentation's `signoff.md` |
| `h/fn2.mjs` OD-5 digest: whitespace, CRLF, blank line, column-0 comment, reorder | 5 (+1 control) | **2** (whitespace, reorder) | CRLF, blank line, comment (R2-4) |
| `h/fn2.mjs` calc a year at a time: 2032→2033, 2023→2022 back, Christmas observed, leap 2028 and 2096, 2099-12-31, both range ends, 2027/2038/2050 year ends, N=0 | 12 | **12** correct | — |
| `<EVAL>/zz2-cases` OD-4: on the date, the day after, a clause saying "on the date", an incidental "from the same day" | 2 (+2 controls) | **1** (controls pass) | the incidental phrase (R2-6) |
| `<EVAL>/zz2-cases` OD-5: a `-pack` over a changed clause, with a digest and with "none (no code here)" | 2 (+1 control) | **1** | the no-code path (R2-1) |
| `h/o7post.mjs` | 1 (+3 controls) | **1** (controls pass) | — |
| **Total** | **71** | **59** | 12 |

Round-1 harnesses re-run:
- **Untuned sentences:** `fresh1` 132/138 (6 = the named prose skips), `fresh1b` 24/24, `fresh1c` 30/30, `placement` 51/51.
- **Run-level plants:** `plant2` 47/47 (O6c retired: the golden is fixed), `plant2b` 9/9.
- **Family and file rules:** `family` 17/17, `reads` 5/5, `malformed` 13/13.

### Criteria C1–C19

| # | Verdict | Evidence |
|---|---|---|
| C1 | **PASS** | OD-1 is exact. The pins hold the edges in both directions |
| C2 | **PASS** | 4,401 < 4,500 |
| C3 | **PASS** | CL1–CL3, NM3, PR1 and PR2 caught |
| C4 | **PASS** | Every route cell has a golden, and the cells check write-once and parsing |
| C5 | **PASS** | ow-build applies `governing` (golden) |
| C6 | **PASS** (minor gaps) | Known plants are caught at any placement. Untuned 80%/5% (R2-9) |
| C7 | **PASS** (minor gaps) | OD-3 shapes 27/27 with 0/30 false positives on untuned tables. Targeted long-count tables are flagged (R2-3). Credentials 60% (R2-9) |
| C8 | **PASS** (minor gaps) | Untuned 9/10; 3/10 legitimate sentences flagged (R2-2) |
| C9, C10 | **PASS** | All plants caught |
| C11 | **PASS** | calc year-at-a-time correct, 12/12. The lacking-capability golden exists |
| C12 | **FAIL (major R2-1)** | OD-4 holds, apart from the incidental phrase (R2-6). OD-5's digest path holds. The no-code path ignores the clauses in both the skill text and the checker |
| C13 | **PASS** (minor gap) | Cuts at every step resume correctly; deletions are caught. `--refreeze` is exempt from step checks (R2-5) |
| C14 | **PASS** (minor gaps) | `HANDOFF_PIN` is partial (R2-7). The condition-reason rule is not in the text (R2-8) |
| C15–C17 | **PASS** | Pack and preflight unchanged; malformed 13/13; plants permanent with honest skips |
| C18 | **PASS** | Byte-identical |
| C19 | **PASS** | Manifest current, 1.2.0, no socket. The OD-2 merge after #623 is still pending |

### Defects (round 2)

1. **[M] R2-1: OD-5's no-code path never compares the clauses.**
   - **Skill text:** `uat-yaml-schema.md` §6 (`:93`) says that with no code, `digest: "none (no code here)"` and "the comparison is then of the text `contract-terms.md` quotes". But `contract-terms.md` does not quote the clauses; it points to `uat.yaml` (the `m-plan` golden: "frozen unchanged in `uat.yaml`").
   - **Effect:** in the skill's text-only mode (its declared compatibility), a changed `contract_clauses` upstream is never reported as a basis mismatch. OD-5's subject is exactly those clauses, and they move money.
   - **Checker:** it compares nothing when the digest is the no-code value (`scripts/ow-uat-acceptance.mjs:268` tests only `sha256:`, and `:1166` accepts the no-code value unconditionally).
   - **Repro:** `<EVAL>/zz2-cases/zz2-nocode-pack-changed` (a `-pack` written after `TEST-1` changes from 10 to 15 business days) passes. The same run with the sha256 digest (`zz2-code-pack-changed`) is caught.
   - **Fix:** in no-code mode, compare `uat.yaml` `clauses` (and every other part of the terms block) as text against `contract-inputs.md`, and have `checkBasis` do the same.
2. **[m] R2-2: false positives in the false-pass check.**
   - **Flagged legitimate sentences:** "UAT-03 is not fixed yet." (negation), "Once UAT-04 passes its retest, it will be closed." (future) and "Your shop manager is welcome to run AC-1.1 before signing." (an invitation).
   - **Causes:**
     - `:700`'s not-retested branch ignores negation;
     - its future exemption covers only fixed, resolved and corrected;
     - `NOT_A_CLAIM` (`:678`) lacks "welcome to".
   - **Repro:** `node h/fresh2.mjs` (FPC06–FPC08).
3. **[m] R2-3: the OD-3 long-table rule (`:661`) flags legitimate count tables.**
   - Any five rows of three or more fields with two numbers or dates trip it: a five-session schedule, problems by session, weekly test volumes, expected counts per step.
   - The Data check can never be waived, so a correct run with such a table fails grading.
   - **Repro:** `node h/fresh2b.mjs` (targeted, 4/5).
4. **[m] R2-4: digest blind spots in `termsBlock` (`:234-249`) and in the skill's own §6 definition.**
   - **A CRLF `contract-inputs.md`:** the front-matter regex at `:236` fails, so the block is just `"\n"`, and any clause change is invisible.
   - **A blank line or a column-0 comment inside `contract_clauses`:** the indented-line loop at `:244` stops there, so the later clauses drop out of the digest.
   - **Repro:** `node h/fn2.mjs` (DG2–DG4).
5. **[m] R2-5: `--refreeze` exempts every recorded-step comparison.**
   - `:878` skips the check for the whole run, so a refreeze of `acceptance.md` may also change the testers or `calendars.contract` (S08, S09).
   - `--refreeze` should change only the file it names, and the clauses when they are re-confirmed.
6. **[m] R2-6: OD-4's `appliesOnTheDate` (`:1909`) matches incidental wording.**
   - A clause sentence such as "The readiness notice counts from the same day it is sent" makes a backstop written *on* the backstop date pass.
   - **Repro:** `zz2-backstop-incidental`.
7. **[m] R2-7: `HANDOFF_PIN` (`:1995`) is narrower than H1 and §4.1.**
   - Dropping any of these from the hand-off edges passes (HP2–HP5):
     - `acceptance-addendum-CO-nn.md`;
     - `uat.yaml`'s governing definition (H2, `-delivered`);
     - the `agreed/` copies (`scope.md`, `acceptance.md`, `quick-scope.md`, `CO-nn.md`);
     - documentation's `signoff.md`.
8. **[m] R2-8: departure 26 is enforced but not written in the skill.**
   - The rule is that a condition's client reason changes when the condition is set, met, lapsed or withdrawn.
   - `checkDefect` enforces it, but `defect-format.md` (§1 and the Conditions paragraph) and `phase-defect.md` still have the reason written once at triage.
   - A model following the text keeps "it does not block sign-off" on a blocking condition, which is what the round-1 golden itself did, and now fails.
9. **[m] R2-9: untuned plain-wording gaps.**
   - Our side: O10, O16, O20. Credentials: CR02, CR03, CR04, CR09. People: PP09. False pass: FPP03.
   - One false positive: L12 "your own price list … unit price".
10. **[m] R2-10: the basis check runs only for `-pack` and `-signoff` (`:2173`).**
    - `routing-and-resume.md` §1.3 says a mismatch also blocks `-defect` triage, and no check holds a `-defect` run to it.

**Observations, not graded as defects:**
- RC04: a route cell defers content rules to its base case.
- The checker's table oracle miscounts past 2031 (YC13). The skill text asks the user there.
- The terms block omits `schedule` and `payment_terms_days`, which `uat.yaml` freezes (OWNER-DECISION 2).

### OWNER-DECISIONS

1. **The OD-3 long-table rule.** Five rows of mostly numbers flags legitimate schedules and count tables, and the Data check can never be waived. Options:
   - require an ID-like or contact shape in the rows;
   - raise the threshold;
   - exempt rows labelled with this skill's own terms (Session n, Step n, Week n).
2. **OD-5's block scope.** Should the terms block also cover `schedule` and `payment_terms_days`? `uat.yaml` freezes both, and they decide the backstop and invoice paths. Today an upstream change to either is not a mismatch (DG8, DG9).
3. **OD-5 no-code (the fix for R2-1).** Confirm that with no code the skill compares every part of the terms block as text, the clauses in `uat.yaml` included, labelled not machine-checked, and that the checker does the same.
4. **OD-2.** The merge after OW-03 (#623) is still pending. Calendar tests must re-run after `main` is merged in.

### Verdict: **FAIL**

All four criteria are 6 or above, but one major defect remains. R2-1: OD-5's no-code path does not cover the frozen clauses, in either the skill text or the checker, and that is the skill's declared text-only mode.

Every round-1 defect is fixed in behaviour, and OD-1, OD-3's shapes, OD-4 and OD-5's digest path hold. The fix for R2-1 is small: a sentence in `uat-yaml-schema.md` §6 and a text comparison in `checkBasis`. The minors are regression-net tuning, plus the missing departure-26 sentence.

### Harness files (in `<EVAL>`)

- `h/sentences2.mjs` (the untuned set) and `h/fresh2.mjs`; `h/fresh2b.mjs` (OD-3 probes); `h/o7post.mjs`
- `h/plant3.mjs`, `h/family2.mjs`, `h/fn2.mjs`, `h/wp6.mjs`
- `h/mkcases2.mjs`, which builds `zz2-cases/`, and `h/zz2.mjs`, which grades them
- The round-1 harnesses, with their anchors updated to the round-2 goldens: `fresh1`, `fresh1b`, `fresh1c`, `placement`, `plant2`, `plant2b`, `family`, `reads`, `malformed`
- Results in `*.out` and `*-results.json`, plus `snap-tree.txt`. The C18 base manifest is round 1's `snap-base.txt`

To re-run, check out `e73975f7` at `<EVAL>/tree` and run `npm ci --ignore-scripts`, `cd site && npm ci`, then `npm run build`. Copy `zz2-cases/*` into `tests/fixtures/ow-uat/` only for `h/zz2.mjs`, and remove them before running vitest.
