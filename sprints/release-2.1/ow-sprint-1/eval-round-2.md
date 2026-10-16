## Sprint 1 — Evaluation Round 2

**Sprint:** ow-build-plan 1.0.0 (contract `sprints/release-2.1/ow-sprint-1/contract.md`) · **Branch:** `claude/ow-build-plan-sprint-1`, commits `6ffe4eaa..73a8fe2c` (round 2: `6195f795`, `ad72661e`, `73a8fe2c`) · **Evaluator:** skeptical Evaluator, oc-app-architect Phase 6 Step 3 · **Date:** 2026-10-15

I graded this round against the contract, the round 1 report, the owner's 2026-10-15 decisions (a), (c) and (g), the design (`docs/plans/2026-10-06-ow-build-plan-design.md`) and the three sibling designs. I also used the family rules, the audit's cross-talk contract and the diff. Every plant was made in a scratch copy, under the session scratchpad (`eval-s1-r2/`). No tracked file was touched.

### Code Scores

| Criterion | Weight | Score | Justification |
|---|---|---|---|
| Functionality | 30% | **6/10** | Everything automated is green, C1–C11 hold, and round 1's blocking route now works for the three cases it was written for (a `build-plan` recap, a `defined-work` recap and a FIX file). Three routing holes remain on paths a model will actually take. (1) A delivery-mode recap (`path_kind: next-stage`, which ow-start hands to ow-build-plan) is offered only "an offer, a quick quote, or nothing", and none of those is right (new bug 1). (2) The new folder route runs the bare `/ow-build-plan-quote` after an acceptance, so it re-prices a quote the client has already accepted (new bug 2). (3) Round 1's bug 5 is fixed only when there is a FIX file; a follow-on stated in the user's words still splits the offer and the plan across two folders (bug 5, not fixed). |
| Feature Completeness | 30% | **7/10** | All seven deliverables are present, with 21 golden cases, route and follow-on goldens, and an honest `modes:` declaration for `--quick`. Owner decisions (c) and (g) are fully applied. Decision (a) is applied to every `scope.md` read, but ow-build still reads `acceptance.md`, which a quick-quote job never has (new bug 4). There is no golden for a delivery-mode route, for a stated-request follow-on going from offer to start, or for a user-stated schedule. |
| Code Quality | 20% | **7/10** | All 19 round-1 slips are now caught (11 in the acceptance checker, 8 in check-skill-contracts), and each has a planted test. There are 25 new focused tests (150 → 175). Of my 39 new plants, 17 slip (new bugs 6 and 7). Most are peripheral: the `handling` header, a FINDING self-check left in place, `..` in paths, a `shared:` bypass, a NEXT slash-hint mode, and the protocol's `It will read:` / no-folder lines. The route table itself is protected only by a pinned-text vitest, not by any checker. |
| Visual/UX Quality | 20% | **6/10** | The NEXT text is now clean: the contract line prints exactly the say line or the public default. The family ships one set of examples, and nine of ten templates carry the protocol lines. Weak spots for the model running the skill: the resume screen drops three kinds of pending work and keeps listing stale ones (new bug 3); the body is at 4,872 of 5,000 tokens, with the route and resume rules squeezed into single dense sentences; the accepted block's signing line has no no-folder line; and the example `offers.md` says it names "not prices" while holding `hourly_help: { price: 100 }` (new bug 8). |

**Weighted Code Score:** 0.3×6 + 0.3×7 + 0.2×7 + 0.2×6 = **6.5 / 10** (round 1: 6.3)

### Test Results

