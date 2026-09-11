# opchain.dev

Marketing site + skill showcase for opchain — a set of interconnected Claude Code skills 
that form a software development pipeline (concept → spec → design → build → deploy).

**Repository identities:** the canonical source repository is `ainatx/opchain`.
The public product mirror and MCP Registry identity remain
`asfbay-bit/opchain-skills` and `io.github.asfbay-bit/opchain-skills`.

## Deployment

Deploys are **manual**, run from a developer laptop with `wrangler login` already done. There is no automatic CI/CD path — `deploy.yml` and `promote.yml` were removed because the GitHub Actions Cloudflare token couldn't reliably manage routes/DNS in the `opchain.dev` zone, which left the bindings in a broken state. Deploying as a logged-in human in `wrangler` uses your full account session and avoids that whole class of token-scope issue.

- **Production Worker:** `opchain-dev` on Cloudflare Workers, served at `opchain.dev`.
- **Staging Worker:** `opchain-staging`, served at `staging.opchain.dev`. See `wrangler.jsonc env.staging`.
- **Both** use `custom_domain: true` — Cloudflare manages DNS automatically on `wrangler deploy`. Do not pre-create CNAMEs manually (Cloudflare refuses to take over externally-managed records: `error 100117`).
- **Version stamp:** `build.mjs` injects `__OPCHAIN_VERSION__` via esbuild `define`, sourced from `OPCHAIN_VERSION` env var or `git rev-parse --short HEAD`. Surfaced in `GET /api/health` (`version` JSON field + `X-Opchain-Version` response header on that route).
- **Deploys use the exact fetched `origin/main`.** `npm run deploy:staging` and `npm run deploy` must run from the current reviewed main commit. This keeps staging a faithful production preview and prevents unmerged production bytes. The staging-only branch-preview escape hatch is `OPCHAIN_ALLOW_OFF_MAIN_STAGING=1`; production has no branch bypass.
- **Releases must be tagged before they ship.** `npm run deploy` (production only) refuses when the lockstep catalog version in `skills/*/SKILL.md` has moved somewhere no git tag follows. This closes the release→git-ops edge: `oc-release-ops` always *said* it handed the tag to `oc-git-ops`, but oc-git-ops had no tag verb until v1.8.3, and a 2026-08-26 audit found 13 shipped releases against 3 tags — v1.0–v1.7 all shipped untagged, so `publish-mcp-registry.yml` (which fires on `v*` tags) never republished for any of them. Run `/oc-git-release <semver>` after the release PR merges, or `git tag -s v<semver> -m "release: v<semver>" && git push origin v<semver>` by hand (the check requires a *signed* tag — `-a` alone is refused as `invalid-tag-signature`). The check is `npm run check-release-tag`; `/oc-release verify` calls the same script. Staging is exempt (you review before you tag). Loud escape hatch: `OPCHAIN_ALLOW_UNTAGGED_RELEASE=1`. A weekly `release-ledger.yml` backstop tracks any shipped release still missing a tag. Full rationale: `docs/plans/2026-08-26-git-ops-per-release.md`.
- **Monitoring + deploy-lag guardrail:** GitHub-hosted `/api/health` probes are selectively challenged by Free-plan Bot Fight Mode, which cannot be bypassed with a WAF Skip rule. `.github/workflows/canary.yml` therefore verifies the approved production/staging deployments, versions, 100% traffic, script fingerprints/bindings, domains, and observability through Cloudflare's authenticated control plane. Canary and `.github/workflows/deploy-lag.yml` run on every fourth day-of-month; Deploy lag compares against `.github/monitoring/release-baseline.json` and opens one issue only when paths after the approved runtime SHA are deploy-relevant. Docs/checkpoint/workflow-only descendants do not create false lag. A green run does not prove public `/api/health` or `/mcp` reachability. See `docs/runbooks/cloudflare-challenge.md` for the assurance boundary and baseline-refresh procedure.

### Deploy flow

```
feature branch ─► PR ─► CI green (tests only) ─► merge to main
                                                       │
                                                       ▼
                                       (you, on your laptop)
                                       npm run deploy:staging
                                                       │
                                                       ▼
                                            staging.opchain.dev
                                                       │
                                       (you, in a browser, eyeball it)
                                                       │
                                                       ▼
                                            npm run deploy
                                                       │
                                                       ▼
                                                opchain.dev
```

