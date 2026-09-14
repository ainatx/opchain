# opchain 1.9.2 bounded pre-deploy security review

**Date:** 2026-09-13  
**Candidate:** `/Users/aidanelsesser/repos/worktrees/opchain-release-1.9.2` compared with `origin/main` (`7234ad60b375ede708b8ee4fa17bf22b0d329600`)  
**Policy:** `pre-deploy-security-posture-v1`  
**Verdict:** **PASS**

## Scope

This was a bounded review of the accepted, uncommitted 1.9.2 candidate, limited to concrete HIGH or CRITICAL vulnerabilities in:

- local and hosted checkpoint storage boundaries;
- typed handoff trust and release-evidence consumption;
- Git hook and verification-receipt enforcement;
- reusable execution kits;
- prompt-evaluation and cost inputs;
- the new local/hosted MCP reference surface where it intersects those boundaries.

The review used the opchain 1.9.1 security-auditor risk matrix and the security-hardening rule that executable repository configuration must be replayed only from a reviewed, trusted checkout with an independent enforcement envelope.

## Findings

### [SA-192-01] Candidate-controlled evidence is a documented trust limitation

**Risk:** ACCEPTED / INFORMATIONAL after threat-model reassessment  
**Categories:** Trust-boundary documentation; software and data integrity  
**Scope:** CI candidate verification, local commit receipts, PR evidence, deploy evidence

**Observation:** The candidate supplies the verifier, `.bugcheck.json` policy, and audit checkpoint assertions used by the repository's gates. CI checks out the PR and then runs that checkout's `scripts/verify-candidate.mjs` and `scripts/lib/release-evidence.mjs` (`.github/workflows/ci.yml:21-36`). The verifier reads policy from the materialized candidate (`scripts/verify-candidate.mjs:247-283,405-423`), and the receipt verifier digest identifies those candidate-supplied verifier bytes (`:446-450,472-493`). Audit handoffs are structurally validated agent/human assertions rather than signed attestations (`scripts/lib/release-evidence.mjs:40-67,144-170`).

On reassessment, this is not a HIGH vulnerability under the accepted operating model. The A1/A2/A3 contracts explicitly define local receipts as correctness evidence rather than an unforgeable security boundary and require protected CI to execute checks against its own received candidate (`sprints/audit-remediation/A/A1-contract.md:44-46`, `A1-handoff.md:98-106`, `A2-handoff.md:44-52`, `A3-contract.md:43-44`). B2 explicitly calls the checkpoint verdicts human-produced handoffs and binds them to source while excluding the self-referential checkpoint directory (`sprints/audit-remediation/B/handoff.md:62-70`). The canonical audit closure repeats that local hooks are bypassable and not a security boundary, and records remote CI/branch protection as the remaining certification gap (`/Users/aidanelsesser/repos/opchain/sprints/audit-remediation/closure.md:9-15`). The published capability matrix says local/hosted checkpoint state conveys no commit authority and that protected CI must verify its candidate (`docs/capabilities.md:7-12`). For this release, the operator confirmed an active GitHub ruleset requiring a PR plus four CI checks and performed the sole-maintainer review. The ruleset requires zero separate approvals; that is a governance limitation, but it does not create an additional attacker path in the accepted sole-maintainer model. Changes to verifier, workflow, policy, or checkpoint claims are reviewed repository configuration. A malicious unreviewed branch changing its own workflow is the standard GitHub Actions boundary; it has not crossed protected main or the deploy-credential boundary.

**Residual risk:** The controls do not resist malicious verifier/policy/workflow changes that reviewers and the protected branch approve. Agent checkpoint verdicts establish candidate binding and expected workflow completion, not cryptographic assessor identity. Maintainers must treat changes to `.github/workflows/`, `.bugcheck.json`, the verifier/receipt/evidence code, and gate-producing checkpoints as security-sensitive review surfaces.

**Minimal truthful improvement:** Rename the CI step from “Verify the received commit independently” to “Verify the received candidate in CI,” and add an honest-limit sentence: the verifier, policy, workflows, and checkpoint assertions are reviewed repository configuration and are not tamper-resistant after approval into the protected branch. A stronger supply-chain threat model would require a pinned external verifier/minimum policy and protected attestations, but that is a scope expansion rather than a patch-security requirement under the accepted model.

**Disposition:** Non-blocking accepted limitation; no silent waiver. Severity was lowered because the relevant adversary has not crossed the documented review and protected-branch trust boundary, and the implementation satisfies the promised independent *execution* from copied local receipts.

### [SA-192-02] Local MCP reference symlink escape

**Risk:** HIGH before remediation; **FIXED AND VERIFIED** in the reviewed release candidate  
**Categories:** STRIDE Information Disclosure; path traversal / improper resource confinement  
**Scope:** local MCP `resources/read` with a configurable `OPCHAIN_SKILLS_DIR`

**Original problem:** URI normalization rejected literal traversal, but the local loader enforced containment only on the unresolved path string and then followed filesystem symlinks. A malicious or compromised skill tree could expose predictable same-user-readable files through an `opchain://skill/.../references/...` URI.

