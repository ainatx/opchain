import type { Walkthrough } from "./types";

/**
 * Scenario 3 — oc-reverse-spec on a legacy codebase, then oc-app-architect picks
 * up the generated spec set as its Phase 2 baseline and plans the new feature
 * on top. Demonstrates the "entering from the middle" pattern: Phase 0
 * orientation, nine analysis layers, a metric the schema can't actually answer,
 * an evaluator FAIL, a user-authored guard script, and a three-finding
 * /oc-audit diff. Nothing in the settlement scope moves.
 */
export const legacyRevive: Walkthrough = {
  id: "legacy-revive",
  title: "Legacy Rails app, one new feature",
  tagline: "Legacy Rails, one new feature",
  summary:
    "3-year-old Rails monolith, no docs, one engineer leaving in 3 weeks. Ship the feature anyway.",
  description:
    "Haulier is a 47k-line Rails 6.1 monolith — a freight-broker SaaS that grew in someone's head. No docs, 58.1% line coverage, and Dana, the only engineer who understands the money path, leaves on 2026-05-08. The board wants a Carrier Scorecard before she goes. oc-reverse-spec runs Phase 0 orientation, then nine analysis layers, and emits a spec set into `reverse-spec-output/` — discovering along the way that the damage metric the brief assumes has no `Claim` model behind it at all; damage is a `documents.kind` enum value and half of those rows are attached to the wrong shipment. oc-app-architect loads that as its Phase 2 baseline, renegotiates the metric down to what the schema can answer, and builds it in two sprints — the first of which fails its evaluator on a damage rate of 1.33. oc-code-auditor's `/oc-audit diff` returns three findings and one fix worth making. The settlement scope is protected by a guard script the user demanded, not by anyone's promise.",
  inputs: [
    "Rails 6.1.7.6 · Ruby 3.1.4 · Postgres 13 on Heroku · 47,108 LoC Ruby, 8,214 ERB",
    "No documentation · RSpec 312 examples · SimpleCov 58.1% · 84 gems (11 outdated)",
    "Dana — the only engineer who knows settlement.rb — leaves 2026-05-08",
    "Feature brief: Carrier Scorecard (on-time %, damage %, dispute %) in the carrier picker",
    "Hard constraint from the user: nothing in the settlement scope changes, and prove it with a script",
  ],
  outputs: [
    {
      id: "reconstructed-spec",
      label: "Haulier — reverse-spec output (spec set)",
      kind: "spec.md",
      body:
`# Haulier — reverse-spec output (spec set)

**Produced by** \`oc-reverse-spec\` \`/oc-rev-full\` · **Source** commit \`a4f91e2\` on \`main\` · **Generated** 2026-04-15 · **Run time** 41 min across 9 analysis layers · **Output root** \`reverse-spec-output/\`

> **Reading guide.** This is reverse-engineered from the codebase, not handwritten by the original author. Every claim carries a confidence level — **HIGH** (directly observed in code, schema or config), **MEDIUM** (inferred from naming or partial evidence), **LOW** (guessed from convention or absent evidence), **UNKNOWN** (flagged for a human to answer). Sections follow the standard *Current State → Confidence → Gaps & Recommendations* shape. Nothing below is a recommendation unless it sits under "Gaps & Recommendations."

## 0. Docs generated

| File | Confidence | Note |
|---|---|---|
| \`spec/00-project-overview.md\` | HIGH | Domain narrative corroborated by 4 independent naming clusters. |
| \`spec/01-tech-stack.md\` | HIGH | \`Gemfile.lock\`, \`Procfile\`, \`app.json\`. |
| \`spec/02-architecture.md\` | HIGH (3 MEDIUM items) | MEDIUM: v1-vs-v2 API ownership, \`Setting\` cache invalidation, \`MetricsRollup\` consumers. |
| \`spec/03-security-auth.md\` | MEDIUM | Pundit covers ~70% of controllers; the remainder is ad-hoc \`before_action\`. No single source of truth to extract. |
| \`spec/04-integrations.md\` | HIGH | 9 services, all with initializers + ENV pairs. |
| \`spec/05-monetization.md\` | ⏭ skipped | Stripe here is carrier *payout*, not billing. No subscription, plan or entitlement code exists. |
| \`spec/06-testing.md\` | HIGH | \`.rspec\`, \`spec/\`, \`.simplecov\`, CI config. |
| \`spec/07-devops.md\` | LOW | No runbook, no ADRs, no IaC. Inferred from \`Procfile\`, \`app.json\` and \`heroku\` CLI output the user pasted. |
| \`spec/08-analytics.md\` | ⏭ skipped | No analytics SDK. The \`metrics_*\` tables are internal rollups, covered in 02. |
| \`spec/09-documentation-plan.md\` | ⏭ skipped | No docs infrastructure of any kind. |
| \`spec/10-cost-estimate.md\` | MEDIUM | Heroku plan names are observable; actual invoices are not. |
| \`gap-analysis.md\` | — | 30-item risk map (§13) + the 7 open questions (§14). |
| \`app-architect-ready/spec.md\` | — | Written by \`/oc-rev-sprint "Carrier scorecard"\`. |
| \`app-architect-ready/sprint-plan.md\` | — | Written by \`/oc-rev-sprint "Carrier scorecard"\`. |

## 1. TL;DR

Haulier is a **freight-broker SaaS**. Brokers ("Dispatchers") post **Loads**; Carriers bid; a chosen Carrier hauls; the Broker invoices the Shipper. Side-flows: driver-side Documents upload, nightly Fuel-surcharge reindex, weekly Settlement run.

The codebase is a 47k-LoC Rails 6.1 monolith, three years old, 58.1% line coverage, 84 gems. There is no prior documentation of any kind. The only engineer who has worked on it leaves 2026-05-08.

## 2. Repository overview

| Stat | Value | Source |
|---|---|---|
| Languages | Ruby 89% · ERB 8% · JavaScript 3% | \`cloc\` |
| LoC | 47,108 Ruby · 8,214 ERB · 1,983 JS | \`cloc\` |
| Ruby files | 1,184 | \`find app lib -name '*.rb' \\| wc -l\` |
| Ruby / Rails | 3.1.4 / 6.1.7.6 | \`.ruby-version\`, \`Gemfile.lock\` |
| Test coverage (line) | 58.1% | \`coverage/.last_run.json\` |
| Tests | 312 RSpec examples · 0 failures · 3 pending | \`bundle exec rspec --dry-run\` |
| Models | 28 | \`app/models/*.rb\` minus concerns |
| Controllers | 41 (24 web · 17 API) | \`app/controllers/\` |
| Routes | 412 lines in \`rails routes\` | \`bin/rails routes \\| wc -l\` |
| Background jobs | 11 Sidekiq workers · 4 scheduler entries | \`grep -rln "include Sidekiq::Worker" app/\` |
| Gems | 84 (11 flagged by \`bundle outdated --strict\`) | \`Gemfile.lock\` |
| DB | Postgres 13 · 47 tables · **0 materialized views** | \`db/schema.rb\` |
| Schema version | \`2026_03_01_141902\` | \`db/schema.rb:14\` |
| Hosting | Heroku (3 web dynos · 2 worker dynos, all Standard-2X) | \`Procfile\`, \`app.json\` |
| External services | Stripe (broker→carrier payout), Twilio (driver SMS), AWS S3 (Documents), 6 more — see §9 |

**Confidence:** HIGH for everything above except materialized views, where the claim is *absence*: \`scenic 1.7.0\` is in \`Gemfile.lock\` but there is no \`db/views/\` directory and \`grep -c "create_view" db/schema.rb\` returns 0. Somebody intended views and stopped. See §14.

## 3. Domain narrative (as inferred)

Dispatchers post Loads representing freight that needs to move from origin A to destination B by date D, with equipment requirements (dry van, reefer, flatbed). Carriers — independent trucking companies — see relevant Loads (filtered by their declared lanes + equipment) and submit Bids. The Dispatcher reviews bids, chooses one, and a Shipment is created.

The chosen Carrier executes the haul: pickup → transit → delivery. At each stage, Documents (BOL, POD, weigh tickets, damage reports) are uploaded by the driver via the mobile-web app. Once delivery + Documents are confirmed, the cycle has two financial tails:

1. **Invoice** flows Broker → Shipper. Shippers pay against invoices; Payments record the inbound money.
2. **Settlement** flows Broker → Carrier. Once the invoice is paid (or after a configurable hold period), the Settlement runner pays the Carrier their portion (load price minus broker margin).

**Confidence:** MEDIUM. This narrative is inferred from model names, controller verbs, and 41 explanatory comments. No product doc exists to check it against. The Broker→Shipper→Carrier triangle is HIGH (it is enforced by foreign keys); the *ordering* of the two financial tails is MEDIUM (only \`settlement_runner.rb:L62\` implies invoice-paid precedes settlement, and the hold-period branch bypasses it).

## 4. Domain model

\`\`\`
Shipper ──▶ Load ──▶ Bid ◀── Carrier
              │      │
              │      └──▶ Shipment ──▶ Document
              │                          │
              │                          └──▶ Invoice ──▶ Payment
              │                                  │
              │                                  └──▶ Settlement  WARN fragile
              ▼
          Dispatcher (user)
\`\`\`

**Current state.** 28 ActiveRecord models, machine-extracted from \`db/schema.rb\` plus every \`belongs_to\` / \`has_many\` declaration. **Confidence: HIGH** — associations are declared, not guessed.

**Gaps & Recommendations.** There is no \`Claim\` model and no \`claims\` table. Freight damage is recorded two ways, both lossy: as a \`Document\` with \`kind: :damage_report\` (\`app/models/document.rb:14\`) and as free text in \`invoices.dispute_reason\`. Anything that wants a "damage rate" has to derive it from Documents. Flagged to the user; see §14.

### 4.1 Inventory of all 28 models

| Model | Lines | Tests | Notable |
|---|---:|---:|---|
| User | 312 | ✓ | Devise; STI parent for Dispatcher and CarrierUser. \`app/models/user.rb:L12-L20\` lists 6 Devise modules. |
| Dispatcher | 88 | ✓ | STI subclass. \`belongs_to :broker\`. |
| Carrier | 467 | ✓ | One Carrier company; many CarrierUsers. \`scope :active\` is wrong — see §13 #10. |
| CarrierUser | 124 | ✓ | STI subclass of User. |
| Broker | 198 | ✓ | A brokerage firm; Dispatchers belong to it. |
| Shipper | 156 | partial | The customer paying for freight. |
| Load | 904 | ✓ | The work. \`has_many :bids\`. State machine: posted → bid → awarded → in_transit → delivered → invoiced. \`deliver_by\` is TZ-naive (§14). |
| Bid | 244 | ✓ | Carrier offers a price for a Load. No negative-price validation (§13 #6). |
| Shipment | 612 | ✓ | The awarded Load + execution state. \`pickup_window_start/end\`, \`delivered_at\`. |
| Document | 311 | ✓ | \`app/models/document.rb:14\` — \`enum kind: { bol: 0, pod: 1, weigh_ticket: 2, damage_report: 3 }\`. \`paperclip\` (deprecated) → S3. |
| Invoice | 778 | ✓ | Multi-step state machine (draft → sent → viewed → paid / disputed / written_off). \`sent_at\` is set on the draft→sent transition (\`app/models/invoice.rb:L204\`). |
| Payment | 432 | partial | Inbound from Shipper. Stripe + ACH + check (manual). |
| Settlement | **812** | **0** | Outbound to Carrier. **\`app/models/settlement.rb:L41-L118\` — six callbacks, money flow, zero tests. (CRITICAL — see §13 #1.)** |
| SettlementLineItem | 188 | 0 | Components of a Settlement. Lacks a unique constraint on \`(settlement_id, source_id)\`. |
| ChartOfAccount | 64 | 0 | Bookkeeping references. No call sites found; probably legacy. |
| Lane | 102 | ✓ | Carrier's preferred origin/destination corridors. |
| Equipment | 44 | ✓ | Enum-ish lookup table (dry_van, reefer, flatbed, …). |
| Address | 187 | ✓ | Used by Load (origin, destination), Shipper, Carrier. Has \`state\` (2-letter). |
| GeoLookup | 56 | ✓ | Cached zip→lat/lng. SmartyStreets. |
| FuelSurcharge | 91 | partial | Updated nightly; affects Bid pricing. Its job has no failure alerting (§13 #2). |
| MarginRule | 142 | ✓ | Per-shipper margin overrides. |
| Notification | 89 | ✓ | In-app notification feed. |
| AuditLog | 144 | partial | \`paper_trail\`-backed. Only 12 of 28 models opt in. |
| Webhook | 78 | ✓ | Outbound webhooks to integrations. |
| WebhookDelivery | 102 | ✓ | Delivery attempts + retries. |
| ApiToken | 56 | ✓ | Carrier-side API tokens. \`bcrypt\`-stored, cost 10. |
| FeatureFlag | 38 | ✓ | Internal: \`Flipper\` gates a few half-shipped features. |
| Setting | 44 | ✓ | Singleton row of broker-wide config. |

### 4.2 Associations matrix (cardinality)

| From | → | To | Notes |
|---|---|---|---|
| Broker | has_many | Dispatcher | |
| Broker | has_many | Shipper | |
| Dispatcher | has_many | Load | |
| Shipper | has_many | Load | source of business |
| Load | has_many | Bid | ~4 bids per load (§7.1) |
| Load | belongs_to | chosen_bid (Bid, optional) | |
| Load | has_one | Shipment | only for awarded Loads — 78% of Loads have one |
| Load | belongs_to | origin_address, destination_address (Address) | |
| Bid | belongs_to | Carrier | |
| Bid | belongs_to | Load | |
| Shipment | belongs_to | Carrier | denormalized from \`chosen_bid.carrier_id\` |
| Shipment | has_many | Document | dependent: destroy |
| Shipment | has_one | Invoice | |
| Shipment | has_one | Settlement | |
| Invoice | has_many | Payment | |
| Settlement | has_many | SettlementLineItem | |
| Carrier | has_many | CarrierUser | |
| Carrier | has_many | Bid | |
| Carrier | has_many | Lane | |

### 4.3 Soft-delete + audit

**Current state.** \`paranoia\` on \`User\`, \`Carrier\`, \`Shipper\`, \`Load\`, \`Shipment\`. Deleted rows carry \`deleted_at IS NOT NULL\` and drop out of default scopes. \`paper_trail\` is opted into on 12 of 28 models via \`app/models/concerns/auditable.rb\`.

**Confidence:** HIGH (both are declarative).

**Gaps & Recommendations.** \`Carrier.active\` (\`app/models/carrier.rb:L88-L91\`) chains \`.where.not(deleted_at: nil)\` where it means \`.where(deleted_at: nil)\` — the predicate is inverted, so the scope returns *only* soft-deleted carriers in any context where the default scope has been unscoped. Two Active Admin pages do exactly that. Fix before anything new reads \`Carrier.active\`.

## 5. Controllers + routes

**Current state.** 41 controllers, 412 lines of \`rails routes\`. **Confidence: HIGH** — extracted from \`bin/rails routes\`, not from filenames.

### 5.1 Web controllers (24)

| Controller | Routes | Notes |
|---|---|---|
| ApplicationController | — | Sets current_user, current_broker; before_action heavy. |
| DashboardController | GET / | Different views per user role. |
| LoadsController | resources | + custom \`#repost\`, \`#cancel\`, \`#extend_window\`. \`GET /loads/new\` renders the picker; the form posts to \`POST /loads\`. |
| BidsController | resources | nested under loads. |
| ShipmentsController | resources | + \`#mark_delivered\`. |
| InvoicesController | resources | + \`#mark_paid\`, \`#mark_disputed\`, \`#export_pdf\`. |
| SettlementsController | resources | read-only for everyone except SuperAdmin. |
| DocumentsController | resources | direct-to-S3 upload; presigned URLs. |
| CarriersController | resources | + \`#approve\`, \`#suspend\`, \`#reactivate\`. |
| ShippersController | resources | |
| DispatchersController | resources | **mass-assignment via strong_params needs audit (§13 #9).** |
| BrokerSettingsController | settings/* | wraps the Setting singleton. |
| ApiTokensController | resources | for Carrier API access. |
| WebhooksController | resources | outbound webhook configuration. |
| AuditLogController | GET /audit_log | search via Ransack. |
| NotificationsController | index, mark_read | |
| FuelSurchargesController | index, current | |
| ReportsController | various | mostly Ransack-backed CSV exports. |
| OnboardingController | wizard/* | new-Carrier 5-step flow. |
| HealthController | GET /health | returns 200 + version. |
| Devise::* | auth/* | sign_in, sign_up, password reset. |
| HomeController | GET / (signed-out) | marketing landing. |
| AdminController (suite) | /admin/* | Active Admin engine. |
| RailsAdminController | /rails_admin (disabled in prod) | dead weight; should be removed. |

### 5.2 API v1 (12 endpoints — Carrier-facing)

\`/api/v1/loads\` (search, show) · \`/api/v1/bids\` (create, list, withdraw) · \`/api/v1/shipments\` (show, update_status) · \`/api/v1/documents\` (create, list) · \`/api/v1/invoices\` (list) · \`/api/v1/settlements\` (list) · \`/api/v1/carriers/me\`.

Auth: \`ApiToken\` via \`Authorization: Bearer\`. Rate-limit: \`rack-attack\` 600/hr/token.

### 5.3 API v2 (19 actions — newer, partially migrated)

\`app/controllers/api/v2/loads_controller.rb\` is **1,242 lines** across **19 public actions** — an average of ~65 LoC per action, with the three largest (\`#search\`, \`#quote\`, \`#bulk_update\`) accounting for 418 of them. Many duplicate v1 with subtle differences (snake_case vs camelCase response keys). **Confidence: MEDIUM on intent** — the code is HIGH-confidence observable; *which contract clients actually use* is UNKNOWN (§14).

### 5.4 Active Admin (40+ resource registrations)

The Active Admin dashboard exposes raw CRUD on every model including \`Settlement\`. Two SuperAdmin users have access. **No audit log on Active Admin actions.** (§13 #11)

## 6. Background jobs

**Current state.** 11 workers (\`grep -rln "include Sidekiq::Worker" app/ | wc -l\` → 11), 4 of them on a \`sidekiq-scheduler\` cron in \`config/sidekiq.yml:L4-L18\`. **Confidence: HIGH.**

| Job | Schedule | Failure alert | Notes |
|---|---|---|---|
| \`FuelReindex\` | nightly 02:00 UTC | **none** | \`app/jobs/fuel_reindex.rb:9\` sets \`retry: 5\` with no \`sidekiq_retries_exhausted\` block. Silent failure → stale bid prices for 24h. (§13 #2) |
| \`WeeklySettlementRun\` | Mondays 06:00 UTC | Slack | Runs in 4 min p99. The money path. |
| \`InvoiceDelinquencyNudge\` | daily 09:00 broker-tz | Slack on raise | Timezone bug in tests (currently \`skip\`-ped). (§13 #7) |
| \`DocumentVirusScan\` | per-upload | Sentry | ClamAV via \`clamby\`. |
| \`WebhookDeliveryWorker\` | per-event | Sentry | Exponential backoff up to 24h. |
| \`SmsSendWorker\` | per-event | Sentry | Twilio. |
| \`EmailSendWorker\` | per-event | Sentry | ActionMailer / Sendgrid. |
| \`StaleLoadCloser\` | hourly | Slack | Closes Loads still \`posted\` past the pickup window. |
| \`InvoicePdfRenderer\` | per-invoice | Sentry | Wicked PDF. 8 s p99 — the app's worst tail latency. |
| \`AuditLogPurger\` | weekly | none | 7-year retention; deletes older. |
| \`MetricsRollup\` | hourly | none | Populates \`metrics_*\` tables for the dashboard. |

**Gaps & Recommendations.** Three of eleven jobs have no failure path at all. \`config/sidekiq.yml:L21\` declares a single \`default\` queue, so the weekly money run shares a lane with email blasts. Split the queues before adding a twelfth job.

## 7. Database

### 7.1 Tables (47)

Top 10 by row count, sorted descending (\`SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 10\`):

| Table | Rows (prod) | Notes |
|---|---:|---|
| audit_versions | 4,812,901 | \`paper_trail\`. Purged weekly. |
| webhook_deliveries | 1,902,114 | Could TTL aggressively. |
| notifications | 1,402,889 | |
| metrics_daily | 1,128,440 | rollup table. |
| bids | 802,144 | ~4.0 bids per load. |
| documents | 411,238 | + ~2 TB on S3. 9,412 of these are \`kind = 3\` (damage_report). |
| loads | 201,344 | |
| shipments | 156,801 | 77.9% of loads get awarded. |
| invoices | 151,229 | 96.4% of shipments get invoiced. |
| settlements | 142,108 | 94.0% of invoices reach settlement. |

**Confidence:** HIGH for the counts (read from \`pg_stat_user_tables\` on a \`heroku pg:pull\` snapshot the user supplied); MEDIUM for the ratios, which assume no backfill gaps.

### 7.2 Indexes

- Most foreign keys are indexed. Two are not: \`bids\` has a b-tree on \`load_id\` but nothing on \`(load_id, status)\`; \`webhook_deliveries.webhook_id\` has no index at all.
- No covering index on \`shipments(carrier_id, delivered_at)\` — the \`carrier_active\` query seq-scans at 156k rows.

### 7.3 Migrations

302 migrations on disk. Last 10 reviewed for risk:

- \`db/migrate/20260301141902_add_carrier_external_id.rb\` — backfilled in a separate task; safe. This is the \`schema.rb\` HEAD version.
- \`db/migrate/20260218104417_drop_legacy_fuel_table.rb\` — dropped a 200k-row table with no backup snapshot inside the migration. **Confidence: HIGH on the fact, MEDIUM on the blast radius** (nothing references it today, but \`down\` is unimplemented, so this is one-way).
- … the remaining eight are additive column/index migrations.

## 8. Authentication + authorization

**Current state.**

- \`Devise\` for \`User\` (\`app/models/user.rb:L12-L20\`); standard config, 6 modules, no OmniAuth.
- \`Pundit\` for authorization. \`grep -rl "authorize " app/controllers | wc -l\` → 29 of 41 controllers (~70%). The remaining 12 rely on a controller-level \`before_action :require_admin!\`.
- API uses \`ApiToken\` rows, bcrypt-hashed at cost 10, presented as \`Authorization: Bearer …\`.
- Sessions via Rails encrypted cookies. \`config/initializers/session_store.rb:L3\` sets a 30-day idle timeout and no \`same_site\` option, so the cookie defaults to \`Lax\`.
- \`config/initializers/cors.rb:L4\` — \`origins "*"\` on \`/api/v2/*\`.

**Confidence:** MEDIUM overall. The mechanisms are HIGH-confidence; the *coverage* claim is MEDIUM because Pundit's \`verify_authorized\` after_action is not globally enabled, so a controller can hold an \`authorize\` call on one action and none on another and still grep as covered.

**Gaps & Recommendations.** Turn on \`after_action :verify_authorized\` in \`ApplicationController\` behind an allow-list, so the 30% shows up as test failures instead of as a paragraph in a document nobody reads. Tighten \`cors.rb:L4\` to the known carrier integration origins.

## 9. Third-party services

| Service | Used for | Credential | Notes |
|---|---|---|---|
| Stripe | Carrier payouts (Settlement) | \`STRIPE_SECRET\` | Test mode in CI. Payouts only — no billing/subscription code, hence no 05-monetization doc. |
| Twilio | SMS to drivers | \`TWILIO_*\` | Costs trending up. |
| Sendgrid | Transactional email | \`SENDGRID_API_KEY\` | |
| AWS S3 | Documents | \`AWS_*\` | One bucket; \`paperclip\` (deprecated). |
| SmartyStreets | Address validation + geocoding | \`SS_AUTH_*\` | |
| Sentry | Error tracking | \`SENTRY_DSN\` | |
| Datadog | Metrics + APM | \`DD_API_KEY\` | |
| ClamAV (self-hosted) | Virus scan on uploads | — | Single-tenant scanning service in the same VPC. |
| Slack | Internal alerts | \`SLACK_WEBHOOK_OPS\`, \`SLACK_WEBHOOK_BIZ\` | |

## 10. Environment variables (24 in use)

\`DATABASE_URL\`, \`DATABASE_REPLICA_URL\`, \`REDIS_URL\`, \`SECRET_KEY_BASE\`, \`RAILS_MASTER_KEY\`, \`STRIPE_SECRET\`, \`STRIPE_PUBLIC\`, \`STRIPE_WEBHOOK_SECRET\`, \`TWILIO_ACCOUNT_SID\`, \`TWILIO_AUTH_TOKEN\`, \`TWILIO_FROM\`, \`SENDGRID_API_KEY\`, \`SENDGRID_FROM\`, \`AWS_ACCESS_KEY_ID\`, \`AWS_SECRET_ACCESS_KEY\`, \`AWS_S3_BUCKET\`, \`SS_AUTH_ID\`, \`SS_AUTH_TOKEN\`, \`SENTRY_DSN\`, \`DD_API_KEY\`, \`DD_APP_KEY\`, \`SLACK_WEBHOOK_OPS\`, \`SLACK_WEBHOOK_BIZ\`, \`CLAMAV_HOST\`.

\`DATABASE_REPLICA_URL\` is read by \`config/database.yml:L28\` but is not set in any Heroku config — confirmed by the user: the replica was never wired up and every query hits primary.

## 11. Gem inventory

84 gems in \`Gemfile\`. **Confidence: HIGH** (\`Gemfile.lock\` + \`bundle outdated --strict\`).

- Frameworks: \`rails 6.1.7.6\`, \`puma 5.6\`, \`sidekiq 7.1\`, \`activeadmin 2.13\`, \`devise 4.9\`, \`pundit 2.3\`.
- ORM extras: \`paranoia 2.6\`, \`paper_trail 15\`, \`ransack 4.0\`, \`scenic 1.7.0\` (present, unused — see §14).
- Money + payments: \`stripe 8.2\`, \`money-rails 1.15\`.
- Files + media: \`paperclip 6.1\` (**deprecated** — migrate to ActiveStorage), \`wicked_pdf 2.7\`, \`clamby 1.6\`.
- Background: \`sidekiq 7.1\`, \`sidekiq-scheduler 5.0\`, \`sidekiq-status 3.0\`.
- Frontend: \`stimulus_reflex 3.5\`, \`turbo-rails 1.5\`, \`tailwindcss-rails 2.1\`, \`importmap-rails 1.2\`. No Node build step — \`app/javascript/controllers/\` is served through importmap.
- Testing: \`rspec-rails 6.0\`, \`capybara 3.39\`, \`selenium-webdriver 4.9\`, \`factory_bot_rails 6.2\`, \`simplecov 0.22\`, \`pundit-matchers 3.1\`, \`axe-core-rspec 4.8\`.
- Flagged by \`bundle outdated --strict\` (11): \`rails 6.1.7.6 → 7.1\`, \`puma 5 → 6\`, \`sidekiq 7.1 → 7.3\`, \`stripe 8.2 → 12\`, \`devise 4.9 → 4.9.4\`, \`paper_trail 15 → 17\`, \`pundit 2.3 → 2.4\`, \`tailwindcss-rails 2.1 → 3\`, \`activeadmin 2.13 → 3\`, \`scenic 1.7.0 → 1.9.1\`, \`paperclip\` (no upgrade path; deprecated).

## 12. Deployment topology

**Current state.**

- Heroku: 3 × Standard-2X web dynos, 2 × Standard-2X worker dynos (\`Procfile\`, \`app.json\`).
- Postgres: Heroku Postgres **Standard-2** — 8 GB RAM, 400 connection limit. Current pool config takes ~30.
- Redis: Heroku Redis Premium-2; Sidekiq + Rails cache.
- Heroku's own router terminates the dyno traffic; **Cloudflare sits in front** of \`haulier.com\` on the default WAF ruleset only.
- Deploys: \`git push heroku main\`. **No Heroku Pipelines, no staging app.** Deploys go straight to production.
- Migrations run via \`heroku run rails db:migrate\` after the deploy. Two migrations in the last year needed a maintenance window; both were run without one.

**Confidence: LOW.** There is no runbook, no IaC, no ADR. Everything above is inferred from \`Procfile\`, \`app.json\`, and \`heroku\` CLI output. Treat it as a starting point to verify with Dana, not as fact.

## 13. Risk map — top 30

Ranked by *fragility* × *blast radius*. This is the working backlog any successor team should triage first. **Confidence: MEDIUM** — the ranking is heuristic; the individual findings are HIGH (each cites a file).

1. **\`app/models/settlement.rb:L41-L118\`** — 812 lines, 6 callbacks, **0 tests**. Money flow. The single highest-risk file in the repo. CRITICAL
2. **\`app/jobs/fuel_reindex.rb:9\`** — \`retry: 5\`, no \`sidekiq_retries_exhausted\`; silent failure → stale bid prices for 24h.
3. **\`app/controllers/api/v2/loads_controller.rb\`** — 1,242 lines, 19 actions, ~65 LoC average, partially migrated from v1.
4. **\`app/models/invoice.rb:L188-L241\`** — multi-step state machine; good coverage but 7 callbacks deep. Touch with care.
5. **\`app/services/settlement_runner.rb:L44-L96\`** — batched, transactional. Failure mid-batch may leave partial Settlements written. **Confidence: LOW** — no test confirms the transaction wraps the loop.
6. **\`app/models/bid.rb\`** — no validation on negative prices. A Carrier could in principle submit a negative bid.
7. **\`app/jobs/invoice_delinquency_nudge.rb\`** — timezone bug; the spec is \`skip\`-ped. Production runs broker-local, the test assumes UTC.
8. **\`db/seeds.rb:L3-L19\`** — hardcodes production Carrier ids. CRITICAL: must not run against prod.
9. **\`app/controllers/dispatchers_controller.rb:L71\`** — \`params.require(:dispatcher).permit!\` on the update path. Audit before adding any new field.
10. **\`app/models/carrier.rb:L88-L91\`** — \`scope :active\` chains \`.where.not(deleted_at: nil)\`; the predicate is inverted, so under \`unscoped\` it returns only deleted carriers.
11. **\`app/admin/settlements.rb\`** — Active Admin exposes Settlement to two SuperAdmins; no AuditLog on Active Admin actions.
12. **\`app/models/payment.rb:L210\`** — manual reconciliation path (ACH + check) has no idempotency key on amount.
13. **\`app/services/invoice_pdf_renderer.rb\`** — Wicked PDF + a system wkhtmltopdf binary. Single-threaded, 8 s p99 — the app's biggest tail latency.
14. **\`config/routes.rb\`** — 412 lines; \`match\` used in two places where \`get\` would be safer.
15. **\`app/policies/load_policy.rb\`** — last touched 18 months ago; three newer actions aren't policed.
16. **\`Gemfile.lock\`** — \`paperclip\` is end-of-life; the documents pipeline must move to ActiveStorage.
17. **\`spec/factories/settlements.rb\`** — exists but is referenced nowhere. The absence of Settlement specs is omission, not missing fixtures.
18. **\`app/models/concerns/auditable.rb\`** — opt-in; only 12 of 28 models include it. Audit trail has holes.
19. **\`app/jobs/webhook_delivery_worker.rb\`** — backoff to 24h; a dead customer endpoint can pile thousands of jobs in the single \`default\` queue.
20. **\`config/initializers/cors.rb:L4\`** — \`origins "*"\` on \`/api/v2/*\`.
21. **\`app/models/setting.rb:L28\`** — broker-wide singleton cached in Rails cache with no invalidation on update.
22. **\`db/migrate/20260218104417_drop_legacy_fuel_table.rb\`** — destructive, no snapshot, \`down\` unimplemented.
23. **\`app/models/document.rb:L61\`** — \`paperclip\` direct-to-S3; read URLs are signed with a 7-day TTL.
24. **\`config/sidekiq.yml:L21\`** — a single \`default\` queue; money jobs share a lane with email blasts.
25. **\`app/services/margin_rule_resolver.rb:L37\`** — last-write-wins where it should be most-specific-wins. Latent; surfaces only on overlapping rules.
26. **\`app/views/invoices/_line_items.html.erb\`** — 412 lines of ERB. Looks safe, but the length makes XSS review impractical.
27. **\`app/models/api_token.rb:L19\`** — bcrypt cost 10; should be 12.
28. **\`config/environments/production.rb:L44\`** — \`config.force_ssl = false\`, relying on Cloudflare. A CDN swap would silently downgrade to HTTP.
29. **\`app/services/load_search.rb:L12\`** — Ransack allow-list is permissive, exposing most columns. Low impact today; high risk the day a PII column lands.
30. **\`app/admin/users.rb:L26\`** — Active Admin user impersonation is enabled and unaudited.

## 14. Open questions

These are UNKNOWN — the code cannot answer them. They need a human.

1. **Damage data.** There is no \`Claim\` model. Damage lives in \`documents.kind = 'damage_report'\` (9,412 rows) and in free text in \`invoices.dispute_reason\`. Is the Document the system of record, and is it reliable?
2. **\`scenic 1.7.0\`** is in \`Gemfile.lock\` with no \`db/views/\` directory and no \`create_view\` in \`db/schema.rb\`. Who added it, and for what?
3. **\`loads.deliver_by\` and \`shipments.pickup_window_start/end\`** are \`timestamp without time zone\` storing local time. Production has carriers in four zones. Which zone is each row in?
4. **\`/api/v2\`** was added but \`/api/v1\` was never deprecated. Both log similar volumes. Which contract do Carrier integrations actually use?
5. **\`Setting\`** is cached with manual invalidation. Has a config change ever failed to take effect?
6. **The two SuperAdmin accounts** share a 1Password vault entry. Has it been rotated? (Unanswerable from code.)
7. **\`config/database.yml:L28\`** reads \`DATABASE_REPLICA_URL\`, which is unset on Heroku. Is the read replica used at all?

### 14.1 Answers received (2026-04-15, from the user relaying Dana)

| # | Answer | Effect |
|---|---|---|
| 2 | \`scenic\` was added ~a year ago for exactly this scorecard. The work was never finished. | Not a new dependency — activating an existing one. |
| 1 | Roughly half the \`damage_report\` documents are attached to the wrong shipment: drivers pick the shipment from a dropdown. | Damage rate is directionally useful, not precise. Must ship with a caveat, and the numerator must be windowed the same way as the denominator or a carrier can exceed 1.0. |
| 3 | Timestamps are naive local time. The destination \`Address.state\` identifies the zone. | On-time comparison needs \`AT TIME ZONE\` resolved through \`addresses.state\`. |
| 7 | The replica was never wired up. Everything hits primary. | Drop the replica from the topology doc. |

## 15. Suggested next steps for new owners

1. Pair with Dana this week to validate §13 risks 1–10. Her last day is 2026-05-08.
2. Add tests around \`settlement.rb\` before any new feature goes near the money path.
3. Decide whether \`/api/v2\` is the future or \`/api/v1\` is the survivor — then deprecate the other.
4. Split \`config/sidekiq.yml\` into explicit priority queues.
5. Schedule the \`paperclip\` → ActiveStorage migration.
6. Fix \`Carrier.active\` (§13 #10) before anything new reads it.

## 16. Checkpoint

\`.checkpoints/oc-reverse-spec.checkpoint.json\` — \`phase: "generation"\`, \`status: "complete"\`, all nine \`progress_table\` rows \`complete\`:

| id | label | status |
|---|---|---|
| orientation | Orientation scan | complete |
| schema | Schema & data model | complete |
| api | API layer | complete |
| business | Business logic | complete |
| frontend | Frontend structure | complete |
| auth | Auth & security | complete |
| integrations | Integrations | complete |
| infra | Infrastructure | complete |
| testing | Testing | complete |

Output root: \`reverse-spec-output/\`. Nine spec docs (05, 08, 09 skipped), \`gap-analysis.md\`, and \`app-architect-ready/{spec.md,sprint-plan.md}\`.`,
    },
    {
      id: "reverse-spec-checkpoint",
      label: ".checkpoints/oc-reverse-spec.checkpoint.json",
      kind: "checkpoint.json",
      body:
`# oc-reverse-spec checkpoint

Written at the end of \`/oc-rev-full\`, updated again after \`/oc-rev-sprint\`. This is what a successor session reads first.

\`\`\`json
{
  "protocol_version": "1.1",
  "skill": "oc-reverse-spec",
  "project": "haulier",
  "project_dir": "/Users/ops/work/haulier",
  "created_at": "2026-04-15T13:02:44Z",
  "updated_at": "2026-04-15T16:58:10Z",
  "phase": "generation",
  "step": "rev-sprint-handoff",
  "status": "complete",
  "progress_summary": "Nine analysis layers complete over commit a4f91e2. Nine spec docs written to reverse-spec-output/spec/ (05-monetization, 08-analytics, 09-documentation-plan skipped — no supporting code). gap-analysis.md carries a 30-item risk map and 7 open questions, 4 of which the user answered in session. /oc-rev-sprint \\"Carrier scorecard\\" produced app-architect-ready/spec.md + sprint-plan.md. Handed to oc-app-architect as Phase 2 baseline.",
  "progress_table": [
    { "id": "orientation",  "label": "Orientation scan",    "status": "complete" },
    { "id": "schema",       "label": "Schema & data model", "status": "complete" },
    { "id": "api",          "label": "API layer",           "status": "complete" },
    { "id": "business",     "label": "Business logic",      "status": "complete" },
    { "id": "frontend",     "label": "Frontend structure",  "status": "complete" },
    { "id": "auth",         "label": "Auth & security",     "status": "complete" },
    { "id": "integrations", "label": "Integrations",        "status": "complete" },
    { "id": "infra",        "label": "Infrastructure",      "status": "complete" },
    { "id": "testing",      "label": "Testing",             "status": "complete" }
  ],
  "context_primer": {
    "key_decisions": [
      "Scope is a single app, not a monorepo — confirmed by user 2026-04-15.",
      "/oc-rev-design skipped at user request: UI is Active Admin + ERB, no design system to extract.",
      "No Claim model and no claims table exist. Damage is documents.kind = 'damage_report' (app/models/document.rb:14), 9,412 rows.",
      "USER ANSWER (Dana, relayed): scenic 1.7.0 was added ~a year ago for this exact scorecard and never finished. Activating it is not a new dependency.",
      "USER ANSWER (Dana, relayed): ~half the damage_report documents are attached to the wrong shipment — drivers select it from a dropdown. Damage rate is directional, not precise; ship with a caveat.",
      "USER ANSWER (Dana, relayed): loads.deliver_by and shipments.pickup_window_* are naive local time. The destination Address.state identifies the zone.",
      "USER ANSWER: DATABASE_REPLICA_URL was never set. Every query hits primary — replica removed from the topology doc.",
      "Row-count ordering verified against a heroku pg:pull snapshot: loads 201,344 >= shipments 156,801 >= invoices 151,229 >= settlements 142,108.",
      "Postgres plan corrected from an initial guess to Standard-2 (8 GB RAM, 400 connections) after reading app.json."
    ],
    "generated_files": [
      "reverse-spec-output/spec/00-project-overview.md",
      "reverse-spec-output/spec/01-tech-stack.md",
      "reverse-spec-output/spec/02-architecture.md",
      "reverse-spec-output/spec/03-security-auth.md",
      "reverse-spec-output/spec/04-integrations.md",
      "reverse-spec-output/spec/06-testing.md",
      "reverse-spec-output/spec/07-devops.md",
      "reverse-spec-output/spec/10-cost-estimate.md",
      "reverse-spec-output/gap-analysis.md",
      "reverse-spec-output/app-architect-ready/spec.md",
      "reverse-spec-output/app-architect-ready/sprint-plan.md"
    ],
    "user_preferences": [
      "Do not touch app/models/settlement.rb, settlement_line_item.rb, or app/services/settlement_runner.rb.",
      "Queue names must read plainly to a stranger — 'money_adjacent' was rejected."
    ]
  },
  "blockers": [],
  "next_actions": [
    "oc-app-architect: load app-architect-ready/spec.md as the Phase 2 baseline and plan the Carrier Scorecard build.",
    "Validate gap-analysis.md risks 1-10 with Dana before 2026-05-08.",
    "Open a follow-up for gap-analysis.md risk #2 (fuel_reindex.rb has no sidekiq_retries_exhausted)."
  ],
  "skill_state": {
    "mode": "full",
    "source_commit": "a4f91e2",
    "layers_complete": 9,
    "docs_generated": 8,
    "docs_skipped": ["05-monetization", "08-analytics", "09-documentation-plan"],
    "confidence_low_docs": ["07-devops"],
    "open_questions_total": 7,
    "open_questions_answered": 4
  }
}
\`\`\`

## Why 05, 08 and 09 are skipped, not empty

Generation rule 1 in the skill: *generate only what the code supports.* Stripe is present, but every call site is a payout (\`Stripe::Transfer\`, \`Stripe::Account\`) — there is no plan, subscription, entitlement or checkout code, so \`05-monetization.md\` would have been a page of speculation. Same for analytics (no SDK; the \`metrics_*\` tables are internal rollups already covered by \`02-architecture.md\`) and the documentation plan (there is no docs infrastructure to plan around).

A skipped doc is a fact about the codebase. An empty doc is a lie about the analysis.`,
    },
    {
      id: "feature-spec",
      label: "Carrier Scorecard — new-feature spec",
      kind: "spec.md",
      body:
`# Carrier Scorecard — Feature Spec

**Owner** oc-app-architect Phase 2 · **Baseline** \`reverse-spec-output/app-architect-ready/spec.md\` (oc-reverse-spec @ \`a4f91e2\`) · **Status** approved 2026-04-16 · **Target** before 2026-05-08

## 0. Baseline references

This spec is written against the reverse-spec output, not against a blank page. What it leans on:

| Baseline doc / risk | What it constrains here |
|---|---|
| \`spec/02-architecture.md\` §4.1 | There is no \`Claim\` model. Damage comes from \`documents.kind = 3\`. |
| \`gap-analysis.md\` §14 Q1 (answered) | ~50% of damage_report rows are mis-attached → the metric ships with a caveat and a "directional" tooltip. |
| \`gap-analysis.md\` §14 Q3 (answered) | \`loads.deliver_by\` is naive local time; zone resolves through \`addresses.state\`. |
| \`gap-analysis.md\` §14 Q2 (answered) | \`scenic 1.7.0\` is already in \`Gemfile.lock\` — this activates it, it does not add a dependency. |
| \`gap-analysis.md\` risk #1 | \`settlement.rb\` is out of bounds. Enforced by \`bin/settlement-guard\` (user-requested), not by intent. |
| \`gap-analysis.md\` risk #24 | \`config/sidekiq.yml\` has one queue. This feature adds the second one: \`scorecards\`. |
| \`gap-analysis.md\` risk #2 | \`fuel_reindex.rb\` has no retries-exhausted handler. **We must not repeat that pattern** in \`ScorecardRefresh\`. |

## 1. Why

Dispatchers pick carriers with incomplete signal. The picker shows name, equipment and price; it does not show whether this carrier delivers on time, damages freight, or ends up in invoice disputes. Adding three lagging metrics to the picker should change pick behaviour measurably.

Three dispatcher interviews (30 min each) surfaced the same complaint independently: they learn the bad carriers by getting burned, and there is no way to know up front.

## 2. Outcome we want to see

90 days post-launch:

| Metric | Target |
|---|---|
| Share of awards going to carriers with on-time < 80% | down 30% from baseline |
| Disputes per 100 invoices (carrier-attributable) | down 15% |
| Dispatcher NPS on the picker flow | up ≥ 10 points |
| Time-to-pick (seconds from "new load" to "awarded") | flat or improved |

We are explicitly not optimising for more picks — we want better picks.

## 3. What — three metrics, nothing more

| Metric | Source | Window | Confidence |
|---|---|---|---|
| On-time rate | \`shipments.delivered_at\` vs \`loads.deliver_by AT TIME ZONE\` (zone from destination \`addresses.state\`) | 90d on \`delivered_at\` | HIGH |
| Damage rate | shipments in the same 90d window that have a \`documents\` row with \`kind = 3\` (\`damage_report\`) | 90d on both numerator and denominator | **MEDIUM — see §3.4** |
| Invoice dispute rate | \`invoices.status = 'disputed'\` over invoices with \`sent_at\` in window | 180d on \`invoices.sent_at\` | HIGH |

All three are computable from existing tables. No new data capture, no new writes.

### 3.1 Why three, not more

A 6-metric variant tested badly: dispatchers either glazed over or asked for a single rating. Three dimensions with no synthetic rating is the sweet spot.

### 3.2 Why three separate numbers, not a composite

A composite hides trade-offs (cheap-but-late vs on-time-but-pricey is a real choice) and invites carriers to game one weight against another. Three numbers, three glyphs, three choices.

### 3.3 Windowing rule (the one that bit us)

**Numerator and denominator must be windowed identically.** If the damage numerator counts every \`damage_report\` document ever filed against a carrier while the denominator counts only shipments delivered in the last 90 days, the rate can exceed 1.0. It does: carrier 4417 has 3 deliveries in window and 4 damage reports on file. This is written down because the first build got it wrong (see \`sprints/sprint-1/eval-round-1.md\`).

Same rule for disputes: the denominator is invoices with \`sent_at\` in the 180d window, not \`created_at\`. An invoice is created at draft and can sit unsent for weeks; \`invoice.rb:L204\` sets \`sent_at\` on the draft→sent transition, which is when the dispute clock actually starts.

### 3.4 The damage caveat, stated plainly

Per Dana (baseline §14.1), roughly half of \`damage_report\` documents are attached to the wrong shipment because drivers pick the shipment from a dropdown. The damage rate is therefore **directional, not precise**. The UI says so: the tooltip reads "Damage reports filed against this carrier's shipments in the last 90 days. Attribution is driver-entered and approximate." We surface it because "roughly, this carrier damages more freight than that one" is still more signal than dispatchers have today.

### 3.5 Edge cases

- **Zero shipments in window** — show \`—\` with tooltip "no recent data." Never render 0%, which is mathematically true and semantically misleading.
- **One shipment** — show the metric with a "low data" badge (\`shipments_90d < 5\`).
- **Delivered but not yet invoiced** — \`—\` for dispute rate; the 180d denominator is empty.
- **Carrier with a NULL destination address** — excluded from on-time entirely; the zone can't be resolved. 41 shipments in the snapshot, all pre-2024.

## 4. Where it renders

### 4.1 Primary surface: carrier picker on \`GET /loads/new\`

The picker is a partial on the new-Load form. The form itself posts to \`POST /loads\`; nothing about the submit path changes.

\`\`\`
 Big Rig Logistics      on-time 94%   ▲ 1.2%   ✎ 0.3%     [12 shipments]
 Mountain Freight       on-time 82%   ▲ 4.0%   ✎ 2.1%     [44 shipments]
 SmallCo Hauling        on-time 99%   ▲ 0.0%   ✎ 0.0%     [3 shipments · low data]
\`\`\`

- Hover → full breakdown tooltip with raw numerator/denominator and the damage caveat.
- Click a metric → deep-dive modal with a 12-week trend (sparkline + table).
- Glyphs: \`on-time\`, \`▲\` damage, \`✎\` dispute.

### 4.2 Secondary surface: carrier index

Sortable column on \`/carriers\` (read-only). No new affordances.

### 4.3 Not in scope

Carrier-facing scorecards. Carriers see their own numbers in v1.5.

## 5. Filter

Dispatchers can hide carriers below an on-time threshold via a toggle + slider on the picker. URL-paramed (\`?min_on_time=80\`) so the view is bookmarkable and shareable.

Default: off. Once a dispatcher toggles it, the preference persists per user — which requires a schema change:

\`\`\`ruby
# db/migrate/20260417102244_add_preferences_to_users.rb
class AddPreferencesToUsers < ActiveRecord::Migration[6.1]
  def change
    add_column :users, :preferences, :jsonb, null: false, default: {}
    add_index  :users, :preferences, using: :gin
  end
end
\`\`\`

\`User\` gains \`store_accessor :preferences, :min_on_time\`. This is the feature's only write path and it touches exactly one column on one table. It ships in **Sprint 2**, not Sprint 1 — Sprint 1 is read-only.

## 6. Data layer

One materialized view: \`carrier_scorecards_v1\`, via \`scenic\` (already in \`Gemfile.lock\`, see §0).

\`\`\`sql
-- db/views/carrier_scorecards_v1_v01.sql
CREATE MATERIALIZED VIEW carrier_scorecards_v1 AS
WITH zone_of AS (
  -- loads.deliver_by is timestamp WITHOUT time zone holding local wall-clock
  -- time (baseline gap-analysis §14 Q3). Destination Address.state is the
  -- only zone signal the schema carries.
  SELECT a.id,
         CASE a.state
           WHEN 'CA' THEN 'America/Los_Angeles'
           WHEN 'OR' THEN 'America/Los_Angeles'
           WHEN 'WA' THEN 'America/Los_Angeles'
           WHEN 'NV' THEN 'America/Los_Angeles'
           WHEN 'AZ' THEN 'America/Phoenix'
           WHEN 'CO' THEN 'America/Denver'
           WHEN 'UT' THEN 'America/Denver'
           WHEN 'NM' THEN 'America/Denver'
           WHEN 'MT' THEN 'America/Denver'
           WHEN 'ID' THEN 'America/Denver'
           WHEN 'WY' THEN 'America/Denver'
           WHEN 'TX' THEN 'America/Chicago'
           WHEN 'OK' THEN 'America/Chicago'
           WHEN 'KS' THEN 'America/Chicago'
           WHEN 'NE' THEN 'America/Chicago'
           WHEN 'MO' THEN 'America/Chicago'
           WHEN 'AR' THEN 'America/Chicago'
           WHEN 'LA' THEN 'America/Chicago'
           WHEN 'IA' THEN 'America/Chicago'
           WHEN 'MN' THEN 'America/Chicago'
           WHEN 'WI' THEN 'America/Chicago'
           WHEN 'IL' THEN 'America/Chicago'
           WHEN 'MS' THEN 'America/Chicago'
           WHEN 'AL' THEN 'America/Chicago'
           WHEN 'TN' THEN 'America/Chicago'
           WHEN 'ND' THEN 'America/Chicago'
           WHEN 'SD' THEN 'America/Chicago'
           ELSE 'America/New_York'
         END AS zone
  FROM addresses a
),
delivered_90d AS (
  SELECT s.id,
         s.carrier_id,
         s.delivered_at,
         (l.deliver_by AT TIME ZONE z.zone) AS deliver_by_utc
  FROM shipments s
  JOIN loads     l ON l.id = s.load_id
  JOIN addresses d ON d.id = l.destination_address_id
  JOIN zone_of   z ON z.id = d.id
  WHERE s.delivered_at IS NOT NULL
    AND s.delivered_at >= NOW() - INTERVAL '90 days'
),
damaged_90d AS (
  -- windowed to the SAME set of shipments as the denominator (§3.3)
  SELECT DISTINCT doc.shipment_id
  FROM documents doc
  JOIN delivered_90d dd ON dd.id = doc.shipment_id
  WHERE doc.kind = 3                      -- Document.kinds[:damage_report]
),
disputes_180d AS (
  SELECT s.carrier_id,
         COUNT(*) FILTER (WHERE i.status = 'disputed') AS disputed,
         COUNT(*)                                      AS sent
  FROM invoices  i
  JOIN shipments s ON s.id = i.shipment_id
  WHERE i.sent_at IS NOT NULL
    AND i.sent_at >= NOW() - INTERVAL '180 days'
  GROUP BY s.carrier_id
)
SELECT
  c.id AS carrier_id,
  COUNT(dd.id) FILTER (WHERE dd.delivered_at <= dd.deliver_by_utc)::float
    / NULLIF(COUNT(dd.id), 0)                      AS on_time_rate,
  COUNT(dd.id) FILTER (WHERE dm.shipment_id IS NOT NULL)::float
    / NULLIF(COUNT(dd.id), 0)                      AS damage_rate,
  dr.disputed::float / NULLIF(dr.sent, 0)          AS dispute_rate,
  COUNT(dd.id)                                     AS shipments_90d,
  COALESCE(dr.sent, 0)                             AS invoices_180d,
  NOW()                                            AS refreshed_at
FROM carriers c
LEFT JOIN delivered_90d dd ON dd.carrier_id  = c.id
LEFT JOIN damaged_90d   dm ON dm.shipment_id = dd.id
LEFT JOIN disputes_180d dr ON dr.carrier_id  = c.id
WHERE c.deleted_at IS NULL
GROUP BY c.id, dr.disputed, dr.sent;

CREATE UNIQUE INDEX carrier_scorecards_v1_carrier_id ON carrier_scorecards_v1(carrier_id);
CREATE INDEX        carrier_scorecards_v1_on_time    ON carrier_scorecards_v1(on_time_rate);
\`\`\`

Both metrics divide within the same windowed set, so \`damage_rate\` is bounded by \`[0, 1]\` structurally, not by assertion. \`refreshed_at\` is a column on the view — that is how staleness is measured, and it is what the "fresh as of HH:MM" badge reads.

The unique index on \`carrier_id\` is what makes \`REFRESH MATERIALIZED VIEW CONCURRENTLY\` legal.

### 6.1 Refresh job

\`\`\`ruby
# app/jobs/scorecard_refresh.rb
class ScorecardRefresh
  include Sidekiq::Worker
  sidekiq_options queue: :scorecards, retry: 3

  def perform
    ActiveRecord::Base.connection.execute(
      "REFRESH MATERIALIZED VIEW CONCURRENTLY carrier_scorecards_v1"
    )
  end
end
\`\`\`

Hourly via \`sidekiq-scheduler\`. The queue is \`scorecards\` — a name a stranger can read. \`config/sidekiq.yml\` gains the queue and the schedule entry; the worker dyno needs a restart to pick up the new queue.

**Note for the build:** \`retry: 3\` with no \`sidekiq_retries_exhausted\` is precisely baseline risk #2. The job must declare a retries-exhausted handler that alerts \`SLACK_WEBHOOK_OPS\`.

## 7. Test matrix

| Layer | Cases |
|---|---|
| Materialized view | zero-shipment carrier · 1-shipment carrier · all-on-time · all-late · damage report on an out-of-window shipment · damage report on a cancelled shipment · invoice created-but-unsent · NULL destination address |
| Refresh job | runs without lock contention · idempotent on re-run · retries-exhausted alert fires |
| Guard | \`bin/settlement-guard\` exits 0 on this branch |
| Picker controller | \`?min_on_time\` parses · out-of-range clamps · non-numeric falls back to off · Pundit denies non-Dispatchers |
| Stimulus filter | slider is keyboard-operable · \`aria-valuetext\` announces the threshold · respects \`prefers-reduced-motion\` |
| Strip partial | low-data badge renders · em-dash for NULL · screen reader announces the full metric name on focus |

**38 new examples: 12 model · 3 job · 1 guard · 22 system.** Baseline is \`312 examples, 0 failures, 3 pending\`; the branch finishes Sprint 2 at \`350 examples, 0 failures, 3 pending\`.

## 8. Telemetry

| Event | Payload | Why |
|---|---|---|
| \`scorecard.viewed\` | \`{dispatcher_id}\` | adoption |
| \`scorecard.tooltip_opened\` | \`{carrier_id, metric}\` | which metric drives engagement |
| \`scorecard.deep_dive_opened\` | \`{carrier_id, metric}\` | which metric people want more of |
| \`scorecard.filter_applied\` | \`{min_on_time}\` | filter usage |
| \`scorecard.low_data_shown\` | \`{carrier_id}\` | how often the badge is the reason a carrier is skipped |
| \`carrier.picked\` | \`{carrier_id, on_time_rate, damage_rate, dispute_rate}\` | did pick behaviour change? |

Aggregated weekly into the existing \`metrics_*\` rollups by \`MetricsRollup\`.

## 9. Rollout plan

| Phase | Audience | Duration | Gate |
|---|---|---|---|
| Internal | brokerage staff (5 users) | 1 week | no Sentry errors; manual UX feedback |
| 10% | \`Flipper.enable_percentage_of_actors(:scorecard_picker, 10)\` | 1 week | ≥ 50% \`scorecard.viewed\` rate |
| 100% | everyone | indefinite | — |

## 10. Fallback behaviour

- \`refreshed_at\` older than 6 hours → the "fresh as of HH:MM" badge turns into a "may be stale" badge and \`#ops\` gets a Slack alert.
- View missing entirely → \`CarrierScorecard.table_exists?\` is false, the picker renders the legacy partial, no error.

## 11. Non-goals

- Real-time updates. Hourly plus a visible freshness badge is enough.
- A weighted composite score (§3.2).
- Carrier-facing scorecards (v1.5).
- Any change to Settlement, Invoice or Payment flows. **Do not touch the money path.**

## 12. Risk assessment

\`settlement.rb\` (812 lines, 0 tests, 6 callbacks) sits two joins from \`invoices\`. Our query path never joins \`settlements\` — but "never" is a claim, and the user asked for a claim that a machine checks. \`bin/settlement-guard\` runs as part of the suite (\`spec/guards/settlement_guard_spec.rb\`) and fails the build on any scope file change or constant reference in the diff.

| Risk | Likelihood | Mitigation |
|---|---|---|
| Damage attribution is wrong for a specific carrier who complains | **high** | Deep-dive modal shows the underlying document list; tooltip states the caveat; §3.4 is the public answer. |
| Refresh job dies silently, view goes stale | medium | \`sidekiq_retries_exhausted\` → Slack; \`refreshed_at\` badge; 6h watchdog. |
| TZ mapping via \`addresses.state\` is wrong for a border-county carrier | medium | \`America/Phoenix\` handled separately; a 41-row NULL-address cohort is excluded rather than guessed. |
| Refresh contention on a 400-connection Postgres | low | \`CONCURRENTLY\` + unique index; measured at 18 s. |
| Filter hides too many carriers from a new dispatcher | medium | Default off; persists only after an explicit toggle. |

## 13. Sprint plan

## Sprint 1: Scorecard data layer — one materialized view, correct at the boundaries

### Features
§3 (all three metrics), §6 (view + refresh job), §12 (settlement guard).

### Deliverables
- \`db/views/carrier_scorecards_v1_v01.sql\` via \`bin/rails g scenic:view carrier_scorecards_v1 --materialized\`
- \`db/migrate/…_create_carrier_scorecards_v1.rb\` + \`…_backfill_carrier_scorecards_v1.rb\`
- \`app/models/carrier_scorecard.rb\` (read-only AR model) + \`app/policies/carrier_scorecard_policy.rb\`
- \`app/jobs/scorecard_refresh.rb\` with a \`sidekiq_retries_exhausted\` handler
- \`config/sidekiq.yml\`: \`scorecards\` queue + hourly schedule entry
- \`bin/settlement-guard\` + \`spec/guards/settlement_guard_spec.rb\`

### Test Requirements
- Unit: 12 examples on the view covering every §3.5 edge case, including the windowing rule in §3.3
- Unit: 3 examples on the refresh job (idempotency, lock contention, retries-exhausted alert)
- Guard: 1 example asserting \`bin/settlement-guard\` exits 0

### Definition of Done
- \`bin/rails db:migrate\` runs clean on a \`pg:pull\` of prod
- No carrier in the snapshot has any rate outside \`[0, 1]\`
- \`bundle exec rspec\` → \`328 examples, 0 failures, 3 pending\`
- \`bin/settlement-guard\` → \`scope files touched: 0 · constant refs: 0 · OK\`

### Dependencies
\`scenic 1.7.0\` (already in \`Gemfile.lock\`). A local \`heroku pg:pull\` snapshot — there is no staging environment (baseline §12).

### Estimated Effort
CLAUDE: 6h | USER: 1h

---

## Sprint 2: Picker UI — the strip, the filter, and the preference that persists

### Features
§4 (both surfaces), §5 (filter + \`users.preferences\`), §8 (telemetry).

### Deliverables
- \`app/views/loads/_carrier_picker.html.erb\` — 3-glyph strip, low-data badge, freshness badge, tooltip copy from §3.4
- \`app/javascript/controllers/scorecard_filter_controller.js\` — Stimulus, served through importmap (no bundler)
- \`app/views/carriers/_index_row.html.erb\` — sortable column
- \`db/migrate/…_add_preferences_to_users.rb\` + \`store_accessor\` on \`User\`
- \`app/controllers/loads_controller.rb\` — \`?min_on_time\` parse, clamp, persist
- \`config/locales/en.yml\` — every new string

### Test Requirements
- System: 22 Capybara examples across filter, deep-dive, low-data badge, freshness badge, keyboard operation and \`axe-core-rspec\`

### Definition of Done
- \`bundle exec rspec\` → \`350 examples, 0 failures, 3 pending\`
- \`axe-core-rspec\` reports 0 violations on \`/loads/new\`
- Slider is operable by keyboard alone and announces its value
- Flag off → the legacy picker renders byte-identically

### Dependencies
Sprint 1 merged; the view exists locally.

### Estimated Effort
CLAUDE: 7h | USER: 1h

---

Each sprint runs the Generator/Evaluator loop. Sprint 2 is a UI sprint, so the UX Design Evaluator attaches and the sprint must pass both. \`/oc-audit diff\` gates the branch before the PR.

Checkpoint: \`.checkpoints/oc-app-architect.checkpoint.json\`, \`phase: "build"\`.`,
    },
    {
      id: "sprint-ledger",
      label: "Sprint 1 & 2 evaluation rounds",
      kind: "eval-round.md",
      body:
`# Evaluation rounds — Carrier Scorecard

Three rounds across two sprints. Written by the oc-app-architect Evaluator with isolated context: it reads the sprint contract and the code, not the Generator's reasoning.

---

## sprints/sprint-1/eval-round-1.md

## Sprint 1 — Evaluation Round 1

### Code Scores
- Functionality: **4**/10 — The view builds and the migration runs, but \`damage_rate\` is not a rate. The \`damaged\` CTE counts every \`documents\` row with \`kind = 3\` for the carrier's shipments regardless of date, while the denominator counts only shipments delivered in the last 90 days. Carrier 4417 has 3 in-window deliveries and 4 damage reports on file → \`damage_rate = 1.3333\`. Two examples fail. Per the rubric, test failures cap Functionality at 5; the mis-computed metric is the deliverable, so 4.
- Feature Completeness: **7**/10 — 6 of 6 contract deliverables exist. \`config/sidekiq.yml\` declares the \`scorecards\` queue but the \`sidekiq-scheduler\` entry has no \`enabled\` key, so the hourly schedule is inert on boot. \`bin/settlement-guard\` is present and correct.
- Code Quality: **6**/10 — The \`zone_of\` CTE re-scans \`addresses\` for every carrier because it is not restricted to destination addresses; on the snapshot that is 214k rows materialized to serve 4,412. \`carrier_scorecard.rb\` has no \`readonly!\`, so a future caller can attempt a write against a view and get a Postgres error instead of an ActiveRecord one.
- Visual/UX Quality: n/a — no UI in this sprint.
- **Code Score: 5.6/10** (weights renormalized over the three applicable criteria)

### Test Results
- Tests run: \`328 examples, 2 failures, 3 pending\`
- New tests: 16 (12 model · 3 job · 1 guard)
- Coverage: 91.4% on new code (SimpleCov, \`app/models/carrier_scorecard.rb\` + \`app/jobs/scorecard_refresh.rb\`)

\`\`\`
Failures:

  1) CarrierScorecard damage_rate is bounded by the delivery window
     Failure/Error: expect(scorecard.damage_rate).to eq(0.25)

       expected: 0.25
            got: 1.0

     # ./spec/models/carrier_scorecard_spec.rb:41

  2) CarrierScorecard damage_rate ignores reports on out-of-window shipments
     Failure/Error: expect(scorecard.damage_rate).to be <= 1.0

       expected: <= 1.0
            got: 1.3333333333333333

     # ./spec/models/carrier_scorecard_spec.rb:58

Finished in 9 minutes 12 seconds (files took 6.44 seconds to load)
328 examples, 2 failures, 3 pending
\`\`\`

### Bugs Found
1. \`db/views/carrier_scorecards_v1_v01.sql:58\` — the \`damaged\` CTE selects from \`documents\` with no join to the windowed shipment set. Spec §3.3 says numerator and denominator must be windowed identically. Fix: join \`damaged_90d\` to \`delivered_90d\` on \`shipment_id\`.
2. \`config/sidekiq.yml:19\` — scheduler entry missing \`enabled: true\`. The job will never fire in production.
3. \`app/models/carrier_scorecard.rb:6\` — missing \`def readonly?; true; end\`.

### Gaps vs Contract
1. "No carrier in the snapshot has any rate outside [0, 1]" — **FAIL** — 11 carriers have \`damage_rate > 1.0\` against \`haulier_prod_20260416\`.
2. "\`bundle exec rspec\` → 328 examples, 0 failures, 3 pending" — **FAIL** — 2 failures.
3. "\`bin/settlement-guard\` → scope files touched: 0 · constant refs: 0 · OK" — **PASS** — exit 0.
4. "\`bin/rails db:migrate\` runs clean on a pg:pull of prod" — **PASS**.

### Verdict: FAIL

The damage rate is the second of three headline numbers and it is wrong in a way a dispatcher would notice within a day — a carrier showing "133% damage" destroys trust in the other two metrics as well. Fix the CTE join, add \`enabled: true\`, add \`readonly?\`, re-run.

---

## sprints/sprint-1/eval-round-2.md

## Sprint 1 — Evaluation Round 2

### Code Scores
- Functionality: **8**/10 — \`damaged_90d\` now joins \`delivered_90d\` on \`shipment_id\`, so the numerator is a strict subset of the denominator and the rate is bounded structurally rather than by assertion. Verified across all 4,412 carriers in \`haulier_prod_20260416\`: \`max(damage_rate) = 0.6667\`, \`max(on_time_rate) = 1.0\`, \`max(dispute_rate) = 0.5\`. Not 9 or 10 because the on-time timezone mapping is a \`CASE\` over \`addresses.state\` and 41 shipments with a NULL destination address are silently excluded rather than reported.
- Feature Completeness: **8**/10 — all six deliverables present and wired. \`enabled: true\` added. Docstring on the view file explains the windowing rule and cites spec §3.3, which is the thing most likely to be re-broken by the next person.
- Code Quality: **8**/10 — \`zone_of\` now restricted to destination addresses (214k → 89k rows scanned). \`readonly?\` added. The \`sidekiq_retries_exhausted\` handler is present and posts to \`SLACK_WEBHOOK_OPS\` — deliberately not repeating baseline risk #2.
- Visual/UX Quality: n/a — no UI in this sprint.
- **Code Score: 8.0/10**

### Test Results
- Tests run: \`328 examples, 0 failures, 3 pending\`
- New tests: 16 (12 model · 3 job · 1 guard)
- Coverage: 97.8% on new code

\`\`\`
$ bundle exec rspec
................................................................ (328)

Finished in 9 minutes 38 seconds (files took 6.51 seconds to load)
328 examples, 0 failures, 3 pending
\`\`\`

The 3 pending are pre-existing: \`invoice_delinquency_nudge_spec.rb\` (baseline risk #7, timezone), \`payment_reconciliation_spec.rb\` ×2.

### Bugs Found
None blocking. One note: the \`CASE\` in \`zone_of\` has 27 explicit states and an \`ELSE 'America/New_York'\`. A carrier delivering to a state not in the list gets Eastern. Correct for 41 of 50 states, wrong by up to 3 hours for the rest. Documented in the view's header comment and in the runbook.

### Gaps vs Contract
1. "No carrier has any rate outside [0, 1]" — **PASS** — verified across 4,412 carriers.
2. "328 examples, 0 failures, 3 pending" — **PASS**.
3. "\`bin/settlement-guard\` OK" — **PASS**.
4. "\`bin/rails db:migrate\` clean on a pg:pull" — **PASS** — \`0.8412s\` + \`11.2043s\`.

### Verdict: PASS

Suggest \`/oc-commit\` before Sprint 2 — the data layer is a coherent unit and the UI sprint will touch none of it.

---

## sprints/sprint-2/eval-round-1.md

## Sprint 2 — Evaluation Round 1

UI sprint: the oc-ux-engineer Design Evaluator attached. Both evaluators must pass.

### Code Scores
- Functionality: **8**/10 — Strip renders on \`GET /loads/new\`; filter parses, clamps and persists; \`/carriers\` column sorts; flag off renders the legacy partial byte-identically (asserted by a checksum example).
- Feature Completeness: **8**/10 — All deliverables present. The \`scorecard.low_data_shown\` telemetry event is emitted on render but not on scroll-into-view, so the count is an upper bound. Noted, not blocking.
- Code Quality: **7**/10 — The Stimulus controller does its own debounce with \`setTimeout\` rather than using the \`turbo-rails\` idiom already used in \`app/javascript/controllers/load_search_controller.js:18\`. Two ways to debounce in one codebase is how the third way gets written.
- Visual/UX Quality: **8**/10 — The strip reads as part of the existing picker rather than bolted on; glyph column widths are fixed so rows align.
- **Code Score: 7.8/10**

### Design Scores
- Visual Hierarchy: **8**/10 — The carrier name still wins; metrics are secondary in weight and colour. Correct — the dispatcher is picking a carrier, not reading a report.
- State Completeness: **8**/10 — Loading, empty (\`—\`), low-data, stale-data and error states are all drawn. The stale state was missing in the first generator pass and added in-round.
- Consistency: **8**/10 — Uses existing \`tailwindcss-rails\` tokens; no new colour values introduced.
- Accessibility: **6**/10 — **The slider had no \`aria-valuetext\`**, so a screen reader announced "80" with no unit or meaning. \`axe-core-rspec\` does not catch this (a bare \`aria-valuenow\` is technically valid), so it was caught by reading the output of the keyboard-navigation example. Fixed in-round: \`aria-valuetext="80 percent on-time or better"\`. Score reflects that it shipped wrong in the first pass.
- **Design Score: 7.5/10**

### Test Results
- Tests run: \`350 examples, 0 failures, 3 pending\`
- New tests: 22 system examples
- Coverage: 96.1% on new code

\`\`\`
$ bundle exec rspec
.................................................................. (350)

Finished in 9 minutes 41 seconds (files took 6.49 seconds to load)
350 examples, 0 failures, 3 pending
\`\`\`

\`\`\`
$ bin/rails db:migrate
== 20260417102244 AddPreferencesToUsers: migrating ============================
-- add_column(:users, :preferences, :jsonb, {:null=>false, :default=>{}})
   -> 0.0391s
-- add_index(:users, :preferences, {:using=>:gin})
   -> 0.2277s
== 20260417102244 AddPreferencesToUsers: migrated (0.2681s) ===================
\`\`\`

### Bugs Found
1. (fixed in-round) \`app/javascript/controllers/scorecard_filter_controller.js:22\` — slider missing \`aria-valuetext\`.
2. (fixed in-round) \`app/views/loads/_carrier_picker.html.erb:47\` — stale-data badge was not rendered when \`refreshed_at\` was NULL (first boot, before the first refresh). Now treated as stale.

### Gaps vs Contract
1. "350 examples, 0 failures, 3 pending" — **PASS**.
2. "axe-core-rspec 0 violations on /loads/new" — **PASS**.
3. "Slider operable by keyboard alone and announces its value" — **PASS** (after the in-round fix).
4. "Flag off → legacy picker renders byte-identically" — **PASS**.

### Verdict: PASS

Both evaluators pass. Hand to oc-code-auditor before the PR.`,
    },
    {
      id: "audit-report",
      label: "oc-code-auditor — /oc-audit diff report",
      kind: "audit.md",
      body:
`# Code Audit Report — haulier / Carrier Scorecard

**Scope:** \`diff\` — \`feat/carrier-scorecard\` vs \`main\` (\`a4f91e2\`…\`3c7d2b1\`), 21 files, **+612 −38**, 3 migrations
**Findings:** 0 CRITICAL · 0 HIGH · 1 MEDIUM · 2 LOW
**Overall health:** **B+** — no security or correctness defects in the diff; one operability gap that repeats a known pre-existing failure mode, and two low-severity config/quality items. **A− after [F-001] is fixed and verified.**
**Auditor:** oc-code-auditor v1.2.0 · **Run at** 2026-04-18T10:42:13Z · **Run time** 11 m 04 s (RuboCop + Brakeman + bundle-audit + rspec + EXPLAIN + guard)

## 1. Files in the diff

| File | +/− | Notes |
|---|---:|---|
| \`db/migrate/20260416093012_create_carrier_scorecards_v1.rb\` | +12 −0 | \`create_view … materialized: true\` + unique index. |
| \`db/migrate/20260416093118_backfill_carrier_scorecards_v1.rb\` | +9 −0 | One-shot \`REFRESH\`; idempotent. |
| \`db/migrate/20260417102244_add_preferences_to_users.rb\` | +7 −0 | \`preferences jsonb NOT NULL DEFAULT '{}'\` + GIN index. |
| \`db/views/carrier_scorecards_v1_v01.sql\` | +42 −0 | The view DDL. Header comment cites spec §3.3. |
| \`db/schema.rb\` | +15 −2 | Generated. Version bumps to \`2026_04_17_102244\`. |
| \`app/models/carrier_scorecard.rb\` | +22 −0 | Read-only AR model; \`readonly?\` → true. |
| \`app/models/user.rb\` | +6 −0 | \`store_accessor :preferences, :min_on_time\`. |
| \`app/policies/carrier_scorecard_policy.rb\` | +14 −0 | Pundit; Dispatcher-only. |
| \`app/jobs/scorecard_refresh.rb\` | +21 −0 | Hourly; \`CONCURRENTLY\`. **[F-001]** |
| \`app/controllers/loads_controller.rb\` | +16 −5 | \`?min_on_time\` parse → clamp → persist. |
| \`app/views/loads/_carrier_picker.html.erb\` | +44 −28 | 3-glyph strip, low-data + freshness badges. **[F-003]** |
| \`app/views/carriers/_index_row.html.erb\` | +9 −2 | Sortable column on \`/carriers\`. |
| \`app/javascript/controllers/scorecard_filter_controller.js\` | +26 −0 | Stimulus via importmap; no bundler involved. |
| \`config/sidekiq.yml\` | +7 −1 | \`scorecards\` queue + hourly schedule entry. **[F-002]** |
| \`config/locales/en.yml\` | +19 −0 | 14 new strings incl. the §3.4 damage caveat. |
| \`bin/settlement-guard\` | +41 −0 | User-requested diff guard. Executable. |
| \`spec/models/carrier_scorecard_spec.rb\` | +76 −0 | 12 examples. |
| \`spec/jobs/scorecard_refresh_spec.rb\` | +38 −0 | 3 examples. |
| \`spec/guards/settlement_guard_spec.rb\` | +18 −0 | 1 example; wraps \`bin/settlement-guard\`. |
| \`spec/system/loads/picker_spec.rb\` | +140 −0 | 22 examples incl. \`axe-core-rspec\`. |
| \`docs/runbooks/carrier-scorecard.md\` | +30 −0 | Refresh, staleness, rollback, TZ caveat. |

Total: **+612 −38 across 21 files**, of which 3 are migrations.

## 2. Findings

### [F-001] Refresh job has no retries-exhausted path

**Severity:** MEDIUM
**Category:** performance
**Location:** \`app/jobs/scorecard_refresh.rb:7-12\`
**Fix effort:** S (< 30 min)

**Problem:**
\`sidekiq_options retry: 3\` without a \`sidekiq_retries_exhausted\` block. After the third failure Sidekiq moves the job to the dead set and nobody is told. The view then stops refreshing; the picker keeps serving the last good snapshot with a "fresh as of" badge that quietly ages. This is the same shape as baseline risk #2 (\`app/jobs/fuel_reindex.rb:9\`) — the failure mode that already exists in this codebase, reproduced in new code.

The 6-hour staleness watchdog described in the feature spec §10 reads \`carrier_scorecards_v1.refreshed_at\`, which is correct — but it is a second-order alarm that fires up to six hours after the first-order one should have.

**Evidence:**
\`\`\`ruby
# app/jobs/scorecard_refresh.rb:7-12
class ScorecardRefresh
  include Sidekiq::Worker
  sidekiq_options queue: :scorecards, retry: 3

  def perform
    ActiveRecord::Base.connection.execute(
\`\`\`
\`\`\`
$ grep -rn "sidekiq_retries_exhausted" app/jobs/ | wc -l
0
\`\`\`

---

### [F-002] Scheduler entry does not declare \`enabled\`

**Severity:** LOW
**Category:** config
**Location:** \`config/sidekiq.yml:19\`
**Fix effort:** S (< 30 min)

**Problem:**
The \`sidekiq-scheduler\` block sets \`cron\` and \`class\` but omits \`enabled: true\`. \`sidekiq-scheduler 5.0\` defaults to enabled, so this is currently harmless — but the four pre-existing entries in the same file all set it explicitly (\`config/sidekiq.yml:6,9,12,15\`). An inconsistent fifth entry is the one someone will "clean up" in the wrong direction.

**Evidence:**
\`\`\`yaml
# config/sidekiq.yml:16-20
  scorecard_refresh:
    cron: "0 * * * *"
    class: ScorecardRefresh
    queue: scorecards
    description: "Refresh carrier_scorecards_v1"
\`\`\`

---

### [F-003] TODO left in a shipped partial

**Severity:** LOW
**Category:** quality
**Location:** \`app/views/loads/_carrier_picker.html.erb:31\`
**Fix effort:** S (< 30 min)

**Problem:**
A TODO referencing a decision that was already made (the deep-dive modal ships in this sprint; the comment says it does not). Stale TODOs in view code are how the next reader learns to ignore TODOs.

**Evidence:**
\`\`\`erb
<%# app/views/loads/_carrier_picker.html.erb:31 %>
<%# TODO: deep-dive modal is out of scope for sprint 2, wire later %>
\`\`\`

## 3. Recommended fix order

1. **[F-001]** — the only finding with a production consequence. Fix and verify before the PR.
2. **[F-003]** — one-line delete; no dependency.
3. **[F-002]** — cosmetic today. Batch it with the next \`sidekiq.yml\` change, or take it now since it is one line.

**Routed elsewhere:** none of these are declarative controls, so nothing routes to \`oc-security-hardening\`.

**Out of scope, filed against the baseline:** \`app/jobs/fuel_reindex.rb:9\` has the identical [F-001] defect and predates this branch. It is \`gap-analysis.md\` risk #2 and must not ride along in this diff — a change to the nightly fuel job is not something you want reviewed inside a picker PR.

## 4. Verification — Fix [F-001]

### Finding: Refresh job has no retries-exhausted path
### Fix: added a \`sidekiq_retries_exhausted\` block posting to \`SLACK_WEBHOOK_OPS\`, plus one example asserting the block fires

\`\`\`diff
--- a/app/jobs/scorecard_refresh.rb
+++ b/app/jobs/scorecard_refresh.rb
@@ -5,6 +5,14 @@ class ScorecardRefresh
   include Sidekiq::Worker
   sidekiq_options queue: :scorecards, retry: 3

+  sidekiq_retries_exhausted do |msg, ex|
+    Slack::Notifier
+      .new(ENV.fetch("SLACK_WEBHOOK_OPS"))
+      .ping(
+        ":rotating_light: ScorecardRefresh exhausted #{msg['retry_count']} retries: " \\
+        "#{ex.class}: #{ex.message}. carrier_scorecards_v1 is now stale."
+      )
+  end
+
   def perform
\`\`\`

### Verdict: **VERIFIED**

### Analysis
- Does the diff address the finding? **Yes.** The dead-set transition now has an alert path; the failure surfaces in \`#ops\` at the moment it happens rather than up to six hours later via the staleness watchdog.
- Scope: **Surgical.** +9 −0 in \`app/jobs/scorecard_refresh.rb\`, +14 in \`spec/jobs/scorecard_refresh_spec.rb\` (one example, \`Slack::Notifier\` stubbed). No adjacent code touched.
- Regressions: **None detected.** \`350 → 351 examples, 0 failures, 3 pending\`.
- Completeness: **Partial by design.** \`app/jobs/fuel_reindex.rb:9\` carries the same pattern and is still unfixed. That is pre-existing, tracked as \`gap-analysis.md\` risk #2, and deliberately excluded from this diff.

**Grade after fix: A−.**

## 5. Settlement guard

The user asked for a machine check rather than a promise, and asked to see its raw output. \`bin/settlement-guard\` runs in CI and in the suite via \`spec/guards/settlement_guard_spec.rb\`.

\`\`\`
$ bin/settlement-guard
settlement-guard  base=origin/main  files=21
  scope files touched: 0
  constant refs:       0
  OK
$ echo $?
0
\`\`\`

Scope list: \`app/models/settlement.rb\`, \`app/models/settlement_line_item.rb\`, \`app/services/settlement_runner.rb\`, \`app/jobs/weekly_settlement_run.rb\`, \`app/admin/settlements.rb\`, \`app/policies/settlement_policy.rb\`.

Independently confirmed by the auditor rather than taken on the script's word:

\`\`\`
$ git diff --name-only main...HEAD | grep -iE 'settlement'
bin/settlement-guard
spec/guards/settlement_guard_spec.rb
$ git diff main...HEAD -U0 | grep -nE '^\\+.*(Settlement|settlement_id|JOIN settlements)' | grep -v '^.*settlement-guard' | grep -v 'spec/guards'
(no matches)
\`\`\`

The two matching paths are the guard itself and its spec — both new files, neither in the scope list, neither referencing the \`settlements\` table. The materialized view's FROM/JOIN list is \`carriers\`, \`shipments\`, \`loads\`, \`addresses\`, \`documents\`, \`invoices\`. Not \`payments\`, not \`settlements\`.

## 6. Security

- **No new user-input surface.** The one new parameter, \`?min_on_time\`, is coerced with \`Float()\` inside a rescue and clamped to \`[0, 100]\` at \`app/controllers/loads_controller.rb:41\`. No raw params reach SQL.
- **No SQL interpolation.** The view is static DDL; the model scope uses Arel predicates.
- **Mass assignment.** \`preferences\` is not permitted in any \`_params\` method — \`grep -rn "permit(" app/controllers | grep preferences\` → 0 hits. It is written only through \`store_accessor\` from a clamped value.
- **Authorization.** \`CarrierScorecardPolicy\` restricts reads to \`Dispatcher\`. \`spec/system/loads/picker_spec.rb:88\` asserts a \`CarrierUser\` gets \`Pundit::NotAuthorizedError\`.
- **No PII in logs.** New log lines carry \`carrier_id\` only, which is an internal id.
- **Rate limiting.** The picker inherits the existing \`rack-attack\` 600/hr/user rule; no new route bypasses it.
- **bundle-audit:** 1 advisory, pre-existing and unchanged — \`paperclip 6.1.0\` (unmaintained, no patched release). Not introduced by this diff; it is \`gap-analysis.md\` risk #16.

## 7. Performance

\`\`\`
$ psql haulier_prod_20260416 -c "EXPLAIN ANALYZE SELECT ... WHERE on_time_rate >= 0.8 ORDER BY on_time_rate DESC LIMIT 50"
Limit  (cost=0.28..38.11 rows=50 width=72) (actual time=0.094..1.882 rows=50 loops=1)
  ->  Index Scan Backward using carrier_scorecards_v1_on_time on carrier_scorecards_v1
        Index Cond: (on_time_rate >= 0.8::double precision)
        (actual time=0.091..1.847 rows=50 loops=1)
Planning Time: 0.412 ms
Execution Time: 38.7 ms
\`\`\`

- Measured against \`haulier_prod_20260416\`, a \`heroku pg:pull\` snapshot — 201,344 loads / 156,801 shipments / 4,412 carriers. There is no staging environment (baseline §12), so this is the only production-shaped dataset available, and every number in this section is labelled as such.
- \`REFRESH MATERIALIZED VIEW CONCURRENTLY\` measured at **18.4 s** on the same snapshot; no table lock taken, picker queries served throughout.
- Backfill migration: **11.2 s**. Idempotent.
- No N+1 — \`includes(:carrier_scorecard)\` at \`app/controllers/loads_controller.rb:33\`; \`prosopite\` reports 0 violations across the 22 system examples.
- Picker page weight: **+1.1 KB gzipped** (Stimulus controller + inline SVG glyphs). No new HTTP requests — importmap, no bundler.

## 8. Correctness

- **Windowing.** Numerator and denominator share the \`delivered_90d\` CTE, so \`damage_rate ∈ [0, 1]\` structurally. Verified across all 4,412 carriers: \`max(damage_rate) = 0.6667\`. This was wrong in sprint-1 round 1 and is the reason the spec has a §3.3.
- **Timezone.** \`loads.deliver_by\` is compared as \`deliver_by AT TIME ZONE <zone>\`, zone resolved from the destination \`addresses.state\`. 27 states mapped explicitly, \`America/Phoenix\` handled separately, \`ELSE 'America/New_York'\`. This is a documented approximation, not a silent one — the fallback is stated in the view header and in the runbook.
- **NULL handling.** \`NULLIF(denominator, 0)\` yields \`NULL\`, not \`Inf\` or \`NaN\`; the partial renders \`—\`.
- **Freshness.** \`refreshed_at\` is a column on the view, set by \`NOW()\` at refresh time. A NULL (pre-first-refresh) is treated as stale.
- **Clamping.** \`?min_on_time=200\` → 100. \`?min_on_time=-5\` → 0. \`?min_on_time=foo\` → filter off. All three asserted.

## 9. Style

- \`bundle exec rubocop --parallel\` → **0 offences** (21 files inspected).
- \`bundle exec brakeman -q\` → **0 warnings, 0 errors**.
- ERB uses helper-side \`html_safe\`, never on user input. No \`raw\` calls in the diff.
- All 14 new strings live in \`config/locales/en.yml\`. No inline copy in views.
- Pundit coverage on the new action asserted by \`pundit-matchers\` inside \`spec/system/loads/picker_spec.rb\`, which is where a matcher gem belongs — it has no CLI.

## 10. Tests

\`\`\`
$ bundle exec rspec
.................................................................. (350)

Finished in 9 minutes 41 seconds (files took 6.49 seconds to load)
350 examples, 0 failures, 3 pending
\`\`\`

| Test file | Examples | New-code coverage |
|---|---:|---|
| \`spec/models/carrier_scorecard_spec.rb\` | 12 | 97.8% |
| \`spec/jobs/scorecard_refresh_spec.rb\` | 3 → 4 after [F-001] | 100% |
| \`spec/guards/settlement_guard_spec.rb\` | 1 | n/a (shells out) |
| \`spec/system/loads/picker_spec.rb\` | 22 | 96.1% |

- Diff coverage measured with \`undercover\` (\`bundle exec undercover --compare main\`): **96.4%** of changed lines executed. SimpleCov reports per-file totals, which is not the same question.
- \`axe-core-rspec\` on \`/loads/new\`: **0 violations**. Note that axe did not catch the missing \`aria-valuetext\` that the sprint-2 Design Evaluator found — a bare \`aria-valuenow\` passes the automated check. Automated a11y is a floor, not a ceiling.
- 3 pending examples are pre-existing (\`invoice_delinquency_nudge_spec.rb\`, \`payment_reconciliation_spec.rb\` ×2) and untouched by this branch.

## 11. Dependencies

- **\`scenic 1.7.0\` — activated, not added.** It has been in \`Gemfile.lock\` since 2025-04 (baseline §14 Q2; Dana added it for this exact feature a year ago and stopped). \`Gemfile.lock\` is unchanged by this diff — \`git diff --stat main...HEAD -- Gemfile.lock\` is empty. No new dependency risk, no allow-list review needed.
- \`bundle outdated --strict\` still flags \`scenic 1.7.0 → 1.9.1\`. Upgrading is a separate change; 1.7.0 supports \`materialized: true\` and \`CONCURRENTLY\`, which is everything this feature needs.

## 12. Operability

- **Queue.** \`scorecards\` — not \`default\`, so the refresh doesn't queue behind email blasts. **The worker dyno must be restarted for the new queue to be consumed.** Called out in the PR's deployment notes and in the runbook.
- **Failure alert.** \`sidekiq_retries_exhausted\` → \`#ops\` (added by the [F-001] fix).
- **Staleness alert.** Watchdog compares \`carrier_scorecards_v1.refreshed_at\` against \`NOW() - 6 hours\`. Reading \`refreshed_at\` is the right signal; vacuum statistics are not related to matview refresh.
- **Feature flag.** \`scorecard_picker\` (Flipper), off by default.
- **Rollback.** Flip the flag off → legacy picker, asserted byte-identical by a checksum example. Drop the view when confident; the \`users.preferences\` column is additive and can stay.
- **Runbook.** \`docs/runbooks/carrier-scorecard.md\`, added in this PR. Covers refresh, staleness, the TZ fallback, and rollback. It does **not** cover "what if the view is corrupted" — noted as a gap for v1.1.

## 13. Checkpoint

\`.checkpoints/oc-code-auditor.checkpoint.json\` written: \`mode: "diff"\`, \`findings_total: 3\`, \`grade: "A-"\`, \`fixes_applied: 1\`, \`fixes_verified: 1\`, \`verified_tree\` recorded. oc-git-ops may open the PR.

**Re-audit recommended** before any future change to the view definition, or the first time anything in the picker query path grows a join it did not have.`,
    },
    {
      id: "auditor-checkpoint",
      label: ".checkpoints/oc-code-auditor.checkpoint.json",
      kind: "checkpoint.json",
      body:
`# oc-code-auditor checkpoint

Written at the end of \`/oc-audit diff\`, updated after \`/oc-audit fix F-001\` and its verification.

\`\`\`json
{
  "protocol_version": "1.1",
  "skill": "oc-code-auditor",
  "project": "haulier",
  "project_dir": "/Users/ops/work/haulier",
  "created_at": "2026-04-18T10:42:13Z",
  "updated_at": "2026-04-18T11:06:52Z",
  "phase": "audit",
  "step": "diff-feat/carrier-scorecard",
  "status": "complete",
  "progress_summary": "/oc-audit diff over feat/carrier-scorecard (a4f91e2...3c7d2b1), 21 files, +612 -38. Three findings: F-001 MEDIUM (ScorecardRefresh has no sidekiq_retries_exhausted — same shape as baseline risk #2), F-002 LOW config, F-003 LOW quality. F-001 fixed and VERIFIED; grade B+ -> A-. Settlement guard clean and independently re-checked. Gate PASS.",
  "next_actions": [
    "oc-git-ops: /oc-git-sync to open the PR against main.",
    "Take F-002 and F-003 in the same PR or the next one — both are one-line.",
    "File gap-analysis.md risk #2 (fuel_reindex.rb:9, same defect as F-001) as its own issue. Do not fix it in this diff."
  ],
  "blockers": [],
  "eval_scores": [
    {
      "rubric": "oc-code-auditor",
      "score": 9.0,
      "max": 10,
      "at": "2026-04-18T11:06:52Z",
      "dimensions": { "security": 9, "performance": 8, "quality": 9, "ux": 9 },
      "ref": ".checkpoints/oc-code-auditor.checkpoint.json"
    }
  ],
  "skill_state": {
    "mode": "diff",
    "base": "a4f91e2",
    "commit": "3c7d2b1",
    "branch": "feat/carrier-scorecard",
    "files_changed": 21,
    "lines_added": 612,
    "lines_removed": 38,
    "findings_total": 3,
    "findings_by_severity": { "critical": 0, "high": 0, "medium": 1, "low": 2 },
    "grade": "A-",
    "grade_before_fixes": "B+",
    "fixes_applied": 1,
    "fixes_verified": 1,
    "fixes_rejected": 0,
    "verified_tree": "7c1f4a9e2b6d05833ae14fbc90d27e5518a3c6f0",
    "settlement_guard": {
      "script": "bin/settlement-guard",
      "base": "origin/main",
      "scope_files_touched": 0,
      "constant_refs": 0,
      "exit_status": 0,
      "runs_in_suite_via": "spec/guards/settlement_guard_spec.rb",
      "requested_by": "user"
    },
    "deferred_out_of_scope": [
      { "ref": "gap-analysis.md#risk-2", "file": "app/jobs/fuel_reindex.rb:9", "reason": "Pre-existing, identical defect to F-001. Fixing it here would put a change to the nightly fuel-price job inside a carrier-picker PR." }
    ]
  }
}
\`\`\`

## bin/settlement-guard

The user's condition for approving Sprint 1 was that the settlement scope be checked by a script that runs with the suite, not by the assistant's assurance. This is that script — 41 lines, no dependencies, exits non-zero on any hit.

\`\`\`ruby
#!/usr/bin/env ruby
# frozen_string_literal: true
#
# bin/settlement-guard — fail the build if a diff goes near the settlement scope.
# Added 2026-04-16 at the user's request (Sprint 1 approval gate).
# Run standalone, from CI, or via spec/guards/settlement_guard_spec.rb.

SCOPE = %w[
  app/models/settlement.rb
  app/models/settlement_line_item.rb
  app/services/settlement_runner.rb
  app/jobs/weekly_settlement_run.rb
  app/admin/settlements.rb
  app/policies/settlement_policy.rb
].freeze

PATTERNS = [
  /\\bSettlement\\b/,
  /\\bsettlement_id\\b/,
  /JOIN\\s+settlements/i,
  /settlements_path/,
  /WeeklySettlementRun/
].freeze

SELF = %w[bin/settlement-guard spec/guards/settlement_guard_spec.rb].freeze

base  = ENV.fetch("GUARD_BASE", "origin/main")
files = \`git diff --name-only #{base}...HEAD\`.split("\\n") - SELF

touched = files & SCOPE
refs = files.select { |f| File.exist?(f) }.flat_map do |f|
  File.readlines(f).each_with_index.filter_map do |line, i|
    "#{f}:#{i + 1}" if PATTERNS.any? { |p| line.match?(p) }
  end
end

puts "settlement-guard  base=#{base}  files=#{files.size + SELF.size}"
puts "  scope files touched: #{touched.size}#{touched.empty? ? "" : " -> #{touched.join(", ")}"}"
puts "  constant refs:       #{refs.size}#{refs.empty? ? "" : " -> #{refs.join(", ")}"}"
puts(touched.empty? && refs.empty? ? "  OK" : "  FAIL")
exit(touched.empty? && refs.empty? ? 0 : 1)
\`\`\`

## spec/guards/settlement_guard_spec.rb

\`\`\`ruby
# frozen_string_literal: true
require "rails_helper"

RSpec.describe "settlement guard", type: :guard do
  it "reports no settlement-scope changes on this branch" do
    out = \`bin/settlement-guard\`
    expect($CHILD_STATUS.exitstatus).to eq(0), "bin/settlement-guard failed:\\n#{out}"
    expect(out).to include("scope files touched: 0")
    expect(out).to include("constant refs:       0")
  end
end
\`\`\`

## Why it exists

Dana leaves 2026-05-08. \`settlement.rb\` is 812 lines with six callbacks and no tests. Six months from now, when something in settlements breaks, the first question will be "what changed?" — and for this feature the answer is provably nothing, because a script said so on every commit and its output is in the PR.

It is deliberately dumb: a file-list intersection and five regexes. A smarter check (AST scan, constant resolution) would be more correct and less trusted, because nobody reviewing a PR at 6pm is going to read it.`,
    },
    {
      id: "pull-request",
      label: "PR #212 — feat: carrier scorecard",
      kind: "pull-request",
      body:
`# feat: carrier scorecard on the load picker

**\`haulier/haulier#212\`** · \`feat/carrier-scorecard\` → \`main\` · 5 commits · **+635 −39 across 21 files** · reviewer: @dana-w

## Summary

Adds a three-metric scorecard (on-time rate, damage rate, invoice dispute rate) to the carrier picker on \`GET /loads/new\`, plus a sortable column on \`/carriers\` and an optional "hide carriers below N% on-time" filter that persists per dispatcher. Everything reads from one new materialized view, \`carrier_scorecards_v1\`, refreshed hourly.

Two things worth knowing before you read the diff:

1. **There is no \`Claim\` model.** The damage metric derives from \`documents.kind = 'damage_report'\`. Per Dana, roughly half of those rows are attached to the wrong shipment, so the metric is directional and the UI says so in the tooltip. This is documented in the feature spec §3.4 and in \`config/locales/en.yml\`.
2. **Nothing in the settlement scope moves.** \`bin/settlement-guard\` (new, in this PR) checks that on every run and fails the suite if it stops being true.

**Baseline:** \`reverse-spec-output/\` — this repo's first documentation, generated by oc-reverse-spec at \`a4f91e2\`.

## Changes

### Features
- \`feat(db): add carrier_scorecards_v1 materialized view via scenic\` — \`a1c93f4\`
- \`feat(jobs): hourly ScorecardRefresh on a dedicated scorecards queue\` — \`b7e2081\`
- \`feat(ui): carrier scorecard strip, filter and sortable column\` — \`d40ba17\`

### Fixes
- \`fix(db): window the damage numerator to the delivery window\` — \`5f8c3d2\` (evaluator round 1 caught \`damage_rate = 1.33\` on carrier 4417)
- \`fix(jobs): alert on ScorecardRefresh retries exhausted\` — \`3c7d2b1\` (audit finding F-001)

### Other
- \`bin/settlement-guard\` + \`spec/guards/settlement_guard_spec.rb\` travel with \`a1c93f4\`.

## Documentation

*(inserted from the oc-docs-forge packet, \`skill_state.pr_body_fragment\`)*

- **New:** \`docs/runbooks/carrier-scorecard.md\` — how the view refreshes, how to tell it hasn't, the timezone fallback, and how to roll back. Known gap: no procedure for a corrupted view; tracked for v1.1.
- **New:** \`reverse-spec-output/\` — 8 spec docs + \`gap-analysis.md\`. This repo had no documentation before this branch. \`05-monetization\`, \`08-analytics\` and \`09-documentation-plan\` are intentionally absent: no supporting code exists.
- **Updated:** \`README.md\` — a "Where the docs are" section pointing at \`reverse-spec-output/\` and \`.checkpoints/\`.
- **Not updated:** no public API surface changed, so \`/api/v1\` and \`/api/v2\` docs are untouched. Stated explicitly rather than left silent.

## Testing

- [x] \`bundle exec rspec\` → \`351 examples, 0 failures, 3 pending\` (baseline was \`312 examples, 0 failures, 3 pending\`; the 3 pending are pre-existing)
- [x] 39 new examples: 12 model · 4 job · 1 guard · 22 system
- [x] \`bundle exec undercover --compare main\` → 96.4% diff coverage
- [x] \`axe-core-rspec\` on \`/loads/new\` → 0 violations
- [x] \`bin/settlement-guard\` → \`scope files touched: 0 · constant refs: 0 · OK\`
- [x] \`EXPLAIN ANALYZE\` on \`haulier_prod_20260416\` (a \`pg:pull\` snapshot — there is no staging app) → \`Execution Time: 38.7 ms\`
- Evaluated by oc-app-architect evaluator: **8.0/10** (sprint 1, after a round-1 FAIL on the damage rate), **7.8/10 code + 7.5/10 design** (sprint 2)

## Audit Status

Pre-PR audit: \`/oc-audit diff\` — **Grade A−**, 3 findings (1 MEDIUM, 2 LOW), 1 addressed in this PR.

- **F-001** MEDIUM — \`scorecard_refresh.rb:7-12\` missing \`sidekiq_retries_exhausted\`. Fixed in \`3c7d2b1\`, Verifier verdict **VERIFIED**, scope surgical, no regressions.
- **F-002** LOW — \`config/sidekiq.yml:19\` missing \`enabled: true\`. Open.
- **F-003** LOW — stale TODO at \`_carrier_picker.html.erb:31\`. Open.

Pre-PR gate: oc-docs-forge packet ✓ · oc-repo-ops verdict **PASS** · oc-bug-check **PASS** (rubocop 0 offences, brakeman 0 warnings, rspec 351·0·3, bundle-audit 1 pre-existing advisory on \`paperclip\`, unchanged).

**Related, deliberately not in this PR:** \`app/jobs/fuel_reindex.rb:9\` has the same defect as F-001 and predates this branch. Filed separately as \`gap-analysis.md\` risk #2 — a change to the nightly fuel-price job does not belong in a picker PR.

## Deployment Notes

Order matters. Migrations first, then the flag, and the worker dyno restart is not optional.

\`\`\`bash
# 1. three migrations (view, backfill, users.preferences)
heroku run rails db:migrate -a haulier-prod

# 2. the backfill migration already did the first REFRESH; this is belt-and-braces
heroku run rails runner 'ScorecardRefresh.new.perform' -a haulier-prod

# 3. REQUIRED: config/sidekiq.yml adds the "scorecards" queue.
#    Worker dynos only read the queue list at boot.
heroku ps:restart worker -a haulier-prod

# 4. confirm the hourly schedule is registered
heroku run rails runner 'puts Sidekiq.get_schedule.keys' -a haulier-prod

# 5. roll out
heroku run rails runner 'Flipper.enable_percentage_of_actors(:scorecard_picker, 10)' -a haulier-prod
\`\`\`

**Rollback:** \`Flipper.disable(:scorecard_picker)\` — the legacy picker renders byte-identically (asserted by a checksum example). The view and the \`users.preferences\` column are additive and can stay; drop them later if the feature is abandoned.

**No staging environment exists** (baseline \`spec/07-devops.md\`), so this goes straight to production behind the flag at 10%. Setting up Heroku Pipelines is \`gap-analysis.md\` risk territory and out of scope here.

Refs: \`reverse-spec-output/app-architect-ready/spec.md\``,
    },
  ],
  skills: ["oc-reverse-spec", "oc-app-architect", "oc-code-auditor", "oc-git-ops"],
  runtime: "≈ 26 exchanges",
  steps: [
    { type: "beat", phase: "discover", label: "01 · Orientation", caption: "oc-reverse-spec, Phase 0 — 60 seconds before any deep read", skills: ["oc-reverse-spec"] },

    {
      type: "exchange", role: "user",
      content:
`Inherited a 3-year-old Rails app called Haulier (freight-broker SaaS). No docs. The one engineer who knows it — Dana — leaves on May 8th. Boss wants a "Carrier scorecard" feature before she goes.

    $ rails -v
    Rails 6.1.7.6
    $ bundle exec rspec
    312 examples, 0 failures, 3 pending
    Finished in 11 minutes 3 seconds

Heroku, Postgres 13. The README is a 2023 setup guide and nothing else, and I have about a week of Dana left.

I'm scared to touch it. Where do I start?`
    },
    {
      type: "exchange", role: "claude", skill: "oc-reverse-spec",
      content:
`Not oc-app-architect — you don't know enough about the app to plan a feature in it yet. Now using **oc-reverse-spec** to turn the code into the spec set oc-app-architect takes as input; its checkpoint is empty, so this is a cold start.

\`/oc-rev-scan\` is Phase 0 orientation: ~60 s of \`cloc\`, \`Gemfile.lock\` and the \`db/schema.rb\` header. You confirm scope off that block before I spend 40 minutes on nine layers.

One thing in advance, because it's expensive for me to infer: is anything in there already a known lie — a dead service, a table nobody writes to, a config that's never been true?`
    },
    {
      type: "exchange", role: "user",
      content: "/oc-rev-scan ~/work/haulier"
    },
    {
      type: "exchange", role: "claude", skill: "oc-reverse-spec",
      content:
`Phase 0 complete — 54 s.

\`\`\`
haulier · single app · Rails 6.1.7.6 + Postgres 13 (Heroku) + Sidekiq 7.1
1,184 Ruby files · 47,108 LoC · 47 tables · 28 models · 41 controllers
README (setup only, 2023-11) · 312 examples, 3 pending · SimpleCov 58.1%
✅ schema, api, business, auth, testing  ⏳ integrations, infra
📋 next session: frontend, gap analysis · checkpoint after each layer
\`\`\`

Two surprises. **\`scenic 1.7.0\` is in \`Gemfile.lock\` and does nothing** — \`grep -c "create_view" db/schema.rb\` returns 0. And **\`config/database.yml\` reads \`ENV["DATABASE_REPLICA_URL"]\`, which Heroku doesn't set** — a read replica unused for years, or dead code.

Confirm scope: single app, all spec docs?`
    },
    {
      type: "exchange", role: "user",
      content:
`Single app, yes. All the docs except the design one — skip \`/oc-rev-design\`. The UI is Active Admin plus hand-written ERB; there's no design system to extract.

The replica was never wired up. Dana set the config block up in year one, got distracted, and everything has hit primary ever since. Drop it from the topology.

The scenic thing I have no idea about. I'll ask Dana.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-reverse-spec",
      content:
`Running \`/oc-rev-full\`, nine layers. Evidence as I go.

Coverage is 58.1%, and \`grep -rln "settlement" spec/\` returns one path: \`spec/factories/settlements.rb\`. The factory exists; there is no \`settlement_spec.rb\` — 812 lines and six callbacks moving money, fixtures sitting right there unused.

**And the thing that matters most for your feature.** Your brief says "damage rate," so I went looking for the table:

\`\`\`
$ grep -c "claims" db/schema.rb
0
$ sed -n '14p' app/models/document.rb
  enum kind: { bol: 0, pod: 1, weigh_ticket: 2, damage_report: 3 }
$ psql haulier_prod_20260416 -tc "select count(*) from documents where kind = 3"
   9412
\`\`\`

**There is no \`Claim\` model and no \`claims\` table.** Damage is a \`Document\` with \`kind: :damage_report\` — 9,412 of them. The metric inherits however reliable driver-entered attachment is, which is a question for Dana.

Eight spec docs written, three skipped. The 30-item risk map tops out at \`settlement.rb\`; four of its seven open questions need Dana.`,
      artifacts: ["reconstructed-spec", "reverse-spec-checkpoint"],
    },
    {
      type: "exchange", role: "user",
      content:
`Talked to Dana. Three answers, and one of them is annoying.

**scenic:** she added it a year ago for *exactly this scorecard*, wrote no views, got pulled onto the Stripe payout migration, never came back. Not a new dependency — finishing something.

**Damage:** the annoying one. Roughly half the damage_report documents are attached to the wrong shipment — the driver app makes them pick from a dropdown and they pick the top one. She's known for two years; never been worth fixing.

**Timezones:** naive local time, resolved through the destination carrier's \`Address.state\`. Her words: "it's a hack, it's been a hack since 2023, and it's right about 90% of the time."

Feature brief: scorecard in the picker. On-time and damage over 90 days, disputes over 180, because that's how the board reads the quarterly.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-reverse-spec",
      content:
`Appended all three to \`context_primer.key_decisions\`. Two change the design, not just the docs:

- **Damage attribution is ~50% accurate.** Numerator and denominator have to be windowed *identically* — count every report ever filed over only 90 days of deliveries and a carrier comes out above 1.0.
- **Timezones resolve through \`addresses.state\`.** On-time can't be \`delivered_at <= pickup_window_end\` — that measures delivery against the *pickup* window. It has to be \`delivered_at <= (loads.deliver_by AT TIME ZONE <destination zone>)\`.

\`/oc-rev-sprint "Carrier scorecard"\` → \`app-architect-ready/\`. Now using **oc-app-architect** with that as the Phase 2 baseline, skipping \`/oc-discover\`. One product call first: ship damage with a caveat, or drop to two metrics?`
    },
    {
      type: "exchange", role: "user",
      content:
`Ship it with the caveat. Dispatchers already trade this information in Slack based on vibes — a directional number with a warning on it beats vibes.

Put the caveat in the hover tooltip where they'll actually see it, not in a help doc.`
    },

    { type: "beat", phase: "plan", label: "02 · Plan the feature", caption: "oc-app-architect loads the spec set as its Phase 2 baseline", skills: ["oc-app-architect"] },

    {
      type: "exchange", role: "claude", skill: "oc-app-architect",
      content:
`Loaded \`app-architect-ready/spec.md\` as the baseline. \`/oc-spec\` output against it:

| Metric | Source | Window |
|---|---|---|
| On-time | \`delivered_at\` vs \`deliver_by AT TIME ZONE\` (from destination \`addresses.state\`) | 90d |
| Damage | that same 90d set, with a \`documents\` row where \`kind = 3\` | 90d on **both** sides |
| Dispute | \`invoices.status = 'disputed'\` | 180d on \`invoices.sent_at\` |

The dispute denominator windows on \`sent_at\`, not \`created_at\`: \`app/models/invoice.rb:L204\` sets it on the draft→sent transition, and an invoice can sit at draft for weeks.

**Timezone risk:** the \`CASE\` over \`addresses.state\` maps 27 states and falls back to \`America/New_York\` — wrong by up to three hours for a carrier delivering somewhere unmapped. Documented in the view header.

No query plan yet — the view doesn't exist. Sprint 1 is done when no rate falls outside \`[0, 1]\` and \`rspec\` reports 328 examples, 0 failures. \`/approve\`.`,
      artifacts: ["feature-spec"],
    },
    {
      type: "exchange", role: "user",
      content:
`/approve — with two changes.

One: dispatchers want to filter the picker by the score. "Hide carriers below 80% on-time." That came up in all three interviews and it's the whole reason they care.

Two: don't name that queue \`money_adjacent\`. I saw it in the draft. In six weeks the only person who knows what that means is gone, and the next person to read \`sidekiq.yml\` at 2am is going to see a queue with "money" in the name next to the weekly settlement run and make a bad decision. Call it \`scorecards\`.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-app-architect",
      content:
`Both folded in. You're right about the queue name — it was describing the blast radius, which is the wrong thing for an identifier to do. \`scorecards\` it is.

The URL param is cheap: \`?min_on_time=80\`, clamped to \`[0, 100]\`. **Persistence isn't.** \`grep -n "preferences" db/schema.rb\` returns nothing, so it's a third migration — \`add_column :users, :preferences, :jsonb\` plus a GIN index — and this feature's only write path. It goes in **Sprint 2**, so if Sprint 1 goes wrong the rollback is "drop a view."

Not localStorage: a dispatcher has to be able to paste a filtered picker URL to a colleague.`
    },
    {
      type: "exchange", role: "user",
      content:
`/approve.

One rule, and I want it enforced, not promised. Nothing in \`app/models/settlement.rb\`, \`app/models/settlement_line_item.rb\` or \`app/services/settlement_runner.rb\` changes. Not a whitespace fix, not a rubocop autocorrect.

And I don't want you telling me you didn't touch them. I want a script that runs with the test suite and fails the build if the diff goes anywhere near them. When Dana's gone and something breaks in settlements in October, I want to point at a green check, not at a conversation.`
    },

    { type: "beat", phase: "build", label: "03 · Build", caption: "Generator/Evaluator — one FAIL round, one measurement the user forced", skills: ["oc-app-architect"] },

    {
      type: "exchange", role: "claude", skill: "oc-app-architect",
      content:
`Guard first, since it gates everything after it. \`bin/settlement-guard\` is 41 lines, wired in as \`spec/guards/settlement_guard_spec.rb\` so it runs on every \`rspec\`, not only in CI.

**Evaluator, round 1 — FAIL.**

\`\`\`
  1) CarrierScorecard damage_rate is bounded by the delivery window
     Failure/Error: expect(scorecard.damage_rate).to eq(0.25)
       expected: 0.25
            got: 1.0
     # ./spec/models/carrier_scorecard_spec.rb:41

328 examples, 2 failures, 3 pending
\`\`\`

**Code Score 5.6/10 — Functionality 4/10.** The \`damaged\` CTE counted every \`documents\` row with \`kind = 3\` for the carrier while the denominator counted only the 90-day delivery set. Carrier 4417: 3 in-window deliveries, 4 damage reports. **11 carriers came out above 1.0.**

**Round 2 — PASS.** \`damaged_90d\` now joins \`delivered_90d\` on \`shipment_id\`, so the numerator is a strict subset of the denominator and the bound is structural. \`max(on_time_rate), max(damage_rate), max(dispute_rate)\` = \`1 | 0.6667 | 0.5\`; 328 examples, 0 failures. **8.0/10.**

One number I still owe you: there's no query plan, because there's no staging app to measure on.`,
      artifacts: ["sprint-ledger"],
    },
    {
      type: "exchange", role: "user",
      content:
`There's no staging and there never has been — deploys go straight to prod, that's item 12 in your own risk map.

Run it against last night's \`pg:pull\` on my laptop. The database is \`haulier_prod_20260416\`. Real production data from yesterday, 201k loads. It's the closest thing to a staging environment this company owns.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-app-architect",
      content:
`Against \`haulier_prod_20260416\` — 201,344 loads · 156,801 shipments · 4,412 carriers.

\`\`\`
EXPLAIN ANALYZE ... FROM carrier_scorecards_v1 WHERE on_time_rate >= 0.8
  ->  Index Scan Backward using carrier_scorecards_v1_on_time
Execution Time: 38.7 ms
\`\`\`

**38.7 ms**, index scan, no seq scan — the view is 4,412 rows and the picker reads it like a lookup table. The refresh is the expensive half: \`REFRESH MATERIALIZED VIEW CONCURRENTLY\` clocks **18412.337 ms** hourly, no table lock.

Both are labelled "\`pg:pull\` snapshot, 2026-04-16" in the spec and the PR. It is not staging, and I don't want someone reading it in October and thinking it was.

Sprint 2 next. One decision I'd rather you make than me: filter default off, or on at 80%?`,
    },
    {
      type: "exchange", role: "user",
      content:
`Off. A dispatcher on their first day shouldn't have carriers silently hidden from them by a setting they didn't choose and don't know exists — that's exactly how you get someone insisting the carrier list is broken.

Off by default, and it only persists once they've deliberately moved the slider.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-app-architect",
      content:
`**Sprint 2 complete.** UI sprint, so the oc-ux-engineer Design Evaluator attached — both had to pass. \`rspec\` → 350 examples, 0 failures.

**Code Score 7.8/10** — a point off for a second \`setTimeout\` debounce next to the one already at \`app/javascript/controllers/load_search_controller.js:18\`.

**Design Score 7.5/10** — Visual Hierarchy 8, State Completeness 8, Consistency 8, **Accessibility 6**. That 6 is the real finding: the slider had \`aria-valuenow="80"\` and no \`aria-valuetext\`, so a screen reader announced "eighty" — eighty of what, in which direction. \`axe-core-rspec\` passed it, because a bare \`aria-valuenow\` is technically valid; it was caught by reading the keyboard-navigation example's output. Fixed in-round to \`aria-valuetext="80 percent on-time or better"\`; the score reflects that it shipped wrong first.

Both evaluators PASS. Branch \`3c7d2b1\`.`,
      artifacts: ["sprint-ledger"],
    },
    {
      type: "exchange", role: "user",
      content:
`Before anything gets audited — run the settlement guard and paste its actual output. Not a summary of it, not a checkmark. The raw stdout.

I want to know what it prints when it passes, because that's what I'm going to be reading in October.`
    },

    { type: "beat", phase: "audit", label: "04 · Audit gate", caption: "oc-code-auditor /oc-audit diff — three findings, one worth fixing", skills: ["oc-code-auditor"] },

    {
      type: "exchange", role: "claude", skill: "oc-code-auditor",
      content:
`\`\`\`
$ bin/settlement-guard
settlement-guard  base=origin/main  files=21
  scope files touched: 0
  constant refs:       0
  OK
\`\`\`

Now using **oc-code-auditor**, \`/oc-audit diff\` — 21 files, +612 −38. **0 CRITICAL · 0 HIGH · 1 MEDIUM · 2 LOW. Health B+.** I checked the guard's claim independently: \`git diff --name-only main...HEAD | grep -iE 'settlement'\` returns only the two new guard files.

**[F-001] MEDIUM · \`app/jobs/scorecard_refresh.rb:7-12\`** — \`retry: 3\` with no \`sidekiq_retries_exhausted\`, and \`grep -rn "sidekiq_retries_exhausted" app/jobs/\` returns 0 across the directory. After the third failure the job goes to the dead set and nobody is told — baseline risk #2, \`app/jobs/fuel_reindex.rb:9\`, reproduced in new code.

**[F-002] LOW** \`config/sidekiq.yml:19\` omits \`enabled: true\`; **[F-003] LOW** a stale TODO at \`_carrier_picker.html.erb:31\`.

\`/oc-audit fix F-001\` adds a \`sidekiq_retries_exhausted\` block pinging \`ENV.fetch("SLACK_WEBHOOK_OPS")\`. **Verifier: VERIFIED** — surgical, 351 examples, 0 failures.

**Grade: B+ → A−. Gate: PASS.** Checkpoint written with \`verified_tree\`.`,
      artifacts: ["audit-report", "auditor-checkpoint"],
    },
    {
      type: "exchange", role: "user",
      content: "F-001 — is that the same reason `FuelReindex` never alerts? Because if so, that job has been failing silently for three years and stale fuel prices go straight into bid pricing, which is a lot more expensive than a stale scorecard."
    },
    {
      type: "exchange", role: "claude", skill: "oc-code-auditor",
      content:
`Same class of bug, worse consequences. \`app/jobs/fuel_reindex.rb\` is \`sidekiq_options queue: :default, retry: 5\` with no exhausted handler — \`gap-analysis.md\` risk #2, second of thirty, above everything except \`settlement.rb\`, for exactly the reason you gave: a stale scorecard misleads one dispatcher for an hour, a stale FuelSurcharge prices every bid in the system for 24 hours and nothing says so.

Whether it *has* been failing is a dead-set question, not a repository one — \`Sidekiq::DeadSet.new.select { |j| j.klass == "FuelReindex" }.size\` on prod.

It is **not** going in this PR. The fix is four lines and I could add it in ninety seconds — which is precisely the temptation to resist: a change to the nightly fuel-price job reviewed inside a carrier-picker PR gets no review at all. It's in \`skill_state.deferred_out_of_scope\`.`
    },
    {
      type: "exchange", role: "user",
      content:
`Agreed, keep it out. File it as its own issue with the gap-analysis risk number in the title so it doesn't get lost in the pile — and I'll run that dead-set query myself this afternoon.

Then open the PR. Base \`main\`, and put Dana on it as a reviewer. She's back Monday and this is the last thing she'll ever review here, so I'd rather she read it than rubber-stamp it.`
    },

    { type: "beat", phase: "ship", label: "05 · Ship", caption: "oc-git-ops /oc-git-sync — bug-check, docs packet, repo gate, PR", skills: ["oc-git-ops"] },

    {
      type: "exchange", role: "claude", skill: "oc-git-ops",
      content:
`Now using **oc-git-ops**, \`/oc-git-sync\`.

**Step 6 — oc-bug-check gate: PASS.** rubocop clean, brakeman 0 warnings, \`rspec\` 351 examples / 0 failures, \`settlement-guard\` 0 scope files touched.

**Step 5 — five commits:**

\`\`\`
3c7d2b1 fix(jobs): alert on ScorecardRefresh retries exhausted
5f8c3d2 fix(db): window the damage numerator to the delivery window
d40ba17 feat(ui): carrier scorecard strip, filter and sortable column
b7e2081 feat(jobs): hourly ScorecardRefresh on a dedicated scorecards queue
a1c93f4 feat(db): add carrier_scorecards_v1 materialized view via scenic
\`\`\`

\`5f8c3d2\` stays its own commit rather than being squashed into \`a1c93f4\` — the windowing bug is the likeliest thing for someone to reintroduce.

**Steps 8–11:** \`/oc-docs pr\` packet written, \`/oc-repo verify\` PASS, PR **#212** against \`main\` with \`dana-w\` requested, follow-up **#213** "fuel_reindex.rb:9 has no retries-exhausted handler (risk #2)".

Deploy order is in the PR and it matters: migrations, manual refresh, then **restart the worker dyno** — dynos only read the queue list at boot.`,
      artifacts: ["pull-request"],
    },
    {
      type: "exchange", role: "user",
      content:
`Good. Last thing, and it's the one that actually matters to me.

Dana's gone in three weeks. When she is, and I'm sitting here with a bug and no idea where anything is — what do I read, and where exactly is it? Give me paths, not reassurance.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-reverse-spec",
      content:
`Paths, in the order you'd want them.

\`\`\`
reverse-spec-output/
├── spec/  00-overview · 01-tech-stack · 02-architecture
│          04-integrations · 06-testing            HIGH
│          03-security-auth · 10-cost-estimate     MEDIUM
│          07-devops                               LOW ← trust least
├── gap-analysis.md   ← 30-item risk map + 7 open questions
└── app-architect-ready/
\`\`\`

\`gap-analysis.md\` is the one to read first when something breaks: thirty files ranked by fragility × blast radius, each citing a \`path:line\`. Risk #1 is \`settlement.rb\`; risk #2 is the job you're filing today.

Why it's shaped like that: the feature spec, §3.3 and §3.4. Whether it worked: \`sprints/sprint-1/eval-round-1.md\`, the FAIL, with the failing example names. \`npm run checkpoint:status\` prints all three checkpoints, including Dana's four answers verbatim under \`key_decisions\`.

**The honest gaps**, so you don't discover them at 2am. \`07-devops.md\` is LOW confidence — no runbook, no IaC, no ADRs, inferred from \`Procfile\` and \`heroku\` output. And \`settlement.rb\` still has 0 tests: the guard means this feature didn't make that worse, but it didn't make it better either. That's risk #1, and what to spend Dana's last week on, not this PR.`
    },
  ],
};
