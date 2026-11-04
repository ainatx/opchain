# Phase: `/ow-handoff-delivered <date>`

Records the day the user sent the Handoff notes and writes `dates.yaml` (`package-and-dates.md` §3). Today's date comes from a tool call; the delivery date is the user's, recorded as their statement: "delivery not verified by this skill".

**Read first:** the latest saved `milestones` and the `contracts` SOW (cache: `package.yaml`, `handoff.yaml`). The paths below are the scratch cache.

## 1. Entry

- No `handoff.yaml` `frozen:`: `Refused: the handoff is not started.`
- No `package.yaml`, or `package_steps` short of `email`: `Refused: the Handoff notes are not packaged.` and `/ow-handoff-package`. (Notes delivered by hand with no `package.yaml`: the dates come from delivery + N, with no correction email.)
- `dates.yaml` exists and the user gives the same date: `Nothing to do: the window dates were recorded on <date>.`, `Nothing was written.` The user says the recorded delivery date was wrong: recompute every date from the right one, list each date that moved in `moved:`, tell the user, and draft the correction email.
- A check that applies here fails: refuse.

## 2. Steps

1. **`correction`**: work out `handoff_date`, `window_end` (the later of `planned_end` and delivery + `fix_window_days` calendar days) and `access_removal_date` (minus the lead in business days, on `profile.md`'s holidays; absent: weekends only, said), through `ow-tools calc date` or marked `not machine-checked`. When any differs from its provisional date, draft `export/window-correction-email.{html,txt}` naming each new date: the end, the removal (decide-by) and the care start. No date moved: nothing is written at this step.
2. **`dates`**: write `dates.yaml`, last.

## 3. Then

Say when the window ends, then, in this order: on a smaller project (`handoff.yaml` `project: smaller`) when `builds/<client>/ledger.md` does not show the delivery half invoiced or requested (it may have been under ow-uat's backstop), and following a governing delivery definition recorded in `uat/<client>/uat.yaml`, `/ow-build-invoice`; with the line bought, `/ow-documentation-rollout` on `docs/<client>/`; then `/ow-handoff-offer`.
