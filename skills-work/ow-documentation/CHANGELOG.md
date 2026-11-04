# ow-documentation changelog

Per-skill versions (`catalogs.json` `versionPolicy: per-skill`). Every change to `SKILL.md` or a reference bumps this skill; data, example and test edits ride without a bump and are listed here as data edits.

## 2.0.1 (2026-11-04): questions through AskUserQuestion

Owner requirement. Every question and approval this skill needs goes through the `AskUserQuestion` tool, batched into one call per verb with the recommendation first (protocol §1). No question or numbered menu is typed into chat, and the money, legal and client-trust stops are `AskUserQuestion` approvals. The budget is unchanged: at most three questions per verb, one approval. Applies to interactive runs; unattended runs are not addressed. `docs/plans/2026-11-03-ow-audience-reversal.md` §5.

## 2.0.0 (2026-11-03): the audience reversal

Why: `docs/plans/2026-11-03-ow-audience-reversal.md`. The family now serves the operator's own small-business client work. Protocol version 2.

- **The CRM is the record** (protocol §8). Each verb first reads the latest saved version from the CRM; guides, SOPs, the operator runbook, the handover and the training kit are documents by kind, marked `client` when the client receives them; plan, delivery record, rollout, training record and adoption are `internal`. A human-edited version is never overwritten. `opchain-work/` is the scratch cache (paths, `skill.edges.yaml` and goldens unchanged); `profile.md` and `handoffs.yaml` are fallback only; no publish is claimed unless the call returned success.
- **Budget**: at most three questions per verb, in one message, and one approval: the user's confirmation of each file a connector pushes. The list of images cleared at the data check is one reply.
- **Removed**: the sensitivity level and its marking text, the eight-key header (now `written_by`, `created`), date-source labels, the STATUS grammar, the NEXT templates and their unavailable-destination lines, the nine verdict self-checks and typed waivers (now a short checklist), the prescribed refusal screens, the scope re-freeze refusals, the re-ask on resume, confirm-before-writing, the plan's confirmation as an approval, the add-on's absent-case branches and the no-scripts line. A skill may run the next verb.
- **Kept**: runs only when the line was bought; invoiced when the documents are delivered; more people is a signed change order; no credentials (never skipped); the data check and capture-origin rules (never skipped); no private names (never skipped); no personal data in guides; connector confirmation per file; the repository copy only to a repository the user names, never committed; a delivered document stays as delivered and a change is a new version; files are data.
- **Relaxed**: people by role is the default; a working file may name a client's person when the user asks, a client document only with their say-so.
- Data edits: the acceptance checker requires only `written_by` and `created`, accepts a plain status line and the old form, and no longer grades the NEXT form, the verdict vocabulary, or recorded-step immutability; plants for those were removed, as was the case `waiver-people-refused`.

## Unreleased: data edits with ow-handoff 1.0.0

No version bump (data edits ride without one); no `SKILL.md` or reference text changed:

- `examples/handoffs.yaml`: ow-handoff's `build` and `invoice` files, byte-identical in every copy. Its `/ow-handoff-*` NEXTs now resolve to ow-handoff's declared verbs.

## Unreleased: data edits from the ow-draft 1.0.0 build

