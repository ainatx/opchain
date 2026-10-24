# Skill router evaluation

How to measure the opchain skill router offline before (and after) it is wired
into the `UserPromptSubmit` hook, and how to read its production outcome
records (§6). The harness is `scripts/route-eval.mjs`
(`npm run route:eval -- <command>`); its tests are `tests/route-eval.test.js`.

## Why this exists

The effectiveness audit (`docs/audits/2026-10-08-opchain-effectiveness-audit.md`,
§1 and §3.1) found that 0 of 229 deftwright PRs entered the oc-git-ops gate and
that explicit `Skill` invocations in main sessions were rare (4 oc-git-ops, 1
oc-deploy-ops, 5 oc-code-auditor in opchain; 0/0/3-in-main in deftwright).
That is the baseline a router has to beat: a router that never suggests
anything scores exactly the baseline, so the number that matters is **recall on
prompts that implied a skill**, bought at a **false-suggestion rate on
ordinary prompts** the user will put up with.

The labelled data is the local Claude Code transcript corpus. Each human prompt
is labelled by what the session actually did next, which is the only ground
truth we have for "should the router have suggested a skill here":

| Label kind | How it is derived |
|---|---|
| `skill` | the first `Skill` tool call after the prompt whose id starts with `oc-` (an `opchain:` prefix is stripped) |
| `implied` | no Skill call, but a Bash command matched `gh pr create` / `git commit` / `git push` (→ oc-git-ops) or `npm run deploy` / `wrangler deploy` (→ oc-deploy-ops), or the assistant text mentioned `/oc-audit` / `oc-code-auditor` (→ oc-code-auditor); first match in transcript order wins |
| `none` | nothing above happened before the next human prompt |

`implied` is deliberately narrow (three skills, literal patterns). A prompt that
led to `gh pr merge`, `npm test` or a Playwright run is `none` even though a
skill arguably applied; widen `IMPLIED_RULES` in the script if you want those
counted, and say so in the report you share.

## 1. Build the dataset

```bash
npm run route:eval -- build-dataset
# → scratch/route-dataset.jsonl, prints counts per label kind / skill and the
#   20 most common first words of `none` prompts
```

Defaults: prompts since `2026-09-14` (the v2.0.0 tag), main-session files only
(`~/.claude/projects/<project>/*.jsonl`, never `*/subagents/*`), from the
deftwright-site and opchain project dirs (including every worktree dir).
Options: `--since <date>`, `--out <file>`, `--projects <glob[,glob]>`,
`--projects-root <dir>`.

