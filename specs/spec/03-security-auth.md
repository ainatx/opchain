# 03 — Security & Auth

_Refreshed 2026-04-28 by `/reverse-spec` targeted update. Replaces the
2026-04-17 version, which still described the email-gated Try-It auth
surface (deleted in `claude/remove-try-it`) and called CSP "Missing"
(shipped in Sprint 7c)._

## Current State

### Auth model

There are **no user accounts**. Public content, feedback, notify, roadmap, and
MCP discovery routes do not require login. Hosted MCP checkpoint state is
instead isolated by a private HMAC-signed bearer token returned by
`create_checkpoint_session`; invented tokens cannot read or pre-seed state.
Session creation is public but rate-limited, and token rotation intentionally
invalidates existing hosted sessions. Local on-disk skill checkpoints are a
separate format.
The previous email-gated Try-It chat — which carried HMAC-signed session
tokens, IP/email rate-limits, and an `ANTHROPIC_API_KEY` exchange — was
removed. Stale clients hitting `/api/try/*` get a clean **410 Gone** with
`{ "error": "The Try-It chat has been removed." }`.

Source: `src/index.js:381-388`, plus `claude/remove-try-it` history in
`git log` (commit `6511b1d`).

### Authorization

No roles, per-user entitlements, or admin surface. The Worker authorizes most
operations by route shape. MCP checkpoint reads/writes additionally require a
valid service-signed token and a skill id in the published catalog; the MCP
kill switch can pause the entire endpoint.

### Rate limiting

| Limit | Value | Scope | Implementation |
|---|---|---|---|
| `/api/notify` submissions | 3 / 60s | Truncated IP hash | KV TTL counter |
| Community roadmap requests | 5 / hour | Truncated IP hash | KV TTL counter |
| Roadmap votes | 1 / issue / day | Truncated IP hash | 25-hour KV lock |
| MCP session creates + checkpoint writes | 30 / 60s | Truncated IP hash, per Cloudflare location | Rate Limiting binding; fails closed if unavailable |

If `env.NOTIFY` (KV) is not bound, notify submissions still succeed without
persistence. MCP mutations take the opposite posture: their platform limiter
and signing secret are required and fail closed. Cloudflare KV also limits a
single checkpoint key to one write per second, so clients coalesce faster
saves and retry throttled writes.

`/api/feedback` has **no rate limit**. The de-facto controls are CORS
allow-list, Zod schema validation, and Linear's own throttling.

Source: `src/index.js:262-329` (`handleNotify`).

### CORS

- **Allowed origins (9):** `opchain.dev`, `www.opchain.dev`,
  `staging.opchain.dev`, `opchain-dev.4fstpkkw72.workers.dev`,
  `aidops.dev`, `www.aidops.dev`, `localhost:8787`, `localhost:3000`,
  `localhost:4321`.
- **Methods:** `POST, GET, OPTIONS`
- **Headers:** `Content-Type, X-Opchain-Request-Id`
- **Exposed:** `X-Opchain-Request-Id, X-Opchain-Version`
- **Credentials:** not set (implicitly disallowed)

For `/mcp`, any present Origin outside this allowlist is rejected with 403
before request parsing, storage, or rate limiting; native clients may omit it.

Source: `src/index.js:35-46, 49-65`.

### Security headers — full stamp

Applied to every response by `applyBaselineHeaders` (idempotent, called
both inside the asset path and unconditionally in the outer `fetch`):

```
X-Content-Type-Options:        nosniff
Strict-Transport-Security:     max-age=31536000; includeSubDomains
X-Frame-Options:                DENY
Referrer-Policy:                strict-origin-when-cross-origin
Permissions-Policy:             camera=(), microphone=(), geolocation=(),
                                payment=(), usb=(), accelerometer=(),
                                gyroscope=(), magnetometer=()
```

Source: `src/index.js:73-82` (constants), `src/index.js:104-109`
(`applyBaselineHeaders`), `src/index.js:493-501` (`fetch` outer stamp).

### Content Security Policy (Sprint 7c)

CSP is HTML-only — non-HTML responses get the baseline headers above
without a CSP. For HTML responses the Worker:

1. Reads the body from the assets binding.
2. Generates a fresh **per-request 16-byte base64url nonce** via
   `crypto.getRandomValues` (`generateNonce`, `src/index.js:91-98`).
3. Substitutes `__OPCHAIN_NONCE__` in the body with that nonce.
   The placeholder is stamped onto every `<script>` tag at
   build time by `scripts/inject-nonce-placeholder.mjs`. The most
   recent eval (Sprint 7c eval-round-1) measured 105 `<script>` tags
   across 20 HTML files.
4. Emits the matching CSP header.

Built CSP (`buildCspHtml`, `src/index.js:100-112`):

```
default-src 'self';
script-src  'self' 'nonce-<n>' 'strict-dynamic'
            https://*.i.posthog.com
            https://t.opchain.dev https://t.staging.opchain.dev
            https://static.cloudflareinsights.com;
connect-src 'self'
            https://*.i.posthog.com
            https://t.opchain.dev https://t.staging.opchain.dev
            https://cloudflareinsights.com;
style-src   'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src     'self' data:;
font-src    'self' https://fonts.gstatic.com;
frame-ancestors 'none';
base-uri    'self';
form-action 'self'
```

