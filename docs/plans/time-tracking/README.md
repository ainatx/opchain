# Local time tracking

Draft daily client timesheets from local Claude Code activity, review the evidence,
and export approved revisions. Node 24 built-ins; no runtime npm dependencies.
Optional read-only GitHub CLI enrichment supplies PR branch/title metadata.

## Quick start

Run from the client repository. Replace the paths, identity, rate and timezone with
values you have agreed with that client; the names below are an example.

```sh
cd /absolute/path/to/client-repo
node /absolute/path/to/opchain/scripts/timesheet.mjs init \
  --client meridian --name "Meridian Freight" --rate 175 \
  --currency USD --timezone America/Chicago --repo "$PWD"
node /absolute/path/to/opchain/scripts/timesheet.mjs collect --report
node /absolute/path/to/opchain/scripts/timesheet.mjs draft 2026-09-28
node /absolute/path/to/opchain/scripts/timesheet.mjs review 2026-09-28
```

`init` creates private state under `~/.opchain/time/meridian/`, registers the git
common root (so worktrees resolve too), and adds `/timesheets/` to the client's
`.gitignore`. Edit `billing.yaml` to set matter rules and billing policy before
reviewing a real draft. Existing configuration requires `--force` to replace; a
registered repo cannot silently switch clients. No hooks are installed.

The npm equivalent is `npm --prefix /absolute/path/to/opchain run timesheet --
<command>` from the client repo. It uses npm's original invocation directory.
The absolute Node command avoids npm's extra console headers in scripts.
`help` and `<command> --help` describe every verb.

All ledgers, normalized events, rates and exports stay under `~/.opchain/time/`.
`OPCHAIN_TIME_HOME` overrides that location for isolated validation. Generated
Markdown goes to the current checkout's ignored `timesheets/YYYY-MM-DD.md`.
Outputs are private files; tracked billing paths are refused.

## Daily loop

Review the previous day, make corrections with a reason, then approve what you
intend to bill. Entry commands accept an exact id or unique prefix.

```sh
node /absolute/path/to/opchain/scripts/timesheet.mjs edit meridian-2026-09-28-general-t \
  --hours 0.50 --reason "Read the specification before the first prompt"
node /absolute/path/to/opchain/scripts/timesheet.mjs add --date 2026-09-28 \
  --matter planning --hours 0.25 --narrative "Planning call." --reason "Offline work"
node /absolute/path/to/opchain/scripts/timesheet.mjs approve 2026-09-28
node /absolute/path/to/opchain/scripts/timesheet.mjs export \
  --from 2026-09-01 --to 2026-09-30
node /absolute/path/to/opchain/scripts/timesheet.mjs spotcheck --n 3
node /absolute/path/to/opchain/scripts/timesheet.mjs verify
```

`today` gives a compact cached summary. `draft --since YYYY-MM-DD` includes every
local day through today. `review --quarantine` adds content-free format counters.
Manual hours and edits use quarter-hour steps. `discard <id> --reason "…"` removes
an unapproved entry from billing while preserving its audit trail. To change an
approved entry use `amend` with a reason, then review and approve it again.

Approval and export check saved allocations across every registered client and
refuse overlapping stale drafts; re-draft affected days before billing.
Approvals are per entry. A partly unpriced AI line or nonbillable line can be
blocked while valid time entries approve. A failing current or recorded canary
blocks approval. Exit codes: 0 success, 1 refusal, 2 usage/config error. Repeating
an unchanged draft appends nothing; manual entries survive regeneration. Protected
days warn on derivation drift and keep their saved entries.

CSV includes only current approved revisions; an amended entry disappears from
exports until approved again. CSV columns include currency, revision and raw
minutes. The default path is `<time-home>/<client>/exports/<client>-YYYY-MM.csv`;
a cross-month range includes both dates in the filename. `--out file.csv` selects
another path. Inside a repository, output must be under ignored `timesheets/`.
CSV text is quoted and formula-leading text is escaped for spreadsheet import.

AI costs remain separate USD **list-price equivalents**, never added to billable
hours or silently converted to the time currency. The seven prices and the
56-repository-day validation replay were accepted on 2026-09-27; the incremental
collector's <1-second performance target remains a documented follow-up.

## Hooks

Installation is manual. Merge these entries into the corresponding arrays in
`~/.claude/settings.json`, preserving existing hooks. Replace and quote the
absolute checkout path; use a stable checkout you will retain.

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"/absolute/path/to/opchain/scripts/timesheet.mjs\" hook prompt"
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"/absolute/path/to/opchain/scripts/timesheet.mjs\" nudge --cwd \"$CLAUDE_PROJECT_DIR\""
          }
        ]
      }
    ]
  }
}
```

The prompt hook records timestamp, session ID and cwd only, never prompt text.
The nudge reads the current client's config, ledger and canary cache; it never
collects or scans transcripts. It emits only a `systemMessage` JSON object or
nothing. Both hooks always exit 0; a slow nudge child is killed after 400 ms so
SessionStart stays within its 500 ms budget. Remove these entries to uninstall.

## Acceptance and references

Implementation tests use temporary HOME and billing state. The final owner trial
is still pending: choose one real client, install the hooks if desired, review and
approve a real day, then check its CSV in the invoicing tool or spreadsheet. Build
and merge do not approve bills or install hooks.

See the [commented config](billing.example.yaml), [format notes](transcript-format.md),
[sourced prices](sprints/sprint-2/pricing-evidence.md), and
[runbook](../../runbooks/time-tracking.md) for recovery and attribution details.
