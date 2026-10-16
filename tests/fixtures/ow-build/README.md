# ow-build acceptance fixtures

Everything here is **invented**: fictional clients (Larkspur Ceramics, Mossgate Books and Fernhill Florists, continued from the ow-build-plan fixtures), a fictional consultant ("Robin" of "Example Studio"), a made-up builder in the opchain project format ("example-builder", named only in the business's `handoffs.yaml`), made-up git logs, notes, time exports, sprint reports and checkpoints. No real client material, no real builder and no real price belongs in this folder.

These are the acceptance tests from `docs/plans/2026-10-08-ow-build-design.md` §10 and §12.7, written so they can be checked mechanically. ow-build is a text-only skill, so a model has to run it; the checker (`scripts/ow-build-acceptance.mjs`) reads what the run wrote and tests it against an answer key, the signed Build Plan, the price book and the builder's own files. "Real use" (one real build through at least two updates, a demo and a change order) is not here: it is graded in Sprint 6, with the email rendering checks in Gmail and Outlook web.

## Layout of a case

| Folder | Holds |
|---|---|
| `input/` | Files the case adds to its starting state: `opchain-work/…` (a business's `handoffs.yaml`, a UAT or FIX file, a sign-off), `time/…` (the time export), or `<repo>/…` (builder files from before the run) |
| `session/` | What the user brings to the session: the week's `git-log.txt`, notes, a client's email, a demo's notes, the confirmation pass |
| `builder/` | What the builder writes during the run, in the client's project folder (`<repo>/sprints/…`, `<repo>/.checkpoints/…`). Data the run reads, never ow-build's own output |
| `expected/` | The hand-written golden run: what ow-build writes under `opchain-work/` and `<repo>/spec/` |
| `answer-key.yaml` | The case: `base:` (the case it continues), `plan_case:` (the ow-build-plan golden run it starts from), `extra:` (shared layers), `run:` (grade another case's run) and the checks |

`plans-signed/` holds two signed plans written as ow-build-plan would have: Mossgate Books' quick quote signed (after the ow-build-plan `quick-quote` run) and Fernhill Florists' delivery-mode plan with nine checks (after `route-next-stage`).

## One story per client

**Larkspur Ceramics** (ow-build-plan's `accepted-signed` run; 40/40/20, two milestones, opchain mode):

| Case | Design | Run | What is planted |
|---|---|---|---|
| `start` | §12.2, §12.7 | `-start` | The business's `handoffs.yaml` names the builder; the builder's approved sprint plan maps sprints 1-2 to M1 and 3-4 to M2 and carries a planted instruction |
| `route-signed-plan` | C4 | the `start` run | ow-build-plan's signed NEXT lands on `-start` |
| `start-resume` | §12.7, round 1 bug 1 | `-start` again | The session that wrote `spec/` and the ledger ended while the builder planned: `build.yaml` is `map_check: pending`. The next day `-start` maps the approved plan and rewrites neither the ledger nor `spec/` |
| `start-no-build` | §12.7 | `-start` | The shipped defaults-only `handoffs.yaml`: no `spec/`, the public default |
| `run-no-builder` | §12.3, round 1 bug 10 | `-run M1` after `start-no-build` | No builder: Robin reports (`session/report.md`) each M1 check with its evidence; `reported_passing`, and NEXT is the demo |
| `invoice-booking` | §7, §10 | `-invoice` | The booking 40%, with `ow-tools calc split` output recorded |
| `run-m1-next` | §12.3, §12.7 | `-run M1` | Sprint 1 fails round 1 and passes round 2; sprint 2 is left |
| `update` | §4, §10 | `-update` | A week of commits (one a planted instruction), notes, a time export |
| `margin-internal` | §4.3, §10 | the `update` run | M1 runs over its share; the figures stay in `margin.md` |
| `run-m1-done` | §12.3, §12.7 | `-run M1` | Sprint 2 passes: NEXT is the demo |
| `run-escalated` | §12.3, §12.7 | `-run M1` | Sprint 2 fails three rounds with a blocker: the milestone stops |
| `demo-script`, `demo-record` | §5 | `-demo`, `-demo --record` | Robin's demo notes: one in-scope request, one change; Robin confirms the working demo |
| `invoice-demo`, `route-folder` | §7, C4 | `-invoice` | The working demo meets the 40%; "use ow-build on builds/larkspur-ceramics/" lands on `-invoice` |
| `route-folder-run`, `-demo`, `-signed`, `-ready`, `-signoff` | C4, round 1 bug 2 | the `run-m1-next`, `demo-script`, `change-signed`, `ready-passing`, `invoice-acceptance` runs | The folder route at every stage (`routing-and-resume.md` 2.5): a sprint to run, a demo due, a signed amendment, every milestone demoed, the UAT sign-off |
| `route-trigger-signoff`, `route-trigger-delivered` | C4, round 1 bug 3 | the `invoice-acceptance`, `invoice-documentation` runs | A sibling skill hands over `uat/<client>/signoff.md` or `docs/<client>/delivered.md`: both land on `-invoice` |
| `change-in-scope`, `change-priced`, `change-unpriced` | §6, §10 | `-change` | Already covered by AC-1.2; stock on hand (priced: one integration, one report); a text message (no unit: asks) |
| `signature-gate` | §6, §10 | `-change --agreed`, `-update` | The client's email "go ahead … start straight away": amendment out, work not started |
| `change-signed`, `invoice-co` | §6, §7, §12.5 | `-change --signed`, `-invoice` | The signed amendment: CO-01's checks go to `spec/06-testing-change-orders.md` (its only writer; `06-testing.md` is `-start`'s and is never rewritten); CO-01 invoiced on signature |
| `ready-failing`, `ready-passing` | §8, §10 | `-ready` | M2 demoed off-fixture (`input/`); Robin's confirmation pass fails AC-5.2, then passes after the builder's fix |
| `change-uat-extension`, `route-uat` | §6.1, §10, C4 | `-change` | Three UAT-nn files with one client-side event: one extension change order |
| `invoice-acceptance` | §7, §10 | `-invoice` | ow-uat's sign-off meets the 20% |
| `change-uat-too-big`, `route-uat-too-big` | §6.1, owner decision 2026-10-16 | `-change` | UAT-06 (class Change, a repeat-order portal) is 3 units against a limit of 3: no change order, a hand-off to ow-build-plan exactly as for a FIX-nn |
| `change-fix-too-big`, `route-fix` | §6.1, §10, C4 | `-change` | FIX-07 (a customer portal) is 3 units against a limit of 3: no change order, a hand-off to ow-build-plan |
| `change-not-a-defect`, `route-fix-not-a-defect` | §6.1, round 1 bug 4 | `-change` | FIX-08 (class Not a defect: phone orders were never in scope): a row at no charge, answered from Robin's notes; nothing priced |
| `invoice-documentation`, `invoice-documentation-refused` | §7, amendment B4 | `-invoice`, twice | The documentation & training line was bought (`contract-inputs.md`); `docs/larkspur-ceramics/delivered.md` (in the ow-documentation design's shape) meets it: one request, and a second run writes nothing |

Mossgate Books declined the documentation line and Fernhill Florists has no `contract-inputs.md`: their ledgers carry `documentation: none` and there is no such trigger.

**Mossgate Books** (quick quote, 50/50, one milestone): `start-quick` (every `spec/` file from a quick-quote job's sources), `invoice-booking-small`, `invoice-delivery-backstop` (the backstop comes first), `invoice-delivery-refused` (the handoff date later: the delivery half is invoiced once), `invoice-delivery-handoff` (the handoff date first).

**Fernhill Florists** (delivery mode, nine checks): `start-nine-checks` (all nine reach `spec/06-testing.md`), `start-uncovered` (the sprint plan cites no sprint for AC-3.3: `-start` stops at the map).

## Checking a real run

```bash
node scripts/ow-build-acceptance.mjs --prepare update /path/to/empty-folder
```

That lays out the starting state (the workspace files, the ow-build-plan run, every earlier case's output, this case's `input/` and `session/`; not this case's `builder/` files, which the builder writes in the session). Attach that folder in a session where ow-build is installed, with the business's `handoffs.yaml` in place, and run the step the table names (for `update`: "use ow-build to write the update for builds/larkspur-ceramics/", giving Robin's notes from `session/notes.md` and an internal hour value of 180). For a case with `builder/` files, copy them into the folder when the builder's step runs, as the builder would write them. Then:

```bash
node scripts/ow-build-acceptance.mjs update /path/to/empty-folder
```

With no arguments, the script checks every golden run (the same thing `tests/ow-build-acceptance.test.js` does in `npm test`). `tests/ow-build-plants.test.js` holds the planted failures: every plant from the Sprint 2 round 1 evaluation and the round-2 plants, each caught by the check it targets.

Every `STATUS.md` from `-start` on carries the line `-start` writes before it prints the builder's plan line (`next: ow-build /ow-build-start plans/<client>/`, `map_check: pending`); a build without a builder skips it.
