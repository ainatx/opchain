---
ow_artefact: ow-draft/sheet-model
schema: 1
written_by: ow-draft 1.0.0 (protocol 1)
workstream: drafts/harbor-cafe
subject: drafts/harbor-cafe/DR-01-costs/brief.md
created: 2026-10-16
clock: tool
origin: skill
---
CONFIDENTIAL — Harbor Cafe

# Model: Fit-out costs

Inputs come from E-01 and E-02; every computed cell is a formula here.

## Sheet: Costs

| Cell | Formula | Format |
| --- | --- | --- |
| D2 | =B2*C2 | currency:USD |
| D3 | =B3*C3 | currency:USD |
| D4 | =B4*C4 | currency:USD |
| D5 | =SUM(D2:D4) | currency:USD |
| C2:C4 | | currency:USD |
| B2:B4 | | integer |

## Sheet: Rates

| Cell | Formula | Format |
| --- | --- | --- |
| B2 | | percent |
| B3 | =ROUND(Costs!D5*(1+B2),2) | currency:USD |
