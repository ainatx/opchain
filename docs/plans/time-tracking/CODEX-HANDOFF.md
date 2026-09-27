# Build handoff: oc-time-ops (for Codex)

You're building a local, zero-dependency Node CLI that drafts a **daily billable
timesheet per client** from Claude Code session transcripts. The drafts are
approved by a human before anything exports. Planning is finished and approved;
this document is your entry point. Build the three sprints in order, one PR per
sprint.

## Read these first, in order

1. `sprints/sprint-plan.md`: what each sprint delivers, its tests and its definition of done
2. `design/punch-list.md`: **the scope**. If it isn't listed, don't build it
3. `spec/02-architecture.md`: algorithms, data model, CLI surface (P# marks an audit fix)
4. `spec/06-testing.md`: fixtures #1–#19; every one must exist and pass
5. `design/surfaces.md`: exact output formats, glyphs and exit codes
6. `audit-2026-09-26.md`: *why* the classifier, de-duplication and subagent rules look the way they do. Read it before you "simplify" any of them.
7. `spec/03-security-privacy.md`: the invariants you must not break

## Hard rules

| Rule | Why |
|---|---|
| Write only under `scripts/timesheet.mjs`, `scripts/lib/time/`, `tests/time/`, `docs/plans/time-tracking/`, `docs/runbooks/time-tracking.md`, and add **one** `package.json` script (`timesheet`) | An OSS-split path freeze covers `skills/ plugins/ .claude-plugin/ mcp/ server.json src/lib/mcp`. Touching them blocks the PR |
| **Zero npm dependencies.** Node 24 built-ins, ESM `.mjs` | It graduates into a skill runtime later |
| **Never store prompt text** anywhere: cache, ledger, Markdown, CSV or the hook log | Client confidentiality. Fixture #17 enforces it with a canary string |
| **Never guess model prices.** `pricing.json` rows need `verified_on` and a `source` URL. Leave a row out rather than invent it, and let `unpriced_share` surface the gap | Billing integrity. A human verifies the prices before the Sprint 2 DoD |
| **Never edit `~/.claude/settings.json`** or install hooks. Document the snippet in the README | A human installs hooks by choice |
| Everything writes under `~/.opchain/time/`, overridable with `OPCHAIN_TIME_HOME`. **Tests must set that override and a temp `HOME`**, and must never read the real `~/.claude/projects` | Tests stay hermetic and never touch real billing data |
| The ledger is append-only. Approved entries change only through `amend` | Audit trail |
| Hooks (`hook prompt`, `nudge`) **always exit 0** and never print to stdout except `nudge`'s JSON | A billing bug must never block a Claude Code session |

## Transcript facts (measured, don't re-derive)

These come from the audit's replay of 3,375 real files and 367k lines:

- **Subagent layout:** subagent transcripts are separate files at `~/.claude/projects/<proj>/<session>/subagents/*.jsonl`. Main files contain **no** `isSidechain` lines.
- **Human prompts:**
  - `origin.kind:"human"` is also set on `<scheduled-task>`, `<ci-monitor-event>` and system-reminder-only messages.
  - The machine envelopes win over `origin` (02 → *Event classification*).
  - Some lines have no `origin` at all, from older clients.
- **Duplicates:** resumed and forked sessions copy lines into new files, so de-duplicate `uuid` (events) and `message.id` (cost) **globally**, taking the max of each usage field for cost.
- **Ordering and cwd:** files aren't always in timestamp order, `cwd` changes within a session, and `gitBranch` can be `"HEAD"`.
- **Queued prompts:** `queue-operation` lines (`enqueue`, `dequeue`, `remove`) mark prompts typed while the agent was busy.
- **Models seen:** `claude-opus-5`, `claude-opus-5-5`, `claude-sonnet-5`, `claude-fable-5`, `claude-fable-5-1`, `claude-opus-4-8`, `claude-haiku-4-5-20251001`, and `<synthetic>` (skip it).
- **Timestamps:** the `attachment`, `system`, `pr-link` and `file-history-*` entry types carry timestamps but must **not** extend engaged-time blocks.

Build the fixtures from these shapes with synthetic content. Don't copy real transcripts into the repo.

## Repo conventions

- Tests use Vitest (`tests/**/*.test.{js,mjs}`); put yours under `tests/time/`. Keep the unit suite under 2 s. No snapshot tests; use explicit golden files.
- Match the style of `scripts/telemetry.mjs` and `scripts/checkpoint.mjs`: plain ESM, small pure functions, and a CLI that dispatches verbs.
- `reports/token-usage/generate.py` has the proven cost formula (`entry_cost`, cache multipliers) and discovery logic. Port the logic; don't import Python.
- The YAML subset parser can follow `scripts/lib/pm-mcp-checks.mjs` `parsePmYaml`.

## Landing a PR in this repo

The mechanics are unusual, so follow them exactly:

1. Rebase on current `origin/main` and run `npm ci` so `node_modules` matches the branch lockfile.
2. Commit the content. The pre-commit verifier runs the gate, and **AI authors don't add `Signed-off-by`**. Add `Co-Authored-By:` for AI assistance.
3. Add a second, checkpoint-only commit with `verification.verdict` handoffs:
   - one in `.checkpoints/oc-docs-forge.checkpoint.json` with policy `pr-docs-v1`
   - one in `.checkpoints/oc-repo-ops.checkpoint.json` with policy `pr-readiness-v1`

   Their `candidate` must be the output of `node scripts/lib/release-evidence.mjs --print-candidate --json`. CI's `npm run evidence:pr` fails without them. Copy the shape of the existing handoffs in those files.
4. Open the PR. A **human** squash-merges it with a `Signed-off-by` trailer.

## Definition-of-done items you can't run

| Item | Who |
|---|---|
| **Corpus replay** in the S1 and S2 DoD: runs on the owner's machine against the real `~/.claude/projects` | Owner. Ship `collect --report` and `draft --since` so it's one command, and list the exact command in the PR body |
| **Price verification** in the S2 DoD | Owner. Leave any row you can't source out of `pricing.json` |
| **Dogfood day** in the S3 DoD | Owner |

Mark these items **pending owner** in the PR body. Don't claim them as done.

## Checkpoint

The planning state lives in `.checkpoints/oc-app-architect.checkpoint.json`
(`context_primer.key_decisions`, entries dated 2026-09-26). After each sprint,
append a key decision with the sprint result and update the `time-tracking:`
entry in `next_actions`. Leave the v2.0 fields (`phase`, `step`,
`progress_table`) alone; they belong to a different workstream.
