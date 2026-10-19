## OW-04 (Sprint 3) — Evaluation Round 1

**Sprint:** ow-uat 1.0.0 (contract `sprints/release-2.1/ow-sprint-3/contract.md`, approved 2026-10-17 with O1–O9) · **Branch:** `claude/ow-uat-sprint-3`, head `792ab846` (merge base with main `90e61149`) · **Design:** `docs/plans/2026-10-09-ow-uat-design.md` and its §15 build notes (departures 16–23) · **Evaluator:** skeptical Evaluator, oc-app-architect Phase 6 · **Date:** 2026-10-17

**Standard applied.**
- **D1:** an internal number is OUR side only: our effort and hours, rates, costs, margin, multipliers, and overruns against our own plan. The client's schedule, figures, ratios, payment terms and dates are allowed.
- **D2:** a meaning check is a regression net plus the skill's self-check. Idioms and marker-less implied claims are accepted. A plain-wording slip is a defect. As in Sprint 2 round 4, an untuned plain-wording gap is **minor** unless it shows that the skill text is wrong. A **structural** checker bug that lets known plants slip, or fails correct runs, is graded on its own merits.
- **D5:** no real prices, invented fixtures, no private names.

**Where I worked.**
- A detached checkout of `792ab846` at `<EVAL>/tree`, plus a build of the merge base at `<EVAL>/base`.
- Four evaluator-only cases (`zz-ev-*`) were added inside my checkout, and copies are kept in `<EVAL>/zz-cases`.
- The Generator's worktree was not touched (still clean at `792ab846`). Both of my worktrees are removed.

**Rule for the untuned sets.** I wrote `h/sentences.mjs` (75 sentences) before opening `scripts/ow-uat-acceptance.mjs` or `tests/ow-uat-sentences.mjs`. I read only the goldens beforehand, for role names, ids, labels and the people list. Each sentence is graded only on findings that the untouched golden does not already have.

### Code Scores

