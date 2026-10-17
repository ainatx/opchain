## Sprint T — Evaluation Round 1

**Sprint:** ow-tools 1.1.0 (contract `sprints/release-2.1/ow-sprint-t/contract.md`, C1–C33, T1–T7) · **Branch:** `claude/ow-tools-sprint-t`, head `62af404f` (base `8aa3145b`) · **Evaluator:** skeptical Evaluator, oc-app-architect Phase 6 · **Date:** 2026-10-16

Graded from the contract, the 1.1.0 amendment of `docs/plans/2026-10-09-ow-tools-design.md` (§4.2, §5.6–§5.10, §8, §12, §14), the T-amendment designs it cites (`docs/plans/2026-10-16-ow-care-design.md` §6 and §11, ow-documentation, ow-draft), the capture spike and the diff. Every plant was made in a detached evaluation checkout and reverted after its run, and no tracked file in the Generator's worktree was touched. No real network traffic was sent: health ran only with `--no-network` or with the injected stub connector (`tests/ow-tools/health-stubs.mjs`).

**Owner rulings applied** (coordinator, 2026-10-16). These are graded as decided, not as defects:
- `--sign-in` runs the steps in the same headed window, and the spike's GO stands.
- OSV receives every public-registry package, indirect ones included, as name and version only.
- Capture origins must be https and not loopback; plain-http environments are unsupported.

### Code Scores

| Criterion | Weight | Score | Justification |
|---|---|---|---|
| Functionality | 30% | **6/10** | All six parts work end to end. Real pandoc, the real Chrome (C21) and the in-process TLS, RDAP, OSV and HTTP stubs all pass, and so do the fence, the shots guard, the profile delete and the formula guards. But the two riskiest guarantees each fail on an ordinary input. Health sends a client's private git URL and private registry host to `api.osv.dev` when an npm v1 lockfile is read under `registry: public` (Bug 1). Capture types into OTP, MFA and PIN fields named with an underscore or in camelCase (`otp_code`, `mfaCode`, `pin_code`), both before launch and at run time (Bug 2). A deck with a `---` exits 5 but leaves an unbranded, bannerless 0644 deck in `export/` (Bug 4). |
| Feature Completeness | 30% | **6/10** | Deliverables 1–13 are present: seven verbs and parts, version 1.1.0 everywhere, doctor rows, the regenerated manifest, design §14 with the four read contracts, the §4.2 calls table (11 new rows plus T5), README and SKILL.md, the T5 test, and the residual fixes SA-007, SA-008, F-005 to F-008 and F-010. **Deliverable 14 is missing:** neither security review report exists under `docs/audits/`, SA-001 is not re-rated, and §8's Known residuals still defer to a review that hasn't happened (C32 FAIL, Bug 3). Contract step 10 puts the review *before* the evaluator rounds. The per-commit verifier evidence in the PR (C33) can't be checked because no PR exists yet. |
| Code Quality | 20% | **6/10** | The code is clean, built from Node built-ins and argv-only spawns, and its refusals carry stable reason codes. The test harnesses are a real strength: a preload fence, injected stub servers, a CDP stub over fds 3/4 and a real-binary path. I planted **59 failures; 37 were caught and 22 slipped** (20 genuine, plus 1 equivalent mutant and 1 that only changes the reason code). The slips cluster in exactly the variants the contract warned about: DNS answers with more than one address, a redirect to the same host, unrecorded-registry rules outside pnpm, the run-time secret check, exact origin matching, post-click origin, TOCTOU, rounding and the oldest-first order. |
| Visual/UX Quality | 20% | **7/10** | `help` is clear and complete. Every new refusal has a reason code with a next step in design §14.3. Refusal messages name a key, cell, step or line and never the value (canary plants passed). The digest note prints on every run. Weak points: `calc hours` prints raw JSON without `--json` (consistent with 1.0.0 `calc`); the health text table nests parentheses and overruns its column; and `help network` leaves out pip-audit's PyPI traffic, which README and the manifest disclose. |

