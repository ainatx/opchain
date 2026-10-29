---
ow_artefact: ow-care/request
schema: 1
written_by: ow-care 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: the client's message
created: 2027-04-17
clock: user-stated
origin: skill
---
id: CARE-02
received: 2027-04-17 09:30 (clock: user-stated)
requester: operations manager
class: covered care
status: received
source: handoffs/larkspur-ceramics/fixes/FIX-02.md
first_reply: no reply yet
effective_received: 2027-04-19
reply_due: 2027-04-21
reply_status: no reply yet
hours_minutes: 0
month_id: M-01

## The request

"Could the weekly report show the kiln number?" (operations manager), the waiting route care request FIX-02.

## Events

- 2027-04-17 received 09:30 from operations manager (clock: user-stated)
- 2027-04-17 class: covered care (decided by Robin; reason: a waiting route care request; it uses care hours)

This is a working note made by an AI assistant at your instruction. It is not a signature or an official record.

<!-- ow:internal -->
command: ow-tools calc date --from 2027-04-19 --business-days 2 --holidays 2027-05-31
result: 2027-04-21
<!-- ow:end-internal -->
