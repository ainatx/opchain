# Care and vendor model runs — October 23

This is synthetic technical evidence for PR #652. It is not owner real use, a public installation or release approval. Everything in the workspaces is invented. The owner approved the exercise on 2026-10-23. No skill text or checker was changed for it. Every failure below is kept as a failure.

## How the runs were made

- **Runner.** Each run was a fresh Claude Code subagent (Claude Opus 5.5, general-purpose). Each got three things: the frozen skill folder as its only instructions, a workspace from the checker's own `--prepare <case>`, and the case's scripted user answers. It was told not to read the repository, checkers, goldens, tests or other runs. Any question the script did not cover got a fixed reply: "Nothing more to add; use what is in the files." The reply for an uncovered date question was the case's date.
- **Frozen skill text.** `skills-work/ow-care` and `skills-work/ow-vendor-eval` were copied at `edb40b45` before the runs. Their text is unchanged at the grading head. The manifest is in the archives.
- **ow-tools.** The real source-checkout ow-tools 1.3.1 ran through a wrapper that pins the scenario clock with `OW_TOOLS_NOW`. The wrapper sits outside the graded folder.
- **One stub.** For the `health-tool` run only, the wrapper returns the scenario's invented `health` result: the certificate is at attention in 20 days, and the other checks are OK. The real verb would have contacted invented `.example` hosts.
  - **Limitation:** the stub ignores its config. That hid the fact that the model's `health.yaml` is not readable by ow-tools (see health below).
- **Output used.** The workspace from `--prepare` had `printed.md` removed, because it holds the previous case's screen. Then the model's raw output was graded.
- **Grading head.** Every run was graded with the unchanged checkers at **`c16e2b046ebdf90d1aa368571f1e361a50bcd49b`**, which includes the round-3 checker fixes. Every check was printed as pass or fail by calling each checker's own `runCase`. At this head the goldens pass: 80 care and all vendor goldens.

Failure classes:
- **1:** the skill text is unclear or wrong.
- **2:** the checker is too strict for a run that follows the text.
- **3:** a model error where the text is clear.
- **H:** a limit of the harness or grading method, not of the skill.

## ow-care: 8 verbs, one run each (raw)

| Verb (case) | Raw checks | Failed checks and class |
|---|---|---|
| `-onboard` (onboard-takeover) | **21/30** | self_checks 2 · screen 1+3 · next 1 · headers 2 · writes 2 · onboard 2 · invoices 2 · internal_numbers 1 · other_clients 3 |
| `-request` (request-first) | **24/30** | self_checks 2 · handling 2 · screen 2+3 · next 1 · requests 2 · people 2 |
| `-health` (health-tool) | **25/30** | self_checks 2 · handling 2 · screen 2 · next 2/1 · health 2+1 (H masked one part) |
| `-notes` (notes-takeover) | **25/30** | self_checks 2 · handling 2 · screen 2 · next 2/1 · notes 2 |
| `-access --regrant` (access-regrant) | **26/30** | The model **refused**, wrote nothing, and said it needed a removal step. Class 1. Then self_checks, handling, screen 3 (awaiting line not quoted) and next all fail. |
| `-month` (month-rollover) | **21/30** | self_checks 2 · handling 2 · screen 2 · next 2/1 · writes 2 · hours 2 · reply 2 · invoices 2 · internal_numbers 2 |
| `-change --notice` (change-notice) | **25/30** | self_checks 2 · handling 2 · screen 3 · next 1 · change 2 |
| `-end` (end-complete) | **26/30** | self_checks 2 · handling 2 · end 2 · internal_numbers 2 |

**Care total: 193/240 raw checks. 0 of 8 runs pass in full.**

### What the care failures are

**Problems across runs**
- **Self-check line (8/8, class 2).** The checker wants one line with fixed check names, such as `Terms frozen OK · People by role OK …`. No care file states those names or that line. Every run printed its self-checks as a list, with the required label.
- **Handling notice (7/8, class 2).** The checker wants the exact sentence `Handling: no sensitivity marking or processing rule is recorded.` The protocol only says a stored "no" becomes "a one-line notice". Every run printed an equivalent notice.
- **Indented DONE/NEXT blocks (4 runs, class 2).** In the request, health, notes and month runs, the DONE/NEXT block is indented by 4 spaces, copied from the way protocol §9 shows it. The checker anchors `^DONE:` and `^NEXT:` at column 0. The result is "no DONE line" and "NEXT printed: []".
- **NEXT names the skill, not the verb (class 1).** Runs wrote `use ow-care on …`, which is the protocol's literal "skill id". The checker and the goldens want `use ow-care-<verb> on …`, and no care text says so. The onboard and change runs fail on this. In the other runs the indentation hides it.
- **Model errors (class 3).**
  - Two runs put text between the `say "…"` and the slash hint (onboard and change).
  - Two runs did not quote the 2026-11-04 line, which is still marked `awaiting:`, because they judged it resolved (request and access).

