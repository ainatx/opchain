# OW-07 (old name: Sprint 4b) contract — ow-care 1.0.0: care after a handoff, and care for a system taken over

**Plan:** `sprints/release-2.1/ow-family-sprint-plan.md`, § OW-07 (Sprint 4b) and the Build re-plan's OW-07 row (lane A; S1 for ow-start, P4 for ow-build-plan; needs OW-06 and OW-03; CLAUDE 18–24h, realistic 5.5–6.5h | USER 1–2h), the amendment roll-up (ow-care 1.0.0 takes C1 and C2 "or with C / Cu when those come later") and the 2026-10-19 and 2026-10-22 scope changes (C1, C2 and every hand-off to ow-controls, ow-currency and ow-vendor-eval move to v2.2 and stay absent-case paths). · **Design:** `docs/plans/2026-10-16-ow-care-design.md` (APPROVED 2026-10-16: decisions 1–11; amendments T3, T4, H4, S1, P4). T3 (`ow-tools health`) and T4 (`calc hours`) shipped in ow-tools 1.1.0 (OW-03); H4 (structured `rollover`, `urgent_price`) shipped in ow-handoff 1.0.0 (OW-06, #648).

**How it was built (owner decision 2026-10-29).** Salvaged from the Codex draft PR 652 (branch `codex/ow-handoff-completion`, base behind main, 1,625 files, not mergeable as a whole), whose `skills-work/ow-care/` scored 7/6/7/7 in its own reviews, rather than rebuilt. Taken onto a fresh branch off `origin/main` @ `14c8b608`: the skill (SKILL.md, three references, the protocol copy refreshed to main's, `skill.edges.yaml`, the shared examples), its acceptance checker and the fixtures (`tests/fixtures/ow-care/`, 80 golden cases plus the earlier 36-case prospective pack the README labels historical), its tests, the two new checker libraries (`scripts/lib/approval-grammar.mjs`, `scripts/lib/people-rules.mjs`, self-contained; the siblings keep their own copies of those rules for now), and the S1 and P4 amendments re-applied by hand onto main's ow-start 1.1.1 and ow-build-plan 1.2.0. Left behind on purpose: ow-vendor-eval and its amendments S2 and P6 (v2.2, owner 2026-10-22); the draft's `ow-protocol.md` wording change (every skill's copy would bump; main's ow-handoff already writes header-less email twins, so ow-care follows that convention instead); the draft's distribution, mirror and site changes (REL-01, Track S); the draft's 1.1.2 changes to ow-start's intake coverage rules (unrelated to care).

**Owner rulings in this sprint (2026-10-29).**
- **O1.** P4 pushes ow-build-plan's body over its 4,500-token cap: the ow-tools table and the `opchain-work/` tree moved word for word to `references/tools-and-files.md`, which every phase opens; the body keeps the rule and points there (the draft's approach). Not: raising the cap, or trimming P4.
- **O2.** The historical 36-case prospective pack (`casebook.json`, `seed/`, `prepare.mjs`, `grade.mjs`) stays in the fixtures as the README describes it, since `tests/ow-care-contract.test.js` reads it.
- **O3.** The protocol change and the draft's ow-handoff 1.0.2 say-line rewording are skipped.
- **O4.** The contract check requires a "use <id> on <path>" say to hand off with the receiver's routing verb and the body's slash hint to match: ow-handoff's two care NEXT lines keep their says and now hint `/ow-care` (ow-handoff 1.0.1; its checker accepts `written_by` 1.0.0 or the shipped version, so the 486 golden records stand). Not: the draft's "use ow-care-start on …" form.

**Versions.** ow-care 1.0.0 · ow-start 1.1.1 → 1.2.0 (S1: `kind: care-takeover`, its hands-off and NEXT) · ow-build-plan 1.2.0 → 1.3.0 (P4: `--quick --onboarding`, `care_onboarding` in the price book, the onboarding forms of `quote.md` and `contract-inputs.md`, the signed NEXT to `/ow-care-onboard`, the reads row for `CARE-nn.md`) · ow-handoff 1.0.0 → 1.0.1 (O4). `catalogs.json`: ow-care leaves `planned` and `plannedVerbs`; `bodyTokenBudgets.ow-care: 4500` (shipped at about 2,800).

