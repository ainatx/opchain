---
ow_artefact: ow-uat/defect
schema: 1
written_by: ow-uat 1.0.0 (protocol 1)
workstream: mossgate-books
subject: uat/mossgate-books/agreed/quick-scope.md
created: 2026-12-01
clock: user-stated
origin: skill
id: UAT-01
---
# UAT-01: The missing-export message did not show

from: a report by shop manager, arrived 2026-12-01
class: Defect
severity: major
status: withdrawn by client shop manager 2026-12-04
basis: AC-1.2 (quick-scope.md), as frozen in uat/mossgate-books/agreed/
triaged: 2026-12-04

## What happened
The shop manager reported that AC-1.2 failed and gave the steps: an empty folder on Monday, then the report at 8:00. The builder could not reproduce it. The 3 business days were counted on the contract calendar: contract-calendar.md table; not machine-checked.

## Reason (for the client)
Not reproduced: AC-1.2 behaves as agreed in the test environment. A notice was sent on 4 December 2026; the request's deemed date moves to 11 December 2026.

## History
- 2026-12-01 rec 16: logged from a report by shop manager, arrived 2026-12-01
- 2026-12-01 rec 17: qualifying report: names AC-1.2 with steps
- 2026-12-04 rec 18: cannot reproduce notice sent 2026-12-04 (within 3 business days of arrival)
- 2026-12-04 rec 19: withdrawn by client shop manager 2026-12-04
