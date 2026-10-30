---
ow_artefact: ow-care/ledger
schema: 1
written_by: ow-care 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: hours-input.json
created: 2027-01-17
clock: user-stated
origin: skill
---
# Hours ledger: Larkspur Ceramics

Not an accounting record. Unit: minutes. Written by the month verb only; a closed row never changes.

## Months

| Month | Included | Rolled in | Care | Health | Report | Meeting | Extra used | Rolled over | Lapsed | Rollover rule (source) | Credit | Invoice request |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M-01 | 480 | 0 | 210 | 45 | 45 | 0 | 0 | 45 | 135 | 0.25,unused,1 (care.yaml) | 0 | invoices/INV-request-care-M-02.md |
| M-02 | 480 | 45 | 210 | 45 | 45 | 0 | 0 | 105 | 120 | 0.5,unused,1 (terms-addendum-2026-11-13.md) | 0 | invoices/INV-request-care-M-03.md |

Months closed under a changed rollover rule are computed by hand from the last closed row, not machine-checked; check it.
