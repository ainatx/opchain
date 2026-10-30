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
received: 2026-11-18 19:30 (clock: user-stated)
requester: operations manager
class: urgent
status: done
first_reply: 2026-11-19 08:50
effective_received: 2026-11-19
reply_due: 2026-11-24
reply_status: on time
hours_minutes: 0
month_id: M-01

## The request

"Checkout is down since 19:00." (operations manager)

## Events

- 2026-11-18 received 19:30 from operations manager (clock: user-stated)
- 2026-11-19 first reply 08:50 (reported by Robin)
- 2026-11-19 class: urgent (decided by Robin; reason: work outside hours at the frozen urgent price, with the client's go-ahead)
- 2026-11-19 go-ahead: 60 minutes urgent at 350 per hour (USD 350.00), by operations manager, as reported by Robin, email of 2026-11-19, ref: urgent-2026-11-19, for M-01
- 2026-11-19 urgent: 60 minutes done, billed at the urgent price with the next month's invoice request, not counted in the included hours
- 2026-11-19 status: done (verified by the operations manager, as reported)

This is a working note made by an AI assistant at your instruction. It is not a signature or an official record.

<!-- ow:internal -->
command: ow-tools calc date --from 2026-11-19 --business-days 2 --holidays 2026-11-23
result: 2026-11-24
<!-- ow:end-internal -->