**Weighted Code Score:** 0.3×6 + 0.3×6 + 0.2×6 + 0.2×7 = **6.2 / 10**

### Test Results

| Run | Result |
|---|---|
| `npx vitest run` (full, after `site` deps and `npm run build`) | 130 files, **2294 passed / 1 skipped / 0 failed**, exit 0. The one skip is C8 (no `soffice`) |
| `npx vitest run` (full, fresh checkout before the build) | 2 failed (`mcp-hosted-references`, which needs `public/`) and 6 suites unloadable (no `site/node_modules`). This is environmental: all pass once the build has run |
| `npx vitest run tests/ow-tools/` | 12 files, **275 passed / 1 skipped**. C21 ran against the real Chrome (1.7 s) |
| `npm run build` | exit 0 (Worker built @ 62af404f); `git status --porcelain` empty afterwards |
| `node scripts/check-skill-contracts.mjs` | exit 0 |
| `node scripts/gen-skills-catalog.mjs` | exit 0: 36 skills; ow catalog 2 skills |
| `node scripts/ow-start-acceptance.mjs` / `ow-build-plan-acceptance.mjs` | exit 0 / exit 0 (golden runs pass) |
| `sync-plugin-skills --check`, `sync-skill-bundles --check`, `gen-mcp-catalog`, `gen-ow-tools-manifest --check` | all exit 0 |
| `claude plugin validate --strict plugins/ow-tools` (plugin.json and marketplace.json) | ✔ Validation passed |
| `git diff 8aa3145b..HEAD --stat -- skills/ plugins/opchain/ src/ public/ site/ package.json package-lock.json .claude-plugin/ mirror/ skills-work/` | empty (C29) |
| `git diff 8aa3145b..HEAD --stat -- tests/ow-tools/` | 9 new files and 1925 insertions; **no 1.0.0 test file modified** (C26) |
| Node 20 | not run: no Node 20 is installed here. A static scan of `lib/` and `bin/` finds no post-20 API (`withResolvers`, `Set.union`, `import.meta.dirname`, `zlib.crc32` and the like) |

**New tests:** 96 `it` blocks across `capture`, `health`, `digest-hours`, `xlsx-pptx` and `sprint-t`, plus the fake browser, the fence, the stub servers and the fixtures. Every contracted test requirement is delivered (stub pandoc, fake browser, pinned pip-audit argv, injected stubs, fence, real-binary skips, golden fixtures, the opt-in live script), so no test penalty applies.

### Generator's claims, checked

| Claim | Verdict |
|---|---|
| Every C1–C33 has a test at the cited line | **Mostly true.** Each criterion except C32 and C33 has a test that really exercises it, not just one named after it. C8's test checks only the grand total (Bug 12). C32 (the review reports) has no test and no artefact |
| Capture spike GO; `--sign-in` runs the steps in the same headed window | True, and the owner has confirmed it. `capture-spike.md` evidence is consistent with §5.6 and §14.2 |
| Health headers exact | **True:** plants H04 (extra `Accept-Language`) and H05 (an extra header on GETs only) are both caught at `health.test.js:151` |
| Only public-registry packages go to OSV | **False** under `registry: public` with an npm v1 lockfile: git and tarball dependencies keep their URL in `version` and are sent (Bug 1). True for every fixture form the suite tests |
| `--no-network` sends nothing | **True:** H06 (a DNS lookup), H07 (the RDAP bootstrap) and H19 (pip-audit spawned) are all caught |
| Every request goes through the injected connector (`health.test.js:143`) | **True:** H11 re-plants the `agent: false` regression and the connector-count assertion catches it |
| C8 skipped (no LibreOffice); Node 20 not run | True: both were confirmed absent here |
| 37 differing build outputs are existing build nondeterminism | Not independently verified. `npm run build` leaves no tracked change, and C29's contracted checks (path diff, sync checks, MCP catalog) all agree |
| 1.0.0 behaviour changes | Verified against callers (§ OWNER-DECISION 5). No skill in `skills-work/` reads `skipped`, passes `--holidays` with `--days`, quotes a brand refusal, or depends on export file modes |

