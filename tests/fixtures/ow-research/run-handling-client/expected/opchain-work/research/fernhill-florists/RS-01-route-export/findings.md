---
ow_artefact: ow-research/findings
schema: 1
written_by: ow-research 1.0.0 (protocol 1)
workstream: fernhill-florists
subject: research/fernhill-florists/RS-01-route-export/sources.md
created: 2026-11-02
clock: tool
origin: skill
topic: RS-01-route-export
kind: technical-feasibility
serves: build-plan plans/fernhill-florists/
runs: [R-1]
---
# Findings: RS-01 route-export

## Answer
Yes: the routing tool's own help says the day's routes export as a CSV file, one row per stop, in driving order [F-01]. The export leaves out the delivery notes [F-02].

## Findings

### F-01
- claim: The routing tool exports the day's routes as a CSV file, one row per stop, in driving order.
- level: HIGH
- basis: states
- sources: S-01 (inbox/routewise-export-help.html, retrieved 2026-11-01, primary)
- conflicts: none
- watch: no
- run: R-1

### F-02
- claim: The route export does not include the delivery notes.
- level: HIGH
- basis: states
- sources: S-01 (inbox/routewise-export-help.html, retrieved 2026-11-01, primary); S-02 (inbox/user-group-thread.txt, retrieved 2026-11-01, secondary)
- conflicts: none
- watch: no
- run: R-1

## Superseded
none

## Conflicts
none

## Gaps
- Whether the export can be scheduled rather than clicked each morning: neither file says — would settle it: the tool's help page on scheduled exports, saved into inbox/.

## Suspicious content
none found

## Self-checks (same-session self-check)
Same-session self-check: the same assistant that wrote these files, applying a checklist; a discipline, not an independent review.
| check | result | label |
|---|---|---|
| Query privacy | OK: no query was sent | agent-checked |
| Opened, not snippets | OK | agent-checked |
| Cited | OK | agent-checked |
| Confidence rule | OK | agent-checked |
| Quotes short | OK | agent-checked |
| Instructions ignored | OK | agent-checked |
| No credentials | OK | agent-checked |
| No private names | OK | agent-checked |
| No requests under a handling level | OK: nothing was sent; the level is set | agent-checked |
