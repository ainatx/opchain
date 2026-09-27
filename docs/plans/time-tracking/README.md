# Time tracking — Sprint 2

Collection, ledger-only daily drafts and verification are available now. Approval,
Markdown and export arrive in Sprint 3. Runtime uses Node 24 built-ins; optional
read-only GitHub CLI enrichment supplies PR branch/title metadata.

```sh
node scripts/timesheet.mjs collect
node scripts/timesheet.mjs collect --report
# Run draft/verify from a registered client repo (use an absolute CLI path).
node /absolute/path/to/opchain/scripts/timesheet.mjs draft 2026-09-26
node /absolute/path/to/opchain/scripts/timesheet.mjs verify
```

State defaults to `~/.opchain/time/`; `OPCHAIN_TIME_HOME` overrides it. Every
project is included so internal work can participate in later overlap allocation.
See [transcript-format.md](transcript-format.md) for collection and privacy, the
[commented config](billing.example.yaml) for billing policy, and the
[runbook](../../runbooks/time-tracking.md) for registration, drafting, verification
and owner replay. `init` and the npm shortcut arrive in Sprint 3. All seven model
families have [sourced pricing](sprints/sprint-2/pricing-evidence.md); owner
confirmation and real-corpus acceptance remain pending.

## Hooks

Installation is manual, after merge. Merge this entry into the existing
`hooks.UserPromptSubmit` array in `~/.claude/settings.json`; preserve other hooks.
Replace `/absolute/path/to/opchain` with the checkout that will remain installed.
No build or test edits Claude Code settings.

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node /absolute/path/to/opchain/scripts/timesheet.mjs hook prompt"
          }
        ]
      }
    ]
  }
}
```

The hook records timestamp, session ID and cwd only. It never prints to stdout
or stderr and always exits 0, including invalid input and unwritable storage.
The SessionStart nudge and full daily-loop instructions will land in Sprint 3.
