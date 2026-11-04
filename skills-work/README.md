# skills-work/: the ow- catalog

The ow- skills are opchain's planning family for Deftwright's own client work: the fit call and its recap (`ow-start`), then the Build Plan and quote, the build, acceptance testing, documentation, the handoff and the care that follows it, with research and drafting beside them. They ship together under the opchain release tag; each carries its own version. Designs: `docs/plans/2026-10-06-ow-start-intake-redesign.md` and its siblings. **On 2026-11-03 the owner reversed the family's original audience** (`docs/plans/2026-11-03-ow-audience-reversal.md`): the skills no longer serve a government or regulated reader, the protocol is a page of rules that guard money, legal exposure, secrets and client trust, and everything else is the operator's call. Every skill moved to 2.0.0 and protocol 2.

| Skill | Status |
|---|---|
| `ow-start` | 2.0.0: the 20-minute fit call, prep and recap; meeting and decision logs; the `care-takeover` path (`CHANGELOG.md`) |
| `ow-build-plan` | 2.0.0: the Build Plan offer, plan and fixed quote, plan-only or whole-project (`--whole-project`), with contract inputs and the build request; research findings as evidence; the care onboarding quote (`CHANGELOG.md`) |
| `ow-build` | 2.0.0: the client side of a signed build: sprints, weekly updates, demos, change orders priced before work, invoice requests, readiness for UAT (`CHANGELOG.md`) |
| `ow-uat` | 2.0.0: the client's acceptance test: scenarios per check, tester packs, sessions, triage and fixes, numbered sign-off requests, deemed acceptance and the delivery backstop on the contract calendar (`CHANGELOG.md`) |
| `ow-documentation` | 2.0.0: the bought documentation and training line: guides, SOPs, runbook, developer handover, screenshots through ow-tools, the training kit, export, delivery and the 30-day rollout (`network: declared`; `CHANGELOG.md`) |
| `ow-handoff` | 2.0.0: the handoff after sign-off: accounts moved into the client's name, the redacted secrets scan, operator notes, the Handoff notes, the fix window, fixes and hourly help, the after-handoff offer, access removal and the close (`CHANGELOG.md`) |
| `ow-draft` | 2.0.0: drafts from evidence: client reports and proposals, marketing, the user's own documents and announcements a client sends; every claim cited, the user's sign-off before delivery (`network: declared`; `CHANGELOG.md`) |
| `ow-care` | 2.0.0: monthly care after a handoff or a takeover review: requests and reply targets, quarter-hours with rollover and a go-ahead before extra hours, the health check, the monthly report and invoice request, access, changes, notice and the end (`CHANGELOG.md`) |
| `ow-research` | 2.0.0: research from pages it opened through the host's web tools, or from files: generic queries with no client details, every request logged, findings with levels and short quotes; open framework texts recorded unpinned (`network: declared`; `CHANGELOG.md`) |

## What is in this folder

- `ow-protocol.md`: the shared protocol (version 2). Every ow- skill carries a byte-identical copy at `references/ow-protocol.md`. Edit this source, then run `node scripts/check-skill-contracts.mjs --write` to refresh the copies; the check fails while any copy differs.
- `<id>/SKILL.md` plus `references/` and `examples/`: `.md .txt .json .yaml .yml .csv` files only, no hooks or scripts folder (the packaging check keeps the skill folders text so the zips and the mirror stay reviewable). The skills run in Claude Code: they may run code, call the `ow-tools` add-on (transcription, export, `calc`, `scan-secrets`, `health`, `capture`; `plugins/ow-tools/`) and run the next skill's verb directly.
- `network: none` skills carry no network text (a test scans for URLs and request words); a skill whose frontmatter says `network: declared` (`ow-research`, `ow-documentation`, `ow-draft`) may name the host's web tools, real official sources and the connectors an export may push through with the user's confirmation. `ow-research/references/web-rules.md` says what may leave the machine in a query.
- `<id>/skill.edges.yaml`: the skill's edges as data, described below.

## Edges (`skill.edges.yaml`)

An edge between two ow- skills is a file one writes and the other reads. Each skill lists its edges in `skill.edges.yaml` (schema 1), beside its SKILL.md. Paths are relative to `opchain-work/`; a placeholder such as `<client>` matches any placeholder in the same place.

