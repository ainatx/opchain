# ow-build — design

**Date:** 2026-10-08 · **Status:** APPROVED 2026-10-08. **Amendment 2026-10-09 (builder integration, §12, decisions 8–11) APPROVED 2026-10-14 with the fixes in §12.8.** **Amendments applied 2026-10-14** (decision 12): ow-uat B1 (`-accept` becomes `-ready`, §3, §8), B2 (final payment triggers, §7), B3 and ow-handoff A2 without its post-acceptance mark (`-change`, §6.1). Nothing is built. **Amended 2026-10-15: quick-quote scope file is quick-scope.md (owner decision).**
**Release:** third skill in the ow- family that ships together as v2.1.0. Starts at 1.0.0.
**Family rules that apply:** no `ow-review` (labelled same-session self-checks); code only in the `ow-tools` add-on; no public ow- skill names a private skill, and handoffs leaving the family go through the workspace's `handoffs.yaml` (ow-start design, decisions 22–23).
**Upstream:** `ow-build-plan` (plan, `acceptance.md`, `quote.md`, `price-book.yaml`); for change requests and the final payment triggers, `ow-uat` (`defects/UAT-nn.md`, `signoff.md`, `backstop.md`, `uat.yaml`) and `ow-handoff` (`fixes/FIX-nn.md`, `dates.yaml`). **Downstream:** `ow-uat` through `ready-for-uat.md` (its sign-off is final acceptance), then `ow-handoff` (stage 04); plus the user's contract and invoicing destinations.

`ow-build` does **not** write code itself. Since the 2026-10-09 amendment it **drives the builder in the same session** (§12): with an opchain-compatible builder (Deftwright's: `oc-app-architect`, named only in the workspace's `handoffs.yaml`), it hands over the signed scope in the builder's own input format, runs the builder's planning and sprint steps per milestone, and reads the builder's outputs back. `ow-build` runs the client side of stage 03: what the client sees each week, at each demo, when they ask for more, and when money is due.

## 1. What the site promises (staging.deftwright.com, read 2026-10-06)

| Source | Promise | Where the skill meets it |
|---|---|---|
| / | "Build it together. See progress in working demos. Changes get priced before they start." | §5 demo, §6 change orders |
| /how-we-work | "A written update each week and a working demo at each milestone. You can respond while there's still time to adjust." | §4 weekly update, §5 demo |
| /how-we-work | "Fixed price. If I underestimate the agreed scope, that's on me. Additional work is written down and priced before it starts." | §6 change orders; §4.3 margin view stays internal |
| /how-we-work | Larger projects 40% to book · 40% working demo · 20% acceptance; smaller half to book, half at delivery; invoices due in 14 days; vendor subscriptions billed directly | §7 payments |
| /how-we-work | "how we'll both know the work is done" (acceptance checks agreed in the plan) | §8 ready for UAT; final acceptance is the ow-uat sign-off |

## 2. Owner decisions

| # | Date | Question | Answer |
|---|---|---|---|
| 1 | 2026-10-08 | Name | `ow-build`, matching stage 03 |
| 2 | 2026-10-08 | What it owns | Weekly written update · milestone demo · change orders · payments and final acceptance (final acceptance moved to `ow-uat` by decision 12) |
| 3 | 2026-10-08 | Where "what happened" comes from | All four: git history, build checkpoints, time tracking (internal only), the user's notes |
| 4 | 2026-10-08 | How the client receives it | **Branded HTML email** that also opens in a browser |
| 5 | 2026-10-08 | Hosting | **Local file only.** No hosted "view in browser" page; the user pastes or attaches the HTML |
| 6 | 2026-10-08 | Invoicing tool | Not decided. `handoffs.yaml` `invoice` is left empty, so NEXT prints the public default |
| 7 | 2026-10-08 | Change-order approval | **Always a signed amendment** through the contract step; an email reply is not approval |
| 8 | 2026-10-09, approved 2026-10-14 | How `ow-build` and the builder work together | **`ow-build` drives the builder in-session** (Claude Code): it writes the builder's input files, runs its planning step, runs its sprints milestone by milestone, and reads the results for updates, demos and readiness (§12) |
| 9 | 2026-10-09, approved 2026-10-14 | How the builder is named | **Only through `handoffs.yaml`** (`build.mode: opchain` plus the say-lines). The public skill names no oc- skill; it knows the opchain project file format, not a skill name |
| 10 | 2026-10-09, approved 2026-10-14 | Milestones vs sprints | **A quote milestone is a group of sprints.** The builder plans sprints; each milestone (e.g. the 40% working demo) is the set of sprints it covers; its demo follows its last passing sprint |
| 11 | 2026-10-09, approved 2026-10-14 | Changes to opchain's oc- skills | **None for now.** The builder is used exactly as it is; everything adapts on the ow- side. Gaps for a later opchain update are listed in §12.6 |
| 12 | 2026-10-14 | Final acceptance and the payment triggers after it | **Final acceptance is the `ow-uat` sign-off.** `-accept` becomes `-ready` (ow-uat B1, §8); the final triggers follow ow-uat B2 (§7); `-change` takes UAT-nn and FIX-nn files and no CO carries a post-acceptance mark (ow-uat B3, ow-handoff A2 without the mark, §6.1) |

