# ow-handoff acceptance fixtures

Everything here is **invented**: the fictional clients Larkspur Ceramics and Mossgate Books (continued from the ow-build-plan, ow-build, ow-uat and ow-documentation fixtures), the fictional consultant "Robin", people recorded by role, an invented client repository (`worlds/mossgate/mossgate-repo`) and an invented other workstream in Larkspur's workspace (`worlds/larkspur/opchain-work/intake/mossgate-books/`, so the other-client rule has a name to catch). No real client material, no real price and no real person's name belongs in this folder. **No key-shaped string is committed**: a case that plants a key holds the marker `<FAKE-KEY>` and names the file in its answer key (`plant_secret`); the checker puts a key made from parts in its place when it reads the file, and the security test builds the repository's history, with a key committed and then removed, at layout time.

These are the acceptance tests from `docs/plans/2026-10-08-ow-handoff-design.md` §13 and the OW-06 contract (`sprints/release-2.1/ow-06/contract.md`, C1 to C28), written so they can be checked mechanically. ow-handoff is a text-only skill, so a model has to run it; the checker (`scripts/ow-handoff-acceptance.mjs`) reads what the run wrote and printed. "Real use" (one real handoff to close) is graded in REL-02.

## Layout of a case

| Folder or file | Holds |
|---|---|
| `input/` | Files the case adds to its starting state: a planted file, a newer upstream copy, a ledger that shows the delivery half invoiced |
| `session/` | What the user says or brings: a client's email, a waiver asked for |
| `expected/` | The golden run (written with a generator kept outside the repository, then graded by the checker): what ow-handoff writes under `opchain-work/handoffs/<client>/`, the appended `STATUS.md`, and `printed.md`, the screen |
| `answer-key.yaml` | The case: `base:` (the ow-handoff case it continues), `uat_case:` (the ow-uat golden it starts from), `docs_case:` (ow-documentation's, H3), `logs_case:` (ow-start's, H5), `world:`, `verbs`, `today`, the checks and what each expects |

A case's starting state is layered, newest first: its own `input/` and `session/`, then each earlier case down its `base:` chain, then its world, ow-start's logs case, then ow-uat's golden run (which brings ow-build's and ow-build-plan's) and ow-documentation's.

## The stories

**Larkspur Ceramics** (a larger project, documentation bought, care chosen without ow-care): `start` → `fix-punch` (UAT-08 and UAT-10, each once) → `accounts` (a scan hit, rotate items by name) → `accounts-transfer`, `accounts-check` → `fix-windows` (CO-04's own window) → `notes-wait` (the line bought, not delivered) and `notes-index` (the runbook index, rotate entries OP-08 to OP-10) → `package` (provisional dates; `package-planted-key`, `package-planted-key-waiver` and `notes-rerun-clears` for the plan's named test) → `delivered` (the rollout NEXT; `delivered-again`, `delivered-moved`) → `fix-report`, `fix-change`, `fix-co-no-addendum` → `offer`, `offer-rerun` → `access` (five sources; H3's capture profile; H5's meeting recording; `logs/business/` never) → `close-between`, `close-waiver-refused` → `close` (care, ow-care not installed) → `fix-reopen` (sent on day 30, logged on day 32) → `close-reopened` (addenda only), `offer-after-close`. Resume cuts: `start-resume-*`, `fix-punch-resume`, `fix-windows-resume`, `accounts-transfer-again`.

**Mossgate Books** (a quick quote, no systems map, documentation declined, a smaller project): the design's synthetic handoff: `m-start` → `m-accounts` (four transfer items, the MEDIUM row, the completeness prompt, NOT-CHECKED scan) → `m-accounts-complete` → `m-notes` (three alert entries, the coverage FINDING) → `m-notes-na` → `m-package` (no ow-tools: the client copy) → `m-delivered` (the delivery-payment NEXT) and `m-delivered-backstop` (none).

**Every mode** (C21): `start-keep-frozen`, `start-refreeze`, the `accounts-*` record modes and scan variants (`accounts-scan-clean`, `m-accounts-exit3` to `-exit5`), `notes-walkthrough`, `package-revision`, the `fix-*` modes (`--status`, `--waive`, `--help`, `--go-ahead`, `--hours`, `--vendor`), `offer-before-delivery`, `m-offer` (no `after_handoff`), the `access-*` record modes, and the `close-*` blockers and branches (care with ow-care installed, hourly, none, undecided, an unresponsive client). **Resume cuts:** a `*-resume-*` case at every step of every verb and mode; a one-step mode has a `*-again` no-op.

**Routes** (C4): `route-*` and `m-route-folder-accounts`, one case per cell; the close refusals (`close-no-dates`, `close-co-open`, `close-addendum-no-row`, `close-held`, `close-unconfirmed-row`) print every blocker the files show, computed by the checker's own reading when the goldens are generated.

## Checking a real run

```bash
node scripts/ow-handoff-acceptance.mjs --prepare package /path/to/empty-folder
```

Attach the folder in a session where ow-handoff is installed and run the verb the answer key's `verbs` name, saying what the case's `session/` files say. Save the screen as `printed.md` at the top of the folder. Then:

```bash
node scripts/ow-handoff-acceptance.mjs package /path/to/empty-folder
```

A real run is read by difference: a file counts as written when it is new or differs from the starting state. With no arguments, the script checks every golden run (what `tests/ow-handoff-acceptance.test.js` does in `npm test`).