- `npm run deploy:staging` → `node scripts/deploy.mjs --staging` → `wrangler deploy --env staging`
- `npm run deploy` → `node scripts/deploy.mjs` → `wrangler deploy` (production)
- The wrapper loads `.dev.vars` into the build env and inlines the `PUBLIC_POSTHOG_*` analytics vars. It **no longer requires `LINEAR_API_KEY`**: `POST /api/feedback` still uses it for bug/improvement/security tickets, but the `/changelog` roadmap itself is sourced from GitHub Issues (`scripts/gen-roadmap.mjs` → `site/src/data/roadmap.json`, read via `loadRoadmap()`), not Linear. `gen-roadmap` reads are anonymous (public repo), so nothing there can block a deploy either. `gen-roadmap` isn't wired into `prebuild` — run it by hand (`npm run gen-roadmap`) before a deploy when you want fresh roadmap data baked in; see `docs/plans/2026-08-26-roadmap-github-issues.md`.
- After each deploy, sanity-check locally: `curl -sS https://staging.opchain.dev/api/health` and confirm `version` matches the exact reviewed commit SHA. The route (and every `/api/*` response) is `Cache-Control: no-store`; `scripts/smoke.sh` also appends a cache-busting query string in case a zone-level cache rule overrides origin headers (that happened on 2026-07-10). A particular machine client may still receive a Bot Fight challenge. After staging and production evidence is complete, refresh `.github/monitoring/release-baseline.json` with the exact deployment/version ids and fingerprints, then run the control-plane monitor locally before opening the baseline-update PR.

### CI

`.github/workflows/ci.yml` runs on every PR: Vitest, `astro check`, site build, Playwright e2e. The protected `main` branch receives only PR-gated changes that passed those checks, so CI does not repeat them after merge. CI does not deploy anything — it only verifies the build is green before you decide to ship.

`.github/workflows/lighthouse.yml` runs Lighthouse/Axe budgets on PR builds (not against deployed environments).

### Rollback

If a manual deploy breaks production:

1. `npx wrangler deployments list` — find the last good deployment id.
2. `npx wrangler rollback <deployment-id>` — reverts the Worker.
3. Cloudflare serves the previous code within ~30s.

## Repo Layout

