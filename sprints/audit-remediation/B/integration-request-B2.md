# B2 coordinator integration request

B owns the evaluator but not shared package or workflow files. Apply these exact
integration changes after B2 review.

## package.json

Add:

```json
"evidence:pr": "node scripts/lib/release-evidence.mjs --stage pr",
"evidence:deploy": "node scripts/lib/release-evidence.mjs --stage deploy"
```

## .github/workflows/ci.yml

In a required PR job, after checkout and dependency installation, verify the
received commit itself and then consume candidate-bound Docs/Repo handoffs:

```yaml
- name: Verify received commit candidate
  run: node scripts/verify-candidate.mjs run --repo . --json
- name: Enforce PR evidence
  run: npm run evidence:pr
```

Do not upload or reuse a developer's receipt. A receipt's repository identity is
checkout-specific, and CI must execute the verifier against `github.sha` in its
own clone. Docs Forge and Repo Ops typed checkpoints must bind the evaluator's
`git_tree_projection` identity (all HEAD files except `.checkpoints/`). The
projection prevents the tracked evidence file from hashing itself while still
invalidating evidence when source content changes. If checkpoints are downloaded
into a separate artifact directory, invoke the evaluator with
`--checkpoint-dir <directory>`.

Make the PR evidence step required in branch protection. No compliance step is
added to PR CI; deploy compliance remains conditional and warn-only.

## Producer handoff contracts

Ensure audit producers emit C-contract `verification.verdict` handoffs using the
candidate identity printed by
`node scripts/lib/release-evidence.mjs --print-candidate --json`:

- `oc-code-auditor`: policy `pre-deploy-code-audit-v1`.
- `oc-security-auditor`: policy `pre-deploy-security-posture-v1`.
- `oc-compliance-ops`: policy `deploy-compliance-evidence-v1`; missing, stale,
  FAIL, or INCOMPLETE remains WARN and never blocks deployment.

Docs Forge and Repo Ops producer instructions are included in B-owned skill
files with policies `pr-docs-v1` and `pr-readiness-v1` respectively.
