## OW-09 (Sprint R) — Evaluation Round 2

**Sprint:** ow-research 1.0.0, plus ow-build-plan 1.1.0 (amendment P5). Contract: `sprints/release-2.1/ow-09/contract.md`.
**Branch:** `claude/ow-09-ow-research`, head `c21483bb`. Commits since round 1:
- `3a6e76e7`: the round-1 report;
- `87f1000a`: the security re-check;
- `b6de3477`: the fixes;
- `c21483bb`: merges #633 and #634.

**Byte-identity base:** `64cddc1d`, the merge base (#634). `origin/main` has since moved on to `c9c16c48` (#635, ow-uat 1.0.1). The branch needs that merge before landing; this is a note, not a defect.
**Evaluator:** independent Evaluator, oc-app-architect Phase 6.
**Date:** 2026-10-19.

**Standard applied:** the same as round 1 (D1, D2, R1-4, severity), plus the owner's decisions of 2026-10-19 on my round-1 OWNER-DECISIONs:
1. The watch block prints only its absent-case line.
2. The our-figures check also runs on `findings.md`.
3. The our-figures rules are narrowed:
   - a query said as ours is blocked;
   - an exact non-round match to one of our figures is blocked;
   - a round coincidental match triggers a confirm prompt;
   - the generic shape rules no longer apply to market queries.
4. Keep-out also covers the client's own customers and suppliers.

The §8.1 residuals are accepted in writing.

**The evaluation cap (2026-10-19):** after round 2, a major defect confined to the acceptance checker moves to the follow-up PR. Majors of that kind are marked **CHECKER-ONLY**.

**Where I worked.**
- `<E>` = `scratchpad/eval-ow09-r2`.
- `<E>/tree` (detached at `c21483bb`) and `<E>/base` (detached at `64cddc1d`). Each had `npm ci --ignore-scripts` run at the root and in `site/`. Both were removed at the end.
- The Generator's worktree was not touched.
- Temporary fixture cases (`zz-*`) were created and removed inside the same scripts. `git status --porcelain` was empty after the build, after the tests and after the probes.
- **The harness, in `<E>/h/`:**
  - round 1's scripts, copied unchanged and re-run (outputs in `r1rerun/`, `untuned.out`, `untuned-conf.out`, `fp-probes.out`, `url-probes.out`, `malformed.out`, `resume-probes.out`);
  - `untuned-set-r2.mjs`, written before I read the round-2 rules, with `run-untuned-r2.mjs`;
  - `plants-r2.mjs` and `plants-r2b.mjs`;
  - `fixture-probes-r2.mjs` and `probe-r07.mjs`.

### Code Scores

| Criterion | Weight | Score | Justification |
|---|---|---|---|
| Functionality | 30% | **8/10** | **Both round-1 majors are fixed in the text.**<br>• Resume is one rule in both references, with one step name. Ten untuned resume scenarios came out 10/10 as expected.<br>• An approval line now names the approved ids and carries `human-decided:`.<br>**The owner's four decisions are implemented:**<br>• the narrowed our-figures rules, with a confirm prompt for round figures;<br>• the check over `findings.md`;<br>• customers and suppliers on `keep_out`;<br>• a one-line watch block.<br>**Also:** the handling level is read from `intake.yaml` and `plan.yaml`, and P5 refusals have prescribed words.<br>**Text minors:**<br>• "and nothing else" on refusal screens collides with protocol step 0;<br>• "round" is not defined the way the checker defines it;<br>• the plan screen's "these lines and no others" leaves no room for the confirm prompt. |
| Feature Completeness | 30% | **8/10** | **Delivered:**<br>• 73 ow-research goldens, including cut after approval, cut mid-requests and cut after checks;<br>• all 110 of my round-1 plants made permanent;<br>• a new held-out set;<br>• P5 refusal screens graded;<br>• framework self-checks graded;<br>• the 9 extra credential formats.<br>**Missing:**<br>• the confirm-prompt path has no golden run;<br>• a P5 refusal that appends a STATUS line is not caught. |
| Code Quality | 20% | **6/10** | **Strong:**<br>• every valid round-1 plant is caught (103/103);<br>• untuned query leaks 17/20 as expected, market 20/20, `findings.md` slips 10/10 with 0/10 false positives, resume 10/10;<br>• URL rule 20/20 and 10/10;<br>• malformed files 9/9.<br>**But:**<br>• the new "prescribed lines only" screen check fails every protocol-compliant refusal screen that opens with the step-0 echo (M3, CHECKER-ONLY);<br>• the our-side check in `findings.md` reads citation ids such as `[F-01]` as our figures, which gives false positives;<br>• approval lines written with "declined Q-02" or "but not Q-02" approve Q-02;<br>• a cap increase of +N is not compared with what the batch showed;<br>• one change (R2-07) reopens a gap in the 26-word rule. |
| UX (clarity for person and model) | 20% | **7/10** | Body 3,339 tokens (1,161 of headroom). Description 828 characters. The confirm prompt fires on 5 of 20 untuned market queries: 5 of the 8 that carry a round price, all of them real coincidences with round price-book figures. That is acceptable, but frequent on pricing topics. **Against:**<br>• the watch line is a second "IF IT IS NOT AVAILABLE:" line straight after the NEXT block's own, so it reads as that block's absent case (nit);<br>• the step-0 conflict above. |

**Weighted Code Score:** 0.3×8 + 0.3×8 + 0.2×6 + 0.2×7 = **7.4 / 10**

**Verdict: FAIL.**
- Every criterion is at least 6, but one major remains: **M3, CHECKER-ONLY**. The new `only` screen check rejects the protocol's step-0 echo, so every protocol-compliant refusal or no-op screen on 16 routes fails. The ow-start goldens print that echo (`Step 0. Newest STATUS line: …`), and `ow-start-logs-acceptance.mjs:621` already exempts it.
- M1 and M2 from round 1 are fixed.
- Under the evaluation cap, M3 is checker-only, so after this round it moves to the follow-up PR. If the owner applies the cap now, nothing else blocks a PASS at 7.4. The fix is small: exempt the step-0 lines, as ow-start does, and say "after step 0's lines" in the phase files.

### Test Results

| Run | Result |
|---|---|
| `gen-skills-catalog` / `check-skill-contracts` / `lint-internal-refs` | exit 0 / 0 / 0. The ow catalog validates 5 skills |
| Acceptance | ow-research **73**, ow-build-plan **36**, ow-start **54**, ow-start-logs **50**, ow-build **55**, ow-uat **140**. Every script exits 0 |
| `npx vitest run` (full, once, after the build) | 142 files: **6,728 passed, 14 skipped, 0 failed**. No `.skip`, `skipIf` or `todo` added in the diff from `64cddc1d`. The base has the same 10 files with skips |
| OW-09 files (verbose) | `ow-research-eval-r1` 167, `ow-research-plants` 202, `ow-research-acceptance` 107, and `ow-build-plan-acceptance`: 615/615 in total |
| `npm run build` | exit 0. `git status --porcelain` before and after the build and the tests: empty |
| oc- byte-identity vs `64cddc1d` | 1,473-line manifests, **identical** |
| Body / description | **3,339** tokens / **828** chars. ow-build-plan body 4,342. Protocol copy byte-identical |
| Not verified | `npm run evidence:pr` and the per-commit verifier |

### Generator claims, verified

| Claim | Verdict |
|---|---|
| M1: approvals read by id, require `human-decided` (A:1309/1314/1408), cap raised only after a shown batch (A:1498) | **True.** `approvalIds` reads the ids; the go must be a `human-decided:` line; `checkCaps` credits a cap increase only after a `marker: batch`. A12, A13, A14, S04b, V02, V05 and V06 are caught. **Residuals:** see m1 and m2 below: a decline phrased "declined Q-02" or "but not Q-02" counts as an approval (V03, V04), and the size of a cap increase is not compared with what the batch showed (V07). A forged `human-decided:` line, or a self-confirmation, cannot be told from structure (V01, W05): that is D2, and not a defect |
| M2: one resume rule (A:1296/2013/2056) and three new goldens | **True.** `RESUME_STEPS` uses the text's step names. A resume at `requests` sends the approved requests not yet logged and checks they all go out. Re-sends are refused. The goldens pass. My round-1 probes: ZC1 and ZC2b now pass (apart from my old key naming `requests done`), ZC1b fails on the unknown step name, and ZC2 fails correctly because its approved Q-02 is never sent. Untuned resume: 10/10 |
| Our figures by value (A:727/746/757/767/1596/1600/1248) | **True for the owner's rule:**<br>• attributed queries are blocked;<br>• exact non-round figures are blocked;<br>• round figures ask unless a `figure confirmed` line, human-decided, comes before the search;<br>• market queries with others' figures pass;<br>• words with a currency word ("two thousand dollars"), "900-dollar" and "2k" are read.<br>**Gaps:** numbers in words with no currency word (Q13, Q14), and m3 below |
| Watch line (A:101/1198) | **True.** The screen must carry `WATCH_LINE`, and any `ow-currency-watch` text fails (U02 caught). A promise in other words passes (U01, minor) |
| m1–m11 and R2-01/02/04/06/07 | **True as each was raised.** Re-run of my round-1 plants: 94/94 and 9/9 valid, all caught. J04, J05 and J10 no longer apply, because the THEN block is gone; the Generator restated them. S07 was withdrawn. My new edge probes are below |
| All 110 of my plants permanent (`tests/ow-research-eval-r1.test.js`) | **True.** All 110 ids are present; S07 is kept as a pass; there are no skips |
| Held-out `tests/ow-research-heldout-our-figures.mjs`: 20/20 blocked; market 0 blocked, 7 asked, 13 passed | **True** (pinned, and the test passes). The SR-07 set is now 5 refused, 5 asked and 8 passed of 18, which §8.1 accepts in writing |
| 6,728 tests pass / 73 goldens / body 3,339 | **True / True / True** |
| OWNER-DECISION 1 as built (the ow-currency hand-off row removed from the edges file) | **Acceptable.**<br>• `findings.md` still carries `watch` and `watched passage`, and the C17 test pins both (`tests/ow-research-acceptance.test.js:364-366`).<br>• `/ow-currency-watch` stays in `plannedVerbs`; `catalogs.json`'s comment says why, and the edges file has a comment marking where the row returns.<br>• No screen line names the verb.<br>• Reciprocity is checked when ow-currency lands in v2.2, which will bump ow-research anyway.<br>• Nit: the 1.0.0 summary in ow-research's CHANGELOG (line 12) still says the NEXT blocks name ow-currency's verb. A later bullet corrects it |

### New untuned set (`h/untuned-set-r2.mjs`, written before the round-2 rules)

| Set | Size | Result |
|---|---|---|
| Query leaks (attributed, exact, in words, keep-out including a customer, people, client spans) | 20 | **17/20 as expected:**<br>• blocked 14;<br>• asked 3: Q10 (900), Q11 ("two thousand dollars"), Q12 ("fourteen thousand dollar");<br>• passed 3:<br>  – Q09 "extra tester role 250 user testing price", where "250 user" reads as a count; my wording, so accepted;<br>  – **Q13** "one point two five times markup …";<br>  – **Q14** "a hundred and seventy five per UAT session …". Both are exact non-round figures in words with no currency word (m3) |
| Market queries, 8 with round prices | 20 | **20/20 as expected:** 0 blocked, **5 asked** (M03 $600, M04 $2,000, M12 $1,000, M14 3000, M18 $1,500, all real coincidences with round price-book figures), 15 passed. Includes "is $50 an hour normal…", "30% margin…", "1.5x…", "500 products…" and a competitor's "$480 a month" |
| `findings.md` our-figure slips / legitimate sentences | 10 / 10 | **10/10 flagged / 0/10 false positives.** Note: F08 and F10 are flagged on a citation id read as "our price or cost ("01")", so the verdict is right for the wrong reason (m3) |
| Resume scenarios (cut after plan, after approval, mid-requests with failed P-03, re-sent page, re-sent query, after requests, reopen after sources, unapproved batch, after findings, after checks) | 10 | **10/10 as expected.** R01, R03, R04 and R05 used temporary fixture cases; R07 was a plant on `run-cut-after-sources`; R08 is X07; R02, R06, R09 and R10 are the goldens |

**Round 1's sets, re-run on round 2:**
- Leaks 25/25; legitimate queries 0/25 false positives.
- Sentences in the generic description: 10/10 caught, 0/10 false positives.
- `findings.md`: 10/10 caught, 0/10 false positives (it was 0/10 in round 1).
- Confidence: 14/15, with K10 being the documented SR-03 departure.
- Round-1 targeted market set: 0/12 blocked. 2 now ask (M04 $1500 and M06 $600, both real round coincidences, which is the owner's rule); round 1 had 5 false positives.
- Our figures in other forms: 6/6 now ask. All six are round, so the owner's rule makes asking the right outcome.
- The round-1 shape probe H01 ("estimate 40 hours … 35% margin", not attributed) now passes, as the owner decided.

### Plants (round 2)

| Batch | Items | Result |
|---|---|---|
| `plants-r2.mjs`: approval bypasses, the confirm path, resume re-sends on the new goldens, R2-02/04/06/07, the watch line, P5 refusal screens | 30 P + 6 FP | **21/28 caught.** V01 and W05 are excluded: a forged `human-decided:` line, or a self-confirmation, cannot be graded on structure (D2); the session edit each one needs is caught as a write (R2-02). Missed: V03, V04, V07, W02, U01, U05, Y07. **FP: 1/6 pass** (W01, the proper confirm path). Y05 and Z01–Z04 fail |
| `plants-r2b.mjs`: the protocol's step-0 echo on refusal and no-op screens | 6 FP | **1/6 pass** (the success route). T01–T05 fail (M3) |
| `fixture-probes-r2.mjs`: resume R01/R03/R04/R05; handling H1–H4 | 8 | Resume 4/4 as expected. Handling **1/4**: H1 (a level only in `plan.yaml`) is caught; H2, H3 and H4 are not (m6) |
| `probe-r07.mjs` | 1 P | Caught |

**Totals:** 36 must-catch, 26 caught. 13 legitimate runs or edits, 3 pass.

### Criteria C1–C26

| # | Verdict | Evidence |
|---|---|---|
| C1 | **PASS** | Catalog and contracts green. Writer plants hold. `writes_nothing` on refusal routes (A03 and A07 now caught) |
| C2 | **PASS** | 3,339 ≤ 4,100. 828 characters. No `allowed-tools` |
| C3 | **PASS** | Unchanged and green |
| C4 | **PASS (gaps)** | Every matrix cell has a golden, plus the three new cut points. Screens: see C20 |
| C5 | **PASS (gaps)** | M1 fixed. Residuals: decline phrasing (V03, V04) and the size of a cap increase (V07) (m1, m2) |
| C6 | **PASS (gaps)** | The union now includes `intake.yaml` and `plan.yaml` (H1). Edges: a follow-on plan folder, an unparseable `intake.yaml` (the text says to treat it as a level set), and a key in another case (m6) |
| C7 | **PASS** | 20/20 refused and 10/10 allowed. `underPrefix` no longer takes in sibling paths |
| C8, C9, C11 | **PASS** | Round-1 plants hold. New injection fixtures `sec-r2-inj-*` |
| C10 | **PASS (gaps)** | The narrowed rule is implemented as decided. The confirm path has no golden, and W02 (confirmation after the approval) passes (m4). Numbers in words without a currency word are missed (m3) |
| C12 | **PASS** | `user file` is no longer a standing (F05 caught). Multi-tenant hosts are recognised. One false positive: an owner on a per-tenant subdomain (Y05, m5) |
| C13 | **PASS** | The splitter fix holds (K05, K06) |
| C14 | **PASS (gaps)** | R2-07 makes each quote its own span, so two adjacent quotes that copy 40 words in a row pass (Y07, m7) |
| C15 | **PASS** | K01–K03 caught. Nine vendor formats added |
| C16 | **PASS** | "authoritative" and "to follow" are now caught (I04). Framework self-checks are graded (S01, S03b) |
| C17 | **PASS** | The ow-currency row was removed by owner decision (acceptable, as above). The schema keeps the fields, and a test pins them |
| C18 | **PASS (gap)** | P5 refusal screens are prescribed and graded (U03, U04 caught). A STATUS line appended on a refusal passes (U05, m8) |
| C19 | **PASS** | M2 fixed. Resume 10/10. Re-send plants X01–X07 and R07 caught |
| C20 | **FAIL (M3, CHECKER-ONLY)** | `only` catches success claims (A10, A21, A33, J01, J02 now caught) but rejects the protocol's step-0 echo on 16 routes (T01–T05). A promise of ow-currency in other words passes (U01, minor) |
| C21 | **PASS** | Framework keys run `self_checks` and `handling`. Waivers are refused |
| C22, C23 | **PASS** | A17 caught. Malformed files 9/9, no crash |
| C24 | **PASS** | 110/110 of my plants are permanent tests, with no skips. The Generator's plants file grew to 202 tests |
| C25 | **PASS** | oc- identical. All acceptance scripts green. 6,728 tests. Fence test green |
| C26 | **PASS** | Both CHANGELOGs updated (the 1.0.0 summary nit above). Build notes §12.1c and rows 30–38. §8.1 owner acceptance recorded |

### Defects (round 2)

**[M] M3 (CHECKER-ONLY): the "prescribed lines only" screen check rejects the protocol's step-0 echo.**
- **Where:** `scripts/ow-research-acceptance.mjs:1204` (`if (s.only) for (const l of lines…)`) checks every non-empty line of a refusal or no-op screen against the key's `only` list. Nothing exempts step 0.
- **Why that is wrong:** protocol §3 step 0a has every verb quote the newest STATUS line and every awaiting line, and 0b adds a one-line notice for a stored "no". The family's goldens print it: `tests/fixtures/ow-start/logs-action-done/expected/printed/action.md` opens with `Step 0. Newest STATUS line: …`. The sibling checker exempts it (`scripts/ow-start-logs-acceptance.mjs:621-623`).
- **Reproduce (`plants-r2b.mjs`):** that one line prepended to the golden screens of `on-unknown` (T01), `run-unconfirmed` (T02), `framework-unknown` (T03, with the stored-"no" notice), `question-no-workstream` (T04) and `run-awaiting-approval` (T05) fails `screen` with "not one of this route's prescribed lines". The success route without `only` (T06) passes.
- **Effect:** a real, protocol-compliant run fails on every one of the 16 keys with `only`. C20 cannot grade real refusal screens.
- **Fix:** exempt lines starting `Step 0` (the family's convention), or the step-0 echo, awaiting lines and stored-"no" notice in their prescribed forms. Add T01–T05 as permanent false-positive tests. The text side is minor m9.

**Minor:**
1. **[m] m1: approval lines are parsed loosely** (`approvalIds`, `:1309`). Every id before a "(" or ";" counts as approved:
   - "human-decided: the user approved Q-01, declined Q-02" (V03) and "…approved Q-01 but not Q-02" (V04) both approve Q-02, which is then sent and passes;
   - the prescribed form (`(Q-02 declined)`) is graded correctly, but the checker does not enforce that form;
   - **fix:** accept only the prescribed form, or treat "declined", "not" or "except" before an id as a decline.
2. **[m] m2: the cap increase N is the line's own word** (`checkCaps`, `:1500`). A batch that showed one extra page, approved as `past the cap: +5`, allows 10 page requests at quick depth (V07). Compare N with the requests the batch listed.
3. **[m] m3: our side, residual precision and recall.**
   - **In `findings.md`** (`findingsOurSide`, `:1600`): a line with "we", "our", "I" or "my" plus a price word is flagged because `/\b\d[\d,.]*\b/` matches citation ids (`[F-01]`, `P-04`). Natural Answer sentences are therefore false positives:
     - Z01 "We could not find a published price for the partner tier [F-03].";
     - Z02 "Our search found no price list for the add-on [F-02].";
     - Z03 "…the cost of a higher tier is not published [F-02].".
     The reported hit is "01". Two of my untuned slips (F08, F10) were caught the same way, for the wrong reason.
   - A vendor's published price that exactly equals one of our non-round figures, in a claim, is flagged too (Z04: "175 dollars").
   - **Queries:** exact figures in words with no currency word pass (Q13, Q14).
   - **Fix:** strip `F-nn`, `S-nn`, `P-nn` and `Q-nn` ids before scanning.
   - The hit text for "our hourly rate $95" is "$9", which is cosmetic.
4. **[m] m4: the confirm-prompt path has no golden.**
   - No fixture runs `Q-nn: <figure> matches…` through `marker: figure confirmed` to the search. Only the negative case is tested.
   - A confirmation written after the plan's approval (the text says before it) passes (W02, `figureConfirmed` `:1596` checks only "before the search").
   - The plan screen's prescribed lines (`phase-run.md` §2.3, "these lines and no others", and `run-awaiting-approval`'s `only`) leave no room for the prompt line.
   - "Round" is not defined the same way twice: the text says "a whole number such as 500, 1,200 or 3,000", while the checker says at most two significant digits, so 95 is round and 175 is not.
5. **[m] m5: owners on a per-tenant subdomain of a shared platform are refused** (Y05: `quillfeather.readthedocs.io`). `ownerProblem` treats every subdomain of `SHARED_PLATFORMS` as a platform root. `phase-question.md` §2.7 only forbids the platform's root (`github.com`). Adding a path works around it.
6. **[m] m6: handling-level edges** (`handlingLevels`, `:1651`):
   - a level recorded only in a follow-on plan's `plans/<client>-2/plan.yaml` is not read (H2);
   - an `intake.yaml` that does not parse yields no level, while the text says "Treat it as a level set: send nothing, and ask" (H3, which is checker against text);
   - a `Handling:` key is not read (H4, nit).
7. **[m] m7: R2-07 reopened the 26-word span rule.** Each quoted line is now its own segment (`overlapSegments`), so two adjacent quotes of one source that together copy 40 words in a row of the page pass (Y07). C14 says no file holds a span of more than 25 words. Join adjacent quotes from the same source before the overlap test.
8. **[m] m8: a P5 refusal may append STATUS.** `checkResearchRefused` (`ow-build-plan-acceptance.mjs:1401-1402`) ignores `STATUS.md`, but `phase-collect.md` §5 says "write nothing" (U05).
9. **[m] m9: text.** Refusal phases say "and nothing else" or "print nothing else" (`phase-question.md` §1, `phase-framework.md` §1–2, `routing-and-resume.md` §3, `phase-run.md` §1), without saying that the protocol's step-0 lines come first. Pairs with M3.
10. **[m] m10: a promise of ow-currency in other words** ("ow-currency will compare the watched page for you on a schedule") passes on the success screen (U01). Only `ow-currency-watch` is refused.

**Nits:**
- The watch line is a second `IF IT IS NOT AVAILABLE:` line straight after the NEXT block's own, so a reader may take it as part of that block.
- ow-research's CHANGELOG 1.0.0 summary (line 12) still says the NEXT blocks name ow-currency's verb.

### OWNER-DECISIONs

None new. One item on the cap: M3 is CHECKER-ONLY. If you apply the 2026-10-19 cap from this round, M3 and the minors move to the follow-up PR, and the gate is otherwise met (7.4, every criterion ≥ 6). If not, round 3 needs only the step-0 exemption.
