# ow-build-plan acceptance fixtures

Everything here is **invented**: fictional clients (Larkspur Ceramics, Mossgate Books, Calder Joinery, Fernhill Florists, Kestrel Bindery), a fictional consultant ("Robin" of "Example Studio"), a made-up price book and synthetic artefacts, workshops and access results. No real client material and no real price belongs in this folder.

These are the acceptance tests from `docs/plans/2026-10-06-ow-build-plan-design.md` §9.2, written so they can be checked mechanically. ow-build-plan is a text-only skill, so a model has to run it; the checker (`scripts/ow-build-plan-acceptance.mjs`) reads what the run wrote and tests it against an answer key, the price book and `offers.md`. "Real use" (one real Build Plan end to end) is not here: it is graded in Sprint 6.

## One story, several cases

Larkspur Ceramics continues ow-start's `larkspur-prospect` golden run (recap path: Build Plan, 2 systems). Each case starts from the run of its `base:` case, so the chain is one engagement:

| Case | §9.2 test | Run | What is planted |
|---|---|---|---|
| `offer` | Build Plan offer | `-offer`, reached by ow-start's NEXT "use ow-build-plan on intake/larkspur-ceramics/intake-record.md" | Tier from the recap's `path_systems`; fee, weeks, credit and validity from the price book |
| `route-build-plan` | (eval round 1, bug 1) | the `offer` run | The inbound NEXT routes a `build-plan` recap to the offer, and nothing else |
| `route-defined-work` | (eval round 1, bug 1) | the `quick-quote` run | The same NEXT routes a `defined-work` recap to the quick quote |
| `tier2-plan` | Synthetic client, tier 2 | `-start`, `-collect`, `-map`, `-scope` | Three artefacts in `inbox/`, one workshop transcript, a fake read-only schema (`input/session/`); an instruction planted in the client's procedure document |
| `unpriced-package` | Unpriced package | `-quote`, `-export` | WP-4 (a one-off code clean-up) matches no price-book unit and is priced by the user, recorded |
| `modifier-evidence` | Modifiers cite evidence | the `unpriced-package` run | `data-messy` cites the workshop row E-07 |
| `dates-terms-above` | Dates and terms | the `unpriced-package` run | Fixed price above `size_threshold`: 40/40/20, the credit deadline from plan delivery |
| `credentials` | Credentials | the `unpriced-package` run | The read-only key in `tier2-plan/input/session/README.md` must appear in no file; the access is logged |
| `builder-neutral` | Builder-neutral | the `unpriced-package` run | The assembled `build-plan.md` names no price, unit, business or skill wording (the client's own reshipping cost is a fact, not a price) |
| `uat-documentation` | UAT and documentation lines | the `unpriced-package` run | A TOOL-M build: UAT · M with 3 tester roles on an M that includes 2; Documentation & training · M declinable; the extension rate only inside the markers, checked with the ow-tools preflight |
| `accepted-signed` | Accepted and signed | `--accepted`, `--signed` | Defaults-only `handoffs.yaml`, so both NEXT blocks print the public defaults |
| `signed-before-accepted` | Accepted and signed | `--signed` on a sent quote | No `expected/`: the refusal writes nothing |
| `fix-window` | Fix window | the `accepted-signed` run | `fix_window_days: 30` in `offers.md` → "30 days of fixes" in the quote and contract inputs |
| `private-names-default` | No private names | the `accepted-signed` run | Every file the chain wrote, with the shipped `handoffs.yaml` |
| `private-names-business` | No private names | `--accepted` | A business's own `handoffs.yaml` (in `input/`) whose contract line names a private skill: that line, printed exactly, is the only place it may appear |
| `follow-on-offer` | Follow-on intake | "use ow-build-plan on handoffs/larkspur-ceramics/fixes/FIX-03.md" → `-offer` | FIX-03 (in `input/`) becomes the intake for an offer in `plans/larkspur-ceramics-2/`, beside the signed first plan |
| `follow-on-fix` | Follow-on intake | `-start` after `follow-on-offer` | `-start` reuses the offer's folder; the earlier plan is read, never written |
| `follow-on-stated-offer` | Follow-on intake | `-offer` from the user's words (no FIX file) | The request is written to `plans/larkspur-ceramics-2/request.md`, the offer's subject |
| `follow-on-stated-start` | Follow-on intake | `-start` after `follow-on-stated-offer` | `-start` reuses that folder and reads `request.md`; it does not ask again |
| `route-next-stage` | (eval round 2, item 2) | "use ow-build-plan on intake/fernhill-florists/intake-record.md" → `-start` | Fernhill Florists: a delivery-mode recap (`next-stage`, work already signed) starts the plan, never an offer; `fee: none` |
| `delivery-quote` | (eval round 4, follow-up 7) | `-quote` on Fernhill's plan (its evidence and scope files, abridged, in `input/`) | A plan on signed work (`fee: none`): the quote has no Build Plan fee or credit line, its header leaves `build_plan_fee` and `credit_deadline` out, and STATUS awaits only the client's answer |
| `route-fix-covered` | (eval round 3, bug 8) | "use ow-build-plan on handoffs/larkspur-ceramics/fixes/FIX-04.md" | FIX-04 (in `input/`) is `classification: fix`, a covered Fix: free under the fix window, so the route says so and writes nothing; no paid follow-on is offered |
| `route-folder-signed` | (eval round 3, item 3) | "use ow-build-plan on plans/larkspur-ceramics/" after signing | `build-request.md` exists: the route prints the signed NEXT and stops; no file is written, `-start` is never run again |
| `route-feasibility` | (owner decisions 2026-10-15, 2026-10-16) | "use ow-build-plan on intake/kestrel-bindery/intake-record.md" → `-quote --quick` | Kestrel Bindery: a feasibility recap is a quick quote priced as the unit marked `feasibility: true`, carrying just the test: no UAT line, fix window, training line or build hand-off |
| `feasibility-signed` | (owner decision 2026-10-16) | `--accepted`, then `--signed`, on the feasibility quote | `contract-inputs.md` holds just the test; `--signed` writes no `build-request.md`, and STATUS points at a Build Plan offer for a go |
| `route-folder` | (eval round 2, item 3) | "use ow-build-plan on plans/larkspur-ceramics/" → `--accepted` | After the export the folder route records the acceptance; the sent quote is never written again |
| `follow-on-asks` | Follow-on intake | `-start` | No FIX file: the request is asked for and recorded in the user's words |
| `quick-quote` | Quick quote | `-quote --quick` | Mossgate Books: a two-unit job from notes; the notes name the tester (Priya), the scope must list the role only |
| `dates-terms-below` | Dates and terms | the `quick-quote` run | Below `size_threshold`: 50/50 and the delivery sentence; no Build Plan credit |
| `quick-over-limit` | Quick quote | `-quote --quick` | Calder Joinery: four units against a limit of three; no quote, a STATUS line pointing at the offer |

Each case has `answer-key.yaml`; a case that owns a run also has `input/` (the `opchain-work/` files it adds to its starting state) and `expected/` (the hand-written golden output). A case with `run:` grades another case's run. `workspace/opchain-work/` holds the shared invented `profile.md` and `price-book.yaml` (whose `build_plan_schedule` sets the collection and delivery deadlines); `offers.md` and `handoffs.yaml` come from the skill's own `examples/`.

## Checking a real run

```bash
node scripts/ow-build-plan-acceptance.mjs --prepare unpriced-package /path/to/empty-folder
```

That lays out the starting state (the workspace files, ow-start's run, every earlier case's output and this case's input; `session/` holds what the user does in the session, such as the read-only key). Then, in a session where ow-build-plan is installed and that folder is attached, run the step the table names (for `unpriced-package`: "use ow-build-plan to quote plans/larkspur-ceramics/", then export). When the quote stops on WP-4, price it yourself as 1900.00 with a reason; say the client has six people to train and three tester roles. Then:

```bash
node scripts/ow-build-plan-acceptance.mjs unpriced-package /path/to/empty-folder
```

With no arguments, the script checks every golden run (the same thing `tests/ow-build-plan-acceptance.test.js` does in `npm test`).
