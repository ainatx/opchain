# Phase: `/ow-handoff-fix` (every mode)

Logs, classifies and follows each report and hourly-help job to its end (`fix-format.md`). Every mode runs `windows` first. **A covered fix is free; a change is priced in writing, and agreed by the client, before any work on it.**

**Read first:** the latest saved `support_requests`, `acceptance_criteria`, `milestones` and the offer's `quotes` record (cache: `fixes/`, `agreed/`, `dates.yaml`, `after-offer.md`). The paths below are the scratch cache.

## 1. Entry

- No `handoff.yaml` `frozen:`: `Refused: the handoff is not started.`
- A basis mismatch is open (`routing-and-resume.md` §1.4): `Refused: the agreed basis does not match uat/<client>/agreed/<file>.` and the `--keep-frozen` / `--refreeze` choice.
- A report against a post-acceptance CO with no `uat/<client>/acceptance-addendum-CO-nn.md`: `Refused: CO-nn has no acceptance addendum yet.`, `Nothing was written.`, and ow-uat's verb (`/ow-uat-defect` on `uat/<client>/` when the CO's addendum scenarios exist, else `/ow-uat-plan --addendum` for CO-nn). That CO is not accepted; nothing is logged.
- A check that applies here fails: refuse, except a failing check whose resolution is the Fix being written.

## 2. Steps

### `/ow-handoff-fix --windows` (a bare `-fix`, no report)

1. **`windows`**: add one `co-windows.yaml` row for every `acceptance-addendum-CO-nn.md` that has none (`package-and-dates.md` §4). Rows are not edited.

### `/ow-handoff-fix` (a report)

1. **`windows`**: as above.
2. **`log`**: write `fixes/FIX-nn.md`: `reported` as reported with its source, the class and the item judged against, the window (main, or the CO's own), the route (`fix-format.md` §1.1, §1.2). A report sent on or before its window end and logged after close reopens the workstream: say FIX-nn (covered, reported <date>) is awaited after close.

### `/ow-handoff-fix --punch`

1. **`windows`**: as above.
2. **`punch`**: one covered FIX-nn per `uat/<client>/punch-list.md` item not yet logged, in the list's order, each citing its UAT-nn and the check it cites, `reported` = the UAT-nn's logged date. Every item logged: `Nothing to do: every punch-list item is logged.`

### `/ow-handoff-fix --status FIX-nn`

1. **`windows`**. 2. **`status`**: add one state line to its `## History` (`fix-format.md` §1.3); `verified` only with the scoped re-check and the client's confirmation as the user reports it.

### `/ow-handoff-fix --help`, `--go-ahead HELP-nn`, `--hours HELP-nn`

- `--help`: 1. **`windows`**. 2. **`help`**: write `help/HELP-nn.md` (`requested`). After close, only when the choice is `hourly`: `Refused: new hourly help after close needs the choice hourly.`
- `--go-ahead`: 1. **`windows`**. 2. **`go-ahead`**: add the go-ahead naming its HELP-nn, date and client role, as the user reports it.
- `--hours`: 1. **`windows`**. 2. **`hours`**: add the hours line. 3. **`invoice`**: write `invoices/INV-request-help-nn.md` at the offer's hourly price (no offer yet: the CRM's terms, cache fallback `offers.md`), one per HELP-nn. Before its go-ahead: `Refused: work on HELP-nn waits for the client's go-ahead.`

### `/ow-handoff-fix --vendor`, `--waive FIX-nn`

- `--vendor`: 1. **`windows`**. 2. **`vendor`**: write `invoices/INV-request-vendor-nn.md` at cost from the listed receipts.
- `--waive`: 1. **`windows`**. 2. **`waive`**: add `closed unconfirmed`, naming every date confirmation was requested; only for a fix at `fixed` whose re-check passed.

## 3. Then

A Fix, or approved hourly help: to whoever builds it. A Change, or After the window not routed to care: `/ow-build-change` with `handoffs/<client>/fixes/FIX-nn.md`, priced and agreed before work. `route: care` after close with ow-care installed: `/ow-care-request` on the FIX-nn. Hours recorded, vendor charges: an `invoices` record (cache fallback: `handoffs.yaml` `invoice`).
