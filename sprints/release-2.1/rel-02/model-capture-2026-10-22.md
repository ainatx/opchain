# REL-02 model capture — 2026-10-22

**Result: acceptance remains incomplete.** Eight isolated model exercises ran
against invented inputs. None is a customer job, owner commercial decision,
actual signature, or evidence that a hosted installation works. The owner
confirmed on October 22 that real-use checks have not happened and requested
continued release preparation.

Three separate Codex agents loaded the actual skills and their references,
then produced outputs without reading graders, answer keys or expected outputs.
The parent subsequently ran the graders. Model identity is the session's Codex
default; an exact backend model identifier was not exposed. Diagnosis of the
start/plan/build outputs by their author is explicitly retrospective self-review;
the parent grading and the UAT review were separate from generation.

## Frozen first pass

| Skill | Case | Initial result | Material limitations |
|---|---|---|---|
| ow-start | larkspur-prospect | 6/11 checks | Mixed taxonomy/key assumptions, coverage and unknown-fact trace errors; system-count rule ambiguous |
| ow-build-plan | unpriced-package | 4/5 | Expected scenario issue date was not supplied; narrow case does not establish full pricing correctness |
| ow-build | update | 7/9 | Invalid machine-facing trace/result forms; second milestone demo date remains unknown |
| ow-uat | signoff-signed | 13/15 | Several schema/parser mismatches plus a real `Item` versus `UAT-nn` heading error |
| ow-documentation | write-guides | 13/17 | Presentation/citation/absence-statement grader issues; supplied screenshot bytes are stubs, so export remains blocked |
| ow-handoff | package | FAIL | Screen grammar, command-source resolution and unrecorded export-command failures; tools unavailable |
| ow-draft | m-write | 10/13 | Scenario date differs from the key; NEXT indentation mismatch; parent-requested run notes counted as output |
| ow-research | run-approved | 15/22 | Recorded-adapter provenance/schema mismatch, quotation limit failure; agent disclosed an append-only violation and raw display of an invented fixture credential |

These are named-check counts, not assertion counts or effectiveness scores.
Same-session PASS statements in generated files are not independent acceptance.
No failed capture was rewritten to make a grader pass.

## First-pass execution boundaries

- `ow-tools` was absent from the agents' command path. They retained Markdown
  fallbacks and unverified arithmetic/date/export limitations. No actual
  transcription, model download, PDF/DOCX export or client-system test occurred.
- The research run used only the explicitly allowed recorded web fixtures,
  with no network request. Its local adapter annotations conflicted with the
  grader's web-source schema. This does not excuse the append-only violation,
  overlong quotation or initial raw fixture-secret display.
- Missing fixture answers were supplied as explicit fictional roleplay and
  saved in session/run notes. Future dates were explicitly simulated: build
  November 13, UAT January 27, 2027, documentation February 2, handoff February
  17, draft October 23, and research October 21. Actual host date stayed
  October 22. The plan run used the actual tool date; the key assumed October
  26. No simulation is represented as a live event.

## Evidence and evaluator isolation

Raw captures are retained locally at
`scratch/rel02-model-2026-10-22/<skill>/`. The immutable evidence archive is
`scratch/rel02-model-2026-10-22.zip`, SHA-256
`2fe55d94a8328711d2776e00950dc11265dfafe0101421354f07dd68f69eebeb`.
It contains all raw files, original grade logs and per-file capture hashes.
It is a local review artifact, not a published release asset.

The parent had explicitly requested a root `run-notes.md` in every capture.
Several graders correctly treat unexplained root writes as invalid skill
output. Subsequent evaluator copies remove **only that declared harness
metadata**, preserving raw captures and every other write. The exclusion and
raw hashes are recorded per skill in
`scratch/rel02-evaluator-2026-10-22/*-capture-manifest.json`. No product grader
gets a blanket filename exemption. A stray model-authored file still fails.

The targeted UAT correction raises its untouched capture to 14/15 and retains
the identifier-column failure. The documentation evaluator view now grades 17/17 after the three
source-aligned corrections; the raw first pass remains 13/17, and its screenshot
stubs still block exports. Negative controls are part of the commit gate. Neither regrade
replaces first-pass history. See the diagnosis reports under `docs/audits/`.

## Fresh retries with explicit scenario dates and local tools

New isolated writers used the actual skill instructions without opening graders,
keys, prior captures or diagnosis reports. Harness notes were written outside
their run folders. Every output was frozen before parent grading.

