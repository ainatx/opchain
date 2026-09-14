# Workstream A — Sprint A1 Contract

Goal: define the verification-receipt boundary and complete only the compatibility
repairs that do not depend on the A2 candidate verifier.

## Acceptance criteria

| ID | Required outcome | Evidence |
|---|---|---|
| A1-01 | Publish a versioned receipt and policy API without creating another checkpoint store | `scripts/lib/verification-receipt.cjs`; public interface below |
| A1-02 | Bind a receipt to repository, candidate tree, policy/config, toolchain, verifier, results, exit statuses, and time | Receipt contract tests |
| A1-03 | Derive the receipt verdict from required check results and reject altered or mismatched receipts | Receipt contract tests |
| A1-04 | Locate receipts beneath Git's common directory and outside every candidate worktree | Spaced-worktree receipt path fixture |
| A1-05 | Retain v1.9.1's inherited nested and flat verdict aliases with agreement checks; no A1 implementation change | Existing commit-gate fixtures |
| A1-06 | Retain effective repo and plugin registration; defer consolidation until repo-only, plugin-only, and combined modes have a tested replacement | Hook registration fixture; deferred A3 journey |
| A1-07 | Invoke all plugin hooks with explicit Node and a quoted plugin-root path | Spaced installation-path smoke fixture |
| A1-08 | Detect generic, RSA, EC, and OpenSSH private-key headers using header-only fixtures | Documented scanner fixture |
| A1-09 | Record actual test commands and results without calling self-review independent evaluation | `A1-handoff.md` |

## Proposed public interface

The CommonJS module `scripts/lib/verification-receipt.cjs` is the single A-owned
receipt contract. It is independent of the checkpoint envelope/store owned by
workstream C.

| Export | Contract |
|---|---|
| `createPolicy(input)` | Normalizes required checks and warning behavior, digests `.bugcheck.json` content when present, and returns a versioned policy plus deterministic fingerprint |
| `createToolchain(input)` | Normalizes named tool versions/digests and returns a deterministic toolchain fingerprint |
| `createRepositoryIdentity(input)` | Resolves the Git common directory so linked worktrees share one local repository identity |
| `createReceipt(input)` | Validates all bound inputs, sorts check results, derives `PASS`/`FAIL`/`UNSUPPORTED`, and seals the canonical body with `receipt_digest` |
| `validateReceipt(value, expected)` | Recomputes fingerprints, verdict, and receipt digest, then optionally matches repository, candidate, policy, toolchain, and verdict expectations |
| `receiptRoot(gitCommonDir)` | Returns `<git-common-dir>/opchain/verification-receipts/v1` |
| `receiptPath(input)` | Returns the immutable run path `<root>/<candidate-tree>/<policy-sha>/<run-id>.json` |
| `canonicalJson`, `sha256Bytes`, `sha256Object` | Shared deterministic encoding/digest helpers for the A2 writer and boundary reader |

Policy v1 requires a non-empty unique `required_checks` list, `warning_behavior`
of `allow` or `fail`, and a repository-relative config path plus a content digest
when the config exists. Receipt v1 requires one result for every required check.
Each result carries an ID, status, non-negative exit code, and duration; an output
digest is optional. `FAIL`/`ERROR` derive `FAIL`; missing runtime capability derives
`UNSUPPORTED`; only a complete acceptable result set derives `PASS`.

Repository identity is intentionally local: it hashes the canonical Git common-dir
path and object format, so worktrees agree while another clone cannot reuse the
receipt. A protected CI system must independently verify its received candidate.

## A2 handoff requirements

A2 may add the executable verifier and writer only after the coordinator accepts
this interface. The writer must materialize and test the effective candidate,
write a new run ID without overwriting another run, and then make the receipt
available to the commit boundary. The boundary must match repository, candidate,
policy, toolchain, and `PASS`; a checkpoint is informational and cannot replace
the receipt.

## Explicitly out of scope

- Implementing `scripts/verify-candidate.mjs` or a receipt writer.
- Replacing the current working-tree comparison at the commit boundary.
- Partial-staging, `git -C`, worktree, mutation-order, or native-host acceptance.
- Package scripts, CI/workflows, generated skill mirrors, catalogs, release files,
  installed caches, checkpoints, commits, tags, remote branches, or services.
