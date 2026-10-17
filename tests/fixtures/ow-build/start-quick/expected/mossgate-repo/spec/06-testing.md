---
ow_artefact: ow-build/spec-06-testing
schema: 1
written_by: ow-build 1.0.0 (protocol 1)
workstream: mossgate-books
subject: plans/mossgate-books/quick-scope.md
created: 2026-11-02
clock: user-stated
origin: skill
---
# Testing: Mossgate Books

The signed Build Plan is the source of truth: `plans/mossgate-books/`. Change it there, not here.

Every acceptance check of the signed quick scope, verbatim, with its test data and case count. These are the done-criteria for every sprint.

## WP-1 A weekly sales report from the till export

### AC-1.1
- when: the week's till export is in the shared folder on Monday at 7:00
- then: the sales report is ready by 8:00 with every sale counted once
- how we check: run it on 2 past weeks' exports; both reports match a hand count
- test data: 2 weekly till exports the shop sends
- cases: 2
- kind: normal

### AC-1.2
- when: the export for the week is missing
- then: the report says the export is missing instead of showing an empty week
- how we check: run it with no export in the folder once
- test data: an empty folder
- cases: 1
- kind: error

## WP-2 A reorder form

### AC-2.1
- when: the shop manager fills in the reorder form with 5 titles
- then: one list with the 5 titles and quantities is ready to send to the distributor
- how we check: fill the form with 5 titles from last month's paper reorders; the list matches
- test data: 5 titles from last month's paper reorders
- cases: 1
- kind: normal

Checks added later by signed change orders are in `spec/06-testing-change-orders.md`.

## Sources
- `plans/mossgate-books/quick-scope.md`
