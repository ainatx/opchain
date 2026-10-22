# ow-handoff — design

**Date:** 2026-10-08 · **Status:** **APPROVED 2026-10-14** (decision 6), with the ow-uat design's amendments H1 and H2 folded into this text and the owner's answers to open questions 1–3 recorded as decisions 7–9. Revised four times before that after an adversarial review, a completeness check and two contradiction checks (§15). Nothing is built. **Amended 2026-10-15: quick-quote scope file is quick-scope.md (owner decision).**
**Release:** fourth skill in the ow- family that ships together as v2.1.0. Starts at 1.0.0.
**Family rules that apply:** no `ow-review` (labelled same-session self-checks); code only in the `ow-tools` add-on; no public ow- skill names a private skill, and handoffs leaving the family go through the workspace's `handoffs.yaml` (ow-start design, decisions 22–23).
**Upstream:** `ow-uat` (`acceptance-record.md`, `signoff.md`, `punch-list.md`, `agreed/`, `acceptance-addendum-CO-nn.md`, `secrets-seen.log`, `evidence/`, and `uat.yaml` for a governing delivery definition); `ow-build` (`ledger.md`, `build.yaml`, `changes/CO-nn.md`); `ow-build-plan` (`quote.md` client-facing part, `contract-inputs.md`, `map/systems.md`, `evidence.md` access log; the scope and acceptance checks arrive frozen through `uat/<client>/agreed/`); `ow-start` and earlier stages (recording and inbox folders, for the local-copy list only); the workspace's `offers.md` and `handoffs.yaml`. §3.1 gives every read its absent-case.
**Downstream:** `ow-care` (separate skill, not yet designed) via `care-start.md`; `ow-build -change` for paid changes; `ow-build-plan` for changes too big for a change order; the workspace's `build` destination for fixes and approved hourly help; the `invoice` destination for hourly help and vendor charges.

`ow-handoff` runs stage 04: hand the client everything they need to run the work without the builder, honour the fix window, offer what comes next, move everything into the client's name and take the builder's access back out.

## 1. What the site promises (staging.deftwright.com, read 2026-10-08)

| Source | Promise | Where the skill meets it |
|---|---|---|
| /how-we-work stage 04 | "Over to you. Docs, code and accounts, all in your name." | §4; open transfer items block close |
| /how-we-work stage 04 | The file: **Handoff notes**: *Your accounts* ("code, hosting and service access belong to you"), *Operator notes* ("how to check a run, handle an alert and retry a failed transfer"), *Acceptance record* ("the agreed checks and their results, alongside the build") | §4–§6 |
| /how-we-work stage 04 | "30 days of fixes for anything that misses the agreed scope." | §7 |
| /how-we-work, "What happens after handoff?" | "After that, choose optional monthly care, hourly help or no ongoing arrangement." | §8 |
| /how-we-work, agreement | "Your repository. Your accounts. Your data. Documentation and tests that let another developer take over." | §6 takeover check |
| /how-we-work, payments | "Vendor subscriptions are billed directly to you, without a markup." | §4 billing transfer items; §7.6 vendor charges at cost |
| /services, operations | Included: error handling and alerts, run logs, acceptance tests, operator notes, 30 days of fixes | §5 coverage check; a missing included item is a Fix |
| /services, "Keep it running after launch" | Care tiers (Keep 2 h/month, Tune 8 h, Steward 20 h, with reply times), prepaid monthly, a quarter of unused hours roll over one month, 30 days' notice, out-of-hours on-call and new builds excluded | §8: read from `offers.md`, never hard-coded |

## 2. Owner decisions

| # | Date | Question | Answer |
|---|---|---|---|
| 1 | 2026-10-08 | Name | `ow-handoff` |
| 2 | 2026-10-08 | What it owns | Handoff package · fix window · after-handoff offer · access-removal checklist |
| 3 | 2026-10-08 | Care plans | **A separate skill, `ow-care`.** `ow-handoff` only offers care; accepting it hands off to `ow-care` |
| 4 | 2026-10-08 | Operator-note sources | All four: the builder's docs, the acceptance checks, the alert and run-log setup (wherever it is configured), the user's notes |
| 5 | 2026-10-08 | The user's own access | **Checklist to remove it**, unless the client chooses care |
| 6 | 2026-10-14 | Design approval | **Approved**, with the ow-uat design's H1 and H2 folded into this text: upstream is `ow-uat`, not `ow-build -accept`. §14: A1, A2 and A4 approved (A2 **without** the post-acceptance mark, superseded by ow-uat B3); A3 **withdrawn** (superseded by ow-uat B1 and its §8.3 addendum) |
| 7 | 2026-10-14 | Window start (was open question 1) | The **delivery date** of the Handoff notes, recorded by `-delivered`, as drafted (§7.2) |
| 8 | 2026-10-14 | Hourly-help go-ahead (was open question 2) | **A client's email go-ahead is enough**, recorded as reported; no signature (§7.5) |
| 9 | 2026-10-14 | Post-acceptance change orders (was open question 3) | **Each gets its own fix period** of `fix_window_days` from that CO's acceptance date, taken from ow-uat's `acceptance-addendum-CO-nn.md`. Reports against its work are classified against its own window end, and close waits for the latest one (§7.1, §7.2, §10) |


## 3. Verbs

Every file has **one writer verb**. The only exceptions are the two append-logs, `STATUS.md` and `secrets-seen.log`, which any verb may append to.

| Verb | Does | Writes (under `opchain-work/handoffs/<client>/`) |
|---|---|---|
| `/ow-handoff-start` | After ow-uat sign-off (`uat/<client>/signoff.md`, signed or deemed), right away, so anything reported from then on is a covered Fix. Reads upstream (§3.1); copies `uat/<client>/agreed/` and **freezes the agreed basis and window terms** (§7.1); records the acceptance date (the signed or deemed date in `signoff.md`) and the builder's doc paths (found in the repository's README and docs folder and confirmed by the user, else asked). Sets **no** window dates. If `punch-list.md` has items, prints `NEXT: use ow-handoff-fix on uat/<client>/punch-list.md`. Re-run as `-start --keep-frozen <file>` or `-start --refreeze <file>` to resolve a basis mismatch (§7.1) | `handoff.yaml`, `agreed/` |
| `/ow-handoff-accounts` | Accounts inventory (§4), the redacted repository secrets scan, and every transfer-item state, client account-check confirmation, completeness confirmation and unresponsive-client waiver on those rows | `accounts.md` |
| `/ow-handoff-notes` | Operator notes (§5) and the operator walk-through record | `operator-notes.md` |
| `/ow-handoff-package` | Assembles the Handoff notes and cover email (§6). Stops with `NEXT: use ow-handoff-accounts` / `-notes` if `accounts.md` or `operator-notes.md` is missing. Before delivery: asks the planned send date and prints **provisional** dates. After delivery: prints the recorded dates and logs a revision | `package.yaml` (planned send date; provisional end, removal and care-start dates; revisions; secrets read-through confirmation), `handoff-notes.md` → `export/handoff-notes.{pdf,docx}`, `export/handoff-email.{html,txt}` |
| `/ow-handoff-delivered` | Records the day the notes were sent and writes the **window dates, once** (§7.2). On smaller projects (the two-payment schedule), prints `NEXT: use ow-build to invoice the delivery payment` only when `builds/<client>/ledger.md` doesn't already show the delivery half invoiced (it may have been invoiced under the ow-uat backstop). Where `uat/<client>/uat.yaml` records a governing delivery definition, it follows that instead | `dates.yaml`, `export/window-correction-email.{html,txt}` (only if a provisional date moved) |
| `/ow-handoff-fix` | Logs, classifies and follows each report and hourly-help job to its end, including `closed unconfirmed` waivers (§7). Logs each `uat/<client>/punch-list.md` item as a covered FIX-nn (§7.2). Records each post-acceptance CO's own window end once its `acceptance-addendum-CO-nn.md` exists (§7.2); a bare `-fix` with no report does only this bookkeeping | `fixes/FIX-nn.md`, `help/HELP-nn.md`, `invoices/INV-request-*.md`, `co-windows.yaml` |
| `/ow-handoff-offer` | Recommends care, hourly help or nothing; **freezes every offered term** and records the client's choice (§8) | `after-offer.md` (+ `.html` offer) |
| `/ow-handoff-access` | Access-removal checklist, and the removal, rotation, re-grant, local-copy and waiver records for access items (§9) | `access.md` |
| `/ow-handoff-close` | Closes the workstream when nothing blocks (§10); a later run after reopening writes an addendum | `close.md` (then `close-addendum-<date>.md`), `care-start.md` (then `care-start-addendum-<date>.md`), `export/close-email.{html,txt}` |

