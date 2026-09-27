# Skill coverage — 36/36 representative workflows

Each skill is counted once. A failed or correctly blocked operation counts as exercised, not passed. This matrix does not certify every command, lifecycle, host or production outcome. Agent-authored fixtures and shipped-runtime execution are distinguished in the linked evidence.

The frozen plans contain expected sequences, handoffs, hooks and outputs. Scenario reports compare those expectations with observed results. The JSON matrix preserves exact input/output paths and limitations; the validator checks inventory, required evidence paths and frozen plan hashes, not semantic correctness.

| Skill | Scenario | Declared invocation | Recorded outcome | Evidence |
|---|---|---|---|---|
| oc-agent-forge | S6 | /oc-agent plan; /oc-agent tools; /oc-agent fixtures | PASS | [S6.md](docs/audits/2026-09-14-v2-simulation/S6.md) |
| oc-api-dev | S4 | /oc-api design; /oc-api spec; /oc-api test | PASS_WITH_GAPS | [S4.md](docs/audits/2026-09-14-v2-simulation/S4.md) |
| oc-app-architect | S4 | /oc-discover; /oc-spec | EXERCISED_BLOCKED | [S4.md](docs/audits/2026-09-14-v2-simulation/S4.md) |
| oc-bug-check | audit | /oc-bugcheck run --all; node scripts/verify-candidate.mjs run --json | PASS_DECLARED_POLICY | [REPORT.md](docs/audits/2026-09-14-v2-simulation/REPORT.md) |
| oc-checkpoint-protocol | S1 | opchain checkpoint status; opchain checkpoint validate | PASS_SCOPED | [S1.md](docs/audits/2026-09-14-v2-simulation/S1.md) |
| oc-claude-api | S6 | /oc-claude-api tool-use; /oc-claude-api cache-audit | PARTIAL | [S6.md](docs/audits/2026-09-14-v2-simulation/S6.md) |
| oc-code-auditor | audit | /oc-audit full (as-is, Auditor only) | AUDIT_COMPLETE_OPEN_FINDINGS | [REPORT.md](docs/audits/2026-09-14-v2-simulation/REPORT.md) |
| oc-compliance-ops | S7 | /oc-comply scope; /oc-comply register; /oc-comply evidence; /oc-comply gaps | COMPLETE_WITH_GAPS | [S7.md](docs/audits/2026-09-14-v2-simulation/S7.md) |
| oc-cost-ops | S6 | /oc-cost baseline; /oc-cost budget; /oc-cost attribute; /oc-cost gate | PASS | [S6.md](docs/audits/2026-09-14-v2-simulation/S6.md) |
| oc-dash-forge | S4 | /oc-df-spec-only | PASS_SCOPED | [S4.md](docs/audits/2026-09-14-v2-simulation/S4.md) |
| oc-data-ops | S4 | /oc-data-ops design; /oc-data-ops contracts; /oc-data-ops build; /oc-data-ops verify | PASS_FIXTURES | [S4.md](docs/audits/2026-09-14-v2-simulation/S4.md) |
| oc-deploy-ops | S7 | /oc-deploy audit | BLOCKED | [S7.md](docs/audits/2026-09-14-v2-simulation/S7.md) |
| oc-docs-forge | S7 | /oc-docs pr | PASS | [S7.md](docs/audits/2026-09-14-v2-simulation/S7.md) |
| oc-evolve | S2 | /oc-evolve reflect; learning evolve stage | EXERCISED_BLOCKED | [S2.md](docs/audits/2026-09-14-v2-simulation/S2.md) |
| oc-fleet-ops | S5 | /oc-fleet topology | exercised_blocked | [S5.md](docs/audits/2026-09-14-v2-simulation/S5.md) |
| oc-git-ops | S7 | /oc-commit | PASS_WITH_EXPECTED_NEGATIVE | [S7.md](docs/audits/2026-09-14-v2-simulation/S7.md) |
| oc-hindsight | S2 | /oc-hindsight harvest; learning hindsight stage/query/activate/retire | EXERCISED_BLOCKED | [S2.md](docs/audits/2026-09-14-v2-simulation/S2.md) |
| oc-integrations-engineer | S6 | /oc-integrate plan; /oc-integrate webhook; /oc-integrate test | PASS | [S6.md](docs/audits/2026-09-14-v2-simulation/S6.md) |
| oc-migration-ops | S5 | /oc-migrate assess; /oc-migrate plan; /oc-migrate dry-run; /oc-migrate verify | exercised_blocked | [S5.md](docs/audits/2026-09-14-v2-simulation/S5.md) |
| oc-modularize-ops | S5 | /oc-modularize assess; /oc-modularize characterize; /oc-modularize plan | exercised_blocked | [S5.md](docs/audits/2026-09-14-v2-simulation/S5.md) |
| oc-monitoring-ops | S5 | /oc-monitor slo; /oc-monitor runbook; /oc-monitor postmortem | completed_scoped_workflow | [S5.md](docs/audits/2026-09-14-v2-simulation/S5.md) |
| oc-orchestrator | S7 | /oc-ops status; /oc-ops next; /oc-ops route | PASS | [S7.md](docs/audits/2026-09-14-v2-simulation/S7.md) |
| oc-prompt-ops | S6 | /oc-prompt goldset; /oc-prompt eval; /oc-prompt baseline; /oc-prompt regress | PASS | [S6.md](docs/audits/2026-09-14-v2-simulation/S6.md) |
| oc-qa-ops | S4 | /oc-qa pyramid; /oc-qa contracts; /oc-qa loadplan | PASS_WITH_GAPS | [S4.md](docs/audits/2026-09-14-v2-simulation/S4.md) |
| oc-rag-forge | S6 | /oc-rag design; /oc-rag goldset; /oc-rag eval | FAIL | [S6.md](docs/audits/2026-09-14-v2-simulation/S6.md) |
| oc-release-ops | S7 | /oc-release plan; /oc-release draft; /oc-release verify | BLOCKED | [S7.md](docs/audits/2026-09-14-v2-simulation/S7.md) |
| oc-repo-ops | S7 | /oc-repo verify | PASS_WITH_EXPECTED_NEGATIVE | [S7.md](docs/audits/2026-09-14-v2-simulation/S7.md) |
| oc-reverse-spec | S5 | /oc-rev-scan | completed_scoped_workflow | [S5.md](docs/audits/2026-09-14-v2-simulation/S5.md) |
| oc-scale-ops | S5 | /oc-scale budget; /oc-scale benchmark | completed_scoped_workflow | [S5.md](docs/audits/2026-09-14-v2-simulation/S5.md) |
| oc-security-auditor | S7 | /oc-security threat-model; /oc-security prioritize | COMPLETE_WITH_OPEN_FINDINGS | [S7.md](docs/audits/2026-09-14-v2-simulation/S7.md) |
| oc-security-hardening | S7 | /oc-harden fix SA-S7-001; /oc-harden verify; bounded /oc-harden gate | PASS | [S7.md](docs/audits/2026-09-14-v2-simulation/S7.md) |
| oc-signal-forge | S4 | /oc-signal frame; /oc-signal design; /oc-signal build; /oc-signal verify; /oc-signal wire | PASS_FIXTURES | [S4.md](docs/audits/2026-09-14-v2-simulation/S4.md) |
| oc-stack-forge | S4 | /oc-stack-decide | PASS_SCOPED | [S4.md](docs/audits/2026-09-14-v2-simulation/S4.md) |
| oc-telemetry-ops | S1 | /oc-telemetry status | PASS_SCOPED | [S1.md](docs/audits/2026-09-14-v2-simulation/S1.md) |
| oc-update | S1 | /oc-update check; /oc-update; opchain recover | FAIL | [S1.md](docs/audits/2026-09-14-v2-simulation/S1.md) |
| oc-ux-engineer | S4 | /oc-uxe plan; /oc-uxe dash | EXERCISED_BLOCKED | [S4.md](docs/audits/2026-09-14-v2-simulation/S4.md) |

S3 supplies additional release/hook evidence without double-counting skills assigned to other scenarios.

Independent coverage reviews: S4-COVERAGE-REVIEW.md and S7-COVERAGE-REVIEW.md. Full qualifications and the NO-GO decision: REPORT.md.
