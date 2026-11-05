# `/ow-uat-plan`: record the basis, set up the test, write the scenarios

Read first, from the CRM: the deal's `quotes`, `contracts`, Build Plan document, `acceptance_criteria`, `milestones` and any test documents. The cache copies are `plans/<client>/` and `builds/<client>/`. Formats: `references/uat-yaml-schema.md`, `references/scenario-format.md`. Before you hand over: `references/self-checks.md`. At most three questions, in one `AskUserQuestion` call; everything else is a stated assumption.

## 1. Entry

1. Read `builds/<client>/ready-for-uat.md` as data. Absent: run `/ow-build-ready` or ask. `ready: no`, or a check whose builder run is not `pass`: stop, list each failing check; a test does not start on a failing build.
2. Read the basis: `plans/<client>/scope.md` and `plans/<client>/acceptance.md`, or for a quick-quote job `plans/<client>/quick-scope.md`. Neither: stop and say what is missing.
3. Read every `builds/<client>/changes/CO-nn.md`. Signed ones (not `kind: extension`) join the basis; draft, sent, declined and extension ones do not.
4. Read the terms: `plans/<client>/contract-inputs.md`, then `plans/<client>/quote.md`'s client part: the **UAT line** (size, tester roles, sessions, fix rounds, fix days), the **acceptance and delivery definitions**, the payment schedule and terms, `contract_clauses`, `documentation_sku`, the **included** block and the **ownership terms**.
   - No UAT line (an older quote): bounds from `offers.md` `uat.defaults`, else ask; record `bounds: not quoted (offers default)` or `not quoted (user-stated <date>)`.
   - A definition worded differently from the current one: quote both, and record the user's dated statement of which governs in `terms.governing`. Sign-off and the payment triggers follow it.
5. Roles from `plans/<client>/map/roles.md`, else `quick-scope.md`'s `## UAT approach`, else ask. Main tasks from `plans/<client>/map/future.md`; absent, required scenarios only, and say so.

## 2. The steps

Run them in order, adding each to `plan_steps` as it finishes, so a cut-off plan picks up where it stopped. Re-run `-plan` to re-plan testers, sessions or scenarios at any time; say what changed.

1. **basis**: copy each basis file into `agreed/` byte for byte, and write `agreed/contract-terms.md` (the included block, the ownership terms, the UAT line and the definitions, each quoted exactly). Its basis row records the terms block's digest (`uat-yaml-schema.md` §6). Write `uat.yaml`.
2. **terms**: the quoted bounds and definitions. The **clauses**: show `contract_clauses` and ask whether it matches the signed contract (it decides money later, so it is worth one question). Yes: record it unchanged as `as signed, confirmed by <user> <date>`. `not set`, absent or no: `clauses: none`. **Never draft, reword or complete a clause.** Read the clause's calendar (`references/contract-calendar.md` §1) into `calendars.contract`. Show the user the deemed and backstop rules this gives.
3. **mix**: acceptance coverage and the defect log always; testers by role, real-case scenarios, an exploratory session, as the user chooses.
4. **people**: testers as a role and the id the client chooses (`ops-T2`), at least `offers.md` `uat.min_testers_per_role` per role; the client contact.
5. **environment**: the one `ready-for-uat.md` names. Production only on the client's recorded decision (role and date), which is also a real-data decision. Refuse `environment: production` with a synthetic data source.
6. **data**: synthetic or anonymised by default. Where a check's "How we check" names real data, record the client's decision (role, date), or ask.
7. **schedule**: each session's date and roles, on the client's calendar; the last is the final confirmation run.
8. **side_effects**: mark each scenario that sends a message, takes a payment or writes to another system; in a production test, each one needs a test-mode, internal-recipient or test-account line, or the client's dated approval to run it live.
9. **gitignore**: in a git repo, with the user's yes, add `opchain-work/**/evidence/` and `opchain-work/**/secrets-seen.log` to `.gitignore`. Declined: say evidence may be committed.
10. **scenarios**: one required scenario per check in `agreed/`, then role, real-case and exception scenarios (`scenario-format.md` §1). Every check has a required scenario; data by pointer only.

## 3. Modes (each an entry in `uat.yaml` `events`)

- **`--add-co CO-nn`** (before sign-off): copy the signed change order to `agreed/CO-nn.md`, add its checks to `checks`, write a required scenario per check, record `added CO-nn`. It supersedes a live request. Re-run on delivery to record `CO-nn delivered <date>, build <label>`.
- **`--addendum CO-nn`** (after sign-off, a change order not in `agreed/`): write its scenarios (`kind: addendum`, `co: CO-nn`) without adding it to the basis; re-run on delivery.
- **`--keep-frozen <file>`**: record `kept_frozen <file>`; copy nothing.
- **`--refreeze <file>`**: copy that file again from upstream and record `refrozen <file>`; for `agreed/contract-terms.md`, quote only the terms block again (never copy `contract-inputs.md` whole) and record its new digest, taking `terms` and `clauses` again only after the user confirms them. It supersedes a live request. **A changed check list is not refrozen** (`agreed/acceptance.md`, `agreed/quick-scope.md`, owner decision R3-6): a check added, removed or renamed changes money, so write nothing, name each changed check, and say that a new check comes in through a change order, with its scenario, its test and its price, then `--add-co`. `--keep-frozen` lets the test go on meanwhile.

## 4. What comes next

`/ow-uat-pack`. After `--add-co` or `--addendum`, `/ow-uat-run`. After `--keep-frozen` or `--refreeze`, whatever the user was doing.