### Criteria C1–C33

| # | Verdict | Evidence |
|---|---|---|
| C1 | **PASS** | `digest-hours.test.js:26` compares the result with `shasum -a 256` and checks the note in both JSON and text. Checked by hand: `ow-tools digest` on a folder prints the note line |
| C2 | **PASS (with slips)** | Tests cover mtime, mode, `cp -R`, creation order, the change cases, three symlink placements, Finder litter and the one-liner (`:38–:109`). My D01 (follow symlinks) was caught. **Slipped:** D02 (drop `O_NOFOLLOW`, the TOCTOU guard §5.10 claims); D03 (skip *every* dotfile, so a `.env` change goes undetected); D05 (stop refusing FIFOs and devices); D04 (UTF-16 sort, which differs only for astral names) |
| C3 | **PASS** | `:121`: M-01 used 300, rolled 45, lapsed 135; M-02 available 525, used 600, extra 75; the identity holds on every fixture month. Matches ow-care §6 (8 h tier, 0.75 h rolled, 1.25 h extra) |
| C4 | **PASS** | `:144–:179`: not a quarter-hour and over-available give exit 4 naming the entry id; negative values and unknown kinds give exit 2; rolled-in hours lapse. K03 (a late lapse) and K04 (extra ignored) were caught |
| C5 | **PASS (with slips)** | `:181`, `:189`. K05 (included used before rolled-in) was caught. **Slipped:** K01 (`Math.round` instead of rounding down to the quarter-hour; every fixture share × minutes is already a multiple of 15) and K02 (newest batch first; the only months-N fixture exhausts every batch) |
| C6 | **PASS** | `xlsx-pptx.test.js:61, :85`: `<f>` with no `<v>`, a bold frozen header, formats, Sources, `fullCalcOnLoad`, byte-identical output, 0600 |
| C7 | **PASS (with slips)** | `:107–:135`: one plant per refusal, and formula-looking CSV written as text with the quote prefix. X01–X03 were caught. **Slipped:** X05 (no column bound on references), X07 (formula allowed in the header row), X06 (`IMPORTXML`/`IMAGE` dropped from the outward list; still refused, but as `function-not-allowed`) |
| C8 | **SKIP (correctly)** | `:144` skips and says so without `soffice`. When it runs, it checks only that the grand total appears (Bug 12) |
| C9 | **PASS** | `:227` (real pandoc 3.x): 6 slides, 6 notes slides, one title per slide, theme colours and fonts, the master logo with its description, the banner on every slide, no title slide. P02 (banner on the first slide only) was caught. The failure path leaves an unbranded deck (Bug 4) |
| C10 | **PASS (gap)** | `:253`, `:285–:316`: the 1.0.0 rules run on decks, descriptions and header rows are checked, and every part is grepped for internal text. P01 (deck built from raw text) and P04 (H3 rule removed) were caught. P03 (no `firstRow` edit) is an **equivalent mutant**: pandoc already writes `firstRow="1"`. The deck rules miss a thematic break (`---`), which pandoc turns into an extra slide (Bug 4) |
| C11 | **PASS** | `health.test.js:54`: 13 refusals with a canary, never echoed; H16 (userinfo accepted) was caught |
| C12 | **PASS (slip)** | `:90–:141`: three-way results, the O10 defaults, an override, an unreachable host, no lockfile, RDAP with a 30-day cache. **Slipped:** H15 (`<` instead of `≤`: a certificate at exactly 30 days becomes OK) |
| C13 | **FAIL** | Seven lockfile forms parse to one set (`:163`), and `internal-lib` is never sent (`:171`). But **Bug 1**: npm v1 git and tarball dependencies are sent to OSV and npm under `registry: public`. **Slipped:** H17 (yarn berry `npm:` treated as public without `registry: public`) and H18 (npm entries without `resolved` treated as public). The "unrecorded needs `registry: public`" rule is tested on pnpm-v6 only |
| C14 | **PASS (slip)** | `:143`: before/after tree hash, method and header-set assertions, a cross-host 301 not followed; `:230` fs spy. H04, H05, H13 and H14 were caught. **Slipped:** H03 (`net.request` follows a **same-host** redirect; the only 3xx fixture is cross-host) |
| C15 | **PASS** | `:264`: zero fence attempts, `network off` on every network check; H06, H07 and H19 were caught |
| C16 | **PASS** | `capture.test.js:61, :81`: pipe and never a port, a 0700 profile, prefs, `First Run`, download deny, the process gone and caches removed on success, crash and timeout. C04 and C15 were caught |
| C17 | **FAIL** | The allowlist and the no-cookie, no-storage, no-`Runtime` checks hold (C03 caught), and so do secret values (C16 caught). But the selector and run-time **name/id** check misses common variants (Bug 2). The run-time name/id check is itself untested (C01 slipped: removing it passes the suite) |
| C18 | **PASS (slips)** | `:148–:192`: redirect plant, sub-resource blocked and counted, 9 pre-launch plants, the decision echoed unverified. C05 and C08 were caught. **Slipped:** C06 (the Fetch guard matches by prefix, so `https://uat.example.test.evil.org` passes) and C07 (the origin check skipped after click steps). The code itself is exact and checks every step |
| C19 | **PASS** | `:194`, `:209`: IHDR size, names, 0600, git-clean repo; shots guard with the `.tmp-` sibling; C12 and C13 caught |
| C20 | **PASS** | `:230–:272`: 8 bad ids, a symlinked profile, exactly one removed; C10 (case variant on a case-insensitive FS) and C11 (containment removed) caught |
| C21 | **PASS** | Ran against the real Chrome (`capture.test.js:288`, 1.7 s, 900×600 PNGs) |
| C22 | **PASS** | `sprint-t.test.js:144` (reason codes in lib ↔ §14.3), `:172` (11 caller rows with absent-cases), `capture.test.js:274`, `xlsx-pptx.test.js:318`. No reason code is passed as a variable |
| C23 | **PASS** | `sprint-t.test.js:155` parses §4.2 against `VERBS` and `FLAGS` |
| C24 | **PASS** | `sprint-t.test.js:116–:134`: guards pass under ow-start's two lines; `workstream` is `logs/acme`; the §4.2 row is exact |
| C25 | **PASS (slips)** | (a) static `:197`; (b) runtime fence over 17 verbs plus the hook `:225`; (c) `health.test.js:278`; (d) `:197`. H08, H12 and N01 caught (N01: a dynamic `import("node:http")` gets past the static check (a) but is caught by (b)). **Slipped:** H09 (check `list[0]`, connect to `list[last]`) and H10 (check only the first answer). No test feeds a multi-address DNS answer, although "a rebinding can't slip past" is the stated rule |
| C26 | **PASS** | No 1.0.0 test modified; canary plants in health, capture and xlsx; no-private-names and no-gate-words cover every plugin file |
| C27 | **PASS** | `sprint-t.test.js:263, :286`: stubs never invoked, no socket, `pip-audit` optional, cheap readiness ≤ 160 characters |
| C28 | **PASS** | `:302`: spawn targets ↔ manifest; no Chrome-for-Testing; imports `node:`/`./` only |
| C29 | **PASS** | Path diff empty; sync checks and MCP catalog agree |
| C30 | **PASS** | `--check` passes; version line 1.1.0; Network, Programs and Files sections asserted |
| C31 | **PASS** | `plugin.json` and both marketplace fields 1.1.0; `version --json` lists 8 capabilities |
| C32 | **FAIL** | Residual fixes each have a test (F-005, F-006, SA-007 a/b, SA-008, F-010, F-007, F-008). **Neither review report exists** (`docs/audits/` has no 1.1.0 posture or diff audit), SA-001 is not re-rated, and §8's Known residuals were not updated from a review (Bug 3) |
| C33 | **PARTIAL** | `npm test`, `npm run build` and `claude plugin validate --strict` are green. Per-commit verifier evidence "recorded in the PR" can't be checked: no PR yet |