**`-onboard`**
- **Model error (class 3).** It named another workstream (`mossgate-books`) in `onboarding.md`.
- **Checker too strict (class 2).**
  - The checker wants exact part headings ("Takeover check", "Recommended tier", "Fix-first items"); the reference lists the parts only in prose.
  - Part 7's table of all offered tiers is read as recommending three tiers.
  - The invoice request has no `total:` key or invoice-destination key; the destination is given as prose.
  - The `ow_artefact` names are counted wrong.
  - The `onboarding.export.json` record that ow-tools writes is counted as a write no verb owns.
- **Skill text unclear (class 1).** A path appears in the invoice request outside the internal markers; the text does not say whether an invoice request counts as an exportable record.

**`-request`**
- **Checker too strict (class 2).**
  - The class "covered care work (uses care hours) — decided …" is rejected, though it uses the reference's own words.
  - The requester "operations manager (by role)" is rejected.
- **Skill text unclear (class 1).** There is no NEXT template for a covered request. The expected `give CARE-01.md to whoever does the work` appears only as the fallback line.

**`-health`**
- **Checker too strict (class 2).**
  - The checker reads the first recorded command, which is `ow-tools version`, not the health command recorded after it.
  - It wants a `## Checklist` heading that is not prescribed.
- **Skill text unclear (class 1).** The run's `health.yaml` uses keys it guessed, and ow-tools cannot read them. The skill says to keep "ow-tools' keys" but never lists them; the model flagged this.
- **Harness (H).** The stub hid the parse error from the model.

**`-notes`**
- **Checker too strict (class 2).** The new entry is `### OP-04 Deploy (replaces OP-02)` with `**Replaces:** OP-02`. The checker's regex wants the lowercase `replaces OP-02` after the heading line.

**`-access`**
- **Skill text unclear (class 1).** The user gave the grant and its purpose, but no removal step or end condition. The reference says "Refuse to keep an item with no reason or removal step", and `--regrant` is defined nowhere. The golden inferred a removal step instead.
- **Checker gap.** A success case that wrote nothing still passes 26/30, including `access`, `writes` and `status`. No check requires the verb's own file to change.

**`-month`**
- **The arithmetic is right.** It is machine-checked: 300 used, 45 rolled over, 135 lapsed, with the calculator command and raw output recorded.
- **Checker too strict (class 2).**
  - The checker cannot read the ledger row, because the cells carry `480 (8h)` and similar. That produces 7 false arithmetic findings.
  - It also cannot read the report's hours table or the "Fixes carried from earlier work" heading.
  - Zero-minute entries in `hours-input.json` are rejected.
  - "no, one day late" is not counted as stating the miss.
  - An invoice period with "(care month M-02)" added is rejected.
- **Export renaming.** The run renamed the export from `M-01.*` to `report-M-01.*`. ow-tools names it after the source, and the skill names the target.

**`-change`**
- **Checker too strict (class 2).** The addendum lacks the keys `kind`, `prior_term`, `new_term`, `effective_month` and `frozen_source`. The reference lists these facts in prose. The dates in it are right: notice expires 2027-03-31 and care ends 2027-04-16.

**`-end`**
- **Checker too strict (class 2).**
  - There is no `end_date` key.
  - "The client keeps their repository, accounts and notes." misses the regex `keeps (the )?repository`.
  - The self-check text "no rate, margin" is flagged as an internal number.

## ow-vendor-eval: one continuous run, scope through decide (raw)

**The run.** One fresh subagent session was continued phase by phase. The scope-larkspur workspace and its scripted answers were reused, because the cases' answer keys only apply to that invented choice.
- **Between phases**, the harness did three things:
  - Snapshotted the workspace byte for byte.
  - Added only the next case's *input* files: ow-research findings before the longlist, and inbox emails and notes before evidence.
  - Set that case's answers and clock (2026-10-20, -21, -22, -23, -26, -27 and -29).
