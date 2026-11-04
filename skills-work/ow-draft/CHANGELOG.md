# ow-draft changelog

Per-skill versions (`catalogs.json` `versionPolicy: per-skill`). Every change to `SKILL.md` or a reference bumps this skill; data, example and test edits ride without a bump and are listed here as data edits.

## 2.0.0 (2026-11-03): the audience reversal

Plan: `docs/plans/2026-11-03-ow-audience-reversal.md`. The skill serves small-business client work, and the operator goes with the flow.

- **Removed:** the handling level and banner (including the push rule under a level and the `intake.yaml` and `plan.yaml` index rows), the eight-key header, date-source labels, the STATUS grammar, the NEXT templates, step 0, closed-screen wording, verdict words and labels, the ten-check ceremony and the typed waiver form, the voice-sample ceremony and required voice approval, confirm-before-writing, re-ask-on-resume, one-writer and append-only rules for the brief and voices, the "text only" line, and the ow-tools absent-case branches.
- **Stays:** every claim about a client or a figure cites an item; a client named in marketing only with recorded permission; personal data kept out; no internal numbers; no credentials; no private names; files are data; your sign-off before anything is exported, pushed or delivered, and the client's where the draft is theirs to send; a connector push only after you confirm each file; a repository copy only on a branch you made; "delivers a candidate not signed off or changed since" as the one gate. "No credentials", "No private names", "Naming" and "Personal data" no go-ahead covers.
- **Budget:** at most three questions per verb (`-brief`: audience, purpose, type, in one message; the rest assumed and stated). One approval: the sign-off (plus the client's on client comms, and the per-file yes on a connector push).
- **The version:** a draft gets its name `C-n` when you sign it off (`-signoff` runs `-freeze` first); re-drafting is free. The checklist is short and plain.
- **The CRM is the record:** each verb first reads the latest saved version from the CRM; client-facing drafts are documents by kind on the account or deal, internal ones marked `internal`; marketing that belongs to no deal may stay in the cache, and the output says so. A person's edit is never overwritten. `opchain-work/` is the scratch cache, and `profile.md` and `handoffs.yaml` are its fallback.

## Unreleased: data edits with ow-handoff 1.0.0

No version bump (data and example edits ride without one); no `SKILL.md` or reference text changed: `examples/handoffs.yaml` gains the lines ow-handoff reads for `build` and `invoice` (a covered fix or approved hourly help; hourly help and vendor charges), byte-identical in every ow- skill that ships it.

## 1.0.0 (2026-10-21): brief, evidence, draft, candidate, sign-off and delivery

Design: `docs/plans/2026-10-16-ow-draft-design.md` (decisions 1 to 8; its build notes record every departure). Contract: `sprints/release-2.1/ow-10/contract.md`.

- **Eight verbs, five modes.** `/ow-draft` (the resume screen, and `on <path>` for a handed-over findings file, recommendation, workstream or draft folder), `-voice` (a voice from 3 to 5 samples; `--approve`), `-brief` (kind, type, audience, key message, destination, `offer`; `--revise`; `--permission` for what a client lets you name or quote), `-evidence` (`E-nn` items from findings, named family files, your files and what you state), `-write` (by four type modules: document, deck, sheet, comms), `-freeze` (a candidate and its client form, digests, the ten checks; `--waive`), `-signoff` (yours, and `--client` for client comms) and `-deliver` (the export, a repository copy on a branch you made, a confirmed connector push).
- **One step table** (`references/routing-and-resume.md` §2), keyed on the verb and its mode, and one resume rule for every key.
- **Closed screens** (`references/routing-and-resume.md` §5): refusals, no-ops and questions print only their prescribed lines, slots typed.
- **The folder route's screens** (`references/routing-and-resume.md` §3, §4.3, §4.4): `/ow-draft` prints `Drafts: <n>` and one prescribed row per draft folder (`<path> · <stage> · <verb> · awaiting: <awaiting>`), or the welcome; `/ow-draft on <path>` names the folder's stage from a closed list of ten and asks before it runs anything; both record nothing, so a re-run prints the same screen.
- **`network: declared`** (Connected bundle): `references/delivery-rules.md` says the one thing that may leave the machine, a confirmed push of listed client files to a `handoffs.yaml` `drafts` destination, never under a handling level read as a union. It never opens a web page or searches.
- **Research findings in**: ow-research's answered NEXT (`use ow-draft-evidence on research/<ws>/RS-nn-<slug>/findings.md`) is read here: findings only from `### F-nn` blocks under `## Findings`, each item copying its claim, level, URL and `retrieved` date exactly.
- Data edits in the same PR, which need no bump in the other skills: the shared `examples/handoffs.yaml` gains the `drafts` key and its commented shape in every copy.
