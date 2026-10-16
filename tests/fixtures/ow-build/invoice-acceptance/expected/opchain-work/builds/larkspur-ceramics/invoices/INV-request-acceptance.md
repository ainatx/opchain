---
ow_artefact: ow-build/invoice-request
schema: 1
written_by: ow-build 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: uat/larkspur-ceramics/signoff.md
created: 2027-01-27
clock: user-stated
origin: skill
client: Larkspur Ceramics
trigger: acceptance
basis: uat/larkspur-ceramics/signoff.md, signed 2027-01-27
currency: USD
amount: 3490.00
share: 20
due_days: 14
arithmetic:
  command: ow-tools calc split --total 17450.00 --schedule 40/40/20
  output: '{"total":"17450.00","schedule":"40/40/20","amounts":["6980.00","6980.00","3490.00"]}'
---
# Invoice request: Larkspur Ceramics, acceptance payment

The acceptance payment, 20% of the fixed price, met when the client signed off user acceptance testing on 27 January 2027: USD 3,490.00, due within 14 days of the invoice.

This is a request for your invoicing tool, not an invoice. The ledger is not an accounting record.

## Next
    NEXT: create this invoice in your invoicing tool.