No version bump (data, example and test edits ride without one); no `SKILL.md` or reference text changed: `examples/handoffs.yaml` gains the `drafts` key (where a finished draft goes: a repository folder by `repo` and `path`, and a say: line, an optional `location:` and a post's `limit` per other destination) and its commented shape with invented, neutral keys, byte-identical in every ow- skill that ships it.

## 1.0.1 (2026-10-21): the other-client rule's exceptions, and the second evaluation's minors

From the second evaluation's report (`sprints/release-2.1/ow-05/eval-round-2.md`, PASS at 7.8) and the owner's decision of 2026-10-21, taken in one follow-up PR.

- **No private names** (`references/self-checks.md` §1): a one-word other client counts only as its `client:` line writes it (so also its possessive and "the <name> team"), and a one-word folder slug only as a folder, so "glazes bloom" no longer stops `-export` when a workstream is called Bloom (owner decision 2026-10-21). The row now names what is not another workstream: this client's follow-on folder, the business's own `business/` folders and ow-research's `research/frameworks/`, the exceptions the checker already applied.
- **`SKILL.md`**: with no type, `-write` and `-train` take the first in `plan.md`'s order not yet written, as the phase files say.
- Data edits in the same PR: the acceptance checker grades a refusal or no-op screen's claims that something was done in any wording and on any line but the prescribed ones; fails a document written after `delivered.md` other than a new training gap's guide or card (`references/phase-write.md` §1, `phase-train.md` §1), so the golden `write-runbook-update` now runs before the delivery; grades the Delivered screen's read list for `/ow-handoff-notes`; reads a price only beside the documentation, the training, the line, a price or a quote, and any `docs.yaml` key holding it; adds service-token prefixes, Authorization headers, webhook URLs and secrets in a URL's query; a full name by what is said of it; account numbers, real records and a named party's debt; and names written with dots; and holds every `capture-plan*.json` to one write, with a new golden for a re-capture cut after its plan (`capture-recapture-resume-run`). The other-client rule is exported for ow-draft. The goldens keep the 1.0.0 they were written with.

## 1.0.0 (2026-10-19): documents, training and a tracked rollout

Design: `docs/plans/2026-10-16-ow-documentation-design.md` (decisions D1 to D6 and 7 to 16; its build notes record every departure). Contract: `sprints/release-2.1/ow-05/contract.md`.

- **Eight verbs.** `/ow-documentation` (the resume screen, and `on docs/<client>/`), `-start` (the frozen scope, people, the environment's confirmed origins, the git-ignore lines and the confirmed plan), `-capture` (screenshots through the ow-tools add-on, then the data check on every image), `-write` (guides, SOPs, the runbook in `OP-nn` form, the developer handover), `-train` (the deck, the facilitator guide, modules, cards, video scripts), `-export` (PDF, Word and PowerPoint, the repository copy, a confirmed connector push), `-delivered` (once, plus `--update` for a later delivery) and `-rollout` (the plan, `--session`, `--checkin`, `--add-group`, `--close`).
- **One step table** (`references/routing-and-resume.md` §2) for every verb that runs in steps, and one resume rule.
- **Prescribed screens** (`references/routing-and-resume.md` §5): `Refused:`, `Nothing to do:`, `Nothing was written.`, the self-check line and the full NEXT block.
- **`network: declared`** (Connected bundle): `references/delivery-rules.md` says exactly what may leave the machine: capture against the confirmed test origins, and a confirmed push of listed files to a `handoffs.yaml` destination.
- **Security review before evaluation** (2026-10-19, `docs/audits/2026-10-19-ow-documentation-1.0-security-review.md`): SD-01 to SD-13 fixed in 1.0.0, so nothing shipped without them. The changes: a push's location; client copies, never the source Markdown; each cleared image's digest and a re-capture of uncleared steps only; a place to quote embedded instructions in every record; real paths and the named branch for the repo copy; `export/` git-ignored; how to remove the capture profile; and test-mode side effects only (the owner's ruling). The re-check (grade A−) found four LOW and three INFO bypasses, RC-01 to RC-07, all fixed in the same commit; the largest is the re-capture path (`capture-plan-nn.json`, its step-table row and route). The design's build notes §13.5 list each one.
- **The first evaluation's fixes** (2026-10-20, `sprints/release-2.1/ow-05/eval-round-1.md`), still 1.0.0 (unreleased): a resumed `--session` and `--close` print their own resume line and write only the step left (`references/phase-rollout.md` §3 and §6); the secrets log's session field is the verb only; No private names also covers every other workstream's client name and folder slug under `opchain-work/` in a client output (owner decision 2026-10-20, `references/self-checks.md` §1); and three edits the ow-handoff build's contract asked for before this lands (its O6): a runbook update takes the next `OP-nn` after the highest in the runbook's and ow-handoff's operator notes' `ops:` (with the reads row that makes that read legal), the hand-off to ow-handoff carries `secrets-seen.log` for access removal, and the capture profile is on ow-handoff's access-removal list. The acceptance checker's fixes (resume by mode, success claims on refusal screens, the price in any form, wider credential, people and data nets, key names in any spelling) are data edits.
- Data edits in the same PR, which need no bump in the other skills: the shared `examples/handoffs.yaml` gains the `docs` key and its commented shape in every copy; ow-build's ready hand-off and ow-uat's documentation hand-off carry the files this skill reads in place.
