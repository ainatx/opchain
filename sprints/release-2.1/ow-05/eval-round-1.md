## OW-05 (Sprint 3b) — Evaluation Round 1

**Sprint:** ow-documentation 1.0.0, a new text-only skill with its acceptance checker and goldens, plus amendment P3 in ow-build-plan 1.2.0 (1.2.0 because OW-09's P5 took 1.1.0; owner ruling O9). Contract: `sprints/release-2.1/ow-05/contract.md` (C1–C26, the C4 route matrix, O1–O12, all approved at the recommendation).
**Branch:** `claude/ow-05-ow-documentation`, head `1eb730cd` (not pushed).
**Byte-identity base:** `11091f94` (merge base with `origin/main`, #636). `main` has since moved on with #638 (the gate budget, already carried here) and #639 (ow-research 1.0.1, ow-uat 1.0.2). The branch needs that merge before it lands. That is a note, not a defect.
**Evaluator:** independent Evaluator, oc-app-architect Phase 6.
**Date:** 2026-10-20.

**Standard applied:**
- **D1:** an internal number is OUR side only: our hours, rates, margin, unit prices and modifiers. The client's or a vendor's figures are not internal numbers.
- **D2:** meaning checks are a regression net plus the skill's self-check. Idioms and implied wording are accepted. Plain-wording slips are defects (minor).
- **R1-4:** screens are graded only on prescribed text plus structure (ids, paths, dates, NEXT lines).
- **Approvals** are graded on what was approved, never on a marker being present (C19).
- **Body:** at most 4,500 tokens, enforced by the catalog, and built to 4,100 or fewer. ow-build-plan's 4,353 with P5 and P3 is accepted by the orchestrator, so it is not a defect.
- **Plants are permanent** (C24).
- **Accepted by the owner, so not defects:**
  - SD-05: capture submits only under test-mode side-effect lines;
  - SD-07: `opchain-work/**/export/` is git-ignored;
  - O3: `network: declared`;
  - the residuals in design §13.5;
  - the ow-tools `deckChecks` gap (text after a slide image), deferred to an ow-tools follow-up (§13.3).
- **Not duplicated:** the security review (grade A−, gate met) is done. Nothing here re-grades SD-01 to SD-13 or RC-01 to RC-07. The criteria are graded through the fixes, and no regression from the fixes was found.
- **Severity:**
  - **[M] major:** a mechanical check giving the wrong verdict on a realistic run in a way that defeats its criterion, or skill text that goes wrong on a path the contract grades.
  - **[m] minor:** a gap or false positive in a meaning net, a screen guard R1-4 limits, an edge case, or drift.
  - The evaluation cap (a checker-only major moves to the follow-up PR) applies only after round 2, so it does not apply here.

**Where I worked.**
- `<E>` = `scratchpad/eval-ow05-r1`.
- `<E>/tree` is a detached checkout of `1eb730cd`, and `<E>/base` is one of `11091f94`. Each had `npm ci --ignore-scripts` run at the root and in `site/`. Both were removed at the end, after `git status --porcelain` came back empty in each.
- The Generator's worktree was not touched.
- The `--session` resume probe added one temporary fixture case to my tree (`tests/fixtures/ow-documentation/zz-eval-session-cut/`) and removed it in the same step. The catalog and contract plants edited skill files in my tree, and each was restored with `git checkout -- skills-work catalogs.json` straight after its run.
- **The harness, in `<E>/h/`:**
  - `heldout.mjs`: the untuned sets, written and hashed (`heldout.sha256`, 00:25 local) before I read `self-checks.md`, the rule parts of `document-formats.md` and `delivery-rules.md`, or the checker's rule code;
  - `lib.mjs`, which lays each golden out as a real run (the tree's own `--prepare` layering plus its expected output, with stub PNGs) and grades only failures that are new against the same golden laid out unedited;
  - `run-heldout.mjs`, which plants every sentence literally at the start and the end of a client section in a guide, an SOP, the runbook and the handover, and before and after a deck speaker note;
  - `run-private.mjs`, `plants.mjs`, `plants2.mjs`, `probe-price.mjs`, `session-resume.mjs`, `session-resume2.mjs`, `malformed.mjs`, `m12.mjs` and `probe-ci.mjs`;
  - the catalog and contract plants, run as a shell loop (output in this report).
- **Outputs:** `heldout.out`, `private.out`, `plants.out`, `plants2.out`, `malformed.out`, `npmtest.log`, `build-tree.log`, `build-base.log`, and `manifest-{base,tree}.txt` with `zips-{base,tree}.txt`.
- **Literal insertion:** planted sentences go in through `inSection` and `lit`, which work by string slicing. No planted sentence contains `$`. A few structural edits use `String.replace` with `$1` only to re-insert the matched anchor.

### Code Scores

| Criterion | Weight | Score | Justification |
|---|---|---|---|
| Functionality | 30% | **7/10** | **Strong:**<br>• The skill text is tight and consistent: one step table, which the phase files use verbatim (`stepNameProblems()` is `[]`); prescribed refusal, no-op and question words; and a complete NEXT block in every template.<br>• Write-once, `OP-nn` and the repo-copy rules are clear.<br>• Every C4 matrix cell has a golden, and all 107 goldens pass.<br>• The capture rules (labels, decision, origins, side effects, digests, re-capture) hold under 12/12 of my plants.<br>**Wrong:**<br>• `--session` and `--close` per-step resume is not graded at all. A resumed session that redoes its `record` step, writes a duplicate attendance section or skips the `rollout` row passes every check (M1).<br>• The contract's `--session` cut goldens are missing. |
| Feature Completeness | 30% | **7/10** | **Delivered:**<br>• ow-documentation 1.0.0: 8 verbs plus the folder route, 15 references, the edges file and its CHANGELOG;<br>• P3 in ow-build-plan 1.2.0, with its CHANGELOG and three P3 goldens (2 bought, 1 declined) plus three payment-terms goldens;<br>• the catalog wiring and the O2 in-place chain edits with pins;<br>• 107 goldens, 185 plant tests and the sentence sets;<br>• the ow-tools documentation-export test, with real pandoc and Typst runs that pass here;<br>• the ow-build stand-in swapped for a byte copy;<br>• build notes §13 and the security review with its PoCs.<br>**Missing or thin:**<br>• the contract-required `--session` cut goldens, and any `--close` cut (M1);<br>• free-wording success guards on refusal screens (m1). |
| Code Quality | 20% | **6/10** | **Strong:**<br>• C11 untuned: 18/18 our-side slips caught in all 10 placements, with 0/20 false positives on technical and client numbers (0/200 placements);<br>• 149/170 valid plants caught;<br>• 15/15 malformed files fail per check, with no crash;<br>• category rules imported, not copied;<br>• the writer and hand-off pins; oc- outputs byte-identical.<br>**Against:**<br>• the resume check cannot read a mode verb (`"/ow-documentation-rollout --session".split(" ")[0]` has no table row), and nothing catches a duplicated session or summary (M1);<br>• `documentation_price` is caught only as `$4,000` (2/11 forms);<br>• 0/14 free-wording success claims caught on refusal screens;<br>• imported people recall 2/10 on unlisted names. |
| UX (clarity for person and model) | 20% | **8/10** | Body **4,095** tokens (cap 4,500, built to ≤ 4,100). Description 859 characters, naming the skill in its first 200. The welcome is two lines. "What leaves this machine" (`delivery-rules.md`) is plain and honest about host-enforced limits. Reads-from and hands-off tables have one row per file. **Against (nits):** the `MORE PEOPLE` no-folder line in the `rollout-session-46` golden ("attach the request") differs from `SKILL.md`'s template ("say the request"), and `--session` gives no resume screen of its own (see M1's fix). |

**Weighted Code Score:** 0.3×7 + 0.3×7 + 0.2×6 + 0.2×8 = **7.0 / 10**

**Verdict: FAIL.** Every score is at least 6, but one major defect is open (M1). M1 is confined to the checker and the goldens; the skill text is right. It is a narrow fix:
- teach `checkResume` and `recordedSteps` the two rollout rows;
- catch a repeated session section, a session row missing for a recorded section, and a repeated `## Summary`;
- add the `--session` cut golden (and a `--close` one).

Everything else is minor: screen guards, meaning-net recall, and price forms.

### Test Results

| Run | Result |
|---|---|
| `gen-skills-catalog` / `check-skill-contracts` / `lint-internal-refs` | exit 0 / 0 / 0. The ow catalog validates **6** skills |
| `ow-documentation-acceptance` | exit 0: **107** golden runs, every check passing (1.3 s) |
| ow-start / ow-start-logs / ow-build-plan / ow-build / ow-uat / ow-research acceptance | exit 0: **54 / 50 / 36 / 55 / 145 / 73** |
| `npx vitest run` (full, once; **256 s**, no other suite running) | 146 files: **7,740 passed, 2 failed, 15 skipped**. The 2 failures are `tests/audit-integration/mcp-hosted-references.test.js`, which needs `public/docs/` from a build. That is environmental and predates this sprint (OW-09 saw the same) |
| OW-05 test files (`ow-documentation-{acceptance,plants,security}`, `ow-tools/documentation-export`) | **656 passed, 1 skipped**. The skip is the `runIf(!ready)` "skips without pandoc and Typst" case, an honest label: pandoc and Typst are installed here, and the real-binary half ran and passed (guides, SOPs, runbook, handover, facilitator, modules, cards and videos to PDF and Word, and the deck to PPTX) |
| Added skips in the diff | one `describe.skipIf(!ready)` with an honest label, and its `runIf` twin. No other `.skip` |
| `npm run build` | tree: exit 0, **14 s** (`@ 1eb730cd`). Base: exit 0, **13 s** (`@ 11091f94`). `git status --porcelain` before and after: empty |
| oc- byte-identity vs a build of `11091f94` | **561 files in each**, with the same file list. 40 differ, each explained:<br>• `dist/index.js`, by the version string only (`"11091f94"` → `"1eb730cd"`);<br>• `public/demo/index.html` and `site/dist/demo/index.html`, by the `generatedAt` timestamp;<br>• 37 skill zips, by entry timestamps only (`unzip -v` CRCs per entry: 0 differences).<br>**Contents identical** |
| Body / description / protocol | ow-documentation **4,095** tokens (chars/4, the catalog's estimator) / 859 chars. ow-build-plan **4,353**. `ow-protocol.md` byte-identical in all 6 copies. `examples/handoffs.yaml` byte-identical in all 5 copies |
| Cross-skill | `delivered.md` in ow-build's `invoice-documentation` is a byte copy of the `delivered` golden (`cmp`). ow-build's `invoice-documentation-refused` bases on it and passes. No ow-uat fixture changed, and ow-uat's 145 goldens pass, so its terms digests are unchanged |
| Not verified | `npm run evidence:pr` and the per-commit candidate verifier. A live capture and a live connector push (not graded, per the contract) |

### Generator claims, verified

| Claim | Verdict |
|---|---|
| Body about 4,096 tokens | **True**: 4,095 (16,380 chars / 4) |
| ow-build-plan at about 4,353 with P5 and P3 | **True**: 4,353 |
| Security review grade A−, gate met | **True** (`docs/audits/2026-10-19-ow-documentation-1.0-security-review.md`: B− at the review, A− at the re-check). Not re-graded |
| P3 is ow-build-plan 1.2.0, and ow-uat's digests are unchanged | **True**. Frontmatter and body say 1.2.0. CHANGELOG `## 1.2.0 (2026-10-19)`. `documentation_people` is top-level in `accepted-signed`, `route-folder` (bought) and `private-names-business` (declined). No ow-uat fixture changed, and its 145 goldens pass |
| The ow-build stand-in is replaced by a golden copy | **True**: byte-identical. `route-trigger-delivered` runs on `invoice-documentation` |
| Every C4 cell has a golden | **True**. Row by row: the uat say (9 stages), no path (one, several), own NEXTs (including both "everything written" no-ops), capture (9), export (7), delivered (4), rollout (7), folder route (9) |
| Writer modes pinned in the checker | **True**: `WRITER_PIN` and `edgesWriterDrift`. My W01–W12 were 12/12 caught |
| Per-step resume at every cut (C20) | **Partly**. `-start` (5 cuts), `-capture` (3 cuts plus the re-capture) and `-export` (4 cuts, mid-push included) are there and graded. `--session` has no cut golden, and the checker cannot grade it (M1) |
| The O2 chains are checked | **True**. Dropping `build.yaml` from ow-uat's hop (B9) and reading a field ow-uat does not offer (B10) both fail `check-skill-contracts` |

### Untuned set (`h/heldout.mjs`, written before the rules; run through the whole checker)

Each sentence was planted literally at the start and the end of a client section in a guide, an SOP, the runbook and the handover, and before and after a deck speaker note: 10 placements per sentence (8 for table rows). "Caught" means the named check gained a new failure in every placement.

| Set | Size | Result |
|---|---|---|
| C11 our-side slips (our hours, effort, rates, add-on, margin, overruns, multiplier, `documentation_price`) | 18 | **18/18 caught, 180/180 placements** |
| C11 legitimate (schedules, retries, timeouts, ports, versions, thresholds, retention as stated, client volumes, sessions, groups, a client's price-list discount) | 20 | **0/20 false positives, 0/200 placements** |
| C10 credentials: values and key shapes | 11 | **9/11**. Missed in every placement: `AWS_SECRET_ACCESS_KEY=<40 chars>` (a labelled env value whose name is joined by underscores) and a `-----BEGIN RSA PRIVATE KEY-----` block (m3) |
| C10 credentials: controls (secret names, where they live, a published test card, `sk_test_` prefix rule, `--sign-in`) | 10 | **0/10 false positives** |
| C10 people: names and contact details not on the key's list | 10 | **2/10** (the email and the `+1 512 555 …` phone). Missed: six unlisted full names or first names in prose, "Mr. Whitfield", and a UK-format `07700 900123` (m4) |
| C10 people: controls (roles, tester ids, places, the business, weekdays, a system name) | 10 | **0/10 false positives** |
| C10 data: customer data in a document | 10 | **5/10 by `data`** (7/10 by some meaning check: two more by `people`). Missed: "Patel, Anjali", "Customer C-1182 Mark Ellis, date of birth 1984-03-12", "the real customer's address (8 Quarry Road)" (m5) |
| C10 data: controls (count and schedule tables, test-data pointers, synthetic ids) | 10 | **0/10 false positives** |
| Private names in scope (`self-checks.md` §1: the catalog's blocklist and the key's names), 5 spellings each | 10 | **10/10** for the catalog's names (read at run time, never written into the harness) |
| Private names from the answer key, 10 spellings of two invented names | 10 | **4/10**. Missed: `quillmoor-studio`, `Quillmoor_Studio`, `QuillmoorStudio`, `QM OPS`, `qmops`, `qm_ops`. The key rule joins every character with `[\s_-]?` but keeps the key's own separator literal (`:2187`) (m6) |
| Private-name controls (`Quills and moor-green`, "QM report", "Ops hours", "Studio sessions") | 4 | 0/4 false positives |
| Beyond the documented rule: another client of ours named in a Larkspur document ("Mossgate Books", "fernhill-florists/…") | 10 | **0/10 flagged**. `self-checks.md` §1 does not cover it (OWNER-DECISION 1). 0/10 false positives on its controls |

**The `documentation_price` value (C11 "copies `documentation_price` into no document", C5 "a price in docs.yaml"; `probe-price.mjs`, Larkspur's 4000):** **2/11 forms caught.**
- **Caught:** `$4,000` in a guide, and `price: $4,000` in `docs.yaml`.
- **Missed:**
  - in a guide: `$4000`, `4,000`, `USD 4000`, `4000 dollars`, `4k`, "four thousand dollars", `4,000.00`;
  - in `docs.yaml`: `documentation_price: 4000` and `documentation_price: 4,000`. These are the shapes a model copying the key from `contract-inputs.md` would write (m2).

**The Generator's held-out sets** (`tests/ow-documentation-sentences.mjs`, frozen) pass in `npm test`. The file says they were measured before and after; its header does not record the before numbers.

### Plants

| Batch | Items | Result |
|---|---|---|
| `plants.mjs`: C1 writer modes (12); C4 route cells (12); C21 refusal screens (13); C5 (9); C6 (8); C7 (10); C8 (8); C9 (12); C11 (10); C12 (8); C13 (8); C14 (10); C15 (12); C16 (8); C19 (12); C20 (10); C17 (6); C10 (6) | 174 planted; 4 withdrawn | **149/170 caught.**<br>**Withdrawn:**<br>• T03: `docs/deploy.md` really holds `npm test`, so the plant was wrong;<br>• V08: the facilitator guide needs no gap marker;<br>• D07: a `user-stated` date is the user's word by design;<br>• L09: an extra role in a client-reported table is no rule |
| `plants2.mjs`: more C19 content (trainer, roles, the plan's count, the dated confirmation, who confirmed a push, the listing on screen, the decision's date, `trainer_role` id) | 8 | **7/8**. A16 (a confirmation dated before the work) is a nit |
| `session-resume*.mjs`: `--session` and `--close` resume and write-once | 5 + 1 compliant | **0/5 caught** (M1). The compliant resume fails `resume` with "/ow-documentation-rollout has no row in the step table" |
| Catalog, contracts and shipped text (B1–B12): a 6,696-token body; a 1,026-character description; a one-byte `handoffs.yaml` drift; `--pptx`; `use ow-controls-scope`; "(round 1 m5)"; `check-skill-contracts`; `app-architect`; a hop dropping `build.yaml`; an unoffered field; a NEXT to ow-controls; `network: none` | 12 | **12/12**. B3 is caught by the vitest pin (`tests/ow-documentation-acceptance.test.js:158`), not by the catalog. That matches the contract |
| `probe-price.mjs` | 11 | 2/11 (m2) |
| `malformed.mjs` (C23) | 15 | **15/15 fail per check, no crash.** M12 (a scalar `delivered.md` header) fails `delivered` with the raw text "check could not run: Cannot read properties of undefined (reading 'split')". It is isolated, so this is a nit |

**Totals:** 221 must-catch plants and probes, **185 caught**.

**The 36 misses, by defect:**

| Defect | Missed |
|---|---|
| M1 | the five `session-resume2.mjs` probes |
| m1 | S01–S12, X11, A12 |
| m2 | F03, and 9 of the 11 price forms |
| m3 | O03 |
| m7 | N09 |
| m8 | L01, L10 |
| m9 | Y07 |
| m10 | C03 |
| Nit | A16 |

### Criteria C1–C26

| # | Verdict | Evidence |
|---|---|---|
| C1 | **PASS** | The catalog and contracts are green. W01–W12 caught (12/12); R08–R12 catch wrong-verb writes on route cells; B9, B10 and B11 fail `check-skill-contracts`. ow-documentation is out of `planned` |
| C2 | **PASS** | 4,095 ≤ 4,100, and the catalog enforces 4,500 (B1 fails the catalog at 6,696). B2 fails at 1,026 characters. B3 fails the vitest pin. `network: declared` (B12 fails as `none`). The protocol copy is byte-identical (6 copies) |
| C3 | **PASS** | B4–B8 and B11 caught by `shippedTextProblems` and `check-skill-contracts`. The catalog's names are caught 10/10 in five spellings |
| C4 | **PASS (gaps)** | Every matrix cell has a golden. R01–R12 caught 12/12: a re-freeze, a written file on a no-op or refusal, a wrong verb. Free-wording success claims on refusal screens are not guarded (m1) |
| C5 | **PASS (gaps)** | F01, F02 and F04–F09 caught: 40 → 2 groups, `room_for`, people and size drift, a 16th person in G-03, an unsigned CO, `docs.yaml` groups changed by `--add-group`. A price in `docs.yaml` is caught only with a currency sign (F03, m2) |
| C6 | **PASS** | V01–V07 caught: the gap marker dropped from the guide, deck, module and card; an alert with no entry; a missing card; a dropped task |
| C7 | **PASS** | T01, T02 and T04–T10 caught: an invented command, a missing path, an uncited step, an unconfirmed console setting, nonexistent SC, map and CO ids, a step number beyond the scenario, a runbook entry with no Source |
| C8 | **PASS** | O01, O02 and O04–O08 caught: no If-that-fails, a rotate entry written, ids not from `OP-01`, no Roll back, a renumbered id, no Retry, no Secrets (names only). H01–H06 (field presence) caught. A 24-character secret value in the runbook passes (O03, m3) |
| C9 | **PASS** | P01–P12 caught 12/12: relabel, production without a decision, a password fill, a pointer-only image used, an absolute home path, a non-synthetic fill, an unconfirmed origin, a double row, no `sha256`, a finding not recorded, pending after check, a pending image no run wrote |
| C10 | **PASS (gaps)** | Waiver goldens for each of the four. C01, C02, C04, C05 and C06 caught. Untuned credentials 9/11, people 2/10, data 5/10 (7/10 by some meaning check), all with 0 false positives in 30 controls (m3, m4, m5). The log form accepts trailing text (C03, m10). The attendance import is golden-tested (name column dropped, the password in a note logged) |
| C11 | **PASS** | Untuned 18/18 caught with 0/20 false positives. N01–N08 and N10 caught, including an `ow:internal` line in a deck note, the internal section, the export/markdown copy and the repo copy. `rollout.yaml` is not read (N09, m7). `documentation_price` forms (m2) |
| C12 | **PASS** | D01–D06 and D08 caught: inferred retention, no escalation, no image or placeholder, no review date, no "What changed", no "If it goes wrong", no guide link |
| C13 | **PASS** | K01–K08 caught: two images on a slide, a module with no answer or no check question, an unquoted role's card, four daily items, a name in attendance, no shot list, no expected results |
| C14 | **PASS (gaps)** | L02–L08 caught: a close before day 30, a check-in off by a day, a sheet's "no" recorded as yes, a name kept, a day-30 NEW GAP, a client trainer's group run by the user, no Summary. A section dated before its due date (L01) and invented usage tracking (L10) pass (m8) |
| C15 | **PASS (gaps)** | X01–X10 and X12 caught: outside the folders, a client-edited file overwritten, an unconfirmed push, a placeholder exported, an absolute path, `--pptx`, the ow- header kept, a wrong digest, a flat folder, a location a file named, the source named as the client's file. A commit claimed on the screen passes (X11, m1) |
| C16 | **PASS (gaps)** | Y01–Y06 and Y08 caught. Byte copy identical, and ow-build's 55 goldens pass. `delivered.md` listing a file that was never exported passes (Y07, m9) |
| C17 | **PASS** | H01–H06 caught. The field-presence tests match ow-build's reads row (`delivered.md` [the delivery date]), ow-start's index keys (`created`, `trainer`), and the H3 and ow-care read lists |
| C18 | **PASS** | P3 text, 1.2.0, CHANGELOG, top-level key, payment-terms sentence, feasibility exclusion. Three P3 goldens plus three updated, and the Generator's P3-1 to P3-4 plants. ow-uat is unchanged |
| C19 | **PASS** | A01–A11, A13–A15 and A17–A20 caught. Approvals are graded on content: the set, roles, groups and trainer against `plan.md`; each clearance names its own file and digest, by the user; the decision's checks, role and date; the push listing per file and location, by the user, shown on screen; the repo branch and every file; the trainer's role and id; the protocol sentence. A12 is a screen-wording miss (m1) |
| C20 | **FAIL (M1)** | `-start`, `-capture` and `-export`: Z01–Z10 caught (a re-freeze, a duplicate push, a rewritten session row, the plan redone, a renamed step, a redone scope, the mid-push question dropped, an adoption section edited, steps out of order, a step recorded twice). The step-name pin holds. **`--session` and `--close`: no cut golden, the resume check cannot grade them, and duplicates pass (M1)** |
| C21 | **PASS (gaps)** | Structure is graded in every key: DONE paths are files written, "Nothing was written." on refusals (S13 caught), the slash hint, `It will read:`, the no-folder line, `IF IT IS NOT AVAILABLE`, and the self-check line and its order. Free-wording success claims: 0/14 (m1) |
| C22 | **PASS** | The four waiver-refused goldens. The Generator's F01–F03 (a FINDING exported, a FINDING written, a never-waived check shown waived). `RUNS_IN` is checked against the self-check line's order |
| C23 | **PASS** | 15/15 malformed files fail per check, with no crash (M12 nit) |
| C24 | **PASS** | 185 plant tests, every SD and RC PoC kept (`ow-documentation-security.test.js`). The single skip is an honest `runIf` label |
| C25 | **PASS** | oc- output contents identical (see Test Results). All seven acceptance scripts green. `check-skill-contracts` green on every skill |
| C26 | **PASS** | 1.0.0 in frontmatter and body, with its own CHANGELOG. ow-build-plan 1.2.0. ow-uat and ow-build not bumped (data edits, recorded in ow-uat's and ow-start's CHANGELOGs; ow-build has no CHANGELOG on main). Build notes §13. The ow-tools §4.2 `-export` row is settled (O8) |

### Defects (round 1)

**[M] M1: `--session` and `--close` per-step resume and write-once are not graded, and the contract's `--session` cut goldens are missing.**
- **Where:**
  - `scripts/ow-documentation-acceptance.mjs:1104` (`checkResume`) takes `String(key.resume?.verb ?? verbs[0]).split(" ")[0]` (dropping the mode even when the key names it), which is `/ow-documentation-rollout`, but the step table keys are `/ow-documentation-rollout --session` and `--close` (`:410-416`). The check returns "has no row in the step table".
  - `recordedSteps` (`:1094-1101`) returns `[]` for both rollout rows.
  - `checkWriteOnce` (`:633-637`) only checks that earlier `training-record.md` and `adoption.md` sections are unchanged. Appended duplicates pass.
  - `checkRollout` and `checkRecord` do not reconcile `rollout.yaml` `sessions` with the sections recorded.
- **The rules this lets through:**
  - `routing-and-resume.md` §2: `--session` steps `record`, `rollout`; `--close` steps `summary`, `closed`; "never repeats a recorded step";
  - `rollout-schemas.md` §2: one section per session, appended once; §3: `## Summary` written once;
  - the contract's C20 verification: "Goldens for a cut at every step of `-start`, `-capture`, `-export` … and `--session`."
- **Reproduce (`session-resume2.mjs`, on the real goldens):** each of these passes every check.
  - `rollout-session` with the G-01 section written twice (attendance double-recorded);
  - `rollout-session` with the section written and no `rollout.yaml` session row (the run stopped after `record`, yet prints `DONE:`);
  - two `sessions` rows for G-01;
  - `rollout-session-client-reported` with TT-01's section repeated;
  - `rollout-close` with `## Summary` written twice.
  - `session-resume.mjs` (temporary case `zz-eval-session-cut`, the state after `record`): a run that redoes `record` passes, and the compliant resume fails only on `resume`'s missing row. Its `status` and `screen` also fail, because the text prescribes no resume screen or STATUS path when `training-record.md` is not rewritten.
- **Why major:** C20 is graded per step for `--session` by the contract, and the cut after `record` is the realistic cut: the sheet was imported, then the session ended. A resume that repeats the step double-counts attendance and passes every check, so C20's criterion is defeated for this verb. The skill text is right, so the fix is confined to the checker.
- **Fix:**
  - key `checkResume` on the full verb and mode;
  - teach `recordedSteps` the two rows: `record` = a section for the group in `training-record.md`, `rollout` = its `sessions` row, `summary` = `## Summary`, `closed` = `rollout.yaml` `closed`;
  - fail a second section for the same group, a recorded section with no `sessions` row once the run claims `DONE:`, a second `sessions` row for one id, and a second `## Summary`;
  - add `rollout-session-resume-rollout` (cut after `record`) and `rollout-close-resume-closed` goldens;
  - prescribe in `phase-rollout.md` §3 what a resumed `--session` prints (`DONE: G-nn session -> docs/<client>/rollout.yaml`) and its STATUS path;
  - keep the five probes as permanent plants.

**Minor:**

1. **[m] m1: refusal and no-op screens do not guard free-wording success claims** (the OW-09 R1 m1 class). C21 says the `never` guards catch "pushed" and "delivered".
   - **What is guarded:** the global guard (`:905-908`) covers only `DONE:` and `Appended:`, and keys add `exported` on one case and `delivered on` on another.
   - **What passes (S01–S12):**
     - "Exported 33 documents to export/" (`export-finding-refused`);
     - "Pushed export/guides/bookkeeper.docx to the shared drive" (`export-placeholder-refused`);
     - "Recorded the delivery in …/delivered.md" (`delivered-refused`);
     - "The documents were delivered again" (`delivered-again`);
     - "Added G-04 to rollout.yaml" and "Wrote the day 14 check-in", on two refusals;
     - "The rollout is now closed" (`rollout-close-wait`);
     - "Wrote docs.yaml…", "Captured 25 shots…" and "Saved docs.yaml and plan.md…" on three refusals;
     - "Exported every document; the waiver was recorded".
   - **Also passes:** "Committed docs/ … and pushed it" on the export screen (X11), and "Waived as you asked." on a waiver refusal (A12).
   - **Fix:** a global guard on refusal and no-op screens against `\b(?:exported|pushed|delivered|recorded|wrote|written|saved|captured|added|closed|committed|waived)\b`, outside the prescribed lines. Keep the 14 as plants.
2. **[m] m2: `documentation_price` is matched in one form only** (`amountIn`, `:978-982`): a currency sign plus thousands separators, or `toFixed(2)` without separators.
   - Missed in client documents: `$4000`, `4,000`, `USD 4000`, `4000 dollars`, `4k`, "four thousand dollars", `4,000.00`.
   - Missed in `docs.yaml`: `documentation_price: 4000`, a copied key and the likeliest slip. `docs.yaml`'s amount rule (`:1019-1020`) also needs a currency sign, so a bare `price: 1800` (F03) passes.
   - `docs-yaml-schema.md` §4 says "Prices never enter this file … not `documentation_price`".
   - **Fix:** fail any `*price*` key in `docs.yaml`, and match the value with and without separators, sign or `.00`, and in `k` and word forms (the family's NUMWORDS).
3. **[m] m3: credential shapes** (imported `credentialFindings` plus `SIGN_IN_SHAPE`). Three forms pass:
   - a PEM `-----BEGIN … PRIVATE KEY-----` block;
   - `AWS_SECRET_ACCESS_KEY=<40 chars>` (a labelled env value whose label is joined by underscores, so `\b` never splits it);
   - a 24-character mixed token in parentheses after a secret's name (O03, "(currently ABq7…)").

   No Credentials is never waived, and `.env` contents are what a handover copies from. Add the PEM header, `[A-Z0-9_]*(?:SECRET|TOKEN|KEY|PASSWORD)[A-Z0-9_]*\s*=\s*\S{8,}`, and a long mixed-case token near a secret's name.
4. **[m] m4: people recall on names the key does not list.**
   - 2/10 untuned. Six unlisted names, "Mr. Whitfield" and a UK-format phone pass. The rule is imported from ow-uat (list plus slot words), so this is a family-level regression net (D2).
   - ow-documentation meets names the key cannot list: attendance sheets, check-in reports and trainers.
   - A capitalised-two-word-name rule in client documents, with the system and place controls from the people set, and a wider `PHONE`, would lift recall. Measure against the 10 people controls, which currently give 0 false positives.
5. **[m] m5: data recall in prose.** "Patel, Anjali", a record id with a name and a date of birth, and a street address in prose pass. Table shapes, labelled fields and emails are caught.
6. **[m] m6: private names from the answer key keep their own separator literal** (`:2187`: `[...String(n)].map(esc).join("[\\s_-]?")`).
   - "Quillmoor Studio" never matches `quillmoor-studio`, `Quillmoor_Studio` or `QuillmoorStudio`; `qm-ops` never matches `QM OPS`, `qmops` or `qm_ops`.
   - The catalog rule (`familyNameRules`) splits on separators and catches all of these.
   - **Fix:** build the key rule the same way.
7. **[m] m7: C11 does not read the rollout plan.** `clientTexts` (`:2099-2108`) covers documents, export copies and the repo copy. "planning these sessions took me 4 hours" in `rollout.yaml` (N09) passes, although C11 lists "the rollout plan's client part" and `self-checks.md` §2 lists "the rollout plan's groups and dates". Run `docInternalFindings` over `rollout.yaml`'s text values and `plan.md`'s `## Groups` and `## Delivery`.
8. **[m] m8: check-in records.**
   - A check-in section dated before its due date (L01, `## Day 14 check-in, 27 February 2027` with due 2027-03-03) passes, because only the key's `today` is compared.
   - `Usage counts:` naming tracking that was added for this (L10, "page views tracked by a new script we added") passes, although `phase-rollout.md` §4 allows "usage counts only where the build already logs them".
   - **Fix:** compare the heading date with `rollout.yaml` `checkins[].due`, and require `Usage counts:` to say "from the build's … log" or "not logged by the build".
9. **[m] m9: `delivered.md`'s file list is not reconciled with `deliveries.yaml`.** A file never exported (`export/guides/owner.pdf`, Y07) passes. `deliveries-schema.md` §2 says it lists "each export file and repo copy deliveries.yaml lists".
10. **[m] m10: the `secrets-seen.log` line form accepts anything after `session:`** (`SEEN_LINE`, `:2167`: `session: [^|]+$`). "session: --session G-01 (9 characters)" passes (C03), although `self-checks.md` §4 says "never the value, a part of it or its length". Anchor the session field to the verb forms (`-start`, `--session G-nn`, and so on).

**Nits (not defects):**
- A16: a confirmation dated before the work began is not compared with the sign-off or the start date.
- M12: a scalar `delivered.md` header makes `checkDelivered` report a raw TypeError. It is isolated, so C23 holds.
- The `rollout-session-46` golden prints "[no folder attached: attach the request when you say it]", while `SKILL.md`'s `MORE PEOPLE` template says "say the request". R1-4 does not grade it, but the golden should match the template.
- `tests/ow-documentation-acceptance.test.js:233-241`, "already requested: refused", is tautological: it sets the ledger state and then asserts it. ow-build's own `invoice-documentation-refused`, which runs on the swapped copy, is the real cover.

### OWNER-DECISIONs

1. **Another of our clients named in a client's documents.**
   - `self-checks.md` §1 defines No private names as the catalog's blocklist plus skills outside the family.
   - A Larkspur guide saying "We built a similar flow for Mossgate Books" or "Copied from fernhill-florists/guides/…" passes every check (0/10 untuned). D3 keeps client names out of the repository, but at run time cross-client mentions are a confidentiality leak into client deliverables, and the folder already knows the other workstream slugs (`opchain-work/{plans,builds,uat,docs}/<slug>/`).
   - Choose:
     - (a) leave it to the same-session self-check;
     - (b) extend No private names (never waived) to every other workstream's slug and client name found under `opchain-work/`, in client outputs only.
   - **Recommendation: (b), as a regression net.** It is one sentence in `self-checks.md` §1 and one rule fed by the folder listing. Its 10 controls (fern, moss, books, florist as ordinary words) give 0 false positives today, and would gate it.

Code and text settle everything else, including M1's resume screen wording, which `phase-rollout.md` §3 can prescribe.

---

## Generator's response (round 1 fixes, 2026-10-20)

Every fix, the merge, the owner decision and OW-06's O6 edits are in one commit after the merge of `origin/main`. ow-documentation stays 1.0.0 (unreleased). Line numbers are `scripts/ow-documentation-acceptance.mjs` at the fix commit.

**The merge first.** `origin/main` at `6fcdebdf`: #638 (already carried, byte for byte) and #639 (ow-research 1.0.1, ow-uat 1.0.2). Three conflicts, all text: `skills-work/README.md` (both rows kept, at main's versions), ow-uat's CHANGELOG (this branch's "Unreleased" data edits above main's 1.0.2), and the ow-research C26 test (main's 1.0.1 pins with this branch's ow-build-plan 1.2.0). ow-uat's terms digest pin (`sha256:eb78a5c4…`) and the ow-research pins hold. One merge consequence: ow-uat 1.0.2 makes Visa's published `4111 1111 1111 1111` test data, so the data plant that used it moves one digit off and the published number joins the data controls (`tests/ow-documentation-sentences.mjs`).

### Each defect

| # | Fix | Where |
|---|---|---|
| M1 | Resume keyed on the verb and its mode; `--session` steps are per group (`record` = the group's section, `rollout` = its row), `--close` steps are `summary` and `closed`. A second section for a group, a second session row, a row with no section, a section with no row once the run says DONE, a second `## Summary` or check-in, and an appended section that repeats one already written each fail. Two cut goldens: `rollout-session-resume-rollout` and `rollout-close-resume-closed`. `references/phase-rollout.md` §3 and §6 prescribe each resume screen and the STATUS path | `sessionGroup` :1258, `recordedSteps` :1266, `checkResume` :1288; `checkWriteOnce` :715; `checkRollout` :2051; `checkRecord` :2072; `checkAdoption` :2135 |
| m1 | A success claim in any wording on a refusal, no-op or question screen, outside the prescribed lines (negated, modal and rule clauses pass; file names are set aside first); a commit, merge or git push in the client's repository claimed on any screen | `successClaims` :989, `commitClaims` :1001, `checkScreen` :1027 |
| m2 | `priceIn`: the amount grouped by a comma, a space or nothing, with or without `.00`, as `4k`, in words; with a currency sign or word, or bare in a sentence about a price. Any `*price*` key in `docs.yaml` or `plan.md`'s header | `priceIn` :1113, `priceKeys` :1135, :1174, :1245 |
| m3 | A PEM private key block; a value given to a secret-named setting (never a placeholder); a random-looking token beside a secret's name | :455 to :480 |
| m4 | A common given name standing as a word (the list leaves out names that are everyday words, months, places or products), a title with a name, a wider phone shape (UK mobile and London groupings, any `+country` number) | `GIVEN_NAMES` :485, `PHONE_WIDE` :487, `docPeopleFindings` :488 |
| m5 | A street address, a date of birth, a surname-first name, a customer named or emailed in prose; a test mark is read in the words, never in an email's domain | `STREET` :506, `BIRTH` :507, `docDataFindings` :510 |
| m6 | The key's names split on separators and joined by any run of them, as the catalog's rule does | `nameRe` :2450 |
| m7 | `rollout.yaml`'s text values (not the calc records) and `plan.md`'s Groups and Delivery read for our numbers; the rollout and start keys grade `internal_numbers` | :2371 |
| m8 | A check-in heading dated before its due date; `Usage counts:` must say the build's own log, or "not logged by the build" | :2150 |
| m9 | `delivered.md`'s list equals `deliveries.yaml`'s exports and repository copy, both ways, with the branch | :1955 |
| m10 | The log's session field is the verb that saw it (`-start`, `--session G-01`, `--checkin 14`, …) and nothing else; `references/self-checks.md` §4's template says so | `SEEN_SESSION` :2431 |
| Nit A16 | A confirmation dated before the sign-off or the scope step it confirms | :1223 |
| Nit M12 | A header that is a scalar or a list is reported as "the header is not a map", never a TypeError | :263 |
| Nit | `rollout-session-46` prints `[no folder attached: say the request when you say it]`, as `SKILL.md`'s `MORE PEOPLE` template does | the golden |
| Nit | The tautological test is replaced by ow-build's own `invoice-documentation-refused`, run over the byte copy | `tests/ow-documentation-acceptance.test.js` |
| Found here | The Generator's dropped-file sweep found one gap: a re-capture's plan dropped while `shots/index.md` records its run. Fixed; 327 of 327 drops caught | :1347 |

**Owner decision 2026-10-20 (YES).** Every other workstream's client name (the `client:` its files record) and folder slug under `opchain-work/` is a private name in a client output (a document, its internal part too, its export copy, the repository copy), in any spelling, plus the name's first word as the client ("Fernhill's team", "the Mossgate deck"). `logs/business/` and `research/business/` are the business's own, and a follow-on folder of the same client (`larkspur-ceramics-2`, or the same client name) is not another client. Internal files and the screen are unaffected. `references/self-checks.md` §1 says so in the No private names row. Controls first: the current client's name passes, an internal training record and the screen naming another client pass, and a follow-on folder passes (`tests/ow-documentation-heldout-r1.test.js`). `otherClients` :2456, `otherClientRules` :2474, `checkPrivateNames` :2488.

**OW-06's contract, O6 (a), taken here** (no version change):
1. `references/document-formats.md` §4 and `references/phase-write.md`: an update's `OP-nn` is the next after the highest in the runbook's and ow-handoff's operator notes' `ops:`. A reads row (`from: ow-handoff`, `fields: [ops]`, with the contract's `if_absent` and `if_mismatch`) and a Reads-from row. The golden `write-runbook-update` (an invented stand-in `operator-notes.md` with `OP-08` and `OP-09`; the new alert's entry is `OP-10`) and plants for a reused rotate id and a skipped id (:1541).
2. The Delivered hand-off to `/ow-handoff-notes` carries `docs/<client>/secrets-seen.log` [kind, role, source, session]; `HANDOFF_PIN` (:618) and the template's `It will read:` line follow.
3. `references/delivery-rules.md` §1: "ow-handoff's access-removal list carries it with the local copies to remove; either way, the user removes it when the work ends:".

**Body:** 4,098 tokens (16,392 characters), back under the 4,100 target after the O6 row and template (about 20 tokens) by tightening the Generator's own wording only: six "If not available" and "If absent" cells, the invoice line's lead-in, the self-checks pointer, and "the next in `plan.md`'s order". No approved text changed. Description 860 characters.

### The Generator's held-out sets

`tests/ow-documentation-heldout-r1.mjs`, written before any rule changed and hashed at 01:03 (sha256 `f5dfd08888bc8b4bd40ee22ec86f83235894e9fc25301af21621c382b3f3e9cd`). Each sentence is planted in the Evaluator's ten places (a client section's start and end in a guide, an SOP, the runbook and the handover; before and after a deck note); screen claims are appended to ten refusal, no-op and question goldens. "Caught" means the named check fails in every place. The Generator wrote both the sets and the rules, so the after numbers are an upper bound, not an independent measure.

| Set | Before (1eb730cd + merge) | After, measured once (01:19) | After the two fixes below |
|---|---|---|---|
| m1 success claims on refusal screens (must catch) | 0/14 (0/140) | 13/14 (130/140) | 13/14 |
| m1 controls (must pass) | 0/10 FP | 0/10 FP | 0/10 FP |
| X11 commit claims (must catch) | 0/3 | 3/3 | 3/3 |
| X11 controls | 0/2 FP | 0/2 FP | 0/2 FP |
| m2 the price in a document (must catch) | 2/8 | 8/8 | 8/8 |
| m2 controls (the same digits as a client figure) | 0/5 FP | 0/5 FP | 0/5 FP |
| m2 a price key in `docs.yaml` | 1/4 | 4/4 | 4/4 |
| m2 key controls | 0/2 FP | 0/2 FP | 0/2 FP |
| m3 credentials (must catch) | 3/10 | 9/10 | 10/10 |
| m3 controls | 0/10 FP | 0/10 FP | 0/10 FP |
| m4 people (must catch) | 3/11 | 11/11 | 11/11 |
| m4 controls | 0/12 FP | 0/12 FP | 0/12 FP |
| m5 data (must catch, by the data check) | 1/8 | 7/8 | 8/8 |
| m5 controls | 0/8 FP | 0/8 FP | 0/8 FP |
| m6 key names in other spellings | 2/8 | 8/8 | 8/8 |
| m6 controls | 0/4 FP | 0/4 FP | 0/4 FP |
| Other workstreams' clients (must catch) | 0/7 | 7/7 | 7/7 |
| Other-client controls (incl. the current client's name) | 0/5 FP | 0/5 FP | 0/5 FP |
| m10 the log's session field (must catch) | 1/4 | 1/4 (rule not yet changed) | 4/4 |
| m10 controls | 0/5 FP | 0/5 FP | 0/5 FP |

- **The one reported miss:** "The waiver is noted and the export went ahead." has no success word; it stays a known miss, not tuned (the permanent test asserts it is still missed, so a later change shows).
- **Two implementation bugs the after-run found, fixed after the measurement:** the token rule refused a token followed by a full stop ("…Hk38fPq2Zx7LmN4vRt9w."), and the data rule read the test mark `example` inside an email's `.example` domain. Each is labelled in the third column.

### The Evaluator's harness, re-run on the fixed tree (`TREE=<worktree>`, `h/` unchanged)

| Run | Round 1 | Now |
|---|---|---|
| `plants.mjs` | 149/170 caught (4 withdrawn) | **170/170**; the four withdrawn still pass |
| `plants2.mjs` | 7/8 | **8/8** (A16) |
| `probe-price.mjs` | 2/11 | **11/11** |
| `session-resume2.mjs` | 0/5 | **5/5** |
| `malformed.mjs` | 15/15, M12 a TypeError | 15/15, M12 an ordinary problem |
| `run-private.mjs` | key names 4/10 | **10/10**, controls 0/4 FP; the catalog's 10/10 |
| `run-heldout.mjs` C11 | 18/18, 0/20 FP | 18/18, 0/20 FP |
| `run-heldout.mjs` credentials | 9/11, 0/10 FP | **11/11**, 0/10 FP |
| `run-heldout.mjs` people | 2/10, 0/10 FP | **10/10**, 0/10 FP |
| `run-heldout.mjs` data (by `data`) | 5/10, 0/10 FP | **10/10**, 0/10 FP |
| `run-heldout.mjs` other clients | 0/10 | 0/10 in that harness, whose runs hold no other workstream folder (the rule is fed by the folder listing). With Mossgate Books' and Fernhill Florists' folders laid out: **10/10 in all ten places**, controls 0/10 FP |

### Plants made permanent

- `tests/ow-documentation-eval-r1.test.js`: the Evaluator's 174 plants with their code copied verbatim (170 caught; the four withdrawn are controls), `plants2.mjs`'s 8, the five M1 probes plus four on the resume goldens, the 11 price forms, the 15 malformed probes, the key-name spellings, controls and catalog blocklist, OW-06's O6 plants, and the swept gap.
- `tests/ow-documentation-heldout-r1.test.js`: the Evaluator's untuned sets (a byte copy, `tests/ow-documentation-eval-r1-heldout.mjs`, sha256 `f82997a6…` checked) and the Generator's held-out sets, one place each (the scratch measurement uses all ten).
- Text pins (`tests/ow-text-pins.mjs`) for the resume prescriptions, the other-clients rule, the log's session field and OW-06's three edits.

### Checks before the commits

| Run | Result |
|---|---|
| `npm test` (full, pretest included) | 149 files: **8,402 passed, 15 skipped**, 243 s |
| OW-05 files | acceptance 146, plants 387, security 34, eval-r1 239, held-out r1 264, all passing; `ow-tools/documentation-export` passing with its one honest `runIf` skip |
| `npm run build` | exit 0; no tracked file changed |
| `ow-documentation-acceptance` | **110** golden runs (107 plus the two resume cuts and `write-runbook-update`), every check passing; each also passes laid out as a real run |
| Every other ow- acceptance checker, `gen-skills-catalog`, `check-skill-contracts`, `lint-internal-refs` | green |
| Dropped-file sweep (scratch) | 327 of 327 drops caught |
| Body / description | 4,098 tokens / 860 characters |
