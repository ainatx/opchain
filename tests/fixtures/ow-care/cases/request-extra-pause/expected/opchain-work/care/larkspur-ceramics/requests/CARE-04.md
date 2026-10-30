---
ow_artefact: ow-care/request
schema: 1
written_by: ow-care 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: the client's message
created: 2026-12-18
clock: user-stated
origin: skill
---
id: CARE-04
received: 2026-12-18 10:00 (clock: user-stated)
requester: operations manager
class: covered care
status: paused: hours used up
estimate_minutes: 600
first_reply: 2026-12-21 09:30
effective_received: 2026-12-18
reply_due: 2026-12-22
reply_status: on time
hours_minutes: 480
month_id: M-02

## The request

"Rework the export for the new accounting field." (operations manager)

## Events

- 2026-12-18 received 10:00 from operations manager (clock: user-stated)
- 2026-12-21 first reply 09:30 (reported by Robin)
- 2026-12-21 estimate: 600 minutes (reported by Robin)
- 2026-12-21 class: covered care (decided by Robin; reason: a bounded rework of an existing export, within the tier)
- 2027-01-13 hours: 480 minutes counted in M-02 (recorded by Robin)
- 2027-01-13 paused: hours used up (525 of 525 minutes available in M-02 are used; the next piece needs more)

This is a working note made by an AI assistant at your instruction. It is not a signature or an official record.

<!-- ow:internal -->
command: ow-tools calc date --from 2026-12-18 --business-days 2 --holidays 2026-11-23
result: 2026-12-22
<!-- ow:end-internal -->
