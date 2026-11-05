# `/ow-uat-defect`: log, triage and follow each problem

Read first, from the CRM: `support_requests`, `acceptance_criteria`, `quotes` (`type amendment`) and the test's documents; cache: `defects/`, `agreed/`. Logging always works; a basis mismatch is reported and the user decides before triage leans on it. Format and rules: `references/defect-format.md`. Before you hand over: `references/self-checks.md`.

**After sign-off:** mark each UAT-nn on `punch-list.md` `moved to punch list`. A new problem from the main scenarios goes to `/ow-handoff-fix` (`defect-format.md` §7); one from an `--addendum` scenario is logged and judged against its change order.

1. **Log** each problem: from a run (a `fail` or `blocked` scenario, or a problem noted on a passing one) or from a client report (record when it **arrived**). A report after a request was sent: qualifying or not (`defect-format.md` §6). The same as an existing UAT-nn: Duplicate.
2. **Triage** against `agreed/`: class, severity, the basis item cited, the reason the client sees. The class is a recommendation; the user decides. Severity gates are for class Defect only.
3. **Follow**, one history line per event:
   - a Defect goes to the builder (`handoffs.yaml` `build`, or run the builder's step); `fixed` only with the build label the user gives; the retest is a new run;
   - a Change: price it with `/ow-build-change`, in writing and agreed before any work; a condition, with its change order (signed: `--add-co`; declined: lapsed). Read `builds/<client>/changes/CO-nn.md` and, for a condition, its `builds/<client>/changes/requests.md` row. `too big for a change order` goes to `/ow-build-plan` as a follow-on, and blocks sign-off until the client withdraws it (owner decision O6). Rewrite the client reason each time the condition is set, met, lapses or is withdrawn, so it always says whether it blocks sign-off (`defect-format.md` §5);
   - **bounds** (`defect-format.md` §5): compute each Defect's fix date on the calendar and show it. A blocker or major Defect past `fix_rounds` or `fix_business_days` is escalated; extensions are builder cause (no charge) or client cause (requested on **every** UAT-nn the event affects, one change order for one event);
   - **supersession**: a reproduced blocker or major, a late cannot-reproduce notice, a new condition, or a `fixed` on a UAT-nn from the main scenarios, recorded after a live request was written: note `request <n> will be superseded` on the UAT-nn, and say so;
   - minors and cosmetics may move to the punch list (Defects only); a Training gap is `passed to documentation`; an Environment or data problem is `closed` when its scenario's re-run passes.
4. **Write each UAT-nn** and publish. No reason or message calls a UAT-nn fixed unless its latest event is `retested-pass`.

What comes next: a Change or an extension, `/ow-build-change` (one change naming every UAT-nn of one extension event); a Defect sent, the builder, with the fix date; a condition signed, `/ow-uat-plan --add-co`; a fix recorded, `/ow-uat-run`; criteria met, `/ow-uat-signoff`; after sign-off, `/ow-handoff-fix`.
