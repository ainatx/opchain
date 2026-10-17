# ow-start amendment — meeting and decision logs

**Date:** 2026-10-16 · **Status:** APPROVED 2026-10-16 with amendments H5 and T5. Built as ow-start 1.1.0 (OW-08, 2026-10-17); see §11.
**Amends:** `docs/plans/2026-10-06-ow-start-intake-redesign.md` (APPROVED 2026-10-06). It reverses that design's decision 13 for the logs only ("Meeting and decision logs are out of scope for 2.1.0"), after the owner's scope change of 2026-10-16 (every skill is released in v2.1.0).
**Version:** ow-start **1.1.0** (new verbs are a minor, per `semver-decisions.md`), shipping in v2.1.0 with the rest of the family.
**Family rules that apply:** ow-protocol v1; no `ow-review` (labelled same-session self-checks); code only in the `ow-tools` add-on; no public ow- skill names a private skill; one writer per file; `STATUS.md` is append-only and never holds client text.
**Origin:** the early pack's `ow-meeting-ops` (agenda → notes → decisions, actions, owners, dates) and `ow-decision-log` (business ADRs: context, options, decision, owner, revisit date), folded into ow-start by the 2026-09-21 strategy (§6.3).

The logs give every workstream one place for the meetings no other skill records and the decisions made along the way: an agenda before, notes and a client follow-up after, actions tracked until done, and decisions kept with a date to look at them again.

## 1. Owner decisions

| # | Date | Question | Answer |
|---|---|---|---|
| L1 | 2026-10-16 | Scope | The logs ship in v2.1.0 (reverses decision 13 for the logs) |
| L2 | 2026-10-16 | Which meetings | **Client meetings no other ow- skill records** (check-ins, steering calls, ad-hoc calls) **plus your own non-client meetings** (vendors, partners, planning). Meetings other skills record (fit call, Build Plan sessions, demos, UAT sessions, care calls) stay with them and are listed by link (§5) |
| L3 | 2026-10-16 | What the meeting log does | **All four:** agenda prep; notes from a transcript or your notes; a client follow-up email draft; actions tracked in `STATUS.md` until done |
| L4 | 2026-10-16 | Where decision logs live | **One per client workstream, plus one for your business** |
| L5 | 2026-10-16 | Decisions other skills record | **Indexed, not copied:** the log holds decisions not recorded elsewhere; its view lists the other skills' decision records by link |

## 2. Where files live

```
opchain-work/
  logs/<workstream>/            # <client> (the same id the other skills use) or "business"
    meetings/MTG-nn/
      agenda.md                 # -prep-meeting
      audio/                    # recordings; never committed
      transcript.md             # ow-tools transcribe --out, or supplied by you
      notes.md                  # -log-meeting
      follow-up.html  .txt      # -log-meeting (meetings with an external party)
    decisions/DEC-nn.md         # -log-decision, one file per decision, never edited
```

Prep's existing `.gitignore` question covers `logs/**/audio/` and `logs/**/transcript.*` too. People are recorded by role (`client ops lead`, `vendor account manager`, `you`); no names, emails or phone numbers in any file.

## 3. Verbs (added to ow-start)

