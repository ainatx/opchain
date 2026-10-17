## Sprint 2 — Evaluation Round 1

**Sprint:** ow-build 1.0.0 (contract `sprints/release-2.1/ow-sprint-2/contract.md`, C1–C12, C12 = B4) · **Branch:** `claude/ow-build-sprint-2`, commits `ae289d77..70136e92` · **Evaluator:** skeptical Evaluator, oc-app-architect Phase 6 Step 3 · **Date:** 2026-10-16

I graded against these sources: the contract; the design `docs/plans/2026-10-08-ow-build-design.md` (§12, the 2026-10-14/15 amendments and the new §13); amendment B4 (`docs/plans/2026-10-16-ow-documentation-design.md` §11, from `origin/claude/ow-documentation-design`); the family rules (`skills-work/README.md`, `skills-work/ow-protocol.md`, audit R1–R16); the sibling designs ow-uat and ow-handoff; and the defect classes in the four Sprint 1 reports. I made every plant in a scratch copy, and no tracked file was touched.

### Code Scores

| Criterion | Weight | Score | Justification |
|---|---|---|---|
| Functionality | 30% | **5/10** | Every automated check is green, and the signed NEXT, a UAT-nn Change, a FIX-nn Change and the folder-at-invoice route all land correctly. But a model running the skill as written still goes wrong in six places. (1) A session that ends while the builder plans leaves no `build.yaml`, so re-saying the signed NEXT re-runs `-start` and rewrites `ledger.md` and `spec/` (Bug 1). (2) Four approved inbound NEXTs from ow-uat and ow-handoff dead-end (Bug 3). (3) A UAT-nn or FIX-nn handed over twice is priced twice (Bug 4). (4) `-ready` and `-demo --record` rewrite files that ow-uat or an invoice already relies on (Bug 6). (5) A "quoted separately" documentation line has no amount (Bug 7). (6) The body's absent-cases refuse `-start` on every quick-quote job (Bug 8). |
| Feature Completeness | 30% | **6/10** | All six deliverables exist: the skill, 13 references, both examples, the edges file, the checker with 35 golden runs and 96 tests, and the §12.2 quick-quote sources. B4 is in. Every §10 and §12.7 case has a golden run. Gaps: the folder route has a golden at one stage only, and the checker cannot grade the other stages (Bug 2). The FIX class "Not a defect" is missing (Bug 4). `spec/` writes are not declared as edges (Bug 5). The no-builder mode has no file state for milestone completion (Bug 10). Design §13 omits some departures. |
| Code Quality | 20% | **5/10** | The checker is well built. Each check is isolated (my three malformed-file probes each failed only their own check), amounts are matched by value, and the email validator is real. It is still thinner than the rules it claims. Of 45 new non-control plants against it, **24 slip**. Once a trace row exists, almost every paraphrase of internal numbers, "done" or "started" gets through, and so do second writers of `ledger.md`/`build.yaml` inside a run. The folder-route check rejects correct `-run`, `-demo`, `-ready` and `-change --signed` routes (Bug 2). In `check-skill-contracts`, **6 of 19** new non-control plants slip. All contracted tests were delivered, so no cap applies. |
| UX (clarity for person and model) | 20% | **6/10** | The welcome, verb table and NEXT blocks are plain and consistent. The builder line is printed for the user to say, never run, which is clear. But the body (the first thing a model reads) contradicts the phase files on absent-cases (Bug 8). The body has 99 tokens of headroom. The ready NEXT drops the protocol's slash hint (departure 9). After UAT sign-off, the folder route reprints a stale "use ow-uat on ready-for-uat.md". The change-order state machine in the text disagrees with the golden (Bug 11). |

**Weighted Code Score:** 0.3×5 + 0.3×6 + 0.2×5 + 0.2×6 = **5.5 / 10**

### Test Results

