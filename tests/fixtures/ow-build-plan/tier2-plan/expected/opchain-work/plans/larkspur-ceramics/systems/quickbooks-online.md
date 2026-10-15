---
ow_artefact: ow-build-plan/systems-quickbooks-online
schema: 1
written_by: ow-build-plan 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: plans/larkspur-ceramics/evidence.md
created: 2026-10-14
clock: user-stated
origin: skill
---
# QuickBooks Online (sandbox copy)

Read-only access, confirmed read-only by Robin on 2026-10-14. Read: object names, fields, record counts, fill rates and one redacted shape, at most 20 rows per object. Nothing written, deleted or exported.

## What it is for
Invoicing. Orders reach it by hand from the order sheet at the end of each day.

## Objects read
| object | records | fields and fill rates |
|---|---|---|
| Item | 212 | name 100%, product code 91%, active flag 100% |
| Invoice | 1,140 in the last 12 months | number 100%, customer 100%, line item 100%, private note 12% |
| Customer | 86 | display name 100%, email 95%, billing address 98% |

## A redacted shape
Invoice: number `<6 digits>`, customer `<id>`, lines of item `<id>` and quantity `<n>`.

## How it connects
No connection to the order sheet or to email; every invoice line is typed in.
