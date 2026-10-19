---
ow_artefact: ow-uat/pack
schema: 1
written_by: ow-uat 1.0.0 (protocol 1)
workstream: mossgate-books
subject: uat/mossgate-books/uat.yaml
created: 2026-11-11
clock: user-stated
origin: skill
---
# User acceptance testing: shop manager pack, Mossgate Books

## What this test is
You try the finished build against what was agreed, using the scenarios below. A problem inside the agreed scope is fixed quickly and at no charge; anything new is written down and priced before any work starts.

## Dates
- Session 1: Thursday 12 November 2026
- Session 2: Tuesday 17 November 2026 (the final confirmation run)

## Signing in
Your login comes from the shop manager. Your tester id is sm-T1; write it in the results template instead of your name.

## Your scenarios
| Scenario | What to do | What you should see |
|---|---|---|
| SC-01 | The Monday sales report counts every sale once | The report is ready by 8:00 with every sale counted once; both reports match a hand count (2 cases). |
| SC-02 | A missing export is reported, not shown as an empty week | The report says the export is missing instead of showing an empty week (1 case). |
| SC-03 | Five titles make one reorder list | One list with the 5 titles and quantities is ready to send to the distributor (1 case). |

## Reporting a problem
Write down what you did, what you expected and what happened. Add a screenshot only if it shows no real customer data. Send it to the shop manager.

## The results template
Fill one row per scenario in results-template.csv: tester id, scenario, result (pass, fail, blocked or not run), cases passed, note, records created. There is no name column.

<!-- ow:internal -->
## Self-checks (same-session self-check)
Same-session self-check: the same assistant that wrote this pack, applying a checklist; a discipline, not an independent review. Agent-checked.
| check | result |
| --- | --- |
| Data check | OK |
| People by role or id | OK |
| No credentials | NOT-CHECKED (pattern match only); read-through confirmed by Robin 2026-11-11 |
| No internal numbers | OK |
| No private names | OK |
<!-- ow:end-internal -->
