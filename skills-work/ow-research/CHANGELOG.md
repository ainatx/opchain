# ow-research changelog

Per-skill versions (`catalogs.json` `versionPolicy: per-skill`). The family's v2.1.0 release entry cites each skill's version. Every change to `SKILL.md` or a reference bumps this skill; data, example and test edits ride without a bump and are listed here as data edits.

## 1.0.0 (2026-10-17): research from sources it opened

Design: `docs/plans/2026-10-16-ow-research-design.md` (decisions 1 to 4; build notes §12).

- **Four verbs.** `/ow-research` (topics and framework folders with their state and age; `on <path>` runs the step a folder needs), `/ow-research-question <workstream>` (the question, its kind, scope, depth, the generic description queries use, the keep-out terms and the owners of the facts, confirmed by the user), `/ow-research-run` (queries approved before the first search, every request logged before it is sent, sources with their `retrieved` dates and short quotes, findings with levels, conflicts, gaps and suspicious content under an Answer) and `/ow-research-framework <id>` (an open framework text the user downloaded from its official sources, recorded with its stated revision and digests, labelled unpinned — fetched, not a pack).
- **What leaves the machine:** only queries and page requests, through the host's own tools with their permission prompts left on; nothing under a handling level, without web tools, before approval, or while a Query privacy finding is open. The URL rule, the provenance rule, the caps and the host-enforced residual are in `references/web-rules.md`.
- **References:** `routing-and-resume.md`, `phase-question.md`, `phase-run.md`, `phase-framework.md`, `research-files-schema.md`, `web-rules.md`, `confidence-rules.md`, `framework-sources.md` (the open list; its licence classes reviewed by the owner on 2026-10-19), `self-checks.md` (ten checks, four never waived).
- **Hand-offs:** ow-build-plan's `-collect` takes the findings of a topic that serves a Build Plan; the NEXT blocks to ow-draft, ow-vendor-eval and ow-currency name their planned verbs, with the fields their designs read. ow-currency and ow-controls are not in this release: the watch block's IF IT IS NOT AVAILABLE line applies, and `-framework`'s licensed-text refusal points to a controls register you keep.

### Before release: the security review's changes (2026-10-19)

The security review (`docs/audits/2026-10-17-ow-research-1.0-security-review.md`) and the owner's decisions of 2026-10-19 changed 1.0.0's text before it shipped:

- **Handling level:** any of `question.md`, the workstream's newest `question.md` or `profile.md`'s default is enough, even where another says "no"; `-run` checks it before any resume or reopen (`references/phase-run.md` §1, `references/web-rules.md` §2).
- **Owners:** exact hosts, a host with a path, or `*.<host>` by choice; never a shared platform's root, a support site without a path, or a host where users write. A primary source also needs a primary's standing (`references/confidence-rules.md` §1, `references/phase-question.md` §2).
- **Corroboration is capped:** pages of unclear standing raise a fact to MEDIUM at most, however many agree; HIGH from secondaries needs two independent publishers of known standing (`references/confidence-rules.md` §2).
- **The host's page tool:** a prescribed prompt, page quotes labelled "as returned by the host's page tool", the inbox route for a decision that rests on one page, and a Limits section in `SKILL.md`.
- **Suspicious content** only quotes and describes, in one line form; findings come only from `## Findings`; a search result's title and a page's `<title>` are covered, and a source's title is the page's visible heading.
- **Our own numbers:** attributed or not, and any figure from the workstream's internal files, by value (`references/web-rules.md` §4, `references/self-checks.md` §3).
- **The URL rule:** a backslash, space or control character is refused; credentials in a fragment or path parameter; one list of private names; keep-out terms matched with invisible characters removed. Approvals belong to their run, nothing is sent before the go, and one by-name approval covers one request.
- **`-framework`:** digests before any file is read; each file must name its own text; where it came from is recorded as the user's word; a revision request only to a table URL exactly as listed; the licence class of every row reviewed by the owner (2026-10-19), and a row added later marked `unreviewed` until it is.
- **Claims:** the description, the welcome and the network section say what the host keeps, when a by-name search is allowed, and that the host's own setting can turn its prompts off.

### Before release: the first evaluation and the security re-check (2026-10-19)

- **Approvals:** an approval line carries `human-decided:` and approves only the query ids it names; a declined query is never sent; an approval past the cap counts only after the batch was shown (`references/web-rules.md` §3, `references/phase-run.md` §2).
- **Resume:** one rule, in both references: send the approved requests not yet logged, never re-send a logged one, reopen a page only to record its source; one name per step (`references/routing-and-resume.md` §4, `references/phase-run.md` §6).
- **Our figures, as the owner narrowed them:** refused when said as ours, or when one of our exact figures (prices in words and "900-dollar" too); a round figure that only matches one of ours is asked about in one line and the answer recorded as `marker: figure confirmed`; a market question passes. `findings.md` is held to the same (`references/web-rules.md` §4, `references/self-checks.md`).
- **Handling level:** the client's level that ow-start's `intake.yaml` and ow-build-plan's `plan.yaml` record is read too (the `handling` key only); `-question` asks once per client.
- **Keep-out:** the client's own customers and suppliers its files name.
- **Screens:** refusals and no-ops print only their prescribed lines; the watch block is one line, "ow-currency is not in this release", and ow-currency's hand-off waits for the release that ships it.
- **Standing:** "user file" is how a page arrived, never a standing; a saved forum page stays at MEDIUM at most.
- **findings.md:** its seven sections, in order, once each; each F-nn heads one block.
