---
ow_artefact: ow-uat/defect
schema: 1
written_by: ow-uat 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: uat/larkspur-ceramics/runs/RUN-03.md
created: 2027-01-22
clock: user-stated
origin: skill
id: UAT-12
---
# UAT-12: An altered product code reached the order sheet after UAT-05's fix

from: RUN-03, SC-03 (order coordinator oc-T1)
class: Defect
severity: major
status: sent
basis: AC-2.1 (acceptance.md), as frozen in uat/larkspur-ceramics/agreed/
triaged: 2027-01-22
round: 1

## What happened
SC-03 failed, 2 of 3, on build larkspur-uat-3. It passed in RUN-01; UAT-05's fix changed how codes are matched.

## Reason (for the client)
Defect: AC-2.1 passed before UAT-05's fix and fails after it (a regression). The fix is at no charge.

## History
- 2027-01-22 rec 51: logged from RUN-03 SC-03 (fail, 2 of 3)
- 2027-01-22 rec 52: triaged Defect, major, against AC-2.1: regression of UAT-05
- 2027-01-22 rec 53: sent to the builder (round 1)
