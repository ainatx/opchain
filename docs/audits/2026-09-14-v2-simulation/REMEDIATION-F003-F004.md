# F-003 / F-004 documentation remediation

Changed only these canonical product files in `<worktree>/opchain-v2-simulation-fixes` (base `63bb189dabb7c98b2fd961f11de144925a6e9519`):

- `skills/oc-git-ops/SKILL.md`: replaced checkpoint/PreToolUse authorization with explicit Git enrollment, `/oc-enroll`, the installed verifier, immutable staged-candidate receipts, foreign-hook blocking and independent CI verification. Removed obsolete `OPCHAIN_BYPASS=1` guidance; retained only Git's explicitly requested `--no-verify` bypass. Corrected stage/verify ordering, separate commit-group evidence, the full sync workflow, and cross-skill read semantics.
- `skills/oc-cost-ops/references/budget-gates.md`: documented shipped attribute/baseline/gate commands, separate cost versus score baseline artifacts, missing-baseline BLOCKED behavior, unavailable usage/pricing, dataset mismatch, exit statuses and actual rebaseline command. Distinguished executable eval gates from assistant-managed checkpoint budgets and optional CI wiring.

Validation completed:

1. `git diff --check -- skills/oc-git-ops/SKILL.md skills/oc-cost-ops/references/budget-gates.md` — exit 0.
2. `node --input-type=module` imported `evaluateCostGate` and `freezeCostBaseline` from `scripts/lib/cost/gate.mjs`; six assertions passed: missing baseline blocks despite configured cap; missing usage blocks; missing pricing blocks; valid same-dataset measurement passes; raised measurement fails both budget and regression; mismatched dataset blocks. Used in-memory fictional numbers only; no files, enrollment or provider calls were created by these probes.
3. Node assertions verified removed Git strings (`PreToolUse(Bash)`, `skill_state.verified_tree`, `OPCHAIN_BYPASS=1`, whole-working-tree PASS, plugin-install-only enforcement) and removed cost strings (ceiling-only fallback, missing runner claim, `/oc-cost budget --rebaseline`) no longer appear in the edited files. Required enrollment/receipt and runner command text is present.
4. Parsed `plugins/opchain/hooks/hooks.json`: registered hooks are exactly `SessionStart` and `Stop`. Manually compared the enrollment commands and final-decision flow with `skills/oc-bug-check/SKILL.md`, `plugins/opchain/commands/oc-enroll.md`, `scripts/install-git-drivers.mjs`, and `scripts/verify-candidate.mjs`; compared cost commands/exit behavior with the active Cost Ops skill and `scripts/cost.mjs`.

No commits, generators, enrollment or product runtime changes were performed. Packaged mirrors intentionally remain for the parent coordinator's synchronization and independent diff review. These checks validate the corrected documentation against existing behavior; they do not rerun the full candidate gate or claim a new release PASS.
