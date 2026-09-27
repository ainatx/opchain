# 07 — Distribution & Rollout

## v1: dogfood (during the OSS-split freeze)

- The code lives in `scripts/timesheet.mjs`, `scripts/lib/time/` and `tests/time/`. All of these are outside the frozen paths.
- You run it against any repo with:

  ```
  npm --prefix <opchain> run timesheet -- draft --repo <path>
  ```

- **User-level hooks (need your consent at scaffold time).** Add two entries to `~/.claude/settings.json`:
  - `UserPromptSubmit` → `node <opchain>/scripts/timesheet.mjs hook prompt`. This is the primary human signal. It appends a timestamp only and exits 0 even on error, so it never blocks a prompt.
  - `SessionStart` → `node <opchain>/scripts/timesheet.mjs nudge --cwd "$CLAUDE_PROJECT_DIR"`. It emits a `systemMessage` for registered repos only, reads the cache only, and is time-boxed to 500 ms.
  - Because they live in user settings, they cover every client repo without adding files to any of them.
- **First run:** `collect` does the one-time full scan, about 9 s over 2.1 GB, and every later run is incremental. Hook-captured prompts start on the day the hook is installed; earlier days use the transcript classifier.
- **Rollback:** remove the hook entry. The ledger files stay where they are.

## v2: graduate to a skill (after C2–C7)

This uses the add-a-skill surface list from the infrastructure sweep:

- `skills/oc-time-ops/SKILL.md` and a runtime wrapper
- flags in `src/lib/flags/registry.js` (`skills.registry.oc-time-ops.enabled`, `skills.command.time.enabled`)
- orchestrator.md: the pipeline map, upstream table, routing table and §7, followed by `sync-bundles`
- `skills/README.md`, `CHANGELOG`
- the plugin hook, plus `sync-plugin-skills`
- the runtime `catalog.json` and the skill-count pins (currently 36)
- MCP routing and the eval rows
- the hard-coded skill counts in site copy

Following `CONTRIBUTING.md`, open an issue first.

It ships as a minor release of the catalog, with its own feature flag defaulting to on.
