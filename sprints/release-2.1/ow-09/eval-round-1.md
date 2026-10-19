## OW-09 (Sprint R) — Evaluation Round 1

**Sprint:** ow-research 1.0.0, plus ow-build-plan 1.1.0 (amendment P5). Contract: `sprints/release-2.1/ow-09/contract.md` (C1–C26 and the C4 route matrix). The owner approved O1–O11, and made further decisions after the security review on 2026-10-19.
**Branch:** `claude/ow-09-ow-research`, head `e6d041d4`.
**Byte-identity base:** `754be8c5` (merge base with `origin/main`, #626).
**Evaluator:** independent Evaluator, oc-app-architect Phase 6.
**Date:** 2026-10-19.

**Standard applied:**
- **D1, O8 (confirmed 2026-10-19):** an internal number is OUR side only. Market questions may be searched. A query that carries our own figures is blocked.
- **D2:** meaning checks are a regression net plus the skill's self-check. Idioms and implied wording are accepted. Plain-wording slips are defects (minor).
- **R1-4 (carried):** screens are graded on prescribed text and structure only.
- **Accepted by the owner, so not defects:**
  - SR-04's cap: forum, blog and other user-written pages reach MEDIUM at most;
  - the `unreviewed` licence classes;
  - OW-12 and OW-13 moving to v2.2.
- **Severity:**
  - **[M] major:** a mechanical check that gives the wrong verdict on a realistic run in a way that defeats its criterion, or skill text that goes wrong on a path the contract grades.
  - **[m] minor:** a gap or false positive in a meaning net, a screen guard that R1-4 limits, an edge case, or drift.
  - The evaluation cap (a checker-only major moves to the follow-up PR) applies only after round 2, so it does not apply here.
- **Not duplicated:** the security re-check runs in parallel. Nothing here re-grades SR-01 to SR-13. The criteria are graded through the fixes.

**Where I worked.**
- `<E>` = `scratchpad/eval-ow09-r1`.
- `<E>/tree` is a detached checkout of `e6d041d4`, and `<E>/base` is one of `754be8c5`. Each had `npm ci --ignore-scripts` run at the root and in `site/`. Both were removed at the end.
- The Generator's worktree was not touched.
- The resume probes added five temporary fixture cases (`zz-eval-*`) to my tree's fixtures and removed them in the same script. `git status --porcelain` was empty afterwards.
- **The harness, in `<E>/h/`:**
  - `untuned-set.mjs`: the untuned set, written before I read `web-rules.md`, `confidence-rules.md`, `self-checks.md` or the checker's rule code;
  - `run-untuned.mjs` and `run-conf.mjs`;
  - `plants.mjs` and `plants2.mjs`;
  - `resume-probes.mjs`, `fp-probes.mjs`, `url-probes.mjs`, `malformed.mjs` and `walk.mjs`;
  - `probe-a03.mjs`, `probe-cap.mjs` and `probe-s03.mjs`;
  - `lib.mjs`, which lays each golden out as a real folder (`--prepare` plus its expected output) and grades only failures that are new against that same golden laid out unedited.
- **Outputs:** `untuned.out`, `untuned-conf.out`, `plants.out`, `plants2.out`, `resume-probes.out`, `fp-probes.out`, `url-probes.out` and `malformed.out`, plus the `*-results.json` files.

### Code Scores

| Criterion | Weight | Score | Justification |
|---|---|---|---|
| Functionality | 30% | **6/10** | **Strong:**<br>• The skill text is detailed and mostly consistent: the network fence in words, the URL rule, the confidence table, write-once and ids, the handling union, and the framework open list.<br>• The main path walks cleanly through one folder, with every check passing: `-question` → plan → approval → `-run` → P5 `-collect` → `-map` (`walk.mjs`).<br>**Wrong:**<br>• The resume rule contradicts itself for a run cut off before its requests finish, and the stopped-run golden contradicts it too (M2). A session that ends between the user's go and the first request cannot finish correctly.<br>• The ow-currency THEN line still tells the user to say a verb that moved to v2.2 (m9). |
| Feature Completeness | 30% | **7/10** | **Delivered:**<br>• ow-research 1.0.0: four verbs, 10 references, the edges file and its CHANGELOG;<br>• P5 with the O10 trim, the 1.1.0 bump and a CHANGELOG that matches git;<br>• the catalog wiring and pins;<br>• 68 ow-research goldens and 4 P5 goldens;<br>• 184 plants, controls and held-out sets;<br>• the build notes (§12) and residuals (§8.1);<br>• the security fixes and PoC plants.<br>**Thin:**<br>• refusal-route success guards (m1);<br>• `-question` refusal routes do not grade "writes nothing" (m2);<br>• `-framework` self-checks are not graded (m8);<br>• P5's refusal cells grade no screen (m11). |
| Code Quality | 20% | **5/10** | **Strong:**<br>• URL rule 20/20 refused and 10/10 allowed on fresh edge forms;<br>• untuned Query privacy 24/25 recall with 0/25 false positives;<br>• confidence 15/15 against the documented rules;<br>• 9 malformed probes, each failing per check without a crash;<br>• oc- outputs byte-identical.<br>**Two core mechanics give wrong verdicts on realistic runs:**<br>• O3 approval is graded on the presence of a marker, not on what the user approved (M1);<br>• the `resume` check fails a text-compliant resume and the Generator's own stopped-run golden (M2).<br>**Also:**<br>• 0/6 success claims on refusal screens caught;<br>• 5 of 12 targeted market queries with others' figures blocked;<br>• common credential shapes missed. |
| UX (clarity for person and model) | 20% | **7/10** | Body 3,262 tokens (cap 4,500, so 1,238 of headroom). Description 828 characters. The welcome and "What leaves this machine" are clear and honest about host-enforced limits. Refusal words are prescribed. **Against:** the routing and phase-run texts give the model two resume rules (M2), and the screen offers `use ow-currency-watch` without saying it is not in this release (m9). |

**Weighted Code Score:** 0.3×6 + 0.3×7 + 0.2×5 + 0.2×7 = **6.3 / 10**

**Verdict: FAIL.** There are two major defects (M1, M2), and Code Quality is below 6. Both majors are narrow fixes:
- **M1:** read the ids and the `human-decided:` label in approval lines, and credit a cap increase only to a batch that was shown.
- **M2:** write one resume rule for unsent approved requests, use one step name, and add the missing goldens.

The rest is minor: precision and recall of the meaning nets, screen guards, and owner decisions.

### Test Results

| Run | Result |
|---|---|
| `gen-skills-catalog` / `check-skill-contracts` / `lint-internal-refs` | exit 0 / 0 / 0. The ow catalog validates 4 skills |
| `ow-research-acceptance` | exit 0: **68** golden runs |
| `ow-build-plan` / `ow-start` / `ow-start-logs` / `ow-build` acceptance | exit 0: **36** / **54** / **50** / **54** |
| `npx vitest run` (full, once) | 137 files: **4,828 passed, 2 failed, 11 skipped**. The 2 failures are `tests/audit-integration/mcp-hosted-references.test.js`, which needs `public/docs/` from a build; after `npm run build` it passes 3/3. So the total is **4,830 passing**. None of the 11 skips is new: no `.skip` or `skipIf` was added in the diff |
| OW-09 test files (verbose) | `ow-research-plants` (**184**, all pass, no skip), `ow-research-acceptance` and `ow-build-plan-acceptance`: 424/424 |
| `npm run build` | exit 0 (`@ e6d041d4`). `git status --porcelain` before and after: empty |
| oc- byte-identity vs a build of `754be8c5` | `snapshot.sh` manifests: 1,473 lines, **identical** (`oc-diff.out` empty) |
| C25 fence | The fence test passes in the full run (no socket, DNS or fetch) |
| Body / description | **3,262** tokens (cap 4,500) / **828** chars. ow-build-plan body 4,619 → **4,342** with P5. Protocol copy byte-identical |
| Not verified | `npm run evidence:pr` and the per-commit verifier. Re-running the O1 host check (§12.2 is documented, and consistent with how Claude Code's page tool behaves) |

### Generator claims, verified

| Claim | Verdict |
|---|---|
| 4,830 tests pass | **True**, after a build. Without `public/docs/`, two hosted-MCP tests fail on a missing file. That is environmental and predates this sprint |
| 68 ow-research goldens; ow-build-plan 36, ow-start 54, logs 50, ow-build 54 | **True** |
| Body 3,262 tokens | **True** (chars/4, the catalog's estimator) |
| 184 plants | **True**: 184 tests in `tests/ow-research-plants.test.js`, no skips. Every SR PoC is a plant (`plants/sec-poc-*`, plus the SR describe blocks) |
| P5 checks in ow-build-plan | **True**: `research` and `research_refused` (`scripts/ow-build-plan-acceptance.mjs:1314-1376`), four goldens, nine plants. My G01–G09: 8/8 must-catch caught, and the FP passes. Gaps: P5's refusal cells grade no screen (m11), and the cap only sees `[LEVEL E-nn]` fact lines (that is the prescribed format, so not a defect) |
| O1 host check (the page tool returns a model's answer, so O1(b) holds) | **Documented** in design §12.2. Not re-run. Consistent |
| ow-build-plan 1.1.0 CHANGELOG records #609 and #616 | **True**. `git show --stat 4648e9cf` (#609) touches the six files it lists. `691afdfe` (#616) touches `SKILL.md`, `phase-offer`, `phase-start` and `routing-and-resume`, plus the data files `examples/handoffs.yaml` and `skill.edges.yaml`, which the CHANGELOG lists as data edits |

### Untuned set (`h/untuned-set.mjs`, written before the rules; run through the whole checker)

| Set | Size | Result |
|---|---|---|
| Queries that leak (keep-out in 8 spellings, 4 people and an email and a phone, 4 verbatim client spans, 8 of our figures, our own business name) | 25 | **24/25 flagged**. Miss: L24 "two thousand dollars to connect two systems is that cheap" (our 2,000 in words; m3) |
| Legitimate market and background queries (vendor and product names found in client files, a state, a size band, "top 10…", "15 percent wholesale discount", "typical hourly rate for bookkeeping") | 25 | **0/25 false positives** |
| Un-attributed shape probes ("estimate 40 hours … 35% margin", "our hourly rate $95") | 2 | 2/2 |
| Beyond the contract: the client's own customer named in its files ("Ridgeline Builders…", "PO-88231 sage wall tile") | 2 | 0/2 flagged (OWNER-DECISION 4) |
| Confidence scenarios: primary, implies, inferred, forum alone, three forums, two from one publisher, two known independents, known + forum, a lookalike "primary", an owner's subdomain, a conflict not listed, primary vs primary, the downgrade attempt, a summary-site regulation at MEDIUM, an official regulation | 15 | **14/15 as I expected**. The one difference (K10, a subdomain of an owner host is not primary unless written `*.host`) is the documented SR-03 departure (build notes §12.3 row 23), so 15/15 against the rules as built |
| Research-file sentences in `question.md`'s Generic description: legitimate / plain our-side slips | 10 / 10 | **0/10 false positives / 9/10 flagged**. Miss: P05 "…the 900-dollar feasibility test we usually sell" (hyphenated money; m3) |
| The same sentences in `findings.md`'s Answer: legitimate / plain our-side slips | 10 / 10 | **0/10 false positives / 0/10 flagged**. No rule reads our side in `findings.md` (OWNER-DECISION 2) |

**Written after the rules (targeted; `fp-probes.mjs`, `url-probes.mjs`):**
- **Market queries carrying a figure that is not ours: 5 of 11 false positives.** M04 ("retainer $1500") is excluded, because 1,500 is in our price book, so the by-value rule is right to block it. Flagged:
  - "bookkeeping $50 an hour normal for small business";
  - "is a 30% margin normal for small software agencies";
  - "support plans $300 to $600 a month small studios";
  - "freelance developer rates 2026 $80 per hour survey";
  - "POS systems for shops with 500 products monthly price".
  - Plus K12, a competitor's published "$480 a month".
- **Our figures in other forms: 4/6 flagged.** `2k`, `4.5k` and `3,000.00` are caught. "eight thousand dollars" and "900-dollar" pass.
- **The URL rule: 20/20 refused, 10/10 allowed.** Refused forms include:
  - trailing-dot IPv4, octal, decimal, zero-padded and enclosed-digit addresses;
  - `[::]`, `0`, user info;
  - full-width and circled `localhost`;
  - `.localhost`, `sslip.io.`;
  - fragment and path-parameter tokens;
  - `:80`.

**Held-out sets (the Generator's, frozen; measured by `tests/ow-research-acceptance.test.js` and passing):**
- Query privacy: 16/16 flagged, 0/16 false positives.
- URL rule: 16/16 refused, 0/16 false positives.
- SR-07: 14/18 flagged, 0/20 false positives.
- Before the rules, the files' headers record 0/16 and 16/16 (and 1/18, 20/20 for SR-07).

### Plants

| Batch | Items | Result |
|---|---|---|
| `plants.mjs`: the C4 matrix (every row and stage), writer modes, O3, O4, O5, O6, O7, P5 and the cap, the `-framework` allowlist, screens, credentials, cited, quotes, query forms | 97 P + 3 FP | **71/97 caught.** That includes H03, H04 and I01, which the vitest pins catch (`tests/ow-research-acceptance.test.js:357-369, 284-288`). FPs: 1/3 pass (K11, K12 are false positives) |
| `plants2.mjs` + variants: `-framework` self-checks, the cap approval, re-run ids, list age, twins | 11 P | **7/11 caught**. S07 was withdrawn: its approval was already in `question.md`, so it was not a violation. Missed: S01, S03b, S04b, S06 |
| Resume probes (text-compliant runs, cut at each step) | 5 FP-type | **1/5 pass** (M2) |
| Malformed files (C23) | 9 | 9/9 fail per check, with no crash |

**Totals:** 108 must-catch plants, 78 caught. 8 legitimate runs or edits, 2 pass.

**The 30 misses, by defect:**

| Defect | Plants missed |
|---|---|
| M1 | A12, A13, A14, S04b |
| m1 | A10, A21, A31, A33, A38, J01, J02, S06 |
| m2 | A03, A07 |
| m3 | K09, K10 |
| m5 | K01, K02, K03 |
| m6 | K05, K06 |
| m7 | F05 |
| m8 | S01, S03b, I04 |
| m9 | J10, H07 |
| m10 | H05 |
| Nit (not a defect) | E05, G04 |

### Criteria C1–C26

| # | Verdict | Evidence |
|---|---|---|
| C1 | **PASS** | The catalog and contracts are green. Writer modes are exact at run level: B01–B06 caught 6/6, and so are A08, A29 and the Generator's plants. A narrow gap remains on two `-question` refusal routes (m2) |
| C2 | **PASS** | 3,262 ≤ 4,100, and the catalog enforces 4,500. Description 828 characters. No `allowed-tools`, in any case (H06 caught) |
| C3 | **PASS** | Family-name check, lint, and pins for evaluation ids and script names (Generator plants) |
| C4 | **PARTIAL** | Every matrix cell has a golden, and 30 of my 39 route plants are caught. Misses: screen success claims (m1) and writes on two `-question` refusals (m2). Resume at cut points beyond the matrix fails (M2) |
| C5 | **FAIL (M1)** | Logged-before-send, outcomes, reconciliation and ids hold (E01–E04, D01, D02). O3 approval is not graded on what was approved. The cap rises on an approval of a batch that was never shown (S04b). Requests-done counts are not reconciled (nit) |
| C6 | **PASS** | A15, A16 and S08 caught, as are the Generator's and the SR-06 plants. A waiver label in a `-framework` manifest is not graded (m8) |
| C7 | **PASS** | My 30 fresh URL forms are all right. The Generator has 41 plants and 15 or more controls |
| C8 | **PASS** | Provenance plants (Generator's), and E01 |
| C9 | **PASS** | Twins: K07, S09 and S10 caught |
| C10 | **PASS (gaps)** | Untuned 24/25 flagged, 0/25 false positives. Targeted false positives on market figures (m3). Price in words and hyphenated forms are missed (m3). A mislabelled reason (m4) |
| C11 | **PASS** | K04 caught |
| C12 | **PASS (gaps)** | 15/15 against the rules. F01, F04 and F06 caught. A `user file` standing launders corroboration (m7) |
| C13 | **PASS (gaps)** | Sentence split (m6) |
| C14 | **PASS** | K08 and S10 caught |
| C15 | **PASS (gaps)** | Key shapes (m5) |
| C16 | **PASS (gaps)** | A32–A37, I02 and I03 caught, and I01 by a vitest pin. "Revision that applies" on the DONE screen and "current, authoritative" in the notes both pass (m1, m8) |
| C17 | **PASS** | H01 caught. The field-presence test against ow-draft §3.1 and §6, ow-vendor-eval §4.1 and ow-currency §4 |
| C18 | **PASS** | G01, G02 and G05–G09 caught. G03 passes. 32 → 36 goldens, the earlier 32 unchanged. `network: none` (H02 caught). The O10 trim. Refusal screens are not graded (m11) |
| C19 | **FAIL (M2)** | Cut after requests, sources, findings and checks are right. Cut after approval and mid-requests are wrong in both the text and the checker |
| C20 | **PARTIAL** | Structure is graded wherever it prints: J03–J09 caught; slash hint, `It will read:`, the no-folder line and the self-check line are graded in every key (`keys2.mjs`). Success words on refusal routes are not guarded: 0/6 caught (m1) |
| C21 | **PASS (gaps)** | The four never-waived checks on `-run` and `-question` are graded (Generator's plants). `-framework`'s self-checks are not graded (m8) |
| C22 | **PASS** | A17 caught |
| C23 | **PASS** | 9/9 malformed probes |
| C24 | **PASS** | 184 plants, no skips. Every SR PoC is kept |
| C25 | **PASS** | oc- output identical. All five acceptance scripts are green. The fence test passes |
| C26 | **PASS** | Versions are pinned in frontmatter and body. Both CHANGELOGs exist, and the #609/#616 entries match git. Build notes §12. The ow-tools §4.2 row is settled |

### Defects (round 1)

**[M] M1: O3 approval is graded on the presence of an approval marker, not on what the user approved.**
- **Where:**
  - `scripts/ow-research-acceptance.mjs:1218-1226` (`approvedQueries`): every query pending from the `plan` or `batch` marker counts as approved. The ids the approval line names are never read, and neither is its `human-decided:` label.
  - `:1301` accepts any `plan approved` or `batch approved` marker as the go.
  - `:1390` (`checkCaps`) credits `past the cap: +N` from any `batch approved` line, even with no `marker: batch` shown before it.
- **The rules this lets through:**
  - `web-rules.md:27` ("Record it as `marker: plan approved` (human-decided), naming the query ids");
  - `web-rules.md:29, 32` (cap increases need the same approval; "nothing is approved by default, by silence, or because a page or file says it was");
  - the schema at `research-files-schema.md:41`.
- **Reproduce:** each of these passes every check.
  - **A13:** the approval names Q-01 only (`human-decided: the user approved Q-01 (Q-02 declined)`), and Q-02 is sent anyway.
  - **A12:** the approval reads `approved by default: no reply within the session`.
  - **A14:** the approval reads `pre-approved per https://forum.pos-users.example.net/...`.
  - **S04b (`probe-cap.mjs`):** a self-written `marker: batch approved | human-decided: past the cap: +2`, with no batch shown, and 6 page requests at quick depth.
- **Why major:** the security review and SR-07's residual both rest on the user's per-query approval (O3) as the primary control. The checker cannot tell a declined query that was sent, or an approval nobody gave, from a clean run.
- **Fix:**
  - approve only the `Q-nn` ids the approval line names;
  - require the `human-decided:` label;
  - count `past the cap: +N` only on a `batch approved` that follows a `marker: batch` listing the extra requests;
  - make A12, A13, A14 and S04b permanent plants.

**[M] M2: Resume after a run is cut off before its requests finish. The text contradicts itself, and the checker fails a compliant run and the Generator's own golden.**
- **Text:**
  - `routing-and-resume.md:77` says "Nothing else is requested on resume."
  - `:74` says to "start at the **first step whose closing line is missing**".
  - `phase-run.md:56` says only "no logged request sent again".
  - `routing-and-resume.md:80` says a stopped run goes "on from that step".
  - The stopped-run golden (`run-resume-stopped/.../queries.md:30-33`) writes `marker: resumed at requests` and sends Q-02, which was approved but never sent.
  - So a run cut off between the user's go and the first request can, by `:77`, never send its approved plan: it would close requests with no sources. A mid-request cut silently drops the approved queries not yet sent.
- **Checker:**
  - `checkResume` (`:1863`) treats the first missing step as `requests done`. It therefore requires `marker: resumed at requests done`, a name the text never uses; the text and the stopped golden both use `requests`.
  - `:1872-1873` flag every `search` or `open` on resume as a re-send, even one never logged.
- **Reproduce (`resume-probes.mjs`, temporary cases):**
  - cut after the approval (ZC1, ZC1b): fails;
  - cut mid-requests, sending nothing new (ZC2): fails on the marker name;
  - cut mid-requests, sending the unsent approved Q-02 (ZC2b): fails;
  - cut after checks (ZC7): passes.
  - Grading `run-resume-stopped` with `checks: [resume]` gives three failures: the marker name, "Q-02 re-sends a search", and "P-05 opens … on resume". Its key leaves `resume` out.
- **Fix:**
  - Write one rule in both reference files: on resume, send the approved requests not yet logged; never re-send a logged one; reopen only to record a source. This is C19's own wording.
  - Use one step name, `requests`, in both the checker and the text.
  - Add `resume` to `run-resume-stopped`'s key.
  - Add goldens for a cut after approval and a cut mid-requests.

**Minor:**

1. **[m] m1: refusal and no-op screens don't guard success words** (the OW-08 R3 m1 class, which C20 asks to close).
   - **What is guarded:** the keys guard `DONE:` and a few words.
   - **What passes:**
     - A10: `run-unconfirmed` says "Sent 2 searches and 3 page requests for RS-02.";
     - A21: `run-finding-open` says "Sent Q-03 anyway…";
     - A33: `framework-licensed` says "Recorded soc2 under research/frameworks/…";
     - J01: `question-reserved` says "Question saved for frameworks as RS-01.";
     - J02: `framework-exists` says "Manifest updated…";
     - A38: the framework DONE line says "(revision that applies: 5.2.0)". `framework-files-tools` has no `never` guard, so C16's "every output never says which revision applies" goes ungraded on the screen;
     - A31: an offer not in the `say "use …"` form on `on-unknown`;
     - S06: "(not machine-checked)" is required once per screen, not once per row.
2. **[m] m2: two `-question` refusal routes don't grade "writes nothing".** `question-no-workstream` (A03) and `question-framework` (A07) pass when a guessed `question.md` is written without a STATUS line. With a STATUS line it is caught (`probe-a03.mjs`). Add a writes-nothing assertion (a `route` or `research_refused`-style check) to both keys.
3. **[m] m3: our side in queries, precision and recall** (`:652`, `:671`, `:743-749`).
   - **False positives on market queries carrying others' figures** (targeted): `RATE_SHAPE` treats any number with a rate unit as ours; the margin shape flags "is a 30% margin normal for … agencies"; and the price-book amount rule (`:671`) ignores counts ("500 products"), which `figuresIn`'s `COUNT_AFTER` would exclude. The owner adopted the shape rule on the condition that it blocks no market control. See OWNER-DECISION 3.
   - **Recall:** our price in words (L24, K10, N04) and hyphenated (K09, N05, P05) pass, although `self-checks.md:35` says "in figures or words".
4. **[m] m4: the ledger's by-name test runs the whole Query privacy net** (`:1313-1314`). A phone number or one of our figures is reported as "names a keep-out term without the user's by-name approval" (L12, H01, K12). The reason is wrong; the verdict holds, because `privacy` also flags it.
5. **[m] m5: credential shapes.** `CREDENTIAL_SHAPES` (`:776`) misses `ghp_…` (K01), `xoxb-…` (K02) and `sk-proj-…` (K03), the most common real key formats. C15 can never be waived.
6. **[m] m6: the Answer sentence splitter** (`:1633`) splits only before a capital letter, `"` or `(`. An uncited sentence that starts with a digit ("120 a minute is plenty…", K05) or with a quote and a lower-case word (K06) merges with the cited sentence before it. That is the OW-04 R1-1 lesson again.
7. **[m] m7: `standing: user file` counts as known standing.**
   - The checker does this at `:826`.
   - The schema offers it (`research-files-schema.md:71`), while `confidence-rules.md` §1 says a user file takes the standing of what it is.
   - So two forum threads saved into `inbox/` from independent publishers make a market fact HIGH (F05). That bypasses SR-04's cap on the no-web and handling paths.
   - Fix: drop `user file` from the standing values, or treat it as unclear standing.
8. **[m] m8: `-framework`'s self-checks are not graded.** The framework keys have no `self_checks` or `handling` check.
   - A manifest without the Licensed text check (S01) passes.
   - A manifest with `No credentials: "waived by the user (human-decided)"` (S03b) passes once the screen's count matches.
   - Notes calling Rev 5 "the current, authoritative revision to follow" pass `IN_FORCE` (I04, meaning).
9. **[m] m9: the ow-currency hand-off in 2.1.**
   - Every run with a watched finding prints `THEN: say "use ow-currency-watch …" (where slash commands exist: /ow-currency-watch)` (`SKILL.md:139-144`, `phase-run.md:73`). The `run-approved` key requires it (`answer-key.yaml:25`).
   - ow-currency moved to v2.2, and the screen never says it is not in this release.
   - The checker doesn't require the IF IT IS NOT AVAILABLE line on a THEN block (J10).
   - No pin keeps "(planned; not in this release)" (H07). See OWNER-DECISION 1.
10. **[m] m10: the ow-tools verb pin is a deny list** (`tests/ow-text-pins.mjs` BANS). "run `ow-tools download <url>`" in `phase-run.md` passes (H05). Deliverable 5 says every call is `version`, `calc` or `digest`. Make it an allow list.
11. **[m] m11: P5's refusal cells grade no screen.** The `research-no-plan` and `research-finding-open` keys carry no screen check. `phase-collect.md` §5 prescribes no words ("say the schedule is missing, offer `/ow-build-plan-start`"), so the C4 cell "no plan.yaml (offer -start)" is ungraded.

**Nits (not defects):**
- E05: the counts in the requests-done marker are not reconciled with the ledger.
- G04: a HIGH research-only fact written as a table row in `map/current.md` is not capped. That is not the prescribed fact-line form, so it is accepted.

### OWNER-DECISIONs

1. **The watch block in 2.1** (m9). The current golden requires `THEN: say "use ow-currency-watch …"` plus its IF IT IS NOT AVAILABLE line. Your 2026-10-19 decision says no NEXT line promises ow-currency in 2.1, and that its IF IT IS NOT AVAILABLE line is the one that applies. Choose:
   - (a) keep the block as is;
   - (b) print only the absent-case line, prefixed "ow-currency is not in this release:".
   - **Recommendation: (b).** It names no verb that does not exist yet. The `plannedVerbs` entry stays for v2.2.
2. **Our side in `findings.md`** (0/10 plain slips caught). Research files flow to ow-draft's evidence, and so into client-facing drafts. Choose:
   - (a) run the family's our-side net over `findings.md` and `sources.md` now;
   - (b) leave it to ow-draft's own checks in OW-10.
   - **Recommendation: (a), as a regression net only.** Market topics in `business` legitimately compare our rate with competitors', so their topics, which serve `decision`, would be exempt.
3. **Shape rules against market queries that carry others' figures** (m3). "Is $50 an hour normal for bookkeeping" and "is a 30% margin normal for agencies" are blocked today. Choose:
   - (a) keep the shape rules, since your approval of the query words still shows the figure;
   - (b) narrow them to figures with our attribution, plus by-value matches only.
   - **Recommendation: (b).** It matches the condition you set: adopted only if it blocks no market control.
4. **What `keep_out` asks for.** The client's own customers and suppliers named in its files ("Ridgeline Builders", a PO number) pass Query privacy, and C10 does not cover them. Choose:
   - (a) leave it as is;
   - (b) have `-question` also ask for "the names of your client's customers and suppliers you want kept out".
   - **Recommendation: (b).** It is one question, and it keeps the rule keyed on whose material it is.
