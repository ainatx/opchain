# Research contract corrections — 2026-10-23

The retry-3 review found a schema conflict: a model faithfully quoted an instruction from `profile.md`, but the Suspicious content grammar accepted only a URL or an `inbox/` file. The research 1.0.3 contract now represents that existing workspace input truthfully within the same seven findings sections. The grader verifies the quote against the actual pre-existing file and rejects absent, fabricated, unrelated-workstream, traversal and symlinked inputs. This permission describes provenance for inputs the workflow already reads; it adds no authority to search arbitrary files or relabel a profile as inbox evidence.

The source quotation rule is explicit in the working schema and run instructions: at most three quotations per source, each at most 25 words, and no reconstruction of more than 25 consecutive source words through adjacent quotation bullets, source paragraphs or blank separators. Separate, noncontiguous excerpts may total more than 25 words. Regression cases cover both sides of that boundary.

NEXT instructions require the whole prescribed block, including the no-folder attachment guidance and unavailable-skill fallback. Ledger guidance distinguishes a supplied date from an actual event time: unknown times are `--:--`, an assumed date cannot supply a fabricated precise time, and corrections preserve previous rows. The parser checks structural consistency and valid clock ranges; independent capture review still determines whether a claimed measured or user-stated timestamp has evidence.

The fixture instructions retain the recorded-source disclaimer and require a fresh model exercise to disclose its source adapter and clock evidence. No frozen model capture was edited or reclassified by this correction. The previous retry results remain historical evidence; the changes and deterministic tests do not establish fresh-model acceptance, live-source freshness, real-customer use or installed-host readiness.

## Validation

`node --check scripts/ow-research-acceptance.mjs` passed. The following command passed all 629 tests across five suites:

```sh
npx vitest run tests/ow-research-acceptance.test.js tests/ow-research-plants.test.js tests/ow-research-eval-r1.test.js tests/ow-research-eval-r2.test.js tests/ow-research-contract-corrections.test.js --maxWorkers=1
```

The new contract suite includes 21 positive and negative regressions. Historical accepted research versions remain supported by the grader. The current-skill assertions use research 1.0.3 and build-plan 1.2.1. Shared-protocol changes, other skill versions, whole-repository gates and independent blind model review are coordinated separately.

## Independent-review corrections: F-004 and F-006

F-004 exposed two distinct problems in the first correction. Checking that a path
existed before the run did not establish that its current quotation existed then;
and treating the mutable input's whole current contents as a source made an
append-only ledger look like a new copy of itself. Local suspicious-content
quotations now use `run.priorRead` only after checking that the actual input still
exists, is a file and has no symlinked path component. Missing actual inputs never
borrow fixture bytes. A quotation introduced only in current queries, sources or
findings fails provenance.

The copy check now retains local source identity and tracks exact, ordered,
non-reused predecessor spans in that same file. Those inherited words are omitted
only from that file's self-source comparison; newly written words remain checked
together, including duplicates appended to the same file. All output bytes are
still compared against other local sources, pages and supplied files. The
regressions cover the authentic predecessor ledger instruction, a rewritten
findings file with retained blocks, fabricated current-only quotations in all
three mutable topic files, and fresh long copies into both the originating
ledger and other outputs. An intermediate test caught and corrected a boundary
where one newly added citation word followed by 25 retained words was wrongly
counted as a new 26-word copy.

F-006 now has one canonical source-block outcome: `redirected to <url>`. Its
destination must equal the ledger outcome; the original request URL and run must
also match. The destination remains a separately logged request with its own
block. Research 1.0.3 requires blocks for newly recorded redirects. Historical
1.0.0–1.0.2 omissions, including completed historical runs resumed by a current
writer, stay valid; any existing block at any version must reconcile truthfully.
This compatibility rule preserves append-only history without editing goldens.

The focused contract suite now has 35 passing regressions. Syntax,
`git diff --check` and `npm run check-skill-contracts` also pass. Re-running the
five-suite command above passes **643/643 tests across all five files** (49.93s).
These are grader and contract
corrections for synthetic preparation, not release approval. No frozen capture,
manifest or golden was rewritten; the research capture's raw 20/22 and separately
verified 22/22 projection remain the coordinator's preserved evidence.
