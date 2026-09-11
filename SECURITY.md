# Security Policy

opchain has two halves with different owners of risk:

| Surface | What it is | Where to report |
|---|---|---|
| **Skills, plugin, MCP servers** (`skills/`, `plugins/`, `mcp/`, the hosted `POST /mcp`) | Code and content that runs on *your* machine or that agents call | [Private vulnerability report on asfbay-bit/opchain-skills](https://github.com/asfbay-bit/opchain-skills/security/advisories/new) |
| **opchain.dev site + Worker** (`site/`, `src/`, the `/api/*` routes) | The hosted service | [Private vulnerability report on ainatx/opchain](https://github.com/ainatx/opchain/security/advisories/new) |

Not sure which? Either channel works — we'll route it. You can also email **security@opchain.dev**.

## Supported versions

The latest released skill catalog (currently 1.8.x) and whatever is live at opchain.dev. Older skill bundles are not patched — upgrade to the current zip or plugin release.

## What to expect

- **Acknowledgement within 3 business days.**
- **Critical issues patched within 7 days; high within 30** (matching the published policy at <https://opchain.dev/security>).
- We'll keep you informed as we triage, and credit you in the advisory unless you ask otherwise.
- Advisories are published as GitHub Security Advisories (GHSA) on the repo the fix lands in; CVEs are requested through GitHub where warranted.

## Safe harbor

Good-faith research is welcome. If you make a genuine effort to avoid privacy violations, data destruction, and service degradation (no DoS, no spam, no social engineering), we will not pursue legal action over your research or report. Please don't access data that isn't yours — a proof-of-concept against your own data is always enough.

## Scope notes

- The plugin's hooks are the highest-trust surface we ship (they run on contributor machines with user permissions) — reports about hook behaviour are especially welcome.
- The hosted `POST /mcp`, `/api/feedback`, `/api/notify`, and `/api/votes` endpoints are in scope for the service half.
- Machine-readable contact: <https://opchain.dev/.well-known/security.txt> (this file and that one must agree; the `/security` page renders security.txt verbatim). The `Expires:` stamp is renewed as part of each release checklist.
