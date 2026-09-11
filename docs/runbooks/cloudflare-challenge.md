# Runbook: GitHub health probes receive a Cloudflare challenge

**Severity:** monitoring degradation plus residual public machine-client risk.

**Observed symptom:** GitHub-hosted requests to production and staging
`/api/health` return HTTP 403 with `cf-mitigated: challenge`, while normal local
operator traffic can still return the expected `395fc31` JSON response.

## What is happening

Cloudflare Free-plan Bot Fight Mode can challenge automated-looking requests at
the edge before they reach the Worker. The behavior is selective: the failing
GitHub Actions traffic does **not** prove that every browser, local `curl`, or
MCP client is blocked, and a successful local request does **not** prove that a
different public machine client will pass.

For v1.8.3, the confirming scheduled evidence is:

- Canary run `33272073249`: production and staging both received 403 challenge
  responses.
- Deploy lag run `33266202606`: the same challenge prevented its old
  `/api/health` comparison.
- Cloudflare still showed the approved production and staging deployments
  active, and normal local health checks returned `395fc31`.

This is an edge-policy/traffic-classification interaction, not evidence that a
new Worker deployment is needed.

## What not to do

Do **not** create or claim a narrow WAF Skip exception for Bot Fight Mode.
Cloudflare documents that Free-plan Bot Fight Mode runs outside the Ruleset
Engine and cannot be skipped or customized by a WAF Skip rule:

<https://developers.cloudflare.com/waf/feature-interoperability/>

For this disposition:

- keep Bot Fight Mode enabled;
- do not upgrade the plan solely to restore GitHub curl monitoring;
- do not expose a public `workers.dev` route as a monitoring bypass;
- do not treat repeated deploys as remediation for an edge challenge.

Any of those policy changes needs a separate explicit decision.

## Monitoring design

`.github/workflows/canary.yml` and `.github/workflows/deploy-lag.yml` use the
authenticated Cloudflare control plane instead of sending GitHub curl traffic
through the challenged custom-domain path. Their source of truth is
`.github/monitoring/release-baseline.json`.

The canary fails closed unless, for production and staging:

1. the newest deployment is the approved deployment id;
2. the approved version is the only version and receives exactly 100% traffic;
3. the version's script fingerprint, `fetch` handler, and `ASSETS` binding match;
4. the custom domain is present, certified, and associated with the expected
   Worker;
5. Workers observability and invocation logs remain enabled.

Deploy lag additionally proves that the signed release tag peels to the
baseline runtime SHA, that SHA remains an ancestor of `origin/main`, and all
changes after it are classified using the baseline's explicit
deploy-relevance rules. A docs/checkpoint/workflow-only main descendant is not
a deployment gap.

The monitor token should be a dedicated least-privilege credential capable of
reading Workers scripts/deployments, versions/settings, and custom domains.
Never print it or copy its value into a checkpoint, runbook, issue, or log.

## After an intentional deployment

From the exact reviewed and approved runtime checkout:

1. deploy staging and run the local staging smoke checks;
2. complete the human staging review at that exact SHA;
3. deploy that exact SHA to production and run the local production smoke
   checks;
4. record the new production/staging deployment ids, version ids, script
   fingerprints, and 100% traffic state in
   `.github/monitoring/release-baseline.json`;
5. verify the baseline script locally with credentials in the environment:

   ```bash
   node .github/scripts/cloudflare-monitor.mjs control-plane
   node .github/scripts/cloudflare-monitor.mjs deploy-diff
   ```

6. merge the reviewed baseline update with the deploy documentation. A feature
   branch dispatch is validation evidence only; continuous scheduled monitoring
   is active only after the change is on the default branch and a scheduled run
   succeeds.

## Interpreting failures

- **Deployment/version/traffic mismatch:** stop and inspect Cloudflare history.
  Do not silently bless an unknown version by editing the baseline. Deploy lag
  files or updates its tracking issue with the mismatch before failing the run
  (until 2026-09-11 it died before the issue step, so a mismatch produced red
  runs and nothing else), and `npm run deploy` ends every deploy whose SHA is
  not the approved one with a stale-baseline warning pointing back here.
- **Script fingerprint, handler, or binding mismatch:** treat the deployed
  artifact as unapproved even if its version id looks plausible.
- **Domain/certificate mismatch:** inspect the custom-domain association; do not
  pre-create replacement DNS records because Wrangler owns these routes.
- **Observability disabled:** restore logging before declaring monitoring
  healthy.
- **API authentication/permission failure:** rotate or repair the monitoring
  token. Do not mislabel it as application deployment drift.
- **Deploy-relevant source changes after the baseline:** open a new
  release/deploy workstream and approve a new exact runtime SHA. Do not deploy
  an arbitrary current `main` tip.

## Assurance boundary

A green control-plane check proves API access, approved deployment/version
identity, traffic allocation, Worker script identity, required binding/handler,
custom-domain association, and observability configuration. It does **not**
prove:

- `/api/health` returns JSON or `ok:true` through the public edge;
- Worker code, static assets, or external dependencies execute successfully;
- public reachability, regional behavior, latency, or TLS expiry;
- `/mcp` or another machine-facing route avoids a Bot Fight challenge.

Retain the point-in-time local health, smoke, TLS, and live-log evidence for each
release. Public custom-domain machine traffic, including `/mcp`, remains an
accepted residual risk until a separately approved edge-access design changes
that fact.
