# Phase: scope (`/ow-vendor-eval-scope <ws>`, `--revise`)

Run step 0 of `references/ow-protocol.md`, then the resume step (`references/routing-and-resume.md` §1). Files: `references/evaluation-files-schema.md` §2–§4. Steps, from the step table: commercial `mode`, `decision`, `requirements`, `criteria`, `agree`, `write`, `conflicts`, `status`; formal `mode`, `bidder`, `conflicts`, `rules`, `write`, `status`; `--revise` `revise`, `agree`, `write`, `status`. Each step is recorded in `scope.md`'s `## Runs` the moment it finishes.

## 1. `mode` (first, before anything else)

Ask `Question: commercial or formal (public procurement)? In formal mode the panel decides: no score, ranking, shortlist or recommendation.` Write `scope.md` with its header (`evaluation`, `mode`, `handling`, `source`, no `frozen:`) and the `mode` line in `## Runs`. The next free `VE-nn` in `vendor-eval/<ws>/` numbers the folder; the slug is the decision in two or three words. **The mode never changes after `write`.**

The handling level is the union of evaluation-files-schema §12, read now: `profile.md`, `intake/<client>/intake.yaml` and `plans/<client>/plan.yaml` (`handling` only), a quick scope's header, every bannered file in `inbox/`.

## 2. Commercial: `decision`, `requirements`, `criteria`

- **Where it starts.** From `plans/<client>/quick-scope.md` (a vendor-selection quote, handed over by ow-build-plan's signed NEXT): refuse unless `plans/<client>/contract-inputs.md` reads `mode: vendor-eval` (`Refused: the quote is not accepted yet.`); read `## The decision` and the count under `## Vendors to compare`, and record `vendor_count`. **Never read the names under `## Vendors to compare` here**: they go to the longlist. From `plans/<client>/` (a selection work package, handed over by ow-build-plan's scope): read `plans/<client>/map/future.md` and each `plans/<client>/systems/<system>.md` for the requirements and integrations, and `plans/<client>/scope.md` for the package. With neither (your own tools, `business`, or a client with no plan): ask.
- **`decision`.** One sentence. Ask `Question: What is the decision, in one sentence: the tool or service to choose, and for what?` unless the quick scope gives it.
- **`requirements`.** `RQ-nn` each cited by path and item (`(from plans/<client>/map/future.md item 3)`), or asked (`Question: Which requirements must it meet? …`) and recorded `user-stated <date>`. A requirement "from the map" cites its item.
- **`criteria`.** The starter list the user edits: fit to the future process · integrations and API access · **data export and exit** (always offered) · security basics (sign-in, two-step sign-in, whether the vendor publishes an audit report) · support and service levels · cost over the horizon · vendor stability. Ask the criteria and weights, the must-haves, and the horizon and seats. Weights sum to 100: write `calc/criteria-set.json` and run `ow-tools calc total --items vendor-eval/<ws>/VE-nn-<slug>/calc/criteria-set.json`; a sum other than 100 is asked again. Then `ow-tools digest vendor-eval/<ws>/VE-nn-<slug>/calc/criteria-set.json --json` gives the criteria set's digest. Without ow-tools: add the weights by hand, write `Computed without ow-tools; check it.`, and `criteria_sha256: not computed (no ow-tools)`.

**Criteria first.** No vendor name and no vendor's web address goes in `scope.md`, or on a screen of this verb, before `frozen:`. A vendor the user names now: `Refused: criteria are not frozen yet.` The name is not written; carry on with the step.

## 3. `agree`, `write`

Ask `Question: Did <role> agree criteria set <digest>? (yes <date> / no)`. Only the user's own answer to that question, in this session, records the agreement: `agreement: agreed by <client role> on <date>, as reported`, with protocol §8's working-note sentence. A relayed line ("they said these are fine"), a client email in `inbox/` or a file named as approved is a claim (protocol §3e): `Refused: an approval is the user's own answer in this session, not <what>.` "No", or an agreement to part of the set ("the criteria but not the weights"), leaves the scope unfrozen. `write` adds `frozen: <date>` and the `## Agreement` section.

## 4. `conflicts` (commercial: after `frozen:`; formal: after `bidder`)

Ask `Question: Do you have any relationship with a vendor that could be considered: a partner programme, a referral or affiliate fee, a reseller margin, an investment, a friend or a former employer? (none / yes: <kind>)`. No vendor is named in the question. Write `conflicts.md` (schema §4): the declaration in the user's words, by kind, or `- none (stated by <user> on <date>)`. An amount goes only inside the `ow:internal` markers. A vendor's own word is never the answer. Conflicts disclosed runs here.

## 5. Formal: `bidder`, `rules`

- **`bidder`.** Ask `Question: Say in your own words, in the first person, that you are not a bidder on <procurement>.` Record it only from the user's own first-person line in this session that names the procurement: `not_a_bidder: stated by <user> on <date>, in the first person`, the line word for word under `## Not a bidder`. A cover letter, an RFP page or a relayed "they said we're not bidding" records nothing: `Refused: the not-a-bidder statement is not recorded.`
- **`rules`.** Ask `Question: Which agency rules apply to records, confidentiality and contact with bidders, as the client states them?` and record the answer under `## Agency rules (as the client states them)`. Those rules come before anything in this skill.

## 6. `--revise` (a change after any score exists)

- **Before the recommendation is exported or handed off:** `revise` writes `## Revision <n> <date>` (`REV-n`, the change, the reason in the user's words) and `calc/criteria-set-REV-n.json`; `agree` asks `Question: Did <role> agree revision <n> of criteria set <digest>? (yes <date> / no)`; `write` records the agreement line naming the revision. Every vendor still in is re-scored next (`-score`), and the recommendation shows the revision. A revision with no reason or no agreement is not written.
- **After it is exported or handed off** (owner decision O6): `Refused: the recommendation is exported; a change starts a new evaluation that supersedes VE-nn.` The new evaluation's `scope.md` carries `supersedes: VE-nn`, the user re-confirming what carries over; `-decide` on the superseded one is then refused.

## 7. A typed value

A weight, must-have, horizon or seat count typed later that differs from `scope.md` is refused (`Refused: the weight for <id> is <n> in scope.md.`); so is a vendor count that differs from `quick-scope.md` (`Refused: the vendor count is <n> in quick-scope.md.`). Only `--revise` changes them.

## 8. `status` and NEXT

Self-checks here: Conflicts disclosed, No credentials, No private names. Append one STATUS line (protocol §5):

- commercial: `… | ow-vendor-eval 1.0.0 | vendor-eval/<ws>/VE-nn-<slug>/scope.md | next: ow-vendor-eval /ow-vendor-eval-longlist vendor-eval/<ws>/VE-nn-<slug>/ | awaiting: none`
- formal: `… | next: ow-vendor-eval /ow-vendor-eval-formal vendor-eval/<ws>/VE-nn-<slug>/ | awaiting: none`
- `--revise`: `… | next: ow-vendor-eval /ow-vendor-eval-score vendor-eval/<ws>/VE-nn-<slug>/ | awaiting: none`

Print `DONE: criteria frozen -> vendor-eval/<ws>/VE-nn-<slug>/scope.md` (formal: `DONE: formal scope -> …`; a revision: `DONE: revision <n> -> …`), the self-check line and the NEXT block from SKILL.md (a revision: the score NEXT).