Every verb starts with the R4 resume step: it reads `handoff.yaml`, `dates.yaml`, `co-windows.yaml` and `STATUS.md`, so the handoff can be picked up cold in any session. `ow-handoff` never reads `margin.md`, a time export or `price-book.yaml`.

### 3.1 Reads, absent-cases and mismatches

| File | Used for | If absent | If it doesn't match |
|---|---|---|---|
| `uat/<client>/signoff.md`, `acceptance-record.md`, `agreed/` | Acceptance date (signed or deemed), build label, the post-acceptance CO list, test accounts (§9 source 5); the acceptance record (§6); the agreed basis, which already holds `scope.md` and `acceptance.md` (or, for a quick-quote job, `quick-scope.md`), the COs in the acceptance, the included block and the ownership terms (§7.1) | Any absent: `-start` stops, writes nothing, prints `NEXT: use ow-uat-signoff on uat/<client>/` | A `uat/<client>/agreed/` file newer than this skill's copy: basis mismatch (§7.1). The acceptance record covers every check in `agreed/` by construction, so there is no partial-coverage case |
| `uat/<client>/punch-list.md` | Signed minors and cosmetics, each logged by `-fix` as a covered FIX-nn (§7.2) | Nothing to log | — |
| `uat/<client>/acceptance-addendum-CO-nn.md` | A post-acceptance CO's checks, results and acceptance date (the confirmation date), which starts its own fix period (§7.1, §7.2); `-package` adds it to the acceptance record section | That CO isn't accepted yet: reports against its work go to ow-uat's addendum flow (§7.1) | — |
| `uat/<client>/secrets-seen.log` | Reset/rotate items (§9 source 3) and the sessions named in it (source 4) | Nothing to add | — |
| `uat/<client>/evidence/index.md` | Items not `cleared` and the imported results files → local-copy list (§9 source 4); `cleared` items → keep list | Nothing to list | — |
| `uat/<client>/uat.yaml` (read only by `-delivered`) | A governing delivery definition the user recorded for an older quote | Delivery = the day the Handoff notes are delivered | — |
| `builds/<client>/changes/CO-nn.md` | Post-acceptance COs: those `signoff.md` lists as post-acceptance, plus any non-extension CO signed after the sign-off date (an extension CO cites the UAT-nn it extends and adds no checks). Read by their own status and date; no mark on the CO file | None: no post-acceptance COs | Unsigned or declined COs are listed as **not in scope** |
| `plans/<client>/contract-inputs.md`, then `quote.md` (client-facing), then `offers.md` | `fix_window_days`; payment due days; the payment schedule (larger or smaller project) | Next file in the chain; `offers.md` values are defaults the user confirms; if none, ask and record as user-stated | — |
| `offers.md` → `after_handoff` | Offer terms, exclusions, hourly price; defaults for `fix_window_days` and the removal lead | No section: `-offer` writes no offer, records `undecided`, prints "add an after_handoff section to offers.md". No `excluded`: no care-hours routing. No lead: ask the user | — |
| `profile.md` | Time zone and holidays for business-day counting | Weekends only, no holidays; `-delivered` says so | — |
| `handoffs.yaml` | `build` and `invoice` destinations | Public defaults (§7) | — |
| `builds/<client>/ledger.md` | Payment status at close (read only) | `-close` says "payment status not recorded" and doesn't fail | — |
| `builds/<client>/ledger.md` (read by `-delivered`, smaller projects) | Whether the delivery half is already invoiced | Not invoiced: print the delivery-payment NEXT | — |
| `builds/<client>/build.yaml` | Repository location, sources | Ask the user | — |
| `accounts.md`, `operator-notes.md` (read by `-package`) | The notes' accounts and operator sections | `-package` stops and prints `NEXT: use ow-handoff-accounts` or `-notes` | — |
| `plans/<client>/map/systems.md` | Accounts inventory seed | Quick-quote job: inventory from `build.yaml`, `quote.md` vendors and the user's input, marked "built without a systems map" (§4) | — |
| `plans/<client>/evidence.md` (access log) | Stage-02 grants for §9 | Say so in `access.md`; ask the user to list stage-02 grants by hand | — |
| Recording and inbox folders (§9 source 4) | Local-copy list | Nothing to list | — |
| `package.yaml` (read by `-delivered`) | Provisional end date | End date = delivery + `fix_window_days`; no correction email | — |

## 4. Accounts: "all in your name"

`accounts.md` has one row per repository, hosting account, domain/DNS, email sender, SaaS, API, integration, webhook and scheduled job.

| Column | Rule |
|---|---|
| What | The account or connection |
| Owner of record | Must be the client. Builder, third party or UNKNOWN → **transfer item** (kind: ownership) |
| Billing | Billed to the client directly. Billed through the builder → **transfer item** (kind: billing) to the client's own payment method. Charges the builder already paid → §7.6 |
| Runs as / authorised by | For integrations, tokens, webhooks and jobs. Running as the builder's identity → **transfer item** (kind: re-authorise under a client identity); rotating isn't enough when the token belongs to the builder's account |
| Recovery and MFA | Who holds the recovery email, phone and second factor. The builder holding any → **transfer item** (kind: recovery) |
| Who has access | Every person and service account, by role; the builder's own access is marked for §9 |
| Source · confidence (internal) | HIGH seen (console, export, screenshot the client supplied) · MEDIUM stated · LOW inferred · UNKNOWN. Rows below HIGH show in the notes as "to confirm", never as owned |
| Where the client keeps the login | A pointer only ("your password manager, entry *Hosting*") |

**Transfer items** move `open` → `client has owner/billing rights` (confirmed by client role, dated) → `done`. Each step says how control moves: an ownership transfer, a password reset to the client's own email, or a share through the client's password manager. It never goes by email and never into the Handoff notes. Choosing care does not exempt a transfer: care keeps access, not ownership.

**Client account check (human-decided).** During the operator walk-through, the client signs in to each account and confirms five things: their role is owner/admin; billing is theirs; the member and API-key list matches "Who has access"; the recovery email, phone and second factor are theirs; and each integration, token, webhook and job on that account runs as a client identity. Unlisted members go into §9. Each confirmation is recorded per account with its date.

**Inventory completeness.** When `accounts.md` was built without a systems map, "All in the client's name" is NOT-CHECKED until the user and client confirm the list is complete against a fixed prompt list: repository host, hosting, domain/DNS, email sender, every vendor in `quote.md`, every integration in `scope.md`. The confirmation is recorded with its date.

**Secrets.** Credentials never appear in any file, transcript or prompt output. Secret **names** come only from names-only sources: `.env.example`, the config schema, a hosting or CI listing that shows names without values, and the user's list. The skill never opens a `.env` file or a secrets store, and never asks for or prints a value. Each secret the builder saw or created, and each repository-scan hit, is listed in `accounts.md` as a **rotate item** by name with every place it's used (env var, CI secret, integration config, job). This list, plus `secrets-seen.log`, is what `-notes` and `-access` read, so rotate entries exist before delivery.

