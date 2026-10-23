# OW-07 independent source review — 2026-10-23

skill_invoked: yes (oc-code-auditor, auditor-only; this report replaces checkpoint/findings writes under the assigned review scope)

Reviewed base `8d428bd1281b8ef108f355dedd272ecccabb8fd7` to frozen staged tree `b224009081470cdbb07f5792c8c355c1d611787f` (33 files), approved `docs/plans/2026-10-16-ow-care-design.md`, `/tmp/ow07-implementation-contract.md`, care references/protocol, S1/P4 integrations, H4 interfaces, and calculator/export implementation. No applicable AGENTS.md was found in the checkout or inspected ancestor paths. Review is independent of the writer session, but is source review plus targeted probes, not blind model execution or owner use. No product/fixture edits, commit, deployment, or external messages.

## Verdict and scores

**Needs fixing before a graded blind acceptance exercise.** A diagnostic model run is possible, but should not hide these deterministic source defects. Functionality **5/10**, completeness **5/10**, code/instruction quality **6/10**, UX **6/10**, security/approval/privacy **7/10**. The required all-dimensions-at-least-6 gate is not met. No critical credential or automatic-send defect was found; lower scores reflect the exact accounting, output and evidence gaps below.

## Actionable findings

### F-001 — HIGH: replaying historical months applies new terms retroactively

Location: `skills-work/ow-care/references/month-and-end.md:3`, `:9`, `:19`.

Month close uses the currently effective terms, rebuilds a ledger containing **all months from M-01**, then passes a single rollover rule to `ow-tools calc hours`. Terms changes expressly allow a new rule after notice/acceptance, while prior ledger rows/reports are immutable. The calculator accepts one rule for the entire ledger, not a per-month rule. Thus the prescribed command rewrites prior totals in its result and brings the wrong rolled balance into the new month.

Independent probe with two 480-minute months, each using 300 minutes: under `0.25,unused,1`, M-01 rolls 45 minutes and M-02 opens with 525 available; replay with `0.5,unused,1` makes M-01 roll 90 and M-02 open with 570. A change effective only in M-02 must preserve M-01's 45-minute rollover. This is a real supported path, not a request for a new calculator feature.

Minimal fix: specify a supported way to preserve each month's effective rule and opening batches across a terms transition; if the tool cannot express that state, explicitly use the marked manual calculation for the transition rather than the single-rule replay. Add a two-month changed-rule fixture proving old terms remain frozen.

### F-002 — MEDIUM: final-month extras and credits have no settlement request

Location: `skills-work/ow-care/references/month-and-end.md:13`, `:25`.

The only recurring invoice instruction combines the **next full month's prepaid price** with this month's approved extra/urgent charges and credit. The same paragraph suppresses the renewal invoice after the effective end date; end writes only the end note/email. For an ending month with 75 approved extra minutes, following that suppression leaves no request for the earned extra charge. Issuing the described combined request instead would charge an unwanted renewal. Capacity credit has the same gap.

Minimal fix: when care ends, write a final settlement invoice request containing approved outstanding extras/urgent charges and recorded credit only, without a prepaid renewal; cite it in the final report/end record. Cover final month with extra time and a credit.

### F-003 — MEDIUM: internal appendix instructions do not define export stripping markers

Location: `skills-work/ow-care/SKILL.md:89`; `skills-work/ow-care/references/month-and-end.md:9`, `:11`.

The skill requires command/raw tool receipts in the owning record's internal part and a monthly internal appendix, and exports client reports/onboarding. No care instruction specifies the `<!-- ow:internal -->` / `<!-- ow:end-internal -->` marker pair used by ow-tools. A heading called Internal appendix is ordinary client-visible content to the exporter. This can expose machine paths, raw receipts and self-check wording, violating protocol §12's client-copy boundary.

Independent direct `preflight()` probe of a report with `## Internal appendix`, an ow-tools command and a same-session self-check returned `ok: true`, `removedSections: 0`; the full appendix remained in `body`. No actual PDF/Word or model output is claimed by this probe.

Minimal fix: require the exact marker pair around all internal receipts/checks in exportable Markdown and require preflight/native export inspection. Add a fixture proving the client export excludes those sections while retaining required handling text.

### F-004 — MEDIUM: care acceptance fixtures are scenario prose, not reproducible inputs/outputs

Location: `tests/fixtures/ow-care/README.md:7–12`; `tests/ow-care-contract.test.js:12–54`.

