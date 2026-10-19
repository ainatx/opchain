---
ow_artefact: ow-build-plan/contract-inputs
schema: 1
written_by: ow-build-plan 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: plans/larkspur-ceramics/quote.md
created: 2026-11-02
clock: user-stated
origin: skill
client: Larkspur Ceramics
accepted: 2026-11-02
acceptance_note: client accepted 2026-11-02, recorded by Robin; not verified by this skill
parties: { client: Larkspur Ceramics LLC, provider: Example Studio }
quote: plans/larkspur-ceramics/quote.md
scope: plans/larkspur-ceramics/scope.md
acceptance_checks: plans/larkspur-ceramics/acceptance.md
currency: USD
fixed_price: 17450.00
schedule: 40/40/20
payments: [6980.00, 6980.00, 3490.00]
payment_terms_days: 14
valid_until: 2026-11-09
credit_deadline: 2026-12-25
build_plan_fee: 3000
fix_window_days: 30
fix_window_wording: 30 days of fixes
uat: { size: M, tester_roles: [order coordinator, operations manager, bookkeeper], test_mix: "order coordinator: WP-1, WP-2, WP-4; operations manager: WP-3; bookkeeper: WP-5", sessions: 3, fix_rounds: 2, fix_business_days: 5, price: 2400.00 }
documentation_sku: bought
documentation_price: 4000.00
acceptance_definition: The build is accepted when you sign off user acceptance testing with every acceptance check passing, or as the contract's deemed-acceptance clause provides.
delivery_definition: none
contract_clauses: not set
vendor_subscriptions: []
---
# Contract inputs: Larkspur Ceramics

This is contract input, not a contract. It records what was quoted and accepted, for whoever drafts the contract.

Client accepted 2026-11-02, recorded by Robin; not verified by this skill. This is a working note made by an AI assistant at your instruction. It is not a signature or an official record.

## Parties
- Client: Larkspur Ceramics LLC
- Provider: Example Studio

## What is agreed
The five work packages in `plans/larkspur-ceramics/scope.md` (WP-1 to WP-5) and the acceptance checks in `plans/larkspur-ceramics/acceptance.md` (AC-1.1 to AC-5.2), by reference.

## Price and payment
A fixed price of USD 17,450.00 for the work packages and user acceptance testing, in two milestones that each end in a working demo. Payments: 40% to book (USD 6,980.00), 40% at the working demo (USD 6,980.00), 20% at acceptance (USD 3,490.00). Invoices are due within 14 days.

## Change rule
If I underestimate the agreed scope, that's on me. Additional work is written down and priced before it starts.

## Dates
The quote was valid until 9 November 2026. The Build Plan fee of USD 3,000.00 is credited against this build if signed by 25 December 2026.

## Ownership
The work is yours: it lives in your own repository and accounts, under your name, with your data. You receive the documentation and the tests with it.

## Vendor subscriptions
None needed. Any that become needed are billed directly to the client by the vendor, without a markup.

## After delivery
30 days of fixes: for 30 days after delivery, anything in the agreed scope that does not work as its acceptance checks say is fixed at no charge.

## User acceptance testing
Size M: 3 tester roles (order coordinator, operations manager, bookkeeper); the order coordinator checks WP-1, WP-2 and WP-4, the operations manager WP-3 and the bookkeeper WP-5; 3 sessions including the final confirmation run; up to 2 fix rounds within 5 business days each. USD 2,250.00, inside the fixed price.

## Documentation & training
Bought, as Robin recorded the client's choice: written guides and training for up to 15 people (6 planned), USD 4,000.00, outside the fixed price; the contract says when it is invoiced.

## Acceptance and delivery
The build is accepted when you sign off user acceptance testing with every acceptance check passing, or as the contract's deemed-acceptance clause provides.

## Contract clauses
Contract clauses: not set.

## Next
    DONE: client accepted 2026-11-02 (recorded by Robin; not verified by this skill) -> plans/larkspur-ceramics/contract-inputs.md
    NEXT: send contract-inputs.md to whoever drafts your contracts, or fill your own SOW template from it
    IF IT IS NOT AVAILABLE: contract-inputs.md holds what the contract needs; draft it from that file by hand.
    WHEN IT IS SIGNED: say "use ow-build-plan to record the signing on plans/larkspur-ceramics/"   (where slash commands exist: /ow-build-plan-quote --signed <date>)
          It will read: quote.md, contract-inputs.md, and the scope files
