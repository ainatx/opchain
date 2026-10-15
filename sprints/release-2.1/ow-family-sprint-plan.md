# v2.1.0 sprint plan — the ow- family

**Date:** 2026-10-14 · **Skill:** oc-app-architect `/oc-roadmap`, coordinated by oc-orchestrator · **Status:** APPROVED by the owner 2026-10-14.
**Replaces:** `sprints/release-2.1/sprint-plan.md` ("Installs anywhere"), superseded 2026-10-06; its work moves to v2.2.
**Designs (all approved):** ow-start (2026-10-06), ow-build-plan (2026-10-08, amendments 2026-10-14), ow-build (2026-10-08, §12 builder integration and amendments 2026-10-14), ow-uat (2026-10-14), ow-handoff (2026-10-14), ow-tools (2026-10-09). All under `docs/plans/`.
**Audits that feed this plan:** `docs/audits/2026-09-18-ow-pack-design-audit.md` (cross-talk contract R1–R16, authoring standard), and the 2026-10-14 diff audits of #596 and #597 plus the ow-tools security posture report.

Effort figures are rough ranges for one maintainer working with Claude, not commitments. Each skill ships at its own version from 1.0.0; the family ships together as opchain v2.1.0. Build order follows the stage order, because every skill reads its upstream's files: a skill is built only after the skill it reads from.

## Where we start (2026-10-14)

