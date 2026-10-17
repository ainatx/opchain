# The logs: actions, the log screen, resume and the index

File formats and the STATUS forms: `references/logs-schema.md`. Run step 0 of `references/ow-protocol.md` first; `/ow-start-log`, `/ow-start` and `/ow-status` read no client material, so they skip its handling question.

## 1. `/ow-start-action <workstream> <id> <state>`

States: `A-nn done`, `A-nn dropped`, `A-nn moved <YYYY-MM-DD>`, `DEC-nn reviewed`.

1. Read `STATUS.md` and take the **newest line per item** for the workstream (section 3).
2. **Refuse** when the id has no line in this workstream, or its newest line is already closed (`next: none (closed: …)`), or the state does not fit the id (`DEC-nn done`). Say why, list the open ids of the workstream with their awaiting dates, and write nothing.
3. Otherwise append exactly one line, in the form `references/logs-schema.md` §6 gives for that state. `moved` keeps the owner role from the newest line. Nothing else is written; the notes and the decision file are never edited.
4. Print what was appended and the open items left. No NEXT block.

## 2. `/ow-start-log <workstream>`

One screen. **It writes nothing.**

- **Meetings**: each `MTG-nn` with its date and state (prepared, held, logged), then the other skills' meeting records from the index (section 4).
- **Open actions**: the newest line per `A-nn` that is open, with owner role and due date, soonest first.
- **Decisions**: each `DEC-nn` with `decided_on` and `review_on`, superseded ones marked, then the other skills' decision records from the index.
- **Reviews due**: open `DEC-nn review by <date>` lines.
- Mark an item "reported overdue" only when today's date is known (protocol §6) and is past its date.

`business` has no index rows: the index lists client files only. Nothing from `logs/business/` appears on a client's screen, and nothing from a client's files on `business`.

## 3. Resume: `/ow-start` and `/ow-status`

- **Intakes** keep their 1.0.0 behaviour: for `intake/<slug>/…` lines, the newest line per workstream.
- **Logs**: for `logs/<workstream>/…` lines, the **newest line per item** (`MTG-nn`, `A-nn`, `DEC-nn`; logs-schema §6). An item is open while its newest line is not closed. Closing one action never hides another.
- Show the open logs items under their workstream, next to the open intakes: prepared meetings, open actions (owner role, due), reviews due. Soonest due first.
- A logs line belongs to no other skill's group, and never changes how another skill's lines are grouped.
- Mark an item "reported overdue" only when today's date is known and is past its due date. Write nothing.

## 4. The index (decision L5; owner decision O1)

`/ow-start-log <client>` lists what other skills already recorded for the client, **by path, the date in the file's header (`created`) and the one header key its row names**. It reads only those header keys: never a body line, never another header key, never an amount, and it copies nothing into any file. A skill that is not installed, or has not run, has no rows. A file whose header cannot be read is listed by path with "no date in its header".

| Kind | Producer | Path | Header keys read |
|---|---|---|---|
| Meeting (fit call) and its path | ow-start | `intake/<client>/recap.md` | `created`, `path_label` |
| Meeting (Build Plan workshop) | ow-tools | `plans/<client>/workshops/W<n>/transcript.md` | `created` |
| Meeting (demo) | ow-build | `builds/<client>/demos/M<n>-record.md` | `created`, `demo_date` |
| Meeting (acceptance testing session) | ow-uat | `uat/<client>/runs/RUN-nn.md` | `created`, `session_date` |
| Meeting (monthly care call) | ow-care | `care/<client>/reports/M-nn.md` | `created` |
| Decision (quote accepted) | ow-build-plan | `plans/<client>/contract-inputs.md` | `created`, `accepted` |
| Decision (plan signed) | ow-build-plan | `plans/<client>/build-request.md` | `created`, `signed` |
| Decision (change order signed or declined) | ow-build | `builds/<client>/changes/CO-nn.md` | `created`, `status` |
| Decision (acceptance) | ow-uat | `uat/<client>/signoff.md` | `created`, `acceptance` |
| Decision (what follows the handoff) | ow-handoff | `handoffs/<client>/after-offer.md` | `created`, `choice` |
| Decision (who trains) | ow-documentation | `docs/<client>/docs.yaml` | `created`, `trainer` |
| Decision (care terms changed) | ow-care | `care/<client>/terms-addendum-<date>.md` | `created` |

The decision log never repeats one of these. A `DEC-nn` may link to one by path ("follows `builds/<client>/changes/CO-02.md`").

Screen form, one line per file:

    builds/larkspur-ceramics/changes/CO-01.md · 2026-11-30 · status: signed
