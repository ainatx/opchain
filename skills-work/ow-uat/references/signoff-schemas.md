# Sign-off files

Written by `/ow-uat-signoff` in the mode named. Each starts with `written_by: ow-uat 2.0.1` and `created: <YYYY-MM-DD>`, and dates every entry with its `rec` (`references/uat-yaml-schema.md` §1). These are the cache; the record is the CRM's documents.

## 1. The request: `signoff-request-<n>.md` (plain mode)

Client-facing. `n` is one more than the highest request number. Once it may have gone out it stands: a correction is the next request.

    ---
    request: <n>
    written: <YYYY-MM-DD>
    rec: <n>
    build_label: <label>
    planned_send: <YYYY-MM-DD>
    deemed_date: <YYYY-MM-DD> | none (clauses: none) | none (calendar not supported)
    deemed_date_source: "<calc command and output>" | contract-calendar.md table; not machine-checked
    ---
    # Sign-off request <n>: <client> user acceptance testing

    <First sentence: the deemed date (section 2).> Signing this request accepts the build against the agreed acceptance checks.

    ## The build tested
    ## Every acceptance check
    ## Checked by the builder; not tested by your people
    ## Punch list
    ## Change requests and later change orders
    ## Records created during testing
    ## Environment

- **The build tested**: its label and the environment ("tested in production (client decision <date>)" where it applies).
- **Every acceptance check**: a table, check · result · cases passed · run and date · run by · source, one row per check in `agreed/`, each with its passing run on the latest build label.
- **Checked by the builder; not tested by your people**: every check whose only pass is `user alone`. None: say so.
- **Punch list**: the minors and cosmetics on it, each with its UAT-nn.
- **Change requests and later change orders**: requests raised (not part of this acceptance) and post-acceptance change orders (signed after the freeze, not in `agreed/`, not extensions), as the user said when the request was written.
- **Records created during testing**: from the runs' "records created" column, as clean-up items for the client (not a gate).
- It names, in plain words, what passed and what is still open. Anything internal sits between `<!-- ow:internal -->` markers.

**Export**: `ow-tools export uat/<client>/signoff-request-<n>.md` writes `export/signoff-request-<n>.pdf` and `.docx`; if it is not installed, say so once, and the Markdown is the request.

## 2. The first sentence

- The contract's clause, supported calendar: "If you neither sign this request nor send us a qualifying defect report, it will be deemed accepted on <date written out> under <clause ref> of our contract." The date is the planned send date plus the clause's N business days on the contract calendar, computed as `references/contract-calendar.md` says.
- `clauses: none`: "Our contract has no deemed-acceptance clause, so this request is accepted only when you sign it."
- Calendar not supported: "Our contract's deemed-acceptance date can't be computed here, so this request is accepted when you sign it or as the contract provides."

## 3. `signoff-requests.yaml`

    requests:
      - n: 1
        written: <YYYY-MM-DD>
        written_rec: <n>
        build_label: <label>
        stated_deemed_date: <YYYY-MM-DD> | none (clauses: none)
        sent: none | <YYYY-MM-DD>
        notices: []                  # cannot-reproduce notices that count: { uat: UAT-nn, arrived, sent, notice_rec } (the rec of the UAT-nn's notice line)
        deemed_date: <YYYY-MM-DD> | none   # the latest of the three dates (section 4)
        calc: "<how the deemed date was computed: the calc command and output, or contract-calendar.md table; not machine-checked>"
        status: drafted | sent | superseded | signed | deemed
        status_history: [{ status: drafted, rec: <n>, date: <date> }, { status: superseded, rec: <n>, date: <date>, why: "<the event and its rec>" }]
        post_acceptance_cos: { listed: [CO-nn], confirmed: "<user> <date>: list them | run --add-co first" }
        signing_steps: []            # --signed and --deemed: record, accounts, acceptance-record, punch-list, signoff
        test_accounts: []            # the answers

**Supersession** (so that acceptance is never marked on a request that no longer shows the latest build), at the start of every mode: a `drafted` or `sent` request is marked `superseded` (one `status_history` entry naming the event and its `rec`) if a higher-numbered request exists, or if after its `written_rec` any of these was recorded: a reproduced blocker or major Defect, or a late cannot-reproduce notice; a new condition; a `fixed` on any UAT-nn from the main scenarios; `--add-co`; a delivery of a change order in `agreed/`; a `--refreeze`. Order by `rec`, never by date. A minor or cosmetic never supersedes. `--signed` and `--deemed` judge all of this **as of the signature or deemed date**: an entry dated after it does not count.

## 4. The deemed date (`--deemed`)

The latest of: `sent` + the clause's N business days; the date the request states; 5 business days after the latest timely cannot-reproduce notice. All on the contract calendar, each computed and recorded as `references/contract-calendar.md` says.

## 5. `signoff.md` (`--signed`, `--deemed`; written last)

    ---
    request: <n>
    acceptance: signed | deemed
    signed: <YYYY-MM-DD>                       # the signature or deemed date
    signer_role: <client role> | none (deemed)
    build_label: <label>
    post_acceptance_cos: [CO-nn]
    test_accounts:
      - { role: <what the account is for>, environment: <where>, created_by: <role> }   # never a login or password
    delivery_backstop_date: not applicable (larger project) | no sooner than <date> (acceptance + N business days; the backstop also needs a readiness notice) | none (clauses: none)
    ---
    # Sign-off: <client>

    <signed <date> by <client role> on request <n>; signature not verified by this skill>
    or <deemed accepted under <clause ref> on <date>; applied by <user>; client response not received>

## 6. `acceptance-record.md`

One row per check in `agreed/`: check · final result · cases passed · run and date · run by · build label · evidence. Evidence is cited **only** by an `evidence/index.md` item marked `cleared`; otherwise `none cited`.

## 7. `punch-list.md`

One row per item: UAT-nn · what · severity · logged date · on the signed list (`yes`, or `no: reported after request <n>; not on the signed list`). The handoff turns each into a covered fix.

## 8. `backstop-log.yaml` (`--readiness`, `--builder-delay`)

    readiness: { date: <date>, dependency: "<the listed client dependency>", rec: <n>, recorded: "recorded by <user>; not verified by this skill" }
    builder_delay: [{ days: <n>, reason: "<reason>", rec: <n>, date: <date> }]

## 9. `backstop.md` (`--backstop`)

    ---
    backstop_date: <YYYY-MM-DD>
    acceptance: <date>
    readiness_notice: <date>
    builder_delay_days: <n>
    dependency: "<the dependency still outstanding>"
    calc: "<command and output>" | contract-calendar.md table; not machine-checked
    ---
    # Delivery backstop: <client>
    <the dates and the dependency; recorded by <user>; not verified by this skill>

## 10. `acceptance-addendum-CO-nn.md` (`--addendum`)

The change order's checks, each with its result, cases, run, `run_by`, build label and `cleared` evidence; the confirmation line `confirmed <date> by <client role>; not verified by this skill` (that date is the change order's acceptance date). It never marks a payment.
