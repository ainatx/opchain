# Workstream A — Sprint A3 Contract

Goal: accept the A2 candidate verifier at the real Git commit boundary across
the remaining audited command, repository, index, worktree, dependency, mutation,
and hook-ownership cases.

## Acceptance criteria

| ID | Required outcome | Evidence |
|---|---|---|
| A3-01 | An actual commit verifies the staged candidate under partial staging and includes a tracked checkpoint without self-invalidating | Disposable commit fixture and matching external receipt |
| A3-02 | Mutation followed by stage and commit is checked at the commit operation, including compound shell commands and command substitution | Two actual shell-command commit attempts |
| A3-03 | `git -C` and explicit `GIT_DIR`/`GIT_WORK_TREE`/`GIT_INDEX_FILE` operations resolve the effective repository and candidate | Targeted and alternate-index commit fixtures |
| A3-04 | A linked worktree uses its own effective index and the repository's shared identity/receipt store | Linked-worktree commit fixture |
| A3-05 | A missing required executable yields `UNSUPPORTED` evidence and blocks the commit | Missing-tool fixture and receipt inspection |
| A3-06 | A check that mutates and stages into the real index invalidates the run before a receipt can authorize the commit | In-verification mutation fixture |
| A3-07 | Git `pre-commit` is the sole local authorization owner; repo-only, plugin-only, and combined Claude configurations register no competing commit decision | Configuration ownership fixture |
| A3-08 | Explicit enrollment remains the activation boundary | Inherited A2 unenrolled fixture plus enrolled actual commits |
| A3-09 | Registered plugin hooks launch from a spaced path in an available native host without changing real repository or installed plugin state | One disposable Claude Code plugin-dir smoke |
| A3-10 | Map F01–F06, F17, F18, and F25 to current evidence, crediting inherited A1/A2 repairs | `A3-handoff.md` |
| A3-11 | Fresh plugin-only, repo-only, and combined users have an explicit enrollment command that installs a durable packaged verifier runtime and protects later commits | Artifact-only enrollment fixtures |
| A3-12 | Required enrollment never silently skips a foreign hook; unsupported composition leaves it unchanged and exits nonzero with an actionable verifier snippet | Enrolled foreign-hook fixture |
| A3-13 | Nested package dependencies needed by declared checks are available without entering the candidate tree | Nested `site/node_modules` fixture |
| A3-14 | Git-aware declared checks receive isolated candidate metadata and cannot write through inherited live Git pointers | Candidate Git view/ref-write fixture |

## Boundary decisions

- Git's installed `pre-commit` hook is authoritative because it runs inside the
  actual commit operation after staging-mutating hooks.
- Claude `PreToolUse` registration is removed from both repository and plugin
  configurations. Shell parsing may still be useful as an unregistered legacy
  diagnostic, but it cannot authorize or deny a commit.
- Checkpoints remain workflow history. Only a matching external candidate receipt
  authorizes the enrolled local boundary.
- Explicit enrollment copies the verifier and receipt library beneath the Git common
  directory before installing the hook. Plugin-only enrollment uses the packaged
  source runtime; later commits do not depend on the plugin cache path.
- Unsupported foreign-hook composition is a setup failure, not a warning. The
  installer prints the exact manual final-decision snippet and leaves the hook intact.
- Candidate Git metadata is isolated and single-commit. Dependency mounts are limited
  to `node_modules` beside materialized `package.json` files and excluded from that
  Git view.
- `git commit --no-verify` is an explicit local bypass. Protected CI must verify
  the received candidate independently.

## Out of scope

- Package scripts, workflows, generated plugin skill mirrors, catalogs, installed
  plugin caches, checkpoints, release artifacts, commits, tags, remote actions, or
  deployment.
- A broad native-host/version/platform matrix. A3 records one available host smoke
  and names everything else unsupported or untested.