The new care fixture directory contains only a README. The five tests pin instruction strings and exercise the pre-existing calculator/date function; they do not run any care verb or inspect care-produced records. Even reply testing begins from an already chosen effective Tuesday, so it does not test outside-hours/holiday normalization or Friday-miss reporting. The README has no separate explicit scenarios for the 12-hour separate quote, rolled-input expiry, short-month restoration, notes/access changes, change acceptance, or idempotent resume/no-output refusal for all verbs. It is honest about these limits, but does not fulfill the agreed happy/error fixtures and evaluator evidence contract.

Minimal fix: materialize bounded inputs/session answers and expected semantic assertions for the design cases and each verb's happy/refusal/resume paths, then use them in the blind exercise. Preserve the explicit owner-real-use gap rather than fabricating it.

## Design §11 evidence matrix

| Approved case | Source review | Executed evidence in this review |
| --- | --- | --- |
| After-build free carried fix plus metered waiting request | Specified; H4 carry fields read unchanged | No care model output; README scenario only |
| Latest choice hourly refuses start | Explicit latest-choice refusal | Text pin; no refusal output run |
| Full S1/P4/onboard/takeover start | Intake kind, quick onboarding price/limited contract, signed NEXT, eight review parts and start choice specified; reciprocal edges present | No fresh-model path execution |
| Nov 17–Dec 16, full first invoice | Explicit anniversary/end-before-next, full prepaid | No generated month/invoice; short-month behavior unexecuted |
| 8h/5h gives 0.75 rollover, 2.25 lapse; old rollover expires | Existing T4 integer-minute arithmetic reused; current fixed-rule example correct | Targeted calculator suite passes; changed-rule probe exposes F-001 |
| 1.25h extra needs prior go-ahead, billed with M-03 | Explicit pause/approval and next-invoice instruction | Calculator rejects unapproved overage; no care approval chronology/model output; final settlement F-002 |
| 12h on 8h recommends separate quote, never later care hours | Explicit threshold/own acceptance checks and no-double-charge wording; reciprocal build-plan CARE read edge | No 12h care fixture/model execution |
| Friday 18:00/Monday holiday → Thursday; Friday miss | Correct effective-day and working-day semantics in text | Date function confirms Tuesday + 2 business days = Thursday; receipt normalization/miss output unexecuted |
| 20-day cert attention; tool-free checklist | Explicit attention/proposed request/accept-or-drop and NOT-CHECKED fallback | No care health model output in this review |
| March 1 notice → April 16 end, unresolved access blocks | Explicit containing-month notice arithmetic/end blockers | No generated notice/end/refusal output |
| Internal time export fails; recorded care hours pass | Explicit nonwaivable source/no-internal-numbers checks | No planted-output refusal execution; actual export preflight exposes F-003 |
| Empty handoffs reveals no private names | Public defaults, protocol data boundary and private-name prohibition specified | No model output from empty handoffs |
| One real client care month/report | Correctly left as owner evidence | **NOT-CHECKED: no actual client month** |

## Verification and scope limits

Independent run: `./node_modules/.bin/vitest run tests/ow-care-contract.test.js tests/ow-tools/digest-hours.test.js` — **2 files, 33 tests passed**. Direct calculator transition and exporter preflight probes produced the evidence above. Writer-reported broader focused passes are context, not independent evidence from this review. No full combined gate, release readiness, fresh-model execution, native report exports, or actual client care month was established.

Versions retained: care 1.0.0, start 1.2.0, build-plan 1.3.0, handoff 1.0.2. Review respects ten-skill v2.1 scope including care/vendor; controls/packs/currency remain v2.2. Release metadata outside this lane is not a finding.

Immediately before writing this report, `git write-tree` still returned `b224009081470cdbb07f5792c8c355c1d611787f`, and `git diff --name-only` was empty. This untracked report is the only review-owned checkout output.

## Targeted fix verification — candidate 1a6657

Reviewed only the F-001–F-004 delta from staged tree `b224009081470cdbb07f5792c8c355c1d611787f` to `1a665712c871d8c641fb7e2112d1519237d89e68` (57 total candidate files), using `/tmp/ow07-review-fix-mapping.md`. Original findings above are preserved as history. No broad second review was performed.

