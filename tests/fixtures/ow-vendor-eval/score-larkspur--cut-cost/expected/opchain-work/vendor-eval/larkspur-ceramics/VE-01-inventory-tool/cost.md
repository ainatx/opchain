---
ow_artefact: ow-vendor-eval/cost
schema: 1
written_by: ow-vendor-eval 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: vendor-eval/larkspur-ceramics/VE-01-inventory-tool/scope.md
created: 2026-10-26
clock: user-stated
origin: skill
evaluation: VE-01
---
# Cost over the horizon: an inventory tool for finished stock counts

Horizon: 36 months, 4 seats, as scope.md records them. Prices carry their own dates. A price rise is a risk, in words, never computed.

## Tallowmere Stock
- price: 18.00 USD per seat per month, as published on 2026-10-18 (research/larkspur-ceramics/RS-02-inventory-tools/findings.md F-04)
- horizon: 36 months × 4 seats
- command: ow-tools calc total --items vendor-eval/larkspur-ceramics/VE-01-inventory-tool/calc/cost-tallowmere.json --currency USD
- output: {"currency":"USD","lines":[{"label":"Tallowmere Stock seats × months","amount":"2592.00"}],"total":"2592.00"}
- cost over the horizon: 2592.00 USD

## Brackenfold Inventory
- price: 22.00 USD per seat per month, as published on 2026-10-18 (research/larkspur-ceramics/RS-02-inventory-tools/findings.md F-05)
- horizon: 36 months × 4 seats
- command: ow-tools calc total --items vendor-eval/larkspur-ceramics/VE-01-inventory-tool/calc/cost-brackenfold.json --currency USD
- output: {"currency":"USD","lines":[{"label":"Brackenfold Inventory seats × months","amount":"3168.00"}],"total":"3168.00"}
- cost over the horizon: 3168.00 USD
