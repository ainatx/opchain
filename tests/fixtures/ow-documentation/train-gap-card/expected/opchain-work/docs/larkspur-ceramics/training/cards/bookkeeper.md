---
ow_artefact: ow-documentation/card
schema: 1
written_by: ow-documentation 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: docs/larkspur-ceramics/guides/bookkeeper.md
created: 2027-03-04
clock: user-stated
origin: skill
role: bookkeeper
---
# Quick reference: bookkeeper

## Every day

1. Open QuickBooks Online at the end of the day. [SC-12 step 1]
2. Check the day's invoices against the confirmed orders. [SC-12 step 2]
3. Find an invoice for each confirmed order. [SC-06 step 2]
4. Expect no invoice for an order from an unknown customer. [SC-07]
5. Tell the operations manager about an invoice that does not match. [map/roles.md bookkeeper]

## When something looks wrong

No invoices at all after 18:00: the invoice push failed; the operator's runbook says what to check. [alerts.yaml]

A credit note is matched to its invoice by the invoice number printed on it. [RG-01]

Came up in the rollout: RG-01.

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
