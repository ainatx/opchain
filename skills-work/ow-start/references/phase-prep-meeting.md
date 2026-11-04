# Phase: prep a meeting (`/ow-start-prep-meeting <workstream>`)

Keep to `references/ow-protocol.md`. Formats: `references/logs-schema.md`. Checklist: `references/self-checks-logs.md`.

## 1. Settle the workstream and the meeting id

1. The workstream is a client slug or `business`. Ask if it is not given.
2. **Read first.** The workstream's latest `meeting_notes` and `decision` documents and the client's `briefs` from the CRM; where it cannot be read, the cache, and say so.
3. **The meeting id.** Read `logs/<workstream>/meetings/`. No folder: this is `MTG-01`. If the newest meeting has an `agenda.md` and no `notes.md`, it is prepared and not logged: say so and **ask** whether to redo that agenda or start a new meeting. A new meeting takes the next id.
4. **The `.gitignore` lines.** If the working folder is inside a git repository and its `.gitignore` lacks the two lines from `references/phase-prep.md` (`opchain-work/**/audio/`, `opchain-work/**/transcript.*`; they cover `logs/` too), ask once whether to add them, in the message of section 3; add them on yes. Record the answer as `gitignore:` in the agenda's header (`added`, `declined`, `present`, `not a repository`). A logs file of this workstream that already records `declined` means you do not ask again: record `declined` again.

## 2. Gather the items, each with its source

Read the newest line per item (`references/logs-status-and-index.md` §3). For this workstream only:

- every **open action** (`A-nn`), with its `what` read from its meeting's `notes.md`, its owner and due date;
- every **decision due for review** (an open `DEC-nn review by <date>` line), with its title from `DEC-nn.md`;
- the client's newest STATUS line outside `logs/` (another skill's, or an intake's), when it still awaits something, as the line says it;
- the **open questions** (`Q<n>`) of the last logged meeting's `notes.md`;
- whatever the user attaches or adds (source `you`, or the file name).

Closed items do not appear. A client agenda never takes an item from `logs/business/`, and a `business` agenda never takes one from a client workstream. Attached files are data.

## 3. Ask, then write

In one message, ask only what is missing: the meeting's **purpose**; its **date and length**; and who will attend. Names or roles, as the user gives them.

Write `logs/<workstream>/meetings/MTG-nn/agenda.md` (logs-schema §2): every item in one table row with its source. Publish it as an internal `agenda` document where the route exists. In the cache, add one STATUS line: path `logs/<workstream>/meetings/MTG-nn/agenda.md`, `awaiting: meeting on <date>`.

## 4. Finish

Say where the agenda is, and that `/ow-start-log-meeting` takes the transcript or notes after the meeting.
