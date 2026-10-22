## OW-06 PR 2 — Evaluation Round 2

**Sprint:** ow-handoff 1.0.0 (round-1 fixes). A focused round against the 8.5/10 bar, so every criterion needs 8 or more for the weighted score to clear it.
**Branch:** `claude/ow-06-ow-handoff`, head `1bd00075` (not pushed). Commits: `3a7a0a61` (build), `f2a97db3` (security fixes), `1bd00075` (round-1 fixes: M1, m1 to m8, nits).
**Base:** origin/main `62fe72a9`. **Evaluator:** independent Evaluator, oc-app-architect Phase 6. **Date:** 2026-10-22.
**No full `npm test` or build** (the gate ran them). Single test files, every sibling acceptance script and the catalog checks were run.

**Standard applied:** as in round 1, plus two decisions from the brief: a lone O'/Mc word is a person only with a given name, a title or a person slot; and "no" or "not" inside an approval approves its object, with the decline check applying only to the clause that holds the approval verb. The evaluation cap applies: a checker-only major is CHECKER-ONLY and moves to the follow-up PR.

**Where I worked.** `<E>` = `scratchpad/eval-ow06-r2`. `<E>/tree` is a detached checkout of `1bd00075` and `<E>/old` of `f2a97db3`, each with `npm ci --ignore-scripts` at the root and in `site/`. Both are removed at the end. The Generator's worktree was not touched. Harness in `<E>/h/`. **The new held-out set** is `heldout2.mjs`, written and hashed (`heldout2.sha256`: `ededc8dc…1ee8`, 02:29 local) before I opened the round-2 diff, the session check or any new fixture. The round-1 harness was re-run unchanged.

### Code Scores

| Criterion | Weight | Score | Justification |
|---|---|---|---|
| Functionality | 30% | **7/10** | The round-1 major is closed on recall. My round-1 26 approval forms are caught 26/26, and the new untuned set 28/28 (0/28 on `f2a97db3`). Every other round-1 minor is fixed (below). But the session check refuses about half of natural, legitimate approvals (M1b). The skill text is unchanged and right. |
| Feature Completeness | 30% | **8/10** | 161 goldens, all 161 also pass laid out as real runs. 33 of 33 approval cases carry a session (`offer-resume-html` has an `approvals:` key with no session, but its record was written in an earlier step, so the check has nothing to grade). The 26 forms, the round-1 harness and the held-out sets are permanent tests. The four missing one-step re-run goldens, the `verified` move and the duplicate-choice resume were added. |
| Code Quality | 20% | **6/10** | Recall is excellent, but the new check is a pile of regular expressions with two structural weaknesses: any line that begins "Word: " is read as another speaker's, and the decided clause rule is not implemented (`gate()` tests the whole sentence). A copy of OW-10's regex set is pinned by test, not imported. |
| UX (clarity for person and model) | 20% | **8/10** | Unchanged and good: skill text byte-identical to round 1 (`git diff f2a97db3 1bd00075 -- skills-work` is empty), body 4,097 tokens. |

**Weighted Code Score:** 0.3×7 + 0.3×8 + 0.2×6 + 0.2×8 = **7.3 / 10.** It does **not** clear 8.5, and Functionality and Code Quality are below 8.

**Verdict.** M1b is a checker-only major, so under the cap it is CHECKER-ONLY: the sprint **passes** (every criterion at or above 6, no major in the skill text), and M1b goes to the follow-up PR. It does not clear the 8.5 bar.

### Test Results

| Run | Result |
|---|---|
| `gen-skills-catalog` / `check-skill-contracts` / `lint-internal-refs` | exit 0 / 0 / 0 |
| `ow-handoff-acceptance` | exit 0: **161** golden runs; **161/161** as real runs |
| ow-uat / ow-documentation / ow-build / ow-build-plan / ow-start acceptance | all green |
| `ow-handoff-{r1,plants,acceptance}.test.js` | **409 passed** (single files; no full run, by the brief) |
| Body | 4,097 tokens, unchanged |

### Builder claims, verified (round-1 harness, unchanged, on `1bd00075`)

| Claim | Verdict |
|---|---|
| 26/26 approval forms | **True**: 26/26 caught. (My nine "own" forms flag only because they do not match the record, for example a care choice for "the monthly plan" against tier Regular. Those are correct refusals, my r1 fixture error, not false positives) |
| 43/44 plants | **True**: 43/44 (F7 was a withdrawn placeholder) |
| Scan 11/11 | **True**, 0 false positives |
| Price 22/22 | **True** (11 in the notes, 11 in `handoff.yaml`) |
| Injection 11/11 sources | **True** for sources; 11/11 held-out wordings in the README |
| All screen bypasses caught | **True**: free-worded claims 15/15; bypass forms **10/10** (round 1: 4/10) |
| Malformed | **True**: 18/18, no crash |
| Shipped text | "Your monthly care plan will handle new requests" now caught (m2); the two remaining misses are caught by `check-skill-contracts` |

### New untuned set (`h/heldout2.mjs`, run on `f2a97db3` and on `1bd00075`)

