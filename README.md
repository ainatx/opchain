# opchain

> **Opchain 2.0.0.** Released September 14, 2026. Includes the verified 1.9.2 repairs, shared runtime, updater, Hindsight and Evolve. See the [release record](docs/releases/2.0-production-release.md).

> skills that ship.

opchain is an open-source Claude skill ecosystem for developers —
a tightly-integrated set of Claude Code skills (`SKILL.md` files)
covering the full development pipeline: discover, spec, design,
build, audit, deploy, and scale.

Install a skill. Trigger it by name. Pick up where you left off.

---

## what's a skill?

A skill is a self-contained instruction set that extends Claude's
behavior for a specific phase of development. Each skill:

- Owns one phase of the pipeline
- Reads upstream checkpoints from other skills
- Writes its own checkpoint so work persists across sessions
- Triggers via slash command or natural language

No API keys. No build step. Unzip the skill bundle into Claude's
skills folder and go.

---

## the pipeline

> discover → spec → design → build → audit → ship → scale

Each phase is owned by a dedicated skill. Skills share state
through a JSON checkpoint protocol — context flows forward
without manual handoffs.

| phase | skill | trigger | what it does |
|---|---|---|---|
| discover | `oc-app-architect` | `/oc-discover` | Requirements interview → user stories, constraints, acceptance criteria |
| spec | `oc-app-architect` + `oc-stack-forge` | `/oc-spec` | API contract, data model, stack decision with rationale |
| design | `oc-ux-engineer` | `/oc-uxe plan` | Formal design spec, component tree, style tokens |
| build | `oc-app-architect` | `/oc-build` | Generator → Evaluator loop. Score ≥ 7/10 to advance. |
| audit | `oc-code-auditor` | `/oc-audit full` | 5-layer sweep: security, performance, correctness, UX, config |
| ship | `oc-deploy-ops` + `oc-git-ops` | `/oc-deploy staging` | Audit gate, staging, smoke tests, production with rollback |
| scale | `oc-scale-ops` | `/oc-scale audit` | Load tests, perf budgets, caching, capacity planning |

---

## skill library

36 skills across 6 phases. Canonical list lives in
[`skills/README.md`](./skills/README.md) — this table mirrors it.

### foundation

| skill | role |
|---|---|
| `oc-checkpoint-protocol` | Session persistence (bundled in all skills) |
| `oc-orchestrator` | `/oc-ops` — multi-project registry, status, routing |

### plan

| skill | role |
|---|---|
| `oc-reverse-spec` | Code → spec docs |
| `oc-dash-forge` | Dashboards + dense data UI (spec + React prototype) |
| `oc-scale-ops` | Scaling readiness |

### plan + build

| skill | role |
|---|---|
| `oc-ux-engineer` | Tri-design harness |
| `oc-stack-forge` | Universal stack advisor |
| `oc-app-architect` | Unified planning + build harness |
| `oc-docs-forge` | Documentation generator for every PR: PR body/comments, README/catalog docs, changelog, ADR upkeep |
| `oc-api-dev` | First-party API design + build harness (OpenAPI, versioning, SDKs) |
| `oc-migration-ops` | `/oc-migrate` — DB / framework / auth / platform migrations |
| `oc-modularize-ops` | Live-monolith decomposition with golden-fixture equivalence proof |
| `oc-qa-ops` | Test-pyramid design: coverage strategy, contract-test matrix, load-test planning |
| `oc-data-ops` | Data pipelines: ingestion, transformation layers, dbt, observable data contracts |
| `oc-compliance-ops` | Standing control register + audit-ready evidence bundles at deploy time |

### build + ai-native

| skill | role |
|---|---|
| `oc-agent-forge` | Claude Agent SDK apps: topology, tool budgets, harness loops, agent eval |
| `oc-claude-api` | Claude API apps: model routing, prompt caching, tool use, migration playbooks |
| `oc-prompt-ops` | Prompt-as-code: versioning, eval datasets, regression and drift detection |
| `oc-rag-forge` | RAG systems: vector DB choice, embeddings, chunking, hybrid search, retrieval eval |

### build

