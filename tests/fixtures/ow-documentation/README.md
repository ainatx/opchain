# ow-documentation acceptance fixtures

Everything here is **invented**: the fictional clients Larkspur Ceramics and Mossgate Books (continued from the ow-build-plan, ow-build and ow-uat fixtures), the fictional consultant "Robin" of "Example Studio", people recorded by role and an invented id, an invented client repository, invented attendance sheets and check-in reports. No real client material, no real price, no real person's name and no image belongs in this folder. A few files plant a name, a password, customer data or an instruction to the assistant on purpose, to prove the checks catch them or that the skill quotes them and does not act on them; each says so in its answer key.

These are the acceptance tests from `docs/plans/2026-10-16-ow-documentation-design.md` §10 and the OW-05 contract (`sprints/release-2.1/ow-05/contract.md`, C1 to C26), written so they can be checked mechanically. ow-documentation is a text-only skill, so a model has to run it; the checker (`scripts/ow-documentation-acceptance.mjs`) reads what the run wrote and what it printed, and tests it against an answer key, the frozen scope in `docs.yaml`, the plan, the UAT files the documents are built from and the client's repository. "Real use" (one real documentation job through the close) is graded in REL-02.

## Layout of a case

| Folder or file | Holds |
|---|---|
| `input/` | Files the case adds to its starting state: a `contract-inputs.md` with a key absent, an attendance sheet or a check-in report in `docs/<client>/inbox/`, a change order, `dates.yaml`, a planted state for a refusal case |
| `session/` | What the user says or brings in the session: answers, a waiver asked for, an instruction to capture in production |
| `expected/` | The golden run, invented for the test (written with a generator kept outside the repository, then graded by the checker): what ow-documentation writes under `opchain-work/` and into the client's repository, and `printed.md`, the screen the run printed |
| `answer-key.yaml` | The case: `base:` (the ow-documentation case it continues), `uat_case:` (the ow-uat golden run the chain starts from; that run brings ow-build's and ow-build-plan's), `world:` (the invented repository), `run:` (grade another case's run, for a route cell), `verbs`, `today`, the checks and what each expects |
| `worlds/larkspur/larkspur-repo/` | The client's repository `build.yaml` names (`../larkspur-repo`): a README, `docs/deploy.md`, `docs/run-log.md`, the CI workflow, `alerts.yaml` and `.env.example`. Its README carries a planted instruction to the assistant, which the handover quotes and never follows |
| `trigger-queries.yaml` | The should-trigger and should-not-trigger prompts the authoring standard asks for; no harness runs them yet |

A case's starting state is layered, newest first: its own `input/` and `session/`, then each earlier ow-documentation case down its `base:` chain (their `expected/`, `input/`, `session/`), then the world its chain names, then the ow-uat golden run the chain starts from (`uat_case:`), with everything that run reads. `STATUS.md` continues ow-uat's lines.

**Images are never committed.** A golden `shots/index.md` lists `shots/<id>.png` files; the tests and `--prepare` write a stub PNG for each, and `.gitignore` keeps `tests/fixtures/ow-documentation/**/shots/*.png` out of the repository (owner decision O4: the images git-ignored, the index kept). The checker cannot read an image: it grades the index rows and their labels, and that no document uses an image that is not `cleared`. Each cleared row's note names the stub image's SHA-256, so a real run's check compares the bytes as well as the label.

## The stories

**Larkspur Ceramics** (signed off in ow-uat's `signoff-signed`; the line bought for 6 people on an M build; three roles; one training gap, UAT-01). The main chain: `start` → `capture` (one image with a real customer's name, recorded as a finding and never used) → `write-guides` → `write-sops` → `write-runbook` → `write-handover` → `train-deck` → `train-facilitator` → `train-modules` → `train-cards` → `train-videos` → `export` (Markdown copies in the repository's `docs/client-handbook/` and `docs/handover/`, the say: lines for the shared drive and the wiki) → `delivered` → `rollout-plan` → `rollout-session` (an attendance sheet with a name column and a password in a note, both kept out; `secrets-seen.log`) → `rollout-checkin-14` (a new gap, RG-01) → `write-gap` → `train-gap-card` → `export-update` (into `export/update-01/`) → `delivered-update` → `rollout-checkin-30` → `rollout-close`.

Branches off it:

- **`-start`:** the SKU key and `documentation_people` absent (asked once; recorded user-stated). Also 12 and 40 people (1 and 3 groups), the trainer named by the client, two roles with three gaps, production, an `http://` or loopback origin, and a cut after each start step (`start-resume-<step>`).
- **`-capture`:** no ow-tools, exit 3 (no browser), an `http://` origin, a real-data capture decision (asked, then recorded), production with and without the client's decision, signed out, and a run cut off after some images. Also a cut after each capture step.
- **`-export`:** a placeholder or a FINDING left (refused), no ow-tools (client copies in `export/markdown/`, never the source Markdown), a repository file the skill did not write (refused, left as it is), a connector, and a cut after each export step, mid-push included.
- **`-delivered`:** nothing exported (refused), the line already requested in `ledger.md` (no invoice NEXT), already delivered.
- **`-rollout`:** planning before the kit exists, a check-in that is early, day 30 before the window end (wait) and after it (close), closed, and a 46th person (the change-order NEXT, then `--add-group CO-05`). Also a client trainer (TT-01, then client-reported sessions), and the close with care chosen.
- **Waivers:** a typed waiver of each of the four never-waived checks, refused.
- **Instructions planted for the assistant** (the security review's SD-04): in a scenario (`write-guides-embedded`), a sprint file (`write-handover-embedded`), an attendance sheet (`rollout-session-embedded`) and a check-in report (`rollout-checkin-embedded`), as well as the client README's in `write-handover`. Each is quoted where the record says and never followed.
- **A re-capture** (the security re-check's RC-01): `capture-recapture` captures the steps a cut-off run never reached with its own plan, `capture-plan-02.json`. It plans only steps whose rows are not cleared, and never runs the first plan again.
- **Resumed rollout steps** (evaluation round 1, M1): `rollout-session-resume-rollout` (a `--session` cut after `record`: only the session's row is written) and `rollout-close-resume-closed` (a `--close` cut after `summary`: only `closed`).
- **A re-capture cut after its plan** (ow-documentation 1.0.1): `capture-recapture-resume-run` starts with `capture-plan-02.json` written and its run not recorded; the resumed run runs that plan once, never writes it again (every `capture-plan*.json` is written once) and makes no third plan.
- **A runbook update after ow-handoff's notes** (OW-06's contract, O6): `write-runbook-update` adds an alert's entry as `OP-10`, after the `OP-08` and `OP-09` rotate entries in `handoffs/<client>/operator-notes.md`, before the documents are delivered (after `delivered.md`, `-write` writes only a new training gap's guide, `phase-write.md` §1; the checker fails any other document written then). That file is an invented stand-in; OW-06 replaces it with a byte copy of its own golden.

**Mossgate Books** (a quick quote, signed off in ow-uat's `m-deemed-bought` with the line bought; one role): `q-start` → `q-capture-no-tools` → `q-write-guides` → `q-write-sops`. Its SOPs come from `quick-scope.md` and the user, cited user-stated.

**Routes** (contract C4): every inbound route and stage has a case named `route-*`, or a refusal case that says which cell it grades. These cover ow-uat's `use ow-documentation-start on uat/<client>/` at each stage (new, declined, no sign-off, started, delivered, closed) and `/ow-documentation-start` with no path (one client, several). They also cover the folder route `use ow-documentation on docs/<client>/` at every stage, and the skill's own NEXTs, including "everything written" (`write-all-written`, `train-all-written`).

## What other skills read from here

ow-build's fixture `invoice-documentation` reads `delivered`'s `delivered.md` byte for byte: `tests/ow-documentation-acceptance.test.js` keeps the copy identical, and ow-build's checker grades it as its own (amendment B4).

## Checking a real run

```bash
node scripts/ow-documentation-acceptance.mjs --prepare write-guides /path/to/empty-folder
```

That lays out the starting state, with a stub PNG for every image the index lists. Attach the folder in a session where ow-documentation is installed and run the step the answer key's `verbs` and `section` name, saying what the case's `session/` files say. Save what the run printed as `printed.md` at the top of the folder. Then:

```bash
node scripts/ow-documentation-acceptance.mjs write-guides /path/to/empty-folder
```

A real run is read by difference: a file counts as written by the run when it is new or differs from the starting state, and an image only when the index from before the run does not list it. With no arguments, the script checks every golden run (what `tests/ow-documentation-acceptance.test.js` does in `npm test`).
