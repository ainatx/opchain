# Local time tracking: review, approve and export

The daily CLI supports private setup, collection, Markdown drafts, review, edit/amend/add/discard, approval, CSV export, spotcheck and verification. No hooks are installed automatically. See the [quick start and hook snippets](../plans/time-tracking/README.md).

Use Node 24. All state goes to `~/.opchain/time/`, or `OPCHAIN_TIME_HOME`. Run `init --client <id> --name <name> --rate <n> --repo <path> --timezone <zone>` to create the commented config and registry. Existing clients require `--force` to replace their config; review its policy first. Ticket matching starts empty rather than guessing a client prefix. Keep these files private (0600, directories 0700), outside the repo. Multiple registered clients must agree on timezone, idle/tail cap and overlap policy; this prevents inconsistent global allocation. Rates, rounding and matter rules may differ.

Run from the registered client repo using the absolute path to this checkout's CLI:

```sh
node /path/to/opchain/scripts/timesheet.mjs collect --report
node /path/to/opchain/scripts/timesheet.mjs draft 2026-09-26
node /path/to/opchain/scripts/timesheet.mjs draft --since 2026-09-13
node /path/to/opchain/scripts/timesheet.mjs verify
```

`draft --since` includes every local date through today. Each line reports block minutes, human-cadence minutes, unpriced share and append count. Repeating unchanged inputs appends nothing. A canary failure still writes drafts, prints a refusal, and returns 1. Invalid arguments/config return 2. Missing prices are named; the library refuses approval of an unpriced disbursement. AI costs use current standard USD API list rates and are explicitly labelled list-price equivalents. See Sprint 2 pricing evidence for rates and limits.

Matter precedence uses checkpoint `pm_refs` only with explicit `active_from` (inclusive), optional `active_to` (exclusive), and role `source`/`child`; ticket comes from `identifier` or `id`. Undated current checkpoint state is not historical evidence. PR branch/title enrichment uses optional read-only `gh pr view`, with bounded timeout and fallback to collected branch metadata. No PR title or commit subject is stored in narratives. Detached HEAD uses the original worktree reflog when available; old caches without a worktree path fall back to the canonical repo. No matching evidence resolves to the configured default.

A block begins at its first human touch, conservatively excluding preceding automated activity. A tail crossing midnight retains that human provenance and is split at the local boundary; DST elapsed time follows absolute instants. Human cadence sums gaps between human touches no longer than the configured idle gap, then applies the same global overlap policy. Nonbillable scopes retain raw allocation evidence with zero hours. Rounded time can exceed raw union by the documented increments; verify checks allocation proofs separately from rounded hours.

## Wrong day or stale derivation

Check timezone first. Re-draft every affected client/date after policy or source changes. Removed unapproved matters receive append-only retirement events. User-discarded entries stay discarded; automatically retired drafts can reappear. If a day contains approved or manually edited/amended entries, changed derivation gives a drift warning and preserves the entire day. Use `amend <id> --hours <h> --reason "…"` for approved corrections, then review and reapprove; never edit ledger bytes.

## Verification and recovery

`verify` checks all registered client ledgers: row hash chain, content-derived hashes, revision transitions, approved immutability, raw allocation bounds, day boundaries, canary status, and tracked billing files. It returns 1 on any failed check. Cross-client stale drafts may violate the global union: re-draft the other affected clients before acceptance. An approved stale entry requires a human amendment, not automatic replacement.

Ledger appends hold an exclusive lock with a five-second retry budget. A lock older than 60 seconds is broken only when its positive PID is confirmed absent. A live or malformed lock is not automatically removed. Stale-owner recovery is itself serialized by `ledger.lock.reap`. If a process crashed before recording its PID or while holding the recovery guard, confirm no writer is running before manually removing that lock/guard. Partial/corrupt ledger lines fail closed. Preserve a copy, then restore a known-good complete backup; do not silently truncate or repair billing history. Hashes detect accidental edits and internal corruption; they do not authenticate against an attacker who can rewrite the entire log, or prove a deleted suffix never existed. Keep private external backups for that assurance.

Cache reads hold the collector lock, so a draft observes one complete published cache. Collection and ledger append remain separate transactions. A leftover `collect.lock` requires the Sprint 1 transcript-format recovery procedure. Canary failures require reviewing producer shapes and adding synthetic fixtures, then collecting again. Never upload real prompts, raw transcripts or billing artifacts to a PR.

## Required owner acceptance

Confirm all seven prices against Anthropic's source and assess the list-price-equivalent basis. On a private replay state directory, register/configure the real client repos, run collect and `draft --since <local-date-14-days-ago>` per client, then verify. Require zero unpriced share on every day, review block/cadence totals side by side, and record only sanitized timings/aggregates. On 2026-09-27 the owner confirmed the seven prices and authorized a private validation replay: all 56 repository-days had zero unpriced usage, ledger verification passed, and repeated derivation appended zero entries. The collector incremental timing target remains unmet; the owner explicitly accepted the measured deviation for these two sprints and retained <1s as a performance follow-up. See [replay evidence](../plans/time-tracking/sprints/sprint-2/replay-2026-09-27.md) for validation settings, aggregate minutes, and limitations. Sprints 1 and 2 have merged. Sprint 3 adds the usable daily loop; its real-client trial, manual hook installation, owner review/approval and CSV import check remain pending. This work does not cut a catalog release.


## Corrections, exports and spotchecks

For an unapproved entry use `edit <id> --hours 0.50 --reason "…"`; for an approved
entry use `amend` with the same flags. The amendment increments the revision and
removes it from export until re-approved. Narratives and matter names can also be
edited; AI amounts use `--amount`. Unknown token prices cannot be bypassed with an
amount edit. Manual `add` entries require date, matter, hours, narrative and reason;
re-drafting preserves them. Use `discard` with a reason for an unapproved line that
must not be invoiced. Approved entries must first be amended.

For the wrong date, amend approved time to zero with a correction reason (or amend,
then discard), add the corrected entry on the right day, and review/reapprove before
export. Keep both audit trails. Do not alter the original date or raw allocation.

`export --from YYYY-MM-DD --to YYYY-MM-DD` includes only current approved entries,
including approved lines on partially reviewed days. Its summary lists dates with
remaining unapproved entries. `spotcheck --n 3` samples distinct approved entries,
showing allocation intervals, metadata counts and derivation references without
reading prompt text. `verify` remains the full ledger-integrity check.

If output is tracked, remove it from Git's index and add `/timesheets/` to the
checkout's `.gitignore`; review staged changes yourself. A later negation can defeat
an earlier ignore rule, so the CLI checks effective ignore status before writing.
If rendering fails after a mutation, the saved ledger is authoritative: the CLI
reports this and a later `draft` refreshes Markdown without erasing the edit.

Nudge is best-effort: missing registry/cache, corrupt state, unregistered repo,
no pending activity or a slow read produces no output and exit 0. Run `verify` and
`review` directly to diagnose silent reminders. No normalized event stream or
transcript is read by nudge. All ordinary read commands operate on cached data;
run `collect` or `draft` when fresh activity is needed.
