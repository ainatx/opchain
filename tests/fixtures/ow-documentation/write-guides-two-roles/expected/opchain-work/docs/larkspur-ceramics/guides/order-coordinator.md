---
ow_artefact: ow-documentation/guide
schema: 1
written_by: ow-documentation 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: docs/larkspur-ceramics/plan.md
created: 2027-02-02
clock: user-stated
origin: skill
role: order coordinator
tasks: [SC-01, SC-02, SC-03, SC-05, SC-10]
gaps: [UAT-01, UAT-13]
---
# Order coordinator guide: Larkspur Ceramics

## What changed for you

You no longer type orders in: they arrive in the order sheet on their own. [map/roles.md order coordinator]
Your day starts with the exceptions list: the lines whose codes matched nothing. [map/roles.md order coordinator]

## Check that new orders reached the order sheet

When you'd do it: a few times a day, after purchase orders arrive. [SC-01]

1. Open the orders mailbox and see which purchase orders arrived. [SC-01 step 1]
   [screenshot: SC-01 step 1]
2. Wait 15 minutes, then open the order sheet. [SC-01 step 2]
   [screenshot: SC-01 step 2]
3. Check each order's lines against its purchase order. [SC-01 step 3]
   [screenshot: SC-01 step 3]

What you should see: each order's lines are in the order sheet within 15 minutes, with the product codes in the LC-nnnn form. [SC-01]

If it goes wrong: an order still missing after 15 minutes is on the exceptions list; settle it there. [map/future.md item 2]

Came up in testing: UAT-13.

## Handle an email with no readable purchase order

When you'd do it: when an email's attachment is an image, not a PDF. [SC-02]

1. Open the orders mailbox and find the email with an image attached. [SC-02 step 1]
   [screenshot: SC-02 step 1]
2. Open the exceptions list and check the email's line is there, not in the order sheet. [SC-02 step 2]
   [screenshot: SC-02 step 2]

What you should see: the email is on the exceptions list with the reason, and nothing from it is in the order sheet. [SC-02]

If it goes wrong: ask the customer to send the purchase order again as a PDF. [map/future.md item 1]

## Settle a line whose code matches nothing

When you'd do it: when a line stops on the exceptions list with an unknown code. [SC-03]

1. Open the orders mailbox and find the purchase order with the unknown code. [SC-03 step 1]
   [screenshot: SC-03 step 1]
2. Open the exceptions list and find the line with the code and the customer. [SC-03 step 2]
   [screenshot: SC-03 step 2]

What you should see: the line is on the exceptions list with the code and the customer, and not in the order sheet. [SC-03]

If it goes wrong: never guess a code; correct it only when the item list has it. [map/future.md item 2]

## Check product codes stay in the LC-nnnn form

When you'd do it: once a week, now that the Monday clean-up has ended. [SC-05]

1. Open the order sheet and the item list in QuickBooks Online. [SC-05 step 1]
   [screenshot: SC-05 step 1]
2. Check each product code's form. [SC-05 step 2]
   [screenshot: SC-05 step 2]

What you should see: every code you check is in the LC-nnnn form. [SC-05]

If it goes wrong: a code in another form goes to the operations manager before anything is changed. [map/future.md item 5]

## Settle the morning's exceptions list

When you'd do it: at the start of each day, before new orders arrive. [SC-10]

1. Open the exceptions list at the start of the day. [SC-10 step 1]
   [screenshot: SC-10 step 1]
2. Settle each line: correct the code or note it for the customer. [SC-10 step 2]
   [screenshot: SC-10 step 2]

What you should see: every line on the list is settled and moves to the order sheet or is marked for the customer. [SC-10]

If it goes wrong: a line you cannot settle stays on the list; ask the operations manager. [map/future.md item 2]

Came up in testing: UAT-01.

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
