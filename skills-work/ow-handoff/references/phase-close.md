# Phase: `/ow-handoff-close` (and `--reopened`)

Closes the workstream when nothing blocks (`close-format.md`).

**Read first:** the latest saved `systems`, `support_requests`, `milestones`, `invoices` and the offer's `quotes` record (cache: `dates.yaml`, `access.md`, `accounts.md`, `fixes/`). The paths below are the scratch cache.

## 1. Entry

- No `handoff.yaml` `frozen:`: `Refused: the handoff is not started.`
- A waiver asked for here: `Refused: a waiver at close covers only the items the owning verbs record.`
- `close.md` exists and a covered FIX-nn reopened the workstream: the run is `--reopened`.

## 2. Steps

### `/ow-handoff-close`

1. **`blockers`**: check every blocker in `close-format.md` §1, with today's date from a tool call. Any holds: `Refused: close is blocked.`, one line per blocker, `Nothing was written.`, and the verb that owns the first. While blocked, say what each is waiting on (FIX-03, covered, before close; transfer TR-01 to the client).
2. **`email`**: `export/close-email.{html,txt}`.
3. **`care-start`**: when the choice is care, `care-start.md` (`close-format.md` §4). Record whether ow-care is installed, as the user says (ask only when no file records it). No care: nothing is written at this step.
4. **`close`**: `close.md`, last, with its branch.

### `/ow-handoff-close --reopened`

1. **`blockers`**: as above.
2. **`email`**: `export/close-email-<date>.{html,txt}`.
3. **`care-start-addendum`**: `care-start-addendum-<date>.md`, when care was chosen.
4. **`close-addendum`**: `close-addendum-<date>.md`, last. The first close's `close.md` and `care-start.md` stay as the record of that close.

## 3. Then

Say the date and the branch. Care with ow-care installed: run `/ow-care-start` on `handoffs/<client>/care-start.md`. Care without ow-care: the kept items stay with the user; say so and give the review date, and promise nothing. Hourly, none or undecided: closed, nothing next.
