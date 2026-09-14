# B1 handoff — release phases and required checks

Baseline: `aef40809fef4bbded9a47c936c7c544631397fb6` (v1.9.1 product-half
release). B1 and B2 are accepted; B3 is complete and awaiting independent
review.

## Checklist

- [x] Separate pre-merge, pre-tag, post-tag, and post-deploy verification.
- [x] Make missing required tooling fail or report INCOMPLETE, never authorize.
- [x] Reconcile local post-deploy monitoring with the CI approved-baseline and
  deploy-relevance policy.
- [x] Define and check the full release-version inventory.
- [x] Record focused verification and baseline-relative files.

## Verification evidence

These are the original B1 verification commands and results; no new test run
was added for this documentation closeout.

- `npx vitest run tests/audit-release/b1-release-gates.test.js tests/release-sequence.test.js tests/release-surfaces.test.js tests/check-release-tag.test.js tests/cloudflare-monitor.test.js` — PASS, 5 files / 73 tests.
- `node scripts/release-sequence.mjs --list` — PASS; all four phases listed,
  including post-tag and approved-baseline/deploy-relevance rows.
- `node scripts/release-sequence.mjs --stage post-tag` — PASS; valid v1.9.1
  tag verified.
- `node scripts/check-release-surfaces.mjs` — PASS; site labels and all full
  semver surfaces agree on 1.9.1.
- `git diff --check` — PASS.

## Baseline-relative changed files

- `scripts/release-sequence.mjs`
- `scripts/check-release-surfaces.mjs`
- `skills/oc-release-ops/SKILL.md`
- `skills/oc-release-ops/references/version-locations.md`
- `tests/audit-release/b1-release-gates.test.js`
- This handoff file.

## Dependencies and deferred work

- F07's B-owned evidence consumer is implemented below against the
  coordinator-accepted A receipt and C checkpoint interfaces.
- No external actions, commits, generators, releases, deployments, or PM
  messages were performed by this handoff.
- Residual risk: post-deploy control-plane checks require the operator's
  Cloudflare credentials and a reviewed baseline refresh after intentional
  deployment.

# B2 handoff — candidate-bound PR and deploy evidence

## Goal

Implement one shared evaluator for required PR Docs/Repo evidence and deploy
audit evidence, bind every result to the candidate artifact, wire the owned
deploy chokepoint, preserve compliance as warn-only, and provide exact requests
for coordinator-owned CI/package integration.

## Checklist

- [x] Revalidate the v1.9.1 F07 residual before coding: PR readiness was
  prose-only and the deploy entry point did not consume audit evidence.
- [x] Consume A's canonical executable-verification receipt for the exact
  repository and HEAD tree.
- [x] Consume C-contract `verification.verdict` handoffs for required PR and
  deploy evidence.
- [x] Bind human-produced handoffs to a SHA-256 `git_tree_projection` covering
  every HEAD entry except `.checkpoints/`, avoiding a self-referential tracked
  evidence file.
- [x] Fail clearly for missing, stale, ambiguous, invalid, FAIL, or INCOMPLETE
  required evidence.
- [x] Keep conditional compliance evidence warn-only.
- [x] Run the deploy evaluator before build or platform mutation.
- [x] Document exact coordinator-owned package/CI changes and producer
  contracts in `integration-request-B2.md`.
- [x] Verify with disposable fixtures and syntax/diff checks.
- [x] Independent B2 review accepted the implementation and coordinator-owned
  integration.
- [x] B3 started after B2 integration.

## Verification evidence

- `npx vitest run tests/audit-release/b2-evidence-gates.test.js tests/audit-release/b1-release-gates.test.js tests/check-release-tag.test.js tests/release-sequence.test.js tests/release-surfaces.test.js` — PASS, 5 files / 55 tests.
- `node scripts/lib/release-evidence.mjs --print-candidate --json` — PASS;
  reported baseline commit `aef40809fef4bbded9a47c936c7c544631397fb6`, tree
  `55a805d433775636763913b98c11ba55f0e0f9ea`, and a
  `git_tree_projection` SHA-256 identity.
- `node scripts/lib/release-evidence.mjs --stage pr --json` — expected FAIL;
  the live checkout has no matching A PASS receipt for its current candidate,
  demonstrating fail-closed behavior rather than treating a checkpoint PASS as
  executable proof.
- `node --check scripts/lib/release-evidence.mjs` — PASS.
- `node --check scripts/deploy.mjs` — PASS.
- `git diff --check` — PASS.

