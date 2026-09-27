# 06 — Testing

This follows oc-qa-ops' pyramid shape. It's a local library plus a CLI and two
hooks, so there's no end-to-end browser tier. The fixtures are built from the
**real line shapes** observed in the audit (`../audit-2026-09-26.md`); the shapes
are copied, not the content.

## Pyramid

| Tier | Share | What |
|---|---|---|
| Unit | ~65% | `classify` (every envelope and each `origin.kind` quirk), `blocks` (allowed types, idle split, midnight split, tail cap, subagent continuity), `allocate` (union, `last-touch`, `split-even`, `internal` bucket), `matters` (precedence, `HEAD` handling, `max_per_day`), `cost` (global de-duplication, max per field, family prefix, cache terms, `<synthetic>`, unpriced share), rounding scopes, `config`, `ledger` (fold, invariants, lock), `cursor` (append, truncation, inode change), `narrative` determinism |
| Golden fixtures | ~25% | A synthetic `~/.claude/projects` tree plus git repos built in temp directories, rendered to expected Markdown, CSV and ledger files |
| CLI and hook integration | ~10% | `init → collect → draft → edit → add → approve → export → verify → spotcheck` against a temp HOME. `hook prompt` and `nudge` are timed and must always exit 0 |

## Must-have fixtures

Each fixture is listed with the audit finding it guards.

1. **Classifier** [C-1/P1]: one session containing each of:
   - plain human text
   - `origin.kind:"human"` on `<scheduled-task>`, `<ci-monitor-event>` and a message that is only a system reminder
   - `<task-notification>`
   - `<local-command-stdout>`
   - `isCompactSummary`
   - a message with no `origin`
   - `<command-name>`, `<bash-input>`, `<create-pr-command>` and `[Request interrupted`
   - an `AskUserQuestion` `tool_result`
   - an unknown `<foo>` envelope

   Only the expected lines should count as human, and the unknown envelope should be quarantined.
2. **Autonomous run** [C-1/H-3]: a scheduled task that runs overnight with no hook prompt should be billed at 0.
3. **Hook and transcript overlap** [P1]: hook stamps plus transcript prompts within ±5 s should produce one event each, with no double count.
4. **Subagents** [C-2/P2]: a subagent file with 15 minutes of work while the main file is silent should keep a single block, add the subagent tokens to cost, and add no human event.
5. **Forked session** [C-4/P4]: the same `uuid` and `message.id` copied into a second file with a different `sessionId` should count time and cost once.
6. **Pricing** [C-3/P3]:
   - each corpus model family should be priced, including cache read and write terms
   - `<synthetic>` lines should be skipped
   - an unknown model should give `unpriced_share > 0`, and `approve` should refuse it
7. **Blocks** [H-3/P5]:
   - a 40-minute agent tail after the last prompt should bill 30 minutes, with `agent_only_minutes` reported as 30
   - an 11-minute silence should split the block
   - `attachment`, `system` and `pr-link` stamps should not extend the block
   - a block crossing local midnight should split into two days, and a DST-change day should also be handled
8. **Cross-repo** [H-2/P7]: a client agent block overlapping a prompt in an unregistered repo should give the overlapping minutes to `internal` under `last-touch` and split them under `split-even`.
9. **Parallel worktrees** [P7]: the total should never exceed wall-clock minutes. `verify` should pass, and `verify` should fail on a tampered ledger.
10. **Matters** [M-1/P9]:
    - `pm_refs` should beat a `pr-link`, which should beat a branch rule
    - `HEAD` should resolve through the reflog, or fall to the default
    - 8 matters should be merged down to `max_per_day`
11. **Queued prompts** [M-2/P11]: an enqueue at t0 and a dequeue at t0+4m should give one human event at t0. A `remove` should cancel it.
12. **Canary** [M-3/P12]: 2% unknown lines should make `verify` fail, a newer `version` should give a warning, and an out-of-order file should give the same result as a sorted one.
13. **Nudge** [M-4/P8]: the output should be valid `systemMessage` JSON that names only the current client, be silent in an unregistered repo, and never read transcripts (asserted with a spy on `fs`).
14. **Lock** [M-5/P13]: 20 concurrent appends should produce 20 intact lines, and a stale lock from a dead PID should be broken.
15. **Config location** [M-6/P10]: `init` should write nothing to the repo except the gitignore line, and `verify` should fail if `timesheets/` is tracked.
16. **Rounding** [M-7/P14]: `client-day` versus `matter-day` should give the expected totals, and `rounding_added_minutes` should be correct.
17. **Privacy canary**: a canary string in a prompt should never appear in any output file or in the hook ledger.
18. **Approved immutability**: re-deriving an approved day should warn about drift and leave the entry unchanged.
19. **Performance** [H-1/P6]:
    - an incremental `collect` on a 10k-line append should take under 1 s
    - `hook prompt` should take under 50 ms
    - `nudge` should take under 500 ms
    - all timed on the fixture tree, with the thresholds scaled ×3 in CI

## Budgets

- New-code line coverage of at least 90% on `scripts/lib/time/`.
- Unit tests run in under 2 seconds, so they fit in oc-bug-check's commit gate.
- No snapshot tests: goldens are explicit expected files.
- Before Sprint 1 exits, a one-off **corpus replay**: run `collect` and `verify`
  against your real `~/.claude/projects`, locally and uncommitted. The canary
  must stay under 1% and the unpriced share must be 0.
