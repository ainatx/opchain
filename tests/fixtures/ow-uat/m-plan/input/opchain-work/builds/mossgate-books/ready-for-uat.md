---
ow_artefact: ow-build/ready-for-uat
schema: 1
written_by: ow-build 1.0.0 (protocol 1)
workstream: mossgate-books
subject: builds/mossgate-books/build.yaml
created: 2026-11-09
clock: user-stated
origin: skill
client: Mossgate Books
ready: yes
checks_total: 3
checks_passing: 3
build_label: mossgate-uat-1 (user-stated)
environment: a copy of the shop's shared folder and the reorder spreadsheet (user-stated)
---
# Ready for user acceptance testing: Mossgate Books

INVENTED TEST FIXTURE: the build marked ready, in the shape ow-build writes it, as the starting state for ow-uat's Mossgate cases.

Ready: 3 of 3 checks pass, in the builder's reports and in the confirmation pass on 9 November 2026. This marks no payment and is not an acceptance record.

## Milestones demoed
| milestone | demo record |
|---|---|
| M1 | 6 November 2026 (demos/M1-record.md) |

## Builder's run
| check | result | test data | cases passed | from |
|---|---|---|---|---|
| AC-1.1 | pass | 2 weekly till exports the shop sends (2) | 2 of 2 | sprint 1 report; confirmation pass 2026-11-09 |
| AC-1.2 | pass | an empty folder (1) | 1 of 1 | sprint 1 report; confirmation pass 2026-11-09 |
| AC-2.1 | pass | 5 titles from last month's paper reorders (1) | 1 of 1 | sprint 1 report; confirmation pass 2026-11-09 |

## Test environment
A copy of the shop's shared folder and the reorder spreadsheet.

## Known issues
- None.

## Test data
Two weekly till exports and last month's paper reorders, by pointer; no records are copied here.

## Build label
mossgate-uat-1
