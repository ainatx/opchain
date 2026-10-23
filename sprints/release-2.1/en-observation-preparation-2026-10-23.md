# EN observation preparation — October 23, 2026

**Preparation only.** No October 27 measurement or verdict is claimed. The
[approved EN-01/EN-02 criteria](ow-family-sprint-plan.md#en-01-sprint-e1-consumer-enrollment-and-the-measurement-week)
and [October 8 baseline](../../docs/audits/2026-10-08-opchain-effectiveness-audit.md)
remain unchanged. The observation window is **October 19 00:00 inclusive through
October 27 00:00 exclusive, America/Chicago**:
`[2026-10-19T05:00:00.000Z, 2026-10-27T05:00:00.000Z)`.

## Preserved tooling and adaptations

The recovered JavaScript originals remain unchanged in ignored
`scratch/en01-recovered-audit/`. Verified private copies, adapters and synthetic
tests are in ignored `scratch/en-observation-private/` in the prepared checkout.
Preserve that directory before removing this worktree; it is intentionally not
part of the product or Git history. Its `originals/SHA256.json` records:

| Original | SHA-256 |
|---|---|
| `scan.mjs` | `56e86bfcca5641cee957ec9d9f733d7f290374746765a9db6e6d828b32af1fce` |
| `agg.mjs` | `642055c6cc2421a3ace91ee88ccfbad3e16808c59a72f726ba9d8f29e3d42f28` |
| `codex-scan.mjs` | `6476b8847e16287f46c6155a7730eb822761a973c1ffcf6e77382f8d5e8c7909` |

`prepare-adapters.mjs` verifies those originals and refuses to replace changed
copies or adapters. Each scan requires a new output directory and writes window,
source/adapter hashes, generation time, scope and exclusion metadata. Missing or
invalid event timestamps are counted separately and excluded; no timestamp is
inferred from a filename. Source files are read only.

| Adapter | Scope and boundary |
|---|---|
| `claude-windowed.mjs` + `agg-windowed.mjs` | Original Claude project-directory selection and counters; include records by parsed `timestamp`, even when their session began before the window. Original pricing/sample fields remain historical proxies, not current price claims. |
| `codex-windowed.mjs` | Enumerate `.codex/sessions` JSONL without the original hard-coded September 28–October 8 filename filter. Attribute using session metadata, including pre-window metadata as context only; select observations by `timestamp`. Daily counts use the event's Chicago date. |
| `evidence-windowed.mjs` | Resolve each checkout's Git common directory; recursively read canonical receipts under `opchain/verification-receipts/v1/<tree>/<policy>/<run>.json` by `verified_at`, and bypass records by `at`. Validate receipts and report invalid records. Keep all-verdict and PASS/FAIL denominators separate. |
| `route-windowed.mjs` | Select existing `type: outcome` records by parsed `at`, keeping their fields unchanged. Feed this file to the existing `route-eval outcomes`; do not change its proxy definitions or explicit-mention exclusion. |

The original receipt-analysis script was **not** among the three recovered
scripts. The finite receipt collector is an explicitly new observation adapter,
not a recovered replica or a complete fix-1–3 verdict. The original router
evaluator supports `--since` but no upper bound, which is why its input is first
filtered to the closed observation period.

## Codex mapping and exclusions

Keep the original Claude strata and deftwright Codex stratum separate. The new
opchain Codex stratum is **supplemental**: the baseline has no matching opchain
Codex row. A session whose metadata identifies deftwright is not also counted in
the supplemental opchain stratum. Work performed for another repository from an
opchain-rooted session still needs private adjudication; cwd is attribution
context, not proof of every command's target.

A bounded inspection of one current Codex rollout confirmed timestamped
`response_item` function/custom tool calls, including `exec` code, and both
`token_usage_record` and `token_count` formats. The retained legacy expressions
count tool-input **candidates**, including commands embedded in JavaScript; they
do not establish execution or success. SKILL.md path matches are file-read
proxies, not Claude `Skill` invocations. The original additive token counters may
double-count current mirrored usage and must not be published as unique token
totals. No new criterion or conversion rate is inferred from the Codex takeover.

The **actual installed Codex bridge was inspected**, including enabled
`opchain@personal` configuration and trusted hook entries. Its upstream checkout
is `~/repos/opchain-router` at `754be8c54cd28af67537963f9ef57c65278dc589`;
the installed cache also contains additional `codex-adapter.cjs` and
`lib/codex-transcript.cjs` files. Six inspected bridge files and their SHA-256
manifest are preserved privately in `bridge-snapshot/`; the source commit alone
does not identify these added adapter bytes.

The bridge converts executed `CommandExecution` events, or direct shell-call
attempts when no execution events are available, to the upstream raw-command
format. It never parses `exec` JavaScript as executed commands and records
successful instruction reads as `SkillRead`, never `Skill`. Read observations
cover a bounded transcript tail and are kept outside follow-rate metrics. It
uses **`~/.codex/opchain-route/routes.jsonl`** and a separate
`observations.jsonl`, never the Claude log. Both exist; a bounded schema-only
sample showed live routing and instruction-read-only observations. That check
does not establish uninterrupted coverage or complete outcome pairs.

Run the unchanged evaluator separately for Claude and Codex logs. Codex's
native `skill_calls` denominator differs, and its bridge defaults to the owner's
explicitly authorized **live** mode; do not merge it into the eight-day Claude
shadow cohort or treat personal live authorization as the release's GO. Do not
manufacture equivalent invocations from `observations.jsonl`.

The scanners retain their original active transcript roots; archived/moved
sessions, unselected Claude project directories and undecodable records are not
silently added. Review coverage and exclusions before publishing a comparison.
Raw transcripts, tool inputs, command candidates, excerpts, local paths and
record-level outputs stay private. Only reviewed aggregates and redacted
findings belong in a tracked audit or changelog.

## Execute after the window closes

Run from the prepared checkout at or after **October 27 00:00 Chicago**. These
commands create a fresh private output root. They have not been run against the
current observation corpus as part of this preparation.

```sh
set -e
umask 077
EN_PREP="$PWD/scratch/en-observation-private"
mkdir -p "$HOME/.codex/private-observations"
EN_OUT=$(mktemp -d "$HOME/.codex/private-observations/en-2026-10-27.XXXXXX")
node "$EN_PREP/prepare-adapters.mjs"
node --test "$EN_PREP/window.test.mjs"
node "$EN_PREP/claude-windowed.mjs" "$EN_OUT/claude" > "$EN_OUT/claude-scan.txt"
node "$EN_PREP/agg-windowed.mjs" "$EN_OUT/claude" > "$EN_OUT/claude/aggregate-console.txt"
EN_REPO=deftwright node "$EN_PREP/codex-windowed.mjs" "$EN_OUT/codex-deftwright"
EN_REPO=opchain node "$EN_PREP/codex-windowed.mjs" "$EN_OUT/codex-opchain-supplemental"
node "$EN_PREP/evidence-windowed.mjs" "$EN_OUT/evidence" \
  "$HOME/deftwright-site" "$HOME/opchain" "$HOME/repos/opchain"
EN_ROUTE_HOST=claude node "$EN_PREP/route-windowed.mjs" \
  "$HOME/.claude/opchain-route/route-log.jsonl" "$EN_OUT/router-claude"
node scripts/route-eval.mjs outcomes --log "$EN_OUT/router-claude/outcomes.jsonl" \
  --report "$EN_OUT/router-claude/outcomes.md" > "$EN_OUT/router-claude/evaluator-console.txt"
EN_ROUTE_HOST=codex node "$EN_PREP/route-windowed.mjs" \
  "$HOME/.codex/opchain-route/routes.jsonl" "$EN_OUT/router-codex"
node scripts/route-eval.mjs outcomes --log "$EN_OUT/router-codex/outcomes.jsonl" \
  --report "$EN_OUT/router-codex/outcomes.md" > "$EN_OUT/router-codex/evaluator-console.txt"
```

The transcript roots can be explicitly overridden with `EN_CLAUDE_ROOT` and
`EN_CODEX_ROOT` for a preserved private snapshot. The three repository paths
above exist and resolve to distinct Git common directories as inspected on
October 23. Any missing root, altered script checksum, source change during the
route-log read, invalid receipt or coverage gap needs resolution or a stated
limitation; an empty input is not a passing result.

## Evidence still required

1. **EN-01 fix 1:** exit-127 count, FAIL share below 15%, and the baseline's
   manual-rerun observations. Reconcile diagnostics for blocked preconditions
   that intentionally produce no receipt; receipt-only zeroes cannot prove no
   environment failures. Record the denominator and new verdict statuses.
2. **EN-01 fix 2:** privately join each actual successful `--no-verify` command
   to its commit, durable bypass record and checkpoint `bypasses[]`. Candidate
   text matches, failed commands and a current checkout's checkpoint snapshot
   are insufficient by themselves.
3. **EN-01 fix 3:** establish enrollment/consumer `evidence:pr` CI configuration,
   first-commit receipt coverage, per-PR docs/readiness handoffs above zero and
   measured per-PR tax. Include earlier valid receipts legitimately reused by an
   in-window commit; the receipt event-window extract alone cannot prove this.
4. **EN-02:** preserve the actual evaluator report and its three numbers:
   at least 30 suggestions, core proxy precision at least 0.8, non-pipeline
   silence at least 0.95. Explicit mentions remain excluded by the evaluator.
   Insufficient shadow observations are not a GO; report Codex live-mode and
   host-proxy differences separately.
5. Normal-use evidence through the window and the owner's separate REL-02
   real-job outcomes remain necessary. EN-01 misses are recorded findings under
   the approved plan, not silently changed criteria; EN-02's verdict and shipped
   default shadow mode must be stated in the release changelog.

Validation on October 23: **9 synthetic tests passed**, covering both time
boundaries, equivalent offsets, misleading filenames, pre-window session
context, separate Codex strata, unchanged input hashes, canonical receipt
selection, empty inputs, explicit router outcomes, installed-bridge read versus
execution semantics and overwrite refusal.
All **15 preserved/adapted JavaScript files** passed `node --check`; the three original
checksums matched. No broad private scan, interim router rerun, enrollment
change, mode change, checkpoint update or final verdict was performed.