### Plants

59 plants: **37 caught, 22 slipped** (20 genuine slips, 1 equivalent mutant P03, 1 reason-code-only X06). Each plant changed one file, ran the relevant vitest file(s), then restored the original bytes. The harness is `plants.mjs` and the per-plant results are in `plants.jsonl`, beside this report.

| Area | Planted | Caught | Slipped |
|---|---:|---:|---|
| health / net / lockfiles | 19 | 13 | H03 same-host redirect followed · H09 check first, connect last · H10 check only first answer · H15 cert `<` vs `≤` · H17 yarn berry `npm:` → public · H18 npm no-`resolved` → public |
| capture / cdp | 16 | 12 | C01 run-time name/id check removed · C06 Fetch guard prefix match · C07 origin check skipped after click · C14 popups not closed |
| digest | 5 | 1 | D02 no `O_NOFOLLOW` · D03 all dotfiles skipped · D04 UTF-16 order · D05 FIFOs/devices hashed |
| calc hours | 5 | 3 | K01 rounding to nearest · K02 newest batch first |
| xlsx | 7 | 3 | X04 CSV size cap removed · X05 no column bound · X06 (reason code only) · X07 formula in header |
| pptx / export | 6 | 4 | P03 (equivalent: pandoc sets `firstRow`) · E01 pdf/docx/pptx not chmod 0600 |
| network fence | 1 | 1 | — |