| Run | Result |
|---|---|
| `node scripts/gen-skills-catalog.mjs` | exit 0: 36 oc- skills, **2 ow skills** (`skills-work/`) |
| `node scripts/check-skill-contracts.mjs` | exit 0 (edges reciprocal, one writer per file) |
| `node scripts/lint-internal-refs.mjs` | exit 0 |
| `node scripts/ow-start-acceptance.mjs` | exit 0: calloway-not-a-fit 5/5, larkspur-notes 6/6, larkspur-prospect 11/11, tidewell-defined-work 5/5 |
| `node scripts/ow-build-plan-acceptance.mjs` | exit 0: **21/21 golden cases pass** (61 checks) |
| `npx vitest run tests/ow-edges.test.js tests/ow-build-plan-acceptance.test.js tests/catalogs.test.js tests/ow-start-acceptance.test.js` | 4 files, **175 run / 175 passed / 0 failed / 0 skipped** (the two new test files of this sprint are included) |
| `npm test` (full) | 112 files, **1755 run / 1755 passed / 0 failed / 0 skipped**, exit 0 |
| `npm run build` | exit 0 (`building opchain-dev worker @ 73a8fe2c`); working tree clean afterwards apart from the untracked `eval-round-1.md` |
| `git diff 6ffe4eaa..HEAD --stat -- skills/ plugins/opchain/ package.json` | **empty** (also empty for `plugins/ src/ site/ package-lock.json .claude-plugin/ mirror/`); `sync-plugin-skills --check` agrees |
| ow-tools `transcribe` in a scratch git repo with the skill's four `.gitignore` lines | Passes the commit check, then exits on the missing speaker model, which phase-collect's exit-3 branch handles. With round 1's two lines it is refused ("would be committable"). |

No failing test, so there is no Functionality cap. All contracted tests are delivered, so there is no Code Quality cap. Not verified: "candidate verifier PASS on every commit".

### Criteria C1–C11

| # | Verdict | Evidence |
|---|---|---|
| C1 | **PASS** | "ow catalog validated: 2 skills"; check-skill-contracts exit 0. |
| C2 | **PASS (tight)** | Body ~**4,872** tokens (chars/4, `estimateTokens`) against 5,000, up from ~4,331. `cmp` shows `ow-protocol.md` byte-identical in both skills. See *Body budget* below. |
| C3 | **PASS** | No `llc-ops` or `Deftwright` anywhere under `skills-work/ow-*`. The test plants and my R1j plant fail. |
| C4 | **PASS** | All four round-1 slips now fail: a dangling hands_off verb, a hands_off verb owned by another skill, a template say that differs from its edge, and a handoff with no template. Gaps are in new bug 7. |
| C5 | **PASS** | The `contract-inputs.md` second writer fails under every spelling round 1 tried (`opchain-work/`, `./`, a different case). `--quick` is declared with `modes: [--quick]` and checked against the body. Gaps (`..`, `<client>-<n>`) are in new bug 7. |
| C6 | **PASS** | 21/21 golden runs. Every §9.2 case except Real use (moved to Sprint 6) has one; there are new route and follow-on cases. |
| C7 | **PASS (with slips)** | Every §9.2 case has a planted failure in vitest. My new plants that slip are listed in new bug 6. |
| C8 | **PASS** | The golden appendix sits inside the markers; the ow-tools preflight test strips it. The extension rate restated by number now fails (R1c). |
| C9 | **PASS** | `signed-before-accepted` writes nothing. The signed NEXT is `use ow-build to start …` with `/ow-build-start`, and its IF line is exactly "give build-request.md to whoever builds it" (golden `build-request.md` `## Next`; plant N7 caught). |
| C10 | **PASS** | The oc- diff is empty (above). |
| C11 | **PASS** | A malformed `answer-key.yaml` or `checks: "headers"` fails only its own case (checked through `runCase(…, { caseDir })`). Broken `handoffs.yaml`, `price-book.yaml` and `offers.md` `after_handoff` each fail only the checks that read them, with the file named. |

### Round-1 bugs re-verified

