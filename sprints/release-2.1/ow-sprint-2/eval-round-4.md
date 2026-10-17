## Sprint 2 — Evaluation Round 4 (final)

**Sprint:** ow-build 1.0.0 (contract `sprints/release-2.1/ow-sprint-2/contract.md`, amended 2026-10-16 with owner decisions 1 and 2) · **Branch:** `claude/ow-build-sprint-2`, head `59817a8af9de111f09b525cee4e5a027c806cb62` (round-4 commits `0af8c71c`, `47097ff8`, `59817a8a`) · **Scope:** R3-1 to R3-6 · **Evaluator:** skeptical Evaluator, oc-app-architect Phase 6 Step 3 · **Date:** 2026-10-16

**Standard applied.**
- **Owner decision 1:** an internal number is OUR side only (our effort and hours, our rates and costs, price lines and modifiers, margin, profit or loss, and overruns against our own plan). The client's schedule, figures, ratios, payment terms and dates are allowed.
- **Owner decision 2:** C5 is verified by the checker as a regression net (every evaluator plant plus must-pass false-positive controls) together with the skill's self-check. The U11 carve-out is accepted, and idioms the checker cannot catch are not defects.
- **Severity under decision 2:** checker gaps on *new, untuned* sentences are grown into the net, not graded as failures of the sprint goal. I grade them minor unless they show the skill text itself is wrong.

**Where I worked.** A detached worktree, `<EVAL>/tree`, with prior-state plants in `<EVAL>/alt`. The Generator's worktree was not touched. Both of my worktrees are removed.

**Harness fix.** The Generator was right that my harness corrupted inserted sentences. Every `` `$1…` `` template replacement in my harness now uses a function replacer, and `spec()` inserts through a function too, so a sentence containing `$1,200` is inserted literally (L31 checks this).

### Code Scores

| Criterion | Weight | Score | Justification |
|---|---|---|---|
| Functionality | 30% | **8/10** | The skill text implements decision 1 clearly. `references/self-checks.md:14` lists our-side categories with examples, explicitly allows the client's schedule, people's time, figures, ratios and payment terms, and says a duration of build work is banned only when it shows our effort. A person's deed is not a done claim (`:16`). Paperwork ("attached") and the future may appear around an unsigned CO (`:10`). R3-6 is fixed in text (`phase-start.md:20`, `build-yaml-schema.md:20`). R3-3 is tightened ("no other change order", `phase-change.md:93`). Every round-1 to round-3 fix still holds (all harnesses re-run). |
| Feature Completeness | 30% | **8/10** | 54 ow-build goldens, ow-build-plan 30, ow-start 4. The full suite has 2,160 tests passing and 7 skips. Each skip names decision 2 (F02, F03, F04, F07, F26, F28, F29). My 34 round-3 legitimate sentences are now must-pass controls. Contract C5 and design §13 record the owner decisions. One skip label is wrong: F07 "priced at eighteen hundred" is labelled an idiom but is a plain price in words with a pricing verb (R4-3). |
| Code Quality | 20% | **6/10** | As a regression net it is complete: every known plant is caught and all 34 known controls pass. On my **new untuned** sets it is moderate:<br>• **OUR-side recall:** 16/27, of which 14 are caught by an internal-number rule.<br>• **False positives:** 12/31 legitimate client sentences are flagged under decision 1, plus 2 borderline.<br><br>The round-4 narrowing is partly fitted to the round-3 sentences. `PRICE_CTX` (`scripts/ow-build-acceptance.mjs`) treats "line/lines", "usual", "alone", "integration", "report", "messy" and "add" as price context. So a client ratio such as "a third of the stock lines" or "twice the usual month" is still read as a modifier. The guards K18 and K19 work and don't misfire. Malformed files fail per check. |
| UX (clarity for person and model) | 20% | **7/10** | Body is ~4,348 tokens (cap 4,500). Every NEXT carries its slash hint, including ow-start's intake NEXT, which the new K18 guard found missing. `-run` STATUS lines name the milestone. The decision-1 wording gives the model concrete allowed and forbidden examples. |

**Weighted Code Score:** 0.3×8 + 0.3×8 + 0.2×6 + 0.2×7 = **7.4 / 10**

### Test Results

