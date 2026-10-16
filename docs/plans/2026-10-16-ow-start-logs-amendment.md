# ow-start amendment — meeting and decision logs

**Date:** 2026-10-16 · **Status:** APPROVED 2026-10-16 with amendments H5 and T5. Nothing is built.
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
