# opchain audit remediation: execution plan

Authorized by the user's request on 2026-09-13 to create and manage parallel workstreams for the revised 1.9.0 audit. The follow-up authorizes task-specific model selection with restrained token use. This program owns the 32 stable audit IDs; it does not replace the separate updater or 2.0 learning-engine program.

Historical audit baseline: `4d39b937313181f84d08b517a1445d3d1eda7e6a`. Implementation baseline: published v1.9.1 product `aef40809fef4bbded9a47c936c7c544631397fb6`. The [audit](../../audits/2026-09-13-opchain-v1.9.0-family-audit.md) supplies issue evidence and package acceptance criteria. [workstreams.json](workstreams.json) supplies exclusive owners and exact sprint contracts. The current task coordinates shared integration; six separate tasks prepare isolated changes.

## Sprint sequence

| Stream | Sprint 1: independent repairs/contracts | Sprint 2: implementation/integration | Sprint 3: acceptance | Finding ownership |
|---|---|---|---|---|
| A — Commit verification | Receipt API; schema, quoting, hook ownership and scanner repairs | Exact candidate verifier and commit boundary | Partial staging, mutation, worktrees and host behavior | F01–F06, F17–F18, F25 |
| B — Release/PR gates | Phase ordering, mandatory checks, version inventory and monitor parity | Consume shared evidence and wire PR/deploy checks | Disposable untagged release and failure rehearsal | F07, F13–F16 |
| C — State/routing/handoffs | Shared envelope/store/lifecycle contracts; routing and reference repairs | Durable atomic writes, typed readers, lifecycle and suggestion consumers | MCP-only install/read/restart/handoff and concurrency journeys | F08, F10–F12, F19–F21, F28, F31 |
| E — Telemetry/PM | Local consent, validation, PM retry/revision identities | Aggregate/export and shared-store integration | Clone/privacy/export and mocked update journeys | F22–F24, F26–F27 |
| F — Prompt/cost execution | Dataset/results/baseline/cost contract and deterministic core | One provider adapter, runner and quality/budget exits | Regression/budget/absent-input failure journeys | F09 |
| G — Reusable kits | Bounded role/data adapter contract | Opt-in kits using A/C/F interfaces | Artifact-only tests and isolation limits | F30 |
| I — Coordinator | Ownership, contract review and model routing | Shared wiring, generated outputs and integration | Capability diagnostics and combined consumer evidence | F29, F32 |

Sprint numbers are local to each stream; there is no global wait for every Sprint 1 to finish. At most three implementation tasks run simultaneously. Start A1, C1 and E1. On a free slot, prioritize B1, then F1. G1 is a bounded contract review and G2 waits for A/C/F interfaces. Dependency-bound tasks stop after their current deliverable and resume only on a coordinator message carrying the accepted interface/version.

A and C publish their public interfaces before dependent consumers implement against them. B2 consumes A/C, E2 consumes C, and G2 consumes A/C/F. C owns both state infrastructure and lifecycle consumers to eliminate their prior overlapping ownership. F32 journey coverage belongs in every package's definition of done; I consolidates the evidence rather than reimplementing their tests.

## Boundaries that prevent overlap

- Each authored file has one owner in the manifest. Every stream owns its new test directory. An existing test outside the ownership allocation needs a coordinator assignment before editing.
- I exclusively owns root package/lock files, workflow wiring, generated catalogs, copied plugin skills/reference mirrors, capability documentation, master status and integration outputs. Streams submit an integration-request file containing exact requested changes and verification commands; they do not quietly edit shared files.
- A owns verification receipts. C owns checkpoint envelope/typed state/lifecycle and atomic storage. F owns evaluation and cost results. G reuses those APIs. An interface change is reviewed and versioned by I before consumers adopt it; no second implementation of a shared contract.
- Each task uses its own Codex worktree. Do not change another worktree, the installed plugin cache, existing live checkpoints or the updater candidate at `<worktree>/opchain-oc-update-v2`.
- Workers return reviewable diffs and measured test outcomes. They do not merge, push, tag, deploy, publish artifacts or send PM messages. I serializes integration in an isolated checkout and retains passing intermediate states.
- Existing product packaging generators remain authoritative. Generated changes are produced once after canonical source changes are assembled, avoiding six independently regenerated trees.

## Existing plans and release gates

This is a new remediation preparation program approved after the audit. Repairs and tests may be prepared in isolated branches now. The existing decision that the repository split precedes the 2.0 release remains intact. This program does not perform extraction, announce a path freeze, flip repositories, or start Hindsight/Evolve. No shared main branch or public mirror changes during preparation.

