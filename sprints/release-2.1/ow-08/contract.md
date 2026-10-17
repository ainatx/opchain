# OW-08 (Sprint L) contract — ow-start 1.1.0, meeting and decision logs

**Plan:** `sprints/release-2.1/ow-family-sprint-plan.md` → Build re-plan → the Sprint L row (ow-start 1.1.0 logs, lane B; "H5 if ow-handoff is merged, else with Sprint 4"; needs Sprint 0; CLAUDE 8–12h | USER 1h). The plan has no Sprint L section, so this contract is its only deliverable list. · **Design:** `docs/plans/2026-10-16-ow-start-logs-amendment.md` (approved 2026-10-16: L1–L5, with amendments H5 and T5), which reverses decision 13 of `docs/plans/2026-10-06-ow-start-intake-redesign.md` for the logs only. Sibling designs it must stay true to: ow-tools (§4.2 calls table, T5; §5.3 SessionStart hook), ow-handoff (§9 access removal, source 4, H5), ow-draft (§3.1 reads `logs/<workstream>/`), and the producers the index lists (ow-build-plan, ow-build, ow-uat, ow-handoff, ow-documentation, ow-care). · **Base:** `origin/main` @ `90e61149` (#618). Rebase onto OW-04 (Sprint 3) when it merges; see Technical approach. · **Folder and branch:** `sprints/release-2.1/ow-08/`, `claude/ow-08-ow-start-logs` (naming of 2026-10-17). · **Skill:** oc-app-architect `/oc-build`, Generator proposes, Evaluator reviewed. · **Status:** APPROVED by the owner 2026-10-17 (all recommendations O1–O8 accepted) 

**Definition of done.** The plan gives none for Sprint L, so it comes from design §9. Every §9 acceptance test except Real use has a golden run that passes and a planted failure the checker catches. ow-start 1.1.0 validates in the catalog with its ten verbs and a body of at most 4,500 tokens. The family edge checks stay green. Real use moves to REL-02 (Sprint 6).

**Owner decisions carried in (not reopened):**
- **D1.** An internal number is OUR side only: our effort and hours, rates, costs, margin, multipliers, and overruns against our own plan. The client's schedule, figures, ratios, payment terms and dates are allowed.
- **D2.** Meaning checks (the C5 class) are a regression net plus the skill's same-session self-check. Real-model runs in REL-02 measure the rest.
- **D3.** No real prices in the repo. Fixtures are invented. No private names and no client names.
- **D4.** Client material (audio, transcripts) never enters the repo. The git-ignore guards apply.
- **D5.** The approved OW-04 rulings apply here:
  - O1: `in_place` reads.
  - O2: skill-local append logs.
  - O9: data, example and test edits to merged skills ride without a version bump; any change to a SKILL.md or a reference bumps that skill.
- **D6.** H5 lands with OW-06 (Sprint 4), because ow-handoff is not merged (re-plan rule 2). T5 lands with OW-03 (Sprint T): its calls-table row and test C24 are on `claude/ow-tools-sprint-t`.

## Deliverables

1. **`skills-work/ow-start/SKILL.md` → 1.1.0.**
   - **Frontmatter.**
     - `version: "1.1.0"`, and the body's version line to match.
     - `commands` adds `/ow-start-prep-meeting`, `/ow-start-log-meeting`, `/ow-start-action`, `/ow-start-log-decision` and `/ow-start-log`.
     - The description is rewritten. Today it says "NOT for minutes or action items from internal meetings", which contradicts L2. The new text brings meetings and decisions in and excludes only meetings another ow- skill records: Build Plan workshops, demos, UAT sessions and care calls.
     - The description stays at or under 1,024 characters (today 664), names `ow-start` in its first 200 and has no angle brackets.
   - **Body ≤ 4,500 tokens**, enforced by the catalog through `bodyTokenBudgets` (today about 3,350, so about 1,150 tokens of headroom for five verbs). It must hold:
     - the five verb rows;
     - one phase pointer per phase file;
     - the `logs/` file tree;
     - Reads-from and Hands-off rows, one per file and never lumped;
     - NEXT templates, each with its slash hint (K18) and its no-folder line;
     - the per-item resume rule for `/ow-start` and `/ow-status`;
     - a self-checks pointer that names the three checks that can never be waived.
   - **Welcome.** It keeps its four lines. The logs appear as one "Try:" example.
2. **`references/`.** The detail lives here so the body fits.
   - **New:**
     - `logs-schema.md`: agenda, notes, follow-up, `DEC-nn`, ids, and the STATUS line forms per O2.
     - `phase-prep-meeting.md`, `phase-log-meeting.md` and `phase-log-decision.md`.
     - `logs-status-and-index.md`: `-action`, `-log`, the per-item resume rule, and the index table. The index table names one producer path per row and the header keys it may read.
     - `email-template.md`: the follow-up `.html` and its `.txt` twin, per O6.
     - `self-checks-logs.md`: the seven §7 checks. It writes out D1's OUR-side categories, the people-by-role categories, and the allowed examples for each.
   - **Changed:**
     - `intake-record-schema.md`: the `written_by` examples move to 1.1.0.
     - `phase-prep.md`: one sentence saying its two `.gitignore` lines also cover `logs/`.
   - `ow-protocol.md` stays byte-identical. Protocol v1 does not change.
3. **`skill.edges.yaml`.**
   - **Writers, exact per verb.**
     - `agenda.md` ← `-prep-meeting`.
     - `notes.md`, `follow-up.html`, `follow-up.txt` ← `-log-meeting`.
     - `decisions/DEC-nn.md` ← `-log-decision`.
     - `STATUS.md` (append) ← `-log-meeting`, `-action` and `-log-decision`, plus `-prep-meeting` if O3 is approved.
     - `-log`, `/ow-start` and `/ow-status` write nothing.
   - **Reads rows:**
     - ow-tools' `logs/<workstream>/meetings/MTG-nn/transcript.md` (speaker labels, times, roles);
     - ow-start's own `agenda.md`, `notes.md` and `DEC-nn.md`;
     - `brand.yaml` from the user (O6);
     - the index rows, one per producer path (O1). These include `ow-care`, which joins `planned` in `catalogs.json`.
   - **Hands-off rows, each with its `fields`:**
     - prep → log the meeting (`agenda.md`);
     - a recording with no transcript → ow-tools `/ow-start-transcribe` (`logs/<workstream>/meetings/MTG-nn/audio/`);
     - log the meeting → log its decisions (`notes.md`, Decisions).
4. **The changelog (O7).** The 1.1.0 entry lists the five verbs and records two in-place edits to 1.0.0's text that were made without a version bump:
   - **#605 (OW-01):** the delivery-mode "another session" hands-off row, and its NEXT's `[no folder attached: …]` line.
   - **#616 (OW-02):** the K18 slash hint `(where slash commands exist: /ow-build-plan)` on the after-extract NEXT.

   Edits to edges and examples in the same PRs are listed as data edits, per O9. The brief named only the OW-02 edit; `git log` shows both.
5. **Family wiring.**
   - **`catalogs.json`:**
     - `bodyTokenBudgets.ow-start: 4500`;
     - `ow-care` added to `planned`;
     - `statusNames` for `/ow-start-log-meeting` (`A-`) and `/ow-start-log-decision` (`DEC-`).
   - **`check-skill-contracts`** gains the O1 index rule, with plants. `skills-work/README.md` documents it.
   - **`tests/ow-text-pins.mjs`** pins the prose rules the goldens can't see:
     - a decision is never edited;
     - superseding a decision closes the old review;
     - the newest line per item;
     - the follow-up is never sent;
     - people by role;
     - a business log never reaches a client file;
     - ow-start never transcribes;
     - the group lists in ow-build-plan's and ow-build's resume stay explicit, so a `logs/` line joins no sibling group.

     These are tests only, with no sibling text edits and no bumps.
   - **`tests/fixtures/ow-start/trigger-queries.yaml`:**
     - at least 5 should-trigger prompts for the logs;
     - at least 3 should-not-trigger prompts (a demo summary, a UAT session, a care report);
     - the internal-standup line moved per L2, with a comment.
   - **The fixtures README** gains a row per new case.
6. **Acceptance tests.**
   - **Where the cases live.** Logs cases go under `tests/fixtures/ow-start/logs-*/`, with `kind: logs` in each answer key. Their checks are in `scripts/ow-start-logs-acceptance.mjs`, dispatched from `scripts/ow-start-acceptance.mjs`, so the documented command checks both. No new npm script: the root `package.json` is bundled into oc- skills.
   - **New test files.** `tests/ow-start-logs-acceptance.test.js` and `tests/ow-start-plants.test.js`.
   - **Verbs that write nothing** are graded on the screen the run saves to `printed/<verb>.md`, outside `opchain-work/`, and on having written nothing.
   - **Inputs.**
     - Larkspur Ceramics (Robin of Example Studio, invented) for the client workstream.
     - An invented vendor for `logs/business/`.
     - For the index: ow-build's real `change-signed` and `change-declined` goldens and ow-uat's real sign-off golden, layered in. Never fresh stand-ins.
7. **ow-tools part (O4).** In `lib/status.mjs`, the SessionStart hook keeps the newest line per item for `logs/` lines. This needs a test with mixed intake and logs lines, a regenerated `SECURITY-MANIFEST.md`, and a version bump per O4.
8. **Design follow-up.** Add "Build notes (ow-start 1.1.0, OW-08)" to the amendment. It records every departure, seeded from the Evaluator review below:
   - index paths as built, and header keys per row;
   - the prep STATUS line;
   - the STATUS form;
   - the verb argument;
   - superseding closes the review;
   - where handling is stored;
   - the git-ignore question in the logs verbs;
   - no signature name on the follow-up.
9. **H5 handover (not built here).** One golden, `logs-larkspur-checkin`, keeps a `meetings/MTG-01/audio/` placeholder and a `transcript.md`, so OW-06's H5 golden can layer it in.

## Testable criteria

| # | Criterion | How it is verified |
|---|---|---|
| C1 | **Catalog and edges.** The catalog validates every ow- skill on main, with ow-start at 1.1.0 and ten commands. Reciprocity, one writer, NEXT resolution and field offers hold across the family. **Writer modes are exact** (deliverable 3); `-log`, `/ow-start` and `/ow-status` write nothing. Each self-hand-off has a reads row with the fields it is offered | `gen-skills-catalog`, `check-skill-contracts`. Plants: `-action` writing `notes.md`; `-log-decision` editing `notes.md`; `-log` writing a file; a second writer of `DEC-nn.md`; a field read but not offered; a NEXT with no slash hint (K18); a dangling NEXT; a `use ow-start on <path>` say (ow-start has no `routes:`) |
| C2 | Body ≤ 4,500 tokens, **enforced by the catalog**. The protocol copy and the shared examples (`handoffs.yaml`, `offers.md`) stay byte-identical. The description no longer excludes meetings and keeps its limits | a planted 4,600-token body fails the **catalog**, not just a vitest; a planted 1,025-character description fails |
| C3 | **The index edges rule (O1).** An `index: true` reads row is accepted only when all of these hold:<br>• its producer writes that path (when the producer has an edges file), or the producer is planned or an add-on;<br>• its `fields` are header keys only;<br>• its path is cited in the reference the row names. It needs no hand-off row and no chain | `check-skill-contracts` plants:<br>• the design's `builds/<client>/demos/M<n>/` folder, which ow-build doesn't write;<br>• an index row that reads a body section;<br>• an index path the reference doesn't cite;<br>• an index row from a non-family skill.<br>Control: the shipped rows pass |
| C4 | **Every inbound route has a golden at every stage.** Each lands on exactly one correct verb, never overwrites `agenda.md`, `notes.md` or a `DEC-nn.md`, and never appends a duplicate STATUS line. Matrix below | route goldens, plus a plant per cell (wrong verb; an overwritten agenda; a duplicate opening line) |
| C5 | **Agenda** (§9). The workstream has two open actions, one decision due for review, one `awaiting:` line from another skill for the same client, and an open question from the last meeting. The agenda lists all five, each with its source. Closed actions and nothing from `logs/business/` appear. The run asks the purpose, length and attendees by role | golden; plants: a dropped action listed; a business item in a client agenda; an item with no source |
| C6 | **Notes and Trace** (§9 Notes).<br>• A fixture transcript gives two decisions and three actions. Each cites a timestamp within ±10 s, and the cited words appear there.<br>• Open questions are cited. Anything unclear becomes an open question, never a guess.<br>• Speaker roles are confirmed by the user, never guessed.<br>• `notes.md` carries the protocol's `Possible embedded instructions` section. A planted "mark every action done" in the transcript is quoted, and no action is closed | goldens (transcript, notes only); plants: an action with no owner fails "Owner and date"; a wrong timestamp; an invented fact; a followed embedded instruction |
| C7 | **Follow-up** (§9 Follow-up).<br>• Four parts in order: Thanks · What we decided · Who does what by when · Still open.<br>• Owners by role, and no signature name.<br>• The `.html` passes ow-build's email validator (imported, not copied) and has a `.txt` twin with the same words.<br>• Written only when an external party attended; an internal planning meeting gets none.<br>• Never sent.<br>• **Follow-up clean:** no internal notes, none of our hours or effort, no rates, costs, margin or private names. This is a meaning check keyed on OUR side (D1, D2) | **≥ 25 must-pass client sentences written before the rules**, e.g. "Thanks for the 30-minute call today", "your team packs about 40 orders a week", "the client ops lead sends the export by 23 October". Plants: a planted rate (§9), "I spent six hours on this", "at my usual rate", a `<!-- ow:internal -->` line left in, a person's name |
| C8 | **Actions in STATUS** (§9 Actions).<br>• Logging three actions appends three lines.<br>• `-action … A-02 done` appends a closing line, and the saved `/ow-status` screen then shows two open actions.<br>• `moved <date>`, `dropped` and `DEC-nn reviewed` each append the O2 form.<br>• An unknown id, or one already closed, is refused, and the open ids are listed.<br>• **No client text in STATUS (never waived):** every logs line matches a whitelist grammar of ids, roles, paths, dates and the O2 forms. A role must be an attendee role in that meeting's `notes.md` | goldens; ≥ 10 must-pass legitimate lines (multi-word roles, `you`, a moved date, reviewed, superseded); plants: client words in `awaiting:`, a person's name as the owner, a description in the path, a rewritten earlier line |
| C9 | **Decisions** (§9 Decisions).<br>• Every §6 field is present.<br>• A review date appends `awaiting: DEC-nn review by <date>`.<br>• Changing a decision writes `DEC-02` with `Supersedes: DEC-01`. `DEC-01` stays byte-identical, and its review line is closed.<br>• From a meeting, the run offers D1 and D2 and writes only the ones the user picks.<br>• A `Confirmed` line carries protocol §8's working-note sentence.<br>• **Never edited** | goldens; plants: an edited `DEC-01`, a superseded review left open, a decision written that the user didn't pick |
| C10 | **Index** (§9 Index, L5). With a signed and a declined change order and a `signoff.md` present, the saved `/ow-start-log` screen lists each by path, date and its named header key. **It copies nothing**: body canaries, and every header value it doesn't name (the CO's `price`, `contract-inputs.md`'s `fixed_price` and `acceptance_note`), are absent from the screen and from every file the run writes. A producer that isn't installed has no rows. `-log` writes nothing | golden; plants: the CO price on the screen; a body sentence copied; a missing indexed file shown; a written file |
| C11 | **Business log** (§9). A vendor meeting in `logs/business/` gets notes and a follow-up. A canary from it never appears under `logs/<client>/`, `intake/` or in a client agenda, and no client canary appears under `logs/business/` | golden; plants each way |
| C12 | **People by role (never waived).** No person's name, email or phone number in any file the logs verbs write, the user's own name included (the amendment's `you`). A typed waiver is refused.<br>The rules are category rules: email and phone shapes, the fixture's known speaker names, honorifics, and the `<Name> from <org>` and `cc:` patterns. **No generic capitalised-word rule** | **≥ 30 must-pass controls written first**: role phrases, product and system names, places, weekdays, months, and the client's business name. One plant per category; a waiver golden |
| C13 | **No private names (never waived)**, with an empty `handoffs.yaml`: `llc-ops`, and the brand name with a space, with a hyphen and in another case. A waiver is refused | the existing `private_names` check over `logs/`; four plants |
| C14 | **Per-step resume and write-once.**<br>• `-log-meeting` records its steps in the `notes.md` header (`log_steps`): roles, notes, checks, follow-up, STATUS. STATUS lines are written last.<br>• Cut off after `notes.md`, the run resumes at the follow-up only.<br>• Cut off part-way through the STATUS lines, it appends only the missing ones.<br>• `-log-decision` from a meeting offers only decisions that have no `DEC-nn` yet (the `subject:` is `notes.md#D<n>`).<br>• An existing agenda for an unlogged meeting: ask whether to redo it or start a new meeting | goldens for the two cut-offs and a partly logged meeting; plants: a duplicate opening line, a rewritten `notes.md` on resume, a decision logged twice |
| C15 | **Resume screens.**<br>• `/ow-start` and `/ow-status` show the newest line per item (`MTG-nn`, `A-nn`, `DEC-nn`), next to open intakes, which keep their 1.0.0 behaviour. An item is "reported overdue" only when today's date is known.<br>• Lines from `logs/` never change a sibling's groups: text pins keep their group lists explicit.<br>• The ow-tools hook keeps an open action visible after another one closes (O4) | saved-screen goldens; the hook's unit test with mixed lines; pins and their plants |
| C16 | **Git-ignore guard (D4).** In a git repository without the two lines, the first logs verb asks once and adds them only on a yes. With the lines present, it doesn't ask. The skill never writes into `audio/` or transcribes. Without ow-tools, the absent-case offers the meeting tool's transcript saved as `MTG-nn/transcript.md`, or your notes | goldens (repo without lines; with them; no add-on); plant: a run that writes `.gitignore` without a yes. OW-03's C24 covers the ow-tools guard on this path |
| C17 | **The checker fails per check and never crashes** | malformed-file tests: `notes.md` as a directory, an invalid YAML header, a truncated STATUS line, a binary transcript, an empty `printed/` screen |
| C18 | **Plants are permanent.** Every evaluator plant from every round lands in `tests/ow-start-plants.test.js`. A skip is allowed only when it names an owner decision, and its label has to be honest (OW-02 R4-3) | review of the file at each round |
| C19 | **No regressions.**<br>• oc- outputs are byte-identical.<br>• The four intake goldens and their tests pass unchanged.<br>• The ow-build-plan, ow-build and (once merged) ow-uat goldens and plants pass.<br>• `check-skill-contracts` is green on main's other skills | snapshot before and after; `npm test`; every acceptance script |
| C20 | **Version and record.** 1.1.0 in the frontmatter and the body. The changelog per O7 holds both in-place edits (#605, #616). Every new NEXT has its slash hint and its `It will read:` and no-folder lines | catalog; `check-skill-contracts`; a pin on the changelog's two lines |

**C4 route matrix.** Each cell is one golden and one plant.

| Inbound (from) | Say | Stages graded |
|---|---|---|
| `/ow-start-prep-meeting <workstream>` | — | first meeting (no `logs/` folder, so `MTG-01`) · items open (the C5 case) · an unlogged agenda exists (ask) · `business` |
| ow-start's prep NEXT | `use ow-start to log the meeting logs/<workstream>/meetings/MTG-nn/` (`/ow-start-log-meeting`) | transcript · notes only · a recording with no transcript (the ow-tools NEXT, and the no-add-on absent-case) · speakers unconfirmed (ask) · notes written, follow-up missing (resume) · fully logged (say so; write nothing) |
| ow-tools' add-on, after a meeting recording | its NEXT naming ow-start's step | a transcript with roles confirmed lands on `-log-meeting`; `-extract` on a `logs/` folder refuses and names `-log-meeting` |
| `/ow-start-log-meeting <workstream>` with no id (O5) | — | a prepared, unlogged `MTG-nn` (that meeting) · none (a new `MTG-nn`, "no agenda") |
| ow-start's log-meeting NEXT | `use ow-start to log the decisions in logs/<workstream>/meetings/MTG-nn/notes.md` (`/ow-start-log-decision`) | none logged (offer each) · some logged (offer the rest) · no decisions in the notes (say so) |
| `/ow-start-log-decision <workstream>` | — | with a review date · no review · supersedes `DEC-01`, with and without an open review line |
| `/ow-start-action <workstream> …` | — | `A-nn done` · `dropped` · `moved <date>` · `DEC-nn reviewed` · unknown id · already closed |
| `/ow-start-log <workstream>` | — | own items plus indexed ones · an empty workstream · `business` |
| `/ow-start`, `/ow-status` | — | open actions and reviews next to open intakes · after one action closes |

## Test requirements

- [ ] A golden run and a planted failure for every §9 acceptance test except Real use (REL-02).
- [ ] A golden and a plant for every new reads row's absent-case and mismatch case: transcript, agenda, notes, `DEC-nn`, `brand.yaml`, and an index file without a readable header.
- [ ] Every cell of the C4 matrix.
- [ ] Must-pass controls written **before** the rules: ≥ 25 for Follow-up clean, ≥ 30 for People by role, ≥ 10 for the STATUS grammar.
- [ ] `check-skill-contracts` plants for the O1 index rule (four plants, one control), plus the C1 writer plants.
- [ ] The ow-tools hook test with mixed intake and logs lines (O4), and the manifest `--check`.
- [ ] Malformed-file tests (C17). Every plant is kept in `tests/ow-start-plants.test.js` (C18).
- [ ] `npm test`, `npm run build` and `npm run evidence:pr` are green, and the candidate verifier passes on every commit.

## Technical approach

Follow OW-02's end state and OW-04's contract, not their starting points.

1. **Rulings first.** Record the owner's O1–O8 answers in the amendment's build-notes section before any code.
2. **Base and order.**
   - Start from `origin/main`. OW-04 is building on `claude/ow-uat-sprint-3` and touches the same shared files: `check-skill-contracts.mjs` (`in_place`, `append_logs`), `catalogs.json` (`planned`), `skills-work/README.md`, `tests/ow-edges.test.js` and the text pins. It may also move ow-build's category rules into a shared module.
   - Rebase onto OW-04 before evaluation round 1, then import its shared rules rather than copying them.
   - The index golden waits for ow-uat's real sign-off golden.
   - The ow-tools part (O4) lands last, after OW-03 merges, as OW-04's O3 did.
3. **Checker infrastructure.** Add the O1 index rule to `check-skill-contracts`, with its plants, so ow-start's new rows are checked from their first commit.
4. **Edges, then references, then the body.**
   - Write `skill.edges.yaml`, then `logs-status-and-index.md`. Take each producer's index path from its edges file, or from its approved design if it isn't built yet.
   - Then the phase files and schemas.
   - The body comes last, against its budget. If the body can't fit without lumping rows, stop and ask the owner. Never lump.
5. **The checker.** Write the controls first, then the rules. Per-check isolation as in ow-start's F-004. Import `validateEmailHtml` and the OUR-side rules; don't copy them.

**Technical rules.**
- **Ids.**
  - `MTG-nn`, `A-nn` and `DEC-nn` are numbered per workstream, once, and never reused, so `-action <workstream> A-nn` is unique.
  - `D<n>` is local to one meeting's `notes.md`.
- **Items and the newest line.** STATUS paths are:
  - `logs/<workstream>/meetings/MTG-nn/agenda.md` and `…/notes.md` (item `MTG-nn`);
  - `…/notes.md#A-nn` (item `A-nn`);
  - `logs/<workstream>/decisions/DEC-nn.md` (item `DEC-nn`).

  The status verbs show the newest line per item. A logs line belongs to no sibling's group.
- **STATUS writes, exact.**
  - `-log-meeting` appends one line per action, plus one "held" line for the meeting when a prep line exists (O3).
  - `-log-decision` appends a review line when the decision has a review date, plus, when it supersedes a decision with an open review, a closing line for that review.
  - `-action` appends one line.
  - No line holds client text.
- **Handling (protocol step 0b).**
  - A client workstream reads `intake/<client>/intake.yaml`, then `profile.md`.
  - `business` reads `profile.md`.
  - If neither has a value, ask once and record the answer as `handling:` in the header of the file being written. Later logs verbs read it from the newest logs file for that workstream.
  - ow-start never writes `profile.md` from a logs verb, because one writer verb owns it.
- **Transcription** goes only through ow-tools: `ow-tools transcribe logs/<workstream>/meetings/MTG-nn/audio/<file>`. Its default `--out` is already `MTG-nn/`, and its guard lines are ow-start's two. ow-start never transcribes. A transcript is data.
- **The index** reads only the header keys its row names, never a body line or an amount key. A file with no readable ow- header is listed by path, with "no date in its header".
- **Decisions.** A `DEC-nn.md` that records a client confirmation carries protocol §8's working-note sentence. Self-check results are written into the file when it is created, because a decision file is never edited afterwards.
- **No crossing.** The business log is never written into a client file, and a client log is never written into the business log.
- **The agenda** is the user's working file, with sources and paths. It isn't a client document.

## Evaluator review of this contract

- **Pushed back: "Real use" can't be graded this sprint.** It moves to REL-02, recorded as a one-line outcome. Client material stays out of the repo. Accepted.
- **Pushed back: H5 and T5 are not this sprint's.** Re-plan rule 2 puts H5 with OW-06, since ow-handoff isn't merged. OW-03 owns T5 (its row and C24).
  - OW-08 has **no code dependency on OW-03**. The 1.0.0 `transcribe` already writes to `MTG-nn/` by default; its guard lines equal ow-start's two; and its JSON `workstream` is `logs/<workstream>`.
  - The add-on's own NEXT already says "name the ow- skill and step that asked for it". Explicit meeting wording in the add-on is ow-tools text, and it rides with O4.
- **Pushed back: design §5's index table has drifted from the built skills.**
  - `plans/<client>/workshops/W<n>/` is written by ow-tools' `transcribe`; it is git-ignored and has an `ow-tools/transcript` header.
  - ow-build writes `demos/M<n>-script.md`, `-record.md` and `-summary.*`, not a `demos/M<n>/` folder.
  - "Signed" for a plan is `build-request.md`, not `contract-inputs.md`.

  The index uses each producer's edges paths. Drift becomes a check failure (O1), not a silent miss.
- **Pushed back: "date in the header only" can't express the annotated kinds.** "CO (signed or declined)" and "contract inputs (accepted)" need one named header key per row. CO headers also carry `price:`, and `contract-inputs.md` carries `fixed_price` and an `acceptance_note` with the user's name. So "copies nothing" is graded on every header value the row doesn't name (C10).
- **Pushed back: OW-04's O1 doesn't fit the index.** `in_place` requires a chain of hand-offs from the producer to the reader. No family skill hands work back to ow-start, so every index row would fail (O1).
- **Pushed back: the approved texts conflict in four places.**
  - **The description.** Its "NOT for … internal meetings" clause contradicts L2, and so does the trigger file's should-not-trigger standup line (deliverables 1 and 5).
  - **The STATUS form.** The amendment's `next: none` loosens protocol §5, which a skill may not do (O2).
  - **The ow-tools hook.** It groups by workstream and hides open actions (O4).
  - **The verb argument.** `-log-meeting <MTG-nn>` is ambiguous across workstreams and has no id for an ad-hoc call (O5).
- **Pushed back: design gaps that would fail the family's own rules.**
  - Superseding a decision leaves its review open forever, so `-log-decision` declares a second STATUS write.
  - A prepared meeting is invisible to resume (O3).
  - A logs-only workstream (a business log, or a client met before ow-start) has no home for its handling answer and never hears the `.gitignore` question. Technical rules and C16 cover both.
- **Pushed back: the body budget.** About 1,150 tokens of headroom for five verbs is the OW-01/OW-02 squeeze that produced lumped rows. Detail goes in `references/`, and index rows are cited in their reference, not the body (O1). If it still doesn't fit, the Generator stops and asks.
- **Pushed back: meaning checks can't be complete.** Per D2, Follow-up clean and People by role are a regression net plus the self-check, with controls written first. People by role is the hardest case: names, products, places and weekdays are all capitalised words. OW-02 R4's 39% false-positive rate on new legitimate sentences is the failure to avoid. "No client text in STATUS" is a closed grammar, not a meaning check, so it can be complete.
- **Noted, not a defect: the user's own name.** The amendment records people by role everywhere (`you`), so the follow-up carries no signature and the user signs when sending. This is stricter than ow-uat's "recorded by" allowance, on purpose.
- **Added: C3, C14, C15 and C18.** They come from OW-02's resume bugs and R4-3, and from the hook finding.
- **Not graded:**
  - rendering the follow-up in real email clients (owner, REL-02);
  - the trigger prompts (REL-01's harness);
  - the no-folder portable state file (protocol §2), as for the 1.0.0 verbs.

## Open for the owner

| # | Decision | Options | Recommendation |
|---|---|---|---|
| O1 | **How the index is declared in the edges.** `/ow-start-log` reads other skills' headers, but no skill hands those files to ow-start | (a) a new `index: true` reads row: header keys only, cited in a reference, the producer must write the path; no hand-off, no chain; (b) OW-04's `in_place`, which fails, because no chain leads back to ow-start; (c) leave the index out of the edges, unchecked | **(a)**. It is honest about what is read and still catches drift (the design's table has drifted already). About 30 min |
| O2 | **STATUS form for actions and reviews** | (a) the amendment verbatim: `next: none` on every line; (b) protocol §5's form: open lines use `next: ow-start /ow-start-action logs/<workstream>/`, and closing lines use `next: none (closed: done \| dropped \| reviewed \| superseded by DEC-nn)`. `awaiting:` is as in the amendment either way | **(b)**. A skill may not loosen §5, and the siblings' resume rules key on `none (closed: …)` |
| O3 | **Should `-prep-meeting` append a STATUS line?** The design's Writes column lists only `agenda.md` | (a) no; (b) yes: `awaiting: meeting on <date>`, and `-log-meeting` closes it with `held <date>` | **(b)**. It mirrors `/ow-start-prep`; without it, a prepared meeting is invisible to `/ow-start` and has no resume record |
| O4 | **The ow-tools SessionStart hook** keeps only the newest line per workstream (`logs/<workstream>`). Closing one action hides every other open action and review | (a) a documented limitation; `/ow-status` is the full list; (b) fix `status.mjs` (newest line per item under `logs/`) in OW-08's PR, as the next ow-tools patch on whatever line main carries once OW-03 merges (1.1.1, or 1.2.1 after OW-04's 1.2.0); (c) add it to OW-03's open round | **(b)**. A false "nothing open" signal is the no-false-done class. It is small (about 30–45 min), and OW-03's approved contract stays closed |
| O5 | **The `-log-meeting` argument** | (a) `<MTG-nn>` as designed; (b) `<workstream> [MTG-nn]`: with no id, the newest prepared and unlogged meeting, else a new `MTG-nn` marked "no agenda". Ids are numbered per workstream | **(b)**. `MTG-03` exists in every workstream, and an ad-hoc call has no id yet |
| O6 | **Follow-up styling** | (a) read `brand.yaml` when present, with ow-build's email rules (a new `from: user` read; neutral styling without it); (b) neutral styling always | **(a)**. The client gets the same look as the build emails, and the HTML checks are the same |
| O7 | **Where ow-start's changelog lives.** No ow- skill has one yet | (a) `skills-work/ow-start/CHANGELOG.md`, per skill, travelling into the per-skill zip (REL-01); (b) one `skills-work/CHANGELOG.md` with a section per skill; (c) `skills/CHANGELOG.md` `[Unreleased]` | **(a)**, with REL-02's v2.1.0 entry citing each skill's version. It sets the family convention; ow-build-plan and ow-build add theirs at their next bump |
| O8 | **Precision bar for the two meaning checks before REL-02** (the OW-02 R4 owner question, asked up front this time) | (a) the controls in C7 and C12 are the bar; new false positives found in evaluation become controls in the same round; (b) REL-02 grades real runs with a different judge | **(a)**. Cheap, and it keeps the checker usable on real runs |

## Effort

**The plan's figure:** CLAUDE **8–12h** | USER **1h** (the re-plan's Sprint L row).

**The realistic figure, from measured sprints:** about **3.5–4.5h** of Claude wall-clock time. An amendment to a merged skill measures about 3–3.5h. This one runs higher for three reasons: five verbs where most amendments add one or two, three meaning or grammar checks that are never waived, and the index rule. If O1 is (c) and O4 is (a), it drops back to about 3–3.5h.

| Part | Measured norm | OW-08 | Why |
|---|---|---|---|
| First build | 1–1.5h (new skill) | **1–1.25h** | Five verbs and seven references against a 1,150-token body budget; the index rule; about 25–30 goldens (OW-02 had 54, OW-04 plans 60–70) |
| Fix + evaluation rounds | 3–4 × ~55 min | **2–3 × ~50 min ≈ 1.7–2.5h** | Smaller surface than a new skill, but Follow-up clean and People by role will repeat OW-02's precision round unless the controls come first |
| PR landing | ~45 min | **~30–45 min** | Rebase onto OW-04, the ow-tools patch after OW-03 (O4), fresh evidence |

USER: about **1–1.5h**. That covers contract approval and O1–O8 (about 30 min), reading two or three evaluation reports and any mid-sprint ruling (about 45 min), and the squash-merge (about 15 min). The §9 Real-use test (one real client check-in and one business decision) is REL-02's, not this sprint's. Calendar time waits on OW-04 merging first, and on OW-03 for the O4 part.

## Owner decisions after round 1 (2026-10-17)

Round 1 (`eval-round-1.md`) failed at 6.6 with two checker majors (D1, D2). The owner decided:

| # | Decision | What it changes |
|---|---|---|
| R1-1 | **Body headroom.** Trim SKILL.md now, moving detail into references, so OW-07 (S1, about 150–250 tokens), OW-11 (S2) and OW-12 (S3) have room: at least 400 tokens of headroom under 4,500. Raising ow-start's cap to 5,000 is the fallback, only if a later sprint cannot fit; it is not raised now. Moved text stays reachable and is pinned | C2: the body is held to at least 400 tokens of headroom; `/ow-setup`'s steps, "Works on its own" and the transcription absent-case move to `references/phase-setup.md`, pinned |
| R1-2 | **Versions.** S1, S2 and S3 ship as ow-start 1.2.0 and later; 1.1.0 is the logs release | The sprint plan's roll-up and the changelog say so |
| R1-3 | **Undated action form.** `awaiting: A-nn (<role>), no date` is ratified, recorded in `skills-work/README.md` as a logs-only form | Build note 3 is no longer a departure awaiting ratification |
| R1-4 | **Grading screens.** The checker grades only text the skill prescribes, plus structure (ids, paths, dates, NEXT lines). The golden-only phrases are dropped, and the checker passes the skill's own wording | C4: every `route` and `screen` phrase in a logs answer key is structural or appears in the skill text, enforced by a test |

Fixes taken into this sprint from round 1: D1 (a recorded decline is not asked again; screens graded per R1-4), D2 (the index copies nothing by meaning: amounts in any form, the user's name, partial header values; the O1 rule refuses money, note and person keys; an "Index copies nothing" self-check for `-log`), m1 (rates and charges said without an amount), m2 (7-digit phones; a sentence-initial noun before "from <Organisation>"; a `cc:` line with only a role), m3 (private names from `catalogs.json`, every spelling), m4 (a moved date may move back), m5 (a missing workstream on the four verbs), m6 (the logs-only handling answer), m7 (`-action` prints its self-checks), m8 (roles with an acronym or a possessive), m9 (the held and superseded lines in the body's Writes column) and the nits. Every evaluator plant is a permanent test. A held-out set (15 our-side, 15 legitimate, 10 people, 10 private names) was written before any rule changed, and its before and after rates are reported. O4 and the rebase onto OW-04 still wait on OW-03 and OW-04.
