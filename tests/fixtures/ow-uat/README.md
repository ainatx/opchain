# ow-uat acceptance fixtures

Everything here is **invented**: the fictional clients Larkspur Ceramics and Mossgate Books (continued from the ow-build-plan and ow-build fixtures), the fictional consultant "Robin" of "Example Studio", testers recorded by role and an invented id, invented results files, reports and change orders. The contract clauses in the Mossgate cases are marked **INVENTED TEST CLAUSE, not contract wording**: the owner writes clause wording in the contract step (owner decision D4). No real client material, no real price, no real person's name and no clause wording belongs in this folder. A few files plant a name, a password or pasted record values on purpose, to prove the checks catch them; each says so in its answer key.

These are the acceptance tests from `docs/plans/2026-10-09-ow-uat-design.md` §11 and the Sprint 3 contract (`sprints/release-2.1/ow-sprint-3/contract.md`, C1 to C19), written so they can be checked mechanically. ow-uat is a text-only skill, so a model has to run it; the checker (`scripts/ow-uat-acceptance.mjs`) reads what the run wrote and what it printed, and tests it against an answer key, the frozen basis, the runs and the contract calendar. "Real use" (one real acceptance test through sign-off) is graded in Sprint 6.

## Layout of a case

| Folder or file | Holds |
|---|---|
| `input/` | Files the case adds to its starting state: a results file the testers sent (`opchain-work/uat/<client>/evidence/…`), a client's change order, a planted state for a refusal case |
| `session/` | What the user says or brings in the session: answers, a report, a request |
| `expected/` | The hand-written golden run: what ow-uat writes under `opchain-work/`, and `printed.md`, the NEXT block the run printed |
| `answer-key.yaml` | The case: `base:` (the ow-uat case it continues), `build_case:` (the ow-build golden run it reads; that run brings ow-build-plan's), `run:` (grade another case's run), `verbs`, `today`, the checks and what each expects |

