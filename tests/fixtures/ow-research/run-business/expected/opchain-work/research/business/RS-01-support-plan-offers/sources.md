---
ow_artefact: ow-research/sources
schema: 1
written_by: ow-research 1.0.0 (protocol 1)
workstream: business
subject: research/business/RS-01-support-plan-offers/queries.md
created: 2026-10-18
clock: tool
origin: skill
---
# Sources: RS-01 support-plan-offers

Append-only. One block per page opened or file supplied; pages requested but not opened follow as their own blocks.

### S-01
- url: https://northpine.example.com/services/support
- request: P-01 (R-1)
- title: Support plans
- publisher: Northpine Automation
- standing: vendor page
- class: primary
- stated date: not stated
- retrieved: 2026-10-18 (clock: tool)
- opened: page
- quotes (as returned by the host's page tool):
  - "Our care plan covers 4 hours of fixes and small changes a month for $480 a month, billed monthly, cancel with 30 days' notice."

### S-02
- url: https://brightloop.example.org/pricing
- request: P-02 (R-1)
- title: Pricing
- publisher: Brightloop Studio
- standing: vendor page
- class: primary
- stated date: not stated
- retrieved: 2026-10-18 (clock: tool)
- opened: page
- quotes (as returned by the host's page tool):
  - "Support starts at $350 per month, with 3 hours of changes included and a two-business-day response."

### not opened: P-04
- url: http://cobaltworks.example.net/pricing
- outcome: refused: URL rule (not https)
- run: R-1

### S-03
- url: https://directory.example.net/automation-studios
- request: P-05 (R-1)
- title: Automation studios for small businesses
- publisher: Studio Directory
- standing: directory
- class: secondary
- stated date: not stated
- retrieved: 2026-10-18 (clock: tool)
- opened: page
- quotes (as returned by the host's page tool):
  - "Most studios we list charge $300 to $600 a month for ongoing support."
