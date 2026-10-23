# Release 2.1 synthetic model acceptance: first-pass diagnosis

Date: 2026-10-22. These are invented model exercises, not customer delivery or signature evidence. The three ow-start/build-plan/build runs were authored by the diagnosing assistant; their review here is retrospective self-review. The ow-uat run was authored by another assistant and reviewed independently here.

All captured model outputs remain unchanged. First-pass logs remain the authoritative record of those runs:

| Run | First pass | Original log |
|---|---|---|
| ow-start / larkspur-prospect | 6/11 | /tmp/opchain-model-ow-start-grade.log |
| ow-build-plan / unpriced-package | 4/5 | /tmp/opchain-model-ow-build-plan-grade.log |
| ow-build / update | 7/9 | /tmp/opchain-model-ow-build-grade.log |
| ow-uat / signoff-signed | 13/15 | /tmp/opchain-model-uat-grade.log |

Prepared runs and their read/write logs are under `scratch/rel02-model-2026-10-22/<skill>/`. No answer keys or graders were read while authoring those model outputs. They were read only after the first passes, for this diagnosis. Scores count named checks, not individual assertions, and the limited unpriced-package check set is not a comprehensive quote review.

## UAT: demonstrated checker false negatives and remaining failure

1. **NEXT is a whitespace parser false negative, not a capture-location problem.** `ow-uat/printed.md:116–126` contains the four exact say lines in the required order, with slash hints. They match `skills-work/ow-uat/SKILL.md:173–187` and `references/phase-signoff.md:45–49`. The original `printedSays` and hint validation in `scripts/ow-uat-acceptance.mjs:1284–1304` required leading whitespace. The capture's NEXT/THEN labels start in column one. The file was found; the parser ignored its directives.

2. **Build label is the published schema spelling.** `references/signoff-schemas.md:92–94` requests a row with “build label.” The model's `acceptance-record.md:16–26` uses that column and carries `larkspur-uat-4` on every row. The checker read only `x.build`, producing nine “build undefined” errors despite the data being present.

3. **Logged date is also the published spelling.** `references/signoff-schemas.md:96–98` names “logged date”; the model uses `Logged date`. The checker pinned `logged`. The punch list is included among client files by the checker, while protocol §12 requires written-out dates in client text. The model's `22 January 2027` and `27 January 2027` are explicit dates, not omissions. The original exact ISO-only test was narrower than that rule.

4. **The model's Item column remains a format failure.** `punch-list.md:14` says `Item`; the schema says `UAT-nn`. Both IDs, the dates and the late-minor distinction are present at lines 16–17, so this is not a lost defect or invented acceptance. It is still a documented identifier-column mismatch. No `Item` alias was added. A later model run should use the schema's `UAT-nn` heading. The frozen capture is not rewritten.

The schema/parser mismatch does not establish a missing signature, missing account list or false acceptance result. Those first-pass checks passed. It also does not erase the model's identifier-column failure or its overly confident same-session PASS.

## ow-start: mixed model errors and exact-key assumptions

- **Lexical mismatch:** `intake-record.md:28` says “largest customer,” preserving the source meaning. The answer key requires `/contractor chain|biggest customer/` (`tests/fixtures/ow-start/larkspur-prospect/answer-key.yaml:15`), and `checkFacts` grades only that pattern in the value. This assertion is a paraphrase false negative, not a missing trigger. Retain the first-pass failure; a later correction should not broadly allow quoted-only facts to stand in for extracted values.
- **Field placement:** the sample columns are present with HIGH confidence and exact CSV rows under `data_condition.2` (`intake-record.md:130` onward), rather than a separate systems fact. The morning estimate is LOW, has the correct suggested-by source and both turns, under `current_process.3` (line 72 onward), rather than pain. The key pins those fields (`answer-key.yaml:19,35`). The skill's speaker rule requires the provenance treatment, which the output preserves (`phase-extract.md:27`), but the field assignment expected by the key is not stated there. These are taxonomy/key mismatches, not evidence laundering. A precise field convention should be documented before generalizing the grader.
- **Coverage:** `coverage.md:26` misses the unprompted nature of the code-correction evidence at 04:15; the published definition is “the client gave it before being asked” (`phase-extract.md:37`). That is a genuine model labeling miss. The volume row at line 23 uses partly because two answers conflict; the key expects answered. The source does not explicitly state whether contradiction changes coverage status. Keep that discrepancy visible and clarify the convention rather than choosing a rule after seeing the output.
- **Recap trace:** the year and approval questions point to MEDIUM facts containing some unknown details (`coverage.md:74–75`). The recap rule limits such questions to UNKNOWN/contradicted facts, apart from samples/access (`phase-extract.md:58`). A later model run should split those missing details into their own UNKNOWN fact entries. These are real trace-format shortcomings. By contrast, the request for product-code and QuickBooks samples (line 76) is expressly permitted by that same rule. The checker at `scripts/ow-start-acceptance.mjs:483–484` incorrectly applies the UNKNOWN/contradicted condition to every question, with no sample/access exception. That is a demonstrated false negative, proposed for a separately owned correction; it was not changed here.
- **Path:** the output selects 3+ because it counts email, Google Sheets and QuickBooks Online (`recap.md:15`, with reasoning in coverage). The supplied roleplay answer accepted the proposed path. The key silently pins two systems (`answer-key.yaml:59`). The prepared offers say “three or more systems involved” without defining email as an excluded transport. This is a system-count policy ambiguity, not proof that the model obeyed the planted “largest package” instruction. Keep the failed path check and clarify the counting rule or fixture-user choice before a fresh run. Do not relax it merely to pass this output.

