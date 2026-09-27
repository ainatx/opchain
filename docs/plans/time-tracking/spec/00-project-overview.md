# 00 — Project Overview: opchain billable time tracking

> Name **`oc-time-ops`** (verb `/oc-time`). Status: spec-gate decisions folded in 2026-09-26.
> Discovery approved 2026-09-26. Inspiration: OpenCase legal time tracking
> (<https://www.opencase.com/features/legal-time-tracking>) — "every proposed
> entry is a draft", grouped by client and matter, captured as work happens.

## Problem

You do client work in client repos with Claude Code + opchain skills. At the end
of a day there is no honest answer to "how many hours do I bill ACME for today,
and for what?" The raw facts exist — every Claude Code transcript line carries a
timestamp, `cwd`, `gitBranch` and (for assistant turns) token usage — but nothing
turns them into a timesheet. Reconstructing from memory under-bills (forgotten
work) or over-bills (agent runtime you weren't present for).

## Pitch

A local, zero-dependency tool that reads what already happened in a repo — your
prompts, the skills that ran, commits and PRs, tokens spent — and drafts a daily
timesheet per client and matter. You approve, edit or discard each entry. Only
approved entries export.

## Persona

**Solo consultant/developer (you), dogfood.** Several client repos, often several
parallel Claude Code sessions (worktrees) at once. Bills hourly in 0.25h units,
wants AI compute shown as a separate pass-through line, needs a CSV to import
into whatever invoicing tool the client relationship uses.

Anti-goals for this persona: surveillance of other people, team rollups,
per-person rates, live invoicing.

## Scope

### v1 (dogfood — this plan)

| # | Capability |
|---|---|
| F1 | **Repo → client** through `~/.opchain/time/registry.json`, with `~/.opchain/time/<client>/billing.yaml` holding the rate and rules. **Matters** are resolved from `pm_refs`, then PR links, then branch rules, then the default |
| F2 | **Engaged-time derivation**: session blocks that contain a real human event (hook-captured prompt or classified transcript line), agent and subagent runtime included, split at 10-min idle gaps and at midnight, agent-only tail capped at 30 min. Unioned across **all** projects, so nothing is billed twice and unregistered work never becomes client time |
| F3 | **AI cost pass-through** per client-day from session **and subagent** token usage: `message.id` de-duplicated globally, family-prefix pricing with cache multipliers, unpriced share shown and blocking approval |
| F4 | **Draft entries** per client × matter × day, 0.25h increments, rounded once per client-day by default (`rounding_scope`), with the rounding added shown on each entry |
| F5 | **Narratives drafted from local activity** — commits, PR numbers, skills run, files touched — never prompt text |
| F6 | **Review workflow** — approve / edit / discard; append-only audit log; approved entries immutable (revisions, not overwrites) |
| F7 | **Outputs**: `timesheets/YYYY-MM-DD.md` (gitignored), CSV export of approved entries, and a SessionStart `systemMessage` that you see and the model doesn't, showing the current client only |
| F8 | **Manual entries** (`add`) for work with no local transcript, such as claude.ai/code or cloud sessions |

### v2 (after dogfood + OSS-split freeze lifts)

- Graduate to `skills/oc-time-ops` + plugin hook (see `07-devops.md`).
- API export: Clio, Harvest, Toggl via oc-integrations-engineer.
- More hook-captured engagement signals, such as permission approvals and `Notification` waits. v1 already captures prompts through UserPromptSubmit.
- Weekly/monthly rollups, invoice-period close.

### Explicitly out

Teams/multi-user, per-person rates, invoicing/payments, anything leaving the machine in v1.

## Success metrics (dogfood, 2 weeks)

1. **Accuracy:** in a weekly `spotcheck`, at least 8 of 10 sampled approved entries are supported by their raw git and transcript evidence without adjustment. This replaces the draft-vs-approved drift measure, which rewarded anchoring to the draft.
2. **Effort:** daily review takes ≤ 3 minutes.
3. **Coverage:** zero days where you did client work and the tool drafted nothing, *for local sessions*. Cloud and web sessions are covered by `add`; `verify` can't detect them.
5. **Parser health:** the format canary stays under 1% unknown or quarantined lines on every day.
4. **No double billing:** overlapping sessions never yield more billed minutes than wall-clock minutes (enforced by test + a `verify` invariant).

## Constraints

- **OSS-split path freeze (D-H / C1):** no edits under `skills/ plugins/ .claude-plugin/ mcp/ server.json src/lib/mcp` until C2–C7 complete. v1 lives in `scripts/`, `tests/`, `docs/`.
- Local-only, no network in v1. Node 24 built-ins only.
- Billing data never lands in a client's git history. Everything except the gitignored `timesheets/` lives under `~/.opchain/time/`.
- The Claude Code transcript format is internal and changes over time. Parsing is defensive and watched by a format canary (02 → *Event classification*).

## Not applicable (spec set)

`05-monetization` (internal tool), `08-analytics` (no product analytics — and
billing data must never flow into oc-telemetry-ops), `10-cost-estimate` (no
infra; runtime cost is a few seconds of local CPU), `11-ai-architecture` (no
model API calls — narrative refinement happens inside your own Claude Code
session).

## Open questions for the spec gate

Resolved: see `02-architecture.md` → *Spec-gate decisions*.
