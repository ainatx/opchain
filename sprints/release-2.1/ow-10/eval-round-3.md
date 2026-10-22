## OW-10 — Re-score (round 3, focused), against the 8.5 bar

**Target:** the builder's uncommitted tree on `0d5f6c66` (captured with `git diff HEAD` plus the 2 untracked files, applied to a fresh detached worktree; the builder's tree was read only). Base for comparison: clean `0d5f6c66`. Checker and tests only; no skill text changed. No full `npm test` or build (the gate runs them).
**Untuned set:** `heldout/sets3.mjs`, sha256 `0be912e29abfd3c2aa4c370fc238dfc472781a895f23e1575aa80b8046022b2f`, written before reading the diff. Run through the whole checker on both.

### Results (base `0d5f6c66` → working tree)
| Set | Base | Tree |
|---|---|---|
| Approvals, 45 forms (negation, conditional, relay, hedge, per kind): must-fail caught | 21/25 | 20/25 |
| Approvals: legitimate refused | 14/20 | 3/20 |
| People, O'/Mc, titles (10 / 12 × 8 placements): caught | 32/80 | 72/80 |
| People: false positives | 40/96 | 16/96 |
| Free-word guard alone (10 claims / 6 controls) | 4/10 | 9/10; 0 FP |
| Closed-screen claims, whole checker | 1350/1350 | 1350/1350 |
| Price-book forms ("Now use the price book …", margin.md, time export): flagged / controls clean | n/a | 4/4 / 5/5 |

Earlier harnesses on the tree:
- round-2 set: approvals 31/32 with 0/15 false positives (was 30/32 and 3/15); client data 42/48 (was 36/48); people 80/80 with 0 false positives; closed screens 2160/2160 and 1350/1350;
- round-1 sentence sets all hold: our figures 136/136, credentials 104/104, other clients 48/48, Naming 20/20, private names 120/120;
- round-2 regression probes: 12/12 legitimate approvals now pass; injection 10/10; handling 6/6; active content 31/31; folder plants 17/17; 182 goldens pass; `ow-draft-eval-r2` tests 85/85.

### Defects (all checker-only, none skill-level)
- **m1** The session grader now accepts hedged and conditional approvals it used to refuse: "I approve C-1 provided the date is fixed first.", "If the client likes it, I approve C-1.", "Approved? I'm not sure about C-1.", "Waive Sources on C-1, no wait, don't.", "Waive Sources on C-1? No." (a regression against round 2). Also accepted: a relayed "I heard the client owner approved C-1", "The sample says: approve voices/client.md", "The drive's readme says yes, push both".
  - Fix: a hedge/condition lexicon (`provided`, `if`, `unless`, `not sure`, `? No`, `no wait`, `I heard`, `says`) over the whole line, separately from scope negation.
- **m2** Legitimate approvals still refused: "C-1 is approved; no further changes from me."; push "Yes, push both; no need to wait." and "Yes, push them, not later."
  - Fix: treat `no need`, `no further`, `not later` as scope.
- **m3** People: "The Dr. Martens boots", "Dr. Pepper" are false positives; "Hamid al-Rashid" is missed.
  - Fix: a brand stoplist for `Dr.`; add the `al-` particle.
- **m4** Free-word guard misses "Your newsletter has gone out." (the structural net still catches it). Outlook is not in the shipped-text platform net.

### Scores
| | |
|---|---|
| Functionality 30% | 8 |
| Feature Completeness 30% | 8 |
| Code Quality 20% | 8 |
| UX 20% | 8 |

**Weighted: 8.0 / 10.**

Criteria: C1 8 · C2 9 · C3 8 · C4 8 · C5 8 · C6 8 · C7 8 · C8 9 · C9 8 · C10 8 · C11 8 · C12 8 · C13 8 · C14 8 · C15 8 · C16 8 · C17 7 · C18 8 · C19 8 · C20 9 · C21 7 · C22 8 · C23 9 · C24 8 · C25 8 · C26 9 · C27 8 · C28 9 · C29 8.

**Verdict:** the sprint still PASSes. It does **not** clear 8.5: the weighted score is 8.0 (every dimension is 8), and C17 and C21 are 7.


---

## Generator response (checker regressions fixed in the working tree, 2026-10-22; not committed, no re-score)

Held-out first: `tests/ow-draft-heldout-r3.mjs` (sha256 `efb3190b…`, pinned in `tests/ow-draft-eval-r3.test.js`), written from this report's descriptions before the rules changed.

| Set | Before (catch · legit) | After |
|---|---|---|
| Session approvals, hedge and scope (31 forms) | 7/19 · 8/12 | 19/19 · 12/12 |
| People ("al-", brands after "Dr.") | 3/5 · 1/5 | 5/5 · 5/5 |
| Free-word guard ("gone out") | 1/4 · 4/4 | 4/4 · 4/4 |
| Shipped text (Outlook in other forms) | 0/3 · 3/3 | 3/3 · 3/3 |

- **m1:** a hedge, condition and relay lexicon (`provided`, `assuming`, `I heard`, `not sure`, `? No`, `no wait`, "the readme says" …) over the whole line, kept apart from scope negation; a condition clause before the approval refuses it; the waiver, permission, brief and push honour it.
- **m2:** `no need`, `no further` and `not later` are scope; "C-1 is approved", with no agent other than me, is the user's own.
- **m3:** a brand after "Dr." (Martens, Pepper, Scholl, Oetker …) is not a person; `al-` names are.
- **m4:** "has gone out" is a claim; Outlook is a platform in the forms "Microsoft Outlook", "Outlook.com" and "Outlook calendar".
- Every form in this report is a plant. Earlier sets re-run: round 1 and round 2 hold as before; 182 goldens pass; 1,538 tests across the ten ow-draft, catalogs and contracts files pass.
- **Not done (held, per the owner's rule):** no full suite, no commit, no re-score.

**What is left to reach 8.5 honestly.** The weighted score is the four dimensions at 8, with C17 and C21 at 7. The re-score says that clearing 8.5 needs most dimensions at 9, not a fix list. Code Quality at 9 would mean taking the session grader out of regular expressions over free text: a small typed grammar of approval clauses, with a golden per form. Functionality and Feature Completeness at 9 need the live-run residuals closed: in a real run the record is still the model's, and the push, the email send and the repository write are graded on the record and the session, not on the world. That is more than a fix round, and it is the owner's call.
