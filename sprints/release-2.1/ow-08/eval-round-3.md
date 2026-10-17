## OW-08 (Sprint L) — Evaluation Round 3 (final before escalation)

**Sprint:** ow-start 1.1.0, meeting and decision logs (contract `sprints/release-2.1/ow-08/contract.md`, with owner decisions R1-1 to R1-4) · **Branch:** `claude/ow-08-ow-start-logs`, head `1f8bcb5f` (commits `edff1534` = the round-2 report, `1f8bcb5f` = the fixes) · **Byte-identity base:** `d61b2a3a` (main; no new merge since round 2) · **Evaluator:** skeptical Evaluator, oc-app-architect Phase 6 · **Date:** 2026-10-17

**Standard applied** (unchanged from rounds 1 and 2):
- **D1:** an internal number is OUR side only.
- **D2 / O8:** meaning checks are a regression net plus the skill's self-check. A plain-wording slip is a minor defect; an idiom is accepted. False positives become controls.
- **R1-4:** screens are graded on prescribed text and structure only. `never` and `must_not` guards may be any regex.
- **Severity:**
  - **[M] major:** a mechanical check that gives the wrong verdict on a realistic run in a way that defeats its criterion, or skill text that goes wrong on a main path.
  - **[m] minor:** a gap or false positive in a meaning net, a thin screen guard that R1-4 limits, an edge case, or drift.
- **Expected, not graded:** O4 (the ow-tools hook) waits on OW-03, and the rebase onto OW-04 has not happened.

**Where I worked.**
- `<E3>/tree` is a detached checkout of `1f8bcb5f`; `<E3>/base` is a detached checkout of `d61b2a3a`. Each had `npm ci --ignore-scripts` run at the root and in `site/`.
- The Generator's worktree was not touched.
- The round-1 probe cases sat in my tree's fixtures while they ran and were removed afterwards; the tree's git status is empty.
- Harness:
  - `<E3>/h1/`: round-1 `plants.mjs`, `untuned.mjs`, `malformed.mjs`;
  - `<E3>/h2/plants2.mjs`: round 2's, with its probe case now pointed at the Generator's `logs-log-index-price2000` golden;
  - `<E3>/h/`: `untuned3.mjs`, `run-untuned3.mjs`, `plants3.mjs`, `fp3.mjs`.
  - Results: `r1-*.out`, `r2-*.out`, `untuned3.out`, `plants3.out`, `fp3.out`, `plants3-results.json`.
- Both worktrees are removed.

### Code Scores

| Criterion | Weight | Score | Justification |
|---|---|---|---|
| Functionality | 30% | **8/10** | No new skill-text defect. The round-2 text fixes hold:<br>• the `/ow-status` columns are restored, with framing words changed;<br>• no evaluation ids or script names remain in shipped text;<br>• the waiver screen's words are prescribed (`self-checks-logs.md:5`).<br>Every rule a model follows (never guess, handling, the decline, dedupe, self-checks, the index) is in the references and pinned. |
| Feature Completeness | 30% | **8/10** | Delivered:<br>• 50 logs goldens, including `logs-log-index-price2000`;<br>• all 72 round-1 and all 55 round-2 evaluator items made permanent;<br>• two held-out sets;<br>• pins for every moved paragraph;<br>• 892 OW-08 tests, with no skips.<br>Missing: screen guards on refusal routes, and self-check and NEXT-block structure in most keys (m1). |
| Code Quality | 20% | **6/10** | Mechanical checks are strong:<br>• file-level STATUS, writes, write-once, the index by value, the O1 key rule;<br>• 12 malformed probes fail per check;<br>• untuned rates are good: plain our-side 14/17, 0/20 false positives on legitimate sentences, people 10/10, private names 10/10.<br>Weak:<br>• screen grading catches **3 of 17** wrong-screen plants (m1);<br>• the new our-side rules flag **11 of 18** targeted legitimate scheduling sentences (m2);<br>• 10–11-digit order ids count as phone numbers (m5);<br>• a question about "restricted" goods trips the handling check (m4);<br>• "of 2000" and "up to 2000" are read as years (m3). |
| UX (clarity for person and model) | 20% | **8/10** | Body 4,011 tokens (489 of headroom, which meets R1-1). Description 857 characters, keeping all six trigger phrases. The text a screen must show is listed in one place (`tests/ow-start-logs-acceptance.test.js:245`) and tied to the file that prescribes each item. |