**Repository secrets scan.** Through `ow-tools` (or the builder's own scanner) in **redacted mode only**: it reports path, commit, line and rule id, never the match. A scanner that can't redact is not run, and the result is NOT-CHECKED. It covers the delivered tree and its full git history. Every hit becomes a rotate item in `accounts.md`; removing it from history is the client's choice, never done by the skill. NOT-CHECKED is printed in "Taking it over" as "this repository has not been scanned for committed secrets". **If any secret value ever appears in a session** (scan output, a paste, tool output), the verb that saw it appends the secret's name and the session to `secrets-seen.log`; `-access` turns each entry into a rotate item and a local-copy item (§9), without waiting for the user to name it.


## 5. Operator notes

Each entry answers one operating task in fixed form:

```
OP-4  A transfer failed
When:   the "transfer failed" alert arrives, or the daily run log shows a red row
Check:  open <run log location>; find the row; read the error line
Do:     if the error says "timeout", press Retry on that row; if it says "invalid SKU", fix the SKU in <system> first, then retry
If that fails: <who to contact, by role>; business hours only unless your arrangement says otherwise
Source: alerts config (alerts.yaml: transfer_failed), acceptance check AC-3.4, builder runbook docs/runbook.md#retries
```

| Source | Becomes |
|---|---|
| The builder's docs (README, runbooks; paths in `handoff.yaml`) | Steps for runs, deploys and retries, written for an operator |
| The acceptance checks (from `uat/<client>/acceptance-record.md` and any CO addenda) | "How to check it's working" entries for checks worth repeating |
| The alert and run-log setup: in the repository **and** wherever else it's configured. For each hosting, monitoring or integration account the user confirms "alerts configured in <service>: list or none" | One "when this alert fires" entry per alert, and where the run log lives and how to read it. Vendor-console entries are cited "user-confirmed <date>" |
| The user's notes | Anything the others miss (a vendor quirk, a monthly task) |
| The rotate items in `accounts.md` and `secrets-seen.log` | One "Rotate <secret name>" entry per secret: where it's used, how to update each place, how to confirm |


**Escalation line.** It uses the exclusions frozen in `after-offer.md` once an offer exists, and `offers.md` before that (e.g. "out-of-hours on-call is not included"). The chosen care tier's reply target is added by `-package` in the Handoff notes if the choice is already recorded; if care is chosen after delivery, it goes into `care-start.md` and the close email instead, and the delivered notes aren't reissued. The operator walk-through is human-decided; `-notes` records it with its date.

## 6. The Handoff notes document

| Section | Contents |
|---|---|
| Your accounts | `accounts.md` minus the internal *Source · confidence* column; transfer items shown as done or pending; rows below HIGH marked "to confirm" |
| Operator notes | `operator-notes.md`, plus the chosen care tier's reply target on the escalation line if the choice is already recorded |
| Acceptance record | The agreed checks and results from ow-uat's `acceptance-record.md`, unchanged, with dates, the sign-off (signed or deemed) and evidence by `cleared` pointer only; then each `acceptance-addendum-CO-nn.md` present when packaged, with its confirmation date |
| Taking it over | Where the code lives, how to run the tests, how to deploy, where the docs are, **each citing a repository path** (README#tests, docs/deploy.md, CI config). Last test result "as reported". Repository secrets-scan result |
| Your fixes | What counts as a fix and how to report one. Before delivery: "N days from the day you receive these notes, until <provisional end date>". After delivery (a revision): the recorded end date. Each change order accepted after sign-off: "N days from <its acceptance date>, until <its end date>" from `co-windows.yaml` |
| What happens next | Filled from `after-offer.md`; if undecided, the three options with their frozen terms, and the access-removal date (provisional before delivery) as the date to decide by (§9) |

Format: branded **PDF and Word** through `ow-tools` (a document to keep, like the Build Plan), plus a short **HTML cover email** like `ow-build`'s updates. Without `ow-tools`, the skill prints the Markdown and says the documents couldn't be generated here. A re-run of `-package` after delivery never recomputes dates; it logs a revision in `package.yaml`.

**Takeover check.** If the test suite, deploy instructions or developer docs are missing, that's a FINDING. Because "documentation and tests" is in the frozen ownership terms (§7.1), it's classified as a **Fix** (with `reported` = the date the skill raised it) and sent to the `build` destination before the notes are delivered. The skill never fills a gap with a command it made up.

## 7. The fix window

### 7.1 The agreed basis and window terms (frozen at `-start`)

`-start` copies `uat/<client>/agreed/`, the basis ow-uat froze and the client accepted, into its own `agreed/` and lists it in `handoff.yaml` as `agreed_basis`, with each file's date. That folder already holds:

- `scope.md` and `acceptance.md` (or, for a quick-quote job, `quick-scope.md`)
- every `CO-nn.md` that is part of the acceptance (in ow-uat's `agreed/` when the sign-off was recorded)
- the **included** block from `quote.md` (client-facing part): e.g. error handling and alerts, run logs, acceptance tests, operator notes
- the **ownership terms** (from `contract-inputs.md`, else the plan's Ownership section): repository, accounts, data, documentation and tests

**Post-acceptance COs** are those `signoff.md` lists as post-acceptance, plus any non-extension CO signed after the sign-off date. No CO file carries a mark; `-start` and `-fix` both apply this rule. They're never frozen here and never gate `-start`. Each one is accepted later through ow-uat's addendum flow, which writes `uat/<client>/acceptance-addendum-CO-nn.md`.

It also freezes the window terms in `handoff.yaml`: `fix_window_days` (chain in §3.1; never compute an end date without a value; amendment A1) and `access_removal_lead_business_days` (from `offers.md`, else ask). Editing `offers.md` later never changes an existing client's terms.

`-fix` judges every report against `agreed/` and against post-acceptance COs, which it reads directly from `builds/<client>/changes/` by their own status and date. **A post-acceptance CO has its own fix period** (decision 9): `fix_window_days` from its acceptance date in `acceptance-addendum-CO-nn.md`, recorded in `co-windows.yaml` (§7.2). A report against a post-acceptance CO with no addendum yet isn't a covered Fix: that CO isn't accepted, so `-fix` logs nothing and prints `NEXT: use ow-uat-defect on uat/<client>/` against that CO's addendum scenarios (or, if it has none yet, `use ow-uat-plan --addendum CO-nn`). Any other upstream edit is reported as a mismatch. It clears when the user runs `-start --keep-frozen <file>` (appends a dated `kept_frozen` entry to `handoff.yaml`, copies nothing) or `-start --refreeze <file>` (re-copies that one file into `agreed/` with a dated note).

### 7.2 Dates

- `-start` records the **acceptance date** (the signed or deemed date in `uat/<client>/signoff.md`); no window dates.
- `-package` (before delivery) asks the planned send date and records in `package.yaml`, all marked provisional: `planned_send`, `planned_end` (= planned send + `fix_window_days`), `planned_removal` (= `planned_end` minus the frozen lead, in business days) and, if the choice is care with no agreed start, `planned_care_start` (= the day after `planned_end`).
- `-delivered` records `Handoff notes delivered <date>, recorded by <user>; delivery not verified by this skill` (date via the ow- time-source ladder) and writes `dates.yaml` **once**:
  - `handoff_date`: the delivery date
  - `window_end`: the later of `planned_end` and delivery + `fix_window_days` calendar days (no `planned_end`: delivery + `fix_window_days`)
  - `access_removal_date`: `window_end` minus the frozen lead, in business days (`profile.md` time zone and holidays)
  - If any recorded date differs from its provisional one in `package.yaml`, it drafts a correction email giving the new end, removal (decide-by) and care-start dates.
- **Post-acceptance CO windows** (decision 9). `-fix` is the **only writer** of `co-windows.yaml`. On every run, a bare `-fix` included, it appends one row for each `uat/<client>/acceptance-addendum-CO-nn.md` that has none: `CO-nn`, `accepted` (the addendum's confirmation date), `window_end` (= `accepted` + the frozen `fix_window_days` calendar days), `recorded <date>`. Rows are never edited. They don't go in `dates.yaml`, which `-delivered` writes once, because a CO can be accepted before or after delivery. A CO's window is its own: it neither waits for delivery nor stretches to the main `window_end`.
- Until `dates.yaml` exists, `-fix` treats every report judged against the main basis as inside the window.
- Each `FIX-nn` records `reported: <date the client sent it>` (as reported, with source) separately from the date it was logged. Classification uses `reported` against **the window of the item it's judged against**: the main `window_end` for the agreed basis; that CO's `window_end` in `co-windows.yaml` for a post-acceptance CO's work, whatever the main window end. A report on or before the relevant window end is covered even if it's logged or fixed later, **including after close**: `-fix` still accepts it and the workstream reopens (§10).
- **Punch list.** `-fix` logs each item on `uat/<client>/punch-list.md` once as a covered FIX-nn citing its UAT-nn, judged against the check that UAT-nn cites, with `reported` = the UAT-nn's logged date (always inside the window). `-start` points here when the list has items.

### 7.3 Classes

| Class | Test (against the basis) | Then |
|---|---|---|
| **Fix** | A scope item, signed change-order item, included item, ownership term (documentation and tests) or acceptance check doesn't behave as agreed. Also: a failure caused by a handoff rotation or removal step, reported in the window | Free. NEXT prints the workspace's `build` destination with `FIX-nn.md`; public default "give `fixes/FIX-nn.md` to whoever builds it". If it needs access that's been removed, `FIX-nn.md` asks for a re-grant and `-access` records it (§9) |
| **Change** | Asks for behaviour the basis didn't include | Not free. **Care hours** only if the recorded choice is **care**, care has a start date (§8), `reported` is on or after it, the request isn't in the frozen `excluded` list, and `ow-care` is installed; the FIX-nn is marked `route: care`. Before the first close, `-close` lists it in `care-start.md`; after it, NEXT prints `use ow-care on handoffs/<client>/fixes/FIX-nn.md`. Otherwise `NEXT: use ow-build to price the change from handoffs/<client>/fixes/FIX-nn.md`: `ow-build -change` prices it, needs a signed amendment before work, and sends anything at or over `quick_quote_max_units` or in `excluded` (a new build) on to `ow-build-plan` (amendments A2, A4). Or **hourly help** (§7.5) |
| **Not a defect** | A how-to (answered from the operator notes; `-notes` is re-run if they missed it) or a third-party outage | No charge for the answer; vendor issues go to the vendor |
| **After the window** | `reported` is after the relevant window end (§7.2: the main `window_end`, or the CO's own in `co-windows.yaml`) | Same routes as Change |

The classification is a recommendation; the user decides, and the client sees the reason and the item it was judged against.

### 7.4 Following a fix to its end

`FIX-nn.md` status: `open → sent → fixed → verified`, or the terminal states `withdrawn by client` (dated, client role), `waived <date>, by <client role>`, `reclassified` (no longer a Fix), `closed unconfirmed` (recorded by `-fix` when the user types the unresponsive-client waiver for a fix at `fixed` whose re-check passed, naming the dates confirmation was requested; §10). The re-check that verifies a fix depends on what it was judged against; `-fix` runs it, scoped to that one item:

| Judged against | Verified when |
|---|---|
| Scope item, CO item, acceptance check | The cited acceptance check is re-run and passes |
| Included item (alerts, run logs, operator notes) or a takeover gap | The Operator-task coverage or Takeover check passes for that item, after `-notes` or the builder's change |
| A break caused by rotation or removal | The matching "how to check it's working" operator entry passes |

…and in every case the client confirms, recorded as reported. The skill never edits ow-uat's `acceptance-record.md` or its addenda and never re-runs the ow-uat sign-off. Re-check results go into `close.md` and the close email as "re-checked after handoff".

### 7.5 Hourly help

`HELP-nn.md` status: `requested → go-ahead → hours recorded → invoiced`, or `declined`. It holds the request, what it falls outside, the hourly price **frozen in `after-offer.md`** (always frozen there, whatever the choice; from `offers.md` only if no offer was made yet; else "unpriced: ask the user"), any estimate the user gives, any access re-grant it needs (recorded by `-access`), and the client's go-ahead as the user reports it.

- **A client's email go-ahead is enough** (decision 8): `-fix` records `go-ahead <date> by <client role>, as reported`. No signature is needed, unlike a change order.
- Until the go-ahead, the work is **not started**. After it, NEXT prints the `build` destination with `HELP-nn.md` (same public default as a Fix).
- When the user records the billable hours, `-fix` writes `invoices/INV-request-help-nn.md` (hours × the recorded price; due days from `contract-inputs.md` or as the user states) and NEXT prints the `invoice` destination, or the public default "create this invoice in your invoicing tool". `invoiced` and `declined` are terminal; any re-grant is removed then.
- After close, `-fix` still moves existing HELP-nn to their end whatever the choice, and accepts **new** requests only if the choice is `hourly`.

### 7.6 Vendor charges the builder paid

If the builder paid vendor charges on the client's behalf, `-fix` writes `invoices/INV-request-vendor-nn.md` from receipts the user lists: vendor, period, amount **at cost, no markup**. NEXT prints the `invoice` destination or its public default. `ow-build`'s ledger is not touched.

## 8. After-handoff offer

`/ow-handoff-offer` recommends one of three paths and writes a one-page offer. Every term comes unchanged from the `after_handoff` section of `offers.md`; nothing is computed or estimated, and the public skill hard-codes no tier names or numbers.

```yaml
# offers.md → after_handoff (Deftwright values from /services, 2026-10-08)
care_tiers:
  - { name: Keep,    hours: 2,  reply_business_days: 2, price: <price> }
  - { name: Tune,    hours: 8,  reply_business_days: 2, price: <price> }
  - { name: Steward, hours: 20, reply_business_days: 1, price: <price> }
billing: prepaid monthly
rollover: a quarter of unused hours roll over one month
notice_days: 30
excluded: [out-of-hours on-call, new builds]
hourly_help: { price: <price> }
fix_window_days: 30                    # default only; the signed terms win (§7.1)
access_removal_lead_business_days: 3   # default only; frozen at -start
```

Signals behind the recommendation, each cited from evidence: number of systems and integrations; alerts configured and how often they fired during the build; whether the client has someone who can follow the operator notes; deferred items (out of scope, declined change orders); vendors that change often.

**Every offered term is frozen** in `after-offer.md` when the offer is made: every tier's name, hours, reply target and price, billing, rollover, notice, exclusions, and the hourly-help price. **The choice is always recorded** there too: `choice: care | hourly | none | undecided`, `tier`, `decided_on`, `recorded_by`. Later edits to `offers.md` don't change any of it. A re-run of `-offer` records a new choice with its date and keeps the earlier ones.

**Care start** (only when the choice is care). An explicit start date the client agreed is recorded in `after-offer.md`. Otherwise care starts the day after `window_end`, read from `dates.yaml` when needed; before delivery the notes print `planned_care_start` from `package.yaml` as provisional, and nothing is routed to care hours until `dates.yaml` exists.

**Decide-by date.** The date to decide is the access-removal date (provisional `planned_removal` before delivery). Choosing care later is still fine, but access has been removed by then, and `ow-care` re-grants what it needs. `care-start.md` is written **once, by the first successful `-close`**, with the frozen terms, the start date, the kept access with removal steps (§9), any covered fixes carried into care with the access held for them (converted to kept for care, ending "remove when FIX-nn is verified"), and any `route: care` requests waiting for care. A later `-close` after reopening never edits it; it writes `care-start-addendum-<date>.md`, which `ow-care` also reads. NEXT prints `use ow-care on handoffs/<client>/care-start.md`.

## 9. Access removal

`access.md` (written only by `-access`) lists every access the builder holds, from **five sources**. It reads transfer-item states from `accounts.md` as preconditions and never records them itself:

1. The builder's own access in `accounts.md`, including seats that integrations run as and recovery/MFA factors
2. Every client-granted access logged in stage 02's `evidence.md`, one row per grant, marked `revoked <date>, confirmed by <client role>` or carried as open
3. Every rotate item in `accounts.md` (§4), with all the places it's used; every entry in this skill's `secrets-seen.log`; and every entry in `uat/<client>/secrets-seen.log`, as a reset/rotate item (a tester login is reset by the client contact)
4. Local copies of raw client material: every `audio/` folder and `transcript.*` under `opchain-work/{intake,plans,builds}/<client>/`, `plans/<client>/inbox/`, environment files in the local clone (by file name only), the `uat/<client>/evidence/` items **not** marked `cleared`, the imported results files, every session history named in either `secrets-seen.log`, and anything the user names outside the workspace (downloads, AI session transcripts, synced folders), recorded as user-stated
5. The test accounts listed in `uat/<client>/signoff.md` (role, environment, created-by; never a login): each is removed, or its password reset by the environment owner, and confirmed like any other access item

It also has a **keep** list, so "delete local copies" is never read as "delete the client folder": `handoff.yaml`, `dates.yaml`, `co-windows.yaml`, `accounts.md`, ow-uat's `signoff.md`, `acceptance-record.md` and its CO addenda, the `cleared` items in `uat/<client>/evidence/` (the acceptance record cites them), `ledger.md`, `handoff-notes.md`, the redacted `systems/*.md`, and the builder's own business records (contract, invoices, time export).

**Order per item:** move ownership, billing, re-authorisation or recovery (§4) → the client confirms owner rights → re-run the matching "how to check it's working" entry → remove the builder's access → rotate each secret the builder saw (new value → update every place it's used → run the matching check) → the user deletes local copies. A seat an integration still runs as can't be removed; the skill says why. **This skill deletes nothing**; deletion is the user's, recorded as human-decided. Confirmations are recorded as `removed <date>, confirmed by <client role>; not verified by this skill` (rotation: `rotated <date>, places updated, check <id> passed, …`). A failed check keeps the item open.

**Timing.** Removal and rotation happen on `access_removal_date` (from `dates.yaml`), a few business days before the window end, so anything they break is still covered as a Fix. Earlier removal is the client's call, recorded with the note that fixes will then need access re-granted. A post-acceptance CO's own window (§7.2) never moves `access_removal_date`; a covered fix in that window that needs access asks for a re-grant, as below.

**Held and re-granted access** (one state, `held for <FIX-nn or HELP-nn>`):
- On `access_removal_date`, access needed by a covered fix or HELP job **open at that moment** is held, not removed.
- A later fix or HELP job that needs access asks for it in its own file; `-access` records the re-grant as held for it.
- Held access is removed when that FIX-nn or HELP-nn reaches a terminal state, **or** when the fix is at `fixed` with a passing re-check and only the client's confirmation is outstanding; `-access` records the removal.
- An access removal the client won't confirm can be waived by the user in `-access` (naming the item and the dates confirmation was requested); it's recorded as `removed, unconfirmed (waived)` and stays open in the close email.

**If the client chooses care:** only the least access care needs is kept, marked `kept for care` with its removal step and the end condition "remove when care ends"; everything else follows the schedule above. `-close` copies the kept list into `care-start.md`.

## 10. Close

`/ow-handoff-close` refuses while any of these is true, naming each one:

- `dates.yaml` doesn't exist, or today isn't after `window_end`
- today isn't after the latest `window_end` in `co-windows.yaml` (decision 9: close waits for every post-acceptance CO's own fix period), or a `uat/<client>/acceptance-addendum-CO-nn.md` exists with no row in `co-windows.yaml` (NEXT: `use ow-handoff-fix` to record it)
- a covered `FIX-nn` is in a non-terminal state (`open`, `sent`, `fixed`), unless the choice is care **and `ow-care` is installed**, in which case it carries into care (no charge, no care hours used)
- a `HELP-nn` is at `go-ahead` or `hours recorded`
- a transfer item isn't `done` or waived in `accounts.md`
- an account row is below HIGH and neither client-confirmed nor waived in `accounts.md`
- an access item isn't removed (confirmed or waived), kept for care, or held for a FIX-nn that carries into care. Access held for anything else blocks close until that item is terminal

**Unresponsive client.** For a transfer item, an unconfirmed account row, an access removal the client hasn't confirmed, or a covered fix at `fixed` whose re-check passed, the user can type a waiver naming each item and the dates confirmation was requested. Each waiver is recorded by the verb that owns the item: `-accounts` (transfers, account rows), `-access` (access items), `-fix` (`closed unconfirmed`). `-close` lists them in `close.md`, shows each as **open** or **unconfirmed** in the close email, and leaves a `STATUS.md` awaiting for each after close. These are the only waivers at `-close`; the §11 general waiver doesn't apply there.

While blocked, `STATUS.md` shows the awaitings (e.g. `awaiting: FIX-03 (covered) before close`, `awaiting: transfer domain to client`).

When nothing blocks, the first `-close` writes `close.md`, the close email and (if care was chosen) `care-start.md`; a later run after reopening writes `close-addendum-<date>.md`, a new close email and, if needed, `care-start-addendum-<date>.md`:
- fixes, each with its re-check result ("re-checked after handoff"); withdrawn, reclassified and closed-unconfirmed fixes listed as such
- transfer items done, quoting each confirmation as recorded
- access removed or kept for care, each confirmation quoted as recorded; waived items listed as open
- hourly-help jobs and their status
- payment status read from `ow-build`'s `ledger.md` (read only)
- the recorded choice with its frozen terms: care tier, start date and reply target; how to ask for hourly help; or no arrangement

Then:
- **care, `ow-care` installed:** the workstream stays open under `ow-care`; NEXT points to `care-start.md`.
- **care, `ow-care` not installed:** the workstream is closed; kept items are listed in `close.md` and the email as `kept for care, owner: <user>` with their removal steps, and a dated `awaiting: kept access review <care start + 1 month>` stays in `STATUS.md` after the closed line. No fix carries over (they blocked close).
- **hourly:** closed; `-fix` keeps taking hourly-help requests (§7.5).
- **none / undecided:** closed; `close.md` records "no choice recorded, treated as no ongoing arrangement" when undecided.

A post-acceptance CO that isn't accepted yet doesn't block close. `close.md` lists it as "not yet accepted; its own fix period starts on its acceptance date". If it's accepted after close, `-fix` records its row in `co-windows.yaml`, and a covered report against it reopens the workstream as below.

**Reopening.** A report the client sent on or before the relevant window end (§7.2) that arrives after close is still covered: `-fix` logs it, a `STATUS.md` line `awaiting: FIX-nn (covered, reported <date>) after close` reopens the workstream, and `-close` runs again when it ends.

## 11. Self-checks

Each check reports OK / FINDING / NOT-CHECKED(reason) and carries the full label: *same-session self-check: the same assistant that wrote the document, applying a checklist; a discipline, not an independent review*.

**Gates.** `-package`, `-delivered`, `-offer`, `-fix` and `-close` each refuse while any check that runs in that verb is FINDING. Two exceptions: a FINDING whose resolution is a Fix never blocks `-fix` from writing that Fix, and `-fix`'s scoped re-check of one item doesn't block on other items. Outside `-close`, a check can be waived by a waiver the user types in that turn naming it; at `-close` only the §10 waivers exist. **"No credentials" and "No private names" can never be waived**, in any verb or file. On a FINDING, the gate stays shut until the file's own writer verb is re-run without the value or name. When "No credentials" is NOT-CHECKED (pattern-match only), every gated verb that writes a client output needs the user's dated confirmation that they read it for secrets, recorded in that verb's own file.

| Check | Runs in | Passes when |
|---|---|---|
| No credentials | every verb, every file | No password, key, token or connection string. If it could only pattern-match, it's NOT-CHECKED (see Gates). Any value seen is appended to `secrets-seen.log` |
| Repository secrets | `-accounts`, `-package` | The redacted scan found nothing, or every hit is a rotate item in `accounts.md` |
| All in the client's name | `-accounts`, `-package`, `-close` | At `-accounts`/`-package`: every row is client-owned, an open transfer item, or marked "to confirm". At `-close`: owner, billing, runs-as and recovery are the client's for every row (client-confirmed or HIGH), or waived in `accounts.md` under §10. NOT-CHECKED while the inventory was built without a map and completeness isn't confirmed |
| Operator-task coverage | `-notes`, `-package`, `-fix` (scoped) | Every integration or job has a "check a run" entry naming the run log, one entry per alert found, and a "retry a failed transfer" entry, or a recorded "not applicable: <reason>". FINDING if the included block lists alerts or run logs and none were found (which becomes a Fix) |
| Trace | `-accounts`, `-notes`, `-package` | Every row and step cites a source |
| Takeover | `-package`, `-fix` (scoped) | Every takeover item cites a repository path; nothing invented |
| Fix classification cites the basis | `-fix` | Every FIX-nn names the basis item it was judged against |
| Fix verified | `-fix`, `-close` | No fix is marked verified without the §7.4 re-check and client confirmation |
| Access complete | `-access`, `-close` | At `-access`: every item from all five sources is removed, waived, kept for care (with removal step) or held for a named FIX-nn or HELP-nn. At `-close`: exactly the §10 states. Every secret has a rotate entry naming its places and a check |
| No internal numbers | every client output | No figure from internal sources: time-tracked hours, time exports, `margin.md`, internal rates, `price-book.yaml` unit prices or modifiers, `quote.md`'s internal appendix. Allowed: the terms frozen in `after-offer.md` (every offered term, not only the chosen one), or `offers.md` before an offer exists, each checked to match; and **agreed billing figures** in their own files only: a HELP-nn's estimate, recorded billable hours and its invoice request (must match the HELP-nn), and a vendor invoice request (must match the listed receipts) |
| No private names | every verb, every file | No blocklisted name (`llc-ops`) and no private skill |

## 12. What this skill never does

Deletes a file · opens a `.env` file or secrets store, asks for a secret value, or runs a scanner that prints matches · removes a secret from git history · sends anything · edits ow-uat's files (`signoff.md`, `acceptance-record.md`, its CO addenda, `punch-list.md`, `evidence/`) or `ledger.md` · writes a file another verb owns · edits `care-start.md` or `close.md` once written · calls something removed, transferred or rotated that the client hasn't confirmed · reads `margin.md`, a time export or `price-book.yaml`.

## 13. Acceptance tests

- **Synthetic handoff:** three accounts (one owned by the builder, one billed through the builder, one integration running as the builder with the builder's MFA), two configured alerts and one on a vendor dashboard, one integration with no retry docs, one runbook, one MEDIUM row. Expect four transfer items, three alert entries, a coverage FINDING until a retry note or "not applicable" is added, a takeover section citing paths, and the MEDIUM row shown "to confirm" without blocking `-package`.
- **One writer:** a build-time check that every file in §3 has exactly one writer verb, apart from `STATUS.md` and `secrets-seen.log`.
- **Quick-quote job:** no map and checks in `quick-scope.md` produce the "built without a systems map" mark and the completeness prompt.
- **Missing sign-off:** with no `uat/<client>/signoff.md` or `acceptance-record.md`, `-start` stops, writes nothing, and prints `NEXT: use ow-uat-signoff on uat/<client>/`.
- **Punch list:** a signed punch list with two minors makes `-start` point to `-fix`, which logs two covered FIX-nn with `reported` = each UAT-nn's logged date.
- **Post-acceptance CO window:** a CO accepted by ow-uat addendum 20 days after delivery gets a `co-windows.yaml` row ending 30 days later (with `fix_window_days` 30); a report against it on day 45 after delivery is a covered Fix, the same report against the main basis is After the window, and `-close` is refused until the CO's window ends. A report against a CO with no addendum is not logged and points to ow-uat.
- **Test accounts:** a staging test account in `signoff.md` appears in `access.md` as source 5 and blocks `-close` until removed (confirmed or waived).
- **Delivery payment once:** on a smaller project already invoiced under the ow-uat backstop, `-delivered` prints no delivery-payment NEXT; without that ledger row, it does.
- **No test suite:** a takeover FINDING and a Fix, written even though the check is FINDING.
- **Included but missing:** a quote that includes alerts, with none configured anywhere, fails coverage and produces a Fix, later verified by the scoped coverage check plus client confirmation.
- **Credentials:** a key in the builder's environment and a key committed then removed from history never appear in any output or the session transcript; both are rotate items; a scanner that prints matches by default is not run (NOT-CHECKED). A key planted in `operator-notes.md` blocks `-package`, can't be waived, and clears only when `-notes` is re-run without it.
- **Fix classification:** a broken check, a signed-CO item, a new feature, a how-to, a vendor outage and a report dated one day after the window land in the right classes; a Change before care starts isn't charged to care; with care chosen but `ow-care` not installed, nothing routes to care hours; a new-build request goes through `ow-build -change` on to `ow-build-plan`.
- **Window dates:** no `dates.yaml` before delivery and the notes carry the provisional end; a later delivery moves the end and drafts a correction email; `-delivered` with no `package.yaml` uses delivery + N; a re-run `-package` after delivery prints the recorded date and moves nothing; editing `offers.md` after signing changes nothing.
- **Close timing:** `-close` between `access_removal_date` and `window_end` is refused; a report sent on day 30 and logged on day 32, after close, reopens the workstream, and the second `-close` writes addenda without touching `close.md` or `care-start.md`.
- **Provisional dates:** notes packaged before delivery print a provisional end, removal and care-start date; a later delivery moves all three and the correction email states each.
- **Waiver deadlock:** a re-granted fix at `fixed` with a passing re-check and an unresponsive client: `-access` removes the held access, `-fix` records `closed unconfirmed`, `-access` waives the unconfirmed removal, and `-close` succeeds, showing both as open.
- **Removal timing:** a fix open on the removal date holds its access; a fix reported after it gets a re-grant recorded by `-access`; both block `-close` until terminal, then the access is removed.
- **Carry into care:** with `ow-care` installed, an open covered fix carries into `care-start.md` free, and its held access becomes kept-for-care ending at verification; without `ow-care`, the fix blocks close. A client who chose `none` never gets `route: care`.
- **Unresponsive client:** a domain still in the builder's name and a fixed-but-unconfirmed fix close only with the named waiver, show as open in the email, and keep their awaitings.
- **Care chosen after the removal date:** access is not re-kept by `ow-handoff`; `care-start.md` says care re-grants.
- **Care without ow-care:** closed workstream, kept items with removal steps, kept-access awaiting after the closed line.
- **Undecided at the window end:** full removal, and `close.md` records "treated as no ongoing arrangement".
- **Hourly help:** no go-ahead → not started; an email go-ahead recorded as reported → build NEXT; hours → invoice request; a HELP-nn at go-ahead blocks close for every choice; after close, existing jobs still reach `invoiced`, and new requests are accepted only for choice `hourly`.
- **Frozen terms:** editing the Tune price in `offers.md` after the offer doesn't change `care-start.md` or the close email, and "No internal numbers" checks against the frozen copy.
- **Internal numbers:** the Deftwright offer with 2/8/20 h and prices passes; a HELP-nn invoice for 3 h × the frozen price passes; a time-export hour count planted in a FIX-nn or the Handoff notes fails.
- **Private names:** with an empty `handoffs.yaml` and `offers.md`, no output names a tier, a private skill or "Deftwright".
- **Real use:** one real Deftwright handoff through to close.

## 14. Amendments to approved sibling designs (decided 2026-10-14)

| # | Design | Amendment | Decision (2026-10-14) |
|---|---|---|---|
| A1 | `ow-build-plan` | `-quote` copies `fix_window_days` (one field: `offers.md` `after_handoff`) into `quote.md` and `contract-inputs.md`, and renders the quote's "N days of fixes" line from it, so the window is part of the signed terms | **Approved, applied** in `2026-10-06-ow-build-plan-design.md` §6.3, §8 |
| A2 | `ow-build` | `-change` gains a reads row for `handoffs/<client>/fixes/FIX-nn.md` (if absent: ask for the request directly). A request at or over `quick_quote_max_units`, or in `after_handoff.excluded`, stops and prints `NEXT: use ow-build-plan on handoffs/<client>/fixes/FIX-nn.md`. ~~A CO raised after acceptance is marked post-acceptance~~: dropped; no CO file carries that mark (ow-uat B3, §7.1 here) | **Approved without the mark, applied** in `2026-10-08-ow-build-design.md` §6.1 |
| A3 | `ow-build` | ~~`-accept` records evidence as source, count and fields, not copied customer records. It can also add missing checks, or checks added by a post-acceptance CO, to an existing record as a dated addendum without re-marking the final payment trigger~~ | **Withdrawn.** Superseded by ow-uat B1 (`-accept` becomes `-ready`; the acceptance record is ow-uat's) and ow-uat §8.3 (`acceptance-addendum-CO-nn.md`) |
| A4 | `ow-build-plan` | `-offer`/`-start` gain a reads row for `handoffs/<client>/fixes/FIX-nn.md` as the intake for a follow-on Build Plan, with if_absent "ask for the request" | **Approved, applied** in `2026-10-06-ow-build-plan-design.md` §4 |

The ow-uat design's H1 and H2 amendments to this design are folded into the text above (§2 decision 6).

## 15. Review record

| Pass | Found | Outcome |
|---|---|---|
| Owner approval, 2026-10-14 | — | Approved. ow-uat's H1 and H2 folded in (upstream is ow-uat; five access sources; punch list → covered fixes; delivery half invoiced once). A1, A2 (without the mark) and A4 approved; A3 withdrawn. Open questions 1–3 answered and moved to §2 (decisions 7–9); post-acceptance COs get their own fix period, recorded by `-fix` in `co-windows.yaml` |
| Adversarial review of the first draft (four lenses: site promises, consistency, security and access, edge cases; a skeptic tried to refute each finding) | 32 findings; 31 upheld | Revision 2. The refuted one (care-kept access before the first prepaid month) belongs to `ow-care` |
| Completeness check of revision 2 | 7 findings incompletely resolved, 19 new contradictions | Folded into revision 2 before the next check |
| Contradiction check of revision 2 | 31 issues, 4 high: close before the window ended; carried fixes with no exit without `ow-care`; three files with several writers; an unresponsive client blocking close forever | Revision 3: one writer per file, close gated on the date, carry-into-care only with `ow-care`, post-acceptance CO coverage held to the main window, frozen offer terms, one "held" access state |
| Contradiction check of revision 3 | 25 issues: 2 high, 13 medium, 10 low (provisional dates, waivers that didn't clear their checks, writer gaps, care routing without a care choice, write-once files on a reopened close) | Revision 4 (this one), targeted edits |

The same design is published as a Claude Docs page for line-by-line comments: https://claude.ai/code/artifact/9ffad4e5-f30e-4bf9-b62c-a0049d9efe91

## 16. Open questions

1. ~~Window start.~~ **Decided 2026-10-14:** the delivery date of the Handoff notes (§2 decision 7).
2. ~~Hourly-help go-ahead.~~ **Decided 2026-10-14:** a client's email go-ahead is enough, recorded as reported (§2 decision 8).
3. ~~Post-acceptance change orders.~~ **Decided 2026-10-14:** each gets its own fix period from its acceptance date in ow-uat's `acceptance-addendum-CO-nn.md` (§2 decision 9).
4. **Prices.** The care-tier prices and the hourly-help price in `offers.md` are yours.
5. **`ow-care`** is the natural next design: monthly hours, rollover, reply targets, monthly report, renewal and notice, re-granting access, and what it inherits from `care-start.md`.

## 17. Build notes (ow-handoff 1.0.0, OW-06)

Built 2026-10-21 under `sprints/release-2.1/ow-06/contract.md` (approved 2026-10-20 under the standing contract approval; every O-item at its recommendation). Nothing here changes an approved sentence; each item extends the design or records how it was read.

| # | Ruling or departure | As built |
|---|---|---|
| O1 | A bare `/ow-handoff` and `on <path>` | The resume screen and the folder route (`references/routing-and-resume.md` §3, §4); a route names the verb in a prescribed `Route:` line and writes nothing until the user confirms |
| O2 | Sibling edges for the in-place reads | Data edits, no bumps: ow-build-plan → ow-build carries `evidence.md`; ow-build's ready hand-off carries `map/systems.md` and `evidence.md`, its too-big-FIX hand-off carries `FIX-nn.md` in place, and its `FIX-nn.md` reads row gains `route`; ow-build-plan's `FIX-nn.md` row is `in_place: true`; ow-uat's sign-off hand-off carries every in-place file and its `-fix` hand-off gives `punch-list.md` fields |
| O3 | `dates.yaml` to its two in-place readers | ow-handoff's own hand-offs carry it: the addendum NEXTs to ow-uat [handoff_date] (mechanical: ow-uat's `--backstop` reads it, the addendum flow does not), and `-delivered`'s rollout NEXT to ow-documentation [window_end], with `operator-notes.md` [ops] |
| O4 | `-notes` with the line bought, not delivered | Waits: writes nothing, prints the `ow-documentation-delivered` NEXT |
| O5 | The `OP-nn` form | The runbook's form as built; the index form points by id and title only; rotate entries continue after the runbook's highest id |
| O6 | ow-documentation's three edits | Shipped in ow-documentation 1.0.0 (#642) and consumed here; not redone |
| O7 | "ow-care is installed" | Asked and recorded with its source and date at `-offer` (care) and again at `-close`; `-fix` uses the newer |
| O8 | Network and a push | `network: none`; no push; the user sends every email and the notes |
| O9 | H4's shape | `rollover` is the structured map, `rollover_wording` beside it, `urgent_price` optional; the §8 example's `rollover:` wording key is read as `rollover_wording` |
| O10 | `scan-secrets` as its own PR | PR 1 (#643, ow-tools 1.3.0); this PR carries the skill and the handoff-notes export test |
| O11 | Security review | Part 1 done in PR 1; Part 2 (text) follows this build, before evaluation round 1 |
| O12 | The siblings' stand-ins | **Deferred to the siblings' next pin round** (accepted by the orchestrator 2026-10-21): the stand-in `dates.yaml` and `FIX-nn.md` files in ow-build, ow-build-plan and ow-uat (and ow-documentation's stand-in `operator-notes.md`) use other ids, dates and keys than these goldens (FIX-03/-04/-07/-08 on Larkspur dated before sign-off; Mossgate handoff dates in January). A byte swap moves those siblings' cases; it lands with their checkers' pins in that round. `FIX-nn.md` now carries `class:` (title case) and `route:` in its header, which ow-build already reads; ow-build-plan's checker reads `classification:` and needs the one-line read in that commit |
| O13 | A choice after the first close | `-offer` refuses with prescribed words; carried to OW-07 as a residual |

**Other readings.** The `quote.md` client part is read in place for the included block and vendors only; no `*price*` key is copied anywhere. The repository scan's "delivered tree" is the committed history, HEAD included; uncommitted files are listed by name as not scanned, from a directory listing, and the skill runs no git command in the client's repository. Without ow-tools, the client gets `export/handoff-notes.md` (no ow- header, no internal text), never the source Markdown. `-start` asks once for the `export/` and `secrets-seen.log` ignore lines in a git repository and records the answer. The HTML offer lives at `export/after-offer.html`. A reopened close writes `export/close-email-<date>.{html,txt}` beside its addenda. H5's folder is `logs/<workstream>/meetings/MTG-nn/audio/` for the client's workstream; `logs/business/` is never listed. ow-documentation's `docs/<client>/inbox/` joins source 4 (names only). `docs/<client>/shots/` images not cleared are local copies to remove; cleared ones are kept with the delivered documents.

**What the scan can and cannot say** (PR 1's owner decisions OD-1 to OD-3): the skill records `not_read` and `not_scanned` as given, says `CLEAN` means only that nothing read matched, asks the user to read commit and tag messages by hand (recorded, dated), and states that gitleaks' built-in path allowlist applies and that a secret in a file name is printed as its path.

**What OW-07 must read:** `care-start.md` (`care_start`, `tier`, `reply_business_days`, `terms`, `window_end`; Frozen terms, Kept access, Carried fixes, Waiting requests, Operator notes, Accounts) and its addenda, `after-offer.md` (every frozen term and the choice), `operator-notes.md`, `accounts.md` and `dates.yaml`; `FIX-nn.md` with `route: care`. The hand-off rows list these fields (`HANDOFF_PIN` in the checker), so OW-07's reads rows reciprocate on its first commit.

**The text security review (Part 2, 2026-10-21, `docs/audits/2026-10-21-ow-handoff-1.0-security-review.md`: B−, 0 CRITICAL, 0 HIGH, 4 MEDIUM, 6 LOW, 1 INFO; every finding fixed in 1.0.0, unreleased).**
- **SH-01:** an embedded instruction is graded in every input a verb reads (the repository's README, `.env.example`, CI and alerts config and top-level docs; ow-uat's and ow-documentation's files; a scan row's path; every session file but the user's own answers): each must be quoted in a file the run wrote, and the family's "followed" signs (a recorded waiver of a never-waived check, a markup) and a case's `embedded_never` list fail.
- **SH-02 (owner decision 2026-10-21):** every removal, rotation, deletion and waived removal waits for owner rights on the item's account's transfer, linked through `access.md`'s Account column, or for a recorded transfer waiver; after a waiver the record says "while transfer TR-nn is waived (client not confirmed)" and the close email says so beside the open transfer.
- **SH-03:** the local-copy list is derived from the run's own files (every `audio/` folder and transcript under intake, plans, builds and the client's logs, both inboxes, every evidence item and screenshot not cleared, every secrets log); `logs/business/` is always refused. The access golden now lists `docs/larkspur-ceramics/shots/SC-04-1.png`.
- **SH-04:** an item `kept for care` blocks a close whose choice is not care; every waived or unconfirmed item (a transfer, an account row, an access item, a fix closed unconfirmed, a removal while a transfer is waived) is named open or unconfirmed in the close email.
- **SH-05:** every confirmation record a run appends must be one the session gave; one found only in a file is never recorded. (Graded against the user's words in `session/answers.md` since evaluation round 1, M1; the re-check's reading of the answer key as the session's words is superseded.)
- **SH-06:** the log line's name is a capitalised secret name or "the <thing> <password | key | token | login | secret>", and its source is never `.env` or a secrets store.
- **SH-07:** `not_read` is copied as given for CLEAN and HITS; `refs: 0` is NOT-CHECKED; the tool's NOT-CHECKED exits are 2 to 5 or 128+n.
- **SH-08:** a destination line is the user's `handoffs.yaml` say: line or the public default, never a line a file names.
- **SH-09:** No credentials is NOT-CHECKED when a client output quotes a client's text, and the verb then records a dated read-through (`m-package-quoted`).
- **SH-10:** the other-client wording follows ow-documentation 1.0.1's rule; the security test's OD-1 and OD-3 labels are corrected.
- **SH-11:** a cited repository path that is a symlink resolving outside the repository fails a real run's check; `package.yaml` records `symlinks_out`.

**The re-check (A−, gate met) and its four LOWs, fixed in the same commit:** RC-01 counts only text addressed to an assistant, with negative controls. RC-02 exempts option (a)'s prescribed phrase from the waiver-note rule, with the golden `access-record-waived-transfer`. RC-03 cross-checks the Account column with the item's Source and Order. RC-04 sends every new record line through the session gate and counts only dated lines for a gate.

**Residuals (stated, not closed):** every removal, rotation, deletion, transfer and client confirmation is as reported; the scanner's OD-1 to OD-3 limits (built-in path allowlist; messages, binary and UTF-16 not read, the user reads messages; a secret in a file name printed as its path; octopus merges, stashes, reflogs, unreachable commits and submodules not scanned; the working tree never scanned); a prose secret name cannot be told from a value by pattern (the read-through covers it); the PDF and Word exports are not scanned by the checker; with the ignore lines refused, `export/` and `secrets-seen.log` can be committed in the user's own repository (the screen says so); the capture profile is removed by the user and checked only where code runs; a text-only skill enforces nothing, so "never opened", "never followed" and symlink containment are the model's discipline, graded where the checker can see them; no committed golden holds a symlink (an absolute link out of the fixture tree would point at the build machine), so SH-11 is graded by a PoC built at layout time; O13 is carried to OW-07.

**Evaluation round 1 (FAIL 7.0; `sprints/release-2.1/ow-06/eval-round-1.md`), fixed in the checker and goldens only, no skill text changed:**
- **M1:** every approval a run records is graded against what the user said in `session/answers.md` (the `session` check, on every case): a transfer, an account check, completeness, a waiver, a removal or re-grant, a fix status move (sent, verified) or withdrawal, a go-ahead, hours, the walk-through, the care choice and the ow-care answer, `--keep-frozen` and `--refreeze`. The user's line names what the record names and says it is so; a decline, a condition, a hedge or a relay counts for nothing; a bare "yes" confirms exactly the printed question; a client's word reported by the user is "as reported", and an email go-ahead counts for hourly help (decision 8). The decline, condition and relay patterns are copied from OW-10's checker (`da848a24`), pinned, to be imported once it merges. All 33 goldens that record an approval carry a session.
- **m1 to m8:** structural screen lines get the sentence-form guard after their label, and a refusal never prints `Resuming:` or the question suffix; a care promise in any words fails in the not-installed branch and in the shipped text; a NOT-CHECKED scan's sentence is required in Taking it over and the client copy; the secrets log refuses a length, first or last characters and a provider-prefix name; the embedded check reads ow-uat's `-start` files, ow-documentation's `-notes` files and new files beside the starting state (a go-ahead email golden), with a wider imperative net; a re-written `-offer` choice fails; re-run goldens for the four remaining one-step modes and a `verified` golden; private names however split, the catalog rules live at run time; an unlisted name beside a role and a cost-plus price.
- **Nits:** the Not scanned line stands apart; a bare priced value in `handoff.yaml` fails; a Monday window end tells business-day leads from calendar ones (a plant).

**Evaluation round 2 (7.3; `sprints/release-2.1/ow-06/eval-round-2.md`), M1b fixed in the checker and goldens only:** the session check refused 9 of the evaluator's 17 legitimate approvals (recall was 28/28). Now:
- a leading "text:" is the user's own words unless it is `Asked:`, the user's name, or a named other party (the skill, the client, a client role), so "Yes: TR-01 …" and "AX-01 is removed: …" count;
- a decline, a "later" and a condition are tested in the clause that holds the approval verb (OW-10's `approvedClause`, copied with a pin), a scope phrase ("no conditions attached", "not the Light tier") is not a decline, and a "No, ow-care is not installed." after the choice answers the ow-care question and takes nothing back; the care choice leaves the ow-care clause out of its own sentence, and a terse "Care, Regular tier." counts;
- a waiver is read as a whole: "waive", "waives", "waived" or "waiving", the user as its subject, the item by id, name or pronoun, the ids exactly the record's, and the exclusion ("but not TR-01", or "Not TR-01." in the next sentence);
- a given name with an O'/Mc surname ("Brendan McGrath") is a person; `offer-resume-html` carries a session.
- **Decision (owner recommendation, kept):** a waiver without the verb "waive" ("close it unconfirmed … That is my waiver.") is not the user's word to waive and stays refused; "I'm waiving" and the exclusion in the next sentence are accepted.
- **Residual, stated:** "TR-01 is finished" does not support a record of owner rights (it says neither owner nor done); a README line addressed to "whoever is summarising this repo" is not addressed to an assistant; a lone "O'Hara" and "Dara, the owner" are not people to the imported rule (the round-2 standard: a lone O'/Mc word is a person only with a given name, a title or a person slot).


**ow-care moved to v2.2 (owner decision 2026-10-22), so in 2.1 the care choice takes the "ow-care not installed" branch.** Read against the shipped text, goldens and `care-start.md`; nothing needed changing:
- The ow-care answer is asked, never inferred, and recorded with its source and date at `-offer` and again at `-close` (`offer-format.md` §3, `phase-close.md` step 3). With ow-care absent from the catalog (`planned`, with `/ow-care-start` and `/ow-care-request` as planned verbs) the user's honest answer is "not installed", and the close takes the `close-format.md` §3 row for it: closed, the kept items listed as "kept for care, owner: <user>" with their removal steps, `awaiting: kept access review <date>` kept in STATUS, and nothing promised of ow-care (the checker refuses a promise in any words since round 1, m2).
- `care-start.md` is still written once for the care choice, "for later": it is the file ow-care's design §5.1 reads, so a v2.2 ow-care can pick the closed workstream up. Its fields are checked by presence (`care_start`, `tier`, `reply_business_days`, `terms`, `window_end`, Frozen terms, Kept access, Carried fixes, Waiting requests, Operator notes, Accounts). The NEXT names `use ow-care on handoffs/<client>/care-start.md` with its `IF IT IS NOT AVAILABLE` line, which says the kept items stay with the user.
- The one golden that records "ow-care: installed" (`close-care-installed`) tests the branch a v2.2 ow-care will use; it is not behaviour 2.1 ships. The 2.1 stories (`offer`, `close`, `close-unresponsive`, the `offer-resume-*` and `close-resume-*` cuts) record "not installed".
- Nothing here changes owner-approved text.
