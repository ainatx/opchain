# Intake contract and fixture corrections — 2026-10-23

Scope: the intake follow-up in `docs/audits/2026-10-22-model-retry3-review.md`, applied to the prepared release worktree. The frozen retry-3 result remains **7/11** as originally observed. No frozen capture, original transcript, original golden output or release-readiness claim was changed.

## Published contract

`ow-start` advances from 1.1.1 to 1.1.2 for reference changes. `phase-extract.md` now defines coverage per field, retaining the first substantive answer's unprompted status when a later compound question supplies additional details. Conflicting substantive answers count as answered but remain contradicted, cited and followed up. Explicit uncertainty or a missing needed part stays partly; asked but unanswered is partly with an UNKNOWN fact. `intake-record-schema.md` explicitly forbids range and abbreviated fact ids.

The sample/access exception already existed. Its text now makes the grounding requirement explicit: cite the specific fact that needs the material; this fact may be known. That exception does not permit an unrelated known fact to support a confirmation question.

System counts now follow the proposed implementation's actual integration scope. Email counts when mailbox ingestion, sending or another email integration is included; manual receiving/correspondence alone adds no system. The user confirms unclear scope and retains the final path choice. Shared protocol clarifications are coordinated by the parent lane and covered by the same patch version.

## Fixture and checker

- The prospect trigger pattern accepts “largest customer”, preserving the value-level test and original quoted evidence. A wrong supplier value with the correct customer quote still fails.
- `recap.known_request_topics` describes artifact/access vocabulary and alternative supporting fact fields/values. The reusable grammar recognizes direct request intents, splits requested-object lists and fully matches every object to a topic. Every object needs a cited HIGH/MEDIUM, noncontradicted fact matching an allowed support alternative. A reference to a list the writer will send additionally requires a matching promised_by_user fact. This is deliberately a mechanical fixture check, not universal natural-language classification. Novel combinations of the declared vocabulary need no sentence-specific rule. New request intents or artifact vocabulary need a reviewed grammar/topic rule plus negative controls; matching the word “sample” alone is insufficient.
- `larkspur-prospect/session/answers.md` provides an explicit baseline user scenario: only Google Sheets and QuickBooks are integrated, with email kept manual; the synthetic call/as-of date is 2026-10-06 and requested send-by is 2026-10-07. `--prepare` copies it outside `opchain-work/` and calls it out, while withholding the key and goldens. The user message is supplied before extraction/path confirmation. Retry 3's separately confirmed three-system scenario remains a distinct historical exercise; it is not retroactively judged as the baseline.
- Four original intake cases and their golden outputs remain intact. Existing strict checks for quoted-only facts, contradictions, LOW source inflation, embedded instructions, wrong paths and private names are retained.

## Validation

`npx vitest run tests/ow-start-acceptance.test.js --reporter=dot`: **57/57 passed**, including supported paraphrases, exact fact ids, the field coverage policy, supported sample/access questions, irrelevant/LOW support, mixed confirmation questions and missing promised material support. Preparation exposes the scenario input without exposing answer keys or expected output.

The combined intake and OW-08 plants run initially passed **693/694** tests. Its one failing test reported two text pins: the edited recap-trace sentence and a concurrent build-plan version bump. The intake sentence was restored exactly and the fact-id clarification added separately, preserving that original pin. The parent lane reconciled the shared version pins, and the focused “the real tree keeps every pin” rerun passed (1 passed, 644 filtered out). The parent lane owns the final full gate.

`git diff --check` on owned files passed. Fresh blind model acceptance, independent review, generated mirrors and full release gates remain the parent lane's next work. These mechanical tests do not count as real customer jobs or satisfy release approval conditions.

## Independent model follow-up

The fourth frozen run scored 10/11: it retained the source's column names under `data_records`, while the fixture expected `systems`. The references now explicitly distinguish application/schema/column structure (`systems`), data quality (`data_condition`) and retention (`data_records`). Negative cases reject moving structure into retention or replacing it with a retention claim.

A fresh fifth writer correctly placed the column fact in `systems` and left unknown retention unknown. Its first grade was 10/11 because the key rejected “on the day it arrives” as a paraphrase of “the same day it arrives.” A bounded key alternative now permits those equivalent value statements; next day, following day and the day after arrival still fail. The unchanged raw fifth capture grades **11/11**, independently verified. The intake suite now has **59 passing tests**. Original grades and capture hashes remain in the independent report; no model output was rewritten to pass.
