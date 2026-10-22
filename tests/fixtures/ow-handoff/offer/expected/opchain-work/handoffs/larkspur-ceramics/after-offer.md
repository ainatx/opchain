---
ow_artefact: ow-handoff/after-offer
schema: 1
written_by: ow-handoff 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: offers.md
created: 2027-03-05
clock: user-stated
origin: skill
choice: care
---
# After handoff: Larkspur Ceramics

## Recommendation

Monthly care. Signals: six accounts and two integrations (accounts.md); three alerts configured, of which import_stalled fired twice during the build (alerts.yaml; builds/larkspur-ceramics/updates/2026-12-04.txt); the operations manager can follow the runbook (docs/larkspur-ceramics/runbook.md); one declined change order (builds/larkspur-ceramics/changes/CO-03.md); QuickBooks Online changes its app settings often (plans/larkspur-ceramics/systems/quickbooks-online.md).

Decide by 2027-03-23, the access-removal date.

## Frozen terms

```yaml
care_tiers:
  - { name: Light, hours: 3, reply_business_days: 3, price: 1500 }
  - { name: Regular, hours: 6, reply_business_days: 2, price: 3000 }
  - { name: Full, hours: 15, reply_business_days: 1, price: 6000 }
billing: prepaid monthly
rollover: { share: 0.5, of: unused, months: 1 }
rollover_wording: half of the unused hours roll over for one month
notice_days: 30
excluded: [out-of-hours on-call, new builds]
hourly_help: { price: 1000 }
urgent_price: 1200
source: offers.md after_handoff, read 2027-03-05
```

## Choices

- 2027-03-05 choice: care, tier Regular; decided_on 2027-03-05; recorded_by Robin; care start: the day after window_end (2027-03-27); ow-care: not installed (the user, 2027-03-05). This is a working note made by an AI assistant at your instruction. It is not a signature or an official record.

## Self-checks
Self-checks (same-session self-check, not an independent review): No credentials OK · No internal numbers OK · No private names OK
