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
core skills, ≥ **0.9** for every other skill, `gate` ≥ 0.5, rerank top ≥ 0.35,
and **p = min(top, fits, gate) ≥ 0.6** (`minP`, `OPCHAIN_ROUTE_MIN_P`). The
floor makes 0.6 the effective `gate` bar too.
An explicit `/oc-*` mention routes without a model call. A decision whose verb
is one of the skill's `menuVerbs` (`gen-route-spec` marks a verb whose command
reference says "Show this menu" or whose body says "When the user types X,
display this menu") is not suggested: in the first shadow window 7 of 11
oc-git-ops routes resolved to the `/oc-git` menu, all the "merge" prompts among
them. Spec `+route3` added `/oc-merge`, the two request rules (`REQUEST_RULES`:
a question about a skill is not a request; judge the action, not its subject
matter) and the 2026-10-23 copy for oc-git-ops, oc-bug-check and
oc-release-ops. Spec `+route4` (2026-10-26, plan §3) says opening or raising a PR is
`/oc-git-sync` and `/oc-pr` only drafts, that planning what ships to staging then
production is oc-release-ops (and its `/oc-release plan` step) even when it names
the environments, and, in oc-bug-check's own `notFor`, that a message only naming
the checks is not a run. Two broader wordings were rejected: a global request rule
silenced "MERGE?" or made "check" a bug-check request, and a release verb question
naming the semver made "so we can version it" a suggestion
(`docs/audits/2026-10-26-jev-day8-and-route4.md` §3). Copy changes are verified
with repeated live runs of the rows they touch, not one run.

