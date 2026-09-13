## [1.9.2] — 2026-09-13 — "Verified handoffs"

Continues the 1.9.1 audit repairs with executable verification and shared state.
The maintainer selected 1.9.2 for the complete approved remediation scope,
including the additive local tools listed below. Release artifacts and staging verification are recorded separately from production deployment.

### Fixed

- Local MCP rejects symlinked skill entry points and reference paths outside the
  skill tree; reference reads must match the startup manifest and content digest.

- Commit verification checks the actual staged candidate at the Git commit
  boundary, including partial staging, compound commands, alternate repositories
  and linked worktrees. Receipts bind the candidate, repository and declared policy.
- Required PR/deploy evidence and release checks reject missing or invalid results;
  compliance remains warn-only. Release phases and monitoring-baseline policy agree.
- Local MCP retrieves bundled references and persists provider-issued sessions and
  typed checkpoints. Atomic writes and revision checks protect concurrent updates;
  lifecycle hooks distinguish fresh verification from old records.
- Telemetry consent stays local rather than following a cloned checkpoint. Field
  validation, aggregate/export privacy rules and PM retry/revision identities are explicit.

### Added

- Explicit `/oc-enroll` setup plus packaged verification runtime, with path-safe
  installation and a refusal to overwrite foreign hooks.
- Runnable prompt evaluation and cost checks with versioned baselines, failure
  artifacts and a bounded HTTP adapter; live-provider certification is separate.
- Local telemetry event/aggregate/export commands, delivery-capability diagnostics,
  a dependency-included local runtime and optional bounded execution kits.

### Compatibility and security posture

**Migration/setup required before relying on the new behavior.** All 33 skill
versions move together; no skills are added. The wire protocol remains 1.1, with
an additional typed state contract for consumers that require validated evidence.
Re-enroll each target Git repository. Old handwritten checkpoint PASS values do
not replace executable receipts; configure required checks in `.bugcheck.json`.
Obtain a fresh local MCP session when migrating from the process-local provider,
and explicitly enable telemetry locally. Legacy records may need fresh producer
runs to satisfy typed consumers. Local durability requires macOS lockf or Linux
flock; native Windows support is absent. Local hooks are bypassable, hosted state
is advisory, and execution kits declare `isolation:none`. Remote protected CI,
live PM/provider delivery and deployment remain separate release gates.

Hindsight/Evolve and the repository split remain outside this release's scope.


The verifier, check policy and CI workflows are reviewed repository configuration. CI re-executes checks instead of trusting a copied local receipt; it does not protect against malicious changes approved into that configuration. Tracked audit handoffs record assessor conclusions and source identity, not cryptographic proof of the assessor’s identity.
