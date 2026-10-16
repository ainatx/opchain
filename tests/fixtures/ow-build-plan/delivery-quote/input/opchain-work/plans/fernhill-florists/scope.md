---
ow_artefact: ow-build-plan/scope
schema: 1
written_by: ow-build-plan 1.0.0 (protocol 1)
workstream: fernhill-florists
subject: plans/fernhill-florists/map/current.md
created: 2026-11-06
clock: user-stated
origin: skill
---
# Scope: Fernhill Florists

INVENTED TEST FIXTURE: abridged to what the quote reads.

## Work packages
### WP-1 Wedding orders in one shared list instead of the paper diary
- what changes: each wedding order taken by phone is typed once into a shared list the shop and the van can both see.
- from the map: map/current.md steps 1–2 (E-01)
- systems: a shared order list

### WP-2 The van driver's list for the day, from the orders
- what changes: the driver opens the day's deliveries on a phone, kept up to date, instead of a morning printout.
- from the map: map/future.md step 3 (E-02)
- systems: a shared order list

## Out of scope
- Bouquet orders from the online shop: they stay as they are.
- Payments and invoices.

## Assumptions
- [HIGH E-01] Wedding orders keep arriving by phone.

## Client dependencies
| what | from (role) | by |
|---|---|---|
| one week of the diary, typed or photographed | shop owner | 2026-11-16 |

## Open questions
- Does the driver have a phone the shop pays for? Who can answer: shop owner.

## UAT approach
- tester roles: shop owner, van driver
- test mix: the shop owner checks WP-1; the van driver checks WP-2

## Self-checks (same-session self-check)
Same-session self-check: the same assistant that wrote the scope, applying a checklist; a discipline, not an independent review. Agent-checked.
| check | result |
|---|---|
| Acceptance coverage | OK |
| Out of scope present | OK |
| Risk owners | OK |
| Evidence trace | OK |
