---
ow_artefact: ow-build-plan/build-request
schema: 1
written_by: ow-build-plan 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: plans/larkspur-ceramics/scope.md
created: 2026-11-09
clock: user-stated
origin: skill
client: Larkspur Ceramics
signed: 2026-11-09
signing_note: client signed 2026-11-09, recorded by Robin; not verified by this skill
---
# Build request: Larkspur Ceramics

Signed 9 November 2026 (client signed 2026-11-09, recorded by Robin; not verified by this skill). This is a working note made by an AI assistant at your instruction. It is not a signature or an official record. This comes from the scope (the Build Plan, or the quick scope), not the quote.

## What to build
1. Purchase orders from email into the order sheet, with the product code settled.
2. An exceptions list for codes that match nothing, settled by a person.
3. An order confirmation view for the operations team.
4. A one-off clean-up of the existing product codes, in the sheet and in QuickBooks Online.
5. Orders from the sheet into QuickBooks Online as invoices.

## How the client will check it
The acceptance checks in `plans/larkspur-ceramics/acceptance.md`, by reference: AC-1.1, AC-1.2, AC-2.1, AC-3.1, AC-4.1, AC-5.1, AC-5.2.

## Systems and data
Email (purchase orders as PDF attachments), the shared order sheet, QuickBooks Online. Product codes are messy until the clean-up; customer records hold names, emails and billing addresses only. See `plans/larkspur-ceramics/map/` for detail.

## Out of scope
- Orders taken by phone.
- Any change to customers' own ordering systems.
- Warehouse software or picking screens.

## Client dependencies
- A list of every customer that orders by email, from the operations manager.
- Sign-off on the corrected product codes, from the order coordinator.

## Milestones
1. Work packages 1, 2 and 4: ends in a working demo.
2. Work packages 3 and 5: ends in a working demo.

A written update goes to the client each week.

## User acceptance testing
Size M: 3 tester roles (order coordinator, operations manager, bookkeeper), 3 sessions including the final confirmation run, up to 2 fix rounds within 5 business days each.

## Next
    DONE: client signed 2026-11-09 (recorded by Robin; not verified by this skill) -> plans/larkspur-ceramics/build-request.md
    NEXT: say "use ow-build to start plans/larkspur-ceramics/"   (where slash commands exist: /ow-build-start)
          It will read: build-request.md, quote.md, contract-inputs.md, plan.yaml, build-plan.md, scope.md, acceptance.md, risks.md, map/
          [no folder attached: attach them when you say it]
    IF IT IS NOT AVAILABLE: give build-request.md to whoever builds it.

Give this file to whoever builds it.
