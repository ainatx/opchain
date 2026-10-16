## Sprint 1 — Evaluation Round 3 (final round before escalation)

**Sprint:** ow-build-plan 1.0.0 (contract `sprints/release-2.1/ow-sprint-1/contract.md`) · **Branch:** `claude/ow-build-plan-sprint-1`, commits `6ffe4eaa..9b37a61c` (round 3: `7acd1449`, `9c65528c`, `9b37a61c`) · **Evaluator:** skeptical Evaluator, oc-app-architect Phase 6 Step 3 · **Date:** 2026-10-15

I graded against the contract (C1–C11), the round-2 report (ordered fixes 1–8, new bugs 1–8, the round-1 bug 5 remainder and the bug 13/14 gaps), the design, the family rules and the owner's 2026-10-15 decisions (a), (c) and (g). I reproduced every result below myself. Plants were made in scratch copies under the session scratchpad (`eval-s1-r3/plant-accept3.mjs`, `plant-contracts3.mjs`; the round-2 scripts re-run from `eval-s1-r2/`). No tracked file was touched.

### Code Scores

| Criterion | Weight | Score | Justification |
|---|---|---|---|
| Functionality | 30% | **6/10** | Everything automated is green, C1–C11 hold, and all three round-2 majors are fixed on the paths they named: a `next-stage` recap starts the plan with `fee: none`; an exported quote is never re-priced by a folder route; a stated follow-on keeps one folder and one request. Two new money-path majors arrived with the round-3 code. (1) A revised quote, `quote-r<n>.md`, is written but nothing reads it, so `--accepted` copies the original `quote.md` prices into `contract-inputs.md` (new bug 2). (2) The folder route has no correct step for a signed folder: its only "nothing left" branch can't be reached through STATUS, and its fallback runs "the verb its `next:` names", which is ow-build's `/ow-build-start` (new bug 3). |
| Feature Completeness | 30% | **7/10** | All seven deliverables are present. There are 25 golden cases (21 → 25), including the delivery-mode route, the folder route and both halves of a stated follow-on. Decision (a) now covers ow-build's `acceptance.md` reads. Decision (g) **regressed**: a hard-coded 5-business-days-per-week rule is back as a check (new bug 1). There is no golden for a signed or accepted folder route, a delivery-mode quote, or a revised quote. |
| Code Quality | 20% | **7/10** | Every round-2 plant is caught: 31 + 5 acceptance plants, and 23 contracts plants plus C1 and C2 re-planted against the new layout. The new checks (`routes:`, `..` and `<client>-<n>` normalisation, `shared:` limits, protocol §9 lines, slash-hint modes, `quote_frozen`, `follow_on`) work for what they target. Of my 44 new plants, 12 slip every automated check and 4 more are caught only by pinned-text vitest (detail in new bugs 2, 6 and 7). |
| UX (clarity for person and model) | 20% | **7/10** | The body is down to ~4,326 tokens and still coherent: the verb table and the Phases list both send `/ow-build-plan` and `on <path>` to the reference, under the "do not run this phase from memory" rule. The routing reference is clearly written as numbered rules. Weak spots: `phase-start.md` contradicts itself on the delivery-mode fee; the 5× prompt talks about "the offer" in delivery mode, where there is no offer; the offer NEXT's `It will read:` line omits `request.md`; and the resume grouping hides a client's second pending item (new bugs 4 and 5). |

**Weighted Code Score:** 0.3×6 + 0.3×7 + 0.2×7 + 0.2×7 = **6.7 / 10** (round 1: 6.3, round 2: 6.5)

### Test Results

