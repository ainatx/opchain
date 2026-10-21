---
ow_artefact: ow-documentation/handover
schema: 1
written_by: ow-documentation 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: docs/larkspur-ceramics/docs.yaml
created: 2027-02-05
clock: user-stated
origin: skill
---
# Configuration: Larkspur Ceramics

## Configuration

The service reads `MAILBOX_ADDRESS`, `ORDER_SHEET_ID` and `QBO_CLIENT_ID`; every setting is named in `.env.example`.

## Secrets (names only)

`MAILBOX_PASSWORD`, `QBO_CLIENT_SECRET` and `SHOP_API_TOKEN` are set in the hosting provider's secret settings. Their values are never written in a document.

## Open items

None.

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