```yaml
schema: 1
skill: ow-example
routes:                    # optional: the verb other skills hand files to ("use ow-example on <path>")
  verb: /ow-example
  reference: references/routing.md       # the routing rules; must cite every path below
  paths: [intake/<client>/intake-record.md, plans/<client>/]
writes:                    # every file this skill writes, with the verb that writes it (several verbs may write one file)
  - { path: plans/<client>/scope.md, verb: /ow-example-scope }
  - { path: plans/<client>/contract-inputs.md, verb: /ow-example-quote --accepted }   # a mode of a verb the body cites in backticks
  - { path: plans/<client>/quote.md, verb: /ow-example-quote, modes: [--quick] }      # other modes that also write the file
  - { path: profile.md, verb: /ow-example-setup, seeded_by: /ow-example-extract }     # created by another of its own verbs, first run only
  - { path: offers.md, verb: /ow-example-setup, once: true }                          # created once from the example; then the user's
reads:
  - from: ow-start         # a family skill, a planned skill, an add-on, "user" (files the user owns) or "any"
    path: intake/<client>/recap.md
    fields: [path_id, path_kind]
    if_absent: what the skill does without it            # optional
    if_mismatch: what it does when the fields are not as expected   # optional
    shared: true           # optional: a workspace file at the top of opchain-work/ (profile.md), not a handoff
  - from: ow-example-plan
    path: plans/<client>/scope.md
    in_place: true         # optional: read where an earlier skill left it, carried by every hop (owner decisions O1, OD-1)
  - from: ow-start         # a named row (owner decision O6): read only when the user names the file
    named: true
    reference: references/phase-evidence.md          # must cite the path
    path: logs/<workstream>/decisions/DEC-nn.md
  - from: ow-build         # an index row (owner decision O1): another skill's file listed by path and header keys only
    index: true
    reference: references/logs-status-and-index.md   # must cite the path
    path: builds/<client>/changes/CO-nn.md
    fields: [created, status]                         # header keys only, never a body section
hands_off:
  - when: The quote is ready
    to: ow-example         # a family skill, planned skill or add-on; or `destination: contract` (a handoffs.yaml key) for work leaving the family
    verb: /ow-example-quote --accepted   # a verb (and mode) the receiver owns
    say: use ow-example to record the acceptance on plans/<client>/
    files:
      - { path: plans/<client>/quote.md, fields: [valid_until] }
      - { path: plans/<client>/scope.md, in_place: true }   # optional: handed on for a reader further down the chain (OD-1)
```

`node scripts/check-skill-contracts.mjs` holds the family to these rules:

