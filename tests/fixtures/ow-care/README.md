# OW-07 prospective model acceptance pack

`casebook.json` contains 36 bounded prospective runs: happy, refusal and resume for all nine care verbs, plus changed rollover, final settlement, short month, holiday reply miss, separate quote, tool/no-tool health and privacy cases. Each case declares its clock and tool availability **before** model output. Source snapshots live in `seed/`; `prepare.mjs` materializes one scratch run and `grade.mjs` checks its semantic output. These scripts do not run a model or claim an actual client month.

Use a new scratch directory outside the graded workspace for each case:

```sh
node tests/fixtures/ow-care/prepare.mjs start-after-build /tmp/ow-care-start-after-build
# Give session/answers.md and opchain-work/ in that directory to a fresh model.
# Save its visible response as printed.md in that directory.
node tests/fixtures/ow-care/grade.mjs start-after-build /tmp/ow-care-start-after-build
```

The prepared `session/answers.md` gives the clock, tool-present or tool-absent branch, exact user answers, and a `receipts/` destination outside `opchain-work/` for runtime and native export inspection. The evaluator provides the declared local tool or no-tool branch and stubs public health observations; no real client endpoint or credential is used. Each case starts from its own seed. Casebook overrides apply only to that case. `checks` are semantic answer-key assertions, not golden deliverables. After grading, a human must inspect chronology, evidence citations, approvals before work, handling text, PDF/Word stripping and resume behavior. Passing automated checks alone is not independent acceptance.

The direct regressions in `tests/ow-care-contract.test.js` cover changed-rule arithmetic and the export preflight boundary. They do not substitute for fresh-model runs. One actual client care month and report remain **NOT-CHECKED** until owner use; synthetic fixtures cannot satisfy them.
