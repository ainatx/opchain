# Transcript collection format — Sprint 1

Implemented from the [audited shapes](audit-2026-09-26.md), with synthetic
fixtures and an owner-authorized metadata-only corpus replay. No real transcript content
is included in this repository or its tests.

## Read contract

`node scripts/timesheet.mjs collect [--report]` scans every project under
`$HOME/.claude/projects/`: `<project>/<session>.jsonl` and
`<project>/<session>/subagents/*.jsonl`. Symlinked files/directories are not
followed. Subagents use the directory's parent session and never contribute a
human event. Each event's cwd resolves through Git's common directory; deleted
paths use the longest registered prefix, otherwise remain internal work.
Queue records without cwd inherit their own session's nearest preceding explicit
location, or first explicit location if no earlier one exists.

The classifier checks meta/compaction flags first, then these machine envelopes:
`task-notification`, `scheduled-task`, `ci-monitor-event`, `cross-session-message`,
`local-command-stdout`, `local-command-stderr`, and system-reminder-only messages. Leading system reminders are removed before classifying the remaining payload; wrapped machine events stay machine events.
A human origin does not override them. Human command envelopes are `command-name`,
`command-message`, `bash-input`, `create-pr-command`, plus user interruptions.
Plain text from a human origin or a legacy missing origin is a human prompt.
Tool results are human answers only when their ID matches an AskUserQuestion or
ExitPlanMode call in that session. Calls can occur later in file order or arrive
on an incremental read. Other tool results are activity only.

An unknown leading XML envelope is quarantined. Synthetic quarantine fixture:
`<foo>`. The canary records bounded lowercase tag names, never their bodies;
invalid/long names become `unknown`. The 2026-09-27 corpus retained three quarantined messages: one leading `role` envelope and two non-matching angle-bracket forms. Their contents are not retained.

Queue operations use `queueId` / `id` when present and otherwise a SHA-256 content
fingerprint. Enqueue contributes one event at the original time, remove cancels
it, and dequeue plus its matching user line cannot add another human event.
Repeated identical messages are consumed FIFO. Fingerprints are matching metadata,
not retained prompt text; never publish the private state directory.

## Stored contract

All state is below `$OPCHAIN_TIME_HOME`, default `$HOME/.opchain/time/`, with
0700 directories and 0600 files. Normalized monthly JSONL events contain only:
`ts`, `uuid`, `session`, `parent_session`, `repo`, `branch`, `class`, `type`,
optional `message.id`, `model`, numeric `usage`, `skill`, and numeric `pr`.
`type` is retained to let Sprint 2 exclude non-activity timestamps. The source
shards also retain tool IDs/names, queue operation/ID/fingerprint, missing-cwd
flags, first-seen source order, aggregate counters and read cursors. They contain
no message bodies, tool inputs/results, PR titles or prompt text.

Global UUID de-duplication preserves first-seen source ownership across runs.
Global message-ID de-duplication takes the maximum of each numeric usage field,
including nested five-minute/one-hour cache writes. Usage is attached to one
assistant event only; later events still preserve activity timestamps.
`<synthetic>` usage is discarded. The final cache is chronologically sorted.

Hook stamps are `{ts, session_id, cwd}` only, with the hook's current timestamp.
They replace transcript human prompts in the same session within inclusive ±5s;
they do not erase human answers or prompts from a different session.

## Incremental reads and recovery

`cursor.json` tracks inode, size, complete-line byte offset and mtime. A partial
last line waits for the next append. Truncation, replacement inode or same-size
rewrite restarts that source. A source shard/cursor mismatch after interruption
also restarts it. Unchanged transcripts are not opened. Normalized source shards
remain after transcript deletion so billing history survives retention cleanup;
the deleted source's active cursor is dropped.

Collection serializes with `collect.lock` and atomically replaces each output
file before publishing cursors. Read the cache only after collect completes;
a killed process can leave a partly published set until the next successful run.
If collection is interrupted, confirm no collector is running before removing
`$OPCHAIN_TIME_HOME/collect.lock`, then rerun collect. Do not remove source shards
unless the original transcripts are still available and a full rebuild is intended.
Unreadable sources retain their prior cache and mark the canary failed. Malformed
JSON is counted and skipped. Errors never print raw source lines.

## Canary

`canary.json` includes cumulative retained-source statistics plus a `run` block
for newly read lines: entry types, envelopes, version bounds, malformed lines,
missing timestamps, quarantine and per-UTC-day unknown shares. Billing timezone
conversion belongs to Sprint 2. A day's unknown types plus quarantined lines
exceeding 1% of user lines fails the canary (exactly 1% passes); a bad day cannot
hide in an otherwise clean corpus. Malformed lines, hook records or failed source
reads also fail closed. `collect` remains best effort (exit 0 with a warning),
while fatal storage/configuration errors return 2.

The reviewed producer baseline is **2.1.281**. The 2026-09-27 replay covered producer versions 2.1.126–2.1.281; synthetic regressions cover the newly observed metadata types and reminder prefixes. Newer semantic versions fail the canary and
are listed in `untested_versions`. Review the new shapes, add synthetic fixtures,
and update `TESTED_VERSION` in `canary.mjs`; do not suppress the warning blindly.
Pricing, billing verification and approval are Sprint 2/3 work.

## Owner replay

From the repository root, choose an isolated replay directory and run:

```sh
OPCHAIN_TIME_HOME="$HOME/.opchain/time-sprint1-replay" node scripts/timesheet.mjs collect --report
OPCHAIN_TIME_HOME="$HOME/.opchain/time-sprint1-replay" node scripts/timesheet.mjs collect --report
```

The first report must finish within 15 seconds with canary share below 1% and
no unexplained quarantine/untested-version failure. The second should read zero
transcript bytes absent new activity. Review unknown envelopes locally and add
sanitized shapes as fixtures. Never attach raw transcripts or cache files to a PR.
A real-corpus incremental replay after 10k new lines must finish in under 1 second;
this is separate from the synthetic benchmark and remains pending owner.

Hermetic checks (no real transcript reads):

```sh
npx vitest run tests/time
node tests/time/benchmark.mjs
```

Run the benchmark without concurrent builds/tests. It measures 20 fresh hook
processes (median <50ms) and a 10k-line append (<1s); CI budgets scale by 3.

## 2026-09-27 replay findings

Owner-authorized replay read 611 files (about 1.12 GB) in 7.38 seconds before fixes,
then 7.10 seconds after classification review. Eight producer metadata types are
now recognized: `atis-latch`, `ai-title`, `bridge-session`, `permission-mode`,
`cost-state`, `frame-link`, `artifact-comment-monitor`, `artifact-autoreact-ledger`.
Their arbitrary fields are never persisted. Reminder prefixes may precede plain
human text, human commands, or machine notifications; the payload is classified
with the same conservative precedence after removing complete leading reminders.

The corrected replay has zero unknown types, three quarantines (0.0059% of user
lines), no malformed JSON or failed reads, and all per-day canaries pass. Source
format version 2 invalidates old classifications for available transcript files;
retained shards whose original source has expired keep their old evidence and
canary failures rather than being silently blessed. No transcript bodies, source
paths, client identities, or billing artifacts accompany this evidence.

Controlled incremental replay used a private copy of all 611 files, withheld
10,000 complete real-corpus lines across existing files, collected the baseline,
then appended exactly those lines. It read only the appended 33,819,395 bytes,
but took 1.35 seconds against the <1-second target. A later run under concurrent
machine load took 1.90 seconds; the no-change replay read zero bytes. The timing
target remains unmet; synthetic timing success is not substituted for this result.
