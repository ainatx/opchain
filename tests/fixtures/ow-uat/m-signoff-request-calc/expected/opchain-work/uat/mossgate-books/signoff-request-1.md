---
ow_artefact: ow-uat/signoff-request
schema: 1
written_by: ow-uat 1.0.0 (protocol 1)
workstream: mossgate-books
subject: uat/mossgate-books/uat.yaml
created: 2026-11-19
clock: user-stated
origin: skill
request: 1
written: 2026-11-19
rec: 14
build_label: mossgate-uat-1
planned_send: 2026-11-20
deemed_date: 2026-12-07
deemed_date_source: "ow-tools calc date --from 2026-11-20 --business-days 10 --calendar us-federal: {'date':'2026-12-07','from':'2026-11-20','business_days':10,'calendar':'us-federal','holidays_skipped':['2026-11-26']}"
---
# Sign-off request 1: Mossgate Books user acceptance testing

If you neither sign this request nor send us a qualifying defect report, it will be deemed accepted on 7 December 2026 under TEST-1 of our contract. Signing this request accepts the build against the agreed acceptance checks.

## The build tested
Build mossgate-uat-1, tested in a copy of the shop's shared folder and the reorder spreadsheet.

## Every acceptance check
| Check | Result | Cases passed | Run and date | Run by | Source |
|---|---|---|---|---|---|
| AC-1.1 | pass | 2 of 2 | RUN-03, 18 November 2026 | user alone | user-stated (as reported) |
| AC-1.2 | pass | 1 of 1 | RUN-03, 18 November 2026 | user alone | user-stated (as reported) |
| AC-2.1 | pass | 1 of 1 | RUN-03, 18 November 2026 | user alone | user-stated (as reported) |

## Checked by the builder; not tested by your people
- AC-1.1, AC-1.2 and AC-2.1: run by Robin alone on 18 November 2026, after the shop's tester did not attend on 12 and 17 November 2026

## Punch list
None.

## Change requests and later change orders
None.

## Records created during testing
- 1 reorder list in the spreadsheet copy (SC-03)

## Environment
Tested in the test environment named when the build was ready: a copy of the shop's shared folder and the reorder spreadsheet. Not tested in production.

<!-- ow:internal -->
## Self-checks (same-session self-check)
Same-session self-check: the same assistant that wrote this request, applying a checklist; a discipline, not an independent review. Agent-checked.
| check | result |
| --- | --- |
| Acceptance coverage | OK |
| No false pass | OK |
| Data check | OK |
| People by role or id | OK |
| No credentials | NOT-CHECKED (pattern match only); read-through confirmed by Robin 2026-11-19 |
| No internal numbers | OK |
| No private names | OK |
<!-- ow:end-internal -->
