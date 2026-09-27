# Sprint 2 — Evaluation round 2

Verdict: PASS for implementation; owner acceptance pending. Same-session
Evaluator reviewed the contract and final code separately from generation.

## Scores

- Functionality: 8/10 — collection→draft→verify works through real CLI processes;
  hashes, revisions, approved drift, retirement and concurrent writes are tested.
- Completeness: 8/10 — A10–A18, ledger-only draft/verify and C2 delivered; all seven
  corpus price families have current published source rows. Real-corpus replay
  and owner price confirmation remain external acceptance items.
- Code quality: 8/10 — zero runtime dependencies, pure calculation modules,
  bounded metadata calls, locked cache snapshots, atomic append transactions and
  documented integrity boundaries. All nine new modules have 100% line coverage.
- CLI quality: 8/10 — side-by-side block/cadence totals, append count, explicit
  unpriced model names, canary refusal, actionable config errors and drift warnings.
- Weighted score: 8.0/10; every dimension exceeds 6/10. No visual UI is in scope.

## Evidence

- Repository `npm test`: 99 files / 1,376 tests passed. Precommit exposed an
  inherited Git author environment in the activity fixture: hook author variables
  overrode the synthetic repo's configured identity. Reproduced with explicit
  GIT_AUTHOR_NAME/EMAIL, then fixed the fixture's author/committer environment and
  removed inherited dates. The entire targeted suite passes under that environment.
  Final commits require the full precommit gate; no bypass was used.
- 104 time-tracking tests (69 prior plus 35 new), no skipped tests. The candidate
  precommit verifier reruns the full repository suite, including these tests.
- Library/unit tier: 99 tests, 1.70s runner duration on Node 24.19.0; the CLI and
  separate-process concurrency tier is excluded from the two-second unit budget.
- V8 coverage: new modules 390/390 lines (100%), 625/638 statements (97.96%),
  456/481 branches (94.80%). Full time library 834/834 lines (100%). Measured
  after the PR-query cache regression; the final test-environment isolation update
  changes no implementation lines.
  Coverage provider resides in an external temp directory, not the manifest/lockfile.
- 200 seeded randomized 20-interval days under both policies, independently
  compared with a discrete wall-clock union; session de-dup and ties covered.
- Golden collected fixture day compares full ledger bytes with explicit checked-in
  JSONL; a separate expected entry summary makes billing amounts easy to inspect.
- Twenty separate Node processes append twenty intact rows. Concurrent identical
  drafts append only one generation. Stale dead PID recovery, live/malformed lock
  timeout, failed transactions, partial writes and corruption are covered.
- CLI verify passes the golden flow, fails after ledger tampering, and refuses a
  bad canary. Library verification also checks tracked billing files and union.
- Tests use synthetic fixtures and temporary HOME/OPCHAIN_TIME_HOME. No real
  transcript reads, hook installation, settings edits, billing export or deployment.

## Contract review

| Criterion | Result | Evidence |
|---|---|---|
| Autonomous exclusion, typed continuity, tail, midnight/DST (#2, #7) | PASS | blocks tests, spring/fall 23/25-hour days, subagent and cwd transitions |
| Global allocation, internal, three-way/session overlap (#8, #9) | PASS | deterministic examples plus 200 randomized days under both policies |
| Matter precedence, HEAD, cap (#10) | PASS | active refs, PR enrichment, branch fallback, worktree path, eight-to-six merge |
| Seven sourced prices, caches, global maxima, unknown refusal (#6) | PASS | all family terms, dated suffixes, synthetic, cross-client/day fork maxima |
| Scope rounding, subminimum, deltas (#16) | PASS | largest remainder, up/nearest, client/matter day and zero billable cases |
| Activity, narrative and privacy (#17) | PASS | author/branch/window git fixture, metadata-only text <=240, prompt canary absent |
| Lock, fold, immutability (#14, #18) | PASS | processes, lifecycle, tamper, repeat draft, approved drift, automatic retirement |
| Config/CLI/docs | PASS | commented YAML parses, CLI statuses 0/1/2, owner runbook and pricing evidence |
| Round 1 regressions | PASS | worktree metadata, matter cuts, activity/PR query caches, retirement, IDs, recovery guard/cache lock |
| Owner corpus and price acceptance | PENDING OWNER | 14-day replay and price confirmation commands in PR body |

## Limits and release disposition

Sprint 1 PR #569 is the unmerged base and must land first. This PR is scoped to
Sprint 2; no catalog semver, tag, announcement, plugin, marketplace or MCP surface
changes. Release-ops records the delivered feature for a later combined release;
no release is cut. Existing repository-wide auditor findings remain out of scope.

All registered clients must share allocation policies/timezone; disagreement
fails closed. Undated checkpoints cannot establish historical matter activity.
Optional PR metadata availability can cause later derivation drift. Prices are
current standard-global USD list equivalents, not historical subscription costs.
Hash chains detect corruption but cannot authenticate a wholly rewritten log or
prove a deleted suffix; external private backups are required for that assurance.
Owner replay must validate real producer canaries, allocation judgments and runtime.
