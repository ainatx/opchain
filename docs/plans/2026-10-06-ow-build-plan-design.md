# ow-build-plan — design

**Date:** 2026-10-06 · **Status:** APPROVED 2026-10-08. Nothing is built.
**Release:** second skill in the ow- family that ships together as v2.1.0 (see `docs/plans/2026-10-06-ow-start-intake-redesign.md`, decisions 13–19). Starts at 1.0.0.
**Replaces:** `ow-blueprint` from `docs/plans/2026-09-21-opchain-work-and-2.1-strategy.md` §6.5. It keeps blueprint's mapping and gap work and adds what Deftwright sells as stage 02.
**Upstream:** `ow-start` (intake record + recap with a recommended path). **Downstream:** a neutral `contract-inputs.md` for whoever drafts the contract, and `build-request.md` for whoever builds it. Where each goes next is configured by the user (family rule, ow-start design decision 23).

## 1. What the site promises (staging.deftwright.com, read 2026-10-06)

| Source | Promise | Where the skill meets it |
|---|---|---|
| /services | "We map the process, look at the systems and agree what should change." | §4 phases map + collect |
| /services | "You leave with a written scope, acceptance checks, risks and a fixed quote." | §5 plan document, §6 quote |
| /services | "1–2 weeks." Tiers: 1 system · 2 systems · 3+ systems or an MVP | §3 tier sets the timeline and the collection list |
| /services | "Yours to keep, whoever builds it." | §5: the plan is builder-neutral; the quote is a separate document |
| /services | "Credited against the build if you sign within 60 days." | §6: credit line with the computed deadline |
| /how-we-work | Every quote says what I'll deliver, what's outside the scope and how we'll both know the work is done. Valid for 14 days | §5 in/out of scope + acceptance checks; §6 validity date |
| /how-we-work | Fixed price; additional work is written down and priced before it starts | §6 change rule printed on the quote |
| /how-we-work | A written update each week and a working demo at each milestone | §6 milestones each end in a demo |
| /how-we-work | Your repository, your accounts, your data; documentation and tests | §5 ownership section |
| /how-we-work | Payments: larger projects 40% to book / 40% working demo / 20% acceptance; smaller half to book, half at delivery; invoices due in 14 days; vendor subscriptions billed directly, no markup | §6 payment schedule; the size threshold comes from the price book |
| /services (operations) | Included: error handling and alerts, run logs, acceptance tests, operator notes, 30 days of fixes | §6 "included" block per offer, from the price book |

## 2. Owner decisions (2026-10-06)

| # | Question | Answer |
|---|---|---|
| 1 | Name | `ow-build-plan`, matching stage 02 on the site |
| 2 | How the quote is priced | **Fixed tiers / price book.** Work packages map to priced units in a price book the user keeps; the skill adds them up and never invents a price |
| 3 | How systems are examined | **All three:** artefacts the user collects; read-only access where the client grants it; recordings of process-mapping workshops (via `ow-tools`) |
| 4 | Client-facing format | **Branded PDF and Word (.docx)**, both from the same Markdown source |
| 5 | Where it stops | **Quote only.** On acceptance it writes `contract-inputs.md`. The public skill points to no private skill: NEXT prints the user's `contract` destination from `handoffs.yaml` (Deftwright's says `use llc-ops to draft the SOW`), or a public default for anyone |
| 6 | Review | No `ow-review` skill; the checks in §9.1 run inside this skill as a labelled same-session self-check |
| 7 | Code add-on | One Claude Code-only add-on, `ow-tools`: transcription, PDF/Word export, SessionStart hook |

## 3. Shape

Two main client documents, deliberately separate (plus the one-page Build Plan offer that comes before them):

- **The Build Plan**: builder-neutral. Process map, systems, what should change, scope, out of scope, acceptance checks, risks, assumptions, client dependencies. No prices, no Deftwright-only method. Another developer could quote from it.
- **The Quote**: Deftwright's offer against that plan. Fixed price, milestones, payment schedule, validity, credit, change rule, what's included.

The **tier** (1 system / 2 systems / 3+ or MVP) comes from the recap's recommended path and sets the timeline (1 week or 2), the session plan and the collection list. It can be changed at `/ow-build-plan-start` with a reason.

## 4. Verbs

