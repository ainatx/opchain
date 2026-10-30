---
ow_artefact: ow-care/request
schema: 1
written_by: ow-care 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: the client's message
created: 2027-04-15
clock: user-stated
origin: skill
---
id: CARE-01
received: 2027-04-15 10:00 (clock: user-stated)
requester: operations manager
class: carried fix
status: in progress
source: handoffs/larkspur-ceramics/fixes/FIX-01.md
first_reply: 2027-04-15 15:00
effective_received: 2027-04-15
reply_due: 2027-04-19
reply_status: on time
hours_minutes: 0
month_id: M-01

## The request

"The order total on the pick list rounds the wrong way." (operations manager), carried from the handoff fix window as FIX-01.

## Events

- 2027-04-15 received 10:00 from operations manager (clock: user-stated)
- 2027-04-15 first reply 15:00 (reported by Robin)
- 2027-04-17 class: carried fix (decided by Robin; reason: a covered fix carried from care-start.md; free, it uses no care hours)
- 2027-04-17 status: in progress (the work is done; verification waits for the operations manager)

This is a working note made by an AI assistant at your instruction. It is not a signature or an official record.

<!-- ow:internal -->
command: ow-tools calc date --from 2027-04-15 --business-days 2 --holidays 2027-05-31
result: 2027-04-19
<!-- ow:end-internal -->
