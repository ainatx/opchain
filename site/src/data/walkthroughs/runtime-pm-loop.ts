import type { Walkthrough } from "./types";

/**
 * Scenario 10 (v1.3 hero) — "OnRamp" picks up Linear ticket PLAT-5102 at
 * 09:14 on Friday 2026-05-08 (PagerDuty fired at 09:13; on-call filed the
 * bug) and rides the v1.3 runtime-PM loop end-to-end on a single Linear
 * thread: ticket → branch → gate → PR → review → merge → staging → prod →
 * incident → postmortem. v1.2 taught the prose; v1.3 makes every MCP call
 * real with retry/backoff/idempotency markers and a deferred-action queue.
 * The Linear thread becomes the audit-ready record: every comment on
 * PLAT-5102 / PLAT-5103 / PLAT-5104 is written by the skill that owns the
 * event, each with its own idempotency marker, so retries and resumed
 * sessions never double-post.
 */
export const runtimePmLoop: Walkthrough = {
  id: "runtime-pm-loop",
  title: "Ticket → ship → incident → postmortem on one Linear thread",
  tagline: "Runtime PM-MCP loop, audit-ready",
  summary:
    "A real Linear ticket (PLAT-5102) rides the full pipeline. Every MCP call carries an idempotency marker; retries short-circuit; four writes hit a Linear 503 mid-deploy, land in the deferred queue, and flush cleanly four minutes later. Nine skills, one thread, audit-ready.",
  description:
    "OnRamp's customer-list endpoint stepped from 120ms to 3.4s p99 at 09:11:18 on Friday 2026-05-08. PagerDuty fired at 09:13:08; Maya acked two seconds later and filed PLAT-5102 at 09:14:22 with the alert payload pasted in. By 11:20 the fix is live in prod, an unrelated incident that fired in the middle of it has a written postmortem and two owned action items, and the whole thing is legible from the Linear thread alone. The interesting parts are the ones that did not go first-try: the pre-commit gate failed twice before it passed (a CREATE INDEX CONCURRENTLY that can't run inside a transaction, then a regression test that asserted the wrong thing on a 240-row fixture), Maya stopped the agent to scope the migration down from eight dropped indexes to one, and Linear returned 503 on four consecutive writes during the production promotion. v1.3 swapped v1.2's `mcp.<provider>.<verb>` placeholders for concrete tool names like `mcp__claude_ai_Linear__save_comment` and added the deferred-action queue that turned that 503 into a four-minute delay instead of a lost audit trail. The artifact set is the complete Linear timeline (source bug + deploy ticket + incident ticket), the PR, the audit report, the three bug-check rounds, the raw prod deploy console, the postmortem, and the deploy-ops checkpoint before and after the flush.",
  inputs: [
    "Series B SaaS · OnRamp Inc · ~30 engineers · Linear (team PLAT) as system-of-record",
    "On-call engineer Maya files PLAT-5102 from a PagerDuty alert at 09:14:22Z",
    "Node/TypeScript API on Cloudflare Workers · Postgres · dbmate migrations",
    "opchain installed · `.opchain/pm.yaml` configured for Linear since 2026-03-02",
    "Linear MCP server reachable through Claude Code's `mcp.json`",
  ],
  outputs: [
    {
      id: "pm-yaml",
      label: "`.opchain/pm.yaml` — the Linear binding every skill reads",
      kind: "config.yaml",
      body:
`# .opchain/pm.yaml — OnRamp (provider: linear)
# written by oc-integrations-engineer on first /oc-git-sync (2026-03-02); reviewed quarterly
# protocol reference: skills/oc-integrations-engineer/references/pm-mcp-protocol.md

provider: linear
team_or_project: PLAT
mcp_server: linear

issue_types:
  feature:  Feature
  bug:      Bug
  chore:    Chore
  deploy:   Deploy
  incident: Incident
  release:  Release

states:
  in_progress: "In Progress"
  in_review:   "In Review"
  done:        "Done"
  extended:
    blocked:                      "Blocked"
    staging-verified:             "Staging verified"
    shipped:                      "Shipped"
    rolled-back:                  "Rolled back"
    resolved-pending-postmortem:  "Resolved (PM pending)"

labels_default: [opchain, agent-driven]

# oc-code-auditor files sub-tickets for CRITICAL / HIGH findings only;
# oc-monitoring-ops files one per postmortem action item. Assignee is
# resolved from the map below against the area of the finding path.
create_child_tickets: true

remediation_owners:
  backend:  maya@onramp.dev
  frontend: priya@onramp.dev
  data:     yusuf@onramp.dev
  infra:    vee@onramp.dev

# Brokered-MCP escape hatch (protocol §1). OnRamp is not regulated, so the
# registry defaults win and this block stays empty.
tool_overrides: {}
`,
    },
    {
      id: "plat-5102",
      label: "PLAT-5102 — the source bug ticket, with the full agent thread",
      kind: "linear.md",
      body:
`# PLAT-5102 — API latency spike on customer-list pagination

**URL:** https://linear.app/onramp/issue/PLAT-5102
**Project:** Platform · **Cycle:** 2026-W19 · **Type:** Bug
**State:** Todo → In Progress (Linear branch automation, 09:31) → In Review (oc-git-ops, 09:31:48) → Done (oc-git-ops, on merge, 10:06:12)
**Priority:** High (P2) — SEV-3 oncall escalation · **Estimate:** 1 · **Reporter:** maya@onramp.dev (on-call) · **Assignee:** maya@onramp.dev
**Watchers:** maya@onramp.dev, ops-rotation@onramp.dev, vee@onramp.dev (infra), yusuf@onramp.dev (data)
**Labels:** \`bug\`, \`opchain\`, \`agent-driven\`, \`service:api/customers\`, \`from-pagerduty\`, \`priority-incident-linked\`
**PagerDuty incident:** PD-INC-018401 (acked at 09:13:11Z)
**Created:** 2026-05-08T09:14:22Z

## Description

PagerDuty alert \`api-latency-customers-p99\` fired at **09:13:08Z**, at the
close of the 5-minute window that opened with the **09:11:18Z** step-up,
during the 09:00-10:00Z Friday traffic ramp. P99 latency on
\`GET /api/customers?cursor=...\` jumped from ~120ms baseline to ~3.4s.
Error rate stayed at 0.0% across the window — this is a **slowdown, not
a 5xx burst.** Customer Success (lily@) reports the admin UI feels
sluggish too — that's the same query path.

The customer-list endpoint paginates by created-at cursor. Suspicion is
the composite index on \`(team_id, created_at)\` got dropped or
deactivated during yesterday's 2026-05-07 03:05Z migration cleanup, or
that the query planner flipped under load. The most recent prod ship is
**c4f8a21 at 2026-05-07 08:42Z (release v6.18.4 backend) — touches
unrelated paths, but it warrants a glance.**

**Runbook:** https://runbooks.onramp.dev/api-latency-investigation
**Dashboard:** https://oc-app.datadoghq.com/dashboard/onramp-api-customers

## Alert payload (verbatim from PagerDuty)

\`\`\`json
{
  "incident_id": "PD-INC-018401",
  "incident_key": "api-latency-customers-p99:api/customers",
  "service": { "id": "PS-PLAT-BACKEND", "name": "api/customers" },
  "urgency": "high",
  "severity": "warning",
  "status": "triggered",
  "created_at": "2026-05-08T09:13:08Z",
  "description": "api-latency-customers-p99 triggered on api/customers",
  "details": {
    "metric": "request_duration_p99",
    "endpoint": "/api/customers",
    "p99_observed_ms": 3412,
    "p99_threshold_ms": 800,
    "p95_observed_ms": 1910,
    "p95_threshold_ms": 500,
    "p50_observed_ms": 71,
    "window_seconds": 300,
    "window_opened_at": "2026-05-08T09:08:08Z",
    "request_count_in_window": 184,
    "error_rate": 0.0,
    "tenant_breakdown": {
      "acme-inc":     { "requests": 92, "p99_ms": 4880 },
      "midmarket-corp": { "requests": 41, "p99_ms": 2120 },
      "other_aggregated": { "requests": 51, "p99_ms": 980 }
    }
  },
  "links": [
    { "name": "Dashboard", "href": "https://oc-app.datadoghq.com/dashboard/onramp-api-customers" },
    { "name": "Runbook", "href": "https://runbooks.onramp.dev/api-latency-investigation" }
  ]
}
\`\`\`

## Dashboards (described)

### \`api/customers\` p99 latency (last 60 min)

The graph shows p99 holding at ~120ms steady-state from 08:00-09:11Z,
then **a sharp step-up at 09:11:18Z to ~3.4s** that plateaus through
the 09:13:08 alert fire. \`/api/health\` and the rest of \`/api/*\` are
unaffected, so the regression is endpoint-local. acme-inc's slice
(largest tenant by row count) sees ~50% worse latency than the
aggregated other-tenant slice — strong hint that the regression
scales with row count.

### Request volume (last 60 min)

Volume on \`/api/customers\` jumped from ~3 req/min overnight to
~37 req/min (≈ 0.62 rps) at 09:11Z — the ordinary Friday-morning ramp
as CS users log in. Not the cause; just the workload that exposes
whatever regressed.

### Postgres query timings (Datadog APM)

The \`SELECT FROM customers WHERE team_id=$1 AND created_at > $2 ORDER BY created_at LIMIT $3\`
query trace shows the same SQL string at 09:00Z executing in 8ms p99
and at 09:11Z executing in 2.4s p99. **The SQL didn't change; the
query plan did.** Almost certainly an index issue.

## Symptoms

- **p50** stable at ~70ms (no fixed alert; baseline OK — points away from a hot-path slowdown that hits every request)
- **p95** climbed from 180ms to **1.9s** (+955%)
- **p99** climbed from 300ms to **3.4s** (+1033%)
- **request rate** +20% over yesterday's same-hour baseline (ordinary ramp)
- **error rate** 0.0% (no 5xx, no timeouts in the 5min window; slow but completing)
- **per-tenant slope** correlates with row count (acme @ 108k rows is the worst)
- **downstream** customer-csv endpoint also slow (same query path)
- **no deploys** to this surface since 2026-05-07 08:42Z

## Reproduction

\`\`\`
$ curl -sS -w '\\n%{time_total}\\n' \\
    -H 'Authorization: Bearer ...' \\
    'https://oc-api.onramp.dev/api/customers?cursor=eyJjcmVhdGVkX2F0Ijoi...&limit=200'
[... 200 rows JSON ...]
3.18

$ curl -sS -w '\\n%{time_total}\\n' \\
    -H 'Authorization: Bearer ...' \\
    'https://staging.api.onramp.dev/api/customers?cursor=eyJjcmVhdGVkX2F0Ijoi...&limit=200'
[... 200 rows JSON ...]
0.07
\`\`\`

Staging (which still has the index) returns in 70ms; prod returns in 3.18s
on the same query against the same tenant data shape. **Confirms a
prod-specific regression.**

## EXPLAIN ANALYZE (snapshot from prod at 09:13Z)

\`\`\`
QUERY PLAN
─────────────────────────────────────────────────────────────────────────
 Limit  (cost=0.43..2410.18 rows=200 width=412) (actual time=2178.4..2391.2 rows=200 loops=1)
   ->  Sort  (cost=0.43..27412.18 rows=11200 width=412) (actual time=2178.4..2384.1 rows=200 loops=1)
         Sort Key: created_at DESC
         Sort Method: external merge  Disk: 28200kB
         ->  Seq Scan on customers  (cost=0.00..24010.18 rows=11200 width=412)
                                    (actual time=12.8..1841.6 rows=108442 loops=1)
               Filter: ((team_id = $1) AND (created_at > $2))
               Rows Removed by Filter: 0
 Planning Time: 0.382 ms
 Execution Time: 2398.214 ms
─────────────────────────────────────────────────────────────────────────
\`\`\`

**Seq Scan on customers.** That's the smoking gun — the planner is
scanning the full \`customers\` table and sorting on disk, instead of
walking the composite index. The expected plan (still observable on
staging):

\`\`\`
 Limit  (cost=0.43..23.14 rows=200 width=412) (actual time=0.024..1.823 rows=200 loops=1)
   ->  Index Scan Backward using idx_customers_team_id_created_at on customers
         Index Cond: ((team_id = $1) AND (created_at > $2))
\`\`\`

## Investigation (Maya, before filing — 09:13)

In the 90 seconds between page and filing:

1. Confirmed staging is unaffected (above).
2. Checked recent deploys via \`/api/health\`: prod SHA c4f8a21 (release v6.18.4) shipped 2026-05-07 08:42Z — touched \`worker/billing\` paths, **not** \`api/customers\`. Unlikely culprit on a per-line review.
3. Pulled the \`migrations/\` directory log:

\`\`\`
$ git log --oneline -10 -- migrations/
a221f08  2026-05-07 03:05  data: drop dupe indexes (cleanup)
8f3c7d2  2026-05-04 14:10  feat: customer.csv streaming
...
\`\`\`

The 03:05Z "drop dupe indexes" commit (data team) lands ~30 hours
before the symptoms. Either the drop migrated on prod without anyone
noticing the symptom (low traffic overnight + auto-vacuum keeping the
seq scan fast enough until the morning ramp), or the planner flipped
this morning for a different reason.

**Strong hypothesis:** the migration dropped \`idx_customers_team_id_created_at\`
thinking it was a duplicate of \`idx_customers_team_id\`. It's not — the
composite is what supports the cursor's compound predicate. We need it
back.

## Recent deploys (last 48h)

\`\`\`
2026-05-07T03:05Z  a221f08  data: drop dupe indexes (cleanup)            ← strong suspect
2026-05-07T08:42Z  c4f8a21  release v6.18.4 backend                       (unrelated paths)
\`\`\`

## Hypothesis ranking

| # | Hypothesis | Likelihood | Evidence |
|---|---|---|---|
| 1 | \`idx_customers_team_id_created_at\` dropped in 2026-05-07 03:05Z migration | HIGH | EXPLAIN shows Seq Scan; staging still has the index; the migration explicitly dropped "duplicate" indexes |
| 2 | Postgres autovacuum / stats drift causing planner to choose Seq Scan | MED | Possible but doesn't explain the staging/prod asymmetry |
| 3 | A row-count threshold flipped today (just crossed N where Seq Scan loses) | LOW | Doesn't explain the discontinuous jump; row-count changes are gradual |
| 4 | Worker memory pressure causing forced replan | LOW | No worker memory anomalies in the dashboards |

## Definition of done

- [x] Restore the composite index (forward-only migration; \`CREATE INDEX CONCURRENTLY\` to avoid blocking writes)
- [x] Verify prod query plan reverts to Index Scan
- [x] Regression test: a pytest assertion that the index exists and the planner reaches for it on the seeded dataset
- [ ] Alert tuned to fire on a single-tenant p99 > 800ms (rather than aggregate); catches the next regression sooner — deferred, not in scope for the hotfix
- [x] Postmortem published within 2h of resolution — n/a for PLAT-5102 (no customer-facing outage); PLAT-5104 got one
- [x] Remediation follow-up filed (PLAT-5107 — the other seven dropped indexes)

## Acceptance

- p99 back under 500ms on the customer-list endpoint within 30 min of fix deploy → **met** (118ms measured 10:39:24Z)
- query plan stable under sustained load (verified with k6 against staging post-fix) → **met**
- regression test in place (PR will fail CI if the plan reverts) → **met** (\`tests/regression/test_customer_list_plan.py\`)

## Comments

### 09:31:46Z · opchain-git-ops · PR opened

\`\`\`
<!-- opchain:oc-git-ops:pr-opened:#2243 -->
PR opened: https://github.com/onramp-inc/platform/pull/2243

fix(api): restore (team_id, created_at) composite index for paginate
Branch: fix/PLAT-5102-api-latency-spike-on-customer-list-pagi
Head:   3b91d4e

Scope held to customers only, per Maya at 09:22. The other seven
indexes a221f08 dropped are untouched by this PR.
bugcheck: pass (7/7, 0 warnings, 4.8s) — 2 failing rounds before it.
\`\`\`

### 09:41:52Z · opchain-code-auditor · pre-deploy audit

\`\`\`
<!-- opchain:oc-code-auditor:audit-posted:#2243 -->
Auditor: Grade A-.
Counts: CRITICAL 0, HIGH 0, MEDIUM 0, LOW 1, ADVISORY 0
Top three (by severity × exploitability):
  1. services/customers.ts:88-104 — cursor query names no index in
     comments or types; the next "duplicate index cleanup" has nothing
     to read before it drops one
Full report: .checkpoints/oc-code-auditor.checkpoint.json
\`\`\`

No sub-ticket filed: LOW findings stay in the report (\`pm.yaml\`
\`create_child_tickets\` applies to CRITICAL / HIGH only).

### 10:04:31Z · vee@onramp.dev · review

\`\`\`
Approved. One thing for the follow-up, not this PR: the down-migration
drops CONCURRENTLY too, which means a rollback also can't run in a
transaction. Fine here, worth a line in migrations/README.md.
\`\`\`

### 10:06:12Z · opchain-git-ops · PR merged

\`\`\`
<!-- opchain:oc-git-ops:pr-merged:#2243 -->
Merged: https://github.com/onramp-inc/platform/pull/2243
Squash merge → ea71b9c on main
Subject: fix(api): restore (team_id, created_at) composite index for paginate (#2243)

Transitioned: Done.
\`\`\`

### 10:42:11Z · opchain-deploy-ops · shipped to prod (deferred 10:40:37, flushed 10:42:11)

\`\`\`
<!-- opchain:oc-deploy-ops:linked-shipped:PLAT-5103:PLAT-5102 -->

Shipped to prod via deploy PLAT-5103 (release v6.18.5, ea71b9c).

[Deferred at 10:40:37Z — Linear returned 503 on save_comment;
 3/3 attempts exhausted inside the 15s budget. Flushed by
 /oc-deploy --retry-pm at 10:42:11Z. Ticket was already Done
 from the merge at 10:06:12Z; no transition was attempted here.
 See oc-deploy-ops.checkpoint.json pm_flush_log[].]
\`\`\`

### 10:44:02Z · maya@onramp.dev

\`\`\`
Confirmed on dashboards. p99 back to ~118ms across all tenants;
acme-inc slice down from 4.88s to 131ms. Closing this out.
\`\`\`

## Activity log

\`\`\`
2026-05-08 09:11:18  monitoring       latency p99 first elevation observed
2026-05-08 09:13:08  pagerduty        alert fired (5-min window closed)
2026-05-08 09:13:11  maya@            PagerDuty ack
2026-05-08 09:14:22  maya@            PLAT-5102 created (Todo, P2, est 1)
2026-05-08 09:14:23  maya@            labeled "bug", "service:api/customers", "from-pagerduty"
2026-05-08 09:14:24  maya@            added to cycle 2026-W19
2026-05-08 09:14:25  maya@            self-assigned
2026-05-08 09:31:02  oc-git-ops       get_issue (read; no write)
2026-05-08 09:31:14  linear-github    branch fix/PLAT-5102-... detected → Todo → In Progress
2026-05-08 09:31:46  oc-git-ops       comment: pr-opened:#2243
2026-05-08 09:31:48  oc-git-ops       state transitioned: In Progress → In Review
2026-05-08 09:41:52  oc-code-auditor  comment: audit-posted:#2243 (Grade A-)
2026-05-08 10:04:31  vee@             review approved
2026-05-08 10:06:12  oc-git-ops       comment: pr-merged:#2243 → state transitioned: Done
2026-05-08 10:40:37  oc-deploy-ops    linked-shipped comment DEFERRED (Linear 503)
2026-05-08 10:42:11  oc-deploy-ops    linked-shipped comment flushed (--retry-pm)
2026-05-08 10:44:02  maya@            confirmation comment
\`\`\`

Checkpoint reference: \`.checkpoints/oc-git-ops.checkpoint.json\` →
\`skill_state.merged_prs[]\`.
`,
    },
    {
      id: "bugcheck-runs",
      label: "oc-bug-check — three rounds before the commit was allowed",
      kind: "test-round.md",
      body:
`# oc-bug-check — pre-commit gate, PLAT-5102

Invoked by \`oc-git-sync\` step 6. **FAIL aborts the sync**, so the commit
does not exist until round 3. Config: \`.bugcheck.json\` (lenient mode,
7 checks: type-safety, lint, tests, anti-pattern scan, secret detection,
build verification, dependency audit).

---

## Round 1 — 09:24:06Z

\`\`\`
BUG CHECK — FAIL ❌
━━━━━━━━━━━━━━━━━━━━
  ❌ Tests: 1 failing
     tests/conftest.py::apply_migrations — psycopg.errors.ActiveSqlTransaction:
       CREATE INDEX CONCURRENTLY cannot run inside a transaction block
       CONTEXT: migrations/20260508143000_restore_paginate_index.sql:2

  6 checks passed, 1 failed (11.2s).
  Fix these before committing. Run /oc-bugcheck fix for auto-fixable issues.
\`\`\`

**Not auto-fixable.** \`dbmate\` wraps each migration in a transaction by
default, and \`CREATE INDEX CONCURRENTLY\` is one of the handful of
Postgres statements that refuses to run inside one. The test fixture
applies migrations against the ephemeral test database, so it fails
before a single assertion runs.

**Fix:** declare the migration non-transactional.

\`\`\`diff
--- a/migrations/20260508143000_restore_paginate_index.sql
+++ b/migrations/20260508143000_restore_paginate_index.sql
--- migrate:up
+-- migrate:up transaction:false
 CREATE INDEX CONCURRENTLY IF NOT EXISTS
   idx_customers_team_id_created_at
   ON customers (team_id, created_at DESC);

--- migrate:down
+-- migrate:down transaction:false
 DROP INDEX CONCURRENTLY IF EXISTS idx_customers_team_id_created_at;
\`\`\`

---

## Round 2 — 09:27:41Z

\`\`\`
BUG CHECK — FAIL ❌
━━━━━━━━━━━━━━━━━━━━
  ❌ Tests: 1 failing
     tests/regression/test_customer_list_plan.py::test_planner_uses_composite_index_after_fix
       AssertionError: Expected Index Scan on idx_customers_team_id_created_at
       (got Seq Scan; 240 seeded rows)

  6 checks passed, 1 failed (9.7s).
  Fix these before committing. Run /oc-bugcheck fix for auto-fixable issues.
\`\`\`

**The migration is fine; the test was wrong.** On a fixture table of 240
rows a sequential scan genuinely is the cheaper plan, so Postgres picks
it whether or not the index exists — the assertion was measuring the
fixture size, not the schema. The original version had a second bug: it
matched on the string \`"Seq Scan on customers"\`, which never appears in
\`EXPLAIN (FORMAT JSON)\` — the node is \`"Node Type": "Seq Scan"\` with
\`"Relation Name": "customers"\` — so that assert passed vacuously.

**Fix:** assert the two things that are actually invariant — the index
exists, and the planner reaches for *that* index when the cost model
isn't allowed to prefer a seq scan.

\`\`\`diff
+    db.execute("SET LOCAL enable_seqscan = off")
-    assert _find_node_type(node, "Seq Scan on customers") is None
-    assert _find_node_type(node, "Index Scan") is not None
+    hits = [n for n in _walk(plan[0]["Plan"])
+            if n["Node Type"].startswith("Index")
+            and n.get("Index Name") == INDEX]
+    assert hits, f"planner chose {[n['Node Type'] for n in _walk(plan[0]['Plan'])]}"
\`\`\`

---

## Round 3 — 09:30:52Z

\`\`\`
BUG CHECK — PASS ✅
━━━━━━━━━━━━━━━━━━━━
  7 checks passed (4.8s)
  Proceeding to commit.
\`\`\`

\`\`\`
  type-safety     tsc --noEmit                       PASS  (1.9s)
  lint            eslint . --ext .ts                 PASS  (1.1s)
  tests           vitest run                         PASS  153 passed (0.9s, cached)
                  pytest tests/regression            PASS  1 passed (0.4s)
  anti-patterns   0 console.log, 0 new TODO          PASS
  secrets         gitleaks protect --staged          PASS  0 findings
  build           npm run build                      PASS  (0.3s, cached)
  deps            npm audit --omit=dev               PASS  0 high, 0 critical
\`\`\`

Commit footer written by oc-git-ops:

\`\`\`
bugcheck: pass (7/7, 0 warnings, 4.8s)
\`\`\`

Checkpoint: \`.checkpoints/oc-bug-check.checkpoint.json\` →
\`skill_state.last_run\` = \`{ verdict: "pass", rounds: 3, sha: "3b91d4e" }\`.
`,
    },
    {
      id: "pr-2243",
      label: "PR #2243 — [PLAT-5102] restore composite index",
      kind: "pull-request",
      body:
`# onramp-inc/platform#2243

**Branch:** \`fix/PLAT-5102-api-latency-spike-on-customer-list-pagi\` → \`main\`
**Head:** \`3b91d4e\` · **Opened:** 2026-05-08T09:31:39Z by maya@onramp.dev (via oc-git-ops)
**Reviewer:** vee@onramp.dev — approved 10:04:31Z
**Merged:** 2026-05-08T10:06:08Z · squash → \`ea71b9c\`
**Files:** 3 changed, +48 −1

## Commit on the branch

\`\`\`
commit 3b91d4e0f2a71c9d8e3b5a1f77c20ad4e9b6f831
Author: Maya Okonkwo <maya@onramp.dev>
Date:   Fri May 8 09:30:58 2026 +0000

    fix(api): restore (team_id, created_at) composite index for paginate

    a221f08 dropped idx_customers_team_id_created_at as a presumed
    duplicate of idx_customers_team_id. It is not a duplicate: the
    cursor query filters on team_id AND created_at and orders by
    created_at, which only the composite can serve. Without it the
    planner falls back to a seq scan over 108k rows plus an external
    merge sort — 3.4s p99 against a 120ms baseline.

    Forward-only. CREATE INDEX CONCURRENTLY, declared non-transactional
    so dbmate does not wrap it. Scope deliberately limited to customers;
    the other seven indexes a221f08 dropped are tracked separately.

    Refs: PLAT-5102

    bugcheck: pass (7/7, 0 warnings, 4.8s)
\`\`\`

---

## Summary

Restores the composite index that yesterday's "drop dupe indexes"
migration removed, and adds a regression test so CI fails if the
planner ever stops reaching for it. No application-code change: the
worker is identical before and after, which is why the rollback plan
says leave the index and revert the worker if anything goes sideways.

**Linked ticket:** [PLAT-5102](https://linear.app/onramp/issue/PLAT-5102)

## Changes

### Fixes
- \`fix(api): restore (team_id, created_at) composite index for paginate\` (\`3b91d4e\`)

### Files
| File | +/− | What |
|---|---|---|
| \`migrations/20260508143000_restore_paginate_index.sql\` | +7 | \`CREATE INDEX CONCURRENTLY\`, \`transaction:false\` on both directions |
| \`tests/regression/test_customer_list_plan.py\` | +40 | index-exists + plan-shape assertions |
| \`migrations/README.md\` | +1 −1 | index inventory row for \`idx_customers_team_id_created_at\` |

## Documentation

*Inserted from the oc-docs-forge packet (\`/oc-docs pr\`, 09:31:24Z).*

No user-facing documentation changed: this PR adds no endpoint, no
field, no config key, and no behaviour a customer can observe. One
internal doc did change — \`migrations/README.md\` carries the index
inventory that a221f08 read before deciding which indexes were
duplicates, and it had no row for this composite. That omission is the
proximate cause of the drop, so the row is part of the fix rather than
a follow-up.

## Testing

- [x] Unit tests pass (\`npm test\` — 153 passed)
- [x] Type check passes (\`tsc --noEmit\`)
- [x] New regression test passes (\`pytest tests/regression\` — 1 passed)
- [x] Manual testing completed (staging EXPLAIN reverts to \`Index Scan Backward\`)

oc-bug-check ran three rounds: two FAIL, one PASS. See the bug-check
artifact for the two failures and their fixes.

## Audit Status

Pre-deploy audit: Grade A-, 1 finding (0 addressed in this PR — the
single LOW finding is a docstring on \`services/customers.ts\`, which is
deliberately out of scope for a hotfix). oc-docs-forge packet ✓ ·
oc-repo-ops verdict PASS.

## Deployment Notes

- **Migration:** 1, forward-only, non-transactional. \`npm run migrate\`
  must be run **before** \`wrangler deploy\`; the index is additive so the
  old worker is safe against the new schema.
- **Expected build time:** ~45-90s on prod's \`customers\` table
  (108k rows). \`CONCURRENTLY\` takes a ShareUpdateExclusiveLock, not an
  AccessExclusiveLock — writes are not blocked.
- **Env / config changes:** none. **Dependencies:** none.
- **Rollback:** revert the worker, leave the index. Dropping the index
  returns prod to the slow state.

Refs: PLAT-5102
`,
    },
    {
      id: "audit-report",
      label: "Code Audit Report — pre-deploy on #2243",
      kind: "audit.md",
      body:
`# Code Audit Report — onramp/platform

**Scope:** pre-deploy · **Target:** PR #2243 @ \`3b91d4e\`
**Findings:** 0 CRITICAL · 0 HIGH · 0 MEDIUM · 1 LOW · 0 ADVISORY
**Overall health:** **A-** — the change is two files and one statement;
the deduction is for shipping a fix whose failure mode is invisible to
the next reader of the code it protects.
**Run:** 2026-05-08T09:41:43Z → 09:41:52Z (9.2s) · **Files reviewed:** 3

## Findings (ordered by severity, then fix effort)

### [F-001] Cursor query does not name the index it depends on

**Severity:** LOW
**Category:** quality
**Location:** \`services/customers.ts:88-104\`
**Fix effort:** S (< 30 min)

**Problem:**
\`listCustomersPage()\` builds the cursor predicate
(\`team_id = $1 AND created_at > $2 ORDER BY created_at DESC\`) with no
comment, type, or test naming \`idx_customers_team_id_created_at\`. The
index and its only consumer live in different directories and reference
each other nowhere. This is precisely the read that a221f08 performed
before concluding the composite was a duplicate of \`idx_customers_team_id\`.
The new regression test closes the CI hole; it does not close the
reading hole.

**Evidence:**
\`\`\`ts
// services/customers.ts:88
const rows = await sql\`
  SELECT id, name, created_at FROM customers
  WHERE team_id = \${teamId} AND created_at > \${cursor}
  ORDER BY created_at DESC LIMIT \${limit}
\`;
\`\`\`
\`\`\`
$ rg -n 'idx_customers_team_id_created_at' services/ types/
(no matches)
$ rg -n 'idx_customers_team_id_created_at' migrations/ tests/
migrations/20260508143000_restore_paginate_index.sql:3
migrations/README.md:22
tests/regression/test_customer_list_plan.py:11
\`\`\`

**Suggested fix:** one comment above the query naming the index and
linking the regression test. Not filed as a sub-ticket — \`pm.yaml\`
\`create_child_tickets\` files CRITICAL and HIGH only; MEDIUM and LOW
stay in this report.

## Checks

\`\`\`
type-check        tsc --noEmit                    PASS
lint              eslint . --ext .ts              PASS
tests             153 existing + 1 new            PASS  0 failing
coverage (new)    1 statement, 1 test             100%
migration safety  non-transactional declared      PASS
                  forward-only, additive          PASS
                  down-migration present          PASS
secret scan       gitleaks                        PASS  0
\`\`\`

## Recommended Fix Order

1. **F-001** — after the hotfix ships. It is documentation, it touches a
   file this PR does not, and pulling it in now widens the diff a human
   is reviewing under incident pressure.

## Evaluator scores

\`\`\`json
{
  "eval_scores": [
    {
      "round": 1,
      "sha": "3b91d4e",
      "scope": "pre-deploy",
      "score": 9.0,
      "grade": "A-",
      "deductions": [
        { "id": "F-001", "severity": "LOW", "points": 1.0,
          "why": "fix is correct but leaves no trace at the call site" }
      ],
      "scored_at": "2026-05-08T09:41:52Z"
    }
  ]
}
\`\`\`

Checkpoint: \`.checkpoints/oc-code-auditor.checkpoint.json\` ·
\`updated_at\` 2026-05-08T09:41:52Z (the timestamp the oc-deploy-ops gate
reads at 10:36 to decide whether to re-run).
`,
    },
    {
      id: "deploy-ticket",
      label: "PLAT-5103 — auto-created deploy ticket (oc-deploy-ops)",
      kind: "linear.md",
      body:
`# PLAT-5103 — Deploy: prod c4f8a21..ea71b9c

**URL:** https://linear.app/onramp/issue/PLAT-5103
**Project:** Platform · **Type:** Deploy · **State:** Staging verified → Shipped
**Priority:** High (auto-elevated from parent priority) · **Reporter:** opchain-deploy-ops (bot) · **Assignee:** maya@onramp.dev
**Parent:** [PLAT-5102](https://linear.app/onramp/issue/PLAT-5102)
**Labels:** \`opchain\`, \`agent-driven\`, \`deploy\`, \`environment:prod\`, \`hotfix\`
**Watchers:** maya@onramp.dev, ops-rotation@onramp.dev, lily@onramp.dev
**Created:** 2026-05-08T10:08:14Z · **Closed:** 2026-05-08T10:42:08Z

## Description

\`\`\`
<!-- opchain:oc-deploy-ops:deploy-created:prod:ea71b9c -->

Environment:     prod (via staging)
Range:           c4f8a21..ea71b9c
Commits:         1
Linked tickets:  PLAT-5102
Audit gate:      PASS (grade A-)
Bug-check:       PASS
Smoke tests:     PASS (4/4 staging 10:14:02Z, 4/4 prod 10:39:31Z)
\`\`\`

\`Smoke tests\` read \`pending\` from creation until 10:42:06Z — the
description patch was one of the four writes Linear 503'd on at 10:40
and it landed with the rest of the flush.

Beyond the template block:

\`\`\`
Migrations:      1 (forward-only; CREATE INDEX CONCURRENTLY, transaction:false)
Env / config:    0 changes
Dependencies:    0 added, 0 removed, 0 updated
Risk band:       LOW-MED (concurrent index build; observable lock window but non-blocking)
Rollback:        revert worker, leave index (see below)
\`\`\`

## Commit range

| SHA | Subject | Author | Ticket refs |
|---|---|---|---|
| \`ea71b9c\` | fix(api): restore (team_id, created_at) composite index for paginate (#2243) | maya@ | PLAT-5102 |

Squash merge of #2243 (branch head \`3b91d4e\`) onto \`main\` at 10:06:08Z.

## Migrations applied

\`\`\`sql
-- migrations/20260508143000_restore_paginate_index.sql
-- migrate:up transaction:false
CREATE INDEX CONCURRENTLY IF NOT EXISTS
  idx_customers_team_id_created_at
  ON customers (team_id, created_at DESC);

-- migrate:down transaction:false
DROP INDEX CONCURRENTLY IF EXISTS idx_customers_team_id_created_at;
\`\`\`

**Risk note:** \`CONCURRENTLY\` takes a ShareUpdateExclusiveLock rather
than the AccessExclusiveLock a plain \`CREATE INDEX\` would take. The lock
is observable in \`pg_stat_activity\` but **does not block writes.**
\`transaction:false\` is mandatory — dbmate wraps migrations in a
transaction by default and Postgres refuses \`CONCURRENTLY\` inside one.

## Migration run log

\`\`\`
staging · 2026-05-08T10:09:14Z
$ npm run migrate -- --env staging
Applying: 20260508143000_restore_paginate_index (transaction:false)
  pg_stat_progress_create_index:
    phase=building index: scanning table     2,714 / 2,714 blocks   28s
    phase=waiting for writers before validation                      6s
    phase=index validation: scanning index                           7s
Applied 20260508143000_restore_paginate_index in 41.310s
1 migration applied.

prod · 2026-05-08T10:37:06Z
$ npm run migrate -- --env production
Applying: 20260508143000_restore_paginate_index (transaction:false)
  pg_stat_progress_create_index:
    phase=building index: scanning table    41,902 / 41,902 blocks   47s
    phase=waiting for writers before validation                      9s
    phase=index validation: scanning index                          11s
Applied 20260508143000_restore_paginate_index in 67.412s
1 migration applied.
\`\`\`

Staging's \`customers\` table is ~6k rows against prod's 108k; the 41s →
67s ratio is build overhead, not row count, which is why the staging
number was a usable estimate and not a scaled one.

## Env / config changes

None.

## Dependencies

\`\`\`
$ npm diff c4f8a21..ea71b9c -- package-lock.json
(no changes)
\`\`\`

## Audit gate output (verbatim)

\`\`\`
[oc-code-auditor] node scripts/checkpoint.mjs status oc-code-auditor
  updated_at:        2026-05-08T09:41:52Z
  age at gate:       55m  (< 1h → reuse, no re-run)
  grade:             A-
  findings:          0 CRITICAL / 0 HIGH / 0 MEDIUM / 1 LOW
  verdict:           PASS

[oc-security-auditor] node scripts/checkpoint.mjs status oc-security-auditor
  updated_at:        2026-05-05T14:02:00Z
  age at gate:       68h  (> 24h → outside reuse window)
  → Skill(oc-security-auditor, "/oc-security pre-deploy")
  scope:             migrations + public surface delta
  surface delta:     0 new routes, 0 auth changes, 0 env vars
  STRIDE findings:   0 new
  verdict:           PASS (6.1s)

[conditional rows]
  .opchain/hardening.yaml   absent → oc-security-hardening row skipped
  .opchain/compliance.yaml  absent → oc-compliance-ops row skipped
  → two-audit gate

[oc-bug-check] last run 09:30:52Z on 3b91d4e — PASS (7/7, 0 warnings, 4.8s)
\`\`\`

## Pre-flight (staging)

\`\`\`
$ npm ci
added 812 packages in 19s
$ npx tsc --noEmit
$ npx vitest run
 Test Files  31 passed (31)
      Tests  153 passed (153)
   Duration  6.41s
$ pytest tests/regression -q
1 passed in 0.41s
\`\`\`

## Smoke tests (staging, 10:14:02Z)

\`\`\`
$ curl -fsS https://staging.api.onramp.dev/api/health | jq -r '.version'
ea71b9c
  ✅ API health: 200

$ hey -n 200 -c 5 -H 'Authorization: Bearer ...' \\
    'https://staging.api.onramp.dev/api/customers?cursor=...&limit=200'
  Requests/sec: 62.8
  Latency distribution:
    50% in 0.0612 secs
    95% in 0.0794 secs
    99% in 0.0843 secs
  Status code distribution: [200] 200 responses
  ✅ customer-list p99 84ms (prod baseline pre-fix: 3.41s)

$ curl -fsS 'https://staging.api.onramp.dev/api/customers.csv?limit=200' | head -c 3 | xxd
00000000: efbb bf                                  ...
  ✅ csv endpoint: 200, BOM intact

$ k6 run --vus 5 --duration 60s scripts/k6-customer-list.js
     checks.........................: 100.00% ✓ 481  ✗ 0
     http_req_duration..............: avg=79.4ms p(95)=142ms p(99)=198ms
     http_reqs......................: 481   8.01/s
  ✅ 8.0 rps sustained ≈ 13× the 0.62 rps Friday-morning peak

4 / 4 PASS.
\`\`\`

k6 runs at 5 VUs, not 50. Fifty would be ~80 rps — 130× production — which
tells you about staging's Postgres box, not about this index.

## Watch list (post-deploy)

| Dashboard / Alert | URL | Why |
|---|---|---|
| \`api/customers\` p99 latency | https://oc-app.datadoghq.com/dashboard/onramp-api-customers | The regression dashboard; this is what should drop to baseline |
| Postgres index-build status | https://oc-app.datadoghq.com/.../postgres-locks | \`pg_stat_progress_create_index\`; expected to clear inside 90s |
| \`api-latency-customers-p99\` alert | (existing) | Should auto-resolve once latency clears the threshold |
| Worker memory | https://dash.cloudflare.com/.../worker-analytics | Sanity check (none expected) |
| Sentry — \`PLAT-5102\` tag | https://sentry.io/onramp/issues/?query=tag:PLAT-5102 | Any related exceptions |

## Rollback plan

If post-deploy regression observed within 30 minutes:

\`\`\`bash
# 1. Revert the worker to the recorded previous version.
npx wrangler rollback 9f2c71a4-0d3b-4e8a-9c12-5b7a4e610d88
# 2. Only if the index itself is implicated (it is additive; it should not be):
npm run migrate -- --env production --down 20260508143000
\`\`\`

**Important:** rolling back the worker without dropping the index is
fine — the index helps regardless of which worker version is running,
and the worker change in \`ea71b9c\` is a docs line and a test. Dropping
the index alone returns us to the 3.4s state, which is worse than
current. **If in doubt, leave the index, revert the worker.**

## Comments

### 10:08:14Z · opchain-deploy-ops · staging deploy starting

\`\`\`
Auto-created. Audit gate clean (grade A-). 1 commit; 1 linked ticket.
1 migration (concurrent index build, non-transactional).
Beginning staging deploy.
\`\`\`

### 10:14:02Z · opchain-deploy-ops · staging-verified

\`\`\`
<!-- opchain:oc-deploy-ops:staging-verified:PLAT-5103 -->

Smoke tests PASS (4/4):
  - GET /api/health · 200 · version ea71b9c
  - GET /api/customers?cursor=... · 200 req sample, p99 84ms
  - GET /api/customers.csv · 200 · BOM intact
  - k6 5 VUs / 60s · 8.0 rps · p99 198ms

Migration applied in 41.3s. Plan on staging is
Index Scan Backward using idx_customers_team_id_created_at.

Transitioned: Staging verified.
URL: https://staging.api.onramp.dev
\`\`\`

### 10:36:41Z · maya@ · approving prod

\`\`\`
Index built clean on staging in 41s and the plan flipped. partner-x is
green and the replay queue is drained, so we're not promoting on top of
a live incident. Approving the prod promotion.
\`\`\`

### 10:42:04Z · opchain-deploy-ops · prod-shipped (deferred 10:39:52, flushed 10:42:04)

\`\`\`
<!-- opchain:oc-deploy-ops:prod-shipped:PLAT-5103 -->

PROD SHIP · ea71b9c · v6.18.5
URL: https://oc-api.onramp.dev
Cloudflare version: 1c0b4a77-6f51-4b2e-b3a9-8d2f0e714c35
Previous version:   9f2c71a4-0d3b-4e8a-9c12-5b7a4e610d88 (retained for rollback)

Migration applied in 67.4s (10:37:06 → 10:38:13). Worker deployed at
10:38:25; /api/health returned 200 with ea71b9c at 10:38:31.

First EXPLAIN after the build completed (10:39:04) is
Index Scan Backward using idx_customers_team_id_created_at.
200-request sample at 10:39:24: p50 64ms / p95 108ms / p99 118ms.
acme-inc slice at 10:39:31: p99 131ms (was 4.88s).

The latency recovery is the index, not the deploy — the worker bytes in
ea71b9c change a doc line and a test. Timed from build completion, not
from traffic shift.

[Deferred at 10:39:52Z — Linear returned 503 on save_comment;
 3/3 attempts exhausted inside the 15s budget. Flushed by
 /oc-deploy --retry-pm at 10:42:04Z.]
\`\`\`

### 10:42:30Z · maya@

\`\`\`
Confirmed on dashboards. p99 back to ~118ms across all tenants.
acme-inc slice down from 4.88s to 131ms.
\`\`\`

## Activity log

\`\`\`
2026-05-08 10:08:14  oc-deploy-ops   created (staging deploy starting)
2026-05-08 10:08:52  oc-deploy-ops   staging build complete (34s)
2026-05-08 10:09:55  oc-deploy-ops   staging migration applied (41.3s)
2026-05-08 10:14:02  oc-deploy-ops   state transitioned: → Staging verified
2026-05-08 10:36:41  maya@           prod promotion approved (explicit)
2026-05-08 10:36:52  oc-deploy-ops   prod deploy invoked
2026-05-08 10:38:13  oc-deploy-ops   prod migration applied (67.4s)
2026-05-08 10:38:25  oc-deploy-ops   worker deployed (8.9s)
2026-05-08 10:39:52  oc-deploy-ops   prod-shipped comment DEFERRED (Linear 503)
2026-05-08 10:40:07  oc-deploy-ops   description patch DEFERRED (Linear 503)
2026-05-08 10:40:22  oc-deploy-ops   Shipped transition DEFERRED (Linear 503)
2026-05-08 10:40:37  oc-deploy-ops   linked-shipped comment DEFERRED (Linear 503)
2026-05-08 10:40:41  oc-monitoring-ops  /oc-monitor verify → ok
2026-05-08 10:42:03  oc-deploy-ops   /oc-deploy --retry-pm flush pass start
2026-05-08 10:42:04  oc-deploy-ops   prod-shipped comment posted (1/4)
2026-05-08 10:42:06  oc-deploy-ops   description patched: Smoke tests PASS (2/4)
2026-05-08 10:42:08  oc-deploy-ops   state transitioned: → Shipped (3/4)
2026-05-08 10:42:11  oc-deploy-ops   linked-shipped comment posted on PLAT-5102 (4/4)
\`\`\`

PLAT-5102 was **not** transitioned here — oc-git-ops moved it to Done at
the merge (10:06:12Z). Deploy-ops's obligation to a linked ticket is the
\`linked-shipped\` comment, nothing more.

## Linked

- parent: [PLAT-5102 — API latency spike on customer-list pagination](https://linear.app/onramp/issue/PLAT-5102)
- pull-request: https://github.com/onramp-inc/platform/pull/2243
- merge: #2243 squash → \`ea71b9c\` (2026-05-08T10:06:08Z)
- post-deploy verify: \`.checkpoints/oc-monitoring-ops.checkpoint.json\` → \`skill_state.last_verify\` (10:40:41Z, ok)

Checkpoint: \`.checkpoints/oc-deploy-ops.checkpoint.json\` →
\`skill_state.pm.deploy_tickets[]\`.
`,
    },
    {
      id: "deploy-prod-log",
      label: "/oc-deploy prod — the 10:36Z console, verbatim",
      kind: "console",
      body:
`\`\`\`
$ /oc-deploy prod

oc-deploy-ops · production promotion · onramp/platform
────────────────────────────────────────────────────────────────

[10:36:52] Pre-promotion checklist
  1. staging smoke tests passed .......... yes (PLAT-5103, 10:14:02Z)
  2. code audit clear (no CRITICAL) ...... yes
  3. user explicitly confirms ............ yes (maya@, 10:36:41Z)

[10:36:53] Audit gate
  $ node scripts/checkpoint.mjs status oc-code-auditor
    updated_at 2026-05-08T09:41:52Z · age 55m (< 1h) → reuse
    grade A- · 0 CRITICAL / 0 HIGH / 0 MEDIUM / 1 LOW → PASS
  $ node scripts/checkpoint.mjs status oc-security-auditor
    updated_at 2026-05-05T14:02:00Z · age 68h (> 24h) → re-run
    Skill(oc-security-auditor, "/oc-security pre-deploy")
    scope: migrations · surface delta 0 routes / 0 auth / 0 env
    0 new STRIDE findings → PASS (6.1s)
  .opchain/hardening.yaml  absent → row skipped
  .opchain/compliance.yaml absent → row skipped
  gate: PASS (two-audit)

[10:36:58] $ git checkout main && git pull origin main
  Already on 'main'
  Updating c4f8a21..ea71b9c
  Fast-forward
   migrations/20260508143000_restore_paginate_index.sql |  7 +++
   migrations/README.md                                 |  2 +-
   tests/regression/test_customer_list_plan.py          | 40 ++++++++++
   3 files changed, 48 insertions(+), 1 deletion(-)

[10:37:02] $ PREV_VERSION=\$(npx wrangler deployments list --json | ...)
  PREV_VERSION=9f2c71a4-0d3b-4e8a-9c12-5b7a4e610d88   (c4f8a21, v6.18.4)

[10:37:06] $ npm run migrate -- --env production
  Applying: 20260508143000_restore_paginate_index (transaction:false)
    building index: scanning table ....... 41,902 / 41,902 blocks   47s
    waiting for writers before validation ....................... 9s
    index validation: scanning index ........................... 11s
  Applied in 67.412s
  1 migration applied.                                  [10:38:13]

[10:38:16] $ npx wrangler deploy
  Total Upload: 412.08 KiB / gzip: 91.44 KiB
  Uploaded onramp-api (6.12 sec)
  Published onramp-api (2.78 sec)
    https://oc-api.onramp.dev
  Current Version ID: 1c0b4a77-6f51-4b2e-b3a9-8d2f0e714c35   [10:38:25]

[10:38:31] $ curl -fsS -w ' %{http_code} %{time_total}\\n' https://oc-api.onramp.dev/api/health
  {"status":"ok","checks":{"postgres":"ok","kv":"ok"},"version":"ea71b9c","timestamp":"2026-05-08T10:38:31Z"} 200 0.09

[10:39:04] $ psql "\$DATABASE_URL" -c 'EXPLAIN (ANALYZE, FORMAT TEXT) <paginate query>'
   Limit  (cost=0.42..21.88 rows=200 width=412) (actual time=0.031..1.914 rows=200 loops=1)
     ->  Index Scan Backward using idx_customers_team_id_created_at on customers
           Index Cond: ((team_id = \$1) AND (created_at > \$2))
   Execution Time: 2.104 ms
  → plan flipped. Timing the recovery from build completion (10:38:13),
    not from traffic shift — the worker change is inert for latency.

[10:39:24] $ hey -n 200 -c 5 -H 'Authorization: Bearer ...' '<prod customer-list>'
    50% in 0.0641 secs
    95% in 0.1082 secs
    99% in 0.1184 secs
  [200] 200 responses
[10:39:31] tenant slice acme-inc: p99 131ms (pre-fix 4.88s)

[10:39:38] PM writes · provider linear · protocol §2 retry policy
  1/4 save_comment PLAT-5103 <!-- ...prod-shipped:PLAT-5103 -->
      10:39:38.1 → 503   +1.0s → 503   +3.1s → 503   budget 14.6s
      DEFERRED 10:39:52.7  retriable: true
  2/4 save_issue PLAT-5103 (description patch: Smoke tests → PASS)
      10:39:52.9 → 503   +1.0s → 503   +3.0s → 503   budget 14.6s
      DEFERRED 10:40:07.5  retriable: true
  3/4 transition PLAT-5103 → "Shipped"
      10:40:07.7 → 503   +1.1s → 503   +3.2s → 503   budget 14.6s
      DEFERRED 10:40:22.3  retriable: true
  4/4 save_comment PLAT-5102 <!-- ...linked-shipped:PLAT-5103:PLAT-5102 -->
      10:40:22.5 → 503   +1.0s → 503   +3.1s → 503   budget 14.6s
      DEFERRED 10:40:37.1  retriable: true

  Note: PLAT-5102 is already Done (oc-git-ops, 10:06:12Z). No transition
  attempted on it — the linked-ticket obligation is the comment only.

[10:40:41] Skill(oc-monitoring-ops, "/oc-monitor verify")
  uptime monitor  onramp-api-prod   sees version ea71b9c        ok
  error tracking  Sentry release    ea71b9c tagged, 0 new issues ok
  slo             api-latency-customers-p99  no new SLO needed   ok
  alert           api-latency-customers-p99  auto-resolved 10:39:48Z
  → skill_state.last_verify = { at: "10:40:41Z", result: "ok" }

────────────────────────────────────────────────────────────────
PROD SHIP OK · ea71b9c · v6.18.5 · version 1c0b4a77
  migration 67.4s · deploy 8.9s · health 200 · p99 118ms

⚠ Linear is currently unreachable; 4 PM writes were deferred. The
  deploy itself is fine — ea71b9c is live and serving. Run
  /oc-deploy --retry-pm to flush, or they go on the next pipeline pass.

  deferred 4 — run /oc-deploy --retry-pm
\`\`\`
`,
    },
    {
      id: "incident-ticket",
      label: "PLAT-5104 — incident ticket (oc-monitoring-ops, unrelated)",
      kind: "linear.md",
      body:
`# PLAT-5104 — Incident: webhook-replay queue depth alert

**URL:** https://linear.app/onramp/issue/PLAT-5104
**Project:** Platform · **Type:** Incident · **Severity:** SEV3 · **State:** In Progress → Resolved (PM pending) → Done
**Priority:** High (auto) · **Reporter:** opchain-monitoring-ops (bot) · **Assignee:** maya@onramp.dev (on-call)
**Parent:** [PLAT-5103](https://linear.app/onramp/issue/PLAT-5103) (most recent open deploy — likely-culprit link, ultimately unrelated)
**Labels:** \`opchain\`, \`agent-driven\`, \`incident\`, \`service:worker/webhooks\`, \`severity:SEV3\`, \`upstream-caused\`, \`postmortem-required\`
**Watchers:** maya@onramp.dev, vee@onramp.dev (infra), ops-rotation@onramp.dev
**Created:** 2026-05-08T10:12:02Z · **Resolved:** 2026-05-08T10:31:29Z · **Closed:** 2026-05-08T11:18:15Z

## Description

\`\`\`
<!-- opchain:oc-monitoring-ops:incident-fired:evt-2026-05-08-101201 -->

Alert:          webhook-replay-queue-depth (warning)
Fired at:       2026-05-08T10:12:01Z
Service:        worker/webhooks
Symptoms:       queue_depth 4127 (threshold 2000)
                drain_rate_per_s 0.8 (baseline ~32)
                oldest_item_age_s 47
Runbook:        https://runbooks.onramp.dev/webhook-replay
On-call:        maya@onramp.dev (rotation: ops-rotation)
Recent deploys: PLAT-5103 (staging only, 10:08:14Z — prod not promoted)
\`\`\`

\`Recent deploys\` is read from
\`oc-deploy-ops.checkpoint.json\` → \`skill_state.pm.deploy_tickets[]\`. The
only open deploy is PLAT-5103, which at alert time was **four minutes
into a staging deploy with prod not yet promoted** — so the correlation
the parent link expresses is weak by construction, and the body says so
rather than making the on-call discover it. PLAT-5103 also touches
neither the webhook worker nor the replay queue.

## Alert payload (verbatim from PagerDuty)

\`\`\`json
{
  "incident_id": "PD-INC-018412",
  "incident_key": "webhook-replay-queue-depth:worker/webhooks",
  "service": { "id": "PS-PLAT-INFRA", "name": "worker/webhooks" },
  "urgency": "high",
  "severity": "warning",
  "status": "triggered",
  "created_at": "2026-05-08T10:12:01Z",
  "description": "webhook-replay-queue-depth fired",
  "details": {
    "metric": "queue_depth",
    "queue_name": "webhook-replay",
    "depth_observed": 4127,
    "depth_threshold": 2000,
    "oldest_item_age_s": 47,
    "publish_rate_per_s": 32,
    "drain_rate_per_s": 0.8,
    "upstream_endpoint": "api.partner-x.com"
  }
}
\`\`\`

## Dashboards (described)

### Webhook replay queue depth (last 60 min)

Graph shows queue depth at ~10-30 messages steady-state from 09:00-10:11Z,
then a **sharp climb starting 10:11:38Z** reaching 4,127 by alert fire
at 10:12:01Z, topping out at 4,830 around 10:20Z, then draining back to
~50 by 10:31Z. Publish rate is steady (~32/s — normal); the drain rate
collapsed to ~0.8/s.

### Upstream partner-x.com latency

A separate Datadog synthetic shows api.partner-x.com returning 503s
at 10:11:30-10:30:48Z — **a 19-minute upstream outage at the receiver
side, not our problem.** Their status page confirmed at 10:35Z; their
own RCA (edge config push, rolled back) landed at 11:02Z.

## Alert fires in this incident

Three, all folded into this one ticket by the protocol §3 pre-create
marker check:

| # | Fired | Depth | Outcome |
|---|---|---:|---|
| 1 | 10:12:01Z | 4,127 | ticket created (PLAT-5104) |
| 2 | 10:17:42Z | 4,621 | marker matched → comment |
| 3 | 10:20:18Z | 4,830 | marker matched → comment |

\`noisy-alert\` label **not** applied: three fires in 24h is under the
default threshold of five. The tuning recommendation goes in the
postmortem instead (PLAT-5106).

## Comments

### 10:12:02Z · opchain-monitoring-ops · incident opened

\`\`\`
<!-- opchain:oc-monitoring-ops:incident-fired:evt-2026-05-08-101201 -->

Pre-create check: list_issues(team=PLAT, type=Incident,
query="opchain:oc-monitoring-ops:incident-fired:evt-2026-05-08-101201")
→ 0 matches → created.

Parent set to PLAT-5103 (only open deploy). PLAT-5103 is a staging
deploy of a customer-list index fix; it does not touch worker/webhooks.
Correlation is temporal, and it is the weakest kind: prod has not been
promoted.

Paging on-call: maya@onramp.dev.
Runbook: https://runbooks.onramp.dev/webhook-replay
\`\`\`

### 10:13:14Z · opchain-monitoring-ops · acked

\`\`\`
<!-- opchain:oc-monitoring-ops:acked:PLAT-5104:maya -->

maya@onramp.dev acknowledged via PagerDuty.
Transitioned: In Progress.
\`\`\`

### 10:18:02Z · opchain-monitoring-ops · second fire, deduped

\`\`\`
<!-- opchain:oc-monitoring-ops:burst-event:PLAT-5104:event-2 -->

Second fire at 10:17:42Z, depth 4,621. Pre-create check matched the
incident-fired marker on PLAT-5104 → appended as a comment instead of
opening a duplicate incident.

Drain rate still 0.8/s. Publish rate unchanged at 32/s.
\`\`\`

### 10:18:45Z · maya@

\`\`\`
Not PLAT-5103. The webhook worker hasn't changed in 11 days and 5103
hasn't touched prod — it's still sitting in Staging verified. The spike
is on the consumer side. Looking upstream.
\`\`\`

### 10:20:31Z · opchain-monitoring-ops · third fire, deduped

\`\`\`
<!-- opchain:oc-monitoring-ops:burst-event:PLAT-5104:event-3 -->

Third fire at 10:20:18Z, depth 4,830 (peak). Marker matched → appended.
\`\`\`

### 10:24:00Z · maya@

\`\`\`
api.partner-x.com is returning 503s. Their status page is down too.
Their integration is the largest single consumer of our replay
queue (~30/s under normal conditions). Their 503s mean we can't
drain — items queue up.

Decision: wait for upstream recovery. Our retry-with-backoff is
working as designed; nothing for us to fix on our side. Will
auto-resolve when the queue drains. Not paging comms — SEV3, zero
customer impact.
\`\`\`

### 10:31:29Z · opchain-monitoring-ops · auto-resolved

\`\`\`
<!-- opchain:oc-monitoring-ops:auto-resolved:PLAT-5104 -->

Auto-resolved — duration 19m 28s (from alert fire 10:12:01Z).
Queue drained back to ~50; oldest item ~3s; drain rate 35/s.
Transitioned: Resolved (PM pending).

Root cause (preliminary): api.partner-x.com returned 503s for 19
minutes (10:11:30 - 10:30:48Z); our replay queue absorbed the backlog
and drained on their recovery. Their status page confirms.

Postmortem required — this state is deliberately not Done.
\`\`\`

### 11:18:14Z · opchain-monitoring-ops · postmortem published

\`\`\`
<!-- opchain:oc-monitoring-ops:postmortem:PLAT-5104 -->

Postmortem: monitoring/postmortems/2026-05-08-webhook-replay-queue.md

Remediation sub-tickets opened (2):
  - PLAT-5105 (vee@onramp.dev, due 2026-05-15) — per-receiver timeout
    and circuit-breaker knob on the replay consumer
    <!-- opchain:oc-monitoring-ops:remediation:PLAT-5104:item-1 -->
  - PLAT-5106 (maya@onramp.dev, due 2026-05-12) — raise
    webhook-replay-queue-depth threshold and add upstream-aware
    suppression
    <!-- opchain:oc-monitoring-ops:remediation:PLAT-5104:item-2 -->

Owners resolved from pm.yaml remediation_owners (infra → vee@,
backend → maya@).

Transitioned: Done.
\`\`\`

## Timeline (UTC)

\`\`\`
10:11:30  api.partner-x.com begins returning 503s (their outage start)
10:11:38  webhook-replay queue depth begins climbing
10:12:01  alert webhook-replay-queue-depth fires (fire 1, depth 4,127)
10:12:02  oc-monitoring-ops creates PLAT-5104; parent=PLAT-5103
10:12:02  oc-monitoring-ops pages maya
10:13:14  maya ack via PagerDuty (auto-mirrored) → In Progress
10:17:42  fire 2 (depth 4,621) → marker dedupe → comment
10:18:45  maya rules out PLAT-5103 (worker unchanged 11d; prod not promoted)
10:20:18  fire 3 (depth 4,830, peak) → marker dedupe → comment
10:24:00  maya identifies upstream partner-x outage
10:24:30  decision: wait for upstream; our retries are doing the right thing
10:30:48  api.partner-x.com recovers
10:31:00  queue drain rate returns to ~35/s
10:31:29  oc-monitoring-ops auto-resolves → Resolved (PM pending)
11:02:00  partner-x publishes their RCA (edge config push, rolled back)
11:05:20  maya runs /oc-monitor postmortem PLAT-5104
11:18:00  postmortem committed to monitoring/postmortems/
11:18:14  oc-monitoring-ops opens PLAT-5105, PLAT-5106
11:18:15  state: Done
\`\`\`

## MTTR breakdown

| Phase | Window | Duration |
|---|---|---:|
| *(onset before detection)* | 10:11:38 → 10:12:01 | *23s* |
| Acknowledge | 10:12:01 → 10:13:14 | 1m 13s |
| Diagnose | 10:13:14 → 10:24:00 | 10m 46s |
| Mitigate | 10:24:00 → 10:30:48 (upstream recovery, not our action) | 6m 48s |
| Recover | 10:30:48 → 10:31:29 (queue drain) | 41s |
| **Time to resolution** | **10:12:01 → 10:31:29** | **19m 28s** |

MTTR is measured from alert fire. Onset-to-recovery (10:11:38 →
10:31:29) is 19m 51s and is shown above as context, not as the headline
number — mixing the two is how the same incident ends up with two
different MTTRs in two different documents.

## Customer impact

**Zero.** The replay queue is by design tolerant of upstream delays;
all 38,412 queued items were eventually delivered, none dropped. No
customer-facing functionality relies on the queue draining in
real-time. **Status page not posted** — SEV3 with zero customer impact
does not page the comms team per existing policy.

## Sub-tickets (remediation)

| Ticket | Title | Owner | Due | Priority |
|---|---|---|---|---|
| [PLAT-5105](https://linear.app/onramp/issue/PLAT-5105) | Per-receiver timeout + circuit breaker on the replay consumer | vee@ | 2026-05-15 | Medium |
| [PLAT-5106](https://linear.app/onramp/issue/PLAT-5106) | Raise replay-queue-depth threshold; add upstream-aware suppression | maya@ | 2026-05-12 | Medium |

## Linked

- parent (correlation, ultimately unrelated): [PLAT-5103 — Deploy: prod c4f8a21..ea71b9c](https://linear.app/onramp/issue/PLAT-5103)
- upstream cause: api.partner-x.com outage 10:11:30 - 10:30:48Z (per their status page + 11:02Z RCA)
- postmortem: \`monitoring/postmortems/2026-05-08-webhook-replay-queue.md\`
- remediation: PLAT-5105, PLAT-5106

Checkpoint: \`.checkpoints/oc-monitoring-ops.checkpoint.json\` →
\`skill_state.pm.incidents[]\`.
`,
    },
    {
      id: "postmortem",
      label: "monitoring/postmortems/2026-05-08-webhook-replay-queue.md",
      kind: "postmortem.md",
      body:
`# Postmortem: PLAT-5104 — webhook-replay queue depth

**Written by:** oc-monitoring-ops (\`/oc-monitor postmortem PLAT-5104\`, 11:05:20Z)
**Reviewed by:** maya@onramp.dev · **Published:** 2026-05-08T11:18:00Z
**Incident:** [PLAT-5104](https://linear.app/onramp/issue/PLAT-5104)

## Status: RESOLVED

## Severity: SEV3 (minor)

## Summary

A 19-minute outage at an external webhook receiver (api.partner-x.com)
stopped our replay queue from draining. Depth climbed from ~20 to a peak
of 4,830 and the depth alert fired three times. The queue drained on
their recovery with no items dropped and no customer-visible effect. We
took no mitigating action, and correctly took none.

## Timeline

| Time (UTC) | Event |
|---|---|
| 10:11:30 | api.partner-x.com begins returning 503s |
| 10:11:38 | webhook-replay queue depth begins climbing |
| 10:12:01 | Alert fired: \`webhook-replay-queue-depth\` (depth 4,127) |
| 10:12:02 | oc-monitoring-ops opens PLAT-5104, parent PLAT-5103, pages on-call |
| 10:13:14 | Acknowledged by: maya@onramp.dev |
| 10:17:42 | Second fire (4,621) — deduped onto PLAT-5104 |
| 10:18:45 | Initial diagnosis: not PLAT-5103; webhook worker unchanged 11 days, prod not promoted |
| 10:20:18 | Third fire (4,830, peak) — deduped onto PLAT-5104 |
| 10:24:00 | Root cause identified: partner-x 503s; their status page down |
| 10:24:30 | Decision: no action; retry-with-backoff is behaving as designed |
| 10:30:48 | api.partner-x.com recovers |
| 10:31:29 | Queue back to ~50; resolution confirmed — incident auto-resolved |
| 11:02:00 | partner-x publishes their RCA: edge config push at 10:11:28, rolled back 10:30:40 |
| 11:18:15 | Postmortem published; PLAT-5104 closed |

## Impact

- **Duration:** 19m 28s from alert fire (19m 51s from onset)
- **Users affected:** none
- **Peak queue depth:** 4,830 items (threshold 2,000; steady-state ~20)
- **Items delivered:** 38,412 / 38,412 — zero dropped, zero duplicated
- **Max delivery delay:** 19m 12s on the oldest queued item
- **Data loss:** None
- **Revenue impact:** None
- **SLO impact:** 0% — webhook delivery has a 4-hour SLO, not a real-time one

## Root Cause

api.partner-x.com pushed a bad edge configuration at 10:11:28 that made
their webhook-ingest endpoint return 503 for every request. Our replay
consumer treats 5xx as retriable and backs off per receiver, so its
drain rate against that one receiver fell from ~30/s to ~0.8/s. Because
partner-x is the largest single consumer of the replay queue, the
aggregate depth metric — which is not segmented by receiver — climbed
as though the queue itself were broken. Nothing on our side failed.

## Mitigation

None applied, and none warranted. The consumer's retry-with-backoff is
the designed response to an upstream 5xx; interfering (raising
concurrency, draining to a dead-letter queue, disabling the receiver)
would have converted a delivery delay into a delivery failure. The
on-call's decision at 10:24:30 to wait was the correct one and is
recorded here so the next on-call under the same alert has a
precedent rather than an instinct.

## Resolution

The queue drained on its own at 10:30:48 when partner-x rolled back.
The two changes below are about the alert and the consumer's
observability, not about this failure recurring — it will recur, every
time an upstream has a bad day.

## What worked

- Detection in 23s from onset.
- Marker-based dedupe: three fires in 8m 17s produced one ticket and two
  comments rather than three tickets. The on-call read one thread.
- The auto-correlation to PLAT-5103 named a candidate *and* said in the
  same breath why it was weak (prod not promoted). It cost ~5 minutes of
  ruling-out rather than the 20 it would have cost unlabelled.

## What did not work

- The alert threshold encodes "our queue is broken" but fires on "an
  upstream is broken and we are absorbing it correctly." Those need
  different responses and currently produce the same page.
- \`queue_depth\` is not segmented by receiver, so nothing in the alert
  payload pointed at partner-x. The on-call found it by hand at 10:24.

## Action Items

| ID | Action | Owner | Due | Status | Ticket |
|---|---|---|---|---|---|
| AI-1 | Per-receiver timeout + circuit breaker on the replay consumer, with per-receiver depth exported | vee@onramp.dev | 2026-05-15 | Open | [PLAT-5105](https://linear.app/onramp/issue/PLAT-5105) |
| AI-2 | Raise \`webhook-replay-queue-depth\` to 8,000 and suppress when the dominant receiver is itself returning 5xx | maya@onramp.dev | 2026-05-12 | Open | [PLAT-5106](https://linear.app/onramp/issue/PLAT-5106) |

No action item is assigned for "talk to partner-x" — their RCA landed
before this document did and their rollback was under 20 minutes.

Checkpoint: \`.checkpoints/oc-monitoring-ops.checkpoint.json\` →
\`skill_state.pm.incidents[]\` → \`PLAT-5104.postmortem\`.
`,
    },
    {
      id: "checkpoint-trace",
      label: "oc-deploy-ops.checkpoint.json — before and after the flush",
      kind: "checkpoint.json",
      body:
`# Checkpoint trace — the deferred queue, before and after

**Protocol reference:** \`skills/oc-integrations-engineer/references/pm-mcp-protocol.md\` §4

\`pm_deferred_actions[]\` is a **top-level** array on the calling skill's
checkpoint, alongside \`skill_state\` — not inside it. Below is the actual
queue evolution during this run. Each entry carries a \`retriable\` flag
that decides whether \`/oc-deploy --retry-pm\` will replay it.

## 1. 10:40:37Z — four writes deferred

\`oc-deploy-ops.checkpoint.json\`, abridged to the fields that moved:

\`\`\`json
{
  "protocol_version": "1.1",
  "skill": "oc-deploy-ops",
  "project": "onramp/platform",
  "project_dir": "/Users/maya/src/platform",
  "created_at": "2026-03-02T11:40:09Z",
  "updated_at": "2026-05-08T10:40:37Z",
  "phase": "production",
  "step": "post-ship-pm-writes",
  "status": "in_progress",
  "progress_summary": "ea71b9c live on prod (version 1c0b4a77). Migration 67.4s, deploy 8.9s, health 200, p99 118ms. Four Linear writes deferred on 503; deploy itself unaffected.",
  "blockers": [],
  "next_actions": [
    "Run /oc-deploy --retry-pm once Linear recovers (4 entries, all retriable)."
  ],
  "skill_state": {
    "current_env": "production",
    "prod_version": "ea71b9c",
    "cloudflare_version_id": "1c0b4a77-6f51-4b2e-b3a9-8d2f0e714c35",
    "previous_version_id": "9f2c71a4-0d3b-4e8a-9c12-5b7a4e610d88",
    "pm": {
      "deploy_tickets": [
        { "id": "PLAT-5103", "env": "prod", "head": "ea71b9c",
          "linked": ["PLAT-5102"], "state": "Staging verified",
          "created_at": "2026-05-08T10:08:14Z" }
      ]
    }
  },
  "pm_deferred_actions": [
    {
      "id": "deferred-2026-05-08T10:39:52Z-7c2f",
      "skill": "oc-deploy-ops",
      "verb": "/oc-deploy",
      "operation": "add_comment",
      "provider": "linear",
      "tool_name": "mcp__claude_ai_Linear__save_comment",
      "ticket_id": "PLAT-5103",
      "marker": "<!-- opchain:oc-deploy-ops:prod-shipped:PLAT-5103 -->",
      "payload": {
        "issue_id": "PLAT-5103",
        "body": "<!-- opchain:oc-deploy-ops:prod-shipped:PLAT-5103 -->\\n\\nPROD SHIP · ea71b9c · v6.18.5 ..."
      },
      "queued_at": "2026-05-08T10:39:52Z",
      "last_attempt_at": "2026-05-08T10:39:52Z",
      "attempts": 3,
      "last_error": "Linear API returned 503 (3/3 attempts, 14.6s of a 15s budget)",
      "retriable": true,
      "user_visible_message": "Linear is currently unreachable; the prod-shipped comment was deferred. The deploy itself is fine — ea71b9c is live. Run /oc-deploy --retry-pm to flush, or wait for the next pipeline pass."
    },
    {
      "id": "deferred-2026-05-08T10:40:07Z-3a1d",
      "skill": "oc-deploy-ops",
      "verb": "/oc-deploy",
      "operation": "save_issue",
      "provider": "linear",
      "tool_name": "mcp__claude_ai_Linear__save_issue",
      "ticket_id": "PLAT-5103",
      "marker": null,
      "payload": {
        "id": "PLAT-5103",
        "description": "<!-- opchain:oc-deploy-ops:deploy-created:prod:ea71b9c -->\\n\\nEnvironment: prod (via staging)\\n... Smoke tests: PASS (4/4 staging, 4/4 prod)"
      },
      "queued_at": "2026-05-08T10:40:07Z",
      "last_attempt_at": "2026-05-08T10:40:07Z",
      "attempts": 3,
      "last_error": "Linear API returned 503 (3/3 attempts, 14.6s of a 15s budget)",
      "retriable": true
    },
    {
      "id": "deferred-2026-05-08T10:40:22Z-b904",
      "skill": "oc-deploy-ops",
      "verb": "/oc-deploy",
      "operation": "transition",
      "provider": "linear",
      "tool_name": "mcp__claude_ai_Linear__save_issue",
      "ticket_id": "PLAT-5103",
      "marker": null,
      "payload": { "id": "PLAT-5103", "state": "Shipped" },
      "queued_at": "2026-05-08T10:40:22Z",
      "last_attempt_at": "2026-05-08T10:40:22Z",
      "attempts": 3,
      "last_error": "Linear API returned 503 (3/3 attempts, 14.6s of a 15s budget)",
      "retriable": true
    },
    {
      "id": "deferred-2026-05-08T10:40:37Z-e57e",
      "skill": "oc-deploy-ops",
      "verb": "/oc-deploy",
      "operation": "add_comment",
      "provider": "linear",
      "tool_name": "mcp__claude_ai_Linear__save_comment",
      "ticket_id": "PLAT-5102",
      "marker": "<!-- opchain:oc-deploy-ops:linked-shipped:PLAT-5103:PLAT-5102 -->",
      "payload": {
        "issue_id": "PLAT-5102",
        "body": "<!-- opchain:oc-deploy-ops:linked-shipped:PLAT-5103:PLAT-5102 -->\\n\\nShipped to prod via deploy PLAT-5103 (release v6.18.5, ea71b9c)."
      },
      "queued_at": "2026-05-08T10:40:37Z",
      "last_attempt_at": "2026-05-08T10:40:37Z",
      "attempts": 3,
      "last_error": "Linear API returned 503 (3/3 attempts, 14.6s of a 15s budget)",
      "retriable": true
    }
  ]
}
\`\`\`

Two things this shape makes explicit. **\`marker\` is null on the two
\`save_issue\` entries** — the protocol requires a marker for comment
writes, where a replay would create a second visible artefact; setting a
field to the value it already has is idempotent upstream and needs no
marker (protocol Appendix B, step 8). And **the deploy did not block.**
Traffic shifted to ea71b9c, \`/api/health\` returned the new SHA, the
latency sample landed. Only four Linear writes are outstanding, and the
user sees one line about it, from \`user_visible_message\`.

## 2. 10:42:03Z — \`/oc-deploy --retry-pm\` flushes

\`\`\`json
{
  "updated_at": "2026-05-08T10:42:11Z",
  "phase": "production",
  "step": "shipped",
  "status": "complete",
  "skill_state": {
    "pm": {
      "deploy_tickets": [
        { "id": "PLAT-5103", "env": "prod", "head": "ea71b9c",
          "linked": ["PLAT-5102"], "state": "Shipped",
          "created_at": "2026-05-08T10:08:14Z",
          "closed_at": "2026-05-08T10:42:08Z" }
      ]
    }
  },
  "pm_deferred_actions": [],
  "pm_flush_log": [
    { "id": "deferred-2026-05-08T10:39:52Z-7c2f", "flushed_at": "2026-05-08T10:42:04Z",
      "flush_attempt": 1, "result": "ok", "result_id": "comment-c8b1a3f4-9e07-4d61-b2aa-1f0c4d773e58",
      "marker_pre_check": "absent", "duration_ms": 184 },
    { "id": "deferred-2026-05-08T10:40:07Z-3a1d", "flushed_at": "2026-05-08T10:42:06Z",
      "flush_attempt": 1, "result": "ok", "result_id": "PLAT-5103",
      "marker_pre_check": "n/a (save_issue)", "duration_ms": 212 },
    { "id": "deferred-2026-05-08T10:40:22Z-b904", "flushed_at": "2026-05-08T10:42:08Z",
      "flush_attempt": 1, "result": "ok", "result_id": "PLAT-5103",
      "marker_pre_check": "n/a (transition)", "duration_ms": 156 },
    { "id": "deferred-2026-05-08T10:40:37Z-e57e", "flushed_at": "2026-05-08T10:42:11Z",
      "flush_attempt": 1, "result": "ok", "result_id": "comment-2d4f90ab-71c5-4a0e-8f33-6b19e2c04a17",
      "marker_pre_check": "absent", "duration_ms": 171 }
  ]
}
\`\`\`

\`\`\`
flushed 4 / failed 0
\`\`\`

Each comment entry ran its marker pre-check first —
\`list_comments(PLAT-5103)\` and \`list_comments(PLAT-5102)\` — and found
no match, so the write was safe. A second \`--retry-pm\` would find the
markers present, remove the entries **without re-posting**, and record
them in \`pm_idempotent_skips[]\` (protocol §3). The two \`save_issue\`
entries would simply be re-applied; setting \`state: "Shipped"\` on a
ticket already in Shipped is a no-op upstream.

## 3. Replay procedure

\`\`\`bash
# Inspect the checkpoint (read-only; prints the whole file):
node scripts/checkpoint.mjs show oc-deploy-ops

# Attempt the flush (short-circuits on already-posted markers):
/oc-deploy --retry-pm

# Clear entries the flush will never touch (prompts per entry):
/oc-deploy --retry-pm --force
\`\`\`

There is no per-entry \`--id\` selector and no \`--field\` projection.
\`--retry-pm\` is a whole-queue pass, filtered to \`retriable: true\`; the
marker pre-check is what makes running it more than once harmless.

## 4. What a \`retriable: false\` entry looks like

Not every PM-MCP failure is transient. A 403 — the shape you get when an
agent scoped to one team tries to write to another — stays in the same
array with the flag flipped (synthetic example; this did not happen in
this run):

\`\`\`json
{
  "pm_deferred_actions": [
    {
      "id": "deferred-2026-05-08T10:55:12Z-3a8e",
      "skill": "oc-deploy-ops",
      "verb": "/oc-deploy",
      "operation": "transition",
      "provider": "linear",
      "tool_name": "mcp__claude_ai_Linear__save_issue",
      "ticket_id": "OPS-441",
      "marker": null,
      "payload": { "id": "OPS-441", "state": "Shipped" },
      "queued_at": "2026-05-08T10:55:12Z",
      "last_attempt_at": "2026-05-08T10:55:12Z",
      "attempts": 1,
      "last_error": "Linear API returned 403: cross-team write not authorised (agent scoped to team PLAT, OPS-441 is owned by team OPS)",
      "retriable": false,
      "user_visible_message": "Deploy ticket transition refused by Linear: cross-team write not authorised. This is a policy issue, not a transient failure — escalate to platform-eng for scope review."
    }
  ]
}
\`\`\`

**What differs:**

- It stays in \`pm_deferred_actions[]\` — the queue is the audit trail, and
  removing failures from it would hide them. There is no separate
  errors array.
- \`--retry-pm\` filters it out and never attempts it. Clearing it needs
  \`--retry-pm --force\`, which prompts for each non-retriable entry.
- 403 is scope; 401 is re-auth; 404 is a bad id; 422 is a skill bug.
  All four are \`retriable: false\` (protocol §2). Only 5xx, 429 and
  network faults retry.
- It surfaces in the agent's response immediately rather than sitting
  silently until someone runs a flush.

## 5. Cross-skill reads observed during this run

| Reading skill | Reads | Why |
|---|---|---|
| oc-monitoring-ops | \`oc-deploy-ops.checkpoint.json\` → \`skill_state.pm.deploy_tickets[]\` | Fill the incident's \`Recent deploys\` line and pick a likely-culprit parent (PLAT-5103, 10:12:02Z) |
| oc-deploy-ops | \`oc-code-auditor.checkpoint.json\` → \`updated_at\` + grade | Gate decision: 09:41:52Z is 55m old at 10:36 → under 1h → reuse, grade A- |
| oc-deploy-ops | \`oc-security-auditor.checkpoint.json\` → \`updated_at\` | 2026-05-05T14:02Z is 68h old → over 24h → re-run |
| oc-git-ops | \`oc-bug-check.checkpoint.json\` → \`skill_state.last_run.verdict\` | Commit footer \`bugcheck: pass (7/7, 0 warnings, 4.8s)\` |
| oc-deploy-ops | \`oc-monitoring-ops.checkpoint.json\` → \`skill_state.last_verify\` | Confirm the post-deploy verify ran before closing the deploy ticket |

All cross-reads use the public checkpoint schema in
\`oc-checkpoint-protocol\`'s SKILL.md — no skill imports another skill's
internal state.

## 6. What the deferred queue buys you

- **Crash safety.** Mid-flow agent restart (terminal closes, laptop
  sleeps, Claude Code crashes) leaves the queue intact on disk; the
  next invocation picks it up.
- **Transient-failure tolerance.** A four-minute Linear outage cost this
  deploy four minutes of audit-trail lag and nothing else.
- **Idempotency.** Re-running \`--retry-pm\` is always safe; the marker
  pre-check makes every comment write a no-op if it already landed, and
  state writes are idempotent by nature.
- **Observability.** Queue and flush log both live in the checkpoint, so
  a postmortem on a partial-failure deploy can reconstruct exactly what
  was deferred, for how long, and what flushed it.

Checkpoint for this run: \`.checkpoints/oc-deploy-ops.checkpoint.json\`.
`,
    },
  ],
  skills: [
    "oc-git-ops",
    "oc-bug-check",
    "oc-docs-forge",
    "oc-repo-ops",
    "oc-code-auditor",
    "oc-security-auditor",
    "oc-deploy-ops",
    "oc-monitoring-ops",
    "oc-integrations-engineer",
  ],
  runtime: "≈ 24 exchanges",
  steps: [
    {
      type: "beat",
      phase: "monitor",
      label: "09:14Z — PagerDuty paged Maya; she filed PLAT-5102",
      caption: "p99 on /api/customers stepped from 120ms to 3.4s at 09:11:18. The opchain pipeline takes the ticket from here.",
      skills: [],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "PagerDuty paged me on api-latency-customers-p99 at 09:13. I filed PLAT-5102 with the alert payload and the prod EXPLAIN in it. Staging's fine on the same cursor, prod isn't — 70ms vs 3.2s, same tenant, same query. I'm fairly sure it's a221f08 from Thursday night. Branch off main, don't touch anything else. `/oc-git-sync PLAT-5102`",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-git-ops",
      content:
`PLAT-5102 read first. Provider from \`.opchain/pm.yaml\` → \`linear\`; no \`tool_overrides\`, so the protocol §1 registry name applies.

\`\`\`
get_issue(id="PLAT-5102") → 200 in 142ms · Bug · P2 · Todo · cycle 2026-W19
$ git checkout -b fix/PLAT-5102-api-latency-spike-on-customer-list-pagi
$ git show a221f08 -- migrations/
+DROP INDEX IF EXISTS idx_customers_team_id_created_at;   … and 7 more
\`\`\`

Read-only so far — no marker, no write. Only the composite serves both the \`team_id = $1\` filter and the \`created_at DESC\` sort, so prod fell back to a seq scan over 108k rows plus an external merge sort.

**Before I write anything:** a221f08 dropped **eight** indexes, not one, and the diff doesn't say whether the other seven were duplicates — \`idx_events_team_id_created_at\` has the same shape as the one that just broke. All eight, or just customers?`,
      artifacts: ["plat-5102", "pm-yaml"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "Just customers. `events` is append-only and only read by the nightly cron; nobody's paging on it. Same for the audit log. Invoices I'm less sure about but it's not on fire and I don't want a hotfix PR that touches five tables at 09:20 on a Friday. Leave the other seven for a follow-up ticket — I'll file it myself after this ships.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-git-ops",
      content:
`Scoped to \`customers\`. Forward-only migration — \`CREATE INDEX CONCURRENTLY … ON customers (team_id, created_at DESC)\` — plus a regression test pinning the plan shape.

**Pre-commit gate took three rounds.**

\`\`\`
09:24:06  BUG CHECK — FAIL ❌  conftest.py::apply_migrations — psycopg.errors
            .ActiveSqlTransaction: CREATE INDEX CONCURRENTLY cannot run
            inside a transaction block
09:27:41  BUG CHECK — FAIL ❌  test_planner_uses_composite_index_after_fix —
            AssertionError: Expected Index Scan (got Seq Scan; 240 seeded rows)
09:30:52  BUG CHECK — PASS ✅  7 checks passed (4.8s)
\`\`\`

Round 1 is dbmate wrapping every migration in a transaction — fixed with \`transaction:false\` on both directions. Round 2 was my test wrong twice over: it asserted a *cost* decision on a 240-row fixture, and it matched \`"Seq Scan on customers"\`, which \`EXPLAIN (FORMAT JSON)\` never emits, so it had been passing vacuously.

Committed as \`3b91d4e\` (\`Refs: PLAT-5102\`, \`bugcheck: pass 7/7\`); \`/oc-docs pr\` and \`/oc-repo verify\` clean; PR #2243 open at 09:31, then \`pr-opened:#2243\` and \`save_issue(state="In Review")\` behind a marker pre-check.

The Todo → In Progress at 09:31:14 wasn't mine — Linear's own branch automation fired on the push. Run \`/oc-deploy staging\`?`,
      artifacts: ["bugcheck-runs", "pr-2243"],
    },
    {
      type: "beat",
      phase: "audit",
      label: "09:41Z — pre-deploy gate, while a human reviews",
      caption: "Vee has the PR. oc-code-auditor runs now so the gate is warm when oc-deploy-ops asks for it in an hour.",
      skills: ["oc-code-auditor", "oc-security-auditor"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "Not yet — Vee's reviewing and she's mid-standup, so that's twenty minutes minimum. Run the pre-deploy audit while we wait so the gate's cached when we do deploy.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-code-auditor",
      content:
`\`/oc-audit pre-deploy\` on #2243 @ \`3b91d4e\`: 3 files, 9.2s, **0 CRITICAL · 0 HIGH · 0 MEDIUM · 1 LOW**, health A-. The finding is \`services/customers.ts:88-104\` — the cursor query names the index it depends on nowhere:

\`\`\`
$ rg -n 'idx_customers_team_id_created_at' services/ types/ → (no matches)
\`\`\`

That empty result is the read a221f08 performed before deciding the composite was a duplicate. **Recommended after the hotfix, not in it** — not worth widening a diff a human is reviewing under incident pressure.

Checkpoint stamped \`updated_at: 2026-05-08T09:41:52Z\` — what oc-deploy-ops reads at the gate. The other half, \`oc-security-auditor.checkpoint.json\`, is at \`2026-05-05T14:02Z\`: 68 hours, outside the 24-hour reuse window, so the gate re-runs it.`,
      artifacts: ["audit-report"],
    },
    {
      type: "beat",
      phase: "ship",
      label: "10:06Z — merged, then staging",
      caption: "Squash-merge lands ea71b9c on main. oc-git-ops closes PLAT-5102; oc-deploy-ops opens PLAT-5103.",
      skills: ["oc-git-ops", "oc-deploy-ops"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "Vee approved — one comment, and it's for the follow-up not this PR: the down-migration also drops CONCURRENTLY, so a rollback can't run in a transaction either. Worth a line in migrations/README.md eventually. Squash-merged — main is at ea71b9c. `/oc-git-sync --closed` then `/oc-deploy staging`.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-git-ops",
      content:
`\`/oc-git-sync --closed PLAT-5102\`.

\`\`\`
gh pr view 2243 → MERGED 2026-05-08T10:06:08Z · squash → ea71b9c on main
list_comments(PLAT-5102) → 2 (pr-opened, audit-posted), no pr-merged → safe
save_comment "…:pr-merged:#2243" 168ms · save_issue(state="Done") 131ms
\`\`\`

PLAT-5102 is **Done** as of 10:06:12Z, on the merge — not on the ship. When oc-deploy-ops promotes it owes this ticket a \`linked-shipped\` comment and nothing else; it will not transition a ticket it doesn't own.

Vee's note is recorded rather than acted on: the rollback path here is "revert the worker, leave the index", which never runs the down-migration.`,
      artifacts: ["plat-5102"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "Good. One thing before you go: staging's customers table is about 6k rows against prod's 108k, so whatever the index build costs there won't scale linearly. Tell me the actual number and I'll decide whether 90s is still the right prod estimate.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-deploy-ops",
      content:
`**Audit gate** (10:08:02): oc-code-auditor 09:41:52Z, age 26m → reuse, A- → PASS; oc-security-auditor 68h old → re-run, 0 new STRIDE findings → PASS. Gate PASS (two-audit).

**Deploy ticket.** \`c4f8a21..ea71b9c\`, 1 commit, one \`Refs: PLAT-5102\` trailer; pre-create check → 0 matches → **PLAT-5103**, parent PLAT-5102.

\`\`\`
$ npm run migrate -- --env staging
  scanning table ... 2,714 / 2,714 blocks 28s · writers 6s · validation 7s
  Applied in 41.310s
$ npx wrangler deploy --env staging → Published onramp-api-staging (2.44 sec)
✅ health 200 · ea71b9c   ✅ hey -c 5 → p50 61ms / p99 84ms   4/4 PASS
\`\`\`

**Your question, answered:** 41.3s, and only 28s of it was the table scan — the other 13s is wait-for-writers and validation, fixed cost regardless of table size. So prod isn't 41.3 × 18. Scaling the scan alone (2,714 → 41,902 blocks) puts prod near 45-50s plus the same ~13-20s of fixed phases. **~65s is the estimate, not 90.**

PLAT-5103 → \`Staging verified\` at 10:14:02Z. Prod is not automatic — say the word.`,
      artifacts: ["deploy-ticket"],
    },
    {
      type: "beat",
      phase: "monitor",
      label: "10:12Z — a second page, unrelated",
      caption: "webhook-replay-queue-depth fires while the staging smoke is still running. Different service, different cause — and the burst folds into one ticket.",
      skills: ["oc-monitoring-ops"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "Hold prod. PagerDuty hit me again at 10:12 — `webhook-replay-queue-depth`, completely different service. Show me what the alert path opened while you were finishing the staging smoke; I'm pulling up the dashboards now.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-monitoring-ops",
      content:
`Held. PLAT-5103 stays in \`Staging verified\`; nothing is promoted.

Pre-create check on \`incident-fired:evt-2026-05-08-101201\` → 0 matches → create.

\`\`\`
PLAT-5104 [10:12:02Z]  webhook-replay-queue-depth (warning) · worker/webhooks
  queue_depth 4127 (threshold 2000) · drain_rate_per_s 0.8 (baseline ~32)
  Recent deploys: PLAT-5103 (staging only, 10:08:14Z — prod not promoted)
\`\`\`

Parent is PLAT-5103 only because it's the one open deploy ticket — prod was never promoted, so it cannot be causal.

Publish rate is **normal** at 32/s; drain collapsed to **0.8/s** — not our queue failing to keep up, a consumer that can't hand items off. \`upstream_endpoint\` is \`api.partner-x.com\`. Paged maya@ at 10:12:02; ack back at 10:13:14 → \`In Progress\`.`,
      artifacts: ["incident-ticket"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "It's not 5103. The webhook worker hasn't been touched in 11 days and 5103 is still sitting in Staging verified — prod's never seen it. api.partner-x.com is 503ing and their status page is down too; they're the biggest single consumer of that queue, ~30/s. We wait it out — our retry-with-backoff is doing exactly what it's supposed to. Keep folding the re-fires into 5104 and don't page comms, this is SEV3 with zero customer impact.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-monitoring-ops",
      content:
`Agreed on all three, and the queue behaved the way you'd want.

\`\`\`
fire 1  10:12:01Z  depth 4,127  → pre-create check: 0 matches → PLAT-5104
fire 2  10:17:42Z  depth 4,621  → marker matched → comment [10:18:02Z]
fire 3  10:20:18Z  depth 4,830  → marker matched → comment [10:20:31Z]
10:31:29  drain back to ~35/s, below threshold 2 windows → "Resolved (PM
          pending)" · 19m 28s · 38,412 of 38,412 delivered, 0 dropped
\`\`\`

Each burst comment carries its own event-scoped marker, so the three fires dedupe to one ticket without losing the individual events.

**No \`noisy-alert\` label:** three fires in 24h is under the default threshold of five — mechanically right, substantively wrong, and that belongs in the postmortem's action items rather than on a ticket.

\`Resolved (PM pending)\`, not \`Done\`: that state comes from \`pm.yaml\` so an incident can stop paging people without being closed before anyone's written down what happened.`,
      artifacts: ["incident-ticket"],
    },
    {
      type: "beat",
      phase: "ship",
      label: "10:36Z — prod, and Linear picks that minute to 503",
      caption: "The deploy lands clean; four PM writes don't. They go to the deferred queue and flush at 10:42.",
      skills: ["oc-deploy-ops"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "Queue's drained and partner-x is green. Back to 5102 — index built clean on staging in 41s and the plan flipped, and I'd rather not be promoting on top of a live incident, so now's the window. I'm approving the prod promotion. `/oc-deploy prod`.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-deploy-ops",
      content:
`Promoting. Explicit confirmation logged at 10:36:41Z against the pre-promotion checklist.

\`\`\`
[10:37:06] migrate --env production · 41,902 blocks 47s · writers 9s ·
           validation 11s · Applied in 67.412s                 [10:38:13]
[10:38:16] wrangler deploy → onramp-api 8.9s · health 200 · version ea71b9c
[10:39:04] EXPLAIN → Index Scan Backward using idx_customers_team_id_created_at
           Execution Time: 2.104 ms  (was 2398.214 ms)
[10:39:31] acme-inc slice p99 131ms (was 4.88s) · alert auto-resolved
\`\`\`

67.4s against the ~65s I estimated. Validation is timed from the index build finishing at 10:38:13, not the traffic shift.

**Then Linear fell over.** Four writes, four retry ladders, four deferrals:

\`\`\`
1/4 comment PLAT-5103 prod-shipped    10:39:38.1  503 · +1.0s 503 · +3.1s 503 → DEFERRED 10:39:52.7
2/4 issue   PLAT-5103 desc patch      10:39:52.9  503 · +1.0s 503 · +3.0s 503 → DEFERRED 10:40:07.5
3/4 state   PLAT-5103 → "Shipped"     10:40:07.7  503 · +1.1s 503 · +3.2s 503 → DEFERRED 10:40:22.3
4/4 comment PLAT-5102 linked-shipped  10:40:22.5  503 · +1.0s 503 · +3.1s 503 → DEFERRED 10:40:37.1
\`\`\`

Three attempts each, 1s/3s backoff with ±20% jitter, aborting inside the 15-second budget; all four \`retriable: true\`.

**The deploy is fine** — ea71b9c is live at 118ms p99, \`/oc-monitor verify\` clean at 10:40:41. What's outstanding is four lines of audit trail. Run \`/oc-deploy --retry-pm\` to flush.`,
      artifacts: ["deploy-prod-log", "deploy-ticket"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "Linear's status page has an incident from 10:36 — \"elevated error rates on write endpoints\", API only, web app unaffected. Just refreshed it: 10:41, marked resolved. `/oc-deploy --retry-pm`.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-deploy-ops",
      content:
`\`/oc-deploy --retry-pm\` — filtering \`pm_deferred_actions[]\` to \`retriable: true\`. Four entries, all four qualify.

\`\`\`
[10:42:03] flush pass start · 4 entries
1/4 add_comment PLAT-5103  pre-check: prod-shipped marker ABSENT → ok 184ms
2/4 save_issue  PLAT-5103  no marker (description patch)         → ok 212ms
3/4 transition  PLAT-5103 → "Shipped"  no marker                 → ok 156ms
4/4 add_comment PLAT-5102  pre-check: linked-shipped ABSENT      → ok 171ms
flushed 4 / failed 0                                          [10:42:11]
\`\`\`

The **two comment writes** found their marker absent — that's what made them safe, and what would make a second \`--retry-pm\` a no-op. The **two \`save_issue\` writes** need no marker: setting a state to \`Shipped\` when it already is one is a no-op upstream.

PLAT-5103 is \`Shipped\` and closed at 10:42:08Z; PLAT-5102 has its \`linked-shipped\` comment.`,
      artifacts: ["checkpoint-trace"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "If Linear had been out an hour and we'd shipped six deploys in that window, what does that queue look like — does anything cap it?",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-deploy-ops",
      content:
`Six deploys at three-to-four writes each is **20-24 entries**, and the honest answer to the second half is: **nothing caps it.** Protocol §4 specifies the entry schema, the \`retriable\` flag, and the flush sequence — not a size cap, not a TTL, not attempts-based escalation to \`retriable: false\`.

What *is* true of a 24-entry queue:

- **\`--retry-pm\` is a whole-queue pass** under the same §2 policy (3 attempts, 1s/3s, 15s budget) — 24 entries against a still-flaky Linear is a worst case of ~six minutes and one line of output: \`flushed 18 / failed 6\`.
- **\`retriable: false\` entries are never touched** — a 403 sits there until \`--retry-pm --force\`. A failed write you can still see is an audit trail; one swept out is a hole.

Absent a cap, what you'd watch is the queue length itself. That's a gap in the protocol, not a feature of it.`,
    },
    {
      type: "beat",
      phase: "monitor",
      label: "11:05Z — postmortem and remediation",
      caption: "PLAT-5104 gets a written postmortem, two owned action items, and only then a Done transition.",
      skills: ["oc-monitoring-ops"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "partner-x posted their RCA — bad edge config push at 10:11:28, rolled back 10:30:40. Matches our window exactly, so we're not chasing anything. `/oc-monitor postmortem PLAT-5104` — SEV3, zero customer impact, and the per-receiver timeout work goes to vee@, not me.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-monitoring-ops",
      content:
`Drafting from the incident-response template, timeline filled from PLAT-5104's comment thread and the alert payloads rather than from memory.

\`\`\`
[main 4d0e77a] docs(monitoring): postmortem for PLAT-5104  1 file, 96 insertions(+)
PLAT-5105  vee@onramp.dev   due 2026-05-15  per-receiver timeout + circuit breaker
PLAT-5106  maya@onramp.dev  due 2026-05-12  raise threshold, upstream suppression
\`\`\`

Mitigation: **none applied, and none warranted** — a positive finding, not an empty field.

**What didn't work** carries the rest: \`queue_depth\` isn't segmented by receiver, so nothing in the payload pointed at partner-x — you found them by hand at 10:24, twelve minutes in. And the threshold encodes "our queue is broken" while this alert meant "an upstream is broken and we're absorbing it correctly."

Postmortem marker comment [11:18:14Z], then \`save_issue(state="Done")\` [11:18:15Z] — 46 minutes after the queue drained. The state existed so those 46 minutes couldn't be skipped.`,
      artifacts: ["postmortem", "incident-ticket"],
    },
    {
      type: "beat",
      phase: "operate",
      label: "11:20Z — what actually made it work",
      caption: "Nine skills wrote on this thread. Every comment carried a marker; the four writes that failed were replayed, not lost.",
      skills: ["oc-integrations-engineer"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "Filed PLAT-5107 myself — \"audit the other seven indexes a221f08 dropped\", yusuf@, due 2026-05-15, since he wrote the cleanup and knows what he thought was duplicated. Before I close this: summarise. What made the v1.3 loop work where v1.2's prose didn't?",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-integrations-engineer",
      content:
`Three things, and one of them only looks like a feature in hindsight.

**1. Concrete tool names instead of a placeholder.** v1.2's \`mcp.<provider>.get_issue\` made a session guess, and a guess that misses is indistinguishable from Linear being down. Protocol §1 is a flat table matched against what the MCP server actually exposes: consulted eleven times today, never wrong.

**2. Idempotency markers, not just retries.** Every agent-written comment carries \`<!-- opchain:<skill>:<event>:<id> -->\` and every write pre-checks it. That's what let the 10:42 flush post four writes it had already attempted four times, without a single duplicate.

**3. The deferred queue turned an outage into a delay** — though §4 still has no size cap, no TTL, and no attempts-based escalation.

The parts that weren't clean are in the record too — two failed bug-check rounds, a migration that couldn't run in a transaction, a test asserting a cost decision on a 240-row fixture, and eight dropped indexes narrowed to one because you said so at 09:22. That's what the thread is for.`,
      artifacts: ["checkpoint-trace"],
    },
  ],
};