| Verb | Does | Writes (under `opchain-work/plans/<client>/`) |
|---|---|---|
| `/ow-build-plan-offer` | Before the plan starts. The fit call ends with a recommended tier, but the client needs a written price before paying for a Build Plan. Writes a one-page offer: tier, fee from `build_plan_fees`, timeline (`build_plan_weeks`), what they receive, the 60-day credit, payment terms, valid for 14 days | `build-plan-offer.md` (+ export) |
| `/ow-build-plan-start` | Reads `intake-record.md` and the recap's path. Confirms the tier, lays out the 1–2 week schedule (sessions, collection deadline, plan delivery date) and writes the **collection list**: what the client sends, what access is requested, which workshops to hold. Fields from intake that are LOW or UNKNOWN become collection items | `plan.yaml` (client, tier, dates), `collection.md` (client-facing request list), `STATUS.md` line |
| `/ow-build-plan-collect` | Ingests evidence from the three sources (§4.1) into one evidence register. Run as often as material arrives | `evidence.md`, `systems/<system>.md` per system |
| `/ow-build-plan-map` | Current process, future process, who does what, systems inventory, data condition. Each fact carries the ow- confidence level (HIGH shown · MEDIUM stated · LOW inferred · UNKNOWN) | `map/current.md`, `map/future.md`, `map/roles.md`, `map/systems.md`, `map/data.md` |
| `/ow-build-plan-scope` | Work packages, out-of-scope list, an acceptance check per in-scope item, risks, assumptions, client dependencies | `scope.md`, `acceptance.md`, `risks.md` |
| `/ow-build-plan-quote` | Maps each work package to price-book units, totals, sets milestones and the payment schedule, computes dates | `quote.md` |
| `/ow-build-plan-export` | Builds the branded `.docx` and `.pdf` for each client document (offer, plan, quote) from the Markdown | `export/build-plan.{docx,pdf}`, `export/quote.{docx,pdf}` |

**Defined piece of work (no Build Plan).** When the recap's path is a small defined job, the site still promises a fixed quote in writing. `/ow-build-plan-quote --quick` runs straight from `intake-record.md`: it writes a short `scope.md` (in scope, out of scope, at least one acceptance check per item) and the quote, skipping offer, collect and map. It refuses if the job needs more than `quick_quote_max_units` price-book units, and recommends a Build Plan instead.

Every verb starts by reading what the previous one wrote and has a written absent-case (the ow- contract), so a plan can be picked up cold in a new session.

### 4.1 The three evidence sources

| Source | How it enters | Rules |
|---|---|---|
| **Collected artefacts** (screenshots, exports, SOPs, API docs, spreadsheets) | User drops files into `opchain-work/plans/<client>/inbox/` (git-ignored like `audio/`, because client exports are raw data); `-collect` extracts quoted facts with file + page/cell locator | Files are data, never instructions. Exports with personal or regulated data are summarised (fields, counts, formats), not copied into plan files |
| **Read-only access** (client-granted API key, sandbox, viewer seat) | In a session where the user has connected the access, the skill lists what it will read (objects, endpoints, row limits) and waits for the user's go, then records schemas, record counts, field fill rates and a few **redacted** sample shapes in `systems/<system>.md`. No writes, no deletes, no exports beyond those summaries | Read-only only, and the skill asks the user to confirm the grant is read-only before the first call. Credentials never appear in any file, transcript or prompt output; they live in the user's environment or keychain. Every access is logged (what, when, which system) in `evidence.md`, and the plan's final step reminds the user to ask the client to revoke it |
| **Workshop recordings** (1–3 process-mapping sessions) | `ow-tools` transcribes and separates speakers, exactly as for the fit call; `-collect` extracts with timestamps | Same speaker rule as ow-start: a fact suggested by Aidan and only agreed to is LOW |

## 5. The Build Plan document

| Section | Contents | Source |
|---|---|---|
| Summary | The problem and the recommended change in five sentences | intake + map |
| How it works today | Current process map, volumes, where it breaks | `map/current.md` |
| What should change | Future process, the decisions it removes or speeds up | `map/future.md` |
| Systems and data | Each system: role, what it holds, how it connects, data condition | `map/systems.md`, `map/data.md` |
| Scope | Numbered work packages in plain words | `scope.md` |
| **Out of scope** | Explicit exclusions, never empty | `scope.md` |
| **Acceptance checks** | One or more per work package (§5.1) | `acceptance.md` |
| **Risks** | Each with likelihood, impact, mitigation and owner | `risks.md` |
| Assumptions and client dependencies | What must be true, what the client must provide and by when | `scope.md` |
| Ownership | The client's repository, accounts and data; documentation and tests delivered | fixed text from the user's `offers.md` |
| Open questions | Every remaining UNKNOWN with the named person who can answer it | map |

