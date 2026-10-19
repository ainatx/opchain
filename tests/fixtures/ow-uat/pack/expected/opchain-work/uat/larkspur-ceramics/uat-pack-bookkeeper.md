---
ow_artefact: ow-uat/pack
schema: 1
written_by: ow-uat 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: uat/larkspur-ceramics/uat.yaml
created: 2027-01-05
clock: user-stated
origin: skill
---
# User acceptance testing: bookkeeper pack, Larkspur Ceramics

## What this test is
You try the finished build against what was agreed, using the scenarios below. A problem inside the agreed scope is fixed quickly and at no charge; anything new is written down and priced before any work starts.

## Dates
- Session 1: Thursday 7 January 2027
- Session 2: Tuesday 12 January 2027
- Session 3: Thursday 21 January 2027 (the final confirmation run)

## Signing in
Your login comes from the operations manager. Your tester id is bk-T1; write it in the results template instead of your name.

## Your scenarios
| Scenario | What to do | What you should see |
|---|---|---|
| SC-06 | The day's confirmed orders become invoices | Each confirmed order is an invoice with the same lines and quantities, and nothing is retyped (10 cases). |
| SC-07 | An order from an unknown customer makes no invoice | No invoice is made and the order is on the exceptions list (1 case). |
| SC-12 | Check the invoices the day's orders produced | Every confirmed order has its invoice, and none was retyped (1 case). |

## Reporting a problem
Write down what you did, what you expected and what happened. Add a screenshot only if it shows no real customer data. Send it to the operations manager.

## The results template
Fill one row per scenario in results-template.csv: tester id, scenario, result (pass, fail, blocked or not run), cases passed, note, records created. There is no name column.

<!-- ow:internal -->
## Self-checks (same-session self-check)
Same-session self-check: the same assistant that wrote this pack, applying a checklist; a discipline, not an independent review. Agent-checked.
| check | result |
| --- | --- |
| Data check | OK |
| People by role or id | OK |
| No credentials | NOT-CHECKED (pattern match only); read-through confirmed by Robin 2027-01-05 |
| No internal numbers | OK |
| No private names | OK |
<!-- ow:end-internal -->