## B2 baseline-relative changed files

- `scripts/lib/release-evidence.mjs`
- `scripts/deploy.mjs`
- `skills/oc-docs-forge/SKILL.md`
- `skills/oc-repo-ops/SKILL.md`
- `skills/oc-git-ops/SKILL.md`
- `skills/oc-deploy-ops/SKILL.md`
- `tests/audit-release/b2-evidence-gates.test.js`
- `sprints/audit-remediation/B/integration-request-B2.md`
- This handoff file.

## Integration and risk

- The coordinator applied `integration-request-B2.md`: the evidence aliases and
  checks now sit in the existing Worker CI job. A copied developer receipt is
  intentionally unusable because repository identity is checkout-specific.
- Audit producers outside B ownership must emit the exact C handoff policies
  named in the integration request. Docs Forge and Repo Ops producer guidance
  is updated in B-owned skill files.
- The deploy gate now blocks before build/platform mutation when executable,
  code-audit, or security-audit evidence is absent or invalid. Deployments with
  a compliance profile still only warn for absent or invalid compliance
  evidence.
- No release, push, deploy, remote message, shared/generated/CI/package edit,
  or commit was performed.

## Estimate

- B3 implementation is complete. Independent B3 review is estimated at 20–40
  minutes; A's runtime-materialization repair remains a separate dependency for
  an actual full CI candidate run.

# B3 handoff — disposable release/failure rehearsal

## Goal

Exercise the release failure boundaries without a real tag, release, deploy, or
network call; retain B1/B2 coverage where it already proves the behavior; add
only the two missing end-to-end journey assertions.

## Checklist

- [x] Create a disposable local clone with no tags and an intentionally
  unreachable local `origin`; no source checkout or remote is changed.
- [x] Copy only B1's uncommitted owned release scripts into that fixture and
  create one fixture-only commit so the clean-tree gate is meaningful.
- [x] Prove an untagged v1.9.1 candidate passes pre-tag (where `missing-tag` is
  expected) but fails post-tag with an actionable missing-tag refusal.
- [x] Prove an approved older runtime remains the deploy-diff base when newer
  documentation-only changes exist on `main`.
- [x] Reuse B1's required-browser-tooling assertions: unavailable Playwright
  and LHCI are fail-class INCOMPLETE, never authorization.
- [x] Reuse B2's stale, invalid, missing, and INCOMPLETE candidate-evidence
  assertions; required evidence fails while compliance remains warn-only.
- [x] Reuse B1's complete six-surface full-semver inventory and run the live
  release-surface checker (all 18 reported rows agree).
- [x] Record the actual CI-candidate limitation below.
- [ ] Independent B3 review pending; no further B work is active.

## Verification evidence

- `npx vitest run tests/audit-release/b3-release-rehearsal.test.js` — PASS, 1
  file / 2 tests.
- `npx vitest run tests/audit-release/b3-release-rehearsal.test.js tests/audit-release/b2-evidence-gates.test.js tests/audit-release/b1-release-gates.test.js tests/check-release-tag.test.js tests/release-sequence.test.js tests/release-surfaces.test.js` — PASS, 6 files / 57 tests.
- `npx vitest run tests/cloudflare-monitor.test.js` — PASS, 1 file / 23 tests.
- `node scripts/check-release-surfaces.mjs` — PASS: 11 live-claim/minor rows,
  newest changelog line, and all six full-semver installation surfaces agree on
  v1.9 / 1.9.1.
- `node scripts/release-sequence.mjs --list` — PASS: required browser and
  Lighthouse rows remain `fail` class and post-tag remains a distinct gate.
- `node --check tests/audit-release/b3-release-rehearsal.test.js` and `git diff --check` — PASS.

## B3 baseline-relative changed files

- `tests/audit-release/b3-release-rehearsal.test.js`
- This handoff file.

## Limitation and remaining estimate

- The B3 clone test is local-only and its sole commit is destroyed with the
  temporary fixture. It does not create a tag or contact a remote.
- B1 proves browser absence is blocking by exercising the release-sequence
  missing-tool branch structurally; this environment did not force a second
  browser-cache-absent pre-merge run because that path would also execute the
  full build/test ledger.
- The coordinator integrated B2's CI aliases/steps, but an actual CI candidate
  execution remains blocked by A's runtime-materialization fix. The CI must run
  A's verifier in its received checkout; a locally copied receipt is not proof.
- Independent B3 review: 20–40 minutes. No additional B implementation is
  estimated unless review finds a concrete residual.
