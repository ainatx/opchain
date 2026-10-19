---
ow_artefact: ow-research/sources
schema: 1
written_by: ow-research 1.0.0 (protocol 1)
workstream: mossgate-books
subject: research/mossgate-books/RS-01-order-record-retention/queries.md
created: 2026-10-22
clock: tool
origin: skill
---
# Sources: RS-01 order-record-retention

Append-only. One block per page opened or file supplied; pages requested but not opened follow as their own blocks.

### S-01
- url: https://statutes.example.org/title-12/chapter-4/section-12-4-110
- request: P-01 (R-1)
- title: Section 12-4-110. Retention of sales records
- publisher: State of Example (official statutes)
- standing: official publisher
- class: primary
- stated date: current through the 2026 regular session
- retrieved: 2026-10-22 (clock: tool)
- opened: page
- quotes (as returned by the host's page tool):
  - "(a) A business that sells goods to consumers shall keep each order record for not less than four years after the date of sale."

### S-02
- url: https://compliance-digest.example.net/records-retention-small-business
- request: P-02 (R-1)
- title: How long should a small business keep its records?
- publisher: Compliance Digest
- standing: summary site
- class: secondary
- stated date: not stated
- retrieved: 2026-10-22 (clock: tool)
- opened: page
- quotes (as returned by the host's page tool):
  - "Most states require you to keep order records for seven years, so seven is the safe answer everywhere."

### not opened: P-03
- url: https://192.0.2.44/statutes/12-4-110.pdf
- outcome: refused: URL rule (an IP address in any form)
- run: R-1
