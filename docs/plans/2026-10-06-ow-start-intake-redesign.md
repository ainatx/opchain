# ow-start redesign — the 20-minute fit call and its recap

**Date:** 2026-10-06 · **Status:** APPROVED 2026-10-06; corrected after approval by a critique pass (no decision changed). Nothing is built.
**Changes:** `ow-start` as specified in `docs/plans/2026-09-21-opchain-work-and-2.1-strategy.md` §6.3 and the audit's skill list (`docs/audits/2026-09-18-ow-pack-design-audit.md`, "Skill list"). Both were brought onto this branch from the local-only `c7635b8d` (owner decision 2026-10-06), with the v1 draft the audit cites line by line.
**Release:** part of the ow- family that ships together as v2.1.0 (decisions 13–16). **First user:** Deftwright. opchain is the engine; the ow- family is the planning layer on top of it.

## 1. Summary

- `ow-start` stays the front door, but its main job becomes **the intake call**: prepare a 20-minute call, then pull as much as possible out of the recording.
- **The main output is the recap Deftwright advertises** for stage 01 of its process (staging.deftwright.com/how-we-work, checked 2026-10-06): "a written recap within one business day, with a recommended path", in four parts: *Today · What needs to change · Next step · What I need from you*. Everything else the skill writes is the evidence behind the recap.
- Three phases: **prep** (call guide + questions to send ahead), **run** (the guide is a one-page script; no AI during the call), **extract** (recording → transcript → evidence-backed intake record → **client recap with a recommended path** → `NEXT: use ow-build-plan`).
- **Two modes, chosen at prep:** *prospect* (scoping a possible client) and *delivery* (discovery on signed work). Each mode has its own question bank and scorecard.
- **Audio in, local only.** A recording (Google Meet or any audio file) is transcribed on the machine with Whisper, with speakers separated and then mapped to "client" vs "you" (the user; Aidan for Deftwright). Client audio never leaves the machine.
- Resume, status and setup stay in `ow-start` as secondary verbs. Meeting and decision logs are out of scope for 2.1.0 (the W0.x release train no longer exists; decision 13).
- The skill ships in the public catalog (owner decision 2026-10-06: push and mirror). Client material never goes in the repo; §8 says how that is enforced.

## 2. Owner decisions (2026-10-06)

