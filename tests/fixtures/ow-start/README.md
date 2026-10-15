# ow-start acceptance fixtures

Everything here is **invented**: fictional clients, a fictional consultant ("Robin" of "Example Studio"), synthetic transcripts and notes. No real client material belongs in this folder.

These are the acceptance tests from `docs/plans/2026-10-06-ow-start-intake-redesign.md` §10, written so they can be checked mechanically. ow-start is a text-only skill, so a model has to run it; the checker (`scripts/ow-start-acceptance.mjs`) then reads what the run wrote and tests it against an answer key.

| Case | §10 test | What is planted |
|---|---|---|
| `larkspur-prospect` | Synthetic call; Coverage scoring; Recap trace; Path choice (two systems, messy data) | 13 facts at known times, one HIGH from an attached export; a contradiction (60 vs 90 orders a week); an interviewer-led answer ("most of her morning"); an instruction pasted in the meeting chat; the budget question never asked |
| `larkspur-notes` | Notes-only path | The same call as typed notes: no timestamps, no export |
| `tidewell-defined-work` | Path choice (small clean job) | Meeting-tool transcript format with speaker names; a Friday call before a profile holiday, so the recap is due Tuesday |
| `calloway-not-a-fit` | Path choice (out-of-fit team of 200) | No NEXT: the workstream closes in STATUS.md |

The private-name test runs in every case: each starts from the shipped, defaults-only `examples/handoffs.yaml`, and no file the run writes may name `llc-ops` or a business.

Each case has `input/` (the `opchain-work/` folder the run starts from), `expected/` (a hand-written golden run that passes every check) and `answer-key.yaml`. `workspace/profile.md` is the shared invented profile. `trigger-queries.yaml` holds the should-trigger and should-not-trigger prompts the authoring standard asks for; no harness runs them yet.

## Checking a real run

```bash
node scripts/ow-start-acceptance.mjs --prepare larkspur-prospect /path/to/empty-folder
```

Then, in a session where ow-start is installed and that folder is attached, say "use ow-start to extract intake/larkspur-ceramics/". When it asks who is who, answer that SPEAKER_00 is you and SPEAKER_01 is the client's operations manager; accept the path it proposes. Then:

```bash
node scripts/ow-start-acceptance.mjs larkspur-prospect /path/to/empty-folder
```

With no arguments, the script checks every golden run (the same thing `tests/ow-start-acceptance.test.js` does in `npm test`).
