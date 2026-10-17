---
ow_artefact: ow-build/invoice-request
schema: 1
written_by: ow-build 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: builds/larkspur-ceramics/demos/M1-record.md
created: 2026-11-25
clock: user-stated
origin: skill
client: Larkspur Ceramics
trigger: working-demo
basis: demos/M1-record.md, confirmed by Robin 2026-11-25
currency: USD
amount: 6980.00
share: 40
amount_source: quote
due_days: 14
arithmetic:
  command: ow-tools calc split --total 17450.00 --schedule 40/40/20
  output: '{"total":"17450.00","schedule":"40/40/20","amounts":["6980.00","6980.00","3490.00"]}'
---
# Invoice request: Larkspur Ceramics, working-demo payment

The working-demo payment, 40% of the fixed price, met at the milestone 1 demo on 25 November 2026 (Robin confirmed the client saw it working): USD 6,980.00, due within 14 days of the invoice.

This is a request for your invoicing tool, not an invoice. The ledger is not an accounting record.

## Next
    NEXT: create this invoice in your invoicing tool.