- **Complete.** Every skill has the file; every writer verb is one the skill declares, and every mode (`--accepted`, a `modes:` flag) is one its body cites in backticks; every hands-off `verb:` belongs to the receiving skill; a `destination:` is a key some family `examples/handoffs.yaml` declares.
- **Body tables are optional, but honest.** Where a body keeps a `## Verbs` table with a Writes column, every file the edges say a verb writes is in that verb's cell. Where it keeps `## Reads from`, each edges reads path appears in it and each path it names has a reads row. Where it keeps `## Hands off to`, each hands-off `say:` appears in it.
- **Routes.** A say of the form "use <id> on <path>" lands on <id>'s `routes:` verb, for a path its `routes.paths` cover. The receiver's routing reference exists and cites every routed path, and routes.paths lists every path the reference heads a section with.
- **Reciprocal.** Every file a skill hands to another family skill has a reads row for it in the receiver (with the fields it needs among those handed off), and every reads row naming a family skill has a hands-off row in that producer, unless it is `shared:` (top-level workspace files the producer writes) or `in_place: true` (a file read where an earlier stage left it; the producer writes it and a chain of hand-offs lists it at every hop). A planned skill or an add-on has no edges file yet; its rows are checked once it does.
- **Index rows** list another skill's file by path and header keys only (identifier-shaped, documented as header keys by the producer, never a key that holds money, a note or a person); `written_by` and `created` are always header keys. **Named rows** read a family skill's file only when the user names it; the reference they name cites the path and no hand-off carries the file.
- **Phase files** that read a client file name one the edges know (a reads row, the skill's own writes, or a route).

Removed on 2026-11-03: one writer per file and the append-only exception, the NEXT-block form and its target checks, the required `if_absent`/`if_mismatch`/`if_unavailable` cases, the STATUS `next:` grammar and `statusNames`, and the ban on "chains to"/"invokes" wording.

## How it is checked

`catalogs.json` at the repo root lists both catalogs. `npm run gen-catalog` and `npm run check-skill-contracts` (both in `pretest` and `prebuild`) iterate it:

- **Frontmatter**: only the Agent Skills keys (`name`, `description`, `license`, `allowed-tools`, `metadata`, `compatibility`); catalog fields sit under `metadata` as strings; `metadata.protocol` is the catalog's protocol version (2). The description names the skill id in its first 200 characters and has no angle brackets. The body opens `references/ow-protocol.md` and says "if you cannot open it, say so and stop".
- **Packaging**: text files only, no hidden or executable files, no network text in a `network: none` skill, and a SKILL.md body under its token budget (`bodyTokenBudgets`).
- **Contracts**: every `/ow-` verb cited is declared (one merged verb index with the oc- catalog); every protocol copy is byte-identical; each skill's `skill.edges.yaml` is reciprocal with the others (Edges, above).
- **Family names**: no ow- skill file names an oc- skill, a private skill (`privateNames` in `catalogs.json`, today `llc-ops`) or a business (`brandNames`), however it is spaced, hyphenated, underscored, joined or cased, and no skill text carries a real price or contract-clause wording. The ow- acceptance checkers read the same rule (`familyNameRules` in `scripts/check-skill-contracts.mjs`).
- **Acceptance**: `node scripts/ow-<skill>-acceptance.mjs` (ow-start's logs through `scripts/ow-start-logs-acceptance.mjs`) checks the golden runs in `tests/fixtures/ow-<skill>/` for the rules the protocol keeps (prices, internal markers, signatures recorded not verified, credentials, private names, injected instructions, the contract calendar, the care ledger…); each folder's README says how to check a real run. The goldens were written under protocol 1 and keep its headers and STATUS lines; the checkers tolerate them and require only `written_by` and `created`.

## Distribution (REL-01)

Since REL-01 the ow- catalog ships through three outputs of its own, listed in `catalogs.json` `outputs`:

- **Zips.** `public/opchain-work-skills.zip` (every skill folder, `ow-protocol.md`, this README, LICENSE, NOTICE) and `public/work/<id>.zip` (one skill with LICENSE and NOTICE inside), built by `scripts/make-work-skills-zip.sh` (run by `npm run make-zip`, which chains it). Served at `https://opchain.dev/opchain-work-skills.zip` and `https://opchain.dev/work/<id>.zip`. The public `opchain-skills.zip` stays oc- only, so `/skills.json` `catalogVersion` (the lockstep oc- semver the update-check hook reads) is untouched.
- **Docs.** `public/docs/work/<id>/` (SKILL.md, references/, CHANGELOG.md), `public/docs/work/ow-protocol.md` and this README, by `scripts/sync-work-docs.sh` (run by `npm run sync-docs`, which chains it). The oc- tree `public/docs/<id>/`, which the hosted MCP server streams from, stays oc- only.
- **Mirror.** `.github/workflows/mirror-public.yml` copies `skills-work/` whole to `asfbay-bit/opchain-skills`, and pushes every `v*` release tag to the mirror as a tag of the same name (for the ow-tools marketplace pin). `mirror/README.md` has the install and verify steps a user follows.

**The gate.** Both scripts refuse any tree holding a non-ow- skill, and refuse to remove or write anything until `node scripts/gen-skills-catalog.mjs` and `node scripts/check-skill-contracts.mjs` pass for the exact tree being shipped (they read `OPCHAIN_WORK_SKILLS_DIR`). Then `scripts/check-work-install.mjs` (run by `scripts/build-site.sh`, the last prebuild step, against the final `public/`) unzips the built artefacts into an empty folder's `.claude/skills/` and compares every file, every `references/ow-protocol.md` copy and the docs tree with this folder, byte for byte. All three run in `prebuild` (no new npm script: the root `package.json` is bundled into five oc- skills, so a new script there changes tracked skill files); `tests/work-distribution.test.js` plants catalog failures and checks the refusal leaves earlier zips in place.

**Versions and the tag.** Each skill keeps its own version and CHANGELOG; ow-tools keeps its own. None is tagged alone: one signed tag per release, `v<lockstep oc- version>`, covers both catalogs, and the release's `skills/CHANGELOG.md` entry lists the ow- versions shipped under it. `check-release-tag` reads `skills/` only, on purpose (`docs/governance/RELEASING.md` §2a).

## Not in the oc- outputs, on purpose

The ow- catalog is in no oc- build output: not the dev plugin (`plugins/opchain/skills`), not `opchain-skills.zip`, not `public/docs/<id>/`, not the flag registry, not the hosted MCP catalog (`catalogs.json` gives those `outputs` `null`). The scripts that write them (`sync-plugin-skills`, `sync-skill-bundles`, `make-skills-zip`, `sync-docs`, `gen-mcp-catalog`) refuse a source tree holding any non-oc- skill, so `OPCHAIN_SKILLS_DIR=skills-work` fails before anything is deleted or written. There is also no `.claude/skills/` link for ow- skills in this repo (CI requires every link there to point into `skills/`).

To try an ow- skill locally, copy or link its folder under `skills-work/` into the `.claude/skills/` folder of the project you work in (for example a client workspace), never into this repo's.
