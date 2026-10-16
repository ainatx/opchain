---
ow_artefact: ow-build-plan/quick-scope
schema: 1
written_by: ow-build-plan 1.0.0 (protocol 1)
workstream: kestrel-bindery
subject: intake/kestrel-bindery/intake-record.md
created: 2026-11-10
clock: user-stated
origin: skill
handling: "no"
---
# Scope: Kestrel Bindery

## In scope
### WP-1 A feasibility test: reading supplier invoices
- what changes: a time-boxed test on twenty of your own invoices shows how many a tool reads correctly, and which layouts it cannot read.

## Out of scope
- Building anything into the accounts system.
- Invoices from customers.

## Acceptance checks
### AC-1.1
- when: the test has run on the twenty invoices you sent
- then: you receive a one-page result: how many were read correctly, field by field, and the layouts that failed
- how we check: the office manager checks the result against the twenty invoices; every count matches
- test data: twenty recent supplier invoices you send
- cases: 20
- kind: normal

### AC-1.2
- when: an invoice is unreadable (a blurred or handwritten scan)
- then: the result lists it as unread with the reason, and it is not counted as read
- how we check: include two blurred scans; both are listed as unread
- test data: two scans made blurry for the test
- cases: 2
- kind: error

<!-- ow:internal -->
## Self-checks (same-session self-check)
Same-session self-check: the same assistant that wrote the scope, applying a checklist; a discipline, not an independent review. Agent-checked.
| check | result |
| --- | --- |
| Acceptance coverage | OK |
| Out of scope present | OK |
<!-- ow:end-internal -->
