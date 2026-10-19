# ow-uat — design (user acceptance test)

**Date:** 2026-10-09 · **Status:** **APPROVED 2026-10-14**; **built as ow-uat 1.0.0 in Sprint 3 (2026-10-17; build notes §15)** (decision 12) with all its amendments B1, B2, B3, H1, H2, P1 and P2 (§12), each applied the same day to the design it changes. Revision 4 after an adversarial review and two contradiction checks (§14), then pricing simplified (decision 9), deemed acceptance confirmed with the drafted clause (decision 10) and real prices taken out of the repo (decision 13). Nothing is built. Review copy for comments: https://claude.ai/code/artifact/7bf05c48-5100-4c5d-93aa-a7af82f4d4c6 **Amended 2026-10-15: quick-quote scope file is quick-scope.md (owner decision).**
**Release:** a skill in the ow- family that ships together as v2.1.0. Starts at 1.0.0.
**Family rules that apply:** no `ow-review` (labelled same-session self-checks); code only in the `ow-tools` add-on; no public ow- skill names a private skill, and handoffs leaving the family go through the workspace's `handoffs.yaml` (ow-start design, decisions 22–23).
**Place in the stages:** `ow-build` (milestones, demos, `-ready`) → **`ow-uat`** (designated UAT with a rapid fix phase; its sign-off **is** final acceptance) → `ow-handoff -start` (right after sign-off, so later reports are covered fixes) → `ow-documentation` (if the SKU was bought; not yet designed) → `ow-handoff` package, delivery, fix window, close.
**Upstream:** `ow-build` (`ready-for-uat.md`, amendment B1; `changes/CO-nn.md`); `ow-build-plan` (`scope.md` and `acceptance.md`, or `quick-scope.md` for a quick-quote job, `quote.md` client-facing part, `contract-inputs.md`, `map/roles.md`, `map/future.md`); `ow-handoff` (`dates.yaml`, read only by `--backstop`); the workspace's `offers.md`, `handoffs.yaml`, `profile.md`.
**Downstream:** the `build` destination for in-scope fixes; `ow-build -change` for changes and client-caused extensions; `ow-build -invoice` for the acceptance payment; `ow-handoff` (acceptance record, sign-off, frozen basis, punch list, test accounts, evidence, `secrets-seen.log`); `ow-documentation` (scenarios, roles, training gaps, cleared evidence).

`ow-uat` runs a designated user acceptance test: the client's people try the finished build against what was agreed, in-scope problems are fixed fast and free, and the client signs off. That sign-off is final acceptance; on larger projects it marks the final 20% due (smaller projects pay their second half at handoff).

## 1. What it has to honour (staging.deftwright.com, read 2026-10-08/09)

| Source | Promise | Where the skill meets it |
|---|---|---|
| /how-we-work, agreement | "Every quote says what I'll deliver, what's outside the scope and how we'll both know the work is done." | Every acceptance check has a required scenario that must pass after the last fix (§5, §8) |
| /how-we-work, agreement | "If I underestimate the agreed scope, that's on me. Additional work is written down and priced before it starts." | In-scope Defects are fixed free, past the bounds if needed; changes and client-caused overruns are signed change orders (§6, §7) |
| /how-we-work, payments | Larger projects: 20% at **acceptance**. Smaller: half at **delivery** | Larger: due at UAT sign-off. Smaller: due at handoff, or the contract's backstop (§8.2) |
| /privacy, /terms | Clients sign documents electronically in the portal (typed name, consent box, signing record kept) | The sign-off request goes to the workspace's `sign` destination; the skill never collects a signature (§8) |

## 2. Owner decisions

| # | Date | Question | Answer |
|---|---|---|---|
| 1 | 2026-10-09 | Is there a designated UAT? | Yes, its own skill, before documentation and handoff |
| 2 | 2026-10-09 | UAT vs final acceptance | **UAT sign-off is final acceptance**, with a **rapid fix phase** inside UAT for in-scope findings. `ow-build -accept` becomes `-ready` (B1) |
| 3 | 2026-10-09 | Who tests, how | Any mix per project of: the client's real users by role, scripted scenarios, an exploratory session, a defect log with triage |
| 4 | 2026-10-09 | Order of design | UAT first, then `ow-documentation` |
| 5 | 2026-10-09 | Name | `ow-uat` |
| 6 | 2026-10-09 | UAT in the quote | **Its own line, priced by tester roles** (§7.1) |
| 7 | 2026-10-09 | Rapid fix bounds | **Part of the UAT price**: each size carries its fix rounds and fix days (§7.1) |
| 8 | 2026-10-09 | "Delivery" for smaller projects | **Handoff**: the day the Handoff notes are delivered. Larger projects' 20% stays at UAT sign-off |
| 9 | 2026-10-09 | UAT pricing (simplified, replaces the tier × band matrix) | **Sized by the build's own S/M/L** (a TOOL-M build gets UAT · M), one price per size with tester roles, sessions and fix bounds included, plus **a fixed add-on per extra tester role**. No separate complexity score (§7.1) |
| 10 | 2026-10-09 | Deemed acceptance | **Yes** (final; the owner briefly dropped it, then reversed: "a safer business decision"). A contract clause drafted in Deftwright's contract step; the skill applies it **only when the user confirms**. Deemed date = the latest of N business days after a complete sign-off request, the date the request states, and 5 business days after a "cannot reproduce" notice (§8.1). Clause wording isn't copied anywhere until the owner approves it |
| 11 | 2026-10-09 | Handoff backstop (smaller projects) | **Yes**, as a contract clause: on the two-payment schedule, the delivery half becomes due once the builder has done everything it can alone and a listed client dependency is still outstanding, no sooner than the later of N business days after acceptance and 5 business days after a readiness notice, plus one day per business day of builder-caused delay (§8.2) |
| 12 | 2026-10-14 | Design approval | **Approved**, with all of §12 (B1, B2, B3, H1, H2, P1, P2). Each amendment is applied in the design it changes (§12 names the sections). §13's clause items stay open as the owner's contract-step work |
| 13 | 2026-10-14 | Prices in the repo | **Real business numbers never live in the repo.** This design keeps the price structure and a clearly invented example (§7.1); the user's real numbers live only in their own `price-book.yaml` in their workspace |

**Related decisions recorded for `ow-documentation` (2026-10-09):**