**Weighted Code Score:** 0.3×8 + 0.3×8 + 0.2×6 + 0.2×8 = **7.6 / 10**

**Verdict: PASS.** Every criterion is at least 6, and no major defect remains. Round 2's major (D1′) is fixed in both directions: all 7 rewordings pass, and the `DONE:` and `Appended:` guards work. The residuals are checker precision and recall gaps of the D2/O8 kind, plus screen guards limited by R1-4. They are listed below for the regression net before REL-02. The most important one is m1: screen grading still lets several wrong screens pass. OWNER-DECISION 1 says how to close it.

### Test Results

| Run | Result |
|---|---|
| `gen-skills-catalog` / `check-skill-contracts` / `lint-internal-refs` | exit 0 / 0 / 0 |
| `ow-start-acceptance` | exit 0: 54 golden runs (4 intake + 50 logs) |
| `ow-start-logs-acceptance` / `ow-build-plan-acceptance` / `ow-build-acceptance` | exit 0: 50 / 32 / 54 |
| `npx vitest run` (full) | 130 files, **3,556 passed, 9 skipped** (the skips predate this branch), 0 failed. The OW-08 files: 892 passed, 0 skipped |
| `npm run build` | exit 0 (`@ 1f8bcb5f`); `git status --porcelain` empty |
| oc- byte-identity vs a build of `d61b2a3a` | `snapshot.sh` manifests, 1,473 lines, **identical** |
| Body / description | **4,011** tokens (cap 4,500) / **857** chars (limit 1,024) |
| Not verified | `npm run evidence:pr`; the per-commit verifier |

### Generator claims, verified

| Claim | Verdict |
|---|---|
| D1′ | **True for what round 2 raised:**<br>• `checkRoute` (`scripts/ow-start-logs-acceptance.mjs:536-557`) grades `says`/`ask` as prescribed text and `tokens` as structure on one line;<br>• the step-0 line is excluded (`:567`);<br>• `never` is compiled per line with `m` (`:550`);<br>• `writes_nothing` routes fail on a `DONE:` or `Appended:` line (`:552-555`);<br>• the enforcing test ties 41 prescribed texts to their files (`tests/…acceptance.test.js:245`) and refuses golden wording.<br>My round-2 S01–S04, S06–S11 and W06/W07 now behave as expected. **But** structure alone cannot tell a refusal from a false success, and most keys grade no self-check line or full NEXT block (m1) |
| m1 our-side rules (`:317`), ratio fix (`:292`) | **True.** 28/28 and 22/22 plain on my earlier sets; the round-2 misses A02, A04, A06, A09 and A19 are caught. The ratio carve-out works ("Your price list goes up by about 5%" passes). The new rules over-fire on scheduling sentences (m2) |
| m2 key rule | **True.** `approved_by`, `trigger_confirmed`, `history`, `retainer`, `hours_used` and `subtotal` are refused; `send_by` passes (`check-skill-contracts.mjs:725-760`). Residual: `charge`, `time_spent`, `minutes_used`, `signatory` and `overage` from planned producers are accepted, and a planned producer's `review_by` is refused (m6) |
| m3 `/ow-status` columns restored word for word and pinned | **True for the columns; the framing changed.** The 1.1.0 wording "…awaiting, with its date) and open logs items (workstream · item · owner role · due), by the same rule" became "a table of open intakes (…) and one of open logs items (…), each from the newest line per item". Both column lists are identical, and both pins are present. Nit only |
| m4 attribution and date-context year | **Mostly true.** "(2,000)", "(2000)", "2,600 USD", "2.6k", words, 6,980, a five-word phrase and the user's name are all caught. The disclaimer, the coincidental 450 and "orders since 2025" pass. **Gaps** (m3): "a fee of 2000" and "up to 2000" read as years; an amount on its own line with no money word passes; a money word next to a client figure on an own-decision line is flagged |
| m5 handling | **True.** Asking again in other words, or when `profile.md` or `intake.yaml` holds the value, now fails in all 50 keys. **Gaps** (m4): a paraphrase without "?" passes; an open question mentioning "restricted" is a false positive |
| m6 phones | **True.** 10 digits and international numbers are caught (my round-2 C03 and C11, round-3 J02–J04). **False positives** (m5): `1000234567` (an order id) and `20261013001` (a batch id) |
| m7 description | **True.** 857 characters; all six quoted trigger phrases and every verb kept. "Due within one business day" and "it names a path, never a price" left the description; the body keeps both facts |
| m8 jargon | **True.** No "round N" or script names in shipped text. `skill.edges.yaml:3`'s comment naming `check-skill-contracts` predates OW-08 (#605) and is metadata, not instructions |
| Body 4,011 tokens | **True** |
| Round-2 plants 42/42 and 13/13; S05 allowed | **True** (55/56, with S05 the allowed one) |
| Held-out r3: our side 9/15 → 13/15; false positives 1/15 → 0/15 | **True as measured (13/15, 0/15).** "Our team spent the whole of Wednesday rebuilding the import." is **plain** (our effort, named): a minor defect (m2); the new span rule only knows "I"/"we". "This phase is not paying for itself on our side." is **implied** ("paying for itself" is an idiom): accepted |
| 3,556 tests pass | **True** |

