# Workstream A — A3 Coordinator Integration Request

These shared/package changes are intentionally not authored by workstream A.

1. Copy the three canonical A-owned runtime sources into the generated plugin
   artifact at these exact paths:
   - `scripts/install-git-drivers.mjs` → `plugins/opchain/scripts/install-git-drivers.mjs`
   - `scripts/verify-candidate.mjs` → `plugins/opchain/scripts/verify-candidate.mjs`
   - `scripts/lib/verification-receipt.cjs` → `plugins/opchain/scripts/lib/verification-receipt.cjs`
   The `/oc-enroll` wrapper depends on this layout. Package all three together.
2. Add the desired root package command for direct candidate verification; the A2
   suggestion remains `verify:candidate = node scripts/verify-candidate.mjs run`.
3. Add protected CI verification of the received commit using the same declared
   policy. Do not treat a local receipt as a protected-CI trust boundary.
4. Regenerate the coordinator-owned plugin mirror of
   `skills/oc-bug-check/SKILL.md` and all authoritative bundle/catalog outputs.
5. Update the coordinator-owned plugin README hook table: registered plugin hooks
   are now SessionStart and Stop only; `/oc-enroll` installs the Git `pre-commit`
   authorization boundary. Describe explicit enrollment, foreign-hook `BLOCKED`
   behavior, and the `--no-verify` limitation.
6. Update `skills/README.md` and the plugin manifest description so plugin install
   alone is not described as active commit enforcement: the user must run
   `/oc-enroll` successfully in each repository.
7. For the repository's protected CI verifier policy, install both root and site
   dependencies. Candidate materialization automatically mounts `node_modules`
   directories only beside candidate `package.json` files. Git-aware checks receive
   an isolated one-commit repository, not live history or refs.

## Verification commands after integration

```text
npx vitest run tests/audit-commit/receipt.test.js tests/audit-commit/compatibility.test.js tests/audit-commit/candidate-verifier.test.js tests/audit-commit/commit-boundary.test.js tests/audit-commit/enrollment.test.js tests/install-git-drivers.test.js
node plugins/opchain/hooks/test-gate.cjs
git diff --check
```
