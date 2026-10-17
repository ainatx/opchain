---
ow_artefact: ow-build/spec-02-architecture
schema: 1
written_by: ow-build 1.0.0 (protocol 1)
workstream: fernhill-florists
subject: plans/fernhill-florists/map/systems.md
created: 2026-11-23
clock: user-stated
origin: skill
---
# Architecture: Fernhill Florists

The signed Build Plan is the source of truth: `plans/fernhill-florists/`. Change it there, not here.

## Systems
- The paper diary: wedding orders by date (moving to the order book).
- The web shop: bouquet orders, with a daily export of the day's orders.

## Data
| data | where it lives | condition |
|---|---|---|
| wedding orders | the paper diary | handwritten; venue and flowers in free text |
| bouquet orders | the web shop export | clean; one row per order |

## The future process
1. Wedding orders go into one shared order book, typed once.
2. The driver's sheet is made from the order book each morning.
3. Web shop orders reach the order book from the daily export.

## Sources
- `plans/fernhill-florists/map/systems.md`
- `plans/fernhill-florists/map/data.md`
- `plans/fernhill-florists/map/future.md`
