---
ow_artefact: ow-uat/defect
schema: 1
written_by: ow-uat 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: uat/larkspur-ceramics/agreed/acceptance.md
created: 2027-01-25
clock: user-stated
origin: skill
id: UAT-09
---
# UAT-09: An order for a customer with a credit on account was invoiced at the full amount

from: a report by bookkeeper, arrived 2027-01-25
class: Defect
severity: major
status: fixed
basis: AC-5.1 (acceptance.md), as frozen in uat/larkspur-ceramics/agreed/
triaged: 2027-01-25
round: 1

## What happened
The bookkeeper reported that AC-5.1 failed and gave the steps: confirm an order for a customer with a credit on account, end the day, open the invoice. The invoice did not apply the credit. The builder reproduced it.

## Reason (for the client)
Defect: AC-5.1 says each invoice matches its order, and a credit on account was left off. The fix is at no charge.

## History
- 2027-01-25 rec 53: logged from a report by bookkeeper, arrived 2027-01-25
- 2027-01-25 rec 54: qualifying report: names AC-5.1 with steps
- 2027-01-25 rec 55: reproduced by the builder
- 2027-01-25 rec 56: triaged Defect, major, against AC-5.1
- 2027-01-25 rec 57: sent to the builder (round 1)
- 2027-01-25 rec 58: request 1 will be superseded
- 2027-01-26 rec 59: fixed, build larkspur-uat-4 (reported by the builder; recorded by Robin)