| Run | Result |
|---|---|
| `node scripts/gen-skills-catalog.mjs` | exit 0: 36 oc- skills, 3 ow skills |
| `node scripts/check-skill-contracts.mjs` | exit 0 |
| `node scripts/lint-internal-refs.mjs` | exit 0 |
| ow-start / ow-build-plan / ow-build acceptance | exit 0: 4 / 30 / **54** golden runs |
| `npx vitest run` (full) | 114 files, **2,160 passed, 7 skipped**, 0 failed; each skip names owner decision 2 (`tests/ow-build-plants.test.js:503-506`) |
| `npm run build` | exit 0 (`building opchain-dev worker @ 59817a8a`); `git status --porcelain` empty afterwards |
| C10 vs merge base `6c31e9ed` | Contents identical for `opchain-skills.zip`, all 73 `public/skills/*.zip`, `public/docs`, `plugins/opchain`, `src/generated/mcp-catalog.json`, and the `dist/` file set. The only byte differences are the zip container timestamps and the `generatedAt` stamp in `public/demo/index.html`. `git diff 6c31e9ed HEAD -- skills/ plugins/opchain/ src/ site/ package*.json build.mjs` is empty |
| Body tokens (chars/4) | ow-build ~4,348 (17,389 chars) < 4,500 |
| Protocol copies | identical, `65508e8d…` |

### Generator claims, verified

| Claim | Verdict |
|---|---|
| R3-1 to R3-6 fixed | **True** for the cases raised (details below) |
| 0/34 of my round-3 legitimate sentences flagged | **True** (`fresh3.mjs`: 34/34 pass) |
| fresh3 recall 26/32 (not untuned) | **True**: 26/32 excluding the U11-class F29. The slips are exactly the 7 skipped ids |
| K18/K19 guards added | **True.** K18 and K19 are caught. Misfire probes (`misfire.mjs`): Z01 (a "say …" prose line in an ow-build-plan phase file) is clean, Z02 (ow-start prose quoting a NEXT) is clean, and Z04 (an ow-build-plan STATUS template; `statusNames` is scoped to `/ow-build-run`) is clean. Z03 (an ow-build-plan NEXT that loses its hint) is correctly flagged. K18 did find a real omission in ow-start's intake NEXT, which this round fixed (`skills-work/ow-start/SKILL.md`) |
| 2,160 tests pass, 7 skips naming decision 2 | **True** |

### R3 defects

| # | Status | Evidence |
|---|---|---|
| R3-1 over-broad categories | **Fixed for the cases raised.** Narrowed by attribution: `OURS`, `EFFORT`, `PRICE_CTX`, `FUTURE_PLAN`, `DATED`, `PERSON`; `termsDays`; mode-exact frequency exclusion. Untuned residue: R4-1 |
| R3-2 recall residue | **Improved.** Number-word percent, "bargained/reckoned", "early version/in draft/mock-up", "tranche" and "as much again" are now caught; idioms are skipped under decision 2 |
| R3-3 `--sent` changes other fields | **Fixed.** `MOVE_KEYS` and a "no other CO rewritten" check; O11 caught |
| R3-4 `UAT 03` | **Fixed.** `requestIds` allows a space; O01 caught |
| R3-5 `rgba()` and unguarded conventions | **Fixed.** Alpha is blended over the background behind it: O15 is caught, and V05 (an opaque-enough `rgba`) passes. K18 and K19 are caught |
| R3-6 working-demo answer lost on resume | **Fixed.** `phase-start.md:20` and `build-yaml-schema.md:20`; the checker asserts `build.yaml` `working_demo` and its match with the ledger (V01 and V02 caught) |

### New untuned sets (`fresh4.mjs`, written before reading the round-4 checker)

**OUR-side internal numbers: 27 plants, 16 caught.** G04 and G18 were caught only by the done-claim check ("working weeks", "has blown"), so the internal-number rules alone catch 14/27. Of the 11 slips, 3 are idioms or implied meaning and are not defects under decision 2 (G03 "three solid days of graft", G13 "costs more to build than its share of the price", G14 "the job is underwater"). The other 8 are plain wording, R4-2:

