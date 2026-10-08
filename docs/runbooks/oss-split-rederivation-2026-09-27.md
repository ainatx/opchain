# OSS split — re-derivation against the v2.0.4 tree (2026-09-27)

**Status:** the owner answered decisions 1–7 on 2026-10-07 and they are applied below (manifest now 114 entries). The three open items from the test-placement pass were also decided: all stay site-side (see "Open items from the test-placement pass"). The ⛔ HUMAN review of the final manifest diff is still pending. No extraction, no history rewrite, no pushes to `asfbay-bit/opchain-skills` have happened.
**Base:** `origin/main` @ `5737bc2` (v2.0.4 shipped; production serves `0f3410c`). The import closure was re-run on this commit, after oc-time-ops #576, with the same result.
**Re-checked 2026-10-07** on `origin/main` @ `5a40d97`. Since the base, main has merged:

- #594: docs only (`CLAUDE.md` and the Cloudflare-challenge runbook; neither is a manifest path);
- #593: CI installs with npm 11 (three workflows, which stay site-side, and one added sentence in `CONTRIBUTING.md`, a manifest path that needs no manifest change);
- #592: site dependency bump (`site/` only);
- #585 and #589: oc-time-ops transcript fixes;
- #591: dependency overrides;
- #500: vitest 5;
- #582: production baseline after a secret change (production still serves `0f3410c`);
- #590: the top-navigation rule in skill content;
- #584: GATE-12 in the plugin hooks, which still import nothing local.

None of these changed the manifest. The tag, skill and command counts below are unchanged. The manifest grew only through the owner's decisions, from 72 to 114 entries (see "Manifest additions" and "Decisions for the C1 review"). The C4 row was corrected: see the note under the stale-values table.
**Supersedes, where they differ:** the counts, tag list, `package.json` block and first-release version in `docs/runbooks/oss-split-execution-handoff.md` (rev 5, written against v1.8.3). Everything else in that runbook — ordering, human gates, rollback — still holds.

## Why this exists

The OSS split is v2.1 Sprint 1 (`sprints/release-2.1/sprint-plan.md`). The runbook and `split/product-paths.txt` were written at v1.8.3, when the catalog had 29 skills and no shared runtime. Since then v1.9 and v2.0 added the checkpoint runtime, the updater, `oc-hindsight`, `oc-evolve`, the candidate verifier and the release-evidence gates. Running C2 with the old manifest would extract a product repo whose skills cannot build their bundled runtime.

## Method

1. **Import closure.** Starting from every JS file the manifest already selects, follow relative `import` / `require` edges. Any file reached but not listed is a missing product dependency.
2. **Bundle sources.** Read `scripts/sync-skill-bundles.mjs`, `scripts/build-runtime.mjs` and `scripts/sync-plugin-skills.mjs` for the source files they copy into `skills/*/scripts/runtime/` and `plugins/opchain/skills/`.
3. **Skill references.** Count how often each unlisted script is cited from `skills/`, `plugins/` and `mcp/`.
4. Plugin hooks were checked separately: `plugins/opchain/hooks/*.cjs` import nothing local.

## Manifest additions in this PR (54 → 72 entries)

Each was reached by method 1 or 2 and has no site-only dependency.

