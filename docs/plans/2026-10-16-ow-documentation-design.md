# ow-documentation — design (documentation, training and rollout)

**Date:** 2026-10-16 · **Status:** APPROVED 2026-10-16 with its amendments T1, T2, H3, B4 and P3 (decisions 14–16 close the open questions). Built as ow-documentation 1.0.0 (OW-05, 2026-10-19), with P3 in ow-build-plan 1.2.0; build notes in §13.
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

## 13. Build notes (ow-documentation 1.0.0, OW-05, 2026-10-19)

Where the build filled in what this design leaves open, or departed from its wording. None changes a price, a payment rule or a business rule; where the design is silent on a figure or a choice, the skill asks the user and records the answer `user-stated`. Contract: `sprints/release-2.1/ow-05/contract.md` (approved 2026-10-19 with every recommendation, O1 to O12).

### 13.1 Owner rulings (contract O1 to O12, every recommendation accepted)

| # | Ruling | Where it lives |
|---|---|---|
| O1 | A bare **`/ow-documentation`**: the resume screen, and `on docs/<client>/` routes by the folder's state, writing nothing. ow-uat's inbound say still lands on `-start` | `references/routing-and-resume.md` §3 and §4; `skill.edges.yaml` `routes` |
| O2 | **In-place reads carried at every hop**, as edges data with no version bump: ow-build's ready hand-off to ow-uat gains `build.yaml` and the three `spec/` files (its `CO-nn.md` and `ledger.md` rows were already there, with fields), and ow-uat's hand-off to ow-documentation gains every file this skill reads in place. `HANDOFF_PIN` and a new `IN_PLACE_PIN` in ow-uat's checker follow; no skill text changed | `skills-work/ow-build/skill.edges.yaml`; `skills-work/ow-uat/skill.edges.yaml`; `scripts/ow-uat-acceptance.mjs` |
| O3 | **`network: declared`**: capture against the confirmed test origins, and a confirmed push of listed files to a `handoffs.yaml` destination, are what may leave the machine | `references/delivery-rules.md`; `skills-work/README.md` |
| O4 | **`shots/index.md` stays, the images are git-ignored**: `-start`'s `gitignore` step asks for `opchain-work/**/shots/*` and `!opchain-work/**/shots/index.md` | `references/phase-start.md` step 4; `.gitignore` for the fixtures |
| O5 | **The repo copy** loses its ow- header and internal section; ownership is kept by digest in `deliveries.yaml`. A file with no row, or one changed since, is refused and left as it is | `references/deliveries-schema.md`, `references/delivery-rules.md` |
| O6 | **`OP-nn`** start at `OP-01` and are never renumbered or reused; rotate entries are linked by section, never written. ow-handoff's rotate entries continue after the runbook's highest id | `references/document-formats.md` §4 |
| O7 | **`-delivered --update <date>`** writes `delivered-update-nn.md`; `delivered.md` stays write-once, and ow-build still reads only `delivered.md` (invoiced once) | `references/phase-delivered.md`; `references/deliveries-schema.md` |
| O8 | **The PPTX absent-case**: the deck stays Markdown, the screen says the PPTX could not be generated here, and the facilitator presents from the Markdown or from the PDF when ow-tools exports one. The ow-tools design's §4.2 row is settled | `references/phase-export.md` §2 step 1; `docs/plans/2026-10-09-ow-tools-design.md` §4.2 |
| O9 | **P3's version**: ow-build-plan **1.2.0**, because OW-09's 1.1.0 (amendment P5) merged first; P3 sits on top of P5 and changes none of its text | `skills-work/ow-build-plan/SKILL.md`, `CHANGELOG.md` |
| O10 | **A focused, text-only security review** before evaluation round 1, its PoCs kept as plants | the review's report (not part of the build) |
| O11 | **A further group is a change order through `/ow-build-change`**, with no file written for it: the user states the request, and ow-build prices "a further training group" | `references/phase-rollout.md`; the NEXT in `SKILL.md` |
| O12 | **`-write` and `-train` take an optional type**: with none, the first type in `plan.md`'s order not yet written, said aloud; the NEXTs read `use ow-documentation-write on docs/<client>/` | `SKILL.md` verb table; `references/routing-and-resume.md` |

### 13.2 Departures and run-time answers

