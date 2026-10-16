## Sprint 1 — Evaluation Round 4 (owner-authorized extra round, five items)

**Sprint:** ow-build-plan 1.0.0 (contract `sprints/release-2.1/ow-sprint-1/contract.md`) · **Branch:** `claude/ow-build-plan-sprint-1`, commits `6ffe4eaa..1afe261a` (round 4: `8350815b`, `052f624a`, `1afe261a`) · **Evaluator:** skeptical Evaluator, oc-app-architect Phase 6 Step 3 · **Date:** 2026-10-15

The owner authorized this round after round 3 failed and limited it to five items. I graded those five items, C1–C11, owner decisions (a) and (c), and whether the round-4 edits added any new major or blocking defect. I reproduced every result myself:

- I re-ran the round-2 and round-3 plant scripts.
- I wrote 21 new acceptance plants (`eval-s1-r4/plant-accept4.mjs`, `plant-accept4b.mjs`) and 14 new skill-text plants (`plant-contracts4.mjs`, which also applies the vitest text pins to the planted tree).
- I wrote 8 folder-stage probes against a scratch copy of the checker (`eval-s1-r4/root/`).

All of this lives in the session scratchpad. I touched no tracked file.

### Code Scores

| Criterion | Weight | Score | Justification |
|---|---|---|---|
| Functionality | 30% | **7/10** | Every automated run is green, C1–C11 hold, and all five items are fixed on the paths they name. The folder route goes by files first. A signed folder writes nothing. Both of round 3's money-path majors are gone: there is no revised quote any more, and a signed folder no longer runs another skill's verb. Round 3's route-rule mismatch is also fixed: a draft quote that was never exported now goes to `-export`, not `--accepted`, in both the reference and the checker. What remains is minor. The "never `-start` over a plan" rule lives only in the routing reference, so a direct `-start` has no guard. And `contract-inputs-schema.md` still describes a Build Plan credit for every build-plan-mode plan (new minors 2 and 8). |
| Feature Completeness | 30% | **8/10** | There are 27 golden cases (25 → 27), including the two requested: `route-folder-signed` and `route-feasibility`. The design has both dated owner notes (§4, §6.3). Decision (g) holds again. Still missing: a golden for a delivery-mode quote. Item 4 is covered only by a planted negative test, so I built the positive case myself (N1, which passes). |
| Code Quality | 20% | **7/10** | The new checker code catches what it targets: A1, A5 and A22 are caught; so are 16 of my 19 negative acceptance plants, and the positive control passes. Slips: a second quote under another name (`quote-v2.md`, N14), an unasked second quote in a new `-2` folder (N15), and a paraphrased credit line (N4). `checkAccepted` never compares `contract-inputs.md`'s credit fields with the quote (N21). On the text side, most of the new prose rules are unpinned: 12 of 14 text plants slip every automated check, and 2 are caught only by a vitest text pin. The ban on the 5-a-week rule is pinned by a narrow regex (`5 ×`, `5 a week`, `5 * weeks`) that misses "five business days per week" and "5x". |
| UX (clarity for person and model) | 20% | **7/10** | §2.3 of the routing reference is now an ordered, first-match list, and the two global rules are stated plainly. Delivery-mode text now agrees across `phase-start.md`, `phase-quote.md` and `phase-export.md`. Weak spots: `phase-quote.md:187` still offers to "issue a new quote", which no longer exists. The example `offers.md:62` promises "a short offer" for what is now a quick quote. The feasibility quote more than doubles the unit price through the required UAT line (an owner question). The round-3 UX minors are untouched (resume grouping, `request.md` in the offer NEXT). |

**Weighted Code Score:** 0.3×7 + 0.3×8 + 0.2×7 + 0.2×7 = **7.3 / 10** (round 1: 6.3, round 2: 6.5, round 3: 6.7)

### Test Results