### Harnesses from rounds 1 and 2, re-run

| Harness | Result |
|---|---|
| Round-1 `plants.mjs` | **72/72** |
| Round-1 sentence sets | Plain our-side 28/28; U28 and U30 the accepted idioms; legitimate 0/30 false positives; names 12/12, controls 0/15; private names 12/12 (through `privateNameFindings`), controls 0/5; STATUS 12/12 legitimate, 14/14 bad caught |
| Round-1 probes | `declined` passes, the run that asks again fails; `moveback` passes |
| Round-1 malformed | 7/7 fail per check |
| Round-2 `plants2.mjs` | **55/56** (S05 the allowed one) |
| Round-2 sentence sets | Plain 22/22; implied 0/3 (accepted); legitimate 0/22; names 11/11, controls 0/10; private names 11/11, controls 0/5 |

### New untuned set (`h/untuned3.mjs`, written before reading the round-3 rules)

| Set | Size | Result |
|---|---|---|
| Our side (must flag) | 20 (17 plain, 3 implied) | **15/20.** Plain **14/17 (82%)**; implied 1/3 (G19 "in the red" caught; G18 and G20 accepted) |
| Legitimate client effort, scheduling, figures, terms (must pass) | 20 | **0/20** false positives (follow-up and people). Includes "Your team spent two full days counting stock", "Your packers worked through the weekend", "Your day rate for the pottery class", "Your price list goes up by 5% in January" |
| People names (must flag) | 10 | **10/10** (three phone shapes, an honorific without a period, `<Name> from <Org>` mid-sentence, a two-name `cc:`) |
| People controls | 8 | **0/8** false positives ("Order 1042", "Version 2.1", "cc: the bookkeeper", "Glaze orders from Amaco") |
| Private names | 10 | **10/10**; controls 0/5 |

Plain our-side misses:
- **G07** "The work took us twice as long as we planned." An overrun against our own plan, in plain words: a defect (m2).
- **G17** "The developer spent most of Monday on the sync on our side." Our effort, with an explicit "on our side": a defect (m2).
- **G13** "I worked through the weekend on the order view." Labelled plain before I read the rules, but it is the same class as round 1's U30 ("I worked late on Sunday"), which was accepted as implied. For consistency it is **not** counted as a defect.

### New plants (`h/plants3.mjs`: 35 items; `h/fp3.mjs`: 21 sentence probes)

