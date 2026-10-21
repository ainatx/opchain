## OW-05 (Sprint 3b) — Evaluation Round 2

**Sprint:** ow-documentation 1.0.0 with its checker and goldens, and P3 in ow-build-plan 1.2.0. This round grades the round-1 fixes, the owner decision of 2026-10-20 (another workstream's client in a client output), and OW-06's three O6 edits, which are in scope here. Contract: `sprints/release-2.1/ow-05/contract.md`.
**Branch:** `claude/ow-05-ow-documentation`, head `3809bfbb`. The commits since round 1:
- `5a38524c`: the merge of `origin/main` `6fcdebdf`;
- `3809bfbb`: the fixes, with the round-1 report and the Generator's response.

**Byte-identity base:** `6fcdebdf`, the merge base and the current `origin/main`.
**Evaluator:** independent Evaluator, oc-app-architect Phase 6, round 2.
**Date:** 2026-10-21.

**Standard applied:** round 1's (D1, D2, R1-4, approvals on content, the body budget, permanent plants, the owner's accepted items, severity), plus these:
- **The evaluation cap applies from this round.** A major confined to the acceptance checker or the goldens is marked **CHECKER-ONLY** and moves to the follow-up PR. The sprint passes when every score is at least 6 and no skill-level major remains.
- **The owner decision of 2026-10-20 (YES):** another workstream's client name or folder slug under `opchain-work/` in a client output is a No private names finding that is never waived. Internal files, the screen, and the same client's follow-on folder pass.
- **OW-06 O6 (a), graded as in scope:**
  - runbook `OP-nn` ids continue after the operator notes' `ops:`;
  - `secrets-seen.log` is in the `/ow-handoff-notes` hand-off and `HANDOFF_PIN`;
  - the wording of `delivery-rules.md` §1.
- **Not defects:** the three digest-pinned `.bugcheck.json` exceptions (the orchestrator reviewed them).

