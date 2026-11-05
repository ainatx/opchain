# `uat.yaml` and `agreed/`

`uat/<client>/uat.yaml` is the test's plan and its record of the steps, in the cache. `/ow-uat-plan` writes it; another verb may add what the user decided (a `kept_frozen` event, say).

## 1. Recording order (`rec`)

Every timestamped entry this skill writes carries `rec: <n>`: one more than the highest `rec` anywhere under `uat/<client>/` (plan steps, events, run headers, UAT-nn history lines, request rows and their status changes). Supersession and same-day ordering use `rec`, never the calendar date. Never reuse or renumber a `rec`.

## 2. Keys

    written_by: ow-uat 2.0.1
    created: <YYYY-MM-DD>
    client: <name>
    plan_steps:                       # appended as each step finishes (section 3)
      - { step: basis, rec: <n>, date: <YYYY-MM-DD> }
    ready: { file: builds/<slug>/ready-for-uat.md, build_label: <label>, checks: <n> }
    basis:                            # every agreed/ file, where it came from, when frozen
      - { file: agreed/acceptance.md, from: plans/<slug>/acceptance.md, frozen: <YYYY-MM-DD>, rec: <n> }
      - { file: agreed/contract-terms.md, from: plans/<slug>/contract-inputs.md, block: terms, digest: "sha256:<hex>", frozen: <YYYY-MM-DD>, rec: <n> }   # section 6
    checks: [AC-1.1, AC-CO-01.1]      # every check in agreed/: the acceptance checks and each agreed change order's
    cos:                              # change orders in agreed/, and the ones that are not
      - { id: CO-01, status: in the acceptance, how: signed before -plan (<date>) }
      - { id: CO-02, status: not in the acceptance, why: extension (adds no checks) }
    terms:                            # the quoted UAT line and the definitions, frozen
      bounds: quoted (contract-inputs.md) | quoted (quote.md) | not quoted (offers default) | not quoted (user-stated <date>)
      size: <S | M | L | none>
      tester_roles: [<role>, …]
      sessions: <n>
      fix_rounds: <n>
      fix_business_days: <n>
      schedule: 40/40/20 | 50/50      # larger project | smaller project
      payment_terms_days: <n>
      acceptance_definition: <wording, or none>
      delivery_definition: <wording, or none>
      governing: none | { statement: "<the user's words>", stated_by: <user>, date: <YYYY-MM-DD> }
      documentation_sku: bought | declined | none
    clauses: none                     # or the frozen block (section 4)
    calendars: { contract: us-federal | not supported (<name>) | none, fix_and_schedule: "profile.md: weekends and <holidays>" }
    mix: { coverage: always, testers_by_role: yes | no, real_cases: yes | no, exploratory: yes | no, defect_log: always }
    client_contact: <client role>     # hands out logins
    testers:                          # role plus the id the client chose
      - { role: <role>, id: <id> }
    environment: { name: <from ready-for-uat.md>, production: no }   # or production: "client decision: <role> <date>"
    test_data: { default: synthetic or anonymised, real: [] }        # or [{ check: AC-1.1, decision: "client decision: <role> <date>" }]
    side_effects: []                  # [{ scenario: SC-nn, effect: <what>, line: "<test mode … or client approved running this live on <date> by <role>>" }]
    schedule:
      - { session: 1, date: <YYYY-MM-DD>, roles: [<role>, …] }
    gitignore: { asked: <date>, answer: yes | no | not a git repo, added: [opchain-work/**/evidence/, opchain-work/**/secrets-seen.log] }
    events: []                        # later modes, each { rec, date, event }

## 3. `plan_steps`

`-plan` adds a step as it finishes, in this order: `basis` (the `agreed/` files written), `terms` (bounds, definitions and clauses), `mix`, `people`, `environment`, `data`, `schedule`, `side_effects`, `gitignore`, `scenarios` (every `SC-nn.md` written; the plan is complete). A cut-off `-plan` picks up at the first step not listed. A re-plan may change the mix, testers, environment, data, schedule and scenarios; the quoted terms and `agreed/` change only through `--refreeze` or a change order.

