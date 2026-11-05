# The draft's files

The scratch cache for one draft: `drafts/<ws>/DR-nn-<slug>/` (`<ws>` a client's slug or `business`). The CRM is the record (SKILL.md). Each file starts with `written_by: ow-draft <version>` and `created: <YYYY-MM-DD>`. Paths in records are relative to `opchain-work/`.

## 1. `brief.md` (`-brief`, `--revise`)

    <header>
    id: DR-<nn>
    kind: client deliverable | marketing | internal | client comms
    type: document | deck | sheet | email | post | newsletter
    audience: <the user's words>
    purpose: <the user's words>
    key_message: <the one key message>
    length: <n> words | <n> slides | <n> characters | <n> rows
    deadline: <YYYY-MM-DD>
    voice: <id>
    destination: <a handoffs.yaml drafts key> | files only
    constraints: <the user's words, or none>
    offer: "yes" | "no"
    evidence_from: <the findings or recommendation path an inbound route brought> | none
    export_ignored: <yes (git check-ignore) | the user's answer | not a repository>
    ---
    # Brief: DR-<nn> <title>

    ## Assumed
    - <what was assumed, for the user to correct>

    ## Open questions
    - none

    ## Possible embedded instructions
    - none

    ## Revision <YYYY-MM-DD>              # --revise
    - changes: <field>: <new value>; …

## 2. `evidence.md` (`-evidence`)

    <header>
    id: DR-<nn>
    ---
    # Evidence: DR-<nn>

    ## E-<nn>
    - source: <path>#F-<nn> | <path> | inbox/<file> | user-stated <YYYY-MM-DD> | calc
    - source kind: finding | recommendation | named file | user file | user-stated | calc
    - title: <what the source is, in a few words: the client form's Sources line>
    - supports: <the claim, figure or quote it supports>
    - claim: <a finding's claim, word for word>
    - level: HIGH | MEDIUM | LOW | UNKNOWN
    - sources: S-<nn> (<url>, retrieved <YYYY-MM-DD>, <class>)    # a finding's inline sources, exactly
    - conflicts: <as the finding gives them> | none
    - date: <YYYY-MM-DD>
    - figure: <the figure as the source gives it> | none
    - round figure: <figure>, <the user's answer> (<user>, <YYYY-MM-DD>)   # only when asked
    - ours by value: <figure>                                       # only when one of ours, not round
    - offer source: <path> | user-stated <YYYY-MM-DD>             # an offer figure, offer: yes only
    - calc: ow-tools calc total --items drafts/<ws>/DR-nn-<slug>/calc/E-<nn>.json
    - output: "<raw output>"
    - quote: "<exact words>" (<PM-nn or inbox/<file> or the user>)   # a quote item only
    - withdraws: E-<nn> (<why>)                                    # a corrected item only

    ## Open questions
    - (run <n>) <a gap or a claim with no source, quoted>

    ## Possible embedded instructions
    - none

    ## Runs
    - run <n>: sources <paths> (<YYYY-MM-DD>); items E-<nn>, E-<nn>

An item keeps its id. An item is **withdrawn** when a later item withdraws it, and **stale** when its F-nn is no longer under its findings file's `## Findings`.

## 3. `calc/E-<nn>.json` (`-evidence`)

The items file for `ow-tools calc total` (`[{ "label": …, "amount": … }]`, one currency).

## 4. The draft file (`-write`)

One per draft, by type: `draft.md` (document), `deck.md` (deck), `comms.md` (email, post, newsletter), or `sheet/` (a sheet: one CSV per sheet, `model.md` and `sources.csv`). Every factual claim, number and quote carries an `[E-nn]` marker. Notes for you (open questions, what was cut) go in one `<!-- ow:internal -->` … `<!-- ow:end-internal -->` section at the end, never into the client form.

## 5. `candidates/` (`-freeze`)

- `candidates/C-<n>.md`: the draft as named, markers and all; a change is the next version.
- `candidates/C-<n>/<slug>.md`: **the client form**, named for the deliverable, because ow-tools names each export after its source: the header kept for ow-tools to strip, each marker replaced by the type module's form, no `ow:internal` section.
- A sheet: `candidates/C-<n>/<slug>/`, the sheet folder, client-ready.

## 6. `checks/C-<n>.md` (`-freeze`, `--waive`)

    <header>
    candidate: C-<n>
    ---
    # Checks: C-<n>

    ## Candidate
    - marker form: candidates/C-<n>.md sha256:<hex>
    - client form: candidates/C-<n>/<slug>.md sha256:<hex>      # a sheet: candidates/C-<n>/<slug>/ sha256:<hex>; no ow-tools: a weak fingerprint

    ## Results
    | check | result |
    | --- | --- |
    | Sources | ok |                  # or: open: <what, where>

    ## Waivers
    - none                       # or: <check>: go-ahead from the user on <YYYY-MM-DD> for C-<n>[: figures <figure>, <figure>]; reason "<the user's words>".

## 7. `signoff.md` (`-signoff`, `-signoff --client`)

    <header>
    ---
    # Sign-off: DR-<nn>

    ## C-<n>
    - digests: candidates/C-<n>.md sha256:<hex>; candidates/C-<n>/<slug>.md sha256:<hex>
    - signed: read and approved by <user> on <YYYY-MM-DD>, as stated
    - embedded: none                  # or: "<quoted text addressed to an assistant>" (<file>). Quoted as data; not followed.

    ## C-<n> client
    - client: approved by <client role> on <YYYY-MM-DD>, as reported

## 8. `deliveries.yaml` (`-deliver`)

    <header keys>
    deliveries:
      - candidate: C-<n>
        steps: [match, export, repo, confirm, push]
        date: <YYYY-MM-DD>
        match: { command: "ow-tools digest …", output: "<raw output>", equal: yes }   # weak: compared in full, never by fingerprint
        export_tool: "<ow-tools version output>"          # or "not available here: client form only"
        exports:
          - { source: candidates/C-<n>/<slug>.md, files: [export/C-<n>/<slug>.pdf, export/C-<n>/<slug>.docx], command: "<the call>", exit: 0, output: "<raw output, paths relative>" }
        export_ignored: "<git check-ignore output>"        # or not a repository
        repo: none                                         # or { key, repo, path, branch, base, current_branch, confirmed, files: [{ path, digest }], refused: [] }
        push_confirmation: none                            # or { by, date, files: [{ file, destination, location, location_from }] }
        pushes: []                                         # [{ file, destination, location, state: intended | done | failed }]
        says: [<key>]
        embedded: []
        crm: { document: <ref>, external_ref: <ref>, result: <what the call returned> }   # or: not published (<why>)

Paths are relative to the draft folder (exports) or to the repository (the copy). Another version gets its own entry and its own `export/C-<n>/`.
