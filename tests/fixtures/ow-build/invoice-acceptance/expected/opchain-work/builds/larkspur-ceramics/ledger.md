---
ow_artefact: ow-build/ledger
schema: 1
written_by: ow-build 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: plans/larkspur-ceramics/quote.md
created: 2026-11-10
clock: user-stated
origin: skill
client: Larkspur Ceramics
currency: USD
fixed_price: 17450.00
schedule: 40/40/20
payment_terms_days: 14
working_demo: M1
working_demo_source: user-stated 2026-11-10
payments:
  - { trigger: booking, share: 40, amount: 6980.00, state: requested, met: 2026-11-09, basis: signed 2026-11-09 (build-request.md) }
  - { trigger: working-demo, share: 40, amount: 6980.00, state: requested, met: 2026-11-25, basis: "demos/M1-record.md, confirmed by Robin 2026-11-25" }
  - { trigger: acceptance, share: 20, amount: 3490.00, state: requested, met: 2027-01-27, basis: "uat/larkspur-ceramics/signoff.md, signed 2027-01-27" }
documentation: { sku: bought, amount: 4000.00, state: not met }
change_orders:
  - { id: CO-01, amount: 2600.00, terms: on signature, signed: 2026-12-07, state: requested }
invoice_requests:
  - { file: invoices/INV-request-booking.md, trigger: booking, amount: 6980.00, written: 2026-11-10, paid: none }
  - { file: invoices/INV-request-working-demo.md, trigger: working-demo, amount: 6980.00, written: 2026-11-25, paid: none }
  - { file: invoices/INV-request-CO-01.md, trigger: CO-01, amount: 2600.00, written: 2026-12-07, paid: none }
  - { file: invoices/INV-request-acceptance.md, trigger: acceptance, amount: 3490.00, written: 2027-01-27, paid: none }
arithmetic:
  command: ow-tools calc split --total 17450.00 --schedule 40/40/20
  output: '{"total":"17450.00","schedule":"40/40/20","amounts":["6980.00","6980.00","3490.00"]}'
---
# Ledger: Larkspur Ceramics

This is not an accounting record. It holds the payment schedule from the signed quote, the signed change orders and the invoice requests, with what you report about them.

## Payments
| trigger | share | amount | state |
|---|---|---|---|
| booking | 40% | USD 6,980.00 | requested 10 November 2026 |
| working demo (milestone 1) | 40% | USD 6,980.00 | requested 25 November 2026 |
| acceptance | 20% | USD 3,490.00 | requested 27 January 2027 |

The working-demo payment follows milestone 1's demo: Robin said so on 2026-11-10 (user-stated); the quote names one working demo for two milestones.

## Documentation & training
Bought (contract-inputs.md): USD 4,000.00, outside the fixed price; invoiced once, when the documents are delivered. State: not met.

## Change orders
| change order | amount | terms | signed | state |
|---|---|---|---|---|
| CO-01 | USD 2,600.00 | on signature | 7 December 2026 | requested 7 December 2026 |

## Invoice requests
| request | trigger | amount | written | paid |
|---|---|---|---|---|
| invoices/INV-request-booking.md | booking | USD 6,980.00 | 10 November 2026 | not yet reported |
| invoices/INV-request-working-demo.md | working demo | USD 6,980.00 | 25 November 2026 | not yet reported |
| invoices/INV-request-CO-01.md | CO-01 | USD 2,600.00 | 7 December 2026 | not yet reported |
| invoices/INV-request-acceptance.md | acceptance | USD 3,490.00 | 27 January 2027 | not yet reported |
