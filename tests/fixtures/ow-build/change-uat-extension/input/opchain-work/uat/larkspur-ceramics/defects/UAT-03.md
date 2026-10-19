---
ow_artefact: ow-uat/defect
schema: 1
written_by: ow-uat 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: uat/larkspur-ceramics/runs/RUN-01.md
created: 2027-01-08
clock: user-stated
origin: skill
id: UAT-03
---
# UAT-03: An order with a discount line lost the discount in the sheet

from: RUN-01, SC-01 (order coordinator oc-T1)
class: Defect
severity: major
status: sent
basis: AC-1.1 (acceptance.md), as frozen in uat/larkspur-ceramics/agreed/
triaged: 2027-01-08
round: 1

## What happened
SC-01 failed, 9 of 10: one purchase order with a discount line reached the order sheet without the discount. The order is named by its order number in the results file in evidence/.

## Reason (for the client)
Defect: AC-1.1 says every line arrives correct, and a discount line did not. The fix is at no charge.

## History
- 2027-01-08 rec 17: logged from RUN-01 SC-01 (fail, 9 of 10)
- 2027-01-08 rec 18: triaged Defect, major, against AC-1.1
- 2027-01-08 rec 19: sent to the builder (round 1)
- 2027-01-13 rec 27: extension requested, client cause: testers absent from session 2 on 2027-01-12
