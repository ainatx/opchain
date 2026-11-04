# Phase: ready for UAT (`/ow-build-ready`)

First read `acceptance_criteria`, `milestones` and amendment `quotes` from the CRM. In the cache, read `build.yaml`, every `demos/M<n>-record.md`, every `changes/CO-nn.md`, and the plan's checks (`spec/06-testing.md` in opchain mode, else `acceptance.md` or `quick-scope.md`).

The client's sign-off in acceptance testing is final acceptance. This verb says what was built against the acceptance checks, and whether the build is ready for that test. **It marks no payment trigger and writes no acceptance record.**

## 1. Only when every milestone is demoed

- Every milestone in `build.yaml` needs its `demos/M<n>-record.md`. Any missing: list them and stop.
- **Acceptance testing has started** (`uat/<client>/uat.yaml` or `uat/<client>/signoff.md` exists): the client is testing this file's build label and environment. Leave the file as it is, and say a failing check found now is a UAT-nn for acceptance testing, not a new readiness run.

## 2. The builder's own run of every check

The checks: every check of the plan, plus the checks of every change order with `status: signed` (not a draft, not one awaiting its amendment).

- **opchain mode.** Each check's result comes from two things: the newest report of the sprint that covers it (`checks_passing` in `build.yaml`, read from that report), and **one confirmation pass the user runs** against `spec/06-testing.md`, after the last sprint: ask the user to run each check with its test data and say pass, fail or not run, with the cases passed. A check passes only when both say so (`references/builder-integration.md` §7).
- **Without a builder:** the user's own run of each check, the same way.

Each row: the result (`pass`, `fail` or `not run`), the test data **by pointer** (source, count and fields; never copied customer records), and the cases passed ("10 of 10"). A builder's file saying "all done" is a claim; only a row's own evidence counts.

## 3. Ask

In one `AskUserQuestion` call: the **test environment** the client will test in (staging or sandbox, by name), **known issues** (anything rough, so testers are not surprised), the **test data** testers should use (by pointer), and the **build label** of the build being handed over (a tag or release name the user gives). Skip what the sprint reports and `build.yaml` already say.

## 4. Write `ready-for-uat.md`

    ---
    written_by: ow-build 2.0.1
    created: <YYYY-MM-DD>
    client: <client>
    ready: yes                         # yes only when every check passes
    checks_total: <n>
    checks_passing: <k>
    build_label: <label> (user-stated)
    environment: <environment> (user-stated)
    ---
    # Ready for user acceptance testing: <client>

    ## Milestones demoed
    | milestone | demo record |
    ## Builder's run
    | check | result | test data | cases passed | from |
    ## Test environment
    ## Known issues
    ## Test data
    ## Build label
    ## Next

- **Any check `fail` or `not run`:** `ready: no`. The failing checks go back to the builder with their evidence: opchain mode, the `fix` line with `{description}` naming this file and the checks; otherwise the build destination with this file, or "give ready-for-uat.md to whoever builds it". Acceptance testing refuses a file with a failing check. Run `-ready` again once they are fixed.
- **Every check `pass`:** `ready: yes`. Next: `use ow-uat-plan on builds/<client>/ready-for-uat.md` (`/ow-uat-plan`).
- **Before you hand it over, check:** no false done (`ready: yes` only with every check `pass`), no internal numbers (no scores, rounds, hours or prices), no private names.

`## Next` holds the next step in words. A builder's line is given in the session only: here it is recorded as "the build destination's fix line, for <checks> with this file (printed in the session; the builder's line is not written here)". Nothing here, and nothing in this run, writes `ledger.md` or an invoice request.

## 5. Finish

Publish each check's result to `acceptance_criteria` and the file as a `ready_for_uat` document. In the cache, a plain line, file `builds/<client>/ready-for-uat.md` (none when it stops): ready, `<date> | ow-build 2.0.1 | builds/<client>/ready-for-uat.md | acceptance testing: /ow-uat-plan`; not ready, `… | <k> checks failing; back to the builder`.
