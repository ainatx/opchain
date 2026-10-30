---
ow_artefact: ow-start/offers
schema: 1
written_by: user
workstream: larkspur-ceramics
subject: offers.md
created: 2026-10-01
clock: user-stated
origin: user
---
# Offers (the user's own terms)

## After handoff

```yaml
after_handoff:
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
```
