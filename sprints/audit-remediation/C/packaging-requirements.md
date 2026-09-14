# C3 coordinator packaging requirements

These are coordinator-owned publication/generation actions. C3 does not modify
root package, CI, generated catalogs, hosted Worker bridge, or built artifacts.

## Local MCP artifact

Ship the following paths together; the artifact-only C3 journey proves this
set with installed runtime dependencies and no source-checkout fallback:

- `mcp/local-server.mjs`
- `scripts/gen-mcp-catalog.mjs` and `scripts/lib/frontmatter.mjs`
- `src/lib/mcp/{server,routing,references,checkpoint-contract,checkpoint-store,local-checkpoint-store}.js`
- the full `skills/` tree, including every advertised `references/` file
- runtime `js-yaml` and its `argparse` dependency

The artifact host must provide Node plus `/usr/bin/lockf` on macOS or `flock` on
Linux. Do not advertise durable local checkpoint writes on other hosts unless a
separately reviewed process-owned lock implementation is added.

## Generated/publication refresh

Regenerate coordinator-owned catalogs/docs/bundles after integration. Confirm
the already-corrected shared orchestrator description table publishes all seven
families missing from the installed 1.9.0 artifact:

- `oc-agent-forge`
- `oc-claude-api`
- `oc-prompt-ops`
- `oc-rag-forge`
- `oc-signal-forge`
- `oc-modularize-ops`
- `oc-fleet-ops`

Also preserve the coordinator's hosted reference bridge; C3 contains no hosted
Worker replacement.
