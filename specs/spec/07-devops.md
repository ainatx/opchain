# 07 — DevOps, Deployment, Observability

> **Refreshed 2026-04-27** — superseded the previous "no CI, single env" finding.
> See `specs/drift-report.md` for what closed.

## Current State

### Environments

Two environments, both on Cloudflare Workers, both with `custom_domain: true`
so Cloudflare manages DNS automatically on `wrangler deploy`:

| Env | Worker name | URL | KV namespace id |
|---|---|---|---|
| Production | `opchain-dev` | `opchain.dev` | `6a7121cf34354a9991727187311b6264` |
| Staging | `opchain-staging` | `staging.opchain.dev` | `a76010c99fc346f4b3fe0e532ff4398f` |
| Preview (local `wrangler dev`) | n/a | `localhost:8787` | `2b5cb8f0733e4cb88a89b0dc8b1dd3d7` |

Source: `wrangler.jsonc` L24, L40–L57.

### Deploy flow (manual)

Per `CLAUDE.md` — deploys are run from a developer laptop with `wrangler login`
already done. There is no automated CI deploy:

```
feature branch ─► PR ─► CI green (tests only) ─► merge to main
                                                       │
                                                       ▼
                                       (you, on your laptop)
                         OPCHAIN_OFFICIAL_ANALYTICS=1 npm run deploy:staging
                                                       │
                                                       ▼
                                            staging.opchain.dev
                                                       │
                                       (you, in a browser, eyeball it)
                                                       │
                                                       ▼
                              OPCHAIN_OFFICIAL_ANALYTICS=1 npm run deploy
                                                       │
                                                       ▼
                                                opchain.dev
```

CLAUDE.md notes that a previous `deploy.yml` / `promote.yml` was removed because
the GitHub Actions Cloudflare API token couldn't reliably manage routes/DNS in
the `opchain.dev` zone (`error 100117` on externally-managed records). A
logged-in human in `wrangler` uses the full account session and avoids the
token-scope problem.

### Build pipeline

`npm run prebuild` (chained into `dev`, `deploy`, `deploy:staging`) regenerates
stack packs, adapters, flags, site and MCP catalogs; validates references and
PM config; verifies source/plugin bundles; syncs public docs; builds licensed
ZIP artifacts and OG images; and builds the Astro site. `package.json` is the
ordered source of truth.

Then `node build.mjs` bundles `src/index.js` → `dist/index.js` (esbuild, ESM,
workerd target). `build.mjs` injects `__OPCHAIN_VERSION__` via esbuild's
`define` from `OPCHAIN_VERSION` env or `git rev-parse --short HEAD`, falling
back to `"dev"`.

`wrangler.jsonc` declares `build.command = "node build.mjs"`, so `wrangler
deploy` re-runs esbuild; `no_bundle: true` ensures wrangler doesn't re-bundle on
top.

### Dev

- `npm run dev` → `npm run prebuild && wrangler dev` on `localhost:8787`.
- `.dev.vars` provides secrets locally; not checked in. `.env.example`
  documents the required keys.

### Observability

- `wrangler.jsonc` sets `observability.enabled = true` — Cloudflare Logs
  request-level capture is on for both prod and staging.
- **Version stamp** — `__OPCHAIN_VERSION__` is surfaced in `GET /api/health`
  (`version` JSON field) AND as an `X-Opchain-Version` response header. Manual
  post-deploy verification is `curl -sS https://staging.opchain.dev/api/health`
  and confirming the SHA matches the local commit.
- **Structured analytics** — `src/lib/analytics.js` captures server-side events
  to PostHog when `POSTHOG_PROJECT_API_KEY` is set. Env-gated; unset → no-op.
- **Client analytics** — Astro layout boots PostHog client-side via
  `PUBLIC_POSTHOG_KEY` + `PUBLIC_POSTHOG_HOST`, gated by the consent banner
  (`site/src/components/ConsentBanner.astro`).
- **Request IDs** — `src/lib/request-id.js` mints a per-request id propagated
  to upstream calls and into log lines.
- No external alerting (no Sentry, no Datadog, no PagerDuty). No uptime
  checks configured in-repo.

### Secrets

Documented in `.env.example` and `CLAUDE.md`:

