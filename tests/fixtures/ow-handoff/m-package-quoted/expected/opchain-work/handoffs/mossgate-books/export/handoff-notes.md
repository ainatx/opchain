# Handoff notes: Mossgate Books

## Your accounts

| What | Owner | Billing | Runs as | Recovery | Where you keep the login |
|---|---|---|---|---|---|
| The repository | builder (moving to you: pending) | you | n/a | you | your password manager, entry Repository |
| Hosting | you | builder (moving to you: pending) | n/a | you | your password manager, entry Hosting |
| The till export connection | you (to confirm) | you | builder (moving to you: pending) | builder (moving to you: pending) | your password manager, entry Till |

## Operator notes

Eight entries: OP-01 The weekly report did not arrive; OP-02 The reorder form stopped saving; OP-03 The hosting dashboard shows the service down; OP-04 Check the weekly report ran; OP-05 Check the till export connection ran; OP-06 Check a reorder reaches the spreadsheet; OP-07 Rotate TILL_API_TOKEN; OP-08 Rotate REORDER_SHEET_KEY. Each says when, what to check, what to do and who to contact.

As the shop manager asked: "Please tell whoever runs the reorder form on weekends to check the spreadsheet before saving."

If something fails: the shop manager, business hours only; out-of-hours on-call is not included.

## Acceptance record

Deemed accepted on 7 December 2026 under the contract's deemed-acceptance clause, on request 1. Every check in the agreed basis passed (AC-1.1, AC-1.2, AC-2.1) on build mossgate-uat-1.

## Taking it over

- **Where the code lives:** the repository at `mossgate-repo` (README.md).
- **How to run the tests:** `npm test` (README.md#tests). Last test result: passing, as reported.
- **How to deploy:** `npm run deploy` (README.md#deploy).
- **Where the docs are:** `docs/runbook.md`.
- **Committed secrets:** this repository has not been scanned for committed secrets.

## Your fixes

A fix is anything in the agreed scope that does not work as its acceptance check says. Report it by email with what you saw and when.

30 days from the day you receive these notes, until 15 January 2027 (provisional).

## What happens next

No choice is recorded yet. The three options, with their terms as offered: monthly care (Light, Regular or Full), hourly help, or no ongoing arrangement. Please decide by 12 January 2027 (provisional), the day the builder's access is removed.
