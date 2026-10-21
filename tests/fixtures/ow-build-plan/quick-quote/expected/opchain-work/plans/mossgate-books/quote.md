---
ow_artefact: ow-build-plan/quote
schema: 1
written_by: ow-build-plan 1.2.0 (protocol 1)
workstream: mossgate-books
subject: plans/mossgate-books/quick-scope.md
created: 2026-10-20
clock: user-stated
origin: skill
handling: "no"
client: Mossgate Books
mode: quick
currency: USD
issued: 2026-10-20
valid_until: 2026-11-03
build_size: S
build_size_source: user-stated
build_total: 1100.00
fixed_price: 2100.00
schedule: 50/50
payments: [1050.00, 1050.00]
payment_terms_days: 14
fix_window_days: 30
uat: { size: S, tester_roles: 1, included_roles: 1, sessions: 2, fix_rounds: 1, fix_business_days: 3, price: 1000.00 }
documentation_training: { size: S, people: 3, price: 2000.00, optional: true }
vendor_subscriptions: []
arithmetic: not machine-checked
dates: not machine-checked
---
# Quote: Mossgate Books

Issued 20 October 2026 · valid until 3 November 2026

## What I will deliver
| # | Work package | Includes |
|---|---|---|
| 1 | A weekly sales report from the till export | Acceptance tests and operator notes |
| 2 | A reorder form | Acceptance tests and operator notes |

The scope sets out what is out of scope and the acceptance checks.

## User acceptance testing · S
1 tester role (shop manager), 2 sessions including the final confirmation run, up to 1 fix round within 3 business days each: USD 1,000.00.

## Documentation & training · S (optional)
A short written guide and training for up to 15 people (3 planned): USD 2,000.00. You can decline this line; it is not in the fixed price.

## Fixed price
USD 2,100.00 for the work packages and user acceptance testing. If I underestimate the agreed scope, that's on me. Additional work is written down and priced before it starts.

## Milestones
1. Work packages 1 and 2: ends in a working demo.

You get a written update each week.

## Payment schedule
| When | Share | Amount |
|---|---|---|
| To book | 50% | USD 1,050.00 |
| At delivery | 50% | USD 1,050.00 |

Invoices are due within 14 days. Documentation & training, if you take it, is invoiced when the documents are delivered.

## Vendor subscriptions
Billed directly to you by each vendor, without a markup: none needed.

## After delivery
30 days of fixes: for 30 days after delivery, anything in the agreed scope that does not work as its acceptance checks say is fixed at no charge.

## Acceptance
The build is accepted when you sign off user acceptance testing with every acceptance check passing, or as the contract's deemed-acceptance clause provides.
Delivery: the day the Handoff notes are delivered, or as the contract's delivery-backstop clause provides.

## Valid until
This quote is valid until 3 November 2026.

<!-- ow:internal -->
## Internal appendix (not for the client)

### Pricing lines
| line | package | unit | qty | unit price | modifier | amount | reason |
| --- | --- | --- | --- | --- | --- | --- | --- |
| L1 | WP-1 | report | 1 | 600.00 | none | 600.00 | the Monday sales report |
| L2 | WP-2 | screen | 1 | 500.00 | none | 500.00 | the reorder form |
| T1 | UAT S | uat.S | 1 | 1000.00 | none | 1000.00 | 1 tester role included; size S stated by Robin (no product unit) |

### Modifiers
| modifier | condition | lines | evidence |
| --- | --- | --- | --- |
| none | none | none | none |

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
