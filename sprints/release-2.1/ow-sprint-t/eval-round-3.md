## OW-03 (Sprint T) — Evaluation Round 3

**Sprint:** ow-tools 1.1.0 (contract `sprints/release-2.1/ow-sprint-t/contract.md`, C1–C33, T1–T7; renamed OW-03 in #619) · **Branch:** `claude/ow-tools-sprint-t`, head `e7eb221c` (round-3 commits `e8385007`, `47e9cc0f`, `e7eb221c` on top of round 2's `6459474a`) · **Evaluator:** skeptical Evaluator, oc-app-architect Phase 6 · **Date:** 2026-10-17 · **Final round before escalation**

Graded from the contract, the amended design (`docs/plans/2026-10-09-ow-tools-design.md` §5.6–§5.10, §8, §14), the round-2 re-review reports and the round-3 diff (23 files, +1560/−804).

How the work was done:
- Plants ran in three detached evaluation checkouts in parallel; each plant was reverted after its run.
- Behaviour probes ran in a fourth, clean checkout. The Generator's worktree was not touched.
- No real network traffic was sent. Health ran against the injected stubs. Capture's name resolution went through its `resolver` seam or the CLI tests' DNS fence. The real-Chrome probes used a loopback server and `testOrigins`.

**Owner rulings applied, so not graded as defects:**
- Rounds 1–2: `--sign-in` runs the steps in the same window; OSV gets every public-registry package; capture origins are https only, never loopback; OD-1 to OD-7; SA-011 (real keychain, and a wipe after any production run).
- OD-8: kept. An unnamed CSV is refused as `sheet-not-in-model`.

**Known, already reported by the security re-check (listed, not double-counted):**
- SA-020 (LOW): `origin()` doesn't apply the host-name pattern, so a comma or `*` reaches `--host-resolver-rules`, but no rule can be injected. My probe agrees: `https://uat.example.test,EXCLUDE` parses as a hostname, but it never resolves, so the browser gets no rule for it.
- SA-021 (LOW): there is no per-profile run lock, so a concurrent run deletes the pending marker.
- SA-022 (LOW): secret-name stems are English ASCII only. My probes found `contraseña` (the `ñ` is stripped to `contrasea`, so the listed `contrasena` stem misses), `kennwort`, `senha`, `hasło`, `пароль` and `パスワード`.

**pkill note:** the security reviewer's `pkill -f fake-browser.mjs` overlapped these runs. I checked every caught capture plant's first failing test, and each one is the test aimed at that plant. No caught result here rests on an unexplained capture failure, and a kill can only turn a slip into a catch, never the reverse.

### Code Scores

| Criterion | Weight | Score | Justification |
|---|---|---|---|
| Functionality | 30% | **8/10** | All four round-2 majors are closed, and I confirmed each in the running code, not just the tests. The YAML metadata embed is refused in all three formats, and the readers no longer parse YAML. The tokeniser regressions are refused. yarn `file:` and alias names never leave. A real Chrome under SIGTERM wipes the production session. Exports fail clean in every format, and 2592 of 2592 CVSS 3.1 vectors score as the specification says. What remains is at the edges: the secret-name heuristic misses or over-refuses some names, SIGQUIT and uncaught exceptions defer the wipe to the next run, and a misaligned OSV batch is partly trusted. |
| Feature Completeness | 30% | **8/10** | Every deliverable is present. The design documents the new rules: DNS pre-resolution, the snapshot residual, the stem rule, `unchecked-image`, `sheet-not-in-model` and the 110 s default. The coordinator reports the security re-check of round 3 as posture PASS and diff PASS-WITH-NOTES. But the reports committed at `e7eb221c` still describe `6459474a` (round 2), and C33's per-commit evidence in a PR can't be checked because no PR exists yet. |
| Code Quality | 20% | **8/10** | 646 ow-tools tests, a DNS fence on the CLI capture tests, and a test for each plant and probe I sent. **133 of my 134 plants are caught**: rounds 1 and 2 at 98/98, P03 included; round 3 at 35/36. The one slip (M10) shows the edge-versus-anywhere stem rule has no control that tells them apart. |
| Visual/UX Quality | 20% | **7/10** | Refusals are specific and value-free. `unchecked-image` and `sheet-not-in-model` are now their own codes. `help network` names capture's one name lookup per host, and SKILL.md and the README explain the 110 s default and `run_in_background`. Costs: the secret-name rule refuses ordinary fields (lead routing, pass type, map pin, API banner), and capture can't work around those. The YAML-block message gives no alternative for a real horizontal rule. |

**Weighted Code Score:** 0.3×8 + 0.3×8 + 0.2×8 + 0.2×7 = **7.8 / 10**

### Test Results

| Run | Result |
|---|---|
| `npx vitest run` (full, after `npm ci` in root and `site/`, and `npm run build`) | 130 files, **2665 passed / 2 skipped / 0 failed**, exit 0 (both skips are C8: no `soffice`) |
| `npx vitest run tests/ow-tools/` | 12 files, **646 passed / 2 skipped**. C21 and the SA-011 real-browser test ran against the installed Chrome |
| `npm run build` | exit 0 (Worker @ e7eb221c); `git status --porcelain` empty afterwards |
| `check-skill-contracts`, `gen-skills-catalog` (36 + ow 2), `ow-start-acceptance`, `ow-build-plan-acceptance`, `gen-mcp-catalog` | all exit 0 |
| `sync-plugin-skills --check`, `sync-skill-bundles --check`, `gen-ow-tools-manifest --check`, `lint-internal-refs` | all exit 0 |
| `claude plugin validate --strict` (plugin.json and marketplace.json) | ✔ Validation passed (both) |
| C29 path diff `8aa3145b..HEAD` over the oc- surfaces | empty |
| `.bugcheck.json` | Re-pinned to the round-2 posture report (`sha256:770a5e84…1028`, matching the file); still one path, `secrets` scanner only |

**Count claims:** 646 ow-tools and 2665 full are confirmed. "174 plants caught incl. P03": all 98 of my round-1/round-2 plants are caught here, P03 included. I can't recount the Generator's own 76.

### Generator's claims, checked

| # | Claim | Verdict |
|---|---|---|
| 1 | YAML metadata is off in both readers; the AST walk covers meta (`unchecked-image`); preflight refuses a YAML block below the header; the repro is tested in 3 formats, plus R29 directly | **True.** `PANDOC_FROM` and `PANDOC_DECK_FROM` end `-yaml_metadata_block` (`export.mjs:24`, `pptx.mjs:12`); `walk(JSON.parse(r.stdout))` (`export.mjs:76`). My round-2 repro (three placements) is refused in pdf, docx and pptx. Other routes tried, none embedding: a `%` title block (not a gfm extension), raw `\includegraphics`, the same inside `$…$`, a typst string inside math, an entity-encoded `!`, an angle-bracket path, odd backticks around `<img>`, and an image wrapped in a link. `--metadata-file` and `header-includes` aren't reachable from a document. M01, M02, M03 and M06 are each caught |
| 2 | A word rule plus a separator-stripped stem rule; the run-time check reads aria-label and placeholder; 36 ordinary controls first; 61 secrets refused | **True as stated** (`capture.mjs:41–95, 552`; tests `capture.test.js:529–620`). M07–M09 and M11 are caught. M10 slips. Remaining misses and false refusals: Bugs 1–2 |
| 3 | yarn `file:` and `npm:` aliases resolve to the real package in all 7 forms; berry `npm:^x` is not an alias | **True.** Round-2 repros: yarn v1 `file:`/tarball names are held, and the yarn v1 and berry aliases are checked as `left-pad@1.3.0`. M32–M35 are caught |
| 4 | SIGINT/TERM/HUP wipe; a pending marker covers SIGKILL; production starts wiped; 110 s default | **True.** With a real Chrome on a production run: SIGTERM leaves no cookies, no marker and no Chrome. SIGKILL leaves the cookie store and the marker; the next run on the profile, in the test environment, wiped a planted sentinel before launch. Gaps: SIGQUIT and an uncaught exception (Bug 3); SA-021 is known |
| 5 | Partial OSV answers produce attention | **True** for empty, missing, non-array, null, string, `next_page_token`, bad id, `vulns: null` and `vulns: {}`. Not covered: a batch whose `results` is longer or shorter than its queries is trusted position by position (Bug 4) |
| 6 | IPv6 literals judged by embedded IPv4 and must be global unicast; names resolved before launch; Chrome pinned by host-resolver rules | **True.** `[::a9fe:a9fe]`, `[64:ff9b::7f00:1]`, `[2002:7f00:1::]` and `[fc00::1]` are now refused. These answers are refused (seam): mixed A, loopback-first, mapped, NAT64, fe80, `0.0.0.0` and `::`. The pin goes to the first IPv4 answer. AAAA-only names are pinned in brackets. An empty answer gets no rule. Gaps in the metadata ranges: Bug 5 |
| 7 | 3fff::/20 and 2001:2::/48 blocked; CVSS 3.1 Roundup; R09/R10/R13/R15/R26 tested | **True.** All 2592 CVSS 3.1 base vectors match an independent implementation of the specification's formula and Roundup. The 3.9/4.0/6.9/7.0/8.9/9.0 band edges (23/34/50/26/9/9 vectors) all rate correctly; nine published scores (9.8, 10, 7.8, 5.9, 6.1, 7.5, 7.8, 6.4, 3.0's 9.8) match. M25, M26 and M31 are caught |
| 8 | Escaped backticks handled | **True:** `` \`<img>\` `` and ``` ``<img>` ``` are refused; M05 caught |
| 9 | 174 plants caught, incl. P03 | Mine: 98/98 from rounds 1–2, P03 included |
| 10 | 646 / 2665 tests | **True** |

