import type { Walkthrough } from "./types";

/**
 * Mandate: tool consolidation, selection and TCO — named by seven captured
 * requisitions, and the shape of every post-acquisition CRM estate.
 *
 * Covers oc-modularize-ops arguing against two of the four proposed merges,
 * oc-stack-forge running the selection on TCO rather than a feature grid,
 * oc-cost-ops building the case Finance will approve, and oc-migration-ops
 * moving each entity with a rollback per wave.
 */
export const northgateConsolidation: Walkthrough = {
  id: "northgate-consolidation",
  title: "Four CRM orgs, six renewals, one quarter to decide",
  tagline: "Consolidation, including what not to consolidate",
  summary:
    "Three acquisitions produced four Salesforce orgs, two overlapping enrichment vendors and an iPaaS nobody has logged into since the consultant left. Six renewals land in the same quarter. The scenario's real output is the decision record — including two documented refusals.",
  description:
`Northgate Wealth has grown by acquisition into four Salesforce orgs, eleven process variants and a renewal cliff. The board wants "one platform." The scenario takes that instruction seriously enough to test it.

\`oc-modularize-ops\` opens by refusing two of the four proposed merges. The advisory business unit runs a genuinely different sales motion — long-cycle, relationship-led, with a compensation model that does not survive the standard opportunity schema — and the recently-acquired RIA is mid-remediation with a regulator. Consolidating either would trade a renewal saving for an operational risk nobody priced. The steering committee needs that reasoning in writing, not a verbal caveat in slide 14.

\`oc-stack-forge\` runs the selection on total cost of ownership rather than a feature grid, which reverses the expected answer: the incumbent enrichment vendor wins on features and loses on TCO once seat-based growth and the migration cost of its proprietary IDs are priced in. \`oc-cost-ops\` turns that into the business case, and finds the consolidation pays back in 19 months rather than the 9 the board was quoted — because the quoted figure counted licence savings and not the 14 engineer-weeks of migration.

\`oc-migration-ops\` then moves the two units that should move, in waves with a rollback per wave and golden fixtures captured from real production data as the equivalence oracle.`,
  inputs: [
    "Four Salesforce orgs from three acquisitions, eleven documented process variants",
    "Two enrichment vendors with overlapping coverage; six renewals inside one quarter",
    "A board instruction to consolidate onto one platform, and a quoted 9-month payback",
    "An iPaaS tenant nobody has logged into since the implementation partner left",
    "One business unit mid-remediation with a regulator",
  ],
  skills: [
    "oc-modularize-ops",
    "oc-stack-forge",
    "oc-cost-ops",
    "oc-migration-ops",
    "oc-monitoring-ops",
  ],
  runtime: "16 exchanges",
  outputs: [
    {
      id: "seams",
      label: "Seam analysis — two merges recommended, two refused",
      kind: "decision.md",
      body:
`## Seam analysis — four orgs, four proposals
**Verdict:** merge 2 · **refuse 2** · **Reviewed with:** steering committee, 2026-09-14

## The four
| Org | Business unit | Users | Proposal | Verdict |
| --- | --- | --- | --- | --- |
| NG-CORE | Wealth management (core) | 810 | target instance | — |
| NG-BROK | Brokerage | 240 | merge into CORE | **Merge** |
| NG-ADV | Advisory | 95 | merge into CORE | **Refuse** |
| NG-RIA | Acquired RIA (2026-03) | 130 | merge into CORE | **Refuse — for now** |

## Merge: NG-BROK
Same motion, same compensation model, 92% schema overlap. The 8% that differs is three custom fields on Opportunity that map cleanly. Consolidating removes a genuine duplicate — two teams maintaining the same validation rules and diverging quarterly.

## Refuse: NG-ADV
Advisory runs a long-cycle, relationship-led motion. Three specifics that do not survive the core schema:

- **Compensation splits across four parties** including external introducers. Core's opportunity-split model supports two. Forcing this means either a custom object in the merged org — reintroducing the divergence consolidation was meant to remove — or changing how 95 people are paid.
- **Opportunity stages are not a funnel.** Advisory relationships re-enter earlier stages routinely; core's stage validation forbids backward transitions, and the forecast maths assumes monotonic progress.
- **The merge saves $31K/yr in licences and costs an estimated 9 engineer-weeks.** It does not pay back inside the horizon the board is measuring.

**This is not "advisory is special."** It is that the standard schema encodes a funnel assumption advisory's business does not satisfy, and the cost of the exception is larger than the saving.

## Refuse — for now: NG-RIA
Mid-remediation with a regulator, with an undertaking that includes data-handling commitments made about the RIA's current system. Migrating that data mid-undertaking means re-evidencing controls against a platform the regulator has not seen.

**Revisit when the undertaking closes** (expected Q2). The saving does not expire; the regulatory exposure would be created by us and would be entirely self-inflicted.

## What refusing costs
Two orgs stay. That is two sets of upgrades, two admin rotas, and a reporting layer that must union across instances. Named here so it is a decision rather than a surprise: **consolidation was never free, and the version that merges everything is the expensive one.**`,
    },
    {
      id: "tco",
      label: "Vendor selection on TCO — the incumbent loses",
      kind: "decision.md",
      body:
`## Enrichment vendor selection
**Candidates:** incumbent (Vendor A, in NG-CORE) · Vendor B (in NG-BROK) · one market alternative · **Basis:** 3-year TCO

## Why the feature grid was not the deciding artifact
Vendor A wins on features — better firmographic depth, a native Salesforce package, an existing integration. On a feature grid it is not close. Three-year TCO reverses the result.

| Line | Vendor A | Vendor B |
| --- | --- | --- |
| Licence, yr 1 (940 seats) | $188,000 | $141,000 |
| Licence growth clause | seat-based, 12% floor | flat, CPI-capped |
| Licence, yr 3 (projected) | $236,000 | $149,000 |
| Migration cost | — (incumbent) | 4 eng-weeks · $26,000 |
| **Proprietary-ID lock-in** | **9 eng-weeks to exit later** | portable keys |
| 3-year total | **$638,000** | **$457,000** |

## The line that decided it
Vendor A writes proprietary record IDs into the CRM as the join key. Those IDs are meaningless outside its platform, so **a future exit costs 9 engineer-weeks before anything else is priced** — and that cost is incurred whenever the decision is revisited, not today.

Staying with A is not the status quo; it is buying an option to be locked in for another three years. That is worth saying plainly to a committee that reasonably reads "incumbent" as "no change."

## Recommendation
Vendor B, with the migration budgeted rather than absorbed. Portable keys, flat growth, $181K cheaper over three years.

## What would change this
If seat count shrinks below ~600, A's seat-based pricing stops being the problem and the feature depth may justify it. That threshold is in the record so the next reviewer inherits the reasoning rather than the conclusion.`,
    },
    {
      id: "case",
      label: "Business case — payback is 19 months, not 9",
      kind: "case.md",
      body:
`## Consolidation business case
**For:** CFO, COO, steering committee · **Basis:** two merges, one vendor change

## The quoted number was wrong
The board was quoted a **9-month payback**. That figure counted licence savings and omitted the cost of getting them.

| Line | Year 1 | Year 2 | Year 3 |
| --- | --- | --- | --- |
| Licence saving — org consolidation | $96,000 | $99,000 | $102,000 |
| Licence saving — vendor change | $47,000 | $61,000 | $87,000 |
| Admin effort saved (1.4 FTE-equiv) | $118,000 | $121,000 | $125,000 |
| **Gross benefit** | **$261,000** | **$281,000** | **$314,000** |
| Migration engineering (14 wks) | −$91,000 | — | — |
| Vendor migration (4 wks) | −$26,000 | — | — |
| Dual-running during cutover | −$38,000 | — | — |
| Change management + training | −$44,000 | −$12,000 | — |
| **Net** | **$62,000** | **$269,000** | **$314,000** |

**Payback: 19 months.** The difference is not a modelling dispute — it is that the quoted case had no cost line at all.

## Why present the worse number
Because the 9-month figure will be tested against actuals in month 10, and the gap will be read as a delivery failure rather than an estimating one. A 19-month case that lands is a better quarter than a 9-month case that does not.

## Sensitivity
| Scenario | Payback |
| --- | --- |
| Base | 19 months |
| Migration runs 30% over (our estimates ran over twice last year) | 23 months |
| Advisory merged too, as originally proposed | 27 months — and the risk is unpriced |
| Vendor change deferred to next renewal | 24 months |

The advisory row is the one to read alongside the seam analysis. **Merging everything makes the business case worse, not better** — the option the board asked for is the most expensive one on this table.

## What Finance is being asked to approve
$199,000 of one-time cost against $855,000 of three-year benefit, with two named exclusions and a documented reason for each.`,
    },
    {
      id: "waves",
      label: "Migration plan — waves with a rollback each",
      kind: "plan.md",
      body:
`## Migration plan — NG-BROK into NG-CORE
**Strategy:** parallel-copy with golden-fixture equivalence · **Waves:** 4 · **Rollback:** per wave, tested

## Golden fixtures first
Before any code moves, 1,200 records are captured from production across every shape that matters — multi-party splits, re-opened opportunities, records with the three divergent custom fields, and the 40 accounts that exist in both orgs. These are the equivalence oracle: after each wave, replaying them must produce identical output on both sides, or the wave rolls back.

**Fixtures are captured, anonymised and scanned before they are written.** A capture from production is exactly where a credential ends up — the generation script runs a secret scan on its own output.

## Waves
| # | Scope | Records | Verify | Rollback |
| --- | --- | --- | --- | --- |
| 1 | Reference data, users, roles | ~2,400 | Permission matrix replays identically | Drop mapped users; CORE untouched |
| 2 | Accounts + contacts, incl. 40 duplicates | ~68,000 | Merge report reviewed by Brokerage ops | Restore from staged copy, 40 min |
| 3 | Open opportunities + splits | ~4,100 | All 1,200 fixtures replay clean | Re-point BROK; CORE records soft-deleted |
| 4 | Closed history, activities | ~310,000 | Row counts + spot audit | Leave in place; history is read-only |

**Wave 3 is the one that matters.** Compensation splits are where the schema differs, and where a silent mapping error becomes a payroll dispute rather than a data-quality ticket.

## The duplicate accounts
Forty accounts exist in both orgs, and eleven have different owners. That is not a merge rule question — it is a commission question, and it is resolved by Brokerage and Wealth ops before wave 2 runs, in writing, with the eleven named.

## Monitoring through cutover
Error budget watched across all four waves: sync failure rate, validation-rule rejections, and a daily reconciliation count. Wave N+1 does not start until wave N's reconciliation is flat for two business days.

## What is explicitly not in this plan
NG-ADV and NG-RIA. See the seam analysis. Their absence from this document is the decision, not an omission.`,
    },
    {
      id: "verify",
      label: "Post-wave verification and the one thing that did not reconcile",
      kind: "report.md",
      body:
`## Migration verification — waves 1–4
**Window:** 6 weeks · **Rollbacks used:** 1 (wave 3, once) · **Final state:** BROK retired

## Fixture replay
| Wave | Fixtures | Identical | Explained diff | Unexplained |
| --- | --- | --- | --- | --- |
| 1 | 1,200 | 1,200 | 0 | 0 |
| 2 | 1,200 | 1,188 | 12 | 0 |
| 3 — attempt 1 | 1,200 | 1,146 | 19 | **35** |
| 3 — attempt 2 | 1,200 | 1,181 | 19 | 0 |
| 4 | 1,200 | 1,200 | 0 | 0 |

## The wave-3 rollback
Thirty-five fixtures produced different totals on the two sides. All 35 were four-party compensation splits — the case the seam analysis flagged as the reason advisory was refused, appearing in Brokerage in smaller numbers than anyone had recorded.

The mapping rounded each party's share to 2dp independently, so a four-way split of an odd amount lost a cent, and the cent landed in a different party's share depending on evaluation order. **$0.01 per split, on 35 splits, is not a rounding nuisance — it is a commission statement that does not tie out**, and someone would have found it in a payroll cycle rather than in a fixture replay.

Rolled back inside the 40-minute budget. Fixed by computing shares at full precision and allocating the residual cent to the largest share deterministically. Re-ran clean.

## The 19 explained differences
Records where BROK and CORE genuinely disagreed before migration — stale owner on a transferred account. Reviewed with Brokerage ops, corrected in source, then replayed. **Explained is not the same as identical**, and the report keeps them in a separate column so nobody reads a green total that is quietly absorbing 19 known discrepancies.

## Final
| Measure | Before | After |
| --- | --- | --- |
| Salesforce orgs | 4 | 3 |
| Enrichment vendors | 2 | 1 |
| Admin rota | 3 teams | 2 teams |
| Reconciliation defects at close | — | 0 |

Three orgs, not one. That was the decision, and it is the number the case was built on.`,
    },
  ],
  steps: [
    {
      type: "beat",
      label: "Test the instruction",
      caption: "the board said one platform",
      skills: ["oc-modularize-ops"],
      phase: "discover",
    },
    {
      type: "exchange", role: "user",
      content:
`Three acquisitions, four Salesforce orgs, two enrichment vendors with overlapping coverage, and six renewals landing in the same quarter. The board wants us on one platform and I've been quoted a 9-month payback. Where do I start?`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-modularize-ops",
      content:
`By testing whether "one platform" is the right target, before pricing how to get there. Consolidation plans usually fail at the seam nobody examined, not at the migration.

Reading all four orgs — schema, automation, and the actual sales motion each supports.

## Recommendation: merge two, refuse two
| Org | Unit | Users | Verdict |
| --- | --- | --- | --- |
| NG-CORE | Wealth (core) | 810 | target |
| NG-BROK | Brokerage | 240 | **merge** |
| NG-ADV | Advisory | 95 | **refuse** |
| NG-RIA | Acquired RIA | 130 | **refuse — for now** |

**NG-BROK is a clean merge.** Same motion, same comp model, 92% schema overlap, and the two teams are currently maintaining the same validation rules independently and diverging every quarter. That is a genuine duplicate.

**NG-ADV should not merge**, and the reason is structural rather than cultural. Advisory pays compensation splits across up to four parties including external introducers; core's split model supports two. Advisory relationships re-enter earlier stages routinely; core's stage validation forbids backward transitions and its forecast maths assumes monotonic progress. Forcing the merge means a custom object in the merged org — reintroducing exactly the divergence you are consolidating to remove — or changing how 95 people get paid.

It saves $31K a year and costs about 9 engineer-weeks.`,
      artifacts: ["seams"],
    },
    {
      type: "exchange", role: "user",
      content: `The board asked for one platform. Telling them "three" is going to be a conversation. What about the RIA?`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-modularize-ops",
      content:
`The RIA is a different kind of no, and it is the easier one to defend.

They are mid-remediation with a regulator, under an undertaking that includes data-handling commitments made **about their current system**. Migrating that data mid-undertaking means re-evidencing those controls against a platform the regulator has not seen, on our timeline rather than theirs.

The saving does not expire. The regulatory exposure would be created by us, and it would be entirely self-inflicted. Revisit when the undertaking closes — expected Q2.

## On the conversation with the board
I would not frame it as declining the instruction. Frame it as pricing it:

> Merging everything is on the table and it is the most expensive option. It adds 9 engineer-weeks and an unpriced regulatory risk, and pushes payback from 19 months to 27. Here are the two we should merge and the two we should not, with the reasoning for each.

The refusals need to be in the written record either way, with the reasoning attached. **A verbal caveat in slide 14 is not a decision** — it is something the next person inherits without knowing why, and re-proposes in eighteen months.

And name what refusing costs: three orgs means two upgrade cycles, two admin rotas, and a reporting layer that unions across instances. Consolidation was never free; the all-in version is just differently expensive.`,
    },
    {
      type: "beat",
      label: "Select on cost of ownership",
      caption: "the feature winner loses",
      skills: ["oc-stack-forge", "oc-cost-ops"],
      phase: "spec",
    },
    {
      type: "exchange", role: "user",
      content: `Agreed on all four. Now the enrichment vendors — we're paying for two and they mostly overlap. The incumbent is better on features.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-stack-forge",
      content:
`It is, and it still loses. Scored on three-year total cost of ownership rather than a feature grid.

| Line | Vendor A (incumbent) | Vendor B |
| --- | --- | --- |
| Licence yr 1 (940 seats) | $188,000 | $141,000 |
| Growth clause | seat-based, 12% floor | flat, CPI-capped |
| Licence yr 3 | $236,000 | $149,000 |
| Migration | — | 4 wks · $26,000 |
| **Exit cost later** | **9 eng-weeks** | portable keys |
| **3-year total** | **$638,000** | **$457,000** |

## The line that decides it
Vendor A writes **proprietary record IDs into the CRM as the join key.** Those IDs mean nothing outside its platform. A future exit costs 9 engineer-weeks before anything else is priced, and that cost lands whenever the decision is revisited — not today, which is why it never appears in the comparison that gets made.

Staying with A is not the status quo. It is buying a three-year option to be locked in, and it is worth saying that plainly to a committee that reasonably reads "incumbent" as "no change."

## What would reverse this
If seats drop below ~600, A's seat-based pricing stops being the problem and the feature depth may justify it. That threshold goes in the record, so whoever revisits this inherits the reasoning rather than the conclusion.`,
      artifacts: ["tco"],
    },
    {
      type: "exchange", role: "user",
      content: `Build the case. And I need to know whether the 9-month payback holds.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-cost-ops",
      content:
`It does not, and the reason is not a modelling dispute. **The quoted case counted licence savings and had no cost line at all.**

| Line | Year 1 | Year 2 | Year 3 |
| --- | --- | --- | --- |
| Licence saving — orgs | $96,000 | $99,000 | $102,000 |
| Licence saving — vendor | $47,000 | $61,000 | $87,000 |
| Admin effort saved (1.4 FTE) | $118,000 | $121,000 | $125,000 |
| **Gross benefit** | **$261,000** | **$281,000** | **$314,000** |
| Migration engineering (14 wks) | −$91,000 | — | — |
| Vendor migration (4 wks) | −$26,000 | — | — |
| Dual-running | −$38,000 | — | — |
| Change management + training | −$44,000 | −$12,000 | — |
| **Net** | **$62,000** | **$269,000** | **$314,000** |

**Payback: 19 months.**

## Why bring the worse number
Because the 9-month figure gets tested against actuals in month 10, and the gap reads as a delivery failure rather than an estimating one. A 19-month case that lands is a better quarter than a 9-month case that does not.

## Sensitivity
| Scenario | Payback |
| --- | --- |
| Base | 19 months |
| Migration 30% over — ours ran over twice last year | 23 months |
| **Advisory merged too, as originally proposed** | **27 months, risk unpriced** |
| Vendor change deferred to next renewal | 24 months |

Read that third row next to the seam analysis. The option the board asked for is the worst line on the table — which is a more useful argument for the refusals than anything about advisory's culture.`,
      artifacts: ["case"],
    },
    {
      type: "beat",
      label: "Move the two that should move",
      caption: "waves, fixtures, and one rollback",
      skills: ["oc-migration-ops", "oc-monitoring-ops"],
      phase: "operate",
    },
    {
      type: "exchange", role: "user",
      content: `Approved — 19 months, two merges. Plan the migration.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-migration-ops",
      content:
`Four waves, a tested rollback on each, and golden fixtures before any code moves.

**1,200 records captured from production** across every shape that matters: multi-party splits, re-opened opportunities, the three divergent custom fields, and the 40 accounts that exist in both orgs. After each wave, replaying them must produce identical output on both sides or the wave rolls back. That is the equivalence oracle — not a spot check, an assertion.

| # | Scope | Records | Rollback |
| --- | --- | --- | --- |
| 1 | Reference data, users, roles | 2,400 | Drop mapped users |
| 2 | Accounts + contacts | 68,000 | Restore staged copy, 40 min |
| 3 | **Open opportunities + splits** | 4,100 | Re-point BROK, soft-delete |
| 4 | Closed history | 310,000 | Leave in place, read-only |

**Wave 3 is where the risk is.** Compensation splits are exactly where the two schemas differ, and a silent mapping error there is a payroll dispute rather than a data-quality ticket.

Two things before wave 2: the 40 duplicate accounts include **eleven with different owners**, which is a commission question rather than a merge-rule question — Brokerage and Wealth ops resolve those in writing, with the eleven named. And the fixture-generation script runs a secret scan on its own output, because a capture from production is precisely where a live credential ends up.`,
      artifacts: ["waves"],
    },
    {
      type: "exchange", role: "user",
      content: `Run it.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-migration-ops",
      content:
`Six weeks, one rollback, BROK retired. The rollback is the part worth reading.

## Wave 3, attempt 1 — 35 fixtures did not reconcile
All 35 were **four-party compensation splits** — the exact case the seam analysis flagged as the reason advisory was refused, appearing in Brokerage in smaller numbers than anyone had recorded.

The mapping rounded each party's share to 2dp independently, so a four-way split of an odd amount lost a cent, and which party absorbed it depended on evaluation order.

One cent, on 35 splits. That is not a rounding nuisance — it is **a commission statement that does not tie out**, and it would have surfaced in a payroll cycle rather than a fixture replay. Rolled back inside the 40-minute budget, fixed by computing at full precision and allocating the residual cent to the largest share deterministically, re-ran clean.

## The column that stays separate
Nineteen fixtures differ for a legitimate reason — records where BROK and CORE genuinely disagreed before migration, mostly stale owners on transferred accounts. They are reported in their own column rather than folded into the pass count. **Explained is not identical**, and a green total quietly absorbing 19 known discrepancies is how the next migration inherits them.

| Measure | Before | After |
| --- | --- | --- |
| Salesforce orgs | 4 | 3 |
| Enrichment vendors | 2 | 1 |
| Admin rota | 3 teams | 2 teams |
| Reconciliation defects at close | — | 0 |

Three orgs, not one — which is the number the approved case was built on.`,
      artifacts: ["verify"],
    },
  ],
};
