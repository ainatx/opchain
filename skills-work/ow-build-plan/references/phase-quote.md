# Phase: quote (`/ow-build-plan-quote`, `--whole-project`, `--quick`, `--quick --onboarding`, `--accepted <date>`, `--signed <date>`)

Keep to `references/ow-protocol.md`. Every price comes from the CRM's price book (the cache's `price-book.yaml` only when the CRM is unreachable: `references/price-book-schema.md`) or from the user, recorded as theirs. **This skill never estimates a price.**

## 1. Read first, and which mode

Read the latest saved versions first: the scope and acceptance checks (document `scope`, `acceptance_criteria`), the recap and intake (document `recap`, `briefs`), any proposal already on this deal (`quotes`) and the terms and client profile. An edit a person made to the scope flows into this quote. Unreachable: use the cache files below, and say so in the output.

| Call | Works from | Publishes to | Cache |
|---|---|---|---|
| `/ow-build-plan-quote` | the scope, acceptance checks, risks and evidence (`plan.yaml`, `scope.md`, `acceptance.md`, `risks.md`, `evidence.md`) | `quotes` | `quote.md`, `quote-items.json` |
| `/ow-build-plan-quote --whole-project` | those when they exist; else `intake/<client>/intake-record.md` and a stated scope (§3a) | `quotes` | `quote.md`, `quote-items.json` |
| `/ow-build-plan-quote --quick` | `intake/<client>/intake-record.md` (or a written request) | `quotes` | `quick-scope.md`, `quote.md`, `quote-items.json` |
| `/ow-build-plan-quote --quick --onboarding` | the same, with a recap whose `path_kind` is `care-takeover` (§3.2) | `quotes` | `quick-scope.md`, `quote.md`, `quote-items.json` |
| `/ow-build-plan-quote --accepted <date>` | the proposal | `contracts` (`record_type` `sow`) | `contract-inputs.md` |
| `/ow-build-plan-quote --signed <date>` | the proposal and the acceptance | document `build_request` | `build-request.md` |

A missing input: say which, and offer to run the step that writes it, or to go ahead on stated assumptions (§3a is built for that).

