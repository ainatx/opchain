# Shared approval grammar and close checks — independent review

**Date:** 2026-10-22. **Scope:** follow-up to OW-06 PR #648 and OW-10 PR #647; source review by the coordinating agent after implementation by a separate agent.

## Result

PASS for this follow-up. No CRITICAL/HIGH or major skill-prose defect found. The duplicated clause evaluator is replaced by `scripts/lib/approval-grammar.mjs`, imported by both graders. The module has a discriminated `DraftRule | HandoffRule` contract, explicit relay policies, shared clause/sentence parsing, and strict JavaScript type checking. Each grader retains its record-specific target, person, item and waiver checks. The profile differences are explicit: draft checks whole-answer hedges; handoff permits only its documented client-report and negative-choice cases.

This improves maintainability and regression coverage; it does not turn a text grader into proof that a real email, push, transfer or approval occurred. The classifier still has bounded lexical rules. A valid model-produced record and a fixture pass do not replace world-state or real-job evidence.

## Findings fixed

1. Pending HELP records at `go-ahead` or `hours recorded` now block closing the handoff. Requested, declined and invoiced controls remain nonblocking, as the contract requires.
2. A covered nonterminal FIX can carry free into care only when care is chosen and the newest recorded installation answer is positive. Hourly help and unrelated held access still block. The completed record must retain the fix, its free status, and the removal condition for access held for that fix. Negative installation answers and omitted carry details are regression tests.

## Verification

- Implementer's focused run: 335 tests passed, all 161 handoff golden cases passed, and the draft acceptance CLI passed. Existing held-out corpora were unchanged.
- Independent verification: strict TypeScript `--allowJs --checkJs --noEmit --strict --target es2022 --module nodenext --skipLibCheck` passed for the shared module; the two new behavior suites passed 20/20; source/diff review and `git diff --check` passed.
- The historical source-copy checks now assert shared imported identities instead. They retain the existing regex/corpus semantics rather than weakening the original regression sets.
- Full candidate verification and CI are recorded separately after the complete candidate is assembled.

## Re-score and limitations

The OW-06 follow-up supports **8.0/10**: Functionality 8 (30%), Feature Completeness 8 (30%), Code Quality 8 (20%), UX 8 (20%). OW-10 remains **8.0/10** on the same dimensions. The shared module closes the duplicated-grammar debt, but there is no basis for claiming 8.5 from this refactor alone: real-model/world-state residuals and the release's real-use acceptance are still open. The owner's earlier acceptance of OW-06 at 7.3 and OW-10 at 8.0 remains the landing decision.

No skill version or customer-facing scope changes in this checker follow-up.
