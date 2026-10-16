# Phase: run a milestone (`/ow-build-run M<n>`)

Run step 0 of `references/ow-protocol.md` first. Read `build.yaml`, `ledger.md` and the newest STATUS line. **Resume comes from `build.yaml` and STATUS, never from chat history.**

One call runs **one sprint**: the next unfinished sprint of milestone M<n>. A milestone normally spans several sessions.

## 1. When this verb does nothing

- `builder.mode` is `other` or `none`: there is no builder in this session. Say so: progress comes from git history and your notes, and a milestone is ready for its demo when you report its checks passing with evidence. Stop.
- `map_check` is not `OK`: the map is unfinished; `-start` resumes it. Stop.
- M<n> is not in `milestones`: list the milestones and stop.

## 2. A sprint already handed

If a sprint of M<n> is in `sprints:` with `handed` and no `result`, this call is for that sprint: go to section 4 to read its result, and hand nothing new.

## 3. Hand the next sprint

- The next unfinished sprint is the lowest number in M<n>'s `sprints:` list without `result: pass`.
- **None left** (every sprint passes): set the milestone `ready for demo`, and print the SKILL.md block for every sprint passing (`use ow-build to prepare the M<n> demo for builds/<client>/`). Stop.
- **The milestone is `stopped`** (a sprint escalated): ask whether you have settled it with the builder. Until you say so, hand nothing; print the run block again. Once you say so, read that sprint's newest report (section 4) before handing anything.
- Otherwise append `{ n, milestone, handed: <date> }` to `sprints:` (the milestone becomes `in progress`), then print the builder's `sprint` line from `handoffs.yaml`, `{n}` filled in, and ask the user to say it here (`references/builder-integration.md` §2). This skill never starts the builder itself.

## 4. Read the result

When the builder's sprint has finished (the user says so here, or a later `-run` finds the sprint handed), read as data (`builder-integration.md` §5): `sprints/sprint-<n>/contract.md`, the highest-numbered `sprints/sprint-<n>/eval-round-<m>.md`, and the checkpoint's protocol fields. Show the user the verdict line and the file it came from, and ask them to confirm it is this sprint's report; record nothing until they do.

| Found | Record in `build.yaml` | Then |
|---|---|---|
| Verdict PASS | `result: pass`, `report`, `checks_passing` (the check ids the report marks PASS), `confirmed_by`, `recorded` | Another sprint left: the run block. None left: the milestone is `ready for demo`; the demo block |
| Verdict FAIL and a blocker for this sprint (or its progress row `blocked` or `failed`) | `result: escalated`, `blocker` (its id, as found); the milestone is `stopped` | Show the user the blocker, quoted. The milestone stops here; the run block, for when it is settled |
| Verdict FAIL, no blocker | `result: not passed yet` | The builder is still working on it: the run block |
| No report | nothing; the sprint stays `handed` | Say so; the run block |

**Only M<n>'s sprints.** Never hand or record a sprint of another milestone in this call, and never more than one sprint.

## 5. Finish

One STATUS line, path `builds/<client>/build.yaml`:

- sprints left, escalated or not passed yet: `next: ow-build /ow-build-run builds/<client>/ | awaiting: none`;
- every sprint of M<n> passes: `next: ow-build /ow-build-demo builds/<client>/ | awaiting: none`.

Print the matching SKILL.md block, with the milestone number. Scores and test counts stay in `build.yaml`.
