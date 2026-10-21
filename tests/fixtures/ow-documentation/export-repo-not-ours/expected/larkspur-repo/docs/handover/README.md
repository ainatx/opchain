# Developer handover: Larkspur Ceramics

## What was built

The order intake service, larkspur-orders: purchase orders from the orders mailbox into the order sheet, an exceptions list, the confirmation view, and the day's orders into QuickBooks Online as invoices. [spec/scope-and-milestones.md]

## Architecture

Email carries each purchase order as a PDF; the service reads it and writes its lines to the order sheet; QuickBooks Online receives the day's confirmed orders as invoices once a day. [spec/02-architecture.md]

## Where things are

- How to deploy: `docs/deploy.md`.
- The run log and how to read it: `docs/run-log.md`.
- The alerts: `alerts.yaml`.
- The CI run: `.github/workflows/ci.yml`.
- Every setting, by name: `.env.example`.

## In this handover

- [Run and deploy](run-and-deploy.md)
- [Configuration and secrets](configuration.md)
- [Decisions and limits](decisions.md)

## Open items

None.