| Criterion | Weight | Score | Justification |
|---|---|---|---|
| Functionality | 30% | **7/10** | The skill text implements O1–O9 cleanly. Five verbs and every mode, `rec` ordering, per-step records, the frozen clauses, O6 (blocks until withdrawn), O7 (dates and rounds against the quoted bounds) and O8 (refuse) are all present.<br>• `calc --calendar us-federal` is correct for 2026–2030, including every observed-day edge, and its usage errors are right.<br>• Routes resolve as §3 says.<br>• One main-path defect: the basis-mismatch rule, followed as written, flags ow-uat's own `agreed/contract-terms.md` on every verb after `-plan` (R1-2).<br>• Departures 18 and 19 never reached the phase file. |
| Feature Completeness | 30% | **7/10** | 119 goldens, 28 route goldens, and every §11 case except Real use.<br>• Plants are permanent: 516 tests, 0 skipped.<br>• C5 copies are byte-identical, and C18 holds.<br>• Missing pieces:<br>&nbsp;&nbsp;– no golden for "ow-tools present without the capability", a path C11 names;<br>&nbsp;&nbsp;– no route golden for the handoff route's "deemed date passed, clauses none" cell;<br>&nbsp;&nbsp;– the body's Reads-from rows are lumped, against deliverable 1;<br>&nbsp;&nbsp;– C5's "governing definition applied" is checked only by a regex on ow-build's text. |
| Code Quality | 20% | **5/10** | Two structural checker bugs:<br>• the sentence splitter merges a section's last sentence with the headings that follow, so the Generator's **own known C8 plants slip 0/3**, and two known C6 plants slip (R1-1);<br>• the resume check fails a correct `--signed` resume at 3 of its 4 cut points (R1-3).<br>Deleting a write-once file is invisible.<br>On untuned material:<br>• our-side recall is 73% with a 7% false-positive rate (much better than Sprint 2's 39%);<br>• credentials 82%, people 64%;<br>• data only 2/22 by the data rule;<br>• false-pass claims 5/12. |
| UX (clarity for person and model) | 20% | **7/10** | Body ≈4,355 tokens (cap 4,500).<br>• Phase files are short and direct. Every NEXT has its slash hint.<br>• Owner rulings are written where a model will read them.<br>• Against that:<br>&nbsp;&nbsp;– the body's signed NEXT template leaves out the step-0 NEXT that the phase file and golden print first;<br>&nbsp;&nbsp;– a golden client reason contradicts its own status (UAT-06);<br>&nbsp;&nbsp;– "Fixed at no charge." is written before any retest. |

**Weighted Code Score:** 0.3×7 + 0.3×7 + 0.2×5 + 0.2×7 = **6.6 / 10**

### Test Results

| Run | Result |
|---|---|
| `npx vitest run` (full) | **3,175 passed, 10 skipped, 0 failed**, after `npm run build`. On a fresh checkout before the build, 2 `mcp-hosted-references` tests fail for want of `public/docs`; this is environmental and they pass once built. The 10 skips are Sprint 2's 9 decision-2 skips plus the "pandoc missing" branch, which skips because pandoc and Typst are installed here (so the real-binary export ran) |
| `tests/ow-uat-acceptance.test.js` + `tests/ow-uat-plants.test.js` | 516 passed (137 + 379), 0 skipped |
| `npm run build` | exit 0 (`building opchain-dev worker @ 792ab846`); `git status --porcelain` empty afterwards |
| `gen-skills-catalog` | exit 0: 36 oc- skills, 4 ow- skills |
| `check-skill-contracts`, `lint-internal-refs`, `check-skill-flags`, `gen-route-spec:check`, `sync-bundles:check`, `sync-plugin-skills:check`, `checkpoint:validate` | all exit 0 |
| Acceptance checkers | ow-start 4/4, ow-build-plan 32/32, ow-build **54/54**, ow-uat **119/119** golden runs |
| C18 vs merge base `90e61149` (both built here) | **672/672 content lines identical**: `public/docs`, `plugins/opchain`, `public/update.mjs`, `mcp-catalog.json`, `coverage-flags.json`, the flag registries, the member lists of `opchain-skills.zip` and all `public/skills/*.zip`, and the `dist/` and `public/` file sets. `git diff 90e61149 HEAD -- skills/ plugins/opchain/ src/ site/ package*.json build.mjs` is empty |
| ow-tools | `gen-ow-tools-manifest --check` current; `plugin.json` and both `marketplace.json` fields are 1.2.0; `calc.mjs` imports only `node:fs` and its own modules; `version --json` lists `calc.calendars: [us-federal]` |
| Body tokens (chars/4) | 17,418 chars ≈ **4,355** < 4,500 (`bodyTokenBudgets.ow-uat`) |
| Byte-identical copies | protocol ×5 (`2f6f7177…`); `offers.md` ×3 (`3bd24e95…`); `handoffs.yaml` ×4 (`61315114…`) |

### Generator claims, verified

| Claim | Verdict |
|---|---|
| 3,175 tests pass | **True**, once built (see above) |
| 137 acceptance + 379 plant tests, no skips | **True**: 516, 0 skipped |
| 119 goldens, 28 route goldens | **True**: 26 `route-*` cases plus `defect-after-signoff` and `signoff-after-signed` |
| Held-out 14/15 caught, 0/15 FP, then tuned on the two misses | **Disclosed honestly** in `tests/ow-uat-sentences.mjs:167-176` and in "added after the held-out measurement" comments. My own untuned measurement is lower on some categories (below) |
| Body ≈4,355 tokens | **True** |
| C18 byte-identity | **True** (672/672) |
| ow-tools 1.2.0 sits on main's 1.0.0; OW-03 (1.1.0) is unmerged | **True**. Merging Sprint T's `62af404f` conflicts in 9 files: the ow-tools design, both plugin JSONs, README, the manifest, `calc.mjs`, `cli.mjs`, `doctor.mjs` and the ow-tools SKILL.md. The branch merges cleanly with current `origin/main` (2 docs commits ahead) |
| C5: ow-build reads ow-uat's real goldens | **True**: 7 byte-identical copies, no stand-in left, and 15 ow-build cases that read them pass |
| `.bugcheck.json` exception is narrow | **True**: one file under `verification.scan_exceptions.secrets` only, digest `5e135a08…` matches the file. Its "secrets" are documented example tokens (AWS's documented `AKIA…EXAMPLE` key, GitHub's doc `ghp_` example) and invented passwords |

### Criteria C1–C19

| # | Verdict | Evidence |
|---|---|---|
| C1 | **PASS** | Catalog and contracts pass. My run-level writer-mode plants are all caught by `writes` (WM01–WM10). Edges plants are caught (WE2, O1x, O1y, O2x, O2y).<br>Gap (minor, R1-13): widening a writer's modes in `skill.edges.yaml` (WE1, `signoff-request-<n>.md` ← `--deemed`) passes everything, and silently widens the run-level writes check that reads the edges. |
| C2 | **PASS** | 4,355 < 4,500, enforced by the catalog. The frontmatter cap-dodge plant fails the catalog (TB1). Copies are identical. |
| C3 | **PASS** (minor gaps) | Brand possessive and `llc_ops` are caught. Three drafted clause sentences slip (CL1–CL3), as do "oc code auditor" and prices without a currency ("1.5k", "95 an hour") (R1-11). |
| C4 | **PASS** (minor gaps) | Every route resolves as §3 says.<br>• A route cell grades only the verb, so a re-freeze on `route-ready-cut` (RT01) or an edited run on `route-folder-fixed` (RT03) passes the cell.<br>• The handoff route's "deemed passed, clauses none" cell has no route golden (R1-6, R1-19). |
| C5 | **PASS** | ow-build routes Change and extension → `-change`; Defect, Training gap, Environment and Duplicate → nothing; `signoff.md`/`backstop.md` → invoice. The copies are byte-tested. "Governing definition applied" is checked only by a regex on `phase-invoice.md` (R1-18). |
| C6 | **FAIL (major R1-1)** | 35 controls written first, and 14 known plants pass in place.<br>• Moved to the end of a section, known plants C6P6 and C6P12 slip.<br>• Untuned: 22/30 our-side caught (all 8 slips are plain wording) and 2/30 legitimate sentences flagged (R1-9).<br>• The internal-file rule catches 2/5 (R1-12). |
| C7 | **PASS** (minor gaps) | Golden plants are caught and the waiver refusals are in the text. Untuned (R1-10):<br>• credentials 18/22, with 0/11 controls flagged;<br>• people 14/22, with 1/12 flagged;<br>• data 2/22 by the data rule, with 0/10 flagged. |
| C8 | **FAIL (major R1-1)** | The known plants "Your team confirmed AC-1.1." and two others are caught 3/3 at the start of a section but **0/3 at the end of "The build tested"**. The merged "sentence" runs into the "Checked by the builder; not tested by your people" heading, and `:534` exempts it. Untuned: 5/12 at the natural placement (R1-8). |
| C9 | **PASS** | Goldens and the X01–X16 plants. Supersession is ordered by `rec`, and request 3 supersedes request 2. |
| C10 | **PASS** | Goldens and the T01–T14 plants. O6 holds: withdrawal by a non-client (O6a) and a too-big record without its `requests.md` row (O6b) are caught. |
| C11 | **PASS** (minor gaps) | Table = calc = 5 U.S.C. 6103 for 2026–2030. 2027-12-31, 2027-06-18, 2027-07-05, 2027-12-24, 2028-11-10 and 2029-11-12 are all right; the day after Thanksgiving correctly counts as a business day; Juneteenth is present. Usage errors exit 2.<br>Gaps (R1-17):<br>• in-range dates near 2022 and 2099 refuse;<br>• the table path across 2030→2031 is off by a day;<br>• there is no lacking-capability golden. |
| C12 | **PASS** (minor gaps) | Clauses none and an unsupported calendar both refuse, and a byte change to a clause is caught (DB09, DB11). Deemed and backstop dates are checked (DB03–DB07, DB12).<br>Slips: an extra drafted clause in the frozen block (DB08), and `calendars.contract: none` beside frozen clauses (DB10) (R1-7). |
| C13 | **FAIL (major R1-3)** | Goldens pass, and a `-plan` cut after `terms` resumes correctly under the checker.<br>• A correct `--signed` resume after `record` fails `signing_steps` with 3 findings.<br>• A deleted run is invisible (RS08, RT07).<br>• Recorded steps' outputs (testers, schedule) can change on resume (RS03, RS04) (R1-4, R1-5). |
| C14 | **PASS** (minor gaps) | NEXT order, documentation only when bought, test accounts without logins (HF03), and `delivery_backstop_date` (HF01) are all checked. A punch list without its logged date passes (HF02). UAT-06's client reason contradicts its status (R1-16). |
| C15 | **PASS** | Every golden pack and request passes the preflight. The real pandoc+Typst export ran here (4 samples). The HTML checks, the six columns and the production refusals are covered by goldens and plants. |
| C16 | **PASS** | 12/13 new malformed probes fail per check without throwing. The 13th is a malformed `signoff-requests.yaml` on `route-folder-drafted`, which passes because route cells check only the verb. |
| C17 | **PASS** | All plants are vitest cases, there are no skips in the ow-uat files, and labels are honest. One test name overclaims: "one Reads row per file" checks only presence (R1-15). |
| C18 | **PASS** | Byte-identical (above). ow-start, ow-build-plan and ow-build goldens and plants pass. The adapted ow-build plant labels (C07, C17, K08) are honest. |
| C19 | **PASS** | Manifest current, 1.2.0 everywhere, no socket or new dependency. The O3 merge order is still open (OWNER-DECISION 2). |

### Untuned sets (`h/sentences.mjs`, written before the rules)

| Set | Placement | Plants caught | Controls passing |
|---|---|---|---|
| OUR side (D1), 30 | request, start of a section (cannot be masked) | **22/30 (73%)** | — |
| OUR side | request, end of a section | 20/30 | — |
| OUR side | UAT-05 client reason | 22/30 | — |
| Legitimate client/tester, 30 | request, start of a section | — | **28/30 (FP 7%)** |
| Legitimate client/tester | punch list | — | 28/30 (the same two) |
| Legitimate client/tester | request, end of a section | — | 30/30 (masked by R1-1) |
| Credentials, 11 plants / 11 controls | pack and RUN-01 | **18/22 (82%)** | 11/11 |
| People, 11 / 12 | pack and request | **14/22 (64%)** | 11/12 |
| Real data, 11 / 10 | SC-06 and pack | **2/22** by the data rule (4/22 by any check) | 10/10 |
| False pass, 12 / 10 | Mossgate request end of "The build tested"; UAT-05 reason | **5/12** | 10/10 |
| False pass (Mossgate) | four placements | 6/24 | 18/20 |

- **OUR-side slips (all plain wording, no idioms):**
  - "Each additional tester role adds 15% to the UAT line."
  - "The fixes ran well past the effort we had budgeted."
  - "…took twice as long as we estimated internally."
  - "Internally this fix was sized at half a day."
  - "…used a third of the hours we had set aside for testing."
  - "Sessions beyond the third are charged at 120 each."
  - "Robin spent the best part of Thursday on the fix." (the user named as the agent, Sprint 2 G06 class)
  - "The time we logged on UAT-03 is over the fix budget we set ourselves."
- **False positives:**
  - "Each scenario takes 20 to 30 minutes." This is a test duration, which C6 allows.
  - "Today your month-end close takes about four days." This is the client's own effort.
- **Rates.**
  - Our side: recall 73%, false positives 7%, against Sprint 2 round 4's 59% and 39%.
  - Credentials 82%/0%; people 64%/8%; data 9%/0%.
  - False pass 42% (natural placement) / 67% (best placement), with false positives 0% / 10%.

### New plants (beyond `tests/ow-uat-plants.test.js`)

| Harness | Plants | Caught | Slips |
|---|---|---|---|
| `h/plant2.mjs` + `h/plant2b.mjs`: runs, at every route cell kind, writer modes, resume cuts, deemed and backstop with and without clauses, calendar, frozen clause, O6, O7, O8, hand-off fields | 49 | **40** | RT01, RT03, RT07, RS03, RS04, RS08, DB08, DB10, HF02 |
| `h/family.mjs`: check-skill-contracts (clauses, names, prices, O1, O2, edge modes, hand-off fields, cap dodge) | 17 | **9** | CL1, CL2, CL3, NM3, PR1, PR2, WE1, HE1 |
| `h/reads.mjs`: C6 internal-file reads | 5 | **2** | "the price book", "margin.md is not client-facing", "the time tracker's export" |
| `h/placement.mjs`: the Generator's own known plants, moved | 14 C6 + 3 C8 per place | start 14 + 3; **end 12 + 0**; punch list 14 | C6P6, C6P12, C8P1–3 at the end of a section |
| `h/malformed.mjs` (C16) | 13 | 12 fail per check | one route cell passes a malformed file |
| Controls | 7 structural + 5 O7 | all pass except the correct `--signed` resume (R1-3) | — |

The O7 wording is right: "fixed on 14 January, after the 5 business days quoted, at no charge", "two business days after the quoted 5" and "a third round past the 2 quoted" all pass. "ran past what we had planned", "our developer another two days" and "the extension rate" are caught.

### Defects (round 1)

1. **[M] R1-1: the sentence splitter merges a section's last sentence into the next heading(s), so known plants slip by position.**
   - **Where:** `scripts/ow-uat-acceptance.mjs:389` collapses every newline and splits only before `[A-Z0-9"(]`, so `## …` never starts a sentence. A sentence just before a heading is merged with the heading and the next section's text.
   - **Effect on C8:** in the request, the "Checked by the builder; not tested by your people" heading then fires the exemption at `:534`. The Generator's known C8 plants are caught 3/3 at the start of "The build tested" and 0/3 at its end.
   - **Effect on C6:** two known C6 plants also slip there, and the controls pass or fail depending on the neighbouring text.
   - **Repro:** `node h/placement.mjs`; `node h/fresh1b.mjs`.
   - **Fix:** split at headings, list items and blank lines before collapsing whitespace. Then plant every known sentence at the start and the end of a section.
2. **[M] R1-2: `agreed/contract-terms.md` cannot pass the basis-mismatch rule as written.**
   - `routing-and-resume.md:13` compares each `agreed/` file's bytes with the upstream that `uat.yaml basis` names.
   - The plan golden's basis lists `agreed/contract-terms.md` from `plans/<slug>/contract-inputs.md`. But the file is ow-uat's own quoted extract (`uat-yaml-schema.md:88`), so its bytes never match.
   - Read literally, every verb after `-plan` reports a mismatch, which blocks `-pack`, `-defect` triage and `-signoff`.
   - `--refreeze agreed/contract-terms.md` (`phase-plan.md:33`, "copy that one file again from its upstream") would overwrite it with `contract-inputs.md`'s bytes. That loses the included block and ownership terms that ow-handoff reads.
   - Nothing says how a changed ownership term or UAT line after the freeze is detected.
   - **Repro:** the `plan` golden's `uat.yaml` basis row 4, with §1.3 applied as written.
3. **[M] R1-3: the checker fails a correct `--signed` resume at 3 of its 4 cut points (C13, "at any step").**
   - **Where:** `checkSigningSteps` (`:1588-1589`).
   - **What it flags wrongly:** `acceptance-record.md` and `punch-list.md` written for the first time on the resume are reported as "rewritten on resume". Test accounts asked for the first time at the `accounts` step are reported as "changed on resume".
   - **Scope:** only the golden's cut point (after `punch-list`) passes.
   - **Repro:** copy `<EVAL>/zz-cases/zz-ev-signed-*` into `tests/fixtures/ow-uat/` and run `node scripts/ow-uat-acceptance.mjs`. It gives signing_steps ✗ with 3 findings. `zz-ev-plan-*` (a `-plan` cut after `terms`) passes.
   - **Fix:** compare only files and accounts that existed before the resume (`priorExists`).
4. **[m] R1-4: deleting a write-once file is invisible.**
   - A run that deletes an earlier `RUN-nn.md` passes every check: RS08 on `run-retest`, and RT07, which deletes the run it triaged.
   - `checkWriteOnce` states the rule only as a comment (`:674`), and `read()` falls back to the prior layer.
5. **[m] R1-5: a recorded plan step's outputs can change on resume.**
   - On `plan-resume`, a tester id (`oc-T1`→`oc-T9`, RS03) or session 2's date (RS04) changes and passes.
   - `checkPlanResume` compares only `plan_steps` and `basis`, and the write-once key comparison applies only to a complete plan.
6. **[m] R1-6: route cells grade only the verb.**
   - A re-freeze of `agreed/` on `route-ready-cut` (RT01), an edited `RUN-01.md` on `route-folder-fixed` (RT03) and a malformed `signoff-requests.yaml` on `route-folder-drafted` all pass the cell.
   - The base case catches them only when it is graded on the same folder. C4 says each route "never re-freezes `agreed/` or rewrites a write-once file".
7. **[m] R1-7: the frozen clause block accepts additions.**
   - A drafted third clause (DB08) and `calendars.contract: none` beside frozen clauses (DB10) pass (`:1001-1006`).
   - `uat-yaml-schema.md:70` says "a clause the contract inputs do not hold is left out".
8. **[m] R1-8: C8 untuned recall is 5/12.**
   - **Slips:**
     - claims without a check id ("Your people ran all three checks", "Your tester signed off every check");
     - "The shop's own tester";
     - "We've corrected UAT-05";
     - every Mossgate plant placed at the end of "The build tested" (R1-1).
   - **False positive:** "Please run AC-1.1 yourselves if you would like your people to test it."
   - **Repro:** `node h/fresh1.mjs`, `node h/fresh1b.mjs`.
9. **[m] R1-9: C6 untuned plain-wording gaps.**
   - 8/30 our-side sentences slip and 2/30 legitimate sentences are flagged (listed above).
   - **Repro:** `node h/fresh1c.mjs`.
10. **[m] R1-10: C7 untuned gaps.**
    - **People:**
      - slips: a listed surname alone ("Okafor"), "L. Okafor", a listed name in capitals ("JESS ARDEN") and a 7-digit phone (`:474`, `:480`);
      - false positive: "New York" read as a person.
    - **Credentials:** "oc-t1 / Spring2026!" and "PIN: 7731" slip (`:454`).
    - **Data:** 9/11 slip. These are pasted rows without a code-shaped cell, "Ship to …" without a colon, a card's last digits and an invoice line (`:508-518`). The rule catches only fixture inbox values, `XX-nnn` rows and labelled fields.
11. **[m] R1-11: the clause-wording and name rules in check-skill-contracts are narrow.**
    - **Clauses:** "will be taken to have accepted … within ten (10) Business Days", "Acceptance is deemed given ten business days after…" and a drafted backstop clause all slip (`check-skill-contracts.mjs:520`).
    - **Names and prices:** "oc code auditor", "1.5k" and "95 an hour" also slip.
12. **[m] R1-12: the C6 internal-file rule catches 2/5.**
    - **Slips:** "the price book" (with a space), "margin.md is not client-facing" (exempted by "not") and "the time tracker's export" (`internalReads`).
13. **[m] R1-13: writer modes are pinned only by the edges file.**
    - Widening a writer's modes (WE1) passes the family checks and widens the run-level `writes` check, which reads the edges.
    - **Fix:** a test that pins C1's mode table.
14. **[m] R1-14: the skill text has drifted from the build notes.**
    - **Departure 18** (on a route, a live request means no new request; n+1 only when asked) is not in `phase-signoff.md:23`.
    - **Departure 19** (the follow-up counts on `profile.md`'s calendar) is not at `:41`.
    - **The signed NEXT template** in the body (`SKILL.md:169`) omits the step-0 `use ow-uat-defect` NEXT that `phase-signoff.md:45` and the `signoff-signed` golden print first. A model following the body fails that golden's `next` check.
    - **Backstop timing:** the design §8.2 says refuse while the backstop date "hasn't passed". The skill says "has not come", and the golden writes `backstop.md` on the date itself, while deemed waits for the day after.
15. **[m] R1-15: the body lumps Reads-from rows.**
    - Lumped rows: `scope.md`+`acceptance.md`, `roles.md`+`future.md`, and `offers.md`+`handoffs.yaml`+`brand.yaml` (`SKILL.md:82,86,88`). Deliverable 1 says "one row per file, never lumped".
    - The test named "one Reads row per file" (`tests/ow-uat-acceptance.test.js:158`) checks only that each file appears.
16. **[m] R1-16: golden client text.**
    - **UAT-06:** its client reason says "it does not block sign-off" while its status is "condition too big; blocks until withdrawn" (`defect-condition-too-big`).
    - **UAT-03/04/05:** their reasons say "Fixed at no charge." from triage on, before any retest. This is C8's wording, and the check never sees it because the sentence names no id.
    - **`plan-resume`:** its `scenarios` step and SC files are dated 2027-01-04, though the resume ran on 2027-01-05.
17. **[m] R1-17: calendar edges.**
    - **Over-conservative refusals:** `calc` refuses in-range answers near the ends because it estimates the year span (`calc.mjs:65`). 2099-12-29 +1 and 2022-01-20 −5 both return `calendar-out-of-range`.
    - **Year boundary:** the no-tool table has no 2031 rows. From 2030-12-20 +10 the table path gives 2031-01-06, while calc gives 2031-01-07. The checker's oracle (`tableHolidays`) has the same gap.
    - **Missing golden:** none covers "ow-tools without the capability", the path C11 names.
18. **[m] R1-18: partial verification.**
    - A punch list without its logged-date column passes (HF02); ow-handoff `-fix` uses that date as `reported`.
    - C5's "governing definition applied" is a regex on ow-build's text; ow-build's checker never applies it.
    - `:1740` is dead code: it filters and then re-tests the same predicate.
19. **[m] R1-19: one C4 cell has no route golden.** The handoff route "deemed date passed, clauses none" exists only as a direct `--deemed` case, with checks `[refused, next]`.

### OWNER-DECISIONS

1. **O1's chain rule.** It is close to vacuous in a cyclic family. ow-uat → ow-build → ow-build-plan means ow-build-plan may read *any* ow-uat file in place: my plant O1z, ow-build-plan reading `signoff.md`, passes the O1 rule. Only ow-start is unreachable. Should the chain also carry the file or its folder, or is the rule accepted as it stands?
2. **O3 merge order.** ow-tools 1.2.0 here sits on 1.0.0, and Sprint T's `62af404f` (1.1.0) conflicts in 9 files. O3 says the PR waits and rebases. Confirm that, and that the calendar tests re-run under Sprint T's no-network fence after the rebase.
3. **Data-check scope under D2.** "Real data" is caught only as values in the client's workspace files, code-shaped rows or labelled fields. Pasted rows from a system that is not in the workspace slip (2/22). Is that the intended net, or should a shape rule for value rows be added?
4. **Backstop timing.** Should it apply on the backstop date, as the skill and golden do, or only after it, as design §8.2 and the deemed rule have it?
5. **`contract-terms.md` (the fix for R1-2).** Either compare its quoted sections with the upstream sections, or exclude it from the byte comparison and re-derive it on `--refreeze`. Decide which, and how a post-freeze change to an ownership term surfaces.

### Verdict: **FAIL**

Code Quality is 5 (below 6), and there are three major defects:
- R1-1, a structural checker bug that lets the known C8 plants (and two C6 plants) slip by position;
- R1-2, a main-path skill-text contradiction about `contract-terms.md`;
- R1-3, the checker failing correct `--signed` resumes.

The build itself is strong. C18 is byte-identical, all 3,175 tests pass, the calendar is correct for 2026–2030, and untuned false positives fell to 7%. All three majors have small, local fixes.

### Harness files (in `<EVAL>`)

- `h/lib.mjs` (shared mutate-and-grade; baseline subtraction)
- `h/sentences.mjs` (the untuned set)
- `h/fresh1.mjs`, `h/fresh1b.mjs`, `h/fresh1c.mjs`, `h/placement.mjs`
- `h/plant2.mjs`, `h/plant2b.mjs`, `h/family.mjs`, `h/reads.mjs`, `h/malformed.mjs`
- `h/mkcases.mjs` (builds the `zz-ev-*` cases, copies in `zz-cases/`), `h/snap.sh` (C18 manifest)
- Results in `*.out` and `*-results.json`, plus `snap-base.txt` and `snap-tree.txt`

To re-run, check out `792ab846` at `<EVAL>/tree`, run `npm ci --ignore-scripts` (and `cd site && npm ci`, then `npm run build`), copy `zz-cases/*` into `tests/fixtures/ow-uat/` for R1-3, and run `node h/<file>.mjs`.
