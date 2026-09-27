# Opchain 2.0 simulation audit — 36/36 skills exercised; NO-GO as-is

**Candidate:** `63bb189dabb7c98b2fd961f11de144925a6e9519`, including the comparison page. **Coverage:** all 36 catalog skills exercised through seven complex scenarios. **Scoped audit grade:** C. **Open product findings:** 1 HIGH, 3 MEDIUM. **Release decision:** NO-GO as-is. The original candidate and real index remain unchanged; other release workstreams remain held. No product remediation, publication or approval was performed.

## What 100% means

Every skill has at least one substantive declared workflow with actual scenario inputs, outputs or an actionable refusal, and expected-versus-observed evidence. Planning counts when it is the skill's requested operation; a blocked gate counts as exercised, never as passed. Checkpoint Protocol is exercised through its persistence/validation runtime, since it has no slash command. Skill mentions, installed directories and generic unit tests are excluded.

This is **100% skill-level simulation coverage**, not every command, execution branch, host, external integration or full lifecycle. Several workflows remain partial or blocked. Domain fixture code was authored by agents following skill instructions; it is distinguished from tests that execute shipped Opchain runtime. Model behavior, real data and infrastructure cannot be certified by these fixtures. The original three scenarios did not cover the whole catalog; four additional scenarios supplied the missing workflows.

The frozen plans are PLAN.md and EXPANSION-PLAN.md, with pre-execution SHA-256 files. `coverage.json` lists each skill once with invocations, loaded contract, input/output paths, outcome, limits and evidence provenance. `COVERAGE.md` is the human-readable matrix. The validation script checks the union against the candidate's actual SKILL.md inventory and verifies evidence files exist. Independent reviewers additionally accepted all eight S4 and nine S7 coverage entries, while recording their limitations.

## Scenario comparison

| Scenario | Unique assigned skills | Observed evidence | Expected-versus-observed result |
|---|---:|---|---|
| S1: interrupted mixed-host update | 3 | 20 new assertions; 103 supplemental tests | 15/20 scenario checks pass. Recovery, preservation and idempotence work; five mismatches expose one telemetry-authority reporting defect. |
| S2: repeated failures → memory/rule proposal | 2 | 24 boundary probes; 38 supplemental tests; isolated evaluator | Runtime safety refusals pass. Malicious lesson rejected. Safe lesson's evaluator provenance packet remains partial. Synthetic task baseline cannot authorize a rule. |
| S3: changing commit/release evidence | Supporting coverage, counted elsewhere | 55 recorded commands; 98 supplemental tests | Actual Git/receipt defenses work. Spaced checkout path produces a false post-tag PASS. Shipped Git Ops instructions contradict the new enrollment mechanism. |
| S4: logistics data product | 8 | 39 fixture probes; 8 valid checkpoints | Representative specs/contracts/data/metric/API/design workflows exercised. Summary works; shipment-list product scope, formal lint, full role sequence and rendered UI remain incomplete. |
| S5: extraction/migration/rollback | 6 | 17 fixture assertions; 82 local HTTP requests; 6 valid checkpoints | Replay/resume and missing/extra row detection work. Injected latency breaches budget. Real-data characterization and infrastructure execution remain blocked. |
| S6: tenant-safe AI service | 6 | 20 tool checks, 11 webhook assertions, 50 retrieval queries, shipped prompt/cost commands | Tenant isolation holds in fixtures; retrieval misses quality targets. Prompt gate catches two injected regressions. Cost gate rejects a fictional +200% increase. Cache effectiveness remains unknown. |
| S7: governed release handoff | 9 | 45 command executions; independently reviewed coverage | Real fixture threat/control/docs/readiness workflows run. Bad commit, header regression, stale docs and incomplete deploy evidence are rejected. Release signing and deployment remain blocked. |
| Audit and bug-check | 2 | Cited audit reports; immutable verifier receipt | Audit completed without fixes. Eight declared candidate checks pass; that does not overrule scenario findings or release prerequisites. |

Total unique skills: **3 + 2 + 8 + 6 + 6 + 9 + 2 = 36**. S3 contributes evidence without double-counting skills. Detailed reports: S1.md, S2.md, S2-EVALUATOR.md, S3.md, S4.md, S5.md, S6.md, S7.md.

## Product findings

### F-001 — HIGH — A space in the checkout path disables release-tag CLI verification

**Location:** `scripts/check-release-tag.mjs:481`; consumer `scripts/release-sequence.mjs:151`. The entrypoint compares an encoded module URL with an unescaped file path. In a directory named `untagged release`, it skips the CLI body and exits zero. Post-tag verification then reports success even though v2.0.0 is absent; direct CLI checking also silently succeeds for a lightweight tag. An otherwise identical nonspaced control refuses correctly.

Pre-tag fails because it expects JSON, and production deployment imports the checker directly; the preview guard also refused our deploy probe. Therefore this is a demonstrated standalone/post-tag verification defect, **not a proven production deployment bypass**. Evidence: S3.md, `evidence/s3/first-run-failure.json`, and execution log entries42–45 versus49–52. Recommended fix: filesystem-safe entrypoint comparison and regression cases for spaced paths. Effort: small. Not fixed.

### F-002 — MEDIUM — Updater reports historical consent instead of current local consent

