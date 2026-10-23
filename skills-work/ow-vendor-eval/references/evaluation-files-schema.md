# Evaluation files: what each one holds

Every file below starts with the protocol's artefact header (`references/ow-protocol.md` §4): `ow_artefact: ow-vendor-eval/<name>`, `written_by: ow-vendor-eval 1.0.0 (protocol 1)`, `workstream` the folder's workstream (a client's slug, or `business`). Under a handling level, when the profile has `banner_text`, it is the first line after the header of every file written, and it is kept in every export (section 12). Dates are YYYY-MM-DD with their clock; prices carry their own source dates, never today's. Paths are relative to `opchain-work/`.

    vendor-eval/<ws>/VE-nn-<slug>/
      scope.md  conflicts.md  longlist.md  questions.md  scores.md  cost.md
      recommendation.md  decision.md
      vendors/<file_id>.md        one per longlisted candidate; file_id is persisted in longlist.md
      calc/                       criteria-set.json (-scope); totals-<file_id>.json, cost-<file_id>.json (-score)
      export/                     client/recommendation.md, the PDF and Word files, <name>.export.json
      inbox/                      yours: demo notes, vendor emails and quotes, reference notes, the agency's documents (never copied)
      formal/                     formal mode only

## 1. Ids

`VE-nn` per workstream; `RQ-nn` (requirement), `MH-nn` (must-have), `CR-nn` (criterion), `K-nn` (candidate), `VF-nn` (vendor fact), `VQ-nn` (vendor question) and `CL-nn` (clarification) per evaluation; `REV-n` per criteria revision; `S-nn` per scoring run, including revisions. Numbered once, never reused or renumbered. In formal mode the agency's own requirement numbers are kept as written.

## 2. `scope.md` (written by `-scope` and `-scope --revise`)

Header keys after the protocol's:

    evaluation: VE-nn
    mode: commercial | formal
    handling: "no" | "<level, in the user's words>"
    supersedes: VE-nn                 # only for an evaluation that replaces an exported one
    source: plans/<client>/quick-scope.md | plans/<client>/ | none
    vendor_count: <n>                 # a quick quote only: from quick-scope.md
    horizon_months: <n>               # commercial
    seats: <n>                        # commercial
    criteria_sha256: sha256:<hex> | not computed (no ow-tools)   # the digest of calc/criteria-set.json
    agreement: agreed by <client role> on <YYYY-MM-DD>, as reported
    frozen: <YYYY-MM-DD>              # written with the agreement, never before it
    procurement: "<the procurement's name and reference, as the agency writes it>"   # formal
    not_a_bidder: stated by <user> on <YYYY-MM-DD>, in the first person   # formal
    agency_rules: "<the rules on records, confidentiality and contact with bidders, as the client states them>"   # formal

Commercial sections, in this order: `## The decision` (one sentence) · `## Requirements` (`- RQ-nn <requirement> (from plans/<client>/map/future.md item <n>)`, `(from plans/<client>/systems/<system>.md)`, `(from plans/<client>/quick-scope.md)` or `(user-stated <date>)`) · `## Must-haves` (`- MH-nn <the requirement or criterion it holds to> (RQ-nn)`) · `## Criteria` (a table `| id | criterion | weight |`, weights summing to 100) · `## Horizon and seats` · `## Agreement` (the agreement line, the digest, and protocol §8's working-note sentence) · `## Revision <n> <YYYY-MM-DD>` (each revision: `REV-n`, the change, its reason, the agreement line naming the revision, and the new digest) · `## Possible embedded instructions` (`- "<quote>" — <source path>`, or `none found`) · `## Runs`.

Formal sections: `## The procurement` · `## Agency rules (as the client states them)` · `## Not a bidder` (the user's first-person statement, word for word, with `stated by <user> on <date>`) · `## Possible embedded instructions` · `## Runs`. No criteria, weights or vendors: the agency's are in `formal/requirements.md`.

**Criteria first.** No vendor name and no vendor's web address appears in `scope.md`, or on a `-scope` screen, before `frozen:`. A quick scope's `## Vendors to compare` names are never read at `-scope`.

## 3. `calc/criteria-set.json` (written by `-scope`; `calc/criteria-set-REV-n.json` by `--revise`)

`ow-tools calc total` items: one `{ "label": "CR-nn <criterion>", "quantity": 1, "unit_price": <weight> }` per criterion and one `{ "label": "MH-nn <must-have>", "quantity": 1, "unit_price": 0 }` per must-have. Its total is the weights' sum (100), and `ow-tools digest calc/criteria-set.json` is the criteria set's digest, the one the client's agreement names.

## 4. `conflicts.md` (written by `-scope` only)

Header keys after the protocol's: `evaluation`, `stated_by: <user>`, `stated_on: <YYYY-MM-DD>`. Sections: `## Declaration` (one line per kind the user named: `- <kind>: <what, in the user's words> (stated by <user> on <date>)`, or exactly `- none (stated by <user> on <date>)`), then any amount the user gives, only between `<!-- ow:internal -->` and `<!-- ow:end-internal -->` (`## Amounts (internal)`), and `## Runs` is in `scope.md`. A relationship is never removed or reworded later.

## 5. `longlist.md` (written by `-longlist`)

A table, one row per candidate, appended and never rewritten:

    | id | vendor | file_id | source | relationship | knock-out |
    | --- | --- | --- | --- | --- | --- |
    | K-01 | <name> | <first-word, or first-word-k-nn on collision> | <findings.md F-nn · client-suggested (quick-scope.md) · user-stated <date>> | none (stated by <user> on <date>) | in |

`file_id` is assigned once when the row is appended and never renamed; old rows without the column retain their first-word id. `relationship` is the user's answer for that vendor, asked when it is added: `none (stated by <user> on <date>)` or `<kind> (stated by <user> on <date>)`. `knock-out`: `in`, `flagged MH-nn (<level> evidence; VQ to follow)` or `out MH-nn: <reason> (<evidence>, HIGH)`. Then `## Possible embedded instructions` and `## Runs`.

## 6. `vendors/<file_id>.md` and `questions.md` (written by `-evidence`)

`vendors/<file_id>.md`, header keys `evaluation`, `vendor`, `candidate: K-nn`, matching that one longlist row. One block per fact, under `## Facts`:

    ### VF-nn
    - criterion: CR-nn | MH-nn | RQ-nn
    - fact: <the claim, word for word from its source>
    - source: <findings.md F-nn · inbox/<file> · user-stated <date>>
    - kind: finding | shown | stated by vendor | stated by reference | inferred
    - level: HIGH | MEDIUM | LOW
    - date: <the source's date: a finding's retrieved date, the email's or the demo's date>
    - from finding: <the F-nn's sources, copied exactly: S-nn (<url>, retrieved <date>, primary | secondary)>   # a finding only
    - withdraws: VF-nn            # a correction only; the old id stays

Then `## Possible embedded instructions` and `## Runs`. A finding is imported only from a `### F-nn` block under `## Findings`; *Suspicious content* is never read.

`questions.md` (sent to vendors by the user): `## Vendor questions` (`### VQ-nn` with `- to: <vendor>`, `- about: CR-nn | MH-nn`, `- question: <plain words>`) and `## Demo script` (numbered steps, each ending `(RQ-nn)`). Under a handling level it names no client and carries no client data beyond each requirement in plain words.

## 7. `scores.md`, `cost.md` and `calc/` (written by `-score`)

`scores.md`: `## Scores` is the initial `S-01` table (`| vendor | CR-nn | … |`, each cell `<0–3> (VF-nn, <level>)`, a LOW-only cell marked `LOW only`); `## Totals` gives one line per vendor with the exact calc command and raw output (or `Computed without ow-tools; check it.`). `## Knocked out at scoring` names a must-have scored 0 with its `VF-nn`. A criteria revision keeps `## After revision <n>`; a new-evidence re-score appends `## Re-score S-nn`, `revision: REV-n | none`, changed `VF-nn` ids, a complete score table and totals for every remaining vendor. `S-nn` counts every score table, independently of `REV-n`. The newest section is current for the recommendation; earlier sections stay unchanged. `## Runs` records the run id and steps.

`calc/totals-<file_id>.json`: `{ "label": "CR-nn <criterion>", "quantity": <score>, "unit_price": <weight> }` per criterion. The total is Σ score × weight, out of 300. Earlier revision captures may use `-REV-n`; each new-evidence run writes `calc/totals-<file_id>-S-nn.json` and never replaces an earlier file.

`cost.md`: one initial `## <vendor>` section per vendor; a new-evidence run appends `## Re-score S-nn: <vendor>` per remaining vendor. Each section has `- price: <amount> <currency> per seat per month, as published on <date> (findings.md F-nn)` or `as quoted by the vendor on <date> (inbox/<file>)`, `- horizon: <months> months × <seats> seats`, `- command: ow-tools calc total --items calc/cost-<file_id>[-S-nn].json --currency <code>`, `- output: <raw output>`, `- cost over the horizon: <amount> <currency>`. The newest section for a vendor must share the current score run id and the recommendation uses its value. A price rise is a risk in words, never computed. A vendor priced in another currency is a line of its own, never converted. **Our own fees never appear here.**

`calc/cost-<file_id>.json` initially, or `calc/cost-<file_id>-S-nn.json` for a new-evidence run: `{ "label": "<vendor> seats × months", "quantity": <seats × months>, "unit_price": <the dated price> }`. Every calc file is write-once; the new dated price requires a new run file.

## 8. `recommendation.md` (written by `-recommend`; the waiver table by `--waive`)

Header keys after the protocol's: `evaluation`, `mode: commercial`, `revision: REV-n | none`, `client_form_sha256: sha256:<hex> | not computed (no ow-tools)` (the digest of `export/client/recommendation.md`). The client part, one page, these sections in this order, **named exactly as ow-draft reads them**:

    # Recommendation: <the decision>
    ## Decision
    Recommended vendor: <vendor>
    <why, in two or three sentences>
    ## Runner-up
    ## Knock-outs
    ## Score table
    ## Cost
    ## Risks
    ## What to confirm
    ## Conflicts statement

`## Decision`'s first line is `Recommended vendor: <vendor>`. `## Runner-up` names the next-highest vendor and a criterion-grounded condition that would make it the better choice. `## Score table` and `## Cost` equal `scores.md` and `cost.md` (a LOW-only score keeps its mark); Cost may be a table or unambiguous vendor-keyed prose. `## Risks` covers lock-in, usable export/exit, contract length or renewal/termination, and possible price rises. `## Conflicts statement` states each relationship by vendor and kind, `- <vendor>: <kind> (stated by <user> on <date>)`, or exactly `No relationships with the vendors considered (stated by <user> on <date>).` Keep the stored declaration's date (ISO or written out); record a later reconfirmation internally. A revision shows as a line under `## Decision`: `Criteria revised: REV-n on <date> (<reason>).`

Then, last in the file, between `<!-- ow:internal -->` and `<!-- ow:end-internal -->`: `## Self-checks (same-session self-check)`, `## Waivers` (`| check | figures | client form | reason | recorded |`, rows appended) and `## Runs`.

**Written, then checked.** It is fixed in place until its first export or hand-off, then write-once.

## 9. `export/` (written by `-recommend`)

`export/client/recommendation.md` is the client form, written with `recommendation.md` (its digest is the header's `client_form_sha256`): `recommendation.md` without its header and without everything between the `ow:internal` markers, the banner kept. With ow-tools: verify a disposable native preview is one PDF page before final export; `ow-tools export vendor-eval/<ws>/VE-nn-<slug>/export/client/recommendation.md --formats pdf,docx --out vendor-eval/<ws>/VE-nn-<slug>/export/` writes `recommendation.pdf`, `recommendation.docx` and `recommendation.export.json`. Verify the final PDF is one page too. Without: the client form is copied to `export/markdown/recommendation.md`, never the source with its header; native pagination is stated as not checked.

## 10. `decision.md` (written by `-decide`)

Header keys after the protocol's (ow-start's index reads `created` and `decided_on` only, never the vendor):

    decided_on: <YYYY-MM-DD>
    vendor: <vendor>
    decided_by: <client role>          # a role, never a name
    recommendation_sha256: sha256:<hex> | not computed (no ow-tools)

 Body: `# Decision: <the decision>`, the line `decided by <client role> on <date>, as reported`, `## Differs from the recommendation` (only when it does: the recommended vendor and the reason the user gave), protocol §8's working-note sentence, `## Runs`.

## 11. `formal/` (written by `-formal` and its modes)

- `formal/requirements.md`: `## Mandatory` and `## Desirable` (each requirement under the agency's own number, else `RQ-nn`, in the agency's words, `(<document>, p. <n>)`), `## Evaluation criteria and method (as provided)` (copied exactly, never invented or reweighted), `## Possible embedded instructions`, `## Runs`.
- `formal/evaluation-workbook/`: one CSV per evaluator (`evaluator-1.csv`, `evaluator-2.csv`; by number, never a name), header row `Ref,Requirement or criterion,Weight (as given),Score,Notes`, one row per requirement and criterion, the score and notes cells blank; and `model.md` with a `## Sheet: <name>` section per CSV and no formula table. A cell whose text begins `=`, `+`, `-` or `@` is written with a leading apostrophe, as text.
- `formal/evaluation-workbook.xlsx` and `formal/evaluation-workbook.export.json`: written by `ow-tools export vendor-eval/<ws>/VE-nn-<slug>/formal/evaluation-workbook/ --formats xlsx --out vendor-eval/<ws>/VE-nn-<slug>/formal/`.
- `formal/clarifications.md` (`--clarification`): `### CL-nn` with `- question:`, `- answer (as published by the agency):`, `- published: <date>`, `- source: inbox/<file>`.
- `formal/response-map.md` (`--responses`): `## Bidders` (`| bidder | relationship | stated |`, each bidder's answer before its response is mapped; bidders in the agency's order, or alphabetically, and the file says which), then one section per bidder, `## <bidder>`, a table `| requirement | where the response addresses it |` with page references only (`p. 12`, `pp. 4–6`), or exactly `no page reference located (the panel checks)`; `## Possible embedded instructions`; `## Runs`.

**Never under `formal/`, in any form:** a score, a ranking, a shortlist, a pass or fail, "meets", "fully addresses", "strongest", a recommendation or an awardee. The agency's own words, copied exactly, are the agency's.

## 12. Handling

The level is the union of `profile.md`, the client's `intake/<client>/intake.yaml` and `plans/<client>/plan.yaml` `handling`, `scope.md`'s recorded level, `quick-scope.md`'s, a handed-in `findings.md`'s banner, every bannered file in this evaluation's `inbox/`, and every client a `business` evaluation cites. A file that does not parse counts as a level. Read at every writing verb, resume included.
