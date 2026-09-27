# Sprint 3 — evaluation round 2

Verdict: PASS for implementation; real-client dogfood remains pending owner.
Same-session evaluator re-read the contract and final implementation, inspected the
explicit output fixtures, and exercised both library and subprocess command flows.

## Scores

- Functionality: 8/10. Full init/collect/draft/review/edit/add/approve/export/verify/
  spotcheck loop passes; amend excludes a revision from CSV until re-approved.
  Re-drafting preserves manual and protected entries. Combined allocation checks
  refuse stale cross-client overlaps before approval/export.
- Completeness: 8/10. All scoped commands, Markdown/CSV/terminal states, npm entry
  point, manual hook snippets and runbook are present. Real-client setup, hook
  installation, owner approval and invoicing import remain external acceptance.
- Quality: 8/10. Node built-ins only, pure rendering, private outputs, append-only
  transactions, explicit prefix/reason validation, partial approvals and tests.
- CLI UX: 8/10. Bounded readable output, reasons and revisions, separate currencies,
  raw/reviewed/AI totals, metadata-only evidence and actionable refusal messages.
- Weighted score: 8/10; all dimensions above the six-point gate. No web UI or
  hosted deployment is in scope.

## Evidence

- 146 time tests pass across eight files, including all prior fixture groups and
  32 additional tests. Fourteen explicit golden files cover draft/approved/empty
  Markdown, review and its four exceptional states, CSV, today and nudge states.
- Privacy canary absent from ledger, Markdown and CSV after the full daily loop.
  Temp HOME and OPCHAIN_TIME_HOME isolate every test; real transcripts were not read.
- Library/unit tier: 125 tests in 1.55 seconds runner duration. CLI/process tests
  are a separate integration tier; full covered suite took 5.46 seconds.
- V8 coverage: full time library 1,160/1,163 lines (99.74%), statements 97.89%,
  branches 93.58%. New service/render/nudge modules have 100% line coverage; CLI
  dispatcher 96.87%. The subprocess-only nudge entry guard is separately exercised.
  Coverage provider is in an external temp directory; no dependency/lockfile change.
- Twenty fresh process runs per hook: prompt median 37.67ms (max 42.53ms), nudge
  median 98.85ms (max 108.74ms). A deliberately sleeping Git process exercises
  the nudge's 400ms child deadline, within the local 500ms test budget.
- Filesystem spy confirms nudge reads only registry, billing config, client ledger
  and canary; a second client's data and raw/normalized events are not read.
- CLI help, unique-prefix ambiguity, invalid dates/hours, tracked/unignored output,
  symlink refusal, CSV formula quoting, mixed currencies, missing prices, fresh and
  saved canary failure, and approved-entry protection are covered.
- npm --prefix uses INIT_CWD for the client location. Init changes only the client's
  gitignore; templates retain comments and start with an empty ticket regex.
- The first mandatory gate exposed package-manifest mirror drift from the required
  npm script. Regenerated exactly five runtime package.json files and their five
  plugin copies; source skill instructions remain unchanged. This necessary scope
  exception is recorded in the contract.
- Round 1 findings are fixed and covered. The mandatory full repository candidate
  gate and PR evidence check run before PR creation; CI remains the merge gate.

## Remaining acceptance

The owner has not yet supplied the real client/rate/date for the dogfood day.
No hooks were installed, real bills approved, or real CSV exported. The inherited
<1s real-corpus incremental collector target remains the explicitly accepted
Sprint 1/2 follow-up; this sprint does not reclassify it as achieved.
