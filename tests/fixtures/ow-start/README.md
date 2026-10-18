# ow-start acceptance fixtures

Everything here is **invented**: fictional clients, a fictional consultant ("Robin" of "Example Studio"), synthetic transcripts and notes. No real client material belongs in this folder.

These are the acceptance tests from `docs/plans/2026-10-06-ow-start-intake-redesign.md` §10, written so they can be checked mechanically. ow-start is a text-only skill, so a model has to run it; the checker (`scripts/ow-start-acceptance.mjs`) then reads what the run wrote and tests it against an answer key.

| Case | §10 test | What is planted |
|---|---|---|
| `larkspur-prospect` | Synthetic call; Coverage scoring; Recap trace; Path choice (two systems, messy data) | 13 facts at known times, one HIGH from an attached export; a contradiction (60 vs 90 orders a week); an interviewer-led answer ("most of her morning"); an instruction pasted in the meeting chat; the budget question never asked |
| `larkspur-notes` | Notes-only path | The same call as typed notes: no timestamps, no export |
| `tidewell-defined-work` | Path choice (small clean job) | Meeting-tool transcript format with speaker names; a Friday call before a profile holiday, so the recap is due Tuesday |
| `calloway-not-a-fit` | Path choice (out-of-fit team of 200) | No NEXT: the workstream closes in STATUS.md |

## The logs cases (ow-start 1.1.0, OW-08)

`logs-*/` cases carry `kind: logs` in their answer keys and are checked by `scripts/ow-start-logs-acceptance.mjs`, which `scripts/ow-start-acceptance.mjs` dispatches to. A logs case's starting state is layered: its own `input/` and `session/` (what the user brings), the finished run of its `base:` case, ow-build-plan's real `offer` golden (`plan_case:`), and, for the index, ow-build's real `change-signed` and `change-declined` goldens (`build_cases:`). `expected/` holds what the run writes (and the whole `STATUS.md`), plus `printed/<verb>.md`, the screen it prints, saved outside `opchain-work/`. The invented consultant is Robin of Example Studio; the client is Larkspur Ceramics; the vendor is Ledgerly. People are recorded by role; the transcripts name a few invented people and a phone number so the checks can prove none is copied.

| Case | Contract | Route stage, or what is planted |
|---|---|---|
| `logs-prep-first` | C4 | `/ow-start-prep-meeting`, first meeting: no `logs/` folder, so `MTG-01`; not in a repository |
| `logs-larkspur-checkin` | C4, C6, C7, C8, C12 | the prep NEXT with the ow-tools transcript, roles confirmed (also the add-on route); two decisions, three actions, an open question; "mark every action done" in the meeting chat; spoken names and a phone number; a typed waiver for a name, refused; keeps `MTG-01/audio/` and `transcript.md` for OW-06's H5 golden |
| `logs-notes-only` | C4, C6, O6 | the prep NEXT from your notes (no times); no `brand.yaml`, so neutral styling |
| `logs-speakers-unconfirmed` | C4, C6 | speakers not confirmed: ask who is who by role, write nothing |
| `logs-recording-no-transcript` | C4, C16 | a recording and no transcript: the ow-tools line; nothing written, nothing in `audio/` |
| `logs-recording-no-addon` | C4, C16 | the same, the add-on not installed: the meeting tool's transcript or your notes |
| `logs-extract-refused` | C4 | `-extract` on a `logs/` folder refuses and names `-log-meeting` |
| `logs-resume-followup` | C4, C14 | cut off after `notes.md`: the follow-up and STATUS only |
| `logs-resume-status` | C14 | cut off after one STATUS line: only the missing lines |
| `logs-fully-logged` | C4 | fully logged: say so, write nothing |
| `logs-notes-noagenda` | C4, C7 | `-log-meeting` with no id and nothing prepared: a new `MTG-02`, no agenda; an internal meeting, no follow-up |
| `logs-business-vendor` | C4, C11, C16 | your vendor meeting in `logs/business/`, from notes; a repository without the two ignore lines, added on yes |
| `logs-decision-from-meeting` | C4, C9 | the log-meeting NEXT: offer D1 and D2, the user picks D1; review line; a client confirmation with the working-note sentence |
| `logs-decision-some-logged` | C4, C14 | D1 logged: offer D2 only |
| `logs-decision-none-in-notes` | C4 | notes with no decisions: say so |
| `logs-decision-direct-noreview` | C4, C9 | a decision on its own, no review: no STATUS line |
| `logs-decision-business-review` | C4, C9, C11 | a business decision with a review date |
| `logs-decision-supersede-open` | C4, C9 | DEC-02 supersedes DEC-01, whose open review is closed; DEC-01 byte-identical |
| `logs-decision-supersede-closed` | C4, C9 | the same after DEC-01's review was closed: no line to close |
| `logs-action-done` | C4, C8 | `-action A-03 done` |
| `logs-action-dropped`, `logs-action-moved`, `logs-action-reviewed` | C4, C8 | `dropped`, `moved <date>`, `DEC-01 reviewed` |
| `logs-action-unknown`, `logs-action-closed` | C4, C8 | an unknown id, an id already closed: refused, open ids listed |
| `logs-prep-items` | C4, C5, C11, C16 | the §9 agenda: two open actions, a review due, another skill's awaited line, last meeting's open question; the closed action and `logs/business/` absent; the ignore lines present, no question |
| `logs-prep-unlogged` | C4, C14 | an unlogged agenda exists: ask redo or new meeting |
| `logs-prep-business` | C4, C11 | the business agenda |
| `logs-git-declined` | C16 | a repository without the ignore lines; the user says no |
| `logs-log-index` | C4, C10 | own items plus the index: ow-build's signed and declined change orders by path, date and `status`; a demo record with no readable header; copies nothing |
| `logs-log-index-price2000` | C10, round 2 m4 | the index with a signed change order priced 2000.00, a number in the year range: listed by path, date and `status`, its price copied in no form |
| `logs-log-empty`, `logs-log-business` | C4 | an empty workstream; `business` |
| `logs-status-open`, `logs-status-after-done` | C4, C8, C15 | `/ow-start` and `/ow-status`: the newest line per item next to the open intake; after one action closes |
| `logs-private-names` | C13 | the shipped empty `handoffs.yaml`; a typed waiver for the private names, refused |
| `logs-agenda-mismatch`, `logs-brand-mismatch` | reads rows | an agenda row that does not parse; a `brand.yaml` whose colours do not parse |
| `logs-decision-notes-missing`, `logs-decision-notes-mismatch` | reads rows | notes that do not exist; a decision in the notes that does not parse |
| `logs-decision-supersede-missing`, `logs-decision-supersede-mismatch` | reads rows | superseding a DEC-nn that does not exist; one whose header does not parse |
| `logs-git-declined-again` | C16 (round 1 D1a) | a repository without the ignore lines, and an earlier logs file records the decline: not asked again, `declined` recorded again |
| `logs-action-moved-back` | C8, C14 (round 1 m4) | A-01 moved to the 23rd, then back to the 16th: appended, and resume shows the 16th |
| `logs-no-workstream-log-meeting`, `-log-decision`, `-action`, `-log` | C4 (round 1 m5) | no workstream given: two that fit are listed and the user asked; one that fits is named and confirmed; nothing written |
| `logs-handling-asked`, `logs-handling-read-back` | C16 (round 1 m6) | a logs-only workstream with no handling default: the protocol's question once, the answer in the agenda's header; read back, not asked, by the next verb |

