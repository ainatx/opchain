# v2.1.0 sprint plan — "Installs anywhere, says so honestly"

> **Superseded 2026-10-06 (owner decision).** v2.1.0 is now the ow- skill family release, planned in `docs/plans/2026-10-06-ow-start-intake-redesign.md` and the ow- 2.1.0 sprint plan to follow. Everything below, including the OSS split, moves to v2.2. Kept unchanged as the record of what was planned.

**Date:** 2026-09-21 · **Skill:** oc-app-architect `/oc-roadmap` · **Status:** APPROVED by the owner 2026-09-21. Sprint 0 run the same day; work then stopped at the owner's instruction (see Sprint 0 status).
**Source:** the maintainer's 2.1 strategy review (2026-09-18 → 2026-09-21), not published.
**Scope decided by the owner (2026-09-21):** finish the OSS split as the first sprint; Claude.ai install path with no one-click promise; templates **and** a marketplace whose first version is a **listing page only**; editor extension deferred; the install debt owned.

Effort figures are rough ranges for one maintainer working with Claude, not commitments. Build order follows risk: the irreversible step first, claims last.

## Sprint 0: Clear the deck — land 2.0.3 and the PR queue

### Deliverables
- Reconcile `origin/fix/2.0.3-session-clock` (5 commits ahead) with release PR #552, cut and tag v2.0.3, refresh `.github/monitoring/release-baseline.json`.
- Merge or close #494, #547, #549 and the open Dependabot PRs.
- Commit or delete the untracked v2.0 simulation audit pack and remediation plan in the main checkout.
- Edit roadmap issue #3 (still lists `oc-qa-ops`, shipped in v1.9). Set `/changelog` Coming Next to "direction set" per D-F (hand-written v2.1 hero; Planned reads `v2.2 → v2.3`; vote-target pin 4).

### Test requirements
- `npm test`, `npm run check-release-tag`, e2e pin for the vote-target count.

### Definition of done
`/api/health` on production reports the v2.0.3 commit; baseline PR merged; zero open PRs older than this sprint; `/changelog#v2-1` no longer says "voting open".

### Dependencies
None. **Effort:** CLAUDE 4–6h | USER 2–3h (deploys, tag, merges).

### Sprint 0 status — 2026-09-21 (plan approved by the owner; sprint run, then work stopped as instructed)

Most of this sprint had already been done by other sessions between 2026-09-18 and 2026-09-21. Observed on `origin/main` @ `b40672a`:

