import type { Walkthrough } from "./types";

/**
 * Mandate: AI evaluation and quality standards — four captured requisitions,
 * one of them unusually explicit about the deliverable ("the role produces
 * evaluation memos", tracking system performance, adoption, outcomes, equity).
 *
 * Covers oc-rag-forge building the retrieval goldset, oc-prompt-ops turning it
 * into a regression suite, oc-qa-ops writing the standard down, oc-monitoring-ops
 * carrying it into production, and oc-compliance-ops mapping it to the controls
 * an auditor asks for — including the equity metric most eval demos skip.
 */
export const cascadiaAiEvaluation: Walkthrough = {
  id: "cascadia-ai-evaluation",
  title: "Prove the assistant is right, and keep proving it",
  tagline: "An evaluation function, not an eval run",
  summary:
    "A clinical-policy assistant is live and a governance board wants to know whether it is safe to keep it live. The scenario builds the standing evaluation function the requisition actually describes — goldset, regression suite, production monitoring, evaluation memo — and finds a subgroup gap the aggregate score hides.",
  description:
`Cascadia Health runs a retrieval assistant over 4,000 clinical policy documents. It has been live for five months, staff like it, and nobody can answer the board's question: how do we know it is right?

The scenario builds the function rather than running an evaluation. \`oc-rag-forge\` constructs a 200-query goldset from real queries with clinician-reviewed expected sources, and the first honest number is worse than the anecdotes — recall@5 of 0.79 against a floor the board would have assumed was 1.0.

\`oc-prompt-ops\` turns the goldset into a regression suite that runs on every change, and \`oc-qa-ops\` writes the standard down as a manifest so "what good looks like" survives the person who defined it.

The finding that matters is one the aggregate hides. Broken out by service line, retrieval is strong on medical and surgical policy and **weak on behavioural health** — 0.61 against 0.84 elsewhere — because behavioural-health policies use different vocabulary for the same concepts and the chunking strategy split them badly. An aggregate score of 0.79 is a passing grade that conceals a service line being materially worse served, which is exactly why the requisition names equity as a tracked metric family alongside performance.

\`oc-monitoring-ops\` then watches for drift in production, and \`oc-compliance-ops\` maps the whole thing to the controls an auditor will ask for.`,
  inputs: [
    "A retrieval assistant live for five months over 4,000 clinical policy documents",
    "Positive staff feedback and no measurement of any kind",
    "A governance board asking whether it is safe to continue",
    "Clinician time available to review expected answers, but not unlimited",
    "A requirement to report on performance, adoption, outcomes and equity",
  ],
  skills: [
    "oc-rag-forge",
    "oc-prompt-ops",
    "oc-qa-ops",
    "oc-monitoring-ops",
    "oc-compliance-ops",
  ],
  runtime: "16 exchanges",
  outputs: [
    {
      id: "goldset",
      label: "Retrieval goldset — 200 real queries, clinician-reviewed",
      kind: "goldset.jsonl",
      body:
`## Retrieval goldset v1
**Size:** 200 queries · **Source:** sampled from 5 months of real query logs · **Review:** 3 clinicians, 14 hours

## How the sample was drawn
Not the top 200 queries. Stratified, deliberately:

| Stratum | Queries | Why |
| --- | --- | --- |
| Head — most frequent | 60 | What most people ask most often |
| Mid-frequency | 60 | Where breadth lives |
| Tail — asked once | 40 | The long tail is where retrieval usually fails |
| **Known-hard** | 20 | Queries staff reported as unhelpful |
| **Adversarial** | 20 | Ambiguous, out-of-scope, or with a policy conflict |

A goldset drawn from the head measures the easy case and reports it as the system's quality. The tail and the known-hard strata are the ones that move the number, and they are the reason this took 14 clinician-hours rather than 2.

## What "correct" means here
Each query carries the **set of policy documents a clinician would expect to see**, not a single right answer. Retrieval is graded on whether the expected sources appear in the top-k, because a correct-sounding answer from the wrong policy is the failure mode that matters in this domain.

\`\`\`jsonl
{"q":"restraint documentation requirements for a voluntary admission",
 "expect":["POL-BH-0412","POL-BH-0418"],"stratum":"known-hard","service_line":"behavioural"}
{"q":"how long do we keep operative notes",
 "expect":["POL-HIM-0031"],"stratum":"head","service_line":"surgical"}
{"q":"can a resident countersign a discharge summary",
 "expect":["POL-MED-0207","POL-GME-0044"],"stratum":"mid","service_line":"medical"}
{"q":"what's the policy on parking",
 "expect":[],"stratum":"adversarial","note":"out of scope — correct behaviour is to decline"}
{"q":"seclusion time limits for a minor",
 "expect":["POL-BH-0431","POL-BH-0409","POL-PED-0117"],"stratum":"known-hard","service_line":"behavioural"}
\`\`\`

## Baseline
| Metric | Result | Note |
| --- | --- | --- |
| recall@5 | **0.79** | The board would have assumed ~1.0 |
| MRR | 0.68 | |
| Out-of-scope declined correctly | 17/20 | 3 answered a parking question from a facilities policy |
| Head stratum recall@5 | 0.91 | |
| Tail stratum recall@5 | **0.64** | |

The gap between 0.91 and 0.64 is the gap between the anecdotes and the system. Staff praise is real and it is drawn from the head.`,
    },
    {
      id: "equity",
      label: "Subgroup breakdown — the gap the aggregate hides",
      kind: "eval.md",
      body:
`## Retrieval by service line
**Aggregate recall@5: 0.79.** Broken out, it is two different systems.

| Service line | Queries | recall@5 | MRR | Docs in corpus |
| --- | --- | --- | --- | --- |
| Surgical | 44 | 0.86 | 0.74 | 980 |
| Medical | 61 | 0.84 | 0.72 | 1,410 |
| Perioperative | 22 | 0.83 | 0.71 | 520 |
| Pharmacy | 19 | 0.81 | 0.69 | 390 |
| **Behavioural health** | **38** | **0.61** | **0.48** | **610** |
| Paediatrics | 16 | 0.79 | 0.66 | 290 |

## Why behavioural health is worse
Not corpus size — pharmacy has 390 documents and scores 0.81. Three causes, in order of contribution:

1. **Vocabulary mismatch (est. 60% of the gap).** Behavioural-health policies say "therapeutic hold", clinicians search "restraint". Embeddings put those further apart than the domain does. The other service lines have far less divergence between policy language and practitioner language.
2. **Chunking splits the operative content (est. 30%).** BH policies put conditions in long nested lists — time limits by age, by admission status, by order type. Fixed-size chunking splits the list from its heading, so the chunk that matches "seclusion" no longer contains "under 18".
3. **Cross-references (est. 10%).** BH policies reference paediatric and pharmacy policies more than any other line. A query needing two documents from two lines retrieves one.

## Why this is the finding and not a footnote
An aggregate of 0.79 reads as "needs work, broadly fine." It is not broadly anything. **One service line is materially worse served than the others**, its clinicians are the ones who reported the assistant as unhelpful, and the aggregate absorbed their experience into an average.

The requisition asks for equity as a tracked metric family next to performance. This is what that means operationally: **a system-level score that is not broken out by the populations it serves cannot detect the thing you are tracking equity to detect.**

## Fixes and measured effect
| Change | BH recall@5 | Aggregate |
| --- | --- | --- |
| Baseline | 0.61 | 0.79 |
| + synonym expansion from a BH-specific term map | 0.74 | 0.83 |
| + heading-aware chunking (keeps lists with their headings) | 0.86 | 0.88 |
| + cross-reference following, depth 1 | 0.89 | 0.90 |

Heading-aware chunking helped every service line. It was only *findable* by breaking out the one where it hurt most.`,
    },
    {
      id: "manifest",
      label: "The standard, written down — qa.yaml",
      kind: "config.yaml",
      body:
`## .opchain/qa.yaml — evaluation standard
**Purpose:** so "what good looks like" survives the person who defined it

\`\`\`yaml
version: 1
evaluation:
  goldset: prompts/clinical-retrieval/goldset.jsonl
  review_cadence: quarterly
  reviewers: [clinical-informatics, quality]

  floors:
    aggregate:
      recall_at_5: 0.85
      mrr: 0.70
      out_of_scope_declined: 0.95

    # Every service line must clear the subgroup floor independently.
    # An aggregate that passes while a subgroup fails is a FAIL — that is
    # the whole point of having this section.
    per_subgroup:
      dimension: service_line
      min_queries: 15        # below this, report but do not gate
      recall_at_5: 0.80
      max_gap_from_best: 0.10

  strata:
    # A goldset drawn from the head measures the easy case. These
    # proportions are a floor on difficulty, not a sampling convenience.
    head: {min: 0.25, max: 0.35}
    mid: {min: 0.25, max: 0.35}
    tail: {min: 0.15}
    known_hard: {min: 0.08}
    adversarial: {min: 0.08}

  regression:
    run_on: [prompt_change, chunking_change, model_change, corpus_reindex]
    blocks_release: true
    epsilon: 0.02          # noise band; below this a delta is not a signal

monitoring:
  production:
    drift_check: weekly
    alert_on:
      - metric: recall_at_5_sampled
        below: 0.82
      - metric: subgroup_gap
        above: 0.12
      - metric: declined_rate
        change_gt: 0.05    # a sudden change either way is a signal
\`\`\`

## The two lines that do the work
**\`per_subgroup\`** — without it, the fix that raised behavioural health from 0.61 to 0.89 would never have been prioritised, because the aggregate was already respectable.

**\`max_gap_from_best\`** — a subgroup floor alone permits every line drifting down together. The gap constraint catches the case where the system gets uniformly worse and each line still clears its own bar.

## What this is not
It is not a quality guarantee. It is a stated standard with a number attached, which is the difference between "we evaluate our AI" and a thing an auditor can test.`,
    },
    {
      id: "memo",
      label: "Evaluation memo for the governance board",
      kind: "report.md",
      body:
`## Evaluation memo — clinical policy assistant
**To:** AI Governance Board · **From:** Director, AI Evaluation · **Period:** first formal evaluation
**Recommendation:** continue, with conditions

## Answer to the board's question
The assistant retrieves the correct policy in the top five results **90% of the time** after this quarter's fixes, up from 79% when measured. It was in production for five months before anyone measured it, and the pre-fix figure for behavioural health was 61%.

## Four metric families
### 1 · System performance
| Metric | Baseline | Now | Floor |
| --- | --- | --- | --- |
| recall@5 | 0.79 | **0.90** | 0.85 |
| MRR | 0.68 | 0.81 | 0.70 |
| Out-of-scope declined | 0.85 | **0.95** | 0.95 |

### 2 · Adoption
| Metric | Value |
| --- | --- |
| Distinct users, 30d | 1,180 of ~2,400 eligible |
| Queries/user/week (median) | 3.1 |
| Behavioural-health users, 30d | **94 of ~310 eligible** |

BH adoption is a third of the rate elsewhere. That is consistent with the retrieval gap, and it is the number to re-measure next quarter now the gap is closed — **if adoption does not recover, the cause was not only retrieval.**

### 3 · Clinical outcomes
**Not measured, and not claimed.** No causal link has been established between assistant use and any clinical outcome, and this memo does not assert one. Establishing that requires a study design the evaluation function does not currently have. Named here as a gap rather than left as an implied benefit.

### 4 · Equity
| Service line | recall@5 | Gap from best |
| --- | --- | --- |
| Surgical | 0.92 | — |
| Medical | 0.91 | 0.01 |
| **Behavioural health** | **0.89** | **0.03** |
| Paediatrics | 0.88 | 0.04 |

Pre-fix the gap was 0.25. It is now 0.03 and inside the 0.10 standard.

## Conditions on continuing
1. **Quarterly re-evaluation** against the goldset, subgroup breakout mandatory.
2. **Regression gate on every change** to prompt, chunking, model or corpus.
3. **Report BH adoption next quarter.** If it has not recovered, retrieval was not the whole story.
4. **No outcome claims** until a study design exists.

## What went wrong that is worth recording
The assistant ran for five months with no measurement and positive feedback throughout. The feedback was real, and it came from the head of the query distribution. **Anecdote is drawn from the easy case by construction** — the people whose queries fail tend to stop asking rather than complain.`,
    },
    {
      id: "controls",
      label: "Control mapping and evidence bundle",
      kind: "compliance.md",
      body:
`## Control mapping — AI evaluation function
**Frameworks:** internal AI governance policy · HIPAA (§164.308 administrative safeguards) · SOC 2 CC3/CC4
**Purpose:** map what we do to what an auditor asks for, and emit the evidence automatically

| Control | Question an auditor asks | Artifact | Emitted |
| --- | --- | --- | --- |
| AI-01 | How do you know the system performs? | \`goldset.jsonl\` + latest eval run | every run |
| AI-02 | What is your quality standard? | \`.opchain/qa.yaml\` | on change |
| AI-03 | Who approved deployment? | Board memo + decision record | quarterly |
| AI-04 | How do you detect degradation? | Weekly drift report, alert config | weekly |
| AI-05 | Do you evaluate across populations? | Subgroup breakout, gap metric | every run |
| AI-06 | What happens on regression? | Gate config + blocked-release log | on trigger |
| CC4.1 | Ongoing monitoring | Drift reports, 13-week retention | weekly |
| §164.308(a)(1)(ii)(D) | Information system activity review | Query-volume + access review | monthly |

## The evidence bundle
Generated at each quarterly evaluation, not assembled the week before an audit:

\`\`\`
evidence/2026-Q3-clinical-assistant/
  eval-run.json            metrics, per-subgroup, timestamped
  goldset.jsonl            the exact set scored, content-hashed
  qa.yaml                  the standard in force at run time
  drift-reports/           13 weekly reports
  blocked-releases.log     2 changes blocked by the gate this quarter
  board-memo.md            the recommendation and its conditions
  reviewers.json           who reviewed the goldset, when
\`\`\`

## Why content-hash the goldset
An evaluation is only meaningful against a known set. Hashing it in the evidence bundle means a later reader can prove the standard was not adjusted to fit the result — which is the failure mode an auditor is actually probing when they ask how you know the system performs.

## Two blocked releases this quarter
| Change | Effect | Verdict |
| --- | --- | --- |
| Chunk size 512 → 1024 | Aggregate +0.01, **BH −0.07** | **Blocked** — subgroup floor |
| Model swap | Aggregate −0.03 | **Blocked** — aggregate floor |

The first is the one worth showing a board. It improved the headline number and made one service line worse, and it was stopped by a rule written down before anyone knew that change was coming.

## Not claimed
This is readiness and evidence, not certification. No statement here asserts compliance with any framework — it asserts that the artifacts an assessment would request exist and are current.`,
    },
  ],
  steps: [
    {
      type: "beat",
      label: "Measure what is already live",
      caption: "five months, no numbers",
      skills: ["oc-rag-forge"],
      phase: "discover",
    },
    {
      type: "exchange", role: "user",
      content:
`Our clinical policy assistant has been live five months. Staff like it. The governance board wants to know whether it's safe to keep running and I have nothing to give them — no metrics, no baseline, nothing. Where do I start?`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-rag-forge",
      content:
`With a goldset, and with a warning about how it gets sampled — because the easy version of this produces a reassuring number that is not about your system.

**Not the top 200 queries.** Stratified:

| Stratum | Queries | Why |
| --- | --- | --- |
| Head | 60 | What most people ask most |
| Mid | 60 | Where breadth lives |
| Tail | 40 | Where retrieval usually fails |
| Known-hard | 20 | Queries staff called unhelpful |
| Adversarial | 20 | Ambiguous, out-of-scope, conflicting |

A goldset drawn from the head measures the easy case and reports it as system quality. That is why this cost 14 clinician-hours instead of two.

Correctness here is **the set of policy documents a clinician would expect**, not a single answer — a plausible answer from the wrong policy is the failure mode that matters in this domain.

## Baseline
| Metric | Result |
| --- | --- |
| recall@5 | **0.79** |
| MRR | 0.68 |
| Out-of-scope declined correctly | 17/20 |
| Head stratum | 0.91 |
| **Tail stratum** | **0.64** |

The board would have assumed something near 1.0. And the 0.91-versus-0.64 split is the distance between the anecdotes and the system — the praise is genuine and it comes from the head.`,
      artifacts: ["goldset"],
    },
    {
      type: "exchange", role: "user",
      content: `0.79 is worse than I expected but it's a number. Is that the report?`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-rag-forge",
      content:
`No — the aggregate is hiding the actual finding. Broken out by service line it is two different systems.

| Service line | Queries | recall@5 |
| --- | --- | --- |
| Surgical | 44 | 0.86 |
| Medical | 61 | 0.84 |
| Perioperative | 22 | 0.83 |
| Pharmacy | 19 | 0.81 |
| **Behavioural health** | **38** | **0.61** |
| Paediatrics | 16 | 0.79 |

## Why behavioural health
Not corpus size — pharmacy has fewer documents and scores 0.81.

1. **Vocabulary (≈60% of the gap).** BH policies say "therapeutic hold"; clinicians search "restraint". The embedding puts those further apart than the domain does. The other lines have much less divergence between policy language and practitioner language.
2. **Chunking (≈30%).** BH policies express conditions as long nested lists — limits by age, by admission status, by order type. Fixed-size chunks split the list from its heading, so the chunk matching "seclusion" no longer contains "under 18".
3. **Cross-references (≈10%).** BH cites paediatric and pharmacy policies more than any other line; a query needing two documents from two lines gets one.

## Why this is the report
0.79 reads as "needs work, broadly fine." It is not broadly anything. **One service line is materially worse served, its clinicians are the ones who called the assistant unhelpful, and the average absorbed them.**

Your board asked for equity as a tracked family. Operationally that means a score not broken out by the populations it serves cannot detect the thing you track equity to detect.`,
      artifacts: ["equity"],
    },
    {
      type: "beat",
      label: "Fix it, then make the standard survive you",
      caption: "a manifest, not a memory",
      skills: ["oc-prompt-ops", "oc-qa-ops"],
      phase: "build",
    },
    {
      type: "exchange", role: "user",
      content: `Fix the BH gap and make sure this can't silently come back.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-prompt-ops",
      content:
`Three changes, measured independently:

| Change | BH recall@5 | Aggregate |
| --- | --- | --- |
| Baseline | 0.61 | 0.79 |
| + synonym expansion, BH term map | 0.74 | 0.83 |
| + heading-aware chunking | 0.86 | 0.88 |
| + cross-reference following, depth 1 | **0.89** | **0.90** |

**Heading-aware chunking helped every service line**, not just BH. It was findable only by breaking out the line where it hurt most — which is a general argument for subgroup reporting rather than a BH-specific one.

The goldset is now a regression suite: it runs on any change to prompt, chunking, model or corpus reindex, and a drop below floor blocks the change. Epsilon is 0.02, so a delta inside the noise band is not treated as a signal in either direction.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-qa-ops",
      content:
`And the standard goes in \`.opchain/qa.yaml\` so it outlives whoever defined it. Two sections do the real work:

\`\`\`yaml
  floors:
    aggregate:
      recall_at_5: 0.85
    per_subgroup:
      dimension: service_line
      min_queries: 15
      recall_at_5: 0.80
      max_gap_from_best: 0.10
\`\`\`

**\`per_subgroup\`** — without it, the change that took BH from 0.61 to 0.89 never gets prioritised, because the aggregate was already respectable.

**\`max_gap_from_best\`** — a subgroup floor alone permits every line drifting down together while each still clears its own bar. The gap constraint catches uniform decay.

The strata proportions are pinned too, so the next person cannot quietly resample toward the head and report an improvement.

This is not a quality guarantee. It is a stated standard with numbers, which is the difference between "we evaluate our AI" and something an auditor can test.`,
      artifacts: ["manifest"],
    },
    {
      type: "beat",
      label: "The memo, and what it will not claim",
      caption: "four metric families, one of them empty",
      skills: ["oc-monitoring-ops", "oc-compliance-ops"],
      phase: "audit",
    },
    {
      type: "exchange", role: "user",
      content: `Write the board memo. They'll want to know it improves care.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-monitoring-ops",
      content:
`The memo will not say that, and I would make the refusal explicit rather than let the omission read as an oversight.

## Four metric families
**System performance** — recall@5 0.79 → **0.90**, out-of-scope declines 0.85 → 0.95, both above floor.

**Adoption** — 1,180 of ~2,400 eligible users in 30 days. BH is **94 of ~310** — a third of the rate elsewhere, consistent with the retrieval gap. That is the number to re-measure next quarter: if adoption does not recover now the gap is closed, retrieval was not the whole story.

**Clinical outcomes** — *not measured, and not claimed.* No causal link between assistant use and any clinical outcome has been established. Establishing one needs a study design the evaluation function does not have. It goes in the memo as a named gap, because an empty section reads as honest and a missing section reads as an implied benefit.

**Equity** — gap from best was 0.25, now **0.03**, inside the 0.10 standard.

## Production watch
Weekly drift sampling with alerts on aggregate recall below 0.82, subgroup gap above 0.12, and any decline-rate change over 5 points in either direction — a sudden change in what the system refuses is a signal whichever way it moves.

Four conditions on continuing, including reporting BH adoption next quarter and no outcome claims until there is a design.`,
      artifacts: ["memo"],
    },
    {
      type: "exchange", role: "user",
      content: `We have a HIPAA assessment in the spring. Will any of this help?`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-compliance-ops",
      content:
`Most of it, if the evidence is emitted as you go rather than assembled the week before.

| Control | What they ask | Artifact |
| --- | --- | --- |
| AI-01 | How do you know it performs? | goldset + eval run |
| AI-02 | What is your standard? | \`qa.yaml\` |
| AI-05 | Do you evaluate across populations? | subgroup breakout |
| AI-06 | What happens on regression? | gate config + blocked-release log |
| CC4.1 | Ongoing monitoring | 13 weekly drift reports |
| §164.308(a)(1)(ii)(D) | Activity review | query volume + access review |

The bundle generates at each quarterly evaluation. One detail worth keeping: **the goldset is content-hashed in the bundle**, so a later reader can prove the standard was not adjusted to fit the result. That is what an assessor is really probing when they ask how you know it performs.

## The exhibit to lead with
Two releases were blocked this quarter:

| Change | Effect | Verdict |
| --- | --- | --- |
| Chunk size 512 → 1024 | Aggregate **+0.01**, BH **−0.07** | Blocked — subgroup floor |
| Model swap | Aggregate −0.03 | Blocked — aggregate floor |

The first improved the headline and made one service line worse, and it was stopped by a rule written before anyone knew that change was coming. A control that has visibly refused something is worth more in an assessment than a policy document that has only ever agreed.

To be clear about what this is: readiness and evidence, not certification. Nothing here asserts compliance — it asserts the artifacts an assessment requests exist and are current.`,
      artifacts: ["controls"],
    },
  ],
};
