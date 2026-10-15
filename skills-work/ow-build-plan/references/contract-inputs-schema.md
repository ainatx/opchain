# `contract-inputs.md` (schema 1)

Written only by `/ow-build-plan-quote --accepted <date>`. It holds what any contract needs and nothing tool-specific, for whoever drafts the contract; the later stages (acceptance testing, the handoff) read it too. **It is contract input, not a contract**, and it says so.

The header carries the machine-readable keys; the body says the same in plain words. Copy values from `quote.md` and the user's files; never compute a new price here.

    ---
    ow_artefact: ow-build-plan/contract-inputs
    schema: 1
    written_by: ow-build-plan 1.0.0 (protocol 1)
    workstream: <slug>
    subject: plans/<client>/quote.md
    created: <YYYY-MM-DD>
    clock: <source>
    origin: skill
    client: <client>
    accepted: <YYYY-MM-DD>
    acceptance_note: client accepted <date>, recorded by <user name>; not verified by this skill
    parties: { client: <as the user supplies it>, provider: <as the user supplies it> }
    quote: plans/<client>/quote.md
    scope: plans/<client>/scope.md                 # or quick-scope.md
    acceptance_checks: plans/<client>/acceptance.md   # or quick-scope.md
    currency: USD
    fixed_price: <amount>
    schedule: 40/40/20 | 50/50
    payments: [<amount>, …]
    payment_terms_days: <n>
    valid_until: <YYYY-MM-DD>
    credit_deadline: <YYYY-MM-DD>                  # build-plan mode; else none
    build_plan_fee: <amount>                       # build-plan mode; else none
    fix_window_days: <n>
    fix_window_wording: <n> days of fixes
    uat: { size: M, tester_roles: [<role>, …], test_mix: <text>, sessions: <n>, fix_rounds: <n>, fix_business_days: <n>, price: <amount> }
    documentation_sku: bought | declined
    documentation_price: <amount, "quoted separately", or none>
    acceptance_definition: <the quote's acceptance sentence>
    delivery_definition: <the quote's delivery sentence, or none above size_threshold>
    contract_clauses: not set                      # or the block below, copied unchanged from offers.md
    vendor_subscriptions: [<names>]
    ---

`contract_clauses`, when `offers.md` has the block (the user adds it once their contract step has drafted the standard clauses):

    contract_clauses:
      deemed_acceptance: { ref: <clause ref>, business_days: <n>, calendar: <name>, wording: "<text>" }
      delivery_backstop: { ref: <clause ref>, business_days: <n>, calendar: <name>, wording: "<text>" }

Copy it unchanged; never draft, shorten or reword a clause. With no block, write `contract_clauses: not set` and, in the body, "Contract clauses: not set."

## Body

    # Contract inputs: <client>

    This is contract input, not a contract. It records what was quoted and accepted, for whoever drafts the contract.
    Client accepted <date>, recorded by <user name>; not verified by this skill. This is a working note made by an AI assistant at your instruction. It is not a signature or an official record.

    ## Parties
    ## What is agreed          (the scope and acceptance checks, by file and id; not copied)
    ## Price and payment       (fixed price, milestones each ending in a working demo, schedule, due days)
    ## Change rule             (the quote's sentence, unchanged)
    ## Dates                   (valid until; Build Plan credit deadline)
    ## Ownership               (offers.md `ownership` text, or the plan's Ownership section)
    ## Vendor subscriptions    (billed directly to the client, without a markup)
    ## After delivery          (<n> days of fixes, and what that covers)
    ## User acceptance testing (size, tester roles by role, test mix, sessions, fix rounds and days)
    ## Documentation & training (bought or declined, as the user recorded the client's choice)
    ## Acceptance and delivery (the two definitions, word for word)
    ## Contract clauses        (the block, or "not set")
    ## Next
    (the accepted NEXT block, filled in: the handoffs.yaml contract say: line exactly, or the public default; then the signing line)

Rules: no unit price, modifier or internal rate (they stay in `quote.md`'s internal appendix); people by role, never by name, apart from the parties; dates written out in the body.
