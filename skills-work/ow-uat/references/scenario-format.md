# Scenarios, packs and the results template

## 1. A scenario: `scenarios/SC-nn.md`

Written by `-plan` (and its `--add-co` and `--addendum` modes); a re-plan may rewrite one, and says so. The record is `acceptance_criteria`; this is the cache. Ids run on from the highest `SC-nn` in the folder.

    ---
    written_by: ow-uat 2.0.0
    created: <YYYY-MM-DD>
    id: SC-01
    kind: required | role | real-case | exception | addendum
    proves: AC-1.1                   # a check id in agreed/, or a scope item (WP-n) for a role scenario
    role: <tester role>
    co: none                         # the change order, for an addendum scenario
    side_effect: none                # or what it does outside the build: sends a message, takes a payment, writes to another system
    cases_required: <n>
    data: { source: "<where the records live>", ids: "<record ids or a locator>", count: <n>, fields: [<field>, …] }
    ---
    # SC-01: <what the tester does, in a few words>

    ## Steps
    1. <one action per step, in the tester's words>

    ## Expected result
    <the check's Then and How we check, with the number of cases>

    ## Data (by pointer only)
    <source; record ids or locator; count; fields>

**Sources, in order:** one **required** scenario per check in `agreed/` (its expected result is the check's *Then* and *How we check*, cases included); one **role** scenario per main task per role from `map/future.md`; **real-case** scenarios the client points to; **exception** paths (the "what if it's wrong" side of a check). N checks give N required scenarios.

**Data by pointer only.** A scenario names where the data is (source), which records (ids or a locator), how many and which fields. It never holds a value copied from a real record: no customer name, no order line, no amount from the client's data. Test data made for the test is described, not pasted.

**Side effects.** A scenario that sends a message, takes a payment or writes to another system carries `side_effect: <what>`. In a production test (`uat.yaml` `environment.production` set), `uat.yaml` `side_effects` gives each one its line: the test mode, internal recipient or test account to use, or "client approved running this live on <date> by <role>".

## 2. The tester pack: `uat-pack-<role>.md` and its exports

One pack per tester role, written by `-pack`. The Markdown source is the single source of every format:

| Section (H2) | Holds |
|---|---|
| What this test is | One paragraph: the client's people try the finished build against what was agreed; problems are fixed fast, at no charge, when they are in scope |
| Dates | The sessions for this role, written out |
| Signing in | "Your login comes from <client contact role>." Never a login, a password or a link that carries one |
| Your scenarios | A table: scenario, what to do, what you should see |
| Reporting a problem | What you did, what you expected, what happened; a screenshot only if it shows no real customer data |
| The results template | The six columns, below |

One H1 (`# User acceptance testing: <role> pack, <client>`), no skipped heading levels, a header row on every table, alt text on every image, link text that is not a bare address. Anything internal sits between `<!-- ow:internal -->` and `<!-- ow:end-internal -->` and never reaches an export.

**Exports**, written to `export/`: `ow-tools export uat/<client>/uat-pack-<role>.md` writes `uat-pack-<role>.pdf` and `.docx` (keep the command and its output in `pack.yaml`). If it is not installed, say so once and `-pack` writes `export/uat-pack-<role>.html` itself. The HTML pack has `<html lang="…">`, a `<title>`, one `h1`, no skipped headings, `th` header cells, and text that meets 4.5:1 contrast on its background (headings 3:1).

## 3. The results template: `export/results-template.csv`

The header row is exactly these six columns, in this order, and nothing else:

    tester id,scenario,result,cases passed,note,records created

One row per scenario in the packs, with only `scenario` filled. Testers write their id; the template has no name column. `result` is `pass`, `fail`, `blocked` or `not run`; `cases passed` is a count.

## 4. `pack.yaml`

    written_by: ow-uat 2.0.0
    created: <YYYY-MM-DD>
    packs:
      - { role: <role>, source: uat-pack-<role>.md, exports: [export/uat-pack-<role>.html], scenarios: [SC-01, …] }
    results_template: export/results-template.csv
    export_tool: "not available here: HTML packs only" | { command: "<ow-tools export …>", output: "<raw output>" }
    preflight: <the ow-tools preflight result, or "HTML checks by this skill">
