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
the 1.9.2 repair baseline and a null release date. At the user's request, the
site now presents the finished 2.0 launch experience without a preview banner.
The production deploy command still refuses a tree containing that marker.

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

## Launch presentation clarification

The user requested that staging show the finished public 2.0 experience. The
site therefore presents 2.0 as released, with no invented release date, while
release-preview.json remains an internal deployment block for production. This
presentation change does not complete any outstanding release acceptance item.
See ../audits/2026-09-13-v2-launch-presentation.md. The three additional demo exchanges were approved and are now integrated in the site.


## Approved comparison refresh

The approved comparison page is now integrated in the 2.0 worktree with Slate and Emerald, updated Opchain claims, 169 cited cells and 42 sources. The [comparison release handoff](../releases/2.0-comparison-handoff.md) records evidence and release boundaries.

- [x] Record the approved comparison scope and verify the source inventory.
- [x] Port implementation/tests/research and review all Opchain claims against the 2.0 package.
- [x] Recheck external prices/links and verify citations, interaction and both release themes.
- [x] Attach integrated test and visual evidence to the site release handoff.

The comparison integration was deployed to staging at `63bb189`. The remaining overall release acceptance above is unchanged.


## Approved demo and install additions

The user lifted the staging hold on September 14. The candidate includes the
verified simulation repair commit `9176f021832ff7d1dd66039f77b8fa1f03e44a09`.
It repairs escaped-path release gates, machine-local consent inspection and the
Git Ops and Cost Ops instructions, including their packaged copies.

- [x] Integrate the four verified simulation fixes.
- [x] Add the approved updater, older-install bootstrap and Hindsight/Evolve exchanges.
- [x] Identify the new conversations and results as scripted examples.
- [x] Add a copyable upgrade prompt above the install flows, with manual copy fallback.
- [x] Verify all 15 scenarios, search, mobile layout and both themes.
- [ ] Commit with fresh candidate evidence, deploy staging and verify the live pages.

The upgrade prompt checks for a published 2.0 release before proceeding, preserves
local settings and directs global plugins through their host's update flow.
The learning demo illustrates external review and a rejected regression; its
scores are not evidence from an actual provider run. Production release
acceptance and the null release date remain unchanged.

Review: [demo and install staging review](../audits/2026-09-14-demos-install-staging-review.md).
