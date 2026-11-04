# Phase: `/ow-handoff-access` (and `--record`, `--regrant`, `--waive`)

Writes `access.md` (`access-format.md`): every piece of the user's access, from every source, listed and taken back. It records; it removes, rotates and deletes nothing itself.

**Read first:** the latest saved `systems` and `support_requests` (cache: `accounts.md`, `fixes/`). The paths below are the scratch cache.

## 1. Entry

- No `handoff.yaml` `frozen:`: `Refused: the handoff is not started.`
- A record mode whose exact line is already recorded: `Nothing to do: already recorded on <date>.`
- `--record` (a removal, a rotation or a deletion) or `--waive` for an item whose account's transfer in `accounts.md` is not at `client has owner rights` or `done`, and not waived there: `Refused: the transfer of <item> is not confirmed; the client confirms owner rights first.` The item's account is its row in `access.md`'s Account column; that row's transfer item is the one that gates it.
- **A transfer waived** in `accounts.md` (the client never replied): removal and rotation may go ahead, each record saying `while transfer TR-nn is waived (client not confirmed)`, and the close email says so beside the open transfer.

## 2. Steps

### `/ow-handoff-access`

1. **`sources`**: read all five sources (`access-format.md` §2): `accounts.md`, `plans/<client>/evidence.md`, every `secrets-seen.log`, the local-copy folders by name only, `docs/<client>/docs.yaml` `capture_profile`, `uat/<client>/evidence/index.md`, and `uat/<client>/signoff.md` `test_accounts`.
2. **`list`**: write the items, each with its source, its order and its state (open, held for a named FIX-nn or HELP-nn, kept for care with its removal step), and the keep list.

### `/ow-handoff-access --record AX-nn`, `--regrant AX-nn`, `--waive AX-nn`

1. **`record`**, **`regrant`** or **`waive`**: add the one line `access-format.md` §5 gives, as the user reports it: removed, rotated, deleted by the user, re-granted and held, or removed unconfirmed (waived, naming every date confirmation was requested).

## 3. Then

Say how many items there are and the removal date, then `/ow-handoff-close` once the window has ended.
