# Training: Larkspur Ceramics

## Welcome

What changed for each role, then each role's daily tasks, shown live in the test environment.

::: notes
Ask each person their role; record attendance by role and the client's id, never a name.
:::

## Order coordinator: what changed

You no longer type orders in: they arrive in the order sheet on their own. [map/roles.md order coordinator]

## Order coordinator: Check that new orders reached the order sheet

*Screenshot: The orders mailbox with new purchase orders*
::: notes
Demo on the test data: Open the orders mailbox and see which purchase orders arrived. [SC-01]
:::

## Order coordinator: Handle an email with no readable purchase order

*Screenshot: An order email with an image attached*
::: notes
Demo on the test data: Open the orders mailbox and find the email with an image attached. [SC-02]
:::

## Order coordinator: Settle a line whose code matches nothing

*Screenshot: A purchase order in the orders mailbox*
::: notes
Demo on the test data: Open the orders mailbox and find the purchase order with the unknown code. [SC-03]
:::

## Order coordinator: Check product codes stay in the LC-nnnn form

*Screenshot: The order sheet and the item list side by side*
::: notes
Demo on the test data: Open the order sheet and the item list in QuickBooks Online. [SC-05]
:::

## Order coordinator: Settle the morning's exceptions list

Came up in testing: UAT-01.

*Screenshot: The exceptions list with lines waiting*
::: notes
Demo on the test data: Open the exceptions list at the start of the day. [SC-10]
:::

## Operations manager: what changed

Orders are confirmed to the customer the day they arrive. [map/roles.md operations manager]

## Operations manager: Check today's orders were confirmed

*Screenshot: The confirmation view*
::: notes
Demo on the test data: Open the confirmation view. [SC-04]
:::

## Operations manager: Read stock on hand beside each line

*Screenshot: A confirmed order with stock on hand*
::: notes
Demo on the test data: Open a confirmed order in the confirmation view. [SC-08]
:::

## Operations manager: Read "stock not known"

*Screenshot: An order with a code missing from the stock sheet*
::: notes
Demo on the test data: Confirm the order whose code is missing from the stock sheet. [SC-09]
:::

## Operations manager: Read the confirmation view at the start of the day

*Screenshot: The confirmation view in the morning*
::: notes
Demo on the test data: Open the confirmation view. [SC-11]
:::

## Bookkeeper: what changed

The day's orders become invoices in QuickBooks Online at 18:00, with nothing retyped. [map/roles.md bookkeeper]

## Bookkeeper: Find the invoices for the day's confirmed orders

*Screenshot: The invoice push's last run*
::: notes
Demo on the test data: Let the day end: the invoice push runs at 18:00. [SC-06]
:::

## Bookkeeper: Recognise an order from an unknown customer

*Screenshot: An order from a new customer*
::: notes
Demo on the test data: Look for the order from the new customer. [SC-07]
:::

## Bookkeeper: Check the invoices the day's orders produced

*Screenshot: QuickBooks Online at the end of the day*
::: notes
Demo on the test data: Open QuickBooks Online at the end of the day. [SC-12]
:::

## Questions

Anything that came up goes to the facilitator, who notes it by role.