### Criteria C1–C33

| # | Verdict | Evidence |
|---|---|---|
| C1–C6 | **PASS** | Unchanged since round 2; every round-1 and round-2 plant in these areas is caught |
| C7 | **PASS** | X01–X07 caught |
| C8 | **SKIP (correctly)** | No `soffice`; cell-by-cell test in place |
| C9 | **PASS** | P01/P02 caught |
| C10 | **PASS** | P03 is now caught too. Thematic breaks and YAML blocks are refused before pandoc |
| C11 | **PASS** | Unchanged |
| C12 | **PASS (note)** | Partial OSV answers are attention. Length-mismatch case: Bug 4 |
| C13 | **PASS** | Round-2 Bug 3 closed (yarn `file:`, aliases); M32–M35 caught |
| C14–C16 | **PASS** | Unchanged; M21 (catch-all dropped) caught by the C16 argv test |
| C17 | **PASS (heuristic gaps)** | Round-2 regressions closed; the run-time check adds aria-label and placeholder. Residual misses and over-refusals: Bugs 1–2 (SA-022 known) |
| C18 | **PASS** | DNS pre-resolution refuses loopback and link-local answers; pinned browser |
| C19–C24 | **PASS** | Unchanged; `unchecked-image` and `sheet-not-in-model` are in §14.3 (M04, M36 caught) |
| C25 | **PASS** | Capture's DNS lookup is disclosed in `help network` and SECURITY-MANIFEST and is the only dynamic `node:` import (test-pinned). The CLI capture tests run under a DNS fence. M25/M26 caught |
| C26–C31 | **PASS** | Unchanged |
| C32 | **PASS (note)** | The coordinator reports the round-3 re-check as posture PASS, diff PASS-WITH-NOTES (SA-020–022 LOW). The committed reports at `e7eb221c` are the round-2 versions (target `6459474a`). Their claim "nothing I could construct put an outside file into a PPTX or DOCX" was contradicted by round 2's Bug 1 and is now true again. Commit the round-3 re-check and re-pin `.bugcheck.json` |
| C33 | **PARTIAL** | Tests, build and `validate --strict` green; no PR yet, so the per-commit verifier evidence can't be checked |

