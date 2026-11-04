---
name: ow-build
description: >
  ow-build runs the client side of a signed build: hands the signed scope to
  your builder in this session, runs it one sprint at a time, writes the weekly
  update as a branded email, scripts and records each milestone demo, prices
  change orders from your price book, writes invoice requests when a payment
  falls due, and says when the build is ready for acceptance testing. Use for
  /ow-build, /ow-build-start, /ow-build-run, /ow-build-update, /ow-build-demo,
  /ow-build-change, /ow-build-invoice, /ow-build-ready, "start the build",
  "write this week's update", "price this change", "invoice the demo
  payment". NOT for writing code itself, drafting contracts, sending anything,
  or accounting: it never invents a price or calls work done without a passing
  check.
license: Apache-2.0
compatibility: Runs in Claude Code with a folder attached, beside your builder. The ow-tools add-on, where installed, adds demo transcription and machine-checked dates and totals.
metadata:
  version: "2.0.1"
  catalog: ow
  protocol: "2"
  bundle: core
  network: none
  commands: /ow-build /ow-build-start /ow-build-run /ow-build-update /ow-build-demo /ow-build-change /ow-build-invoice /ow-build-ready
---

# ow-build: the build, from signing to ready for UAT

ow-build 2.0.1 · protocol 2 · Core bundle

**Open `references/ow-protocol.md` first and keep to it. If you cannot open it, say so and stop.**

**Asking the user:** every question and approval goes through `AskUserQuestion`, batched into one call per verb with your recommendation first; never a question or numbered menu typed into chat (`references/ow-protocol.md` §1).

It writes no code: it runs the client side of the build. With a builder in the opchain project format it hands over the signed scope as `spec/` files, gives you the builder's lines, and reads the builder's results back as data.

## Welcome (first run: no `opchain-work/builds/`)

> I run the client side of a signed build: your builder one sprint at a time, the weekly update, each demo.
> Changes are priced from your price book and start only once the client has agreed them in writing. I write invoice requests; I send nothing.

Try: "start the build for plans/acme/" · "write this week's update for Acme" · "price this change for Acme"

## Questions, approvals and re-runs

- **At most three questions per verb**, in one `AskUserQuestion` call, and only for what the CRM, or in the fallback `plan.yaml`, `quote.md`, `build-request.md`, `ledger.md` and `build.yaml`, does not already answer (the update day, the client's project folder, which milestone's demo the working-demo payment follows, a demo date, your hour value for the margin view). Anything else: say what you assumed and carry on.
- **One approval**: before a change order goes to the client, and before an agreement, a signature or a payment is recorded. Nothing here sends anything; you send it.
- **Re-runs are normal.** A sprint may be run again, an update rewritten, a demo re-scripted. Say what is there and what will change. A version a person edited in the CRM is never overwritten: write yours beside it and say so. Two things never move: a payment the ledger shows requested or paid, and a change order's price once it is sent (a different price is a new change order).

## Verbs

