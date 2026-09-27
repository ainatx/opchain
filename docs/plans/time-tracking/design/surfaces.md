# oc-time-ops: surface design (Phase 3)

This is a CLI tool with no web UI, so the "style book" is a set of output
conventions and the "wireframes" are exact renderings. Mock data is realistic:
one consultant, a client **Meridian Freight** (`meridian`, repo
`~/repos/meridian-dispatch`), $175/h, and Monday 2026-09-28.

## 1. Output conventions (the style book)

| Token | Rule |
|---|---|
| **Hours** | Always `0.00h` with two decimals, in 0.25 steps. Raw time is always `Hh MMm`, e.g. `1h 58m`. The two formats are never mixed in one column |
| **Money** | `$1,234.56` with the currency from `billing.yaml`. AI lines always end in `(list-price eq.)` |
| **Status** | `DRAFT`, `APPROVED`, `DISCARDED` or `AMENDED`, uppercase, always the first column |
| **Severity glyphs** | `✓` pass, `!` needs attention (the user can proceed), `✗` blocked (the command refuses). There's no colour-only meaning, so output stays readable when piped and in plain text |
| **Evidence** | Indented under the entry, prefixed `·`, capped at 5 lines, with `+N more` after that |
| **Width** | Tables fit 100 columns; narratives wrap at 72 |
| **Ids** | `<client>-<date>-<matter>-t` for time, `-ai` for disbursement, `-mN` for manual. Commands accept a unique prefix |
| **Voice** | Terse. States what happened, then the next command. No exclamation marks |
| **Exit codes** | `0` ok, `1` refused (a `✗` item), `2` usage or config error. Hooks always exit `0` |

## 2. Daily timesheet: `<repo>/timesheets/2026-09-28.md` (gitignored)

### Draft state

```markdown
# Timesheet · Meridian Freight · Mon 2026-09-28

**DRAFT** · 3.50h · $612.50 time + $6.42 AI (list-price eq.) · 3 entries awaiting review
Rate $175.00/h · 0.25h, rounded up per client-day · tz America/Chicago

| Status | Matter  | Raw     | Hours | Amount  | Narrative |
|--------|---------|---------|------:|--------:|-----------|
| DRAFT  | MER-214 | 1h 58m  | 2.00h | $350.00 | Carrier rate-card import: designed CSV schema, built parser + validation, opened PR #88. |
| DRAFT  | MER-221 | 1h 01m  | 1.00h | $175.00 | Fixed timezone bug in dispatch ETA calculation; added regression tests. |
| DRAFT  | general | 0h 23m  | 0.50h |  $87.50 | Dependency review and CI triage. |
| DRAFT  | AI      | —       | —     |   $6.42 | AI compute (list-price equivalent): 2.1M tokens, 3 models. |

Rounding added 8m (client-day total 3h 22m → 3.50h).
Agent-only time included: 34m (MER-214). Human-cadence estimate: 2h 11m.

Review: `npm run timesheet -- review 2026-09-28`
```

Client-day rounding distributes 14 quarter-hours across matters by largest
remainder. Individual matters can therefore move slightly down (MER-221: 1h 01m
became 1.00h), but the day total only rounds up. The Markdown shows the day
total, not per-matter deltas, so this doesn't look like an error.

### Approved state

The header becomes `**APPROVED** 2026-09-28 18:40 · 3.75h …`. Edited entries
show `AMENDED r2`, and an edit is noted under the table: `MER-214 +0.25h: reading
spec before first prompt`.

### Empty state (no client work that day)

```markdown
# Timesheet · Meridian Freight · Sat 2026-09-26

No billable activity found in local Claude Code sessions.
Worked in a cloud session? `npm run timesheet -- add --date 2026-09-26 --matter <m> --hours <h> --narrative "…"`
```

## 3. `review 2026-09-28` (terminal): where approval decisions happen

```
Meridian Freight · Mon 2026-09-28 · DRAFT 3.50h · $612.50 + $6.42 AI (list-price eq.)

  meridian-2026-09-28-MER-214-t   DRAFT   2.00h   raw 1h 58m   agent-only 34m   source pr-link #88
    Carrier rate-card import: designed CSV schema, built parser + validation, opened PR #88.
    · 2 sessions (09:12–10:31, 14:05–14:44) · 7 prompts · 2 answers
    · commits a41c9e2 "feat: rate-card parser", 0d7713b "test: rate-card fixtures"
    · skills oc-app-architect, oc-bug-check
    · 11 files touched

  meridian-2026-09-28-MER-221-t   DRAFT   1.00h   raw 1h 01m   agent-only 0m    source branch fix/MER-221-eta-tz
    Fixed timezone bug in dispatch ETA calculation; added regression tests.
    · 1 session (15:10–16:11) · 9 prompts
    · commit 5be20f1 "fix: ETA uses carrier-local tz"

  meridian-2026-09-28-general-t   DRAFT   0.50h   raw 0h 23m   agent-only 0m    source default
    Dependency review and CI triage.
    · 1 session (08:41–09:04) · 3 prompts

  meridian-2026-09-28-ai          DRAFT   $6.42   list-price eq.   unpriced 0%
    · claude-opus-5-5 $4.90 · claude-sonnet-5 $1.21 · claude-haiku-4-5 $0.31 (incl. subagents 48%)

  Day totals   block model 3h 22m   human cadence 2h 11m   rounding +8m
  Overlap      0m shared with other sessions · 41m internal (opchain) excluded
  ! Quarantined 1 line (unknown envelope <artifact-comment>) · details: review --quarantine
  ✓ Format canary 0.3% unknown

Next: approve 2026-09-28 · edit <id> --hours 2.25 --reason "…" · discard <id> --reason "…"
```

