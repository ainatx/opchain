---
ow_artefact: ow-build-plan/contract-inputs
schema: 1
written_by: ow-build-plan 1.3.0 (protocol 1)
workstream: hollowbrook-bakery
subject: plans/hollowbrook-bakery/quote.md
created: 2026-11-02
clock: user-stated
origin: skill
client: Hollowbrook Bakery
mode: vendor-eval
accepted: 2026-11-02
acceptance_note: client accepted 2026-11-02, recorded by Robin; not verified by this skill
parties: { client: Hollowbrook Bakery, provider: Example Studio }
quote: plans/hollowbrook-bakery/quote.md
scope: plans/hollowbrook-bakery/quick-scope.md
currency: USD
fixed_price: 2400.00
schedule: 50/50
payments: [1200.00, 1200.00]
payment_terms_days: 14
valid_until: 2026-11-09
deliverables: [recommendation, decision record]
contract_clauses: not set
---
# Contract inputs: Hollowbrook Bakery

This is contract input, not a contract. It records the vendor selection that was quoted and accepted, for whoever drafts the contract.

Client accepted 2026-11-02, recorded by Robin; not verified by this skill. This is a working note made by an AI assistant at your instruction. It is not a signature or an official record.

## Parties
- Client: Hollowbrook Bakery
- Provider: Example Studio

## What is compared
The selection in `plans/hollowbrook-bakery/quick-scope.md` (WP-1, checks AC-1.1 and AC-1.2), by reference.

## What you get
A one-page recommendation and the record of your decision.

## Price and payment
USD 2400.00 for the selection: 50% to book (USD 1200.00), 50% at delivery of the recommendation (USD 1200.00). Invoices are due within 14 days.

## Dates
The quote was valid until 9 November 2026.

## Contract clauses
Contract clauses: not set.

## Next
    DONE: client accepted 2026-11-02 (recorded by Robin; not verified by this skill) -> plans/hollowbrook-bakery/contract-inputs.md
    NEXT: send contract-inputs.md to whoever drafts your contracts, or fill your own SOW template from it
    IF IT IS NOT AVAILABLE: contract-inputs.md holds what the contract needs; draft it from that file by hand.
    WHEN IT IS SIGNED: say "use ow-build-plan to record the signing on plans/hollowbrook-bakery/"   (where slash commands exist: /ow-build-plan-quote --signed <date>)
          It will read: quote.md, contract-inputs.md, and the scope files
          [no folder attached: attach them when you say it]