| Run | Result |
|---|---|
| `node scripts/gen-skills-catalog.mjs` | exit 0: 36 oc- skills, **2 ow skills** |
| `node scripts/check-skill-contracts.mjs` | exit 0 (edges reciprocal, one writer per file) |
| `node scripts/lint-internal-refs.mjs` | exit 0 |
| `node scripts/ow-start-acceptance.mjs` | exit 0: 5/5, 6/6, 11/11, 5/5 (four cases) |
| `node scripts/ow-build-plan-acceptance.mjs` | exit 0: **25/25 golden cases pass** (82 checks; new: `follow-on-stated-offer`, `follow-on-stated-start`, `route-folder`, `route-next-stage`) |
| `npx vitest run tests/ow-edges.test.js tests/ow-build-plan-acceptance.test.js tests/catalogs.test.js tests/ow-start-acceptance.test.js` | 4 files, **195 run / 195 passed / 0 failed / 0 skipped** (round 2: 175). No new test file this round. |
| `npm test` (full) | 112 files, **1775 run / 1775 passed / 0 failed / 0 skipped**, exit 0 |
| `npm run build` | exit 0 (`building opchain-dev worker @ 9b37a61c`); working tree clean afterwards apart from the untracked eval reports |
| `git diff 6ffe4eaa..HEAD --stat -- skills/ plugins/opchain/ package.json` | **empty** (also empty for `plugins/ src/ site/ package-lock.json .claude-plugin/ mirror/`) |

No test fails, so there is no Functionality cap. All contracted tests are delivered, so there is no Code Quality cap. Not verified: "candidate verifier PASS on every commit".

### Criteria C1–C11

| # | Verdict | Evidence |
|---|---|---|
| C1 | **PASS** | "ow catalog validated: 2 skills"; check-skill-contracts exit 0. |
| C2 | **PASS** | Body **4,326** tokens (`estimateTokens`, chars/4) against 5,000; 674 tokens of headroom. `cmp` shows `ow-protocol.md` byte-identical in both skills and in `skills-work/`. |
| C3 | **PASS** | No `llc-ops` or `Deftwright` under `skills-work/ow-*` except the rule itself in the README. My plants of `llc-ops` in `routing-and-resume.md` and `Deftwright` in `phase-offer.md` both fail. |
| C4 | **PASS** | Every round-1 and round-2 reciprocity and dangling-NEXT plant fails. The new `routes:` rule catches a wrong routing verb (K15, C3) and an unrouted path (C11). |
| C5 | **PASS** | The `contract-inputs.md` second writer fails under `opchain-work/`, `./`, a case variant, `..` (C4, K10, K11) and `<client>-<n>` (C16). One spelling still slips: a literal folder number (K7, new bug 7). |
| C6 | **PASS** | 25/25 golden runs. Every §9.2 case except Real use (moved to Sprint 6) has one. |
| C7 | **PASS (with slips)** | Every §9.2 case has a planted failure in vitest. My slips are in new bugs 6 and 7. |
| C8 | **PASS** | The appendix sits inside the markers in the goldens; the ow-tools preflight strips it; the extension rate restated by number fails (R1c). |
| C9 | **PASS** | `signed-before-accepted` writes nothing. The signed NEXT names `/ow-build-start`; its IF line is exactly the build destination (N7 caught). |
| C10 | **PASS** | The oc- diff is empty (above). |
| C11 | **PASS** | Re-ran `plant11`/`plant12`. Broken `handoffs.yaml` and `price-book.yaml` each fail only the checks that read them, with the file named. A broken `offers.md` header or `after_handoff` block fails only `fix_window`. Nothing crashes. |

### Round-2 items re-verified (by reproduction)

