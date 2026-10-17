---
ow_artefact: ow-build/spec-02-architecture
schema: 1
written_by: ow-build 1.0.0 (protocol 1)
workstream: mossgate-books
subject: plans/mossgate-books/build-request.md
created: 2026-11-02
clock: user-stated
origin: skill
---
# Architecture: Mossgate Books

The signed Build Plan is the source of truth: `plans/mossgate-books/`. Change it there, not here.

A quick-quote job has no process map; systems and data are as the build request states them.

## Systems and data
- The till system: exports a CSV of each week's sales into a shared folder, one row per sale (title, ISBN, quantity, price).
- A shared spreadsheet.
- The distributor: takes reorders as a list.

## Sources
- `plans/mossgate-books/build-request.md` (Systems and data)
