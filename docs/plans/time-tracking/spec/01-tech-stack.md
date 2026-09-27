# 01 — Tech Stack

Decided with the oc-stack-forge decision tree (platform → backend → database →
auth → frontend), collapsed because this is a local CLI:

| Layer | Choice | Why |
|---|---|---|
| Platform | Local CLI, runs on the dev laptop | Transcripts and git live there; v1 is no-network by requirement |
| Runtime | **Node 24, ESM `.mjs`, zero dependencies** | Matches `scripts/telemetry.mjs` / `scripts/checkpoint.mjs`; graduates into a skill runtime without a dependency review |
| Storage | **Append-only JSONL event log** + derived views | Audit-ready by construction (every draft/edit/approve is an event), diffable, trivially backed up; recomputable state. SQLite (`node:sqlite`) rejected for the ledger — mutable rows hide history, and billing needs history |
| Config | `~/.opchain/time/<client>/billing.yaml`, read with a small YAML-subset parser (the same approach as `scripts/lib/pm-mcp-checks.mjs` `parsePmYaml`), plus `registry.json` | Kept outside the repo so it survives deleting the clone and never reaches a client's git history. This is a deliberate exception to the in-repo `.opchain/*.yaml` convention |
| Inputs | Claude Code transcripts `~/.claude/projects/**/*.jsonl`, `git log`, `gh` optional | All already local |
| Auth | None | Single user, local files, OS permissions |
| Frontend | Markdown timesheet + terminal; optional artifact later | Review happens in Claude Code |
| Tests | Vitest (repo default) with golden transcript fixtures | See `06-testing.md` |

Reused, not re-invented:

- Transcript discovery by `cwd`, including `<session>/subagents/*.jsonl`, and **global** de-duplication: `message.id` for cost (max per field) and `uuid` for events —
  the lessons in `reports/token-usage/generate.py` (the 13× over-count bug).
  Ported to JS as `scripts/lib/time/transcripts.mjs`; the Python report is not
  imported.
- Price table: `scripts/lib/time/pricing.json`, keyed by model-family prefix, with the cache multipliers from `generate.py` and `verified_on`/`source` on each row. It is filled from Anthropic's published prices for **every model in the corpus**. The oc-cost-ops and oc-claude-api snapshots have no Claude 5-family rows, so they can't be the source;
  unknown models are **flagged unpriced**, never guessed.
