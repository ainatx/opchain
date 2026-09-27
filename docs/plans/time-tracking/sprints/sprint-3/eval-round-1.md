# Sprint 3 — evaluation round 1

Verdict: FAIL during implementation review; remediation required before PR.
Same-session evaluator read the contract, code and exercised the full daily loop.

- Re-drafting a day containing an approved manual row tried to retire that row.
  `derive.mjs` must retire only derived rows. Add a regression that re-drafts after
  editing, adding and approving, and verifies identical ledger bytes.
- The original Markdown rounding sentence attributed manually changed hours to the
  derivation's rounding delta. Label the original rounding and reviewed total
  separately; render absent AI raw time as a dash.
- npm --prefix changes cwd to opchain. Resolve npm's INIT_CWD for the timesheet
  lifecycle so client commands target the invocation repo.
- Verify must run before loading a folded client view; otherwise corrupt ledgers
  throw before the command can print its per-check failure report.
- Assert cache-only hook I/O with a filesystem spy, and force a slow Git subprocess
  to exercise the nudge deadline. Include subprocess coverage of the daily loop.

Implementation scores before fixes: functionality 5, completeness 6, quality 6,
CLI UX 6. Weighted 5.7. Owner dogfood remains a separate, pending acceptance item.
