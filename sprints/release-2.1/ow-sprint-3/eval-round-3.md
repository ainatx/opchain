## OW-04 (Sprint 3) — Evaluation Round 3 (final before escalation)

**Sprint:** ow-uat 1.0.0 (contract `sprints/release-2.1/ow-sprint-3/contract.md`, amended with OD-1 to OD-7) · **Branch:** `claude/ow-uat-sprint-3`, head `9e69d75d`. Its commits are `d9503cde`; `16eb5166`, which merges main `d3965168` (#623, ow-tools 1.1.0); and `9e69d75d`. · **Scope:** R2-1 to R2-10, OD-6 and OD-7, and the ow-tools merge · **Evaluator:** skeptical Evaluator, oc-app-architect Phase 6 · **Date:** 2026-10-17

**Standard applied.**
- D1, D2 and D5 apply as in earlier rounds. Under D2, untuned plain-wording gaps and false positives are **minor**.
- OD-1 to OD-7 are graded as written. For R2-1, the owner confirmed: with no code, every part of the terms block is compared as text, and the comparison is never skipped.

**Where I worked.**
- A detached checkout of `9e69d75d` at `<EVAL>/tree`, now removed. The Generator's worktree is untouched and clean at `9e69d75d`.
- My `zz2-*` and `zz3-*` cases went into the checkout's fixture folder only while `h/zz3.mjs` graded them, after vitest had finished. They were removed straight afterwards.

**Rule for the untuned set.** I wrote `h/sentences3.mjs` (105 sentences) before reading the round-3 rules in `scripts/ow-uat-acceptance.mjs` or the round-3 `tests/ow-uat-sentences.mjs`. I had read only the skill-text diff and the goldens.

### Code Scores

| Criterion | Weight | Score | Justification |
|---|---|---|---|
| Functionality | 30% | **8/10** | Every round-2 defect is fixed in behaviour (table below). OD-6, OD-7, OD-4 and the R2-1 no-code path work.<br>• The terms digest now normalises CRLF and keeps clauses after a blank or comment line.<br>• A change to the schedule or payment terms blocks `-pack`, and `-defect` triage too.<br>• `calc` behaves as the 1.1.0 CLI expects: refusals carry `calendar-out-of-range`, F-008 keys are unchanged, `--holidays` is unchanged. Year-end, leap-day and range-end answers are right.<br>Residue (all minor):<br>• negated backstop wording counts as "on the date" (R3-2);<br>• a refreeze that adds a check has no route (R3-6). |
| Feature Completeness | 30% | **8/10** | 140 ow-uat goldens: OD-6 no-code cases, `-defect` over a terms mismatch, and a backstop clause that says "on the date". 55 ow-build goldens. Every evaluator plant from rounds 1 and 2 is a vitest case.<br>Gaps:<br>• the checker's no-code comparison skips the UAT line's price and test mix, and a deleted key or Ownership section (R3-1);<br>• the refreeze-adds-check path is undefined (R3-6). |
| Code Quality | 20% | **7/10** | Untuned results:<br>• our side 80%, **0%** false positives;<br>• tables **5/5 and 5/5** (personal or ID rows caught; count and schedule tables pass at any length);<br>• prose record ids **5/5, with 0/10** false positives on UAT-03, AC-1.1, RUN-02, CO-04, tester ids, rec numbers, versions and times;<br>• false pass 80% with 10% false positives; credentials 70% with 0%.<br>Targeted round-3 plants: 19/31 caught. The slips are in the no-code oracle, negated backstop wording, plural table headers and BOM files (R3-1 to R3-5). |
| UX (clarity for person and model) | 20% | **8/10** | Body ≈4,401 tokens.<br>• Departure 26 (the condition reason follows the status) is now in `defect-format.md` and `phase-defect.md`.<br>• OD-6's parts are listed in `routing-and-resume.md` §1.3, and the refreeze limit is spelled out in `phase-plan.md`.<br>• OD-7 ("judged by what its rows hold, never by its length") is in `self-checks.md`. |

**Weighted Code Score:** 0.3×8 + 0.3×8 + 0.2×7 + 0.2×8 = **7.8 / 10**

### Test Results

| Run | Result |
|---|---|
| `npx vitest run` (full, after `npm run build`) | **4,842 passed, 14 skipped**, 0 failed (137 files). This matches the claim |
| `npm run build` | exit 0 (`@ 9e69d75d`); no tracked change afterwards |
| Catalog, contracts, `lint-internal-refs`, `check-skill-flags`, `gen-route-spec:check`, `sync-bundles:check`, `sync-plugin-skills:check`, `checkpoint:validate` | all exit 0 |
| ow-tools | `gen-ow-tools-manifest --check` current ("ow-tools 1.2.0"); `plugin.json` and both `marketplace.json` fields are 1.2.0. Design §14.3 lists `calendar-out-of-range` (exit 4), at `ow-tools-design.md:680` and `:739` |
| Acceptance checkers | ow-start 4, ow-build-plan 32, ow-build **55**, ow-uat **140**: all golden runs pass |
| C18 | `git diff d3965168 HEAD` on `skills/ plugins/opchain/ src/ site/ package*.json build.mjs` is **empty**, so oc- sources equal the new merge base. Against round 1's base manifest (`90e61149`), only `plugins/opchain/README.md` and the CHANGELOG copy differ, and both are main's own changes in #619 and #621 |
| Body tokens | 17,604 chars ≈ **4,401** |
| `.bugcheck.json` | One file (`tests/ow-uat-sentences.mjs`) under `scan_exceptions.secrets`. The re-pinned digest `eff8b72e…` matches the file: **narrow** |

### Generator claims, verified

| Claim | Verdict |
|---|---|
| R2-1 to R2-10, OD-6, OD-7 | **True in behaviour.** All the round-2 harnesses now pass (below). OD-6 and OD-7 are in the text and the checker |
| Cited lines: `termsTextMismatches` `:278`, `termsBlock` `:248`, refreeze `:946`/`:997`, backstop `:2037`, `HANDOFF_PIN` `:2132`/`:2143`, append pin `:917`, basis on `-defect` `:2305`, false-pass exemptions `:773`/`:778`, OD-7 `:720-730`, prose rule `:755` | **True**: each is at the cited line |
| Merge: ow-tools 1.2.0 on 1.1.0, the refusal in 1.1.0's format, §14.3 entry, manifest regenerated | **True**: OT-1 to OT-8 below; `--check` passes |
| My harnesses pass, except fn2 YC7/YC8 (`e.extra.reason`) | **True.** After adapting YC7 and YC8 (and YC13, since the checker's table oracle now refuses past 2031, as intended), `fn2` passes 21/21 |
| 4,842 tests | **True** |
| Held-out set | Not re-measured; my untuned set below stands in |

### Round-2 defects

| # | Status | Evidence |
|---|---|---|
| R2-1 OD-5 no-code path | **Fixed** | `zz2-nocode-pack-changed` is caught; `pack-terms-nocode*` goldens. The skill text (`routing-and-resume.md` §1.3) lists every part of the block. The checker's comparison still has gaps (R3-1) |
| R2-2 false-pass false positives | **Fixed** | `fresh2` controls 145/145. "not fixed yet", "will be closed" and "is welcome to" now pass |
| R2-3 OD-3 long tables | **Fixed (OD-7)** | `fresh2b` 10/10; my untuned count and schedule tables 15/15 |
| R2-4 digest blind spots | **Fixed for CRLF, blank lines and comments** | `fn2` DG2–DG4. A BOM is new (R3-5) |
| R2-5 `--refreeze` exemption | **Fixed** | `plant3` S08 and S09 caught |
| R2-6 incidental "from the same day" | **Fixed** | `zz2-backstop-incidental` refused on the date. Negated wording is new (R3-2) |
| R2-7 `HANDOFF_PIN` | **Fixed** | `family2` HP2–HP5 caught; HP-fix, HP-dated, HP-pointers and HP-verb caught |
| R2-8 departure 26 in the text | **Fixed** | `defect-format.md` §5 and `phase-defect.md` step 3 |
| R2-9 untuned slips | **Fixed for the cases raised** | `fresh2` plants 145/145 |
| R2-10 basis on `-defect` | **Fixed** | `defect-terms-mismatch` golden; `checkBasis` grades triage only |

Round-1 and round-2 harnesses re-run:
- **Untuned sentences:** `fresh1` 134/138 (the 2 remaining OD-3 prose skips, at 2 placements), `fresh1b` 24/24, `fresh1c` 30/30, `fresh2` 145/145 and 145/145, `fresh2b` 10/10, `placement` 51/51 and 105/105.
- **Run-level plants:** `plant2` 47/47, `plant2b` 9/9, `plant3` 28/28, `o7post` 1/1 and 3/3. O6c is retired, and the pre-retest O7d/O7f controls are correctly flagged under departure 26.
- **Family and file rules:** `family` 17/17 (WE1 and HE1 by the pins), `family2` 20/20, `reads` 5/5, `malformed` 13/13, `fn2` 21/21.
- **Custom cases:** `zz2` all as expected. On `zz2-backstop-clause-on-date`, my copied round-2 `uat.yaml` carries the old digest, so a `basis` finding appears; that is a harness artifact. The `backstop` check passes.

### New untuned set (`h/sentences3.mjs`)

| Set | Placements | Plants caught | Controls passing |
|---|---|---|---|
| OUR side, 20 | request start; UAT-05 reason | **16/20** (80%) | — |
| Legitimate, 20 | request start; punch list | — | **20/20** (FP 0%) |
| False pass, 10 plants; 10 controls (negations, futures, invitations) | Mossgate request start and end; UAT-05 reason | **8/10** | **9/10** |
| Credentials, 10 | pack; RUN-01 | **7/10** | **10/10** |
| Tables, 5 personal or ID; 5 count or schedule (6-row schedule, class × session counts, 6 weeks of volumes, step counts with minutes, fix rounds with dates) | SC-06; pack; request "Records created" | **5/5** (15/15 placements) | **5/5** (15/15) |
| Prose record ids, 5; 10 controls with this skill's ids (UAT-03, AC-1.1, RUN-02, CO-04, `oc-T1`, rec 63, version 2.4.1, 09:30, SC-06, WP-2) | SC-06; request; pack | **5/5** | **10/10** (30/30) |

- **Slips:**
  - our side, plain wording:
    - T10 "UAT took us three times our internal estimate."
    - T14 "Each extra tester role is marked up by a quarter."
    - T15 "We spent the whole of Friday reproducing UAT-07."
  - our side, implied (accepted): T04 "Robin worked late twice to finish the retest build."
  - false pass:
    - F04 "The checks were all confirmed by your shop manager."
    - F10 "UAT-04 now behaves as agreed."
    - F08 "The problem in UAT-05 has gone away." (idiom, accepted)
  - credentials:
    - K05 "Sign in with bookkeeper@sandbox and Stone#Ware9."
    - K06 "The one-time code was 449201."
    - K10 "Its secret key is ab12cd34ef56gh78ij90."
- **False positive:** FC05 "When UAT-05 passes its retest, it will be marked fixed." (`doneClaims` does not see "will be marked" or the clause before the comma).
- **Negations, futures and invitations:** 9 of 10 pass. "not yet fixed", "has not been fixed or retested yet", "will be retested … before it can be closed", "are welcome to run", "may want to try" and "if your shop manager would like to test" all pass.

### New plants aimed at round-3 code

| Harness | Plants | Caught | Slips |
|---|---|---|---|
| `h/fn3.mjs` digest edges: BOM, CRLF, trailing space, blank line, comment, schedule, payment terms, schedule deleted | 8 (+2 controls) | **7** | DG-BOM (R3-5) |
| `h/fn3.mjs` no-code text path: clause changed, schedule deleted, clause deleted, BOM file with a changed clause, Ownership deleted | 5 (+2 controls) | **3** | schedule deleted, Ownership deleted (R3-1) |
| `h/fn3.mjs` OD-4 wording: "does not apply on", "never falls due on" | 2 (+4 controls: "falls due on", "falls due after", "counts from the same day", "from and including") | **0** (controls pass) | both (R3-2) |
| `h/fn3.mjs` OD-7 headers: plural "Orders", plural "Accounts", "Client", "Store" with emails | 4 (+3 controls) | **1** | Orders, Accounts, Client (R3-3). Controls: "Orders" counts pass; the provider's test card and a sandbox invoice in prose are **flagged** (R3-4) |
| `h/fn3.mjs` `HANDOFF_PIN`: `-fix` drops the punch list, "dated" dropped, "data pointers" dropped, verb renamed | 4 (+1 control) | **4** | — |
| `zz3-cases` run level: backstop "falls due after", "on or after", negated; no-code schedule removed; code schedule removed; no-code UAT price and test mix; a double space inside a clause (no-code) | 8 (+3 controls) | **4** | negated wording; no-code price, test mix and schedule removed. Controls: "falls due on" and "larkspur-same" pass; a legitimate refreeze that adds a check is **flagged** (R3-6) |
| **Total** | **31** | **19** | 12 |

**Merged ow-tools 1.2.0 under 1.1.0 (`h/fn3.mjs` OT-1 to OT-8, all correct):**
- 2026-11-20 + 10 on `us-federal` is 2026-12-07.
- 2099-12-30 + 2 refuses with exit 4: `{"status":"refused","reason":"calendar-out-of-range"}`.
- `--calendar` with `--days`, and an unknown calendar name (`US-Federal`), are exit 2.
- 1.1.0's days mode is unchanged (`calendar: "every day"`, F-008 keys), and so is its `--holidays` path.
- `version --json` gives 1.2.0 with `calc.calendars: [us-federal]`.
- 2021-12-30 + 1 refuses.

`fn2`'s 13 calendar cases also pass.

**Observations, not graded as defects:** a BOM added to an unchanged file reports a mismatch on both paths. That is a safe false alarm.

### Criteria C1–C19

| # | Verdict | Evidence |
|---|---|---|
| C1–C5 | **PASS** | Unchanged and green. The pins hold the edges in both directions |
| C6 | **PASS** (minor gaps) | Untuned 80%/0%; plain slips T10, T14, T15 (R3-7) |
| C7 | **PASS** (minor gaps) | OD-7 tables 5/5 and 5/5; prose 5/5 and 10/10. Header-heuristic slips (R3-3). Test-card and sandbox-id false positives (R3-4). Credentials 7/10 (R3-7) |
| C8 | **PASS** (minor gaps) | 8/10 and 9/10 (R3-7) |
| C9–C11 | **PASS** | All plants caught; calendar behaviour correct after the merge |
| C12 | **PASS** (minor gaps) | OD-4 is right for "on", "after", "on or after", "from and including" and incidental wording. Negated wording slips (R3-2). OD-5 and OD-6 hold on the digest path. The no-code checker comparison is partial (R3-1), while the skill text lists every part |
| C13 | **PASS** (minor gap) | Refreeze limits are enforced. A refreeze that adds a check has no defined path (R3-6) |
| C14 | **PASS** | `HANDOFF_PIN` covers H1, H2 and §4.1 |
| C15–C17 | **PASS** | Plants are permanent, with honest named skips |
| C18 | **PASS** | oc- sources equal merge base `d3965168` |
| C19 | **PASS** | 1.2.0 on 1.1.0, manifest current, §14.3 entry, 1.1.0's fence suite green |

### Defects (round 3)

None is major. The skill text is correct in each case except R3-6, which is a path the design never defined.

1. **[m] R3-1: the checker's no-code comparison is narrower than the skill text.**
   - `termsTextMismatches` (`:278`) compares only `uat.{size, tester_roles, sessions, fix_rounds, fix_business_days}`, so a changed UAT **price** or **test mix** passes (`zz3-nocode-larkspur-price`, `zz3-nocode-larkspur-testmix`).
   - It skips a key removed upstream (`if (d[k] === undefined) continue`) and an Ownership section removed upstream (`if (own && …)`), so `zz3-nocode-schedule-removed` passes, as do NC-sched-del and NC-own-del.
   - `routing-and-resume.md` §1.3 tells the model to compare "every part of the block", and the code path catches all four, so only the regression net is short.
2. **[m] R3-2: OD-4's `appliesOnTheDate` (`:2037`) takes negated wording as "applies on the date".**
   - "does not apply on the backstop date itself" and "never falls due on the backstop date" both count. A backstop written on the date then passes (`zz3-backstop-negated`).
3. **[m] R3-3: OD-7's header heuristics hide ID-like values.**
   - The plural rule in `COUNT_HEADER` (`:721-723`) reads "Orders" and "Accounts" as count columns, so `58213` and `99120345` under them pass.
   - `NAME_COLUMN` lacks "client", so a "Client" column of business names and amounts passes.
4. **[m] R3-4: two false positives** (targeted probes, written after reading the rule).
   - The payment provider's published test card "4242 4242 4242 4242", in a test-mode scenario, is flagged as card-like (`CARD`).
   - "Invoice 100001 in the sandbox was created by SC-06 and can be deleted" is flagged by the prose rule (`:755`). The request lists records created during testing for clean-up, so a model naming the sandbox ids fails the never-waived Data check in grading.
   - My untuned prose controls all pass.
5. **[m] R3-5: a BOM defeats the digest.**
   - With a byte-order mark before `---`, `termsBlock` (`:248-252`) finds no front matter and digests just `"\n"`. A file that had the BOM when it was frozen never reports a clause, schedule or payment-terms change on the code path.
   - Unlikely, since ow-build-plan writes the file, but possible after a hand edit.
6. **[m] R3-6: a refreeze of `acceptance.md` whose upstream adds a check has no route.**
   - `phase-plan.md` says nothing else in `uat.yaml` changes, and no `-plan` mode writes scenarios under `--refreeze`. The new check gets no required scenario, and `-signoff` (criterion 1 reads `agreed/`) would refuse with no verb to fix it.
   - The checker flags a run that adds the check to `uat.yaml checks` (`zz3-refreeze-adds-check`). Its `exitCriteria` reads `uat.checks`, so it would pass a sign-off that never tested the new check.
7. **[m] R3-7: untuned plain-wording gaps.**
   - Our side: T10, T14, T15. False pass: F04, F10. Credentials: K05, K06, K10.
   - One false positive: FC05 "it will be marked fixed".

### OWNER-DECISIONS

1. **Refreezing changed acceptance checks (R3-6).** Should `--refreeze agreed/acceptance.md` re-derive `uat.yaml checks` and write a required scenario for each new check? Or should a changed check list go through a change order and `--add-co` instead, with `--refreeze` refusing when the check ids differ?
2. **Test data the testing itself created (R3-4).** May a scenario name a provider's published test card, and may a request name sandbox record ids as clean-up pointers? If yes, the Data rule needs a test-mode or sandbox exemption.
3. **Landing order.** #624 (OW-08) conflicts in `catalogs.json`, `check-skill-contracts` and `skills-work/README`, and #625 (ow-tools 1.1.1) may merge first. The calendar suite and C18 should be re-run after the landing merge.

### Verdict: **PASS**

Every criterion is 6 or above, and there is no major defect. All round-2 defects are fixed, OD-6 and OD-7 are implemented in the text and the checker, the ow-tools merge is clean and behaves correctly under 1.1.0, and C18 holds. R3-1 to R3-7 are minor:
- regression-net gaps (R3-1, R3-3, R3-5, R3-7);
- wording and false-positive edges (R3-2, R3-4);
- one undefined edge path for the owner (R3-6).

They can be folded into the net before Sprint 6.

### Harness files (in `<EVAL>`)

- `h/sentences3.mjs` (the untuned set), `h/fresh3.mjs`, `h/fn3.mjs`
- `h/mkcases3.mjs` builds `zz3-cases/`; `h/zz3.mjs` grades `zz2-*` and `zz3-*`
- Every round-1 and round-2 harness (`fresh1`, `fresh1b`, `fresh1c`, `fresh2`, `fresh2b`, `placement`, `plant2`, `plant2b`, `plant3`, `o7post`, `family`, `family2`, `reads`, `malformed`, `fn2`), with `fn2` adapted to `e.extra.reason`
- Results in `*.out` and `*-results.json`; `zz.out`; `snap-tree.txt`

To re-run, check out `9e69d75d` at `<EVAL>/tree` and run `npm ci --ignore-scripts`, `cd site && npm ci`, then `npm run build`. Copy `zz2-cases/*` and `zz3-cases/*` into `tests/fixtures/ow-uat/` only for `h/zz3.mjs`, and remove them before running vitest.
