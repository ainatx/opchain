---
ow_artefact: ow-documentation/guide
schema: 1
written_by: ow-documentation 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: docs/larkspur-ceramics/plan.md
created: 2027-02-02
clock: user-stated
origin: skill
role: bookkeeper
tasks: [SC-06, SC-07, SC-12]
gaps: []
---
# Bookkeeper guide: Larkspur Ceramics

## What changed for you

The day's orders become invoices in QuickBooks Online at 18:00, with nothing retyped. [map/roles.md bookkeeper]
Your job is checking the invoices, not entering them. [map/roles.md bookkeeper]

## Find the invoices for the day's confirmed orders

When you'd do it: at the end of each day. [SC-06]

1. Let the day end: the invoice push runs at 18:00. [SC-06 step 1]
   ![The invoice push's last run](../shots/SC-06-1.png)
2. Open QuickBooks Online and find an invoice for each confirmed order. [SC-06 step 2]
   ![Invoices for the day's confirmed orders](../shots/SC-06-2.png)

What you should see: each confirmed order is an invoice with the same lines and quantities. [SC-06]

If it goes wrong: an order with no invoice: check the invoice push in the runbook. [docs/run-log.md]

## Recognise an order from an unknown customer

When you'd do it: when a new customer orders for the first time. [SC-07]

1. Look for the order from the new customer. [SC-07 step 1]
   ![An order from a new customer](../shots/SC-07-1.png)
2. Check the exceptions list and the invoices: there is no invoice for it. [SC-07 step 2]
   ![The exceptions list holding the order](../shots/SC-07-2.png)

What you should see: no invoice is made and the order is on the exceptions list. [SC-07]

If it goes wrong: add the customer in QuickBooks Online first, then settle the line. [map/future.md item 4]

## Check the invoices the day's orders produced

When you'd do it: at the end of each day. [SC-12]

1. Open QuickBooks Online at the end of the day. [SC-12 step 1]
   ![QuickBooks Online at the end of the day](../shots/SC-12-1.png)
2. Check the day's invoices against the confirmed orders. [SC-12 step 2]
   [screenshot: SC-12 step 2]

What you should see: every confirmed order has its invoice, and none was retyped. [SC-12]

If it goes wrong: an invoice that does not match goes to the operations manager. [map/roles.md bookkeeper]

## Open items

None.

<!-- ow:internal -->
## Self-checks (not for the client)

Same-session self-check: the same assistant that wrote it, applying a checklist; a discipline, not an independent review. Agent-checked.

| check | result |
| --- | --- |
| Trace | OK |
| Coverage | OK |
| People by role or id | OK |
| No credentials | OK |
| No internal numbers | OK |
| No private names | OK |
<!-- ow:end-internal -->
