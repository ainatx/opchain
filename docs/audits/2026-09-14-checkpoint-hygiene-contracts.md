# Checkpoint hygiene contract conflicts

Investigated on 2026-09-14 against source main `235127d` (catalog 2.0.0).
Both reports reproduce. The source hook incorrectly assumes every discovered
skill owes a tracked checkpoint after every invocation. The remedy honors
the skills' existing storage contracts, without changing downloadable skills.

## Root causes and reproduction

The 1.9.2 change in `7ccdacf` replaced a fixed 15-skill inventory with discovery
of all `skills/oc-*/SKILL.md` files, while retaining only the two foundation
exemptions. It also began enforcing invocation-relative timestamps. Expanding
the inventory introduced checkpoint obligations for skills with different
persistence contracts. Existence alone would also fail for an absent tracked
checkpoint; timestamp enforcement additionally rejects historical receipts.

The original C3 tests exercised a normal checkpoint-writing skill and a
synthetic new skill, but did not exercise either exceptional persistence model.
`npm run test:hooks` ran only the plugin gate and suggestion tests; C3 was
covered by `npm test`, but absent from the explicit hook test command.

For reproduction, create a temporary project with catalog entries for the two
skills and a JSONL transcript event:

```json
{"timestamp":"2026-09-14T10:01:00Z","message":{"content":[{"type":"tool_use","name":"Skill","input":{"skill":"oc-telemetry-ops"}}]}}
```

Pass `{"cwd":"<temporary-project>","transcript_path":"<transcript-path>"}` to
`.claude/hooks/checkpoint-hygiene.sh` on stdin. Repeat with `oc-update` as the
skill. Both invocations on main exit 0 but emit `"decision": "block"`, naming
the invoked skill and directing the assistant to write a tracked checkpoint.
Exit status alone is therefore not a successful session-end assertion.

Telemetry also blocks when its private checkpoint already contains
`record_updated_at: "2026-09-14T10:02:00Z"`, later than the invocation. The hook
never inspects that path.

## oc-update

`skills/oc-update/SKILL.md` expressly prohibits writing or reconciling any
checkpoint as an update side effect, including its own. Source mode also
never writes checkpoints. Install state belongs in `.opchain-install.json`.

[PR #545](https://github.com/ainatx/opchain/pull/545) supplies the appropriate
exemption and tests. It was OPEN, not merged, at investigation time. This work
is based on that PR's `da585b3` commit and retains its fix and regression test.
Merge #545 first, then retarget the telemetry follow-up to main if necessary.

A catalog-wide search of `skills/*/SKILL.md` for `do not write`, `never writes`,
and `not updated` found no other explicit prohibition on a skill's own
checkpoint beyond oc-update. Telemetry is a separate storage-contract decision,
not an inferred prohibition from those search terms.

## oc-telemetry-ops

The skill's Checkpoint Integration section describes consent/raw runs in
`.checkpoints/usage.sqlite` and aggregate metadata in the private subtree
`.checkpoints/.local/telemetry/.checkpoints/`. It says the tracked
`.checkpoints/oc-telemetry-ops.checkpoint.json` is not updated.
`scripts/telemetry.mjs` implements this in `persistAggregateCheckpoint`.

The owner selected exemption, option (a), after considering:

- **Exemption:** preserves the existing private storage and no-write behavior.
  This Stop hook no longer enforces telemetry freshness; the telemetry CLI and
  its tests continue to enforce consent and private aggregate persistence.
- **Accept the private timestamp:** resolves successful aggregate/export calls
  only. Status, enable, disable, record, and event do not necessarily produce an
  aggregate checkpoint. A complete implementation would need command-aware
  obligations or additional exemptions.
- **Write a tracked checkpoint:** changes the skill and runtime contract and
  requires defining safe shared metadata. It also risks forcing writes for
  status and opted-out invocations. It is unnecessary for this hook repair.

The fix adds only `oc-telemetry-ops` to the existing exemptions and explains the
reason in the hook comments. No skill, telemetry runtime, or consent behavior
changes. Ordinary checkpoint-writing skills remain enforced in mixed sessions.

## Distribution and release scope

There is no shipped copy of this enforcing hook. The plugin's
`plugins/opchain/hooks/hooks.json` registers `next-suggestion.cjs` for Stop;
that hook suggests a next action and does not block on missing checkpoints.
The checkpoint protocol already documents that raw skill installs, MCP clients,
and the distributed plugin do not implicitly receive source-repo enforcement.

This is a source-repository workflow fix. It does not require a catalog version
bump, changes to public skill downloads, a release tag, or deployment. Any future
distribution of checkpoint enforcement must carry these contract tests with it.

## Verification

Four added C3 cases first failed against #545's hook, proving that the tests
detect the telemetry bug. They cover absent, stale, and fresh private metadata;
bare and namespaced invocation; mixed sessions retaining auditor enforcement;
and real status/disable/opted-out-record commands that produce no telemetry
store or checkpoint. Assertions also confirm the hook does not create tracked
telemetry state or alter private metadata.

The existing oc-update regression test remains in C3, exercised by `npm test`.
`npm run test:hooks` continues to verify the shipped plugin hook suites.
The source hook also received a focused C3 run. Final command results are
recorded in the pull request.

Adding C3 to the root `test:hooks` command was considered, but the root
`package.json` is copied into five downloadable runtime bundles. The parity
check correctly rejected a root-only edit. Keeping that command unchanged
avoids unrelated downloadable metadata changes; both suites are already in CI.