| Round-2 item | Sev | Verdict | My reproduction |
|---|---|---|---|
| Fix 1: make room (routing to a reference) | — | **FIXED** | Body 4,326 tokens. `references/routing-and-resume.md` is cited from the verb table (`SKILL.md:45-46`) and the Phases list (`:64`). Plants: delete the file (K1) → fails; delete the verb row (K2) → fails. |
| New bug 1: `next-stage` recap has no route to `-start` | M | **FIXED** | Route table row (`routing-and-resume.md:49`), `phase-offer.md:7`, `phase-start.md:12`. Golden `route-next-stage` passes. Plants: offer written (A6), `fee: 1500` (A7), no fee key (A9), STATUS naming `-offer` (A10) → all fail. Residue: new bug 5 (fee contradiction, credit by rule). |
| New bug 2: folder route re-prices an accepted quote | M | **FIXED for the exported and accepted stages**, but see new bug 3 for the signed stage | `routing-and-resume.md:62-66`, `phase-quote.md:16-20`. Golden `route-folder`: the route records the acceptance and leaves `quote.md` byte-identical. Plants: rewrite `quote-items.json` (A4), add a trailing newline to `quote.md` (A21) → both fail `quote_frozen`. Unrequested `quote-r2.md` (A1, A22) → **slip**. |
| New bug 3: resume screen loses and invents work | m | **FIXED as asked**, with a residue (new bug 4) | §1.1–1.3: grouping by client, a refused quick quote listed (`ow-build-plan /<verb>` form), FIX requests kept until a follow-on names them, a fit call dropped when its offer's line is newer. Pinned by `tests/ow-build-plan-acceptance.test.js:449`. |
| New bug 4: ow-build's `acceptance.md` reads (decision (a)) | m | **FIXED** | `2026-10-08-ow-build-design.md:3` (dated amendment), `:6`, `:41`, `:133`, `:214`. Residue: §12.2's other `spec/` rows (map, plan summary, risks) have no quick-quote source (follow-up). |
| New bug 5 + round-1 bug 5: stated follow-on splits folders | M | **FIXED** | `phase-offer.md:9-12` writes `request.md` (`origin: user`, `stated_by`, `stated_on`) and names it as the offer's subject; `phase-start.md:10` reuses the folder. Goldens `follow-on-stated-offer` → `follow-on-stated-start` pass. Plants: origin skill (A12), no `stated_by` (A14), offer subject still the recap (A15), start asks again (A17), start rewrites `request.md` (A18), plan in `-3` (A19), wrong `follows` (A20) → all fail. Slips: paraphrased words (A13; not checkable without the words in the key) and a missing `stated_on` (A16). |
| New bug 6: acceptance checker slips (N4, N5, N13, N14, N15, N21, N23) | m | **FIXED** | All seven re-planted: caught. All 31 of `plant-accept.mjs` and 5 of `plant-accept2.mjs` caught. |
| New bug 7: check-skill-contracts slips (C1–C8, C11, C16) | m | **FIXED** | C3–C8, C11 and C16 re-planted: caught. C1 and C2 no longer apply as written (the text moved), so I re-planted them as K1 and K2: caught. |
| New bug 8: example contradictions | m | **FIXED in the text**, but it led to new bug 1 | `examples/offers.md:13` no longer says "not prices"; `hourly_help` is a labelled placeholder. Example schedules are now 2/5 and 4/10, which is where the 5-per-week rule came in. |
| Round-1 bug 13 (checker half: `handling`) | m | **FIXED** | N4 and N5 caught. |
| Round-1 bug 14 residue (no-folder line on the signing line) | m | **FIXED** | `SKILL.md:179-181`. Deleting its `It will read:` line (K12) fails. |

**No round-2 major is left unfixed** on the path it named.

### New bugs

B = blocking, M = major, m = minor.

1. **[M] Decision (g) regressed: the skill brings back a hard-coded 5-business-days-per-week rule.**
   - **Where:** `skills-work/ow-build-plan/references/phase-start.md:23` ("If `delivery_business_days` is not 5 × `weeks`, say that the offer promised <weeks> week(s) and ask which is right before going on"); `references/price-book-schema.md:12` ("`delivery_business_days` should equal 5 × `build_plan_weeks`"); `examples/price-book.yaml:26` ("(5 a week)"); `tests/ow-edges.test.js:425` (`expect(deliver).toBe(5 * weeks)`).
   - **What happens:** The deadline is still computed only from `build_plan_schedule.<tier>` or user-stated days, so the letter of (g) holds. But the "5" is not the user's data. It is a working-week policy invented by the skill and written into the schema as a "should". A user whose book says `weeks: 2, delivery_business_days: 8` (a buffer day, a four-day week, or "two weeks" used loosely) is stopped and questioned at every `-start`, and the test suite pins the rule.
   - **Note:** In delivery mode (`fee: none`) there is no offer, yet the prompt still talks about "the offer". Round 2 suggested "a weeks-versus-delivery cross-check" as one option; the Generator implemented it with an invented constant, and that is what conflicts with (g).
   - **Repro:** a price book with `two_systems: { collection_business_days: 4, delivery_business_days: 8 }` and `build_plan_weeks.two_systems: 2`. A model following `phase-start.md:23` must stop and ask, although both numbers are the user's own.
   - **Smallest fix:** delete the two sentences, the "(5 a week)" comment and the `5 * weeks` assertion. If a cross-check is still wanted, use the offer's own words ("<weeks> week(s) from the start date"): warn only when `plan_delivery` falls later than start + 7 × `weeks` **calendar** days. That is a fact about the promise, not a business-day policy.