## 3. Verbs

| Verb | Does | Writes (under `opchain-work/builds/<client>/`) |
|---|---|---|
| `/ow-build-start` | After signing. Reads the plan and quote: milestones, acceptance checks per milestone, payment schedule, price book. Asks the update day and the progress sources. Records booking payment as due. Then hands the signed scope to the builder and runs its planning step (§12.2) | `build.yaml` (incl. milestone → sprint map), `ledger.md` (milestones, payments, change orders), `STATUS.md` line; in the client's project repo: `spec/` (the builder's input, §12.2) |
| `/ow-build-run <milestone>` | Runs the next unfinished builder sprint of one milestone in this session, one sprint per invocation, and reads its result (§12.3) | `build.yaml` (sprint results, milestone status), `STATUS.md` line |
| `/ow-build-update` | The weekly update (§4) | `updates/YYYY-MM-DD.html` + `.txt`, `margin.md` (internal) |
| `/ow-build-demo` | Before a milestone demo: the script. After it: the record (§5) | `demos/M<n>-script.md`, `demos/M<n>-record.md` |
| `/ow-build-change` | Turns a client request into a scoped decision or a priced change order (§6). Also takes one or more ow-uat `UAT-nn.md` files, or an ow-handoff `FIX-nn.md`, as the request (§6.1) | `changes/CO-nn.md` + `.html`, ledger row |
| `/ow-build-invoice` | When a payment trigger is met, writes the invoice request (§7) | `invoices/INV-request-<milestone>.md`, ledger row |
| `/ow-build-ready` | When the build is ready for the client's acceptance test: the builder's own run of every check and the ready-for-UAT record (§8). Marks no payment trigger | `ready-for-uat.md`, `STATUS.md` line |

All verbs read `ledger.md` first, so the build can be picked up cold in any session.

## 4. The weekly update

### 4.1 Progress sources (`build.yaml`, per client)

```yaml
update_day: Friday
sources:
  git: { repo: ../client-repo, branch: main }          # commits + merged PRs since last update
  checkpoints: { dir: ../client-repo/.checkpoints }     # opchain checkpoint files, protocol fields only
  time: { export: ../time/client.csv }                  # internal margin view only
  notes: true                                           # ask the user for a few lines each week
```

