# E1 handoff — Telemetry and PM reliability

## Public interface proposal

- `scripts/telemetry.mjs` persists `consent_enabled`, `handle`, and
  `consent_since` in `telemetry_meta` inside `.checkpoints/usage.sqlite`.
  Tracked `telemetry_handle` fields are legacy/informational only.
- `record` validates catalog-derived skill IDs, phases, and command verbs plus
  constrained tier/outcome/numeric values before any insert.
- `findPmAwareSkills(skillsDir)` discovers the PM contract inventory;
  `parsePmYaml(src)` is the full YAML parser entry point. `parseShallowYaml` is a
  compatibility alias only.
- PM markers are proposed as
  `opchain:<skill>:<event>:<correlation-id>:<revision>:<payload-hash>`.

## Coordinator integration requests

- Review any checkpoint-protocol schema statement that describes
  `telemetry_handle.enabled` as active consent; E1 intentionally does not edit
  C-owned checkpoint sources or generated/plugin mirrors.
- After C publishes its atomic local-store API, E2 needs a versioned mechanism
  for telemetry metadata and checkpoint-path reporting without inheriting
  consent from tracked state.

## Verification

Run `npx vitest run tests/audit-telemetry-pm/e1.test.js` and
`npm run validate-pm-mcp`. Both are local and synthetic; no external PM service
is contacted.

## E2 handoff

### Public interfaces

- `scripts/lib/telemetry-aggregate.mjs` exports `buildTelemetryAggregate()` for
  schema `opchain-usage-aggregate/1.0`; it accepts grouped local data only.
- `telemetry event`, `aggregate`, and `export --out=<new-file>` are consent-gated
  local commands. Export never overwrites an existing file.
- Aggregate checkpoint updates use C's `createLocalCheckpointStore`,
  `readCheckpointRecord`, and `writeCheckpointRecord` with `expectedRevision`.
- `buildPmMarker()` supplies retry-stable, payload-hashed marker identities.

### Evidence

- `npx vitest run tests/audit-telemetry-pm/e2.test.js --reporter=verbose`:
  PASS, 4/4.
- `git diff --check`: PASS.
- `npm run validate-pm-mcp`: blocked outside E ownership: C-owned
  `oc-orchestrator` lacks the required protocol citation; B-owned
  `oc-release-ops` retains one legacy `mcp.<provider>.` placeholder. No E-owned
  validator failure remains.

### Integration requests

- C: add the PM protocol citation to `skills/oc-orchestrator/SKILL.md`.
- B: replace the legacy placeholder in `skills/oc-release-ops/SKILL.md` with a
  concrete registry name or protocol reference.
- E3 remains undispatched. E2 requires independent review before further work.

## E2 correction handoff

Independent review corrections are limited to three changes:

- Aggregate metadata now uses C's store with project root
  `.checkpoints/.local/telemetry`, never the tracked telemetry checkpoint. The
  CLI runs `git check-ignore` on its nested checkpoint target before a write and
  refuses when the private-path convention is absent. C3 owns the consumer
  `.checkpoints/.gitignore` convention; E does not modify C files.
- Weekly eval aggregation is now SQL `GROUP BY strftime('%Y-W%W', at)` with SQL
  `COUNT` and `AVG`, before the export builder sees any row.
- `reconcilePmComment()` is the executable comment composition/pre-write
  boundary. Its mock-provider tests cover uncertain delivery replay,
  fail→pass, and revision changes without external PM traffic.

### Correction verification

- `npx vitest run tests/audit-telemetry-pm/e2.test.js --reporter=dot --silent`:
  PASS (four focused E2 tests, including private-path guard and mocked PM replay).
- `node --check scripts/telemetry.mjs`, `node --check
  scripts/lib/telemetry-aggregate.mjs`, and `git diff --check`: PASS.
- `npm run validate-pm-mcp` remains blocked solely by the previously recorded
  C-owned `oc-orchestrator` citation and B-owned `oc-release-ops` placeholder;
  no C source was changed by this correction.

## E3 handoff

### Supported initialization and boundary

`persistAggregateCheckpoint()` first calls C's existing local store at the
consumer project root. C3's `createSession()` atomically establishes
`.checkpoints/.gitignore` with `.local/`; telemetry then verifies the private
target is ignored and writes through a second C store rooted at
`.checkpoints/.local/telemetry`. E owns no ignore writer or checkpoint writer.

Git worktrees on C's supported local-store hosts are the supported aggregate and
export environment. Non-Git projects retain consent-gated local record behavior,
but aggregate/export fails closed because the private metadata path cannot be
verified as ignored.

### E3 evidence

- `npx vitest run tests/audit-telemetry-pm/e2.test.js
  tests/audit-telemetry-pm/e3.test.js --reporter=verbose`: PASS, 7/7.
- E3 covers fresh consent, disable/re-enable handle rotation, malformed enabled
  record/event data, unavailable and explicit denominators, suppression,
  raw-free export, private checkpoint placement, non-Git failure, uncertain PM
  replay, fail→pass, and revised-contract outcomes.
- No external PM message, export publication, or C-source change occurred.

E3 is ready for independent review; do not start another E sprint from this
worktree without coordinator dispatch.

## E3 review closeout

- Independent E3 review accepted runtime behavior and requested one
  documentation-only correction: stale text claimed aggregate/export lacked CLI
  implementations and that telemetry wrote no aggregate state.
- Corrected `skills/oc-telemetry-ops/SKILL.md` to document the local `event`,
  `aggregate`, and `export --out=<new-file>` commands, Git/private-path
  prerequisite, no-auto-publication limit, and private checkpoint location.
- No implementation or test changes were made for this closeout.
