# Frozen expansion — 100% skill coverage

User increased coverage from 60% to **100%** on 2026-09-14. This supplements, and does not rewrite, PLAN.md. Candidate remains `63bb189dabb7c98b2fd961f11de144925a6e9519` (36 skills). All production/release workstreams remain held. Freeze this document before S4–S7 execution.

## Counting rule

A skill counts only after a representative **substantive declared workflow** has run against the scenario's own inputs, produced its required artifact or actionable refusal, and been checked against its skill contract. A plan-only command counts when planning is the actual requested skill operation (e.g. QA pyramid, dashboard spec); a menu, static source read, mention, proposed handoff or generic unit test does not. A blocked operation counts as exercised, never as successful completion. oc-checkpoint-protocol has no slash command: exercise its actual persistence/validation/merge contract. Count every skill once, even across scenarios.

This is 100% **skill-level simulation coverage**, not 100% verb/branch/platform coverage and not a production acceptance certificate. Artifacts and fixtures remain explicitly synthetic. No real deployments, account connections, external messages, provider spending, reviewer enrollment, global installation or release approval is implied. Approval gates are recorded as gates; no real human approval is fabricated. Where later fixture phases need artifacts beyond such a gate, use separately labeled prepared inputs rather than claim the gate passed.

For each skill record: scenario, declared invocation, loaded SKILL.md, input paths, output paths, observed checks, expected vs actual, outcome, implementation mode (agent workflow / shipped runtime / external blocked), and limits. Emit `coverage.json` per scenario. Each counted workflow needs content meaningful to its scenario, not merely a checkpoint claiming success.

## S4 — Multi-tenant logistics exception product, data estate and dashboard

Eight primary skills: **oc-app-architect, oc-stack-forge, oc-qa-ops, oc-data-ops, oc-signal-forge, oc-api-dev, oc-ux-engineer, oc-dash-forge**.

Inputs: fixture logistics events with duplicate deliveries, revisions, late arrival, tenant boundaries, missing status, stale snapshots and an empty tenant. Decision: where should operations intervene to prevent overdue shipments? Fixed local simulation stack avoids cloud account access.

Expected sequence:

1. `/oc-discover` → overview, personas, scope, success criteria and risks. `/oc-spec` delegates stack/QA; produce a bounded spec package and explicit review gate.
2. `/oc-stack-decide` → app/data stack decision with rejected alternatives; declare warehouse, queue and transform_tool inputs for Data Ops. Local fixture execution is separate from deployment recommendation.
3. `/oc-qa pyramid`, `/oc-qa contracts`, `/oc-qa loadplan` → `.opchain/qa.yaml`, `06-testing.md`, owner-specific contract matrix, target/SLO/duration. Do not invent measured coverage.
4. `/oc-data-ops design`, `contracts`, `build`, `verify` → layer/consumer maps; staging and mart YAML contracts; executable fixture transform; explicit fixture conformance. Reject unsafe invariant expressions, duplicate identity conflicts and stale/orphaned datasets. No live warehouse PASS.
5. Explicit `/oc-signal frame`, `design`, `build`, `verify`, `wire` (not an automatic app-architect edge) → metric catalog, independently reconciled numerator/denominator, replay/late-data checks, stable consumer payload. Inherit one mart freshness alert, do not double-alert.
6. `/oc-api design`, `spec`, `test` → API schema and conformance cases for tenant isolation, malformed query, empty data and stale state. Verify the handler or fixture implementation; no real provider endpoint.
7. `/oc-uxe plan`, `/oc-uxe dash` → task flow, accessible loading/empty/error/stale/denied states, token constraints and a concrete dashboard handoff.
8. `/oc-df-spec-only` → operations archetype, layout, density, semantic tokens, chart choices, interactions and handoff bundle consuming actual signal/schema. A prototype is not required by this verb.

Expected hooks: no automatic skill execution; explicit chain invocations and checkpoints carry artifacts. Existing learning/context is off. Outputs include design/spec/contract files, fixture source and independent tests, API payloads, UI specifications and eight coverage entries. Verify shared names, grain, tenant field, freshness, units and API shape across handoffs. Any missing downstream artifact is a failed edge.

## S5 — Extract a live order service with backfill, cutover and rollback

Six primary skills: **oc-reverse-spec, oc-modularize-ops, oc-migration-ops, oc-fleet-ops, oc-scale-ops, oc-monitoring-ops**.

Inputs: locally runnable fixture monolith with orders/inventory/billing coupling and recorded requests, simulated traffic and data, idempotency/retry race, partial extraction and an incompatible schema. Never represent the synthetic traffic as a live customer system.

