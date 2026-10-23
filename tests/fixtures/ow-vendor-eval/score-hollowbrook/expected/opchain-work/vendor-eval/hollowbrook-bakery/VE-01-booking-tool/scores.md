---
ow_artefact: ow-vendor-eval/scores
schema: 1
written_by: ow-vendor-eval 1.0.0 (protocol 1)
workstream: hollowbrook-bakery
subject: vendor-eval/hollowbrook-bakery/VE-01-booking-tool/scope.md
created: 2026-11-13
clock: user-stated
origin: skill
evaluation: VE-01
---
# Scores: a booking tool for the baking classes

Scale: 0 not met · 1 met with a workaround · 2 met · 3 clearly better than needed. Each score cites its facts with their level.

## Scores
| vendor | CR-01 | CR-02 | CR-03 | CR-04 | CR-05 | CR-06 |
| --- | --- | --- | --- | --- | --- | --- |
| Pennyroyal Book | 3 (VF-01, HIGH) | 1 (VF-02, MEDIUM) | 2 (VF-03, MEDIUM) | 2 (VF-04, MEDIUM) | 2 (VF-05, MEDIUM) | 3 (VF-06, MEDIUM) |
| Sallowmere Bookings | 3 (VF-01, MEDIUM) | 2 (VF-02, MEDIUM) | 3 (VF-03, MEDIUM) | 3 (VF-04, MEDIUM) | 2 (VF-05, MEDIUM) | 2 (VF-06, MEDIUM) |
| Thistledown Slots | 2 (VF-01, MEDIUM) | 1 (VF-02, MEDIUM) | 1 (VF-03, MEDIUM) | 2 (VF-04, MEDIUM) | 1 (VF-05, MEDIUM) | 3 (VF-06, MEDIUM) |
| Wrenfold Reserve | 2 (VF-01, MEDIUM) | 2 (VF-02, MEDIUM) | 2 (VF-03, MEDIUM) | 1 (VF-04, MEDIUM) | 2 (VF-05, MEDIUM) | 1 (VF-06, MEDIUM) |

## Totals
- Pennyroyal Book: 235.00 points, not money (ow-tools calc total --items vendor-eval/hollowbrook-bakery/VE-01-booking-tool/calc/totals-pennyroyal.json)
  - command: ow-tools calc total --items vendor-eval/hollowbrook-bakery/VE-01-booking-tool/calc/totals-pennyroyal.json
  - output: {"currency":null,"lines":[{"label":"CR-01 Fit to the future process","amount":"75.00"},{"label":"CR-02 Integrations and API access","amount":"10.00"},{"label":"CR-03 Data export and exit","amount":"40.00"},{"label":"CR-04 Security basics","amount":"30.00"},{"label":"CR-05 Support and service levels","amount":"20.00"},{"label":"CR-06 Cost over the horizon","amount":"60.00"}],"total":"235.00"}
- Sallowmere Bookings: 260.00 points, not money (ow-tools calc total --items vendor-eval/hollowbrook-bakery/VE-01-booking-tool/calc/totals-sallowmere.json)
  - command: ow-tools calc total --items vendor-eval/hollowbrook-bakery/VE-01-booking-tool/calc/totals-sallowmere.json
  - output: {"currency":null,"lines":[{"label":"CR-01 Fit to the future process","amount":"75.00"},{"label":"CR-02 Integrations and API access","amount":"20.00"},{"label":"CR-03 Data export and exit","amount":"60.00"},{"label":"CR-04 Security basics","amount":"45.00"},{"label":"CR-05 Support and service levels","amount":"20.00"},{"label":"CR-06 Cost over the horizon","amount":"40.00"}],"total":"260.00"}
- Thistledown Slots: 180.00 points, not money (ow-tools calc total --items vendor-eval/hollowbrook-bakery/VE-01-booking-tool/calc/totals-thistledown.json)
  - command: ow-tools calc total --items vendor-eval/hollowbrook-bakery/VE-01-booking-tool/calc/totals-thistledown.json
  - output: {"currency":null,"lines":[{"label":"CR-01 Fit to the future process","amount":"50.00"},{"label":"CR-02 Integrations and API access","amount":"10.00"},{"label":"CR-03 Data export and exit","amount":"20.00"},{"label":"CR-04 Security basics","amount":"30.00"},{"label":"CR-05 Support and service levels","amount":"10.00"},{"label":"CR-06 Cost over the horizon","amount":"60.00"}],"total":"180.00"}
- Wrenfold Reserve: 165.00 points, not money (ow-tools calc total --items vendor-eval/hollowbrook-bakery/VE-01-booking-tool/calc/totals-wrenfold.json)
  - command: ow-tools calc total --items vendor-eval/hollowbrook-bakery/VE-01-booking-tool/calc/totals-wrenfold.json
  - output: {"currency":null,"lines":[{"label":"CR-01 Fit to the future process","amount":"50.00"},{"label":"CR-02 Integrations and API access","amount":"20.00"},{"label":"CR-03 Data export and exit","amount":"40.00"},{"label":"CR-04 Security basics","amount":"15.00"},{"label":"CR-05 Support and service levels","amount":"20.00"},{"label":"CR-06 Cost over the horizon","amount":"20.00"}],"total":"165.00"}

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
- /ow-vendor-eval-score · gate · 2026-11-13
- /ow-vendor-eval-score · scores · 2026-11-13
- /ow-vendor-eval-score · totals · 2026-11-13
- /ow-vendor-eval-score · cost · 2026-11-13
- /ow-vendor-eval-score · checks · 2026-11-13
- /ow-vendor-eval-score · status · 2026-11-13
