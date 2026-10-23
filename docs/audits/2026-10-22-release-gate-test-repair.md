# Release gate test integration repair

Candidate v3 failed twelve tests across the release fixtures and plugin-version
suite; the other seven strict checks passed. The initial correction passed 33
focused tests. Candidate v4 then passed 11,102 tests across 176 files, with 13
skipped tests, but two further isolated fixtures omitted the new import
closure. All three fixture setups now share that closure. The complete focused
audit-release group plus plugin-version suite passed 45 tests across five files
in 22.35 seconds. Failed receipts remain in the local verification store, with
summaries at `/tmp/opchain-integrated-candidate-v3.log` and
`/tmp/opchain-integrated-candidate-v4.log`. The subsequent full candidate
outcome belongs to its receipt and the release checkpoint.

# Independent review of release-test fixture repairs

No actionable security-regression findings in the final repair. Reviewed read-only under `/Users/aidanelsesser/.codex/worktrees/ow-handoff-completion/opchain`; paths below are relative to that root. This supersedes the earlier two-file-only review with current line references.

- **Shared fixture setup restores real imports without bypasses.** `tests/audit-release/release-fixture.js:6-14,19-29` explicitly lists the current tag-gate import closure, copies actual source bytes, and links only the installed `js-yaml` dependency. Missing sources/dependencies fail setup; there is no stub, mock, catch-and-pass fallback, skip, fabricated release data, or added bypass environment. The fixture callers pass constant source paths. The new pin-preparer dependency retains its direct-invocation guard (`scripts/prepare-ow-tools-pin.mjs:79`), so importing it does not execute the pin-writing CLI.

- **B2 still tests the intended production refusal, not an arbitrary load failure.** `tests/audit-release/b2-evidence-gates.test.js:136-147` uses the actual deploy entrypoint in a temporary marked preview, keeps both pre-existing release bypass flags, requires nonzero exit **and the exact staging-preview message**, and forbids `preflight ok`. The production marker guard still precedes branch, tag, evidence, environment loading, and build operations (`scripts/deploy.mjs:559-570`). The B2 candidate-bound evaluator tests retain stale/wrong-policy failure, receipt/tree mismatch, required security-audit failure, and evidence-before-prebuild ordering (`b2-evidence-gates.test.js:84-131`). Only fixture construction changed.

- **B3 preserves the tag boundary and runtime-baseline checks.** `tests/audit-release/b3-release-rehearsal.test.js:19-41` overlays real current scripts/dependencies into its disposable clone and commits only that copied source list plus its marker. Its remote remains a nonexistent local path. Assertions at :49-58 still prove no matching tag exists, require successful pre-tag execution with `tag-gate-expects-missing`, then require post-tag exit 1 with the exact missing-tag/version and release-tag diagnostics. The approved older runtime remains the required deploy-diff base (:64-87). No assertions were relaxed or removed.

- **CLI entrypoint coverage remains intact.** `tests/audit-release/cli-entrypoints.test.js:40-55` uses the same helper and additionally copies the real release sequence, surface checker, evidence evaluator, verification-receipt module, and checkpoint contract. Both ordinary and URL-escaped checkout names remain (:26). Missing-tag refusal, symlink invocation, unsigned-tag refusal, clean-versus-drift surface behavior, candidate identity, and absent-executable-evidence refusal remain unchanged (:60-118). Git environment isolation is retained (:9-22). The helper replaces duplicated setup, not gate behavior.

- **C30/C31 remain strict.** The earlier `tests/ow-tools/sprint-t.test.js:325-347` repair changes literal expected versions to 1.3.1, matching the actual plugin/marketplace/security manifest. Manifest regeneration, exact network/output declarations, exact capability inventory, readiness, and CLI-help assertions remain. C28's program inventory and browser-download prohibitions remain untouched (:307-322).

**Execution evidence:** the fix agent reported `./node_modules/.bin/vitest run tests/audit-release tests/ow-tools/sprint-t.test.js` passed **45 tests in 5 files**, 22.35 seconds, with start time 18:02:28 local; its scoped `git diff --check` also passed. The fix agent confirmed no edits after the reviewed diff. These are that agent's executed results; this review did not rerun tests or independently reproduce the test run. Root's fullgatev5 remains separate evidence.

**Coverage limits:** B3 and CLI fixtures clone HEAD's 2.0.4 release seal and overlay implementation only. That seal has no `workCatalogSha256`; the 2.1 work-catalog and tools-pin requirements (`scripts/lib/work-release.mjs:42-55`, `scripts/check-release-tag.mjs:228-233`) are therefore outside those fixtures' coverage. These local tests do not prove remote signature verification/publication, a successful deployment, or complete 2.1 release readiness. Sharing the installed YAML package is deliberate fixture dependency setup, not a fresh dependency-install test.

Only this `/tmp` review report was written by this reviewer. No repository source, test, index, checkpoint, or frozen model capture was changed.
