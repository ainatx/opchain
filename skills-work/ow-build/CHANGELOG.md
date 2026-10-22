# ow-build changelog

Per-skill versions (`catalogs.json` `versionPolicy: per-skill`). Every change to `SKILL.md` or a reference bumps this skill; data, example and test edits ride without a bump and are listed here as data edits.

## Unreleased: data edits from OW-06 (ow-handoff 1.0.0)

No version bump (OW-04 ruling O9); no `SKILL.md` or reference text changed:

- `skill.edges.yaml`: the ready hand-off to ow-uat carries `plans/<client>/map/systems.md` and `evidence.md` in place; the hand-off to ow-build-plan for a FIX-nn too big for a change order lists `handoffs/<client>/fixes/FIX-nn.md` in place; the reads row for `FIX-nn.md` gains the field `route` (its routing already branches on `route: care`; OW-06 ruling O2).
- `examples/handoffs.yaml`: as ow-uat's.

## 1.0.0: the client side of a signed build (Sprint 2, #616)

The first release; see `docs/plans/2026-10-08-ow-build-design.md`.
