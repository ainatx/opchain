# ow-tools — design

**Date:** 2026-10-09 · **Status:** APPROVED 2026-10-09 (decisions in §1.1). Build in progress; the speed spike result goes in §10. **Amended 2026-10-16 for 1.1.0** (amendments T1–T7, approved with their designs; Sprint T contract `sprints/release-2.1/ow-sprint-t/contract.md`): the sections marked 1.1.0 below, and §14.
**Release:** the one Claude Code-only add-on of the ow- family that ships together as v2.1.0. Starts at 1.0.0 (ow-start decision 19).
**Sources** (on branch `claude/planning-family-skills-82032d`): ow-start (`2026-10-06-ow-start-intake-redesign.md` §6, §7, §8, §10, decisions 9, 22–23, open questions 1–2) · ow-build-plan (`2026-10-06-ow-build-plan-design.md` §4.1, §6.2, §7, decision 7) · ow-build (`2026-10-08-ow-build-design.md` §5, §9) · ow-handoff, draft (`2026-10-08-ow-handoff-design.md` §4, §6) · ow-uat, draft (`2026-10-09-ow-uat-design.md` §5, §9) · the authoring standard in `docs/audits/2026-09-18-ow-pack-design-audit.md` (R1–R16 and the bullets under it).
**Family rules that apply:** ow- skills stay text-only and every piece of code the family needs lives here (ow-start decision 9, ow-build-plan decision 7); no `ow-review`, so checks are labelled same-session self-checks (decision 22); no public ow- file names a private skill, blocklist `llc-ops` (decision 23, §8.1).

## 1. Summary

- `ow-tools` is one plugin at `plugins/ow-tools/`. It runs code on the user's machine and says so. The ow- skills never depend on it: every call has a written absent-case, and on any host without it the skills still do their job from a transcript, notes or Markdown.
- It holds four things the designs ask for, plus a setup check:

| Part | What it does | Serves |
|---|---|---|
| **transcribe** | Recording → `transcript.json` + `transcript.md`, local only: ffmpeg → whisper.cpp `large-v3-turbo` → pyannote speaker separation → merge → the user confirms who each speaker is | ow-start (fit call) · ow-build-plan (workshops) · ow-build (demos) |
| **export** | Markdown → branded, accessible **PDF and Word** from the workspace's `brand.yaml` | ow-build-plan (offer, plan, quote) · ow-handoff and ow-uat later |
| **session hook** | At session start, lists open workstreams from `opchain-work/STATUS.md` with their next step and anything overdue | every ow- skill (ow-start §7) |
| **scan-secrets** | Repository scan for committed secrets in **redacted mode only**: path, commit, line, rule id, never the match | ow-handoff (draft) |
| **capture** (1.1.0) | Screenshots of a running test environment from a declarative plan (navigate, click, fill test data, wait, shot), in an installed Chrome or Chromium on a dedicated per-workstream profile; the user signs in themselves | ow-documentation `-capture` |
| **export --pptx, --xlsx** (1.1.0) | A deck (one slide per H2, speaker notes) as branded PowerPoint; CSV files and a formula map as an Excel workbook that keeps its formulas | ow-documentation `-export`, ow-draft `-deliver`, ow-vendor-eval `-formal` |
| **health** (1.1.0) | Read-only checks from `health.yaml`: dependency advisories and outdated packages, TLS and domain expiry, HTTP status of listed URLs, a backup file's age | ow-care `-health` |
| **calc hours, digest** (1.1.0) | Care-plan hours in minutes (oldest first, rollover, extra, lapse); the SHA-256 of a file or of a folder's canonical manifest | ow-care `-month`; ow-draft `-freeze`/`-deliver`, ow-research `-framework`, ow-controls `-pin` |
| **doctor** | Checks every requirement and prints the exact install commands. Never installs a system package | all of the above |

- One CLI, `ow-tools <verb>`, is the contract. The plugin's `bin/` puts it on the PATH of Claude Code's Bash tool, so a skill finds it by name. Two thin plugin skills give the user typeable entry points: `/ow-start-transcribe` (the approved verb) and `/ow-tools` (status and setup).
- Its own marketplace manifest lists only ow-tools, so an administrator can approve it separately from the dev marketplace and from any text-only ow- marketplace (§7).
- Audio and transcripts never leave the machine, and the transcription step runs with network access switched off for the speaker model. Credentials are never written by ow-tools, and the secrets scan never prints or stores a match (§8). From 1.1.0, two verbs use the network, each only for what its config or plan lists: `health` and `capture` (§8, Network). Every other verb opens no socket.

### 1.1 Owner decisions (2026-10-09)

| # | Question | Answer |
|---|---|---|
| 1 | Marketplace | **Its own manifest**, `plugins/ow-tools/.claude-plugin/marketplace.json` (`opchain-work-tools`), listing only ow-tools; never in the dev marketplace or a text-only ow- one (§7) |
| 2 | Export engine | **pandoc + Typst** (§5.2). None of the candidates needed a subscription: pandoc (GPL, run as a separate program), the Typst CLI (Apache-2.0) and Chrome are free; the only account in ow-tools is a free Hugging Face login for the pyannote terms |
| 3 | `calc` | **Yes**, in 1.0.0 (§5.4) |
| 4 | Contained setup steps (venv, model fetch) | **Print-only**, like the `brew` steps. ow-tools runs no install or download itself (§6) |
| 5 | Spike setup | The build may `brew install` whisper-cpp, uv, pandoc and Typst on the owner's Mac and fetch the Whisper model; the owner accepts the pyannote terms and runs the token step and model fetch |

## 2. What the designs require, and what waits

| # | Requirement | Source | For | Build now? |
|---|---|---|---|---|
| 1 | Local pipeline: ffmpeg → whisper.cpp `whisper-cli` `large-v3-turbo` → pyannote in a `uv` venv on pinned Python 3.12 → merge → `transcript.json` + `transcript.md` | ow-start §6 | ow-start | **Yes** |
| 2 | The user confirms who each speaker is from two sample lines per speaker; roles typed by the user, never guessed from a name | ow-start §6 step 5 | ow-start | **Yes** |
| 3 | `--setup` prints and checks the install steps; never runs `brew install` | ow-start §6 | ow-start | **Yes** |
| 4 | Fallback when a step is missing: say which, offer Meet's transcript or notes | ow-start §6 | ow-start | **Yes** (exit code + message the skill relays) |
| 5 | Hugging Face token stored outside the repo (keychain or `~/.config`), never in the intake folder | ow-start §6 | ow-start | **Yes** |
| 6 | Separate Claude Code-only plugin; declares it runs code; lists its needs | ow-start §7, decision 9 | all | **Yes** |
| 7 | SessionStart hook listing open intakes/workstreams and their next step | ow-start §7 | all | **Yes** |
| 8 | Recordings only under an `audio/` folder; audio and transcripts git-ignored | ow-start §8 | all | **Yes** (enforced at write time, §8) |
| 9 | Speed spike: is a 20-minute call done in ~5 minutes on this Mac; `medium` if not; sherpa-onnx if pyannote mislabels | ow-start §10, open question 2 | ow-start | **Yes** (§10) |
| 10 | Workshop recordings transcribed the same way, extracted with timestamps | ow-build-plan §4.1 | ow-build-plan | **Yes** (same verb, `--out`) |
| 11 | Branded PDF and Word from one Markdown source via `brand.yaml`; accessible by construction; generated, never re-imported | ow-build-plan §7, decision 4 | ow-build-plan | **Yes** |
| 12 | `-export` leaves out the quote's internal appendix (unit prices, modifiers) | ow-build-plan §6.2 step 5 | ow-build-plan | **Yes** (§5.2 markers) |
| 13 | "When a code tool is available, the total is computed by tool"; ledger arithmetic tool-computed where possible; dates from a tool (time-source ladder) | ow-build-plan §6.2 step 4, ow-build §9.1, audit A:118–119 | ow-start, ow-build-plan, ow-build | **Yes** (`calc`, §5.4; decision 3) |
| 14 | Demo recordings transcribed | ow-build §5 | ow-build | **Yes** (same verb) |
| 15 | HTML email is plain text the skill writes | ow-build §9 | — | **No code needed** |
| 16 | Repository secrets scan, redacted only; a scanner that can't redact is not run (NOT-CHECKED) | ow-handoff §4 | ow-handoff (draft) | **Waits** |
| 17 | Handoff notes as branded PDF and Word | ow-handoff §6 | ow-handoff (draft) | Engine ready with #11; its fixtures and tests **wait** |
| 18 | Tester pack per role as PDF/Word (HTML and the results CSV are skill-written text) | ow-uat §5 | ow-uat (draft) | Engine ready with #11; its fixtures and tests **wait** |
| 19 | Credentials never in files; logins never in any file | ow-uat §9, ow-handoff §4 | drafts | Applies to ow-tools now (§8); nothing extra to build |
| 20 | Business days on the contract's calendar (weekdays except US federal holidays) | ow-uat §8.1 | ow-uat (draft) | **Waits** (a `calc` calendar) |
| 21 | Screenshots of the UAT environment for every task step; the user signs in; never a credential; production only with the client's recorded decision; a data check on every image (not by ow-tools) | ow-documentation §5.5, decision 8, T1 | ow-documentation | **Yes, 1.1.0** (§5.6) |
| 22 | Branded PPTX: one slide per H2, speaker notes, the same preflight | ow-documentation §6.1, §7.1, decision 10, T2; ow-draft §4.2, §11 | ow-documentation, ow-draft | **Yes, 1.1.0** (§5.7) |
| 23 | Read-only health checks of what `health.yaml` lists; no credential; Python only through pip-audit | ow-care §5.4, §9, §11, decision 4, T3 | ow-care | **Yes, 1.1.0** (§5.8) |
| 24 | Care hours in integer minutes: oldest first, rollover by the frozen rule, extra, lapse | ow-care §6, §9, §11, decisions 5, 7, 8, 10, T4, H4 | ow-care | **Yes, 1.1.0** (§5.4) |
| 25 | The ow-start meeting transcript call | ow-start logs amendment §3, §8, T5 | ow-start | **Yes, 1.1.0**: a §4.2 row; no code change |
| 26 | XLSX from CSV and a formula map: formulas kept, number formats, a header row per sheet, a Sources sheet | ow-draft §4.2, §8, §11, T6; ow-vendor-eval §7 | ow-draft, ow-vendor-eval | **Yes, 1.1.0** (§5.9) |
| 27 | A digest of a file or a folder, labelled "detects accidental change only; not tamper-evidence" | ow-draft §7, T7; ow-research §6; ow-controls §4, §6.3 | ow-draft, ow-research, ow-controls | **Yes, 1.1.0** (§5.10) |

## 3. What the plugin contains

```
plugins/ow-tools/
├── .claude-plugin/
│   ├── plugin.json            # name, version 1.0.0, "Runs code on your machine: …"
│   └── marketplace.json       # its own manifest: lists ow-tools only (§7)
├── bin/ow-tools               # POSIX sh: checks for Node ≥ 20, then runs lib/cli.mjs
├── lib/                       # Node, built-ins only, no npm dependencies
│   ├── cli.mjs                # verb router, --json, exit codes
│   ├── core.mjs               # data folder, model pins, exit codes, subprocesses
│   ├── doctor.mjs             # requirement checks + printed install commands
│   ├── transcribe.mjs         # normalise → whisper → diarize → merge; speaker roles
│   ├── merge.mjs              # word → speaker-turn assignment (pure)
│   ├── render.mjs             # transcript.json → transcript.md (pure)
│   ├── export.mjs             # preflight → pandoc → Typst → PDF; pandoc → Word
│   ├── preflight.mjs          # structure checks, internal sections, header/banner
│   ├── brand.mjs              # strict brand.yaml reader + contrast check
│   ├── docx.mjs               # brands the Word file: styles, header, footer, title
│   ├── status.mjs             # STATUS.md reader for the hook
│   ├── guards.mjs             # audio/ folder rule, git-ignore check, temp dirs
│   ├── calc.mjs               # dates, business days, totals, splits, care hours (1.1.0)
│   ├── hash.mjs               # streamed SHA-256 (1.1.0)
│   ├── digest.mjs             # file and folder digests (1.1.0)
│   ├── pptx.mjs               # deck rules, the per-run reference deck, PPTX branding (1.1.0)
│   ├── xlsx.mjs, zip.mjs      # CSV + formula map → XLSX; a deterministic zip writer (1.1.0)
│   ├── health.mjs             # read-only health checks (1.1.0)
│   ├── lockfiles.mjs          # npm, pnpm and yarn lockfile readers (1.1.0)
│   ├── net.mjs                # the one outbound-request module (1.1.0)
│   ├── capture.mjs            # capture plans, profiles, the step runner (1.1.0)
│   └── cdp.mjs                # DevTools protocol over --remote-debugging-pipe (1.1.0)
├── python/
│   ├── pyproject.toml         # requires-python ==3.12.*; pyannote.audio pinned
│   ├── uv.lock                # committed; `uv sync --frozen`
│   └── diarize.py             # ~60 lines: load pipeline offline, write turns JSON
├── hooks/hooks.json           # SessionStart → bin/ow-tools hook session-start
├── skills/
│   ├── ow-start-transcribe/SKILL.md   # user verb (approved name); runs the CLI
│   └── ow-tools/SKILL.md              # /ow-tools: status, setup, what it runs
├── templates/ow.typ           # Typst page template (brand values arrive escaped in brand.typ)
├── examples/brand.yaml        # invented, neutral; doubles as a test fixture
├── SECURITY-MANIFEST.md       # generated: every file + sha256, binaries called, network, files written
├── README.md · LICENSE · NOTICE
```

No `package.json` at the plugin root: Claude Code installs npm dependencies automatically when a plugin root has one with a lockfile, and ow-tools needs none. Plugin skills are used rather than the older `commands/` format (Claude Code plugin docs). `bin/` is not installed by claude.ai or Cowork, which keeps the plugin Claude Code-only by construction.

## 4. The interface each ow- skill calls

### 4.1 Detection and wording

