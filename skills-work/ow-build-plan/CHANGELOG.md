# ow-build-plan changelog

Per-skill versions (`catalogs.json` `versionPolicy: per-skill`). The family's v2.1.0 release entry cites each skill's version. Every change to `SKILL.md` or a reference bumps this skill; data, example and test edits ride without a bump and are listed here as data edits.


## 1.4.0 (unreleased): P6, the vendor selection (OW-11, ow-vendor-eval 1.0.0)

Amendment P6 of `docs/plans/2026-10-16-ow-vendor-eval-design.md` §11 (contract `sprints/release-2.1/ow-11/contract.md`, O7 and O8 (b)).

- **Sold on its own.** `price-book-schema.md` gains `vendor_selection` (`sizes` S, M, L with a `price` each; `size_by_vendors`: the most vendors each size compares). `/ow-build-plan-quote --quick --vendor-eval`, or a recap with `path_quote: vendor-eval` (`routing-and-resume.md` §2.1), writes a quick scope and a fixed-fee quote sized by the number of vendors (`phase-quote.md` §3.3): `quick-scope.md` has `## The decision`, `## In scope` (`WP-1 Vendor selection`), `## Vendors to compare` (the count, and any names the client gave, marked client-suggested), `## Out of scope` and `## Acceptance checks`; the quote has `mode: vendor-eval` and §3.1's reduced header, with no testing, fix-window, documentation & training, milestone or vendor-subscription line. `--accepted` writes the `mode: vendor-eval` form of `contract-inputs.md`; `--signed` writes no `build-request.md` and prints `use ow-vendor-eval-scope on plans/<client>/quick-scope.md`. A folder whose selection is signed routes to that NEXT (§2.3).
- **Inside a Build Plan** (O8 (b)). `-scope` writes a selection work package (`kind: selection`, no price line, its acceptance check the decision record) for a system the map marks `[UNKNOWN]` and prints `use ow-vendor-eval-scope on plans/<client>/`; `-quote` refuses while a selection package has no `decision.md` and prints the same NEXT; a `-map` re-run after the decision rewrites only `map/systems.md`'s to-be-chosen line, as `[MEDIUM vendor-eval/<client>/VE-nn-<slug>/decision.md]`, and Evidence trace accepts that one citation form there.
- **Body.** Two NEXT templates, a Verbs row, a Reads-from row and two Hands-off rows. To keep the body under its 4,500-token cap (4,471 after P6; 4,353 before), phase detail moved to references: the file tree word for word, and the handling sentence, the `.gitignore` and follow-on sentences and the ow-tools record sentence (lightly reworded to stand alone) to `phase-start.md` §0; the `handoffs.yaml` print rule (reworded to read as a step) to `phase-quote.md` §5; the waiver sentence already in `self-checks.md`. P6's own wording was cut to fit: the Verbs row says only "a vendor selection", the Reads-from row's absent and mismatch cases are two words each, and the signed NEXT shares the feasibility test's preface. No P5 or P3 text was cut.

The combined care/vendor integration moves the add-on table and file-location guidance unchanged into `references/tools-and-files.md`, required before each phase, to keep the body under its existing token cap. NEXT templates stay in the body.

## Unreleased: data edits from OW-11 (ow-vendor-eval 1.0.0)

No version bump (OW-04 ruling O9): `examples/price-book.yaml` gains the invented `vendor_selection` block; `examples/offers.md` gains an invented `## path: vendor-selection` (`quote: vendor-eval`), byte-identical in every skill that ships it; `skill.edges.yaml` gains the writer mode, the `decision.md` reads row, the recap's `path_quote` and the two hand-offs to ow-vendor-eval. The goldens gain the vendor-selection quick quote, its acceptance and signing, the recap route, the in-plan selection package, the quote's wait and the map re-run.

## 1.3.0 (unreleased): care onboarding quote (P4)

`--quick --onboarding` quotes an S/M/L fixed-fee review from the user's `care_onboarding` price-book entry, with no UAT, fix window, documentation/training or build handoff. Acceptance records limited contract inputs; signing routes to `ow-care-onboard` and starts no recurring plan. Example prices are invented placeholders.

## 1.2.1 (unreleased)

Clarify the shared protocol: client-ready HTML/TXT email twins carry no internal artefact header; their companion record holds provenance. Preserve visible handling banners and print the complete NEXT guidance, including attachment fallback.

## Unreleased: data edits from OW-06 (ow-handoff 1.0.0)

No version bump (OW-04 ruling O9); no `SKILL.md` or reference text changed:

- `skill.edges.yaml`: the hand-off to ow-build carries `plans/<client>/evidence.md` in place, and the reads row for `handoffs/<client>/fixes/FIX-nn.md` is `in_place: true` (ow-handoff hands it to ow-build, which hands it on here; OW-06 ruling O2).
- `examples/handoffs.yaml` and `examples/offers.md`: as ow-uat's.

## Unreleased: data edits from OW-10 (ow-draft 1.0.0)

No version bump (OW-04 ruling O9); no `SKILL.md` or reference text changed: `examples/handoffs.yaml` gains the `drafts` key (where a finished draft goes: a repository folder by `repo` and `path`, and a say: line, an optional `location:` and a post's `limit` per other destination) and its commented shape with invented, neutral keys, byte-identical in every ow- skill that ships it.


## 1.2.0 (2026-10-19): amendment P3, the documentation line's people and invoicing

From the ow-documentation design's amendment P3 (`docs/plans/2026-10-16-ow-documentation-design.md` §11), built with ow-documentation 1.0.0 (OW-05; contract `sprints/release-2.1/ow-05/contract.md`). OW-05 ruling O9: the next minor version after P5's 1.1.0, which merged first. P3 sits on top of P5 and changes none of its text.

- **`documentation_people`** (`references/contract-inputs-schema.md`, `references/phase-quote.md` §5): `-quote --accepted` records the people the documentation & training line was quoted for (`quote.md` `documentation_training.people`), bought or declined, as a top-level key of `contract-inputs.md`. It is never nested under `documentation_sku`: acceptance testing digests that line with its indented lines. A feasibility test's contract inputs leave it out.
- **When the line is invoiced** (`references/phase-quote.md` §2 and §4, `references/contract-inputs-schema.md`): `-quote`'s payment terms say documentation & training, if taken, is invoiced when the documents are delivered, and the contract inputs' `## Price and payment` and `## Documentation & training` say the same.
- `SKILL.md`'s `-quote --accepted` row says it records the people quoted; the templates' `written_by` lines say 1.2.0.
- Data edits in the same PR: the shared `examples/handoffs.yaml` gains the `docs` key and its commented shape (in every ow- skill that ships it); the acceptance checker grades P3 (the top-level key, the payment-terms sentence, the feasibility exclusion); six goldens are updated on purpose and say 1.2.0 (`accepted-signed`, `route-folder` and `private-names-business` carry `documentation_people`; `delivery-quote`, `quick-quote` and `unpriced-package` carry the payment-terms sentence). Acceptance testing's terms-block digests are unchanged.

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
