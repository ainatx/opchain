---
ow_artefact: ow-handoff/fix
schema: 1
written_by: ow-handoff 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: the client's email of 2027-03-01
created: 2027-03-02
clock: user-stated
origin: skill
id: FIX-03
reported: 2027-03-01
reported_source: the client's email of 2027-03-01, as reported
logged: 2027-03-02
class: Fix
judged_against: AC-1.1
window: main
window_end: 2027-03-26
route: build
punch: none
rec: 20
---
# FIX-03: A purchase order line written with the old product code

## The request
"One purchase order line arrived in the order sheet as 1204LC instead of LC-1204." (order coordinator)

## Classification
A covered Fix: AC-1.1 says every line arrives with the code in the LC-nnnn form, and the report was sent on 1 March 2027, inside the window that ends on 26 March 2027. The classification is a recommendation; Robin decides, and the client sees the reason and the item.

## History
- 2027-03-02 open (logged by Robin)
- 2027-03-04 sent; as reported; not verified by this skill

## Self-checks
Self-checks (same-session self-check, not an independent review): No credentials OK · Operator-task coverage OK · Takeover OK · Fix classification cites the basis OK · Fix verified OK · No internal numbers OK · No private names OK
