---
ow_artefact: ow-start/offers
schema: 1
written_by: user (created from the ow-start example)
workstream: none
subject: none
created: 2026-10-06
clock: user-stated
origin: user
---
# Offers and fit: INVENTED EXAMPLE

This is an invented example. Replace every line with your own paths and the clients you serve; ow-start reads this file to propose one path after each call, and never edits it. It names paths, not prices.

Each path is a `## path: <id>` section. `kind` is one of `defined-work`, `build-plan`, `feasibility` or `not-a-fit`; `systems` is `1`, `2`, `3+` or `none`. `propose when` is what the call has to show; `after yes` is what the recap says happens next.

## fit

- Independent shops and small firms of about 3 to 40 people.
- Work that lives in everyday business software and shared spreadsheets.
- A problem the client can describe in one sentence.
- Someone on the call who can approve the next step.

## path: defined-work

- label: A defined piece of work
- kind: defined-work
- systems: none
- propose when: one clear, small job (one workflow, two tools connected, a report, a fix, a small website); the data is clean; the approach is obvious
- after yes: I send a short written scope with a fixed quote, and work starts when you sign it.

## path: build-plan-1

- label: Build Plan, 1 system
- kind: build-plan
- systems: 1
- propose when: a larger build inside one system; or the data is messy or sensitive; or the approach is not yet clear
- after yes: I send a one-page offer for the Build Plan with its fee and dates, and we start from a short list of samples you send.

## path: build-plan-2

- label: Build Plan, 2 systems
- kind: build-plan
- systems: 2
- propose when: as for 1 system, with two systems involved
- after yes: I send a one-page offer for the Build Plan with its fee and dates, and we start from a short list of samples you send.

## path: build-plan-3plus

- label: Build Plan, 3 or more systems or a new product
- kind: build-plan
- systems: 3+
- propose when: as for 1 system, with three or more systems involved, or a new product
- after yes: I send a one-page offer for the Build Plan with its fee and dates, and we start from a short list of samples you send.

## path: feasibility

- label: Feasibility check
- kind: feasibility
- systems: none
- propose when: the client's real question is whether software, or AI, could do this at all
- after yes: I send a short offer for a time-boxed test on your own examples.

## path: not-a-fit

- label: Not the right fit
- kind: not-a-fit
- systems: none
- propose when: the client is outside the fit list above
- after yes: nothing further; say so plainly and kindly, with a suggestion of where else to look if there is one.
