# Simulation finding remediation

The four findings from REPORT.md have fixes on `codex/v2-simulation-fixes`, based on the audited candidate `63bb189dabb7c98b2fd961f11de144925a6e9519`. Three parallel Fixer workstreams implemented the changes. The coordinating auditor reviewed the original findings and literal diffs and independently replayed the packaged updater scenario. This is a supplemental result; the original as-is audit and its evidence remain unchanged.

## Verification

| Finding | Verdict | Change and evidence |
|---|---|---|
| F-001 HIGH | VERIFIED | Three related release entrypoints resolve real filesystem paths and encode file URLs before comparing identity. Missing/unsigned tags, release-surface drift and missing deploy evidence now refuse correctly in escaped paths; symlink invocation executes the gate. Before: four escaped-path failures, then two symlink failures during refinement. After: 63/63 focused tests. |
| F-002 MEDIUM | VERIFIED | Updater reads machine-local SQLite consent from a private snapshot, preserves historical checkpoints and database bytes, and returns exit 2 for enabled unhealthy telemetry. Unreadable consent is explicitly unknown. New regressions: 0/9 before, 9/9 after; 80/80 related tests. Independent replay of original S1 with only the candidate path changed: 20/20 versus 15/20. |
| F-003 MEDIUM | VERIFIED | Git Ops now explains explicit Git enrollment, immutable staged-candidate receipts, per-commit verification, preserved foreign hooks and the informational role of checkpoints. No claim that plugin installation itself enforces commits remains in the repaired file. Canonical/plugin copies match. |
| F-004 MEDIUM | VERIFIED | Cost Ops reference now documents shipped commands, separate measured-cost and score baselines, and missing-baseline BLOCKED behavior. Six focused cost behavior checks pass; canonical/plugin copies match. |

The scope is surgical: runtime changes address the two demonstrated defects; two additional release entrypoints share the same demonstrated defect. Related existing test fixtures now seed actual local consent. Generated copies account for repeated changes. The literal diffs reveal no unrelated product changes.

Detailed evidence: REMEDIATION-F001.md, REMEDIATION-F002.md and REMEDIATION-F003-F004.md. Original replay inputs and outputs remain under `evidence/s1`; the repaired run is separate under `evidence/remediation/s1`. Packaged-reference and plugin-parity checks pass.

## Combined gate and delivery

The normal enrolled pre-commit gate passed all **8/8 required checks** on tree `3fb83f4ac1726c3614e3b699d5b818cd3a3221d6`. The verified repair commit is `9176f021832ff7d1dd66039f77b8fa1f03e44a09` on `codex/v2-simulation-fixes`. No bypass was used. Receipt: `evidence/remediation/receipt.json`; final clean-worktree evidence: `evidence/remediation/final-state.json`. The existing critical dependency threshold is unchanged; this does not clear the previously recorded lower-severity advisory debt.

## Release scope

The original release candidate checkout remains unchanged. The repair branch is prepared for integration; no push, release tag or deployment occurs here. These fixes close the four product findings, not the separate authentic-provider, native-host, signing, migration and other release-acceptance requirements recorded in REPORT.md. Other release workstreams remain held until the user lifts that hold.

## Tasks

- [x] Isolate the repair branch and dispatch three workstreams.
- [x] Fix and independently review all four findings.
- [x] Refresh and validate packaged copies.
- [x] Replay the original updater scenario against the packaged repair.
- [x] Complete combined commit gate and save the verified repair commit.

No remediation tasks remain for these four findings. The repair commit is local and ready for integration; publication and other release acceptance remain held.