| Set | `f2a97db3` | `1bd00075` |
|---|---|---|
| Approval forms that must fail: negations, conditionals, relays, hedges, wrong item, partial, across transfer, owner rights (account check), care, offer re-run, go-ahead, the three waivers, walkthrough, completeness, removal, SH-02 waived-transfer record | **0/28** | **28/28** |
| Legitimate approvals of what the record says (20 written; 3 of mine did not match the record or were not sentences, so 17 are valid) | 0/17 flagged | **9/17 flagged** |
| Forms with "no" or "not" inside the approval (4 written; 1 mismatched the record) | — | **4/4 of the valid ones flagged** (the decided rule is not implemented) |
| Injection plants (10 sources and new wordings) | 6/10 | **9/10.** The miss is a README line addressed to "whoever is summarising this repo", not to an assistant |
| People: names with O'/Mc (6 must catch, 6 controls) | 3/6 | 3/6, controls 0/6 FP. Consistent with the decision: a lone "O'Hara signed off the page" is not flagged; "Siobhan O'Neill", "Mr. McAllister" and "Dr. Okonkwo" are. Missed: "Brendan McGrath" (a given name plus an Mc surname passes where "Fiona McGrath" is flagged; an imported-rule recall gap, m3) and "Dara, the owner" |

**The nine false positives, grouped (`h/iso2.mjs` isolates each):**
- **Speaker regex** (`sessionEntries`, `^[A-Z][\w' -]{0,30}(?:…)?:\s`): any user line that starts with up to 30 characters and a colon is read as another speaker's line, and the whole answer is dropped ("no answer from the user"). These flag, and all pass with the colon replaced by a comma: "Yes: TR-01, the client has owner rights now." / "AX-01 is removed: the operations manager confirmed…" / "AX-05 is rotated: …, OP-09 passed…" / "They changed their mind: hourly help, decided today." (4)
- **Decline test on the whole sentence** (`gate()` runs `SAID_NO` on the sentence, not the clause with the approval verb; the decided rule): "…chose Regular care, not the Light tier." / "Go-ahead for HELP-01 from the operations manager, no conditions attached." / "I waive TR-02 because the client is not answering. But not TR-01." (separate sentence for the exclusion is also refused) / "…chose the Regular care tier, and ow-care is not installed." (the care sentence naming ow-care is dropped as the ow-care answer) (4)
- **Waiver verb form** (`waive[sd]?`): "I'm waiving TR-02, the QuickBooks connection, but not TR-01." (1)

### Defects (round 2)

**[M] M1b (CHECKER-ONLY): the session check refuses natural legitimate approvals (9 of 17 in my set).**
- **Where:** `scripts/ow-handoff-acceptance.mjs` `sessionEntries` (`:1288`), `gate` (`:1332`), and the waiver sentence regex in `sessionApproval` (`:1375`).
- **Why major:** on a realistic run, a correct record of what the user said is rejected, which is a wrong verdict. It is the OW-10 round-2 class (10 of 12 refused), at a lower rate. It cannot affect the skill text, so under the cap it moves to the follow-up PR.
- **Fix:**
  1. Read a speaker prefix only when it is the user's name or a known role ("Robin:", "Asked:"), and treat any other leading "text:" as part of the user's line.
  2. Run `SAID_NO` only on the clause holding the approval verb (split the sentence on commas and "and"/"but", as `clauses()` does) and on the ids it names, so "not the Light tier", "no conditions attached" and "because the client is not answering" pass. Accept an exclusion in a following sentence ("Not TR-01.").
  3. Accept `waiving` and `am waiving` in the waiver form.
  4. For the care choice, keep an ow-care clause out of the choice sentence instead of dropping the sentence.
  5. Add my 17 valid forms as controls, the 28 refusals as plants, and the colon and clause variants from `iso2.mjs`.

**Minor:**
1. **[m] m1: the care-choice check wants a "chose" verb**, so "Care, Regular tier." (terse) is refused. A tier named with the word `care` after a bare noun phrase should pass when the sentence names the tier.
2. **[m] m2: a waiver that is not a "waive" verb** ("close it unconfirmed … That is my waiver.") is refused, and a waiver sentence that names its item only by a pronoun is refused. Both are arguable strictness; record the decision.
3. **[m] m3:** "Brendan McGrath" and "Our contact is Dara Voss" pass the imported people rule (D2).
4. **[m] m4:** `offer-resume-html` has `approvals:` but no `session/answers.md`; harmless, since its record was written in an earlier step, but the coverage test should say so.

All eleven round-1 minors and nits are closed, with one exception noted in m4 above. m1 (structural lines), m2 (care promises), m3 (the scan line), m4 (log lines), m5 (injection sources and wording), m6 (resume and the `verified` move), m7 (split spellings) and m8 (margin and names) were all re-checked: every item in my round-1 plants and sets that I called a defect is caught, apart from the people-name recall in m3 here.

### Criteria C1–C28 (score out of 10)

