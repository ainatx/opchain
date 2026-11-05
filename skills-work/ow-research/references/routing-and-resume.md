# Routing and resume (`/ow-research`, `/ow-research on <path>`)

These two verbs read the CRM's `research_findings` documents for the deal or account where it is reachable, and the cache's folder names, file headers and ledger markers, never a page or a client file. Neither writes anything. Neither sends any request.

## 1. `/ow-research`: the list screen

1. List every topic folder `research/<ws>/RS-nn-<slug>/` and every framework folder `research/frameworks/<id>/<date>/`.
2. Give each topic its state, from its files, first match wins:

| Files | State | Next step |
|---|---|---|
| `question.md` with `confirmed: no` (an earlier version's draft) | `question (not confirmed)` | `-question` |
| `question.md`, no `queries.md` | `question confirmed, not run` | `-run` |
| a `marker: plan` with no `marker: plan approved` after it | `queries await approval` | `-run` |
| the newest run ends with `marker: stopped` | `needs fixing (<check>)` | `-run` (it resumes at the step that stopped) |
| the newest run has no `marker: status` | `cut off after <the newest step it logged>` | `-run` (it resumes) |
| `marker: status`, and the run logged `no requests: …` | `answered from your files only` | what the question serves |
| `marker: status` | `answered` | what the question serves |

   A framework folder with `manifest.yaml` is `unpinned — fetched, not a pack`; one with files and no manifest is `files saved, no manifest yet` (next: `-framework <id>`).
3. Show one table per workstream, oldest step first: `topic · state · last step · age`, where *last step* is the newest date in the topic's files and *age* is `<n> days ago (not machine-checked)`, counted from today's date. Then the framework table: `framework · date · state`. End with: `To frame a new question, say "use ow-research-question <workstream>" (a client's slug, or business).`
4. **No topics and no framework folders:** say exactly `No research topics yet in opchain-work/research/.` and offer `-question` in the same words as step 3.

## 2. `/ow-research on <path>`: the step a folder needs

Read the folder's headers and ledger markers, say which verb you are running and why, open its phase file and run it.

### `research/<ws>/RS-nn-<slug>/`

By the state in section 1:

- `question (not confirmed)`: `-question` for this topic.
- `question confirmed, not run`, `queries await approval`, `cut off after …` or `needs fixing (…)`: `-run` on this folder (`references/phase-run.md`; it resumes by section 3).
- `answered` or `answered from your files only`: nothing runs. Say exactly `Already answered on <date> (research/<ws>/RS-nn-<slug>/findings.md); nothing was run.` and offer a re-run: `To look again, say "use ow-research-run on research/<ws>/RS-nn-<slug>/".`
- No `question.md` in the folder: `Nothing to run: research/<ws>/RS-nn-<slug>/ has no question.md.` and offer `-question`.

### `research/frameworks/<id>/<date>/`

- With `manifest.yaml`: say exactly `<id> <date>: unpinned — fetched, not a pack (research/frameworks/<id>/<date>/manifest.yaml); nothing was run.` It never says which revision applies.
- With files and no manifest: `-framework <id>` for that date.

### Anything else

A file that belongs to another skill: name the skill that takes it. Otherwise say exactly `This is not a research topic or framework folder; nothing was run.` and then `It takes research/<workstream>/RS-nn-<slug>/ or research/frameworks/<id>/<date>/.`

## 3. Per-step resume (`-run`)

The findings resume from the CRM's latest `research_findings` document. The requests resume from the query log, which lives only in the cache. A run's steps, in order, each closed by a ledger line (`references/research-files-schema.md` §2):

1. **plan**: `marker: plan`
2. **approval**: `marker: plan approved` (or, with nothing to send, `marker: no requests: …`)
3. **requests**: each `search` and `open` line with its outcome, closed by `marker: requests done`
4. **sources**: `sources.md` added to, closed by `marker: sources`
5. **findings**: `findings.md` written, closed by `marker: findings`
6. **checks**: the checklist, closed by `marker: checks`
7. **status**: the status line, closed by `marker: status`

Read the newest run (`R-n`) and start at the **first step whose closing line is missing**; write `marker: resumed at <step>` with the same `R-n` first. One rule for requests: **send the approved requests not yet logged; never re-send a logged one; reopen a page only to record its source.** In detail:

- **Send what was approved and not yet sent,** logged first as usual, within the cap. An approval in the ledger stands; a plan with no approval line has not been answered, so show it again.
- **Never re-send a logged request.** A request line with no outcome gets `outcome <id> | failed: no outcome recorded (run cut off)` and is not sent again.
- **Reopen only to record a source.** A page whose outcome is `opened` but which has no `S-nn` yet may be requested once more, logged as `reopen P-nn` (`via: reopen P-mm`), checked again by the URL rule. A reopen does not count against the cap.
- **The trail only grows.** `queries.md` and `sources.md` keep every earlier line.
- **A stopped run resumes where it stopped,** once the problem `marker: stopped` names is cleared.
- **A finished run is not resumed.** After `marker: status`, a new `-run` is a re-run: it starts `R-<n+1>` and keeps the id rules (`references/research-files-schema.md` §7).
