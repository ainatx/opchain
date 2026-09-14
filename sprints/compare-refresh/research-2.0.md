# Comparison integration: Opchain 2.0

Reviewed September 13, 2026. Implementation baseline: `e20acc8` in the 2.0 worktree. This supplements the source 1.9.1 review in `research.md`; it does not rewrite historical evidence.

## Import and color decisions

All ten handoff source files matched their recorded SHA-256 hashes before import. The implementation, tests and original research are preserved. The shared Slate and Emerald palette was already installed; no global tokens were replaced. The page now uses readable text on the tinted Opchain column, including notes and citations. Muted explanatory text remains on ordinary cells. Source references grew from 39 to 42 to cite Hindsight, Evolve and the current Bug Check enrollment contract.

## Review of every Opchain dimension

| Dimension | 2.0 evidence and resulting claim |
|---|---|
| What you get | `skills/`, `site/src/pages/install.astro`: development and operations skills plus a bundled local runtime, executed through an existing host. |
| Where instructions live | Install guide: complete SKILL.md folders include references, scripts and kits. No instruction-only installation is equated with execution. |
| Session persistence | `skills/oc-checkpoint-protocol/SKILL.md`: shared repository JSON state; resuming still needs host retrieval. |
| Adding workflows | Install guide: editable skill folders and supporting files. |
| Development workflow | App Architect and Deploy Ops protocols: discovery, build, audit, deployment and monitoring through explicit handoffs. |
| AI applications | Local skill catalog includes model, RAG, agent and prompt-evaluation workflows and their execution kits. |
| Agent roles | App Architect's evaluator still shares a session. Hindsight/Evolve request separate contexts, but runtime code cannot spawn or authenticate independent model runs; host support is necessary. |
| Gates | `skills/oc-bug-check/SKILL.md` commit gate contract and Deploy Ops pre-deploy gate: explicit Git enrollment and immutable candidate receipts. This repository's deploy command requires evidence; other projects need an equivalent boundary. The Bug Check page is the direct citation because the older Git Ops overview does not explain enrollment adequately. |
| Learning | `skills/oc-hindsight/SKILL.md`, `skills/oc-evolve/SKILL.md` and `scripts/runtime/{learning,evaluation,evolve}.mjs`: opt-in lessons and task-evaluated rules require signed external approval. Explicit context retrieval returns advisory JSON. Auto-injection needs separate host setup. Synthetic runs cannot authorize adoption; the live flag alone does not prove model execution or evaluator independence. |
| Multiple projects | Orchestrator registry: rolls up last-recorded project checkpoint status. |
| Price | Root Apache-2.0 LICENSE: software is free; model, host and infrastructure usage are separate. |
| Portability | Install guide: editable files, but hooks, tools and execution depend on the chosen host. |
| Runtime surfaces | Install guide and packaged runtime: Claude Code, Codex and supported skill/MCP hosts; local execution requires Node.js 22.13+ and filesystem access. No hosted execution parity claim. |

The public methodology now describes the 2.0 skills and packaged runtime without presenting release acceptance or observed model improvement as completed. It explains default-off learning, explicit retrieval, signed adoption and the absence of comparative benchmarks. This is consistent with the release workstream's finished launch presentation while preserving the internal production deployment block.

## External freshness check

The source documentation review and this integration occurred on September 13, so the displayed review date stays September 13. All 32 external citation URLs were rechecked: 31 direct HTTP 200 responses, with Devin pricing returning 429 to direct requests but successfully retrieved through web browsing. All ten internal citations exist in the production build. See `docs/releases/evidence/2.0-comparison-links.json` for retrieval hashes and timestamps. URL retrieval is not a new benchmark or exhaustive hands-on product evaluation.

The six cited pricing pages were re-read. Claude Pro remains $20 monthly and Max starts at $100; Codex Free/Plus $20/Pro from $100 remain accurate; Cursor Pro $20 and Teams $40 per user remain accurate; Copilot Free/Pro $10/Pro+ $39/Max $100 remain accurate, with Business $19 and Enterprise $39; Devin Free/Pro $20/Max $200 and Teams $80 plus $40 per full developer seat remain accurate. Antigravity advertises a free tier, AI Pro/Ultra quotas and Google Cloud organization consumption pricing. Temporary promotions and regional prices are not represented as permanent list prices. Copilot Memory remains a paid-plan public preview.

Primary links: [Claude](https://claude.com/pricing), [Codex](https://learn.chatgpt.com/docs/pricing), [Cursor](https://cursor.com/pricing), [Copilot](https://github.com/features/copilot/plans), [Copilot business pricing](https://github.com/features/copilot), [Devin](https://devin.ai/pricing), [Antigravity](https://antigravity.google/pricing), [Copilot Memory](https://docs.github.com/en/copilot/concepts/agents/copilot-memory).

The competitive inference is unchanged: retained context and reusable skills are common. Compound Engineering already retains solutions. Opchain should describe evidence requirements and controlled adoption precisely, and must not claim proven superiority or automatic learning activation.