| Add | Why it is product |
|---|---|
| `scripts/runtime/` | Source of the shared runtime copied into five skills (core, project, learning, scorecard, hindsight, evolve, evaluation, prompt engine, catalog, licences) |
| `scripts/runtime-manifest.json` | Runtime file inventory the bundle sync and updater read |
| `scripts/build-runtime.mjs` | Builds the bundled prompt engine; first half of `npm run sync-bundles` |
| `scripts/lib/prompt-eval/`, `scripts/prompt-eval.mjs` | Imported by `scripts/runtime/prompt-engine-entry.mjs`; the `oc-prompt` CLI that `oc-prompt-ops` cites |
| `scripts/opchain.mjs` | The runtime CLI entry point; 32 references from skills |
| `scripts/update-opchain.mjs`, `scripts/update-bootstrap.sh` | The `oc-update` updater and its bootstrap, bundled into skills |
| `scripts/lib/telemetry-aggregate.mjs` | Imported by `scripts/telemetry.mjs` (already listed) |
| `scripts/check-skill-contracts.mjs` | Product validator (verbs, orchestrator §7 parity); 74 references from skills |
| `src/lib/mcp/checkpoint-contract.js`, `checkpoint-store.js`, `local-checkpoint-store.js`, `references.js` | Imported by `src/lib/mcp/server.js` and `mcp/local-server.mjs` (already listed); the stores are also bundled into skill runtimes |
| `tests/check-skill-contracts.test.js`, `tests/checkpoint-cli.test.js`, `tests/mcp-routing-coverage.test.js`, `tests/routing-disambiguation.test.js` | Import only product modules; they test the validators and routing that move |

After these additions the import closure had **one** unresolved edge (decision 1, now resolved).

**Added by the owner's decisions (72 → 114 entries):**

| Add | From decision |
|---|---|
| `scripts/lib/release-evidence.mjs`, `scripts/lib/verification-receipt.cjs`, `scripts/verify-candidate.mjs` | 2 (dual-homed) |
| `scripts/cost.mjs`, `scripts/lib/cost/`, `scripts/lib/execution-kits/` | 4 |
| `scripts/capabilities.mjs`, `docs/capabilities.md`, `scripts/package-runtime.mjs` | 4. `capabilities.mjs --generate` writes `docs/capabilities.md`, so the doc moves with it. The site README's link to it is repointed at C6 |
| 33 test files, listed under decision 5 | 5 |

The import closure of the final 114 entries has **no** unlisted edges.

## Decisions for the C1 review

**Owner answers, recorded 2026-10-07** (the options and reasoning that follow are the original questions):

| # | Answer |
|---|---|
| 1 | Product version of the eval test. `tests/opchain-eval.test.js` no longer imports the site registry; it checks each verb against the skills' own `commands:` frontmatter, and flag coverage stays site-side in `check-skill-flags.mjs`. Applied in this PR (79/79 tests pass). |
| 2 | Dual-home the three release-evidence files. |
| 3 | `check-release-surfaces.mjs` stays site-side; a product README check is added at Phase D. |
| 4 | Move `cost.mjs`, `lib/cost/`, `lib/execution-kits/`, `capabilities.mjs` (with `docs/capabilities.md`) and `package-runtime.mjs`. **Revised for one file:** `release-sequence.mjs` stays site-side. It runs the site build, `astro check`, Playwright, Lighthouse and the deploy monitors, and its own header says it is never mirrored. |
| 5 | Scratch-extraction pass. Result below. |
| 6 | oc-time-ops stays site-side for this cut. |
| 7 | The product regenerates the catalogs; the site keeps committed copies. |

**Decision 5 result.** The pass copied the 114 manifest paths plus 44 candidate tests into a fresh directory with no git history, wrote the C4 product `package.json`, ran the C4 bundle sync, made a throwaway checkout there, and ran each candidate test on its own.

- **Move (33 passed):** `audit-commit/{enrollment,receipt,candidate-verifier,commit-boundary}`, `audit-eval/{prompt-eval-core,prompt-eval-runner,prompt-eval-acceptance}`, `audit-integration/{capabilities,runtime-artifact,release-projection}`, `audit-kits/{execution-kits,artifact-acceptance}`, `audit-state/{c1-state-contract,c2-local-checkpoint,c1-local-reference-containment,c3-checkpoint-writer,c3-fresh-mcp-journey}`, `audit-telemetry-pm/{e1,e2,e3}`, and `install-git-drivers`, `learning-runtime`, `runtime-evaluation`, `source-update`, `update-opchain`, `update-telemetry-consent`, `liability-disclaimers`, `merge-checkpoint`, `plugin-commands-doc`, `portable-runtime`, `session-state-hook`, `task-end-hook`, `telemetry-status`. The exact paths are in `split/product-paths.txt`.
- **Stay site-side (11 failed because they read site files):** `audit-release/b2-evidence-gates`, `audit-release/cli-entrypoints`, `hardening-gate` (all read `scripts/deploy.mjs` or `check-release-surfaces.mjs`), `license-strings` (reads `site/package.json`), `flags-skills`, `gen-roadmap`, `release-sequence`, `site-release-chip`, `smoke-script`, and the two `.claude/` tests under open item 1.
- The other 42 unlisted tests import site code directly (the Worker, `site/`, `scripts/lib/time/`, `scripts/build-update-bundle.mjs`, …) and stay.

