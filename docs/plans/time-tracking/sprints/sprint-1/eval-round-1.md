# Sprint 1 — Evaluation Round 1

## Verdict: PASS for implementation; owner acceptance pending

Reviewed the contract against the library, real CLI invocations and synthetic
fixtures, independently of the build narrative. The owner's corpus replay is
not performed or implied by this result. No UI is in scope.

## Code scores

- Functionality: 8/10 — collect and the silent hook work end to end; regression
  cases cover source recovery, privacy, de-duplication, queue timing and answers.
- Feature completeness: 8/10 — all Sprint 1 modules and fixture groups delivered.
  Real-corpus performance and producer-format acceptance remain pending owner.
- Code quality: 8/10 — small ESM modules, no runtime dependencies, explicit storage
  contract; 100% library line coverage and 94.42% branch coverage measured by V8.
- Visual/UX quality: 8/10 — concise summary and machine-readable report; failures
  are redacted, canary degradation is visible, hook output is silent.
- **Code score: 8.0/10.** Every dimension clears 6/10.

## Verification

- `vitest run tests/time`: 69 passed; no failed/skipped tests.
- Unit/library tier: 66 tests, 0.401s runner duration (0.396s test time), below 2s.
- V8 coverage: 439/439 lines (100%), 654/663 statements (98.64%),
  525/556 branches (94.42%). Coverage tooling was installed in an external temp
  directory; neither package manifest nor lockfile changed.
- `node tests/time/benchmark.mjs`: hook median **42.22ms**, 20 fresh processes;
  initial synthetic 10k-line collection **89.68ms**; next 10k lines **147.48ms**,
  reading exactly 10,000 new lines / 2,808,890 bytes. Within local budgets.
- Repository `npm test`: 97 files / 1,340 tests passed before the final additional
  cwd-fallback regression; the commit verifier reruns the final candidate suite.
- All tests use a temporary HOME and OPCHAIN_TIME_HOME. No real transcript scan,
  hook installation, price entry, billing export or deployment was performed.

## Contract checks

| Criterion | Result | Evidence |
|---|---|---|
| Private storage, config, registry | PASS | storage tests: modes, YAML errors/defaults, worktree/common-dir and deleted-path fallback |
| Incremental cursor and recovery | PASS | partial UTF-8 lines, append/truncate/inode replacement/deletion, cursor/shard mismatch replay |
| Audited classification | PASS | every machine/user envelope, legacy origin, explicit answer tool IDs scoped per session |
| Global de-dup and ordering | PASS | fork fixtures, max-per-field usage, first-seen ownership stable across subsequent discovery |
| Queue and hook merge | PASS | content-free removal by ID, identical FIFO prompts, enqueue timestamp, inclusive ±5s hook precedence |
| Canary and privacy | PASS | >1% day failure, newer version, malformed/read failure; canary string absent from all persisted files |
| Performance on synthetic tree | PASS | standalone benchmark above; run separately from unrelated build workloads |
| Owner replay and adoption | PENDING OWNER | exact commands in transcript-format.md and PR body |

## Remaining limits

The producer baseline (2.1.0) is synthetic; owner replay must establish compatibility
with the real corpus before treating events as billing evidence. The incremental
collector reads only new transcript bytes but materializes the retained normalized
cache; large-corpus latency must be measured on the owner's data. Source shards
retain history after transcript deletion. Interrupted collection may leave a
partly published cache until rerun; recovery instructions are in the format doc.
The existing code-auditor checkpoint's unrelated repository-wide findings remain
open. Pricing/ledger/approval and the daily-loop surfaces belong to later sprints.

## Release-ops disposition

This sprint is a local collector feature PR. Catalog version surfaces are frozen
and untouched; no semver, release announcement, tag or deployment is claimed.
Its delivered scope can feed release notes after the three-sprint feature is ready.