| Verb | When | Does | Writes |
|---|---|---|---|
| `/ow-start-prep-meeting <workstream>` | Before | An agenda from: open actions for the workstream, its `awaiting:` lines in `STATUS.md`, decisions due for review, the last meeting's open questions, and whatever the user attaches. Each item is marked with its source. Asks the meeting's purpose, length and attendees (by role) | `meetings/MTG-nn/agenda.md` |
| `/ow-start-log-meeting <MTG-nn>` | After | From the transcript (`ow-tools transcribe <…>/audio/<file> --out <…>/MTG-nn/`) or the user's notes: what was discussed against the agenda, **decisions**, **actions** (owner by role, due date), open questions. Every item cites a transcript timestamp or a notes line. Then the follow-up draft (§4) and one `STATUS.md` line per action | `notes.md`, `follow-up.{html,txt}`, `STATUS.md` lines |
| `/ow-start-action <workstream> A-nn done \| dropped \| moved <date>`, or `DEC-nn reviewed` | Any time | Records an action's new state, or a decision kept at its review, as a `STATUS.md` line (§4.2, §6) | `STATUS.md` line only |
| `/ow-start-log-decision <workstream>` | Any time, or from a meeting's notes | One decision per file (§6). From a meeting: offers each decision in `notes.md` and writes the ones the user picks | `decisions/DEC-nn.md`, a `STATUS.md` review line when it has a review date |
| `/ow-start-log <workstream>` | Any time | One screen: meetings (its own and other skills', §5), open actions, decisions (its own and indexed), reviews due. Writes nothing | — |

`/ow-start` (resume) and `/ow-status` also list open actions and decisions due for review, from `STATUS.md` (§4.2).

## 4. Meetings

### 4.1 Notes and follow-up

`notes.md` sections: *Attendees (roles)* · *Agenda covered* · *Decisions* (D1, D2 …, each with who decided, by role) · *Actions* (A-nn: what, owner role, due date or "no date: asked") · *Open questions* · *Not covered*. Facts come only from the transcript or the user's notes; anything unclear is an open question, never a guess.

The follow-up (meetings with a client, vendor or partner): a short email draft, **Thanks · What we decided · Who does what by when · Still open**, written in plain words from `notes.md`, with owners by role (the user adds names when sending). No internal notes, hours, rates or private names. The skill never sends it; the user does.

### 4.2 Tracking actions in STATUS.md

Each action gets one line when it's logged, in the ow-protocol STATUS form with the action as the path and **no client text**:

    2026-10-16 (clock: tool) | ow-start 1.1.0 | logs/acme/meetings/MTG-03/notes.md#A-02 | next: none | awaiting: A-02 (client ops lead) by 2026-10-23

`-action` appends a later line for the same path: `awaiting: none (done 2026-10-21)`, `awaiting: none (dropped …)` or a new date. The status verbs show, per action path, the newest line, so an action is open until a later line closes it. Nothing reminds anyone: due and overdue actions show when the user runs `/ow-start` or `/ow-status` (ow-protocol §5).

## 5. The index (decision L5)

`/ow-start-log` lists, for the workstream, what other skills already recorded, by path and date, reading only whether each file exists and the date in its ow- artefact header (no content is copied):

| Kind | Files |
|---|---|
| Meetings | `intake/<client>/` (fit call) · `plans/<client>/workshops/W<n>/` · `builds/<client>/demos/M<n>/` · `uat/<client>/runs/RUN-nn.md` · `care/<client>/reports/M-nn.md` (monthly call) |
| Decisions | `intake/<client>/recap.md` (path) · `plans/<client>/contract-inputs.md` (accepted, signed, documentation line) · `builds/<client>/changes/CO-nn.md` (signed or declined) · `uat/<client>/signoff.md` · `handoffs/<client>/after-offer.md` (choice) · `docs/<client>/docs.yaml` (trainer) · `care/<client>/terms-addendum-*.md` |

A skill that isn't installed or hasn't run yet simply has no rows. The decision log never repeats one of these; a log entry may link to one (e.g. "DEC-04 follows CO-02").

## 6. Decisions (`DEC-nn.md`)

Fields: **Context** (why a decision was needed, with sources) · **Options** (each with its main trade-off) · **Decision** · **Decided by** (role) and date · **Confirmed** (`confirmed by <client role> by email on <date>, as reported`, or "internal") · **Review on** (a date, or "no review") · **Supersedes** (an earlier DEC-nn, or none).

A decision is never edited. Changing one writes a new `DEC-nn` that names the one it supersedes; the old file stays. A review date adds a `STATUS.md` line `awaiting: DEC-nn review by <date>`; at the review the user either logs a new decision that supersedes it, or keeps it with `/ow-start-action <workstream> DEC-nn reviewed`, which appends `awaiting: none (reviewed <date>, kept)`.

The **business** workstream holds the user's own decisions (pricing changes, tools, policies). It follows the same rules; nothing in it is ever written into a client file.

## 7. Self-checks (added to ow-start's)

Labelled *same-session self-check: the same assistant applying a checklist; a discipline, not an independent review*. `-log-meeting` and `-log-decision` print NEXT only when none is FINDING. **"People by role", "No client text in STATUS" and "No private names" can never be waived.**

| Check | Runs in | Passes when |
|---|---|---|
| Trace | `-log-meeting`, `-log-decision` | Every decision, action and open question cites a transcript timestamp, a notes line or an attached source |
| Owner and date | `-log-meeting` | Every action has an owner role and a due date, or "no date: asked" |
| People by role | every verb | No person's name, email or phone number in any file |
| No client text in STATUS | `-log-meeting`, `-action`, `-log-decision` | STATUS lines hold only ids, roles, paths and dates |
| Follow-up clean | `-log-meeting` | The follow-up has no internal notes, hours, rates or private names |
| Never edited | `-log-decision` | No existing `DEC-nn.md` changed; supersession by a new file |
| No private names | every verb | No blocklisted name (`llc-ops`) and no private skill |

## 8. Amendments this needs in other designs (approve with this one)

| # | Design | Amendment |
|---|---|---|
| H5 | `ow-handoff` | Access removal source 4 adds `logs/<client>/meetings/*/audio/` and `transcript.*` to the local copies of raw client material |
| T5 | `ow-tools` | The calls table (§4.2) gains the ow-start meeting row: `ow-tools transcribe logs/<workstream>/meetings/MTG-nn/audio/<file> --out logs/<workstream>/meetings/MTG-nn/`. No code change (`--out` exists) |

## 9. Acceptance tests

- **Agenda:** a workstream with two open actions, one decision due for review and one STATUS awaiting gives an agenda listing all four, each with its source.
- **Notes:** a fixture transcript gives two decisions and three actions, each citing a timestamp; an action with no owner fails "Owner and date".
- **Follow-up:** the draft has the four parts, owners by role, and no internal notes; a planted rate fails "Follow-up clean".
- **Actions:** logging three actions appends three STATUS lines with no client text; `-action … A-02 done` appends a closing line; `/ow-status` then shows two open actions.
- **Decisions:** a decision with a review date appends its review line; changing it writes `DEC-02` superseding `DEC-01`, and `DEC-01` is unchanged.
- **Index:** with a signed `CO-02.md` and `signoff.md` present, `/ow-start-log` lists both by path and date and copies nothing from them.
- **Business log:** a vendor meeting in `logs/business/` gets notes and a follow-up; nothing from it appears in a client workstream.
- **Private names:** with an empty `handoffs.yaml`, no output names `llc-ops` or "Deftwright".
- **Real use:** one real client check-in and one business decision logged by the owner.

## 10. Open questions

None at drafting; every question was decided as L1–L5.

## 11. Build notes (ow-start 1.1.0, OW-08)

Contract: `sprints/release-2.1/ow-08/contract.md` (approved 2026-10-17).

### 11.1 Owner rulings (2026-10-17, recommendations O1–O8 accepted)

| # | Question | Ruling |
|---|---|---|
| O1 | How the index is declared in the edges | A reads row with `index: true`: header keys only, cited in the reference the row names, and its producer must write the path (unless it is planned or an add-on). No hand-off row and no chain. `check-skill-contracts` enforces it |
| O2 | STATUS form for actions and reviews | Protocol §5's form. Open lines say `next: ow-start /ow-start-action logs/<workstream>/`; closing lines say `next: none (closed: done \| dropped \| reviewed \| superseded by DEC-nn)`. `awaiting:` is as in §4.2 and §6 |
| O3 | Does `-prep-meeting` append a STATUS line? | Yes: `awaiting: meeting on <date>`, closed by `-log-meeting` with `held <date>` |
| O4 | The ow-tools SessionStart hook hides open actions | Fix `lib/status.mjs` (newest line per item under `logs/`) as the next ow-tools patch, after OW-03 merges |
| O5 | The `-log-meeting` argument | `<workstream> [MTG-nn]`. With no id: the newest prepared, unlogged meeting, else a new `MTG-nn` marked "no agenda". Ids are numbered per workstream |
| O6 | Follow-up styling | `brand.yaml` when present (a `from: user` read), with ow-build's email rules; neutral styling without it |
| O7 | Where ow-start's changelog lives | `skills-work/ow-start/CHANGELOG.md`, per skill |
| O8 | Precision bar for the two meaning checks before REL-02 | The must-pass controls in C7 and C12 are the bar; a false positive found in evaluation becomes a control in the same round |

### 11.2 Departures and choices the build made

Where the build filled in what this design leaves open, or departed from its wording. None changes a business rule; where the design is silent, the skill asks the user and records the answer.

| # | Where | What the build does | Why |
|---|---|---|---|
| 1 | §5 | **The index, as built.** One `index: true` reads row per producer path, cited in `references/logs-status-and-index.md` §4, each reading `created` and at most one named header key: `intake/<client>/recap.md` (`path_label`), `plans/<client>/workshops/W<n>/transcript.md` (ow-tools; `created` only), `builds/<client>/demos/M<n>-record.md` (`demo_date`), `uat/<client>/runs/RUN-nn.md` (`session_date`), `care/<client>/reports/M-nn.md`, `plans/<client>/contract-inputs.md` (`accepted`), `plans/<client>/build-request.md` (`signed`), `builds/<client>/changes/CO-nn.md` (`status`), `uat/<client>/signoff.md` (`acceptance`), `handoffs/<client>/after-offer.md` (`choice`), `docs/<client>/docs.yaml` (`trainer`), `care/<client>/terms-addendum-<date>.md`. §5's `builds/<client>/demos/M<n>/` folder does not exist (ow-build writes `demos/M<n>-record.md`), the workshop folder is ow-tools' transcript, and "signed" for a plan is `build-request.md`. A file with no readable header is listed by path with "no date in its header". `ow-care` is in `catalogs.json` `planned` | O1: drift between this table and the producers is now a check failure; "copies nothing" is graded on every header value a row does not name |
| 2 | §3 | **The prep STATUS line** (O3): `-prep-meeting` appends `awaiting: meeting on <date>` on `…/MTG-nn/agenda.md`, `next: ow-start /ow-start-log-meeting logs/<workstream>/`; `-log-meeting` closes the meeting with a line on `…/MTG-nn/notes.md`, `next: none (closed: held <date>)`, `awaiting: none` | A prepared meeting is visible to resume |
| 3 | §4.2, §6 | **The STATUS form** (O2): open lines `next: ow-start /ow-start-action logs/<workstream>/`; closing lines `next: none (closed: done \| dropped \| reviewed \| superseded by DEC-nn)` with the §4.2 and §6 `awaiting:` text (`none (done <date>)`, `none (reviewed <date>, kept)`, `none (superseded <date>)`). An action with no date: `awaiting: A-nn (<role>), no date`. The full table is `references/logs-schema.md` §6; a closed grammar the checker holds every logs line to | A skill may not loosen protocol §5; §4.2 has no form for an undated action |
| 4 | §3 | **The verb argument** (O5): `/ow-start-log-meeting <workstream> [MTG-nn]`; ids are numbered per workstream, once | `MTG-03` exists in every workstream; an ad-hoc call has no id yet |
| 5 | §6 | **Superseding closes the review.** A new `DEC-nn` that supersedes one whose newest line is an open review appends a closing line for it (`superseded by DEC-nn`); `-log-decision` declares STATUS writes for both lines | Otherwise the old review stays open forever |
| 6 | step 0b | **Where handling is stored.** A client reads `intake/<client>/intake.yaml`, then `profile.md`; `business` reads `profile.md`; with neither, the answer is asked once and written as `handling:` in the header of the logs file being written, and later logs verbs read it from the newest logs file of that workstream. A logs verb never writes `profile.md` | One writer verb owns `profile.md`; a logs-only workstream needs a home for the answer |
| 7 | §2 | **The ignore question in the logs verbs.** The first logs verb that writes a file in a repository without `opchain-work/**/audio/` and `opchain-work/**/transcript.*` asks once and adds them only on yes; the answer is recorded as `gitignore:` (`added`, `declined`, `present`, `not a repository`) in the file's header, and a recorded `declined` is not asked again. The skill never writes into `audio/` and never transcribes | A logs-only workstream never runs prep, which asked before |
| 8 | §4.1 | **No signature name on the follow-up.** Owners are roles; the user's own actions start `me:`; no name and no signature anywhere (the user adds names and signs when sending). Without `brand.yaml` the email has no brand line and no footer | People by role can never be waived; "you" in a client email would read as the client |
| 9 | §4.1, C14 | **`notes.md` is written once.** Its header lists `log_steps` (`roles, notes, checks, follow-up, status`; no follow-up for an internal meeting). The roles, notes and checks are done before it is written; the follow-up step is done when both files exist and the STATUS step when every line is there, so a cut-off run resumes at the first missing step and never rewrites `notes.md`. Follow-up clean runs on the draft before `notes.md` is written, and again on resume | Write-once files and per-step resume |
| 10 | §3 | **An unlogged agenda.** `-prep-meeting` over a meeting with an agenda and no notes asks whether to redo that agenda or start the next meeting; a redo replaces `agenda.md` only on a yes and never once `notes.md` exists | Never overwrite a file without the user |
| 11 | §3 | **The awaited item** on an agenda is the client's newest STATUS line outside `logs/` (another skill's, or an intake's), when it still awaits something, with `STATUS.md: <path>` as its source | Siblings group a client's lines; one line per client |
| 12 | §6 | `DEC-nn.md` header keys: `id`, `decided_on`, `review_on`, `supersedes` (plus `handling` and `gitignore` when recorded); sections Context, Options, Decision, Decided by, Confirmed, Review on, Supersedes, Trace and the self-check results, written at creation | A decision file is never edited afterwards |
| 13 | §3 | `D<n>` and `Q<n>` are local to one `notes.md`; a `DEC-nn` from a meeting has `subject: logs/<workstream>/meetings/MTG-nn/notes.md#D<n>`, which is how `-log-decision` offers only decisions with no `DEC-nn` yet | Resume for decisions |
| 14 | SKILL.md | The body is capped at 4,500 tokens (`catalogs.json` `bodyTokenBudgets`); the logs' detail is in seven references, and `/ow-start-extract`'s five self-check rules moved from the body to `references/phase-extract.md` §7 (unchanged in substance) | The body budget; no row was lumped |
| 15 | §7 | Follow-up clean and People by role are category rules keyed on our side and on people, held to must-pass controls written before the rules (`tests/ow-start-logs-sentences.mjs`): ow-build's category rules are imported (our time with an effort word or a first-person subject, money in price context or ours, a ratio of a price, our side of the money, an overrun), plus internal markers and a margin that is not the client's; a quantity of time whose only people are the client's is theirs. People by role: email and phone shapes, the fixture's known names and the user's own, honorifics, `<Name> from <Organisation>`, `cc:` lines; no generic capitalised-word rule | D1, D2, O8 |
| 16 | §9 | H5 handover: `logs-larkspur-checkin` keeps `meetings/MTG-01/audio/` (a placeholder, no audio) and `transcript.md` for OW-06's H5 golden. The index golden layers ow-build's real change-order goldens; ow-uat's real sign-off golden joins it when OW-04 merges | Contract deliverable 9; never fresh stand-ins |
