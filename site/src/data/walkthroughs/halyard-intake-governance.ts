import type { Walkthrough } from "./types";

/**
 * Forty requests, six engineers, one quarter
 *
 * Mandate: work intake, prioritization and roadmap governance — the scope that
 * nine of the captured requisitions open with. A new Director inherits 40 intake
 * tickets, six engineers, and a planning meeting on Thursday.
 *
 * Covers oc-orchestrator intake + ranking, oc-cost-ops capacity pricing, the full
 * oc-app-architect build arc, and the v1.8 quality rail end to end — oc-qa-ops,
 * oc-bug-check (blocks on a live token in a fixture), oc-docs-forge, oc-repo-ops
 * (blocks on generated drift), oc-deploy-ops, plus a checkpoint resume beat.
 */
export const halyardIntakeGovernance: Walkthrough = {
  id: "halyard-intake-governance",
  title: "Forty requests, six engineers, one quarter",
  tagline: "Intake governance, priced and defensible",
  summary: "A new Director of GTM Systems inherits an intake queue with no framework behind it and a planning meeting on Thursday. The scenario is the governance — dedupe, score, price, cut — and then taking the one initiative that survives all the way to production through the quality rail.",
  description:
`Halyard's GTM Systems team has 40 open intake requests filed over seven months, six engineers, and a quarterly planning session on Thursday. Last quarter it committed to nine things and delivered four. The new director needs something defensible to walk in with.

The scenario is the governance, not the code. \`oc-orchestrator\` normalizes 40 requests down to 25 actionable ones — nine were duplicates, four had already shipped and never been closed — then returns the nine that state no outcome rather than inventing value on the requester's behalf. A five-factor scoring model replaces value-over-effort, and a sensitivity run shows the top three are stable under every plausible weighting, which converts a debate about the director's judgment into a debate about a shared instrument.

\`oc-cost-ops\` prices the queue against real capacity — 46.5 deliverable weeks, not 78 — and the cut line lands at four commitments. When the CFO asks what AI-assisted delivery saves, the answer is that model spend is 0.4% of the budget and there is no defensible velocity multiplier on offer.

The winning initiative goes through the full build arc, and both gates fire. \`oc-bug-check\` blocks the commit over a live CRM session token that sat in a test fixture through three passing sprints; \`oc-repo-ops\` refuses the PR over generated-file drift and an undocumented predicate. The quarter closes with a readout that leads with what was cut and what did not move.`,
  inputs: [
    "A Jira intake project with 40 open requests, filed over 7 months by 5 departments",
    "Six engineers: 2 senior, 3 mid, 1 contractor rolling off in week 9",
    "A quarterly planning session on Thursday with the CRO, CFO and VP Marketing",
    "No existing prioritization framework — the current method is escalation volume",
    "Last quarter's commitments, 4 of 9 delivered",
  ],
  skills: [
    "oc-orchestrator",
    "oc-app-architect",
    "oc-ux-engineer",
    "oc-qa-ops",
    "oc-bug-check",
    "oc-git-ops",
    "oc-docs-forge",
    "oc-repo-ops",
    "oc-deploy-ops",
    "oc-cost-ops",
    "oc-checkpoint-protocol",
  ],
  runtime: "26 exchanges",
  outputs: [
    {
      id: "register",
      label: "Intake register — 40 requests, normalized and deduped",
      kind: "register.md",
      body:
`## Intake register — Q3 planning
**Source:** GTMSYS Jira project, 40 open issues as of Jun 28 · **Normalized:** Jun 30 · **Owner:** Director, GTM Systems

## What changed in normalization
| Step | Count | Note |
| --- | --- | --- |
| Raw open issues | 40 | as filed |
| Duplicates merged | −9 | 4 clusters; see below |
| Already delivered | −4 | shipped, never closed |
| Not GTM Systems | −2 | routed to Data Platform and IT Ops |
| **Distinct, actionable** | **25** | the real queue |

**Duplicate clusters merged**

- **Lead routing** — GTMSYS-88, -112, -119, -140 → one request. Filed four times by three people over five months; the repetition is the signal, not noise.
- **Quote approval visibility** — GTMSYS-95, -131 → one.
- **Attribution reporting** — GTMSYS-101, -122 → one.
- **Territory carve rules** — GTMSYS-134, -139 → one.

**Filed but already shipped:** GTMSYS-77 (Gong sync), -84 (opp stage validation), -91 (CS handoff alert), -108 (renewal task automation). All four were delivered in Q1–Q2 and never closed. Nobody told the requester, which is its own finding.

## The 25, by requesting function
| Function | Requests | Oldest | Median age |
| --- | --- | --- | --- |
| Sales / Sales Ops | 9 | 214 days | 96 days |
| Marketing | 6 | 187 days | 78 days |
| Customer Success | 5 | 156 days | 61 days |
| Finance | 3 | 142 days | 121 days |
| Partnerships | 2 | 98 days | 71 days |

## Fields added during normalization
Every request now carries five fields it did not have when filed. Four of the five were reconstructed by reading the ticket and its comments; where a value could not be established it is marked **unverified** rather than guessed.

- \`requested_outcome\` — what changes for a human if this ships (not the feature description)
- \`measurable\` — the metric that would move, or **none stated**
- \`blast_radius\` — systems and downstream consumers touched
- \`reversibility\` — can this be rolled back cleanly, and how fast
- \`sponsor\` — the person who will defend it at planning

**Nine of 25 have no stated measurable.** They are not scored below; they are returned to their sponsors with a one-line ask. A request that cannot name what it improves cannot be ranked against one that can, and inventing a metric on the requester's behalf is how a framework loses its authority in the first month.

## Returned for a measurable
GTMSYS-96, -103, -110, -117, -125, -128, -133, -141, -144.

Template sent to each sponsor:
\`\`\`
This will improve ______ from ______ to ______ by ______ (date).
If we do not do it, the cost is ______.
Reply with that line and it enters Q3 scoring. No reply by Jul 8 → deferred to Q4 intake.
\`\`\``,
    },
    {
      id: "scoring",
      label: "Prioritization framework — scoring model and tie-breaks",
      kind: "framework.md",
      body:
`## Prioritization framework v1
**Status:** proposed for Thursday's session · **Applies to:** all GTM Systems intake from Q3 forward

## Why not value ÷ effort
The default framework is value over effort. It is rejected here for three specific reasons, all of which have already bitten this team:

1. **It has no memory of blast radius.** A two-week change to opportunity stages touches forecast, comp, and three dashboards. A two-week change to a standalone report touches nothing. Value ÷ effort scores them identically.
2. **It cannot express reversibility.** The Q2 territory change could not be rolled back without re-running comp. That risk was invisible at planning and expensive in week 6.
3. **It launders political weight as value.** Whoever escalates hardest supplies the value number. Four of last quarter's nine commitments arrived that way, and those four are the ones that slipped.

## The model
Five factors, 0–5 each, weighted. Score is out of 100.

| Factor | Weight | 0 | 5 |
| --- | --- | --- | --- |
| **Measured impact** | 30 | No metric named | Named metric, current baseline captured, target committed by sponsor |
| **Reach** | 20 | One team, under 10 people | Every revenue-facing user, 400+ |
| **Blast radius** *(inverted)* | 20 | Touches forecast, comp or billing | Isolated, no downstream consumer |
| **Reversibility** *(inverted)* | 15 | Cannot be undone without a data migration | Flag-gated, off in under a minute |
| **Decay** | 15 | Nothing worsens if deferred a quarter | Actively compounding — cost grows weekly |

**Reach is deliberately weighted below impact.** A change touching 400 people that moves nothing is worth less than one touching 40 people that removes a measured four hours a week. Reach measures exposure, not value, and conflating them is how a roadmap fills with well-attended nothing.

## Tie-breaks, in order
1. **Decay** — the compounding one goes first; deferring it costs more than deferring its twin.
2. **Unblocks other work** — a request that is a dependency for two others outranks a leaf.
3. **Reversibility** — where two are otherwise equal, ship the one you can turn off.
4. **Oldest sponsor commitment** — last, and only last. Age is a fairness argument, not a value argument.

## What the model deliberately does not include
- **Requester seniority.** Not a factor. If a VP request is genuinely more valuable it will score higher on impact and reach; if it does not, the model has done its job.
- **Effort as a divisor.** Effort enters through the capacity plan, not the score. Ranking by value alone and then cutting at the capacity line keeps the two arguments separate — what matters most, and what fits.
- **Confidence.** Considered and rejected for v1: a confidence multiplier is where optimism re-enters. Revisit after two quarters of calibration data.

## Ranked — top 12 of 16 scored
| # | Request | Impact | Reach | Blast | Rev | Decay | **Score** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Lead routing rebuild | 5 | 4 | 3 | 4 | 5 | **86** |
| 2 | Quote approval parallelization | 5 | 3 | 2 | 3 | 4 | **73** |
| 3 | Duplicate account merge | 4 | 4 | 3 | 3 | 4 | **72** |
| 4 | Renewal risk field automation | 4 | 3 | 4 | 5 | 2 | **71** |
| 5 | Territory carve rules | 4 | 4 | 1 | 1 | 3 | **59** |
| 6 | Attribution reporting rebuild | 3 | 4 | 3 | 4 | 2 | **58** |
| 7 | CS health score sync | 3 | 3 | 4 | 4 | 2 | **57** |
| 8 | Partner deal registration | 4 | 2 | 3 | 4 | 3 | **56** |
| 9 | Commission statement export | 3 | 2 | 2 | 3 | 3 | **47** |
| 10 | Marketing form consolidation | 2 | 4 | 4 | 5 | 1 | **46** |
| 11 | Opportunity split UI | 2 | 3 | 3 | 4 | 1 | **41** |
| 12 | Contract clause library | 2 | 2 | 4 | 5 | 1 | **38** |

## Sensitivity
Weights were re-run across nine plausible alternatives, including the two the room is most likely to propose (impact at 40; reach at 30).

**The top three do not change under any of them.** Rank 4–7 reorder freely. That is the argument to make on Thursday: the model does not need to be agreed on to make the first three decisions, only to make the marginal ones — so adopt it provisionally, commit the top three now, and argue about weights next quarter with real calibration data.`,
    },
    {
      id: "capacity",
      label: "Q3 capacity plan — what fits and what does not",
      kind: "plan.md",
      body:
`## Q3 capacity plan
**Period:** Jul 7 – Oct 3 (13 weeks) · **Team:** 6

## Available engineering weeks
| Line | Weeks |
| --- | --- |
| 6 engineers × 13 weeks | 78.0 |
| Contractor rolls off week 9 *(−4 wks)* | −4.0 |
| On-call rotation, 1 engineer/wk | −13.0 |
| BAU: access requests, break-fix, audit support *(18% measured over Q2, not estimated)* | −11.0 |
| Holidays + PTO on the calendar today | −3.5 |
| **Net deliverable** | **46.5** |

Planning against 78 is the mistake that produced last quarter's 4-of-9. The team has **46.5 weeks**, and the last two of those land after the contractor is gone, so they cannot be spent on anything requiring two people.

## Estimated cost of the ranked queue
| # | Request | Eng weeks | Cumulative |
| --- | --- | --- | --- |
| 1 | Lead routing rebuild | 11.0 | 11.0 |
| 2 | Quote approval parallelization | 8.5 | 19.5 |
| 3 | Duplicate account merge | 7.0 | 26.5 |
| 4 | Renewal risk field automation | 4.5 | 31.0 |
| 5 | Territory carve rules | 9.0 | 40.0 |
| 6 | Attribution reporting rebuild | 12.0 | 52.0 |
| 7 | CS health score sync | 5.0 | 57.0 |
| 8 | Partner deal registration | 6.5 | 63.5 |

**The line falls between 4 and 5.** Items 1–4 total 31.0 weeks. Adding territory carve at 9.0 reaches 40.0 — inside 46.5 on paper, but it is the lowest-reversibility item in the top eight (score 1/5) and it lands in the same weeks the contractor leaves. Recommend committing 1–4 and holding 15.5 weeks against the two things that always arrive: an audit request and a re-org.

## What that means for the room
Four commitments, not nine. Each with a named sponsor, a baseline, and a target. The other 21 requests get a written disposition — committed, deferred with a date, or returned for a measurable — so nobody has to guess where their ticket went.

## Deferred, with reasons
| Request | Disposition | Why |
| --- | --- | --- |
| Territory carve rules | Q4, first slot | Lowest reversibility in the top eight; needs the contractor's replacement onboarded first |
| Attribution reporting rebuild | Q4 | 12 weeks is a quarter's worth of one engineer; belongs in a quarter where it is the headline, not the fifth item |
| CS health score sync | Q4 | Blocked on the Data Platform team's warehouse migration, which does not land until week 11 |
| Partner deal registration | Q1 | Sponsor confirmed the partner program itself is being redesigned; building against the current model would be thrown away |

## Cost view
Fully-loaded engineering cost is the dominant line; the pipeline's own model spend is rounding error but is included so the comparison is on the record rather than assumed.

| Initiative | Eng weeks | Eng cost | Pipeline model spend | Total |
| --- | --- | --- | --- | --- |
| Lead routing rebuild | 11.0 | $71,500 | $310 | $71,810 |
| Quote approval parallelization | 8.5 | $55,250 | $240 | $55,490 |
| Duplicate account merge | 7.0 | $45,500 | $185 | $45,685 |
| Renewal risk automation | 4.5 | $29,250 | $120 | $29,370 |
| **Committed total** | **31.0** | **$201,500** | **$855** | **$202,355** |

Model spend is 0.4% of the committed cost. It is not a lever. Engineering weeks are the only lever, which is why the argument on Thursday is about the cut line and not about tooling.`,
    },
    {
      id: "charter",
      label: "Initiative charter — lead routing rebuild",
      kind: "charter.md",
      body:
`## Charter — Lead routing rebuild
**Rank:** 1 of 25 · **Score:** 86 · **Committed:** Q3, weeks 1–7 · **Sponsor:** VP Sales Ops · **Delivery owner:** Director, GTM Systems

## Problem
Inbound leads are assigned by a rules set that has been amended 31 times since 2023 and never re-derived. Three symptoms, all measured in the two weeks before this charter:

- **Median time-to-first-touch is 19 hours.** The stated SLA is 4. The SLA has never been met in any month for which data exists.
- **22% of leads route to a rep who cannot work them** — wrong segment, wrong geography, or an owner who left. These are re-routed by hand, by one person, on a queue she checks twice a day.
- **A rule added in Feb 2024 silently drops leads** whose country field is null. 312 leads in the last quarter. Nobody knew until this analysis.

## Outcome
| Measure | Baseline | Target | How verified |
| --- | --- | --- | --- |
| Median time-to-first-touch | 19 h | under 4 h | Reported from CRM, weekly, from week 2 |
| Misroute rate | 22% | under 5% | Manual re-route queue volume |
| Silently dropped leads | 312/qtr | 0 | Assertion in the routing test suite |
| Manual re-route effort | â6 h/wk | under 1 h/wk | Sales Ops timesheet |

**Not in scope:** lead scoring, enrichment vendor change, territory model redesign. Each was proposed during scoping and each is a separate request in the register. The charter names them explicitly so that "while we're in there" has a written answer.

## Approach
1. Derive the current behaviour from the rules set and 90 days of routing history — what the rules *do*, not what they were meant to do.
2. Rebuild as a single evaluated ruleset with an explicit fallthrough. No null-drops possible by construction.
3. Shadow-run against live traffic for five business days, comparing new routing to actual, with a report of every disagreement.
4. Cut over behind a flag, one segment at a time, with the old path warm.

## Reversibility
Flag-gated, default off. Rollback is a flag flip, under a minute, no data migration. The shadow period produces the evidence for the cutover decision rather than the cutover producing the evidence.

## Risks
| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Shadow reveals the current rules are *intentionally* weird in ways nobody documented | Medium | Every disagreement is triaged with Sales Ops before cutover, not after |
| Territory data quality is worse than assumed | High | Week 1 spends 2 days on a data audit before any build; if it is bad, the charter comes back to the sponsor |
| The 22% misroute figure is partly mis-tagged rather than mis-routed | Medium | Baseline is re-measured from the same query at close, so the comparison is at least internally consistent |

## Definition of done
All four measures reported against baseline for two consecutive weeks post-cutover, the manual re-route queue retired or explicitly kept with a stated reason, and the rules set documented well enough that the next amendment does not require reading 31 changesets.`,
    },
    {
      id: "ledger",
      label: "Sprint ledger — Generator/Evaluator rounds",
      kind: "ledger.md",
      body:
`## Sprint ledger — Lead routing rebuild
Four sprints, two evaluator rounds where the first failed. Scores are the evaluator's, not the generator's.

## Sprint 1 — Derive current behaviour
**Contract:** produce an executable description of what the 31 amendments actually do, plus a disagreement report against 90 days of history.

### Round 1 — **FAIL 5.4/10**
| Criterion | Score | Note |
| --- | --- | --- |
| Functionality | 6 | Derivation runs; reproduces 94.1% of historical assignments |
| Completeness | 4 | The 5.9% of disagreements were summarized, not enumerated. The contract asked for a report of every disagreement. |
| Code quality | 6 | Rule evaluation is one 340-line function with nested conditionals mirroring the original mess |
| Tests | 5 | 11 tests, all happy-path. No test covers the null-country case, which is the entire reason this project exists. |

> Evaluator: "94.1% is presented as a pass. It is not. The 5.9% is 1,847 leads and it is where every defect lives. Enumerate them or the shadow run has no baseline to compare against."

### Round 2 — **PASS 8.4/10**
| Criterion | Score | Note |
| --- | --- | --- |
| Functionality | 9 | 100% of historical assignments reproduced or explained; 1,847 disagreements enumerated and categorised into 6 causes |
| Completeness | 8 | Full report delivered. Two causes were unknown to Sales Ops — including a rule that routes by a field deprecated in 2024. |
| Code quality | 8 | Decomposed into 6 predicates with a declared evaluation order; the order is now a documented decision rather than an accident |
| Tests | 9 | 34 tests including the null-country case and all 6 disagreement causes |

## Sprint 2 — Rebuild with explicit fallthrough
**Round 1 — **PASS 8.1/10**.** 41 tests. Fallthrough is total by construction: the ruleset is exhaustive over the input domain, verified by a property test rather than by inspection. No lead can be dropped without matching an explicit rule that says to drop it, and there is no such rule.

## Sprint 3 — Shadow run harness
**Round 1 — **PASS 7.2/10**.** Works, and the disagreement report is good. Marked down for the dashboard: it renders disagreement *count* by day, which makes a five-day trend look like a metric when it is a triage queue. Rebuilt to list disagreements grouped by cause with the reps affected, which is what Sales Ops will actually act on.

## Sprint 4 — Flag-gated cutover
**Round 1 — **PASS 8.8/10**.** Segment-by-segment rollout, old path warm, flag default off. Rollback tested by actually flipping it under load rather than by asserting it would work.

## Shadow-run result, 5 business days
| Day | Leads | Agreed | Disagreed | Verdict on disagreements |
| --- | --- | --- | --- | --- |
| Mon | 412 | 388 | 24 | 24 new-path correct |
| Tue | 455 | 431 | 24 | 22 new correct, 2 genuine gaps → rules added |
| Wed | 398 | 390 | 8 | 8 new correct |
| Thu | 441 | 436 | 5 | 5 new correct |
| Fri | 377 | 374 | 3 | 3 new correct |

Two genuine gaps found on Tuesday, both in partner-sourced leads with a segment value Sales Ops did not know was still in use. Fixed Wednesday. **This is what the shadow period was for** — finding them in cutover week instead would have meant a rollback and a credibility cost with the sponsor.`,
    },
    {
      id: "prpacket",
      label: "PR packet and gate trace — bug-check, docs-forge, repo-ops",
      kind: "pull-request",
      body:
`## PR #482 — Lead routing rebuild (flag-gated)
**Base:** main · **Head:** gtmsys/lead-routing-rebuild · **Files:** 47 · **+3,114 / −1,880**

## Gate trace
### 1 · oc-bug-check — **BLOCKED** then **PASS**
\`\`\`
oc-bug-check · pre-commit gate
  typecheck ................ PASS   0 errors
  lint ..................... PASS   0 errors, 4 warnings
  tests .................... PASS   118 passed, 0 failed, 0 skipped
  secret scan .............. FAIL   1 finding
  build .................... PASS   4.1s
  dep vulnerabilities ...... PASS   0 high, 0 critical

FINDING · secret-scan · BLOCKING
  tests/fixtures/routing-history.json:1
  Live CRM session token in a committed fixture.
  Captured with the 90-day routing history in Sprint 1 and
  carried forward through three sprints.
  Token is valid. It grants read on Lead, Account, Opportunity.

  COMMIT BLOCKED.
\`\`\`

The token was in the working tree for eleven days across three passing sprints. Nothing else in the pipeline looks for it: the evaluator grades against the contract, and the contract did not say "no live credentials in fixtures." **The commit gate is the only thing between this and a public repository.**

Remediation: token revoked at the CRM before anything else; fixture regenerated with a synthetic session; history rewritten on the branch; a scan added to the fixture-generation script so the next capture cannot reintroduce it.

### 2 · oc-docs-forge — packet generated
Produced the \`## Documentation\` section below, updated the routing README, and added an ADR recording the evaluation-order decision from Sprint 1 — the thing most likely to be re-litigated in six months by someone who was not here.

### 3 · oc-repo-ops — **FAIL** then **PASS**
\`\`\`
oc-repo-ops · PR readiness
  docs packet present ...... PASS
  generated files in sync .. FAIL   2 findings
  catalog drift ............ FAIL   1 finding
  git state clean .......... PASS
  orphaned files ........... WARN   1

FINDING 1 · generated-drift · BLOCKING
  src/generated/routing-rules.json is 3 commits behind its source.
  Regenerate with: npm run gen-routing

FINDING 2 · catalog-drift · BLOCKING
  docs/routing/README.md documents 4 rule predicates.
  Source declares 6. The two added in Sprint 2 are undocumented.

FINDING 3 · orphaned · WARNING
  tests/fixtures/routing-history.old.json unreferenced since the
  secret remediation. Delete or explain.

PR CREATION BLOCKED.
\`\`\`

Both blocking findings are the kind that pass review and fail in production three weeks later, when the generated file is regenerated by someone else and the diff is suddenly enormous. Fixed, re-run, **PASS**.

## Documentation
### What changed
Lead routing moves from 31 accumulated rule amendments to a single evaluated ruleset with an explicit, exhaustive fallthrough. The old path stays warm behind \`site.feature.routing-v2\`, default off.

### Why
The prior rules could drop a lead silently — 312 last quarter — because no rule matched and there was no fallthrough. Exhaustiveness is now enforced by a property test rather than by review.

### Rollout
Flag off at merge. Enable per segment: SMB → Mid-Market → Enterprise → Partner, one business day apart, with the disagreement report reviewed between each.

### Rollback
Flip \`site.feature.routing-v2\` to false. Under a minute, no data migration. The old ruleset is untouched on this branch.

### For the next person
The evaluation order is a decision, not an accident — see \`docs/adr/0014-routing-evaluation-order.md\`. If you add a predicate, add it to the order table in that ADR and to the property test's domain, or the exhaustiveness check will fail closed, which is the intended behaviour.`,
    },
    {
      id: "readout",
      label: "Quarter-close readout — shipped, slipped, cost, deferred",
      kind: "readout.md",
      body:
`## Q3 close — GTM Systems
**For:** CRO, CFO, VP Marketing · **From:** Director, GTM Systems · **Date:** Oct 3

Four commitments were made in July against 46.5 available engineering weeks. This is what happened to all four, plus the 21 requests that were not committed.

## Committed
| Initiative | Committed | Actual | Status | Outcome vs. target |
| --- | --- | --- | --- | --- |
| Lead routing rebuild | 11.0 wks | 12.5 wks | **Shipped** | Time-to-first-touch 19 h → 3.2 h (target: under 4). Misroutes 22% → 4.1% (target: under 5). Dropped leads 312 → 0. |
| Quote approval parallelization | 8.5 wks | 8.0 wks | **Shipped** | Approval SLA p50 3.1 d → 1.4 d. p90 unchanged at 6.2 d — see below. |
| Duplicate account merge | 7.0 wks | 9.5 wks | **Shipped late** | 14,200 duplicate pairs merged. Ran 2.5 weeks over: the match rules needed three rounds with Sales Ops, not one. |
| Renewal risk automation | 4.5 wks | 0 | **Not started** | Cut in week 9 when duplicate-merge overran. Sponsor notified week 9, not at close. |

**30.0 of 46.5 weeks** went to the three that shipped, against 31.0 planned for four. The 15.5-week buffer absorbed an unplanned SOC 2 evidence request — 5 weeks in September — without displacing committed work, which is the first quarter in four where that was true.

## The honest one
Quote approval p90 did not move. Parallelizing the three approvals fixed the median; the tail is a single approver in Finance who is the sole authority above $250K and is in back-to-back meetings. **That is not a systems problem and no amount of further engineering will fix it.** It needs a second delegated approver, which is a decision for the CFO, not a ticket for this team. Flagged here rather than buried in a status field.

## Not committed — dispositions
| Disposition | Count | Notes |
| --- | --- | --- |
| Returned for a measurable | 9 | 5 came back with one and enter Q4 scoring; 4 did not and are closed |
| Deferred with a date | 7 | All have a named quarter and a reason in the register |
| Closed — already delivered | 4 | Shipped in Q1–Q2, never closed; requesters notified |
| Routed elsewhere | 2 | Data Platform, IT Ops |

## Cost
| Line | Planned | Actual |
| --- | --- | --- |
| Engineering — committed work | $201,500 · 31.0 wks · 4 initiatives | $195,000 · 30.0 wks · 3 initiatives |
| Engineering — unplanned (SOC 2) | — | $32,500 · 5.0 wks |
| Pipeline model spend | $855 | $1,190 |
| **Total** | **$202,355** | **$228,690** |

Committed work came in **$6,500 under plan — and that is not good news.** It is under only because renewal risk was cut. All three initiatives that shipped ran over their own estimates, by 3.5 weeks and $22,750 between them. The underspend is a cancellation, not an efficiency, and reporting it as a saving would be the kind of thing that makes the next quarter's numbers harder to believe.

Model spend ran 39% over, from the extra evaluator rounds on Sprints 1 and 3. That is $335.

## What changes for Q4
1. **Estimates get a range, not a point.** Duplicate merge was estimated at 7.0 and took 9.5; lead routing at 11.0 and took 12.5. Two of the three that shipped ran over. Q4 estimates carry a p50 and a p80, and the capacity plan commits against p80.
2. **The framework holds.** The top three ranked items shipped and hit their targets. The one that did not start was rank 4 — the model put the right things at the top, and the cut line was in roughly the right place.
3. **Buffer stays at 15 weeks.** It was fully consumed by unplanned work. That is what it is for; removing it is how last quarter produced 4-of-9.`,
    },
  ],
  steps: [
    {
      type: "beat",
      label: "Intake triage",
      caption: "40 requests, no framework",
      skills: ["oc-orchestrator"],
      phase: "discover",
    },
    {
      type: "exchange", role: "user",
      content:
`I just took over GTM Systems at Halyard. There are 40 open requests in the intake project going back seven months, six engineers, and a quarterly planning session Thursday with the CRO, CFO and VP Marketing. Last quarter the team committed to nine things and delivered four. I need to walk in with something defensible.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-orchestrator",
      content:
`Before anything gets ranked, the queue needs to be real. Ranking 40 items when some are duplicates and some already shipped produces a confident answer to the wrong question.

Pulling the intake project and normalizing.

## What came back
| Step | Count |
| --- | --- |
| Raw open issues | 40 |
| Duplicates merged | −9 |
| Already delivered, never closed | −4 |
| Not this team's | −2 |
| **Distinct and actionable** | **25** |

Three things worth your attention before Thursday:

**Lead routing was filed four times** by three different people over five months — GTMSYS-88, -112, -119, -140. Four independent filings of the same request is a stronger signal than any single sponsor's escalation, and it is the kind of signal an escalation-driven process is structurally unable to see.

**Four requests were already delivered in Q1–Q2 and never closed.** The requesters were never told. Two of them re-filed variants, which is part of why the queue looks like 40.

**Nine of the 25 do not state what they would improve.** Not "no metric attached" — no stated outcome at all. I have not scored those — a framework that invents value on the requester's behalf does not survive its first dispute.`,
      artifacts: ["register"],
    },
    {
      type: "exchange", role: "user",
      content:
`What do I do with the nine?`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-orchestrator",
      content:
`Return them, with a template and a deadline that falls before Thursday:

\`\`\`
This will improve ______ from ______ to ______ by ______ (date).
If we do not do it, the cost is ______.
Reply with that line and it enters Q3 scoring.
No reply by Jul 8 → deferred to Q4 intake.
\`\`\`

Two things this does beyond cleaning the queue. It moves the burden of articulating value to the person who wants the thing, which is where it belongs and where the knowledge is. And it gives you a defensible answer on Thursday when someone asks why their request is not on the list: *it is, and here is the one line we need from you.*

Expect roughly half to come back. The ones that do not were mostly ambient complaints rather than requests, and one email is a cheap way to find out which is which.`,
    },
    {
      type: "beat",
      label: "Scoring and the capacity math",
      caption: "the framework, and what it deliberately excludes",
      skills: ["oc-orchestrator", "oc-cost-ops"],
      phase: "spec",
    },
    {
      type: "exchange", role: "user",
      content:
`OK. How do we rank the 16 that are left? I was going to use value over effort.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-orchestrator",
      content:
`I would not, and the reasons are specific to what already happened here rather than general.

## Why value ÷ effort fails on this queue
1. **No memory of blast radius.** Changing opportunity stages touches forecast, comp and three dashboards. Changing a standalone report touches nothing. At two weeks each, value ÷ effort scores them identically.
2. **It cannot express reversibility.** Your Q2 territory change could not be rolled back without re-running comp. That risk was invisible at planning and expensive in week 6.
3. **It launders political weight as value.** Whoever escalates hardest supplies the value number. Four of last quarter's nine arrived that way — and those four are the four that slipped.

## Proposed instead
Five factors, weighted to 100. Effort is deliberately **not** a divisor — it enters through capacity, so "what matters most" and "what fits" stay separate arguments.

| Factor | Weight | Why |
| --- | --- | --- |
| Measured impact | 30 | Named metric, captured baseline, sponsor-committed target |
| Reach | 20 | Exposure, not value — deliberately below impact |
| Blast radius *(inverted)* | 20 | What breaks if this is wrong |
| Reversibility *(inverted)* | 15 | How fast can you undo it |
| Decay | 15 | Does deferring it cost more later |

Requester seniority is not a factor. If a VP request is genuinely more valuable it will score higher on impact and reach; if it does not, the model is working.`,
      artifacts: ["scoring"],
    },
    {
      type: "exchange", role: "user",
      content:
`The CRO is going to say reach should be weighted higher than impact. Sales cares about how many reps are affected.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-orchestrator",
      content:
`Then let him have it, and show him it does not matter.

I re-ran the ranking across nine plausible weightings, including reach at 30 and impact at 40 — the two most likely proposals in that room.

**The top three do not change under any of them.** Ranks 4 through 7 reorder freely.

| Weighting | 1st | 2nd | 3rd |
| --- | --- | --- | --- |
| Proposed (impact 30 / reach 20) | Lead routing | Quote approval | Dup merge |
| Reach 30 | Lead routing | Dup merge | Quote approval |
| Impact 40 | Lead routing | Quote approval | Dup merge |
| Equal weights | Lead routing | Quote approval | Dup merge |
| Decay 25 | Lead routing | Quote approval | Dup merge |

That is the argument to make Thursday, and it is a stronger one than defending your weights:

> The model does not need to be agreed on to make the first three decisions. It only matters for the marginal ones. Adopt it provisionally, commit the top three now, and re-argue the weights next quarter with a quarter of calibration data behind us.

It converts a debate about your judgment into a debate about a shared instrument.`,
    },
    {
      type: "exchange", role: "user",
      content:
`Good. How much of this actually fits in a quarter? And before you answer — I know where this is going. Four or five commitments after last quarter's nine is going to read as sandbagging by the new guy.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-cost-ops",
      content:
`Less than the room will assume, and the gap is where last quarter's 4-of-9 came from.

## Available weeks
| Line | Weeks |
| --- | --- |
| 6 engineers × 13 weeks | 78.0 |
| Contractor rolls off week 9 | −4.0 |
| On-call, 1/wk | −13.0 |
| BAU — 18%, measured from Q2, not estimated | −11.0 |
| Holidays + booked PTO | −3.5 |
| **Net deliverable** | **46.5** |

Planning against 78 is exactly how nine commitments happen. You have **46.5**, and the last two land after the contractor is gone so they cannot hold anything needing two people.

## Against the ranked queue
Items 1–4 total **31.0 weeks**. Adding rank 5 reaches 40.0 — inside 46.5 on paper, but it is the lowest-reversibility item in the top eight and it lands the same week the contractor leaves.

**Recommend committing four and holding 15.5 weeks.** Not as padding — as the explicit answer to the audit request and the re-org that arrive every quarter and currently displace committed work.

On the sandbagging read: it is a real risk and I would meet it directly rather than hope nobody says it. Last quarter's nine commitments consumed the same 46.5 weeks and delivered four. You are not proposing to do less work — you are proposing to promise the amount of work that exists. The difference between those two framings is the whole meeting, and it is easier to make now than in October.

Bring the capacity table. A number nobody can dispute is harder to call sandbagging than a judgment call.`,
      artifacts: ["capacity"],
    },
    {
      type: "exchange", role: "user",
      content:
`The CFO will ask what the AI-assisted delivery is saving us. What's the honest answer?`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-cost-ops",
      content:
`The honest answer is that it is not the number worth asking about, and I would say so directly rather than produce an impressive one.

## What the pipeline actually costs
| Initiative | Eng cost | Pipeline model spend |
| --- | --- | --- |
| Lead routing rebuild | $71,500 | $310 |
| Quote approval | $55,250 | $240 |
| Duplicate merge | $45,500 | $185 |
| Renewal risk | $29,250 | $120 |
| **Total** | **$201,500** | **$855** |

Model spend is **0.4%** of committed cost. It is not a lever, and no amount of tuning it will change a quarter.

## What I cannot honestly tell you
I cannot give you a defensible velocity multiplier. To claim "30% faster" I would need the same team building the same four things without the pipeline, and that experiment does not exist. Any number I produced would be a vendor benchmark with your logo on it, and the CFO will be right to discount it.

## What I would say instead
> Tooling is 0.4% of this budget. The lever is engineering weeks, and the reason we are committing four things instead of nine is that we have 46.5 of them, not 78. Ask me in October whether four-for-four beat last quarter's four-for-nine.

That answer survives follow-up. A velocity multiplier does not.`,
    },
    {
      type: "beat",
      label: "Charter and commit",
      caption: "scope, and what is explicitly out",
      skills: ["oc-app-architect"],
      phase: "plan",
    },
    {
      type: "exchange", role: "user",
      content:
`Thursday went fine — they took the four. Let's build the lead routing rebuild.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-app-architect",
      content:
`Charter first, because the scope conversation has to happen once, in writing, before anyone opens the rules set.

Two things surfaced while scoping that were not in any of the four original tickets:

**A rule added in Feb 2024 silently drops leads with a null country field.** 312 last quarter. Nobody knew. It is not in any ticket because nobody could see it happening — the leads simply never appeared.

**The 22% misroute figure may be partly mis-tagging rather than mis-routing.** I have kept the number as the baseline but flagged it, and the charter commits to re-measuring with the identical query at close so the comparison is at least internally consistent. Better to name that now than to be asked in October whether the improvement is real.

## Out of scope, written down
Lead scoring. Enrichment vendor change. Territory model redesign. All three came up in scoping, all three are separate requests already in the register. They are named in the charter specifically so that "while we're in there" has an answer that is not a negotiation.

Rollback is a flag flip — under a minute, no data migration. The shadow run produces the evidence for the cutover decision, rather than the cutover producing the evidence.`,
      artifacts: ["charter"],
    },
    {
      type: "beat",
      label: "Build",
      caption: "test strategy first, then four sprints",
      skills: ["oc-qa-ops", "oc-app-architect"],
      phase: "build",
    },
    {
      type: "exchange", role: "user",
      content:
`Approved. Go.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-qa-ops",
      content:
`Test strategy before the first sprint, because on this initiative the strategy is load-bearing rather than hygiene.

The entire problem is a ruleset that does something nobody intended. The only durable defence is a test that fails when the rules stop being exhaustive — otherwise amendment 32 reintroduces the null-drop and we are back here in eighteen months.

## Written to .opchain/qa.yaml
| Layer | Budget | What it covers |
| --- | --- | --- |
| Unit | 80% of predicate logic | Each of the 6 predicates, including boundaries |
| **Property** | exhaustiveness | Generated leads across the full input domain; **no input may fall through unmatched** |
| Contract | CRM field shape | Fails if a field this depends on changes type or is deprecated |
| Integration | 6 routing paths end to end | Including the null-country case explicitly |
| Shadow | 5 business days live | Not a test — an evidence gate before cutover |

The property test is the one that matters. Unit tests confirm the rules you thought to write; the property test confirms there is no input the ruleset ignores. That is the actual failure mode here, and it is not reachable by example-based testing.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-app-architect",
      content:
`## Sprint 1 — Derive current behaviour · Evaluator round 1: **FAIL 5.4/10**

| Criterion | Score | Note |
| --- | --- | --- |
| Functionality | 6 | Reproduces 94.1% of historical assignments |
| Completeness | 4 | Disagreements summarized, not enumerated — contract asked for every one |
| Code quality | 6 | One 340-line function mirroring the original mess |
| Tests | 5 | 11 tests, all happy-path; **no null-country test** |

> Evaluator: "94.1% is being presented as a pass. It is not. The remaining 5.9% is 1,847 leads and it is where every defect lives. Enumerate them, or the shadow run has no baseline to compare against."

The generator built a summary because a summary is what a human would want to read. The contract said every disagreement, and on this initiative that is the deliverable — the 5.9% *is* the project.

## Round 2: **PASS 8.4/10**
1,847 disagreements enumerated, categorised into six causes. **Two were unknown to Sales Ops**, including a rule routing on a field deprecated in 2024. Predicates decomposed to six with a declared evaluation order. 34 tests including the null-country case.

Sprints 2–4 follow: exhaustive rebuild (**8.1**), shadow harness (**7.2** — the dashboard initially charted disagreement *count* as if it were a metric rather than a triage queue), flag-gated cutover (**8.8**, rollback tested by flipping it under load rather than asserting it would work).

## Shadow run — 5 business days
2,083 leads. 64 disagreements, **62 of which the new path got right**. Two genuine gaps, both partner-sourced leads with a segment value Sales Ops did not know was still in use. Found Tuesday, fixed Wednesday.

Finding them in cutover week instead would have meant a rollback, in front of the sponsor who had just backed you.`,
      artifacts: ["ledger"],
    },
    {
      type: "beat",
      label: "The gates",
      caption: "two of them fail",
      skills: ["oc-bug-check", "oc-docs-forge", "oc-repo-ops", "oc-git-ops", "oc-deploy-ops"],
      phase: "ship",
    },
    {
      type: "exchange", role: "user",
      content:
`Ship it.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-bug-check",
      content:
`Commit blocked.

\`\`\`
oc-bug-check · pre-commit gate
  typecheck ................ PASS   0 errors
  lint ..................... PASS   0 errors, 4 warnings
  tests .................... PASS   118 passed, 0 failed
  secret scan .............. FAIL   1 finding
  build .................... PASS   4.1s
  dep vulnerabilities ...... PASS   0 high, 0 critical

FINDING · secret-scan · BLOCKING
  tests/fixtures/routing-history.json:1
  Live CRM session token in a committed fixture.
  Captured alongside the 90-day routing history in Sprint 1.
  Token is valid. Grants read on Lead, Account, Opportunity.

COMMIT BLOCKED.
\`\`\`

It was captured in Sprint 1 with the routing history and carried through three sprints, all of which passed evaluation. Nothing else looks for this: the evaluator grades against the contract, and the contract said nothing about credentials in fixtures.

**Revoke the token at the CRM before anything else** — it is valid right now and the branch has been pushed to origin, so treat it as exposed regardless of what happens next.

Then: regenerate the fixture with a synthetic session, rewrite branch history, and add a scan to the fixture-generation script so the next capture cannot reintroduce it. The fix takes ten minutes. The fixture was two approvals from a repository that mirrors publicly.`,
    },
    {
      type: "exchange", role: "user",
      content:
`Revoked. Regenerated with a synthetic session and force-pushed the branch.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-repo-ops",
      content:
`Bug-check now **PASS**. Docs packet generated — PR body section, routing README updated, and an ADR recording the Sprint 1 evaluation-order decision, which is the thing most likely to be re-litigated in six months by someone who was not here.

PR creation blocked on readiness.

\`\`\`
oc-repo-ops · PR readiness
  docs packet present ...... PASS
  generated files in sync .. FAIL   2 findings
  catalog drift ............ FAIL   1 finding
  git state clean .......... PASS
  orphaned files ........... WARN   1

FINDING 1 · generated-drift · BLOCKING
  src/generated/routing-rules.json is 3 commits behind source.

FINDING 2 · catalog-drift · BLOCKING
  docs/routing/README.md documents 4 predicates. Source has 6.
  The two added in Sprint 2 are undocumented.

FINDING 3 · orphaned · WARNING
  tests/fixtures/routing-history.old.json unreferenced since the
  secret remediation.

PR CREATION BLOCKED.
\`\`\`

Both are the sort that pass human review comfortably and fail three weeks later, when someone regenerates the file and gets a diff they cannot explain.

Regenerated, documented both predicates, deleted the orphan. Re-run: **PASS**.`,
      artifacts: ["prpacket"],
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-deploy-ops",
      content:
`Merged and deployed with the flag off.

Rollout ran one segment per business day with the disagreement report reviewed between each: SMB Monday, Mid-Market Tuesday, Enterprise Wednesday, Partner Thursday. No rollback.

## Two weeks post-cutover
| Measure | Baseline | Target | Actual |
| --- | --- | --- | --- |
| Median time-to-first-touch | 19 h | under 4 h | **3.2 h** |
| Misroute rate | 22% | under 5% | **4.1%** |
| Silently dropped leads | 312/qtr | 0 | **0** |
| Manual re-route effort | â6 h/wk | under 1 h/wk | **1.4 h/wk** |

Three of four targets met. Re-route effort landed at 1.4 h/wk against a target of 1 — the residual is partner-sourced leads needing a human segment call, which is a territory-model question and not a routing one. It is now request #26 in the register rather than scope creep on this one.

Baseline was re-measured with the identical query, as the charter committed. The improvement holds.`,
    },
    {
      type: "beat",
      label: "Close and resume",
      caption: "the readout, and picking it back up",
      skills: ["oc-cost-ops", "oc-checkpoint-protocol"],
      phase: "operate",
    },
    {
      type: "exchange", role: "user",
      content:
`It's the end of the quarter. I need the readout for the same three people.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-cost-ops",
      content:
`Four commitments, three shipped, one cut. The readout leads with the cut and with the thing that did not move, because those are the two items that will otherwise be found rather than told.

## Committed
| Initiative | Est | Actual | Status |
| --- | --- | --- | --- |
| Lead routing | 11.0 | 12.5 | **Shipped** — 3 of 4 targets met |
| Quote approval | 8.5 | 8.0 | **Shipped** — p50 halved, **p90 unchanged** |
| Duplicate merge | 7.0 | 9.5 | **Late** — match rules took 3 rounds, not 1 |
| Renewal risk | 4.5 | 0 | **Cut in week 9**, sponsor told in week 9 |

**Say this one out loud before anyone finds it:** quote approval p90 did not move. Parallelizing fixed the median; the tail is one Finance approver who is the sole authority above $250K. That is not a systems problem and no further engineering will fix it. It needs a second delegated approver — a CFO decision, not a ticket.

## Cost
| Line | Planned | Actual |
| --- | --- | --- |
| Engineering — committed | $201,500 · 4 initiatives | $195,000 · 3 initiatives |
| Engineering — unplanned (SOC 2) | — | $32,500 |
| Pipeline model spend | $855 | $1,190 |
| **Total** | **$202,355** | **$228,690** |

Committed engineering came in **$6,500 under plan — because we cut renewal risk**, not because we estimated well. All three that shipped ran over. I would not let that land as a saving.

Model spend ran 39% over: **$335**, from the extra evaluator rounds. Both are variances. Only one is worth the room's time.

## For Q4
Two of the three that shipped ran over — duplicate merge by 2.5 weeks — so Q4 estimates carry a p50 and a p80, and the capacity plan commits against p80. The 15.5-week buffer took a 5-week SOC 2 evidence request without displacing committed work, and stays.`,
      artifacts: ["readout"],
    },
    {
      type: "exchange", role: "user",
      content:
`I'm out for two weeks. Where do I pick this up?`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-checkpoint-protocol",
      content:
`\`\`\`
$ npm run checkpoint:status

oc-orchestrator      Q3 close complete · Q4 intake open (12 items)
                     next: score the 5 returned measurables
oc-app-architect     lead-routing · launch complete
                     next: none — closed
oc-cost-ops          Q3 actuals reconciled
                     next: build p50/p80 estimate model for Q4
oc-qa-ops            .opchain/qa.yaml v2 · property test live
                     next: extend contract tests to quote-approval
oc-deploy-ops        routing-v2 flag ON, all segments, 14 days
                     next: remove old routing path (scheduled Oct 24)
\`\`\`

Two things are time-sensitive while you are out and neither needs you:

**The five returned measurables** entered scoring on Oct 1 and rank 2nd, 6th, 9th, 11th and 14th. They are ranked, not committed — Q4 capacity is not built yet, so nothing is promised in your absence.

**The old routing path deletes Oct 24**, twelve days out. If you want that held until you are back, say so now; otherwise it runs on schedule and the flag becomes permanent.

Everything else is at a natural stopping point. The register, the framework and the capacity model are in the repo rather than in your head — which is what matters if two weeks becomes four.`,
    },
  ],
};