**Remediation reviewed:** `mcp/local-server.mjs` now canonicalizes the configured skills root, checks every path component with `lstat`, rejects symbolic links and non-regular targets, uses `O_NOFOLLOW` plus descriptor `fstat` for reads, and requires reference reads to match a startup-frozen manifest entry by path, size, and SHA-256 digest. It also preflights symlinked `orchestrator.md`, `SKILL.md`, and `references` entry points before catalog construction and applies the trusted-file read path to skill bodies.

**Verification:** `tests/audit-state/c1-local-reference-containment.test.js` exercises external file and directory symlinks, confirms neither is advertised or readable, confirms the external content does not appear in output, preserves canonical and legacy reads for a regular reference, and rejects a symlinked `SKILL.md` before catalog/body loading. The focused local MCP suite passed: **3 files, 45 tests**. Source review found no remaining lexical fallback around the manifest-bound trusted read path.

**Disposition:** Closed for this candidate. Residual same-user filesystem races outside the checked/opened descriptor and the trust placed in the explicitly configured skills root are ordinary local-process boundaries; this review did not establish a HIGH/CRITICAL exploit after the fix.

## Reviewed areas without an additional HIGH/CRITICAL finding

- Durable local checkpoint writes validate skill/session identifiers, require issued sessions, use same-directory temporary files, atomic rename, compare-and-swap, and strict envelope validation. The implementation still relies on lexical project paths and Linux `PATH` lookup for `flock`; those deserve hardening, but this bounded review did not establish a HIGH/CRITICAL exploit in the accepted operating model.
- Hosted checkpoint state remains advisory under the documented contract. Release evidence consumes explicit agent/human assertions only after source binding and within the protected-repository operating model described in SA-192-01.
- The role runner explicitly declares `isolation: none`, uses argv execution with `shell: false`, snapshots the manifest before asynchronous work, and bounds retries, time, and output. It is an opt-in native-code runner and has no non-test consumer in this candidate. Treating an untrusted manifest as safe would be a caller vulnerability, but no such production call path was found here.
- The SQL-expression adapter uses a narrow tokenizer/parser and does not execute SQL.
- Prompt evaluation requires explicit adapter and credential selection and its result/baseline schemas fail closed. The HTTP adapter permits cleartext endpoints and has no request timeout, and datasets have no size/case cap while cost enforcement is post-run. Those are meaningful hardening gaps and possible cost/availability risks, but explicit local invocation kept them below HIGH in this bounded assessment.
- `npm audit --omit=dev --audit-level=high` reported zero production vulnerabilities.

## Validation

- `npx --no -- vitest run tests/audit-state tests/audit-commit tests/audit-release tests/audit-kits tests/audit-eval`: **20 files passed, 134 tests passed**.
- `npx --no -- vitest run tests/audit-state/c1-local-reference-containment.test.js tests/audit-state/c1-mcp-routing-references.test.js tests/audit-state/c3-fresh-mcp-journey.test.js`: **3 files passed, 45 tests passed** after the SA-192-02 fix.
- Production dependency audit: **0 high, 0 critical**.
- No external systems were changed and no deployment was attempted.

## Limits

This was a source review against `origin/main`, not a penetration test or full OWASP/infrastructure assessment. It did not inspect live Cloudflare settings, hosted KV authorization internals, secret-store policy, or deployed HTTP/TLS/DNS behavior. GitHub ruleset facts were supplied by the release operator rather than independently queried in this review. The worktree contained a large accepted uncommitted change (more than 250 changed paths); review depth was intentionally concentrated on the trust boundaries above. Passing tests establish implemented behavior within the reviewed local environment.

The `pre-deploy-security-posture-v1` verdict is **PASS**: no open HIGH or CRITICAL finding remains within this bounded scope. SA-192-02 is fixed and verified in the release candidate. SA-192-01 is a documented, non-blocking trust limitation after explicit reassessment against the accepted protected-repository model.

## CI-only follow-up

The coordinator reviewed adding the existing documentation sync to pretest and passing the existing job token only to the roadmap generator's GitHub read step. No new secret, permission scope, endpoint, runtime authorization, or bypass was added. The real-data browser assertions remain enforced.

The second remote run passed the Worker gate. Its authenticated roadmap request returned no issues because the browser job lacked the endpoint's Issues read permission. The browser job now explicitly requests issues:read while preserving its existing contents:read and pull-requests:write permissions. This is a read-only scope addition limited to that job; no stored credential or write permission is added. The generator and real-data assertions remain unchanged. Reference: https://docs.github.com/en/rest/issues/issues#list-repository-issues.

## Post-tag site review

The coordinator reviewed the six-file site patch after v1.9.2 was signed and pushed. Changes are release copy, counts and the matching browser expectation; product runtime code is unchanged from tag 7ccdacf04c9ac59f62309c371de357acd9b81839. Mechanical release-surface checks and all 22 focused changelog/scenario browser tests pass with actual roadmap data. No new executable content, external dependency or permission is introduced. The PASS verdict extends to this source change, with fresh full candidate/CI verification required before staging.
