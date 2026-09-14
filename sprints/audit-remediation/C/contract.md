# Sprint C1/C2 contract — canonical state and durable local MCP

Owner: workstream C  
Scope: C1 only  
Findings: F08, F10–F12, F19–F21, F28, F31  
Worktree: `/Users/aidanelsesser/.codex/worktrees/bf6d/opchain`

## Goal

Publish the smallest compatible state/routing contract needed for later C
sprints: wire-1.1 lifecycle and typed handoffs, an atomic-store interface,
path-safe versioned MCP reference retrieval, and focused evidence that the real
MCP router retains the already-landed catalog coverage.

## Acceptance checklist

- [x] Existing `protocol_version: "1.0"` and `"1.1"` envelopes remain valid.
- [x] The published canonical validator rejects missing common-envelope fields
  and skill mismatches without adding 2.0 evaluation-history fields.
- [x] `record_updated_at`, `verified_at`, immutable `candidate`, and explicit
  finding lifecycle semantics are published and executable.
- [x] Versioned `verification.verdict`, `architecture.module-map`, and
  `evidence.reference` handoffs have fail-closed consumer validation.
- [x] Store API v1 defines durability/scope/atomic-replace/CAS capabilities,
  opaque revisions, and stale-revision conflict behavior.
- [x] The local MCP server advertises a versioned reference manifest, reads
  advertised references, preserves the audit-probe compatibility URI, and
  rejects traversal.
- [x] Static docs synchronization copies reference trees; generated output was
  not refreshed in this worktree.
- [x] The real MCP `route` tool passes every current opchain-eval routing case.
- [x] Existing checkpoint CLI and MCP tests remain green.
- [x] A copied `checkpoint.mjs` runs outside the source checkout without a
  `src/` dependency.
- [x] No C2 durability, locking, suggestion, lifecycle-consumer, or current-run
  enforcement implementation was started.

## Verification

1. `vitest run tests/audit-state/c1-state-contract.test.js tests/audit-state/c1-mcp-routing-references.test.js`
   — PASS, 2 files / 52 tests.
2. `vitest run tests/checkpoint.test.js tests/checkpoint-cli.test.js`
   — PASS alongside the C1 fixtures, 4 files / 110 tests.
3. `OPCHAIN_DOCS_DIR=<temporary-directory> bash scripts/sync-docs.sh`, followed
   by existence checks for App Architect's `spec-template.md` and this C1 state
   contract — PASS.
4. `git diff --check` — PASS.

The worktree reused the repository's existing dependency installation through
a temporary `node_modules` symlink; no packages were installed and the symlink
was removed after each test run.

## Not claimed by C1

- Hosted MCP reference loading is not wired until the coordinator supplies the
  ASSETS provider and generated manifest integration described in `handoff.md`.
- MCP checkpoint writes still accept the legacy untyped shape. C2 will adopt
  the canonical validator at the transport boundary after the coordinator
  accepts the API and assigns the existing permissive tests for update.
- The portable checkpoint CLI deliberately retains its self-contained validator.
  Runtime validator sharing is deferred to C2 packaging/integration design; it
  is not a completed C1 criterion.
- Durable local storage, atomic file replacement, compare-and-swap, event
  merging, suggestion behavior, current-run hygiene, and verification-freshness
  consumers remain C2/C3 work.

## C2 addendum — durable local MCP only

Scope: project-scoped local stdio checkpoint storage, strict typed-envelope
consumption, and the lifecycle/suggestion readers that consume its timestamps.
Hosted checkpoint state remains outside this scope and advisory.

### Acceptance checklist

- [x] Local MCP persists checkpoint files under `<project>/.checkpoints` and
  can read them after a provider restart.
- [x] Writes use write-then-rename replacement and a per-record OS advisory
  lock; killed writers release locks and orphaned temporary files do not affect
  the last complete record.
- [x] Issued session UUIDs persist across restart, fabricated UUIDs are
  rejected, and separately issued sessions retain the intentional shared
  project checkpoint namespace.
- [x] `expectedRevision: null` is create-only; a revision string is guarded;
  an omitted revision retains atomic legacy replacement.
- [x] The local MCP boundary validates the canonical typed envelope and returns
  revisions. Hosted MCP retains its legacy permissive/advisory behavior.
- [x] Session-start seeds Stop-hook transition state; lifecycle readers use
  `record_updated_at ?? updated_at` and count only typed findings with
  `status: "open"`.
- [x] The oc-orchestrator PM section cites the shared PM-MCP protocol.
- [x] Local lock capability is checked at provider construction: macOS requires
  executable `/usr/bin/lockf`, Linux requires `flock` on `PATH`, and other
  platforms fail explicitly before project state or sessions are created.
- [x] Focused C1/C2 tests and diff whitespace validation pass.

### Verification

`vitest run tests/audit-state/c1-state-contract.test.js
tests/audit-state/c1-mcp-routing-references.test.js
tests/audit-state/c2-local-checkpoint.test.js` — initial C2 PASS, 3 files / 57
tests. Post-review lock/session evidence is recorded in `handoff.md`.

### Not claimed by C2

- Hosted Worker storage/authentication and generated asset integration.
- Append-only event merge semantics, current-run enforcement, or an elevated
  trust status for remote checkpoint JSON.

## C3 addendum — fresh consumers and canonical writer

### Acceptance checklist

- [x] The copied single-file checkpoint CLI serializes per-skill mutations and
  atomically replaces validated JSON without importing the source tree.
- [x] Concurrent append updates preserve both accepted events; an actual killed
  writer leaves the previous JSON intact and a later update recovers.
- [x] Repo-local checkpoint hygiene derives the inventory from the skill tree,
  normalizes namespaced Skill invocations, requires a post-invocation protocol
  timestamp, and prevents repeated Stop-hook loops.
- [x] Local MCP creates consumer ignore rules for issued sessions, locks,
  temporary files, and the reserved `.local/` private-runtime subtree.
- [x] Local MCP documentation describes durable project state, reference
  resources, shared issued-session semantics, and supported-host limits.
- [x] A disposable artifact-only journey proves advertised reference loading,
  routing, restart, cross-session resume, and typed handoff consumption.
- [x] Fresh lifecycle journeys prove first-use downstream suggestion delivery
  and that a metadata restamp cannot hide old verified evidence.
- [x] Coordinator packaging and seven-description publication requirements are
  explicit in `packaging-requirements.md`.

### Not claimed by C3

- Hosted state as a verification receipt or changes to the integration-only
  hosted bridge.
- Native combined-hook enrollment owned by workstream A.
- Windows durable local writes, generated artifact publication, or release.
