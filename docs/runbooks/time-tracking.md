# Local time tracking: collect, draft and verify

Sprint 2 supports ledger-only drafting. Review, edit/amend/approve CLI commands, Markdown and exports arrive in Sprint 3. No hooks are installed automatically.

Use Node 24. All state goes to `~/.opchain/time/`, or `OPCHAIN_TIME_HOME`. Until `init` exists, copy the commented `docs/plans/time-tracking/billing.example.yaml` to `<time-home>/<client>/billing.yaml` and register the canonical absolute git root in `<time-home>/registry.json` as `{ "/absolute/repo": "client-id" }`. Keep these files private (0600, directories 0700), outside the repo. Multiple registered clients must agree on timezone, idle/tail cap and overlap policy; this prevents inconsistent global allocation. Rates, rounding and matter rules may differ.

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

Check timezone first. Re-draft every affected client/date after policy or source changes. Removed unapproved matters receive append-only retirement events. User-discarded entries stay discarded; automatically retired drafts can reappear. If a day contains approved or manually edited/amended entries, changed derivation gives a drift warning and preserves the entire day. Use the future `amend` workflow for approved corrections, then reapprove; never edit ledger bytes.

## Verification and recovery

`verify` checks all registered client ledgers: row hash chain, content-derived hashes, revision transitions, approved immutability, raw allocation bounds, day boundaries, canary status, and tracked billing files. It returns 1 on any failed check. Cross-client stale drafts may violate the global union: re-draft the other affected clients before acceptance. An approved stale entry requires a human amendment, not automatic replacement.

Ledger appends hold an exclusive lock with a five-second retry budget. A lock older than 60 seconds is broken only when its positive PID is confirmed absent. A live or malformed lock is not automatically removed. Stale-owner recovery is itself serialized by `ledger.lock.reap`. If a process crashed before recording its PID or while holding the recovery guard, confirm no writer is running before manually removing that lock/guard. Partial/corrupt ledger lines fail closed. Preserve a copy, then restore a known-good complete backup; do not silently truncate or repair billing history. Hashes detect accidental edits and internal corruption; they do not authenticate against an attacker who can rewrite the entire log, or prove a deleted suffix never existed. Keep private external backups for that assurance.

Cache reads hold the collector lock, so a draft observes one complete published cache. Collection and ledger append remain separate transactions. A leftover `collect.lock` requires the Sprint 1 transcript-format recovery procedure. Canary failures require reviewing producer shapes and adding synthetic fixtures, then collecting again. Never upload real prompts, raw transcripts or billing artifacts to a PR.

## Required owner acceptance

Confirm all seven prices against Anthropic's source and assess the list-price-equivalent basis. On a private replay state directory, register/configure the real client repos, run collect and `draft --since <local-date-14-days-ago>` per client, then verify. Require zero unpriced share on every day, review block/cadence totals side by side, and record only sanitized timings/aggregates. Real transcript replay and owner price confirmation have not been performed by the implementation agent. Sprint 1 must merge before Sprint 2 can land; this work does not cut a catalog release.
