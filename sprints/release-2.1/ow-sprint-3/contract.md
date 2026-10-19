# Sprint 3 contract — ow-uat 1.0.0

Amended 2026-10-19 (owner, after evaluation round 3, PASS at 7.8): R3-1 to R3-7 and owner decisions R3-4 and R3-6 are fixed in a follow-up PR ("OW-04 follow-up") right after this one merges; this branch records the decisions as text only.

**Plan:** `sprints/release-2.1/ow-family-sprint-plan.md` Sprint 3, and the Build re-plan's Sprint 3 row (ow-uat 1.0.0 + `calc --calendar us-federal`; no amendments land with it; needs Sprint 2; CLAUDE 17–22h | USER 1–2h) · **Design:** `docs/plans/2026-10-09-ow-uat-design.md` (approved 2026-10-14, decision 12, with B1, B2, B3, H1, H2, P1, P2; amended 2026-10-15 for `quick-scope.md`). Sibling designs it must stay true to: ow-build (§13 rows 8, 9, 15, 16, 23, 29), ow-handoff (H1, H2, decision 9), ow-documentation (§4.1 reads), ow-tools (§5.4, table rows 18 and 20) · **Base:** `origin/main` @ `691afdfe` (#616, ow-build 1.0.0) · **Skill:** oc-app-architect `/oc-build`, Generator proposes, Evaluator reviewed · **Status:** APPROVED by the owner 2026-10-17 (all recommendations O1–O9 accepted) 

**Definition of done (plan):** a synthetic UAT runs from `ready-for-uat.md` to a signed acceptance record, a superseded request and a deemed request (with invented test clauses), and hands `signoff.md` to ow-build's invoice path.

**Owner decisions carried in (not reopened):**
- **D1.** An internal number is OUR side only: our effort and hours, rates, costs, margin, multipliers, and overruns against our own plan. The client's schedule, figures, ratios, payment terms and dates are allowed.
- **D2.** For meaning checks like Sprint 2's C5, the checker is a regression net, the skill's self-check covers implied claims, and Sprint 6's real-model runs measure the rest.
- **D3.** A too-big UAT-nn goes to ow-build-plan (ow-build prints that NEXT). The ready NEXT is `use ow-uat-plan on builds/<client>/ready-for-uat.md`.
- **D4.** `--deemed` and `--backstop` refuse until the owner's clauses exist in `offers.md`. Writing the clause wording is the owner's contract step, not this sprint.
- **D5.** No real prices in the repo. Fixtures are invented. No private names or client names.

## Deliverables

1. **`skills-work/ow-uat/SKILL.md`.**
   - Agent Skills frontmatter only, version 1.0.0, protocol 1.
   - Body **≤ 4,500 tokens**, enforced by the catalog through `catalogs.json` `bodyTokenBudgets` and not only by a vitest. Sprint 2 had 99 tokens of headroom, and lumped rows contradicted the phase files.
   - Contents: step 0 pointer, welcome, a verb table with all five verbs and every mode from design §3, Reads-from and Hands-off tables (one row per file, never lumped), absent-cases, and NEXT blocks with their slash hints.
2. **`references/`:**
   - `ow-protocol.md`, byte-identical to the source.
   - `routing-and-resume.md`, written first. It covers the R4 resume step, basis-mismatch handling, every inbound route in C4, and the `/ow-uat` resume screen if O4 is approved.
   - One phase file per verb: `phase-plan.md`, `phase-pack.md`, `phase-run.md`, `phase-defect.md`, `phase-signoff.md`.
   - Schemas: `uat-yaml-schema.md`, `scenario-format.md`, `run-format.md`, `defect-format.md`, `signoff-schemas.md` (request, `signoff-requests.yaml`, `signoff.md`, acceptance record, punch list, backstop log, addendum).
   - `contract-calendar.md`: the US federal holiday rules, a precomputed 2026–2030 table for the no-tool path, and how clause calendar names map to `us-federal`.
   - `self-checks.md`: the ten design §9 checks, with the D1 our-side categories and the allowed client-side examples written out.
3. **`skill.edges.yaml`** for ow-uat:
   - writers that are exact per verb and mode (C1);
   - a reads row for each file in design §3.1, plus ow-build's `changes/requests.md` (O6);
   - hands-off rows, with `fields`, for every file ow-build and ow-build-plan already read from ow-uat (`UAT-nn.md`, `signoff.md`, `backstop.md`, `uat.yaml`);
   - hands-off rows to the planned ow-handoff and ow-documentation that carry the files and fields their approved designs read (C14).
