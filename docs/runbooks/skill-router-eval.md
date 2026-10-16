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
`Request directory approved`. Identical prompts within one session are deduped,
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
An explicit `/oc-*` mention routes without a model call.

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
While it runs, it labels its own decisions. On each prompt it finds the
session's previous routing record in the route log, reads the transcript
between that prompt and this one, and appends an outcome record:

```json
{ "type": "outcome", "session_id": "…", "for_prompt_hash": "…", "at": "…",
  "suggested": "oc-git-ops", "mode": "shadow",
  "skill_calls": ["oc-git-ops"],
  "raw": { "git_commit": false, "git_push": false, "gh_pr_create": false, "gh_pr_merge": true, "deploy": false },
  "followed": true }
```

`suggested` is what the hook suggested (live) or would have suggested
(shadow); `skill_calls` are `Skill` tool_use ids with the `opchain:` prefix
stripped; `raw` flags come from Bash tool_use commands. The step is bounded
(log tail ~200 lines, transcript tail 256 KB) and skipped if it takes more than
300 ms.

```bash
npm run route:eval -- outcomes [--log $TMPDIR/opchain-route-log.jsonl] [--since 2026-10-09] [--report scratch/route-outcomes.md]
```

`--log` defaults to `$OPCHAIN_ROUTE_LOG`, else the hook's default path. Note
that the hook's `$TMPDIR` is Claude Code's, which may differ from your shell's;
set `OPCHAIN_ROUTE_LOG` in both if in doubt. Without `--report` the markdown
is printed.

The report gives a per-skill table (suggestions, followed, follow rate,
related raw activity, proxy TP/FP, proxy precision, FN), the overall and
per-mode follow rate, and "what happened after each suggestion" (in shadow:
would have suggested X; the agent then called skill Y / ran raw git|deploy /
did nothing). Proxy labels, free from production:

| Proxy | Rule |
|---|---|
| TP | suggestion S, and the session then called S **or** ran S's raw command class (git commit/push, `gh pr create`/`merge` → oc-git-ops; `npm run deploy`, `wrangler deploy` → oc-deploy-ops) |
| FP | suggestion S with no activity related to S |
| FN | no suggestion, but an `oc-*` Skill call or a raw git/deploy command followed |
| silent | no suggestion on a non-pipeline prompt (no Skill call, no raw class) |

Outcomes of an explicit `/oc-*` mention (`explicit: true`: the user typed the
command and it routed at p=1 without a model call) measure the user, not the
router. They are excluded from the suggestion count and every metric below and
reported on their own row.

**Day-8 go/no-go** (the report prints the verdict). Switch to
`OPCHAIN_ROUTE_MODE=live` only when all three hold over the shadow period:

1. **≥ 30 suggestions** (would-have-suggested) — fewer is anecdote.
2. **Proxy precision ≥ 0.8 on the core skills.**
3. **Silent rate ≥ 0.95 on non-pipeline prompts** — at most one ordinary
   prompt in twenty gets a nudge.

A NO-GO keeps shadow on. Read the FP transitions and FN rows first: they are
either spec copy to fix, a skill to drop from the allowlist, or a raw class the
proxy does not know about yet (the proxy undercounts skills with no raw command
class, so a non-core FP is a prompt to look at, not proof).

## Tests

```bash
npx vitest run tests/route-eval.test.js
```

The tests build a synthetic transcript corpus (skill, implied, none,
slash-command, notification, envelope, sidechain and subagent cases), check the
captured `conversation` per row, pin the precision/recall arithmetic on a
seven-row set and the allowlist-suppression arithmetic, drive `run --fixture`
with a fake route module through the CLI (including the no-re-query re-run),
and pin the outcomes report arithmetic and verdict on a fixture log. They need
neither the real router nor an API key. The hook's outcome records and shadow
default are covered in `tests/route-hook.test.js`.
