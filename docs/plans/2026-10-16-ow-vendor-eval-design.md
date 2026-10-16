# ow-vendor-eval — design (choosing a vendor, honestly)

**Date:** 2026-10-16 · **Status:** APPROVED 2026-10-16 with amendments P6, S2 and D2. Nothing is built.
**Release:** a skill in the ow- family that ships together as v2.1.0 (owner scope change 2026-10-16). Starts at 1.0.0.
**Origin:** the 2026-09-21 strategy's *Program* bundle: "first question selects commercial vs formal public procurement; formal mode scores nothing and recommends no awardee".
**Family rules that apply:** ow-protocol v1; labelled same-session self-checks; code only in `ow-tools`; no network text (vendor facts come from `ow-research`); no public ow- skill names a private skill; one writer per file.
**Place:** inside a Build Plan when the build needs a tool chosen, or on its own (a client's tool selection sold by quick quote, or your own tools in the `business` workstream). **Upstream:** `ow-research` findings; `ow-build-plan` (`map/future.md`, `systems/*.md`, the scope's selection work package); the user's demo notes and vendor answers. **Downstream:** `ow-build-plan` (the chosen tool joins the systems inventory, P6), `ow-draft` (a longer report), `ow-start` logs (the decision, indexed).

`ow-vendor-eval` helps a client choose a tool in a way they can defend: criteria and weights agreed before anyone looks at vendors, must-haves that knock vendors out, every score backed by evidence, costs computed from dated published prices, and any relationship you have with a vendor disclosed. In formal public procurement it prepares the evaluation and stops there: no scores, no ranking, no recommendation.

## 1. Owner decisions

| # | Date | Question | Answer |
|---|---|---|---|
| 1 | 2026-10-16 | Scope | `ow-vendor-eval` ships in v2.1.0 |
| 2 | 2026-10-16 | For whom | **Clients choosing tools** (in a Build Plan or as its own job), **your own tools**, and **public-sector procurement** (formal mode) |
| 3 | 2026-10-16 | Commercial method | **Must-haves, then a weighted score:** criteria and weights agreed with the client before any vendor is looked at; must-haves knock vendors out; the rest scored 0–3 with evidence per score; a recommendation with the runner-up and why |
| 4 | 2026-10-16 | How it's sold | **Inside a Build Plan** when the build needs it (no separate line); **on its own, a fixed-fee quick quote** from a new price-book line sized by the number of vendors compared (P6) |

## 2. Modes (the first question)

| | Commercial | Formal (public procurement) |
|---|---|---|
| Who decides | The client (or you, for your own tools) | The agency's evaluation panel, under its rules |
| What the skill writes | Requirements, criteria and weights, longlist, knock-outs, scores with evidence, cost, recommendation, the decision record | Requirements (mandatory and desirable, as the agency defines them), the agency's criteria and method as given, a blank evaluation workbook, a clarification log, a response map |
| Scores, ranking, recommendation | Yes | **Never.** No score, ranking, shortlist or awardee, not even as a draft |
| Before starting | Conflicts declared (§6) | Conflicts declared, and **you are not a bidder** on this procurement (recorded); the agency's own rules on records and contact with bidders come first |

## 3. Where files live

```
opchain-work/vendor-eval/<workstream>/VE-nn-<slug>/
  scope.md            # -scope: mode, the decision, requirements, criteria and weights (frozen)
  conflicts.md        # -scope: declared relationships with any vendor considered
  longlist.md         # -longlist: candidates and where each came from
  vendors/<vendor>.md # -evidence: facts per criterion with evidence and confidence
  questions.md        # -evidence: vendor questions and the demo script
  scores.md           # -score (commercial only)
  cost.md             # -score (commercial only): dated prices, horizon, calc record
  recommendation.md   # -recommend (commercial) → export/
  decision.md         # -decide
  formal/             # formal mode only, written by -formal
    requirements.md  evaluation-workbook.xlsx  clarifications.md  response-map.md
```

## 4. Verbs (commercial)

Every file has one writer verb. Every verb starts with the ow-protocol resume step.