## Open items from the test-placement pass

These were not covered by decisions 1–7. **Decided 2026-10-07 (owner, relayed by the merge-coordination session): all three keep the site-side default**, and `release-sequence.mjs` staying site-side is approved. The recommendations below record the alternative that was not taken.

1. **Repo-local `.claude/` dev hooks** (`.claude/settings.json` and `.claude/hooks/checkpoint-hygiene.sh`, the Stop hook for `.checkpoints/`). They are not in the manifest, and two tests need them: `audit-commit/compatibility.test.js` and `audit-state/c3-current-run-hygiene.test.js`. *Recommend:* if the product repo is to keep `.checkpoints/` hygiene for contributors, move the two hook files and both tests together; otherwise leave all four site-side. C6 already says to document the repo-local `.claude` hooks.
2. **`scripts/build-update-bundle.mjs`** builds the site's content-addressed update assets (`public/`) from the skills tree. It imports the product's `update-opchain.mjs`, and three tests need it: `update-bundle`, `update-recovery`, `shared-runtime-artifact`. *Recommend:* site-side, since it is a site build step. Record that the product's `oc-update` fetches from the site's assets.
3. **`audit-release/cli-entrypoints.test.js`** tests three CLIs in one file: `check-release-tag` and `lib/release-evidence` (both moving) and `check-release-surfaces` (site-side). *Recommend:* split it at Phase D so the product keeps the first two.

## Original decision text

1. **`tests/opchain-eval.test.js` imports `src/lib/flags/registry.js`** (site-only; it pulls `src/generated/coverage-flags.json`). Options: keep the test site-side (drop it from the manifest), or give the product its own small fixture instead of the site registry. *Recommend:* fixture — the test checks the eval prompts, not the flag registry.
2. **Release-evidence machinery used by both sides:** `scripts/lib/release-evidence.mjs` (18 references from skills; `evidence:pr` / `evidence:deploy`), `scripts/lib/verification-receipt.cjs` and `scripts/verify-candidate.mjs` (the pre-commit candidate verifier). The site's `deploy.mjs` gate and the product's release flow both need them. *Recommend:* dual-home them, like `frontmatter.mjs` and `check-release-tag.mjs` — listed in the manifest **and** kept in the site repo, so C6 must not `git rm` them.
3. **`scripts/check-release-surfaces.mjs`** (12 references from skills) mostly probes site pages, but also the plugin README and mirror README, which move. *Recommend:* keep it site-side and add a small product-side check for the product READMEs at Phase D.
4. **Other skill CLIs with no skill-file references:** `scripts/cost.mjs` (`oc-cost`), `scripts/capabilities.mjs`, `scripts/package-runtime.mjs`, `scripts/release-sequence.mjs`, `scripts/lib/cost/`, `scripts/lib/execution-kits/`. Each needs a yes/no: does a skill run it on a user's machine? *Recommend:* `cost.mjs` + `scripts/lib/cost/` and `scripts/lib/execution-kits/` move (skill tooling); `capabilities.mjs`, `package-runtime.mjs` and `release-sequence.mjs` stay (release and site tooling).
5. **Runtime and audit test suites.** About 40 `tests/audit-*` and runtime tests (`learning-runtime`, `portable-runtime`, `shared-runtime-artifact`, `merge-checkpoint`, `audit-state/*`, `audit-commit/*`, …) exercise product modules but import nothing directly, so method 1 cannot place them. *Recommend:* a second pass that runs each against a scratch extraction and moves those that pass there.
6. **oc-time-ops** (`scripts/timesheet.mjs`, `scripts/lib/time/`, `tests/time/`). Local tooling, not yet a skill, and under active development by another agent. *Recommend:* leave it site-side for this cut and revisit when it becomes a skill.
7. **Generated catalogs** (`src/generated/mcp-catalog.json`, `packs-catalog.json`, `api-dev-adapters.json`). The generators move (`gen-mcp-catalog.mjs` is already listed); the outputs are consumed by the hosted Worker. *Recommend:* the product repo regenerates them and the site keeps committed copies, like the vendored skills tree.

