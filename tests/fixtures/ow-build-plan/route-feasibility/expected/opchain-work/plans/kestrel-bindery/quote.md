---
ow_artefact: ow-build-plan/quote
schema: 1
written_by: ow-build-plan 1.0.0 (protocol 1)
workstream: kestrel-bindery
subject: plans/kestrel-bindery/quick-scope.md
created: 2026-11-10
clock: user-stated
origin: skill
handling: "no"
client: Kestrel Bindery
mode: feasibility
currency: USD
issued: 2026-11-10
valid_until: 2026-11-24
build_total: 900.00
fixed_price: 900.00
schedule: 50/50
payments: [450.00, 450.00]
payment_terms_days: 14
arithmetic: not machine-checked
dates: not machine-checked
---
# Quote: Kestrel Bindery

Issued 10 November 2026 · valid until 24 November 2026

## What is tested
Whether a tool can read your scanned supplier invoices reliably: twenty recent invoices you send, in their mixed layouts, over two weeks.

## What you get
A findings note: how many invoices were read correctly, field by field, which layouts failed and why. And a go or no-go: whether a build is worth doing, and why.

## Price
USD 900.00 for the test.

## Payment schedule
| When | Share | Amount |
|---|---|---|
| To book | 50% | USD 450.00 |
| At delivery | 50% | USD 450.00 |

Invoices are due within 14 days.

## Valid until
This quote is valid until 24 November 2026.

<!-- ow:internal -->
## Internal appendix (not for the client)

### Pricing lines
| line | package | unit | qty | unit price | modifier | amount | reason |
| --- | --- | --- | --- | --- | --- | --- | --- |
| L1 | WP-1 | feasibility-test | 1 | 900.00 | none | 900.00 | the recap's path is a feasibility check |

### Arithmetic
- arithmetic not machine-checked: the ow-tools add-on was not installed; Robin checked the sums by hand.

### Quote integrity (same-session self-check)
Same-session self-check: the same assistant that wrote the quote, applying a checklist; a discipline, not an independent review. Agent-checked.
| check | result |
| --- | --- |
| Priced only as the feasibility unit | OK |
| Dates and terms match the price book | OK |
| Internal appendix inside the markers | OK |
<!-- ow:end-internal -->
