---
ow_artefact: ow-uat/signoff-request
schema: 1
written_by: ow-uat 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: uat/larkspur-ceramics/uat.yaml
created: 2027-01-22
clock: user-stated
origin: skill
request: 1
written: 2027-01-22
rec: 51
build_label: larkspur-uat-3
planned_send: 2027-01-22
deemed_date: "none (clauses: none)"
deemed_date_source: "none (clauses: none)"
---
# Sign-off request 1: Larkspur Ceramics user acceptance testing

Our contract has no deemed-acceptance clause, so this request is accepted only when you sign it. Signing this request accepts the build against the agreed acceptance checks.

## The build tested
Build larkspur-uat-3, tested in the Larkspur staging mailbox, a copy of the order sheet and the QuickBooks Online sandbox.

## Every acceptance check
| Check | Result | Cases passed | Run and date | Run by | Source |
|---|---|---|---|---|---|
| AC-1.1 | pass | 10 of 10 | RUN-03, 21 January 2027 | order coordinator | results file results-session-3.csv |
| AC-1.2 | pass | 2 of 2 | RUN-03, 21 January 2027 | order coordinator | results file results-session-3.csv |
| AC-2.1 | pass | 3 of 3 | RUN-03, 21 January 2027 | order coordinator | results file results-session-3.csv |
| AC-3.1 | pass | 10 of 10 | RUN-03, 21 January 2027 | operations manager | results file results-session-3.csv |
| AC-4.1 | pass | 60 of 60 | RUN-03, 21 January 2027 | order coordinator | results file results-session-3.csv |
| AC-5.1 | pass | 10 of 10 | RUN-03, 21 January 2027 | bookkeeper | results file results-session-3.csv |
| AC-5.2 | pass | 1 of 1 | RUN-03, 21 January 2027 | bookkeeper | results file results-session-3.csv |
| AC-CO-01.1 | pass | 5 of 5 | RUN-03, 21 January 2027 | operations manager | results file results-session-3.csv |
| AC-CO-01.2 | pass | 1 of 1 | RUN-03, 21 January 2027 | operations manager | results file results-session-3.csv |

## Checked by the builder; not tested by your people
None: your people ran every check.

## Punch list
- UAT-08: the confirmation view's date column is cut off on a narrow screen (cosmetic)

## Change requests and later change orders
- UAT-06: a portal for customers' repeat orders (raised as a change request; not part of this acceptance)
- UAT-07: a weekly text message about exceptions (CO-03, declined on 22 January 2027; the condition lapsed)

## Records created during testing
- 9 invoices in the QuickBooks Online sandbox (session 1, SC-06)
- 10 invoices in the QuickBooks Online sandbox (session 3, SC-06)

## Environment
Tested in the test environment named when the build was ready: the Larkspur staging mailbox, a copy of the order sheet and the QuickBooks Online sandbox. Not tested in production.

<!-- ow:internal -->
## Self-checks (same-session self-check)
Same-session self-check: the same assistant that wrote this request, applying a checklist; a discipline, not an independent review. Agent-checked.
| check | result |
| --- | --- |
| Acceptance coverage | OK |
| No false pass | OK |
| Data check | OK |
| People by role or id | OK |
| No credentials | NOT-CHECKED (pattern match only); read-through confirmed by Robin 2027-01-22 |
| No internal numbers | OK |
| No private names | OK |
<!-- ow:end-internal -->
