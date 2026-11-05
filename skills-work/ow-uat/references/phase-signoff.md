# `/ow-uat-signoff`: requests, the signature, deemed acceptance, the backstop, addenda

Read first, from the CRM: `contracts`, `quotes`, `acceptance_criteria`, `support_requests` and the test's documents; cache: `uat.yaml`, `runs/`, `defects/`, `signoff-requests.yaml`. Formats: `references/signoff-schemas.md`. Dates: `references/contract-calendar.md`. Before you hand over: `references/self-checks.md`.

**The one approval.** Before a request goes to the client, and before a signature, a deemed acceptance, an addendum confirmation or a backstop is recorded, show the dates, what passed and what is open, and get the user's yes. Do not ask anything else twice.

A basis mismatch must be decided first in every mode (`routing-and-resume.md` §1): these steps state dates and mark acceptance.

## 1. Every mode first: request statuses

Read every run, UAT-nn and request row. Mark each `drafted` or `sent` request `superseded` as `signoff-schemas.md` §3 says. Once `signoff.md` exists, plain, `--sent`, `--signed` and `--deemed` stop: acceptance is recorded; next is `/ow-handoff-start`.

## 2. The exit criteria (plain, `--sent`, `--signed`, `--deemed`)

**Never mark acceptance without every required scenario passing after the last fix.** Stop, naming **every** gap, while any is true:

1. A **required scenario** for a check in `agreed/` is not `pass` in a run whose `build` equals the **latest build label** (the latest `fixed` on a UAT-nn from the main scenarios, or the latest delivery of a change order in `agreed/`, by `rec`). In practice: one confirmation run of every required scenario after the last fix. A role scenario does not stand in for its required one.
2. A scenario's latest run is `fail` or `blocked` and no UAT-nn names it.
3. A blocker or major **Defect** is not terminal, or a **condition** is neither met nor lapsed (a too-big condition blocks until withdrawn).
4. A minor or cosmetic **Defect** is not terminal and not on the punch list. Exempt, for `--signed` or `--deemed` on request n: those logged after request n was written; they go to `punch-list.md` as "reported after request <n>; not on the signed list".
5. An Environment or data UAT-nn is not `closed`.

Signed change orders dated after the freeze, not in `agreed/` and not extensions, do not block: the request lists them as post-acceptance, or the user runs `--add-co` first; record which in the row.

## 3. Plain: write request n

Take the planned send date; compute the deemed date for the first sentence (`signoff-schemas.md` §2); write `signoff-request-<n>.md` and its row (`drafted`), naming what passed and what is open. A correction is request n+1, which supersedes every earlier live one. A live request that nothing supersedes means no new one: say where it stands, and write request n+1 only when the user asks for a new request. Export with `ow-tools export uat/<client>/signoff-request-<n>.md`. Every builder-only pass goes in its own section; no sentence credits it to the client's people.

Nothing is sent by this skill: the user sends it (`handoffs.yaml` `sign`, or by hand), then `--sent`. Say the deemed date; nothing reminds anyone later.

## 4. `--sent <n> <date>`

On a `drafted` request: record `sent`. If it was superseded, say so; the user may still send it on their word, but a superseded request never becomes acceptance (§5). Say what is awaited, by which date: the deemed date if a clause is held, else the follow-up date.

## 5. `--signed <n> <date> <client role>` and `--deemed <n>`

Only on a request that was `drafted` or `sent` and not superseded **as of the signature (or deemed) date**. A signature on a superseded request marks nothing: record what the user says in a note, say why, and point to the live request. Each step goes into the row's `signing_steps`, so a cut-off run picks up at the first missing one:

1. **record**: `signed <date> by <client role> on request <n>; signature not verified by this skill`: the signature is the user's statement of the client's act. For `--deemed`: only after the deemed date (`signoff-schemas.md` §4), only with the contract's clause and a supported calendar, and only with the user's approval after seeing the clause, the three dates and the builder-run list (a request resting on builder-run checks counts as complete only if the clause covers that). Then `deemed accepted under <clause ref> on <date>; applied by <user>; client response not received`.
2. **accounts**: ask for **every test account the builder created, set or knows a password for, or signed in with**, and any tester account in production: role, environment, created-by. Never a login. Kept in the row.
3. **acceptance-record**: write `acceptance-record.md`, evidence by `cleared` pointer only.
4. **punch-list**: write `punch-list.md`, the late minors included.
5. **signoff**: write `signoff.md` last.

`clauses: none`, or a calendar that is not supported: `--deemed` stops; say that the signature is awaited since when, and suggest a follow-up and, after `offers.md` `uat.follow_up_business_days` counted on `profile.md`'s calendar (not a clause date), taking it up under the contract.

**What comes next, in this order:** punch-list items to move, `/ow-uat-defect`; a larger project (40/40/20), `/ow-build-invoice` for the acceptance payment, a smaller project nothing yet; `/ow-handoff-start`, now, since anything reported from here on is a covered fix; only when `uat.yaml` `terms.documentation_sku` is `bought` (owner decision O5), `/ow-documentation-start`.

## 6. The backstop (smaller projects, two-payment schedule)

- **`--readiness <date> <dependency>`**: the builder has done all it can alone and sent the client a readiness notice naming a listed client dependency still outstanding (from the scope's client dependencies). Recorded as reported in `backstop-log.yaml`.
- **`--builder-delay <days> <reason>`**: business days of delay the builder caused after the notice.
- **`--backstop`**: the backstop date is the later of acceptance + the clause's N business days and the notice + 5 business days, plus the builder-delay days, on the contract calendar. Show it as a date. Stop when: the project is not on the two-payment schedule; `clauses: none` or no backstop clause; the calendar is not supported; there is no readiness notice; the backstop date has not passed (it applies from the day after it, as deemed acceptance does, unless the clause says in so many words that it applies on that date; wording that merely counts something "from the same day", or says it does not apply or never falls due on that date, does not: owner decision OD-4); the dependency is no longer outstanding (ask); the notes were delivered (`handoffs/<client>/dates.yaml`); the ledger shows the delivery half invoiced (`builds/<client>/ledger.md`); or `backstop.md` exists: the delivery half is invoiced once. Otherwise write `backstop.md`.

Next: `/ow-build-invoice` for the delivery payment.

## 7. `--addendum CO-nn <date> <client role>`

For a change order not in `agreed/` at sign-off. Criteria 1 to 3 and 5, limited to that change order's checks and the UAT-nn from its scenarios: each check passes in a run whose `build` equals the latest of its delivery and any `fixed` on those UAT-nn, with no blocker or major among them open. A fix to an addendum UAT-nn never makes the main checks stale. Record `confirmed <date> by <client role>; not verified by this skill` and write `acceptance-addendum-CO-nn.md`. It never marks a payment.

Next: `/ow-handoff-fix` (the change order's own fix period starts on the confirmation date).