| Run | Result |
|---|---|
| `node scripts/gen-skills-catalog.mjs` | exit 0: 36 oc- skills, **3 ow skills** |
| `node scripts/check-skill-contracts.mjs` | exit 0 |
| `node scripts/lint-internal-refs.mjs` | exit 0 |
| `node scripts/ow-start-acceptance.mjs` | exit 0 (2 golden cases) |
| `node scripts/ow-build-plan-acceptance.mjs` | exit 0 (all golden cases pass) |
| `node scripts/ow-build-acceptance.mjs` | exit 0: **35/35 golden cases** pass |
| `npx vitest run` (ow-build-acceptance 96, ow-build-plan-acceptance 110, ow-start-acceptance 30, ow-edges 37, catalogs 43) | 5 files, **316 passed / 0 failed** |
| `npm test` (full) | 113 files, **1896 passed / 0 failed**, exit 0 |
| `npm run build` | exit 0 (`building opchain-dev worker @ 70136e92`). Working tree clean afterwards |
| `git diff ae289d77..HEAD --stat -- skills/ plugins/opchain/ package.json` | **empty** |
| Body tokens (chars/4, the catalog estimator) | **4,401** (ow-build-plan 4,579, ow-start 3,343) |
| Protocol copies | `shasum` identical: source + 3 copies (`65508e8d…`) |

**New tests:** 96 in `tests/ow-build-acceptance.test.js` (new file). `ow-edges`, `catalogs` and `ow-build-plan-acceptance` were updated, not extended. Every contracted test requirement is present: goldens plus a planted failure per §10/§12.7 case, the HTML validator plus the twin check, and npm test/build green. I could not verify "candidate verifier PASS on every commit".

### Criteria C1–C12

