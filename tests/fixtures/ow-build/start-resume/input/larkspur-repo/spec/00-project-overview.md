---
ow_artefact: ow-build/spec-00-project-overview
schema: 1
written_by: ow-build 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: plans/larkspur-ceramics/build-plan.md
created: 2026-11-10
clock: user-stated
origin: skill
---
# Project overview: Larkspur Ceramics

The signed Build Plan is the source of truth: `plans/larkspur-ceramics/`. Change it there, not here.

## Summary
Purchase orders arrive as PDF attachments and are typed twice: into the shared order sheet, then into QuickBooks Online. Customers write the same product code several ways, so the codes are corrected by hand every Monday, and a wrong code ships the wrong tile. Nobody confirms an order until it is in QuickBooks Online, which can be the next day. The change: read each order as it arrives, settle its codes, confirm it the same day and turn it into an invoice without retyping. Codes that match nothing stop for a person instead of being guessed.

## What should change
1. Each purchase order is read as it arrives and its lines land in the order sheet with the product code settled.
2. A line whose code matches nothing stops on an exceptions list for a person to settle.
3. The order is confirmed to the customer the day it arrives.
4. The day's orders become invoices in QuickBooks Online without retyping.
5. The Monday clean-up is no longer needed.

## Client dependencies
| what | from (role) | by |
|---|---|---|
| a list of every customer that orders by email | operations manager | 2026-11-06 |
| sign-off on the corrected product codes | order coordinator | 2026-11-13 |

## Sources
- `plans/larkspur-ceramics/build-plan.md` (Summary, What should change)
- `plans/larkspur-ceramics/scope.md` (Client dependencies)
