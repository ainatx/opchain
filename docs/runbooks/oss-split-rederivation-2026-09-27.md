# OSS split — re-derivation against the v2.0.4 tree (2026-09-27)

**Status:** DRAFT for the ⛔ HUMAN manifest review at C1. No extraction, no history rewrite, no pushes to `asfbay-bit/opchain-skills` have happened.
**Base:** `origin/main` @ `5737bc2` (v2.0.4 shipped; production serves `0f3410c`). The import closure was re-run on this commit, after oc-time-ops #576, with the same result.
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

After these additions the import closure has **one** unresolved edge, listed first below.

## Decisions for the C1 review

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
| C4 product `package.json` | `version: 1.8.3`, `dependencies: js-yaml` | `version: 2.0.4`; runtime dependency `zod` ^4.6.5, dev `js-yaml` ^5.4.2 (both bundled into the runtime build) |
| C7 plugin install check | "hooks + 29 skills" | hooks + **36** skills, **16** plugin commands |
| Phase D first product release | `v1.8.4` or `v1.9.0` | **v2.1.0** (the release this sprint belongs to) |
| Runbook "current state" block | v1.8.3 closeout, prod `395fc31` | v2.0.4, prod `0f3410c`, baseline #573 / #574 |

## Next

1. Owner reviews this document and the manifest diff; decides items 1–7.
2. Apply the decisions, run the second test-placement pass (item 5), and bump the runbook to rev 6 with the corrected values.
3. Then C1's human freeze announcement, and C2 in a fresh clone. **Work stops before C5** for an explicit "flip now".