| skill | role |
|---|---|
| `oc-integrations-engineer` | API integration harness (third-party APIs you consume) |
| `oc-code-auditor` | Auditor → Fixer → Verifier. 5-layer sweep, pre-deploy gate |
| `oc-bug-check` | Pre-commit QA gate: type, lint, tests, secrets, build, deps, anti-patterns |
| `oc-security-auditor` | Threat modeling, OWASP hardening, attack-surface review |
| `oc-security-hardening` | Remediation operator: execute hardening fixes, per-deploy hardening gate |
| `oc-repo-ops` | Repository hygiene and PR readiness gate |
| `oc-cost-ops` | LLM cost attribution, budget gates, model-tier routing recommendations |
| `oc-telemetry-ops` | Opt-in local usage metering and anonymized aggregate dashboard feed |
| `oc-signal-forge` | Product-analytics signal builder: question to trustworthy metric |
| `oc-fleet-ops` | Self-managed fleet deployment and multi-container operations |

### ship

| skill | role |
|---|---|
| `oc-git-ops` | Conventional commits, sprint-scoped branches, checkpoint-enriched PRs |
| `oc-release-ops` | Release cadence: plan, draft, bump, announce, ship |
| `oc-deploy-ops` | Audit gate → staging → smoke tests → production → auto-rollback |
| `oc-monitoring-ops` | Post-deploy observability — uptime, errors, alerts, incidents |

---

## install

The isolated 2.0 candidate adds **`/oc-update`** for updating existing repo-local
skills and **`/oc-update check`** for read-only checks. It preserves telemetry
settings and history, backs up changed files, and includes local helpers.
See the [2.0 updater plan](docs/plans/2026-09-12-oc-update-v2-addendum.md) for the
bootstrap and release integration checklist. The candidate is not published yet.

### Claude.ai / Cowork

1. Go to Settings → Customize → Skills
2. Upload each `.zip` file (from a release, or built locally with
   `npm run make-zip` — see [`skills/README.md`](./skills/README.md))
3. Delete any existing tri-dev skill (merged into `oc-app-architect`)

### Claude Code CLI

```bash
mkdir -p .claude/skills
# unzip each skill's .zip into .claude/skills/, e.g.:
unzip oc-app-architect.zip -d .claude/skills/oc-app-architect
claude
> /oc-discover
```

### Codex / any MCP agent

Codex Agent Skills use the same `SKILL.md` format, so either unzip into
`.codex/skills/` the same way, or point an MCP client at the hosted server:

```toml
[mcp_servers.opchain]
url = "https://opchain.dev/mcp"
```

### Team (check into git)

```bash
git add .claude/skills/
git commit -m "chore: add opchain skills"
git push
```

Full walkthrough: https://opchain.dev/install — full skill list and
install details: [`skills/README.md`](./skills/README.md).

---

## the checkpoint protocol

Every skill writes a JSON checkpoint to `.checkpoints/` in your
project. Skills read each other's checkpoints to make informed
decisions:

- `oc-deploy-ops` reads `oc-code-auditor` — CRITICAL findings block deploy
- Build evaluator reads `oc-ux-engineer` — grades frontend against approved spec
- `oc-git-ops` reads `oc-app-architect` — names branches by sprint

## license

Apache-2.0 — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). Copyright 2026
Aidan Elsesser and the opchain contributors. Releases up to and including
v1.8.2 were published under MIT; later releases are Apache-2.0.

## Package capabilities

See the generated [delivery-mode matrix](docs/capabilities.md) for skills, hooks, runtimes, and assurance limits. Run `npm run capabilities -- --mode source` for a read-only package diagnostic, or select `claude-plugin`, `skills`, `local-mcp`, or `hosted-mcp` with `--root PATH` for another artifact. File presence does not certify native-host execution or repository enrollment.

For local runtime acceptance, `npm run runtime:package -- --out /absolute/new-directory` creates a private artifact containing the checkpoint, candidate-verification, prompt/cost, and local MCP runtimes, skill resources, pinned installed runtime dependencies, licenses, and a SHA-256 file inventory. The target must not exist. No package installation, release, or network call is performed. Inspect it with `node scripts/capabilities.mjs --mode runtime --root /absolute/new-directory`. This artifact does not install host hooks or certify native-host behavior.

The verifier, check policy and CI workflows are reviewed repository configuration. CI re-executes checks instead of trusting a copied local receipt; it does not protect against malicious changes approved into that configuration. Tracked audit handoffs record assessor conclusions and source identity, not cryptographic proof of the assessor’s identity.
