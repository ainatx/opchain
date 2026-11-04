# Phase: map (`/ow-build-plan-map`)

Keep to `references/ow-protocol.md`. Read first from the CRM: the recap (document `recap`), the evidence (document `evidence`) and `systems`; the files below are the cache, used only when the CRM is unreachable, and the output says so. Publish the map as document `process_map` (internal) and new systems to `systems`. Read `plan.yaml`, `evidence.md`, every `systems/<system>.md`, and the intake (`plan.yaml` `intake`). With no `evidence.md`, say the collection has not run and that a map with no evidence would be all LOW; go ahead on the intake alone if the user wants that.

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

Each starts with `written_by: ow-build-plan 2.0.0` and `created`.

| File | Contents |
|---|---|
| `map/current.md` | How the work runs today, step by step, with volumes, times and where it breaks (the cost of a miss in the client's own numbers) |
| `map/future.md` | The process after the change: which steps go, which get faster, which decisions it removes or speeds up |
| `map/roles.md` | Who does what today and after, by role (names only if the user wants them; these files stay working files) |
| `map/systems.md` | Each system: its role, what it holds, how it connects, who owns it |
| `map/data.md` | The data each step needs: where it lives, its condition (clean / messy / sensitive), with the evidence |

Process steps are numbered lists (`1.`, `2.`) of fact lines, so the plan can show them as a process map in text; an image is optional and always has alt text.

## 3. Before you move on, check

Evidence trace: every HIGH or MEDIUM fact line cites an `E-nn` that exists in `evidence.md`. Fix what fails.

## 4. STATUS and what comes next

In the cache, a plain `STATUS.md` line is enough: `<date> | ow-build-plan 2.0.0 | plans/<client>/map/current.md | nothing awaited`. Next: `/ow-build-plan-scope`.
