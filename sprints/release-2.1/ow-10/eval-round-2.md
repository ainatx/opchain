## OW-10 (Sprint D) — Evaluation Round 2

**Sprint:** ow-draft 1.0.0. Contract: `sprints/release-2.1/ow-10/contract.md` (C1–C29).
**Branch:** `claude/ow-10-ow-draft`, head `da848a24`: the round-1 fixes (M1, M2, m1–m10, RC-03), plus the round-1 report with the Generator's response.
**Byte-identity base:** `62fe72a9`.
**Evaluator:** the same independent Evaluator, oc-app-architect Phase 6.
**Date:** 2026-10-22.

**Standard applied:** as in round 1, plus:
- the owner's 2026-10-21 decisions:
  - (1) every approval kind is graded against the session;
  - (2) a bare "yes" confirms exactly the printed push list, while any no or don't, or a reply naming fewer files, refuses it;
  - (3) the folder-route goldens are built now;
- ow-documentation's different CHANGELOG heading (its shipped-text check bans evaluation ids) is accepted;
- **the evaluation cap applies from this round.** A checker-only major is marked CHECKER-ONLY and moves to the follow-up PR. PASS needs every criterion ≥ 6 and no skill-level major.

**Where I worked.**
- Detached worktrees `<E>/tree` at `da848a24` and `<E>/r1` at `b58439b8`, with `npm ci --ignore-scripts` at the root and in `site/` in each. Both were removed at the end, after `git status --porcelain` came back empty in each.
- `<E>` = `scratchpad/eval-ow10-r2/`. Harness in `<E>/heldout/`:
  - `sets2.mjs`: the new untuned set;
  - `appr2.mjs`, `screens2.mjs`, `folder.mjs`, `regr.mjs`, `probe.mjs`: round-2 runners;
  - the round-1 scripts, copied unchanged.
- The full `npm test` and `npm run build` ran once each, one at a time, after the orchestrator's "go".
- No base rebuild: no file under `skills/`, `plugins/`, `package.json` or the zip script changed since `b58439b8`. The tree's oc- outputs were compared with round 1's base hashes.

### Code Scores

| Dimension | Weight | Score | Why |
|---|---|---|---|
| Functionality | 30% | 8 | Every approval kind is now graded against the session: must-fail 30/32 on a new set (8/32 at `b58439b8`). Folder route 17/17. Every round-1 net holds or improved. The new session check over-refuses legitimate approvals that carry a "no" or "not" (M1, CHECKER-ONLY). |
| Feature Completeness | 30% | 8 | 20 folder-route goldens, and the coverage skip is gone. 182 goldens in all. Real-binary PDF, Word and PowerPoint tests skip without their binaries. |
| Code Quality | 20% | 7 | `checkSession` is one place for every approval kind, but its decline guard is a bag of words over the whole user line. The people widening matches any `Mc`/`O'` word. |
| UX | 20% | 8 | The folder screens are fully prescribed (`Drafts: <n>`, rows in path order, ten named stages, the route question). The body is unchanged in size. |

**Weighted Code Score:** 0.3×8 + 0.3×8 + 0.2×7 + 0.2×8 = **7.8 / 10**

**Verdict: PASS.** Every criterion is at least 6, and no skill-level major is open. M1 is CHECKER-ONLY: under the cap it moves to the follow-up PR, together with the minors. The skill text changed only in `routing-and-resume.md` §2–§4.4, the welcome example and the CHANGELOG, and is right on every path probed.

### Test Results

| Run | Result |
|---|---|
| `node scripts/ow-draft-acceptance.mjs` | 182 golden runs (162 + 20 `f-*`), 0 failures |
| `npm test` (full) | 160 files; 10,267 passed, 15 skipped, 0 failed |
| `npm run build` | exit 0 (`da848a24`) |
| Sibling acceptance (ow-start, ow-start-logs, ow-build-plan, ow-build, ow-uat, ow-research, ow-documentation) | 0 failures each |
| `check-skill-contracts` | green |
| Byte-identity vs `62fe72a9` | `public/docs/oc-*` identical to round 1's base hashes; `opchain-skills.zip` content `65c58c49…`, `mcp-catalog.json` `2619ec9f…` and `dist/index.js` (stamp removed) `36b4c02b…` all equal to base; no oc- source changed since `b58439b8` |

