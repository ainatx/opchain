# ow-start changelog

Per-skill versions (`catalogs.json` `versionPolicy: per-skill`; owner decision O7 of OW-08). The family's v2.1.0 release entry cites each skill's version. Every change to `SKILL.md` or a reference bumps this skill; data, example and test edits ride without a bump (OW-04 ruling O9) and are listed here as data edits.

## 1.1.0 (2026-10-17): meeting and decision logs

Design: `docs/plans/2026-10-16-ow-start-logs-amendment.md` (L1–L5; build notes §11). Contract: `sprints/release-2.1/ow-08/contract.md`.

- **Five verbs.** `/ow-start-prep-meeting <workstream>` (an agenda from open actions, reviews due, awaited lines and last meeting's open questions, each with its source), `/ow-start-log-meeting <workstream> [MTG-nn]` (notes from a transcript or your notes, a client follow-up draft, one STATUS line per action), `/ow-start-action <workstream> <id> <state>` (done, dropped, moved, reviewed), `/ow-start-log-decision <workstream>` (one decision per file, never edited) and `/ow-start-log <workstream>` (one screen, with the other skills' records indexed by path and header).
- Files under `logs/<workstream>/` (a client, or `business`); people by role everywhere; no client text in STATUS; `/ow-start` and `/ow-status` show the newest line per logs item.
- New references: `logs-schema.md`, `logs-status-and-index.md`, `phase-prep-meeting.md`, `phase-log-meeting.md`, `phase-log-decision.md`, `email-template.md`, `self-checks-logs.md`. `intake-record-schema.md` examples say 1.1.0; `phase-prep.md` says its two `.gitignore` lines cover `logs/`; `phase-extract.md` refuses a `logs/` folder and names `/ow-start-log-meeting`.
- The description brings in meetings no other ow- skill records and decisions; it no longer excludes internal meetings.

### Recorded here: two in-place edits to 1.0.0's text (made without a version bump)

- **#605 (OW-01, ow-build-plan 1.0.0):** the Hands-off row for delivery mode when the next stage is another session (`/ow-start-prep`, "use ow-start to prep <client>"), and its NEXT template's `[no folder attached: attach intake-record.md when you say it]` line.
- **#616 (OW-02, ow-build 1.0.0):** the K18 slash hint `(where slash commands exist: /ow-build-plan)` on the after-extract NEXT.

Data edits in the same PRs, which need no bump: #605 added `skill.edges.yaml` and changed `examples/handoffs.yaml` and `examples/offers.md`; #616 changed `examples/handoffs.yaml`.

## 1.0.0 (2026-10-14): the fit call and its recap

`/ow-start`, `/ow-start-prep`, `/ow-start-extract`, `/ow-setup`, `/ow-status` (#596; audit follow-ups #604). Design: `docs/plans/2026-10-06-ow-start-intake-redesign.md`.
