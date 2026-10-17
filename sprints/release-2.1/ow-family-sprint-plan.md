# v2.1.0 sprint plan — the ow- family

**Date:** 2026-10-14 · **Skill:** oc-app-architect `/oc-roadmap`, coordinated by oc-orchestrator · **Status:** APPROVED by the owner 2026-10-14. Amendment 2026-10-16 (Track E, enforcement and the skill router) APPROVED by the owner 2026-10-16. **Scope change 2026-10-16 (owner): every skill is released in v2.1.0. The release covers the full client lifecycle (adding `ow-documentation` and `ow-care`) plus `ow-draft`, `ow-research`, `ow-vendor-eval`, `ow-controls` with framework packs, `ow-currency`, and ow-start's meeting and decision logs. Order: design all the remaining skills first, then build them** (§ Scope change below). **Every design approved 2026-10-16; build re-plan approved the same day (§ Build re-plan): two lanes, Sprint T and Sprint 2 start in parallel.** Sprints renamed 2026-10-17 (§ Sprint names); old names stay in parentheses.
**Replaces:** `sprints/release-2.1/sprint-plan.md` ("Installs anywhere"), superseded 2026-10-06; its work moves to v2.2.
**Designs (all approved):** ow-start (2026-10-06), ow-build-plan (2026-10-08, amendments 2026-10-14), ow-build (2026-10-08, §12 builder integration and amendments 2026-10-14), ow-uat (2026-10-14), ow-handoff (2026-10-14), ow-tools (2026-10-09). All under `docs/plans/`.
**Audits that feed this plan:** `docs/audits/2026-09-18-ow-pack-design-audit.md` (cross-talk contract R1–R16, authoring standard), and the 2026-10-14 diff audits of #596 and #597 plus the ow-tools security posture report.

Effort figures are rough ranges for one maintainer working with Claude, not commitments. Each skill ships at its own version from 1.0.0; the family ships together as opchain v2.1.0. Build order follows the stage order, because every skill reads its upstream's files: a skill is built only after the skill it reads from.

## Sprint names (2026-10-17)

Every sprint is named **workstream prefix + two-digit number**, and the number is the order it is planned to start in within its workstream. Numbers are never reused or reshuffled: a sprint added later takes the next free number in its workstream (no more `3b`-style inserts). The lane (A, the client lifecycle; B, the side skills) is a column in the tables, not part of the name.

| Prefix | Workstream |
|---|---|
| `OW` | ow- family builds: the skills and ow-tools |
| `REL` | Release work for both themes: distribution, real use, the cut |
| `EN` | Track E: enforcement at chokepoints and the skill router |
| `WEB` | Track S: the 2.1 site surfaces (`track-s-site-surfaces.md`) |

