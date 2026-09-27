# Frozen simulation plan — Opchain 2.0 release gate

Frozen before scenario execution on 2026-09-14. Candidate: `63bb189dabb7c98b2fd961f11de144925a6e9519`, including comparison integration. Original candidate: `<worktree>/opchain-oc-update-v2`; disposable audit clone: `<worktree>/opchain-v2-simulation`. Release and comparison owners acknowledged HOLD. No release actions or fixes are part of this audit.

## Oracle and evidence discipline

Use the user-selected oc-code-auditor 1.9.1 audit method and oc-bug-check. The product under test is the candidate's 2.0 packaged skills, runtime references, policy and hooks, not the globally installed 1.9.1 behavior. Read both source and packaged contracts. Current executable contracts take precedence over historical plans where a documented decision supersedes them; contradictions between live skill contracts remain findings. Check prior findings to avoid presenting known blockers as new discoveries.

Each scenario has a narrative simulation (actual skill instructions followed and artifacts created) and executable probes against shipped code. Mark every result as observed execution, static contract comparison, synthetic fixture, or untested external prerequisite. A test double is never a live provider, human approval, production deployment or proof of model improvement. Preserve command, exit code, expected outcome, actual outcome, artifacts and candidate identity. Expected refusals count as passing safety behavior; inability to complete a promised ordinary workflow is a gap. Existing suites supplement newly composed end-to-end scenarios; they do not substitute for them.

## S1 — Interrupted mixed-host upgrade of a governed application

Persona: a team has a mature application, Claude skills, legacy Codex skills, a custom unrelated skill, checkpoint history, existing local learning state and separately enabled/disabled telemetry variants. They request `/oc-update check`, then `/oc-update`, and the update is interrupted mid-install.

| Step | Expected skill / invocation | Expected output and invariant |
|---|---|---|
| 1 | oc-update: detect consuming installation, packaged `scripts/update.mjs --check` | Read-only installed/available version report; no fresh duplicate install for plugin-only user |
| 2 | oc-update: packaged updater, both host targets in a fixture | Verified release bundle, full runtime closure, install receipt, replaced-file backup; unrelated skills and checkpoint/consent bytes preserved |
| 3 | oc-checkpoint-protocol: bundled `opchain.mjs checkpoint status/validate` | Consumer-root resolution, same checkpoint history, no authoring-repo dependency |
| 4 | oc-telemetry-ops: status only | Consent unchanged; enabled unhealthy database yields exit 2, no fabricated database or re-enable |
| 5 | oc-update: interrupt and `opchain.mjs recover <backup> --check`, then recover | Journal-backed recovery; no blind lock removal, mixed install or deletion outside owned files |
| 6 | Repeat update; malformed bundle, symlink/outside path, changed local file variants | Idempotent or explicit refusal with originals preserved; no download failure presented as success |
| 7 | Source checkout branch variant, source `--check` / sync | Uses current source, no fetch/branch switch; packaged mirror consistency |

Hooks: update must not install/change host hooks or global caches. Existing checkpoint/session hooks remain as configured. Expected artifacts: fixture inventory and byte hashes before/after, bundle/receipt/journal, recovery outputs, runtime status and probe log. No real public update endpoint installation is authorized or needed for the local simulation; transport uses explicitly labeled fixture data.

## S2 — Repeated failures → reviewed operational memory → proposed behavior change

Persona: a multi-tenant incident-response application repeatedly mishandles authorization error paths across three actual fixture outcomes, with six scored history rows for trend measurement. It also receives duplicate reports, a conflicting score for the same run, and a malicious retrieved instruction. User asks `/oc-hindsight harvest`, then `/oc-evolve reflect`.

