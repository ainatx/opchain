---
name: ow-build-plan
description: >
  ow-build-plan writes the Build Plan and the fixed quote that follow a fit call:
  a one-page offer, the list of what to collect, the process map, scope with
  acceptance checks and risks, then a quote added up only from your own price
  book. It can also write one whole-project quote, SOW-shaped, with the Build
  Plan as its first phase, so the client signs plan and build together. Use for
  /ow-build-plan, /ow-build-plan-offer, /ow-build-plan-start,
  /ow-build-plan-collect, /ow-build-plan-map, /ow-build-plan-scope,
  /ow-build-plan-quote, /ow-build-plan-export, "write the Build Plan for", "map
  their process", "scope this job", "quote this from my price book", "quote the
  whole project", "the client accepted the quote", "they signed". NOT for
  drafting the contract, invoicing, building the software, or pricing advice:
  it never invents a price.
license: Apache-2.0
compatibility: Runs in Claude Code with a folder attached. The ow-tools add-on, where installed, adds PDF and Word export, workshop transcription and machine-checked dates and totals.
metadata:
  version: "2.0.1"
  catalog: ow
  protocol: "2"
  bundle: core
  network: none
  commands: /ow-build-plan /ow-build-plan-offer /ow-build-plan-start /ow-build-plan-collect /ow-build-plan-map /ow-build-plan-scope /ow-build-plan-quote /ow-build-plan-export
---

# ow-build-plan: the Build Plan and the quote

ow-build-plan 2.0.1 · protocol 2 · Core bundle

Open `references/ow-protocol.md` first and keep to it. If you cannot open it, say so and stop.

**Asking the user:** every question and approval goes through `AskUserQuestion`, batched into one call per verb with your recommendation first; never a question or numbered menu typed into chat (`references/ow-protocol.md` §1).

It writes two client documents: the **Build Plan** (today, what should change, scope, out of scope, acceptance checks, risks), which names none of your prices, and the **Quote**, added up from your price book. Three ways to sell it:

- **Plan first:** a one-page **offer** prices the Build Plan alone; the build is quoted once the plan is done.
- **Whole project:** one SOW-shaped quote with the Build Plan as its first phase, then the build, so the client signs both together (`/ow-build-plan-quote --whole-project`).
- **Small job:** a **quick quote** straight from the intake record.

## How it runs

Run the steps in the order the job needs: any step may be run again, in any order, or skipped. Before a step overwrites a file, say what is there (its date and what it holds) and go ahead unless the user objects. Ask at most three questions per verb, in one `AskUserQuestion` call, and only for what no file in `opchain-work/` answers; for anything else, state the assumption and carry on. The one approval is before anything goes to the client, and before an acceptance, a signature or a change order is recorded.

**Money is the exception.** A quote or offer that has been sent (exported for the client, or the user says it went out) or accepted keeps its price. A changed price after sending is a new file beside the sent one (`quote-v2.md`; say so); after acceptance it is a change order or a new quote, never a silent rewrite.

## Welcome (first run: no `opchain-work/plans/`)

> I turn a fit call into a Build Plan and a fixed quote: a one-page offer for the plan, or one quote for the whole project with the plan as phase 1.
> Then a list of what to collect, a map of how the work runs today, and the scope with acceptance checks.
> Every price comes from your own price book; I never invent one.
> Everything stays in `opchain-work/plans/` inside the folder you attach.

Try: "write the Build Plan offer for Acme" · "quote the whole project for Acme, plan and build" · "quote this small job from the intake record" · "the client accepted the quote on 3 November"

## Verbs