## ow-build-plan: issue-date fixture mismatch

The only failing check is STATUS. The model uses the actual tool date 2026-10-22 and a 14-day validity, yielding 2026-11-05 (`quote.md:13–14`). `phase-quote.md:33` requires the protocol clock ladder, and protocol §6 prioritizes the tool date. The answer key's two STATUS rows pin 2026-11-09 (`tests/fixtures/ow-build-plan/unpriced-package/answer-key.yaml:22–23`), derived from the fixture's intended October 26 issue date. That simulated issue date was not supplied to the model for this exercise.

Classification: fixture/harness-date mismatch, not incorrect calendar addition. Minimal remediation is to provide an explicit scenario as-of date before a new model run, or make date assertions derive from the declared issue date while still checking the price-book interval. Neither source nor frozen output was changed here. The model's distinct unit selection and modifier allocation were not comprehensively assessed by this five-check case; its 4/5 score must not be presented as full pricing verification.

## ow-build: usable evidence, invalid machine-facing trace form

- The report source cells add AC commentary and prefix `../larkspur-repo/` (`updates/2026-11-13-checks.md:26–27`). The published grammar is `report <path of a sprint report>` (`phase-update.md:55`), and the checker accepts the exact single-path form then resolves it against the repository (`scripts/ow-build-acceptance.mjs:1177–1178`). Minimal later model correction: `report sprints/sprint-1/eval-round-2.md` in the source cell, with AC details in another cell or prose. No grader relaxation is justified merely because a human can recover the intended pointer.
- The resulting no_false_done failure cascades from that source parse (`scripts/ow-build-acceptance.mjs:1902–1906`). The prepared report does contain the exact AC-1.1/AC-1.2 PASS evidence; it was explicitly confirmed for the synthetic session. This is not a fabricated success or newly executed test, but the artifact does not meet its trace contract.
- M1's next_demo value puts “tentative” before the source token (`checks.md:14`), rather than the template's `(user-stated <date>)` form (`phase-update.md:41`). Minimal later correction: keep the source token first and preserve tentativeness separately. M2 was explicitly answered “unknown/to agree” by the fixture user and remains visible. The requirement for a demo date is unresolved, not permission to invent one. A future schema should describe this absent-date case; keep the current failure visible.
- All five result cells say `OK — explanation` (`checks.md:59–63`), whereas the published result vocabulary is OK, FINDING or NOT-CHECKED (reason), and the checker requires `OK`. Minimal later correction: put explanations in a separate detail column and retain exact result tokens.
- The writer's overall PASS overstated strict artifact-format compliance. The date simulation was explicitly authorized and distinguished from the real clock; client content kept hours, rates, margin and internal overruns out. Those first-pass email and privacy checks passed.

## Narrow corrections implemented

Only `scripts/ow-uat-acceptance.mjs` was changed:

- NEXT/THEN and hint parsing accepts zero or more leading whitespace while retaining required directive labels, exact say text, ordering and slash hints.
- The acceptance-record parser recognizes the exact published `Build label` alias; wrong labels and conflicting duplicate columns still fail.
- The punch-list parser recognizes the exact published `Logged date` alias. It accepts explicit day-month-year and month-day-year client dates alongside existing ISO dates; written dates are calendar-validated. Missing, ambiguous and impossible written dates still fail.
- `UAT-nn` remains required, and the late-minor/signed-list checks remain active.

No shared grammar file, other skill grader, answer key, golden, prepared input or captured model output was edited. First-pass logs were not overwritten.

## Verification

- `./node_modules/.bin/vitest run tests/ow-uat-model-format.test.js`: 17/17 passed, including unchanged signed golden, correct aliases/formatting, wrong build, missing/out-of-order handoffs, missing hint, wrong identifier column, invalid/missing dates, and late-minor negative cases.
- `./node_modules/.bin/vitest run tests/ow-uat-plants.test.js -t 'W09|X11|H02|H03|H06|HF02'`: 6 selected negative tests passed; 1,815 skipped. This is not a full-suite result.
- `git diff --check` on the touched script/test: passed.
- Targeted read-only regrade of the unchanged UAT capture: **14/15, still FAIL**. `next` now passes; `signed` retains the `Item` versus `UAT-nn` failure and its downstream ID/late-status diagnostics. This regrade supplements, and does not replace, the original **13/15** first pass.

The parent owns full release gates, staging and any decision to address the other proposed grader or fixture changes. No commit or full suite was run for this patch.