## Stale runbook values (correct before C2)

| Runbook | Written as | Now |
|---|---|---|
| C3 expected tags | `v1.8.0 v1.8.1 v1.8.2 v1.8.3` | `v1.8.0` … `v2.0.4` (12 tags). Check which tagged commits touch manifest paths; a tag on a commit that becomes empty after filtering moves to its nearest rewritten ancestor |
| C3 skill count | 29 `SKILL.md` | **36** |
| C4 product `package.json` | `version: 1.8.3`, `dependencies: js-yaml` | `version: 2.0.4`, `"type": "module"`; runtime dependencies `zod` ^4.6.5 and `js-yaml` ^5.4.2; dev dependencies `vitest` and `esbuild`; no `overrides` |
| C7 plugin install check | "hooks + 29 skills" | hooks + **36** skills, **16** plugin commands |
| Phase D first product release | `v1.8.4` or `v1.9.0` | **v2.1.0** (the release this sprint belongs to) |
| Runbook "current state" block | v1.8.3 closeout, prod `395fc31` | v2.0.4, prod `0f3410c`, baseline #573 / #574 |

**C4 `package.json`, corrected 2026-10-07.** The first draft of the row above listed `js-yaml` as a dev dependency and left out `vitest` and `esbuild`. The bare imports in the manifest's closure give:

- `js-yaml` stays a **runtime** dependency, as rev 5 said. `mcp/local-server.mjs` runs unbundled and reaches it through `gen-mcp-catalog.mjs` → `scripts/lib/frontmatter.mjs`.
- `esbuild` is a dev dependency because `scripts/build-runtime.mjs` imports it. That file is new to the manifest since rev 5.
- `vitest` is a dev dependency, unchanged from rev 5.
- `"type": "module"` is required. The scratch pass without it failed `audit-telemetry-pm/e1` on Node's typeless-package warning, and the root `package.json` has it.
- Leave out the root `overrides.sharp` added by #591. `sharp` only arrives through `wrangler` → `miniflare`, and both stay site-side.

`scripts/runtime-manifest.json` bundles the root `package.json` into the five runtime owners as an exact copy. #591 and #500 show the effect: each was a root-only dependency change, and each rewrote 10 manifest-path files (`skills/*/scripts/runtime/package.json` and their plugin copies). Two consequences:

- **C4:** after writing the product `package.json`, run `npm run sync-bundles` and commit the regenerated runtime copies in the bootstrap commit. Otherwise `sync-bundles:check` fails in product CI.
- **Freeze (C1–C6):** a root dependency PR is a product-path change and breaks the C6 ancestry check. Hold Dependabot and manual root-deps PRs for the freeze.

## Next

1. Owner reviews this document and the final manifest diff. The three open items above are decided (site-side).
2. Decisions 1–7 are applied and the test-placement pass is done. The execution runbook `oss-split-execution-handoff.md` is bumped to rev 7 with the corrected values.
3. Then C1's human freeze announcement, and C2 in a fresh clone. **Work stops before C5** for an explicit "flip now".