F's shared prompt/cost runner is a reusable remediation deliverable, not a duplicate 2.0 engine. It must hand its API and tests to the later learning work. G is the bounded optional initial kit from the audit, not a complete workflow-engine rewrite. Any incompatible wire or packaging change stays in the later release candidate. Compatible repair-release scope is decided from the tested combined diff; no release version is bumped during individual sprints.

The other task, “Audit upcoming 2.0 release,” is advisory input, not authorization to edit its updater worktree. Shared findings are resolved once here and handed off as patches/contracts; updater-specific recovery, approval-service and learning-identity redesign remain in that task's scope.

## Model and token policy

This is coordinator-managed model routing using per-task settings, not a claim that the app has an automatic token-budget enforcement feature.

- Default bounded implementation: `gpt-5.6-terra`, medium reasoning.
- A's candidate-verification design and C's state/concurrency contracts: `gpt-5.6-sol`, high reasoning while needed. Downgrade subsequent mechanical work.
- Narrow documentation, inventory checks, waiting acknowledgements and fixture maintenance: `gpt-5.6-luna`, low or medium reasoning.
- Escalate to `gpt-6-astra` only for a specific unresolved correctness issue or a focused adversarial review of a critical boundary. Do not run a premium model across every file or every sprint.
- Maximum three active implementation tasks; parked tasks do no polling or speculative dependent work. Use bounded event waits from the coordinator and compact status summaries.
- Give each task its contract and relevant findings, not the entire audit conversation. Avoid redundant scans, repeated full suites, multi-agent fan-out for routine edits, and full-history retransmission.
- Run focused meaningful tests while developing; run the full combined suite at integration. Repeat only after relevant changes or failures. Record actual skips and limitations.

## Review and completion

For each sprint, the builder records the contract criteria, files changed, tests run, failures/skips and unresolved dependencies. A separate evaluator reviews the contract plus changed artifacts without the builder's transcript for critical implementation milestones. No invented UI score applies to these non-UI sprints. A failed required criterion keeps the sprint open; a green self-review is not independent evaluation.

The coordinator maintains `sprints/audit-remediation/status.json`, returns failed criteria to their sole owner, and starts ready work when slots free. Completion requires all in-scope findings mapped to integrated evidence, artifact-only install/resume/handoff tests, correct blocking behavior, and a capability matrix that names untested/native-host gaps honestly. External release actions retain their existing gates.

Core A/B/C/E/F effort remains 29–48 person-days. G adds an initial 5–10 person-days, with diagnostics and broader host setup scoped separately as in the audit. Parallel execution reduces dependency wait; it does not divide the total by six or guarantee a calendar deadline. Refine estimates after Sprint 1, and avoid double-counting shared 2.0 work and per-stream journey tests.

## User directive: minimum work and visible progress

For every workstream, define one concrete completion goal and stay within it. Do the least work needed to satisfy the assigned acceptance criteria. Recheck whether each audited issue is still present in the actual worktree before implementing a fix; reuse existing corrections. Preserve necessary correctness and verification, while avoiding speculative features, cosmetic refactors, duplicate implementations and repeated tests without a reason.

Maintain a visible checklist of completed and upcoming tasks. Update it immediately after each verified completion using `[x]` and `[ ]`. Include realistic remaining active-effort ranges and separate dependency/wait time; state uncertainty and revise estimates based on measured progress. Do not call the entire workstream complete after finishing one sprint. Use an explicit Codex goal when actively dispatched; queued streams record their goal and checklist now and stay parked until dispatched, avoiding automatic continuation loops while waiting.

## Execution baseline correction

The app-created worktrees resolved the current default branch to `aef40809fef4bbded9a47c936c7c544631397fb6`, the 1.9.1 product-half release. The original audit and planning checkout remain at the earlier baseline. Preserve worker changes; do not reset them to the older audit state. Before each implementation sprint, revalidate its findings against 1.9.1, credit inherited fixes and implement only residual gaps. Remaining effort estimates must be revised after that comparison. A1/C1 completion is builder-reported and awaits independent review; it is not release acceptance.

## Current release reconciliation

The user paused implementation after the unexpected 1.9.1 release. The [post-1.9.1 reconciliation](../../../sprints/audit-remediation/release-reconciliation.md) now governs remaining integration and packaging. Preserve accepted stream work, credit inherited repairs, reconcile the site release and newer baseline PR #533, and produce one unpublished post-1.9.1 candidate. Automatic dispatch is paused; no implementation is restarted by this plan update. The older initial sprint statuses above are historical.

## Final preparation outcome

Accepted unpublished post-1.9.1 candidate delivered. All contracted streams and final source/package checks passed; [closure](../../../sprints/audit-remediation/closure.md) records inherited fixes, evidence and limits. No further implementation is dispatched. Publication, installation and external certification remain separate.
