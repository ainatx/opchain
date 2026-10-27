# Checkpoints

Living **session state docs** for opchain skills. One JSON file per skill:

```
.checkpoints/
├── README.md                          ← you are here
├── oc-orchestrator.checkpoint.json
├── oc-ux-engineer.checkpoint.json
├── oc-app-architect.checkpoint.json
└── oc-git-ops.checkpoint.json
```

Each file is a snapshot of where that skill left off — what was decided,
what's pending, what would need to be redone if the session ended.

## Why tracked in git

The original `oc-checkpoint-protocol` spec said `.checkpoints/` should be
gitignored — fine for a local dev box, broken for Claude Code on the web
where the worker is ephemeral. Tracking them in git means:

- A new session on a new machine can resume by reading these files.
- Reviewers see the "thinking" state in PRs alongside the code change.
- `npm run checkpoint:status` is the canonical "where did I leave off?" command.

These are docs, not strict protocol artifacts — keep them readable, keep
them honest, don't sweat the byte budget.

### Exception: oc-bug-check

`oc-bug-check.checkpoint.json` is **gitignored, not tracked.** Bug-check
has no resumable state by design — its SKILL.md says it "always runs
fresh — no continue/restart prompt." Every `/oc-bugcheck` invocation
rewrites `updated_at`, `step`, `progress_summary`, `last_run.*`,
`run_history`, and `streak`, which used to generate 2-3 spurious merge
conflicts per PR. The pre-commit hook reads the file locally and
handles the missing-file case by prompting `/oc-bugcheck run` before the
first commit on a fresh clone.

## Schema (loose, validated in CI)

