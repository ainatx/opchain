---
ow_artefact: ow-care/request
schema: 1
written_by: ow-care 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: the client's message
created: 2026-11-17
clock: user-stated
origin: skill
---
id: CARE-01
received: 2026-11-17 10:00 (clock: user-stated)
requester: operations manager
class: covered care
status: done
estimate_minutes: 180
first_reply: 2026-11-18 09:40
effective_received: 2026-11-17
reply_due: 2026-11-19
reply_status: on time
hours_minutes: 210
month_id: M-01

## The request

"The orders export takes minutes to open. Can it be made faster?" (operations manager)

## Events

- 2026-11-17 received 10:00 from operations manager (clock: user-stated)
- 2026-11-18 first reply 09:40 (reported by Robin)
- 2026-11-18 estimate: 180 minutes (reported by Robin)
- 2026-11-18 class: covered care (decided by Robin; reason: a small fix to an existing export, within the tier)
- 2026-11-24 status: in progress
- 2026-12-02 hours: 210 minutes counted in M-01 (recorded by Robin)
- 2026-12-03 status: done (verified by the operations manager, as reported)

This is a working note made by an AI assistant at your instruction. It is not a signature or an official record.

<!-- ow:internal -->
command: ow-tools calc date --from 2026-11-17 --business-days 2 --holidays 2026-11-23
result: 2026-11-19
<!-- ow:end-internal -->
