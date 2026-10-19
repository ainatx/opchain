---
ow_artefact: ow-uat/run
schema: 1
written_by: ow-uat 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: uat/larkspur-ceramics/evidence/results-session-1.csv
created: 2027-01-08
clock: user-stated
origin: skill
id: RUN-01
rec: 12
session: 1
kind: session
session_date: 2027-01-07
imported: 2027-01-08
build: larkspur-uat-2 (ready-for-uat.md)
---
# RUN-01: session 1, 7 January 2027

| scenario | proves | tester | result | cases | run_by | source | note | records created | evidence |
|---|---|---|---|---|---|---|---|---|---|
| SC-01 | AC-1.1 | order coordinator oc-T1 | fail | 9 of 10 | order coordinator | results file results-session-1.csv | an order with a discount line lost the discount in the sheet | none | none |
| SC-02 | AC-1.2 | order coordinator oc-T1 | pass | 2 of 2 | order coordinator | results file results-session-1.csv | none | none | none |
| SC-03 | AC-2.1 | order coordinator oc-T1 | pass | 3 of 3 | order coordinator | results file results-session-1.csv | none | none | none |
| SC-04 | AC-3.1 | operations manager ops-T1 | pass | 10 of 10 | operations manager | results file results-session-1.csv | none | none | ops-T1-sc04-confirmation-view.png |
| SC-05 | AC-4.1 | order coordinator oc-T1 | pass | 60 of 60 | order coordinator | results file results-session-1.csv | none | none | none |
| SC-06 | AC-5.1 | bookkeeper bk-T1 | fail | 9 of 10 | bookkeeper | results file results-session-1.csv | a customer with two billing addresses got the wrong one on the invoice | 9 invoices in the QuickBooks Online sandbox | bk-T1-sc06-screen-recording.mov |
| SC-07 | AC-5.2 | bookkeeper bk-T1 | blocked | 0 of 1 | bookkeeper | results file results-session-1.csv | no sandbox login yet; a credential in the note was not copied | none | none |
| SC-08 | AC-CO-01.1 | operations manager ops-T1 | fail | 4 of 5 | operations manager | results file results-session-1.csv | stock on hand showed the day before's figure on one line | none | none |
| SC-09 | AC-CO-01.2 | operations manager ops-T1 | pass | 1 of 1 | operations manager | results file results-session-1.csv | none | none | none |
| SC-10 | WP-2 | order coordinator oc-T1 | pass | 1 of 1 | order coordinator | results file results-session-1.csv | took a while to find where to settle a line (a name in the note was dropped) | none | none |
| SC-11 | WP-3 | operations manager ops-T1 | pass | 1 of 1 | operations manager | results file results-session-1.csv | none | none | none |
| SC-12 | WP-5 | bookkeeper bk-T1 | blocked | 0 of 1 | bookkeeper | results file results-session-1.csv | no sandbox login | none | none |

## Dropped at import
- the column "Name" (12 values): testers are recorded by role and id only
- a name in the note of SC-10
- a password in the note of SC-07: not copied; logged in secrets-seen.log
