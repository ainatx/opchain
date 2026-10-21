# Bookkeeper guide: Larkspur Ceramics

## What changed for you

The day's orders become invoices in QuickBooks Online at 18:00, with nothing retyped. [map/roles.md bookkeeper]
Your job is checking the invoices, not entering them. [map/roles.md bookkeeper]

## Find the invoices for the day's confirmed orders

When you'd do it: at the end of each day. [SC-06]

1. Let the day end: the invoice push runs at 18:00. [SC-06 step 1]
   *Screenshot: The invoice push's last run*
2. Open QuickBooks Online and find an invoice for each confirmed order. [SC-06 step 2]
   *Screenshot: Invoices for the day's confirmed orders*
What you should see: each confirmed order is an invoice with the same lines and quantities. [SC-06]

If it goes wrong: an order with no invoice: check the invoice push in the runbook. [docs/run-log.md]

## Recognise an order from an unknown customer

When you'd do it: when a new customer orders for the first time. [SC-07]

1. Look for the order from the new customer. [SC-07 step 1]
   *Screenshot: An order from a new customer*
2. Check the exceptions list and the invoices: there is no invoice for it. [SC-07 step 2]
   *Screenshot: The exceptions list holding the order*
What you should see: no invoice is made and the order is on the exceptions list. [SC-07]

If it goes wrong: add the customer in QuickBooks Online first, then settle the line. [map/future.md item 4]

## Check the invoices the day's orders produced

When you'd do it: at the end of each day. [SC-12]

1. Open QuickBooks Online at the end of the day. [SC-12 step 1]
   *Screenshot: QuickBooks Online at the end of the day*
2. Check the day's invoices against the confirmed orders. [SC-12 step 2]
   *Screenshot: The day's invoices beside the confirmed orders*
What you should see: every confirmed order has its invoice, and none was retyped. [SC-12]

If it goes wrong: an invoice that does not match goes to the operations manager. [map/roles.md bookkeeper]

## Open items

None.
