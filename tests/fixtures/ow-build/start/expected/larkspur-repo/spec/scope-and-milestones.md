---
ow_artefact: ow-build/spec-scope-and-milestones
schema: 1
written_by: ow-build 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: plans/larkspur-ceramics/scope.md
created: 2026-11-10
clock: user-stated
origin: skill
---
# Scope and milestones: Larkspur Ceramics

The signed Build Plan is the source of truth: `plans/larkspur-ceramics/`. Change it there, not here.

## Work packages
- WP-1 Purchase orders from email into the order sheet: each purchase order PDF is read as it arrives and its lines are written to the order sheet with the product code settled.
- WP-2 An exceptions list for codes that match nothing: a line whose product code matches no item stops on a list for the order coordinator, with the reason.
- WP-3 An order confirmation view for the operations team: a simple screen shows each order, its lines and whether it was confirmed to the customer, the day it arrives.
- WP-4 A one-off clean-up of the existing product codes: every code in the order sheet and every item in QuickBooks Online is put into the LC-nnnn form once, before the new flow starts.
- WP-5 Orders from the sheet into QuickBooks Online: the day's confirmed orders become invoices without retyping.

## Out of scope
- Orders taken by phone: they stay with the order coordinator, who enters them as today.
- Any change to customers' own ordering systems.
- Warehouse software or picking screens.

## Risks
- R-1 A customer changes its purchase order layout (likelihood medium, impact high): lines that cannot be read go to the exceptions list instead of failing quietly; the operator notes say how to add a new layout. Owner: operations manager.
- R-2 The code clean-up is not signed off before the spring orders start (likelihood medium, impact high): run the clean-up first and agree the sign-off date now. Owner: order coordinator.
- R-3 The owner's sign-off on spending takes longer than the schedule allows (likelihood low, impact medium): send the owner the plan on delivery day with a one-page summary. Owner: operations manager.

## Milestones
1. M1: work packages 1, 2 and 4; ends in a working demo.
2. M2: work packages 3 and 5; ends in a working demo.

## Sources
- `plans/larkspur-ceramics/scope.md` (work packages, out of scope)
- `plans/larkspur-ceramics/risks.md`
- `plans/larkspur-ceramics/quote.md` (the Milestones list only)
