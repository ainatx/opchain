---
ow_artefact: ow-handoff/care-start
schema: 1
written_by: ow-handoff 1.0.2 (protocol 1)
workstream: larkspur-ceramics
subject: after-offer.md
created: 2027-04-16
clock: user-stated
origin: skill
---
care_start: 2027-01-31
tier: Regular
reply_business_days: 2
terms: after-offer.md (frozen 2027-04-01)
window_end: 2027-01-30
# Care start: Larkspur Ceramics

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
```

## Kept access

- AX-14 The builder's read access to the run logs: remove the read access in the hosting console; remove when care ends

## Carried fixes

- FIX-01 covered fix, verified work waits until care start (reported 2027-04-15 10:00 by the operations manager)

## Waiting requests

- FIX-02 route: care, a report tweak (reported 2027-04-17 09:30 by the operations manager)

## Operator notes

OP-01 to OP-04 in operator-notes.md.

## Accounts

The repository, Hosting, The orders mailbox (by role, no logins: accounts.md).
