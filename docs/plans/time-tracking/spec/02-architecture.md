# 02 — Architecture

> Revised 2026-09-26 to apply every item in `../audit-2026-09-26.md`. Punch-list
> item numbers appear as **[P#]**. The corpus figures quoted here come from that
> audit: 3,375 transcript files, 367k lines.

## System diagram

```
 UserPromptSubmit hook ─┐  (primary human-event signal [P1])
                        ▼
 ~/.claude/projects/**/*.jsonl  ──►  collect (incremental cursor [P6])
   session files + <session>/subagents/*.jsonl [P2]
   de-dup: uuid global, message.id global [P4]
                        │ normalized events (no prompt text)
                        ▼
              ~/.opchain/time/events/  (derived cache, all projects [P7])
                        │
   git log · pr-link · checkpoint pm_refs ──►  derive
   ~/.opchain/time/<client>/billing.yaml [P10]     1. blocks per session (typed allowlist, midnight split, tail cap [P5])
   ~/.opchain/time/registry.json                   2. global union over ALL projects; unregistered = internal [P7]
                                                   3. allocate minutes → client × matter (precedence [P9])
                                                   4. round per rounding_scope [P14] · price tokens [P3]
                        ▼
   ~/.opchain/time/<client>/ledger.jsonl  (append-only, O_EXCL lock [P13])  ◄── review / edit / approve
                        ▼
   <repo>/timesheets/YYYY-MM-DD.md (gitignored) · export CSV · nudge (systemMessage, cache-only [P6][P8])
```

## Components (`scripts/lib/time/`)

| Module | Responsibility |
|---|---|
| `config.mjs` | Parse and validate `~/.opchain/time/<client>/billing.yaml` [P10], apply defaults, report errors with line numbers |
| `registry.mjs` | `~/.opchain/time/registry.json`: repo root → client id. The repo itself holds no billing files [P10] |
| `cursor.mjs` | Per-file `{inode, size, offset, mtime}` in `~/.opchain/time/cursor.json`. Truncation or a new inode triggers a re-read [P6] |
| `transcripts.mjs` | Discover session and subagent files [P2]; stream-parse from the cursor; classify; de-duplicate [P4]; sort events after parsing [P12]; resolve `cwd` → repo for each event |
| `classify.mjs` | Human-event classifier and machine-envelope list [P1]; format canary counts [P12] |
| `prompts-hook.mjs` | UserPromptSubmit hook: appends `{ts, session_id, cwd}` to `~/.opchain/time/prompts.jsonl`, with no prompt text [P1] |
| `blocks.mjs` | Block construction, midnight split and tail cap [P5] |
| `allocate.mjs` | Global interval union and overlap policy [P7] |
| `matters.mjs` | Matter precedence resolution [P9] |
| `cost.mjs` | Global de-duplication, family-prefix pricing, cache multipliers, unpriced share [P3][P4] |
| `activity.mjs` | Commits, PRs, skills run and files touched per matter-day |
| `narrative.mjs` | Deterministic narrative draft from activity. Claude refines it during review |
| `ledger.mjs` | Append-only log with lock [P13]; folds to the current state of each entry; checks invariants |
| `render.mjs` | Markdown timesheet, CSV, nudge JSON |
| `scripts/timesheet.mjs` | CLI entry point (`npm run timesheet -- <verb>`) |

## Collection

**Files [P2].** Two kinds of file are collected:
- `~/.claude/projects/<proj>/<session>.jsonl` (session files)
- `~/.claude/projects/<proj>/<session>/subagents/*.jsonl` (subagent files, 3,118 of the 3,375 files)

A subagent's events are attached to the **parent session**, taken from the
directory name. Subagent lines count for cost and for block continuity, never as
human events.

**Scope [P7].** Every project directory is scanned, not just registered repos, so
allocation can see all the work you were doing. Unregistered repos resolve to the
non-billable bucket `internal`.

**Incremental [P6].** The cursor resumes each file at its last offset. The first
full scan takes about 9 s; each run after that reads only appended bytes. `nudge`
never touches transcripts; it reads only the derived cache and the ledger, and it
has a 500 ms budget.

**De-duplication [P4].** Resumed and forked sessions copy history into new files:
4,875 duplicate `uuid`s and 1,121 duplicate `message.id`s. So:
- Events are keyed by `uuid` globally, and the first file seen wins.
- Cost is keyed by `message.id` globally, taking the **maximum of each usage
  field**. This is the lesson from the 13× report bug, now applied across files
  rather than per session.

**Ordering [P12].** 219 files are not in timestamp order, so events are always
sorted after parsing and nothing depends on file order.

**Per-event repo.** 130 sessions change `cwd` partway through, so each event's
own `cwd` is resolved through `git -C <cwd> rev-parse --git-common-dir`. That
makes worktrees resolve to their main repo. A missing directory falls back to
the longest registered path prefix, then to `internal`.

## Event classification [P1]

Transcripts are **backfill**. The primary human signal is the UserPromptSubmit
hook ledger (`prompts.jsonl`). It fires on submitted prompts only, not on
background-task notifications, scheduled tasks or CI events. When both sources
cover a session, the hook timestamps are authoritative and transcript prompts
within ±5 s of a hook timestamp are dropped as duplicates.

Transcript classifier, applied to `type:"user"` lines that are not `isMeta`:

| Rule (in order) | Class |
|---|---|
| `isCompactSummary` or `isVisibleInTranscriptOnly` | machine |
| Content begins with a **machine envelope**: `<task-notification`, `<scheduled-task`, `<ci-monitor-event`, `<cross-session-message`, `<local-command-stdout`, `<local-command-stderr`, or is *only* `<system-reminder>…</system-reminder>` | machine. `origin.kind` is ignored here, because it says `human` on 69 scheduled-task, 37 CI and 68 system-reminder lines |
| Content begins with a **user-initiated envelope**: `<command-name>`, `<command-message>`, `<bash-input>`, `<create-pr-command>`, `[Request interrupted by user` | human_prompt |
| `origin.kind == "human"` and the content does not begin with `<` | human_prompt |
| No `origin` field (older clients; 173 lines) and the content does not begin with `<` | human_prompt |
| `tool_result` whose `tool_use_id` matches an `AskUserQuestion` or `ExitPlanMode` call | human_answer |
| Anything else that begins with `<` | **quarantine**: not billable; counted in the canary and listed in `review` |

**Queued prompts [P11].** A `queue-operation` line with `operation:"enqueue"` is
a human event **at the enqueue time**. A matching `remove` cancels it. The later
dequeued `user` line is recorded as a duplicate, not as a second event.

**Format canary [P12].** Each run records:
- counts of each entry `type`
- counts of each envelope
- the `version` range seen
- the quarantine count

`verify` fails when unknown types plus quarantined lines exceed **1%** of that
day's user lines. It also fails when a `version` newer than the newest one
covered by the fixtures appears; that warning is cleared by adding a fixture.

Only these fields are kept: `ts, uuid, session, parent_session, repo, branch,
class, message.id, model, usage, skill, pr`. **Prompt text is used to classify
and then dropped. It is never stored**, and a canary-string test enforces this.

## Engaged time: session blocks [P5]

Per session, the parent and subagent events are merged. Only these types extend
a block:
- `user` lines of every class, including machine and tool_result, since they mark
  session activity
- `assistant` lines, from the session or from subagents
- `queue-operation` enqueue

`attachment`, `system`, `pr-link`, `file-history-*` and every entry without a
timestamp are **excluded**. Hook stamps and snapshots must not stretch time.

```
split into blocks where the gap between consecutive block events > IDLE
split every block at local midnight (billing.yaml timezone)       # 13 blocks crossed midnight
a block is billable iff it contains ≥ 1 human event
engaged(block) = [first_event, min(last_event, last_human + TAIL_CAP)]
agent_only_minutes = engaged_end − last_human   (reported per entry)
```

- `IDLE` = `idle_minutes`, default 10.
- `TAIL_CAP` = `agent_tail_cap_minutes`, **default 30**; `null` removes the cap.
  Without a cap the block model measured 157h against 90h for human cadence on
  the corpus. With the cap, a prompt followed by a two-hour autonomous run bills
  about 30 minutes plus whatever runs before your next prompt.
- **Dogfood instrument:** `review` shows each day's total under this model and
  under human cadence side by side, so the default can be re-tuned from data.
- Subagent activity counts for continuity, so a 15-minute subagent run no longer
  splits the block.

## Allocation across sessions and repos [P7]

Blocks from **all projects** are unioned per day, so every wall-clock minute is
assigned at most once. When sessions overlap, `overlap:` in `billing.yaml` decides:

| Policy | Rule | Trade-off |
|---|---|---|
| `last-touch` (default) | The minute goes to the session with the most recent human event at that minute | Simple and "where your attention was". A long agent run in session A is given to session B from the moment you prompt B |
| `split-even` | Overlapping minutes are divided equally among the covering sessions | Fairer to parallel agent runs, but the attribution is fractional |

An `internal` (unregistered) session competes like any other session, so
personal or opchain work never quietly becomes client time. Invariant, checked
by `verify`: Σ allocated minutes per day ≤ the wall-clock minutes the union
covers.

## Matter resolution [P9]

Each event's matter is taken from the first source that resolves:

1. **Checkpoint `pm_refs`** in the event's repo, from the ticket with role `source`
   or `child`, active at that time.
2. **`pr-link`** entries in the session (3,387 in the corpus). The PR's branch and
   title are matched against ticket patterns in `billing.yaml` `matters.ticket`.
3. **Branch rules**, first match wins. `gitBranch:"HEAD"` (detached; 2,555 lines)
   is resolved through `git reflog` at the event time and falls through if still
   unresolved.
4. `matters.default` (e.g. `general`).

```yaml
matters:
  ticket: '(ACME-\d+)'                       # applied to pm_refs, PR branch + title, branch
  rules:
    - branch: '^chore/deps'
      billable: false
  default: general
  max_per_day: 6                              # more matters → the smallest merge into default
```

Rule regexes are compiled with a 200-character cap and run only on branch names
and PR titles, which bounds ReDoS exposure.

## Rounding & pass-through

- **[P14]** `rounding_scope: matter-day | client-day`, default `client-day`. Raw
  minutes are rounded **up** to `increment_hours` (0.25) once per scope, and time
  is then distributed to matters in proportion to their raw minutes. Every entry
  shows `rounding_added_minutes`. A raw total under `min_minutes` (3) goes to the
  non-billable list.
- **[P3] AI cost:**
  - Pricing comes from `scripts/lib/time/pricing.json`. Entries are keyed by
    **model-family prefix**, and each entry carries `input`, `output`,
    `cache_read_mult` (0.10), `cache_write_5m_mult` (1.25), `cache_write_1h_mult`
    (2.00), `verified_on` and `source`.
  - The cost formula is ported from `reports/token-usage/generate.py`
    `entry_cost`, including the cache terms.
  - `<synthetic>` model lines are skipped.
  - A model with no family match is **unpriced**. Each disbursement line shows
    `unpriced_share`. `approve` **refuses** a disbursement whose
    `unpriced_share > 0` until pricing is fixed or you discard the line.
  - The table must list every model in the corpus before Sprint 1 exits:
    `claude-opus-5`, `claude-opus-5-5`, `claude-sonnet-5`, `claude-fable-5`,
    `claude-fable-5-1`, `claude-opus-4-8` and `claude-haiku-4-5`.
  - Prices come from Anthropic's published pricing on the day they're entered;
    none are guessed. Note that `skills/oc-claude-api/references/model-routing.md`
    has no Claude 5-family rows either.
  - The `ai_cost` modes are `none`, `pass-through` and `markup`. The basis is
    `api-list`, and each line carries the label "list-price equivalent".

## Data model

### `~/.opchain/time/` layout [P10]

```
~/.opchain/time/
  registry.json            { "/Users/me/repos/acme-app": "acme", ... }
  cursor.json              per-file read offsets
  prompts.jsonl            UserPromptSubmit stamps {ts, session_id, cwd}
  events/YYYY-MM.jsonl     normalized event cache (derived; rebuildable while transcripts exist)
  canary.json              last run's format counts
  acme/
    billing.yaml           client, rate, matters, policies
    ledger.jsonl           append-only (0600)
    ledger.lock            O_EXCL lock [P13]
    exports/
```

Each client repo gets one gitignored line, `timesheets/`, and nothing else [P10].

### `billing.yaml`

```yaml
version: 1
client: { id: acme, name: "Acme Corp" }
rate: { hourly: 175, currency: USD }
increment_hours: 0.25
rounding: up                 # up | nearest
rounding_scope: client-day   # client-day | matter-day
min_minutes: 3
idle_minutes: 10
agent_tail_cap_minutes: 30   # null = uncapped
overlap: last-touch          # last-touch | split-even
timezone: America/Chicago
matters: { ticket: '(ACME-\d+)', rules: [...], default: general, max_per_day: 6 }
ai_cost: { mode: pass-through, basis: api-list, markup_pct: 0 }
```

### Ledger events (`<client>/ledger.jsonl`)

```json
{"v":1,"at":"2026-09-26T23:10:00Z","event":"entry.drafted","entry":"acme-2026-09-26-ACME-42-t",
 "type":"time","date":"2026-09-26","client":"acme","matter":"ACME-42","matter_source":"pr-link",
 "raw_minutes":97,"agent_only_minutes":22,"rounding_added_minutes":8,"hours":1.75,"rate":175,
 "narrative":"…","sources":{"sessions":2,"commits":3,"prs":[42],"skills":["oc-app-architect"]},
 "derivation":"sha256:…"}
{"v":1,"at":"…","event":"entry.drafted","entry":"acme-2026-09-26-ai","type":"disbursement",
 "amount":4.10,"basis":"api-list","label":"AI compute (list-price equivalent)","unpriced_share":0.0,"derivation":"sha256:…"}
{"v":1,"at":"…","event":"entry.edited","entry":"…","changes":{"hours":2.0},"reason":"reading before first prompt"}
{"v":1,"at":"…","event":"entry.manual","entry":"acme-2026-09-26-m1","type":"time","matter":"ACME-42","hours":0.5,"narrative":"…","reason":"claude.ai/code cloud session"}
{"v":1,"at":"…","event":"entry.approved","entry":"…","revision":2}
{"v":1,"at":"…","event":"entry.discarded","entry":"…","reason":"personal"}
```

**Rules:**
- Drafts for a day can be **re-derived**: a newer `entry.drafted` replaces an
  unapproved draft with the same id, and the `derivation` hash makes re-runs
  idempotent.
- Once an entry is `approved` it changes only through `entry.amended` followed by
  a new approval, so history is never rewritten.
- Re-deriving an approved day gives a drift warning and never overwrites it.
- **[P13] Locking:** every append takes `ledger.lock` with `O_EXCL`, retries with
  backoff for up to 5 s, and releases in `finally`. A lock older than 60 s held by
  a dead PID is broken.

### CSV export (approved only)

`date,client,matter,type,hours,rate,amount,currency,narrative,entry_id,revision,raw_minutes,label`

## CLI surface (dogfood)

| Verb | What it does |
|---|---|
| `init --client acme --repo <path>` | Creates `~/.opchain/time/acme/billing.yaml`, registers the repo and gitignores `timesheets/` |
| `collect` | Runs an incremental transcript read and updates the event cache and canary |
| `today` | `Today 2.75h draft · ACME-42 1.75h, general 1.0h · AI $4.10 (list-price eq.)` |
| `draft [date]` | Runs `collect`, derives, appends drafts and renders `timesheets/<date>.md` |
| `review [date]` | Prints drafts with evidence, both engagement models side by side, the quarantine list and rounding added |
| `edit <entry> --hours --matter --narrative --reason` | Appends `entry.edited` |
| `add --date --matter --hours --narrative --reason` | Appends `entry.manual` for work with no local transcript, such as cloud or web sessions [P15] |
| `approve <date\|entry>` / `discard <entry>` | Appends status events. `approve` refuses disbursements that are partly unpriced |
| `export --from --to [--out]` | CSV of approved entries |
| `verify` | Checks the invariants (no minute billed twice, approved entries immutable, derivation hashes), the format canary and that no billing file is tracked by git |
| `spotcheck [--n 3]` | Samples approved entries and prints their raw evidence (git and transcript events) for a weekly audit [P15] |
| `nudge` | Hook output: a `{"systemMessage": …}` for the **current repo's client only**, read from cache, silent otherwise [P8] |
| `hook prompt` | UserPromptSubmit handler: appends to `prompts.jsonl` and exits 0 in under 50 ms [P1] |

**Nudge [P8]:** the output is JSON `systemMessage`, which you see but the model
doesn't. It never names another client, and it prints nothing in unregistered
repos.

Future skill verbs, after the freeze: `/oc-time`, `/oc-time review`, `/oc-time approve`, `/oc-time export`.

## Spec-gate decisions (2026-09-26)

1. **AI cost basis:** `api-list`, and every line is labelled "list-price equivalent". Revisit before anything goes on a real invoice: on a subscription the per-token cost is notional (ABA Formal Opinion 512 is a relevant caution; not legal advice).
2. **Storage:** everything lives under `~/.opchain/time/`, including `billing.yaml` per [P10]. The repo holds only the gitignored `timesheets/`.
3. **Engagement model:** session blocks with agent runtime included, subagent continuity, and `agent_tail_cap_minutes: 30` as the default per [P5]. That default is the only change from the gate answer, and it's surfaced for re-approval.
4. **Name:** `oc-time-ops`, verb `/oc-time`.