| Verb | Does | Writes (under `opchain-work/plans/<client>/`) |
|---|---|---|
| `/ow-build-plan` | Where things stand, from the CRM, else the cache (`references/routing-and-resume.md`) | nothing |
| `/ow-build-plan on <path>` | Runs the step a handed-over intake record, FIX or UAT request, or plan folder needs (`references/routing-and-resume.md`) | what that step writes |
| `/ow-build-plan-offer` | One-page offer for the Build Plan: tier, fee, weeks, the credit, payment terms, validity | `build-plan-offer.md`, `request.md` (a follow-on in your words), `export/build-plan-offer.{pdf,docx}` |
| `/ow-build-plan-start` | Sets the tier and the schedule, writes the collection list; a follow-on's intake is its FIX file or `request.md` | `plan.yaml`, `collection.md` |
| `/ow-build-plan-collect` | Adds artefacts, read-only access, workshops and research findings to one evidence register; run as material arrives | `evidence.md`, `systems/<system>.md` |
| `/ow-build-plan-map` | Today's and the future process, roles, systems, data; each fact with its confidence | `map/current.md`, `future.md`, `roles.md`, `systems.md`, `data.md` |
| `/ow-build-plan-scope` | Work packages, out of scope, acceptance checks, risks, assumptions, client dependencies | `scope.md`, `acceptance.md`, `risks.md` |
| `/ow-build-plan-quote` | Prices each package from the price book; milestones, payments, dates, testing, training and fix-window lines | `quote.md`, `quote-items.json`, `quote-v<n>.md` (a changed price after sending) |
| `/ow-build-plan-quote --whole-project` | One SOW-shaped quote: the Build Plan phase first, then the build packages, testing, optional documentation & training, the fix window, milestones and the payment split; runs from `plan.yaml` or straight from the intake record and a stated scope | `quote.md`, `quote-items.json` |
| `/ow-build-plan-quote --quick` | A small defined job, or a feasibility test, straight from the intake record; over `quick_quote_max_units` it recommends a Build Plan instead | `quick-scope.md`, `quote.md`, `quote-items.json` |
| `/ow-build-plan-quote --quick --onboarding` | A fixed-fee S/M/L onboarding review of a running system, from a `care-takeover` intake; no build is quoted. `/ow-build-plan-quote --onboarding` is only valid together with `--quick` | `quick-scope.md`, `quote.md`, `quote-items.json` |
| `/ow-build-plan-quote --accepted <date>` | Records the client's acceptance as the user's statement; asks whether they took documentation & training | `contract-inputs.md` |
| `/ow-build-plan-quote --signed <date>` | Records the signing as the user's statement; needs the acceptance first | `build-request.md` (none for a feasibility test or an onboarding review) |
| `/ow-build-plan-export` | Assembles the plan, runs the builder-neutral check, makes branded PDF and Word files | `build-plan.md`, `export/build-plan.*` (quick: `export/quick-scope.*`), `export/quote.*`, `export/export-report.md` |

The paths are the scratch cache (below). Every verb first reads the latest saved version of what it depends on from the CRM, so a plan resumes cold from there.

## Where it lives in the CRM

The CRM is the record; `opchain-work/` is a scratch cache. Write through `ow-tools dw` or `/api/admin/ingest/*`, and say a write published only when the call returned success.

| Output | CRM object | Marked |
|---|---|---|
| Offer, whole-project quote, quote, quick quote | `quotes` (the only place prices live) | client; its appendix internal |
| Change order | `quotes`, `type amendment` | client |
| Contract inputs, then the SOW | `contracts`, `record_type` `sow` | internal, then client |
| Build Plan | document `build_plan`, no price | client |
| Collection list | document `collection` | client |
| Evidence, map, scope and risks, build request | documents `evidence`, `process_map`, `scope`, `build_request` | internal |
| Acceptance checks | `acceptance_criteria` | client |
| Systems | `systems` | internal |

Each step reads first: the saved recap (document `recap`) and intake (`briefs`) before the plan; the saved scope before the proposal; so a person's edit flows forward. Never overwrite a version a person edited: write yours beside it and say so. Prices, numbering, the client profile and terms come from the CRM; `price-book.yaml`, `offers.md`, `profile.md` and `handoffs.yaml` are read only when it is unreachable, and the output says that happened. A missing value is asked for, never invented.