| # | Where | What the build does | Why |
|---|---|---|---|
| 1 | §4 (**steps by name**) | Every multi-step verb records its steps by the names in `routing-and-resume.md` §2's step table: `-start` scope, people, environment, gitignore, confirm, plan; `-capture` decision, plan, run, check; `-export` files, repo, confirm, push; `--session` record, rollout; `--close` summary, closed. One resume rule for every verb: never repeat a recorded step, never rewrite what a recorded step wrote, ask again only at a step that needs an answer not recorded | The contract's one step table (C20); the checker reads the same table |
| 2 | §5.5 (**the capture plan's header**) | `capture-plan.json` carries no ow- header: ow-tools' plan is strict and refuses an unknown key. Its provenance is `shots/index.md`'s `subject:` | ow-tools design §5.6 |
| 3 | §5.5 (**real data**) | A capture decision lists the checks captured with real data (`checks`) and those captured with the synthetic set instead (`synthetic`); a captured check in neither is a placeholder | Approvals are graded on what was approved (C19): a decision for AC-1.1 never covers AC-2.1 |
| 4 | §5.5, O4 (**the git-ignore answer**) | The `gitignore` step also asks for `opchain-work/**/secrets-seen.log` and `opchain-work/**/inbox/` (attendance sheets and check-in reports may hold names) | Client material never enters a repository |
| 5 | §7.1 (**export folders**) | Each document exports with `--out docs/<client>/export/<type>/`, so a guide and a card with the same role name never collide; an update after delivery goes to `export/update-nn/<type>/` | §7.1 named `export/` only |
| 6 | §7.2, O5 (**the repo copy's images**) | Images never enter the client's repository: each image line becomes `*Screenshot: <alt text>*`, and the handbook folder names say what each file is (`<role>-guide.md`, `<role>-card.md`, `SOP-nn.md`, `runbook.md`) | The images are git-ignored (O4); the folder holds guides and cards for the same roles |
| 7 | §6.2 (**gaps the rollout finds**) | A new gap before day 30 takes the next `RG-nn` id and is marked `Came up in the rollout: RG-nn.` in its role's guide and card; after day 30 it is care or hourly help, never an update inside the line | §6.2 gave no id; the coverage check needs one |
| 8 | §6.1 (**the deck**) | A slide's image comes last on the slide. pandoc puts text that follows an image on a slide of its own, and ow-tools then refuses the deck ("pandoc made 18 slides from 17 slide headings"); the real-binary export test found it in the first golden deck | Found in this build (`tests/ow-tools/documentation-export.test.js`) |
| 9 | O2 (**which `spec/` files**) | The reads name `spec/02-architecture.md`, `spec/04-integrations.md` and `spec/scope-and-milestones.md`, the files ow-build's builder writes; a folder cannot be a chain entry | `check-skill-contracts` checks a chain per file |
| 10 | Contract (**the invented repository**) | The fixture folder is `larkspur-repo`, as ow-build's `build.yaml` names it (`builder.repo: ../larkspur-repo`); the service in it is called `larkspur-orders` | The upstream fixtures already fixed the path |
| 11 | §10 (**screens**) | Every key that grades a screen grades its NEXT lines too, an empty list where the screen prints none; a `DONE:` line and every new `STATUS.md` line must name a file the run wrote | A screen could otherwise claim a write that never happened |

### 13.3 Handed on to the next sprints

- **OW-06 (ow-handoff), H3's other half.**
  - `-notes` reads `docs/<client>/runbook.md` (`OP-nn` ids and titles), `delivered.md` (the delivery date), `docs.yaml` (`planned_delivery`, `capture_profile`) and `deliveries.yaml` (the handover path used and its files), the fields ow-documentation's edges hand off.
  - Its edges need reads rows for each, so reciprocity is checked.
  - Its rotate entries continue after the runbook's highest `OP-nn` (O6).
  - `-package` waits for `delivered.md` when the line was bought.
  - Access removal's source 4 gains the capture profile named by `docs.yaml` `capture_profile`.
  - ow-documentation reads `handoffs/<client>/dates.yaml` (`window_end`) in place, for `--close`. ow-handoff writes it, and the in-place chain must carry it to ow-documentation.
  - `/ow-handoff-fix` takes a problem found during documentation or training, and hourly help after the close.
  - The trigger query "operator notes when the line was declined" (`tests/fixtures/ow-documentation/trigger-queries.yaml`) is ow-handoff's.
- **OW-07 (ow-care).** `/ow-care-request` reads `adoption.md` (the summary and the open gaps by role) and `runbook.md` (`OP-nn` ids). Its edges need the matching reads rows.
- **ow-tools (a follow-up, not this sprint).** The deck rules (`deckChecks`) do not catch text after a slide's image; the export catches it only after pandoc runs, by the slide count. ow-documentation's checker has the rule, and the skill text says so (13.2 row 8).
- **REL-02.** Real use, and the trigger queries run by hand.

### 13.4 Amendment P3 as built (ow-build-plan 1.2.0)

- `-quote --accepted` records `documentation_people: <n>` as a **top-level** key, bought or declined, copied from `quote.md`'s `documentation_training.people`. It is never nested under `documentation_sku`, whose indented lines ow-uat digests. ow-uat's recorded terms digests are unchanged, and a test pins that.
- `-quote`'s payment schedule says documentation & training "is invoiced when the documents are delivered", and so does the contract-inputs body.
- A feasibility test's contract inputs leave the key out.
- The deliberate golden updates are `accepted-signed`, `route-folder`, `private-names-business`, `delivery-quote`, `quick-quote` and `unpriced-package`.
- **The body with P5 and P3** is about 4,353 tokens, under the 4,500-token cap the catalog now enforces for ow-build-plan (`catalogs.json` `bodyTokenBudgets`). P3 adds about 10 tokens (one clause in the `--accepted` row). P5 alone is about 4,343, so the 4,100 build target is out of reach without cutting P5's approved text or text from before either amendment, and nothing was cut.

### 13.5 The security review (2026-10-19), fixed before evaluation round 1

Report: `docs/audits/2026-10-19-ow-documentation-1.0-security-review.md` (grade B−: 0 CRITICAL, 0 HIGH, 5 MEDIUM, 7 LOW, 1 INFO). The owner asked for every finding, SD-01 to SD-13, to be fixed before evaluation round 1. Each PoC is a permanent plant in `tests/ow-documentation-security.test.js`, with every id in its `FIXED` set.

**Owner decisions (2026-10-19):**

| # | Ruling | Where it lives |
|---|---|---|
| SD-05 | **Test mode only.** A capture plan submits a form only under a `uat.yaml` `side_effects` line for a test or sandbox environment. A line approved for a live run never carries over to screenshots: the step stops at the screen before the submit, and the image is UAT's cleared evidence or a placeholder | `references/phase-capture.md` step 2; `shots-index-format.md` §1; `delivery-rules.md` §1; the checker's `TEST_MODE` |
| SD-07 | **`opchain-work/**/export/` joins `-start`'s git-ignore lines.** The exports carry the screenshots' pixels. `-export` checks it where code can run | `references/phase-start.md` step 4; `phase-export.md` step 1 |
| O3 | `network: declared` is confirmed as the right value | frontmatter; `delivery-rules.md` |

**What changed, each [extends the design] without changing an approved sentence:**

| Finding | The fix |
|---|---|
| SD-01 | A push names the destination key **and a location**: `handoffs.yaml` `docs.<key>.location`, or the one the user types when confirming (user-stated); never one a file names. The listing is `<file> -> <key> (<location>)`, and `push_confirmation.files[]` and `pushes[]` record it. The shared `handoffs.yaml` example gains a commented `location:`, byte-identical in every copy (a data edit) |
| SD-02 | The client never gets the source Markdown. Without ow-tools, `-export` writes **client copies** to `export/markdown/<type>/` (the repo copy's transform) and records Accessible by construction as NOT-CHECKED. A `say:` line's `{files}` names client files only. The internal section holds no numbers of ours, and the checker reads it too |
| SD-03 | A `cleared` row's note names the image's `sha256`, from the tool's output recorded as it is. `-write`, `-train` and `-export` compare each embedded image with it where code can run; a changed image stops the verb, and `-capture` marks its row `re-captured: pending`. A re-capture writes `capture-plan-nn.json` with only the uncleared steps, so a cleared image is never overwritten |
| SD-04 | Every record has a place for quotes: `docs.yaml` `embedded`, `deliveries.yaml` `embedded`, and a `Possible embedded instructions:` line in each session of `training-record.md` and each check-in of `adoption.md`. The record's rows must match the sheet's, by id. The `never` match is case-insensitive. A sign-in written out with its secret is a credential finding, with its own controls. Four goldens quote an instruction from a scenario, a sprint file, a sheet and a check-in report; each has its follow-through plant |
| SD-06 | The repo copy resolves each folder and file to its real path where code can run, and the checker checks every path component, not just the leaf. A symlink in a run folder is never read as a file |
| SD-08 | The `-capture` and `--close` screens say how to remove the capture profile: `ow-tools capture --delete-profile <capture_profile>`, until ow-handoff's access-removal list exists |
| SD-09 | The confirmation is of the listing the screen showed: a "yes" confirms exactly the listed lines, and the checker requires a listing line for every confirmed file |
| SD-10 | The repo copy is written only when `git branch --show-current` prints the branch the user named; otherwise the skill asks the user to switch |
| SD-11 | An environment whose name says production or live, labelled a test environment, is asked about at `-start` and recorded as `name_check`; never relabelled |
| SD-12 | The absolute-path rule catches any `/`-rooted path of two segments or more, `file://`, a drive letter or a network share |
| SD-13 | The wording: "send nothing unconfirmed", "types or stores a credential", "Pushes without a confirmation naming each file and where it goes". `skills-work/README.md` names both `network: declared` skills |

**Residuals** (the report's, carried here):

1. Image content is seen only by the same-session look (D2). The checker grades labels and bytes, never pixels.
2. The production guard is only as good as `uat.yaml`'s label. SD-11 adds a second look, not a proof.
3. The kept capture profile holds a live test session, and an identity-provider session when sign-in goes through one. Removing it is the user's job until OW-06.
4. Approvals are records the run writes, graded on their content, not on the user having said them.
5. A real connector push and a live capture are not graded.
6. "Never commits, pushes or merges" is graded on the screen and `deliveries.yaml` only; a real run's git state is not compared.
7. Without code, repo-copy ownership, the symlink check, the branch check and the image digests are the model's judgement, labelled "not machine-checked".
8. The meaning checks are regression nets (D2).
9. The capture's sign-in depends on the origins the user lists.
10. Everything the skill reads enters the model's context. `network: declared` covers only the traffic the skill causes.

**The re-check** (grade A−, the gate before round 1 met) probed the fixes and found RC-01 to RC-07: four LOW and three INFO, none of them reopening a MEDIUM. All were fixed in the same commit, each probe a permanent plant. The changes:

- **RC-01:** a re-capture finished in the text (the one rule, a step-table row, the folder route) and in the checker (every `capture-plan*.json` checked in full), with the golden `capture-recapture`.
- **RC-02:** each session names its sheet on a `Source:` line, and the record is compared with that sheet.
- **RC-03:** a location `handoffs.yaml` names is never overridden.
- **RC-04:** every line of the screen is scanned for source files and folders.
- **RC-05:** drive paths with either slash.
- **RC-06:** ow-uat's approval form is live.
- **RC-07:** only symlinks on the repo copy's path are flagged.

The report's "RC follow-through" lists each one.

### 13.6 Evaluation round 1 (2026-10-20): FAIL at 7.0, fixed in one commit

The report and the Generator's response: `sprints/release-2.1/ow-05/eval-round-1.md`. The branch first took `origin/main` (#638, already carried; #639: ow-research 1.0.1, ow-uat 1.0.2, whose published Visa test card moved one data plant a digit off). Still 1.0.0: nothing has shipped.

- **M1, the major:** resume and write-once for `--session` and `--close` are graded on their own step-table rows (`record` and `rollout` per group, `summary` and `closed`); a second section for a group, a second session row, a section with no row once the run says DONE, and a second `## Summary` each fail. Two cut goldens (`rollout-session-resume-rollout`, `rollout-close-resume-closed`), and `references/phase-rollout.md` §3 and §6 now prescribe the resume screens and the STATUS path.
- **The minors:** a success claim in any wording on a refusal, no-op or question screen, and a commit claimed on any screen (m1); `documentation_price` in every form, and any price key in `docs.yaml` or `plan.md` (m2); a PEM block, a value given to a secret-named setting, and a random token beside a secret's name (m3); a common given name, a title with a name and a wider phone shape (m4); a street address, a date of birth, a surname-first name and a customer named or emailed in prose (m5); the key's names in any spelling (m6); the rollout plan and `plan.md`'s Groups and Delivery read for our numbers (m7); a check-in dated before its due date, and usage counts not from the build's log (m8); `delivered.md` reconciled with `deliveries.yaml` (m9); the log's session field anchored to the verb (m10). The nits: a confirmation dated before the work, a scalar header reported cleanly, the `MORE PEOPLE` golden line, and the tautological test replaced by ow-build's own refusal.
- **Owner decision 2026-10-20:** every other workstream's client name and folder slug under `opchain-work/` is a private name in a client output (`references/self-checks.md` §1); internal files and the screen are unaffected, and a follow-on folder of the same client is not another client.
- **OW-06's contract, O6 (a):** the three edits it asks for before this lands, taken here with no version change: the next `OP-nn` after the highest in the runbook's and ow-handoff's operator notes' `ops:` (a reads row, a Reads-from row, the golden `write-runbook-update` with an invented stand-in OW-06 replaces, and a reuse plant); `secrets-seen.log` on the hand-off to `/ow-handoff-notes` (and `HANDOFF_PIN`); and the capture profile on ow-handoff's access-removal list (residual 3 above now has its owner). The body is 4,098 tokens after tightening the Generator's own wording.
- **Held-out sets:** the Generator's were written and hashed before any rule changed, and measured before and after; one claim with no success word ("the export went ahead") stays a reported miss. Two implementation bugs the after-run found (a token before a full stop, a test mark read in an email's `.example` domain) were fixed after the measurement and are labelled so.
- **The sweep:** dropping each file a golden writes found one gap (a re-capture's plan dropped while its run is recorded), fixed; 327 of 327 drops are caught.
