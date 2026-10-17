## OW-08 (Sprint L) — Evaluation Round 1

**Sprint:** ow-start 1.1.0, meeting and decision logs (contract `sprints/release-2.1/ow-08/contract.md`, approved 2026-10-17 with O1–O8) · **Branch:** `claude/ow-08-ow-start-logs`, head `a0c358a7` (commits `0dec955d`, `f81d51be`, `a0c358a7`) · **Base:** `90e61149` (#618) · **Evaluator:** skeptical Evaluator, oc-app-architect Phase 6 · **Date:** 2026-10-17

**Standard applied.**
- **D1:** an internal number is OUR side only. The client's schedule, figures, ratios, payment terms and dates are allowed.
- **D2:** meaning checks are a regression net plus the skill's self-check. Idioms and marker-less implied claims that slip are accepted. A **plain-wording** slip is a defect, graded minor as in Sprint 2 R4.
- **Fixtures:** invented, with no real prices and no private names. Client audio and transcripts never enter the repo.
- **Expected, not graded as defects:** O4 (the ow-tools hook) waits on OW-03, and the rebase onto OW-04 has not happened.
- **Severity:**
  - **[M] major:** a contracted check gives the wrong verdict on a realistic run, either a false pass on a never-do rule or a false fail on behaviour the text prescribes. Also major: skill text that goes wrong on a main path.
  - **[m] minor:** an edge path, a gap in the D2 net, a coverage gap for a secondary rule, or drift.

**Where I worked.**
- `<EVAL>/tree` is a detached checkout of `a0c358a7`; `<EVAL>/base` is a detached checkout of `90e61149`. Each had `npm ci --ignore-scripts` run at the root and in `site/`.
- The Generator's worktree was not touched.
- Two probe cases, `logs-zz-eval-*`, were placed in my tree's fixtures while I ran them. They were moved out before the final test run and kept in `<EVAL>/probes/`.
- Harness: `<EVAL>/h/` (`untuned-sentences.mjs`, `untuned.mjs`, `plants.mjs`, `says.mjs`, `malformed.mjs`). Results are in `<EVAL>/*.out` and `plants-results.json`. Both worktrees are removed.

### Code Scores

| Criterion | Weight | Score | Justification |
|---|---|---|---|
| Functionality | 30% | **7/10** | The skill text is coherent and covers every route-table row. A model reading SKILL.md and then the phase file lands on the right verb, writes once, and appends STATUS last. The resume rules are sound. Three gaps remain in the text:<br>• m4: the dedupe rule stops an action being moved back to an earlier date.<br>• m5: no rule covers a missing workstream on four verbs, and the printed slash hints lead straight there.<br>• m7: the references disagree on whether `-action` prints its self-check.<br>The moved `/ow-start-extract` self-check rules are word for word. |
| Feature Completeness | 30% | **7/10** | Delivered:<br>• all contract deliverables except O4 and the OW-04 rebase (both expected);<br>• 41 logs goldens, covering every C4 route cell and every new reads row's absent and mismatch case;<br>• 363 OW-08 tests, with no skips;<br>• the changelog with both in-place edits;<br>• the build notes §11.<br>Missing goldens:<br>• a decline recorded in an earlier logs file (D1a);<br>• a logs-only workstream's handling answer (m6);<br>• `-log-meeting` with no workstream when two workstreams qualify (m5).<br>`npm run evidence:pr` and the per-commit verifier were not verified. |
| Code Quality | 20% | **5/10** | Strong:<br>• per-check isolation (7/7 malformed probes fail only their own checks, with no crash);<br>• the STATUS closed grammar (26/26 on my untuned lines);<br>• writer modes, resume, and the O2 and O3 forms (17/17 plants);<br>• route cells (32/36).<br>Weak:<br>• **D2:** the "copies nothing" check matches exact strings only, and the O1 rule accepts amount keys.<br>• **D1:** the checker fails correct real runs, on the `.gitignore` question after a decline and on screen wording. 31 of the 92 route and screen phrases are golden-only wording.<br>• **m1:** Follow-up clean catches 17/28 of the plain-wording internal numbers (61%), and misses the skill's own example "our day rate".<br>• **m3:** the private-name variants slip. |
| UX (clarity for person and model) | 20% | **7/10** | Every new NEXT block has its slash hint, its `It will read:` line and its no-folder line. The welcome keeps four lines plus one Try example. The description is 963 characters, names ow-start at character 0, and no longer excludes internal meetings. Against that:<br>• the body is at 4,486 of 4,500 tokens, and the squeeze shows: the Writes column omits two STATUS writes (m9);<br>• the bare slash hints (`/ow-start-log-meeting`, `/ow-start-log-decision`) lead to undefined behaviour (m5). |

**Weighted Code Score:** 0.3×7 + 0.3×7 + 0.2×5 + 0.2×7 = **6.6 / 10**

**Verdict: FAIL.** Code Quality is below 6, and there are two major defects (D1, D2). Both are checker-side and small to fix. The skill text itself is close to ready.

### Test Results

| Run | Result |
|---|---|
| `node scripts/gen-skills-catalog.mjs` | exit 0: 36 oc- skills; ow catalog 3 skills |
| `node scripts/check-skill-contracts.mjs` | exit 0 |
| `node scripts/lint-internal-refs.mjs` | exit 0 |
| `node scripts/ow-start-acceptance.mjs` | exit 0: 45 golden runs (4 intake + 41 logs, dispatched) |
| `node scripts/ow-start-logs-acceptance.mjs` | exit 0: 41/41 |
| `node scripts/ow-build-plan-acceptance.mjs` / `ow-build-acceptance.mjs` | exit 0: 32 / 54 golden runs (the `categoryFindings` export breaks nothing) |
| `npx vitest run` (full) | 130 files, **3,002 passed, 9 skipped**, 0 failed. The skips predate this branch (environment gates and ow-build's decision-2 skips). The OW-08 files have 363 passed and 0 skipped |
| `npm run build` | exit 0 (`building opchain-dev worker @ a0c358a7`); `git status --porcelain` empty afterwards |
| oc- byte-identity vs a build of `90e61149` | `snapshot.sh` manifests (zip entries, 73 per-skill zips, `public/docs`, update bundle, `plugins/opchain/skills`, generated catalogs and flags): **1,473 lines, identical** |
| Intake goldens | `git diff 90e61149..HEAD` on the four intake cases, `workspace/` and `tests/ow-start-acceptance.test.js` is empty; all four pass |
| Body / description | body ~**4,486** tokens (17,943 chars; cap 4,500, 14 tokens of headroom); description 963 chars |
| Protocol copies, shared examples | `ow-protocol.md` identical in ow-start, ow-build and ow-build-plan; `examples/` unchanged |
| Not verified | `npm run evidence:pr`; the candidate verifier on every commit |

### Generator claims, verified

| Claim | Verdict |
|---|---|
| Untuned follow-up set: 11/15 recall, 0/15 FP | **True** (pinned in `tests/ow-start-logs-acceptance.test.js`). Of the four misses, **three are plain wording, so they are defects (m1):** "our hourly charge", "my day rate" and "I charge a premium". Only "take a small hit" is an idiom. My "I charge a premium for weekend deployments" was caught only by accident: "a premium for weekend" was read as a quantity of time. |
| Body ~4,486 tokens | **True.** 14 tokens of headroom; see OWNER-DECISION 1 |
| Extract self-check rules moved to `phase-extract.md` §7, unchanged | **True.** The five rules and the verdict paragraph are word for word as in base `SKILL.md`. They are reachable from the body (`SKILL.md:183`, plus the `/ow-start-extract` phase pointer at `:72`), and the old "Run the self-checks listed in SKILL.md" sentence is replaced |
| STATUS form `A-nn (<role>), no date` | A departure from protocol §5 (`awaiting: none, or <what> by <YYYY-MM-DD>`), recorded in build notes §11.2 #3. It is compatible with the ow-tools hook, which reads `due` as null and still shows the item, and with the siblings' resume rules, which key on `next:`. O2 ratified the amendment's `awaiting:` text, which has no undated form, so this needs ratifying (OWNER-DECISION 2). **Not a defect.** |
| `categoryFindings` export; ow-build goldens and plants pass | **True** (54/54 goldens; `ow-build-plants` green in the full run) |
| CHANGELOG records #605 and #616 | **True.** Both match `git show ce3dad43` / `691afdfe`, and both are pinned. Nit: "audit follow-ups #604" sits under 1.0.0, but #604 changed only the checker, not ow-start's text |
| O4 not done; not rebased onto OW-04 | Noted; not counted |

### Untuned sets (`h/untuned-sentences.mjs`, written before reading the checker, its sentence file or `self-checks-logs.md`)

| Set | Size | Result |
|---|---|---|
| Follow-up: OUR-side paraphrases (must flag) | 32 (28 plain, 4 implied) | **18/32 caught (56%)**. Plain: **17/28 (61%)**. Implied: 1/4 (accepted) |
| Follow-up: legitimate meeting and follow-up sentences (must pass): client dates, client figures, owners by role, decisions | 30 | **0/30 false positives**. Includes "Your staff spend about two hours a day…", "Your hourly pickup slots…", "Your current shipping rate to Canada…" and "Your average order is around 85 dollars" |
| People names (must flag) | 12 | **11/12 caught**. Miss: N02 "555-0142", a 7-digit local number |
| People controls (must pass) | 15 | **2/15 false positives**: P06 "Stoneware from Laguna arrives on Monday." (`<Name> from <Org>`) and P10 "cc: the studio owner" |
| Private names (must flag) | 12 | **10/12 caught**. Misses: V08 "llc ops" and V09 "llc_ops" |
| Private-name controls (must pass) | 5 | 0/5 false positives |
| STATUS lines, legitimate (must pass) | 12 | **0/12 false positives** (multi-word roles, `you`, no date, moved, reviewed, superseded, held, prep) |
| STATUS lines, bad (must fail) | 14 | **14/14 caught** |

Plain-wording OUR-side misses (m1):
- U01 "Our hourly charge…"
- U02 "My day rate covers…"
- U11 "I padded the estimate by 1.5x…"
- U15 "My rate goes up in January."
- U16 "…70% of the budgeted effort."
- U17 "The markup on the label stock is 15%."
- U19 "We will absorb the cost…"
- U20 "I will bill the extra review time separately."
- U21 "Our blended rate…"
- U25 "We are over budget…"
- U27 "I quoted this at a discounted rate."

Implied misses, accepted under D2:
- U28 "eating the overrun"
- U29 "under water"
- U30 "worked late on Sunday"

**Supplementary probes, found after reading the rules (not counted in the rates above):**
- "The extra workshop is at our day rate." slips. This is the skill's own example (`self-checks-logs.md:22`).
- `<Name> from <Org>` fires on 5 of 6 sentence-initial nouns: "Payments from Square", "Clay from Laguna", "Boxes from Uline", "Traffic from Instagram", "Glaze from Amaco".
- Roles with an acronym or apostrophe fail the STATUS grammar: "client CFO", "client IT lead", "client's bookkeeper".
- "llcops" slips.

### Plants

**81 evaluator items** in total:
- `h/plants.mjs`: 67 plants that must be caught, plus 5 legitimate edits that must pass (72);
- 2 probe cases;
- 7 malformed-file probes.

| Area | Result | Notes |
|---|---|---|
| C4 route table, every row and stage (R01–R36) | **32/36** | Every row is covered: prep first, items, unlogged (new id without asking; silent redo), business; log-meeting transcript, notes-only, recording-only, no add-on, speakers unconfirmed, resume follow-up, fully logged; `-extract` on `logs/`; no id prepared and none; log-decision offered, none-in-notes, review, no review, supersede open and closed; `-action` done, moved, reviewed, unknown, closed, wrong state; `-log` own and index, empty, business; `/ow-start`, `/ow-status`. **Slips: R28–R31 (D2)** |
| Writer modes (W01–W06) | 6/6 | `-log-meeting` writing `DEC-01.md`, `-prep-meeting` writing notes, `-log-meeting` ticking the agenda, `/ow-start` appending STATUS, `-log-decision` writing a follow-up, `-action` editing `DEC-01.md` |
| Resume cut at each `log_steps` step (S01–S04) | 4/4 | Steps roles, notes and checks write nothing until `notes.md`, so a cut there is a fresh run (the check-in golden). Cut after notes: rewritten `notes.md`. Cut in follow-up: no `.txt` twin. Cut in STATUS: held line dropped, held line duplicated |
| O2 closed lines and O3 awaiting line (O01–O04) | 4/4 | Superseded form on an action path; `meeting by <date>`; held line missing; held line with no prep line |
| C16 handling and `.gitignore` (G01–G03) | 3/3 | Handling written into `profile.md`; `.gitignore` written after a no; decline not recorded. **Probe `logs-zz-eval-declined` exposes D1a** |
| Follow-up clean in real runs (F01–F06) | 3 controls pass; **3/3 plants slip** (m1) | "our day rate", "My rate goes up", "over budget" |
| People and private names in real runs (N01–N05) | **1/5** | 7-digit phone slips; "Stoneware from Laguna" is a false positive; "llc ops" and "llcops" slip; "Deft Wright" on a screen is caught |
| O1 index rule in `check-skill-contracts` (I01–I08) | **4/7**, control passes | Caught: undocumented key `signed_by`, undocumented `budget`, a path the producer does not write, a prose-only cite. **Slip: `price`, `fixed_price` and `acceptance_note` accepted as index fields (D2b)** |
| Probe `logs-zz-eval-moveback` | the checker flags a correct append as a duplicate | m4 |
| Malformed (C17) | 7/7 fail per check | `agenda.md` as a folder, `DEC-01.md` invalid YAML, STATUS deleted, STATUS as a folder, binary `follow-up.html`, screen as a folder, invalid `brand.yaml` |

**Total: 54/67 plants caught; 4/5 controls clean.** Everything that slipped is listed in the defects below.

### Walking the user path

**Goldens walked, in order:** `logs-prep-first` → `logs-larkspur-checkin` (no id; the ow-tools transcript; waiver refused) → `logs-decision-from-meeting` (D1 picked, D2 left) → `logs-action-done` → `logs-log-index` → `logs-status-open` / `logs-status-after-done`, and the resume cases.

SKILL.md, the phase files, `logs-schema.md` §6 and `skill.edges.yaml` agree on paths, ids, writers, NEXT says and STATUS forms. **Disagreements:**
- **m7:** `self-checks-logs.md:3` says `-action` prints its self-check results. `logs-status-and-index.md:12` and all four `-action` goldens print none.
- **m9:** `SKILL.md:58` omits the held line, and `:60` omits the superseded closing line.
- **Nit:** `SKILL.md:57` lists purpose, length and attendees. The phase file also asks the date.
- **m5:** the bare slash hints lead to a path no text defines.

### Criteria C1–C20

| # | Verdict | Evidence |
|---|---|---|
| C1 | **PASS** | Catalog and contracts green. Writer modes are exact (edges `:25-33`). The Generator's 13 C1 plants hold, and my W01–W06 are caught at run level |
| C2 | **PASS** | 4,486 ≤ 4,500, enforced through `bodyTokenBudgets`. The 4,600-token and 1,025-character plants fail the catalog. The protocol copy and shared examples are identical. Headroom is OWNER-DECISION 1 |
| C3 | **PASS (gap)** | The four contracted plants and the control hold. Amount and name keys are accepted as index fields (D2b) |
| C4 | **PASS on goldens, PARTIAL for real runs** | Every cell has a golden and plants (my R01–R27 and R32–R36 are caught). Screen phrases are golden wording (D1b) |
| C5 | **PASS** | `logs-prep-items` has 5 sourced items and none closed or from business; R02 and R05 are caught |
| C6 | **PASS** | Timestamps within ±10 s with cited words; the embedded instruction is quoted, not followed; roles confirmed; R06, R07 and R10 caught |
| C7 | **PASS (gaps)** | Four parts in order, owners by role, no signature, the imported validator, the `.txt` twin, none for an internal meeting. Follow-up clean misses plain rate wording (m1) |
| C8 | **PASS** | Closed grammar 26/26 on my set; refusals list the open ids (R25). Acronym roles are rejected (m8) |
| C9 | **PASS** | Every field, the review line, supersede closing the old review, only the picked decisions, the working-note sentence. R16 and R18–R21 caught |
| C10 | **PARTIAL** | Copies nothing only for exact strings (D2a); the O1 rule allows amount keys (D2b) |
| C11 | **PASS** | Canaries both ways; R05 and R34 caught |
| C12 | **PASS (gaps)** | 32 controls, one plant per category, waiver golden. Untuned: 11/12 caught, 2/15 false positives (m2) |
| C13 | **PASS (gaps)** | Four contracted plants caught, waiver refused. "llc ops", "llc_ops" and "llcops" slip (m3) |
| C14 | **PASS** | `log_steps`; resume at follow-up and in STATUS; decisions offered only once; S01–S04 caught. Edge case: moving a date back (m4) |
| C15 | **PARTIAL (expected)** | Saved-screen goldens and pins pass (R35, R36). The O4 hook part waits on OW-03 |
| C16 | **PARTIAL** | Goldens for a repo without the lines, with them, and with no add-on; G01–G03 caught. A decline recorded earlier is inverted by the checker (D1a). No golden for the logs-only handling answer (m6) |
| C17 | **PASS** | 5 contracted plus 7 evaluator malformed probes: each fails only its own check, with a reason |
| C18 | **PASS** | Every contract plant is in `tests/ow-start-plants.test.js`, with no skips. My R1 plants must land there next round |
| C19 | **PASS** | oc- output identical; intake goldens unchanged and passing; ow-build-plan and ow-build goldens and plants pass; contracts green |
| C20 | **PASS** | 1.1.0 in frontmatter and body; changelog pinned; every new NEXT has its hint, `It will read:` and no-folder lines |

### Defects (round 1)

1. **[M] D1: the checker fails correct real runs.**
   - **a. The `.gitignore` question after a recorded decline is inverted.**
     - `phase-prep-meeting.md:10` and build notes §11.2 #7 say a decline recorded in a logs file of the workstream is not asked again.
     - `checkGitignore` (`scripts/ow-start-logs-acceptance.mjs:794-818`) has no branch for that. In a repo without the lines it always demands the question (`:813`).
     - **Repro:** probe `logs-zz-eval-declined` (base `logs-git-declined`, `-log-meeting business`, header `gitignore: declined`, no question asked) fails with "the run did not ask". The same run that asks again passes.
     - No golden covers the rule.
   - **b. Screen phrases are golden wording.** 31 of 92 `route.says` / `route.ask` / `screen.must` regexes are not in the skill text (`h/says.mjs`). A correct run in other words fails, and two `ask` regexes fail even the skill's own wording:
     - `logs-prep-unlogged` wants "Redo that agenda, or start a new meeting" (with the comma), while `phase-prep-meeting.md:9` says "redo that agenda or start a new meeting";
     - `logs-speakers-unconfirmed` wants "who is who, by role" (with the comma), while `phase-log-meeting.md:22` says "who is who by role";
     - other golden-only phrases include "Add them\?", "You said no", "You picked D1", "Nothing was written" and "colors does not".
   - **Fix:**
     - model the decline in `checkGitignore`, with a golden and a plant;
     - grade screens only on prescribed text (paths, NEXT lines, sentences the references prescribe) and on structure, or prescribe the wording in the references (OWNER-DECISION 3).
2. **[M] D2: "never an amount / copies nothing" is not enforced robustly (C10, C3, technical rule "never a body line or an amount key").**
   - **a. Exact strings only.** `checkIndex` (`:736-775`) compares unnamed header values and canaries as exact substrings (`:762`, `:768`). These slip:
     - R28: the CO price as "USD 2,600". The CO body itself writes "USD 2,600.00".
     - R29: "signed by Robin".
     - R30: part of `schedule_impact`.
     - R31: the Build Plan fee as "3,000".
   - **b. The O1 rule accepts amount keys.** `indexRowProblems` (`check-skill-contracts.mjs:690-712`) accepts `price`, `fixed_price` and `acceptance_note` (the user's name) as index fields (I01–I03). A named key is then excluded from the run check (`:759`), so a future row could show prices with every check green.
   - **c. No self-check.** No same-session self-check covers `-log`: the `self-checks-logs.md` table has no row that runs in `-log`.
   - **Fix:**
     - match amounts by value, ignoring currency and commas;
     - refuse any money amount and the user's name on the `-log` screen;
     - in O1, refuse amount-shaped keys (`price`, `*_price`, `fee`, `amount`, `payments`, …) and `*_note` keys.
3. **[m] m1: Follow-up clean misses plain rate and charge wording with no amount.** `OUR_MONEY` (`ow-build-acceptance.mjs:561`) needs "our" directly before "rate/charge/fee" and has no "my". It misses:
   - the skill's own example "our day rate" (F01);
   - "My rate goes up" (F02);
   - "over budget" (F03);
   - 11 of my 28 plain untuned sentences;
   - 3 of the Generator's 4 untuned misses.
   **Repro:** `node h/untuned.mjs`; `h/plants.mjs` F01–F03.
4. **[m] m2: People by role.**
   - `PHONE` (`:291`) misses 7-digit numbers (N01).
   - `NAME_FROM_ORG` (`:293`) fires on any sentence-initial noun before "from <Capitalised>" (N02, plus 5 of 6 supplementary probes). `NOT_A_NAME` (`:292`) is an exception list.
   - A `cc:` line holding only a role is flagged (P10).
   - Under O8, these false positives become controls this round.
5. **[m] m3: Private names, which can never be waived.**
   - `checkPrivateNames` joins each character (`:686`), so the literal hyphen is required: "llc ops", "llc_ops" and "llcops" slip (N03, N04).
   - The catalog's own rule (`check-skill-contracts.mjs:510`) catches all three.
   - The names are copied into all 41 answer keys instead of being read from `catalogs.json` `privateNames` and `brandNames`.
6. **[m] m4: The dedupe rule blocks moving a date back.** `logs-schema.md:164` skips a line when the same path, `next:` and `awaiting:` appear anywhere in STATUS. After A-01 moves to 10-23, `A-01 moved 2026-10-16` is skipped, and resume shows the wrong due date.
   - The checker flags the correct append as a duplicate (probe `logs-zz-eval-moveback`).
   - **Fix:** compare with the item's newest line.
7. **[m] m5: No rule for a missing workstream.**
   - Only `phase-prep-meeting.md:7` asks for the workstream. `phase-log-meeting.md:7`, `phase-log-decision.md` and `logs-status-and-index.md` §1–2 do not.
   - The NEXT slash hints are bare verbs, so `/ow-start-log-meeting` alone, with `MTG-02` prepared in two workstreams, is undefined.
   - A bare `/ow-start-log-decision` lands in "on its own" mode instead of offering the meeting's `D<n>`.
   - No golden covers either case.
8. **[m] m6: The logs-only handling answer is untested.** The rule is asked once, recorded in the logs header, and read back from the newest logs file (`phase-prep-meeting.md:8`; build notes #6). It has no golden, plant or check, and the shared `profile.md` always has `handling`.
9. **[m] m7: `-action` self-check printing.** `self-checks-logs.md:3` says `-action` prints its results ("No client text in STATUS", which can never be waived). `logs-status-and-index.md:12` and the four `-action` goldens print none.
10. **[m] m8: Acronym roles fail the STATUS grammar.** `ROLE` (`:316`) is lower-case only, so "client CFO", "client IT lead" and "client's bookkeeper" fail the closed grammar and the agenda attendee check. The text never says roles are lower-case. Found after reading the rules.
11. **[m] m9: Body Writes column drift.** `SKILL.md:58` omits `-log-meeting`'s held line, and `:60` omits `-log-decision`'s superseded closing line. Both are in `logs-schema.md` §6 and in the edges. This is the cost of the budget squeeze.
12. **Nits.**
    - `phase-log-meeting.md:8` covers "both follow-up files missing", not one.
    - `SKILL.md:57` omits "date".
    - The description dropped the trigger phrase "turn this transcript into a client recap" (REL-01).
    - The changelog credits #604 under 1.0.0.
    - The index golden lists `CO-02 · status: draft` under Decisions, though the reference's kind is "signed or declined".

### OWNER-DECISIONs

1. **ow-start's body budget.**
   - **Today:** 4,486 of 4,500 tokens, or 14 tokens of headroom.
   - **What is coming:**
     - S1 (care-takeover path, Sprint 4b) is a hand-off to a family skill. The edges rules require a body Hands-off row and a NEXT template for it, about 150–250 tokens.
     - S2 and S3 add recap hand-off fields.
     - m9 is already a symptom of the squeeze.
   - **Options:**
     - (a) raise ow-start's cap to the catalog's 5,000 now;
     - (b) keep 4,500 and require a body trim before S1, for example `/ow-setup`'s steps and "Works on its own" into a reference (about 300 tokens);
     - (c) decide at S1.
   - **Recommendation:** (b), with (a) as the fallback.
   - **Also confirm versioning.** The sprint plan's roll-up puts S1–S3 under "ow-start → 1.1.0", but D5/O9 bumps any SKILL.md change. So S1–S3 ship as 1.2.0 or later.
2. **Ratify `awaiting: A-nn (<role>), no date`.**
   - It departs from protocol §5's `<what> by <YYYY-MM-DD>`, and O2 ruled only on the amendment's forms.
   - It is compatible with the hook and with the siblings' resume rules.
   - **Recommendation:** ratify, and record it in `skills-work/README.md` as a logs-only form (protocol v1 stays byte-identical).
3. **How real-run screens are graded (REL-02).** Options:
   - (a) grade only prescribed text and structure;
   - (b) prescribe the exact wording of refusals and questions in the references, then grade it exactly.
   **Recommendation:** (a), with (b) only for the questions a check depends on (the redo-or-new question, the role question, the `.gitignore` question).