## Phases

Each verb opens its phase file first. **Open the file before acting; if you cannot open it, say so and stop. Do not run this phase from memory.**

- `/ow-build-plan` and `/ow-build-plan on <path>` → `references/routing-and-resume.md`
- `-offer` → `references/phase-offer.md` · `-start` → `references/phase-start.md` · `-collect` → `references/phase-collect.md` · `-map` → `references/phase-map.md`
- `-scope` → `references/phase-scope.md`, with `references/acceptance-check-format.md`
- `-quote` (every mode) → `references/phase-quote.md`, with `references/price-book-schema.md` and `references/contract-inputs-schema.md`
- `-export` → `references/phase-export.md`

## Prices

- Every price comes from the CRM's price book (cache: `price-book.yaml`) or from the user, recorded on its line as `priced by <user name>, <date>, reason: <their words>`. Never invent, estimate or round one, and never suggest a number.
- A missing price-book key stops only the line that needs it. Price what the book prices, list the missing keys once, and ask the user for those values in one `AskUserQuestion` call. A package no unit fits stops its own line the same way.
- A modifier applies only through its written `when`, citing the `evidence.md` row that shows the condition.
- Validity, the Build Plan credit, the payment split and the fix window come from the price book and terms (cache: `offers.md`).
- Internal pricing (unit prices, modifiers, manual-price records, internal rates, tool output) sits between `<!-- ow:internal -->` and `<!-- ow:end-internal -->` and is stripped on export.

## The ow-tools add-on, and where files live

Run `ow-tools` for exports, transcription, dates and totals; if it is not installed, say so once and do the step by hand (dates and totals then say "not machine-checked"). The calls and the file tree under `opchain-work/` are in `references/tools-and-files.md`: open it with the phase file.

## What comes next

- After the offer: when the client says yes, `/ow-build-plan-start`. After the start: `/ow-build-plan-collect` as material arrives, then `/ow-build-plan-map`, `/ow-build-plan-scope`, `/ow-build-plan-quote`, `/ow-build-plan-export`.
- After a whole-project quote or a quick quote: `/ow-build-plan-export`, then the user sends it.
- When the client accepts: `/ow-build-plan-quote --accepted <date>`; then the contract, through the user's `handoffs.yaml` `contract` say: line printed exactly, or "send contract-inputs.md to whoever drafts your contracts, or fill your own SOW template from it".
- When it is signed: `/ow-build-plan-quote --signed <date>`, then `/ow-build-start` for the build (or the `handoffs.yaml` `build` say: line). A signed whole-project quote starts with the plan: `/ow-build-plan-start`, and the build follows its delivery.
- A signed onboarding review: `/ow-care-onboard`. A signed feasibility test with a go: `/ow-build-plan-offer`. A quick quote over the limit: `/ow-build-plan-offer` for the intake.

This skill may run the next step itself, its own or another skill's; say which one you are running.

## Before you hand anything over

Check the list in `references/self-checks.md` (evidence trace, acceptance coverage, out of scope, risk owners, the quote's sums and terms, builder-neutral, research rows) and fix what fails. Nothing is recorded as a verdict; the user may say to go ahead.

## What this skill never does

- Invents or estimates a price, or applies a modifier its evidence does not show.
- Changes the price of a sent or accepted quote in place.
- Puts your prices, your tooling or these skills' wording in the Build Plan.
- Writes a credential anywhere, or reads past the read-only access the user confirmed.
- Treats an acceptance or a signature as verified: it records what the user says, with the date.
- Drafts a contract, sends anything, edits your price book, brand, offers, handoffs or profile, or writes anywhere but the CRM's write path and `opchain-work/` (plus the `.gitignore` lines you agree to).
- Gives legal, tax or financial advice.
