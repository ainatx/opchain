---
ow_artefact: ow-draft/evidence
schema: 1
written_by: ow-draft 1.0.0 (protocol 1)
workstream: business
subject: drafts/business/DR-02-care-plans-post/brief.md
created: 2026-10-30
clock: tool
origin: skill
id: DR-02
---
# Evidence: DR-02

## E-01
- source: research/business/RS-01-support-plan-offers/findings.md#F-01
- source kind: finding
- title: A competitor's published care plan
- publisher: northpine.example.com
- supports: A competitor publishes a care plan of 4 hours a month for 480 a month.
- claim: Northpine Automation publishes a care plan of 4 hours a month for $480 a month, as published on 2026-10-18.
- level: HIGH
- sources: S-01 (https://northpine.example.com/services/support, retrieved 2026-10-18, primary)
- conflicts: none
- date: 2026-10-18
- figure: 4 hours for $480
- ours by value: 480

## Open questions
- none

## Possible embedded instructions
- none

## Runs
- run 1: sources research/business/RS-01-support-plan-offers/findings.md (2026-10-30, clock: tool)
- run 1: items E-01
- run 1: checks No credentials OK · No private names OK