| Retry | First grade | Unchanged-capture regrade / next run | Finding |
|---|---|---|---|
| Build Plan quote and export | 4/5 | 5/5 | Actual ow-tools 1.3.1 commands and JSON were present; the grader wrongly required the label `output` instead of the published `raw output` wording |
| Draft writing | 12/13 | 13/13 | Rendered Markdown NEXT indentation was rejected; every screen check now normalizes only the supported layouts, retaining exact content checks |
| UAT signing, retry 1 | 13/15 | Still failed, untouched | Wrong `UAT` identifier header and noncanonical step records; published step-map schema was incomplete |
| UAT signing, retry 2 | 15/15 | Fresh writer after schema clarification | Exact identifier header and `{step, rec, date}` mappings; no repaired capture |

The UAT clarification preserves canonical `rec`, same-event citations, resume
order and signoff-last behavior. It is unreleased; bump the per-skill version
and synchronize its README/held site versions before publishing these bytes.
The handoff consumer now reads UAT's exact `logged date` alias and written-out
dates through a shared strict calendar parser. Duplicate columns, invalid dates,
wrong days and incorrect identifiers still fail.

The quote exercise used real calculator and export commands. Two PDF and two
Word files were produced. The coordinator rendered and inspected all seven PDF
pages and found no clipping; text extraction from PDF and Word found none of
the selected internal pricing/embedded-instruction markers. This does not
establish accessibility conformance or a real customer approval. The five quote
checks are narrow, and its calculator-evidence check establishes presence,
not complete command/result pairing or independent proof of execution.

Scenario dates remain fictional: quote October 26, draft October 24, and UAT
January 27, 2027; the actual host date was October 22. The quote writer disclosed
reading prepared state before opening the protocol, assembling source before
the export step-0 commentary, and using phase-screen captures rather than
terminal screenshots. Its notes preserve those limits. No external sends,
signatures, vendor commitments or real client tests occurred.

The frozen retries, outside notes, initial/regrade logs and per-file hashes are
in `scratch/rel02-fresh-retries-2026-10-22.zip` (549890 bytes), SHA-256
`191115473ed245a14a04ff435f91b47b0862ae2437bbbd919b4ea7b483f25ca1`.
The archive is local review evidence, not a release asset. The initial archive
above remains unchanged. Independent review is recorded in
`docs/audits/2026-10-22-model-retry-review.md`.

## Further fresh runs with available local tools

Four additional isolated writers used published skill text and prepared inputs,
without graders, answer keys or earlier captures. Fictional user clarifications
and execution limits are retained in outside notes. Captures were frozen before
grading; none was repaired to obtain a passing result.

| Exercise | Observed result | Remaining requirement |
|---|---|---|
| Intake extraction | 7/11 | Exact fact references and unprompted coverage need correction; lexical, contradiction-coverage and system-count assumptions remain disputed |
| Build update | 7/9 | Exact source/date serialization and clean matching HTML/TXT deliverables; reconcile the protocol's universal header with client-email rules |
| Handoff package | Successful package not reached; all three success checks fail | The documentary repository has no executable suite or Git metadata; actual scan returned NOT-CHECKED and the writer correctly refused takeover |
| Research with recorded pages | 19/22 | Consecutive source quotation limit and complete NEXT fallback; define legitimate local-profile provenance in the suspicious-content schema |

The handoff refusal is not a package PASS. Its prepared reported test/scan
records do not establish executable inputs or a fresh successful scan. Build
evidence remains supplied fictional report data, not newly executed application
tests. Research made no network requests; it preserved and disclosed initially
assumed timestamps that were wrongly labeled user-stated. Its individually short
quotes still recreated overlong contiguous source passages. Independent review
distinguishes those actual output errors from conflicting published rules in
`docs/audits/2026-10-22-model-retry3-review.md`.

The immutable local archive is `scratch/rel02-retry-3-2026-10-22.zip`, 427965
bytes, 362 files including hashes and grader logs; SHA-256
`0ccea3c69f639bb4204b37a89998ff622b9137f60a535ba20bd3f458a768f846`.
It is synthetic review evidence, not a release asset or real-use acceptance.

## Before the release cut

Resolve the remaining intake, build, handoff and research failures, using
explicit scenario dates and an honest tool adapter for fresh isolated exercises.
Preserve failed runs alongside retries. Research needs a fresh successful run
that protects displayed credentials, follows append-only rules and stays within
quotation limits. The public host install and actual trigger observations are
also still pending; a prompt list or human-inferred routing answer is not a host
activation record. Complete the owner's real-job checks separately, then
evaluate the October 27 observation verdicts and the ordinary release gates.
