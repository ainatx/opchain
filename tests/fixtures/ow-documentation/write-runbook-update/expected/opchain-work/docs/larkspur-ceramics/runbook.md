---
ow_artefact: ow-documentation/runbook
schema: 1
written_by: ow-documentation 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: docs/larkspur-ceramics/docs.yaml
created: 2027-02-04
clock: user-stated
origin: skill
ops: [OP-01, OP-02, OP-03, OP-04, OP-05, OP-06, OP-07, OP-10]
---
# Runbook: Larkspur Ceramics

## Users and permissions

The order coordinator settles the exceptions list; the operations manager reads the confirmation view and owns the alerts; the bookkeeper checks the invoices. Logins come from the operations manager. [map/roles.md operations manager]

## Settings

The service reads its settings by name: `MAILBOX_ADDRESS`, `ORDER_SHEET_ID`, `QBO_CLIENT_ID`. Their values live in the hosting provider's secret settings, never in a document. [.env.example]

## Operator tasks

### OP-01: An order email could not be read

- **When:** the `order_email_unreadable` alert arrives (5 unreadable order emails in an hour)
- **Check:** open the exceptions list and the run log, `logs/runs.log`, and find the emails' lines
- **Do:** for each email with an image instead of a PDF, ask the customer for the purchase order as a PDF; settle the line when it arrives
- **If that fails:** the operations manager, business hours only
- **Source:** alerts.yaml: order_email_unreadable; SC-02

### OP-02: Orders stopped arriving

- **When:** the `import_stalled` alert arrives (no order imported for 2 hours on a weekday between 07:00 and 19:00)
- **Check:** open `logs/runs.log` and read the last run's line
- **Do:** if the last line is older than 15 minutes, tell whoever hosts the service the import is not running; send nothing again
- **If that fails:** the operations manager, business hours only
- **Source:** alerts.yaml: import_stalled; docs/run-log.md

### OP-03: Invoices did not reach QuickBooks Online

- **When:** the `invoice_push_failed` alert arrives (the push failed 3 times in a row)
- **Check:** open `logs/invoice-push.log` and read the error line
- **Do:** if the error says the connection expired, ask the operations manager to authorise the connection again in QuickBooks Online's app settings; the next push sends the day's invoices
- **If that fails:** the bookkeeper and the operations manager, business hours only
- **Source:** alerts.yaml: invoice_push_failed; docs/run-log.md

### OP-04: Check the order import ran

- **When:** each morning
- **Check:** `logs/runs.log` has a line every 15 minutes since 07:00
- **Do:** nothing when the lines are there; otherwise see OP-02
- **If that fails:** the operations manager
- **Source:** docs/run-log.md

### OP-05: Check the invoice push ran

- **When:** each evening after 18:00
- **Check:** `logs/invoice-push.log` has a line for today
- **Do:** nothing when the line is there; otherwise see OP-03
- **If that fails:** the bookkeeper
- **Source:** docs/run-log.md

### OP-06: Retry an order the import skipped

- **When:** an order is in the orders mailbox but not in the sheet and not on the exceptions list
- **Check:** `logs/runs.log` for the run after the email arrived
- **Do:** forward the email to the orders mailbox again; the next run picks it up
- **If that fails:** the operations manager
- **Source:** SC-01 step 1; docs/run-log.md

### OP-07: Check an order reaches the sheet

- **When:** after any change to the service
- **Check:** the order sheet, 15 minutes after a test purchase order is sent
- **Do:** send one test purchase order and find its lines in the sheet
- **If that fails:** whoever builds it, through the operations manager
- **Source:** AC-1.1; SC-01

### OP-10: A shipping label did not print

- **When:** the `label_print_failed` alert arrives (a shipping label fails to print twice for one order)
- **Check:** the order sheet's label column for that order
- **Do:** print the label again from the order sheet; if it fails again, write the address on the parcel by hand from the order sheet
- **If that fails:** the operations manager, business hours only
- **Source:** alerts.yaml: label_print_failed

## Run logs

The order import writes one line per run to `logs/runs.log`; the invoice push writes to `logs/invoice-push.log`. A line reads: the time, `import ok`, the number of orders and of exceptions. [docs/run-log.md]

## Monthly and quarterly tasks

- Each month, go through the exceptions-list totals with the operations manager. [user-stated 2027-02-04]

## Vendor-side settings

- The QuickBooks Online connection is authorised in QuickBooks Online's app settings and must be authorised again every 100 days. [user-confirmed 2027-02-04]

## Backups and restore

not applicable: the build keeps no copy of its own; the order sheet's version history is the client's. [spec/02-architecture.md]

## Rotating secrets

Rotating a secret is in the Handoff notes, under Operator notes: each secret is named there with where it is used and how to confirm the change. Nothing is rotated from this runbook.

## Open items

- No rollback steps were found in README.md or docs/: ask whoever built it before the first deploy.

<!-- ow:internal -->
## Self-checks (not for the client)

Same-session self-check: the same assistant that wrote it, applying a checklist; a discipline, not an independent review. Agent-checked.

| check | result |
| --- | --- |
| Trace | OK |
| Coverage | OK |
| People by role or id | OK |
| No credentials | OK |
| No internal numbers | OK |
| No private names | OK |
<!-- ow:end-internal -->
