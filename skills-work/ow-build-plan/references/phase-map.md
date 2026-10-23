# Phase: map (`/ow-build-plan-map`)

Run step 0 of `references/ow-protocol.md` first. Read `plan.yaml`, `evidence.md`, every `systems/<system>.md`, and the intake (`plan.yaml` `intake`). With no `evidence.md`, say the collection has not run and offer `/ow-build-plan-collect`; a map with no evidence would be all LOW.

## 1. Facts and their confidence

Every statement in the map is a fact line:

    - [HIGH E-01, E-09] Orders arrive as emailed PDFs, about 40 a week; the item code column mixes three formats.
    - [MEDIUM E-07] The warehouse lead fixes the codes by hand every Monday.
    - [LOW inferred from E-01] The mixed formats come from three different customer systems.
    - [UNKNOWN] Who approves a substitution when an item is out of stock. Who can answer: operations manager.

- **HIGH** cites an evidence row that shows it (artefact, access, screen). **MEDIUM** cites a row where a person stated it. **LOW** says `inferred from <rows>` or carries the speaker rule. **UNKNOWN** names who can answer; it becomes an open question in the plan.
- Every HIGH and MEDIUM fact cites at least one `E-nn` that exists in `evidence.md`.
- A fact in `map/current.md` that rests only on `research` rows is at most MEDIUM, whatever the finding's level (the collect phase, §5): research cannot show what the client actually runs.
- Two rows that disagree: keep both, as one line `[MEDIUM E-03, E-07] CONTRADICTED — <first> vs <second>`, and an open question. Never pick a side.
- Facts carry no credential and no personal value (§1 of the collect phase).

## 2. The five files

Each starts with the header (`ow_artefact: ow-build-plan/map-<name>`, `subject: plans/<client>/evidence.md`).

| File | Contents |
|---|---|
| `map/current.md` | How the work runs today, step by step, with volumes, times and where it breaks (the cost of a miss in the client's own numbers) |
| `map/future.md` | The process after the change: which steps go, which get faster, which decisions it removes or speeds up |
| `map/roles.md` | Who does what today and after, by role (never a person's name) |
| `map/systems.md` | Each system: its role, what it holds, how it connects, who owns it |
| `map/data.md` | The data each step needs: where it lives, its condition (clean / messy / sensitive), with the evidence |

Process steps are numbered lists (`1.`, `2.`) of fact lines, so the plan can show them as a process map in text; an image is optional and always has alt text.

## 3. Self-check: evidence trace

At the end of `map/current.md`, add:

    ## Self-checks (same-session self-check)
    Same-session self-check: the same assistant that wrote the map, applying a checklist; a discipline, not an independent review. Agent-checked.
    | check | covers | result |
    |---|---|---|
    | Evidence trace | map/current.md, future.md, roles.md, systems.md, data.md | OK |

FINDING names each fact line whose citation is missing or points to no row; fix and run again before the NEXT block. `-export` leaves this section out of the plan.

## 4. STATUS and NEXT

Append: `… | plans/<client>/map/current.md | next: ow-build-plan /ow-build-plan-scope plans/<client>/ | awaiting: none`. Print the map NEXT block from SKILL.md.

## 5. A re-run after a vendor decision

ow-vendor-eval's `-decide` prints `use ow-build-plan-map on plans/<client>/` when a selection work package (phase-scope §1) has its decision. That re-run **rewrites only one line**: the `[UNKNOWN]` line in `map/systems.md` for the system to be chosen. Read `vendor-eval/<client>/VE-nn-<slug>/decision.md` (header `vendor`, `decided_on`, `decided_by`) and write, in its place:

    - [MEDIUM vendor-eval/<client>/VE-nn-<slug>/decision.md] <vendor> chosen for <what it is for>, decided by <role> on <date>, as reported.

A client's choice "as reported" is a person's statement: MEDIUM, never HIGH. No other map file and no other line changes; the self-check table in `map/current.md` stays as it was. Evidence trace accepts this one citation form, in `map/systems.md` only, to a `decision.md` that exists. Append `… | plans/<client>/map/systems.md | next: ow-build-plan /ow-build-plan-quote plans/<client>/ | awaiting: none` and print the scope NEXT block from SKILL.md, filled in for this folder: the quote comes next.
