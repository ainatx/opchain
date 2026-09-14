# Workstream A — Sprint A1 Handoff

Status: complete and awaiting coordinator interface review. No A2 work started.

Worktree: `/Users/aidanelsesser/.codex/worktrees/37c7/opchain`

Starting HEAD: `aef40809fef4bbded9a47c936c7c544631397fb6` (`v1.9.1`, detached).
The remediation plan names `4d39b937313181f84d08b517a1445d3d1eda7e6a`
as its audit baseline; this task preserved the coordinator-created worktree state
and did not reset to that older commit.

## Completed criteria

- [x] Versioned policy/toolchain/repository/receipt API published.
- [x] Receipt verdict and digest are derived and validated rather than trusted.
- [x] Receipt location is under the Git common directory, outside candidate trees.
- [x] Interim verdicts preserve v1.9.1's nested, `last_run_verdict`, and `verdict`
  forms; every present form must agree.
- [x] Both repo-only and plugin registrations remain effective during migration;
  duplicate-registration removal is explicitly deferred.
- [x] All plugin hook commands invoke Node with a quoted plugin-root script path.
- [x] Private-key header scan covers generic, RSA, EC, OpenSSH, encrypted, and PGP
  forms; regression fixtures contain headers only.
- [x] Focused tests and diff hygiene pass with no skipped criterion.

## Changed files

- `.claude/settings.json`
- `plugins/opchain/hooks/hooks.json`
- `plugins/opchain/hooks/pre-commit-gate.cjs`
- `plugins/opchain/hooks/test-gate.cjs`
- `scripts/lib/verification-receipt.cjs`
- `skills/oc-bug-check/SKILL.md`
- `tests/audit-commit/compatibility.test.js`
- `tests/audit-commit/receipt.test.js`
- `sprints/audit-remediation/A/A1-contract.md`
- `sprints/audit-remediation/A/A1-handoff.md`

## Public interface proposal

See `A1-contract.md`. In summary, consumers use `createPolicy`,
`createToolchain`, `createRepositoryIdentity`, `createReceipt`,
`validateReceipt`, `receiptRoot`, and `receiptPath` from
`scripts/lib/verification-receipt.cjs`. The schema is v1 and deliberately does
not read or write checkpoints. A2 must bind the commit boundary to a validated
`PASS` receipt matching repository, candidate, policy, and toolchain.

## Test evidence

Final commands:

```text
node --check scripts/lib/verification-receipt.cjs
node --check plugins/opchain/hooks/pre-commit-gate.cjs
npx vitest run tests/audit-commit/receipt.test.js tests/audit-commit/compatibility.test.js
node plugins/opchain/hooks/test-gate.cjs
git diff --check
```

Final results after independent-review remediation:

- Syntax checks: PASS.
- A1 Vitest files: PASS, 2 files and 8 tests.
- Existing hermetic commit-gate harness: PASS, 149/149 fixtures.
- Diff whitespace check: PASS.
- Skips: none.

Development iterations retained for an honest record:

- The first Vitest launch could not load because this fresh worktree had no
  dependencies. `npm ci --ignore-scripts` installed the locked dependencies;
  no tracked package file changed.
- The first receipt-path run had one failing assertion because macOS resolves
  `/var` through `/private/var`; the assertion now compares canonical real paths.
- The first gate run had four expected-ALLOW fixtures still emitting only the
  retired flat mirror. The fixture writer now emits the canonical nested verdict,
  after which all 149 cases passed.

## Independent-review remediation

The first independent review correctly rejected two compatibility regressions in
the initial A1 draft. Repo-only registration and all v1.9.1 verdict aliases are
inherited from the base implementation and remain unchanged; duplicate-removal
work is deferred. The receipt API, quoted launch paths, and PEM work are the
authored A1 changes.
The review's separate C1 portability finding remains owned by C and is not edited
here.

## Coordinator integration requests

1. Review and accept or revise the A1 receipt/policy interface before dispatching A2.
2. Regenerate the coordinator-owned `plugins/opchain/skills/oc-bug-check/SKILL.md`
   and any authoritative bundle/catalog outputs once canonical changes are assembled.
   This task intentionally did not run sweeping generators.
3. At A2 integration, decide package/CI command wiring in coordinator-owned files.
   No package script is required to validate A1 directly.

## Dependencies and risks

- A2 is blocked on coordinator acceptance of the interface.
- The plugin hook stays self-contained; the repo-local receipt library is not yet
  packaged into the plugin artifact. A2 must preserve artifact-only behavior or
  make any packaging request explicit.
- Duplicate repo/plugin registration removal remains deferred until a tested
  replacement preserves repo-only, plugin-only, and combined native-host journeys.
- Local receipts are correctness evidence for accidental-error prevention, not an
  unforgeable security boundary. Protected CI must verify its candidate independently.