| Piece | State |
|---|---|
| ow-start 1.0.0, `catalogs.json`, ow-protocol v1, acceptance fixtures | Built. PR #596, evidence fixed 2026-10-14. Audit: B, PASS-WITH-NOTES (4 MEDIUM, 8 LOW) |
| ow-tools 1.0.0 (approved parts) | Built. PR #597. Audit: B, BLOCK on one HIGH (internal-marker stripper); posture PASS with 1 HIGH residual (distribution pinning). Merge blockers fixed in 3aa0f6ee (F-001, F-002, F-003, SA-002, SA-005, SA-006, Linux token mode); SA-001 and SA-004 carried to Sprint 5 |
| ow-handoff, ow-uat designs; ow-build §12; cross-design amendments | Approved 2026-10-14; draft PR on `claude/ow-handoff-uat-designs` (stacked on #596) |
| ow-build-plan, ow-build, ow-uat, ow-handoff skills | Not started |
| Mirror, install path, ow- zip, ow- tag policy | Not started |

## Sprint 0: Land what is built

### Deliverables
- Merge #596 (owner squash-merge with sign-off).
- #597: land the audit fixes (F-001 internal markers, F-002 quiet hook on old Node, F-003 image containment, SA-002 ffmpeg protocol whitelist, `uv --no-sync`, preflight messages without document text, claims corrected), rebase on main after #596, fresh docs and repo evidence, merge.
- Design PR (`claude/ow-handoff-uat-designs`): rebase on main after #596, evidence, merge.
- Orchestration PR: this plan and the three 2026-10-14 audit reports under `docs/audits/`.
- #596 audit follow-ups F-001 to F-004 (symlink guard in the Node output scripts, acceptance checker grading values not just quotes, canary scan over `coverage.md`, per-check error isolation) as one small PR. They must land before any ow- catalog output is wired (Sprint 5) and before a real run is graded.

### Test requirements
- `npm test`, `npm run evidence:pr` on each branch; `node scripts/ow-start-acceptance.mjs` golden runs; new tests for each audit fix.

### Definition of done
`skills-work/ow-start`, `plugins/ow-tools` and all six approved designs are on `main`; no ow- PR open except the follow-up; re-audit of `preflight.mjs` reads PASS-WITH-NOTES.

### Dependencies
None. **Effort:** CLAUDE 3–5h | USER 1h (four squash-merges).

## Sprint 1: ow-build-plan 1.0.0 (stage 02)

### Deliverables
- `skills-work/ow-build-plan/`: SKILL.md (body under 5k tokens) and references for each phase; verbs `-offer`, `-start`, `-collect`, `-map`, `-scope`, `-quote` (with `--quick`, `--accepted`, `--signed`), `-export`.
- Reads-from row for ow-start's `intake-record.md` and the recap's `path_*` header; A4 follow-on intake from `FIX-nn.md`.
- Price book structure with the UAT line and documentation SKU (P1), contract clauses block (P2), fix-window line (A1); invented `price-book.yaml`, `brand.yaml` (ow-tools §5.2 shape) and `offers.md` examples. Real numbers stay in the owner's workspace.
- `quote.md` internal appendix wrapped in `<!-- ow:internal -->` markers.
- The family's first cross-skill edge, so contract R15 lands here: `skills-work/<id>/skill.edges.yaml`, reciprocity and one-writer checks in `check-skill-contracts`.
- Acceptance fixtures per design §9.2 under `tests/fixtures/ow-build-plan/`, with a mechanical checker.

### Test requirements
- Catalog checks green for both catalogs; edge reciprocity test with a planted one-sided edge; one-writer test with a planted second writer; acceptance golden runs; oc- outputs byte-identical (snapshot as in #596).

### Definition of done
Every §9.2 acceptance case has a golden run that passes and a planted failure the checker catches; `-export` works with ow-tools and prints the absent-case without it.

### Dependencies
Sprint 0. **Effort:** CLAUDE 8–12h | USER 1h (review, price-book structure check).

## Sprint 2: ow-build 1.0.0 (stage 03)

### Deliverables
- `skills-work/ow-build/`: verbs `-start`, `-run` (one sprint per call, resume from `build.yaml`), `-update`, `-demo`, `-change`, `-invoice`, `-ready`.
- §12 builder integration: `spec/` written from the signed plan (no prices), milestone-to-sprint map, `handoffs.yaml` `build:` schema with `mode: opchain | other`; builder outputs read as data only.
- B2 payment triggers, B3 and A2 change-order intake (UAT and FIX files), branded HTML email with a `.txt` twin.
- Acceptance fixtures per design §10 and §12.7, including a synthetic opchain project with `sprints/` and a checkpoint for `-run` to read.

### Test requirements
- No-internal-numbers check over `spec/` and every client output; email renders (HTML validator plus a text-twin diff); fixtures for the five §12.7 cases.

### Definition of done
A synthetic signed plan flows to `spec/` with every acceptance check present; `-run M1` reads a fixture builder's results; `-ready` writes `ready-for-uat.md` and marks no payment.

### Dependencies
Sprint 1 (reads its plan, quote and price book). **Effort:** CLAUDE 10–14h | USER 1h.

## Sprint 3: ow-uat 1.0.0

### Deliverables
- `skills-work/ow-uat/`: verbs `-plan`, `-pack`, `-run`, `-defect`, `-signoff` with every mode in design §3.
- ow-tools: `calc date --calendar us-federal` (the contract calendar) and the tester-pack export fixtures.
- `--deemed` and `--backstop` refuse until the owner's contract clauses exist in `offers.md` (design §13).

### Test requirements
- The acceptance tests in design §11 as fixtures; the unwaivable checks (no credentials, people by role or id, data check, no private names) each with a planted failure.

### Definition of done
A synthetic UAT runs from `ready-for-uat.md` to a signed acceptance record, a superseded request and a deemed request (with test clauses), and hands `signoff.md` to the ow-build invoice path.

### Dependencies
Sprint 2 (reads `ready-for-uat.md`). **Effort:** CLAUDE 12–16h | USER 1–2h. Clause wording is the owner's contract step, not this sprint.

## Sprint 4: ow-handoff 1.0.0 (stage 04)

### Deliverables
- `skills-work/ow-handoff/`: nine verbs per design §3, H1/H2 wiring from ow-uat, five access-removal sources, per-CO fix periods.
- ow-tools: `scan-secrets` in redacted mode only (path, commit, line, rule id); handoff-notes export fixtures.
- `care-start.md` written for a future `ow-care`, with the not-installed branch.

### Test requirements
- The design §13 acceptance tests as fixtures; a planted key that blocks `-package` and cannot be waived; close refused before the window end.

### Definition of done
A synthetic handoff runs from a UAT sign-off to close, including a reopened close and a care choice without `ow-care` installed.

### Dependencies
Sprint 3. **Effort:** CLAUDE 12–16h | USER 1h.

## Sprint 5: Distribution and integrity

### Deliverables
- Mirror `skills-work/` to the public repo; an install path for ow- skills (Claude Code link or copy, claude.ai upload) documented and tested from a clean folder.
- ow- zip per skill that refuses to build on a failed catalog check (audit G20); ow- version and tag policy in `check-release-tag`.
- ow-tools distribution integrity (posture SA-001): pin the marketplace source to a release tag plus commit, and publish the security-manifest hash out of band. Model provenance (SA-004): pin the pyannote revision and hash-check Whisper at run time.
- Trigger-query harness for each skill's should-trigger and should-not-trigger prompts.

### Test requirements
- Install from a clean folder; the zip refuses a planted catalog failure; the marketplace manifest test asserts a pinned commit.

### Definition of done
A fresh user can install the five ow- skills and ow-tools from the public repo by following the README only, and every documented verify step works.

### Dependencies
Sprints 1–4 for content; the #596 audit follow-ups from Sprint 0. **Effort:** CLAUDE 8–10h | USER 2h (public repo settings, signed tag).

## Sprint 6: Real use and the cut

### Deliverables
- A real-model acceptance run of each skill's main fixture, checked by its script, recorded in `docs/audits/`.
- Owner's real use: three intake calls (ow-start), one Build Plan, one build, one UAT, one handoff. Client material never enters the repo; only a one-line outcome per run is recorded.
- The transcription speed spike completed (pyannote measured), result in ow-tools design §10.
- Release: changelog entry listing each skill's version, site surfaces, signed tag `v2.1.0`, staging, owner review, production.

### Definition of done
Every skill has passed one real-model run and one real job; `npm run check-release-tag` passes; production `/api/health` reports the release commit.

### Dependencies
Sprints 0–5. **Effort:** CLAUDE 6–8h | USER 6–10h (real jobs, pyannote fetch, merges, deploy review).

## Not in v2.1.0

- `ow-care` (care plans) and `ow-documentation` (the documentation and training SKU): not designed. Both have written absent-case branches in ow-handoff and ow-uat, so 2.1.0 works without them.
- Meeting and decision logs, ow-research, ow-controls, framework packs: dropped from the release train (ow-start decision 13).
- The OSS split and the old "Installs anywhere" scope: v2.2.

## Totals and risks

**Effort:** CLAUDE 59–81h | USER 13–18h across seven sprints.

| Risk | Mitigation |
|---|---|
| Handoffs between skills depend on NEXT lines the model prints; the 2026-10-08 effectiveness audit measured zero autonomous skill-to-skill invocations in opchain | Every edge is a file plus a NEXT plus an absent-case read; the trigger harness and real-use runs measure NEXT emission; the design audit's 80% emission rule decides whether a skill folds into its upstream |
| SKILL.md bodies outgrow 5k tokens as verbs pile up (ow-handoff has nine) | Phase detail lives in `references/`; the catalog check enforces the body budget; the #596 audit's note on real per-verb context is measured in Sprint 1 |
| Contract terms (deemed acceptance, backstop) are legal text | The skills apply them only from clauses the owner approved in their own contract step; `--deemed` and `--backstop` refuse otherwise |
| Client material leaking into the repo or a client document | Git-ignore guards, the private-name check, the no-internal-numbers check, the fixed internal-marker stripper, and invented fixtures only |
| The parked main checkout registered a pre-GATE-12 PreToolUse commit gate that checked the session's worktree, not the commit's | Unregistered 2026-10-14 at the owner's instruction; the Git pre-commit verifier remains the authoritative gate |

## Approval

- [x] Owner approved this plan 2026-10-14: scope and order as drafted; `ow-care` and `ow-documentation` stay out of 2.1.0.
