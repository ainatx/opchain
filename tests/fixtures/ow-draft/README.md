# ow-draft acceptance fixtures

Everything here is **invented**: the fictional clients Mossgate Books and Larkspur Ceramics (continued from ow-research's, ow-start's and ow-build-plan's fixtures), the other workstreams Fernhill Florists, Kestrel Bindery and Bloom, the fictional consultant "Robin" of "Example Studio", invented competitors and their prices, an invented price book, and an invented site repository. No real client material, no real price, no real person's name belongs in this folder. A few files plant an instruction to the assistant on purpose (a voice sample, an inbox email, the site's README), to prove the skill quotes it and does not act on it; each says so in its answer key.

These are the acceptance tests from `docs/plans/2026-10-16-ow-draft-design.md` §11 and the OW-10 contract (`sprints/release-2.1/ow-10/contract.md`, C1 to C29). ow-draft is a text-only skill, so a model has to run it; the checker (`scripts/ow-draft-acceptance.mjs`) reads what the run wrote and printed and tests it against the answer key and the family's own goldens. "Real use" (one real case study, anonymised, and one client report) is graded in REL-02.

## Layout of a case

| Folder or file | Holds |
|---|---|
| `input/` | Files the case adds to its starting state: a re-run findings file, a second brief, a client's handling level, the cut state of a resumed run |
| `session/` | What the user says in the session (`answers.md`) and, for a repository copy, the branch checked out (`repo-state.yaml`) |
| `expected/` | The golden run, invented for the test (written with a generator kept outside the repository, then graded by the checker): what ow-draft writes under `opchain-work/` and into `site/`, and `printed.md`, the screen |
| `answer-key.yaml` | `base:` (the case it continues), `world:` and `upstream:` (on a story's first case), `verbs` (the verb and mode the run ran), `draft`, `today`, the checks and what each expects; `resume:` for a cut-off run |
| `worlds/studio/` | The shared workspace: the user's `handoffs.yaml` (`drafts`: blog, social, newsletter, shared_drive), the price book (ow-build-plan's, plus a care plan at 480), voice samples, the other workstreams, a second Mossgate research topic, and the site repository `site/` (no `.git`: the tests build it at layout time with a fixed author and date) |
| `trigger-queries.yaml` | Should-trigger and should-not-trigger prompts |

A case's starting state is layered, newest first: its own `input/` and `session/`, each earlier case down its `base:` chain, the world, then the family goldens its chain names (`upstream:`): ow-research's `run-regulations` and `run-business`, ow-start's `logs-decision-from-meeting`, `logs-larkspur-checkin` and `logs-decision-business-review`, and ow-build-plan's `accepted-signed`. `STATUS.md` continues the world's lines.

**Binary exports are never committed.** A golden's `deliveries.yaml` lists the PDF, Word, PowerPoint and Excel files ow-tools would write; the tests write a stub for each when they lay a run out. The repository copy is `repo: ../site` in `handoffs.yaml`; the fixtures keep it at `site/` beside `opchain-work/` (the checker strips the leading `../`, as ow-documentation's does).

## The stories

- **Mossgate Books** (a client deliverable): the `client` voice and its approval; the brief, handed in by ow-research's NEXT (`m-route-*`); the evidence from `run-regulations` (the Downstream test, `m-route-evidence`); the memo, its candidate, sign-off and delivery to the shared drive (say line, and a connector push in `m-deliver-connector`); a stale finding (`m-freeze-stale`), waivers (never-waived refused, Sources waived), a second candidate, refusals at each gate, and the run without ow-tools.
- **Larkspur Ceramics** (client work and client comms): a quarterly-review deck from named logs and the plan's map; a cost sheet with `calc total`; an announcement in the client's own voice with the client's approval, refused for delivery until then, and the handling union (`l-deliver-handling`).
- **business** (marketing and internal): the `marketing` voice; a case study, anonymised, then named under a permission, then quoted once the client approved the words (the round-figure ask on 600; the repository copy on a branch); a post whose published 480 equals ours by value, waived by figure; an internal policy; a newsletter.
- **Cuts** (`*-cut-<step>`): every step of every key, resumed at the next step, writing only what was left; a cut after the last step is a no-op.

## Checking a real run

```bash
node scripts/ow-draft-acceptance.mjs --prepare m-write /path/to/empty-folder
```

Attach the folder in a session where ow-draft is installed, run the step the answer key's `verbs` names, saying what `session/answers.md` says, and save the screen as `printed.md` at the top of the folder. Then `node scripts/ow-draft-acceptance.mjs m-write /path/to/empty-folder`. A real run is read by difference. With no arguments, the script checks every golden run.