| Verb | Does | Writes |
|---|---|---|
| `/ow-vendor-eval` | Lists evaluations with their stage | — |
| `/ow-vendor-eval-scope <workstream>` | Asks the mode first. Commercial: the decision, requirements (from `map/future.md` and `systems/*.md` when a Build Plan exists, else asked), must-haves, criteria with weights summing to 100, the cost horizon; the client agrees them (recorded as reported) **before any vendor is named**. Records conflicts (§6) | `scope.md`, `conflicts.md` |
| `/ow-vendor-eval-longlist` | Candidates from ow-research findings, the client's suggestions and the user's; each with where it came from. Knocks out any that fail a must-have on HIGH evidence | `longlist.md` |
| `/ow-vendor-eval-evidence <vendor>` | Facts per criterion from ow-research findings (with fetch dates), vendor answers (`stated by vendor`, MEDIUM), demo observations (`shown`, HIGH); writes the vendor questions and a demo script built from the requirements | `vendors/<vendor>.md`, `questions.md` |
| `/ow-vendor-eval-score` | Scores each remaining vendor 0–3 per criterion, each score citing its evidence; computes the weighted totals and the cost over the horizon with `ow-tools calc` | `scores.md`, `cost.md` |
| `/ow-vendor-eval-recommend` | The recommendation (§5.3); exported as PDF/Word | `recommendation.md` → `export/` |
| `/ow-vendor-eval-decide <vendor>` | Records the client's choice (`decided by <client role> on <date>, as reported`), which may differ from the recommendation; prints NEXT | `decision.md` |
| `/ow-vendor-eval-formal` | Formal mode's materials (§7) | `formal/*` |

### 4.1 Reads and absent cases

| File | Used for | If absent |
|---|---|---|
| `research/<workstream>/RS-nn-*/findings.md` | Vendor facts with sources | `NEXT: use ow-research` for the open criteria; or the user supplies sources |
| `plans/<client>/map/future.md`, `systems/*.md` | Requirements and integrations | Asked; recorded as user-stated |
| `plans/<client>/contract-inputs.md` or the quick quote | Whether this job was sold (decision 4) | Inside a Build Plan, the plan's scope; for your own tools, nothing |
| The user's demo notes, vendor emails | Evidence (`shown`, `stated by vendor`) | — |
| `brand.yaml` | Export styling | Neutral |

## 5. Commercial method (decision 3)

### 5.1 Criteria and weights, frozen first

`-scope` freezes criteria, weights and must-haves before any vendor is named. A starter list the user edits: fit to the future process · integrations and API access · **data export and exit** · security basics (SSO, MFA, whether the vendor publishes an audit report) · support and service levels · cost over the horizon · vendor stability. A change after any score exists writes a dated revision in `scope.md` with its reason and the client's agreement, and every vendor is re-scored; the recommendation shows the revision.

### 5.2 Scores

0 = not met · 1 = met with a workaround · 2 = met · 3 = clearly better than needed. Each score cites evidence with its confidence (HIGH shown · MEDIUM stated · LOW inferred). A score resting only on LOW evidence is flagged in the report. Weighted totals and costs are computed with `ow-tools calc`, never by hand; without ow-tools they're marked "computed without ow-tools; check it". Prices are "as published on <date>" or "as quoted by the vendor on <date>"; your own fees never appear in `cost.md`.

### 5.3 Recommendation

One page: the decision and the recommended vendor; the runner-up and what would make it the better choice; knock-outs and why; the score table and cost; risks (lock-in, data export, contract term, price rises); what to confirm with the vendor before signing; and the conflicts statement (§6). The client decides; `-decide` records it even when it differs.

## 6. Conflicts (always)

`-scope` asks whether the user has any relationship with any vendor considered (partner programme, referral or affiliate fee, reseller margin, investment, a friend or former employer) and records the answer in `conflicts.md`. A vendor added later is asked about when it's added. The recommendation states the relationships, or "no relationships with the vendors considered (stated by <user> on <date>)". This can never be waived.

## 7. Formal mode (public procurement)

