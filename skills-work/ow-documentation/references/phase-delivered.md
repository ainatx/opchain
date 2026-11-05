# `/ow-documentation-delivered <date>`: record the delivery

Open `references/ow-protocol.md`. Schema: `references/deliveries-schema.md` §2 and §3. Read first from the CRM: the `delivery_record` document, the line on the proposal and its `invoices`; `builds/<client>/ledger.md` is the cache fallback.

The line is invoiced when the documents are delivered, so this record is what the money follows.

## 1. Entry

1. **Nothing exported** (`deliveries.yaml` missing, or `export_steps` short of `push`): say so, write nothing, and name `/ow-documentation-export`.
2. **Already delivered** (`delivered.md` exists): say the recorded date and write nothing. An update exported since (`deliveries.yaml` `updates`) goes through `--update <date>` (section 3).
3. The checklist's three that are never skipped must hold (`references/self-checks.md`).

## 2. Record it

Ask the delivery date if it was not given (the day the documents reached the client, as the user reports it). Write `delivered.md`: `delivered: <date>` and `Documents delivered <date written out>, recorded by <user>; delivery not verified by this skill.`, with what `deliveries.yaml` lists. It stays as recorded; a later delivery is its own version. Nothing is sent to the client by this skill. Publish it as a `delivery_record` document, `internal`.

Then read the documentation line's state (`builds/<client>/ledger.md` in place).

**What comes next, in this order:**

1. `/ow-build-invoice` for the line, **once**: only when `ledger.md` does not already show the line `requested` or `paid`. Shown requested or paid: say it is already in the ledger.
2. `/ow-handoff-notes`: the Handoff notes now point to the runbook's `OP-nn` entries.
3. `/ow-documentation-rollout`: the rollout plan.

## 3. `--update <date>`

After `delivered.md` and an exported update (`deliveries.yaml` `updates`). Write `delivered-update-nn.md`: its `delivered:` date, `update_of: docs/<client>/delivered.md`, the files of that update, and the gap it answers. It is never invoiced: ow-build reads only `delivered.md`. An update already recorded: nothing to do.
