---
ow_artefact: ow-care/request
schema: 1
written_by: ow-care 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: the client's message
created: 2026-11-20
clock: user-stated
origin: skill
---
id: CARE-01
received: 2026-11-20 10:00 (clock: user-stated)
requester: operations manager
class: covered care
status: done
estimate_minutes: 210
first_reply: 2026-11-20 14:00
effective_received: 2026-11-20
reply_due: 2026-11-25
reply_status: on time
hours_minutes: 210
month_id: M-01

## The request

"Small change 1." (operations manager)

## Events

- 2026-11-20 received 10:00 from operations manager (clock: user-stated)
- 2026-11-20 first reply 14:00 (reported by Robin)
- 2026-11-21 estimate: 210 minutes (reported by Robin)
- 2026-11-21 class: covered care (decided by Robin; reason: a small change within the tier)
- 2026-11-28 hours: 210 minutes counted in M-01 (recorded by Robin)
- 2026-11-29 status: done (verified by the operations manager, as reported)

This is a working note made by an AI assistant at your instruction. It is not a signature or an official record.

<!-- ow:internal -->
command: ow-tools calc date --from 2026-11-20 --business-days 2 --holidays 2026-11-23
result: 2026-11-25
<!-- ow:end-internal -->