- **Before anything:** the user records that they are **not a bidder** on this procurement and declares conflicts; without both, `-formal` stops. The agency's rules on records, confidentiality and contact with bidders override anything here, and `scope.md` records which rules apply as the client states them.
- **Writes:** `requirements.md` (mandatory and desirable, numbered, in the agency's words where given), the agency's evaluation criteria and method exactly as provided (never invented or reweighted), `evaluation-workbook.xlsx` (blank, one sheet per evaluator, through ow-tools `export --xlsx`), `clarifications.md` (questions and the agency's published answers), and `response-map.md` (for each response, where it addresses each requirement, by page; no judgement of how well).
- **Never:** a score, a ranking, a shortlist, a pass or fail on a requirement, or a recommendation, in any file or draft. If asked, the skill says the panel decides and stops.

## 8. Self-checks

Each reports OK / FINDING / NOT-CHECKED(reason), labelled *same-session self-check: the same assistant applying a checklist; a discipline, not an independent review*. `-recommend` and `-formal` print NEXT only when none is FINDING. **"Conflicts disclosed", "Formal: no evaluation", "Not a bidder", "No credentials" and "No private names" can never be waived.**

| Check | Runs in | Passes when |
|---|---|---|
| Criteria first | `-score`, `-recommend` | Criteria and weights were frozen before the first vendor was named; any revision is dated, reasoned and agreed, and everything was re-scored |
| Evidence per score | `-score` | Every score cites evidence with its confidence; LOW-only scores are flagged |
| Numbers | `-score` | Totals and costs come from `ow-tools calc` (or are marked unchecked); every price has its date and source |
| Conflicts disclosed | `-scope`, `-recommend` | Every vendor considered has a recorded relationship answer; the report states them |
| Formal: no evaluation | `-formal` | No score, ranking, shortlist, pass/fail or recommendation anywhere under `formal/` |
| Not a bidder | `-formal` | The user's statement is recorded |
| No internal numbers | client outputs | No hours, rates or margins of yours |
| No credentials | every verb | No password, key or token; vendor trial logins never stored |
| No private names | every verb | No blocklisted name (`llc-ops`) and no private skill |

## 9. What this skill never does

Names a vendor before the criteria are frozen · scores without evidence · computes a total by hand without saying so · hides a relationship with a vendor · in formal mode, scores, ranks, shortlists or recommends · contacts a vendor (the user does) · stores a trial login.

## 10. Acceptance tests

- **Criteria first:** naming a vendor during `-scope` is refused until criteria are frozen; changing a weight after scoring forces a dated revision and a full re-score.
- **Knock-outs:** a vendor without data export, a must-have, is knocked out only on HIGH evidence; on LOW evidence it stays, flagged, with a vendor question added.
- **Scores:** a score with no evidence fails; totals match `ow-tools calc` output.
- **Cost:** a 3-year cost for 12 seats from a dated pricing page is computed and labelled with the date.
- **Conflicts:** a recommendation with an unanswered relationship question for one vendor fails; the stated "none" appears in the report.
- **Decision differs:** the client picks the runner-up; `decision.md` records it and the recommendation is unchanged.
- **Formal:** with "not a bidder" unrecorded, `-formal` stops; with it, the workbook is blank and `response-map.md` has page references only; a planted score fails "Formal: no evaluation".
- **Private names:** with an empty `handoffs.yaml`, no output names `llc-ops` or "Deftwright".
- **Real use:** one real tool selection for a Deftwright client or for Deftwright itself.

## 11. Amendments this needs in other designs (approve with this design)

| # | Design | Amendment |
|---|---|---|
| P6 | `ow-build-plan` | `price-book.yaml` gains `vendor_selection: { sizes: { S, M, L }, size_by_vendors: {…} }`; `-quote --quick --vendor-eval` writes the scope (§4's steps, the vendors to compare) and a fixed-fee quote, and `--signed` prints `NEXT: use ow-vendor-eval-scope`. Like a feasibility quote (ow-build-plan amendment of 2026-10-16), it carries no user acceptance testing line, fix window, documentation & training line or build hand-off; its scope goes in `quick-scope.md`. Inside a Build Plan, a selection work package prints the same NEXT, and `-map` reads `vendor-eval/<client>/VE-nn-*/decision.md` into the systems inventory |
| S2 | `ow-start` | An `offers.md` path may carry `quote: vendor-eval`; the recap header passes it on so ow-build-plan's quick quote uses the selection line |
| D2 | `ow-draft` | Its reads row names `vendor-eval/<workstream>/VE-nn-<slug>/recommendation.md` |

## 12. Open questions

None at drafting; every question was decided as 1–4.
