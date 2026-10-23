# Scoring rules: the scale, evidence levels, totals and cost

## 1. The scale (design §5.2)

| Score | Means |
|---|---|
| 0 | not met |
| 1 | met with a workaround |
| 2 | met |
| 3 | clearly better than needed |

A score cites at least one `VF-nn` of that vendor for that criterion, with its level. A score with no evidence is not written: the criterion gets a `VQ-nn` instead. A withdrawn `VF-nn`, or one whose `F-nn` is superseded (stale), is never cited.

## 2. Evidence levels (owner decision O12)

| Source | Kind | Level |
|---|---|---|
| An ow-research finding (`### F-nn` under `## Findings`) | finding | the finding's own level, unchanged |
| The user's demo notes, which the user confirms in this session are their own observation, naming the file | shown | HIGH |
| A vendor's email, answer, security questionnaire, demo recap or quote | stated by vendor | MEDIUM |
| A reference check (the reference by role and kind of organisation) | stated by reference | MEDIUM |
| Anything worked out from the above | inferred | LOW |

A vendor's claim about another vendor ("our competitor has no data export") is that vendor's MEDIUM claim about the other, and never knocks the other out. A demo recap the vendor wrote is `stated by vendor`, whatever its file is called.

## 3. Must-haves and knock-outs

- A must-have knocks a vendor out **only on HIGH evidence**: a finding at HIGH, or `shown`. The row says `out MH-nn: <reason> (<evidence>, HIGH)` and stays in `longlist.md`, never deleted.
- On LOW or MEDIUM evidence the vendor stays, flagged with its `MH-nn`, and `-evidence` adds a `VQ-nn` for it.
- At `-score`, a must-have scored 0 on HIGH evidence knocks the vendor out, recorded under `## Knocked out at scoring` with its `VF-nn`. A knocked-out vendor is never scored.

## 4. Weighted totals

`calc/totals-<vendor>.json` holds one item per criterion: the score as `quantity`, the weight as `unit_price`. `ow-tools calc total --items calc/totals-<vendor>.json` gives Σ score × weight, out of 300; it is printed with two decimals and labelled "points, not money", and `scores.md` and the recommendation show the figure equal by value. The command and its raw output are recorded. Without ow-tools: `Computed without ow-tools; check it.` beside every total, never a silent sum. No other derived figure (a percentage, a ratio, a rank number, "29% cheaper") is written unless copied from a source.

The weights' sum is checked the same way at `-scope`: `calc/criteria-set.json` (quantity 1, the weight as unit price) totals 100.

## 5. Cost over the horizon

`calc/cost-<vendor>.json`: `quantity` = seats × months (whole numbers), `unit_price` = the dated price per seat per month, one currency per file. Each price is "as published on <date>" (a finding with its `retrieved` date) or "as quoted by the vendor on <date>" (a file in `inbox/`). A typed price that differs from its source is refused. A price rise is a risk in words, never computed. A vendor priced in another currency is a line of its own, never converted. **Our own fees never appear in `cost.md`.**

## 6. The recommended vendor

The recommended vendor is the highest total among the vendors still in. Recommending another needs a reason in `## Decision`, in the user's words. The runner-up is the next highest, with what would make it the better choice.
