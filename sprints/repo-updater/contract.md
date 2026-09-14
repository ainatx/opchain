# Repo skill updater

One command checks and updates a repository's Opchain skills and local helpers,
with no ZIP handling, package installation, or telemetry reconfiguration.

## Acceptance criteria

- `curl -fsSL https://opchain.dev/update | sh` runs from the consuming repo.
- Detect existing `.claude/skills`, `.agents/skills`, and legacy `.codex/skills`
  Opchain installations; refresh all detected copies. A legacy Codex install also
  gets the supported `.agents/skills` location. Fresh installs default to Claude;
  `--target=codex` and `--target=both` are available.
- Validate the complete release and SHA-256 digests before modifying files.
  Never traverse out of a skill directory or follow destination symlinks.
- Preserve unrelated skills and custom extra files. Back up overwritten files;
  remove obsolete managed files only when unchanged locally. Reruns repair
  missing files and report already-current when no change is needed.
- Preserve all checkpoints, telemetry consent, IDs, timestamps and SQLite bytes.
  Absent consent stays absent. Enabled-with-missing/corrupt-store is reported
  unhealthy, without toggling consent or inventing history.
- Ship runnable telemetry/checkpoint helpers, with narrowly scoped SQLite ignore
  rules. Existing plugin configuration is untouched; host hooks and external
  accounts are outside this repo-files installer.
- Roll back caught write/verification failures; retain backups and a recovery
  journal for process termination. Reject concurrent updates.
- Build updater assets with the site and replace destructive website snippets
  with the command and a reusable prompt. No deployment in this changeset.
- Recognize the Opchain source repository before network access. Stage its own
  generators, refresh derived bundles/plugin copies and internal local links;
  preserve authored source, branch, checkpoints and telemetry. Detect concurrent
  edits even during read-only/current checks. Never implicitly fetch/pull Git.

## Verification

Temporary repositories: new install; enabled/disabled/absent consent; legacy and
multiple targets; custom/unrelated files; repeat run/repair; stale managed files;
bad hash/traversal/symlinks; network errors; simulated mid-write failure; portable
runtime from a subdirectory. Run repository suite and site checks/build.
