# Workstream A — Sprint A2 Handoff

Status: implementation complete; independent acceptance pending. A3 not started.

Worktree: `/Users/aidanelsesser/.codex/worktrees/37c7/opchain`

## Completed

- [x] Accepted A1 receipt API retained unchanged.
- [x] Stale A1 rows 05/06 corrected to credit inherited compatibility behavior.
- [x] Immutable effective staged candidate materialized with a scratch index.
- [x] Declared required checks executed in the isolated candidate.
- [x] External create-once receipts validated against every required binding.
- [x] Real pre-commit boundary runs after staging-mutating mirror generation.
- [x] Explicit enrollment and foreign-hook preservation retained.
- [x] Partial staging, later staged mutation, generated mutation ordering, failed
  check blocking, and copied-runtime behavior covered in disposable repositories.

## Authored A2 files

- `scripts/verify-candidate.mjs`
- `scripts/install-git-drivers.mjs`
- `tests/audit-commit/candidate-verifier.test.js`
- `sprints/audit-remediation/A/A2-contract.md`
- `sprints/audit-remediation/A/A2-handoff.md`

A1 also owns the unchanged receipt library, quoted plugin-hook registration, PEM
documentation/test, and A1 contract/handoff in this worktree.

## Runtime contract

```text
node scripts/verify-candidate.mjs run [--repo PATH] [--policy RELATIVE_PATH] [--json]
node scripts/verify-candidate.mjs enforce [--repo PATH] [--policy RELATIVE_PATH] [--json]
```

The optional candidate policy is `.bugcheck.json`. Its `verification` object may
declare `required_checks`, argv-array `commands`, `timeout_ms`, and
`warning_behavior`. With no explicit list, the verifier detects applicable package
scripts plus the built-in anti-pattern and secret checks. External executables
are included in the toolchain fingerprint. The runtime itself uses only Node and
the adjacent CommonJS receipt library.

## Coordinator integration requests

1. Add the desired package command for direct verification; suggested wiring:
   `verify:candidate = node scripts/verify-candidate.mjs run`. A owns no root
   package files.
2. Package `scripts/verify-candidate.mjs` together with
   `scripts/lib/verification-receipt.cjs`; neither artifact is standalone alone.
3. Decide CI enforcement separately. Local receipts are not a protected-CI trust
   boundary and must not replace independent verification of the received commit.
4. Regenerate A1's coordinator-owned plugin skill mirror once canonical changes
   are assembled.

## Deferred to A3

- Native host repo-only, plugin-only, and combined registration journeys.
- Compound shell commands/substitutions, `git -C`, worktrees, explicit Git index
  environments, post-check native mutation timing, and missing-tool matrices.
- Any consolidation/removal of duplicate Claude hook registration.

## Test evidence

Final commands:

```text
node --check scripts/verify-candidate.mjs
node --check scripts/install-git-drivers.mjs
npx vitest run tests/audit-commit/receipt.test.js tests/audit-commit/compatibility.test.js tests/audit-commit/candidate-verifier.test.js tests/install-git-drivers.test.js
node plugins/opchain/hooks/test-gate.cjs
git diff --check
```

Final results:

- Syntax checks: PASS.
- Focused Vitest: 4 files, 19/19 tests PASS.
- Existing hermetic commit-gate harness: 149/149 fixtures PASS.
- Diff whitespace: PASS.
- Skips: none.

## Acceptance-review remediation

The A2 review found only a reproducibility issue: the two Git-heavy behavior
fixtures exceeded Vitest's repository-default 5-second timeout. Both now carry
an explicit 30-second per-test timeout; the global configuration and verifier
runtime are unchanged. The acceptance command was rerun without a CLI timeout
override:

`npx vitest run tests/audit-commit/candidate-verifier.test.js -t 'rejects a later staged mutation|runs after the staging-mutating hook'`

Result: PASS — 2 tests passed, 1 unselected test skipped; repository-default
timeout unchanged.

Development failures corrected before the final run:

- Copied temporary artifacts initially did not enter their CLI because macOS
  canonicalizes `/var` as `/private/var`; both executable entry checks now compare
  real paths.
- Existing unenrolled installer fixtures initially failed when the new runtime was
  absent. Commit-boundary verification is now conditioned on the same explicit
  enrollment markers as the verifier, preserving legacy unenrolled behavior.
