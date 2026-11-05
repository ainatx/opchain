# Phase: `/ow-handoff-notes` (and `--walkthrough <date>`)

Writes `handoffs/<client>/operator-notes.md` (`operator-notes-format.md`): how to run the build without the builder. Re-running it rewrites the notes; it is how a failing check on them clears.

**Read first:** the latest saved `systems`, the `build_plan` document and `acceptance_criteria` (cache: `accounts.md`, `doc_paths`). The paths below are the scratch cache.

## 1. Entry

- No `handoff.yaml` `frozen:`: `Refused: the handoff is not started.` and `/ow-handoff-start`.
- No `accounts.md`: `Refused: accounts.md is missing.`, `Nothing was written.`, and `/ow-handoff-accounts`. Rotate entries must exist before delivery, so the notes wait for the accounts.
- **The line bought** (`handoff.yaml` `documentation_sku: bought`) and no `docs/<client>/delivered.md`: `Refused: the documents are not delivered yet.`, `Nothing was written.`, and `/ow-documentation-delivered` on `docs/<client>/`. One form per state: no floor is written to be replaced.

## 2. Steps

### `/ow-handoff-notes`

1. **`sources`**: read what the form needs. **Floor**: the builder's docs (`doc_paths`), `acceptance-record.md` and each addendum, the alert and run-log setup in the repository, the services the user names ("alerts configured in <service>: <list> | none"), and the user's notes. **Index** (the line bought and delivered): `docs/<client>/runbook.md` (its `ops:` and each `OP-nn` title), `docs.yaml`, `deliveries.yaml`, `delivered.md`.
2. **`entries`**: the operator tasks in the form `operator-notes-format.md` §2 gives.
3. **`rotate`**: one rotate entry per secret in `accounts.md` and in every `secrets-seen.log` read, ids continuing after the highest in use.
4. **`coverage`**: Operator-task coverage, against the runbook when the line was bought; a gap in an included item is a covered Fix (`/ow-handoff-fix`).

### `/ow-handoff-notes --walkthrough <date>`

1. **`record`**: add the walk-through line under `## Walk-through`, as the user reports it.

## 3. Then

Say how many entries there are and which form, then `/ow-handoff-package` (a coverage gap: `/ow-handoff-fix` first).