**Running it again.** Before writing, look at what exists. Not yet sent: say what is there and its date, and go ahead unless the user objects. **Sent** (the proposal's status, or exported: `export/quote.*` or an export line in `STATUS.md`, or the user says it went out) **or accepted: the quote keeps its price and its file is never rewritten.**

- A changed price after sending is a new quote beside the sent one: `quote-v2.md` (then `-v3`), with its own `issued` and `valid_until`, and a new version of the `quotes` record. Say so, and say the earlier one stands until the client has the new one.
- After acceptance, a change is a change order (`quotes`, `type amendment`, priced in writing and agreed by the client before the work starts) or a new quote. Never a silent rewrite.
- A person's edit to the proposal in the CRM is never overwritten: write your version beside it and say so.

## 2. Price the work

1. **Lines.** For each work package, list the price-book units it consists of, each with a quantity and a one-line reason. A unit id that is not in the price book is not a unit.
2. **What the book does not price stops only its own line.** Price everything the book prices. Then list, once and in one `AskUserQuestion` call, each package no unit fits and each missing price-book key, and ask the user for those values. Record each on its line exactly as `priced by <user name>, <date>, reason: <their words>`. Never suggest a number. No answer yet: the quote stays a draft with those lines open; it is not exported.
3. **Modifiers** apply only through their written `when`, citing the `evidence.md` row that shows the condition: `data-messy: evidence.md E-07 "we fix the codes by hand every Monday"`. The quoted words must be in that row. No row, no modifier; tell the user which modifier was considered and why it does not apply. In the pricing lines, a `multiply` modifier is written on the line it changes (`data-messy x1.25`); an `add_unit` modifier adds its own line, with the added unit and `<modifier id> adds` in the modifier column (`data-sensitive adds`).
4. **The build's size** is the largest `size` among the product units on the quote; with none, ask the user (`build_size_source: user-stated`).
5. **User acceptance testing · <size>** (required). Tester roles come from the scope's `## UAT approach`, by role name. Price = size price + `per_extra_role` × (roles − included roles, when more).
6. **Documentation & training · <size>** (optional, recommended). People to train: from the files, else ask. Up to 15: the size price; each further group of up to 15: `per_extra_group_of_15`; above `quote_separately_above`: "quoted separately", no price.
7. **Arithmetic.** Write `plans/<client>/quote-items.json` (the build lines and the testing line, as `[{ "label", "quantity", "unit_price" } | { "label", "amount" }]`). Run `ow-tools calc total --items plans/<client>/quote-items.json --currency <currency>` and `ow-tools calc split --total <fixed price> --schedule <40/40/20 or 50/50>`, and record each command and its raw output in the internal appendix. If ow-tools is not installed, say so once, add it up by hand and write `arithmetic not machine-checked` in the header and the appendix.
8. **Fixed price** = build lines + the testing line. Documentation & training is not in it: it is its own line.
9. **Payment schedule.** Fixed price at or above `size_threshold`: 40% to book · 40% at the working demo · 20% at acceptance. Below it: 50% to book · 50% at delivery. Shares that do not divide evenly put the remainder on the last payment. Invoices due in `payment_terms_days`. The schedule covers the fixed price. Documentation & training is outside it: when taken, it is **invoiced when the documents are delivered**, and the payment terms say so.
10. **Dates.** `issued` from `date`; `valid_until` = issued + `quote_validity_days`. Build Plan mode only: `credit_deadline` = `plan.yaml` `plan_delivery` + `build_plan_credit_days`, and the credit line names the fee from `plan.yaml`. A plan on signed work (`fee: none`) has no credit line and no `credit_deadline`. Through `ow-tools calc date`, recorded; if it is not installed, marked not machine-checked.
11. **Fix window.** `fix_window_days` from the CRM's terms (cache: `offers.md` → `after_handoff`); rendered "<N> days of fixes". No value: ask the user and record `fix_window_source: user-stated`.
12. **Milestones**, each ending in a **working demo**, by work package; plus a written update each week.
13. **Vendor subscriptions** the build needs, by name, from the map's systems or the stated scope; state them as an assumption the user can correct. Billed directly to the client, without a markup.

## 3. Quick quote (`--quick`)

For one small, defined job (the recap's `path_kind: defined-work`, or the user says so). A feasibility test (`path_kind: feasibility`) also runs as `--quick`, with the differences in §3.1. It skips the offer, the collection and the map.

1. Read the intake record. Draft the work packages and their units (§2.1).
2. **Count the units** (the sum of quantities on the build lines). Above `quick_quote_max_units`: write **no** quote and no scope. Say the job needs <n> units and the limit is <max>, recommend a Build Plan or a whole-project quote (`/ow-build-plan-quote --whole-project`), and note it (§8). If the user says to quote it anyway at the book's prices, that is a whole-project quote with `fee: none`.
3. Ask which roles will test, unless a file says; never default the number (the testing line prices it).
4. Write `quick-scope.md` (`written_by`, `created`, `subject:` the intake record):

        # Scope: <client>
        ## In scope
        ### WP-1 <name>
        - what changes: …
        ## Out of scope
        - … (at least one line)
        ## Acceptance checks
        ### AC-1.1
        (the six keys of references/acceptance-check-format.md)
        ## UAT approach
        - tester roles: <role names>
        - test mix: <what each role checks>

   Before you go on, check: every in-scope package has at least one check, each with test data and a whole-number case count; at least one check is `kind: error`; the out-of-scope list has a line. Fix what fails.
5. Price it (§2) and write `quote.md` with `mode: quick`. No Build Plan fee and no credit line.

### 3.1 A feasibility test (`path_kind: feasibility`)

A feasibility quote carries **just the test**: its price, what is tested, what the client gets (a findings note and a go or no-go), the payment terms and the validity. Nothing about a build.

- **Price** only from the price book's feasibility unit: the unit marked `feasibility: true` (`feasibility-test` in the example). With no such unit, the line is unpriced and §2.2 applies.
- **No** user acceptance testing line, **no** fix window, **no** documentation & training line, no milestones, no vendor subscriptions, no acceptance or delivery sentence, no Build Plan credit. Skip §2 steps 4–6 and 11–13, and step 3 of §3 (there are no testers to ask about).
- `quick-scope.md` as in §3, without `## UAT approach`. Its acceptance checks describe how the client knows the test is done (the findings note, and the cases it covers).
- `quote.md`: the header keys of §4 without `build_size`, `build_size_source`, `uat`, `documentation_training`, `fix_window_days` and `vendor_subscriptions`, and with `mode: feasibility`; `fixed_price` = the test lines. The client part:

        # Quote: <client>

        Issued <date> · valid until <date>

        ## What is tested
        <the question, on which of the client's examples, and for how long>

        ## What you get
        A findings note: what worked, what did not, on which examples. And a go or no-go: whether a build is worth doing, and why.

        ## Price
        <amount> for the test.

        ## Payment schedule
        (the table of §2.9; invoices are due within <payment_terms_days> days)

        ## Valid until
        This quote is valid until <date>.

  then the internal appendix inside the markers: pricing lines and arithmetic.
- `--accepted` writes the feasibility form of `contract-inputs.md` (`references/contract-inputs-schema.md`) and asks nothing about documentation & training. `--signed` writes **no** `build-request.md` and names no build step: see §6.

### 3.2 A care takeover's onboarding review (`--quick --onboarding`)

`--onboarding` is only valid with `--quick`; neither flag alone starts an onboarding quote. A `care-takeover` recap routes here (`routing-and-resume.md` §2.1). It follows §3.1's pattern: **just the review**.

- **Size and price** only from the price book's `care_onboarding` block (`references/price-book-schema.md`): count the distinct systems and integrations the intake record names (state the count; ask only when the intake leaves it open), take the size whose `size_by_systems` rule holds them, and price one line at that size's fee. Record the count, the size and the rule as written. When the rule does not settle the size, ask the user to settle it; never infer a price. With no `care_onboarding` block, or a size with no fee, that one line stops: ask the user for the fee, recorded as theirs. The example's fees are invented placeholders, never a client's price.
- **No** user acceptance testing line, fix window, documentation & training line, milestones, vendor subscriptions, acceptance or delivery sentence, Build Plan credit or build hand-off. No care tier subscription price is charged by this quote. The quote says it buys a review of a running system, not a build and not care.
- `quick-scope.md` holds the review's eight parts , each a `### ` heading under `## In scope`: systems and integrations (each system, what it does, who owns the account by role, how it is deployed); the least access care would need; how it runs (alerts, run logs, backups and restore, scheduled jobs: present, missing or unknown); a health baseline; the takeover check (repository, setup, tests, deploy, rollback: found with its path, or missing); risks and unknowns with their evidence; one recommended care tier with the reasons, a recommendation and no commitment; fix-first items, each routed to care hours once care starts or to a separate quote. Then `## Out of scope` (at least one line: nothing is fixed or built, and no care starts, under this review) and `## Acceptance checks` (`### AC-1.1`: the review delivered as a document with all eight parts). No `## UAT approach`; Acceptance coverage's `kind: error` rule is waived for this form, as for a feasibility scope.
- `quote.md`: §3.1's reduced header with `mode: onboarding`, `onboarding_size: S | M | L`, `systems: <count>` and `payment: on_signature | on_delivery` (from the block); `fixed_price` = the review line. The client part is §3.1's, with `## What is reviewed` (the systems and integrations counted) and `## What you get` (the review document with its eight parts, including the recommended tier and its reasons) in place of its two middle sections; `## Price and payment` says when the fee is invoiced, as `payment` says. `quote-items.json` holds the one line.
- `--accepted` writes the onboarding form of `contract-inputs.md` (`references/contract-inputs-schema.md`) and asks nothing about documentation & training. `--signed` writes **no** `build-request.md`: see §6. The signature starts no care plan; care starts only when ow-care's `-start --takeover` records the client's chosen tier and start date after the review.

## 3a. A whole-project quote (`--whole-project`)

One SOW-shaped quote the client signs for plan and build together, as an alternative to the offer. It runs from the latest scope in the CRM (or `plan.yaml`, `scope.md` and `evidence.md` in the cache) when there is one; **`plan.yaml` is optional**: with none, it runs straight from the intake record and a scope the user states, in one `AskUserQuestion` call. The packages then rest on what was said, so list every assumption the price depends on under `## Assumptions`, and name no modifier the evidence does not show (with no evidence register, a modifier the user states is recorded as `user-stated`).

1. **The Build Plan phase is the first line.** Tier as `-offer` §2 sets it. Fee = `build_plan_fees.<tier>` and weeks = `build_plan_weeks.<tier>`, or `fee: none` when the work is already signed or the user says the plan is not charged. A missing key stops that line only (§2.2).
2. **The build:** the work packages priced by §2 steps 1 to 6, 12 and 13: testing line, optional documentation & training line, milestones, vendor subscriptions, fix window.
3. **Fixed price** = the Build Plan phase + build lines + the testing line. Documentation & training stays its own line. **The payment split** is §2 step 9 over that fixed price.
4. **No Build Plan credit line and no `credit_deadline`:** the plan is inside this price, so nothing is credited. Write "Build Plan phase", never "fee", in the client's part.
5. **Milestones:** the first is the Build Plan's delivery; each build milestone ends in a working demo.
6. **What the plan may change.** The client part says: "If the Build Plan shows the work differs from what is written here, the difference is written down and priced before that work starts." A difference found later is a change order (`quotes`, `type amendment`), never an edit to this quote.

`quote.md` is §4 with `mode: whole-project` and `build_plan: { tier: <tier>, fee: <amount or none>, weeks: <n> }`, without `plan_delivered`, `build_plan_fee` and `credit_deadline`. In the client part, these come right after the issue line, before `## What I will deliver`:

    ## Phase 1: Build Plan
    <weeks> week(s): how the work runs today, what should change, the scope, what is out of scope, acceptance checks you can run yourself, and risks: <amount> (with `fee: none`: included).

And before `## Valid until`:

    ## Assumptions
    - <what must be true for this price>   (at least one line when there is no plan yet)

The internal appendix adds a first pricing line: `| P1 | Build Plan | build_plan_fees.<tier> | 1 | <fee> | none | <fee> | <weeks> weeks |` (with `fee: none`: no line). `quote-items.json` holds it too. `--accepted` and `--signed` work as for a plan (§5, §6): `contract-inputs.md` and `build-request.md`.

## 4. `quote.md`

The cache file, and the fields of the `quotes` record: `written_by: ow-build-plan 2.0.1`, `created`, then these keys:

    client: <client>
    mode: build-plan | whole-project | quick | feasibility | onboarding
    currency: USD
    issued: <YYYY-MM-DD>
    valid_until: <YYYY-MM-DD>
    plan_delivered: <YYYY-MM-DD>        # build-plan mode
    build_plan_fee: <amount>            # build-plan mode with a fee; left out with `fee: none`
    credit_deadline: <YYYY-MM-DD>       # build-plan mode with a fee; left out with `fee: none`
    build_size: S | M | L
    build_size_source: price-book | user-stated
    build_total: <amount>
    fixed_price: <amount>
    schedule: 40/40/20 | 50/50
    payments: [<amount>, …]
    payment_terms_days: <n>
    fix_window_days: <n>
    uat: { size: M, tester_roles: 3, included_roles: 2, sessions: 3, fix_rounds: 2, fix_business_days: 5, price: <amount> }
    documentation_training: { size: M, people: 12, price: <amount or "quoted separately">, optional: true }
    vendor_subscriptions: [<names>]
    arithmetic: ow-tools calc total | not machine-checked
    dates: ow-tools calc date | not machine-checked

A quick quote, a feasibility quote and a quote on signed work (`plan.yaml` `fee: none`) have no Build Plan credit: leave `build_plan_fee` and `credit_deadline` out of the header altogether (not `none`; only `contract-inputs.md` spells the absence as `none`).

Then the client's part. Amounts are written with the currency and two decimals; dates are written out:

    # Quote: <client>

    Issued <date> · valid until <date>

    ## What I will deliver
    | # | Work package | Includes |
    |---|---|---|
    | 1 | <package> | <the unit's includes> |

    The Build Plan sets out what is out of scope, the acceptance checks and the risks.   (quick: "The scope sets out …")

    ## User acceptance testing · <size>
    <roles> tester roles (<role names>), <sessions> sessions including the final confirmation run, up to <fix_rounds> fix rounds within <fix_business_days> business days each: <amount>.

    ## Documentation & training · <size> (optional)
    Up to 15 people trained …: <amount>. You can decline this line.

    ## Fixed price
    <amount> for the work packages and user acceptance testing. If I underestimate the agreed scope, that's on me. Additional work is written down and priced before it starts.

    ## Milestones
    1. <packages>: ends in a working demo.
    You get a written update each week.

    ## Payment schedule
    | When | Share | Amount |
    |---|---|---|
    | To book | 40% | <amount> |
    Invoices are due within <payment_terms_days> days. Documentation & training, if you take it, is invoiced when the documents are delivered.

    ## Vendor subscriptions
    Billed directly to you by each vendor, without a markup: <names>, or "None needed".

    ## Build Plan credit                       (build-plan mode with a fee only; never with `fee: none`)
    The Build Plan fee of <amount> is credited against this build if signed by <credit_deadline>.

    ## After delivery
    <N> days of fixes: for <N> days after delivery, anything in the agreed scope that does not work as its acceptance checks say is fixed at no charge.

    ## Acceptance
    The build is accepted when you sign off user acceptance testing with every acceptance check passing, or as the contract's deemed-acceptance clause provides.
    Delivery: the day the Handoff notes are delivered, or as the contract's delivery-backstop clause provides.   (only below size_threshold)

    ## Valid until
    This quote is valid until <date>.

Then the **internal appendix**, wholly between the two markers, each on a line of its own, as the last thing in the file. The ow-tools export removes everything between them; anything internal outside them must be moved in. Tables inside the markers use spaced delimiters (`| --- | --- |`) so no internal line repeats a client line.

    <!-- ow:internal -->
    ## Internal appendix (not for the client)

    ### Pricing lines
    | line | package | unit | qty | unit price | modifier | amount | reason |
    | --- | --- | --- | --- | --- | --- | --- | --- |
    | L1 | WP-1 | integration | 1 | 4000.00 | data-messy x1.25 | 5000.00 | email orders into the order system |
    | L3 | WP-3 | none | 1 | none | none | 1800.00 | priced by Robin, 2026-10-26, reason: label printer driver |
    | T1 | UAT M | uat.M | 1 | 2000.00 | none | 2000.00 | 2 roles included |
    | T2 | UAT extra role | uat.per_extra_role | 1 | 250.00 | none | 250.00 | 3 tester roles |

    ### Modifiers
    | modifier | condition | lines | evidence |
    | --- | --- | --- | --- |
    | data-messy | data_condition is messy | L1 | evidence.md E-07 "we fix the codes by hand every Monday" |

    ### Rates kept internal
    - UAT extension: <amount> per extra session or fix round (client-caused overruns only)

    ### Arithmetic
    - command: ow-tools calc total --items plans/<client>/quote-items.json --currency USD
    - output: <raw JSON>
    (or: arithmetic not machine-checked)
    <!-- ow:end-internal -->

Before you hand it over, check: units or a recorded manual price on every package; modifiers cite evidence; dates and terms match the price book; the testing line matches `uat` for the build's size; the fix window matches `fix_window_days`; the internal appendix sits inside the markers. Fix what fails.

## 5. Record the acceptance (`--accepted <date>`)

Running it is the approval: the user is telling you the client accepted, with the date. With no date in what they said, ask once.

1. Read the proposal. An acceptance date after `valid_until`: say the quote expired on that date, and record it only if the user says the client accepted this quote as it stands. If the price has to change, that is `quote-v2.md` (section 1), not this record.
2. Ask, in one `AskUserQuestion` call and only for what no file answers: did the client take Documentation & training? (`bought` / `declined`; never for a feasibility or onboarding quote), and the parties' names as the user wants them in the contract. Either way, copy the people the line was quoted for (`quote.md` `documentation_training.people`) into `contract-inputs.md` as the top-level key `documentation_people`.
3. Record it as the user's statement, with the date: `client accepted <date>, stated by <user name>`.
4. Write `contract-inputs.md` as `references/contract-inputs-schema.md` says, ending with its `## What comes next` section. Publish it to `contracts` with `record_type` `sow`, as inputs for the SOW; this skill drafts no clause.
5. Say what comes next: the user's `handoffs.yaml` `contract` say: line with `{files}` = `plans/<client>/contract-inputs.md`, exactly, or, with none, `send contract-inputs.md to whoever drafts your contracts, or fill your own SOW template from it`. Never explain which one was used, and never check or name what the destination is.

## 6. Record the signing (`--signed <date>`)

1. **No recorded acceptance: refuse.** A signing needs the agreed price on record. Say "The acceptance is not recorded yet; run `/ow-build-plan-quote --accepted <date>` first." Write nothing.
2. Record it as the user's statement, with the date: `client signed <date>, stated by <user name>`.
   **An onboarding quote** (`mode: onboarding`): no build to hand over. Next is the review: `/ow-care-onboard plans/<client>/`. Steps 3 and 4 do not apply; the signature starts no care plan.

   **A feasibility quote** (`mode: feasibility`): no build to hand over. Next is the findings note; on a go, `/ow-build-plan-offer plans/<client>/`. Steps 3 and 4 do not apply.
3. Write `build-request.md` **from the scope, not the quote**: no price, fee or rate anywhere in it. A whole-project quote signed before the plan exists takes the packages and assumptions from the quote without their amounts, and says the Build Plan phase settles the detailed scope and acceptance checks first. Header:

        written_by: ow-build-plan 2.0.1
        created: <YYYY-MM-DD>
        client: <client>
        signed: <YYYY-MM-DD>
        signing_note: client signed <date>, stated by <user name>

Then:

        # Build request: <client>
        Signed <date written out>. This comes from the scope (the Build Plan, or the quick scope), not the quote.
        ## What to build            (the work packages, in plain words)
        ## How the client will check it   (acceptance.md or quick-scope.md, by reference, with the AC ids)
        ## Systems and data
        ## Out of scope
        ## Client dependencies
        ## Milestones               (each ends in a working demo)
        ## User acceptance testing  (size, tester roles, sessions, fix rounds and days; no price)
        ## What comes next
        (§7)

4. Say what comes next (§7). A whole-project quote with no `build-plan.md` yet: the Build Plan phase first, `/ow-build-plan-start`.

## 7. What comes next, in files

The last section of `contract-inputs.md` holds §5 step 5's line exactly, then `When it is signed: /ow-build-plan-quote --signed <date>`. The last section of `build-request.md` names `/ow-build-start plans/<client>/`, then the user's `handoffs.yaml` `build` say: line with `{files}` = `plans/<client>/build-request.md`, exactly, or, with none, `give build-request.md to whoever builds it`. A `say:` line is the only text in them that comes from the user's file.

## 8. In the cache

When working from the cache a plain `STATUS.md` line is enough:

- `-quote` in any mode: `<date> | ow-build-plan 2.0.1 | plans/<client>/quote.md | client's answer by <valid_until>; Build Plan credit by <credit_deadline>` (quick, whole-project, or a plan with `fee: none`: the first part only).
- `--quick` over the limit: `… | intake/<client>/intake-record.md | Build Plan recommended`.
- `--accepted`: `… | plans/<client>/contract-inputs.md | signing for the Build Plan credit by <credit_deadline>` (with no credit: `signing`).
- `--signed`: `… | plans/<client>/build-request.md | nothing awaited`; a feasibility or onboarding quote names `contract-inputs.md`.
- `--signed` refused: no line.
