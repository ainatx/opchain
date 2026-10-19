---
ow_artefact: ow-uat/defect
schema: 1
written_by: ow-uat 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: uat/larkspur-ceramics/runs/RUN-01.md
created: 2027-01-08
clock: user-stated
origin: skill
id: UAT-01
---
# UAT-01: The order coordinator took a while to find where to settle an exceptions-list line

from: RUN-01, SC-10 (order coordinator oc-T1)
class: Training gap
severity: minor
status: open
basis: WP-2 (scope.md), as frozen in uat/larkspur-ceramics/agreed/
triaged: 2027-01-08

## What happened
SC-10 passed: the line was settled. The tester's note says it took a while to find where to settle it; the list itself works as agreed.

## Reason (for the client)
Training gap: the exceptions list works as agreed in WP-2. The topic goes to the guides and the training.

## History
- 2027-01-08 rec 13: logged from a passing run, RUN-01 SC-10
- 2027-01-08 rec 14: triaged Training gap, minor, against WP-2