| Id | Our-side sentence | Why it slips |
|---|---|---|
| G06 | "Robin put roughly a week and a half into the import." | The user's own name is not read as "us", though the answer key and STATUS name the user |
| G08 | "charged as one standard integration plus one report" | Price lines named without a number |
| G11 | "the total is multiplied by 1.2" | "multiplied by" is not in `RATIO` |
| G17 | "ran well beyond our original estimate" | An adjective breaks "our estimate" |
| G21 | `spec/`: "Effort estimate: about three weeks of development." | **No effort or time rule runs on `spec/` at all** (`SPEC_TERMS` and `SPEC_MONEY` are money only) |
| G23 | `spec/`: "sized at two to three integration units" | Price-book sizing |
| G24 | "This milestone took the two of us most of a month." | The frequency exclusion drops "most of **a month**" as if it were "a month" per month, and "took the two of us" is not "took us" |
| G27 | "We underquoted milestone 1." | Not in the vocabulary |

Caught: G01, G02, G05, G07, G09, G10, G12, G15, G16, G19, G20, G22, G25 and G26, plus extra probes V03 and V04.

**Legitimate client sentences (decision 1): 31 sentences, 17 pass; 12 clear false positives and 2 borderline.**

| Id | Legitimate sentence | Flagged by |
|---|---|---|
| L04 | "We tested the import on a week of your October orders." | `OURS` + a duration: test data volume read as our effort |
| L27 | "We reviewed two weeks of your September orders with your coordinator." | same |
| L29 | "Today your team spends about two hours a week updating the stock sheet." | `EFFORT` "spends": the client's effort read as ours |
| L07 | "Each order line keeps the unit price from your own price list." | The old "unit price" term: the client's own prices |
| L09 | "Your December volume is roughly twice the usual month." | `RATIO` + `PRICE_CTX` "usual" |
| L10 | "Your team re-keys about a third of the stock lines by hand today." | `RATIO` + `PRICE_CTX` "lines" |
| L13 | Invoice request: "due a fortnight after the invoice" | `termsDays` does not parse it, so the invoice check fails |
| L14 | Invoice request: "to be paid within 14 calendar days of the invoice" | same |
| L15 | Invoice request: "on 14-day terms from the invoice date" | same. Mitigation for L13–L15: `phase-invoice.md:41` prescribes "due within <n> days of the invoice", so a model following the template is not affected |
| L17 | "The order coordinator has signed off the corrected product codes." | `DONE_WORDS` "signed off"; `PERSON` only recognises "your <role>" |
| L19 | `spec/`: "Larkspur raises about 1,140 invoices a year in QuickBooks Online." | A paraphrase of the `map/systems.md` fact falls under the 0.7 word-overlap bar |
| L31 | "Your $1,200 monthly courier bill is not affected by the new flow." | The value equals a price-book entry, and "bill" is `PRICE_CTX` |

Borderline, not counted:
- **L20** `spec/` "…the client pays to reship it": a client cost that is not in the plan. The spec rule allows plan facts only, so flagging it is defensible.
- **L25** "We spent Tuesday afternoon with your order coordinator…": our time in a meeting, not effort. The old "spent … afternoon" term caught it.

Pass (17): L01, L02, L03, L05, L06, L08, L11, L12, L16, L18, L21, L22, L23, L24, L26, L28, L30, and V05.

**Recall and false-positive rates.** On untuned material, OUR-side recall is 59% raw (52% by internal-number rules), or 67% excluding the 3 idioms. The false-positive rate is 39% on legitimate client sentences (12/31). On the known material it is 100% and 0%.

### Other checks

- **Harness re-runs:**
  - `plant.mjs` 51/51 and `plant-contracts.mjs` 20/20.
  - `plant2.mjs` 38/38 plus 6/6 controls.
  - `plant-contracts2.mjs` 16/16, including K18 and K19.
  - `fresh3.mjs`: 26/32 D1, 14/14 other fixes, 34/34 controls.
- **Malformed files:** 8/8 fail per check with a reason; no crash.
- **Folder-route probe:** every larkspur golden is accepted or rejected as routing §2.5 orders.
- **`repro-unpriced.mjs`:** routes to `-change`.

### Criteria C1–C12

