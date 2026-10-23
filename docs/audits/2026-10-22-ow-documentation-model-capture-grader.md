# Documentation grader corrections after an isolated model capture

The first isolated `write guides` run scored **13/17**. That result and its raw capture remain unchanged. This correction addresses three differences between the grader and the skill's published requirements. It does not rewrite the model's artifacts or turn the original result into a passing first attempt.

## Scope and source basis

- `references/document-formats.md` §2 requires a sourced “When you'd do it” line. Accepting a right curly apostrophe changes typography only; the label, description and source remain required.
- `references/phase-write.md` §2 explicitly reads the frozen `docs.yaml`. A citation such as `[docs.yaml environment]` must resolve to this workstream's documentation state, not a same-named file in the client repository. A supplied field path must exist as own properties of the parsed YAML map. Arbitrary file paths and another workstream's state are not added as accepted sources.
- `references/self-checks.md` §2 prohibits disclosure of our effort, rates, costs, margin and overruns. A complete checklist statement that these categories are absent discloses none of them. The correction recognizes only a value-free list in the exact `No internal numbers` result row. Other rows, values, exceptions and additional clauses continue through the disclosure checks. A cost amount introduced as an exception in that row is explicitly rejected even without the word “our.”

The edits are limited to `scripts/ow-documentation-acceptance.mjs` and the new `tests/ow-documentation-model-capture.test.js`. Shared meaning-check modules and skill prose are unchanged.

## Regression boundaries

The new test file contains 36 focused cases. Positive cases cover the curly apostrophe, the current frozen source and existing nested fields, and complete value-free absence lists. Negative cases cover missing labels or sources, invented scenarios, absent or malformed YAML, nonexistent/inherited fields, repository namesakes, another workstream's path, numeric margin and cost disclosures, positive effort and rates after an absence statement, extra table cells, and the existing RC-04c effort disclosure shape.

The writer check has no metadata filename exception. Regression cases require root `run-notes.md`, root `stray.md`, and an unrequested client-repository source file to fail as extra writes. The parent-requested harness note belongs in a separate evaluator-controlled capture view; that view must preserve raw evidence and all other unexpected writes. It is not a grader allowlist.

## Validation state

`node --check` passes for the edited script and new test. The scoped `git diff --check` passes. The integrated focused run passed 137 tests across seven files, including all 36 cases here. The 111 documentation goldens also pass. The unchanged evaluator view (only parent-requested harness notes excluded) grades 17/17; its original raw first pass remains 13/17. Full candidate verification is still pending; no full-suite PASS is claimed here.

The original screenshot limitations also remain: prepared PNG stubs are not valid screenshots, the fallback is missing, and the model correctly retained placeholders that block export. These corrections do not certify image validity or delivered documents.
