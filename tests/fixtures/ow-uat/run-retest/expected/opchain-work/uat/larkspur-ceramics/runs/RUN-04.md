---
ow_artefact: ow-uat/run
schema: 1
written_by: ow-uat 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: uat/larkspur-ceramics/evidence/results-session-4.csv
created: 2027-01-26
clock: user-stated
origin: skill
id: RUN-04
rec: 60
session: extra
kind: retest
session_date: 2027-01-26
imported: 2027-01-26
build: larkspur-uat-4 (UAT-09 fixed)
---
# RUN-04: a retest session after UAT-09's fix, 26 January 2027

| scenario | proves | tester | result | cases | run_by | source | note | records created | evidence |
|---|---|---|---|---|---|---|---|---|---|
| SC-01 | AC-1.1 | order coordinator oc-T1 | pass | 10 of 10 | order coordinator | results file results-session-4.csv | none | none | none |
| SC-02 | AC-1.2 | order coordinator oc-T1 | pass | 2 of 2 | order coordinator | results file results-session-4.csv | none | none | none |
| SC-03 | AC-2.1 | order coordinator oc-T1 | pass | 3 of 3 | order coordinator | results file results-session-4.csv | none | none | none |
| SC-04 | AC-3.1 | operations manager ops-T1 | pass | 10 of 10 | operations manager | results file results-session-4.csv | none | none | none |
| SC-05 | AC-4.1 | order coordinator oc-T1 | pass | 60 of 60 | order coordinator | results file results-session-4.csv | none | none | none |
| SC-06 | AC-5.1 | bookkeeper bk-T1 | pass | 10 of 10 | bookkeeper | results file results-session-4.csv | none | 10 invoices in the QuickBooks Online sandbox | none |
| SC-07 | AC-5.2 | bookkeeper bk-T1 | pass | 1 of 1 | bookkeeper | results file results-session-4.csv | none | none | none |
| SC-08 | AC-CO-01.1 | operations manager ops-T1 | pass | 5 of 5 | operations manager | results file results-session-4.csv | none | none | none |
| SC-09 | AC-CO-01.2 | operations manager ops-T1 | pass | 1 of 1 | operations manager | results file results-session-4.csv | none | none | none |

## Dropped at import
- nothing
