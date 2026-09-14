# 2.0 runtime alignment and staging

Approved scope: implement all six findings from the runtime review, update the
release plan and site, import the existing color work, and verify staging. No
release date is set. The original Option C architecture remains the foundation.

## Sources

The repair baseline is `93dc854`, the reviewed 1.9.2 integration. The color work
comes from the Slate and Emerald branch through `f4d879c`, including its revised
light palette. Current 2.0 runtime and updater work is preserved. This preview
contains 36 skills and 16 plugin commands; `/oc-enroll` accounts for the extra
command introduced by the newer commit verifier.

## Findings and implementation

| Finding | Change type | Applied change | Acceptance |
|---|---|---|---|
| F1: lost concurrent saves | Runtime code | Reuse serialized, atomic checkpoint writes | Concurrent writers keep every update; failure and interruption tests |
| F2: copied tracking permission | Runtime code, skills, references | Use local SQLite consent; historical checkpoint fields never grant permission | Cloned enabled field creates no store and records no usage |
| F3: missing runtime files | Packaging, plugin files | One manifest defines a complete repository-shaped closure for each owner | Fresh artifact runs checkpoint, tracking and evaluation without authoring files |
| F4: different gate evidence | Hooks, runtime code, skills | Explicit Git enrollment and candidate receipts; typed code and security handoffs for deployment | Actual staged bytes, stale evidence and unenrolled learning-only fixtures |
| F5: incompatible evaluation output | Runtime code, skill file | Reuse the prompt grader while recording instructions, policy, outputs and per-case results | Valid baseline and candidate pair; changed inputs, interrupted runs, synthetic evidence and regressions fail |
| F6: conflicting instructions | Skill files, references, site | Correct canonical guides and regenerate distributed copies | Contract, bundle and plugin drift checks; current site descriptions |

## Preview identity

Artifacts use version 2.0.0. `release-preview.json` records staging-only status,
the 1.9.2 repair baseline and a null release date. The site's released history
continues to describe 1.9.2; a banner labels the new catalog as a preview. The
production deploy command refuses a tree containing that preview marker.

## Remaining release acceptance

Staging verification is not the release cut. A real provider run with independently
reviewed before and after evidence, externally controlled reviewer setup, native
host acceptance, checkpoint wire 1.2 migration decisions, the repository split
and a signed release dress rehearsal remain separately tracked release work.
Fixtures prove implementation behavior, not an observed improvement by a model.

## Execution checklist

- [x] Preserve the previous worktree and integrate the reviewed repair baseline.
- [x] Apply the six runtime recommendations and add focused checks.
- [x] Import the approved color design and update forward site surfaces.
- [x] Pass complete tests, package checks, site checks and builds.
- [x] Review the exact candidate and record deployment evidence.
- [x] Deploy staging, verify its version and smoke tests, and record rollback details.

Staging implementation and verification are complete.
Deployment details: [2.0 staging preview](../releases/2.0-staging-preview.md).
The default branch monitoring baseline still needs its separate reviewed update;
allow 10 to 20 minutes plus review time. Full release acceptance has no date.

Review evidence: [staging review](../audits/2026-09-13-v2-runtime-staging-review.md).
