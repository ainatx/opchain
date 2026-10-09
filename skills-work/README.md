# skills-work/: the ow- catalog

The ow- skills are opchain's planning family for client work: the fit call and its recap (`ow-start`), then the Build Plan, the build and the handoff. They ship together as opchain v2.1.0, built one skill at a time; each carries its own version, starting at 1.0.0. Designs: `docs/plans/2026-10-06-ow-start-intake-redesign.md` and its siblings; the rules they follow come from `docs/audits/2026-09-18-ow-pack-design-audit.md` ("Cross-talk contract", "Authoring standard").

| Skill | Status |
|---|---|
| `ow-start` | 1.0.0: the 20-minute fit call, prep and recap |
| `ow-build-plan`, `ow-build` | designed, not built |

## What is in this folder

- `ow-protocol.md`: the shared protocol (version 1). Every ow- skill carries a byte-identical copy at `references/ow-protocol.md`. Edit this source, then run `node scripts/check-skill-contracts.mjs --write` to refresh the copies; the check fails while any copy differs.
- `<id>/SKILL.md` plus `references/` and `examples/`: text only. No scripts, no hooks, no network text; only `.md .txt .json .yaml .yml .csv` files. Code the family needs (transcription, document export) lives in the separate `ow-tools` add-on, which is not in this folder.

## How it is checked

`catalogs.json` at the repo root lists both catalogs. `npm run gen-catalog` and `npm run check-skill-contracts` (both in `pretest` and `prebuild`) iterate it:

- **Frontmatter**: only the Agent Skills keys (`name`, `description`, `license`, `allowed-tools`, `metadata`, `compatibility`); catalog fields sit under `metadata` as strings. The description names the skill id in its first 200 characters and has no angle brackets.
- **Packaging**: text files only, no hidden or executable files, no network text in a `network: none` skill, and a SKILL.md body under 5,000 tokens.
- **Contracts**: every `/ow-` verb cited is declared (one merged verb index with the oc- catalog); every NEXT block leads with `use <skill id>` and carries its `IF IT IS NOT AVAILABLE` line; Reads-from rows have absent and mismatch cases; Hands-off rows have an unavailable branch.
- **Family names** (design §8.1): no ow- skill file names an oc- skill, a private skill (`privateNames` in `catalogs.json`, today `llc-ops`) or a business (`brandNames`). Handoffs that leave the family go through the user's own `opchain-work/handoffs.yaml`.
- **Acceptance**: `node scripts/ow-start-acceptance.mjs` checks the golden runs in `tests/fixtures/ow-start/`; its README says how to check a real run.

## Not wired in yet, on purpose

The ow- catalog is in none of the oc- build outputs. `catalogs.json` gives it `outputs: null` for the dev plugin (`plugins/opchain/skills`), the public zips, `public/docs`, the flag registry, the hosted MCP catalog and the public mirror. The scripts that write those outputs (`sync-plugin-skills`, `sync-skill-bundles`, `make-skills-zip`, `sync-docs`, `gen-mcp-catalog`) refuse a source tree holding any non-oc- skill, so `OPCHAIN_SKILLS_DIR=skills-work` fails before anything is deleted or written. There is also no `.claude/skills/` link for ow- skills in this repo (CI requires every link there to point into `skills/`). Each of these is wired in by a PR of its own.

To try `ow-start` locally until then, copy or link `skills-work/ow-start` into the `.claude/skills/` folder of the project you work in (for example a client workspace), never into this repo's.
