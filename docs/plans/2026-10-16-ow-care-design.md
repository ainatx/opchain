# ow-care — design (ongoing care after handoff, and care for systems taken over)

**Date:** 2026-10-16 · **Status:** APPROVED 2026-10-16 with its amendments T3, T4, H4, S1 and P4 (decisions 10–11 close the open questions). Nothing is built.
**Release:** a skill in the ow- family that ships together as v2.1.0 (owner scope change 2026-10-16). Starts at 1.0.0.
**Family rules that apply:** ow-protocol v1 (`skills-work/ow-protocol.md`); no `ow-review` (labelled same-session self-checks); code only in the `ow-tools` add-on; no public ow- skill names a private skill, and handoffs leaving the family go through the workspace's `handoffs.yaml`; one writer per file.
**Place in the stages:** two ways in. **After a build:** `ow-handoff -offer` (client chooses care) → `ow-handoff -close` writes `care-start.md` → **`ow-care`**. **A takeover** (a system someone else built): `ow-start` (path kind `care-takeover`) → `ow-build-plan -quote --quick --onboarding` (a fixed-fee onboarding review) → **`ow-care -onboard`** → care starts. Care then runs month by month until either side ends it.
**Upstream:** `ow-handoff` (`care-start.md` and its addenda, `after-offer.md`, `operator-notes.md`, `accounts.md`, `fixes/FIX-nn.md` marked `route: care`, `dates.yaml`); `ow-documentation` when bought (`runbook.md`, `docs/handover/`, adoption requests after day 30); `ow-build-plan` for takeovers (`contract-inputs.md`, `build-request.md` of the onboarding quote); the workspace's `offers.md` (`after_handoff`), `profile.md`, `handoffs.yaml`, `brand.yaml`.
**Downstream:** `ow-build-plan` (a request too big for care is quoted separately); the workspace's `build` and `invoice` destinations (`handoffs.yaml`); nothing else. Care is the last stage.

`ow-care` runs a care plan the way the site sells it: a fixed number of hours a month, prepaid, a reply target, a monthly health check and report, a quarter of unused hours rolling over, and 30 days' notice to stop. It keeps every request, hour and access item accounted for, so the client can see where the hours went and nothing outlives the arrangement.

## 1. What it has to honour

