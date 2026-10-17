---
ow_artefact: ow-build/ready-for-uat
schema: 1
written_by: ow-build 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: builds/larkspur-ceramics/build.yaml
created: 2026-12-21
clock: user-stated
origin: skill
client: Larkspur Ceramics
ready: yes
checks_total: 9
checks_passing: 9
build_label: larkspur-uat-2 (user-stated)
environment: the Larkspur staging mailbox, a copy of the order sheet and the QuickBooks Online sandbox (user-stated)
---
# Ready for user acceptance testing: Larkspur Ceramics

Ready: 9 of 9 checks pass, in the builder's reports and in the confirmation pass on 21 December 2026. This marks no payment and is not an acceptance record: acceptance is the client's sign-off in user acceptance testing.

## Milestones demoed
| milestone | demo record |
|---|---|
| M1 | 25 November 2026 (demos/M1-record.md) |
| M2 | 16 December 2026 (demos/M2-record.md) |

## Builder's run
| check | result | test data | cases passed | from |
|---|---|---|---|---|
| AC-1.1 | pass | September purchase orders (source: the client's September set; 10 orders; fields: order number, customer, product code, quantity) | 10 of 10 | sprint 1 report; confirmation pass 2026-12-21 |
| AC-1.2 | pass | emails made for the test (2; an image instead of a PDF) | 2 of 2 | sprint 1 report; confirmation pass 2026-12-21 |
| AC-2.1 | pass | September purchase orders with one code altered (3; field: product code) | 3 of 3 | sprint 2 report; confirmation pass 2026-12-21 |
| AC-3.1 | pass | the orders from AC-1.1 (10) | 10 of 10 | sprint 3 report; confirmation pass 2026-12-21 |
| AC-4.1 | pass | the order sheet and the item list (40 rows and 20 items sampled; field: product code) | 60 of 60 | sprint 2 report; confirmation pass 2026-12-21 |
| AC-5.1 | pass | the orders from AC-1.1 (10) | 10 of 10 | sprint 4 report; confirmation pass 2026-12-21 |
| AC-5.2 | pass | a purchase order made for the test (1; a customer not in QuickBooks Online) | 1 of 1 | the builder's fix report; confirmation pass 2026-12-21 |
| AC-CO-01.1 | pass | orders from the AC-1.1 set and the same day's stock sheet (5) | 5 of 5 | the builder's CO-01 report; confirmation pass 2026-12-21 |
| AC-CO-01.2 | pass | an order made for the test (1; a code missing from the stock sheet) | 1 of 1 | the builder's CO-01 report; confirmation pass 2026-12-21 |

## Test environment
The Larkspur staging mailbox, a copy of the order sheet and the QuickBooks Online sandbox.

## Known issues
- The confirmation view is slow to load before 8:00 while the stock sheet updates.

## Test data
The September purchase orders and the item list, by pointer as in the builder's run; no customer records are copied here.

## Build label
larkspur-uat-2

## Next
    NEXT: say "use ow-uat-plan on builds/larkspur-ceramics/ready-for-uat.md"   (where slash commands exist: /ow-uat-plan)

<!-- ow:internal -->
## Self-checks (same-session self-check)
Same-session self-check: the same assistant that wrote this file, applying a checklist; a discipline, not an independent review. Agent-checked.
| check | result |
| --- | --- |
| No false done | OK |
| No internal numbers | OK |
| No private names | OK |
<!-- ow:end-internal -->
