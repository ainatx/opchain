---
written_by: ow-build-plan 2.0.0
created: 2026-11-03
client: Wren Cycles
mode: whole-project
build_plan: { tier: one_system, fee: 1500.00, weeks: 1 }
currency: USD
issued: 2026-11-03
valid_until: 2026-11-17
build_size: M
build_size_source: price-book
build_total: 8600.00
fixed_price: 12100.00
schedule: 40/40/20
payments: [4840.00, 4840.00, 2420.00]
payment_terms_days: 14
fix_window_days: 30
uat: { size: M, tester_roles: 2, included_roles: 2, sessions: 3, fix_rounds: 2, fix_business_days: 5, price: 2000.00 }
documentation_training: { size: M, people: 10, price: 4000.00, optional: true }
vendor_subscriptions: []
arithmetic: not machine-checked
dates: not machine-checked
---
# Quote: Wren Cycles

Issued 3 November 2026 · valid until 17 November 2026

## Phase 1: Build Plan
1 week: how the work runs today, what should change, the scope, what is out of scope, acceptance checks you can run yourself, and risks: USD 1,500.00.

## What I will deliver
| # | Work package | Includes |
|---|---|---|
| 1 | A repair-booking tool for the workshop | Error alerts, run logs, acceptance tests, operator notes |
| 2 | A weekly bookings report | Acceptance tests and operator notes |

The Build Plan sets out what is out of scope, the acceptance checks and the risks. If the Build Plan shows the work differs from what is written here, the difference is written down and priced before that work starts.

## User acceptance testing · M
2 tester roles (workshop lead, front desk), 3 sessions including the final confirmation run, up to 2 fix rounds within 5 business days each: USD 2,000.00.

## Documentation & training · M (optional)
Written guides and training for up to 15 people (10 planned): USD 4,000.00. You can decline this line; it is not in the fixed price.

## Fixed price
USD 12,100.00 for the Build Plan phase, the work packages and user acceptance testing. If I underestimate the agreed scope, that's on me. Additional work is written down and priced before it starts.

## Milestones
1. The Build Plan, delivered.
2. Work packages 1 and 2: ends in a working demo.

You get a written update each week.

## Payment schedule
| When | Share | Amount |
|---|---|---|
| To book | 40% | USD 4,840.00 |
| At the working demo | 40% | USD 4,840.00 |
| At acceptance | 20% | USD 2,420.00 |

Invoices are due within 14 days. Documentation & training, if you take it, is invoiced when the documents are delivered.

## Vendor subscriptions
Billed directly to you by each vendor, without a markup: none needed.

## After delivery
30 days of fixes: for 30 days after delivery, anything in the agreed scope that does not work as its acceptance checks say is fixed at no charge.

## Acceptance
The build is accepted when you sign off user acceptance testing with every acceptance check passing, or as the contract's deemed-acceptance clause provides.

## Assumptions
- The workshop takes bookings at one site.
- The till export stays in its present format.

## Valid until
This quote is valid until 17 November 2026.

<!-- ow:internal -->
## Internal appendix (not for the client)

### Pricing lines
| line | package | unit | qty | unit price | modifier | amount | reason |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | Build Plan | build_plan_fees.one_system | 1 | 1500.00 | none | 1500.00 | 1 week |
| L1 | WP-1 | tool-m | 1 | 8000.00 | none | 8000.00 | the booking tool, as Robin stated the scope |
| L2 | WP-2 | report | 1 | 600.00 | none | 600.00 | the weekly report |
| T1 | UAT M | uat.M | 1 | 2000.00 | none | 2000.00 | 2 tester roles included |

### Modifiers
| modifier | condition | lines | evidence |
| --- | --- | --- | --- |
| none | none | none | none |

### Rates kept internal
- UAT extension: 175.00 per extra session or fix round (client-caused overruns only)

### Arithmetic
- arithmetic not machine-checked: the ow-tools add-on was not installed.
<!-- ow:end-internal -->
