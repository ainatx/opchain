import type { Walkthrough } from "./types";

/**
 * Scenario 5 — oc-migration-ops runs a D1 → Postgres cutover on a live
 * Cloudflare Workers app, with oc-deploy-ops shipping every code change and
 * oc-monitoring-ops holding the phase gates. Demonstrates the "change the
 * engine mid-flight" side chain: a nine-step plan with a rollback procedure
 * per step, two real failures (a parity-hash mismatch and a collation
 * discrepancy that pauses the read ramp), and two explicit points of no
 * return.
 */
export const postgresMigration: Walkthrough = {
  id: "postgres-migration",
  title: "Swap D1 for Postgres without downtime",
  tagline: "D1 → Postgres without the outage",
  summary:
    "A live Workers app ran out of D1. oc-migration-ops writes a nine-step cutover, oc-deploy-ops ships each change, oc-monitoring-ops holds every gate.",
  description:
    "A six-month-old task tracker on Cloudflare Workers + D1 is at 9.71 GB of D1's 10 GB per-database ceiling, most of it one column of edit history on the biggest tenant. The team picked Supabase Postgres and needs to cut over with users on the app. oc-migration-ops runs assessment → plan → execute → verify, decomposing the swap into nine steps — snapshot, schema + Hyperdrive, dual-write, watermarked backfill, read ramp, require-PG-writes, write cutover, code removal, D1 delete — each with its own verification and rollback procedure. Two of them are points of no return and neither runs without the user saying so out loud. oc-deploy-ops ships the adapter and the dual-write path before a single flag moves; oc-monitoring-ops gates each phase. Nothing is clean: the drift checker loses two rows to KV flag propagation, the first parity run fails on 14 of 14 tables because Postgres renders booleans and timestamps differently, and the 10% read ramp pauses on a collation-ordering discrepancy that takes a hotfix deploy. Every step is reversible in ≤ 60 seconds — the KV cacheTtl floor, not a number anyone wished for. The whole thing lands in a long Wednesday.",
  inputs: [
    "Live Cloudflare Worker + D1 `taskflow-prod` — 2,149,992 rows across 14 tables",
    "`wrangler d1 info` reports 9.71 GB against D1's 10 GB per-database limit",
    "Target: Supabase Postgres (us-east-1), reached through a Hyperdrive binding",
    "Zero downtime, read-your-writes preserved, every step reversible in ≤ 60 s",
  ],
  outputs: [
    {
      id: "migration-plan",
      label: "Migration plan (9 steps, 2 points of no return)",
      kind: "plan.md",
      body:
`# Migration Plan — D1 → Postgres (Supabase + Hyperdrive)

**Produced by** oc-migration-ops \`/oc-migrate plan\` · **Risk** HIGH · **Pattern** expand → migrate → contract · **Steps** 9 · **Target window** Wed 2026-04-22 · **Wall clock** 5 h 42 m + a 3-day freeze · **Approval gate** ★ pending

## 1. Target end state

- All production reads and writes go \`Worker → HYPERDRIVE binding → aws-0-us-east-1.pooler.supabase.com:6543 → postgres\`.
- Hyperdrive owns connection pooling and TLS reuse; Supavisor sits behind it. **Hyperdrive query caching is disabled** (\`--caching-disabled\`) — this app is read-your-writes and a 60 s cached SELECT would break invariant 5.
- \`drizzle-orm/postgres-js\` replaces \`drizzle-orm/d1\` behind the existing \`lib/db/adapter.ts\` seam. No call site outside \`lib/db/\` changes.
- The \`DB\` (D1) binding stays in \`wrangler.jsonc\` until Step 9 — it is the rollback path, not dead weight.
- All 14 tables migrated; row counts and canonicalized column hashes equal at the backfill watermark.
- D1 frozen read-only (app-enforced) for **3 days**, then deleted by hand.

### 1.1 \`wrangler.jsonc\` diff

\`\`\`diff
   "compatibility_date": "2026-03-10",
+  "compatibility_flags": ["nodejs_compat"],
   "d1_databases": [
     { "binding": "DB", "database_name": "taskflow-prod", "database_id": "6e1a4d77-…" }
   ],
+  "hyperdrive": [
+    { "binding": "HYPERDRIVE", "id": "b7d41f0c9e2a4d18a5c3e6f70b9d2a11" }
+  ],
   "kv_namespaces": [
     { "binding": "FLAGS", "id": "c9f2b1a0…" }
   ],
   "r2_buckets": [
     { "binding": "SNAPSHOTS", "bucket_name": "taskflow-d1-snapshots" }
   ]
\`\`\`

\`nodejs_compat\` is required — \`postgres-js\` needs \`node:crypto\` and \`node:net\` shims. Without the flag the Worker builds and then throws at first connect.

## 2. Invariants (MUST hold through every step)

1. **Read availability 100%.** No step may cause a read error visible to an end user.
2. **Write durability 100%.** Every acknowledged write reaches Postgres **from Step 6 onward**. Steps 3–5 are deliberately best-effort on the Postgres side (see §4 Step 3) — that is why Step 6 exists as its own gate and why no read ramp starts before it.
3. **Rollback ≤ 60 s.** Every step is gated by a KV flag. Workers KV \`cacheTtl\` has a **60-second floor** and KV writes are eventually consistent, so 60 s is the honest number; anything faster would need a Durable Object. We measured it (Step 5a) instead of assuming it.
4. **Backfill is transactional per table** and idempotent. A partial table is a FAIL; re-run it.
5. **Read-your-writes.** The read ramp is sticky per tenant (\`FLAG_PG_READ_PCT\` hashes \`team_id\`, not \`request_id\`), so a tenant whose writes are landing in both engines never reads from the engine it did not just write.
6. **No dropped data.** The 09:58 export in R2 is the rollback artifact and is never the backfill source.

## 2.5 Type mapping (SQLite → Postgres)

A SQLite → Postgres schema does not diff clean. SQLite has no boolean, no timestamptz, no identity columns. Every row below is a translation the migration performs, and every one of them is a way the parity check can lie to you.

| Category | Count | Columns | D1 | Postgres | Action |
|---|---:|---|---|---|---|
| Integer booleans | 9 | \`tasks.done\`, \`tasks.archived\`, \`projects.is_archived\`, \`users.is_active\`, \`users.email_verified\`, \`memberships.is_admin\`, \`labels.is_system\`, \`notifications.is_read\`, \`api_tokens.revoked\` | \`INTEGER\` 0/1 | \`boolean\` | Cast on insert; **canonicalize on both sides before hashing** |
| Text datetimes | 31 | \`created_at\` + \`updated_at\` on all 14 tables (28), plus \`tasks.due_at\`, \`subscriptions.renews_at\`, \`api_tokens.expires_at\` | \`TEXT\` \`'YYYY-MM-DD HH:MM:SS'\` | \`timestamptz\` | Parse as UTC; hash via \`to_char(…, 'YYYY-MM-DD HH24:MI:SS')\` |
| Identity columns | 14 | one per table | \`INTEGER PRIMARY KEY AUTOINCREMENT\` | \`bigint generated by default as identity\` | Backfill explicit ids, then \`setval\` — **twice** (see Step 4 and Step 7) |
| JSON text | 2 | \`task_history.diff\`, \`audit_log.payload\` | \`TEXT\` | \`jsonb\` | Validate on insert; quarantine unparseable rows as \`{"_raw": …}\` |
| Collation | — | every \`ORDER BY <text>\` | \`BINARY\` | \`en_US.UTF-8\` | \`ORDER BY … COLLATE "C"\` in \`lib/db/queries/\`, **not** a DB-level collation |

The last row is the one that bites in production rather than in CI: \`ORDER BY title\` puts \`Zebra\` before \`apple\` on SQLite and after it on Postgres. It never shows up in a row-count check.

### 2.6 Where the 9.71 GB is

\`task_history.diff\` stores the full before/after document on every edit and averages 16 KB — that single column is **6.6 GB of the 9.71**. Tenant \`acme\` is 4.1 GB of it. That also explains the ~4.5 KB average row size; the row count alone would never get you to 9.71 GB.

Expected Postgres size is **~11.4 GB** (+17%): row headers, 23 indexes, and \`jsonb\` binary representation costing more than minified JSON text.

## 3. Pre-flight (Tuesday)

- [x] Supabase project \`taskflow-pg\` provisioned, us-east-1, **Small** compute (2-core ARM, 2 GB RAM, 60 direct / 200 pooler connections), 32 GB disk.
- [x] \`drizzle.pg.config.ts\` written; \`drizzle-kit generate\` produces 14 tables + 23 indexes.
- [x] R2 bucket \`taskflow-d1-snapshots\` created, 30-day lifecycle rule.
- [x] Drift-checker Worker written (read-only against both engines; also a reconciler — see Step 3).
- [x] Failed-write queue (Cloudflare Queues, \`taskflow-pg-retry\`, max depth 100k) provisioned.
- [x] \`#migration-pg\` opened; PagerDuty escalation tuned; on-call notified.
- [x] Schema-migration freeze agreed **Wed 10:00 → Sat 15:16**. \`labels.color\` is pushed to Saturday.

## 4. Steps

### Step 1: Snapshot D1 to R2 (rollback artifact)

**Owner** CLAUDE
**What Changes** Nothing in prod. Writes one object to R2.
**Pre-Conditions** \`wrangler\` authenticated; R2 bucket exists.
**Procedure**
\`\`\`bash
wrangler d1 export taskflow-prod --remote --output=snapshots/2026-04-22-0958.sql
gzip -9 snapshots/2026-04-22-0958.sql
wrangler r2 object put taskflow-d1-snapshots/2026-04-22/full.sql.gz \\
  --file=snapshots/2026-04-22-0958.sql.gz
\`\`\`
**Verification**
- [ ] Export reports \`num_tables: 14\` and a row total within 0.1% of \`SELECT count(*)\` per table.
- [ ] \`wrangler r2 object get\` round-trips the gzip and \`gunzip -t\` passes.
**Rollback** Delete the R2 object. Nothing else to undo.
**Point of No Return?** NO.
**Estimated Time** CLAUDE: 12 min | USER: 0 min

### Step 2: Apply schema + create Hyperdrive

**Owner** CLAUDE
**What Changes** New Postgres schema; new Hyperdrive config; \`wrangler.jsonc\` binding (§1.1).
**Pre-Conditions** Step 1 verified. Supabase connection string in \`.dev.vars\`.
**Procedure**
\`\`\`bash
npx drizzle-kit migrate --config drizzle.pg.config.ts
wrangler hyperdrive create taskflow-pg --caching-disabled \\
  --connection-string="postgresql://postgres.<ref>:***@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
npx tsx scripts/hyperdrive-ping.ts --samples 1000
\`\`\`
**Verification**
- [ ] \`\\dt\` lists 14 tables; \`\\di\` lists 23 indexes.
- [ ] \`information_schema.columns\` shows 9 \`boolean\`, 31 \`timestamptz\`, 2 \`jsonb\`, 14 identity columns — matching §2.5 exactly.
- [ ] \`SELECT 1\` through the binding from the \`iad\` POP: p99 < 10 ms over 1,000 samples.
**Rollback** \`wrangler hyperdrive delete taskflow-pg\`; \`drop schema public cascade\`; revert the binding. Zero prod impact — no code reads it yet.
**Point of No Return?** NO.
**Estimated Time** CLAUDE: 18 min | USER: 0 min

### Step 3: Enable dual-write (best-effort)

**Owner** CLAUDE
**What Changes** \`FLAG_PG_DUAL_WRITE\` in KV. The code is already deployed (oc-deploy-ops ships it before this step runs); the flag is what turns it on.
**Pre-Conditions** Step 2 verified. \`lib/db/dual-write.ts\` live in production and dormant.
**Procedure**
\`\`\`bash
wrangler kv key put --binding=FLAGS FLAG_PG_DUAL_WRITE true
npx tsx scripts/watermark.ts --out migrations/watermark-2026-04-22.json
npx tsx scripts/drift-check.ts --watch --interval 300
\`\`\`
The **watermark is taken at this moment, not at Step 1**. Everything at or below it is the backfill's job; everything above it is dual-write's job. That is the whole seam.

Every Postgres write in this window is an **upsert**, not an update: \`INSERT … ON CONFLICT (id) DO UPDATE\`. During the backfill a row below the watermark may not exist in Postgres yet, and a plain \`UPDATE\` would silently affect zero rows. This is the single most common way this migration loses data quietly.

Postgres writes are **best-effort here**: a failure logs, enqueues to \`taskflow-pg-retry\`, and does **not** fail the request. D1 is still the source of truth. Invariant 2 becomes binding at Step 6, not here.
**Verification**
- [ ] Drift checker reports 0 delta on all 14 tables for 6 consecutive 5-minute intervals (30 min).
- [ ] Write p99 delta vs. the D1-only baseline ≤ +5 ms.
- [ ] Failed-write queue depth returns to 0 between intervals.
**Rollback** \`wrangler kv key put --binding=FLAGS FLAG_PG_DUAL_WRITE false\`. D1-only write path resumes within 60 s.
**Point of No Return?** NO.
**Estimated Time** CLAUDE: 8 min | USER: 0 min (30 min of gate wall-clock)

### Step 4: Backfill to the watermark + verify + \`setval\`

**Owner** CLAUDE
**What Changes** 2,149,992 rows inserted into Postgres. 14 sequences advanced.
**Pre-Conditions** Step 3 gate PASS. Watermark file present.
**Procedure**
\`\`\`bash
npx tsx migrations/scripts/d1-to-postgres.ts \\
  --watermark migrations/watermark-2026-04-22.json \\
  --batch 500 --on-conflict update-if-newer
\`\`\`
\`--on-conflict update-if-newer\` emits \`ON CONFLICT (id) DO UPDATE SET … WHERE excluded.updated_at > <table>.updated_at\`, so a row that dual-write already upserted with fresher data is never clobbered by the older backfill copy.

Parity is checked with a **canonicalized** hash on both sides, never a raw \`md5(concat(columns))\`:

\`\`\`sql
-- Postgres side
md5(string_agg(
  id::text || '|' ||
  (CASE WHEN done THEN 1 ELSE 0 END)::text || '|' ||
  to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') || '|' ||
  coalesce(title, ''), ',' ORDER BY id))
FROM tasks WHERE id <= :watermark;
\`\`\`

Then advance every identity sequence, or the first Postgres-generated insert collides with \`<table>_pkey\`:

\`\`\`sql
SELECT setval('tasks_id_seq', (SELECT max(id) FROM tasks));
-- ×14
\`\`\`
**Verification**
- [ ] Per-table row count at or below the watermark equal on both engines, delta 0.
- [ ] Canonicalized hash equal, 14 of 14.
- [ ] \`setval\` returns \`max(id)\` for all 14 sequences.
- [ ] \`jsonb\` quarantine count reported, not swallowed.
**Rollback** \`TRUNCATE\` all 14 Postgres tables, restart from the watermark. D1 is untouched throughout, dual-write keeps running.
**Point of No Return?** NO.
**Estimated Time** CLAUDE: 2 h 20 m | USER: 0 min

### Step 5: Read ramp — 10% → 50% → 100%

**Owner** CLAUDE+USER
**What Changes** \`FLAG_PG_READ_PCT\` 0 → 10 → 50 → 100. Reads dual-execute; Postgres answers, D1 shadows, results are compared.
**Pre-Conditions** Step 4 verified. Step 5a drill completed.
**Procedure**
\`\`\`bash
npx tsx scripts/migrate-step.ts 5 --dry-run          # prints the flag writes, changes nothing
wrangler kv key put --binding=FLAGS FLAG_PG_READ_PCT 10
# hold ≥ 20 min, then 50, then 100
\`\`\`
**Verification**
- [ ] Shadow discrepancy count = 0 at each ramp before the next one.
- [ ] Read p99 ≤ baseline + 15%.
- [ ] Error rate ≤ 0.1%.
**Rollback** \`FLAG_PG_READ_PCT 0\`. Reads return to D1 within 60 s.
**Point of No Return?** NO.
**Estimated Time** CLAUDE: 10 min | USER: 45 min of watching

#### Step 5a: Rollback drill (runs *before* Step 5 for real)

Set \`FLAG_PG_READ_PCT\` to 10, wait for propagation, set it back to 0, and **measure**. Expected ≤ 60 s, both directions, zero errors in the window. If the observed number is worse than 60 s, Step 5 does not start — invariant 3 is not a wish, it is a measurement.

### Step 6: Require Postgres writes

**Owner** CLAUDE
**What Changes** \`FLAG_PG_WRITE_REQUIRED=true\`. The Postgres write stops being best-effort; a failure now fails the request instead of queueing.
**Pre-Conditions** Step 5 at 100% and clean. Failed-write queue empty.
**Procedure** \`wrangler kv key put --binding=FLAGS FLAG_PG_WRITE_REQUIRED true\`, then hold 15 minutes.
**Verification**
- [ ] Error rate unchanged for 15 min.
- [ ] Failed-write queue stays at 0 (nothing to queue any more).
- [ ] Invariant 2 now provable: no acknowledged write can be Postgres-less.
**Rollback** Flip it back to \`false\`; the queue absorbs failures again.
**Point of No Return?** NO — but it is the gate that makes Step 7 safe. An in-flight write at the moment of Step 7 is only durable because this ran 15 minutes earlier.
**Estimated Time** CLAUDE: 3 min | USER: 15 min of wall-clock

### Step 7: Write cutover ★ POINT OF NO RETURN

**Owner** CLAUDE+USER — **requires explicit user confirmation**
**What Changes** \`setval\` re-run, then \`FLAG_PG_DUAL_WRITE=false\`, then \`FLAG_D1_READONLY=true\`. Postgres becomes the source of truth.
**Pre-Conditions** Step 6 held clean for 15 min (14:52 → 15:07). User has confirmed in writing.
**Procedure**
\`\`\`sql
-- FIRST. The Step 4 setval is stale: dual-write inserted explicit ids past it
-- and an explicit id does not advance an identity sequence.
SELECT setval('tasks_id_seq', (SELECT max(id) FROM tasks));   -- ×14
\`\`\`
\`\`\`bash
wrangler kv key put --binding=FLAGS FLAG_PG_DUAL_WRITE false
wrangler kv key put --binding=FLAGS FLAG_D1_READONLY true
\`\`\`
\`FLAG_D1_READONLY\` is **app-enforced** — D1 has no read-only mode. The adapter throws on any write attempt against the \`DB\` binding and reports it to \`#ops\`.
**Verification**
- [ ] First Postgres-generated \`INSERT … RETURNING id\` succeeds and returns \`max(id) + 1\`.
- [ ] Zero writes reach the \`DB\` binding for 15 min.
- [ ] Write p99 within +20% of the dual-write number.
**Rollback** Flip both flags back within the 3-day freeze. Writes taken while Postgres was primary must be replayed into D1 from \`task_history\` — the drift checker runs in reverse for this and it is the reason the freeze exists.
**Point of No Return?** **YES.** After this, Postgres holds writes D1 has never seen. Rollback stops being a flag flip and becomes a reconciliation.
**Estimated Time** CLAUDE: 6 min | USER: 2 min (the confirmation)

### Step 8: Remove dual-write code

**Owner** CLAUDE
**What Changes** \`lib/db/dual-write.ts\` deleted; the D1 branch of \`lib/db/adapter.ts\` reduced to the rollback path; ships via \`/oc-deploy staging\` → \`/oc-deploy prod\`.
**Pre-Conditions** Step 7 verified for 15 min.
**Procedure** Normal PR + deploy flow. The \`DB\` binding **stays** in \`wrangler.jsonc\`.
**Verification**
- [ ] \`npx vitest run\` green; \`npx tsc --noEmit\` clean.
- [ ] Smoke: health 200, auth 401, frontend loads.
- [ ] \`grep -r "env.DB" src/ | grep -v rollback\` returns nothing.
**Rollback** \`npx wrangler rollback <prev-version-id>\`.
**Point of No Return?** NO.
**Estimated Time** CLAUDE: 25 min | USER: 5 min (PR review)

### Step 9: Delete D1 ★ POINT OF NO RETURN

**Owner** USER — **manual, on or after Sat 2026-04-25 15:16**
**What Changes** \`taskflow-prod\` ceases to exist. The R2 snapshot is what is left.
**Pre-Conditions** 3 clean days. Zero \`any_request_to_d1\` alerts. User runs it deliberately.
**Procedure**
\`\`\`bash
wrangler d1 delete taskflow-prod      # interactive confirm; no --force
# then strip the d1_databases block from wrangler.jsonc and deploy
\`\`\`
**Verification** \`wrangler d1 list\` no longer lists it; deploy is green without the binding.
**Rollback** None. Restore from \`r2://taskflow-d1-snapshots/2026-04-22/full.sql.gz\` into a new database, which is a fresh migration, not a rollback.
**Point of No Return?** **YES.** This step is never scheduled, never automated, and never run by a cron. A Worker cron cannot invoke \`wrangler\` and nothing should be able to drop a production database without a human present.
**Estimated Time** CLAUDE: 0 min | USER: 5 min

## 5. Verification gates

- **Per step:** p99 ≤ prior step + 15%; error rate ≤ 0.1%; no new alert firing for 15 min; the step's own verification checks pass.
- **Post-cutover (24 h):** Postgres CPU < 70%; Hyperdrive origin connections < 20 of 25.
- **Freeze window (3 d):** zero rollback requests; zero requests to the \`DB\` binding.

## 6. Timeline

\`\`\`
Tue        pre-flight (§3)
Wed 09:58  Step 1  D1 export → R2
Wed 10:12  Step 2  schema + Hyperdrive
Wed 10:31  ——      oc-deploy-ops ships adapter + dual-write code (a3f9c2e1)
Wed 10:47  Step 3  FLAG_PG_DUAL_WRITE=true; watermark taken
Wed 11:20  ★ gate  dual-write drift clean for 30 min
Wed 11:30  Step 4  backfill starts
Wed 13:34  ——      backfill done (2 h 04 m)
Wed 13:48  ——      parity PASS on the second attempt (canonicalized hash)
Wed 13:52  ——      setval ×14
Wed 13:58  Step 5a rollback drill
Wed 14:02  Step 5  read ramp 10%
Wed 14:07  ——      first shadow discrepancy alert (collation)
Wed 14:14  ——      RAMP PAUSED — 3 discrepancies, same query shape
Wed 14:19  ——      hotfix shipped (c81e4f02)
Wed 14:22  Step 5  10% resumed → 14:32 50% → 14:47 100%
Wed 14:52  Step 6  FLAG_PG_WRITE_REQUIRED=true (15-min hold to 15:07)
Wed 15:15  Step 7  ★ PoNR — FLAG_PG_DUAL_WRITE=false
Wed 15:16  Step 7  FLAG_D1_READONLY=true; 3-day freeze starts
Wed 15:40  Step 8  dual-write code removed
Sat 15:16  Step 9  ★ PoNR — manual D1 delete becomes eligible
\`\`\`

## 7. Communication

| Time | Channel | What |
|---|---|---|
| Tue EOD | \`#announcements\` | "PG migration tomorrow 10:00 PT — no scheduled downtime; schema freeze until Saturday" |
| Wed 09:50 | \`#migration-pg\` | "Going live in 10 minutes" |
| Wed 14:47 | \`#announcements\` | "Reads serving from Postgres; write cutover at 15:15" |
| Wed 15:16 | \`#announcements\` + status page | "Migration complete; Postgres primary; D1 frozen until Saturday" |
| Sat | \`#announcements\` | "D1 deleted; migration closed; schema freeze lifted" |

## 8. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Backfill exceeds 2 h | Med | Low | Holds Step 5; invisible to users. Actual: 2 h 04 m. |
| R2 | Dual-write drift > 0.1% | Med | Med | Drift checker alerts *and* reconciles by enqueueing the missing id. |
| R3 | Read p99 tail > baseline + 15% at a ramp | Med | Med | Pause the ramp; Hyperdrive origin pool is the first thing to look at. |
| R4 | Hyperdrive origin connections saturate at 100% reads | Low | High | Cap is 25. Observed peak 19. Supabase Small takes 200 pooler connections, so the ceiling is Hyperdrive's, not Supabase's. |
| R5 | Type translation lies through a naive parity hash | **High** | High | §2.5. Hash on canonicalized values, on both sides. Expect the first run to fail. |
| R6 | Collation ordering differs on \`ORDER BY <text>\` | **High** | Med | \`COLLATE "C"\` in the query layer. Caught by the shadow read compare, not by counts. |
| R7 | Backfill overlaps dual-write and one clobbers the other | High | High | Watermark + \`ON CONFLICT (id) DO UPDATE … WHERE excluded.updated_at > <table>.updated_at\`; dual-write upserts rather than updates. |
| R8 | Identity sequence collides after cutover | High | High | \`setval\` ×14 at Step 4 **and again** at Step 7 — explicit ids do not advance a sequence. |
| R9 | KV flag propagation is slower than believed | Med | Med | Measured in Step 5a. Plan says 60 s because that is the \`cacheTtl\` floor. |

## 9. If a rollback fires

1. \`#migration-pg\` — "rolling back from Step N due to X; ETA Y minutes."
2. Status page — only for Steps 5–7 (user-visible).
3. Postmortem within 5 business days.

Before Step 7 a rollback is one \`wrangler kv key put\` and ≤ 60 s. After Step 7 it is a reconciliation job and a conversation. That is the entire reason Step 7 is called out as a point of no return rather than just another flag.

## 10. Step ↔ ticket mirror

Parent: **TASK-1170 — Migration: D1 → Postgres**

| Ticket | Step | Title |
|---|---|---|
| TASK-1171 | 1 | Snapshot D1 to R2 |
| TASK-1172 | 2 | Apply Postgres schema + create Hyperdrive config |
| TASK-1173 | 3 | Enable dual-write, take watermark |
| TASK-1174 | 4 | Backfill to watermark, verify parity, setval |
| TASK-1175 | 5 | Read ramp 10/50/100 (incl. 5a rollback drill) |
| TASK-1176 | 6 | Require Postgres writes |
| TASK-1177 | 7 | ★ Write cutover (PoNR) |
| TASK-1178 | 8 | Remove dual-write code |
| TASK-1179 | 9 | ★ Delete D1 (PoNR, manual, ≥ Sat 15:16) |

Checkpoint: \`.checkpoints/oc-migration-ops.checkpoint.json\`.`,
    },
    {
      id: "deploy-log",
      label: "oc-deploy-ops — dual-write ship + collation hotfix",
      kind: "deploy.log",
      body:
`# /oc-deploy — taskflow, 2026-04-22

**Produced by** oc-deploy-ops · **Provider:** Cloudflare Workers (detected from \`wrangler.jsonc\`) · **Two production runs this day**

## 1. 10:31 — \`a3f9c2e1\` · adapter + dual-write path

\`\`\`
[oc-deploy-ops] Range: 7b21d0c4..9e04ab31 (11 commits)
[oc-deploy-ops] Audit gate:
  ✓ oc-bug-check                    PASS
  ✓ npx tsc --noEmit                clean
  ✓ npx vitest run                  142 passed, 0 failed  (4.81s)
      lib/db/adapter.test.ts         38 passed
      lib/db/dual-write.test.ts      21 passed
      lib/db/queries/*.test.ts       53 passed
      (30 pre-existing elsewhere)

[oc-deploy-ops] npx wrangler deploy --env staging
  Uploaded  taskflow-staging (3.42 sec)
  Version   f11c8d3a
  Bindings  DB (d1) · FLAGS (kv) · SNAPSHOTS (r2) · HYPERDRIVE (hyperdrive)

[oc-deploy-ops] smoke → https://staging.taskflow.app
  ✅ API health      GET /api/health         200   (0.14s)
  ✅ Auth guard      GET /api/me             401   (0.09s)
  ✅ Frontend loads  GET /                   200   (0.21s)
  ✅ Dual-write off  POST /api/tasks         201   x-oc-dual-write: dormant

[oc-deploy-ops] PREV_VERSION recorded: 7b21d0c4
[oc-deploy-ops] npx wrangler deploy
  Uploaded  taskflow (3.77 sec)
  Version   a3f9c2e1
  Routes    taskflow.app/* · api.taskflow.app/*

[oc-deploy-ops] smoke → https://taskflow.app
  ✅ API health      GET /api/health         200   (0.19s)  {"ok":true,"db":"d1","sha":"9e04ab31"}
  ✅ Auth guard      GET /api/me             401   (0.11s)
  ✅ Frontend loads  GET /                   200   (0.26s)
\`\`\`

The dual-write code ships **dormant**. \`FLAG_PG_DUAL_WRITE\` is still \`false\` in KV; Step 3 is what wakes it. Shipping the code and flipping the behaviour are two different events on purpose — a bad deploy rolls back with \`wrangler rollback\`, a bad flag rolls back in 60 s without one.

## 2. 14:19 — \`c81e4f02\` · collation hotfix (ramp paused)

\`\`\`
[oc-deploy-ops] Hotfix path — ramp is paused, gate is oc-monitoring-ops, not oc-code-auditor
[oc-deploy-ops] Diff: lib/db/queries/tasks.ts (+3 −3)
  ✓ npx tsc --noEmit                clean
  ✓ npx vitest run                  145 passed, 0 failed  (4.93s)
      + tasks-order-collation.test.ts  3 passed  (new)

[oc-deploy-ops] npx wrangler deploy --env staging → 0b7e91c5
  ✅ shadow compare on staging fixtures   0 / 4,102 discrepancies

[oc-deploy-ops] PREV_VERSION recorded: a3f9c2e1
[oc-deploy-ops] npx wrangler deploy
  Version   c81e4f02
  ✅ API health      GET /api/health         200   (0.18s)
  ✅ GET /api/projects/42/tasks?sort=title   200   (0.23s)
\`\`\`

Elapsed from the first discrepancy alert (14:07) to hotfix live (14:19): **12 minutes** — 7 of triage before the ramp was paused at 14:14, then 5 of writing the test and shipping.

## 3. Follow-up

Step 8 (dual-write removal) ships as \`e04b71a9\` at 15:40 on the normal PR path, PREV_VERSION \`c81e4f02\`. It is a separate deploy record because it is a separate audit gate.

Checkpoint: \`.checkpoints/oc-deploy-ops.checkpoint.json\` — \`prev_prod_version: "c81e4f02"\`, \`smoke_results: {"health":"pass","auth":"pass","frontend":"pass"}\`.`,
    },
    {
      id: "step-05-report",
      label: "Step 5 — read ramp: FAIL at 10%, fixed, PASS",
      kind: "report.md",
      body:
`## Step 5 — Execution Report

### Status: FAILED → PASSED (attempt 2)

### Procedure Output

\`\`\`
13:58:04  Step 5a  rollback drill
          kv put FLAG_PG_READ_PCT 10   → observed on all isolates at +49 s
          kv put FLAG_PG_READ_PCT 0    → observed on all isolates at +52 s
          errors during the 101 s window: 0
          verdict: within the 60 s budget in both directions

14:02:11  kv put FLAG_PG_READ_PCT 10   (attempt 1)
14:07:33  SHADOW DISCREPANCY  1 /  9,904  → alert; held the ramp under triage
14:14:02  SHADOW DISCREPANCY  3 / 21,842  → ramp PAUSED, kv put FLAG_PG_READ_PCT 0

          req_9f3a1c  14:06:51  GET /api/projects/42/tasks?sort=title
          req_a07e44  14:09:12  GET /api/projects/7/tasks?sort=title&dir=asc
          req_c2b8d0  14:13:40  GET /api/projects/42/tasks?sort=title

          diff (req_9f3a1c, first 4 of 118 rows):
            d1 : ["Zebra pass","apple crate","beta sweep","Migrate billing"]
            pg : ["apple crate","beta sweep","Migrate billing","Zebra pass"]
          row sets identical; ordering differs
\`\`\`

### Diagnosis

Not a data problem — a collation problem. SQLite's default \`BINARY\` collation
sorts by code point, so every uppercase letter sorts before every lowercase one.
Postgres on Supabase runs \`en_US.UTF-8\`, which is case-insensitive-ish and
sorts \`Zebra\` after \`apple\`. Row counts, checksums, and the Step 4 parity hash
all pass with this bug present — it is only visible when you compare **ordered**
result sets, which is exactly what the shadow read does.

Three of 21,842 reads hit it because only three requests in that window were
both routed to Postgres by the 10% flag *and* using \`sort=title\` on a project
whose titles mix cases. It is the default sort on every project page, so at 100%
this would have been closer to 4,000 requests an hour.

The ramp was not pulled on the first alert at 14:07 — one in 9,904 is inside the
range where the shadow comparator itself could be racing. It was pulled at 14:14
when the third one arrived on the same query shape.

### Fix

\`\`\`diff
  // lib/db/queries/tasks.ts:88
- export const listByProject = (db: Db, projectId: number, sort: Sort) =>
-   db.select().from(tasks).where(eq(tasks.projectId, projectId))
-     .orderBy(sort === "title" ? asc(tasks.title) : desc(tasks.updatedAt));
+ // COLLATE "C" reproduces SQLite BINARY ordering byte-for-byte. Applied in the
+ // query layer, not as a column/database collation: a locale-dependent index
+ // would make this un-revertable and would not match D1 during the shadow window.
+ export const listByProject = (db: Db, projectId: number, sort: Sort) =>
+   db.select().from(tasks).where(eq(tasks.projectId, projectId))
+     .orderBy(sort === "title"
+       ? sql\`title COLLATE "C" ASC, id ASC\`
+       : desc(tasks.updatedAt));
\`\`\`

\`, id ASC\` is not cosmetic: \`title\` is not unique, and two rows with the same
title were free to come back in either order on either engine.

Shipped as \`/oc-deploy prod\` version **\`c81e4f02\`** at 14:19 (see the deploy log).
New test \`tasks-order-collation.test.ts\` asserts the ordering against a fixture
containing \`["Zebra pass","apple crate","beta sweep","Migrate billing"]\`.

### Verification Results

- [x] Step 5a drill — PASSED · flag observed at **+52 s**, under the 60 s budget
- [ ] 10% ramp (attempt 1) — **FAILED** · 3 / 21,842 shadow discrepancies
- [x] 10% ramp (attempt 2, 14:22) — PASSED · 0 / 18,410
- [x] 50% ramp (14:32) — PASSED · 0 / 110,204
- [x] 100% ramp (14:47) — PASSED · 0 / 221,407
- [x] Read p99 at 100% — PASSED · 20.2 ms vs 18.4 ms baseline (+9.8%, budget +15%)

### Duration

CLAUDE: 31 min | USER: 6 min (the "fix it in the query layer" call)

### Next

Step 6 — \`FLAG_PG_WRITE_REQUIRED=true\`, hold 15 min, then the Step 7 point-of-no-return confirmation.`,
    },
    {
      id: "verification-report",
      label: "/oc-migrate verify — final verification",
      kind: "verify.md",
      body:
`# Migration Verification — taskflow

**Produced by** oc-migration-ops \`/oc-migrate verify\` · **Signals from** oc-monitoring-ops · **Run at** Wed 2026-04-22 15:58

## Migration: D1 (SQLite) → Supabase Postgres via Hyperdrive
## Steps Completed: 8 of 9  (Step 9 is a manual point of no return, eligible Sat 15:16)

## Verification Results

| Layer | Status | Evidence | Notes |
|---|---|---|---|
| Schema | ✅ PASS | 14 tables, 23 indexes, 9 \`boolean\`, 31 \`timestamptz\`, 2 \`jsonb\`, 14 identity columns | Translated, not diffed — see §1 |
| Data | ✅ PASS | 2,149,992 rows ≤ watermark, delta 0; canonicalized hash 14/14 | First hash attempt failed; see §3 |
| API | ✅ PASS | 41/41 route tests green against Hyperdrive; 3 ordered-read cases added | Collation fix \`c81e4f02\`; see §4 |
| Performance | ✅ PASS | read p99 20.2 ms (baseline 18.4); write p99 11.7 ms (baseline 8.2) | +9.8% / +42.7%, both inside budget |
| Integration | ✅ PASS | \`/api/health\` \`database\` probe retargeted to Hyperdrive, 200 in 0.18 s | \`/oc-monitor setup\` |
| CI/CD | ✅ PASS | 145 passed on \`c81e4f02\`; 124 on \`e04b71a9\` | 21 dual-write tests deleted with their subject |

## Verdict: MIGRATION COMPLETE

Step 9 is outstanding by design, not by omission.

## 1. Step 2 — Schema (10:12 → 10:30)

\`drizzle-kit migrate --config drizzle.pg.config.ts\` applied **14 tables + 23 indexes in 4.2 s**.

There is no such thing as a clean diff between a SQLite schema and a Postgres one, so this step verifies a **translation** instead. \`information_schema.columns\` matches the plan's §2.5 table exactly:

| Translation | Expected | Observed |
|---|---:|---:|
| \`INTEGER\` 0/1 → \`boolean\` | 9 | 9 |
| \`TEXT\` → \`timestamptz\` | 31 | 31 |
| \`INTEGER PRIMARY KEY AUTOINCREMENT\` → \`bigint … identity\` | 14 | 14 |
| \`TEXT\` → \`jsonb\` | 2 | 2 |

Connectivity through the \`HYPERDRIVE\` binding from the \`iad\` POP: **p50 2.1 ms / p99 4.8 ms** over 1,000 \`SELECT 1\` round-trips. Hyperdrive query caching is **disabled**; the app is read-your-writes and a cached SELECT would break invariant 5. That is what "pre-warmed connections" means here — Hyperdrive holds them, an isolate cannot.

## 2. Step 3 — Dual-write (10:47 → 11:20)

- D1-only write p99 baseline: **8.2 ms**. With dual-write: **10.0 ms** (+1.8 ms, budget +5 ms).
- Worker CPU per request: **+1.1 ms** (postgres-js client overhead).
- Drift checker, 5-minute windows against the 10:47:12Z watermark:

\`\`\`
interval 1  10:52   14 tables   D1 +112   PG +112   Δ 0
interval 2  10:57   14 tables   D1 +128   PG +128   Δ 0
interval 3  11:02   notifications  D1 +9   PG +7    Δ −2   ⚠ ALERT
                    13 other tables                 Δ 0
interval 4  11:07   14 tables   D1 +121   PG +121   Δ 0   (2 replayed rows land)
interval 5  11:12   14 tables   D1 +134   PG +134   Δ 0
interval 6  11:17   14 tables   D1 +118   PG +118   Δ 0
\`\`\`

The two missing rows were \`INSERT … RETURNING\` calls on \`POST /api/tasks/:id/assign\`, served by two isolates that had not yet read \`FLAG_PG_DUAL_WRITE\` from KV (their cached reads landed at +31 s and +44 s after the \`kv put\`). Those isolates never attempted a Postgres write, so the failed-write queue had nothing to catch — the **drift checker's reconciler** is what found them, enqueued the two ids, and replayed them at 11:09. \`notifications\` reconciled at 28,301 / 28,301 on interval 4.

Failed-write queue: peak depth **3**, drained in **< 2 s**. Worst case is the propagation window times peak write rate — 60 s × 180 writes/s = **10,800**, against a queue ceiling of 100,000.

**Gate: PASS.**

## 3. Step 4 — Backfill (11:30 → 13:52)

- **2,149,992 rows at or below the 10:47:12Z watermark, migrated in 2 h 04 m.**
- Average **289 rows/s**; peak **1,120 rows/s** (\`tasks\`, batch 500). The average is dominated by \`tasks\` and \`task_history\`; the twelve small tables are noise.
- The 09:58 R2 export holds **2,149,204 rows** — 788 fewer. Those 788 were written between the export and the watermark and are backfilled from live D1, not from the snapshot. The export is the rollback artifact; it was never the backfill source.
- \`jsonb\` quarantine: **412 rows** of \`audit_log.payload\` did not parse as JSON and were stored as \`{"_raw": "<original text>"}\`. Not a migration failure — they were invalid in D1 too. See Open Issues.

### 3.1 Per-table breakdown

| Table | Rows | Hash match | Time | Rows/s |
|---|---:|:---:|---:|---:|
| \`tasks\` | 1,423,917 | ✓ | 89 m | 267 |
| \`task_history\` | 412,508 | ✓ | 22 m | 313 |
| \`comments\` | 188,442 | ✓ | 7 m | 449 |
| \`task_labels\` | 41,204 | ✓ | 90 s | 458 |
| \`notifications\` | 28,301 | ✓ | 71 s | 399 |
| \`attachments\` | 18,402 | ✓ | 41 s | 449 |
| \`audit_log\` | 12,514 | ✓ | 32 s | 391 |
| \`labels\` | 8,921 | ✓ | 22 s | 406 |
| \`memberships\` | 7,142 | ✓ | 18 s | 397 |
| \`projects\` | 4,204 | ✓ | 11 s | 382 |
| \`users\` | 2,891 | ✓ | 8 s | 361 |
| \`api_tokens\` | 822 | ✓ | 4 s | 206 |
| \`subscriptions\` | 412 | ✓ | 3 s | 137 |
| \`teams\` | 312 | ✓ | 2 s | 156 |
| **Total** | **2,149,992** | **14/14** | **2 h 04 m** | **289** |

### 3.2 Parity: attempt 1 FAILED

\`\`\`
13:36  parity check (md5(concat(columns)))
       tasks           1,423,917 = 1,423,917 rows   hash MISMATCH
       task_history      412,508 =   412,508 rows   hash MISMATCH
       … 14 of 14 tables: row counts equal, hashes differ on 100% of rows
\`\`\`

Row counts matched perfectly and every hash was wrong, which is the signature of a rendering difference rather than a data difference. Spot-check on \`tasks.id = 1\`:

\`\`\`
d1 : 1|1|2026-04-22 14:03:11|Migrate billing
pg : 1|t|2026-04-22 14:03:11+00|Migrate billing
\`\`\`

\`done\` renders as \`1\` on SQLite and \`t\` on Postgres; \`created_at\` gains \`+00\`. A raw \`md5(concat(columns))\` across two engines can only ever compare their formatters.

### 3.3 Parity: attempt 2 PASSED

Re-ran with both sides canonicalized — \`CASE WHEN done THEN 1 ELSE 0 END\`, \`to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')\`, \`coalesce(text_col, '')\`:

\`\`\`
13:48  parity check (canonicalized)
       14 / 14 tables match   elapsed 11 m 42 s
13:52  setval
       tasks_id_seq          → 1,423,917
       task_history_id_seq   →   412,508
       comments_id_seq       →   188,442
       … 14 of 14 sequences advanced
\`\`\`

**Gate: PASS.**

## 4. Step 5 — Read ramp (13:58 → 14:47)

| Ramp | Read p99 (ms) | Error rate | Discrepancy | PG CPU | Hyperdrive conns |
|---|---:|---:|---:|---:|---:|
| D1 baseline | 18.4 | 0.02% | — | — | — |
| 10% PG (14:02, attempt 1) | 19.1 | 0.02% | **3 / 21,842** | 12% | 8 / 25 |
| — first alert 14:07, ramp paused 14:14, hotfix \`c81e4f02\` live 14:19 — | | | | | |
| 10% PG (14:22, attempt 2) | 19.0 | 0.02% | 0 / 18,410 | 12% | 8 / 25 |
| 50% PG (14:32) | 19.6 | 0.01% | 0 / 110,204 | 28% | 14 / 25 |
| 100% PG (14:47) | 20.2 | 0.01% | 0 / 221,407 | 41% | 19 / 25 |

All three discrepancies were \`GET /api/projects/:id/tasks?sort=title\` and all three were ordering, not content: SQLite's \`BINARY\` collation sorts \`Zebra\` before \`apple\`, Supabase's \`en_US.UTF-8\` sorts it after. Fixed in the query layer (\`lib/db/queries/tasks.ts:88\` → \`ORDER BY title COLLATE "C", id\`) rather than with a column collation, so the index stays locale-independent and the change is revertable. Full detail in the Step 5 execution report.

350,021 shadow reads after the fix, zero discrepancies. The 5a rollback drill measured flag propagation at **+52 s**, inside the 60 s budget in both directions.

**Gate: PASS.**

## 5. Steps 6–8 — Write cutover (14:52 → 15:55)

\`\`\`
14:52:07  FLAG_PG_WRITE_REQUIRED  true    Postgres writes stop being best-effort
14:52→15:07  hold                         error rate 0.01%, queue depth 0 · 37,412 writes acked
15:15:02  setval ×14 (re-run)             tasks_id_seq → 1,424,005
15:15:21  FLAG_PG_DUAL_WRITE      false   ★ point of no return
15:16:04  FLAG_D1_READONLY        true    app-enforced; D1 has no read-only mode
15:16:48  first PG-generated insert       INSERT INTO tasks … RETURNING id → 1,424,006
\`\`\`

The Step 4 \`setval\` was stale by 88 rows by 15:15 — dual-write had been inserting explicit ids past it, and an explicit id does not advance an identity sequence. Re-running \`setval\` as the first action of Step 7 is what makes \`1,424,006\` land instead of a \`tasks_pkey\` violation on \`1,423,918\`.

- Write p99: **11.7 ms** (8.2 ms D1-only baseline, 10.0 ms dual-write). The rise is Postgres becoming the hot path with no D1 write to overlap against. The step budget is +20% over the dual-write number and 11.7 vs 10.0 is **+17%**; against the original D1-only baseline it is +42.7%, which is the number to quote to anyone who asks what this cost.
- Writes reaching the \`DB\` binding after 15:16: **0** in 39 minutes.
- Step 8 (\`e04b71a9\`, 15:40) removed \`lib/db/dual-write.ts\`. The \`DB\` binding stays until Step 9.

**Gate: PASS — D1 frozen; 3-day rollback window runs to Sat 2026-04-25 15:16.**

## 6. Alerts armed for the freeze window

| # | Condition | Severity | Action |
|---|---|---|---|
| 1 | \`pg_error_rate > 0.5%\` for 5 min | page | PagerDuty on-call |
| 2 | \`hyperdrive_origin_conns > 22\` for 10 min | high | Slack \`#ops\` |
| 3 | \`any_request_to_d1\` (read or write) | high | Slack \`#ops\` — no code path should reach it |
| 4 | \`pg_disk_usage > 85%\` | medium | Slack \`#ops\` |
| 5 | \`jsonb_quarantine_rows\` increases | low | Slack \`#ops\` — should be frozen at 412 |
| 6 | \`migration_rollback_request\` (manual) | page | Full team; reconciliation, not a flag flip |

No replication-lag alert: this project has one Supabase instance and no read replica. An alert on a signal that does not exist is worse than no alert.

## 7. Capacity headroom (post-cutover)

| Metric | Observed peak | Ceiling | Headroom | Ceiling is set by |
|---|---:|---:|---:|---|
| PG CPU | 41% | 100% | 2.4× | Supabase Small, 2-core ARM |
| Origin connections | 19 | 25 | 1.3× | **Hyperdrive**, not Supabase (200 pooler conns) |
| Disk IOPS | 1,240 | 3,000 burst | 2.4× | Supabase Small |
| Storage | 11.4 GB | 32 GB | 2.8× | provisioned disk |
| Write ops | 180/s | — | — | not a plan limit; CPU-bound |
| Read ops | 320/s | — | — | not a plan limit; CPU-bound |

Origin connections are the tightest number on the board. Supabase compute tiers are sized in cores, RAM, and connections — not rows per second — so there is no "plan ceiling" in rows/s to quote. If sustained peaks reach 24 of 25, raise the Hyperdrive origin limit before touching the Supabase tier.

The 9.71 GB wall that started this is gone: 11.4 GB on a 32 GB disk that can be resized without a migration.

## 8. Open Issues

1. **412 quarantined \`audit_log.payload\` rows.** Stored as \`{"_raw": "<original text>"}\` because they were not valid JSON in D1 either — mostly truncated writes from a 2026-01 logging bug. They round-trip and no code path reads them today. Ticket **TASK-1188**; decide whether to repair or drop before the next \`audit_log\` schema change.
2. **Three more locale-dependent \`ORDER BY\` call sites** flagged by \`/oc-audit full\` at \`lib/db/queries/projects.ts:52\`, \`labels.ts:31\`, \`users.ts:77\`. None are on the shadow-read path so none produced a discrepancy, and none are user-visible sorts today. Ticket **TASK-1189**.

Checkpoint: \`.checkpoints/oc-migration-ops.checkpoint.json\`.`,
    },
    {
      id: "migration-checkpoint",
      label: "oc-migration-ops checkpoint (after step 7)",
      kind: "checkpoint.json",
      body:
`\`\`\`json
{
  "skill": "oc-migration-ops",
  "project": "taskflow",
  "status": "in_progress",
  "phase": "execution",
  "step": "step-8",
  "updated_at": "2026-04-22T15:41:09Z",
  "progress_summary": "Step 7 (write cutover) verified; Postgres is primary. Step 8 shipped as e04b71a9. Step 9 is a manual PoNR, eligible Sat 15:16.",
  "blockers": [],
  "next_actions": [
    "step 9 (wrangler d1 delete taskflow-prod) on/after 2026-04-25T15:16Z — manual, PoNR, never scheduled",
    "TASK-1188: decide repair-or-drop for the 412 quarantined audit_log.payload rows",
    "lift the schema freeze and land labels.color after step 9"
  ],
  "skill_state": {
    "migration_type": "database",
    "risk_level": "HIGH",
    "source": "D1 (SQLite)",
    "target": "Supabase Postgres (us-east-1) via Hyperdrive",
    "total_steps": 9,
    "current_step": 8,
    "steps_verified": [1, 2, 3, 4, 5, 6, 7],
    "step_failures": [
      {
        "step": 4,
        "attempt": 1,
        "error": "parity hash mismatch on 14/14 tables — uncanonicalized boolean (1 vs t) and timestamp (+00) rendering",
        "rollback": "not required (verify-only step; re-ran with canonicalized hash)"
      },
      {
        "step": 5,
        "attempt": 1,
        "error": "3/21842 shadow-read discrepancies — collation order",
        "rollback": "succeeded"
      }
    ],
    "rollback_available": true,
    "rollback_expires_at": "2026-04-25T15:16:00Z",
    "point_of_no_return_reached": true,
    "point_of_no_return_confirmed_by": "user, 2026-04-22T15:12Z, verbatim: \\"Confirmed on the point of no return — D1 stays frozen for 3 days, not deleted.\\"",

    "backup_location": "r2://taskflow-d1-snapshots/2026-04-22/full.sql.gz",
    "backfill_watermark": "2026-04-22T10:47:12Z",
    "dual_write_active": false,
    "primary_database": "postgres",
    "tables_migrated": 14,
    "rows_migrated": 2149992,
    "sequences_advanced": 14,
    "quarantined_rows": { "audit_log.payload": 412 }
  },
  "handoffs": [
    { "skill": "oc-deploy-ops",     "artifact": "prod a3f9c2e1, c81e4f02, e04b71a9" },
    { "skill": "oc-monitoring-ops", "artifact": "phase gates 3/5/7, alerts armed for the freeze window" },
    { "skill": "oc-git-ops",        "artifact": "PR #312" }
  ]
}
\`\`\`

\`point_of_no_return_confirmed_by\` stores the user's words rather than a boolean on purpose: the next session has to be able to tell "the user approved the write cutover" apart from "the user approved deleting the database", and those are two different steps four days apart.`,
    },
    {
      id: "ops-status",
      label: "oc-orchestrator status (all projects)",
      kind: "status.md",
      body:
`\`\`\`
$ npm run checkpoint:status
  scanned 3 project roots · 11 checkpoints · 38 ms · cache: fresh
\`\`\`

\`\`\`
OPCHAIN STATUS — All Projects
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▶ taskflow                                  [active]
  ✅ oc-reverse-spec      complete     Specs backfilled 2026-03-02
  ✅ oc-app-architect     complete     v1.2 shipped 2026-03-18
  🔄 oc-migration-ops     in_progress  Step 5/9 verified · Step 6 held clean · Step 7 awaiting PoNR confirmation
  🔄 oc-monitoring-ops    in_progress  Phase gates 3 + 5 PASS · freeze-window alerts staged, not armed
  ✅ oc-deploy-ops        complete     Last ship: c81e4f02 (collation hotfix, 14:19)
  ⏳ oc-git-ops           not started  post-cutover PR queued behind step 8
  → Next: confirm the Step 7 point of no return, then /oc-migrate step 7

▶ gtrackr
  ✅ oc-app-architect     complete     Sprint 4/4 passed evaluator
  ⏳ oc-deploy-ops        not started
  🚫 BLOCKER: staging QA unstaffed (owner out sick, 2 days)
  → Next: /oc-deploy staging once QA signs off — no opchain action available

▶ heads-down
  ✅ all skills           complete     v1 shipped 2026-04-15
  🔄 oc-monitoring-ops    in_progress  watching · 5xx 0.04% · push backlog 12 · all green
  → Next: nothing actionable; revisit weekly

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  3 projects | 1 active pipeline | 1 blocker
\`\`\`

\`\`\`
NEXT ACTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Project: taskflow
Skill:   oc-migration-ops
Action:  Step 7 — write cutover (POINT OF NO RETURN)
Why:     Step 6 has held clean for 15 min; priority 3 (in_progress skill at a gate).
         gtrackr's blocker is priority 1 but needs a person who is out sick, so it
         is surfaced, not recommended.
Command: /oc-migrate step 7

Run it now? (Y) proceeds, (N) shows the next item in the queue.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`\`\`

The oc-orchestrator reads \`.checkpoints/<skill>.checkpoint.json\` under every registered project root and never writes to one it does not own. \`skill_state\` is private to the owning skill, which is why the line above says "Step 5/9 verified" and not anything about sequences or watermarks — that detail lives in oc-migration-ops' own checkpoint and is nobody else's business.`,
    },
  ],
  skills: ["oc-migration-ops", "oc-deploy-ops", "oc-monitoring-ops", "oc-orchestrator"],
  runtime: "≈ 25 exchanges",
  steps: [
    { type: "beat", phase: "operate", label: "01 · Assess", caption: "oc-migration-ops sizes the engine swap", skills: ["oc-migration-ops"] },

    {
      type: "exchange", role: "user",
      content:
`\`wrangler d1 info taskflow-prod\` this morning:

\`\`\`
num_tables      14
database_size   9.71 GB
\`\`\`

10 GB is the hard cap, and on-call says tenant \`acme\` alone is 4.1 GB of \`task_history\`.

We want Supabase Postgres, us-east. Live Workers app, real users on it right now, no maintenance window. How do we not break this?`
    },
    {
      type: "exchange", role: "claude", skill: "oc-migration-ops",
      content:
`Invoking **oc-migration-ops** — \`/oc-migrate assess\`.

Phase 0: checkpoints current (\`oc-reverse-spec\` schema, 2026-03-02: 14 tables, 23 indexes), so no code scan.

**Risk: HIGH** — engine change, live data, no maintenance window. 9 steps, one session-day. The risky gap is ids, not the engine: 14 × \`INTEGER PRIMARY KEY AUTOINCREMENT\` → \`bigint … as identity\` + \`setval\`, and getting those right at the right moment is where this fails.

Before I write a plan: 1) pooler or direct, and which region? 2) peak and average writes/sec — it sizes the failed-write queue. 3) read-your-writes, or can reads lag at cutover? 4) how long does D1 stay a fallback, default 7 days? 5) Hyperdrive in front of Supavisor — recommended, since without a warm connection every request pays a fresh TLS handshake to us-east.

Checkpoint: \`phase: "assessed"\`.`
    },
    {
      type: "exchange", role: "user",
      content:
`1. Pooler. Project is us-east-1.
2. Peak ~180 writes/sec, average ~40/sec, mostly UPDATEs on \`tasks\`.
3. Strictly read-your-writes — people see the task they just created.
4. 7 days is fine.
5. Hyperdrive is fine.

But 7 days of D1 frozen means 7 days of no schema changes — we have a \`labels.color\` migration queued for Friday. Can it be 3 days?

And what happens to a write that's in flight at the exact second you flip writes?`
    },
    {
      type: "exchange", role: "claude", skill: "oc-migration-ops",
      content:
`**3 days instead of 7.** Yes, if the drift checker reads 0 for the full 72 hours. The freeze is what makes the rollback real — a Thursday \`labels.color\` would leave the Wednesday snapshot no longer matching the schema the app expects.

**The in-flight write.** That is why the flip is split:

\`\`\`
T−15 min   FLAG_PG_WRITE_REQUIRED = true   PG write now synchronous + mandatory
T−15 → T   hold                            every acked write reached both engines
T          FLAG_PG_DUAL_WRITE = false      ★ point of no return
T + 1 min  FLAG_D1_READONLY = true         app-enforced; D1 has no read-only mode
\`\`\`

Nothing acknowledged in that window can be Postgres-less, so nothing in flight at T can be either — which is why Step 6 looks like it does nothing.

Plan written, nine steps. Reply \`/oc-migrate execute\` once you have read the two **Point of No Return** markers, Step 7 and Step 9 (\`wrangler d1 delete\`).`,
      artifacts: ["migration-plan"],
    },
    {
      type: "exchange", role: "user",
      content:
`Read it. Step 7 PoNR is fine — write cutover is the whole point. Step 9 stays manual, I don't want a cron anywhere near \`wrangler d1 delete\`.

Before you run anything: do the rollback drill on step 5 first. I want to see the read flag actually revert, and how long it takes. If it's worse than 60 s I want to know before we're 2 million rows deep, not after.

\`/oc-migrate execute\``
    },

    { type: "beat", phase: "ship", label: "02 · Ship the plumbing", caption: "oc-deploy-ops puts the code in prod, dormant", skills: ["oc-deploy-ops"] },

    {
      type: "exchange", role: "claude", skill: "oc-deploy-ops",
      content:
`The dual-write path and the Postgres adapter have to be in production and asleep before Step 1 — a flag cannot turn on code that is not deployed.

\`\`\`
/oc-deploy staging · 7b21d0c4..9e04ab31 · oc-bug-check PASS · vitest 142 passed
  staging f11c8d3a   ✅ POST /api/tasks 201  x-oc-dual-write: dormant
  prod    a3f9c2e1   ✅ GET /api/health 200  {"ok":true,"db":"d1"}
\`\`\`

Production is on \`a3f9c2e1\`, still D1-only — \`FLAG_PG_DUAL_WRITE\` is \`false\` in KV, and \`wrangler rollback 7b21d0c4\` is live for the rest of the day.`,
      artifacts: ["deploy-log"],
    },
    {
      type: "exchange", role: "user",
      content:
`Poked staging — created a task, \`x-oc-dual-write: dormant\` on the response, nothing in the Supabase table editor.

Run steps 1 through 3. I'm in \`#migration-pg\` if the drift checker screams.`
    },

    { type: "beat", phase: "operate", label: "03 · Expand + backfill", caption: "snapshot, schema, dual-write, 2.1M rows", skills: ["oc-migration-ops", "oc-monitoring-ops"] },

    {
      type: "exchange", role: "claude", skill: "oc-migration-ops",
      content:
`## Steps 1–3 — **PASSED**

\`\`\`
$ wrangler d1 export taskflow-prod --remote   2,149,204 rows, 9.71 GB · 4m 51s
  gzip -9 → 1.38 GB → r2 taskflow-d1-snapshots/2026-04-22/full.sql.gz · gunzip -t OK
$ npx drizzle-kit migrate   14 tables, 23 indexes · boolean 9/9 · timestamptz 31/31 · identity 14/14
$ wrangler hyperdrive create taskflow-pg --caching-disabled   p99 4.8 ms from iad
$ kv put FLAG_PG_DUAL_WRITE true   coverage 100% at +47s · watermark 10:47:12Z, 2,149,992 rows
\`\`\`

The R2 object is the **rollback artifact**, not the backfill source: a snapshot as source loses every write between export and cutover. Hyperdrive caching is off on purpose — a cached \`SELECT\` would break read-your-writes.

That +47 s is KV eventual consistency plus the 60-second \`cacheTtl\` floor, which is why the plan budgets 60 s. The watermark sits 788 rows above the 09:58 export; the backfill owns them.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-monitoring-ops",
      content:
`\`/oc-monitor metrics\` — Step 3 gate, 10:47 → 11:17. Write p99 **10.0 ms** against an 8.2 ms D1-only baseline (budget +5 ms); PG write failures 0.00%.

Drift checker against that watermark — **not** clean:

\`\`\`
interval 3  11:02   notifications   D1 +9    PG +7     Δ −2   ⚠ ALERT
interval 4  11:07   14 tables       D1 +121  PG +121   Δ  0   ← 2 replayed rows land
intervals 5–6       14 tables                          Δ  0
\`\`\`

Both missing rows are \`INSERT … RETURNING\` on \`POST /api/tasks/:id/assign\`, from two isolates whose KV reads landed at +31 s and +44 s. They never *attempted* a Postgres write, so the queue had nothing to catch — the reconciler found them and they replayed at 11:09.

**Step 3 gate: PASS**, two rows, both reconciled, zero unexplained delta after.`
    },
    {
      type: "exchange", role: "user",
      content:
`Two rows lost to flag propagation is exactly the thing I was worried about. Is the failed-write queue going to catch that at 180 writes/sec, or only at 40?`
    },
    {
      type: "exchange", role: "claude", skill: "oc-monitoring-ops",
      content:
`Different mechanisms, and the one that saved you was not the queue.

**The queue catches Postgres failures** — the isolate tries the write, Postgres refuses, it goes to \`taskflow-pg-retry\`. Peak depth **3**, drained in **< 2 s**.

**The reconciler catches propagation gaps.** An isolate that has not seen the flag never fails and never enqueues, so the queue cannot see it — that is the hole your two rows fell into.

Worst case is 60 s × 180 writes/s = **10,800 rows** against a **100,000** ceiling; what happened was 47 s and 2 rows. Watch the reconciler, not queue depth.`
    },
    {
      type: "exchange", role: "user",
      content:
`Good. #announcements went out at 11:25 saying reads move this afternoon — run step 4.

One ask: when the parity check runs, show me the actual comparison, not just a tick. I've been burned by a checksum that compared two things that were never comparable.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-migration-ops",
      content:
`You were right to ask — the first parity run failed in exactly that way.

## Step 4 — **FAILED → PASSED (attempt 2)**

\`\`\`
11:30:02  backfill · watermark 10:47:12Z · ON CONFLICT (id) DO UPDATE
          WHERE excluded.updated_at > <table>.updated_at
          tasks 1,423,917 · audit_log 12,514 (412 quarantined → jsonb _raw)
          … 12 more · total 2,149,992 in 2h 04m
13:36     parity attempt 1 · md5(concat(columns))                  FAILED
          14 of 14: counts equal, hashes differ on 100% of rows
            d1 : 1|1|2026-04-22 14:03:11|Migrate billing
            pg : 1|t|2026-04-22 14:03:11+00|Migrate billing
13:48     attempt 2, canonicalized · 14 / 14 match, 11m 42s        PASSED
13:52     setval  tasks_id_seq → 1,423,917 · 14 / 14 sequences advanced
\`\`\`

Every row wrong and every count right is a formatter problem, not a data problem: \`done\` is \`INTEGER\` on SQLite and \`boolean\` on Postgres, \`created_at\` was \`TEXT\` and is now \`timestamptz\`, so the hash compared two \`::text\` implementations. Attempt 2 canonicalizes both sides — R5 in the plan.

That \`setval\` is why the first Postgres-generated insert does not try \`id = 1\` and hit \`tasks_pkey\`. It is not the last one: dual-write keeps inserting explicit ids, which do not advance a sequence, so Step 7 re-runs it.

## Step 5a — rollback drill (your ask, before the ramp)

\`\`\`
13:58:04  kv put FLAG_PG_READ_PCT 10 → coverage +49 s
13:59:41  kv put FLAG_PG_READ_PCT 0  → coverage +52 s · 0 errors · 1,204 PG reads, 0 discrepancies
\`\`\`

**+52 s to revert**, inside the 60 s budget, in both directions, with real traffic on it.`
    },

    { type: "beat", phase: "operate", label: "04 · Read cutover", caption: "the ramp that had to be paused", skills: ["oc-migration-ops", "oc-monitoring-ops"] },

    {
      type: "exchange", role: "user",
      content:
`52 seconds is good enough — that's the number I wanted before we were 2M rows deep.

Go to 10% and sit there until monitoring has at least 20 minutes of shadow reads. I'd rather find something at 10% than at 50.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-monitoring-ops",
      content:
`You found something at 10%.

\`\`\`
14:02:11  FLAG_PG_READ_PCT 10 · sticky on team_id
14:07:33  ⚠ SHADOW DISCREPANCY  1 / 9,904    alert, not yet a pause
14:14:02  ⚠ SHADOW DISCREPANCY  3 / 21,842   not a blip — RAMP PAUSED, back to 0
  all three  GET /api/projects/:id/tasks?sort=title · same rows, different order
    d1 : ["Zebra pass", "apple crate", "beta sweep", …]
    pg : ["apple crate", "beta sweep", "Zebra pass", …]
\`\`\`

I held six minutes after the first rather than yanking the ramp on one event; three on the same query shape is a pattern.

SQLite's default \`BINARY\` collation sorts by code point, so uppercase sorts before lowercase; Supabase runs \`en_US.UTF-8\`, which does not. Row counts, checksums and the Step 4 parity hash all matched — none of them look at order. Only the shadow comparison does.

\`sort=title\` is the default on every project page, so at 100% that is ~4,000 requests an hour of wrong ordering. Ramp held at 0 — this needs a code change, not a flag.`
    },
    {
      type: "exchange", role: "user",
      content:
`Collation. Of course it is.

\`ORDER BY title\` is the default sort on every project page, so that's not three requests, that's everybody. Fix it in the query layer — do **not** set a collation on the column or the database. A locale-dependent index is the kind of thing we'd never revert cleanly, and it wouldn't match D1 during the shadow window anyway.

Ship it and resume. And check whether \`title\` is even unique — I don't want the tiebreak to be luck.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-migration-ops",
      content:
`It is not unique, and the tiebreak was luck. Both fixed.

\`\`\`diff
  // lib/db/queries/tasks.ts:88
- .orderBy(sort === "title" ? asc(tasks.title) : desc(tasks.updatedAt));
+ // COLLATE "C" reproduces SQLite BINARY ordering — query layer, not the column.
+ .orderBy(sort === "title" ? sql\`title COLLATE "C" ASC, id ASC\` : desc(tasks.updatedAt));
\`\`\`

\`, id ASC\` is the tiebreak: \`title\` has no unique index, and 1,847 tasks share a title with another in the same project.

\`\`\`
/oc-deploy prod  c81e4f02 14:19:06Z · vitest 145 passed (+3 collation cases)
14:22  FLAG_PG_READ_PCT 10 → 14:47 100%   0 / 221,407 shadow   p99 20.2ms   conns 19/25
14:52  Step 6 · FLAG_PG_WRITE_REQUIRED true (+44s) held to 15:07 · 37,412 acked, 0 PG-less
\`\`\`

Twelve minutes from alert to fix live. 350,021 shadow reads after it, zero discrepancies — read p99 20.2 ms against 18.4 ms, **+9.8%**, inside the +15% budget.

Steps 5 and 6 PASS, and all 37,412 acked writes reached Postgres synchronously, so the in-flight write you asked about cannot exist at the cutover. **Step 7 is the point of no return**: say so explicitly and I will flip \`FLAG_PG_DUAL_WRITE\`.`,
      artifacts: ["step-05-report", "deploy-log"],
    },

    { type: "beat", phase: "operate", label: "05 · Cross-project check", caption: "oc-orchestrator, before the irreversible bit", skills: ["oc-orchestrator"] },

    {
      type: "exchange", role: "user",
      content:
`Slack says the gtrackr QA person is out sick — before I flip writes, \`/oc-ops status\`. I want to know nothing else is on fire while I'm spending my attention here.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-orchestrator",
      content:
`\`\`\`
$ npm run checkpoint:status   3 project roots · 11 checkpoints · 38 ms

▶ taskflow                                [active]
  🔄 oc-migration-ops   Step 5/9 verified · Step 6 held clean · Step 7 awaiting PoNR
  🔄 oc-monitoring-ops  gates 3 + 5 PASS · freeze-window alerts staged, not armed
  ✅ oc-deploy-ops      last ship c81e4f02 (collation hotfix, 14:19)
▶ gtrackr     🚫 BLOCKER: staging QA unstaffed (owner out sick, 2 days)
▶ heads-down  🔄 watching · 5xx 0.04% · all green

NEXT ACTION  taskflow · /oc-migrate step 7 (POINT OF NO RETURN)
  Why: Step 6 has held clean for 15 min. gtrackr's blocker outranks it but needs a
       person who is out sick, so it is surfaced, not recommended.
\`\`\`

\`gtrackr\` is blocked on a human, not a gate. I will not run Step 7 off this screen — it is a point of no return and the plan requires you to say so.`,
      artifacts: ["ops-status"],
    },
    {
      type: "exchange", role: "user",
      content:
`Go on step 7. Confirmed on the point of no return — D1 stays frozen for 3 days, not deleted.`
    },

    { type: "beat", phase: "ship", label: "06 · Cut over + hand off", caption: "the irreversible step, then the chain", skills: ["oc-migration-ops", "oc-deploy-ops"] },

    {
      type: "exchange", role: "claude", skill: "oc-migration-ops",
      content:
`## Step 7 — **PASSED** ★ POINT OF NO RETURN

\`\`\`
15:15:02  setval ×14 re-run — the 13:52 values are stale
            tasks_id_seq  1,423,917 → 1,424,005  (88 rows dual-written since)
15:15:21  kv put FLAG_PG_DUAL_WRITE false  → 100% coverage at +41s   ★ PoNR
15:16:04  kv put FLAG_D1_READONLY   true   → 100% coverage at +38s
15:16:48  first Postgres-generated insert  INSERT … RETURNING id → 1,424,006
15:40     Step 8 · /oc-deploy prod e04b71a9 · deleted dual-write.ts (−211 lines)
          $ grep -rn "env.DB" src/ | grep -v rollback   → (no matches)
\`\`\`

\`1,424,006\` is the whole point of running \`setval\` twice: had I trusted the Step 4 value, that insert would have asked for \`1,423,918\` and hit \`tasks_pkey\`, on the first write after the point of no return.

\`FLAG_D1_READONLY\` is app-enforced, since D1 has no read-only mode — the adapter throws \`D1WriteAfterFreeze\` on any write to the \`DB\` binding, and **0 writes reached D1** in the 39 minutes since. Write p99 **11.7 ms** vs 10.0 ms on dual-write (+17%, budget +20%). The \`DB\` binding stays until Step 9 — it is the rollback, not leftovers.`,
      artifacts: ["migration-checkpoint"],
    },
    {
      type: "exchange", role: "user",
      content:
`Made a task from my phone at 15:22, came back as \`1,424,019\`. Assigned it to someone, they got the notification. Sorted the project by title and \`Zebra pass\` is where it's always been.

Run the full verify.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-migration-ops",
      content:
`\`/oc-migrate verify\` — all layers, current state.

\`\`\`
Schema       ✅ PASS  14 tables · 23 indexes · 9 boolean · 31 timestamptz · 14 identity
Data         ✅ PASS  2,149,992 rows ≤ watermark · delta 0 · canonical hash 14/14
API          ✅ PASS  41/41 route tests green against Hyperdrive
Performance  ✅ PASS  read p99 20.2ms (base 18.4) · write p99 11.7ms (base 8.2)

Verdict: MIGRATION COMPLETE — 8 of 9 steps
\`\`\`

Two open issues, neither blocking: the **412 quarantined \`audit_log.payload\` rows** (**TASK-1188**) and **three more locale-dependent \`ORDER BY\` sites** (**TASK-1189**) at \`queries/projects.ts:52\`, \`labels.ts:31\`, \`users.ts:77\` — none on the shadow-read path, which is why the ramp missed them.

Write p99 is the number worth saying out loud: **8.2 ms on D1 → 11.7 ms on Postgres**, +42.7% against the original baseline — inside every budget, and still a real regression.`,
      artifacts: ["verification-report"],
    },
    {
      type: "exchange", role: "user",
      content:
`Fine trade — we were going to hit a wall in six weeks either way.

Ship the rest: retarget monitoring, run the audit on \`lib/db/\`, open the PR. And tell me in writing that step 9 isn't going to fire on its own on Saturday.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-migration-ops",
      content:
`**\`/oc-monitor setup\`** — \`/api/health\` retargeted to \`env.HYPERDRIVE\`, 200 in 0.18 s, \`{"ok":true,"db":"postgres"}\`. Six alerts armed, from \`pg_error_rate > 0.5%\` (page) to \`jsonb_quarantine_rows increases\` (frozen at 412). No replication-lag alert — one instance, no read replica.

**\`/oc-audit full lib/db/\`** — 9 files, 1,204 LoC (−211 from step 8), grade **A− (92/100)**, gate PASS. F-001 MED is TASK-1189's \`ORDER BY\` sites; F-002 LOW is \`adapter.ts:41\`, unreachable until a rollback.

**\`/oc-git-sync\`** → PR **#312 · "migrate: D1 → Postgres via Hyperdrive"** · +1,847 −624 · CI green.

**In writing: Step 9 will not fire on its own.** It is \`Owner: USER\`, and no cron, scheduled Worker or queue consumer can reach it — a Worker cannot invoke \`wrangler\`. On Saturday at 15:16 the only change is that \`/oc-migrate step 9\` stops refusing to run.

Checkpoint: \`point_of_no_return_reached: true\`, \`primary_database: "postgres"\`. You are running on Postgres.`
    },
  ],
};