| Eval (blind labels, lenient, ambiguous dropped, allowlist on) | All P / R / silent | Holdout P / R / silent |
|---|---:|---:|
| First router (2026-10-09), core 0.4 | 0.830 / 0.951 / 0.982 | 0.862 / 1.000 / 0.982 |
| Context on, core 0.4 | 0.514 / 0.878 / 0.927 | 0.548 / 0.920 / 0.919 |
| Context off (current shape), core 0.4 | 0.745 / 0.927 / 0.971 | 0.774 / 0.960 / 0.968 |
| **Context off (current shape), core 0.6** | **0.860 / 0.902 / 0.987** | **0.923 / 0.960 / 0.991** |
| Same, repeat run | 0.864 / 0.927 / 0.987 | — |
| Re-run 2026-10-24, `+route2` (main at #653), no floor | 0.872 / 0.829 / 0.989 | 0.920 / 0.920 / 0.991 |
| Same, p ≥ 0.65 | 0.944 / 0.829 / 0.996 | 0.920 / 0.920 / 0.991 |
| `+route3` (#654), no floor | 0.971 / 0.805 / 0.998 | 1.000 / 0.880 / 1.000 |
| `+route3`, p ≥ 0.6 | 0.971 / 0.805 / 0.998 | 1.000 / 0.880 / 1.000 |
| Same, p ≥ 0.7 | 1.000 / 0.780 / 1.000 | 1.000 / 0.840 / 1.000 |
| Re-run 2026-10-26, `+route3`, p ≥ 0.6 | 1.000 / 0.805 / 1.000 | 1.000 / 0.880 / 1.000 |
| **`+route4` (plan §3), p ≥ 0.6 (shipped)** | **1.000 / 0.805 / 1.000** | **1.000 / 0.880 / 1.000** |

**The p floor.** On the blind-labelled set a 0.6 floor changes nothing in
either run: every suggestion it drops is on an ambiguous row. A 0.7 floor loses
"production can go" (p 0.65). On the first shadow window it does the work the
offline set cannot show. Over the 75 hand-labelled routes it drops the two "Turn
on Auto-fix for PR N" suggestions (p 0.43, 0.52) and the "close to merge?"
question (p 0.55, ambiguous): precision 0.714 → 0.833, silent 0.920 → 0.960,
recall unchanged at 0.769. The `+route3` copy is the larger offline change
(precision 0.872 → 0.971 for one fewer true positive, within run-to-run noise).

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

   Before this rule the hook closed a window at the session's next
   UserPromptSubmit of any kind. Of 60 shadow outcomes, 22 were closed by a
   task notification, CI monitor event, `!` command or another session's
   message, often seconds after the prompt, and one stayed open 69 h across an
   idle session. Since 2026-10-24 the hook records an outcome only on a
   person's turn (`isEnvelopeBody`), and `outcomes` rescores from the
   transcript either way.
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

**Against the baseline.** The owner's bar (2026-10-23): "The baseline is what
actually happened in the transcripts as is". A *pipeline prompt* is one whose
work needed a skill: its hand label or, unlabelled, the skills its activity
points at. On shadow rows the report counts:
- the **baseline**: the agent used the needed skill (or one of its own steps)
  with no suggestion shown;
- the **gaps closed**: the router named the needed skill where the agent went
  around it;
- **projected use** = baseline + gaps closed, assuming a shown suggestion is
  followed (the audit measured 72/72 for this one-line format), and **lift** =
  projected ÷ baseline.

Live rows are reported as measured use instead. Logged suggestions with
`p` below the shipped floor are scored as no suggestion and counted, so an
older log reads as the current router would have behaved.

**Day-8 go/no-go** (the report prints the verdict). Switch to
`OPCHAIN_ROUTE_MODE=live` only when all six hold over the shadow period:

1. **≥ 30 suggestions** (would-have-suggested) — fewer is anecdote.
2. **≥ 30 pipeline prompts observed** — the lift below needs that many.
3. **Projected skill use ≥ 1.5× the baseline.**
4. **Precision ≥ 0.8 on the core skills.**
5. **Silent rate ≥ 0.95 on non-pipeline prompts** — at most one ordinary
   prompt in twenty gets a nudge.
6. **Every suggestion hand-labelled.** Proxy numbers alone never switch live
   mode on. At about four suggestions a day this is a few minutes of labelling.

Bars 2 and 3 are the 2026-10-23 proposal from the parallel analysis session;
the owner has not set them yet. Change them in `DEFAULTS.goNoGo`.

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

## 7. Other Jev uses: `route-eval jev <use>`

The router is use **J1** of a small registry of Jev uses,
`scripts/jev-uses.json` (ids, status, the question wording). `gen-route-spec.mjs`
expands it into `plugins/opchain/hooks/jev-questions.json` beside the route
spec, filling J1 from the router's own constants (gates, request rules, the
`none` text, thresholds) and J2's skill options from the spec; `--check` holds
both files in sync. One wording per use, shared by every caller and by the
eval. The plan and the full table are
`docs/plans/2026-10-24-jev-integration-plan.md` §2–§3; every transport call
goes through `plugins/opchain/hooks/lib/jev-client.cjs`, which the router
re-exports.

```bash
npm run route:eval -- jev --list                                   # the registry: id, status, kind, gold set
npm run route:eval -- jev J9 --fixture tests/fixtures/jev/J9/answers.json   # offline, canned answers
TYPESAFE_API_KEY=… npm run route:eval -- jev J9                    # live, against the pinned model
  [--gold <file>] [--out scratch/jev-J9.jsonl] [--report scratch/jev-J9.md]
  [--threshold 0.5] [--min-accuracy 0.9] [--model <id>] [--timeout-ms 20000]
```

- A **router** use (J1) sends each gold prompt through `route()` with the
  shipped thresholds and the suggest allowlist, so the result is what the hook
  would have done. Its gold set is the unambiguous prompts of the 2026-10-23
  hand-labelled window; the canned answers reproduce that window's three misses
  and three false suggestions (the #655 p floor silences the Auto-fix one; the two bug-check questions remain), which makes it the regression check for the §4
  spec-copy fixes.
- A **Noul** use (J2 outcome judgement, J8 PR docs completeness, J9 embedded
  instructions in a client file) builds its question from `jev-questions.json`, sends the row's `state`
  fields, and thresholds the probability (the use's `threshold`, or
  `--threshold`). J2 adds the suggested skill's description and its own steps
  to the instructions; J8 adds the definition of the row's `section`.
- A **Choice** use (J5 feedback triage) takes the top option, except that its
  `positive` option wins whenever that option's own probability reaches the
  threshold. Precision and recall are on the positive option; its rows carry
  every option's probability so canned answers reproduce the run.
- Gold rows are JSONL: `{ id, prompt, expected: <skill>|"none" }` for J1,
  `{ id, <state fields>, expected: <option> }` for a Choice use,
  `{ id, <state fields>, expected: true|false }` otherwise. Canned answers are
  keyed by row id; a row with no entry is an **error row**, never a guess, and
  is left out of accuracy. An explicit `/oc-*` mention routes at p=1 without a
  model call, so it needs no entry.
- The report has accuracy, precision and recall on the positive class, the
  silent (J1) or hold (Noul) rate on negatives, confusions, the wrong rows with
  the router's own reason, the correct rows nearest the threshold, and tokens.
  `--min-accuracy` exits 3 when the bar is not met, for a CI step later.
- Without `--fixture` the command needs `TYPESAFE_API_KEY` and exits 2 without
  it. Nothing in the tests or the shipped fixtures reaches the network.

A use moves from **eval** to **shadow** only when its gold set passes at the
threshold its caller will use, and to live only through a go/no-go like §6.

### J2 on the shadow log: `outcomes --judge jev`

```bash
TYPESAFE_API_KEY=… npm run route:eval -- outcomes --log ~/.claude/opchain-route/route-log.jsonl \
  --judge jev [--threshold 0.5] [--judge-fixture <answers.json>] --report scratch/outcomes.md
```

For every suggestion rescored from a transcript, J2 reads the prompt, the
suggested skill and the reply turn (skills invoked, command classes, the first
12 tool calls, the tail of the last text) and answers whether the reply did that
skill's work. The report gains a **J2 judge** section: agreement with the hand
labels for J2 and for the command proxy on the same suggestions, every row
where either disagrees, and J2's verdict on unlabelled suggestions. It decides
nothing; the go/no-go still uses the labels and the proxy.

First live run (2026-10-27, 27 suggestions, 21 labelled): J2 agrees with
14/21 labels, the proxy with 18/21. J2 catches the two right suggestions the
proxy misses (a confirmation, "merge" → "#643 already auto-merges"; a
`gh pr merge` handed over), but says yes on six suggestions labelled `none`
where the reply did git or check work the prompt text did not ask for
(moving a checkout to main, "Try again"). The labels judge the prompt text;
J2 judges what the reply did. A wording that told it to count only requested
work moved no row across 0.5. So J2 stays report-only.

### J8: does a PR body cover what, why and how it was checked

```bash
TYPESAFE_API_KEY=… npm run route:eval -- jev J8                 # live
npm run route:eval -- jev J8 --fixture tests/fixtures/jev/J8/answers.json
```

One Noul per part of a PR description. A gold row is
`{ id, section: "what"|"why"|"verify", change, body, expected }`: `change` is
the PR title and its files with line counts, `body` the description (cut at
6,000 characters), and the registry's `sections` give each part's definition,
sent as `section_definition`. `readGold` refuses a section the registry does
not define.

The gold set is 38 rows from nine merged ainatx/opchain PRs (#589, #592, #595,
#614, #621, #633, #638, #646, #660), labelled as written, plus the same bodies
with one part cut (#589 without its Summary, #621 and #660 without their test
sections) and a one-line body and a test-plan-only body on #584's change. Real
negatives: #595 and #633 state no check; Dependabot's #592 gives no reason and
no check.

First live run (2026-10-28, `jev-1.13.0`): 36/38, precision 0.929, recall
1.000, hold 0.833, the same on three runs. Each call took about 1,400 input tokens
(52k for the set). The two misses are cut bodies, both close calls:
#660 without its test sections still lists five new tests but never says they
ran (p 0.55), and #589 without its Summary keeps the title's "review … 2.1.286"
(p 0.72 on why). Every one-line and test-only body is held on the parts it
leaves out (p ≤ 0.06). J8 is **eval**: the candidate caller is
`/oc-docs pr`, as a hint naming the parts a body is missing, before
`oc-repo-ops verify`; it is not wired in yet.

On a live pull request (a hint, never a gate):

```bash
TYPESAFE_API_KEY=… npm run route:eval -- jev J8 --pr 592 --repo ainatx/opchain
npm run route:eval -- jev J8 --pr-json tests/fixtures/jev/J8/pr-592.json \
  --fixture tests/fixtures/jev/J8/pr-592-answers.json            # offline
```

It reads the PR with `gh pr view --json number,title,body,files`, builds the
three rows in the gold set's shape and prints each part as covered or MISSING
with its p. Exit 0, or 1 when a call failed. On 2026-10-29 #662 covered all
three (why at p 0.56); Dependabot's #592 was missing verify (0.03) and why
(0.15).

### J5: feedback triage, the first Choice use

```bash
TYPESAFE_API_KEY=… npm run route:eval -- jev J5
npm run route:eval -- jev J5 --fixture tests/fixtures/jev/J5/answers.json
```

J5 reads a `/api/feedback` submission's `title` and `description` and picks
bug, improvement, feature, security or general from the text, whatever the
form said. The class that matters is **security**: `handleFeedback` sends a
roadmap request (`category` set) to a public GitHub issue, so a vulnerability
report sent through the roadmap form is published. J5's `positive` is
`security` at threshold 0.3: a privacy question sent to the private queue
costs little, a published exploit costs a lot.

The gold set is 24 synthetic submissions: 5 bug, 4 improvement, 4 feature, 4
general and 7 security. The seven security rows are
security reports written casually (spoofed contact email, a key in the zip,
a vote-dedup bypass sent as a roadmap idea, stored XSS, code execution from a
checkpoint, IDOR, path traversal). Five are decoys that name security, secrets
or privacy without reporting a hole (a crash in `/oc-security`, a security
feature request, a key-rotation reminder request, a privacy-page typo, a
privacy question).

First live run (2026-10-29, `jev-1.13.0`, three runs, same predictions):
22/24, security precision 0.875, recall 1.000, 16/17 non-security rows kept
off security, about 580 input tokens per call. The two misses: the privacy
question reaches p(security) 0.37–0.44 (over 0.3, under 0.5), and a typo
splits bug 0.34 / improvement 0.63. Every security report scored
p(security) 1.00 and every other decoy 0.00. J5 is **eval**: wiring it into the
Worker needs the key as a Worker secret, a `/privacy` line saying feedback
text goes to TypeSafe, and the owner's go.

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
A/B arms are covered in `tests/route-hook.test.js`. The shared client, the
generated `jev-questions.json` and the `jev` command are covered in
`tests/jev-client.test.js`, `tests/jev-questions.test.js` and
`tests/jev-eval.test.js`, on the shipped gold sets and canned answers.