Caught highlights: a private https tarball treated as public; private scopes ignored; any extra header; DNS, RDAP or pip-audit under `--no-network`; CGNAT unblocked; the `agent: false` connector bypass; POST to any host; a `.npmrc` read; a write into the repo; `Runtime.evaluate` on the allowlist; a debugging port; production without a decision; a loopback origin; a case-sensitive secret pattern; the delete-profile escapes; the shots guard; PNG mode; downloads; secret values; symlink following; a late lapse; CSV `=` as a formula; quote prefix; `INDIRECT`; internal text in the deck; banner on one slide only; the deck H3 rule; record mode.

### Bugs Found

Ordered by severity. B = blocking, M = major, m = minor.

1. **[M] health sends private git URLs and private registry hosts to OSV and npm.** `plugins/ow-tools/lib/lockfiles.mjs:40–45` (npm v1 `walk`) leaves `source` "unrecorded" for a dependency whose `version` is a git or tarball URL with no `resolved`, which is how lockfile v1 records them. `plugins/ow-tools/lib/health.mjs:244` then sends every unrecorded package when `health.yaml` says `registry: public`, as the shipped fixture and the design example both do. This contradicts design §5.8 ("never when it … resolves to … a git URL or a tarball") and the README's "Packages from a private registry … are never sent". **Repro** (stub servers, no real traffic): an npm v1 lockfile with `"acme-core": {"version": "git+ssh://git@github.com/acme-client/acme-core.git#0123…"}` and `"acme-ui": {"version": "https://npm.acme-client.internal/acme-ui/-/acme-ui-2.0.0.tgz"}`, plus `registry: public`. OSV POST body: `{"package":{"name":"acme-core"},"version":"git+ssh://git@github.com/acme-client/acme-core.git#0123456789abcdef"}, {"package":{"name":"acme-ui"},"version":"https://npm.acme-client.internal/…"}`. The npm GETs include `/acme-core/latest` and `/acme-ui/latest`. `--no-network` reports "3 public, 0 held back". **Fix:** classify a v1 `version` that isn't semver (URL, `git+`, `github:`, a path) as private or local, whatever `resolved` says. Send an unrecorded package only when its version is plain semver. Add a v1 fixture with git and tarball deps.
2. **[M] Capture's secret-field rule misses the commonest OTP, MFA and PIN field names.** `plugins/ow-tools/lib/capture.mjs:31–32` wraps `otp`, `mfa`, `pin` and `ssn` in `\b…\b`, and `one-?time` and `card-?num` admit no `_`. So `otp_code`, `otpCode`, `otp1`, `mfa_code`, `mfaCode`, `one_time_code`, `pin_code`, `pincode`, `card_number` and `ssn_last4` all pass. That holds both before launch (`:111`, selector text) and at run time (`:445`, `name`/`id`), unless the page also sets `autocomplete="one-time-code"` or `type=password`. Design §5.6 says text *matching* `otp`, `mfa`, `pin` and the rest, any case. **Repro:** `readPlan` accepts a `fill` on `#otp_code`, `[name=otp_code]`, `#mfaCode` and `input[name=pin_code]`, and `SECRET_NAME.test("otp_code") === false`. **Fix:** treat `_` and camelCase boundaries as word boundaries: split identifiers on `[_\-\s]` and lower→upper case changes, then match the tokens. Add these variants as plants, and add a run-time name/id test (plant C01 shows the run-time branch is untested).
3. **[M] The security review (deliverable 14, C32) has not been done.** `docs/audits/` has neither `…-ow-tools-1.1.0-security-posture.md` nor `…-pr-<n>-diff-audit.md`. SA-001 is not re-rated, although the contract asks for that because capture widens what a compromised update reaches. Design §8 Known residuals (`docs/plans/2026-10-09-ow-tools-design.md:506–516`) and §14.6 still describe the review as future. Contract Technical approach step 10 orders "Security review and fixes, then the evaluator rounds". Bugs 1 and 2 are exactly what a posture pass on health egress and capture credentials should have found.
4. **[M] A pptx run that fails after pandoc leaves an unbranded, bannerless, 0644 deck in `export/`.** pandoc writes straight to the final path (`plugins/ow-tools/lib/export.mjs:223–226`). `brandPptx` then throws exit 5 on a slide-count mismatch (`plugins/ow-tools/lib/pptx.mjs:192`), before the banner is added, before `chmodSync(…, 0o600)` (`export.mjs:232`) and before the export record. The deck rules (`pptx.mjs:23–79`) refuse two visuals per slide "because pandoc would split it", but not a thematic break (`---`, `***`), which pandoc also turns into a new slide. **Repro:** a deck with banner `CONFIDENTIAL — Acme`, `## One`, `First part.`, `---`, `Second part.`, `## Two` gives exit 5 "pandoc made 3 slides from 2 slide headings". `export/deck.pptx` remains, `-rw-r--r--`, 3 slides, `CONFIDENTIAL` on none of them, with no record. A previous good deck at that path is overwritten. **Fix:** render into the temp folder and `writePrivate` into `export/` only after branding and checks pass, for docx too, which has the same 1.0.0 pattern. Add a deck rule refusing thematic breaks.
5. **[m] The network rules have untested variants** (all in `tests/ow-tools/health.test.js`). Plant H03 shows `net.request` could follow a same-host redirect and pass: the only 3xx fixture points to another host. Plants H09 and H10 show the multi-address rule ("any answer in a blocked range refuses") and connect-to-checked-address are never exercised, because every stub answer has one address. Plant H15 shows the 30-day boundary (`≤`) is untested. **Fix:** add a same-host 302 fixture, resolver answers `["203.0.113.10","10.0.0.5"]` and the reverse order, and a certificate expiring in exactly 30 days.
6. **[m] The C13 "unrecorded registry" rule is tested on pnpm-v6 only.** Plants H17 (yarn berry `npm:` → public) and H18 (npm v2/v3 entry without `resolved` → public) slip. **Fix:** run the not-declared case over every lockfile form, plus Bug 1's v1 case.
7. **[m] Capture guard branches are untested.** These run-time checks can be removed or loosened without failing a test: name/id (C01), exact-origin matching in the Fetch guard (C06: prefix matching admits `uat.example.test.evil.org`), the post-click origin check (C07: a click that navigates away is never planted) and closing popups (C14). The code is correct today. **Fix:** add a fake-browser page whose field has `name="password"` only, a sub-resource on `https://uat.example.test.evil.org`, a click that navigates cross-origin, and a `Target.targetCreated` event.
8. **[m] Digest guards are untested.** Plants show these can go without a test failing: `O_NOFOLLOW` (D02), which §5.10 claims as the TOCTOU guard; the exact Finder-litter list (D03: skipping every dotfile hides `.env` changes from a `-pin` match); the non-regular-file refusal (D05); and byte order beyond ASCII (D04). **Fix:** a `.env` in the change set, a FIFO (`mkfifo`), a swap-to-symlink between walk and read (call `sha256File(path, {noFollow:true})` on a symlink directly), and an astral-plane filename (with the one-liner check).
9. **[m] calc hours: rounding down and oldest-first are untested.** Every fixture's share × minutes is an exact quarter-hour, so `Math.round` or `Math.ceil` passes (K01). The months-N fixture uses up every batch, so newest-first passes (K02). ow-care §6 makes both part of the rule. **Fix:** `0.25 × 170 = 42.5 → 30`, and a months-2 ledger that partly uses two batches.
10. **[m] xlsx accepts references past Excel's grid and can hang.** `plugins/ow-tools/lib/xlsx.mjs:80` allows 7-digit rows, and nothing bounds rows at 1,048,576. A `model.md` row `| C1048577 | =A2+B2 | |` exits 0 with `<dimension ref="A1:C1048577"/>`, an invalid workbook. `| XFD9999999 | … |` drives the sheet writer (`:289–:335`) through 16,384 × 9,999,999 cells; it was still running after 20 s when killed. The CSV size cap (X04), the column bound (X05) and the formula-in-header refusal (X07) are also untested. **Fix:** bound rows ≤ 1,048,576 and the extent ≤ the CSV extent plus mapped cells, refuse as `unknown-cell`, and add the three plants.
11. **[m] Export 0600 is tested for xlsx and the record only.** Removing the `chmodSync` for pdf, docx and pptx (`export.mjs:232`) passes the suite (E01).
12. **[m] The C8 test is weak.** `tests/ow-tools/xlsx-pptx.test.js:157` checks only that the grand total appears somewhere in LibreOffice's CSV, not that every computed cell (line totals, `Rates!B3`) matches `ow-tools calc`.
13. **[m] `help network` (`plugins/ow-tools/lib/cli.mjs:37`) omits pip-audit's requests to PyPI.** README and SECURITY-MANIFEST disclose them, and the help says "all other verbs … nothing" without that exception.
14. **[m] The health text output is hard to scan.** It prints `not checked (network off (3 packages read: 3 public, 0 held back))`, with nested parentheses and a result column (`padEnd(12)`, `plugins/ow-tools/lib/health.mjs:545`) that every `not checked (…)` overruns. Put the reason in the detail column.

