# Sprint C1 handoff

Status: C1 implementation and focused verification complete; awaiting
coordinator API acceptance before C2.

## Public interface proposal

`src/lib/mcp/checkpoint-contract.js`

- `CHECKPOINT_WIRE_VERSION` and `ACCEPTED_CHECKPOINT_WIRE_VERSIONS`
- `validateCheckpointEnvelope(checkpoint, { expectedSkill? })`
- `HANDOFF_CONTRACT_VERSION`, `HANDOFF_TYPES`
- `validateCheckpointHandoff(...)`
- `getCheckpointHandoff(checkpoint, { type, id?, artifactId? })`
- `checkpointRecordUpdatedAt(checkpoint)`

`src/lib/mcp/checkpoint-store.js`

- `CHECKPOINT_STORE_API_VERSION`
- `validateCheckpointStoreProvider(...)` / `assertCheckpointStoreProvider(...)`
- `readCheckpointRecord(...)` / `writeCheckpointRecord(...)`
- `CheckpointStoreContractError` / `CheckpointConflictError`

`src/lib/mcp/references.js`

- resource schema `opchain.skill-references/1.0`
- canonical URI `opchain://skill/{id}/references/v1/{path}`
- manifest URI `opchain://skill/{id}/references/v1/manifest.json`
- compatibility read alias `opchain://skill/{id}/references/{path}`
- path normalization, URI parsing, and manifest construction helpers

The contract deliberately retains wire 1.1. Lifecycle/handoff fields are
additive. Hosted checkpoint state remains advisory and cannot become a local
verification receipt.

## Changed files

- `src/lib/mcp/checkpoint-contract.js` — canonical envelope, lifecycle, finding,
  and typed-handoff validation/read API.
- `src/lib/mcp/checkpoint-store.js` — atomic store v1 capability/revision API.
- `src/lib/mcp/references.js` — versioned path-safe reference resources.
- `src/lib/mcp/server.js` — reference manifests, templates, and reads over MCP.
- `mcp/local-server.mjs` — real local reference inventory and loading.
- `scripts/checkpoint.mjs` — retains its established self-contained envelope
  validator and is smoke-tested as a copied artifact outside the source tree.
- `scripts/sync-docs.sh` — copies each skill's reference tree.
- `skills/oc-checkpoint-protocol/SKILL.md` and
  `skills/oc-checkpoint-protocol/references/state-contract-v1.md` — public
  protocol documentation.
- `tests/audit-state/c1-state-contract.test.js` and
  `tests/audit-state/c1-mcp-routing-references.test.js` — owned C1 evidence.
- `sprints/audit-remediation/C/contract.md` and this handoff.

No generated catalog/docs, root package files, existing tests, plugin mirrors,
live checkpoints, caches, tags, branches, services, or updater worktree were
changed.

## Coordinator integration request

The hosted Worker is outside workstream C ownership. Before claiming hosted
F10 closure, update `src/index.js` so `createMcpServer(...)` receives:

1. `loadReference(id, path)` that fetches `/docs/${id}/${path}` from `ASSETS`
   after the core server has normalized the path.
2. `listReferences(id)` backed by a deterministic manifest shipped with the
   generated docs or catalog.

The coordinator also owns the corresponding generated catalog/docs refresh and
existing hosted-worker test edits. Required assertions:

- hosted `resources/list` advertises the App Architect reference manifest;
- hosted `resources/read` loads both the canonical v1 URI and the compatibility
  `references/spec-template.md` URI;
- traversal and a missing reference return invalid-params;
- the manifest content matches the published files.

After API acceptance, C2 should update the existing permissive checkpoint tests
under coordinator assignment while deciding how to wire
`validateCheckpointEnvelope` into MCP writes and implementing the filesystem
provider against `checkpoint-store.js`. Runtime validator sharing is deferred;
it is not implemented by C1, because the portable CLI must remain a single-file
consumer artifact.

## Test evidence

- C1 tests: PASS — 52/52, including a copied-artifact CLI smoke test.
- Focused C1/CLI compatibility tests: PASS — 110/110.
- Earlier existing checkpoint/MCP compatibility run: PASS — 103/103.
- Static reference publication smoke test: PASS.
- Diff whitespace validation: PASS.

## Dependencies and risks

