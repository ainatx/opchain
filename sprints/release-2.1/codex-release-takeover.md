# v2.1.0 release completion

**Date:** 2026-10-22. **State:** release preparation in progress; not released. The owner confirmed real-use checks are not done and requested continued preparation on October 22.

This ledger is the preparation snapshot before final candidate verification.
Subsequent gate, commit and PR outcomes are recorded in the
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
| Shared approval grammar | Both graders import one typed module; held-out cases remain intact; independent review | Implemented; focused tests and independent review pass, full candidate gate pending |
| Eight-skill scope correction | Current scope and absent-care behavior agree | Prepared |
| REL-01 distribution | Separate combined/per-skill archives, validation before write, clean-folder installation, mirror, integrity manifest | Implemented and independently reviewed; full candidate verification pending |
| Supply-chain pins | Durable public ow-tools ref and exact commit; model provenance and verification procedure | To verify; no fabricated pin or hash |
| WEB-02–04 | Dynamic work pages, install/version table, privacy/security copy, navigation, accessibility and discovery-isolation checks | Held candidate prepared and independently reviewed; responsive/accessibility/browser checks pass, final release assembly still pending |
| Dependency consolidation | Nine pending dependency PRs triaged together, compatible updates and full checks | Clean installs and both npm audits pass; all 116 Python registry dependencies audit clean after Pillow/certifi fixes. The latest full suite passed 11,102 tests and found two isolated release-fixture dependency failures. All three fixture setups now share the correction and 45 focused tests pass; the final full rerun follows |
| REL-02 model acceptance | Actual model-produced runs checked independently, distinguished from synthetic goldens | All failures preserved; selected quote 5/5, draft 13/13, UAT 15/15 and documentation view 17/17 with export limit. Further fresh runs: intake 7/11, build 7/9, recorded-web research 19/22; handoff correctly refused missing executable tests. Those cases and actual host checks remain open |
| REL-02 real use | Owner's real-job outcomes, without client material in Git | Owner confirmed not yet done |
| EN-01 | Consumer enrollment and one working week measured against the original corpus definition | Window October 19–26; verdict due October 27 |
| EN-02 | Eight-day shadow report: sample size, core proxy precision and non-pipeline silence | Verdict due October 27; no GO claimed |
| Release cut | Atomic versions/site claims/seal, release checks, reviewed merge, signed pushed tag | Pending readiness evidence |
| Deployment | Current runtime audits, hardening, staging checks, production health, refreshed monitoring baseline | Pending release cut |

The observation period and real-job outcomes cannot be substituted with fixture passes. Any change to those release conditions must be recorded as an explicit owner decision. A deployment is complete only after the signed tag, staging and production verification, and monitoring-baseline refresh.

## Interim router measurement

At 2026-10-22 21:38 UTC, the private route log contained 60 outcomes since October 19, through October 22 20:56 UTC. Excluding explicit mentions (none), there were 16 would-be suggestions, core proxy precision 0.3125 and non-pipeline silence 0.78049. All three thresholds are below the required 30 / 0.8 / 0.95. This is an interim reading, **not the October 27 verdict**. No prompt text is included here, and live mode remains unsupported. Reproduce the final aggregate with `node scripts/route-eval.mjs outcomes --log "$HOME/.claude/opchain-route/route-log.jsonl" --since 2026-10-19` after the window ends.

## Takeover artifacts

- `rel-02/model-capture-2026-10-22.md` records every initial model result, the
  preserved evidence archive hash, explicit harness exclusions and remaining
  acceptance work. No failed capture was edited into a pass.
- `cleanup-issue-draft.md` is the requested consolidated issue draft; it has
  not been filed.
- EN-01's original Oct 8 audit scripts were recovered from the originating
  session into ignored `scratch/en01-recovered-audit/` and syntax checked.
  They have not been rerun as an Oct 19–26 result; their date-window adaptation
  and final aggregate remain due at the end of the observation period.
- The held site candidate has all eight dynamic work pages, installation and
  download surfaces, with no premature release/version or real-client claims.
  Its review record lives in the separate held site tree until release assembly.