- **F-001 VERIFIED at instruction level.** Mixed-rule whole-history replay is now explicitly forbidden. The manual transition preserves the prior closed rollover and its source/expiry and continues marked manual calculation for later mixed-rule closes. The changed-rule regression yields prior rollover 45, opening 45, own unused 225 and new rollover 105 minutes. This corrects the reproduced arithmetic defect without pretending the existing calculator accepts changing historical rules.
- **F-002 VERIFIED at instruction level.** Final close owns an explicit final settlement request containing only outstanding approved extra/urgent charges and recorded credit, with no renewal. The final report/end cite it; the edge manifest records its writer. Independently recomputed the example: 75/60 × 250 − 30/480 × 3200 = **112.50**. This verifies arithmetic and the instruction, not a generated care invoice request. The prospective fixture has the separate remaining input issue below.
- **F-003 VERIFIED.** Exact standalone stripping markers and native-copy inspection are required. An independent `preflight()` call on `export-source.md` returned `ok: true`, `removedSections: 1`, retained the CONFIDENTIAL handling banner, and excluded both `private.json` and same-session self-check text. Native PDF/Word output remains unexecuted here.
- **F-004 PARTIAL; substantial materialization completed.** The pack now contains bounded seeds, session answers, 36 cases, preparation and semantic grading, including all nine verb happy/refusal/resume groups. Refusal grading hashes the complete input tree rather than merely checking one absent output. It explicitly reserves chronology/source/approval/native-copy inspection for a human and makes no model-run claim. One consequential final-settlement happy input remains inconsistent and should be corrected before that case is graded.

### Remaining F-004 fixture correction

Location: `tests/fixtures/ow-care/casebook.json:575–580`, with `seed/active/opchain-work/care/larkspur-ceramics/requests/CARE-01.md:15`.

`month-final-settlement` retains a 480-minute included plan and a seed CARE-01 of 210 minutes, overrides health to 45 minutes, and adds 75 **approved** extra minutes without recording complete actual usage or report-writing time. Even treating the new 75 as performed work gives only 330 recorded minutes before the unspecified report time; it does not establish that the included 480 were exhausted. Nevertheless the answer key demands a charged 75-minute overage and 112.50 settlement. A model following the month-close source and approved-extra-actually-used rules should ask for the missing actual/report time instead of producing that amount. The case risks grading the correct question as a failure or rewarding an unsupported extra charge.

Minimal fix: supply complete owned quarter-hour entries totaling 555 minutes (480 included + 75 extra), including explicit health and report time; record the client's pre-work approval and the performed extra time separately. Keep the recorded 30-minute credit and expected 112.50. This is a fixture correction, not a newly requested product feature.

### Revised gate and next exercise

Revised source/readiness scores: functionality **7/10**, completeness **6/10**, code/instruction quality **7/10**, UX **7/10**; security/approval/privacy **8/10**. All now meet the ≥6 source-review threshold. The original product defects F-001–F-003 are resolved at this review's evidence level. **Ready for the main after-build blind fixture**, with complete handling/calendar answers made available; do not treat the inconsistent final-settlement fixture as acceptance-ready until the correction above. These scores authorize neither a release verdict nor claims that all 36 cases passed a model exercise.

Independent focused verification: `./node_modules/.bin/vitest run tests/ow-care-contract.test.js tests/ow-tools/digest-hours.test.js` — **2 files, 37 tests passed**. Direct extraction/settlement probes are described above. The writer's 169-test run, 36 preparations and 11 unchanged refusal baselines are reported context, not fresh-model execution evidence. The isolated build-plan body cap has an integration-owned fix and is outside this targeted care closure. Actual client care month/report, blind execution, native exports and full combined gate remain NOT-CHECKED here.

Immediately before appending this closure, `git write-tree` returned the expected `1a665712c871d8c641fb7e2112d1519237d89e68`. Only this untracked audit report was edited by the reviewer.

## Fresh-model main fixture — independently graded frozen interactive output

**Manual verdict: PASS for the after-build start exercised here.** This is a captured interactive exercise, not a single-turn result from the subsequently enriched fixture. It is not proof for the other care verbs, all 36 cases, native exports, a real client month or release readiness.

Evidence root: `/tmp/ow07-blind-start-2026-10-23/`. Frozen output manifest `frozen-output-manifest.json` SHA256 **ada3192dcf5118dae70a1d576fb938b1a978ec004588ad423c28e58a8ac6baaa** binds 44 files, including raw output, input/session data, receipts, runtime skill snapshot and the initial blocked capture. Independently recomputed all 44 entries: **zero mismatches**. The printed response hash is `b44853282ed0b06c35efa14f34ebacd5a04c0a29e90080804e81727cd258e244`; the invoice-request hash is `d853637ada19ea8d54b3ef0f1aa9d8c7e9c30fa57f8296b360443b2f74893a23`. Raw output was not modified.

