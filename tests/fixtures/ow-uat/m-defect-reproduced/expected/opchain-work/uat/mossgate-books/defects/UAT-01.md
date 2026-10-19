---
ow_artefact: ow-uat/defect
schema: 1
written_by: ow-uat 1.0.0 (protocol 1)
workstream: mossgate-books
subject: uat/mossgate-books/agreed/quick-scope.md
created: 2026-12-04
clock: user-stated
origin: skill
id: UAT-01
---
# UAT-01: The sales report counted a returned sale twice

from: a report by shop manager, arrived 2026-12-04
class: Defect
severity: major
status: sent
basis: AC-1.1 (quick-scope.md), as frozen in uat/mossgate-books/agreed/
triaged: 2026-12-04
round: 1

## What happened
The shop manager reported that AC-1.1 failed and gave the steps: a week's export with a sale and its return, then the Monday report. The returned sale was counted twice. The builder reproduced it.

## Reason (for the client)
Defect: AC-1.1 says every sale is counted once, and a returned sale was counted twice. The fix is at no charge.

## History
- 2026-12-04 rec 16: logged from a report by shop manager, arrived 2026-12-04
- 2026-12-04 rec 17: qualifying report: names AC-1.1 with steps
- 2026-12-04 rec 18: reproduced by the builder
- 2026-12-04 rec 19: triaged Defect, major, against AC-1.1
- 2026-12-04 rec 20: sent to the builder (round 1)
- 2026-12-04 rec 21: request 1 will be superseded
