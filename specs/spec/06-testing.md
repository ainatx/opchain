# 06 — Testing

> **Refreshed 2026-04-27** — superseded the previous "no tests" finding. See
> `specs/drift-report.md` for what closed.

## Current State

opchain has a multi-layer test suite covering the Worker, the Astro site, the
build pipeline, and a deployment-time smoke check.

### Worker unit / integration suite (Vitest)

Lives in `tests/` at the repo root: 43 Vitest modules as of v1.9. The suite
covers Worker routes and headers, hosted/local MCP behavior, release and
hardening gates, catalog generation, skill routing, checkpoint validation,
telemetry liveness, data retention, license artifacts, flags, roadmap
generation, monitoring, and site-search helpers. `.opchain/qa.yaml` is the
current test-pyramid and contract-matrix source of truth.

Run with `npm test` → `vitest run`. `pretest` invokes `gen-catalog` so the
generated `src/generated/skill-prompts.js` exists before tests load.

`vitest.config.js` defines `__OPCHAIN_VERSION__ = "test"` so the version-stamp
binding resolves under test without a build.

### Astro check

`astro check` runs as part of CI to type-check the `.astro` pages, components,
and `src/content.config.ts` content collection schema. No separate spec layer for
the site — type errors in any page block CI.

### Site E2E (Playwright)

Lives in `site/tests/e2e/`. Configured via `site/playwright.config.ts`. Ten
specs cover cross-route accessibility, consent, changelog/scenarios, skill
filtering, responsive demo workbench/search/modals, blog layout, and diagram
geometry. They run against the built static site in CI.

### Lighthouse + Axe budgets (LHCI)

`lighthouserc.cjs` defines per-route Lighthouse + axe-core thresholds.
`.github/workflows/lighthouse.yml` runs LHCI on PR builds and posts a per-route
score summary as a PR comment via `scripts/lhci-summary.mjs` (covered by
`tests/lhci-comment.test.js`). Production deployments are NOT covered by LHCI —
PR builds only.

### Manual smoke surface

Two `curl`-able endpoints support post-deploy verification:

```bash
# Health check — returns version SHA matching the deployed commit
curl -sS https://opchain.dev/api/health
# → { "ok": true, "service": "opchain-dev", "version": "<sha>" }

# Skills bundle download
curl -I https://opchain.dev/opchain-skills.zip
# → Content-Disposition: attachment; filename="opchain-skills.zip"
```

`CLAUDE.md` documents these as the manual sanity-check after each manual
`wrangler deploy`.

### CI workflow

`.github/workflows/ci.yml` runs on every PR. The protected `main` branch does
not repeat the same checks after merge:

1. `npm ci`
2. `npm run gen-catalog` (via `pretest`)
3. `npm test` — Vitest unit + integration
4. `astro check` — site type checking
5. `npm run build-site` — Astro build
6. Playwright e2e against the built site

Deploy is **not** part of CI (see `07-devops.md` for the manual deploy story).

### Confidence

| Claim | Confidence |
|---|---|
| 43 Vitest modules cover Worker + helpers + scripts | HIGH — direct count at v1.9 |
| Playwright e2e exists and runs in CI | HIGH — `site/playwright.config.ts` + `ci.yml` |
| LHCI runs on PRs only | HIGH — `lighthouse.yml` triggers on `pull_request` |
| `npm test` is gated in CI | HIGH — `ci.yml` step |
| Coverage threshold | UNKNOWN — no coverage tool / threshold configured |

## Gaps & Recommendations

The major test gap (no tests at all) is closed. Remaining gaps are quality-of-test:

1. **No coverage threshold.** `vitest run` reports coverage if asked, but nothing
   in CI fails on coverage regression. Recommend a soft floor (e.g. 70%) on the
   Worker handlers and `src/lib/`.
2. **No production smoke gate.** `tests/smoke-script.test.js` validates the smoke
   *script*, but no GitHub Action calls the deployed `/api/health` after a manual
   `wrangler deploy`. Recommend a `deploy-smoke.yml` workflow triggered manually
   with the deploy SHA, or run as a wrangler post-deploy hook.
3. **No LHCI on production.** Per CLAUDE.md, LHCI is PR-only. A nightly LHCI
   against `staging.opchain.dev` and `opchain.dev` would catch regressions
   introduced by manual deploys that skipped a PR.
4. **Skill execution quality remains eval-driven.** Routing goldsets exercise
   intent selection, while downstream output quality still depends on each
   skill's own evaluator and fixtures rather than a hosted chat transcript.
5. **No load test.** No `tests/load/` or k6/artillery config. Defer to scale-ops
   advisory until traffic warrants it.