```
opchain/
├── src/                    # Cloudflare Worker source
│   ├── index.js            # Router: static assets, feedback API, 301 redirects
│   └── lib/                # Shared worker libs (schemas, kv, retry, analytics, request-id)
├── site/                   # Astro 5 app — the whole site lives here now.
│   ├── src/pages/          # Every route: /, /architecture, /skills, /skills/[id], /install, /demo, /privacy, /404
│   ├── src/components/     # FeedbackWidget, ConsentBanner, Header, Footer, Replays, UI kit
│   ├── src/layouts/        # Base.astro (head, theme init, analytics beacon)
│   └── dist/               # Built static HTML — gitignored
├── public/                 # BUILD OUTPUT — gitignored. Materialized by scripts/build-site.sh.
│   ├── (astro dist copied in)
│   ├── opchain-skills.zip  # Generated from skills/ by scripts/make-skills-zip.sh
│   └── docs/               # Synced from skills/ by scripts/sync-docs.sh
├── skills/                 # Skill source definitions (the product) — 29 skills,
│   │                       # one subdir per id (each with SKILL.md). Full list +
│   │                       # phases: skills/README.md. A few examples:
│   ├── oc-app-architect/
│   ├── oc-checkpoint-protocol/
│   ├── oc-code-auditor/
│   ├── oc-deploy-ops/
│   ├── oc-git-ops/
│   ├── oc-integrations-engineer/
│   ├── oc-reverse-spec/
│   ├── oc-scale-ops/
│   ├── oc-stack-forge/
│   ├── oc-ux-engineer/
│   ├── orchestrator.md     # Shared orchestration rules
│   ├── CHANGELOG.md        # Lockstep skill-catalog release log
│   └── README.md           # Installation instructions + full skill/phase table
├── scripts/                # ~20 scripts; a few examples (full list: `ls scripts/`)
│   ├── sync-docs.sh                # skills/ → public/docs/ sync
│   ├── make-skills-zip.sh          # skills/ → public/opchain-skills.zip
│   └── gen-skills-catalog.mjs      # validates skills/<id>/SKILL.md frontmatter at build time
├── mcp/                    # Local stdio MCP server (mcp/local-server.mjs) — the
│   │                       # offline/air-gapped alternative to the hosted POST /mcp
│   │                       # route below. See mcp/README.md.
├── tests/                  # Vitest unit + handler tests
├── docs/                   # Internal planning docs: runbooks, release plans, audits,
│   │                       # blog calendar. NOT public/docs/ (above) — that's the
│   │                       # published skill-doc build output.
├── specs/, roadmap/, sprints/, checklists/  # Historical planning docs from earlier
│   │                       # releases; roadmap/ is unrelated to the live /changelog
│   │                       # data (GitHub Issues on asfbay-bit/opchain-skills,
│   │                       # pulled via scripts/gen-roadmap.mjs → roadmap.json).
├── design/, design-previews/, previews/, mockups/  # Design exploration HTML/mockups
│   │                       # (see each dir's README for current-vs-archived status).
├── plugins/                # Claude Code plugin source. plugins/opchain/ = hooks (commit
│   │                       # gate, session state, next-skill pointer) + slash commands +
│   │                       # a skills symlink into skills/. Ships via the public mirror.
├── .claude-plugin/         # marketplace.json — makes this repo (and its public mirror)
│   │                       # a Claude Code plugin marketplace.
├── mirror/                 # Source for the public skills mirror — see "Public skill
│   │                       # mirror" below.
├── .checkpoints/           # Session-state checkpoints — see "Session resume" below.
├── .github/workflows/      # 8 workflows, no deploy workflows (manual): ci.yml, lighthouse.yml,
│   │                       # canary.yml (prod+staging control-plane check every fourth day),
│   │                       # lighthouse-prod.yml (weekly LHCI vs the live site), deploy-lag.yml,
│   │                       # release-ledger.yml, mirror-public.yml, publish-mcp-registry.yml
├── wrangler.jsonc           # Worker config (prod + env.staging)
├── build.mjs               # esbuild: src/index.js → dist/index.js, injects __OPCHAIN_VERSION__
├── vitest.config.js        # test runner config (defines __OPCHAIN_VERSION__ = "test")
├── .env.example            # env var template (copy to .dev.vars for local)
└── package.json
```

## Key Commands

```bash
# Worker (current production) ————————————————————————————————————
npm run dev              # prebuild then wrangler dev on localhost:8787
npm run build            # 10-step prebuild (see package.json's "prebuild" script for the full chain) → esbuild → dist/
npm run deploy           # wrangler deploy (production)
npm run deploy:staging   # wrangler deploy --env staging (staging.opchain.dev)
npm test                 # vitest unit + integration-ish suite
npm run test:hooks       # plugin hook suites (commit gate + next-suggestion), plain node
npm run gen-catalog      # validates skills/<id>/SKILL.md frontmatter at build time
npm run check-release-tag # is the lockstep catalog version actually tagged in git?
npm run sync-docs        # skills/ → public/docs/ (runs in prebuild)
npm run make-zip         # skills/ → public/opchain-skills.zip (runs in prebuild)
npm run smoke:staging    # scripts/smoke.sh against staging.opchain.dev
npm run smoke:prod       # scripts/smoke.sh against opchain.dev

# Astro site (site/) —
npm run site:install     # one-time: cd site && npm install
npm run site:dev         # astro dev on localhost:4321
npm run site:build       # astro build → site/dist

# Checkpoints (session state docs at .checkpoints/<skill>.checkpoint.json) —
npm run checkpoint:status    # print "where did I leave off?" markdown summary
npm run checkpoint:next      # print the next recommended action per checkpoint
npm run checkpoint:doctor    # diagnose checkpoint schema/consistency issues
npm run checkpoint:validate  # validate every checkpoint against the schema
npm run checkpoint -- update <skill> --field=value   # update a field, restamp updated_at
```

## Session resume

`.checkpoints/` is **tracked in git**, not gitignored. At the start of a
new session on this repo, run `npm run checkpoint:status` to see every
skill's last known phase, step, status, and `next_actions`. The file
schema lives in `.checkpoints/README.md`.

