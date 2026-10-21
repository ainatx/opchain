---
ow_artefact: ow-documentation/guide
schema: 1
written_by: ow-documentation 1.0.0 (protocol 1)
workstream: mossgate-books
subject: docs/mossgate-books/plan.md
created: 2026-12-11
clock: user-stated
origin: skill
role: shop manager
tasks: [SC-01, SC-02, SC-03]
gaps: [UAT-01]
---
# Shop manager guide: Mossgate Books

## What changed for you

The week's sales are summarised from the till export every Monday morning, and reorders go to the distributor as one list. [quick-scope.md WP-1]

## Read the Monday sales report

When you'd do it: every Monday after 8:00. [SC-01]

1. Make sure the week's till export is in the shared folder before 7:00 on Monday. [SC-01 step 1]
   [screenshot: SC-01 step 1]
2. At 8:00, open the sales report. [SC-01 step 2]
   [screenshot: SC-01 step 2]

What you should see: the week's sales, each counted once. [SC-01]

If it goes wrong: tell whoever built it, through the shop's usual contact. [quick-scope.md WP-1]

A week that looks short counts each sale once; compare it with the till's own total before calling it wrong. [UAT-01]

Came up in testing: UAT-01.

## When the till export is missing

When you'd do it: when Monday's report says the export is missing. [SC-02]

1. Check the shared folder for the week's till export. [SC-02 step 1]
   [screenshot: SC-02 step 1]
2. Open the sales report again once the export is there. [SC-02 step 2]
   [screenshot: SC-02 step 2]

What you should see: the report says the export is missing instead of showing an empty week. [SC-02]

If it goes wrong: tell whoever built it, through the shop's usual contact. [quick-scope.md WP-1]

## Send a reorder to the distributor

When you'd do it: whenever stock runs low. [SC-03]

1. Fill the reorder form with each title and quantity. [SC-03 step 1]
   [screenshot: SC-03 step 1]
2. Open the list for the distributor and send it. [SC-03 step 2]
   [screenshot: SC-03 step 2]

What you should see: one list with every title and quantity, ready to send. [SC-03]

If it goes wrong: tell whoever built it, through the shop's usual contact. [quick-scope.md WP-2]

## Open items

None.

<!-- ow:internal -->
## Self-checks (not for the client)

Same-session self-check: the same assistant that wrote it, applying a checklist; a discipline, not an independent review. Agent-checked.

| check | result |
| --- | --- |
| Trace | OK |
| Coverage | OK |
| People by role or id | OK |
| No credentials | OK |
| No internal numbers | OK |
| No private names | OK |
<!-- ow:end-internal -->