| Run | Result |
|---|---|
| `node scripts/gen-skills-catalog.mjs` | exit 0: 36 oc- skills, **2 ow skills** |
| `node scripts/check-skill-contracts.mjs` | exit 0 (verbs declared; family names only; edges reciprocal, one writer per file) |
| `node scripts/lint-internal-refs.mjs` | exit 0 |
| `node scripts/ow-start-acceptance.mjs` | exit 0: 4 cases (5/5, 6/6, 11/11, 5/5) |
| `node scripts/ow-build-plan-acceptance.mjs` | exit 0: **27/27 golden cases pass**, 92 checks. New: `route-feasibility` 9/9, `route-folder-signed` 1/1 |
| `npx vitest run tests/ow-edges.test.js tests/ow-build-plan-acceptance.test.js tests/catalogs.test.js tests/ow-start-acceptance.test.js` | 4 files, **201 run / 201 passed / 0 failed / 0 skipped** (round 3: 195) |
| `npm test` (full) | 112 files, **1781 run / 1781 passed / 0 failed / 0 skipped**, exit 0 |
| `npm run build` | exit 0 (`building opchain-dev worker @ 1afe261a`); working tree clean afterwards apart from the untracked eval reports |
| `git diff 6ffe4eaa..HEAD --stat -- skills/ plugins/opchain/ package.json` | **empty** (also empty for `plugins/ src/ site/ package-lock.json .claude-plugin/ mirror/`) |
| Body budget / protocol copies | Body ~**4,332** tokens (chars/4) against 5,000. `ow-protocol.md` has one SHA-1, `65508e8d…`, in all three places |

No test fails, so there is no Functionality cap. Every contracted test exists, so there is no Code Quality cap. Not verified: "candidate verifier PASS on every commit".

### Criteria C1–C11

| # | Verdict | Evidence |
|---|---|---|
| C1 | **PASS** | "ow catalog validated: 2 skills"; check-skill-contracts exit 0. |
| C2 | **PASS** | Body ~4,332 tokens; the protocol copies are byte-identical. |
| C3 | **PASS** | No `llc-ops` or `Deftwright` under `skills-work/ow-*`. A planted `llc-ops` in `routing-and-resume.md` fails (`:81: names llc-ops, a private skill`). |
| C4 | **PASS** | The round-2 `plant-contracts.mjs` plants are caught: 23 of 23 that still apply. Its C1 and C2 no longer apply as written (the text moved); round 3 re-planted them as K1 and K2, both caught. `check-skill-contracts.mjs` did not change this round. |
| C5 | **PASS** | Second-writer plants for `contract-inputs.md` and `request.md` (K10, K11, K17) are caught. K7 (a literal `-2` folder) still slips, as in round 3. |
| C6 | **PASS** | 27/27 golden runs. |
| C7 | **PASS (with slips)** | Every §9.2 case has a planted failure in vitest, and item 2–5 plants were added (`tests/ow-build-plan-acceptance.test.js:492-520`). The slips are listed below. |
| C8 | **PASS** | The goldens and the preflight are unchanged; the `internal_appendix` check passes on the new feasibility quote. |
| C9 | **PASS** | `signed-before-accepted` passes. The signed NEXT block (`SKILL.md:183-187`) names `/ow-build-start`, and its IF IT IS NOT AVAILABLE branch is the `build` destination. |
| C10 | **PASS** | The oc- diff is empty. |
| C11 | **PASS** | Re-ran `plant11`/`plant12`. A broken `handoffs.yaml`, `price-book.yaml` or `offers.md` fails only the checks that read it, with a reason. In the new cases, a broken `price-book.yaml` fails only quick, unpriced, dates_terms and uat_lines in `route-feasibility`; route still passes. Nothing crashes. |

### Items 1–5 (verified by reproduction)