2. **[M] A revised quote is written but nothing reads it, so the contract inputs carry the old price.**
   - **Where:** `phase-quote.md:19` writes `quote-r<n>.md` and `quote-r<n>-items.json`, with no other rule. `phase-quote.md:187` (`--accepted`: "Read `quote.md`"), `contract-inputs-schema.md:12,20` (`subject`/`quote: plans/<client>/quote.md`), `phase-export.md:39` (exports `quote.md` only), the STATUS section `phase-quote.md:218-226` (no line for a revision) and `skill.edges.yaml:37-38` (written, with no reads row) never mention it.
   - **Repro:** a quote is exported; the client negotiates; the user asks for a revised quote, so `quote-r2.md` is written at a new price. The client accepts it; "the client accepted on <date>" runs `--accepted`, which copies `fixed_price`, payments and UAT from `quote.md`, the superseded price, into `contract-inputs.md`, the file the contract is drafted from. The revision can't be exported either.
   - **Checker:** it is blind to this. A route run that writes an unrequested `quote-r2.md` (A1) or `quote-r2-items.json` (A22) passes, and so does `contract-inputs.md` naming `quote: …/quote-r2.md` (A5).
   - **Smallest fix:** either drop revisions from 1.0.0 (`-quote` refuses after export; the user withdraws the quote by hand) or wire them through:
     - `--accepted` asks which quote the client accepted when any `quote-r<n>.md` exists, copies from that file, and records it in `quote:`/`subject:`.
     - `-export` exports the newest revision.
     - The STATUS section gains a revision line.
     - The checker fails a route run that writes `quote-r*`, and compares `contract-inputs.md` against the quote it names.
3. **[M] The folder route has no correct step for a signed folder.**
   - **Where:** `routing-and-resume.md:60-67`.
   - **What happens:** The route starts from the newest STATUS line in the folder. After `--signed` that line is `next: ow-build /ow-build-start plans/<client>/` (golden `accepted-signed` STATUS line 11). Rule 1 applies only when `next:` is `/ow-build-plan-quote`, so its "both: nothing is left for this skill" branch (`:65`) can't be reached through STATUS. Rule 2 then says "run the verb its `next:` names (`-start`, …)", which is another skill's verb. The list's own `-start` (meaning `/ow-build-plan-start`) invites a misreading, and `phase-start.md` has no guard against an existing `plan.yaml`, so a misread rewrites the signed plan's dates and tier.
   - **Repro:** "use ow-build-plan on plans/larkspur-ceramics/" on the `accepted-signed` output. ow-build's later lines live under `builds/<client>/`, so this stays the folder's newest line for the life of the job.
   - **Smallest fix:**
     - Decide the step from the files first: `build-request.md` present → show the signed NEXT and stop.
     - Add "a `next:` naming another skill: print that skill's NEXT and stop; never run it".
     - Add a `route-folder-signed` golden (route expect `nothing`; the checker already models it).
