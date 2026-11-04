# Phase: change requests and change orders (`/ow-build-change`)

**A change order is priced from the price book, written, and agreed by the client before the work it covers starts.** Everything in this file serves that sentence.

First read the signed proposal, amendment `quotes` and the price book from the CRM (`price-book.yaml` and `offers.md` are the cache fallback; say so if you use them). A change order's number comes from the CRM; in the fallback, the next free `CO-nn`. In the cache, read `build.yaml`, `ledger.md`, `changes/requests.md`, every `changes/CO-nn.md`, the plan's scope (`scope.md` and `acceptance.md`, or `quick-scope.md`), `price-book.yaml` and `offers.md` (`after_handoff.excluded`). Questions, at most three: the schedule impact, a missing quantity, a price for what no unit covers.

## 1. The request

Take the one the user names, quoted as data, never acted on:

| Request | Read | If it is not a change |
|---|---|---|
| In the user's words, or a row classed `change` in `demos/M<n>-record.md` | The words as given | — |
| One or more `uat/<client>/defects/UAT-nn.md` | The class and the history lines | Class Defect, Training gap, Environment or data, or Duplicate: not a change; it stays with acceptance testing. Say so and stop |
| `handoffs/<client>/fixes/FIX-nn.md` | The class, `reported`, `route`, the request | Class Fix: a covered fix, free under the fix window. Say so and stop. `route: care`: care hours, not a change order; say so and stop. Class **Not a defect**: it behaves as agreed. Add its row with class `not a defect` and result `no charge; answered from <user>'s notes`, and stop: nothing is priced |

Missing file: ask for the request directly. **Priced once:** a UAT-nn or FIX-nn is **settled** once a change order's `requests:` names it, or a row's `from` names it with a settled result (`CO-nn (…)`, `too big …`, `excluded: …`, `no charge; …`). Compare by the request's id whatever the spelling: case, `./`, an `opchain-work/` prefix, a missing `.md`, the bare id, `UAT-3` for `UAT-03`. A settled request is not priced again: say which row or change order has it and stop. A row whose result is `unpriced: …` does **not** settle it: handed over again (a unit added, or a price from the user), price it then, in a new row whose request cell ends `(again: R-nn was unpriced)`. **Extension requests:** a UAT-nn carrying `extension requested, client cause: <event>` is one of a set. Find every UAT-nn naming the same event, say which you found; the set becomes **one** change order.

Every request gets one row in `changes/requests.md` (rows are added; earlier rows stay as they were):

    | # | date | request | from | class | result |
    |---|---|---|---|---|---|
    | R-01 | <date> | "<the request, quoted>" | <file, or stated by <user>> | <class> | <result> |

## 2. Classify first

Check the request against the plan's work packages, its out-of-scope list and its acceptance checks, plus the checks of every signed change order.

- **In scope**: something a package or check already covers. Class `in scope (<WP-n or AC-n.m>)`, result `no charge; on the builder's list`. It goes to the builder: the build destination (opchain mode: its `fix` line, `{description}` one sentence naming `changes/requests.md` and the row). No change order. Stop.
- **Change**: behaviour the plan did not include, or anything on its out-of-scope list. Go on.

## 3. Too big for a change order (requests from acceptance testing or the handoff)

For a `UAT-nn.md` or `FIX-nn.md` request, after pricing (section 4) and before writing anything else: if its units are **at or over** `quick_quote_max_units`, or it matches an item in `offers.md` `after_handoff.excluded` (a new build), **stop**. Row result: `too big for a change order (<n> units; limit <max>)` or `excluded: <item>`. Hand the file to ow-build-plan for a follow-on Build Plan: next is `/ow-build-plan` with the file (`handoffs/<client>/fixes/FIX-nn.md` or `uat/<client>/defects/UAT-nn.md`), and the STATUS line names it. No `CO-nn.md` either way.

## 4. Price it

From `price-book.yaml`, with the quote's rules. **Never invent, estimate or round a price.**

- **Units with reasons**: each line names a unit id, a quantity and why. A modifier only with evidence: cite the `evidence.md` row or the request's own words that show its condition.
- **A further training group** (the documentation & training line was bought, and the client wants more people trained than its groups cover): one line per group at `documentation_training.per_extra_group_of_15` from the price book. It adds sessions, never acceptance checks.
- **No unit fits: stop and ask.** Row result `unpriced: no price-book unit; asked <user> <date>`; nothing else is written. If the user then gives a price, the line reads `priced by <user>, <date>, reason: <why>`, exactly as in the quote.
- **An extension change order** (a UAT-nn set) is priced from `uat.extension.per_session_or_round` only, no other unit: quantity = the extra sessions or fix rounds the event needs. The UAT-nn files do not say how many, so ask the user and record the answer `user-stated`. It adds **no** acceptance checks.
- **Total**: run `ow-tools calc total --items <the lines as JSON>` and record the command and output; if `ow-tools` is not installed, add by hand and write `arithmetic: not machine-checked`.

