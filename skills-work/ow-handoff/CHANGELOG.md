# ow-handoff changelog

## 1.0.2 (unreleased)

Care handoff routing: the two care NEXT blocks name their owning verbs directly (`ow-care-start` and `ow-care-request`). The frozen handoff records are unchanged.

Per-skill versions (`catalogs.json` `versionPolicy: per-skill`). Every change to `SKILL.md` or a reference bumps this skill; data, example and test edits ride without a bump and are listed here as data edits.

## 1.0.1 (unreleased)

Clarify the shared protocol: client-ready HTML/TXT email twins carry no internal artefact header; their companion record holds provenance. Preserve visible handling banners and print the complete NEXT guidance, including attachment fallback.

Clarify the exact stored-no handling notice, same-line command citations, written-out date alternatives and the bounded source-cited generated-output directory rule. Distinguish structural text checks from native PDF/DOCX content and visual review. Data/checker fixes accept valid JSON-as-YAML embedded arrays and inspect email prose without mistaking CSS for financial text; credential checks still inspect raw HTML. The executable fixture documents the actual preparer test invocation. Frozen earlier captures remain unchanged.

## 1.0.0 (2026-10-21): the handoff, the fix window and access removal

Design: `docs/plans/2026-10-08-ow-handoff-design.md` (decisions 1 to 9; its build notes record every ruling and departure). Contract: `sprints/release-2.1/ow-06/contract.md`.

- **Ten verbs.** `/ow-handoff` (the resume screen, and `on <path>`), `-start` (the frozen basis and window terms; `--keep-frozen` and `--refreeze` name one file), `-accounts` (the inventory, the redacted secrets scan through ow-tools, rotate items by name; `--transfer`, `--check`, `--complete` and `--waive` record one line each), `-notes` (the floor, or the index into the delivered runbook; `--walkthrough`), `-package` (the Handoff notes, its exports and the cover email; `--revision` after delivery), `-delivered` (the window dates, once), `-fix` (reports, the punch list, each change order's own window, states, hourly help, vendor charges at cost), `-offer` (every offered term frozen, the choice recorded; `--rerun`), `-access` (five sources, the keep list, the order per item; `--record`, `--regrant`, `--waive`) and `-close` (four branches, `care-start.md` once; `--reopened` writes addenda).
- **One step table keyed on verb and mode** (`references/routing-and-resume.md` §2), and one resume rule for every verb and mode.
- **Prescribed screens** (`references/routing-and-resume.md` §5), with every refusal and no-op reason listed, and a guard: nothing outside the prescribed lines of a refusal or no-op screen claims an action.
- **Amendments that land with this skill:** H3's consumer half (the index into ow-documentation's runbook, coverage against it, the Takeover check reading `deliveries.yaml`'s handover path, `-notes` and `-package` waiting for `delivered.md`, the capture profile on the access list), H4 (the structured `rollover` beside its wording, an optional `urgent_price`, both frozen) and H5 (the client's `logs/<workstream>/meetings/MTG-nn/audio/` and transcripts on the access list; `logs/business/` never). H6 waits for v2.2.
- **The scan claims no more than ow-tools 1.3.0 does:** committed history only; binary and UTF-16 files, commit and tag messages are not read (the user reads messages by hand, recorded); gitleaks' built-in path allowlist applies; a secret in a file name is printed as its path; `CLEAN` and `HITS` both exit 0, anything else is NOT-CHECKED with its reason.
- **The text security review's fixes, before evaluation** (`docs/audits/2026-10-21-ow-handoff-1.0-security-review.md`, SH-01 to SH-11): owner rights or a recorded transfer waiver gate every removal, rotation, deletion and waived removal (each access item names its account); a kept-for-care item blocks a close that is not care, and every waived or unconfirmed item is named open in the close email; the scan record copies `not_read` as given, `refs: 0` is NOT-CHECKED and the tool's NOT-CHECKED exits are 2 to 5 or 128+n; the log's source is never `.env`; No credentials is NOT-CHECKED when a client output quotes a client's text, with a read-through; a symlink out of the repository is recorded, never cited; the other-client wording follows ow-documentation 1.0.1.
- **Deferred (accepted):** the siblings' stand-in `dates.yaml`, `FIX-nn.md` and `operator-notes.md` files are not yet byte copies of these goldens (the build's ruling O12); they move in the siblings' next pin round. `statusNames` gives `/ow-handoff-fix` the one common name `-nn`.
- Data edits in the same PR, which need no bump in the other skills: the shared `examples/handoffs.yaml` (ow-handoff's `build` and `invoice` files) and `examples/offers.md` (the invented care tiers, billing, rollover, notice and urgent price) in every copy; the sibling edges that carry the files this skill reads in place.
