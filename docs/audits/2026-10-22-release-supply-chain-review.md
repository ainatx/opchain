# Release preparation supply-chain security review

**Date:** 2026-10-22
**Assessor:** Independent `oc-security-auditor` review
**Scope:** Release distribution, immutable plugin pins, Work catalog sealing,
public mirror freshness, and the ow-tools model-integrity changes.
**Tier:** Standard, scoped threat-model and integrity review. This is not a
whole-product posture assessment or deployment audit.
**Target:** Working tree at
`/Users/aidanelsesser/.codex/worktrees/ow-handoff-completion/opchain`, based on
`0706fbb0679e364316747bf039910bdb87ea84fb`, including its uncommitted release
preparation changes.
**Verdict:** **PASS for this scoped source review after remediation.** One
MEDIUM finding was identified and its integrated fix inspected; no new open
findings remain in scope. This does not establish a passing test run, a public
release pin, a successful installation, or deployment readiness.

## Assessment boundary

The source repository and its authorized release signer are the trust root.
The reviewed assets are executable plugin content, marketplace descriptors,
text-only skill downloads, the signed release's integrity records, and the
model content used for confidential local transcription. Relevant adversaries
include a compromised public mirror, stale release automation, mutable model
references, and accidental or unauthorized content drift between review and
release.

An attacker already able to replace the release-checking code or execute code
as the release operator can bypass these controls. The review does not claim
host isolation, protection against malicious repository administrators, or
continuous monitoring of the public marketplace.

The existing code-auditor checkpoint describes an older deployed revision and
was used only for historical scope. It is not evidence that this working tree
passed a current code audit. The preceding independent review's archive,
seal-inventory, stale-mirror, and marketplace-overlay fixes were inspected in
the integrated source. No product files or checkpoints were changed by this
review.

## Trust boundaries and observed controls

| Boundary | Threat | Observed control and limit |
|---|---|---|
| Reviewed text skills → public archives | Extra executable content, source-file leakage, or output overwriting source | `make-work-skills-zip.mjs` validates the catalog and cross-skill contracts before publication. The catalog rejects symlinks, hidden/unsafe names, executable bits, and non-text file extensions. Required top-level files must be regular files. Existing and not-yet-created output paths are canonicalized before checking for source overlap. Archive ordering and timestamps are fixed. Concurrent hostile filesystem mutation is outside this local build threat model. |
| Public archive → installed skill | Corrupted or substituted download | Per-skill and combined ZIP SHA-256 values accompany the artifacts. The runbook correctly calls these byte-integrity checks: their shared download origin is not an independent signature. Actual host recognition remains untested in this review. |
| Reviewed plugin → public snapshot → marketplace | Mutable source pointer or marketplace-supplied executable overlay | Pin preparation verifies the allowed public repository, full commit, local tag and actual remote tag, complete plugin inventory, content, and pinned security-manifest file table. The record retains every runtime file's SHA-256 and executable mode; subsequent checks enforce equality against current and tagged source. The descriptor allowlist rejects runtime overlays. Only the marketplace descriptor and generated security manifest intentionally differ across the two publication steps. Actual public publication and installation remain pending. |
| Work catalog → source release seal → signed tag | Same-version skill substitution or omission from the seal | The release manifest includes per-skill versions and complete file hashes, protocol hash, and plugin pin-record hash. The release checker compares current source, HEAD, and the tag's actual inventory/content, including the exact marketplace descriptor. Releases from 2.1 require this binding; older releases retain their original format. |
| Source main → force-pushed public mirror | A delayed run restoring stale install metadata | The workflow serializes mirror jobs and compares current source main against the job's source SHA immediately before pushing. A change to any mirrored input suppresses the stale push; unrelated changes do not. The cross-repository check and push remain non-atomic, as the runbook explicitly states. Final marketplace verification is still required. |
| Publisher/model cache → native transcription processes | Mutable model reference or same-size weight substitution | Whisper is SHA-256 checked on every transcription before ffmpeg, whisper-cli, or Python starts. Python fetch and offline inference receive the same exact pyannote revision, CLI choices prohibit arbitrary revisions, readiness checks that revision's configuration, and returned provenance must match. The revision is not a separate digest audit of every cached pyannote weight. |
| User credential → model setup → ordinary transcription | Setup credential or audio reaching a network-enabled runtime | The existing user-run fetch boundary is retained. Ordinary transcription removes token environment variables, sets offline flags, uses `uv --frozen --no-sync`, and Python refuses a run without the offline flag. No fetch, gated download, or actual model execution was performed here. |

