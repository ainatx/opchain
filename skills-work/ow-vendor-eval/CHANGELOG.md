# ow-vendor-eval changelog

Per-skill versions (`catalogs.json` `versionPolicy: per-skill`). The family's v2.1.0 release entry cites each skill's version. Every change to `SKILL.md` or a reference bumps this skill; data, example and test edits ride without a bump and are listed here as data edits.

## 1.0.0 (2026-10-21): first release

Design: `docs/plans/2026-10-16-ow-vendor-eval-design.md` (decisions 1–4; amendments P6, S2 and D2), with its build notes. Contract: `sprints/release-2.1/ow-11/contract.md`.

- **Eight verbs, four modes, two evaluation modes.** `/ow-vendor-eval` (and `on <path>`), `-scope` (and `--revise`), `-longlist`, `-evidence <vendor>`, `-score`, `-recommend` (and `--waive`), `-decide <vendor>`, `-formal` (and `--clarification`, `--responses`). The first question is commercial or formal; in formal mode the panel decides, and nothing is scored, ranked, shortlisted or recommended.
- **Criteria first.** Criteria, weights (summing to 100, machine-checked), must-haves, the horizon and seats are agreed by the client, by the criteria set's digest, before any vendor is named. A revision after scores is dated, reasoned and agreed, and everything is re-scored; after the recommendation is exported, a change is a new evaluation that supersedes the old one (owner decision O6).
- **Evidence and scores.** Facts per criterion from ow-research's findings (claim, level and sources copied exactly) and the user's files (`shown` only when the user confirms the demo notes are their own); knock-outs only on HIGH evidence; scores 0–3 citing facts; totals and costs through `ow-tools calc total`.
- **Conflicts, never waived.** A general declaration after the freeze, each vendor's (and each bidder's) own answer when it is added, and a conflicts statement in every recommendation.
- **Hand-offs.** ow-research's findings in; ow-build-plan's vendor-selection quick scope and selection work package in (P6) and the decision back to its map; ow-start's index of the decision (S2); ow-draft's nine D2 fields from the recommendation.
