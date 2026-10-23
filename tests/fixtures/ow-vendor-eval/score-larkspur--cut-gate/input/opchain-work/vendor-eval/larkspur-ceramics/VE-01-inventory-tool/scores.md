---
ow_artefact: ow-vendor-eval/scores
schema: 1
written_by: ow-vendor-eval 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: vendor-eval/larkspur-ceramics/VE-01-inventory-tool/scope.md
created: 2026-10-26
clock: user-stated
origin: skill
evaluation: VE-01
---
# Scores: an inventory tool for finished stock counts

Scale: 0 not met · 1 met with a workaround · 2 met · 3 clearly better than needed. Each score cites its facts with their level.

## Scores
| vendor | CR-01 | CR-02 | CR-03 | CR-04 | CR-05 | CR-06 |
| --- | --- | --- | --- | --- | --- | --- |
| Tallowmere Stock | 3 (VF-03, HIGH) | 2 (VF-05, MEDIUM) | 3 (VF-01, HIGH) | 2 (VF-06, MEDIUM) | 3 (VF-04, MEDIUM) | 2 (VF-02, HIGH) |
| Brackenfold Inventory | 1 (VF-03, MEDIUM) | 0 (VF-04, MEDIUM) | 1 (VF-01, LOW) LOW only | 1 (VF-05, MEDIUM) | 1 (VF-06, MEDIUM) | 2 (VF-02, HIGH) |

## Totals
- Tallowmere Stock: 260.00 points, not money (ow-tools calc total --items vendor-eval/larkspur-ceramics/VE-01-inventory-tool/calc/totals-tallowmere.json)
  - command: ow-tools calc total --items vendor-eval/larkspur-ceramics/VE-01-inventory-tool/calc/totals-tallowmere.json
  - output: {"currency":null,"lines":[{"label":"CR-01 Fit to the future process","amount":"90.00"},{"label":"CR-02 Integrations and API access","amount":"40.00"},{"label":"CR-03 Data export and exit","amount":"60.00"},{"label":"CR-04 Security basics","amount":"20.00"},{"label":"CR-05 Support and service levels","amount":"30.00"},{"label":"CR-06 Cost over the horizon","amount":"20.00"}],"total":"260.00"}
- Brackenfold Inventory: 90.00 points, not money (ow-tools calc total --items vendor-eval/larkspur-ceramics/VE-01-inventory-tool/calc/totals-brackenfold.json)
  - command: ow-tools calc total --items vendor-eval/larkspur-ceramics/VE-01-inventory-tool/calc/totals-brackenfold.json
  - output: {"currency":null,"lines":[{"label":"CR-01 Fit to the future process","amount":"30.00"},{"label":"CR-02 Integrations and API access","amount":"0.00"},{"label":"CR-03 Data export and exit","amount":"20.00"},{"label":"CR-04 Security basics","amount":"10.00"},{"label":"CR-05 Support and service levels","amount":"10.00"},{"label":"CR-06 Cost over the horizon","amount":"20.00"}],"total":"90.00"}

## Knocked out at scoring
none

## Self-checks (same-session self-check)
Same-session self-check: the same assistant that wrote these files, applying a checklist; a discipline, not an independent review.
| check | result | label |
| --- | --- | --- |
| Criteria first | OK | agent-checked |
| Evidence per score | OK | agent-checked |
| Numbers | OK | agent-checked |
| Conflicts disclosed | OK | agent-checked |
| No credentials | OK | agent-checked |
| No private names | OK | agent-checked |

## Runs
- /ow-vendor-eval-score · gate · 2026-10-26
