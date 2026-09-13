# A3 policy and plugin-enrollment correction handoff

## Goal

Make the integrated CI candidate verifier use a complete repository policy,
without weakening built-in scanners or installing source-repository behavior
into plugin-only targets.

## Completed

- [x] Proposed all advertised repository gates explicitly: site type safety,
  repository lint, Vitest, anti-patterns, secrets, build, root dependency audit,
  and site dependency audit.
- [x] Set a 300,000 ms per-check timeout. The first combined disposable run
  measured site type checking at 72.654 s; lint at 1.768 s; root audit at
  2.497 s; and site audit at 3.965 s. Tests/build failed early on a separate
  F-owned command-contract error, which the coordinator corrected.
- [x] Added exact-file, SHA-256-bound scanner exceptions. Missing, stale,
  duplicate, escaping, or non-file exceptions abort verification; no glob or
  directory bypass exists.
- [x] Removed the verifier's PGP-pattern self-match by constructing that one
  pattern without embedding the detected literal in its own source.
- [x] Made built-in scanners read blobs from the original candidate tree, so a
  preceding build cannot inject ignored/generated output or rewrite the bytes
  the scanners evaluate. Matching tracked candidate blobs still fail.
- [x] Added capped, redacted failure diagnostics to the CLI result while
  retaining only output digests in immutable receipts.
- [x] Kept intentional scanner examples visible and auditable rather than
  replacing scanners with pass scripts or excluding all docs/tests.
- [x] Limited source mirror regeneration and checkpoint merge-driver
  registration to a recognized opchain authoring checkout (`opchain-dev` plus
  the three required source scripts). Plugin-only targets retain the candidate
  verifier but receive neither behavior.
- [x] Added a plugin-only fixture that stages `skills/example.txt`, commits it
  through the installed verifier, and proves the unavailable merge driver was
  not registered.
- [x] Preserved authoring-repository mirror regeneration and merge-driver
  registration in focused fixtures.

## Evidence

- `npx vitest run tests/audit-commit/receipt.test.js tests/audit-commit/compatibility.test.js tests/audit-commit/candidate-verifier.test.js tests/audit-commit/commit-boundary.test.js tests/audit-commit/enrollment.test.js tests/install-git-drivers.test.js`
  — PASS, 6 files / 34 tests.
- `node plugins/opchain/hooks/test-gate.cjs` — PASS, 149/149 fixtures.
- Final focused runtime combination (`candidate-verifier`, `enrollment`, and
  `install-git-drivers`) — PASS, 3 files / 23 tests after immutable-tree and
  diagnostic corrections.
- `node --check scripts/verify-candidate.mjs` — PASS.
- `node --check scripts/install-git-drivers.mjs` — PASS.
- `git diff --check` — PASS.
- Independent policy review: `sprints/audit-remediation/review-A-policy.md` — PASS.

## Integration requirements

1. Import the A-owned changes to:
   - `scripts/verify-candidate.mjs`
   - `scripts/install-git-drivers.mjs`
   - `tests/audit-commit/candidate-verifier.test.js`
   - `tests/audit-commit/enrollment.test.js`
   - `tests/install-git-drivers.test.js`
2. Mirror the final verifier and installer byte-for-byte to
   `plugins/opchain/scripts/`, retaining the existing mirrored receipt library.
3. Use `repository-policy.proposed.json` as the policy shape, but refresh every
   listed exception digest from the final combined candidate. Stale values must
   fail; do not relax that behavior.
4. Import the final immutable-tree/diagnostic delta before rerunning: the first
   combined result had six green gates, but secrets observed build-generated
   working-tree output and the test failure exposed only a digest.
5. Add the refreshed policy as `.bugcheck.json` in the coordinator-owned
   integration checkout and run the final combined candidate verification.
   Root owns that long test/build/package acceptance run.

## Remaining acceptance

- [ ] Coordinator imports and mirrors this delta — estimated 5–10 active min.
- [ ] Coordinator refreshes reviewed digests and proves the final combined
  `verify:candidate` receipt is PASS — estimated 4–8 active min plus the real
  repository test/build runtime (likely 3–7 min).

No commit, publish, deployment, installed-cache change, or edit to the
coordinator-owned `.bugcheck.json`, package, or CI files was performed.
