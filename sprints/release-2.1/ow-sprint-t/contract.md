# Sprint T contract — ow-tools 1.1.0

**Plan:** `sprints/release-2.1/ow-family-sprint-plan.md` § Build re-plan, Sprint T row (merged in #611 as `8aa3145b`) · **Base:** `main` at `8aa3145b`, ow-tools 1.0.0 as merged in #597 · **Skill:** oc-app-architect `/oc-build`, Generator proposes, Evaluator reviewed · **Status:** APPROVED by the owner 2026-10-16 (all recommendations O1–O14 accepted; health uses OSV with a --no-network mode; capture ships in 1.1.0 after a 2-hour go/no-go trial).

**Design sources (the T-amendments, each approved 2026-10-16 with its design):**

| Item | Verb | Source |
|---|---|---|
| T1 capture | `ow-tools capture` | `docs/plans/2026-10-16-ow-documentation-design.md` §11 row T1; §2 decision 8; §5.5; §8 (Data check); §9; §10 (Screenshots) |
| T2 pptx | `ow-tools export --pptx` | ow-documentation design §11 row T2; §2 decision 10; §6.1; §7.1; §10 (Delivery). Also `docs/plans/2026-10-16-ow-draft-design.md` §4.2 (Deck row), §11 (Deck) |
| T3 health | `ow-tools health` | `docs/plans/2026-10-16-ow-care-design.md` §12 row T3; §2 decision 4; §5.4; §9 (Read-only health); §11 (Health) |
| T4 calc hours | `ow-tools calc hours` | ow-care design §12 row T4; §2 decisions 5, 7, 8, 10; §6 (rule and worked example); §9 (Hours add up); §11 (Rollover, Extra hours); H4 (`rollover: { share, of, months }`) |
| T5 calls table | none (design text) | `docs/plans/2026-10-16-ow-start-logs-amendment.md` §8 row T5; §2; §3 (`-log-meeting`) |
| T6 xlsx | `ow-tools export --xlsx` | ow-draft design §12 row T6; §1 decision 3; §4.2 (Sheet row); §8 (Numbers); §11 (Numbers). Also `docs/plans/2026-10-16-ow-vendor-eval-design.md` §7 (formal mode: blank `evaluation-workbook.xlsx`) |
| T7 digest | `ow-tools digest` | ow-draft design §12 row T7; §7 (Freeze). Also `docs/plans/2026-10-16-ow-research-design.md` §6 (framework manifest digests) and `docs/plans/2026-10-16-ow-controls-design.md` §4 (`-pin`), §6.3 (pin match) |

**The 1.0.0 design this amends:** `docs/plans/2026-10-09-ow-tools-design.md` on `main`: §4 (interface, exit codes, absent-cases), §5 (parts), §6 (install and doctor), §7 (manifest), §8 (privacy rules, Known residuals), §9 (tests), §12 (what ow-tools never does). **Audits it answers:** `docs/audits/2026-10-14-pr-597-diff-audit.md` (open LOWs F-005 to F-011) and `docs/audits/2026-10-14-ow-tools-security-posture.md` (SA-001, SA-004 carried to Sprint 5; SA-007, SA-008, SA-009 open LOWs).

**Needs first:** PR #611, merged 2026-10-16 as `8aa3145b`; every T-amendment design is on `main`. The Sprint T branch starts from `main` at `8aa3145b`.

## Deliverables

1. **T7 `digest`** — `ow-tools digest <file|folder> [--json]` in a new `lib/digest.mjs`. A file gives the SHA-256 of its bytes. A folder gives the SHA-256 of a canonical manifest, specified in the design (§5.10 below), so a shell one-liner reproduces it. It prints "detects accidental change only; not tamper-evidence" every time. `digestTree()` is exported, so Sprint C's `scripts/build-packs.mjs` imports this implementation rather than writing a second one. It streams, never reading a whole file into memory, and doctor's model hash uses the same helper (this closes F-007).
2. **T4 `calc hours`** — `ow-tools calc hours --ledger <file.json> --rollover <share>,<of>,<months>` in `lib/calc.mjs`. The ledger JSON schema is defined in the design (months, each with included minutes and entries by kind, approved extra minutes and recorded credit minutes). Output is per month, in integer minutes: available, used by kind, extra, rolled over, lapsed and credit. Oldest hours are used first. The month identity is checked.
3. **T6 `export --xlsx`** — `ow-tools export <sheet-folder> --formats xlsx` (the folder holds `*.csv` and `model.md`, with an optional `sources.csv`). It lives in a new `lib/xlsx.mjs` with a small deterministic zip writer, `lib/zip.mjs`. The result has formulas, number formats, one header row per sheet and a Sources sheet. The `model.md` formula-map syntax is defined in the design, because Sprints D and V write it. Node built-ins only.
4. **T2 `export --pptx`** — `ow-tools export <deck.md> --formats pptx` in a new `lib/pptx.mjs`. It uses pandoc with a reference deck that ow-tools builds per run from `brand.yaml` (the same unzip, edit, zip pattern as `docx.mjs`). There is one slide per H2, and speaker notes come from a fixed notes syntax. The 1.0.0 preflight runs unchanged, plus deck rules. The banner is repeated on every slide.
5. **T3 `health`** — `ow-tools health --config <health.yaml> [--json] [--no-network]` in a new `lib/health.mjs`, plus `lib/lockfiles.mjs` for npm, pnpm and yarn lockfiles, and `lib/net.mjs`, one outbound-request module with the address and redirect rules below. Checks: dependency advisories and outdated packages, TLS certificate expiry, domain expiry over RDAP, HTTP status of listed URLs, and a listed local backup file's age. Each result is `OK`, `attention` or `not checked (reason)`. The `health.yaml` schema is defined in the design (Sprint 4b writes it), and a strict reader refuses anything outside that shape.
6. **T1 `capture`** — `ow-tools capture` in a new `lib/capture.mjs`, plus `lib/cdp.mjs`, a DevTools-protocol client over `--remote-debugging-pipe` (no TCP debugging port, no WebSocket, so Node 20 is enough). It has three modes:
   - **Sign-in:** opens a headed window on the dedicated per-workstream profile.
   - **Capture:** runs a capture plan headless and writes one PNG per step, at a fixed viewport.
   - **Profiles:** `--profiles` lists the profiles and `--delete-profile <id>` deletes one.

   The capture-plan JSON schema is defined in the design (Sprint 3b writes it). It names the declared environment, the allowed origins, the production decision and the steps.
7. **Version 1.1.0** — `plugin.json`, both version fields in `marketplace.json`, the help text, and `version --json` capabilities that now include capture, health, pptx, xlsx and digest. The session-hook readiness line adds the new parts using cheap checks only.
8. **doctor** — new rows for the browser (capture), pandoc with zip and unzip (pptx), and pip-audit (optional, health on Python), each with a printed fix. The Typst version compare is fixed (F-010). It stays print-only and offline.
9. **SECURITY-MANIFEST regeneration** — `scripts/gen-ow-tools-manifest.mjs` gets a new template, not a hand edit. The *Programs it runs* table adds the browser, pip-audit and the new pandoc writer. *Network* is rewritten per verb: capture reaches the caller's listed origins; health reaches the fixed destinations plus the listed hosts; every other verb reaches nothing. *Files it writes* adds screenshots, the profile folder, the RDAP bootstrap cache, the export sidecar, pptx and xlsx. The file table is regenerated, and the version line reads 1.1.0.
10. **Design doc amendment** — `docs/plans/2026-10-09-ow-tools-design.md` gains **§14 "1.1.0 (2026-10-16 amendments T1–T7)"**, and the sections it touches are edited in place:
    - §1 parts table; §2 requirement rows (T1–T7); §3 tree.
    - **§4.2 calls table (T5):** the ow-start meeting row exactly as the amendment gives it, *plus* one row for every new caller: ow-documentation `-capture` and `-export` (pptx); ow-care `-health` and `-month`; ow-draft `-freeze` and `-deliver` (digest, pptx, xlsx); ow-vendor-eval `-score` and `-formal` (calc, xlsx); ow-research `-framework` and ow-controls `-pin` (digest). Each row gives its absent-case, or "not stated in the caller's design: <proposed>", flagged for that caller's sprint.
    - New §5.6–§5.10 part specs, including the four read contracts: the capture plan, `health.yaml`, the calc hours ledger and the `model.md` formula map. The digest canonical form goes there too.
    - §6 doctor rows; §8 privacy rules and a new *Network* rule; §9 tests; §12 "never does" edits (the profile delete is the one new delete, confined to the data folder; the run-time network wording); Known residuals updated after the security review.
11. **README and `/ow-tools` SKILL.md** — the new parts, requirements, privacy and network statements, and the commands. The README *Privacy* section stops saying "never sends … text anywhere" without the exceptions, and names what health sends and where.
12. **T5 calls table** — the design row, plus a test that runs the 1.0.0 guards on `opchain-work/logs/acme/meetings/MTG-01/audio/x.m4a` with `--out …/MTG-01/`, in a temp repo carrying only ow-start's two `.gitignore` lines, and shows they pass. That proves "no code change".
13. **Residual fixes** — SA-007, F-005, F-006, F-008 and F-010 (must close), and SA-008 (should close). See § Security review.
14. **The security review reports** — two reports under `docs/audits/` (see § Security review), and the fixes they require. Both are done before the PR leaves draft.

## Testable criteria

| # | Criterion | How it is verified |
|---|---|---|
| C1 | **T7 file digest** equals `shasum -a 256` of the file and always carries the "not tamper-evidence" sentence | vitest against a fixture; `shasum` run when present |
| C2 | **T7 folder digest** is the documented canonical form. It doesn't change with mtime, mode, `cp -R` or the order files were created in, but it changes on any byte change, rename, add or remove. A symlink anywhere gives exit 4 naming the path. Skipped names are listed. The documented one-liner gives the same hex | vitest on built trees; the one-liner runs where `find`, `sort` and `shasum` exist |
| C3 | **T4** reproduces the ow-care §6 example exactly: M-01 uses 300 of 480 min, 45 rolled over, 135 lapsed; M-02 has 525 available, 600 used with 75 extra approved. "Rolled in + included + extra = used + rolled over + lapsed" holds every month | golden ledger fixture; the identity is asserted on every fixture month |
| C4 | **T4 refusals**: an entry that isn't a whole quarter-hour, or minutes past available without an approved extra, gives exit 4 naming the entry id only. A negative value or an unknown kind gives exit 2. A rolled-in hour unused at the end of the next month lapses (ow-care §11 Rollover) | vitest |
| C5 | **T4** `of: included` and `months > 1` behave as the owner decides (O11) | one fixture each |
| C6 | **T6** CSV + `model.md` gives an XLSX whose formula cells carry `<f>` and no typed value. Each sheet has one bold, frozen header row; number formats come from the map; there is a Sources sheet when `sources.csv` is given; the workbook is set to recalculate on load. The same input gives byte-identical output | unzip XML assertions; a double-run byte compare |
| C7 | **T6 preflight** refuses (exit 4, naming `sheet!cell` only, never a value): a typed value in a mapped formula cell; a reference to an unknown sheet or cell; a function outside the allowlist; an external-workbook reference; a DDE-style or `WEBSERVICE`/`HYPERLINK` formula. CSV text that starts with `=`, `+`, `-` or `@` is written as a string, never a formula | vitest, one plant each |
| C8 | **T6 values**: where LibreOffice (`soffice`) is installed, a headless convert of the XLSX gives the same computed values as `ow-tools calc` on the same inputs | real-binary test; skips and says so without it |
| C9 | **T2** a six-H2 deck with notes exports to six slides with six notes slides (ow-draft §11), with the H1 handled as O14 decides. A slide has one title. Brand colours and fonts are in the theme, the logo is on the master, and the banner is on every slide | real pandoc test (skips without pandoc); unzip XML assertions |
| C10 | **T2 preflight**: the 1.0.0 rules run on the deck (one H1, no skipped levels, alt text, table headers, link text, internal sections stripped, artefact header removed, images confined). Every `p:pic` has a non-empty `descr`, and every table has `firstRow="1"`. No internal-section text is anywhere in the PPTX | plants for each rule; a grep of every PPTX part |
| C11 | **T3 config**: the strict `health.yaml` reader accepts the documented shape and refuses unknown keys, anchors, multi-line values, URLs with userinfo (`user:pass@`) and non-https URLs, naming the key and never echoing its value | vitest |
| C12 | **T3 results**: every check returns `OK`, `attention` or `not checked (reason)`. With the default thresholds (O10), a certificate expiring in 20 days is `attention` (ow-care §11). One unreachable host doesn't fail the run (exit 0, that check `not checked`). A missing lockfile is `not checked (no lockfile)` | stub TLS, RDAP, HTTP and OSV servers injected at module level (see Test requirements) |
| C13 | **T3 lockfiles**: npm (lockfile v1–v3), pnpm (v6, v9) and yarn (v1, berry) fixtures parse to the same package set. Only packages whose resolution is the public registry are sent anywhere; the rest are `not checked (private registry)` | fixtures; the stub records request bodies |
| C14 | **T3 read-only**: health never writes in the repository or under any listed path, sends only GET or HEAD to listed URLs (POST only to the advisory API), follows no redirect (it reports the 3xx and the Location host), sends no cookie or auth header, and never reads `.npmrc`, `.pypirc`, `.netrc` or a keychain | a before/after tree hash of a fixture repo; request log assertions; an fs-read spy |
| C15 | **T3 under `--no-network`** (O9): lockfile parsing and backup age only, with every network check `not checked (network off)` and zero socket attempts | network fence (C25) |
| C16 | **T1 launch**: the browser starts with `--remote-debugging-pipe` and never `--remote-debugging-port`; with `--user-data-dir` under `$OW_TOOLS_HOME/capture/<workstream>/` (mode 0700); and with the password manager and autofill off in the profile's preferences, first-run and sync off, and downloads denied. It is killed and its temp state removed on success, failure and timeout | a stub browser (a Node script speaking CDP over fds 3/4) records argv and the prefs file; a forced-failure test checks no process is left |
| C17 | **T1 credentials**: ow-tools never calls a cookie or storage read method and never evaluates caller-supplied JavaScript; CDP methods come from a fixed allowlist. A plan step that targets a password or one-time-code field (by type, `autocomplete`, or a name matching the documented pattern) gives exit 4 before launch. A plan carrying a value that looks like a secret is refused | the stub records every CDP method; plants |
| C18 | **T1 origin and production**: navigation or a redirect to an origin outside `allowed_origins` stops that step, and no image is written for it. `environment: production` without a `decision` (role and date) gives exit 4 before launch. The decision is echoed in the JSON output, unverified and labelled so | stub-browser redirect plant; plan plants |
| C19 | **T1 output**: one PNG per step at the fixed viewport (IHDR width and height checked), named `<step-id>.png`, written only into `--out`. The out path's git-ignore guard is as O4 decides. The JSON marks each image `data_check: pending (not done by ow-tools)` | stub and real browser; a guard test in a temp repo |
| C20 | **T1 profiles**: `--profiles` lists the id, size and last-used date, never contents. `--delete-profile <id>` deletes only a realpath-contained folder under `$OW_TOOLS_HOME/capture/`, refuses a symlink or an id containing `/` or `..`, and prints what it removed | vitest with planted escapes |
| C21 | **T1 real browser**: where Chrome or Chromium is installed, capturing a local fixture page served on 127.0.0.1 gives a PNG of the viewport size (the origin guard allows loopback only through a test-scoped origin list, see Test requirements) | real-binary test; skips and says so without a browser |
| C22 | **Every new verb has the documented absent-case.** With its requirement missing, a verb exits 3 with `missing` naming it (capture without a browser, pptx without pandoc or zip). Design §4.2 carries each caller's absent-case. Every exit-4 refusal has a stable `reason` code and a next step in the design, so a calling skill can relay it (the Sprint 1 Bug 4 lesson). digest, calc hours and xlsx need only Node, so they are never absent where ow-tools is | stub-PATH tests; a test that every `reason` code thrown in `lib/` appears in design §14 |
| C23 | **Calls table ↔ CLI**: every `ow-tools <verb> [--flag]` in design §4.2 resolves to a real verb and flag | a vitest parses §4.2 and checks it against the CLI's verb list and `FLAGS` |
| C24 | **T5 no code change**: the 1.0.0 guards accept the ow-start meeting path under ow-start's two `.gitignore` lines; `workstream` in the JSON is `logs/<workstream>` | Deliverable 12's test |
| C25 | **Network rules**: only `capture` (the plan's listed origins) and `health` (the fixed destinations OSV, `registry.npmjs.org` and `data.iana.org`, the RDAP servers that bootstrap names over https, and the listed hosts) open a socket. digest, calc, export (all four formats), transcribe, speakers, doctor, version and the hook open none. `health` refuses loopback, private, link-local, CGNAT and metadata addresses after DNS resolution, in the connect-time lookup so a rebinding can't slip past | (a) static: the modules reachable from the no-network verbs import none of `node:net`, `tls`, `http`, `https`, `http2`, `dgram` or `dns`, and name no `fetch` or `WebSocket`; (b) runtime: a `--import` preload makes every socket, DNS and fetch call throw and records attempts, then each no-network verb runs with zero attempts; (c) health with the preload sees only allowlisted destinations; (d) private-address plants refused |
| C26 | **1.0.0 privacy rules still hold**: no existing ow-tools assertion is removed or weakened (the diff of `tests/ow-tools/` 1.0.0 files only adds). Refusal messages from every new verb name a line, cell, key or step id and never quote document, config or plan values. The no-private-names and no-gate-words tests cover every new file | test diff review; message plants with a canary string |
| C27 | **doctor stays print-only and covers the new requirements**: browser, pip-audit (optional), pandoc with zip and unzip for pptx, each with a printed fix. Stub `brew`, `curl`, `npm`, `npx`, `pip`, `pipx`, `uv` and the browser binary are never invoked to install. doctor opens no socket. The hook's readiness line stays cheap (PATH and file checks only, no browser start) and within its 160-character limit | extended stub test; network fence |
| C28 | **No new dependency installed by the tool**: no `package.json` in the plugin; `lib/` imports `node:` and `./` only; there is no browser download (no Chrome-for-Testing fetch). Every `run("<cmd>")` target in `lib/` appears in the manifest's *Programs it runs* table | the existing import test, plus a new spawn-target ↔ manifest test |
| C29 | **oc- outputs byte-identical** | `git diff <base>..HEAD --stat -- skills/ plugins/opchain/ src/ public/ site/ package.json package-lock.json .claude-plugin/ mirror/ skills-work/` is empty; `sync-plugin-skills --check`, `sync-skill-bundles --check` and `gen-mcp-catalog` agree |
| C30 | **Manifest current and true for 1.1.0**: `gen-ow-tools-manifest.mjs --check` passes, the version line reads 1.1.0, and the Network, Programs and Files sections match C25 and C28 | the existing test, plus assertions on the section text |
| C31 | **Version 1.1.0** in `plugin.json` and both `marketplace.json` version fields; `version --json` lists every capability | plugin-shape test |
| C32 | **Residuals closed** as § Security review lists; both review reports exist with the verdicts the gate requires | the reports; a test per closed finding |
| C33 | `npm test` and `npm run build` green; `claude plugin validate --strict` where the CLI is present; candidate verifier PASS on every commit, **with the per-commit evidence recorded in the PR** (Sprint 1 rounds 1–4 couldn't verify this) | CI; PR body |

## Test requirements

Everything is in Vitest under `tests/ow-tools/`, run by `npm test` and CI, in the 1.0.0 style: each case gets its own temp folder and `OW_TOOLS_HOME`, and nothing touches the real data folder. Spawning suites get 30 s.

- [ ] **Stub binaries, as in 1.0.0**: a fake `pandoc` for the pptx pipeline and its error path (exit 5 with one line). A fake browser: a Node script on PATH that speaks CDP over fds 3/4, returns canned PNGs, records argv, prefs and every method, and can be told to redirect, hang or crash. A fake `pip-audit` that records argv (it must never be run without `-r` or in its installing mode). A fake `soffice` is not needed, because C8 is real-binary only.
- [ ] **Injected network stubs, not CLI flags**: `lib/net.mjs` takes its resolver, connector and destination table as parameters. Unit tests import `health.mjs` and pass in-process stub servers (TLS with generated certs, RDAP, HTTP, OSV). There is no environment variable or CLI flag that changes destinations or loosens the address rules in a shipped build. The capture real-browser test (C21) passes a test-scoped origin list through the same parameter path.
- [ ] **Network fence harness** (`tests/ow-tools/fence.mjs`): a `--import` preload that replaces `net.connect`, `tls.connect`, `dns.lookup` and `dns.resolve*`, `http(s).request`, `globalThis.fetch` and `WebSocket` with recorders that throw. It is used by C15, C25 and C27.
- [ ] **Real-binary tests that skip and say so when the tool is absent**: pptx (pandoc, zip, unzip), the xlsx recalculation (soffice), capture (Chrome or Chromium at the standard macOS paths or on PATH), and the digest one-liner (`shasum`, `find`, `sort`).
- [ ] **No live-internet test in CI.** One opt-in script, `scripts/ow-tools-health-live.mjs` (not a test), runs health against public hosts for the owner's manual check.
- [ ] **Golden fixtures**: the ow-care §6 ledger, a six-H2 deck with notes, a two-sheet model with sources, a vendor-eval-style blank workbook (no Sources sheet, see O13), lockfiles from npm, pnpm and yarn, a capture plan with three steps, a `health.yaml` with every check kind.
- [ ] **A planted failure for every criterion that says "refuses" or "never"**: C2, C4, C7, C10, C11, C13, C14, C17, C18, C20, C25 and C26. Plant path variants (`./`, `..`, a case variant, a symlink) where a path is checked. Sprint 1's evaluator found most slips in variants.
- [ ] Existing 1.0.0 suites unchanged except for version pins that read `VERSION`.

## Technical approach

**Order: highest risk first, except where something is tiny and unblocks another lane.**

1. **Shared plumbing (about 1h)**: `zip.mjs` (stored and deflate entries via `zlib.deflateRawSync`, a table CRC32 because `zlib.crc32` needs Node 20.15 or later, fixed timestamps), the network fence harness, guards fixes F-005 (missing `git` is exit 3, not a silent pass) and F-006 (cover `.tmp-` siblings; write 0600), and the stable `reason` codes.
2. **T7 digest (about 1h)**: tiny, but Sprint R needs it first and Sprint C must match it byte for byte. Fix the canonical form in design §5.10 in the same commit.
3. **T1 capture spike (2h timebox, go/no-go)**: CDP over the pipe on Node 20 with the installed Chrome. Sign-in headed, then capture headless on the same profile; that the password-manager prefs hold; Chrome's behaviour with `--headless` and an existing profile. **If the spike fails, stop and take O6 to the owner** before building the rest of capture.
4. **T3 health (about 5h)**: `net.mjs` first (connect-time address check, no redirects, timeouts, a 64 KB body cap, a fixed User-Agent), then TLS, then RDAP (the IANA bootstrap fetched over https and cached 30 days in the data folder), then HTTP, OSV and outdated (direct dependencies only, from `package.json` plus the lockfile versions, which bounds request count), then lockfile parsers, then pip-audit in no-install mode per O8, then backup age (`lstat` only, never opened).
5. **T1 capture build (about 4–5h)**: plan reader, origin guard, step runner (navigate within the allowed origins, click by selector, fill with the plan's value except refused fields, wait for a selector, screenshot), profile management, doctor row.
6. **T6 xlsx (about 3–4h)**: the `model.md` map reader, the formula allowlist and reference checker, the sheet writer, styles (bold header, freeze pane, number formats), the Sources sheet, the banner as the sheet header text when set.
7. **T2 pptx (about 3h)**: the reference deck from pandoc's default reference with the theme colours, fonts, master logo and banner edited in. The input format is `gfm-autolink_bare_uris` plus the notes extension proven in a 30-minute check (pandoc's notes are fenced divs, which plain GFM may not parse; if `+fenced_divs` isn't accepted, ow-tools converts a documented `Notes:` block itself). `--slide-level=2`; the H1 per O14; the same preflight, plus "no H3 or deeper outside notes".
8. **T4 calc hours (about 2h)**: pure function plus the CLI, fixtures first. F-008 is fixed in the same file (`calc date` keys aligned; `--holidays` with `--days` is exit 2, not silently ignored).
9. **Docs (about 2h)**: design §14 and in-place edits, the §4.2 rows (T5), README, `/ow-tools` SKILL.md, the manifest generator template, version bump.
10. **Security review and fixes** (§ below), then the evaluator rounds.

All new code is Node built-ins, argv-only `spawnSync` (no shell), and refusals that never quote content, as in 1.0.0. The PR is one PR for ow-tools 1.1.0, so one review covers all six parts. Expect three evaluator rounds, not one (Sprint 1 needed four).

## Security review

**One review for all six parts, done on the finished 1.1.0 tree before the PR leaves draft.** It has two passes, in this order:

1. **oc-security-auditor posture pass** (`/oc-security`, Standard tier, the same frame as the 2026-10-14 report), written to `docs/audits/2026-10-XX-ow-tools-1.1.0-security-posture.md`. Scope:
   - **Threat-model delta.** Capture: the profile is a store for a signed-in test session; the CDP channel; the origin and production guard; screenshot data at rest. Health: SSRF and DNS rebinding; which dependency names leave the machine and to whom; TLS and RDAP trust; pip-audit's own behaviour. xlsx: formula and DDE injection; the zip writer. pptx: the reference deck built from `brand.yaml`; images. digest: symlinks and TOCTOU.
   - **Privacy-claims re-check** of §8, §12, README and the manifest, line by line: VERIFIED, NOT VERIFIED or CONTRADICTED.
   - **A re-rating of SA-001** now that a compromised update could reach live browser sessions on client test environments.
2. **oc-code-auditor diff audit** (`/oc-audit`, Auditor only) of `main..HEAD` for `plugins/ow-tools/`, `tests/ow-tools/` and `scripts/gen-ow-tools-manifest.mjs`, written to `docs/audits/2026-10-XX-pr-<n>-diff-audit.md`.

**Gate to leave draft:**
- No CRITICAL or HIGH introduced by 1.1.0 is open.
- Every MEDIUM is fixed, or accepted by the owner in writing in the PR.
- The posture verdict is PASS, and the diff verdict is PASS or PASS-WITH-NOTES.
- Known residuals in design §8 are updated with whatever stays open.

**Residuals that must close in Sprint T** (each touches code this sprint changes):

| Finding | Why now | Fix |
|---|---|---|
| SA-007 (both halves) | ow-draft `-deliver` and ow-documentation `deliveries.yaml` rely on knowing what was exported | `speakers --set` runs the ignore guard. Every export writes `export/<name>.export.json` (format, source and output SHA-256, tool version, time, from `calc today`'s clock) and reports when it replaced a file. Callers see no other change |
| F-005 | capture and transcribe both lean on the guard | missing `git` is exit 3, never a pass |
| F-006 | new writers | the guard covers `.tmp-` siblings; outputs are 0600 |
| F-008 | `calc.mjs` changes; ow-care's reply target uses `calc date` | aligned keys; `--holidays` with `--days` is a usage error |
| F-010 | doctor changes | full semver compare |

**Should close (cheap, nearby):** SA-008 (strip bidi and zero-width characters in `clean()`; the hook line changes) and F-007 (the streamed hash comes free with digest).

**Stay open, out of this sprint:**
- **SA-001**: distribution pinning, Sprint 5. 1.1.0 doesn't give a compromised mirror any new power, since the SessionStart hook already runs its code. It does widen what that code could reach (client test sessions in the capture profile), so the posture pass re-rates it. If the re-rating is CRITICAL, the owner decides whether SA-001 moves ahead of the 1.1.0 merge.
- **SA-004**: model pins, Sprint 5; transcription is untouched.
- **SA-009**: the print channel. New printed fixes are package-manager lines only, with no `curl | sh`. The finding stays tied to SA-001.
- **F-011**: Word run order. It stays open, but the owner's real-app check (Effort, USER) covers the same class of risk for pptx and xlsx.

## Evaluator review of this contract

- **Pushed back: T1 says how capture runs but not how it reaches each screen.** A screenshot "for every task step" needs navigation, and often clicks and test-data entry. The contract defines a narrow, declarative plan (navigate, click, fill, wait, shot) and refuses secret fields. The owner confirms the model (O1). Without that, C17–C21 can't be graded.
- **Pushed back: "refuses a production URL" isn't checkable by ow-tools**, because it can't know which host is production. The contract makes it testable: a declared `environment`, an `allowed_origins` list, and a required decision for production that is echoed and labelled unverified (O3).
- **Pushed back: "never stores a credential" is not literally true for capture.** A signed-in profile holds session cookies. The design text and README must say so, which is why the profile is on ow-handoff's access-removal list. The contract tests what *is* true (C16, C17).
- **Pushed back: the data check on every image is not ow-tools'.** It has no OCR and must not imply one. The image is reported `pending`; ow-documentation's `-capture` does the check (Sprint 3b).
- **Pushed back: T3 says "Node built-ins" but not where advisories come from**, nor that dependency names leave the machine. The contract names the destinations (C25) and the private-registry filter (C13). The owner decides the source and egress (O7, O8). pip-audit's default `-r` mode builds a venv and installs into it, which would break "installs nothing", so it runs only in its no-install mode or not at all.
- **Pushed back: four read contracts were left to the builder.** The capture plan, `health.yaml`, the hours ledger and the `model.md` map are each written by a later sprint's skill (3b, 4b, 4b, D and V). Sprint 1's evaluator found a built artefact that broke an approved sibling's read row. So all four schemas, and the digest canonical form, go into design §14 in this sprint and are the read contract the later sprints build against.
- **Pushed back: T2's "one slide per H2" against the "exactly one H1" preflight.** pandoc makes a section slide from an H1 above slide level, so ow-draft's "six-H2 deck → six slides" fails unless the H1 rule is set (O14). Speaker notes are required by ow-draft §11 and ow-documentation §6.1, but T2 doesn't specify a syntax, and the 1.0.0 input format (GFM) may not parse pandoc's notes divs. That is a 30-minute check in step 7.
- **Added:** C22's stable `reason` codes, because Sprint 1 Bug 4 was an ow-tools refusal the calling skill had no wording for. C23's calls-table ↔ CLI check, so T5 can't drift. C25's static and runtime fence, so "no network" is shown by a test, not just stated.
- **Out of scope:**
  - The skill-side use of every new verb (Sprints 3b, 4b, R, D, V, C).
  - `calc date --calendar us-federal` (Sprint 3) and `scan-secrets` (Sprint 4).
  - SA-001 and SA-004 (Sprint 5, unless the SA-001 re-rating says otherwise).
  - Connector pushes and Google Slides or Docs import. Google import can't be graded; it is the owner's manual check.
  - Copying captured images into a client repository (ow-documentation §7.2, Sprint 3b).
  - ow-handoff's access-list wiring for the profile (H3, Sprint 4).
  - Linux real-binary runs (Linux stays "same checks, untested" as in 1.0.0), and Windows.
- **Gaps in the callers' designs, flagged for their sprints, not fixed here:**
  - ow-vendor-eval writes `evaluation-workbook.xlsx` with no absent-case.
  - ow-controls `-pin` and its pin-match check have no absent-case for digest.
  - ow-research's manifest digests have none either.
  - ow-care §5.4 doesn't say what `-health` does under a handling level, although ow-protocol v1 step b has the user confirm internet access is off. O9 gives the skill a `--no-network` mode to use.
- **Not graded this sprint:** "Real use" (each caller's sprint, then Sprint 6).

## Open for the owner

| # | Decision | Options | Recommendation |
|---|---|---|---|
| O1 | How capture reaches each step | (a) URL-only shots; (b) a declarative plan: navigate, click, fill test data, wait, shot; (c) the user drives a headed window and ow-tools snaps on a signal | **(b)**, with secret fields refused and no caller JavaScript. (a) can't reach most task screens. (c) can't run from Claude Code's Bash tool, which has no interactive stdin |
| O2 | Profile scope | One shared profile, or one per workstream | **Per workstream** (`capture/<client>/`): one client's session never serves another, and access removal deletes exactly one |
| O3 | Production guard | Hostname heuristics, or a declared environment plus allowed origins plus a required decision for production | **Declared**: ow-tools records the decision as given, labelled unverified |
| O4 | Screenshots at rest | Git-ignored like transcripts (`opchain-work/**/shots/`, guarded), or committable | **Git-ignored**: images exist before the data check, and exports embed the cleared ones anyway |
| O5 | Browser | Chrome only, Chromium only, or either | **Either**, detected at the standard paths or on PATH. doctor prints `brew install --cask google-chrome`. Nothing is downloaded by ow-tools |
| O6 | Capture's release | In 1.1.0, or split to 1.2.0 (needed only by Sprint 3b) | **In 1.1.0 with a go/no-go after the 2h spike**. On no-go, ship 1.1.0 without capture and add capture before Sprint 3b with its own short review |
| O7 | Health advisories: what leaves the machine | (a) OSV (`api.osv.dev`) for public-registry packages only; (b) npm's audit endpoint; (c) no advisory check | **(a)**: one documented public API with no auth, name and version only, and private-registry packages never sent |
| O8 | Health on Python | (a) pip-audit when installed, only with `-r` in no-install mode (`--disable-pip`, `--no-deps`); (b) OSV directly for pinned Python lockfiles, no pip-audit; (c) none in 1.1.0 | **(a)**, as the design says, with its argv pinned by test. Without a pinned `-r` file, the result is `not checked` |
| O9 | Health under a handling level | A `--no-network` mode (local checks only) that ow-care uses when a level is set, or a skill-side refusal only | **Add `--no-network`** (C15), and flag ow-care §5.4 for Sprint 4b |
| O10 | Health thresholds | Fixed in code, or defaults overridable in `health.yaml` | **Defaults, overridable**: certificate and domain ≤ 30 days → `attention`; an advisory of high or critical severity → `attention`, others listed; outdated → `attention` only when a major version behind |
| O11 | calc hours beyond the site rule | Implement only `of: unused, months: 1` (refuse others), or define `of: included` (min(own unused, ⌊share × included⌋ to the quarter-hour)) and `months: N` (each month's rollover lapses after N months, oldest first) | **Define both**, since H4 approved the schema. Confirm the `included` reading |
| O12 | Folder digest exclusions | None (strict), or skip `.DS_Store` and `._*` only, listed in the output | **Skip those two, and list them**: Finder litter would otherwise raise false `PINNED PACK MISMATCH` |
| O13 | XLSX Sources sheet | Always required, or written when `sources.csv` is given | **When given**. ow-draft's Sources check requires it skill-side; ow-vendor-eval's blank workbook has none |
| O14 | Deck H1 | The H1 is the deck title only (N H2 → N slides, as in ow-draft §11), or a title slide (N + 1) | **Title only**. A title slide can be an H2 the author writes |

## Effort

The re-plan says **CLAUDE 18–26h | USER 2–3h**. The specs support **CLAUDE 24–32h | USER 3–4h**:

- **Capture is the largest part** (spike plus build, about 6–7h). Its interaction model, guards and profile management are a component, not the one-paragraph amendment they read as.
- **Health is two pieces of work**: network-rule plumbing that must be tested to the security bar, and three lockfile parsers.
- **Four read contracts and the digest form** go into the design now (about 1h more).
- **One review over two network-touching parts** costs more than either alone (about 3–4h with fixes).
- **The evaluator rounds**: three are expected, about 3h.

The USER time is contract approval and O1–O14 (about 1h); signing in once on a real test environment for the capture check; opening the sample PPTX and XLSX in PowerPoint or Keynote, Excel or Numbers, and Google Slides or Sheets (about 1h; the class of risk F-011 left unverified); and reading the two review reports and merging (about 1h).

If O6 splits capture out, Sprint T is **CLAUDE 18–24h | USER 2–3h**. Capture then costs about 6–8h before Sprint 3b.
