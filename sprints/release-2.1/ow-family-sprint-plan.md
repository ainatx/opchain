# v2.1.0 sprint plan — the ow- family

**Date:** 2026-10-14 · **Skill:** oc-app-architect `/oc-roadmap`, coordinated by oc-orchestrator · **Status:** APPROVED by the owner 2026-10-14. **Scope change 2026-10-16 (owner): every skill is released in v2.1.0. The release covers the full client lifecycle (adding `ow-documentation` and `ow-care`) plus `ow-draft`, `ow-research`, `ow-vendor-eval`, `ow-controls` with framework packs, `ow-currency`, and ow-start's meeting and decision logs. Order: design all the remaining skills first, then build them** (§ Scope change below; draft sprints until their designs are approved).
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

## Scope change (owner, 2026-10-16)

"All of the skills should be released": v2.1.0 grows from five ow- skills to twelve plus `ow-tools`. **Design every remaining skill first, then build** (owner choice). Earlier decisions this reverses: ow-start decision 13 (meeting/decision logs, `ow-research`, `ow-controls`, framework packs dropped from the release train) and this plan's "Not in v2.1.0" list.

| Skill | Role | Design state |
|---|---|---|
| `ow-documentation` | Documents, training and tracked rollout (the documentation & training SKU); after UAT | **Design APPROVED 2026-10-16** (`docs/plans/2026-10-16-ow-documentation-design.md`, decisions 7–16, amendments T1, T2, H3, B4, P3) |
| `ow-care` | Monthly care plans after handoff, and for systems taken over | **Design APPROVED 2026-10-16** (`docs/plans/2026-10-16-ow-care-design.md`, decisions 1–11, amendments T3, T4, H4, S1, P4) |
| `ow-draft` | Brief → evidence → draft → deliver for client documents | To design (09-21 strategy §6.3; no `ow-review`, so its checks are same-session self-checks) |
| `ow-research` | Web-sourced evidence (network) | To design (09-21 strategy §6.3, audit "Connected" bundle) |
| `ow-vendor-eval` | Vendor evaluation; commercial vs formal public procurement mode | To design (audit skill list) |
| `ow-controls` + framework packs | Standing control register; NIST 800-53 proving pack; bring-your-own loader | To design (09-21 strategy §6.6; licensed-text questions go to counsel) |
| `ow-currency` | Checks for newer framework revisions (network) | To design (pairs with `ow-controls`) |
| ow-start meeting and decision logs | `/ow-start-log-meeting`, `/ow-start-log-decision` | Amendment to the ow-start design |

Design order: `ow-documentation`, `ow-care`, the ow-start logs amendment, `ow-draft`, `ow-research`, `ow-vendor-eval`, `ow-controls` with packs, `ow-currency`. Build sprints and effort are re-planned once every design is approved.

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

## Sprint 3b: ow-documentation 1.0.0 (added 2026-10-16)

Design APPROVED 2026-10-16 (`docs/plans/2026-10-16-ow-documentation-design.md`). It runs only when the SKU is bought, writes the full runbook and developer handover (ow-handoff's notes point to them, H3), auto-captures screenshots (`ow-tools capture`, T1), exports slides (`export --pptx`, T2), and the line is invoiced at delivery (B4, P3). Recorded decisions D1–D6 in the ow-uat design apply: four document types, four training formats, a planned and tracked rollout, delivery as branded PDF/Word, Markdown in the client's repo, the client's wiki or Google Docs and slides; priced by build size plus groups of 15 people; a floor (developer handover and operator notes) stays in every build.

### Dependencies
Sprint 3 (reads ow-uat's scenarios, roles, training gaps and cleared evidence); ow-tools T1 and T2 land with it; the H3, B4 and P3 amendments land in Sprints 4, 2 and 1's skills. **Effort:** estimated in the re-plan once every design is approved.

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

## Sprint 4b: ow-care 1.0.0 (added 2026-10-16)

Design APPROVED 2026-10-16 (`docs/plans/2026-10-16-ow-care-design.md`). Two ways in: `care-start.md` from ow-handoff, or a takeover through a fixed-fee onboarding review (ow-start S1, ow-build-plan P4). Runs months from the start date, hours recorded per request with the site's rollover rule, extra hours only on a go-ahead, reply targets, a monthly health check (`ow-tools health`, T3) and report, tier and terms changes, notice and end with access removal.

### Dependencies
Sprint 4; ow-tools T3 and T4 land with it; the S1, P4 and H4 amendments land in the ow-start, ow-build-plan and ow-handoff skills. **Effort:** estimated in the re-plan once every design is approved.

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

- ~~`ow-care` and `ow-documentation`~~: moved into v2.1.0 on 2026-10-16 (Sprints 3b and 4b). Their absent-case branches in ow-handoff and ow-uat stay, for installs without them.
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
- [x] Owner scope change 2026-10-16: `ow-documentation` and `ow-care` join 2.1.0.
- [ ] Sprints 3b and 4b approved with their designs and effort estimates.
