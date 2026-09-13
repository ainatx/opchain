import type { Walkthrough } from "./types";

/**
 * Scenario 4 — oc-integrations-engineer runs the real /oc-integrate
 * plan → build (Planner → Builder → Tester) loop against Stripe test mode,
 * and oc-code-auditor gates the PR with /oc-audit full → fix-all → Verifier.
 * Demonstrates the side-chain pattern (integration skill + audit gate) that
 * isn't on the main spine — including the two things that make it real: a
 * Tester round that FAILs against the live sandbox, and a Verifier that
 * REJECTS the first fix.
 *
 * Week anchored Mon 2026-06-08 → Mon 2026-06-15, four sessions.
 */
export const stripeShip: Walkthrough = {
  id: "stripe-ship",
  title: "Ship Stripe subscriptions by Friday",
  tagline: "Stripe subscriptions by Friday",
  summary:
    "Two tiers, per-seat billing, a Tester round that fails against real test mode, an audit gate that blocks the merge — Mon to Fri, four sessions.",
  description:
    "headsdown-app is live — Next 15 on Cloudflare via OpenNext, Neon Postgres through Hyperdrive, Prisma 6 — and needs Stripe subscriptions by Friday: two tiers (Pro $19, Team $49), per-seat billing on Team. The founder has never wired Stripe and doesn't want to break production. oc-integrations-engineer runs /oc-integrate plan (Planner reads the current docs, pins an API version on purpose, writes the endpoints table with an Idempotent column), then /oc-integrate build, where the Tester hits real test mode with `stripe listen`, `stripe trigger` and a test clock — and fails round 1 on owner resolution, `expires_at`, and an unguarded signature check. oc-code-auditor's /oc-audit full finds six things, two of them HIGH, and blocks the merge; the Verifier rejects the first fix for F-002 because it only disabled a button. Friday ships behind a six-account canary allowlist in Workers KV, then 100% at 14:00.",
  inputs: [
    "Live Next 15 app on Cloudflare (OpenNext) · Neon Postgres via Hyperdrive · Prisma 6",
    "Two pricing tiers (Pro $19/mo, Team $49/mo); per-seat billing on Team, seats = team member count",
    "Two test-mode Prices already created; no prior Stripe experience",
    "Global 60/min/IP limiter in `middleware.ts` · Sentry + Linear · no PagerDuty (founder + one contractor)",
    "Mon 2026-06-08 → Fri 2026-06-12, four sessions across the week",
  ],
  outputs: [
    {
      id: "integration-contract",
      label: "Integration Spec — Stripe Billing",
      kind: "contract.md",
      body:
`# Integration Spec: Stripe (headsdown-app)

**Produced by** oc-integrations-engineer \`/oc-integrate plan\` (Planner agent) · **File** \`integrations/stripe/integration-spec.md\`
**v1** 2026-06-08 16:41 PT · **v2** 2026-06-08 17:05 PT — founder review: IP allow-list dropped, abandoned-checkout cron replaced by \`checkout.session.expired\`
**Gate:** approved with 2 changes → checkpoint \`phase: "planned"\`

## 0. Overview

| | |
|---|---|
| **Direction** | Both — outbound REST + inbound webhooks |
| **Auth** | Secret key (\`sk_live_…\` / \`sk_test_…\`) outbound; webhook signing secret (\`whsec_…\`) inbound |
| **Base URL** | \`https://api.stripe.com/v1\` |
| **Sandbox** | Test mode on the same account; **test clocks** for renewal + dunning |
| **Rate limits** | live 100 read/s + 100 write/s · test 25 read/s + 25 write/s |
| **SDK** | \`stripe@18.5.0\` (Node), \`apiVersion\` pinned in \`lib/billing/client.ts\`, \`maxNetworkRetries: 2\` |
| **Runtime** | OpenNext → workerd. Signature verification must be \`constructEventAsync\` + \`Stripe.createSubtleCryptoProvider()\`; HTTP client is \`Stripe.createFetchHttpClient()\` |
| **Docs read** | 2026-06-08 — \`/api/versioning\`, \`/billing/subscriptions/webhooks\`, \`/billing/testing/test-clocks\`, \`/api/idempotent_requests\`, \`/ips\` |

### 0.1 API version — a decision, not a default

Pinned to **\`2024-11-20.acacia\`**, not the newest available. \`2025-03-31.basil\` moved
\`current_period_start\` / \`current_period_end\` off \`Subscription\` and onto
\`SubscriptionItem\`, and nested \`invoice.subscription\` under \`invoice.parent\`.
Every handler in §4 reads \`current_period_end\` off the subscription object; adopting
basil is a code change, not a config change. Upgrading is its own ticket
(\`HD-318\`), scheduled after launch. The pin lives in exactly one place
(\`client.ts\`) and the webhook endpoint is created with the same version so
delivered payloads match the SDK types.

### 0.2 Proration — a decision, recorded

Seat removals mid-cycle use \`proration_behavior: "create_prorations"\`: Stripe
writes a credit line item onto the *next* invoice. It does not refund a card.
The alternative (\`"none"\` — customer pays the full month, no credit) was
offered and declined. Decision recorded in \`context_primer.key_decisions\`.

## 1. Purpose

Turn a \`Team\` (Team tier) or a \`User\` (Pro tier) into a Stripe Subscription;
keep seat count synced; surface billing state to the app from one denormalized
table. Everything behind a feature flag so the integration can be flipped on
and off without a deploy.

## 2. Tier definitions

| Tier | Subject | Stripe Price | Quantity |
|---|---|---|---|
| Pro | a single \`User\` | \`price_1QXPro9KsT2aLmNbRx4Vq7\` — $19.00/mo, licensed, flat \`unit_amount: 1900\` | 1 |
| Team | a \`Team\` (N members) | \`price_1QXTeam3KsT2aLmNbZy8Wc\` — $49.00/mo, licensed, flat \`unit_amount: 4900\` | \`count(User where teamId = Team.id)\` |

A licensed Price with a flat \`unit_amount\` **is** per-seat once it carries a
\`quantity\` — the Prices you already made need no rebuild. Tier is chosen at
Checkout creation and never changed in place (no tier-swap flow in v1).

## 3.0 Endpoints used

| Method | Path | Purpose | Idempotent | Key |
|---|---|---|---|---|
| POST | \`/v1/customers\` | Create the Stripe Customer on first checkout | No → key it | \`customer:{ownerType}:{ownerId}\` |
| POST | \`/v1/checkout/sessions\` | Start a subscription checkout | No → key it | \`checkout:{ownerType}:{ownerId}:{yyyymmddHH}\` |
| POST | \`/v1/billing_portal/sessions\` | Portal redirect (read-only side effects) | n/a | — |
| GET | \`/v1/subscriptions/{id}\` | Read seats + \`current_period_end\` | Yes (GET) | — |
| POST | \`/v1/subscription_items/{id}\` | Seat reconciliation (\`quantity\`) | No → key it | \`seats:{subId}:{qty}\` |
| POST | \`/v1/test_helpers/test_clocks\` | Renewal + dunning rehearsal | test mode only | — |

Five production endpoints. Every mutating call carries an \`idempotencyKey\`;
Stripe stores the result for 24 h, so a retried POST returns the original
object instead of creating a second one.

## 3.1 \`POST /api/billing/checkout\`

Authenticated. Returns \`409 {"error":"already_subscribed"}\` when the owner's
\`BillingStatus.status\` is \`pending\` or \`active\` — see Invariant 1.

\`\`\`json
{ "tier": "pro" | "team" }
\`\`\`

The handler creates a Checkout Session with:

| Field | Value |
|---|---|
| \`mode\` | \`"subscription"\` |
| \`customer\` | existing \`stripeCustomerId\`, else \`customers.create\` first (email goes on the Customer, **not** on the Session — Stripe rejects \`customer\` + \`customer_email\` together) |
| \`line_items[0].price\` | \`price_1QXPro9KsT2aLmNbRx4Vq7\` or \`price_1QXTeam3KsT2aLmNbZy8Wc\` |
| \`line_items[0].quantity\` | 1 (Pro) or the member count (Team) |
| \`metadata.source\` | \`"headsdown-app"\` |
| \`metadata.owner_type\` | \`"User"\` or \`"Team"\` |
| \`metadata.owner_id\` | the User or Team id |
| \`metadata.tier\` | \`"pro"\` or \`"team"\` — forensics only; handlers must not depend on it (§4.1) |
| \`subscription_data.metadata\` | mirrored, so \`customer.subscription.*\` events carry it too |
| \`client_reference_id\` | \`{owner_type}:{owner_id}\` — checked on the success page |
| \`success_url\` | \`https://oc-app.headsdown.app/billing/success?session_id={CHECKOUT_SESSION_ID}\` |
| \`cancel_url\` | \`https://oc-app.headsdown.app/billing\` |
| \`expires_at\` | now + **45 minutes** |

\`expires_at\` is not 30 minutes. 30 is Stripe's *minimum*, and \`now + 30 min\`
computed in our process is a few hundred ms in the past by the time the request
lands, which Stripe rejects with \`invalid_request_error\` on \`expires_at\`. 45
leaves room and still expires inside the working session.

## 3.2 \`POST /api/billing/portal\`

Creates a Customer Portal session for the owner's \`stripeCustomerId\`; returns
the Stripe-signed URL for redirect. No inputs. We never hand-build portal URLs.

## 3.3 Error handling matrix

| Status / error | Meaning | Action |
|---|---|---|
| 401 \`api_key_expired\` / wrong mode | Live key in test env or vice versa | **No retry.** Sentry alert \`billing.auth\`; \`/api/billing/checkout\` → 503 to the UI |
| 402 \`card_declined\` | Card refused at Checkout | Stripe's own UI handles it; no session is completed, nothing reaches us |
| 429 | Rate limited | Honour \`Retry-After\`; SDK backoff; surface 503 after the second retry |
| 500 / 503 from Stripe | Stripe incident | \`maxNetworkRetries: 2\`, then 503 to the UI with "billing temporarily unavailable" |
| \`StripeSignatureVerificationError\` | Forged / truncated webhook | **400, no ledger row, no retry.** A bad signature will never verify on retry |
| \`UnresolvableOwner\` | Event has neither our metadata nor a known \`stripeCustomerId\` | 500 so Stripe retries — a Customer created seconds ago may not be in the ledger yet |

## 3.4 Secrets required

| Secret | Storage | Rotation |
|---|---|---|
| \`STRIPE_SECRET_KEY\` | \`wrangler secret\` (per env) | On compromise; restricted key for CI is separate |
| \`STRIPE_WEBHOOK_SECRET\` | \`wrangler secret\` (per env) | Roll in the Stripe dashboard → both secrets valid for a 24 h overlap → update the secret → delete the old one |

No publishable key. Hosted Checkout is a redirect to \`session.url\`; nothing
Stripe-shaped ships in the browser bundle, so there is no \`NEXT_PUBLIC_STRIPE_*\`
at all.

## 4. Outputs from Stripe (webhooks)

All to \`POST /api/billing/webhook\` — raw body, signature-verified. The endpoint
(\`we_1QZ8kDKsT2aLmNbQwErTy\`) is created subscribed to **exactly these seven**
event types; anything else is not delivered.

| Event | Handler | Side effect |
|---|---|---|
| \`checkout.session.completed\` | \`checkout-completed.ts\` | \`pending\` → \`active\`; store \`stripeSubId\`; seats from \`line_items[0].quantity\` |
| \`checkout.session.expired\` | \`checkout-expired.ts\` | \`pending\` → \`free\`. Replaces the abandoned-checkout cron entirely |
| \`customer.subscription.updated\` | \`subscription-updated.ts\` | \`current_period_end\` + \`items.data[0].quantity\` → seats; \`status\` mirror |
| \`customer.subscription.deleted\` | \`subscription-deleted.ts\` | → \`canceled\` (never NULL) |
| \`invoice.payment_succeeded\` | \`invoice-payment-succeeded.ts\` | \`current_period_end\`; clears \`past_due\` |
| \`invoice.payment_failed\` | \`invoice-payment-failed.ts\` | → \`past_due\`; UI gates writes with 402 |
| \`customer.updated\` | \`customer-updated.ts\` | Mirror email + default payment method brand/last4 |

\`current_period_end\` and \`items.data[0].quantity\` are read off the
**Subscription** object — acacia semantics (§0.1). Under basil both move and
these two handlers break; that is what makes the pin a decision.

### 4.1 Owner resolution

\`invoice.*\` and \`customer.*\` event objects do **not** carry Checkout metadata,
and \`stripe trigger\` fixtures carry none of ours at all. Every handler resolves
the owner through \`resolveOwner(event)\`: metadata when present, otherwise
\`BillingStatus.stripeCustomerId\` (indexed). Handlers never read
\`metadata.owner_*\` directly.

## 5. Invariants (MUST hold)

1. **One active subscription per owner.** Enforced at \`POST /api/billing/checkout\`: if \`BillingStatus.status ∈ {pending, active}\`, return **409 \`already_subscribed\`** *before* calling Stripe. A guard at webhook ingestion is too late — by \`checkout.session.completed\` the card is charged.
2. **Seat-count changes reflect in Stripe within 60 s** via \`subscriptionItems.update(id, { quantity })\` — not \`subscriptions.update(id, { items: [...] })\`, which replaces the item set and would drop unrelated line items.
3. **Webhook events are idempotent.** \`StripeEvent.stripeEventId\` unique; a replay with \`processedAt\` set is a logged 200 no-op.
4. **Failed payment blocks writes.** \`status === "past_due"\` → mutations return \`402\` with a portal URL. Reads and exports stay open.
5. **No Stripe material in the browser bundle.** There is no publishable key; \`no-restricted-imports\` keeps \`stripe\` out of \`app/**\` and \`components/**\`.
6. **No handler runs > 800 ms inside the request.** Fan-outs enqueue and ack.
7. **Every mutating Stripe call carries an idempotency key** (§3.0). A retried POST must not create a second Customer, Session, or quantity change.

## 6. New tables

### 6.1 \`StripeEvent\` — idempotency ledger

\`\`\`prisma
model StripeEvent {
  id              String   @id @default(cuid())
  stripeEventId   String   @unique
  type            String
  receivedAt      DateTime
  processedAt     DateTime?
  rawPayload      String   // JSON string — full event for forensics
  ownerType       String?  // resolved during processing
  ownerId         String?
  errorMessage    String?  // null on success
  attemptCount    Int      @default(1)

  @@index([type, receivedAt])
  @@index([processedAt])
}
\`\`\`

Retention 18 months, then archive. Rows are only written for events that
**passed** signature verification.

### 6.2 \`BillingStatus\` — denormalized for fast reads

\`\`\`prisma
model BillingStatus {
  ownerType        String   // "User" or "Team"
  ownerId          String
  stripeCustomerId String?
  stripeSubId      String?
  status           String   @default("free") // free | pending | active | past_due | canceled
  plan             String?  // "pro" | "team"
  seats            Int?     // null for Pro
  currentPeriodEnd DateTime?
  updatedAt        DateTime @updatedAt

  @@id([ownerType, ownerId])
  @@index([stripeCustomerId])
  @@index([stripeSubId])
}
\`\`\`

Polymorphic on \`(ownerType, ownerId)\` — deliberately **not** a Prisma relation,
because the owner is either a \`User\` or a \`Team\`. Code reads it with its own
\`findUnique\`; it cannot be pulled in through \`include\`.

UI reads exclusively from \`BillingStatus\`, never from Stripe at request time.

## 7. Feature flag

**One source.** \`FLAG_STRIPE_LIVE\` is read per request from Workers KV through
the existing \`getFlag(name, ownerId)\` helper, which also honours
\`FLAG_STRIPE_LIVE_ALLOWLIST\` (a JSON array of owner ids) for the canary.
Propagation ≤ 10 s edge-wide; no redeploy, no \`.env\` entry in any deployed
environment. \`.env.local\` may set it for local dev only.

Off → \`/api/billing/checkout\` and \`/api/billing/portal\` return 503 with a
"billing temporarily unavailable" body. Webhook ingestion is **never**
flag-gated: events for existing subscriptions must keep landing.

## 8. Failure modes (catalog)

| # | Scenario | Detection | Recovery |
|---|---|---|---|
| F1 | Webhook lands after the browser returns from Checkout | sequencing | Status is \`pending\` from Checkout creation, \`active\` on the webhook. The success page re-reads \`BillingStatus\`, and falls back to \`checkout.sessions.retrieve(session_id)\` + a \`client_reference_id\` match if it's still \`pending\`. Users see \`pending\` for ~2–5 s. |
| F2 | User closes the tab mid-Checkout | \`checkout.session.expired\` (Stripe emits it when \`expires_at\` passes) | Handler flips \`pending\` → \`free\`. No cron, no clock-controlled reconciler. |
| F3 | Network partition during delivery | Stripe retries | **Live mode:** retries with exponential backoff for up to 3 days, then disables the endpoint. **Test mode:** 3 attempts over a few hours only — do not read a clean test-mode run as proof of live retry behaviour. |
| F4 | Stripe outage during \`checkout.sessions.create\` | SDK exhausts \`maxNetworkRetries: 2\` | 503 to the UI; no \`BillingStatus\` row written. |
| F5 | Handler throws mid-execution | \`StripeEvent.errorMessage\` set, \`processedAt\` stays null | Return 500 → Stripe retries → ledger short-circuits anything already processed. |
| F6 | Seat reconciliation fails (Team) | \`attemptCount > 3\` on a \`customer.subscription.updated\` row | Sentry alert scoped \`lib/billing/*\`; manual \`syncSeats(teamId)\` from the admin route. |
| F7 | Card declined on renewal | \`invoice.payment_failed\` | 402 gate + portal CTA. Stripe Smart Retries keep trying per the dashboard dunning schedule; a successful retry emits \`invoice.payment_succeeded\` and the gate lifts itself. |
| F8 | Portal session expired | Redirect back to \`/billing\` | UI creates a fresh portal session on demand. |

## 9. Out of scope (v1)

- **Refunds** — manual via the Stripe dashboard; procedure is in the launch plan, not silently missing.
- **Tier swap** — cancel + re-checkout. No in-app path.
- **Annual billing**, **coupons**, **Stripe Tax**, **multi-currency** — USD-only, monthly-only beta.

## 10. Security considerations

- Signature verified with \`constructEventAsync\` against the **raw** body. \`req.text()\` is read before anything parses JSON; a verification failure is a 400 with no ledger row.
- **No IP allow-list.** Stripe publishes a list of discrete webhook source IPs (\`https://stripe.com/files/ips/ips_webhooks.json\`), not a CIDR block, and the list changes. The app sits behind Cloudflare, the HMAC is the real control, and an allow-list in front of it is a list to maintain and a dev-loop breaker (\`stripe listen\` forwards from 127.0.0.1). Dropped at founder review; recorded as a decision, not an omission.
- **Webhook route must be exempt from the global limiter.** \`middleware.ts\` matches \`/api/:path*\` at 60/min/IP; Stripe redelivers from roughly a dozen fixed IPs, so a retry burst would 429. Stripe counts a 429 as a failed delivery and eventually disables the endpoint.
- \`STRIPE_SECRET_KEY\` / \`STRIPE_WEBHOOK_SECRET\` in secrets only; the log scrubber redacts \`sk_\`/\`whsec_\`/\`rk_\` prefixes.
- Success page: \`checkout.sessions.retrieve(session_id)\` server-side, then assert the session's \`client_reference_id\` equals \`{ownerType}:{ownerId}\` for the signed-in owner. A guessed \`session_id\` shows nothing.

## 11. Test plan

| Layer | What |
|---|---|
| **Unit** | 42 vitest tests over fixtures in \`lib/billing/__mocks__/\` — 22 contract, 14 handler, 6 e2e. No network. |
| **Sandbox** | \`stripe listen --forward-to localhost:3000/api/billing/webhook\` + \`stripe trigger\` for all seven events. Tester agent, isolated context, \`integrations/stripe/test-round-N.md\`. Max 3 rounds. |
| **Test clocks** | \`testHelpers.testClocks.create({ frozen_time })\` → Customer on the clock → subscribe → \`testClocks.advance\` +31 d. The only way to exercise renewal and \`invoice.payment_failed\` without waiting a month. |
| **Cards** | \`4242 4242 4242 4242\` success · \`4000 0000 0000 0002\` declined · \`4000 0000 0000 9995\` insufficient funds · \`4000 0000 0000 0341\` attaches, then fails on charge (dunning) |
| **CI** | Unit + \`tsc --noEmit\` + ESLint only. No Stripe credentials in CI; sandbox runs are local/staging. |

---

Checkpoint: \`.checkpoints/oc-integrations-engineer.checkpoint.json\` — \`phase: "planned"\`, \`updated_at: "2026-06-08T17:06:44Z"\`.`,
    },
    {
      id: "boundary-layer",
      label: "Boundary layer — lib/billing/",
      kind: "code.md",
      body:
`# Boundary Layer — \`lib/billing/\`

**Principle:** nothing outside this directory imports \`stripe\`. Everything goes
through \`lib/billing/client.ts\`.

**State:** as merged in [#214](https://github.com/headsdown/app/pull/214) at
\`9d41ba7\`. This is the living boundary doc, so the lines the Thursday audit
changed are marked \`[F-00N]\` inline — the Tuesday build is the PR's first
commit (\`a8c1e44\`), and what was wrong with it is in the audit report.

## 1. File tree

\`\`\`
lib/billing/
├─ client.ts                       // Stripe SDK init; the only call site
├─ checkout.ts                     // createCheckoutSession(ownerType, ownerId, tier)
├─ portal.ts                       // createPortalSession(stripeCustomerId)
├─ webhook.ts                      // verifyAndDispatch(req) → Promise<Response>
├─ resolve-owner.ts                // metadata → stripeCustomerId fallback
├─ handlers/
│   ├─ checkout-completed.ts
│   ├─ checkout-expired.ts
│   ├─ subscription-updated.ts
│   ├─ subscription-deleted.ts
│   ├─ invoice-payment-succeeded.ts
│   ├─ invoice-payment-failed.ts
│   ├─ customer-updated.ts
│   └─ index.ts                    // type-safe handler map, keyed by event type
├─ seat-sync.ts                    // member count → subscription_item.quantity
├─ billing-gate.ts                 // 402 middleware when past_due
├─ prices.ts                       // PRICE_PRO / PRICE_TEAM from env
├─ types.ts
├─ errors.ts                       // BillingError, UnresolvableOwner, IdempotentReplay
└─ __mocks__/                      // fixture responses keyed by scenario (8 files)

app/api/billing/
├─ checkout/route.ts
├─ portal/route.ts
└─ webhook/route.ts
\`\`\`

## 2. \`client.ts\`

\`\`\`ts
import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY unset");
  _stripe = new Stripe(key, {
    apiVersion: "2024-11-20.acacia", // pinned on purpose — spec §0.1
    maxNetworkRetries: 2,            // was 0 on Tuesday; a Stripe 503 surfaced straight to the UI
    telemetry: false,
    httpClient: Stripe.createFetchHttpClient(), // workerd has no node:http
  });
  return _stripe;
}

// workerd's WebCrypto is async, so signature verification must use this.
export const cryptoProvider = Stripe.createSubtleCryptoProvider();

// Read per request from KV — never a module-load constant, or a canary flip
// would need a deploy. \`ownerId\` lets the allowlist bucket a single account.
export async function isLive(ownerId?: string): Promise<boolean> {
  return getFlag("FLAG_STRIPE_LIVE", ownerId);
}
\`\`\`

Lazy + memoized: tests import the module without \`STRIPE_SECRET_KEY\` set, and
production pays the constructor once per isolate.

## 2b. \`checkout.ts\` — where the duplicate guard lives

\`\`\`ts
export async function createCheckoutSession(
  ownerType: "User" | "Team",
  ownerId: string,
  tier: "pro" | "team",
): Promise<{ url: string } | { error: "already_subscribed" }> {
  const existing = await db.billingStatus.findUnique({
    where: { ownerType_ownerId: { ownerType, ownerId } },
  });

  // [F-002] The guard is here, not at webhook ingestion. By the time
  // checkout.session.completed arrives the card has already been charged;
  // a 409 in the handler is a log line, not a protection.
  if (existing && (existing.status === "active" || existing.status === "pending")) {
    return { error: "already_subscribed" };
  }

  const customerId =
    existing?.stripeCustomerId ??
    (
      await getStripe().customers.create(
        {
          email: await ownerEmail(ownerType, ownerId),
          metadata: { owner_type: ownerType, owner_id: ownerId },
        },
        { idempotencyKey: \`customer:\${ownerType}:\${ownerId}\` },
      )
    ).id;

  const quantity =
    tier === "team"
      ? await db.user.count({ where: { teamId: ownerId } })
      : 1;

  const md = { source: "headsdown-app", owner_type: ownerType, owner_id: ownerId, tier };

  const session = await getStripe().checkout.sessions.create(
    {
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: tier === "team" ? PRICE_TEAM : PRICE_PRO, quantity }],
      client_reference_id: \`\${ownerType}:\${ownerId}\`,
      metadata: md,
      subscription_data: { metadata: md },
      success_url: \`\${APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}\`,
      cancel_url: \`\${APP_URL}/billing\`,
      // 30 min is Stripe's minimum and we lose the race to it. See spec §3.1.
      expires_at: Math.floor(Date.now() / 1000) + 45 * 60,
    },
    { idempotencyKey: \`checkout:\${ownerType}:\${ownerId}:\${hourStamp()}\` },
  );

  await db.billingStatus.upsert({
    where: { ownerType_ownerId: { ownerType, ownerId } },
    create: { ownerType, ownerId, stripeCustomerId: customerId, status: "pending", plan: tier },
    update: { stripeCustomerId: customerId, status: "pending", plan: tier },
  });

  return { url: session.url! };
}
\`\`\`

## 3. \`webhook.ts\` — the critical path

\`\`\`ts
import type Stripe from "stripe";
import { getStripe, cryptoProvider } from "./client";
import { handlers } from "./handlers";
import { db } from "@/lib/db";

export async function verifyAndDispatch(req: Request): Promise<Response> {
  // Raw body first: the SDK verifies the exact bytes Stripe signed.
  const raw = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    // [F-001] This call was unguarded until 2026-06-11. A forged or truncated
    // signature threw StripeSignatureVerificationError out of the route → 500,
    // which Stripe reads as a failed delivery and retries for three days.
    event = await getStripe().webhooks.constructEventAsync(
      raw,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
      undefined,
      cryptoProvider,
    );
  } catch {
    // Never retry-worthy: a bad signature will not verify next time either.
    // No ledger row — unverified bytes don't get persisted.
    console.warn("stripe.webhook.bad_signature", { bytes: raw.length });
    return new Response("bad signature", { status: 400 });
  }

  const existing = await db.stripeEvent.findUnique({
    where: { stripeEventId: event.id },
  });
  if (existing?.processedAt) {
    console.info("stripe.webhook.replay", { id: event.id, type: event.type });
    return new Response("ok", { status: 200 });
  }
  if (!existing) {
    await db.stripeEvent.create({
      data: {
        stripeEventId: event.id,
        type: event.type,
        rawPayload: raw,
        receivedAt: new Date(),
      },
    });
  }

  const handler = handlers[event.type as keyof typeof handlers];
  if (!handler) {
    await db.stripeEvent.update({
      where: { stripeEventId: event.id },
      data: { processedAt: new Date() },
    });
    return new Response("ok", { status: 200 });
  }

  try {
    await handler(event);
    await db.stripeEvent.update({
      where: { stripeEventId: event.id },
      data: { processedAt: new Date() },
    });
    return new Response("ok", { status: 200 });
  } catch (err) {
    await db.stripeEvent.update({
      where: { stripeEventId: event.id },
      data: {
        attemptCount: { increment: 1 },
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    });
    // 500 so Stripe retries. processedAt stays null.
    return new Response("handler failed", { status: 500 });
  }
}
\`\`\`

## 3b. \`app/api/billing/webhook/route.ts\`

\`\`\`ts
import { verifyAndDispatch } from "@/lib/billing/webhook";

// OpenNext runs this in workerd; "nodejs" is the only supported value.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  return verifyAndDispatch(req);
}
\`\`\`

Eight lines on purpose: the route is a wrapper so the logic is unit-testable
without Next's request plumbing.

## 4. Handler shape — \`checkout-completed.ts\`

\`\`\`ts
export async function checkoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const { ownerType, ownerId } = await resolveOwner(event);

  // [F-003] Do not read metadata.tier here. It's forensics, it isn't always
  // set, and "team" told us nothing about how many seats were bought.
  // The quantity the customer actually paid for is on the line item.
  const full = await getStripe().checkout.sessions.retrieve(session.id, {
    expand: ["line_items"],
  });
  const line = full.line_items?.data[0];
  const plan = line?.price?.id === PRICE_TEAM ? "team" : "pro";
  const seats = plan === "team" ? (line?.quantity ?? 1) : null;

  await db.billingStatus.upsert({
    where: { ownerType_ownerId: { ownerType, ownerId } },
    create: {
      ownerType,
      ownerId,
      stripeCustomerId: session.customer as string,
      stripeSubId: session.subscription as string,
      status: "active",
      plan,
      seats,
      currentPeriodEnd: null, // populated by customer.subscription.updated
    },
    update: {
      status: "active",
      stripeSubId: session.subscription as string,
      plan,
      seats,
    },
  });
}
\`\`\`

## 4b. \`resolve-owner.ts\` — the Tester round-1 lesson

\`\`\`ts
// Round 1 died on this. \`stripe trigger\` fixtures carry none of our metadata,
// and invoice.* / customer.* event objects never carry Checkout metadata at
// all — even in production. Metadata is the fast path; stripeCustomerId is
// the source of truth.
export async function resolveOwner(
  event: Stripe.Event,
): Promise<{ ownerType: "User" | "Team"; ownerId: string }> {
  const obj = event.data.object as {
    metadata?: Record<string, string>;
    customer?: string | { id: string } | null;
  };

  const md = obj.metadata ?? {};
  if (md.owner_type && md.owner_id) {
    return { ownerType: md.owner_type as "User" | "Team", ownerId: md.owner_id };
  }

  const customerId = typeof obj.customer === "string" ? obj.customer : obj.customer?.id;
  if (!customerId) throw new UnresolvableOwner(event.id, event.type);

  const row = await db.billingStatus.findFirst({
    where: { stripeCustomerId: customerId }, // @@index([stripeCustomerId])
  });
  if (!row) throw new UnresolvableOwner(event.id, event.type);

  return { ownerType: row.ownerType as "User" | "Team", ownerId: row.ownerId };
}
\`\`\`

\`UnresolvableOwner\` deliberately throws → 500 → Stripe retries. A Customer
created two seconds ago may not have a ledger row yet; the retry usually wins.

## 5. \`billing-gate.ts\` — 402 middleware

\`\`\`ts
export async function billingGate(
  _req: NextRequest,
  ownerType: "User" | "Team",
  ownerId: string,
): Promise<Response | null> {
  const status = await db.billingStatus.findUnique({
    where: { ownerType_ownerId: { ownerType, ownerId } },
  });
  if (!status) return null;                     // free tier
  if (status.status !== "past_due") return null;
  return new Response(
    JSON.stringify({ error: "past_due", portal_url: "/api/billing/portal" }),
    { status: 402, headers: { "content-type": "application/json" } },
  );
}
\`\`\`

Mounted on mutation routes only. Reads and exports stay open past-due — we
want people to get their own data out.

## 6. \`seat-sync.ts\` — reconciliation

\`\`\`ts
export async function syncSeats(teamId: string) {
  const team = await db.team.findUniqueOrThrow({
    where: { id: teamId },
    include: { members: true },
  });

  // [F-004] BillingStatus is polymorphic on (ownerType, ownerId) — there is no
  // relation to include. \`include: { billingStatus: true }\` did not type-check.
  const billing = await db.billingStatus.findUnique({
    where: { ownerType_ownerId: { ownerType: "Team", ownerId: teamId } },
  });
  if (!billing?.stripeSubId) return; // not paying

  const sub = await getStripe().subscriptions.retrieve(billing.stripeSubId);
  const item = sub.items.data[0];
  const wantQty = team.members.length;
  if (item.quantity === wantQty) return;

  // Invariant 2: update the item's quantity. subscriptions.update({ items })
  // replaces the item set and would drop anything else on the subscription.
  await getStripe().subscriptionItems.update(
    item.id,
    { quantity: wantQty, proration_behavior: "create_prorations" },
    { idempotencyKey: \`seats:\${sub.id}:\${wantQty}\` },
  );

  await db.billingStatus.update({
    where: { ownerType_ownerId: { ownerType: "Team", ownerId: teamId } },
    data: { seats: wantQty },
  });
}
\`\`\`

Called from member add/remove, plus a 5-minute cron as a safety net (the cron
reconciles seats; it does **not** expire checkouts — that's \`checkout.session.expired\`).

## 7. Tests

| # | File | Test | Asserts |
|---|---|---|---|
| 1 | \`webhook.test.ts\` | \`checkout.session.completed\` → row | \`status='active'\`, \`plan\`, \`seats\` from line item |
| 2 | \`webhook.test.ts\` | same event delivered twice | second receive is a logged 200 no-op |
| 3 | \`handlers.test.ts\` | \`subscription.updated\` seats up | \`seats\` = \`items.data[0].quantity\` |
| 4 | \`handlers.test.ts\` | \`subscription.updated\` seats down | \`seats\` decreased |
| 5 | \`handlers.test.ts\` | \`subscription.deleted\` | \`status='canceled'\`, never NULL |
| 6 | \`handlers.test.ts\` | \`invoice.payment_failed\` | \`status='past_due'\` |
| 7 | \`handlers.test.ts\` | \`invoice.payment_succeeded\` after failure | back to \`active\` (sequence test) |
| 8 | \`handlers.test.ts\` | \`customer.updated\` | email + card brand/last4 mirrored |
| 9 | \`webhook.test.ts\` | malformed signature → 400 | **asserts 400 but passed on the MSW stub while the real path 500'd — see audit [F-001]** |
| 10 | \`webhook.test.ts\` | missing \`stripe-signature\` header → 400 | |
| 11 | \`webhook.test.ts\` | unsubscribed event type → 200 | acked, ledger stamped, dropped |
| 12 | \`webhook.test.ts\` | handler throws → 500 | \`attemptCount\` incremented, \`processedAt\` null |
| 13 | \`seat-sync.test.ts\` | quantities already match | no Stripe call at all |
| 14 | \`seat-sync.test.ts\` | uses \`subscriptionItems.update(id, { quantity })\` | SDK call introspected; \`subscriptions.update({ items })\` never called |
| 15 | \`gate.test.ts\` | \`past_due\` → 402 | body carries \`portal_url\` |
| 16 | \`gate.test.ts\` | \`active\` → pass through | |
| 17 | \`webhook.test.ts\` | \`checkout.session.expired\` → \`free\` | \`pending\` row flipped, no cron involved |
| 18 | \`checkout.test.ts\` | tier swap attempt | 422, v1 has no swap flow |
| 19 | \`checkout.test.ts\` | POST \`/api/billing/checkout\` while \`active\` or \`pending\` | **409 \`already_subscribed\`, zero Stripe calls** |
| 20 | \`lint.test.ts\` | \`no-restricted-imports\` | \`import Stripe from "stripe"\` outside \`lib/billing\` fails ESLint |
| 21 | \`logs.test.ts\` | log scrubber | \`sk_\`, \`rk_\`, \`whsec_\` prefixes redacted |
| 22 | \`retention.test.ts\` | \`StripeEvent\` > 18 months | marked \`archived\` |

Plus 14 handler-level tests (one happy + one malformed payload per event) and
6 e2e tests over the full route.

\`\`\`
$ npx vitest run tests/billing

 ✓ tests/billing/webhook.test.ts       (10)    438ms
 ✓ tests/billing/handlers.test.ts      (15)    321ms
 ✓ tests/billing/checkout.test.ts       (6)    247ms
 ✓ tests/billing/seat-sync.test.ts      (3)    186ms
 ✓ tests/billing/gate.test.ts           (2)     54ms
 ✓ tests/billing/lint.test.ts           (1)    318ms
 ✓ tests/billing/logs.test.ts           (2)     61ms
 ✓ tests/billing/retention.test.ts      (6)    197ms

 Test Files  8 passed (8)
      Tests  45 passed (45)
   Duration  1.91s
\`\`\`

42 of these existed at the Tuesday build (\`1.84s\`); the audit added three
(\`[F-001]\`, \`[F-002]\`, \`[F-006]\`). They are fixtures either way: they prove
the code is consistent with our mocks and nothing else — which is the whole
reason the Tester exists (\`test-round-1.md\`).

## 8. Why a boundary at all

1. **Tests don't need the network.** Fixture-driven, deterministic, 1.84 s.
2. **Provider swap is one directory.** Everything else reads \`BillingStatus\`.
3. **The audit surface is one directory.** \`/oc-audit full\` scoped to \`lib/billing/**\` + routes + middleware + tests; nothing in \`app/**\` or \`components/**\` may import \`stripe\`.

## 9. Lint rule

\`\`\`json
{
  "rules": {
    "no-restricted-imports": ["error", {
      "paths": [{
        "name": "stripe",
        "message": "Import via lib/billing/* — do not call Stripe outside the boundary."
      }]
    }]
  },
  "overrides": [{
    "files": ["lib/billing/**"],
    "rules": { "no-restricted-imports": "off" }
  }]
}
\`\`\`

## 10. Migration

\`\`\`sql
-- prisma/migrations/20260609103417_add_stripe_billing/migration.sql
CREATE TABLE "StripeEvent" (
    "id"            TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "type"          TEXT NOT NULL,
    "receivedAt"    TIMESTAMP(3) NOT NULL,
    "processedAt"   TIMESTAMP(3),
    "rawPayload"    TEXT NOT NULL,
    "ownerType"     TEXT,
    "ownerId"       TEXT,
    "errorMessage"  TEXT,
    "attemptCount"  INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingStatus" (
    "ownerType"        TEXT NOT NULL,
    "ownerId"          TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubId"      TEXT,
    "status"           TEXT NOT NULL DEFAULT 'free',
    "plan"             TEXT,
    "seats"            INTEGER,
    "currentPeriodEnd" TIMESTAMP(3),
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BillingStatus_pkey" PRIMARY KEY ("ownerType","ownerId")
);

CREATE UNIQUE INDEX "StripeEvent_stripeEventId_key" ON "StripeEvent"("stripeEventId");
CREATE INDEX "StripeEvent_type_receivedAt_idx"      ON "StripeEvent"("type", "receivedAt");
CREATE INDEX "StripeEvent_processedAt_idx"          ON "StripeEvent"("processedAt");
CREATE INDEX "BillingStatus_stripeCustomerId_idx"   ON "BillingStatus"("stripeCustomerId");
CREATE INDEX "BillingStatus_stripeSubId_idx"        ON "BillingStatus"("stripeSubId");
\`\`\`

No backfill: every existing account is \`free\` by absence of a row.`,
    },
    {
      id: "tester-round-1",
      label: "Tester round 1 — FAIL",
      kind: "test-round.md",
      body:
`# Integration Test — Stripe — Round 1

\`integrations/stripe/test-round-1.md\` · Tester agent (isolated context: spec +
contract only, no Builder reasoning) · Tue 2026-06-09 14:02 PT · test mode,
restricted key \`rk_test_51Q…Hd\` · \`stripe\` CLI 1.30.0

## Sandbox connectivity

\`\`\`
$ curl -s -o /dev/null -w '%{http_code} %{time_total}s\\n' \\
    -u "$STRIPE_TEST_KEY:" https://api.stripe.com/v1/prices?limit=1
200 0.061s

$ stripe listen --forward-to localhost:3000/api/billing/webhook
> Ready! You are using Stripe API Version [2024-11-20.acacia]. Your webhook
  signing secret is whsec_… (redacted) (^C to quit)
\`\`\`

- Endpoint reachable: **Yes** (61 ms)
- Auth succeeds: **Yes** (restricted key, write scope on \`checkout_sessions\`)
- API version echoed by the CLI matches the pin in \`client.ts\`: **Yes**

## Endpoint tests

| Endpoint | Status | Response shape | Notes |
|---|---|---|---|
| \`POST /v1/customers\` | PASS | matches \`Stripe.Customer\` | 143 ms; idempotency key replayed → same \`cus_\` id, no duplicate |
| \`POST /v1/checkout/sessions\` | **FAIL** | — | \`invalid_request_error\` on \`expires_at\` |
| \`GET /v1/subscriptions/{id}\` | PASS | matches types | 97 ms; \`current_period_end\` present on the Subscription (acacia) |
| \`POST /v1/subscription_items/{id}\` | PASS | matches types | 171 ms; quantity 3 → 4, proration line created on the upcoming invoice |
| \`POST /v1/billing_portal/sessions\` | PASS | matches types | 128 ms |

\`\`\`
$ node scripts/dev/checkout.mjs --tier team --owner Team:tm_9xQ2
StripeInvalidRequestError: This value must be at least 30 minutes in the future.
    param: expires_at
    request-id: req_9fYb2LxKq0Tn4A
    at lib/billing/checkout.ts:58:34
\`\`\`

\`now + 30 * 60\` is Stripe's *minimum*, and the request spends 200–400 ms in
flight, so the value is already stale when it lands. This fails 100% of the
time, not intermittently.

## Webhook tests

| Event | Expected | Actual | Status |
|---|---|---|---|
| \`checkout.session.completed\` | 200, row \`active\` | **500** | **FAIL** |
| \`invoice.payment_failed\` | 200, row \`past_due\` | **500** | **FAIL** |
| replay of the same \`evt_\` | 200 no-op | 200, \`processedAt\` unchanged | PASS |
| \`checkout.session.expired\` | 200, row \`free\` | 200, row \`free\` | PASS |
| malformed \`stripe-signature\` | 400 | **500** | **FAIL** |

\`\`\`
$ stripe trigger checkout.session.completed
Setting up fixture for: product
Setting up fixture for: price
Setting up fixture for: customer
Setting up fixture for: payment_method
Setting up fixture for: checkout_session
Setting up fixture for: payment_page
Trigger succeeded! Check dashboard for event details.

2026-06-09 14:02:11  --> checkout.session.completed [evt_1QZ7x2KsT2aLmNb4Hn9Pq]
2026-06-09 14:02:11  <-- [500] POST http://localhost:3000/api/billing/webhook [evt_1QZ7x2KsT2aLmNb4Hn9Pq]
\`\`\`

Server log:

\`\`\`
Error: missing owner metadata
    at checkoutCompleted (lib/billing/handlers/checkout-completed.ts:9:32)
    at verifyAndDispatch (lib/billing/webhook.ts:52:11)
stripe.webhook.failed { id: 'evt_1QZ7x2KsT2aLmNb4Hn9Pq', attemptCount: 2 }
\`\`\`

\`invoice.payment_failed\` fails for the same reason and will keep failing in
production: \`invoice.*\` and \`customer.*\` event objects **never** carry Checkout
metadata, fixture or not. The handler shape ("pull the owner from metadata")
is wrong for four of the seven subscribed events, not just for the CLI.

\`\`\`
$ curl -s -o /dev/null -w '%{http_code}\\n' -X POST localhost:3000/api/billing/webhook \\
    -H 'stripe-signature: t=1749484931,v1=deadbeef' -d '{}'
500
\`\`\`

\`constructEventAsync\` is called outside any try/catch, so
\`StripeSignatureVerificationError\` escapes the route. Unit test #9 asserts 400
and passes — against the MSW stub, which never runs the real verifier.

## Error handling

| Scenario | Expected | Actual | Status |
|---|---|---|---|
| 429 (rapid-fire 40 writes in test mode) | honour \`Retry-After\`, backoff | SDK backed off, 40/40 eventually succeeded | PASS |
| Stripe 500 (forced via \`/v1/test_helpers\`) | retry twice, then 503 to UI | \`maxNetworkRetries: 0\` — threw on the first failure, UI got a 500 page | **FAIL** |
| Socket timeout (\`timeout: 1\`) | retry | threw immediately | **FAIL** (same root cause) |

## Verdict: **FAIL**

Three fixes for the Builder:

1. **Owner resolution.** Replace \`session.metadata.owner_*\` reads with a shared \`resolveOwner(event)\` that falls back to \`BillingStatus.stripeCustomerId\`. The index already exists and nothing uses it.
2. **\`expires_at\`.** Move off the 30-minute boundary (45 min) and note why in the spec, or the first real checkout in production dies the same way.
3. **Signature failures.** Wrap \`constructEventAsync\` in try/catch → 400, no ledger row. Also set \`maxNetworkRetries: 2\` on the client.

Round 2 required. 2 of 3 rounds remaining.`,
    },
    {
      id: "tester-round-2",
      label: "Tester round 2 — PASS (1 deferred)",
      kind: "test-round.md",
      body:
`# Integration Test — Stripe — Round 2

\`integrations/stripe/test-round-2.md\` · Tue 2026-06-09 16:41 PT · test mode ·
webhooks delivered to the branch on staging (\`we_1QZ8kDKsT2aLmNbQwErTy\`) as
well as \`stripe listen\`, so the same code path is exercised in workerd.

**Builder applied** fixes 1 and 2 plus \`maxNetworkRetries: 2\`. Fix 3
(signature → 400) was **deferred**: it reorders the ledger write in
\`webhook.ts\` and the Builder wanted that reviewed rather than slipped in at
18:10 on a Tuesday. Carried into the audit gate as a known gap.

## Endpoint tests

| Endpoint | Status | Notes |
|---|---|---|
| \`POST /v1/customers\` | PASS | 139 ms; key replay → same \`cus_RkQ9ZtLmNbVx\` |
| \`POST /v1/checkout/sessions\` | PASS | 204 ms; \`expires_at\` now + 45 min accepted |
| \`GET /v1/subscriptions/{id}\` | PASS | 94 ms |
| \`POST /v1/subscription_items/{id}\` | PASS | 166 ms |
| \`POST /v1/billing_portal/sessions\` | PASS | 121 ms |

## Webhook tests

| Event | Expected | Actual | Status |
|---|---|---|---|
| \`checkout.session.completed\` | 200, \`active\`, seats from line item | 200 in 88 ms; \`seats = 4\` | PASS |
| \`checkout.session.expired\` | 200, \`pending\` → \`free\` | 200 in 41 ms | PASS |
| \`customer.subscription.updated\` | 200, \`currentPeriodEnd\` set | 200 in 73 ms | PASS |
| \`customer.subscription.deleted\` | 200, \`canceled\` | 200 in 52 ms | PASS |
| \`invoice.payment_failed\` | 200, \`past_due\` | 200 in 69 ms — resolved via \`stripeCustomerId\`, no metadata present | PASS |
| \`invoice.payment_succeeded\` | 200, back to \`active\` | 200 in 64 ms | PASS |
| \`customer.updated\` | 200, email mirrored | 200 in 47 ms | PASS |
| replay of every \`evt_\` above | 200 no-op | 7/7 no-ops | PASS |
| malformed \`stripe-signature\` | 400 | *not re-tested* | **DEFERRED** |

## Renewal + dunning (test clock)

\`\`\`
$ node scripts/dev/test-clock.mjs create --frozen "2026-06-09T00:00:00Z" --name renewal-dunning
clock_1QZAqRKsT2aLmNbTc0Kj   status: ready   frozen_time: 2026-06-09T00:00:00Z

$ node scripts/dev/test-clock.mjs subscribe --clock clock_1QZAqRKsT2aLmNbTc0Kj \\
    --card 4000000000000341 --price price_1QXPro9KsT2aLmNbRx4Vq7
cus_RkT4WbMcQz09 → sub_1QZ9mNKsT2aLmNbVc3Xz   status: active   period_end: 2026-07-09T00:00:00Z

$ node scripts/dev/test-clock.mjs advance --clock clock_1QZAqRKsT2aLmNbTc0Kj --to "2026-07-10T00:00:00Z"
advancing … ready (18.4s)
\`\`\`

\`\`\`
16:58:02  --> invoice.created [evt_1QZB1aKsT2aLmNbGh4Jk]
16:58:04  --> invoice.finalized [evt_1QZB1cKsT2aLmNbPq7Rs]
16:58:06  --> invoice.payment_failed [evt_1QZB1eKsT2aLmNbTu8Vw]  <-- [200] 71ms
16:58:07  --> customer.subscription.updated [evt_1QZB1fKsT2aLmNbXy9Za]  <-- [200] 66ms
\`\`\`

Card \`4000 0000 0000 0341\` attaches cleanly and fails on charge, which is the
only way to reach this path without waiting a month.

\`\`\`
psql> SELECT "ownerType","ownerId",status,plan,seats FROM "BillingStatus"
      WHERE "stripeSubId" = 'sub_1QZ9mNKsT2aLmNbVc3Xz';
 ownerType | ownerId  |  status  | plan | seats
-----------+----------+----------+------+-------
 User      | usr_7bKq | past_due | pro  |
\`\`\`

\`\`\`
$ curl -s -X POST https://staging.headsdown.app/api/projects \\
    -H "cookie: $STAGING_SESSION" -d '{"name":"x"}' -i | head -3
HTTP/2 402
content-type: application/json
{"error":"past_due","portal_url":"/api/billing/portal"}
\`\`\`

End-to-end: \`testClocks.advance\` → 402 on a write path in **5.1 s**.

## Error handling

| Scenario | Expected | Actual | Status |
|---|---|---|---|
| 429 burst | backoff, all succeed | PASS | PASS |
| Stripe 500 | 2 retries then 503 to UI | 2 retries (0.5 s, 1.1 s), UI got 503 | PASS |
| Socket timeout | retry | retried once, succeeded | PASS |

## Verdict: **PASS** — 2 blockers cleared, 1 deferred

Deferred item goes to the audit gate, not to a third round: it is a code-review
question (ledger-write ordering), not a sandbox-behaviour question.

Checkpoint: \`phase: "build"\`, \`step: "tester-round-2-pass"\`, \`test_rounds: 2\`.`,
    },
    {
      id: "audit-report",
      label: "oc-code-auditor — /oc-audit full → fix-all",
      kind: "audit.md",
      body:
`# Code Audit Report — headsdown-app / \`feat/stripe-billing\` @ \`3f9c2e1\`

**Scope:** full (1a security · 1b performance · 1c quality · 1d config/devops;
1e skipped — API-only diff, no user-facing UI in it; 1f skipped — no LLM in the loop)
**Findings:** CRITICAL 0 · HIGH 2 · MEDIUM 3 · LOW 1
**Overall health:** **B** — the boundary is disciplined and the idempotency
ledger is right, but two HIGH findings sit on the money path: a webhook that
returns 500 on a forged signature, and no server-side duplicate-subscription
guard. Both are merge-blocking.
**Read first:** \`integrations/stripe/test-round-2.md\` (\`test_rounds: 2\`,
1 deferred item) and the integration spec's invariants. This audit starts from
the Tester's deferred gap, not from zero.

## 1. Inventory

| File(s) | LoC | Notes |
|---|---:|---|
| \`lib/billing/client.ts\` | 34 | SDK init, \`apiVersion\` pin, subtle-crypto provider, \`isLive()\` |
| \`lib/billing/checkout.ts\` | 96 | Customer + Session creation |
| \`lib/billing/portal.ts\` | 36 | Portal session |
| \`lib/billing/webhook.ts\` | 108 | Verify → ledger → dispatch |
| \`lib/billing/resolve-owner.ts\` | 42 | metadata → \`stripeCustomerId\` fallback |
| \`lib/billing/seat-sync.ts\` | 68 | Quantity reconciliation |
| \`lib/billing/billing-gate.ts\` | 34 | 402 middleware |
| \`lib/billing/types.ts\` | 58 | |
| \`lib/billing/errors.ts\` | 31 | |
| \`lib/billing/handlers/*.ts\` | 294 (8 files) | 7 events + typed map |
| \`app/api/billing/{checkout,portal,webhook}/route.ts\` | 87 (3 files) | |
| \`middleware.ts\` | +6 / −7 | limiter matcher |
| \`prisma/schema.prisma\` | +44 | 2 models |
| \`prisma/migrations/20260609103417_add_stripe_billing/migration.sql\` | 38 | 2 tables, 1 unique index, 4 indexes |
| \`tests/billing/*.test.ts\` | 513 (8 files) | 22 contract + 14 handler + 6 e2e |

**31 files changed, 1,489 insertions(+), 7 deletions(−).** The billing UI
(\`app/billing/success/page.tsx\`, \`components/PricingCard.tsx\`) shipped in #209
and is **not** in this diff — relevant below.

## 2. Findings

### [F-001] Forged webhook signature returns 500, not 400

**Severity:** HIGH
**Category:** security
**Location:** \`lib/billing/webhook.ts:14-17\`
**Fix effort:** S (< 30 min)

**Problem:**
\`constructEventAsync\` is called outside any try/catch, so
\`StripeSignatureVerificationError\` escapes the route and becomes a 500. Stripe
reads 5xx as a failed delivery and retries with backoff for up to three days in
live mode, then disables the endpoint — so anyone who can POST garbage to a
public URL can keep a retry queue warm and, with enough volume, walk the
endpoint toward disabled. This is the item the Tester deferred out of round 2.

**Evidence:**
\`\`\`
$ curl -s -o /dev/null -w '%{http_code}\\n' -X POST \\
    https://staging.headsdown.app/api/billing/webhook \\
    -H 'stripe-signature: t=1749484931,v1=deadbeef' -d '{}'
500

$ rg -n -B2 -A2 'constructEventAsync' lib/billing/webhook.ts
12:  const sig = req.headers.get("stripe-signature") ?? "";
13:
14:  const event = await getStripe().webhooks.constructEventAsync(
15:    raw, sig, process.env.STRIPE_WEBHOOK_SECRET!, undefined, cryptoProvider
16:  );
17:
\`\`\`
Test #9 (\`tests/billing/webhook.test.ts:96\`) asserts 400 and is green — it runs
against the MSW stub, which never invokes the real verifier. The test is not
wrong about the requirement; it is wrong about what it exercises.

---

### [F-002] No server-side guard against a second subscription

**Severity:** HIGH
**Category:** security
**Location:** \`app/api/billing/checkout/route.ts:22\`
**Fix effort:** S (< 30 min)

**Problem:**
Invariant 1 says one active subscription per owner, but nothing enforces it
before Stripe is called. Two POSTs produce two Checkout Sessions; if the user
completes both, the card is charged twice and the second
\`checkout.session.completed\` simply overwrites \`stripeSubId\`, orphaning the
first subscription — which keeps billing. The contract's original plan (409 at
webhook ingestion) is too late: by then the money has moved.

**Evidence:**
\`\`\`
$ for i in 1 2; do
    curl -s -X POST https://staging.headsdown.app/api/billing/checkout \\
      -H "cookie: $STAGING_SESSION" -d '{"tier":"pro"}' | jq -r .url |
      cut -d/ -f5
  done
cs_test_a1B2c3D4e5F6g7H8i9J0kL
cs_test_b7N8m9P0q1R2s3T4u5V6wX

$ rg -n 'billingStatus|status ===' app/api/billing/checkout/route.ts
(no matches)
\`\`\`
The idempotency key (\`checkout:{ownerType}:{ownerId}:{yyyymmddHH}\`) collapses
double-clicks inside the same hour, which is why this does not reproduce in the
unit tests. It does nothing across two hours, two tabs, or two devices.

---

### [F-003] Handler reads \`metadata.tier\`, which \`checkout.ts\` never sets

**Severity:** MEDIUM
**Category:** quality
**Location:** \`lib/billing/handlers/checkout-completed.ts:19-20\`
**Fix effort:** M (30 min – 2 hr)

**Problem:**
\`plan\` is written from \`session.metadata?.tier\`, but the Session is created
without a \`tier\` key, so \`plan\` is always \`undefined\`. Worse, \`seats\` is
hard-coded to 1 for Team — the quantity the customer actually paid for is on
the line item and is discarded. A 4-seat Team shows as 1 seat, and the next
\`syncSeats\` run "corrects" Stripe back up with a proration line.

**Evidence:**
\`\`\`
$ rg -n 'metadata:' lib/billing/checkout.ts
41:      metadata: { source: "headsdown-app", owner_type: ownerType, owner_id: ownerId },

$ rg -n 'metadata\\?\\.tier|seats:' lib/billing/handlers/checkout-completed.ts
19:      plan: session.metadata?.tier,
20:      seats: session.metadata?.tier === "team" ? 1 : null,

psql> SELECT plan, seats FROM "BillingStatus" WHERE "ownerId" = 'tm_9xQ2';
 plan | seats
------+-------
      |     1      -- the Tuesday Team checkout bought 4
\`\`\`
Spec §3.1 requires \`metadata.tier\`; the implementation drifted from its own
contract. Setting it is half the fix — the seat count must come from
\`line_items[0].quantity\`, which is what the money was calculated on.

---

### [F-004] \`seat-sync.ts\` does not type-check

**Severity:** MEDIUM
**Category:** quality
**Location:** \`lib/billing/seat-sync.ts:9\`
**Fix effort:** S (< 30 min)

**Problem:**
\`BillingStatus\` is polymorphic on \`(ownerType, ownerId)\` with no Prisma
relation, so it cannot be pulled in through \`include\`. \`tsc --noEmit\` fails on
the file. It was not caught because \`tsc\` is not in the CI matrix — \`npm test\`
transpiles per-file without type-checking.

**Evidence:**
\`\`\`
$ npx tsc --noEmit
lib/billing/seat-sync.ts:9:31 - error TS2353: Object literal may only specify
known properties, and 'billingStatus' does not exist in type
'TeamInclude<DefaultArgs>'.

9     include: { members: true, billingStatus: true },
                                ~~~~~~~~~~~~~
Found 1 error in lib/billing/seat-sync.ts:9
\`\`\`
Also at \`seat-sync.ts:17\`: \`subscriptions.retrieve(id, { expand: ["items"] })\`
— items are inline on the Subscription; the expand is a no-op.

---

### [F-005] The global rate limiter covers the webhook route

**Severity:** MEDIUM
**Category:** config
**Location:** \`middleware.ts:6\`
**Fix effort:** S (< 30 min)

**Problem:**
The \`@upstash/ratelimit\` middleware matches \`/api/:path*\` at 60/min/IP, which
includes \`/api/billing/webhook\`. Stripe redelivers from roughly a dozen fixed
source IPs, so a redelivery burst after any incident concentrates on a handful
of IPs and gets 429'd. Stripe counts 429 as a failed delivery, retries with
backoff for up to three days, and eventually disables the endpoint. The fix is
an exemption, not a higher ceiling — there is no number that is correct here,
because the limiter is keyed on exactly the wrong dimension.

**Evidence:**
\`\`\`
$ sed -n '1,8p' middleware.ts
1: import { Ratelimit } from "@upstash/ratelimit";
2: import { Redis } from "@upstash/redis";
3:
4: const limiter = new Ratelimit({ redis: Redis.fromEnv(),
5:   limiter: Ratelimit.slidingWindow(60, "60 s") });
6: export const config = { matcher: ["/api/:path*"] };

$ hey -n 80 -c 8 -m POST https://staging.headsdown.app/api/billing/webhook | rg 'Status'
  [200] 60 responses
  [429] 20 responses
\`\`\`

---

### [F-006] No test for \`checkout.session.expired\`

**Severity:** LOW
**Category:** quality
**Location:** \`tests/billing/webhook.test.ts\`
**Fix effort:** S (< 30 min)

**Problem:**
\`checkout.session.expired\` is the entire abandoned-checkout recovery path
(spec §8 F2) and it has no unit test. The Tester exercised it once against the
sandbox; nothing stops a refactor from dropping the handler out of the map.

**Evidence:**
\`\`\`
$ rg -n 'session\\.expired|sessionExpired' tests/
(no matches)
$ rg -n 'checkout.session.expired' lib/billing/handlers/index.ts
14:  "checkout.session.expired": checkoutExpired,
\`\`\`

## 3. Verified clean

Every line here carries the command that produced it. "Looks fine" is not a finding.

\`\`\`
$ rg -n 'billing_cycle_anchor' lib/                          → 0 results
$ rg -n 'proration_behavior' lib/                            → 1 result  (seat-sync.ts:29, explicit)
$ rg -n 'req\\.json\\(\\)' lib/billing/                          → 0 results
$ rg -n 'req\\.text\\(\\)' lib/billing/webhook.ts                → 11:  const raw = await req.text();
$ rg -n 'from "stripe"' app/ components/                     → 0 results  (lint rule holds)
$ rg -n 'STRIPE_(SECRET|WEBHOOK)' --glob '!lib/billing/**'   → 0 results
$ rg -n 'NEXT_PUBLIC_STRIPE'                                 → 0 results  (hosted Checkout needs no key)
$ rg -n 'idempotencyKey' lib/billing/                        → 3 results  (customers, sessions, subscription_items)
$ rg -n 'CREATE UNIQUE INDEX' prisma/migrations/*/migration.sql
    → "StripeEvent_stripeEventId_key" ON "StripeEvent"("stripeEventId")
$ npm run lint                                               → 0 problems
$ npx prettier --check .                                     → All matched files use Prettier code style!
$ rg -n 'subscriptions\\.update' lib/                         → 0 results  (Invariant 2 holds)
\`\`\`

- **Signature is verified on raw bytes**, before any parse. Confirmed above.
- **Idempotency ledger is correct.** Unique index confirmed in the migration; replay path returns 200 without re-running the handler (\`webhook.ts:31-38\`); concurrent-delivery test at \`webhook.test.ts:141\` exercises two simultaneous POSTs of one \`evt_\`.
- **\`subscription.deleted\` writes \`canceled\`, never NULL.** An absent status would fail open — we would treat a cancelled account as paying. \`handlers.test.ts:88\` asserts non-null.
- **Refunds are out of scope on purpose**, documented in spec §9 and the launch plan, not silently missing.
- **CSRF:** \`/api/billing/checkout\` requires a session cookie plus an \`Origin\` check; same-origin JSON, no token needed.
- **No SSRF:** no handler issues outbound HTTP derived from payload content.
- **Portal URLs are Stripe-signed**; we never construct one.
- **Performance:** \`BillingStatus\` reads hit the composite PK; \`EXPLAIN\` shows Index Scan, no seq scans on either new table.

## 4. Recommended fix order

1. **F-002** — money moves; do it first, and it is independent of everything else.
2. **F-001** — same file the F-005 exemption touches conceptually, but independent; small.
3. **F-004** — unblocks putting \`tsc\` in CI, which gates the rest.
4. **F-003** — depends on nothing, but the fix is easiest to verify once \`tsc\` is green.
5. **F-005** — config-only, one line.
6. **F-006** — test-only; land it last so it covers the final handler shape.

**Gate: BLOCKED.** Two HIGH findings on the money path. oc-git-ops may not open
the PR until both are VERIFIED.

## 5. \`/oc-audit fix-all\`

### Fix: [F-002] No server-side duplicate-subscription guard — round 1

\`\`\`diff
--- a/components/PricingCard.tsx
+++ b/components/PricingCard.tsx
@@ -31,7 +31,11 @@ export function PricingCard({ tier, billing }: Props) {
-      <button className="upgrade" onClick={() => startCheckout(tier)}>
-        Upgrade
-      </button>
+      <button
+        className="upgrade"
+        disabled={billing?.status === "active" || billing?.status === "pending"}
+        onClick={() => startCheckout(tier)}
+      >
+        {billing?.status === "active" ? "Current plan" : "Upgrade"}
+      </button>
\`\`\`

**Rationale:** the user can no longer click Upgrade while a subscription is
active or pending, so no second Checkout Session is created.

**Tests affected:** 42 passing; no new test.
**Files changed:** \`components/PricingCard.tsx\` (+5 −3)

### Verification — Fix [F-002] (round 1)

**Finding:** no server-side guard against a second subscription.
**Fix:** disables the Upgrade button in the pricing UI when status is active or pending.

**Verdict: REJECTED**

- Does the diff address the finding? **No.** The finding's evidence is two \`curl\` POSTs with a session cookie — no browser involved. A disabled button is a hint, not a guard; \`POST /api/billing/checkout\` still creates a Session for an \`active\` owner.
- Scope: **out of scope.** \`components/PricingCard.tsx\` is not in this diff (shipped in #209). The fix modifies a file the audit did not cover, which also means it is not exercised by any test in this PR.
- Regressions: none, but the change is load-bearing UI on the pricing page and would need its own review.
- Completeness: the server-side path — the one that takes money — is untouched.

**Guidance:** put the check in \`app/api/billing/checkout/route.ts\` (or
\`createCheckoutSession\`) before the first Stripe call, and return 409
\`already_subscribed\`. Keep the UI change if you like it, but it is not the fix.

### Fix: [F-002] — round 2

\`\`\`diff
--- a/lib/billing/checkout.ts
+++ b/lib/billing/checkout.ts
@@ -18,6 +18,16 @@ export async function createCheckoutSession(
   const existing = await db.billingStatus.findUnique({
     where: { ownerType_ownerId: { ownerType, ownerId } },
   });
+
+  // One active subscription per owner (spec Invariant 1). This has to be
+  // here, not at webhook ingestion: by checkout.session.completed the card
+  // has already been charged, so a 409 there is a log line, not a guard.
+  if (existing && (existing.status === "active" || existing.status === "pending")) {
+    return { error: "already_subscribed" };
+  }
+
--- a/app/api/billing/checkout/route.ts
+++ b/app/api/billing/checkout/route.ts
@@ -22,6 +22,9 @@ export async function POST(req: NextRequest) {
   const result = await createCheckoutSession(ownerType, ownerId, tier);
+  if ("error" in result) {
+    return Response.json({ error: result.error }, { status: 409 });
+  }
   return Response.json({ url: result.url });
\`\`\`

**Rationale:** refuse before any Stripe call, on the path that actually moves
money. \`pending\` is included deliberately — an in-flight Checkout is a
second-charge risk, and \`checkout.session.expired\` releases it within 45 minutes.

**Tests affected:** +1 (\`checkout.test.ts\` #19 — two POSTs, second returns 409,
zero Stripe calls asserted via the SDK spy). 43 passing.
**Files changed:** \`lib/billing/checkout.ts\` (+10), \`app/api/billing/checkout/route.ts\` (+3)

### Verification — Fix [F-002] (round 2)

**Verdict: VERIFIED** — guard runs before the first Stripe call; the repro is
now \`409 409\` for two consecutive POSTs; scope is surgical (13 lines, both in
the audited diff); \`pending\` inclusion is correct and bounded by \`expires_at\`.

### Remaining fixes

| Finding | Diff | Verifier |
|---|---|---|
| **F-001** | \`webhook.ts\` — \`try/catch\` around \`constructEventAsync\` → 400, no ledger row, \`console.warn\` with byte count only (+11 −4); test #9 rewritten to sign a payload with the wrong secret instead of stubbing the verifier | **VERIFIED** — repro now returns 400; the ledger is not written for unverified bytes, which also closes an unbounded-write path |
| **F-003** | \`checkout-completed.ts\` — retrieve with \`expand: ["line_items"]\`, derive \`plan\` from the Price id and \`seats\` from \`quantity\`; \`checkout.ts\` also now sets \`metadata.tier\` for forensics (+18 −6) | **VERIFIED** — 4-seat Team checkout writes \`plan='team', seats=4\`; handler no longer depends on metadata |
| **F-004** | \`seat-sync.ts\` — separate \`billingStatus.findUnique\`, \`expand\` dropped (+7 −3) | **VERIFIED** — \`tsc --noEmit\` clean; one extra query, indexed on the PK |
| **F-005** | \`middleware.ts\` — matcher \`["/api/((?!billing/webhook).*)"]\` (+1 −1) | **VERIFIED** — \`hey -n 80\` now returns 80× 200 on the webhook route; \`/api/projects\` still 429s at 61 |
| **F-006** | \`webhook.test.ts\` — expired-session fixture, asserts \`pending\` → \`free\` (+22) | **VERIFIED** — fails if the handler is unregistered |

\`\`\`
Fix-all complete: 6 findings, 6 fixed, 6 verified (1 needed a second round).
Tests: 45 passed (45) in 1.91s.  tsc --noEmit: clean.  ESLint: 0 problems.
Overall health: A−  (was B)
\`\`\`

### CI gap closed

\`tsc --noEmit\` was never in \`.github/workflows/ci.yml\` — the matrix ran
\`npm test\` and \`npm run lint\` only, and vitest transpiles per file without
type-checking. That is why F-004 shipped to a branch at all. Added as a job;
it fails the F-004 commit and passes at \`9d41ba7\`.

## 6. Sign-off

- **Auditor:** oc-code-auditor v1.9.0
- **Mode:** \`/oc-audit full\` → \`/oc-audit fix-all\` (Auditor → Fixer → Verifier, isolated contexts)
- **Run-time:** 6 m 18 s end-to-end (sweeps + lint + typecheck + tests + grep gates + EXPLAIN)
- **Gate verdict:** PASS at \`9d41ba7\` — oc-git-ops may open the PR.
- **Re-audit recommended:** before any change to \`webhook.ts\` ingestion, and on the acacia → basil upgrade (\`HD-318\`).

\`\`\`json
"eval_scores": [
  { "rubric": "oc-code-auditor", "score": 9.0, "max": 10,
    "at": "2026-06-11T16:42:10Z",
    "dimensions": { "security": 9, "performance": 9, "quality": 9, "config": 9 },
    "ref": ".checkpoints/oc-code-auditor.checkpoint.json" }
]
\`\`\``,
    },
    {
      id: "checkpoint-integrations",
      label: ".checkpoints/oc-integrations-engineer.checkpoint.json",
      kind: "checkpoint.json",
      body:
`# \`.checkpoints/oc-integrations-engineer.checkpoint.json\`

Final state, written Mon 2026-06-15 after the post-launch review. Tracked in
git, so the next session on this repo reads it instead of re-reading the
codebase. Mid-week it sat at \`phase: "build" · step: "tester-round-2-pass"\` —
that is what Thursday's \`npm run checkpoint:status\` printed.

\`\`\`json
{
  "protocol_version": "1.1",
  "skill": "oc-integrations-engineer",
  "project": "headsdown-app",
  "project_dir": "/Users/sam/code/headsdown-app",
  "created_at": "2026-06-08T22:14:02Z",
  "updated_at": "2026-06-15T16:31:20Z",
  "phase": "live",
  "step": "post-launch-review",
  "status": "complete",
  "progress_summary": "Stripe subscriptions (Pro $19 / Team $49 per-seat) shipped behind FLAG_STRIPE_LIVE. Planner spec approved 06-08 with two founder changes (no IP allow-list; checkout.session.expired instead of an abandoned-checkout cron). Builder + Tester ran two rounds against real test mode; round 1 failed on owner resolution, expires_at and an unguarded signature check. oc-code-auditor found 6 (2 HIGH) and blocked the merge; fix-all verified all 6, one after a REJECTED first attempt. PR #214 merged 06-11 16:58 PT, canary (6 accounts) 06-12 10:00 PT, 100% 14:00 PT. Monday: 9 subscriptions, 0 past_due, 0 signature failures.",
  "progress_table": [
    { "id": "planned",   "label": "Integration spec approved (2 changes)", "status": "complete" },
    { "id": "contract",  "label": "Build contract + testable criteria",    "status": "complete" },
    { "id": "builder",   "label": "Boundary layer + migration + 42 tests", "status": "complete" },
    { "id": "tester-1",  "label": "Sandbox round 1 — FAIL (3 fixes)",      "status": "complete" },
    { "id": "tester-2",  "label": "Sandbox round 2 — PASS (1 deferred)",   "status": "complete" },
    { "id": "audit",     "label": "/oc-audit full → fix-all, A−",          "status": "complete" },
    { "id": "staging",   "label": "Staging soak, 63 events, 0 failed",     "status": "complete" },
    { "id": "go-live",   "label": "Canary 6 accounts → 100%",             "status": "complete" }
  ],
  "context_primer": {
    "key_decisions": [
      "apiVersion pinned to 2024-11-20.acacia on purpose: 2025-03-31.basil moves current_period_end onto SubscriptionItem and nests invoice.subscription under invoice.parent. Upgrade tracked as HD-318.",
      "No Stripe IP allow-list. Stripe publishes discrete webhook IPs, not a CIDR block; the app is behind Cloudflare, HMAC is the control, and an allow-list breaks stripe listen in dev. Founder call, 06-08.",
      "Duplicate-subscription guard lives at POST /api/billing/checkout (409 already_subscribed), not at webhook ingestion — by checkout.session.completed the card is charged. Audit F-002.",
      "checkout.session.expired replaces the abandoned-checkout cron entirely. No reconciler, no clock-controlled test.",
      "Seat removal mid-cycle uses proration_behavior: create_prorations — a credit line on the next invoice, not a card refund. 'none' was offered and declined.",
      "Handlers resolve the owner via resolveOwner(): metadata fast path, stripeCustomerId source of truth. invoice.* and customer.* events never carry Checkout metadata.",
      "One flag source: Workers KV via getFlag(); no FLAG_STRIPE_LIVE in any deployed .env."
    ],
    "generated_files": [
      "integrations/stripe/integration-spec.md",
      "integrations/stripe/test-round-1.md",
      "integrations/stripe/test-round-2.md",
      "lib/billing/** (17 source files + 8 fixtures)",
      "prisma/migrations/20260609103417_add_stripe_billing/migration.sql",
      "docs/runbooks/stripe-go-live.md"
    ],
    "user_preferences": [
      "Sentry + Linear. No PagerDuty — founder plus one contractor (Nadia Okafor, 09:00–13:00 PT).",
      "Show the diff before applying it.",
      "No sandbox credentials in CI; sandbox runs are local or staging."
    ]
  },
  "blockers": [],
  "next_actions": [
    "HD-318: migrate apiVersion acacia → basil (current_period_end, invoice.parent) behind a re-audit of webhook.ts",
    "Add checkout.session.async_payment_failed if we ever enable a delayed-notification payment method",
    "Revisit the 5-minute seat-sync cron once seat churn data exists — it has fired 0 corrective updates so far"
  ],
  "pm_refs": [
    { "provider": "linear", "id": "HD-301", "role": "parent", "url": "https://linear.app/headsdown/issue/HD-301" },
    { "provider": "github", "id": "headsdown/app#214", "role": "pr" }
  ],
  "eval_scores": [
    { "rubric": "oc-code-auditor", "score": 9.0, "max": 10, "at": "2026-06-11T16:42:10Z",
      "dimensions": { "security": 9, "performance": 9, "quality": 9, "config": 9 },
      "ref": ".checkpoints/oc-code-auditor.checkpoint.json" }
  ],
  "skill_state": {
    "integrations": {
      "stripe": {
        "status": "built",
        "auth": "api_key+webhook_secret",
        "api_version": "2024-11-20.acacia",
        "endpoints": 5,
        "webhook_events": 7,
        "webhook_endpoint_id": "we_1QZ8kDKsT2aLmNbQwErTy",
        "test_rounds": 2,
        "last_test": "PASS",
        "last_test_at": "2026-06-09T23:41:08Z",
        "deferred_from_testing": ["signature-failure-status (closed by audit F-001)"]
      }
    },
    "flags": { "FLAG_STRIPE_LIVE": true, "FLAG_STRIPE_LIVE_ALLOWLIST": null }
  }
}
\`\`\``,
    },
    {
      id: "pull-request",
      label: "#214 feat(billing): Stripe subscriptions (Pro/Team, per-seat)",
      kind: "pull-request",
      body:
`# #214 · feat(billing): Stripe subscriptions (Pro/Team, per-seat)

\`headsdown/app\` · \`feat/stripe-billing\` → \`main\` · opened Thu 2026-06-11 15:12 PT
· https://github.com/headsdown/app/pull/214

\`\`\`
$ gh pr create --base main --head feat/stripe-billing --fill-verbose
https://github.com/headsdown/app/pull/214

$ gh pr diff 214 --stat | tail -1
 31 files changed, 1489 insertions(+), 7 deletions(-)
\`\`\`

## Summary

Two subscription tiers behind hosted Stripe Checkout: **Pro** \$19/mo for a
single \`User\`, **Team** \$49/mo × seats for a \`Team\`. Seats are the team's
member count, reconciled into Stripe on add/remove and by a 5-minute safety
cron. All Stripe access goes through \`lib/billing/\`; nothing else in the repo
imports \`stripe\` (ESLint enforces).

State lives in two new tables: \`StripeEvent\` (idempotency ledger, unique on
\`stripeEventId\`) and \`BillingStatus\` (denormalized, polymorphic on
\`(ownerType, ownerId)\`, the only thing the UI reads). Seven webhook events,
signature-verified on the raw body with \`constructEventAsync\` + subtle-crypto
because OpenNext runs the route in workerd.

Everything is gated on \`FLAG_STRIPE_LIVE\` (Workers KV, per request, with an
owner allowlist for the canary). Webhook ingestion is deliberately **not**
gated — events for existing subscriptions must keep landing after a rollback.

## Decisions worth a reviewer's attention

- \`apiVersion\` pinned to \`2024-11-20.acacia\`, not the newest. Basil moves \`current_period_end\` onto \`SubscriptionItem\`; two handlers read it off the Subscription. Upgrade is HD-318.
- No Stripe IP allow-list — HMAC is the control, the published list is discrete IPs that change, and an allow-list 403s \`stripe listen\` in dev.
- The duplicate-subscription guard is at \`POST /api/billing/checkout\` (409), not in the webhook. By \`checkout.session.completed\` the card is charged.
- \`checkout.session.expired\` replaces the abandoned-checkout cron that was in the first draft of the spec.
- \`middleware.ts\` matcher now excludes \`/api/billing/webhook\` — Stripe redelivers from ~12 fixed IPs and a 429 counts as a failed delivery.

## Test plan

\`\`\`
$ npm test -- tests/billing
 Test Files  8 passed (8)
      Tests  45 passed (45)
   Duration  1.91s

$ npx tsc --noEmit       # new CI job in this PR
$ npm run lint           # 0 problems
\`\`\`

- \`integrations/stripe/test-round-1.md\` — **FAIL** against real test mode (owner resolution, \`expires_at\`, signature status).
- \`integrations/stripe/test-round-2.md\` — **PASS**, including a test-clock renewal that produced a real \`invoice.payment_failed\` and a 402 on a write path.
- \`/oc-audit full\` → 6 findings (2 HIGH) → \`fix-all\` → 6/6 VERIFIED (F-002 took two rounds). **A−**.
- Staging has been on test-mode keys since Tue 06-09 14:40 PT: 63 events delivered, 0 failed.

## Reviewer checklist

- [x] \`oc-bug-check\` pre-commit gate: PASS (14.8 s)
- [x] No secret in the diff (\`rg 'sk_|whsec_|rk_'\` → 0)
- [x] Migration is additive; no backfill (absence of a row = free tier)
- [x] Rollback is a KV flag flip, ≤ 10 s, no deploy
- [ ] **@nadia-okafor** — please look hardest at \`webhook.ts\` ordering (ledger write vs. verification) and at whether \`pending\` belongs in the F-002 guard

## Checkpoint

\`.checkpoints/oc-integrations-engineer.checkpoint.json\` — \`phase: "build"\`,
\`step: "audit-passed"\`, \`test_rounds: 2\`. Closes at \`phase: "live"\` after Friday.`,
    },
    {
      id: "launch-plan",
      label: "Go-live runbook + rollback",
      kind: "runbook",
      body:
`# Launch Plan — Stripe Go-Live

\`docs/runbooks/stripe-go-live.md\` · **Window** Fri 2026-06-12, 10:00 PT
· **Owner** founder · **Rollback** ≤ 10 s via KV flag · **Drill** Thu 2026-06-11 18:05 PT

## 1. Pre-flight (Thu 2026-06-11, evening)

- [x] 45 tests green on \`main\` at \`9d41ba7\` (\`Test Files 8 · Tests 45 · 1.91s\`); \`tsc --noEmit\` now in the CI matrix
- [x] Audit gate: \`/oc-audit full\` → \`fix-all\`, 6/6 VERIFIED, **A−** (separate artifact)
- [x] Staging on **test-mode** keys since Tue 06-09 14:40 PT — **63 events delivered, 0 failed** (Dashboard → Developers → Webhooks → \`we_1QZ8kDKsT2aLmNbQwErTy\`). No live key has ever been set on staging.
- [x] Webhook handler **p99 86 ms** over those 63 deliveries (Workers Analytics Engine, dataset \`billing_webhook\`, Thu 17:20 PT)
- [x] Production live-mode webhook endpoint created, subscribed to exactly the seven events, secret in \`wrangler secret\`
- [x] \`FLAG_STRIPE_LIVE\` = \`false\` in production KV; no \`FLAG_STRIPE_LIVE\` in any deployed \`.env\`
- [x] KV flip rehearsed on staging: 8.2 s to full edge propagation
- [x] Customer Portal branding + cancellation policy configured; dunning = Stripe Smart Retries, 4 attempts over 3 weeks
- [x] Refund procedure documented (dashboard-only in v1; §6)
- [x] Seven staging purchases executed with real test cards:

| # | Case | Card | Result |
|---|---|---|---|
| 1 | Pro, valid card | \`4242 4242 4242 4242\` | \`active\`, \`plan=pro\`, \`seats=NULL\` in 1.9 s |
| 2 | Team (4 members), valid card | \`4242 4242 4242 4242\` | \`active\`, \`plan=team\`, \`seats=4\` in 2.2 s |
| 3 | Pro, declined | \`4000 0000 0000 0002\` | no session completed, row stays \`pending\`, expires to \`free\` |
| 4 | Team, insufficient funds | \`4000 0000 0000 9995\` | same; no ledger row for a charge that never happened |
| 5 | Add member → seat-sync up | — | 4 → 5 in 3.1 s, proration line on upcoming invoice |
| 6 | Remove member → seat-sync down | — | 5 → 4, credit line \$9.80 on upcoming invoice |
| 7 | Cancel via Portal | — | \`customer.subscription.deleted\` → \`canceled\` in 1.4 s |

## 2. Go-live sequence (Fri 2026-06-12)

### 2.1 09:30 PT — people

- Founder online (primary on-call).
- Nadia Okafor (contractor) online 09:00–13:00 PT as secondary; after 13:00 the founder is sole on-call and the 14:00 step moves to Monday if she is needed.
- Channel \`#go-live-stripe\` open. No PagerDuty — Sentry alerts route to the founder's phone.

### 2.2 09:45 PT — smoke

\`\`\`bash
curl -fsS https://oc-app.headsdown.app/api/health | jq -r '.version'
# 9d41ba7   (must equal the merged SHA)
curl -fsS -o /dev/null -w '%{http_code}\\n' \\
  -X POST https://oc-app.headsdown.app/api/billing/webhook -d '{}'
# 400       (no signature → 400, not 500; audit F-001)
\`\`\`

### 2.3 09:50 PT — one real charge, on our own card

Before anyone else can reach it, the founder buys Pro in **live mode** on a
personal card, confirms \`BillingStatus\` flips to \`active\`, then refunds it in
the dashboard. This is the only way to know the live keys, the live webhook
secret and the live Price ids are all correct together.

Record: subscription id, refund id, elapsed webhook latency. Cancel the
subscription after the refund — a refund alone leaves it active.

### 2.4 10:00 PT — canary: 6 accounts

Not a percentage. Six named accounts — three internal, three friendlies who
agreed on Thursday — so every early failure has a person we can call.

\`\`\`bash
wrangler kv key put --binding=FLAGS FLAG_STRIPE_LIVE_ALLOWLIST \\
  '["usr_internal1","usr_internal2","usr_internal3","usr_friend1","usr_friend2","usr_friend3"]'
wrangler kv key put --binding=FLAGS FLAG_STRIPE_LIVE true
\`\`\`

\`getFlag()\` returns true only when the owner id is in the allowlist while the
allowlist key exists. Everyone else keeps getting the 503 "billing temporarily
unavailable" path.

### 2.5 10:00 → 11:00 PT — watch

| Signal | Where | Threshold |
|---|---|---|
| Webhook deliveries + status | Stripe Dashboard → Webhooks → \`we_…\` | every delivery 2xx |
| Handler errors | Sentry, scope \`lib/billing/*\` | 0 |
| Handler p99 | Workers Analytics Engine, \`billing_webhook\` | < 200 ms |
| 5xx on \`/api/billing/*\` | \`wrangler tail --env production --status error\` | 0 |
| Row distribution | \`SELECT status, count(*) FROM "BillingStatus" GROUP BY 1;\` every 5 min | \`pending\` drains within a minute |
| Support | Linear inbox, label \`billing\` | 0 |

### 2.6 11:00 PT — go / no-go

- [ ] 0 signature failures (\`SELECT count(*) FROM "StripeEvent" WHERE "errorMessage" IS NOT NULL;\` → 0)
- [ ] 0 Sentry errors in \`lib/billing/*\`
- [ ] every completed Checkout reached \`active\` within 5 s
- [ ] seat-sync verified on a real add/remove
- [ ] 0 billing tickets

No-go → §4. Go → hold.

### 2.7 11:00 → 14:00 PT — hold at six accounts

Three hours is not arbitrary: 10:00–13:00 PT is the window where **~70% of our
signups land** (PostHog, last 30 days), so holding through it exercises the
real traffic shape rather than a quiet afternoon.

### 2.8 14:00 PT — everyone

\`\`\`bash
wrangler kv key delete --binding=FLAGS FLAG_STRIPE_LIVE_ALLOWLIST
# FLAG_STRIPE_LIVE stays true; with no allowlist key it applies to all owners.
\`\`\`

### 2.9 14:00 → Monday — watch

| Signal | Where | Threshold |
|---|---|---|
| Event rate | Stripe Dashboard | within 20% of checkout count |
| \`pending\` rows older than 45 min | \`SELECT count(*) FROM "BillingStatus" WHERE status='pending' AND "updatedAt" < now() - interval '45 minutes';\` | 0 — a non-zero means \`checkout.session.expired\` is not landing |
| \`past_due\` | same table, \`GROUP BY status\` | ≈ 0 in week one; new cards rarely fail |
| Sentry \`lib/billing/*\` | Sentry | 0 |
| Linear \`billing\` label | Linear | < 3 in 24 h |

## 3. Communication

| Time | Channel | What |
|---|---|---|
| Thu 18:00 | \`#announcements\` | "Paid plans go live tomorrow, six accounts at 10:00, everyone at 14:00" |
| Fri 09:50 | \`#go-live-stripe\` | "Going live in 10" |
| Fri 11:00 | \`#go-live-stripe\` | canary result |
| Fri 14:00 | \`#announcements\` + status page | "Paid plans are live" |
| Fri 17:00 | \`#go-live-stripe\` | end-of-day numbers |
| Mon 10:00 | \`#announcements\` | post-launch review (§6) |

## 4. Rollback (≤ 10 s)

\`\`\`bash
wrangler kv key put --binding=FLAGS FLAG_STRIPE_LIVE false
\`\`\`

One command, one key. Propagation measured at 8.2 s on staging.

### 4.1 Still works after rollback

Existing subscribers keep being billed by Stripe; webhooks keep landing and
updating \`BillingStatus\` (ingestion is never flag-gated); cancel and downgrade
still work through the Customer Portal.

### 4.2 Stops working

New Checkout sessions (\`/api/billing/checkout\` → 503) and new Portal sessions.

### 4.3 If the flag isn't enough

If the fault is in ingestion rather than the flag-gated UI:

1. **Do not "pause" the endpoint expecting a queue.** A disabled endpoint receives nothing and Stripe queues nothing for it. Recovery is a manual resend:
   \`\`\`bash
   stripe events resend evt_1QZ7x2KsT2aLmNb4Hn9Pq --webhook-endpoint we_1QZ8kDKsT2aLmNbQwErTy
   \`\`\`
2. **Find the gap first.** Every event Stripe sent since time T that we have no ledger row for:
   \`\`\`sql
   -- paste the dashboard's event ids for the window into evt_ids
   SELECT e.id FROM unnest(:evt_ids) AS e(id)
   LEFT JOIN "StripeEvent" s ON s."stripeEventId" = e.id
   WHERE s."stripeEventId" IS NULL;
   \`\`\`
   Resend exactly those. Handlers are idempotent, so an over-broad resend is safe but noisy.
3. **Do not** set \`STRIPE_WEBHOOK_SECRET\` to a bad value to "stop" traffic. That returns 400 (audit F-001), Stripe records failed deliveries, and after three days it disables the endpoint.
4. Last resort: patch \`BillingStatus\` rows directly with \`scripts/ops/billing-fix.ts\`, which logs every write to the ledger with \`ownerType='ops'\`.

## 5. Dunning — the 402 gate heals itself

A single failed renewal flips an owner to \`past_due\` and mutations return 402.
That is not a lockout: Stripe Smart Retries re-attempt on the dashboard
schedule (4 attempts over ~3 weeks), and a successful retry emits
\`invoice.payment_succeeded\`, which \`invoice-payment-succeeded.ts\` uses to flip
back to \`active\`. The sequence is covered by the
\`payment_failed → past_due → payment_succeeded → active\` test in
\`tests/billing/handlers.test.ts\`, and was exercised for real on a test clock in
round 2. Reads and exports stay open throughout.

## 6. Post-launch review — Mon 2026-06-15, 09:00 PT

Measured since the 10:00 PT flip:

| Metric | Value |
|---|---|
| Checkout Sessions opened | 14 |
| Completed | 9 (5 Pro, 4 Team) — excludes the 09:50 smoke purchase, refunded |
| Average Team size at subscribe | 3.5 seats |
| Expired (abandoned) | 5, all flipped \`pending\` → \`free\` by \`checkout.session.expired\` |
| \`past_due\` | 0 |
| Webhook events delivered | 41, all 2xx |
| Handler p99 | 118 ms |
| Signature failures | 0 |
| Sentry \`lib/billing/*\` | 0 |
| Billing tickets | 0 |

Conversion: pricing page → Checkout opened 11.2%; Checkout opened → completed
64% (9/14) — the five expiries are the number to chase next.

## 7. Out of v1, queued

Annual billing (10% off) · coupon codes · Stripe Tax for the EU/UK launch ·
refund-from-portal · in-app tier swap · HD-318 acacia → basil.

Checkpoint: \`.checkpoints/oc-integrations-engineer.checkpoint.json\` closes at
\`phase: "live"\`, \`status: "complete"\` with this snapshot attached.`,
    },
  ],
  skills: ["oc-integrations-engineer", "oc-code-auditor", "oc-git-ops"],
  runtime: "≈ 32 exchanges",
  steps: [
    { type: "beat", phase: "discover", label: "01 · Mon 06-08 — Brief", caption: "/oc-integrate plan — the Planner reads the docs before it writes anything", skills: ["oc-integrations-engineer"] },

    {
      type: "exchange", role: "user",
      content:
`I need Stripe subscriptions in headsdown-app by Friday. Two tiers — Pro $19/mo, Team $49/mo, per-seat on Team. App is live: Next 15 on Cloudflare via OpenNext, Neon Postgres through Hyperdrive, Prisma 6. I have never wired Stripe before.

Stack facts so you don't guess: Sentry, Linear, no PagerDuty. Global limiter in middleware.ts, 60/min/IP on /api/* — don't break it. Two test-mode Prices already exist: price_1QXPro9KsT2aLmNbRx4Vq7 and price_1QXTeam3KsT2aLmNbZy8Wc, both flat unit_amount.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-integrations-engineer",
      content:
`\`/oc-integrate plan stripe\` — Planner agent, current docs first: my Stripe training data is stale by construction and this is the money path.

**The version pin is a decision, not a default.** \`2024-11-20.acacia\`, not the newest: \`2025-03-31.basil\` moved \`current_period_end\` off \`Subscription\` onto \`SubscriptionItem\`, and two handlers I'm about to write read it there. Upgrading is its own ticket.

**Your platform changes one thing.** OpenNext runs route handlers in workerd, which has no \`node:crypto\` — verification has to be \`constructEventAsync\` with \`Stripe.createSubtleCryptoProvider()\`, or every webhook 500s in production.

Paste \`schema.prisma\` for \`User\` and \`Team\`.`
    },
    {
      type: "exchange", role: "user",
      content:
`\`\`\`prisma
model User { id String @id email String @unique teamId String? team Team? @relation(fields: [teamId], references: [id]) }
model Team { id String @id slug String @unique members User[] }
\`\`\`
Seat count = count of User where teamId = Team.id.

Two things I don't understand: (1) when someone removes a teammate mid-month, do they get money back? I don't want surprise credits. (2) I made the Team Price a flat $49 — do I have to recreate it as per-seat?`
    },
    {
      type: "exchange", role: "claude", skill: "oc-integrations-engineer",
      content:
`**(1) Mid-month seat removal.** \`create_prorations\` writes a **credit line item onto the next invoice** — no refund to the card, their next bill is just smaller; 5→4 on day 12 of a $49×5 month is about −$9.80. Pricing call, so it goes in \`key_decisions\` under your name.

**(2) Your Price is already per-seat.** A licensed Price with flat \`unit_amount: 4900\` bills per seat the moment the line item carries a \`quantity\` — \`quantity: 4\` is $196/mo. Nothing to recreate.

**Seven events**, not four. One thing to sign off before \`/oc-integrate build\`: the guard against a second subscription sits at **checkout creation** (409), not at webhook ingestion — by \`checkout.session.completed\` the card is charged. **What would you cut?**`
    },
    {
      type: "exchange", role: "user",
      content:
`Looks right except two things.

Drop the IP allow-list in §10. We're behind Cloudflare and I am not maintaining a list of Stripe IPs that changes without telling me. The signature check is the control.

And no cron for abandoned checkouts — isn't there an event when a checkout expires? A background job guessing at what Stripe already knows is the kind of thing that breaks at 2am.

create_prorations is fine, write it down as my call.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-integrations-engineer",
      content:
`Both accepted — and you're right, I reached for a cron before checking the event list. The allow-list would also have 403'd \`stripe listen\` from 127.0.0.1 inside ten minutes.

**\`checkout.session.expired\` exists**: Stripe emits it when \`expires_at\` passes on an incomplete session, and the handler flips \`pending\` → \`free\` on receipt.

One open item carried into the build rather than quietly fixed: **your limiter matches \`/api/:path*\`, which includes the webhook route**, and Stripe counts the 429s a retry burst earns as failed deliveries.

Checkpoint \`phase: "planned"\`, \`key_decisions\` +5.`,
      artifacts: ["integration-contract"],
    },

    { type: "beat", phase: "build", label: "02 · Tue 06-09 — Build + Tester", caption: "Builder ships the boundary; the Tester hits real test mode and breaks it", skills: ["oc-integrations-engineer"] },

    {
      type: "exchange", role: "user",
      content:
`Go. One build constraint: CI has no Stripe account and I'm not putting a key in GitHub Actions, so keep anything that touches the network out of \`npm test\`.

Also — the webhook secret. Where does it come from, and is it the same in test and live?`
    },
    {
      type: "exchange", role: "claude", skill: "oc-integrations-engineer",
      content:
`Different secret per endpoint, per mode — test, staging and production each get their own, plus a fourth that \`stripe listen\` prints for local forwarding.

Builder: schema, then the boundary — nothing outside \`lib/billing/\` imports \`stripe\`, and a test asserts the ESLint rule fires. \`vitest run tests/billing\`: **42 passed (42)** in 1.84s, every one fixture-driven, no network.

42 green and I don't believe them yet. They prove the code agrees with my own mocks; they say nothing about whether Stripe agrees. That's the Tester's job, in an isolated context reading the spec rather than my implementation notes.`,
      artifacts: ["boundary-layer"],
    },
    {
      type: "exchange", role: "user",
      content:
`Run it. Restricted test key is in \`.env.local\` as \`rk_test_51Q…Hd\` — write scope on checkout_sessions and customers, no read on balance. \`stripe\` CLI 1.30.0, already logged in.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-integrations-engineer",
      content:
`Tester round 1, real test mode.

\`\`\`
$ stripe trigger checkout.session.completed
14:02:11  --> checkout.session.completed [evt_1QZ7x2KsT2aLmNb4Hn9Pq]
14:02:11  <-- [500] POST localhost:3000/api/billing/webhook
Error: missing owner metadata
    at checkoutCompleted (lib/billing/handlers/checkout-completed.ts:9:32)
\`\`\`

Three failures, and the first checkout call never even got that far:

\`\`\`
$ node scripts/dev/checkout.mjs --tier team --owner Team:tm_9xQ2
StripeInvalidRequestError: This value must be at least 30 minutes in the future.
    param: expires_at   request-id: req_9fYb2LxKq0Tn4A   at lib/billing/checkout.ts:58:34
\`\`\`

\`now + 30 * 60\` sits exactly on Stripe's minimum and the request spends 200–400 ms in flight, so it's stale on arrival. **100% failure rate**, not flaky — and every one of my 42 mocked tests passed this code.

Third: a curl with \`stripe-signature: v1=deadbeef\` returns **500**, should be 400. \`constructEventAsync\` is outside any try/catch, so the error escapes the route; test #9 asserts 400 and is green against the MSW stub that never runs the real verifier.

**Verdict: FAIL.**`,
      artifacts: ["tester-round-1"],
    },
    {
      type: "exchange", role: "user",
      content:
`\`14:02:11  <-- [500] POST localhost:3000/api/billing/webhook\`

Is that my bug or the CLI's? If \`stripe trigger\` sends a fake event that doesn't look like a real one, I don't want you rewriting working code to satisfy a fixture.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-integrations-engineer",
      content:
`It's both, and the CLI half is the smaller half: \`stripe trigger\` builds its own fixtures, so of course they carry none of *your* metadata. But four of your seven events never carry Checkout metadata **in production either** — \`invoice.*\` and \`customer.*\` objects aren't the Checkout Session.

\`\`\`
$ stripe events list --type invoice.payment_failed --limit 1 | jq '.data[0].data.object.metadata'
{}
\`\`\`

So \`session.metadata\` was never a shape that works; the fixture just made it fail on day one instead of on the first real renewal. One resolver now — metadata when it's there, \`BillingStatus.stripeCustomerId\` otherwise. With that, \`expires_at\` at now + 45 min and \`maxNetworkRetries: 2\`, round 2 ran against staging so the code executes in workerd: 7/7 events 2xx, 7/7 replays as no-ops.

One thing I did **not** fix: the bad-signature 500. The try/catch moves where the ledger row gets written relative to verification — that wants review, not a six-in-the-evening edit. Carried into the audit gate.`
    },
    {
      type: "exchange", role: "user",
      content:
`Before the audit I want to see past-due actually happen. Not a mocked event — a real failed renewal, and the app then refusing to let me write. That's what I'll get a support email about.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-integrations-engineer",
      content:
`That's what test clocks are for — the only way to see it without waiting until July. Card \`4000 0000 0000 0341\` attaches cleanly and then fails when charged: healthy right up until the renewal.

\`\`\`
$ node scripts/dev/test-clock.mjs advance --to "2026-07-10T00:00:00Z"   ready (18.4s)
16:58:06  --> invoice.payment_failed   <-- [200] 71ms   BillingStatus: past_due, pro

$ curl -s -X POST https://staging.headsdown.app/api/projects -d '{"name":"x"}' -i
HTTP/2 402  {"error":"past_due","portal_url":"/api/billing/portal"}
\`\`\`

402 on a write path, 5.1 seconds end to end. Reads and exports still work; people should always be able to get their own data out. Round 2: **PASS**, one item deferred to the audit.`,
      artifacts: ["tester-round-2"],
    },

    { type: "beat", phase: "audit", label: "03 · Thu 06-11 — Audit gate", caption: "new session, resumed from the checkpoint · oc-code-auditor blocks the merge", skills: ["oc-code-auditor"] },

    {
      type: "exchange", role: "user",
      content:
`Back — lost Wednesday to an investor thing. Remind me where we left it, then run the audit gate on \`feat/stripe-billing\` before I open a PR. Be unkind; I'd rather find out now than from a customer's bank.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-code-auditor",
      content:
`Starting from the Tester's deferred gap, not from zero — \`checkpoint:status\` still has the signature failure open at \`build · tester-round-2-pass\`. \`/oc-audit full\` on \`3f9c2e1\`, **6 m 18 s**:

\`\`\`
CRITICAL 0 · HIGH 2 · MEDIUM 3 · LOW 1 · Health B
Gate: BLOCKED — HIGH findings on the money path
\`\`\`

**[F-001] HIGH · \`lib/billing/webhook.ts:14-17\`** — the deferred one. A forged signature returns 500, not 400, and Stripe reads 5xx as failed delivery: three days of retries, then the endpoint is disabled.

**[F-002] HIGH · \`app/api/billing/checkout/route.ts:22\`** — nothing enforces one subscription per owner. Two POSTs with the same session cookie return two Sessions: two cards charged if both complete, and the second \`completed\` event overwrites \`stripeSubId\`, orphaning the first, which keeps billing. The idempotency key hides it inside one clock hour, which is why no test caught it.

**[F-003] MEDIUM** \`handlers/checkout-completed.ts:19-20\` — \`plan\` comes from \`session.metadata?.tier\`, which \`checkout.ts\` never sets, and \`seats: 1\` is hard-coded: your Tuesday 4-seat Team checkout is in the database as one seat.

\`\`\`
[F-004] MEDIUM  seat-sync.ts:9   TS2353: 'billingStatus' does not exist in type 'TeamInclude'
[F-005] MEDIUM  middleware.ts:6  hey -n 80 -c 8 on the webhook route → 60× 200, 20× 429
[F-006] LOW     no test for checkout.session.expired
\`\`\`

Fix order: **F-002, F-001, F-004, F-003, F-005, F-006** — F-002 first because it moves money.`
    },
    {
      type: "exchange", role: "user",
      content:
`Fix all six, I'll read the diffs.

And the tsc one bothers me more than the others — why is a type error not already failing CI? What else has been sliding through?`
    },
    {
      type: "exchange", role: "claude", skill: "oc-code-auditor",
      content:
`Because \`tsc --noEmit\` was never in the matrix. vitest transpiles per file with esbuild and does no cross-file type-checking, so a bad Prisma \`include\` compiles fine and fails at runtime. Adding it as a job: fails at \`3f9c2e1\`, passes at the fix.

\`/oc-audit fix-all\`, F-002 first. **The Fixer's first attempt was rejected.**

\`\`\`diff
--- a/components/PricingCard.tsx
+        disabled={billing?.status === "active" || billing?.status === "pending"}
\`\`\`

\`\`\`
Verification — Fix [F-002] (round 1)
Verdict: REJECTED

- Addresses the finding? No. The evidence is two curl POSTs with a session
  cookie. No browser is involved. A disabled button is a hint, not a guard.
- Scope: components/PricingCard.tsx is not in this diff (it shipped in #209).
- Completeness: the server path — the one that takes money — is untouched.

Guidance: put the check in createCheckoutSession before the first Stripe call
and return 409 already_subscribed.
\`\`\`

Round 2 puts it in \`createCheckoutSession\` ahead of the first Stripe call, 409 \`already_subscribed\` for an \`active\` or \`pending\` row — **VERIFIED**: the repro is now 409 409, and \`pending\` is bounded by \`expires_at\`.

The other five each got their own Verifier pass — F-001 becomes a try/catch returning 400 with no ledger row for unverified bytes, and test #9 now signs with the wrong secret rather than stubbing the verifier.

\`\`\`
6 findings, 6 fixed, 6 verified (1 needed a second round).
Tests 45/45 · tsc --noEmit clean · Health A− (was B) · Gate PASS at 9d41ba7
\`\`\``,
      artifacts: ["audit-report"],
    },
    {
      type: "exchange", role: "user",
      content:
`One thing about that 402 gate. How do I know it won't lock someone out because their card failed once on a Tuesday? Stripe retries cards too, right? I don't want a customer emailing me because a bank blip made the app read-only for three weeks.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-integrations-engineer",
      content:
`It heals itself. Stripe's **Smart Retries** re-attempt a failed invoice on a schedule you control — currently 4 attempts over about 3 weeks — and **every successful retry emits \`invoice.payment_succeeded\`**, which clears \`past_due\`. The gate lifts the moment the money lands, covered end to end by \`payment_failed → past_due → payment_succeeded → active\` in \`handlers.test.ts:203\`.

Not only a fixture: Tuesday's test clock produced a real \`invoice.payment_failed\` from card \`…0341\`, and re-running it with a good card flipped the row back to \`active\` in 1.2 s.`
    },

    { type: "beat", phase: "ship", label: "04 · Thu 06-11 — PR + staging", caption: "oc-git-ops opens #214; staging soaks on test-mode keys", skills: ["oc-git-ops", "oc-integrations-engineer"] },

    {
      type: "exchange", role: "user",
      content:
`Open the PR — base \`main\`, branch \`feat/stripe-billing\`, and put the \`tsc --noEmit\` job in the same PR so it can't get forgotten. Nadia reviews in the morning; flag \`webhook.ts\` for her, the ledger-write ordering is the bit I understand least.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-git-ops",
      content:
`\`/oc-git-pr\`. Pre-commit gate first — oc-bug-check runs before every commit, no exceptions:

\`\`\`
$ oc-bug-check
  tsc 0 errors · lint 0 · tests 45/45 · secrets rg 'sk_|rk_|whsec_' → 0 · build PASS
  verdict PASS 14.8s

$ gh pr create --base main --head feat/stripe-billing --fill-verbose
https://github.com/headsdown/app/pull/214   31 files, +1489 −7
  ci / typecheck  pass  44s  ← new in this PR · all checks successful
\`\`\`

Body carries the five decisions a reviewer can't infer from the diff (acacia pin, no IP allow-list, the guard's location, \`session.expired\` over a cron, the matcher). \`@nadia-okafor\` requested, \`webhook.ts\` ordering flagged as the one unchecked box. Checkpoint \`step: "pr-open"\`, \`pm_refs\` += \`headsdown/app#214\`.`,
      artifacts: ["pull-request"],
    },
    {
      type: "exchange", role: "user",
      content:
`Nadia approved — her only comment was that \`pending\` in the 409 guard should have a comment explaining the 45-minute bound, which you'd already written. Merged at 16:58.

Push it to staging and run the seven purchase cases from §11. I want to see the rows, not a summary.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-integrations-engineer",
      content:
`First deploy from \`main\` — \`9d41ba7\` on \`/api/health\`. Seven cases, real test cards, live webhook endpoint:

\`\`\`
psql> SELECT "ownerType","ownerId",status,plan,seats FROM "BillingStatus" ORDER BY "updatedAt" DESC LIMIT 7;

 Team | tm_4mRt  | canceled | team | 4 |  -- 7 portal cancel
 Team | tm_9xQ2  | active   | team | 4 |  -- 6 seat removed 5→4
 Team | tm_9xQ2  | active   | team | 5 |  -- 5 seat added 4→5
 User | usr_2wLp | free     |      |   |  -- 4 insufficient funds
 User | usr_8kDn | free     |      |   |  -- 3 declined
 Team | tm_9xQ2  | active   | team | 4 |  -- 2 Team, 4242
 User | usr_7bKq | active   | pro  |   |  -- 1 Pro, 4242
\`\`\`

Cases 3 and 4: a declined card never completes a Session, so no charge event reaches us and the row sits at \`pending\` until \`checkout.session.expired\` lands 45 minutes later and returns it to \`free\`. That path used to be a cron.

Case 6 wrote a credit line, not a refund — $9.80 on the upcoming invoice. Endpoint \`we_1QZ8kD…\` since Tuesday: **63 delivered · 0 failed · p99 86 ms**.`,
      artifacts: ["launch-plan"],
    },

    { type: "beat", phase: "ship", label: "05 · Fri 06-12 — Go-live", caption: "six named accounts at 10:00, everyone at 14:00", skills: ["oc-integrations-engineer"] },

    {
      type: "exchange", role: "user",
      content:
`09:52. Did the smoke step — bought Pro on my own card in live mode, row flipped to \`active\` in about two seconds, refunded it (\`re_1QbF52KsT2aLmNbK8sWd\`) and cancelled \`sub_1QbF4pKsT2aLmNbR7tYu\` like the runbook says.

Flip the canary.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-integrations-engineer",
      content:
`Good — cancelling after the refund matters; a refund on its own leaves the subscription running and it would have billed you again on 2026-07-12.

\`\`\`
$ wrangler kv key put --binding=FLAGS FLAG_STRIPE_LIVE_ALLOWLIST '["usr_internal1", … 6 ids]'
$ wrangler kv key put --binding=FLAGS FLAG_STRIPE_LIVE true
10:00:14 PT  propagation confirmed edge-wide (8.6s)

11:00 PT  we_1QbE7w… (live)  9 delivered · 9 × 200 · 0 failed · p99 112 ms
          BillingStatus      active 2 · pending 0 · free 1184 · Sentry 0 · Linear 0
\`\`\`

p99 112 ms against 86 ms on staging — cold isolates on first hit, well inside the 800 ms invariant. Nothing stranded at \`pending\`. Holding at six accounts until 14:00.`
    },
    {
      type: "exchange", role: "user",
      content:
`11:05 — one thing. One of the friendlies says the success page showed "pending" for about four seconds after she paid, then flipped to the Pro badge. She thought it had failed. Expected, or is something slow?`
    },
    {
      type: "exchange", role: "claude", skill: "oc-integrations-engineer",
      content:
`Expected — F1 in the spec's failure catalog. The browser redirect and the webhook are two independent races back to us, and the browser usually wins.

\`\`\`
$ stripe events list --limit 3 --type checkout.session.completed
evt_1QbG2mKsT2aLmNbWs4Tz   10:41:58 PT   delivered 10:42:01 (+3.2s)
\`\`\`

Stripe takes 2–4 seconds to emit the event; the redirect is immediate, so the page renders from \`BillingStatus\` while it's still \`pending\`. It already falls back to retrieving the Session and checking \`payment_status === "paid"\`, so nobody sees a bare pending — the word is just wrong. It should read "Payment received — setting up your plan": one line in \`components/\`, outside this diff, so it's HD-322 rather than a UI edit during a launch window.`
    },
    {
      type: "exchange", role: "user",
      content:
`14:02. Four hours clean — 3 more subscriptions, support inbox empty, Sentry billing scope still zero. HD-322 is filed.

Go to 100%.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-integrations-engineer",
      content:
`\`\`\`
$ wrangler kv key delete --binding=FLAGS FLAG_STRIPE_LIVE_ALLOWLIST
✔ Success     14:00:11 PT  propagation confirmed edge-wide (7.9s)
\`\`\`

\`FLAG_STRIPE_LIVE\` is the same \`true\` it has been since 10:00 — deleting the allowlist is what widens it, so there's no window where the flag is ambiguous. Rollback is still \`wrangler kv key put … FLAG_STRIPE_LIVE false\`.

Of the four signals on the 24-hour watch, the one that matters is the count of \`pending\` rows older than 45 minutes: non-zero means \`checkout.session.expired\` has stopped landing, which is silent otherwise — nobody complains about a checkout they abandoned. Checkpoint \`step: "canary-100"\`.`
    },

    { type: "beat", phase: "monitor", label: "06 · Mon 06-15 — Post-launch", caption: "the numbers, then the checkpoint closes", skills: ["oc-integrations-engineer"] },

    {
      type: "exchange", role: "user",
      content:
`Monday 09:00. Nothing broke over the weekend as far as I can tell. Give me the real numbers and close the checkpoint out — and tell me what to be worried about next, not what went well.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-integrations-engineer",
      content:
`Since Friday 10:00 PT:

\`\`\`
 active pro 5 · active team 4 (avg 3.5 seats) · past_due 0
 Checkout Sessions 14 → completed 9 (5 Pro, 4 Team) · expired → free 5
 Webhook events 41, all 2xx, 0 failed · p99 118 ms · signature failures 0
\`\`\`

Three things to worry about, in order:

**1. 5 of 14 checkouts expired — 36% abandonment.** The biggest number on the page, and nothing in this project touched it. 4 of the 5 were Team.

**2. Nobody has renewed yet.** The first real renewal is 2026-07-11. Everything we know about dunning comes from a test clock, which is good evidence and not the same as evidence.

**3. HD-318, the API version.** When you take basil, \`current_period_end\` moves onto \`SubscriptionItem\` and two handlers break silently, reading \`undefined\` rather than throwing. That wants a re-audit, not a find-and-replace.

Checkpoint \`phase: "live"\`, \`step: "post-launch-review"\`, complete. Five days, two skill loops, one failed Tester round, one rejected fix. You're shipped.`,
      artifacts: ["checkpoint-integrations"],
    },
  ],
};
