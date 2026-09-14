# Workstream A — Sprint A2 Contract

Goal: make the real Git commit boundary verify the immutable effective staged
candidate using the accepted A1 receipt contract.

## Acceptance criteria

| ID | Required outcome | Evidence |
|---|---|---|
| A2-01 | Resolve the effective repository, Git common directory, object format, and current index tree | Disposable repository verifier tests |
| A2-02 | Materialize the index tree in an isolated temporary directory without replacing the real index or using working-file content | Partial-staging fixture |
| A2-03 | Execute every policy-required check there using argv arrays or bounded built-in checks | Candidate check fixture and receipt results |
| A2-04 | Bind repository, tree, policy/config, toolchain, verifier, results, exits, and timestamps in an external receipt | Receipt plus verifier fixtures |
| A2-05 | Create each receipt exclusively under Git's common directory and validate it before authorizing | File-mode/path assertions and `enforce` fixture |
| A2-06 | Reject a missing, altered, non-PASS, or candidate-mismatched receipt | A1 validation and post-verification mutation fixtures |
| A2-07 | Run verification after the existing staging-mutating mirror hook | Installed-hook fixture with regenerated files in the committed tree |
| A2-08 | Preserve explicit enrollment and existing foreign-hook protection | Unenrolled fixture and existing installer tests |
| A2-09 | Keep the runtime self-contained apart from declared check executables | Copied-artifact fixture with only the CLI and receipt library |

## Boundary

`scripts/verify-candidate.mjs run` snapshots `git write-tree`, materializes that
tree with a scratch index, loads policy from the materialized candidate, runs
checks there, confirms the real index tree did not change, writes a new external
receipt, and revalidates the exact boundary. `enforce` requires an existing PASS
receipt matching the current repository, tree, policy, toolchain, and verifier.

The installed Git pre-commit hook calls `run` after generated mirrors are staged.
The Claude `PreToolUse` hook remains a compatibility preflight; the Git hook is
the A2 enforcement boundary. No shell-command regex is claimed as authoritative.

## Out of scope

- Native Claude host validation and repo-only/plugin-only/combined install journeys.
- `git -C`, explicit Git environment, worktree, compound-shell, and concurrent
  native-host matrices reserved for A3.
- Package scripts, CI/workflow changes, generated packaging, commits, tags, or deploys.