| # | Question | Answer |
|---|---|---|
| D1 | Documents | End-user guides · SOPs for the new process · admin and operator runbook · developer handover |
| D2 | Training | Live session kit · self-paced modules · quick-reference cards · video scripts |
| D3 | Rollout | Plan **and** track it: rollout plan by role and group, training record, adoption check-in |
| D4 | Delivery | Branded PDF/Word · Markdown in the client's repo · the client's wiki or Google Docs · slides |
| D5 | Pricing (simplified 2026-10-09) | **A new SKU sized by the build's own S/M/L**: one price per size for up to 15 people trained, plus **a fixed add-on per extra group of up to 15**; over 100 people quoted separately. Always quoted as its own recommended line; the client can decline it. The structure is in §7.1; the user's numbers live in their own `price-book.yaml` (decision 13) |
| D6 | If declined | **A floor stays in every build**: developer handover and operator notes. Without the SKU, the floor comes from `ow-handoff` (operator notes from `-notes`; the builder's developer docs checked by its Takeover check). How `ow-documentation` extends the floor when the SKU is bought is for its own design |

## 3. Verbs

Every file has **one writer verb**. `STATUS.md` (workspace) and `secrets-seen.log` (this folder) are append-logs any verb may append to. Files live under `opchain-work/uat/<client>/`.

| Verb | Does | Writes |
|---|---|---|
| `/ow-uat-plan` | Reads upstream (§3.1). Freezes the agreed basis and the quoted UAT terms. Records test mix, roles and tester ids, environment, data decision, schedule, side effects and git-ignore. Writes scenarios. `--add-co CO-nn` adds a signed CO to the basis before sign-off. `--addendum CO-nn` writes scenarios for a CO after sign-off without adding it to the basis. `--add-co` records `added <date>`; either, re-run when the builder reports the CO delivered, records `delivered <date>, build <label>` in `uat.yaml`. `--keep-frozen` / `--refreeze` resolve a basis mismatch | `uat.yaml`, `agreed/`, `scenarios/SC-nn.md` |
| `/ow-uat-pack` | Builds the tester pack per role and the results template | `pack.yaml`, `export/uat-pack-<role>.{pdf,docx,html}`, `export/results-template.csv` |
| `/ow-uat-run` | Records one session: imports a filled results template, records results the user reads out, or records a no-show. Strips names and credentials at import. Indexes evidence. One file per session, never edited | `runs/RUN-nn.md`, `evidence/index.md` |
| `/ow-uat-defect` | Logs each problem, triages it, sends Defects to the builder, records fixed status, retest links, extensions, punch-list moves and conditions | `defects/UAT-nn.md` |
| `/ow-uat-signoff` | Every mode first updates request statuses (§8, supersession). Plain: checks the exit criteria and writes a numbered sign-off request. `--sent <n> <date>` records sending. `--signed <n> <date> <client role>` records the signature and writes the acceptance record. `--deemed <n>`, `--readiness <date> <dependency>`, `--builder-delay <days> <reason>`, `--backstop` and `--addendum CO-nn <date> <client role>` as in §8. Plain, `--sent`, `--signed` and `--deemed` refuse once `signoff.md` exists | `signoff-request-<n>.md` (+ export), `signoff-requests.yaml`, `signoff.md`, `acceptance-record.md`, `punch-list.md`, `backstop-log.yaml`, `backstop.md`, `acceptance-addendum-CO-nn.md` |

Every verb starts with the R4 resume step (reads `uat.yaml`, `signoff-requests.yaml` and `STATUS.md`; `uat.yaml` absent: every verb except `-plan` stops with `NEXT: use ow-uat-plan`; `signoff-requests.yaml` absent: no requests yet). It also compares each `agreed/` file's date with its upstream source and reports a **basis mismatch**, which blocks `-pack`, `-defect` triage and `-signoff` until the user runs `-plan --keep-frozen <file>` (a dated `kept_frozen` entry in `uat.yaml`) or `-plan --refreeze <file>` (re-copies that file with a dated note). A scheduled session date that has passed with no run prompts the user to record it (§4.3). `ow-uat` never reads `margin.md`, a time export or `price-book.yaml`.

### 3.1 Reads, absent-cases and mismatches

| File | Used for | If absent | If it doesn't match |
|---|---|---|---|
| `builds/<client>/ready-for-uat.md` (B1) | Entry: milestones demoed, the builder's own run of every acceptance check, environment, known issues, test data, **build label** | `-plan` stops: `NEXT: use ow-build to mark the build ready for UAT` | A builder run with any failing check: `-plan` stops and lists the failures |
| `plans/<client>/scope.md`, `acceptance.md`, or `quick-scope.md` (quick-quote job) | Basis; one required scenario per check | Quick-quote job: scope and checks from `quick-scope.md`. Both `scope.md` and `quick-scope.md` absent: stop | Report the fields found |
| `builds/<client>/changes/CO-nn.md` | COs signed before `-plan` join the basis | None: plan + quote only | Unsigned or declined: not in scope. A CO signed after the freeze and not added by `--add-co`: listed as post-acceptance in the next request (§6.2). A CO cited by an `extended, client cause` entry is neither: it adds no checks |
| `contract-inputs.md`, then `quote.md` (client-facing) | **UAT line**: size, tester roles, sessions, fix rounds, fix days. **Acceptance and delivery definitions.** Payment terms. **Contract clauses** block. The **included** block and the **ownership terms** (frozen into `agreed/`, as handoff §7.1 does) | UAT line absent (a quote signed before P1): bounds from `offers.md` → `uat`, else ask; recorded `bounds: not quoted (offers default / user-stated)`, and more roles than expected is then never a change. Clauses absent: `clauses: none` | Acceptance or delivery defined differently (e.g. an older quote): report the wording and record the user's dated statement of which definition governs this job in `uat.yaml`; `-signoff` and B2 follow it |
| `plans/<client>/map/roles.md`, `map/future.md` | Roles; role scenarios | Quick-quote job: roles from `quick-scope.md`'s UAT approach (P1), else ask | — |
| `offers.md` → `uat` | Defaults only when the quote has no UAT line; minimum testers per role | Ask the user | — |
| `handoffs.yaml` | `build`, `sign`, `invoice` destinations | Public defaults (§7, §8) | — |
| `profile.md` | Time zone and holidays | Weekends only | — |
| `handoffs/<client>/dates.yaml` (read only by `--backstop`) | Whether the notes were delivered | Not delivered; continue | — |
| `builds/<client>/ledger.md` (read only by `--backstop`) | Whether the delivery half is already invoiced | Not invoiced; continue | — |

## 4. Setup: test mix, people, environment, data

### 4.1 Test mix (owner decision 3), recorded in `uat.yaml`

| Part | Always or optional | What it is |
|---|---|---|
| **Acceptance coverage** | **Always** (sign-off is acceptance) | Every acceptance check has one **required scenario** (§5). If the client provides no testers, the user runs them with the client's decision maker |
| Testers by role | Optional (recommended when more than one role uses it) | Testers from each role in `map/roles.md`, each with assigned scenarios |
| Real-case scenarios | Optional | Built from real cases the client points to, **by pointer only** (§5) |
| Exploratory session | Optional | A timeboxed session per role with a short charter |
| **Defect log and triage** | **Always** | Every problem gets a `UAT-nn` (§6) |

### 4.2 People

Testers are recorded by **role plus an id the client chooses** (e.g. `ops-T2`). **No tester's name, email or phone number goes in any file.** The client contact, recorded in `uat.yaml` **by role only** (e.g. `client ops lead`), hands out logins and keeps track of who has each id; the pack and every NEXT name that role. Tester accounts are created by whoever owns the test environment; **logins never appear in any file**, and the pack says "your login comes from <client contact role>".

### 4.3 Sessions and no-shows

The schedule in `uat.yaml` lists each session with its date and roles. A session the client doesn't attend is recorded by `-run` as a **no-show run**: every scenario `not run`, note `client did not attend; invited <dates>`, and `STATUS.md` gets `awaiting: client testers for <role> since <date>` (or `awaiting: client-owned test environment since <date>`). After a recorded no-show, the user may run the remaining required scenarios alone; those runs carry `run_by: user alone` and are disclosed in the sign-off request (§8).

### 4.4 Environment and data

- **Environment:** the staging or sandbox environment named in `ready-for-uat.md`. **Production UAT** happens only if the client decides it; `-plan` records the decision with client role and date, and it also counts as a real-data decision (`test_data: real`). `-plan` refuses `environment: production` with a synthetic data source.
- **Side effects:** `-plan` marks each scenario that sends a message, takes a payment or writes to another system `side_effect: <what>`. In a production UAT the pack shows, beside each such scenario, the test mode, internal recipient or test account to use, or "client approved running this live on <date> by <role>". `-pack` refuses a production pack with a side-effecting scenario that has neither. The results template has a "records created" column; `-signoff` lists those records in the request as clean-up items for the client (not a gate).
- **Test data:** synthetic or anonymised by default. Where an acceptance check's "How we check" names real data, `-plan` records the client's real-data decision (role, date), or asks. Real data the builder receives, and every filled results file `-run` imports, are stored in the git-ignored `evidence/` folder, so they reach `ow-handoff`'s local-copy list.
- **Git-ignore:** if the working folder is inside a git repo, `-plan` asks, then adds `opchain-work/**/evidence/` and `opchain-work/**/secrets-seen.log` to that repo's `.gitignore`, recording the answer in `uat.yaml`. If the user declines, it says evidence may be committed.

## 5. Scenarios, runs and evidence

**A scenario** (`SC-nn.md`): role, steps, expected result, the acceptance check or scope item it proves, `side_effect` if any, and **the data to use by pointer only**: source, record ids or a locator in the client's system, count and fields. A scenario never holds field values from real records. Sources:

1. **One required scenario per acceptance check.** Its expected result is the check's *Then* and *How we check*, including the number of cases.
2. One per main task per role, from `map/future.md`.
3. Real cases the client points to.
4. Exception paths (the "what if it's wrong" side of each check).

**The tester pack** (per role): what UAT is, the dates, how to sign in (pointer only), the scenarios to run, how to report a problem (what you did, what you expected, what happened, a screenshot only if it shows no real customer data), and the results template (columns: tester id, scenario, result, cases passed, note, records created; no name column). Branded PDF/Word through `ow-tools`, or HTML.

**A run** (`RUN-nn.md`), never edited; a retest is a new run. Fields:
- `session_date`: when the session took place (not when it was imported)
- `build`: the label of the latest build change on or before `session_date` (from `ready-for-uat.md`, a fix report on a UAT-nn, or a CO delivery in `uat.yaml`), or `not reported`
- per scenario: tester role and id, `pass` / `fail` / `blocked` / `not run`, **cases passed out of cases required**, a note, records created, evidence pointers
- `run_by`: `<tester role>` · `user with <client role>` · `user alone`
- `source`: `results file <name>` · `user-stated (as reported)`

`pass` means the expected result was met in full. A minor or cosmetic issue noticed during a passing scenario is logged as a UAT-nn **from that passing run**. A scenario that misses its expected result is `fail`.

**At import**, `-run` drops any name or email column, or a name found in a note, and says what it dropped; a credential found in an import is handled as in §9 and the run is written without it.

**Evidence.** Files testers send are stored in `evidence/`. `-run` is the only writer of `evidence/index.md`; each row gets one state from the **data check**: `cleared` · `pointer only (<reason>)` · `NOT-CHECKED (<format it can't inspect, e.g. video>)`, the last treated as pointer only. The data check looks for real customer data, credentials, and any person's name, email or photo. Only `cleared` items are ever reused (acceptance record, `ow-documentation`).

## 6. Defects and triage

`/ow-uat-defect` logs each problem as `UAT-nn.md`: the run and scenario it came from, what happened, severity, class, status, and a dated history.

**Severity:** **blocker** (a role can't do its job) · **major** (wrong result, a missed expected result, or a workaround needed) · **minor** · **cosmetic**. A Defect from a `fail` of a required scenario is major or higher.

**Class**, judged against the frozen basis (`agreed/`):

| Class | Test | Then | Terminal states |
|---|---|---|---|
| **Defect** | A scope item, acceptance check, CO item in `agreed/`, included item or ownership term doesn't behave as agreed. A check that a fix broke is a new Defect linked `regression of UAT-mm`. A UAT-nn from an `--addendum` scenario is judged against that CO too | Free. Rapid fix phase (§7) | `retested-pass`, `moved to punch list` (minor/cosmetic only), `withdrawn by client` |
| **Change** | Asks for behaviour the basis didn't include | `NEXT: use ow-build to price the change from uat/<client>/defects/UAT-nn.md` (B3); signed amendment before work | `raised as change request`; or, if the client makes it a sign-off condition, `condition → CO-nn`, which counts as **met** once the CO is in `agreed/` (its checks then gate through criterion 1), and `condition lapsed` if the CO is declined |
| **Training gap** | Works as agreed; the tester didn't know how | No fix | `passed to documentation` |
| **Environment or data** | The test setup was wrong | Fixed in the setup | `closed` when its scenario's re-run passes |
| **Duplicate** | Same as an existing UAT-nn | Linked | `closed → UAT-mm` |

**Severity gates apply to class Defect only** (§7 escalation, §8 gate, supersession). A Change or Training gap never blocks sign-off, whatever severity was typed, unless it is a recorded condition. The classification is a recommendation; the user decides, and the client sees the reason and the basis item cited.

**After sign-off**, `-defect` refuses new UAT-nn (except from `--addendum` scenarios) and prints `NEXT: use ow-handoff-fix on handoffs/<client>/`: from then on, reports are covered fixes.

### 6.1 Conditions

A client can make a Change a condition of sign-off. `-defect` records `condition: CO-nn, <client role>, <date>` in that UAT-nn. When the CO is signed, NEXT prints `use ow-uat-plan --add-co CO-nn`. If the CO is declined, the UAT-nn records `condition lapsed` and no longer blocks.

### 6.2 Which change orders are part of this acceptance

**One rule: a CO is part of this acceptance if and only if it is in `uat/<client>/agreed/` when the sign-off is recorded.** COs signed before `-plan` are frozen there automatically; a later signed CO enters only through `-plan --add-co CO-nn` (a condition CO, or one the user chooses to include, such as a CO still in flight from the build). Every other signed CO, **except extension COs** (cited by an `extended, client cause` entry; they add no checks), is listed in `signoff.md` as `post-acceptance (not covered by this sign-off)` and accepted later through the addendum flow (§8.3). A CO in `agreed/` whose checks haven't passed blocks sign-off like any other check.

## 7. Rapid fix phase

In-scope Defects are fixed fast and free inside UAT.

1. `-defect` sends each Defect to the workspace's `build` destination with `UAT-nn.md` (public default: "give `defects/UAT-nn.md` to whoever builds it").
2. When the builder reports it fixed, `-defect` records `fixed` with the **build label** the builder reports. The original scenario is retested in a new run (by the tester, or the user, labelled by `run_by`), plus the checks the fix could affect.
3. Status: `open → sent → fixed → retested-pass` or `retested-fail` (back to `sent`, next round). "Open" in the exit criteria and bounds means **any non-terminal state** (§6).

**Bounds, per Defect:** a round is one send → fixed → retest of that UAT-nn; days count from that UAT-nn's triage date. `fix_rounds` and `fix_business_days` are frozen in `uat.yaml` from the quoted UAT line (§7.1) and never edited. A blocker or major Defect still open past them is **escalated to the user** (an overrun never blocks `-defect` from recording the escalation, an extension, or work on other UAT-nn), and nothing is signed off with an open blocker or major Defect. Each extension is a dated entry in the UAT-nn it extends:

- **Builder cause:** in-scope Defects stay free whatever the bounds ("that's on me"). Recorded `extended, builder cause`, no charge. Retesting a Defect that failed on the builder's side is always builder cause, even if a client delay fell in the same period.
- **Client cause** (testers absent from a scheduled session, scenarios added after `-plan`, a client-owned environment not ready): a **change**, priced by `ow-build -change` from the price book's UAT extension rate (B3), signed before the extra work. `-defect` first records `extension requested, client cause: <event>` on each affected UAT-nn; once the CO is signed it adds the number: `extended, client cause, CO-nn`. One client-side event that affects several open Defects is one CO, cited by each (B3 accepts several UAT-nn files for one CO).

Minors and cosmetics may move to the **punch list** (Defects only); `ow-handoff` turns each into a covered Fix.

### 7.1 Pricing: the UAT line and the documentation & training SKU

Both add-ons take **the build's own size letter**: a TOOL-M build is quoted UAT · M and Documentation & training · M. There is no separate complexity score. **The numbers are the user's and live only in their own `price-book.yaml`, in their workspace, never in this repo** (decision 13). This design fixes the structure; every number below is **illustrative, not anyone's prices**.

**User acceptance testing** (required; can't be declined, because sign-off is acceptance)

| Per size (S, M, L) | What the price book holds |
|---|---|
| Price | One price per size |
| Included | Tester roles, sessions (including the final confirmation run), fix rounds, fix business days |
| Extra tester role | A fixed add-on per role beyond the size's included roles (one more session's worth). Fewer roles than included doesn't lower the price |
| Client-caused extension (B3) | A rate per extra session or fix round, priced by `ow-build -change`; extra calendar days are free. Internal: never on the quote |

UAT price = size price + per-role add-on × (tester roles − included roles, if more).

**Documentation & training** (optional; D1–D6)

| Per size (S, M, L) | What the price book holds |
|---|---|
| Price | One price per size for up to 15 people trained |
| Extra group | A fixed add-on per extra group of up to 15 people |
| Over the limit | Above `quote_separately_above` people, quoted separately |

Documentation price = size price + per-group add-on × (groups of 15 beyond the first). Every size includes the four document types, the training kit, one live session per group of up to 15 people and rollout tracking. The size sets how much material there is; the people count sets sessions and tracking.

```yaml
# price-book.yaml (structure; ILLUSTRATIVE numbers, not anyone's prices)
uat:
  sizes:
    S: { price: 1000, tester_roles: 1, sessions: 2, fix_rounds: 1, fix_business_days: 3 }
    M: { price: 2000, tester_roles: 2, sessions: 3, fix_rounds: 2, fix_business_days: 5 }
    L: { price: 3000, tester_roles: 3, sessions: 3, fix_rounds: 2, fix_business_days: 7 }
  per_extra_role: 250
  extension: { per_session_or_round: 200 }          # client-caused overruns only, via ow-build -change; internal
documentation_training:
  sizes: { S: 2000, M: 4000, L: 6000 }               # up to 15 people
  per_extra_group_of_15: 1000
  quote_separately_above: 100
```

With these illustrative numbers, UAT · M with 3 tester roles is 2000 + 250 = 2250, and Documentation & training · M for 40 people (three groups) is 4000 + 2 × 1000 = 6000.

**On a TOOL-M quote the client sees** (illustrative): Internal tool or portal · M **10,000** · User acceptance testing · M **2,000** (2 tester roles, 3 sessions, 2 fix rounds within 5 business days) · Documentation & training · M, optional **4,000** for up to 15 people.

The client-facing UAT line states the tester roles, test mix, sessions, fix rounds and fix days; `-quote` copies the same into `contract-inputs.md` (P1). That is what `-plan` freezes. More tester roles than quoted, once UAT is planned, is a change at the per-role price, never a silent re-price.

## 8. Sign-off

**Exit criteria** (plain, `--sent`, `--signed`, `--deemed`; `--addendum` has its own, §8.3; `--backstop` has none). `-signoff` refuses, naming each gap, while any of these is true:

1. A **required scenario** for a check in `agreed/` is not `pass` in **a run whose `build` equals the latest build label** (the latest `fixed` on any UAT-nn from main scenarios, or the latest delivery of a CO in `agreed/`). Same-day fixes and retests are ordered by build label, not calendar date. In practice: one confirmation run of every required scenario after the last fix.
2. A scenario's latest run is `fail` or `blocked` and no UAT-nn names it.
3. A blocker or major **Defect** is not in a terminal state, or a **condition** is neither met nor lapsed.
4. A minor or cosmetic **Defect** is not in a terminal state and not on the punch list. When recording a signature or `--deemed` on request n, minors and cosmetics logged after request n was written are exempt: they go to `punch-list.md` automatically (below).
5. An Environment or data UAT-nn isn't `closed`.

Signed COs dated after the freeze that aren't in `agreed/` (and aren't extension COs) don't block: the request lists them as post-acceptance, and when writing it `-signoff` asks the user to confirm that or to run `--add-co` first; the answer is recorded in the request and its `signoff-requests.yaml` row.

**The request.** When they all hold, `-signoff` writes `signoff-request-<n>.md` (never overwritten) and a row in `signoff-requests.yaml` (`n`, written, stated deemed date, sent, cannot-reproduce notices, status `drafted | sent | superseded | signed | deemed`, post-acceptance COs confirmed, and the secrets read-through confirmation when "No credentials" is NOT-CHECKED). Writing request n+1 marks every earlier `drafted` or `sent` request `superseded`. It holds:
- the build label tested
- every check with its passing run, `run_by` and `source`; checks whose only pass is `user alone` are listed under **"checked by the builder; not tested by your people"**
- the punch list
- change requests raised (not part of this acceptance) and post-acceptance COs
- records created during testing, as clean-up items
- the environment tested ("tested in production (client decision <date>)" where it applies)
- in its **first sentence**, the date on which it will be deemed accepted under the clause if the client neither signs nor sends a qualifying defect report (planned send date + N business days on the contract's calendar; the user confirms the planned send date when the request is written)
- the statement that signing accepts the build against the agreed acceptance checks

NEXT prints the workspace's `sign` destination (Deftwright: the client portal's e-signing); public default "send `signoff-request-<n>.md` to the client for signature". `--sent <n> <date>` acts only on a `drafted` request; it records the date the user sent it and appends `awaiting: sign-off by <client role> on request <n>` to `STATUS.md`.

**Supersession.** Every `-signoff` mode starts by comparing each `drafted` or `sent` request's `written` timestamp with the timestamped entries in the UAT-nn histories and `uat.yaml` (order of recording, not calendar date). A request is marked `superseded` if a higher-numbered request exists, or if, after it was written, a **reproduced** blocker or major Defect (a qualifying report: it names a failing acceptance check with steps to reproduce) or a new condition was logged, any UAT-nn from main scenarios was marked `fixed`, a CO was added with `--add-co`, a CO in `agreed/` was delivered, or a basis file was refrozen. (`-defect` and `-plan` can't write `signoff-requests.yaml`; when they record such an event they append `STATUS.md: request <n> will be superseded` instead.) The next complete request gets a new number. A minor or cosmetic logged after the request was written doesn't supersede; at sign-off it's added to `punch-list.md` marked "reported after request <n>; not on the signed list", and `ow-handoff` makes it a covered Fix.

