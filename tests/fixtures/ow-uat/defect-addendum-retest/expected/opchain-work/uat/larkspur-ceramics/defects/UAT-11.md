---
ow_artefact: ow-uat/defect
schema: 1
written_by: ow-uat 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: uat/larkspur-ceramics/runs/RUN-05.md
created: 2027-02-04
clock: user-stated
origin: skill
id: UAT-11
---
# UAT-11: The Friday email missed one exceptions-list line

from: RUN-05, SC-13 (order coordinator oc-T1)
class: Defect
severity: major
status: retested-pass
basis: AC-CO-04.1, as signed in builds/larkspur-ceramics/changes/CO-04.md (a later change order, not in agreed/)
triaged: 2027-02-04
round: 1

## What happened
SC-13, an addendum scenario for CO-04, failed 2 of 3: one exceptions-list line of the test week was not in the Friday email.

## Reason (for the client)
Defect: CO-04's check AC-CO-04.1 says the email lists every line of the week, and one was missing. The fix is at no charge.

## History
- 2027-02-04 rec 76: logged from RUN-05 SC-13 (fail, 2 of 3)
- 2027-02-04 rec 77: triaged Defect, major, against AC-CO-04.1 (CO-04, an addendum scenario)
- 2027-02-04 rec 78: sent to the builder (round 1)
- 2027-02-05 rec 79: fixed, build larkspur-uat-6 (reported by the builder; recorded by Robin)
- 2027-02-08 rec 81: retested-pass in RUN-06
