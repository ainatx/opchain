import type { Walkthrough } from "./types";

/**
 * Scenario 12 (v1.3 supporting) — Priya, a solo founder, builds Quill
 * (a B2B invoicing tool for small accounting firms) from idea to
 * paying customer in two weeks. opchain scaffolds Django + Postgres,
 * deploys to Render via render.yaml Blueprint, uses GitHub Issues
 * (not Linear) for tracking. Proves the v1.3 platform expansion is
 * real, not just words in oc-stack-forge — and that the same opchain
 * pipeline that ships JS-on-Cloudflare also ships Python-on-Render
 * with no special-casing.
 *
 * Issue/PR numbering is one GitHub sequence: #1 idea · #2 repo setup ·
 * #3 scaffold · #4 firms domain · #5-#10 sprint child tickets ·
 * #11 the Sprint-1 PR · #12/#13 follow-ups · #14 deploy ticket.
 */
export const djangoRenderShipped: Walkthrough = {
  id: "django-render-shipped",
  title: "Django + Postgres + Render, shipped by opchain",
  tagline: "v1.3 supporting · platform expansion proof",
  summary:
    "Solo founder builds a B2B invoicing app on Django + Postgres + Render with GitHub Issues for tracking. Same opchain pipeline as the Cloudflare-flavored scenarios — oc-stack-forge picks the stack, oc-app-architect scaffolds and runs the sprint loop, oc-git-ops shapes commits from GH issues, oc-deploy-ops ships via render.yaml Blueprint. Two weeks ideation → paying customer.",
  description:
    "Quill is a B2B invoicing tool aimed at small US accounting firms (3-15 person partnerships) that hate QuickBooks but can't yet afford a dedicated finance ops team. Priya is the solo founder; she has 8 years of Python at a fintech, no Cloudflare experience, and wants the smallest possible ops surface. The opchain pipeline picks Django + Postgres + Render (oc-stack-forge decision tree: solo founder, no ops appetite, server-rendered UI, admin panel needed → Django/Render is the canonical match), scaffolds the project per the v1.3 \"Platform-Specific Recipes\" in oc-app-architect's scaffold-guide, uses GitHub Issues as the PM provider (one-line config swap from Linear; same protocol §3 markers), and ships via render.yaml Blueprint. Nothing lands first-try: the scaffold refuses to boot on a Django app-label collision, Sprint 1's evaluator fails round 1 on a UTF-8 BOM in Sarah's real Excel export, the staging deploy is blocked by a security finding that staging and prod shared one database, and the first production send is rejected by Resend until the sending domain's DNS is verified. The artifact set is what Priya actually ends up with after two weeks: the spec docs from /oc-spec, the stack ADR, the render.yaml Blueprint, the .opchain/pm.yaml configured for GitHub Issues, the six-sprint roadmap with its PM child tickets, the Sprint-1 evaluator rounds, the first PR (#11, linked back to inv-org/quill#5), the deploy log, and the deploy-ops checkpoint that proves the cross-skill state contract is identical to the Cloudflare scenarios.",
  inputs: [
    "Solo founder · 8 years Python · fintech background · no Cloudflare experience",
    "Idea: B2B invoicing tool for small accounting firms (3-15 person partnerships)",
    "Existing GitHub repo: inv-org/quill (empty, just LICENSE + README)",
    "GitHub Issues for tracking; no Linear, no Jira",
    "Signed LOI from Sarah's 7-partner firm, \$350/mo, dated 2026-05-08",
    "Preference: smallest possible ops surface — solo founder with no ops appetite",
  ],
  outputs: [
    {
      id: "discovery",
      label: "/oc-discover output — discovery summary + spec sketch",
      kind: "spec/00-project-overview.md",
      body:
`# 00-project-overview.md — Quill

**Produced by** oc-app-architect /oc-discover (Phase 1) · **Source ticket:** [inv-org/quill#1](https://github.com/inv-org/quill/issues/1) · **Run-time:** 14 minutes · **Discovery questions asked:** 9 (4 pre-filled from #1 and read back for confirmation, 5 asked in two rounds)

## 1. TL;DR

Quill is opinionated invoicing for partnership-shaped accounting firms.
Per-firm install on Render; partner-aware data model; monthly batch
invoice generation; PDF + email delivery. Pricing \$200-500/mo per firm.
Targets are 3-15-partner US CPA firms that have outgrown spreadsheets
but balk at QuickBooks' seat pricing and don't need NetSuite's complexity.

## 2. Problem (deep)

### 2.1 What the firms have today

Small US accounting partnerships (3-15 partners) live in **Google Sheets
+ email + QuickBooks for the books, not for client billing**. Their
actual invoicing flow:

- Each partner tracks hours worked per client in a personal spreadsheet
  or Toggl (no consolidation).
- The "operations partner" — usually one specific partner who drew the
  short straw — collates the firm's billables once a month into a
  master sheet.
- Retainer clients (~40% of revenue at Sarah's firm) get a flat-fee
  invoice; hourly clients get a line-item invoice; fixed-fee engagements
  get a milestone invoice. The ops partner does this by hand in Word or
  Pages templates.
- PDFs get attached to email; the ops partner mails them; payments
  arrive 14-60 days later via ACH or paper check.

### 2.2 What hurts

Pain measured from Sarah (our primary persona, see §4.1). These are
**her numbers, self-reported in a 45-minute call on 2026-05-06** — one
firm, not a survey:

- **30 hours/month** spent on invoicing — just the generation, not
  collection.
- **2-3 invoicing errors/month** that get caught by the client and
  require re-issue. Each costs ~3 hours of explanation + correction.
- **Mid-month liquidity is opaque** because nobody knows the WIP
  balance until the month-end batch.
- **Onboarding a new partner = onboarding a new spreadsheet** that
  nobody else can edit consistently.

### 2.3 Why now

Three pressures. Only the third is evidence; the first two are
positioning, and this doc labels them as such so nobody later cites
them as requirements.

1. **Priya reports that her design partners' QuickBooks Online renewals
   rose roughly 20% this year.** Unverified — three anecdotes, no
   published price sheet in hand. Treat as a sales talking point, not
   a spec fact. Nothing in the data model depends on it.
2. **Firms want cleaner billing-to-books ledgering than spreadsheets
   provide.** Sarah asked for a journal-entry export by name; the other
   two design partners did not. Scoped to v1.x, not v1 (§13).
3. **Three of Priya's 12 design-partner conversations specifically
   asked for this product.** Sarah's firm is one and has signed an LOI
   at \$350/mo dated 2026-05-08. The other two are a 5-partner and an
   11-partner firm; neither has signed.

## 3. Outcome the product is hired for

> "I want to load the firm's billables once a month, click generate,
>  email the PDFs, and move on with my life."
> — Sarah, ops partner, 7-partner firm

Two adjacent jobs we're explicitly **not** hiring for:

- **Bookkeeping / GL.** Quill is invoicing, not the books. Firms keep
  QBO or Xero for the books and export a Quill-→-books journal entry
  for month-end.
- **Time-tracking enforcement.** Partners enter their hours however
  they currently do. Quill ingests; it doesn't police.

## 4. Personas

### 4.1 The Ops Partner (primary; the buyer)

**Sarah**, ~45y, 7-partner firm in suburban Atlanta, the partner who
drew the short straw on operations. Spends ~30h/month on invoicing
alone. Tolerance for tooling complexity: low — she didn't sign up to
be a software user. Tolerance for cost: medium — \$200-500/mo for the
firm is fine if it saves her 20h/month at her billing rate.

**What she needs from Quill:**
- Load billables (CSV or manual entry) once a month.
- Generate + preview + send invoices in one batch.
- Export a GAAP-friendly journal entry for the firm's QBO.
- A single dashboard view of "who owes us what, aged."

**What she doesn't want:**
- Real-time anything. Month-end is the workflow.
- A mobile app. Accounting work happens at a desk.
- Mandatory training. She'll watch one 5-minute Loom and that's it.

**Operational detail that turned out to matter:** Sarah exports her
firm's hours from Excel on a Mac. That export is UTF-8 **with a BOM**
and CRLF line endings. This is recorded here because it is the single
most likely thing to break the import path — and it did, in Sprint 1
evaluator round 1.

### 4.2 Other Partners (secondary; users)

The other 6 partners log in occasionally to:
- Check their own client portfolio's WIP balance.
- Review draft invoices before send.
- Approve fee-write-offs (a feature half the firms want; gated to
  Sprint 5).

Tolerance for complexity is similar to Sarah's. They will use Quill
for ~30 min/month, max.

### 4.3 The Firm's Clients (anti-persona; never see Quill directly)

Clients receive the **emailed PDF**. They never log into Quill. Don't
build them a portal. **This is a hard line** — every "let's also build
a client portal" feature request goes to the parked-list.

## 5. Job-to-be-done (JTBD)

**When** the month closes and I have a firm's worth of unbilled hours
sitting across 7 spreadsheets,
**I want to** consolidate, generate, and send invoices in one batch,
**so that** I can spend my last day of the month doing partner-level
work instead of clerical work.

Forces:
- **Push:** spreadsheet errors costing 6+ hours/month in corrections;
  perceived QBO price pressure; tax-reporting pressure.
- **Pull:** Quill's "load → click → done" promise; the per-firm-install
  story (no SaaS-vendor-data-residency concerns).
- **Habit:** the current spreadsheet workflow is bad but familiar;
  switching cost is the implementation weekend.
- **Anxiety:** "will my partners actually enter their hours?" — same
  as today; we don't make this worse.

## 6. Competitor matrix

Pricing figures are list prices sampled 2026-05-07 and modelled for a
7-partner firm; they are estimates, not quotes.

| Tool | Pricing (7-partner firm) | Partner-aware data? | Self-host? | Notes |
|---|---:|---|---|---|
| **QuickBooks Online** | ~\$5,880/yr | No (users-with-roles) | No | Industry default; partners hate the per-seat math. |
| **FreshBooks** | ~\$1,920/yr | No | No | Solo-friendly; partnership story is bolted on. |
| **Wave** | \$0 + per-transaction | No | No | Free tier ends at the first scale ceiling. |
| **NetSuite** | \$15,000+/yr | Yes (sort of) | No | Wildly over-spec'd for a 7-partner firm. |
| **Manual (Sheets + Word)** | \$0 | Yes (whatever the partners build) | Yes | The status quo; 30h/month tax. |
| **Quill** | \$3,600-6,000/yr | **Yes (first-class)** | **Yes (per-firm Render install)** | Wedge: partnership model + per-firm install. |

Quill's wedge is **partnership-aware data model** + **per-firm install
posture**. QBO and FreshBooks treat firms as users-with-roles; the
partnership concept is bolted on. NetSuite handles partnerships but
costs 3-5× what Sarah's firm spends on all software combined.

## 7. Pricing rationale

\$200-500/mo per firm, single-tenant Render install. Math:

- Sarah's firm spends ~\$6,000/yr on QBO + ~\$2,400/yr on time-tracking +
  ~\$1,200/yr on PDF / email tooling = ~\$9,600/yr.
- Quill replaces the billing piece of QBO + the consolidation
  spreadsheet + the PDF generation. ~\$4,200/yr (\$350/mo blended) is
  ~45% of what they spend today on the surfaces Quill replaces.
- Sarah's time saved (20h/month × \$250/h billable rate) = \$5,000/mo
  opportunity cost. Quill at \$350/mo prices the labor savings at 14×
  ROI — well above the "no-brainer" threshold for ops tools in
  professional services (typical hurdle: 3×).
- Per-firm Render install costs us **\$13/mo** at the chosen tiers
  (web \$7 + Postgres \$6; see \`spec/01-tech-stack.md\` §10). Gross
  margin ~96% at \$350.

We do not run a SaaS tier in v1. Per-firm install means:
- No SaaS data-residency conversation (firms host their own).
- No noisy-neighbor concerns.
- Lower support burden (one bug fix doesn't trigger an org-wide
  incident).

## 8. Anti-goals

We are not building:

- **Multi-tenant SaaS at scale.** Per-firm install only in v1. Revisit
  if we hit 50 firms.
- **A mobile app or mobile-first web.** Accounting happens at desks.
- **Real-time anything.** Month-end batch is the workflow.
- **A client portal.** Anti-persona §4.3.
- **A free tier.** Firms expect to pay for billing tooling.
- **AI features.** No "summarize this engagement" button. We're a
  billing tool, not a chat product.

## 9. Assumptions & Constraints

Recorded so that a future reader can tell which decisions were
forced and which were chosen.

| # | Assumption / constraint | Type | If it breaks |
|---|---|---|---|
| A1 | One firm per install. \`firm_id\` still exists on every row so an export is clean and multi-firm stays a forward-compat option. | Assumption | Schema survives; deploy topology changes. |
| A2 | USD only. No multi-currency, no FX. | Assumption | \`*_cents\` integers need a currency column; v2 problem. |
| A3 | US-only tax posture. Sales-tax-on-services is per-state; Sprint 5 question, not v1. | Assumption | Invoice model needs a tax-line table. |
| A4 | Partners keep their existing time tracking. Quill ingests CSV; it never becomes a timer. | Assumption | Scope doubles. Say no. |
| C1 | Solo founder, ~25 build-hours/week. Every sprint is sized against that, not against a team. | Constraint | Roadmap slips one sprint per lost week. |
| C2 | 90 days from LOI (2026-05-08) to Sarah's firm invoicing from Quill. First real batch is the May close, Monday 2026-06-01. | Constraint | The 31 May PDF-in-inbox date is the binding milestone. |
| C3 | Render only. One provider, one dashboard, one bill. No second cloud in v1. | Constraint | Ops surface grows past the "no ops appetite" preference. |
| C4 | No PII beyond partner names/emails and client billing emails. No SSNs, no bank details, no card data in v1. | Constraint | Compliance scope changes; re-run /oc-security. |

## 10. Discovery answers

Four answers were pre-filled from the body of #1 and read back to Priya
for confirmation; five were asked in two rounds. Marked accordingly.

**Q1 — Firm size?** *(pre-filled from #1: "small accounting firms" → read back as "3-15-partner partnerships")* — "3-15 partner partnerships. The kind that hate QuickBooks but can't afford NetSuite." ✓ confirmed.

**Q2 — Time horizon to first paying firm?** *(asked, round 1)* — "90 days. Sarah's firm is the first; I have her LOI, signed the 8th."

**Q3 — Anti-goals?** *(pre-filled from #1: "not multi-tenant SaaS")* — "Right, and add one you didn't get from the ticket: not mobile-first. Per-firm install." ✓ confirmed with correction.

**Q4 — Pricing?** *(asked, round 1)* — "Per-firm install, \$200-500/mo. Sarah's firm signed at \$350/mo."

**Q5 — Why Python over JS / Go / Rust?** *(pre-filled from #1: "I know Python")* — "8 years of Python at a fintech. I will move 5× faster in Django than anywhere else." ✓ confirmed.

**Q6 — Why server-rendered over SPA?** *(asked, round 1)* — "Sarah won't tolerate SPA load times for batch ops. She's on a 5-year-old MacBook. Server-render is faster for the user and faster for me to build."

**Q7 — Admin panel?** *(pre-filled from #1: "I need an internal tool")* — "I need an internal tool fast for the design-partner phase. Django admin is the cheapest admin panel humanly possible." ✓ confirmed.

**Q8 — PDF generation requirements?** *(asked, round 2)* — "GAAP-friendly invoice template. Logo, line items, totals, tax, terms. Nothing fancy. No charts."

**Q9 — Email delivery?** *(asked, round 2)* — "Transactional. Resend is fine; Postmark is fine. Whatever is cheapest with good deliverability."

## 11. Open questions for /oc-spec

These resolve in the spec phase:

- **Tenancy model details.** Per-firm install confirmed; but the
  data model — do we still namespace by \`firm_id\` within the single
  install (for clean export)? *(Resolved in 02: yes.)*
- **Time-entry ingestion.** CSV upload is MVP. Toggl import is
  a candidate follow-up if a partner uses it. *(Parked as #13.)*
- **Tax handling.** US-only initially. Sales-tax-on-services is per-state
  and complicated. Sprint 5 question.
- **Multi-currency.** USD only v1. Defer to v2.
- **Audit log requirements.** Internal-only audit log v1; if a firm
  asks for SOC2-style audit, that's the wedge for a paid tier.

## 12. Key risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Partnership data model assumption (partners as first-class entities) is wrong for a meaningful subset of CPA firms | LOW | HIGH | Validate with 3 design-partner firms before Sprint 3; have a "partners-as-users" fallback documented |
| R2 | PDF rendering blocks a web worker during month-end (Sarah's firm generates ~50 invoices in one batch, and the batch is one button press) | MED | MED | Background-job the PDF generation; queue + worker (Sprint 4; \`render.yaml\` already has the stub) |
| R3 | Per-firm install is more ops than projected (dependency and security patches × N firms, Render plan changes × N dashboards) | MED | HIGH | Track ops time per firm; if > 1h/month at 3 firms, halt and consider SaaS pivot |
| R4 | A design-partner firm hits an edge case we didn't model (e.g. ex-partner buyouts mid-engagement) | HIGH | MED | Sprint 6 reserved as "fix-what-the-design-partners-flagged" |
| R5 | QuickBooks responds with a partnership-friendly tier | LOW | HIGH | Quill wins on price + per-firm install + partnership data model; even a QBO discount doesn't close all three |
| R6 | Render outage during a customer's month-end batch | MED | HIGH | Document a 60-min PDF-export emergency runbook; daily Postgres backups via Render's built-in dump |

## 13. Scope boundaries

| Scope | Contents |
|---|---|
| **v1** (by 2026-08-06) | Time entries + CSV import · draft invoices · PDF render · email send · Django admin · firm settings · partner list |
| **v1.x** (design-partner driven) | Month-end batch worker · fee write-offs · sales-tax lines · journal-entry export for QBO · Toggl OAuth import |
| **Never** | Client portal · mobile app · bookkeeping / GL · AI features · free tier · multi-tenant SaaS below 50 firms |

---

Summary read back and **confirmed by Priya at 09:41**, with one
amendment (§13 "never" list gained "multi-tenant SaaS below 50 firms").
Checkpoint \`.checkpoints/oc-app-architect.checkpoint.json\` advanced
\`phase: "discovery" → "spec"\`.
`,
    },
    {
      id: "stack",
      label: "/oc-spec oc-stack-forge output — Django/Postgres/Render decision",
      kind: "spec/01-tech-stack.md",
      body:
`# 01-tech-stack.md — Quill

**Produced by** oc-stack-forge (auto-invoked by oc-app-architect Phase 2) · **Method:** v1.3 "Platform Matrix" weighted scorecard · **Run-time:** 9 minutes · **Sources searched:** §13 · **ADR posted to** [#1](https://github.com/inv-org/quill/issues/1) (§12)

## 0. Stack Recommendation — Quill

| Layer | Choice | Rationale | Alternatives considered |
|---|---|---|---|
| Platform | **Render** | One \`render.yaml\` provisions DB + web + worker + cron. No ops appetite required. | Heroku, Fly.io, Railway, Vercel, VPS |
| Backend | **Django 5.2 (LTS)** | Priya's 8 years of Python; admin, auth, ORM, migrations are free. | Rails, Flask, FastAPI, Hono, Go/chi |
| Database | **Render Postgres 17 (\`basic-256mb\`)** | Provisioned by the Blueprint; \`DATABASE_URL\` injected; daily backups built in. | SQLite, Neon, Supabase, RDS |
| Auth | **\`django.contrib.auth\` + server sessions** | 7 users per install. Anything more is a liability, not a feature. | Auth0, Clerk, django-allauth |
| Frontend | **Django templates + HTMX (from Sprint 4)** | Server-rendered on a 5-year-old MacBook beats an SPA. HTMX buys partial updates without a build step. | React SPA, Alpine, htmx-from-day-1 |
| PDF | **WeasyPrint 64** | Pure Python, in-process, CSS-paged-media good enough for a GAAP invoice. | wkhtmltopdf, Playwright, Browserless |
| Email | **Resend via \`django-anymail[resend]\`** | Best DX of the modern transactional providers; free tier covers 3 firms. | Postmark, SES, Mailgun, SendGrid |
| Errors | **Sentry (\`sentry-sdk[django]\`)** | Solo founder needs the traceback to come to her, not the other way around. | Rollbar, bare logging |

**Estimated monthly cost**

| Tier | Monthly | What you get |
|---|---:|---|
| One firm (prod only) | **\$13** | Render web \`starter\` \$7 + Postgres \`basic-256mb\` \$6 |
| One firm (prod + staging) | **\$19** | + staging Postgres \`basic-256mb\` \$6 (staging web runs on \`free\`) |
| Three firms | **\$39** | 3 × prod; staging is shared across installs |
| Ten firms | **\$140** | 10 × prod + Resend paid tier \$10 |

Full band with revenue and margin: §10.

## 1. Decision criteria (defined before scoring)

Each candidate scores 1–10 per criterion. **Weights are declared up
front and the arithmetic is published** so the scorecard is checkable
rather than decorative:

\`\`\`
weighted = Σ (score_i × weight_i)        score_i ∈ 1..10
max      = 10 × Σ weight_i
\`\`\`

Platform/backend/database/host share this weight set:

| Criterion | Weight | Why |
|---|---:|---|
| Solo-dev ergonomics | 1.5 | Priya is alone; every hour of yak-shaving is an hour not spent on the wedge. |
| Ops appetite (managed-everything) | 1.5 | "No ops appetite" was the only hard preference in #1. |
| Time-to-first-deploy | 1.2 | 90-day window from signed LOI to live customer. |
| Ecosystem maturity (admin, billing, PDFs) | 1.0 | Built-in beats build-it-yourself for ops tools. *(backend only)* |
| Cost at 3 paying firms | 0.8 | Each firm gets its own install; cost scales linearly. |
| Lock-in / exit cost | 0.7 | Real but secondary; we will not refactor in year 1. |

Backend uses all six (Σ w = 6.7 → **max 67**). Database and host drop
"Ecosystem" (Σ w = 5.7 → **max 57**). PDF and email declare their own
weight sets in §5 and §6 — a scorecard that reuses weights for criteria
it never defined is how you get a number that means nothing.

## 2. Backend / framework scorecard  *(max 67)*

| Candidate | Solo-dev ×1.5 | Ops ×1.5 | TTFD ×1.2 | Ecosystem ×1.0 | Cost ×0.8 | Lock-in ×0.7 | **Weighted** |
|---|---:|---:|---:|---:|---:|---:|---:|
| **Django** | **10** | 9 | **9** | **10** | 9 | 8 | **62.1** |
| Rails | 9 | 9 | 8 | 9 | 9 | 8 | 58.4 |
| Flask | 8 | 7 | 6 | 6 | 9 | 9 | 49.2 |
| FastAPI | 8 | 7 | 6 | 5 | 9 | 9 | 48.2 |
| Hono / Node | 6 | 7 | 7 | 6 | 9 | 9 | 47.4 |
| Go / chi | 5 | 7 | 5 | 5 | 9 | 9 | 42.5 |

Worked example so the column is auditable:
\`Django = 10(1.5) + 9(1.5) + 9(1.2) + 10(1.0) + 9(0.8) + 8(0.7) = 15 + 13.5 + 10.8 + 10 + 7.2 + 5.6 = 62.1\`.

**Pick:** Django. Priya's Python depth + the admin panel + the
batteries-included ergonomics (auth, ORM, admin, sessions, migrations)
collapse three weeks of glue code into zero. Rails is 3.7 points behind
and would also work; Priya has zero Rails, and the learning curve
outweighs ecosystem parity. FastAPI is great for APIs but Quill is a
server-rendered admin tool; FastAPI would force a frontend choice we
don't want to make.

## 3. Database scorecard  *(max 57)*

| Candidate | Solo-dev ×1.5 | Ops ×1.5 | TTFD ×1.2 | Cost@3 ×0.8 | Lock-in ×0.7 | **Weighted** |
|---|---:|---:|---:|---:|---:|---:|
| **Render Postgres (\`basic-256mb\`)** | 9 | **10** | **10** | 8 | 7 | **51.8** |
| SQLite (file) | 9 | **10** | **10** | **10** | 4 | 51.3 |
| Neon | 8 | 9 | 9 | 9 | 6 | 47.7 |
| Supabase Postgres | 8 | 8 | 8 | 7 | 5 | 42.7 |
| External (RDS / Cloud SQL) | 4 | 5 | 4 | 5 | 8 | 27.9 |

**Pick:** Render Postgres — but read the numbers honestly. 51.8 vs 51.3
is **a statistical tie**; 0.5 points on a 57-point scale is noise, and
anyone who tells you a half-point scorecard margin decided this is
selling you a spreadsheet. The decision is made on two things the
scorecard compresses too aggressively:

1. **Concurrency.** gunicorn runs 3 workers in prod, and Sprint 4 adds
   a PDF worker process. SQLite's WAL mode is single-writer; Django's
   ORM does not model that well, and \`database is locked\` under a
   CSV import concurrent with a list view is a support ticket we'd
   own forever.
2. **Backups.** Render Postgres has daily backups with 7-day retention
   and a restore button. SQLite means writing and testing our own
   backup runbook — for a product whose entire value is a customer's
   billing history.

The cost delta is \$6/mo per firm. Neon lost on lock-in (its branching
API becomes load-bearing for migrations); Supabase brings four lock-in
vectors (auth, DB, realtime, storage) with no corresponding win,
because Django already supplies auth, storage and ORM.

## 4. Host / platform scorecard  *(max 57)*

| Candidate | Solo-dev ×1.5 | Ops ×1.5 | TTFD ×1.2 | Cost@3 ×0.8 | Lock-in ×0.7 | **Weighted** |
|---|---:|---:|---:|---:|---:|---:|
| **Render** | **10** | **10** | **10** | 8 | 7 | **53.3** |
| Heroku | 9 | 9 | 9 | 6 | 7 | 47.5 |
| Railway | 8 | 8 | 8 | 7 | 6 | 43.4 |
| Fly.io | 7 | 7 | 7 | 9 | 8 | 42.2 |
| Vercel (+ serverless Postgres) | 5 | 7 | 6 | 7 | 5 | 34.3 |
| Self-host (VPS + nginx + systemd) | 3 | 2 | 3 | **10** | 9 | 25.4 |

**Pick:** Render, by 5.8 points — the widest margin of any layer here.
The \`render.yaml\` Blueprint is the load-bearing ergonomic: one file,
one commit, Postgres + web service + cron + worker provisioned in
lockstep, and the same file reviewed in a PR like any other code.
Heroku's \`app.json\` is the same idea a decade older and costs more at
this size. Fly.io scored well on cost and lock-in but its Django story
needs more hand-holding (Dockerfile, \`fly.toml\`, release commands) than
"no ops appetite" tolerates.

## 5. PDF generation scorecard  *(own weights; max 52)*

Weights: Solo-dev ×1.5 · TTFD ×1.2 · Output quality ×1.0 · Cost ×0.8 · Lock-in ×0.7.

| Candidate | Solo-dev | TTFD | Quality | Cost | Lock-in | **Weighted** |
|---|---:|---:|---:|---:|---:|---:|
| **WeasyPrint** | **9** | **9** | 9 | **10** | **10** | **48.3** |
| wkhtmltopdf | 7 | 8 | 8 | **10** | 9 | 42.4 |
| Browserless (SaaS) | 8 | 8 | **9** | 5 | 4 | 37.4 |
| Playwright (headless Chrome) | 6 | 6 | **9** | 7 | 8 | 36.4 |

**Pick:** WeasyPrint. Pure-Python, in-process, no headless-browser
overhead, and CSS Paged Media support good enough for a GAAP invoice
template. wkhtmltopdf is the traditional answer and scores closest —
but its upstream repository was archived in 2023 and it is no longer
maintained, which is a poor foundation for a document a CPA firm sends
to its clients. Playwright's quality is equal and its cost is a
~400 MB Chromium download on every Render build.

## 6. Email transport scorecard  *(own weights; max 42)*

Weights: Deliverability ×1.5 · DX ×1.2 · Cost@3 firms ×0.8 · Lock-in ×0.7.
(No "solo-dev ergonomics" row — for an email API that is DX, and
double-counting it would quietly re-weight the whole card.)

| Candidate | Deliverability | DX | Cost@3 | Lock-in | **Weighted** |
|---|---:|---:|---:|---:|---:|
| **Resend** | 9 | **10** | **10** | 8 | **39.1** |
| Postmark | **10** | 9 | 7 | 8 | 37.0 |
| AWS SES | 9 | 5 | **10** | 7 | 32.4 |
| Mailgun | 8 | 7 | 8 | 7 | 31.7 |
| SendGrid | 8 | 6 | 7 | 6 | 29.0 |

**Pick:** Resend, 2.1 ahead of Postmark. Postmark is the better
deliverability story on paper and it is the documented fallback if
Quill's bounce rate ever exceeds 2%. We reach it through
\`django-anymail[resend]\` rather than Resend's own SDK, so the swap is
one settings module and one env var — which is exactly why the lock-in
column scores an 8 instead of a 5.

**Operational note carried into the integration work:** Resend refuses
to send from a domain it has not verified (\`403 validation_error\`).
\`quill.priyabuilds.com\` needs DKIM + SPF TXT records in place *before*
the first production send. This is a human step, not an agent step.

## 7. Layers that did not need a scorecard

| Layer | Choice | Why no scorecard |
|---|---|---|
| Auth | \`django.contrib.auth\`, DB-backed sessions, \`AUTH_USER_MODEL\` left as the default \`auth.User\` | Seven users per install, all employees of the firm. A hosted identity provider would add a bill, an outage dependency and an OAuth callback surface to protect, in exchange for nothing. |
| Frontend | Django templates, no build step, HTMX added at Sprint 4 for the invoice-list partial refresh | Discovery Q6 settled it: server-rendered, 5-year-old MacBook, batch workflow. Adding a JS toolchain now would mean a bundler, a lockfile and a second CI job before Sarah has seen a single invoice. |
| CSS | Hand-written, ~300 lines, shipped through WhiteNoise | Tailwind's build step buys nothing on 9 screens. Revisit if the screen count triples. |
| Background jobs | Deferred to Sprint 4 (\`django-rq\` + Render Key Value) | v1's batch is ~50 invoices. Measure before you queue. |

## 8. Anti-picks (rejected, with reason recorded)

- **Rails / Heroku.** Would have worked; 58.4 and 47.5 respectively.
  Priya has zero Rails. The cognitive switching cost vs. continuing in
  Python is the deciding factor.
- **Cloudflare Workers + D1.** opchain's home stack. Server-rendered
  Django doesn't fit the edge model; D1 is also less mature for the
  joins Quill needs (engagements × time-entries × invoice-lines).
- **Go / Fly.io.** Overkill. Quill is CRUD + generated PDF. Go's
  strengths (low memory, high concurrency) don't apply at this scale;
  Python's velocity does.
- **Rust / Axum / Shuttle.rs.** Priya doesn't know Rust. Adoption
  cost dwarfs the technical wins.
- **Supabase.** Four lock-in vectors with no corresponding win.
- **Vercel.** Optimised for Next.js + serverless. Quill is a stateful
  Django app; Vercel would force an awkward serverless-Django dance.
- **Firebase.** Cost nonlinearity past the free tier; the Firestore
  data model is wrong for partnership-aware relational data.
- **Self-host (VPS).** Ops time per firm balloons; security-patch
  cadence becomes Priya's bottleneck. Render absorbs all of that.
- **Resend's first-party Python SDK.** Rejected in favour of
  \`django-anymail[resend]\` — same transport, but Django's
  \`EMAIL_BACKEND\` contract means \`send_mail()\` in tests uses the
  locmem backend for free and the provider swap stays a one-liner.

## 9. Versions pinned (lockfile snapshot, 2026-05-09)

| Package | Version | Pin rationale |
|---|---|---|
| Python | 3.12.10 | Pinned in \`.python-version\`. **Render's default for new services is 3.14** — without the pin, the build would move under us. |
| Django | 5.2.x | **LTS.** Extended support to 2028-04. (5.1 reached end-of-life 2025-12; 4.2 LTS ends 2026-04 — neither is the right pin in May 2026.) |
| psycopg | 3.2.x (\`[binary]\`) | Modern Postgres driver; \`binary\` saves a C-compile step on every Render build. |
| dj-database-url | 2.3.x | Parses Render's \`DATABASE_URL\` into Django settings. |
| gunicorn | 22.0.x | Battle-tested; Render's recommended WSGI server. |
| whitenoise | 6.7.x | Static files without an S3 bucket or a CDN bill. |
| WeasyPrint | 64.x | Pure-Python PDF rendering (§5). |
| django-anymail\\[resend\\] | 13.x | Email backend (§6). Replaces a direct Resend SDK dependency. |
| sentry-sdk\\[django\\] | 2.x | Error reporting; justifies the \`SENTRY_DSN\` env var in \`render.yaml\`. |
| python-json-logger | 2.0.x | Structured stdout logs Render's log drain can parse. |
| Postgres | 17 | Render's current default major version. |
| **dev-only** | | |
| pytest / pytest-django / pytest-cov | 8.x / 4.x / 5.x | Test runner + Django integration + coverage gate. |
| ruff | 0.7.x | Lint + format, one tool. |
| mypy + django-stubs | 1.13.x + 5.1.x | Type gate. django-stubs is what makes \`mypy\` on a Django codebase non-fictional. |
| bandit | 1.7.x | Security lint in the audit gate. |

**Python version detection.** Render reads \`.python-version\` (or the
\`PYTHON_VERSION\` env var). It does **not** read \`runtime.txt\` — that is
a Heroku convention and Render ignores it silently, which is the worst
possible failure mode for a version pin. The scaffold therefore writes
\`.python-version\` and no \`runtime.txt\`.

## 10. Cost band

| Firms | Render web | Render Postgres | Resend | Total / mo | Revenue / mo | Gross margin |
|---:|---:|---:|---:|---:|---:|---:|
| 1 (Sarah's firm) | \$7 | \$6 | \$0 (free tier) | **\$13** | \$350 | 96% |
| 3 | \$21 | \$18 | \$0 | \$39 | \$1,050 | 96% |
| 10 | \$70 | \$60 | \$10 | \$140 | \$3,500 | 96% |
| 25 | \$425 (mix of \`starter\` + \`standard\`) | \$425 | \$50 | \$900 | \$8,750 | 90% |

Staging is one extra \`basic-256mb\` Postgres (\$6) and a \`free\` web
service (\$0), shared across every firm install — \$19/mo total while
Quill has one customer.

At 25 firms, ops time per firm becomes the binding constraint, not
infrastructure cost. Re-evaluation trigger §11 fires.

## 11. Re-evaluation triggers (when this decision should be revisited)

| Trigger | Reconsider |
|---|---|
| > 25 paying firms | Per-firm Render install starts to dominate ops time. Consider single-instance SaaS architecture with strict tenant isolation. |
| Any firm asks for SOC2 attestation | Render is SOC2 Type 2; that's mostly fine. Re-examine the audit-log + access-control story to support attestation. |
| A firm requires EU data residency | Render's Frankfurt region works; revisit the deploy pipeline to support region-per-firm. |
| Real-time requirement appears (e.g. live partner dashboard) | Django Channels + Render WebSockets is doable but adds complexity; revisit. |
| PDF generation p99 > 10s | WeasyPrint hitting its scaling ceiling. Move to the Sprint-4 worker (\`render.yaml\` already has the stub). |
| Bounce rate > 2% for 7 days | Swap Resend → Postmark. One settings module, one env var (§6). |
| Priya hires a 2nd engineer | Reconsider Rails for the larger hire pool, or stay on Django and document the codebase more aggressively. |

## 12. ADR comment posted to #1

Pre-write check first — \`issue_read(owner=inv-org, repo=quill, issue_number=1)\`
returns the body plus all comments inline; scanned for the marker,
none present, safe to write.

\`\`\`
mcp__mcp-server-github__add_issue_comment(
  owner=inv-org, repo=quill, issue_number=1, body=...)

<!-- opchain:oc-stack-forge:stack-decision:ADR-1 -->
**Stack decision (ADR-1): Django 5.2 + Render Postgres 17 + Render**

Context — solo founder, 8y Python, no ops appetite, server-rendered
admin tool, 90 days to a signed customer (#1).

Decision — Django 5.2 LTS on Render \`starter\`, Render Postgres 17
\`basic-256mb\`, WeasyPrint for PDF, Resend via django-anymail,
django.contrib.auth sessions, Django templates (+HTMX at Sprint 4).

Scores — backend Django 62.1 / Rails 58.4 (max 67) · database
Render PG 51.8 / SQLite 51.3 (max 57; a tie — decided on concurrency
and backups, not on score) · host Render 53.3 / Heroku 47.5 (max 57).

Consequences — \$13/mo per firm, 96% gross margin at \$350.
Locked to one provider's Blueprint format; exit cost is a Dockerfile.
Re-evaluate at 25 firms, at any SOC2 request, or if PDF p99 > 10s.

Full scorecards + weights: spec/01-tech-stack.md
\`\`\`

## 13. Sources searched

The scorecard is not allowed to run on training data alone; version
and pricing claims came from these searches, run before scoring.

| Query | Run at | What it changed |
|---|---|---|
| \`Django 5.2 LTS production readiness 2026\` | 2026-05-09 09:52Z | Moved the pin from 5.1 → 5.2. 5.1 is EOL since 2025-12; 5.2 is the LTS with support to 2028-04. |
| \`Render python version detection .python-version runtime.txt\` | 2026-05-09 09:57Z | Dropped \`runtime.txt\` from the scaffold; Render ignores it and would have defaulted to 3.14. |
| \`Render blueprint preDeployCommand plan requirements\` | 2026-05-09 09:59Z | Pre-deploy commands are paid-plan only. Staging (on \`free\`) must run \`migrate\` from the build command instead. |
| \`Render vs Fly.io Django 2026\` | 2026-05-09 10:01Z | Confirmed the host scorecard's Fly.io row: cheaper, but Dockerfile + \`fly.toml\` + release commands to own. |
| \`WeasyPrint vs wkhtmltopdf maintenance status 2026\` | 2026-05-09 10:04Z | wkhtmltopdf upstream archived in 2023 — dropped it from contention despite the 42.4 score. |

---

Checkpoint \`.checkpoints/oc-stack-forge.checkpoint.json\`, \`skill_state.decisions\`:

\`\`\`json
{
  "stack_path": "django-render",
  "backend": { "choice": "django", "version": "5.2.x", "score": 62.1, "runner_up": "rails", "runner_up_score": 58.4 },
  "database": { "choice": "render-postgres", "plan": "basic-256mb", "score": 51.8, "runner_up": "sqlite", "runner_up_score": 51.3, "tie_broken_on": ["concurrency", "backups"] },
  "host": { "choice": "render", "score": 53.3 },
  "pdf": { "choice": "weasyprint", "score": 48.3 },
  "email": { "choice": "resend", "via": "django-anymail", "score": 39.1 },
  "adr": { "id": "ADR-1", "posted_to": "inv-org/quill#1", "marker": "opchain:oc-stack-forge:stack-decision:ADR-1" },
  "cost_per_firm_usd_month": 13
}
\`\`\`
`,
    },
    {
      id: "render-yaml",
      label: "render.yaml — Blueprint for Postgres + web service",
      kind: "render.yaml",
      body:
`# render.yaml — Quill Blueprint
# Produced by oc-app-architect /oc-scaffold per scaffold-guide.md § Django/Render.
# Amended 2026-05-17 by oc-deploy-ops after oc-security-auditor raised
#   [SEC-01] staging and production shared one database.
#
# Python version comes from .python-version (3.12), NOT runtime.txt —
#   Render ignores runtime.txt and would default a new service to 3.14.
# Render reads this file on Blueprint sync and provisions everything below.
# Production is promoted deliberately (autoDeployTrigger: off); staging
#   follows main.

databases:
  # Production. One per firm install.
  - name: quill-db
    plan: basic-256mb        # \$6/mo; daily backups, 7-day retention
    region: oregon
    postgresMajorVersion: "17"

  # Staging gets its OWN database. This is not optional: staging runs
  # unreleased migrations, and pointing it at quill-db means a bad
  # migration destroys a customer's billing history. [SEC-01]
  - name: quill-staging-db
    plan: basic-256mb        # \$6/mo
    region: oregon
    postgresMajorVersion: "17"

services:
  # ──────────────────────────────────────────────────────────
  # Production web service
  # ──────────────────────────────────────────────────────────
  - type: web
    name: quill
    runtime: python
    plan: starter            # \$7/mo — 512 MB RAM, 0.5 CPU, no sleep
    region: oregon
    rootDir: .
    buildCommand: |
      pip install -r requirements.txt
      python manage.py collectstatic --noinput
    startCommand: gunicorn core.wsgi:application --workers 3 --timeout 30
    # Pre-deploy runs after the build and before traffic swaps. Paid
    # plans only — which is why staging does it differently, below.
    preDeployCommand: python manage.py migrate --noinput
    healthCheckPath: /health
    # Production is promoted by hand: render deploys create quill
    # --commit <sha>, run after staging has been eyeballed. A merge to main
    # must not ship to a customer.
    autoDeployTrigger: off
    branch: main
    domains:
      - quill.priyabuilds.com
    envVars:
      - key: DJANGO_SETTINGS_MODULE
        value: core.settings.prod
      - key: DATABASE_URL
        fromDatabase:
          name: quill-db
          property: connectionString
      - key: SECRET_KEY
        generateValue: true              # Render generates and sets it
      - key: ALLOWED_HOSTS
        value: quill.onrender.com,quill.priyabuilds.com
      - key: CSRF_TRUSTED_ORIGINS
        value: https://quill.onrender.com,https://quill.priyabuilds.com
      - key: RESEND_API_KEY
        sync: false                      # paste in the dashboard; Blueprint sync blocks until you do
      - key: SENTRY_DSN
        sync: false                      # paste in the dashboard
      # RENDER_GIT_COMMIT is injected by Render on every deploy — do NOT
      # declare it here. Declaring it with sync:false makes the dashboard
      # ask a human to hand-type a value Render already knows.
      # core/views.py reads it straight from os.environ for /health.

  # ──────────────────────────────────────────────────────────
  # Staging web service — follows main, free plan
  # ──────────────────────────────────────────────────────────
  - type: web
    name: quill-staging
    runtime: python
    plan: free               # \$0 — 512 MB RAM, sleeps after 15 min idle
    region: oregon
    rootDir: .
    # NO preDeployCommand here: Render only offers pre-deploy on paid
    # web services, and a Blueprint that declares one on a free service
    # is rejected at sync time. Migrations run at the end of the build
    # instead. Trade-off accepted knowingly: a failed staging migration
    # fails the build rather than the deploy, and the previous staging
    # instance keeps serving. Production keeps the real pre-deploy hook.
    buildCommand: |
      pip install -r requirements.txt
      python manage.py collectstatic --noinput
      python manage.py migrate --noinput
    startCommand: gunicorn core.wsgi:application --workers 1
    healthCheckPath: /health
    autoDeployTrigger: commit
    branch: main
    envVars:
      - key: DJANGO_SETTINGS_MODULE
        value: core.settings.prod
      - key: DATABASE_URL
        fromDatabase:
          name: quill-staging-db         # [SEC-01] never quill-db
          property: connectionString
      - key: SECRET_KEY
        sync: false                      # paste in the dashboard
      - key: ALLOWED_HOSTS
        value: quill-staging.onrender.com
      - key: CSRF_TRUSTED_ORIGINS
        value: https://quill-staging.onrender.com
      - key: RESEND_API_KEY
        sync: false

# ──────────────────────────────────────────────────────────
# Sprint 4+ scaffolding (commented; uncomment when needed)
# ──────────────────────────────────────────────────────────
#
#  # PDF rendering worker (Sprint 4: month-end batch).
#  # Run PDF generation off the web request path so a 50-invoice batch
#  # doesn't hold a gunicorn worker for 30s.
#  - type: worker
#    name: quill-pdf-worker
#    runtime: python
#    plan: starter
#    region: oregon
#    buildCommand: pip install -r requirements.txt
#    startCommand: python manage.py rqworker pdf
#    # Persistent disk for staging PDFs while debugging template issues.
#    # Production never holds PDFs to disk — it emails and discards.
#    disk:
#      name: pdf-tmp
#      mountPath: /var/tmp/quill-pdfs
#      sizeGB: 1
#    envVars:
#      - key: DJANGO_SETTINGS_MODULE
#        value: core.settings.prod
#      - key: DATABASE_URL
#        fromDatabase:
#          name: quill-db
#          property: connectionString
#      - key: REDIS_URL
#        fromService:
#          type: keyvalue          # 'redis' is the deprecated alias
#          name: quill-keyvalue
#          property: connectionString
#
#  # Queue backing store for the PDF worker (Sprint 4).
#  - type: keyvalue
#    name: quill-keyvalue
#    plan: starter
#    region: oregon
#    ipAllowList: []
#    maxmemoryPolicy: allkeys-lru
#
#  # Monthly invoicing cron — triggers the batch generation on the 1st (Sprint 5).
#  # We do NOT generate invoices automatically in v1; this is the Sprint-5 hook
#  # for firms that want a fully-automated month-end run.
#  - type: cron
#    name: quill-monthly-invoicing
#    runtime: python
#    plan: starter
#    region: oregon
#    schedule: "0 9 1 * *"   # 09:00 UTC on the 1st of every month
#    buildCommand: pip install -r requirements.txt
#    startCommand: python manage.py monthly_invoicing_batch
#    envVars:
#      - key: DJANGO_SETTINGS_MODULE
#        value: core.settings.prod
#      - key: DATABASE_URL
#        fromDatabase:
#          name: quill-db
#          property: connectionString
`,
    },
    {
      id: "pm-yaml-gh",
      label: "\`.opchain/pm.yaml\` — GitHub Issues config",
      kind: "config.yaml",
      body:
`# .opchain/pm.yaml — Quill (provider: github-issues)
#
# Written by oc-app-architect \`/oc-discover --ticket inv-org/quill#1\` on
# the first PM-aware run, because --ticket implies a PM provider and there
# was no config to read. Validated by \`npm run validate-pm-mcp\`.
#
# validated: 2026-05-09  npm run validate-pm-mcp → 0 errors, 1 warn
#            (extended state 'resolved-pending-postmortem' declared but unused)
#
# The v1.3 protocol applies to GH Issues identically to Linear / Jira;
# only the tool names + state mappings change. Markers, retry,
# idempotency and the deferred-action queue all work the same.

provider: github-issues
team_or_project: inv-org/quill        # owner/repo

issue_types:
  feature:  "type:feature"            # GH labels discriminate issue type
  bug:      "type:bug"
  chore:    "type:chore"
  deploy:   "type:deploy"
  incident: "type:incident"
  release:  "type:release"

states:
  in_progress: "status:in-progress"   # GH issues are open/closed; states map to labels
  in_review:   "status:in-review"
  done:        closed                 # the literal closed state, not a label
  extended:
    blocked:                       "status:blocked"
    staging-verified:              "status:staging-verified"
    shipped:                       "status:shipped"
    rolled-back:                   "status:rolled-back"
    resolved-pending-postmortem:   "status:pending-pm"

labels_default: [opchain, agent-driven]

# Map domain → on-call user. Solo founder for now; maintained
# for forward-compat when Priya hires.
remediation_owners:
  backend:  priya
  frontend: priya
  data:     priya
  infra:    priya

# /oc-roadmap creates one child issue per sprint under the parent ticket.
create_child_tickets: true

pr_template: ".github/pull_request_template.md"

# No overrides: public github.com resolves through the default registry.
tool_overrides: {}

# v1.3 tool registry resolves these protocol verbs to concrete MCP tools:
#   get_issue        → mcp__mcp-server-github__issue_read      (comments inline)
#   list_issues      → mcp__mcp-server-github__list_issues
#   search_issues    → mcp__mcp-server-github__search_issues   (marker pre-create checks)
#   add_comment      → mcp__mcp-server-github__add_issue_comment
#   create_issue     → mcp__mcp-server-github__issue_write (action=create)
#   transition_state → mcp__mcp-server-github__issue_write (labels_add / labels_remove)
#   close_issue      → mcp__mcp-server-github__issue_write (state=closed)
#
# Note: GitHub has no list_issue_comments verb in the registry — issue_read
# returns comments inline, and that is the pre-write idempotency check.
# Marker searches across issues use search_issues with a query string;
# list_issues has no body-text filter.
`,
    },
    {
      id: "scaffold",
      label: "/oc-scaffold output — Django project layout + selected file contents",
      kind: "tree",
      body:
`# Files written by /oc-scaffold (per scaffold-guide.md § Django/Render)

**Produced by** oc-app-architect /oc-scaffold (Phase 3) · **Method:** scaffold-guide.md § Django recipe · **Files written:** 41 (23 source · 4 test · 14 config) · **Run-time:** 11 minutes

Counts exclude the 9 empty \`__init__.py\` package markers (50 files on
disk, 41 with content). Committed as \`a0f19c3\` against [#3](https://github.com/inv-org/quill/issues/3).

## 1. Layout

\`\`\`
quill/
├── manage.py
├── .python-version                 # 3.12.10 — Render reads THIS, not runtime.txt
├── .editorconfig
├── .env.example                    # DATABASE_URL / SECRET_KEY / RESEND_API_KEY / SENTRY_DSN
├── .gitignore                      # .venv, staticfiles/, *.pyc, .env, .coverage
├── requirements.txt                # runtime pins — see §2.7
├── requirements-dev.txt            # test + lint pins — see §2.7
├── pyproject.toml                  # [tool.ruff], [tool.mypy], [tool.django-stubs]
├── pytest.ini                      # see §2.6
├── render.yaml                     # see artifact 'render.yaml'
├── README.md                       # run it locally / run the tests / deploy it
├── .opchain/
│   └── pm.yaml                     # see artifact '.opchain/pm.yaml'
├── .github/
│   ├── pull_request_template.md    # referenced from pm.yaml
│   ├── dependabot.yml              # weekly pip updates — mitigation for risk R3
│   └── workflows/
│       └── ci.yml                  # ruff → mypy → pytest → check --deploy  (§2.8)
├── scripts/
│   └── seed_dev.py                 # Sarah's firm: 7 partners, 4 engagements (§2.5)
├── core/
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py                 # shared settings                      (§2.1)
│   │   ├── dev.py                  # DEBUG=True, local Postgres           (§2.3)
│   │   └── prod.py                 # DEBUG=False, Render DATABASE_URL     (§2.2)
│   ├── urls.py
│   ├── wsgi.py
│   ├── asgi.py
│   ├── views.py                    # /health — returns SHA + DB ping      (§2.4)
│   └── tests/
│       ├── __init__.py
│       └── test_health.py          # 3 tests
├── apps/
│   ├── __init__.py
│   ├── firms/                      # the partnership tenant
│   │   ├── __init__.py
│   │   ├── apps.py
│   │   ├── models.py               # Firm, Partner, Engagement            (§2.9)
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── admin.py                # full Django-admin registration
│   │   ├── migrations/
│   │   │   ├── __init__.py
│   │   │   └── 0001_initial.py
│   │   └── tests/
│   │       ├── __init__.py
│   │       └── test_models.py      # 9 tests
│   ├── billables/                  # time entries, retainers, fixed fees (Sprint 1)
│   │   ├── __init__.py
│   │   ├── apps.py
│   │   ├── models.py               # BillingPeriod only; TimeEntry is Sprint 1
│   │   ├── admin.py
│   │   └── tests/
│   │       ├── __init__.py
│   │       └── test_models.py      # 2 tests
│   ├── invoices/                   # generation, PDF render, email (Sprints 2-3)
│   │   ├── __init__.py
│   │   ├── apps.py
│   │   ├── models.py               # Invoice shell; InvoiceLine is Sprint 2
│   │   ├── admin.py
│   │   └── tests/
│   │       ├── __init__.py
│   │       └── test_models.py      # 4 tests
│   └── accounts/                   # login/logout/reset views + forms only — no models
│       ├── __init__.py
│       └── apps.py
└── templates/
    └── base.html
\`\`\`

**Why \`apps/accounts/\` and not \`apps/auth/\`.** A Django app's label
defaults to the last component of its dotted path, so \`apps.auth\` would
register the label \`auth\` — which \`django.contrib.auth\` already owns.
Django refuses to start:
\`ImproperlyConfigured: Application labels aren't unique, duplicates: auth\`.
You can override it with \`AppConfig.label\`, but the cheapest fix is to
not name an app after a contrib app. Caught on the first
\`manage.py migrate\` of this scaffold; see the transcript.

Scaffold respects the **"Minimal but complete" rule** from scaffold-guide:
no placeholder \`TODO\` files. Every file has real, runnable code;
\`runserver\` boots; \`pytest\` passes (18 tests on the scaffold itself:
3 health + 9 firms + 2 billables + 4 invoices).

## 2. Selected file contents

### 2.1 \`core/settings/base.py\`

\`\`\`python
"""Quill — shared Django settings.

Loaded by both \`dev\` and \`prod\`. Anything environment-specific lives in
the per-env module, not here. Never edit this file with a setting that
depends on a secret or an env var; route those through dev.py / prod.py.
"""
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Apps —————————————————————————————————————————————————————————————
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Quill apps. 'accounts', not 'auth' — an app's default label is the
    # last path component, and 'auth' collides with django.contrib.auth.
    "apps.accounts",
    "apps.firms",
    "apps.billables",
    "apps.invoices",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"
WSGI_APPLICATION = "core.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# Seven employees of one firm. The default user model is correct here;
# everything firm-shaped hangs off apps.firms.Partner instead.
AUTH_USER_MODEL = "auth.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# STATICFILES_STORAGE was removed in Django 5.1. On 5.2 it is ignored
# silently — WhiteNoise's manifest storage would simply never activate
# and you would find out in production, from a 404 on a hashed asset.
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
\`\`\`

### 2.2 \`core/settings/prod.py\`

\`\`\`python
"""Quill — production Django settings.

Reads everything sensitive from the environment. Render injects
DATABASE_URL via the Blueprint; we never hard-code it. SECRET_KEY is
generated by Render on first deploy (generateValue: true).
"""
import os

import dj_database_url
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

from .base import *  # noqa: F401, F403

DEBUG = False
SECRET_KEY = os.environ["SECRET_KEY"]
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "").split(",")
CSRF_TRUSTED_ORIGINS = os.environ.get("CSRF_TRUSTED_ORIGINS", "").split(",")

DATABASES = {
    "default": dj_database_url.parse(
        os.environ["DATABASE_URL"],
        conn_max_age=600,
        ssl_require=True,
    ),
}

# Security headers ————————————————————————————————————————————————
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 365 * 2   # 2y; preload after a soak
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
X_FRAME_OPTIONS = "DENY"
SECURE_REFERRER_POLICY = "same-origin"

# Email ——————————————————————————————————————————————————————————
EMAIL_BACKEND = "anymail.backends.resend.EmailBackend"
ANYMAIL = {"RESEND_API_KEY": os.environ["RESEND_API_KEY"]}
DEFAULT_FROM_EMAIL = "Quill <noreply@quill.priyabuilds.com>"

# Errors —————————————————————————————————————————————————————————
# The env var exists because this block exists. If you delete one,
# delete the other and the render.yaml entry with it.
if os.environ.get("SENTRY_DSN"):
    sentry_sdk.init(
        dsn=os.environ["SENTRY_DSN"],
        integrations=[DjangoIntegration()],
        traces_sample_rate=0.1,
        send_default_pii=False,      # billing data; never ship request bodies
        release=os.environ.get("RENDER_GIT_COMMIT", "dev"),
    )

# Logging ————————————————————————————————————————————————————————
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            "format": "%(asctime)s %(levelname)s %(name)s %(message)s",
        },
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "json"},
    },
    "root": {"handlers": ["console"], "level": "INFO"},
}
\`\`\`

### 2.3 \`core/settings/dev.py\`

\`\`\`python
"""Quill — local development settings.

Postgres locally, not SQLite. The tenant-isolation tests assert that a
CheckConstraint rejects bad rows *at the database*, and the CSV
benchmark counts real roundtrips — neither statement means anything
against a different engine than production runs. \`docker compose up db\`
or a local brew install; the URL below is what scripts/seed_dev.py and
CI both expect.
"""
import dj_database_url

from .base import *  # noqa: F401, F403

DEBUG = True
SECRET_KEY = "dev-only-not-a-secret"  # noqa: S105
ALLOWED_HOSTS = ["127.0.0.1", "localhost"]

DATABASES = {
    "default": dj_database_url.config(
        default="postgres://quill:quill@localhost:5432/quill_dev",
    ),
}

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
\`\`\`

CI runs the same settings module against the \`postgres:17\` service
container in \`ci.yml\`, so the \`integration\` pytest marker means
"needs the database up", not "needs a different database".

### 2.4 \`core/views.py\` (healthcheck)

\`\`\`python
"""Quill — the single non-app view we ship: /health.

Render uses this for the Blueprint healthCheckPath. Returns the deployed
SHA + a Postgres ping. Anything else is owned by the apps.
"""
import os
import time

from django.db import connection
from django.http import JsonResponse


def health(_request):
    started = time.perf_counter()
    db_ok = True
    db_err = None
    try:
        with connection.cursor() as cur:
            cur.execute("SELECT 1")
            cur.fetchone()
    except Exception as exc:  # pragma: no cover — only logged
        db_ok = False
        db_err = str(exc)[:128]
    elapsed_ms = int((time.perf_counter() - started) * 1000)
    payload = {
        "ok": db_ok,
        "service": "quill",
        # Injected by Render on every deploy. Not declared in render.yaml
        # — declaring it there would ask a human to type it in.
        "sha": os.environ.get("RENDER_GIT_COMMIT", "dev"),
        "db_ping_ms": elapsed_ms,
    }
    if db_err:
        payload["db_error"] = db_err
    return JsonResponse(payload, status=200 if db_ok else 503)
\`\`\`

### 2.5 \`scripts/seed_dev.py\`

\`\`\`python
"""Seed a development database with Sarah's firm.

This is the same fixture the production onboarding loads
(\`manage.py loaddata sarah-cpa.json\`), so "works on my machine" and
"works for the first customer" are the same claim.

    python manage.py shell < scripts/seed_dev.py
"""
FIRM = {"slug": "sarah-cpa-partners", "display_name": "Sarah CPA Partners"}
PARTNERS = 7      # Sarah + 6
ENGAGEMENTS = 4   # 2 retainer, 1 hourly, 1 fixed-fee — the April pilot set
\`\`\`

### 2.6 \`pytest.ini\`

\`\`\`ini
[pytest]
DJANGO_SETTINGS_MODULE = core.settings.dev
python_files = test_*.py
addopts = -ra --strict-markers --tb=short
markers =
    slow: long-running; excluded from the default run (\`-m "not slow"\`)
    integration: needs the Postgres service up
\`\`\`

### 2.7 \`requirements.txt\` + \`requirements-dev.txt\` (pinned)

\`\`\`
# requirements.txt — what runs in production
Django==5.2.1
psycopg[binary]==3.2.3
dj-database-url==2.3.0
gunicorn==22.0.0
whitenoise==6.7.0
WeasyPrint==64.0
django-anymail[resend]==13.0
sentry-sdk[django]==2.19.2
python-json-logger==2.0.7
\`\`\`

\`\`\`
# requirements-dev.txt — never installed on Render
-r requirements.txt
pytest==8.3.3
pytest-django==4.9.0
pytest-cov==5.0.0
ruff==0.7.4
mypy==1.13.0
django-stubs[compatible-mypy]==5.1.1
bandit==1.7.10
\`\`\`

Split deliberately: Render's \`buildCommand\` installs \`requirements.txt\`
only, so a linter never ships to a customer's web service — and the
audit gate can't claim "mypy PASS" against a dependency the project
doesn't actually declare.

### 2.8 \`.github/workflows/ci.yml\` (abbreviated)

\`\`\`yaml
jobs:
  check:
    runs-on: ubuntu-latest
    services:
      db:
        image: postgres:17
        env: { POSTGRES_USER: quill, POSTGRES_PASSWORD: quill, POSTGRES_DB: quill_dev }
        options: >-
          --health-cmd pg_isready --health-interval 10s --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version-file: .python-version }
      - run: pip install -r requirements-dev.txt
      - run: ruff check .
      - run: mypy .
      - run: pytest -q --cov=apps --cov=core --cov-report=term-missing
      - run: DJANGO_SETTINGS_MODULE=core.settings.prod python manage.py check --deploy
        env:
          SECRET_KEY: ci-only
          DATABASE_URL: postgres://quill:quill@localhost:5432/quill_dev
          ALLOWED_HOSTS: example.com
          RESEND_API_KEY: re_ci_placeholder
\`\`\`

### 2.9 \`apps/firms/models.py\`

\`\`\`python
"""Quill — firm / partner / engagement domain.

The 'firm' is the tenant boundary. A Quill install is single-firm in v1
(per-firm Render deployment), but the firm model is namespaced
explicitly anyway so we can export clean data and so multi-firm-install
remains a forward-compat option without a schema migration.
"""
from django.conf import settings
from django.db import models


class Firm(models.Model):
    """A CPA partnership running on this Quill install."""
    slug = models.SlugField(max_length=64, unique=True)
    legal_name = models.CharField(max_length=200)
    display_name = models.CharField(max_length=120)
    tax_id = models.CharField(max_length=20, blank=True)  # US EIN
    address = models.TextField()
    invoice_terms_default = models.CharField(max_length=80, default="Net 30")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["slug"])]

    def __str__(self) -> str:
        return self.display_name


class Partner(models.Model):
    """A named partner of the firm. First-class entity in the data model.

    Each partner has their own billable hours, their own client portfolio,
    and their own profit share. The 'user' relationship is auth-only;
    the Partner is the business entity.
    """
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="partners")
    # SET_NULL, not PROTECT (spec/02 amendment, 2026-05-09): partners leave,
    # and the firm still needs to delete the login without the ORM refusing
    # because a historical Partner row points at it.
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="partner",
        null=True,
        blank=True,
    )
    display_name = models.CharField(max_length=120)
    email = models.EmailField(unique=True)
    title = models.CharField(max_length=80, default="Partner")
    billing_rate_cents = models.PositiveIntegerField(default=25000)  # \$250/hr default
    profit_share_bp = models.PositiveSmallIntegerField(
        default=1000,
        help_text="basis points (1/100 of a percent). 1000 = 10%.",
    )
    is_active = models.BooleanField(default=True)
    joined_at = models.DateField()
    departed_at = models.DateField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["firm", "display_name"], name="unique_partner_per_firm",
            ),
            # 'condition=', not the pre-5.1 'check=' — 'check' is deprecated
            # and raises RemovedInDjango60Warning on every test run.
            models.CheckConstraint(
                condition=models.Q(profit_share_bp__lte=10000),
                name="profit_share_within_100_percent",
            ),
        ]
        indexes = [models.Index(fields=["firm", "is_active"])]

    def __str__(self) -> str:
        return f"{self.display_name} ({self.firm.display_name})"


class Engagement(models.Model):
    """A client engagement. Could be retainer, hourly, or fixed-fee."""
    KIND_CHOICES = [
        ("retainer", "Retainer"),
        ("hourly", "Hourly"),
        ("fixed", "Fixed fee"),
    ]
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="engagements")
    client_name = models.CharField(max_length=200)
    # Deliberately NOT unique (spec/02 amendment, 2026-05-09): a client's
    # AP inbox is routinely shared across several engagements.
    client_billing_email = models.EmailField()
    lead_partner = models.ForeignKey(
        Partner, on_delete=models.PROTECT, related_name="led_engagements",
    )
    kind = models.CharField(max_length=16, choices=KIND_CHOICES)
    retainer_amount_cents = models.PositiveIntegerField(null=True, blank=True)
    fixed_fee_cents = models.PositiveIntegerField(null=True, blank=True)
    started_on = models.DateField()
    ended_on = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(ended_on__isnull=True)
                | models.Q(ended_on__gte=models.F("started_on")),
                name="engagement_ends_after_it_starts",
            ),
        ]
        indexes = [
            models.Index(fields=["firm", "kind"]),
            models.Index(fields=["lead_partner", "started_on"]),
        ]

    def __str__(self) -> str:
        return f"{self.client_name} ({self.kind})"
\`\`\`

## 3. Why this layout

Three deliberate choices the scaffold-guide encodes:

- **\`apps/<domain>/\` over Django's default \`<domain>/\` at the root.**
  Keeps the project root un-crowded; lets you grep for "everything app-related"
  with \`find apps/\`. Django's documentation defaults are fine for tutorials
  but get noisy at >3 apps.
- **\`core/settings/{base,dev,prod}.py\`.** Never a single \`settings.py\`.
  dev/prod divergence is a fact; the split makes it reviewable.
  \`DJANGO_SETTINGS_MODULE\` picks the active one.
- **\`pytest\` over \`manage.py test\`.** Better fixtures, better parametrisation,
  better discovery. \`pytest-django\` handles the Django integration.

## 4. Verification

\`\`\`
$ python -m venv .venv && source .venv/bin/activate
$ pip install -r requirements-dev.txt
$ python manage.py migrate
Operations to perform:
  Apply all migrations: admin, auth, billables, contenttypes, firms, invoices, sessions
Running migrations:
  Applying contenttypes.0001_initial... OK
  ... 19 more ...
  Applying sessions.0001_initial... OK
$ python manage.py runserver
[2026-05-09 09:14:01] Starting development server at http://127.0.0.1:8000/
\`\`\`

\`\`\`
$ pytest -q
.................. [100%]
18 passed in 1.42s
\`\`\`

\`\`\`
$ ruff check . && mypy .
All checks passed!
Success: no issues found in 31 source files
\`\`\`

\`\`\`
$ DJANGO_SETTINGS_MODULE=core.settings.prod SECRET_KEY=local \\
    DATABASE_URL=postgres://quill:quill@localhost:5432/quill_dev \\
    ALLOWED_HOSTS=example.com RESEND_API_KEY=re_placeholder \\
    python manage.py check --deploy
System check identified no issues (0 silenced).
\`\`\`

\`\`\`
$ curl -fsS http://127.0.0.1:8000/health | jq .
{
  "ok": true,
  "service": "quill",
  "sha": "dev",
  "db_ping_ms": 4
}
\`\`\`

Checkpoint: \`.checkpoints/oc-app-architect.checkpoint.json\` (Phase 3).
`,
    },
    {
      id: "sprint-plan",
      label: "/oc-roadmap output — six sprints + PM child tickets",
      kind: "sprints/sprint-plan.md",
      body:
`# sprint-plan.md — Quill

**Produced by** oc-app-architect /oc-roadmap (Phase 5) · **Parent ticket:** [#1](https://github.com/inv-org/quill/issues/1) · **Child tickets:** #5–#10 (\`create_child_tickets: true\`) · **Revision:** 2 (sprints 3 and 4 swapped on Priya's instruction, 2026-05-10 11:26Z)

Sizing budget from \`spec/00\` C1: **~25 build-hours/week**, one person.
CLAUDE hours are agent-run work; USER hours are Priya's — review,
decisions, design-partner calls, and anything that needs a credit card
or a DNS record.

## Sprint 1 — Time-entry foundations  · #5 · 2026-05-11 → 05-15

**Features.** \`TimeEntry\` model; CSV bulk import; \`/billables/list/\`
with partner filter + pagination; Django admin registration.

**Deliverables.** \`apps/billables/{models,admin,views,forms,urls,csv_import}.py\`,
\`templates/billables/{list,import}.html\`, migrations \`0002\`–\`0003\`.

**Test requirements (14, contracted before any code is written).**
Tenant isolation · hours CheckConstraint · rate override · 10-row CSV →
10 rows · 10-row CSV with 2 malformed → 8 created + 2 errors ·
cross-firm engagement → error, not silent skip · \`?partner=\` filter ·
filter survives page 2 · UTF-8 BOM + CRLF export parses · zero hours
rejected · unknown engagement rejected · RFC-4180 quoting ·
re-import of the same file creates 0 rows · 10,000-row import peak
memory < 32 MB.

**Definition of done.** Evaluator ≥ 8.0/10 · new-code coverage ≥ 80%
(\`.opchain/qa.yaml\`) · PR merged · linked issue closed by oc-git-ops.

**Dependencies.** \`apps.firms\` (shipped, #4).

**Effort.** CLAUDE 9h · USER 2h.

## Sprint 2 — Draft invoices  · #6 · 2026-05-18 → 05-20

**Features.** \`Invoice\` + \`InvoiceLine\`; "generate draft from unbilled
entries" for retainer / hourly / fixed-fee engagements; draft review
screen; per-invoice totals, tax placeholder, terms.

**Deliverables.** \`apps/invoices/{models,services,views,admin}.py\`,
migrations \`0002_invoiceline\`, \`templates/invoices/{list,detail}.html\`.

**Test requirements (22).** One draft per engagement per period ·
retainer invoice ignores hours · hourly invoice sums
\`hours × rate_override or partner.billing_rate_cents\` · fixed-fee
milestone · entries already attached to a line are not re-billed ·
regenerating a draft is idempotent · totals in cents, never floats.

**Definition of done.** Evaluator ≥ 8.0 · Sarah reviews one real draft
against her April spreadsheet and the totals match to the cent.

**Dependencies.** Sprint 1.

**Effort.** CLAUDE 11h · USER 3h (the spreadsheet reconciliation).

## Sprint 3 — PDF render + email delivery  · #7 · 2026-05-21 → 05-22 (compressed for the 31 May milestone)

*(Was Sprint 4 in revision 1. Promoted on Priya's instruction: the LOI
milestone is a PDF in a client's inbox by 31 May.)*

**Features.** WeasyPrint invoice template (logo, line items, totals,
tax line, terms); \`/invoices/<id>/preview/\` serving the PDF inline;
send-to-client via Resend; \`sent_at\` + delivery status on the invoice.

**Deliverables.** \`apps/invoices/pdf.py\`, \`templates/invoices/pdf.html\`,
\`apps/invoices/email.py\`, migrations \`0003_invoice_pdf_fields\`,
\`0004_invoice_sent_at\`.

**Test requirements (20).** PDF renders without a network fetch ·
all money fields present · a 40-line invoice does not overflow the page
footer · email uses \`DEFAULT_FROM_EMAIL\` · locmem backend in tests ·
send is idempotent per invoice · a 4xx from Resend marks the invoice
\`send_failed\`, never \`sent\`.

**Definition of done.** Evaluator ≥ 8.0 · one real PDF emailed to Sarah
and confirmed received · **sending domain verified in Resend** (DKIM +
SPF TXT records — Priya's task, not the agent's).

**Dependencies.** Sprint 2. Blocks the 31 May LOI milestone.

**Effort.** CLAUDE 12h · USER 2h (DNS records, one design-partner call).

## Sprint 4 — Month-end batch worker  · #8 · 2026-05-25 → 05-29

*(Was Sprint 3 in revision 1.)*

**Features.** Uncomment the \`render.yaml\` worker + Key Value stubs;
\`django-rq\` queue; "generate all drafts" and "send all" as background
jobs with a progress page; retry on transient Resend failures.

**Test requirements (10).** 50-invoice batch completes · a failed
invoice does not abort the batch · job is resumable · no gunicorn
worker held longer than 2s by a batch request.

**Definition of done.** Sarah runs the May close (2026-06-01) end to
end without a support call. Directly mitigates risk R2.

**Dependencies.** Sprint 3. **Effort.** CLAUDE 10h · USER 1h.

## Sprint 5 — Fee write-offs + sales tax  · #9 · 2026-06-01 → 06-05

**Features.** Partner-approved write-offs with an audit trail;
per-state sales-tax-on-services line; journal-entry CSV export for QBO.

**Test requirements (11).** Write-off requires an approver ≠ the
lead partner · write-off is reversible · tax line rounds half-up at the
invoice level, not per line · journal export balances to zero.

**Definition of done.** Two design partners confirm the export imports
cleanly into QBO. **Dependencies.** Sprint 2. **Effort.** CLAUDE 9h · USER 4h.

## Sprint 6 — Design-partner fixes  · #10 · 2026-06-08 → 06-12

Deliberately unscoped. Reserved for whatever the three design-partner
firms flag in their first real close — the mitigation for risk R4
(\`spec/00\` §12). If nothing lands here, the sprint becomes hardening.

**Effort.** CLAUDE 8h · USER 4h (calls).

## PM trace

Pre-write check on the parent before anything is posted:
\`issue_read(owner=inv-org, repo=quill, issue_number=1)\` → 6 comments
inline, no \`sprint-contract\` markers present → safe to write.

| Sprint | Marker | Comment id | Child issue | Revision 2 |
|---|---|---:|---|---|
| 1 · Time-entry foundations | \`opchain:oc-app-architect:sprint-contract:sprint-1\` | 2148815503 | **#5** | idempotent skip — body unchanged |
| 2 · Draft invoices | \`…:sprint-contract:sprint-2\` | 2148815561 | **#6** | idempotent skip — body unchanged |
| 3 · PDF render + email | \`…:sprint-contract:sprint-3\` | 2148815604 | **#7** | **rewritten** (was "Month-end batch worker") |
| 4 · Month-end batch worker | \`…:sprint-contract:sprint-4\` | 2148815638 | **#8** | **rewritten** (was "PDF render + email") |
| 5 · Write-offs + sales tax | \`…:sprint-contract:sprint-5\` | 2148815677 | **#9** | idempotent skip — body unchanged |
| 6 · Design-partner fixes | \`…:sprint-contract:sprint-6\` | 2148815712 | **#10** | idempotent skip — body unchanged |

\`\`\`
[oc-app-architect] /oc-roadmap --revise (sprints 3,4 swapped)
  marker sprint-1 → present, body identical → SKIP
  marker sprint-2 → present, body identical → SKIP
  marker sprint-3 → present, body differs   → update_comment(2148815604)
  marker sprint-4 → present, body differs   → update_comment(2148815638)
  marker sprint-5 → present, body identical → SKIP
  marker sprint-6 → present, body identical → SKIP
  issue_write(issue_number=7, title="Sprint 3: PDF render + email delivery")
  issue_write(issue_number=8, title="Sprint 4: month-end batch worker")
  → 2 writes, 4 idempotent skips, 0 duplicate comments
\`\`\`

Recorded in \`.checkpoints/oc-app-architect.checkpoint.json\`:

\`\`\`json
{
  "pm_idempotent_skips": [
    "sprint-contract:sprint-1", "sprint-contract:sprint-2",
    "sprint-contract:sprint-5", "sprint-contract:sprint-6"
  ],
  "pm_deferred_actions": []
}
\`\`\`

Total planned: **CLAUDE 59h · USER 16h** across six sprints, 2026-05-11
→ 06-12 — about 4.5 weeks of wall-clock. Against C1's 25h/week that
is roughly 60% utilisation, which is the slack the things nobody
planned will consume. The LOI window closes 2026-08-06.
`,
    },
    {
      id: "sprint1-eval",
      label: "Sprint 1 — Evaluator round 1 FAIL, round 2 PASS",
      kind: "sprints/sprint-1/eval-round-1.md",
      body:
`# Sprint 1 — Evaluator report

**Produced by** oc-app-architect Generator/Evaluator loop (Phase 6) · **Ticket:** [#5](https://github.com/inv-org/quill/issues/5) · **Branch:** \`feat/quill-5-time-entry-foundations\` · **Gate:** 8.0/10 · **Coverage budget:** 80% new-code (\`.opchain/qa.yaml\`, written by oc-qa-ops \`/oc-qa pyramid\`)

---

## Round 1 — 2026-05-14 16:22Z — **FAIL (5.5/10)**

Generator output: **+612 / −4**, 12 files, 12 test functions.

### Code scores

| Dimension | Score | Evidence |
|---|---:|---|
| Functionality | **4/10** | \`POST /billables/import/\` returns 500 on the actual file Sarah exports. See B-001. |
| Feature completeness | **6/10** | \`?partner=\` is dropped by the pagination links; page 2 of a filtered list shows the whole firm. 11 of 14 contracted criteria covered. |
| Code quality | **5/10** | Capped at 5 — the contract said 14 test criteria and 11 are covered. One test asserts the opposite of its criterion (see G-13). |
| Visual / UX | **7/10** | Django admin plus one template; nothing wrong, nothing to praise. Import result page shows errors with row numbers, which is the part that matters. |
| **Overall** | **5.5/10** | unweighted mean · gate 8.0 · **FAIL** |

### Test results

\`\`\`
$ pytest -q
....................................F.
=================================== FAILURES ===================================
______________________ test_csv_import_streams _________________________________
apps/billables/tests/test_csv_import.py:198: in test_csv_import_streams
    assert peak_mb < 32, f"peak {peak_mb:.1f} MB"
E   AssertionError: peak 61.4 MB
E   assert 61.4 < 32
------------------------------ captured log --------------------------------
tracemalloc peak 64,381,952 bytes over 10,000 rows
=========================== short test summary info ============================
FAILED apps/billables/tests/test_csv_import.py::test_csv_import_streams
38 passed, 1 failed, 0 skipped in 9.84s
\`\`\`

Coverage: new-code **71%** — under the 80% budget. \`csv_import.py\` lines
34–48 (the header-normalising branch) are never reached by a test,
which is exactly where B-001 lives.

### Bugs found

**[B-001] CRITICAL — UTF-8 BOM + CRLF from Excel-on-Mac breaks the import**

\`\`\`
File "apps/billables/csv_import.py", line 38, in _build_entry_from_row
    worked_on = _parse_date(row["Date"])
                            ~~~^^^^^^^^
KeyError: '\\ufeffDate'
\`\`\`

Repro — Sarah's own April export, attached to #5:

\`\`\`
$ head -c 32 toggl-2026-04.csv | xxd | head -2
00000000: efbb bf44 6174 652c 5061 7274 6e65 722c  ...Date,Partner,
00000010: 456e 6761 6765 6d65 6e74 2c48 6f75 7273  Engagement,Hours

$ curl -sS -X POST -F 'file=@toggl-2026-04.csv' … /billables/import/ -o /dev/null -w '%{http_code}\\n'
500
\`\`\`

\`csv_import.py:31\` does \`csv_text = raw.decode("utf-8")\`, which keeps
the BOM as the first character of the first header. \`csv.DictReader\`
then produces the key \`'\\ufeffDate'\` and every row raises. Fix:
\`decode("utf-8-sig")\` and normalise header whitespace. This is not an
edge case — it is the primary path for the only customer we have.

**[B-002] HIGH — the cross-tenant test passes vacuously**

\`apps/billables/admin.py:29\`

\`\`\`python
def get_queryset(self, request):
    return super().get_queryset(request)   # no firm filter at all
\`\`\`

\`test_admin_cross_tenant_forbidden\` is green because the fixture
creates exactly one firm, so "rows from firm B" is an empty set either
way. Add a second firm to the fixture and the test fails. A test that
cannot fail is worse than no test: it is a claim of safety with nothing
behind it.

**[B-003] MEDIUM — the "streaming" importer is not streaming**

\`apps/billables/csv_import.py:52\` materialises \`rows = list(reader)\`
before the loop, so a 10,000-row file is fully resident. tracemalloc
peak 61.4 MB against a 32 MB budget. Iterate the reader directly and
\`bulk_create\` in batches of 500.

### Gaps vs contract

| # | Contracted criterion | Status |
|---|---|---|
| C-01 | Tenant isolation on the model manager | PASS |
| C-02 | \`hours\` CheckConstraint rejects 0 and 25 | PASS |
| C-03 | \`rate_override_cents\` beats \`partner.billing_rate_cents\` | PASS |
| C-04 | 10-row CSV → 10 rows | PASS |
| C-05 | 2 malformed rows → 8 created + 2 errors | PASS |
| C-06 | Cross-firm engagement → error, not silent skip | **FAIL** (B-002 — test is vacuous) |
| C-07 | \`?partner=\` filters the list | PASS |
| C-08 | Filter survives page 2 | **MISSING** — no test written |
| C-09 | UTF-8 BOM + CRLF export parses | **MISSING** — no test written; B-001 |
| C-10 | Zero hours rejected | PASS |
| C-11 | Unknown engagement rejected | PASS |
| C-12 | RFC-4180 quoting round-trips | PASS |
| C-13 | Re-import of the same file creates 0 rows | **MISSING** — \`test_csv_import_idempotency\` asserts that a re-import creates *duplicates* and calls that intentional. That is the opposite of the criterion. |
| C-14 | 10,000-row import peak < 32 MB | **FAIL** (B-003 — 61.4 MB) |

**Verdict: FAIL.** Three actionable items, in order: decode with
\`utf-8-sig\`; filter the admin queryset by firm and add a second firm to
the fixture; stop materialising the reader. C-13 needs a product
decision from Priya before it can be written as a test — a dedupe key
has to come from somewhere, and the source CSV does not provide one.

---

## Round 2 — 2026-05-15 11:40Z — **PASS (8.1/10)**

Changes: **+188 / −63**, 7 files.

| Fix | Where |
|---|---|
| \`raw.decode("utf-8-sig")\` + header \`.strip()\` normalisation | \`apps/billables/csv_import.py:29-34\` |
| \`import_fingerprint\` = \`sha1(partner_id\\|engagement_id\\|worked_on\\|hours\\|description)\`, unique per firm | \`apps/billables/models.py:71\`, migration \`0003_timeentry_import_fingerprint\` |
| Admin queryset filtered by \`request.user.partner.firm\`; fixture gained a second firm | \`apps/billables/admin.py:29\`, \`tests/conftest.py:22\` |
| Reader iterated lazily; \`bulk_create(batch_size=500)\` | \`apps/billables/csv_import.py:52-78\` |
| \`test_csv_import_idempotency\` → \`test_csv_import_dedupes_reimport\` | \`tests/test_csv_import.py:151\` |
| \`test_csv_import_streams\` marked \`@pytest.mark.slow\`, measured with \`tracemalloc\` | \`tests/test_csv_import.py:186\` |

| Dimension | Round 1 | Round 2 |
|---|---:|---:|
| Functionality | 4 | **9** |
| Feature completeness | 6 | **8** |
| Code quality | 5 | **8.5** |
| Visual / UX | 7 | **7** |
| **Overall** | 5.5 | **8.1** |

\`\`\`
$ pytest -q -m "not slow"
........................................ [100%]
40 passed, 1 deselected in 2.31s

$ pytest -q -m slow
. [100%]
1 passed in 6.4s
\`\`\`

41 tests total (18 scaffold + 9 firms domain + 14 new). Contract
coverage **14 of 14**. New-code coverage **84%** against the 80% budget
in \`.opchain/qa.yaml\`.

The dedupe decision Priya made: a re-import of the same file now
creates 0 rows and reports the count as \`skipped\`, keyed on a
fingerprint of the five fields that identify an entry. It is not a
source-provided id, so a genuinely duplicated entry (same partner, same
engagement, same day, same hours, same description) is also skipped —
called out in the import result page and in the PR body, because that
is a real trade-off and not a detail to bury.

Posted to #5: \`<!-- opchain:oc-app-architect:sprint-result:sprint-1 -->\`
— score 8.1/10 over 2 rounds, 41 tests, coverage 84%. The \`closed\`
transition is **not** applied here; oc-git-ops owns it and applies it
when it observes the merge.
`,
    },
    {
      id: "first-pr",
      label: "PR #11 — Sprint 1, linked back to inv-org/quill#5",
      kind: "github.pr",
      body:
`# PR #11 — [#5] feat(billables): time-entry CRUD + bulk import

> Auto-generated by opchain oc-git-ops v1.3 from GitHub Issue
> [#5](https://github.com/inv-org/quill/issues/5).
> Branch: \`feat/quill-5-time-entry-foundations\` · Base: \`main\` · Head: \`bb1f0e2\`

\`https://github.com/inv-org/quill/pull/11\`

**Linked issue:** [#5 — Sprint 1: time-entry foundations](https://github.com/inv-org/quill/issues/5)
**Reviewers:** (solo founder — self-review + design-partner Sarah for UX)
**Labels:** \`opchain\`, \`agent-driven\`, \`area:billables\`, \`size:M\`

## Summary

Adds the \`TimeEntry\` model + bulk-import CSV view + the
\`/billables/list/\` admin page. Bulk-import respects the firm-tenant
boundary; a partner of firm A cannot import time entries for firm B
(enforced by a firm filter on the admin queryset *and* in form clean —
round 1 shipped only the form check and the test that was supposed to
catch that passed vacuously; see Testing). Re-importing the same file
now creates zero rows. Closes #5.

## Why

Time entries are the atomic input to invoice generation. Sprint 1's
job is to get them into Quill cleanly. The bulk-import path is the
"Sarah's first 10 minutes" path — she'll dump a month of her firm's
hours export and we need to ingest it without making her edit Django
admin forms one-by-one.

(Sprint 2 turns these into draft invoices; Sprint 3 renders + emails.
This PR is one step in a three-sprint arc.)

## How

### Files changed

| File | Lines | Purpose |
|---|---:|---|
| \`apps/billables/models.py\` | +92 / −4 | \`TimeEntry\` with a tenant-scoped manager and the \`import_fingerprint\` dedupe key. Removes the \`BillingPeriod\` placeholder. |
| \`apps/billables/admin.py\` | +54 | Django admin, queryset filtered by \`request.user.partner.firm\`, bulk-import action. |
| \`apps/billables/views.py\` | +88 | \`/billables/list/\` (paginated, filter-preserving) + \`/billables/import/\` (CSV upload). |
| \`apps/billables/forms.py\` | +43 | \`TimeEntryForm\` + \`TimeEntryCSVImportForm\` with row-level validation. |
| \`apps/billables/urls.py\` | +18 | Routes for list / import. |
| \`apps/billables/csv_import.py\` | +86 | Lazy CSV reader, \`utf-8-sig\` decode, per-row error collection, \`bulk_create\` in batches of 500. |
| \`apps/billables/migrations/0002_timeentry.py\` | +34 | The model. |
| \`apps/billables/migrations/0003_timeentry_import_fingerprint.py\` | +28 | Dedupe column + per-firm unique constraint (round 2). |
| \`apps/billables/tests/test_models.py\` | +98 | 3 model + 3 admin/manager tests. |
| \`apps/billables/tests/test_csv_import.py\` | +139 | 6 CSV-import + 2 list-view tests. |
| \`templates/billables/list.html\` | +52 | List view (server-rendered, server-paginated, query-string preserving). |
| \`templates/billables/import.html\` | +40 | Upload form + result summary with per-row errors. |
| \`requirements-dev.txt\` | +1 | \`freezegun\` — the \`worked_on\` boundary tests need a frozen clock. |

**Total: 13 files changed, +773 / −4, 14 new tests (3 model · 3 admin · 2 view · 6 CSV).**

### TimeEntry model excerpt

\`\`\`python
class TimeEntry(models.Model):
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="time_entries")
    partner = models.ForeignKey(Partner, on_delete=models.PROTECT, related_name="time_entries")
    engagement = models.ForeignKey(Engagement, on_delete=models.PROTECT, related_name="time_entries")
    worked_on = models.DateField()
    hours = models.DecimalField(max_digits=6, decimal_places=2)
    description = models.TextField(blank=True)
    billable = models.BooleanField(default=True)
    rate_override_cents = models.PositiveIntegerField(null=True, blank=True)
    invoice_line = models.ForeignKey(
        "invoices.InvoiceLine", on_delete=models.SET_NULL, null=True, blank=True,
    )
    imported_from = models.CharField(max_length=64, blank=True)  # e.g. "toggl-csv"
    # sha1 of partner|engagement|worked_on|hours|description. Not a
    # source-provided id — the CSV has none — so a genuinely duplicated
    # entry is indistinguishable from a re-import. Called out in the UI.
    import_fingerprint = models.CharField(max_length=40, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["firm", "worked_on"]),
            models.Index(fields=["partner", "worked_on"]),
            models.Index(fields=["engagement", "worked_on"]),
        ]
        constraints = [
            # 'condition=', not 'check=' — 'check' is deprecated and emits
            # RemovedInDjango60Warning on 5.2.
            models.CheckConstraint(condition=models.Q(hours__gt=0), name="hours_positive"),
            models.CheckConstraint(condition=models.Q(hours__lte=24), name="hours_under_24"),
            models.UniqueConstraint(
                fields=["firm", "import_fingerprint"], name="unique_entry_per_firm",
            ),
        ]
\`\`\`

### CSV bulk-import path

\`\`\`python
# apps/billables/csv_import.py (abbreviated)
def import_time_entries_csv(*, firm: Firm, partner: Partner, raw: bytes) -> ImportResult:
    """Lazily parse an hours-export CSV; create TimeEntry rows; collect per-row errors.

    utf-8-sig, not utf-8: Excel on macOS writes a BOM, and DictReader
    turns that into a header key of '\\ufeffDate'. Round 1 shipped plain
    utf-8 and 500'd on the only file our only customer actually has.
    """
    reader = csv.DictReader(io.StringIO(raw.decode("utf-8-sig", errors="strict")))
    reader.fieldnames = [(f or "").strip() for f in (reader.fieldnames or [])]

    pending, skipped, errors = [], [], []
    for idx, row in enumerate(reader, start=2):  # account for header row
        try:
            entry = _build_entry_from_row(firm=firm, partner=partner, row=row)
            entry.full_clean()
            if _fingerprint_exists(firm, entry.import_fingerprint):
                skipped.append(idx)
                continue
            pending.append(entry)
        except (ValidationError, KeyError) as exc:
            errors.append({"row": idx, "raw": row, "error": str(exc)})
        except Exception:
            logger.exception("unexpected error importing time-entry row %s", idx)
            errors.append({"row": idx, "raw": row, "error": "internal error; see logs"})

    created = TimeEntry.objects.bulk_create(pending, batch_size=500)
    return ImportResult(created=[e.pk for e in created], skipped=skipped, errors=errors)
\`\`\`

## Testing

**Evaluated by oc-app-architect evaluator: 8.1/10 (sprint 1, 2 rounds).**
Round 1 failed at 5.5/10 — UTF-8 BOM 500, a vacuous cross-tenant test,
and a "streaming" importer that peaked at 61.4 MB. Full report in the
\`sprint1-eval\` artifact.

All 14 new tests pass:

- [x] **test_model_tenant_isolation** — a TimeEntry for firm A is invisible from firm B's manager.
- [x] **test_model_hours_constraint** — hours=0 and hours=25 are rejected by the DB CheckConstraint (\`IntegrityError\`, not a form error).
- [x] **test_model_rate_override** — \`rate_override_cents\` takes precedence over \`partner.billing_rate_cents\`.
- [x] **test_admin_bulk_import_happy** — 10-row CSV creates 10 TimeEntries.
- [x] **test_admin_bulk_import_partial_failure** — 10-row CSV with 2 malformed rows: 8 created, 2 in the errors list, transaction not aborted.
- [x] **test_admin_cross_tenant_forbidden** — fixture has two firms; a partner of firm A importing via firm B's admin URL gets 403 and creates nothing. *(Round 1's version had one firm in the fixture and could not fail.)*
- [x] **test_view_list_filters_by_partner** — \`?partner=\` query param scopes correctly.
- [x] **test_view_list_keeps_partner_filter_on_page_2** — pagination links carry the query string; page 2 of a filtered list stays filtered.
- [x] **test_csv_import_utf8_bom** — a UTF-8-with-BOM, CRLF file (byte-identical to Sarah's April export) imports 247 rows.
- [x] **test_csv_import_rejects_zero_hours** — row with hours=0 lands in errors, not created.
- [x] **test_csv_import_rejects_unknown_engagement** — row referencing an engagement not in firm A's set lands in errors.
- [x] **test_csv_import_handles_quoting** — RFC-4180-style quoted descriptions with embedded commas round-trip correctly.
- [x] **test_csv_import_dedupes_reimport** — second import of the same file creates 0 rows and reports 247 skipped.
- [x] **test_csv_import_streams** \`@pytest.mark.slow\` — 10,000-row import, \`tracemalloc\` peak 24.6 MB (budget 32 MB).

\`\`\`
$ pytest -q apps/billables/ -m "not slow"
............... [100%]
15 passed in 1.07s

$ pytest -q -m slow
. [100%]
1 passed in 6.4s
\`\`\`

Whole suite: **41 total (18 scaffold + 9 firms domain + 14 new)**,
new-code coverage 84% against the 80% budget in \`.opchain/qa.yaml\`.

## Performance

Bulk-import benchmark, run against the CI \`postgres:17\` service
container (not SQLite — see \`core/settings/dev.py\`). 10,000-row export,
representative of Sarah's firm's first onboarding dump:

| Metric | Value |
|---|---:|
| Wall-clock to last row | 6.1s |
| tracemalloc peak | 24.6 MB |
| DB roundtrips | 10,022 — one engagement lookup per row, 20 \`bulk_create\` batches, 2 setup |
| Estimated worst-case (25,000 rows) | ~15s |

The 10,000 per-row engagement lookups are the remaining cost; preloading
the engagement and partner maps once per import would cut roundtrips to
22. Not needed for a 247-row monthly file. Tracked as **#12**.

## Sample transaction

\`\`\`
$ curl -sS -X POST -F 'file=@toggl-2026-04.csv' \\
    -H 'Cookie: sessionid=…' -H 'Accept: application/json' \\
    https://quill-staging.onrender.com/billables/import/
{
  "created": 247,
  "skipped": 0,
  "errors": [
    {"row": 14, "error": "hours_positive: hours must be > 0"},
    {"row": 89, "error": "Engagement 'Acme Co' not in firm 'sarah-cpa-partners'"}
  ]
}
\`\`\`

Second POST of the identical file:

\`\`\`
{"created": 0, "skipped": 247, "errors": []}
\`\`\`

## Documentation

Generated by \`Skill(oc-docs-forge, "/oc-docs pr")\`; oc-repo-ops fails
the pre-PR gate closed if this section is absent.

- **\`README.md\` § "Importing time entries"** (new, 34 lines) — the
  expected column headers, what happens to malformed rows, and an
  explicit note that Excel-on-Mac exports (UTF-8 BOM, CRLF) are
  supported, because that is the file our first customer has.
- **\`CHANGELOG.md\` → Unreleased → Added** — "Time-entry model, CSV bulk
  import with per-row error reporting, and a paginated
  \`/billables/list/\` view. Re-importing a file is a no-op."
- **\`docs/import-format.md\`** (new) — the five fields that make up the
  dedupe fingerprint and what that means for genuinely repeated entries.
- No ADR: this PR implements a decision already recorded as ADR-1.

## Rollout

- **Feature flag:** none. New surface, no existing behaviour to gate.
- **Migrations:** \`0002_timeentry\`, \`0003_timeentry_import_fingerprint\`.
  \`0003\` adds a column with a per-firm unique constraint; the table is
  empty on every existing install, so no backfill and no lock risk.
- **Onboarding:** Sarah will see the new \`/billables/import/\` link in
  the admin nav after this deploys to staging.

## Reviewer guide (or future-Priya guide)

1. Start at \`apps/billables/models.py\` — the tenant-scoped manager
   is the load-bearing isolation primitive, and \`import_fingerprint\`
   is the one field whose semantics are a judgement call.
2. Then \`apps/billables/csv_import.py\` — the lazy-read pattern that
   we'll reuse for Toggl / Harvest imports.
3. Then \`tests/test_csv_import.py\` — covers the partial-failure
   semantics (created list + errors list, never a transaction abort).
4. Skip \`templates/billables/list.html\` — plain Django templates,
   no surprises beyond the query-string-preserving paginator include.

## Audit status

\`\`\`
Pre-PR gate: oc-docs-forge packet ✓ · oc-repo-ops verdict PASS
oc-bug-check     PASS with warnings ⚠️   (18.6s)
ruff             0 issues
mypy             0 errors in 44 source files (django-stubs 5.1.1)
pytest           41 passed  (40 fast + 1 slow lane)
bandit           0 findings
pip-audit        0 known vulnerabilities in 17 packages
anti-pattern     0
secrets          0
⚠️  1 TODO left in apps/billables/csv_import.py:71 (tracked as #12)
\`\`\`

## Comment posted back to issue #5

\`\`\`
<!-- opchain:oc-git-ops:pr-opened:#11 -->
PR opened: https://github.com/inv-org/quill/pull/11
Branch: feat/quill-5-time-entry-foundations
Tests: 14 new, 41 total pass · evaluator 8.1/10 over 2 rounds
Pre-PR gate: docs-forge ✓ · repo-ops PASS
Audit gate: PASS with warnings (1 TODO → #12)
\`\`\`

(Same shape as the Linear scenarios — the v1.3 protocol abstracts the
provider; only the tool names change.)

## Merge

**Merged 2026-05-16 15:31Z (rebase, fast-forward).** The two branch
commits replayed onto \`main\`; head \`bb1f0e2\` became \`4c7d21a\`, which is
why the deploy range and the \`/health\` SHA report \`4c7d21a\` and not the
PR head. oc-git-ops then:

1. Posted \`<!-- opchain:oc-git-ops:pr-merged:#11 -->\` on #5.
2. Removed label \`status:in-review\` from #5.
3. Closed #5 (the GitHub-Issues equivalent of Linear's \`Done\` per \`pm.yaml\`).
4. Suggested \`/oc-deploy staging\` — it does **not** deploy on merge;
   \`autoDeployTrigger\` is \`commit\` for staging and \`off\` for production.

## Out of scope (linked tickets cover)

- The "Generate invoice" button on the list view — owned by **#6** (Sprint 2).
- PDF render + email delivery — owned by **#7** (Sprint 3).
- Preloading engagement/partner maps once per import — **#12**.
- Toggl OAuth integration (vs. CSV upload) — parked as **#13**.

---

Refs: #5

Generated with opchain oc-git-ops v1.3.
`,
    },
    {
      id: "first-deploy",
      label: "First deploy via Render Blueprint — staging, then prod",
      kind: "deploy.log",
      body:
`# /oc-deploy — Quill's first Render deploys

**Produced by** oc-deploy-ops · **Provider:** Render (auto-detected from \`render.yaml\`) · **Staging:** \`<initial>..4c7d21a\` 2026-05-17 · **Production:** \`9e2b7f1\` 2026-05-22

## 1. Audit gate

\`\`\`
[oc-deploy-ops] Provider detected: Render (render.yaml present at repo root)
[oc-deploy-ops] Audit gate — two auditors, both mandatory before a first prod deploy:

  oc-code-auditor /oc-audit pre-deploy
    Auditor: Grade A-. Counts: {CRITICAL 0, HIGH 0, MEDIUM 2, LOW 3, ADVISORY 1}
      MEDIUM  apps/billables/views.py:61   import view has no upload size cap
      MEDIUM  apps/billables/csv_import.py:71  TODO left in tree (tracked #12)
      LOW ×3  missing docstrings on three admin methods
      ADVISORY  consider a rate limit on /billables/import/ before multi-firm

  oc-security-auditor /oc-security pre-deploy
    PASS — with 1 HIGH that blocks the deploy until fixed:
      [SEC-01] HIGH  render.yaml:487,524 — 'quill' and 'quill-staging'
               both resolve DATABASE_URL fromDatabase: quill-db.
               Staging runs unreleased migrations. A bad migration on
               staging destroys the production billing history.
               Django check --deploy is clean; this is not a code
               finding, it is a topology finding, which is exactly the
               class oc-code-auditor does not look for.
      Also checked: DEBUG off, HSTS 2y + preload, SECURE_SSL_REDIRECT,
      session/CSRF cookies secure, X-Frame-Options DENY,
      send_default_pii False on the Sentry client, no secret in the tree
      (git log -S scan across 4 commits), ALLOWED_HOSTS not '*'.

  oc-bug-check  PASS with warnings ⚠️   (18.6s)

[oc-deploy-ops] GATE: BLOCKED on [SEC-01]. Not deploying.
\`\`\`

**Fix applied before the deploy** — \`render.yaml\` gains a second
database, staging points at it, production stops auto-deploying, and
staging's \`preDeployCommand\` moves into the build command (Render only
offers pre-deploy on paid web services, and staging runs on \`free\`):

\`\`\`diff
 databases:
   - name: quill-db
-    plan: starter
+    plan: basic-256mb
+    region: oregon
+    postgresMajorVersion: "17"
+  - name: quill-staging-db
+    plan: basic-256mb
+    region: oregon
+    postgresMajorVersion: "17"
@@ quill (production) @@
-    autoDeploy: true
+    autoDeployTrigger: off
+    domains:
+      - quill.priyabuilds.com
@@ quill-staging @@
-    preDeployCommand: python manage.py migrate --noinput
     buildCommand: |
       pip install -r requirements.txt
       python manage.py collectstatic --noinput
+      python manage.py migrate --noinput
     envVars:
       - key: DATABASE_URL
         fromDatabase:
-          name: quill-db
+          name: quill-staging-db
\`\`\`

\`\`\`
[oc-deploy-ops] Re-running oc-security-auditor → PASS, 0 HIGH. Gate OPEN.
\`\`\`

## 2. Staging — first Blueprint sync

Render has no git remote. The repository is connected through Render's
GitHub integration; a push to \`main\` fires a webhook, and because the
Blueprint changed, this push is a Blueprint *sync* that provisions the
resources before it builds anything.

\`\`\`
$ git push origin main
To github.com:inv-org/quill.git
   e3c9d15..4c7d21a  main -> main

[oc-deploy-ops] Render webhook received 2026-05-17T14:08:11Z
[oc-deploy-ops] Blueprint sync: 2 databases, 2 services
  ✓ quill-staging-db   basic-256mb  oregon  postgres 17   created
  ✓ quill-db           basic-256mb  oregon  postgres 17   created
  ⏸ quill              starter      oregon                created, autoDeployTrigger=off
  ▶ quill-staging      free         oregon                deploying

[oc-deploy-ops] Blueprint sync paused: 4 environment variables are
  sync:false and have no value yet. Render will not start the build
  until a human sets them in the dashboard:
    quill          RESEND_API_KEY, SENTRY_DSN
    quill-staging  SECRET_KEY, RESEND_API_KEY
  → handed back to Priya. Resumed 14:19Z.
\`\`\`

Render build log for \`quill-staging\`, deploy \`dep-cs6h9a2l4v1c73f8kq3g\`:

\`\`\`
==> Cloning from https://github.com/inv-org/quill
==> Checking out commit 4c7d21aa93b1f4c0e2d77fbb8c5a1e6d0913ae42 in branch main
==> Using Python version 3.12.10 (from .python-version)
==> Running build command 'pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate --noinput'...
Collecting Django==5.2.1
  Downloading Django-5.2.1-py3-none-any.whl (8.3 MB)
...
Successfully installed Django-5.2.1 WeasyPrint-64.0 dj-database-url-2.3.0
  django-anymail-13.0 gunicorn-22.0.0 psycopg-3.2.3 psycopg-binary-3.2.3
  python-json-logger-2.0.7 sentry-sdk-2.19.2 whitenoise-6.7.0
174 static files copied to '/opt/render/project/src/staticfiles', 512 post-processed.
Operations to perform:
  Apply all migrations: admin, auth, billables, contenttypes, firms, invoices, sessions
Running migrations:
  Applying contenttypes.0001_initial... OK
  Applying auth.0001_initial... OK
  Applying admin.0001_initial... OK
  Applying admin.0002_logentry_remove_auto_add... OK
  Applying admin.0003_logentry_add_action_flag_choices... OK
  Applying contenttypes.0002_remove_content_type_name... OK
  Applying auth.0002_alter_permission_name_max_length... OK
  Applying auth.0003_alter_user_email_max_length... OK
  Applying auth.0004_alter_user_username_opts... OK
  Applying auth.0005_alter_user_last_login_null... OK
  Applying auth.0006_require_contenttypes_0002... OK
  Applying auth.0007_alter_validators_add_error_messages... OK
  Applying auth.0008_alter_user_username_max_length... OK
  Applying auth.0009_alter_user_last_name_max_length... OK
  Applying auth.0010_alter_group_name_max_length... OK
  Applying auth.0011_update_proxy_permissions... OK
  Applying auth.0012_alter_user_first_name_max_length... OK
  Applying firms.0001_initial... OK
  Applying billables.0001_initial... OK
  Applying billables.0002_timeentry... OK
  Applying billables.0003_timeentry_import_fingerprint... OK
  Applying invoices.0001_initial... OK
  Applying sessions.0001_initial... OK
==> Build successful 🎉
==> Deploying...
==> Running 'gunicorn core.wsgi:application --workers 1'
==> Your service is live 🎉
\`\`\`

23 migrations, 47s build, 9s to first healthy response.
\`apps.accounts\` is not in the list because it has no models — it holds
the login/logout views and forms only.

## 3. Smoke

\`\`\`
[oc-deploy-ops] run_smoke(env=staging, base=https://quill-staging.onrender.com)

✅ Health: 200
   {"ok": true, "service": "quill", "sha": "4c7d21a", "db_ping_ms": 6}
✅ Admin login page: 200 ('Django administration' present)
✅ Auth guard /billables/list/: 302 → /admin/login/?next=/billables/list/
✅ HSTS header: strict-transport-security: max-age=63072000; includeSubDomains; preload

Result: 4 passed, 0 failed
\`\`\`

\`\`\`
$ curl -fsS https://quill-staging.onrender.com/health | jq .
{
  "ok": true,
  "service": "quill",
  "sha": "4c7d21a",
  "db_ping_ms": 6
}
\`\`\`

The \`sha\` is \`4c7d21a\`, not the PR head \`bb1f0e2\` — #11 was rebase-merged,
so the branch commits replayed onto \`main\` with new hashes.

## 4. Deploy ticket

\`\`\`
[oc-deploy-ops] Pre-create check — a marker search across issues, not a
  body filter on list_issues (GitHub's list_issues has no such filter):

mcp__mcp-server-github__search_issues(
  query='repo:inv-org/quill label:type:deploy "opchain:oc-deploy-ops:deploy-created:staging:4c7d21a"')
  → 0 results. Safe to create.

mcp__mcp-server-github__issue_write(action=create):
  Title: "Deploy: staging <initial>..4c7d21a — first deploy"
  Body:
    <!-- opchain:oc-deploy-ops:deploy-created:staging:4c7d21a -->

    Environment:     staging
    Range:           <initial>..4c7d21a
    Commits:         4
      a0f19c3  chore(scaffold): Django project + render.yaml Blueprint   (#3)
      e3c9d15  feat(firms): firm settings + partner admin                (#4)
      7f2a9d6  feat(billables): time-entry CRUD + bulk import            (#5)
      4c7d21a  fix(billables): utf-8-sig decode + import fingerprint     (#5)
    Linked tickets:  #3, #4, #5
    Audit gate:      PASS (grade A-; 1 HIGH resolved pre-deploy, SEC-01)
    Bug-check:       PASS
    Smoke tests:     pending
    Render service:  quill-staging  (dep-cs6h9a2l4v1c73f8kq3g)
    URL:             https://quill-staging.onrender.com
  Labels: [opchain, agent-driven, type:deploy]
  → Created issue #14.

[oc-deploy-ops] After smoke passed:
mcp__mcp-server-github__add_issue_comment(issue_number=14, body=
  "<!-- opchain:oc-deploy-ops:staging-verified:#14 -->
   Smoke 4/4 PASS on dep-cs6h9a2l4v1c73f8kq3g. sha 4c7d21a.
   Promotion to production is manual (autoDeployTrigger: off).")
mcp__mcp-server-github__issue_write(issue_number=14, labels_add=["status:staging-verified"])

  Note: no linked-shipped comments here. staging-verified goes on the
  deploy ticket only; linked-shipped:<deploy>:<ticket> is a production
  event and is posted in §5.
\`\`\`

## 5. Production — 2026-05-22, after Sarah signs

Production does not auto-deploy. The promotion is an explicit command
against a reviewed commit:

\`\`\`
$ render deploys create quill --commit 9e2b7f1 --wait
==> Triggered deploy dep-cs7t4m8q2x9d73h1nr6g for service quill (srv-cs6h8k…)
==> Checking out commit 9e2b7f1c40aa2e5b86d3f1097c4ab2ee5d310f88 in branch main
==> Using Python version 3.12.10 (from .python-version)
==> Running build command 'pip install -r requirements.txt && python manage.py collectstatic --noinput'...
181 static files copied to '/opt/render/project/src/staticfiles', 534 post-processed.
==> Build successful 🎉
==> Running pre-deploy command 'python manage.py migrate --noinput'...
Operations to perform:
  Apply all migrations: admin, auth, billables, contenttypes, firms, invoices, sessions
Running migrations:
  ... 18 Django contrib migrations ... OK
  Applying firms.0001_initial... OK
  Applying billables.0001_initial... OK
  Applying billables.0002_timeentry... OK
  Applying billables.0003_timeentry_import_fingerprint... OK
  Applying invoices.0001_initial... OK
  Applying invoices.0002_invoiceline... OK
  Applying invoices.0003_invoice_pdf_fields... OK
  Applying invoices.0004_invoice_sent_at... OK
==> Pre-deploy command succeeded
==> Running 'gunicorn core.wsgi:application --workers 3 --timeout 30'
==> Your service is live 🎉
2026-05-22T16:40:03Z  deploy dep-cs7t4m8q2x9d73h1nr6g live  (build 52s, deploy 14s)
\`\`\`

\`9e2b7f1\` is \`main\` with Sprints 2 and 3 merged (#6, #7). 26 migrations
on a fresh production database; the four \`invoices\` migrations are the
draft-invoice and PDF/email work.

\`\`\`
[oc-deploy-ops] Audit gate on 9e2b7f1: Grade A-. Counts: {CRITICAL 0, HIGH 0, MEDIUM 1, LOW 4, ADVISORY 2}
[oc-deploy-ops] pytest 83 / 83 PASS · oc-bug-check PASS
[oc-deploy-ops] run_smoke(env=prod, base=https://quill.priyabuilds.com)

✅ Health: 200 {"ok": true, "service": "quill", "sha": "9e2b7f1", "db_ping_ms": 3}
✅ Admin login page: 200
✅ Auth guard /billables/list/: 302 → /admin/login/?next=/billables/list/
✅ HSTS header: max-age=63072000; includeSubDomains; preload
❌ Resend send-test: 403

    POST https://api.resend.com/emails → 403
    {"statusCode":403,"name":"validation_error",
     "message":"The quill.priyabuilds.com domain is not verified. Please
                add and verify your domain on https://resend.com/domains"}

Result: 4 passed, 1 failed
\`\`\`

The staging service sends from \`onboarding@resend.dev\`, which Resend
allows without verification — so this failure could not have been
caught before production. Handed to Priya: add the DKIM \`TXT\` record at
\`resend._domainkey.quill.priyabuilds.com\` and the SPF \`TXT\` at
\`send.quill.priyabuilds.com\`. Verified at 17:12Z; retry:

\`\`\`
[oc-deploy-ops] run_smoke(env=prod, only=resend)
✅ Resend send-test: 200  id: "re_5Yg8vKpQ_9tHc2LmEr4pWb"
   → delivered to priya@priyabuilds.com in 3.1s, DKIM pass, SPF pass

Result: 5 passed, 0 failed
\`\`\`

**First-firm onboarding.**

\`\`\`
$ render exec quill -- python manage.py loaddata sarah-cpa.json
Installed 13 object(s) from 1 fixture(s)
  firms.Firm            1   sarah-cpa-partners
  firms.Partner         7
  firms.Engagement      4   (2 retainer, 1 hourly, 1 fixed-fee)
  auth.User             1   sarah@sarah-cpa.example (staff, no password set)
\`\`\`

Same fixture as \`scripts/seed_dev.py\`. Priya sent Sarah a password-reset
link and confirmed in the Render dashboard that the login succeeded —
a deploy tool cannot verify a human logged in, so that claim belongs to
Priya, not to this log.

\`\`\`
[oc-deploy-ops] mcp__mcp-server-github__add_issue_comment(issue_number=14, body=
  "<!-- opchain:oc-deploy-ops:prod-shipped:#14 -->
   Prod deployed: 9e2b7f1 (dep-cs7t4m8q2x9d73h1nr6g). Smoke 5/5 PASS
   after a Resend domain-verification retry. Sarah's firm loaded:
   7 partners, 4 engagements.")

[oc-deploy-ops] linked-shipped on each ticket in the range:
  add_issue_comment(#5,  "<!-- opchain:oc-deploy-ops:linked-shipped:#14:#5 -->")
  add_issue_comment(#6,  "<!-- opchain:oc-deploy-ops:linked-shipped:#14:#6 -->")
  add_issue_comment(#7,  "<!-- opchain:oc-deploy-ops:linked-shipped:#14:#7 -->")

[oc-deploy-ops] mcp__mcp-server-github__issue_write(
  issue_number=14, state="closed", labels_add=["status:shipped"])

[oc-deploy-ops] Production env deltas set in the Render dashboard
  (not in render.yaml — they are install-specific, and the Blueprint is
   shared across every firm install):
  - ALLOWED_HOSTS:         quill.priyabuilds.com
  - CSRF_TRUSTED_ORIGINS:  https://quill.priyabuilds.com
  - SENTRY_DSN:            set (sync:false)
  - RESEND_API_KEY:        set (sync:false)

[oc-deploy-ops] Hand-off: oc-monitoring-ops /oc-monitor
\`\`\`

## 6. Cost, as billed

| Resource | Plan | Monthly | Notes |
|---|---|---:|---|
| \`quill\` web | starter | \$7 | 512 MB RAM, 0.5 CPU, no sleep |
| \`quill-db\` Postgres 17 | basic-256mb | \$6 | daily backup, 7-day retention |
| \`quill-staging\` web | free | \$0 | 512 MB RAM, sleeps after 15 min idle |
| \`quill-staging-db\` Postgres 17 | basic-256mb | \$6 | the [SEC-01] fix; not optional |
| Resend | free tier | \$0 | 3,000 emails/mo; Sarah's firm sends ~50 |
| **Total, 1 firm, prod + staging** | | **\$19 / mo** | Per-firm marginal cost is **\$13** — staging is shared |

---

Checkpoint: \`.checkpoints/oc-deploy-ops.checkpoint.json\` — see the
\`deploy-checkpoint\` artifact for the full file.
`,
    },
    {
      id: "deploy-checkpoint",
      label: "Deploy-ops checkpoint after the production ship",
      kind: ".checkpoints/oc-deploy-ops.checkpoint.json",
      body:
`\`\`\`json
{
  "protocol": "1.1",
  "skill": "oc-deploy-ops",
  "project": "quill",
  "repo": "inv-org/quill",
  "phase": "prod",
  "status": "complete",
  "updated_at": "2026-05-22T17:26:40Z",
  "session_id": "sess_2026-05-22_quill_prod",

  "skill_state": {
    "provider": "render",
    "blueprint": "render.yaml",
    "services": {
      "prod":    { "name": "quill",         "id": "srv-cs6h8kl3n9ts73abcd10", "plan": "starter", "auto_deploy_trigger": "off" },
      "staging": { "name": "quill-staging", "id": "srv-cs6h8kl3n9ts73abcd11", "plan": "free",    "auto_deploy_trigger": "commit" }
    },
    "staging_version": "4c7d21a",
    "staging_deploy_id": "dep-cs6h9a2l4v1c73f8kq3g",
    "prod_version": "9e2b7f1",
    "prod_deploy_id": "dep-cs7t4m8q2x9d73h1nr6g",
    "prev_prod_version": null,
    "rollback_available": true,
    "rollback_command": "render rollbacks create quill --deploy dep-cs7t4m8q2x9d73h1nr6g",

    "audit_gate": {
      "oc-code-auditor":     { "grade": "A-", "critical": 0, "high": 0, "medium": 1, "low": 4, "advisory": 2 },
      "oc-security-auditor": { "verdict": "PASS", "high_resolved_pre_deploy": ["SEC-01 shared database between staging and prod"] },
      "oc-bug-check":        { "verdict": "PASS", "warnings": 1 },
      "tests":               { "passed": 83, "failed": 0, "suite": "pytest" }
    },

    "smoke_results": [
      { "check": "health",             "status": "pass", "detail": "200 sha=9e2b7f1 db_ping_ms=3" },
      { "check": "admin_login_page",   "status": "pass", "detail": "200" },
      { "check": "auth_guard",         "status": "pass", "detail": "302 /billables/list/ → /admin/login/" },
      { "check": "hsts_header",        "status": "pass", "detail": "max-age=63072000; includeSubDomains; preload" },
      { "check": "resend_send_test",   "status": "pass", "detail": "200 id=re_5Yg8vKpQ_9tHc2LmEr4pWb (retry after domain verification; first attempt 403 validation_error)" }
    ],

    "pm": {
      "provider": "github-issues",
      "deploy_tickets": [
        { "env": "staging", "issue": 14, "marker": "opchain:oc-deploy-ops:deploy-created:staging:4c7d21a", "state": "closed" },
        { "env": "prod",    "issue": 14, "marker": "opchain:oc-deploy-ops:prod-shipped:#14",               "state": "closed" }
      ],
      "linked_shipped": [
        { "deploy": 14, "ticket": 5 },
        { "deploy": 14, "ticket": 6 },
        { "deploy": 14, "ticket": 7 }
      ],
      "pm_idempotent_skips": [],
      "pm_deferred_actions": []
    },

    "cost_usd_month": { "prod": 13, "staging": 6, "total": 19 }
  },

  "next_actions": [
    "Skill(oc-monitoring-ops, \\"/oc-monitor\\") — Sentry DSN is live; add the /health uptime probe at 5-minute interval and an alert on two consecutive non-200s",
    "Watch risk R3 (ops minutes per firm per month) — first data point is the 2026-06-01 May close",
    "Sprint 4 (#8) uncomments the worker + key-value stubs in render.yaml; that is the next Blueprint sync"
  ],

  "handoff": {
    "from": "oc-app-architect /oc-launch",
    "to": "oc-monitoring-ops",
    "contract": "prod_version + smoke_results + service ids; monitoring owns the /health probe and the Sentry release tagging from RENDER_GIT_COMMIT"
  }
}
\`\`\`

The file is byte-for-byte the same *shape* as
\`.checkpoints/oc-deploy-ops.checkpoint.json\` in the Cloudflare
scenarios. What differs is the contents of \`skill_state.services\`,
\`rollback_command\`, and the provider string — the schema, the
\`pm\` block, the deferred-action queue and the \`next_actions\` contract
are identical. That is the whole platform-expansion claim, in one file.
`,
    },
  ],
  skills: [
    "oc-app-architect",
    "oc-stack-forge",
    "oc-git-ops",
    "oc-bug-check",
    "oc-code-auditor",
    "oc-security-auditor",
    "oc-deploy-ops",
    "oc-integrations-engineer",
    "oc-monitoring-ops",
  ],
  runtime: "≈ 42 exchanges",
  steps: [
    {
      type: "beat",
      phase: "discover",
      label: "Day 1 — Priya files inv-org/quill#1",
      caption: "She types the idea into a GitHub issue and runs `/oc-discover --ticket inv-org/quill#1`. opchain pulls the issue body via mcp__mcp-server-github__issue_read.",
      skills: ["oc-app-architect"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "/oc-discover --ticket inv-org/quill#1\n\nThe ticket has the rough idea: invoicing tool for small accounting firms. Solo founder, want to go fast. Repo is empty apart from LICENSE and README, and #1 is the only issue in it.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-app-architect",
      content:
`\`issue_read(owner=inv-org, repo=quill, issue_number=1)\` → 187ms, 412-word body, 0 comments.

Four of the nine discovery questions are already answered in there, and I'm reading them back rather than assuming: "small accounting firms" → 3–15-partner partnerships; "not another QuickBooks clone" → per-firm install. Tell me where I've bent one.

The three left that change the architecture: time horizon, pricing model — which decides whether "tenant" is a row or a deployment — and UI shape.`,
    },
    {
      type: "exchange",
      role: "user",
      content:
        "Time horizon: 90 days to first paying firm — Sarah's firm signed an LOI on the 8th at $350/mo.\n\nPricing: per-firm install, $200-500/mo. I don't want to be in the multi-tenant data-breach business at three customers.\n\nUI: server-rendered. The workflow is a once-a-month batch; an SPA buys me nothing and costs me a build step and a second CI job.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-app-architect",
      content:
`Per-firm install makes "tenant" a deployment rather than a row. \`firm_id\` still goes on every table, so multi-firm stays possible without a schema migration.

Last two, both cheap to reverse: **PDF requirements** — bespoke per firm, one GAAP-friendly template, or plain HTML-to-PDF? — and **email transport**. Plus a correction check: anything else for the never-build list that isn't in the ticket?`,
    },
    {
      type: "exchange",
      role: "user",
      content:
        "PDF: one GAAP-friendly template. Logo, line items, totals, tax, terms. No charts — it's a bill, not a dashboard.\n\nEmail: no contract, no preference. Cheapest thing with real deliverability. A bill in a client's spam folder is a 45-day AR problem, so that's the one dimension I won't trade.\n\nAnd add to the never list: not mobile-first.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-app-architect",
      content:
`Reading it back. Quill is invoicing for 3–15-partner US CPA partnerships, per-firm install at $200–500/mo, Sarah's firm as design partner #1 on a signed LOI. Once-a-month batch: load billables, invoice across retainer / hourly / fixed-fee engagements, one PDF each, email, stop. Partners are first-class entities, which is the wedge. Not multi-tenant SaaS, no free tier.

Two claims go in §2.3 labelled unverified rather than as fact: the QuickBooks price-rise figure (three anecdotes, no price sheet) and "firms need cleaner book-tax ledgering" (one design partner of three).`,
    },
    {
      type: "exchange",
      role: "user",
      content:
        "Confirmed. One addition to the never list: no multi-tenant SaaS *below 50 firms*. Put the number in writing, otherwise I'll relitigate it with myself every time somebody asks about scale.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-app-architect",
      content:
`Written. \`spec/00-project-overview.md\`, 13 sections. §9's assumptions and constraints each carry an "if it breaks" column; §13 takes your 50-firm number literally; §7 carries $13/mo per-firm infrastructure as a placeholder until oc-stack-forge scores the platform.

One detail from your persona call is in §4.1 as an operational note, not colour: Sarah exports her hours from **Excel on a Mac**, so the file is UTF-8 with a BOM and CRLF line endings. It is the single most likely thing to break the import path.

Checkpoint advanced \`phase: "discovery" → "spec"\`; \`/oc-spec\` next.`,
      artifacts: ["discovery"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "Before oc-stack-forge runs — sanity check. Postgres feels like overkill for a single-tenant install with seven users. Why not SQLite? It's one file, it backs up with `cp`, and Django supports it natively.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-app-architect",
      content:
`Fair, and the scorecard agrees with you more than you'd expect: SQLite **51.3** against Render Postgres **51.8** on a 57-point scale. Half a point is noise. Two things it compresses too hard.

**Concurrency.** Production runs \`gunicorn --workers 3\` and Sprint 4 adds a PDF worker. SQLite in WAL mode is many-readers / one-writer — \`sqlite3.OperationalError: database is locked\` when someone uploads a CSV while someone else pages the list. At three firms that lands during month-end.

**Backups.** \`cp\` copies a file that is being written to; Render Postgres gives you a daily snapshot and a restore button for **$6/mo per firm**, against $350 of revenue.

If you never add a second process and never pass one firm, SQLite wins — say so and I'll re-run the card with "solo-dev simplicity" at 2.0.`,
    },
    {
      type: "beat",
      phase: "spec",
      label: "Day 1 — oc-stack-forge runs the Platform Matrix",
      caption: "Six layers scored with published weights and published arithmetic. The ADR goes back on #1 as a comment, so the decision lives where the work lives.",
      skills: ["oc-stack-forge"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "Keep Postgres — concurrency clinches it, and I'm not writing a restore runbook in week one.\n\nOne condition: I want to see the searches you ran. My last agent told me with total confidence that Django 5.1 was the LTS. If your version pins come out of training data I'd rather find out now than on the first deploy.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-stack-forge",
      content:
`Warranted. Claims were searched before scoring, timestamped in \`spec/01-tech-stack.md\` §13; three of the five searches changed the answer. **Your last agent was wrong, and so was my prior**: Django 5.1 reached end-of-life in December 2025, so the pin is \`5.2.x\`. Render reads \`.python-version\` and silently **ignores \`runtime.txt\`**. And \`preDeployCommand\` is paid-plan only, which constrains staging.

| Layer | Pick | Weighted | Runner-up | Margin |
|---|---|---:|---|---:|
| Backend | **Django 5.2** | 62.1 | Rails 58.4 | +3.7 |
| Database | **Render Postgres 17** (\`basic-256mb\`) | 51.8 | SQLite 51.3 | +0.5 |
| Host | **Render** | 53.3 | Heroku 47.5 | +5.8 |
| PDF | **WeasyPrint** | 48.3 | wkhtmltopdf 42.4 | +5.9 |
| Email | **Resend** via django-anymail | 39.1 | Postmark 37.0 | +2.1 |

**ADR-1 posted to #1** as a comment, after a pre-write \`issue_read\` found no \`stack-decision:ADR-1\` marker. Cost band **$13 / $39 / $140 / $900** at 1 / 3 / 10 / 25 firms.`,
      artifacts: ["stack"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "ADR reads right, and I like that it's a comment on the ticket rather than a file nobody opens. Write the rest of the spec set — but keep it tight. I don't need a 40-page architecture document for a CRUD app with six models.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-app-architect",
      content:
`Tight. Seven files, 11 minutes; the longest new one is \`02-data-model.md\` at 174 lines. \`/oc-qa pyramid\` wrote \`.opchain/qa.yaml\` with a **new-code coverage budget of 80%** — the number the evaluator gates on every sprint.

★ **Spec gate — I don't proceed without an explicit approval.** \`02-data-model.md\` is the file that matters; everything else is reversible. Three decisions in it I'd push back on if I were reviewing:

- \`Partner.user\` is \`OneToOneField(User, on_delete=PROTECT, null=True, blank=True)\` — the Partner is the business entity, the login is optional.
- \`Engagement.client_billing_email\` is \`EmailField(unique=True)\` — one billing inbox per engagement.`,
    },
    {
      type: "exchange",
      role: "user",
      content:
        "Approve, two changes.\n\n`Partner.user` — `on_delete=SET_NULL`, not PROTECT. Partners leave. When someone departs I need to delete their login and keep the historical Partner row for the invoices they're on; PROTECT means Django refuses and I end up with a zombie account that can still log in.\n\n`Engagement.client_billing_email` can't be unique. A mid-size client sends everything to one AP inbox — `ap@acmeholdings.example` covers their audit, tax and advisory engagements. Unique means the second one won't save, and I'd find that out in front of a customer.\n\nThird thing: skip `/oc-design`. I'll spend the design hours on the PDF, which is the only thing a client ever sees.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-app-architect",
      content:
`Both are right, and the second would have shipped a bug Sarah hits on her second engagement.

\`\`\`diff
-    user = models.OneToOneField(User, on_delete=models.PROTECT, ...)
+    # SET_NULL: partners leave, and the firm still needs to delete the login.
+    user = models.OneToOneField(settings.AUTH_USER_MODEL,
+                                on_delete=models.SET_NULL, null=True, blank=True)
-    client_billing_email = models.EmailField(unique=True)
+    # NOT unique: one AP inbox routinely covers several engagements.
+    client_billing_email = models.EmailField()
\`\`\`

The design gate is recorded in the checkpoint as \`design_gate: "skipped (user waiver)"\` with your reason attached — skipped, not silently dropped. \`design/punch-list.md\` still lists nine screens; the two that aren't Django admin are #4, the import, and #7, the preview.`,
    },
    {
      type: "exchange",
      role: "user",
      content:
        "Punch list is fine — drop #7 as a separate screen. The preview is the PDF served inline in a browser tab; there's nothing to design there that isn't already the PDF template. Eight screens. Scaffold it.",
    },
    {
      type: "beat",
      phase: "plan",
      label: "Day 1 — /oc-scaffold writes the project",
      caption: "Per scaffold-guide.md § Django. Settings split, render.yaml Blueprint, CI workflow, seed script, pytest, Django admin. 41 files with content; 18 tests.",
      skills: ["oc-app-architect"],
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-app-architect",
      content:
`\`/oc-scaffold\` — 41 files with content (50 on disk; nine are empty \`__init__.py\` markers), 11 minutes.

- **Settings split** \`core/settings/{base,dev,prod}.py\`, \`dev.py\` on **local Postgres** rather than SQLite: the tenant tests assert a CheckConstraint rejects a row *at the database*, which is worth nothing on a different engine.
- **\`render.yaml\` Blueprint** — Postgres + web service + staging variant. \`.python-version\` pins 3.12.10; deliberately no \`runtime.txt\`.
- **Four apps** — \`firms\`, \`billables\`, \`invoices\`, and the auth one named \`accounts\`, not \`auth\`; more on that below.
- **\`STORAGES\`, not \`STATICFILES_STORAGE\`** — removed in 5.1 and ignored *silently* on 5.2, so you'd find out from a 404 in production.

Tickets **#2** (branch protection on \`main\`, yours) and **#3** (this scaffold) filed; \`.opchain/pm.yaml\` targets **GitHub Issues**, not Linear. Run \`python manage.py migrate\` before I commit — I want the first boot on your machine, not in my sandbox.`,
      artifacts: ["scaffold", "render-yaml", "pm-yaml-gh"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "It doesn't boot.\n\n$ python manage.py migrate\n  File \"django/apps/registry.py\", line 100, in populate\ndjango.core.exceptions.ImproperlyConfigured: Application labels aren't unique, duplicates: auth\n\npytest gives me the same at collection time. Did the scaffold write two auth apps?",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-app-architect",
      content:
`No — one app with a name Django has already claimed. My mistake, and a useful one to see.

A Django app's **label** defaults to the last component of its dotted path. \`apps.auth\` registers under the label \`auth\`, which \`django.contrib.auth\` already owns, so the registry refuses to populate and nothing starts — \`runserver\`, \`migrate\`, \`pytest\` collection, all of it. Note what it is *not*: this has nothing to do with \`INSTALLED_APPS\` ordering. Forcing \`label = "quill_auth"\` would work, but then every migration and admin URL reads \`quill_auth\`; better not to name an app after a contrib app:

\`\`\`
$ git mv apps/auth apps/accounts
$ sed -i '' 's/apps\\.auth/apps.accounts/' core/settings/base.py apps/accounts/apps.py
$ python manage.py migrate   # contenttypes.0001 … 19 more … sessions.0001  OK
$ pytest -q                  # 18 passed in 1.42s
\`\`\`

Boots. Committed as \`a0f19c3\` against #3.`,
    },
    {
      type: "beat",
      phase: "plan",
      label: "Day 2 — /oc-roadmap decomposes the work",
      caption: "Six sprints in the SKILL.md contract format. `create_child_tickets: true`, so each one becomes a GitHub issue (#5–#10) with an idempotency marker on the parent.",
      skills: ["oc-app-architect"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "Pushed the firms-domain work overnight — firm settings view, partner admin, 9 more tests, `e3c9d15` against #4. 27 tests green.\n\n/oc-roadmap\n\nHard constraint before you plan: Sarah's LOI says a Quill-generated invoice lands in a client's inbox by 31 May.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-app-architect",
      content:
`Six sprints, 2026-05-11 → 06-12, sized against your 25 build-hours/week from \`spec/00\` C1. CLAUDE hours are agent work, USER hours yours.

| # | Sprint | Window | CLAUDE | USER | Ticket |
|---|---|---|---:|---:|---|
| 1 | Time-entry foundations | 05-11 → 05-15 | 9h | 2h | #5 |
| 2 | Draft invoices | 05-18 → 05-20 | 11h | 3h | #6 |
| 3 | Month-end batch worker | 05-21 → 05-27 | 10h | 1h | #7 |
| 4 | PDF render + email delivery | 05-28 → 06-04 | 12h | 2h | #8 |
| 5 | Fee write-offs + sales tax | 06-05 → 06-11 | 9h | 4h | #9 |
| 6 | Design-partner fixes | 06-12 → 06-18 | 8h | 4h | #10 |

Test requirements are written **before** any code: not "import works" but "10-row CSV → 10 rows". A pre-write check on #1 found no sprint-contract markers, so six marker-tagged comments and six child tickets went up → **#5 … #10**.

Your 31 May constraint and this ordering disagree, though: PDF + email is Sprint 4, finishing 06-04.`,
      artifacts: ["sprint-plan"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "Yeah, that's backwards. Swap 3 and 4. Sarah needs PDFs in the client's inbox by 31 May; the worker can wait — she's got 50 invoices a month, not 5,000.\n\nAnd compress the new Sprint 3. If drafts are done on the 20th I want the PDF path finished by the 22nd. I'd rather find out early that WeasyPrint can't lay out a 40-line invoice than find out on the 30th.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-app-architect",
      content:
`Swapped and compressed. Sprint 3 is now **PDF render + email delivery**, 05-21 → **05-22** (#7); Sprint 4 is the month-end batch worker, 05-25 → 05-29 (#8). Sprint 3's definition of done carries the part that isn't code: **the sending domain has to be verified in Resend** — DKIM and SPF TXT records on \`quill.priyabuilds.com\`. That's yours, not mine, and on the critical path to 31 May.

Re-posting is where idempotency earns its keep: four of the six sprint-contract comments are byte-identical and get skipped, sprint-3 and sprint-4 differ and get \`update_comment(2148815604)\` and \`(…638)\`. Without that check a re-plan posts six comments every time. Total: CLAUDE 59h · USER 16h.`,
      artifacts: ["sprint-plan"],
    },
    {
      type: "beat",
      phase: "build",
      label: "Day 3–7 — /oc-build Sprint 1",
      caption: "Contract → Generator → Evaluator. Round 1 fails at 5.5/10 on the file the only customer actually has. Round 2 passes at 8.1.",
      skills: ["oc-app-architect"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "/oc-build\n\nSprint 1. And here's Sarah's actual April export so you're not testing against something I invented — 247 rows, attached to #5 as `toggl-2026-04.csv`.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-app-architect",
      content:
`Sprint 1, three phases. Contract first: the Planner proposed 11 criteria and the Evaluator rejected three as unscoreable. "Import works" became C-04 (10-row CSV → 10 rows) and C-05 (2 malformed → 8 created, 2 in \`errors[]\`); "tenant isolation" became C-06, where the fixture holds TWO firms and a partner of firm A posting to firm B's admin URL gets 403.

**Evaluator, round 1 — FAIL, 5.5/10** against a gate of 8.0. Functionality 4: \`POST /billables/import/\` returns **500** on the file you attached. Code quality capped at 5 — three criteria have no test, one asserts the opposite of its criterion. C-14 fails too, at \`peak 61.4 MB\`.

**[B-001] CRITICAL** — your export starts with a UTF-8 BOM:

\`\`\`
$ head -c 32 toggl-2026-04.csv | xxd | head -2
00000000: efbb bf44 6174 652c 5061 7274 6e65 722c  ...Date,Partner,
\`\`\`

\`csv_import.py:31\` does \`raw.decode("utf-8")\`, so \`DictReader\` sees a first header of \`'\\ufeffDate'\` and every row raises \`KeyError\` — 500 on all 247.

**[B-002] HIGH** — \`admin.py:29\` returns \`super().get_queryset(request)\` with no firm filter; \`test_admin_cross_tenant_forbidden\` is green only because the fixture has one firm. Exactly the failure mode C-06 was rewritten to prevent.

C-13 needs a decision first: a re-import must create 0 rows, and the CSV carries no row id.`,
      artifacts: ["sprint1-eval"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "The BOM thing is the whole point — Sarah exports from Excel on a Mac, that IS the real path. If that had shipped, her first ten minutes with Quill would have been a 500.\n\nOn C-13: yes, dedupe. That test asserted re-import creates duplicates and called it intentional, which is backwards — she *will* double-upload, get distracted, and upload again to check it worked.\n\nKey it on partner + engagement + date + hours + description. If she genuinely billed two 0.5h calls with the same note, one gets skipped — say so on the import result page. I'd rather explain a skipped row than a double-billed client.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-app-architect",
      content:
`Round 2. \`+188 / −63\`, 7 files: \`raw.decode("utf-8-sig")\` plus header \`.strip()\` at \`csv_import.py:29-34\`; an \`import_fingerprint\` (sha1 of partner, engagement, date, hours, description) under \`UniqueConstraint(["firm", "import_fingerprint"])\`; the admin queryset filtered by \`request.user.partner.firm\`.

Your trade-off is in the UI, not a docstring — above the fold on the import result page: "Two identical entries on the same day are treated as a repeat upload and skipped. Add a word to the description to keep both."

**Evaluator, round 2 — PASS, 8.1/10** (functionality 4 → 9, code quality 5 → 8.5). 41 tests, contract coverage 14 of 14, new-code coverage **84%**. Against the real file: 247 created / 0 skipped, then 0 created / 247 skipped on the same upload again. I am **not** closing #5 — oc-git-ops owns that transition.`,
      artifacts: ["sprint1-eval"],
    },
    {
      type: "beat",
      phase: "ship",
      label: "Day 8 — /oc-git-sync opens PR #11",
      caption: "oc-bug-check → oc-docs-forge → oc-repo-ops → `gh pr create`. GitHub numbers issues and PRs in one sequence, so the first PR in this repo is #11, not #1.",
      skills: ["oc-git-ops", "oc-bug-check"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "/oc-git-sync inv-org/quill#5\n\nBranch is local with both round-1 and round-2 commits on it. I'm the only reviewer, so don't pretend there's a review workflow — but I do want the docs section in the body, because in six months I won't remember that a re-import is a no-op.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-git-ops",
      content:
`\`issue_read(issue_number=5)\` → "Sprint 1: time-entry foundations". Branch derives from the issue: \`feat/quill-5-time-entry-foundations\`.

\`\`\`
BUG CHECK — PASS with warnings ⚠️   18.6s
  ruff 0 · mypy 0 in 44 files · pytest 41 passed · secrets 0
  pip-audit 0 vulnerabilities in 17 packages
  ⚠️  csv_import.py:71  "# TODO: preload engagement map once per import"
      Not blocking. Filing it so it stops being a comment.
\`\`\`

\`/oc-docs pr\` wrote the \`## Documentation\` section — README gains "Importing time entries", with Excel-on-Mac BOM/CRLF exports called out as supported — and \`/oc-repo verify\` passed. Then \`gh pr create\`:

    https://github.com/inv-org/quill/pull/11

**#11**, not #1 — GitHub draws issues and pull requests from one number sequence per repository, and this repo is already at #10 from the sprint tickets. Write-back on #5: the PR link, 14 new tests of 41, evaluator 8.1/10 over 2 rounds, \`status:in-review\`, plus **#12** and **#13**.`,
      artifacts: ["first-pr"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "Read the whole diff, which took twenty minutes and was worth it. Merged with rebase — the two branch commits replayed onto main, so the head is `4c7d21a`, not `bb1f0e2`. #5 is closed.\n\n/oc-deploy staging",
    },
    {
      type: "beat",
      phase: "audit",
      label: "Day 9 — the deploy gate blocks on a topology finding",
      caption: "oc-code-auditor grades the code A-. oc-security-auditor reads render.yaml and finds staging and production pointing at the same database.",
      skills: ["oc-deploy-ops", "oc-code-auditor", "oc-security-auditor"],
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-deploy-ops",
      content:
`Provider detected: **Render** (\`render.yaml\` at repo root). Two auditors run before a first production deploy. oc-code-auditor returns Grade A-, \`{CRITICAL 0, HIGH 0, MEDIUM 2, LOW 3}\`. oc-security-auditor is where it stops:

\`\`\`
[SEC-01] HIGH  render.yaml:487 and render.yaml:524
  Services 'quill' and 'quill-staging' both resolve DATABASE_URL
  fromDatabase: quill-db.

  Staging exists to run migrations that have not been released. Pointed
  at the production database, the first bad migration takes a customer's
  billing history with it.

  'check --deploy', ruff and mypy are all clean. It is not a code finding.
  It is a topology finding, in a YAML file that no test executes.

GATE: BLOCKED on [SEC-01]. Not deploying.
\`\`\`

The fix adds \`quill-staging-db\` and repoints staging's \`fromDatabase\` at it. A correction rides along: \`plan: starter\` isn't a valid Postgres plan id — \`basic-256mb\` is, at **$6/mo**. Re-run → PASS, 0 HIGH, **gate OPEN** — but Blueprint sync will now stop on four \`sync: false\` variables only you can supply: \`RESEND_API_KEY\` and \`SENTRY_DSN\` on \`quill\`, \`SECRET_KEY\` and \`RESEND_API_KEY\` on \`quill-staging\`.`,
      artifacts: ["render-yaml"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "All four pasted. Generated the staging SECRET_KEY with `get_random_secret_key()` rather than letting a password manager pick something with a `$` in it that breaks a shell somewhere.\n\nBlueprint sync resumed. It's building.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-deploy-ops",
      content:
`Render has no git remote; the repo is wired through its GitHub integration, and because the Blueprint changed, this push is a *sync* that provisions before it builds.

\`\`\`
[oc-deploy-ops] Render webhook received, 4c7d21a
  ✓ quill-staging-db / quill-db  basic-256mb  postgres 17  created
  ⏸ quill starter autoDeployTrigger=off · ▶ quill-staging free
==> Python 3.12.10 (from .python-version) · 23 migrations · build 47s
==> Your service is live 🎉

run_smoke(env=staging) → 4 passed, 0 failed
✅ Health 200 {"ok": true, "sha": "4c7d21a", "db_ping_ms": 6}
✅ auth guard → 302 /admin/login/ · HSTS 2y + preload
\`\`\`

The \`sha\` reads \`4c7d21a\`, not the PR head \`bb1f0e2\` — the rebase merge replayed your two commits onto \`main\` with new hashes, exactly as you said.

Deploy ticket **#14** created after a marker search across issues — \`list_issues\` has no body filter. No \`linked-shipped\` comments yet: that is a **production** event.`,
      artifacts: ["first-deploy"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "Staging looks right — imported Sarah's April file through the real UI and got 247 created, then 0 created / 247 skipped on the second upload.\n\nWhat does this cost at 10 firms? And I want the number off the Render dashboard, not the stack doc.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-deploy-ops",
      content:
`Off the dashboard. Four line items today — \`quill\` web starter $7, \`quill-db\` $6, \`quill-staging\` free $0, \`quill-staging-db\` $6 — **$19.00/mo**, of which only **$13 is marginal per firm**; staging is shared across every install you run.

| Firms | Web | Postgres | Resend | Total | Revenue at $350 | Margin |
|---:|---:|---:|---:|---:|---:|---:|
| 1 (today) | $7 | $6 | $0 | **$13** | $350 | 96% |
| **10** | **$70** | **$60** | **$10** | **$140** | **$3,500** | **96%** |
| 25 | $425 | $425 | $50 | $900 | $8,750 | 90% |

At 10 firms infrastructure is 4% of revenue; what constrains you is **ops minutes per firm per month**, risk R3.`,
    },
    {
      type: "beat",
      phase: "operate",
      label: "Day 11 — /oc-integrate wires Resend properly",
      caption: "Planner → Builder → Tester. The Tester finds the thing that only fails in production: Resend will not send from an unverified domain.",
      skills: ["oc-integrations-engineer"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "/oc-integrate connect resend\n\nSprint 3 sends real invoices to real clients on the 22nd, so I want the email path built properly now rather than a `send_mail` call bolted on under time pressure. I need to know when a bill bounces, and a retry must never send the same bill twice.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-integrations-engineer",
      content:
`Planner → Builder → Tester, with both of your requirements in the contract rather than in code comments:

\`\`\`
Retry        3 attempts, 1s / 4s / 16s, on 429 and 5xx only. Never a 4xx —
             a 422 is a bad address, and retrying it is three bounces on
             your domain reputation instead of one.
Idempotency  X-Entity-Ref-ID = "invoice-{pk}-{sent_seq}"; Resend dedupes on
             it, so a retry after a timeout cannot send the same bill twice.
\`\`\`

Nine tests on django-anymail, eight green against the sandbox — 503 exhausted → \`send_failed\` with the invoice NOT marked sent, duplicate ref-id → one delivery, bad svix signature → 401. The ninth:

\`\`\`
❌ send from noreply@quill.priyabuilds.com → 403
   "The quill.priyabuilds.com domain is not verified."
\`\`\`

A difference between environments, not a bug: Resend refuses every unverified custom domain. Staging keeps the sandbox sender; **production cannot**. Sprint 3's definition of done gains a task with your name on it — DKIM and SPF \`TXT\` records on \`quill.priyabuilds.com\`.`,
    },
    {
      type: "beat",
      phase: "ship",
      label: "Day 14 — Sarah signs; /oc-launch",
      caption: "Phase 7 chains audit → security → git-sync → deploy prod → monitor. One thing still breaks, and it is the one nobody could have caught on staging.",
      skills: ["oc-app-architect", "oc-deploy-ops", "oc-monitoring-ops"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "Sarah signed this morning — $350/mo, 12-month term, first invoice run is the May close on Monday 1 June.\n\n/oc-launch\n\nMain is at `9e2b7f1` with Sprints 2 and 3 merged (#6 and #7 closed). While that runs: what actually changed about this pipeline because we used Django + Render + GitHub Issues instead of Workers + Linear? I'd like the honest version.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-app-architect",
      content:
`Checklist first; the comparison is below.

\`\`\`
[oc-app-architect] /oc-launch — 9e2b7f1
  ✓ oc-code-auditor Grade A- · oc-security-auditor PASS, 0 HIGH (SEC-01
    resolved 05-17) · oc-bug-check PASS · pytest 83 / 83 · main clean

$ render deploys create quill --commit 9e2b7f1 --wait
==> pre-deploy 'manage.py migrate --noinput' … 26 migrations … OK
==> Your service is live 🎉   (build 52s, deploy 14s)

run_smoke(env=prod) → 4 passed, 1 failed
✅ Health 200 {"ok": true, "sha": "9e2b7f1", "db_ping_ms": 3}
❌ Resend send-test: 403 "The quill.priyabuilds.com domain is not verified."
\`\`\`

That 403 is the Day-11 finding arriving exactly where it was predicted to: no staging soak would have caught it, because the thing that differs between the environments *is* the sender. Add the DKIM and SPF records and tell me when Resend shows verified. I'm holding the ship comment and the \`linked-shipped\` markers until the send-test passes.`,
      artifacts: ["first-deploy"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "Both records in at Cloudflare DNS — proxy off, obviously, they're TXT. Resend showed verified at 17:12 after about nine minutes. Go.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-app-architect",
      content:
`\`\`\`
run_smoke(env=prod, only=resend) → 5 passed, 0 failed
✅ 200  id "re_5Yg8vKpQ_9tHc2LmEr4pWb" → delivered in 3.1s · DKIM + SPF pass

$ render exec quill -- python manage.py loaddata sarah-cpa.json
Installed 13 object(s): 1 Firm, 7 Partners, 4 Engagements, 1 User

prod-shipped on #14 · linked-shipped on #5, #6, #7 · #14 closed
[oc-monitoring-ops] Sentry live · /health probed every 5 min · alert on
Invoice.delivery_status='bounced' · rollback rehearsed
\`\`\`

**Now the honest version of your question.** Four things changed, and they are all *leaves*: the \`pm.yaml\` provider line, oc-deploy-ops' provider section, the scaffold layout, and the audit gate's check list — ruff + mypy + pytest instead of eslint + tsc + vitest. The check *list* is per-language; the gate semantics are not.

The caveat, since you asked for honest: the platform layer is where the bugs were. Three of the five real failures in these two weeks came from platform knowledge, not from opchain's structure — \`apps.auth\` colliding with a contrib label, \`plan: starter\` not being a Postgres plan, \`preDeployCommand\` being paid-only. The pipeline caught all three before a customer did, which is the actual claim.

Two weeks from a GitHub issue to a signed customer.`,
      artifacts: ["deploy-checkpoint"],
    },
  ],
};