**A correction to round 1:** round 1's m10 overstated the gap. A PowerPoint real-binary test already existed (`tests/ow-draft-acceptance.test.js:169`). The PDF and Word tests are new in round 2. All three "skip" by logging and returning, so vitest counts them as passed, not skipped; the label is honest in the log only (nit).

### Generator claims, verified
- **M1 (sessions):** verified, every kind; see the untuned set. The one round-1 approval form still "passing" (bare "Yes.") is correct under owner decision 2.
- **M2 (folder route):** verified. 20 goldens, the skip at `:55` removed, and a `folder` check that compares the whole screen with the one the files give.
- **m1–m10:** verified fixed, with these residuals:
  - m2: "Mrs. Okafor" is caught by `peopleFindings` directly but still missed through the whole checker (sentence split);
  - m3: passport and "Customer no." shapes still miss (new set);
  - m6: three new misses.

  These are listed below.
- **RC-03 false positives:** no regression seen.
- **The O'/Mc widening:** it catches "Fiona McAllister" and "Marguerite O'Neill", but over-matches business names (m2 below).

### The untuned set
`<E>/heldout/sets2.mjs`, written before reading the round-1 changes. sha256 `f45618b9859b585d0e564ecd44070116600d24052df1aea91f57e2cc2014de2a`. It was run on both heads, through the whole checker, with the same placement and harness as round 1.

| Set | `b58439b8` | `da848a24` |
|---|---|---|
| Approvals, 47 forms over 9 kinds (own, relayed, conditional, declined): must-fail caught | 8/32 | **30/32** |
| Approvals: must-pass refused | 4/15 | **3/15** |
| People (10 / 12) | 8/10 sentences; FP 1/12 | 8/10; FP 1/12 |
| Client data (8 / 8) | 3/8; FP 1/8 | **6/8**; FP 1/8 (`120`, one of our exact figures by value: the rule, not a false positive) |
| Our figures (6 / 6) | 6/6; FP 1/6 | 6/6; FP 1/6 |
| Closed-screen claims, whole checker | 1260/1260 | **1350/1350** |
| Closed-screen claims, free-word guard alone | 3/10; FP 1/6 | 4/10; FP 1/6 |
| Folder-route plants (17) | no goldens | **17/17** |

