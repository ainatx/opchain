# v2.1.0 release completion

**Updated:** 2026-10-23. **State:** release preparation in progress; not released. The owner confirmed real-use checks are not done and requested continued preparation on October 22.

The preparation base `b29e3731` passed all eight strict local checks, 123 browser tests and all four remote jobs on draft PR #652. New contract and fixture corrections require their own verification. Subsequent gate, commit and PR outcomes are recorded in the
[`oc-release-ops` checkpoint](../../.checkpoints/oc-release-ops.checkpoint.json).

## Scope

The owner transferred the active Claude workstream to Codex and authorized completion of the work and release. The latest scope is eight independently versioned work skills: ow-start, ow-build-plan, ow-build, ow-uat, ow-documentation, ow-handoff, ow-research and ow-draft, plus ow-tools. Care, vendor evaluation, controls and currency remain planned for v2.2. The oc- catalog remains lockstep at 2.0.4; the planned release is 2.1.0. The router remains an experimental preview, opt-in and shadow by default.

## Reconciled starting state

- Main `73f775a3` includes OW-05 follow-ups (#644), OW-09 follow-ups (#639/#646), ow-tools scan-secrets (#643), ow-draft (#647), dependency security fixes (#649), and checkpoint attribution (#645).
- OW-06 PR #648 started at `0706fbb0`. The owner accepted its 7.3 evaluation for landing. After the fixture/export corrections, all four CI jobs passed at `4f939f4e`; it merged as `809ed373` on October 22. The shared approval grammar is the next improvement. A fresh independent audit found no CRITICAL/HIGH or major skill-prose defect, and two checker-only gaps: pending hourly help did not block close; installed-care carry-forward was rejected.
- WEB-01 is held in #620. Its source is being reused for WEB-02–04 and the eventual cut; release claims must move only when tagging and deployment follow.
- Historical v1.9 artifacts in the primary checkout are unrelated to this release and remain untouched.

## Completion ledger

| Work | Required evidence | State |
|---|---|---|
| OW-06 landing | Review and all required CI checks at the current head | Complete: all eight strict local gates and all four remote CI jobs passed; merged as `809ed373` |
| Shared approval grammar | Both graders import one typed module; held-out cases remain intact; independent review | Implemented and independently reviewed; full candidate gate passed at `b29e3731` |
| Eight-skill scope correction | Current scope and absent-care behavior agree | Prepared |
| REL-01 distribution | Separate combined/per-skill archives, validation before write, clean-folder installation, mirror, integrity manifest | Implemented and independently reviewed; candidate verification passed at `b29e3731`; actual public install remains open |
| Supply-chain pins | Durable public ow-tools ref and exact commit; model provenance and verification procedure | To verify; no fabricated pin or hash |
| WEB-02–04 | Dynamic work pages, install/version table, privacy/security copy, navigation, accessibility and discovery-isolation checks | Held candidate assembled with `b29e3731`; Astro/build and nine-route Lighthouse budgets passed. Final source refresh/browser pass pending; public cut remains held |
| Dependency consolidation | Nine pending dependency PRs triaged together, compatible updates and full checks | Clean installs and both npm audits pass; all 116 Python registry dependencies audited clean after Pillow/certifi fixes. The two release-fixture dependency failures were corrected, and the complete strict gate passed at `b29e3731`; superseded PRs stay open until consolidation merges |
| REL-02 model acceptance | Actual model-produced runs checked independently, distinguished from synthetic goldens | Prior failures preserved. Selected quote 5/5, draft 13/13, UAT 15/15 and documentation view 17/17 retain their limits. Corrected frozen build 9/9, fresh intake 11/11, recorded-web research projection 22/22; fresh handoff raw 11/14 and explicitly scoped product-output view 14/14 (independent score 7.7/10). The raw limitation remains recorded. Actual host/real-use checks remain open |
| REL-02 real use | Owner's real-job outcomes, without client material in Git | Owner confirmed not yet done |
| EN-01 | Consumer enrollment and one working week measured against the original corpus definition | Window October 19–26; verdict due October 27 |
| EN-02 | Eight-day shadow report: sample size, core proxy precision and non-pipeline silence | Verdict due October 27; no GO claimed |
| Release cut | Atomic versions/site claims/seal, release checks, reviewed merge, signed pushed tag | Pending readiness evidence |
| Deployment | Current runtime audits, hardening, staging checks, production health, refreshed monitoring baseline | Pending release cut |

The observation period and real-job outcomes cannot be substituted with fixture passes. Any change to those release conditions must be recorded as an explicit owner decision. A deployment is complete only after the signed tag, staging and production verification, and monitoring-baseline refresh.

## Interim router measurement

At 2026-10-22 21:38 UTC, the private route log contained 60 outcomes since October 19, through October 22 20:56 UTC. Excluding explicit mentions (none), there were 16 would-be suggestions, core proxy precision 0.3125 and non-pipeline silence 0.78049. All three thresholds are below the required 30 / 0.8 / 0.95. This is an interim reading, **not the October 27 verdict**. No prompt text is included here, and live mode remains unsupported. Reproduce the final aggregate with `node scripts/route-eval.mjs outcomes --log "$HOME/.claude/opchain-route/route-log.jsonl" --since 2026-10-19` after the window ends.

## Takeover artifacts

- Current installed Codex skills were read and verified on October 23. The `2.0.4` cache is explicitly the unpublished 2.1-track JEV router snapshot: all 36 `SKILL.md` files match the prepared worktree. The older Claude cache is not the source used for this continuation. Personal live-router authorization does not establish general release effectiveness.
- `rel-02/contract-corrections-2026-10-23.md` scopes the current intake, build, research and executable handoff-fixture work. Historical captures remain immutable, and fresh writers receive scenario dates and tool availability before generation.

- `rel-02/model-capture-2026-10-22.md` records every initial model result, the
  preserved evidence archive hash, explicit harness exclusions and remaining
  acceptance work. No failed capture was edited into a pass.
- `cleanup-issue-draft.md` is the requested consolidated issue draft; it has
  not been filed.
- EN-01's original Oct 8 audit scripts and hashes are preserved. Event-time adapters and separate Claude/Codex procedures passed nine synthetic tests and 15 syntax checks; no final corpus scan or verdict was performed. `en-observation-preparation-2026-10-23.md` records the exact window, actual installed Codex bridge and its separate log paths.
- `../../.checkpoints/release-2.1-plan.md` is the current sprint checklist, with model/effort policy, completed work, dependencies and remaining time estimates. `rel-02/model-capture-2026-10-23.md` preserves the new raw/projection distinctions and clean-folder download rehearsal.
- The held site candidate has all eight dynamic work pages, installation and
  download surfaces, with no premature release/version or real-client claims.
  Its review record lives in the separate held site tree until release assembly.