| # | Verdict | Evidence |
|---|---|---|
| C1 | **PARTIAL** | Both catalog scripts pass, and reciprocity holds for the declared edges. But `spec/06-testing.md` is written by `-start` and appended by `-change --signed` (`builder-integration.md:46,83`, `phase-change.md:95`), and the edges file declares no `<repo>/spec/` write at all. Declaring the truth fails one-writer (plant C04: `<*>/spec/06-testing.md: 2 writers`). This is Sprint 1 Bug 2's class again. `build.yaml` is also rewritten by `-start` on a map resume after seeding. |
| C2 | **PASS** | 4,401 < 4,500 and the protocol copy is byte-identical. Caveat: the catalog gate is 5,000, so the 4,500 limit is enforced only by one vitest assertion. Plant C18 (4,731 tokens) passes both catalog scripts. |
| C3 | **PASS (with slips)** | No oc- name, private name or business appears in `skills-work/ow-build/`. The builder appears only in fixture `handoffs.yaml`. Planted `oc-app-architect`, `llc-ops` and `Deftwright` are caught. Slips: `app-architect` (C10), `Deft wright` (C11), `Deft-wright` in an email (P37), `Example-Builder` in `spec/` (P19), and a price in words (C12). |
| C4 | **PARTIAL** | The goldens `route-signed-plan`, `route-uat`, `route-fix` and `route-folder` pass, and the vitest Defect/Training-gap/Duplicate/Fix/unsigned/started cases pass. Not met: the FIX class "Not a defect" has no route; a UAT-nn already priced is re-priced; sibling inbound NEXTs (`…from uat/<c>/signoff.md`, `…delivery payment`, `…mark the build ready for UAT`) dead-end at §2.5. The folder route is graded at one stage, and the checker fails a correct route at four others (Bugs 2–4). |
| C5 | **PARTIAL** | Amounts by value, hour counts, and "margin", "rate" and "effort" keywords are caught. Paraphrases slip once traced: "well over what was planned" (T01, worded from the fixture's own note), "over our estimate", "a week and a half of work", "spent six days", "a 1.25 multiplier", "1.25×", "a 25% surcharge", unit prices in words, "paid the first forty percent" and the contract value in words in `spec/`. |
| C6 | **PASS** | 35 goldens. Every §10 case except Real use, and every B4 case, has a golden and a vitest plant. |
| C7 | **PASS** | `start-nine-checks` (9 checks verbatim), `start-uncovered` (stop, no `-run` NEXT), `run-m1-next`/`run-m1-done` (one sprint, demo NEXT), `run-escalated` (milestone stopped) and `start-no-build` (public default, no `spec/`) all pass, each with plants. |
| C8 | **PASS (with slips)** | The `signature-gate` and `change-signed` goldens pass, and the email-reply and spec-before-signature plants are caught. Slips: "Stock on hand is coming along nicely" (T09); the unsigned CO under another name (T10); "We have already started on it" in the demo summary (P18; the gate scans only `updates/`). |
| C9 | **PASS** | 40/40/20 (booking, working-demo, acceptance) and 50/50 (booking, delivery by handoff or by backstop, second half refused). The calc split output is checked against the real `calc.mjs`, or the request is marked not machine-checked. |
| C10 | **PASS** | The diff is empty, the build output is unchanged, and `plugins/opchain/skills matches skills/`. |
| C11 | **PASS** | `build.yaml` as a directory, a binary checks file and an invalid `handoffs.yaml` each fail only their own check, with a reason. No crash. |
| C12 | **PASS (with gaps)** | `invoice-documentation` passes (one request, 4,000.00, `share: none`) and `invoice-documentation-refused` writes nothing. Declined-but-invoiced and invoiced-twice plants are caught, and so are my P27 (before `delivered.md`), P28 (recomputed price) and P29 (two files). Gaps: `documentation_price: quoted separately` is unhandled (Bug 7); `share: 20` on the documentation request slips (P30); a further training-group CO has no pricing source (Bug 17). |

### Routing walk (as a model reading the text)

| # | Input | Lands on | Verdict |
|---|---|---|---|
| 1 | ow-build-plan signed NEXT `use ow-build to start plans/<slug>/`, no `builds/` | `/ow-build-start` | OK (golden) |
| 2 | Same, `build.yaml` with `map_check: OK` | `phase-start` §1.1 stops and routes the folder | OK (vitest) |
| 3 | Same, map stopped | resume at §6 after asking whether the sprint plan changed | OK |
| 4 | Same, after `spec/` was written and the plan line printed, with the session ended before sprint-plan approval | no `build.yaml` and no STATUS line, so a **full** `-start` re-runs, re-asks everything, rewrites `ledger.md` and the five `spec/` files and reprints the plan line | **WRONG** (Bug 1) |
| 5 | Unsigned plan, or a feasibility quote | says so, writes nothing | OK |
| 6 | `UAT-nn` class Change | `/ow-build-change` | OK |
| 7 | `UAT-nn` × 3 `extension requested, client cause` | one extension CO | OK (golden) |
| 8 | `UAT-nn` Defect / Training gap / Duplicate / "Environment or data" | nothing, says so | OK (the last is paraphrased as "Environment") |
| 9 | `UAT-nn` with no class | ask | OK |
| 10 | `UAT-03` again after CO-02 cites it (history still says `extension requested, client cause`) | `-change` again: a second CO and a second invoice | **WRONG** (Bug 4) |
| 11 | `FIX-nn` Change / After the window | `-change`; at or over the limit it stops with the ow-build-plan NEXT | OK (golden) |
| 12 | `FIX-nn` Fix | nothing | OK |
| 13 | `FIX-nn` "Not a defect" (ow-handoff §7.3) | no row in §2.3 or phase-change §1 | **UNDEFINED** (Bug 4) |
| 14 | `FIX-nn` Change with `route: care` | priced here, although ow-handoff sends it to care | wrong (Bug 4) |
| 15 | Folder, started, booking not requested | `-invoice` | OK |
| 16 | Folder, mid-milestone (sprint handed, no result) | `-run M1`, which reads the result first | OK in text; the checker rejects it (Bug 2) |
| 17 | Folder, sprint 1 pass, sprint 2 left | `-run M1` | OK in text; no golden |
| 18 | Folder, milestone `ready for demo`, no script | `-demo M1` | OK in text; the checker rejects it |
| 19 | Folder, script exists, demo not yet held | step 6 picks `-demo M1` again and rewrites the script | wrong (Bug 6) |
| 20 | Folder, record with `trigger_confirmed` | `-invoice` working demo | OK (golden) |
| 21 | Folder, CO `draft` and the client agreed | `--agreed`, but phase-change §6 refuses draft → amendment out | contradictory (Bug 11) |
| 22 | Folder, CO `amendment out`, user says signed | `--signed` | OK |
| 23 | Folder, all demoed, no ready file / `ready: no` | `-ready` | OK in text; the checker rejects it |
| 24 | Folder, `ready: yes` | prints the ready NEXT and stops | OK |
| 25 | Folder after UAT sign-off (40/40/20) | `-invoice` acceptance, then step 9 reprints "use ow-uat on ready-for-uat.md" | invoice OK; the later NEXT is stale (Bug 12) |
| 26 | 50/50 after `dates.yaml`, then again | delivery invoiced, then refused | OK (golden) |
| 27 | ow-uat's "use ow-build to invoice the acceptance payment from uat/<c>/signoff.md" | §2.5: "not a file this skill takes over", stop | **WRONG** (Bug 3) |
| 28 | ow-handoff's "use ow-build to invoice the delivery payment" / ow-documentation's "…the documentation line" (no path) | probably `-invoice` by meaning; client not named | ambiguous (Bug 3) |
| 29 | Folder, no-builder mode, M1 not demoed | steps 5 and 7 do not apply, step 6's "sprints all pass" is vacuous, and no file says M1's checks pass | undefined by files (Bug 10) |
| 30 | A builder file (`sprints/sprint-2/eval-round-1.md`) | §2.5 stop | OK |

The text never reports change-order work as started before a signature, and never runs `-start` over a started build, except at row 4, where no file shows the build has started.

### Planted failures

**Acceptance checker** (`plant.mjs`, 51 plants, 6 controls). **27 caught, 24 slipped.** Eight of the 27 (P01–P03, P12–P16) were caught only because I left the sentence untraced. I then re-planted them with a trace row (T01–T07, T09–T10) and all of those slip.

Slipped:
- **Internal numbers:** P04 "1.25 multiplier"; P05 "1.25×"; P06 unit prices in words; P08 "25% surcharge"; P09 "paid the first forty percent" in `spec/`; P10 the contract value in words in `spec/`; T01 "well over what was planned" (straight from `update/session/notes.md`); T02 "over our estimate"; T03 "a week and a half of work"; T04 "spent six days".
- **Done / started:** T05 "The accounting link is finished" (the feature is named outside `not_passing`); T06 "now available"; T07 "taken care of"; T09 "coming along nicely" for an unsigned CO; T10 the unsigned CO under another name; P18 "already started" in the demo summary.
- **One writer in a run:** P23 `-update` rewrites `ledger.md`; P24 `-demo --record` writes `build.yaml`; P25 `-change --signed` writes `build.yaml`.
- **Other:** P19 `Example-Builder` in `spec/`; P30 documentation `share: 20`; P32 an embedded instruction in a sprint report, neither quoted nor recorded in `embedded_instructions`; P33 CO-02 citing `UAT-3.md` for `UAT-03.md`; P37 `Deft-wright`.

Caught (selected): P07 and P11 amounts by value; P20 a builder verb (as a tool word); P22 the checkpoint name in `build.yaml`; P26 `spec/` written by `-invoice`; P27–P29 B4; P31 an invoice written by `-run` on a report's instruction; P34 a `./`-prefixed or case-variant path in `spec` Sources; P35 a wrong basis path; P36 a NEXT not in the edges; P38 the builder's fix line in `ready-for-uat.md`; P39 a check not verbatim; P40 a wrong `checks_total`.

**check-skill-contracts / catalog** (`plant-contracts.mjs`, 20 plants, 1 control). **14 caught, 6 slipped.**
- Caught: C01–C03 second writers (including the `./opchain-work/Builds/…/Ledger.md` spelling); C04 the truth plant for `spec/`; C05–C08 undeclared NEXT/STATUS verbs and drift; C13 a routing reference that drops FIX-nn; C14; C15; C17; C20.
- Slipped: C10 `app-architect`; C11 `Deft wright`; C12 "1,500 dollars"; C16 a reads field the producer never writes (`documentation_amount`); C18 a body of 4,731 tokens (vitest-only); C19 the delivered.md reads row removed while the body still reads it.

Folder-route probe (custom key, `route` check only): the correct goldens `run-m1-next`, `demo-script`, `ready-passing` and `change-signed` **all fail** the route check.

### Bugs

1. **[M] `-start` has no resumable state between handing over `spec/` and the sprint-plan approval.** `references/phase-start.md:43` prints the plan line. `:47` maps the sprints only "when the user says the builder's sprint plan is approved". `build.yaml` and the STATUS line are written only at `:49-55` (or `:47` on a stopped map). The builder's planning has its own approval gate and normally ends a session. When it does, `ledger.md` and five `spec/` files exist with no `build.yaml`. Re-saying the signed NEXT then goes through `phase-start.md:7-9` (no `build.yaml`) into a full `-start`: it re-asks the update day and sources, rewrites `ledger.md` and the `spec/` files the builder may have edited, and reprints the plan line. `/ow-build` still lists the plan as waiting. **Repro:** take the `start` golden without `build.yaml` and its STATUS line. `expectedRoute` (`scripts/ow-build-acceptance.mjs:1508-1510`) returns `start`, and nothing tells the phase to resume at §6. **Fix:** write `build.yaml` with `map_check: pending (sprint plan not approved)` and a STATUS line at the end of §5, and resume §6 on `pending`.
2. **[M] The folder route (C4) is graded at one stage, and the checker fails correct routes at the others.** `folderRoute` (`scripts/ow-build-acceptance.mjs:1526-1535`) returns only `start | invoice | other`. `checkRoute` (`:1546-1560`) reports `build.yaml` as "written by start", and `demos/`, `ready-for-uat.md`, `changes/` and `spec/` as another verb's files. **Repro:** a route key `{ from: builds/larkspur-ceramics/ }` against the goldens `run-m1-next`, `demo-script`, `ready-passing` and `change-signed` gives four failures. `route-folder` (invoice) is the only folder golden. A real run that routes correctly to `-run`, `-demo`, `-ready` or `--signed` can never pass.
3. **[M] Inbound NEXTs from approved sibling designs do not route.**
   - ow-uat sign-off prints "use ow-build to invoice the acceptance payment from uat/<client>/signoff.md" (`2026-10-09-ow-uat-design.md:254`).
   - ow-uat backstop prints "…the delivery payment (backstop)" (`:279`).
   - ow-handoff `-delivered` prints "…the delivery payment" (`2026-10-08-ow-handoff-design.md:49`).
   - ow-uat `-plan` prints "use ow-build to mark the build ready for UAT" (`uat:68`).

   `routing-and-resume.md:91` (§2.5) says any other path is "not a file this skill takes over" and stops, so the sign-off handoff is refused. `skill.edges.yaml:15` `routes.paths` lists none of `signoff.md`, `backstop.md`, `dates.yaml` or `delivered.md`. Only ow-documentation's wording is acknowledged (`routing-and-resume.md:79`), and it carries no client path. This is Sprint 1 Bug 1's class. **Fix:** add route rows mapping each trigger file to `/ow-build-invoice` for `builds/<slug>/` and the ow-uat stop to `-ready`, and resolve the pathless forms from the newest STATUS line or ask.
4. **[M] UAT/FIX coverage is incomplete, and nothing stops double pricing.**
   - `routing-and-resume.md:56-59,67-69` and `phase-change.md:12-13` have no row for ow-handoff's class **Not a defect** (`handoff design §7.3`).
   - A FIX-nn Change with `route: care` would be priced here.
   - ow-uat's "Environment or data" is written "Environment".
   - Neither file refuses a UAT-nn or FIX-nn already in `changes/requests.md` or cited by a CO's `requests:`. ow-uat keeps `extension requested, client cause` in the history after it adds `extended, client cause, CO-nn` (`uat design:169`), so re-handing UAT-03 after CO-02 makes a second extension CO and, once signed, a second invoice. The checker agrees: `scripts/ow-build-acceptance.mjs:1515` returns `change` for any file with that history line.
5. **[M] `spec/` writes are undeclared, and `spec/06-testing.md` has two writer verbs.** `skill.edges.yaml:17-43` declares no `<repo>/spec/` path, though its own header (`:5-6`) says `<repo>/…` paths belong in the file. `-start` writes the five files, and `-change --signed` appends to `06-testing.md` (`phase-change.md:95`, `builder-integration.md:83`). Plant C04 shows the truth fails one-writer. Design §13 row 1 ("`build.yaml` … written afterwards only by `-run`") is also inaccurate, because `-start` rewrites `build.yaml` on a map resume (`phase-start.md:8,47`). The appended `## Change order CO-nn` section lands after `## Sources` (golden `change-signed/.../06-testing.md`), which breaks "every spec file … ends with a `## Sources` list" (`builder-integration.md:42`).
6. **[M] Re-runs overwrite artefacts that another skill or an invoice already relies on.**
   - `phase-ready.md:52` ("Run `-ready` again …; it rewrites this file") has no guard once a `ready: yes` file has gone to ow-uat. §1 checks only demo records. ow-uat takes its build label from that file (`uat design:119`). A `/ow-build-ready` after `uat/<client>/uat.yaml` or `signoff.md` exists silently rewrites it.
   - `phase-demo.md:34-47` (`--record`) has no guard on an existing `M<n>-record.md` whose `trigger_confirmed` already backs an `INV-request-working-demo.md`. A re-run can flip it to `not confirmed` after invoicing.
   - `routing-and-resume.md:82` picks `-demo M<n>` again when a script exists and the demo has not happened, which rewrites the script.

   **Fix:** refuse in all three cases and say why.
7. **[M] B4: a "quoted separately" documentation line has no amount.** ow-build-plan writes `documentation_price: <amount, "quoted separately", or none>` (`ow-build-plan/references/contract-inputs-schema.md:35`; above `quote_separately_above` people). `phase-start.md:30` copies it as the ledger amount, and `phase-invoice.md:19` invoices "at its own price". With "quoted separately", the model either writes a non-numeric amount or invents one, which breaks "never invents a price". **Fix:** `documentation: { sku: bought, amount: none (quoted separately) }`, and have `-invoice` ask for the separately agreed price and record it `user-stated` (or stop).
8. **[M] The body's Reads-from table contradicts the phase files and the edges.** `SKILL.md:97` lumps `quote.md`, `plan.yaml` and `contract-inputs.md` under "If absent: Refuse `-start`". A quick quote has no `plan.yaml` (`phase-start.md:3`, `skill.edges.yaml:76`; the `start-quick` input has none). An absent `contract-inputs.md` means `documentation: none` (`phase-start.md:30`, `skill.edges.yaml:71`). A model reads the body first, so it can refuse `-start` on every quick-quote job. This is the Sprint 1 body-budget squeeze class. `phase-invoice.md:3`'s read list also omits `contract-inputs.md` and `docs/<client>/delivered.md`, which its own table (`:14`) needs.
9. **[M] The meaning-based checks slip on paraphrase (C5, C8, no false done).** `INTERNAL_TERMS`/`SPEC_TERMS`/`DONE_WORDS`/`STARTED_WORDS` (`scripts/ow-build-acceptance.mjs:444-466`) are word lists. `checkNoFalseDone` (`:1413`) watches only the answer key's `not_passing` phrases. `changeGateIn` (`:899`) runs only on `updates/*.html` and only on `change_phrases`. With a trace row present, 9 of 10 paraphrases slip (T01–T07, T09, T10), and 6 more slip in CO emails and `spec/` (P04–P06, P08–P10). Run-level one-writer is not checked for `-update`, `-demo` or `-change` (P23–P25). `embedded_instructions` is not required for a sprint report (P32), and the CO `requests:` paths are not normalised (P33).
10. **[m] The no-builder mode has no file state for a finished milestone.** `build-yaml-schema.md:55` says milestones "move when the user reports them done", but nothing records that report. `routing-and-resume.md:87` drops steps 5 and 7, and step 6 ("sprints all pass") is vacuous with no sprints, so `/ow-build on builds/<slug>/` cannot pick the demo or the next milestone from files. `phase-update.md:24` re-asks progress every week. No golden covers a no-builder folder route. This is the public-default mode.
11. **[m] The change-order state machine is inconsistent.** `phase-change.md:91` refuses steps out of order, `draft → sent → amendment out → …`. Yet `routing-and-resume.md:80` sends `draft` straight to `--agreed`, and the golden `change-signed` history goes draft → agreed → signed with no `sent`. The text does not say which states `--declined` accepts. `--sent` has no STATUS line form (`phase-change.md:100`).
12. **[m] The ready hand-off is under-specified.** `SKILL.md:205` and `phase-ready.md:53` print `use ow-uat on …` with no `(where slash commands exist: /ow-uat-plan)` hint (protocol §9 form). After UAT sign-off, `routing-and-resume.md:85` reprints that ready NEXT as if acceptance testing had not happened.
13. **[m] The email template has no contrast rule.** `email-template.md:7` uses `colors.primary` for the 14 px brand line and the 18 px `<h2>` headings. Both are normal-size text and need 4.5:1, but the fixture `brand.yaml` comment allows primary at 3:1. The fixture colours pass (8.66:1 and 17.40:1), but neither the template nor `validateEmailHtml` checks contrast. A logo with no `logo_alt` is unspecified. None of the 5 golden emails has an image, so alt text is exercised only by the unit test.
14. **[m] check-skill-contracts misses these:** C10, C11, C12, C16, C18 and C19 (above). C2's 4,500 limit lives only in `tests/ow-build-acceptance.test.js:593`, and the catalog gate is 5,000.
15. **[m] Body and phase-file drift.** There are 99 tokens of headroom. `-run` is `build.yaml`'s only writer after seeding, yet neither `SKILL.md:63` nor `phase-run.md` points it to `build-yaml-schema.md`. `SKILL.md:55` ("one STATUS line" per writing run) disagrees with `phase-invoice.md:56` (one per request; none on refusal).
16. **[m] `CO-nn.md` has no `signed:` date key.** ow-handoff (`handoff design:67,161`) and ow-uat (B3) classify "a non-extension CO signed after the sign-off date", so they would have to parse `history`/`signature_note` prose. Add `signed: <date>`.
17. **[m] There is no pricing path for a further training-group CO.** ow-documentation §3 says each further group is "a change order at the per-group add-on through `ow-build -change`". `phase-change.md:38-39` prices only `units`, and `documentation_training.per_extra_group_of_15` is not one, so it stops with "unpriced". That is safe, but it is the wrong source.

### Departures (design §13 and the run-time questions)

| # | Departure | Ruling | Reason |
|---|---|---|---|
| 1 | One writer: `ledger.md` → `-invoice`, `build.yaml` → `-run` | **Change** | The direction is right, and so is the trigger moving into the demo record. But the statement is untrue for `spec/06-testing.md` and for `build.yaml` on a map resume (Bug 5). Declare both honestly in the edges (for example `seeded_by` plus an append mode for `--signed`) and correct the row. |
| 2 | "In session" = the user says the printed line | **Accept** | Protocol §1. It matches design §12's intent without imitating the builder. |
| 3 | `change-inputs-CO-nn.md`, `requests.md`, CO statuses, `AC-CO-nn.m` ids | **Accept** (amend design §6 step 4 and §12.5 text) | Nothing in ow-uat or ow-handoff reads `change-inputs.md`. The contract destination receives the name through `{files}`. ow-uat and ow-handoff read `CO-nn.md` by `status`, which matches. Fix the state-machine text (Bug 11) and add `signed:` (Bug 16). |
| 4 | Update trace in `-checks.md` | **Accept** | It keeps the trace out of anything the client can forward. |
| 5 | Demo summary email | **Accept** | Design §9 names it. |
| 6 | Margin: share from the quote's pricing lines; burn = hours × a user-stated hour value | **Accept** | It is internal only and asked once, not invented. |
| 7 | The working-demo milestone is asked | **Accept** | The quote names one demo. Follow-up for ow-build-plan: record it at `-quote`. |
| 8 | Extension quantity and schedule impact asked; a too-big UAT-nn asks | **Accept** the asks. **Needs owner decision** on the UAT-nn route | ow-handoff A2/A4 give FIX-nn a route to ow-build-plan. The owner should say whether a too-big UAT Change goes the same way. |
| 9 | Ready NEXT `use ow-uat on builds/<client>/ready-for-uat.md`, and `catalogs.json` `plannedVerbs: { ow-uat: [/ow-uat] }` | **Needs owner decision**, plus **change** | This changes what ow-uat must implement. The approved ow-uat design (§3) has no bare `/ow-uat` routing verb, and B1 names `use ow-uat-plan on …`. The protocol §9 form is the better wording, but it obliges ow-uat to add a routing verb that takes `ready-for-uat.md` to `-plan`. Amend ow-uat §3 by owner decision. Either way, add `(where slash commands exist: /ow-uat-plan)`. |
| 10 | The builder's name and lines never written | **Accept** | Decision 9 and §12.7. |
| — | Not listed in §13: `INV-request-<trigger>` (design §3 says `<milestone>`); `-start` reads `documentation_price` from `contract-inputs.md` (B4 says "from the quote"); `map_check` and `embedded_instructions` keys | **Accept**, and add them to §13 | Each is necessary and consistent. The documentation price needs Bug 7's case. |

**Run-time questions.** All of these are necessary and consistent with the family rules and the siblings: handling; update day and first update; sources; git-ignore; builder repo; sprint plan approved; a sprint citing two milestones; uncovered check; "is this the sprint's report"; escalation settled; weekly notes and demo date; time-row assignment and hour value; working-demo milestone; demo held and seen working; CO schedule impact, extension quantity and set; client agreed; signed amendment; unpriced price; ready environment, known issues, test data, build label and confirmation pass; invoice date; payment date. One needs an owner decision: the too-big UAT-nn route (row 8). One is missing: the price of a "quoted separately" documentation line (Bug 7).

### Email (task item 5)

All 5 golden emails pass the validator. They have `lang`, a `<title>`, one `<h1>`, no skipped headings, `role="presentation"` tables and inline styles only, and each `.txt` twin matches its HTML word for word. Tool words, hours, unit prices and modifiers are absent. Contrast is fine with the fixture colours, but no rule or check enforces it (Bug 13). No golden carries a logo, so `alt` is tested only in the validator's unit test.

### Body budget (task item 6)

The body is ~4,401 tokens (17,601 chars). The Phases list (`SKILL.md:59-65`) tells a model which reference to open for each verb, and each phase file opens its schema or `builder-integration.md` where it needs it. One exception: `-run` is never pointed to `build-yaml-schema.md`. Headroom is 99 tokens, and the space-saving lumping of read rows has already produced a contradiction (Bug 8).

### Gaps vs Contract

- Deliverable 4: the edges omit every `<repo>/spec/` write (Bug 5).
- Deliverable 2 / C4: `routing-and-resume.md` covers the three contracted inbound kinds, but not every class of them, and not the sibling trigger NEXTs (Bugs 3, 4).
- Deliverable 5: the folder-route goldens and checker cover the invoice stage only (Bug 2). "Meaning-based term checks from the start" is only partly true (Bug 9).
- C12: the "quoted separately" documentation line is unhandled (Bug 7).
- I did not verify "candidate verifier PASS on every commit". Gmail and Outlook rendering is deferred to Sprint 6 per the contract.

### Verdict: **FAIL**

Functionality (5) and Code Quality (5) are below 6. C1, C4 and C5 are only partly met, and there are nine major defects. Fixes, in order:

1. **Resumable `-start` (Bug 1).** Persist `build.yaml` with `map_check: pending` and a STATUS line before the plan line is printed. Resume §6 from it. Add a golden for the session gap.
2. **Route every inbound edge (Bugs 3, 4).** Add route rows for `uat/<c>/signoff.md`, `backstop.md`, `handoffs/<c>/dates.yaml` and `docs/<c>/delivered.md` → `-invoice`, and for ow-uat's "mark the build ready" → `-ready`. Resolve pathless forms from STATUS or ask. Add FIX "Not a defect" and `route: care` rows. Refuse a UAT-nn or FIX-nn already in `requests.md` or a CO's `requests:`. Add goldens and plants for each.
3. **Grade the folder route at every stage (Bug 2).** Teach `folderRoute` the §2.4 order (`-run`, `-demo`, `--signed`, `-ready`, stop). Add goldens for mid-milestone, milestone done, ready and after sign-off.
4. **Declare the writers honestly (Bug 5).** Add `<repo>/spec/` writes, with `-change --signed` as a declared append. Correct design §13 row 1. Keep `## Sources` last.
5. **Guard the re-runs (Bug 6):** `-ready` after ow-uat has started, `--record` over an invoiced record, and `-demo` over a script before the demo.
6. **B4 "quoted separately" (Bug 7)**, plus `share: none` enforced by the checker (P30).
7. **Fix the body's absent-cases (Bug 8)** by splitting the lumped row, and buy headroom by moving the Hands-off table detail into a reference.
8. **Close the checker slips (Bug 9, Bug 14).** Add an overrun/estimate vocabulary, multiplier and surcharge words, amounts in words, "available", "taken care of", "coming along", gating on demo summaries, run-level one-writer for every verb, `embedded_instructions` for reports, path normalisation in CO `requests:`, case-insensitive builder names, business-name spacing variants, reads-field checking against the producer's writes, and the 4,500 budget in the catalog config. Re-plant each as a vitest.
9. **Owner decisions:** departure 9 (an ow-uat routing verb vs `/ow-uat-plan`; add the slash hint either way) and departure 8 (the too-big UAT-nn route).
10. **Minors:** Bugs 10–13 and 15–17.
