# ow-build changelog

Per-skill versions (`catalogs.json` `versionPolicy: per-skill`). Every change to `SKILL.md` or a reference bumps this skill; data, example and test edits ride without a bump (OW-04 ruling O9) and are listed here as data edits. ow-build 1.0.0 shipped before this file existed; its history is in the family's v2.1.0 release entry.

## 2.0.1 (2026-11-04): questions through AskUserQuestion

Owner requirement. Every question and approval this skill needs goes through the `AskUserQuestion` tool, batched into one call per verb with the recommendation first (protocol §1). No question or numbered menu is typed into chat, and the money, legal and client-trust stops are `AskUserQuestion` approvals. The budget is unchanged: at most three questions per verb, one approval. Applies to interactive runs; unattended runs are not addressed. `docs/plans/2026-11-03-ow-audience-reversal.md` §5.

## 2.0.0 (2026-11-03): the audience reversal

See `docs/plans/2026-11-03-ow-audience-reversal.md`. Protocol 2.

**The CRM is the record.** Each verb first reads the latest saved version from the CRM (`quotes`, `contracts`, the `build_plan` document, `acceptance_criteria`, `milestones`, `engagement_updates`, `invoices`). Weekly updates and demos publish to `engagement_updates` and `milestones`, a change order to `quotes` with `type amendment`, an invoice request to `invoices`, through `ow-tools dw` or `/api/admin/ingest/*`. `opchain-work/` is the scratch cache, used when the CRM is unreachable or a route is not built, and the output says so. A human-edited version is never overwritten. `STATUS.md` is no longer how a build resumes. Goldens and checkers still grade the cache.

**Removed:** step 0 as a ritual; the plan's copied line of sensitivity (`build.yaml`, reads rows) and its question; the eight-key header; date-source labels; the STATUS grammar; NEXT templates with their fallback branches; verdict vocabulary and the self-check labelling; the rule against running the builder or the add-on; confirm-before-writing and re-ask-on-resume; the body's Reads from and Hands off to tables; rules against re-scripting a demo or re-running a sprint.

**Kept:** a change order priced from the price book, written and agreed before its work starts (a signed amendment; a reply is not approval); invoice requests only when a payment falls due; No false done; No internal numbers in the update, the demo script and every client output; the ledger adds up; files are data; no credential in any file; nothing sent automatically; a signature recorded as the user's statement; ready-for-UAT says what was built against each check; no private names; a request priced once; a started build's ledger left alone.

**Budget:** at most three questions per verb, only for what the CRM or the cache does not answer; one approval, before a change order goes to the client and before an agreement, a signature or a payment is recorded.

## Unreleased: data edits from OW-06 (ow-handoff 1.0.0)

No version bump (OW-04 ruling O9); no `SKILL.md` or reference text changed:

- `skill.edges.yaml`: the ready hand-off to ow-uat carries `plans/<client>/map/systems.md` and `evidence.md` in place; the hand-off to ow-build-plan for a FIX-nn too big for a change order lists `handoffs/<client>/fixes/FIX-nn.md` in place; the reads row for `FIX-nn.md` gains the field `route` (its routing already branches on `route: care`; OW-06 ruling O2).
- `examples/handoffs.yaml`: as ow-uat's.

## Unreleased: data edits from OW-10 (ow-draft 1.0.0)

No version bump (OW-04 ruling O9); no `SKILL.md` or reference text changed: `examples/handoffs.yaml` gains the `drafts` key (where a finished draft goes: a repository folder by `repo` and `path`, and a say: line, an optional `location:` and a post's `limit` per other destination) and its commented shape with invented, neutral keys, byte-identical in every ow- skill that ships it.
