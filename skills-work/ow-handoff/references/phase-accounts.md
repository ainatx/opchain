# Phase: `/ow-handoff-accounts` (and `--transfer`, `--check`, `--complete`, `--waive`)

Writes `handoffs/<client>/accounts.md` (`accounts-format.md`): every account the build uses, moved into the client's name.

**Read first:** the latest saved `systems` and the `contracts` SOW (cache: `plans/<client>/map/systems.md`, `build.yaml`). The paths below are the scratch cache.

## 1. Entry

- No `handoff.yaml` `frozen:`: `Refused: the handoff is not started.` and `/ow-handoff-start`.
- `close.md` exists and nothing reopened it: `Nothing to do: the workstream closed on <date>.`
- A record mode whose exact line is already in `## Records`: `Nothing to do: already recorded on <date>.`

## 2. Steps

### `/ow-handoff-accounts`

1. **`inventory`**: one row per account (`accounts-format.md` §1) from `plans/<client>/map/systems.md`; without it (a quick-quote job), from `build.yaml`, `quote.md`'s vendors and the user, marked `systems_map: none (built without a systems map)`, with the completeness prompt list. A transfer item for every row whose owner, billing, runs-as identity or recovery is not yet the client's.
2. **`scan`**: run `ow-tools scan-secrets <repo> --json` (`accounts-format.md` §3); record the command, the exit and the status, the `not_read` and `not_scanned` lists, and the commit-messages line. Any exit but 0, or no ow-tools: `not scanned`, with its reason. Uncommitted files are listed by name as not scanned. A hit is never printed: it becomes a rotate item, and the client rotates that secret.
3. **`rotate`**: one rotate item per secret name: names-only sources, each scan hit (by path and rule id), and every line of every `secrets-seen.log` read; each with every place it is used.

### `/ow-handoff-accounts --transfer TR-nn`, `--check <account>`, `--complete`, `--waive <items>`

1. **`record`**: add the one line `accounts-format.md` §2 gives, naming exactly what the user says the client confirmed or what the user waives, as the user's statement. A waiver of No credentials or No private names is refused.

## 3. Then

Say how many accounts and transfer items there are and the scan's status, then `/ow-handoff-notes`.
