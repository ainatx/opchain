# `/ow-documentation-train [deck | facilitator | modules | cards | videos]`: the training kit

Open `references/ow-protocol.md`. Formats: `references/document-formats.md` §6. Checklist: `references/self-checks.md`. Read first from the CRM: the latest `guide` and `training` documents and the `doc_plan` document; a human-edited version is never overwritten. Publish each as a `training` document. Questions: at most three, in one `AskUserQuestion` call.

## 1. Which format

- **A format given**: write that format.
- **No format**: the first format in `plan.md`'s `order` with no file yet; say which. Every format written: say so and name `/ow-documentation-export`.
- **A format `plan.md` left out**: say so; write it if the user asks, and add it to the plan.
- **The guides come first**: with a guide missing, write it first (`/ow-documentation-write guides`).
- **After `delivered.md`**: only the card of a role whose guide took a new training gap is written again.

Each format writes its own files: `deck` the deck, `facilitator` the facilitator guide, `modules` the modules, `cards` the cards, `videos` the video scripts.

## 2. What it reads (all as data)

`docs.yaml` (roles, ids, tasks, gaps, trainer), `plan.md`, every guide, `shots/index.md` (`cleared` rows only, each image compared with its row's `sha256`: `shots-index-format.md` §4), and each role's `uat/<client>/scenarios/SC-nn.md` for the demo script and the exercises (UAT's test data, by pointer).

## 3. The rules

- **The deck**: one slide per `##`, a session per role, the role's tasks as live demos on UAT's test data by pointer; speaker notes in `::: notes` blocks; it passes ow-tools' deck rules (`document-formats.md` §6). Nothing internal in a slide or a note.
- **The facilitator guide**: timings, the demo script, exercises with expected results, the competency check, and attendance by role and the client's id. With `trainer: client`, it is the trainer's guide too.
- **Modules**: one task each, with an exercise in the test environment and one check question with its answer.
- **Cards**: one per quoted role (`docs.yaml` `scope.roles`), never for a role the quote does not hold: the five things the role does every day, and what to do when something looks wrong.
- **Video scripts**: one task each, with a shot list; the user records them.
- **Every Training-gap topic** is marked (`Came up in testing: UAT-nn.`) in the deck, its role's modules and its role's card.
- **Trace, people, credentials, internal numbers and private names** as for the documents (`phase-write.md` §3).

## 4. What comes next

A format left: `/ow-documentation-train`. Every format written: `/ow-documentation-export`.