### Design departures and decisions to confirm (OWNER-DECISION)

Already decided by the owner (2026-10-16): the capture `--sign-in` change and GO; OSV receives all public-registry packages, indirect ones included; capture origins are https-only and never loopback.

| # | Decision | Recommendation | Reason |
|---|---|---|---|
| OD-1 | pnpm and yarn-berry lockfiles don't record a registry; such packages are sent only when `health.yaml` says `registry: public` | **Accept, with Bug 1's fix as a condition.** `registry: public` must never cover a package whose version is a URL, git spec or path | `.npmrc` and `.yarnrc.yml` can't be read (they hold tokens), so a declaration is the only safe signal. But the declaration is all-or-nothing, so the version-shape check is the backstop |
| OD-2 | Body caps: 64 KB default; 4 MB for the OSV batch, 512 KB for advisory details, 1 MB for the RDAP list (the contract said "a 64 KB body cap") | **Accept** | The OSV batch for 1,000 packages and the IANA list exceed 64 KB. Each larger cap is per destination and fixed in code, and design §5.8 records it |
| OD-3 | Stricter refusals than the contract asked for: health URLs with a query string or fragment; IP and `localhost` hosts; capture `decision` on non-production; duplicate step ids ignoring case; xlsx formula in row 1; digest names with a backslash or control character; `--holidays` with `--days` | **Accept** | Each closes a leak or an ambiguity, has a stable reason code and a next step in §14.3, and no caller depends on the looser form |
| OD-4 | calc hours ledger has four kinds (`care`, `health`, `report`, `meeting`), where ow-care §7 groups "report and meetings" | **Accept**; ow-care Sprint 4b reports `report + meeting` as one line | Finer is safer for the identity; Sprint 4b can sum them |
| OD-5 | 1.0.0 behaviour changes: `calc date --days` gives `calendar` + `holidays_skipped` (no `skipped`) and refuses `--holidays`; brand refusals no longer quote the value; exports are 0600 and write `<name>.export.json` | **Accept** | I checked every caller in `skills-work/` and the 2026-10-16 designs. None reads `skipped` (ow-build-plan records the output verbatim); `--days` is never combined with `--holidays` (`phase-offer.md:24` uses `--days` alone); brand refusals are relayed by reason. One cosmetic interaction: `skills-work/ow-build-plan/references/routing-and-resume.md:78`'s "exported (`export/quote.*`)" glob now also matches `quote.export.json`. It is only an existence check, but Sprint D could narrow it to `quote.{pdf,docx}`. 0600 matches F-006 ("outputs are 0600") |
| OD-6 | No calc verb for ow-vendor-eval's weighted scores (decimal weights × 0–3) in 1.1.0; §4.2 proposes a weighted-sum verb or `calc total` in minor units, flagged for Sprint V | **Defer to Sprint V; don't use `calc total`** | `calc total` sums money in minor units. Weighted scores need exact decimal products, which would be a new `calc weighted` verb with its own read contract. Until then ow-vendor-eval marks scores "computed without ow-tools; check it" |
| OD-7 | pip-audit (when installed) reaches PyPI's advisory data, outside the C25 fixed list and outside `net.mjs`'s address rules | **Owner to confirm**, or pin `--vulnerability-service osv` | This is disclosed in README and the manifest, but C25 lists fixed destinations. Pinning to OSV keeps Python egress to a destination already on the list (still outside `net.mjs`) |