**Where I worked.**
- `<E>` = `scratchpad/eval-ow05-r2`.
- **Detached worktrees:** `<E>/tree` at `3809bfbb`, `<E>/base` at `6fcdebdf`, and `<E>/r1` at `1eb730cd` (round 1's head, for the before measurement). Each had `npm ci --ignore-scripts` run at the root and in `site/`.
- All three were removed at the end, after `git status --porcelain` came back empty in each. The Generator's worktree was not touched.
- The full suite and the builds ran only after the orchestrator's "go", one at a time.
- **The harness, in `<E>/h/`:**
  - `heldout2.mjs`: the new untuned set, written and hashed (sha256 `b1ab29e4…`, 11:55 local) before I read the round-1 rule changes;
  - `run-heldout2.mjs`, which plants each sentence literally at the start and end of a client section in four documents. It grades by difference against the same layout without the line. For other clients, Mossgate Books' and Fernhill Florists' folders are laid out in both;
  - `r1harness/`: round 1's `h/` copied unchanged (`heldout.mjs` sha `f82997a6…`), run with `TREE=<E>/tree/`;
  - `r1-others-folders.mjs`, `probes2.mjs` and `probe-o6.mjs`.
- **Outputs:** `heldout2-before.out`, `heldout2-after.out`, `r1-*.out`, `probes2.out`, `npmtest.log`, `build-{tree,base}.log` and `manifest-{base,tree}.txt`.

### Code Scores

| Criterion | Weight | Score | Justification |
|---|---|---|---|
| Functionality | 30% | **8/10** | **Strong:**<br>• M1 is fixed. Resume is keyed on the verb and its mode. `--session` steps are per group and `--close` steps are `summary`/`closed`. `phase-rollout.md` §3 and §6 prescribe each resume line, the write and the STATUS path.<br>• Both new cut goldens pass when laid out as real runs.<br>• The O6 id rule is right in `document-formats.md` §4 and `phase-write.md` §3, with a reads row.<br>• The H3 hand-off carries `secrets-seen.log` in the template, the edges file and the pin.<br>**Against:**<br>• `self-checks.md` §1 states the other-client rule but not the exceptions the checker applies (`logs/business/`, `research/business/`, the same client's follow-on folder) or `research/frameworks/` (m2b).<br>• The O6 golden runs a runbook update after delivery that `phase-write.md` §1 does not allow (m6). |
| Feature Completeness | 30% | **8/10** | **Delivered:**<br>• every round-1 fix;<br>• two resume-cut goldens and `write-runbook-update` (110 goldens in all);<br>• the owner's rule, with controls;<br>• the O6 edits;<br>• my 174 plants copied verbatim (174/174 lines match) into `tests/ow-documentation-eval-r1.test.js`, with the four I withdrew kept as controls;<br>• my round-1 held-out set as a byte copy;<br>• the Generator's own held-out set, measured before and after;<br>• text pins.<br>**Thin:** no cut golden for the re-capture row (the step table's third capture row); a minor, not graded as a defect. |
| Code Quality | 20% | **7/10** | **Strong:**<br>• Round-1 harness: plants 170/170, plants2 8/8, prices 11/11, session probes 5/5, malformed 15/15 (no TypeError), key spellings 10/10, round-1 held-out 59/59 (other clients with their folders laid out) with 0/60 false positives.<br>• New resume and O6 probes: 20/20 caught (U01–U14, O01–O05 with O03 graded directly, and the edges pin).<br>• oc- outputs byte-identical.<br>**Against:**<br>• My new untuned set: 61/92 caught, with 3/76 false positives. The screen guard caught 4/12 and false-flagged 2 explanatory lines, and 6 of 8 targeted bypasses passed (m1).<br>• Two false positives in a check that is never waived: `research/frameworks/` read as a client slug, and a one-word client name matched as an ordinary word (m2a, OWNER-DECISION 1). |
| UX (clarity for person and model) | 20% | **8/10** | Body **4,098** tokens (cap 4,500, built to ≤ 4,100). Description 859 characters. The resume lines are short and say what is recorded. **Against (nit):** `SKILL.md`'s "take the next in `plan.md`'s order" is looser than round 1's "the first … not yet written"; the phase files keep the exact rule |

**Weighted Code Score:** 0.3×8 + 0.3×8 + 0.2×7 + 0.2×8 = **7.8 / 10**

**Verdict: PASS.** Every score is at least 6, no major is open (skill-level or CHECKER-ONLY), and every criterion C1–C26 passes. Round 1's M1 is fixed and verified independently. The remaining items are minor: screen-guard wording, false positives and recall in the meaning nets, the other-client text's exceptions, and one golden's placement. They belong in the follow-up PR.

### Test Results

| Run | Result |
|---|---|
| `gen-skills-catalog` / `check-skill-contracts` / `lint-internal-refs` | the ow catalog validates 6 skills / exit 0 / exit 0 |
| `ow-documentation-acceptance` | exit 0: **110** golden runs (107, plus `rollout-session-resume-rollout`, `rollout-close-resume-closed` and `write-runbook-update`) |
| ow-start / ow-start-logs / ow-build-plan / ow-build / ow-uat / ow-research acceptance | exit 0: **54 / 50 / 36 / 55 / 146 / 75** |
| `npx vitest run` (full, once, after "go"; **316 s**, nothing else heavy running) | 149 files: **8,400 passed, 2 failed, 15 skipped**. The 2 failures are `tests/audit-integration/mcp-hosted-references.test.js`, which needs `public/docs/` from a build; after the build it passes 3/3. So **8,402 pass**, which matches the Generator's figure |
| OW-05 files (acceptance, plants, security, eval-r1, heldout-r1, ow-tools documentation-export) | **1,163 passed, 1 skipped**. The skip is the honest `runIf(!ready)` twin; pandoc and Typst are installed here and the real export ran. No `.skip`, `skipIf` or `runIf` was added since round 1 |
| `npm run build` | tree: exit 0, **15 s** (`@ 3809bfbb`). Base: exit 0, **14 s** (`@ 6fcdebdf`). `git status --porcelain` empty before and after |
| oc- byte-identity vs `6fcdebdf` | 561 files in each, with the same list. Differences:<br>• `dist/index.js`: the version string only (`6fcdebdf` → `3809bfbb`);<br>• `public/demo/index.html` and `site/dist/demo/index.html`: `generatedAt` only (checked with it removed);<br>• 37 zips: entry timestamps only (per-entry CRCs: 0 differences).<br>**Contents identical** |
| Cross-skill | The `delivered.md` byte copy is identical (`cmp`). No ow-uat fixture changed against the base, and ow-uat's 146 goldens pass |
| Body / description | **4,098** tokens (chars/4) / 859 chars |
| Not verified | `npm run evidence:pr`, the per-commit verifier |

### Generator claims, verified

| Claim | Verdict |
|---|---|
| My harness on its tree: plants 170/170, plants2 8/8, prices 11/11, session probes 5/5 | **True** (`r1-plants.out`, `r1-plants2.out`, `r1-probe-price.out`, `r1-session-resume2.out`). The four withdrawn plants still pass, as controls |
| Credentials 11/11, people 10/10, data 10/10, key spellings 10/10 (round-1 sets) | **True**, each with 0 false positives on its 10 controls. The catalog's names are still 10/10 |
| Other clients 0/10 without folders, 10/10 with them | **True**: 0/10 in the unchanged harness, and **10/10 with 0/10 false positives** once Mossgate Books' and Fernhill Florists' folders are laid out (`r1-others-folders.mjs`) |
| Malformed 15/15, with M12 now an ordinary problem | **True**: "the header is not a map" |
| M1: mode-aware resume, two cut goldens, prescribed resume screens | **True**. Both goldens pass as real runs (U00, U00b). U01–U14 are caught: a redone record, a missing row, a dropped resume line, an edited section, a redone or edited summary, a missing `closed`, a duplicate check-in or group, a second update file, post-delivery rewrites of a role with no new gap, a redone files step and a second re-capture plan |
| O6: ids after the operator notes' `ops:`, the hand-off carries `secrets-seen.log`, the `delivery-rules.md` §1 wording | **True**. O01, O02, O04 and O05 are caught. O03 (an operator-notes list extended to OP-11 while the update takes OP-10) is caught when graded directly. Dropping the log from the edges fails `handoffFieldDrift`. The §1 wording is as approved |
| Permanent tests are verbatim; the held-out sets are byte copies or hashed before the rules | **True** for mine: all 174 `plant(`/`claim(` lines match, and `tests/ow-documentation-eval-r1-heldout.mjs` is a byte copy (`cmp`). The Generator's set hashes to the `f5dfd088…` it reports. It arrived in the same commit as the rules, so "before" rests on its stated timestamp. Its success-claim set uses the rule's own verbs, so its 13/14 is an upper bound, as the Generator says |
| Body 4,098 tokens; description 860 | 4,098 **true**. The description counts 859 by my join; that is immaterial |
| Full suite 8,402 passed | **True**: 8,400 plus the 2 build-dependent tests |

### Untuned set (`h/heldout2.mjs`, new, written before the round-1 changes; run through the whole checker)

Each sentence was planted literally at the start and end of a client section in a guide, an SOP, the runbook and the handover (8 placements). Screen lines were appended to 12 refusal and no-op goldens. "Caught" means caught in every placement. "Before" is round 1's head, `1eb730cd`; "after" is `3809bfbb`.

| Set (the round-1 rule it tests) | Size | Before | After |
|---|---|---|---|
| m1: free-worded success claims on refusal and no-op screens | 12 | 0/12 (0/144) | **4/12** (48/144) |
| m1 controls: explanatory lines a refusal may print | 10 | 0/10 FP | **2/10 FP** (24/120) |
| m2: `documentation_price` (4000) in a client document, new forms | 10 | 5/10 | **9/10** |
| m2 controls: client numbers containing 4000 or 4,000 | 10 | 0/10 FP | **1/10 FP** |
| m2: a price line in `docs.yaml` | 10 | 2/10 | **8/10** |
| m3: credential shapes round 1 did not try | 10 | 3/10 | **7/10** |
| m3 controls (secret names, `$VAR` references, placeholders, a sha256, a commit id, a UUID, a published test card) | 10 | 0/10 FP | 0/10 FP |
| m4: people not on the key's list | 10 | 4/10 | **7/10** |
| m4 controls (capitalised systems, places, the business) | 10 | 0/10 FP | 0/10 FP |
| m5: customer data, by the data check | 10 | 4/10 | **7/10** |
| m5 controls | 10 | 0/10 FP | 0/10 FP |
| m6: the key's private names in new spellings | 10 | 2/10 | **9/10** |
| m6 controls | 6 | 0/6 FP | 0/6 FP |
| Owner decision: another client named in a Larkspur document (folders laid out) | 10 | 0/10 | **10/10** |
| Other-client controls ("moss-green", "gate code", "books are closed", "fern pattern", the client's own name) | 10 | 0/10 FP | 0/10 FP |
| **Totals** | 92 must-catch / 76 controls | **20/92**, 0/76 FP | **61/92**, 3/76 FP |

**Misses after the fixes (31):**
- **m1:**
  - "All three guides are now in export/guides/ as PDF and Word";
  - "Your files went up to the shared drive";
  - "I've logged the delivery date";
  - "G-04 now appears in the rollout plan";
  - "The rollout has been marked as finished";
  - "docs.yaml now holds the frozen scope";
  - "The screenshots are in shots/ and indexed";
  - "Your waiver is noted and the check is skipped".
- **m2:**
  - "forty hundred dollars";
  - `documentation_fee: 4000` and `amount: 4000` in `docs.yaml`.
- **m3:**
  - an `npm_…` token;
  - `Authorization: Basic …`;
  - a Slack webhook URL.
- **m4:**
  - "Ask Dana Whitlock…";
  - "Jamal Ortiz runs the G-02 session";
  - "Bram de Vries and Lotte Jansen attended G-03".
- **m5:**
  - a business customer and what it owes;
  - an account number in hyphenated groups;
  - "the real order from Bay Tile Co (PO-55120)".
- **m6:**
  - `Halvorsen.Labs` (a dotted spelling).

**False positives after the fixes (3):**
- **m1:**
  - "Once the documents reach the client, record the date with -delivered." (the verb name `-delivered` is read as "delivered");
  - "Capture in production needs the client's decision, recorded in uat.yaml."
- **m2:**
  - "Invoices over 4,000 need the operations manager's approval." (the client's own threshold, read as `documentation_price`).

**Round 1's untuned set, re-run:**
- C11: 18/18 caught, 0/20 false positives.
- Credentials: 11/11, 0/10 false positives.
- People: 10/10, 0/10 false positives.
- Data: 10/10, 0/10 false positives.
- Other clients with folders: 10/10, 0/10 false positives.

### Plants

| Batch | Items | Result |
|---|---|---|
| Round-1 `plants.mjs` (unchanged) | 170 + 4 controls | **170/170**; the 4 controls pass |
| Round-1 `plants2.mjs` | 8 | **8/8** |
| Round-1 `probe-price.mjs` | 11 | **11/11** |
| Round-1 `session-resume2.mjs` (M1) | 5 | **5/5** |
| Round-1 `malformed.mjs` (C23) | 15 | **15/15** fail per check, with no crash |
| `probes2.mjs` U00–U15: resume, every verb and mode | 2 golden + 15 | Both goldens pass. **14/14 caught** (U15 is withdrawn: the confirm step was not recorded before that run, so changing its date is no violation) |
| `probes2.mjs` V01–V09: the other-client rule | 4 controls + 5 | Controls: 2/4 pass. **V01** (a one-word client "Bloom" against "glazes bloom") and **V02** (the `research/frameworks/` folder against "test frameworks") are false positives (m2a, OWNER-DECISION 1). The follow-on folder (V03) and the internal training record (V04) pass. Caught 3/4: V05 (a `name:` key), V07 (a deck note), V08 (the repo copy). Missed: V06 (`mossgate.books`, m2c). V09 (`rollout.yaml`) is outside the owner's definition of a client output, so it is a nit and not counted |
| `probes2.mjs` W01–W10: the screen guard | 8 + 2 controls | **1/8 caught** (W04). Missed: an all-caps label line ("NOTE: Exported…"), "Pushed only…", "…exported once more", a 6-space-indented claim, "Export finished", "Done: the runbook is in…", and a claim appended to the `Refused:` line itself (m1). Controls 2/2 pass |
| `probes2.mjs` O00–O06 and `probe-o6.mjs`: the O6 goldens | 1 golden + 7 | The golden passes. **6/7 caught**: O01, O02, O04, O05, O03 (graded directly), and the edges pin. O06 (the `It will read:` line on the Delivered screen dropping `secrets-seen.log`) passes (m7) |

**Totals this round, excluding the untuned set:** 242 must-catch items, **233 caught**. The 9 misses are W01–W03 and W05–W08 (m1), V06 (m2c) and O06 (m7). U15 (withdrawn) and V09 (nit) are not counted.

### Criteria C1–C26

| # | Verdict | Evidence |
|---|---|---|
| C1 | **PASS** | Catalog and contracts green. W01–W12 and R08–R12 still caught. The new reads row from ow-handoff (`operator-notes.md` [ops]) validates, and the pin catches a dropped `secrets-seen.log` hand-off |
| C2 | **PASS** | 4,098 ≤ 4,100 and the catalog enforces 4,500. Description 859. The protocol and `handoffs.yaml` copies are unchanged |
| C3 | **PASS** | `shippedTextProblems` and contracts green. The text pins cover the new rules |
| C4 | **PASS (gaps)** | Every cell has a golden and R01–R12 are caught. The screen guard is narrow (m1) |
| C5 | **PASS** | F01–F09 caught (F03 now caught). Prices in `docs.yaml`: 8/10 untuned (m2) |
| C6 | **PASS** | V01–V07 caught |
| C7 | **PASS** | T01, T02 and T04–T10 caught |
| C8 | **PASS** | O01–O08 caught (O03 now caught). O6: an update takes the next id after both `ops:` lists, rotate ids are never reused, and nothing is renumbered (O01–O05) |
| C9 | **PASS** | P01–P12 caught |
| C10 | **PASS (gaps)** | Round-1 sets: credentials 11/11, people 10/10, data 10/10, with 0 false positives. New sets: 7/10, 7/10, 7/10, with 0 false positives (m3, m4, m5). The other-client rule (owner decision): 20/20 across both sets, with 0/20 false positives on the sets' controls. Two false positives on targeted controls (m2a). The log's session field is graded (C03 caught) |
| C11 | **PASS** | 18/18 caught with 0/20 false positives. N09 caught (`rollout.yaml` read). Prices: 11/11 (round 1) and 9/10 (new), with one control false positive (m2) |
| C12 | **PASS** | D01–D06 and D08 caught |
| C13 | **PASS** | K01–K08 caught |
| C14 | **PASS** | L01–L10 caught (L09 withdrawn), including the dated check-in and the usage-count source |
| C15 | **PASS** | X01–X12 caught (X11 now caught) |
| C16 | **PASS** | Y01–Y08 caught (Y07 now caught). The byte copy is identical and ow-build's 55 goldens pass |
| C17 | **PASS** | H01–H06 caught. H3 adds `secrets-seen.log` [kind, role, source, session] to the hand-off and the pin. The screen's `It will read:` content is not graded (m7) |
| C18 | **PASS** | P3 unchanged. ow-build-plan's 36 goldens pass, and ow-uat is unchanged against the base |
| C19 | **PASS** | A01–A20 caught (A12 and A16 now caught) |
| C20 | **PASS** | M1 fixed: both cut goldens pass, and U01–U14 are caught across `--session`, `--close`, `--checkin`, `--add-group`, `--update`, the post-delivery `-write` and `-train`, `-export` and the re-capture. Round-1 Z01–Z10 still caught. No golden for a cut re-capture (Feature Completeness note) |
| C21 | **PASS (gaps)** | Structure graded as in round 1, plus a success-word guard: 4/12 untuned and 1/8 targeted, with 2/10 false positives (m1). R1-4 limits screens to prescribed text and structure, so this is minor |
| C22 | **PASS** | Unchanged. The waiver goldens pass |
| C23 | **PASS** | 15/15. M12 is now an ordinary problem |
| C24 | **PASS** | Every round-1 plant is permanent and verbatim. The withdrawn four are labelled controls. The single skip is honest |
| C25 | **PASS** | oc- contents identical against `6fcdebdf`. All seven acceptance scripts green. 8,402 tests pass |
| C26 | **PASS** | ow-documentation stays 1.0.0 (unreleased), and its CHANGELOG records the round-1 fixes. ow-build-plan 1.2.0. ow-uat is at main's 1.0.2, with data edits only. The O6 edits are recorded without a bump, as approved |

### Defects (round 2)

**No major defects** (none skill-level, none CHECKER-ONLY).

**Minor:**

1. **[m] m1 (round 1, narrowed): the refusal-screen success guard is a word list with wide exemptions** (`scripts/ow-documentation-acceptance.mjs` `SUCCESS_WORD`, `successClaims`, `PRESCRIBED_LINE`, around `:984-1015`).
   - **Untuned: 4/12 caught.** Claims with no listed verb pass: "now in export/", "went up to the shared drive", "logged", "now appears", "marked as finished", "now holds", "are in shots/", "is noted and the check is skipped".
   - **Two explanatory lines are flagged:**
     - the verb name `-delivered` in "record the date with -delivered";
     - "the client's decision, recorded in uat.yaml".
   - **Targeted bypasses:**
     - any line starting with an all-caps label (`NOTE: Exported…`), because `PRESCRIBED_LINE` exempts `^[A-Z][A-Z ]*[A-Z]:`;
     - any line indented 6 or more spaces;
     - text appended to the `Refused:` line;
     - "only" and "once" after the verb, which `RULE_AFTER` treats as a condition.
   - **Fix:**
     - exempt only the exact prescribed prefixes (`NEXT:`, `THEN:`, `IF IT IS NOT AVAILABLE:`, `NEW GAP:`, `MORE PEOPLE:`, `WHEN THEY ARRIVE:`, `OTHERWISE:`) and the NEXT block's continuation lines;
     - grade the text after the first sentence of a `Refused:` or `Nothing to do:` line;
     - strip `-verb` tokens before matching;
     - treat `only` and `once` as conditions only when a clause follows;
     - keep my 12 claims and 10 controls as held-out.
2. **[m] m2: the other-client rule.**
   - **(a) Checker false positives in a check that is never waived:**
     - `otherClients` takes every second-level folder under `opchain-work/` as a workstream, except `business` and this client's own. ow-research's `research/frameworks/` (in 2.1) therefore makes "frameworks" a client slug, and "Two test frameworks run in CI" in a handover fails (V02).
     - A one-word client name that is an ordinary word ("Bloom") flags that word in any case (V01).
     - **Fix:** skip the family's non-client folders (`research/frameworks/`, `logs/business/`, `research/business/`). The one-word case is OWNER-DECISION 1.
   - **(b) The skill text** (`references/self-checks.md` §1, the No private names row) states the rule without the exceptions the owner approved and the checker applies: the same client's follow-on folder, the business's own `logs/business/` and `research/business/`, and `research/frameworks/`.
     - Read literally, "folder slug under `opchain-work/`" makes `business` another workstream's slug.
     - The Larkspur runbook golden's "the operations manager, business hours only" would then be a never-waived FINDING, stopping `-write runbook` and `-export` for any user of ow-start's logs.
     - **Fix:** one clause naming what is not a workstream.
   - **(c) A dotted spelling passes:** `mossgate.books` (V06), and `Halvorsen.Labs` for the key's names. Add `.` to the separators in `nameRe`.
3. **[m] m3: `documentation_price`.**
   - "forty hundred dollars", and the `docs.yaml` keys `documentation_fee: 4000` and `amount: 4000`, pass.
   - "Invoices over 4,000 need the operations manager's approval." (a client threshold) is flagged.
   - **Fix:** use the context words the rule already uses for bare amounts in prose (documentation, training, the line, price, quote), and fail any key in `docs.yaml` whose value equals `documentation_price`.
4. **[m] m4: credential shapes, untuned 7/10.** An `npm_…` token, an `Authorization: Basic <base64>` header, and a Slack webhook URL (`hooks.slack.com/services/…`) pass. 0 false positives on 10 controls.
5. **[m] m5: people and data, untuned 7/10 each.**
   - **People missed:**
     - "Ask Dana Whitlock…" and "Jamal Ortiz runs…": the given name is not on `GIVEN_NAMES` and there is no slot word;
     - "Bram de Vries and Lotte Jansen attended G-03": an attendance list in prose.
   - **Data missed:**
     - "Hollis & Daughters, our customer since 2019, owes 1,250.";
     - "The customer's account is 4417-2290-1188.";
     - "The real order from Bay Tile Co (PO-55120)…".
   - **Fix:** "<Capitalised> <Capitalised> attended|runs|ran" and "Ask <Capitalised> <Capitalised>" in client documents; hyphen-grouped account numbers after "account"; and "real order" or `PO-\d{4,}` in a client document. All are measured against the 20 controls.
6. **[m] m6: the O6 golden `write-runbook-update` sits after delivery** (`base: delivered`).
   - Its session is the user's request: "the build added a label-print alert".
   - `phase-write.md` §1 says: "After `delivered.md`: only a new training gap found before day 30 … is written …; everything else waits for a change the client asks for."
   - The checker has the post-delivery rule for guides and cards (U11, U12 caught), but nothing for the runbook.
   - **Fix:** base the golden before delivery, or have its session and record cite a signed change order (`CO-nn`) and export the update to `export/update-nn/`. Add the post-delivery rule for `runbook.md`.
7. **[m] m7: the Delivered screen's `It will read:` content is not graded.** Dropping `secrets-seen.log` from the `/ow-handoff-notes` block passes (O06). The edges pin holds, so H3's field is safe in the data. Add the template's `It will read:` line to the `delivered` keys' `says`.

**Nits (not defects):**
- `SKILL.md`: "take the next in `plan.md`'s order". Round 1's "the first in `plan.md`'s order not yet written" was exact; `phase-write.md` and `phase-train.md` §1 still are.
- No golden for a cut re-capture (`capture-plan-nn.json` written, its run not yet recorded). U14 shows a second plan is caught, but resuming a re-capture is not golden-tested.
- `rollout.yaml` counts as a client output for C11 (m7, round 1) but not for the other-client rule. This matches the owner's wording ("a document, its export copy, the repository copy"), so it is not a defect.

### OWNER-DECISIONs

1. **Other clients whose name or slug is an ordinary word.**
   - The 2026-10-20 rule matches another workstream's client name and slug "in any spelling", case-insensitively.
   - For a one-word or ordinary-word client (`bloom`/"Bloom", `harvest`, `anchor`), every use of that word in this client's documents becomes a never-waived FINDING, and `-export` stops until the wording changes (V01).
   - Choose:
     - (a) keep it as is: the user rewords;
     - (b) for a one-word name or slug, match only as written in its `client:` (capitalised), in the possessive, or in the rule's context forms ("the Bloom team", "Bloom's deck"); multi-word names and hyphenated slugs keep "any spelling".
   - **Recommendation: (b).** It keeps 20/20 on both untuned sets, removes V01, and needs one sentence in `self-checks.md` §1.

Code and text settle everything else, including m2b's exception clause, which states what the owner already approved.