**Recording the signature** (`--signed <n> <date> <client role>`) names the request: `signed <date> by <client role> on request <n>; signature not verified by this skill`. It acts only on a `drafted` or `sent` request. Supersession and the exit criteria are judged **as of the signature date**: a UAT-nn logged after that date doesn't supersede the request; `-defect` marks it `after sign-off` and it goes to `ow-handoff -fix` as a covered Fix. `-signoff` refuses for a request already superseded by then. It then asks the user for **every test account the builder created, set or knows a password for, or signed in with** (and any tester account in production), and writes:

| File | Contents |
|---|---|
| `signoff.md` | Request number, signed or deemed date, signer role, build label, post-acceptance COs, test accounts (role, environment, created-by; never a login), `delivery_backstop_date` (smaller projects, if the clause applies) |
| `acceptance-record.md` | Every check in `agreed/` with its final result, cases passed, the run and date, `run_by`, the build label, evidence by `cleared` pointer only |
| `punch-list.md` | The signed minors and cosmetics, plus any reported after the request, each linked to its UAT-nn |

`signoff.md`, `acceptance-record.md` and `punch-list.md` are write-once. Then NEXT prints, in order (step 0: `use ow-uat-defect` to mark each UAT-nn on `punch-list.md` `moved to punch list`; `-defect`'s resume step also does this for any it finds):
1. On larger projects: `use ow-build to invoice the acceptance payment from uat/<client>/signoff.md` (B2). Smaller projects: nothing yet.
2. `use ow-handoff-start on uat/<client>/` now: it freezes the basis and sets no window dates, so anything reported from here on is a covered Fix.
3. Only if `contract-inputs.md` records the documentation SKU as bought (P1): `use ow-documentation on uat/<client>/`. IF IT IS NOT AVAILABLE: the scenarios, training gaps and cleared evidence stay in `uat/<client>/` for later.
4. Package and deliver the Handoff notes (`ow-handoff -package`, `-delivered`) once documentation's documents are delivered; rollout tracking and the adoption check-in run alongside the fix window and don't hold delivery.

### 8.1 Deemed acceptance (decision 10)

The clause reaches the skill through `contract-inputs.md`'s `contract_clauses` block (P2), and only after the owner has approved its wording. `-plan` asks the user to confirm it matches the signed contract and freezes it in `uat.yaml` as `as signed, confirmed by <user> <date>`; otherwise `clauses: none`. Business days for both clauses are counted on **the contract's calendar** (weekdays except US federal holidays), not `profile.md`.

**The deemed date** for a sent request is the **latest** of:
1. `sent` + the clause's N business days
2. the date the request states in its first sentence
3. 5 business days after the latest **"cannot reproduce" notice** on that request

**Reports after sending.** A client report that names a failing acceptance check with steps to reproduce is a qualifying Defect report. If the builder reproduces it, it's a blocker or major Defect and supersedes the request (the next complete request starts a new count). `-defect` records when each report **arrived**. If the builder can't reproduce it, `-defect` records `cannot reproduce notice sent <date>`; the notice counts only if it was sent **within 3 business days of the report arriving** (contract calendar). A timely notice keeps the request `sent` and moves its deemed date out per rule 3 (`-signoff` adds it to the request's row). A late notice doesn't: `-defect` warns, and the report supersedes the request like any qualifying Defect report. A report that doesn't name a failing check with steps doesn't stop the clock; `-defect` records it and NEXT suggests asking the client for the missing details.

**Applying it.** After the deemed date, `-signoff --deemed <n>` judges supersession and the exit criteria as of the deemed date (with criterion 4's exemption; later UAT-nn go to `ow-handoff -fix`). If request n was still `sent` then, it shows the frozen clause, the three dates and the builder-run list, and asks the user to confirm. A request resting on builder-run checks counts as complete only if the frozen clause covers that case. On confirmation it writes the sign-off files with `deemed accepted under <clause ref> on <date>; applied by <user>; client response not received`. With `clauses: none`, `--deemed` refuses, `STATUS.md` keeps `awaiting: client sign-off on request <n> since <date>`, and NEXT suggests a follow-up and, after `uat.follow_up_business_days` (Deftwright: 5), taking it up under the contract.

### 8.2 Delivery backstop (decision 11, smaller projects)

Applies only on the two-payment schedule (half to book, half at delivery) and only with the frozen backstop clause. `-signoff` keeps a `backstop-log.yaml`:

- `--readiness <date> <dependency>` records that the builder has finished everything it can do alone and sent the client a **readiness notice** naming the listed client dependency still outstanding (from the scope's client dependencies). Recorded as reported.
- `--builder-delay <days> <reason>` records business days of delay the builder caused after the notice (each one moves the backstop date one day later).

**The backstop date** = the later of acceptance + the clause's N business days and the readiness notice + 5 business days, plus the recorded builder-caused delay days (contract calendar). `-signoff --backstop` writes `backstop.md` once (the dates, the outstanding dependency, `recorded by <user>; not verified by this skill`) and refuses when: the project isn't on the two-payment schedule; the clause is `none`; there's no readiness notice; the date hasn't passed (it applies from the day after the backstop date, unless the frozen clause says otherwise: owner decision OD-4); the dependency is no longer outstanding; the Handoff notes were delivered (`handoffs/<client>/dates.yaml`); the ledger shows the delivery half invoiced; or `backstop.md` exists. Then NEXT prints `use ow-build to invoice the delivery payment (backstop)`. At sign-off on smaller projects, `STATUS.md` gets `awaiting: handoff delivery` until the notes are delivered or the backstop applies.

### 8.3 Post-acceptance change orders (the addendum flow)

For a CO not in `agreed/` at sign-off: `-plan --addendum CO-nn` writes its scenarios (without adding it to the basis), `-run` records the sessions, and `-signoff --addendum CO-nn <date> <client role>` applies exit criteria 1–3 and 5 **limited to that CO's checks and the UAT-nn from its scenarios**: each check passes in a run whose `build` equals the latest of the CO's delivery and any `fixed` on those UAT-nn, with no blocker or major among them in a non-terminal state. It then records the client's confirmation (`confirmed <date> by <client role>; not verified by this skill`; that date is the CO's acceptance date) and writes `acceptance-addendum-CO-nn.md` (checks, results, run, `run_by`, build label, cleared evidence, the confirmation, and any secrets read-through confirmation). It never re-marks a payment. `ow-handoff` reads these addenda (H1): the confirmation date starts that CO's own fix period of `fix_window_days` (ow-handoff design, decision 9 and §7.1).

## 9. Self-checks

Each reports OK / FINDING / NOT-CHECKED(reason), labelled *same-session self-check: the same assistant applying a checklist; a discipline, not an independent review*. `-plan`, `-pack`, `-run`, `-defect` and `-signoff` refuse while any check that runs in them is FINDING; outside `-signoff`, a typed waiver naming the check is allowed. **"No credentials", "People by role or id", "Data check" and "No private names" can never be waived.**

| Check | Runs in | Passes when |
|---|---|---|
| Acceptance coverage | `-plan`, `-signoff` (plain, `--sent`, `--signed`) | Every check in `agreed/` has a required scenario; at sign-off, it passes on the latest build (§8 criterion 1) |
| No false pass | `-run`, `-signoff` | Every pass has a run with `run_by` and `source`; a result the user ran or read out is never written under a tester's role |
| Triage cites the basis | `-defect` | Every UAT-nn names the basis item it was judged against |
| Fix bounds | `-defect` | No open class-Defect UAT-nn beyond `fix_rounds` or past `fix_business_days` from its triage without an extension entry. A FINDING here never blocks `-defect` from writing the escalation or extension that clears it, or from working on other UAT-nn |
| Data check | `-plan`, `-pack`, `-run`, `-signoff` | No scenario, pack export or evidence reused forward shows real customer data, a credential, or a person's name, email or photo |
| People by role or id | every verb | No file **this skill writes** holds a tester's personal name or contact details. Imported originals stored in `evidence/` are pointer-only and outside this check (they're on `ow-handoff`'s deletion list) |
| No credentials | every verb | Files this skill writes hold no login, password, key or token. A value seen in a paste, import or evidence file is appended to `secrets-seen.log` (kind, tester role, source file, session; never the value) and NEXT prints `ask <client contact> to reset the <role> tester's login`. The imported file itself is kept as a pointer only; redacting or removing it is the user's recorded decision and doesn't block. If the check could only pattern-match, it's NOT-CHECKED and `-pack`/`-signoff` need the user's dated read-through confirmation, recorded in `pack.yaml`, the request's `signoff-requests.yaml` row, `backstop.md` or `acceptance-addendum-CO-nn.md` |
| Test access listed | `-signoff --signed` only | The test-account list asked for before `signoff.md` is written exists (it may be empty) and every entry has environment and created-by |
| No internal numbers | client outputs | No time-tracked hours, rates, margin or price-book internals |
| No private names | every verb | No blocklisted name (`llc-ops`) and no private skill |

## 10. What this skill never does

Signs anything, or applies deemed acceptance without the frozen clause and the user's confirmation · marks acceptance without every required scenario passing after the last fix · stores a tester's name or contact details · creates tester accounts or handles their passwords · copies real customer data into a scenario, pack or record · sends anything · edits a run or a sign-off request once written · fixes code itself.

## 11. Acceptance tests

- **Coverage:** 8 checks produce 8 required scenarios; removing one fails Acceptance coverage at `-plan`.
- **Required scenario:** a required scenario `not run` while a role scenario for the same check passes: sign-off refuses.
- **Regression:** a fix for UAT-05 breaks AC-2.1, which passed earlier; `-signoff` refuses and names AC-2.1 until it passes in a run after that fix.
- **Entry gate:** a `ready-for-uat.md` with a failing builder run stops `-plan`.
- **Triage:** a broken check (Defect), a new feature (Change), "didn't know where the button was" (Training gap), a missing tester account (Environment); the Change and the Training gap don't block sign-off even when typed as major or blocker.
- **Condition:** a condition CO blocks `-signoff` until it's signed, added with `--add-co` and its scenario passes; a declined condition lapses.
- **Post-acceptance CO:** a non-condition CO signed after the freeze is listed post-acceptance in `signoff.md`, doesn't stop `ow-handoff -start`, and is later covered by `--addendum`.
- **Rapid fix and bounds:** a Defect goes out, comes back fixed, is retested and closes; a second failure after round 2 escalates; a builder-caused overrun extends at no charge; testers absent for 3 days with two open Defects produce one change request cited by both.
- **Punch list:** a minor from a passing scenario moves to the punch list and sign-off proceeds; a minor logged after `--sent` lands on `punch-list.md` as "reported after request" and becomes a covered Fix.
- **Request lifecycle:** a signature recorded against a superseded request is refused; a fix marked after the request was written supersedes it (marked by the next `-signoff` run); a CO added with `--add-co` after sending supersedes it too; writing request 3 supersedes request 2.
- **After the signature date:** a major Defect logged after the client signed but before `--signed` is run doesn't supersede the request; it becomes a covered Fix in `ow-handoff`.
- **Addendum:** a CO accepted by `--addendum` needs a pass on the build after its last fix; a fix to an addendum UAT-nn doesn't make the main checks stale.
- **Late minor:** a minor logged after request n was written doesn't block `--signed n`; it lands on `punch-list.md` as "reported after request n".
- **Session date:** results from a session held before a fix but imported after it don't count as the confirmation run.
- **Deemed:** with the frozen clause, a request sent on day 0 with N = 10 is deemed on the latest of day 10, its stated date and 5 days after any cannot-reproduce notice, and only when the user confirms; a reproduced major on day 9 supersedes it; a report received on day 2 with a cannot-reproduce notice sent on day 6 supersedes it and doesn't move the deemed date; a report without steps doesn't stop the clock; with `clauses: none`, `--deemed` refuses.
- **No-show:** two missed sessions become no-show runs with awaitings; the builder-run request lists those checks separately.
- **Backstop:** with a readiness notice and an outstanding client dependency, written once after the later of acceptance + N and notice + 5 (plus builder-caused delay days); refused with no notice, when the dependency is resolved, or when the notes were delivered; a later `-delivered` doesn't prompt a second invoice.
- **Names:** a results file with a "Name" column imports with the column dropped; `uat.yaml` lists testers as role + id only.
- **Credentials:** a labelled password in a results file is caught; the run is written without it, `secrets-seen.log` gets an entry and a reset NEXT is printed.
- **Real data:** a real-case scenario pasting three real order rows fails the Data check at `-plan`; `-pack` refuses until they're replaced by a pointer.
- **Production:** a production plan with a synthetic data source refuses; a payment scenario with no test-mode or approval line stops `-pack`.
- **Test accounts:** a builder-created staging account listed at sign-off appears in `ow-handoff`'s `access.md` until confirmed removed.
- **After sign-off:** a defect reported during training is refused by `-defect` and logged by `ow-handoff -fix` as a covered Fix.
- **Quick-quote job:** roles from `quick-scope.md`'s UAT approach; a quote with no UAT line uses offers defaults and never charges for extra roles.
- **Private names:** with an empty `handoffs.yaml`, no output names `llc-ops` or "Deftwright".
- **Real use:** one real Deftwright UAT through sign-off.

## 12. Amendments this needs in other designs (approved 2026-10-14 and applied)

All seven were approved with this design on 2026-10-14 (decision 12) and applied the same day. The last column names where each now lives; the target design's text governs from here on.

| # | Design | Amendment | Applied (2026-10-14) |
|---|---|---|---|
| B1 | `ow-build` | `-accept` becomes **`-ready`**: writes `ready-for-uat.md` (milestones demoed, the builder's own run of every acceptance check, test environment, known issues, test data, build label). It marks no payment trigger and no longer writes `acceptance-record.md`. NEXT: `use ow-uat-plan on builds/<client>/ready-for-uat.md` | `2026-10-08-ow-build-design.md` header, §3, §8 (now "Ready for UAT"), §11 question 2, §12.8 fix 4 |
| B2 | `ow-build` | Larger projects: the 20% acceptance trigger is `uat/<client>/signoff.md` (signed or deemed). Smaller projects: the delivery half is whichever comes first of `handoffs/<client>/dates.yaml` `handoff_date` or `uat/<client>/backstop.md`, **invoiced once**: `-invoice` refuses a second delivery-half request when `ledger.md` already has one. Where `uat/<client>/uat.yaml` records a governing acceptance or delivery definition (an older quote), `-invoice` applies that statement | `2026-10-08-ow-build-design.md` §7 (payment triggers table) |
| B3 | `ow-build` | `-change` accepts one or more `uat/<client>/defects/UAT-nn.md` files for one CO (a Change, or `extension requested, client cause` priced from the UAT extension rate; an extension CO adds no checks and is never post-acceptance). `CO-nn.md` carries **no** post-acceptance mark: a CO is post-acceptance when `signoff.md` lists it so, or it was signed after the sign-off date (replaces A2's mark) | `2026-10-08-ow-build-design.md` §3, §6.1 |
| H1 | `ow-handoff` | Every `ow-build -accept` and A3 reference points to `ow-uat`. Upstream: `ow-uat` (`acceptance-record.md`, `signoff.md`, `punch-list.md`, `agreed/`, `acceptance-addendum-*.md`, `secrets-seen.log`, `evidence/`). `-start` runs right after sign-off and copies `uat/<client>/agreed/` (which already holds the included block and ownership terms) into its own `agreed/`; handoff `-start` and `-fix` take post-acceptance COs from `signoff.md`'s list plus any non-extension CO signed after the sign-off date (this replaces handoff §7.1's CO bullet and A2's mark). **A3 is withdrawn** (replaced by B1 and §8.3's `acceptance-addendum-CO-nn.md`), and handoff §3.1's "doesn't cover every check" case is dropped: the UAT acceptance record covers every check in `agreed/` by construction. `-start` prints `NEXT: use ow-handoff-fix on uat/<client>/punch-list.md`, and `-fix` logs each punch-list item as a covered FIX-nn with `reported` = its UAT-nn's logged date. `-access` adds: the `evidence/` items **not** marked `cleared`, the imported results files, and every session named in `secrets-seen.log` to source 4; each `secrets-seen.log` entry to source 3 as a reset/rotate item; the test accounts in `signoff.md` as a fifth source (handoff §9 and its Access complete check change from four sources to five). `cleared` evidence joins handoff's keep list (the acceptance record cites it). Each `acceptance-addendum-CO-nn.md` gives that CO's acceptance date (handoff open question 3, now decision 9: the CO's own fix period starts there). Missing acceptance record: `NEXT: use ow-uat-signoff on uat/<client>/` | `2026-10-08-ow-handoff-design.md` header, §2 (decisions 6–9), §3, §3.1, §5, §6, §7.1, §7.2, §7.4, §9, §10, §11, §12, §13, §14 |
| H2 | `ow-handoff` | On smaller projects, `-delivered` prints `NEXT: use ow-build to invoice the delivery payment` only when `ledger.md` doesn't already show the delivery half invoiced; handoff §3.1 gains a row for this read (absent: not invoiced, print the NEXT). Where `uat/<client>/uat.yaml` records a governing delivery definition, `-delivered` follows it | `2026-10-08-ow-handoff-design.md` §3 (`-delivered`), §3.1 (ledger and `uat.yaml` rows) |
| P1 | `ow-build-plan` | The price book gains the **documentation & training SKU** (D5–D6: a price per build size for up to 15 people, the per-group add-on, the floor) and the **UAT line** (§7.1: a price per build size with roles, sessions and fix bounds, the per-role add-on and the extension rate). Both take the build product's own size letter. `-quote` renders the UAT line client-facing (size, tester roles, test mix, sessions, fix rounds, fix days; the extension rate stays internal) and copies it into `contract-inputs.md`; `--quick` asks which roles will test and records them **by role name** (never a person's name) as the UAT approach in the `quick-scope.md` (it never defaults the number of roles). `-quote` renders the documentation SKU as its own declinable line and records `documentation_sku: bought | declined` in `contract-inputs.md`. The quote's acceptance line becomes "the build is accepted when the client signs off user acceptance testing with every acceptance check passing, or as the contract's deemed-acceptance clause provides", and smaller projects add "Delivery: the day the Handoff notes are delivered, or as the contract's delivery-backstop clause provides" | `2026-10-06-ow-build-plan-design.md` §3, §4, §6.1, §6.3, §8, §9 |
| P2 | `ow-build-plan` | `-quote` copies a `contract_clauses` block (`deemed_acceptance` and `delivery_backstop`, each `{ref, business_days, calendar, wording}`) from the user-maintained `offers.md` into `contract-inputs.md`. The user adds the block once the contract step has drafted the standard clauses; with no block, `contract-inputs.md` says the clauses are not set | `2026-10-06-ow-build-plan-design.md` §8 (`contract-inputs.md`) |

## 13. Open questions

These are the owner's **contract-step items**. They don't block building the skill: until the clauses exist (approved, in `offers.md` and confirmed at `-plan`), `--deemed` and `--backstop` refuse (§8.1, §8.2).

1. **Numbers.** The base hours behind the user's prices (in their own `price-book.yaml`) are estimates to check against the first real jobs. The clauses' N values (drafted at 10 business days each) are yours to confirm in the clause review.
2. **Clause approval.** Both clauses are drafted for your review in your contract step (deemed acceptance at SOW 8(d)–8(h), the backstop at 7(e)), with four choices left: N for each, whether a stated date replaces the reminder step, and whether to keep a narrowed live-use trigger. Until you approve them and they're in `offers.md` and confirmed at `-plan`, `--deemed` and `--backstop` refuse.

## 14. Review record

| Pass | Found | Outcome |
|---|---|---|
| Owner approval, 2026-10-14 | — | Approved with B1, B2, B3, H1, H2, P1 and P2, each applied to its target design (§12). Real prices removed from this design (decision 13); `--quick` records tester roles by role name. §13 stays open as contract-step items |
| Owner changes, 2026-10-09 | — | Pricing simplified to build size; deemed acceptance briefly dropped, then confirmed with the drafted later-of rule; backstop gains a readiness notice and builder-caused delay days |
| Contradiction check of revision 3 | 26 issues: 2 high, 11 medium, 13 low (the main criteria blocking the addendum flow; imported originals tripping the people check; signature judged at recording time, not signature date; same-day ordering; addendum gate and confirmation; extension COs; A3 and the post-acceptance mark left in handoff; documentation SKU never recorded) | Revision 4 (this one), targeted edits |
| Contradiction check of revision 2 | 34 issues: 7 high, 14 medium, 13 low (no writer for supersession; a late minor blocking its own signature; the test-access check blocking every request; CO deliveries unrecorded; post-acceptance recording with no writer; included items and ownership terms lost to handoff; addendum file collisions) | Revision 3, targeted edits: `-signoff` derives supersession from `written` dates on every run; criterion 4 exemption for late minors; `--sent`/`--signed`/`--deemed` take a request number; CO deliveries and `session_date` recorded; included block and ownership terms frozen into `agreed/`; Data check never waivable; addenda named per CO |
| Adversarial review of revision 1 (four lenses: site and money, consistency, security and privacy, edges and state; a skeptic tried to refute each finding) | 32 findings: 15 high, 15 medium, 1 low upheld; 1 refuted (defect files going to a third-party builder without a roles-only check) | Revision 2. Main changes: required scenario per check passing after the last build change, with a build label on every run; severity gates on Defects only, with terminal states per class; one rule for which COs are in the acceptance, with `--add-co` and the addendum flow; the UAT line, acceptance and delivery definitions and clauses carried into the signed quote; numbered sign-off requests that can be superseded; no-show runs and builder-run disclosure; testers by role and id only; real data by pointer only; production safeguards; test accounts and `secrets-seen.log` handed to `ow-handoff`; per-Defect bounds with extension entries; reports after sign-off go to `ow-handoff -fix` |


## 15. Build notes (ow-uat 1.0.0, Sprint 3, 2026-10-17)

Where the build filled in what this design leaves open, or departed from its wording. None changes a price, a payment rule or a business rule; where the design is silent on a figure or a choice, the skill asks the user and records the answer `user-stated`. Contract: `sprints/release-2.1/ow-sprint-3/contract.md`.

### 15.1 Owner rulings (2026-10-17, contract O1 to O9, every recommendation accepted)

| # | Ruling | Where it lives |
|---|---|---|
| O1 | **Files read in place.** A reads row may say `in_place: true`: the file is read where an earlier stage left it, with no hand-off row. `check-skill-contracts` accepts it only when the producer writes the file and a chain of hand-offs leads from the producer to the reader. ow-uat reads the signed plan's files, ow-build's `changes/requests.md` and `ledger.md`, and ow-handoff's `dates.yaml` in place; ow-build-plan's `UAT-nn.md` read is marked the same way | `scripts/check-skill-contracts.mjs`; `skills-work/README.md`; the edges files |
| O2 | **`secrets-seen.log` is a skill-local append log**: declared under ow-uat's `append_logs`, appended to by its five verbs, written by no other skill | as O1 |
| O3 | `calc date --calendar us-federal` ships as **ow-tools 1.2.0**, after Sprint T's 1.1.0 | the ow-tools part of the sprint |
| O4 | A bare **`/ow-uat`** verb: the resume screen and `/ow-uat on <path>`, writing nothing. The ready NEXT stays `use ow-uat-plan` (D3) | `references/routing-and-resume.md` |
| O5 | The documentation NEXT is **`use ow-documentation-start on uat/<client>/`** (`/ow-documentation-start`, a planned verb) | §8 step 3 as built |
| O6 | A sign-off condition whose request ow-build finds **too big for a change order keeps blocking until the client withdraws it** (`condition withdrawn by <role> <date>`). `-defect` learns the outcome from ow-build's `changes/requests.md` row, read in place | `references/defect-format.md` §5 |
| O7 | A fix past the quoted bounds for the builder's own reasons: **dates and rounds against the quoted bounds may appear in client text; our hours and the extension rate never do** | `references/self-checks.md` |
| O8 | **A clause calendar other than US federal is refused**: no clause date is computed (`calendar-not-supported`) | `references/contract-calendar.md` §1 |
| O9 | Edits to a merged skill's **data, examples and tests ride without a version bump** (listed in the PR and under `[Unreleased]`); a change to its SKILL.md or a reference bumps it. This sprint changes ow-build's and ow-build-plan's edges data, the shared `offers.md` and `handoffs.yaml` examples (every copy byte-identical), `catalogs.json`, ow-build's seven stand-in UAT inputs (now copies of ow-uat goldens), five ow-build test lines (four that named ow-uat as unbuilt, one that edited a stand-in's history line) and two catalog test expectations; no merged skill's text. Round 2 adds, still without a version bump: OD-1 edges data (ow-build-plan's signed hand-off hands on `map/roles.md`; ow-build's ready hand-off lists `requests.md`, `ledger.md` and the signed plan's files, its too-big hand-off `UAT-nn.md`), ow-build's checker rule for the governing definition with its new golden `invoice-delivery-governing`, ow-build's fixture README and case list, and the regenerated copies (UAT-03 to UAT-05's reason, `backstop.md`'s date) | — |

**After evaluation round 1** (`sprints/release-2.1/ow-sprint-3/eval-round-1.md`; the owner's answers to its open questions, 2026-10-17):

| # | Ruling | Where it lives |
|---|---|---|
| OD-1 | **An in-place read needs a chain that carries the file**: every hop from the producer to the reader lists the file (or a field of it) in its hand-off; a hop passing on another skill's file marks the entry `in_place: true`. This narrows O1, whose chain rule let any skill read any file of a skill upstream of it in the family's cycle | `scripts/check-skill-contracts.mjs`; the edges of ow-build-plan, ow-build and ow-uat |
| OD-2 | The PR waits for OW-03 (ow-tools 1.1.0), then merges main in; the ow-tools commits are rebuilt on 1.1.0 then | the PR |
| OD-3 | **The data check catches generic shapes**: a delimited row of three or more fields holding an email, a phone number, a card-like number or an ID-like token, and a long table of values; controls first; anything else is the self-check's | `scripts/ow-uat-acceptance.mjs`; `references/self-checks.md` |
| OD-4 | **The backstop applies from the day after the backstop date**, unless the frozen clause says otherwise; §8.2 below now says "has passed" in the same sense as deemed acceptance | §8.2; `references/phase-signoff.md` §6 |
| OD-5 | **Frozen clauses by digest**: `-plan` records the digest of the block it copied from `contract-inputs.md` (not the whole file) in `uat.yaml`'s basis row for `agreed/contract-terms.md`; later verbs compare it with the same block's digest upstream; `--refreeze` copies only that block. Departure 8's byte comparison holds for the byte-for-byte copies only | `references/uat-yaml-schema.md` §4 and §6; `references/routing-and-resume.md` §1 |

**After evaluation round 2** (`sprints/release-2.1/ow-sprint-3/eval-round-2.md`; the owner's answers, 2026-10-17):

| # | Ruling | Where it lives |
|---|---|---|
| OD-6 | **The frozen terms block covers the payment schedule and `payment_terms_days` as well as the clauses**: by digest where code runs, by text where it can't. A change upstream blocks `-pack`, `-defect` triage and `-signoff` until the block is re-frozen | `references/uat-yaml-schema.md` §6; `references/routing-and-resume.md` §1; `scripts/ow-uat-acceptance.mjs` (`termsBlock`, `termsTextMismatches`, `checkBasis`) |
| OD-7 | **A table is judged by its content**: flagged only when its rows carry personal or ID-like values (emails, phone numbers, card-like numbers, ID tokens, names); count and schedule tables pass at any length. It replaces OD-3's long-table rule | `scripts/ow-uat-acceptance.mjs` (`dataFindings`); `references/self-checks.md` |
| R2-1 | **Confirmed: with no code, every part of the terms block is compared as text** (the clauses in `uat.yaml`, the schedule, the payment terms, the UAT line, the definitions, the SKU, the ownership terms), labelled not machine-checked; the checker never skips it | `references/uat-yaml-schema.md` §6; `references/routing-and-resume.md` §1; `scripts/ow-uat-acceptance.mjs` (`checkPlan`, `checkBasis`) |

**After evaluation round 3** (`sprints/release-2.1/ow-sprint-3/eval-round-3.md`, PASS at 7.8; the owner's answers, 2026-10-19). Both are built in the OW-04 follow-up PR, with the minors R3-1 to R3-7; until then the text and checker on this branch are unchanged:

| # | Ruling | Where it will live |
|---|---|---|
| R3-6 | **`--refreeze agreed/acceptance.md` refuses when the upstream check list has changed** and points to `--add-co`: a new check gets its scenario, test and price through the change-order path. `--refreeze` never re-derives `checks` or writes a scenario | `references/phase-plan.md`; `scripts/ow-uat-acceptance.mjs` (`checkPlanMode`) |
| R3-4 | **A provider's published test cards, and ids marked sandbox or test, are allowed in client text and scenarios**; a real card shape or an unmarked id is still refused | `references/self-checks.md`; `scripts/ow-uat-acceptance.mjs` (`dataFindings`) |

### 15.2 Departures and run-time answers

| # | Where | What the build does | Why |
|---|---|---|---|
| 1 | §3, §5 (**the pack's Markdown source**) | `-pack` writes `uat-pack-<role>.md`, the single source of every format; ow-tools exports it to `export/uat-pack-<role>.{pdf,docx}`, and without ow-tools `-pack` writes `export/uat-pack-<role>.html` | ow-tools exports Markdown; §3 named only the exports (contract review) |
| 2 | §3, §8 (**the sign-off request export**) | "(+ export)" is `export/signoff-request-<n>.{pdf,docx}`, written by plain `-signoff` with ow-tools; without it the Markdown is the request | §3 gave no path (contract review) |
| 3 | §8 (**`rec` ordering**) | Every timestamped entry (plan steps and events in `uat.yaml`, run headers, UAT-nn history lines, request rows and their status changes) carries `rec: <n>`, one more than the highest under `uat/<client>/`. Supersession and same-day ordering compare `rec`, never the calendar date | "Order of recording" could not be checked from dates (contract review) |
| 4 | §3, §8 (**per-step resume records**) | `-plan` records `plan_steps` in `uat.yaml` as each step finishes (`basis` first, `scenarios` last); `--signed` and `--deemed` record `signing_steps` in the request's row. A cut-off verb resumes at the first missing step, never re-freezes `agreed/` and never rewrites a written file. Every multi-file verb writes its marker last: `RUN-nn.md` after its evidence rows, `signoff.md` after the record and the punch list | A session ending between the freeze and the scenarios would have re-frozen on resume (contract review; Sprint 2 bug 1) |
| 5 | §8 (**the documentation NEXT wording**) | O5 above | `use ow-documentation on …` named no declared or planned verb |
| 6 | §6.1 (**the condition that turns out too big**) | O6 above | The design left the state undefined |
| 7 | §3 | Writers are exact per mode: `uat.yaml` by `-plan` in every mode; `agreed/` files by `-plan` and `--refreeze` (a change order also by `--add-co`); scenarios by `-plan`, `--add-co` and `--addendum`; the request only in plain mode; `signoff.md`, `acceptance-record.md` and `punch-list.md` only by `--signed` and `--deemed`; `backstop-log.yaml` by `--readiness` and `--builder-delay`; `signoff-requests.yaml` by every mode (every mode first updates request statuses) | One writer per file (R3), checked to the mode |
| 8 | §3.1, §7.1 | `agreed/` holds byte-for-byte copies (each keeps its producer's header) plus ow-uat's own `agreed/contract-terms.md`: the included block, the ownership terms, the UAT line and the definitions, quoted exactly. A basis mismatch is a byte difference between a frozen copy and its upstream | §3.1 says "compares each file's date"; bytes catch an edit made the same day |
| 9 | §8.1 | The frozen clauses live in `uat.yaml` `clauses`, each value copied unchanged from `contract-inputs.md` `contract_clauses`; fixtures carry clauses marked "INVENTED TEST CLAUSE, not contract wording" | D4: the owner writes clause wording in the contract step |
| 10 | §8 | The request's first sentence has three forms: a deemed date; "no deemed-acceptance clause" (`clauses: none`); "can't be computed here" (a calendar that is not supported, O8) | §8 assumed a clause |
| 11 | §8 | `signoff.md` `delivery_backstop_date` is "no sooner than <acceptance + N>" at sign-off: the backstop also needs a readiness notice, so the date itself is `backstop.md`'s | The design's field cannot be known at sign-off |
| 12 | §6, §8.1 | A problem can come from a client report outside a session (`logged from a report by <role>, arrived <date>`) as well as from a run | §6 named only runs; §8.1 needs reports |
| 13 | §4.2 | The sign-off STATUS lines all name the request (`catalogs.json` `statusNames`: `/ow-uat-signoff` → `request <n>`), e.g. `awaiting: none (signed on request <n>)` | Several requests can be live at once |
| 14 | §3 | `handoffs.yaml` gains the `sign` key in the shared example (every copy byte-identical); ow-uat reads `build` and `sign`. ow-uat prints ow-build's invoice NEXT rather than reading `invoice` | §3.1 listed `invoice`, which ow-build owns |
| 15 | §3.1 | `offers.md` gains a `uat` section (`defaults`, `min_testers_per_role`, `follow_up_business_days`), invented placeholders | P1 named the keys, not the example |
| 16 | §3, §8 | NEXT blocks are printed, never written into a file (the request is client-facing; a UAT-nn goes to the builder). The acceptance checker reads the printed block from `printed.md`, which whoever runs a test saves at the top of the run folder | A file the client or builder reads carries no tool text (protocol §12) |
| 17 | §4.4 | The git-ignore step edits the user's own repository `.gitignore` on their yes, as ow-build's audio step does; it is not a file the skill owns, so it has no edges row. Both invented clients' working folders are outside a git repo (`answer: not a git repo`) | The edges list the skill's own files |
| 18 | §8 | Plain `-signoff` with a live request that nothing superseded writes no new request on a route; it writes request n+1 (superseding n) only when the user asks for a new one | A route must never duplicate a request by accident; §11's "request 3 supersedes request 2" is the user's ask |
| 19 | §8.1 | The follow-up suggested when `clauses: none` counts `follow_up_business_days` on `profile.md`'s calendar: it is not a clause date | Only the two clauses, the cannot-reproduce window and the readiness notice use the contract calendar |
| 20 | §4.4, §11 | A production plan with a synthetic data source refuses at the environment step: the steps before it are recorded, and the next `-plan` resumes there | The basis is frozen first (row 4) |
| 21 | §5 | `secrets-seen.log` carries the protocol header block, then one line per credential with its `rec` | One format for every file the skill writes |
| 22 | §8.1 | The request row keeps `calc`, the deemed date's source (the command and output, or the table, not machine-checked), and each counting notice as `{ uat, arrived, sent, notice_rec }` | The date has to be traceable (protocol §7) |
| 23 | §9 | The no-clause-wording rule is enforced on skill text by `check-skill-contracts` (a family rule): no "shall … deemed", no "deemed … business days … unless", no `INVENTED TEST CLAUSE` text outside the fixtures. Round 2 widens it by category (R1-11): "taken to have accepted", the legal "ten (10) days" numeral, "deemed given … <n> days", "becomes due <n> business days after", "whether or not the client has" | D4: clauses reach the skill only through the user's contract inputs |
| 24 | §3.1 (OD-5, OD-6, R1-2, R2-1, R2-4) | The **terms block** is the header lines `uat`, `schedule`, `payment_terms_days`, `acceptance_definition`, `delivery_definition`, `documentation_sku` and `contract_clauses` (each with its indented lines up to the next header key, blank and comment lines skipped, line endings read as newlines) and the `## Ownership` section of `contract-inputs.md`, as they stand. Its digest is SHA-256 where code runs; with none, `digest: "none (no code here)"` and every part is compared as text (the clauses with `uat.yaml` `clauses`, the rest with `terms` and `contract-terms.md`), labelled not machine-checked. `quote.md`'s included block is not digested: a signed quote does not change after signing | The owner chose a digest of the copied block; a text-only skill needs a no-code path that compares what money depends on |
| 25 | §4.3 (R1-3, R1-5) | On a resume, a file written for the first time, or a question asked for the first time (the test accounts, when the cut came before that step), is not a rewrite. What a recorded step wrote stands: its `uat.yaml` keys, its files, its answers. A step finished in the resume carries the resume's date | "Never repeats a recorded step" read literally |
| 26 | §6 (R1-16) | A client reason never contradicts its status: a condition's reason changes when it is set, met, lapses or is withdrawn. Before a retest the reason says "The fix is at no charge", never "Fixed"; a reason is about its own UAT-nn even when it names no id | C8: no client sentence calls an unretested UAT-nn fixed |
| 27 | §8.1 (R1-17) | The no-tool table runs from 2026 to 2031 (a count across 2030 into 2031 uses the 2031 rows); a count that leaves it asks the user, recorded user-stated, not machine-checked | 2030-12-20 + 10 business days is 2031-01-07 |
| 28 | §3 (R1-13, C14) | The acceptance checker pins the C1 writer table and the H1 and §4.1 hand-off field lists; the run-level writes check reads the pin, and two functions hold `skill.edges.yaml` to it, so widening a writer in the edges no longer widens the check | The edges were both the rule and its only test |
| 29 | §7.1 (R1-18) | ow-build's checker applies `uat.yaml`'s governing definition: an acceptance or delivery request quotes it (ow-build golden `invoice-delivery-governing`, which reads a copy of `m-plan-no-uat-line`'s `uat.yaml`). The punch list's columns, the logged date among them, are checked | C5 named it; only a regex on ow-build's text checked it |
| 30 | §9 (OD-3, OD-7) | The data check flags a delimited row of three or more fields (a table row of two or more) with an email, a phone number, a card-like number, an ID-like token or, under a name or customer column, a name; a card number anywhere; and a record noun followed by an ID-like token in prose ("Account 99120345"). A bare number under a column that counts something ("Orders in the test") is a count, not an id. Length never flags a table (OD-7). Other prose naming one record value is the self-check's | The owner's rulings; two of the Evaluator's round-1 prose plants stay named skips |
| 31 | §3 (R1-15) | The body's "Reads from" table has one row per file | Deliverable 1 |
| 32 | §4.3 (R2-5) | `--refreeze <file>` changes only that file's basis row, and for `agreed/contract-terms.md` the `terms`, `clauses` and contract calendar the user confirms again; every other recorded step's output stands, as on a resume | A refreeze is a one-file correction, not a re-plan |
| 33 | §8.2 (OD-4, R2-6) | The backstop moves to its own date only when the frozen clause says in so many words that it applies (falls due, takes effect) on that date; wording that counts something "from the same day" does not | OD-4's "explicitly" |
| 34 | §3 (R2-7) | The pinned hand-off lists (departure 28) cover all of H1 and §4.1: the `agreed/` copies, the addendum, `uat.yaml`'s governing definition for H2, documentation's `signoff.md`, and the punch list to `-fix`; an append log's `append: true` is pinned too | The Evaluator dropped each and nothing noticed |
| 35 | §6 (R2-10) | The basis check holds `-defect` runs too: over a mismatch a problem is logged but not triaged (no `triaged` history line), and the printed block names the mismatch | §1.3 of the routing reference said so; no check held a run to it |
| 36 | §11 (C4, RC04) | A route cell that grades another case's run also applies that run's own checks | A route cell is a second way into the same run |
| 37 | §8.1 (R1-17, YC13) | The checker's table oracle refuses a count that leaves 2026 to 2031, as the skill asks the user there; `ow-tools calc --calendar us-federal` answers 2022 to 2099 | The oracle must not grade a date the skill would not compute |
