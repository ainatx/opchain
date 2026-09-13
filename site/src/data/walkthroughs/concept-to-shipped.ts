import type { Walkthrough } from "./types";

/**
 * Scenario 1 — full oc-app-architect pipeline.
 * Covers: oc-app-architect hub, auto-invoke of oc-stack-forge + oc-ux-engineer,
 * the Generator/Evaluator build loop with its failing rounds, the
 * oc-bug-check → oc-docs-forge → oc-repo-ops pre-PR rail inside oc-git-ops,
 * the oc-code-auditor deploy gate, and the ship handoff through
 * oc-deploy-ops → oc-monitoring-ops.
 */
export const conceptToShipped: Walkthrough = {
  id: "concept-to-shipped",
  title: "Concept → shipped, in one chat",
  tagline: "Idea → deployed, one chat",
  summary:
    "A solo founder types an idea and walks out with a live app — including the three evaluation rounds that failed on the way.",
  description:
    "Heads Down is an idea in Mara's head at 10am. By 4pm it's on staging — a URL a teammate can poke at — and in production the next morning at headsdown.app: seven PRs merged, 94 passing tests, a 12-check smoke suite she can read line by line. oc-app-architect runs the full pipeline — discovery interview, spec, design + punch list, sprint plan, Generator/Evaluator build loop — auto-invoking oc-stack-forge for the stack and oc-ux-engineer for the style book, then handing off through the oc-bug-check → oc-docs-forge → oc-repo-ops rail into oc-git-ops, the oc-code-auditor pre-deploy gate, oc-deploy-ops, and finally `/oc-monitor verify`. Three of the six sprints fail their first evaluation round, one design sprint comes back ITERATE, and the pre-deploy audit returns Grade B with two HIGH findings — the transcript keeps all of it in. Two API keys, both created by the founder herself (Resend, VAPID); $0/month on Cloudflare's free tier. Every phase writes a checkpoint she can resume from (`/checkpoint show`).",
  inputs: [
    "One-sentence product idea",
    "No existing code · no stack decision · no design system",
    "No CI/CD · no cloud account picked · empty repo at mara-k/heads-down",
    "A few preferences (mobile-first, self-serve signup, Slack someday)",
    "Willing to create exactly two API keys herself (Resend, VAPID)",
  ],
  outputs: [
    {
      id: "master-spec",
      label: "Master spec (23 sections, export-ready)",
      kind: "spec.md",
      body:
`# Heads Down — Master Spec

**Version** 0.2 · **Owner** oc-app-architect checkpoint (assembled from \`spec/00–10\`) · **Status** Phase 2 draft — at the Spec Approval Gate · **Last updated** 2026-04-08 10:52

> **Reading guide.** Sections 1–3 are the elevator pitch. Sections 4–7 cover product surface area (personas, flows, screens, IA). Sections 8–11 cover engineering surface (data, APIs, permissions, push). Sections 12–17 cover the qualities the system must hold (a11y, perf, security, observability, telemetry, SLO). Sections 18–23 are the operational scaffolding (risks, non-goals, resolved questions, glossary, change log, checkpoints + setup).

## 1. TL;DR

Heads Down is a team pomodoro tracker. ICs start focus blocks of 15/25/45/60 minutes; teammates see who's heads-down on a shared board. Browser push nudges at block end. **Server is the source of truth for timers** — closing a tab doesn't stop a session. Free with a 50-team soft cap and **no billing code in v1**.

The product exists because remote teams have lost the ambient signal of "who is in deep work right now." Slack status is too high-friction; calendar holds are too coarse. Heads Down replaces both with a one-tap focus block that anyone can see on a single shared board.

## 2. Outcome the product is hired for

> "I want my teammates to see I'm in deep work without me having to type a status, and I want a gentle nudge to break together when the block ends."

Two adjacent jobs we're explicitly **not** hiring for:
- **Time-tracking for billing.** Heads Down is signal, not ledger. We do not export hours.
- **Productivity surveillance.** Team leads cannot see historical focus minutes per IC. The board is *now* only.

## 3. Success metrics (90-day)

| Metric | Target | Source |
|---|---|---|
| Activation rate (signup → first session within 24h) | ≥ 55% | events: \`signup\`, \`session.started\` |
| Day-7 retention (users who start at least one session) | ≥ 35% | events: \`session.started\` |
| Median sessions per active user per week | ≥ 6 | aggregated over 7d |
| Team adoption (teams with ≥ 3 active users) | ≥ 60% of teams | aggregate over teams |
| Push opt-in rate (when prompted) | ≥ 45% | event: \`push.permission.granted\` |
| Time-to-first-session (signup → first start) | p50 ≤ 90s | session.started − user.created_at |

## 4. Personas

### 4.1 The IC (primary, ~85% of MAU)

- Software engineers, designers, writers — anyone whose day breaks down into deep-work blocks.
- 22–48 years old, distributed across NA + EU + APAC. Mobile 30% of the time (commute, between meetings).
- Pain we relieve: Slack status fatigue, calendar overhead for "do not disturb."
- What they value: one tap to start, server-authoritative timer (so closing the tab to focus doesn't reset), zero noise on the board when they're not working.

### 4.2 The Team Lead (secondary, ~12% of MAU)

- Read-only board view in v1. No admin tools, no historical exports, no per-user analytics.
- Why they matter anyway: they are the buyer in an eventual paid tier. We design the board to be glanceable for them too — no IC-only affordances on the home view.

### 4.3 The Office Manager (anti-persona)

Discovery, 2026-04-08 10:24, founder verbatim:

> "The team lead never gets reporting. That's the point of the product."

We say "no" to: rolled-up productivity reports, manager dashboards, individual focus-time leaderboards. These are excluded by design (see §19 non-goals) because they would invert the trust model the IC depends on. This is a **hard line**, not a v1 scope cut — it does not come back in v2.

## 5. Core user flows

| Flow | Entry | Steps | Exit |
|---|---|---|---|
| Signup | landing → "Start your team" | email → magic link → name your team → invite teammates (optional) | team board |
| Join existing team | invite link | accept → magic link → onboard | team board |
| Signup over the cap | landing → "Start your team" (teams ≥ 50) | email → waitlist page → confirmation email | \`/plan\` waitlist state |
| Start a session | board → "Focus" button | duration picker (15/25/45/60) → optional intent text | in-progress view |
| Watch teammates | board (default home) | polls every 30s; updates avatars without page reload | — |
| Receive nudge | browser push on session end | "break together" CTA → opens \`/break\` | board |
| End early | in-progress view → "End now" | confirm → marks status=cancelled (counts toward stats) | board |
| Invite | settings → "Invite" | copy link or paste emails | invitation email queued |
| Leave team | settings → "Leave" | confirm | landing |

## 6. Screens

Eleven screens render in v1. Wireframes live in \`design/wireframes.html\`; tokens and component states in \`design/style-book.html\` (both produced by oc-ux-engineer in Phase 3 — there is no Figma file and no design system to inherit).

| # | Screen | Route | Notes |
|---|---|---|---|
| 1 | Landing | \`/\` | Marketing copy + "Start a team" CTA. Server-rendered, no JS bundle on first paint. |
| 2 | Magic-link request | \`/auth/magic\` | Form posts to \`/api/auth/request\`. Renders "check your email" state. |
| 3 | Magic-link redeem | \`/auth/redeem?token=…\` | One-time token; sets session cookie; redirects to board. |
| 4 | Team board (home) | \`/board\` | Avatars + "in focus" state. Empty state when nobody is heads-down. |
| 5 | New session picker | \`/focus\` | 4 duration buttons + optional "what are you working on" input. |
| 6 | In-progress view | \`/focus/:sessionId\` | Numeric countdown, drift-corrected against the server clock every 5s. |
| 7 | Session ended | \`/focus/:sessionId/done\` | "Break together" prompt + return to board. |
| 8 | Settings | \`/settings\` | Profile, push permission status, leave team. |
| 9 | Invite | \`/settings/invite\` | Copy link, paste emails, see pending invites. |
| 10 | Plan status | \`/plan\` | "You're on the free tier." Renders the waitlist form once the 50-team cap is reached. No payment code ships in v1. |
| 11 | 404 | catch-all | Branded; preserves header + footer. |

The PWA shell precaches all 11 routes for offline-first navigation. **No screen holds an open socket** — the in-progress view polls \`GET /api/sessions/:id\` every 5s and the board polls every 30s (see §19, realtime websockets are a non-goal).

## 7. Information architecture

\`\`\`
Landing
└─ Auth
   └─ Board ─┬─ Focus picker ── In-progress ── Ended
             ├─ Settings ─── Invite
             └─ Plan
\`\`\`

Top nav: **Board · Settings**. No tabs inside Board (the empty state and active state share the same canvas). Footer: **Privacy · Terms · Contact** on every route.

## 8. Data model

Seven tables. Two of them (\`MagicLinkToken\`, \`AuthSession\`) exist because §14 mandates single-use 15-minute tokens and a revocable server-side session — neither can live in a cookie alone.

\`\`\`
User            Team             Membership       Session
─────           ────             ──────────       ───────
id PK           id PK            id PK            id PK
email UQ        slug UQ          user_id FK       user_id FK
team_id FK      name             team_id FK       team_id FK
display_name    created_at       role             duration_sec
created_at                       joined_at        started_at
last_seen_at                                      ends_at
                                                  ended_at
                                                  status
                                                  intent_text
                                                  cancelled_reason

PushSubscription   MagicLinkToken    AuthSession
────────────────   ──────────────    ───────────
id PK              id PK             id PK
user_id FK         email             user_id FK
endpoint UQ        token_hash UQ     created_at
p256dh key         expires_at        expires_at
auth key           used_at           revoked_at
created_at         created_at        ua_hash
\`\`\`

### 8.1 Field-level constraints

| Table | Field | Constraint |
|---|---|---|
| User | email | unique, lowercased on insert, max 254 chars (RFC 5321) |
| User | display_name | 1–48 chars, allows unicode, trimmed |
| Team | slug | \`/^[a-z0-9-]{3,32}$/\`, generated, never user-input |
| Team | name | 1–64 chars |
| Session | duration_sec | enum: 900, 1500, 2700, 3600 |
| Session | status | enum: in_progress, ended, cancelled |
| Session | intent_text | optional, 0–140 chars, control characters stripped |
| Membership | role | enum: member, lead |
| MagicLinkToken | token_hash | SHA-256 of the 32-byte token; the raw token is never stored |
| MagicLinkToken | used_at | NULL until redeemed; redemption is a single UPDATE … WHERE used_at IS NULL |
| AuthSession | expires_at | 30-day idle window, extended on touch |
| AuthSession | revoked_at | set by logout and by privilege change; checked on every request |

### 8.2 Indexes

- \`User(team_id)\` — board query.
- \`Session(team_id, status, ends_at)\` — board query (in-progress only, ordered by remaining time).
- \`Session(user_id, started_at DESC)\` — user's recent history (settings).
- \`Membership(team_id, role)\` — lead lookups (tiny, but indexed for symmetry).
- \`PushSubscription(user_id)\` — fan-out at session end.
- \`MagicLinkToken(token_hash)\` — unique; the redeem path's only lookup.
- \`AuthSession(user_id, revoked_at)\` — logout-all and revocation sweeps.

### 8.3 Migrations

D1 with Drizzle. All migrations **forward-only** — there is no \`down()\`. A schema mistake is corrected by writing the next migration, or by \`wrangler d1 time-travel restore\`. Six migrations land in v1:

1. \`0001_init\` — User, Team, Membership, MagicLinkToken, AuthSession.
2. \`0002_session\` — Session table.
3. \`0003_push\` — PushSubscription.
4. \`0004_session_intent\` — adds \`intent_text\` (nullable).
5. \`0005_session_indexes\` — covering indexes from §8.2.
6. \`0006_user_last_seen\` — adds \`last_seen_at\`. Nullable with **no** default: SQLite refuses a non-constant \`DEFAULT\` on \`ALTER TABLE … ADD COLUMN\`, so the app writes \`CURRENT_TIMESTAMP\` on session touch rather than the schema doing it.

## 9. API surface

Five groups. All endpoints are JSON-over-HTTPS. Auth: signed session cookie (\`__Host-hd_sess\`) that carries an \`AuthSession.id\`; the row is the authority, the cookie is just a pointer. All responses include \`X-Request-Id\` for log correlation.

### 9.1 Auth

- \`POST /api/auth/request\` — body: \`{email}\`. Writes a \`MagicLinkToken\` row and emails the link. Returns 202 always (no enumeration). Rate-limit: 5/min/IP, 10/hour/email.
- \`GET /api/auth/redeem?token=…\` — hashes the token, finds the row where \`used_at IS NULL AND expires_at > now\`, stamps \`used_at\`, creates an \`AuthSession\`, sets the cookie, redirects to \`/board\`.
- \`POST /api/auth/logout\` — clears the cookie **and** sets \`AuthSession.revoked_at\`. Clearing the cookie alone would leave a valid server session behind.

### 9.2 Sessions

- \`POST /api/sessions/start\` — body: \`{duration_sec, intent_text?}\`. Creates the session via the team's Durable Object, \`@team:{slug}\` — **one DO per team**, not per session. Returns \`{id, ends_at, server_now}\`. Errors: \`409 already_in_session\`, \`422 invalid_duration\`.
- \`POST /api/sessions/:id/end\` — marks \`status='ended'\`, fans out push to all teammates with valid subscriptions. Idempotent.
- \`POST /api/sessions/:id/cancel\` — body: \`{reason?}\`. Marks \`status='cancelled'\`. No fan-out.
- \`GET /api/sessions/:id\` — returns the canonical session object (drift correction reads this every 5s). \`Cache-Control: no-store\`.

### 9.3 Team / board

- \`GET /api/teams/:slug/board\` — returns \`{members: [{user_id, display_name, session?}]}\`. \`Cache-Control: max-age=30, stale-while-revalidate=60\`. The board polls this every 30s; SWR keeps the UI snappy on every network hop.
- \`GET /api/teams/:slug\` — team metadata.
- \`POST /api/teams/:slug/invite\` — body: \`{emails: string[]}\`. Sends invite emails, returns pending list.
- \`POST /api/teams/:slug/leave\` — current user leaves the team. If they are the last lead, promotes the longest-tenured member.

### 9.4 Push

- \`POST /api/push/subscribe\` — body: \`{endpoint, keys: {p256dh, auth}}\`. Idempotent on \`endpoint\`.
- \`DELETE /api/push/subscribe\` — removes the current subscription.

### 9.5 Health + waitlist

- \`GET /api/health\` — returns \`{ok, version, uptime_s}\`. \`Cache-Control: no-store\`. Used by manual smoke and the Cloudflare health monitor.
- \`POST /api/waitlist/join\` — body: \`{email}\`. Only reachable once the 50-team cap is hit. No payment fields.

### 9.6 Error envelope

All non-2xx responses use a stable envelope:

\`\`\`json
{
  "error": "snake_case_machine_code",
  "message": "Human-readable string for the UI",
  "request_id": "01HK4..."
}
\`\`\`

The browser surfaces \`message\`; structured handlers branch on \`error\`.

## 10. Permissions

Two roles per team — **member** and **lead** — set on \`Membership.role\`. v1 has minimal lead-only behaviour (it's a forward-compat slot for v2).

| Action | Member | Lead |
|---|---|---|
| Read team board | ✓ | ✓ |
| Start own session | ✓ | ✓ |
| Cancel own session | ✓ | ✓ |
| Invite | ✓ | ✓ |
| Remove a member | ✗ | ✓ (v2) |
| Rename team | ✗ | ✓ (v2) |
| Delete team | ✗ | ✓ (v2) |
| See anyone's focus history | ✗ | ✗ (never — §4.3) |

Cross-team access is impossible by construction: every authenticated request resolves a single \`team_id\` from the \`AuthSession\` row; queries filter on it server-side. No client-side claim is trusted.

## 11. Push protocol

Web Push (VAPID) directly — no third party (OneSignal etc.). Subscriptions are stored per-user with a soft-delete on 410 Gone from the push service.

### 11.1 Permission UX

The browser permission prompt fires on the user's first *Start session* tap, inside the click handler, not on page load and not on signup. This is mandatory on iOS (PWAs require a user gesture in the same task) and is also strictly better UX — we ask once we have evidence the user wants the feature. **Denying it must never block starting a session.**

### 11.2 Payload

\`\`\`json
{
  "type": "session_ended",
  "team_slug": "acme",
  "actor": {"name": "Alex", "avatar_letter": "A"},
  "request_id": "01HK4...",
  "url": "https://headsdown.app/break"
}
\`\`\`

The Service Worker renders a system notification titled "Alex finished a focus block" with a "Take a break together" action that opens the URL.

### 11.3 Failure handling

- 410 Gone → soft-delete the subscription.
- 413 Payload too large → log + drop (we should never send a payload large enough to trigger this; it's a safety net).
- 5xx from the push service → retry ×3 with exponential backoff (2s/8s/32s) **inside the Durable Object's \`alarm()\` handler**, which is already awake; then drop and log. Cloudflare Queues would be the tidier mechanism but requires the Workers Paid plan, which §23.3 keeps us off.

## 12. Accessibility

- Target: WCAG 2.2 AA on every screen.
- Focus order matches DOM order on every interactive screen.
- The live timer announces minute-boundary changes via \`aria-live="polite"\` — not every second, which would be deafening.
- \`prefers-reduced-motion: reduce\` **disables the circular progress ring entirely**; the numeric countdown remains and is the primary readout for every user. This is an acceptance criterion on design sprint 2, not a nice-to-have.
- Color is never the sole signal of state — every "in focus" avatar has a visible ring **and** a text label.
- Touch targets minimum 44×44 CSS px on mobile.
- Every icon has a visible label or an \`aria-label\`.

axe-core runs in CI on every PR; the Lighthouse CI budget pins accessibility ≥ 95.

## 13. Performance budget

| Metric | Budget | Strategy |
|---|---|---|
| Largest Contentful Paint (mobile) | ≤ 1.8 s | server-rendered HTML; critical CSS inline; no blocking JS in head. |
| Interaction to Next Paint | ≤ 200 ms | hydration deferred until idle; the timer is progressively enhanced. (INP replaced FID as a Core Web Vital in March 2024.) |
| Cumulative Layout Shift | ≤ 0.05 | font-size locked from first paint; image dimensions declared. |
| JS bundle (board route) | ≤ 38 KB gzipped | SvelteKit; no dependency above 4 KB without written justification. |
| Worker CPU / request | ≤ 12 ms p95 | board read served from edge cache; only Durable Object writes pay full latency. |

Lighthouse CI runs on every PR (mobile preset). A failing budget blocks merge.

## 14. Security & privacy

- Magic-link tokens: 32 bytes from \`crypto.getRandomValues\`, single-use, 15-minute TTL, stored only as a SHA-256 hash (§8), compared in constant time.
- Session cookie: \`__Host-\` prefix, \`HttpOnly\`, \`Secure\`, \`SameSite=Strict\`; the row it points at is revocable.
- CSRF: same-site cookie + same-origin check on every mutation; no separate token.
- CSP: \`default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'\` — enforced from day one, no report-only. The app only ever calls itself, so \`connect-src 'self'\` is the whole allowlist.
- HSTS: \`max-age=63072000; includeSubDomains; preload\`.
- Third-party scripts: zero. No analytics SDK, no live-chat widget, no font CDN.
- PII inventory: email, display name, team membership. **Not** stored: IP (only in Cloudflare logs, retained 3 days on the free plan), location, device fingerprint.
- Subprocessors: **Cloudflare** (compute, edge, DNS, DNS-level analytics), **Resend** (transactional email), and the **push services** the browser picks (Apple, Mozilla, Google — they receive a user-supplied endpoint and an encrypted payload, no PII).

## 15. Observability

- **Structured logs** — Workers Logs, one JSON line per request with \`request_id\`, \`route\`, \`status\`, \`duration_ms\`, \`team_id\` (hashed), \`user_id\` (hashed). Free plan: 200k events/day, 3-day retention. That is the budget; at 50 teams we are nowhere near it.
- **Counters** — derived by querying Workers Logs, not by writing to Workers Analytics Engine (which needs the Workers Paid plan). §16's event names are log fields.
- **Client errors** — Sentry free tier (browser SDK only, 5k events/month), loaded after consent-free cookieless init.
- **Traces** — Workers' built-in trace per invocation; outbound calls (D1, DO, Resend, Push) show as subrequests.
- **Alerts** — Cloudflare Notifications → email + a Slack incoming webhook. See the deploy runbook §4.

## 16. Telemetry events

Every event is a log field, not a third-party beacon. Used for §3 success metrics.

| Event | Payload | Sampling |
|---|---|---|
| \`signup\` | \`{team_new: bool}\` | 100% |
| \`session.started\` | \`{duration_sec, has_intent: bool}\` | 100% |
| \`session.ended\` | \`{duration_sec, completed_pct}\` | 100% |
| \`session.cancelled\` | \`{duration_sec, completed_pct, reason?}\` | 100% |
| \`push.permission.prompted\` | \`{}\` | 100% |
| \`push.permission.granted\` | \`{}\` | 100% |
| \`push.permission.denied\` | \`{}\` | 100% |
| \`push.delivered\` | \`{recipients}\` | 100% |
| \`board.view\` | \`{teammates_visible}\` | 10% |
| \`waitlist.joined\` | \`{}\` | 100% |

Telemetry never includes raw email or display name.

## 17. SLO / SLI

| SLI | Window | Target |
|---|---|---|
| Board availability (\`GET /api/teams/:slug/board\` 2xx rate) | 28d rolling | ≥ 99.9% |
| Session-start success | 28d rolling | ≥ 99.95% |
| Push delivery latency (DO commit → push enqueued) | p99 | ≤ 500 ms |
| Magic-link delivery (request → email received) | p95 | ≤ 8 s |
| DO alarm-miss rate | 24h | ≤ 0.01% |

Error budget = 1 − target. The alerting that evaluates these lives in the deploy runbook §4; note that on day 1 only the first one is actually wired.

## 18. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Push unreliable on iOS Safari | Med | High | First-tap permission flow; PWA must be installed to home screen; in-app fallback toast on session end. |
| R2 | DO single-region adds latency for APAC users | Med | Med | Accept for v1; revisit after the first APAC-heavy team onboards. |
| R3 | 50-team soft cap exceeded before a paid tier exists | Low | High | Cap enforced server-side; over-cap signups go to a waitlist (§5). |
| R4 | Magic-link email goes to spam | Med | Med | SPF/DKIM/DMARC on day one; Resend domain warmed 14d before public launch. |
| R5 | Resend free tier is 100 emails/day | Med | Med | 50 teams × 30 people re-requesting links could clip it. Alert at 70/day; the paid tier is \\$20/mo if it lands. |
| R6 | DO cold start adds ~200 ms to the first session of the day | Low | Low | Acceptable; surfaced in observability. |

## 19. Non-goals (v1)

- **Realtime websockets.** 30s board polling + 5s session polling + edge cache is enough at our cohort sizes. No screen opens a socket.
- **Any billing code.** No Stripe, no payment fields, no subscription model, not even behind a flag. Cap → waitlist. Revisited only when someone asks to pay.
- **Native mobile apps.** PWA covers iOS + Android.
- **Per-user productivity analytics.** Fundamental anti-persona conflict (§4.3).
- **Slack bot.** Incoming-webhook integration in v1.5; full bot in v2.
- **Calendar integration.** Researched and rejected — too much OAuth surface for the value.
- **Multiple teams per user.** A user belongs to exactly one team. v2 adds team switching.
- **Public team board.** Boards are always behind auth.

## 20. Open questions resolved during discovery

- Timezone display: **user-local** (Phase 2, founder).
- Push permission UX: **prompt on first session, not signup** (Phase 2, founder).
- Paid tier in v1: **no** — "free with a soft cap" means no billing code at all, not a stubbed checkout (Phase 1 gate, founder).
- Reporting for team leads: **never** — see §4.3.
- Should the board show "ended X minutes ago" for finished sessions? **No.** The board shows *now* only.
- Weekly "your team focused N hours" digest emails? **No in v1**; revisit after measuring push opt-in.

## 21. Glossary

- **Block** — a single focus session of 15/25/45/60 min.
- **Board** — the team's shared view of who is currently in a block.
- **DO** — Cloudflare Durable Object. **One per team**, owning that team's timer state and \`alarm()\`.
- **Heads-down** — the in-progress state of a session (visible on the board).
- **Magic link** — passwordless sign-in via an emailed one-time URL.
- **Nudge** — the browser push fired on session end.
- **Soft cap** — the server-enforced 50-team limit above which signups go to a waitlist rather than failing.

## 22. Change log

| Version | Timestamp | Change |
|---|---|---|
| 0.1 | 2026-04-08 10:31 | Phase 1 discovery output (\`/oc-discover\`), incl. the §4.3 hard line and the no-billing constraint. |
| 0.2 | 2026-04-08 10:52 | oc-stack-forge decision folded in. §11.3, §15 and §16 rewritten onto free-plan services; §8 gained MagicLinkToken + AuthSession once §14's token rules had nowhere to live. |

Later phases amend this document through the checkpoint rather than by hand; §23.1 is the authority on where the session actually is.

## 23. Checkpoints, spec files, and USER setup

### 23.1 Progress table

\`.checkpoints/oc-app-architect.checkpoint.json\` carries a \`progress_table\` with one row per gate:

\`\`\`
discovery · spec · spec-gate · design · design-gate · punch-list ·
punch-gate · sprint-plan · sprint-gate · scaffold ·
sprint-1 · sprint-2 · sprint-3 · sprint-4 · sprint-5 · sprint-6 · launch
\`\`\`

\`/checkpoint show\` prints the table with each row's status and \`next_actions\`. \`/checkpoint reset <id>\` clears that row and everything after it, so the session resumes from there without context loss. There is no replay command and no way to re-run a gate you already passed except by resetting it.

### 23.2 Spec files

This document is the assembled view. The real output is eleven files:

| File | Size | Source |
|---|---|---|
| \`spec/00-project-overview.md\` | 4.1 KB | \`/oc-discover\` |
| \`spec/01-tech-stack.md\` | 3.4 KB | oc-stack-forge |
| \`spec/02-data-model.md\` | 2.9 KB | \`/oc-spec\` |
| \`spec/03-api-surface.md\` | 3.7 KB | \`/oc-spec\` |
| \`spec/04-permissions.md\` | 1.1 KB | \`/oc-spec\` |
| \`spec/05-ux-notes.md\` | 2.2 KB | \`/oc-spec\`, superseded in Phase 3 by \`design/design-spec.md\` |
| \`spec/06-testing.md\` | 2.6 KB | \`/oc-qa pyramid\` |
| \`spec/07-security-privacy.md\` | 2.8 KB | \`/oc-spec\` |
| \`spec/08-observability.md\` | 1.9 KB | \`/oc-spec\` |
| \`spec/09-cost-estimate.md\` | 1.2 KB | oc-stack-forge |
| \`spec/10-documentation-plan.md\` | 0.9 KB | \`/oc-spec\` |

\`/oc-export-spec\` concatenates them into \`master-spec.docx\` for anyone who wants a document rather than a repo.

### 23.3 USER setup tasks

The scaffold is runnable only after five things that must be done by a human with the account:

1. \`wrangler login\` — the Cloudflare session. Nothing here uses an API token.
2. \`wrangler d1 create heads-down-db\` → paste the \`database_id\` into \`wrangler.jsonc\`.
3. \`wrangler kv namespace create RATE_LIMIT\` → paste the \`id\`.
4. **Resend account + \`RESEND_API_KEY\`.** In dev, leave it unset: the magic link prints to the console instead of sending.
5. \`npx web-push generate-vapid-keys\` → \`wrangler secret put VAPID_PRIVATE_KEY\`, public key into \`wrangler.jsonc\` vars.

Custom domain comes later, at the production deploy. Everything else — D1, KV, Durable Objects, Workers, Workers Logs — is provisioned by \`wrangler deploy\` on the free plan at \\$0.`,
    },
    {
      id: "stack-decision",
      label: "Stack decision + scorecards",
      kind: "decision.md",
      body:
`# Stack Decision — Heads Down

**Produced by** oc-stack-forge on behalf of oc-app-architect, Phase 2 · **Decision date** 2026-04-08 10:41 · **Re-evaluation triggers** §8 · **Order evaluated** platform → backend → database → auth → frontend

## 0. Evidence gathered before scoring

Per the skill's first rule — web search before answering — two searches moved a score:

\`\`\`
Searched "SvelteKit 2 Cloudflare Workers adapter 2026"
  → @sveltejs/adapter-cloudflare 5.x (Jan 2026): static-assets binding,
    no more Pages-vs-Workers split. Frontend "Tooling" 7 → 8.
Searched "Cloudflare Durable Objects free plan alarms 2026"
  → SQLite-backed DOs + alarm() are on the Free plan since Apr 2025.
    Queues are NOT (Workers Paid, $5/mo). Backend "Timer primitive" 10,
    but §11.3 of the spec must retry inside alarm(), not via Queues.
\`\`\`

## 1. How the scoring works

Each candidate scores 1–10 per criterion. Weights are **per layer** — the criteria that decide a frontend are not the criteria that decide a backend — and every scorecard states its own weight vector in the caption so the arithmetic is checkable. Four weights recur, drawn from the brief: **1.5×** for a criterion the product cannot exist without (mobile weight, server-authoritative timer, mobile auth UX), **1.0×** for a first-order constraint (hydration cost, cold start, cost at the 50-team cap), **0.7×** for a preference (tooling maturity, lock-in, DX), and **0.5×** for something we noted but do not really believe in yet (hire pool — she is the only engineer).

## 2. Frontend scorecard

*Weights: Mobile 1.5 · Hydration 1.0 · Tooling 0.7 · Hire pool 0.5 · Lock-in 0.7 (max 44.0)*

| Candidate | Mobile | Hydration | Tooling | Hire pool | Lock-in | Weighted |
|---|---:|---:|---:|---:|---:|---:|
| **SvelteKit** | **9** | **10** | 8 | 7 | 8 | **38.2** |
| Astro + islands | 8 | 9 | 7 | 5 | 8 | 34.0 |
| Remix | 7 | 8 | 8 | 8 | 7 | 33.0 |
| Next.js | 6 | 6 | **10** | **10** | 6 | 31.2 |
| Nuxt | 7 | 7 | 7 | 7 | 7 | 30.8 |

**Pick:** SvelteKit + Tailwind. Smallest JS on mobile — the IC's device 30% of the time. Hydration predictability matters for a visible countdown. Astro was second but its islands model is awkward for the in-progress view, which is one big interactive surface. Tailwind rides along because the design system is 18 tokens and a utility layer is cheaper than authoring a component CSS architecture for a solo founder.

## 3. Backend scorecard

*Weights: Cold-start 1.0 · Timer primitive 1.5 · Cost @ 50 teams 1.0 · Tooling 0.7 · Lock-in 0.7 (max 49.0)*

| Candidate | Cold-start | Timer primitive | Cost @ 50 teams | Tooling | Lock-in | Weighted |
|---|---:|---:|---:|---:|---:|---:|
| **CF Workers + D1 + DO** | **10** | **10** (DO alarm) | **10** (\\$0) | 7 | 7 | **44.8** |
| Fly.io + Postgres + Redis | 6 | 8 (cron + Redis) | 6 (\\$24/mo) | 8 | 9 | 35.9 |
| Vercel + Neon + QStash | 7 | 7 | 6 | 9 | 6 | 34.0 |
| Supabase | 6 | 6 (Edge fn + pg_cron) | 7 (\\$25/mo over free) | 8 | 5 | 31.1 |
| Lambda + RDS + EventBridge | 5 | 7 | 4 | 6 | 6 | 27.9 |

**Pick:** Cloudflare Workers + D1 + Durable Objects. DO is purpose-built for the server-authoritative timer — one DO per team, \`alarm()\` at \`ends_at\` for the end-of-block fan-out. The free plan covers the 50-team soft cap with headroom, and the database (D1) comes with the compute rather than as a second vendor.

## 4. Auth scorecard

*Weights: Mobile UX 1.5 · Cost @ 50 teams 1.0 · Lock-in 0.7 · DX 0.7 (max 39.0)*

| Candidate | Mobile UX | Cost @ 50 teams | Lock-in | DX | Weighted |
|---|---:|---:|---:|---:|---:|
| **Magic link via Resend (in-house)** | **9** | **10** (\\$0) | **9** | 8 | **35.4** |
| Clerk | 8 | 5 | 4 | **10** | 26.8 |
| WorkOS | 8 | 4 | 6 | 8 | 25.8 |
| Auth0 | 7 | 5 | 4 | 9 | 24.6 |

**Pick:** in-house magic link — **and this is an exception to my own rule.** My auth decision table says *"Roll your own — never, unless you have a specific reason."* The reason, stated so a reviewer can disagree with it: the flow is one token table, one hash compare, one cookie — under 200 lines with no password, no reset flow, no session-fixation surface of our own invention; the alternative I would normally reach for (Lucia) went into maintenance mode in 2025; and every hosted option prices per MAU, which inverts the economics of a free product with a 50-team cap. The trade we accept is that token handling is now **our** bug: §14 pins the token rules and the pre-deploy audit checks them.

## 5. Email transport

*Weights: Deliverability 1.0 · Cost @ 50 teams 1.0 · DX 0.7 (max 27.0)*

| Candidate | Deliverability | Cost | DX | Weighted |
|---|---:|---:|---:|---:|
| **Resend** | 9 | **10** | **9** | **25.3** |
| Postmark | 9 | 7 | 8 | 21.6 |
| AWS SES | 8 | **10** | 5 | 21.5 |

**Pick:** Resend. Free tier is 3,000 emails/month and **100/day** — the day cap is the binding one and it becomes risk R5 in the spec. Alert at 70/day; \\$20/mo Pro if we clip it.

## 6. Observability

*Weights: Workers integration 1.0 · Cost 1.0 · Lock-in 0.7 (max 27.0)*

| Candidate | Workers integration | Cost | Lock-in | Weighted |
|---|---:|---:|---:|---:|
| **Workers Logs (free) + Sentry free tier** | **10** | **10** | 9 | **26.3** |
| Workers Logs + Analytics Engine | **10** | 5 (needs Workers Paid) | 9 | 21.3 |
| Baselime | 9 | 7 | 7 | 20.9 |
| Honeycomb | 8 | 6 | 6 | 18.2 |
| Datadog | 9 | 4 | 4 | 15.8 |

**Pick:** Workers Logs for server-side (200k events/day, 3-day retention on Free), Sentry's free tier for browser errors only. **Analytics Engine and Logpush are both off the table** — they need the Workers Paid plan, and Logpush is Enterprise. Counters in spec §16 are therefore log queries, not metric writes.

## 7. Estimated monthly cost

| Tier | When it applies | Cloudflare | Resend | Total |
|---|---|---|---|---|
| **Free** | ≤ 50 teams, ≲ 30k req/day, ≲ 70 emails/day | Workers Free (100k req/day), D1 Free (5 GB), KV Free (100k reads/day), DO + alarms, Workers Logs | Free (3k/mo, 100/day) | **\\$0** |
| Growth | > 100k req/day, or the day you want Queues / Analytics Engine | Workers Paid \\$5 | Resend Pro \\$20 | **\\$25** |
| Scale | > 200 teams | Workers Paid \\$5 + D1 usage ≈ \\$12 | Resend Pro \\$20 | **≈ \\$37** |

The 50-team soft cap exists partly to keep us inside row one until someone asks to pay.

## 8. Anti-picks (rejected, with reason recorded)

- **Next.js** — the board route would ship ~80 KB of framework before our code; SvelteKit ships ~18 KB. We need neither ISR nor server actions.
- **Supabase** — four lock-in vectors (auth, DB, realtime, storage) with no corresponding win here.
- **Firebase** — cost nonlinearity past the free tier; no clean exit from the Firestore data model.
- **RDS Postgres** — HA ops overhead without the scale to justify it.
- **Clerk** — best DX of the auth options; per-MAU pricing makes the soft-cap economics ugly.
- **Cloudflare Queues** — right shape, wrong plan. Retry moves into \`alarm()\` (spec §11.3).

## 9. Re-evaluation triggers

| Trigger | Reconsider |
|---|---|
| > 200 paying teams | D1 row limits + DO single-region latency for APAC. Possibly Postgres + multi-region DO. |
| Slack bot promoted to first-class | Auth + permission model expands; revisit the auth provider for an OAuth-into-Slack flow. |
| Push fan-out backlog > 5,000/min | DO write contention; revisit with Queues on Workers Paid. |
| Resend day cap clipped twice in a week | Move to Resend Pro, or split invite mail from magic-link mail. |
| Founder hires a second engineer | Re-weight "Hire pool" from 0.5 and re-run §2. |

## 10. Versions pinned

\`\`\`
svelte@5.5.x
@sveltejs/kit@2.16.x
@sveltejs/adapter-cloudflare@5.x
tailwindcss@4.0.x
wrangler@4.0.x
drizzle-orm@0.36.x
resend@4.0.x
@block65/webcrypto-web-push@1.x   # WebCrypto VAPID; the npm "web-push"
                                  # package needs node:crypto + node:https
                                  # and therefore the nodejs_compat flag
\`\`\`

Cloudflare compat date: \`2026-04-01\`.

Checkpoint \`.checkpoints/oc-stack-forge.checkpoint.json\` written with \`skill_state.decisions.{platform, backend, database, auth, frontend}\`; oc-app-architect reads it for the Phase 2 spec and the Phase 3 design brief.`,
    },
    {
      id: "sprint-1-contract",
      label: "Sprint 1 contract (negotiated before any code)",
      kind: "contract.md",
      body:
`# sprints/sprint-1/contract.md — Auth + team creation

**Phase 6 Step 1** · agreed 2026-04-08 13:06 · **Budget** CLAUDE 25 min | USER 5 min

## Deliverables

1. \`/\` landing with a "Start your team" CTA (server-rendered, no JS on first paint).
2. \`POST /api/auth/request\` — writes a \`MagicLinkToken\` row, emails the link via Resend, returns 202 unconditionally.
3. \`GET /api/auth/redeem\` — single-use, 15-minute TTL, creates an \`AuthSession\`, sets \`__Host-hd_sess\`, redirects to \`/board\`.
4. First-redeem team creation: prompt for a team name, generate a URL-safe slug.
5. D1 migration \`0001_init\` (User, Team, Membership, MagicLinkToken, AuthSession) + test fixtures.

## Testable acceptance criteria

The Evaluator scores **Feature Completeness** directly against this list. A criterion is either demonstrably true from a test or it is not met.

| # | Criterion | How it is proven |
|---|---|---|
| 1 | A token can be redeemed exactly once, and never after 15 minutes. | \`tests/auth/redeem.test.ts\` — second redeem returns 410; clock advanced 16 min returns 410. |
| 2 | \`POST /api/auth/request\` is rate-limited to 5/min/IP and 10/hour/email, backed by KV. | \`tests/auth/ratelimit.test.ts\` — 6th request in a minute returns 202 with no email queued. |
| 3 | Two teams whose names collide after slugification get distinct slugs. | \`tests/team/slug.test.ts\` — 1,000 fuzzed unicode names, zero duplicate slugs. |

## Test requirements

- Unit: email normalisation, token hashing, slug generation, rate-limit window arithmetic.
- Integration: request → redeem → cookie → \`/board\` against \`wrangler dev --local\` with D1 local.
- Fixtures: \`RESEND_API_KEY\` unset in test; the mailer records to an in-memory outbox.

## Definition of done

- \`vitest run\` green, \`tsc --noEmit\` clean, \`eslint\` clean.
- All three acceptance criteria have a named passing test.
- Evaluator Code Score ≥ 6 on **every** criterion (not just the weighted mean).

## Explicitly out of scope

Invite emails (sprint 1 creates the team, not the invitations), the board's contents, push, and anything resembling billing.`,
    },
    {
      id: "eval-sprint-4-round-1",
      label: "Sprint 4 — Evaluation Round 1 (FAIL)",
      kind: "eval-round.md",
      body:
`# sprints/sprint-4/eval-round-1.md

**Sprint** 04 · Browser push + opt-in UX · **Round** 1 of 2 · **Evaluated** 2026-04-08 14:22 · **Generator diff** \`+221 / −12\` across 6 files

## Code Scores

| Criterion | Weight | Score | Note |
|---|---:|---:|---|
| Functionality | 30% | **4/10** | The permission prompt never reaches an iOS user; the denied path is a 403. |
| Feature Completeness | 30% | **5/10** | Contract criterion 2 not met (below). |
| Code Quality | 20% | 6/10 | One TODO left in the fan-out path; otherwise readable. |
| Visual / UX | 20% | 6/10 | The denied state has no UI at all — the user sees a raw error toast. |

**Code Score** = 0.3·4 + 0.3·5 + 0.2·6 + 0.2·6 = **5.1/10**

## Design Scores (UI sprint — Design Evaluator auto-attached)

| Criterion | Score | Note |
|---|---:|---|
| Visual Hierarchy | 7/10 | Permission card competes with the duration picker for the same eye position. |
| State Completeness | **4/10** | Three of the four permission states are unrendered: \`denied\`, \`default-after-dismiss\`, \`unsupported\`. |
| Consistency | 8/10 | Uses \`NudgeToast\` correctly. |
| Accessibility | **6/10** | The permission card is announced as a bare "button"; below the 7/10 accessibility floor. |

**Design Score** = mean(7, 4, 8, 6) = **6.25/10**

## Test Results

\`\`\`
$ pnpm vitest run tests/push
 ✓ tests/push/subscribe.test.ts       (4)
 ✓ tests/push/fanout.test.ts          (5)
 ✓ tests/push/permission.test.ts      (4)
 ↓ tests/push/ios-gesture.test.ts     (1) [skipped]

 Test Files  3 passed | 1 skipped (4)
      Tests  13 passed | 1 skipped (14)
   Duration  2.31s
\`\`\`

The skip is \`test.skip("prompt survives an iOS PWA cold start")\` — it cannot be asserted in the Workers test runner and is not a substitute for a device check. It stays skipped and becomes a USER item.

## Bugs found

**[F-1] Permission prompt fires at module load, not inside the click handler.**
\`src/lib/push/permission.ts:8\`
\`\`\`ts
// module scope — runs on import, before any user gesture exists
const granted = await Notification.requestPermission();
\`\`\`
Repro: open \`/focus\` in iOS Safari as an installed PWA → prompt never appears, \`Notification.permission\` stays \`"default"\`, no error is thrown. Silent failure for ~30% of the target users.

**[F-2] A denied permission blocks starting a session.**
\`src/routes/api/sessions/start/+server.ts:34\`
\`\`\`ts
if (!subscription) return json({ error: "push_permission_required" }, { status: 403 });
\`\`\`
Repro: deny the prompt, tap Focus → 403. Spec §11.1 says denial must never block a session; this makes the timer — the one hard requirement of the product — contingent on a notification permission.

**[F-3] 410 Gone from the push service is logged, not soft-deleted.**
\`src/lib/push/fanout.ts:41\` — \`// TODO: soft-delete on 410\`. Dead endpoints accumulate and every future fan-out pays for them.

## Gaps vs contract

| # | Criterion | Verdict |
|---|---|---|
| 1 | The prompt is requested inside a user gesture on first Focus tap. | **FAIL** — see F-1. |
| 2 | A denied permission still allows \`POST /api/sessions/start\`, with an in-app fallback at session end. | **FAIL** — see F-2; no fallback UI exists. |
| 3 | A 410 from the push service removes the subscription. | **FAIL** — see F-3. |

## Verdict: FAIL

Functionality 4 and Feature Completeness 5 are both under the 6/10 floor; Design State Completeness 4 and Accessibility 6 are under the design floor. Three actions for round 2:

1. Move \`requestPermission()\` into the Focus button's click handler and assert the call site in a test that fails if it moves back to module scope.
2. Delete the 403. Start the session, record \`push.permission.denied\`, and render the in-app toast at \`ends_at\` instead.
3. Implement the 410 soft-delete and render the three missing permission states with labelled controls.`,
    },
    {
      id: "sprint-ledger",
      label: "Sprint ledger (Generator/Evaluator scores)",
      kind: "ledger",
      body:
`# Sprint Ledger — Heads Down

Generator proposes, Evaluator grades against the sprint contract, loop repeats until every criterion clears its floor. Per-round reports live at \`sprints/sprint-N/eval-round-M.md\`; scores are mirrored into \`.checkpoints/oc-app-architect.checkpoint.json\` under \`skill_state.scores\`.

## 1. Scoreboard

| Sprint | Rd | Func | Compl | Qual | UX | **Code** | Design | Verdict | Tests | Duration |
|---|---:|---:|---:|---:|---:|---:|---:|---|---|---:|
| 01 · Auth + team creation | 1 | 6 | **5** | 6 | 7 | **5.9** | — | FAIL | 14 passed | |
| | 2 | 8 | 8 | 7 | 7 | **7.6** | — | PASS | 22 passed | 31 min |
| 02 · Session timer (one DO per team) | 1 | 9 | 8 | 8 | 7 | **8.1** | — | PASS | 14 passed | 19 min |
| 03 · Team board + polling | 1 | 9 | 9 | 8 | 8 | **8.6** | 7.75 | PASS | 11 passed | 17 min |
| 04 · Browser push + opt-in UX | 1 | **4** | **5** | 6 | 6 | **5.1** | **6.25** | FAIL | 13 passed, 1 skipped | |
| | 2 | 8 | 8 | 7 | 7 | **7.6** | 7.50 | PASS | 13 passed, 1 skipped | 34 min |
| 05 · Waitlist + 50-team soft cap | 1 | **5** ✱ | 6 | 7 | 7 | **6.1** | — | FAIL | 12 passed, **1 failed** | |
| | 2 | 8 | 8 | 8 | 7 | **7.8** | — | PASS | 13 passed | 22 min |
| 06 · Empty states, /privacy, /404, a11y | 1 | 9 | 9 | 9 | 8 | **8.8** | 8.50 | PASS | 21 passed | 28 min |

✱ Functionality is capped at 5 whenever a test fails, regardless of how much of the sprint works. See §6.

## 2. Aggregate

- **6 sprints · 9 evaluation rounds · 3 re-evals (50%)**
- **94 tests passing**, 1 skipped (\`tests/push/ios-gesture.test.ts\` — needs a real device, tracked as a USER item)
- Median time per sprint, including re-evals: **25 minutes**
- Total build-loop wall-clock: **2h 31m** (31 + 19 + 17 + 34 + 22 + 28)
- Mean Code Score at PASS: **8.1/10**; lowest PASS: 7.6 (sprints 1 and 4)

A 50% re-eval rate is not a target — there is no target. It is what happened when three of the six sprints shipped a first draft that missed something the contract had already written down.

## 3. Per-sprint detail

### Sprint 01 — Auth + team creation · 31 min

- **Round 1** — 23 files, \`+812 / −0\`, 14 tests, all green. Code Score **5.9 — FAIL** (Feature Completeness 5, under the floor). Three findings: \`src/lib/email.ts:12\` used \`/.+@.+/\` and accepted \`a@b.\`; \`src/routes/api/auth/request/+server.ts:18\` had no limiter at all, so contract criterion 2 was simply absent; \`src/lib/slug.ts:27\` had no collision test, so criterion 3 was unproven.
- **Round 2** — 4 files, \`+118 / −22\`, 8 new tests (22 total). RFC 5322-lite validation; KV-backed limiter at 5/min/IP and 10/hour/email; a 1,000-name unicode fuzz over the slug generator. Code Score **7.6 — PASS**.
- Branch total: \`+930 / −22\` across 24 files.

### Sprint 02 — Session timer (one Durable Object per team) · 19 min

- **Round 1** — 11 files, \`+504 / −31\`, **13 unit + 1 integration** test. The integration test starts a block, discards the client entirely, waits, and re-reads \`GET /api/sessions/:id\` to prove the DO kept counting. Nothing opens a socket; there is no socket to close.
- Code Score **8.1 — PASS**. Deduction on Visual/UX (7) for a countdown that does not announce minute boundaries yet — deferred to sprint 6's a11y sweep with the Evaluator's agreement, recorded in the round report.

### Sprint 03 — Team board + polling · 17 min

- **Round 1** — 9 files, \`+388 / −18\`, 11 tests including a state-machine fuzz over board transitions.
- Code **8.6 — PASS**. Design **7.75 — PASS** (Visual Hierarchy 8, State Completeness 8, Consistency 8, Accessibility 7). The accessibility 7 is the floor exactly: avatar rings pass contrast, but the "in focus" label is only 4.6:1 on Mist and the Evaluator wanted it noted rather than re-rolled.

### Sprint 04 — Browser push + opt-in UX · 34 min

- **Round 1 — FAIL.** Full report attached as its own artifact. Code **5.1**, Design **6.25**. The three findings: the permission prompt ran at module scope (silently dead on iOS), a denied permission returned 403 from \`POST /api/sessions/start\`, and a 410 from the push service was logged instead of soft-deleting the subscription.
- **Round 2** — 4 files, \`+74 / −15\`; **4 tests rewritten, 0 net new** (the old ones asserted the wrong call site). Prompt moved inside the Focus click handler with a test that fails if it moves back; the 403 deleted and replaced by an in-app toast at \`ends_at\`; 410 soft-delete implemented; the three missing permission states rendered with labelled controls. Code **7.6**, Design **7.50 — PASS**.
- Branch total: \`+295 / −27\` across 8 files.

### Sprint 05 — Waitlist + 50-team soft cap · 22 min

- **Round 1 — FAIL on a red test**, not on judgement:

\`\`\`
 ✗ signup › 51st team is redirected to /waitlist
     expected 302, received 200
     tests/auth/redeem.test.ts:88

 Test Files  4 passed | 1 failed (5)
      Tests  12 passed | 1 failed (13)
\`\`\`

  The cap was read but never enforced — \`teamCount()\` was called and the result discarded. Functionality capped at 5, everything else scored honestly (Completeness 6, Quality 7, UX 7) for a weighted **6.1** that still fails, because the floor is per-criterion.
- **Round 2** — the redirect implemented, the cap counter cached in KV with a 5-minute TTL and a cache-bust on team create so the signup path does not \`SELECT count(*)\` per request. 13 tests. Code **7.8 — PASS**.
- No billing code in either round. The sprint creates a waitlist, not a checkout.

### Sprint 06 — Empty states, /privacy, /404, a11y sweep · 28 min

- **Round 1** — 17 files, \`+196 / −44\`, 21 tests including axe-core scans on all 11 routes.
- Code **8.8 — PASS** (highest of the run). Design **8.50 — PASS** (9/9/8/8). The Evaluator's note on the empty states, in full: *"Copy is specific and short. No placeholder text survives. The board empty state still says 'Nobody is heads-down' in a 14px muted grey at 4.3:1 — fix the contrast, keep the words."* Fixed in the same round.

## 4. What the Evaluator caught that the Generator missed

| # | Catch | Sprint | Remediation |
|---:|---|---|---:|
| 1 | \`POST /api/auth/request\` had no rate limit — contract criterion 2 was written and then not built. | 01 r1 | 6 min |
| 2 | Email regex \`/.+@.+/\` accepted \`a@b.\`. | 01 r1 | 4 min |
| 3 | Slug collision path had no test, so criterion 3 was unproven. | 01 r1 | 8 min |
| 4 | Permission prompt at module load — silently dead on iOS. | 04 r1 | 12 min |
| 5 | A denied push permission returned 403 from session start. | 04 r1 | 5 min |
| 6 | The 51st-team redirect was never wired; the contract's own test went red. | 05 r1 | 9 min |

Mean remediation: **7.3 minutes.** Five of the six were regressions against a criterion the contract had already stated — which is the argument for negotiating the contract before generating, not after.

## 5. Generator cost

| | Tokens in | Tokens out |
|---|---:|---:|
| Total across 6 sprints (9 rounds) | ≈ 4.10M | ≈ 610K |
| Mean per sprint | ≈ 683K | ≈ 102K |
| Largest — Sprint 06 (a11y sweep re-reads every route) | 910K | 148K |
| Smallest — Sprint 02 (DO boilerplate from template) | 420K | 71K |

Recorded as \`cost.usd: 38.40\` under the checkpoint protocol 1.1 \`cost\` extension (owner: oc-cost-ops). That is the build loop only — discovery, spec, design, audit and ship are counted separately and bring the session to \\$61.20.

## 6. Evaluator rubric

The Code Evaluator scores four criteria out of 10:

| Criterion | Weight | Floor |
|---|---:|---:|
| Functionality | 30% | ≥ 6 |
| Feature Completeness | 30% | ≥ 6 |
| Code Quality | 20% | ≥ 6 |
| Visual / UX | 20% | ≥ 6 |

A sprint passes only when **every** criterion clears its floor — the weighted mean is a summary, not the gate. Sprint 05 round 1 weighted 6.1 and still failed. **Any failing test caps Functionality at 5**, which makes a red suite an automatic FAIL no matter how complete the feature is.

On UI sprints the **Design Evaluator** auto-attaches and scores Visual Hierarchy / State Completeness / Consistency / Accessibility out of 10, unweighted mean, verdict PASS or ITERATE at a 7.0 floor — with Accessibility held to its own 7/10 minimum, because below that the screen is not finished, it is broken.

\`/status\` renders the current row as e.g. \`8.1/10 (1 round) — 14 tests\`.

## 7. Checkpoint

Each round's full report — diff, test output, findings with \`file:line\`, gaps vs contract, verdict — is written to \`sprints/sprint-N/eval-round-M.md\` and referenced from \`.checkpoints/oc-app-architect.checkpoint.json\`. \`/checkpoint show\` prints the progress table; \`/checkpoint reset sprint-4\` clears sprint 4 and everything after it and the loop resumes from the contract. There is no way to replay a single round in isolation, and nothing overrides an Evaluator verdict.`,
    },
    {
      id: "audit-pre-deploy",
      label: "oc-code-auditor pre-deploy (Grade B)",
      kind: "audit-report.md",
      body:
`# Pre-deploy audit — mara-k/heads-down @ 6f40c1e

**Skill** oc-code-auditor (\`/oc-audit pre-deploy\`), with oc-security-auditor attached for posture · **Run** 2026-04-08 15:31 · **Scope** 7 merged PRs, 2,719 added lines, 6 D1 migrations · **Duration** 4m 12s

## Grade: B

| Severity | Count |
|---|---:|
| CRITICAL | 0 |
| HIGH | 2 |
| MEDIUM | 4 |
| LOW | 7 (listed in the checkpoint, not here) |

**Deploy-gate rule:** \`CRITICAL > 0\` → block. \`HIGH ≤ 3\` → warn and proceed **with explicit user confirmation**. \`HIGH > 3\` → block. This run warns.

---

## [F-001] HIGH — \`Permissions-Policy\` response header missing

\`src/hooks.server.ts:22\`

Five of the six headers spec §14 requires are set. \`Permissions-Policy\` is not, so a compromised or injected subresource could request camera, microphone or geolocation without a policy refusing it first. The CSP makes that hard; it does not make it declared.

\`\`\`ts
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Content-Type-Options", "nosniff");
+ res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
\`\`\`

**Fix:** one line. **Risk if deferred:** low in practice — the app requests none of these APIs and CSP blocks third-party script. Reasonable to defer one deploy.

---

## [F-002] HIGH — magic-link token compared with \`===\`

\`src/lib/auth/token.ts:31\`

\`\`\`ts
return tokenHash === row.token_hash;
\`\`\`

\`===\` on strings short-circuits at the first differing byte. Redeem is unauthenticated and rate-limited only per IP, so an attacker with distributed egress has a timing oracle against a hash they are trying to match. This is exactly the class of bug the stack decision §4 accepted responsibility for when it chose to roll its own auth.

\`\`\`ts
const a = hexToBytes(tokenHash);
const b = hexToBytes(row.token_hash);
return a.byteLength === b.byteLength && crypto.subtle.timingSafeEqual(a, b);
\`\`\`

\`crypto.subtle.timingSafeEqual\` is available in the Workers runtime and needs no compat flag. **Fix:** three lines, one test. **Risk if deferred:** this one should not ship.

---

## [F-003] MEDIUM — \`intent_text\` reaches the push payload unsanitised

\`src/lib/push/payload.ts:18\` — control characters and newlines survive into the Service Worker's notification body. Not XSS (the SW sets \`.body\` as text) but it lets a user inject line breaks into a teammate's system notification. **Fix:** strip \`/[\\u0000-\\u001f]/g\` and hard-cap at 140 chars, matching the §8.1 constraint that the API already enforces on write but the payload builder re-reads from the DO.

## [F-004] MEDIUM — rate-limit key is IP-only

\`src/lib/ratelimit.ts:14\` — \`5/min/IP\` alone means one office behind a shared NAT egress throttles everybody in it, and it is the per-IP half of the contract's criterion 2 that the per-email half was supposed to backstop. The per-email limit exists but is checked second and only on a cache hit. **Fix:** compose the key as \`ip + ":" + sha256(email)\` and check both unconditionally.

## [F-005] MEDIUM — \`GET /api/sessions/:id\` has no cache directive

\`src/routes/api/sessions/[id]/+server.ts:9\` — the drift-correction endpoint returns a user's session state with no \`Cache-Control\`. Spec §9.2 says \`no-store\`; the code says nothing, which leaves an intermediary free to guess. **Fix:** set the header the spec already specifies.

## [F-006] MEDIUM — duplicate index in migration 0005

\`migrations/0005_session_indexes.sql:4\` — \`idx_session_user\` duplicates the index SQLite already creates for the \`user_id\` foreign key declared in \`0002\`. Costs a write on every session insert and buys nothing. Migrations are forward-only, so this is fixed by \`0007_drop_dup_index\`, not by editing 0005. Not urgent.

---

## oc-security-auditor — posture

STRIDE pass over the auth, session and push surfaces. **1 MEDIUM, 0 HIGH.**

- **Spoofing / Elevation** — no path found. Every request resolves \`team_id\` from the \`AuthSession\` row server-side; there is no client-supplied team claim to forge, and no role escalation because v1 grants leads nothing a member lacks.
- **Tampering** — push payloads are VAPID-signed in transport; F-003 is a content issue, not an integrity one.
- **Repudiation** — \`request_id\` on every response and every log line.
- **Information disclosure** — \`POST /api/auth/request\` returns 202 unconditionally; no enumeration. PII inventory matches §14.
- **Denial of service** — F-004 is the notable one.
- **MEDIUM:** the CSP is enforced but has no \`report-to\` endpoint, so a violation in the wild is invisible. Ship a \`/api/csp-report\` sink or accept that the first sign of breakage will be a user complaint.

Infra posture: TLS 1.3 only, HSTS with preload set, no open R2 buckets, no wildcard DNS, Worker secrets not echoed by any route (grepped).

---

## Gate decision

> 0 CRITICAL, 2 HIGH → **warn, proceed with confirmation.**
> 2026-04-08 15:36 — user confirmed after F-002 was fixed and merged as #8. F-001 deferred to the next deploy by explicit decision; F-003 through F-006 queued for sprint 7. Recorded in \`.checkpoints/oc-code-auditor.checkpoint.json\` → \`skill_state.gate_decisions[0]\`.`,
    },
    {
      id: "pr-bundle",
      label: "Seven merged PRs — one per sprint, plus F-002",
      kind: "pull-request",
      body:
`# Pull Request Bundle — mara-k/heads-down

Opened in draft by **oc-git-ops**, one per sprint, after the \`oc-bug-check\` → \`oc-docs-forge\` → \`oc-repo-ops\` rail passed on each branch. Bodies are generated from the sprint contract and the evaluator report, not hand-written. Snapshot taken 2026-04-08 15:47, after \`#8\` (the audit's F-002 fix) was appended.

## Index

\`\`\`
 #1  chore(scaffold): SvelteKit + Workers + D1 skeleton
       merged · +1,214 −0  · 47 files · 9 smoke tests (replaced by #2)
 #2  feat(auth): magic-link signup + team creation          feat/sprint-1-auth
       merged · +930 −22   · 24 files · 22 tests · eval 7.6/10 (2 rounds)
 #3  feat(session): server-authoritative timer, one DO/team feat/sprint-2-timer
       merged · +504 −31   · 11 files · 14 tests · eval 8.1/10 (1 round)
 #4  feat(board): polling team board + heads-down avatars   feat/sprint-3-board
       merged · +388 −18   ·  9 files · 11 tests · eval 8.6 · design 7.75
 #5  feat(push): browser push opt-in on first session       feat/sprint-4-push
       merged · +295 −27   ·  8 files · 13 tests · eval 7.6 · design 7.50 (2 rounds)
 #6  feat(waitlist): 50-team soft cap + waitlist            feat/sprint-5-waitlist
       merged · +406 −7    · 11 files · 13 tests · eval 7.8/10 (2 rounds)
 #7  chore(polish): empty states, /privacy, /404, a11y      feat/sprint-6-polish
       merged · +196 −44   · 17 files · 21 tests · eval 8.8 · design 8.50
 #8  fix(auth): constant-time magic-link token compare      fix/f002-token-compare
       merged · +7 −4      ·  2 files · 1 test rewritten, 0 net new

 Sprint PRs: +2,719 / −149. With #8: +2,726 / −153. Suite: 94 passed, 1 skipped.
\`\`\`

---

## #2 — feat(auth): magic-link signup + team creation

**## Summary**
Passwordless signup. A 32-byte token is emailed, stored only as a SHA-256 hash, redeemable once inside 15 minutes; redemption creates an \`AuthSession\` row and a \`__Host-hd_sess\` cookie. First redeem names the team and generates its slug. Closes sprint 1 of the \`/oc-roadmap\` plan.

**## Changes**
\`\`\`
feat(db): 0001_init — User, Team, Membership, MagicLinkToken, AuthSession
feat(auth): magic-link request + redeem with single-use token semantics
feat(auth): KV rate limit, 5/min/IP and 10/hour/email
feat(team): slug generation from team name, unicode-safe
test(auth): slug fuzz over 1k unicode names; redeem replay + expiry
\`\`\`

**## Documentation**
README "Setup" gains \`RESEND_API_KEY\` (optional in dev — unset prints the link to the console). \`spec/03-api-surface.md\` §9.1 updated to describe \`AuthSession\` revocation on logout. No other user-facing docs touched.

**## Testing**
Evaluated by oc-app-architect evaluator: **7.6/10 (sprint 1, 2 rounds)**. 22 tests. Round 1 failed at 5.9 — the rate limit in contract criterion 2 was missing, the email regex accepted \`a@b.\`, and criterion 3 had no test. All three fixed in round 2. Full report: \`sprints/sprint-1/eval-round-1.md\`.

**## Audit Status**
\`oc-bug-check\`: PASS, 7/7 checks, 4.1s. \`oc-repo-ops verify\`: PASS. The pre-deploy audit (oc-code-auditor) runs once against merged \`main\` at the Phase 7 gate, not per PR.

**## Deployment Notes**
Applies migration \`0001_init\`. Requires \`RESEND_API_KEY\` in staging/production; unset means no mail is sent and requests still return 202. No rollback migration — forward-only.

---

## #3 — feat(session): server-authoritative timer, one Durable Object per team

**## Summary**
\`TeamTimerDO\`, **one instance per team slug**, owns every member's block for that team. \`POST /api/sessions/start\` delegates to it; the DO sets \`alarm()\` at \`ends_at\`. The timer is the server's, not the tab's — the client re-reads \`GET /api/sessions/:id\` every 5s and rewrites the countdown from \`server_now\`.

**## Changes**
\`\`\`
feat(db): 0002_session — Session table with team_id for the board index
feat(do): TeamTimerDO class, storage-backed state, alarm at ends_at
feat(api): sessions start/end/cancel/read with the §9.6 error envelope
test(session): DO restart mid-block preserves state; alarm fires within 2s
\`\`\`

**## Documentation**
\`spec/02-data-model.md\` gains the \`Session\` table. Glossary entry for **DO** corrected to "one per team" in \`spec/00-project-overview.md\` §21.

**## Testing**
Evaluated by oc-app-architect evaluator: **8.1/10 (sprint 2, 1 round)**. 13 unit + 1 integration. The integration test starts a block, discards the client entirely, waits, and re-reads the session — nothing opens a socket, so there is no socket to close.

**## Audit Status**
\`oc-bug-check\`: PASS, 7/7. \`oc-repo-ops verify\`: PASS.

**## Deployment Notes**
Applies \`0002_session\`. Adds the \`TEAM_TIMER\` Durable Object binding + a \`new_sqlite_classes\` migration entry in \`wrangler.jsonc\`. DO storage is per-team, so a bad deploy has no cross-team blast radius.

---

## #4 — feat(board): polling team board + heads-down avatars

**## Summary**
\`GET /api/teams/:slug/board\` returns every member with their current session. \`Cache-Control: max-age=30, stale-while-revalidate=60\`; the board polls every 30s and SWR keeps the last good response on a slow network. Board is a three-state machine: empty → mixed → all-heads-down.

**## Changes**
\`\`\`
feat(api): board read with SWR cache headers
feat(ui): TeamBoard + FocusCard, ring-and-label state (never colour alone)
feat(ui): board empty state
test(board): FSM fuzz across every transition edge
\`\`\`

**## Documentation**
\`design/component-registry.json\` gains \`TeamBoard\` and \`FocusCard\`. No README change.

**## Testing**
Evaluated by oc-app-architect evaluator: **8.6/10 (sprint 3, 1 round)**; Design Evaluator **7.75/10 — PASS**. 11 tests. Cache behaviour is asserted against the response headers in unit tests; the edge-cache and latency numbers are measured on staging at the deploy step, not claimed here.

**## Audit Status**
\`oc-bug-check\`: PASS, 7/7. \`oc-repo-ops verify\`: PASS.

**## Deployment Notes**
No migration. Purely additive; disabling the client poll leaves the route working on manual refresh.

---

## #5 — feat(push): browser push opt-in on first session

**## Summary**
Notification permission is requested **inside the Focus button's click handler** on the first start — iOS requires a user gesture in the same task, and a permission-on-load call fails silently there. Denial never blocks a session; it downgrades the nudge to an in-app toast at \`ends_at\`. Subscriptions live in \`PushSubscription\`, soft-deleted on 410.

**## Changes**
\`\`\`
feat(db): 0003_push — PushSubscription, unique on endpoint
feat(push): VAPID fan-out via @block65/webcrypto-web-push (WebCrypto; no
            nodejs_compat flag, unlike the npm web-push package)
feat(ui): four permission states rendered — granted, denied, dismissed, unsupported
fix(push): 410 Gone soft-deletes the subscription
test(push): permission is requested from the click handler, never at module scope
\`\`\`

**## Documentation**
README "Setup" gains \`npx web-push generate-vapid-keys\` → \`wrangler secret put VAPID_PRIVATE_KEY\`, public key into \`wrangler.jsonc\` vars. \`spec/07-security-privacy.md\` subprocessor list gains the browser push services.

**## Testing**
Evaluated by oc-app-architect evaluator: **7.6/10 (sprint 4, 2 rounds)**; Design Evaluator **7.50/10 — PASS**. 13 tests passing, 1 skipped. Round 1 failed at 5.1: prompt at module load, a 403 on denied permission, and a logged-not-deleted 410. Report: \`sprints/sprint-4/eval-round-1.md\`.
\`tests/push/ios-gesture.test.ts\` is **skipped** — it cannot be asserted in the Workers test runner. A real-device check on an installed iOS PWA is a USER item on the launch checklist, not a test.

**## Audit Status**
\`oc-bug-check\`: PASS with 1 warning — \`⚠️ TODO in src/lib/push/fanout.ts:41\`, resolved in round 2 before this PR opened. \`oc-repo-ops verify\`: PASS.

**## Deployment Notes**
Applies \`0003_push\`. Requires \`VAPID_PUBLIC_KEY\` (var) and \`VAPID_PRIVATE_KEY\` (secret). \`FLAG_PUSH=off\` degrades to in-app toasts with no code change.

---

## #6 — feat(waitlist): 50-team soft cap + waitlist

**## Summary**
The 51st team is redirected to \`/plan\`'s waitlist state instead of being created. The team count is cached in KV with a 5-minute TTL and busted on team create, so signup never runs \`SELECT count(*)\`. **No billing code:** no payment fields, no checkout, no subscription model — per the Phase 1 gate, that arrives when someone asks to pay.

**## Changes**
\`\`\`
feat(signup): enforce the 50-team soft cap at redeem, redirect to /waitlist
feat(api): POST /api/waitlist/join + confirmation email
perf(signup): KV-cached team count, 5-min TTL, cache-bust on team create
test(signup): 51st team redirects; cache-bust propagates within 2 invocations
\`\`\`

**## Documentation**
\`spec/00-project-overview.md\` §5 gains the over-cap signup flow. README unchanged.

**## Testing**
Evaluated by oc-app-architect evaluator: **7.8/10 (sprint 5, 2 rounds)**. 13 tests. Round 1 failed on a red test, not on judgement — \`✗ signup › 51st team is redirected to /waitlist — expected 302, received 200\` at \`tests/auth/redeem.test.ts:88\`; the count was read and discarded. A failing test caps Functionality at 5, so the round failed at 6.1 despite everything else scoring honestly.

**## Audit Status**
\`oc-bug-check\`: PASS, 7/7. \`oc-repo-ops verify\`: PASS.

**## Deployment Notes**
No migration. Requires the \`RATE_LIMIT\` KV namespace (already bound by #2). \`FLAG_SIGNUP=off\` routes all signups to the waitlist.

---

## #7 — chore(polish): empty states, /privacy, /404, a11y sweep

**## Summary**
Every one of the 11 routes gets an axe-core pass, a real empty state, and the minute-boundary \`aria-live\` announcement deferred from sprint 2. \`/privacy\` and \`/terms\` are handwritten, not generated from a template. \`/404\` is branded and actually returns 404.

**## Changes**
\`\`\`
feat(a11y): aria-live minute-boundary announcements on the countdown
feat(a11y): prefers-reduced-motion disables the progress ring entirely
feat(ui): empty states for board, settings, invite, plan
feat(pages): /privacy, /terms, branded /404 with a real 404 status
test(a11y): axe-core across all 11 routes, 0 critical / 0 serious
\`\`\`

**## Documentation**
\`spec/10-documentation-plan.md\` marked complete. README gains a "Accessibility commitments" section pointing at spec §12.

**## Testing**
Evaluated by oc-app-architect evaluator: **8.8/10 (sprint 6, 1 round)**; Design Evaluator **8.50/10 — PASS**. 21 tests. Lighthouse mobile accessibility ≥ 95 on \`/board\`, \`/focus/:id\` and \`/focus/:id/done\` in CI.

**## Audit Status**
\`oc-bug-check\`: PASS, 7/7. \`oc-repo-ops verify\`: PASS after one auto-fix (\`.gitignore\` was missing \`.wrangler/\`).

**## Deployment Notes**
No migration, no new bindings, no new secrets.

---

## #8 — fix(auth): constant-time magic-link token compare (F-002)

**## Summary**
Opened after the pre-deploy audit, before staging. \`src/lib/auth/token.ts:31\` compared the token hash with \`===\`, which short-circuits at the first differing byte on an unauthenticated, distributed-egress-reachable endpoint.

**## Changes**
\`\`\`
fix(auth): compare token hashes with crypto.subtle.timingSafeEqual
test(auth): rewrite the equality assertion to cover length mismatch
\`\`\`

**## Documentation**
None — no reader-facing surface changed. \`oc-docs-forge\` emitted the empty-fragment form, which \`oc-repo-ops\` accepts only when the diff touches no route, no env var and no public behaviour.

**## Testing**
1 test rewritten, 0 net new. Suite still 94 passed, 1 skipped.

**## Audit Status**
Closes audit finding **F-002 (HIGH)**. F-001 (\`Permissions-Policy\` header) deferred by explicit user decision to the next deploy; F-003–F-006 (MEDIUM) queued for sprint 7.

**## Deployment Notes**
None. Pure logic change, no migration, no binding, no secret.

---

## Reviewer notes

- **Merge order matters** and the branches were opened in it: #2 (migrations) → #3 → #4 → #5 → #6 → #7. #8 lands after all six.
- Squash-merge convention; the PR title becomes the commit subject.
- Per-PR gate verdicts, as recorded by oc-git-ops before each PR opened:

| PR | oc-bug-check | oc-docs-forge | oc-repo-ops verify |
|---|---|---|---|
| #2 | PASS 7/7 (4.1s) | \`## Documentation\` fragment written | PASS |
| #3 | PASS 7/7 (3.8s) | fragment written | PASS |
| #4 | PASS 7/7 (3.6s) | fragment written | PASS |
| #5 | PASS 7/7, 1 warning cleared | fragment written | PASS |
| #6 | PASS 7/7 (4.0s) | fragment written | PASS |
| #7 | PASS 7/7 (5.2s) | fragment written | PASS (1 auto-fix) |
| #8 | PASS 7/7 (3.4s) | empty fragment (no reader-facing change) | PASS |

- \`oc-repo-ops verify\` fails closed when \`## Documentation\` is absent from a PR body. It is the reason every body above has one, including the empty case.
- CI runs the full suite plus Lighthouse CI on every PR; a failing performance or accessibility budget blocks merge.`,
    },
    {
      id: "deploy-checkpoint",
      label: ".checkpoints/oc-deploy-ops.checkpoint.json",
      kind: "checkpoint.json",
      body:
`# .checkpoints/oc-deploy-ops.checkpoint.json

Written by oc-deploy-ops at 2026-04-09 09:45, after the production health check returned. This is the file \`/checkpoint show\` reads and the one oc-monitoring-ops picks up on the next turn.

\`\`\`json
{
  "protocol_version": "1.1",
  "skill": "oc-deploy-ops",
  "project": "heads-down",
  "phase": "production",
  "step": "health-check",
  "status": "complete",
  "updated_at": "2026-04-09T09:45:12Z",
  "progress_table": [
    { "id": "audit-gate",   "status": "complete", "note": "oc-code-auditor Grade B; 2 HIGH; user confirmed after F-002" },
    { "id": "staging",      "status": "complete", "note": "version 7c1e4b2a, 2026-04-08 15:58" },
    { "id": "smoke-staging","status": "complete", "note": "12/12 green" },
    { "id": "soak",         "status": "complete", "note": "17h, 0 errors in Workers Logs, user-verified on Android" },
    { "id": "production",   "status": "complete", "note": "version a4d90f31, 2026-04-09 09:41" },
    { "id": "health-check", "status": "complete", "note": "200 in 187ms, version a92f0b3" },
    { "id": "monitor-verify","status": "pending", "note": "handed to oc-monitoring-ops" }
  ],
  "context_primer": {
    "summary": "First production deploy of heads-down. Same commit on staging and prod; no branch builds.",
    "key_decisions": [
      "Deployed the exact reviewed main (a92f0b3) to both environments — staging is a faithful preview, not a variant build.",
      "F-002 (timing-unsafe token compare) fixed and merged before staging rather than deferred.",
      "F-001 (missing Permissions-Policy header) deferred to the next deploy by explicit user decision at 15:36.",
      "custom_domain: true on the production route — Cloudflare owns the DNS record; no manually pre-created CNAME.",
      "No auto-promote. Production waited for the user's word after an overnight soak."
    ]
  },
  "skill_state": {
    "staging_version": "7c1e4b2a-9f3d-4a61-8c05-2e7bd1f4a913",
    "staging_url": "https://heads-down-staging.mara-k.workers.dev",
    "prod_version": "a4d90f31-6b27-4e58-9c11-0f8a3e7d5b62",
    "prod_url": "https://headsdown.app",
    "prev_prod_version": null,
    "deployed_sha": "a92f0b3",
    "last_deploy": "2026-04-09T09:41:38Z",
    "migrations_applied": 6,
    "smoke_results": {
      "01_health": "pass",
      "02_security_headers": "pass",
      "03_csp_shape": "pass",
      "04_auth_request": "pass",
      "05_auth_redeem": "pass",
      "06_session_start": "pass",
      "07_session_read": "pass",
      "08_board_read": "pass",
      "09_session_end": "pass",
      "10_do_alarm": "pass",
      "11_push_fanout": "pass",
      "12_not_found": "pass"
    },
    "rollback_available": false,
    "rollback_note": "First production version — wrangler deployments list has exactly one entry, so there is nothing to roll back to. Forward-fix only until the second deploy, at which point prev_prod_version becomes a4d90f31."
  },
  "cost": { "usd": 61.20, "tokens_in": 5940000, "tokens_out": 812000, "owner": "oc-cost-ops" },
  "next_actions": [
    "Open the F-001 PR (Permissions-Policy header, src/hooks.server.ts:22) — deferred, not dropped.",
    "Set PUBLIC_SENTRY_DSN in production; browser errors are currently collected by nothing.",
    "Wire an alert on the DO alarm-miss SLI — spec §17 defines it and no monitor evaluates it.",
    "Run the iOS device check on an installed PWA; tests/push/ios-gesture.test.ts is skipped, not passing.",
    "Queue F-003…F-006 and 0007_drop_dup_index into sprint 7."
  ]
}
\`\`\`

\`rollback_available\` is \`false\` on purpose. It is the first production version; \`wrangler rollback\` needs a previous one to exist. The runbook's §2 says the same thing in prose so nobody reads the rollback section on day 1 and assumes there is a parachute.`,
    },
    {
      id: "rollback-runbook",
      label: "Deploy, rollback + day-1 monitoring",
      kind: "runbook",
      body:
`# Heads Down — Deploy, rollback + day-1 monitoring

**Owner** oc-monitoring-ops, from \`/oc-monitor verify\` on 2026-04-09 · Deploy procedure inherited from oc-deploy-ops · **Reviewed** whenever §10 gains a row

## 1. Deploy procedure (normal)

\`\`\`bash
# From main, clean tree, at the exact commit that was reviewed:
git fetch origin && git rev-parse --short HEAD     # must match origin/main
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm vitest run
npx wrangler d1 migrations apply heads-down-db --remote
npx wrangler deploy
curl -s https://headsdown.app/api/health | jq .
\`\`\`

Staging is the same sequence with \`--env staging\` and \`heads-down-db-staging\`. Both environments deploy the same commit; there are no branch builds.

### The 12-check smoke suite

Run against whichever environment just deployed. Every check has an expected status, and the deploy is not "done" until all twelve are green.

| # | Check | Expect |
|---:|---|---|
| 01 | \`GET /api/health\` | 200, \`version\` equals the deployed short SHA, \`Cache-Control: no-store\` |
| 02 | \`GET /\` | 200 with CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy present |
| 03 | \`GET /\` CSP shape | \`connect-src 'self'\`, no \`unsafe-inline\`, no wildcard source |
| 04 | \`POST /api/auth/request\` (smoke address) | 202, and 202 again for an unknown address — no enumeration |
| 05 | \`GET /api/auth/redeem?token=…\` (seeded) | 302 → \`/board\`, \`__Host-hd_sess\` set, \`Secure; HttpOnly; SameSite=Strict\` |
| 06 | \`POST /api/sessions/start\` (authed, 1500s) | 201, \`ends_at\` in the future |
| 07 | \`GET /api/sessions/:id\` | 200, matches, \`server_now\` within 2s of wall clock, \`no-store\` |
| 08 | \`GET /api/teams/:slug/board\` | 200, includes the active session, \`max-age=30, stale-while-revalidate=60\` |
| 09 | \`POST /api/sessions/:id/end\` | 200, \`status: "ended"\`, idempotent on replay |
| 10 | DO \`alarm()\` on a 60s fixture block | fires within 2s of \`ends_at\` |
| 11 | Push fan-out against the fixture VAPID endpoint | 201 from the mock push service |
| 12 | \`GET /nope\` | **404 status**, branded page, header and footer intact |

Check 12 exists because frameworks routinely serve a 404 page with a 200 status and nobody notices until a crawler does.

## 2. Rollback

\`\`\`bash
$ npx wrangler deployments list
Created:     2026-04-09T09:41:38Z
Author:      mara@headsdown.app
Source:      wrangler deploy
Version(s):  (100%) a4d90f31-6b27-4e58-9c11-0f8a3e7d5b62
                    Created: 2026-04-09T09:41:12Z
                    Tag: -
\`\`\`

**Today there is exactly one production version, so there is nothing to roll back to.** From the second deploy onward the second row's id is the target:

\`\`\`bash
npx wrangler rollback <previous-version-id>
# Cloudflare serves the previous code globally within ~30s.
\`\`\`

Until then the only options are forward-fix or \`FLAG_*\` (§3). Record the outgoing version id in the checkpoint **before** every deploy — \`skill_state.prev_prod_version\` is what makes the command above a one-liner at 3am.

**Database.** D1 migrations are forward-only; nothing has a \`down()\`. A bad schema change is corrected by writing \`0007_…\`, or, for data loss, by \`npx wrangler d1 time-travel restore heads-down-db --timestamp <iso8601>\` (30-day window on the free plan). Time travel restores the whole database, so it is a real outage, not a quiet fix.

## 3. Feature flags (degrade without a deploy)

Only three flags exist in the code. If a flag is not in this table, it is not implemented, and flipping an env var that nothing reads is a way to waste ten minutes during an incident.

| Flag | Default | When to flip | What degrades |
|---|---|---|---|
| \`FLAG_PUSH\` | on | Push fan-out failing, or the push service is rate-limiting us | Nudges become in-app toasts at session end. Sessions unaffected. |
| \`FLAG_SIGNUP\` | on | Signup spike, or soft-cap pressure | \`/auth/magic\` routes to the waitlist. Existing users unaffected. |
| \`FLAG_BOARD_POLL\` | on | Hot-read storm on the board endpoint | Board stops auto-polling; users see a static board until they refresh. |

There is deliberately **no** flag that falls back to client-side timers. A client-side timer stops when the tab closes, which is the one thing the product promises it will not do — a flag like that would degrade the product into a different, broken product.

Flag flips are Worker environment variables read through KV. **KV is eventually consistent — allow up to 60 seconds for a flip to reach every edge location**, not the 10 seconds people assume. If you need it faster than that, deploy.

## 4. Monitoring + alerts (what is actually wired on day 1)

| SLI | Target | Alert | Wired? |
|---|---|---|---|
| 5xx rate | < 0.1% over 5 min | > 1% over 5 min → Cloudflare Notification → email + \`#ops\` Slack incoming webhook | **yes** |
| Health-check availability | 2xx | 3 consecutive failures → email + Slack | **yes** |
| Board p99 latency | < 200 ms | > 500 ms over 10 min → Slack | **yes** |
| DO alarm-miss rate | < 0.01% / 24h | any miss → Slack | **no — gap, see §10** |
| Browser error rate | — | Sentry issue alert | **no — \`PUBLIC_SENTRY_DSN\` unset in production** |
| Magic-link delivery p95 | < 8 s | Resend dashboard, manual | manual only |
| Resend daily send volume | < 70/day | > 70 → email | **yes** |

No PagerDuty. One person is on call and she has a phone; paging software for a solo founder is cost without signal. Alerts go to email and Slack, and the 22:00–07:00 rule is that she looks at Slack in the morning unless the health check has failed three times, which also sends email.

## 5. Incident playbook

1. **Triage** — open Workers Logs filtered to the affected route. Compare the alert start time against \`skill_state.last_deploy\` in the deploy checkpoint.
2. **Bisect by time, not by code.** If the alert began within 10 minutes of a deploy, the deploy is the suspect. Roll back first (§2), investigate after — once a previous version exists.
3. **Mitigate.** If rollback is not available, flip the relevant flag from §3 and wait the full 60 seconds before concluding it did nothing.
4. **Communicate.** Real user impact → post to the status page within 15 minutes, update every 30 until resolved.
5. **Resolve.** Verify the SLI is back in band for 30 minutes before declaring it over.
6. **Postmortem** within 5 business days for anything that woke anyone up. Template in §7.

## 6. Postmortem template

\`\`\`
# Incident — <date> — <one-line summary>

## Impact
- Users affected: <N> (<scope>)
- Duration: <start> → <end> (<minutes>)
- SLI burn: <number>× over <window>

## Timeline (UTC)
- HH:MM — first signal (what fired, and what a human saw)
- HH:MM — acknowledged
- HH:MM — root cause identified
- HH:MM — mitigation applied
- HH:MM — verified resolved

## Root cause
<2–4 sentences of plain English; no jargon.>

## What went well
## What didn't
## Action items
- [ ] <owner> — <action> — <due date>
\`\`\`

Postmortems are blameless. Action items go in the repo's issue tracker with the \`incident\` label; there is no separate ops tracker to fall out of sync with.

## 7. Disaster recovery

- **D1** — Cloudflare's 30-day time-travel window is the backup story on the free plan. There is no nightly export to R2 yet; if that matters more than \\$0/month does, it is a scheduled Worker and a paid plan away. Written down here so the gap is a decision rather than a surprise.
- **VAPID key loss** — the private key exists in exactly two places: Cloudflare secrets and the founder's password manager. Losing both means every existing push subscription is dead and every user must re-subscribe. There is no rotation procedure yet; there is a reminder to write one.
- **Cloudflare account loss** — the account has a second verified email and hardware-key 2FA. That is the whole recovery plan for a solo-founder account.

## 8. Dashboards

- **Workers overview** — requests, 5xx, CPU time, per-route breakdown (Cloudflare dashboard → heads-down → Metrics).
- **Workers Logs** — the only place structured request logs exist. 200k events/day, **3-day retention on the free plan**; anything older than three days is gone, so copy what you need into the postmortem.
- **D1** — query volume, rows read/written, storage against the 5 GB free ceiling.
- **Resend** — delivery, bounce, and the daily-send counter that R5 in the spec worries about.

## 9. Ownership

Solo founder, sole on-call. When a second engineer joins: primary/secondary weekly, flipping Monday 10:00 Pacific, and the new person's onboarding is this runbook plus one rehearsed fire drill (a flag flip and a rollback against staging).

## 10. Change log

- **2026-04-08 15:58** — staging deployed (version \`7c1e4b2a\`); §1 smoke suite run for the first time, 12/12.
- **2026-04-09 09:41** — production deployed (version \`a4d90f31\`, SHA \`a92f0b3\`); runbook produced by \`/oc-monitor verify\`.
- **Open gaps at time of writing:** DO alarm-miss has no alert; \`PUBLIC_SENTRY_DSN\` is unset in production; no D1 export beyond time travel. All three are in \`next_actions\` on the deploy checkpoint.`,
    },
  ],
  skills: [
    "oc-app-architect",
    "oc-stack-forge",
    "oc-ux-engineer",
    "oc-code-auditor",
    "oc-git-ops",
    "oc-deploy-ops",
    "oc-monitoring-ops",
  ],
  runtime: "≈ 36 exchanges",
  steps: [
    { type: "beat", phase: "discover", label: "01 · Discover", caption: "oc-app-architect runs the interview — 10:02", skills: ["oc-app-architect"] },

    {
      type: "exchange", role: "user",
      content: "I want to build a Pomodoro app for remote teams. Team members start a focus block, others see who's heads-down, and the app nudges them to break together.",
    },
    {
      type: "exchange", role: "claude", skill: "oc-app-architect",
      content:
`Using **oc-app-architect**: \`/oc-discover\` \`/oc-spec\` \`/oc-design\` \`/oc-roadmap\` \`/oc-build\` \`/oc-launch\`.

\`\`\`
$ ls .checkpoints/
(empty)
\`\`\`

Greenfield. **Phase 1 — \`/oc-discover\`**, in rounds of three; "skip" gets a default, flagged in the spec as an assumption.

**1. Primary user** — the IC, the lead who wants visibility, or ops/HR wanting aggregate data?

**2. Sync or async** — real time, or is 30-second polling enough? This one decides whether we buy a websocket layer.

**3. Scale at launch** — 5, 50, 500?`,
    },
    {
      type: "exchange", role: "user",
      content: "Primary user is the IC. Real-time is nice but 30s refresh is fine for v1. Target: teams of 5–30. Self-serve signup. Mobile-first — I'd guess a third of usage is on a phone.",
    },
    {
      type: "exchange", role: "claude", skill: "oc-app-architect",
      content:
`Anchoring on the IC, polling over websockets, 5–30 person teams, mobile-first, self-serve. Round two:

**4. Team identity** — invite link, workspace slug, SSO?

**5. Focus blocks** — fixed 25-minute pomodoros, or user-picked duration?

**6. Nudges** — push, Slack, email, in-app? And the one that matters: **must the timer keep running if the tab closes?** If yes it's a server object, and that constrains the backend.`,
    },
    {
      type: "exchange", role: "user",
      content: "Invite links. User picks duration from {15, 25, 45, 60}. Nudges via browser push, Slack later. Free with a soft cap at 50 active teams. And yes — timer must survive tab close. That's the whole point. Treat it as server-side authoritative.",
    },
    {
      type: "exchange", role: "claude", skill: "oc-app-architect",
      content:
`Phase 1 complete — 6 answered, 0 skipped, 0 assumptions.

> **Heads Down** — ICs start 15/25/45/60-minute focus blocks; teammates see who's heads-down on a shared board. Server owns the clock, so a closed tab doesn't stop a session. Free, 50-team soft cap.

Two things I heard as constraints, not preferences:

1. **"Server-side authoritative" is the product** — it rules out every timer-in-a-tab approach and is why Phase 2 looks at Durable Objects first.
2. **"Free with a soft cap" is a scope statement.** How literally?

**Phase 2 — Spec + Stack**, auto-invoking \`oc-stack-forge\`.`,
    },
    {
      type: "exchange", role: "user",
      content:
`Two corrections before you lock it.

"Free with a soft cap" means no billing code at all in v1 — don't plan a Stripe sprint, don't stub a checkout, don't put payment fields in the data model. Cap hit, waitlist, done. I'll add billing when someone asks to pay.

And the team lead never gets reporting. Not "later", not behind a flag. That's the point of the product — the second a lead can pull up my focus minutes, the ICs stop using it.

/approve`,
    },

    { type: "beat", phase: "spec", label: "02 · Spec + Stack", caption: "oc-stack-forge picks the stack, then the spec gets written", skills: ["oc-app-architect", "oc-stack-forge"] },

    {
      type: "exchange", role: "claude", skill: "oc-stack-forge",
      artifacts: ["stack-decision"],
      content:
`**oc-stack-forge** — \`/oc-stack-decide\`. Both corrections are hard constraints: no payment layer, no reporting surface.

\`\`\`
Searched "Cloudflare Durable Objects free plan alarms 2026"
  → SQLite-backed DOs + alarm() on Free since Apr 2025.
    Queues are NOT on Free — Workers Paid, $5/mo.
\`\`\`

That changes a design decision, not a score: push retries go in the DO's \`alarm()\` handler instead of a queue.

\`\`\`
Backend + DB  CF Workers + D1 + Durable Objects  44.8/49  (Fly+PG 35.9)
Auth          In-house magic link via Resend     35.4/39  (Clerk 26.8)
Frontend      SvelteKit + Tailwind               38.2/44  (Astro 34.0)
\`\`\`

**The auth pick breaks my own rule** (*"Roll your own — never, unless you have a specific reason"*): one token table, one hash compare, one cookie, under 200 lines, and Lucia went into maintenance mode in 2025. The trade is that token handling becomes **our** bug — the spec pins the rules, the pre-deploy audit checks them.

**Cost at the cap: \\$0/month.** Scorecard attached.`,
    },
    {
      type: "exchange", role: "user",
      content: "Keep the in-house magic link, I'd rather own 200 lines than a vendor. But Resend's free tier is 100 emails a day, isn't it? Fifty teams of up to 30 people re-requesting links on a Monday morning could clip that. What happens when we do?",
    },
    {
      type: "exchange", role: "claude", skill: "oc-app-architect",
      artifacts: ["master-spec"],
      content:
`It is 100/day, and you're right that it's the binding limit rather than the 3,000/month headline. A magic link is only sent on *sign-in*, and a 30-day session cookie means the median user signs in about once a month — ~50 sends/day at steady state, with Monday spikes. It goes in as **R5**: alert at 70/day, \\$20/mo Resend Pro if it bites.

Spec drafted — **11 screens · 7 tables · 5 API groups**. Two tables exist because of your auth pick: \`MagicLinkToken\` and \`AuthSession\` — §14 says tokens are 32 bytes, single-use, 15-minute TTL, and a session must be revocable on logout, none of which fits in a cookie. No admin views: §4.3 says a lead never sees anything an IC doesn't.

**Open questions:** timezone display, team-local or user-local? And push permission UX — signup, first session, or a nudge card?`,
    },
    {
      type: "exchange", role: "user",
      content:
`User-local for timezone. Push prompt on first session, not signup — asking for notifications before someone has used the thing once is how you get a permanent "denied".

Also — what do I actually have to set up myself? I don't have a Resend account and I've never used wrangler.`,
    },
    {
      type: "exchange", role: "claude", skill: "oc-app-architect",
      content:
`Both recorded in \`spec/00-project-overview.md\` §20 as resolved, not assumed. The scaffold is runnable **after** five things only you can do — I can't create accounts or hold credentials:

\`\`\`
1.  wrangler login
2.  wrangler d1 create heads-down-db  → database_id into wrangler.jsonc
3.  wrangler kv namespace create RATE_LIMIT → id into wrangler.jsonc
4.  Resend account → RESEND_API_KEY. Unset in dev: the mailer prints the
    magic link to the console, so sprint 1 builds without it.
5.  npx web-push generate-vapid-keys → wrangler secret put VAPID_PRIVATE_KEY
\`\`\`

**Two API keys, both yours.** No Stripe (there's no billing code), no analytics vendor, no error vendor, no CI service — everything else is provisioned by \`wrangler deploy\`.`,
    },

    { type: "beat", phase: "design", label: "03 · Design", caption: "oc-ux-engineer: plan → gate → build → punch list", skills: ["oc-app-architect", "oc-ux-engineer"] },

    {
      type: "exchange", role: "user",
      content: "Approved. One constraint before you start: the board is the home screen and it has to be readable at arm's length, on a phone lying flat on a desk. That's the actual use case — I glance at it, I don't lean into it. Don't optimise for a laptop.",
    },
    {
      type: "exchange", role: "claude", skill: "oc-ux-engineer",
      content:
`Invoked for Phase 3. Consumer-shaped timer app, no dense tabular surface, so I stay solo — \`oc-dash-forge\` isn't needed. "Arm's length, flat on a desk" is a measurable constraint, not a vibe: it sets a minimum type size and kills any state signalled by a small colour difference.

\`/oc-uxe plan\` → design spec + 3 design sprints.

**Design system — "Quiet Work"**, 18 tokens.
- **Type:** Inter 560/400, JetBrains Mono for the countdown. Board labels at 17px minimum — derived from a 60cm viewing distance, not from taste.
- **State is never colour alone.** Every "in focus" avatar carries a ring **and** a text label, which is also what §12 requires.

This is a gate — \`/approve\` to run \`/oc-uxe build\`, or say what's wrong while changing it is free.`,
    },
    {
      type: "exchange", role: "user",
      content: "Spec §12 already says reduced-motion disables the timer's progress ring. I want that as a hard acceptance criterion on design sprint 2, not a line in a document nobody reads at build time — I get motion sick from circular progress animations and I am not going to be the only one. Otherwise /approve.",
    },
    {
      type: "exchange", role: "claude", skill: "oc-ux-engineer",
      content:
`Promoted to criterion 3 on design sprint 2 — the sprint can't pass with the ring still animating under \`prefers-reduced-motion: reduce\`. Not "de-emphasised": removed, with the numeric countdown as the readout.

\`/oc-uxe build\` — **Design Sprint 2, round 1:**

\`\`\`
── Design Evaluator · design sprint 2 · round 1 ──────────────
Visual Hierarchy     8/10
State Completeness   5/10  ← /focus/:id has no loading and no error state
Consistency          8/10
Accessibility        5/10  ← bottom-nav label on Mist is 4.4:1 (needs 4.5:1)
mean = 6.5/10 — ITERATE (floor 7.0; Accessibility has its own 7/10 minimum)
\`\`\`

4.4:1 is not "nearly passing" — below the floor the screen isn't finished, it's broken. Reduced-motion passed on round 1: the ring is gone, not slowed.

**Round 2** darkened the label to Ink-80 (6.1:1), added \`aria-label\` on both icon buttons, and gave \`/focus/:id\` loading and error states → **8.0/10, PASS**.

**Punch list: 11 screens, 14 components, 46 states**, enumerated before anyone writes a component — "we forgot the denied state" is the most common way a sprint fails.`,
    },

    { type: "beat", phase: "plan", label: "04 · Roadmap + Scaffold", caption: "sprint plan, sprint-1 contract, and a skeleton that boots", skills: ["oc-app-architect"] },

    {
      type: "exchange", role: "user",
      content: "Punch list looks right. Drop the board's fourth state — the \"cool-down\" one where everyone's block just ended. Three states is enough and I don't want to explain a fourth one to anybody. /approve",
    },
    {
      type: "exchange", role: "claude", skill: "oc-app-architect",
      artifacts: ["sprint-1-contract"],
      content:
`Cool-down dropped — **45 states**, board FSM is empty → mixed → all-heads-down.

| # | Sprint | Deliverable |
|---|---|---|
| 1 | Auth + team | Magic-link signup, invite URL, empty board. |
| 2 | Session timer | **One DO per team**, not per session; survives tab close. |
| 3 | Team board | 30s polling, avatars, 3-state FSM. |
| 4 | Nudges | Push on first tap; denial degrades, never blocks. |
| 5 | Waitlist + cap | Over-cap → \`/plan\`. No billing code. |
| 6 | Launch polish | Empty states, /privacy, /404, a11y. |

**Sprint 1 contract**, negotiated before any code: single-use 15-minute redemption, KV rate limit 5/min/IP and 10/hour/email, distinct slugs across 1,000 fuzzed unicode names.

**Scaffold — 47 files**, 6 migrations on local D1, \`wrangler dev\` up with DB, RATE_LIMIT and TEAM_TIMER bound. Auth path smoke-tested without your Resend account:

\`\`\`
$ curl -s -X POST localhost:8787/api/auth/request -d '{"email":"mara@…"}'
[auth] RESEND_API_KEY unset — printing magic link instead of sending
$ curl -si "localhost:8787/auth/redeem?token=3f9c0d1a…"
HTTP/1.1 302 Found
set-cookie: __Host-hd_sess=…; Secure; HttpOnly; SameSite=Strict
\`\`\`

A real redemption against local D1: token row written, hashed, matched, stamped \`used_at\`.`,
    },
    {
      type: "exchange", role: "user",
      content: "Sprint 1 first, then stop and show me the eval report before you keep going. I want to see what the Evaluator actually does before I let it run five more times unsupervised. /oc-build",
    },

    { type: "beat", phase: "build", label: "05 · Build", caption: "Generator → Evaluator, and the three rounds that failed", skills: ["oc-app-architect"] },

    {
      type: "exchange", role: "claude", skill: "oc-app-architect",
      content:
`**Sprint 1 — Auth + team creation.** Contract criteria verbatim — these are what Feature Completeness is scored against:

\`\`\`
1  A token can be redeemed exactly once, never after 15 minutes.
2  POST /api/auth/request is rate-limited 5/min/IP and 10/hour/email.
3  Two teams whose names collide after slugification get distinct slugs.
\`\`\`

**Generator round 1** — 23 files, \`+812 / −0\`, **14 tests passing**, all green. Which is why the Evaluator doesn't score off the test run alone.

\`\`\`
── Evaluator · sprint 1 · round 1 ────────────────────────────
Functionality 6 · Feature Completeness 5   ← below the 6/10 floor
Code Quality 6 · Visual/UX 7
Code Score = 0.3·6 + 0.3·5 + 0.2·6 + 0.2·7 = 5.9/10 — FAIL
\`\`\`

**[F-1]** \`src/lib/email.ts:12\` — \`const OK = /.+@.+/\` accepts \`a@b.\` and \`a@ b\`.

**[F-2]** \`src/routes/api/auth/request/+server.ts:18\` — no limiter of any kind. Criterion 2 isn't partially implemented, it's absent: an unauthenticated email-send trigger with no ceiling.

**[F-3]** \`src/lib/slug.ts:27\` — the collision path has no test, so criterion 3 is unproven.

Two of the three are criteria the contract stated before a line was written.

**Generator round 2** — 4 files, \`+118 / −22\`, 8 new tests.

\`\`\`
 ✓ tests/auth/ratelimit.test.ts > 6th request in a minute sends no email
 ✓ tests/team/slug.test.ts > 1000 unicode names produce 1000 distinct slugs
      Tests  22 passed (22)

── Evaluator · sprint 1 · round 2 ───── Code Score 7.6/10 — PASS
\`\`\``,
    },
    {
      type: "exchange", role: "user",
      content: "That's what I wanted to see — it failed on the thing the contract already said. Keep going through sprint 6. Stop if anything fails twice.",
    },
    {
      type: "exchange", role: "claude", skill: "oc-app-architect",
      artifacts: ["eval-sprint-4-round-1", "sprint-ledger"],
      content:
`Sprints 2–6. Nothing hit two failures, so I didn't stop.

\`\`\`
 SPRINT             RD  CODE  VERDICT  TESTS
 ────────────────  ──  ────  ───────  ───────────────
 01 Auth + team     1   5.9  FAIL     14 passed
                    2   7.6  PASS     22 passed
 02 Session timer   1   8.1  PASS     14 passed
 03 Board+polling   1   8.6  PASS     11 passed
 04 Push + opt-in   1   5.1  FAIL     13 pass, 1 skip
                    2   7.6  PASS     13 pass, 1 skip
 05 Waitlist + cap  1   6.1  FAIL     12 pass, 1 FAIL
                    2   7.8  PASS     13 passed
 06 Polish + a11y   1   8.8  PASS     21 passed
 ───────────────────────────────────────────────────
 9 rounds · 3 re-evals · 2h 31m · 94 passed, 1 skipped
\`\`\`

**Sprint 4 round 1 — the expensive one.** \`push/permission.ts:8\` called \`Notification.requestPermission()\` at module scope, which on an installed iOS PWA does nothing and throws nothing either; and \`sessions/start/+server.ts:34\` returned \`403 push_permission_required\` with no subscription, making the timer contingent on a notification.

**Sprint 5 round 1 failed on a red test, not on judgement:**

\`\`\`
 ✗ signup › 51st team is redirected to /waitlist
     expected 302, received 200 — tests/auth/redeem.test.ts:88
\`\`\`

\`teamCount()\` was called and the result thrown away. A failing test caps Functionality at 5, so the round scored 6.1 and still failed — the gate is per-criterion, not the weighted mean. Round 2 wired the redirect and cached the count in KV. No billing code in it.

All six sprints pass. **Phase 7** next: \`/oc-audit pre-deploy\` runs before oc-git-ops touches a branch.`,
    },
    {
      type: "exchange", role: "user",
      content: "The push permission fix in sprint 4 — was that tested on an actual iPhone, or is it a unit test with a mocked Notification API?",
    },
    {
      type: "exchange", role: "claude", skill: "oc-app-architect",
      content:
`Mocked. Being precise about what is and isn't proven:

\`tests/push/permission.test.ts\` stubs \`Notification.requestPermission\` and asserts the call happens **inside the click handler and never at module scope** — it fails if the call site moves back, which is the regression that bit us. It proves the code shape, not iOS behaviour.

\`\`\`
 ↓ tests/push/ios-gesture.test.ts (1) [skipped]
   test.skip("prompt survives an iOS PWA cold start")
\`\`\`

Skipped, not passing — the Workers test runner has no iOS Safari and no home-screen PWA install, so there is nothing honest to assert.

A real-device check is therefore a **USER item on the launch checklist**: install the PWA on an iPhone from staging, tap Focus once, confirm the prompt appears and that denying it still starts the block. It's the only evidence that will exist for ~30% of your users.`,
    },

    { type: "beat", phase: "ship", label: "06 · Ship", caption: "bug-check → docs → repo gate → PRs → audit → staging", skills: ["oc-git-ops", "oc-code-auditor", "oc-deploy-ops"] },

    {
      type: "exchange", role: "user",
      content: "Fine — I'll do the iPhone check against staging tonight before anything goes to prod. Run Phase 7.",
    },
    {
      type: "exchange", role: "claude", skill: "oc-git-ops",
      artifacts: ["pr-bundle"],
      content:
`Reading the oc-app-architect checkpoint: 6 sprints, no open blockers. \`/oc-git-sync\` once per sprint — sprint 1's rail in full so the shape is visible:

\`\`\`
$ /oc-bug-check      # mandatory before any staging or commit
│ ✅ tsc --noEmit 0 errors · vitest 22 passed · gitleaks 0 leaks
│ ✅ lint · anti-patterns · build · dependencies
└ PASS — 7 checks in 4.1s
  # sprint 4 was the only non-silent run: 1 TODO at
  # src/lib/push/fanout.ts:41, cleared before the branch was cut

$ /oc-repo verify
  ✗ .gitignore missing ".wrangler/" — 17 local-state files would be committed
    → auto-fix applied: chore: update .gitignore
\`\`\`

\`/oc-docs pr\` put the README \`RESEND_API_KEY\` + \`VAPID_*\` docs and the \`spec/03-api-surface.md\` §9.1 AuthSession-revocation update into each body; \`/oc-repo verify\` fails closed without a \`## Documentation\` section.

Six draft PRs, one per sprint, in dependency order (#2 auth \`+930 −22\` · 22 tests, through #7 polish); \`#1\` was the scaffold. Totals \`+2,719 / −149\`. Nothing merges itself.`,
    },
    {
      type: "exchange", role: "user",
      content: "The PR bodies read fine. Mark them ready and squash-merge in order — then deploy staging from main, not from six unmerged branches. I don't want to review a staging URL that doesn't correspond to a commit.",
    },
    {
      type: "exchange", role: "claude", skill: "oc-git-ops",
      content:
`Agreed — a staging build assembled from six open branches is one nobody can reproduce.

\`\`\`
$ for n in 2 3 4 5 6 7; do gh pr ready $n; done
$ gh pr merge 2 --squash --delete-branch
✓ Squashed and merged #2 (feat(auth): magic-link signup + team creation)
… (3, 4, 5, 6, 7)

$ git pull --ff-only origin main && git log --oneline -1
6f40c1e chore(polish): empty states, /privacy, /404, a11y sweep (#7)

$ pnpm vitest run
      Tests  94 passed | 1 skipped (95)
\`\`\`

Suite green on the merged result rather than on six branches that each passed alone. Handing to **oc-deploy-ops** — nothing deploys without a gate, so \`/oc-deploy audit\` runs first.`,
    },
    {
      type: "exchange", role: "user",
      content: "Before staging — run the audit gate and show me the findings themselves. Don't just tell me it passed.",
    },
    {
      type: "exchange", role: "claude", skill: "oc-code-auditor",
      artifacts: ["audit-pre-deploy"],
      content:
`\`/oc-audit pre-deploy\` against \`main\` at \`6f40c1e\`, oc-security-auditor attached — 4m 12s across 2,719 added lines. **Grade B: 0 CRITICAL, 2 HIGH, 4 MEDIUM, 7 LOW.**

\`\`\`
[F-001] HIGH    Permissions-Policy header missing — src/hooks.server.ts:22
[F-002] HIGH    token compared with === (timing oracle) — auth/token.ts:31
[F-003] MEDIUM  intent_text reaches the push payload unsanitised
[F-004] MEDIUM  rate-limit key is IP-only; shared NAT throttles an office
[F-005] MEDIUM  GET /api/sessions/:id has no Cache-Control (spec: no-store)
[F-006] MEDIUM  0005 duplicates an index D1 already made for the FK
\`\`\`

**F-002 is the one that matters.** Line 31 is \`return tokenHash === row.token_hash;\`. String \`===\` short-circuits at the first differing byte, and \`/api/auth/redeem\` is unauthenticated and limited only per IP — a timing oracle against the hash. Precisely the liability oc-stack-forge accepted when it rolled its own auth; the fix is three lines of \`crypto.subtle.timingSafeEqual\`.

**F-001 is low-consequence today** — the app requests no camera, mic, geolocation or payment APIs. STRIDE found no elevation path: every request resolves \`team_id\` from the \`AuthSession\` row.

\`\`\`
Gate: 2 HIGH → WARN. Waiting on your decision; I won't self-approve this.
\`\`\``,
    },
    {
      type: "exchange", role: "user",
      content: "Fix F-002 now, it's a one-liner and I'm not shipping a timing oracle on the only auth path. F-001 can ride in the next PR — a missing Permissions-Policy header on an app that requests no permissions isn't going to hurt anyone tonight. The four MEDIUMs go in sprint 7.",
    },
    {
      type: "exchange", role: "claude", skill: "oc-deploy-ops",
      artifacts: ["pr-bundle"],
      content:
`F-002 first.

\`\`\`diff
  // src/lib/auth/token.ts:31
- return tokenHash === row.token_hash;
+ const a = hexToBytes(tokenHash);
+ const b = hexToBytes(row.token_hash);
+ return a.byteLength === b.byteLength && crypto.subtle.timingSafeEqual(a, b);
\`\`\`

\`+7 / −4\`, 1 test rewritten — the old assertion tested the wrong thing. Merged as #8, suite still green. F-001 is deferred-by-decision in the checkpoint, not dropped.

**\`/oc-deploy staging\`** — from \`main\` at \`a92f0b3\`, the commit you just reviewed:

\`\`\`
$ npx wrangler d1 migrations apply heads-down-db-staging --remote --env staging
🚣 6 commands executed successfully.

$ npx wrangler deploy --env staging
Current Version ID: 7c1e4b2a-9f3d-4a61-8c05-2e7bd1f4a913

# smoke suite, 3 of 12 checks:
 01  GET /api/health → 200, version == a92f0b3          ✓      41ms
 10  DO alarm() on a 60s fixture block → fired at +1.2s  ✓   61200ms
 12  GET /nope → 404 status (not 200), branded page      ✓      29ms
 12/12 green · 62.1s wall
\`\`\`

**I won't auto-promote** — and I'd soak this overnight: the iOS push path has no test behind it.`,
    },
    {
      type: "exchange", role: "user",
      content: "Overnight: 0 errors in Workers Logs, I ran three blocks from my phone, push arrived on Android. iOS needed the PWA installed to the home screen first, as you said — once installed, the prompt appeared on the first Focus tap and denying it still started the block. /oc-deploy prod",
    },
    {
      type: "exchange", role: "claude", skill: "oc-deploy-ops",
      artifacts: ["deploy-checkpoint"],
      content:
`The last untested path, closed by the only method available. Promoting the same commit — staging and production get identical bytes.

\`\`\`
$ npx wrangler deployments list --name heads-down
(no deployments)                # first production deploy; PREV_VERSION=none

$ npx wrangler deploy           # from main at a92f0b3
Deployed heads-down triggers (14.62 sec)
  headsdown.app (custom domain)
    ↳ DNS record created by Cloudflare; no pre-existing CNAME to take over

$ curl -s https://headsdown.app/api/health
{"ok":true,"version":"a92f0b3","uptime_s":4}
\`\`\`

\`version\` matches the reviewed commit, so what's serving traffic is what you approved. Smoke suite re-run in production: **12/12 green.**

One checkpoint field deserves saying out loud: \`rollback_available: false\`. First production version, so \`wrangler rollback\` has nothing to target. Until the second deploy your only lever is a forward fix or a flag — and flags land through KV, eventually consistent for **up to 60 seconds**, not the 10 people assume.

\`oc-deploy-ops\` ships; it doesn't watch. Handing to \`Skill(oc-monitoring-ops, "/oc-monitor verify")\`.`,
    },

    { type: "beat", phase: "monitor", label: "07 · Monitor", caption: "oc-monitoring-ops verifies what is actually wired — and what isn't", skills: ["oc-monitoring-ops"] },

    {
      type: "exchange", role: "user",
      content: "Run the monitoring verify. And tell me what's still missing, not what's green — green I can see from the deploy output.",
    },
    {
      type: "exchange", role: "claude", skill: "oc-monitoring-ops",
      artifacts: ["rollback-runbook"],
      content:
`\`/oc-monitor verify\` — checking each SLI in spec §17 against something that actually evaluates it.

**Wired:** 5xx > 1% over 5 min and three consecutive health-check failures, both to email + #ops Slack; board p99 > 500ms to Slack; Resend volume > 70/day, against spec risk R5.

**Not wired — three gaps, none of them things I can close for you:**

1. **DO alarm-miss has no monitor.** Spec §17 defines the SLI at ≤ 0.01%/24h; nothing evaluates it. The one that matters most: a missed \`alarm()\` means a block that never ends and a nudge that never fires — the product silently not working, behind a 200 on every health check.
2. **\`PUBLIC_SENTRY_DSN\` is unset in production.** Browser errors are collected by nothing at all — 5k events/month free, an env var away.
3. **No D1 export.** Cloudflare's 30-day time-travel window is the entire backup story — which should be a decision you made, not one you discover.

**F-001** and **F-003–F-006** carry forward in \`next_actions\`. Runbook attached, rollback included — and why there is none today.

| | |
|---|---|
| Elapsed | Day 1 10:02 → 16:00 · Day 2 09:31 → 09:45 |
| Merged | 7 PRs (#2–#8), \`+2,726 / −153\` |
| Failed on the way | 3 sprint rounds, 1 design round, 2 HIGH audit findings |
| Tests | 94 passing, 1 skipped — the iOS gesture, verified by hand |
| Cost | \\$0/mo infra · \\$61.20 LLM (5.94M in / 812K out) |
| Live | https://headsdown.app · \`a92f0b3\` |

I'm not going to tell you the error budget is intact after eleven minutes of production traffic. Check the 5xx panel tomorrow.

**Next:** \`oc-scale-ops\` around 30 teams, \`oc-integrations-engineer\` for the Slack webhook, and sprint 7 — six findings and three gaps already in it.`,
    },
  ],
};
