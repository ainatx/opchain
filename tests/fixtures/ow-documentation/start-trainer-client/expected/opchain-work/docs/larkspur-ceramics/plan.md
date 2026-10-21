---
ow_artefact: ow-documentation/plan
schema: 1
written_by: ow-documentation 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: docs/larkspur-ceramics/docs.yaml
created: 2027-01-28
clock: user-stated
origin: skill
documents: [guides, sops, runbook, handover]
training: [deck, facilitator, modules, cards, videos]
order: [guides, sops, runbook, handover, deck, facilitator, modules, cards, videos]
left_out: []
---
# Documentation plan: Larkspur Ceramics

## Documents

| type | file | for | from |
|---|---|---|---|
| guides | guides/order-coordinator.md | order coordinator | SC-01, SC-02, SC-03, SC-05, SC-10; UAT-01 |
| guides | guides/operations-manager.md | operations manager | SC-04, SC-08, SC-09, SC-11 |
| guides | guides/bookkeeper.md | bookkeeper | SC-06, SC-07, SC-12 |
| sops | sops/SOP-01.md | order coordinator, operations manager | map/future.md item 1 |
| sops | sops/SOP-02.md | order coordinator, operations manager | map/future.md item 2 |
| sops | sops/SOP-03.md | operations manager, order coordinator | map/future.md item 3 |
| sops | sops/SOP-04.md | bookkeeper, operations manager | map/future.md item 4 |
| sops | sops/SOP-05.md | order coordinator, operations manager | map/future.md item 5 |
| runbook | runbook.md | the operators | the repository, alerts.yaml, docs/run-log.md |
| handover | handover/README.md | the next engineer | the repository, spec/ |
| handover | handover/run-and-deploy.md | the next engineer | the repository, spec/ |
| handover | handover/configuration.md | the next engineer | the repository, spec/ |
| handover | handover/decisions.md | the next engineer | the repository, spec/ |

## Training

| format | file | for | from |
|---|---|---|---|
| deck | training/deck.md | every role | the guides |
| facilitator | training/facilitator.md | whoever runs the session | the guides, the scenarios |
| modules | training/modules/M-01.md | order coordinator | SC-01 |
| modules | training/modules/M-02.md | order coordinator | SC-02 |
| modules | training/modules/M-03.md | order coordinator | SC-03 |
| modules | training/modules/M-04.md | operations manager | SC-04 |
| modules | training/modules/M-05.md | order coordinator | SC-05 |
| modules | training/modules/M-06.md | bookkeeper | SC-06 |
| modules | training/modules/M-07.md | bookkeeper | SC-07 |
| modules | training/modules/M-08.md | operations manager | SC-08 |
| modules | training/modules/M-09.md | operations manager | SC-09 |
| modules | training/modules/M-10.md | order coordinator | SC-10 |
| modules | training/modules/M-11.md | operations manager | SC-11 |
| modules | training/modules/M-12.md | bookkeeper | SC-12 |
| cards | training/cards/order-coordinator.md | order coordinator | the order coordinator guide |
| cards | training/cards/operations-manager.md | operations manager | the operations manager guide |
| cards | training/cards/bookkeeper.md | bookkeeper | the bookkeeper guide |
| videos | training/videos/V-01.md | order coordinator | SC-10 |
| videos | training/videos/V-02.md | operations manager | SC-11 |
| videos | training/videos/V-03.md | bookkeeper | SC-12 |

## Groups

| group | roles | people | runs it |
|---|---|---|---|
| TT-01 | the client's trainer | 1 | the user |
| G-01 | order coordinator, operations manager, bookkeeper | 6 | the client's trainer |

## Delivery

Planned delivery of the documents: 15 February 2027. Destinations: the client's repository (docs/client-handbook/ and docs/handover/), and the say: lines handoffs.yaml gives for the shared drive and the wiki.

## Confirmed

Confirmed by Robin 28 January 2027: guides x3, sops x5, runbook, handover x4, deck, facilitator, modules x12, cards x3, videos x3; roles order coordinator, operations manager, bookkeeper; groups 1; trainer client.

This is a working note made by an AI assistant at your instruction. It is not a signature or an official record.