## Finding: SA-REL-01 — retain runtime equivalence after pin preparation

**Pillar:** Threat model
**Risk:** MEDIUM
**Category:** Tampering / release integrity
**Scope:** `scripts/prepare-ow-tools-pin.mjs`,
`scripts/lib/ow-tools-release.mjs`, `scripts/lib/work-release.mjs`
**Status:** Remediated in the integrated preparation code; independently
verified by source inspection. Regression execution is owned by the gate runner.

The initial preparation helper compared the plugin's complete contents against
the selected public snapshot, but the resulting integrity record retained only
the source pointer and security-manifest/marketplace digests. Subsequent
`checkOwToolsPin` and tagged Work-release checks did not rebind the local or
tagged plugin runtime to those reviewed contents. A same-version plugin change
after pin preparation could therefore leave the release checks accepting an
older installed snapshot while source review and tests covered newer code,
including a security fix.

The integrated remediation retains the exact noncircular plugin inventory as
`runtimeFiles`, with a SHA-256 and Git executable mode for every file.
`owToolsRuntimeFiles` rejects filesystem symlinks and nonregular files;
`owToolsGitRuntimeFiles` rejects symlink/submodule modes and reads exact binary
blobs. `checkOwToolsRuntimeFiles` verifies the record shape, exact path inventory,
digests, and modes. Only `.claude-plugin/marketplace.json` and
`SECURITY-MANIFEST.md` are excluded; their separate bindings avoid the circular
pointer hash.

Evidence: `scripts/lib/ow-tools-release.mjs:12`, `:35`, and `:57` implement these
checks; `scripts/prepare-ow-tools-pin.mjs:36` verifies the selected public tree
before writing the record, and `:75` rechecks the current tree.
`scripts/lib/work-release.mjs:64` checks both the current and specified Git tree
against the recorded inventory. The release gate's Git adapter preserves raw
bytes when requested. Focused regression cases cover changed, added, removed,
mode-changed and symlinked runtime files; tagged additions/removals,
symlink/submodule modes and binary substitutions; and the real Git adapter.
These cases were inspected, not executed by this reviewer.

## Evidence and verification limits

- Read the security-auditor skill, its orchestrator and report references,
  the relevant source/helpers, mirror workflow, distribution runbook,
  model-provenance note, and focused regression-test sources.
- Inspected archive symlink containment, exact Work seal inventory, descriptor
  allowlisting, mirror freshness handling, and model argument/hash ordering.
- Ran one read-only local release-state diagnostic. It returned
  `ow-tools-release.json is missing; pin a durable public mirror snapshot before
  the release cut`; `work-release.json` was absent and `release-seal.json`
  had no `workCatalogSha256`. These are expected pre-release blockers, not a
  fabricated publication result.
- Did not run the full gate or focused test suites; another runner owns gate
  execution. Inspection of test cases is not reported as a passing test run.
- Did not independently refetch the model publisher metadata. The existing
  `2026-10-22-rel-01-model-provenance.md` records that primary-source check;
  this review assesses how the declared revision is enforced in code.
- Did not create, move, sign, or push tags; publish a marketplace; install the
  plugin into a real host; download or execute models; or deploy anything.

## Checks still required before release

Historical **SA-001 remains open** until the real durable public snapshot tag,
its actual commit, published marketplace pin, independently published pinned
manifest hash, and clean-host installed-cache match are evidenced. The helper
and simulated regression cases cannot establish those facts.

Model-integrity code addresses the relevant **SA-004** behavior, subject to the
documented cache-integrity limit. Successful gated setup, real transcription,
performance, real model routing, actual client jobs, and calendar-based
acceptance evidence remain separate checks.

Current code/dependency gate results, release-surface checks at the actual cut,
the final signed source release seal, staging/production runtime security
audits, deployment authorization, and post-deploy checks are all outside this
scoped verdict and remain pending. No conclusion here authorizes a release or
deployment.

## Coordinator verification addendum

The integrated focused run passed all 137 tests across seven files, including
distribution/runtime binding, release-tag checks, model provenance, shared
approval/close-state and both grader-format regressions. This supplements the
independent source review; public pin/install and final release gates remain
pending. Log: `/tmp/opchain-preparation-focused.log`.
