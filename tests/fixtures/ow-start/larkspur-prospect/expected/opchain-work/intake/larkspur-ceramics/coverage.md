---
ow_artefact: ow-start/coverage
schema: 1
written_by: ow-start 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: intake/larkspur-ceramics/intake-record.md
created: 2026-10-06
clock: user-stated
origin: skill
---
# Coverage: Larkspur Ceramics, 2026-10-06

score: 10 / 12 must-asks answered (1 unprompted); 1 partly (decision); 1 not asked (budget)

## Must-asks
| field | block | status | where |
|---|---|---|---|
| trigger | 0–2 | answered | 00:33 |
| timeline | 0–2 | answered | 01:09 |
| current_process | 2–8 | answered | 02:27 |
| volume | 2–8 | answered | 03:24; contradicted at 14:24 |
| pain | 2–8 | answered | 03:46 |
| systems | 8–13 | answered | 09:15 |
| data_condition | 8–13 | answered unprompted | 04:15 |
| regime | 8–13 | answered | 10:25 |
| success | 13–17 | answered | 13:58 |
| budget | 13–17 | not asked | — |
| decision | 13–17 | partly | 14:47; the spending limit is unsure |
| next_step | 17–20 | answered | 18:51 |

## Time per block
| block | planned | actual | note |
|---|---|---|---|
| Open | 0–2 | 00:00–02:20 | ran 20 seconds over on background about the customer |
| Problem and how it works today | 2–8 | 02:20–09:10 | 50 seconds over; owners and past attempts (if-time) were covered here |
| Systems and constraints | 8–13 | 09:10–13:50 | on time |
| Success and decision | 13–17 | 13:50–17:30 | the budget question was skipped; the volume question was asked again here |
| Read back | 17–20 | 17:30–19:08 | finished early |

## Fit read
| signal | reads | behind it |
|---|---|---|
| About 3 to 40 people | for | trigger.2 (25 people) |
| Everyday software and spreadsheets | for | systems.1, systems.2 |
| A problem in one sentence | for | current_process.1 (every order is typed twice) |
| Someone on the call who can approve | against | decision.1 (the owner decides and was not on the call) |
| Budget stated | against | budget.1 (not asked) |
| A real deadline | for | timeline.1 (1 March, or the orders are split) |
| Tried before and failed | for, with care | fit_risks.1 (an email automation broke and nobody could fix it) |

## Recap trace (same-session self-check)
Same-session self-check: the same assistant that wrote the recap, applying a checklist; a discipline, not an independent review. Agent-checked.

| section | sentence starts | traces to | result |
|---|---|---|---|
| Today | "Purchase orders arrive by email as PDFs" | current_process.1, systems.1, systems.2 | OK |
| Today | "The same product code is written" | data_condition.1, data_condition.2 | OK |
| Today | "When a code is wrong" | pain.1 | OK |
| What needs to change | "Every order is confirmed" | success.1 | OK |
| What needs to change | "Your biggest customer needs that" | trigger.1, timeline.1 | OK |
| Next step | "I recommend a Build Plan" | offers:build-plan-2, systems.1, systems.2 | OK |
| Next step | "The product codes need cleaning up" | data_condition.1, timeline.1, fit_risks.1 | OK |
| Next step | "If you say yes" | offers:build-plan-2 | OK |
| What I need from you | "Is there a budget range" | budget.1 | OK |
| What I need from you | "In a normal week" | volume.1 | OK |
| What I need from you | "Two or three recent purchase orders" | current_process.1, data_condition.1 | OK |
| Promised by me | "A short list of what I need" | promised_by_user.1 | OK |

## Self-checks
| check | label | result |
|---|---|---|
| Recap trace | same-session self-check, agent-checked | OK: 12 of 12 sentences trace; Today and What needs to change rest on HIGH and MEDIUM facts only |
| Speaker rule | same-session self-check, agent-checked | OK: pain.2 (most of the morning) is the user's suggestion and is recorded LOW |
| Embedded instructions | same-session self-check, agent-checked | OK: one found in the meeting chat at 11:02, quoted, not acted on |
| Coverage | same-session self-check, agent-checked | OK: budget (not asked) and volume (contradicted) are both asked in the recap |
| Voice | same-session self-check, agent-checked | OK: no labels, quotes, tool words or prices in the recap |

overall: PASS (Ready)
