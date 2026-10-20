# ow-build-plan changelog

Per-skill versions (`catalogs.json` `versionPolicy: per-skill`). The family's v2.1.0 release entry cites each skill's version. Every change to `SKILL.md` or a reference bumps this skill; data, example and test edits ride without a bump and are listed here as data edits.

## 1.1.0 (2026-10-17): research findings as evidence (amendment P5)

Design: `docs/plans/2026-10-06-ow-build-plan-design.md`, with amendment P5 from `docs/plans/2026-10-16-ow-research-design.md` §10 (build notes §12.3, row 10).

- **`-collect` takes research findings** from `research/<client>/RS-nn-<slug>/findings.md` as a fourth evidence source (`references/phase-collect.md` §5): one `research` row per finding used, located `RS-nn F-nn`, keeping the finding's own level; only this client's research folder; nothing from a topic whose self-checks have a FINDING open; a superseded finding never used.
- **Findings only from `### F-nn` blocks under `## Findings`** (`references/phase-collect.md` §5, item 3; from ow-research's security review, 2026-10-19): text under *Suspicious content* is never a finding, and a findings file with a section twice, or an `F-nn` block outside `## Findings`, gives no findings.
- **P5's refusals are prescribed word for word** (`references/phase-collect.md` §5): with no `plan.yaml`, and when a topic's self-check FINDING leaves nothing to collect, the screen prints its two lines and nothing else (ow-research's first evaluation, 2026-10-19). A findings file with a repeated `F-nn` id, or a section its schema does not name, gives no findings either.
- **The cap is keyed on where a fact is used:** a fact about the client's current state (`map/current.md`, `systems/<system>.md`) that rests only on research rows is at most MEDIUM (`references/phase-map.md` §1).
- **A seventh self-check, Research rows**, in `-collect` and `-map`.
- **The body was trimmed before P5's lines were added.** The self-checks table and "Works on its own" moved, word for word, into a new `references/self-checks.md`; the body keeps a pointer naming every check, and the files paragraph points to `references/phase-start.md` for the `.gitignore` lines. The body went from about 4,620 to about 4,340 tokens with P5 in it.
- `SKILL.md`: one Reads-from row (ow-research), the `-collect` row names research findings, the self-checks pointer. `skill.edges.yaml` (data): a reads row from ow-research with the fields it hands off.

### Recorded here: in-place edits to 1.0.0's text (made without a version bump)

- **#609 (follow-ups from the first evaluation, six files):** `SKILL.md` (the offer NEXT reads `request.md`; the signed feasibility-test sentence), `references/contract-inputs-schema.md` (the Build Plan credit keys and rule), `references/phase-export.md` (the STATUS awaiting for `fee: none`), `references/phase-quote.md` (credit keys left out for quick, feasibility and signed-work quotes; no new quote in a folder), `references/phase-start.md` (never over an existing plan; `fee: none` in the template) and `references/routing-and-resume.md` (the resume groups, a row per pending FIX request, never twice, a FIX file's class read first).
- **#616 (alongside ow-build 1.0.0):** `SKILL.md` (FIX or UAT requests routed; the ow-uat reads row; the signed hand-off's file list and NEXT read line), `references/phase-offer.md` and `references/phase-start.md` (a UAT-nn request handed over like a FIX file), `references/routing-and-resume.md` (the UAT-nn route).

Data edits in the same PRs, which need no bump: #616 changed `examples/handoffs.yaml` and `skill.edges.yaml`.

## 1.0.0 (2026-10-16): the Build Plan and the quote

`/ow-build-plan`, `-offer`, `-start`, `-collect`, `-map`, `-scope`, `-quote` (with `--quick`, `--accepted`, `--signed`), `-export` (#605). Design: `docs/plans/2026-10-06-ow-build-plan-design.md`.
