---
ow_artefact: ow-uat/defect
schema: 1
written_by: ow-uat 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: uat/larkspur-ceramics/runs/RUN-01.md
created: 2027-01-08
clock: user-stated
origin: skill
id: UAT-02
---
# UAT-02: The bookkeeper tester had no login for the QuickBooks Online sandbox

from: RUN-01, SC-07 and SC-12 (bookkeeper bk-T1)
class: Environment or data
severity: major
status: closed
basis: the test environment, as recorded in uat/larkspur-ceramics/uat.yaml
triaged: 2027-01-08

## What happened
SC-07 and SC-12 were blocked: the bookkeeper tester had no login for the sandbox. The sandbox is the client's test environment.

## Reason (for the client)
Environment or data: the test set-up was missing a login. It is fixed in the set-up, not the build.

## History
- 2027-01-08 rec 15: logged from RUN-01 SC-07 (blocked, 0 of 1)
- 2027-01-08 rec 16: triaged Environment or data, major, against the test environment in uat.yaml
- 2027-01-15 rec 39: set-up fixed 2027-01-11: the operations manager created the bookkeeper tester's login (as reported)
- 2027-01-22 rec 45: closed (RUN-03 passed)
