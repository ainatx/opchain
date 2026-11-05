# Phase: `/ow-handoff-package` (and `--revision` after delivery)

Writes `package.yaml`, `handoff-notes.md`, its exports and the cover email (`package-and-dates.md` §1, §2, §5).

**Read first:** the latest saved `systems`, the `operator_notes` document and `acceptance_criteria` (cache: `accounts.md`, `operator-notes.md`, `acceptance-record.md`). The paths below are the scratch cache.

## 1. Entry

- No `handoff.yaml` `frozen:`: `Refused: the handoff is not started.`
- No `accounts.md`: `Refused: accounts.md is missing.` and `/ow-handoff-accounts`. No `operator-notes.md`: `Refused: operator-notes.md is missing.` and `/ow-handoff-notes`.
- **The line bought and no `docs/<client>/delivered.md`**: `Refused: the documents are not delivered yet.`, `Nothing was written.`, and `/ow-documentation-delivered` on `docs/<client>/`; delivered by hand, the date goes in `handoff.yaml` as the user states it. Say when `docs.yaml`'s `planned_delivery` expects them.
- A check that applies here fails (`self-checks.md` §1): `Refused: <check> fails.`, `Nothing was written.`, and the verb that writes the file to fix. **A key or a private name** in `accounts.md` or `operator-notes.md` is never waived: it clears only when that file is written again without it.
- `dates.yaml` exists: the run is `--revision`.

## 2. Steps

### `/ow-handoff-package`

1. **`notes`**: write `handoff-notes.md`, the six sections, and run the Takeover check: a missing test suite, deploy instructions or developer docs is a covered Fix written by `-fix` (`/ow-handoff-fix`), never a made-up command. With the line bought, "Taking it over" cites the handover path `deliveries.yaml` records; `repo: none`: the handover was delivered as documents.
2. **`dates`**: ask the planned send date when no file gives it; record `planned_send`, `planned_end`, `planned_removal` and, for care with no agreed start, `planned_care_start`, each provisional, with `ow-tools calc date` and its output, or `not machine-checked`.
3. **`export`**: `ow-tools export handoffs/<client>/handoff-notes.md --out handoffs/<client>/export/`, the command and output recorded with relative paths. Not installed: `export/handoff-notes.md`, the client copy, and say once that the PDF and Word documents need ow-tools. When `handoff.yaml` `gitignore.answer` is `no`, say that `export/` and `secrets-seen.log` are not git-ignored here.
4. **`email`**: `export/handoff-email.{html,txt}`. When a client output quotes a client's text, the user's dated read-through for secrets goes in `read_through` (`self-checks.md` §2). **Show the user the Handoff notes and the email and wait for their yes before they go out**: this is the verb's one approval. The user sends them.

### `/ow-handoff-package --revision`

1. **`notes`**: rewrite `handoff-notes.md` with the recorded dates from `dates.yaml`.
2. **`export`**: as above.
3. **`revision`**: add one `revisions` entry. The revision moves no date; a wrong delivery date is corrected by `-delivered` (`phase-delivered.md`).

## 3. Then

Say the provisional fix-window end, then, once the user says the notes went out, `/ow-handoff-delivered <date>`.