- `LINEAR_API_KEY` — Linear GraphQL API key (feedback endpoint)
- `LINEAR_TEAM_ID`, `LINEAR_PROJECT_ID` — optional Linear overrides
- `ROADMAP_GITHUB_TOKEN` — optional issue-write token for community roadmap intake
- `MCP_SESSION_SIGNING_KEY` — independent ≥32-byte HMAC secret required for
  hosted MCP checkpoint-session issuance; rotation invalidates prior tokens
- `POSTHOG_PROJECT_API_KEY`, `POSTHOG_HOST` — server analytics
- `PUBLIC_POSTHOG_KEY`, `PUBLIC_POSTHOG_HOST` — client analytics

Both public PostHog values are required to enable browser analytics. Official
deployments opt into the managed defaults with `OPCHAIN_OFFICIAL_ANALYTICS=1`;
self-hosted builds have no opchain host fallback. Standard `*.i.posthog.com`
hosts are CSP-allowed; custom proxy origins must also be added to `script-src`
and `connect-src` in `src/lib/http.js`.

Lead retention is not secret-configurable: `src/index.js` applies a fixed
365-day TTL to `/api/notify` records so deployment configuration cannot silently
extend the published privacy window.

Stored in `.dev.vars` locally; in the Cloudflare Workers dashboard or via
`wrangler secret put` for staging + production.

### Asset caching

- ZIP responses: `Cache-Control: public, max-age=3600` (`src/index.js`).
- All other static assets: default Workers Assets caching.
- `assets.not_found_handling = "404-page"`.
- `assets.run_worker_first = true` — Worker routes first, then assets.

### CI/CD

`.github/workflows/ci.yml` runs on every PR. The protected `main` branch does
not repeat the same checks after merge:

1. `actions/checkout@v6`, `actions/setup-node@v6`
2. `npm ci`
3. `npm test` (Vitest)
4. `astro check`
5. `npm run build-site`
6. Playwright e2e against the built site

`.github/workflows/lighthouse.yml` runs LHCI on PR builds and posts a
per-route score summary as a PR comment.

CI does **not** deploy. Deploy is manual, see above.

### Rollback

The deploy wrapper records the currently active version before activation. If
the new deployment fails live-SHA convergence, the hardening replay, or the
smoke suite, it automatically invokes Wrangler rollback and exits nonzero.
For a later incident, use:

```bash
npx wrangler deployments list      # find the last good 100%-traffic version_id
npx wrangler rollback <version-id> # reverts the Worker (~30s propagation)
```

The automatic path covers immediate verification only; later incidents remain
human-triggered.

### Cost

- Workers Free tier covers 100k requests/day. Site + skills downloads sit well
  under that.
- Hosted checkpoints consume KV and edge Rate Limiting operations; the
  per-location mutation budget and per-key write cadence bound abuse.
- No line-item cost modeling in the repo.

### Confidence

| Claim | Confidence |
|---|---|
| Two environments (prod + staging) | HIGH |
| Manual deploy, no CI deploy | HIGH — CLAUDE.md is explicit |
| `__OPCHAIN_VERSION__` is the deployment identity | HIGH — `build.mjs` + `health.test.js` |
| LHCI runs on PRs only | HIGH — `lighthouse.yml` |
| Immediate verification failures auto-rollback; later incidents are manual | HIGH — `scripts/deploy.mjs` + CLAUDE.md |

## Gaps & Recommendations

| Finding | Severity | Fix |
|---|---|---|
| **No nightly LHCI / synthetic monitoring** | MED | Cron a daily LHCI run against staging + prod, alert on regression. Or add an external uptime check (Better Stack, UptimeRobot). |
| **No structured third-party incident runbook** | MED | Add explicit response paths for Linear/GitHub outages and false-positive rate limiting. |
| **No dependency-update review cadence beyond Dependabot PRs** | LOW | Dependabot is already opening PRs (PRs #95–98 visible at time of writing). Add a weekly merge ritual or auto-merge for green minor bumps. |
| **`wrangler.jsonc $schema` uses local `node_modules` path** | LOW | Replace with the public schema URL so the file is meaningful when viewed outside the repo. |
| **No deployment audit log** | LOW | `wrangler deployments list` works but isn't archived. A simple shell script that appends each deploy's SHA + timestamp to `roadmap/deploy-log.md` would create the audit trail. |
