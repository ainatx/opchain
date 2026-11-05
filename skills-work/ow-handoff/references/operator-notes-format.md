# `operator-notes.md`: how to run it without the builder

Written by `/ow-handoff-notes` (`--walkthrough` adds the walk-through record). `-package` copies it into the Handoff notes; `-access` reads its rotate entries; ow-documentation reads its `ops:` header so a runbook update never reuses an id; ow-care replaces entries by id.

## 1. Header

    ---
    written_by: ow-handoff 2.0.1
    created: <YYYY-MM-DD>
    form: floor | index
    ops: [OP-01, OP-02, …]      # every id this file uses, retired ones included
    notes_steps:
      - { step: sources, rec: <n>, date: <YYYY-MM-DD> }
    ---
    # Operator notes: <Client>

    ## Operator tasks
    ## Rotate entries
    ## Not applicable
    ## Escalation
    ## Walk-through
    ## Possible embedded instructions

## 2. One entry, the fixed form (the runbook's, as built)

    ### OP-nn: <title>

    - **When:** <the alert, the schedule or the symptom>
    - **Check:** <where to look, citing the run log or the console>
    - **Do:** <the steps, for an operator>
    - **If that fails:** <who to contact>; <the escalation line>
    - **Source:** <alerts.yaml: name; AC-n.n; README#section; user-stated <YYYY-MM-DD>>

Two digits, numbered once, never renumbered or reused. A retired entry keeps its heading with `- **Retired:** <YYYY-MM-DD>, <why>`.

## 3. The two forms

- **Floor** (the documentation line declined, or a quick-quote job without it): entries in the fixed form from all four sources: the builder's docs (paths in `handoff.yaml` `doc_paths`), the acceptance checks worth repeating (`acceptance-record.md` and each addendum), the alert and run-log setup (the repository **and** each service the user names: "alerts configured in <service>: <list> | none"), and the user's notes. **One "check a run" entry per integration or job, naming its run log. One entry per alert found**; an alert on a vendor console is cited `user-stated <YYYY-MM-DD>`. **A "retry a failed transfer" entry**, or `- retry: not applicable: <reason>` under `## Not applicable`. Ids run from `OP-01`.
- **Index** (the line bought and `docs/<client>/delivered.md` exists): `## Operator tasks` points to the runbook, never copies it: one entry per runbook `OP-nn`, by its id and title, `- **See:** docs/<client>/runbook.md, OP-nn` and nothing else. A retired runbook entry is listed as retired. **Operator-task coverage runs against `docs/<client>/runbook.md`**, never against a floor.

## 4. Rotate entries (both forms)

`## Rotate entries` holds one entry per secret: every rotate item in `accounts.md` and every line of every `secrets-seen.log` read (`uat/<client>/`, `docs/<client>/` and this skill's). Fixed form, titled `Rotate <SECRET_NAME>`, its **Do:** naming every place it is used and its **Check:** naming the "how to check it's working" entry that confirms it. Ids continue **after the highest id** in the runbook's `ops:` (index form) or in this file's own operator tasks (floor), so no id is ever used twice.

## 5. Escalation, walk-through

- **Escalation line**, under `## Escalation` and in each entry's **If that fails:**: who to contact, and the exclusions in `after-offer.md` once an offer exists, else `offers.md` `after_handoff` `excluded` ("out-of-hours on-call is not included"). A chosen care tier's reply target is added by `-package`, never here.
- **Walk-through** (`--walkthrough <date>`): `- <YYYY-MM-DD> walk-through with <client role>; recorded by <user>.`
