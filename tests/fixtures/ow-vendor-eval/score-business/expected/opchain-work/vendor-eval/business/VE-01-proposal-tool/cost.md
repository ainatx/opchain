---
ow_artefact: ow-vendor-eval/cost
schema: 1
written_by: ow-vendor-eval 1.0.0 (protocol 1)
workstream: business
subject: vendor-eval/business/VE-01-proposal-tool/scope.md
created: 2026-11-06
clock: user-stated
origin: skill
evaluation: VE-01
---
# Cost over the horizon: a proposal tool for the studio

Horizon: 24 months, 1 seat, as scope.md records them. Prices carry their own dates. A price rise is a risk, in words, never computed.

## Harrowgate Docs
- price: 39.00 USD per seat per month, as quoted by the vendor on 2026-11-04 (inbox/harrowgate-email.md)
- horizon: 24 months × 1 seats
- command: ow-tools calc total --items vendor-eval/business/VE-01-proposal-tool/calc/cost-harrowgate.json --currency USD
- output: {"currency":"USD","lines":[{"label":"Harrowgate Docs seats × months","amount":"936.00"}],"total":"936.00"}
- cost over the horizon: 936.00 USD

## Linnet Proposals
- price: 480.00 USD per seat per month, as quoted by the vendor on 2026-11-05 (inbox/linnet-quote.md)
- horizon: 24 months × 1 seats
- command: ow-tools calc total --items vendor-eval/business/VE-01-proposal-tool/calc/cost-linnet.json --currency USD
- output: {"currency":"USD","lines":[{"label":"Linnet Proposals seats × months","amount":"11520.00"}],"total":"11520.00"}
- cost over the horizon: 11520.00 USD
