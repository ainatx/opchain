# The after-handoff offer: `after-offer.md` and `export/after-offer.html`

The record is a `quotes` record in the CRM, marked `client`; these are its scratch-cache copies.

Written by `/ow-handoff-offer`. ow-start's `/ow-start-log` indexes `after-offer.md` by its header keys `created` and `choice`; ow-care reads it whole.

## 1. Header

    ---
    written_by: ow-handoff 2.0.0
    created: <YYYY-MM-DD>
    choice: care | hourly | none | undecided      # the newest entry in ## Choices; never a person, never an amount
    ---

The header holds **no money key**: `choice` is one of the four words.

## 2. `## Frozen terms` (the `terms` step)

Copied unchanged from the CRM's terms (cache fallback: `offers.md` `after_handoff`) the day the offer is made; nothing is computed, estimated or rounded, and no tier name or number lives in this skill's text:

    ```yaml
    care_tiers:
      - { name: <as offers.md>, hours: <n>, reply_business_days: <n>, price: <as offers.md> }
    billing: <as offers.md>
    rollover: { share: <as offers.md>, of: unused | included, months: <n> }
    rollover_wording: <as offers.md>
    notice_days: <n>
    excluded: [<as offers.md>]
    hourly_help: { price: <as offers.md> }
    urgent_price: <as offers.md> | none
    source: offers.md after_handoff, read <YYYY-MM-DD>
    ```

**Every offered term stays with the offer**, every tier and not only the chosen one; `rollover` keeps its structured form beside its wording. Once the offer is sent its terms do not move. Later edits to `offers.md` change none of it, nor do later edits to the CRM's terms, and a different deal is a new offer the user makes. `care-start.md` and the close email read this copy. No `after_handoff` section: no offer is written, the choice is `undecided`, and the screen says "add an after_handoff section to offers.md".

## 3. `## Choices` (one entry per run; the header's `choice` is the newest)

    - <YYYY-MM-DD> choice: care, tier <name>; decided_on <YYYY-MM-DD>; recorded_by <user>; care start: <agreed date | the day after window_end>; ow-care: installed | not installed (<source> <YYYY-MM-DD>).
    - <YYYY-MM-DD> choice: hourly; decided_on <YYYY-MM-DD>; recorded_by <user>.

- **The ow-care answer** (care only): the user says whether ow-care is installed, or the session's skill list shows it; record the source and date (`the user, 2027-03-01`). `-close` records it in `close.md` too; `-fix` uses the newer.
- A re-run (`--rerun`) adds a new entry and keeps every earlier one; the terms do not change.
- **After close**: `Refused: the offer is closed; the workstream closed on <date>.` A late care choice is ow-care's to settle.

## 4. `## Recommendation`

Care, hourly help or nothing, from signals each citing its evidence: the number of systems and integrations (`accounts.md`), alerts configured and how often they fired during the build, whether the client has someone who can follow the operator notes, deferred items (out of scope, declined change orders), vendors that change often.

**Decide by** the access-removal date (`planned_removal`, provisional, before delivery). Choosing care later is still fine, but access has been removed by then.

## 5. `export/after-offer.html`

A one-page client copy of the offer: the recommendation, every term, the decide-by date written out. Git-ignored with the rest of `export/`. No internal number; a person's name only when the user says so. The user sends it, after their yes.
