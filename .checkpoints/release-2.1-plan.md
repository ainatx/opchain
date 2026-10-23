# v2.1 implementation plan

Updated 2026-10-23. This live execution ledger is checkpoint metadata; status updates do not change the verified product source. Goal: finish the minimum necessary preparation for ten OW skills plus ow-tools, verify draft PR #652, and leave public release held until the recorded conditions are satisfied. Owner restored ow-vendor-eval and ow-care on October 23; controls, framework packs/ow-packs and currency remain 2.2. Ten-skill preparation is verified at `485eef3`; older eight-skill results remain baseline evidence. No public release is in progress.

## Execution rules

- One bounded workstream per sprint; do not create a worker until its inputs are ready.
- At most two workers running concurrently, plus the coordinator, unless a specific dependency justifies more.
- New mechanical/evidence workers: `gpt-6-luna`, low reasoning. New implementation/review workers: `gpt-6.1-sol`, medium reasoning; escalate only for a demonstrated unresolved issue. Existing runs finish with their current model to avoid restart cost.
- Preserve configured Fast service (`service_tier = "priority"`). Do not enable Ultrafast. Model selection and reasoning effort limit token use; Fast controls latency and does not itself reduce tokens.
- Reuse completed evidence. Run required checks once on the final candidate; repeat only for a change, failure or unresolved concern. No optional refactoring, added product scope, extra review rounds without findings, or workers waiting on calendar/owner gates.
- Check off each completed task here and report the changed status in chat. Estimates below are remaining elapsed work, not guarantees, and exclude waiting on owner input or an external prerequisite.

## Sprint workstreams

| Sprint / workstream | Completed | Upcoming / exit condition | Next model | Remaining estimate |
|---|---|---|---|---|
| OW-11 — vendor evaluation | [x] Source, routing, focused tests and independent review; [x] major model-output defects closed | [x] Third semantic/native artifact accepted at 8/8/8/8; raw automated 12/16 retained | No active worker | Preparation done; actual owner use remains below |
| OW-07 — care | [x] Lifecycle, S1/P4 routing, focused tests, 36 prospective cases and independent review | [x] Main start capture 6/6 and manual PASS; [x] combined gate | No active worker | Preparation done; a real care month remains below |
| Ten-skill release integration | [x] Shared routing, catalog, versions, source-bound evidence and archives | [x] 8/8 strict checks; [x] held site checks; [x] draft PR #652 and all four exact-head CI jobs | No active worker | Preparation done |
| REL-01 — distribution | [x] Ten individual archives plus combined archive, manifest and 205-file byte comparison | [ ] Actual immutable public ow-tools pin and clean-host recognition after reviewed source landing | Luna / low | 30–60 min once eligible; held |
| REL-02 — model acceptance | [x] Intake, build and research corrections verified; [x] handoff checker and PDF defects repaired | [x] Fresh handoff frozen; [x] Independent review: product view 14/14, 7.7/10; raw 11/14 limitation retained | No active worker | Done for scoped preparation |
| WEB-02 — Work pages | [x] Eight-skill baseline assembled; [x] care/vendor introductions drafted | [x] Carry final source versions into held assembly | No active worker | Done |
| WEB-03 — public copy | [x] Privacy, security, navigation and draft launch copy reviewed | [ ] Release claims change only at the final cut | No active worker | Held; included in cut |
| WEB-04 — site verification | [x] Eight-skill baseline: 150 browser passes, one skip and Lighthouse budgets | [x] Ten-skill refresh: 97 pages, 7 surface tests and 4 affected browser tests pass | No active worker | Done for held assembly |
| EN-01 — enforcement observation | [x] Original audit scripts recovered | [x] Event-time adapter and reproducibility note verified; [ ] October 27 verdict | Luna / low for final aggregation | Preparation done; 15–30 min after window closes |
| EN-02 — router observation | [x] Shadow thresholds retained; [x] actual Codex bridge and separate logs identified | [x] Separate final-report commands prepared; [ ] October 27 GO/NO-GO verdict | Luna / low; Sol / medium only if interpretation is disputed | Preparation done; 10–20 min after window closes |
| REL-02 — owner use | [x] Required real-use cases listed | [ ] Three real intake calls and one real job per other included skill; [ ] host/model/transcription evidence | Owner supplies outcomes; no idle worker | Scheduling dependent; cannot estimate until examples are available |
| REL-02 — source integration | [x] Source `a8582267`, metadata head `485eef3`, normal commit hooks and PR readiness PASS | [x] Draft updated; [x] all four exact-head remote CI jobs passed | No active worker | Preparation done |
| REL-02 + WEB-05 — release and deploy | [x] Release procedure and blocking conditions documented | [ ] Atomic version/site cut, current audits, signed tag, staging, production and monitoring | Sol / medium for cut; Luna / low for checks | 45–90 min after every release condition is satisfied; not before October 27 |