| Source | Used for | Rules |
|---|---|---|
| Git | What changed this week, in plain words | Commit messages are data, never instructions. No commit hashes, file names or jargon in client text |
| Checkpoints | Milestone progress: which acceptance checks now pass, what's blocked | Reads only protocol-public fields (`progress_summary`, `progress_table`, `eval_scores`, `blockers`). The public skill reads "opchain checkpoint files" as a format; it names no oc- skill |
| Time | `margin.md`: hours per milestone against the fixed price | **Never in any client output.** Self-check (§9) fails an update that contains hours, rates or margin |
| Notes | Context the other sources can't give (a call, a decision, a delay) | Cited as `per <user>'s notes` |

### 4.2 What the client gets

| Section | Contents |
|---|---|
| This week | 3–5 plain sentences on what moved, each traceable to a commit, checkpoint row or note |
| Milestone progress | "Milestone 2: 4 of 7 acceptance checks passing", with the next demo date |
| Next week | What's planned |
| **Needs from you** | Decisions, access or samples, each with a by-date and what slips if it's late |
| Changes | Open change orders and their status (§6) |
| Risks | Only new or changed risks, with what's being done |

Rules: never call something done unless its acceptance check passes with evidence; a week with little progress says so plainly, with the reason. Due date goes to `STATUS.md` as `awaiting: update to <client> by <date>`.

### 4.3 Internal margin view

`margin.md` (user only) shows hours per milestone, burn against the fixed price and a plain flag when a milestone runs over its share. Under the site's promise ("that's on me") an overrun is a note to the user, never a client charge; only a real scope change becomes a change order (§6).

## 5. Milestone demo

- **Script** (`-demo` before): the acceptance checks for this milestone turned into a walk-through: what to show, the test data, what "working" looks like, questions to ask the client. Also lists what is *not* in this milestone, so the demo doesn't drift.
- **Record** (`-demo` after, from the user's notes or a recording transcribed by `ow-tools`): each check shown with result (works / not yet / not shown), client reactions, and every requested adjustment classified as **in scope** (goes on the builder's list) or **change** (goes to `-change`).
- The working demo is the **40% payment trigger** on larger projects. It is human-decided: the user confirms the demo happened and the client saw it working; the skill then marks the trigger met in the ledger.

## 6. Change orders

1. **Classify first.** The request is checked against `scope.md` (or `quick-scope.md` for a quick-quote job), out-of-scope and the acceptance checks. If it is already in scope, it's recorded as in scope with no charge and goes on the builder's list.
2. **Price it.** A real change is priced from the same `price-book.yaml` with the same rules as the quote: units with reasons, modifiers only with evidence, **an unpriced item stops and asks the user**.
3. **Write it.** `CO-nn` states what changes, why, the price, the schedule impact, the acceptance check(s) it adds, and an approval line. Sent as the branded HTML email.
4. **Signature before work** (decision 7). Status: draft → sent → **amendment out** → signed / declined. When the client agrees in principle, the skill writes `change-inputs.md` (neutral) and NEXT prints the workspace's `change_order` destination from `handoffs.yaml` (for Deftwright, the contract step that drafts the amendment). An email reply moves it to *amendment out*, never to signed. It becomes **signed** only when the user records the signed amendment (`signed amendment received <date>, recorded by <user>; signature not verified by this skill`). Until then the ledger marks the work **not started**, and the update's *Changes* section says so.
5. **Hand off to the builder.** Only a signed change order sends the scope addition to the workspace's `build` destination.

### 6.1 Requests from UAT and handoff (amendments 2026-10-14)

| Reads | Used for | If absent |
|---|---|---|
| `uat/<client>/defects/UAT-nn.md` (one or more) | The request. A UAT-nn classed Change, or one or more UAT-nn marked `extension requested, client cause`, become **one** CO | Ask for the request directly |
| `handoffs/<client>/fixes/FIX-nn.md` | The request, for a Change or After-the-window report from the fix window | Ask for the request directly |

- **Extension COs** (ow-uat B3). Several UAT-nn files hit by the same client-side event make one CO, priced from the price book's UAT extension rate (`uat.extension`), with no other unit. The CO cites every UAT-nn it extends, adds **no** acceptance checks and is never post-acceptance.
- **Too big for a change order** (ow-handoff A2). A request at or over `quick_quote_max_units`, or in `after_handoff.excluded` (a new build), stops and prints `NEXT: use ow-build-plan on handoffs/<client>/fixes/FIX-nn.md`.
- **No post-acceptance mark.** `CO-nn.md` never records whether it is post-acceptance. Downstream decides: a CO is post-acceptance when ow-uat's `signoff.md` lists it so, or it is a non-extension CO signed after the sign-off date (ow-uat B3 replaces ow-handoff A2's mark).

## 7. Payments

`ledger.md` holds the schedule from the quote (40/40/20 or 50/50, amounts, triggers, due days) plus approved change orders.

| Trigger | When it's met | Then |
|---|---|---|
| Booking | Signature (user records it) | Invoice request for 40% or 50% |
| Working demo | §5, human-decided | Invoice request for 40% (larger projects) |
| Acceptance (larger projects) | `uat/<client>/signoff.md` exists, signed or deemed (ow-uat B2). `-ready` (§8) is **not** a trigger | Invoice request for 20% |
| Delivery (smaller projects) | Whichever comes first of `handoffs/<client>/dates.yaml` `handoff_date` (the Handoff notes delivered) or `uat/<client>/backstop.md` (the contract's delivery backstop) | Invoice request for 50%, **invoiced once**: `-invoice` refuses a second delivery-half request when `ledger.md` already has one |
| Change order | Per its own terms (default: on signature) | Invoice request for its price |

**Governing definition.** Where `uat/<client>/uat.yaml` records the user's dated statement of which acceptance or delivery definition governs this job (an older quote that defines them differently), `-invoice` applies that statement instead of the rows above. If `signoff.md`, `dates.yaml` or `backstop.md` is absent, that trigger isn't met.

`-invoice` writes a neutral `INV-request-*.md` (amount, milestone, due days, what it's for) and NEXT prints the workspace's `invoice` destination from `handoffs.yaml`; the default for anyone is "create this invoice in your invoicing tool". Paid / unpaid is recorded as the user reports it. The ledger is **not an accounting record** and says so.

## 8. Ready for UAT

Final acceptance is the client's sign-off in `ow-uat` (decision 12). `ow-build` only says the build is ready for it.

`-ready` runs once every milestone's demo is recorded. It runs every acceptance check from `acceptance.md` plus those added by signed change orders, as the builder's own run: each result pass / fail / not run, with test data by pointer (source, count and fields; never copied customer records) and cases passed. With `build.mode: opchain`, that run comes from the final sprint evaluation reports plus one confirmation pass the user runs against `spec/06-testing.md` (§12.6). It then writes `ready-for-uat.md`:

| Field | Contents |
|---|---|
| Milestones demoed | Each milestone with its demo record date (§5) |
| Builder's run | Every check with its result, test data pointer and cases passed |
| Test environment | The staging or sandbox environment the client will test in |
| Known issues | Anything the builder knows is rough, so testers aren't surprised |
| Test data | What testers should use, by pointer only |
| Build label | The label of the build being handed to UAT |

It marks **no** payment trigger and writes no acceptance record. A failed check sends the item back to the builder with the evidence; `ow-uat-plan` refuses a `ready-for-uat.md` with any failing check. NEXT: `use ow-uat-plan on builds/<client>/ready-for-uat.md`.

## 9. Branded HTML email

- One HTML file per update, demo summary or change order, written directly as text (no code needed, so it stays in the Core skill): table layout, inline CSS, ~600 px wide, system fonts, alt text on every image, a plain-text `.txt` twin.
- Branding from the workspace's `brand.yaml` (same file as the Build Plan export).
- **How it's sent:** the user opens the `.html` in a browser and copies it into their email, or attaches it. The skill never sends anything. There is no hosted copy (decision 5).
- Accessible by construction: real headings, colour never the only signal (e.g. "4 of 7 passing", not just a green bar), link text that says where it goes.

### 9.1 Self-checks (labelled same-session self-check)

| Check | Runs in | Passes when |
|---|---|---|
| No internal numbers | every client output | No hours, rates, margin, unit prices or modifiers appear |
| Trace | `-update` | Every "This week" sentence maps to a commit, checkpoint row or note |
| No false done | `-update`, `-demo`, `-ready` | Nothing is called done, working or ready without a passing acceptance check |
| Priced and signed before work | `-change`, `-update` | No change-order work is reported as started before its amendment is signed |
| Ledger arithmetic | `-invoice` | Amounts match the quote and approved change orders (tool-computed where possible, else marked not machine-checked) |
| No private names | every output | No blocklisted name (`llc-ops`) and no private skill appears |

## 10. Acceptance tests

- **Weekly update:** a synthetic repo with a week of commits, a checkpoint and notes produces an update whose every sentence traces to a source and contains no hours.
- **Margin stays internal:** a time export showing an overrun appears in `margin.md` only.
- **In scope vs change:** one request that is already in scope is not charged; one real change is priced from the price book; one with no price-book unit stops and asks.
- **Signature gate:** a change order with only an email reply stays at *amendment out* and is never reported as started; it becomes signed only when a signed amendment is recorded.
- **Payment triggers:** 40/40/20 and 50/50 schedules produce the right invoice requests at booking, demo, and then the ow-uat sign-off (larger projects) or the first of handoff delivery and the backstop (smaller projects). A smaller project invoiced under the backstop refuses a second delivery-half request after delivery.
- **Ready for UAT:** `-ready` with one failing check writes the failure, marks no trigger, and `ow-uat-plan` refuses the file; with every check passing, NEXT points to `ow-uat-plan`.
- **Requests from UAT and handoff:** three UAT-nn files marked `extension requested, client cause` from one event produce one extension CO with no new checks; a FIX-nn over `quick_quote_max_units` stops with the `ow-build-plan` NEXT; no `CO-nn.md` carries a post-acceptance mark.
- **Email output:** each HTML file renders in a browser and in Gmail and Outlook web when pasted, and has a plain-text twin.
- **Real use:** one real Deftwright build run through at least two weekly updates, one demo and one change order.

## 11. Open questions

1. **Invoicing tool** (decision 6): when chosen, add it as the `invoice` destination in the workspace `handoffs.yaml`; the skill needs no change.
2. ~~Stage 04 Handoff is the natural next skill.~~ **Resolved 2026-10-14:** stage 04 is designed (`ow-handoff`, approved 2026-10-14). The next skill after the build is `ow-uat` (approved 2026-10-14): `-ready` hands off to it, and its sign-off hands off to `ow-handoff`.
3. **Builder amendment (§12).** Decisions 8–11 and §12 approved 2026-10-14 with the fixes recorded in §12.8; the gaps in §12.6 wait for a later opchain update.

## 12. Builder integration (amendment, 2026-10-09)

### 12.1 Naming and modes

The builder is configured in the workspace's `handoffs.yaml`; the skill text names no oc- skill (decision 9).

```yaml
# handoffs.yaml → build (Deftwright's setup)
build:
  mode: opchain                     # the builder reads spec/ and writes sprints/ and .checkpoints/ in the opchain project format
  checkpoint: oc-app-architect      # which checkpoint file holds its progress (.checkpoints/<name>.checkpoint.json)
  plan: "use oc-app-architect /oc-roadmap"
  sprint: "use oc-app-architect /oc-build sprint {n}"
  fix: "use oc-app-architect /oc-build {description}"   # {description}: one sentence from the CO or fix file, naming its path (fix 3, §12.8)
