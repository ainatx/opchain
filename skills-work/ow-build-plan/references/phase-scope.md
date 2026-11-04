# Phase: scope (`/ow-build-plan-scope`)

Keep to `references/ow-protocol.md`. Read first from the CRM: the recap (document `recap`), the map (document `process_map`) and the evidence; the files below are the cache, used only when the CRM is unreachable, and the output says so. Publish the scope and risks as document `scope` (internal) and the checks to `acceptance_criteria`. Never overwrite a version a person edited: write yours beside it and say so. Read `plan.yaml`, `evidence.md` and the five `map/` files. With no map, say so; the scope can still be written from the intake if the user wants it, and every assumption says it rests on the intake alone. The scope is **builder-neutral**: it names what changes and how the client will know it works, never a price, a tool of the user's own, or these skills' wording. Name a technology only where the client's systems require it.

## 1. Write `scope.md`

`written_by: ow-build-plan 2.0.1` and `created`, then:

    # Scope: <client>

    ## Work packages
    ### WP-1 <name in plain words>
    - what changes: <one or two sentences>
    - from the map: <fact lines it rests on, by file and E-nn>
    - systems: <names>

    ## Out of scope
    - <explicit exclusion>          (never empty: at least one line)

    ## Assumptions
    - [<confidence> <E-nn>] <what must be true>

    ## Client dependencies
    | what | from (role) | by |
    |---|---|---|

    ## Open questions
    - <every remaining UNKNOWN from the map>. Who can answer: <role>.

    ## UAT approach
    - tester roles: <role names, as the user states them>
    - test mix: <what each role checks, by work package>

Work packages are numbered `WP-1`, `WP-2`, … in the order the client would see them working. Anything the client asked for that is not in a package goes under Out of scope with one plain reason. Ask which roles will test unless a file says (the testing line prices it); never default the number of roles.

## 2. Write `acceptance.md`

Every in-scope work package has at least one acceptance check, in the format of `references/acceptance-check-format.md`, and error cases get checks too.

## 3. Write `risks.md`

    # Risks: <client>

    ### R-1 <short name>
    - likelihood: low | medium | high
    - impact: low | medium | high
    - mitigation: <what reduces it, and when>
    - owner: <role>
    - evidence: <E-nn, or "inferred">

Every risk has an owner (a role, on either side) and a mitigation.

## 4. Before you move on, check

- **Acceptance coverage**: every `WP-n` in `scope.md` has at least one `AC-n.m` in `acceptance.md`, each with `test data` and a whole-number `cases`; at least one check is `kind: error`.
- **Out of scope present**: the list has at least one line.
- **Risk owners**: every `R-n` has an owner and a mitigation.
- **Evidence trace**: every HIGH or MEDIUM assumption and every "from the map" line cites an `E-nn` that exists.

Fix what fails. Nothing here goes in the file.

## 5. STATUS and what comes next

In the cache, a plain `STATUS.md` line is enough: `<date> | ow-build-plan 2.0.1 | plans/<client>/scope.md | plan to <client> by <plan_delivery>`. Next: `/ow-build-plan-quote`.