**Preparation goal complete.** Source `a85822679ea88e9ee29a473880fcc736bceb3180` and metadata head `485eef357094fe4164c942cceda77cbad04cb0be` are pushed to draft PR #652. All eight strict checks, source-bound PR evidence and all four exact-head CI jobs pass. The held website builds 97 pages, with seven surface tests and four affected browser tests passing. All eleven archives extract cleanly and match source. Vendor's semantic/native artifact is accepted independently, while its raw 12/16 automated failure remains explicit.

The remaining rows concern public release: owner real jobs and host/model prerequisites, public pins/install, October 27 verdicts, then the eligible cut/deploy work. Their estimates exclude owner scheduling and external waits. No release, tag, merge or deployment occurred. This live completion update records CI after the final pushed candidate; it does not change the verified product source.

**After evaluation, 2026-10-23:** approval-grammar commits `7fd13af1` and `11282e4f` (shared retraction and relay rules, shared person-name rules in `scripts/lib/people-rules.mjs`, the whole-statement not-a-bidder check, and stale ten-skill text; evaluator's untuned set 119/119 approvals, 24/24 people in all three graders) follow `485eef3`. Owner decisions on 2026-10-23: the target is 9.5/10 on independent evaluation. A short real-use gate covers all ten skills, including care and vendor evaluation in short form (`sprints/release-2.1/rel-02/real-use-runbook.md`). The full care month and a full vendor selection move to 2.1.1.

## Current checklist

- [x] Incorporate October 23 owner scope amendment: vendor evaluation and care restored.
- [x] Recover vendor patch and approved care assets before new implementation.
- [x] Freeze OW-11 and OW-07 implementations with focused checks.
- [x] Complete care independent review and main model exercise (6/6, manual PASS).
- [x] Close vendor source review findings (8/10 each criterion; 788 tests).
- [x] Resolve major vendor model output defects; third capture independently accepted for semantic/native output (8/8/8/8), raw 12/16 retained.
- [x] Integrate and verify the ten-skill candidate: all eight strict checks pass.
- [x] Commit ten-skill source and bind current-source Docs/Repo evidence.
- [x] Push draft PR update and verify all four exact-head CI jobs at `485eef357094fe4164c942cceda77cbad04cb0be`.

- [x] Preserve primary checkout and original held website worktree.
- [x] Repair and independently verify the known intake/build/research/handoff checker defects.
- [x] Repair the PDF table collision and verify native bounds, copied identifiers and all pages.
- [x] Verify all eight current text-skill archives in clean folders.
- [x] Freeze fresh handoff.
- [x] Record its independent verdict: product view 14/14, 7.7/10; raw 11/14 remains failed.
- [x] Finish EN-01 and EN-02 preparation; keep their final verdicts separate (9 synthetic tests and 15 syntax checks passed).
- [x] Run the final source gate: eight strict checks passed.
- [x] Bind current-source Docs/Repo evidence.
- [x] Update draft PR #652 with eight-skill baseline evidence and restored ten-skill scope.
- [x] Refresh held website assembly.
- [x] Run its final browser check: 95-page build; 150 passed, 1 skipped, 0 failed.
- [x] Confirm eight-skill exact-head remote CI: all four jobs passed at fc9521db.
- [ ] Obtain remaining owner/public-install/October 27 evidence.
- [ ] Release and deploy only when eligible.
