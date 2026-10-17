---
ow_artefact: ow-build/demo-script
schema: 1
written_by: ow-build 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: builds/larkspur-ceramics/build.yaml
created: 2026-11-20
clock: user-stated
origin: skill
milestone: M1
demo_date: 2026-11-25 (user-stated)
checks: [AC-1.1, AC-1.2, AC-2.1, AC-4.1]
---
# Demo script: Larkspur Ceramics, milestone 1

Milestone 1 is work packages 1, 2 and 4: purchase orders from email into the order sheet, the exceptions list for codes that match nothing, and the one-off clean-up of the product codes.

## Walk-through
### AC-1.1
- show: send ten purchase orders from September's set to the orders mailbox and open the order sheet
- test data: 10 September purchase orders (source: the client's September set; 10 orders; fields: order number, customer, product code, quantity)
- working looks like: within 15 minutes every line of all ten is in the sheet, codes in the LC-nnnn form, nothing retyped
- ask: is anything in the sheet laid out differently from how your team reads it today?

### AC-1.2
- show: send two emails with a photo of an order instead of a PDF
- test data: 2 emails made for the test
- working looks like: both are on the exceptions list with the reason, and nothing new is in the order sheet
- ask: who should look at the exceptions list each morning?

### AC-2.1
- show: send three September orders with one product code altered in each
- test data: 3 September purchase orders with one code altered (source: the September set; 3 orders; field: product code)
- working looks like: the three lines are on the exceptions list with the code and the customer, not in the sheet
- ask: what does your order coordinator need to see to settle a line?

### AC-4.1
- show: open the order sheet and the QuickBooks Online item list after the clean-up
- test data: September's order sheet and the item list (source: the client's sheet and QuickBooks Online; 40 sheet rows and 20 items sampled; field: product code)
- working looks like: every sampled code is in the LC-nnnn form
- ask: has the order coordinator signed off the corrected codes?

## Not in this milestone
- WP-3 An order confirmation view for the operations team (milestone 2)
- WP-5 Orders from the sheet into QuickBooks Online (milestone 2)

## Questions to ask
- Does the exceptions list need anything else on it to be settled quickly?
- Which day in December suits the milestone 2 demo?