**Location:** `scripts/update-opchain.mjs:160–165,569–575`; compare `scripts/telemetry.mjs:120–138`. The updater trusts the tracked telemetry checkpoint's enabled flag, while current telemetry uses local SQLite consent. It reports OFF for a locally enabled healthy store, fails to signal an enabled broken store, and reports ON/error for copied historical consent on a machine that never opted in.

Four state variants plus the main composed scenario reproduce five mismatches. All protected byte inventories remain identical: no unauthorized opt-in or data loss occurred. Evidence: S1.md and `evidence/s1/variant-*.json` paired with telemetry status logs. Recommended fix: use the same local consent/health authority and preserve exit2 behavior. Effort: small–medium. Not fixed.

### F-003 — MEDIUM — Git Ops teaches the removed commit enforcement mechanism

**Location:** `skills/oc-git-ops/SKILL.md:240,244,249–258`, including packaged mirror; compare `skills/oc-bug-check/SKILL.md:623–660`. Git Ops still describes checkpoint PASS, `PreToolUse(Bash)` enforcement and plugin installation as the way to obtain a hard gate. Current2.0 requires explicit Git enrollment and immutable candidate receipts; the plugin registers SessionStart/Stop only.

Following this guidance can leave a user believing their plugin enforces commits without enrollment. Enrolled hook probes themselves correctly rejected invalid commits. Evidence: S3.md and S7 packaged parity/evidence. Recommended fix: align canonical and packaged instructions with enrollment/receipt semantics. Effort: small. Not fixed.

### F-004 — MEDIUM — Cost Ops reference disagrees with shipped execution and missing-baseline behavior

**Location:** `skills/oc-cost-ops/references/budget-gates.md:65–71,80–81`; compare `skills/oc-cost-ops/SKILL.md:104–112`. The reference says the runner does not ship and no baseline runs only the ceiling check; the active skill documents shipped commands and a missing-baseline BLOCKED result. S6 ran the real helper and observed BLOCKED, preserving the safer runtime behavior.

This can misroute an agent reading the prescribed reference. It is documentation/contract drift, not a demonstrated cost-gate bypass. Evidence: S6.md and `evidence/s6/logs/commands.json`. Recommended fix: reconcile reference commands and missing-data behavior, regenerate bundles. Effort: small. Not fixed.

## Other failures and limits are not mislabeled as product defects

- S2's isolated evaluator lacked a normalized provenance mapping in its allowed packet. Its PARTIAL verdict remains; this does not establish broken runtime identity.
- S4's prepared application exposes a summary, not the shipment-list endpoint needed for the full intervention flow. Selective HTTP/schema/data checks do not establish complete API conformance, Data Ops role sequencing, per-tenant freshness or rendered accessibility. These are scenario limitations; the representative skills were still exercised.
- S5 has synthetic traffic only. Modularization correctly refuses production equivalence without real data. Local latency is not production capacity.
- S6's small lexical fixture misses retrieval thresholds (recall@3 .87, MRR .7467, nDCG@3 .7758). Its negative prompt run changes the synthetic adapter, not the prompt; this proves regression detection, not prompt improvement. Fixture prices are fictional, and no actual spending is claimed.

## Bug-check and comparison page

The immutable candidate verifier passed **8/8 declared checks** on tree `6a65895fd21ab4b8d323c8bbc3a60ecf9e3bd791`: type safety, configured lint, tests, anti-patterns, secrets, build and both dependency commands. See BUGCHECK.md and `evidence/bugcheck-receipt.json`. The configured dependency threshold is critical; a separate current audit reports7high/4moderate/2low site dependency entries and zero critical. This PASS is not a vulnerability-free statement or proof of the generic strict-warning promise.

The updated comparison page remains part of the frozen candidate. The audit reran its **11 browser checks successfully**, including source links, selection/storage failures, no-JavaScript view, responsive behavior and automated accessibility in both themes. The local site build produced83pages. This does not refresh external competitor facts or certify all site pages. Logs: `evidence/comparison-browser.log`, `evidence/site-build.log`.

## Release decision and minimum next work

**NO-GO as-is.** First fix the release-tag entrypoint, then reconcile the three contract mismatches, and rerun only their reproductions plus the required candidate gate. No changes are authorized by this audit report itself.

The candidate's controlling `docs/plans/2026-09-13-v2-runtime-alignment.md` and shared-runtime plan also retain separate release acceptance: authentic independently reviewed before/after provider evidence, independent reviewer setup, native-host acceptance, wire1.2 migration decisions, repository split and signed release rehearsal. The production preview marker still blocks publication. Passing synthetic scenarios cannot close those requirements.

The coverage goal is complete; release readiness is not. Other2.0 workstreams remain held until the user directs otherwise.

## Task completion

- [x] Freeze candidate and hold other workstreams.
- [x] Freeze original and expansion scenario plans before execution.
- [x] Finish original three scenarios and independent learning review.
- [x] Run immutable candidate checks and comparison browser checks.
- [x] Run data-product scenario (8 skills).
- [x] Run migration/recovery scenario (6 skills).
- [x] Run AI-service scenario (6 skills).
- [x] Run governed-release scenario (9 skills).
- [x] Independently review representative S4/S7 evidence sufficiency.
- [x] Assemble36-skill matrix, validate evidence and publish this scoped release decision.

No upcoming work remains within the simulation goal. Remediation and release acceptance are separate decisions; the release hold remains.
