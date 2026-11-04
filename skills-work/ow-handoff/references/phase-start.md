# Phase: `/ow-handoff-start` (and `--keep-frozen <file>`, `--refreeze <file>`)

Run right after ow-uat's sign-off, signed or deemed, so anything reported from then on is a covered Fix. Writes `handoffs/<client>/handoff.yaml` and `handoffs/<client>/agreed/`. Sets **no** window dates.

**Read first:** the latest saved the signed `contracts` SOW, `acceptance_criteria` and the `quotes` record (cache: `uat/<client>/`, `plans/<client>/contract-inputs.md`). The paths below are the scratch cache.

## 1. Entry

- `uat/<client>/signoff.md` or `uat/<client>/acceptance-record.md` missing: `Refused: acceptance testing is not signed off.`, `Nothing was written.`, and `/ow-uat-signoff` on `uat/<client>/`.
- `handoff.yaml` records `frozen:`: the route's no-op (`routing-and-resume.md` §4.1); the basis is not copied again.
- Otherwise run the steps from the first not recorded.

## 2. Steps

### `/ow-handoff-start`

1. **`basis`**: copy every file in `uat/<client>/agreed/` into `handoffs/<client>/agreed/` unchanged (`scope.md` and `acceptance.md`, or `quick-scope.md` for a quick-quote job; each `CO-nn.md` in the acceptance; `contract-terms.md` with the included block and the ownership terms). Recorded by the copies.
2. **`terms`**: write `handoff.yaml` (`handoff-yaml-schema.md`) with the acceptance date and kind from `signoff.md` (the sign-off as recorded there, never verified here), the build label, `agreed_basis` (each file, its date and digest), the post-acceptance COs (`signoff.md`'s list, plus any non-extension CO in `builds/<client>/changes/` signed after the sign-off date; unsigned or declined: "not in scope"), `project` and `payment_due_days` from `plans/<client>/contract-inputs.md`, `documentation_sku`, and the two window terms through their chains. A value from `offers.md` is a default: use it and say so. None anywhere: ask, as one of this verb's three questions.
3. **`paths`**: the repository from `builds/<client>/build.yaml` `builder.repo` (absent: ask). Find the README, deploy instructions, docs folder and CI config by a plain directory listing that follows no symlink, and record them in `doc_paths`; tell the user which you found so they can correct them. Never a git command in the repository.
4. **`gitignore`**: in a git repository where `opchain-work/**/export/` or `opchain-work/**/secrets-seen.log` is not ignored, ask once whether to add those two lines (the user adds them; this skill edits no `.gitignore`), and record the answer. Not a git repository: record `not a git repo`.
5. **`frozen`**: write `frozen: <date>` last.

### `/ow-handoff-start --keep-frozen <file>`

1. **`kept`**: add one `kept_frozen` entry for that one file (`handoff-yaml-schema.md` §2). Copies nothing.

### `/ow-handoff-start --refreeze <file>`

1. **`copy`**: re-copy that one file from `uat/<client>/agreed/` into `agreed/`; no other file.
2. **`note`**: add one `refrozen` entry naming it, with its new digest.

More than one file, or none: `Refused: --keep-frozen and --refreeze name one file.`

## 3. Then

Say the fix window's length and that the basis is copied, then `/ow-handoff-accounts` (with punch-list items in `uat/<client>/punch-list.md`, `/ow-handoff-fix --punch` first). After `--keep-frozen` or `--refreeze`, the verb that waited on the mismatch.