**States:**

| State | Rendering |
|---|---|
| Unpriced AI | `✗ meridian-2026-09-28-ai unpriced 12% (claude-opus-6: no price). approve will refuse this line; add a price to pricing.json or discard it.` |
| Canary over the threshold | `✗ Format canary 2.4% unknown (> 1%). Transcript format may have changed; drafts are unreliable. See transcript-format.md.` Approval is refused for the day |
| Already approved and the new derivation differs | `! Approved 2026-09-28 r1; a re-derivation now gives 3.25h (−0.25h). Approved entry unchanged. amend <id> to change it.` |
| No drafts yet | `No drafts for 2026-09-28. Run: draft 2026-09-28` |

## 4. `today` and `nudge`

`today` (terminal, any time):

```
Today (Tue 09-29) · meridian 2.25h draft so far · MER-214 1.50h, general 0.75h · AI $3.10 (list-price eq.)
```

`nudge` is SessionStart hook output. It's a JSON `systemMessage` that you see and
the model doesn't, and it names only the current repo's client:

| Situation | Message |
|---|---|
| Unapproved past days | `oc-time · meridian: 2 days awaiting approval (09-25, 09-28, 6.75h) · review 2026-09-25` |
| Everything approved, time today | `oc-time · meridian: 1.25h draft today` |
| Canary failing | `oc-time · meridian: ✗ transcript format check failing, run verify` |
| Unregistered repo, nothing today, or cache missing | *(no output)* |

## 5. CSV export: `export --from 2026-09-01 --to 2026-09-30`

The file is written to `~/.opchain/time/meridian/exports/meridian-2026-09.csv`.

```csv
date,client,matter,type,hours,rate,amount,currency,narrative,entry_id,revision,raw_minutes,label
2026-09-28,meridian,MER-214,time,2.25,175.00,393.75,USD,"Carrier rate-card import: designed CSV schema, built parser + validation, opened PR #88.",meridian-2026-09-28-MER-214-t,2,118,
2026-09-28,meridian,MER-221,time,1.00,175.00,175.00,USD,"Fixed timezone bug in dispatch ETA calculation; added regression tests.",meridian-2026-09-28-MER-221-t,1,61,
2026-09-28,meridian,general,time,0.50,175.00,87.50,USD,"Dependency review and CI triage.",meridian-2026-09-28-general-t,1,23,
2026-09-28,meridian,AI,disbursement,,,6.42,USD,"AI compute: 2.1M tokens, 3 models.",meridian-2026-09-28-ai,1,,list-price equivalent
```

The terminal then prints: `Exported 41 approved entries (62.25h, $10,893.75 + $118.40 AI) · 3 unapproved days skipped: 09-25, 09-29, 09-30`.

## 6. `init` and errors

```
$ npm run timesheet -- init --client meridian --name "Meridian Freight" --rate 175 --repo ~/repos/meridian-dispatch
✓ Created ~/.opchain/time/meridian/billing.yaml (edit matters.ticket: currently '(MER-\d+)')
✓ Registered ~/repos/meridian-dispatch → meridian
✓ Added timesheets/ to ~/repos/meridian-dispatch/.gitignore
! Hooks not installed. Add to ~/.claude/settings.json: see docs/plans/time-tracking/README.md#hooks
Next: draft today
```

| Error | Message | Exit code |
|---|---|---|
| Repo not registered | `✗ ~/repos/foo isn't registered. Run: init --client <id> --repo ~/repos/foo` | 2 |
| Bad YAML | `✗ billing.yaml:14: rate.hourly must be a number` | 2 |
| Lock timeout | `✗ Ledger busy (lock held by pid 48121 for 5s). Retry, or remove ~/.opchain/time/meridian/ledger.lock if that process is gone` | 1 |
| `timesheets/` tracked | `✗ timesheets/ is tracked in git in ~/repos/meridian-dispatch. Run: git rm -r --cached timesheets` | 1 |
| Approve blocked | `✗ Not approved: meridian-2026-09-28-ai (unpriced 12%). Other entries approved: 3` | 1 |

Approval is per entry. One blocked line doesn't block the rest of the day.

## 7. Navigation (daily loop)

```
morning session start ──► nudge: "1 day awaiting approval"
          │
          ▼
 review <yesterday> ──► edit / discard / add (as needed) ──► approve <yesterday>
          │
      end of month ──► export --from --to ──► import CSV into invoicing tool
          │
      weekly ──► spotcheck ──► verify
```
