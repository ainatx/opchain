---
ow_artefact: ow-handoff/handoff-notes
schema: 1
written_by: ow-handoff 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: handoffs/larkspur-ceramics/package.yaml
created: 2027-02-17
clock: user-stated
origin: skill
---
# Handoff notes: Larkspur Ceramics

## Your accounts

| What | Owner | Billing | Runs as | Recovery | Where you keep the login |
|---|---|---|---|---|---|
| The repository | builder (moving to you: pending) | you | n/a | you | your password manager, entry Repository |
| Hosting | you | you | n/a | you | your password manager, entry Hosting |
| The orders mailbox | you (to confirm) | you | n/a | you | your password manager, entry Orders mailbox |
| The order sheet | you | you | n/a | you | your password manager, entry Order sheet |
| QuickBooks Online connection | you | you | builder (moving to you: pending) | you | your password manager, entry QuickBooks Online |
| The order import job | you | you | you | you | not applicable |

## Operator notes

The runbook delivered with your documents holds every operator task: OP-01 An order email could not be read; OP-02 Orders stopped arriving; OP-03 Invoices did not reach QuickBooks Online; OP-04 Check the order import ran; OP-05 Check the invoice push ran; OP-06 Retry an order the import skipped; OP-07 Check an order reaches the sheet. Three rotation steps follow it: OP-08 Rotate MAILBOX_PASSWORD; OP-09 Rotate QBO_CLIENT_SECRET; OP-10 Rotate SHOP_API_TOKEN.

If something fails: the operations manager, business hours only; out-of-hours on-call is not included.

## Acceptance record

Signed on 27 January 2027 by the operations manager on request 2. Every check in the agreed basis passed (AC-1.1, AC-1.2, AC-2.1, AC-3.1, AC-4.1, AC-5.1, AC-5.2, AC-CO-01.1, AC-CO-01.2), on build larkspur-uat-4; evidence by cleared pointer only (ops-T1-sc04-confirmation-view.png).

Change order CO-04, accepted after sign-off: AC-CO-04.1 passed, confirmed on 9 February 2027.

## Taking it over

- **Where the code lives:** the repository at `larkspur-repo` (README.md).
- **How to run the tests:** `npm test` (README.md#tests); the CI run (`.github/workflows/ci.yml`) runs the same tests on every push. Last test result: passing, as reported.
- **How to deploy:** `npm run deploy:staging`, then `npm run deploy` (docs/deploy.md).
- **Where the docs are:** the developer handover in `docs/handover/`, as delivered (README.md, configuration.md, decisions.md, run-and-deploy.md).
- **Committed secrets:** the repository's history was scanned in redacted form; one finding (config/settings.js, line 12) is listed for rotation.

## Your fixes

A fix is anything in the agreed scope that does not work as its acceptance check says. Report it by email with what you saw and when.

30 days from the day you receive these notes, until 26 March 2027.

Change order CO-04: 30 days from 9 February 2027, until 11 March 2027.

Open now: FIX-01 and FIX-02, from the punch list.

## What happens next

No choice is recorded yet. The three options, with their terms as offered: monthly care (Light, Regular or Full), hourly help, or no ongoing arrangement. Please decide by 23 March 2027, the day the builder's access is removed.
