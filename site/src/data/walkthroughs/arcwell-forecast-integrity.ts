import type { Walkthrough } from "./types";

/**
 * Mandate: forecasting and funnel integrity — four captured requisitions, one
 * measured explicitly on "forecast accuracy, funnel efficiency, system adoption".
 *
 * Covers oc-data-ops laying the warehouse layering with contracts, oc-signal-forge
 * adversarially verifying the metric answers the question it was named for,
 * oc-dash-forge and oc-ux-engineer rebuilding the view, and oc-monitoring-ops
 * alerting on the contract rather than the chart.
 */
export const arcwellForecastIntegrity: Walkthrough = {
  id: "arcwell-forecast-integrity",
  title: "The board saw the forecast miss before we did",
  tagline: "A contract under the number",
  summary:
    "Committed pipeline had been overstated for six weeks after a stage-definition change nobody propagated downstream. The scenario builds the warehouse layering and the data contract that would have caught it in week one — and finds the metric was measuring something nobody had asked for.",
  description:
`Arcwell missed its quarter by 14% against a forecast that had read healthy the whole way. The stage definitions changed in week 2 — "Commit" was redefined to require a signed mutual action plan — and the change reached Salesforce, the enablement deck and nobody's warehouse.

\`oc-data-ops\` lays a staging → intermediate → marts layering with freshness, volume and schema contracts, replacing a single 900-line view that read Salesforce directly and had four different definitions of "qualified" inside it.

\`oc-signal-forge\` then does the step this pipeline has never shown: it adversarially verifies that the metric answers the question it was named for. It does not. "Committed pipeline" as computed sums opportunities in Commit stage — including those whose close date has already passed and which nobody has touched in 40 days. **Eleven percent of the committed number was opportunities that were committed to a quarter that had already ended.**

\`oc-dash-forge\` and \`oc-ux-engineer\` rebuild the view into three layers so the number that matters is the one you see first, and \`oc-monitoring-ops\` alerts on the contract rather than the chart — because the next silent redefinition should page someone rather than surface at a board meeting.`,
  inputs: [
    "A quarter missed by 14% against a forecast that read healthy throughout",
    "A stage-definition change in week 2 that never reached the warehouse",
    "One 900-line view reading Salesforce directly, with four definitions of 'qualified'",
    "A pipeline dashboard nobody distrusted until the miss",
    "A board asking whether the next forecast can be believed",
  ],
  skills: [
    "oc-data-ops",
    "oc-signal-forge",
    "oc-dash-forge",
    "oc-ux-engineer",
    "oc-monitoring-ops",
  ],
  runtime: "14 exchanges",
  outputs: [
    {
      id: "layering",
      label: "Warehouse layering and data contracts",
      kind: "plan.md",
      body:
`## Warehouse model — staging → intermediate → marts
**Replaces:** \`vw_pipeline_summary\` (900 lines, reads Salesforce directly)

## What the single view cost
One object, four definitions of "qualified", depending on which CTE you land in:

| Line | Definition of qualified |
| --- | --- |
| 61 | \`stage_name NOT IN ('Prospecting','Discovery')\` |
| 244 | \`is_qualified__c = TRUE\` |
| 502 | \`amount > 25000 AND has_champion__c = TRUE\` |
| 771 | \`stage_order >= 3\` |

Four numbers exist for the same word, and which one a report shows depends on which CTE it happened to select from. Nobody chose this; it accreted across three analysts over two years.

## The layering
\`\`\`
staging/          1:1 with source, renamed and typed, no logic
  stg_salesforce__opportunity
  stg_salesforce__opportunity_history
  stg_salesforce__user

intermediate/     one concept per model, defined exactly once
  int_opportunity__stage_transitions
  int_opportunity__qualified          ← the ONLY definition
  int_opportunity__committed          ← the ONLY definition

marts/            what consumers read
  fct_pipeline_snapshot
  fct_forecast_accuracy
  dim_territory
\`\`\`

The rule that matters: **a concept is defined in exactly one intermediate model.** "Qualified" is \`int_opportunity__qualified\` and nothing else may define it. A report wanting a different definition adds a named model — \`int_opportunity__qualified_strict\` — so the divergence is visible in the DAG rather than buried at line 502.

## Contracts
\`\`\`yaml
models:
  - name: fct_pipeline_snapshot
    contract: {enforced: true}
    columns:
      - {name: opportunity_id, data_type: varchar, constraints: [not_null, unique]}
      - {name: stage_name, data_type: varchar, constraints: [not_null]}
      - {name: is_committed, data_type: boolean, constraints: [not_null]}
      - {name: close_date, data_type: date, constraints: [not_null]}
    tests:
      - freshness: {warn_after: 6h, error_after: 12h}
      - volume: {expect_within_pct: 15, of: trailing_7d_avg}
      - accepted_values:
          column: stage_name
          values: [Prospecting, Discovery, Qualified, Commit, Closed Won, Closed Lost]
          # ← this is the test that would have fired in week 2
\`\`\`

## The one that would have caught it
\`accepted_values\` on \`stage_name\`. When the stage set changed, the pipeline would have failed within one run — loudly, to an owner — instead of continuing to compute a number whose meaning had shifted underneath it.

**Six weeks of a wrong forecast was not a data-quality failure.** It was the absence of any assertion about what the data was supposed to look like.`,
    },
    {
      id: "signal",
      label: "Signal verification — the metric answers a different question",
      kind: "eval.md",
      body:
`## Adversarial verification — "committed pipeline"
**Question it exists to answer:** *how much revenue can we count on closing this quarter?*
**Verdict:** it does not answer that question

## What it computes
\`\`\`sql
sum(amount) where stage_name = 'Commit'
\`\`\`

## What that includes
| Population | Opportunities | Amount | Should it count? |
| --- | --- | --- | --- |
| Commit, close date this quarter, touched < 14d | 218 | $14.2M | Yes |
| Commit, close date this quarter, **untouched 40d+** | 44 | $2.1M | Doubtful |
| Commit, **close date already passed** | 61 | **$1.9M** | **No** |
| Commit, close date next quarter | 29 | $1.3M | No — not this quarter |
| **Reported total** | **352** | **$19.5M** | |
| **Defensible total** | **218** | **$14.2M** | |

**$1.9M — 9.7% — is opportunities committed to a quarter that has already ended.** Nobody moved them; the metric has no opinion about close dates, so they roll forward forever accumulating.

Add the untouched and next-quarter populations and **27% of the committed number is not answering the question the metric is named for.**

## Why nobody noticed
The number moved plausibly. It went up when reps committed deals and down when deals closed. It correlated with activity, so it looked responsive — and a metric that moves in the right direction is much harder to distrust than one that is obviously stuck.

## The adversarial pass
The check was not "is the SQL correct." It is correct. The check was: **construct an input where this metric is high and the answer to its question is low.** That input is trivially available — 61 stale opportunities did it in production, unprompted.

## Redefinition
\`\`\`sql
-- int_opportunity__committed
stage_name = 'Commit'
  and close_date between current_quarter_start and current_quarter_end
  and last_activity_date >= current_date - 21
\`\`\`

Plus a second published metric, **\`committed_stale\`**, so the 44 doubtful opportunities are visible rather than silently excluded. Dropping them from the headline without surfacing them elsewhere would replace one wrong number with a different wrong number.

## Backfill
Recomputed against the missed quarter. The corrected metric read **$14.9M at week 6 against a $17.3M target** — visibly short, six weeks before the board saw it.`,
    },
    {
      id: "ia",
      label: "Three-layer view — what you see first",
      kind: "ia.md",
      body:
`## Pipeline view — information architecture
**Replaces:** 14 charts, 4 tabs, no hierarchy · **Principle:** one question per layer

## Layer 1 — is the quarter safe?
Four numbers, above the fold, nothing else:

\`\`\`
  COMMITTED (defensible)   $14.2M    ▼ $0.7M wk/wk
  TARGET                   $17.3M
  GAP                     −$3.1M     ← 18% short, 6 weeks out
  COVERAGE                    2.1×   (target 3.0×)
\`\`\`

The gap is a first-class number, not something a reader computes. Sixty percent of the old dashboard's problem was that the two figures you had to subtract were on different tabs.

## Layer 2 — where is the gap coming from?
Territory × stage, one table, sorted by contribution to the gap. Not a chart: the operation is "find the three that explain most of it", and a table is better at that than any visual encoding.

**\`committed_stale\` appears here** — the 44 doubtful opportunities, named, with owner and days-untouched. The number excluded from layer 1 is the first actionable list in layer 2, which is the whole reason for excluding rather than deleting it.

## Layer 3 — what is happening to individual deals
Stage transitions, ageing, activity. Reached by drilling, never on the landing view.

## What was cut, and why
| Removed | Reason |
| --- | --- |
| Win-rate-by-source donut | Not a quarter-safety question. Belongs in a quarterly review. |
| Rep leaderboard | Behaviour-shaping and unrelated to forecast integrity |
| 90-day trend on 6 metrics | Six sparklines competing to be the signal; none was |
| "Total pipeline" headline | The number everyone quoted and nobody could act on |

Removing "total pipeline" was the contested one. It is the biggest number available and it answers no question anyone asks — it is a vanity figure that made the dashboard feel healthy. It survives in layer 3 with its definition attached.

## Design evaluator
| Criterion | Before | After |
| --- | --- | --- |
| Visual hierarchy | 3/10 | 9/10 |
| State completeness | 4/10 | 8/10 — stale, loading, empty all designed |
| Consistency | 5/10 | 9/10 |
| Accessibility | 4/10 | 8/10 — gap no longer conveyed by colour alone |

The accessibility fix is not incidental. The old view signalled "behind" with red text only; the new one leads with a signed number and a word.`,
    },
    {
      id: "alerts",
      label: "Monitoring on the contract, not the chart",
      kind: "config.yaml",
      body:
`## Alerting — data contract, not dashboard threshold

## The distinction
A dashboard threshold alerts when a number looks wrong. A contract alerts when the number **stops meaning what it meant** — which is the failure that cost this quarter, and which no threshold would have caught, because the wrong number looked entirely reasonable.

\`\`\`yaml
alerts:
  # 1. Schema — the one that would have fired in week 2
  - name: stage_vocabulary_changed
    on: accepted_values(fct_pipeline_snapshot.stage_name)
    severity: critical
    notify: [data-oncall, revops-lead]
    message: >
      Opportunity stage set no longer matches the contract. Every downstream
      definition of committed/qualified is suspect until reviewed.

  # 2. Freshness
  - name: pipeline_snapshot_stale
    on: freshness(fct_pipeline_snapshot)
    error_after: 12h
    severity: high

  # 3. Volume
  - name: opportunity_volume_anomaly
    on: volume(stg_salesforce__opportunity)
    expect_within_pct: 15
    of: trailing_7d_avg
    severity: medium

  # 4. Semantic drift — the subtle one
  - name: committed_stale_ratio
    on: committed_stale / committed_defensible
    above: 0.20
    severity: medium
    message: >
      A fifth of committed pipeline is untouched or past close date. The
      headline is still correct; the hygiene behind it is degrading.
\`\`\`

## Alert 4 is the interesting one
Alerts 1–3 are standard data-quality checks. Alert 4 watches a **ratio between two metrics** and fires when the relationship drifts, even though both numbers remain individually valid.

The stale ratio was climbing for two quarters before the miss. It was visible to anyone who computed it and nobody computed it, because it was not a number anyone had thought to name.

## What is deliberately not alerted
**Committed pipeline falling.** That is the business, not an incident, and paging someone about it trains the team to ignore the channel. The alerts fire when the *measurement* is untrustworthy — the number being bad is a meeting, not a page.`,
    },
  ],
  steps: [
    {
      type: "beat",
      label: "Why the number was wrong",
      caption: "a definition changed and nothing noticed",
      skills: ["oc-data-ops"],
      phase: "discover",
    },
    {
      type: "exchange", role: "user",
      content:
`We missed the quarter by 14% and the forecast read healthy the whole way. Turns out the stage definitions changed in week 2 — Commit now needs a signed mutual action plan — and that never made it into the warehouse. The board wants to know why they saw it before we did.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-data-ops",
      content:
`Because nothing in the pipeline had an opinion about what the data was supposed to look like. Reading the model now — and the stage change is the trigger rather than the root cause.

The root cause is \`vw_pipeline_summary\`: 900 lines, reads Salesforce directly, and contains **four different definitions of "qualified"**:

| Line | Definition |
| --- | --- |
| 61 | \`stage_name NOT IN ('Prospecting','Discovery')\` |
| 244 | \`is_qualified__c = TRUE\` |
| 502 | \`amount > 25000 AND has_champion__c = TRUE\` |
| 771 | \`stage_order >= 3\` |

Four numbers for one word, and which one a report shows depends on which CTE it selected from. Nobody chose that; it accreted across three analysts over two years.

## The layering
Staging is 1:1 with source, no logic. Intermediate defines each concept **exactly once** — \`int_opportunity__qualified\` and nothing else may define it. A report needing a different rule adds a *named* model, so the divergence appears in the DAG instead of at line 502.

## The contract line that matters
\`\`\`yaml
- accepted_values:
    column: stage_name
    values: [Prospecting, Discovery, Qualified, Commit, Closed Won, Closed Lost]
\`\`\`

When the stage set changed in week 2, that test fails on the next run — loudly, to a named owner. Six weeks of a wrong forecast was not a data-quality failure. **It was the absence of any assertion at all.**`,
      artifacts: ["layering"],
    },
    {
      type: "beat",
      label: "Verify the metric answers its question",
      caption: "before anything consumes it",
      skills: ["oc-signal-forge"],
      phase: "build",
    },
    {
      type: "exchange", role: "user",
      content: `Good. Rebuild committed pipeline on top of that and I'll take it to the board.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-signal-forge",
      content:
`Before wiring it to anything — the metric does not answer the question it is named for, and that is independent of the stage change.

**Question:** how much revenue can we count on closing this quarter?
**Computation:** \`sum(amount) where stage_name = 'Commit'\`

| Population | Opps | Amount | Counts? |
| --- | --- | --- | --- |
| Commit, closes this quarter, touched <14d | 218 | $14.2M | Yes |
| Commit, **untouched 40d+** | 44 | $2.1M | Doubtful |
| Commit, **close date already passed** | 61 | **$1.9M** | **No** |
| Commit, closes next quarter | 29 | $1.3M | No |
| **Reported** | 352 | **$19.5M** | |
| **Defensible** | 218 | **$14.2M** | |

**$1.9M is committed to a quarter that already ended.** Nobody moved them; the metric has no opinion about close dates, so they roll forward forever. All in, **27% of the number is not answering its own question.**

## Why nobody distrusted it
It moved plausibly — up when reps committed, down when deals closed. A metric that correlates with activity looks responsive, and responsive is much harder to doubt than obviously stuck.

## The check I ran
Not "is the SQL correct" — it is correct. The check was: **construct an input where this metric is high and the true answer is low.** Production supplied it unprompted, 61 times.

## Backfilled against the missed quarter
The corrected metric read **$14.9M against a $17.3M target at week 6.** Visibly short, six weeks before the board saw it.

I am also publishing \`committed_stale\` separately, so the 44 doubtful opportunities are visible rather than silently dropped — excluding them from the headline without surfacing them elsewhere just makes a different wrong number.`,
      artifacts: ["signal"],
    },
    {
      type: "exchange", role: "user",
      content: `That's the finding, then. Rebuild the dashboard around it.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-dash-forge",
      content:
`Three layers, one question each.

## Layer 1 — is the quarter safe?
\`\`\`
  COMMITTED (defensible)   $14.2M    ▼ $0.7M wk/wk
  TARGET                   $17.3M
  GAP                     −$3.1M     ← 18% short, 6 weeks out
  COVERAGE                    2.1×   (target 3.0×)
\`\`\`

**Gap is a first-class number.** Most of the old dashboard's problem was that the two figures you had to subtract lived on different tabs.

## Layer 2 — where is the gap
Territory × stage, one table, sorted by contribution to the gap. Not a chart — the operation is "find the three rows that explain most of it", and a table beats any visual encoding at that.

\`committed_stale\` lives here: the 44 doubtful opportunities with owner and days-untouched. **The number excluded from layer 1 becomes the first actionable list in layer 2**, which is the entire reason for excluding rather than deleting.

## Layer 3 — individual deals
Transitions, ageing, activity. Reached by drilling.

## Cut
Win-rate donut, rep leaderboard, six competing sparklines — and **"total pipeline"**, which will be the contested one. It is the biggest number on the page, everyone quotes it, and it answers no question anyone asks. It made the dashboard feel healthy. It survives in layer 3 with its definition attached.`,
      artifacts: ["ia"],
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-ux-engineer",
      content:
`Graded before and after:

| Criterion | Before | After |
| --- | --- | --- |
| Visual hierarchy | 3/10 | 9/10 |
| State completeness | 4/10 | 8/10 |
| Consistency | 5/10 | 9/10 |
| Accessibility | 4/10 | 8/10 |

Two notes worth keeping rather than filing.

**States.** The old view had no stale state — when the pipeline failed to refresh it showed yesterday's numbers with today's timestamp. Given the failure that started all this, a dashboard that cannot say "this data is old" is the same class of problem in a different layer. The new view has designed stale, loading and empty states.

**Accessibility.** "Behind" was signalled with red text alone. It now leads with a signed number and a word, so the most important state on the page is not conveyed by colour to a reader who cannot distinguish it.`,
    },
    {
      type: "beat",
      label: "Alert on the contract",
      caption: "not on the number being bad",
      skills: ["oc-monitoring-ops"],
      phase: "monitor",
    },
    {
      type: "exchange", role: "user",
      content: `Last thing — I want to be told if this happens again.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-monitoring-ops",
      content:
`Alerting on the contract rather than the chart. The distinction matters: a threshold fires when a number looks wrong; a contract fires when the number **stops meaning what it meant**. The wrong forecast looked entirely reasonable, so no threshold would have caught it.

| # | Alert | Fires when |
| --- | --- | --- |
| 1 | \`stage_vocabulary_changed\` | The stage set no longer matches the contract — **this is the week-2 alert** |
| 2 | \`pipeline_snapshot_stale\` | No refresh in 12h |
| 3 | \`opportunity_volume_anomaly\` | Row count outside 15% of trailing average |
| 4 | \`committed_stale_ratio\` | Stale/defensible exceeds 0.20 |

**Alert 4 is the subtle one.** It watches a ratio between two metrics and fires when the relationship drifts, even though both numbers stay individually valid. That ratio had been climbing for two quarters before the miss — visible to anyone who computed it, and nobody computed it, because it was not a number anyone had named.

## Deliberately not alerted
**Committed pipeline falling.** That is the business, not an incident. Paging someone about it teaches the team to ignore the channel, and then alert 1 fires into a muted room. The alerts fire when the *measurement* is untrustworthy; the number being bad is a meeting.`,
      artifacts: ["alerts"],
    },
  ],
};