4. **Family wiring.** These change merged skills and shared files; O1, O2 and O9 decide how.
   - `catalogs.json`:
     - Remove `ow-uat` from `planned` and `/ow-uat-plan` from `plannedVerbs`.
     - Add `plannedVerbs` for ow-handoff (`/ow-handoff-start`, `/ow-handoff-fix`) and ow-documentation (`/ow-documentation-start`, beside `-delivered`).
     - Add `bodyTokenBudgets.ow-uat: 4500`, and `statusNames` for `/ow-uat-signoff` (`request <n>`).
   - ow-build's ready hand-off row lists the fields ow-uat reads (Sprint 2's D8 rule).
   - ow-build-plan's `UAT-nn.md` reads row is marked per O1.
   - The shared `examples/offers.md` gains a commented `uat:` block: defaults when a quote has no UAT line, minimum testers per role, `follow_up_business_days`. Every copy stays byte-identical.
   - `check-skill-contracts` gains the O1 and O2 rules, each with planted failures.
5. **Acceptance tests.**
   - `scripts/ow-uat-acceptance.mjs`, `tests/fixtures/ow-uat/`, `tests/ow-uat-acceptance.test.js` and `tests/ow-uat-plants.test.js`.
   - Built from the start on Sprint 2's end state: per-check isolation, category rules keyed on who a statement is about, must-pass false-positive controls, writer checks exact to the mode, run-level one-writer for every verb, and plants kept as permanent vitest cases.
   - Inputs are the family's real goldens, never fresh stand-ins:
     - `larkspur-ceramics`: ow-build's `ready-passing` output, 40/40/20, 9 checks including CO-01.
     - `mossgate-books`: 50/50, backstop.
     - A quick-quote client: `quick-scope.md`, roles from its UAT approach.
6. **Cross-skill parity.** ow-build's stand-in fixtures (`INVENTED TEST FIXTURE … ow-uat is not built yet`: three UAT-nn files, `signoff.md`, `backstop.md`) are replaced by copies of ow-uat golden outputs. A test keeps the copies byte-identical, and ow-build's 54 goldens still pass.
7. **ow-tools, the Sprint 3 part** (version and order per O3):
   - `calc date --calendar us-federal` in `lib/calc.mjs`, with CLI help and a `version --json` capability.
   - Design §5.4 and table row 20 updated, and the §4.2 calls-table rows for ow-uat `-pack` and `-signoff`.
   - `SECURITY-MANIFEST.md` regenerated by `gen-ow-tools-manifest.mjs`, and the version bumped.
   - The **tester-pack export fixtures** (table row 18): a pack per role and a sign-off request, run through the preflight and a real-binary export.
8. **Design follow-up.** Add a "Build notes (ow-uat 1.0.0, Sprint 3)" section to the ow-uat design that records every departure and run-time question, as ow-build §13 did. Seeded from the Evaluator review below:
   - the pack Markdown source;
   - the sign-off request export;
   - `rec` ordering;
   - per-step resume records;
   - the documentation NEXT wording;
   - the condition that turns out too big.

## Testable criteria

