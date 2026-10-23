# Model exercises after the contract corrections

These are synthetic exercises performed by fresh Codex subagents reading the current skill and scenario inputs. They are neither golden-output replays nor real customer jobs. Writers did not read answer keys, graders, earlier captures or diagnosis notes. They could perform the skill's own same-session checks before freezing; reviewers graded only frozen outputs. The local ow-tools adapter is source checkout version 1.3.1, not an installed public mirror snapshot.

## Results and corrections

| Exercise | Initial independent grade | Result after review | What changed |
|---|---|---|---|
| Build retry 4, current 1.0.1 | 8/9 | 9/9 on the same frozen bytes | The checker now accepts the published same-author disclosure in ordinary wording; it still rejects omitted or negated same-author statements |
| Intake retry 4, current 1.1.2 | 10/11 | Preserved | The column fact was retained under a retention field; the owning schema now explicitly maps structure, quality and retention |
| Intake retry 5, current 1.1.2 | 10/11 | 11/11 on the same frozen bytes | Field mapping was correct; the key now accepts equivalent same-day wording, with next/following-day negative cases |
| Recorded-web research retry 4, current 1.0.3 | 20/22 raw | 22/22 on a byte-preserving projection | The parent-created, unchanged `session/scenario.md` was removed from the grading view only; every model byte was retained. No live network result is claimed |
| Handoff retry 4, current 1.0.1 | 9/14 | 12/14 against its receipt-verified original baseline | Binary/date/HTML/JSON checker defects were corrected. Optional screen prose, a command absent from the then-current repository source, and an unlabeled missing generated-output directory remain genuine failures |
| Handoff retry 5, current 1.0.1 | 10/14 raw projection | 11/14 raw; 14/14 product-output diagnostic view | Exact repository-root trailing-slash checker correction; the diagnostic view excludes 26 hashed auxiliary evidence files placed inside the workspace by the parent exercise boundary. Raw failures remain recorded |

The fourth handoff also exposed a visible PDF defect outside its structural grade. Its original PDF remains preserved. A separate re-export of its unchanged Markdown verified the generic table layout repair, including native word bounds and all-page visual inspection; it does not convert that failed raw model run into a pass. See [PDF review](../../../docs/audits/2026-10-23-pdf-table-layout.md).

The original selected quote, draft, UAT and documentation-view passes and their narrower limits remain in [the October 22 capture record](model-capture-2026-10-22.md). The documentation capture still does not prove a real screenshot/export workflow. All prior refusals and failures remain historical evidence.

## Evidence boundaries

Raw workspaces, preparation receipts, outside run notes, original grades, and per-file freeze/projection manifests are kept under ignored `scratch/rel02-retry-4-2026-10-23/` and `scratch/rel02-retry-5-2026-10-23/`. Research's projection excludes only the exact unchanged scenario file the parent supplied. The handoff helper projections exclude only unchanged preparer-owned nested `.git` metadata; the helper validates every other file byte and refuses changed repository content. Its prospective README improvement is not applied to old captures. The historical baseline regrade used the old README only as predecessor input, after checking it against the original preparation receipt.

A separately labeled handoff retry-5 product-output view excludes exactly 26 hashed raw-tool and native-inspection files, as recorded in its sibling manifest. The parent required those receipts and inspections while initially limiting writes to the prepared workspace. No captured byte was edited, no raw score is replaced, and the raw-grade gate remains failed. The final independent product-output correction review scored functionality/completeness/code/UX 8/7/8/8 (weighted 7.7/10), with all four criteria above its threshold. That scoped PASS does not establish an unqualified raw pass. Future exercises must place auxiliary evidence outside the graded workspace from the outset.

The executable handoff fixture has six real offline application tests and isolated synthetic Git history. Its measured test/scan results do not verify the larger system described in inherited fictional planning, UAT, account and delivery records. No send, signature, ownership transfer, hosted CI run, real integration, deployment or owner approval is inferred.

Independent findings, regression checks and final scoped evaluation belong to [the independent review](../../../docs/audits/2026-10-23-contract-model-independent-review.md). Structural pass counts are not a substitute for that review or for real use.

The frozen local evidence archive is `scratch/rel02-contract-captures-2026-10-23.tar.gz` (3430858 bytes), SHA-256 `15c8800f8bc84ea67f1bb82b1636fdbdd7792e2e388ad011a8c6bcc24f05b53f`. It preserves both raw workspaces, outside notes, preparation receipts, original and post-correction grades, and the explicit projection/exclusion manifests. It is local review evidence, not a release asset.

## Download rehearsal

The current source generated all eight individual skill archives and the combined archive. Each archive's SHA-256 matched `public/work/manifest.json`; each was extracted into a separate empty `.claude/skills/` destination. The combined extraction's 157 source files matched the source byte-for-byte, as did each individual skill, LICENSE and NOTICE. Versions: start 1.1.2, build-plan 1.2.1, build 1.0.1, UAT 1.0.3, documentation 1.0.2, handoff 1.0.1, research 1.0.3 and draft 1.0.1. The combined archive SHA-256 is `9972b7b359b6477ef0cd23ed5ada57ee0ddb0705ced5b7a6cea1529fbad370d8`.

This is local filesystem installation evidence only. Public download, clean host recognition, the immutable ow-tools pin, model prerequisites, the transcription spike, owner real jobs and October 27 observation verdicts remain open release conditions.
