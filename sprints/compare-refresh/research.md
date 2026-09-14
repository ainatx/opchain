# Compare-page research — September 13, 2026

## Editorial decision

The prior page compared opchain mainly to agent products and editors. Its repeated winner labels rested on distinctions that no longer hold: editable instructions, persistent context and multi-agent work are broadly available. This refresh compares mechanisms and dependencies rather than assigning a score without benchmarks.

The catalog contains 13 products and 13 dimensions (169 entries). Six workflow alternatives are the closest functional comparisons; six agent products show the execution environments people may combine with those workflows. This is a relevance-based shortlist, not a claim about market share. Standalone VS Code/Zed columns were retired because editor hosting is already represented by the agents. Hosted app generators and general chat/search products are outside this page's delivery-workflow focus.

## Current-source corrections

- [Compound Engineering](https://github.com/EveryInc/compound-engineering-plugin#the-loop) directly overlaps the planned learning story. Positioning for 2.0 should explain evaluation, promotion and adoption mechanics, rather than claiming that recording lessons is new.
- [Superpowers](https://github.com/obra/superpowers#the-basic-workflow) is a close implementation/review alternative, not just a collection of prompts.
- [BMAD](https://github.com/bmad-code-org/BMAD-METHOD) now documents an adaptive delivery loop. Older descriptions that reduce it to fixed role prompts miss its current offering.
- [GSD's former repository](https://github.com/gsd-build/get-shit-done) is archived and points to [GSD Core](https://github.com/open-gsd/gsd-core). The comparison uses the active project.
- [Spec Kit](https://github.com/github/spec-kit) documents implementation convergence and extensions; [OpenSpec](https://github.com/Fission-AI/OpenSpec) documents shared stores in beta. Neither should be dismissed as single-session planning prompts.
- [Claude Code](https://code.claude.com/docs/en/overview), [Cursor](https://cursor.com/docs/agent/agents-window) and [Codex](https://learn.chatgpt.com/docs/agent-configuration/subagents) document substantial orchestration capabilities. Avoid autocomplete-only framing.
- [Copilot Memory](https://docs.github.com/en/copilot/concepts/agents/copilot-memory) is explicitly a paid-plan public preview; both memory rows carry that qualification.

## opchain grounding

The current checkout is the shipped 1.9.1 site baseline at `f5e4b2a`. Its skill files, installation page, plugin README and Apache-2.0 LICENSE are the primary evidence for its column. The App Architect protocol explicitly runs its evaluator in the same session; the site must not imply automatic context isolation. Deployment instructions alone are not universal mechanical enforcement. Host/MCP access is not parity with local filesystem execution.

The public GitHub product overview returned a stale cached snapshot (older skill count and MIT text). It was not used to override the local shipped artifacts. The table cites the served skill pages and `/LICENSE`, which the existing site already exposes. The 2.0 plan is context for the new retained-learning dimension, not evidence of shipped functionality.

## Evidence and maintenance

`site/src/data/comparison.ts` is the claim-to-source map: every value/note has source IDs; those IDs resolve to a numbered title and URL. The same module drives initial HTML and interactive rendering. All sources were read through official documentation or maintainer repositories; technical claims do not rely on third-party rankings. Statements about scope or absence are explicitly editorial readings of those documents.

The source set contains 39 links: seven internal product/license routes and 32 external pages. A subsequent direct GET check returned 200 for 31 external pages; Devin pricing returned 429 to that checker after its contents had already been retrieved successfully through web browsing. Rate limiting is recorded, not treated as evidence that the page is missing. See `link-check.json` for the transport results.

Future refreshes must re-read feature and price sources before advancing the review date. Check both presets, the less-prominent optional products, and the shipped opchain version. New product claims need citations; arbitrary GitHub stars or vendor adoption numbers should not be substituted for a controlled comparison.