### Gaps vs Contract

- Deliverable 14 and C32: no security review reports, no SA-001 re-rating, §8 residuals not review-updated (Bug 3).
- C33: per-commit verifier evidence in the PR is not checkable yet (no PR).
- C8 is real-binary only and skipped here; its assertion is weaker than the criterion (Bug 12).
- The contract's Test requirements ask for "plant path variants … Sprint 1's evaluator found most slips in variants". 20 genuine slips remain, concentrated in variants (Bugs 5–11).

### Verdict: **FAIL**

Every rubric score is ≥ 6 (6 / 6 / 6 / 7, weighted 6.2), but four major defects are open (Bugs 1–4), and C13, C17 and C32 fail. Fixes, in order:

1. **Stop the private-package egress (Bug 1).** Do the version-shape classification in `lockfiles.mjs`, add a v1 git/tarball fixture under `registry: public`, and assert that the OSV body and npm paths carry neither.
2. **Widen the secret-field match (Bug 2).** Split identifiers on `_`, `-`, spaces and camelCase before matching. Add `otp_code`, `mfaCode`, `pin_code`, `one_time_code`, `card_number` and `ssn_last4` plants before launch and at run time, plus a name-only run-time case.
3. **Run the security review (Bug 3).** Do the posture pass and the diff audit under `docs/audits/`, re-rate SA-001, update §8 Known residuals, then return for round 2.
4. **Make export failures leave nothing (Bug 4).** Render into the temp folder and write private only on success (pptx and docx). Add a thematic-break deck rule and a failure-path test asserting that no file is in `export/`.
5. **Close the test-gap slips (Bugs 5–11).** Each named plant becomes a test: same-host redirect, multi-address answers, the 30-day boundary, unrecorded rules per lockfile form, the capture run-time branches, the digest TOCTOU, dotfiles and FIFO, rounding and oldest-first, xlsx bounds, and 0600 for every format.
6. **Tidy the minors (Bugs 12–14)** and take OD-1 to OD-7 to the owner.
