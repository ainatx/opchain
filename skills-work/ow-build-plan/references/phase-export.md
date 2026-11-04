# Phase: export (`/ow-build-plan-export`)

Keep to `references/ow-protocol.md`. Read first from the CRM: the recap, map and scope documents, `acceptance_criteria` and the proposal (`quotes`), so a person's edits flow in. Publish the plan as document `build_plan` (client, no price); prices stay on the proposal. Never overwrite a version a person edited: write yours beside it and say so. Markdown is the source of truth; the PDF and Word files are generated from it and never edited and read back.

## 1. Assemble `build-plan.md` (Build Plan mode)

Read the map, `scope.md`, `acceptance.md`, `risks.md`, `plan.yaml` and `offers.md` (`ownership`). Write `plans/<client>/build-plan.md`: `written_by: ow-build-plan 2.0.1` and `created`, then one H1 and these sections in order:

| Section | From |
|---|---|
| `## Summary` | the problem and the recommended change, five sentences |
| `## How it works today` | `map/current.md` |
| `## What should change` | `map/future.md` |
| `## Who does what` | `map/roles.md` |
| `## Systems and data` | `map/systems.md`, `map/data.md` |
| `## Scope` | the work packages |
| `## Out of scope` | never empty |
| `## Acceptance checks` | `acceptance.md`, every check |
| `## Risks` | each with likelihood, impact, mitigation and owner |
| `## Assumptions and client dependencies` | `scope.md` |
| `## Ownership` | `offers.md` `ownership`; with none, ask the user and record it `user-stated` |
| `## Open questions` | every remaining UNKNOWN, with who can answer |

Client voice: no confidence labels, evidence ids, quotes or tool words; leave out every working-file header. Process steps stay numbered lists; an image needs alt text. Quick mode has no plan: the client documents are `quick-scope.md` and `quote.md`. A whole-project quote with no plan yet exports `quote.md` alone; the Build Plan follows its first phase.

## 2. Before it goes out, check: builder-neutral

`build-plan.md` names:

- none of the user's prices, fees or rates, and no amount from `price-book.yaml` or `quote.md`. The client's own figures stay: volumes, times and what today's process costs them (the cost of a miss the map records) are facts about the client, not a price;
- no tool, service or method that is only the user's own (from `profile.md`, `offers.md` or `price-book.yaml`: their business name, unit ids and labels);
- no wording from these skills: no `ow-` name, no "opchain", no check names and no tool words (checkpoint, evaluator, rubric, gate);
- a technology only where the client's systems require it.

Fix each line that fails, in `build-plan.md` or the file it came from. The user may say to go ahead regardless; note that in the report.

## 3. Export

For `build-plan.md` and `quote.md` (quick mode: `quick-scope.md` and `quote.md`): run `ow-tools export <file> --out plans/<client>/export/`. ow-tools removes the header and everything between the `ow:internal` markers (the quote's internal appendix), checks the structure and writes `<name>.pdf` and `<name>.docx`. Exit 3: say which requirement is missing and print the Markdown instead. Exit 4: show the reason, fix the Markdown, run again. If ow-tools is not installed, say so once and print the finished Markdown of each document without its header and without everything between the `ow:internal` markers (never the quote's internal appendix). Exporting a quote marks it sent for the money rule (`references/phase-quote.md` §1) unless the user says it is still a draft.

## 4. `export/export-report.md`

`written_by: ow-build-plan 2.0.1` and `created`, then: what the builder-neutral check found, whether the user went ahead regardless, and for each document either the ow-tools command and its raw report (hashes as reported, with its own wording) or "not generated here: the ow-tools add-on is not installed". It states: structure checked in the source this tool generated; this is not a conformance test.

## 5. STATUS and what comes next

In the cache, a plain `STATUS.md` line is enough: `<date> | ow-build-plan 2.0.1 | plans/<client>/export/export-report.md | client's answer by <valid_until>; Build Plan credit by <credit_deadline>` (quick mode, a whole-project quote, or a plan with `fee: none`: `client's answer by <valid_until>`). Remind the user to ask the client to remove any read-only access the plan used (the access log in `evidence.md`), and suggest a calendar reminder for the validity date, and one for the credit deadline when the quote has one. When the client accepts: `/ow-build-plan-quote --accepted <date>`. Nothing is sent: the user sends the documents.
