## Sprint 1 — Evaluation Round 1

**Sprint:** ow-build-plan 1.0.0 (contract `sprints/release-2.1/ow-sprint-1/contract.md`) · **Branch:** `claude/ow-build-plan-sprint-1`, commits `6ffe4eaa..d820c6ff` · **Evaluator:** skeptical Evaluator, oc-app-architect Phase 6 Step 3 · **Date:** 2026-10-15

Graded from the contract, the approved design (`docs/plans/2026-10-06-ow-build-plan-design.md`, amendments 2026-10-14, owner decision 2026-10-15), the family rules (`skills-work/README.md`, `skills-work/ow-protocol.md`, audit "Cross-talk contract" R1–R16), the sibling designs (ow-build, ow-uat, ow-handoff, ow-tools §4–§5) and the diff. Every plant below was made in a scratch copy; no tracked file was touched.

### Code Scores

| Criterion | Weight | Score | Justification |
|---|---|---|---|
| Functionality | 30% | **6/10** | Everything automated is green and C1–C11 hold. But a model running the skill as written goes wrong at three points: the inbound NEXT from ow-start (and ow-build's FIX route) lands on a verb that does nothing with the file it carries (Bug 1, blocking); the quote's unavailable branch tells the user to send the internal pricing appendix (Bug 3); workshop transcription is refused by ow-tools under the skill's own `.gitignore` lines, and the phase has no handling for that refusal (Bug 4). The follow-on folder rule makes `-offer` and `-start` pick different folders (Bug 5). The built `quick-scope.md` breaks an approved sibling's read row (departure a). |
| Feature Completeness | 30% | **7/10** | All seven deliverables exist. Every design §4 verb and flag exists with its writes; every §9.1 self-check is present and labelled same-session; every ow-tools call has its absent-case; 18 golden runs cover every §9.2 case except Real use (moved to Sprint 6 by agreement). Gaps: the edges file under-declares the `--quick` writers (Bug 2); the quick path records no labelled scope self-check (Bug 15); the design was not amended for the departures that changed artefacts (a, f, g). |
| Code Quality | 20% | **6/10** | The checker is well structured, isolates each check (C11) and is backed by 78 new tests. It is thinner than the rules it claims to enforce: I planted 21 failures the Generator's tests do not, and 11 slipped through the acceptance checker; 9 of 16 edge and NEXT plants slipped through `check-skill-contracts` (Bugs 9, 10). The weak spots are add-unit modifiers, credential fragments, an extension rate leaked by number, internal prices in `contract-inputs.md`, edges `verb:` targets and path normalisation. |
| Visual/UX Quality | 20% | **6/10** | The welcome, verb table and plain wording are good, and close to ow-start. But the accepted NEXT prints config mechanics to the user ("handoffs.yaml `contract`: no say: line is set, so the public default follows") and puts the public default on the IF IT IS NOT AVAILABLE line (Bug 7). Nine of ten NEXT templates drop the protocol's `It will read:` and no-folder lines (Bug 14). The signed NEXT for a quick quote names files that do not exist (Bug 8). First-run setup forces two hand copies, and the family ships two different `offers.md` examples (Bug 12). |

**Weighted Code Score:** 0.3×6 + 0.3×7 + 0.2×6 + 0.2×6 = **6.3 / 10**

### Test Results

| Run | Result |
|---|---|
| `node scripts/gen-skills-catalog.mjs` | exit 0: 36 oc- skills, **2 ow skills** (`skills-work/`) |
| `node scripts/check-skill-contracts.mjs` | exit 0 (edges reciprocal, one writer per file) |
| `node scripts/lint-internal-refs.mjs` | exit 0 |
| `node scripts/ow-start-acceptance.mjs` | exit 0: larkspur-prospect 11/11, tidewell-defined-work 5/5 |
| `node scripts/ow-build-plan-acceptance.mjs` | exit 0: **18/18 golden cases pass** (63 checks) |
| `npx vitest run` (ow-edges, ow-build-plan-acceptance, catalogs, ow-start-acceptance) | 4 files, **150 run / 150 passed / 0 failed / 0 skipped** |
| `npm test` (full) | 112 files, **1730 run / 1730 passed / 0 failed / 0 skipped**, exit 0 |
| `npm run build` | exit 0; working tree clean afterwards |
| ow-tools `calc total` on both golden `quote-items.json` | 17450.00 and 2100.00, matching each quote's `fixed_price` |

**New tests:** 78. That is 22 in `tests/ow-edges.test.js`, 55 in `tests/ow-build-plan-acceptance.test.js` and 1 new `it` in `tests/catalogs.test.js`; three other catalogs tests were updated. All contracted test requirements are delivered, so no test penalty applies. Not verified: "candidate verifier PASS on every commit".

### Criteria C1–C11

| # | Verdict | Evidence |
|---|---|---|
| C1 | **PASS** | gen-catalog prints "ow catalog validated: 2 skills"; check-skill-contracts exit 0. |
| C2 | **PASS** | Body ~4,331 tokens (chars/4, the catalog's estimator) against a 5,000 budget. `cmp` shows `skills-work/ow-protocol.md` byte-identical to both skills' `references/ow-protocol.md`. |
| C3 | **PASS** | Grep of `skills-work/ow-build-plan/` finds no `llc-ops`, `Deftwright` or `oc-` name. `catalogs.test.js` plants `llc-ops` in `phase-quote.md` and it fails. My own plant of "Deftwright" in a written file is also caught by `private_names`. |
| C4 | **PASS (with slips)** | Tests plant one-sided edges in both directions, a field mismatch, a dangling verb, a wrong-owner verb and an unknown destination, and all fail. My extra plants that were **caught**: a reads row for `call-guide.md` that ow-start never hands to ow-build-plan; a hands-off to ow-start with no reads row; `profile.md` read without `shared: true`; a dangling NEXT in a reference file; a NEXT naming planned `ow-uat` with an undeclared verb; an IF line 9 lines below its NEXT. **Slipped:** a dangling `verb:` in an edges hands_off row (`/ow-build-run`); a hands_off `verb:` owned by another skill; a NEXT template whose say differs from the edges/table say; a hands_off row with no NEXT template (R15). |
| C5 | **PASS (with slips)** | The test plants `contract-inputs.md` as a second output and it fails. Same-file plants with a different placeholder are caught. **Slipped:** the same file spelled `opchain-work/plans/<client>/contract-inputs.md`, `plans/<client>/./contract-inputs.md` or `Contract-Inputs.md` (the same file on macOS); a bogus mode `/ow-build-plan-quote --bogus`. **Truth plant:** declaring what the verb table says (`--quick` writes `quote.md`) fails one-writer, so the rule passes only because the edges file omits that writer (Bug 2). |
| C6 | **PASS** | 18/18 golden cases pass; every §9.2 bullet except Real use (deferred by the contract) has a case. |
| C7 | **PASS (with slips)** | Every §9.2 case has a planted failure in vitest that the checker catches. My extra plants that were **caught**: a key in `STATUS.md`; no error-kind check; a confidence label in `collection.md`; wrong credit days in the offer text; the over-limit STATUS pointing at a quote; a unit id not in the book; an export written on a refused `--signed`; the business name in the plan; "Deftwright" in a written file. **Slipped:** an add-unit modifier applied with no evidence; a fragment of the read-only key; the UAT extension rate in client text without the word "extension"; only the `## Valid until` sentence wrong; the fix-window duration sentence wrong; a unit price copied into `contract-inputs.md`; tester roles recorded as people's names in `contract-inputs.md`; a person's name as tester in a quick `quote.md`; a follow-on run that rewrites the earlier plan's `plan.yaml`; the business say-prefix reused for the wrong file; "costs about 17k" in the plan. |
| C8 | **PASS** | The golden quote's appendix sits between the markers. The ow-tools `preflight` in the test strips exactly one section, and the body has no "Pricing lines", "175.00" or "priced by". (The separate §9.2 UAT rule, extension rate only inside the markers, slips when the rate is restated by number: Bug 9.) |
| C9 | **PASS** | The `signed-before-accepted` golden case writes nothing; planted build-request and STATUS writes fail. The signed NEXT is `use ow-build to start plans/<client>/` with `/ow-build-start` and the handoffs.yaml `build` line as IF IT IS NOT AVAILABLE, checked statically and in `build-request.md`. |
| C10 | **PASS** | `git diff 6ffe4eaa..HEAD --stat -- skills/ plugins/ src/ public/ site/ package.json package-lock.json .claude-plugin/ mirror/` is empty. `sync-plugin-skills --check`, `sync-skill-bundles --check` and `gen-mcp-catalog` agree. Of the `catalogs.json` changes, only check-skill-contracts reads `edges`/`plannedVerbs`. |
| C11 | **PASS** | Run-file plants each fail only the checks that read them, and the rest run: invalid `quote-items.json`, invalid `handoffs.yaml`, an invalid `offers.md` block, `plan.yaml` as a list, `STATUS.md` as a directory, `payments` as a string, and binary `price-book.yaml`. Not covered, matching ow-start's checker: a malformed `answer-key.yaml` or `checks: <string>` throws out of `runCase` and aborts the CLI loop (Bug 11). |

### Bugs Found

Ordered by severity. B = blocking, M = major, m = minor.

1. **[B] The inbound edge from ow-start dead-ends.** `skills-work/ow-start/SKILL.md:115` and its edges row (no `verb:`) print `use ow-build-plan on intake/<client>/intake-record.md`. ow-build design §6.1 adds a second inbound route, `use ow-build-plan on handoffs/<client>/fixes/FIX-nn.md`. Both land on bare `/ow-build-plan`. At `skills-work/ow-build-plan/SKILL.md:45,189` that verb writes nothing, shows the welcome when `plans/` is absent, and lists only `plans/<client>` STATUS lines, so ow-start's `next: ow-build-plan on intake/…` line is never shown. Nothing routes `path_kind: build-plan` → `-offer`, `defined-work` → `-quote --quick`, or a FIX file → follow-on. **Repro:** `--prepare offer` (ow-start output, no `plans/`), then say ow-start's NEXT; per SKILL.md:189 the skill shows the welcome.
2. **[M] The edges file hides the `--quick` writers.** `SKILL.md:52` and `references/phase-quote.md:10` say `--quick` writes `quote.md` and `quote-items.json`. `skill.edges.yaml:26-27` declare only `/ow-build-plan-quote`. Under the README's own rule ("a mode of a verb is its own writer"), declaring the truth fails one-writer. **Repro:** add `{ path: plans/<client>/quote.md, verb: /ow-build-plan-quote --quick }` → `plans/<*>/quote.md: 2 writers`. The same rule was the reason to rename `scope.md` but was not applied to `quote.md`.
3. **[M] The quote's unavailable branch says to send the internal pricing.** `SKILL.md:152` ("send the Markdown after the header"), `SKILL.md:119` and `skill.edges.yaml:160` ("Send the Markdown"). After its header, `quote.md` holds the internal appendix (unit prices, manual-price records, the UAT extension rate). **Repro:** golden `unpriced-package/.../quote.md` after the header contains `### Pricing lines` and `175.00`.
4. **[M] Transcripts are committable, and the ow-tools refusal has no handling.** `SKILL.md:89` says `workshops/` is "never committed", but `references/phase-start.md:94-95` add only `inbox/` and `audio/` to `.gitignore`. ow-tools `transcribe` refuses with exit 4 unless `opchain-work/**/transcript.*` is ignored, and `references/phase-collect.md:28` has no exit 3/4 handling (compare `phase-export.md:39`). **Repro:** in a scratch git repo with the skill's two lines, `ow-tools transcribe opchain-work/plans/acme/audio/w1.m4a --out opchain-work/plans/acme/workshops/W1/` → exit 4 "these would be committable … transcript.json, transcript.md".
5. **[M] `-offer` and `-start` disagree on the follow-on folder.** `references/phase-offer.md:9` and `references/phase-start.md:9` each take "the next free number from 2". Once `-offer` has written `plans/<client>-2/build-plan-offer.md`, `-start`'s next free number is 3, so the offer and the plan split across folders. No golden run covers offer then start on a follow-on.
6. **[M] The builder-neutral rule contradicts the map and the golden.** `references/phase-export.md:30` forbids "any currency amount" in the plan. `references/phase-map.md:25` asks for "the cost of a miss in the client's own numbers", and golden `build-plan.md:22` carries "$1,800", which `tests/fixtures/ow-build-plan/README.md` calls a client fact. A model following phase-export raises FINDING and blocks export, or deletes client facts. The checker allows the amount, so a real run and the skill text disagree.
7. **[m] The accepted NEXT renders badly.** The `SKILL.md:159` template prints a "handoffs.yaml `contract`:" prefix into the user's NEXT. In the defaults case (golden `contract-inputs.md` `## Next`) it prints "no say: line is set, so the public default follows", which is in no template and must be invented. It also moves the public default to IF IT IS NOT AVAILABLE, unlike design §8 and protocol §11 (print the say line, else the public default).
8. **[m] The signed NEXT is wrong for a quick quote.** `SKILL.md:165` "It will read: build-request.md, plan.yaml, scope.md, acceptance.md" names files a quick quote never has (it has `quick-scope.md`), and omits `quote.md`, which `/ow-build-start` reads (ow-build design §3). Also `references/phase-quote.md:184` "This comes from the Build Plan" is false in quick mode.
9. **[m] The acceptance checker misses failures inside its own rules.**
   - `scripts/ow-build-plan-acceptance.mjs:612` counts only `x<factor>` modifiers, so add-unit modifiers are never checked.
   - `:466` matches only the whole key, so a fragment of the read-only key passes; the skill says "not … a part of one".
   - `:714` looks only for the word "extension", so the rate restated by number passes.
   - `:798` lets unit prices in the `contract-inputs.md` body pass.
   - No check that tester roles in `contract-inputs.md` or quick `quote.md` are roles, not people.
   - A follow-on run that rewrites the earlier plan passes.
   - `:916` strips the say-prefix anywhere on the line, so a business line with the wrong file passes.
   - The "valid until" and fix-window checks use `includes`, so one correct mention hides a wrong one.

   Each repro is in the C7 row.
10. **[m] The edge checker has gaps.**
    - `scripts/check-skill-contracts.mjs:591` never resolves a hands_off `verb:`.
    - NEXT templates are never compared with the edges `say:`.
    - R15 "every handoff has its NEXT template" is not enforced. It holds today: all 10 ow-build-plan says have one.
    - `:506` `normPath` does not normalise an `opchain-work/` prefix, `./` or case.
    - Writer-verb modes are not validated (only the root verb is).
11. **[m] A bad answer key aborts the whole run.**
    - `scripts/ow-build-plan-acceptance.mjs:953` loads the key outside the try, so a malformed `answer-key.yaml` or `checks: <string>` aborts every remaining case (exit 2).
    - YAML errors from `handoffs.yaml`/`offers.md` give no file name ("check could not run: deficient indentation (2:1)").
    - `price-book.yaml` errors say "header is not valid YAML" for a plain YAML file.
12. **[m] The family ships two different `offers.md` examples.** ow-start's `/ow-setup` (`skills-work/ow-start/SKILL.md:150`) creates `offers.md` and `handoffs.yaml` from `skills-work/ow-start/examples/`, which lack `ownership`, `after_handoff` and `contract_clauses`. `skills-work/ow-build-plan/SKILL.md:91` points at either source. A user who follows the family's own setup always lands in the absent-cases for fix window, ownership and clauses.
13. **[m] The quick header spec omits `handling`.** `SKILL.md:28` says `-quote --quick` keeps `handling` in its own header, and the goldens carry it, but `references/phase-quote.md:59-81` (quote header keys) and §3 (quick-scope header) never list it.
14. **[m] Nine of ten NEXT templates are incomplete.** At `SKILL.md:130-172` they omit protocol §9's `It will read:` and `[no folder attached: attach …]` lines (ow-start carries them). These matter on hosts without a folder.
15. **[m] The quick path records no scope self-check.** `references/phase-quote.md:32-56` states "every in-scope package has at least one check" but records no labelled Acceptance coverage / Out of scope present result. Design §9.1 runs those in `-scope`, which the quick path skips.

### Design departures

| # | Departure | Ruling | Reason |
|---|---|---|---|
| a | `--quick` writes `quick-scope.md`, not `scope.md` | **Needs owner decision** (then change the docs) | Forced by contract C5 ("one writer **verb**"); audit R3 says one writer **skill**, which would have allowed it. It breaks approved siblings. ow-uat §3.1 (`2026-10-09-ow-uat-design.md:69`): "`scope.md` absent: stop"; `:72` and P1 (`:346`) take roles from "the quick `scope.md`'s UAT approach". ow-handoff §7.1 (`:61`, `:152`): "or the quick-quote `scope.md`". ow-build §6.1 (`:96`): classified "against `scope.md`". A quick-quote client would stop at ow-uat. The build-plan design §4/§9.2 still says `scope.md`. **Recommendation:** keep `quick-scope.md` (a distinct artefact is clearer, and the siblings are unbuilt) and amend ow-uat §3.1/P1, ow-handoff §7.1 and ow-build §6.1 plus this design's §4 in the same PR, owner-approved. |
| b | Edges schema gains `seeded_by` and `shared: true` | **Accept** | Needed for `profile.md` (ow-start `/ow-setup`, seeded by `-extract`) and for workspace files read by the whole family. Documented in `skills-work/README.md`; `seeded_by` is limited to the owning skill. No sibling design specifies the schema. |
| c | NEXT form ``NEXT: handoffs.yaml `contract`: …`` | **Change** | Keep it as an authoring template the checker resolves, but the printed NEXT must be the say line exactly, or the public default (design §8, protocol §11), with no `handoffs.yaml` prefix and no invented "no say: line is set" text (Bug 7). |
| d | Signed NEXT `use ow-build to start …`; `catalogs.json` `plannedVerbs`/planned skills | **Accept** | It corrects design §8's `use ow-build-start` to protocol §9 (skill id first). `/ow-build-start` is ow-build's declared verb (ow-build design §3), and `plannedVerbs` resolves names only. Fix its `It will read:` line (Bug 8). |
| e | Price-book units gain `size`; modifiers use `multiply:`/`add_unit:` | **Accept** | Design §6.1 is illustrative. `size` makes ow-uat §7.1's "the build's own size letter" machine-readable, with a `user-stated` fallback. The checker must cover `add_unit` (Bug 9). |
| f | Extra artefacts: `quote-items.json`, `build-plan.md`, `export/export-report.md`, the map self-check in `map/current.md`, `## Next` in contract-inputs/build-request | **Accept** | `quote-items.json` matches `plugins/ow-tools/lib/calc.mjs` `total()` exactly (`[{label, quantity, unit_price} | {label, amount}]`, integer quantity, 2-decimal strings). Real `calc total` on both goldens returns each quote's `fixed_price`. `build-plan.md` is the Markdown source design §7 requires; `## Next` in `build-request.md` matches audit edge 12. Declare the `--quick` writers honestly (Bug 2). |
| g | Dates (collection deadline = start + 2 business days per plan week; delivery = start + 5); documentation & training outside the fixed price; follow-ons in `plans/<client>-<n>/` | **Needs owner decision** on the collection-deadline rule; **accept** the rest | Two business days per week for 1–3 workshops plus all collection is business policy hard-coded in skill text, not the user's data, and the design names no rule. Ask the owner, or move both to `price-book.yaml`/`offers.md`. Training outside the fixed price follows design §6.3 and ow-uat P1 ("its own declinable line"). The `<client>-<n>` convention is fine, but Bug 5 must be fixed. |
| h | The skill never creates `price-book.yaml` or `brand.yaml` | **Accept** | It is stricter than protocol §4 (create-once allowed) and keeps one writer per user file. The first-run friction it adds should be offset by fixing Bug 12. |

### Gaps vs Contract

- Deliverables 1–7 are all present. Deliverable 4's edges file is incomplete for `--quick` (Bug 2).
- Deliverable 7 (ow-start's `path_*` header declared as an edge) is met as data, but the edge has no receiving verb (Bug 1). The contract's purpose for this deliverable, an edge "not prose", is only half achieved.
- "candidate verifier PASS on every commit" was not verified by this evaluation.
- The approved design (§4, §9.2) was not amended for departures a, f and g, so it now disagrees with the built skill. Sibling designs ow-uat, ow-handoff and ow-build disagree with departure a.

### Verdict: **FAIL**

Every score is ≥ 6 and C1–C11 all hold, but Bug 1 is blocking and departure (a) needs an owner decision before merge. Fixes, in order:

1. **Route the inbound edge (Bug 1).** Give bare `/ow-build-plan` an `on <path>` form: an intake record → read the recap's `path_kind` (`build-plan` → `-offer`, `defined-work` → `-quote --quick`, else ask); a `FIX-nn.md` → the follow-on `-offer`. List ow-start STATUS lines whose `next:` names ow-build-plan on the resume screen. Add the verb to ow-start's edges row, and add a golden run from ow-start's output.
2. **Owner decision on `quick-scope.md` (departure a).** Then amend ow-uat §3.1/P1, ow-handoff §7.1, ow-build §6.1 and this design's §4/§9.2 in the same PR.
3. **Declare `--quick` as a writer honestly (Bug 2).** Either give `quote.md` and `quote-items.json` a schema-level "alternative modes of one verb" allowance that the checker understands, or split the files. Do not omit the writer.
4. **Fix the quote's unavailable branch (Bug 3).** Make it "send the quote without its header and the internal appendix (everything between the `ow:internal` markers)" in SKILL.md:119, :152 and edges:160.
5. **Fix the ignore lines and the refusal (Bug 4).** Add `opchain-work/**/transcript.*` (and `workshops/`, to match SKILL.md:89) to the `.gitignore` lines, and give phase-collect exit 3/4 handling.
6. **One follow-on folder rule (Bug 5).** `-start` reuses the folder holding this follow-on's offer, and a golden run covers offer then start.
7. **Reconcile the builder-neutral rule with client cost facts (Bug 6).** Forbid prices, fees and rates of the provider, not the client's own figures, in phase-export and the checker alike.
8. **Render the accepted NEXT as departure (c) says (Bug 7).** Fix the signed and quick NEXT read lists and add `It will read:` to every template (Bugs 8, 14).
9. **Close the checker slips (Bugs 9, 10, 11).** At minimum: add-unit modifiers, key fragments, the extension rate by number, unit prices in `contract-inputs.md`, edges `verb:` resolution and an `opchain-work/` path prefix. Add each as a planted test.
10. **Clean up the remaining minors.** Bugs 12, 13 and 15, plus the owner ruling on the collection-deadline rule (departure g).
