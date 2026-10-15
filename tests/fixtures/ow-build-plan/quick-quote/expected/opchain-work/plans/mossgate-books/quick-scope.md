---
ow_artefact: ow-build-plan/quick-scope
schema: 1
written_by: ow-build-plan 1.0.0 (protocol 1)
workstream: mossgate-books
subject: intake/mossgate-books/intake-record.md
created: 2026-10-20
clock: user-stated
origin: skill
handling: "no"
---
# Scope: Mossgate Books

## In scope
### WP-1 A weekly sales report from the till export
- what changes: the week's sales are summarised from the till export every Monday morning, with nothing copied by hand.

### WP-2 A reorder form
- what changes: reorders are entered on one form and sent to the distributor as a list, instead of on paper.

## Out of scope
- Changes to the till system itself.
- Stock counts and the stockroom.

## Acceptance checks
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

### AC-2.1
- when: the shop manager fills in the reorder form with 5 titles
- then: one list with the 5 titles and quantities is ready to send to the distributor
- how we check: fill the form with 5 titles from last month's paper reorders; the list matches
- test data: 5 titles from last month's paper reorders
- cases: 1
- kind: normal

## UAT approach
- tester roles: shop manager
- test mix: the shop manager checks WP-1 and WP-2

<!-- ow:internal -->
## Self-checks (same-session self-check)
Same-session self-check: the same assistant that wrote the scope, applying a checklist; a discipline, not an independent review. Agent-checked.
| check | result |
| --- | --- |
| Acceptance coverage | OK |
| Out of scope present | OK |
<!-- ow:end-internal -->
