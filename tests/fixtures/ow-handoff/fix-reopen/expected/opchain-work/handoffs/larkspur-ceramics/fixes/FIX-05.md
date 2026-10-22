---
ow_artefact: ow-handoff/fix
schema: 1
written_by: ow-handoff 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: the client's email of 2027-03-26
created: 2027-03-28
clock: user-stated
origin: skill
id: FIX-05
reported: 2027-03-26
reported_source: the client's email of 2027-03-26, as reported
logged: 2027-03-28
class: Fix
judged_against: AC-2.1
window: main
window_end: 2027-03-26
route: build
punch: none
rec: 50
---
# FIX-05: An exception settled twice shows twice in the list

## The request
"An exception we settled twice now shows twice in the exceptions list." (order coordinator)

## Classification
A covered Fix: AC-2.1 says each exception shows once, and the report was sent on 26 March 2027, on the window's last day; it arrived after close, so the workstream reopens. The classification is a recommendation; Robin decides, and the client sees the reason and the item.

## History
- 2027-03-28 open (logged by Robin)

## Self-checks
Self-checks (same-session self-check, not an independent review): No credentials OK · Operator-task coverage OK · Takeover OK · Fix classification cites the basis OK · Fix verified OK · No internal numbers OK · No private names OK
