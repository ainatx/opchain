---
ow_artefact: ow-build-plan/scope
schema: 1
written_by: ow-build-plan 1.3.0 (protocol 1)
workstream: larkspur-ceramics
subject: plans/larkspur-ceramics/map/current.md
created: 2026-10-17
clock: user-stated
origin: skill
---
# Scope: Larkspur Ceramics

## Work packages
### WP-1 Purchase orders from email into the order sheet
- what changes: each purchase order PDF is read as it arrives and its lines are written to the order sheet with the product code settled.
- from the map: map/current.md steps 1–2 (E-06, E-01, E-02)
- systems: email, the order sheet

### WP-2 An exceptions list for codes that match nothing
- what changes: a line whose product code matches no item stops on a list for the order coordinator, with the reason.
- from the map: map/future.md step 2 (E-11)
- systems: the order sheet

### WP-3 An order confirmation view for the operations team
- what changes: a simple screen shows each order, its lines and whether it was confirmed to the customer, the day it arrives.
- from the map: map/future.md step 3 (E-08)
- systems: the order sheet

### WP-4 A one-off clean-up of the existing product codes
- what changes: every code in the order sheet and every item in QuickBooks Online is put into the LC-nnnn form once, before the new flow starts.
- from the map: map/data.md (E-01, E-03, E-04)
- systems: the order sheet, QuickBooks Online

### WP-5 Orders from the sheet into QuickBooks Online
- what changes: the day's confirmed orders become invoices without retyping.
- from the map: map/future.md step 4 (E-05, E-08)
- systems: the order sheet, QuickBooks Online

### WP-6 Vendor selection: an inventory tool for finished stock counts
- kind: selection
- what changes: the client chooses the tool, on criteria agreed first (ow-vendor-eval)
- from the map: map/systems.md, the [UNKNOWN] line for it
- systems: to be chosen

## Out of scope
- Orders taken by phone: they stay with the order coordinator, who enters them as today.
- Any change to customers' own ordering systems.
- Warehouse software or picking screens.

## Assumptions
- [MEDIUM E-06] Every purchase order keeps arriving as a PDF attachment.
- [HIGH E-04] QuickBooks Online stays the place invoices are made.

## Client dependencies
| what | from (role) | by |
|---|---|---|
| a list of every customer that orders by email | operations manager | 2026-11-06 |
| sign-off on the corrected product codes | order coordinator | 2026-11-13 |

## Open questions
- How many orders does a normal week hold, 60 or 90? Who can answer: operations manager.
- Would the warehouse use a screen instead of the printed picks? Who can answer: operations manager.

## UAT approach
- tester roles: order coordinator, operations manager, bookkeeper
- test mix: the order coordinator checks WP-1, WP-2 and WP-4; the operations manager checks WP-3; the bookkeeper checks WP-5

## Self-checks (same-session self-check)
Same-session self-check: the same assistant that wrote the scope, applying a checklist; a discipline, not an independent review. Agent-checked.
| check | result |
|---|---|
| Acceptance coverage | OK |
| Out of scope present | OK |
| Risk owners | OK |
| Evidence trace | OK |