| Name | Old name | Lane | Builds | State 2026-10-17 |
|---|---|---|---|---|
| OW-00 | Sprint 0 | — | Land what was built: ow-start 1.0.0, ow-tools 1.0.0, designs | done |
| OW-01 | Sprint 1 | A | ow-build-plan 1.0.0 | done (#605, #609) |
| OW-02 | Sprint 2 | A | ow-build 1.0.0 | done (#616, #618) |
| OW-03 | Sprint T | — | ow-tools 1.1.0 | in evaluation |
| OW-04 | Sprint 3 | A | ow-uat 1.0.0 | building |
| OW-05 | Sprint 3b | A | ow-documentation 1.0.0 | not started |
| OW-06 | Sprint 4 | A | ow-handoff 1.0.0 | not started |
| OW-07 | Sprint 4b | A | ow-care 1.0.0 | not started |
| OW-08 | Sprint L | B | ow-start 1.1.0 logs | not started |
| OW-09 | Sprint R | B | ow-research 1.0.0 | not started |
| OW-10 | Sprint D | B | ow-draft 1.0.0 | not started |
| OW-11 | Sprint V | B | ow-vendor-eval 1.0.0 | not started |
| OW-12 | Sprint C | B | ow-controls 1.0.0, four packs, `ow-packs` plugin | not started |
| OW-13 | Sprint Cu | B | ow-currency 1.0.0 | not started |
| REL-01 | Sprint 5 | — | Distribution and integrity | not started |
| REL-02 | Sprint 6 | — | Real use and the cut | not started |
| EN-00 – EN-03 | Sprints E0 – E3 | — | Track E (§ Track E) | EN-00 done (#608) |
| WEB-00 – WEB-05 | S0 – S5 | — | Track S (`track-s-site-surfaces.md`) | WEB-00 done (#610) |

- **Rounds and follow-ups:** "OW-04 round 2"; a follow-up PR is "OW-02 follow-up".
- **Files and branches from now on:** contract folder `sprints/release-2.1/ow-05/` (lowercase name), branch `claude/ow-05-<skill>`. Folders and branches that already exist (`ow-sprint-1`, `ow-sprint-2`, `ow-sprint-t`, `ow-sprint-3`) keep their names.
- **Older text:** everything written before 2026-10-17 (this plan's body text, contracts, evaluation reports, PR titles) uses the old names; the table above maps them. Headings below carry both.

## Where we start (2026-10-14)

| Piece | State |
|---|---|
| ow-start 1.0.0, `catalogs.json`, ow-protocol v1, acceptance fixtures | Built. PR #596, evidence fixed 2026-10-14. Audit: B, PASS-WITH-NOTES (4 MEDIUM, 8 LOW) |
| ow-tools 1.0.0 (approved parts) | Built. PR #597. Audit: B, BLOCK on one HIGH (internal-marker stripper); posture PASS with 1 HIGH residual (distribution pinning). Merge blockers fixed in 3aa0f6ee (F-001, F-002, F-003, SA-002, SA-005, SA-006, Linux token mode); SA-001 and SA-004 carried to Sprint 5 |
| ow-handoff, ow-uat designs; ow-build §12; cross-design amendments | Approved 2026-10-14; draft PR on `claude/ow-handoff-uat-designs` (stacked on #596) |
| ow-build-plan, ow-build, ow-uat, ow-handoff skills | Not started |
| Mirror, install path, ow- zip, ow- tag policy | Not started |
| Enforcement at chokepoints and the Jev skill router (Track E, added 2026-10-16) | Built on local branch `claude/consolidate-2-1-updates-6054cf`; consolidation audit closed 39/39; not pushed; no shadow data yet |

## Scope change (owner, 2026-10-16)

"All of the skills should be released": v2.1.0 grows from five ow- skills to twelve plus `ow-tools`. **Design every remaining skill first, then build** (owner choice). Earlier decisions this reverses: ow-start decision 13 (meeting/decision logs, `ow-research`, `ow-controls`, framework packs dropped from the release train) and this plan's "Not in v2.1.0" list.

| Skill | Role | Design state |
|---|---|---|
| `ow-documentation` | Documents, training and tracked rollout (the documentation & training SKU); after UAT | **Design APPROVED 2026-10-16** (`docs/plans/2026-10-16-ow-documentation-design.md`, decisions 7–16, amendments T1, T2, H3, B4, P3) |
| `ow-care` | Monthly care plans after handoff, and for systems taken over | **Design APPROVED 2026-10-16** (`docs/plans/2026-10-16-ow-care-design.md`, decisions 1–11, amendments T3, T4, H4, S1, P4) |
| `ow-draft` | Brief → evidence → draft → deliver: client deliverables, marketing, internal documents, client comms; documents, decks, sheets, emails and posts | **Design APPROVED 2026-10-16** (`docs/plans/2026-10-16-ow-draft-design.md`, decisions 1–8, amendments T6, T7) |
| `ow-research` | Web-sourced evidence (network): background, technical feasibility, market, regulations and frameworks | **Design APPROVED 2026-10-16** (`docs/plans/2026-10-16-ow-research-design.md`, decisions 1–4, amendments P5, D1) |
| `ow-vendor-eval` | Vendor evaluation; commercial vs formal public procurement mode | **Design APPROVED 2026-10-16** (`docs/plans/2026-10-16-ow-vendor-eval-design.md`, decisions 1–4, amendments P6, S2, D2) |
| `ow-controls` + framework packs | Standing control register; packs: NIST 800-53, HIPAA (mapping only), US state privacy + GDPR, SOC 2 own words; open-licence loader | **Design APPROVED 2026-10-16** (`docs/plans/2026-10-16-ow-controls-design.md`, decisions 1–8, amendments P7, P8, H6, C1, S3, R2); licensed-text path waits for counsel |
| `ow-currency` | Watches framework revisions, watched research findings, clients' vendor prices and published claims (network) | **Design APPROVED 2026-10-16** (`docs/plans/2026-10-16-ow-currency-design.md`, decisions 1–4, amendments K1, P9, C2) |
| ow-start meeting and decision logs | `/ow-start-prep-meeting`, `-log-meeting`, `-action`, `-log-decision`, `-log` (ow-start 1.1.0) | **Amendment APPROVED 2026-10-16** (`docs/plans/2026-10-16-ow-start-logs-amendment.md`, decisions L1–L5, amendments H5, T5) |

Design order: `ow-documentation`, `ow-care`, the ow-start logs amendment, `ow-draft`, `ow-research`, `ow-vendor-eval`, `ow-controls` with packs, `ow-currency`. All eight approved 2026-10-16.

## Build re-plan (2026-10-16, after every design was approved)

**Where we are.** Sprint 0 is done (#596, #597, #603, #604). Sprint 1 is done: ow-build-plan 1.0.0 merged in #605 with follow-ups in #609, after four evaluation rounds (weighted score 6.3 → 7.3) where the plan assumed one or two. The estimates below are therefore about 40% above the 2026-10-14 figures for the same kind of work. Track E (#606, #608) runs as its own parallel track (§ Track E) and doesn't change the ow- order.

**Rules for the order.**

1. A skill is built after every skill it reads from (unchanged).
2. **An amendment lands in the sprint of whichever of its two skills is built second**, so the edge checks (reciprocity, one writer, NEXT resolves) stay green on every merge. The table below says where each one lands.
3. Skills already merged take their amendments as a minor version (ow-start 1.1.0, ow-build-plan 1.1.0, ow-tools 1.1.0), so the history stays honest even though v2.1.0 hasn't shipped.
4. Two lanes can run side by side in separate worktrees: **Lane A** is the client lifecycle (each stage reads the one before), **Lane B** is the side skills. The owner squash-merges every PR.

### Sprint list

| Sprint (old) | Lane | Builds | Amendments that land with it | Needs first | CLAUDE | USER |
|---|---|---|---|---|---|---|
| OW-00 (0) | — | ✅ ow-start 1.0.0, ow-tools 1.0.0, designs | — | — | done | done |
| OW-01 (1) | A | ✅ ow-build-plan 1.0.0 | — | OW-00 | done | done |
| OW-02 (2) | A | ✅ ow-build 1.0.0 (#616, #618) | B4 (documentation trigger) | OW-01 | 14–20h | 1–2h |
| OW-03 (T) | — | **ow-tools 1.1.0:** `digest` (T7), `calc hours` (T4), `export --pptx` (T2), `export --xlsx` (T6), `health` (T3), `capture` (T1); one security review for all six | T5 (calls table) | OW-00 | 18–26h | 2–3h |
| OW-04 (3) | A | **ow-uat 1.0.0** (+ `calc --calendar us-federal`) | — | OW-02 | 17–22h | 1–2h |
| OW-05 (3b) | A | **ow-documentation 1.0.0** | P3 (ow-build-plan 1.1.0) | OW-04, OW-03 | 16–22h | 1–2h |
| OW-06 (4) | A | **ow-handoff 1.0.0** (+ `scan-secrets` redacted) | H3, H4 | OW-05 | 16–22h | 1h |
| OW-07 (4b) | A | **ow-care 1.0.0** (both ways in) | S1 (ow-start 1.1.0), P4 (ow-build-plan 1.1.0) | OW-06, OW-03 | 18–24h | 1–2h |
| OW-08 (L) | B | **ow-start 1.1.0 logs** | H5 if ow-handoff is merged, else with OW-06 | OW-00 | 8–12h | 1h |
| OW-09 (R) | B | **ow-research 1.0.0** | P5 | OW-03 (digest) | 10–14h | 1h |
| OW-10 (D) | B | **ow-draft 1.0.0** | D1, D2 (already in its design) | OW-09, OW-03 | 16–22h | 1–2h |
| OW-11 (V) | B | **ow-vendor-eval 1.0.0** | P6, S2 | OW-09, OW-03 (xlsx) | 12–16h | 1h |
| OW-12 (C) | B | **ow-controls 1.0.0 + four packs + `ow-packs` plugin** | K1, P7, P8, S3, R2; H6 and C1 if ow-handoff / ow-care are merged, else with them | OW-09, OW-03 | 30–42h | 3–5h |
| OW-13 (Cu) | B | **ow-currency 1.0.0** | P9, C2 (or with OW-07 if ow-care is later) | OW-12, OW-09 | 10–14h | 1h |
| REL-01 (5) | — | Distribution and integrity for 12 skills, ow-tools and ow-packs (mirror, zips, clean-folder install, SA-001, SA-004, trigger harness) | — | all builds | 12–16h | 2h |
| REL-02 (6) | — | Real use and the cut: one real job per skill, real-model acceptance runs, transcription spike, `v2.1.0` tag, staging, production | — | REL-01 | 10–14h | 14–22h |

**Totals for what remains:** CLAUDE about 207–286h, USER about 31–47h, across 14 sprints. Lanes A and B in parallel shorten the calendar, not the hours.

### Amendment roll-up (which skill each one changes)

| Skill | Amendments | Lands in |
|---|---|---|
| ow-start → 1.1.0 | logs (L1–L5), S1 care-takeover kind, S2 `quote: vendor-eval`, S3 `quote: controls-readiness` | L, 4b, V, C |
| ow-build-plan → 1.1.0 | P3 people quoted, P4 care onboarding quote, P5 research evidence, P6 vendor selection, P7 controls as acceptance checks, P8 readiness quote, P9 pricing page URL | 3b, 4b, R, V, C, Cu |
| ow-tools → 1.1.0 | T1 capture, T2 pptx, T3 health, T4 calc hours, T5 calls row, T6 xlsx, T7 digest | T |
| ow-build 1.0.0 | B4 | 2 |
| ow-handoff 1.0.0 | H3 (documentation), H4 (structured rollover), H5 (logs audio), H6 (control tests) | 4, or L / C when those come later |
| ow-care 1.0.0 | C1 (control tests due), C2 (currency changes as requests) | 4b, or C / Cu when those come later |
| ow-research 1.0.0 | R2 (frameworks pinnable) | C |
| ow-draft 1.0.0 | D1, D2 | D (already in the design) |
| ow-controls / ow-packs | K1 (free delta files) | C |

### Risks added by the scope change

| Risk | Mitigation |
|---|---|
| The release roughly triples (five skills to twelve plus two plugins); Sprint 1 already ran twice its planned evaluation rounds | Estimates carry the +40%; each sprint keeps its own contract and evaluator; any skill can be held to v2.2 without blocking the rest, since every edge has an absent-case |
| ow-controls packs carry licence and legal-status risk (GDPR reuse terms, four state sources, SOC 2 identifiers) | Licence class per source in `pack.yml`, the licensed-text lint, legal status "not checked" by default; owner review of every source before Sprint C merges |
| Network skills (ow-research, ow-currency) read untrusted pages | Pages are data; the injection fixture is an acceptance test in both; no fetch under a handling level |
| `capture` drives a real browser | Dedicated profile, user signs in, never types or stores a credential, refuses production without the recorded decision; covered by the ow-tools 1.1.0 security review |

The sprint sections below keep their deliverables and tests; where the table above differs (order, effort, amendments), the table wins. OW-03 and OW-08 – OW-13 (Sprints T, L, R, D, V, C and Cu) have no section below; each gets its own contract file under `sprints/release-2.1/` when they start, as Sprint 1 did.

## OW-00 (Sprint 0): Land what is built (done)

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

## OW-01 (Sprint 1): ow-build-plan 1.0.0 (stage 02) (done: #605, #609)

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

## OW-02 (Sprint 2): ow-build 1.0.0 (stage 03) (done: #616, #618)

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

## OW-04 (Sprint 3): ow-uat 1.0.0

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

## OW-05 (Sprint 3b): ow-documentation 1.0.0 (added 2026-10-16)

Design APPROVED 2026-10-16 (`docs/plans/2026-10-16-ow-documentation-design.md`). It runs only when the SKU is bought, writes the full runbook and developer handover (ow-handoff's notes point to them, H3), auto-captures screenshots (`ow-tools capture`, T1), exports slides (`export --pptx`, T2), and the line is invoiced at delivery (B4, P3). Recorded decisions D1–D6 in the ow-uat design apply: four document types, four training formats, a planned and tracked rollout, delivery as branded PDF/Word, Markdown in the client's repo, the client's wiki or Google Docs and slides; priced by build size plus groups of 15 people; a floor (developer handover and operator notes) stays in every build.

### Dependencies
Sprint 3 (reads ow-uat's scenarios, roles, training gaps and cleared evidence); ow-tools T1 and T2 land with it; the H3, B4 and P3 amendments land in Sprints 4, 2 and 1's skills. **Effort:** CLAUDE 16–22h | USER 1–2h (re-plan).

## OW-06 (Sprint 4): ow-handoff 1.0.0 (stage 04)

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

## OW-07 (Sprint 4b): ow-care 1.0.0 (added 2026-10-16)

Design APPROVED 2026-10-16 (`docs/plans/2026-10-16-ow-care-design.md`). Two ways in: `care-start.md` from ow-handoff, or a takeover through a fixed-fee onboarding review (ow-start S1, ow-build-plan P4). Runs months from the start date, hours recorded per request with the site's rollover rule, extra hours only on a go-ahead, reply targets, a monthly health check (`ow-tools health`, T3) and report, tier and terms changes, notice and end with access removal.

### Dependencies
Sprint 4; ow-tools T3 and T4 land with it; the S1, P4 and H4 amendments land in the ow-start, ow-build-plan and ow-handoff skills. **Effort:** CLAUDE 18–24h | USER 1–2h (re-plan).

## REL-01 (Sprint 5): Distribution and integrity

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

## REL-02 (Sprint 6): Real use and the cut

### Deliverables
- A real-model acceptance run of each skill's main fixture, checked by its script, recorded in `docs/audits/`.
- Owner's real use: three intake calls (ow-start), one Build Plan, one build, one UAT, one handoff. Client material never enters the repo; only a one-line outcome per run is recorded.
- The transcription speed spike completed (pyannote measured), result in ow-tools design §10.
- Release: changelog entry listing each skill's version, site surfaces, signed tag `v2.1.0`, staging, owner review, production.

### Definition of done
Every skill has passed one real-model run and one real job; `npm run check-release-tag` passes; production `/api/health` reports the release commit.

### Dependencies
Sprints 0–5. **Effort:** CLAUDE 6–8h | USER 6–10h (real jobs, pyannote fetch, merges, deploy review).

## Track E (EN): Enforcement at chokepoints and the skill router (parallel track)

**Added and approved 2026-10-16** (see Approval). This work was built on 2026-10-08 and 2026-10-09, before this plan was written, and is not in Sprints 0–6. It answers the risk in the first row of Totals and risks below: the 2026-10-08 effectiveness audit (`docs/audits/2026-10-08-opchain-effectiveness-audit.md`) found that a skill-to-skill edge held only when something outside the catalog checked it.

It runs beside the ow- sprints. It touches `skills/` (oc-), `plugins/opchain/`, `scripts/` and `site/`. The ow- sprints touch `skills-work/` and `plugins/ow-tools/`. The two meet in four places: `skills/CHANGELOG.md`, `.bugcheck.json` scan-exception digests, `package.json` scripts and the release surfaces at the cut (E3).

**Where it starts (2026-10-16).** All of it is on the local branch `claude/consolidate-2-1-updates-6054cf`. Two commits sit on `b562955c`: `8b89428e` consolidates three worktrees (chain-fixes, release-2-1-site, elated-blackwell), and `25bb3e9e` closes the consolidation audit (`docs/audits/2026-10-09-v2.1-consolidation-code-audit.md`, graded C-, 39/39 findings fixed and verified). The branch has 252 files and about 40k lines. It is not pushed and has no PR, and its worktree has two uncommitted edits (`plugins/opchain/templates/deploy.mjs`, `site/src/components/EnforcementMap.astro`). It merges into `main` @ `6c31e9ed` with no conflicts. Router suites: 4 files, 115 tests pass; `gen-route-spec --check` reports 36 skills in sync.

| Piece on the branch | Audit §5 fix | State |
|---|---|---|
| Verifier: diagnostics, INCONCLUSIVE on timeout/127/env failure, `verify-candidate explain` | 1 | Built |
| Bypass records: post-commit record, pre-push refusal, `Opchain-Bypass:` trailer, `/oc-bugcheck bypass` | 2 | Built |
| `install-git-drivers --ci` (consumer `evidence:pr`), `/oc-git-ops` refuses an unenrolled repo | 3 | Built; not yet run in a consumer |
| Tool-named invocation wording, `skill_invoked:` self-report, `/oc-audit diff --read-only` | 4 | Built |
| SessionStart change-triggered `next:`, Stop handoff target, release resume via `additionalContext` | 5 (part), 7 (part) | Built |
| `orchestrator.md` §3 Enforcement map, `scaffold-spec`, consumer deploy wrapper (**BREAKING**: `--prod` required) | 7 (part) | Built; the build-phase stub refusal and the 06-testing, integrations and eval gates are specified, not wired |
| Jev skill router: `route-prompt.cjs` on UserPromptSubmit, `route-dispatch.cjs` (TypeSafe Jev `jev-1.13.0`, two requests, tiered thresholds, 12-skill allowlist), `route-eval.mjs`, `docs/runbooks/skill-router-eval.md` | none (new) | Built. Shadow by default, off without `TYPESAFE_API_KEY`. No shadow data collected yet |
| v2.1 site surfaces: EnforcementMap, architecture Jev rail, install, glossary, security, draft blog post | none | Built. Must not deploy before the 2.1.0 tag (consolidation audit D-06) |

**Router release terms (owner, 2026-10-16).** The router ships in 2.1.0 as an **experimental preview**. Every surface that mentions it follows these terms: changelog, `/install`, `/privacy`, the security page, the architecture page and the plugin README.

1. **Label.** Each mention calls it "experimental preview". In the 2.1.0 changelog it sits under its own *Experimental* heading, not among the headline items.
2. **No effectiveness claims before a GO.** Copy may cite the offline eval (574 labelled past prompts, precision 0.92 oc-git-ops / 0.88 oc-deploy-ops), named as offline, and the E2 verdict as recorded. It must not say the router raises skill use or chain completion until a GO verdict exists, and even then only with the E2 numbers.
3. **Disclosure on `/privacy`**, matched by the security page and the plugin README:
   - With `TYPESAFE_API_KEY` set, the hook sends the redacted prompt and a repo summary to `api.typesafe.ai`. The summary covers branch, ahead/behind, dirty count, open PR, enrollment and active checkpoint.
   - The previous prompt and the end of the last assistant message are sent only with `OPCHAIN_ROUTE_CONTEXT=1`.
   - Nothing is sent without a key, for slash commands, outside opchain projects, or for a typed `/oc-*` mention.
   - Decisions are logged locally to `$TMPDIR/opchain-route-log.jsonl`.
   - Unsetting the key or setting `OPCHAIN_ROUTE=0` turns it off.
4. **Live mode is unsupported until a GO.** `OPCHAIN_ROUTE_MODE=live` is documented as unsupported until E2 records a GO. After a GO it is supported but still opt-in; the shipped default stays shadow in 2.1.0.
5. **Opting in.** TypeSafe keys are publicly available (owner, 2026-10-16), so `/install` documents opting in: get a key from TypeSafe, set `TYPESAFE_API_KEY`, and read the shadow log. Calls go to the user's own TypeSafe account. Each routed prompt makes up to two requests, and decisions are cached for 24 hours.
6. **No cost to users who do not opt in.** Without a key the hook exits at its first check (`route-prompt.cjs:199`), before any network, git or log work. The only cost is one Node process start per prompt.

### EN-00 (Sprint E0): Land the product half

**Status 2026-10-16: E0 product half merged.** #608 was squash-merged as `591e6329` on 2026-10-16 (242 files, no `site/`). It also carries a fix its first CI run found in the new bypass-accountability check: CI reads trailers only (`--bypass-source trailers`). E0's definition of done is met; E1 and E2 can start. The two uncommitted edits were committed as `ef2591cc` on the consolidation branch. The full rebased tree, site half included, is kept at `claude/2.1-track-e-full`. **Owner decision 2026-10-16:** one site branch serves both themes, owned by Track S (comprehensive 2.1 site surfaces, run by the ow-skills orchestration session). Track S takes over the `site/` half of the consolidation branch, reworks it for the two-theme release and adds the ow- pages. E0 is the product half only, and Track E does not edit `site/`.

#### Deliverables
- Review and commit the two uncommitted worktree edits; rebase on `main`; fresh `npm run evidence:pr`.
- Split off the product half. **Product PR** (`skills/`, `plugins/opchain/`, `scripts/`, `tests/`, `docs/`, `design/`, CI): merge now. The `site/` half goes to Track S, because its pages describe 2.1 behaviour while every version stamp still reads 2.0.4.
- `skills/CHANGELOG.md` keeps the enforcement and router entries under `[Unreleased]` until the cut. The router entry moves under an *Experimental* heading, is labelled "experimental preview", and states the router release terms' data-flow line (term 3). The plugin README's router section gets the same label and calls live mode unsupported until a GO.
- **Owner decision 2026-10-16: merge now.** The product PR merges to `main` before the tag. That triggers `mirror-public.yml`, so the router hook, the bypass records and the BREAKING deploy template reach the public mirror early, as `plugins/ow-tools` did with #597. The router stays inert without a key. The changelog keeps the enforcement entries and the router (under *Experimental*) unreleased, and notes the BREAKING deploy-template change (`--prod` required).
- Merge order against ow- Sprint 1: whichever PR is green first merges first; the other is rebased and re-evidenced. (#605 and #609 merged first; #608 rebased onto them.)

#### Test requirements
- `npm test`, `npm run test:hooks`, the four `tests/route-*.test.js` suites, `node scripts/gen-route-spec.mjs --check`, `npm run check-skill-contracts`, `npm run evidence:pr`.

#### Definition of done
The product PR is merged with green CI and evidence; the `site/` half is with Track S; no 2.1 site surface is deployed.

#### Dependencies
None; it can land between ow- Sprint 0 and Sprint 1. **Effort:** CLAUDE 3–5h | USER 1–2h (review of a large diff, squash-merge).

### EN-01 (Sprint E1): Consumer enrollment and the measurement week

#### Deliverables
- Install the E0 plugin build in deftwright-site (the audit's consumer) and run `/oc-enroll` with `install-git-drivers --ci`, so `evidence:pr` runs in its CI.
- One working week of normal use, then re-run the audit's scanner (`scan.mjs` + `agg.mjs`, audit Appendix) and the receipt analysis against the audit's §3 baselines.
- Record the result in `docs/audits/` as a follow-up to the 2026-10-08 audit, one row per fix 1–3, using the audit's "Decides it" column.

#### Test requirements
- The scanner and receipt analysis run on the same corpus definition as the 2026-10-08 audit, so the numbers compare.

#### Definition of done
A recorded measurement for each of fix 1 (exit-127 = 0, FAIL share under 15%), fix 2 (every `--no-verify` in transcripts appears in `bypasses[]`) and fix 3 (receipts from the first commit, handoffs per PR above 0). A miss is a finding, not a blocker for the cut: the changelog states what was measured.

#### Dependencies
E0. **Effort:** CLAUDE 3–5h | USER 2–3h (deftwright enrollment, a week of real work).

### EN-02 (Sprint E2): Router shadow period and the day-8 go/no-go

#### Deliverables
- Set `TYPESAFE_API_KEY` on the owner's machine only; leave `OPCHAIN_ROUTE_MODE` unset (shadow). Run in opchain and deftwright-site.
- After eight days: `npm run route:eval -- outcomes`. GO needs all three runbook §6 conditions: at least 30 would-be suggestions, proxy precision at least 0.8 on the core skills, silent rate at least 0.95 on non-pipeline prompts.
- GO: switch to live on the owner's machine. The shipped default stays shadow in 2.1.0 either way. NO-GO: stay in shadow; the FP and FN rows become spec copy fixes or allowlist removals.
- Supply Track S with router copy for `/privacy` and the security page: the disclosure in router release term 3. It lands on Track S's site branch and goes live with the tag.
- If the verdict is GO, `OPCHAIN_ROUTE_MODE=live` becomes supported as opt-in (term 4). If it is NO-GO, the copy keeps live mode marked unsupported.

#### Test requirements
- The `route-eval outcomes` report and its verdict, recorded in `docs/audits/`.

#### Definition of done
A recorded go/no-go verdict with its three numbers, and a 2.1.0 changelog line that states the router's shipped mode and that verdict.

#### Dependencies
E0. It runs alongside E1. **Effort:** CLAUDE 2–4h | USER 1h (key, eight elapsed days, the verdict).

### EN-03 (Sprint E3): Router copy and review for Track S, changelog at the cut (folds into Sprint 6)

**Owner decision 2026-10-16:** the site deliverables below are built on Track S's single site branch, not by Track E. Track E supplies the router copy (the experimental-preview terms, the `api.typesafe.ai` disclosure, the opt-in steps) and reviews every router page before the cut. Track E also supplies the enforcement blog draft ("0 of 229…"), revised for the two-theme release; it stays a draft until the cut.

#### Deliverables
- On Track S's branch: rework the consolidation branch's site half onto the ow- release surfaces; one 2.1.0 changelog entry covering the ow- family and Track E; skill counts reconciled with the ow- catalog; the D-06 version wording fixed.
- The `architecture.astro` claims the design note lists as wrong for 2.1 (PreToolUse "enforcement", orchestrator "enforces audit gates", 33 checkpoints) corrected.
- Router copy brought in line with the router release terms. The `/install` section on opting in follows term 5. The architecture page's Jev rail and the glossary entry carry the "experimental preview" label. The draft blog post makes no claim term 2 rules out.

#### Test requirements
- `node scripts/check-release-surfaces.mjs`, e2e and Lighthouse budgets at `error` level, `npm run site:build`.
- An e2e assertion that `/install`, `/privacy`, the security page and the architecture page each show the "experimental preview" label next to their router copy, and that `/privacy` names `api.typesafe.ai`.

#### Definition of done
Track S's site branch merges in the release PR's sitting under the release freeze; Track E has reviewed every router page; no 2.1 claim is live before the tag; every router mention meets the router release terms.

#### Dependencies
E0–E2 and Sprint 6. **Effort:** CLAUDE 2–3h | USER 0–1h.

## Not in v2.1.0

- ~~`ow-care` and `ow-documentation`~~: moved into v2.1.0 on 2026-10-16 (Sprints 3b and 4b). Their absent-case branches in ow-handoff and ow-uat stay, for installs without them.
- ~~Meeting and decision logs, ow-research, ow-controls, framework packs~~: back in v2.1.0 on 2026-10-16 (owner scope change), with ow-draft, ow-vendor-eval and ow-currency.
- Still out: `ow-program`; the paid framework feed (waits for did.json, key custody and a reachable hostname); licensed framework text (waits for counsel); 800-171/CMMC and GxP packs.
- The OSS split and the old "Installs anywhere" scope: v2.2.
- Track E leftovers, all v2.2: the router live by default; the planned Jev uses (verifier FAIL triage, Stop handoff detection, semantic gate rows); the build-phase `scaffold-spec` stub refusal and the 06-testing, integrations and eval gates (specified, not wired); audit §5 fixes 6 (evidence tax) and 8 (surface doctor, runner, baseline auto-PR).

## Totals and risks

**Effort (2026-10-14 plan, five skills):** CLAUDE 59–81h | USER 13–18h across seven sprints. With Track E: CLAUDE 69–98h | USER 17–25h. **Superseded for the ow- family by the re-plan:** what remains after Sprints 0 and 1 is CLAUDE about 207–286h | USER about 31–47h across 14 sprints (§ Build re-plan); Track E's remaining sprints (E1–E3) add CLAUDE 7–12h | USER 3–5h.

| Risk | Mitigation |
|---|---|
| Handoffs between skills depend on NEXT lines the model prints; the 2026-10-08 effectiveness audit measured zero autonomous skill-to-skill invocations in opchain | Every edge is a file plus a NEXT plus an absent-case read; the trigger harness and real-use runs measure NEXT emission; the design audit's 80% emission rule decides whether a skill folds into its upstream. Track E puts checks at the oc- chokepoints and measures them in E1 |
| Two themes in one release (the ow- planning layer and Track E's enforcement work) go against oc-release-ops' one-theme principle | **Owner decision 2026-10-16:** one 2.1.0 release with two themes (the ow- family and enforcement): one changelog, one tag, one deploy, one release freeze. The router has its own *Experimental* section in that changelog |
| Merging Track E to `main` publishes the router hook, bypass records and the BREAKING deploy template to the public mirror before the tag | Accepted by the owner 2026-10-16 (E0: merge now). The router is inert without `TYPESAFE_API_KEY`; the BREAKING change is in `[Unreleased]` in the changelog |
| The router sends redacted prompts and a repo summary to a third party (TypeSafe) | Off without a key and shadow by default; context is opt-in; `/privacy`, the security page and the plugin README disclose it per router release term 3, live with the tag (E2, E3) |
| The router is read as a proven 2.1 feature before it has any field data | Experimental-preview label on every surface, no effectiveness claims before a GO, live mode unsupported until a GO (router release terms 1, 2, 4); the E3 e2e assertion checks the label |
| Track E's 40k-line diff is too large to review well in one sitting | E0 splits product from site; the consolidation audit (39/39 closed, verified in scratch repos) is the review record |
| SKILL.md bodies outgrow 5k tokens as verbs pile up (ow-handoff has nine) | Phase detail lives in `references/`; the catalog check enforces the body budget; the #596 audit's note on real per-verb context is measured in Sprint 1 |
| Contract terms (deemed acceptance, backstop) are legal text | The skills apply them only from clauses the owner approved in their own contract step; `--deemed` and `--backstop` refuse otherwise |
| Client material leaking into the repo or a client document | Git-ignore guards, the private-name check, the no-internal-numbers check, the fixed internal-marker stripper, and invented fixtures only |
| The parked main checkout registered a pre-GATE-12 PreToolUse commit gate that checked the session's worktree, not the commit's | Unregistered 2026-10-14 at the owner's instruction; the Git pre-commit verifier remains the authoritative gate |

## Approval

- [x] Owner approved this plan 2026-10-14: scope and order as drafted; `ow-care` and `ow-documentation` stay out of 2.1.0.
- [x] Owner scope change 2026-10-16: `ow-documentation` and `ow-care` join 2.1.0.
- [x] Every remaining design approved 2026-10-16 (ow-documentation, ow-care, ow-start logs, ow-draft, ow-research, ow-vendor-eval, ow-controls with packs, ow-currency).
- [x] Owner approved the build re-plan 2026-10-16: sprint order, two lanes, amendment placement, effort; Sprint T (ow-tools 1.1.0) and Sprint 2 (ow-build) start in parallel, each with its own contract.
- [x] Owner approved the Track E amendment 2026-10-16: enforcement at chokepoints and the Jev skill router join 2.1.0 as a parallel track; the router ships as an experimental preview under the router release terms (owner, 2026-10-16: shadow by default, labelled, disclosed on `/privacy`, live mode unsupported until a GO, keys publicly available); E0 merges to `main` before the tag (public mirror accepted); one 2.1.0 release carries both themes.
