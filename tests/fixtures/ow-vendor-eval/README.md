# ow-vendor-eval acceptance fixtures

Everything here is **invented**: the fictional clients Larkspur Ceramics (continued from ow-build-plan's `selection-scope` and ow-research's `run-vendor-eval`) and Hollowbrook Bakery (continued from ow-start's `hollowbrook-vendor-selection` and ow-build-plan's `vendor-selection-signed`), the consultant "Robin" of "Example Studio" choosing its own proposal tool (`business`), the invented Town of Elmridge and its RFP, invented vendors and bidders, and other workstreams for the other-client rule (Fernhill Florists, Mossgate Books, the one-word client Bloom, and `research/frameworks/`). No real price, vendor, product, agency, client or person belongs in this folder. Files that plant an instruction to the assistant, a credential or another client's name say so in their answer keys.

These are the acceptance tests from `docs/plans/2026-10-16-ow-vendor-eval-design.md` §10 and the OW-11 contract (`sprints/release-2.1/ow-11/contract.md`, C1 to C32), checked by `scripts/ow-vendor-eval-acceptance.mjs`. "Real use" (one real tool selection) is graded in REL-02.

## Layout of a case

| Folder or file | Holds |
|---|---|
| `input/` | Files the case adds to its starting state (`opchain-work/…`): the user's `inbox/` files, a variant of a file for a refusal |
| `session/turns.md` | What the user answered in the session, one `- ` line per answer, in the order the screen asked |
| `expected/` | The golden run: what the run wrote under `opchain-work/`, and `printed.md`, the screen |
| `answer-key.yaml` | `key` (the step-table key), `base:` (the case it continues), `world:`, `plan_case:` (an ow-build-plan golden), `research_case:` (an ow-research golden), `run:` (grade another case's run, for a route cell), `checks` and what each expects |
| `worlds/workspace/` | The profile (with a `banner_text`), the price book (ow-build-plan's, with two units of the business's own: 480 and 300), and the other workstreams |
| `d2-reads-row.yaml` | ow-draft's D2 reads row, pinned from OW-10's branch with its digest |
| `trigger-queries.yaml` | The should-trigger and should-not-trigger prompts |

A case's starting state is layered, newest first: its own `input/` and `session/`, each earlier case down its `base:` chain, the worlds, then the ow-build-plan and ow-research golden runs the chain names. A case named `<case>--cut-<step>` is that case's run cut off after `<step>` (C22): its `input/` holds the files as they stood, with `## Runs` up to that step.

## Checking a real run

```bash
node scripts/ow-vendor-eval-acceptance.mjs --prepare scope-larkspur /path/to/empty-folder
```

Attach the folder in a session where ow-vendor-eval is installed, run the case's key, answer as its `session/turns.md` says, save the screen as `printed.md` and your answers as `session/turns.md`, then:

```bash
node scripts/ow-vendor-eval-acceptance.mjs scope-larkspur /path/to/empty-folder
```

A real run is read by difference: a file counts as written when it is new or differs from the starting state. With no arguments, the script checks every golden run (what `tests/ow-vendor-eval-acceptance.test.js` does in `npm test`).

## The cases

| Case | What it grades |
|---|---|
| `scope-larkspur` | C6 commercial scope inside a Build Plan; C4 ow-build-plan selection-package route (no evaluation); C24 sources 9 and 13 |
| `longlist-larkspur` | C9 longlist and knock-outs (HIGH out, LOW flagged); C8 relationship per vendor |
| `evidence-larkspur-tallowmere` | C10 evidence from findings, shown, stated by reference, stated by vendor; C20 another client in a reference; C24 sources 6 and 7 |
| `evidence-larkspur-brackenfold` | C9 flagged must-have gets a VQ; C10; C24 source 3 (a vendor email) |
| `score-larkspur` | C11 scores with evidence; C12 totals equal calc; C13 cost from dated prices |
| `recommend-larkspur` | C14 recommendation (D2 sections); C8 the none line; C18 NEXT only with no FINDING |
| `decide-larkspur` | C15 decision (the recommended vendor); P6 map NEXT |
| `scope-hollowbrook` | C6 commercial scope from a vendor-selection quick quote; C4 the signed quick-scope route (no evaluation); C7 names held to -longlist; C24 source 14 |
| `longlist-hollowbrook` | C9 longlist from the quick scope's client-suggested names; C24 source 8 |
| `evidence-hollowbrook-pennyroyal` | C10 evidence for Pennyroyal Book; shown from the user's demo notes; C24 source 4 |
| `evidence-hollowbrook-sallowmere` | C10 evidence for Sallowmere Bookings; a vendor-written recap is stated by vendor; C24 source 5 |
| `evidence-hollowbrook-thistledown` | C10 evidence for Thistledown Slots |
| `evidence-hollowbrook-wrenfold` | C10 evidence for Wrenfold Reserve; C20 a trial login never stored |
| `score-hollowbrook` | C11; C12; C13 a 3-year cost for 12 seats from dated prices |
| `recommend-hollowbrook` | C14 recommendation; C8 the none line |
| `decide-hollowbrook-runner-up` | Design §10 Decision differs; C15 |
| `scope-business` | C6 the business path; C8 the general declaration with an amount kept internal |
| `longlist-business` | C8 a vendor with a relationship (referral fee); C9 |
| `evidence-business-harrowgate` | C10 |
| `evidence-business-linnet` | C19 a vendor price equal to ours by value, asked and answered; C8 a vendor's word is not the answer |
| `score-business` | C11–C13; C8 every vendor has its answer at -score |
| `recommend-business-finding` | C18 a FINDING: no export, no NEXT; C8 the relationship stated by vendor and kind; C19 our referral fee by value |
| `waive-business` | C18 a per-figure waiver, then export; C19 |
| `scope-formal` | C5 the mode first; C16 not a bidder, conflicts, agency rules |
| `formal-elmridge` | Design §10 Formal; C16; C17 the blank workbook; C24 source 10 |
| `clarification-elmridge` | C16 clarifications; C24 source 12 |
| `responses-elmridge` | Design §10 Formal (page references only); C16; O14 bidders' relationships; C24 sources 11, 15 |
| `scope-larkspur--cut-mode` | C22 resume: /ow-vendor-eval-scope (commercial) cut after mode |
| `scope-larkspur--cut-decision` | C22 resume: /ow-vendor-eval-scope (commercial) cut after decision |
| `scope-larkspur--cut-requirements` | C22 resume: /ow-vendor-eval-scope (commercial) cut after requirements |
| `scope-larkspur--cut-criteria` | C22 resume: /ow-vendor-eval-scope (commercial) cut after criteria |
| `scope-larkspur--cut-agree` | C22 resume: /ow-vendor-eval-scope (commercial) cut after agree |
| `scope-larkspur--cut-write` | C22 resume: /ow-vendor-eval-scope (commercial) cut after write |
| `scope-larkspur--cut-conflicts` | C22 resume: /ow-vendor-eval-scope (commercial) cut after conflicts |
| `scope-formal--cut-mode` | C22 resume: /ow-vendor-eval-scope (formal) cut after mode |
| `scope-formal--cut-bidder` | C22 resume: /ow-vendor-eval-scope (formal) cut after bidder |
| `scope-formal--cut-conflicts` | C22 resume: /ow-vendor-eval-scope (formal) cut after conflicts |
| `scope-formal--cut-rules` | C22 resume: /ow-vendor-eval-scope (formal) cut after rules |
| `scope-formal--cut-write` | C22 resume: /ow-vendor-eval-scope (formal) cut after write |
| `longlist-larkspur--cut-sources` | C22 resume: /ow-vendor-eval-longlist cut after sources |
| `longlist-larkspur--cut-candidates` | C22 resume: /ow-vendor-eval-longlist cut after candidates |
| `longlist-larkspur--cut-relationships` | C22 resume: /ow-vendor-eval-longlist cut after relationships |
| `longlist-larkspur--cut-knockouts` | C22 resume: /ow-vendor-eval-longlist cut after knockouts |
| `evidence-larkspur-tallowmere--cut-sources` | C22 resume: /ow-vendor-eval-evidence <vendor> (tallowmere) cut after sources |
| `evidence-larkspur-tallowmere--cut-facts` | C22 resume: /ow-vendor-eval-evidence <vendor> (tallowmere) cut after facts |
| `evidence-larkspur-tallowmere--cut-questions` | C22 resume: /ow-vendor-eval-evidence <vendor> (tallowmere) cut after questions |
| `evidence-larkspur-tallowmere--cut-checks` | C22 resume: /ow-vendor-eval-evidence <vendor> (tallowmere) cut after checks |
| `score-larkspur--cut-gate` | C22 resume: /ow-vendor-eval-score cut after gate |
| `score-larkspur--cut-scores` | C22 resume: /ow-vendor-eval-score cut after scores |
| `score-larkspur--cut-totals` | C22 resume: /ow-vendor-eval-score cut after totals |
| `score-larkspur--cut-cost` | C22 resume: /ow-vendor-eval-score cut after cost |
| `score-larkspur--cut-checks` | C22 resume: /ow-vendor-eval-score cut after checks |
| `recommend-larkspur--cut-gate` | C22 resume: /ow-vendor-eval-recommend cut after gate |
| `recommend-larkspur--cut-write` | C22 resume: /ow-vendor-eval-recommend cut after write |
| `recommend-larkspur--cut-checks` | C22 resume: /ow-vendor-eval-recommend cut after checks |
| `recommend-larkspur--cut-export` | C22 resume: /ow-vendor-eval-recommend cut after export |
| `decide-larkspur--cut-record` | C22 resume: /ow-vendor-eval-decide <vendor> (tallowmere) cut after record |
| `formal-elmridge--cut-gate` | C22 resume: /ow-vendor-eval-formal cut after gate |
| `formal-elmridge--cut-requirements` | C22 resume: /ow-vendor-eval-formal cut after requirements |
| `formal-elmridge--cut-workbook` | C22 resume: /ow-vendor-eval-formal cut after workbook |
| `formal-elmridge--cut-export` | C22 resume: /ow-vendor-eval-formal cut after export |
| `clarification-elmridge--cut-record` | C22 resume: /ow-vendor-eval-formal --clarification cut after record |
| `responses-elmridge--cut-relationships` | C22 resume: /ow-vendor-eval-formal --responses cut after relationships |
| `responses-elmridge--cut-map` | C22 resume: /ow-vendor-eval-formal --responses cut after map |
| `responses-elmridge--cut-checks` | C22 resume: /ow-vendor-eval-formal --responses cut after checks |
| `waive-business--cut-waive` | C22 resume: /ow-vendor-eval-recommend --waive cut after waive |
| `waive-business--cut-checks` | C22 resume: /ow-vendor-eval-recommend --waive cut after checks |
| `waive-business--cut-export` | C22 resume: /ow-vendor-eval-recommend --waive cut after export |
| `route-research-no-evaluation` | C4 ow-research route: no evaluation (refuse; -scope NEXT) |
| `route-research-not-frozen` | C4 ow-research route: scope not frozen (refuse) |
| `route-research-no-longlist` | C4 ow-research route: frozen, no longlist (refuse; -longlist NEXT) |
| `route-research-longlist` | C4 ow-research route: longlist written (ask which vendors the findings cover) |
| `route-research-after-scores` | C4 ow-research route: after scores (ask; facts added make the next -score a re-score) |
| `route-research-several` | C4 ow-research route: several open evaluations (ask which VE-nn) |
| `route-research-after-recommendation` | C4 ow-research route: after the recommendation (refuse; O6) |
| `route-research-again` | C4 ow-research route: the same findings again (no duplicate VF-nn) |
| `route-research-other-client` | C4 ow-research route: another client's topic (refuse) |
| `route-research-finding-open` | C4 ow-research route: a self-check FINDING in the topic (refuse) |
| `route-research-formal` | C4 ow-research route: formal (refuse) |
| `route-quick-scope-frozen` | C4 quick-scope route: a scope already frozen (no-op naming it) |
| `route-quick-scope-not-accepted` | C4 quick-scope route: a quote not yet accepted (refuse) |
| `route-plan-decided` | C4 plan route: a decision already recorded (no-op; -map NEXT) |
| `route-plan-two-packages` | C4 plan route: two selection packages (ask which) |
| `route-folder-scoped` | C4 folder route: scoped → longlist |
| `route-folder-longlisted` | C4 folder route: longlisted → evidence tallowmere |
| `route-folder-evidence` | C4 folder route: evidence → score |
| `route-folder-scored` | C4 folder route: scored → recommend |
| `route-folder-recommended` | C4 folder route: recommended, awaiting the client's choice |
| `route-folder-decided` | C4 folder route: decided |
| `route-folder-formal` | C4 folder route: formal → -formal |
| `route-folder-formal-materials` | C4 folder route: formal materials → --responses |
| `route-folder-several` | C4 folder route: several evaluations (ask) |
| `list-welcome` | C4 /ow-vendor-eval: no evaluations (welcome) |
| `list-evaluations` | C4 /ow-vendor-eval list (re-run golden for a one-step key) |
| `scope-again` | C4 -scope: frozen (no-op) |
| `scope-vendor-named` | C7 a vendor named before the freeze (refuse that line; name not written) |
| `scope-weights-99` | C6 weights not summing to 100 (ask again) |
| `scope-no-agreement` | C6 no client agreement (stays unfrozen); C21 a decline |
| `revise-larkspur` | C7 --revise after scores (dated, reasoned, agreed) |
| `score-after-revision` | C7 re-score after a revision; C22 a re-score is appended |
| `revise-refused` | C7 --revise after the recommendation (refuse; O6) |
| `scope-supersedes` | O6 a change after the export is a new evaluation (supersedes: VE-01) |
| `decide-superseded-refused` | O6 -decide on the superseded evaluation (refuse) |
| `longlist-no-scope` | C4 -longlist: no scope (refuse) |
| `longlist-ask` | C4 -longlist: a vendor with no relationship answer (ask) |
| `longlist-add` | C4 -longlist run again with a new vendor (appended, asked) |
| `evidence-not-on-longlist` | C4 -evidence: a vendor not on the longlist (refuse) |
| `evidence-knocked-out` | C4 -evidence: a knocked-out vendor (refuse) |
| `evidence-no-source` | C4 -evidence: no research and no user source (use ow-research) |
| `score-missing-evidence` | C4 -score: a vendor without evidence (refuse, name it) |
| `score-no-relationship` | C4 -score: a relationship answer missing (refuse) |
| `score-again` | C4 -score: run again unchanged (no-op) |
| `score-no-tools` | C4 -score: no ow-tools (marked unchecked); C12; C13 |
| `recommend-no-tools` | C4 -recommend: no ow-tools (client form in export/markdown/) |
| `recommend-again` | C4 -recommend: already written (no-op) |
| `waive-refused-conflicts` | C18 a waiver of a never-waived check (refuse) |
| `waive-refused-no-figure` | C18 a waiver with no figure (refuse) |
| `recommend-handling` | C4 -recommend: a handling level (bannered export); C25 the union |
| `decide-no-recommendation` | C4 -decide: no recommendation (refuse) |
| `decide-again` | C4 -decide: already decided (no-op) |
| `decide-other-refused` | C4 -decide: a different vendor after a decision (refuse) |
| `decide-relayed-refused` | C21 a decision per the vendor's email (refuse) |
| `decide-knocked-out` | C4 -decide: a knocked-out vendor (ask the reason; recorded) |
| `formal-commercial-refused` | C5 -formal in commercial mode (refuse) |
| `formal-longlist-refused` | C5 /ow-vendor-eval-longlist in formal mode (refuse: the panel decides) |
| `formal-evidence-refused` | C5 /ow-vendor-eval-evidence <vendor> in formal mode (refuse: the panel decides) |
| `formal-score-refused` | C5 /ow-vendor-eval-score in formal mode (refuse: the panel decides) |
| `formal-recommend-refused` | C5 /ow-vendor-eval-recommend in formal mode (refuse: the panel decides) |
| `formal-decide-refused` | C5 /ow-vendor-eval-decide <vendor> in formal mode (refuse: the panel decides) |
| `formal-rank-refused` | C4 -formal: asked to rank (refuse: the panel decides) |
| `formal-no-bidder` | C4 -formal: no not-a-bidder statement (refuse) |
| `formal-no-conflicts` | C4 -formal: no conflicts answer (refuse) |
| `formal-no-tools` | C4 -formal: no ow-tools (CSVs only); C17 |
| `evidence-injected-findings` | C24 source 1 (a findings claim, not imported) and source 2 (a findings source line) |
| `evidence-stale` | C4 ow-research route: a superseded F-nn (stale, named); C10 a correction is a new id |
