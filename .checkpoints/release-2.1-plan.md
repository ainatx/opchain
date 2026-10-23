# v2.1 implementation plan

Updated 2026-10-23. This live execution ledger is checkpoint metadata; status updates do not change the verified product source. Goal: finish the minimum necessary preparation for ten OW skills plus ow-tools, verify draft PR #652, and leave public release held until the recorded conditions are satisfied. Owner restored ow-vendor-eval and ow-care on October 23; controls, framework packs/ow-packs and currency remain 2.2. Current eight-skill verification is baseline evidence only. No public release is in progress.

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
| OW-11 — vendor evaluation | [x] Approved design and restored scope | [x] Recovered preserved build; [x] Adapted core and P6/S2/D2/research; [x] 1,011 focused tests and contract/edge checks; [x] Frozen staged candidate; [x] independent review; [x] 2 lifecycle fixes and 788-test recheck; [x] first fresh model capture; [x] Bounded corrections and third capture independently accepted semantically (raw 12/16 retained) | Sol / medium | Scoped preparation done; combined gate remains |
| OW-07 — care | [x] Approved design and restored scope | [x] Recovered assets/contract; [x] Drafted handoff/takeover and care lifecycle; [x] Drafted S1/P4 with T3/T4/H4 reuse; [x] Focused contract/tool/integration checks (165 + 208 + 196 tests); [x] Frozen staged candidate; [x] independent review; [x] fixes and 36 prospective cases; [x] independent recheck; [x] main model start 6/6 and manual PASS | No active worker | Scoped technical work done; combined gate remains |
| Ten-skill release integration | [x] Scope amendment received | [x] Drafted ten-skill website introductions and routing queries; [x] Merged initial skills/catalog/edges; [x] Source integration and 11 clean archive extractions (205 combined files); [x] Affected website (97 pages, 7 surface tests, 4 browser tests); [ ] final expanded-candidate gate; [ ] added real-use evidence | Luna / low mechanical work; Sol / medium for defects | 1–2 hours plus owner real use |
| REL-01 — distribution | [x] Eight archives, manifest, source integrity, clean-folder extraction and pin machinery | [ ] Actual immutable public ow-tools pin and clean-host recognition after reviewed source landing | Luna / low | 30–60 min once eligible; currently held |
| REL-02 — model acceptance | [x] Intake, build and research corrections verified; [x] handoff checker and PDF defects repaired | [x] Fresh handoff frozen; [x] Independent review: product view 14/14, 7.7/10; raw 11/14 limitation retained | No active worker | Done for scoped preparation |
| WEB-02 — Work pages | [x] Eight-skill baseline assembled; [x] care/vendor introductions drafted | [x] Carry final source versions into held assembly | No active worker | Done |
| WEB-03 — public copy | [x] Privacy, security, navigation and draft launch copy reviewed | [ ] Release claims change only at the final cut | No active worker | Held; included in cut |
| WEB-04 — site verification | [x] Eight-skill baseline: 150 browser passes, one skip and Lighthouse budgets | [x] Ten-skill refresh: 97 pages, 7 surface tests and 4 affected browser tests pass | No active worker | Done for held assembly |
| EN-01 — enforcement observation | [x] Original audit scripts recovered | [x] Event-time adapter and reproducibility note verified; [ ] October 27 verdict | Luna / low for final aggregation | Preparation done; 15–30 min after window closes |
| EN-02 — router observation | [x] Shadow thresholds retained; [x] actual Codex bridge and separate logs identified | [x] Separate final-report commands prepared; [ ] October 27 GO/NO-GO verdict | Luna / low; Sol / medium only if interpretation is disputed | Preparation done; 10–20 min after window closes |
| REL-02 — owner use | [x] Required real-use cases listed | [ ] Three real intake calls and one real job per other included skill; [ ] host/model/transcription evidence | Owner supplies outcomes; no idle worker | Scheduling dependent; cannot estimate until examples are available |
| REL-02 — source integration | [x] Draft PR #652 and historical evidence preserved | [x] Required strict gate; [x] source-bound Docs/Repo evidence; [x] draft updated and pushed; [x] exact-head CI (all 4 jobs passed) | No active worker | Done for eight-skill baseline |
| REL-02 + WEB-05 — release and deploy | [x] Release procedure and blocking conditions documented | [ ] Atomic version/site cut, current audits, signed tag, staging, production and monitoring | Sol / medium for cut; Luna / low for checks | 45–90 min after every release condition is satisfied; not before October 27 |

Care and vendor preparation are independently reviewed. Vendor's third capture resolves the major output defects; its raw 12/16 checker failure remains recorded alongside scoped semantic/native acceptance. Ten-skill catalog/edge checks, eleven clean archive extractions and affected website checks pass. Remaining preparation is approximately **30–60 minutes** for the combined strict gate, source-bound evidence, draft PR update and exact-head CI, allowing for a bounded fix if a gate finds one. Public-release timing still depends on owner real use, installation evidence and October 27 verdicts.

## Current checklist

- [x] Incorporate October 23 owner scope amendment: vendor evaluation and care restored.
- [x] Recover vendor patch and approved care assets before new implementation.
- [x] Freeze OW-11 and OW-07 implementations with focused checks.
- [x] Complete care independent review and main model exercise (6/6, manual PASS).
- [x] Close vendor source review findings (8/10 each criterion; 788 tests).
- [x] Resolve major vendor model output defects; third capture independently accepted for semantic/native output (8/8/8/8), raw 12/16 retained.
- [ ] Integrate and verify the ten-skill candidate.

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
