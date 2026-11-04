# Phase: log a decision (`/ow-start-log-decision <workstream>`)

Keep to `references/ow-protocol.md`. Format: `references/logs-schema.md` §5. Checklist: `references/self-checks-logs.md`. The `.gitignore` lines as in `references/phase-prep-meeting.md` §1, recorded in the decision's header.

**Read first.** The workstream's latest `meeting_notes` and `decision` documents from the CRM; where it cannot be read, the cache, and say so.

## 1. One decision per file

- **No workstream given**: never guess. If exactly one workstream fits what was asked (one with a prepared, unlogged meeting; one holding that id; one with notes whose decisions are not logged yet), name it and ask the user to confirm it; otherwise list the workstreams that fit and ask which workstream. Write nothing until the user answers.
- **From a meeting** ("log the decisions in …/MTG-nn/notes.md"): read the notes' Decisions and the `subject:` of every `DEC-nn.md` in the workstream. Offer each `D<n>` that has no `DEC-nn` yet (its `subject:` is `logs/<workstream>/meetings/MTG-nn/notes.md#D<n>`), and write **only the ones the user picks**. All logged already, or notes with no decisions: say so in the words of `references/logs-status-and-index.md` §5 and write nothing.
- **With only a workstream**: if a logged meeting of the workstream has decisions with no `DEC-nn` yet, offer them first, as from a meeting; otherwise, or if the user declines them, log one on its own.
- **On its own**: ask for the decision, its context and the options considered, with a source for each (a file, a meeting, or `you`).
- The next id is one more than the highest `DEC-nn` in the workstream.

## 2. Every field

Ask in one message for what is missing: **Context** (why, with sources) · **Options** (each with its main trade-off) · **Decision** · **Decided by** and the date · **Confirmed** (`confirmed by <who> by email on <date>, as reported`: the user's statement, or `internal`) · **Review on** (a date, or `no review`) · **Supersedes** (an earlier `DEC-nn`, or `none`). If it follows another skill's record, link that file by path (`references/logs-status-and-index.md` §4); never copy from it.

## 3. Changing a decision

To change a decision, write a new `DEC-nn` whose `supersedes:` names the old one, so the history stays readable. If the old decision has an open review line, close it (below). A human-edited version in the CRM is never overwritten: write yours beside it and say so.

## 4. Write

Run the checklist, then write `DEC-nn.md`, and publish it as an internal `decision` document where the route exists.

## 5. STATUS (in the cache)

- A review date: path `logs/<workstream>/decisions/DEC-nn.md`, `awaiting: DEC-nn review by <YYYY-MM-DD>`.
- Superseding a decision whose newest line is an open review: one more line for the old decision, `closed: superseded by DEC-nn <YYYY-MM-DD>`.
- No review and nothing superseded: no line.

## 6. Finish

Say what was written. Nothing follows; a review date shows on `/ow-start` and `/ow-status`, and nothing reminds anyone of it.
