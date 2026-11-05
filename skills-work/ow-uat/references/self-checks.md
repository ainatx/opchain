# Before you hand this over, check

A check that fails is fixed. The user may say to go ahead, except on credentials, client data, private names and acceptance, which are not waived.

- **Coverage**: every check in `agreed/` has a required scenario; at sign-off, it passes on the latest build label.
- **Who tested** (below): every pass has `run_by` and `source`.
- **Triage**: every UAT-nn names the basis item it was judged against, and its fix date is shown. A Defect past its bounds has an extension or an escalation; that never blocks work on anything else.
- **Client data, people, credentials, internal numbers, private names** (below).
- **Test access**: at `--signed` and `--deemed`, the test-account list was asked for (it may be empty) and each entry has environment and created-by.

## No internal numbers (owner decision D1)

An internal number is **ours only**. Client outputs are the tester packs (Markdown, HTML, PDF, Word), the results template, sign-off requests and their exports, the acceptance record, the punch list, acceptance addenda, and the reason a UAT-nn gives the client. None of them carries, in any wording:

- **our hours or effort on fixes or on the test** ("we spent two days on the fix", "the retest took us a morning");
- **our rates and the price book's internals**: the UAT extension rate, the per-role add-on as a rate, unit prices, modifiers or multipliers;
- **our cost or margin** ("this fix cost us more than the UAT line");
- **our overruns against our own plan or estimate** ("the fixes ran past what we had planned").

**Allowed**, because they are the client's or are quoted contract terms: the quoted UAT line (its price, roles, sessions, fix rounds and fix days); session dates and test durations; counts ("10 of 10 cases passed"); a signed change order's price; payment terms; deemed and backstop dates; fix dates and rounds against the quoted bounds, including an overrun of them at no charge (owner decision O7: "fixed on 14 January, after the 5 business days quoted, at no charge"); the client's own figures, ratios and schedule.

Judge by meaning, not by word list.

## Who tested

Every pass has a run with `run_by` and `source`. A result the user ran or read out is never written under a tester's role. Checks whose only pass is `user alone` are listed in the request under "Checked by the builder; not tested by your people". **No client sentence credits such a check to the client's people**, or says a UAT-nn is fixed, resolved or working unless its latest event is `retested-pass` on the latest build label. Allowed: "checked by the builder", "the bookkeeper ran SC-06 and it passed" when the run says so, "fixed in build <label>; retest due" before the retest.

## Client data

- A scenario, pack or record cites data **by pointer** (source, record ids or locator, count, fields) and passed cases **as a count**. A table of record values, a pasted order line, or a field value copied from the client's system does not belong. A table is judged by what its rows hold, never by its length: rows with emails, phone numbers, card-like numbers, ID-like values or names (a customer, client or store column) are record values; a schedule or a table of counts is not (owner decision OD-7). Test data is not a record value (owner decision R3-4): a payment provider's published test card (Stripe's `4242 4242 4242 4242` set, and Visa's `4111 1111 1111 1111`) in a test-mode scenario, and a record id marked as made for the test (in the sandbox, a test order, created by SC-nn). A real card shape, or an id with no such mark, still is.
- Only items `cleared` in `evidence/index.md` are cited forward. A video cannot be looked through here, so it stays pointer only.

## People

Working files may name a client's people. Client documents (packs, requests, the acceptance record, the punch list, the reason a client reads) use roles and tester ids unless the user says to name someone. No private skill or business name anywhere: the catalog's blocklist holds.

## No credentials

No file holds a login, password, key or token: not a labelled secret value, not a key- or token-shaped string, not a login inside an address. Allowed: "your login comes from the client operations lead", "ask the operations manager to reset the bookkeeper tester's login", "use the payment provider's test mode". A value seen in a paste, an import or an evidence file goes in `secrets-seen.log` (kind, tester role, source, session; never the value) and the user is told `ask <client contact role> to reset the <role> tester's login`. A pattern match can miss one: read the packs and the request through before they go out, and say you did.
