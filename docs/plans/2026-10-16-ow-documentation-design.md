# ow-documentation — design (documentation, training and rollout)

**Date:** 2026-10-16 · **Status:** APPROVED 2026-10-16 with its amendments T1, T2, H3, B4 and P3 (decisions 14–16 close the open questions). Nothing is built.
**Release:** a skill in the ow- family that ships together as v2.1.0 (owner scope change 2026-10-16: every skill is released). Starts at 1.0.0.
**Family rules that apply:** ow-protocol v1 (`skills-work/ow-protocol.md`); no `ow-review` (labelled same-session self-checks); code only in the `ow-tools` add-on; no public ow- skill names a private skill, and handoffs leaving the family go through the workspace's `handoffs.yaml` (ow-start decisions 22–23); one writer per file.
**Place in the stages:** `ow-uat` sign-off → `ow-handoff -start` (so later reports are covered fixes) → **`ow-documentation`** (only when the client bought the documentation & training line) → `ow-handoff -package` / `-delivered` once the documents are delivered → rollout tracking runs alongside the fix window.
**Upstream:** `ow-build-plan` (`contract-inputs.md`: `documentation_sku`, size, people quoted; `map/roles.md`, `map/future.md`, `scope.md`); `ow-build` (`spec/`, `build.yaml`, the builder's sprint files, the client repository); `ow-uat` (`agreed/`, `scenarios/`, `acceptance-record.md`, Training-gap `UAT-nn`, `evidence/index.md` cleared items, `uat.yaml` roles and test environment); the workspace's `offers.md`, `handoffs.yaml`, `brand.yaml`, `profile.md`.
**Downstream:** `ow-handoff` (the runbook and developer handover replace its operator notes and feed its Takeover check, amendment H3); the client's repository, wiki or Google Docs (via `handoffs.yaml`); `ow-care` (adoption beyond day 30).

`ow-documentation` writes what lets the client's people use, run and take over what was built: guides and SOPs for the team, a full runbook for operators, a developer handover for the next engineer, a training kit, and a rollout that is planned and tracked until people are actually using it.

## 1. What it has to honour

| Source | Promise | Where the skill meets it |
|---|---|---|
| staging.deftwright.com home | "Your next hire gets tested code and documentation they can follow." | Developer handover (§5.4) cites a repository path for every step |
| /how-we-work, agreement | "Your repository. Your accounts. Your data. Documentation and tests that let another developer take over." | Developer handover; Markdown delivered into the client's repository (§7) |
| /work | "A rollout needs to fit how people learn, work and get help." · "05 Ship: A runbook, so someone else can run what I hand over." | Rollout plan and tracking (§6); the full runbook (§5.3) |
| /services (operations) | Included: operator notes | The floor stays in every build; with the SKU, the runbook is the full version (§2 D6, H3) |
| Price book (ow-uat §7.1, P1) | Documentation & training · S/M/L for up to 15 people, plus a per-group add-on; declinable | §3: the skill runs only when bought; groups come from the quote |

## 2. Owner decisions

| # | Date | Question | Answer |
|---|---|---|---|
| D1 | 2026-10-09 | Documents | End-user guides · SOPs for the new process · admin and operator runbook · developer handover |
| D2 | 2026-10-09 | Training | Live session kit · self-paced modules · quick-reference cards · video scripts |
| D3 | 2026-10-09 | Rollout | Plan **and** track it: rollout plan by role and group, training record, adoption check-in |
| D4 | 2026-10-09 | Delivery | Branded PDF/Word · Markdown in the client's repo · the client's wiki or Google Docs · slides |
| D5 | 2026-10-09 | Pricing | A SKU sized by the build's S/M/L: up to 15 people per size price, plus a per-group add-on; over 100 quoted separately; always quoted, declinable |
| D6 | 2026-10-09 | If declined | A floor stays in every build: developer docs (the builder's, checked by ow-handoff's Takeover check) and operator notes (ow-handoff `-notes`) |
| 7 | 2026-10-16 | Scope | `ow-documentation` ships in v2.1.0 |
| 8 | 2026-10-16 | Screenshots | **Auto-captured** by a new ow-tools part that drives the running test environment with UAT's test data (Claude Code only); a data check runs on every image (§5.5, T1) |
| 9 | 2026-10-16 | Runbook and developer handover when bought | **`ow-documentation` writes the full runbook and developer handover**; ow-handoff's operator notes then point to the runbook instead of repeating it (H3) |
| 10 | 2026-10-16 | Slides, wiki and Google Docs | **One Markdown source, every format:** ow-tools adds a branded `.pptx` export (Google Slides imports it); Google Docs gets the `.docx`; the wiki and repo get Markdown; **plus a push through a configured connector** when one is available in the session, after the user confirms (§7) |
| 11 | 2026-10-16 | Training record | **Role plus a client-chosen id**, as in UAT; no names, emails or phone numbers in any file; the client keeps the mapping |
| 12 | 2026-10-16 | Adoption (owner: no preference; this default) | **Client-reported check-ins at 14 and 30 days**, plus usage counts when the build already logs them (counts only, never personal data) |
| 13 | 2026-10-16 | Timing | **After UAT sign-off, before the Handoff notes**: documents are delivered before ow-handoff packages; training and rollout tracking run alongside the fix window |
| 14 | 2026-10-16 | When the line is paid | **Invoiced at delivery:** `-delivered` prints `NEXT: use ow-build to invoice the documentation line`; ow-build gets the trigger (B4) and the quote says so (P3) |
| 15 | 2026-10-16 | Train-the-trainer | **An option:** you run the quoted groups by default; at `-start` the user can record `trainer: client`, where you train the client's trainer and they run the remaining groups (§6.2) |
| 16 | 2026-10-16 | Adoption | **Confirms decision 12:** check-ins at 14 and 30 days, plus counts only where the build already logs usage; no usage tracking is added to a build for this |

## 3. When it runs

- Only when `contract-inputs.md` records `documentation_sku: bought`. If it's `declined`, `-start` stops with "the client declined documentation & training; the floor comes from ow-handoff" and prints `NEXT: use ow-handoff-package` (the D6 floor path). If the field is absent (a quote made before P1), it asks the user and records the answer as user-stated.
- **The quoted scope is frozen at `-start`:** size (S/M/L), people quoted, groups (people ÷ 15, rounded up), roles. Training up to groups × 15 people is in scope (40 quoted is 3 groups, so up to 45). Beyond that, each further group of up to 15 is a change order at the per-group add-on through `ow-build -change`; it adds sessions, never acceptance checks, and nothing is silently re-priced.
- `ow-handoff -start` has already run (it runs at UAT sign-off), so anything that goes wrong during documentation or training is reported through `ow-handoff -fix`, not here.
- **Consequence of the timing (decision 13):** the fix window and, on smaller projects, the delivery payment both start when the Handoff notes are delivered, and the Handoff notes now wait for the documents. Documentation time therefore moves both later. `-start` prints the planned delivery date for the documents so ow-handoff's provisional dates can use it.

## 4. Verbs

Every file has **one writer verb**; `STATUS.md` and `secrets-seen.log` are the shared append-logs. Files live under `opchain-work/docs/<client>/` unless a row says otherwise.

| Verb | Does | Writes |
|---|---|---|
| `/ow-documentation-start` | Checks the SKU, freezes the quoted scope, reads upstream (§4.1), lists the document set per role and the training plan, and asks the user to confirm it | `docs.yaml` (frozen scope, sources, roles and ids, environment, destinations), `plan.md` |
| `/ow-documentation-capture` | Screenshots for every task in the user guides and training, through `ow-tools capture` (§5.5) | `shots/` (images), `shots/index.md` (one row per image with its data-check state) |
| `/ow-documentation-write <type>` | Writes one document type: `guides`, `sops`, `runbook`, `handover` (§5) | `guides/<role>.md`, `sops/SOP-nn.md`, `runbook.md`, `handover/` (Markdown) |
| `/ow-documentation-train <type>` | Writes one training format: `deck`, `facilitator`, `modules`, `cards`, `videos` (§6.1) | `training/deck.md`, `training/facilitator.md`, `training/modules/M-nn.md`, `training/cards/<role>.md`, `training/videos/V-nn.md` |
| `/ow-documentation-export` | Exports every client document to its formats and destinations (§7) | `export/` (PDF, Word, PPTX), the repo copy (§7.2), `deliveries.yaml` (what went where, when) |
| `/ow-documentation-delivered <date>` | Records that the documents were delivered; unblocks ow-handoff's packaging; prints `NEXT: use ow-build to invoice the documentation line` unless `builds/<client>/ledger.md` already shows it invoiced (decision 14) | `delivered.md` |
| `/ow-documentation-rollout` | Plans groups and sessions; records each session's attendance and competency checks; records check-ins; closes the rollout (§6.2) | `rollout.yaml`, `training-record.md`, `adoption.md` |

Every verb starts with the ow-protocol resume step (reads `docs.yaml` and `STATUS.md`; `docs.yaml` absent: every verb except `-start` stops with `NEXT: use ow-documentation-start`).

### 4.1 Reads, absent-cases and mismatches

| File | Used for | If absent | If it doesn't match |
|---|---|---|---|
| `plans/<client>/contract-inputs.md` | `documentation_sku`, size, people quoted | Ask the user; record as user-stated | `declined`: stop (§3) |
| `uat/<client>/signoff.md` | UAT is signed (or deemed); the documents describe the accepted build | `-start` stops: `NEXT: use ow-uat-signoff` | — |
| `uat/<client>/uat.yaml`, `scenarios/` | Roles and client-chosen ids, test environment, test data pointers, task steps per role | Ask the user for roles and main tasks | — |
| `uat/<client>/defects/UAT-nn.md` (class Training gap) | Topics every guide and the training must cover | No gaps: nothing extra | — |
| `uat/<client>/evidence/index.md` | `cleared` screenshots only, as a fallback to capture | Capture or placeholders | Anything not `cleared` is never used |
| `plans/<client>/map/roles.md`, `map/future.md`, `scope.md` | SOP steps, who does what, exceptions and escalation | Quick-quote job: from `scope.md` and the user | — |
| `builds/<client>/build.yaml`, the builder's `spec/` and sprint files (read as data) | What was built, by milestone and change order | Ask the user | — |
| The client repository (path from `build.yaml`) | Runbook and handover sources: README, docs, CI config, alert and run-log setup, test commands, deploy steps | Ask the user; anything not found becomes an open item, never an invented command | — |
| `handoffs.yaml` → `docs` | Destinations (§7) | Files only, public default | — |
| `brand.yaml`, `profile.md` | Export styling; time zone and holidays | Neutral styling; weekends only | — |

## 5. The documents

Every document is Markdown first (the single source for every format), carries the ow- artefact header, and follows the ow-tools export preflight (one H1, no skipped heading levels, alt text on every image, header row on every table, descriptive link text). Every step cites its source (a scenario, an acceptance check, a map row, a repository path); a step that can't be traced is an open item, never invented.

### 5.1 End-user guides (one per role)

Task-based: for each task the role does, *when you'd do it*, numbered steps with a screenshot per step, *what you should see*, and *if it goes wrong* (the exception path from the scenarios and the future process map). Every UAT Training-gap topic for that role is covered and marked. A short *what changed for you* opener for people moving from the old way of working.

### 5.2 SOPs for the new process

One SOP per process in `map/future.md`: purpose, who does what (by role), when, the steps, exceptions and who handles them, escalation, records kept and for how long (as the client states; the skill never infers a retention rule), and a review date. SOPs describe the way of working, not the software, and link to the guide for each software step.

### 5.3 Admin and operator runbook (full)

The full version of ow-handoff's operator notes (decision 9): users and permissions, settings, every alert with *when / check / do / if that fails*, run logs and how to read them, retries, monthly and quarterly tasks, vendor-side settings (cited "user-confirmed <date>" when only a console shows them), backups and restore where the build has them. Entries use the same `OP-nn` ids and fixed form as ow-handoff §5, so ow-handoff's notes can point at them (H3). Secret rotation entries stay with ow-handoff (it knows the secrets at handoff); the runbook links to them.

### 5.4 Developer handover

For the next engineer: architecture (from `spec/02-architecture.md` and the repository), how to set up locally, run the tests, deploy, roll back; where configuration and secrets live (names only, never values); decisions and why (from the Build Plan, sprint contracts and change orders); known limits and the out-of-scope list. **Every command and path cites a repository location.** Delivered as Markdown in the client's repository (`docs/handover/`) and as PDF.

### 5.5 Screenshots (decision 8)

`/ow-documentation-capture` runs `ow-tools capture` (amendment T1) for each task step:

- **Environment:** the UAT test environment from `uat.yaml`, never production unless the client's recorded production decision applies (as in UAT).
- **Data:** UAT's synthetic or anonymised test data only, by the same pointers the scenarios use. If `uat.yaml` records `test_data: real`, capture stops and asks for a synthetic data set or the client's recorded decision (role and date) to capture with real data; the data check runs either way.
- **Sign-in:** the user signs in themselves in the capture browser's own profile; ow-tools never reads, types or stores a credential. The profile is a test-account session and joins ow-handoff's access list (H3).
- **Data check on every image:** each screenshot is checked for real customer data, credentials, and any person's name, email or photo before it's indexed `cleared`; anything else is `pointer only` and never used. Without ow-tools, UAT's `cleared` evidence is used where it fits, and remaining steps get a marked placeholder (`[screenshot: <step>]`) that blocks export until filled or removed.

## 6. Training and rollout

### 6.1 Training kit

| Format | Contents |
|---|---|
| Live-session deck (`deck.md` → PPTX) | One slide per H2; a session per role; the role's main tasks as live demos; speaker notes |
| Facilitator guide | Timings, the demo script (UAT test data), exercises with expected results, the competency check, how to record attendance (role + id) |
| Self-paced modules | One task per module: a short lesson, a hands-on exercise in the test environment, one check question with its answer |
| Quick-reference cards | One page per role: the five things you do every day and what to do when something looks wrong |
| Video scripts | Script and shot list per task (one task per video); the user records them |

Every UAT Training-gap topic appears in the deck, the role's modules and the role's card.

### 6.2 Rollout

- **Plan:** groups of up to 15 people by role (the quoted groups), a session per group, dates, the facilitator, the self-paced modules to finish before or after.
- **Who trains (decision 15):** by default the user runs every quoted group. With `trainer: client` recorded at `-start`, the user runs one trainer session for the client's trainer (by role and id, with the facilitator guide and a competency check), and the client's trainer runs the remaining groups. Their attendance and competency results come back by role and id and are recorded as client-reported. The number of groups in scope doesn't change.
- **Training record (decision 11):** per session, attendance and competency-check results by **role and client-chosen id** only. No names, emails or phone numbers in any file; the client keeps the mapping.
- **Adoption (decisions 12 and 16):** client-reported check-ins at **14 and 30 days** after the first session (who's using it, by role and count; what's stuck; new training gaps), recorded as reported; plus usage counts when the build already logs them (counts only). New training gaps found in rollout update the guides and cards within the SKU until day 30.
- **Close:** at day 30 (or the fix-window end, whichever is later) `-rollout --close` writes the summary into `adoption.md`. Adoption help after that is care (`ow-care`) or hourly help.

## 7. Delivery (decision 10)

### 7.1 Formats

| Document | Formats |
|---|---|
| Guides, SOPs, runbook, cards, facilitator guide, modules | PDF and Word (ow-tools export), Markdown |
| Live-session deck | PPTX (ow-tools export, amendment T2), Markdown |
| Developer handover | Markdown in the client's repository, PDF |
| Video scripts | Markdown, PDF |

### 7.2 Destinations (`handoffs.yaml` → `docs`)

```yaml
docs:
  repo: { path: docs/client-handbook/, handover_path: docs/handover/ }  # Markdown into the client's repository
  google_docs: { say: "upload export/*.docx to the client's shared drive" }   # or a connector push (below)
  wiki: { say: "paste guides/*.md into the client's wiki space" }
```

- **Repository:** `-export` writes Markdown into the configured folders of the client's repository on a branch and prints NEXT to commit it there (it never pushes or merges). It writes only inside those folders and refuses if a file there wasn't written by ow-documentation (one writer).
- **Connector push:** when the session has a document connector for the destination (e.g. a Google Drive or wiki connector), `-export` lists exactly which files go where and pushes only after the user confirms, recording each in `deliveries.yaml`. Without a connector, it prints the `say:` line (public default: "deliver the files in `export/` to the client's chosen location").
- Nothing is sent to the client by the skill; delivery is recorded by `-delivered` as the user reports it.

## 8. Self-checks

Each reports OK / FINDING / NOT-CHECKED(reason), labelled *same-session self-check: the same assistant applying a checklist; a discipline, not an independent review*. `-export` and `-delivered` refuse while any check that runs in them is FINDING. **"No credentials", "People by role or id", "Data check" and "No private names" can never be waived.**

| Check | Runs in | Passes when |
|---|---|---|
| Trace | `-write`, `-train` | Every step, command and path cites a source; nothing invented |
| Coverage | `-write`, `-train`, `-export` | Every role has a guide and a card; every role's main tasks are covered; every Training-gap topic is covered and marked; every alert found has a runbook entry |
| Data check | `-capture`, `-export` | No image or document shows real customer data, a credential, or a person's name, email or photo |
| People by role or id | every verb | No file holds a trainee's or tester's personal details |
| No credentials | every verb | No password, key or token in any file; secrets appear by name only |
| No internal numbers | client outputs | No hours, rates, margin or price-book internals |
| Placeholders | `-export` | No `[screenshot: …]` placeholder remains in an exported document |
| Accessible by construction | `-export` | The ow-tools preflight passes; the export report's "not a conformance test" sentence is kept |
| No private names | every verb | No blocklisted name (`llc-ops`) and no private skill |

## 9. What this skill never does

Runs when the SKU was declined · invents a command, path or setting · stores a person's name or contact details · types, reads or stores a credential · uses a screenshot that hasn't passed the data check · captures in production without the client's recorded decision · pushes to a destination without the user's confirmation · sends anything to the client · commits or merges in the client's repository.

## 10. Acceptance tests

- **Declined:** with `documentation_sku: declined`, `-start` stops and points to ow-handoff's packaging.
- **Scope freeze:** 40 people quoted on an M build gives 3 groups and room for 45; a 46th person makes a fourth group, a change order at the per-group add-on.
- **Coverage:** two roles and three Training-gap topics produce two guides, two cards and all three topics marked in the guides, deck, modules and cards; removing one fails Coverage.
- **Trace:** a runbook step with no source is refused; a developer-handover command not found in the repository becomes an open item.
- **Screenshots:** capture in the UAT environment produces one image per step; an image showing a real customer name fails the data check and isn't used; without ow-tools, placeholders appear and block export.
- **Training record:** a filled attendance sheet with a name column imports with the column dropped; the record shows role + id only.
- **Adoption:** check-ins at day 14 and 30 are recorded; a new training gap at day 14 updates the role's guide and card; `--close` at day 30 writes the summary.
- **Delivery:** the deck exports to PPTX with one slide per H2; guides export to PDF and Word; Markdown lands only in the configured repo folders; a connector push happens only after confirmation and is recorded.
- **Handoff link (H3):** with the SKU bought and the runbook delivered, ow-handoff's operator notes point to runbook entries by `OP-nn`, and its Operator-task coverage check runs against the runbook.
- **Private names:** with an empty `handoffs.yaml`, no output names `llc-ops` or "Deftwright".
- **Payment:** `-delivered` prints the invoice NEXT once; with the documentation line already in the ledger as invoiced, it prints nothing more.
- **Train-the-trainer:** with `trainer: client`, one trainer session is recorded as run by the user and the remaining groups as client-reported; no group is added or removed.
- **Real use:** one real Deftwright documentation and training rollout.

## 11. Amendments this needs in other designs (approve with this design)

| # | Design | Amendment |
|---|---|---|
| T1 | `ow-tools` | A new `capture` part: drives an installed Chrome or Chromium through its DevTools protocol (Node built-ins only, no npm dependencies) with a dedicated browser profile in the ow-tools data folder; the user signs in themselves; never reads, types or stores a credential; refuses a production URL unless the caller passes the client's recorded decision; writes PNG screenshots of a fixed viewport; `doctor` reports the browser requirement; the profile is deleted on request and listed for ow-handoff's access removal |
| T2 | `ow-tools` | `export --pptx`: Markdown → branded PPTX (pandoc with a reference deck built from `brand.yaml`); one slide per H2; the same preflight (alt text, headings, internal sections) |
| H3 | `ow-handoff` | When `documentation_sku: bought` and `docs/<client>/delivered.md` exists: `-notes` writes `operator-notes.md` as an index pointing to the runbook's `OP-nn` entries (rotate entries stay its own), and its Operator-task coverage check runs against `docs/<client>/runbook.md`; the Takeover check reads `docs/handover/` in the client's repository. `-package` waits for `delivered.md` when the SKU was bought. The capture browser profile joins source 4 of access removal. With the SKU declined, nothing changes (the floor) |
| B4 | `ow-build` | §7 gains a trigger row: **Documentation & training** (when bought): `docs/<client>/delivered.md` exists → invoice request for the line's price, **invoiced once**. Any group CO is invoiced on its own terms. `-start` copies the line into `ledger.md` from the quote |
| P3 | `ow-build-plan` | `-quote --accepted` also records the people quoted for the documentation line in `contract-inputs.md` (not only bought or declined), and `-quote` shows that line in the payment terms as "invoiced when the documents are delivered" |

## 12. Open questions

None. Decisions 14–16 (2026-10-16) closed the three questions raised in the draft: when the line is paid, train-the-trainer, and how adoption is measured.