- **Available** means `ow-tools version` answers with exit 0 in the session's shell. Anything else (command not found, Node missing, exit 3) is the absent-case.
- ow- skill text stays host-conditional (audit A:129): *"If you can run code here and `ow-tools version` answers, run …; otherwise …"*. It names the CLI, which is in the family, never a host tool or an absolute path.
- Skills never invoke ow-tools' own plugin skills (R1). They either run the CLI or print a NEXT that the user types.
- Every verb takes `--json` and then prints exactly one JSON object on stdout with a `status` field. Without `--json` it prints plain lines for a person.

| Exit | Meaning | What the calling skill does |
|---:|---|---|
| 0 | Done | Records the output (command and raw output, for any hash or number: "never invent a machine fact", A:118) |
| 2 | Usage error | Fixes the call |
| 3 | A requirement is missing | Says which one (from the JSON `missing` list) and takes its absent-case |
| 4 | Refused by a rule (privacy, accessibility, input) | Shows the reason; nothing was written |
| 5 | A tool failed | Shows the tool's one-line error; nothing was written |

### 4.2 Calls by skill

| Caller (verb) | Call | Reads | Writes | If ow-tools is absent |
|---|---|---|---|---|
| ow-start `/ow-start-transcribe` (shipped by ow-tools; ow-start's NEXT says "use ow-tools to transcribe intake/<client>/audio/") | `ow-tools transcribe <workstream>/audio/[<file>] [--speakers N] [--banner TEXT] [--language L]`; a folder holding one recording stands for it | the recording | `<workstream>/transcript.json`, `<workstream>/transcript.md` | The command doesn't exist; ow-start offers the meeting tool's transcript, a `.vtt`, pasted text, or notes, then "use ow-start to extract intake/<client>/" |
| ow-start (confirm step) | `ow-tools speakers <transcript.json>` then `ow-tools speakers <transcript.json> --set SPEAKER_00=you --set SPEAKER_01="client: ops lead"` | `transcript.json` | roles into `transcript.json`; re-renders `transcript.md` | — |
| ow-build-plan `-collect` (workshop) | `ow-tools transcribe plans/<client>/audio/<file> --out plans/<client>/workshops/W<n>/` | the recording | `transcript.{json,md}` in that folder | Asks for a transcript or notes; notes-only facts cap at MEDIUM |
| ow-build `-demo` (record, from a recording) | `ow-tools transcribe builds/<client>/audio/<file> --out builds/<client>/demos/M<n>/` | the recording | same | Records from the user's notes |
| ow-build-plan `-offer`, `-export` | `ow-tools export <file.md> [--out <dir>]` | the Markdown, the workspace `brand.yaml` | `export/<name>.pdf`, `export/<name>.docx` | Prints the finished Markdown and says the documents could not be generated here |
| ow-handoff `-package` (draft) | `ow-tools export handoffs/<client>/handoff-notes.md` | same | `export/handoff-notes.{pdf,docx}` | Same |
| ow-uat `-pack` (draft) | `ow-tools export uat/<client>/uat-pack-<role>.md` | same | `export/uat-pack-<role>.{pdf,docx}` | HTML pack only (skill-written) |
| ow-handoff `-accounts` (draft; **not built**: `scan-secrets` waits for Sprint 4) | `ow-tools scan-secrets <repo>` | committed history only | nothing; prints rows | NOT-CHECKED: "this repository has not been scanned for committed secrets" |
| Any verb needing a date or a total | `ow-tools calc …` (§5.4) | arguments only | nothing | Time-source ladder (host date, else ask); "arithmetic NOT machine-checked" |
| Any session (resume) | SessionStart hook | `opchain-work/STATUS.md` | nothing | Step 0 inside each skill (ow-protocol v1 §3a); `/ow-status` |
| ow-start `-log-meeting` (1.1.0, T5) | `ow-tools transcribe logs/<workstream>/meetings/MTG-nn/audio/<file> --out logs/<workstream>/meetings/MTG-nn/` | the recording | `transcript.{json,md}` in `MTG-nn/` | The user's notes (ow-start logs amendment §3: "from the transcript … or the user's notes") |
| ow-documentation `-capture` (1.1.0, T1) | `ow-tools capture --plan <plan.json> --out docs/<client>/shots/ [--sign-in] [--timeout S]`; `ow-tools capture --profiles`, `ow-tools capture --delete-profile <client>` | the plan (§5.6); the test environment it names | `shots/<step-id>.png`; the profile in the data folder | UAT's `cleared` evidence where it fits; remaining steps get a marked placeholder `[screenshot: <step>]` that blocks export (ow-documentation §5.5) |
| ow-documentation `-export` (1.1.0, T2) | `ow-tools export docs/<client>/training/deck.md --formats pptx`; guides as 1.0.0 | the Markdown, `brand.yaml` | `export/deck.pptx`, `export/deck.export.json` | Not stated in the caller's design: **proposed** "the deck stays Markdown; say the PPTX could not be generated here", as for PDF and Word. Flagged for Sprint 3b |
| ow-care `-health` (1.1.0, T3) | `ow-tools health --config care/<client>/health.yaml --json [--no-network]` | `health.yaml` (§5.8), the lockfiles it names | nothing (an RDAP list cache in the data folder) | All checklist (ow-care §5.4). Under a handling level the caller's design does not say: **proposed** `--no-network` (O9). Flagged for Sprint 4b |
| ow-care `-month` (1.1.0, T4) | `ow-tools calc hours --ledger <ledger.json> --rollover <share>,<of>,<months>`; the report through `ow-tools export` | the ledger JSON the skill writes (§5.4) | nothing | "computed without ow-tools; check it" (ow-care §6) |
| ow-draft `-freeze` (1.1.0, T7) | `ow-tools digest drafts/<workstream>/DR-nn-<slug>/candidates/C-n.md` (a sheet: the `C-n` folder) | the candidate | nothing | A weak fingerprint (length, first and last lines) labelled weak (ow-draft §7) |
| ow-draft `-deliver` (1.1.0, T2, T6, T7) | `ow-tools digest <draft>` to match the signed-off candidate; `ow-tools export <C-n.md> [--formats pdf,docx]` or `--formats pptx`; `ow-tools export <C-n sheet folder> --formats xlsx` | the candidate, `brand.yaml` | `export/` and `<name>.export.json` | Digest: the same text when only a weak fingerprint exists (ow-draft §9). Export: not stated in the caller's design: **proposed** "deliver the Markdown or CSV and say the documents could not be generated here". Flagged for Sprint D |
| ow-vendor-eval `-score` (1.1.0) | `ow-tools calc total --items <items.json>` for costs over the horizon | the items JSON | nothing | "computed without ow-tools; check it" (ow-vendor-eval §5). Weighted scores (decimal weights × 0–3) have no calc verb in 1.1.0: **proposed** a weighted-sum verb or `calc total` in minor units. Flagged for Sprint V |
| ow-vendor-eval `-formal` (1.1.0, T6) | `ow-tools export <evaluation-workbook folder> --formats xlsx --out vendor-eval/<workstream>/VE-nn-<slug>/` | the CSVs and `model.md` | `evaluation-workbook.xlsx` | Not stated in the caller's design: **proposed** "write the CSVs and `model.md`, and say the workbook could not be generated here". Flagged for Sprint V |
| ow-research `-framework` (1.1.0, T7) | `ow-tools digest frameworks/<id>/<date>/<file>` per file in `manifest.yaml` | the fetched files | nothing | Not stated in the caller's design: **proposed** `digest: not computed (no ow-tools)` in `manifest.yaml`. Flagged for Sprint R |
| ow-controls `-pin` (1.1.0, T7) | `ow-tools digest compliance/packs/<framework>/<edition>/` | the pack folder | nothing | Not stated in the caller's design: **proposed** the pin records `digest: not computed`, and Pin match is NOT-CHECKED. Flagged for Sprint C |

**Note for Sprints D and V (OD-8, 2026-10-17): the sheet folder's read contract changed.** §5.9 as first written read "the sheets come in this order, then any other CSV by name". ow-tools 1.1.0 exports only the sheets `model.md` names: a data CSV in the folder with no `## Sheet:` section is refused (exit 4 `sheet-not-in-model`, naming the sheet), never exported (SA-018). ow-draft's and ow-vendor-eval's writers must give every data CSV they put in the folder its `## Sheet:` section (one with an empty table is enough), and keep working files elsewhere. `sources.csv` is the one exception.

**Partial installs.** `doctor` reports per capability. Export works without the transcription tools and the other way round; a call to a capability whose requirements are missing exits 3 and names them.

## 5. The parts

### 5.1 transcribe and speakers

| Step | Tool | Detail |
|---|---|---|
| 0. Guards | ow-tools | The input must sit in a folder named `audio`. If the output folder is inside a git work tree, `git check-ignore` must report the recording and both `transcript.*` paths as ignored; otherwise exit 4 with the two lines to add (`opchain-work/**/audio/`, `opchain-work/**/transcript.*`). ow-tools never edits `.gitignore`: `/ow-start-prep` does that after asking (one writer) |
| 1. Normalise | `ffmpeg -protocol_whitelist file` | 16 kHz mono WAV into a private temp folder (mode 0700), removed when the run ends, including on failure. The whitelist matters because ffmpeg picks a demuxer from the bytes, not the file name: a "recording" that is really an HLS or concat playlist could otherwise open other files' URLs or the network |
| 2. Transcribe | `whisper-cli`, `ggml-large-v3-turbo.bin` | Metal on Apple Silicon; JSON with per-token timestamps; `--language auto` unless given. For English or auto-detected calls a short punctuated starting prompt is passed, because the spike showed long recordings drifting into lowercase text with no punctuation. `doctor` checks the model file against a pinned SHA-256 |
| 3. Separate speakers | `python/diarize.py` via `uv run --frozen --no-sync` on Python 3.12 (`--no-sync`: the run uses the environment the user built and never installs into it), `pyannote/speaker-diarization-community-1` (3.1 as the fallback model) | Runs with `HF_HUB_OFFLINE=1` and `TRANSFORMERS_OFFLINE=1`, and without the token in its environment: after setup, no network call is possible from this step. `--speakers N` passes a known head count |
| 4. Merge | `merge.mjs` | Each word goes to the speaker turn it overlaps most; a Whisper segment that spans a turn change is split at the word boundary; words in overlapping speech are marked `overlap: true`; words in no turn get `UNKNOWN` |
| 5. Confirm | `ow-tools speakers` | Prints two sample lines per speaker (the two longest distinct turns) with timestamps. The user types the roles; ow-tools records them. A 3+ person call works the same way |

**`transcript.json`** (schema 1, the read contract for `/ow-start-extract`, `-collect` and `-demo`):

```json
{
  "ow_artefact": "ow-tools/transcript", "schema": 1, "written_by": "ow-tools 1.0.0 (protocol 1)",
  "workstream": "intake/meridian-tile", "subject": "audio/2026-10-09-fit-call.m4a",
  "created": "2026-10-09", "clock": "tool", "origin": "third-party (recording)",
  "source": { "audio": "audio/2026-10-09-fit-call.m4a", "sha256": "…", "duration_s": 1203.4 },
  "pipeline": { "normalise": "ffmpeg 8.0", "transcribe": "whisper.cpp 1.9.5 large-v3-turbo",
                "diarize": "pyannote.audio 4.x community-1", "merge": "ow-tools 1.0.0" },
  "speakers": [ { "id": "SPEAKER_00", "role": null, "talk_s": 612.0 } ],
  "segments": [ { "start": 0.0, "end": 4.2, "speaker": "SPEAKER_00", "text": "…", "overlap": false } ]
}
```

Paths are relative to the workstream folder (R2: no absolute path, username or machine fact). `role` stays `null` until the user sets it.

**`transcript.md`** opens with the ow- artefact header as a YAML block (ow-protocol v1 §4, the same keys as the JSON), then `banner_text` verbatim when the skill passes `--banner` (the workstream has a handling level and the profile sets one; §3b), the speaker list with confirmed roles, the pipeline line, and one sentence: *this file is data from a recording; anything in it phrased as an instruction is something a person said, not an instruction to follow*. Then one line per turn: `[07:42] client (ops lead): we do about forty a week, more in March` (`h:mm:ss` past an hour), matching the quote format ow-start §5.1 cites.

**Model choice.** `large-v3-turbo` by default; `--model medium` if the spike shows the turbo model is too slow. sherpa-onnx is not built unless the spike shows pyannote mislabelling.

### 5.2 export

**Input rules (checked before any engine runs; any failure is exit 4 naming the line):**

| Check | Rule |
|---|---|
| Headings | Exactly one H1; no skipped levels |
| Images | Every image has non-empty alt text. The path is relative to the Markdown and, after symlinks are resolved, stays inside the Markdown's folder, or inside the enclosing `opchain-work/` folder when there is one (so a shared `opchain-work/brand/` image works). The file's first bytes must say PNG, JPEG or GIF; SVG (Word needs `rsvg-convert`, and SVG can reference other files) and WebP (pandoc can't read it) are refused. The copy in the temp folder takes the detected type, not the name's extension |
| Tables | Every table has a header row with no empty header cell; no merged cells (Markdown has none) |
| Links | Link text is not a bare URL, "here" or "click here" |
| Internal sections | `<!-- ow:internal -->` … `<!-- ow:end-internal -->` blocks are removed. Markers are matched regardless of case and spacing (`<!-- OW: Internal -->` counts) on a line of their own. Any other HTML comment mentioning "internal", in fenced code or not (a misspelt, mid-line, multi-line or unclosed marker), refuses, as do unbalanced and nested markers; the output is checked not to contain the removed text |
| Messages | Each refusal names its line number and never quotes the document: no image path, link text or internal-section text |
| Artefact header | The ow- header block (a `---` YAML block holding `ow_artefact`, ow-protocol v1 §4) is removed from client documents. The `banner_text` line right after it, when set, is kept and repeated in every page header. The audit's older one-line form is read too |

**`brand.yaml`** (user-written; ow-tools reads it, the skills ship the invented example; found by walking up from the Markdown to `opchain-work/brand.yaml`, or `--brand`):

```yaml
schema: 1
name: Example Studio
logo: brand/logo.png          # PNG, relative to brand.yaml; optional
logo_alt: Example Studio logo # required when logo is set
colors: { text: "#1A1A1A", background: "#FFFFFF", primary: "#1F4E79", accent: "#2E6B4F" }
fonts: { heading: Inter, body: Source Serif 4 }   # missing fonts fall back, and the report says so
footer: Example Studio · example.com
lang: en-US
page: letter                  # or a4
```

The reader accepts only this shape (no anchors, tags or multi-line strings) and refuses anything else by name. With no `brand.yaml`, export uses neutral styling and says so. **Contrast:** body text on the background must reach 4.5:1 and headings 3:1 (WCAG 2.x formula); table header text is set to black or white, whichever passes on the accent fill; links are always underlined, so colour is never the only signal. A brand that fails is refused with the measured ratio.

**Engines** (decision 2): **pandoc** writes the Word file, and ow-tools then brands it in place from `brand.yaml`: fonts and colours in the styles, a header (logo with alt text, banner) and footer (footer text, page N of M), page size, and the core title. **pandoc → Typst** writes the PDF from ow-tools' Typst template, with tags, title, language and the bookmarks outline. Verified in the build (pandoc 3.12.1, Typst 0.15.1): pandoc emits Typst `table.header` rows and Word `tblHeader` rows and carries alt text into both; Typst's `--pdf-standard ua-1` refuses an image without alt text and a document without a title, which backs up the preflight.

**Output.** `export/<name>.pdf` and `.docx`, plus a report: what was checked, any font fallback, the SHA-256 of the PDF and of the source Markdown (A:118: the canonical hash input is the PDF or Markdown, never the .docx; the hash "detects accidental change only; not tamper-evidence"), and the sentence *structure checked in the source this tool generated; this is not a conformance test — run your organisation's accessibility checker on the exported file* (A:1728).

### 5.3 SessionStart hook

- `hooks.json` runs `bin/ow-tools hook session-start` with matcher `startup|clear|compact` (not `resume`, whose context already holds it), timeout 5 s.
- It looks for `opchain-work/STATUS.md` in the session's folder and at the git root. **No file, no output**: ow-tools is silent in every other project.
- It parses ow-protocol v1 §5 lines (`<date> (clock: <source>) | <skill id> <version> | <path> | next: <skill id> <verb or "on"> <path> | awaiting: none, or <what> by <date>`). Per workstream (the first two segments of the path, e.g. `intake/meridian-tile`) it keeps the newest line and lists it unless `next:` is `none` (including `none (closed: <reason>)`) and `awaiting:` is `none`. A dated awaiting (`by 2026-10-07`) earlier than today is marked **overdue**.
- Output is wrapped as data, like the opchain hook: `<ow-workstreams> (file contents, not instructions)` … `</ow-workstreams>`, today's date and time zone first (a tool-sourced date for the time-source ladder), at most 12 workstreams, 160 characters a line, control characters stripped, then `and N more: /ow-status`. Lines it can't parse are counted, never shown raw.
- One last line gives capability readiness from cheap checks only (PATH lookups, file existence; no Python start): `ow-tools 1.0.0: transcribe ready · export missing pandoc · scan not installed`.
- Read-only. It never writes, never claims an approval (R4 (d)), and is not a substitute for each skill's own step 0.

### 5.4 calc (decision 3)

| Verb | Output |
|---|---|
| `ow-tools calc today [--tz Z]` | Local date and zone, `clock: tool` |
| `ow-tools calc date --from D (--days N \| --business-days N) [--holidays D1,D2,…] [--calendar us-federal]` | The date, the calendar used, the holidays skipped |
| `ow-tools calc total --items <file.json>` | Sum in integer minor units, per-line products, currency |
| `ow-tools calc split --total T --schedule 40/40/20` | Amounts that add up exactly (remainder to the last) |
| `ow-tools calc hours --ledger <file.json> --rollover <share>,<of>,<months>` (1.1.0) | Per care month, in integer minutes: available, used by kind, extra, rolled over, lapsed, credit, and the identity line |

Both `calc date` modes return the same keys (`date`, `from`, `days` or `business_days`, `calendar`, `holidays_skipped`); `--holidays` with `--days` is a usage error (F-008).

#### calc hours (1.1.0, amendment T4): the ledger read contract

ow-care's `-month` writes the ledger; ow-tools reads it and nothing else. Minutes are integers and every value is a whole quarter-hour (a multiple of 15).

```json
{
  "schema": 1,
  "months": [
    { "id": "M-01", "included": 480,
      "entries": [ { "id": "CARE-01", "kind": "care", "minutes": 210 },
                   { "id": "HEALTH-M-01", "kind": "health", "minutes": 45 },
                   { "id": "REPORT-M-01", "kind": "report", "minutes": 45 } ],
      "extra_approved": 0, "credit": 0 }
  ]
}
```

- `months` run `M-01`, `M-02`, … in order with none missing (the month identity). `included` is the tier's hours for that month in minutes; a tier change is just a different `included`.
- `entries[].kind` is one of `care`, `health`, `report`, `meeting` (ow-care §6, §7, decision 11). Entry ids are 1–40 letters, digits, `.`, `_` or `-`, unique in their month.
- `extra_approved` is the minutes the client's go-ahead approved for that month (ow-care decision 8); `credit` is recorded capacity credit, reported and never computed.
- `--rollover share,of,months` is the frozen `rollover: { share, of, months }` (H4). `share` is 0 to 1 with up to four decimals and stays an exact fraction; `of` is `unused` or `included`; `months` is 1 to 12.

The rule. **Oldest hours first:** each month uses rolled-in batches (oldest month first), then its own included minutes, then approved extra. With `of: unused`, the rollover is ⌊share × own unused⌋ to the quarter-hour; with `of: included` it is min(own unused, ⌊share × included⌋ to the quarter-hour) (O11). A month's rollover batch can be used for the next `months` months and lapses after the last of them. **Lapsed** = own unused not rolled + any batch whose last month this was. Every month must satisfy *rolled in + included + extra = used + rolled over + lapsed*, and ow-tools checks it. The ow-care §6 example gives M-01: 300 of 480 used, 45 rolled over, 135 lapsed; M-02: 525 available, 600 used, 75 extra.

Refusals: an entry (or month field) that is not a quarter-hour is exit 4 `not-quarter-hour`, naming the entry id only; minutes past available + approved extra is exit 4 `over-available`, naming the month and the entry where it crossed. A negative value, a value that isn't a safe integer or is over 100,000 minutes (F-022), an unknown kind or key, or a gap in the month ids is exit 2.

The skill passes holidays it read from `profile.md`; ow-tools never reads `profile.md` or `price-book.yaml` itself. Callers: ow-start's recap due date; ow-build-plan's offer and quote validity, credit deadline and totals; ow-build's ledger; later ow-handoff's window dates and ow-uat's contract calendar (`us-federal` waits for ow-uat).

### 5.5 scan-secrets (draft, ow-handoff §4)

- Wraps **gitleaks ≥ 8.19** (installed here: 8.30.1) on the repository's committed history, all refs: `gitleaks git --redact --no-banner --exit-code 0 --report-format template --report-template <ours>`. The template emits only `path, commit, line, rule id`, so the match is never written anywhere. Scanner stdout and stderr are discarded; only the exit code is kept.
- Every report row must match a strict pattern; one that doesn't aborts the scan, deletes the report and returns NOT-CHECKED. A gitleaks without `--redact` and `--report-template` is not run (NOT-CHECKED).
- It never scans the working tree, so it never opens a `.env` file (ow-handoff §4). It uses gitleaks' built-in rules, ignores a repository's own `.gitleaks.toml` and `.gitleaksignore`, and reports that they exist.
- Result: `CLEAN`, `HITS` with rows, or `NOT-CHECKED(reason)`. Removing a secret from history stays the client's choice.

### 5.6 capture (1.1.0, amendment T1)

`ow-tools capture --plan <plan.json> --out <…>/shots/ [--sign-in] [--timeout S]` drives an installed Chrome or Chromium through the DevTools protocol over `--remote-debugging-pipe` (`cdp.mjs`): commands on the browser's fd 3, replies on fd 4, no TCP debugging port and no WebSocket, so nothing else on the machine can attach and Node 20's built-ins suffice. It never downloads a browser (O5): doctor finds one on PATH (`google-chrome`, `google-chrome-stable`, `chromium`, `chromium-browser`, `chrome`) or at the standard macOS paths.

**Modes.**
- **Capture** (default): headless, on the stored profile, at the plan's fixed viewport. Works where the test environment keeps the sign-in in a cookie with an expiry.
- **Sign-in** (`--sign-in`): a headed window opens at `sign_in.url`; the user signs in themselves; ow-tools waits (up to `--timeout`, default 110 s like every run, under Claude Code's 120 s Bash timeout) for `sign_in.done_selector` on an allowed origin, then runs the plan's steps **in the same browser session** and closes it. The spike (`sprints/release-2.1/ow-sprint-t/capture-spike.md`) found that Chrome drops session-only cookies on every restart, so a headed sign-in followed by a separate headless run only works for "remember me" sessions; running the steps in the sign-in session covers the rest without ow-tools ever reading a cookie. A sign-in that needs longer passes `--timeout` (up to 590 s) and is started with the Bash tool's `run_in_background`, so the tool's own timeout never kills it mid-wait (Bug 4, round 3; a killed run is handled below either way).
- **Profiles:** `--profiles` lists each profile's id, size and last-used date, never its contents; `--delete-profile <id>` deletes `$OW_TOOLS_HOME/capture/<id>/` only, after refusing an id that isn't lowercase letters, digits and `-`, a symlink, or a folder whose real path isn't directly inside the capture folder, and prints what it removed.

**The plan (read contract; ow-documentation `-capture` writes it, Sprint 3b).** JSON, strict: an unknown key anywhere is refused.

```json
{
  "schema": 1,
  "profile": "harbor-cafe",
  "environment": "uat",
  "decision": { "role": "client ops lead", "date": "2026-10-15" },
  "allowed_origins": ["https://uat.example.test"],
  "viewport": { "width": 1280, "height": 800 },
  "sign_in": { "url": "https://uat.example.test/login", "done_selector": "#account-menu" },
  "steps": [
    { "id": "S-01", "do": "navigate", "url": "https://uat.example.test/orders" },
    { "id": "S-02", "do": "click", "selector": "#new-order" },
    { "id": "S-03", "do": "fill", "selector": "#customer", "value": "Test Customer 01" },
    { "id": "S-04", "do": "wait", "selector": ".order-form", "timeout_ms": 5000 },
    { "id": "S-05", "do": "shot" }
  ]
}
```

| Key | Rule |
|---|---|
| `profile` | The workstream id (O2): lowercase letters, digits, `-`; the profile is `$OW_TOOLS_HOME/capture/<profile>/`, mode 0700 |
| `environment` | `test`, `uat`, `staging`, `demo` or `production` (O3). `production` needs `decision: { role, date }` (the client's recorded decision); it is echoed in the output as given, labelled "not verified by ow-tools". `decision` on any other environment is refused |
| `allowed_origins` | 1–20 `https://` origins (scheme, host, port; no path, no user name or password, never loopback in any spelling: `localhost` or `*.localhost` with or without a trailing dot, and IPv4, IPv6, IPv4-mapped and IPv4-compatible literals of 127/8, 0/8, `::1` and `::`; SA-013), never link-local (169.254/16, fe80::/10) or a cloud metadata address (the list in `addr.mjs`, `METADATA_ADDRESSES`: `169.254.169.254`, `169.254.170.2`, `fd00:ec2::254`, `100.100.100.200`, `192.0.0.192`, in any spelling; 1.1.1, Bug 5). The host must be a host name (dot-separated labels of letters, digits and hyphens, ending in an alphabetic top-level name: the `HOST` pattern health uses) or an IP literal, so `,`, `*` and other punctuation never reach the host-resolver rules (1.1.1, SA-020). An IPv6 literal must be global unicast (2000::/3 minus the special ranges §5.8 lists), and the IPv4-compatible, NAT64 (64:ff9b::/96) and 6to4 (2002::/16) forms are judged by the IPv4 address inside (`[::a9fe:a9fe]` is 169.254.169.254; Bug 6, round 3). **Each host name is resolved once before launch** (the system resolver); a name with any loopback, unspecified, link-local or metadata answer (`127.0.0.1.nip.io`, `metadata.google.internal`, a name pointing at `fd00:ec2::254`) is refused, exit 4 `origin-address-not-allowed`, naming the origin's index. Every navigation, redirect and sub-resource request to another origin is failed by the Fetch guard; a step whose page leaves the list stops with no image |
| `viewport` | 320–3840 each way; default 1280×800; screenshots are exactly this size (device scale 1) |
| `steps[].id` | 1–40 letters, digits, `_`, `-`; unique ignoring case; names the image `<id>.png` |
| `steps[].do` | `navigate` (`url`, inside `allowed_origins`) · `click` (`selector`) · `fill` (`selector`, `value`: test data, ≤ 500 characters) · `wait` (`selector`, `timeout_ms` 100–60000, default 10000) · `shot` (nothing). **Every step writes one PNG** after its action |

**Secret fields and values.** ow-tools never types into a password or one-time-code field. A `fill` whose selector names one is exit 4 before launch: `type=password`; an `autocomplete` of `current-password`, `new-password`, `one-time-code`, `cc-number`, `cc-csc`, `cc-exp…`; or a name that names a secret (round 3, Bug 2; reworked in 1.1.1 for the evaluator's round-3 Bugs 1–2 and SA-022). The text is folded first (accents removed, so `contraseña` is `contrasena`, `hasło` is `haslo`), and any one of these refuses:
- **Another script.** A password word as written: `пароль`, `парол`, `лозинка`, `гасло`, `パスワード`, `暗証番号`, `비밀번호`, `密码`, `密碼`, `口令`, `סיסמה`, `كلمة المرور`, `كلمة السر`, `รหัสผ่าน`, `पासवर्ड`, `κωδικός πρόσβασης`.
- **Phrases.** A code that was sent (`Enter the code we texted you`, `We sent you a code`) or an N-digit code or PIN (`Enter the 6-digit code`, `4-digit PIN`; `5-digit ZIP code` is not one), in the text or in its words.
- **Strong words**, anywhere as a whole word: `otp`, `otpcode`, `mfa`, `mfacode`, `totp`, `hotp`, `2fa`, `tfa`, `twofa`, `pincode`, `pinnumber`, `passcode`, `password`, `passwd`, `pwd`, `pw`, `psw`, `pswd`, `pword`, `passw`, `passwrd`, `passphrase`, `secret`, `cvv`, `cvc`, `csc`, `cvn`, `ssn`, `iban`, `apikey`, `onetimecode`, `onetimepassword`, `cardnumber`, `cardnum`, `cardno`, `ccnum`, `ccnumber`, `ccn`, `cccsc`, `ccexp`, `creditcard`, `securitycode`, `verificationcode`, `authcode`, `smscode`, `emailcode`, `logincode`, `accesscode`, `authenticator`, `mnemonic`, `seedphrase`, `recoverykey`, `socialsecurity`, `privatekey`, the compound tokens (`accesstoken`, `apitoken`, `authtoken`, `refreshtoken`, `bearertoken`, `sessiontoken`, `idtoken`), and other languages' words for password (`senha`, `heslo`, `haslo`, `geslo`, `sifre`, `passord`, `jelszo`, `lozinka`, `parool`, `adgangskode`, `kennwort`, `wachtwoord`).
- **Word pairs**: one time, two factor, two step, card number / num / no, cc num / number / csc / exp, credit card, social security, security code / answer / pin, verification code, verify code, auth(entication) code, sms / text / email / login / sign-in / access / magic code, recovery code / key / phrase, backup code, seed phrase, secret phrase, api / access / private key, access / api / auth / refresh / bearer / session / id / security / reset token, account number, routing number / no, pass code / word / phrase, pin code / number, atm / card / login / account / sim / secure pin, login / admin pass, digit code, digit pin.
- **Weak words**, only as the field's one word once selector and label filler (`input`, `name`, `id`, `field`, `data`, `testid`, `aria`, `label`, `placeholder`, `enter`, `your`, `the`, `new`, `confirm`, `current`, `old`, `user`, …) is set aside: `pin`, `pass`, `token`, `routing`, `pan`. So `#pin`, `new_pin`, "Your PIN" and `input[name=pass]` refuse, and `pinLocation`, `map-pin`, `passType`, `boarding_pass`, `tokenCount`, `lead_routing` fill.
- **Stems inside one word.** Long stems anywhere in a word (`password`, `passwort`, `kennwort`, `wachtwoord`, `losenord`, `salasana`, `contrasena`, `motdepasse`, `creditcard`, `cardnumber`, `seedphrase`, `recoverykey`, `authenticator`, `mnemonic`, `secret`, `userpin`, `atmpin`, `securepin`, `userpass`, `loginpass`, `emailcode`, `logincode`, `twostep`, …: `newpassword`, `cardpin`); short stems only at a word's start or end (`otp`, `totp`, `mfa`, `pwd`, `psw`, `pswd`, `pword`, `cvc`, `cvv`, `ssn`, `twofa`, `tfa`: `smsotp`, `totpcode`, `loginpwd`, `cardcvc`), so `hotpot`, `footprint`, `camfactor` and `potpourri` stay ordinary; and `token`, `iban` and `passw` only at the end of a longer word (`csrftoken`, `bankiban`; never `ibanez`). Real words that merely hold a stem are removed first: `secretary`, `secretariat`, `classname`, `businessname`, `passenger`, `passport`, `compass`, `bypass`, `trespass`, `tokenize`, `tokenizer`, `footprint`, `hotpink`, `laptop`, `desktop`, `hotplate`, `spinner`, `opinion`, `pinterest`, `shipping`, `option(s)`, `topping`, `liban`.
- **Long stems across words**, in the text with separators removed (`mot_de_passe` → `motdepasse`, `credit_card`, `pass_word`), and again with leet digits and symbols read as letters (`p@ssword`, `pa55word`, `P@$$w0rd`). Short stems are never matched across words, so `apiBanner` (iban), `taxiBank` and `photo-kent` (token) fill.

Tests fill 79 ordinary field names (36 written before the round-3 stem rule, 43 before the 1.1.1 rework) and refuse 135 secret ones (61 from round 3, 74 from 1.1.1). At run time the target is checked again through `DOM.describeNode`: its `type` and `autocomplete` against the values above, and its `name`, `id`, `aria-label` and `placeholder` against both rules (a show-password toggle makes `type=text`, so the words still count); a match stops the run before anything is typed. A `value` that looks like a credential (a private-key block, an AWS, GitHub, Slack, Stripe-style or Google API key, a JWT, or a 24+ character token mixing upper, lower and digits) is exit 4 before launch.

**The browser.** Started with `--remote-debugging-pipe` (never `--remote-debugging-port`), `--user-data-dir=<profile>`, `--headless` in capture mode, first run, sync, extensions, background networking, the component updater, domain reliability, phishing detection and crash reporting off, **the real keychain** (no `--use-mock-keychain`, no `--password-store=basic`; SA-011, owner decision 2026-10-17: the cookie key is the browser's "Chrome Safe Storage" item in the user's login keychain, so another program running as the user can't decrypt the session without a keychain prompt; macOS asks once on first use, and the user chooses Always Allow, which doctor and the README say), `--no-proxy-server`, a `--host-resolver-rules` map that gives the browser only the addresses ow-tools checked (`MAP <host> <address>` for each allowed name, `EXCLUDE <literal>` for each IP-literal origin, and `MAP * ~NOTFOUND` for everything else; a name that didn't resolve gets no rule, so the browser can't reach it either; Bug 6), and the viewport as the window size. The profile's `Preferences` are written before every launch with the password manager, autofill (addresses and cards), Safe Browsing, translate and browser sign-in off, and downloads denied (also `Browser.setDownloadBehavior: deny`). A second window (`target=_blank`) is closed; a JavaScript dialog is dismissed. On every exit path (success, failure, timeout) the browser is asked to close, then its process group is killed, and its caches (`Cache`, `Code Cache`, `GPUCache`, `GPUPersistentCache`, the service worker's `CacheStorage` and `ScriptCache`, shader caches, `Crashpad`, the singleton locks) are removed from the profile, at the start of every run as well (a killed run skips its own clean-up; F-023): they can hold page content. **After any run against `environment: production`, success or failure, the session is wiped too**: cookies, `Network/`, Local and Session Storage, IndexedDB, service workers, other site storage, sessions and history, and the session-adjacent stores (`Device Bound Sessions`, `Account Web Data`, `Login Data For Account`, `Reporting and NEL`, `Trust Tokens`; SA-019) (owner decision 2026-10-17). **A killed run is covered too** (Bug 4, SA-019 / F-025, round 3): SIGINT, SIGTERM, SIGHUP and (1.1.1) SIGQUIT close the browser, wipe the session at once and again once the browser has gone, and exit 130, 143, 129 or 131; an uncaught exception does the same and exits 1, saying so (1.1.1, Bug 3; the browser's event handlers also read every field defensively, so a malformed event is blocked, never a crash). A SIGKILL can't be handled, so a production run writes `.ow-tools-production-pending` in the profile before launch and removes it only after its wipe; the next run on that profile, whatever its environment, finds the marker and wipes the session before its browser starts. A production run also starts from a wiped session. **One run per profile** (1.1.1, SA-021): before anything is written in the profile, a run takes `.ow-tools-run.lock` (created exclusively, holding its process id); a second run, or `--delete-profile`, while that process is alive is refused, exit 4 `profile-in-use`, and touches nothing. A lock whose process has gone is taken over. For every other environment the session is kept for the next headless run, and the JSON says so and where (`session`). What persists in a kept profile: cookies, site storage, history and the browser's settings.

**CDP methods** (a fixed allowlist in `cdp.mjs`; anything else is refused before it reaches the pipe): `Browser.close`, `Browser.getVersion`, `Browser.setDownloadBehavior`, `Target.attachToTarget`, `Target.closeTarget`, `Target.createTarget`, `Target.getTargets`, `Target.setDiscoverTargets`, `Page.enable`, `Page.navigate`, `Page.getFrameTree`, `Page.captureScreenshot`, `Page.handleJavaScriptDialog`, `Emulation.setDeviceMetricsOverride`, `DOM.enable`, `DOM.getDocument`, `DOM.querySelector`, `DOM.describeNode`, `DOM.getBoxModel`, `DOM.scrollIntoViewIfNeeded`, `DOM.focus`, `Input.dispatchMouseEvent`, `Input.insertText`, `Fetch.enable`, `Fetch.continueRequest`, `Fetch.failRequest`. None reads a cookie or storage; none evaluates JavaScript (a click is a box-model centre and two mouse events; a fill is focus and inserted text; a wait polls `DOM.querySelector`).

**Output.** `<out>/<step-id>.png` (0600, through a `.tmp-<pid>` sibling), only in a folder named `shots`; inside a work tree each image and its sibling must be git-ignored (`opchain-work/**/shots/`, O4). The JSON lists each image with its size, SHA-256 and `data_check: pending (not done by ow-tools)`; the data check is ow-documentation's (§5.5 there). A failed run keeps the images written before the failing step and lists them (`written`). Every step's page origin is checked after its action, a click included (a click that leaves the list stops with no image), against the exact origins listed (`uat.example.test.evil.org` is not `uat.example.test`). A plan's unknown key is named only when it is a plain short word (F-021).

### 5.7 export --pptx (1.1.0, amendment T2)

`ow-tools export <deck.md> --formats pptx` (it can be combined with `pdf,docx`). Needs pandoc, `zip` and `unzip`.

- **Input:** the 1.0.0 preflight runs unchanged (one H1, no skipped levels, alt text, table headers, link text, internal sections stripped, artefact header removed, images confined), then the **deck rules**: the H1 is the deck's title only (O14: N `##` headings give N slides; it goes in the file's title, not on a slide); no text between the title and the first `##`; no H3 or deeper outside speaker notes; at most one image or table per slide (pandoc would split a slide with two); speaker notes are fenced blocks `::: notes` … `:::` on lines of their own, and no other `:::` block; no thematic break or setext underline (`---`, `***`, `___`), which pandoc turns into an extra slide (Bug 4). pandoc reads the deck as `gfm-autolink_bare_uris+fenced_divs-yaml_metadata_block`, `--slide-level=2`.
- **Reference deck, built per run** from pandoc's own default (`pandoc -o reference.pptx --print-default-data-file reference.pptx`): the theme's colours (`dk1` text, `lt1`/`lt2` background, `dk2`/`accent1` primary, `accent2` accent, `hlink` the link colour) and fonts (major = heading, minor = body) from `brand.yaml`, and the logo on the slide master with its alt text.
- **After pandoc** (unzip, edit, zip, as `docx.mjs`): the banner (`banner_text`) as a text box on **every slide**; each picture's description set from its Markdown alt text; every table's `firstRow="1"`; the core title. Then checked: the slide count equals the `##` count, and every picture has a non-empty description (exit 5 otherwise).
- **Output:** `export/<name>.pptx` (0600) and the export record (§8).
- **Images (all Markdown formats, SA-010 / F-012):** the preflight refuses, by line, any image not written as `![alt](file)` (a reference or shortcut image, a title in single quotes, brackets in the alt text, a space in the path). Then, before any engine runs, pandoc reads the prepared document to its AST (`pandoc -t json`) and every `Image` node's target, in the metadata as well as the body, must be one of the copies ow-tools made in the temp folder (`assets/img-N.<type>`); anything else is refused (exit 4 `unchecked-image`). So no file outside the document's folder can reach a client PPTX, DOCX or PDF, whatever form the Markdown takes.
- **No YAML metadata (all Markdown formats, Bug 1, round 3):** a YAML block's values are Markdown that pandoc renders into the document (an `abstract` holding an escaped image embedded any file into a Word export). pandoc's readers have `yaml_metadata_block` off (`gfm-autolink_bare_uris-yaml_metadata_block`), and ow-tools sets the one metadata field it uses (`lang`) on the command line. The preflight refuses a YAML block below the ow- header (`---` after a blank line, `key:` lines, then `---` or `...`), naming its line, so it isn't printed as text; and the AST check walks the metadata in case a reader ever reads one. A test reaches each layer on its own.
- **No TeX math (all Markdown formats, 1.1.1, Bug 7):** the readers also have `tex_math_dollars` and `tex_math_gfm` off, so `$…$` and a ` ```math ` block stay text. An equation used to stop the PDF (Typst's PDF/UA output needs alt text on every equation), and in quotes and invoices a dollar sign is money.
- **Raw HTML:** refused by line, outside code spans; an escaped backtick (`` \` ``) opens no code span, so it can't hide a tag (Bug 8).
- **Staging (all Markdown formats, Bug 4, SA-017):** every format is built in the private temp folder; only when all of them pass are they moved into `export/`, each 0600 through a `.tmp-<pid>` sibling, and the record written. A failure leaves `export/` exactly as it was: no unbranded deck, no PDF from an earlier format, nothing replaced.

### 5.8 health (1.1.0, amendment T3)

`ow-tools health --config <health.yaml> [--json] [--no-network]`. Read-only: it checks only what `health.yaml` lists, writes nothing in the repository or under a listed path (its own one write is the RDAP list cache in the data folder; pip-audit, when it runs, keeps its HTTP cache in the user's cache folder), sends no credential, and never reads `.npmrc`, `.yarnrc.yml`, `.pypirc`, `.netrc` or a keychain. Exit 0 whenever the config is valid, whatever the results; one unreachable host doesn't fail the run.

**`health.yaml` (read contract; ow-care `-health` writes it, Sprint 4b).** A strict YAML subset: scalars, one-line `[a, b]` lists or `- item` block lists, and the `thresholds` map. No anchors, aliases, tags or multi-line values; an unknown key is refused. Refusals (exit 4 `config-invalid`) name the line and the key, never the value.

```yaml
schema: 1
repo: ../client-app                  # folder holding the lockfiles (relative to health.yaml)
lockfiles: [package-lock.json]       # optional; default: any of package-lock.json, npm-shrinkwrap.json, pnpm-lock.yaml, yarn.lock
registry: public                     # optional: packages the lockfile doesn't place elsewhere come from the public npm registry
private_scopes: ['@acme']            # optional: never sent, whatever the lockfile says
python: ../client-app/requirements.txt   # optional: a fully pinned file for pip-audit
hosts: [app.example.com]             # TLS certificate expiry (host or host:port)
domains: [example.com]               # domain expiry over RDAP
urls:
  - https://app.example.com/health   # HTTP status (https only; no user name, password, query or fragment)
backups:
  - /Volumes/backup/app.sql.gz       # age by lstat; never opened
thresholds: { cert_days: 30, domain_days: 30, backup_days: 2, advisory: high, outdated: major }
```

Hosts and URL hosts must be public host names (no IP address, no localhost). At most 50 items per list.

**Checks and results.** Every result is `OK`, `attention` or `not checked (reason)`. Thresholds are the O10 defaults, each overridable: certificate and domain ≤ 30 days → attention; an advisory of `high` or `critical` severity → attention, others listed; outdated → attention only when a major version behind (below 1.0, a minor); a backup older than 2 days → attention.

| Check | How | What leaves the machine |
|---|---|---|
| advisories (npm, pnpm, yarn) | Lockfiles parsed locally (`lockfiles.mjs`: npm v1–v3, pnpm v6 and v9, yarn v1 and berry), then one `POST https://api.osv.dev/v1/querybatch` per 1,000 packages, then `GET /v1/vulns/<id>` for each advisory id (at most 200) to rate it: a `MAL-` id or a malicious-packages entry is critical; else `database_specific.severity`; else a CVSS 3 vector's base score (the 3.1 specification with its Roundup, so 7.0 is high; bands 9.0+ critical, 7.0–8.9 high, 4.0–6.9 moderate); else unknown. **An advisory that can't be rated (unknown severity, a failed detail fetch, an id past the 200th) makes the package attention, never OK** (SA-012 / F-013). **So does an answer ow-tools can't fully read** (Bug 5, round 3): no result for a package (a short or empty `results`), a `next_page_token` (more advisories than one page), `vulns` that isn't a list, or an id it can't read; the file's summary row is attention then too. **A batch answer is read by position only when it has one result per query** (1.1.1, Bug 4): a longer or shorter answer is never read by position; each package in that batch is asked on its own (`POST https://api.osv.dev/v1/query`, the same name and version), at most 50 in a run, and the rest are attention. An advisory whose detail names other npm packages than the one it was attributed to makes that package attention | The name and version of each public-registry package (all of them, not only direct ones: one batch request bounds the count; one package per request when a batch answer doesn't line up), and the advisory ids |
| outdated | Direct dependencies from `package.json` (`dependencies`, `devDependencies`) at their lockfile version; `GET https://registry.npmjs.org/<name>/latest` each | Each direct public-registry dependency's name |
| python-advisories | `pip-audit -r <file> --disable-pip --no-deps --vulnerability-service osv --format json --progress-spinner off` (O8, OD-7: argv pinned by test), only when pip-audit is installed and every line of the file is `name==version`; with `NETRC=/dev/null` and `PIP_CONFIG_FILE=/dev/null`. Never pip-audit's installing mode | pip-audit's own requests to `api.osv.dev` for the pinned names and versions (outside `net.mjs`'s address rules) |
| tls | A TLS handshake to each host (SNI, port 443 or the given one), reading the certificate's expiry and whether it is trusted; nothing is sent over it | The handshake |
| domain | The IANA RDAP list (`GET https://data.iana.org/rdap/dns.json`, cached 30 days in the data folder), then `GET <https base>domain/<name>` and its `expiration` event | Each listed domain to its registry's RDAP server |
| http | `GET` each listed URL; a 3xx is reported with its Location host and never followed | The request to each listed URL |
| backup | `lstat` of each listed path: missing → attention; a symlink or not a file → not checked | Nothing |

**Which packages are sent (C13, Bug 1, OD-1, SA-014).** A package whose version isn't plain semver (a URL, a git spec, an `npm:` alias, a path) is never sent, whatever else the lockfile or `registry: public` says. Otherwise a package is sent only when its resolution is the public registry (`registry.npmjs.org` or `registry.yarnpkg.com` in the lockfile), or when the lockfile records no registry (pnpm, yarn berry, an npm entry without `resolved`) and `health.yaml` says `registry: public`; never when it is in a `private_scopes` scope or **the project's own scope** (from `package.json`'s `name`), resolves to another host, a git URL or a tarball, or is a workspace or local package. Those are `not checked (private registry)`, `(private scope)`, `(local package)` or `(registry not recorded in the lockfile; …)`. **Aliases and yarn key specs (Bug 3, round 3).** An `npm:` alias is checked under the real package's name and version (`"acme-shim@npm:left-pad@1.2.0"` is left-pad 1.2.0, in every lockfile form); the alias label never leaves. A yarn key's spec decides the source before `resolved` does: `file:`, `link:`, `portal:`, `workspace:`, `exec:` or a path is a local package (yarn v1 writes no `resolved` for `file:`), and a git, `github:`/`gitlab:`/`bitbucket:`/`gist:`, `user/repo` or URL spec is private. An npm organisation's private packages on registry.npmjs.org can't be told apart from public ones, so their scope belongs in `private_scopes` (ow-care's writer fills it in, Sprint 4b).

**`net.mjs`, the one outbound-request module.** https only; the host must be on the run's destination list (the three fixed destinations, the listed hosts and URL hosts, and the RDAP servers the IANA list names over https); `GET` or `HEAD`, and `POST` only to `api.osv.dev`. The name is resolved once; any answer in a blocked range refuses the destination, even when other answers are public. IPv4: 0/8, 10/8, 100.64/10, 127/8, 169.254/16, 172.16/12, 192.0.0/24, 192.0.2/24, 192.88.99/24, 192.168/16, 198.18/15, 224/4 and above. IPv6 is an allowlist (SA-015 / F-017): only global unicast 2000::/3 passes, minus Teredo 2001::/32, benchmarking 2001:2::/48, documentation 2001:db8::/32 and 3fff::/20 (RFC 9637), and ORCHID 2001:10::/28 and 2001:20::/28; IPv4-mapped, -compatible, -translated, NAT64 (64:ff9b::/96) and 6to4 forms are judged by the IPv4 address inside. The socket connects to the first checked address with the name kept for SNI and the certificate, so a second DNS answer can't redirect it, and it is checked to be that socket on the request's `socket` event, before a byte is written (F-016). No redirect is followed; headers are only `Host`, `User-Agent: ow-tools/<version> (health; read-only)`, `Accept`, `Connection: close` (and `Content-Type`, `Content-Length` on the POST); 15 s timeout; a body cap (64 KB, larger only for the OSV batch, advisory details and the RDAP list). The resolver, connector and destination table are module parameters for tests; no environment variable or flag changes them.

**`--no-network` (O9):** lockfile parsing (it reports how many packages it read, how many would be sent and how many are held back) and backup age only; every network check is `not checked (network off)`, and no socket, DNS or fetch call is made.

**`not checked` reasons:** `network off`, `unreachable`, `address-not-allowed`, `not-a-destination`, `tls-untrusted`, `too-large`, `no lockfile`, `symlink`, `not a file`, `lockfile over 50 MB`, `lockfile could not be read`, `no package.json`, `not in the lockfile`, `not a public-registry package`, `private registry`, `local package`, `registry not recorded in the lockfile; …`, `version not comparable`, `registry answered <status>`, `advisory service answered <status>`, `RDAP server answered <status>`, `RDAP server redirects to <host>`, `no RDAP server for this domain's ending`, `no expiry date published`, `certificate date unreadable`, `pip-audit not installed`, `pip-audit failed`, `pip-audit output unreadable`, `no requirements file`, `the requirements file is not fully pinned …`.

### 5.9 export --xlsx (1.1.0, amendment T6)

`ow-tools export <sheet-folder> --formats xlsx [--out DIR]`. Node built-ins only (XLSX is zipped XML; `zip.mjs` writes stored or deflated entries with a table CRC-32 and one fixed timestamp), so it is never absent where ow-tools is. The same input gives byte-identical output.

**The folder.** One `<Sheet>.csv` per sheet (RFC 4180, UTF-8; row 1 is the header), `model.md` (required, even when nothing is computed), and optionally `sources.csv`, which becomes a last sheet named `Sources` (O13: written only when given; ow-draft's Sources check requires it skill-side, ow-vendor-eval's blank workbook has none). Sheet names (the file names) are 1–31 letters, digits, spaces, `.`, `_` or `-`.

**`model.md`, the formula map (read contract; ow-draft and ow-vendor-eval write it, Sprints D and V).**

```markdown
---
ow_artefact: ow-draft/sheet-model
…
---
CONFIDENTIAL — banner text, when the handling level sets one

# Model: Fit-out costs

## Sheet: Costs

| Cell | Formula | Format |
| --- | --- | --- |
| D2 | =B2*C2 | currency:USD |
| D5 | =SUM(D2:D4) | currency:USD |
| C2:C4 | | currency:USD |

## Sheet: Rates

| Cell | Formula | Format |
| --- | --- | --- |
| B3 | =ROUND(Costs!D5*(1+B2),2) | currency:USD |
```

- The optional ow- header block and `banner_text` line work as in Markdown export; the banner becomes every sheet's printed header. The first H1 (with an optional `Model:` prefix) is the workbook title. Prose anywhere else is ignored.
- `## Sheet: <name>` names `<name>.csv`; the sheets come in this order, then Sources. **Every data CSV must be named**: a CSV in the folder with no `## Sheet:` section is refused (exit 4 `sheet-not-in-model`, naming the sheet), so nothing ships that the model doesn't name (SA-018). This changed the contract as first written ("then any other CSV by name"); the owner accepted it as OD-8 (§14.1) and §4.2 flags it to Sprints D and V. A `## Sheet:` section with no CSV stays `unknown-sheet`.
- `model.md` has no internal sections: any HTML comment in it that mentions "internal" (an `ow:internal` marker included) is refused (exit 4 `preflight`, naming the line; SA-018 / F-020). Move such a sheet out of the folder.
- Excel's grid bounds every reference and mapped cell: columns to `XFD` (16,384), rows to 1,048,576; a CSV over 10 MB, or wider or longer than a worksheet, is a usage error. The writer visits only cells that hold something, so a cell at `XFD1048576` costs one cell (F-019).
- Each row: **Cell** is one cell (`D5`) for a formula, or a cell or range (`C2:C4`) for a format only; **Formula** is empty or starts with `=` (one cell per formula, never in row 1; a `|` inside a formula is written `\|`); **Format** is `text`, `integer` (`#,##0`), `decimal` (`#,##0.00`), `percent` (`0.00%`), `date` (`yyyy-mm-dd`; an ISO date in the CSV becomes a date), `currency:XXX` (`"XXX "#,##0.00`), or empty.
- Allowed functions: `ABS`, `AND`, `AVERAGE`, `COUNT`, `COUNTA`, `COUNTIF`, `IF`, `IFERROR`, `MAX`, `MIN`, `NOT`, `OR`, `ROUND`, `ROUNDDOWN`, `ROUNDUP`, `SUM`, `SUMIF`, `SUMPRODUCT`. References: `A1`, `$A$1`, ranges, `Sheet!A1` and `'Sheet name'!A1:B2`. Nothing else is written: no defined names, array constants or error literals.

**Preflight** (exit 4, naming `sheet!cell` only, never a value): a typed value in the CSV where the map gives a formula (`typed-value-in-formula-cell`); a reference to a sheet that isn't in the workbook (`unknown-sheet`) or to a cell outside the sheet's data (`unknown-cell`); a function outside the list (`function-not-allowed`); another workbook (`[Book.xlsx]Sheet!A1`, `external-reference`); a DDE-style formula (`cmd|…`) or one that reaches outside the workbook (`WEBSERVICE`, `HYPERLINK`, `FILTERXML`, `RTD`, `DDE`, `CALL`, `REGISTER`, `IMPORT…`; `dde-or-link-formula`); anything else the tokenizer doesn't know (`formula-syntax`); a formula in row 1 (`formula-in-header`).

**Output.** Formula cells carry `<f>` and **no stored value**; the workbook is set to recalculate on load (`fullCalcOnLoad`). Each sheet has one bold header row, frozen. CSV text is written as text (inline strings), including text that starts with `=`, `+`, `-` or `@`, which also gets Excel's quote prefix so editing the cell doesn't turn it into a formula. Numbers are written as numbers. `export/<name>.xlsx` (0600) and the export record; the source digest is the folder digest (§5.10).

### 5.10 digest (1.1.0, amendment T7)

`ow-tools digest <file|folder> [--json]`. It prints, every time: **"detects accidental change only; not tamper-evidence"**.

- **A file:** the SHA-256 of its bytes (`form: file-bytes`), equal to `shasum -a 256`.
- **A folder:** the SHA-256 of its canonical manifest (`form: ow-tools-tree-v1`): one line per regular file, `<sha256 hex>  ./<relative/path>\n` (two spaces), sorted by the bytes of `./<relative/path>`, hashed as a whole. Modes, times, owners and empty folders are not part of it; content, names, adds and removes are. The shell one-liner that reproduces it, where `find`, `sort` and `shasum` (or `sha256sum`) exist:

  ```sh
  (cd DIR && find . -type f ! -name .DS_Store ! -name '._*' -print0 | LC_ALL=C sort -z | xargs -0 shasum -a 256) | shasum -a 256
  ```
- `.DS_Store` and `._*` (Finder litter) are skipped and always listed in the output (O12).
- **Refused (exit 4, naming the path):** a symlink anywhere, including the path given (`symlink-in-tree`); a name with a backslash or a control character, which the shell form would escape (`unsafe-name`); anything that isn't a regular file or folder (`not-a-file`). Files are opened with `O_NOFOLLOW`, so a file swapped for a symlink after the walk is refused, not followed; and each file's real path is checked after reading, so a folder on its path swapped for a symlink is refused too (F-018).
- `digestTree()` in `lib/digest.mjs` is exported, so Sprint C's `scripts/build-packs.mjs` imports this implementation. Hashes stream in 1 MiB chunks (`hash.mjs`), which doctor's model check now uses too (F-007).

## 6. Install and setup checks

`ow-tools doctor` (also `/ow-tools` and `/ow-start-transcribe --setup`) checks each requirement and prints the command that fixes it. Every step is print-only (decision 4): ow-tools never runs `brew`, `apt`, `sudo`, `uv sync` or a model download itself.

| Requirement | For | Check | Printed fix (macOS) |
|---|---|---|---|
| Node ≥ 20 | everything | `bin/ow-tools` itself, before any module loads; the hook verb exits 0 silently on an older Node | `brew install node` |
| ffmpeg | transcribe | on PATH, version | `brew install ffmpeg` |
| whisper.cpp `whisper-cli` | transcribe | on PATH, version | `brew install whisper-cpp` |
| Whisper model | transcribe | file + pinned SHA-256 in the data folder | one `curl` line from Hugging Face (~1.6 GB, not gated) |
| uv | transcribe | on PATH | `brew install uv` |
| Python 3.12 venv with pyannote | transcribe | venv for the current `uv.lock` exists and imports | `uv sync --frozen` with the data-folder environment (uv fetches its own Python 3.12; the system `python3` 3.14 is untouched) |
| pyannote model terms + token | transcribe | model cached in the data folder | accept the model terms on Hugging Face; store a read token in the keychain (`security add-generic-password -s ow-tools-huggingface -a "$USER" -w`, which prompts); run the one-time fetch. The token is needed only for that fetch and can be deleted after |
| pandoc, Typst | export | on PATH, versions | `brew install pandoc typst` |
| `zip`, `unzip` | export (Word reference doc) | on PATH | part of macOS |
| gitleaks ≥ 8.19 | scan (draft) | flags present | `brew install gitleaks` |
| Chrome or Chromium (1.1.0) | capture | on PATH (`google-chrome`, `chromium`, …) or at the standard macOS paths; never started by doctor | `brew install --cask google-chrome` |
| pandoc, `zip`, `unzip` (1.1.0) | export --pptx | the same rows as export | as above |
| pip-audit (1.1.0, optional) | health on Python projects | on PATH | `brew install pip-audit` (Linux: `pipx install pip-audit`) |

Typst's version is compared as full semver (F-010). xlsx, health, calc and digest need only Node, so they are never reported missing. doctor stays print-only and offline: it opens no socket, and every printed fix is a package-manager line.

**Where things live.** Code: Claude Code's plugin cache (replaced on update). Venv, models and Hugging Face cache: `${OW_TOOLS_HOME:-~/.local/share/ow-tools}`, outside every repository. (Claude Code's `CLAUDE_PLUGIN_DATA` is not visible to commands run through the Bash tool, so ow-tools can't rely on it.) The venv is keyed by the `uv.lock` hash, so a plugin update that changes the lock is reported by `doctor` as one `uv sync` away. `doctor` prints the folder's size and how to remove it; uninstalling the plugin does not delete it.

**Platforms.** macOS on Apple Silicon is built and tested. Linux gets the same checks with generic printed fixes, untested in 1.0.0. Windows is not supported.

## 7. Marketplace, mirror and the dev marketplace

The audit's rule (A:177, A:3005–3019) is that admin approval matches a marketplace, not the entries inside it. Claude Code's docs confirm it: an allowlist entry matches a GitHub source on repository, ref **and path**. So each approvable unit needs its own manifest file.

| Manifest | Lists | Runs code | Status |
|---|---|---|---|
| `.claude-plugin/marketplace.json` (`opchain`, dev) | `opchain` (node hooks, commit gate) | Yes | Unchanged. Never lists ow-tools (a test asserts it) |
| text-only ow- marketplace (if the family ships one) | ow- skills only: no hooks, no code (A:3019) | No | Not this work. Never lists ow-tools |
| **`plugins/ow-tools/.claude-plugin/marketplace.json`** (`opchain-work-tools`) | `ow-tools` only | Yes, declared | This work |

- The ow-tools entry uses a `git-subdir` source: the public mirror `asfbay-bit/opchain-skills`, path `plugins/ow-tools`, ref `main`, no pinned SHA (the mirror force-pushes each sync). `plugin.json` carries the version, so updates follow releases rather than mirror commits.
- **Install** (Claude Code): `/plugin marketplace add https://raw.githubusercontent.com/asfbay-bit/opchain-skills/main/plugins/ow-tools/.claude-plugin/marketplace.json`, then `/plugin install ow-tools@opchain-work-tools`.
- **Admin approval:** that URL in `strictKnownMarketplaces`, or the GitHub source with that `path`. Either approves ow-tools and nothing else.
- **Mirror:** `mirror-public.yml` already triggers on `plugins/**` and copies `plugins/` whole, so ow-tools and its manifest go public with no workflow change. The required-files list gains `plugins/ow-tools/.claude-plugin/plugin.json`, `marketplace.json` and `hooks/hooks.json`, so a missing file fails the sync loudly. `mirror/README.md` gains a short ow-tools install section.
- **Admin packet:** `SECURITY-MANIFEST.md` lists every file with its SHA-256, every external binary ow-tools calls, network destinations ("none at run time; Hugging Face only in the user-run setup fetch"), and the files it writes. A test regenerates it and fails on drift (A:142, A:3282).

## 8. Privacy rules

| Rule | How ow-tools keeps it |
|---|---|
| Audio stays local | No upload anywhere. The diarization step runs offline with no token in its environment. ffmpeg runs with `-protocol_whitelist file`, so it can open local files only, even when a recording is really a playlist; whisper.cpp reads only the temp WAV. No telemetry, no update check |
| Recordings live under `audio/` | `transcribe` refuses input outside a folder named `audio` (exit 4) |
| Audio and transcripts are git-ignored | Before writing, `git check-ignore` must pass for the recording and both transcript files; otherwise exit 4 with the lines to add. ow-tools never edits `.gitignore` |
| Temp copies don't linger | The normalised WAV and intermediate JSON live in a 0700 temp folder removed in a `finally` |
| The token is never written by ow-tools | The user stores it in the keychain (Linux: `~/.config/ow-tools/hf-token`, refused unless mode 0600 or 0400: `doctor` reports any other mode as not stored and prints the `chmod`, and the printed fetch command reads the file only at those modes, through `find -perm`). ow-tools reads it only in the setup fetch, never prints it, and never passes it to the transcription run |
| Credentials never in files | No ow-tools output contains one; the export preflight's messages name line numbers only and never quote document text (§5.2) |
| Internal sections stay internal | Markers are matched regardless of case and spacing; any other comment mentioning "internal" refuses the export (§5.2), so a typo can't let a section through |
| A client document carries only its own images | Image paths are confined to the document's folder (or its `opchain-work/` folder) after symlinks are resolved, and must be PNG, JPEG or GIF by content (§5.2). From 1.1.0 every image pandoc itself would read is checked against the copies ow-tools made, and any other image form is refused (§5.7, SA-010) |
| Redacted scanning only | §5.5: the match is never emitted, written or logged; unredactable means not run |
| No private names | A test fails if any file in `plugins/ow-tools/` names `llc-ops`, a skill outside the ow- family, or "Deftwright"; `lint-internal-refs` already covers personal identifiers in `plugins/` |
| Files are data | Transcripts carry the data sentence; the hook wraps STATUS.md content as data and strips control characters, bidi controls and zero-width characters (SA-008) |
| **Network (1.1.0)** | Only two verbs open a socket. **health** reaches the fixed destinations `api.osv.dev`, `registry.npmjs.org` and `data.iana.org`, the RDAP server the IANA list names (https only) for each listed domain, and the hosts and URLs `health.yaml` lists; through one module (`net.mjs`) that refuses loopback, private, link-local, CGNAT and metadata addresses after resolving the name, connects to the checked address, follows no redirect, sends no cookie or auth header, and caps every body. `--no-network` sends nothing. **capture** looks up each allowed host name once before launch (refusing a loopback or link-local answer), then drives the browser to the plan's `allowed_origins` only: every request to another origin is failed, and the browser resolves no name but the allowed ones, each to the address ow-tools checked; its own background traffic is turned down by flags (§5.6). Every other verb, doctor and the hook open no socket; a test runs each under a fence that fails any socket, DNS or fetch call |
| What health sends (1.1.0) | The name and version of each **public-registry** package in the lockfile to `api.osv.dev` (POST) and each direct dependency's name to `registry.npmjs.org` (GET). A package from a private registry, a private scope, a local path, or one whose lockfile doesn't record its registry (pnpm, yarn berry) without `registry: public` in `health.yaml`, is never sent. It never reads `.npmrc`, `.yarnrc.yml`, `.pypirc`, `.netrc` or a keychain |
| Screenshots are git-ignored (1.1.0) | `capture` writes only into a folder named `shots/`; inside a work tree `git check-ignore` must pass for each image and its temp sibling, otherwise exit 4 with the line `opchain-work/**/shots/` (O4). Images are 0600 and every one is reported `data_check: pending (not done by ow-tools)` |
| The capture profile (1.1.0) | A signed-in test session lives in `$OW_TOOLS_HOME/capture/<workstream>/` (0700), one per workstream (O2). The password manager and autofill are off in it, first run and sync are off, and downloads are denied. ow-tools never reads a cookie or storage and never evaluates JavaScript. The profile's cookies are encrypted with the browser's key in the user's keychain (SA-011), and after any production run the session is wiped, a killed one included (signals, and a pending marker the next run honours; SA-019). `--profiles` lists it; `--delete-profile` removes it; ow-handoff's access removal names it (H3) |
| Exports are recorded (1.1.0, SA-007) | Every export writes `export/<name>.export.json`: per format, the output's and source's SHA-256, the tool version and the time from the tool's clock, and whether it replaced a file. `speakers --set` runs the same ignore check as `transcribe` |
| Private writes (1.1.0, F-005, F-006) | Without `git` the ignore check is exit 3, never a pass. Transcripts, screenshots and export records are written 0600 through a `.tmp-<pid>` sibling the ignore check also covers |

### Known residuals (updated from the 1.1.0 security review, 2026-10-16, and its re-reviews, 2026-10-17)

Reports: `docs/audits/2026-10-16-ow-tools-1.1-security-posture.md` (posture; round 1 PASS-WITH-NOTES, rounds 2 and 3 **PASS**) and `docs/audits/2026-10-16-ow-tools-1.1-diff-audit.md` (diff audit; PASS-WITH-NOTES all three rounds); the 2026-10-14 reports for the 1.0.0 items. Each file holds its latest round; earlier rounds are in git history. Closed in 1.1.0 (verified by the review): SA-007, SA-008, F-005, F-006, F-007, F-008, F-010. No new CRITICAL or HIGH.

**Carried, still open:**
- **SA-001 (HIGH, re-rated 2026-10-16: impact up, likelihood unchanged), distribution pinning:** the marketplace entry follows the force-pushed mirror at `ref: main` with no `sha` or archive hash, and `SECURITY-MANIFEST.md` travels in the tree it attests. 1.1.0 gives a compromised update no new capability (the SessionStart hook already runs its code), but it widens what that code reaches: live sessions on client test environments in the capture profile, and the ability to drive the browser. Not CRITICAL: a compromise still needs `MIRROR_TOKEN`, the `asfbay-bit` account or upstream `main`, then a manual update. Planned for Sprint 5; SA-011's fix pulls most of the added impact back.
- **SA-004 (MEDIUM), model revision pins:** unchanged; transcription is untouched by 1.1.0.
- **SA-009 (LOW), the print channel:** unchanged; 1.1.0 adds only package-manager lines (`brew install --cask google-chrome`, `brew install pip-audit` / `pipx install pip-audit`). Tied to SA-001.
- **F-011 (LOW), Word run order:** open; XLSX part order checked against the schema by the review; PPTX is covered by the owner's real-app check.

**New in the 1.1.0 review, all fixed in Sprint T round 2** (tests named after each finding in `tests/ow-tools/`):
- **SA-010 / F-012 (MEDIUM), image containment bypass** by reference-style images, single-quoted titles and brackets in alt text, reaching PPTX and DOCX.
- **SA-011 (MEDIUM), the capture profile at rest:** `--use-mock-keychain` left the cookie key fixed and public. Owner decision 2026-10-17: the real macOS Keychain (one "Always Allow" approval) and cookies and storage wiped after every production run (§5.6, §14.1). A kept non-production profile still holds a live test session; ow-handoff's access removal names it (H3).
- **SA-012 / F-013 (MEDIUM), advisories that can't be rated reported OK** (`MAL-` entries, CVSS-only advisories, a failed detail fetch, ids past the 200th).
- **LOW, all fixed:** SA-013 / F-015 loopback origin variants; SA-014 npm organisation-private packages on registry.npmjs.org; SA-015 / F-017 special-purpose address ranges; F-016 the socket check after the request is sent, and unfenced stub suites; SA-017 / F-014 failed exports leave files; F-018 digest parent swap; F-019 Excel limits; SA-018 / F-020 `model.md` internal markers; F-021 plan key echo; F-022 unsafe integers in `calc hours`; F-023 capture clean-up list; F-024 docs drift.
- **New in the re-review, fixed in Sprint T round 3:** **SA-019 / F-025 (LOW)**, a production capture killed by SIGKILL left its session until the next production run, and a few session-adjacent stores survived the wipe. Now: signal handlers wipe at once, a pending marker makes the next run of any environment wipe first, a production run starts wiped, and the wipe list adds those stores (§5.6).
- **Accepted residual, capture's browser traffic:** the Fetch guard sees the page's requests only. Service-worker fetches, WebSockets and WebRTC are not intercepted, and the browser's own background traffic is reduced by flags, not proven absent. The host-resolver map still limits all of them to the plan's hosts, at the addresses ow-tools checked (round 3).
- **New in the round-3 re-check, all LOW, closed in 1.1.1 (the OW-03 follow-up):**
  - **SA-020 / F-026 (LOW), closed in 1.1.1:** a capture origin's host wasn't held to host-name syntax, so `,` and `*` reached the `--host-resolver-rules` string (no whitespace could, so no rule keyword could be injected, and every outcome still routed only to an address ow-tools checked). Closed: `allowed_origins` hosts are held to the `HOST` pattern health uses (now in `addr.mjs`), or an IP literal (§5.6).
  - **SA-021 / F-027 (LOW), closed in 1.1.1:** there was no per-profile run lock, so a second run on the same profile removed a running production run's pending-wipe marker; if the first run was then killed outright, the next run didn't wipe what it left. Closed: an exclusive per-profile run lock, taken before anything is written in the profile; a concurrent run or `--delete-profile` is refused (`profile-in-use`) (§5.6).
  - **SA-022 / F-028 (LOW), closed in 1.1.1:** the secret-field name rule was English and ASCII only (it missed `contraseña`, `Kennwort`, `senha`, `пароль`, leetspeak and descriptive placeholders); `type=password`, `autocomplete` and the plan-value check were language-independent and still refused. Closed: accents are folded, other languages' words and scripts, leet forms and the "code we sent" phrasings are refused (§5.6).
- **Accepted residual, capture's name check is a snapshot:** the allowed names are resolved once, before launch, every answer is checked, and the browser is pinned to one of them (the first IPv4 answer, else the first). A name whose answers change later can't move the browser; one whose answers were already public at check time is trusted for the run.

## 9. Tests

All Vitest, under `tests/ow-tools/`, run by `npm test` and CI. Real-tool tests skip, and say so, when the tool is absent.

| Area | Tests |
|---|---|
| merge | Word-to-turn assignment; a segment split at a turn change; overlap marking; words in no turn → `UNKNOWN`; deterministic order |
| transcript render | ow-protocol v1 header block and banner position; `mm:ss` and `h:mm:ss`; roles applied after `--set`; relative paths only; the data sentence present |
| speakers | Two samples per speaker; unknown speaker id refused; control characters in a role refused |
| guards | Audio outside `audio/` refused; an un-ignored output in a temp git repo refused; temp folder removed after success and after a forced failure |
| pipeline (stubbed) | Fake `ffmpeg`, `whisper-cli` and `uv` on PATH produce canned output end to end; the diarizer's environment has the offline flags and no token |
| doctor | Each requirement present/missing via a stub PATH; exact printed fixes; a stub `brew` records that it was never called |
| export preflight | Skipped heading level, two H1s, missing alt, empty header cell, bare-URL link text, unbalanced or nested internal markers: each refused with its line; case and spacing variants of the markers stripped; misspelt, mid-line, multi-line and unclosed markers refused; images outside the folder, behind a symlink, or not PNG/JPEG/GIF refused; messages never quote the document; internal text absent from the output |
| brand | The schema accepted; anchors and multi-line strings refused; WCAG contrast ratios on known pairs; failing brand refused with the ratio |
| export (real, skips without pandoc/Typst) | PDF has a structure tree, `/Lang`, `/Title`, bookmarks, and no internal-section text; Word has Heading styles, a repeating table header row, image descriptions, title and language |
| hook | Fixture STATUS.md → expected lines; silent without `opchain-work/`, without `node` and with a stub Node 18; malformed lines counted, not shown; an embedded "ignore previous instructions" line stays inside the data wrapper; overdue against a fixed clock |
| calc | Business days across weekends and listed holidays; splits that sum exactly |
| plugin shape | `plugin.json`, `hooks.json` and `marketplace.json` parse and point at real files; the dev marketplace doesn't list ow-tools; no `package.json` at the plugin root; `SECURITY-MANIFEST.md` matches; no private or out-of-family names; no banned gate words (A:117) in output strings; `claude plugin validate --strict` when the CLI is present |
| scan-secrets (waits) | A stub gitleaks that leaks a match → NOT-CHECKED and nothing printed; real gitleaks on a temp repo with a planted fake key → output never contains the key |
| digest (1.1.0) | File digest = `shasum -a 256`; folder digest unchanged by mtime, mode, `cp -R` and creation order, changed by any byte, rename, add or remove; a symlink anywhere is exit 4 naming it; Finder litter skipped and listed; the shell one-liner gives the same hex |
| calc hours (1.1.0) | The ow-care §6 example; the identity on every fixture month; quarter-hour and over-available refusals naming the entry id; lapse after the next month; `of: included`; `months: N` |
| xlsx (1.1.0) | `<f>` and no value in formula cells; bold frozen header; number formats; Sources sheet when given; recalc on load; byte-identical double run; one plant per refusal; formula-looking CSV text written as text; LibreOffice recalculation where `soffice` exists |
| pptx (1.1.0) | A six-H2 deck → six slides and six notes slides (real pandoc); one title per slide; theme colours and fonts; the logo on the master; the banner on every slide; descriptions and header rows; no internal text in any part; deck-rule plants; exit 3 without pandoc or zip; exit 5 from a stub pandoc |
| health (1.1.0) | The strict `health.yaml` reader and its plants; stub TLS, RDAP, HTTP and OSV servers injected through module parameters; O10 thresholds; one unreachable host; private-registry packages never sent; read-only (tree hash, methods, headers, no redirect); an fs spy that sees no `.npmrc`, `.pypirc` or `.netrc` read; `--no-network` under the fence; pip-audit's argv pinned |
| capture (1.1.0) | A stub browser speaking CDP over fds 3/4: argv (pipe, never a port), the profile's prefs, every method on the allowlist; secret fields refused before launch and at run time; secret-looking values refused; origin and redirect plants; production decision; PNG size and naming; the shots guard; profile list and delete with planted escapes; the browser killed on failure and timeout; one real Chrome or Chromium run on a loopback page. Round 3: 36 ordinary field names fill and 61 secret ones are refused; the plan's names are looked up once each under the fence (nothing else), pinned and mapped (real Chrome follows the map); SIGINT, SIGTERM and SIGHUP wipe a production session, and after a SIGKILL the next run wipes first (fake and real browser) |
| network fence (1.1.0) | Static: modules reachable from the no-network verbs import no network module and name no fetch or WebSocket; capture's one `node:dns` import is loaded only when a run starts. Runtime: every no-network verb, doctor and the hook run under a preload that fails and records every socket, DNS and fetch call, with zero attempts |

The spike harness (§10) is a script, not a CI test: it needs the real models.

## 10. Transcription speed spike

**Question** (ow-start open question 2): is a 20-minute two-person call transcribed and separated in under ~5 minutes on this Mac (Apple M3 Pro, 36 GB)?

**Recording.** Synthetic and invented: a scripted 20-minute fit call between "you" and a fictional client (Meridian Floor & Tile), voiced by two macOS `say` voices, joined by ffmpeg with natural gaps and saved as `.m4a` like a Meet download. It plants ow-start §10's cases (one contradiction, one interviewer-led answer, one embedded instruction). Because the script is known, the true speaker of every second is known.

**Measured.** Wall-clock per stage (normalise, Whisper, pyannote, merge) and total; real-time factor; share of words attributed to the right speaker; speaker count found; the three planted cases findable in `transcript.md`. Then the same with `--model medium`, and pyannote on CPU vs Apple's MPS.

**Bar.** Total ≤ 5:00 for 20:00 of audio, and ≥ 95% of words on the right speaker. Synthetic voices are cleaner than a real call, so the accuracy figure is an upper bound; the first real call (yours, never committed) is the real check.

**Result (interim, 2026-10-09).** The recording built by `scripts/ow-tools-spike.mjs --rate 155` is 20:00 long: 141 turns, 17:05 of speech, 1.25 s between turns. On the M3 Pro, **Whisper `large-v3-turbo` transcribed it in 58 s** (whisper.cpp 1.9.5, Metal, 8 threads), about 3.4% of real time. Without a starting prompt the long run came out lowercase with no punctuation; a short punctuated prompt fixed that at the same speed (§5.1). **Speaker separation is not yet measured:** it needs the owner's one-time pyannote model fetch. The full pipeline time and speaker accuracy go here when it has run.

## 11. Coordination with the sibling builds

| With | ow-tools needs | ow-tools gives |
|---|---|---|
| ow-start build ([ainatx/opchain#596](https://github.com/ainatx/opchain/pull/596): `catalogs.json`, `skills-work/`, `ow-protocol.md` v1) | Already true in #596: the STATUS line and artefact header formats ow-tools reads and writes (§4–§5 there); ow-start ships no command or skill named `ow-start-transcribe` and says the add-on provides it; `/ow-start-prep` offers the `.gitignore` lines ow-tools checks; extract reads `intake/<client>/transcript.md` | The `transcript.json`/`.md` contract (§5.1); the `ow-tools speakers` confirm step, whose roles extract can confirm in one question |
| ow-build-plan build | `quote.md`'s internal appendix wrapped in the `ow:internal` markers; the shipped `brand.yaml` example matches §5.2 | The export call and its report |
| Both | Never set `OPCHAIN_SKILLS_DIR` to `skills-work/` (two scripts delete their destination); ow-tools reads nothing from `skills-work/` | — |

ow-tools needs nothing from those branches, so it branches from `main` and doesn't touch `skills-work/`, `catalogs.json`, the `ow-protocol` block or `plugins/opchain/`.

## 12. What ow-tools never does

Installs a system package, runs `sudo`, or installs into its own Python environment (`uv run --no-sync`), or downloads a browser · sends audio, a transcript or document text anywhere (ffmpeg is held to the `file` protocol); only `health` (package names and versions, and the hosts it lists) and `capture` (a name lookup for each allowed host, then the test environment the plan lists) use the network, §8 · reads a cookie or storage, or evaluates JavaScript, in a capture browser · types into a password or one-time-code field · embeds a file from outside the document's folder or its `opchain-work/` folder in a client document (every image pandoc reads is checked, §5.7) · quotes document text in a preflight message · edits `.gitignore`, `STATUS.md`, `profile.md`, `brand.yaml` or any file an ow- skill writes · stores, prints or logs a credential or a secret match (a capture profile holds the test session the user signed in to; ow-tools never reads it, §8) · reads `.npmrc`, `.pypirc`, `.netrc` or a keychain value · scans a working tree or opens a `.env` file · deletes a user file (only its own temp files, and a capture profile on `--delete-profile`, confined to `$OW_TOOLS_HOME/capture/`) · guesses who a speaker is · claims accessibility conformance, a verified signature or an approval.

## 13. Open questions

The four design questions were answered on 2026-10-09 (§1.1). None remain open for 1.0.0. Two items wait on other designs: the secrets scan and the US federal calendar ship with ow-handoff and ow-uat once those designs are approved.

## 14. 1.1.0 (2026-10-16 amendments T1–T7)

**Built in Sprint T** (contract `sprints/release-2.1/ow-sprint-t/contract.md`, approved 2026-10-16). One release, ow-tools **1.1.0**, adds six parts and one calls-table row: `capture` (T1, §5.6), `export --pptx` (T2, §5.7), `health` (T3, §5.8), `calc hours` (T4, §5.4), the ow-start meeting row (T5, §4.2), `export --xlsx` (T6, §5.9) and `digest` (T7, §5.10). The sections they touch are edited in place and marked 1.1.0.

### 14.1 Owner decisions (2026-10-16)

The owner accepted every recommendation in the contract's *Open for the owner* table.

| # | Decision | Answer |
|---|---|---|
| O1 | How capture reaches each step | A declarative plan: navigate, click, fill test data, wait, shot. Secret fields refused; no caller JavaScript |
| O2 | Profile scope | One per workstream: `capture/<client>/` |
| O3 | Production guard | A declared `environment`, an `allowed_origins` list, and a required decision (role and date) for production, echoed and labelled unverified |
| O4 | Screenshots at rest | Git-ignored like transcripts: `opchain-work/**/shots/`, checked before writing |
| O5 | Browser | Chrome or Chromium, found on PATH or at the standard paths; doctor prints `brew install --cask google-chrome`; nothing downloaded |
| O6 | Capture's release | In 1.1.0 after a 2-hour go/no-go spike (§14.2) |
| O7 | Advisories: what leaves the machine | OSV (`api.osv.dev`) for public-registry packages only; name and version |
| O8 | Python | pip-audit when installed, only with `-r` in its no-install mode, argv pinned by test; otherwise `not checked` |
| O9 | Under a handling level | `--no-network`: local checks only. ow-care §5.4 is flagged for Sprint 4b to use it |
| O10 | Thresholds | Defaults, overridable in `health.yaml`: certificate and domain ≤ 30 days; advisory high or critical; outdated a major behind |
| O11 | calc hours beyond the site rule | `of: included` = min(own unused, ⌊share × included⌋ to the quarter-hour); `months: N` = each month's rollover lapses after N months, oldest used first |
| O12 | Folder digest exclusions | Skip `.DS_Store` and `._*`, and list them |
| O13 | XLSX Sources sheet | Written when `sources.csv` is given |
| O14 | Deck H1 | The title only: N `##` headings give N slides |

Owner decisions after evaluation round 1 and the security review (2026-10-16/17), as the evaluator and reviewer recommended:

| # | Decision | Answer |
|---|---|---|
| OD-1 | `registry: public` for lockfiles that don't record a registry | Accepted, but it **never** covers a package whose version is a URL, a git spec or a path (§5.8) |
| OD-2 | Body caps above 64 KB for the OSV batch (4 MB), advisory details (512 KB) and the RDAP list (1 MB) | Accepted |
| OD-3 | Refusals stricter than the contract (query strings, IP and localhost hosts, `decision` off production, case-duplicate step ids, header-row formulas, unsafe digest names, `--holidays` with `--days`) | Accepted |
| OD-4 | Four hours kinds (`care`, `health`, `report`, `meeting`) | Accepted; ow-care Sprint 4b reports `report` + `meeting` as one line |
| OD-5 | 1.0.0 behaviour changes (§14.5) | Accepted |
| OD-6 | A calc verb for weighted scores | Deferred to Sprint V; `calc total` is not used for it |
| OD-7 | pip-audit's egress | Pinned to `--vulnerability-service osv`, argv tested |
| SA-011 | The capture profile at rest | The real macOS Keychain, approved once with Always Allow (README, doctor); cookies and storage wiped after any production run (§5.6) |

Owner decision after evaluation round 2 (2026-10-17):

| # | Decision | Answer |
|---|---|---|
| OD-8 | Every data CSV in a sheet folder must be named in `model.md` (the Generator's SA-018 rule) | **Kept**, with its own reason, `sheet-not-in-model` (not `unknown-sheet`, so a caller can tell "the model names a missing CSV" from "a CSV the model doesn't name"). A change to §5.9's read contract, flagged to Sprints D and V in §4.2 |

### 14.2 Capture spike (O6)

**GO, with one change, recorded for the owner's confirmation** (`sprints/release-2.1/ow-sprint-t/capture-spike.md`). CDP over the pipe, the profile's password-manager and autofill prefs, headless on an existing profile, the fixed viewport, the five step kinds without JavaScript, secret-field detection and the redirect guard all worked with Chrome 154. A headed sign-in followed by a separate headless run keeps only cookies with an expiry: Chrome drops session-only cookies on every restart, and ow-tools may not read cookies to carry them over. So `--sign-in` runs the plan's steps in the same browser session after the user signs in (§5.6); the plain headless run serves environments with a persistent sign-in. If the owner wants capture headless-only, dropping the steps from `--sign-in` restores that, for persistent-cookie environments only.

### 14.3 Refusal reasons (exit 4) and run failures (exit 5)

Every exit-4 refusal carries a stable `reason` in its JSON, so a calling skill can relay it in its own words (the Sprint 1 Bug 4 lesson). A test fails if `lib/` throws a code this table doesn't list.

| reason | Exit | Verbs | Means | Next step |
|---|---:|---|---|---|
| `not-in-audio-folder` | 4 | transcribe | The recording isn't in a folder named `audio` | Move it into `<workstream>/audio/` |
| `no-recording` | 4 | transcribe | No recording at that path, or none in the folder | Name the file, or put the recording in the folder |
| `not-ignored` | 4 | transcribe, speakers, capture | An output (or its `.tmp-` sibling) would be committable | Add the printed `.gitignore` lines (`/ow-start-prep` offers them), then run again |
| `output-exists` | 4 | transcribe | A transcript is already in that folder | `--out <folder>` for another recording, or `--force` |
| `not-a-transcript` | 4 | speakers | The JSON isn't an ow-tools transcript (schema 1) | Give the `transcript.json` ow-tools wrote |
| `brand-invalid` | 4 | export | `brand.yaml` outside its shape | Fix the named line or key |
| `brand-contrast` | 4 | export | A brand colour pair below WCAG contrast | Change the colours; the ratio is printed |
| `brand-missing` | 4 | export | `--brand` names no file | Give the right path, or drop `--brand` |
| `preflight` | 4 | export (pdf, docx, pptx, xlsx) | Structure, internal-section, image-form, raw-HTML, YAML-block or deck-rule problems in the Markdown; in xlsx, a `model.md` comment mentioning "internal" | Fix each listed line; move an internal sheet out of the folder |
| `unchecked-image` | 4 | export (pdf, docx, pptx) | pandoc would read an image (in the body or the metadata) that isn't one of the copies the preflight checked: a form the line check didn't see | Write each image as `![alt](file)` with the file in the document's folder |
| `typed-value-in-formula-cell` | 4 | export (xlsx) | The CSV has a value where `model.md` gives a formula | Empty that cell in the CSV |
| `unknown-sheet` | 4 | export (xlsx) | A formula (or a `## Sheet:` section) names a sheet that has no CSV | Add the CSV, or fix the reference or the section |
| `sheet-not-in-model` | 4 | export (xlsx) | A data CSV in the folder has no `## Sheet:` section in `model.md` (OD-8) | Add its section to `model.md`, or move the CSV out of the folder |
| `unknown-cell` | 4 | export (xlsx) | A reference outside the sheet's data | Fix the reference |
| `function-not-allowed` | 4 | export (xlsx) | A function outside the allowed list (§5.9) | Rewrite with an allowed function |
| `external-reference` | 4 | export (xlsx) | A reference to another workbook | Copy the value in as a cited input |
| `dde-or-link-formula` | 4 | export (xlsx) | A DDE-style formula, or one that reaches outside the workbook | Remove it; links go in the Sources sheet as text |
| `formula-syntax` | 4 | export (xlsx) | Something the formula reader doesn't write (a name, an array, an error literal) | Use cell references, allowed functions, numbers, text and operators |
| `formula-in-header` | 4 | export (xlsx) | A formula in row 1 | Move it below the header row |
| `symlink-in-tree` | 4 | digest, export (xlsx) | A symlink in the folder, or the path given is one, or a file or folder swapped for one while it was read | Replace it with the file it points to |
| `unsafe-name` | 4 | digest | A file name with a backslash or control character | Rename it |
| `not-a-file` | 4 | digest, export (xlsx) | Not a regular file or folder (a socket, a device, a symlinked CSV) | Use a regular file |
| `not-quarter-hour` | 4 | calc hours | A minute count that isn't a multiple of 15 | Record the entry in quarter-hours |
| `over-available` | 4 | calc hours | Minutes past available without an approved extra | Record the client's go-ahead as `extra_approved`, or move the work to next month |
| `config-invalid` | 4 | health | `health.yaml` outside its shape, or a URL with a user name, password or query, or a non-https URL | Fix the named line and key |
| `plan-invalid` | 4 | capture | The plan is outside its shape (§5.6) | Fix the named key or step |
| `origin-address-not-allowed` | 4 | capture | An allowed host name resolves to a loopback, unspecified or link-local (cloud-metadata) address; checked before launch | Use the test environment's real host name |
| `origin-not-allowed` | 4 | capture | A step URL outside `allowed_origins` (before launch), or the page went to another origin (the step stopped; no image) | Add the origin if it belongs to the test environment, or fix the step |
| `production-without-decision` | 4 | capture | `environment: production` without the client's decision (role and date) | Record the client's decision, or capture in the test environment |
| `secret-field` | 4 | capture | A fill that targets a password, one-time-code or similar field | Remove the step; the user signs in with `--sign-in` |
| `secret-value` | 4 | capture | A plan value that looks like a credential | Use synthetic test data |
| `not-in-shots-folder` | 4 | capture | `--out` isn't a folder named `shots` | Use `<workstream>/shots/` |
| `profile-id-invalid` | 4 | capture | The id isn't lowercase letters, digits and `-` | Use the id `--profiles` lists |
| `profile-not-found` | 4 | capture | No profile with that id | Run `--profiles` |
| `profile-in-use` | 4 | capture | Another capture run (its process id is named) is using the profile; refused before anything in it is touched, for a run and for `--delete-profile` (1.1.1, SA-021) | Wait for that run to finish |
| `profile-not-contained` | 4 | capture | The profile (or the capture folder) is a symlink or outside the data folder; nothing deleted | Remove it by hand after checking where it points |
| `navigation-failed` | 5 | capture | A page didn't load | Check the environment is up |
| `selector-not-found` | 5 | capture | Nothing matched a click, fill or wait selector | Signed out: run `--sign-in`; or fix the selector |
| `not-signed-in` | 5 | capture | The signed-in selector never appeared during `--sign-in` | Sign in within the timeout, or fix `done_selector` |
| `screenshot-size` | 5 | capture | A screenshot wasn't the plan's viewport size | Run again; report it if it repeats |
| `timeout` | 5 | capture | The run passed `--timeout` (default 110 s) | Raise `--timeout` (up to 590 s) and run it in the background (`run_in_background`) |
| `browser-exited` | 5 | capture | The browser closed during the run | Run again; check the browser starts on its own |

Usage errors are exit 2 and missing requirements exit 3 with a `missing` list, as in §4.1; neither carries a `reason`.

### 14.4 Absent-cases of the new verbs (C22)

- **digest, calc hours, export --xlsx and health** need only Node, so they are never absent where ow-tools is. pip-audit is optional inside health (`not checked (pip-audit not installed)`).
- **capture** without Chrome or Chromium: exit 3, `missing: ["browser (Chrome or Chromium)"]`.
- **export --pptx** without pandoc, `zip` or `unzip`: exit 3 naming them.
- Each caller's absent-case is in §4.2; the four the callers' designs don't state are proposed there and flagged for the caller's sprint.

### 14.5 What changed for 1.0.0 callers

- Every exit-4 JSON now has a `reason` (§14.3); messages are unchanged except that `brand.yaml` refusals no longer quote the value they reject.
- `calc date --days` returns `calendar` and `holidays_skipped` (no `skipped`), and refuses `--holidays` (F-008).
- `export` writes `export/<name>.export.json` and its outputs are 0600; the JSON adds `record` and `replaced`.
- `version --json` capabilities add `pptx`, `capture`, `xlsx`, `health`, `digest`; the hook's readiness line adds them from PATH and file checks only, within 160 characters.
- `transcribe` and `speakers --set` write 0600 through a guarded sibling; `speakers --set` runs the ignore check (SA-007); without `git` the check is exit 3 (F-005).

### 14.6 Security review

Done 2026-10-16 on `62af404f`: `docs/audits/2026-10-16-ow-tools-1.1-security-posture.md` (oc-security-auditor posture pass, Standard tier) and `docs/audits/2026-10-16-ow-tools-1.1-diff-audit.md` (oc-code-auditor diff audit). Both PASS-WITH-NOTES: no CRITICAL, no HIGH introduced by 1.1.0, three MEDIUMs (SA-010 = F-012, SA-011, SA-012 = F-013) and the LOWs listed in §8. SA-001 stays HIGH with its impact re-rated up. §8's Known residuals carry the result.

**Re-review, 2026-10-17, on `6459474a` (round 2):** the same two reports, replaced in place. Posture **PASS**, diff audit PASS-WITH-NOTES: every round-1 MEDIUM and LOW closed with a test and an independent PoC, one new LOW (SA-019 = F-025, a SIGKILLed production capture keeps its session until the next run), fixed in round 3 (§5.6, §8). Round 3 re-ran every PoC the re-review names and made each a permanent test.

**Re-check, 2026-10-17, on `e7eb221c` (round 3):** the same two reports, replaced in place. Posture **PASS** (grade A−), diff audit PASS-WITH-NOTES: every round-1 and round-2 finding closed and re-verified, SA-019 / F-025 closed, and three new LOWs (SA-020, SA-021, SA-022 = F-026, F-027, F-028; §8), each fixed in the OW-03 follow-up. Neither round-3 report quotes key material, so the round-2 `secrets` scan exception for the posture report in `.bugcheck.json` is removed, not re-pinned.

**The evaluator's rulings on the Generator's self-flagged items (round 3, all acceptable):**

| Item | Ruling | Reason |
|---|---|---|
| DNS pre-resolution is a snapshot; Chrome is pinned to one answer (the first IPv4, else the first) | Acceptable | It fails closed: a changed or dead address breaks the run and never widens access. Every answer is checked, the pin keeps the name for SNI and the certificate, and a run lasts at most 110 s by default (590 s at most). Recorded in §8 |
| IPv6 literal origins are stricter than IPv4 ones (global unicast only; private IPv4 literals are allowed) | Acceptable | Only the literal spelling is stricter: a host name whose AAAA answer is a ULA is allowed, like an RFC 1918 IPv4 answer. IPv6-literal test environments are rare, and the rule blocks the wrapped-address forms round 2 found. No owner decision needed |
| The narrowed YAML-block refusal can misfire on `---`, a short `Key: value` line, then another `---` | Acceptable | It fails safe (a refusal, never an embed); with `yaml_metadata_block` off in the readers it is a clarity layer, not the defence, and the misfire needs a thematic break followed by a setext H2 starting `Word:`. Naming the way out in the message is for the follow-up |

### 14.7 1.1.1 (OW-03 follow-ups, 2026-10-17)

The evaluator's round-3 minor defects 1–5 and 7 and the round-3 security re-check's three LOWs, each with a plant caught by a permanent test:

- **Secret fields (Bugs 1–2, SA-022):** the name rule in §5.6 is reworked: accent folding, other languages and scripts, leet forms, sent-code and N-digit-code phrases, the missed abbreviations, card, PIN, identity and recovery names; `pin`, `pass`, `token`, `routing` and `pan` count only as the field's one word or in a pair, and short stems only at a word's edge, so ordinary fields such as `lead_routing`, `passType`, `pinLocation`, `apiBanner` and `tokenCount` fill again. 43 ordinary-name controls were written before the change.
- **Killed runs (Bug 3):** SIGQUIT and an uncaught exception wipe a production session in the run, like SIGINT, SIGTERM and SIGHUP; malformed browser events are blocked, never a crash (§5.6).
- **OSV alignment (Bug 4):** a batch answer is read by position only when it has one result per query; otherwise each package is asked on its own (`POST /v1/query`, at most 50), and an advisory whose detail names other packages is attention (§5.8).
- **Metadata addresses (Bug 5):** one list, `METADATA_ADDRESSES` in `addr.mjs`, used by capture's origin and answer checks and by health (§5.6).
- **Math (Bug 7):** TeX math is off in the readers; a `$…$` no longer stops a PDF (§5.7).
- **SA-020, SA-021, SA-022:** closed (§8): host-name syntax for capture origins, a per-profile run lock (`profile-in-use`, §14.3), and the multilingual name rule.

For callers: one new refusal reason, `profile-in-use`; a field name 1.1.0 refused may now be filled (and the reverse), as listed above; nothing else changes.
