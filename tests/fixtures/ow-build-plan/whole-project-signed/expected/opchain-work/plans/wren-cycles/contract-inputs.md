---
written_by: ow-build-plan 2.0.0
created: 2026-11-10
client: Wren Cycles
accepted: 2026-11-10
acceptance_note: client accepted 2026-11-10, stated by Robin
parties: { client: Wren Cycles Ltd, provider: Example Studio }
quote: plans/wren-cycles/quote.md
scope: plans/wren-cycles/quote.md
acceptance_checks: set by the Build Plan phase
currency: USD
mode: whole-project
build_plan: { tier: one_system, fee: 1500.00, weeks: 1 }
fixed_price: 12100.00
schedule: 40/40/20
payments: [4840.00, 4840.00, 2420.00]
payment_terms_days: 14
valid_until: 2026-11-17
credit_deadline: none
build_plan_fee: none
fix_window_days: 30
fix_window_wording: 30 days of fixes
uat: { size: M, tester_roles: [workshop lead, front desk], test_mix: "workshop lead: WP-1; front desk: WP-1, WP-2", sessions: 3, fix_rounds: 2, fix_business_days: 5, price: 2000.00 }
documentation_sku: declined
documentation_price: none
documentation_people: 10
acceptance_definition: The build is accepted when you sign off user acceptance testing with every acceptance check passing, or as the contract's deemed-acceptance clause provides.
delivery_definition: none
contract_clauses: not set
vendor_subscriptions: []
---
# Contract inputs: Wren Cycles

This is contract input, not a contract. It records what was quoted and accepted, for whoever drafts the contract.

Client accepted 2026-11-10, stated by Robin.

## Parties
- Client: Wren Cycles Ltd
- Provider: Example Studio

## What is agreed
The Build Plan phase and the two work packages in `plans/wren-cycles/quote.md`, by reference. The Build Plan sets the detailed scope and the acceptance checks.

## Price and payment
A fixed price of USD 12,100.00 for the Build Plan phase (USD 1,500.00), the work packages and user acceptance testing. Payments: 40% to book (USD 4,840.00), 40% at the working demo (USD 4,840.00), 20% at acceptance (USD 2,420.00). Invoices are due within 14 days. The documentation & training line, when taken, is outside the fixed price and invoiced when the documents are delivered.

## Change rule
If I underestimate the agreed scope, that's on me. Additional work is written down and priced before it starts.

## Dates
The quote was valid until 17 November 2026.

## Ownership
The work is yours: it lives in your own repository and accounts, under your name, with your data. You receive the documentation and the tests with it.

## Vendor subscriptions
None needed. Any that become needed are billed directly to the client by the vendor, without a markup.

## After delivery
30 days of fixes: for 30 days after delivery, anything in the agreed scope that does not work as its acceptance checks say is fixed at no charge.

## User acceptance testing
Size M: 2 tester roles (workshop lead, front desk); 3 sessions including the final confirmation run; up to 2 fix rounds within 5 business days each. USD 2,000.00, inside the fixed price.

## Documentation & training
Declined, as Robin recorded the client's choice; quoted for 10 people.

## Acceptance and delivery
The build is accepted when you sign off user acceptance testing with every acceptance check passing, or as the contract's deemed-acceptance clause provides.

## Contract clauses
Contract clauses: not set.

## What comes next
send contract-inputs.md to whoever drafts your contracts, or fill your own SOW template from it.
When it is signed: /ow-build-plan-quote --signed <date>