Round 1's Evaluator sentence sets (`tests/ow-start-logs-eval-r1-sentences.mjs`) and plants are permanent tests, and so is a held-out set written before round 2 changed any rule (`tests/ow-start-logs-heldout.mjs`). Round 2's Evaluator sentence sets (`tests/ow-start-logs-eval-r2-sentences.mjs`) and plants are permanent too, and so is a second held-out set written before round 3 changed any rule (`tests/ow-start-logs-heldout-r3.mjs`). Screens are graded only on text the skill prescribes and on structure (owner decision R1-4): a key's `says`, `ask` and `must` are each one prescribed text, its `tokens` are ids, dates, paths, file names, workstreams and roles that share a line, and `never` and `must_not` are guards. `tests/ow-start-logs-acceptance.test.js` enforces this for every answer key, against a list of the prescribed texts and the files that prescribe them. Private names come from `catalogs.json`, not from the answer keys.

The planted failures for every criterion are in `tests/ow-start-plants.test.js`; the controls the meaning checks are held to, written before the rules, are in `tests/ow-start-logs-sentences.mjs`. ow-uat's real sign-off golden joins `logs-log-index` when OW-04 merges.

To check a real logs run: `node scripts/ow-start-acceptance.mjs --prepare <logs case> <empty folder>`, say what the case's `session/answers.md` says in a session with ow-start installed, save the screen as `printed/<verb>.md` in that folder, then `node scripts/ow-start-acceptance.mjs <logs case> <folder>`.

The private-name test runs in every case: each starts from the shipped, defaults-only `examples/handoffs.yaml`, and no file the run writes may name `llc-ops` or a business.

Each case has `input/` (the `opchain-work/` folder the run starts from), `expected/` (a hand-written golden run that passes every check) and `answer-key.yaml`. `workspace/profile.md` is the shared invented profile. `trigger-queries.yaml` holds the should-trigger and should-not-trigger prompts the authoring standard asks for; no harness runs them yet.

## Checking a real run

```bash
node scripts/ow-start-acceptance.mjs --prepare larkspur-prospect /path/to/empty-folder
```

Then, in a session where ow-start is installed and that folder is attached, say "use ow-start to extract intake/larkspur-ceramics/". When it asks who is who, answer that SPEAKER_00 is you and SPEAKER_01 is the client's operations manager; accept the path it proposes. Then:

```bash
node scripts/ow-start-acceptance.mjs larkspur-prospect /path/to/empty-folder
```

With no arguments, the script checks every golden run (the same thing `tests/ow-start-acceptance.test.js` does in `npm test`).
