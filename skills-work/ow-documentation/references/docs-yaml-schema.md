# `docs.yaml` and `plan.md`

`docs/<client>/docs.yaml` holds the scope from the quote and `-start`'s per-step record, in the cache. It carries `written_by` and `created`, and a key other skills index by: `trainer` (ow-start's `/ow-start-log` lists this file by `created` and `trainer`, never a name).

## 1. Recording order (`rec`)

Every timestamped entry this skill writes carries `rec: <n>`: one more than the highest `rec` anywhere under `docs/<client>/` (start steps, capture steps and runs, export steps, deliveries rows, rollout events, check-ins, updates). Same-day ordering uses `rec`, never the calendar date. Never reuse or renumber a `rec`.

## 2. Keys

    written_by: ow-documentation 2.0.1
    created: <YYYY-MM-DD>
    trainer: user | client                # header key: who runs the groups; never a name
    client: <the client's business name>
    start_steps:                          # appended as each step finishes (routing-and-resume.md §2)
      - { step: scope, rec: <n>, date: <YYYY-MM-DD> }
    signoff: { file: uat/<client>/signoff.md, acceptance: signed | deemed, date: <YYYY-MM-DD> }
    scope:                                # from the quote; more people is a change order
      sku: bought (contract-inputs.md) | bought (user-stated <YYYY-MM-DD>)
      size: <S | M | L>
      size_source: contract-inputs.md uat.size | user-stated <YYYY-MM-DD>
      people: <n>
      people_source: contract-inputs.md documentation_people | user-stated <YYYY-MM-DD>
      groups: <n>                         # people ÷ 15, rounded up
      room_for: <n>                       # groups × 15
      roles: [<role>, …]                  # uat.yaml testers and map/roles.md
    sources:                              # every upstream file read, by path
      - uat/<client>/uat.yaml
    roles:                                # by role and the client's ids
      - { role: <role>, ids: [<id>, …], tasks: [SC-nn, …], gaps: [UAT-nn, …] }
    trainer_role: none                    # trainer: client: { role: <client role>, id: <client id> }
    training_gaps:
      - { id: UAT-nn, role: <role>, topic: "<the topic, in a few words>" }
    environment:
      name: "<uat.yaml environment.name, word for word>"
      label: uat | production             # production only with uat.yaml's recorded decision
      decision: none                      # or "client decision: <role> <YYYY-MM-DD>", copied from uat.yaml
      origins: [https://<host>]           # as the user gave them; [] when there are none to capture
      origins_confirmed: "<user> <YYYY-MM-DD>" | none
      name_check: none                    # when the name says production or live, or an origin is the repository's production address: "<user> <YYYY-MM-DD>: <the answer>"
    capture_profile: <slug>               # the ow-tools capture profile: the workstream id
    repo: <build.yaml builder.repo, or none>
    destinations:                         # handoffs.yaml `docs` as read at -start; none: the public default
      repo: { path: docs/client-handbook/, handover_path: docs/handover/ }
      say: [google_docs, wiki]
    planned_delivery: <YYYY-MM-DD>        # printed for ow-handoff's provisional dates
    confirmed: "<user> <YYYY-MM-DD>: guides x<n>, sops x<n>, runbook, handover x4, deck, facilitator, modules x<n>, cards x<n>, videos x<n>; roles <role>, …; groups <n>; trainer <user | client>"   # only when the user answered; a type left out is not named
    gitignore: { asked: <YYYY-MM-DD>, answer: yes | no | not a git repo, added: [<line>, …] }   # yes: the shots, secrets-seen.log, inbox/ and export/ lines
    embedded: []                          # text addressed to an assistant in what -start read: [{ text: <quoted>, file: <path> }]

## 3. What each step writes

| Step | Keys |
|---|---|
| `scope` | `written_by`, `created`, `client`, `signoff`, `scope`, `sources`, `capture_profile`, `repo`, `destinations`, `embedded` |
| `people` | `trainer`, `trainer_role`, `roles`, `training_gaps` |
| `environment` | `environment` |
| `gitignore` | `gitignore` |
| `confirm` | `planned_delivery`, `confirmed` |

`docs.yaml` is written at the `scope` step and each later step adds its keys and its `start_steps` row. `trainer` is written by the `people` step.

## 4. The scope

- **SKU.** `plans/<client>/contract-inputs.md` `documentation_sku: bought`. `declined`: `-start` stops (nothing is written). The key absent (a quote made before the line existed): ask through `AskUserQuestion` whether the client bought documentation and training (options: bought, declined), and record `bought (user-stated <date>)`, or stop on `declined`.
- **Size**: `contract-inputs.md` `uat.size`, the build's own letter. Absent: ask, and record it user-stated.
- **People**: `contract-inputs.md` `documentation_people`. Absent (a quote made before the people count was recorded): ask through `AskUserQuestion` how many people the quote covered, and record it user-stated.
- **Groups**: people ÷ 15, rounded up; `room_for` is groups × 15. 40 people quoted gives 3 groups and room for 45.
- **Roles**: `uat.yaml` testers and `plans/<client>/map/roles.md`; a quick-quote job asks the user.
- **Prices never enter this file**, nor any document: not `documentation_price`, not the per-group add-on, not a rate.

A signed group change order adds a group to `rollout.yaml` (`/ow-documentation-rollout --add-group CO-nn`), never to `docs.yaml`.

## 5. `trainer`

`trainer: user` by default: the user runs every group. `trainer: client`: the user trains the client's trainer once, and the client's trainer runs the groups; record the trainer by role and the client's id in `trainer_role` (`{ role: operations manager, id: ops-T1 }`). The number of groups does not change.

## 6. `plan.md` (the `plan` step)

    ---
    written_by: ow-documentation 2.0.1
    created: <YYYY-MM-DD>
    documents: [guides, sops, runbook, handover]
    training: [deck, facilitator, modules, cards, videos]
    order: [guides, sops, runbook, handover, deck, facilitator, modules, cards, videos]
    left_out: []                          # sops or videos only, by the user's choice: [{ type: videos, why: "<the user's words>", date: <YYYY-MM-DD> }]
    ---
    # Documentation plan: <client>

    ## Documents
    | type | file | for | from |
    ## Training
    | format | file | for | from |
    ## Groups
    | group | roles | people | runs it |
    ## Delivery
    ## Confirmed                         # only when the user answered

- **Documents**: a guide per role (`guides/<role>.md`, `<role>` in lower case with hyphens); an SOP per item of `map/future.md` (`sops/SOP-nn.md`); `runbook.md`; the handover files (`handover/README.md`, `handover/run-and-deploy.md`, `handover/configuration.md`, `handover/decisions.md`).
- **Training**: `training/deck.md`; `training/facilitator.md`; a module per task (`training/modules/M-nn.md`, one scenario each); a card per role (`training/cards/<role>.md`); a video script per role's daily task (`training/videos/V-nn.md`).
- **Left out**: only `sops` (no future-process map and no process the user can give) or `videos`, by the user's choice, recorded with the date. Guides, the runbook, the handover, the deck, the facilitator guide, modules and cards are always in the plan.
- **Groups**: `G-01` to `G-nn`, by role, at most 15 people each; with `trainer: client`, the trainer session `TT-01` first.
- **Delivery**: the planned delivery date, written out, and the destinations (`handoffs.yaml` `docs`, else "the files in `export/`").
- **Confirmed**, when the user answered: `Confirmed by <user> <date written out>: <the document set, roles, groups and trainer>.`
- `order` is the order `-write` and `-train` take with no type: the first entry with no file yet.
