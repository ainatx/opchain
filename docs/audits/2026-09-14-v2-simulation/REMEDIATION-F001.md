# F-001 remediation — release CLI entrypoints

Worktree: `<worktree>/opchain-v2-simulation-fixes`, branch `codex/v2-simulation-fixes`, baseline `63bb189dabb7c98b2fd961f11de144925a6e9519`. No commit, generator, deployment, external PR/tag or held-candidate edit performed.

## Scope and change

The three adjacent release gate CLIs used an unescaped `file://${process.argv[1]}` comparison against `import.meta.url`. The assigned fix was explicitly expanded to cover all three after inspection found the identical failure in release surfaces and release evidence. Each now resolves the executable path with `realpathSync`, converts it with `pathToFileURL(...).href`, and guards missing argv. Real-path resolution also preserves CLI execution through symlink aliases. Imported checker functions remain unchanged.

Changed product files (imports and entrypoint guards only):

- `scripts/check-release-tag.mjs`
- `scripts/check-release-surfaces.mjs`
- `scripts/lib/release-evidence.mjs`

New regression suite: `tests/audit-release/cli-entrypoints.test.js`. It uses two disposable no-tag clones named `checkout` and `release candidate #1%`, copies only the three current gate files, and isolates the remote to a nonexistent local path. Fixture-only commits and lightweight tags stay in these temporary clones. No source refs change.

## Failed before / passed after

Before product changes, the eight new cases produced **4 PASS, 4 FAIL**. All ordinary-path controls passed. All escaped-path cases failed:

1. Post-tag returned false PASS with no release tag.
2. Unsigned lightweight-tag CLI returned exit 0.
3. Surface CLI returned no validation output.
4. Candidate-evidence CLI returned no JSON.

Evidence: `evidence/f001-before.json`, `evidence/f001-before.log`.

After the final fix: **63/63 tests PASS across seven files**. The ten new cases verify both path forms across:

- pre-tag permits the intended absence; post-tag refuses missing tag;
- direct tag CLI refuses lightweight unsigned tag with parsed reason;
- symlink alias invocation executes the tag gate and refuses the missing tag;
- matching surface data passes with real output; changed version fails;
- candidate projection emits real identity JSON; missing executable evidence fails.

Supporting unchanged suites cover tag seal/signature/remote logic, release surfaces, release gate policy/evidence, normal pre/post-tag rehearsal and checkpoint-excluded source projection.

Command:

```text
./node_modules/.bin/vitest run tests/audit-release/cli-entrypoints.test.js tests/check-release-tag.test.js tests/release-surfaces.test.js tests/audit-release/b1-release-gates.test.js tests/audit-release/b2-evidence-gates.test.js tests/audit-release/b3-release-rehearsal.test.js tests/audit-integration/release-projection.test.js --reporter=json --outputFile=<audit>/evidence/f001-after.json
```

Evidence: `evidence/f001-after.json`, `evidence/f001-after.log`.

## Completeness and limits

Inspected the actual release path's entrypoints: `release-sequence.mjs` and `deploy.mjs` already execute directly; the three guarded gate CLIs above were the directly related occurrences. This is not a repository-wide entrypoint refactor. Tests cover spaces, fragment-like `#`, literal `%`, normal paths, symlink aliases and actual exit/output behavior. Test subprocess environments strip inherited Git directory/index/object/namespace pointers. Trusted signing, remote publishing and deployment were not exercised. Parent Verifier should review the original finding and product/test diff independently before closing F-001.

## Independent review follow-up

The parent Verifier requested a bounded symlink case. Before real-path resolution, the new alias cases failed in both checkout paths (8 existing cases PASS, 2 symlink cases FAIL); evidence is `evidence/f001-symlink-before.json` and `.log`. Adding `realpathSync` to the same three entrypoint guards resolved both; final 63/63 results are recorded in `f001-after.json`. No checker policy or release behavior beyond entrypoint dispatch changed.
