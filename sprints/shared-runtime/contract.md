# Shared runtime implementation contract

Source: docs/plans/2026-09-13-v2-shared-runtime.md, user-approved Option C.

Deliverables: dependency-free shared core and separate learning modules; unified
CLI exposing existing and learning commands; self-contained generated runtime
closure; repaired updater recovery and consumer metadata; gate fixes; thin skill
adapters; design and validation evidence.

Acceptance: event collisions fail and duplicates do not count twice; stale or
mutated candidate/evaluation/approval data cannot activate; unknown signers fail;
positive task improvement and no regressions required; expired/disabled/retired
material is not returned; consumer artifacts run without source checkout files;
interrupted updates preserve later edits; learning-only repos are not enrolled;
missing-tree PASS is refused; legacy APIs and all repository tests remain valid.

Non-goals: wire stamp/release cut, Git commits, OSS split execution, production
hook installation, hosted approval service, automatic model calls, replacement
of existing domain expertise. Real-host/model acceptance remains release work.
