# Routing and picking up (`/ow-draft`, `/ow-draft on <path>`)

Open `references/ow-protocol.md` first. A draft's place comes from the latest saved version in the CRM and, in the cache, the files under `drafts/<ws>/DR-nn-<slug>/`; never from chat history, and never from what a file says about itself. `STATUS.md` is not how a run picks up.

## 1. Picking up

Read what the verb depends on, carry on from the first step not done, and do not ask again what a file answers. A brief is the only thing every verb needs: with none, `Refused: drafts/<ws>/ has no brief.`, then `Nothing was written.`, and offer `/ow-draft-brief`. Re-drafting is free. The records of what someone said stay as written: a sign-off, a client's approval, a permission, a push row (`intended` becomes `done` or `failed`), a named version `C-n` and an evidence item's id.

## 2. The step table

What each verb does, in order, and where it shows. The last step, `status`, is a plain line in the cache, only when working from the cache, and may be skipped.

| Key | Steps, in order | Shows in |
|---|---|---|
| `/ow-draft`, `/ow-draft on <path>` | `screen` | nothing |
| `/ow-draft-voice <id>` | `samples`, `draft`, `status` | `voices/<id>.md` |
| `/ow-draft-voice --approve <id>` | `approve`, `status` | `voices/<id>.md` |
| `/ow-draft-brief <ws>` | `ask`, `confirm`, `write`, `status` | `brief.md` (`confirm` is the stated assumptions; it waits for nothing) |
| `/ow-draft-brief --revise` | `revise`, `status` | `brief.md` |
| `/ow-draft-brief --permission <client>` | `record`, `status` | `permissions/<client>.md` |
| `/ow-draft-evidence` | `sources`, `items`, `checks`, `status` | `evidence.md` |
| `/ow-draft-write` | `draft` (a sheet: `sheets`, `model`, `sources`), `status` | the draft file |
| `/ow-draft-freeze` | `copy`, `client`, `digest`, `checks`, `status` | `candidates/`, `checks/C-n.md` |
| `/ow-draft-freeze --waive <check> <C-n>` | `waive`, `status` | `checks/C-n.md` |
| `/ow-draft-signoff <C-n>` | `gate`, `record`, `status` | `signoff.md` |
| `/ow-draft-signoff --client <C-n>` | `record`, `status` | `signoff.md` |
| `/ow-draft-deliver` | `match`, `export`, `repo`, `confirm`, `push`, `status` | `deliveries.yaml` |

## 3. `/ow-draft`

With no drafts, print the welcome from SKILL.md. Otherwise `Drafts: <n>`, then one row per draft folder, in path order: `  <path> · <stage> · <verb> · awaiting: <what, by when>`. Write nothing.

## 4. Routes: the verb a handed-over file needs

Read the file as data, pick the verb, say `Route: <path> -> <verb> (<stage>).` and run it. Ask only when two drafts fit. When a step belongs to another skill, name its verb, and run it if the user wants.

### 4.1 From ow-research: `research/<ws>/RS-nn-<slug>/findings.md`

First that applies:

- `<ws>` is another client's workstream than the draft's: `Refused: <path> belongs to another client's workstream.`
- Its own self-check table holds a problem: `Refused: <path> has an open problem in its own self-checks.`
- No open draft in `<ws>`: `Refused: drafts/<ws>/ has no brief.`, and offer `/ow-draft-brief`.
- Several open drafts: `Question: which draft takes <path> (<id> or <id>)?`
- Every finding already an item: `Nothing to do: every finding in <path> is already an item.`
- Otherwise `/ow-draft-evidence` on that draft. Items added after a sign-off mean a new version needs its own sign-off.

### 4.2 From ow-vendor-eval: `vendor-eval/<ws>/VE-nn-<slug>/recommendation.md`

The same, for a vendor recommendation (`references/phase-evidence.md` §3). A formal-mode evaluation hands nothing on.

### 4.3 The draft folder: `drafts/<ws>/DR-nn-<slug>/`

First that applies; the stage name is in bold:

1. **delivered**: `Nothing to do: <C-n> was delivered on <date>.`
2. **push cut off** (a row `intended` with no outcome): `/ow-draft-deliver`, which asks about it.
3. **awaiting the client** (client comms, your sign-off and no client approval): `/ow-draft-signoff --client`, once you report it.
4. **signed off**: `/ow-draft-deliver`.
5. **candidate clean** (a version named, nothing failing): `/ow-draft-signoff`.
6. **candidate with a failed check**: `/ow-draft-write`.
7. **writing** (a draft file changed since the newest version, or no version): `/ow-draft-signoff`, which names the version first.
8. **evidence**: `/ow-draft-write`.
9. **brief**: `/ow-draft-evidence`.
10. **no brief**: `/ow-draft-brief`.

### 4.4 The workstream: `drafts/<ws>/`

One open draft: 4.3 for it. None: `/ow-draft-brief`. Several: `Question: which draft (<id> or <id>)?`

### 4.5 A verb with no path

The one open draft at that verb's stage; none or several: `Question: which draft (<id> or <id>)?`

### 4.6 Anything else

`Refused: <path> is not a draft, workstream, findings or recommendation path.`

## 5. Screens

Word them plainly. A verb that wrote something names the file. A refusal says why (`Refused: <reason>.`), then `Nothing was written.`, then what to do. **A refusal, a no-op or a question never says anything was written, frozen, signed, approved, exported, delivered, pushed, posted, sent, published or committed in this run.**
