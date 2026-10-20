---
ow_artefact: ow-research/question
schema: 1
written_by: ow-research 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: none
created: 2026-10-18
clock: tool
origin: skill
topic: RS-02-po-pdf-parsing
kind: technical-feasibility
depth: standard
serves: build-plan plans/larkspur-ceramics/
handling: "no"
handling_source: profile.md
environment_approved: not asked
connections_off: not asked
confirmed: yes (2026-10-18, by the user)
keep_out: ["Larkspur Ceramics", "Larkspur", "LC Studio", "larkspurceramics.example.com", "Ridgeline Builders", "Northgate Homes", "Harlow Kitchens"]
owners: [parsedock.example.com]
by_name: []
---
# Question: RS-02 po-pdf-parsing

## The question
Can an email PDF parser read every line item of a multi-page purchase order without a person checking each one?

## The decision it serves
Whether the Build Plan can parse purchase orders straight from email (plans/larkspur-ceramics/).

## Scope
In: what PDF parsing services publish about multi-page orders and their accuracy. Out: building a parser; the client's own purchase orders.

## Answered when
We know which services read multi-page line items, how they report what they could not read, and what they need set up.

## Generic description
A small wholesale ceramics business that receives customer purchase orders as PDF email attachments, often several pages long.

## Keep out of every query
- Larkspur Ceramics, Larkspur, LC Studio: the business's names
- larkspurceramics.example.com: its domain
- Ridgeline Builders, Northgate Homes, Harlow Kitchens: the client's customers named in its files, as the user gave them
People are kept out by kind: no name, email address or phone number goes in a query.

## Owners of the facts
- parsedock.example.com: a parsing service's own documentation, for what that service does (confirmed by the user)

## Self-checks (same-session self-check)
Same-session self-check: the same assistant that wrote these files, applying a checklist; a discipline, not an independent review.
| check | result | label |
|---|---|---|
| Query privacy | OK: the generic description carries no keep-out term, person or sentence from the client's files | agent-checked |
| No credentials | OK | agent-checked |
| No private names | OK | agent-checked |