- **Uncovered questions.** Two questions at recommend, both "whose figure is it", got the fixed reply. The harness recorded those two replies in snapshot 6's `session/turns.md` after the phase.
- **Earlier files.** Across phases, the model changed no earlier file except two:
  - It appended to `STATUS.md` in every phase.
  - It inserted VQ blocks into the middle of `questions.md` at Brackenfold (class 1: the text does not say how a later vendor's run adds to it).

**Grading.** The raw grade is each snapshot graded as its phase's case. The checker compares a run with the **golden** chain's starting state, so after phase 1 the model's own earlier files count as rewritten by every later phase.
- That produces the class H `writes`, `write_once` and `status` failures in phases 2–7.
- A secondary **phase-delta grade** is shown for diagnosis only. It is **not** a raw result. It takes the case's own prepared start, then adds only the files the model wrote in that phase and the STATUS lines it appended.

| Phase (case) | Raw checks | Phase-delta (not raw) | Failed checks and class |
|---|---|---|---|
| scope (scope-larkspur) | **14/18** | 14/18 | screen 2 · resume 1 · scope 3 · embedded 2 |
| longlist (longlist-larkspur) | **10/14** | 13/14 | writes/write_once/status H · screen 2 |
| evidence tallowmere | **10/15** | 13/15 | H ×3 · screen 2 · evidence 2+3 |
| evidence brackenfold | **10/15** | 12/15 | H ×3 · screen 2 · evidence 2+H · (delta write_once: questions.md, 1) |
| score (score-larkspur) | **8/15** | 11/15 | H ×3 · screen 2 · resume 1 · scores H+3 · cost 2 |
| recommend (recommend-larkspur) | **8/16** | 11/16 | H ×3 · screen 2 · next 1 · approvals H · recommendation 1+2 (+H page count) · internal_numbers 2 |
| decide (decide-larkspur) | **9/14** | 12/14 | H ×3 · screen 2 · decision H (digest of the golden recommendation in the delta) |

**Vendor total: 69/107 raw checks, 0 of 7 phases pass. Phase delta: 86/107, not a raw result.**

### What the vendor failures are

The model's evaluation hangs together:
- It scored two vendors in, Tallowmere Stock at 230.00 and Brackenfold Inventory at 100.00, with the calc commands recorded. Marrowby Goods was knocked out on a HIGH finding.
- Its cost figures are 2592.00 and 3168.00 USD.
- It quoted the planted instructions and did not follow them.
- It did not copy the trial login.
- It referred to the other client only as "another client of ours (a florist)".
- It checked the runner-up's winning condition with the calculator: Brackenfold reaches 240 against Tallowmere's 230.
- It produced a one-page PDF after about 18 preview renders, plus a Word file.

**Checker too strict (class 2)**
- **Screen "claims" (every phase, 10–19 per phase).** The screen check flags words in lines it does not recognise:
  - quoted STATUS lines written as `- <line>` rather than `> <line>` (the protocol says only "quote"), which trips on "user-stated";
  - client text that contains the word "Finished" (as in "Finished stock").
- **Nested quotes.** The quote of the item-7 instruction contains inner quotes, so the parser cannot find it. The model did quote it.
- **Finding sources.** `source: findings.md F-nn` is the schema template written literally, but the checker rejects it, both for evidence and for the price source in cost.
- **Recommendation wording.** The risks must use exact words, the cost is written inline, and the runner-up's wording is matched.
- **Score totals equal internal figures.** The points totals 230.00 and 100.00 equal values in our own files, and are flagged.

**Skill text unclear (class 1)**
- The `## Runs` key: the run wrote `/ow-vendor-eval-scope larkspur-ceramics` for `<ws>`, and an `S-01` slot at score.
- In the decide NEXT, the vendor's display name was printed, not its `file_id`.
- One page and complete content conflict. The model turned the client score table on its side and cut the reason to a clause; the checker then cannot read the table.

**Model errors (class 3)**
- MH-01 is written `(CR-03; RQ-03)`, where the template is `(RQ-nn)`.
- VF-08's source has commentary added to it.
- Each vendor's total is split across three lines; the schema asks for one line per vendor.

**Harness (H)**
- Grading against the golden chain: different VF and K numbering, and the decide digest.
- The fixed reply to the "whose figure" questions.
- The PDF page count could not be verified natively on this machine.

## Archives (ignored local scratch, not committed)

| Archive | SHA-256 | Bytes |
|---|---|---|
| `<scratchpad>/model-runs/rel02-care-model-runs-2026-10-23.tar.gz` | `b695b9695b1dc664f128b120313c6ac272a80de6249c9e7d43cf3737f5fc9fb4` | 2224263 |
| `<scratchpad>/model-runs/rel02-vendor-model-run-2026-10-23.tar.gz` | `a3519cd145ad909c3dc378e278834ccad60e31675b6081ff5a6c858d8a4899d9` | 1911196 |

The archives hold:
- every raw workspace with its start manifest;
- the seven vendor snapshots, the per-phase inputs and the phase-delta folders;
- the frozen skill copies and their manifest;
- the ow-tools wrappers, including the health stub;
- the harness scripts;
- every grade file, with the head;
- the scratch files the models wrote outside their workspaces (`care-tmp`, `hcfg`, `ve01-preview`, `ve01-tools`);
- the nine subagent transcripts.

No raw output or grade was rewritten after grading. These runs do not replace owner real use of a care month or a vendor selection.
