---
ow_artefact: ow-build/spec-06-testing-change-orders
schema: 1
written_by: ow-build 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: builds/larkspur-ceramics/changes/CO-01.md
created: 2026-12-07
clock: user-stated
origin: skill
---
# Testing, added by signed change orders: Larkspur Ceramics

The signed Build Plan is the source of truth: `plans/larkspur-ceramics/`. Change it there, not here. Each section below was added by a signed amendment; the checks of the signed plan are in `spec/06-testing.md`.

## Change order CO-01 (signed 2026-12-07)

### AC-CO-01.1
- when: an order's lines are on the confirmation view
- then: each line shows the stock on hand for its product code from the stock sheet, as of the last evening update
- how we check: open 5 confirmed orders; each line's stock matches the stock sheet
- test data: 5 orders from the AC-1.1 set and the stock sheet of the same day
- cases: 5
- kind: normal

### AC-CO-01.2
- when: a line's product code is not in the stock sheet
- then: the line shows "stock not known" instead of a number
- how we check: confirm 1 order with a code missing from the stock sheet
- test data: 1 order made for the test
- cases: 1
- kind: error

## Sources
- `builds/larkspur-ceramics/changes/CO-01.md`