| Area | Result | Notes |
|---|---|---|
| Wrong screens on the prescribed-text grading (V01–V17) | **3/17 caught** | Caught:<br>• V15, a wrong STATUS line in the file;<br>• V16, an `Appended:` line on screen that contradicts the file;<br>• V17, the "say it again" line dropped.<br>**Slip** (m1):<br>• V01/V02: a refusal route (`logs-action-unknown`, `-closed`) passes a screen claiming success ("A-09 marked done") with no `Appended:` prefix. Round 1's `says: Refused` had caught this, and R1-4 removed it because "Refused" is not prescribed text;<br>• V12: `logs-decision-none-in-notes` passes a screen that offers an invented "D1";<br>• V13: `logs-no-workstream-action` passes "A-01 is closed in larkspur-ceramics" next to the question;<br>• V14: `logs-fully-logged` passes a reprinted NEXT;<br>• V03–V06: no self-check line is graded on `-action` (4 of 5 goldens), `-prep-meeting` (all) or `-log`'s People by role and No private names, though `logs-status-and-index.md` §1.4 and §2 and `self-checks-logs.md:3` prescribe them;<br>• V07–V11: a wrong slash hint (prep-items, business-vendor), an extra wrong NEXT next to `NEXT: none`, a wrong `It will read:`, a dropped no-folder line. Only the say and `NEXT:` are graded in most keys; the slash hint in 2 keys, the no-folder line in 1, `It will read:` in none |
| Year in a date context (Y01–Y06) | 1/4 caught, 1/2 legitimate edits pass | Caught: "(2000)". Slips: "a fee of 2000" and "up to 2000" (`YEAR_BEFORE` treats "of", "to", "from" and "by" as date context); an amount alone on the next line with no money word. False positive: an own-decision line "your price list covers about 450 products" ("price" plus a coincidental 450). "since 2025" passes |
| Money-key rule (K01–K07) | 1/6 caught, 0/1 legitimate edits pass | Caught: `approved_by`. Slips, all from planned producers: `charge`, `time_spent`, `minutes_used`, `signatory`, `overage`. False positive: a planned producer's `review_by` is refused, because a `_by` key passes only when its built producer documents a date |
| Handling (HD1–HD3) | 1/2 caught, 0/1 legitimate edits pass | Caught: the protocol question asked though `intake.yaml` stores the answer. Slip: a paraphrase without "?". False positive: "Still open (Q1): are any glazes restricted for export?" on a log-meeting screen |
| Phone false positives (PH1–PH2) | 0/2 legitimate edits pass | `1000234567` (an order id) and `20261013001` (a batch id) in `notes.md` fail People by role, which can never be waived |
| Our-side false-positive probes (`fp3.mjs`, Q01–Q18, written after reading the rules) | **7/18 pass, 11 false positives** | Flagged:<br>• "Let's meet at our usual time on Thursday.";<br>• "Our time zone is US Central…";<br>• "Our days in the studio are Tuesday and Thursday…";<br>• "We'll add 20% more orders to the test set…";<br>• "We'll send the invoice separately…";<br>• "Your team's billable hours…";<br>• "Your team used up the spare boxes in two days, so we ordered more.";<br>• "We spent the morning at your warehouse…";<br>• "Your price list is too high for wholesale buyers, so we agreed…";<br>• "Our hours of support are 9 to 5";<br>• "…our time together was useful."<br>Three plain controls: 2/3 caught (R02 "Our team spent the whole of Wednesday…" slips) |

**Totals.**
- Round 3: 35 plants and 18 legitimate-sentence probes. 7 of 29 must-catch plants caught; 4 of 24 legitimate edits or sentences pass.
- Rounds 1 and 2, re-run: 127/128 items as expected; the one exception is S05, which is allowed.

### Criteria C1–C20

| # | Verdict | Evidence |
|---|---|---|
| C1 | **PASS** | Catalog and contracts green; writer plants hold (72/72) |
| C2 | **PASS** | 4,011 ≤ 4,500 (489 of headroom, R1-1); description 857 ≤ 1,024; protocol identical |
| C3 | **PASS (gaps)** | Money, note and person keys refused by name and by documented value anywhere in the producer's text. Planned-producer residue (m6) |
| C4 | **PASS (gaps)** | Every cell has a golden. Screens are graded on prescribed text and structure (R1-4) with no golden wording. Thin guards on refusal and no-op routes, and on self-check and NEXT details (m1) |
| C5–C9, C11, C14 | **PASS** | Round-1 and round-2 plants hold |
| C7 | **PASS (gaps)** | Plain recall 14/17 untuned and 13/15 held out; false positives on targeted scheduling sentences (m2) |
| C10 | **PASS (gaps)** | By value and attribution. "of/to 2000" and next-line gaps; one false positive (m3) |
| C12 | **PASS (gaps)** | 10/10 untuned, 0/8 false positives on controls. Order and batch ids as phone numbers (m5) |
| C13 | **PASS** | One rule source; 10/10, 11/11, 12/12 |
| C15 | **PARTIAL (expected)** | O4 waits on OW-03 |
| C16 | **PASS (gaps)** | Decline carried over; handling stored, asked once and never asked again in any of the 50 keys. The paraphrase without "?" and the "restricted" false positive (m4) |
| C17 | **PASS** | 12 malformed probes fail per check |
| C18 | **PASS** | Every evaluator item from rounds 1 and 2 is permanent; no skips |
| C19 | **PASS** | oc- output identical; intake goldens unchanged; sibling goldens green |
| C20 | **PASS** | Changelog records every round; pins |