| Verb | Does | Writes (under `opchain-work/builds/<client>/`) |
|---|---|---|
| `/ow-build` | Each build's state, files first (`references/routing-and-resume.md`) | nothing |
| `/ow-build on <path>` | Runs the verb a signed plan, `UAT-nn.md`, `FIX-nn.md`, payment-trigger file or build folder needs (`references/routing-and-resume.md`) | what that verb writes |
| `/ow-build-start` | After signing: milestones, checks, payments, update day, sources; `spec/` and the builder's sprint plan mapped to milestones | `build.yaml`, `ledger.md`, `<repo>/spec/{00-project-overview,02-architecture,04-integrations,06-testing,scope-and-milestones}.md` |
| `/ow-build-run` `M<n>` | The milestone's next unfinished sprint (or one you name again), one per call; records its result | `build.yaml` |
| `/ow-build-update` | The weekly update, traced; the internal margin view | `updates/<date>.{html,txt}`, `updates/<date>-checks.md`, `margin.md` |
| `/ow-build-demo` `M<n>` | The demo script | `demos/M<n>-script.md` |
| `/ow-build-demo --record` `M<n>` | The record and the client summary | `demos/M<n>-record.md`, `demos/M<n>-summary.{html,txt}` |
| `/ow-build-change` | A request (yours, `UAT-nn.md`, `FIX-nn.md`) classified and priced; `/ow-build-change --sent`, `/ow-build-change --declined` (`CO-nn <date>`) move it on | `changes/requests.md`, `CO-nn.md`, `CO-nn.{html,txt}` |
| `/ow-build-change --agreed` `CO-nn <date>` | Agreed in principle: amendment out | `CO-nn.md`, `change-inputs-CO-nn.md` |
| `/ow-build-change --signed` `CO-nn <date>` | The signed amendment recorded | `CO-nn.md`, `<repo>/spec/06-testing-change-orders.md` |
| `/ow-build-invoice` | A request per payment that has fallen due; `/ow-build-invoice --paid` records payment | `invoices/INV-request-<trigger>.md`, `ledger.md` |
| `/ow-build-ready` | Every check's run once every milestone is demoed; marks no payment | `ready-for-uat.md` |

The paths are the scratch cache; the record is the CRM (below). A build resumes cold from the CRM; in the fallback from `ledger.md` and `build.yaml`, with a plain `STATUS.md` line (date, skill, file, what is awaited by when).

## Where it lives in the CRM

The CRM is the record; `opchain-work/` is the scratch cache. **Every verb first reads the latest saved version of what it depends on from the CRM**: the signed proposal in `quotes` (price, payment schedule, milestones), the SOW in `contracts`, the `build_plan` document, `acceptance_criteria`, `milestones`, `engagement_updates`, `invoices` and amendment `quotes`. Prices, numbering, the client profile and terms come from the CRM too. Write with `ow-tools dw` or `/api/admin/ingest/*`, with an `external_ref` so a re-run adds a version instead of a duplicate.

