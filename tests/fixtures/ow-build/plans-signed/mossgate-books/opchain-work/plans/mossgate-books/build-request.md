---
ow_artefact: ow-build-plan/build-request
schema: 1
written_by: ow-build-plan 1.0.0 (protocol 1)
workstream: mossgate-books
subject: plans/mossgate-books/quick-scope.md
created: 2026-10-29
clock: user-stated
origin: skill
client: Mossgate Books
signed: 2026-10-29
signing_note: client signed 2026-10-29, recorded by Robin; not verified by this skill
---
# Build request: Mossgate Books

INVENTED TEST FIXTURE: the signed quick quote's build request, in the shape ow-build-plan writes it, as the starting state for ow-build's quick-quote cases.

Signed 29 October 2026 (client signed 2026-10-29, recorded by Robin; not verified by this skill). This is a working note made by an AI assistant at your instruction. It is not a signature or an official record. This comes from the scope (the Build Plan, or the quick scope), not the quote.

## What to build
1. A weekly sales report from the till export, ready every Monday morning with nothing copied by hand.
2. A reorder form whose list goes to the distributor, instead of paper.

## How the client will check it
The acceptance checks in `plans/mossgate-books/quick-scope.md`, by reference: AC-1.1, AC-1.2, AC-2.1.

## Systems and data
The till system, which exports a CSV of each week's sales (one row per sale: title, ISBN, quantity and price), into a shared folder; a shared spreadsheet. The distributor takes reorders as a list.

## Out of scope
- Changes to the till system itself.
- Stock counts and the stockroom.

## Client dependencies
- The weekly till export in the shared folder by 7:00 each Monday, from the shop manager.

## Milestones
1. Work packages 1 and 2: ends in a working demo.

A written update goes to the client each week.

## User acceptance testing
Size S: 1 tester role (shop manager), 2 sessions including the final confirmation run, up to 1 fix round within 3 business days.

## Next
    DONE: client signed 2026-10-29 (recorded by Robin; not verified by this skill) -> plans/mossgate-books/build-request.md
    NEXT: say "use ow-build to start plans/mossgate-books/"   (where slash commands exist: /ow-build-start)
          It will read: build-request.md, quote.md, quick-scope.md
          [no folder attached: attach them when you say it]
    IF IT IS NOT AVAILABLE: give build-request.md to whoever builds it.

Give this file to whoever builds it.
