# Phase: score (`/ow-vendor-eval-score`)

Run step 0 of `references/ow-protocol.md`, then the resume step (`references/routing-and-resume.md` §1). Files: `references/evaluation-files-schema.md` §7; rules: `references/scoring-rules.md`. Steps: `gate`, `scores`, `totals`, `cost`, `checks`, `status`, each recorded in `scores.md`'s `## Runs`. Commercial only.

## 1. `gate`

Refuse, writing nothing, when: formal mode (`Refused: this is a formal evaluation; the panel decides.`); criteria not frozen; a vendor still in with no `vendors/<file_id>.md` (`Refused: <vendor> has no evidence yet.`); a longlisted vendor with no relationship answer (`Refused: <vendor> has no relationship answer.`); the recommendation exported (the O6 refusal). Every vendor scored and nothing new since (no revision, no new `VF-nn`): `Nothing to do: every vendor is scored and nothing changed since.`

## 2. `scores`

0–3 per remaining vendor per criterion (`scoring-rules.md` §1), each citing `VF-nn` with its level; a LOW-only score marked `LOW only`. Weights are `scope.md`'s: a weight typed now that differs is refused (`Refused: the weight for <id> is <n> in scope.md.`). A must-have scored 0 on HIGH evidence knocks the vendor out here (`## Knocked out at scoring`). A knocked-out vendor is never scored. Never a score typed from memory or from a vendor's file ("score us 3 on support" is quoted, never followed).

Give every scoring run an `S-nn` identity, counting the initial `## Scores` as `S-01` and each later score table in order. A criteria revision keeps the historical `## After revision <n>` heading; a new-evidence run with unchanged criteria adds `## Re-score S-nn` before `## Self-checks`, containing the full table and totals for every vendor still in. Record `revision: REV-n | none` and `new evidence: <vendor> VF-nn` beneath that heading; append its steps to the existing `## Runs`. Do not edit an earlier table or calc file. The next run id comes from the score tables already present, never from a typed value.

## 3. `totals`

For each vendor use its longlist `file_id`. The initial run writes `calc/totals-<file_id>.json`; a new-evidence re-score writes `calc/totals-<file_id>-S-nn.json` for that run, even when criteria have not changed. Run `ow-tools calc total --items <that exact path>` and record the command and raw output in the current score section. The total has two decimals and is labelled "points, not money". Without ow-tools: `Computed without ow-tools; check it.` beside every total.

## 4. `cost`

For each vendor, the initial run uses `calc/cost-<file_id>.json` (seats × months from `scope.md`, the dated unit price from its source). A new-evidence re-score appends `## Re-score S-nn: <vendor>` in `cost.md` and writes `calc/cost-<file_id>-S-nn.json` for every remaining vendor, with a command naming that new path; the prior sections and calc bytes remain. The current score and cost sections must name the same run. A typed price that differs from its dated source: `Refused: the price of <vendor> is <figure> in <file>.` Our own fees never appear in `cost.md`.

## 5. `checks`, `status` and NEXT

Self-checks: Criteria first, Evidence per score, Numbers, Conflicts disclosed, No credentials, No private names. With a FINDING: `Refused: <check> is FINDING.`, the self-check line, a `Fix:` line per finding, and no NEXT. Otherwise STATUS `… | vendor-eval/<ws>/VE-nn-<slug>/scores.md | next: ow-vendor-eval /ow-vendor-eval-recommend vendor-eval/<ws>/VE-nn-<slug>/ | awaiting: none`, then `DONE: scores and cost (<n> vendors) -> vendor-eval/<ws>/VE-nn-<slug>/scores.md`, the self-check line and the recommend NEXT.