What is excluded as "not a human prompt": tool results, `isMeta` records,
sidechain records, anything starting with `<` (task notifications, system
envelopes), slash commands (`<command-name>`), `[Request interrupted …]` and
`Request directory approved`. Leading desktop `<system-reminder>` blocks are
stripped first, so a prompt behind them is a row (before 2026-10-23 they were
all dropped, and they included every `run /oc-*` prompt). A brief from another
session ("Background (from the session that started this one): … Task: …") is
the row's prompt only through its `Task:` paragraph, flagged `brief: true`; a
brief with no `Task:` paragraph is not a row. Both rules are the hook's
(`routablePrompt` in `route-dispatch.cjs`). Identical prompts within one session are deduped,
and a row id seen twice (a resumed session whose transcript was copied into a
second worktree's project dir) is kept once; the summary line says how many
were dropped.
Each row keeps a cheap `repoState` (`gitBranch`, `cwd`, `isDeftwright`,
`isWorktree`) so the router sees roughly what the hook would see.

Each row also carries `conversation`, built by the same rules the hook uses
(`conversationFromRecords` in `route-dispatch.cjs`), so the eval measures the
request the hook sends:

| Field | What it is |
|---|---|
| `previous_request` | the previous human prompt in the session (any, including a deduped or pre-cutoff one), redacted, first 200 chars |
| `assistant_last` | every text block of the last assistant message before the prompt (grouped by `message.id`), redacted, then the **last** 400 chars — the end is where the agent proposes next steps |

**The router does not send `conversation` by default.** Context is opt-in:
`OPCHAIN_ROUTE_CONTEXT=1` for the hook, `--context` for `route-eval run`. On
the 2026-10-09 eval (574 blind-labelled prompts) it cut precision from 0.81
to 0.51 and gained no recall: bare assents ("yes", "go", "done") after a PR or
deploy turn became suggestions. It fixed "command for 590" but broke
"production can go" (fits 0.80 → 0.38). With context off, the request carries
only `{ request, repo }` and none of the follow-up or conversation
instruction rules. The dataset still records `conversation`, so a context
run stays one flag away. The blind labels saw prompt text only and
under-credit context, so relabel the context-dependent rows with
`conversation` visible before trying it again.

Prompts and label evidence are passed through the router's `redactSecrets`
before truncation, the same as `conversation`. The output is still your own
prompt text, so `scratch/` stays gitignored.

Sanity-check the first-words list: if envelope text shows up there ("artifact"
is the `[Artifact comment sent to Claude]` relay, which is kept on purpose
because a person wrote it), decide whether the router will see the same thing
at runtime before filtering it out.

## 2. Run the evaluation

```bash
export TYPESAFE_API_KEY=...            # the router's classification endpoint
npm run route:eval -- run --dataset scratch/route-dataset.jsonl \
  --limit 200 --sample stratified      # optional; stratified keeps every label stratum
# → scratch/route-eval.jsonl  (decision + trace per row)
#   scratch/route-eval.md     (the report)
#   scratch/route-cache.json  (the file cache handed to route())
```

Behaviour worth knowing:

- Rows are routed with **open query thresholds** (`fits ≥ 0, gate ≥ 0`) so the
  stored `fits` / `gate` / `probabilities` support the whole threshold sweep.
  The report applies the reporting thresholds offline. The default is the
  shipped router's tiered bar, read from `DEFAULT_THRESHOLDS` in
  `route-dispatch.cjs` (`fits` ≥ 0.6 for core skills, ≥ 0.9 for the rest,
  `gate` ≥ 0.5); `--thresholds fits=0.5,gate=0.5` applies a flat `fits` bar
  instead, as `OPCHAIN_ROUTE_FITS` does in the hook. Nothing is re-queried to change a threshold: re-run the
  same command with a different `--thresholds` and every row is reused from
  `--out` (the summary line says `0 queried, N reused`). A changed spec version,
  model or `conversation` invalidates the row hash and re-queries.
- A row whose `route()` trace carries an error (the router returns
  `trace.error` instead of throwing) is an error row: 429 and 5xx are retried
  with backoff, the row records `error`, and it is never cached or reused, so
  the next run queries it again.
- Rows are routed with the suggest allowlist **off** (`suggestAll: true` in the
  query thresholds — the same switch as `OPCHAIN_ROUTE_SUGGEST_ALL=1`), so the
  stored decisions keep every skill and the report can show what the
  allowlist removes. Each row's `conversation` is passed to `route()`.
- They are also routed with `allowMenus: true`: a decision whose verb only
  prints the skill's menu (`menuVerbs` in the spec, e.g. `/oc-git`) is kept and
  marked `menu: true`. The report drops it, as the hook does, unless the
  reporting thresholds set `allowMenus=1`.
- At most 4 concurrent requests; HTTP 429 is retried with exponential backoff
  (or the server's `Retry-After`), up to 6 attempts. A row whose route() throws
  is recorded with `error` and counted, not fatal.
- Without `TYPESAFE_API_KEY` the command exits 2 and says so. `--fixture
  <answers.json>` substitutes a transport that returns the file's content for
  every request; that is how the tests run and how you can replay a canned
  router offline. `--route-module <path>` points at a different router build.
- The route module (`plugins/opchain/hooks/lib/route-dispatch.cjs`) and spec
  (`plugins/opchain/hooks/route-spec.json`) are loaded lazily; a missing module
  is a clear exit-2 message, not a stack trace.

## 3. Read the report

`scratch/route-eval.md` has, in order:

1. **Overall** — row counts per label kind, suggestion rate, top-1 accuracy on
   `skill`+`implied` rows, precision of all suggestions, recall on labelled
   rows, and the **false-suggestion rate on `none` rows**. The last one is the
   user-facing cost of the router: every false suggestion is a nudge about a
   skill the user did not need.
2. **Per-skill precision / recall / F1** — support is the number of rows
   labelled with the skill; FP includes suggestions made on `none` rows. With
   the current corpus only oc-git-ops (≈120 rows) and oc-deploy-ops (≈40) have
   enough support for the per-skill numbers to mean much; treat single-digit
   support as anecdote.
3. **Threshold sweep** — `fits ∈ {0.3,0.4,0.5,0.6,0.7} × gate ∈ {0.3,0.5}`,
   each with suggestion rate, precision, recall, false-suggestion rate and
   `none hold` (the share of `none` rows left alone).
4. **Confusions** — the 15 most frequent `label → suggested` pairs, including
   `(none) → X` (false suggestion) and `X → (none)` (missed).
5. **Lowest-confidence correct / highest-confidence wrong** — ten rows each
   with an 80-character prompt head. Read the wrong ones first; they are
   either labelling noise (fix `IMPLIED_RULES`) or router errors (fix the spec).
6. **Suppressed by allowlist** — how many suggestions at the reporting
   thresholds the spec's `suggestAllow` removes, per skill split into "matched
   the label" (recall the gate costs) and "wrong" (false suggestions it saves),
   plus suggestion rate / precision / recall / false-suggestion rate with and
   without the allowlist. Explicit mentions are exempt.
7. **Cost and time** — rows queried vs reused, 429 retries, input/output tokens
   summed from every stored trace, estimated cost at $0.042 per million input
   tokens, wall time.

A result that beats the audit baseline looks like: recall on `implied`
oc-git-ops rows well above 0 (the baseline is 0/229 PRs gated) **and** `none
hold` ≥ 0.95 at the thresholds you intend to ship.

## 4. Pick thresholds

The classification cookbook the router follows gates at **0.30** for both
`fits` and `gate`. Treat that as the permissive end of the sweep, not the
default: on this corpus two thirds of prompts are `none`, so a 0.30 gate that
fires on 10% of them produces more false nudges than true ones.

Recommendation:

1. Start at the report default (the shipped tiered bar), or at a flat
   `--thresholds fits=0.5,gate=0.5` for the sweep's middle row.
2. Read the sweep row for your candidate. Lower a threshold one step only
   while **precision on `none` rows holds ≥ 0.95** (`none hold ≥ 0.950` in the
   sweep table) — that is, no more than one ordinary prompt in twenty gets a
   suggestion.
3. Between two candidates that both hold `none` ≥ 0.95, prefer the one with the
   higher recall on `implied` rows; that is the number tied to the 0/229 gap.
4. Re-run after every spec or model change. Rows are cached per
   (prompt, repoState, model, spec version), so only the changed combination
   costs anything.

Record the chosen thresholds and the sweep row that justified them in the PR
that wires the router into the hook.

### Shipped thresholds

`DEFAULT_THRESHOLDS` in `route-dispatch.cjs`: `fits` ≥ **0.6** for the seven
core skills, ≥ **0.9** for every other skill, `gate` ≥ 0.5, rerank top ≥ 0.35.
An explicit `/oc-*` mention routes without a model call. A decision whose verb
is one of the skill's `menuVerbs` (`gen-route-spec` marks a verb whose command
reference says "Show this menu" or whose body says "When the user types X,
display this menu") is not suggested: in the first shadow window 7 of 11
oc-git-ops routes resolved to the `/oc-git` menu, all the "merge" prompts among
them. Spec `+route3` added `/oc-merge`, the two request rules (`REQUEST_RULES`:
a question about a skill is not a request; judge the action, not its subject
matter) and the 2026-10-23 copy for oc-git-ops, oc-bug-check and
oc-release-ops. The thresholds were not changed; re-run the 574-row set on
`+route3` before reading the table below as current.

| Eval (blind labels, lenient, ambiguous dropped, allowlist on) | All P / R / silent | Holdout P / R / silent |
|---|---:|---:|
| First router (2026-10-09), core 0.4 | 0.830 / 0.951 / 0.982 | 0.862 / 1.000 / 0.982 |
| Context on, core 0.4 | 0.514 / 0.878 / 0.927 | 0.548 / 0.920 / 0.919 |
| Context off (current shape), core 0.4 | 0.745 / 0.927 / 0.971 | 0.774 / 0.960 / 0.968 |
| **Context off (current shape), core 0.6** | **0.860 / 0.902 / 0.987** | **0.923 / 0.960 / 0.991** |
| Same, repeat run | 0.864 / 0.927 / 0.987 | — |

Jev is not fully deterministic: two identical runs with fresh caches agree on
the top skill for 561 of 574 rows (mean |Δfits| 0.018, max 0.08) and differ on
3 to 5 suggestions. Differences of one or two rows are noise. At 0.4 the
current request shape lets 13 ordinary prompts through in both runs, against
8 for the first router, so the core bar stays at 0.6.

The hook routes every prompt of 2+ characters when context is off. An earlier
12-character floor silenced every bare "merge" (the most common correct
oc-git-ops suggestion) and *lowered* precision to 0.78, because it removed
more true positives than false ones.

## 5. The suggest allowlist (evidence gate)

`scripts/route-spec.overrides.json` → `suggest.allow` lists the skills the
router may **suggest**; `gen-route-spec` copies it into `route-spec.json` as
`suggestAllow` (and `--check` fails on drift). Today: the seven core skills
(oc-git-ops, oc-deploy-ops, oc-code-auditor, oc-bug-check, oc-release-ops,
oc-docs-forge, oc-repo-ops) plus the skills with labelled positives in the
2026-10-09 eval (oc-app-architect, oc-ux-engineer, oc-orchestrator,
oc-dash-forge, oc-update). Every non-core skill was noisy in that eval and 11
produced suggestions with zero labelled positives.

Every skill stays a Choice **option** in both requests, so the long tail still
absorbs probability instead of misrouting to oc-git-ops. When the winner is not
listed, the router returns no decision with reason
`skill X not in suggest allowlist (no labelled evidence)` (logged as
`trace.suppressed`). A prompt that names a skill (`/oc-comply gaps`) is exempt.
`OPCHAIN_ROUTE_SUGGEST_ALL=1` turns the gate off for diagnostics.

To admit a skill: show labelled positives for it (an eval run's per-skill table
or the outcomes report below), add it to `suggest.allow`, update
`suggest.reason`, and run `npm run gen-route-spec`.

## 6. Production outcomes and the day-8 go/no-go

The hook ships in **shadow mode by default**: `OPCHAIN_ROUTE_MODE` unset routes
and logs but injects nothing; `OPCHAIN_ROUTE_MODE=live` must be set explicitly.
Every routed prompt leaves a routing record in the route log, and that record is
what `outcomes` scores.

```bash
npm run route:eval -- outcomes [--log $TMPDIR/opchain-route-log.jsonl] [--since 2026-10-09] [--report scratch/route-outcomes.md]
  [--labels <log dir>/route-labels.jsonl] [--window-minutes 30] [--projects-root ~/.claude/projects] [--rows <file>] [--no-rescore]
```

`--log` defaults to `$OPCHAIN_ROUTE_LOG`, else the hook's default path. Note
that the hook's `$TMPDIR` is Claude Code's, which may differ from your shell's;
set `OPCHAIN_ROUTE_LOG` in both if in doubt. Without `--report` the markdown
is printed. `--rows` writes the scored rows as JSONL.

### How a prompt is scored

The 2026-10-23 analysis (`docs/audits/2026-10-23-jev-router-shadow-performance.md`)
found the original self-labels measured the scorer more than the router: core
precision 0.31 by the proxy against 0.71 by hand. So:

1. **Rescored from transcripts.** For each routing record, `outcomes` finds the
   session's transcript under `--projects-root` and its subagent transcripts
   (`<sid>/subagents/*.jsonl`), anchors on the prompt copy that was routed, and
   reads what happened next. The hook still appends its own outcome record on
   the session's next prompt (tail-bounded, no subagents); `outcomes` uses that
   record only when the transcript is gone. `--no-rescore` scores the stored
   records alone.
2. **The window is the reply turn.** It closes at the first of:
   - the main thread's first `end_turn` after the prompt;
   - the next human turn (typed prompt, slash command, or a desktop prompt behind
     `<system-reminder>` blocks);
   - `--window-minutes` (default 30) after the prompt.

   Task notifications never fire the hook, so before this rule one prompt's
   window in an autonomous session stayed open for 36 h and collected every
   later commit.
3. **Related activity.** A suggestion S is a proxy TP when S's work shows up in
   the window:
   - S was called.
   - One of S's own steps was called:
     - oc-git-ops: oc-bug-check, oc-docs-forge, oc-repo-ops
     - oc-deploy-ops: the oc-code-auditor + oc-security-auditor audit gate
     - oc-release-ops: oc-docs-forge, oc-git-ops, oc-deploy-ops
   - S's raw class ran, or its tool equivalent was used:
     - oc-git-ops: `git commit`/`push`/`merge`/`rebase`, `gh pr create`/`merge`, `mcp__ccd_pr__set_auto_merge`, `sync_with_base_branch`, or a `gh pr merge …` command handed to the user in backticks (the opchain repos squash-merge by hand)
     - oc-deploy-ops: `npm run deploy*`, `wrangler deploy`, `node scripts/deploy.mjs`

   Raw classes match only in command position, so `grep "git commit"` does not
   count. User `!` commands (`<bash-input>`) count.

| Proxy | Rule |
|---|---|
| TP | suggestion S and S's work in the window (above) |
| FP | suggestion S with no activity related to S |
| FN | no suggestion, but an `oc-*` Skill call or a raw git/deploy class followed |
| silent | no suggestion on a non-pipeline prompt (no Skill call, no raw class) |

4. **Hand labels override the proxy.** The proxy still can't tell a deferred
   merge ("merge" → "#643 auto-merges when CI passes") from a wrong suggestion.
   On 2026-10-23 it agreed with hand labels on 12 of 14 suggestions and 46 of 63
   labelled rows. Labels live beside the log in `route-labels.jsonl`, one JSON
   object per line:

   ```json
   { "session_id": "…", "prompt_hash": "…", "label": "oc-git-ops", "note": "optional" }
   ```

   Write them with the `label` command rather than by hand; it checks the label
   is a skill id, `none` or `ambiguous`, that the routing record exists, and
   appends (a later line relabels):

   ```bash
   npm run route:eval -- label --list [--all] [--log <file>]      # unlabelled suggestions (--all: every row)
   npm run route:eval -- label <session_id> <prompt_hash> <label> [--note "…"] [--log <file>]
   ```

   `label` is a skill id, `none` or `ambiguous`. Judge the prompt text
   alone, because that is all the router sees. On a labelled row:
   - suggestion = label → TP
   - suggestion ≠ label → FP, plus an FN for the labelled skill
   - no suggestion on a skill label → FN
   - no suggestion on `none` → silent

   `ambiguous` rows count as suggestions but are left out of every rate. The
   report's **Rows to review** section lists every unlabelled suggestion first,
   then the proxy's misses, each with its session id and prompt hash, ready to
   label.

Outcomes of an explicit `/oc-*` mention (`explicit: true`: the user typed the
command and it routed at p=1 without a model call) measure the user, not the
router. They are excluded from the suggestion count and every metric below and
reported on their own row. "Follow rate" is reported for live mode only: in
shadow nobody saw the suggestion, so the shadow figure (suggested skill called
anyway) is the unprompted baseline.

**Day-8 go/no-go** (the report prints the verdict). Switch to
`OPCHAIN_ROUTE_MODE=live` only when all four hold over the shadow period:

1. **≥ 30 suggestions** (would-have-suggested) — fewer is anecdote.
2. **Precision ≥ 0.8 on the core skills.**
3. **Silent rate ≥ 0.95 on non-pipeline prompts** — at most one ordinary
   prompt in twenty gets a nudge.
4. **Every suggestion hand-labelled.** Proxy numbers alone never switch live
   mode on. At about four suggestions a day this is a few minutes of labelling.

A NO-GO keeps shadow on. Read the FP rows and the labelled misses first. Each is
spec copy to fix, a skill to drop from the allowlist, or a raw class the proxy
doesn't know about yet.

### Live mode as an A/B

A GO switches the router on, but a follow rate measured afterwards is not the
router's effect on its own: in the 2026-10-19 → 10-23 window, 12 of 31 main-thread
`oc-*` Skill calls came from briefs that already named the verb. So run live mode
as an A/B on the same person's sessions:

```bash
OPCHAIN_ROUTE_MODE=live OPCHAIN_ROUTE_AB=1   # in the hook's environment
```

Each session lands in one arm by its id (`abArm` in `route-dispatch.cjs`): the
`live` arm gets the line, the `control` arm routes, logs the line it would have
shown (`line` in the routing record) and injects nothing. Routing records carry
`arm`, `injected` and `line`; outcome records carry `skill_args` (each skill's
first `args`) and `followed_with_verb`. The outcomes report adds an **A/B arms**
table and a **verb fidelity** figure (of the live follows, how many used the
suggested verb rather than another of the skill's steps).

Read it after two weeks. The router has an effect when the live arm's follow
rate on core skills is at least 0.6 and at least twice the control arm's, with
verb fidelity at or above 0.9. About four suggestions a day split two ways is
enough to see a 2× difference in two weeks, not a 20% one.

## Tests

```bash
npx vitest run tests/route-eval.test.js
```

The tests build a synthetic transcript corpus (skill, implied, none,
slash-command, notification, envelope, sidechain and subagent cases), check the
captured `conversation` per row, pin the precision/recall arithmetic on a
seven-row set and the allowlist-suppression arithmetic, drive `run --fixture`
with a fake route module through the CLI (including the no-re-query re-run),
pin the outcomes report arithmetic, the label rules and the verdict on a fixture log, and rescore a fixture transcript tree (subagent activity inside the window, a commit after the reply turn, a merge handoff, the stored-record fallback, labels beside the log) through the CLI. They also cover the A/B arm and verb-fidelity tables, the `label` command, the menu-verb drop in the sweep, and the reminder-prefixed and brief rows of the dataset. Window, activity, prompt-shaping and cache rules are covered in `tests/route-dispatch.test.js`. They need
neither the real router nor an API key. The hook's outcome records, shadow
default, reminder and brief handling, the core-and-fresh checkpoint rule and the
A/B arms are covered in `tests/route-hook.test.js`.
