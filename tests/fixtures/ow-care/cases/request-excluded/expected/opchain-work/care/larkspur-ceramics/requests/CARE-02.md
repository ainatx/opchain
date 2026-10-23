---
ow_artefact: ow-care/request
schema: 1
written_by: ow-care 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: the client's message
created: 2026-11-18
clock: user-stated
origin: skill
---
id: CARE-02
received: 2026-11-18 14:00 (clock: user-stated)
requester: operations manager
class: excluded
status: excluded
first_reply: 2026-11-19 09:00
effective_received: 2026-11-18
reply_due: 2026-11-20
reply_status: on time
hours_minutes: 0
month_id: M-01

## The request

"Could someone be on call on Saturdays when the shop runs its sale?" (operations manager)

## Events

- 2026-11-18 received 14:00 from operations manager (clock: user-stated)
- 2026-11-19 first reply 09:00 (reported by Robin)
- 2026-11-19 class: excluded (decided by Robin; reason: excluded: out-of-hours on-call is on the frozen exclusion list; not done under care; it needs a separate arrangement)

This is a working note made by an AI assistant at your instruction. It is not a signature or an official record.

<!-- ow:internal -->
command: ow-tools calc date --from 2026-11-18 --business-days 2 --holidays 2026-11-23
result: 2026-11-20
<!-- ow:end-internal -->
