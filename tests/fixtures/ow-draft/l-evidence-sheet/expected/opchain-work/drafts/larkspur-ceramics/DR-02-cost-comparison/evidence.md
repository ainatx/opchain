---
ow_artefact: ow-draft/evidence
schema: 1
written_by: ow-draft 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: drafts/larkspur-ceramics/DR-02-cost-comparison/brief.md
created: 2026-10-29
clock: tool
origin: skill
id: DR-02
---
# Evidence: DR-02

## E-01
- source: user-stated 2026-10-29
- source kind: user-stated
- title: Retyping time per month
- publisher: Larkspur Ceramics
- supports: Retyping email orders takes 40 hours a month.
- level: MEDIUM
- date: 2026-10-29
- figure: 40 hours

## E-02
- source: user-stated 2026-10-29
- source kind: user-stated
- title: Staff cost per hour
- publisher: Larkspur Ceramics
- supports: The client's staff cost is 30 an hour.
- level: MEDIUM
- date: 2026-10-29
- figure: 30

## E-03
- source: user-stated 2026-10-29
- source kind: user-stated
- title: Monday clean-up time
- publisher: Larkspur Ceramics
- supports: The Monday clean-up takes 8 hours a month.
- level: MEDIUM
- date: 2026-10-29
- figure: 8 hours

## E-04
- source: calc
- source kind: calc
- title: Monthly cost of retyping and clean-up
- publisher: Larkspur Ceramics
- supports: The monthly cost of retyping and the clean-up.
- level: HIGH
- date: 2026-10-29
- figure: 1440.00
- calc: ow-tools calc total --items drafts/larkspur-ceramics/DR-02-cost-comparison/calc/E-04.json
- output: {"currency":"USD","lines":[{"label":"Retyping orders","amount":"1200.00"},{"label":"Monday clean-up","amount":"240.00"}],"total":"1440.00"}

## Open questions
- none

## Possible embedded instructions
- none

## Runs
- run 1: sources your statement (2026-10-29, clock: tool)
- run 1: items E-01, E-02, E-03, E-04
- run 1: checks No credentials OK · No private names OK
