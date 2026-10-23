---
ow_artefact: ow-vendor-eval/recommendation
schema: 1
written_by: ow-vendor-eval 1.0.0 (protocol 1)
workstream: hollowbrook-bakery
subject: vendor-eval/hollowbrook-bakery/VE-01-booking-tool/scores.md
created: 2026-11-16
clock: user-stated
origin: skill
evaluation: VE-01
mode: commercial
revision: none
client_form_sha256: sha256:99bad31f4d2525827434a7a6241cec9e9219545744466c887310d64b1871e5ec
---
# Recommendation: a booking tool for the baking classes

## Decision
Recommended vendor: Sallowmere Bookings
It has the highest weighted total: a full export of bookings and guests, two-step sign-in for every account, and waitlists.

## Runner-up
Pennyroyal Book. It would be the better choice if the lower quoted price matters more than the export and security answers, which are the vendor's own words so far.

## Knock-outs
None.

## Score table
| vendor | CR-01 | CR-02 | CR-03 | CR-04 | CR-05 | CR-06 | total |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Pennyroyal Book | 3 | 1 | 2 | 2 | 2 | 3 | 235.00 |
| Sallowmere Bookings | 3 | 2 | 3 | 3 | 2 | 2 | 260.00 |
| Thistledown Slots | 2 | 1 | 1 | 2 | 1 | 3 | 180.00 |
| Wrenfold Reserve | 2 | 2 | 2 | 1 | 2 | 1 | 165.00 |

## Cost
| vendor | price (dated) | cost over 36 months |
| --- | --- | --- |
| Pennyroyal Book | 18.00 USD per seat per month, as quoted by the vendor on 2026-11-03 | 7776.00 USD |
| Sallowmere Bookings | 21.00 USD per seat per month, as quoted by the vendor on 2026-11-04 | 9072.00 USD |
| Thistledown Slots | 16.00 USD per seat per month, as quoted by the vendor on 2026-11-05 | 6912.00 USD |
| Wrenfold Reserve | 25.00 USD per seat per month, as quoted by the vendor on 2026-11-05 | 10800.00 USD |

## Risks
- Lock-in: bookings and guests live in the vendor's system; the full export is the way out.
- Data export: stated by the vendor in its questionnaire; confirm it in the trial.
- Contract term: confirm whether the quoted price needs a yearly term.
- Price rises: the quoted price holds for 30 days; ask what it becomes after.

## What to confirm
- The export's format, in the trial (VQ-02).
- The quoted price after the first year.

## Conflicts statement
No relationships with the vendors considered (stated by Robin on 2026-11-05).

<!-- ow:internal -->
## Self-checks (same-session self-check)
Same-session self-check: the same assistant that wrote these files, applying a checklist; a discipline, not an independent review.
| check | result | label |
| --- | --- | --- |
| Criteria first | OK | agent-checked |
| Numbers | OK | agent-checked |
| Conflicts disclosed | OK | agent-checked |
| No internal numbers | OK | agent-checked |
| No credentials | OK | agent-checked |
| No private names | OK | agent-checked |

## Waivers
| check | figures | client form | reason | recorded |
| --- | --- | --- | --- | --- |

## Runs
- /ow-vendor-eval-recommend · gate · 2026-11-16
- /ow-vendor-eval-recommend · write · 2026-11-16
- /ow-vendor-eval-recommend · checks · 2026-11-16
- /ow-vendor-eval-recommend · export · 2026-11-16
- /ow-vendor-eval-recommend · status · 2026-11-16
<!-- ow:end-internal -->
