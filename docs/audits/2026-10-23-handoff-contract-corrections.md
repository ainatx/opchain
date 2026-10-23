# Handoff checker and prospective contract corrections

Date: 2026-10-23. Scope: F-007 from `2026-10-23-contract-model-independent-review.md`. This is implementation evidence, not independent acceptance, release approval or a real-client run. F-008 native PDF layout is a separate exporter repair owned by the coordinator.

## Corrections

- Text path scanning no longer decodes compressed PDF/DOCX containers as UTF-8. This matches the existing credential scanner's native-container exclusion. Native decoded-content inspection and visual review remain separate requirements; the checker does not certify native contents or layout.
- Commands accept an existing source citation on the same line in parentheses or backticks, including a section anchor. Exact command bytes must occur in that safely contained repository file. Missing sources, invented commands, traversal and escaping symlinks fail before they can establish command provenance.
- Provisional dates, revision dates and correction-email dates accept both day-month and month-day written-out forms for the exact expected date. Wrong dates and longer year-prefix matches fail.
- Email financial checks inspect text nodes and prose metadata rather than HTML/CSS tokens. Hidden element text, comments and prose metadata remain inspected. Quoted CSS strings are also inspected, including concatenated strings and escaped letters/numbers; non-style attribute values cover attribute-driven generated content. Credential and private-name checks still receive the raw HTML. This extraction is not a browser rendering or visibility certification.
- Embedded instruction quotations use the parsed top-level `embedded` string array for YAML files, including JSON serialization. Nested/arbitrary fields and malformed arrays do not satisfy quotation requirements; content outside that field is still checked for following the planted instruction.
- The public screen contract defines one exact stored-no handling notice, allowed by the screen grammar. Optional narrative or added commentary remains rejected. Historical captures are not rewritten to the new notice.

## Prospective changes before the next blind run

The fixture repository README now documents the actual `npm --ignore-scripts test` preparation command. Its earlier omission was a fixture/public-command boundary problem; a true external execution receipt never supplied the repository citation that the old package contract required.

A missing output directory can now be described as **generated output** only when the same line cites an existing repository document which labels that exact backticked directory in one of three published forms. This describes where a command would write; it never proves execution or permits a missing source. Traversal, absolute paths, escaping/broken symlinks and unsupported/negated labels fail. The fixture README identifies `dist/` this way. Other source paths still must exist inside the repository.

These reference changes are part of the existing unpublished ow-handoff 1.0.1 correction. The original capture, its original README, native outputs, receipts and original 9/14 grade remain unchanged.

## Verification

`npx vitest run tests/ow-handoff*.test.js`: **11 files, 584 tests passed**, including **50 focused new regressions**. The full run covers historical goldens, planted failures, both prior evaluation rounds, security, close state, punch format, current/historical version compatibility and fixture preparation. Log: `/tmp/opchain-handoff-f007-reviewed-final.log`.

The new tests cover native-container byte false positives alongside actual text absolute paths; citation forms and provenance failures; exact date alternatives and wrong values; generated-output provenance, negation, traversal and broken/escaping symlinks; CSS false positives alongside visible, hidden, metadata and comment financial leaks; raw HTML credentials; YAML/JSON field boundaries; and prescribed handling notice versus optional prose.

`npm run check-skill-contracts`: PASS. `git diff --check`: PASS. An initial targeted run passed 400 tests; the expanded run exposed a broken-symlink trailing-slash edge, which was corrected. A subsequent full run exposed only a case-sensitive existing security-policy text pin; the wording was restored without changing the policy. Independent review then found that stripping entire CSS blocks also discarded visible generated content. The checker now retains quoted CSS strings and attribute values; four new adversarial regressions cover direct, concatenated, escaped and attribute-driven content. The final full run above is the post-correction result.

## Historical regrade boundary

A direct regrade of the unchanged retry-4 projection against the *new* fixture falsely treats its old README as an authored repository write because the prospective baseline changed. That diagnostic is retained in `/tmp/opchain-handoff-retry4-f007-regrade.log`; it is not evidence that the model edited the repository.

A separate read-only regrade verifies the projection README bytes against `baseline_files` in the original preparation receipt, uses those bytes only as a temporary predecessor input, and leaves every captured byte unchanged. The current checker then passes **12/14**: only `screen` and `package` fail. The screen retains the noncanonical handling line and three optional narrative paragraphs. The package retains the original undocumented `npm --ignore-scripts test` citation and unqualified nonexistent `dist/` source-path failure. Log: `/tmp/opchain-handoff-retry4-f007-fixed-baseline-regrade.log`. This diagnostic establishes correction of checker defects; it does not turn the original capture into a pass or waive F-008.

Fresh blind output, native export inspection and independent review remain required.

## Fresh retry-5 root citation correction

The fresh writer correctly cited the actual repository as `larkspur-repo/`. The checker now removes trailing slashes only for an exact configured-root comparison. Lookalike names and traversal remain rejected. The focused suite passed **53/53** after adding those three cases; the earlier full 584-test result above predates this narrow change. Independent frozen regrades and raw/product-view limitations are recorded in the final independent review.
