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
    - { name: Keep, hours: 2, reply_business_days: 2, price: 900 }
    - { name: Tune, hours: 8, reply_business_days: 2, price: 3200 }
    - { name: Steward, hours: 20, reply_business_days: 1, price: 7600 }
  billing: prepaid monthly
  rollover: { share: 0.25, of: unused, months: 1 }
  rollover_wording: a quarter of the unused hours roll over for one month
  notice_days: 30
  excluded: [out-of-hours on-call, new builds]
  hourly_help: { price: 250 }
  urgent_price: 350
```
