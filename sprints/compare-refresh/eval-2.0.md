# Comparison integration — 2.0 evaluation

Verdict: **PASS** for comparison implementation and UI. This is a same-session App Architect / UX Evaluator review, not an independent model evaluation or approval of the overall 2.0 release.

## Contract results

- All ten approved source files matched the handoff hashes and were imported. Original research and prior evaluator reports remain historical evidence.
- 13 products × 13 dimensions = 169 cited cells; 12 selectable alternatives and 42 named sources. Added direct 2.0 Hindsight, Evolve and Bug Check citations.
- All Opchain dimensions were re-read against the 2.0 files. Methodology describes packaged behavior, default-off learning, signed approval and explicit retrieval without claiming measured superiority. See `research-2.0.md`.
- Both presets, all alternatives, cap/reset/persistence, malformed/obsolete/blocked storage and the complete no-JavaScript table pass browser checks.
- Slate and Emerald tokens remain unchanged. Settled dark/light themes pass automated contrast and accessibility checks at 375, 768 and 1280 pixels. The test asserts the exact approved background and accent tokens to prevent accidentally testing or importing the old palette.
- Keyboard focus and sideways table scrolling work. Sticky row labels and group headings stay visible; no document-wide overflow. Mobile citations and picker controls have 44px targets. Dense table typography follows the inherited site scale; this is not a claim of a full-site accessibility certification.

## Findings and corrections

Initial integrated scan: FAIL. Subtle notes lacked contrast over the dark green tint. Moving ordinary notes to muted text fixed the dark case but a second scan exposed muted notes/citations against the light tinted cells. Final correction uses semantic text color for both notes and citations inside the Opchain column. Both themes then passed with no disabled contrast rule. Source orange accents were never copied into global tokens.

## Code scores

- Functionality: 8/10 — browser interaction and recovery paths pass.
- Completeness: 8/10 — all contracted dimensions, citations, 2.0 copy and theme integration present.
- Quality: 8/10 — shared typed data, safe DOM text rendering and integrity coverage; no new dependencies.
- Visual/UX: 8/10 — grouped picker, readable highlighted column and sticky mobile labels.
- Weighted score: 8/10.

## Design scores

- Hierarchy: 8/10 — selection precedes the grouped evidence table; citations remain secondary.
- State completeness: 8/10 — default, empty selection, disabled additions, invalid state and no-JavaScript fallback covered. Data is bundled; no network-loading state is needed.
- Consistency: 8/10 — the release palette, type scale, shared cards and site navigation are retained.
- Accessibility: 8/10 — scoped WCAG A/AA scans, visible keyboard focus and responsive checks pass in both settled themes.
- Weighted score: 8/10.

## Fresh validation

- Full unit/integration suite: 89 files, 1,215 tests passed.
- Site check: zero errors, zero warnings, 39 existing hints.
- Package/contract checks: internal references, flags, skill contracts, PM-MCP, runtime bundles and plugin parity passed.
- Production site build: 83 pages; Worker public assets regenerated including LICENSE.
- Combined browser run: 39 passed (11 comparison checks and 28 existing route checks). The comparison suite was rerun after adding explicit release-palette assertions.
- Citation retrieval: 31 external HTTP successes, one direct rate limit (Devin pricing separately reviewed through browsing), ten internal built routes. See `docs/releases/evidence/2.0-comparison-links.json`.
- Manual visual review: dark/light desktop, table details and horizontally scrolled mobile. Images: `docs/releases/evidence/2.0-comparison/`.
- Coverage percentage was not measured; no invented coverage floor. Existing route checks retain their own documented exclusions; comparison scans do not exclude contrast.

Candidate verification passed all eight required checks; the full result and receipt are in `docs/releases/evidence/2.0-comparison-candidate.json`. Its immutable tree is the verification boundary; any later release changes need fresh gate evidence. No commit, deployment or release tag is part of this integration.