Expected sequence: `/oc-rev-scan` inventories actual fixture files/routes/dependencies; `/oc-modularize assess`, `characterize`, `plan` freeze boundary map and golden behavior evidence (flag that real production fixtures remain required); `/oc-migrate assess`, `plan`, `dry-run`, `verify` consume boundaries and execute a reversible local migration replay; `/oc-fleet topology` creates service/dependency/health/rollout/isolation topology and refuses infrastructure execution without environment credentials; `/oc-scale budget`, `benchmark` execute bounded local workload and distinguish local timing from capacity certification; `/oc-monitor slo`, `runbook`, `postmortem` consume actual fault-injection trace to produce SLO definitions, actionable alert/runbook and source-backed incident analysis.

Expected failure injections: repeated event, lost/extra output, schema incompatibility, half-complete migration, latency or health breach. Outputs: reverse spec, golden requests/results, module ownership map, rollback/checkpoint plan, exercised migration and equivalence log, fleet topology, benchmark metrics, alert contract and postmortem. Invoke monitoring as an explicit handoff. No persistent real monitors or timers. Hooks are local fixture Git/checkpoint machinery only.

## S6 — Tenant-safe AI support service with external connector and cost pressure

Six primary skills: **oc-agent-forge, oc-claude-api, oc-rag-forge, oc-integrations-engineer, oc-prompt-ops, oc-cost-ops**.

Inputs: synthetic support documents across tenants, malicious retrieved instructions, ambiguous answer, tool loop, duplicate/out-of-order webhook, provider failure/rate limit, golden prompt tasks and declared fictional pricing used only for fixture arithmetic.

Expected sequence: `/oc-agent plan`, `tools`, `fixtures` define topology/tool ceilings and isolation; `/oc-claude-api tool-use`, `cache-audit` review/scaffold exact message/tool/caching contract against the candidate's reference implementation without a real provider call; `/oc-integrate plan`, `webhook`, `test` build and exercise a local authenticated/idempotent connector with fixture keys explicitly labeled test-only; `/oc-rag design`, `goldset`, `eval` produce source/chunk/filter/retrieval contract and execute recall/MRR/citation/tenant-isolation fixtures; `/oc-prompt goldset`, `eval`, `baseline`, `regress` run the shipped runner with an explicit synthetic adapter and expose poisoned/held-out failures; `/oc-cost baseline`, `budget`, `attribute`, `gate` use shipped cost helpers where available and measure fixture cost against a declared cap. Provider outages, unknown prices and missing usage must not become fabricated success/zero cost.

Outputs: agent/tool contract, Claude integration review/artifact, connector and replay tests, RAG goldset and retrieval results, prompt dataset/run/baseline/regression report, cost ledger/budget verdict, explicit external prerequisites. No live-provider authenticity or improvement claim. No learned-rule adoption. No auto-hooks assumed; supplied request outputs stay untrusted and model tools remain allowlisted.

## S7 — Governed release handoff with contradictory state and incomplete evidence

Nine primary skills: **oc-orchestrator, oc-security-auditor, oc-security-hardening, oc-compliance-ops, oc-docs-forge, oc-repo-ops, oc-git-ops, oc-release-ops, oc-deploy-ops**. Also exercises the root **oc-code-auditor** and **oc-bug-check**.

Inputs: runnable small fixture repo, safe public route plus private route, deliberately missing header, conditional hardening/compliance manifests, synthetic prior checkpoint with stale PASS, staged functional change and a failing current check.

Expected sequence: `/oc-ops status`, `next`, `route` on fixture state chooses execution blockers over advisory learning; `/oc-security threat-model`, `prioritize` produces trust boundaries/risks tied to actual fixture code; `/oc-harden baseline`, `fix`, `gate` writes declared controls and verifies local response/config (fix fixture only); `/oc-comply scope`, `register`, `evidence`, `gaps` records control/evidence ownership and explicit missing evidence without certification; `/oc-docs pr` writes the actual docs packet and body fragment; `/oc-repo verify` checks packet, source/artifact parity and candidate freshness; `/oc-commit` runs actual local Git hook/receipt check; `/oc-release plan`, `draft`, `verify` produces scoped release packet and tests tag/version stages; `/oc-deploy audit` executes the documented gate against current scoped findings/hardening/compliance evidence and emits a concrete blocking decision if incomplete. No deployment or external PR creation.

Failure injections: stale audit, wrong scope, header regression, missing control evidence, docs changed after verification, stale receipt, missing tag and path containing spaces. Compare authoring and packaged contracts. Outputs: router decision, threat model, manifest/control check, evidence bundle/gap register, docs packet, repo readiness, actual local commit gate result, release draft/verification and deployment audit verdict. Explicit local enrollment owns Git hook installation; plugin SessionStart/Stop remain state/suggestion adapters.

## Closure

Initial scenarios alone do not meet 100%; S1–S3 had unfinished role reports at the user's stop. Complete those reports from preserved evidence, retain failures, then finish S4–S7. The intended unique union is all 36 catalog entries. Do not declare 100% until each coverage entry has existing input/output paths and a substantive observation. Run a machine-readable union check against the actual SKILL.md inventory; independently review output sufficiency. Produce final matrix plus release go/no-go with failed probes and external prerequisites separate from coverage.
