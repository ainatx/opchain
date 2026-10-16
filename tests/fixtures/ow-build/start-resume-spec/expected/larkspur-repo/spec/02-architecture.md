---
ow_artefact: ow-build/spec-02-architecture
schema: 1
written_by: ow-build 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: plans/larkspur-ceramics/map/systems.md
created: 2026-11-11
clock: user-stated
origin: skill
---
# Architecture: Larkspur Ceramics

The signed Build Plan is the source of truth: `plans/larkspur-ceramics/`. Change it there, not here.

## Systems
- Email: carries every purchase order as a PDF attachment.
- The shared order sheet: purchase order number, customer, product code, quantity, ship date.
- QuickBooks Online: 212 items and 1,140 invoices in a year; no connection to the sheet or to email.
- Not known yet: whether the warehouse would use a screen instead of the printed picks (the operations manager can answer).

## Data
| data | where it lives | condition |
|---|---|---|
| purchase order lines | PDF attachments | readable text, the customer's own item codes beside ours |
| product codes | the order sheet | messy: one product in four forms, fixed by hand every Monday |
| items | QuickBooks Online | the product code is missing on 9% of items |
| customers | QuickBooks Online | names, emails, billing addresses; nothing more sensitive |

## The future process
1. Each purchase order PDF is read as it arrives and its lines land in the order sheet without retyping.
2. A line whose product code matches nothing stops on an exceptions list for a person to settle; nothing is guessed.
3. The order is confirmed to the customer the day it arrives, once its lines are in the sheet.
4. The day's orders reach QuickBooks Online as invoices without the bookkeeper retyping them.
5. With codes settled on arrival, the Monday clean-up is no longer needed.

## Sources
- `plans/larkspur-ceramics/map/systems.md`
- `plans/larkspur-ceramics/map/data.md`
- `plans/larkspur-ceramics/map/future.md`