Skills don't auto-write — the assistant updates the relevant checkpoint
at sensible inflection points (after a PR merges, after a phase
completes, when blocked). CI runs `npm run checkpoint:validate` to keep
the JSON honest.

## API Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check (with optional flag-overrides summary) |
| GET | `/api/flags/public` | Public-flag map for the browser; sets `oc_id` cookie |
| POST | `/api/feedback` | Create Linear issue (bug/feature/improvement) |
| POST | `/api/notify` | Lead capture (KV-backed) |
| GET | `/api/votes` | Batched roadmap vote counts (`?ids=A,B,C`) |
| POST | `/api/votes/:id` | Cast a roadmap vote (per-IP/day server-side dedup) |
| POST | `/mcp` | opchain MCP server (JSON-RPC; Codex / any MCP client) |
| GET | `/.well-known/ai-catalog.json` | ARD discovery manifest (advertises the MCP server) |
| GET | `/.well-known/mcp.json` | MCP server card the ARD entry resolves to |
| GET | `/llms.txt` | llms.txt Markdown index of skills + docs |
| GET | `/skills.json` | Machine-readable skill catalog (for non-MCP agents) |
| GET | `/*` | Static assets from `public/` |

The email-gated Try-It chat (`POST /api/try/start` + `POST /api/try/chat`)
and the Resend-backed `POST /api/email-pipeline` step were both removed.
Old client requests to any of these now get a 410 Gone response; legacy
`/tryit` and `/tryit.html` paths 301 to `/demo`.

## Agentic discovery

So AI agents and registries can **find** the hosted MCP server (not just call it
once they already know it), the Worker serves a small discovery surface, all
derived at request time from `src/generated/mcp-catalog.json` — single source of
truth, no build step, self-describing per request origin (staging advertises
staging). Builders live in `src/lib/discovery.js`; routes in `src/index.js`.