| Deliverable | State |
|---|---|
| Cut and tag v2.0.3, refresh baseline | **Already done — but as a different release.** v2.0.3 shipped on 2026-09-18 as "Release-surface honesty and CI signal cleanup" (#556), tag `v2.0.3` exists, baseline refreshed (#559, #560), production serves `8bad1a0`. |
| Reconcile `fix/2.0.3-session-clock` with PR #552 | **Blocked on an owner decision.** The "Focused execution, visible progress" work (session clock, wall-clock actuals, visible checkpoint progress — ~275 files vs main) is **unshipped**, #552 is now CONFLICTING, and both branches claim a version number that is taken. Options: renumber as v2.0.4, fold into v2.1, or drop. |
| #547, #549 | **Merged.** |
| #494 | All four checks green and mergeable; another session was preparing it today. Needs the owner's squash-merge with sign-off (agents don't merge here). |
| Dependabot #500, #561, #562, #563 | Open; each fails one check (the `evidence:pr` gate, as expected). Need one consolidation PR like #549. Not started. |
| Roadmap issue #3 | **Done.** `oc-qa-ops` removed, with a pointer to #8. The site picks it up on the next `npm run gen-roadmap`. |
| `/changelog` Coming Next → "direction set" | **Not started.** It touches the same release surfaces as the unshipped focused-execution work, so it should follow that decision; local commits on this machine also currently fail the pre-commit verifier on a test timeout. |
| Untracked simulation audit pack and remediation plan (main checkout) | **Untouched.** Commit-or-delete is the owner's choice and was not made. |

**Definition of done: met on 2026-09-27 except one item** — Dependabot #500 (vitest 5, a major bump deliberately kept out of the consolidations) is still open, so "zero open PRs older than this sprint" does not hold. See Sprint 0 progress below. At the time of this 2026-09-21 table it was not met; Remaining: the focused-execution decision, #494's merge, the Dependabot consolidation, the changelog change, and the untracked packs.


### Owner decisions — 2026-09-26

- **Focused-execution work folds into 2.1.** PR #552 closed with a pointer here; branches `codex/release-2.0.3` and `fix/2.0.3-session-clock` kept for salvage. v2.0.4 (#564/#566) already fixed the task-lifecycle stamps; what remains to salvage is the session clock, wall-clock actuals and visible checkpoint progress. Salvage lands in Sprint 2 or a dedicated sprint — to be scoped against current main.
- **v2.0.4 ships after the Dependabot consolidation** (#561, #562, #563). v2.0.4 is merged (#566) but untagged and undeployed; production still serves `8bad1a0`.
- **Next work: finish Sprint 0.**

### Release rule adopted — 2026-09-27

After two mid-cut merges and a repeat production deploy during v2.0.4, `docs/governance/RELEASING.md` step 4 now carries a release freeze: nothing merges to `main` between the release tag and a passing `smoke:prod`, and `npm run deploy` runs once per release.

### Sprint 0 progress — 2026-09-27

| Deliverable | State |
|---|---|
| Dependabot #561, #562, #563 | **Merged as #568** (the three closed as superseded). **PR #568** consolidates them (js-yaml 5.4.2, wrangler 4.141.0, astro 7.3.5, @astrojs/cloudflare 14.3.3; bundled runtimes rebuilt). All four CI checks green. Awaiting the owner's squash-merge; then close the three as superseded |
| `/changelog` direction set | **Merged as #570**: hand-written v2.1 card in Coming Next, Planned reads v2.2 → v2.3, votes labelled advisory, e2e re-pinned. Needs a rebase and fresh evidence after #568 merges |
| Roadmap issues | #3 edited (2026-09-21); #1 and #4 carry the v2.1 direction note; #5 moved off the v2.1 milestone |
| PR #552 | Closed, branches kept for salvage into 2.1 |
| #494 | **Merged** after rebase and fresh evidence |
| v2.0.4 ship | **Done 2026-09-27.** Signed tag `v2.0.4` on `91a2124`; pre-deploy verdicts (#572, rebound twice as Codex merged #569 and #571); staging and production serve `0f3410c`; baseline refreshed (#573) and corrected after a production redeploy (#574) |
| Untracked audit packs in the main checkout | **Committed in this PR** (owner, 2026-09-27): the v2.0 simulation audit reports and the audit-remediation plan, local paths redacted, raw `evidence/` left out |

## Sprint 1: OSS split — phases C2–C7

### Deliverables
- **Re-derive the runbook first.** `docs/runbooks/oss-split-execution-handoff.md` was written at v1.8.3 with 29 skills; the catalog is now 36 skills at v2.0.x with a shared runtime, `oc-update`, `oc-hindsight`, `oc-evolve` and new scripts. Re-derive `split/product-paths.txt`, the expected tag list, the C4 `package.json` block and the C7 skill count against the current tree, and PR that as runbook rev 5 for human review.
- C2 extraction in a fresh clone → C3 verification → C4 bootstrap commit.
- **⛔ HUMAN — C5 cut-over.** Work stops here and asks the owner for an explicit "flip now" *(owner: ask me when we reach it)*.
- C6 consume PR in the site repo; C7 cut-over verification, including a fresh-directory `/plugin marketplace add` + `/plugin install opchain`.
- C8 retirement is **not** in this sprint; it waits until C7 is fully green and a release has shipped from the product repo.

### Test requirements
- C3's checks on the rewritten history (tags present, no secrets via `gitleaks`, no dangling symlinks, product validators pass in the extracted repo).
- Site repo: full CI green on the consume PR with the vendored/submodule tree.
- Rollback rehearsal: confirm the mirror workflow can be re-enabled and dispatched.

### Definition of done
`asfbay-bit/opchain-skills` is the product source of truth with real history; the site repo builds from it; plugin install works from a clean directory; the path freeze is lifted; the architect checkpoint's blocker is cleared.

### Dependencies
Sprint 0 (a quiet PR queue — the freeze covers ~25 scripts). **Effort:** CLAUDE 10–16h | USER 4–6h (manifest review, freeze, flip, live install test).

## Sprint 2: Host matrix and runtime-free mode

### Deliverables
- A per-host install matrix, observed not assumed: Claude Code, Claude.ai, Desktop, Cowork, Codex / MCP-only — what installs, what runs, what is lost.
- Every skill's checkpoint read/write has a documented no-Node, no-git fallback; `gen-skills-catalog` fails a skill that cites a runtime command without one.
- Skill `references/` reachable for MCP-only clients through a tool, not only `resources/read`.
- Claude.ai import spike: write down what is actually possible. **No one-click claim unless the spike proves it.**

### Test requirements
- Catalog validator unit tests for the new fallback rule (happy + failing fixture).
- MCP server tests for the references tool.
- The 36-skill simulation harness re-run in runtime-free mode.

### Definition of done
The matrix is published on `/install` with every cell backed by an observation and a date; a skill loaded as instructions only can resume from a hand-written checkpoint without being told to run Node.

### Dependencies
Sprint 1 (skills now live in the product repo). **Effort:** CLAUDE 12–18h | USER 3–4h (host observations on real accounts).

## Sprint 3: Portability and hosted-store debt

### Deliverables
- The 14 critical findings of `docs/audits/2026-07-04-portability-audit.md`, then the highs that block a clean-machine install. Re-verify each against current code first; several predate 1.9.1 and 2.0 and may already be closed.
- Hosted checkpoint store residuals: token revocation, a delete tool, content validation against the protocol, separation from the lead-capture KV namespace.
- PX-02: `/privacy` checked line by line against code.
- Correct `CLAUDE.md`'s description of `did.json`.

### Test requirements
- One regression test per fixed critical.
- Handler tests for revoke and delete (happy + error).
- A clean-machine install rehearsal recorded as evidence.

### Definition of done
Zero open criticals in the portability audit; the code-auditor checkpoint's open loop can close or states exactly what remains; `/privacy` matches code.

### Dependencies
Sprint 2 (the matrix defines "portable"). **Effort:** CLAUDE 14–20h | USER 2–3h.

## Sprint 4: Templates and the marketplace listing

### Deliverables
- 3–4 starter templates: a stack-forge pack + skill bundle + checkpoint defaults each.
- **Marketplace v1 = a listing page only** *(owner)*: public catalog of skills, packs and templates with install paths, compatibility notes and maintainer metadata, generated from the same catalog data as `/skills.json`. No submission intake, no third-party listings, no new write endpoint.

### Test requirements
- Template smoke test: each scaffolds and passes its own checks.
- e2e for the listing page; Lighthouse budgets at `error` level like every other route.

### Definition of done
A new user can go from the listing page to a working template without reading another page; the page adds no release surface that is not generated.

### Dependencies
Sprint 2. **Effort:** CLAUDE 8–12h | USER 2h.

## Sprint 5: Update integrity, surface generator, cut

### Deliverables
- Verify the advertised `/update` endpoint end to end; publish `did.json` with a written key-custody and rotation procedure; sign the update manifest. Nothing is described as signed before the DID document resolves.
- Release-surface generator: every live version claim stamped from `skills/CHANGELOG.md`; `check-release-surfaces` probes the hero version.
- Cut v2.1.0 from the product repo under `RELEASING.md`, tag (signed), deploy staging → production, refresh the monitoring baseline.

### Test requirements
- Signature verification test with a tampered manifest (must fail).
- Generator idempotence test; surface audit per `RELEASING.md` §6.

### Definition of done
`did:web:opchain.dev` resolves; an updater run verifies a signature; no post-release "surface honesty" patch is needed for 2.1.0.

### Dependencies
Sprints 1–4. **Effort:** CLAUDE 10–14h | USER 4–5h (key generation, deploys, tag).

## Totals and risks

Roughly CLAUDE 58–86h | USER 17–23h. The one irreversible step is C5; everything before it is a scratch clone. The largest unknowns are how much of the runbook has rotted since v1.8.3 and how many portability criticals are already fixed.

**Explicitly out:** editor extension, marketplace submissions or third-party listings, C8 retirement, wire 1.2.