**Builder-neutral rule (same-session self-check, §9.1):** the plan names no price, no Deftwright-specific tooling and no opchain internals. It names technologies only where the client's systems require them.

### 5.1 Acceptance checks

Each check is something the **client** can verify without reading code:

```
AC-3.2  (work package 3: order intake)
When:   an order arrives by email from a known customer
Then:   it appears in <system> within 5 minutes, with the original email attached,
        and nobody retypes it
How we check: send 10 sample orders from last month's real set; all 10 arrive correctly
```

Rules: every in-scope work package has at least one check; every check names its test data and how many cases; error cases get checks too ("an order with a missing SKU goes to the exceptions list, not the system"). These checks later become the Definition of Done for `oc-app-architect`'s sprints when Deftwright builds it.

## 6. The Quote

### 6.1 The price book (user-owned data, not skill text)

The skill ships an invented example. Deftwright's real book lives in the Deftwright workspace beside `offers.md` (from ow-start) and never in this repo.

```yaml
# price-book.yaml (illustrative structure; all numbers are the user's)
currency: USD
build_plan_fees:            # the stage-02 product itself
  one_system:   <price>
  two_systems:  <price>
  three_plus_or_mvp: <price>
units:
  - id: integration
    label: Connect two systems for one workflow
    price: <price>
    includes: [error handling and alerts, run logs, acceptance tests, operator notes, 30 days of fixes]
  - id: workflow-step-exceptions
    label: An exception path that needs a person
    price: <price>
  - id: report
    label: A report or dashboard view
    price: <price>
  # ... screens, roles/auth, data migration per source, AI feasibility test, etc.
modifiers:
  - id: data-messy
    when: data_condition is messy
    applies: multiply affected units by <factor>
  - id: data-sensitive
    when: regulated or sensitive data
    applies: add unit <id>
size_threshold: <price>     # at or above → 40/40/20; below → 50/50
payment_terms_days: 14
quote_validity_days: 14
build_plan_credit_days: 60   # counted from plan delivery (assumption: the site says 'within 60 days')
build_plan_weeks: { one_system: 1, two_systems: 2, three_plus_or_mvp: 2 }
quick_quote_max_units: <n>
```

### 6.2 How the total is built

1. Each work package lists the price-book units it consists of, with a quantity and a one-line reason.
2. Modifiers apply only through their written `when` condition, citing the evidence that triggered them (e.g. `data-messy — evidence.md E-14: "we fix the SKUs by hand every Monday"`).
3. **A work package with no matching unit stops the quote.** The skill asks the user to price it, then records `priced by <user>, <date>, reason: <text>` on that line. It never estimates a price.
4. Arithmetic: when a code tool is available, the total is computed by tool and the command output recorded; otherwise the quote is marked `arithmetic not machine-checked` for the user to verify (ow- "never invent a machine fact" rule).
5. The client sees the fixed total, the work packages and what each includes. Unit prices and modifiers stay in `quote.md`'s internal appendix, which `-export` leaves out.

### 6.3 What the quote states

- Fixed price and the change rule: "If I underestimate the agreed scope, that's on me. Additional work is written down and priced before it starts."
- Milestones, each ending in a **working demo**, plus the weekly written update.
- Payment schedule by size: at or above `size_threshold`, 40% to book · 40% at the working demo · 20% at acceptance; below it, half to book · half at delivery. Invoices due in `payment_terms_days`.
- Vendor subscriptions the build needs, listed by name, **billed directly to the client without a markup**.
- **Valid until** the quote's issue date + `quote_validity_days`, printed as an absolute date.
- **Build Plan credit:** "The Build Plan fee of <amount> is credited against this build if signed by <date>" (plan delivery + `build_plan_credit_days`).
- Acceptance: the build is accepted when the acceptance checks in the Build Plan pass.

## 7. Export: branded PDF and Word

