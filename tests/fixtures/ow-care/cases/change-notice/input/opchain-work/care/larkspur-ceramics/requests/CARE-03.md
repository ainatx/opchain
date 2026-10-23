---
ow_artefact: ow-care/request
schema: 1
written_by: ow-care 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: the client's message
created: 2027-01-20
clock: user-stated
origin: skill
---
id: CARE-03
received: 2027-01-20 10:00 (clock: user-stated)
requester: operations manager
class: covered care
status: done
estimate_minutes: 210
first_reply: 2027-01-20 14:00
effective_received: 2027-01-20
reply_due: 2027-01-22
reply_status: on time
hours_minutes: 210
month_id: M-03

## The request

"Small change 3." (operations manager)

## Events

- 2027-01-20 received 10:00 from operations manager (clock: user-stated)
- 2027-01-20 first reply 14:00 (reported by Robin)
- 2027-01-21 estimate: 210 minutes (reported by Robin)
- 2027-01-21 class: covered care (decided by Robin; reason: a small change within the tier)
- 2027-01-28 hours: 210 minutes counted in M-03 (recorded by Robin)
- 2027-01-29 status: done (verified by the operations manager, as reported)

This is a working note made by an AI assistant at your instruction. It is not a signature or an official record.

<!-- ow:internal -->
command: ow-tools calc date --from 2027-01-20 --business-days 2 --holidays 2026-11-23
result: 2027-01-22
<!-- ow:end-internal -->
