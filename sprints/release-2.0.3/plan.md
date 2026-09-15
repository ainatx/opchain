# 2.0.3 — Focused execution, visible progress

## Goal

Make every opchain skill pursue a concrete outcome with proportionate work,
and make saved task progress visible when a session resumes. Prepare a tested
2.0.3 release candidate with matching product and site surfaces.

## Completion criteria

- All 36 skills receive the same concise execution policy through their shared
  orchestrator reference. Conflicting evaluator and model-selection instructions
  agree with it.
- Checkpoint status shows saved goals, task states, and supplied estimate ranges;
  old checkpoints remain readable and brief output stays compact.
- Site copy explains the behavior accurately. The patch card, release range,
  card count, and full patch badge agree with the 2.0.3 catalog and manifests.
- Skill bundles, installed runtime, unit/CLI tests, type checks, builds, and
  relevant browser checks pass. Review and release evidence records actual results.

## Workstreams

| Task | Owner | State | Initial estimate | Acceptance |
| --- | --- | --- | --- | --- |
| Establish clean baseline | Integrator | Complete | 3–5 min | Branch from current origin/main; preserve existing checkout edits |
| Shared execution policy | Policy agent | Complete | 8–12 min | One shared policy; qualifying work saves a minimal checkpoint plan; required checks retained |
| Runtime progress display | Runtime agent | Complete | 10–15 min | Existing status command renders recorded progress without writes or invented estimates |
| Site surfaces | Site agent | Complete | 8–12 min | Existing page design, accurate copy, patch history and anchors retained |
| Release integration | Integrator | Complete | 5–8 min | Lockstep versions, refreshed seal, regenerated bundles and release notes |
| Verification and review | Integrator + reviewer | Complete | 12–20 min | Required local checks and independent review, with failures resolved |
| Candidate staging | Integrator | Complete | <1 min | All 2.0.3 source, test, site and release-plan changes staged together after the final build |

Workstreams run concurrently where file ownership permits. Integration depends
on the first three implementation workstreams. Initial wall-clock estimate:
35–55 minutes, assuming no substantial validation failure. These are planning
ranges, not measured token budgets or delivery promises.

## Scope and compatibility

This patch repairs inconsistent execution guidance and the existing checkpoint
status display. It adds no skills, commands, provider configuration, or required
checkpoint schema fields. Qualifying work must save goal and progress data in the
existing extensible wire 1.1 format; `skill_state.goal` and
`progress_table[].estimate` remain wire-compatible metadata.

The policy preserves user-selected models and permissions. It guides model and
effort selection only where the host supports it. Fast mode is excluded.

## Release boundary

This work prepares the complete candidate. Merge, signed tag, registry publish,
staging deployment, production deployment, and live monitoring evidence are
separate release stages; none is reported as complete by a successful local build.
The site changes are prepared for the release cut and must not be deployed as
claims about 2.0.3 before the matching product is released.

## Validation

Final validation:

- Final root unit suite: 94 files, 1,260 tests passed, including the malformed-sibling regression and installed-package parity.
- Hook fixtures: 149 commit-gate and 19 next-suggestion cases passed.
- Astro check: 0 errors, 0 warnings; 39 existing hints.
- Full Playwright suite: 124 tests passed, including mobile/desktop, keyboard, release anchors and accessibility.
- Worker build and 83-page site build passed; skills zip and updater bundle generated at 2.0.3.
- All 36 source skill versions, shared protocol copies, packaged copies, release surfaces and seal digests agree.
- Checkpoint validation passed; doctor reports 0 errors and 20 existing advisory warnings.
- Dependency gates: no critical vulnerabilities. Root audit is clean; site audit retains 13 existing advisories (2 low, 4 moderate, 7 high). Lockfiles are unchanged.
- Independent review found and resolved an unrelated-null-checkpoint crash in named brief status and repeated welcome prompts during authorized work. Site review also corrected sticky-header coverage of patch deep links.

- Lighthouse: all configured budgets passed on 7 routes across 21 runs. Minimum observed scores: performance 98, accessibility 97, best practices 96, SEO 100.
- Follow-up scenario finding resolved: qualifying small tasks now create and finish a minimal saved checkpoint plan. Focused checkpoint/runtime suite passed (13 tests).

No benchmark of model cost or speed is claimed. Source changes are prepared in
`codex/release-2.0.3` at this worktree and remain uncommitted. Nothing was tagged,
pushed, published, or deployed.

## Artifacts and review

- Local preview: http://127.0.0.1:4333/changelog#v2-0-3
- Skill archive: `public/opchain-skills.zip` (36 skills at 2.0.3).
- Updater manifest: `public/opchain-update/latest.json`.
- Updater bundle SHA-256: `6d460b5503210c1aa1cf451c44fc2e5151454a9af6b233cee89cf12f83ea6f51`.
- Runtime implementation: `scripts/checkpoint.mjs`; policy source: `skills/orchestrator.md`.

## Remaining release-cut stages

Prepare the product and site commits/PRs using the patch sequence in
[the release guide](../../docs/governance/RELEASING.md). Before a commit or PR,
run the staged candidate verifier and generate current Docs Forge / Repo Ops
source-bound evidence. After review and merge, sign the 2.0.3 tag from main,
complete the patch site cut, rebuild and deploy through staging and production,
and refresh live monitoring evidence. This local build does not substitute for
those release gates.