**Definition of done.**
- Every design §11 acceptance test except **Real use** (one real care month, REL-02) has a golden run the checker passes and a planted failure it catches: both ways in, the wrong choice, months and full prepayment, the 0.75 h rollover and the lapse, the extra-hours pause and go-ahead, too big for care, the holiday reply target and the miss, health with and without ow-tools, the end date and the access refusal, internal numbers, private names.
- `npm run gen-catalog`, `npm run check-skill-contracts` (ow-care out of `planned`, its edges reciprocal with ow-handoff, ow-documentation, ow-start, ow-build-plan), `npm test` and every ow- acceptance script pass.
- One Generator/Evaluator round against design §11: every criterion 6 or above and no major defect in the skill's text (2026-10-19 process rule 3: a checker-only major after round 2 goes to the follow-up PR).
- PR `feat(ow): ow-care 1.0.0 — OW-07 (salvaged from #652)` with its `## Documentation` section and the per-branch handoff evidence.

**Not in this PR (follow-ups).** C1 (control tests due) and C2 (currency changes as requests) wait for ow-controls and ow-currency in v2.2. The sibling checkers (ow-handoff, ow-documentation, ow-draft) still carry their own copies of the approval-grammar and people rules that `scripts/lib/` now holds; folding them onto the libraries is a refactor of its own. REL-02 closes one real care month.

## Evaluation round 1 (2026-10-29)

Evaluator: a fresh read-only session scoring the skill text against design §11, with the checks 3(a)–(h) of its brief (upstream field names in ow-handoff's formats, the ow-tools flags, the §6 and §8.1 worked examples, the reply rule, §10, the `care.yaml` keys, family names, S1/P4 consistency). All eight checks held; every criterion scored 6 or above.

| Criterion | Score | Criterion | Score |
|---|---|---|---|
| Start after a build | 8 | Reply target | 7 |
| Start, wrong choice | 9 | Health | 7 |
| Takeover | 8 | End | 9 |
| Months | 9 | Internal numbers | 8 |
| Rollover | 9 | Private names | 8 |
| Extra hours | 8 | Real use (REL-02's; scored on whether the text lets a user run a real month) | 6 |
| Too big | 9 | | |

**Round-1 verdict FAIL** on two one-line text defects, both fixed in the same round: (1) the CHANGELOG named the checker's script path and the fixture folder, which the skill's own shipped-text rule rejects (the checker exited 1); (2) `-end`'s self-check list in `month-and-end.md` named five checks where SKILL.md's paragraph and the checker's table expect seven. Minor items fixed with them: only extra hours *used* are invoiced; a missed first reply is reported plainly and carries no credit unless the user records one; a checklist item the user checks gets the user's result and only an unchecked item is `not checked`; `-start` seeds `access.md`; the calculator's input is the kept `hours-input.json`; the forms of `tier` and `reply_calendar` are stated (the chosen tier's name, its row in `tiers_offered`; `{ timezone, hours, days, holidays }`, the shipped form rather than the design's illustrative `tz` / `Mon-Fri`); which pre-start `FIX-nn` stays with the handoff; the CHANGELOG names no product and says which two files extend design §5. The fixture worlds, which claimed `written_by` versions that do not exist (ow-handoff 1.0.2, ow-build-plan 1.4.0, ow-start 1.3.0), now carry the shipped ones. **After the fixes: PASS** (every criterion 6 or above, no major defect in the skill text).

**To the follow-up PR (2026-10-19 process rule 3, and minors left open):**
- A NEXT template for the skill's own next verbs (the goldens print the family form `use ow-care-request on care/<client>/…`; SKILL.md gives only the separate-quote template). It needs self hands-off rows in `skill.edges.yaml`.
- Checker: the golden `care.yaml` form (`tier` as a name, `reply_calendar.timezone`, `days: weekdays`) is what the checker pins; the design §3 block is illustrative and says so, but the design or the checker comment should record the shipped form.
- Owner ruling wanted: the goldens record the user's given name (`reported by Robin`), whitelisted by the checker as `ctx.user`, as ow-handoff's do; design §9 "People by role" reads as no person's name in any file.
