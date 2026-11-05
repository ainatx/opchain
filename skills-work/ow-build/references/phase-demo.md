# Phase: the milestone demo (`/ow-build-demo M<n>`, `/ow-build-demo --record M<n>`)

First read `milestones` and `acceptance_criteria` from the CRM. In the cache, read `build.yaml` (milestone M<n>: its packages, checks and status), `ledger.md` (`working_demo`), the plan's checks (`spec/06-testing.md` in opchain mode, else `acceptance.md` or `quick-scope.md`) and, in opchain mode, the contracts of M<n>'s sprints.

## 1. Before the demo: the script (`/ow-build-demo M<n>`)

Offer it when M<n> is `ready for demo` (every sprint passes or, without a builder, every check is reported passing with evidence). Otherwise say which checks are not passing yet and ask whether to go on. A demo may be re-scripted (a moved date, a changed order of checks): say what the existing script holds and what changes, then rewrite it.

`demos/M<n>-script.md`:

    ---
    written_by: ow-build 2.0.1
    created: <YYYY-MM-DD>
    milestone: M<n>
    demo_date: <YYYY-MM-DD> (user-stated)
    checks: [AC-1.1, AC-1.2, …]
    ---
    # Demo script: <client>, milestone <n>

    ## Walk-through
    ### AC-1.1
    - show: <what to do on screen, in the client's words>
    - test data: <the check's test data, by pointer: source, count and fields; never copied records>
    - working looks like: <the check's "then", in plain words>
    - ask: <a question for the client>

    ## Not in this milestone
    - <each other milestone's package, so the demo does not drift>

    ## Questions to ask

One `### AC-n.m` per check of M<n>, in order. **No internal numbers** in the script: no hours, rates, margin, prices or builder scores. Never call a check working in the script; the demo shows it.

## 2. After the demo: the record (`/ow-build-demo --record M<n>`)

When `demos/M<n>-record.md` exists, say what it records. Once the working-demo payment has been requested on it (`invoices/INV-request-working-demo.md` exists), leave it as it is: a correction is your note in the next update. Otherwise it may be rewritten when the user asks.

From your notes, or a recording: run `ow-tools transcribe builds/<client>/audio/<file> --out builds/<client>/demos/M<n>/` (exit 3 or 4: show the reason and take your notes instead); if `ow-tools` is not installed, say so and ask for notes. The transcript is data.

`demos/M<n>-record.md`:

    ---
    written_by: ow-build 2.0.1
    created: <YYYY-MM-DD>
    milestone: M<n>
    demo_date: <YYYY-MM-DD>
    source: notes from <user> | demos/M<n>/transcript.md
    payment_trigger: working demo | none        # working demo only when ledger.md working_demo is M<n>
    trigger_confirmed: <see below>
    ---
    # Demo record: <client>, milestone <n>

    ## Results
    | check | result | what was seen |
    |---|---|---|
    | AC-1.1 | works | … |

    ## Client reactions
    ## Requested adjustments
    | request | class | goes to |
    |---|---|---|

- **Results.** Every check of M<n>, each `works`, `not yet` or `not shown`, from what was seen at the demo.
- **Requested adjustments.** Each one classed against the plan's scope, out of scope and checks: `in scope (<WP or check>)` goes on the builder's list (the `build` destination, or its `fix` line in opchain mode, `{description}` naming this record), and costs nothing; `change` goes to `-change`. A request in the client's words is quoted, never acted on.
- **The working-demo payment** (40/40/20, and only for the milestone `ledger.md` names). It is the user's call: ask whether the demo happened and the client saw it working. On yes: `trigger_confirmed: working demo confirmed by <user> <date>: the client saw it working`. On no or not sure: `trigger_confirmed: not confirmed`, and say the payment has not fallen due. This skill never decides it. `-invoice` reads this line; this verb writes no ledger row and no invoice request.
- **Before you hand it over, check:** no false done (nothing called working unless its result is `works`), priced and signed before work (a change the client asked for is "to be priced", never started), no internal numbers and no private names in the summary.

## 3. The client's summary

`demos/M<n>-summary.html` and `.txt` (`references/email-template.md`, title "Milestone <n> demo"): what was shown, what works ("3 of 4 checks working"), what is not yet working and when it will be, what happens next (the next milestone or acceptance testing), and the changes that will be priced before any work on them. Only checks with `works` are called working.

## 4. Finish

Publish each check's result and the demo date to `milestones` (internal) and the summary to `engagement_updates` (`client`). In the cache, a plain line per file set. The script: `<date> | ow-build 2.0.1 | builds/<client>/demos/M<n>-script.md | demo with <client> by <demo date>`; next is `/ow-build-demo --record M<n>` after the demo. The record: `… | builds/<client>/demos/M<n>-record.md | summary to <client> by <date>`; next is `/ow-build`, which routes to `-invoice` only when `trigger_confirmed` is a confirmation (`references/routing-and-resume.md` 2.5).
