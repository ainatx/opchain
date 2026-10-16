---
ow_artefact: ow-build/ledger
schema: 1
written_by: ow-build 1.0.0 (protocol 1)
workstream: mossgate-books
subject: plans/mossgate-books/quote.md
created: 2026-11-02
clock: user-stated
origin: skill
client: Mossgate Books
currency: USD
fixed_price: 2100.00
schedule: 50/50
payment_terms_days: 14
working_demo: none
payments:
  - { trigger: booking, share: 50, amount: 1050.00, state: requested, met: 2026-10-29, basis: signed 2026-10-29 (build-request.md) }
  - { trigger: delivery, share: 50, amount: 1050.00, state: not met }
documentation: none
change_orders: []
invoice_requests:
  - { file: invoices/INV-request-booking.md, trigger: booking, amount: 1050.00, written: 2026-11-02, paid: none }
arithmetic: not machine-checked
---
# Ledger: Mossgate Books

This is not an accounting record. It holds the payment schedule from the signed quote, the signed change orders and the invoice requests, with what you report about them.

## Payments
| trigger | share | amount | state |
|---|---|---|---|
| booking | 50% | USD 1,050.00 | requested 2 November 2026 |
| delivery | 50% | USD 1,050.00 | not met: the first of the Handoff notes delivered or the contract's delivery backstop; invoiced once |

The payments add up to the fixed price by hand: not machine-checked (the ow-tools add-on was not installed).

## Documentation & training
Declined (contract-inputs.md): no documentation line, no trigger.

## Change orders
None.

## Invoice requests
| request | trigger | amount | written | paid |
|---|---|---|---|---|
| invoices/INV-request-booking.md | booking | USD 1,050.00 | 2 November 2026 | not yet reported |
