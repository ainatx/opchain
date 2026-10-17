---
ow_artefact: ow-build-plan/quote
schema: 1
written_by: ow-build-plan 1.0.0 (protocol 1)
workstream: fernhill-florists
subject: plans/fernhill-florists/scope.md
created: 2026-11-12
clock: user-stated
origin: skill
client: Fernhill Florists
mode: build-plan
currency: USD
issued: 2026-11-12
valid_until: 2026-11-26
plan_delivered: 2026-11-09
build_size: S
build_size_source: price-book
build_total: 7100.00
fixed_price: 8100.00
schedule: 50/50
payments: [4050.00, 4050.00]
payment_terms_days: 14
fix_window_days: 30
uat: { size: S, tester_roles: 1, included_roles: 1, sessions: 2, fix_rounds: 1, fix_business_days: 3, price: 1000.00 }
documentation_training: { size: S, people: 3, price: 2000.00, optional: true }
vendor_subscriptions: []
arithmetic: not machine-checked
dates: not machine-checked
---
# Quote: Fernhill Florists

INVENTED TEST FIXTURE: the delivery-mode quote (no Build Plan fee, so no credit line).

## What I will deliver
| # | Work package | Includes |
|---|---|---|
| 1 | Wedding orders into an online order book | Error handling and alerts, run logs, acceptance tests, operator notes |
| 2 | The van driver's day sheet | Acceptance tests and operator notes |
| 3 | Web shop bouquet orders into the order book | Error handling and alerts, run logs, acceptance tests, operator notes |
| 4 | A weekly wedding summary for the owner | Acceptance tests and operator notes |

## Fixed price
USD 8,100.00 for the work packages and user acceptance testing. If I underestimate the agreed scope, that's on me. Additional work is written down and priced before it starts.

## Milestones
1. Work packages 1 and 2: ends in a working demo.
2. Work packages 3 and 4: ends in a working demo.

You get a written update each week.

## Payment schedule
| When | Share | Amount |
|---|---|---|
| To book | 50% | USD 4,050.00 |
| At delivery | 50% | USD 4,050.00 |

Invoices are due within 14 days.

<!-- ow:internal -->
## Internal appendix (not for the client)

### Pricing lines
| line | package | unit | qty | unit price | modifier | amount | reason |
| --- | --- | --- | --- | --- | --- | --- | --- |
| L1 | WP-1 | tool-s | 1 | 4000.00 | none | 4000.00 | the order book and its form |
| L2 | WP-2 | screen | 1 | 500.00 | none | 500.00 | the driver's day sheet |
| L3 | WP-3 | integration | 1 | 2000.00 | none | 2000.00 | web shop export into the order book |
| L4 | WP-4 | report | 1 | 600.00 | none | 600.00 | the Friday summary |
| T1 | UAT S | uat.S | 1 | 1000.00 | none | 1000.00 | 1 tester role included |
<!-- ow:end-internal -->