### Plants

| Set | Planted | Caught | Slipped |
|---|---:|---:|---|
| Round 1 (`plants-r1.mjs`, one anchor re-targeted: C01 → the `named` check) | 59 | **59** | — (P03 now caught) |
| Round 2 (`plants-r2.mjs`, four re-targeted: R06, R16, R21, R33) | 39 | **39** | — |
| Round 3 (`plants-r3.mjs`, new) | 36 | **35** | M10: edge stems (`otp`, `mfa`, `pwd`, `cvc`, `cvv`, `ssn`, `tfa`) matched *anywhere* instead of at word edges. No ordinary-name control contains one mid-word outside the scrub list (e.g. `hotpot`, `spotPrice`), so the false positives it would cause go unseen |
| **Total** | **134** | **133** | 1 |

The new plants covered:
- **Metadata (M01–M06):** reader flags, the meta walk, the YAML-block refusal, the reason code, escaped backticks.
- **Secret names (M07–M11):** compacted and per-word stems, the ordinary scrub, edge-versus-anywhere, aria-label and placeholder.
- **Signals (M12–M17):** SIGHUP, the wipe in the handler, the marker write, the marker honoured on the next run, the production start-wipe, the default wait.
- **DNS (M18–M24):** first-answer-only, link-local answers, the pinned answer, the catch-all, an unresolvable name excluded, the IPv6-literal rule, 6to4 unwrapping.
- **Ranges (M25–M26):** 3fff::/20 and 2001:2::/48.
- **OSV (M27–M30):** a token, a missing answer, a bad id, the file summary.
- **CVSS (M31):** rounding.
- **Aliases (M32–M35):** `npm:^range`, yarn `file:`, the v1 alias, the berry resolution.
- **xlsx (M36):** `sheet-not-in-model`.

**Behaviour probes, re-run and new:**

