# 04 — Integrations

| Integration | v1 | v2 |
|---|---|---|
| Claude Code transcripts | **Read** (`~/.claude/projects/**/*.jsonl`) | Same, plus hook-captured signals |
| Claude Code hooks | User-level **`UserPromptSubmit` → `timesheet hook prompt`**: the primary human-event signal, which stores a timestamp, session and cwd and never prompt text. User-level **`SessionStart` → `timesheet nudge`**: prints `{"systemMessage":…}` from the cache or nothing. Both are time-boxed (50 ms and 500 ms) and always exit 0 | Plugin hooks in `plugins/opchain/hooks/hooks.json` once the freeze lifts; optional `Notification` hook for permission-wait signals |
| git | `git log --since/--until --author=<you>` per repo, per branch | — |
| GitHub (`gh`) | Optional: PR titles for narratives; skipped silently if `gh` is absent | — |
| opchain checkpoints | Read `pm_refs[]` for ticket → matter mapping, precedence 1 | — |
| Transcript `pr-link` entries | PR → branch and title → ticket, precedence 2. `gh pr view` is used when available | — |
| Invoicing | **CSV only** (Clio, Harvest, Toggl and QuickBooks can all import CSV) | API push through oc-integrations-engineer. Clio: activities endpoint. Harvest: time entries. Toggl: time entries. Idempotency key = `entry_id:revision` |

No network calls in v1. Failure policy: if an optional source is missing (no
`gh`, no checkpoint), the narrative has less detail. It doesn't raise an error.
