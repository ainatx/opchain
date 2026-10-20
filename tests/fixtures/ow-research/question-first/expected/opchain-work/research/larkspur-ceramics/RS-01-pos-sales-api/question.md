---
ow_artefact: ow-research/question
schema: 1
written_by: ow-research 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: none
created: 2026-10-17
clock: tool
origin: skill
topic: RS-01-pos-sales-api
kind: technical-feasibility
depth: quick
serves: build-plan plans/larkspur-ceramics/
handling: "no"
handling_source: profile.md
environment_approved: not asked
connections_off: not asked
confirmed: yes (2026-10-17, by the user)
keep_out: ["Larkspur Ceramics", "Larkspur", "LC Studio", "larkspurceramics.example.com", "Ridgeline Builders", "Northgate Homes", "Harlow Kitchens"]
owners: [developer.quillfeather.example.com]
by_name: []
---
# Question: RS-01 pos-sales-api

## The question
Can an outside tool read the studio shop's daily sales, line by line with each product code, from the shop's point-of-sale system (Quillfeather POS) through its API?

## The decision it serves
Whether the Build Plan can bring the shop's sales into the order sheet without typing (plans/larkspur-ceramics/).

## Scope
In: what the vendor publishes about its sales API, its limits and the access a reporting tool needs. Out: the client's own account and data; other point-of-sale systems.

## Answered when
We know whether the API returns each sale's line items with product codes, how many requests it allows, and what access an outside tool needs.

## Generic description
A ceramics studio with 10–25 staff, a wholesale trade and a small retail shop, using Quillfeather POS at the till and one shared order spreadsheet.

## Keep out of every query
- Larkspur Ceramics, Larkspur, LC Studio: the business's names, as the user gave them
- larkspurceramics.example.com: its domain
- Ridgeline Builders, Northgate Homes, Harlow Kitchens: the client's customers named in its files, as the user gave them
People are kept out by kind: no name, email address or phone number goes in a query.

## Owners of the facts
- developer.quillfeather.example.com: the point-of-sale vendor, for what its own API offers (confirmed by the user)

## Self-checks (same-session self-check)
Same-session self-check: the same assistant that wrote these files, applying a checklist; a discipline, not an independent review.
| check | result | label |
|---|---|---|
| Query privacy | OK: the generic description carries no keep-out term, person or sentence from the client's files | agent-checked |
| No credentials | OK | agent-checked |
| No private names | OK | agent-checked |