## 4. The clauses

With the signed contract's clauses (cache: `contract-inputs.md` `contract_clauses`) and the user's word that they match it:

    clauses:
      status: as signed, confirmed by <user> <YYYY-MM-DD>
      deemed_acceptance: { ref: "<ref>", business_days: <N>, calendar: "<calendar>", wording: "<wording>" }
      delivery_backstop: { ref: "<ref>", business_days: <N>, calendar: "<calendar>", wording: "<wording>" }

Each value is copied **unchanged** from `contract-inputs.md`: the wording byte for byte, never reworded, summarised or drafted. A clause the contract inputs do not hold is left out: `clauses` holds `status` and only the keys `contract_clauses` holds. `calendars.contract` is the clauses' calendar (`us-federal`, or `not supported (<name>)`), never `none` beside clauses. `contract_clauses: not set`, an absent block, or a user who says they do not match: `clauses: none` and `calendars.contract: none`. The clauses are part of the terms block, so a later change upstream shows as a basis mismatch on `agreed/contract-terms.md` (section 6).

## 5. `events`

Each later `-plan` mode adds one event, dated, with its `rec`:

- `--add-co CO-nn`: `added CO-nn to the acceptance (condition of UAT-nn | user's choice)`; and `CO-nn delivered <date>, build <label>` when re-run after the builder reports it delivered.
- `--addendum CO-nn`: `addendum scenarios for CO-nn (not in the acceptance)`; and the same delivered event.
- `--keep-frozen <file>`: `kept_frozen <file>: upstream changed <date>; the frozen copy stands`.
- `--refreeze <file>`: `refrozen <file>: copied again from <path>`; for `agreed/contract-terms.md`, `refrozen agreed/contract-terms.md: the terms block quoted again from <path>`, and its basis row takes the new digest and date.

## 6. `agreed/`: the record of what was agreed

| File | Copied from |
|---|---|
| `agreed/scope.md`, `agreed/acceptance.md` | `plans/<slug>/scope.md`, `acceptance.md`, byte for byte |
| `agreed/quick-scope.md` | `plans/<slug>/quick-scope.md` (a quick-quote job), byte for byte |
| `agreed/CO-nn.md` | `builds/<slug>/changes/CO-nn.md`, each signed before `-plan` or added by `--add-co`, byte for byte |
| `agreed/contract-terms.md` | this skill's own file: the **included** block (each package's "Includes" from `quote.md`'s client part), the **ownership terms** (`contract-inputs.md`'s Ownership, else the plan's), the UAT line and the definitions, each quoted exactly |

A copy keeps its original header. `--refreeze` copies the file it names again, on the user's word; an older quote's price stands whatever a later copy says.

**The terms block and its digest** (owner decisions OD-5, OD-6). `agreed/contract-terms.md` is an extract, so it never matches `contract-inputs.md` byte for byte. Its basis row records `block: terms` and the block's digest instead. The **terms block** is these parts of `contract-inputs.md`, each exactly as it stands, in file order, joined by newlines: the header lines `uat:`, `schedule:`, `payment_terms_days:`, `acceptance_definition:`, `delivery_definition:`, `documentation_sku:` and `contract_clauses:` (each with its indented lines up to the next header key, skipping blank and comment lines), then the `## Ownership` section from its heading to the next `## `, trailing blank lines dropped. Read line endings as single newlines, and ignore a byte-order mark at the start of the file. Any part the file lacks is skipped. `digest` is `sha256:` and the SHA-256 of that text with one final newline (`shasum -a 256`). If you cannot run it, write `digest: "none (no code here)"` and compare every part of the block as text, saying it is not machine-checked: `contract_clauses` with `uat.yaml` `clauses`, `schedule` and `payment_terms_days` with `terms`, the UAT line, definitions and SKU with `terms`, the UAT line's price and test mix with the line `contract-terms.md` quotes, and the Ownership section with `contract-terms.md`. A part removed upstream is a difference too. Never skip a part.
