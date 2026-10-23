---
ow_artefact: ow-care/request
schema: 1
written_by: ow-care 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: the client's message
created: 2027-03-18
clock: user-stated
origin: skill
---
id: CARE-05
received: 2027-03-18 10:00 (clock: user-stated)
requester: operations manager
class: covered care
status: done
estimate_minutes: 540
first_reply: 2027-03-18 15:00
effective_received: 2027-03-18
reply_due: 2027-03-22
reply_status: on time
hours_minutes: 510
month_id: M-05

## The request

"Add a courier option to the pick list." (operations manager)

## Events

- 2027-03-18 received 10:00 from operations manager (clock: user-stated)
- 2027-03-18 first reply 15:00 (reported by Robin)
- 2027-03-19 estimate: 540 minutes (reported by Robin)
- 2027-03-19 class: covered care (decided by Robin; reason: a bounded change within the tier)
- 2027-03-30 hours: 480 minutes counted in M-05 (recorded by Robin)
- 2027-03-30 paused: hours used up (525 of 525 minutes available in M-05 are used; the next piece needs more)
- 2027-03-31 go-ahead: 75 minutes extra at 250 per hour (USD 312.50), by operations manager, as reported by Robin, email of 2027-03-30, ref: go-ahead-2027-03-30, for M-05
- 2027-03-31 hours: 30 minutes counted in M-05 (recorded by Robin)
- 2027-04-02 status: done (verified by the operations manager, as reported)

This is a working note made by an AI assistant at your instruction. It is not a signature or an official record.

<!-- ow:internal -->
command: ow-tools calc date --from 2027-03-18 --business-days 2 --holidays 2026-11-23
result: 2027-03-22
<!-- ow:end-internal -->
