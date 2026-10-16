---
ow_artefact: ow-build-plan/acceptance
schema: 1
written_by: ow-build-plan 1.0.0 (protocol 1)
workstream: fernhill-florists
subject: plans/fernhill-florists/scope.md
created: 2026-11-06
clock: user-stated
origin: skill
---
# Acceptance checks: Fernhill Florists

INVENTED TEST FIXTURE: abridged to what the quote reads.

## WP-1 Wedding orders in one shared list instead of the paper diary

### AC-1.1
- when: a wedding order is taken by phone
- then: it is in the shared list once, with the date, the address and the flowers, and nobody copies it into a diary
- how we check: enter the 9 orders from diary week 44; all 9 are in the list, correct
- test data: diary week 44 (E-01)
- cases: 9
- kind: normal

### AC-1.2
- when: an order is entered for a date that has passed
- then: the list refuses it and says why
- how we check: enter 2 orders dated last week; both are refused
- test data: 2 orders made for the test
- cases: 2
- kind: error

## WP-2 The van driver's list for the day, from the orders

### AC-2.1
- when: the driver opens the day's list
- then: it shows that day's deliveries in order, including a change made after eight in the morning
- how we check: change 1 of 4 test deliveries at 08:30; the driver's list shows the change
- test data: 4 deliveries made for the test
- cases: 4
- kind: normal