| Source | Promise | Where the skill meets it |
|---|---|---|
| /services, `site.ts` care plans | Keep (2 h, reply within 2 business days) · Tune (8 h, 2 days) · Steward (20 h, 1 day). "Prepaid monthly. A quarter of unused hours roll over one month. 30 days' notice to cancel." | Terms frozen from `offers.md` (§3); the hours ledger (§6); the reply record (§5.3); the end rule (§8) |
| /services | "Start with this: Care plans" (care without a build) | Takeover onboarding (§4) |
| Home, FAQ | "Thirty days of fixes … After that, choose a Care plan, hourly help, or a clean handoff." "You're never required to keep me." | Care starts after the fix window (ow-handoff §8); ending care is always available with the notice (§8) |
| fee-structure.md (the owner's terms) | Reporting and meetings use included time; extra hours need advance approval; oldest hours first; no 24/7 cover, no guaranteed resolution time; credit the unavailable portion if reserved capacity can't be delivered; never charge twice for the same work | §6, §5.3, §7, the "No double charge" check |
| ow-handoff §8–§10 | Every offered term is frozen in `after-offer.md`; `care-start.md` carries the start date, kept access with removal steps, carried fixes and waiting `route: care` requests | `-start` reads them unchanged (§3) |

## 2. Owner decisions

| # | Date | Question | Answer |
|---|---|---|---|
| 1 | 2026-10-16 | Scope | `ow-care` ships in v2.1.0 |
| 2 | 2026-10-16 | Who it serves | **After handoff, plus takeovers.** A care-only enquiry goes ow-start → an onboarding review quoted by ow-build-plan → care (§4) |
| 3 | 2026-10-16 | What the client gets each month | **A monthly report:** hours used against included (with rollover), requests done and open, health-check results, the reply-target record, next month's plan; exported as PDF/Word and sent with the invoice (§7) |
| 4 | 2026-10-16 | Health check | **ow-tools checks plus a checklist:** a new read-only `ow-tools health` part runs what it can; the rest is a checklist from the runbook; without ow-tools, all checklist (§5.4, T3) |
| 5 | 2026-10-16 | Hours source | **Recorded per request:** the user records hours on each `CARE-nn` when the work finishes, in quarter-hours; the skill totals them (§6) |
| 6 | 2026-10-16 | Care months | **From the start date** (e.g. the 17th to the 16th); no proration; each month is invoiced in full at its start (§6) |
| 7 | 2026-10-16 | Do the health check and report use hours? | **Yes**, as fee-structure.md says; the report shows them as their own line (§7) |
| 8 | 2026-10-16 | When a month's hours run out | **Ask before extra hours:** work pauses at the limit; the client's email go-ahead approves extra hours at the frozen hourly price, invoiced with the next month (§6) |
| 9 | 2026-10-16 | Takeover onboarding price | **A fixed fee through a quick quote:** ow-build-plan prices an onboarding review sized S/M/L by systems and integrations (a new price-book line, P4) |
| 10 | 2026-10-16 | Rollover rule | **The site's wording governs:** a quarter of the month's own unused hours roll over one month (`share: 0.25, of: unused`). fee-structure.md ("up to 25% of a month's hours") is to be updated to match, outside this repo |
| 11 | 2026-10-16 | Monthly call | **Optional, uses hours:** the report is the default; a monthly call to walk through it is offered, recorded at `-start` (`monthly_call: yes \| no`, changed later by `-change`) and counted as a meeting line in hours (§7) |

## 3. Terms (frozen once)

`-start` writes `care.yaml` once with every term, copied unchanged and never recomputed:

- **After a build:** from `handoffs/<client>/after-offer.md` (the tier chosen, and every tier offered, so a later tier change uses frozen terms) and `care-start.md` (start date, kept access, carried fixes, waiting `route: care` requests), plus any `care-start-addendum-<date>.md`.
- **Takeover:** from the onboarding review's tier recommendation and the client's recorded choice (§4), with terms taken from `offers.md` → `after_handoff` at that moment and frozen in `care.yaml`.

```yaml
# care.yaml (written once by -start; illustrative, every value comes from the frozen offer)
source: handoff | takeover
tier: { name: Tune, hours: 8, reply_business_days: 2, price: <price> }
tiers_offered: [ ... every tier as frozen ... ]
billing: prepaid monthly
rollover: { share: 0.25, of: unused, months: 1 }   # H4: structured form of the offer's wording
notice_days: 30
excluded: [out-of-hours on-call, new builds]
hourly_price: <price>            # extra hours and hourly help
urgent_price: <price>            # only if the offer has one; otherwise urgent work is a normal request
start: 2026-11-17
month_boundary: start-day        # decision 6: M-01 = 2026-11-17 to 2026-12-16
monthly_call: no                 # decision 11: yes when the client wants a call; meeting hours
reply_calendar: { tz: America/Chicago, hours: "09:00-17:00", days: Mon-Fri, holidays: from profile.md }
```

Later changes never edit `care.yaml`: they are dated `terms-addendum-<date>.md` files written by `-change` (§8). Changes to `offers.md` never reach a client already in care unless `-change --terms` records the notice and the client's acceptance.

## 4. Takeover onboarding (decisions 2 and 9)

1. **ow-start** proposes a path of kind `care-takeover` (amendment S1) when the call shows a running system the client wants looked after and no build in scope. Its NEXT is `use ow-build-plan-quote --quick --onboarding on intake/<client>/intake-record.md`.
2. **ow-build-plan** (amendment P4) prices the review from `price-book.yaml` → `care_onboarding` by the number of systems and integrations named in the intake (S/M/L), writes a short scope (the review checklist below) and a fixed-fee quote, and on `--signed` prints `NEXT: use ow-care-onboard on plans/<client>/`.
3. **`/ow-care-onboard`** runs the review and writes `onboarding.md` (client-facing, exported to PDF/Word):

| Part | What it records |
|---|---|
| Systems and integrations | Each system, what it does, who owns the account, how it's deployed; redacted, never a credential |
| Access needed | The least access care needs, requested from the client and recorded by `-access` as granted |
| How it runs | Alerts, run logs, backups and restore, scheduled jobs: present, missing or unknown |
| Health baseline | The first health check (§5.4) |
| Takeover check | Can another developer run it: repository, setup, tests, deploy, rollback, each found (with its path) or missing |
| Risks | What could break and what is unknown, each with its evidence |
| Recommended tier | One tier with the reasons (systems, alerts, change rate, who on the client side can follow the notes); the terms from `offers.md` |
| Fix-first items | Anything that should be fixed before care starts, each routed to care hours once care starts, or to a separate quote |

The review writes the first operator notes for what exists (`-notes`, §5.5). The onboarding fee is invoiced as the quote's payment terms say (default: in full at signature, `INV-request-onboarding.md`). Care starts when the client chooses a tier and a start date; `-start --takeover` records both from the user's report.

## 5. Verbs

Files live under `opchain-work/care/<client>/`. Every file has **one writer verb**; `STATUS.md` and `secrets-seen.log` are the shared append-logs. Every verb starts with the ow-protocol resume step (reads `care.yaml`, the latest month file and `STATUS.md`); with `care.yaml` absent, every verb except `-start` and `-onboard` stops with `NEXT: use ow-care-start`.

| Verb | Does | Writes |
|---|---|---|
| `/ow-care-onboard` | Takeover only: the onboarding review (§4) | `onboarding.md` → `export/onboarding.{pdf,docx}`, `invoices/INV-request-onboarding.md` |
| `/ow-care-start` | Freezes the terms (§3); copies carried fixes and waiting requests in as `CARE-nn`; writes the first month and its invoice request | `care.yaml`, `months/M-01.md` (open), `invoices/INV-request-care-M-01.md` |
| `/ow-care-request` | Logs, classifies and follows each request to its end: received, first reply, estimate, go-ahead for extra hours, hours recorded, done (§5.2) | `requests/CARE-nn.md` |
| `/ow-care-health` | The monthly health check (§5.4); each finding becomes a proposed `CARE-nn` the user accepts or drops | `health/M-nn.md`, `health.yaml` (what to check) |
| `/ow-care-notes` | Care's operator notes: for a takeover, the notes for what exists; after a build, only new or changed entries, each naming the `OP-nn` it replaces (§5.5) | `operator-notes.md` |
| `/ow-care-access` | Access: kept from handoff, granted for a takeover, re-granted for a request, removed or rotated (§8.2) | `access.md` |
| `/ow-care-month` | Closes a month: totals hours, applies rollover, records extra hours and any capacity credit, writes the report and the next month's invoice request (§6, §7) | `months/M-nn.md` (closed), `ledger.md`, `reports/M-nn.md` → `export/report-M-nn.{pdf,docx}`, `invoices/INV-request-care-M-(nn+1).md` |
| `/ow-care-change` | Tier change, terms change, notice to end (either side) (§8) | `terms-addendum-<date>.md` |
| `/ow-care-end` | Ends care when the notice runs out and nothing blocks (§8.3) | `end.md`, `export/end-email.{html,txt}` |

### 5.1 Reads, absent cases and mismatches

| File | Used for | If absent | If it doesn't match |
|---|---|---|---|
| `handoffs/<client>/care-start.md` (+ addenda) | Start date, kept access, carried fixes, waiting requests | After a build: `NEXT: use ow-handoff-close`; takeover: `-start --takeover` reads `onboarding.md` instead | Start date differs from `after-offer.md`: the explicit agreed date in `after-offer.md` wins; both quoted in `care.yaml` |
| `handoffs/<client>/after-offer.md` | Every frozen term and the choice | Takeover: `onboarding.md` and `offers.md` | Choice isn't `care`: `-start` stops and says so |
| `handoffs/<client>/fixes/FIX-nn.md` marked `route: care` | A request that uses care hours | — | Reported before the care start: not care (ow-handoff routes it) |
| `docs/<client>/runbook.md`, `handoffs/<client>/operator-notes.md` | Health checklist, how-to answers | Takeover: care's own notes (§5.5) | Care's `operator-notes.md` entries replace the ones they name |
| `profile.md` | Time zone, working hours, holidays for reply targets | Ask; record as user-stated | — |
| `handoffs.yaml` → `invoice`, `build` | Where invoice requests and work go | Public defaults ("create this invoice in your invoicing tool"; "give `CARE-nn.md` to whoever does the work") | — |
| `plans/<client>/contract-inputs.md` (takeover) | Onboarding fee and payment terms | `-onboard` asks | — |

### 5.2 Requests (`CARE-nn`)

Status: `received → replied → (estimate) → in progress → done`, or `paused: hours used up` (waits for an extra-hours go-ahead or the next month), `quoted separately`, `excluded`, `withdrawn`. Each records: `received` (date and time, as the user reports it), who asked (client role), the request, the class, `first reply` (date and time), the hours recorded (quarter-hours, decision 5), and the month the hours count in.

| Class | Test | Then |
|---|---|---|
| **Care work** | Anything the tier covers: fixes, small changes, maintenance, how-to answers, adoption help, health-check follow-ups | Uses hours. NEXT prints the `build` destination with `CARE-nn.md` |
| **Carried fix** | A covered fix carried in from `care-start.md` | **Free**, no hours (ow-handoff §10). Its held access ends when it's verified |
| **Too big for care** | The estimate is more than the tier's monthly hours, or it needs its own acceptance checks | Recommended `quoted separately`: `NEXT: use ow-build-plan-quote --quick on care/<client>/requests/CARE-nn.md`. It never uses care hours afterwards (no double charge) |
| **Excluded** | Matches the frozen `excluded` list (out-of-hours on-call, new builds) | Not done under care; a new build goes to ow-build-plan; on-call needs a separate arrangement |
| **Urgent** | The client asks for out-of-plan urgent work and `urgent_price` is set | Done only with the client's go-ahead at `urgent_price`, outside the hours; invoiced with the next month |

The classification is a recommendation; the user decides, and the client sees the reason.

### 5.3 Reply target

The target is `reply_business_days` from the frozen tier: the first reply is due by the end of that many working days after the day the request is received, counted with `ow-tools calc date --business-days` on the `reply_calendar`. A request received outside working hours counts as received on the next working day. The report lists each request's first reply against its target; a miss is reported plainly, with no automatic credit (fee-structure.md: no guaranteed resolution time). The target is for a first reply, not a fix.

### 5.4 Health check (decision 4)

`/ow-care-health` builds `health.yaml` once (what to check, from the runbook, operator notes and onboarding review; the user confirms it) and runs each month:

- **With ow-tools** (Claude Code): `ow-tools health --config health.yaml --json` (amendment T3) runs read-only checks: dependency advisories and outdated packages from the repository's lockfiles; TLS certificate expiry and domain expiry for listed public hostnames; an HTTP status check on listed public URLs; the age of a listed backup file where the runbook names one. It never writes to a client system, never uses a credential, and checks only what `health.yaml` lists.
- **Checklist** (always, and the whole check without ow-tools): alerts fired this month and their run-log entries, scheduled jobs, rotations due, vendor notices, access still needed, and anything `ow-tools` couldn't reach. The user records each result as reported.
- Results are `OK`, `attention` (with a proposed `CARE-nn`) or `not checked (reason)`. The time spent is recorded as health-check hours (decision 7).

### 5.5 Operator notes in care

One writer: `-notes` writes `care/<client>/operator-notes.md` in ow-handoff's `OP-nn` form. **Takeover:** it holds the notes for what exists, written from the onboarding review and verified as care goes on. **After a build:** it holds only new or changed entries, each naming the runbook or handoff `OP-nn` it replaces; the original files are never edited. The health check and how-to answers read both, care's entries winning.

## 6. Hours (decisions 5–8)

Months run from the start date (a start day past the end of a shorter month uses that month's last day). For each month, `-month` closes the books from the month's `CARE-nn` hours, the health-check hours and the report hours, using `ow-tools calc hours` (amendment T4) when it can run code, or by hand marked "computed without ow-tools; check it":

- **Available** = rolled in from last month + the tier's hours. **Oldest hours first:** rolled-in hours are used before the month's own.
- **Used** = care work + health check + report and meetings, in quarter-hours.
- **Rollover** = the frozen rule. With the site's wording (`share: 0.25, of: unused`), a quarter of the month's own unused hours roll into the next month only, rounded down to the quarter-hour; rolled-in hours that are still unused lapse.
- **Extra hours** (decision 8): when the next piece of work would go past the available hours, the request is `paused: hours used up`. The client's email go-ahead for a number of extra hours (recorded as reported, like ow-handoff's hourly help) unpauses it; extra hours are priced at the frozen `hourly_price` and invoiced with the next month's invoice request.
- **Capacity credit** (fee-structure.md): when the user records that reserved hours couldn't be delivered (e.g. their own absence while requests waited), the next invoice request carries a credit for those hours at the tier's price per included hour. Never computed automatically.

`ledger.md` (written only by `-month`) keeps one row per month: included, rolled in, used (by kind), extra, rolled over, lapsed, credit, invoice request. It is **not an accounting record** and says so.

**Example** (illustrative tier of 8 hours): M-01 uses 5 h, so 3 h are unused; a quarter of 3 h is 0.75 h, which rolls into M-02. M-02 has 8.75 h available; a request would take it to 10 h, so it pauses at 8.75 h until the client approves 1.25 extra hours, which are invoiced with M-03.

## 7. Monthly report (decision 3)

`reports/M-nn.md` (exported to PDF and Word through ow-tools, sent with the next invoice by the user):

1. **Hours:** available, used by kind (care work, health check, report and meetings), extra approved, rolled over, lapsed, any credit.
2. **Requests:** done this month and still open, each with its first reply against the target and its hours.
3. **Health check:** each result, with what needs attention and the proposed action.
4. **Carried fixes** (after a build): status until verified.
5. **Next month:** the backlog in the order agreed, and anything scheduled (a rotation, a certificate or domain renewal, a vendor change).

**Monthly call** (decision 11): when `monthly_call: yes`, the user walks the client through the report; the time is recorded as a meeting line in the next month's hours. A call is never required to close a month.

No internal numbers: hours shown are only those recorded on `CARE-nn`, health and report lines; prices only as frozen in `care.yaml` or its addenda. Time-tracker exports, rates and margins never appear.

## 8. Changes and ending

### 8.1 Changes (`-change`)

- **Monthly call:** turned on or off from the next month (decision 11).
- **Tier change:** the client's request (as reported) takes effect at the next month's start; the new tier's terms come from `tiers_offered` (frozen). Unused rollover carries under the new tier's rule.
- **Terms change** (your prices or terms change in `offers.md`): recorded with the date the client was told and their acceptance; takes effect at the first month start at least `notice_days` after the notice. Without acceptance, the client stays on the frozen terms or care ends with notice.
- **Notice to end** (either side): care ends at the **end of the care month in which the notice period ends**. Example: months from the 17th, notice on 1 March + 30 days = 31 March, inside the 17 March–16 April month, so care ends 16 April and the 17 April renewal doesn't happen.

### 8.2 Access (`-access`)

`access.md` starts from `care-start.md`'s kept list (after a build) or the onboarding grants (takeover). Every item has a purpose, an owner, a removal step and the end condition "remove when care ends" (or when its request is done, for a re-grant). Rotations and removals are recorded as in ow-handoff §9: `removed <date>, confirmed by <client role>; not verified by this skill`. A carried fix's held access is removed when that fix is verified. The skill deletes nothing; deleting local copies is the user's, recorded as human-decided.

### 8.3 End (`-end`)

`-end` refuses while: the end date hasn't passed; the last month isn't closed; a request is `in progress` (it can be withdrawn, quoted separately or finished); an access item isn't removed (confirmed or waived, as in ow-handoff §10). It writes `end.md` and the end email: the last month's report, every access removal quoted as recorded, open requests offered as hourly help, local copies the user deleted, and that the client keeps everything (repository, accounts, notes). STATUS closes the workstream.

## 9. Self-checks

Each reports OK / FINDING / NOT-CHECKED(reason), labelled *same-session self-check: the same assistant applying a checklist; a discipline, not an independent review*. `-month` and `-end` refuse while any check that runs in them is FINDING. **"No credentials", "People by role", "No double charge" and "No private names" can never be waived.**

| Check | Runs in | Passes when |
|---|---|---|
| Terms frozen | every verb | Every term in a client output traces to `care.yaml` or a `terms-addendum`; nothing recomputed from `offers.md` after `-start` |
| Hours add up | `-month` | Rolled in + included + extra = used + rolled over + lapsed, in quarter-hours; every used hour traces to a `CARE-nn`, health or report line |
| No double charge | `-request`, `-month` | A carried fix uses no hours; a request quoted separately uses no care hours after the quote; no hour counts in two months |
| Go-ahead before extra | `-request`, `-month` | No extra or urgent hour without a recorded go-ahead |
| Reply record | `-month` | Every request received this month has a first reply or "no reply yet", checked against its target |
| Least access | `-access`, `-end` | Every access item has a purpose and a removal step; nothing kept without a reason |
| Read-only health | `-health` | ow-tools ran only what `health.yaml` lists; nothing written to a client system |
| No internal numbers | client outputs | No time exports, internal rates or margins; prices only as frozen |
| People by role | every verb | No person's name or contact details in any file; requesters by client role |
| No credentials | every verb | No password, key or token in any file; secrets by name only |
| No private names | every verb | No blocklisted name (`llc-ops`) and no private skill |

## 10. What this skill never does

Recomputes a frozen term · counts an hour twice or charges for a carried fix · does extra or urgent work without a recorded go-ahead · promises a resolution time · runs a health check that writes to a client system or uses a credential · keeps access without a purpose and a removal step · deletes anything · sends anything to the client · stores a person's name or contact details.

## 11. Acceptance tests

- **Start after a build:** a `care-start.md` with one carried fix and one waiting `route: care` request gives `care.yaml` with the frozen tier, `CARE-01` as a free carried fix, `CARE-02` using hours, and an M-01 invoice request.
- **Start, wrong choice:** `after-offer.md` with `choice: hourly` stops `-start`.
- **Takeover:** a `care-takeover` path → `--quick --onboarding` quote → `-onboard` writes the review with all eight parts, the first health check and the first operator notes; `-start --takeover` freezes the chosen tier.
- **Months:** start 2026-11-17 gives M-01 = 2026-11-17 to 2026-12-16, invoiced in full at the start.
- **Rollover:** the §6 example gives 0.75 h rolled into M-02 and the other 2.25 h lapsing at the end of M-01; a rolled-in hour still unused at the end of M-02 lapses.
- **Extra hours:** work past the available hours pauses; with an email go-ahead for 1.25 h, the hours are invoiced with M-03; without one, `-month` refuses to count them.
- **Too big:** a 12-hour request on an 8-hour tier is recommended for a separate quote; after `quoted separately`, no care hour is recorded against it.
- **Reply target:** a request received Friday 18:00 on a 2-business-day target with Monday a holiday counts as received Tuesday and is due by the end of Thursday; a reply on Friday is reported as a miss.
- **Health:** with ow-tools, the certificate-expiry check reports a certificate expiring in 20 days as `attention` with a proposed request; without ow-tools, the same check is a checklist item.
- **End:** notice on 1 March gives an end of 16 April (months from the 17th); `-end` refuses while kept access isn't removed.
- **Internal numbers:** a time-export total planted in a report fails; hours from `CARE-nn` pass.
- **Private names:** with an empty `handoffs.yaml`, no output names `llc-ops` or "Deftwright".
- **Real use:** one real Deftwright care month, closed with its report.

## 12. Amendments this needs in other designs (approve with this design)

| # | Design | Amendment |
|---|---|---|
| T3 | `ow-tools` | A new read-only `health` part: `ow-tools health --config <file> --json` checks dependency advisories and outdated packages from lockfiles (npm, pnpm, yarn; Python only if `pip-audit` is installed), TLS certificate expiry and domain expiry (RDAP) for listed hostnames, HTTP status for listed URLs, and a listed backup file's age. Node built-ins; no credentials; checks only what the config lists; `doctor` reports what it can run |
| T4 | `ow-tools` | `calc hours --ledger <file.json> --rollover <share>,<of>,<months>`: month totals in integer minutes (available, used by kind, extra, rolled over, lapsed), oldest hours first |
| H4 | `ow-handoff` | `offers.md` → `after_handoff` gains a structured `rollover: { share, of: unused \| included, months }` beside its wording, and an optional `urgent_price`; `-offer` freezes both into `after-offer.md` |
| S1 | `ow-start` | A new path kind `care-takeover` (with `kind` in `offers.md` and `path_kind` in the intake record); its NEXT is `use ow-build-plan-quote --quick --onboarding`; the example `offers.md` gains a care path |
| P4 | `ow-build-plan` | `price-book.yaml` gains `care_onboarding: { sizes: { S, M, L }, size_by_systems: {…}, payment: on_signature \| on_delivery }`; `-quote --quick --onboarding` writes the review scope (§4's parts) and a fixed-fee quote; `--signed` prints `NEXT: use ow-care-onboard on plans/<client>/` instead of the build NEXT. Like a feasibility quote (ow-build-plan amendment of 2026-10-16), it carries no user acceptance testing line, fix window, documentation & training line or build hand-off; its scope goes in `quick-scope.md`. |

## 13. Open questions

None. Decisions 10–11 (2026-10-16) closed the rollover wording and the monthly call. Follow-up outside this repo: update deftwright-site `docs/planning/fee-structure.md` to the site's rollover wording.