- **Dependency:** coordinator acceptance of the state/store interface before C2.
- **Dependency:** coordinator-owned hosted ASSETS and generated-manifest wiring.
- **Risk:** C1 deliberately does not share runtime validation with the portable
  CLI. C2 must design any shared packaging without breaking the copied-artifact
  contract and must not treat this deferred wiring as complete.
- **Risk:** the current router fix is inherited from the checkout rather than
  authored here; C1 adds real-MCP regression evidence but should not claim the
  earlier implementation commit as this workstream's diff.

## C2 completion handoff

Status: complete. The accepted C1 API is now exercised by
`src/lib/mcp/local-checkpoint-store.js` and the local stdio server.

### C2 interface behavior

- Local checkpoints are durable, project-scoped files in
  `<OPCHAIN_PROJECT_DIR || cwd>/.checkpoints`.
- Issued session UUIDs are persisted and checked. Fabricated UUIDs are
  rejected, while independently issued sessions intentionally share the same
  project-and-skill record for resume.
- The provider returns opaque SHA-256 content revisions. `expectedRevision:
  null` is create-only; a matching string is an update guard; omitting the
  field is the backwards-compatible atomic replacement mode.
- `mcp/local-server.mjs` opts into strict envelope validation and revision-aware
  reads/writes. The core server defaults to legacy mode, leaving hosted state
  isolated and advisory.
- Per-record and session-registry writes use OS-managed advisory locks. Process
  death releases ownership; no timestamp or PID-based stale-lock stealing is
  used. Write-then-rename keeps the last accepted record intact.
- Native-host support is explicit: macOS requires executable
  `/usr/bin/lockf`; Linux requires executable `flock` on `PATH`. Store
  construction fails before session creation or project writes when the tool
  is absent, and other platforms are reported unsupported. No Windows support
  was inferred because the repository does not promise it for local MCP.
- The durable local session UUID is an issued transport capability. It is not
  a security boundary against the same OS user, nor is it a verification
  receipt. Hosted isolation remains separate.

### C2 evidence

- `vitest run tests/audit-state/c1-state-contract.test.js tests/audit-state/c1-mcp-routing-references.test.js tests/audit-state/c2-local-checkpoint.test.js`
  — PASS, 3 files / 57 tests.
- `git diff --check` — PASS.

Post-review focused evidence adds persisted-session rejection/sharing and an
actual SIGKILL fixture proving live-owner exclusion followed by concurrent
recovery. `vitest run tests/audit-state/c1-state-contract.test.js
tests/audit-state/c2-local-checkpoint.test.js tests/mcp-server.test.js` — PASS,
3 files / 41 tests.

Portability correction evidence: the C2 suite tests missing Linux `flock` and
unsupported-platform failures before `.checkpoints` exists, then exercises the
real macOS `/usr/bin/lockf` path including killed-holder recovery. The final
focused rerun passed 3 files / 42 tests; `git diff --check` also passed.

### C2 dependencies intentionally left open

- Coordinator-owned hosted Worker/ASSETS integration and its existing tests.
- Any future append-only event merge design or current-run enforcement.

Next authorized action: none. Stop after C2 and await coordinator dispatch.

## C3 completion handoff

Status: C3 implementation and focused verification complete; ready for
independent review.

The canonical CLI now uses the accepted process-owned lock/atomic-replace
contract while remaining a copied single-file artifact. Repo-local hygiene
enforces current-run writes from normalized transcript events. Local MCP writes
private consumer runtime ignores, including `.local/`, and its README no longer
claims process-memory storage.

Fresh C3 fixtures cover the packaged local server rather than importing from
the checkout: advertised references, routing, restart/new-session resume, and a
typed evidence handoff all complete. Separate journeys cover first-use
suggestion delivery and verification freshness after metadata-only writes.

Coordinator-owned packaging and seven-description publication work is listed
in `packaging-requirements.md`. C3 did not touch the hosted integration bridge,
root package/CI/generated files, or native combined-hook enrollment.

Verification: `bash -n .claude/hooks/checkpoint-hygiene.sh`, followed by the
12-file C-owned state/checkpoint/MCP/routing matrix with two file workers — PASS,
296/296 tests. `git diff --check` — PASS. No package was installed; the existing
repository dependency tree was exposed through a temporary symlink and removed
after the run.
