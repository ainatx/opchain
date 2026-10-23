---
ow_artefact: ow-vendor-eval/scores
schema: 1
written_by: ow-vendor-eval 1.0.0 (protocol 1)
workstream: business
subject: vendor-eval/business/VE-01-proposal-tool/scope.md
created: 2026-11-06
clock: user-stated
origin: skill
evaluation: VE-01
---
# Scores: a proposal tool for the studio

Scale: 0 not met · 1 met with a workaround · 2 met · 3 clearly better than needed. Each score cites its facts with their level.

## Scores
| vendor | CR-01 | CR-02 | CR-03 |
| --- | --- | --- | --- |
| Harrowgate Docs | 2 (VF-01, MEDIUM) | 2 (VF-02, MEDIUM) | 3 (VF-03, MEDIUM) |
| Linnet Proposals | 3 (VF-01, MEDIUM) | 2 (VF-02, MEDIUM) | 2 (VF-03, MEDIUM) |

## Totals
- Harrowgate Docs: 230.00 points, not money (ow-tools calc total --items vendor-eval/business/VE-01-proposal-tool/calc/totals-harrowgate.json)
  - command: ow-tools calc total --items vendor-eval/business/VE-01-proposal-tool/calc/totals-harrowgate.json
  - output: {"currency":null,"lines":[{"label":"CR-01 Fit to the future process","amount":"80.00"},{"label":"CR-02 Data export and exit","amount":"60.00"},{"label":"CR-03 Cost over the horizon","amount":"90.00"}],"total":"230.00"}
- Linnet Proposals: 240.00 points, not money (ow-tools calc total --items vendor-eval/business/VE-01-proposal-tool/calc/totals-linnet.json)
  - command: ow-tools calc total --items vendor-eval/business/VE-01-proposal-tool/calc/totals-linnet.json
  - output: {"currency":null,"lines":[{"label":"CR-01 Fit to the future process","amount":"120.00"},{"label":"CR-02 Data export and exit","amount":"60.00"},{"label":"CR-03 Cost over the horizon","amount":"60.00"}],"total":"240.00"}

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
- /ow-vendor-eval-score · gate · 2026-11-06
- /ow-vendor-eval-score · scores · 2026-11-06
- /ow-vendor-eval-score · totals · 2026-11-06
- /ow-vendor-eval-score · cost · 2026-11-06
- /ow-vendor-eval-score · checks · 2026-11-06
- /ow-vendor-eval-score · status · 2026-11-06
