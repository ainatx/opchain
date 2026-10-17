## Sprint T — Evaluation Round 2

**Sprint:** ow-tools 1.1.0 (contract `sprints/release-2.1/ow-sprint-t/contract.md`, C1–C33, T1–T7) · **Branch:** `claude/ow-tools-sprint-t`, head `6459474a` (round-2 commits `4a0d6366`, `ef185647`, `6459474a` on top of round 1's `62af404f`) · **Evaluator:** skeptical Evaluator, oc-app-architect Phase 6 · **Date:** 2026-10-17

Graded from the contract, the amended design (`docs/plans/2026-10-09-ow-tools-design.md`, §5.6–§5.10, §8, §14), both review reports and the round-2 diff. Every plant ran in a detached evaluation checkout and was reverted after its run. No tracked file in the Generator's worktree was touched, and no real network traffic was sent: health ran only against the injected stubs or with `--no-network`, and the one capture-origin probe used a loopback server.

**Owner rulings applied, so not graded as defects:**
- Round 1: `--sign-in` runs the steps in the same window; OSV gets every public-registry package; capture origins are https only, never loopback.
- OD-1 to OD-7, as recommended in round 1.
- SA-011: use the real macOS Keychain, and wipe cookies after any production run.

### Code Scores

| Criterion | Weight | Score | Justification |
|---|---|---|---|
| Functionality | 30% | **6/10** | Most of round 1 is genuinely fixed: the npm v1 egress, the bannerless deck, staged exports, grid bounds, fail-closed advisories for the shapes named, and the IPv6 allowlist. Exports were clean on a failure in every format (probe below). But four new holes sit on the same privacy and security paths. A YAML metadata block embeds any file on disk into a Word export (Bug 1). The secret-field tokeniser now accepts ten field names round 1 refused (Bug 2). yarn lockfiles send local and alias package names (Bug 3). Killing ow-tools leaves a production session in the profile, contrary to the owner's SA-011 ruling (Bug 4). |
| Feature Completeness | 30% | **7/10** | Deliverables 1–14 are now present, including both review reports. Design §8 Known residuals and §14 are updated, and SA-001 is re-rated (HIGH, impact up). Gaps: the posture report's verdict is "PASS-WITH-NOTES … becomes PASS when SA-010 and SA-012 are fixed", with no re-check after round 2, and Bugs 1 and 5 show both are only partly fixed (C32). C33's per-commit evidence in the PR can't be checked because no PR exists yet. |
| Code Quality | 20% | **7/10** | The test work is strong: 390 ow-tools tests (up from 275), a loopback-only fence around the stub suites, and a regression test named after each round-1 plant. All 22 round-1 slips are now caught, and the only round-1 plant still passing is P03, an equivalent mutant. 33 of 39 new plants are caught. The six slips are boundaries and layers no test reaches on its own. A fix that regresses a guarantee the earlier code held (Bug 2) costs a point. |
| Visual/UX Quality | 20% | **7/10** | The health text table is fixed (one result column, reason in the detail). `help network` now names pip-audit's OSV traffic. doctor tells macOS users to choose "Always Allow" for the keychain item. Capture output says whether the session was kept or wiped. Refusals stay value-free. Still awkward: two refusal families (`unknown-sheet` for an unnamed CSV, `preflight` for the AST layer) reuse older codes for new meanings, so a calling skill can't tell them apart without parsing the message. |

**Weighted Code Score:** 0.3×6 + 0.3×7 + 0.2×7 + 0.2×7 = **6.7 / 10**

### Test Results

| Run | Result |
|---|---|
| `npx vitest run` (full, after `npm ci` in root and `site/`, and `npm run build`) | 130 files, **2409 passed / 2 skipped / 0 failed**, exit 0. Both skips are C8 (no `soffice`) |
| `npx vitest run tests/ow-tools/` | 12 files, **390 passed / 2 skipped**. C21 and the SA-011 real-browser test ran against the installed Chrome with the real keychain and passed |
| `npm run build` | exit 0 (Worker @ 6459474a); `git status --porcelain` empty afterwards |
| `node scripts/check-skill-contracts.mjs` | exit 0 |
| `node scripts/gen-skills-catalog.mjs` | exit 0: 36 skills, ow catalog 2 |
| `node scripts/ow-start-acceptance.mjs` / `node scripts/ow-build-plan-acceptance.mjs` | exit 0 / exit 0 |
| `sync-plugin-skills --check`, `sync-skill-bundles --check`, `gen-mcp-catalog`, `gen-ow-tools-manifest --check`, `lint-internal-refs` | all exit 0 |
| `claude plugin validate --strict` (plugin.json and marketplace.json) | ✔ Validation passed (both) |
| C29 path diff `8aa3145b..HEAD` over the oc- surfaces | empty |
| `.bugcheck.json` | One new `secrets` exception for `docs/audits/2026-10-16-ow-tools-1.1-security-posture.md`, `sha256:6686a9b9…0d00`. It matches the file, and `scripts/verify-candidate.mjs:519–521` refuses a stale digest. It is one path in one scanner, and the file quotes only a canary key header. **Narrow and digest-pinned: acceptable** |

**Test-count claims:** confirmed: 390 ow-tools tests and 2409 in the full suite. The 1.1.0 test files changed by 846 insertions and 19 deletions. Each deletion is a replaced assertion that matches a deliberate change: the mock-keychain flag is gone (SA-011), the blocked count is now 2 because a look-alike sub-resource was added, the pip-audit argv adds OSV, and the no-network detail moved. No 1.0.0 test file was touched.

### Generator's claims, checked

| Claim | Verdict |
|---|---|
| Bug 1: non-semver versions are private in every lockfile form; `sendable` refuses them regardless of `registry: public`; H17/H18 tested in all 7 forms | **True as stated.** The round-1 repro now sends only `lodash@4.17.21`, `versionSource` classes all 23 forms I tried correctly, and the 7-form test exists. **But** the source is still read from the version, never from yarn's key spec, so yarn `file:` dependencies and `npm:` aliases leak by name (Bug 3) |
| Bug 2: tokenised secret-field matching, plus a run-time name/id test | **Partly true.** Underscore, camelCase and digit variants are fixed and tested (17 pre-launch, 4 run-time). **Regression:** concatenated lowercase names that round 1's substring regex refused now pass (Bug 2) |
| Bug 4: thematic-break refusal; exports built in temp and moved only when every format passes | **True.** `---`, `***`, `___` and `- - -` are refused. My probe made Typst, the pandoc docx writer or the pandoc pptx writer fail in a pdf+docx+pptx run with a previous good export present. Each gave exit 5, `export/` was byte-identical afterwards, and `$TMPDIR` was empty |
| Image containment: preflight refuses non-inline images; every Image node in pandoc's AST is checked | **False.** `imagesPandocReads` walks only `.blocks` (`export.mjs:72`), never `.meta`. An image in a YAML metadata block is embedded into the Word export from any absolute path (Bug 1) |
| Advisories: MAL-, CVSS-only and unreadable entries are attention | **True for those shapes.** Still OK: an OSV batch whose `results` is short or empty, one with `next_page_token`, and an id the filter drops (Bug 5) |
| Loopback and link-local refusals, IPv6 allowlist, socket check before any byte, loopback-only fence | **Mostly true.** 18 of 27 origin spellings I tried were refused (3 of the 9 accepted are private ranges the design allows); the IPv6 allowlist holds; R18 (socket check moved back to the response) is caught. Gaps: IPv4-compatible link-local, NAT64/6to4 loopback forms, and DNS names (Bug 6); Teredo, 192.88.99/24, 3fff::/20 and 2001:2::/48 (Bug 7) |
| Excel grid limits; model.md marker refusal; every CSV must be named | **True** (R34–R37 caught). The scoping rule changes the D/V read contract (OD-8) |
| 390 / 2409 tests | **True** |
| `.bugcheck.json` exception digest-pinned and narrow | **True** |

### Criteria C1–C33

| # | Verdict | Evidence |
|---|---|---|
| C1 | **PASS** | Unchanged from round 1 |
| C2 | **PASS** | D02–D05 now caught (`digest-hours.test.js:235–290`), F-018 parent-folder swap caught (R38) |
| C3 | **PASS** | Unchanged; identity on every fixture |
| C4 | **PASS** | K03/K04 caught; F-022 safe-integer cap caught (R39) |
| C5 | **PASS** | K01 (`0.25 × 150 → 30`) and K02 (two batches partly used) now caught |
| C6 | **PASS** | Unchanged; byte-identical, 0600 |
| C7 | **PASS** | X05–X07 caught; outward list covers IMPORT…, IMAGE and FILTERXML |
| C8 | **SKIP (correctly)** | Now cell by cell when it runs (`xlsx-pptx.test.js:418`); `soffice` absent here |
| C9 | **PASS** | Unchanged; P01/P02 caught |
| C10 | **PASS (gap)** | The thematic-break rule is in, and all four forms are refused. P03 is an equivalent mutant (pandoc writes `firstRow`). The deck path is safe from Bug 1 because `---` is refused |
| C11 | **PASS** | Unchanged |
| C12 | **PASS (slip)** | H15 ≤30 boundary now caught. Fail-open shapes remain (Bug 5). CVSS 7.0 band edge untested (R09) |
| C13 | **FAIL** | Bug 1 (round 1) is fixed in every form, but yarn `file:` dependencies and `npm:` aliases are still sent by name (Bug 3) |
| C14 | **PASS** | H03 same-host redirect now caught; headers and fs spy unchanged |
| C15 | **PASS** | H06/H07/H19 caught |
| C16 | **PASS** | No mock keychain (argv assertion, R27 caught); kill and cleanup on crash and timeout |
| C17 | **FAIL** | The words-only rule accepts names round 1 refused (Bug 2). The rest of C17 holds (allowlist, secret values, run-time check: C01 caught) |
| C18 | **PASS** | C06 (look-alike sub-resource) and C07 (cross-origin click) now caught |
| C19 | **PASS** | Unchanged |
| C20 | **PASS** | Unchanged |
| C21 | **PASS** | Real Chrome, real keychain |
| C22 | **PASS** | §14.3 ↔ lib reason-code test passes. New refusals reuse existing codes (UX note) |
| C23 | **PASS** | Unchanged |
| C24 | **PASS** | Unchanged |
| C25 | **PASS (slips)** | H08/H09/H10/R12/R14/R18 caught; loopback-only fence on `health.test.js`. Teredo and 192.88.99 untested (R13, R15); 3fff::/20 and 2001:2::/48 not blocked (Bug 7). Export opens no socket of its own, but pandoc, a child process, would fetch a remote URL in metadata on builds with HTTP support; this Mac's Homebrew pandoc has none (Bug 1) |
| C26 | **PASS** | No 1.0.0 test modified; F-021 key echo caught (R28) |
| C27 | **PASS** | doctor keychain note tested (`sprint-t.test.js:365`) |
| C28 | **PASS** | Unchanged |
| C29 | **PASS** | Path diff empty; sync and catalog checks agree |
| C30 | **PASS** | `--check` passes |
| C31 | **PASS** | Unchanged |
| C32 | **PARTIAL** | Both reports exist, and SA-001 is re-rated. The diff audit is PASS-WITH-NOTES (allowed). The posture verdict is **PASS-WITH-NOTES, conditional on SA-010 and SA-012 being fixed**. Nobody has re-checked, and Bugs 1 and 5 show both are partly open. The contract gate needs posture **PASS** |
| C33 | **PARTIAL** | Tests, build and `validate --strict` are green; no PR yet, so the per-commit verifier evidence can't be checked |

### Plants

**Round-1 plants re-run:** 59 planted, **58 caught**, 1 slipped (P03, an equivalent mutant: pandoc already writes `firstRow="1"`). All 22 round-1 slips are now caught. Five anchors moved with the code and were re-targeted to the same mutation: H02 (scopes), H08 (CGNAT in `addr.mjs`), C01 (`secretName`), C09 (lower-casing in `nameWords`) and E01 (the staged move).

**New round-2 plants:** 39 planted, **33 caught, 6 slipped**:

| Area | Planted | Caught | Slipped |
|---|---:|---:|---|
| lockfiles / sendable / own scope | 4 | 4 | — |
| advisories, CVSS, pip-audit | 7 | 5 | R09 CVSS band `≥ 7` → `> 7` · R10 MAL- checked after a named severity (a MAL entry with `severity: LOW` rates low) |
| addresses, origins, socket check | 7 | 5 | R13 Teredo unblocked · R15 192.88.99/24 unblocked |
| capture tokeniser, wipe, keychain, F-021, F-023 | 10 | 9 | R26 start-of-run cache clean removed (the test only proves the end-of-run clean) |
| export, images, pptx, preflight | 5 | 4 | R29 AST check skipped for pdf/docx (every test form is refused by the preflight first; the AST layer is only unit-tested) |
| xlsx | 4 | 4 | — |
| digest, calc | 2 | 2 | — |

**Behaviour probes** (the real code, not mutations), as the coordinator asked:

| Probe | Result |
|---|---|
| Non-semver forms: `file:`, `link:`, `workspace:`, `portal:`, `exec:`, `github:`, `gitlab:`, `bitbucket:`, `npm:alias@x`, `user/repo#sha`, `v1.0.0`, `1.0`, `*`, `latest`, `git+ssh`, tarball URL, `patch:` | All held. **But** the yarn key spec is never read: Bug 3 |
| Secret fields: `passcode`, `securityCode`, `verification_code`, `cc-number` | All refused |
| Secret fields: `iban`, `account_number`, `verifyCode`, `recovery_code`, `backup_code`, `smsotp`, `otpvalue`, `privatekey`, plus 10 round-1 regressions | Accepted: Bug 2 |
| Export failure in pdf, docx and pptx (stub Typst, pandoc docx writer, pandoc pptx writer) with an older good export present | exit 5 each; `export/` byte-identical; temp folder removed |
| Image forms: raw `<img>`, data URI, reference, collapsed, shortcut, single-quoted title, brackets | Refused, or dropped by pandoc. Raw HTML hidden in escaped backticks passes the preflight but is dropped by pandoc, so nothing is embedded (Bug 8) |
| Image in a YAML metadata block (escaped `!\x5B…](/abs/path)`) | **Embedded in the DOCX**, byte-identical to the file: Bug 1 |
| Advisory shapes still OK | Short or empty `results`, `next_page_token`, an id with a space or over 80 characters: Bug 5 |
| Loopback/link-local spellings (27 tried) | Refused: `127.1`, `0x7f.0.0.1`, `2130706433`, mapped, compatible, `[::]`, `0`, `0.0.0.0`, `localhost.`, `LOCALHOST`, `foo.localhost.`, `169.254.169.254`, `[fe80::1]`, mapped link-local. **Accepted:** `[::a9fe:a9fe]`, `[64:ff9b::7f00:1]`, `[2002:7f00:1::]`, `127.0.0.1.nip.io`, `metadata.google.internal`, `instance-data` (Bug 6) |
| Socket check bypass | None found in code: requests always use `createConnection`; R18 caught |
| Grid bounds | `A1048577`, `XFE5`, `A9999999` refused; `XFD1048576` written sparse in one cell |
| Production wipe on a failed run | Browser crash: wiped (tested). **ow-tools killed (SIGTERM): session kept** (Bug 4) |

### Bugs Found

Ordered by severity. B = blocking, M = major, m = minor.

1. **[M] A Word export embeds any file on disk through a YAML metadata block (SA-010 not closed).** pandoc's `gfm` reader has `yaml_metadata_block` on, so a YAML block is parsed and its values are Markdown. The image layers both miss it. The preflight line check looks for a literal `![`, which a YAML escape (`\x5B` for `[`) hides. `imagesPandocReads` walks only `JSON.parse(stdout).blocks` (`plugins/ow-tools/lib/export.mjs:72`), never `.meta`. The docx writer renders `abstract` (and title, author, date) from metadata in its standalone output.
   **Repro** (normal skill-written form, with the ow header and banner): `guide.md` = header, banner, then
   ```
   ---
   abstract: "!\x5Bdiagram](/abs/path/elsewhere/client-secret.png)"
   ...
   ```
   then `# Guide`. `ow-tools export guide.md --formats docx,pdf` exits 0. `export/guide.docx` contains `word/media/rId9.png`, sha256 identical to the file outside the document folder. PDF is unaffected (the Typst body is not standalone). PPTX is unaffected because `---` is refused. Remote fetch: a URL in the same place would be fetched by pandoc builds with HTTP support. This Mac's Homebrew pandoc reports "compiled without HTTP support", so that part is not verified here.
   **Fix:** read with `-yaml_metadata_block` in both `PANDOC_FROM` and `PANDOC_DECK_FROM`, and walk `.meta` in `imagesPandocReads` as a second layer. Add the escaped-YAML repro as a test for docx, pdf and pptx.
2. **[M] The secret-field tokeniser regresses round-1 coverage.** `secretName` (`plugins/ow-tools/lib/capture.mjs:35–58`) matches whole words only. These ten names were refused by round 1's regex and are now accepted, both before launch and at run time (`:493`): `newpassword`, `confirmpassword`, `loginpassword`, `userpassword`, `loginpwd`, `passwort`, `mot_de_passe`, `totpcode`, `mfatoken`, `cardcvc`. Password fields are usually still caught at run time by `type=password`, but not behind a show-password toggle, which switches the field to `type=text`. OTP fields named like `totpcode` without `autocomplete` are typed into. Also missed by both versions: `smsotp`, `emailotp`, `otpvalue`, `otpinput`, `verifyCode`, `recovery_code`, `backup_code`, `privatekey`.
   **Repro:** `secretName("newpassword") === false`, and `readPlan` accepts a `fill` on `#newpassword` or `#totpcode`.
   **Fix:** keep the word rule and add a stem rule. Match `password`, `passwd`, `passwort`, `pwd`, `passcode`, `passphrase`, `totp`, `otp` (as a prefix or suffix of a word), `mfa`, `cvv`, `cvc`, `token` and `secret` *inside* a lower-cased word. Add `recovery code`, `backup code` and `verify code`. Plant all of these.
3. **[M] yarn lockfiles: the key spec is ignored, so local and alias packages leave under their own names.** `parseYarn` (`plugins/ow-tools/lib/lockfiles.mjs:121–155`) takes the name from the key (`keyName`, `:115`) and the source only from `resolved`/`resolution`.
   (a) yarn v1 writes no `resolved` for `file:` dependencies. Under `registry: public`, `"acme-billing-internal@file:../acme-billing-internal": version "3.2.1"` is sent to OSV, and `GET registry.npmjs.org/acme-billing-internal/latest` follows. Design §8 says a local package is never sent.
   (b) `npm:` aliases (`"acme-internal-shim@npm:left-pad@1.3.0"`) are sent under the alias label. In yarn v1 that happens even *without* `registry: public`, because `resolved` is the public registry. The real package (left-pad 1.3.0) is never checked, so its advisories are missed.
   **Repro** (stub servers): the OSV body carries `acme-billing-internal@3.2.1` and `acme-tarball@1.0.0`; npm GETs `/acme-billing-internal/latest`. The alias case: `sendable` returns `acme-internal-shim@1.3.0` with `registry: null`.
   **Fix:** classify a key spec with `@file:`, `@link:`, `@portal:`, `@workspace:`, `@git…`, `@http…` or `@github:` as local or private. For `@npm:<real>@<v>`, use the real name and version. Add v1 and berry fixtures for both.
4. **[M] A killed run keeps the production session (SA-011 ruling not met on the likeliest failure path).** ow-tools installs no signal handler (`grep` finds none in `lib/` or `bin/`). The wipe sits in a `finally` (`capture.mjs:592–600`), which doesn't run when Node is terminated. The start-of-run clean (`:552`) removes caches only.
   **Repro** (fake browser, `hang: true`): run a production plan with `Default/Cookies` and `Default/Network/Cookies` planted, then `kill -TERM` ow-tools after 3 s. Both cookie stores are still there, and the next run on the profile (any environment) starts with them.
   This is likely in practice. `--sign-in` waits up to 300 s by default, while Claude Code's Bash tool kills a command after 120 s by default; an interrupt does the same.
   **Fix:**
   - Write a `production-pending` marker before launch.
   - Wipe the session at the start of any run that finds the marker.
   - Handle SIGTERM, SIGINT and SIGHUP: wipe synchronously, kill the browser group, then exit.
   - Test it with a `kill -TERM` of the CLI.
5. **[m] Advisories can still fail open.** These OSV batch responses all give "N package(s) sent; N with no known advisory" and OK: `results` shorter than or missing for some queries (`{"results": []}`), a query result with `next_page_token` (vulns paginated away), or a vuln id the filter at `plugins/ow-tools/lib/health.mjs:314` drops (a space, or over 80 characters). SA-012's "fail closed" isn't true for these. **Fix:** make the file `not checked (advisory service answered with an unexpected shape)` when `results.length !== queries.length` or any `next_page_token` is present, and make a dropped id attention, not a skip.
6. **[m] Capture origin rules are literal-only.** These are accepted as origins: `[::a9fe:a9fe]` (IPv4-compatible 169.254.169.254; `isLinkLocalHost`, `addr.mjs:92`, checks only mapped and fe80), `[64:ff9b::7f00:1]` and `[2002:7f00:1::]` (NAT64 and 6to4 forms of 127.0.0.1), and DNS names that resolve to loopback or metadata (`127.0.0.1.nip.io`, `metadata.google.internal`, `instance-data`). The host-resolver map then lets Chrome resolve them normally. **Fix:** reuse `blockedAddress`' embedded-IPv4 logic in both host checks, and either resolve the allowed hosts before launch (refusing loopback or link-local answers) or record the DNS-name case in §8 Known residuals.
7. **[m] Address and advisory boundaries untested or missing.** Plants R13 (Teredo) and R15 (192.88.99/24) slip. `blockedAddress` doesn't block 3fff::/20 (documentation, RFC 9637) or 2001:2::/48 (benchmarking). R09 (the CVSS 7.0 band edge) and R10 (a `MAL-` entry with a named LOW severity) slip; the code is right today for R10, but nothing pins the order. R26 (start-of-run cache clean) and R29 (the pandoc AST layer for pdf/docx, only ever reached after the preflight passes) slip.
8. **[m] The preflight's raw-HTML refusal is bypassed with escaped backticks.** `` \`<img src="/abs/x.png">\` `` passes, because `preflight.mjs` strips `` `…` `` pairs before the HTML check without honouring `\`` escapes. pandoc then drops the raw HTML, so nothing is embedded (checked in docx and pptx). That makes it harmless today, but the "raw HTML is not exported" message is not reliable.
9. **[m] C32's posture verdict needs a re-check.** The posture report ends PASS-WITH-NOTES with conditions (SA-010, SA-012 fixed; SA-011 decided; claims corrected), and there is no addendum recording that the conditions were met. Bugs 1 and 5 show they are not. After the fixes, add a re-check note to `docs/audits/2026-10-16-ow-tools-1.1-security-posture.md` that turns the verdict to PASS, and re-pin its digest in `.bugcheck.json`.

### The Generator's self-added scope rules

| Rule | Ruling | Reason |
|---|---|---|
| Every data CSV in a sheet folder must have a `## Sheet:` section in model.md (else exit 4 `unknown-sheet`) | **OWNER-DECISION (OD-8): recommend accept** | It closes a real gap (SA-018: an unreviewed CSV shipping in a client workbook). But it **changes the read contract** design §5.9 gave Sprints D and V ("then any other CSV by name"), and it reuses `unknown-sheet`, so callers can't tell "model names a missing CSV" from "CSV not named in the model". Recommend: accept; give it its own reason code (`sheet-not-in-model`); record it in §14 as a contract change; flag it to Sprints D and V |
| Link-local origins (169.254/16, fe80::/10) are refused for capture | **Acceptable**, no owner decision needed | The same intent as the owner's "never loopback" ruling, cheap, and it protects metadata services. Its literal-only reach is Bug 6 |
| The `autocomplete` list is fixed (`current-password`, `new-password`, `one-time-code`, `cc-number`, `cc-csc`, `cc-exp…`) | **Acceptable** | These are the HTML-standard tokens that name a credential or a card secret. Other tokens (`cc-name`, `username`, `email`) are not secrets. The name rule (Bug 2) is the part that needs work |

### OWNER-DECISIONs carried

- **OD-8:** the CSV scoping rule (above).
- **SA-011 follow-through:** the owner ruled "wipe cookies after any production run". Bug 4 shows a killed run is not covered today. The fix is in the Generator's hands and needs no new decision, unless the owner wants `--sign-in` with production refused outright instead.

### Gaps vs Contract

- C13 and C17 fail on Bugs 3 and 2.
- C32: the posture verdict has to turn PASS after a re-check (Bug 9).
- C33: per-commit verifier evidence in the PR; no PR yet.

### Verdict: **FAIL**

Every rubric score is ≥ 6 (6 / 7 / 7 / 7, weighted 6.7), but four major defects are open (Bugs 1–4), and C13 and C17 fail. The round-1 fixes are real, and the test suite is now the strongest part of this sprint. What remains are four specific holes on the privacy and security paths. Fixes, in order:

1. **Turn off `yaml_metadata_block` for every export** and walk `.meta` in the AST check (Bug 1).
2. **Add a stem rule beside the word rule** for secret fields, covering the ten regressions and the OTP and recovery-code names (Bug 2).
3. **Read yarn key specs** for `file:`/`link:`/`portal:`/git/URL sources and `npm:` aliases (Bug 3).
4. **Make the production wipe survive a kill**: a pending marker honoured at the start of every run, plus signal handlers (Bug 4).
5. **Close the minors** (Bugs 5–8), have the reviewer record the posture re-check (Bug 9), and take OD-8 to the owner.