Runtime instruction binding: frozen SKILL SHA256 `e74ce889d5f387c1298ffb5d55f76ae078ee3ee917c468c3c7cc2388016e5eb8`, entry/request reference `e8c106d68da1a44adec8a306f2a9321f7da621e98bee83f260632b1bf3300f01`, and month/end reference `644c10f83c7b25c63103643f866406d8d760db60c6b11d154a4280a886892d68` match the current isolated source at staged tree `0fa45d2fa32e3c29cffe24eeb4fc62e4db26866d`; the other runtime care instructions also match. The shipped example offers differ (`c6422109…` frozen versus `2f69a743…` current); this after-build run uses the unchanged client's frozen after-offer rather than that example. Runtime wrapper hash `f687038045884811d34c306120245faa6660c5a41ed85ec0342833664e5efc5e` declares the supported `OW_TOOLS_NOW` test clock and executes the real installed ow-tools. Its underlying tool implementation is outside the frozen 44-file manifest; receipts show its actual commands/results. No claim is made that a frozen tool-library snapshot was captured.

The first model invocation correctly stopped without care artefact writes for the missing monthly-call decision, incomplete request timestamps/roles and conflicting prepaid-versus-14-day terms. This response is preserved in `captures/01-blocked/printed.md`; `receipts/009-write-result.txt` records no opchain-work mutation at that stop. The explicit follow-up in `session/follow-up-01.md` supplies monthly_call=no, both received timestamps/role, and withdraws the synthetic 14-day deadline in favor of full prepayment April 17. These are captured user answers, not retroactively projected expected output. Future enriched fixture answers must not be described as the original prompt.

Manual examination of all produced care records confirms:

- Frozen Regular terms: 6 included hours, price USD 3000, actual offered rollover 0.5 of unused for one month, 30-day notice, hourly 1000 and urgent 1200; no terms sourced from a later offers file.
- M-01 runs April 17–May 16, 2027; its **full USD 3,000** prepaid charge is due April 17 before work; no proration, payment claim or subsequent charge was invented.
- CARE-01 references FIX-01 and records zero care minutes/free carried fix, with verification pending. CARE-02 references FIX-02 as metered waiting care work, estimate unknown, zero actual time and no work approval. Its Saturday receipt becomes Monday April 19 effective receipt; two business days gives Wednesday April 21 at 17:00, with raw tool evidence.
- AX-14 records read-only run-log purpose, client operations owner and removal/end condition, retaining unknown grant history/platform instead of inventing facts.
- STATUS has one append with concrete request NEXT and outstanding prepayment/fix verification/estimate. The visible NEXT contains slash hint, read list, attachment instruction and public fallback. No client message, invoice delivery, payment collection or client-system write was claimed/performed in the captured output.
- Original handoff input hashes match the prospective input manifest. Output uses roles and no supplied personal/private name; internal commands/receipts/self-checks are inside the required marker pairs.

### Checker result and necessary checker-only correction

Independently ran the root checker:

`node /Users/aidanelsesser/.codex/worktrees/ow-handoff-completion/opchain/tests/fixtures/ow-care/grade.mjs start-after-build /tmp/ow07-blind-start-2026-10-23`

Checker SHA256 at review: `ee1420e8812b98605366dda65c75035107dd5424ca9ac3657c03d01986b65027`. It reproduces **one failed assertion of six**, `invoice-request ... missing 3000`. The actual invoice request says `Amount: USD 3,000, full prepaid monthly charge` and care.yaml's numeric price is 3000; the period and due terms also agree. Thus **3,000 and 3000 are proven semantically equivalent here**, and this failure is a checker false negative. Minimal correction: compare the currency/amount field numerically, or narrowly accept legitimate thousands grouping in that amount assertion. Do not rewrite or project the output. No product fix or model re-run is needed for this formatting-only failure; preserve the raw checker result alongside the manual verdict.

### F-004 final-settlement input closure

At staged care tree `0fa45d2fa32e3c29cffe24eeb4fc62e4db26866d`, the previously inconsistent case now supplies owned CARE-01 420 + health 45 + CARE-02 75 + report 15 = **555 minutes**, exactly 480 included plus 75 extra. It separately records the client email approval December 1 before performed work December 2 and a user-decided 30-minute capacity credit/reason. The expected settlement remains 112.50. **The remaining F-004 input defect is VERIFIED closed**; this checks preparation consistency, not a fresh-model final-month execution.

Source/readiness scores remain functionality 7, completeness 6, quality 7, UX 7, security/approval/privacy 8. This single successful start exercise adds bounded model evidence without filling the other explicitly open acceptance gaps. All original findings are now closed at their stated source/fixture verification scope, subject to the checker-only currency-format correction above. No raw output or product source was edited during grading.
