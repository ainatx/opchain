---
ow_artefact: ow-vendor-eval/recommendation
schema: 1
written_by: ow-vendor-eval 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: vendor-eval/larkspur-ceramics/VE-01-inventory-tool/scores.md
created: 2026-10-27
clock: user-stated
origin: skill
evaluation: VE-01
mode: commercial
revision: none
client_form_sha256: sha256:6467fb10bfa8f3698c64ae23ff8f35b82054b4a5e7ca3cecf734617ef015ac05
---
CLIENT CONFIDENTIAL: handle as the client's agreement says
# Recommendation: an inventory tool for finished stock counts

## Decision
Recommended vendor: Tallowmere Stock
It counts stock as each piece is packed, exports every item and count as a file, and has the highest weighted total.

## Runner-up
Brackenfold Inventory. It would be the better choice if it confirmed a full export of items and counts and shipped its API.

## Knock-outs
- Marrowby Goods: out on MH-01, no export of items or stock counts (a vendor page, HIGH).

## Score table
| vendor | CR-01 | CR-02 | CR-03 | CR-04 | CR-05 | CR-06 | total |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tallowmere Stock | 3 | 2 | 3 | 2 | 3 | 2 | 260.00 |
| Brackenfold Inventory | 1 | 0 | 1 LOW only | 1 | 1 | 2 | 90.00 |

## Cost
| vendor | price (dated) | cost over 36 months |
| --- | --- | --- |
| Tallowmere Stock | 18.00 USD per seat per month, as published on 2026-10-18 | 2592.00 USD |
| Brackenfold Inventory | 22.00 USD per seat per month, as published on 2026-10-18 | 3168.00 USD |

## Risks
- Lock-in: counts and items live in the vendor's system; the monthly export is the way out.
- Data export: confirmed for Tallowmere Stock; Brackenfold Inventory's rests on LOW evidence.
- Contract term: monthly on the Standard plan, as published.
- Price rises: the published price can change; check it before signing.

## What to confirm
- Which stock fields the API can update, and its request limit (VQ-01).
- That the trial login is removed after the trial.

## Conflicts statement
No relationships with the vendors considered (stated by Robin on 2026-10-20).

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
- /ow-vendor-eval-recommend · gate · 2026-10-27
- /ow-vendor-eval-recommend · write · 2026-10-27
- /ow-vendor-eval-recommend · checks · 2026-10-27
- /ow-vendor-eval-recommend · export · 2026-10-27
- /ow-vendor-eval-recommend · status · 2026-10-27
<!-- ow:end-internal -->
