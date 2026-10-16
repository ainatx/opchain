## Sprint 2 — Evaluation Round 3

**Sprint:** ow-build 1.0.0 (contract `sprints/release-2.1/ow-sprint-2/contract.md`, C1–C12, C12 = B4) · **Branch:** `claude/ow-build-sprint-2`, head `c317a2f70f96af393e9fe05db794447ee7ae4b5d` (round-3 commits `3916666c`, `6db184dc`, `c317a2f7`) · **Evaluator:** skeptical Evaluator, oc-app-architect Phase 6 Step 3 · **Date:** 2026-10-16

I graded against the contract, the design (§10, §12, §12.7 and §13 rows 1–25), and the round-2 report (D1–D13). For each Generator claim I read the cited lines. I worked in a detached checkout (`<EVAL>/tree`). Prior-state plants ran against a copy of the checker and fixtures (`<EVAL>/alt`, its `node_modules` linked to the tree's). No tracked file was touched. Both evaluation worktrees are removed.

### Code Scores

| Criterion | Weight | Score | Justification |
|---|---|---|---|
| Functionality | 30% | **7/10** | Every round-2 text defect is fixed:<br>• **D2:** a request is settled only by a change order or a settled row; an `unpriced` row is re-priced with `(again: R-nn was unpriced)`.<br>• **D3:** `start_steps` resumes at the first missing step.<br>• **D10:** a stopped milestone gets its own route step, and `-run` STATUS names the milestone.<br>• **D11:** booking is invoiced before an unfinished `-start`.<br>• **D9:** the slash hints are back.<br>• **D12:** ow-build-plan records the UAT intake.<br>• **D13:** the drift is fixed.<br><br>What still costs real runs:<br>• **Over-broad self-check categories.** The skill's own list (`references/self-checks.md:14`) now forbids "any number of … days, weeks" and "a percentage outside the payment schedule" in every client output, unless it is a payment term, a Schedule or a moved date. A model following it must treat "your testers will have two weeks", "about an hour of your coordinator's time" or "98% of the sampled codes matched" as findings (R3-1).<br>• **A small resume gap:** the §2 working-demo answer is not persisted before `ledger` (R3-6). |
| Feature Completeness | 30% | **8/10** | 54 goldens, including:<br>• `change-sent`, `change-declined`;<br>• `change-uat-unpriced`, `change-uat-repriced`;<br>• `start-resume-spec`;<br>• ow-build-plan `follow-on-uat`, `follow-on-uat-offer`.<br><br>267 ow-build tests and 2,070 in the full suite, all green. Design §13 rows 20–25 record the round-3 rules. Nothing contracted is missing. |
| Code Quality | 20% | **5/10** | **Recall:** the checker catches every earlier plant, and 56% of my untuned D1 paraphrases (18 of 32, excluding the owner-decision U11 class).<br>**Precision:** on legitimate sentences it is poor. **21 of 34** realistic client or status sentences are falsely flagged. The 54 goldens pass because their wording happens to avoid the shapes the rules flag. For example, the goldens say "due within 14 days" (the one exempt form), use the simple past "We agreed with…" (not "We have agreed"), and use "move back by the same number of days".<br>**Writer modes and contrast:** fixed and enforced.<br>**Small gaps:** `UAT 03` with a space, `--sent` changing other fields, `rgba()` alpha, and missing guards for the D9/D10 conventions. |
| UX (clarity for person and model) | 20% | **6/10** | Body ~4,338 tokens (under the 4,500 cap). The tables agree with the edges, hints are present, and the routing reads cleanly.<br>The new self-check text is clear but too strict for normal client email. It allows only "paperwork and the future" around an unsigned change order (`self-checks.md:10`), yet the checker flags "will be built once the amendment is signed" and "We have attached change order CO-01". The model and the checker disagree, and the checker is stricter than the text it implements. |

**Weighted Code Score:** 0.3×7 + 0.3×8 + 0.2×5 + 0.2×6 = **6.7 / 10**

### Test Results

| Run | Result |
|---|---|
| `node scripts/gen-skills-catalog.mjs` | exit 0: 36 oc- skills, 3 ow skills |
| `node scripts/check-skill-contracts.mjs` | exit 0 |
| `node scripts/lint-internal-refs.mjs` | exit 0 |
| `node scripts/ow-start-acceptance.mjs` / `ow-build-plan-acceptance.mjs` / `ow-build-acceptance.mjs` | all exit 0; ow-build **54/54** golden runs |
| `npx vitest run` (full, after `site` `npm ci` and the build) | 114 files, **2,070 passed / 0 failed** (ow-build-acceptance + ow-build-plants: 267) |
| `npm run build` | exit 0 (`building opchain-dev worker @ c317a2f7`); `git status --porcelain` empty afterwards |
| C10 vs merge base `6c31e9ed` | Contents identical for `opchain-skills.zip`, all 73 `public/skills/*.zip`, `public/docs`, `plugins/opchain`, `src/generated/mcp-catalog.json`, and the `dist/` file set. The only byte differences are the zip container timestamps and the `generatedAt` stamp in `public/demo/index.html`. `git diff 6c31e9ed HEAD -- skills/ plugins/opchain/ src/ site/ package*.json build.mjs` is empty |
| Body tokens (chars/4) | ow-build **4,338** (17,350 chars), under the 4,500 catalog cap |
| Protocol copies | identical, `65508e8d…` |

### Generator claims, verified

| Claim | Verdict |
|---|---|
| 51/51, 20/20 | **True.** Two of my round-1 harness lines needed re-aiming because the text changed: C08 at the new `-run` STATUS form, and N28 at the quoted `"signed …"` history line. Both are then caught. |
| 38/38 + 6/6 controls (plant2) | **True** |
| 14/14 + 3/3 controls (plant-contracts2) | **True.** My two new guards K18 and K19 slip (R3-5) |
| D2 settled-row key; unpriced → re-priced | **True.** `phase-change.md:15`, `routing-and-resume.md:39,58,70`, `SETTLED` (`scripts/ow-build-acceptance.mjs:1925`). `repro-unpriced.mjs` now routes to `-change`; goldens `change-uat-unpriced`/`-repriced` |
| D3 `start_steps` | **True.** `phase-start.md:10-11,31-35,49,56`, `build-yaml-schema.md:42`; golden `start-resume-spec`. Gap R3-6 |
| D1 category rules (`:527-560`), coverage of a done claim, pronoun following | **Present as described.** Coverage of a done claim works (X05 and X06 pass; N14 is caught). The pronoun window works (N15 caught). Precision is the problem (R3-1) |
| Untuned 15/17 on its own set | **Plausible but optimistic.** On my untuned set: **18/32** (plus the U11-class F29). The Generator's set has no false-positive controls |
| 2,070 tests; ~4,338 tokens | **True** |

### Criteria C1–C12

| # | Verdict | Evidence |
|---|---|---|
| C1 | **PASS** | Catalog and contracts green. Reads of phase files and producer fields are now checked (K01, K04 caught). `routes.paths` includes `plans/<client>/`. Writers are mode-exact (`scripts/ow-build-acceptance.mjs:1902`) |
| C2 | **PASS** | 4,338 < 4,500, enforced by the catalog; protocol identical |
| C3 | **PASS** | K09 "llc ops" and K11 "fifteen hundred dollars" are now caught; no private, oc- or builder names in skill text |
| C4 | **PASS** | All route goldens pass (signed plan, UAT, FIX, trigger files, folder stages, re-priced unpriced). Settled spellings caught: no-`.md` path (O02), too big (O03), unpriced passes (O04). Minor: `UAT 03` with a space (R3-4) |
| C5 | **PARTIAL** | Recall 18/32 untuned (R3-2); precision 21/34 false positives on legitimate sentences (R3-1); U11 carve-out (OWNER-DECISION 1) |
| C6 | **PASS** | 54 goldens; every §10 case except Real use |
| C7 | **PASS** | Unchanged goldens pass |
| C8 | **PASS (with slips)** | Gate catches "partly built", "We have been laying out", a pronoun in the next sentence, "groundwork", "already", a declined or signed prior status, and history rewrites. Slips: "an early version" (F32) and "exist in draft" (F33). False positives: "We have attached change order CO-01" and "will be built once the amendment is signed" (X20, X21) |
| C9 | **PASS** | Unchanged |
| C10 | **PASS** | See Test Results |
| C11 | **PASS** | 8 of 8 malformed probes (`malformed.mjs`) fail per check with a reason; no crash |
| C12 | **PASS** | Unchanged, plus N44 (quoted separately) caught |

### Round-2 defects D1–D13

| # | Status | Evidence |
|---|---|---|
| D1 | **Recall improved, precision lost** | Category rules at `scripts/ow-build-acceptance.mjs:521-570`. See R3-1 and R3-2 |
| D2 | **Fixed** | as above |
| D3 | **Fixed** (gap R3-6) | as above |
| D4 | **Fixed** | `verbMatches` exact (`:1902`); N18–N20 and O10 caught |
| D5 | **Fixed** (gap R3-3) | `co_move` check; goldens `change-sent` and `change-declined`; N28, N29, N42, N43 and O12 caught |
| D6 | **Fixed** (gap: `rgba()`) | Inherited colour, nearest background, `#rgb`, `rgb()` and named colours (O13, O14, N31–N34 caught); `rgba()` alpha slips (O15) |
| D7 | **Fixed** (gap: a space) | `requestIds` (`:1923`) matches a bare id with or without `.md`; `UAT 03` slips (O01) |
| D8 | **Fixed** | K01, K04, K09, K11 and K16 caught |
| D9 | **Fixed** in text | `SKILL.md:199-200`. Not guarded (K18 slips) |
| D10 | **Fixed** in text | `routing-and-resume.md:93`, `phase-run.md:41-44`. Not guarded (K19 slips) |
| D11 | **Fixed** | `routing-and-resume.md:88-89`; probe: `start-resume` from the folder now routes to `-invoice` first |
| D12 | **Fixed** | ow-build-plan `phase-start.md:9` writes `intake:` with the file as spelled; `phase-offer.md` handles "no FIX or UAT file"; goldens `follow-on-uat`, `follow-on-uat-offer` |
| D13 | **Fixed** | `SKILL.md:100-101` split; the price-book reads row includes `documentation_training.per_extra_group_of_15`; duplicate sentence removed |

### Is the category approach over-broad? Yes.

I wrote 34 legitimate sentences of the kind a weekly update, demo summary, change order, invoice request or `spec/` file naturally contains, and put each in the section where it belongs. Where a golden needs it, the sentence has a trace row. Each is graded only on findings the untouched golden does not have. **21 of 34 are falsely flagged.**

| Shape | Falsely flagged (rule) |
|---|---|
| A duration that is the client's or the schedule's, not our effort | X07 "check for new orders every 15 minutes"; X10 "send the corrected codes within a week of this email"; X11 "your testers will have two weeks for acceptance testing"; X19 "the milestone 1 demo is in two weeks"; X09 "about an hour of your order coordinator's time" (old `hours` term); Y02 "45 minutes with your bookkeeper" (`TIME_QTY`, `TIME_FIELD` `:540` exempts only "due within N days", a Schedule section or a moving date) |
| Payment terms worded otherwise | X01 "due 14 days after the invoice date"; X02 "payable within two weeks of the invoice". The invoice check also demands the template's exact wording, so these are partly template-bound |
| A client's own figure or business rule | X08 "Orders over $500 will wait for your approval" (it also hits the price-book value 500.00 by coincidence); Y01 the same with $750 (`MONEY_QTY`) |
| A client-fact ratio or position | X12 "roughly a third of your September orders"; X13 "the exceptions list will sit on top of the order sheet"; X14 "your order volume doubled in December"; X17 "98% of the sampled product codes matched" (`RATIO` `:534`) |
| The client's own money words | X15 "stock losses stay in your stock sheet"; X16 "each order line shows the list price from your catalogue" (`OUR_MONEY` `:536`) |
| A client action in the present perfect, traced to a note | X03 "Your order coordinator has sent the corrected product codes"; X04 "We have agreed the demo date with your operations manager"; Y03 "Your operations manager has approved the list of email customers" (`completionClaim` `:546`: any `has <verb>ed` is a done claim) |
| Paperwork or the future about an unsigned CO | X20 "We have attached change order CO-01 … before any work"; X21 "Stock on hand will be built once the amendment is signed" (`underWay` `:555`: "attached" is not on the paperwork list; a future "built" counts as started) |

Passed (13): X05 and X06 (real done claims traced to the covering report), X18 (the fixed price), X22 and X23 (client facts in `spec/`), X24 ("costs your team a reshipment"), X25, and Y04–Y08 (meetings, "we start … on Monday", "moves back by the same number of days", thanks, "twice a week").

**Do the 54 goldens pass only because they avoid normal phrasing?** Largely, yes. Each golden email happens to use the one exempt form ("due within 14 days", the simple past, "move back by the same number of days"). None contains a duration from a client's schedule, a client figure, a client ratio, or a present-perfect client action. All of these are common in real status emails.

### Untuned D1 paraphrases (`fresh3.mjs`, written before reading the Generator's set)

**18 of 32 caught** (F29, the U11 class, is excluded).

| Category | Caught | Slipped |
|---|---|---|
| Time/effort (6) | F01 "the better part of a week", F05 "forty developer hours", F06 "a solid week" | F02 "ate up most of Tuesday and Wednesday", F03 "at it until midnight twice", F04 "a long slog of late nights" |
| Money (4) | F08 "US$600", F09 "two grand", F10 "1,200 of the build's money" | F07 "priced at eighteen hundred" |
| Ratio (4) | F11 "up by a quarter", F14 "125 percent" | F12 "twenty-five percent" (`RATIO` has no number-word percent), F13 "half as much again" |
| Our money (5) | F15 "cover our time", F16 "over what we allowed" | F17 "not making us anything", F18 "in the hole", F19 "longer than we bargained for" |
| `spec/` (5) | F20 balance, F21 percent, F22 dollar, F24 billed | F23 "the second tranche follows the demo" |
| Done (4) | F25 "can now print", F27 "has stopped dropping lines" | F26 "the problem is gone", F28 "got the link behaving" |
| Started (4) | F30 "partly built", F31 "have been laying out" | F32 "an early version", F33 "exist in draft" |

**Other fixes (`fresh3.mjs` O01–O15): 11 of 14 caught.** Slipped: O01 `UAT 03`, O11 `--sent` changing the price, O15 `rgba()`. O04 (an unpriced row) correctly allows re-pricing. O05 shows that a declined CO's request stays settled; this is consistent with the text, and for information only.

### OWNER-DECISIONS (not defects)

1. **The U11 carve-out under C5 ("matched by meaning").** A marker-less statement such as "Your invoices match the orders exactly" or "Packing slips print straight from the order" (F29) has no surface feature that tells a regex it asserts completion. A mechanical checker cannot catch it without flagging every descriptive sentence. Moving it to the same-session self-check (`references/self-checks.md:16`) is a **reasonable and honest** boundary, and I recommend the owner accept it.
   - But the same argument applies to the 14 recall slips above, and to the precision limit.
   - The owner should restate how C5 is verified: the checker as a regression net for known shapes, plus the model's self-check (or a later LLM-judge) for meaning.
   - Without that restatement, C5 as literally written ("matched by meaning", verified by planted paraphrases) cannot be met by any word- or shape-based checker.
2. **How strict client wording should be.** The skill text now bans every duration and every non-payment percentage from client outputs. Banning effort is clearly right. Whether a client's own schedule durations ("two weeks of testing"), client ratios ("98% matched") and client money facts may appear in an update is a business-voice choice. The owner should decide; the rules should then be narrowed to match (R3-1).

### New defects (round 3)

1. **[M] R3-1: the category rules are over-broad, so correct runs fail.** 21 of 34 legitimate sentences are flagged (table above).
   - **Checker:** `TIME_QTY`/`TIME_FIELD` (`scripts/ow-build-acceptance.mjs:530,540`) treat any duration as our effort. `RATIO` (`:534`) flags "on top", "doubled", "a third of your…" and any non-payment percentage. `OUR_MONEY` (`:536`) flags "losses", "list price" and "charged". `completionClaim` (`:546`) treats any present perfect as a done claim. `underWay` (`:555`) flags paperwork verbs off its list and the future tense.
   - **Skill text:** `self-checks.md:14` encodes the duration and percentage bans. The checker is stricter than `self-checks.md:10` ("only the paperwork … and the future may appear").
   - **Repro:** `node fresh3.mjs`, X01–X25 and Y01–Y08.
   - **Fix:**
     - Time and money hits count only with a first-person effort or cost subject (we/I/our/us, "took", "spent", "went into").
     - Exempt second-person or client subjects (your/the client's), schedule sentences with a date, and "within/in N <unit>" before a deadline.
     - Ratios count only next to price, charge or cost words.
     - The present perfect counts as done only when the subject is the system or feature, not a person.
     - `underWay` should skip future and modal clauses.
     - Add these 34 sentences as must-pass goldens.
2. **[m] R3-2: D1 recall residue.** 14 of 32 untuned paraphrases slip (table). Cheap wins:
   - number-word percentages in `RATIO`;
   - "bargained/reckoned/counted on" in `OVER_PLAN`;
   - "early version", "in draft", "mock-up" in `underWay`;
   - "tranche" in `SPEC_MONEY`.

   The rest are idioms. See OWNER-DECISION 1.
3. **[m] R3-3: `--sent` may change other fields.** The rule "changes nothing else of the change order" (`phase-change.md:93`) is not checked for `--sent`: O11 changes the price on a `--sent` run, and it passes.
4. **[m] R3-4: priced-once misses a spaced id.** `requestIds` (`:1923`) misses `UAT 03` (O01).
5. **[m] R3-5: some round-3 conventions are unguarded.**
   - `rgba()` alpha is ignored by contrast (O15).
   - check-skill-contracts does not guard the D9 slash hint (K18) or the D10 `awaiting: M<n> …` form (K19).
6. **[m] R3-6: the working-demo answer is not persisted on resume.**
   - **What happens:** `phase-start.md:20` asks which milestone's demo the working-demo payment follows, and only `ledger.md` records the answer (§4). `build.yaml` has no key for it (`build-yaml-schema.md`). Yet `build.yaml` is first written after §3 with `start_steps: [answers]` (`:31`).
   - **Effect:** a `-start` cut off between §3 and §4 resumes at `ledger` with the answer lost, and §4 does not say to ask again.
   - **Fix:** record it in `build.yaml` with the answers, or have the `ledger` step re-ask it.

### Plant counts (round 3)

| Harness | Result |
|---|---|
| `plant.mjs` (round 1) | 51/51 caught |
| `plant-contracts.mjs` (round 1) | 20/20 caught (C08 re-aimed) |
| `plant2.mjs` (round 2) | 38/38 non-control + 6/6 controls caught (N28 re-aimed) |
| `plant-contracts2.mjs` (round 2 + 2 new) | 14/16 non-control caught (K18, K19 slip) + 3/3 controls |
| `malformed.mjs` | 8/8 per check, no crash |
| `probe2.mjs` (folder route on every larkspur golden) | Correct routes accepted; new-request pricing and an unpaid-booking resume correctly rejected |
| `repro-unpriced.mjs` | Now routes to `-change` (D2 fixed) |
| `fresh3.mjs` (new, untuned) | D1: 18/32 caught (+ U11-class F29); other fixes: 11/14; false-positive controls: **13/34 pass** |

### Verdict: **FAIL**

Code Quality (5) is below 6, and one major defect remains (R3-1, false positives). The skill text is in good shape: every round-1 and round-2 text defect is fixed, and the remaining text issues are minor (R3-6). What blocks the gate is the acceptance checker's precision. To pass:

1. **R3-1:** narrow the categories by subject, tense and position, and add the 34 realistic sentences as must-pass goldens.
2. **The owner rules on OWNER-DECISIONS 1 and 2** (U11 and the verification standard for C5; client-voice strictness).
3. **Minors:** R3-2 to R3-6.