| Probe | Result |
|---|---|
| Round-2 repros: npm v1 git/tarball, yarn v1 `file:`/tarball, yarn v1 + berry alias, YAML metadata embed (3 placements × 3 formats), export failure per format, origin spellings | All fixed: held, real name, refused, `export/` byte-identical and temp removed, refused |
| Other embed routes (`%` block, raw `\includegraphics`, math, a typst string in math, entity `!`, angle path, backtick `<img>`, a linked image) | Nothing embedded. pdf/docx/pptx exported or refused, and docx/pptx carry no `media/*.png`. A typst-looking string inside math stays a typst string, and Typst's `--root` confines reads to the temp folder anyway |
| Real Chrome, production plan, SIGTERM / SIGQUIT / SIGKILL to ow-tools | TERM: cookies 0, marker 0, Chrome 0. QUIT and KILL: cookies 1, marker 1, Chrome 0 (Chrome exits when the pipe closes); the next run wipes |
| Uncaught exception mid-run (fake browser sends a malformed `Fetch.requestPaused`) | ow-tools exits 1 with a TypeError; no in-run wipe; marker left for the next run |
| DNS: multi-A, loopback first, AAAA mapped/NAT64/fe80, `0.0.0.0`, `::` | Refused `origin-address-not-allowed` |
| DNS: `fd00:ec2::254` (AWS IPv6 metadata), `100.100.100.200` (Alibaba metadata) | Accepted and pinned (Bug 5) |
| OSV: 16 reply shapes | 11 malformed shapes are attention (a shifted, shorter batch only at its tail); 4 benign shapes stay OK; a longer `results` is trusted by position and stays OK (Bug 4) |
| CVSS 3.1: all 2592 base vectors and every band edge | Exact |
| Secret names: 74 ordinary names, 69 secret names, 12 placeholder/aria texts | 28 ordinary names refused (9 of them, such as `showPassword` and `otpEnabled`, are secret-adjacent toggles); 55 secret names missed, 11 of them non-English (SA-022 known) |

### Bugs Found

Ordered by severity. B = blocking, M = major, m = minor. **No blocking or major defect is open.**

