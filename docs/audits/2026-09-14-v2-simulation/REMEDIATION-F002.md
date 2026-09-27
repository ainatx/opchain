# F-002 remediation — updater telemetry authority

**Implemented in the repair worktree only:** `<worktree>/opchain-v2-simulation-fixes`, base `63bb189dabb7c98b2fd961f11de144925a6e9519`. No commit or bundle generation performed. Parent independently reviews and regenerates packaged copies.

The canonical `scripts/update-opchain.mjs` now checks the same authority as current telemetry runtime: `.checkpoints/usage.sqlite` → `telemetry_meta.consent_enabled === 'true'`. Historical tracked checkpoint handles are never read as consent, including malformed or copied metadata. The standalone updater cannot import the telemetry CLI (it exits on import and the distributed updater must remain self-contained), so it reads the identical documented local metadata key directly.

All SQLite inspection still occurs on a private temporary snapshot with relevant journal/WAL bytes; no live database, sidecar, consent or checkpoint is written. Missing store or legacy store without metadata means OFF. Local false/missing opt-in means OFF. Locally enabled healthy tables mean ON. Locally enabled but unreadable usage tables mean unhealthy/exit 2. An unreadable local consent database means `enabled:null`, UNKNOWN/unhealthy/exit 2, avoiding a fabricated ON/OFF assertion. Existing path/symlink safety and recovery logic remain unchanged.

## Evidence

- New `tests/update-telemetry-consent.test.js`: **9/9 failed on the original implementation**, then **9/9 passed with the fix**. Includes healthy enabled without tracked checkpoint, enabled against stale tracked OFF, enabled/broken tables, local OFF against stale tracked ON, copied tracked ON without a store, corrupt database/unknown consent, check and install exit-2 behavior, and CLI OFF/success for copied historical opt-in. Every case preserves stored state bytes; check-only unhealthy invocation leaves the root inventory unchanged.
- Focused combined run: **80/80 passed** across the new regression suite, updater install/preservation tests, source-update tests, and abrupt recovery tests. Existing active/closed WAL preservation tests now seed actual local consent so they exercise the enabled path honestly.
- Updated `tests/update-bundle.test.js` fixture now first verifies copied historical consent remains OFF, then seeds explicit local consent with missing usage tables and expects exit 2 without database replacement. **Parent must run this suite after synchronizing bundles**; canonical updater changes intentionally make the old bundled copy stale until that step.
- `git diff --check` passed.

Raw reports: `evidence/f002-before.json`, `f002-after.json`, `f002-targeted.json` and matching logs. Tracked diff: `evidence/f002-tracked.diff`. New regression source is in the repair worktree (untracked until parent commits).

Owned edits: canonical updater; `tests/update-telemetry-consent.test.js`; `tests/update-opchain.test.js`; `tests/source-update.test.js`; `tests/update-bundle.test.js`. No other product files edited by this task. S1 composed revalidation against regenerated packaged copies remains the parent's independent verification step.
