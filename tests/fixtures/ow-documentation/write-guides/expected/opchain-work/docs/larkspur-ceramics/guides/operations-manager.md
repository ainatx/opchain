---
ow_artefact: ow-documentation/guide
schema: 1
written_by: ow-documentation 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: docs/larkspur-ceramics/plan.md
created: 2027-02-02
clock: user-stated
origin: skill
role: operations manager
tasks: [SC-04, SC-08, SC-09, SC-11]
gaps: []
---
# Operations manager guide: Larkspur Ceramics

## What changed for you

Orders are confirmed to the customer the day they arrive. [map/roles.md operations manager]
The confirmation view shows each order, its lines and stock on hand. [map/roles.md operations manager]

## Check today's orders were confirmed

When you'd do it: after the morning's orders are in. [SC-04]

1. Open the confirmation view. [SC-04 step 1]
   ![The confirmation view](../../../uat/larkspur-ceramics/evidence/ops-T1-sc04-confirmation-view.png)
2. Find each of today's orders and check it shows as confirmed. [SC-04 step 2]
   ![Today's orders marked confirmed](../shots/SC-04-2.png)

What you should see: every order shows as confirmed on the day it was sent, with its lines. [SC-04]

If it goes wrong: an order not confirmed has a line on the exceptions list; ask the order coordinator. [map/future.md item 3]

## Read stock on hand beside each line

When you'd do it: when you confirm an order. [SC-08]

1. Open a confirmed order in the confirmation view. [SC-08 step 1]
   ![A confirmed order with stock on hand](../shots/SC-08-1.png)
2. Compare each line's stock on hand with the stock sheet of the same day. [SC-08 step 2]
   ![Stock on hand beside each line](../shots/SC-08-2.png)

What you should see: each line shows the stock on hand for its code, as of the last evening update. [SC-08]

If it goes wrong: stock that looks wrong comes from the stock sheet; check it there first. [CO-01]

## Read "stock not known"

When you'd do it: when a line shows no number for stock. [SC-09]

1. Confirm the order whose code is missing from the stock sheet. [SC-09 step 1]
   ![An order with a code missing from the stock sheet](../shots/SC-09-1.png)
2. Open it in the confirmation view. [SC-09 step 2]
   ![A line showing stock not known](../shots/SC-09-2.png)

What you should see: the line shows "stock not known" instead of a number. [SC-09]

If it goes wrong: add the code to the stock sheet; the next evening update shows the number. [CO-01]

## Read the confirmation view at the start of the day

When you'd do it: at the start of each day. [SC-11]

1. Open the confirmation view. [SC-11 step 1]
   ![The confirmation view in the morning](../shots/SC-11-1.png)
2. Check which of yesterday's orders were confirmed to the customer. [SC-11 step 2]
   ![Yesterday's orders with their confirmation](../shots/SC-11-2.png)

What you should see: each order shows its lines and whether it was confirmed, the day it arrived. [SC-11]

If it goes wrong: an order not confirmed: look for its line on the exceptions list. [map/future.md item 3]

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
