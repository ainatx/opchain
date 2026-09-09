import type { Walkthrough } from "./types";

/**
 * Opportunity to order — eleven days down to two
 *
 * Mandate: quote-to-cash / opportunity-to-order — named by five captured
 * requisitions and measured on cycle time, approval SLA and quote accuracy.
 *
 * Covers oc-integrations-engineer instrumenting before building, the mock-first
 * boundary ladder, oc-api-dev designing the partner entitlements contract with a
 * sunset policy fixed before v1, and oc-code-auditor blocking the release on two
 * money-path criticals.
 */
export const vantorOpportunityToOrder: Walkthrough = {
  id: "vantor-opportunity-to-order",
  title: "Opportunity to order — eleven days down to two",
  tagline: "Instrument first, then rebuild the seam",
  summary: "The CRO wants quote turnaround cut from eleven days to two. The scenario opens by refusing to build anything until the eleven days is measured — and the measurement moves the whole project, because the bottleneck is not where anyone thought it was.",
  description:
`Vantor Instruments sells industrial sensing hardware direct and through 40 channel partners. Quotes take eleven days; the CRO wants two. A previous attempt in 2024 went live in week one and caused a pricing incident, so the credibility cost of a second failure is higher than the schedule cost of measuring first.

\`oc-integrations-engineer\` refuses to build anything until the eleven days is instrumented — and the measurement moves the whole project. The distribution is bimodal, not long-tailed: 71% of quotes already turn around in 2.1 days, while the exception population sits at 34. The ERP sync everyone blamed, and that the 2024 attempt targeted, is 0.1% of elapsed time. The real costs are three sequential approvals with no data dependency on each other, and a pricing lookup that times out and silently re-queues for the next business day — 218 quotes a quarter, leaving no trace, which is why a quarter of the elapsed time was unattributed.

\`oc-api-dev\` then designs the partner entitlements API that replaces a shared mailbox and a person. It refuses the flat endpoint two partners asked for, and fixes the versioning and sunset policy before v1 ships — while it is still a table in a document rather than a negotiation with 40 counterparties.

\`oc-code-auditor\` blocks the release on two money-path criticals: a double-rounding bug that under-bills multi-currency partner discounts systematically and one-directionally, and a clone path that carries approved status onto a re-configured quote. The second is pre-existing — three production quotes in 18 months reached ERP with approvers recorded against the wrong amount.`,
  inputs: [
    "CPQ, a pricing service, ERP and a contract system — four systems, no owner of the seam",
    "Quote cycle time reported as 11 days; CRO wants 2 by end of quarter",
    "40 channel partners who email for entitlement data, answered by hand",
    "A prior integration attempt abandoned in 2024 after a pricing incident",
    "No baseline instrumentation on any step of the flow",
  ],
  skills: [
    "oc-integrations-engineer",
    "oc-api-dev",
    "oc-code-auditor",
    "oc-bug-check",
    "oc-git-ops",
    "oc-deploy-ops",
  ],
  runtime: "18 exchanges",
  outputs: [
    {
      id: "baseline",
      label: "Cycle-time baseline and KPI definitions",
      kind: "baseline.md",
      body:
`## Quote cycle time — baseline
**Window:** 1,847 quotes, Apr 1 – Jun 30 · **Instrumented:** timestamps at every system boundary

## The headline number was hiding the problem
| Statistic | Value |
| --- | --- |
| Median (the reported "11 days") | 10.8 d |
| Mean | 19.2 d |
| p90 | 41.0 d |
| p99 | 96.0 d |

Mean is nearly double median, and p90 is four times it. **The distribution is bimodal, not long-tailed** — there are effectively two populations of quote, and reporting a single median has been averaging them into a number that describes neither.

| Population | Share | Median | What defines it |
| --- | --- | --- | --- |
| A — standard | 71% | 2.1 d | Under $250K, single currency, catalogue config |
| B — exception | 29% | 34.0 d | One or more of: over $250K, multi-currency, partner-sourced, custom config |

**Population A is already at the target.** Seventy-one percent of quotes turn around in 2.1 days today. The CRO's "eleven days to two" would, if taken literally, deliver nothing for them and everything for the 29% — which is a materially different project from the one that was scoped.

## Where the time actually goes — population B
| Stage | Median | Share of elapsed |
| --- | --- | --- |
| Rep builds config in CPQ | 3.1 h | 0.4% |
| **Pricing lookup** | **4.2 d** | **12.4%** |
| **Approval chain (sequential)** | **19.6 d** | **57.6%** |
| ERP sync | 0.7 h | 0.1% |
| Contract generation | 1.2 d | 3.5% |
| Rep sends | 0.4 h | 0.05% |
| Unattributed gap | 8.8 d | 25.9% |

## Three findings that change the project
**1 · The ERP sync is not the problem.** It was the assumed bottleneck and the reason the 2024 attempt targeted it. Median 42 minutes, p99 3.1 hours. It has never been the bottleneck.

**2 · Approvals are sequential and need not be.** Deal desk → finance → legal, each waiting on the last. Dependency analysis shows deal desk and legal have no data dependency on each other; only finance needs deal desk's output. Parallelizing the two independent ones removes roughly 8 days of the 19.6.

**3 · The pricing lookup silently retries the next business day.** The service times out at 30s. On timeout the CPQ job does not error and does not alert — it re-queues for the next business-day run. **A Friday-afternoon timeout costs three calendar days and nothing anywhere records that it happened.** 218 of 1,847 quotes hit this path. It is the single largest component of the unattributed gap.

## KPI definitions — agreed with deal desk and finance
| KPI | Definition | Baseline | Target |
| --- | --- | --- | --- |
| Cycle time, pop. A | Config start → sent, median | 2.1 d | hold |
| Cycle time, pop. B | Config start → sent, median | 34.0 d | 8.0 d |
| Approval SLA | Submitted → final approval, p50 | 19.6 d | 6.0 d |
| Approval SLA p90 | Same, p90 | 47.0 d | 21.0 d |
| Quote accuracy | Quotes with no post-send price correction | 91.2% | 98.0% |
| Silent retries | Pricing timeouts that re-queue without alerting | 218/qtr | 0 |

**p90 is committed separately from p50 on purpose.** A median improvement that leaves the tail untouched looks like success in a dashboard and feels like nothing to the reps who live in population B.`,
    },
    {
      id: "contract",
      label: "Integration contract — the four-system seam",
      kind: "contract.md",
      body:
`## Integration contract — opportunity to order
**Systems:** CPQ · pricing service · ERP · contract system · **Owner:** Business Applications

## Boundaries
| # | From → To | Trigger | Payload | Idempotency |
| --- | --- | --- | --- | --- |
| B1 | CPQ → pricing | Config complete | Line items, currency, partner tier | \`quote_id + config_hash\` |
| B2 | pricing → CPQ | Price resolved | Unit + extended, discount basis, FX rate + timestamp | replay-safe, last-write-wins on \`priced_at\` |
| B3 | CPQ → approvals | Submit | Quote total, margin, currency set, partner flag | \`quote_id + submission_seq\` |
| B4 | approvals → CPQ | Each decision | Approver, decision, timestamp, conditions | append-only, never overwritten |
| B5 | CPQ → ERP | Final approval | Order header + lines, terms | \`quote_id\` — ERP rejects duplicates |
| B6 | CPQ → contracts | Final approval | Quote snapshot, clauses, signature block | \`quote_id + version\` |

## Approval graph — the change
Today, strictly sequential:
\`\`\`
deal desk ──► finance ──► legal
\`\`\`

Dependency analysis of 1,847 quotes: **finance requires deal desk's margin output. Legal requires neither.** Legal reviews terms, which are fixed at config time and do not change with pricing.

Rebuilt:
\`\`\`
        ┌──► deal desk ──► finance ──┐
submit ─┤                            ├──► final
        └──► legal ──────────────────┘
\`\`\`

Final approval waits on both branches. Removes about 8 days of the 19.6 median with no change to who approves what, which is what makes it approvable by the people whose authority it touches.

## The silent-retry fix
Current behaviour on pricing timeout:
\`\`\`
timeout(30s) → catch → requeue(next_business_day) → return "pending"
\`\`\`
No error. No alert. No record.

Contract requires:
\`\`\`
timeout(30s)
  → retry immediately, exponential backoff, 3 attempts
  → all fail → mark quote BLOCKED_PRICING
             → alert #deal-desk within 60s
             → surface the block in the rep's quote view
\`\`\`
A quote may still fail to price. It may no longer fail **silently**, and the rep may no longer discover on Monday that nothing happened on Friday.

## Failure modes
| Mode | Handling |
| --- | --- |
| Pricing returns stale FX | Rate carries \`fx_timestamp\`; older than 24h → re-fetch before ERP push |
| Approval decided twice | Append-only log; second decision recorded, first stands, discrepancy alerted |
| ERP push partially applies | \`quote_id\` idempotency; retry is safe; partial state reconciled by ERP, never by CPQ |
| Contract generated pre-approval | B6 fires only on final approval; ordering enforced at the boundary, not by convention |
| **Quote cloned after approval** | See audit — this was the hole |`,
    },
    {
      id: "boundary",
      label: "Boundary layer — mock-first, then live",
      kind: "code.md",
      body:
`## Boundary layer
Every external call goes through a typed boundary with a mock implementation that ships first. No live pricing credential is used until the boundary is proven against the mock — the 2024 attempt went live in week one and caused the pricing incident that got it cancelled.

## Shape
\`\`\`
src/boundaries/
  pricing/
    client.ts          typed interface, no transport
    live.ts            HTTP, retry, backoff, timeout
    mock.ts            deterministic fixtures, seedable
    contract.test.ts   both impls satisfy the same suite
  erp/
  approvals/
  contracts/
\`\`\`

The contract test runs against **both** implementations. A behaviour the mock has and the live client does not is a bug in the mock; the reverse is a bug in the client. Neither can drift silently because both are held to one suite.

## Pricing client — timeout path
\`\`\`
async function price(req: PriceRequest): Promise<PriceResult> {
  const key = idem(req.quoteId, req.configHash);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await http.post("/price", req, {
        timeout: 30_000,
        idempotencyKey: key,
      });
    } catch (e) {
      if (!isTimeout(e) && !isRetryable(e)) throw e;
      if (attempt === 3) break;
      await sleep(backoff(attempt));   // 1s, 4s
    }
  }

  // Explicit, loud, visible. Never a silent requeue.
  await markBlocked(req.quoteId, "BLOCKED_PRICING");
  await alert("#deal-desk", blockedMessage(req));
  throw new PricingUnavailable(req.quoteId);
}
\`\`\`

The old path returned \`"pending"\` here and re-queued. That single \`return\` was 218 quotes a quarter and roughly a quarter of the unattributed gap.

## Fixture policy
Mock fixtures are generated from **anonymised** production shapes: real structure, real edge cases — multi-currency, partner tiers, 14-line configs — with account names, contacts and prices replaced. Generation is scripted, and the script runs a secret scan on its own output before writing, because a fixture captured from production is exactly where a live credential ends up.

## Cutover
1. Mock-only in CI. Full suite green.
2. Live client against the pricing **sandbox**, same suite.
3. Live client, production credential, **read-only** shadow — price computed both ways, compared, nothing written.
4. Shadow clean for 5 business days → write path enabled behind \`feature.pricing-v2\`.

Step 3 is the step the 2024 attempt skipped.`,
    },
    {
      id: "openapi",
      label: "Partner entitlements API — contract, versioning and sunset",
      kind: "openapi.yaml",
      body:
`## Partner Entitlements API v1
**Consumers:** 40 channel partners · **Replaces:** a shared mailbox and a person

## What it replaces
Partners email for entitlement data — what a customer has bought, what is active, what renews when. Someone answers by hand from a CPQ report. Median response 1.4 business days; the person who does it is also the deal desk's escalation path, so partner questions and deal desk queue for the same human.

## Design decisions, and one refusal
**Refused: a single \`/entitlements?partner_id=\` returning everything.** Two partners asked for it directly. It cannot be paginated coherently once a partner exceeds a few thousand customers, it forces a full re-fetch to detect a single change, and every consumer would build the same client-side diff. The requested shape is easier to build and worse to live with for the six years the endpoint will exist.

**Instead:** cursor pagination and a change feed. Slightly more integration work for partners on day one, and no re-architecture in year two.

\`\`\`
GET /v1/entitlements
  ?customer_id=          filter, optional
  &status=active|expired|pending
  &updated_since=        RFC3339
  &cursor=               opaque
  &limit=                1..200, default 50

200 {
  "data": [ { ... } ],
  "next_cursor": "eyJvIjoxNTB9",   // null when exhausted
  "as_of": "2026-09-02T14:22:08Z"
}
\`\`\`

\`as_of\` is on every response so a partner can reason about staleness without guessing.

## Idempotency
Reads are safe. The one write — \`POST /v1/deal-registrations\` — requires \`Idempotency-Key\`. Replay inside 24h returns the original response and does not create a second registration. Partners retry aggressively over flaky links; without this, duplicate registrations become a channel-conflict dispute, and channel conflict is a commercial problem, not a technical one.

## Errors
\`\`\`
{
  "error": {
    "code": "entitlement_not_found",
    "message": "No entitlement matching customer_id cus_8812.",
    "request_id": "req_01JQ...",
    "docs": "https://developers.vantor.example/errors#entitlement_not_found"
  }
}
\`\`\`
Stable machine code, human message, request id echoed for support. Support currently asks partners for a screenshot.

## Versioning and sunset — decided before v1 ships
| Rule | Commitment |
| --- | --- |
| Version | URL path, \`/v1/\` |
| Additive changes | New optional fields, no version bump. Consumers must ignore unknown fields — stated in docs. |
| Breaking changes | New version. Never in place. |
| Parallel support | Minimum **18 months** |
| Deprecation notice | 12 months, \`Sunset\` header (RFC 8594) + email to every partner technical contact |
| Sunset telemetry | Per-partner call counts on the deprecated version, reviewed monthly. **No version is switched off while a partner is still calling it** — they get a named human, not a 410. |

Writing the sunset policy before v1 ships is the cheapest it will ever be. After 40 partners integrate, it stops being a design decision and becomes a negotiation.

## SDK
TypeScript and Python generated from this spec, published on tag. Generated, not hand-written, so drift between spec and SDK is structurally impossible rather than a thing someone remembers to check.`,
    },
    {
      id: "audit",
      label: "Money-flow audit — two blocking findings",
      kind: "audit.md",
      body:
`## Money-flow audit — opportunity to order
**Scope:** pricing, discount, approval, ERP push, entitlements · **Verdict:** **BLOCKED — 2 critical**

## CRITICAL 1 · Rounding on multi-currency partner discounts
**Where:** \`src/pricing/discount.ts:88\` · **Impact:** systematic under-billing, favours the partner, compounds with volume

Discount is applied after FX conversion, and each line rounds to 2dp before summing.

\`\`\`
// current
const converted = round2(line.unitPrice * fxRate);
const discounted = round2(converted * (1 - partnerTier.discount));
total += discounted * line.qty;
\`\`\`

Two defects compound:
1. **Double rounding.** Rounding after conversion and again after discount, per line.
2. **Rounding before quantity.** A half-cent error per unit becomes a half-cent × quantity error per line.

**Reproduction** — 14-line quote, EUR, tier-3 partner (22%), quantities 40–600:
| Method | Total |
| --- | --- |
| Current | €184,206.44 |
| Correct — full precision, round once at total | €184,213.91 |
| **Delta** | **€7.47 under** |

€7.47 on €184K is 0.004%. This quote is below the average error: replaying all 536 multi-currency quotes in the window gives a mean delta of €14.63 and **€7,840 for the quarter — roughly €31,400 a year.** The size is not what makes it critical. It is systematic and one-directional, which is what makes it an audit finding rather than a rounding nuisance. An auditor who finds a consistent bias in the customer's favour will ask how long it has run and whether prior periods need restating.

**Fix:** carry full precision through conversion, discount and quantity; round once, at the line total, half-up; document the convention in the pricing contract so the next implementer cannot re-derive it differently.

## CRITICAL 2 · Approval bypass on quote clone
**Where:** \`src/quote/clone.ts:41\` · **Impact:** a quote can reach ERP with no approval

Clone copies the full quote record — including \`approval_status: "APPROVED"\` and the approval log — then clears line items for editing. The rep re-configures, the total changes, and the quote **retains approved status**.

\`\`\`
// current
const cloned = { ...source, id: newId(), lineItems: [] };
// approval_status and approvals[] carried over verbatim
\`\`\`

Reproduce: approve a $180K quote, clone it, reconfigure to $2.1M, push to ERP. **No approval is requested at any point.** The approval log shows the original approvers against the new amount, so it is not merely unapproved — it is affirmatively misleading to anyone reading the record afterwards.

This is not new. It exists in the current system and the rebuild faithfully reproduced it, which is worth saying plainly: the audit found a pre-existing hole because the migration surfaced it, not because the rebuild introduced it. A query against production found **three quotes in the last 18 months** that cloned an approved quote and increased value by more than 20% without re-approval. All three were legitimate deals. That is luck, not control.

**Fix:** clone resets \`approval_status\` to \`DRAFT\` and starts an empty approval log with a \`cloned_from\` reference. Approval state is never copied. Add an assertion at boundary B5 — ERP push requires a current approval whose amount matches the quote total within tolerance, so the invariant is enforced at the boundary rather than trusted from upstream.

## HIGH · FX rate staleness not enforced on the ERP path
Contract requires re-fetch when \`fx_timestamp\` exceeds 24h. Enforced in the quote view, **not** on the B5 push. A quote approved Friday and pushed Tuesday goes to ERP at Friday's rate. Not blocking — the window is narrow and the error is bidirectional — but it should be one check in one place rather than two implementations that will diverge.

## Verdict
**Release blocked** on both criticals. Finding 2 additionally warrants telling Finance about the three historical quotes before they find them.`,
    },
    {
      id: "runbook",
      label: "Cutover and rollback runbook",
      kind: "runbook",
      body:
`## Cutover runbook — opportunity to order
**Change window:** Sat 06:00–10:00 · **Rollback budget:** 15 min at any stage

## Pre-flight
- [x] Audit criticals closed, re-audited **PASS**
- [x] Bug-check **PASS** — including a scan of the regenerated fixtures
- [x] Shadow pricing 5 business days: 2,104 quotes, 0 discrepancies over €0.01
- [x] Deal desk, finance and legal briefed on the parallel approval graph
- [x] 40 partners notified of the entitlements API, 6 sandbox-integrated
- [x] Rollback rehearsed against a production clone

## Stages
| # | Change | Verify | Rollback |
| --- | --- | --- | --- |
| 1 | Enable \`feature.pricing-v2\` read path | 20 quotes priced both ways, compared | Flag off — under 1 min |
| 2 | Enable pricing write path | Next 10 live quotes reconciled by hand | Flag off; re-price from v1 |
| 3 | Switch approvals to parallel graph | 5 quotes through both branches | Flag off; in-flight finish sequential |
| 4 | Enable \`BLOCKED_PRICING\` alerting | Force a timeout in sandbox, confirm alert under 60s | Flag off — alert-only, no data impact |
| 5 | Open entitlements API to 6 pilot partners | Each confirms a successful paginated read | Revoke keys; mailbox still staffed |
| 6 | Remaining 34 partners, 5/day | Per-partner first-call confirmation | Per-partner key revoke |

**Stages 1–4 are same-day. Stages 5–6 run over two weeks** — partner integration is not a change window, and treating it as one is how partners get a 401 on a Saturday with nobody to call.

## Rollback triggers
Any one of these reverts the stage immediately, without discussion:
- Any priced quote differs from v1 by more than €0.01 without an explained cause
- Approval reaches ERP without a matching current approval record
- Pricing block alert fails to fire within 60s of an induced timeout
- Partner reports a 5xx rate above 1% over 15 min

## The mailbox stays open
The shared partner mailbox is **not** decommissioned at cutover. It stays staffed for 90 days after the last partner integrates. A partner who cannot get the API working must have a human to reach, and the mailbox's volume trend is the real adoption metric — better than call counts, because it measures whether partners stopped needing the old path rather than whether they tried the new one.

## Post-cutover measurement
Re-measured at 30 days with the same instrumentation as the baseline, on the same query.

| KPI | Baseline | Target | 30-day actual |
| --- | --- | --- | --- |
| Cycle time, pop. B (median) | 34.0 d | 8.0 d | **7.4 d** |
| Approval SLA p50 | 19.6 d | 6.0 d | **5.1 d** |
| Approval SLA p90 | 47.0 d | 21.0 d | **26.0 d** |
| Quote accuracy | 91.2% | 98.0% | **98.6%** |
| Silent retries | 218/qtr | 0 | **0** |
| Partner entitlement response | 1.4 d | under 1 min | **0.9 s p95** |

**p90 missed at 26 days against a 21-day target.** The residual is legal review on custom terms, which is one reviewer with a genuine backlog — the same shape of problem as the pricing timeout, but human. It is not a systems fix and is escalated as a staffing decision rather than absorbed as a follow-on ticket.`,
    },
  ],
  steps: [
    {
      type: "beat",
      label: "Instrument before you change anything",
      caption: "the number was hiding two populations",
      skills: ["oc-integrations-engineer"],
      phase: "discover",
    },
    {
      type: "exchange", role: "user",
      content:
`Quotes take eleven days. The CRO wants two by end of quarter. We have CPQ, a pricing service, ERP and a contract system, and nobody owns the seam between them. There was an attempt at this in 2024 that got cancelled after a pricing incident.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-integrations-engineer",
      content:
`I want to instrument before touching anything, for two reasons. The 2024 attempt is the first: it went live in week one and caused an incident, so the credibility cost of a second failure here is higher than the schedule cost of two weeks of measurement.

The second is that "eleven days" is a median, and a median is the wrong statistic for a process with approval queues in it. If the distribution is skewed, the median describes a quote that may barely exist.

Adding timestamps at every system boundary and backfilling from 90 days of history — 1,847 quotes.

## What came back
| Statistic | Value |
| --- | --- |
| Median | 10.8 d |
| Mean | 19.2 d |
| p90 | 41.0 d |
| p99 | 96.0 d |

Mean nearly double the median, p90 four times it. That is not a long tail — **that is two populations**.

| Population | Share | Median | Definition |
| --- | --- | --- | --- |
| A — standard | 71% | 2.1 d | Under $250K, single currency, catalogue config |
| B — exception | 29% | 34.0 d | Over $250K, multi-currency, partner-sourced, or custom |

**Seventy-one percent of your quotes already turn around in 2.1 days.** "Eleven to two" delivers nothing for them. The project is the 29%, and it is a different project than the one that was scoped — bigger in impact, narrower in surface.`,
      artifacts: ["baseline"],
    },
    {
      type: "exchange", role: "user",
      content:
`That's not what I expected. Everyone says the ERP sync is the bottleneck — that's what 2024 was trying to fix.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-integrations-engineer",
      content:
`It is not, and it never was.

**ERP sync: median 42 minutes, p99 3.1 hours.** Against a 34-day median for population B, it is 0.1% of elapsed time. The 2024 attempt spent its budget on the fastest step in the flow and took a production pricing incident to do it.

## Where population B actually spends 34 days
| Stage | Median | Share |
| --- | --- | --- |
| Rep builds config | 3.1 h | 0.4% |
| Pricing lookup | 4.2 d | 12.4% |
| **Approval chain (sequential)** | **19.6 d** | **57.6%** |
| ERP sync | 0.7 h | 0.1% |
| Contract generation | 1.2 d | 3.5% |
| **Unattributed gap** | **8.8 d** | **25.9%** |

Two findings inside that.

**Approvals are sequential and mostly need not be.** Deal desk → finance → legal, each waiting on the last. Across 1,847 quotes, finance requires deal desk's margin output — but legal requires neither. Legal reviews terms, and terms are fixed at config time. Running the two independent branches in parallel removes about 8 of the 19.6 days without changing who approves what.

**The pricing lookup fails silently.** The service times out at 30 seconds. On timeout the CPQ job does not error and does not alert — it re-queues for the next business-day run and returns "pending". A Friday-afternoon timeout costs three calendar days, and nothing anywhere records that it happened. **218 of 1,847 quotes hit this path.** It is most of the unattributed 8.8 days.

That last one is why the gap was unattributed. You cannot attribute time to an event that leaves no trace.`,
    },
    {
      type: "beat",
      label: "The seam contract",
      caption: "six boundaries, one graph change",
      skills: ["oc-integrations-engineer"],
      phase: "spec",
    },
    {
      type: "exchange", role: "user",
      content:
`So what do we actually build?`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-integrations-engineer",
      content:
`Six boundaries with explicit idempotency, one change to the approval graph, and one deleted line of code that is worth more than the rest of it.

## The approval graph
\`\`\`
today:   deal desk ──► finance ──► legal

rebuilt:         ┌──► deal desk ──► finance ──┐
         submit ─┤                            ├──► final
                 └──► legal ──────────────────┘
\`\`\`
Nobody's authority changes. Nobody approves anything they did not approve before. That is what makes this approvable by deal desk and legal rather than a negotiation with them — the change is to ordering, not to control.

## The silent retry
\`\`\`
// today
timeout(30s) → catch → requeue(next_business_day) → return "pending"
\`\`\`
That \`return\` is the single most expensive line in the flow.

\`\`\`
// contract
timeout(30s)
  → retry immediately, backoff 1s / 4s, 3 attempts
  → all fail → mark BLOCKED_PRICING
             → alert #deal-desk within 60s
             → surface the block in the rep's quote view
\`\`\`
A quote may still fail to price. It may no longer fail **invisibly**. The rep finds out in a minute rather than on Monday.`,
      artifacts: ["contract"],
    },
    {
      type: "exchange", role: "user",
      content:
`You've got idempotency keys on every boundary. Is that necessary, or is it ceremony?`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-integrations-engineer",
      content:
`Necessary on four of six, and I would rather justify each than apply it as a blanket rule.

**B5, CPQ → ERP, is the one that matters.** Without a key, a retried push creates a duplicate order. That is not a data-quality problem — it is a shipped-and-invoiced-twice problem, and it is discovered by the customer. Your ERP already rejects duplicates on \`quote_id\`, so the key costs nothing and closes it.

**B1, pricing, keyed on \`quote_id + config_hash\`.** Under the new retry behaviour we deliberately retry up to three times in 35 seconds. If pricing is not idempotent, a slow-but-successful first attempt plus a retry gives two price computations at two FX timestamps, and last-write-wins picks arbitrarily.

**B3 and B4, approvals, keyed on \`quote_id + submission_seq\` and append-only.** An approval decision recorded twice, or an old decision overwriting a new one, is the audit finding that ends the project. Append-only means a double decision is *recorded and alerted* rather than silently resolved.

**B2 and B6 do not strictly need keys.** B2 is replay-safe by construction — last-write-wins on \`priced_at\` is correct behaviour, not a workaround. B6 generates a versioned document; a duplicate is a wasted PDF, not a business event. I kept a key on B6 anyway because the cost is one column and the failure is confusing to debug, but I would not defend it as necessary and you should feel free to cut it.`,
    },
    {
      type: "beat",
      label: "Mock-first boundary",
      caption: "no live credential until it is proven",
      skills: ["oc-integrations-engineer"],
      phase: "build",
    },
    {
      type: "exchange", role: "user",
      content:
`Build it. And I do not want a repeat of 2024 — nothing touches live pricing until you're sure.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-integrations-engineer",
      content:
`Mock-first, and the live credential is not used until stage 3 of four.

Every external call goes through a typed boundary with two implementations — mock and live — held to **one** contract test suite. A behaviour the mock has and the live client does not is a bug in the mock; the reverse is a bug in the client. Neither can drift silently, which is the usual way mock-based work passes CI and fails in production.

\`\`\`
src/boundaries/pricing/
  client.ts          typed interface, no transport
  live.ts            HTTP, retry, backoff, timeout
  mock.ts            deterministic fixtures, seedable
  contract.test.ts   both impls, same suite
\`\`\`

## Cutover ladder
1. Mock-only in CI, full suite green
2. Live client against the pricing **sandbox**, same suite
3. Live client, production credential, **read-only shadow** — priced both ways, compared, nothing written
4. Shadow clean 5 business days → write path behind \`feature.pricing-v2\`

**Step 3 is the step 2024 skipped.** It is also the only step that can tell you the two implementations agree on real data, which is the question the incident actually raised.

One note on fixtures: mock data is generated from anonymised production shapes — real structure, real edge cases, 14-line multi-currency partner configs — with names and prices replaced. The generation script runs a secret scan on its own output before writing, because a fixture captured from production is precisely where a live credential ends up.`,
      artifacts: ["boundary"],
    },
    {
      type: "beat",
      label: "The partner API",
      caption: "a refusal, and a sunset policy written before v1",
      skills: ["oc-api-dev"],
      phase: "build",
    },
    {
      type: "exchange", role: "user",
      content:
`Separate thing while you're in here — we have 40 channel partners who email us for entitlement data. One person answers them by hand out of a CPQ report. Two of them have asked for an API.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-api-dev",
      content:
`Worth doing, and worth doing properly, because the person answering that mailbox is also deal desk's escalation path — partner questions and deal desk are queueing for the same human.

**I am going to refuse the shape both partners asked for.** They want \`GET /entitlements?partner_id=\` returning everything. It is easier to build and worse to live with:

- It cannot be paginated coherently once a partner passes a few thousand customers
- Detecting one change requires re-fetching everything
- Every partner independently builds the same client-side diff

Instead: cursor pagination plus \`updated_since\`. Slightly more integration work for partners on day one; no re-architecture in year two. I would tell them that directly, with the reasoning — partners who integrate against an API are more forgiving of a considered design than of a convenient one they outgrow.

\`\`\`
GET /v1/entitlements
  ?customer_id=  &status=active|expired|pending
  &updated_since=RFC3339  &cursor=  &limit=1..200

200 { "data": [...], "next_cursor": "...", "as_of": "..." }
\`\`\`

\`as_of\` on every response so staleness is a fact rather than a guess.

## The part that is cheap now and expensive later
Versioning and sunset, decided **before** v1 ships:

| Rule | Commitment |
| --- | --- |
| Parallel support | minimum 18 months |
| Deprecation notice | 12 months, \`Sunset\` header + email to every technical contact |
| Breaking change | new version, never in place |
| Sunset gate | **no version switched off while a partner is still calling it** |

After 40 partners integrate, this stops being a design decision and becomes a negotiation with 40 counterparties. Right now it is a table in a document.

SDKs in TypeScript and Python are generated from the spec on tag, so spec-to-SDK drift is structurally impossible rather than something someone remembers to check.`,
      artifacts: ["openapi"],
    },
    {
      type: "beat",
      label: "Money-flow gate",
      caption: "blocked on two criticals",
      skills: ["oc-code-auditor", "oc-bug-check"],
      phase: "audit",
    },
    {
      type: "exchange", role: "user",
      content:
`Shadow's been clean for five days. Ready to ship?`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-code-auditor",
      content:
`No. Two criticals, both on the money path.

## CRITICAL 1 · Rounding on multi-currency partner discounts
\`\`\`
const converted  = round2(line.unitPrice * fxRate);
const discounted = round2(converted * (1 - partnerTier.discount));
total += discounted * line.qty;
\`\`\`
Rounds twice — after conversion and after discount — and rounds **before** multiplying by quantity, so a half-cent per unit becomes a half-cent × quantity per line.

14-line EUR quote, tier-3 partner, quantities 40–600:
| Method | Total |
| --- | --- |
| Current | €184,206.44 |
| Full precision, round once | €184,213.91 |
| **Delta** | **€7.47 under** |

0.004% — but **systematic and one-directional, always in the partner's favour**. Modelled across a quarter's multi-currency volume: ≈€31,400/yr. The number is not what makes it critical; the consistent bias is. An auditor who finds it will ask how long it has run and whether prior periods need restating.

## CRITICAL 2 · Approval bypass on quote clone
\`\`\`
const cloned = { ...source, id: newId(), lineItems: [] };
// approval_status and approvals[] carried over verbatim
\`\`\`
Clone copies \`approval_status: "APPROVED"\` and the approval log, then clears line items. Rep re-configures to any amount. **The quote stays approved.**

Reproduced: approve $180K, clone, reconfigure to $2.1M, push to ERP. No approval requested at any point. The log then shows the original approvers against the new amount — not merely unapproved, but affirmatively misleading to whoever reads the record later.

**This is pre-existing.** It is in the system you have today and the rebuild reproduced it faithfully. I queried production: **three quotes in 18 months** cloned an approved quote and raised value by more than 20% without re-approval. All three were legitimate deals — that is luck, not control, and Finance should hear it from you rather than from an auditor.

## Also, non-blocking
FX staleness is enforced in the quote view but not on the ERP push. A quote approved Friday and pushed Tuesday goes at Friday's rate. Narrow window, bidirectional error — but it should be one check in one place rather than two that will diverge.

**Release blocked** on both criticals.`,
      artifacts: ["audit"],
    },
    {
      type: "exchange", role: "user",
      content:
`The clone bug has been there for years. Fix both.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-code-auditor",
      content:
`Both fixed.

**Rounding:** full precision carried through conversion, discount and quantity; rounded once at the line total, half-up. The convention is now written into the pricing contract so the next implementer cannot re-derive it differently. Re-ran all 1,847 historical quotes through both paths — 536 multi-currency quotes differ, all in the same direction, totalling €7,840 for the quarter. That figure goes to Finance with the disclosure on Critical 2.

**Clone:** \`approval_status\` resets to \`DRAFT\`, approval log starts empty with a \`cloned_from\` reference. Approval state is never copied.

And an assertion at boundary B5: **ERP push requires a current approval whose amount matches the quote total within tolerance.** That is the part that matters more than the clone fix — it enforces the invariant at the boundary rather than trusting every upstream path to have got it right. Clone was one way in; the assertion closes the ones nobody has found.

Re-audit: **PASS**. Bug-check **PASS**, including a scan of the regenerated fixtures.`,
    },
    {
      type: "beat",
      label: "Cutover",
      caption: "staged, with the mailbox kept open",
      skills: ["oc-git-ops", "oc-deploy-ops"],
      phase: "ship",
    },
    {
      type: "exchange", role: "user",
      content:
`Ship it.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-deploy-ops",
      content:
`Six stages. Stages 1–4 in a Saturday window; stages 5–6 over two weeks, because partner integration is not a change window and treating it as one is how a partner gets a 401 on a Saturday with nobody to call.

| # | Change | Rollback |
| --- | --- | --- |
| 1 | Pricing v2 read path | flag off, under 1 min |
| 2 | Pricing v2 write path | flag off, re-price from v1 |
| 3 | Parallel approval graph | flag off; in-flight finish sequential |
| 4 | \`BLOCKED_PRICING\` alerting | flag off, alert-only |
| 5 | Entitlements API, 6 pilot partners | revoke keys |
| 6 | Remaining 34 partners, 5/day | per-partner revoke |

**The shared mailbox stays open** for 90 days after the last partner integrates. A partner who cannot get the API working needs a human to reach — and the mailbox's volume trend is a better adoption metric than API call counts, because it measures whether partners stopped *needing* the old path rather than whether they tried the new one.

## 30 days post-cutover, same instrumentation, same query
| KPI | Baseline | Target | Actual |
| --- | --- | --- | --- |
| Cycle time, pop. B | 34.0 d | 8.0 d | **7.4 d** |
| Approval SLA p50 | 19.6 d | 6.0 d | **5.1 d** |
| Approval SLA p90 | 47.0 d | 21.0 d | **26.0 d** |
| Quote accuracy | 91.2% | 98.0% | **98.6%** |
| Silent retries | 218/qtr | 0 | **0** |
| Partner response | 1.4 d | under 1 min | **0.9 s p95** |

**p90 missed — 26 days against 21.** The residual is legal review on custom terms: one reviewer, real backlog. Structurally the same problem as the pricing timeout, but human, and no further engineering fixes it. It goes up as a staffing decision rather than back into the backlog as a follow-on ticket.

Population A is unchanged at 2.1 days, which was the intent — the 71% who were never the problem were not disturbed.`,
      artifacts: ["runbook"],
    },
  ],
};