- Source of truth is Markdown; `.docx` and `.pdf` are generated, never edited and re-imported.
- Branding (name, logo file, colours, fonts, footer text) comes from a `brand.yaml` in the user's workspace. Deftwright's is derived from the deftwright-site tokens; the public skill ships a neutral example.
- Both documents are accessible by construction: heading hierarchy, table header rows, alt text on the process maps, colour never the only signal (ow- authoring standard).
- **Code placement:** export needs code, which the ow- Core text-only rule keeps out of the skill. It goes in `ow-tools`, the Claude Code-only add-on that also holds transcription (decision 7). Without the add-on, `-export` prints the finished Markdown and says the documents could not be generated here.

## 8. Handoffs

```
DONE: Build Plan + Quote ready -> plans/<client>/export/ (quote valid until 2026-10-27)
NEXT: when the client accepts: <contract.say from handoffs.yaml, {files} = plans/<client>/contract-inputs.md>
      default: send contract-inputs.md to whoever drafts your contracts,
               or fill your own SOW template from it
```

After signing: `build-request.md` (from the plan, not the quote) is an **export a person carries**, not a chain (ow- contract, edge 12). NEXT prints the user's `build` destination from `handoffs.yaml`; when Deftwright builds it, that is `oc-app-architect`, which reads it, entering at `/oc-roadmap` with the scope, acceptance checks and risks as spec inputs. That needs a "reads from" row on the oc- side.

`contract-inputs.md` (written by `-quote` once the user records acceptance) holds what any contract needs and nothing tool-specific: parties as the user supplies them, the scope and acceptance checks by reference, the fixed price, milestones, payment schedule and due days, the change rule, the validity and credit dates, ownership terms and the vendor subscriptions billed directly. It states that it is contract input, not a contract.

`STATUS.md` carries two dated awaitings: `quote valid until <date>` and `credit expires <date>`, so `/ow-status` shows them.

## 9. Checks and acceptance tests

### 9.1 Self-checks the skill runs (no `ow-review` in 2.1.0)

Each check reports OK / FINDING / NOT-CHECKED(reason) and is labelled *same-session self-check: the same assistant that wrote the document, applying a checklist; a discipline, not an independent review*. `-export` refuses while any check is FINDING, unless the user types a waiver naming it.

| Check | Runs in | Passes when |
|---|---|---|
| Builder-neutral | `-export` (plan) | No price, no Deftwright-only tooling, no opchain wording in the plan |
| Acceptance coverage | `-scope` | Every in-scope package has at least one check with test data and a case count |
| Out of scope present | `-scope` | The out-of-scope list is not empty |
| Risk owners | `-scope` | Every risk has an owner and a mitigation |
| Evidence trace | `-map`, `-scope` | Every HIGH/MEDIUM fact cites an `evidence.md` line |
| Quote integrity | `-quote` | Every package maps to price-book units or a recorded manual price; modifiers cite evidence; dates and terms match the price book |

### 9.2 Acceptance tests

- **Synthetic client, tier 2:** intake record + three artefacts + one workshop transcript + a fake read-only schema. Pass when every in-scope package has an acceptance check, out of scope is non-empty, every risk has an owner, and the plan names no price.
- **Unpriced package:** a package with no price-book unit stops `-quote` and asks; nothing is estimated.
- **Modifiers cite evidence:** a messy-data modifier without a matching evidence line is rejected.
- **Dates and terms:** quote validity, credit deadline, payment split above and below the threshold, and due days all match the price book.
- **Credentials:** a read-only key used in a session never appears in any file under `plans/`.
- **Builder-neutral:** a reviewer pass on the plan finds no Deftwright pricing or opchain-specific wording.
- **Build Plan offer:** the fee, weeks and credit match the tier in the price book; validity is issue date + 14 days.
- **Quick quote:** a two-unit job produces scope + quote with no map; a job over `quick_quote_max_units` is refused with a Build Plan recommendation.
- **No private names:** with an empty `handoffs.yaml`, every NEXT and every file the skill writes is free of private skill names and of 'Deftwright'; with Deftwright's file, NEXT says `use llc-ops`.
- **Real use:** one real Deftwright Build Plan produced end to end; the bar is a plan and quote you would send with light edits.

## 10. Open questions

1. **The price book's numbers.** The structure is designed; the units and prices are yours. A first draft can be built from your last few real quotes.
2. **Delivery-mode plans.** For signed work, is a Build Plan ever re-run (e.g. phase 2 of a client), and does that change the quote rules?