- **`/.well-known/ai-catalog.json`** — [Agentic Resource Discovery (ARD)](https://agenticresourcediscovery.org/spec/)
  manifest (`specVersion: "1.0"`). One entry: the MCP server, with every skill id
  as a `capability` and intent phrases as `representativeQueries`. `host.identifier`
  is `did:web:opchain.dev` (resolve it with a DID document at `/.well-known/did.json` —
  see *Publisher verification* below; `scripts/gen-did.mjs` mints it). Two of the three
  ARD discovery hooks are wired: this well-known path
  and `<link rel="ai-catalog">` in `Base.astro`. The third (an `Agentmap:` line in
  `robots.txt`) is intentionally omitted — Lighthouse's `robots-txt` SEO audit
  rejects non-standard directives and would drop the SEO score below budget.
- **`/.well-known/mcp.json`** — the MCP server card the ARD entry's `url` points at
  (endpoint, transport, tool list pulled from a live server instance so it can't drift).
- **`/llms.txt`** — Markdown index linking each skill's raw `/docs/<id>/SKILL.md`
  plus the key human + machine entry points.
- **`/skills.json`** — full JSON skill catalog (served at the root, not under
  `/api/`, so it isn't blocked by `robots.txt Disallow: /api/`). Its top-level
  `catalogVersion` is the lockstep skill semver (unlike `version`, the build SHA);
  the `/install` page's SessionStart update-check hook compares it against the
  `version:` frontmatter of installed skills.
- **JSON-LD** — `Base.astro` emits a site-wide `Organization` + `WebSite` graph
  plus a page node (`SoftwareApplication` on `/`, a per-skill node on `/skills/<id>`).

These are inert, public, CORS-open (`*`) read endpoints; not flag-gated today.

### MCP registry listing

`server.json` (repo root) is the official [MCP Registry](https://registry.modelcontextprotocol.io)
listing for the hosted server. It's a *remote* entry (`remotes: streamable-http →
https://opchain.dev/mcp`) under the `io.github.asfbay-bit/opchain-skills` namespace.
`.github/workflows/publish-mcp-registry.yml` publishes it on every `v*` tag (or manual
dispatch) via **GitHub OIDC — no secrets**; the namespace is authorized because the
workflow runs in an `asfbay-bit`-owned repo. Bump `version` in lockstep with releases
(the workflow auto-syncs it from the tag). Publishing only updates the registry
*pointer*; the server itself ships via `npm run deploy`. Directory sites (PulseMCP,
mcp.so, Glama, Smithery) crawl the registry — claim the listing there to control copy.

### Publisher verification (did:web)

The ai-catalog advertises `host.identifier: "did:web:opchain.dev"`. For a registry/agent
to *verify* that identity (not just read it), `did:web:opchain.dev` must resolve to a DID
document at `https://opchain.dev/.well-known/did.json` — did:web's trust anchor is domain
control, so serving that doc over opchain.dev HTTPS is the proof.

`scripts/gen-did.mjs` mints the material **locally** (the key must be yours, never CI/sandbox):
it writes `site/public/.well-known/did.json` (PUBLIC Ed25519 key — commit + deploy, served
statically like `security.txt`) and `.secrets/opchain-did-ed25519.jwk` (PRIVATE key —
gitignored; move to a password manager / Cloudflare secret, then delete). The resolvable
did.json alone makes the identity verifiable; the private key is only needed later to *sign*
assertions (e.g. an ARD `trustManifest`). Rotate with `--force`. The did.json path is in the
public discovery surface. Bot Fight Mode can still selectively challenge machine
clients fetching it; there is no Free-plan WAF Skip exception for that mode.

## Environment Variables

Template lives in `.env.example`. Copy to `.dev.vars` for local dev; set in the Cloudflare dashboard (or via `wrangler secret put`) for staging + production.

- `LINEAR_API_KEY` — Linear API key for `POST /api/feedback` (bug/improvement/security/general tickets only — roadmap feature requests go to GitHub instead, see below)
- `LINEAR_TEAM_ID`, `LINEAR_PROJECT_ID` — optional overrides for the default team/project
- `ROADMAP_GITHUB_TOKEN` — fine-grained PAT scoped to `issues:write` on `asfbay-bit/opchain-skills`. Used by `POST /api/feedback`'s roadmap community-request path (RoadmapForm.astro) to create a GitHub issue instead of a Linear ticket. Unset → that path 503s `not_configured`; everything else on `/api/feedback` (and the read-only `gen-roadmap.mjs` pull) is unaffected. Separate from `MIRROR_TOKEN` (least-privilege — that one only needs `contents:write`).
- `POSTHOG_PROJECT_API_KEY`, `POSTHOG_HOST` — server-side analytics capture. Env-gated; unset → no-op.
- `PUBLIC_POSTHOG_KEY`, `PUBLIC_POSTHOG_HOST` — client-side PostHog (consent-gated via `ConsentBanner.astro`).

Scheduled Cloudflare control-plane monitoring needs two GitHub Actions secrets at the repo level. They do not create an automatic deploy path; prefer a dedicated least-privilege read token and rotate the older broad token when practical:

- `CLOUDFLARE_API_TOKEN` — token that can read Workers deployments, versions/settings, and custom domains
- `CLOUDFLARE_ACCOUNT_ID` — the opchain Cloudflare account id

## Important Notes

- **The site is Astro 5 in static mode** (Sprint 6). Pages, components, content collection for skills live in `site/`. `npm run prebuild` runs `astro build` and copies `site/dist/` into `public/`, then the Worker serves everything through the ASSETS binding. Nothing in `public/` is source-of-truth any more — it's gitignored.
- **Skill catalog validation runs on every build.** `scripts/gen-skills-catalog.mjs` reads `skills/<id>/SKILL.md` frontmatter and asserts required fields are present and the directory name matches `frontmatter.name`. The Astro site reads `skills/` directly via `site/src/content.config.ts`; there is no longer a separate codegen step.
- **Skill docs** in `public/docs/` are synced from `skills/` via `sync-docs.sh`. Edit the source in `skills/`, the copy regenerates on build.
- **styles.css** has all component styles inline — no CSS modules, no preprocessor.
- **URL paths in HTML** use root-relative paths (e.g., `/styles.css`, `/docs/oc-app-architect/SKILL.md`). These were previously `/opchain/styles.css` etc. when hosted under aidops.dev — they've been updated for standalone hosting.

## Feature flags

Single source of truth: **`src/lib/flags/registry.js`**. Every flag has a name, type, default, owner, category, and description. Hierarchy is dot-namespaced:

- `site.ui.*` / `site.feature.*` / `site.experiment.*` — surface, page, A/B
- `site.ops.*.kill` — ops kill switches (default false; on → degrade gracefully)
- `site.consent.*` — consent / privacy
- `skills.registry.<id>.enabled` — per-skill visibility (one per `skills/<id>/`)
- `skills.capability.*` — cross-cutting (tri-agent, checkpoint-protocol)
- `skills.command.<verb>.enabled` — slash-command verb gates (subcommands inherit)
- `skills.experiment.<id>.<feature>` — experimental skill behaviour
- `platform.observability.*` / `platform.security.*` — infra-level toggles

Evaluation is layered (default → wrangler env override → PostHog `/decide`). PostHog is the runtime backend; flag values flip without a redeploy. When PostHog is unconfigured or unreachable, the registry default wins (fail-closed). The Worker helper is `evalFlag(name, { env, ctx, distinctId })` — see `src/lib/flags/eval.js`. Per-request memoisation keeps cost to one PostHog call per request.

The site receives a `<meta name="opchain-flags">` snapshot of public defaults at build time (`Base.astro`), then `site/src/lib/flags/client.ts` layers PostHog overrides post-consent. Server-only flags never leak to the browser — see `PUBLIC_FLAG_NAMES` in the registry.

Env-var override naming: `site.ops.api-feedback.kill` → `FLAG_SITE_OPS_API_FEEDBACK_KILL`. Booleans accept `true`/`false`/`1`/`0`. Useful for staging-only kill switches.

`scripts/gen-flags.mjs` mirrors the registry into `site/src/lib/flags/registry.ts` (typed, gitignored). `scripts/gen-skills-catalog.mjs` validates that every `flags.required` / `flags.exposes` / command verb in a `SKILL.md` has a corresponding registry entry — build fails on drift.

## Public skill mirror

Skill source (`skills/`) is mirrored to a public GitHub repo at `asfbay-bit/opchain-skills` for community visibility, issues, and external PRs. The site and build tooling stay private here.

- **Workflow:** `.github/workflows/mirror-public.yml`. Triggers on every push to `main` that touches `skills/`, `mirror/`, `plugins/`, `.claude-plugin/`, `LICENSE`, or the workflow itself. Manual `workflow_dispatch` is also supported.
- **What gets mirrored:** `skills/` + `LICENSE` + `plugins/` (with `cp -RL`, so the `plugins/opchain/skills` symlink becomes a real directory in the snapshot) + `.claude-plugin/` + `mirror/README.md` → `README.md` + `mirror/CONTRIBUTING.md` → `CONTRIBUTING.md` + `mirror/SECURITY.md` → `SECURITY.md` + `mirror/.github/ISSUE_TEMPLATE/` → `.github/ISSUE_TEMPLATE/`. Nothing else — no site source, no `.checkpoints/`, no scripts, no internal docs. The plugin + marketplace files are what make `/plugin marketplace add asfbay-bit/opchain-skills` → `/plugin install opchain` work; without them the public repo is skills-only.
- **Mode:** force-push snapshot. The public repo's history is reset on every sync to a single commit (`Mirror from ainatx/opchain@<sha>`). External PRs against the public repo can't merge directly; maintainers cherry-pick them here, and they propagate back on the next sync. Documented in `mirror/CONTRIBUTING.md`.
- **Required secret:** `MIRROR_TOKEN` — a fine-grained GitHub PAT with `contents:write` on `asfbay-bit/opchain-skills`. Set via repo Settings → Secrets and variables → Actions. The workflow fails loud if it's missing.
- **Editing the public face:** all public-facing copy (README, contributing guide, issue forms) lives under `mirror/` so it's easy to find. The `LICENSE` at repo root is shared between private and public.

Before the first run, create the empty public repo at `asfbay-bit/opchain-skills` on GitHub and add the `MIRROR_TOKEN` secret. The next push to `main` (or a manual `workflow_dispatch`) will populate it.

## Relationship to aidops

This repo was extracted from `aidops/platform/public/opchain/`. 
The aidops repo no longer owns opchain code. Changes to opchain.dev happen here and deploy via 
`npm run deploy` directly to the `opchain-dev` worker.
