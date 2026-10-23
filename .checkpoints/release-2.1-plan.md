# v2.1 implementation plan

Updated 2026-10-23. This live execution ledger is checkpoint metadata; status updates do not change the verified product source. Goal: finish the minimum necessary preparation, verify draft PR #652, and leave public release held until the recorded conditions are satisfied. No public release is in progress.

## Execution rules

- One bounded workstream per sprint; do not create a worker until its inputs are ready.
- At most two workers running concurrently, plus the coordinator, unless a specific dependency justifies more.
- New mechanical/build/evidence workers: `gpt-6-luna`, low reasoning. New defect/review workers: `gpt-6-sol`, medium reasoning; escalate only for a demonstrated unresolved issue. Existing runs finish with their current model to avoid restart cost.
- Preserve configured Fast service (`service_tier = "priority"`). Do not enable Ultrafast. Model selection and reasoning effort limit token use; Fast controls latency and does not itself reduce tokens.
- Reuse completed evidence. Run required checks once on the final candidate; repeat only for a change, failure or unresolved concern. No optional refactoring, added product scope, extra review rounds without findings, or workers waiting on calendar/owner gates.
- Check off each completed task here and report the changed status in chat. Estimates below are remaining elapsed work, not guarantees, and exclude waiting on owner input or an external prerequisite.

## Sprint workstreams

| Sprint / workstream | Completed | Upcoming / exit condition | Next model | Remaining estimate |
|---|---|---|---|---|
| REL-01 — distribution | [x] Eight archives, manifest, source integrity, clean-folder extraction and pin machinery | [ ] Actual immutable public ow-tools pin and clean-host recognition after reviewed source landing | Luna / low | 30–60 min once eligible; currently held |
| REL-02 — model acceptance | [x] Intake, build and research corrections verified; [x] handoff checker and PDF defects repaired | [x] Fresh handoff frozen; [x] Independent review: product view 14/14, 7.7/10; raw 11/14 limitation retained | No active worker | Done for scoped preparation |
| WEB-02 — Work pages | [x] Eight dynamic pages, installation/version/download surfaces assembled | [x] Carry final source versions into held assembly | Luna / low | 5–10 min after source freeze |
| WEB-03 — public copy | [x] Privacy, security, navigation and draft launch copy reviewed | [ ] Release claims change only at the final cut | No active worker | Held; included in cut |
| WEB-04 — site verification | [x] Astro/build, browser checks and 9-route Lighthouse budgets passed on assembled base | [ ] One final browser pass after assembly refresh | Luna / low | 5–10 min, shared with WEB-02 build |
| EN-01 — enforcement observation | [x] Original audit scripts recovered | [x] Event-time adapter and reproducibility note verified; [ ] October 27 verdict | Luna / low for final aggregation | Preparation done; 15–30 min after window closes |
| EN-02 — router observation | [x] Shadow thresholds retained; [x] actual Codex bridge and separate logs identified | [x] Separate final-report commands prepared; [ ] October 27 GO/NO-GO verdict | Luna / low; Sol / medium only if interpretation is disputed | Preparation done; 10–20 min after window closes |
| REL-02 — owner use | [x] Required real-use cases listed | [ ] Three real intake calls and one real job per other included skill; [ ] host/model/transcription evidence | Owner supplies outcomes; no idle worker | Scheduling dependent; cannot estimate until examples are available |
| REL-02 — source integration | [x] Draft PR #652 and historical evidence preserved | [ ] Required strict gate; [ ] source-bound Docs/Repo evidence; [ ] update draft and wait for exact-head CI | Coordinator; Luna / low for mechanical status | 25–45 min, partly overlaps assembly work |
| REL-02 + WEB-05 — release and deploy | [x] Release procedure and blocking conditions documented | [ ] Atomic version/site cut, current audits, signed tag, staging, production and monitoring | Sol / medium for cut; Luna / low for checks | 45–90 min after every release condition is satisfied; not before October 27 |

The likely remaining preparation path is **35–60 minutes** if the fresh handoff and required checks pass. Public-release timing remains controlled by the observation window and owner/installation evidence.

## Current checklist

- [x] Preserve primary checkout and original held website worktree.
- [x] Repair and independently verify the known intake/build/research/handoff checker defects.
- [x] Repair the PDF table collision and verify native bounds, copied identifiers and all pages.
- [x] Verify all eight current text-skill archives in clean folders.
- [x] Freeze fresh handoff.
- [x] Record its independent verdict: product view 14/14, 7.7/10; raw 11/14 remains failed.
- [x] Finish EN-01 and EN-02 preparation; keep their final verdicts separate (9 synthetic tests and 15 syntax checks passed).
- [ ] Run the final source gate and update draft PR #652.
- [x] Refresh held website assembly.
- [ ] Run its final browser check.
- [ ] Confirm exact-head remote CI.
- [ ] Obtain remaining owner/public-install/October 27 evidence.
- [ ] Release and deploy only when eligible.