| # | Criterion | How it is verified |
|---|---|---|
| C1 | **Catalog and edges.** The catalog validates 4 ow- skills. Reciprocity, one writer, NEXT resolution and field offers hold across the family. Writer modes are exact: `uat.yaml`/`agreed/`/`scenarios/` ← `-plan` (+ `--add-co`, `--addendum`, `--keep-frozen`, `--refreeze`); `signoff-request-<n>.md` ← plain `-signoff`; `signoff.md`, `acceptance-record.md`, `punch-list.md` ← `--signed`/`--deemed` only; `backstop-log.yaml` ← `--readiness`/`--builder-delay`; `backstop.md` ← `--backstop`; `acceptance-addendum-CO-nn.md` ← `--addendum`; `evidence/index.md` and `runs/` ← `-run`; `defects/` ← `-defect` | `gen-skills-catalog`, `check-skill-contracts`. Plants: a one-sided edge, `-run` writing `UAT-nn.md`, `--sent` writing `signoff.md`, a dangling NEXT, an unoffered field |
| C2 | Body ≤ 4,500 tokens, enforced by the catalog; the protocol copy and the shared examples are byte-identical | catalog check; a planted 4,600-token body fails the **catalog**, not just a vitest |
| C3 | No private or brand names, no oc- skill names, no real prices and no clause wording in skill text. The build, sign and invoice destinations appear only through `handoffs.yaml` | family-name check. Plants: `llc-ops`, the brand name with a space, a hyphen and in a different case, `app-architect`, a price in words, a pasted clause sentence |
| C4 | **Every inbound route has a golden at every stage.** Each lands on exactly one correct verb and never re-freezes `agreed/` or rewrites a write-once file. See the route matrix below | route goldens + a plant per cell (wrong verb; a re-plan over a frozen basis; a request rewritten) |
| C5 | **ow-build reads ow-uat's real files.** ow-build's checker, run on ow-uat goldens, gives: Change → `/ow-build-change`; an extension set → one change order; Defect, Training gap, Environment or data, Duplicate → nothing; `signoff.md` → the acceptance invoice; `backstop.md` → the delivery half, once; `uat.yaml`'s governing definition applied | cross-skill vitest; deliverable 6's byte test |
| C6 | **No internal numbers (D1, D2)** in ow-uat's client outputs: the tester pack (md, html, pdf, docx), the results template, sign-off requests and their exports, the acceptance record, the punch list, acceptance addenda, and the reason the client sees on a UAT-nn. OUR side: our hours or effort on fixes, the UAT extension rate and other price-book internals, our cost or margin, our overruns against our own plan. Allowed: the quoted UAT line (price, roles, sessions, fix rounds, fix days), session dates and test durations, "10 of 10" cases, records created, a signed change order's price, payment terms, deemed and backstop dates | Regression net: every known plant caught, and **≥ 30 must-pass client sentences written before the rules**. The self-check text names the categories. A planted read of `price-book.yaml`, `margin.md` or a time export anywhere in the skill fails |
| C7 | **The four checks that can never be waived** (No credentials, People by role or id, Data check, No private names). A typed waiver is refused for each. Each check has category rules plus false-positive controls:<br>• **credentials:** labelled secret values, key-shaped tokens, URL user-info; allowed: "your login comes from the client ops lead", "reset the ops tester's login", "test mode";<br>• **people:** email or phone shapes, a name column, the fixture's listed tester names; allowed: role names, tester ids such as `ops-T2`, the user's own name in "recorded by";<br>• **data:** value rows or copied field values in scenarios, packs or reused evidence; allowed: pointers (source, ids, count, fields), and cases passed as a count | the design §11 Names, Credentials and Real data cases as goldens; a plant per category; the controls must pass; `secrets-seen.log` holds kind, role, source and session, never the value |
| C8 | **No false pass**, a meaning check on who tested. Every pass has `run_by` and `source`. A result the user ran or read out is never written under a tester's role. Checks whose only pass is `user alone` are listed under "checked by the builder; not tested by your people". No client sentence credits such a check, or an unretested UAT-nn, to the client's people or calls it fixed | goldens (no-show, builder-run request); plants: "your team confirmed AC-3.1" on a user-alone pass, "UAT-05 is fixed" with no `retested-pass` on the latest build; controls: correct attributions |
| C9 | **Exit criteria 1–5 and the request lifecycle** (design §8): a required scenario passing on the latest build label; regression; `session_date`; supersession in **recording order** (`rec`); the late-minor exemption; judging as of the signature date; a superseded request refused; writing request 3 supersedes request 2 | the design §11 Coverage, Required scenario, Regression, Request lifecycle, After the signature date, Late minor and Session date cases, each as a golden and a plant |
| C10 | **Triage and the rapid fix phase** (§6, §7): classes with their terminal states; severity gates on Defects only; per-Defect bounds, an escalation that never blocks recording; a builder cause free; one client-side event giving one extension request cited by every affected UAT-nn; the punch list; conditions (signed, then `--add-co`, then pass; declined, so it lapses; too big, per O6); after sign-off, `-defect` refuses and prints `use ow-handoff-fix on handoffs/<client>/` | the §11 Triage, Condition, Rapid fix and bounds, Punch list and After sign-off (ow-uat half) cases |
| C11 | **The contract calendar.**<br>• `ow-tools calc date --business-days N --calendar us-federal` matches the published federal holidays for 2026–2030 (fixture table), including observed days. Example: 2027-12-31 is observed for 2028-01-01, a Saturday.<br>• `--calendar` with `--days`, or with `--holidays`, is exit 2.<br>• Before 2022 or after 2099 it refuses with a stable reason code.<br>• The skill computes every clause date through calc and records the command and output.<br>• Without ow-tools, or with an ow-tools that lacks the capability, it uses `contract-calendar.md` and labels the result "not machine-checked". The table equals calc's output.<br>• Worked case: sent Friday 2026-11-20 plus 10 business days is 2026-12-07 (Mon–Fri alone gives 2026-12-04) | calc unit tests; a table ↔ calc equality test; the capability-detection golden; the plant: a deemed date counted Mon–Fri |
| C12 | **Deemed acceptance and the backstop** (§8.1, §8.2).<br>• With `contract_clauses: not set` or `clauses: none`, `--deemed` and `--backstop` refuse, `STATUS.md` keeps its awaiting line, and NEXT suggests a follow-up after `follow_up_business_days`.<br>• With **invented test clauses** (marked `INVENTED TEST CLAUSE, not contract wording`), the frozen clause in `uat.yaml` is byte-equal to `contract-inputs.md`'s.<br>• The deemed date is the latest of the three dates; the cannot-reproduce notice counts only within 3 business days.<br>• The request's first sentence states the deemed date.<br>• All eight backstop refusals hold, and `backstop.md` is written once.<br>• An unknown clause calendar refuses (O8) | the §11 Deemed and Backstop cases; plants: a reworded clause, a late notice moving the date, a second `backstop.md` |
| C13 | **Write-once and per-step resume.**<br>• `-plan` records `plan_steps` in `uat.yaml` as it goes. `--signed` and `--deemed` record `signing_steps` in the request's `signoff-requests.yaml` row.<br>• Every multi-file verb writes its marker file last (`RUN-nn.md` after its index rows; `signoff.md` after the record and the punch list).<br>• A session cut off at any step resumes at the first missing step without re-freezing `agreed/` or rewriting a file.<br>• Runs, requests and the three sign-off files are never edited | goldens for a cut-off `-plan` (after the freeze, before scenarios) and a cut-off `--signed` (record written, no `signoff.md`); plants: a re-freeze on resume, an edited run |
| C14 | **Hand-offs to the next stages.**<br>• `signoff.md` holds the request number, the signed or deemed date, the signer role, the build label, post-acceptance change orders, test accounts (role, environment, created-by, never a login) and the backstop date.<br>• `acceptance-record.md` cites evidence by `cleared` pointer only.<br>• `punch-list.md`, `agreed/` (with the included block and the ownership terms), `secrets-seen.log`, the evidence states, Training-gap UAT-nn, scenarios and `uat.yaml` roles carry the names H1 and ow-documentation §4.1 read.<br>• The NEXTs print in design §8's order: invoice on larger projects only, `ow-handoff-start`, documentation only when `documentation_sku: bought` (O5) | goldens for larger and smaller projects with the SKU bought and declined; a field-presence test against the H1 and §4.1 lists (reciprocity is enforced when Sprints 3b and 4 land) |
| C15 | **The pack and its exports** (§4.4, §5).<br>• Each role's pack Markdown passes the ow-tools preflight (Node only, always runs).<br>• The real-binary PDF and DOCX export skips and says so without pandoc and Typst.<br>• Without ow-tools, the HTML pack passes the HTML checks (`lang`, title, one `h1`, no skipped headings, table headers, contrast).<br>• The results-template header is exactly the six design columns, with no name column.<br>• A production pack with a side-effect scenario that has neither a test-mode line nor an approval line is refused; a production plan with a synthetic data source is refused | goldens; preflight in the test; the §11 Production case; plants: a name column, an internal section left in the export, a missing alt text |
| C16 | **The checker fails per check and never crashes** | malformed-file tests: `uat.yaml` as a directory, binary CSV, invalid YAML, a truncated request |
| C17 | **Plants are permanent.** Every evaluator plant from every round lands in `tests/ow-uat-plants.test.js`. A skip is allowed only when it names an owner decision, and the label has to be honest (Sprint 2 R4-3) | review of the file at each round |
| C18 | **No regressions.** oc- outputs are byte-identical. The ow-start, ow-build-plan and ow-build goldens and plants still pass, apart from deliberate fixture swaps that are listed (deliverable 6) | snapshot before and after; `npm test`; the three acceptance scripts |
| C19 | **ow-tools release integrity.** The manifest is regenerated and `--check` passes. The version line and both `marketplace.json` fields match O3. `calc` opens no socket (Sprint T's no-network fence when it is on main; otherwise the 1.0.0 import test). There is no new dependency | the existing ow-tools suites + the new calc tests |

**C4 route matrix.** Each cell is one golden and one plant.

| Inbound (from) | Say | Stages graded |
|---|---|---|
| ow-build ready | `use ow-uat-plan on builds/<client>/ready-for-uat.md` | no `uat/` folder (plan) · `ready: no` (stop, failures listed) · file missing (`use ow-build to mark the build ready for UAT`, `/ow-build-ready`) · `-plan` cut off (resume) · plan complete (no re-plan; name the next verb) · after sign-off (stop) |
| ow-handoff `-start` | `use ow-uat-signoff on uat/<client>/` | criteria unmet (refuse, naming each gap) · request drafted · sent · deemed date passed, with clauses and with none · signed or deemed (refuse; NEXT `ow-handoff-start`) |
| ow-handoff `-fix` | `use ow-uat-defect on uat/<client>/` · `use ow-uat-plan --addendum CO-nn` | addendum scenarios exist (logged against the change order) · none yet (NEXT `--addendum`) · a main-basis report after sign-off (refuse; `ow-handoff-fix`) |
| ow-documentation `-start` | `use ow-uat-signoff` (no path) | one client in STATUS · none or several (ask) |
| ow-uat's own NEXTs | condition change order signed → `--add-co`; Defect fixed → retest run; request → `--sent` / `--signed` | each stage it is printed from |
| `/ow-uat on uat/<client>/` (only with O4) | folder route | planned · packed · runs with open Defects · fixed, awaiting the confirmation run · criteria met · drafted · sent · signed · addendum open |

## Test requirements

- [ ] A golden run and a planted failure for every design §11 case except Real use.
  - For Post-acceptance CO, Test accounts and After sign-off, only ow-uat's half is graded here; the ow-handoff half moves to Sprint 4.
- [ ] A golden run and a planted failure for every §3.1 absent-case and mismatch row.
- [ ] Every cell of the C4 matrix.
- [ ] Must-pass false-positive controls for C6, C7 and C8, written before the rules (≥ 30 for C6, ≥ 10 for each C7 category and for C8).
- [ ] check-skill-contracts plants for O1 and O2:
  - an in-place read whose producer does not write the file;
  - an in-place read no chain of hand-offs reaches;
  - a skill-local append log written by a second skill.
- [ ] calc: a fixture table of 2026–2030 holidays, the observed-day edges, the usage errors, and the out-of-range refusal.
- [ ] The ow-tools pack fixtures: preflight on every golden pack and sign-off request; a real-binary export that skips and says so.
- [ ] Cross-skill: ow-build's checker on ow-uat outputs (C5).
- [ ] `npm test`, `npm run build` and `npm run evidence:pr` are green, and the candidate verifier passes on every commit.

## Technical approach

Follow Sprint 2's end state, not its starting point.

1. **Rulings first.** Record the owner's O1–O9 answers in the design's build-notes section before any code.
2. **Checker infrastructure.** Extend `check-skill-contracts` for O1 and O2 with plants, so ow-uat's own edges are checked from their first commit.
3. **Edges and routing.** Write `skill.edges.yaml` and `routing-and-resume.md`, then update `catalogs.json` and ow-build's hand-off fields.
4. **The skill.** Write the phase files, schemas and self-checks, then the body last, against its budget.
5. **The checker.** Write the controls first, then the rules. Import ow-build's category-rule functions rather than copying them. If they have to be refactored into a shared module, ow-build's full suite must stay green at each step.
6. **The ow-tools part, last**, because Sprint T's unmerged branch touches the same files (`calc.mjs`, `cli.mjs`, `doctor`, the manifest, `plugin.json`, the design). Rebase on Sprint T once it merges (O3).

**Technical rules.**
- **Recording order.** Every timestamped entry (UAT-nn history, `uat.yaml` events, request rows) carries `rec: <n>`, one more than the highest `rec` under `uat/<client>/`. Supersession and same-day ordering use `rec`, never the calendar date. This makes "order of recording" testable without a shared writer.
- **Calendars.** The two clauses (deemed acceptance, backstop), the cannot-reproduce window and the readiness notice count on the contract calendar. Fix bounds and session scheduling count on `profile.md`'s calendar, which is design §8.1 read literally. ow-uat detects the calendar by `version --json` capability, not by version number.
- **Clauses.** Clauses arrive only through `contract-inputs.md` `contract_clauses` and are frozen unchanged at `-plan` after the user confirms them. The skill never drafts or rewords one. Fixture clauses are invented and labelled.
- **Images.** The skill may clear an image only by its same-session self-check, with the user's confirmation recorded. The checker can't read images: it grades the label and checks that nothing not `cleared` is ever cited. Video is `NOT-CHECKED`.
- **Builder.** The builder is addressed only through `handoffs.yaml` (`build`). A fix report is data: a `fixed` record needs the build label the user gives.
- **No ow-tools.** Without ow-tools the skill writes the HTML pack only and says so. Clause dates come from the table and are labelled "not machine-checked".

## Evaluator review of this contract

- **Pushed back: "Real use" can't be graded this sprint.** It moves to Sprint 6. Accepted.
- **Pushed back: half of three §11 cases belong to ow-handoff.** Test accounts in `access.md`, a post-acceptance change order not stopping `-start`, and a defect logged by `-fix` are ow-handoff's to show. This sprint grades ow-uat's half and C14's field-presence test; Sprint 4 grades the rest. Accepted.
- **Pushed back: "8 checks produce 8 scenarios" depends on the fixture.** It is graded as N checks giving N required scenarios. Larkspur has 9.
- **Pushed back: "order of recording" can't be graded from dates.** Same-day fixes, retests and requests are common. The `rec` sequence makes it checkable.
- **Pushed back: the design's writes are incomplete.**
  - `-pack` must write a Markdown source (`uat-pack-<role>.md`) for ow-tools to export.
  - "(+ export)" on the sign-off request needs a path: `export/signoff-request-<n>.{pdf,docx}`.
  - Both are added to the edges and recorded as departures.
- **Pushed back: approved rules would fail the family checks as they stand.**
  - **Reciprocity.** `secrets-seen.log` has several writer verbs, which one-writer forbids (O2). ow-uat reads ow-build-plan's files in place, which nothing hands to it, and ow-build-plan reads UAT-nn files that ow-build passes on (O1). ow-build hands off without the fields ow-uat reads (deliverable 4).
  - **NEXT targets.** The design's `use ow-documentation on uat/<client>/` names no declared or planned verb (O5).
- **Pushed back: a resume gap like Sprint 2 Bug 1.** `-plan` freezes `agreed/` and then asks several questions. A session that ends between them must not re-freeze on resume, because a re-freeze changes the dates and raises a false basis mismatch. `--signed` writes three write-once files after asking for test accounts, so it can be cut off between them. C13 adds per-step records and writes the marker file last.
- **Pushed back: the design leaves a too-big condition open.** A sign-off condition whose request ow-build finds too big for a change order (D3) has no defined state (O6).
- **Pushed back: meaning checks can't be complete.** Per D2, names, credentials, real data and who-tested claims are each a regression net plus the self-check, with must-pass controls written first. Sprint 2's round-4 false-positive rate (39% on new legitimate sentences) is the failure to avoid.
- **Added: C5, C11's table equality test, C13 and C17**, from Sprint 2's Bugs 1–3 and R4-3 and from Sprint 1's lesson that a built artefact broke a sibling's read row.
- **Not graded: rendering the PDF and DOCX in real apps.** That is the owner's manual check in Sprint 6.

## Open for the owner

| # | Decision | Options | Recommendation |
|---|---|---|---|
| O1 | **Files read in place.** ow-uat reads ow-build-plan's scope, acceptance checks, quote, contract inputs and maps, and ow-build's `ledger.md`, though nothing hands them to it. ow-build-plan reads UAT-nn files that ow-build passes on. The reciprocity check fails on all of these | (a) add hand-off rows (and NEXT templates) to merged skills that never print them; (b) add an `in_place: true` reads row, which the checker accepts only if the producer writes the file and a chain of hand-offs leads from the producer to the reader; (c) relax reciprocity | **(b)**: no false NEXTs, still checkable. Sprints 3b, 4, 4b and L need the same thing |
| O2 | `secrets-seen.log` has several writer verbs, but one-writer allows that only for append-only logs the protocol names | (a) add it to protocol §4 as append-only, which edits every byte-identical copy in three merged skills; (b) a skill-local append log declared in the edges, written only by its own skill; (c) one writer verb | **(b)**. ow-handoff's own log needs the same in Sprint 4 |
| O3 | ow-tools version and timing for `--calendar us-federal` (Sprint T, 1.1.0, is unmerged and puts it out of scope) | (a) in Sprint 3's PR as **ow-tools 1.2.0**, after Sprint T merges; (b) the same PR as 1.1.1; (c) fold it into Sprint T; (d) a separate small PR first | **(a)**. It is a new capability, so it is a minor version. Sprint T's approved contract stays closed. ow-uat detects the calendar by capability, so 1.1.1 also works if you would rather keep one 1.1 line for v2.1.0. If Sprint T hasn't merged when the skill is ready, the PR waits and rebases rather than racing it |
| O4 | Add a bare `/ow-uat` verb (a resume screen and `/ow-uat on <path>`, no writes)? The design's §3 has five verbs | (a) no; (b) yes | **(b)**. It is the family pattern (`/ow-build`, `/ow-build-plan`) and gives the folder route at every stage. The ready NEXT stays `use ow-uat-plan` (D3) |
| O5 | The documentation NEXT wording | (a) `use ow-documentation on uat/<client>/` as the design says, which needs a planned routing verb; (b) `use ow-documentation-start on uat/<client>/` (`/ow-documentation-start`) | **(b)**: the same rule as the ready NEXT, and it matches ow-documentation's own verbs |
| O6 | A sign-off condition whose request ow-build finds too big for a change order | (a) it keeps blocking until the client withdraws it, recorded as `condition withdrawn by <role> <date>`; (b) it lapses automatically; (c) ask each time | **(a)**, with `-defect` reading ow-build's `changes/requests.md` row in place to learn the outcome. A silent lapse would sign off over a client's stated condition |
| O7 | A fix that runs past the quoted fix bounds for the builder's own reasons (free) | (a) dates and rounds measured against the quoted bounds may appear in client text ("fixed on 14 January, after the 5 business days quoted, at no charge"), but our hours and the extension rate never do; (b) any overrun past the bounds is internal | **(a)**. The bounds are quoted contract terms, so this applies D1 rather than widening it |
| O8 | A clause calendar other than US federal | (a) refuse to compute clause dates and say the calendar isn't supported; (b) dates the user states, marked not machine-checked | **(a)** for 1.0.0. These dates move money |
| O9 | Version handling for the edits to merged skills (shared `offers.md` example, edges data, ow-build's stand-in fixtures, `catalogs.json`) | (a) edits to data, examples and tests ride without a version bump and are listed in the PR and under `[Unreleased]`; any change to a SKILL.md or reference bumps that skill; (b) bump every touched skill to x.y.1 | **(a)**. No skill's behaviour changes. Sprint 2's round-4 note was about text edited in place |

## Owner decisions after evaluation round 1 (2026-10-17)

Round 1 (`eval-round-1.md`) failed at 6.6 with three majors (R1-1 to R1-3). The owner ruled on the Evaluator's five open questions; these amend the criteria above.

| # | Decision | Amends |
|---|---|---|
| OD-1 | **An in-place read needs a chain that carries the file.** A reads row marked `in_place: true` passes only if **every hop** of a chain of hand-offs from the producer to the reader lists that file, or a field from it, in its hand-off. A hop that hands on a file another skill wrote marks the entry `in_place: true`. OW-08's header-only "index" read kind is separate and unaffected | O1; C1 |
| OD-2 | **Merge order.** The PR waits for OW-03 (ow-tools 1.1.0) to merge, then merges main in. The calendar commit conflicts with OW-03 in nine files; that merge is not done until OW-03 has passed its evaluation | O3; C19 |
| OD-3 | **The data check catches generic shapes**: a delimited row of three or more fields that holds an email, a phone number, a card-like number or an ID-like token, and a long table of values. Its must-pass controls are written first. Everything else stays with the self-check | C7 |
| OD-4 | **The backstop applies only after the backstop date has passed**, from the following day, unless the frozen clause explicitly says otherwise (the same as deemed acceptance). The design and the phase text say the same | C12 |
| OD-5 | **Frozen clauses by digest.** At freeze time `-plan` records a digest of just the block it copied from `contract-inputs.md`; later verbs compare it with the same block's current digest upstream, never the whole file. `--refreeze` copies only that block, never the whole file. This settles R1-2 (`agreed/contract-terms.md` is ow-uat's own extract, so it never byte-matches its upstream) | C9, C12, C13 |

Round 2 also fixes R1-1 to R1-19, makes every Evaluator plant from round 1 a permanent test (an idiom may stay as a named skip), and measures a new held-out set written before any rule changed: 15 our-side sentences, 15 legitimate ones, 10 data and 10 false-pass.

## Owner decisions after evaluation round 2 (2026-10-17)

Round 2 (`eval-round-2.md`) failed at 7.1 with one major (R2-1: OD-5's no-code path never compared the clauses). The owner ruled on the Evaluator's open questions; these amend the criteria above and OD-3 and OD-5.

| # | Decision | Amends |
|---|---|---|
| OD-6 | **The frozen terms block covers more than the clauses**: the payment schedule and `payment_terms_days` as well. Where code runs, they are checked by the block's digest; where it can't, by comparing the text. A change upstream blocks `-pack`, `-defect` triage and every `-signoff` mode until the block is re-frozen (or kept frozen) | OD-5; C9, C12, C13 |
| OD-7 | **A table is judged by its content, never its length.** The data check flags a table only when its rows carry personal or ID-like values (emails, phone numbers, card-like numbers, ID tokens, names); count and schedule tables pass at any length. This replaces OD-3's "long table of values" | OD-3; C7 |
| R2-1 | **Confirmed: with no code, compare every part of the terms block as text**: the clauses in `uat.yaml`, the schedule and the payment terms, the UAT line, the definitions, the SKU and the ownership terms, labelled not machine-checked. The checker never skips that comparison | OD-5; C12 |

OD-2 came due in round 3: main (with OW-03's ow-tools 1.1.0, #623) is merged in, not rebased, and ow-tools becomes 1.2.0 on top of 1.1.0. Round 3 also fixes R2-1 to R2-10, makes every Evaluator plant from round 2 a permanent test, and measures a new held-out set written before any round-3 rule changed: 15 our-side sentences, 15 legitimate ones, 10 false-pass (with negations and futures), 10 credentials and 10 tables.

## Owner decisions after evaluation round 3 (2026-10-19)

Round 3 (`eval-round-3.md`) passed at 7.8 with no major defect. The owner ruled on its two open questions. Both decisions, and the minors R3-1 to R3-7, are built in the OW-04 follow-up PR, not on this branch.

| # | Decision | Amends |
|---|---|---|
| R3-6 | **`--refreeze agreed/acceptance.md` refuses when the upstream check list has changed**, and its NEXT points to `--add-co`. A new check then gets its scenario, its test and its price through the change-order path. `--refreeze` never re-derives `uat.yaml` `checks` or writes a scenario | OD-5; C9, C13 |
| R3-4 | **Test data the provider publishes, or marks as test, is allowed**: a payment provider's published test card numbers, and record ids marked sandbox or test (the clean-up pointers a request lists), pass the data check. A real card shape, or an id with no sandbox or test marking, is still refused | OD-3, OD-7; C7 |

## Effort

**The plan's figure:** CLAUDE **17–22h** | USER **1–2h** (the re-plan's Sprint 3 row; the original Sprint 3 section said 12–16h).

**The realistic figure, from measured sprints:** about **5.5–7h** of Claude wall-clock time.

| Part | Measured norm | Sprint 3 | Why |
|---|---|---|---|
| First build | 1–1.5h | **1.5–2h** | Five verbs with 11 modes; two new check-skill-contracts rules; about 60–70 goldens (Sprint 2 had 54); the calc calendar and the pack fixtures |
| Fix + evaluation rounds | 3–4 × ~55 min | **4 × 55–60 min ≈ 3.7–4h** | Sprints 1 and 2 each needed 4 rounds. Three new meaning categories (names, credentials, data) will repeat Sprint 2's precision round unless the controls come first |
| PR landing | ~45 min | **~45 min–1h** | Rebasing on Sprint T, regenerating the manifest, fresh evidence |

USER: about **1.5–2.5h**. That covers contract approval and O1–O9 (about 45 min), reading four evaluation reports and any mid-sprint ruling (about 1h), and the squash-merge (about 15 min). Calendar time also waits on Sprint T merging first (O3).

The plan's figures are in maintainer hours and run about 3× the measured wall-clock time. Re-basing the remaining sprints on the measured norm would make the release calendar more honest.
