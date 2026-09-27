# oc-time-ops: punch list (Phase 3d)

The punch list is the scope: if an item isn't here, it doesn't get built. The
sources are `spec/02-architecture.md` (P# = audit items) and
`design/surfaces.md` (§#). The in-chat review card is **out of scope**; the
design was approved without it on 2026-09-26.

## A. Library modules: `scripts/lib/time/`

| # | Module | Must do | States / edge cases | Tests (06 #) |
|---|---|---|---|---|
| A1 | `paths.mjs` | Resolve `~/.opchain/time/` (overridable with `OPCHAIN_TIME_HOME` for tests); create directories as `0700` and files as `0600` | Missing HOME; directory created on first use | CLI tier |
| A2 | `config.mjs` | Parse the YAML subset for `billing.yaml`; defaults; validation with line numbers | Unknown key → warning; bad type → exit 2; regex over 200 characters → error; `agent_tail_cap_minutes: null` allowed | 06 #15 |
| A3 | `registry.mjs` | Map repo root → client; `add`, `lookup(cwd)` through the git common dir; longest-prefix fallback | Unregistered → `internal`; deleted worktree | 06 #8 |
| A4 | `cursor.mjs` | Per-file `{inode, size, offset, mtime}` | File appended to; truncated (reset); inode changed (re-read); file deleted (drop) | 06 #19 |
| A5 | `classify.mjs` | The classifier table from 02 → *Event classification*; answer detection through a `tool_use_id` → tool-name map | All envelopes; `origin.kind` quirks; no `origin`; quarantine | 06 #1 |
| A6 | `transcripts.mjs` | Discover session and subagent files; stream from the cursor; normalize (no text); global `uuid` de-duplication; sort; per-event repo | Malformed JSON line → count and skip; line without a timestamp → skip; 219-style unordered files | 06 #4, #5, #12 |
| A7 | `queue.mjs` (inside A6) | enqueue → human event; `remove` cancels; the dequeued `user` line is marked as a duplicate | Enqueue without a dequeue | 06 #11 |
| A8 | `prompts-hook.mjs` | Merge `prompts.jsonl` with transcript events; hook wins within ±5 s | Hook missing on older days | 06 #3 |
| A9 | `canary.mjs` | Per-run counts of type, envelope, version and quarantine → `canary.json`; threshold check | Over 1%; untested version | 06 #12 |
| A10 | `blocks.mjs` | Allowed event types; idle split; midnight split (with timezone and DST); tail cap; `agent_only_minutes` | No human event → not billable; cap `null` | 06 #2, #7 |
| A11 | `allocate.mjs` | Global union; `last-touch` and `split-even`; `internal` bucket; invariant | Three-way overlap; zero-length intervals | 06 #8, #9 |
| A12 | `matters.mjs` | Precedence: `pm_refs` → `pr-link` → branch rules → default; `HEAD` via the reflog; `max_per_day` merge; `billable:false` | No checkpoint; reflog missing | 06 #10 |
| A13 | `pricing.json` + `cost.mjs` | Family-prefix match; cache terms; skip `<synthetic>`; global `message.id` de-duplication taking the max per field; `unpriced_share` | Unknown model; usage fields missing | 06 #5, #6 |
| A14 | `rounding.mjs` | `client-day` / `matter-day`; round up or to nearest; largest-remainder distribution; `min_minutes`; `rounding_added_minutes` | All matters under `min_minutes`; a single matter | 06 #16 |
| A15 | `activity.mjs` | Commits (author = you) per branch and time window; PR numbers from `pr-link` and commit subjects; skills run; count of files touched | No git; `gh` absent | CLI tier |
| A16 | `narrative.mjs` | Deterministic draft of 240 characters or fewer, from activity only | No activity → "Work on <matter>." | 06 #17 |
| A17 | `ledger.mjs` | Append with `O_EXCL` lock, 5 s retry and stale-PID break; fold events to state; ids; revisions; invariants; approved entries immutable | Concurrent writers; corrupt line → `verify` fails | 06 #14, #18 |
| A18 | `derive.mjs` | Orchestrates A6→A16 for a date; `derivation` hash; drift warning for approved days | Re-run gives no new events | 06 #18 |
| A19 | `render.mjs` | Markdown (§2: draft, approved, empty), review text (§3 plus its 4 states), `today` (§4), nudge JSON (§4, 4 cases), CSV (§5) | Width ≤ 100 columns; narrative wrap at 72; glyph rules (§1) | goldens |

## B. CLI verbs: `scripts/timesheet.mjs` (§1 exit codes: 0 / 1 / 2)

| # | Verb | Output (§) | Refusals and errors |
|---|---|---|---|
| B1 | `init --client --name --rate --repo` | §6 init block | Client exists → ask for `--force`; not a git repo → 2 |
| B2 | `collect` | `Collected N events from M files (Xs) · canary 0.3%` | None (always best effort) |
| B3 | `draft [date]` | Writes `timesheets/<date>.md`, then the §2 header line | Unregistered repo → 2; canary over threshold → `✗` with drafts still written |
| B4 | `review [date] [--quarantine]` | §3 | No drafts → hint |
| B5 | `edit <id> --hours/--matter/--narrative --reason` | `✓ edited r2` | Missing `--reason` → 2; approved entry → use `amend` |
| B6 | `amend <id> … --reason` | `✓ amended r3, re-approve required` | Entry not approved → use `edit` |
| B7 | `add --date --matter --hours --narrative --reason` | `✓ added <id>` | Hours not a 0.25 multiple → 2 |
| B8 | `approve <date\|id>` / `discard <id> --reason` | `✓ approved 3 · ✗ blocked 1` (§6) | Unpriced disbursement, canary failing → exit 1 per entry |
| B9 | `export --from --to [--out]` | §5 summary line | No approved entries → exit 1 with a hint |
| B10 | `today` | §4 | Silent when nothing today |
| B11 | `verify` | A `✓`/`!`/`✗` line per check (invariants, canary, tracked files, hashes) | Any `✗` → 1 |
| B12 | `spotcheck [--n 3]` | Sampled entries with raw evidence | No approved entries → hint |
| B13 | `nudge --cwd` | `{"systemMessage":…}` or nothing; cache only; 500 ms | Any error → silent, exit 0 |
| B14 | `hook prompt` | Appends to `prompts.jsonl`; no stdout; 50 ms | Any error → exit 0 |
| B15 | `help` / `--help` on every verb | Usage | — |

## C. Files and wiring

| # | Item |
|---|---|
| C1 | `package.json` script: `"timesheet": "node scripts/timesheet.mjs"` |
| C2 | `docs/plans/time-tracking/billing.example.yaml`, every key commented (copied by `init`) |
| C3 | `docs/plans/time-tracking/README.md`: quick start, the daily loop (§7), `#hooks` section with the exact `~/.claude/settings.json` snippet |
| C4 | `docs/plans/time-tracking/transcript-format.md`: observed shapes and canary thresholds |
| C5 | `docs/runbooks/time-tracking.md`: wrong day, amend, restore the ledger, canary failure |
| C6 | `tests/time/fixtures/`: a synthetic `projects/` tree plus a git-repo builder |
| C7 | `.gitignore` in opchain: nothing new (all state is under `~/.opchain`) |
| C8 | Hook install: **manual**, from README C3, with your consent. The build never edits `~/.claude/settings.json` |

## D. Exit criteria for the whole punch list

- Every fixture in `spec/06-testing.md` (#1 to #19) passes.
- Coverage of `scripts/lib/time/` is at least 90%, and the unit suite runs in under 2 s.
- A corpus replay on your real `~/.claude/projects` keeps the canary under 1% with 0% unpriced.
- One real day with a real client repo has been drafted, reviewed, approved and exported.

**Totals:** 19 modules, 15 verbs, 8 wiring items and 19 fixture groups.
