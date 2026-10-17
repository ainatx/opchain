---
ow_artefact: ow-build/spec-scope-and-milestones
schema: 1
written_by: ow-build 1.0.0 (protocol 1)
workstream: fernhill-florists
subject: plans/fernhill-florists/scope.md
created: 2026-11-23
clock: user-stated
origin: skill
---
# Scope and milestones: Fernhill Florists

The signed Build Plan is the source of truth: `plans/fernhill-florists/`. Change it there, not here.

## Work packages
- WP-1 Wedding orders into an online order book: phone orders for weddings are entered once on a form and kept in an order book the whole shop can see.
- WP-2 The van driver's day sheet: each morning the driver's sheet is made from the order book, in delivery order.
- WP-3 Web shop bouquet orders into the order book: bouquet orders from the web shop's export land in the order book without retyping.
- WP-4 A weekly wedding summary for the owner: every Friday the owner gets the coming week's weddings, with flowers to order.

## Out of scope
- Payments taken by the web shop.
- The shop's till.

## Risks
- R-1 The web shop changes its export format (likelihood low, impact medium): an export that does not read sends the owner a message instead of failing quietly. Owner: shop owner.

## Milestones
1. M1: work packages 1 and 2; ends in a working demo.
2. M2: work packages 3 and 4; ends in a working demo.

## Sources
- `plans/fernhill-florists/scope.md` (work packages, out of scope)
- `plans/fernhill-florists/risks.md`
- `plans/fernhill-florists/quote.md` (the Milestones list only)
