# Phase: `/ow-handoff-offer` (and `--rerun`)

Writes `after-offer.md` and `export/after-offer.html` (`offer-format.md`). **The offer's terms come from the CRM (`offers.md` as the cache fallback, said in the output) the day it is made and stay with it: once the offer is sent, its terms do not move.**

**Read first:** the latest saved the CRM's terms and `quotes` (cache fallback, said in the output: `offers.md`). The paths below are the scratch cache.

## 1. Entry

- No `handoff.yaml` `frozen:`: `Refused: the handoff is not started.`
- `close.md` exists: `Refused: the offer is closed; the workstream closed on <date>.`, `Nothing was written.`
- A check that applies here fails: refuse.
- `after-offer.md` exists: the run is `--rerun`.

## 2. Steps

### `/ow-handoff-offer`

1. **`terms`**: copy the after-handoff terms (the CRM's, or `offers.md` `after_handoff`) unchanged into `## Frozen terms`, every tier and term (`rollover` structured, `rollover_wording` beside it, `urgent_price` when offered); never invent, estimate or round one. Write the recommendation with its cited signals and the decide-by date. No `after_handoff`: no offer, `choice: undecided`, and "add an after_handoff section to offers.md".
2. **`choice`**: add the client's choice as the user reports it (`care`, `hourly`, `none`, `undecided`), with `decided_on`, `recorded_by` and, for care, the tier, the care start and whether ow-care is installed (`offer-format.md` §3). Set the header's `choice`. No choice yet: `undecided`.
3. **`html`**: `export/after-offer.html`. **Show the user the offer and wait for their yes before it goes to the client**: this is the verb's one approval. The user sends it.

### `/ow-handoff-offer --rerun`

1. **`choice`**: add a new choice; keep every earlier one; the terms do not change.

## 3. Then

Say the choice recorded, then `/ow-handoff-access`.
