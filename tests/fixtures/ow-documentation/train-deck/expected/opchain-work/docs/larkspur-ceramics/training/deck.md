---
ow_artefact: ow-documentation/deck
schema: 1
written_by: ow-documentation 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: docs/larkspur-ceramics/plan.md
created: 2027-02-08
clock: user-stated
origin: skill
---
# Training: Larkspur Ceramics

## Welcome

What changed for each role, then each role's daily tasks, shown live in the test environment.

::: notes
Ask each person their role; record attendance by role and the client's id, never a name.
:::

## Order coordinator: what changed

You no longer type orders in: they arrive in the order sheet on their own. [map/roles.md order coordinator]

## Order coordinator: Check that new orders reached the order sheet

![The orders mailbox with new purchase orders](../shots/SC-01-1.png)

::: notes
Demo on the test data: Open the orders mailbox and see which purchase orders arrived. [SC-01]
:::

## Order coordinator: Handle an email with no readable purchase order

![An order email with an image attached](../shots/SC-02-1.png)

::: notes
Demo on the test data: Open the orders mailbox and find the email with an image attached. [SC-02]
:::

## Order coordinator: Settle a line whose code matches nothing

![A purchase order in the orders mailbox](../shots/SC-03-1.png)

::: notes
Demo on the test data: Open the orders mailbox and find the purchase order with the unknown code. [SC-03]
:::

## Order coordinator: Check product codes stay in the LC-nnnn form

![The order sheet and the item list side by side](../shots/SC-05-1.png)

::: notes
Demo on the test data: Open the order sheet and the item list in QuickBooks Online. [SC-05]
:::

## Order coordinator: Settle the morning's exceptions list

Came up in testing: UAT-01.

![The exceptions list with lines waiting](../shots/SC-10-1.png)

::: notes
Demo on the test data: Open the exceptions list at the start of the day. [SC-10]
:::

## Operations manager: what changed

Orders are confirmed to the customer the day they arrive. [map/roles.md operations manager]

## Operations manager: Check today's orders were confirmed

![The confirmation view](../../../uat/larkspur-ceramics/evidence/ops-T1-sc04-confirmation-view.png)

::: notes
Demo on the test data: Open the confirmation view. [SC-04]
:::

## Operations manager: Read stock on hand beside each line

![A confirmed order with stock on hand](../shots/SC-08-1.png)

::: notes
Demo on the test data: Open a confirmed order in the confirmation view. [SC-08]
:::

## Operations manager: Read "stock not known"

![An order with a code missing from the stock sheet](../shots/SC-09-1.png)

::: notes
Demo on the test data: Confirm the order whose code is missing from the stock sheet. [SC-09]
:::

## Operations manager: Read the confirmation view at the start of the day

![The confirmation view in the morning](../shots/SC-11-1.png)

::: notes
Demo on the test data: Open the confirmation view. [SC-11]
:::

## Bookkeeper: what changed

The day's orders become invoices in QuickBooks Online at 18:00, with nothing retyped. [map/roles.md bookkeeper]

## Bookkeeper: Find the invoices for the day's confirmed orders

![The invoice push's last run](../shots/SC-06-1.png)

::: notes
Demo on the test data: Let the day end: the invoice push runs at 18:00. [SC-06]
:::

## Bookkeeper: Recognise an order from an unknown customer

![An order from a new customer](../shots/SC-07-1.png)

::: notes
Demo on the test data: Look for the order from the new customer. [SC-07]
:::

## Bookkeeper: Check the invoices the day's orders produced

![QuickBooks Online at the end of the day](../shots/SC-12-1.png)

::: notes
Demo on the test data: Open QuickBooks Online at the end of the day. [SC-12]
:::

## Questions

Anything that came up goes to the facilitator, who notes it by role.

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