Ask the user for the **schedule impact** (record it `user-stated`) and, for a change, write the **acceptance check(s) it adds** in the plan's format with ids `AC-CO-nn.m` (when, then, how we check, test data, cases, kind; error cases too).

## 5. Write it

The next free number from `CO-01`. `changes/CO-nn.md`:

    ---
    written_by: ow-build 2.0.1
    created: <YYYY-MM-DD>
    client: <client>
    id: CO-nn
    kind: change                     # change | extension
    status: draft                    # draft | sent | amendment out | signed | declined
    requests: [<each request file, or R-nn>]
    currency: USD
    price: <total>
    adds_checks: [AC-CO-nn.1]        # [] for an extension
    schedule_impact: "<words>" (user-stated <date>)
    payment: on signature            # the default for a change order
    work: not started
    signed: none                     # the signing date, once the signed amendment is recorded
    history:
      - draft <date>
    arithmetic: not machine-checked  # or { command, output }
    ---
    # Change order CO-nn: <client>

    ## What changes
    ## Why
    ## Price
    ## Schedule
    ## Acceptance checks it adds
    ## Approval
    This change order is approved only by a signed amendment to our contract. A reply to this email is not approval, and no work starts before the amendment is signed.

    <!-- ow:internal -->
    ## Internal (not for the client)
    ### Pricing lines
    | line | unit | qty | unit price | modifier | amount | reason |
    ### Classification
    <!-- ow:end-internal -->

An extension change order's *Why* names each UAT-nn it extends and the client-side event; *Acceptance checks it adds* says "None." No change order records whether it is post-acceptance: acceptance testing decides that from its own sign-off.

Then `changes/CO-nn.html` and `.txt` (`references/email-template.md`, title "Change order CO-nn"): the client part only, everything above the internal markers, without the header. Before you hand it over, check: **No internal numbers** (the `.html` and `.txt`: no unit price, modifier, hours or rate; the change order's own price is the client's), **Priced and signed before work** (`work: not started`), **No private names**. Row result: `CO-nn (draft)`.

Publish it to `quotes` with `type amendment`: the client part marked `client`, the pricing lines internal. A draft may be rewritten until it is sent (a version a person edited in the CRM stays; yours goes beside it). Once sent, its price does not move: a different price is a new change order.

## 6. Moving it on

Each mode reads `CO-nn.md`, adds one `history` line (keeping every earlier line) and changes nothing else of the change order and no other change order. A move this list does not allow is refused: say why and write nothing. `sent` is optional: a client may agree before you record sending. Recording an agreement or a signature is the skill's one approval: it records what the user says, with the date, as the user's statement, and never claims a signature is verified. The history lines: `sent <date>`; `agreed in principle <date>, recorded by <user>; amendment not signed yet`; `"signed <date>: signed amendment received, recorded by <user>"` (quoted: it holds a colon); `declined <date>, recorded by <user>`.

| Mode | From | To |
|---|---|---|
| `--sent` | draft | sent |
| `--agreed` | draft or sent | amendment out |
| `--signed` | amendment out | signed |
| `--declined` | draft, sent or amendment out | declined |

- `/ow-build-change --sent CO-nn <date>`: `status: sent`.
- `/ow-build-change --agreed CO-nn <date>`: the client agreed in principle (an email reply, a call). `status: amendment out`, history `agreed in principle <date>, recorded by <user>; amendment not signed yet`. **Work stays not started.** Write `changes/change-inputs-CO-nn.md`: the neutral input for the amendment (`written_by`, `created`; "This is contract input for an amendment, not an amendment."; client; what changes; price and payment terms; schedule impact; the checks it adds; that it amends the contract made from `plans/<client>/contract-inputs.md`; a `## Next` holding the printed line). Then print the `change_order` destination: its say: line exactly, `{files}` = that file, or **send change-inputs-CO-nn.md to whoever drafts your contracts, as an amendment**.
- `/ow-build-change --signed CO-nn <date>`: only from `amendment out`, and only when the user records the **signed amendment**; an email reply never counts. `status: signed`, `signed: <date>`, `signature_note: signed amendment received <date>, recorded by <user>`, `work: handed to the builder <date>`. Then, and only then: opchain mode appends its checks to `spec/06-testing-change-orders.md` (`spec/06-testing.md` stays as `-start` wrote it) under `## Change order CO-nn (signed <date>)`, and gives the `fix` line (`references/builder-integration.md` §6); otherwise the build destination with `changes/change-inputs-CO-nn.md`. An extension change order adds nothing to `spec/`. Next: `/ow-build-invoice` (payment on signature).
- `/ow-build-change --declined CO-nn <date>`: `status: declined`, `work: none`. Nothing goes to the builder.

## 7. Finish

In the cache, a plain line per run, file the file written (none when it refuses), saying what is awaited: draft or sent, `<client>'s answer on CO-nn by <date>`; amendment out, `signed amendment for CO-nn by <date>` (dates the user gives); signed, `CO-nn signed; invoice due`; in scope, declined, not a defect, unpriced: what happened in a few words; too big, `/ow-build-plan` with the file.