A case's starting state is layered, newest first: its own `input/` and `session/`, then each earlier ow-uat case down its `base:` chain (their `expected/`, `input/`, `session/`), then the ow-build worlds its chain names (the case's own `build_case` first), then the shared workspace (`profile.md`, `price-book.yaml`, the skills' shipped `offers.md` and `handoffs.yaml`). `STATUS.md` carries ow-build's lines from the same weeks, where they fall.

## The stories

**Larkspur Ceramics** (40/40/20, a larger project; nine checks, CO-01's two included; three tester roles; contract clauses not set; documentation bought). From ow-build's `ready-passing` run: `plan` → `pack` → `run-session-1` (a Name column, a name in a note and a password, all kept out; `secrets-seen.log`) → `defect-triage` (three Defects, an environment problem, a training gap) → `run-no-show` → `defect-extension` (one client-side event, three Defects) → `defect-change-portal` and `defect-change-text` (Changes from client reports) → `defect-fixed` → `defect-condition` (UAT-07 made a condition) → `run-confirmation` → `defect-retest` (the condition lapses: CO-03 declined) → `signoff-request-1` → `signoff-sent-1` → `defect-supersedes` (a reproduced major) → `defect-fixed-uat-09` → `run-retest` → `defect-retest-uat-09` → `signoff-request-2` (request 1 superseded; CO-04 post-acceptance) → `signoff-sent-2` → `defect-late-minor` → `signoff-signed` → `defect-punch-step0`. Then the addendum for CO-04: `plan-addendum` → `plan-addendum-delivered` → `run-addendum` → `defect-addendum` → `defect-addendum-fixed` → `run-addendum-retest` → `defect-addendum-retest` → `signoff-addendum`.

Branches off it: the cut-off `-plan` and its resume (`plan-cut`, `plan-resume`, and after the terms step `plan-cut-terms`, `plan-resume-terms`); a `--signed` cut off and resumed after each step (`signoff-signed-cut`, `signoff-signed-resume`, and `signoff-signed-cut-<step>`, `signoff-signed-resume-<step>` for record, accounts and acceptance-record); the terms block changed upstream (owner decision OD-5: `pack-terms-mismatch`, `plan-refreeze-terms`); the condition signed and added (`plan-add-co`, `defect-condition-met`, `signoff-condition-unmet`); `--add-co` after sending (`plan-add-co-after-sent`, `signoff-superseded-by-add-co`); request 3 (`signoff-request-3`); a signature on a superseded request (`signed-superseded-refused`); the signature date (`defect-after-signature-date`, `signed-after-signature-date`); bounds and escalation (`defect-escalated`); a condition too big for a change order (owner decision O6: `defect-condition-too-big`, `signoff-condition-too-big`, `defect-condition-withdrawn`); the exit criteria with planted states (`signoff-criteria-unmet`, `signoff-regression`, `signoff-required-not-run`, `signoff-session-date`); production, real data and a basis mismatch (`plan-production-refused`, `pack-production-refused`, `pack-real-data-refused`, `pack-basis-mismatch`, `plan-keep-frozen`, `plan-refreeze`); refusals after sign-off (`defect-after-signoff`, `signoff-after-signed`); clauses none (`deemed-clauses-none`).

**Mossgate Books** (a quick quote, 50/50, a smaller project; three checks; one tester role from the quick scope's UAT approach; INVENTED TEST CLAUSES; documentation declined). From ow-build's `invoice-booking-small` run and an invented `ready-for-uat.md`: `m-plan` → `m-pack` → `m-run-no-show-1` → `m-run-no-show-2` → `m-run-user-alone` → `m-signoff-request` (the deemed date from the table, not machine-checked; `m-signoff-request-calc` takes it from `ow-tools calc`) → `m-sent` → `m-defect-no-steps` → `m-deemed` → `m-readiness` → `m-builder-delay` → `m-backstop`. Branches: a reproduced major on day 9 (`m-defect-reproduced`, `m-deemed-superseded`); a timely cannot-reproduce notice (`m-notice-timely`, `m-deemed-too-early`, `m-deemed-moved`); a late one (`m-notice-late`, `m-deemed-late-notice`); a calendar that is not supported (`m-deemed-calendar-unsupported`, owner decision O8); an ow-tools without the calendar capability (`m-signoff-request-nocap`); the backstop refusals (`backstop-*`, `backstop-on-the-date` among them: owner decision OD-4, it applies from the day after its date), with a clause that only counts a notice "from the same day" (`backstop-incidental`, refused) and one that says the backstop falls due on its own date (`backstop-clause-on-date`, applied); a quick quote with no UAT line and other acceptance wording (`m-plan-no-uat-line`). The terms block where no code runs (owner decisions OD-5 and OD-6, R2-1): `m-plan-nocode` freezes it with `digest: "none (no code here)"`, then `pack-terms-nocode` (nothing changed upstream), `pack-terms-nocode-changed` (a clause changed: refused) and `pack-terms-nocode-schedule` (the payment schedule changed: refused); by digest, `pack-payment-terms-changed` (the payment terms changed: refused); and `defect-terms-mismatch` (a problem logged over a mismatch, its triage left until the block is re-frozen or kept).

**Routes** (contract C4): every inbound route and stage has a case named `route-*` (or a refusal case that says which cell it grades): ow-build's ready file at each stage, the handoff's `use ow-uat-signoff on uat/<client>/` and `use ow-uat-defect on uat/<client>/`, documentation's `use ow-uat-signoff` with no path, and the folder route at every stage.

## What other skills read from here

ow-build's fixtures read six of these goldens byte for byte (`tests/ow-uat-plants.test.js` keeps the copies identical): `defect-extension`'s UAT-03 to UAT-05 (`change-uat-extension`), `defect-change-portal`'s UAT-06 (`change-uat-too-big`), `defect-change-text`'s UAT-07 (`change-uat-unpriced`), `signoff-signed`'s `signoff.md` (`invoice-acceptance`), `m-backstop`'s `backstop.md` (`invoice-delivery-backstop`) and `m-plan-no-uat-line`'s `uat.yaml`, with its governing definition (`invoice-delivery-governing`).

## Checking a real run

```bash
node scripts/ow-uat-acceptance.mjs --prepare signoff-signed /path/to/empty-folder
```

That lays out the starting state. Attach the folder in a session where ow-uat is installed and run the step the answer key's `verbs` and `section` name, saying what the case's `session/` files say. Save the NEXT block the run printed as `printed.md` at the top of the folder. Then:

```bash
node scripts/ow-uat-acceptance.mjs signoff-signed /path/to/empty-folder
```

With no arguments, the script checks every golden run (what `tests/ow-uat-acceptance.test.js` does in `npm test`).
