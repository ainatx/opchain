---
ow_artefact: ow-build-plan/build-plan
schema: 1
written_by: ow-build-plan 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: plans/larkspur-ceramics/scope.md
created: 2026-10-26
clock: user-stated
origin: skill
---
# Build Plan: Larkspur Ceramics

## Summary
Purchase orders arrive as PDF attachments and are typed twice: into the shared order sheet, then into QuickBooks Online. Customers write the same product code several ways, so the codes are corrected by hand every Monday, and a wrong code ships the wrong tile. Nobody confirms an order until it is in QuickBooks Online, which can be the next day. The change: read each order as it arrives, settle its codes, confirm it the same day and turn it into an invoice without retyping. Codes that match nothing stop for a person instead of being guessed.

## How it works today
1. A purchase order arrives as a PDF attachment, never in the email body.
2. The order coordinator types each line into the shared order sheet; customers write one product code as LC-1204, lc1204, 1204-LC or 1204LC.
3. At the end of the day the bookkeeper types the day's orders into QuickBooks Online. Nobody confirms an order until then, sometimes the next day.
4. Every Monday the order coordinator corrects the product codes by hand.

Where it breaks: one product code appears in four forms in a single month, and last month three pallets were reshipped because of wrong codes, costing about $1,800.

## What should change
1. Each purchase order is read as it arrives and its lines land in the order sheet with the product code settled.
2. A line whose code matches nothing stops on an exceptions list for a person to settle.
3. The order is confirmed to the customer the day it arrives.
4. The day's orders become invoices in QuickBooks Online without retyping.
5. The Monday clean-up is no longer needed.

## Who does what
| Role | Today | After |
|---|---|---|
| Order coordinator | types every order; fixes codes on Mondays | settles the exceptions list |
| Bookkeeper | retypes the day's orders into QuickBooks Online | checks the invoices the orders produce |
| Operations manager | takes calls about wrong pallets | reads the confirmation view |
| Owner | signs off spending over a limit | the same |

## Systems and data
| System | What it holds | Condition |
|---|---|---|
| Email | every purchase order, as a PDF attachment | readable; the customer's own item codes sit beside ours |
| The shared order sheet | order number, customer, product code, quantity, ship date | product codes written several ways, fixed by hand |
| QuickBooks Online | 212 items, 86 customers, 1,140 invoices a year | the product code is missing on 9% of items |

## Scope
1. Purchase orders from email into the order sheet.
2. An exceptions list for codes that match nothing.
3. An order confirmation view for the operations team.
4. A one-off clean-up of the existing product codes.
5. Orders from the sheet into QuickBooks Online.

## Out of scope
- Orders taken by phone: they stay with the order coordinator, who enters them as today.
- Any change to customers' own ordering systems.
- Warehouse software or picking screens.

## Acceptance checks
| Check | When | Then | How we check |
|---|---|---|---|
| 1.1 | a purchase order arrives from a known customer | its lines are in the order sheet within 15 minutes, codes settled, nothing retyped | 10 orders from September's real set; all 10 correct |
| 1.2 | an email arrives with no readable purchase order | it is on the exceptions list and nothing is written | 2 emails with an image instead of a PDF |
| 2.1 | a line carries a code that matches no item | the line is on the exceptions list, not in the sheet | 3 orders with one unknown code each |
| 3.1 | an order's lines are in the sheet | the view shows it confirmed the same day | the 10 orders from check 1.1 |
| 4.1 | the clean-up has run | every code in the sheet and in QuickBooks Online is in the LC-nnnn form | 40 sheet rows and 20 items sampled |
| 5.1 | the day ends with confirmed orders | each is an invoice with the same lines and quantities | the 10 orders from check 1.1; nothing retyped |
| 5.2 | an order names a customer not in QuickBooks Online | no invoice is made and the order is on the exceptions list | 1 order from a new customer |

## Risks
| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| A customer changes its purchase order layout | medium | high | unreadable lines go to the exceptions list; the operator notes say how to add a layout | operations manager |
| The code clean-up is not signed off before the spring orders start | medium | high | run the clean-up first and agree the sign-off date now | order coordinator |
| The owner's spending sign-off takes longer than the schedule allows | low | medium | send the owner the plan on delivery day with a one-page summary | operations manager |

## Assumptions and client dependencies
- Every purchase order keeps arriving as a PDF attachment.
- QuickBooks Online stays the place invoices are made.
- The operations manager sends a list of every customer that orders by email by 6 November 2026.
- The order coordinator signs off the corrected product codes by 13 November 2026.

## Ownership
The work is yours: it lives in your own repository and accounts, under your name, with your data. You receive the documentation and the tests with it.

## Open questions
- How many orders does a normal week hold, 60 or 90? Who can answer: the operations manager.
- Would the warehouse use a screen instead of the printed picks? Who can answer: the operations manager.
