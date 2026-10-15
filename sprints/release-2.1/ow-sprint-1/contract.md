# Sprint 1 contract — ow-build-plan 1.0.0

**Plan:** `sprints/release-2.1/ow-family-sprint-plan.md` Sprint 1 · **Design:** `docs/plans/2026-10-06-ow-build-plan-design.md` (approved 2026-10-08, amendments 2026-10-14) · **Skill:** oc-app-architect `/oc-build`, Generator proposes, Evaluator reviewed · **Status:** APPROVED by the owner 2026-10-15.

## Deliverables

1. `skills-work/ow-build-plan/SKILL.md`: Agent Skills frontmatter only (catalog fields under `metadata`), version 1.0.0, protocol 1, body under the 5k-token budget, step 0 pointer to `references/ow-protocol.md`, welcome, verb table, absent-cases, NEXT blocks.
2. `references/`: byte-identical `ow-protocol.md`; one phase file per verb group (`phase-offer.md`, `phase-start.md`, `phase-collect.md`, `phase-map.md`, `phase-scope.md`, `phase-quote.md`, `phase-export.md`); `acceptance-check-format.md`; `price-book-schema.md`; `contract-inputs-schema.md`.
3. `examples/`: invented `price-book.yaml` (placeholder numbers, every key from design §6.1 including `uat` and `documentation_training`), `brand.yaml` in the ow-tools §5.2 shape, `offers.md` with `after_handoff` and an empty `contract_clauses` comment, defaults-only `handoffs.yaml`.
4. `skills-work/ow-build-plan/skill.edges.yaml` and the same file for `ow-start`: reads-from and hands-off-to rows (contract R15).
5. `check-skill-contracts` gains: edge reciprocity (every hands-off row has a matching reads-from row in the receiver, and the reverse, inside the family); one-writer (no artefact path has two writer verbs across the family, append-logs excepted); NEXT targets resolve to a declared verb or a `handoffs.yaml` destination.
6. `scripts/ow-build-plan-acceptance.mjs` + `tests/fixtures/ow-build-plan/` with golden runs, answer keys and `tests/ow-build-plan-acceptance.test.js` planting each failure.
7. ow-start reads-row update: its recap `path_*` header is declared as an output ow-build-plan reads (edge, not prose).

## Testable criteria

| # | Criterion | How it is verified |
|---|---|---|
| C1 | Catalog validates both skills | `node scripts/gen-skills-catalog.mjs` prints 2 ow skills; `check-skill-contracts` passes |
| C2 | Body under 5k tokens; protocol copy byte-identical | catalog checks |
| C3 | No private or business names anywhere in the skill | family-name check; a planted `llc-ops` in a reference fails it |
| C4 | Edge reciprocity holds and is enforced | test plants a one-sided edge and a dangling NEXT; both fail |
| C5 | One writer per artefact across the family | test plants `contract-inputs.md` as a second verb's output; fails |
| C6 | Every §9.2 acceptance case has a golden run that passes | `node scripts/ow-build-plan-acceptance.mjs` |
| C7 | Every §9.2 case has a planted failure the checker catches | vitest |
| C8 | Internal appendix inside `ow:internal` markers; export omits it | golden quote + ow-tools preflight run in the test |
| C9 | `--signed` before `--accepted` refuses; `--signed` NEXT names `ow-build-start` with the `build` destination as the IF IT IS NOT AVAILABLE branch | golden run + planted failure |
| C10 | oc- outputs byte-identical | snapshot before and after, as in #596 |
| C11 | Checker fails per check, never crashes the run | malformed-file tests (same isolation pattern as the ow-start follow-up) |

## Test requirements

- [ ] Golden runs for: tier-2 synthetic client, unpriced package, un-evidenced modifier, dates and terms (above and below `size_threshold`), credentials never written, builder-neutral plan, Build Plan offer, quick quote (two-unit job and over-limit refusal), UAT and documentation lines, fix window, accepted and signed, follow-on intake from `FIX-nn.md`, no private names (empty and Deftwright-style `handoffs.yaml`).
- [ ] A planted failure per case.
- [ ] Reciprocity, one-writer and NEXT-target tests in `tests/catalogs.test.js` or a new file.
- [ ] `npm test` and `npm run build` green; candidate verifier PASS on every commit.

## Technical approach

Follow the ow-start build (#596) exactly: same frontmatter rules, YAML artefact header with separate `created`/`clock` keys, no npm scripts (root `package.json` is bundled into five oc- skills), checker run as `node scripts/...`. Write the edges files first, then extend `check-skill-contracts`, so ow-build-plan's own text is checked by the new rules from its first commit. Reuse the ow-start checker's structure with the per-check isolation from the follow-up PR.

## Evaluator review of this contract

- **Pushed back:** "real use" (design §9.2 last bullet) cannot be graded this sprint; it moves to Sprint 6 as the plan says. Accepted.
- **Pushed back:** the price-book numbers are the owner's (design §10 Q1); the sprint ships structure and placeholders only. Accepted.
- **Added:** C11 so the new checker inherits the ow-start audit's F-004 lesson rather than repeating it.
- **Owner decision 2026-10-15 (design §10 Q2):** no re-run mode in 1.0.0. Phase 2 for an existing client is a new Build Plan through the A4 follow-on intake, with the same quote rules; revisit after real use.

## Effort

CLAUDE 8–12h | USER about 1h (contract approval, review of the price-book structure).