4. **[m] The resume grouping hides a client's second pending item and leaves other skills' paths ungrouped.**
   - **Where:** `routing-and-resume.md:12-15`.
   - "Keep only the newest line" per `<slug>` means two FIX requests for one client (FIX-03, FIX-04) show only the newer one. A later ow-handoff line under `handoffs/<slug>/` hides a pending FIX request altogether.
   - Lines under `builds/<slug>/` or `uat/<slug>/` (ow-build, ow-uat) belong to no defined group. A signed plan is therefore listed as "waiting for ow-build" even after ow-build has started, and ow-build `-change`'s "use ow-build-plan on handoffs/…/FIX-nn.md" line has no group.
   - Display only; nothing is written.
5. **[m] Delivery-mode (`fee: none`) text is inconsistent.**
   - `phase-start.md:19` says "`fee` = `build_plan_fees.<tier>` (or the offer's fee…)" after `:12` says `fee: none`.
   - The STATUS `awaiting:` templates for `-quote`, `--accepted` and `-export` (`phase-quote.md:222,224`, `phase-export.md:47`) always cite `<credit_deadline>`, which a `fee: none` plan doesn't have.
   - `phase-quote.md:33` drops the credit line by rule. Whether the signed agreement already carries a Build Plan fee and credit is an owner question; the skill should ask, not decide.
   - There is no delivery-mode quote golden.
6. **[m] The acceptance checker misses the following** (`scripts/ow-build-plan-acceptance.mjs`). Of 22 new plants, 6 slip:
   - **A1, A22:** a route run that writes `quote-r2.md` or `quote-r2-items.json` (`checkRoute`, `:1129-1133`, and `checkQuoteFrozen` look only at `quote.md` and `quote-items.json`).
   - **A5:** `contract-inputs.md` `quote:` naming another file.
   - **A8:** `tier_source: offer` on a next-stage plan, where there is no offer.
   - **A13:** `request.md` paraphrased (the answer key has no words to compare).
   - **A16:** `request.md` without `stated_on`.
   - **The checker and the reference disagree on folders.** `checkRoute` ignores `next:` and picks `accepted` whenever `quote.md` exists, while the reference picks by `next:`. A folder re-scoped after a draft quote (newest `next:` is `-quote`, `quote.md` unexported) goes to `--accepted` under both. But `phase-quote.md:20` allows re-pricing an unexported quote with confirmation, so the route's rule 1 should require "exported or accepted", the same condition the quote phase uses.