| # | Sev | Verdict | My reproduction |
|---|---|---|---|
| 1 | B | **FIXED** for the cases it named (but see new bug 1) | Followed ow-start's printed NEXT, `use ow-build-plan on intake/<client>/intake-record.md` (ow-start `SKILL.md:116`). The verb table row `/ow-build-plan on <path>` (`SKILL.md:46`) leads to the route table (`SKILL.md:214-224`). `path_kind: build-plan` → `-offer`, and phase-offer accepts it. `defined-work` → `-quote --quick` (phase-quote §3). `handoffs/<client>/fixes/FIX-nn.md` → follow-on `-offer` in `plans/<client>-<n>/`. The model must say which verb and why, and confirm before writing. The resume screen now lists STATUS lines whose `next:` is `ow-build-plan on <path>`. ow-start's edge names `verb: /ow-build-plan`. The goldens `route-build-plan`, `route-defined-work` and `follow-on-offer` pass; plant N19 (wrong offer subject) is caught. **Not covered:** `next-stage` and `feasibility` recaps (new bug 1), and resume gaps (new bug 3). |
| 2 | M | **FIXED** | `skill.edges.yaml` declares `quote.md` and `quote-items.json` with `verb: /ow-build-plan-quote, modes: [--quick]`. A real second writer still fails. My plant of `modes: [--quick]` on `scope.md` is caught ("not a mode … the body documents"). |
| 3 | M | **FIXED** | `SKILL.md:75,120,165`, `edges:161` and `phase-export.md:39` all say to send the quote without its header and without everything between the `ow:internal` markers. No "send the Markdown after the header" remains. |
| 4 | M | **FIXED** | `phase-start.md:97-100` has four ignore lines, and `phase-collect.md:28-32` handles exits 3, 4 and 5. The real `ow-tools transcribe` accepts the four lines and refuses the old two (Test Results). |
| 5 | M | **NOT FIXED** (fixed only when there is a FIX file) | `phase-offer.md:9` and `phase-start.md:9` reuse a folder whose offer's `subject` names "this request". The `follow-on-offer` → `follow-on-fix` chain passes. A follow-on with no FIX file, the other A4 input (`phase-offer.md:9` "With no FIX file, ask for the request in the user's words"), has no file to put in `subject` (`phase-offer.md:25`: "the recap (or the FIX file)"). The offer also records no `request:`. So `-start` cannot match "this request", takes the next free number (`-3`) and asks for the request again. No golden covers offer → start without FIX (`follow-on-asks` starts from `accepted-signed` with no offer). |
| 6 | M | **FIXED** | `phase-export.md:30` forbids the user's prices, fees and rates, not the client's own figures. The golden's "$1,800" passes; plant R1k ("about 17k") is caught. |
| 7 | m | **FIXED** | `SKILL.md:173` and `phase-quote.md:185` print exactly the say line or the public default, never the word `handoffs.yaml`. Golden `contract-inputs.md:80` is clean. Plant N6 (an explanation appended) is caught. |
| 8 | m | **FIXED** | `SKILL.md:185` read list has a quick variant and includes `quote.md`. `phase-quote.md:194` now says "the scope (the Build Plan, or the quick scope)". |
| 9 | m | **FIXED** | All 11 round-1 plants re-planted, all caught: R1a add-unit modifier, R1b key fragment, R1c rate by number, R1d Valid until, R1e fix-window sentence, R1f unit price in contract-inputs, R1g tester named in contract-inputs, R1h tester named in a quick quote, R1i follow-on rewrites the earlier plan, R1j business say for the wrong file, R1k "17k". |
| 10 | m | **FIXED** | All 8 round-1 plants re-planted, all caught: dangling hands_off verb, verb of another skill, template/edge say mismatch, handoff with no template, `opchain-work/`, `./`, a case variant, and a bogus writer mode. |
| 11 | m | **FIXED** | A malformed key or `checks: <string>` fails its own case (CLI test at `tests/ow-build-plan-acceptance.test.js:441`). YAML errors name the file (my plants above). |
| 12 | m | **FIXED** | `cmp` shows `examples/offers.md` and `examples/handoffs.yaml` byte-identical across ow-start and ow-build-plan, pinned by a test. |
| 13 | m | **FIXED in text** | `phase-quote.md:39,71` list `handling` for quick headers. The checker never reads `handling` (new bug 6). |
| 14 | m | **FIXED** (one residue) | Every NEXT template has `It will read:` and the no-folder line, except the accepted block's `WHEN IT IS SIGNED:` line (`SKILL.md:178-179`), which has the read list but no no-folder line. |
| 15 | m | **FIXED** | Quick `quick-scope.md` records Acceptance coverage and Out of scope present, labelled, inside the markers (`phase-quote.md:54-63`; golden; test at `:395`). A FINDING left in place is not caught (new bug 6). |

### New bugs

Ordered by severity. B = blocking, M = major, m = minor.

1. **[M] A delivery-mode recap has no route to `-start`.**
   - **Where:** `skills-work/ow-build-plan/SKILL.md:220`, `references/phase-offer.md:7`.
   - **What happens:** ow-start's recap header allows `path_kind: … feasibility | not-a-fit | next-session | next-stage` (`skills-work/ow-start/references/intake-record-schema.md:137`). ow-start prints the ow-build-plan NEXT "in delivery mode when the next stage is a Build Plan" (`skills-work/ow-start/SKILL.md:113`), and delivery mode is "discovery on signed work" (`:54`). The route sends every other `path_kind` to "Ask which: an offer, a quick quote, or nothing". For signed work, an offer charges the client again, and the right verb, `/ow-build-plan-start` (whose intake case 3 is exactly this intake record), is not among the choices.
   - **Repro:** a recap with `path_kind: next-stage` and STATUS `next: ow-build-plan on intake/acme/intake-record.md`. "use ow-build-plan on intake/acme/intake-record.md" reaches row 3 of the route table, and the user is offered offer, quick quote or nothing.
   - **Fix:** route `next-stage` to `-start`, and add a golden.
