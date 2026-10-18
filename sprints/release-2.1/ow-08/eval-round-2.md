## OW-08 (Sprint L) — Evaluation Round 2

**Sprint:** ow-start 1.1.0, meeting and decision logs (contract `sprints/release-2.1/ow-08/contract.md`, with the owner's round-1 decisions R1-1 to R1-4) · **Branch:** `claude/ow-08-ow-start-logs`, head `8553905f` (commits `02231644`, `d574f96a` = merge of main #619/#621/#622, and `8553905f`) · **Byte-identity base:** `d61b2a3a` (main) · **Evaluator:** skeptical Evaluator, oc-app-architect Phase 6 · **Date:** 2026-10-17

**Standard applied.**
- **D1:** an internal number is OUR side only.
- **D2:** meaning checks are a regression net plus the skill's self-check. A plain-wording slip is a minor defect; an idiom or a marker-less implied claim is accepted.
- **Owner decisions after round 1:**
  - **R1-1:** trim the body, keeping at least 400 tokens of headroom.
  - **R1-2:** S1–S3 ship as 1.2.0 or later.
  - **R1-3:** the undated form is ratified as logs-only.
  - **R1-4:** real-run screens are graded on prescribed text plus structure only.
- **Expected, not graded:** O4 (the ow-tools hook) waits on OW-03, and the rebase onto OW-04 has not happened.
- **Severity:** as in round 1. **[M] major** is a contracted or owner-ruled check that gives the wrong verdict on a realistic run. **[m] minor** is an edge case, a gap in the D2 net, a coverage gap or drift.

**Where I worked.**
- `<E2>/tree` is a detached checkout of `8553905f`; `<E2>/base` is a detached checkout of `d61b2a3a`. Each had `npm ci --ignore-scripts` run at the root and in `site/`.
- The Generator's worktree was not touched.
- Two probe cases from round 1 (`logs-zz-eval-declined`, `logs-zz-eval-moveback`) and one new one (`logs-zz-eval2-price2000`) sat in my tree's fixtures while they ran. They were removed before the final test run.
- Harness: `<E2>/h1/` (the round-1 harnesses, re-run unchanged); `<E2>/h/untuned2.mjs`, `run-untuned2.mjs`, `plants2.mjs`. Results: `r1-*.out`, `untuned2.out`, `plants2.out`, `plants2-results.json`. Both worktrees are removed.

### Code Scores

| Criterion | Weight | Score | Justification |
|---|---|---|---|
| Functionality | 30% | **8/10** | Every round-1 text defect is fixed in the skill: never guess the workstream, on four verbs plus prep; the logs-only handling answer; dedupe against the item's newest line; the `-action` and `-log` self-checks; acronym roles; the Writes column; the description's trigger phrase. The body trim loses nothing a model needs, but one 1.0.0 rule was dropped rather than moved: `/ow-status`'s column list (m3). Evaluation ids ("round 1 m5") now appear in the shipped skill text (m8). |
| Feature Completeness | 30% | **8/10** | Delivered:<br>• 49 logs goldens, including declined-again, moved-back, handling asked and read back, and four no-workstream goldens;<br>• every round-1 plant, sentence and malformed probe made permanent;<br>• a held-out set;<br>• pins for every moved paragraph;<br>• the changelog, README and contract records of R1-1 to R1-4.<br>Missing: the `never` guards on refusal screens (D1′b), and a grade for asking the handling question again when `profile.md` has a value (m5). |
| Code Quality | 20% | **6/10** | **Better than round 1:**<br>• the index compares by meaning (7/8 amount, phrase and person plants caught);<br>• the decline is carried over;<br>• private names come from one source (11/11);<br>• a 7-digit phone is caught;<br>• the `<Name> from <Org>` false positives are gone (0/10 on my new controls);<br>• 0/22 false positives on new legitimate sentences.<br>**Still weak:**<br>• screen grading in both directions (D1′: 0/4 wrong refusal screens caught, and 7/7 reasonable rewordings fail);<br>• follow-up recall on my new plain set is 17/22, and the held-out set is 11/15 with all four misses plain (m1);<br>• the money-key rule can be bypassed (m2);<br>• two index false positives (m4). |
| UX (clarity for person and model) | 20% | **7/10** | The body is 3,995 tokens (505 of headroom, which meets R1-1). Pointers to `phase-setup.md` are pinned. The `-action` and `-log` screens are prescribed. Against that:<br>• the description is 1,007 of 1,024 characters (17 left before S1–S3);<br>• "round 1 m5" sits in four reference paragraphs;<br>• the transcription absent-case now lives in a file named for `/ow-setup`, reachable only through two pointers. |

**Weighted Code Score:** 0.3×8 + 0.3×8 + 0.2×6 + 0.2×7 = **7.4 / 10**

**Verdict: FAIL.** Every criterion is at least 6, but one major remains (D1′): R1-4 is not met as claimed. The fix is mechanical: tighten the phrase classifier, loosen nine regexes to structure, and add `never` guards. Everything else in round 1 is fixed.

### Test Results

| Run | Result |
|---|---|
| `gen-skills-catalog` / `check-skill-contracts` / `lint-internal-refs` | exit 0 / 0 / 0 |
| `ow-start-acceptance` | exit 0: 53 golden runs (4 intake + 49 logs) |
| `ow-start-logs-acceptance` / `ow-build-plan-acceptance` / `ow-build-acceptance` | exit 0: 49 / 32 / 54 |
| `npx vitest run` (full) | 130 files, **3,341 passed, 9 skipped** (the 9 skips predate this branch), 0 failed. The OW-08 files: 681 passed, 0 skipped |
| `npm run build` | exit 0 (`@ 8553905f`); `git status --porcelain` empty |
| oc- byte-identity vs a build of `d61b2a3a` | `snapshot.sh` manifests, 1,473 lines, **identical** |
| Intake goldens and protocol | `git diff d61b2a3a..8553905f` on the four intake cases, `workspace/`, `ow-start-acceptance.test.js` and `ow-protocol.md` is empty |
| Body / description | **3,995** tokens (cap 4,500; 505 of headroom) / **1,007** chars (limit 1,024) |
| Not verified | `npm run evidence:pr`; the per-commit verifier |

### Generator claims, verified

| Claim | Verdict |
|---|---|
| Body about 3,995 tokens; text moved word for word into `references/phase-setup.md` and pinned | **Mostly true.**<br>• The body is 3,995 tokens.<br>• `/ow-setup`'s steps and "Works on its own" moved word for word.<br>• The transcription absent-case changed its first sentence ("Transcription is the ow-tools add-on's." became "Transcribing a recording runs code, so it lives in…"); the rest is word for word and pinned.<br>• **Not moved:** the 1.0.0 `/ow-status` column list ("client · last step · next · awaiting, with its date", "workstream · item · owner role · due") was dropped. It is now "shows them as two tables" and appears nowhere else (m3).<br>Pins catch my T01–T04 and T07. |
| D1a decline carry-over (`:869`) | **True.** `declinedBefore` (`scripts/ow-start-logs-acceptance.mjs:869-873`). My round-1 probe now passes, the same run asking again now fails, and golden `logs-git-declined-again` covers it |
| Every graded phrase across the 49 keys is skill text or structure, enforced by a test | **False** (D1′). The test's "structural" classifier (`tests/ow-start-logs-acceptance.test.js`, R1-4 block) accepts any phrase that starts with an id or contains a path or a date. That lets through golden prose such as "D1 is logged already as DEC-01", "D2 does not parse", "DEC-02 supersedes it", "MTG-01, logged with no agenda", "A-01: client ops lead", "^- MTG-01" and "larkspur-ceramics \(MTG-02, meeting on 2026-10-20\)". Of 107 phrases, 52 are literal skill text; most of the other 55 are honest structure, but at least 18 carry golden wording or layout |
| D2a index by meaning (`:795`, `:824`, `:827`, five-word runs) | **True, with gaps.** Caught by value: 2,600 USD, 2.6k, words, 6,980, a 5-word phrase, the user's name. Gaps: amounts from 1900 to 2100 are skipped as years (X01); two false positives (X10, X11) (m4) |
| D2b refuses money, note and person keys (`check-skill-contracts.mjs:704-729`) | **Partly true.** `price`, `build_plan_fee` and `source` are refused. Accepted:<br>• `trigger_confirmed` and `history`, whose person values are documented off the template line;<br>• planned producers' `retainer`, `hours_used` and `subtotal`.<br>Also, the date key `send_by` is wrongly refused by the `_by` rule (m2) |
| D2c `-log` self-check | **True.** `self-checks-logs.md` "Index copies nothing" row; `logs-status-and-index.md` §2; pinned; the golden screen prints it |
| m1–m9 and nits | **Fixed.**<br>• m1: 28/28 plain on my round-1 set.<br>• m2: 7-digit phone, sentence-initial nouns and `cc:` with a role all fixed.<br>• m3: `familyNameRules`.<br>• m4: newest-line dedupe.<br>• m5: the rule and four goldens.<br>• m6: `checkHandling` and two goldens.<br>• m7, m8, m9: fixed.<br>• Nits: resume with one follow-up file present, "date", the trigger phrase, #604, the CO kind.<br>Residuals are listed below |
| My 72 round-1 plants pass; plain 28/28 with U28 and U30 accepted | **True.** 72/72, 28/28. U29 and U31 caught; U28 and U30 are the accepted idioms. The round-1 probes, the 7 malformed probes and the STATUS sets (12/12 legitimate, 14/14 bad) all pass |
| Held-out set: our side 11/15, 0/15 false positives, people 10/10, private 10/10 | **True as measured.** **All four misses are plain wording, so each is a minor defect (m1):**<br>• "invoicing … at my normal hourly figure": our rate;<br>• "priced the change below our usual level": a modifier on our price;<br>• "billable on my side": billing our time;<br>• "the quote I gave you was too low": an under-quote.<br>Holding them out as a measurement is fine, but under the owner's rule they are defects to grow into the net next round |

### New untuned set (`h/untuned2.mjs`, written before reading the round-2 rules)

| Set | Size | Result |
|---|---|---|
| Our side (must flag) | 25 (22 plain, 3 implied) | **17/25**. Plain **17/22 (77%)**. Implied 0/3 (accepted: "labour of love", "basically for free", "won't make me rich") |
| Legitimate client sentences (must pass follow-up clean and people) | 22 | **0/22** false positives, including "Your accountant charges you monthly", "Your margin on the large planters", "Your delivery partner raised their rates" and "Your kiln runs about 12 hours a firing" |
| People names (must flag) | 11 | **9/11**. Misses: C03 "5125550199" (10 unformatted digits) and C11 "+44 20 7946 0958" (UK format) (m6) |
| People controls (must pass) | 10 | **0/10** false positives ("Clay from Laguna", "Payments from Shopify", "Labels from Avery", "the ops lead from Larkspur Ceramics") |
| Private names (must flag) | 11 | **11/11** (with a space, an underscore, joined, upper case, possessive) |
| Private-name controls | 5 | 0/5 false positives |

Plain our-side misses (m1):
- A02 "I bill by the half day for site visits.": our billing unit.
- A04 "I spent most of Tuesday on the export mapping.": our effort.
- A06 "We've used up the hours we set aside for the importer.": an overrun.
- A09 "I add 20% on top for rush jobs.": a modifier.
- A19 "My time on the extra report is not covered by the quote.": the weakest of my plain labels.

### Plants

**Round-1 harnesses, re-run unchanged:**
- `plants.mjs`: 72/72;
- `untuned.mjs`: plain 28/28; legitimate 0/30 false positives; names 12/12; controls 0/15 false positives; STATUS 26/26. The private names show 12/12 when run through `privateNameFindings`; my old harness used its own copy of the round-1 rule;
- probes `declined` and `moveback`: both now pass;
- `malformed.mjs`: 7/7 fail per check.

**New round-2 plants (`h/plants2.mjs`): 56.** S05 is excluded: proposing roles for the user to confirm is acceptable. That leaves **42 must-catch plants (27 caught) and 13 legitimate edits (3 pass).**

| Area | Must catch | Legitimate edits | Notes |
|---|---|---|---|
| Body trim (T01–T07) | 5/7 | — | T05: the body's transcription pointer can be removed unnoticed, but the Verbs row still points to §3, so this is accepted. **T06: `/ow-status`'s last layout rule is unpinned, and its 1.0.0 column list is gone (m3)** |
| D2b keys (K01–K10) | 3/8 | 1/2 | Slips: K03 `trigger_confirmed`, K04 `history`, K05 `retainer`, K06 `hours_used`, K07 `subtotal`. False positive: K09 `send_by` (m2) |
| D2a index by meaning (X01–X12) | 7/8 | 2/4 | Slip: X01, a 2000.00 price shown as "(2,000)" (year range). False positives: X10 "not verified by this skill", X11 a client figure of 450 (m4) |
| Never guess the workstream (W01–W07) | 5/6 | 0/1 | **W06: the only never-guess guard of `logs-no-workstream-log` is `route.never: "^- MTG-01"`.** Route regexes use flag `i` without `m` (`:523-526`), so it can never match. W07: another listing format fails (D1′) |
| Handling (H01–H06) | 4/6 | — | H04: asking again in other words passes. H06: asking again when `profile.md` holds the value is graded nowhere (m5) |
| Moved-back dedupe (M01–M03) | 3/3 | — | |
| Prescribed-text grading (S01–S11) | 0/4 | 0/6 | **D1′**: wrong refusal screens pass (S01–S04), and reasonable rewordings fail (S06–S11) |

### Criteria C1–C20

| # | Verdict | Evidence |
|---|---|---|
| C1 | **PASS** | Catalog and contracts green; writer plants hold |
| C2 | **PASS** | 3,995 ≤ 4,500 with 505 of headroom (R1-1); description 1,007 ≤ 1,024; protocol identical |
| C3 | **PASS (gaps)** | Money and person keys refused by name and by documented value; bypasses and the `send_by` false positive (m2) |
| C4 | **PARTIAL** | Goldens for every cell, plus four no-workstream cells. Real-run screen grading fails other wording and passes wrong refusals (D1′) |
| C5–C9, C11 | **PASS** | Unchanged goldens and plants hold; my round-1 R/W/S/O plants are 72/72 |
| C10 | **PASS (gaps)** | By meaning: 7/8 amount, phrase and person plants caught; the year-range gap and two false positives (m4) |
| C12 | **PASS (gaps)** | 9/11 untuned names caught (two phone shapes slip, m6); 0/10 false positives |
| C13 | **PASS** | One rule source; 11/11 plus 12/12 |
| C14 | **PASS** | Dedupe against the newest line; moved-back golden; M01–M03 caught |
| C15 | **PARTIAL (expected)** | O4 hook waits on OW-03 |
| C16 | **PASS (gaps)** | Decline carried over (golden plus probe); logs-only handling asked and read back (goldens); H04 and H06 gaps (m5) |
| C17 | **PASS** | 12 malformed probes, now permanent |
| C18 | **PASS** | Every round-1 plant is permanent; no skips |
| C19 | **PASS** | oc- output identical; intake goldens unchanged; sibling goldens green |
| C20 | **PASS** | Changelog records R1-1 to R1-4 and the #604 correction; pins |

### Defects (round 2)

1. **[M] D1′: R1-4 is not met. Screens are still graded on golden wording, and some wrong screens now pass.**
   - **a. Other wording still fails** (7/7 probes):
     - `logs-status-open` `must` wants "A-01: client ops lead" (S06);
     - `logs-decision-some-logged` wants "D1 is logged already as DEC-01" (S07);
     - `logs-decision-notes-mismatch` wants "D2 does not parse" (S08);
     - `logs-decision-supersede-open` and `-closed` want "DEC-02 supersedes it" (S09);
     - `logs-business-vendor` wants "MTG-01, logged with no agenda" (S10);
     - `logs-log-index` wants `^- MTG-01` bullets (S11);
     - `logs-no-workstream-log-meeting` wants "larkspur-ceramics (MTG-02, meeting on 2026-10-20)" (W07).
     The enforcing test classifies any phrase that starts with an id, or contains a path or a date, as structural, so it passes all of these.
   - **b. Wrong screens pass:**
     - `DONE:` printed on write-nothing routes with no `never` guard: `logs-decision-none-in-notes`, `-notes-missing`, `logs-extract-refused` (S01–S03);
     - `Appended:` printed on a refusal: `logs-action-unknown` and `-closed` (S04);
     - `logs-no-workstream-log`'s guard `"^- MTG-01"` is dead, because route regexes are compiled with `i` only (`:523-526`; W06).
   - **Fix:**
     - grade ids, roles and dates as structure (for example `A-01.*client ops lead.*2026-10-16` on one line);
     - use literal skill text only where the references prescribe it;
     - add `never: ["DONE: "]` / `["Appended:"]` to every write-nothing and refusal route;
     - compile route regexes with `m`;
     - make the R1-4 test strip ids, paths and dates before requiring that what is left appears in the skill text.
2. **[m] m1: plain our-side wording still slips.**
   - The held-out set's four misses are all plain ("my normal hourly figure", "priced … below our usual level", "billable on my side", "the quote I gave you was too low").
   - My new set misses five plain sentences (A02, A04, A06, A09, A19).
   - Repro: `node h/run-untuned2.mjs`.
3. **[m] m2: the O1 key rule (`check-skill-contracts.mjs:704-729`) has bypasses and one false positive.**
   - `trigger_confirmed` and `history` are accepted (K03, K04): ow-build documents their person-bearing values ("confirmed by <user>", "recorded by <user>") away from the template line. The run-level people check still catches the user's name.
   - Planned producers' `retainer`, `hours_used` and `subtotal` are accepted (K05–K07). The value check starts only once the producer is built, and `hours` is not on the list.
   - The date key `send_by` is refused by `(?:^|_)by(?:_|$)` (K09).
4. **[m] m3: the body trim dropped `/ow-status`'s 1.0.0 column rule.** "client · last step · next · awaiting, with its date" and "workstream · item · owner role · due" are gone from every file. `SKILL.md:188` now says only "two tables", and that line is unpinned (T06).
5. **[m] m4: index comparison edges.**
   - `numbersIn` skips 1900–2100 as years, so a 2,000.00 change order shown as "(2,000)" passes (X01; probe `logs-zz-eval2-price2000`).
   - False positives: the family's own disclaimer "not verified by this skill" matches a five-word run of `acceptance_note` (X10); a client figure of 450 on a decision line matches a change-order price (X11).
6. **[m] m5: handling, partly graded.** Asking again in other words passes on read-back (H04). Asking again when `profile.md` holds the value is graded in no case, because `checkHandling` only fires on a logs-recorded value or `handling.asked` (H06).
7. **[m] m6: phone shapes.** "5125550199" and "+44 20 7946 0958" slip, though `self-checks-logs.md` says "in any shape".
8. **[m] m7: description headroom.** 1,007 of 1,024 characters after restoring the trigger phrase. S1–S3 can add no trigger words without a trim.
9. **[m] m8: evaluation ids in shipped skill text.**
   - "(round 1 m5)" appears in `phase-log-meeting.md:7`, `phase-log-decision.md:7` and `logs-status-and-index.md:9,16`, and the pins lock it in.
   - "`check-skill-contracts` refuses one" (`logs-status-and-index.md:37`) names a repository script that the shipped skill does not have.

### OWNER-DECISIONs

None new. R1-1 to R1-4 are recorded in the contract, the changelog and the README. The only owner-facing point is D1′, an implementation gap against R1-4, not a new question.