1. **[m] The secret-name rule still misses common credential fields** (outside SA-022's non-English set). These are accepted before launch and at run time:
   - abbreviations: `psw`, `pswd`, `pword`, `passw`, `passwrd`;
   - PINs: `userpin`, `atmpin`, `securepin`;
   - card numbers: `creditcard`, `credit_card`, `cardno`, `card_no`, `ccn`, `pan`;
   - SSN spelled out: `socialSecurityNumber`, `social_security`;
   - OTP variants: `authenticator_code`, `emailCode`, `loginCode`, `twoStepCode`, `magic_code`;
   - account recovery: `seed_phrase`, `mnemonic`, `recovery_key`;
   - placeholders: "Enter the 6-digit code" and "Code from your authenticator app".

   `psw` is the name in the most-copied HTML login example. **Fix:** add `psw`, `pswd`, `pword` and `passw` stems; `credit card`, `card no` and `social security` as pairs; `authenticator`, `seed phrase`, `recovery key` and `mnemonic`; and an `N-digit code` placeholder pattern. Add them to the secret list in `capture.test.js`.
2. **[m] The secret-name rule refuses ordinary fields, and capture can't route around them.** `routing`, `pass` and `pin` are whole secret words (`capture.mjs:58`), and the stem search runs over the compacted text, across word boundaries (`:93–94`). So these are refused, by plan selector or by the page's own name/id/aria-label/placeholder: `lead_routing`, `routingRules`, `passType`, `boarding_pass`, `busPass`, `eventPass`, `season-pass`, `pinLocation`, `map-pin`, `pinCount`, `apiBanner`, `api-banner`, `mini_banner`, `taxiBank` (all `iban`), `tokenCount`, `photo-kent`, `auto_kennel` (`token`), `Liban` and `ibanez`. A refused step means no screenshot of that screen. **Fix:**
   - make `routing`, `pass` and `pin` count only when paired (`routing number`, `pass code`, `pin code` or `pin` alone);
   - search short anywhere-stems (`iban`, `token`, `secret`) within each word, not across the compacted text;
   - add these names, plus mid-word edge-stem controls such as `hotpot` and `spotPrice`, to the ordinary controls (that also catches M10).
3. **[m] SIGQUIT and uncaught exceptions skip the in-run production wipe.** Only SIGINT, SIGTERM and SIGHUP are handled (`capture.mjs:680`), and nothing handles `uncaughtException`. A real-Chrome production run killed with SIGQUIT, or crashed by an exception in a CDP listener (`capture.mjs:458` reads `m.params.request.url` unguarded), leaves the cookie store until the next run on that profile. The marker bounds the exposure, and the cookies are keychain-encrypted (SA-011). This sits in the same class as the known SA-019/F-025 SIGKILL residual and SA-021. **Fix:** add SIGQUIT, wipe in a synchronous `uncaughtException` handler before exiting, and guard the listener's reads.
4. **[m] A misaligned OSV batch is trusted by position.** `advisories()` reads `results[n]` for `queries[n]` (`health.mjs:326–339`). When `results.length !== queries.length`, only the missing tail is flagged. A shorter, shifted batch attributes advisories to the wrong packages and rates the rest by the shifted entries; a longer one ignores the surplus and stays OK. **Fix:** any length mismatch makes every package in that batch attention ("the advisory service's answer didn't line up with the query").
5. **[m] Capture's metadata refusal covers link-local only.** A name resolving to AWS's IPv6 metadata address `fd00:ec2::254`, or to Alibaba Cloud's `100.100.100.200`, is pinned and allowed (`pinOrigins`, `capture.mjs:612`). Neither metadata service speaks https, so a page load fails today. **Fix:** list both as metadata addresses in `isLinkLocalHost`, or record them in §8.
6. **[m] The round-3 security re-check isn't in the tree.** The committed posture and diff reports at `e7eb221c` target `6459474a`. The posture report says no image route was found, which round 2's metadata embed contradicted (now fixed). Commit the round-3 re-check (SA-020–022), re-pin `.bugcheck.json`, and add SA-020–022 to §8 Known residuals.
7. **[m] Pre-existing, outside this round's diff: any converted inline equation makes PDF export fail.** `$\text{hello}$` gives exit 5 "typst could not build an accessible PDF: hint: make sure your images and equations have alt text". gfm's `tex_math_dollars` is on in `PANDOC_FROM`, and Typst's PDF/UA mode needs alt text on equations. Word and PowerPoint export the same document. **For the backlog:** turn off `tex_math_dollars`/`tex_math_gfm` in the readers, or refuse math in preflight with a clear line message.

### The Generator's self-flagged items

| Item | Ruling | Reason |
|---|---|---|
| DNS pre-resolution is a snapshot; Chrome is pinned to the first answer (first IPv4, else first) | **Acceptable** | It fails closed: a changed or dead address breaks the run; it never widens access. Every answer is checked, not just the pinned one. The pin keeps the name for SNI and the certificate. A run is at most 110 s by default (590 s maximum). Design §8 records it as a residual (line 535) |
| IPv6 literal origins are stricter than IPv4 (an IPv6 literal must be global unicast; IPv4 private literals are allowed) | **Acceptable** | The stricter rule applies only to the *literal spelling*: a host name whose AAAA answer is a ULA (`fd00::10`) is still allowed, the same as an RFC 1918 IPv4 answer. IPv6-literal test environments are rare, and the rule blocks the wrapped-address tricks round 2 found. Design §5.6 states it. No owner decision needed; it narrows nothing the owner granted that can't be reached by name |
| The narrowed YAML-block refusal can misfire on `---`, a short `Key: value` line, then another `---` | **Acceptable** | It fails safe (a refusal, never an embed). With the readers' `yaml_metadata_block` off, the refusal is a clarity layer, not the defence. The misfire needs a thematic break followed by a setext H2 whose text starts `Word:`, which is rare. Suggest naming the way out in the message ("for a rule, use `***`; for a heading, use `##`") |

### OWNER-DECISIONs

None new. OD-8 is applied as the owner ruled.

### Gaps vs Contract

- C33: per-commit verifier evidence in the PR; no PR yet.
- C32: commit the round-3 re-check reports and re-pin their digest (Bug 6).

### Verdict: **PASS**

Every rubric score is ≥ 6 (8 / 8 / 8 / 7, weighted 7.8). No blocking or major defect is open, and C1–C31 hold. All four round-2 majors are closed and confirmed in running code, including a real-Chrome SIGTERM wipe and the SIGKILL marker. 133 of 134 plants are caught. Before merge:

1. Commit the round-3 security re-check and re-pin `.bugcheck.json` (Bug 6). Record SA-020–022 in §8.
2. Put the per-commit verifier evidence in the PR body (C33).

These can land in the same PR or as tracked follow-ups:
- Bugs 1–2 (secret-name coverage and over-refusal, with M10's control);
- Bug 3 (SIGQUIT and uncaught exceptions);
- Bug 4 (OSV length mismatch);
- Bug 5 (two metadata addresses);
- Bug 7 (math in PDF, pre-existing).