2. **[M] The folder route loses the quote's mode and re-prices an accepted quote.**
   - **Where:** `SKILL.md:222`, `references/phase-quote.md:218`, `references/phase-export.md:47`.
   - **What happens:** A folder `plans/<client>/` runs "the `next:` step of its newest STATUS line". After `-export` and after `--accepted`, that line is `next: ow-build-plan /ow-build-plan-quote plans/<client>/`, because the protocol's `next:` field holds a verb only, and the checker rejects a mode (plant N17). The route therefore runs plain `/ow-build-plan-quote`, which rewrites `quote.md` and `quote-items.json`, the basis `contract-inputs.md` cites. The resume screen shows the same bare `-quote` as the next step for "awaiting acceptance" and "awaiting signing".
   - **Repro:** golden `accepted-signed` STATUS line 10, then "use ow-build-plan on plans/larkspur-ceramics/".
   - **Fix:** when the next step is `/ow-build-plan-quote` and `quote.md` exists, choose the mode from what exists (no `contract-inputs.md` → `--accepted`; no `build-request.md` → `--signed`) or ask. Never re-quote silently.
3. **[m] The resume screen loses and invents pending work.**
   - **Where:** `SKILL.md:212`, `references/phase-quote.md:217`.
   - **Missed: a refused quick quote.** It writes `intake/<client>/intake-record.md | next: ow-build-plan /ow-build-plan-offer intake/…`. That path is not under `plans/` and the next step is not `on`, so it is listed in neither group. With no `plans/` folder (golden `quick-over-limit`), bare `/ow-build-plan` shows the welcome.
   - **Missed: a FIX request from ow-build or ow-handoff.** Its `next: ow-build-plan on handoffs/…` line is not a "fit call".
   - **Listed when it should not be:** "each fit call whose newest STATUS line says `next: ow-build-plan on`" can keep listing a fit call after its offer exists, because the grouping (per path or per client) is not stated.
4. **[m] Decision (a) was applied to `scope.md` reads but not to ow-build's `acceptance.md` reads.**
   - **Where:** `docs/plans/2026-10-08-ow-build-design.md:6` (Upstream: "plan, `acceptance.md`, `quote.md`"), `:41` (`-start` reads "acceptance checks per milestone") and `:133` (`-ready` runs "every acceptance check from `acceptance.md`").
   - A quick-quote job has no `acceptance.md`; its checks are in `quick-scope.md`, which ow-build-plan's own signed NEXT tells ow-build to read (`SKILL.md:185`). ow-uat handles this case (`2026-10-09-ow-uat-design.md:69`); ow-build does not.
5. **[m] The follow-on offer records no request when there is no FIX file.**
   - **Where:** `references/phase-offer.md:9,25`.
   - This is the root of bug 5's remainder: no `request:` key, and `subject` can only be a recap or a FIX path. `-start` asks for the request again and may record different words from those the client was quoted on.
