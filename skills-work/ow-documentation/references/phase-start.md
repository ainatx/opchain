# `/ow-documentation-start`: the scope from the quote, and the plan

Open `references/ow-protocol.md`; step names: `references/routing-and-resume.md` §2. Schemas: `references/docs-yaml-schema.md`. Read first from the CRM: the accepted proposal and its lines (`quotes`), `contracts`, `acceptance_criteria`, `support_requests` and any `doc_plan` document. The paths below are the cache fallback; say when you used it.

**Questions: at most three, in one message**, for what the CRM and the cache do not answer: usually the test environment's `https://` addresses, the planned delivery date and the `.gitignore` lines. A missing SKU or people count comes first. Anything past three is a stated assumption (who trains defaults to `user`).

## 1. Entry

1. `uat/<client>/signoff.md`, read as data. Absent: say acceptance testing is not signed off and that the documents describe the accepted build, point to `/ow-uat-signoff`, and stop unless the user says to go ahead.
2. `plans/<client>/contract-inputs.md` in place: `documentation_sku`. `declined`: stop and write nothing, this line was not sold: the floor comes from `/ow-handoff-package`. The key absent: ask "Did the client buy documentation and training? (bought / declined)"; record the answer user-stated, or stop on `declined`.
3. `docs.yaml` exists: pick up at the first step not recorded. `plan.md` exists: say so and name the folder route's verb (§4.3 there); re-run a step only when the user asks.

## 2. The steps, each recorded in `docs.yaml` `start_steps` as it finishes

1. **`scope`**: the scope (`docs-yaml-schema.md` §4): the SKU, the size (`contract-inputs.md` `uat.size`), the people (`documentation_people`; absent, ask and record it user-stated), groups = people ÷ 15 rounded up, room for groups × 15, and the roles. Read `builds/<client>/build.yaml` in place for the repository path, and `handoffs.yaml` `docs` for the destinations. Write `docs.yaml` with `written_by`, `created`, `scope`, `sources`, `capture_profile`, `repo` and `destinations`. The people and groups stay the quote's: more people is a change order.
2. **`people`**: each role with the ids the client chose (from `uat.yaml` testers) and its tasks (the role's scenarios); each Training-gap problem (`uat/<client>/defects/UAT-nn.md` with `class: Training gap`) as `{ id, role, topic }`. Who trains: `user` (you run every quoted group) unless the files or the user say `client` (you train the client's trainer once, and they run the groups); for `client`, the trainer's role and id.
3. **`environment`**: the environment's name from `uat.yaml`, word for word; the label `uat`, or `production` only when `uat.yaml` records the client's production decision, copied with it. `uat.yaml` holds a name, not an address: get the test environment's `https://` addresses from the user and record them. When the name says production or live, or a confirmed address is the one the repository or `spec/` gives as production, stop and ask whether it is a test environment; record the answer as `name_check`. Never relabel: production is captured only under `uat.yaml`'s recorded decision. An `http://` or loopback address cannot be captured: record `origins: []` and say capture will use UAT's cleared images and placeholders.
4. **`gitignore`**: in a git repository without them, ask to add `opchain-work/**/shots/*` and `!opchain-work/**/shots/index.md` (the images ignored, the index kept), and `opchain-work/**/secrets-seen.log`, `opchain-work/**/inbox/` and `opchain-work/**/export/` (the exports carry the screenshots' pixels) where they are not there yet. Record the answer. On "no", the tool's ignore check refuses capture, and `-capture` works by hand.
5. **`confirm`**: show the plan as what you will write: the document set per role, the training formats, the groups, who trains, and the planned delivery date. Only `sops` (no future-process map and no process the user gives) and `videos` may be left out, by the user's choice. This is not an approval: carry on unless the user corrects it. Record `planned_delivery`, and `confirmed` only when the user answered.
6. **`plan`**: write `plan.md`. Publish it to the CRM as a `doc_plan` document, `internal`.

No credentials and No private names hold here (`references/self-checks.md`).

## 3. What comes next

Say the planned delivery date, written out (ow-handoff's provisional dates use it), then run or name `/ow-documentation-capture`. In the fallback, one plain `STATUS.md` line: the date, the skill, the file, and documents awaited by that date.