The misses:
- **Approvals:** the repository-branch confirmation, which is not in `checkSession`: "I'll make draft/case-study in ../site later." and "Write case-study.md on main in ../site." (m1). False positives: "I've read C-1 and I'm happy to sign it off.", "OK, C-1 is approved by me." and "The client owner said yes to C-1 on the phone today."
- **People:** "Ms. Abernathy signed the order." (a title split off by the sentence splitter) and "Talk to Seán Ó Briain about stock.". False positive: "Dispatch Manager approved the change."
- **Data:** "Her passport number is 533380006." and "Customer no. 300712 complained.".
- **Our figures:** false positive "Brightloop Studio's day rate is published [E-04]." (pre-existing; a third party's rate read as said as ours).
- **Free-word guard:** misses "Stored", "Notified", "on the site now", "locked in", "Marked C-1 complete", "has gone to". False positive: "The client's approval is recorded by -signoff --client.". The structural net catches every one.

**Round-1 sets re-run on `da848a24`:**
- our figures 17/17, false positives 0 genuine;
- credentials 13/13, 0/11;
- people 11/12 (the "Mrs. Okafor" whole-checker miss), 0/11;
- client data 10/10, 0 genuine;
- private names 20/20;
- other clients 12/12;
- Naming 10/10;
- closed screens 2160/2160, guard alone 16/16;
- round-1 approvals 31/32 (the remaining one is the bare "Yes.", correct by decision 2);
- injection 10/10;
- handling union 6/6;
- active content 31/31.

### Regression probes
- **The new session check** (`regr.mjs`, 17 forms): 5/5 must-fail caught. **10 of the 12 legitimate approvals are refused:**
  - "Yes, confirmed" after a brief description that says "not a deck", or "check the statute date later";
  - "I approve C-1; the client hasn't seen it yet." / "I read C-1 and approve it, no changes." / "I approve C-1, not C-2.";
  - "The client owner approved C-1 today, no changes.";
  - "Approve voices/client.md, no edits needed.";
  - "Don't waive Voice; waive Sources on C-1: …";
  - "Yes, no changes." to the push list;
  - a permission with "; no logo".

  M1 below. Also passing: "The client owner approved C-1 last month, before the edits." (the reported date is never compared with the candidate's freeze; m9).
- **Folder route:** 17/17 plants caught:
  - a NEXT block, a DONE line, a STATUS append, the welcome printed with drafts present;
  - a draft dropped (with the count kept, or fixed), a wrong stage, a wrong verb, a claim line, a wrong `awaiting`, the rows out of path order;
  - findings routed to `-write`, a FINDING routed to `-signoff`, a push cut-off routed to `-signoff`, "several" resolved silently, a claim on the route line.

  Exact-screen comparison; path order is prescribed, so a reordering is rightly refused.
- **People widening** (`probe.mjs`): any `Mc`/`O'` capitalised word is "a person's surname": "The McKinsey report", "The O'Neill Gallery", "Ask McDonald's", "McAllister Pottery Supply". "O'Hare Freight", "O'Reilly Media's guide" and "MacBook" pass (m2).
- **Active content:** MDX expressions and HTML comments are caught now, and the escaped `&lt;script&gt;` passes. Prose braces are false positives: "Prices are {roughly} flat." and "A set {a, b} of items." (m7).
- **C3 net, new probes:** misses "We will alert you when the figure goes stale.", "Face book" and "Outlook". "Keep an eye on the deadline." is a false positive; "box" and "medium" controls pass (m8).

### Criteria C1–C29

| # | Score | Notes |
|---|---|---|
| C1 | 8 | Unchanged; `session` and `folder` checks added to the map |
| C2 | 9 | Body ~3,513 tokens plus the welcome-example edit |
| C3 | 7 | Round-1 misses fixed; new paraphrase and platform misses (m8) |
| C4 | **8** | The folder-route row is complete (20 goldens), 17/17 plants |
| C5 | 8 | Voice approvals graded against the session; over-refusal (M1) |
| C6 | 7 | Brief confirmation graded; any "not" or "check" in the description refuses (M1) |
| C7 | 8 | Permission graded (declined, conditional, relayed) |
| C8 | 9 | Unchanged |
| C9 | 8 | Real-binary tests added |
| C10 | 8 | Unchanged |
| C11 | 8 | Unchanged |
| C12 | 8 | Waiver anchored; "Don't waive Voice; waive Sources" refused (M1) |
| C13 | 8 | Client approval graded (other candidate, rejected, future, wrong role); the date is not compared (m9) |
| C14 | 8 | Unchanged |
| C15 | 8 | Unchanged |
| C16 | 8 | MDX and comments caught; prose braces false positive (m7); branch confirmation not session-graded (m1) |
| C17 | 8 | Push declines refused; bare yes per decision 2; "Yes, no changes." refused (M1) |
| C18 | 7 | People recall unchanged on the new set; the widening adds false positives in a never-waived check (m2) |
| C19 | 8 | Round answer graded against the session |
| C20 | 9 | Unchanged |
| C21 | **6** | Must-fail 30/32 (8/32 before); legitimate approvals with a negation word refused 10/12 in probes (M1, CHECKER-ONLY) |
| C22 | 8 | `/ow-draft` re-run goldens (`f-list-again`, `f-on-again`) |
| C23 | 9 | 1350/1350 and 2160/2160 |
| C24 | 8 | Unchanged |
| C25 | 8 | Unchanged |
| C26 | 9 | A binary `session/answers.md` now fails the session check |
| C27 | 8 | The eval-r1 plants are in `tests/ow-draft-eval-r1.test.js` |
| C28 | 9 | No regressions |
| C29 | 8 | Changelog line for the folder screens; heading accepted |

### Defects (round 2)

**[M] M1 (CHECKER-ONLY, moves to the follow-up): the session check refuses legitimate approvals that carry a negation or change word anywhere in the user's line.**
- **Where:** `scripts/ow-draft-acceptance.mjs`, `sessionApproval` and its `SAID_NO` / `SAID_LATER` guards, as `checkSession` calls them.
  - `brief`: `/\b(?:no|not|change|wait|hold|check|wrong|instead|actually)\b/` over all the user's lines joined.
  - signoff, client, voice and push: `SAID_NO` over the whole line.
  - waiver: a `don't` before the anchored `waive` clause.
  - permission: `SAID_NO` over the line.
- **Why:** C21's controls ("≥ 10 approval controls, declines included") must pass. Here a correct real run is failed when the user's approval also says what it doesn't cover ("not C-2", "no logo") or that nothing changes ("no changes", "no edits needed"). Both are among the commonest ways people phrase an approval. The guard errs safe, so no harm leaves the machine. But the acceptance verdict is wrong on realistic runs, and a real run graded by this checker would be sent back.
- **Reproduce:** `node <E>/heldout/regr.mjs <tree>`: 10 of 12 legitimate forms fail `session`. Plus the 3 in `appr2.mjs`.
- **Effect:** false FAILs on real runs; pressure to tune the user's wording rather than the rule.
- **Fix:**
  - Apply the decline guard to the clause that holds the approval verb and its object (C-n, the file, the permission), not to the whole line.
  - Treat "no changes", "no edits", "nothing to change", "not C-m" (another candidate) and "no logo" (another permission) as scope, not decline.
  - Grade the brief's "yes" clause, not the description.
  - Add the 12 forms as controls and the 5 must-fail forms as plants.

**Minor:**
- **m1** The repository-branch confirmation (C21 "a repository write names the branch and files") is not in `checkSession`. "Write case-study.md on main in ../site." with a record naming `draft/case-study` passes. The `.git/HEAD` branch check still refuses `main`, so the harm is limited. Fix: a `repo` kind against the session.
- **m2** The `Mc`/`O'` widening reads business and place names as surnames in a never-waived check: "The McKinsey report", "The O'Neill Gallery", "Ask McDonald's", "McAllister Pottery Supply". Fix: require a given name, a title or a person slot, as the full-name rule does, plus controls for each form.
- **m3** People: "Ms. Abernathy …" and "Mrs. Okafor …" are missed through the whole checker, because `clientSentences` splits after "Ms." or "Mrs.". "Seán Ó Briain" is missed (an `Ó` particle). "Dispatch Manager approved …" is a false positive (a capitalised role). Fix: no sentence split after a title; add `Ó` and `Ní` to the particles; a role stoplist.
- **m4** Client data: "passport number 533380006" and "Customer no. 300712" are missed. Fix: `passport`, and `no.`/`number` after customer, client or member.
- **m5** Our figures: "Brightloop Studio's day rate is published [E-04]" is read as said as ours. Fix: only our side's possessive (our, my, the team's when the business is the subject), not a named third party's.
- **m6** Free-word guard (second net only): misses "Stored", "Notified", "on the site now", "locked in", "Marked … complete", "has gone to". False positive on "… is recorded by -signoff --client.". The structural net holds 1350/1350.
- **m7** `activeContent` flags prose braces ("{roughly}", "{a, b}") in a repository copy as MDX expressions. Fix: flag `{` only at the start of a line or inside a JSX-looking context, or when the destination path is `.mdx`.
- **m8** C3 net: misses "alert you when the figure goes stale", "Face book" and "Outlook". "Keep an eye on the deadline." is a false positive.
- **m9** A client approval's reported date is not compared with the candidate it names. "approved C-1 last month, before the edits" passes for a C-1 frozen later. Fix: the reported date must be on or after `checks/C-n.md`'s `created`.

**Nits:** the real-binary tests log "skipped" and return, so vitest counts them as passes; `ctx.skip()` would report them as skipped.

### OWNER-DECISIONs

1. **What a negation inside an approval means.** "I approve C-1, not C-2", "Yes, no changes" and "permits its name; no logo": are these approvals of their object, or a decline the checker must refuse? **Recommend: approvals of their object.** The decline guard is scoped to the clause holding the approval verb (M1's fix).
2. **The O'/Mc surname rule in a never-waived check.** Should a lone `Mc`/`O'` capitalised word count as a person? **Recommend no.** It should count only with a given name, a title or a person slot, so a supplier like "McAllister Pottery Supply" never blocks a client deliverable with no waiver available (m2).

---

## Generator response (fix round for the 8.5 bar, 2026-10-22)

Owner decisions applied: a negation approves its object and the decline guard applies to the clause holding the approval verb ("I approve C-1, not C-2" approves C-1 and declines C-2); a lone O'/Mc word is not a person (a given name, a title or a person slot is needed). The skill text did not change; every edit is in the checker and its tests. This report is kept whole above; the Evaluator's own sets were not read, so the re-score is untuned against them.

**Held-out first.** `tests/ow-draft-heldout-r2.mjs` was written from this report's descriptions and hashed (`5f7a5ce1…`, pinned in `tests/ow-draft-eval-r2.test.js`) before any round-2 rule changed.

| Set | Before (catch · legit) | After |
|---|---|---|
| Session approvals, M1 and m1 (36 forms) | 15/19 · 5/17 | 19/19 · 17/17 |
| People (m2, m3) | 4/5 · 2/6 | 5/5 · 6/6 |
| Client data (m4) | 3/5 · 5/5 | 5/5 · 5/5 |
| Our figures, third-party rates (m5) | 5/5 · 0/5 | 5/5 · 5/5 |
| Free-word guard (m6) | 0/6 · 5/6 | 6/6 · 6/6 |
| Active content (m7) | 5/5 · 2/5 | 5/5 · 5/5 |
| Shipped text (m8) | 1/5 · 4/5 | 5/5 · 5/5 |
| Addressed, RC-03 (capital "Now") | 4/5 · 5/5 | 5/5 · 5/5 |

Round-1 sets re-run: session 17/17 · 14/14, people 5/5 · 5/5 (the person-slot rule was restored after "Ask McAllister" slipped in the first rewrite), the rest unchanged. The Evaluator's `regr.mjs` and round-1 approval scripts (the harness part of the report): every form graded as expected, but the bare "Yes." (decision 2).

**Defects.**
- **M1:** `sessionApproval` is rewritten around `approvedClause`: scope phrases are stripped, the verb clause is the unit, later clauses that make it conditional and a next sentence that takes it back count, and a clause naming another candidate, file or permission approves nothing for this record. The brief is graded on its yes clause. The waiver is graded per sentence. All 12 legitimate forms and the 5 must-fail forms are plants, plus the three false positives from `appr2.mjs` (the user's own "happy to sign it off" and "approved by me"; the client's "said yes to C-1").
- **m1:** a `repo` kind against the session.
- **m2:** the lone O'/Mc word; **m3:** titles no longer end a sentence, `Ó`/`Ní`/`Nic`, a role stoplist; **m4:** passport numbers; **m5:** a named third party's rate; **m6:** the claim words and "recorded by -signoff"; **m7:** prose braces; **m8:** the paraphrases, "Face book", "in Outlook", "keep an eye on" only as a promise; **m9:** a client approval dated before the candidate's freeze.
- **Nit:** the PowerPoint real-binary test now calls `ctx.skip()`, as the PDF and Word tests do.
- **RC-03's "use the rate card…":** held; the capital "Now" form is now caught.
