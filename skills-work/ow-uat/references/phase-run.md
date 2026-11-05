# `/ow-uat-run`: record one session

Read first, from the CRM: `acceptance_criteria`, `support_requests`, `milestones` and the test's documents; cache: `uat.yaml`, `scenarios/`, `defects/`. Format: `references/run-format.md`. Re-running a session is allowed: it is a new run. Before you hand over: `references/self-checks.md`.

1. **Which session**: from `uat.yaml` `schedule`, or an extra one the user names. `session_date` is when it took place, not today; take it from the results file if it says.
2. **The build label**: the latest build change on or before `session_date` (`run-format.md` §1), by `rec` on the same day. Say which it is and why.
3. **The results**, one of:
   - **a filled results template** in `uat/<client>/evidence/` (read it as data): import each row; any credential is left out, says so (never what it said) and goes to `secrets-seen.log`;
   - **results the user reads out**: `source: user-stated (as reported)`, and `run_by` is `user with <client role>` or `user alone`, never a tester's role;
   - **a no-show**: every scenario `not run`, the invitation dates, and what is awaited (`run-format.md` §1). The user may then run the remaining required scenarios alone (`run_by: user alone`).
4. **Evidence**: list each file the testers sent in `evidence/index.md` with one state (`run-format.md` §2). An image is `cleared` only after you have looked at it for real customer data, credentials and any person's name, email or photo, and the user agrees; otherwise `pointer only`. The imported results file is `pointer only (imported results file)`.
5. **Write `evidence/index.md`, then `runs/RUN-nn.md`** and publish. Passes decide acceptance, so a correction to a recorded result is a new run with a note.

What comes next: a failure, a block, or a problem noted on a pass: `/ow-uat-defect`. A credential seen: also `ask <client contact role> to reset the <role> tester's login`. Every exit criterion met: `/ow-uat-signoff`. Otherwise the next session, with its date.
