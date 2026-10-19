---
ow_artefact: ow-uat/defect
schema: 1
written_by: ow-uat 1.0.0 (protocol 1)
workstream: mossgate-books
subject: uat/mossgate-books/agreed/quick-scope.md
created: 2026-11-24
clock: user-stated
origin: skill
id: UAT-01
---
# UAT-01: The report counted a sale from the week before

from: a report by shop manager, arrived 2026-11-24
class: Defect
severity: major
status: open
basis: AC-1.1 (quick-scope.md), as frozen in uat/mossgate-books/agreed/
triaged: 2026-12-01

## What happened
The shop manager reported that AC-1.1 failed and gave the steps: the Monday report after a week with a late-posted sale. The builder could not reproduce it. The business days were counted on the contract calendar: contract-calendar.md table; not machine-checked.

## Reason (for the client)
Not reproduced yet: AC-1.1 is under investigation. The notice went more than 3 business days after the report arrived.

## History
- 2026-11-24 rec 16: logged from a report by shop manager, arrived 2026-11-24
- 2026-11-24 rec 17: qualifying report: names AC-1.1 with steps
- 2026-12-01 rec 18: cannot reproduce notice sent 2026-12-01 (late: 4 business days)
- 2026-12-01 rec 19: request 1 will be superseded
