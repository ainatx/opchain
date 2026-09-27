# Sprint 3 contract — CLI, surfaces and dogfood

Scope: A19, B1–B13/B15, C1/C3/C5/C8 from the approved punch list. Reuse
Sprint 1/2 collection, derivation and append-only ledger. Node 24 built-ins only.

## Testable criteria

1. `init` writes private billing config and registry, plus only an ignored
   `timesheets/` line in the client checkout; refuse tracked output and accidental
   replacement. `--force` is explicit. No hook/settings installation.
2. `draft` writes private, gitignored Markdown; `review` exposes raw/rounded time,
   AI pricing, evidence, canary, quarantine metadata and protected derivation drift.
3. Unique entry prefixes support edit/amend/discard; reasons required. Only amend
   changes approved entries, and amended entries require re-approval. Manual hours
   use quarter-hour steps. All mutations use the existing ledger transaction lock.
4. Approval checks current and recorded canary, pricing and billability per entry;
   valid entries may approve while blocked entries exit 1. CSV includes only current
   approved revisions, safely quoted, labelled, privately written and currency-aware.
5. `today` is silent when empty; nudge returns only current-client JSON, reads no
   transcripts/event stream and always exits 0 within 500ms (3x CI allowance).
6. Help on every verb; errors use exit 1 (refusal) or 2 (usage/config). Human output
   fits 100 columns; narratives wrap at 72. Spotcheck samples approved evidence.
7. Explicit goldens cover Markdown draft/approved/empty, review including four
   exceptional states, CSV, today and four nudge cases. Temp-HOME CLI integration
   covers the entire daily loop, isolation, privacy canary and adverse transitions.
8. Run all existing fixture groups, full repository checks and new library coverage
   (>=90%). Record measured performance separately from subprocess integration.
9. Owner dogfood: repository/rate/date choice, manual hook installation, review and
   approval of a real day and CSV import check. Pending owner; not implied by build
   authorization. No release/deployment is part of this sprint build. The owner subsequently
   authorized resuming merges after Claude completed v2.0.4.

## Technical approach and evaluator contract review

Small render, CLI service and hook modules; pure formatting separate from I/O.
Read-only ledger views avoid collecting transcripts. Draft uses existing collector;
review derives cache metadata to expose drift. Hook runs in a bounded child process
so slow git/filesystem reads cannot stall SessionStart. Export refuses repository
paths except ignored timesheets directories and refuses tracked output. Keep other
workstreams' checkpoint state intact. The design's wide sample table is adapted to
compact columns with wrapped entry narratives beneath it to meet its 100-column rule.

Contract review: criteria cover all scoped verbs and states, partial approval,
protected history, mixed currencies and cross-client isolation. Ready to build.


## Required generated-file exception

The existing bundler copies root package.json verbatim into five skill runtimes
and then their plugin mirrors. The required C1 npm script therefore cannot pass
build/test bundle-parity checks without ten generated package.json updates under
skills/ and plugins/. These mechanical copies are the only exception to the
handoff's frozen paths; no skill instructions, catalogs or runtime implementation
are edited. The initial candidate gate correctly failed until they were regenerated.
