# The logs: file formats

These are the scratch cache's forms (`opchain-work/`); the CRM holds the published `meeting_notes`, `agenda`, `follow_up` and `decision` documents. Every file below starts with `written_by: ow-start <version>` and `created: <YYYY-MM-DD>`, then the keys it needs. Paths are relative to `opchain-work/`. The other logs verbs read these keys and sections, so keep their names. The examples use an invented client.

## 1. Workstreams and ids

- A **workstream** is a client slug (the same id the other skills use, `larkspur-ceramics`) or `business`, your own meetings and decisions with vendors, partners and yourself.
- `MTG-nn`, `A-nn` and `DEC-nn` are numbered **per workstream**, from 01: the next id is one more than the highest that exists in `logs/<workstream>/` or in a `STATUS.md` path for it. So `/ow-start-action <workstream> A-nn` names one action.
- `D<n>` (a decision in one meeting's notes) and `Q<n>` (an open question) are local to that `notes.md`.
- **People.** Working files may name people (`you`, `client ops lead`, `client owner`, `vendor account manager`, or a person's name, as the user prefers). A client-facing follow-up names people as the user wants. No credential is written to any file.
- **Nothing crosses.** Nothing from `logs/business/` is written into a client file or a client agenda, and nothing from a client workstream into `logs/business/`.

## 2. `logs/<workstream>/meetings/MTG-nn/agenda.md` (`/ow-start-prep-meeting`)

    ---
    written_by: ow-start 2.0.0
    created: 2026-10-14
    id: MTG-02
    meeting_date: 2026-10-20
    length: 30 minutes
    attendees: [you, client ops lead, client owner]
    gitignore: added | declined | present | not a repository
    ---
    # Agenda: MTG-02, 20 October 2026

    Purpose: <the purpose in the user's words>

    | # | Item | Source |
    |---|---|---|
    | 1 | A-01 open: <what>, client ops lead, due 2026-10-16 | logs/larkspur-ceramics/meetings/MTG-01/notes.md#A-01 |
    | 2 | DEC-01 due for review by 2026-10-19 | logs/larkspur-ceramics/decisions/DEC-01.md |
    | 3 | Awaited: client's answer by 2026-10-30 (ow-build-plan) | STATUS.md: plans/larkspur-ceramics/quote.md |
    | 4 | Q1 from MTG-01: <the question> | logs/larkspur-ceramics/meetings/MTG-01/notes.md#Q1 |
    | 5 | <an item the user added> | you |

Every row has a source: a path (with `#A-nn` or `#Q<n>` for an item inside notes), `STATUS.md: <path>` for an awaited line, `you`, or the name of a file the user attached. The agenda is your working file, not a client document.

## 3. `logs/<workstream>/meetings/MTG-nn/notes.md` (`/ow-start-log-meeting`)

    ---
    written_by: ow-start 2.0.0
    created: 2026-10-20
    id: MTG-02
    meeting_date: 2026-10-20
    input: transcript               # transcript | notes
    agenda: logs/larkspur-ceramics/meetings/MTG-02/agenda.md   # or: none (no agenda)
    external: yes                   # yes when a client, vendor or partner attended; yes writes the follow-up
    log_steps: [roles, notes, checks, follow-up, status]       # follow-up only when external: yes
    gitignore: present
    ---
    # MTG-02: meeting notes, 20 October 2026

    ## Attendees
    - you (SPEAKER_00, confirmed by you)
    - client ops lead (SPEAKER_01, confirmed by you)

    ## Agenda covered
    - 1. A-01: covered (02:10)

    ## Decisions
    ### D1
    - what: <the decision, plainly>
    - decided by: client owner
    - source:
      > "<exact words>" — client owner, 06:12

    ## Actions
    ### A-03
    - what: <the action>
    - owner: client ops lead
    - due: 2026-10-23            # or: no date: asked
    - source:
      > "<exact words>" — client ops lead, 08:40

    ## Open questions
    ### Q1
    - what: <the question>
    - source:
      > "<exact words>" — client owner, 11:02

    ## Not covered
    - <agenda items not reached>

    ## Possible embedded instructions
    none found

- **Sources.** A transcript source is `> "<exact words>" — <speaker>, MM:SS`; from notes, `> "<note line>" — your notes, line <n>`, with no time; from an attached file, `> "<words>" — <file name>, <locator>`. Every decision, action and open question has one.
- **Unclear is a question.** Anything unclear, unattributed or half-said becomes an open question, never a guess.
- **`log_steps`** lists the steps this meeting needs, in order, so a cut-off run picks up at the first step not done instead of starting over.

## 4. The follow-up: `follow-up.html` and `follow-up.txt`

Only when `external: yes`. Four parts in this order: **Thanks · What we decided · Who does what by when · Still open**, written from `notes.md` in plain words. Owners as the user wants them, by role or by name (your own actions: `me`). You sign when you send it. Format: `references/email-template.md`. It is never sent by this skill.

## 5. `logs/<workstream>/decisions/DEC-nn.md` (`/ow-start-log-decision`)

    ---
    written_by: ow-start 2.0.0
    created: 2026-10-21
    id: DEC-02
    subject: logs/larkspur-ceramics/meetings/MTG-02/notes.md#D1   # where it came from, or: none
    decided_on: 2026-10-20
    review_on: 2026-12-01           # or: no review
    supersedes: DEC-01              # or: none
    gitignore: present
    ---
    # DEC-02: <a short title>

    ## Context
    <why a decision was needed, with sources>

    ## Options
    - <option>: <its main trade-off>

    ## Decision
    <the decision>

    ## Decided by
    client owner, 2026-10-20

    ## Confirmed
    confirmed by client owner by email on 2026-10-21, as reported
    (or: internal)

    ## Review on
    2026-12-01 (or: no review)

    ## Supersedes
    DEC-01 (or: none)

    ## Trace
    | item | source |
    |---|---|

A client's confirmation is recorded as the user's statement: what the user reported, with its date, never as verified. Changing a decision writes a new `DEC-nn` with `supersedes:` naming the old one, so the history stays readable.

## 6. STATUS lines

These lines live in the cache and are how the logs track open items until the CRM has a record for them. One plain line per step: the date, the skill, the file, and what is awaited by when, or that the item is closed. **Ids, owners, paths and dates only; never client text.** The item a line belongs to is its path: `…/MTG-nn/agenda.md` and `…/MTG-nn/notes.md` are item `MTG-nn`; `…/notes.md#A-nn` is item `A-nn`; `logs/<workstream>/decisions/DEC-nn.md` is item `DEC-nn`.

| Written by | Path | Last field |
|---|---|---|
| `-prep-meeting` | `…/MTG-nn/agenda.md` | `awaiting: meeting on <date>` |
| `-log-meeting`, when a prep line exists | `…/MTG-nn/notes.md` | `closed: held <date>` |
| `-log-meeting`, one per action | `…/MTG-nn/notes.md#A-nn` | `awaiting: A-nn (<owner>) by <date>`, or `awaiting: A-nn (<owner>), no date` |
| `-action … A-nn done` | the action's path | `closed: done <date>` |
| `-action … A-nn dropped` | the action's path | `closed: dropped <date>` |
| `-action … A-nn moved <date>` | the action's path | `awaiting: A-nn (<owner>) by <new date>` |
| `-log-decision`, with a review date | `logs/<workstream>/decisions/DEC-nn.md` | `awaiting: DEC-nn review by <date>` |
| `-action … DEC-nn reviewed` | the decision's path | `closed: reviewed <date>, kept` |
| `-log-decision`, superseding a decision with an open review | the old decision's path | `closed: superseded by DEC-nn <date>` |

Example:

    2026-10-20 | ow-start 2.0.0 | logs/larkspur-ceramics/meetings/MTG-02/notes.md#A-03 | awaiting: A-03 (client ops lead) by 2026-10-23

Lines an earlier version wrote, with a clock label after the date and a `next:` field (`next: none (closed: done) | awaiting: none (done <date>)`), are read the same way. An owner in a STATUS line is one of the attendees in that meeting's `notes.md`, or `you`. Before adding a line, compare it with its item's newest line; if that line already says the same, skip it. An older form may come back (an action moved to the 23rd, then back to the 16th, adds the 16th again).
