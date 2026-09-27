# oc-time-ops: sprint plan (Phase 4)

**Source documents:**
- `design/punch-list.md` (the scope; items A1–A19, B1–B15, C1–C8)
- `spec/06-testing.md` (fixtures #1–#19)
- `spec/02-architecture.md`

**Constraints:**
- Everything lands in `scripts/`, `tests/time/` and `docs/`, outside the frozen C1 paths.
- One PR per sprint, through the usual gates: oc-bug-check at commit time, then oc-docs-forge and oc-repo-ops before the PR.
- No PM ticket is linked, so nothing is written to a PM tool.

**Build order:** the order goes by data dependency, since there's no UI. Sprint 1
produces normalized events, Sprint 2 turns them into ledger entries, and Sprint 3
makes the output something you can use.

---

## Sprint 1: Collect & classify

**Goal:** turn your real transcripts into a trustworthy, de-duplicated, text-free event stream. A format check reports when that stream can't be trusted.

### Features
A1 paths, A2 config, A3 registry, A4 cursor, A5 classify, A6 transcripts, A7 queue, A8 prompt-hook merge, A9 canary, and C6 fixtures. It also includes the `hook prompt` handler (B14), because the hook must be installed early for its data to exist by dogfood time.

### Deliverables
- `scripts/lib/time/{paths,config,registry,cursor,classify,transcripts,canary}.mjs`
- `scripts/timesheet.mjs` with `collect` and `hook prompt` only
- `tests/time/fixtures/` builder: a synthetic `projects/` tree (session and subagent files, forks, queue operations, every envelope) plus a temp git repo
- `docs/plans/time-tracking/transcript-format.md` (C4)
- An internal command, `collect --report`, that prints canary and de-duplication statistics

### Test requirements
- Unit: classifier (06 #1), queue (#11), hook merge (#3), cursor (append, truncate, inode), canary threshold (#12), config validation
- Integration: forked-session de-duplication (#5), subagent attachment (#4), unordered file (#12), privacy canary (#17, at the event-cache level)

### Definition of done
1. Fixtures #1, #3, #4, #5, #11, #12 and #17 pass.
2. **Corpus replay** on the real `~/.claude/projects`:
   - canary under 1% unknown or quarantined
   - quarantined envelopes listed in `transcript-format.md`
   - full scan in 15 s or less
   - an incremental run after appending 10k lines in under 1 s
3. `hook prompt` finishes in under 50 ms (median of 20 runs), exits 0 when `~/.opchain` is unwritable, and writes no prompt text (checked with a grep for the canary).
4. Unit suite under 2 s, and coverage of the Sprint 1 modules at least 90%.

### Dependencies
None.

### Estimated effort
Claude: 6h. You: 0.5h, to review the replay report and install the UserPromptSubmit hook from the README snippet after merge, so that prompts start being captured.

---

## Sprint 2: Derive & ledger

**Goal:** turn events into correct, overlap-safe, priced draft entries in an append-only ledger. Correct means no minute is billed twice, no automated block is billed, and nothing is unpriced.

### Features
A10 blocks, A11 allocate, A12 matters, A13 pricing and cost, A14 rounding, A15 activity, A16 narrative, A17 ledger, A18 derive.

### Deliverables
- `scripts/lib/time/{blocks,allocate,matters,cost,rounding,activity,narrative,ledger,derive}.mjs`
- `scripts/lib/time/pricing.json` with **all 7 corpus model families**. Each row has `verified_on` and a `source` URL.
- Verbs `draft` (ledger events only; Markdown comes in Sprint 3) and `verify`
- `docs/plans/time-tracking/billing.example.yaml` (C2)

### Test requirements
- Unit:
  - blocks, including the tail cap, midnight and DST (#2, #7)
  - allocation under `last-touch`, `split-even` and `internal` (#8, #9)
  - matter precedence, `HEAD` and `max_per_day` (#10)
  - cost: cache terms, `<synthetic>`, unpriced (#6)
  - rounding scopes (#16)
  - ledger lock, fold and immutability (#14, #18)
- Integration: a golden day over the fixture tree gives expected `ledger.jsonl` events, and `verify` passes. A tampered ledger makes `verify` fail.

### Definition of done
1. Fixtures #2, #6–#10, #14, #16 and #18 pass.
2. Invariant property test: over 200 randomized multi-session days, allocated minutes are at most the wall-clock minutes the union covers, every time.
3. Corpus replay: `draft` over the last 14 real days finishes with `unpriced_share = 0` on every day, and the review numbers are printed with the block-model and human-cadence totals side by side.
4. The derivation is deterministic: running `draft` twice on the same day appends no new events.
5. Coverage of the Sprint 2 modules is at least 90%.

### Dependencies
Sprint 1 merged. **You:** confirm the 7 prices before the DoD run.

### Estimated effort
Claude: 8h. You: 0.5h, to verify prices against Anthropic's published pricing.

---

## Sprint 3: CLI, surfaces & dogfood

**Goal:** a complete daily loop (nudge, review, approve, export) on one real client repo.

### Features
A19 render, B1–B13 and B15, and C1, C3, C5 and C8.

### Deliverables
- `render.mjs`: every surface and state in `design/surfaces.md` §2–§6
- Verbs `init`, `review`, `edit`, `amend`, `add`, `approve`, `discard`, `export`, `today`, `spotcheck`, `nudge`, `help`
- `package.json` script `timesheet` (C1)
- `README.md` with a quick start, the daily loop and a `#hooks` snippet (C3)
- The runbook `docs/runbooks/time-tracking.md` (C5)

### Test requirements
- Golden output files for the Markdown (draft, approved, empty), review (normal plus 4 states), CSV, `today` and nudge (4 cases). Exact files, no snapshots.
- CLI integration over a temp HOME: `init → collect → draft → edit → add → approve → export → verify → spotcheck`, checking exit codes 0, 1 and 2.
- Fixture #13 (nudge: current client only, reads no transcripts, silent when unregistered), #15 (`init` writes only the gitignore line) and #19 (nudge under 500 ms).

### Definition of done
1. Every fixture #1–#19 passes (the full punch list, section D).
2. All output fits 100 columns with no colour-only meaning, checked by piping to a file.
3. **Dogfood day:** one real client repo is `init`ed, the SessionStart hook is installed, and one real day is drafted, reviewed, approved and exported. The CSV imports into your invoicing tool, or opens in a spreadsheet with the correct columns.
4. The README quick start works, checked by following it in a fresh temp HOME.

### Dependencies
Sprint 2 merged. **You:** pick the dogfood client repo and install the SessionStart hook.

### Estimated effort
Claude: 7h. You: 1h (hook install, dogfood day review, import check).

---

## After Sprint 3: dogfood period (2 weeks, not a sprint)

- Track the success metrics in `spec/00-project-overview.md`: weekly spotcheck, review time under 3 minutes, the coverage metric and the canary.
- Re-tune `agent_tail_cap_minutes` and `idle_minutes` from the side-by-side review numbers.
- Then decide on graduation to `skills/oc-time-ops` (spec 07 v2). That waits on OSS-split C2–C7.

## Totals

| Sprint | Claude | You |
|---|---:|---:|
| 1 Collect & classify | 6h | 0.5h |
| 2 Derive & ledger | 8h | 0.5h |
| 3 CLI, surfaces & dogfood | 7h | 1h |
| **Total** | **21h** | **2h** |

**Risks carried into the build:**
- The transcript format changes mid-build. The canary catches it; update the fixtures and `transcript-format.md`.
- Anthropic pricing changes. `verified_on` goes stale; re-verify at release.
- Your queue of concurrent sessions makes the `last-touch` allocation feel wrong. Switch to `split-even` in `billing.yaml`, no code change needed.
