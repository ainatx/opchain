# opchain 1.9.2 bounded pre-deploy code audit

**Gate:** `pre-deploy-code-audit-v1`  
**Verdict:** **PASS**  
**Release blockers:** 0 CRITICAL, 0 HIGH  
**Review date:** 2026-09-13  
**Baseline:** `origin/main` (`7234ad60b375ede708b8ee4fa17bf22b0d329600`)  
**Accepted candidate:** uncommitted v1.9.2 integration candidate; supplied packaged tree `39cab7d07466df6570152dbdf0471b895dd8b203`

## Scope

Read-only review of the accepted candidate relative to `origin/main`, limited to release-critical execution paths:

- staged-candidate materialization, isolated execution, receipt creation, and receipt enforcement in `scripts/verify-candidate.mjs` and `scripts/lib/verification-receipt.cjs`;
- PR/deploy evidence binding and the deploy chokepoint in `scripts/lib/release-evidence.mjs`, `.github/workflows/ci.yml`, and `scripts/deploy.mjs`;
- checkpoint envelope/handoff validation, durable local storage, CAS, and OS-lock behavior in `src/lib/mcp/checkpoint-*.js`, `src/lib/mcp/server.js`, `mcp/local-server.mjs`, and `scripts/checkpoint.mjs`;
- artifact composition in `scripts/package-runtime.mjs` and its runtime imports;
- focused integration tests covering those paths.

The same reviewed implementation bytes are present in `/Users/aidanelsesser/repos/worktrees/opchain-release-1.9.2` for the verifier, release-evidence consumer, and local checkpoint store.

## Findings

No concrete release-blocking defect was found.

The verifier snapshots the effective index tree, materializes it through a separate index, checks the isolated tree identity, strips inherited Git pointers, and rejects a real-index mutation before sealing a receipt (`scripts/verify-candidate.mjs:103-162`, `519-569`). Receipts are matched against repository, tree, policy, toolchain, verifier digest, and PASS verdict (`scripts/verify-candidate.mjs:485-500`).

Release evidence binds executable verification to `HEAD^{tree}` and human-produced audit evidence to a projection of the committed tree excluding `.checkpoints/`, avoiding checkpoint self-reference while preserving source binding (`scripts/lib/release-evidence.mjs:34-112`). Missing, ambiguous, stale, invalid, FAIL, or INCOMPLETE required handoffs fail closed. Deploy calls this consumer before build or platform mutation.

Checkpoint handoffs are validated through the common envelope, typed producer/candidate/payload contract, and an exact single-match consumer. Local writes use process-owned `lockf`/`flock`, write-then-rename replacement, and optional compare-and-swap; unsupported hosts fail at provider construction before creating project state.

The runtime packager copies the verifier/evidence/checkpoint implementation and declared pure-JavaScript dependencies, rejects symlink inputs, refuses an existing output directory, and emits a byte inventory.

## Verification performed

- Focused verifier/evidence/checkpoint/artifact suite: **PASS**, 4 files / 22 tests.
- `git diff --check origin/main`: **PASS**.
- Source-byte comparison between the audit integration and release assembly worktrees for the three central runtime files: **MATCH**.
- CI inspection: the Worker job uses Ubuntu and Node 22, installs both dependency trees before verification, runs independent candidate verification, requires candidate-bound PR evidence, then repeats checkpoint, hook, unit, and build gates.
- Prior accepted full candidate gate result and packaged-tree identity were supplied as audit inputs and were not rerun in this bounded review.

## Limits and residual conditions

- The focused tests ran on macOS with Node 24.19.0. This review inspected the Linux `flock` argv and Node 22 CI wiring but did not start a separate Linux/Node 22 container or GitHub Actions run.
- The checkout is intentionally uncommitted. `scripts/lib/release-evidence.mjs --stage deploy` cannot produce a final deploy PASS until the final commit exists, a matching executable receipt is created in that clone, and `oc-code-auditor` plus `oc-security-auditor` publish exact `verification.verdict` handoffs for that commit projection. That is the designed fail-closed release sequence, not a code defect.
- `.bugcheck.json` is candidate-resident by design. Its current strict policy declares type safety, lint, tests, built-in anti-pattern and secret scans, build, and root/site dependency audits. Protected CI also executes the unit/build gates after the verifier.
- Compliance evidence remains warn-only by the accepted B2 contract and was not reclassified in this audit.

## Gate handoff

Producer: `oc-code-auditor`  
Type: `verification.verdict`  
Policy: `pre-deploy-code-audit-v1`  
Verdict: `PASS`

The eventual checkpoint handoff must bind this PASS to the final candidate identity printed by:

```sh
node scripts/lib/release-evidence.mjs --print-candidate --json
```

Do not bind the handoff to the current baseline `HEAD` or to the supplied staged-tree hash; the evidence consumer requires the final commit projection identity.

## CI integration follow-up

The first remote run independently passed all eight candidate checks, then exposed a standalone test setup defect: hosted-reference tests expected generated public/docs assets. Added the existing sync-docs command to npm pretest. The focused standalone command now passes all 3 hosted-reference tests without a prior build.

The browser job separately exhausted GitHub's anonymous shared-IP API quota while loading the real roadmap. The existing generator now receives the job-scoped GitHub token in that step. Existing voting assertions remain unchanged and fail if real data does not load. This changes CI input configuration, not runtime authorization or production code. The final candidate and required remote jobs must pass again.

The second remote run passed the Worker gate. Its authenticated roadmap request returned no issues because the browser job lacked the endpoint's Issues read permission. The browser job now explicitly requests issues:read while preserving its existing contents:read and pull-requests:write permissions. This is a read-only scope addition limited to that job; no stored credential or write permission is added. The generator and real-data assertions remain unchanged. Reference: https://docs.github.com/en/rest/issues/issues#list-repository-issues.

## Post-tag site review

The coordinator reviewed the six-file site patch after v1.9.2 was signed and pushed. Changes are release copy, counts and the matching browser expectation; product runtime code is unchanged from tag 7ccdacf04c9ac59f62309c371de357acd9b81839. Mechanical release-surface checks and all 22 focused changelog/scenario browser tests pass with actual roadmap data. No new executable content, external dependency or permission is introduced. The PASS verdict extends to this source change, with fresh full candidate/CI verification required before staging.