| # | Question | Answer |
|---|---|---|
| 1 | Who is on the call | Both prospects and won-client stakeholders; mode picked at prep |
| 2 | How the call is captured | Recorded Google Meet or any other audio recording |
| 3 | Prefix | Keep `ow-` |
| 4 | Home | This repo, new catalog directory (`skills-work/` proposed) |
| 5 | Transcription | Local Whisper |
| 6 | Speaker labels | Yes, infer who said what |
| 7 | Visibility | Push to `ainatx/opchain` and mirror publicly |
| 8 | First pass | This design doc before any skill files |
| 9 | Transcription code and hook | Separate Claude Code-only plugin, **`ow-tools`** (renamed 2026-10-06 from `ow-tools` when it also took document export for `ow-build-plan`); `ow-start` stays text-only |
| 10 | Speaker separation | pyannote |
| 11 | Earlier opchain.work docs | Publish the 09-21 strategy and the audit into the repo |
| 12 | Recording consent | Left to the user; the guide doesn't script it |
| 13 | Release | The ow- family ships **together as v2.1.0**, built one skill at a time. Membership is decided skill by skill; `ow-start` is the first |
| 14 | 2.1.0 scope | **Replaces** the 2026-09-21 2.1 plan (`sprints/release-2.1/sprint-plan.md`); that plan's work moves to 2.2 |
| 15 | Versioning | Ships in v2.1.0, but ow- skills carry **their own per-skill versions**; the 2.1.0 changelog lists them |
| 16 | Ship gate | The owner's own Deftwright use plus each skill's acceptance tests. The outside 8-tester W0 study is not a release gate |
| 17 | Old 2.1 plan | Marked superseded in place; its work moves to 2.2. The ow- 2.1.0 plan is a new file beside it |
| 18 | OSS split | Moves to 2.2. ow- is built here under `skills-work/` and mirrored; the split later carries `skills-work/` with it |
| 19 | Starting version | Every ow- skill starts at **1.0.0** |
| 20 | Main output | The client recap (`recap.md`) in the site's four-part format with one recommended path; it replaces the separate follow-up email |
| 21 | Next skill | `ow-blueprint` is renamed **`ow-build-plan`** to match stage 02 on the site, and gains acceptance checks, risks/out-of-scope and the fixed quote. Designed in its own doc |
| 22 | Review | **No `ow-review` skill in 2.1.0.** Each skill runs its own checks, labelled *same-session self-check* |
| 23 | Private skills (family rule) | **No public ow- skill names a private skill** (e.g. `llc-ops`, or anything in the user's personal skill set). Any handoff that leaves the ow- family writes a neutral handoff file and points to a **destination the user configures** in `opchain-work/handoffs.yaml`. With no entry, NEXT prints a public default that works for anyone. Applies to every ow- skill; see §8.1 |

## 3. Verbs

| Verb | When | Does | Writes |
|---|---|---|---|
| `/ow-start` | Any time | First run: a welcome of 4 lines or fewer plus example sentences. Later: resume from `STATUS.md` and list open intakes with their next step. | — |
| `/ow-start-prep` | Before the call | Asks the mode, then reads whatever is attached (email thread, website text, referral note, earlier intake). Marks each bank question **already answered** (with source), **must-ask** or **if-time**, and fits the must-asks into 20 minutes. | `call-guide.md`, `send-ahead.md`, `intake.yaml` (mode, client slug, date) |
| `/ow-start-transcribe` | After the call (needs `ow-tools`, §7) | Runs the local pipeline in §6 on the recording and shows two sample lines per detected speaker so the user can confirm who is who. | `transcript.md`, `transcript.json` |
| `/ow-start-extract` | After transcribe, or with notes only | Fills the intake record from the transcript (or the user's notes), scores coverage against the guide, then writes the **client recap** with a recommended path. Seeds `profile.md` and prints NEXT. | **`recap.md`** (main output), `intake-record.md`, `coverage.md`, `profile.md` (first run only), one `STATUS.md` line with the recap due date |
| `/ow-setup` | Any time | Edits `profile.md`; every question can be skipped | `profile.md` |
| `/ow-status` | Any time | One-screen status from `STATUS.md` | — |

`/ow-start-extract` also accepts a transcript the user supplies (Meet's own transcript Doc, a `.vtt`, pasted text) and skips transcription. With notes only, it runs and caps confidence at MEDIUM (§5.1).

## 4. Prep: the call guide

### 4.1 Time box (both modes)

| Min | Block | Purpose |
|---|---|---|
| 0–2 | Open | State the goal of the call and the next step it should end with (recording consent is the user's own, unscripted) |
| 2–8 | Problem and how it works today | Concrete last occurrence, start to finish |
| 8–13 | Systems and constraints | Tools, data, rules, hard limits |
| 13–17 | Success and decision | What changes, by when, who decides |
| 17–20 | Read back | Read back *Today* and *What needs to change* in the recap's own words, take corrections, and say when the recap will arrive |

The guide prints each block with a clock time and at most **3 must-ask questions** per block, plus if-time questions underneath. There are about 10–12 must-asks in total, because 20 minutes doesn't fit more.

### 4.2 Question design rules

- **Anchor to an event, not an opinion:** "walk me through the last time" beats "how does it usually go".
- **One field per question.** Every bank question names the intake field it fills, so coverage can be scored afterwards.
- **Ask for the number.** Volume, frequency, cost of a miss, deadline.
- **Find the no:** "who else has to say yes, and what would make them say no?"
- **Skip what is known.** Anything prep found in the attached material shows as "already answered: <source>". The call only confirms it, which costs about 10 seconds.
- **Follow-up prompts** sit under each question for when the answer is vague ("can you give me a number, even a rough one?").

### 4.3 Question banks (starter set; lives in `references/question-bank-<mode>.md`)

| Field | Prospect mode | Delivery mode |
|---|---|---|
| `trigger` | "What made you reach out now, and not six months ago?" | "What kicked off this project internally?" |
| `current_process` | "Walk me through the last time this happened, start to finish." | Same, plus "where does it start, and where is it really finished?" |
| `owners` | "Who touches it first? Who's the last person?" | "For each step: who does it, who checks it?" |
| `pain` | "What happens when it goes wrong? Who finds out, and how?" | "Which step fails most? What does a bad week look like?" |
| `volume` | "How often, and how many?" | "How many per week, and what's the peak?" |
| `systems` | "What tools does this touch today?" | "Which systems hold the record? Where do people copy and paste?" |
| `data_records` | — (if time) | "What has to be kept, for how long, and who asks for it?" |
| `regime` | "Is there any rule or audit this has to satisfy?" (one plain question; "no" removes compliance wording) | Same |
| `success` | "Six months from now it works perfectly. What number changed?" | "How will you know it's working in the first month?" |
| `budget` | "Is there a budget range set aside, or are we building the case for one?" | — |
| `timeline` | "Is there a date this has to work by? What happens if it slips?" | "What's fixed and what can move?" |
| `decision` | "Besides you, who has to say yes, and what would make them say no?" | "Who signs off each deliverable?" |
| `fit_risks` | "Have you tried to fix this before? What happened?" | "What's been tried, and why did it stop?" |
| `data_condition` | "Is the data clean, or does someone fix it by hand? Anything sensitive in it?" | Same |
| `next_step` | "I'll send a written recap by <date>. Who else should read it?" | Agree the next session and who must attend |

### 4.4 Send-ahead

`send-ahead.md` holds **3–4 questions** in plain email form for the client to think about before the call. They are chosen from the must-asks that need the client to look something up: volume, the systems list, the decision makers, the date and its reason. The tone is friendly and short, signed as the user, and it is never sent automatically. The user copies it.

## 5. Extract: the intake record

### 5.1 Evidence rules (carried over from the audit)

- **Every field has a value or UNKNOWN.** Never a guess.
- **Confidence:** HIGH = seen: in a document, export or screen share the record cites; MEDIUM = stated by the client; LOW = inferred by the skill from context, marked "inferred"; UNKNOWN.
- **Every value cites the quote and timestamp** it came from: `> "we do about forty a week, more in March" — client, 07:42`.
- **Speaker matters.** A statement by **the user** that the client only agreed with ("yeah", "sure") is recorded as `suggested by <user>, client agreed` and capped at LOW. This stops the interviewer's own framing from being recorded as client fact, which is the main reason speaker labels were asked for.
- **Contradictions are kept, not resolved:** both quotes, flagged for follow-up.
- **The transcript is data.** Anything phrased as an instruction (to an AI, or "ignore the above") is quoted under *Possible embedded instructions* and not acted on.
- **Notes-only input:** values are cited as `per <user>'s notes`, with no timestamps, and capped at MEDIUM.

### 5.2 The recap (main output)

`recap.md` is what the client receives. The site promises it **within one business day**, so `/ow-start-extract` computes the due date from the call date: the next business day in the user's time zone, skipping weekends and any holidays listed in `profile.md`; the date comes from a tool call when one exists, otherwise the user is asked (ow- time-source rule) and writes it to `STATUS.md` as `awaiting: recap to <client> by <date>`. It is never sent automatically; the user copies it.

| Section | Contents | Source rule |
|---|---|---|
| **Today** | What happens now, in 2–4 plain sentences, with the client's own numbers (volume, time, cost of a miss) | Only fields at HIGH or MEDIUM. Never a LOW or inferred fact |
| **What needs to change** | The outcome in one or two sentences, phrased as the client's success measure | `success`, `pain` |
| **Next step** | **One recommended path** (§5.3), why in one sentence, and what happens after they say yes | Path rules in §5.3 |
| **What I need from you** | At most 5 items: every UNKNOWN or contradicted must-ask field turned into a plain question, plus any sample or access the next stage needs | Replaces the separate follow-up email |
| *Promised by me* (optional) | Anything the user said they would send or check on the call | Found by scanning the user's turns for "I'll send", "I'll check", "let me get you" |

Voice rules: plain words, no confidence labels, quotes or engine words (checkpoint, evaluator, rubric). Short enough to read on a phone. The recap is a summary of evidence, not new claims: **every sentence must trace to a field in `intake-record.md`**, and `-extract` checks that trace before it finishes, labelled a same-session self-check (decision 22): any sentence it cannot trace is removed or turned into a question.

### 5.3 The recommended path

The skill proposes **one** path and the user confirms or changes it before the recap is final. Path names, tiers and fit criteria are **not hard-coded**: they come from an `offers.md` file the user keeps beside `profile.md`. The public skill ships an invented example; Deftwright's real file lives in the Deftwright workspace and is never committed here.

Deftwright's `offers.md` would hold, from the site (2026-10-06):

| Path | When the skill proposes it |
|---|---|
| **A defined piece of work** (a workflow, two tools connected, reporting, a fix, a website) | One system or a clear small job, clean data, approach obvious |
| **Build Plan — 1 system** | A larger build touching one system, or messy or sensitive data, or the approach is unclear (the site says a Build Plan is required in these cases) |
| **Build Plan — 2 systems** | Same, two systems |
| **Build Plan — 3+ systems or an MVP** | Same, three or more systems, or a new product |
| **AI feasibility** | The client's question is "could AI do this?" |
| **Not the right fit** | Outside the fit list (teams of 5–50 on SaaS tools and spreadsheets; funded founders pre-seed to Series A; a problem you can say in a sentence; one person who can decide), said honestly, with a suggestion if there is one |

The recap names the path, not a price: the site says the fixed quote comes in writing after scoping, and pricing belongs to `ow-build-plan`. In delivery mode the path is the next session or the next stage of the signed work.

**Who writes the user's own files.** `offers.md` (and, for `ow-build-plan`, `price-book.yaml` and `brand.yaml`) are written by the **user**, by hand. `/ow-setup` can create each one from the invented example, then never edits it again. This keeps the ow- one-writer-per-file rule.

**Edge cases.** A recording that starts late or stops early is extracted as far as it goes, and `coverage.md` marks the missing span. A call that runs long is fine; the time-per-block notes show where. With 3+ people, every non-user speaker counts as client evidence under their confirmed role.

### 5.4 Behind the recap

`intake-record.md`: header (artefact header per the ow- contract: written_by, workstream, created with clock source, origin), mode, client, call date, attendees by role, then one section per field: value · confidence · quotes · open question if not HIGH. This is the evidence the recap and `ow-build-plan` read.

`coverage.md` (for the user only): every must-ask with its status (**answered / partly / not asked / answered unprompted**) and the call's coverage score, e.g. `9 / 12 must-asks answered; 2 partly; 1 not asked (budget)`. It also notes where time went in each block (from the timestamps), so the user can improve how they run the next call.

**Prospect mode adds** a **fit read** inside `coverage.md`: signals for and against (budget stated, decision maker on the call, a real deadline, tried before and failed, the fit criteria from `offers.md`) with the quote behind each. It supports the path choice; the decision is the user's.

### 5.5 Handoff

```
DONE: recap ready -> intake/<client>/recap.md (send by 2026-10-07; path: Build Plan, 2 systems)
NEXT: when the client agrees, say "use ow-build-plan on intake/<client>/intake-record.md"
      It will read: intake-record.md, recap.md (path), coverage.md
IF IT IS NOT AVAILABLE: the recap and intake record stand on their own.
```

When the path is *not the right fit*, there is no NEXT; the workstream is closed in `STATUS.md`. The intake record's fields are the ones `ow-build-plan` needs first (process, owners, systems, data condition, success, timeline, decision), so its first step pre-fills from them and only asks about UNKNOWN or LOW fields. The matching "reads from" row on the build-plan side is part of this work (§9).

## 6. Transcription pipeline (local)

Checked on this machine 2026-10-06: `ffmpeg` and `brew` present, Apple Silicon (arm64), Python 3.14 is the default `python3`; no Whisper tools installed.

| Step | Tool | Notes |
|---|---|---|
| 1. Normalise | `ffmpeg` → 16 kHz mono WAV | Accepts whatever Meet saves (.mp4/.webm/.m4a) and any other audio |
| 2. Transcribe | **whisper.cpp** (`brew install whisper-cpp`, `whisper-cli`), model `large-v3-turbo` | Metal-accelerated on Apple Silicon; JSON output with segment timestamps; no Python. A 20-minute call should take a few minutes — **to measure** |
| 3. Separate speakers | **pyannote** speaker-diarization (owner decision) in a dedicated `uv` venv with a pinned Python (3.12) | Torch wheels for 3.14 are not assumed. The pyannote models are gated on Hugging Face: one-time terms acceptance + a read token stored outside the repo (keychain or `~/.config`, never the intake folder). Runs locally after the model download; no audio is sent |
| 4. Merge | Small script assigns each Whisper segment to the overlapping speaker turn | Produces `transcript.json` (segments with start, end, speaker, text) and a readable `transcript.md` |
| 5. Confirm | The skill shows two sample lines per speaker and asks who each one is | A 3+ person call gets roles typed by the user ("SPEAKER_02 = their ops lead"). Never guessed from a name |

**Install** is a one-time `/ow-start-transcribe --setup` that prints the exact commands and checks each one. The skill never runs `brew install` itself.

**Fallback:** if any step is missing, the skill says which and offers the paths that still work: use Meet's own transcript Doc, or extract from notes.

## 7. Where the code lives, and the Core text-only rule

The 09-21 plan made Core bundles **text-only** (no scripts, no hooks) so a government administrator could approve them in one sitting. Transcription needs scripts, so they are split out (owner decision 2026-10-06):

- `skills-work/ow-start/` stays text-only and follows the original rules. On any host, with a transcript supplied, it does prep and extract.
- **`ow-tools`** is a separate Claude Code-only plugin. It holds the setup check, the transcription pipeline and the merge script (and, for `ow-build-plan`, the PDF/Word export), declares that it runs code, and lists its needs: ffmpeg, whisper.cpp, a uv-managed Python 3.12 venv with pyannote, and a Hugging Face token. `/ow-start-transcribe` is its command; when the plugin isn't installed, `ow-start` prints the not-available branch and offers the transcript and notes paths.
- The plugin also carries a **SessionStart hook** that lists open intakes and their next step, the hook the original plan had to drop, which works here because this is Claude Code.

## 8. Publishing publicly without leaking client material

- **Working folder is outside the repo:** `opchain-work/intake/<client>/` sits in whatever project folder you're working in (e.g. the Deftwright repo or an unsynced folder), never in `ainatx/opchain`. The repo holds skill source and example data only.
- **Recordings and transcripts are never committed.** Recordings are always saved under `intake/<client>/audio/` (gitignore has no `{a,b}` brace expansion, so one folder rule is safer than an extension list). `/ow-start-prep` checks whether the working folder is inside a git repo. If it is, it adds `opchain-work/**/audio/` and `opchain-work/**/transcript.*` to that repo's `.gitignore` after asking. The intake record is the user's to commit or not.
- **Examples in the public catalog are invented and say so:** a fictional client and a synthetic transcript, used by the acceptance tests.
- **Mirror:** `.github/workflows/mirror-public.yml` gains `skills-work/` in the same PR that first adds skill files, not this one.

### 8.1 Handoffs outside the family (decision 23)

The public catalog and a user's private workflow meet in one file the user owns, never in skill text.

```yaml
# opchain-work/handoffs.yaml (user-written; the public skill ships an example with only defaults)
contract:                      # from ow-build-plan, after the client accepts the quote
  say: "use llc-ops to draft the SOW from {files}"     # Deftwright's private setup
build:                         # from ow-build-plan, once signed
  say: "use oc-app-architect and attach {files}"
```

| Rule | Detail |
|---|---|
| Neutral file first | The producing skill always writes a handoff file anyone can use (e.g. `contract-inputs.md`), whoever acts on it next |
| Where the file lives | **Per workspace** (owner decision 2026-10-08): `opchain-work/handoffs.yaml` in each project folder, so different businesses or folders can point to different places. No global file |
| Configured destination | NEXT prints the `say:` line from `handoffs.yaml`, with `{files}` filled in. The skill never checks or names what that destination is |
| Public default | No entry → a default written for anyone, e.g. "Send `contract-inputs.md` to whoever drafts your contracts, or fill your own SOW template from it." |
| Same rule for brand names | Skill text never names Deftwright. Business-specific wording lives in `offers.md`, `brand.yaml`, `price-book.yaml` and `handoffs.yaml` |
| Build check | The ow- catalog build fails if a SKILL.md, reference or command names a skill outside the ow- family, apart from the declared opchain.dev export (`build-request.md`). A private-name blocklist is checked too, so a leak fails loudly. Owner decision 2026-10-08: the list is **`llc-ops`**; names are added when a new private handoff appears |

## 9. Work this implies (for the sprint plan, not this doc)

1. `catalogs.json` and per-catalog iteration in `gen-skills-catalog.mjs` / `check-skill-contracts.mjs` before any ow- SKILL.md lands. This is the audit's prerequisite. Until it exists, never point `OPCHAIN_SKILLS_DIR` at `skills-work/`, because two scripts delete their destination.
2. `ow-protocol` block (short, shared) — `ow-start` is its first consumer.
3. `skills-work/ow-start/`: SKILL.md (body under ~5k tokens), `references/phase-prep.md`, `phase-extract.md`, `question-bank-prospect.md`, `question-bank-delivery.md`, `intake-record-schema.md`.
4. Transcription add-on: setup check, normalise → transcribe → diarize → merge script, the SessionStart hook.
5. The `ow-build-plan` "reads from" row for `intake-record.md` and the recap's path (the receiving end of §5.5), and the `offers.md` format with an invented example.
6. Mirror workflow + install path (symlink into `~/.claude/skills`, like the oc- catalog).
7. The `handoffs.yaml` format with a defaults-only example, and the build check from §8.1 (no skill outside the family named; private-name list).

## 10. Acceptance tests

- **Synthetic call:** a scripted 20-minute two-voice recording of a fictional client, with known answers planted, including one contradiction, one interviewer-led answer and one embedded instruction. Pass when every planted fact is extracted with the right confidence and speaker, the contradiction is flagged, the interviewer-led answer is capped at LOW, and the instruction is quoted and not followed.
- **Coverage scoring:** remove the budget question from the recording; `coverage.md` must show it "not asked" and the recap's *What I need from you* must ask it.
- **Recap trace:** every sentence in `recap.md` maps to an `intake-record.md` field at HIGH or MEDIUM; a planted LOW fact must not appear in *Today*.
- **Path choice:** three synthetic calls (small clean job, two systems with messy data, out-of-fit team of 200) must propose a defined piece of work, Build Plan — 2 systems, and not the right fit.
- **Notes-only path:** the same call as typed notes; every value is capped at MEDIUM with no timestamps.
- **Transcription spike:** time whisper.cpp `large-v3-turbo` and pyannote on a real 20-minute Meet recording; check speaker-label accuracy on a 2-person and a 3-person call. If pyannote mislabels badly, sherpa-onnx is the fallback to try.
- **Real use:** three of your own intake calls, prep through extract. The bar: a recap you would send with light edits, inside the one-business-day promise.

## 11. Open questions

1. Plugin home: `plugins/ow-tools/` beside `plugins/opchain/`, published from a separate work marketplace manifest (the audit's advice: admin approval matches a marketplace, not its entries). Confirm when the sprint plan is written.
2. Speed: is a 20-minute call transcribed and separated in under ~5 minutes on this Mac? Measured in the spike; if not, the turbo model drops to `medium`.