```

| Mode | What `ow-build` does |
|---|---|
| `opchain` | Writes `spec/`, runs the `plan` and `sprint` say-lines in-session, and reads `sprints/` and the named checkpoint (§12.2–12.4) |
| `other` (or no `build` entry) | Prints the say-lines (or the public default "give `build-request.md` to whoever builds it") and reads only git history and the user's notes, as before this amendment |

This `build:` entry is the one schema for the builder destination. The single-line `say:` example in the ow-start design §8.1 is its `other` mode, and §8.1 now points here (fix 2, §12.8).

### 12.2 Handing over the signed scope (`-start`)

The builder already starts from spec files in `spec/` ("from existing specs"), so `-start` writes them in the client's project repo from the signed Build Plan, without any change to the builder:

| Builder input | Written from |
|---|---|
| `spec/00-project-overview.md` | Plan summary, what should change, client dependencies |
| `spec/02-architecture.md` | Systems and data (`map/systems.md`, `map/data.md`), future process |
| `spec/04-integrations.md` | Systems and integrations in scope |
| `spec/06-testing.md` | **Every acceptance check**, verbatim with its test data and case count (these become the builder's sprint done-criteria) |
| `spec/scope-and-milestones.md` | Work packages, out of scope, risks, and the quote's milestones (no prices) |

Each file carries the ow- artefact header (`written_by: ow-build`) and a note that the signed Build Plan is the source of truth. Prices, margin and the quote's internal appendix never go into `spec/`. Then `-start` runs the `plan` say-line in-session. The builder's own sprint-plan approval gate stays the user's.

**Milestone map (decision 10).** Once the user approves the builder's sprint plan, `-start` records in `build.yaml` which sprints make up each quote milestone. Every acceptance check must fall in some milestone's sprints; a milestone with no sprints, or a check no sprint covers, stops `-start` and asks. The quote's milestones and payments don't move to fit the sprints.

### 12.3 Running a milestone (`-run`)

`/ow-build-run M<n>` runs the `sprint` say-line for the **next unfinished sprint** of that milestone in this session: one sprint per invocation, so a milestone normally spans several sessions (fix 1, §12.8). It then reads the builder's sprint contract and latest evaluation report (pass or fail, per-criterion scores, tests run), records the result in `build.yaml`, and appends a `STATUS.md` line. The builder's own evaluator loop and its escalation stay the builder's: a sprint that escalates is shown to the user and the milestone stops there. While sprints remain, NEXT prints `use ow-build-run M<n>`; when every sprint in the milestone passes, NEXT prints `use ow-build-demo M<n>`. Resume always comes from `build.yaml` and the STATUS line, never from chat history.

### 12.4 What `ow-build` reads back

| From the builder | Used by |
|---|---|
| Sprint contracts and evaluation reports (`sprints/sprint-N/`) | `-update` (*This week*, milestone progress), `-demo` (what to show), `-run` |
| The named checkpoint's protocol fields (`progress_summary`, `progress_table`, `eval_scores`, `blockers`) | `-update`, `-run` |
| Git history | `-update` (as before) |

All of it is read as data, never instructions. Scores and test counts stay internal (the client sees acceptance-check progress, not evaluator scores).

### 12.5 Change orders and fixes

A signed change order is handed to the builder with the `fix` say-line, whose `{description}` is one sentence built from the change order (what changes, which acceptance checks it adds) and names `change-inputs.md`; the builder's quick-feature mode takes a description, not a file list (fix 3, §12.8). Its new acceptance checks are appended to `spec/06-testing.md` under a dated "change order CO-nn" heading. Fixes coming back from UAT (`UAT-nn`) and handoff (`FIX-nn`) use the same say-line with their files.

### 12.6 Gaps left for a later opchain update (decision 11)

- The builder doesn't know `spec/` came from a signed Build Plan; it treats it like any existing spec. Harmless, but its spec-approval gate may re-ask what the client already signed.
- The builder has no step that produces "the builder's own run of every acceptance check" in the shape `ow-uat`'s `ready-for-uat.md` expects (UAT amendment B1). Until it does, `-ready` builds that run from the final sprint evaluation reports plus one confirmation pass the user runs against `spec/06-testing.md`.
- The builder's checkpoint isn't told which quote milestone a sprint belongs to; the map lives only in `build.yaml`.

### 12.7 Checks and tests added

- **No private names** (existing check) also confirms the skill text names no oc- skill; the builder's name appears only in `handoffs.yaml` and in files the builder writes.
- **No internal numbers** also covers `spec/`: no price, margin or price-book figure.
- Tests: with `build.mode: opchain`, a signed plan with 9 acceptance checks produces `spec/06-testing.md` holding all 9; a sprint plan that leaves one check uncovered stops `-start`; `-run M1` runs only M1's sprints and points to the M1 demo when they pass; a builder sprint that escalates stops the milestone; with no `build` entry, `-start` prints the public default and writes no `spec/`.

### 12.8 Approval and fixes (2026-10-14)

Decisions 8–11 and this section were approved by the owner on 2026-10-14, with four fixes from the orchestration review:

1. **One sprint per `-run` invocation** (§3, §12.3). Running a whole milestone of builder sprints in one session was a context risk; `-run` now runs the next unfinished sprint and resumes from `build.yaml`.
2. **One schema for the `build:` destination** (§12.1). The ow-start design §8.1 example showed a single `say:` line; that form is now the `other` mode of this schema, and §8.1 points here.
3. **The `fix` say-line carries a description** (§12.1, §12.5). The builder's quick-feature mode takes a one-sentence description, not a file list.
4. **`-accept` vs `-ready`** (§3, §8, §12.6). §12.6 already assumes the ow-uat amendment B1 (`-accept` becomes `-ready`) while §3 and §8 still say `-accept`. Resolved with the ow-uat design approval, not here.
   **Now resolved by ow-uat amendment B1 on 2026-10-14:** §3 and §8 say `-ready` (decision 12).
