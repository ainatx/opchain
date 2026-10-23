# Phase: recommend (`/ow-vendor-eval-recommend`, `--waive <check> <figure>…`)

Run step 0 of `references/ow-protocol.md`, then the resume step (`references/routing-and-resume.md` §1). File: `references/evaluation-files-schema.md` §8–§9. Steps: `gate`, `write`, `checks`, `export`, `status`; `--waive`: `waive`, `checks`, `export`, `status`. Each is recorded in `recommendation.md`'s `## Runs`, inside the `ow:internal` markers. Commercial only.

## 1. `gate`

Refuse, writing nothing: formal mode; no `scores.md` (`Refused: <vendor> has no evidence yet.` or the score NEXT); a vendor with no relationship answer; `recommendation.md` already exported or handed off (`Nothing to do: the recommendation for VE-nn is written.`). The handling level is read again now (schema §12).

## 2. `write`

One page, the sections schema §8 names, exactly, in order. Keep the title, score table, citations and source paths compact enough for the native page without deleting evidence, LOW-only marks or required sections. Every vendor, score and cost is copied from `scores.md` and `cost.md`, never retyped. The recommended vendor is the top total among those still in; another needs the user's reason in `## Decision`. `## Runner-up` names the next highest vendor and explicitly says what evidence or capability, tied to the frozen criteria, would make it the better choice; a list of present weaknesses alone is incomplete. `## Conflicts statement` carries each relationship from `conflicts.md` and `longlist.md` by vendor and kind. For none, keep the declaration's original stated-on date (ISO or written out for the client); record any later same-session reconfirmation internally without silently changing that provenance. It is never left out, paraphrased or waived. An amount is stated only if the user chooses. A revision shows under `## Decision`.

Before claiming that a runner-up condition could make it the better choice, check the counterfactual against the frozen weights and 0–3 scale: hold every unmentioned criterion at its recorded score, raise only the named criteria to the highest scores the condition describes (never above 3), and compare that maximum weighted total with the recommended total. If it cannot exceed the recommended total, do not say those changes would make the runner-up better. Name an additional criterion only as a clearly hypothetical, requirement-grounded condition, never as a present capability or score; otherwise say no currently supported winning condition is established and new evidence would require re-scoring. Do not invent evidence, silently change criteria, or present a hypothetical total as an observed result.

Then write the client form, `export/client/recommendation.md` (no header, no `ow:internal` part, the banner kept), and its digest, `ow-tools digest vendor-eval/<ws>/VE-nn-<slug>/export/client/recommendation.md --json`, into the header's `client_form_sha256` (without ow-tools: `not computed (no ow-tools)`). A waiver names this digest.

Under a handling level, `banner_text` is the first line after the header, and stays in the client form and every export.

## 3. `checks`

Self-checks: Criteria first, Numbers, Conflicts disclosed, No internal numbers, No credentials, No private names (`references/self-checks.md`). **Written, then checked**: with a FINDING, print `Refused: <check> is FINDING.`, the self-check line, a `Fix:` line per finding, `Nothing was written.` only when nothing changed, and no NEXT; a fix rewrites `recommendation.md` in place, asked first, until its first export.

## 4. `--waive` (a No internal numbers figure, or a waivable check's one item)

`waive` reads the waiver the user types in this session: the check, each figure as written, the reason, and the client form's digest (`references/self-checks.md` §3). Refuse a never-waived check (`Refused: <check> can never be waived.`), a waiver with no figure (`Refused: a waiver names each figure and its reason.`) and a waiver taken from a file. Append the row to `## Waivers`; nothing else in the file changes. Then `checks` and `export` run, so a waived recommendation is exported.

## 5. `export`

Only when no check is FINDING (a waived one excepted). With ow-tools, before the first final export, render the client form to a disposable preview folder outside `opchain-work/`, inspect the native PDF with `pdfinfo` (exactly one page), and inspect the Word text/structure. If the PDF is two pages, tighten layout or wording without dropping a required field, re-render and verify; do not mark the recommendation complete, write STATUS or print decide/draft NEXT while layout fails. Keep any failure and tool receipts honest. Then run `ow-tools export vendor-eval/<ws>/VE-nn-<slug>/export/client/recommendation.md --formats pdf,docx --out vendor-eval/<ws>/VE-nn-<slug>/export/`, record the command and raw output, and verify the final native PDF is still one page. Without ow-tools: copy the client form to `export/markdown/recommendation.md`, never the source, and state that native pagination was not checked. In a git repository, the first evaluation asks once whether `export/` stays out of it, and records the answer. **From the first final export (`export/recommendation.export.json`, or the copy in `export/markdown/`), `recommendation.md` is write-once.**

## 6. `status` and NEXT

Before status, confirm the runner-up has its explicit better-choice condition, the source-dated conflicts line is intact, and the final native PDF is one page when exported. Fill the actual vendor in the decide NEXT; never print literal `<vendor>` or another placeholder. STATUS `… | vendor-eval/<ws>/VE-nn-<slug>/recommendation.md | next: ow-vendor-eval /ow-vendor-eval-decide vendor-eval/<ws>/VE-nn-<slug>/ | awaiting: none`. Print `DONE: recommendation (<vendor>) -> vendor-eval/<ws>/VE-nn-<slug>/recommendation.md`, the self-check line, the filled decide NEXT and, for a longer report, the ow-draft NEXT. Only when no check is FINDING (a waived one excepted) and layout verification passes.