7. **[m] check-skill-contracts misses the following** (`scripts/check-skill-contracts.mjs`). Of 20 new plants, 6 slip every automated check, and 4 more are caught only by a pinned-text vitest:
   - **K7:** a second writer spelled `plans/<client>-2/plan.yaml` (`normPath`, `:532`, folds only placeholders).
   - **K8:** `shared: true` with a backslash path (`intake\<client>\call-guide.md`); `:641` tests only for `/`, although `normPath` converts backslashes.
   - **K13:** a NEXT slash hint whose mode (`--quick`) differs from the edge's verb.
   - **K19:** a STATUS `next:` with a mode in a phase file (only the goldens' static STATUS catches this, N17).
   - **K6:** `phase-quote.md`'s "A quote is written once" rule deleted (no pin at all).
   - **K14:** `routes.paths` dropping the folder. Harmless today: no say hands a folder.
   - **Pinned-text only:** K3, K4 and K18 (the `next-stage` row deleted, changed to `-offer`, or stripped of "Never an offer") and K5 (2.3's freeze rule deleted) fail only through `tests/ow-edges.test.js:349-352`.
8. **[m] Smaller route gaps.**
   - **No class check on a FIX file.** `routing-and-resume.md:56` sends any `FIX-nn.md` to a follow-on offer without reading its class. A covered Fix (free under the fix window, ow-handoff design §7) can be proposed as a paid Build Plan; only the confirm step stops it. Read the class and refuse a covered Fix.
   - **Feasibility is a dead end.** `routing-and-resume.md:50` stops honestly, but the example `offers.md:62` promises "a short offer for a time-boxed test" and the example price book ships an `ai-feasibility-test` unit, so a one-unit quick quote looks like the intended route. This is an owner question.
   - **The offer NEXT omits `request.md`.** Its `It will read:` (`SKILL.md:134`) says "the intake record or FIX file it names", not `request.md`, so a stated follow-on with no folder attached loses its request.
   - **Step order in `-start`.** `phase-start.md:9` (step 1, "the user names a follow-on") comes before step 2's `request.md` reuse, so a literal reading with no folder named can still pick a new `-<n>`. The printed NEXT names the folder, which makes this unlikely.

### Owner decisions verified

| Decision | Verdict | Evidence |
|---|---|---|
| (a) quick quotes write `quick-scope.md`; ow-uat, ow-handoff, ow-build and ow-build-plan read it consistently | **HOLDS** | ow-build now reads quick-scope checks at `:6`, `:41`, `:133` and `:214`, with a dated amendment at `:3`. ow-uat `:7`, `:69`, `:72` and ow-handoff `:152`, `:326` are unchanged and consistent. ow-build-plan `SKILL.md:185`, `phase-quote.md:45,197` and `contract-inputs-schema.md:21-22` agree. Follow-up: ow-build §12.2's `spec/00`, `02`, `04` and `scope-and-milestones` rows have no quick-quote source. |
| (g) deadlines come only from `price-book.yaml` `build_plan_schedule.<tier>`, or are asked and recorded user-stated; no rule invented by the skill | **DOES NOT HOLD** | Deadlines are still computed only from the book or a user-stated record (`phase-start.md:23`; checker `:389-401`; my A11 plant fails). But "5 × `weeks`" is a working-week rule the skill invented, stated as a "should" in the schema and enforced as a stop-and-ask at `-start` and in a test. The 5 does not come from any file the user owns. See new bug 1. |
| (c) the printed contract NEXT is exactly the say line or the public default | **HOLDS** | `SKILL.md:174`, `phase-quote.md:191`. Goldens: default `NEXT: send contract-inputs.md to whoever drafts your contracts, …`; business `NEXT: use llc-ops to draft the SOW from plans/larkspur-ceramics/contract-inputs.md`. N6 (suffix) and R1j (wrong file) fail. The signed IF line follows the same rule (N7). |

### Routing walk (task item 3)

I started from ow-start's printed NEXT, `use ow-build-plan on intake/<client>/intake-record.md` (ow-start `SKILL.md:116`). It goes to the verb row `/ow-build-plan on <path>` (`SKILL.md:46`), then `references/routing-and-resume.md`.

| Input | Lands on | Correct, one action? | Never overwrites an accepted quote / never charges for signed work? | Evidence |
|---|---|---|---|---|
| recap `build-plan` | `-offer` | Yes | Yes | golden `route-build-plan` |
| recap `defined-work` | `-quote --quick` (refusal → offer NEXT over the limit) | Yes | Yes | goldens `route-defined-work`, `quick-over-limit` |
| recap `next-stage` | `-start`, `fee: none`, no offer | Yes | Yes for the plan; the credit-line drop is an owner question (bug 5) | golden `route-next-stage`; A6, A7, A9 and A10 caught |
| recap `feasibility` | nothing; says so | Yes, but a dead end (bug 8) | Yes | `routing-and-resume.md:50` |
| recap `not-a-fit`, `next-session` | nothing; says so | Yes | Yes | `:51` |
| no recap or no `path_kind` | asks: offer, quick quote, start on signed work, or nothing | Yes | Yes | `:52`; no golden |
| `FIX-nn.md`, no follow-on yet | follow-on `-offer` in `plans/<client>-<n>/` | Yes for a too-big change; **no class check** (bug 8) | Only the confirm step guards a covered Fix | golden `follow-on-offer`; N19 caught |
| `FIX-nn.md` already taken up | routes that folder (2.3) | Yes | Yes | `:56` |
| folder at **offer** | `-start` (after the user confirms) | Yes | Yes | rule 2 |
| folder at **started** (and collected, mapped, scoped) | `-collect` / `-map` / `-scope` / first `-quote` | Yes | Yes | rule 2 |
| folder at **quoted** (not exported) | `-export` | Yes. After a re-scope, though, rule 1 sends it to `--accepted` (bug 6) | Yes | rule 2 |
| folder at **exported** | `--accepted <date>` | Yes | Yes: `quote.md` frozen | golden `route-folder`; A4, A21 caught |
| folder at **accepted** | `--signed <date>` | Yes | Yes | rule 1; no golden |
| folder at **signed** | "run the verb its `next:` names" = ow-build's `/ow-build-start` | **No** (bug 3) | At risk if misread as `/ow-build-plan-start` | `routing-and-resume.md:62-66`; golden STATUS line 11 |
| any folder with `quote-r<n>.md` | undefined | **No** (bug 2) | **No**: `--accepted` records the superseded price | `phase-quote.md:19,187` |

### Body budget and coherence (task item 4)

- `estimateTokens` gives **4,326** (the Generator's 4,327 counts one more newline): confirmed. The reference adds 1,405 tokens to the two routing verbs only.
- A model reading only the body knows when to open the reference: both verb rows name it, the Phases list maps both verbs to it, and the body says to stop if it can't be opened. The other verbs' text was untouched. Nothing in the body depends on routing detail that moved.
- Body omissions are minor:
  - "Where files live" (`SKILL.md:84-91`) lists neither `request.md` nor `quote-r<n>.md`.
  - The `-quote` verb row doesn't mention the write-once rule.
  - The offer NEXT's `It will read:` omits `request.md` (bug 8).

### Gaps vs Contract

- Deliverables 1–7 are all present, and deliverable 7 is now met for every `path_kind` ow-start can hand over.
- Test requirements: every listed golden exists. There is no golden for an accepted or signed folder route, a delivery-mode quote or a revised quote.
- `ow-start/SKILL.md` gained one line (the delivery-prep no-folder line). ow-start 1.0.0 is unreleased, so no bump is needed; record it with the v2.1.0 notes alongside round 2's examples change.
- "candidate verifier PASS on every commit" was not verified by this evaluation.

### Verdict: **FAIL**

Every score is ≥ 6 and C1–C11 hold. Every round-2 major is fixed on the path it named, and every round-2 plant is caught. The gate still fails on three counts:

- **Owner decision (g) does not hold** (new bug 1).
- **Two new majors on money paths** came with the round-3 code: the orphaned revised quote (new bug 2) and the signed-folder route (new bug 3).

This was the final round, so it escalates to the owner. The blocking work is small; in order:

1. **(g):** delete `phase-start.md:23`'s 5× sentence, `price-book-schema.md:12`'s "should equal 5 ×" sentence, the "(5 a week)" comment and `tests/ow-edges.test.js:425`. Optionally replace them with a calendar-week warning against the offer's own promise.
2. **Revised quotes:** either remove `quote-r<n>` from 1.0.0 (the edges rows and `phase-quote.md:19`; `-quote` refuses after export), or make `--accepted` ask which quote was accepted and copy from that file. Add checker coverage for A1, A5 and A22.
3. **Signed folder:** in `routing-and-resume.md` 2.3, check `build-request.md` first (signed → show the signed NEXT, stop), and add "a `next:` naming another skill: print its NEXT, never run it". Add a `route-folder-signed` golden.

**Follow-ups if the owner accepts after those fixes (minor):**

- Resume grouping: one row per pending FIX, and groups for `builds/` and `uat/` (bug 4).
- Delivery-mode consistency: the `phase-start.md:19` fee line, `awaiting:` without a credit date, and whether to ask about a contracted credit (bug 5).
- Route rule 1 requires "exported or accepted" (bug 6).
- The remaining checker slips: A8, A16, K6, K7, K8, K13, K19 (bugs 6 and 7).
- Read the FIX class before offering; owner decision on the feasibility route; `request.md` in the offer NEXT's read list (bug 8).
- ow-build §12.2 quick-quote sources (decision (a) follow-up).
