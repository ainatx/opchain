# Security Posture Report — ow-tools (Claude Code plugin), PR #597

**Date:** 2026-10-14
**Scope:** threat-model + attack-surface + privacy-claims check + supply chain (practice level; not a line-level code audit)
**Tier:** Standard (client-confidential recordings and pricing; single consultant per machine; code runs with the user's privileges)
**Assessor:** oc-security-auditor skill
**Target:** `plugins/ow-tools/` at `claude/modest-feistel-8a44b6` HEAD `0d2a23ed` (merge-base with `origin/main`: `b562955c`), read-only worktree `/Users/aidanelsesser/repos/opchain/.claude/worktrees/modest-feistel-8a44b6`. Nothing was executed from the plugin; file hashes were recomputed with `shasum`.
**Also read:** `scripts/gen-ow-tools-manifest.mjs`, `docs/plans/2026-10-09-ow-tools-design.md` (§6–§8, §12), `.github/workflows/mirror-public.yml` + `mirror/README.md` diff, `tests/ow-tools/*`, Claude Code plugin docs (marketplace-reference, loading, org, host-marketplace).

## Executive Summary

ow-tools is a small, honest plugin: Node built-ins only, nine external programs, no network code of its own, a hard offline fence around the only component that could phone home (pyannote), and privacy guards that run before any write. The 28-file SECURITY-MANIFEST matches the tree byte-for-byte, and a CI test keeps it that way. Most of design §8 and §12 is verified in code with tests behind it.

The posture risk is not in the plugin's own behaviour but in **how it reaches the machine**: the marketplace manifest is fetched from a raw GitHub URL on `main`, the plugin is cloned from a force-pushed public mirror at `ref: main` with no `sha`, and the integrity evidence (SECURITY-MANIFEST.md) travels inside the same tree, so a compromised mirror can rewrite both the code and its attestation; the plugin's SessionStart hook then runs that code with the consultant's privileges at every session start. Two trust-boundary gaps in the plugin itself deserve a fix before 1.0 ships: `ffmpeg` runs on recordings without a protocol whitelist (so "network: none at run time" and "ffmpeg reads local files only" are not actually enforced by the invocation), and the export path copies any readable file an untrusted Markdown names as an image into the client deliverable. One §8 claim is contradicted (preflight echoes document text) and two are overstated (Linux token-file "refused"; `uv run` can still sync the venv).

**Top recommendation:** pin the distribution (release tag + `sha`, or an `archive` source with `sha256`) and publish the manifest hash out-of-band; add `-protocol_whitelist file` to the ffmpeg call; contain export image paths the way `brand.mjs` already contains the logo.

**Counts:** CRITICAL 0 · HIGH 1 · MEDIUM 3 · LOW 5 (9 findings).

## Risk Heatmap

| Category | Risk | Key finding |
|---|---|---|
| Distribution / supply chain | 🔴 HIGH | No integrity anchor between the mirror and the consultant's machine (SA-001) |
| Untrusted media → native parsers | 🟡 MEDIUM | ffmpeg without `-protocol_whitelist`; crafted "recording" can reach the network or read other local files (SA-002) |
| Untrusted Markdown → client deliverable | 🟡 MEDIUM | Image path not contained; any readable file can be embedded in the .docx (SA-003) |
| Model provenance | 🟡 MEDIUM | pyannote fetch has no `revision`/hash pin; Whisper run-time check is size-only (SA-004) |
| Credential handling (HF token) | 🟢 LOW | Never read, printed or passed by ow-tools; Linux "refused unless 0600" is overstated (claims table) |
| Data-at-rest hygiene (git-ignore, temp) | 🟢 LOW | Guards verified; `speakers` rewrite skips the ignore check (SA-007) |
| Prompt-injection channels (hook, transcript) | 🟢 LOW | Data wrappers, caps and `<>` neutralisation verified by tests; bidi residue (SA-008) |
| Detection / repudiation | 🟢 LOW | No record of which export went to the client; silent overwrite (SA-007) |

---

## Pillar 1: Threat Model

### Assets and classification

| Asset | Class | Where it lives | Who may touch it |
|---|---|---|---|
| Call recordings (`<ws>/audio/*`) | RESTRICTED (client-confidential, possibly recorded under consent terms) | user's workspace, gitignore-gated | ffmpeg, whisper-cli (tmp WAV), sha256 |
| `transcript.json` / `.md` | RESTRICTED | `<ws>/` gitignore-gated | ow-tools, ow- skills, Claude context (samples) |
| Hugging Face read token | RESTRICTED (credential) | macOS keychain `ow-tools-huggingface` / `~/.config/ow-tools/hf-token` | user's shell only (`--fetch`) |
| Internal pricing/margin notes | CONFIDENTIAL | Markdown inside `<!-- ow:internal -->` | preflight strips before export |
| `opchain-work/` (STATUS.md, intake, brand.yaml, profile.md) | INTERNAL–CONFIDENTIAL | user's repo | hook reads STATUS.md; export reads brand.yaml |
| Plugin code + `uv.lock` | INTEGRITY-critical | `~/.claude/plugins/cache/opchain-work-tools/ow-tools/1.0.0/` | Claude Code installer; SessionStart hook |

### Adversaries (tailored)

| Actor | Motivation | Capability | STRIDE |
|---|---|---|---|
| Hostile call participant / client | Steer the consultant's AI; exfiltrate consultant data | Says things that end up in transcript → Markdown → STATUS.md; may hand over a crafted recording file | T, I, E |
| Upstream/mirror compromise (MIRROR_TOKEN, `asfbay-bit` account, `ainatx/opchain` main, raw.githubusercontent.com) | Mass code execution on consultant Macs | Rewrites `plugins/ow-tools/**` and its manifest; ships at next install/update | T, E, I |
| Package/model registry compromise (PyPI, huggingface.co) | Code execution in the diarization venv | Replaces a wheel (defeated by lock hashes) or a model snapshot (no pin) | T, E |
| Local opportunist (other account on the Mac) | Read recordings during a run | Reads `/tmp` (defeated by 0700), keychain (macOS ACL) | I |
| The assistant itself (prompt-injected) | — | Writes Markdown/args that the plugin then executes against (image paths, `--out`, `--banner`) | T, I |

### Trust boundaries

```
 [client speech] ──recording──▶ ffmpeg ──WAV(tmp 0700)──▶ whisper-cli ──json──▶ merge.mjs
                                  │ (B1: untrusted bytes → native parser; network protocols compiled in)
                                  └─▶ uv run diarize.py  (B2: Python venv from uv.lock; HF_HUB_OFFLINE=1, token deleted)
 transcript.md ──▶ ow- skill (Claude) ──Markdown──▶ preflight ──▶ pandoc ──▶ typst/zip ──▶ export/*.pdf|docx ──▶ CLIENT
                     (B3: client words become model instructions?)  (B4: Markdown names files; brand.yaml user-authored)
 STATUS.md (skill-written, client names) ──▶ hook ──stdout──▶ Claude context at every SessionStart   (B5)
 raw.githubusercontent.com/…/marketplace.json ──▶ git clone asfbay-bit/opchain-skills@main:plugins/ow-tools ──▶ ~/.claude/plugins/cache ──▶ hooks.json runs   (B6: distribution)
 keychain ──user shell──▶ HF_TOKEN env of user-run `uv run … --fetch` ──▶ huggingface.co   (B7: setup only)
```

### STRIDE table

Severity uses the skill's matrix (likelihood × impact). "Mitigation" cites the code that exists today.

| Part | S | T | R | I | D | E |
|---|---|---|---|---|---|---|
| **transcribe** (`lib/transcribe.mjs`, `lib/guards.mjs`, `python/diarize.py`) | Crafted `transcript.json` with `ow_artefact` header is accepted as ow-tools output (`transcribe.mjs:231`) — LOW, user-local | Crafted recording bytes hit ffmpeg/whisper.cpp demuxers; **no `-protocol_whitelist`** so an HLS/concat/subfile "recording" can pull other local files or reach HTTP (`transcribe.mjs:106`; ffmpeg build has http/https/tcp/udp/rtmp/ftp/concat/subfile) — **MEDIUM (SA-002)**. Lock-pinned venv (`uv run --frozen`, 117 pkgs, all pypi.org + sha256) — mitigated | No log of runs; `--force` overwrites a prior transcript (`:94-96`) — LOW, by design | Temp WAV + whisper JSON in 0700 mkdtemp, removed in `finally` (`guards.mjs:75-81`) — mitigated; samples of client speech go to stdout → model context (`:183`) — by design; `oneLine()` caps tool stderr to last 200-char line (`core.mjs:109-116`) — mitigated | Hours-long media → hours of CPU; no cap on duration; `--speakers` ≤ 20, `maxBuffer` 256 MB — LOW, local | Token can't reach the run: `HF_TOKEN`/`HUGGING_FACE_HUB_TOKEN` deleted (`transcribe.mjs:126`) and popped again (`diarize.py:64-66`); `HF_HUB_OFFLINE=1` enforced or exit 4 (`diarize.py:63`) — mitigated. Writes refused unless git-ignored (`guards.mjs:46-72`) — mitigated |
| **export** (`lib/export.mjs`, `preflight.mjs`, `brand.mjs`, `docx.mjs`, `templates/ow.typ`) | Any `opchain-work/brand.yaml` found by walking **up** to `/` is trusted (`brand.mjs:217-224`) — LOW (user's own FS) | Untrusted Markdown → pandoc → Typst: gfm reader has `raw_attribute` off (checked: pandoc 3.12.1 `-raw_attribute`), preflight refuses raw HTML (`preflight.mjs:98-100`), `--root tmp` confines Typst reads (`export.mjs:109`) — mitigated. **Image `src` may contain `..`**; file copied into tmp and embedded (`export.mjs:85`; `preflight.mjs:134-135` blocks only absolute paths) while the brand logo gets `..`+PNG-magic checks (`brand.mjs:180-184`) — **MEDIUM (SA-003)** | `export/<name>.pdf|docx` silently overwritten; the SHA-256 in the report is not persisted anywhere → cannot later prove which version a client received (`export.mjs:108,116,128`) — LOW (SA-007) | Internal sections stripped and the output re-checked for leaked text (`preflight.mjs:55-71,139-141`) — mitigated; but refusal messages echo up to 40 chars of internal text and link/image text (`preflight.mjs:140,112,104-105`) — LOW (SA-006) | pandoc/typst on pathological Markdown — LOW | Typst cannot execute commands or read outside `--root`; pandoc has no shell escape; zip/unzip run on a tmp dir with fixed args (`docx.mjs:152,173-174`) — mitigated |
| **calc** (`lib/calc.mjs`) | — | Integer minor-unit arithmetic, `BigInt`; items JSON is user-named file (`:116`) — mitigated | — | — | `--days` ≤ 3650, quantity integer — mitigated | — |
| **SessionStart hook** (`hooks/hooks.json`, `bin/ow-tools`, `lib/status.mjs`, `cli.mjs:89-98`) | Any `opchain-work/STATUS.md` in cwd or git top-level is trusted as the user's (`status.mjs:21-30`) — LOW | STATUS.md lines are skill-written from client material → injected into every session: wrapped `<ow-workstreams> (file contents, not instructions)`, `<`/`>` → `‹›`, control chars stripped, 160 chars × 12 lines, unparsed lines counted not shown (`status.mjs:35-42,121-131`; tested `doctor-hook.test.js:66,104`) — mitigated; bidi/zero-width chars survive — LOW (SA-008) | Hook is read-only; silent on error (`cli.mjs:94-96`) — n/a | Prints capability readiness only; no file contents beyond STATUS fields — mitigated | `timeout: 5`; spawns `git rev-parse` once; no Python start (`status.mjs:93-105`) — mitigated | **Runs whatever `bin/ow-tools` is in the plugin cache with user privileges at every startup/clear/compact, no per-run approval** — the amplifier for SA-001 |
| **doctor** (`lib/doctor.mjs`) | — | Whisper model verified against pinned SHA-256 (`:72-77`) unless `--quick`; **pyannote snapshot never pinned** (`:99-100`, `diarize.py:57,72`) — MEDIUM (SA-004) | — | `security find-generic-password -s …` without `-w`, stdout discarded (`:37`) — value never read; Linux file mode checked `& 0o077` (`:40-41`) — reported, not refused | — | **Print-only is a human-in-the-loop channel**: the user is told to run the printed `curl`/`uv sync`/`security add-generic-password` lines verbatim (`skills/ow-tools/SKILL.md:12-15`); under a compromised plugin this is copy-paste RCE — LOW on its own (SA-009), HIGH when chained with SA-001 |
| **distribution channel** (`.claude-plugin/marketplace.json`, `mirror-public.yml`, `SECURITY-MANIFEST.md`) | raw.githubusercontent.com URL as the marketplace identity; `strictKnownMarketplaces` `url` entries match the URL string only (docs) — content under that URL is unauthenticated beyond TLS | `ref: main`, no `sha` (`marketplace.json:16-20`; `plugin-shape.test.js:43` asserts `sha` is absent); mirror is a single-commit force-push by a bot PAT (`mirror-public.yml:89-95`); manifest regenerated by the same tree — **HIGH (SA-001)** | Mirror history is reset every sync, so there is no durable record of what was served when; `Mirror from ainatx/opchain@<sha>` is the only breadcrumb | — | Mirror outage ⇒ install fails; cached copy keeps working (docs) | A shipped change to `hooks.json` or `bin/ow-tools` executes on every consultant Mac at next session start after update; auto-update is **off by default** for third-party marketplaces (docs) — partial mitigation |

### Data-flow traces (RESTRICTED types)

**Recording → transcript.** Ingress: user-named path, must sit in `audio/` (`guards.mjs:15-31`). Validation: existence + folder rule only; no media sniffing. Processing: ffmpeg (no protocol whitelist) → 0700 tmp WAV → whisper-cli (local model, size-checked at run time, SHA only in doctor) → `uv run --frozen` Python with offline env → merge. Storage: `transcript.json`/`.md` written atomically into a path `git check-ignore` approves (`transcribe.mjs:93`, `:66-69`). Egress: two sample lines per speaker on stdout (by design, for role confirmation). Gaps: B1 (SA-002); run-time model integrity (SA-004).

**HF token.** Ingress: user types it into the keychain. Use: only the user-run `--fetch` command reads it (`doctor.mjs:48-50` prints the command; `diarize.py:52-58` reads `HF_TOKEN` from env, prints model + HF_HOME only). Transcription run: deleted from env twice; `HF_HOME` is redirected to the data dir so the default `~/.cache/huggingface/token` is never consulted. Gaps: none in ow-tools; residual is operational (the user must not run the printed `--fetch` line through the Bash tool — `skills/ow-tools/SKILL.md:14` forbids it).

**Internal pricing → client export.** `<!-- ow:internal -->` … `<!-- ow:end-internal -->` blanked line-by-line, unbalanced markers refuse, removed text re-searched in the body (`preflight.mjs:55-71,139-141`); `removed_internal_sections` count reported. Gaps: refusal messages quote up to 40 chars of removed text to stdout (SA-006); a marker inside a fenced code block is not recognised as a marker (fence handling starts at `:77`, markers are processed earlier at `:57` so this is actually fine — markers are stripped regardless of fences). No gap in stripping itself.

**STATUS.md → model context.** See hook row; mitigations verified by `doctor-hook.test.js:60-105`.

---

## Attack Surface Map — ow-tools

### Entry points (CLI verbs, hook)

| Entry | Trigger | Untrusted input | Reaches a shell? | Reaches a template engine? | Writes FS |
|---|---|---|---|---|---|
| `ow-tools hook session-start` | Claude Code SessionStart (`startup|clear|compact`) | `opchain-work/STATUS.md` lines; stdin JSON `cwd` | `git -C <cwd> rev-parse` via `spawnSync` (no shell) | no | none |
| `ow-tools transcribe <path>` | ow- skill / user | recording bytes; `--out`, `--banner`, `--language` | ffmpeg, whisper-cli, uv (argv arrays, no shell; `-l` and `--banner` regex-validated `transcribe.mjs:81,87`) | no | `<out>/transcript.{json,md}`, 0700 tmp |
| `ow-tools speakers <json> --set` | skill / user | `transcript.json` content; roles (regex `:209`, no `<>|`) | no | no | rewrites both transcript files (**no ignore re-check**) |
| `ow-tools export <md>` | skill / user | Markdown body, image paths, title/banner; `brand.yaml`; logo PNG | pandoc, typst, zip, unzip (argv arrays; `cwd` = tmp) | **Typst** (`brand.typ` values escaped by `typstString` `export.mjs:16`; body from pandoc) and **WordprocessingML** (`xmlEscape` `docx.mjs:8-9`) | `export/<name>.pdf|docx` (overwrite), tmp |
| `ow-tools calc …` | skill / user | arguments; items JSON file | no | no | none |
| `ow-tools doctor|version` | skill / user | PATH, data dir | `security`, each tool `--version`, `typst fonts` | no | none |
| `bin/ow-tools` | all of the above; on the Bash tool PATH | `$1` | `exec node …/lib/cli.mjs` | — | — |

### Where untrusted content touches something dangerous

| Boundary | Code | Status |
|---|---|---|
| Recording bytes → ffmpeg demuxers with network protocols available | `transcribe.mjs:106` | **gap** (SA-002) |
| Markdown image `src` (relative, may contain `..`) → `copyFileSync` → pandoc/Typst | `export.mjs:85`, `preflight.mjs:134-135` | **gap** (SA-003) |
| Markdown → Typst source | pandoc gfm (`raw_attribute` off), `--root tmp`, raw HTML refused | ok |
| brand.yaml → Typst/XML | strict single-shape parser (`brand.mjs:94-136`), `typstString`/`xmlEscape`, font/colour/lang regexes (`:165-178`), logo `..`+magic (`:180-184`) | ok |
| STATUS.md → model context | wrapper + `clean()` + caps | ok (bidi residue) |
| transcript text → `transcript.md` | one line per segment, data sentence, roles can't contain `<>|` | ok |
| `--banner`, title → Typst string / XML | escaped; banner ≤ 200 chars no control chars | ok |
| `--out`, `--brand`, `--items` paths | user/skill-chosen; `--out` gated by `assertIgnored` for transcribe only | ok for transcribe; export `--out` unguarded (exports are intended deliverables) |

### External programs (all via `spawnSync(cmd, argv)`, no shell; `core.mjs:98-105`)

ffmpeg · whisper-cli · uv (→ python/diarize.py) · pandoc · typst · zip · unzip · git · security (macOS). Resolved from the Bash tool's `PATH` by `which()` (`core.mjs:84-96`) for readiness, then by `spawnSync` for execution. No `brew`, `curl`, `sudo`, `uv sync` anywhere in `lib/` (grep of `run("…")` targets; `doctor-hook.test.js:19-21` stubs assert never called).

### Data stores

| Store | Content | Protection |
|---|---|---|
| `~/.local/share/ow-tools/{models,hf,venv-<lockhash>}` (or `$OW_TOOLS_HOME`) | Whisper ggml (SHA pinned in `core.mjs:41-52`), HF snapshot (unpinned), venv | user home perms; outside every repo |
| `<ws>/transcript.*`, `<ws>/audio/*` | RESTRICTED | must be git-ignored; otherwise exit 4 with the two lines to add |
| `/tmp/ow-tools-*` | WAV, whisper JSON, turns JSON, docx parts | 0700, removed in `finally` |
| keychain `ow-tools-huggingface` | HF token | macOS keychain; presence-only check |
| `~/.claude/plugins/cache/opchain-work-tools/ow-tools/<version>/` | the code | Claude Code; replaced on update |

---

## Privacy-claims check (design §8, §12, SECURITY-MANIFEST.md)

Status: **VERIFIED** (code does what the claim says, with the cited lines) · **NOT VERIFIED** (claim overstated or not enforced by code) · **CONTRADICTED** (code does the opposite) · N/A (not built).

### Design §8 — Privacy rules

| # | Claim | Status | Evidence |
|---|---|---|---|
| 8.1a | Audio stays local: no upload anywhere; no telemetry, no update check | VERIFIED | no `node:http/https/net/dns`, `fetch(` or URL other than doc strings in `lib/*` (grep); `cli.mjs:26` |
| 8.1b | Diarization runs offline with no token in its environment | VERIFIED | `transcribe.mjs:125-136` (`UV_OFFLINE`, `HF_HUB_OFFLINE`, `TRANSFORMERS_OFFLINE`, `HF_DATASETS_OFFLINE`, `HF_HUB_DISABLE_TELEMETRY`; token keys deleted); `diarize.py:63-66` refuses without `HF_HUB_OFFLINE=1`; `transcribe-cli.test.js:72,109-115` |
| 8.1c | "whisper.cpp and ffmpeg read local files only" | **NOT VERIFIED** | whisper-cli reads only the tmp WAV (`transcribe.mjs:118`) — fine. ffmpeg is given the user's file with no `-protocol_whitelist` (`:106`); ffmpeg probes content, not extension, and this build exposes `http,https,tcp,udp,rtmp,ftp,concat,subfile`. "Local files only" is a property of the input, not of the invocation. → SA-002 |
| 8.2 | Recordings live under `audio/`; `transcribe` refuses otherwise (exit 4) | VERIFIED | `guards.mjs:15-31` |
| 8.3 | Before writing, `git check-ignore` must pass for recording and both transcript files; never edits `.gitignore` | VERIFIED (transcribe) / **NOT VERIFIED** (speakers) | `guards.mjs:46-72`, `transcribe.mjs:93`; no write to `.gitignore` anywhere. `speakers --set` rewrites `transcript.*` via `writeTranscript` (`transcribe.mjs:232-235`) without `assertIgnored` → SA-007 |
| 8.4 | Temp copies don't linger: 0700 temp folder removed in a `finally` | VERIFIED | `guards.mjs:75-81` (`mkdtempSync` creates 0o700); `transcribe-cli.test.js:109,182`. Residual: SIGKILL/hook-timeout skips `finally` |
| 8.5a | The token is never written by ow-tools; read only in the setup fetch; never printed; never passed to the transcription run | VERIFIED | ow-tools Node code never reads it (`doctor.mjs:36-37` presence only, no `-w`); `diarize.py:52-58` reads `HF_TOKEN` from env only under `--fetch` and prints model + `HF_HOME` only; `transcribe.mjs:126`; `doctor-hook.test.js:42` |
| 8.5b | Linux: `~/.config/ow-tools/hf-token`, "refused unless mode 0600" | **NOT VERIFIED** | `doctor.mjs:40-41` only *reports* "not stored" when group/other bits are set; the printed fetch command `cat ~/.config/ow-tools/hf-token` (`:50`) reads it regardless of mode. Reported ≠ refused |
| 8.6 | Credentials never in files; "the export preflight doesn't print document text, only line numbers" | **CONTRADICTED** (second half) | `preflight.mjs:140` prints up to 40 chars of *removed internal text*; `:112` prints link text; `:104-105,118` print image `src`. Goes to stdout/Claude context only (low impact) → SA-006. First half holds: no output path contains a credential (`oneLine` caps stderr, `core.mjs:109-116`) |
| 8.7 | Redacted scanning only (§5.5) | N/A | scan-secrets not built in this PR (design §2 #16 "Waits") |
| 8.8 | No private names: a test fails on `llc-ops`, out-of-family skill names, "Deftwright" | VERIFIED | `plugin-shape.test.js:88-94` (`/llc-ops|deftwright/i`, `/\boc-[a-z]+…/`) |
| 8.9 | Files are data: transcripts carry the data sentence; hook wraps STATUS.md as data and strips control characters | VERIFIED | `render.mjs:3-4,47`; `status.mjs:35-42,121,131`; `doctor-hook.test.js:66,87,104` |

### Design §12 — What ow-tools never does

| Claim | Status | Evidence |
|---|---|---|
| Installs a system package or runs `sudo` | VERIFIED (with caveat) | `run()` targets: ffmpeg, git, pandoc, security, typst, unzip, uv, whisper-cli, zip only. Caveat: `uv run --frozen` (`transcribe.mjs:137`) without `--no-sync` will sync the private venv from uv's local cache if it drifts from `uv.lock` — not a *system* package, but it is an install ow-tools performs → SA-005 |
| Sends audio, a transcript or document text anywhere | VERIFIED (ow-tools, Python, Typst, pandoc) / **NOT VERIFIED** (ffmpeg) | Python offline env enforced; Typst can only fetch `@preview` packages on an explicit import, which pandoc's escaped output cannot produce (gfm `raw_attribute` off; raw HTML refused `preflight.mjs:98-100`); remote images refused (`:105`). ffmpeg: see 8.1c |
| Edits `.gitignore`, `STATUS.md`, `profile.md`, `brand.yaml` or any file an ow- skill writes | VERIFIED | write sites are exactly: `transcribe.mjs:66-76` (transcript.*), `export.mjs:73-103` (tmp + `export/`), `docx.mjs:150-175` (tmp + the docx it is building) |
| Stores, prints or logs a credential or a secret match | VERIFIED | `doctor.mjs:36-37,48-50` (prints the *command*, never the value); `cli.mjs:26`; `transcribe-cli.test.js:72`. Note `core.mjs:107` comment says "first line" but `:114` returns the *last* non-empty stderr line (≤ 200 chars) — behaviour is fine, comment is wrong |
| Scans a working tree or opens a `.env` file | VERIFIED | no scan code shipped |
| Deletes a user file (only its own temp files) | VERIFIED (with caveat) | `rmSync` sites: `guards.mjs:80` (tmp), `docx.mjs:150` (tmp), `docx.mjs:171` (the docx pandoc just wrote, before re-zipping). Caveat: `export` *overwrites* an existing `export/<name>.pdf|docx` without `--force` (`export.mjs:108-110,116`) → SA-007 |
| Guesses who a speaker is | VERIFIED | roles start `null` (`merge.mjs:119`), set only from `--set` (`transcribe.mjs:211-224`), rendered "not yet confirmed" (`render.mjs:43`) |
| Claims accessibility conformance, a verified signature or an approval | VERIFIED | `export.mjs:10-12,143-145`; gate-word test `plugin-shape.test.js:96-100` |

### SECURITY-MANIFEST.md

| Section / claim | Status | Evidence |
|---|---|---|
| "Runs code: Yes … built-in modules only; no npm dependencies, so Claude Code runs no npm install" | VERIFIED | all imports `node:`/`./` (grep; `plugin-shape.test.js:52-61`); no `package.json` |
| "SessionStart hook … reads `opchain-work/STATUS.md` and writes nothing" | VERIFIED | `status.mjs:107-133` |
| Programs table (ffmpeg, whisper-cli, `uv run --frozen` → diarize.py, pandoc, `typst compile --pdf-standard ua-1`, zip/unzip, `git rev-parse`/`check-ignore`, `security find-generic-password` (no `-w`), `typst fonts` + `--version`s) | VERIFIED | matches the full set of `run()` targets and args (`transcribe.mjs:106,118,137`; `export.mjs:46,91,109,116`; `docx.mjs:152,173-174`; `guards.mjs:52,58`; `status.mjs:23`; `doctor.mjs:37,65-107`). Omitted: `node` itself (`bin/ow-tools:13`) |
| "`uv run … with HF_HUB_OFFLINE=1, UV_OFFLINE=1 and no token in its environment`" | VERIFIED | `transcribe.mjs:125-136` |
| "It never runs `brew`, `apt`, `sudo`, `uv sync`, `curl` or a model download" | VERIFIED (literal) | `doctor-hook.test.js:19-21`. Nuance: `uv run` may perform an implicit environment sync (SA-005) |
| "Network: **None at run time**" | **NOT VERIFIED** (ffmpeg) / VERIFIED (everything else) | see 8.1c and §12 row 2 |
| Files-it-writes table | VERIFIED | plus `transcript.json.tmp-<pid>`/`.md.tmp-<pid>` atomic temps in the workstream folder (`transcribe.mjs:67-69`) and the `speakers` rewrite |
| "A private (0700) temp folder, removed when the run ends" | VERIFIED | `guards.mjs:75-81` |
| File table (28 files + SHA-256) | VERIFIED | every row's digest matches `shasum -a 256` of the worktree file; `scripts/gen-ow-tools-manifest.mjs --check` runs in CI (`plugin-shape.test.js:102-105`). **Caveat:** the manifest is self-attested — it ships inside the tree it attests and is regenerated by whoever controls that tree (SA-001) |

### Design §7 (marketplace) claims

| Claim | Status | Evidence |
|---|---|---|
| Own manifest lists ow-tools only; never in the dev marketplace | VERIFIED | `marketplace.json:12-31`; root `.claude-plugin/marketplace.json` has no `ow-tools` (grep); `plugin-shape.test.js:34-50` |
| `git-subdir` source, mirror, `plugins/ow-tools`, `ref: main`, "no pinned SHA (the mirror force-pushes each sync)" | VERIFIED as described — and that is the problem | `marketplace.json:16-20`; `plugin-shape.test.js:43` asserts `sha` undefined. Claude Code *does* support `sha` on `git-subdir` ("full 40-character lowercase commit SHA … succeeds … as long as the commit is still reachable") — the mirror's force-push is what makes it unusable → SA-001 |
| Admin approval: that URL in `strictKnownMarketplaces` "approves ow-tools and nothing else" | VERIFIED (scope) / NOT an integrity control | Docs: a `url` allowlist entry matches on the URL string; the allowlist "doesn't restrict entries inside an allowed marketplace" and verifies nothing about content. Approving the URL approves whatever `main` serves tomorrow |
| Mirror workflow gains the required-files check | VERIFIED | `mirror-public.yml:40-41` (diff vs `origin/main`), `plugin-shape.test.js:107-112` |

---

## Pillar 2: Supply chain

### How the plugin reaches a machine

1. `/plugin marketplace add https://raw.githubusercontent.com/asfbay-bit/opchain-skills/main/plugins/ow-tools/.claude-plugin/marketplace.json` — a `url` marketplace source. Claude Code downloads only that JSON (TLS to GitHub; 5 MiB/10 s limits). Nothing signs it. The URL names `main`, so the catalog is whatever the mirror's `main` holds at fetch time.
2. `/plugin install ow-tools@opchain-work-tools` — refreshes the catalog, then does a partial/sparse `git clone https://github.com/asfbay-bit/opchain-skills.git` at `ref: main`, path `plugins/ow-tools`, copies it to `~/.claude/plugins/cache/opchain-work-tools/ow-tools/1.0.0/` (version = `plugin.json.version`, which **pins** the computed version). No `sha`. No signature. The clone uses the user's git; a user without GitHub SSH should set `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` (not documented in README).
3. **Updates:** auto-update is **off by default** for third-party marketplaces (docs: "off for every other marketplace"); users get new code only via `/plugin marketplace update` + `claude plugin update`, or after toggling auto-update. Because `version` is pinned, a mirror change without a `version` bump is *not* picked up — a small accidental brake on a compromised mirror, which an attacker who controls the tree can trivially release.
4. **The mirror itself:** `.github/workflows/mirror-public.yml` runs on every push to `ainatx/opchain` `main` touching `plugins/**` etc., assembles a staging tree, and `git push --force origin main` with `MIRROR_TOKEN` (fine-grained PAT, `contents:write` on the one repo). History is reset to one commit each time; **no tags are pushed**, so nothing in the public repo is ever stable or pinnable. Protected `main` upstream + PR-gated CI is the real gate; the mirror is a dumb pipe.

### Python lockfile

`python/uv.lock`: 117 packages, **all** `source = { registry = "https://pypi.org/simple" }` (116 + the virtual root), every sdist/wheel carries a `sha256`, hosts are only `pypi.org` and `files.pythonhosted.org`, no `git+`/`url`/`path` sources. `requires-python = "==3.12.*"`; uv fetches python-build-standalone on `uv sync` (uv verifies against its embedded checksums). Key pins: `pyannote-audio 4.0.7`, `torch 2.14.1`, `torchaudio 2.11.0`, `huggingface-hub 2.2.0`, `lightning 2.6.6`, `safetensors 0.8.0`. The venv directory is keyed by the lock hash (`core.mjs:59-60`), so a changed lock shows up in `doctor` as "not built for this plugin version" and the user must run the printed `uv sync --frozen` — a human checkpoint, but the human sees only "run this", not what changed in the lock. At run time `uv run --frozen` is executed with `UV_OFFLINE=1` (`transcribe.mjs:129,137`) but without `--no-sync`.

### Models

- Whisper `ggml-large-v3-turbo.bin`: URL on `huggingface.co/ggerganov/whisper.cpp/resolve/main/…` (`core.mjs:53`), size + SHA-256 pinned (`core.mjs:41-52`); `doctor` verifies the hash (`doctor.mjs:72-77`); **`transcribe` checks size only** (`transcribe.mjs:45`). ggml is not a pickle format.
- pyannote `speaker-diarization-community-1`: gated repo (`config.yaml`, `embedding/`, `plda/`, `segmentation/`); fetched by the user with their token via `Pipeline.from_pretrained(model, token=token)` with **no `revision`** (`diarize.py:57`) and loaded offline with no snapshot pin (`:72`). Whether the weights are pickle-based decides whether a compromised HF repo is RCE at fetch time or "only" a bad model; the plugin pins nothing either way.

### What a compromised mirror (or MIRROR_TOKEN, or `asfbay-bit`) could ship

| Ships | Effect | When it lands |
|---|---|---|
| Modified `hooks/hooks.json` or `bin/ow-tools`/`lib/*.mjs` | Arbitrary command as the consultant at every SessionStart (`startup|clear|compact`), or exfiltration of recordings/transcripts whenever `transcribe`/`export` runs (the data sentence and offline flags are *in* the code being replaced) | First install: immediately. Existing installs: after a `version` bump and a manual update (or auto-update if the user enabled it) |
| Modified `python/uv.lock` (+ `pyproject.toml`) | A malicious PyPI package installed into the venv by the user-run `uv sync --frozen` that `doctor` prints; then executed on every transcription | Same, plus the user running the printed command |
| Modified `doctor.mjs` printed fixes | Copy-paste RCE (`curl … | sh`) — `skills/ow-tools/SKILL.md:12` says show doctor output "as it is" and step 3 has the user run the fixes | Same |
| Regenerated `SECURITY-MANIFEST.md` | The attestation matches the malicious tree; a reviewer comparing manifest↔tree sees "clean" | Same |
| Modified `marketplace.json` | Point `source` at another repo/ref | At the next catalog refresh |

Mitigations that exist today: upstream `main` is protected and PR-gated (CI runs the manifest drift check); `plugin.json.version` pin; auto-update off by default; the marketplace lists one plugin; README/plugin description say "runs code on your machine". Mitigations that do **not** exist: any pin or signature a consumer could check; any out-of-band copy of the manifest hash; any mirror artefact that survives the next force-push.

---

## Pillar 3: Findings

### [SA-001] Distribution channel has no integrity anchor; SessionStart hook amplifies it

**Pillar:** Threat Model · **Risk:** HIGH · **Category:** T, E (OWASP A08 Software and Data Integrity) · **Scope:** `plugins/ow-tools/.claude-plugin/marketplace.json:16-20`, `.github/workflows/mirror-public.yml:89-95`, `plugins/ow-tools/SECURITY-MANIFEST.md`, `hooks/hooks.json:9`, `tests/ow-tools/plugin-shape.test.js:43` · **Fix effort:** M

**Problem:** The marketplace is a raw-URL fetch of `main`; the plugin is a `git-subdir` clone of a force-pushed mirror at `ref: main` with `sha` deliberately absent (the test asserts it); the only integrity artefact (SECURITY-MANIFEST.md) is produced by, and travels with, the tree it describes. Whoever controls `MIRROR_TOKEN`, the `asfbay-bit` account, or upstream `main` can ship code that runs at every session start on every consultant's Mac with no further approval, and can regenerate the manifest so a diligent reviewer still sees a match. Worst case: silent exfiltration of every client recording and transcript, plus the keychain-held HF token if the printed `--fetch` line is ever run through the Bash tool.

**Remediation (pick the strongest the release process can carry):**
1. **Pin what Claude Code can verify.** Preferred: switch the entry to an `archive` source with `sha256` — Claude Code "refuses a download that doesn't match" — publishing `ow-tools-<version>.zip` as a GitHub Release asset on the public repo from the release workflow (needs Claude Code ≥ 2.1.224; document the floor). Alternative: have `mirror-public.yml` push a tag per release (`ow-tools-v<version>`) alongside `main` (tags survive the `main` force-push and keep the commit reachable), and set both `ref: "ow-tools-v1.0.0"` and `sha: "<40-hex>"` in `marketplace.json`; bump both in the release PR. Flip `plugin-shape.test.js:43` to assert the pin is *present* and 40 lowercase hex.
2. **Publish the manifest out-of-band.** Put the SHA-256 of `SECURITY-MANIFEST.md` (or the manifest itself) in the signed release tag message on `ainatx/opchain` and on `opchain.dev/install` (or `/changelog`), so an administrator can compare without trusting the mirror.
3. **Tell users what an update means.** README "Install": updates are new code; re-review `SECURITY-MANIFEST.md` diff before `claude plugin update`; recommend leaving auto-update off for this marketplace; mention `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` for machines without GitHub SSH.
4. **Harden the pipe.** Rotate `MIRROR_TOKEN` on a schedule; consider a deploy key limited to the mirror repo; add a post-push verification step that re-clones the mirror and diffs `plugins/ow-tools` against the staged tree.

**Verification:** `claude plugin install ow-tools@opchain-work-tools` from a clean machine resolves to the pinned sha/sha256; tampering with the mirror's `main` (test fork) fails the install; the published manifest hash equals `shasum -a 256 SECURITY-MANIFEST.md` of the installed cache dir.

### [SA-002] ffmpeg runs on untrusted recordings without a protocol whitelist

**Pillar:** Threat Model · **Risk:** MEDIUM (HIGH if recordings are ever accepted from clients or third parties) · **Category:** T, I (A03 Injection / SSRF-class) · **Scope:** `plugins/ow-tools/lib/transcribe.mjs:106`; design §8 row 1, SECURITY-MANIFEST "Network: None at run time" · **Fix effort:** S

**Problem:** ffmpeg selects the demuxer from the file's *content*, not its extension. A file named `call.m4a` that is really an HLS/concat/subfile playlist makes ffmpeg open other local files and/or HTTP(S)/TCP/UDP/RTMP endpoints — this build has all of them compiled in. That is the classic ffmpeg "local file read + remote send" CVE class and it defeats "network: none at run time" and "ffmpeg reads local files only" by construction, not by code. The fit-call recording is normally the consultant's own Meet download (low likelihood); workshop/demo recordings shared by a client raise it.

**Remediation:** Leave demuxer selection alone but fence the protocols: insert `"-protocol_whitelist", "file"` before `-i` in `transcribe.mjs:106` (ffmpeg needs only the `file` protocol to read a local recording and write the local WAV). Update design §8 row 1 and SECURITY-MANIFEST "Network" to say the whitelist is set. Add a stub-ffmpeg test asserting the flag is present (pattern: `transcribe-cli.test.js:109-115`).

**Verification:** Transcribe a local `.m3u8` renamed `.m4a` that references `http://127.0.0.1:9/x.ts` — ffmpeg must fail with "Protocol 'http' not on whitelist" and exit 5; no connection attempt observed.

### [SA-003] Export copies any readable file named as a Markdown image into the client deliverable

**Pillar:** Threat Model · **Risk:** MEDIUM · **Category:** I, T (A01 Broken Access Control / path traversal) · **Scope:** `plugins/ow-tools/lib/export.mjs:84-87`, `lib/preflight.mjs:102-107,132-136` · **Fix effort:** S

**Problem:** Preflight rejects absolute image paths and remote URLs but not `..`; `export.mjs:85` then `copyFileSync(resolve(dirname(src), decodeURI(img.src)), tmp/assets/img-N<ext>)` where `<ext>` defaults to `.png`. The Markdown is written by the ow- skill from client-supplied material (an injection boundary the design itself names), so `![logo](../../../.ssh/id_rsa)` can carry a key into `word/media/image1.png` of a .docx that is then sent to the client. With the default `pdf,docx` Typst fails to decode a non-image and aborts the whole export (accidental protection); with `--formats docx` it ships. `brand.mjs:180-184` already does the right thing for the logo (`..` refused, PNG magic checked) — the Markdown path was simply not given the same treatment.

**Remediation:** In `preflight.mjs` (or `export.mjs` before the copy): resolve with `realpathSync`, require the result to be inside `dirname(src)` or the nearest `opchain-work/` root, refuse `..` segments, and check the magic bytes (PNG `89504e47…`, JPEG `ffd8ff`, maybe SVG by sniffing `<svg`) — refuse otherwise with the line number. Derive the neutral extension from the detected type, not from the source name.

**Verification:** A fixture with `![x](../../secret.txt)` is refused with "image outside the document folder" (exit 4) for both formats; a legitimate `![x](img/logo.png)` still exports.

### [SA-004] Model provenance: pyannote snapshot unpinned; Whisper verified only by `doctor`

**Pillar:** Threat Model · **Risk:** MEDIUM · **Category:** T, E (A08) · **Scope:** `plugins/ow-tools/python/diarize.py:57,72`, `lib/core.mjs:54`, `lib/doctor.mjs:99-100`, `lib/transcribe.mjs:45` · **Fix effort:** S

**Problem:** The one-time `--fetch` pulls whatever `main` of `pyannote/speaker-diarization-community-1` holds and the offline run loads whatever is in the cache; nothing records or checks a revision. If the HF repo (or the user's HF account path) were compromised, a replaced checkpoint would be loaded by torch on every transcription; whether that is code execution depends on the checkpoint format (pickle vs safetensors — not visible on the gated page), but ow-tools should not depend on that. Separately, the Whisper model is SHA-pinned but only `doctor` (without `--quick`) hashes it; `transcribe` and the hook accept any file of the right size, so a tampered model passes silently at run time.

**Remediation:** (1) Add `DIARIZATION_REVISION = "<commit sha>"` next to `DIARIZATION_MODEL` in `core.mjs`, pass it to `diarize.py` as `--revision`, and use `Pipeline.from_pretrained(model, revision=…)` in both `fetch()` and `run()`; `diarizationCached()` should look for `snapshots/<revision>` specifically. (2) In `transcribe`, verify the Whisper SHA-256 once per model file and record a `<model>.sha256-ok` marker beside it (or just hash it — ~2–3 s against a multi-minute run). (3) Document the pins in SECURITY-MANIFEST ("Models" section).

**Verification:** `doctor --json` shows the pinned revision; a snapshot directory with a different revision is reported "not fetched"; a Whisper file with a flipped byte at the right size makes `transcribe` exit 3 with "SHA-256 does not match".

### [SA-005] `uv run` without `--no-sync`; lock changes propagate with no human-readable diff

**Pillar:** Threat Model · **Risk:** LOW · **Category:** T (A08) · **Scope:** `plugins/ow-tools/lib/transcribe.mjs:137`, `lib/doctor.mjs:83-85` · **Fix effort:** S

**Problem:** `uv run --frozen` still syncs the project environment to the lock when it differs (offline, from uv's cache), so "installs nothing itself" is literally true for system packages but not for the private venv. More importantly, a lock replaced through SA-001 reaches the machine as a `doctor` line that says "run `uv sync --frozen`"; the user cannot see that 3 new packages appeared. The lock itself is in good shape (pypi-only, hash-pinned).

**Remediation:** Add `--no-sync` to the `uv run` argv (the venv is keyed by lock hash, so a stale venv is already an exit-3 condition). Have `doctor`/`version --json` print the `uv.lock` SHA-256 and package count, and have the release notes publish the same two numbers so a user can compare before running the printed `uv sync`.

**Verification:** Stub-uv test asserts `--no-sync` present; `doctor --json` includes `python_lock: { sha256, packages: 117 }`.

### [SA-006] Preflight refusal messages echo document text (contradicts §8 "only line numbers")

**Pillar:** Compliance (design claims) · **Risk:** LOW · **Category:** I · **Scope:** `plugins/ow-tools/lib/preflight.mjs:104-105,112,118,140` · **Fix effort:** S

**Problem:** `:140` prints the first 40 characters of text removed from an `ow:internal` section (i.e. the pricing/margin note) when it also appears outside; `:112` prints link text; `:104-105` print image paths. Output goes to stdout → the consultant's Claude session, which already holds the Markdown, so exposure is minimal — but the design and README promise line numbers only, and the quoted internal text is exactly the class of content the marker exists to protect.

**Remediation:** Replace quoted fragments with the line number and a short category ("internal text from line 42 also appears at line 88"); keep image `src` (needed to act) but never quote removed internal text. Update §8 row 6 if any quoting is kept.

**Verification:** `brand-preflight.test.js` case: internal text duplicated outside → refusal message contains neither substring.

### [SA-007] Write-path gaps: `speakers` skips the ignore check; exports overwrite silently and keep no record

**Pillar:** Threat Model · **Risk:** LOW · **Category:** R, I · **Scope:** `plugins/ow-tools/lib/transcribe.mjs:232-235`, `lib/export.mjs:108-110,116,128` · **Fix effort:** S

**Problem:** (a) `ow-tools speakers <any>/transcript.json --set …` re-renders `transcript.md` beside the input without `assertIgnored`; if a user copied a transcript into a tracked folder, ow-tools now creates a committable RESTRICTED file there. (b) `export` overwrites `export/<name>.pdf|docx` with no `--force` and prints a SHA-256 that is persisted nowhere, so after a re-export the consultant cannot prove which version a client received (the design's own hash rationale, A:118).

**Remediation:** (a) Call `assertIgnored([path, join(dirname(path), "transcript.md")])` at the top of `speakers()` when `set.length`. (b) Mirror `transcribe`: refuse to overwrite existing export outputs without `--force`, and/or write `export/<name>.sha256` (date, source hash, pdf hash) alongside the outputs so the record survives.

**Verification:** `transcribe-cli.test.js`: tracked `transcript.json` + `--set` → exit 4 with the gitignore lines; `export.test.js`: second export without `--force` → exit 4.

### [SA-008] SessionStart data channel: bidi/zero-width characters survive `clean()`

**Pillar:** Threat Model · **Risk:** LOW · **Category:** T (prompt injection residue) · **Scope:** `plugins/ow-tools/lib/status.mjs:35-42` · **Fix effort:** S

**Problem:** The hook's defences are good (wrapper, `<>` neutralised, control chars, 160×12 cap, unparsed lines counted). U+200B–U+200F, U+202A–U+202E, U+2066–U+2069 and U+FEFF pass through, allowing a STATUS.md line to visually reorder or hide text in the terminal transcript that Claude reads differently from what the user sees.

**Remediation:** Extend the first `replace` in `clean()` to `/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩﻿]/g`.

**Verification:** `doctor-hook.test.js`: a fixture line with U+202E is rendered without it.

### [SA-009] `doctor`'s printed fix commands are an unauthenticated instruction channel to the human

**Pillar:** Threat Model · **Risk:** LOW (standalone) — the chained impact is counted under SA-001 · **Category:** E · **Scope:** `plugins/ow-tools/lib/doctor.mjs:47-57,79,85,95-100`, `plugins/ow-tools/skills/ow-tools/SKILL.md:12-15` · **Fix effort:** S

**Problem:** The design's "print-only" decision moves installs to the human, which is right; but the SKILL instructs Claude to show doctor output verbatim and the user to run it. The Whisper line is a `curl` from huggingface.co that `doctor` later SHA-verifies (good); the `uv sync` and keychain lines are not independently checkable. Under SA-001 this becomes copy-paste RCE with the user's own hands.

**Remediation:** Publish the canonical fix commands in README (they are stable) so a user can compare; keep the post-download SHA check; in SKILL.md step 3 add "the commands must match the README's Install section".

**Verification:** README and `doctor` output diff clean for a machine with everything missing.

---

## OWASP 2021 crosswalk (abbreviated; the current list could not be fetched)

| Category | Status | Note |
|---|---|---|
| A01 Broken Access Control | ⚠️ PARTIAL | SA-003 (path containment) |
| A02 Cryptographic Failures | ✅ PASS | token never handled; SHA-256 pins where present |
| A03 Injection | ⚠️ PARTIAL | argv-only spawns, escaped Typst/XML, no shell — good; ffmpeg protocol surface (SA-002) |
| A04 Insecure Design | ✅ PASS | guards-before-write, offline fence, print-only installs |
| A05 Security Misconfiguration | ⚠️ PARTIAL | `uv run` without `--no-sync` (SA-005) |
| A06 Vulnerable/Outdated Components | ⚠️ PARTIAL | external binaries unversioned beyond "present"; `doctor` could warn on age |
| A07 Identification/Authentication | ✅ PASS | n/a (no auth surface) |
| A08 Software/Data Integrity | ❌ FAIL | SA-001, SA-004 |
| A09 Logging/Monitoring | ⚠️ PARTIAL | no export record (SA-007); acceptable for a local tool |
| A10 SSRF | ⚠️ PARTIAL | SA-002 |

## Detection & response (Lite/Standard)

No audit log is appropriate for a local CLI, but two cheap records would help: the export sidecar hash (SA-007) and the installed-version/manifest-hash line already printed by `version`. Rollback is `claude plugin uninstall` / reinstall at a pinned sha (once SA-001 lands). Forensics after a suspected mirror compromise: `~/.claude/plugins/installed_plugins.json` + the cache dir's `SECURITY-MANIFEST.md` compared against the out-of-band hash.

## Prioritized Remediation Plan

| Priority | Finding | Risk | Effort | Owner |
|---|---|---|---|---|
| P0 | SA-001 pin distribution (archive+sha256 or tag+sha) and publish manifest hash | HIGH | M | oc-release-ops / oc-git-ops (mirror workflow) |
| P0 | SA-002 `-protocol_whitelist file` on ffmpeg | MEDIUM | S | ow-tools |
| P1 | SA-003 contain + sniff Markdown images | MEDIUM | S | ow-tools |
| P1 | SA-004 pin pyannote revision; hash Whisper at run time | MEDIUM | S | ow-tools |
| P2 | SA-005 `--no-sync`; lock hash in doctor | LOW | S | ow-tools |
| P2 | SA-007 ignore check in `speakers`; export `--force`/sidecar | LOW | S | ow-tools |
| P3 | SA-006, SA-008, SA-009 | LOW | S | ow-tools / docs |

Also fix the three overstated/contradicted claims in the same PR so the admin packet is accurate: §8 row 1 (ffmpeg), §8 row 5 (Linux "refused" → "reported"), §8 row 6 / README (preflight quoting), SECURITY-MANIFEST "Network" (after SA-002) and "never runs … uv sync" (after SA-005).

## Cross-References

- oc-code-auditor: no checkpoint for `plugins/ow-tools`; this report did not re-scan for code bugs. SA-003 is the one trust-boundary item that oc-code-auditor should pick up as F-level.
- Tests backing the verified claims: `tests/ow-tools/transcribe-cli.test.js:72,109-115,182`, `doctor-hook.test.js:19-21,42,66,87,104`, `plugin-shape.test.js:34-61,88-105`.

## Verdict for merge

**PASS** (no CRITICAL) — with residuals that should land before or with the 1.0.0 release announcement: **SA-001** (HIGH: unpinned, force-pushed distribution with self-attested manifest), **SA-002** (MEDIUM: ffmpeg without `-protocol_whitelist file`), **SA-003** (MEDIUM: export image path containment), **SA-004** (MEDIUM: pyannote revision / Whisper run-time hash), and LOW items SA-005–SA-009. Claims to correct in the design/README/manifest: §8 "ffmpeg reads local files only" and SECURITY-MANIFEST "Network: none at run time" (NOT VERIFIED), §8 Linux token file "refused unless 0600" (NOT VERIFIED — reported only), §8 "preflight prints only line numbers" (CONTRADICTED at `preflight.mjs:140`).