| Field | Required | Type | Notes |
|---|:-:|---|---|
| `protocol_version` | ✓ | `"1.0"` \| `"1.1"` | On-disk wire format. `1.1` (v1.6) added `cost`/`eval_scores`/`telemetry_handle`; both validate, new writes stamp `1.1`. |
| `skill` | ✓ | string | Must match the filename: `<skill>.checkpoint.json`. |
| `project` | ✓ | string | Human-readable project name. |
| `project_dir` | ✓ | string | Absolute path to the project. |
| `created_at` | ✓ | ISO-8601 (`Z` or `±hh:mm`) | Don't change once set. |
| `updated_at` | ✓ | ISO-8601 (`Z` or `±hh:mm`) | `Date.toISOString()` on every write. |
| `phase` | ✓ | string | Skill-defined. Checked against the skill's declaration when `skills/<skill>/SKILL.md` is present — see *Write rules*. |
| `step` | ✓ | string | Skill-defined, free text; a single token (`sprint-2-eval-round-1`) — whitespace draws a warning. |
| `status` | ✓ | enum | `in_progress \| blocked \| complete \| failed` |
| `progress_summary` | ✓ | string | One-paragraph human-readable. |
| `progress_table` |   | array | Ordered list of `{ id, label, status }`. |
| `context_primer` |   | object | `{ key_decisions[], generated_files[], user_preferences[] }` |
| `blockers` |   | array | `{ id, description, blocking, needs, proposed_resolution }` |
| `next_actions` |   | string[] | Ordered, the next session reads `[0]` first. |
| `pm_refs` |   | array | `{ provider, id, role?, url? }` — PM tickets touched (skill release 1.2+). |
| `cost` |   | object | `{ total_usd?, budget_usd?, by_phase?, by_model?, currency? }` — LLM spend attribution + budget ceiling (oc-cost-ops, wire 1.1+). |
| `eval_scores` |   | array | `{ rubric, score, max?, at?, dimensions? }[]` — eval scores vs a stable rubric (oc-bug-check / oc-code-auditor / oc-prompt-ops, wire 1.1+). |
| `telemetry_handle` |   | string \| object | Opt-in local-metering link `{ enabled, id?, sink?, since? }` — default OFF (oc-telemetry-ops, wire 1.1+). |
| `handoffs` |   | array | C-contract typed handoffs (`src/lib/mcp/checkpoint-contract.js`). The `verification.verdict` entries are what `scripts/lib/release-evidence.mjs` reads at the deploy gate — write them with `checkpoint handoff`, never by hand. The PR-stage verdicts (`pr-docs-v1`, `pr-readiness-v1`) live in the [handoff store](#handoff-store-checkpointshandoffs) instead; entries an older binder appended here are still accepted. `acceptance.checks` entries carry a build sprint's acceptance-check ids and statuses (`checkpoint acceptance`), one per sprint, for readers outside the build loop. |
| `skill_state` |   | object | Freeform — private to the owning skill. |

Validation runs in CI via `npm run checkpoint:validate`. The validator is
`scripts/checkpoint.mjs` — pure Node, no deps. It enforces required
fields + the `status` enum + filename-skill consistency.

## Tooling

```bash
# Where did I leave off? (full summary; --brief = just the top action + blockers)
npm run checkpoint:status
node scripts/checkpoint.mjs status <skill>   # one checkpoint; exits 1 when it does not exist
node scripts/checkpoint.mjs status --brief

# What should I do RIGHT NOW? (priority engine — no oc-orchestrator registry needed)
node scripts/checkpoint.mjs next

# Is any checkpoint drifting from reality? (git history + filesystem cross-check)
node scripts/checkpoint.mjs doctor          # add --online to compare /api/health vs HEAD

# Validate every .checkpoint.json against the schema (CI runs this).
npm run checkpoint:validate                 # --strict also fails on warnings

# Update a field (creates the file if missing); done = complete the top next action.
node scripts/checkpoint.mjs update <skill> --status=in_progress --step=...
#   --key=value replaces · --key+=value appends · --key:json=… parses JSON.
#   + and :json combine in either order (--key:json+=…); an append adds ONE element.
#   Creating a file REQUIRES --next_actions:json='["<first real action>"]' (see Write rules).
node scripts/checkpoint.mjs done <skill>

# Bind a verification.verdict handoff to the current candidate — the one binder for
# the evidence the pre-PR / pre-deploy gates read. No hand-written handoff JSON.
node scripts/checkpoint.mjs handoff oc-docs-forge --policy pr-docs-v1 --verdict PASS \
  --scope "README + CHANGELOG refreshed for #601" --evidence skills/README.md
#   policies: pr-docs-v1 (oc-docs-forge) · pr-readiness-v1 (oc-repo-ops) ·
#             pre-deploy-code-audit-v1 (oc-code-auditor) · pre-deploy-security-posture-v1 (oc-security-auditor)
#   The candidate is HEAD's git_tree_projection (tree minus .checkpoints/), exactly what
#   `node scripts/lib/release-evidence.mjs --print-candidate --json` prints. pr-docs-v1 and
#   pr-readiness-v1 go to .checkpoints/handoffs/<policy>/<branch>.json (re-binding on the
#   branch overwrites that file); the others into the skill's checkpoint, where re-binding
#   the same candidate replaces the earlier entry. --json prints the handoff, candidate and file.

# The release PR prunes the store: every handoff file not bound to its own candidate goes.
node scripts/checkpoint.mjs prune-handoffs [--dry-run] [--json]
```

Every subcommand is also reachable as `npm run checkpoint -- <command> ...`.

## Write rules the validator enforces

- **No scaffold filler.** `update` on a missing file used to scaffold
  `"Define the first real next action for this skill."` into `next_actions`, and it
  validated — oc-security-auditor shipped that sentence on `main` from v2.0.0 to
  v2.0.4 and the plugin's next-suggestion hook re-advertised it. Now: creating a
  file requires `--next_actions:json='["…"]'` (or `--next_actions=…`), and the
  sentence is a validation **error** anywhere except an untouched scaffold
  (`phase: init`, `step: scaffolded`). `doctor` flags scaffolds that still carry it.
- **Phase allowlist (authoring repo only).** When `skills/<skill>/SKILL.md` exists:
  - `checkpoint_phases: [...]` in its frontmatter → **strict**: an undeclared `phase`
    is an error and the message lists the allowed ids. Declare it per skill to turn
    the check on (I-09: `master-2-workstreams` passed validation unchallenged).
  - only `phases: [...]` (the pipeline taxonomy `foundation|plan|build|ai-native`, not
    the checkpoint vocabulary) → **advisory**: a `phase` outside `phases:` plus the
    `"phase": "…"` / `--phase=…` examples in the SKILL.md body is a warning. 16 of
    17 tracked checkpoints were outside `phases:` when this landed, so it is not an
    error.
  - no SKILL.md (a consumer repo) → no check.
  `step` stays free text; whitespace in it is a warning.

### Status glyphs (canonical legend)

One vocabulary, used by `checkpoint` output and the oc-orchestrator alike:

| Glyph | Meaning |
|---|---|
| ✅ | complete |
| 🔄 | in_progress |
| ⏳ | not_started |
| 🚫 | blocked (has an open blocker) |
| ⛔ | a decision is waiting on **you** (`blockers[].needs: user_decision`) |
| ⚠ | stale / drift (untouched >7 days while in_progress, >14 while complete, >3 while blocked) |

## Handoff store (`.checkpoints/handoffs/`)

The PR-stage verdicts — `pr-docs-v1` (oc-docs-forge) and `pr-readiness-v1`
(oc-repo-ops) — are one file per branch, not entries in a shared checkpoint:

```
.checkpoints/handoffs/<policy>/<branch>.json     # e.g. handoffs/pr-docs-v1/claude/fix-x.json
```

Each file is one `verification.verdict` object, the same shape `handoffs[]` holds.
Until 2026-10-27 every pull request appended its two verdicts to
`oc-docs-forge.checkpoint.json` and `oc-repo-ops.checkpoint.json`, so merging any PR
made every open sibling conflict with no code overlap (deftwright-site #260/#261,
three times in an hour). Branches never share a file name, so concurrent PRs only
ever add different paths and merge in either order, through GitHub's buttons too
(the merge driver below never runs there). A rebase or a merge from `main` changes
the tree projection, so the branch rebinds; that rewrites its own two files.

- **Writer.** `checkpoint handoff` (above). A ref name is used as the path as is
  (`claude/x` nests a directory); a detached HEAD binds `detached/<commit>.json`. A
  store binding never touches the skill's checkpoint — no `handoffs[]` entry, no
  `skill_state.verified_for_sha`; `--phase`/`--step`/`--summary` are ignored with a
  note.
- **Reader.** `release-evidence --stage pr` reads the store first. Two files bound to
  the same candidate (two checkpoint-only PRs) are decided by the later
  `verified_at`. When the store has nothing for the candidate, the skill's
  checkpoint `handoffs[]` is read as before, so evidence an older binder wrote still
  passes. The checkpoint-hygiene Stop hook accepts a store file the same way.
- **When the binder still writes the checkpoint.** Only when the gate that will
  judge the PR cannot read the store: the reader the binder resolved does not
  advertise `handoff_store` in `--print-candidate --json`, or the base branch's copy
  of that reader (`origin/main`, else `origin/HEAD`, else `main`) predates the
  layout. A consumer's `opchain-evidence.yml` runs the base branch's
  `.opchain/runtime/`, so the PR that vendors a store-reading runtime binds into the
  checkpoints and the PR after it uses the store. Consumers pick this up on their
  next `.opchain/runtime/` update (`/oc-enroll --ci --force`).
- **Pruning.** The binder never deletes another branch's file: the same deletions in
  every open PR can pair with each one's added file as competing renames. Instead
  the release PR runs `checkpoint prune-handoffs`, which deletes every store file not
  bound to its own candidate (merged PRs' evidence stays in git history). One PR
  prunes at a time; between releases the store grows by one file per policy per
  merged PR.

## Merge driver

`.gitattributes` maps every `<skill>.checkpoint.json` to a custom merge
driver (`scripts/merge-checkpoint.mjs`) that auto-resolves telemetry-only
conflicts. Two PRs that both ran `/oc-bugcheck` will bump `updated_at` and
`skill_state.last_run.at` to different "now" values; the driver picks
the side with the newer `updated_at` for those fields and only raises a
real conflict on substantive content (`progress_summary`, `next_actions`,
`progress_table`, etc.). The driver is registered per-clone by
`npm prepare`, so `npm install` is the only setup step.

> ⚠️ **The driver runs on local `git merge` only.** GitHub's server-side
> "Update branch" / auto-merge buttons do **not** invoke it, so a checkpoint
> conflict resolved there can ship invalid JSON and fail CI (this happened on
> 2026-05-15). If two PRs both touch a checkpoint, resolve it with a local
> `git merge` (driver runs), and always `npm run checkpoint:validate` before
> pushing. Rotating volatile `skill_state` telemetry into
> `.checkpoints/history/` keeps the conflict surface small in the first place.

## Stop hook: checkpoint hygiene

`.claude/hooks/checkpoint-hygiene.sh` (registered in `.claude/settings.json` as
`"$CLAUDE_PROJECT_DIR/.claude/hooks/checkpoint-hygiene.sh"`, 30s timeout) blocks a
session from ending when an oc-* skill was invoked and no current-run checkpoint
exists. After the 2026-10-08 effectiveness audit (I-06) it is scoped:

- **Repo resolution.** `PROJECT_DIR` is `$CLAUDE_PROJECT_DIR`; without it, the git
  toplevel of the Stop event's cwd, enforced only when that is the checkout the hook
  ships in. A drifted shell cwd never pulls in another checkout.
- **Per-repository attribution.** Every tool call after a skill's invocation is
  attributed to the git repositories it touched: a Write/Edit/MultiEdit/NotebookEdit
  `file_path`, or a Bash `cd`/`pushd <dir>`, `git -C <dir>` or `OPCHAIN_ROOT=<dir>`
  target. Bash commands are walked with a running cwd (`cd ~/x && git -C . status`
  targets `~/x`); `~`, `$HOME` and `$PWD` expand, and any other variable or
  substitution is dropped rather than resolved against the session cwd. A skill is
  enforced only when one of its repositories is `PROJECT_DIR`, so Deftwright work
  done from an opchain worktree never blocks (including `cd ~/deftwright-…`, which
  blocked until 2026-10-22 because `~` resolved against the cwd).
- **Current-run evidence, in any repository the skill worked in.**
  `record_updated_at`/`updated_at` at or after the invocation. Gate skills
  (`oc-bug-check`, `oc-docs-forge`, `oc-repo-ops`) are also satisfied by a
  `verification.verdict` PASS bound to that repository's current candidate (what
  `checkpoint handoff` writes: a [handoff store](#handoff-store-checkpointshandoffs)
  file, or a `handoffs[]` entry), or — when the candidate cannot be
  computed — by a checkpoint mtime newer than the invocation. Evidence in another
  repository the skill touched satisfies the hook here, and the block reason names
  those repositories; the hook never asks for a checkpoint in a repository the
  skill did not touch.
- **One-shot decline.** The same missing skill set blocks at most twice per session;
  the third Stop prints one stderr note and exits 0. Counts live in
  `$TMPDIR/opchain-hygiene-<session_id>.json`.
- **Incremental.** The same marker caches the transcript byte offset; only the new
  tail is parsed on each Stop.
- **The block reason carries the exact CLI**, including
  `--next_actions:json='["…"]'` and the `handoff` verb for gate skills.

Exempt (owe no tracked current-run checkpoint): oc-orchestrator,
oc-checkpoint-protocol, oc-update, oc-telemetry-ops. Tests:
`tests/checkpoint-hygiene.test.js` (fixture transcripts, fake `$CLAUDE_PROJECT_DIR`).

## Resume protocol (informal)

When starting a new session on this repo:

1. `npm run checkpoint:status` — see where every skill left off.
2. Pick the skill with `status: in_progress` (or the most recent `updated_at`).
3. Read its `next_actions[0]` and start there.
4. Read `context_primer.key_decisions` to load context without re-reading the codebase.

That's the whole protocol. Skills don't auto-write; the assistant updates
the relevant file at sensible inflection points (after a PR merges, after
a phase completes, when blocked).
