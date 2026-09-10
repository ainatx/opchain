import type { Walkthrough } from "./types";

/**
 * Mandate: automation CoE / fleet operations in a regulated environment —
 * three captured requisitions, one naming the whole shape: own and scale the
 * RPA centre of excellence, maintain the production bot population, ensure
 * HIPAA/SOC 2 compliance, and own FTE savings, bot uptime, ROI and velocity.
 *
 * Covers oc-fleet-ops declaring topology and rolling the fleet, oc-scale-ops
 * proving month-end capacity, oc-security-hardening writing controls as code,
 * oc-compliance-ops emitting the evidence bundle, and oc-cost-ops carrying the
 * ROI line the role is measured on.
 */
export const ledgerpointAutomationFleet: Walkthrough = {
  id: "ledgerpoint-automation-fleet",
  title: "Two hundred bots, one auditor, and nobody watching uptime",
  tagline: "A regulated fleet, brought under control",
  summary:
    "An inherited RPA estate: 200 bots on unmanaged runners, a third failing silently, PHI in scope, and an audit in eleven weeks. The scenario declares the topology, proves capacity at month-end close, writes the controls as code, and emits the evidence bundle.",
  description:
`Ledgerpoint Health runs revenue-cycle operations for hospital groups. Two hundred RPA bots move claims, post remittances and reconcile payer files. They were built over four years by a team that no longer exists, they run on eleven virtual machines nobody has patched since 2025, and the estate handles PHI.

There is an audit in eleven weeks.

\`oc-fleet-ops\` starts by declaring the topology, because there isn't one — the inventory is a spreadsheet, and reconciling it against what is actually running finds 214 bots rather than 200, including nine nobody can identify and one still processing files for a client that terminated last year.

\`oc-scale-ops\` load-tests month-end close, when 60% of the volume lands in three days, and finds the fleet fails at 1.4× current volume — against a signed client that adds 30% in Q1.

\`oc-security-hardening\` writes the controls as code in a \`hardening.yaml\` manifest with a per-deploy gate, replacing a spreadsheet of intentions. \`oc-compliance-ops\` maps HIPAA and SOC 2 controls to those artifacts and emits the evidence bundle at deploy time. \`oc-cost-ops\` carries the FTE-savings and ROI line the role is measured on — and finds that 31 bots cost more to maintain than the work they replace.`,
  inputs: [
    "200 bots (recorded) across 11 unmanaged VMs, built by a team that has left",
    "An inventory spreadsheet last updated 14 months ago",
    "PHI in scope; HIPAA and SOC 2 audit in 11 weeks",
    "Month-end close: 60% of annual volume in three days",
    "A signed client adding 30% volume in Q1",
  ],
  skills: [
    "oc-fleet-ops",
    "oc-scale-ops",
    "oc-security-hardening",
    "oc-compliance-ops",
    "oc-monitoring-ops",
    "oc-cost-ops",
  ],
  runtime: "16 exchanges",
  outputs: [
    {
      id: "inventory",
      label: "Fleet reconciliation — 214 bots, not 200",
      kind: "report.md",
      body:
`## Fleet reconciliation
**Recorded:** 200 · **Actually running:** 214 · **Method:** orchestrator API + process inventory on all 11 VMs

## The delta
| Finding | Count |
| --- | --- |
| In spreadsheet and running | 186 |
| In spreadsheet, not running (silently dead) | 14 |
| **Running, not in spreadsheet** | **28** |
| ...of which identifiable by owner or purpose | 19 |
| ...of which **nobody can identify** | **9** |

## The nine
Nine processes running on production VMs, on schedule, touching production systems, that nobody can account for. Traced by execution log:

| Bot | Last run | Writes to | Assessment |
| --- | --- | --- | --- |
| \`BOT_0142\` | daily 02:00 | Payer portal (client TERMINATED 2025-11) | **Stop today** |
| \`BOT_0177\` | hourly | A file share that no longer exists | Dead, erroring silently |
| \`BOT_0181\` | daily | Claims DB — **read/write** | Unknown purpose, active writes |
| 6 others | various | read-only reporting | Low risk, still unowned |

**\`BOT_0142\` has been logging into a terminated client's payer portal every night for ten months** with credentials that still work. That is not an uptime problem. It is unauthorised access to a third-party system under a contract that ended, performed nightly by us.

**\`BOT_0181\` writes to the claims database** and nobody knows why. It is not stopped pending analysis, because stopping an unknown writer is as risky as leaving it — it is contained: its credentials are rotated to a read-only role and the write attempts are logged, which reveals its purpose within a day.

## Silent failure rate
Of 186 accounted-for bots:

| State | Count |
| --- | --- |
| Succeeding | 121 |
| Failing, alerting | 8 |
| **Failing, silently** | **57** |
| Not scheduled (deliberate) | 14 |

Thirty-one percent are failing without anyone knowing. Most fail into a retry loop that eventually gives up and writes to a log file nobody reads. Downstream, humans have quietly absorbed the work — the finance team has a Tuesday routine that exists entirely to catch what \`BOT_0089\` stopped doing in March.

## What the inventory was
A spreadsheet, last updated 14 months ago, maintained by hand by someone who left. Every number above is derived from the systems rather than from it.`,
    },
    {
      id: "topology",
      label: "Declared topology and rollout strategy",
      kind: "config.yaml",
      body:
`## Fleet topology — declared
**Before:** 11 hand-built VMs, patched by whoever remembered · **After:** declared, provisioned, rolled

\`\`\`yaml
fleet:
  name: ledgerpoint-rpa
  environment: production
  compliance: [hipaa, soc2]

  tiers:
    - name: claims-critical        # month-end path
      bots: 64
      runners: {min: 6, max: 14}   # scales for close
      placement: dedicated
      data_class: phi
      restart_policy: {max_retries: 3, then: alert_and_hold}

    - name: remittance
      bots: 88
      runners: {min: 4, max: 9}
      data_class: phi
      restart_policy: {max_retries: 3, then: alert_and_hold}

    - name: reporting              # read-only
      bots: 34
      runners: {min: 2, max: 3}
      data_class: none
      restart_policy: {max_retries: 5, then: alert}

    - name: quarantine             # unowned, pending disposition
      bots: 9
      runners: {min: 1, max: 1}
      placement: isolated
      credentials: read_only_forced
      egress: deny_all_except_logged

  rollout:
    strategy: canary
    order: [reporting, remittance, claims-critical]
    canary_pct: 10
    soak: 24h
    abort_on: {error_rate_above: 0.02, or: any_phi_egress_alert}
    blackout: {from: month_end_minus_3d, to: month_end_plus_2d}
\`\`\`

## Three decisions worth naming
**\`restart_policy: alert_and_hold\` on PHI tiers.** The old runners retried indefinitely. A bot retrying a failed claims post forever is not resilience — it is an unbounded number of attempts against a payer system, and it is how a transient failure becomes a rate-limit ban and a duplicate-submission problem.

**A quarantine tier.** The nine unidentified bots are not stopped and not trusted. Isolated placement, credentials forced read-only, all egress denied except logged. They keep running so their purpose becomes visible; they cannot write while unowned.

**A month-end blackout.** No rollout in the five-day window around close. The fleet's worst day is not the day to change it, and writing that into the topology stops it from being a judgement call someone makes under pressure.

## Rollout order
Reporting first — read-only, no PHI, lowest blast radius. Claims-critical last, after the strategy has proven itself twice on lower tiers.`,
    },
    {
      id: "capacity",
      label: "Month-end load test — the fleet fails at 1.4×",
      kind: "eval.md",
      body:
`## Capacity test — month-end close
**Profile:** 60% of annual volume in 3 days · **Method:** replay of the last four closes at multiples

## Results
| Load | Claims/hr | p95 latency | Failures | Verdict |
| --- | --- | --- | --- | --- |
| 1.0× (current peak) | 4,100 | 41 min | 0.4% | Pass |
| 1.2× | 4,920 | 68 min | 0.9% | Pass |
| **1.4×** | 5,740 | **4h 20m** | **11.2%** | **Fail** |
| 1.6× | — | — | — | Cascading failure |

## Where it breaks
Not the runners — CPU peaks at 58% at 1.4×. The break is a **shared session pool against the payer portal**, capped at 40 concurrent sessions by a config value set in 2023 and never revisited.

At 1.4× the queue for a session exceeds the bot's internal timeout. The bot fails, retries, and takes another queue slot — so load **increases** as failures rise. That is the cascade at 1.6×: the retry behaviour turns a saturation problem into a self-amplifying one.

## Why this matters now
The Q1 client adds **30% volume**. Current peak plus 30% is 1.3×, which passes — and it passes with p95 latency at 68 minutes against a 90-minute SLA, with no headroom for a bad day.

The estate has never been load-tested. It has been fine because volume grew slowly enough that nobody noticed the margin shrinking.

## Fixes
| Change | 1.4× failure rate |
| --- | --- |
| Baseline | 11.2% |
| Session pool 40 → 120 (payer permits 150) | 3.1% |
| Bounded retry with backoff, replacing immediate retry | 1.4% |
| Queue depth limit — shed to a hold queue rather than retry | **0.3%** |

The third is the one that changes the shape. Shedding to a hold queue means saturation produces a **visible backlog** instead of an invisible amplification, and a backlog is a thing an operator can see and decide about.

## Re-test
| Load | Failures |
| --- | --- |
| 1.4× | 0.3% |
| 1.6× | 0.9% |
| 2.0× | 4.1% — degrades, does not cascade |

The estate now degrades linearly to 2×. It was one client away from a month-end that did not complete.`,
    },
    {
      id: "controls",
      label: "hardening.yaml and the per-deploy gate",
      kind: "config.yaml",
      body:
`## .opchain/hardening.yaml — declared controls
**Replaces:** a spreadsheet of intentions, last reviewed 2025

\`\`\`yaml
version: 1
scope: ledgerpoint-rpa
data_classification: phi

controls:
  credentials:
    storage: vault            # was: encrypted config files on each VM
    rotation_days: 90
    no_shared_accounts: true  # was: 6 bots sharing one payer login
    verify: on_every_deploy

  network:
    egress: deny_by_default
    allowlist:
      - payer-portal.example.net:443
      - claims-db.internal:1433
      - vault.internal:8200
    verify: on_every_deploy

  host:
    patch_max_age_days: 30    # was: unpatched since 2025
    disk_encryption: required
    remote_access: bastion_only
    verify: daily

  logging:
    phi_in_logs: forbidden
    scan_on_write: true       # ← see finding below
    retention_days: 2555      # 7 years
    tamper_evident: true

  runtime:
    quarantine_tier_write: forbidden
    unowned_bot_max_age_days: 30   # unowned after 30 days → stopped
\`\`\`

## The gate
Runs before every fleet deploy. A control that cannot be verified fails the deploy — the manifest is not documentation, it is an assertion.

\`\`\`
oc-security-hardening · pre-deploy gate
  credentials · vault ............... PASS
  credentials · no shared accounts .. PASS  (6 shared logins split)
  network · egress allowlist ........ PASS
  host · patch age .................. PASS  (max 12d)
  logging · PHI scan ................ FAIL  ← first run
  runtime · quarantine write ........ PASS
\`\`\`

## The finding on first run
**PHI in bot logs.** Fourteen bots log the full payer API response on error, and those responses contain member IDs and dates of birth. Retention is seven years, so the earliest are from 2022.

This is not a hypothetical. It is PHI in plaintext logs, in scope, discovered eleven weeks before an audit — and it would not have been found by any code review, because logging an error response is the obviously correct thing to write.

Remediated: response bodies redacted at the logging boundary, a scan on write so it cannot recur, and the historical logs identified for review with the privacy officer. **The historical exposure is disclosed rather than quietly purged** — deleting seven years of logs to make a finding go away is its own finding.`,
    },
    {
      id: "roi",
      label: "ROI — 31 bots cost more than the work they replace",
      kind: "cost.md",
      body:
`## Fleet ROI
**Measured on:** FTE hours displaced vs. total cost of ownership per bot

## Total cost of ownership per bot
Not licence cost. Licence, runner share, maintenance hours, failure-handling hours, and the human work reabsorbed when a bot fails silently.

| Cohort | Bots | Annual TCO | FTE hours saved | Net |
| --- | --- | --- | --- | --- |
| High-volume claims | 41 | $492,000 | 71,400 hrs | **+$2.1M** |
| Remittance posting | 63 | $604,000 | 48,900 hrs | **+$1.2M** |
| Reporting | 34 | $198,000 | 9,200 hrs | +$142,000 |
| Low-volume / brittle | **31** | **$372,000** | **4,100 hrs** | **−$188,000** |
| Unowned (quarantine) | 9 | $54,000 | 0 | −$54,000 |
| Dead / not scheduled | 36 | $108,000 | 0 | −$108,000 |

## The 31
Each automates a low-volume process — under 200 executions a year — against a brittle interface that changes. They break roughly quarterly, and each break costs 6–14 engineer-hours plus the manual work in the meantime.

**They cost $372,000 a year to save 4,100 hours of work.** That is $91/hour for work that costs $34/hour to do by hand.

This is not an argument against RPA. The top cohort returns $2.1M. It is that **an estate accumulates bots and never removes them**, because building one is a project with a sponsor and removing one is nobody's job.

## Recommendation
| Action | Bots | Annual effect |
| --- | --- | --- |
| Keep and invest | 104 | — |
| Keep, no further investment | 34 | — |
| **Retire — return to manual** | **31** | **+$372,000** |
| Retire — already dead | 36 | +$108,000 |
| Dispose after quarantine | 9 | +$54,000 |
| **Total** | | **+$534,000/yr** |

## The KPI the role is measured on
| Metric | Before | After |
| --- | --- | --- |
| Bot uptime (succeeding) | **65%** | 97% |
| Silent failure rate | 31% | 0% — all failures alert |
| FTE hours displaced | 133,600 | 129,500 |
| Fleet TCO | $1,828,000 | $1,294,000 |
| **Return per FTE hour** | $13.68 | **$9.99** |

FTE hours displaced went **down** by 4,100 — because the retired bots were doing real work badly. Return per hour improved 27%. **A number that got worse in the headline and better in the thing it measures** is the kind of result that needs the second row on the page, or someone reports the first one alone.`,
    },
  ],
  steps: [
    {
      type: "beat",
      label: "Find out what is running",
      caption: "the spreadsheet is 14 months old",
      skills: ["oc-fleet-ops"],
      phase: "discover",
    },
    {
      type: "exchange", role: "user",
      content:
`I've inherited an RPA estate — about 200 bots across 11 VMs, built over four years by a team that's gone. The inventory is a spreadsheet. We handle PHI and there's a HIPAA and SOC 2 audit in eleven weeks. I don't know where to start.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-fleet-ops",
      content:
`With what is actually running, because the spreadsheet is 14 months old and it is wrong in both directions.

Reconciled the orchestrator API against a process inventory on all 11 VMs. **214 bots, not 200.**

| Finding | Count |
| --- | --- |
| In spreadsheet and running | 186 |
| In spreadsheet, silently dead | 14 |
| **Running, not in spreadsheet** | **28** |
| ...**unidentifiable** | **9** |

## Two of the nine need action today
**\`BOT_0142\`** logs into a payer portal every night at 02:00 for a client whose contract **terminated in November**. Ten months. The credentials still work.

That is not an uptime problem. It is us performing unauthorised nightly access to a third party's system under an ended contract, and it needs stopping before anything else on this list.

**\`BOT_0181\`** writes to the claims database and nobody knows why. I would not stop it — stopping an unknown writer is as risky as leaving it. Contain it: rotate its credentials to a read-only role and log the write attempts. Its purpose becomes visible within a day and it cannot do harm meanwhile.

## And the number behind the number
Of the 186 accounted-for bots, **57 are failing silently** — 31%. They fail into a retry loop that gives up and writes to a log nobody reads. Downstream, humans absorbed the work: your finance team has a Tuesday routine that exists entirely to catch what \`BOT_0089\` stopped doing in March.`,
      artifacts: ["inventory"],
    },
    {
      type: "exchange", role: "user",
      content: `Kill 0142 today. What does "getting this under control" actually look like?`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-fleet-ops",
      content:
`A declared topology, so the fleet is something you provision rather than something that accumulated.

Four tiers by data class and criticality, with runner ranges that scale for close. Three decisions worth arguing about:

**\`alert_and_hold\` after 3 retries on PHI tiers.** Your runners currently retry indefinitely. A bot retrying a failed claims post forever is not resilience — it is an unbounded number of attempts against a payer system, and it turns a transient failure into a rate-limit ban plus a duplicate-submission problem.

**A quarantine tier for the nine.** Isolated placement, credentials forced read-only, all egress denied except logged. They keep running so their purpose surfaces; they cannot write while unowned. And an \`unowned_bot_max_age_days: 30\` — unowned after a month means stopped, so quarantine is a holding pattern rather than a permanent category.

**A month-end blackout.** No rollout in the five days around close. Writing it into the topology means it is not a judgement call someone makes under pressure at 11pm.

Rollout order is reporting → remittance → claims-critical. Read-only and no PHI first, so the strategy proves itself twice before it touches the month-end path.`,
      artifacts: ["topology"],
    },
    {
      type: "beat",
      label: "Prove it survives close",
      caption: "60% of the year in three days",
      skills: ["oc-scale-ops"],
      phase: "audit",
    },
    {
      type: "exchange", role: "user",
      content: `We've signed a client that adds about 30% volume in Q1. Will this hold?`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-scale-ops",
      content:
`Barely, and not for long. Replayed the last four month-end closes at multiples.

| Load | p95 latency | Failures |
| --- | --- | --- |
| 1.0× (current peak) | 41 min | 0.4% |
| 1.2× | 68 min | 0.9% |
| **1.4×** | **4h 20m** | **11.2%** |
| 1.6× | — | cascading failure |

**Your new client puts you at 1.3×** — which passes, with p95 at 68 minutes against a 90-minute SLA and no headroom for a bad day.

## Where it breaks, and it is not the runners
CPU peaks at 58% at 1.4×. The break is a **shared session pool against the payer portal capped at 40 concurrent**, set in 2023 and never revisited.

Past that cap, the queue exceeds the bot's timeout. The bot fails, retries immediately, and **takes another queue slot** — so load rises as failures rise. That is the 1.6× cascade: retry behaviour turns saturation into self-amplification.

| Fix | Failures at 1.4× |
| --- | --- |
| Baseline | 11.2% |
| Pool 40 → 120 (payer permits 150) | 3.1% |
| Bounded retry with backoff | 1.4% |
| **Shed to a hold queue at depth limit** | **0.3%** |

The last one changes the shape rather than the number: saturation produces a **visible backlog** instead of invisible amplification, and a backlog is something an operator can see and decide about.

Re-tested, it degrades linearly to 2×. You were one client away from a close that did not complete.`,
      artifacts: ["capacity"],
    },
    {
      type: "beat",
      label: "Controls as code, evidence at deploy",
      caption: "eleven weeks to the audit",
      skills: ["oc-security-hardening", "oc-compliance-ops"],
      phase: "ship",
    },
    {
      type: "exchange", role: "user",
      content: `Now the audit. We have a controls spreadsheet from 2025 that I don't trust.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-security-hardening",
      content:
`Then it becomes \`hardening.yaml\` with a gate that verifies it before every deploy. A control that cannot be verified fails the deploy — the manifest asserts rather than describes.

First run:

\`\`\`
  credentials · vault ............... PASS
  credentials · no shared accounts .. PASS  (6 shared payer logins split)
  network · egress allowlist ........ PASS
  host · patch age .................. PASS  (max 12d, was 2025)
  logging · PHI scan ................ FAIL
  runtime · quarantine write ........ PASS
\`\`\`

## The finding
**PHI in bot logs.** Fourteen bots log the full payer API response on error. Those responses contain member IDs and dates of birth. Log retention is seven years, so the earliest are from 2022.

No code review catches this. Logging the error response is the obviously correct thing to write, and it is correct right up until the response contains PHI.

Remediated at the logging boundary with redaction, plus a scan on write so it cannot recur.

## The part I would not do quietly
The historical logs — four years of them — go to the privacy officer for review, disclosed. **Deleting seven years of logs eleven weeks before an audit, to make a finding disappear, is a worse finding than the one you started with.** The exposure exists whether or not the evidence of it does.`,
      artifacts: ["controls"],
    },
    {
      type: "exchange", role: "user",
      content: `Understood, I'll take that to the privacy officer. What does the auditor actually get?`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-compliance-ops",
      content:
`A bundle emitted at deploy time rather than assembled the week before, which is the difference between evidence and a rehearsal.

| Control | What they ask | Artifact | Emitted |
| --- | --- | --- | --- |
| §164.312(a)(1) | Access control | Vault config, no-shared-accounts verify | every deploy |
| §164.312(b) | Audit controls | Tamper-evident log config, 7y retention | every deploy |
| §164.308(a)(5) | Security awareness | Patch age report | daily |
| §164.312(e)(1) | Transmission security | Egress allowlist verify | every deploy |
| CC6.1 | Logical access | Credential rotation log | 90-day cycle |
| CC7.2 | Anomaly detection | Silent-failure alerting config | continuous |
| CC8.1 | Change management | Fleet rollout log, canary + soak per deploy | every deploy |

## The exhibit to lead with
The gate has **refused a deploy** — the PHI-in-logs finding, with a timestamp and a remediation trail. A control that has visibly said no is worth considerably more in an assessment than a policy document that has only ever agreed.

## What I would put in front of them unprompted
The 214-versus-200 reconciliation, and \`BOT_0142\`. An auditor who finds an unaccounted process touching a terminated client's system draws conclusions about everything else. **An organisation that found it, stopped it, and wrote it down draws different ones** — and the second version is only available if you raise it first.

To be precise about what this is: readiness and evidence, not certification. Nothing here asserts compliance. It asserts the artifacts an assessment requests exist, are current, and are generated by the system rather than about it.`,
    },
    {
      type: "beat",
      label: "The number the role is measured on",
      caption: "and the one that got worse",
      skills: ["oc-cost-ops", "oc-monitoring-ops"],
      phase: "monitor",
    },
    {
      type: "exchange", role: "user",
      content: `My KPIs are FTE savings, bot uptime, ROI and delivery velocity. Where do I actually land?`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-cost-ops",
      content:
`Three improve sharply and one gets worse, and the one that gets worse is the good news.

Costing every bot on total ownership — licence, runner share, maintenance hours, failure-handling, and the human work reabsorbed when it fails silently:

| Cohort | Bots | Annual TCO | Hours saved | Net |
| --- | --- | --- | --- | --- |
| High-volume claims | 41 | $492,000 | 71,400 | **+$2.1M** |
| Remittance | 63 | $604,000 | 48,900 | **+$1.2M** |
| Reporting | 34 | $198,000 | 9,200 | +$142,000 |
| **Low-volume / brittle** | **31** | **$372,000** | **4,100** | **−$188,000** |

## The 31
Each automates a process running under 200 times a year against a brittle interface that changes. They break about quarterly at 6–14 engineer-hours each.

**$372,000 a year to save 4,100 hours** — $91/hour for work that costs $34/hour by hand.

Not an argument against RPA; the top cohort returns $2.1M. It is that an estate accumulates and never sheds, because building a bot is a project with a sponsor and retiring one is nobody's job.

## Where you land
| Metric | Before | After |
| --- | --- | --- |
| Bot uptime | **65%** | 97% |
| Silent failure rate | 31% | 0% |
| **FTE hours displaced** | 133,600 | **129,500** |
| Fleet TCO | $1,828,000 | $1,294,000 |
| Return per FTE hour | $13.68 | **$9.99** |

**FTE hours displaced goes down 4,100.** Retiring 31 bots means 4,100 hours go back to humans — and those bots were doing that work badly and expensively.

Report both rows. If you report hours displaced alone it reads as a 3% regression; if you report return per hour alone it reads as spin. Together it is the actual result: **$534,000 a year returned, and a fleet where every remaining bot pays for itself.**`,
      artifacts: ["roi"],
    },
  ],
};