6. **[m] The acceptance checker misses the following** (`scripts/ow-build-plan-acceptance.mjs`). I made 22 new plants; these 7 slipped:
   - **N4/N5:** `handling` dropped from a quick `quote.md` or `quick-scope.md` header. No check reads `handling` anywhere (bug 13's checker half).
   - **N13:** a defined-work route run that also writes `plan.yaml` (`:1052-1055` checks only for an offer).
   - **N14:** the quick scope's "Out of scope present" self-check left as FINDING (`:954` accepts `OK|FINDING|NOT-CHECKED`).
   - **N21:** the same in tier-2 `scope.md` (`checkPlan`, `:441`).
   - **N15:** a quick scope with no `kind: error` check. Tier-2 `acceptance.md` catches this (N22); `checkQuick` (`:943`) only checks that keys are present.
   - **N23:** a quick scope with `cases: a few` (not a whole number).
7. **[m] check-skill-contracts misses the following** (`scripts/check-skill-contracts.mjs`). I made 17 new plants; these 10 slipped:
   - **C1, C2:** deleting the `on <path>` route table or its verb row. C1 is caught only by the pinned-text test in `tests/ow-edges.test.js` "bug 1"; C2 is caught by nothing.
   - **C3:** ow-start's edge `verb:` changed to another of the receiver's verbs (`/ow-build-plan-map`).
   - **C4:** a second writer spelled `plans/<client>/export/../contract-inputs.md` (`normPath`, `:511`, does not resolve `..`).
   - **C16:** a second writer spelled `plans/<client>-<n>/plan.yaml`, which normalises to `plans/<*>-<*>/`, not `plans/<*>/`.
   - **C5:** a NEXT slash hint with an undocumented mode (`/ow-build-plan-quote --bogus`); `:407` captures only the root verb.
   - **C6:** `shared: true` on a client file (`intake/<client>/call-guide.md`) skips reciprocity (`:705`). The README says `shared` is for workspace files; nothing enforces that.
   - **C7, C8:** a template without `It will read:` or the no-folder line (protocol §9).
   - **C11:** ow-start's say changed to `on intake/<client>/recap.md`, a file the route table does not handle.
8. **[m] The example files contradict themselves.**
   - `skills-work/ow-start/examples/offers.md:13` (and its byte copy) says the file "names paths and terms, not prices", but `:84` has `hourly_help: { price: 100 }`. The design puts that price in `after_handoff`, so fix the sentence, not the key.
   - `skills-work/ow-build-plan/examples/price-book.yaml:26-29` sets every schedule to `1/1` business days, so collection and delivery fall on the same day, beside `build_plan_weeks` of 1–2. An unedited copy produces a plan delivered the day after it starts, and nothing cross-checks `delivery_business_days` against `build_plan_weeks` (the offer says "2 weeks").

### Body budget (task item 4)

| Context | Tokens (chars/4) |
|---|---|
| SKILL.md body | **4,872 / 5,000** (97.4%; 128 tokens, about one table row, of headroom) |
| `references/ow-protocol.md` (step 0, opened by every verb) | 1,975 |
| `-offer` (body + protocol + phase-offer + price-book-schema) | 9,054 |
| `-start` | 8,628 |
| `-collect` | 8,235 |
| `-map` | 7,601 |
| `-scope` (+ acceptance-check-format) | 8,141 |
| `-quote`, `--accepted`, `--signed` (+ price-book-schema + contract-inputs-schema, per `SKILL.md:66`) | 12,875 |
| `--quick` (+ acceptance-check-format) | 13,379 |
| `-export` | 7,961 |

The real context per verb (8–13k tokens) is fine for a model. The body budget is not maintainable as it stands: new bugs 1–3 each need a route or resume row, and there is room for about one. The squeeze already shows in three places:

- The resume rule (`SKILL.md:212`) is one sentence carrying two different groupings (new bug 3).
- The folder route is one row that ignores modes (new bug 2).
- The accepted and signed templates keep a literal (`NEXT: handoffs.yaml \`contract\``) that must never be printed, with the real rule in a paragraph above them (`:173`, `:181`).

No verb's phase instructions were cut into ambiguity; the phase files carry the detail. **Recommendation:** move "The verbs without a phase file" (resume and route, about 450 tokens) into `references/phase-route.md` with the usual "open it first" line. That restores about 400 tokens of headroom and gives the fixes room.

### ow-start (task item 5)

- **Shipped behaviour.** The new Hands-off row ("Delivery mode … `/ow-start-prep`") documents a NEXT that ow-start's template already printed (`SKILL.md:121-126`), so no printed text changed. The example change is behavioural: `/ow-setup` creates `offers.md` and `handoffs.yaml` from `examples/`, so a new workspace now gets `## ownership`, `## after_handoff` (with invented placeholder terms) and `## contract_clauses`. ow-start's own offers read is unchanged in substance. The preamble tells the model it reads only `fit` and `path:`. Its if-mismatch row ("list the [sections] that do not parse", `SKILL.md:88`) could still lead a literal model to list the three new sections as unparseable; no fixture exercises that.
- **Version.** **No bump needed.** The family policy is per-skill semver (`catalogs.json` `versionPolicy: per-skill`), but ow-start 1.0.0 has never been released. It is merged on main through #596, has no tag, and its catalog `outputs` are all `null` (no plugin, zip, docs or mirror); v2.1.0 is not cut. Nothing published differs from 1.0.0. Had 1.0.0 shipped, the example change would be a minor bump (new content in a file the skill creates, backward compatible) and the table row a patch. Record both in the v2.1.0 release notes. After that release, any change to `examples/` must bump the skill.
- **Fixtures.** They still match. `scripts/ow-start-acceptance.mjs:360,617` reads `examples/offers.md` live, the path sections it cites (`offers:build-plan-2`) are unchanged, and all four cases pass.

### Owner decisions verified

| Decision | Verdict | Evidence |
|---|---|---|
| (a) keep `quick-scope.md`; amend ow-uat, ow-handoff, ow-build and ow-build-plan consistently | **Applied, one gap** | Every `scope.md` read is amended: ow-uat `:7`, `:69`, `:72`, `:331`, `:346`; ow-handoff `:61`, `:152`, `:326`; ow-build `:96`; build-plan `:62`, `:255`. Each header carries the amendment line. **Gap:** ow-build's `acceptance.md` reads (`:6`, `:41`, `:133`) do not cover a quick-quote job (new bug 4). |
| (g) deadlines from `price-book.yaml` `build_plan_schedule.<tier>`, else asked and recorded user-stated; no hard-coded rule | **Applied** | `phase-start.md:22` and `price-book-schema.md:12`; design `:53` and `:156-159`; the checker (`:379-390`) derives the days from the book or the user-stated record, and decision-g tests cover both. Grep for any per-week or "start + n" rule in `skills-work/`, the design, the fixtures README, the checker and the tests: **none**. Example placeholders: new bug 8. |
| (c) printed contract NEXT is exactly the say line with `{files}`, or the public default, no prefix | **Applied** | `SKILL.md:173`, `phase-quote.md:185`. Golden defaults: `NEXT: send contract-inputs.md to whoever drafts your contracts, …`. Golden business case: `NEXT: use llc-ops to draft the SOW from plans/larkspur-ceramics/contract-inputs.md`. Prefix and suffix plants (tests at `:267`, my N6) fail. The signed IF line follows the same rule (N7). |

### Gaps vs Contract

- Deliverables 1–7 are all present. Deliverable 7 (ow-start's `path_*` header as an edge, not prose) is now met in substance for the build-plan and defined-work paths. It is not met for ow-start's `next-stage` path (new bug 1).
- Test requirements: every listed golden exists. The "Follow-on intake" requirement is only half covered: there is no offer → start golden without a FIX file (bug 5).
- "candidate verifier PASS on every commit" was not verified by this evaluation.

### Verdict: **FAIL**

Every score is ≥ 6, C1–C11 all hold and there is no blocking defect, so this is much closer than round 1. But round-1 bug 5 (major) is fixed only when there is a FIX file, and two new majors sit on the inbound and resume routes this round added. Fixes, in order:

1. **Make room first.** Move resume and route ("The verbs without a phase file") into `references/phase-route.md`, so that items 2–4 fit under the 5k budget with headroom.
2. **Route `next-stage` to `-start` (new bug 1).** Add a route row (`path_kind: next-stage` → `/ow-build-plan-start`) and a golden from a delivery-mode recap. Decide what `feasibility` should do and say it.
3. **Make the folder route mode-aware (new bug 2).** With `quote.md` present, pick `--accepted` or `--signed` from the files that exist, or ask. Never re-quote without an explicit "re-quote". Add a planted test.
4. **Finish bug 5 (with new bug 5).** `-offer` records the stated request (`request:`, `subject: none`), and `-start` reuses the newest follow-on folder whose offer has no plan yet and whose request matches. Add an offer → start golden without a FIX file.
5. **Fix the resume screen (new bug 3).** List every newest-per-client line whose `next:` names ow-build-plan (verb or `on`), including a quick refusal and a FIX request. Group by client slug, not by path.
6. **Amend ow-build's `acceptance.md` reads for quick quotes (new bug 4)**, in the same way decision (a) did for `scope.md`.
7. **Close the checker slips (new bugs 6, 7), at least:** the `handling` header, a FINDING self-check, `kind: error` and whole-number cases in the quick scope, `..` and `<client>-<n>` in `normPath`, `shared:` limited to workspace paths, and the `It will read:` / no-folder lines. Add each as a planted test.
8. **Minors:** the no-folder line on the accepted block's signing line (bug 14 residue); the wording in the example `offers.md`; non-degenerate example schedule placeholders, or a weeks-versus-delivery cross-check (new bug 8).
