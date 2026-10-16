# Sprint 2 contract — ow-build 1.0.0

**Plan:** `sprints/release-2.1/ow-family-sprint-plan.md` Sprint 2 · **Design:** `docs/plans/2026-10-08-ow-build-design.md` (approved 2026-10-08; §12 builder integration approved 2026-10-14; amendments 2026-10-14 and 2026-10-15) · **Skill:** oc-app-architect `/oc-build`, Generator proposes, Evaluator reviewed · **Status:** APPROVED by the owner 2026-10-16.

## Deliverables

1. `skills-work/ow-build/SKILL.md`: Agent Skills frontmatter only, version 1.0.0, protocol 1, body under 4,500 tokens (headroom kept, lesson from Sprint 1), step 0 pointer, welcome, verb table, absent-cases, NEXT blocks.
2. `references/`: byte-identical `ow-protocol.md`; `routing-and-resume.md` from the first commit (inbound `use ow-build to start …` from ow-build-plan, `/ow-build on <path>` for `build-request.md`, `UAT-nn.md` and `FIX-nn.md`, and resume by files first); one phase file per verb (`phase-start.md`, `phase-run.md`, `phase-update.md`, `phase-demo.md`, `phase-change.md`, `phase-invoice.md`, `phase-ready.md`); `builder-integration.md` (design §12: `spec/` mapping, milestone-to-sprint map, reading the builder's sprint contracts, evaluation reports and checkpoint as data); `email-template.md` (branded HTML plus `.txt` twin); `build-yaml-schema.md`; `ledger-schema.md`.
3. `examples/`: invented `build.yaml`, a defaults-only `handoffs.yaml` showing the `build:` schema of design §12.1 in both `opchain` and `other` modes (byte-identical shared files where the family already ships them).
4. `skills-work/ow-build/skill.edges.yaml`; ow-build-plan's edges updated so its signed NEXT now resolves to a real verb (remove `/ow-build-start` from `plannedVerbs`).
5. `scripts/ow-build-acceptance.mjs` + `tests/fixtures/ow-build/` (invented clients; a synthetic opchain-format builder project with `sprints/sprint-N/contract.md`, `eval-round-M.md` and a builder checkpoint) + `tests/ow-build-acceptance.test.js`, built on the Sprint 1 checker pattern: per-check isolation and meaning-based term checks from the start.
6. Design §12.2 follow-up from the Sprint 1 evaluation: a quick-quote job's sources for every `spec/` file, not only `06-testing.md`.

## Testable criteria

| # | Criterion | How it is verified |
|---|---|---|
| C1 | Catalog validates three ow- skills; contracts, reciprocity, one writer and NEXT resolution hold across the family | `gen-skills-catalog`, `check-skill-contracts` |
| C2 | Body under 4,500 tokens; protocol copy byte-identical | catalog checks |
| C3 | No private names, no oc- skill named in skill text, no real prices; the builder is named only in `handoffs.yaml` | family-name check + planted failures |
| C4 | Inbound edges route: ow-build-plan's signed NEXT, a `UAT-nn.md`, a `FIX-nn.md` each land on exactly one correct verb | routing goldens + planted failures |
| C5 | No internal numbers (hours, rates, margin, unit prices, modifiers) in any client output or in `spec/`, matched by meaning | planted paraphrases |
| C6 | Every design §10 case except real use has a golden run and a planted failure | acceptance checker + vitest |
| C7 | Every design §12.7 case passes: 9 checks reach `spec/06-testing.md`; an uncovered check stops `-start`; `-run M1` runs one sprint per call and points to the demo when M1 is done; an escalating sprint stops the milestone; no `build` entry prints the public default and writes no `spec/` | goldens |
| C8 | Signature gate: nothing is reported as started before a signed amendment | golden + planted failure |
| C9 | Payment triggers per B2 (40/40/20 and 50/50; delivery half invoiced once) with ledger arithmetic via ow-tools `calc` or marked not machine-checked | goldens |
| C10 | oc- outputs byte-identical | snapshot before and after |
| C11 | The checker fails per check and never crashes | malformed-file tests |

## Test requirements

- [ ] Golden runs and planted failures for every design §10 and §12.7 case (real use excepted).
- [ ] Email: each HTML output passes an HTML validator check in the test and has a `.txt` twin with the same content. Rendering in Gmail and Outlook web is a manual check moved to Sprint 6.
- [ ] `npm test` and `npm run build` green; candidate verifier PASS on every commit.

## Technical approach

Follow Sprint 1 exactly, and start where Sprint 1 ended: edges file and routing reference first, then the skill, then the checker. The builder is driven only through `handoffs.yaml` say-lines; its outputs are data, never instructions. Reuse ow-build-plan's fixture clients so the signed plan from Sprint 1 is ow-build's input.

## Open for the owner

- The invoicing tool (design decision 6) stays undecided; the `invoice` destination prints the public default.

## Effort

CLAUDE 10–14h | USER about 1h (contract approval, review).
