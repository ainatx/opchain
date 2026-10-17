## Sprint 2 — Evaluation Round 2

**Sprint:** ow-build 1.0.0 (contract `sprints/release-2.1/ow-sprint-2/contract.md`, C1–C12, C12 = B4) · **Branch:** `claude/ow-build-sprint-2`, head `f99320b855b04bd0edbe053edcb3250b1c18c2aa` (round-2 commits `4468809d`, `83952938`, `f99320b8` on top of round 1's `70136e92`) · **Evaluator:** skeptical Evaluator, oc-app-architect Phase 6 Step 3 · **Date:** 2026-10-16

I graded against the contract, the design `docs/plans/2026-10-08-ow-build-design.md` (§10, §12, §12.7, and the §13 rows 1–19 added this round), the round-1 report and its bug list, the family rules (`skills-work/README.md`, `skills-work/ow-protocol.md`), the sibling designs (ow-uat, ow-handoff), and the two owner decisions of 2026-10-16. I worked in a detached checkout (`<EVAL>/tree`). Plants that change the starting state ran against a copy of the checker and its fixtures (`<EVAL>/alt`). No tracked file was touched.

### Code Scores

| Criterion | Weight | Score | Justification |
|---|---|---|---|
| Functionality | 30% | **6/10** | All 17 round-1 bugs are fixed in the text. `-start` resumes from a pending `build.yaml`. Every sibling trigger file and pathless wording now routes. Requests are priced once, re-runs never overwrite, "quoted separately" is asked, and the folder route covers every stage. A model following the text still goes wrong in two reachable places, plus two smaller ones. (1) A UAT-nn or FIX-nn that stopped as `unpriced` can never be priced again: the priced-once rule refuses it, although that verb's own STATUS line sends the user back to `-change` (new D2). (2) A `-start` cut off after `ledger.md` but before `spec/` resumes past §5, so `spec/` and the builder's mode and repo are never written (new D3). Smaller: a stopped milestone has no folder-route step once nothing else is left (D10), and the booking invoice is held back while the map is pending (D11). |
| Feature Completeness | 30% | **7/10** | Every deliverable is present: 48 goldens (13 new), 109 tests in `ow-build-acceptance.test.js`, and 82 plants re-asserted in the new `tests/ow-build-plants.test.js`. Both owner decisions are applied in ow-build and ow-build-plan, and design §13 rows 1–19 record the departures. Gaps: there is no golden for a "quoted separately" documentation line (vitest only), none for `--sent` or `--declined`, and none on ow-build-plan's side for the new UAT-nn follow-on route. ow-build-plan still records a FIX path as the intake of a UAT follow-on (D12). |
| Code Quality | 20% | **5/10** | The checker now catches all 51 round-1 plants and all 20 contract plants. That is because its vocabulary was extended to the exact round-1 wording ("took most of the week", "over our estimate", "coming along", "taken care of", "available"), not to the meaning. Of 37 new non-control acceptance plants, **29 slip**. Paraphrases of effort, margin and modifiers slip (11 of 11), and so do payment terms and amounts in words in `spec/`. A "done" claim traced to *any* passing report passes, even one that does not cover it. Started-work slips via a pronoun or "groundwork". Mode-level writers slip (a bare writer verb matches every mode, against the README's own semantics). The CO state machine is not enforced on `--agreed` or on history. The contrast check never sees the text colour the template puts on the content table. In `check-skill-contracts`, **5 of 14** new plants slip. Malformed files fail per check and never crash. |
| UX (clarity for person and model) | 20% | **7/10** | The body now agrees with the phase files and the edges on absent-cases (with one residual lumped row, D13). It has ~214 tokens of headroom, and `-run` is pointed to `build-yaml-schema.md`. The ready NEXT uses the owner's wording with the `/ow-uat-plan` hint and is not reprinted once UAT has started. The CO table in phase-change §6 matches the routing. Remaining: the too-big NEXT block has no slash hint (D9, the same class as round-1 bug 12). The booking NEXT waits for the builder's plan approval (D11). `-run` STATUS lines name no milestone (D10). |

**Weighted Code Score:** 0.3×6 + 0.3×7 + 0.2×5 + 0.2×7 = **6.3 / 10**

### Test Results

| Run | Result |
|---|---|
| `node scripts/gen-skills-catalog.mjs` | exit 0: 36 oc- skills, **3 ow skills** |
| `node scripts/check-skill-contracts.mjs` | exit 0 |
| `node scripts/lint-internal-refs.mjs` | exit 0 |
| `node scripts/ow-start-acceptance.mjs` | exit 0 |
| `node scripts/ow-build-plan-acceptance.mjs` | exit 0 |
| `node scripts/ow-build-acceptance.mjs` | exit 0: **48/48 golden cases** pass |
| `npx vitest run` (ow files: ow-build-acceptance 109, ow-build-plants 82, ow-build-plan-acceptance, ow-start-acceptance, ow-edges, catalogs) | 6 files, **411 passed / 0 failed** |
| `npx vitest run` (full) | 114 files, **1991 passed / 0 failed**, exit 0. The first run, before `site` deps and the build existed, had 3 environmental failures (astro tsconfig, `public/docs` not built, a 15 s timeout under load). All are green after `site` `npm ci` and the build |
| `npm run build` | exit 0 (`building opchain-dev worker @ f99320b8`). `git status --porcelain` is empty afterwards: no tracked file changed |
| C10 snapshot | Compared the build of merge-base `6c31e9ed` (`origin/main` has moved on by #605–#613, so the base build is the honest comparison) with this tree. `opchain-skills.zip` contents identical; all 73 `public/skills/*.zip` contents identical; `public/docs` identical; `plugins/opchain` identical; `src/generated/mcp-catalog.json` identical; `dist/` file set identical. The only byte differences are zip container timestamps and the `generatedAt` stamp in `public/demo/index.html`. `git diff 6c31e9ed HEAD -- skills/ plugins/opchain/ src/ site/ package*.json build.mjs` is empty |
| Body tokens (chars/4) | ow-build **4,286** (17,144 chars) under the 4,500 cap now in `catalogs.json` `bodyTokenBudgets` (gen-skills-catalog enforces it; plants C18 and K05 caught). ow-build-plan 4,619 and ow-start 3,343 sit under the catalog's 5,000 |
| Protocol copies | `shasum` identical: source + 3 copies `65508e8d…` |

### Criteria C1–C12

| # | Verdict | Evidence |
|---|---|---|
| C1 | **PASS** | Three ow skills validate. Every `spec/` file is now declared with one writer. A signed CO's checks go to `spec/06-testing-change-orders.md`, written only by `-change --signed`. `build.yaml` and `ledger.md` use `seeded_by: /ow-build-start`. These plants are caught: the truth plant C04, K14 (second writer of `ready-for-uat.md`) and K15 (a `./`-spelled second writer of the CO spec file). NEXT resolution and reciprocity hold. Gaps are minor: K01, K04 and K16 (D8). |
| C2 | **PASS** | 4,286 < 4,500, enforced in the catalog, not only in vitest. A K06 plant (detail moved into a 2,000-char description) fails the 1,024-char description limit. The protocol copy is byte-identical. |
| C3 | **PASS (with slips)** | Grepping `skills-work/ow-build/` for `oc-`, `example-builder`, Deftwright, `llc-ops`, `app-architect` and `$n`/`USD n` finds nothing. The builder is named only in fixture `handoffs.yaml` and builder files. Plants C09–C12 and K10, K12 are caught. Slips: K09 "llc ops" (spaced private skill) and K11 "fifteen hundred dollars" (D8). |
| C4 | **PARTIAL** | Goldens pass for `route-signed-plan`, `route-uat`, `route-uat-too-big`, `route-fix`, `route-fix-not-a-defect`, `route-trigger-signoff`, `route-trigger-delivered`, and `route-folder-{run,demo,ready,signed,signoff}` alongside `route-folder`. A folder-route probe across all 27 larkspur goldens accepts every correct route and rejects a folder route that prices a new request. Not met: a UAT-nn or FIX-nn recorded `unpriced` re-routes to "nothing" forever (D2, reproduced with the checker). The priced-once check misses a `from` with no `.md` (D7). The folder route has no step for a stopped milestone (D10). |
| C5 | **PARTIAL** | Round-1 plants T01–T04, P04–P10 and T11 are caught, but **11 of 11** new paraphrases slip. Effort: "a fortnight of work", "three long evenings". Margin: "costing us more than we charged", "losing money on milestone 1". Unit price "2k". Modifiers: "a quarter on top", "one and a quarter times". In `spec/`: "The second payment follows the milestone 1 demo.", the contract value in words with "paying", and "Half of the money is invoiced at booking." A demo summary with "spent a fortnight". `spec/` is scanned without the amount-in-words term (`scripts/ow-build-acceptance.mjs:1536`). (D1) |
| C6 | **PASS** | 48 goldens. Every §10 case except Real use has a golden and a plant. Round-2 rules have goldens too (resume, Not a defect, UAT too big, trigger files, folder stages). |
| C7 | **PASS** | `start-nine-checks`, `start-uncovered`, `run-m1-next`/`run-m1-done`, `run-escalated` and `start-no-build` all pass, and `run-no-builder` covers the public-default mode (bug 10). |
| C8 | **PASS (with slips)** | Text: `phase-change.md:91-106` gives the table of moves, `--signed` only from `amendment out`, and "an email reply never counts". The `signature-gate` and `change-signed` goldens pass. Checker slips: N15 (a pronoun in the next sentence), N16 "groundwork is laid", N17 "put the first screens together" in the demo summary, and N42/N43 (`--agreed` recorded over a declined or signed CO) (D1, D5). |
| C9 | **PASS** | 40/40/20 and 50/50 goldens, including the delivery half invoiced once and refused on the second run. `calc` output is checked against `plugins/ow-tools/lib/calc.mjs`. |
| C10 | **PASS** | See the snapshot row above. |
| C11 | **PASS** | 8 new malformed probes (`malformed.mjs`). Each failed only the checks that depend on the file, with a reason, and none crashed: `ledger.md` with invalid YAML, `CO-01.md` with no header, a binary `.html`, an empty `build.yaml`, a missing `STATUS.md`, a broken record table, `ready-for-uat.md` as a directory, and an invalid `handoffs.yaml`. |
| C12 | **PASS** | `invoice-documentation` (one request, `share: none`) and `invoice-documentation-refused` pass. "Quoted separately" is handled in `phase-start.md:35`, `phase-invoice.md:19` and `ledger-schema.md:57`. The checker catches an invented amount (N44, and vitest bug 7) and `share: 40` (N30). No golden for "quoted separately" (minor). |

### Bugs 1–17 from round 1

| # | Status | Evidence |
|---|---|---|
| 1 | **Fixed** (new hole: D3) | `phase-start.md:50-54` writes `build.yaml` `map_check: pending` and a STATUS line before the plan line; `:10` resumes at §6. Golden `start-resume`; plants N23, N26 and N27 caught. |
| 2 | **Fixed** | `folderRoute` (`scripts/ow-build-acceptance.mjs:1734-1761`) follows §2.5 stage by stage. Five new folder goldens; my 27-golden probe agrees with the text. |
| 3 | **Fixed** | `routing-and-resume.md:79-81` (§2.4 trigger files) and `:99-107` (§2.6 pathless wording); `skill.edges.yaml:15` `routes.paths` lists all four files. |
| 4 | **Fixed** (regression: D2) | Rows for `route: care` and Not a defect, "Environment or data", and priced once (`routing-and-resume.md:39,58,70-73`; `phase-change.md:12-15`). |
| 5 | **Fixed** | `skill.edges.yaml:37-44`; `06-testing.md` is never touched after `-start` (`builder-integration.md:46,83`). `## Sources` stays last. |
| 6 | **Fixed** in text | `phase-ready.md:10`, `phase-demo.md:7,36`, `routing-and-resume.md:92`. Checker gap for `--record` rewriting the script: D4. |
| 7 | **Fixed** | `phase-start.md:35`, `phase-invoice.md:19`, `ledger-schema.md:57`. Caught by N44 and vitest. |
| 8 | **Fixed** (residual: D13) | `SKILL.md:96-104` split into separate rows. `phase-invoice.md:3` reads `contract-inputs.md` and `delivered.md`. |
| 9 | **Partly fixed** | All round-1 plants are caught, but fresh paraphrases slip (29 of 37), and run-level writers slip across modes (D1, D4). |
| 10 | **Fixed** | `phase-run.md:9` `reported_passing`; `build-yaml-schema.md:37,56`; routing step 7; golden `run-no-builder`. |
| 11 | **Fixed** in text | `phase-change.md:93-100` table, `--sent` STATUS form `:110`, routing `:90`. The checker does not enforce the "from" state of `--agreed` or history appends (D5). |
| 12 | **Fixed** | `SKILL.md:208` hint, `phase-ready.md:54,61`, routing step 9. The too-big block still lacks a hint (D9). |
| 13 | **Partly fixed** | `email-template.md:9` rule; checker contrast at `scripts/ow-build-acceptance.mjs:415-421`. It misses the table-level text colour, 3-digit hex, `rgb()` and inner backgrounds (D6). |
| 14 | **Fixed** | Round-1 plants C10, C11, C12, C16, C18 and C19 are now caught. New slips: D8. |
| 15 | **Fixed** | Headroom ~214 tokens; `SKILL.md:63` points `-run` to `build-yaml-schema.md`; `SKILL.md:55` "as its phase file says (none on a refusal)". |
| 16 | **Fixed** | `phase-change.md:64,105` `signed:`; `checkSigned` asserts it. |
| 17 | **Fixed** | `phase-change.md:39`; vitest plant. The edges' price-book reads row omits `documentation_training` (D13). |

### Owner decisions (2026-10-16)

1. **Too-big UAT-nn → ow-build-plan, no run-time question.**
   - **Verified in ow-build:** `phase-change.md:32`, `SKILL.md:129,198`, `skill.edges.yaml:293-298`, golden `change-uat-too-big` with STATUS `next: ow-build-plan on uat/larkspur-ceramics/defects/UAT-06.md`, and golden `route-uat-too-big`.
   - **Verified in ow-build-plan:** `routes.paths`, routing §2.2, `phase-offer.md`, `phase-start.md` and the Reads-from row.
   - **Defects:** ow-build-plan `phase-start.md:9` still records `intake: handoffs/<client>/fixes/FIX-nn.md`, and ow-build-plan has no golden for the UAT follow-on (D12).
2. **Ready NEXT: `use ow-uat-plan on builds/<client>/ready-for-uat.md` (`/ow-uat-plan`).** Verified in:
   - `SKILL.md:130,208`, `phase-ready.md:54,61`, and STATUS `next: ow-uat /ow-uat-plan builds/<client>/ready-for-uat.md` in golden `ready-passing`.
   - Routing step 9 does not reprint the NEXT once `uat.yaml` or `signoff.md` exists.
   - `catalogs.json` `plannedVerbs: { ow-uat: [/ow-uat-plan] }`.
   - `check-skill-contracts` accepts a verb name after "use". K13 (a mismatched hint) and K07 (the retired say) are caught.

### Routing and main-path walk (as a model reading the text)

| # | Input / step | Lands on | Verdict |
|---|---|---|---|
| 1 | Signed NEXT, no `builds/` | `-start`, which writes `spec/` then `build.yaml` pending + STATUS, prints the plan line | OK |
| 2 | Same, next day, `map_check: pending` | `-start` resumes at §6 and rewrites nothing | OK (golden) |
| 3 | Same, but the session ended after `ledger.md` and before `spec/` (the user went to create the repo) | `-start` rule 3: it asks the §3 questions, writes `build.yaml` pending, and goes to §6. It never writes `spec/`, never records `builder.mode`/`repo`, and asks about a sprint plan the builder never made | **WRONG** (D3) |
| 4 | While the map is pending, `use ow-build on builds/<c>/` | step 2 → `-start`, never the booking invoice, though booking is due | weak (D11) |
| 5 | `-run M1`, sprint handed then result | one sprint, then the demo NEXT | OK |
| 6 | M1 escalated, M2 not started | step 7 skips the stopped M1 and picks `-run M2`. The run NEXT printed "run M1". Once M2 is done, no step covers M1 | ambiguous (D10) |
| 7 | `-demo M1`, then folder before the demo | nothing runs; the script is not rewritten | OK |
| 8 | `--record`, then the folder | `-invoice` working-demo, then `-run M2` | OK |
| 9 | User-stated change → CO draft → `--agreed` (from draft or sent) → `--signed` → invoice | consistent with the §6 table | OK |
| 10 | UAT-nn Change whose unit is missing → `unpriced` row; the user adds the unit to `price-book.yaml` and says "use ow-build on uat/…/UAT-05.md" again | §2.2 row 1 "already named in requests.md → nothing" | **WRONG** (D2) |
| 11 | UAT-nn Change too big | the ow-build-plan NEXT and STATUS (no slash hint) | OK / minor (D9) |
| 12 | FIX-nn `route: care`; Not a defect; Fix | nothing; a no-charge row; nothing | OK |
| 13 | `signoff.md`, `backstop.md`, `dates.yaml`, `delivered.md` handed over | `-invoice`, once | OK (goldens) |
| 14 | "use ow-build to invoice the delivery payment" (no path) | `-invoice`, slug from the newest STATUS line, else ask | OK |
| 15 | All demoed → `-ready` → ready NEXT → UAT started → folder | stop, no reprint | OK |
| 16 | `-ready` again after `uat.yaml` exists | refused | OK |

### Planted failures

**Round-1 harness, re-run** (`plant.mjs`, `plant-contracts.mjs`, repointed to this tree):
- Acceptance checker: **51/51 caught**.
- check-skill-contracts/catalog: **20/20 caught**. C17 was re-aimed at an undeclared `/ow-uat-start`, because `/ow-uat-plan` is now the declared verb.

**New acceptance plants** (`plant2.mjs`, 44 plants: 6 controls, all caught; N36, a meaningless alt text, is not counted). **37 non-control: 8 caught, 29 slipped.**
- **Internal numbers, slipped (11):**
  - N01 "a fortnight of work"
  - N02 "three long evenings"
  - N03 "costing us more than we charged for it"
  - N04 "losing money on milestone 1"
  - N05 "2k"
  - N06 "a quarter on top of the usual price"
  - N07 "one and a quarter times the standard amount"
  - N08 `spec/` "The second payment follows the milestone 1 demo."
  - N09 `spec/` "paying seventeen thousand four hundred and fifty dollars"
  - N10 `spec/` "Half of the money is invoiced at booking"
  - N11 demo summary "spent a fortnight"
- **Done/started, slipped (6):**
  - N12 "codes have all been converted" (traced to a note)
  - N13 "The confirmation screen now shows every order line"
  - N14 "wrapped up" traced to sprint 1's passing report, which does not cover the claim
  - N15 "We have made a start on it" (pronoun; both sentences traced)
  - N16 "the groundwork is laid"
  - N17 demo summary "put the first screens together"
- **One writer inside a run, slipped (3):**
  - N18 `--signed` rewrites `CO-01.html`
  - N19 `--record` rewrites `M1-script.md`
  - N20 `--signed` adds a `requests.md` row
- **State machine, slipped (4):**
  - N28 `--signed` adds no history line
  - N29 `--agreed` drops the `draft` line
  - N42 `--agreed` over a declined CO
  - N43 `--agreed` over a signed CO
- **Contrast, slipped (3):**
  - N31 table-level text `#AAAAAA`
  - N32 `#999`
  - N33 `rgb(160,160,160)`
- **Priced once, slipped (2):** N39 `from: UAT-03`; N40 `from: uat/…/UAT-03` (no `.md`).
- **Caught (8):**
  - N24 a no-builder `-run` writing the ledger
  - N25 a draft run writing `change-inputs`
  - N26 a resume left `pending`
  - N27 a resume STATUS still pointing at `-start`
  - N34 low contrast in a `<p>`
  - N37 a remote image
  - N38 "click here"
  - N44 B4 "quoted separately" with an invented amount
- **Controls (6/6 caught):** N21, N22, N23, N30, N35, N41.

**New check-skill-contracts plants** (`plant-contracts2.mjs`, 17 plants: 3 controls, all caught). **14 non-control: 9 caught, 5 slipped.**
- **Caught:**
  - K03 a reads row for a file the producer never writes
  - K06 the cap dodged into the description
  - K07 the retired ready say
  - K08 an undeclared ow-uat verb in STATUS
  - K10 "$1.5k"
  - K12 `/oc-build`
  - K13 a mismatched hint on "use ow-uat-plan"
  - K15 `./spec/…` second writer
  - K17 a removed signoff reads row
- **Slipped:**
  - K01 a phase file reads `handoffs/<client>/care.md` with no reads row
  - K04 a reads field of `quote.md` ow-build-plan never hands off (`margin_target`)
  - K09 "llc ops"
  - K11 "fifteen hundred dollars"
  - K16 `routes.paths` drops `signoff.md` while the reference still routes it

**Malformed files** (`malformed.mjs`): 8/8 fail per check with a reason; no crash.

**Folder-route probe** (`probe2.mjs`, `from: builds/larkspur-ceramics/` against every larkspur golden that is not a route-only key): it accepts every run the §2.5 order allows. It rejects new-request pricing (`change-in-scope`, `change-priced`, `change-uat-extension`) and the no-builder `-run` while booking is unpaid, which is correct.

**Total new non-control plants: 51, of which 17 were caught and 34 slipped.**

### New defects

1. **[M] The meaning-based checks still match words, not meaning (C5, C8, No false done).**
   - **Where:** `scripts/ow-build-acceptance.mjs:459-486` (`INTERNAL_TERMS`, `SPEC_TERMS`, `DONE_WORDS`, `STARTED_WORDS`), `:1536` and `:1570`.
   - **What happened:** round 2 added the exact round-1 phrases to the lists, so every round-1 plant is caught, but 17 of 17 fresh paraphrases slip (N01–N17).
   - **Structural gaps:**
     - `spec/` is scanned without the amount-in-words term (`:1536`), and "payment"/"invoiced" count only next to a percentage (N08–N10).
     - A "This week" done claim passes when its trace names *any* passing report, whether or not that report covers the claimed check (`:1570`, N14).
     - The signature gate matches a CO only by phrase within one sentence, so a pronoun in the next sentence slips (N15).
   - **Repro:** `node plant2.mjs`, N01–N17.
   - **Fix:**
     - In `spec/`, refuse any money or payment wording at all (currency words, amounts in words, payment/invoice/paid/deposit/half/balance). `spec/` has no reason to mention payment.
     - Require a traced done claim's report to mark PASS a check whose words appear in the sentence.
     - Treat any started word in a paragraph that names the unsigned CO as a finding.
     - Re-plant with paraphrases written by someone other than the author.
2. **[M] A UAT-nn or FIX-nn recorded `unpriced` can never be priced.**
   - **Where:** `phase-change.md:15` (priced once: "already named in a row's `from` … is never priced again"), `routing-and-resume.md:39,58,70`, and `phase-change.md:40`/`:110`. The `unpriced` STATUS line sends the user back with `next: ow-build /ow-build-change`.
   - **What happens:** once the user adds the missing unit to `price-book.yaml` (the natural fix for "no unit fits") and hands the UAT-nn over again, §2.2's first row refuses it and says R-nn has it. The only way out is to price by hand.
   - **Checker:** it agrees. `pricedRequests` counts any `from`, and `expectedRoute` returns "nothing".
   - **Repro:** `node repro-unpriced.mjs` (a prior `requests.md` row for UAT-03 with result `unpriced: …` makes the route "not this skill's to run").
   - **Fix:** count a request as priced only when its row's result is a CO, too big, in scope or not a defect. An `unpriced` row is re-priced and gets a new row citing the old one.
3. **[M] A `-start` cut off between the ledger and `spec/` resumes past §5.**
   - **Where:** `phase-start.md:11` (rule 3: "`ledger.md` or a `spec/` file exists with no `build.yaml` … Ask the questions of section 3, write `build.yaml` with `map_check: pending`, then go to section 6").
   - **The window:** §4 writes `ledger.md`. §5 then asks for the client's project folder and shows the five `spec/` files before writing them (`:50`). A session that ends there, for example while the user creates the repo, leaves a ledger, no `spec/` and no `build.yaml`.
   - **What happens:** rule 3 never writes `spec/` and never records `builder.mode`/`builder.repo` (§5's job). It goes straight to "is the builder's sprint plan approved?" for a plan the builder never made. In no-builder mode it writes `map_check: pending` where `not applicable` is right.
   - **Fix:** resume at the first missing step: §5 when `spec/` is incomplete or `builder` is unrecorded, §6 only when the plan line was printed.
4. **[m] One writer inside a run treats a bare writer verb as every mode.**
   - **Where:** `scripts/ow-build-acceptance.mjs:1670` (`verbMatches`).
   - **Why it is wrong:** `skills-work/README.md:32` says `modes:` lists the *other* modes a writer verb writes in, so a bare `verb:` is the base mode only.
   - **Effect:** `-demo --record` can rewrite `M1-script.md` (the round-2 "never rewritten" rule, N19). `-change --signed` can rewrite the client's `CO-01.html` (N18) or add a `requests.md` row (N20).
5. **[m] The CO state machine is enforced in text but not by the checker.**
   - **Where:** `checkSignatureGate` (`scripts/ow-build-acceptance.mjs:1270-1300`).
   - **Effect:** it never reads the prior status, so `--agreed` over a declined or signed CO passes (N42, N43). History is not append-checked (N28, N29).
   - **Missing goldens:** there is no golden for `--sent` or `--declined`.
6. **[m] The contrast check misses the main text colour.**
   - **Where:** `scripts/ow-build-acceptance.mjs:415-421`.
   - **Effect:** it reads `color:` only on `h1`–`em` tags, but `email-template.md:28` puts `colors.text` on the 600 px `<table>`, so the body text colour is never measured (N31). 3-digit hex and `rgb()` are ignored (N32, N33). Every colour is measured against `<body>`, never an inner cell's background.
7. **[m] Priced-once spellings.**
   - **Where:** `pricedRequests` (`:1694`).
   - **Effect:** it needs `.md` in a `from` cell, so `UAT-03` or `uat/…/UAT-03` lets the same request be priced again (N39, N40).
   - **Text:** `phase-change.md:15` lists spellings but not a missing extension either.
8. **[m] check-skill-contracts gaps.**
   - K01: reads in phase files are not held to reads rows (only the body table is).
   - K04: the reads fields of `quote.md` are not checked against the producer.
   - K09: private-skill names are not spacing-tolerant (brand names are).
   - K11: a price in words is not caught.
   - K16: a route in the reference that `routes.paths` omits is not caught (the check is one-directional).
9. **[m] The too-big NEXT block has no slash hint.**
   - **Where:** `SKILL.md:197-201`. It prints `say "use ow-build-plan on …"` with no `(where slash commands exist: /ow-build-plan)`.
   - **Why it matters:** this is the protocol §9 form, and the same class as round-1 bug 12.
10. **[m] A stopped milestone has no step in the folder route.**
    - **Where:** `routing-and-resume.md:93`. Step 7 excludes a milestone "stopped by an escalation the user has not resolved", and no later step covers it.
    - **Effect:** after `run-escalated`, the folder route picks `-run M2` while the printed NEXT said "run M1". Once M2 is demoed, steps 6–9 cannot apply (M1 has no record), so nothing is offered. The checker's `folderRoute` (`:1753`) agrees.
    - **Related:** `-run` STATUS lines (`phase-run.md:41-42`) carry no milestone, so `/ow-build` cannot say which milestone is waiting.
11. **[m] The booking invoice NEXT is held back while the map is pending or stopped.**
    - **Where:** routing step 2 (`:88`) precedes step 3, and `phase-start.md:52`/`:58` STATUS lines point at `-start`.
    - **Effect:** the booking payment is due at signing, yet a user following NEXTs is not offered it until the builder's plan is approved.
12. **[m] ow-build-plan's side of owner decision 1 is incomplete.**
    - **Where:** `skills-work/ow-build-plan/references/phase-start.md:9`.
    - **Effect:** it still writes `intake: handoffs/<client>/fixes/FIX-nn.md` for a UAT-nn follow-on.
    - **Missing tests:** ow-build-plan has no golden or plant for the UAT route.
13. **[m] Residual body/edges drift.**
    - `SKILL.md:100` lumps `risks.md` and `build-plan.md` under "No checks from either: stop `-start`", although their absent-cases are "risks: none recorded" and "summary from build-request.md" (`skill.edges.yaml:87-110`).
    - The `price-book.yaml` reads row (`skill.edges.yaml:170`) omits `documentation_training`, which `-change` now reads.
    - `builder-integration.md:46` says the `06-testing-change-orders.md` sentence twice.
    - The `change-signed` answer-key comment still says checks are appended to `spec/06-testing.md`.

### Gaps vs Contract

- C4: the inbound route regresses for an `unpriced` request (D2).
- C5: "matched by meaning, verified by planted paraphrases" is not met (D1).
- Deliverable 5, "meaning-based term checks from the start": still word lists (D1, D4–D7).
- Test requirements: the HTML validator and twin checks are present; the contrast check has gaps (D6). "Candidate verifier PASS on every commit" is not verified by me. Gmail and Outlook rendering is deferred to Sprint 6 per the contract.

### Verdict: **FAIL**

Code Quality (5) is below 6, and three major defects remain (D1, D2, D3). The text's round-1 defects are genuinely fixed, and the owner decisions are applied. Fixes, in order:

1. **D2:** re-price an `unpriced` UAT-nn/FIX-nn (count only settled results as priced). Add a golden.
2. **D3:** make `-start` rule 3 resume at the first missing step (§5 or §6). Add a golden with a ledger and no `spec/`.
3. **D1:** replace phrase-chasing with category rules:
   - In `spec/`, no money or payment words at all.
   - A traced done claim's report must cover the claimed check.
   - A paragraph-level CO gate.
   - Re-plant with fresh paraphrases.
4. **D4–D7:** mode-exact writer matching; prior status and history checks for `--agreed`/`--signed`, plus goldens for `--sent`/`--declined`; contrast on the table colour, short hex and `rgb()`, against the nearest background; priced-once keys without an extension.
5. **Minors:** D8–D13.