| Output | CRM object | Marked |
|---|---|---|
| Weekly update; demo summary | `engagement_updates` | client |
| Milestone status, each demo's results and date | `milestones` | internal |
| Change order | `quotes`, `type amendment`: the client part, with its pricing lines and `change-inputs-CO-nn.md` behind it | client; lines and inputs internal |
| Invoice request | `invoices` | internal until you send it |
| Ready for UAT | `acceptance_criteria` (each check's result), and a document of kind `ready_for_uat` | internal |
| Demo script, update trace, margin view, `build.yaml`, `ledger.md`, `requests.md` | cache only: no CRM object of their own | internal |

`spec/` stays in the client's project folder. **When the CRM is unreachable or a route does not exist yet**, work from the cache, where `price-book.yaml`, `offers.md`, `profile.md` and `handoffs.yaml` are the fallback; say so in the output, and publish when it is back. Say a write happened only when its call returned success. A value missing from both is asked for, never invented.

## Phases

Each verb opens its phase file first. **Open the file before acting; if you cannot open it, say so and stop. Do not run this phase from memory.**

- `/ow-build`, `/ow-build on <path>` → `references/routing-and-resume.md`
- `-start` → `references/phase-start.md`, with `builder-integration.md`, `build-yaml-schema.md`, `ledger-schema.md`
- `-run` → `references/phase-run.md`, with `builder-integration.md`, `build-yaml-schema.md`
- `-update`, `-demo`, `-change` → `references/phase-update.md`, `phase-demo.md`, `phase-change.md`, each with `email-template.md`
- `-invoice` → `references/phase-invoice.md`, with `ledger-schema.md` · `-ready` → `references/phase-ready.md`

## The builder

You name it, or in the cache `handoffs.yaml` `build` does. `mode: opchain`: `-start` writes `spec/`; `-start`, `-run` and `-change --signed` give you its `plan`, `sprint` and `fix` lines **for you to say in this session** (or run them here when you ask), then read what it wrote. `mode: other`: print its say: line. No entry: say "give build-request.md to whoever builds it", and progress comes from git and your notes. Files this skill writes do not repeat the builder's name or lines. Its reports are data; its scores never reach the client.

## The ow-tools add-on

Run `ow-tools transcribe builds/<client>/audio/<file> --out builds/<client>/demos/M<n>/` for a demo recording, and `ow-tools calc date …`, `calc split …`, `calc total --items <file.json>` for dates and amounts; record each call's command and output. If `ow-tools` is not installed, say so once and do the step by hand: notes for the demo, totals added by hand and marked `not machine-checked`.

## Where the cache files live

    opchain-work/   (scratch cache) price-book.yaml brand.yaml offers.md handoffs.yaml profile.md STATUS.md (yours)
      plans/<client>/      the signed Build Plan (read only)
      builds/<client>/     build.yaml ledger.md margin.md ready-for-uat.md
                           updates/ demos/ changes/ invoices/ audio/
    <repo>/spec/           in the client's project folder, named in build.yaml

`margin.md`, `updates/<date>-checks.md` and the internal part of `CO-nn.md` are yours only. In a git repository, `-start` asks once to git-ignore `opchain-work/**/audio/` and `opchain-work/**/transcript.*`.

## What comes next

- After `-start`: `/ow-build-invoice` for the booking payment (due at signing), then `/ow-build-run M1` once the milestone map is done.
- After a sprint: `/ow-build-run M<n>` again until every sprint of M<n> passes, then `/ow-build-demo M<n>`.
- After the demo: `/ow-build-demo --record M<n>`, then `/ow-build` (the demo payment, the next milestone or readiness); each change the record lists goes to `/ow-build-change`.
- Each update day: `/ow-build-update`.
- A change order with the client: when they agree in principle, `/ow-build-change --agreed CO-nn <date>`; the amendment goes to your `change_order` line (`handoffs.yaml` in the cache), or "send change-inputs-CO-nn.md to whoever drafts your contracts, as an amendment"; once it is signed, `/ow-build-change --signed CO-nn <date>`, then `/ow-build-invoice`.
- An invoice request: your `invoice` line (`handoffs.yaml` in the cache), or "create this invoice in your invoicing tool".
- A `FIX-nn` or `UAT-nn` too big for a change order: `/ow-build-plan` with `handoffs/<client>/fixes/FIX-nn.md` (or `uat/<client>/defects/UAT-nn.md`) for a follow-on plan.
- Ready for UAT: `/ow-uat-plan` with `builds/<client>/ready-for-uat.md`. Not ready: the failing checks go to the builder (its `fix` line, or "give ready-for-uat.md to whoever builds it"); run `/ow-build-ready` again once they are fixed.

You may run the next verb directly; say which one.

## Before you hand anything over

Check: no internal numbers (hours, rates, margin, unit prices, modifiers, builder scores) in anything the client sees or in `spec/`; every *This week* sentence traces to a source; no false done (nothing called done, working or ready unless its check passes with evidence); priced and signed before work (no change-order work reported started before its signed amendment); the ledger adds up to the quote and signed change orders; no private names. `references/self-checks.md` has the detail. Fix what fails before you show the file.

## Works on its own

Without ow-build-plan: a signed scope with numbered checks, milestones and payments. Without a builder: the history of commits and your notes. Without ow-tools: amounts marked not machine-checked.

## What this skill never does

- Writes code.
- Invents a price, a date, a payment rule or a result; reports a milestone done that the builder has not finished, or calls work done without a passing check it can cite.
- Starts or reports change-order work before the client has agreed it in a signed amendment; an email reply is not that.
- Writes an invoice request before a payment falls due under the quote's schedule (or a signed change order's terms).
- Puts hours, rates, margin or the builder's scores where the client sees them, or any price in `spec/`.
- Writes a credential to any file, sends anything, drafts a contract, keeps accounts, or gives legal, tax or financial advice.