| Step | Expected skill / invocation | Expected output and invariant |
|---|---|---|
| 1 | oc-app-architect /oc-build and oc-code-auditor outputs represented by clearly synthetic committed fixture reports | Three distinct failure outcomes, preserved source anchors; no invented real-world incidents |
| 2 | oc-checkpoint-protocol + runtime `learning history ingest/list`, `learning scorecard report` | Stable identity, duplicates do not inflate recurrence, conflicts rejected, normalized scores, 3-event floor and 6-event decline |
| 3 | oc-hindsight Planner → Generator → isolated Evaluator | Frozen source/acceptance contract, source-grounded candidate, independently written content/provenance verdict; hostile instructions rejected by evaluator, not executed |
| 4 | Packaged `learning hindsight stage`, query/context | Staged digest, evidence digest, project ID; default-off delivers no content, staging never activates |
| 5 | Missing/untrusted/replayed activation attempt | Exact refusal; no local trust manufacture or signature pretending to be user approval |
| 6 | oc-evolve Planner → Generator → isolated Evaluator; oc-prompt-ops task runner | Frozen baseline/task split/policy, proposed rule, target/heldout/full measurements; changed policy/dataset, routing-only or synthetic evidence cannot authorize adoption |
| 7 | `learning evolve adopt` with insufficient approval/evidence | Remains staged; genuine external before/after and independent signer remain prerequisites when absent |
| 8 | Disable switches, corrupted state, stale/retired/tampered fixture records, concurrent writer | Read-time refusal/empty retrieval; no CLAUDE.md/AGENTS.md injection, no telemetry side effect |

Hooks: neither harvest nor enable automatically installs hooks. `context [skill]` is the manual adapter; SessionStart/Stop behavior must match the shipped hooks. Automatic retrieval is a separate setup requirement. Existing cryptographic positive-path tests may use test keys solely as synthetic tests, never to activate real lessons. Expected artifacts: source reports, frozen contract, candidates, evaluator report, task-run evidence marked synthetic, lifecycle log and explicit prerequisite gaps.

## S3 — Release with stale evidence, concurrent edits and rollback pressure

Persona: a governed multi-package AI service has a finished UI including the comparison page, changes queued for commit, linked release paperwork, hardening/compliance manifests, and a prior passing audit. A second edit arrives after verification; stale checkpoint/receipt and missing tag tempt premature shipping.

| Step | Expected skill / invocation | Expected output and invariant |
|---|---|---|
| 1 | oc-git-ops /oc-commit → oc-bug-check run --all; explicit /oc-enroll in fixture | Actual Git pre-commit boundary, immutable effective index materialization, declared checks, create-once receipt bound to tree/policy/toolchain/verifier; checkpoint alone cannot authorize |
| 2 | Stage another edit, swap receipt, vary Git environment/index; foreign hook | Re-run or block changed candidate, reject foreign/tampered evidence; preserve foreign hook and print integration guidance |
| 3 | oc-docs-forge /oc-docs pr → oc-repo-ops /oc-repo verify → oc-git-ops /oc-pr | Documentation packet and candidate-bound PR evidence; missing/stale/wrong-scope evidence blocks |
| 4 | oc-release-ops plan/draft/bump/ship, oc-git-ops tag handoff (local rehearsal only) | Version/seal/catalog parity; pre-tag permits intended absence, post-tag refuses missing/mismatched tag |
| 5 | oc-code-auditor pre-deploy + oc-security-auditor; oc-security-hardening /oc-harden gate; oc-compliance-ops where manifest exists | Scoped current evidence, findings/counts/grade, required conditional gates; HIGH/CRITICAL closure not fabricated |
| 6 | oc-deploy-ops staging/production gate (no network deploy), oc-monitoring-ops rollback/readiness | Missing approvals or stale runtime evidence block; rollback tracks approved deployed runtime rather than later docs-only HEAD |
| 7 | Updated comparison page and runtime closure | Candidate's build, types, comparison tests/browser behavior and package checks; volatile external claims not re-researched in this code simulation |

Hooks: inspect actual plugin hooks and installed Git hook; explicitly compare oc-git-ops prose against oc-bug-check's new Git-boundary contract. SessionStart and Stop provide state/suggestions, not deployment authorization. No PM messages, external PRs, tags on source repo, deployments or notifications. Expected artifacts: disposable Git histories, verifier receipts and refusals, PR/deploy evidence fixture results, release-stage results, comparison validation and hook inventory.

## Gate and final comparison

Run the candidate's `.bugcheck.json` required checks in the immutable candidate verifier, retain full receipt/results and report strict-mode or scan discrepancies without altering policy. Perform applicable auditor sweeps: security (file/path/trust/receipt boundaries), performance (bounded local storage and runner time), quality (contracts/error handling), configuration (packaging/host matrix), UX (comparison tests), AI safety (untrusted inputs, eval authenticity, privilege and adoption boundaries). No Fixer implementation: this is an as-is release decision.

GO requires all three scenarios' required behavior, a passing declared bug-check, and no unresolved release-blocking contract or external acceptance gap. Report partial/blocked external stages candidly. NO-GO does not authorize remediation or lifting the release hold. Preserve all source work and keep the held candidate SHA clean.