| # | Item | Verdict | Reproduction |
|---|---|---|---|
| 1 | No 5-business-days-per-week rule; deadlines only from `build_plan_schedule.<tier>` or user-stated; no replacement cross-check | **VERIFIED** | I grepped `skills-work/`, `tests/`, the checker and the design for `5 ×`, `5 * weeks`, `5 a week`, `× weeks`, `per week`, `a week`, `working week` and `calendar days`. Every hit is client volume ("40 orders a week") or the offer's validity date; none ties `delivery_business_days` to `weeks`. `phase-start.md:23`, `price-book-schema.md:12` and `examples/price-book.yaml:26` now read without the rule, and the `5 * weeks` assertion is gone (`tests/ow-edges.test.js:421-429` now asserts the opposite). The checker (`ow-build-plan-acceptance.mjs:384-405`) compares `weeks` only with `build_plan_weeks` and computes dates only from the book or the user-stated days; it has no cross-check. A11 (plan_delivery from weeks instead of the book) is still caught. |
| 2 | Revised quotes gone; `-quote` refuses over an exported or accepted quote and points to a new plan or follow-on; the checker fails `quote-r*` and a `contract-inputs.md` `quote:` other than `plans/<client>/quote.md` | **VERIFIED** | `grep -rn "quote-r\|revis" skills-work/` finds nothing. `phase-quote.md:17-20` refuses, offers `--accepted`/`--signed`, and says a different quote is "a new Build Plan or a follow-on … and stop". The two `quote-r<n>` rows are gone from the edges file. `plant-accept3.mjs` re-run: **A1, A5 and A22 are caught** (route + quote_frozen; accepted). Uppercase `QUOTE-R2.MD` is caught (N18). **K16 judgment:** an edges row that declares a `quote-r<n>.md` writer (K16, K32) still passes check-skill-contracts. With no skill text naming the file, a model never writes it from the edges file, and the acceptance checker fails any `quote-r*` a run writes. So this is drift between the edges file and the body, not a behaviour risk. **Minor** follow-up: require every `writes:` path to appear in the verb table's Writes column. |
| 3 | Signed-folder routing by files first: `build-request.md` → print the signed NEXT, stop, write nothing; never another skill's verb; never `-start` over an existing `plan.yaml` | **VERIFIED on the route** | `routing-and-resume.md:41-44` (two global rules) and `:65-73` (first match wins). Golden `route-folder-signed` writes nothing and passes. Plants: re-running `--accepted` in a signed folder (N12), writing ow-build's `builds/…` (N13), a STATUS line (vitest), or rewriting `plan.yaml` (vitest; N16 on an exported folder) → all caught. My 8 folder-stage probes give the checker's route for each stage, and each matches the reference (walk below). **Residue (minor, new 8):** the `-start` rule is scoped "for every route", and `phase-start.md` has no guard of its own. A direct `-start` on a folder that already has a plan (say, the user re-says the offer NEXT `use ow-build-plan to start plans/<client>/`) can still rewrite `plan.yaml`. |
| 4 | Delivery mode (`fee: none`): no fee from the price book, no credit line in the quote, no credit-deadline awaiting; design §6.3 dated note | **VERIFIED** | `phase-start.md:19` (the fee contradiction from round 3 is resolved: the offer's fee, else the book, and delivery mode `fee: none`). `phase-quote.md:33` (no credit line, no `credit_deadline`), `:134` (heading "never with `fee: none`"), `:222,224`, `phase-export.md:47` (awaiting lines without the credit). Design §6.3 (`2026-10-06-ow-build-plan-design.md:180`) and the status line carry the dated note. **My positive control N1** passes every check: the `dates-terms-above` run with `plan.yaml` `fee: none` and a quote with no fee or credit keys and no credit section. A credit section (N3), or the header keys left in (vitest), fails. Residue: there is no delivery-mode quote golden, and `contract-inputs-schema.md` was not updated (new minor 2). |
| 5 | Feasibility recap → `-quote --quick` priced from a `feasibility-test` unit; golden; design §4 dated note | **VERIFIED** | Route row `routing-and-resume.md:55`, `phase-quote.md:40`, `SKILL.md:53`, example unit renamed (`examples/price-book.yaml:51`; no `ai-feasibility-test` left anywhere). Design §4 note at `:64`. Golden `route-feasibility` (Kestrel Bindery) passes 9/9. Plants: two units (N5), an extra unit of another kind (N6), a price off the book (N7), an offer as well (N8), a credit line (N9), a credit in the STATUS awaiting (N10), a `plan.yaml` (N11), a missing UAT line (N20) → all caught. Owner question (new minor 9): the required UAT line makes the USD 900 test a USD 1,900 fixed price. |

### Routing walk

I started from ow-start's NEXT, `use ow-build-plan on intake/<client>/intake-record.md`. That goes to the verb row (`SKILL.md:46`), then `references/routing-and-resume.md`. "Checker probe" is what the checker computes for that starting state (my scratch probe cases built on the real fixtures).

**Folder stages** (`use ow-build-plan on plans/<slug>/`):

| Stage (newest STATUS `next:`) | Rule that fires | Action | Exactly one, correct? | Checker probe |
|---|---|---|---|---|
| offer (`-start`) | 4, ow-build-plan verb; no `plan.yaml` | `-start` | Yes | next step |
| started (`-collect`); then collected, mapped, scoped | 4 | `-collect` / `-map` / `-scope` / first `-quote` | Yes | next step |
| delivery-mode plan (`-collect`, `fee: none`) | 4 | `-collect`; `-start` blocked by the `plan.yaml` guard | Yes | next step |
| quoted, not exported (`-export`), full or quick (incl. feasibility) | 4 (rule 3 needs an export) | `-export` | Yes. Round 3's re-scope case (`next: -quote`, quote unexported) now goes to `-quote`, which asks before overwriting (`phase-quote.md:20`) | next step (3 probes) |
| exported (`-quote`) | 3 | `--accepted <date>`, never `-quote` | Yes | accepted (golden `route-folder`) |
| accepted (`contract-inputs.md`) | 2 | `--signed <date>` | Yes | signed |
| signed (`build-request.md`; newest `next: ow-build /ow-build-start`) | 1 | Print the signed NEXT block, stop, write nothing | Yes | nothing (golden `route-folder-signed`) |
| no STATUS line for the folder | 4, last bullet | Say so and ask | Yes | — |

**Recap `path_kind`** (§2.1):

| `path_kind` | Action | Exactly one, correct? | Evidence |
|---|---|---|---|
| `build-plan` | `-offer` | Yes | golden `route-build-plan` |
| `defined-work` | `-quote --quick` (refusal → offer NEXT over the limit) | Yes | goldens `route-defined-work`, `quick-over-limit` |
| `next-stage` | `-start`, `fee: none`, never an offer | Yes | golden `route-next-stage`; A6/A7/A9/A10 caught |
| `feasibility` | `-quote --quick`, priced as `feasibility-test` | Yes | golden `route-feasibility`; N5–N11, N20 caught |
| `not-a-fit` | nothing; says so | Yes | `:56` |
| `next-session` | nothing; says so | Yes | `:56` |
| missing (or no `recap.md`) | ask: offer, quick quote, start, or nothing | Yes | `:57` |

FIX routes are unchanged since round 3. They still have no class check (carried below).

### New defects

B = blocking, M = major, m = minor. **No new blocking or major defect.**

1. **[m] No delivery-mode quote golden.** Item 4 is tested only by a negative plant (`tests/ow-build-plan-acceptance.test.js:511-514`). My positive control N1 shows the checker accepts a correct delivery-mode quote, but no shipped case proves it. Add a `route-next-stage` → `-quote` golden.
2. **[m] `contract-inputs.md` still carries the Build Plan credit for delivery mode.**
   - **Where:** `references/contract-inputs-schema.md:29-30` (`credit_deadline` / `build_plan_fee`, "build-plan mode; else none") and `:61` (`## Dates (valid until; Build Plan credit deadline)`). A `fee: none` plan *is* build-plan mode.
   - **Checker:** `checkAccepted` (`scripts/ow-build-plan-acceptance.mjs:889-930`) never compares those fields with the quote. Plant N21 (a `fee: none` plan, a quote with no credit, and a `contract-inputs.md` that still says "The Build Plan fee of USD 3,000.00 is credited …") passes both accepted and dates_terms.
   - **Why minor:** the model's sources (the quote and `plan.yaml`) say none, so the likely output is `none`.
3. **[m] The checker is stricter than the text about the delivery-mode quote header.** `build_plan_fee: none` / `credit_deadline: none` fails dates_terms (N2, `:763-766`). Meanwhile the quote header template (`phase-quote.md:83-84`) only says "# build-plan mode", and the contract-inputs schema spells absence as `none`. Say "omit both keys when `fee: none`" in the template, or accept `none`.
4. **[m] Acceptance-checker slips on the round-4 code:**
   - **N4:** a paraphrased credit ("the planning fee is deducted") on a `fee: none` quote; the regex is `/Build Plan credit|credited against/`.
   - **N14:** a second quote named `quote-v2.md` (`secondQuotes`, `:479-481`, matches `quote-r*` only).
   - **N15:** an unasked second quote in `plans/<client>-2/` during a folder route.
5. **[m] Round-4 prose rules are mostly unpinned** (`plant-contracts4.mjs`). These slip every automated check:
   - routing rule 1 rewritten to "Run `/ow-build-start`" (K22);
   - rule 4's other-skill bullet set to "run that skill's verb" (K23);
   - rule 4's `plan.yaml` guard removed (K24);
   - rule 3's export condition removed (K34);
   - the "never with `fee: none`" credit heading (K26), the §10 sentence (K27) and the `phase-start` delivery-mode sentence (K28);
   - the revised-quote bullet restored in `phase-quote.md` §1 (K29);
   - the `phase-export` fee-none awaiting (K33).

   Also, the 5-a-week pin (`tests/ow-edges.test.js:428`) misses "five business days per week" (K30) and "5x" (K31). Caught only by a vitest pin: K21 and K25. Behaviour is still graded by the goldens, so this is a guard on the text, not on outputs.
6. **[m] Stale "new quote" wording.** `phase-quote.md:187` (`--accepted` after `valid_until`) still says "ask whether to issue a new quote". Under one quote per folder, `-quote` refuses there (`:17-19`). Point to §1 instead.
   - Related owner question: a quick quote has no follow-on folder rule (§3 always writes `plans/<client>/`). So a client whose quick quote expired can only get a new price through a Build Plan offer or `-start`.
7. **[m] Feasibility wording.** `examples/offers.md:62` says "I send a short offer for a time-boxed test", but the route is now a quick quote, not an offer. And "the price book's feasibility-test unit" is defined only by the example's id. `price-book-schema.md` does not say how a user's own book marks that unit (an id convention or a label).
8. **[m] The "never `-start` over an existing `plan.yaml`" rule is route-only.** `routing-and-resume.md:44` scopes it to routes. `phase-start.md` §1 (`:7-13`) has no check of its own, so a direct `-start` (say, the offer NEXT re-said in a new session) rewrites `plan.yaml` and `collection.md`. This predates round 4 and the route is fixed. One sentence in `phase-start.md` §1 closes it.
9. **[m] Owner question: what a feasibility quote carries.** The golden `route-feasibility` quote prices the test at USD 900. It then adds the required UAT S line (USD 1,000), so the fixed price is USD 1,900. It also offers Documentation & training (USD 2,000), "30 days of fixes", a "working demo" milestone and the build acceptance/delivery sentences, and it flows to `build-request.md` → ow-build. That follows the quick-quote rules the owner chose, but whether a feasibility test carries UAT, a fix window and training is the owner's call.
10. **[m] Small text slips.**
    - The `plan.yaml` template `fee: <amount>` (`phase-start.md:62`) doesn't show `none`.
    - `phase-export.md:47` "suggest calendar reminders for both dates" — a `fee: none` plan has one.
    - The intake route for a `build-plan` recap has no guard against an existing `plans/<slug>/build-plan-offer.md` (pre-existing).

### Owner decisions verified

| Decision | Verdict | Evidence |
|---|---|---|
| (a) quick quotes write `quick-scope.md`; the family reads it consistently | **HOLDS** | Round 4 touched no ow-build, ow-uat or ow-handoff design. `quick-scope.md` is named 23 times in `skills-work/ow-build-plan` and 16 times across the three downstream designs, with no other spelling. The new feasibility golden writes `plans/kestrel-bindery/quick-scope.md`, and its quote `subject` names that file. |
| (c) the printed contract NEXT is exactly the say: line or the public default | **HOLDS** | `SKILL.md:174`, `phase-quote.md:191` unchanged. The golden `contract-inputs.md` NEXT lines are exactly `send contract-inputs.md to whoever drafts your contracts, or fill your own SOW template from it` (default, twice) and `use llc-ops to draft the SOW from plans/larkspur-ceramics/contract-inputs.md` (business). The accepted check enforces it, and round-2 N6/R1j are still caught (`plant-accept.mjs` 31/31). |
| (g) deadlines only from the book or user-stated, no invented rule | **HOLDS** (item 1) | See item 1. |

### Consolidated follow-up list (all minor; none blocks the gate)

Carried from round 3:

1. **Resume grouping** (`routing-and-resume.md:12-23`).
   - Show one row per pending FIX (FIX-03 and FIX-04 both).
   - Add groups for `builds/<slug>/` and `uat/<slug>/`, so a signed plan stops showing "waiting for ow-build" once ow-build has started (`:22`).
2. **Acceptance-checker slips:**
   - A8: `tier_source: offer` on a next-stage plan.
   - A13: `request.md` paraphrased (needs the words in the answer key).
   - A16: `request.md` without `stated_on`.
3. **check-skill-contracts slips:**
   - K6: the `phase-quote.md` freeze rule deleted.
   - K7: a literal `-2` second writer.
   - K8: a backslash path with `shared: true`.
   - K13: a NEXT slash-hint mode that differs from the edge's verb.
   - K14: `routes.paths` dropping the folder.
   - K16/K32: an edges `writes:` row the body never names; require every `writes:` path in the verb table's Writes column.
   - K19: a STATUS `next:` with a mode in a phase file.
   - Also pinned-text-only: K3, K4, K18.
4. **FIX class check:** read the FIX file's class in §2.2 and refuse a covered Fix (free under the fix window) instead of offering a paid follow-on.
5. **`request.md` in the offer NEXT's read list** (`SKILL.md:134`).
6. **ow-build §12.2 quick-quote spec sources** (`spec/00`, `02`, `04`, `scope-and-milestones`), the decision (a) residue.

New this round:

7. A delivery-mode quote golden (new 1).
8. `contract-inputs-schema.md` for `fee: none`, plus a checker comparison of the credit fields with the quote (new 2, N21).
9. Align the quote header text and the checker on `none` versus omitted keys (new 3, N2).
10. Checker slips N4, N14 and N15 (new 4).
11. Pin the round-4 prose rules: K22–K24, K26–K31, K33, K34; widen the 5-a-week pin (new 5).
12. `phase-quote.md:187` "issue a new quote" wording, plus the owner question on re-issuing an expired quick quote (new 6).
13. Feasibility wording in `examples/offers.md:62`; say how a user's price book marks its feasibility-test unit (new 7).
14. A `plan.yaml` guard inside `phase-start.md` §1 (new 8).
15. Owner question: do UAT, the fix window, Documentation & training and the build hand-off apply to a feasibility quote? (new 9)
16. The small text slips (new 10).

Resolved since round 3 (dropped from the list): route rule 1 now requires an exported or accepted quote; the `phase-start.md:19` delivery-mode fee line; `awaiting:` without a credit date; the feasibility dead end.

### Verdict: **PASS**

- Every score is ≥ 6 (7 / 8 / 7 / 7; weighted 7.3).
- C1–C11 hold.
- All five round-4 items are verified by reproduction (A1, A5 and A22 caught; positive and negative delivery-mode runs; a signed folder writes nothing; the feasibility golden and its plants).
- Owner decisions (a), (c) and (g) hold.
- The round-4 edits added no blocking or major defect.
- The ten new defects are minor. Together with the six carried round-3 minors, they make up the 16-item follow-up list above.

Not verified by this evaluation: "candidate verifier PASS on every commit".
