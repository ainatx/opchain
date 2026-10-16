---
ow_artefact: ow-build-plan/quote
schema: 1
written_by: ow-build-plan 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: plans/larkspur-ceramics/scope.md
created: 2026-10-26
clock: user-stated
origin: skill
client: Larkspur Ceramics
mode: build-plan
currency: USD
issued: 2026-10-26
valid_until: 2026-11-09
plan_delivered: 2026-10-26
build_plan_fee: 3000
credit_deadline: 2026-12-25
build_size: M
build_size_source: price-book
build_total: 15200.00
fixed_price: 17450.00
schedule: 40/40/20
payments: [6980.00, 6980.00, 3490.00]
payment_terms_days: 14
fix_window_days: 30
uat: { size: M, tester_roles: 3, included_roles: 2, sessions: 3, fix_rounds: 2, fix_business_days: 5, price: 2250.00 }
documentation_training: { size: M, people: 6, price: 4000.00, optional: true }
vendor_subscriptions: []
arithmetic: not machine-checked
dates: not machine-checked
---
# Quote: Larkspur Ceramics

Issued 26 October 2026 · valid until 9 November 2026

## What I will deliver
| # | Work package | Includes |
|---|---|---|
| 1 | Purchase orders from email into the order sheet | Error handling and alerts, run logs, acceptance tests, operator notes |
| 2 | An exceptions list for codes that match nothing | Acceptance tests and operator notes |
| 3 | An order confirmation view for the operations team | Error handling and alerts, run logs, acceptance tests, operator notes |
| 4 | A one-off clean-up of the existing product codes | Acceptance tests |
| 5 | Orders from the sheet into QuickBooks Online | Error handling and alerts, run logs, acceptance tests, operator notes |

The Build Plan sets out what is out of scope, the acceptance checks and the risks.

## User acceptance testing · M
3 tester roles (order coordinator, operations manager, bookkeeper), 3 sessions including the final confirmation run, up to 2 fix rounds within 5 business days each: USD 2,250.00.

## Documentation & training · M (optional)
Written guides and training for up to 15 people (6 planned): USD 4,000.00. You can decline this line; it is not in the fixed price.

## Fixed price
USD 17,450.00 for the work packages and user acceptance testing. If I underestimate the agreed scope, that's on me. Additional work is written down and priced before it starts.

## Milestones
1. Work packages 1, 2 and 4: ends in a working demo.
2. Work packages 3 and 5: ends in a working demo.

You get a written update each week.

## Payment schedule
| When | Share | Amount |
|---|---|---|
| To book | 40% | USD 6,980.00 |
| At the working demo | 40% | USD 6,980.00 |
| At acceptance | 20% | USD 3,490.00 |

Invoices are due within 14 days.

## Vendor subscriptions
Billed directly to you by each vendor, without a markup: none needed.

## Build Plan credit
The Build Plan fee of USD 3,000.00 is credited against this build if signed by 25 December 2026.

## After delivery
30 days of fixes: for 30 days after delivery, anything in the agreed scope that does not work as its acceptance checks say is fixed at no charge.

## Acceptance
The build is accepted when you sign off user acceptance testing with every acceptance check passing, or as the contract's deemed-acceptance clause provides.

## Valid until
This quote is valid until 9 November 2026.

<!-- ow:internal -->
## Internal appendix (not for the client)

### Pricing lines
| line | package | unit | qty | unit price | modifier | amount | reason |
| --- | --- | --- | --- | --- | --- | --- | --- |
| L1 | WP-1 | integration | 1 | 2000.00 | data-messy x1.25 | 2500.00 | email purchase orders into the order sheet |
| L2 | WP-2 | workflow-step-exceptions | 1 | 800.00 | none | 800.00 | the exceptions list a person settles |
| L3 | WP-3 | tool-m | 1 | 8000.00 | none | 8000.00 | the confirmation view |
| L4 | WP-4 | none | 1 | none | none | 1900.00 | priced by Robin, 2026-10-26, reason: one-off code clean-up across the sheet and QuickBooks; no unit fits |
| L5 | WP-5 | integration | 1 | 2000.00 | none | 2000.00 | orders into QuickBooks Online as invoices |
| T1 | UAT M | uat.M | 1 | 2000.00 | none | 2000.00 | 2 tester roles included |
| T2 | UAT extra role | uat.per_extra_role | 1 | 250.00 | none | 250.00 | 3 tester roles, 1 more than included |

### Modifiers
| modifier | condition | lines | evidence |
| --- | --- | --- | --- |
| data-messy | data_condition is messy | L1 | evidence.md E-07 "we fix the codes by hand every Monday" |

Considered and not applied: data-sensitive (the data holds names and addresses only; intake data_condition.2).

### Rates kept internal
- UAT extension: 175.00 per extra session or fix round (client-caused overruns only)

### Arithmetic
- arithmetic not machine-checked: the ow-tools add-on was not installed; Robin checked the sums by hand.

### Quote integrity (same-session self-check)
Same-session self-check: the same assistant that wrote the quote, applying a checklist; a discipline, not an independent review. Agent-checked.
| check | result |
| --- | --- |
| Units or recorded manual price on every package | OK |
| Modifiers cite evidence | OK |
| Dates and terms match the price book | OK |
| Testing line matches uat for the build's size | OK |
| Fix window matches fix_window_days | OK |
| Internal appendix inside the markers | OK |
<!-- ow:end-internal -->