### Defects (round 3)

No major defects.

1. **[m] m1: screen grading lets a wrong screen pass on refusal and no-op routes, and on self-check and NEXT details** (V01–V14). Structure alone cannot tell "Refused: A-09 has no line" from "A-09 marked done", and no `never` guard does it instead.
   - **Refusal routes:** `logs-action-unknown` and `-closed` pass a success claim. Round 1's `Refused` phrase caught this; R1-4 removed it, because the reference says "Refuse" but prescribes no screen word.
   - **No-op and question routes:** `logs-decision-none-in-notes` passes an invented decision offer; `logs-no-workstream-action` passes a claim that an action closed; `logs-fully-logged` passes a reprinted NEXT.
   - **Self-check lines:** graded on 1 of 5 `-action` goldens, no `-prep-meeting` golden, and only "Index copies nothing" on `-log`.
   - **NEXT blocks:** the slash hint is graded in 2 keys, the no-folder line in 1, `It will read:` in none.
   - **What still holds:** file effects (writes, STATUS) are graded fully, so a run that acts wrongly is caught; only the screen can lie. **Fix:** see OWNER-DECISION 1.
2. **[m] m2: the our-side net.**
   - **Plain misses:**
     - "Our team spent the whole of Wednesday rebuilding the import." (held-out r3 and R02): the span rule (`:320`) knows only "I"/"we" as the subject;
     - G07 "took us twice as long as we planned";
     - G17 "The developer spent most of Monday … on our side".
   - **False positives on legitimate scheduling sentences** (11/18 targeted):
     - `at our usual` (`:319`);
     - `our time|hours|days` (`:324`), plus ow-build's `OUR_MONEY` "our time/hours", which the new exclusion ("together") does not cover;
     - `(I|we) … add … %` (`:323`);
     - `(I|we) … invoic… separately` (`:318`);
     - `billable` after "your team's" (`:327`);
     - the allowance and too-high rules, which fire on any "we" elsewhere in the sentence (`:321`, `:326`);
     - `spent … morning` "at your" (`:320`).
   - Under O8, these become controls.
3. **[m] m3: index year context and attribution.** `YEAR_BEFORE` (`:893`) makes "of", "to", "from" and "by" date context, so "a fee of 2000" and "up to 2000" pass. An amount on its own line with no money word passes. A money word next to a client figure on an own-decision line is a false positive.
4. **[m] m4: handling.** `HANDLING_ASKED` (`:975`) needs "?", so "First, tell me whether any of this material is sensitive or restricted." passes. Any question line on a screen that mentions "restricted", "confidential" or "sensitive" (for example an echoed open question) fails a run with a stored value. This check now runs in all 50 keys.
5. **[m] m5: phone false positives.** The 10–11-digit branch of `PHONE` (`:336`) flags order and batch ids (`1000234567`, `20261013001`) in notes, under a check that can never be waived.
6. **[m] m6: the key rule for planned producers.** `charge`, `time_spent`, `minutes_used`, `signatory` and `overage` are accepted, and `review_by` is refused for a planned producer. The documented-value check only starts once the producer is built.
7. **Nits:**
   - `/ow-status`'s restored text changed its framing words (the columns are identical);
   - the prescribed list (`test:245`) includes single generic words ("client", "next", "due", "logged"), which add little as graded text;
   - the description no longer says "due within one business day" or "it names a path, never a price" (the body still does).

### OWNER-DECISIONs

1. **Should refusal and no-op screens get prescribed words before REL-02?**
   - Under R1-4 a screen is graded only on prescribed text. `logs-status-and-index.md` §1.2 says "Refuse" and prescribes no screen word, so a key cannot tell a refusal from a false success.
   - **Options:**
     - (a) prescribe one word or phrase per refusal and no-op case (for example `Refused:` for `-action`, `no decisions` for notes without them, `fully logged` already exists), then grade it and add `never` guards for success words on those routes;
     - (b) leave screens to REL-02's human review.
   - **Recommendation:** (a), together with token groups for the self-check line and the full NEXT block (slash hint, `It will read:`, no-folder line) in every key whose screen prints them. It is small and mechanical, and the waiver precedent (`self-checks-logs.md:5`) already does it.
