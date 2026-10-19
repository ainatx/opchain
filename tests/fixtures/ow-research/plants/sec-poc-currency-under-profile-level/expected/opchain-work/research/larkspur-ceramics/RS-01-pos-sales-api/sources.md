---
ow_artefact: ow-research/sources
schema: 1
written_by: ow-research 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: research/larkspur-ceramics/RS-01-pos-sales-api/queries.md
created: 2026-10-17
clock: tool
origin: skill
---
# Sources: RS-01 pos-sales-api

Append-only. One block per page opened or file supplied; pages requested but not opened follow as their own blocks.

### S-01
- url: https://developer.quillfeather.example.com/api/v2/reference/sales
- request: P-02 (R-1)
- title: Sales API reference (v2)
- publisher: Quillfeather
- standing: vendor reference
- class: primary
- stated date: updated 2026-09-30
- retrieved: 2026-10-17 (clock: tool)
- opened: page
- quotes (as returned by the host's page tool):
  - "Each sale includes its line items: the product code (SKU), the quantity and the time of sale."
  - "Results are paged, 100 sales to a page."
- note: the page shows a sample key: [credential-shaped text not copied]

### S-02
- url: https://forum.pos-users.example.net/t/quillfeather-sales-totals/4412
- request: P-03 (R-1)
- title: Quillfeather sales export: totals only?
- publisher: POS Users Forum
- standing: forum
- class: secondary
- stated date: posted 2025-11-03
- retrieved: 2026-10-17 (clock: tool)
- opened: page
- quotes (as returned by the host's page tool):
  - "As far as I can tell the sales endpoint only gives daily totals, not each product."
  - "I get a CSV of the day's sales emailed every night, so that's what I use."

### not opened: P-04
- url: https://partners.quillfeather.example.com/apps/sales-sync
- outcome: skipped: login
- run: R-1

### S-03
- url: https://developer.quillfeather.example.com/api/limits
- request: P-05 (R-1)
- title: API limits
- publisher: Quillfeather
- standing: vendor reference
- class: primary
- stated date: updated 2026-08-12
- retrieved: 2026-10-17 (clock: tool)
- opened: page
- quotes (as returned by the host's page tool):
  - "Each account may make up to 120 requests per minute."

### S-04
- url: https://developer.quillfeather.example.com/api/limits
- request: P-06 (R-2)
- title: API limits
- publisher: Quillfeather
- standing: vendor reference
- class: primary
- stated date: updated 2026-10-21
- retrieved: 2026-10-24 (clock: tool)
- opened: page
- quotes (as returned by the host's page tool):
  - "Each account may make up to 60 requests per minute."
