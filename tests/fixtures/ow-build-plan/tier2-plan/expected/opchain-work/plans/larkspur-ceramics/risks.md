---
ow_artefact: ow-build-plan/risks
schema: 1
written_by: ow-build-plan 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: plans/larkspur-ceramics/scope.md
created: 2026-10-16
clock: user-stated
origin: skill
---
# Risks: Larkspur Ceramics

### R-1 A customer changes its purchase order layout
- likelihood: medium
- impact: high
- mitigation: lines that cannot be read go to the exceptions list instead of failing quietly; the operator notes say how to add a new layout
- owner: operations manager
- evidence: intake fit_risks.1 (an earlier automation broke this way)

### R-2 The code clean-up is not signed off before the spring orders start
- likelihood: medium
- impact: high
- mitigation: run the clean-up first and agree the sign-off date now
- owner: order coordinator
- evidence: E-03, E-07

### R-3 The owner's sign-off on spending takes longer than the schedule allows
- likelihood: low
- impact: medium
- mitigation: send the owner the plan on delivery day with a one-page summary
- owner: operations manager
- evidence: E-10
