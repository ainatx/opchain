---
ow_artefact: ow-documentation/handover
schema: 1
written_by: ow-documentation 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: docs/larkspur-ceramics/docs.yaml
created: 2027-02-05
clock: user-stated
origin: skill
---
# Decisions and limits: Larkspur Ceramics

## Decisions and why

- Lines whose code matches nothing stop on an exceptions list rather than being guessed. [sprints/sprint-2/contract.md]
- Stock on hand shows beside each line, from the stock sheet's evening update. [CO-01]
- Phone orders stay with the order coordinator. [scope.md]

## Known limits

- A customer who changes their purchase order layout sends lines to the exceptions list until the layout is added. [spec/scope-and-milestones.md]

## Out of scope

- Orders taken by phone, customers' own ordering systems, and warehouse software. [spec/scope-and-milestones.md]

## Open items

None.

<!-- ow:internal -->
## Self-checks (not for the client)

Same-session self-check: the same assistant that wrote it, applying a checklist; a discipline, not an independent review. Agent-checked.

| check | result |
| --- | --- |
| Trace | OK |
| Coverage | OK |
| People by role or id | OK |
| No credentials | OK |
| No internal numbers | OK |
| No private names | OK |
<!-- ow:end-internal -->
