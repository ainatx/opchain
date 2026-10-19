---
ow_artefact: ow-uat/defect
schema: 1
written_by: ow-uat 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: uat/larkspur-ceramics/runs/RUN-01.md
created: 2027-01-08
clock: user-stated
origin: skill
id: UAT-05
---
# UAT-05: Stock on hand showed the day before's figure

from: RUN-01, SC-08 (operations manager ops-T1)
class: Defect
severity: major
status: sent
basis: AC-CO-01.1 (CO-01.md), as frozen in uat/larkspur-ceramics/agreed/
triaged: 2027-01-08
round: 1

## What happened
SC-08 failed, 4 of 5: one line showed the stock on hand from the day before, not the last evening update.

## Reason (for the client)
Defect: AC-CO-01.1 says stock on hand is as of the last evening update, and one line was a day old. The fix is at no charge.

## History
- 2027-01-08 rec 23: logged from RUN-01 SC-08 (fail, 4 of 5)
- 2027-01-08 rec 24: triaged Defect, major, against AC-CO-01.1
- 2027-01-08 rec 25: sent to the builder (round 1)