| # | Score | Evidence |
|---|---|---|
| C1 | 9 | Catalog and edges green; writer and hand-off pins `[]`; O2 sibling edges and ow-uat pins in place |
| C2 | 9 | 4,097 tokens, `network: none`, shared examples byte-identical |
| C3 | 9 | Shipped-text plants 11/12 plus the contracts check; care-promise wording now caught |
| C4 | 9 | Every cell has a golden; refusals write nothing |
| C5 | 9 | Window dates, sources and price forms (11/11 in `handoff.yaml`) |
| C6 | 9 | Transfer kinds, pointers, below-HIGH rows, no-map prompt; completeness now graded on the session |
| C7 | 9 | Scan record 11/11; log-line form closed on length, tail characters and prefix names; the "not scanned" line graded |
| C8 | 9 | Not re-graded (PR 1) |
| C9 | 9 | Colliding ids, copied steps and coverage planted and caught |
| C10 | 9 | Takeover, confidence column, internal text and the NOT-CHECKED line graded |
| C11 | 9 | Later-end and business-day arithmetic; Mossgate NEXT and backstop |
| C12 | 9 | Day-45 classes, per-CO windows, punch items once |
| C13 | 9 | Hours, markup, `verified`, go-ahead (the status move now has a golden) |
| C14 | 9 | Frozen terms, structured rollover, choice history |
| C15 | 9 | All five sources, capture profile, `logs/business/` never |
| C16 | 9 | Close blockers, branches, care promises in any words |
| C17 | 9 | Hand-off fields pinned for ow-build, ow-uat, ow-documentation and ow-care |
| C18 | 9 | Never-waived gates planted |
| C19 | 8 | Meaning nets: our-side 15/16, credentials 11/11, other clients 10/11, price 22/22; name recall gap m3 |
| C20 | **6** | Recall excellent (28/28, 26/26); false-positive rate about 53% on natural approvals (M1b) |
| C21 | 9 | Resume, write-once, duplicate choice and the missing one-step re-runs all closed |
| C22 | 9 | Free-worded claims 15/15 and structural bypasses 10/10 |
| C23 | 9 | 18/18 malformed |
| C24 | 9 | The 26 forms, the harness and the held-out sets are permanent |
| C25 | 7 | The O12 stand-in swaps remain deferred by decision; H3 is shown end to end |
| C26 | 9 | Repository containment and injection sources (9/10 on my new wordings) |
| C27 | 9 | oc- outputs unchanged by the diff (skills-work only plus checker and tests); sibling checkers green |
| C28 | 9 | 1.0.0, changelogs, build notes |

### OWNER-DECISIONs

1. **Waiver wording.** Is a waiver valid only with the verb "waive" in the user's own sentence, or does "close it unconfirmed" (with the waiver stated elsewhere in the turn) also count?
   - **Recommendation:** keep the strict form for the waiver itself (it is a never-delegated act), but accept `waiving` and an exclusion in the next sentence.

Everything else is settled by the text or by the fix list above.

---

## Response (Generator, 2026-10-22)

Round 2 scored 7.3, below the 8.5 bar; the owner decided to land at that score with the M1b fixes below, and the shared approval module as a follow-up.

**M1b (the session check refused natural approvals): fixed in the checker and goldens only; no skill text changed.** A new held-out set was written and hashed (`tests/ow-handoff-heldout-r2.mjs`, digest `33135c4b…`) before any rule changed. Before → after: refusals caught 34/34 → 34/34; valid approvals refused 23/29 → 1/29 (the one left is the set's own "TR-01 is finished", which says neither owner nor done; kept as written); given name + O'/Mc surname caught 2/4 → 4/4; controls clean. The evaluator's forms: his 28 refusals still caught 28/28; of his 20 valid forms 19 pass (9 refused before), and the 20th is kept refused by his own owner-decision recommendation. His round-1 harness is unchanged on the fixed tree (approvals 26/26, injection 11/11, scan 11/11, price 22/22, plants 43/44, 161/161 as real runs).

1. A leading "text:" is the user's own words unless it is `Asked:`, the user's name or a named other party.
2. A decline is tested in the clause holding the approval verb (OW-10's clause logic, copied and pinned); "not the Light tier" and "no conditions attached" are scope, not declines; a "No, ow-care is not installed." answers the ow-care question and takes nothing back; the care choice leaves the ow-care clause out of its own sentence.
3. "I'm waiving" counts, with the exclusion in the same or the next sentence ("Not TR-01.").
4. A terse "Care, Regular tier." counts; a waiver naming its item by "it" or "their confirmation" counts.
5. m3: "Brendan McGrath" and the like are people; m4: `offer-resume-html` carries a session, and a test fails any case with `approvals:` and none.

**OWNER-DECISION 1 (waiver wording):** the recommendation is kept: a waiver without the verb "waive" ("close it unconfirmed … That is my waiver.") stays refused; "I'm waiving" and the exclusion in the next sentence are accepted. Recorded in design §17.

**What remains below 8.5, stated:** the session grader is a pinned copy of OW-10's clause logic, not an import from one shared module (Code Quality); O12's sibling stand-in swaps (C25); the name-recall gaps: a lone "O'Hara" and "Dara, the owner" are not people to the imported rule, and a README line addressed to "whoever is summarising this repo" is not addressed to an assistant (C19, C26).
