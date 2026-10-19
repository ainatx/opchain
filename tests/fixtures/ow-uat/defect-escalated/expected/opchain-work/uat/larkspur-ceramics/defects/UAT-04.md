---
ow_artefact: ow-uat/defect
schema: 1
written_by: ow-uat 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: uat/larkspur-ceramics/runs/RUN-01.md
created: 2027-01-08
clock: user-stated
origin: skill
id: UAT-04
---
# UAT-04: A customer with two billing addresses got the wrong one on the invoice

from: RUN-01, SC-06 (bookkeeper bk-T1)
class: Defect
severity: major
status: sent
basis: AC-5.1 (acceptance.md), as frozen in uat/larkspur-ceramics/agreed/
triaged: 2027-01-08
round: 3

## What happened
SC-06 failed, 9 of 10: the invoice for a customer with two billing addresses used the wrong one.

## Reason (for the client)
Defect: AC-5.1 says each invoice matches its order, and one used the wrong billing address. Its third fix round is past the 2 fix rounds quoted; it stays at no charge.

## History
- 2027-01-08 rec 20: logged from RUN-01 SC-06 (fail, 9 of 10)
- 2027-01-08 rec 21: triaged Defect, major, against AC-5.1
- 2027-01-08 rec 22: sent to the builder (round 1)
- 2027-01-13 rec 28: extension requested, client cause: testers absent from session 2 on 2027-01-12
- 2027-01-15 rec 37: fixed, build larkspur-uat-3 (reported by the builder; recorded by Robin)
- 2027-01-22 rec 51: retested-fail in RUN-03 (round 2)
- 2027-01-22 rec 52: sent to the builder (round 2)
- 2027-01-25 rec 53: fixed, build larkspur-uat-4 (reported by the builder; recorded by Robin)
- 2027-01-27 rec 55: retested-fail in RUN-04 (round 3)
- 2027-01-27 rec 56: escalated to Robin: open past 2 fix rounds
- 2027-01-27 rec 57: extended, builder cause (no charge)
- 2027-01-27 rec 58: sent to the builder (round 3)