| # | Verdict | Evidence |
|---|---|---|
| C1 | **PASS** | Catalog, contracts, one writer, reciprocity, NEXT resolution; K18/K19 guards; no misfire on ow-start or ow-build-plan |
| C2 | **PASS** | 4,348 < 4,500; protocol identical |
| C3 | **PASS** | Name and price plants caught; no private, oc- or builder names in skill text |
| C4 | **PASS** | All route goldens; settled and unpriced logic; `UAT 03` |
| C5 | **PASS (restated by decision 2)** | Every evaluator plant is caught or skipped by name under decision 2. All 34 must-pass controls pass. The self-check text carries decision 1 and the U11 carve-out. Untuned gaps are carried forward (R4-1, R4-2) |
| C6 | **PASS** | 54 goldens; every §10 case except Real use |
| C7 | **PASS** | Unchanged goldens pass |
| C8 | **PASS** | Gate plants caught; paperwork and future pass (X20, X21, L22) |
| C9 | **PASS** | Payment goldens. `termsDays` accepts more wordings (L11, L12); L13–L15 are R4-1 |
| C10 | **PASS** | Byte-identical contents vs the merge base |
| C11 | **PASS** | 8/8 malformed probes |
| C12 | **PASS** | Unchanged |

### Defects (round 4)

None is major. All are checker-side gaps in the regression net, or labelling; the skill text is correct under decision 1.

1. **[m] R4-1: false positives on untuned legitimate sentences, 12/31.**
   - **Cause:** `PRICE_CTX` vocabulary taken from the fixtures and plants ("lines", "usual", "alone", "integration", "report", "messy", "add"). `OURS` plus a duration covers test-data volumes ("a week of your orders"). `EFFORT` fires on the client's own effort ("your team spends"). `PERSON` misses "The <role> has …". `termsDays` misses "a fortnight", "calendar days" and "14-day terms". The old "unit price" term fires on the client's own prices.
   - **Repro:** `node fresh4.mjs` (L-set).
   - **Fix:** add the 12 sentences as must-pass controls. Make `EFFORT` and `OURS` require a first-person *agent of the effort*, not any "we" in the sentence. Drop the generic nouns from `PRICE_CTX`.
2. **[m] R4-2: OUR-side gaps on plain wording, 8 of 27.**
   - **The notable one:** `spec/` has no effort or time rule at all (G21), although C5 and `self-checks.md:7` cover `spec/`.
   - **The others:** "multiplied by" (G11); "our <adjective> estimate" (G17); "underquoted" (G27); the user named as the agent (G06; `key.user` is known); "most of a month" swallowed by the frequency exclusion (G24); price-book sizing and unit names in `spec/` (G23); price lines without numbers (G08).
   - **Repro:** `node fresh4.mjs` (G-set).
3. **[m] R4-3: one skip is mislabelled under decision 2.** F07 "The integration line is priced at eighteen hundred." is skipped as an idiom (`tests/ow-build-plants.test.js:503`). It is a price in words next to a pricing verb, which `PRICE_CTX` + `NUMWORD` could catch. Either catch it or label it honestly as "an amount in words without a currency word: not yet caught".

**Observation (not a defect):** round 4 edits ow-start's merged 1.0.0 SKILL.md in place, adding the slash hint the new K18 guard requires, with no version bump. The ow- catalog feeds no build output yet, so no consumer is affected.

### OWNER-DECISIONS

1. **Precision bar for the regression net before Sprint 6.** Decision 2 makes the checker a regression net and leaves real-model runs to Sprint 6. If Sprint 6 grades real runs with this checker, the 39% false-positive rate on untuned legitimate sentences will fail correct runs. The owner should decide whether R4-1's sentences become must-pass controls now (cheap), or whether Sprint 6 grades real runs by a different judge.
2. **`spec/` effort (R4-2, G21).** Confirm that "no internal numbers in `spec/`" includes our effort estimates, as C5 reads. If so, the checker needs the effort rules on `spec/` too.

### Verdict: **PASS**

Every criterion is ≥6, and there is no major defect under the amended contract. All of R3-1 to R3-6 are fixed. The round-1 to round-3 fixes hold. C10 is byte-identical. The remaining items (R4-1 to R4-3) are minor regression-net gaps to fold into the net before Sprint 6, plus the two owner decisions above.

### Harness files (in `<EVAL>`)

- `plant.mjs`, `plant-contracts.mjs`, `plant2.mjs`, `plant-contracts2.mjs`
- `fresh3.mjs`, `fresh4.mjs` (new)
- `misfire.mjs` (new)
- `malformed.mjs`, `probe2.mjs`, `repro-unpriced.mjs`
- results `*.out` and `*-results.json`

`alt/node_modules` links into the removed worktree. To re-run, check out `59817a8a` at `<EVAL>/tree` and run `npm ci --ignore-scripts`.