`'unsafe-inline'` was removed from `script-src` in Sprint 7c. It remains
on `style-src` because Tailwind 4 emits inline `style=` attributes;
converting that is backlog item B-08.

`'strict-dynamic'` is present on `script-src` so a nonce-blessed script
can load further scripts (notably PostHog) without listing additional
hashes. The explicit `https://*.i.posthog.com` and
`https://static.cloudflareinsights.com` hosts remain for browsers
that don't honour `'strict-dynamic'`.

Source: `src/index.js:84-112` (constants + builders),
`src/index.js:198-218` (`applySecurityHeaders` HTML branch), test
coverage in `tests/csp-nonce.test.js` and `tests/security-headers.test.js`.

### Input validation

Every POST endpoint runs through `parseBody(request, schema)` from
`src/lib/schemas.js`, which:

- Rejects non-JSON bodies with `{ code: "invalid_json" }`, status 400.
- Rejects schema mismatches with `{ code: "invalid_body", issues }` and
  Zod's per-field error trail, status 400.

Schemas (`src/lib/schemas.js`):

- `FeedbackSchema` — `type` ∈ {bug, feature, improvement, general},
  `title` 3–200 chars, `description` ≤ 5000 chars,
  `priority` 0–4, optional `skill` ≤ 60 chars, optional valid `email`.
- `NotifySchema` — `email` required, optional `role`/`teamSize`/`building`
  (≤ 280 chars), `source` ∈ {install, skill-download, bundle-download,
  homepage, other}.

### Secrets

| Env var | Used by | Notes |
|---|---|---|
| `LINEAR_API_KEY` | `handleFeedback` | Without it, /api/feedback returns 503 `not_configured` |
| `LINEAR_TEAM_ID` / `LINEAR_PROJECT_ID` | `handleFeedback` | Optional overrides; defaults baked in |
| `ROADMAP_GITHUB_TOKEN` | community roadmap intake | Optional; without it that write path returns 503 |
| `MCP_SESSION_SIGNING_KEY` | hosted MCP checkpoints | Required independent ≥32-byte HMAC secret; distinct in prod/staging |
| `POSTHOG_PROJECT_API_KEY` | `src/lib/analytics.js` | Without it, server-side capture is a silent no-op |
| `POSTHOG_HOST` | `src/lib/analytics.js` | Defaults to `https://eu.i.posthog.com` |
| `PUBLIC_POSTHOG_KEY` | site/Astro at build time | Without it, the consent banner still renders but accept is a no-op |
| `PUBLIC_POSTHOG_HOST` | site/Astro at build time | Required with `PUBLIC_POSTHOG_KEY`; no self-host default; custom domains also require CSP allowlisting |

A real `.env.example` now exists at the repo root, replacing the
"discoverable only by reading code" state of the previous spec.

`ANTHROPIC_API_KEY` and `DEPLOY_API_TOKEN` are **gone** — both belonged
to the deleted Try-It chat. If they're still set as Cloudflare secrets
in the dashboard, they're inert.

### Lead data (PII)

`/api/notify` writes lead records to KV `NOTIFY` under the key
`lead:<sha256(lower(email))>`:

```jsonc
{
  "email": "<plaintext>",
  "role": "...",
  "teamSize": "...",
  "building": "...",
  "source": "install | skill-download | bundle-download | ...",
  "submittedAt": "ISO-8601",
  "requestId": "<uuid>"
}
```

The plaintext email is stored *inside* the value; the key is hashed for
opaqueness if KV is exfiltrated and for idempotent upserts (re-submit
overwrites). The value excludes the request IP and user agent and is written
with a fixed 365-day TTL.

Source: `src/index.js` (`handleNotify`).

### Confidence

| Claim | Confidence |
|---|---|
| No user-account authentication; MCP checkpoints use signed server-issued bearer-like session IDs | HIGH |
| CSP `script-src` enforces nonce + strict-dynamic | HIGH (Vitest covers nonce uniqueness, placeholder substitution, header content) |
| `style-src` retains `unsafe-inline` | HIGH (B-08 backlog) |
| Lead data has a fixed 365-day TTL | HIGH (`expirationTtl` on the `lead:` put; `tests/notify.test.js`) |
| Anthropic / Try-It auth fully removed | HIGH (verified — no `ANTHROPIC_API_KEY` reference, /api/try → 410) |

## Gaps & Recommendations

| Finding | Impact | Recommendation |
|---|---|---|
| **`style-src` still allows `unsafe-inline`** (B-08) | LOW–MED | Migrate Tailwind utilities that emit inline `style=` (or move to CSS variables); then drop `unsafe-inline` from `style-src` |
| **`/api/feedback` has no rate limit** | LOW | The Linear API key is the upstream cap; consider per-IP throttling (the same pattern as `/api/notify`) once a feedback-spam incident actually occurs — premature otherwise |
| **CORS allow-list still includes `aidops.dev` / `www.aidops.dev`** | LOW | Audit whether aidops still embeds opchain APIs; remove if not. Also confirm the workers.dev default domain is still desired |
| **No CSP browser-level verification in CI** (B-09) | LOW | Backlog: swap the Playwright `webServer` to `wrangler dev` so e2e covers a real CSP-served HTML response and asserts no "Refused to execute inline script" console errors |
| **`Content-Length` deletion on the HTML CSP path** | LOW | Documented in code; relies on Cloudflare adding `Transfer-Encoding`. Worth a regression test if the runtime ever changes |
