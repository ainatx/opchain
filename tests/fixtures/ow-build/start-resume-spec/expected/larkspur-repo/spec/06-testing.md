---
ow_artefact: ow-build/spec-06-testing
schema: 1
written_by: ow-build 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: plans/larkspur-ceramics/acceptance.md
created: 2026-11-11
clock: user-stated
origin: skill
---
# Testing: Larkspur Ceramics

The signed Build Plan is the source of truth: `plans/larkspur-ceramics/`. Change it there, not here.

Every acceptance check of the signed plan, verbatim, with its test data and case count. These are the done-criteria for every sprint.

## WP-1 Purchase orders from email into the order sheet

### AC-1.1
- when: a purchase order PDF arrives by email from a known customer
- then: its lines appear in the order sheet within 15 minutes, with the product codes in the LC-nnnn form, and nobody retypes them
- how we check: send 10 purchase orders from September's real set; all 10 arrive with every line correct
- test data: 10 September purchase orders (E-02)
- cases: 10
- kind: normal

### AC-1.2
- when: an email arrives with no readable purchase order attached
- then: it goes to the exceptions list with the reason, and nothing is written to the order sheet
- how we check: send 2 emails with an image instead of a PDF; both are on the exceptions list
- test data: 2 emails made for the test
- cases: 2
- kind: error

## WP-2 An exceptions list for codes that match nothing

### AC-2.1
- when: a purchase order line carries a code that matches no item
- then: the line is on the exceptions list with the code and the customer, and not in the order sheet
- how we check: send 3 purchase orders with one unknown code each; all 3 lines are on the list
- test data: 3 September purchase orders with one code altered
- cases: 3
- kind: error

## WP-3 An order confirmation view for the operations team

### AC-3.1
- when: an order's lines are in the order sheet
- then: the confirmation view shows it as confirmed the same day, with its lines
- how we check: after AC-1.1, all 10 orders show as confirmed on the day they were sent
- test data: the 10 orders from AC-1.1
- cases: 10
- kind: normal

## WP-4 A one-off clean-up of the existing product codes

### AC-4.1
- when: the clean-up has run
- then: every product code in the order sheet and in QuickBooks Online is in the LC-nnnn form
- how we check: the order coordinator samples 40 rows of the sheet and 20 items; all are in the LC-nnnn form
- test data: September's order sheet and the item list (E-01, E-04)
- cases: 60
- kind: normal

## WP-5 Orders from the sheet into QuickBooks Online

### AC-5.1
- when: the day ends with confirmed orders in the sheet
- then: each one is an invoice in QuickBooks Online with the same lines and quantities
- how we check: after AC-1.1, the bookkeeper finds 10 matching invoices and retypes nothing
- test data: the 10 orders from AC-1.1
- cases: 10
- kind: normal

### AC-5.2
- when: an order names a customer that is not in QuickBooks Online
- then: no invoice is made and the order is on the exceptions list
- how we check: send 1 order from a new customer; it is on the list and no invoice exists
- test data: 1 purchase order made for the test
- cases: 1
- kind: error

Checks added later by signed change orders are in `spec/06-testing-change-orders.md`.

## Sources
- `plans/larkspur-ceramics/acceptance.md`
