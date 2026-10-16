---
ow_artefact: ow-build/ledger
schema: 1
written_by: ow-build 1.0.0 (protocol 1)
workstream: fernhill-florists
subject: plans/fernhill-florists/quote.md
created: 2026-11-23
clock: user-stated
origin: skill
client: Fernhill Florists
currency: USD
fixed_price: 8100.00
schedule: 50/50
payment_terms_days: 14
working_demo: none
payments:
  - { trigger: booking, share: 50, amount: 4050.00, state: due, met: 2026-11-19, basis: signed 2026-11-19 (build-request.md) }
  - { trigger: delivery, share: 50, amount: 4050.00, state: not met }
documentation: none
change_orders: []
invoice_requests: []
arithmetic:
  command: ow-tools calc split --total 8100.00 --schedule 50/50
  output: '{"total":"8100.00","schedule":"50/50","amounts":["4050.00","4050.00"]}'
---
# Ledger: Fernhill Florists

This is not an accounting record. It holds the payment schedule from the signed quote, the signed change orders and the invoice requests, with what you report about them.

## Payments
| trigger | share | amount | state |
|---|---|---|---|
| booking | 50% | USD 4,050.00 | due (signed 19 November 2026) |
| delivery | 50% | USD 4,050.00 | not met |

## Documentation & training
No contract-inputs.md in the signed plan: no documentation line, no trigger.

## Change orders
None.

## Invoice requests
None yet.
