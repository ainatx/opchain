# Time tracking — Sprint 1

The collector is available now; daily drafts, approval and export arrive in
Sprints 2 and 3. It uses Node 24 built-ins and makes no network calls.

```sh
node scripts/timesheet.mjs collect
node scripts/timesheet.mjs collect --report
```

State defaults to `~/.opchain/time/`; `OPCHAIN_TIME_HOME` overrides it. Every
project is included so internal work can participate in later overlap allocation.
See [transcript-format.md](transcript-format.md) for privacy, canary, recovery
and owner replay instructions. `billing.yaml` parsing and repo registry helpers
are available to the next sprint; `init` and the npm shortcut arrive in Sprint 3.

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
