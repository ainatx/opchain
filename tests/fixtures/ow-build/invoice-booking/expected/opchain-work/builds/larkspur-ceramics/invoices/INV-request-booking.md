---
ow_artefact: ow-build/invoice-request
schema: 1
written_by: ow-build 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: plans/larkspur-ceramics/build-request.md
created: 2026-11-10
clock: user-stated
origin: skill
client: Larkspur Ceramics
trigger: booking
basis: signed 2026-11-09 (build-request.md)
currency: USD
amount: 6980.00
share: 40
due_days: 14
arithmetic:
  command: ow-tools calc split --total 17450.00 --schedule 40/40/20
  output: '{"total":"17450.00","schedule":"40/40/20","amounts":["6980.00","6980.00","3490.00"]}'
---
# Invoice request: Larkspur Ceramics, booking payment

The booking payment, 40% of the fixed price, met when the client signed on 9 November 2026: USD 6,980.00, due within 14 days of the invoice.

This is a request for your invoicing tool, not an invoice. The ledger is not an accounting record.

## Next
    NEXT: create this invoice in your invoicing tool.
