import type { Walkthrough } from "./types";

/**
 * Scenario (v2.0 realism pass) — a legaltech SaaS runs a Claude-powered
 * contract-review feature and must move off a deprecating model.
 * oc-claude-api scopes the blast radius first (Step 0: never edit on an
 * ambiguous scope), applies the [BLOCKS]/[TUNE] checklist for this exact
 * hop, and opens PR #412 with the production defaults still pinned to the
 * OLD model. oc-prompt-ops then runs `/oc-prompt drift` — the unchanged
 * prompt against the newly pinned model — and finds four deterministic
 * per-case flips hiding under aggregate deltas that are all inside the
 * n=120 noise floor. The fix takes two rounds: round 1 passes on aggregate
 * but breaks ctr-063 on a running page header, and `/oc-prompt regress`
 * fails it. Round 2 clears. oc-release-ops ships v4.2.0 with a signed tag;
 * oc-deploy-ops does staging → prod; oc-monitoring-ops takes the watch.
 * The thesis: a model swap is a regression-gated change, not a hope — and
 * the signal is per-case, not per-metric.
 */
export const modelMigration: Walkthrough = {
  id: "model-migration",
  title: "Migrate a Claude feature to a new model without regressing",
  tagline: "Model swap, regression-gated",
  summary:
    "A contract-review feature has to move off a deprecating model. oc-claude-api scopes it and applies the breaking-change checklist; oc-prompt-ops runs drift on the golden set, finds four deterministic per-case flips under aggregate deltas that are all inside the noise floor, and needs two rounds to fix them; oc-release-ops ships v4.2.0.",
  description:
    "Clause is a legaltech SaaS whose core feature extracts clauses from uploaded contracts and flags risky terms — all running on Claude (Sonnet 4.5). On 2026-06-16 the provider posts a deprecation notice: `claude-sonnet-4-5` retires 2026-09-14. The team is scared, because the feature is load-bearing and 'just swap the model id' has burned them before. oc-claude-api starts with scope, not edits: seven files carry the id, one of them uses a last-assistant-turn prefill that returns a 400 on 4.6, and three beta headers are now GA. It corrects the folklore too — the two models are priced identically ($3 / $15 per MTok), and 4.6 defaults to `effort: high`, so it is *slower* by default, not faster, until you tune it. PR #412 lands the config indirection with the defaults still on 4.5. Then oc-prompt-ops runs `/oc-prompt drift` — the byte-identical prompt against the newly pinned model — across 120 contracts, 1,338 labelled clause spans and 412 labelled risk flags. Every aggregate delta lands inside the ±9-point noise band for n=120 binaries, so the report refuses to call them. What it does call is deterministic: four contracts (`ctr-012`, `ctr-041`, `ctr-097`, `ctr-118`) flip from exact to clipped on indemnification spans, reproducibly, at temperature 0, through one shared mechanism. Per-contract citation exactness 108/120 → 104/120; the indemnification slice 46/50 → 42/50. Fixing it takes two rounds: round 1 raises the aggregate and then breaks `ctr-063`, whose limitation-of-liability clause gets cut at a running page header, and `/oc-prompt regress` fails the round on that one case alone. Round 2 clears at 111/120 with zero regressions, the baseline is re-frozen on 4.6, and oc-release-ops ships v4.2.0 with a signed tag, a keep-a-changelog entry that carries the real numbers, and an evidence bundle a customer's compliance team can actually read.",
  inputs: [
    "Legaltech SaaS · Clause · `clause-api` (TypeScript, `@anthropic-ai/sdk` 0.79.1) on `claude-sonnet-4-5`",
    "Deprecation notice 2026-06-16 — `claude-sonnet-4-5` retires 2026-09-14 (88 days out at session start)",
    "Existing golden set from launch: 120 contracts · 1,338 labelled clause spans · 50 indemnification spans · 412 labelled risk flags",
    "Prompt-as-code layout already in place: `prompts/clause-extract/v1.7.0/` + `eval/{inputs,expected}.jsonl`, `eval.yaml`, `baseline.json`",
    "Hard requirement: no quality regression on extraction — a silent drop is a liability event, not a cosmetic one",
  ],
  outputs: [
    {
      id: "migration-playbook",
      label: "Migration playbook — scope, [BLOCKS]/[TUNE], verify",
      kind: "playbook.md",
      body:
`# Migration Playbook — \`claude-sonnet-4-5\` → \`claude-sonnet-4-6\` (Clause)

**Produced by** oc-claude-api · \`/oc-claude-api migrate --from claude-sonnet-4-5 --to claude-sonnet-4-6\`
**Trigger:** deprecation notice 2026-06-16 · **retirement 2026-09-14** (88 days out)
**Repo:** \`clause-api\` @ \`main\` (\`4b71e0c\`) · TypeScript · \`@anthropic-ai/sdk\` 0.79.1
**Session:** 2026-06-18 · **Scope (user-confirmed):** \`lib/**\`, \`test/**\` — \`docs/**\` excluded
**Output:** this playbook + PR #412

---

## 0. Scope (Step 1 — never start editing on an ambiguous scope)

\`\`\`
$ rg -l "claude-sonnet-4-5"
lib/clause/extract.ts
lib/clause/risk.ts
lib/clause/summarize.ts
lib/llm/allowlist.ts
test/fixtures/extract.snapshot.json
.env.example
docs/runbook.md

7 files, 11 matches
\`\`\`

| File | Bucket | Action |
|---|---|---|
| \`lib/clause/extract.ts\` | API caller | rewrite call site + 3 \`[BLOCKS]\` fixes (§2) |
| \`lib/clause/risk.ts\` | API caller | rewrite call site |
| \`lib/clause/summarize.ts\` | API caller | rewrite call site — **and give it its own key** (§3) |
| \`lib/llm/allowlist.ts\` | registry | **add alongside**, do not replace — both ids are valid until 2026-09-14 |
| \`test/fixtures/extract.snapshot.json\` | fixture | regenerate after the call sites land |
| \`.env.example\` | opaque ref | update the commented default only |
| \`docs/runbook.md\` | prose | **skip** — out of scope per the user |

The model-id grep is not the whole blast radius. Two compat greps run next:

\`\`\`
$ rg -n 'role: "assistant"' lib/
lib/clause/extract.ts:88    { role: "assistant", content: "{" },

$ rg -n 'betas:|beta\\.messages|output_format' lib/
lib/clause/extract.ts:61    betas: ["effort-2025-11-24",
lib/clause/extract.ts:62            "fine-grained-tool-streaming-2025-05-14",
lib/clause/extract.ts:63            "interleaved-thinking-2025-05-14"],
lib/clause/extract.ts:71    const resp = await client.beta.messages.create({
lib/clause/risk.ts:44       output_format: { type: "json_schema", schema: RiskFlagSchema },
\`\`\`

Both land in the same two files already in scope. **6 files changed, 1 added.**

---

## 1. What actually changes (checked against the model card, not folklore)

| Dimension | Sonnet 4.5 | Sonnet 4.6 | Action |
|---|---|---|---|
| Model id | \`claude-sonnet-4-5\` | \`claude-sonnet-4-6\` | config, not literal (§3) |
| Context window | 200K | **1M** | none today — largest contract in the set is 41K tok |
| Max output tokens | 64K | 128K | none — we cap at 4,096; stream above ~16K if that ever changes |
| Price in / out per MTok | \$3 / \$15 | **\$3 / \$15 — identical** | any cost delta is token *count*, not rate |
| Reasoning effort | no \`effort\` param | **defaults to \`high\`** | \`[TUNE]\` — §2 |
| Thinking budget | \`budget_tokens\` | deprecated → adaptive | n/a — we send no thinking |
| Min cacheable prefix | 1,024 tok | 1,024 tok | none — but caches are **model-scoped** (§4) |
| Prefill via last assistant turn | allowed | **400 \`invalid_request_error\`** | \`[BLOCKS]\` — §2 |
| Beta headers in use | 3 | all 3 GA | \`[BLOCKS]\` — §2 |

Two rows in this table contradict what the team believed walking in, and both
matter more than the id swap:

- **Price is identical.** There is no "4.6 is cheaper" effect. If cost per
  contract moves, it moved because the number of output tokens moved — which
  is exactly what a terser or a longer citation span does. Treat any cost
  delta as a *behaviour signal*, not a saving.
- **4.6 is slower by default, not faster.** 4.5 had no \`effort\` parameter;
  4.6 defaults to \`effort: "high"\`, which means noticeably higher latency and
  token usage on a task that needs neither. Clause does structured extraction
  from a supplied document — there is nothing to reason about. The \`[TUNE]\`
  in §2 is what makes the latency number in the eval real. Without it, expect
  4.6 to be *worse* on p95 and more expensive per contract.

---

## 2. Breaking-change checklist for this hop

\`[BLOCKS]\` = will fail or silently change behaviour if not addressed before the first request.
\`[TUNE]\` = will work, but with the wrong latency/cost profile until set.

### \`[BLOCKS]\` 1 — last-assistant-turn prefill → structured output

\`lib/clause/extract.ts:88\` prefills \`{ role: "assistant", content: "{" }\` to
force clean JSON. That was the 3.5-era trick. On 4.6 it returns:

\`\`\`
400 invalid_request_error: prefilling the final assistant turn is not
supported for this model
\`\`\`

The replacement is not "delete the prefill and hope" — it is the schema the
repo already has. \`ClauseSet\` is a zod schema in \`lib/clause/schema.ts\`;
\`zodToJsonSchema(ClauseSet)\` feeds \`output_config.format\` directly.

### \`[BLOCKS]\` 2 — beta headers are GA; drop the \`.beta\` namespace

All three headers at \`extract.ts:61-63\` (\`effort-2025-11-24\`,
\`fine-grained-tool-streaming-2025-05-14\`, \`interleaved-thinking-2025-05-14\`)
are GA. Sending them is at best a no-op and at worst a 400. With no betas
left, \`client.beta.messages.create\` → \`client.messages.create\`.

### \`[BLOCKS]\` 3 — \`output_format\` → \`output_config.format\`

\`lib/clause/risk.ts:44\` uses the old top-level key. It is silently ignored
on 4.6, which means risk-flag responses stop being schema-constrained without
raising anything. This is the one that would have shipped unnoticed.

### \`[TUNE]\` 1 + 2 — effort and thinking

\`\`\`ts
output_config: { effort: "low", format: { type: "json_schema", schema: clauseSetJsonSchema } },
thinking: { type: "disabled" },
\`\`\`

### Not applicable here, checked anyway

- \`budget_tokens\` → adaptive: we send no \`thinking\` block. n/a.
- Tool-call JSON escaping differs between the two models. Clause parses tool
  inputs with \`JSON.parse\` and never string-matches them, so no change — but
  any code that string-matched an escaped quote inside a tool argument
  would have broken here.

---

## 3. The diff

\`\`\`diff
# lib/llm/config.ts  (new — single source of truth)
+ export const MODELS = {
+   clauseExtract: process.env.CLAUSE_MODEL    ?? "claude-sonnet-4-5",
+   riskFlag:      process.env.RISK_MODEL      ?? "claude-sonnet-4-5",
+   summarize:     process.env.SUMMARY_MODEL   ?? "claude-sonnet-4-5",
+ } as const;
\`\`\`

**The defaults stay on 4.5 in this PR.** Merging #412 must not move a single
production request. The swap is the release bump (\`oc-release-ops\`), gated on
the eval; until then 4.6 is reachable only by setting the env var, which is
exactly what the eval harness does per run.

\`\`\`diff
# lib/clause/extract.ts
+ import { MODELS } from "../llm/config";
+ import { clauseSetJsonSchema } from "./schema";

- betas: ["effort-2025-11-24",
-         "fine-grained-tool-streaming-2025-05-14",
-         "interleaved-thinking-2025-05-14"],
- const resp = await client.beta.messages.create({
-   model: "claude-sonnet-4-5",
+ const resp = await client.messages.create({
+   model: MODELS.clauseExtract,
    max_tokens: 4096,
    temperature: 0,
+   output_config: {
+     effort: "low",
+     format: { type: "json_schema", schema: clauseSetJsonSchema },
+   },
+   thinking: { type: "disabled" },
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [
      { role: "user", content: contractText },
-     { role: "assistant", content: "{" },
    ],
  });

# lib/clause/risk.ts
- model: "claude-sonnet-4-5",
- output_format: { type: "json_schema", schema: RiskFlagSchema },
+ model: MODELS.riskFlag,
+ output_config: { format: { type: "json_schema", schema: RiskFlagSchema }, effort: "low" },

# lib/clause/summarize.ts
- model: "claude-sonnet-4-5",
+ model: MODELS.summarize,      // was reading the risk-flag key; own key now

# lib/llm/allowlist.ts
  export const ALLOWED_MODELS = [
    "claude-sonnet-4-5",
+   "claude-sonnet-4-6",
  ] as const;
\`\`\`

\`summarize.ts\` was reading a \`riskFlag\` key — a summariser pinned to the
risk-flag model. Nobody would have caught that from the outside and it would
have made the next migration wrong in a different way. It gets \`MODELS.summarize\`.

---

## 4. Prompt caching — the cold-write nobody budgets for

The system prompt + clause taxonomy is 2,914 tokens, over the 1,024-token
minimum on both Sonnets, so the breakpoint stays valid. **But caches are
keyed by model.** The first request on 4.6 is a cache *write*, not a read, at
1.25× input rate — and the eval harness, which alternates models, pays that
write on every model switch. Budget for it; it is ~\$0.01 per switch here, not
a line item, but on a 4,000-token system prompt at scale it is real.

---

## 5. Rollback

\`\`\`
export CLAUSE_MODEL=claude-sonnet-4-5
export RISK_MODEL=claude-sonnet-4-5
# redeploy → instant revert, no code change
\`\`\`

Valid until **2026-09-14**. After that, rollback is forward-only (to a
different current model), which is precisely why the eval gate has to be green
*before* the release bump, not after it.

---

## 6. Verify (Step 6 — assert on the response, don't trust the config)

\`\`\`
$ CLAUSE_MODEL=claude-sonnet-4-6 npx tsx scripts/verify-model.ts test/fixtures/msa-sample.pdf

request 1  (cold)
  resp.model                     claude-sonnet-4-6
  usage.input_tokens             41
  usage.cache_creation_input_tokens  2914
  usage.cache_read_input_tokens  0
  usage.output_tokens            1102
  stop_reason                    end_turn
  latency                        3.31s

request 2  (warm, same prefix)
  resp.model                     claude-sonnet-4-6
  usage.cache_creation_input_tokens  0
  usage.cache_read_input_tokens  2914
  latency                        2.87s

assert resp.model.startsWith("claude-sonnet-4-6")   PASS
assert parsed.clauses.length > 0                    PASS  (14 clauses)
assert ClauseSet.safeParse(parsed).success          PASS
\`\`\`

The point of asserting on \`resp.model\` rather than on the env var is that a
typo'd id does not fall back — it errors — but a *stale build* does. This
check catches the stale build.

\`\`\`
$ npm test
Test Suites: 24 passed, 24 total
Tests:       212 passed, 212 total
Time:        38.4s
\`\`\`

(1 snapshot updated: \`test/fixtures/extract.snapshot.json\` — spans unchanged,
only the recorded \`model\` field moved.)

---

## 7. PR

Branch \`chore/migrate-sonnet-4-6\` → **PR #412** (full body attached separately).
Required checks: \`test\`, \`prompt-drift\`, \`prompt-regress\`, \`cost-gate\`.
\`prompt-drift\` is red on open, by design — nothing has run the golden set yet.

---

## 8. Handoff

The behavioural question — *does 4.6 extract as well as 4.5 on our contracts?*
— is not answerable from a model card. It is answerable from the golden set.

**Now using oc-prompt-ops** — \`/oc-prompt drift clause-extract --against claude-sonnet-4-6\`.

\`\`\`json
// .checkpoints/oc-claude-api.checkpoint.json  (skill_state excerpt)
{
  "protocol_version": "1.1",
  "skill": "oc-claude-api",
  "phase": "migrate",
  "step": "pr-open-awaiting-drift",
  "status": "blocked",
  "skill_state": {
    "last_migration": {
      "from": "claude-sonnet-4-5",
      "to": "claude-sonnet-4-6",
      "deadline": "2026-09-14",
      "files_changed": 6,
      "files_added": 1,
      "blocks_applied": 3,
      "tunes_applied": 2,
      "defaults_flipped": false,
      "pr": 412
    }
  },
  "blockers": [
    {
      "id": "B-1",
      "description": "No behavioural evidence for 4.6 on the golden set",
      "blocking": true,
      "needs": "oc-prompt-ops /oc-prompt drift clause-extract",
      "proposed_resolution": "Hold the default on 4.5 until drift + regress are green"
    }
  ],
  "next_actions": ["oc-prompt-ops: drift run", "hold defaults at 4.5 until gate green"]
}
\`\`\``,
    },
    {
      id: "migration-pr",
      label: "PR #412 — migrate behind config, defaults still on 4.5",
      kind: "pull-request",
      body:
`# PR #412 · \`chore/migrate-sonnet-4-6\` → \`main\`

**clause-api** · opened 2026-06-18 10:04Z by oc-claude-api · **Draft → Ready** · base \`4b71e0c\`

> ## chore(llm): migrate clause extraction to claude-sonnet-4-6 behind config
>
> \`claude-sonnet-4-5\` retires **2026-09-14** (notice 2026-06-16). This PR makes
> the swap *possible* and *reversible*. It does **not** perform it: every default
> in \`lib/llm/config.ts\` is still \`claude-sonnet-4-5\`. Merging this changes zero
> production requests. The flip happens in the release bump, gated on the eval.
>
> ### Source → target
>
> | | |
> |---|---|
> | From | \`claude-sonnet-4-5\` |
> | To | \`claude-sonnet-4-6\` |
> | Deadline | 2026-09-14 |
> | Price change | none — \$3 / \$15 per MTok on both |
> | Default in this PR | **unchanged (4.5)** |
>
> ### Files (6 changed, 1 added)
>
> | File | Bucket | Change |
> |---|---|---|
> | \`lib/llm/config.ts\` | **new** | \`MODELS\` map, env-overridable, defaults 4.5 |
> | \`lib/clause/extract.ts\` | API caller | \`[BLOCKS]\` ×3 + \`[TUNE]\` ×2 + \`MODELS.clauseExtract\` |
> | \`lib/clause/risk.ts\` | API caller | \`output_format\` → \`output_config.format\`, \`MODELS.riskFlag\` |
> | \`lib/clause/summarize.ts\` | API caller | now \`MODELS.summarize\` (was reading the risk-flag key) |
> | \`lib/llm/allowlist.ts\` | registry | 4.6 added **alongside** 4.5 |
> | \`test/fixtures/extract.snapshot.json\` | fixture | regenerated; spans byte-identical |
> | \`.env.example\` | opaque ref | documents \`CLAUSE_MODEL\` / \`RISK_MODEL\` / \`SUMMARY_MODEL\` |
>
> ### \`[BLOCKS]\` applied (3)
>
> 1. **Last-assistant-turn prefill removed** (\`extract.ts:88\`). 4.6 returns
>    \`400 invalid_request_error\` for it. Replaced with
>    \`output_config.format: { type: "json_schema", schema: clauseSetJsonSchema }\`,
>    generated from the existing zod \`ClauseSet\` — so the guarantee got
>    *stronger*, not weaker.
> 2. **Beta headers removed** (\`extract.ts:61-63\`): \`effort-2025-11-24\`,
>    \`fine-grained-tool-streaming-2025-05-14\`, \`interleaved-thinking-2025-05-14\`
>    are all GA. With no betas left, \`client.beta.messages.create\` →
>    \`client.messages.create\`.
> 3. **\`output_format\` → \`output_config.format\`** (\`risk.ts:44\`). The old key is
>    ignored rather than rejected on 4.6 — risk-flag output would have quietly
>    stopped being schema-constrained. This is the one that would have shipped.
>
> ### \`[TUNE]\` applied (2)
>
> 4.6 defaults to \`effort: "high"\`; 4.5 had no such parameter. Left alone, 4.6 is
> slower and more expensive than 4.5 on this workload. Set
> \`output_config.effort: "low"\` and \`thinking: { type: "disabled" }\` on all three
> call sites — structured extraction from a supplied document has nothing to
> reason about.
>
> ### Verify
>
> \`\`\`
> $ CLAUSE_MODEL=claude-sonnet-4-6 npx tsx scripts/verify-model.ts
>   resp.model                         claude-sonnet-4-6
>   cache_creation_input_tokens        2914   (cold — caches are model-scoped)
>   cache_read_input_tokens (req 2)    2914
>   ClauseSet.safeParse                PASS
> \`\`\`
>
> ### Rollback
>
> \`CLAUSE_MODEL=claude-sonnet-4-5\` + redeploy. No code change. Valid until 2026-09-14.
>
> ### Not in this PR
>
> - Flipping the defaults (release bump, after the gate).
> - \`docs/runbook.md\` — still names 4.5; out of scope per the user, tracked as CL-317.

---

## Checks

\`\`\`
✓  test                    212 passed, 24 suites               38s
✗  prompt-drift            no drift run for claude-sonnet-4-6  —
—  prompt-regress          skipped (no prompt change in this PR)
—  cost-gate               waiting on prompt-drift
\`\`\`

\`prompt-drift\` red on open is the intended state, not a broken CI job: nothing
has measured 4.6 on the golden set yet, and the required check exists precisely
so that a model change cannot merge on somebody's confidence.

## Review

**@dana-k** (approved, 2026-06-18 11:02Z)
> The \`summarize.ts\` key thing has been wrong since launch and I reviewed the PR
> that introduced it. Good catch. Holding the defaults at 4.5 is the right call —
> last time we flipped the default in the same PR as the indirection and then
> couldn't tell which change caused the weirdness.

**@priya-n** (comment, 2026-06-18 11:20Z)
> \`risk.ts:44\` — confirming \`output_format\` really is ignored and not rejected?
> If so we should add a lint rule, because nothing else in the repo would catch it.
>
> ↳ **oc-claude-api:** Confirmed, ignored silently. Lint rule filed as CL-319
>   (\`no-restricted-syntax\` on the bare \`output_format\` key).`,
    },
    {
      id: "eval-delta",
      label: "Drift run — golden set, 4.5 vs 4.6, per-case",
      kind: "eval.md",
      body:
`# \`/oc-prompt drift clause-extract --against claude-sonnet-4-6\`

**Produced by** oc-prompt-ops · **Verb:** \`drift\` (the prompt is byte-identical; the *model* moved — \`regress\` is for prompt edits) · **Blocks:** the \`prompt-drift\` check on PR #412

---

## 0. Run metadata

\`\`\`
run_id            drift-20260618-1012-a41c
started           2026-06-18T10:12:41Z
finished          2026-06-18T10:28:45Z      wall 16m 04s
prompt            clause-extract v1.7.0     sha256:3f9c1ab8…  (identical on both arms)
arm A             claude-sonnet-4-5         (baseline.json, frozen 2026-02-11)
arm B             claude-sonnet-4-6
temperature       0                         (both arms)
arm B extras      output_config.effort=low, thinking.type=disabled
max_tokens        4096                      (both arms)
transport         Batch API, both arms submitted together
                  msgbatch_01Hq9Rk2 (A) · msgbatch_01Hq9Rk3 (B)
judge             claude-opus-4-8           schema { score: 0|1, reason: string }
cost              arm A \$4.90 · arm B \$4.90 · judge \$3.10 · total \$12.90
cache             arm B first request was a cold write (2,914 tok) — caches are model-scoped
\`\`\`

### Golden set

\`\`\`
120 contracts
  1,338 labelled clause spans
     50 indemnification spans across 38 contracts
        (22 of the 50 come from one customer's MSA template family — "Kestrel")
    412 labelled risk flags
\`\`\`

### \`prompts/clause-extract/eval/eval.yaml\` (excerpt)

\`\`\`yaml
prompt: clause-extract
version: v1.7.0
model: claude-sonnet-4-5          # the pinned model IS part of the prompt version
inputs:   eval/inputs.jsonl       # 120 contracts
expected: eval/expected.jsonl
graders:
  - id: clause_set
    mode: set_overlap             # reports recall + precision over clause ids
    field: clauses[].type
  - id: citation_span
    mode: exact                   # [start, end] char offsets, exact match
    field: clauses[].span
    slices: [indemnification, limitation_of_liability, termination]
  - id: risk_flag
    mode: llm_judge
    judge_model: claude-opus-4-8
    schema: { score: integer, reason: string }
thresholds:
  pass_rate: 0.90                 # per-contract, citation_span grader
  regression_epsilon: 0.03        # aggregate moves inside this are not called
  per_case_regressions: 0         # any case flipping pass → fail fails the run
cost:
  budget_per_eval: 15.00
batch: true
\`\`\`

---

## 1. Results — 4.5 → 4.6, prompt unchanged

\`\`\`
PROMPT DRIFT — clause-extract
  baseline   v1.7.0 @ claude-sonnet-4-5   (baseline.json, 2026-02-11)
  drift run  v1.7.0 @ claude-sonnet-4-6   (prompt sha unchanged)
  run_id     drift-20260618-1012-a41c

  grader          metric                n       baseline    drift       Δ
  ──────────────────────────────────────────────────────────────────────────
  clause_set      recall             1,338   1218  0.910   1258  0.940   +3.0
  clause_set      precision          1,309*  1218  0.930   1258  0.950   +2.0
  citation_span   exact (contract)     120    108  0.900    104  0.867   −3.3
  citation_span   └ indemnification     50     46  0.920     42  0.840   −8.0
  citation_span   └ limitation_liab     97     88  0.907     88  0.907    0.0
  citation_span   └ termination        114    110  0.965    110  0.965    0.0
  risk_flag       precision (judge)    398*   350  0.879    354  0.910   +3.1
  risk_flag       recall (judge)       412    350  0.850    354  0.859   +0.9
  schema          valid JSON           120    119  0.992    120  1.000   +0.8
  ──────────────────────────────────────────────────────────────────────────
  cost / contract                              \$0.041       \$0.038      −7.3%
  p95 latency                                    4.1s         3.6s      −12.2%

  * precision denominators are spans/flags RETURNED, not labelled:
    clause_set 1,309 (A) / 1,324 (B) · risk_flag 398 (A) / 389 (B)

  per-case flips (pass → fail):  4
  per-case flips (fail → pass):  0

  ctr-012   citation_span  1.00 → 0.00   indemnification §11.1  REGRESSED on new model
  ctr-041   citation_span  1.00 → 0.00   indemnification §9.1   REGRESSED on new model
  ctr-097   citation_span  1.00 → 0.00   indemnification §9.2   REGRESSED on new model
  ctr-118   citation_span  1.00 → 0.00   indemnification §14    REGRESSED on new model

  VERDICT: DRIFT — model bump regressed 4 cases on citation_span.
           Block the re-pin. thresholds.per_case_regressions = 0.
\`\`\`

---

## 2. Noise floor — read this before reading the table above

On binary per-case pass rates the 95% half-width is roughly \`1/sqrt(n)\`:

\`\`\`
n = 120  (per-contract)        ±9.1 points
n =  50  (indemnification)     ±14.1 points
n = 412  (risk flags)          ±4.9 points
n = 1,338 (clause spans)       ±2.7 points
\`\`\`

**Every single aggregate Δ in §1 except \`clause_set recall\` sits inside its own
noise band.** +3.1 on risk-flag precision, +0.9 on risk-flag recall, +0.8 on
schema validity, −3.3 on per-contract exactness, even −8.0 on the indemnification
slice: none of them is significant on its own at these sample sizes. A report
that leads with "risk-flag precision improved 3 points" is lying with a straight
face.

What is **not** noise:

- **The four flips are deterministic.** \`temperature: 0\`, \`exact\` grading on
  \`[start, end]\` char offsets. The four contracts were re-run on 4.6 three more
  times (4 contracts × 3 = 12 calls, \$0.01): byte-identical spans every time.
- **They share one mechanism** (§3), which makes them one finding, not four.
- **They are one-directional.** Zero cases flipped fail → pass. Under a pure
  noise model at this effect size you would expect flips in both directions.
- **\`schema valid JSON\` 119 → 120 is not a model win at all.** It is a config
  win: \`output_config.format\` makes malformed JSON structurally impossible. The
  one 4.5 failure was a truncated object on the longest contract. Don't credit
  4.6 for it.

The honest one-liner: *4.6 is not measurably better or worse on aggregate at
n=120; it is deterministically different on one clause type.*

---

## 3. Root cause — shown, not asserted

\`ctr-041\`, §9.1 (Indemnification), a bespoke AU supply agreement:

\`\`\`
expected   [14203, 15877]   1,674 chars
  "9.1 Indemnification. The Supplier shall indemnify, defend and hold
   harmless the Customer … (a) any breach of clause 8 (Data Protection);
   (b) any third-party claim alleging infringement …; and (c) any fine
   or penalty imposed by a Regulator arising from the foregoing. This
   clause 9.1 survives termination."

4.6         [14203, 14611]     408 chars
  "9.1 Indemnification. The Supplier shall indemnify, defend and hold
   harmless the Customer …"

4.5         [14203, 15877]   exact match
\`\`\`

Same start offset, both models. 4.6 stops at the end of the first sentence —
the *operative* sentence — and drops sub-clauses (a), (b), (c) and the survival
sentence. On an indemnification clause, sub-clause (c) is the part a general
counsel actually reads.

\`\`\`
grader: citation_span  mode=exact
  ctr-041  end offset 14611 != 14203..15877  →  0.0
\`\`\`

All four flips have the identical shape: correct start offset, end offset at the
first sentence terminator. The prompt at \`v1.7.0\` says:

> return its citation span: the exact text of the clause as it appears in the contract.

"the clause" is under-specified. 4.5 inferred *whole clause including
sub-clauses*; 4.6 read it literally and returned the sentence that states the
obligation. **This is an under-specified prompt that the old model was forgiving
about — not a model defect.** It would have been wrong on 4.5 too, on the first
contract that pushed it.

### Is it just one customer's template?

The user asked, and it is the right question: 22 of the 50 indemnification spans
come from the Kestrel MSA family. \`ctr-012\`, \`ctr-097\` and \`ctr-118\` are all
Kestrel-derived. \`ctr-041\` is not — it is a bespoke AU supply agreement with a
different numbering convention and different drafting counsel. **Three of four
share a template; the mechanism is identical in all four.** It is the
instruction, not the template.

---

## 4. Gate

\`\`\`
GATE  prompt-drift @ PR #412
  thresholds.pass_rate               0.867 < 0.900        FAIL
  thresholds.per_case_regressions    4 > 0                FAIL
  thresholds.regression_epsilon      aggregate −0.033 within 0.03? NO (barely)
  STATUS  BLOCKED
  ACTION  Do not re-pin baseline.json to 4.6. Fix the prompt, run
          /oc-prompt regress, require 0 per-case regressions.
\`\`\`

The per-case rule is what actually holds here. The epsilon rule alone would have
been a coin flip at −0.033 vs 0.03, and the noise band makes the aggregate
uncallable either way. Gate on cases you can reproduce, not on means you can't.

---

## 5. After the fix — final state (see the prompt diff + round-1 log)

Round 1 (\`v1.8.0-rc1\`) raised the aggregate and broke a *different* case;
\`/oc-prompt regress\` failed it. Round 2 (\`v1.8.0\`) is what ships.

\`\`\`
  grader          metric              n       4.5 base    4.6+v1.8.0     Δ vs base
  ─────────────────────────────────────────────────────────────────────────────────
  clause_set      recall           1,338   1218 0.910    1258 0.940       +3.0
  clause_set      precision        1,309   1218 0.930    1258 0.950       +2.0
  citation_span   exact (contract)   120    108 0.900     111 0.925       +2.5
  citation_span   └ indemnification   50     46 0.920      48 0.960       +4.0
  citation_span   └ limitation_liab   97     88 0.907      91 0.938       +3.1
  citation_span   └ termination      114    110 0.965     110 0.965        0.0
  risk_flag       precision (judge)  398    350 0.879     354 0.910       +3.1
  risk_flag       recall (judge)     412    350 0.850     354 0.859       +0.9
  schema          valid JSON         120    119 0.992     120 1.000       +0.8
  ─────────────────────────────────────────────────────────────────────────────────
  cost / contract                          \$0.041          \$0.042        +2.4%
  p95 latency                                4.1s            3.7s         −9.8%

  per-case flips vs 4.5 baseline:   +7 fixed  /  0 regressed
    fixed: ctr-012 ctr-041 ctr-097 ctr-118 (indemnification, the drift flips)
           ctr-031 ctr-063 ctr-102 (limitation_of_liability, previously imprecise)

  risk_flag rows are carried forward unchanged: risk-flag is a separate prompt
  (risk-flag/v1.3.0), untouched by this diff, temperature 0 — the re-run is
  byte-identical. They are shown for completeness, not as a result.

  VERDICT: PASS
\`\`\`

**Cost went up, not down.** \$0.038 → \$0.042. The −7.3% "saving" in §1 was never a
saving: it was 4.6 emitting fewer output tokens because the spans were clipped.
Fix the spans and the tokens come back. Net vs the 4.5 baseline is **+2.4%**,
which oc-cost-ops passes against \`regression_pct: 10\`. Anyone who had shipped
the drift run's cost number as a win would have to un-ship it a week later.

Latency is −9.8%, not the −12.2% of the drift run, for the same reason. Both
numbers are only true at all because of the \`effort: "low"\` \`[TUNE]\` — at 4.6's
default \`effort: "high"\` this workload is *slower* than 4.5.

---

## 6. Checkpoint

\`\`\`json
{
  "last_drift": {
    "run_id": "drift-20260618-1012-a41c",
    "prompt": "clause-extract@v1.7.0",
    "baseline_model": "claude-sonnet-4-5",
    "drift_model": "claude-sonnet-4-6",
    "verdict": "DRIFT",
    "per_case_regressions": ["ctr-012", "ctr-041", "ctr-097", "ctr-118"],
    "cost_usd": 12.90
  },
  "last_eval": {
    "run_id": "rgr-20260618-1408-b0e8",
    "prompt": "clause-extract@v1.8.0",
    "model": "claude-sonnet-4-6",
    "pass_rate": 0.925,
    "per_case_regressions": [],
    "verdict": "PASS"
  }
}
\`\`\`

Handing to **oc-release-ops** with the drift run, both regression rounds, and the
re-frozen baseline as the evidence bundle.`,
    },
    {
      id: "regress-round-1",
      label: "Regression round 1 — FAIL (ctr-063)",
      kind: "eval-round.md",
      body:
`# \`/oc-prompt regress clause-extract\` — round 1

**Produced by** oc-prompt-ops · **Candidate:** \`clause-extract@v1.8.0-rc1\` · **Verdict: FAIL**

\`\`\`
PROMPT REGRESSION — clause-extract
  baseline   v1.7.0 @ claude-sonnet-4-5   (baseline.json, 2026-02-11)
  candidate  v1.8.0-rc1 @ claude-sonnet-4-6
  run_id     rgr-20260618-1341-b0e7
  started    2026-06-18T13:41:09Z    wall 11m 12s    cost \$2.30 (Batch)
  temperature 0 · effort low · thinking disabled

  grader          metric                n      baseline   candidate     Δ
  ────────────────────────────────────────────────────────────────────────────
  citation_span   exact (contract)     120   108 0.900   109 0.908   +0.008  ✓
  citation_span   └ indemnification     50    46 0.920    48 0.960   +0.040  ✓
  citation_span   └ limitation_liab     97    88 0.907    89 0.918   +0.011  ✓
  citation_span   └ termination        114   110 0.965   110 0.965    0.000  ✓
  clause_set      recall             1,338  1218 0.910  1258 0.940   +0.030  ✓
  ────────────────────────────────────────────────────────────────────────────

  per-case flips
    fail → pass  6   ctr-012 ctr-041 ctr-097 ctr-118 ctr-031 ctr-102
    pass → fail  1   ctr-063

  ctr-063   citation_span  exact  1.00 → 0.00   −1.00   ✗ REGRESSION

  VERDICT: FAIL — aggregate improved on every metric, but ctr-063 regressed.
           thresholds.per_case_regressions = 0. Candidate rejected.
\`\`\`

## The one case

\`ctr-063\` §10, Limitation of Liability. The contract is a scanned-then-OCR'd
PDF whose page furniture is inlined into the text stream. The clause spans a
page break, and the running header on the next page repeats the clause title:

\`\`\`
expected   [8102, 9944]    1,842 chars
  "10. LIMITATION OF LIABILITY. Neither party's aggregate liability …
   ──────── page 7 ────────
   10. LIMITATION OF LIABILITY (cont.)
   … shall exceed the fees paid in the twelve (12) months preceding the
   claim. Nothing in this clause limits liability for (a) death or
   personal injury; (b) fraud; or (c) wilful misconduct."

v1.8.0-rc1  [8102, 8760]     658 chars
  "10. LIMITATION OF LIABILITY. Neither party's aggregate liability …"
           ^ stops here — at the running header "10. LIMITATION OF LIABILITY (cont.)"

v1.7.0 @ 4.5   [8102, 9944]   exact
\`\`\`

## Why the fix caused it

The rc1 wording the user approved was:

> The span ends immediately before the next numbered clause heading.

"10. LIMITATION OF LIABILITY (cont.)" **is** a numbered clause heading by any
reasonable reading. The model followed the new instruction correctly and
produced a worse answer. The rule was right; it was just not guarded against
repeated page furniture.

This is the case the aggregate would have hidden: +0.8 points on
\`exact (contract)\` and every slice green. The only thing that caught it was
\`per_case_regressions = 0\`, and the only reason \`ctr-063\` was in the set at all
is that somebody labelled a badly-OCR'd contract at launch.

## Cost note

\`\`\`
oc-cost-ops  cost/contract  \$0.041 baseline → \$0.042 candidate  (+2.4%)
             regression_pct 10  →  PASS
\`\`\`

Longer spans cost more output tokens. The gate is on the *rate of change*, not
on the direction — a prompt that got more correct and slightly more expensive is
a pass; a prompt that got 30% more expensive for +0.008 would not be.

## Action

One additional sentence in \`v1.8.0\` (see the prompt diff, hunk 2) excluding
repeated running headers and footers. Re-run as \`rgr-20260618-1408-b0e8\`.`,
    },
    {
      id: "prompt-diff",
      label: "clause-extract v1.7.0 → v1.8.0 (MINOR)",
      kind: "prompt.diff",
      body:
`# \`clause-extract\` v1.7.0 → v1.8.0 — MINOR (pinned model + span boundary)

**Produced by** oc-prompt-ops · **Why:** close the four deterministic citation-span
flips from \`drift-20260618-1012-a41c\` · **Bump rule:** changing the pinned model
alone is at least a MINOR — the model is part of the prompt's behaviour contract,
and this change moves both.

Prompts live as versioned directories, not as a mutable file:

\`\`\`
prompts/clause-extract/
├── v1.7.0/prompt.md          (frozen)
├── v1.8.0/prompt.md          (new)
├── eval/
│   ├── inputs.jsonl          120 contracts
│   ├── expected.jsonl        1,338 spans + 412 risk flags
│   ├── eval.yaml
│   └── baseline.json         re-frozen at v1.8.0 @ claude-sonnet-4-6
└── CHANGELOG.md
\`\`\`

---

## 1. Hunk 1 — the boundary rule (round 1, \`v1.8.0-rc1\`)

\`\`\`diff
--- prompts/clause-extract/v1.7.0/prompt.md
+++ prompts/clause-extract/v1.8.0/prompt.md
@@ 31,7 +31,12 @@ ## Citation spans
   When you extract a clause, return its citation span: the exact text
-  of the clause as it appears in the contract.
+  of the clause as it appears in the contract. The span MUST cover the
+  COMPLETE clause, from its opening boundary through the end of its final
+  sentence, INCLUDING every lettered or numbered sub-clause and any
+  survival sentence. Do not return only the operative sentence. The span
+  ends immediately before the next numbered clause heading.
\`\`\`

Round 1 result: aggregate up on every metric — and \`ctr-063\` regressed, because
"10. LIMITATION OF LIABILITY (cont.)" is a numbered clause heading. \`/oc-prompt
regress\` returned **FAIL** on that one case. (See the round-1 log.)

## 2. Hunk 2 — the guard (round 2, \`v1.8.0\`)

\`\`\`diff
@@ 31,12 +31,15 @@ ## Citation spans
   ends immediately before the next numbered clause heading. Ignore
+  repeated running headers and footers: if a line matching the current
+  clause's own heading reappears (optionally suffixed "(cont.)",
+  "continued", or a page number), it is page furniture, not a new
+  clause, and the span continues through it.
\`\`\`

Three sentences across two rounds. The first was the idea; the second is what
made it survive contact with a real OCR'd PDF.

This is a **strictly better prompt on both models**, not a 4.6 workaround. The
v1.7.0 wording was under-specified and 4.5 happened to guess right; the first
contract with an unusual numbering convention would have broken it there too.

---

## 3. \`/oc-prompt diff clause-extract@v1.7.0 clause-extract@v1.8.0\`

\`\`\`
PROMPT DIFF  clause-extract
  v1.7.0  sha256:3f9c1ab8…   1,204 tok   pinned claude-sonnet-4-5
  v1.8.0  sha256:c70e45d2…   1,278 tok   pinned claude-sonnet-4-6
  bump    MINOR              +74 tok system prefix (still > 1,024 cache minimum)

  text
    ~ §Citation spans      +3 sentences (boundary rule + running-header guard)
    ~ frontmatter model    claude-sonnet-4-5 → claude-sonnet-4-6
    = §Clause taxonomy     unchanged
    = §Risk flags          unchanged
    = §Output schema       unchanged

  scorecard                        v1.7.0@4.5      v1.8.0@4.6
    citation_span exact (contract)  108/120  0.900  111/120  0.925   +2.5
      └ indemnification              46/50   0.920   48/50   0.960   +4.0
      └ limitation_of_liability      88/97   0.907   91/97   0.938   +3.1
      └ termination                 110/114  0.965  110/114  0.965    0.0
    clause_set recall             1218/1338  0.910 1258/1338 0.940   +3.0
    clause_set precision          1218/1309  0.930 1258/1324 0.950   +2.0
    schema valid JSON               119/120  0.992  120/120  1.000   +0.8
    cost / contract                     \$0.041         \$0.042      +2.4%
    p95 latency                           4.1s           3.7s       −9.8%

  per-case  +7 fixed / 0 regressed
  rounds    2 (rc1 FAILED on ctr-063)
  VERDICT   PASS — eligible for baseline re-freeze
\`\`\`

Every prompt version carries its measured delta. "We changed the prompt and it
feels better" is not a thing here — and note that most of these numbers are
inside their noise bands. The line that earns the merge is **+7 fixed / 0
regressed**, on named, reproducible cases.

---

## 4. \`eval.yaml\` + expected set

\`\`\`diff
--- prompts/clause-extract/eval/eval.yaml
+++ prompts/clause-extract/eval/eval.yaml
@@
   prompt: clause-extract
-  version: v1.7.0
-  model: claude-sonnet-4-5
+  version: v1.8.0
+  model: claude-sonnet-4-6
\`\`\`

\`\`\`diff
--- prompts/clause-extract/eval/expected.jsonl
+++ prompts/clause-extract/eval/expected.jsonl
@@
- {"id":"ctr-041","clause":"indemnification","section":"9.1","span":[14203,15877],"mode":"exact"}
+ {"id":"ctr-041","clause":"indemnification","section":"9.1","span":[14203,15877],"mode":"exact",
+  "tags":["anchor","regression:citation-span-v1.8.0"]}
\`\`\`

Five anchor cases now:

| id | clause | tag | what it pins |
|---|---|---|---|
| \`ctr-012\` | indemnification §11.1 | \`regression:citation-span-v1.8.0\` | sub-clause (a)–(d) inclusion |
| \`ctr-041\` | indemnification §9.1 | \`regression:citation-span-v1.8.0\` | survival sentence inclusion |
| \`ctr-097\` | indemnification §9.2 | \`regression:citation-span-v1.8.0\` | Kestrel MSA family |
| \`ctr-118\` | indemnification §14 | \`regression:citation-span-v1.8.0\` | unnumbered sub-paragraphs |
| \`ctr-063\` | limitation §10 | \`regression:running-header-v1.8.0\` | page-break running header |

Any future prompt edit or model swap that re-clips one of these fails
\`/oc-prompt regress\` before it can merge. \`ctr-063\` only exists as an anchor
because round 1 broke it — which is the argument for running regress rounds
rather than shipping the first candidate that improves the mean.

---

## 5. Baseline re-freeze

\`\`\`
$ /oc-prompt baseline clause-extract --freeze
  wrote prompts/clause-extract/eval/baseline.json
    prompt        clause-extract@v1.8.0
    model         claude-sonnet-4-6
    run_id        rgr-20260618-1408-b0e8
    frozen_at     2026-06-18T14:19:52Z
    pass_rate     0.925   (111/120)
    anchors       5
    supersedes    v1.7.0 @ claude-sonnet-4-5 (frozen 2026-02-11)
\`\`\`

The old baseline is kept, not overwritten — \`baseline.v1.7.0.json\` stays in the
directory so the 4.5 numbers remain reproducible after 2026-09-14, when the model
that produced them no longer exists.

---

## 6. \`prompts/clause-extract/CHANGELOG.md\`

\`\`\`markdown
## [1.8.0] - 2026-06-18

### Changed
- Pinned model \`claude-sonnet-4-5\` → \`claude-sonnet-4-6\` (4.5 retires 2026-09-14).
- Citation spans: the span must cover the complete clause including sub-clauses
  and any survival sentence, and ends before the next numbered clause heading.

### Fixed
- Repeated running headers/footers no longer terminate a span at a page break
  (\`ctr-063\`, found by regress round 1, not by the drift run).

### Eval
- baseline re-frozen: 111/120 (0.925) on claude-sonnet-4-6, 5 anchors, 0 regressions.
- rounds: 2 (rc1 FAILED — per_case_regressions = 1).
\`\`\`

---

## 7. Drift watch

\`\`\`yaml
# .github/workflows/prompt-drift.yml (excerpt)
on:
  pull_request:
    paths: ["prompts/**"]        # → /oc-prompt regress  (prompt edits)
  schedule:
    - cron: "0 6 * * 1"          # → /oc-prompt drift    (same prompt, weekly)
\`\`\`

\`regress\` gates prompt edits against the frozen baseline with
\`regression_epsilon: 0.03\` and \`per_case_regressions: 0\`. \`drift\` re-runs the
*unchanged* prompt weekly against the *pinned* model and opens an issue on any
anchor flip — which is how a silent provider-side change gets caught in seven
days instead of by a customer's general counsel.

PR **#413** · \`prompts/clause-extract@v1.8.0\` · reviewed and approved by legal
(the prompt carries sign-off; the diff was shown before it was run).`,
    },
    {
      id: "checkpoint-prompt-ops",
      label: "oc-prompt-ops checkpoint after baseline re-freeze",
      kind: "checkpoint.json",
      body:
`\`\`\`json
// .checkpoints/oc-prompt-ops.checkpoint.json
{
  "protocol_version": "1.1",
  "skill": "oc-prompt-ops",
  "project": "Clause",
  "project_dir": "/srv/clause/clause-api",
  "created_at": "2026-02-11T09:40:02Z",
  "updated_at": "2026-06-18T14:21:10Z",
  "phase": "regress",
  "step": "baseline-refrozen-v1.8.0",
  "status": "complete",
  "progress_summary": "clause-extract moved v1.7.0 → v1.8.0 as a MINOR bump carrying both the new pinned model (claude-sonnet-4-6) and a two-part citation-span boundary rule. The drift run found four deterministic per-case flips on indemnification spans that the aggregate deltas hid inside the n=120 noise band. Round 1 (v1.8.0-rc1) improved every aggregate and regressed ctr-063 on an OCR running header; regress returned FAIL on per_case_regressions. Round 2 cleared at 111/120 with 0 regressions and 7 cases fixed versus the 4.5 baseline. baseline.json is re-frozen on claude-sonnet-4-6; baseline.v1.7.0.json retained so the pre-retirement numbers stay reproducible after 2026-09-14.",
  "progress_table": [
    { "id": "drift",     "label": "Drift run v1.7.0 @ 4.6",            "status": "complete" },
    { "id": "rootcause", "label": "Span clipping localised to 4 cases", "status": "complete" },
    { "id": "rc1",       "label": "Round 1 — FAILED on ctr-063",        "status": "complete" },
    { "id": "rc2",       "label": "Round 2 — PASS, 0 regressions",      "status": "complete" },
    { "id": "freeze",    "label": "baseline.json re-frozen @ v1.8.0",   "status": "complete" },
    { "id": "handoff",   "label": "Evidence bundle → oc-release-ops",   "status": "complete" }
  ],
  "context_primer": {
    "key_decisions": [
      "Gate on per_case_regressions = 0, not on the aggregate: at n=120 the ±9.1 noise band makes every aggregate delta in this migration uncallable.",
      "The cost drop in the drift run (-7.3%) was clipped output, not a saving. Final is +2.4% and that is the number that goes in the release.",
      "Prompt wording changes were shown to the user as a diff before execution — the prompt carries legal sign-off."
    ],
    "generated_files": [
      "prompts/clause-extract/v1.8.0/prompt.md",
      "prompts/clause-extract/eval/baseline.json",
      "prompts/clause-extract/eval/baseline.v1.7.0.json",
      "prompts/clause-extract/CHANGELOG.md"
    ],
    "user_preferences": [
      "Never edit a prompt's wording without showing the diff first",
      "Name the contract ids; 'a metric moved' is not a finding"
    ]
  },
  "skill_state": {
    "prompt": "clause-extract",
    "version": "v1.8.0",
    "previous_version": "v1.7.0",
    "pinned_model": "claude-sonnet-4-6",
    "previous_model": "claude-sonnet-4-5",
    "model_retires_at": "2026-09-14",
    "goldset": {
      "contracts": 120,
      "clause_spans": 1338,
      "indemnification_spans": 50,
      "risk_flags": 412,
      "anchors": [
        "ctr-012", "ctr-041", "ctr-097", "ctr-118", "ctr-063"
      ]
    },
    "baseline": {
      "file": "prompts/clause-extract/eval/baseline.json",
      "frozen_at": "2026-06-18T14:19:52Z",
      "pass_rate": 0.925,
      "run_id": "rgr-20260618-1408-b0e8",
      "retained_previous": "baseline.v1.7.0.json"
    },
    "last_drift": {
      "run_id": "drift-20260618-1012-a41c",
      "verdict": "DRIFT",
      "per_case_regressions": ["ctr-012", "ctr-041", "ctr-097", "ctr-118"]
    },
    "last_eval": {
      "run_id": "rgr-20260618-1408-b0e8",
      "verdict": "PASS",
      "rounds": 2,
      "per_case_regressions": []
    },
    "pr": 413
  },
  "eval_scores": [
    { "rubric": "citation_span.exact.contract",       "score": 0.900, "max": 1, "at": "2026-02-11T09:40:02Z", "dimensions": { "model": "claude-sonnet-4-5", "version": "v1.7.0" } },
    { "rubric": "citation_span.exact.contract",       "score": 0.867, "max": 1, "at": "2026-06-18T10:28:45Z", "dimensions": { "model": "claude-sonnet-4-6", "version": "v1.7.0" } },
    { "rubric": "citation_span.exact.contract",       "score": 0.908, "max": 1, "at": "2026-06-18T13:52:21Z", "dimensions": { "model": "claude-sonnet-4-6", "version": "v1.8.0-rc1" } },
    { "rubric": "citation_span.exact.contract",       "score": 0.925, "max": 1, "at": "2026-06-18T14:19:52Z", "dimensions": { "model": "claude-sonnet-4-6", "version": "v1.8.0" } },
    { "rubric": "citation_span.exact.indemnification", "score": 0.960, "max": 1, "at": "2026-06-18T14:19:52Z", "dimensions": { "model": "claude-sonnet-4-6", "version": "v1.8.0" } }
  ],
  "cost": {
    "currency": "USD",
    "total_usd": 17.51,
    "budget_usd": 40.00,
    "by_phase": { "drift": 12.90, "regress-rc1": 2.30, "regress-v1.8.0": 2.30, "confirm-repeats": 0.01 },
    "by_model": { "claude-sonnet-4-6": 9.51, "claude-sonnet-4-5": 4.90, "claude-opus-4-8": 3.10 }
  },
  "pm_refs": [
    { "provider": "linear", "id": "CL-318", "role": "release", "url": "https://linear.app/clause/issue/CL-318" }
  ],
  "next_actions": [
    "oc-release-ops: /oc-release plan — v4.2.0 minor",
    "After ship: confirm the weekly scheduled drift job is pinned to claude-sonnet-4-6",
    "Before 2026-09-14: re-check that baseline.v1.7.0.json is still readable once 4.5 is gone"
  ]
}
\`\`\``,
    },
    {
      id: "migration-release",
      label: "Release v4.2.0 — plan → tag → staging → prod",
      kind: "release.md",
      body:
`# Release — Clause **v4.2.0** (model migration to \`claude-sonnet-4-6\`)

**Produced by** oc-release-ops · **Trigger:** \`prompt-regress\` PASS on PR #413 · **Type:** MINOR · **Date:** 2026-06-18 · **Ticket:** CL-318

---

## 1. \`.opchain/release.yaml\`

oc-release-ops is running in multi-project mode — Clause is not opchain, so
version locations and the changelog path are declared rather than assumed:

\`\`\`yaml
project: clause
repo: clause-inc/clause-api
version_locations:
  - path: package.json
    json_path: version
  - path: src/version.ts
    pattern: 'export const VERSION = "{semver}"'
changelog_path: CHANGELOG.md
changelog_format: keep-a-changelog
release_branch_pattern: release/v{semver}
tag_pattern: v{semver}
require_signed_tag: true
pm:
  provider: linear
  team: CL
  release_issue_type: Release
\`\`\`

---

## 2. \`/oc-release\` — plan → draft → bump → announce → verify → ship

\`\`\`
plan      current      4.1.3        (package.json, src/version.ts agree)
          detected     model migration (oc-claude-api, PR #412)
                       prompt clause-extract v1.7.0 → v1.8.0 (oc-prompt-ops, PR #413)
          semver       MINOR → 4.2.0
                       rationale: user-visible behaviour changes (citation spans
                       get longer and more complete); no API surface change; no
                       config a customer must set. Not a patch — "spans changed"
                       is exactly what an integrator diffs against.
          blocked_by   none  (prompt-drift ✓ prompt-regress ✓ cost-gate ✓ test ✓)

draft     CHANGELOG.md entry generated from the two PRs + the re-frozen baseline
          mandatory sections present: Compatibility ✓  Configuration ✓

bump      package.json               4.1.3 → 4.2.0
          src/version.ts             4.1.3 → 4.2.0
          lib/llm/config.ts          CLAUSE_MODEL  default → claude-sonnet-4-6
                                     RISK_MODEL    default → claude-sonnet-4-6
                                     SUMMARY_MODEL default → claude-sonnet-4-6
          prompts/clause-extract     pin v1.7.0 → v1.8.0
          ↑ this is the only place in the repo where production moves to 4.6.

announce  CL-318 created (type: Release)
          <!-- opchain:oc-release-ops:release-ticket:v4.2.0 -->
          links: PR #412, PR #413, drift-20260618-1012-a41c, rgr-20260618-1408-b0e8

verify    npm test                        212 passed / 212      ✓
          astro build                     n/a (API only)        —
          CHANGELOG has [4.2.0] entry     yes                   ✓
          version_locations agree         package.json 4.2.0
                                          src/version.ts 4.2.0  ✓
          prompt pin matches baseline     v1.8.0 == baseline    ✓
          signed tag for 4.2.0 exists     not yet               ⧗ (created in ship)
          VERDICT: READY

ship      /oc-docs pr          → PR body + docs delta (docs/runbook.md now 4.6; closes CL-317)
          /oc-git-sync v4.2.0  → release/v4.2.0 → PR #414
          PR #414 merged         2026-06-18T15:41:07Z  squash  a9f2c17
          /oc-git-release 4.2.0
            git tag -s v4.2.0 -m "release: v4.2.0"
            object a9f2c17  gpg: Good signature from "Clause Release <release@clause.legal>"
            pushed → origin/v4.2.0
\`\`\`

oc-release-ops does not deploy. It hands the tagged commit to oc-deploy-ops (§5).

---

## 3. \`CHANGELOG.md\`

\`\`\`markdown
## [4.2.0] - 2026-06-18

### Changed
- Clause extraction, risk flagging and summarisation now run on
  \`claude-sonnet-4-6\`. \`claude-sonnet-4-5\` retires 2026-09-14.
- Citation spans now cover the complete clause — every lettered and numbered
  sub-clause plus any survival sentence — rather than the operative sentence
  alone. Indemnification and limitation-of-liability clauses are the ones you
  will notice. (clause-extract prompt v1.7.0 → v1.8.0)

### Fixed
- Clauses that continue across a page break in scanned/OCR'd contracts are no
  longer truncated at the repeated running header.

### Measured
Against our 120-contract evaluation set (1,338 labelled clause spans,
412 labelled risk flags), versus the 4.1.3 baseline:

| | 4.1.3 | 4.2.0 |
|---|---|---|
| Contracts with all citation spans exact | 108/120 | **111/120** |
| — indemnification spans exact | 46/50 | **48/50** |
| Clause extraction recall | 0.910 | 0.940 |
| p95 latency | 4.1s | **3.7s** |

Seven contracts improved, none regressed. Aggregate movements at this sample
size are within measurement noise (±9 points on a 120-case rate); the
per-contract improvements are reproducible at temperature 0.

### Compatibility
Back-compatible with 4.1.x. No API, schema or webhook changes; \`GET /v1/contracts/:id/clauses\`
returns the same shape. **No customer action required.** The one observable
difference is that \`clauses[].span\` offsets are wider on multi-sentence clauses.
If you have stored spans from 4.1.x and diff them against fresh extractions,
expect differences on indemnification and limitation-of-liability clauses —
that is the fix, not a bug. Your pricing does not change.

### Configuration
Three new environment variables, all optional:

| Variable | Default (4.2.0) | Purpose |
|---|---|---|
| \`CLAUSE_MODEL\` | \`claude-sonnet-4-6\` | model for clause extraction |
| \`RISK_MODEL\` | \`claude-sonnet-4-6\` | model for risk flagging |
| \`SUMMARY_MODEL\` | \`claude-sonnet-4-6\` | model for contract summaries |

Self-hosted deployments can pin the previous model with
\`CLAUSE_MODEL=claude-sonnet-4-5\` until **2026-09-14**, after which the id stops
resolving. That is also our rollback path (§5).
\`\`\`

The numbers in the changelog are the eval numbers, including the ones that are
unflattering: cost per contract went **up** 2.4% (\$0.041 → \$0.042), because
correct spans are longer than clipped ones. That is Clause's cost of goods and
not a customer-facing figure, so it lives in the release record rather than the
changelog — but it is recorded, because the drift run's −7.3% "saving" was the
most seductive wrong number in this whole migration.

---

## 4. Evidence bundle (attached to CL-318)

| Artifact | Path | What it proves |
|---|---|---|
| Migration playbook | \`docs/migrations/2026-06-18-sonnet-4-6.md\` | what changed, what blocked, and that it was verified against \`resp.model\` |
| PR #412 | \`clause-inc/clause-api#412\` | the swap landed behind config with defaults on 4.5 |
| Drift run | \`prompts/clause-extract/eval/runs/drift-20260618-1012-a41c.json\` | 4.6 measured on 120 contracts before anything shipped |
| Regress round 1 | \`…/runs/rgr-20260618-1341-b0e7.json\` | the candidate that improved the mean and was **rejected** on one case |
| Regress round 2 | \`…/runs/rgr-20260618-1408-b0e8.json\` | 111/120, 0 regressions |
| Baseline | \`prompts/clause-extract/eval/baseline.json\` | the number future changes are held to |
| Prior baseline | \`…/baseline.v1.7.0.json\` | the 4.5 numbers stay reproducible after retirement |
| Signed tag | \`v4.2.0\` → \`a9f2c17\` | the deployed bytes are the reviewed bytes |

For a legaltech product this bundle is also the answer to *"prove your AI didn't
get worse"*, which is a question a customer's compliance team asks in writing.
The strongest item in it is round 1: a rejected candidate is what makes the
accepted one mean something.

---

## 5. Deploy (oc-deploy-ops) + watch (oc-monitoring-ops)

\`\`\`
/oc-deploy staging                                       2026-06-18T15:58Z
  build         a9f2c17                                  42s
  deployed      clause-api-staging                       ✓
  GET /health
    { "version": "4.2.0", "commit": "a9f2c17",
      "models": { "clause": "claude-sonnet-4-6",
                  "risk":   "claude-sonnet-4-6",
                  "summary":"claude-sonnet-4-6" },
      "prompt": "clause-extract@v1.8.0" }
  smoke         10 live contracts re-extracted, diffed vs prod
    6 identical · 4 spans widened (3 indemnification, 1 limitation)
    0 clauses lost · 0 schema errors
  HOLD for user confirmation.
\`\`\`

The user reviewed the four widened spans — including a Kestrel-family §9 — and
confirmed before production.

\`\`\`
/oc-deploy production                                    2026-06-18T16:24Z
  deployed      clause-api                               ✓
  GET /health   version 4.2.0 · commit a9f2c17 · models 4.6 · prompt v1.8.0
  traffic       100%
  error rate    0.00% over first 30 min (n = 1,412 requests)
\`\`\`

**Now using oc-monitoring-ops** for the post-deploy watch — oc-release-ops does
not own this and oc-deploy-ops stops at "it is live":

\`\`\`
shadow-run    next 200 production contracts, both models, 4.5 as control
compare       clause count, span length distribution, schema validity
alert         >5% divergence in clause count vs the 4.5 trailing average
              → page #clause-eng, auto-attach the diverging contract ids
window        until 2026-07-02, or until 4.5 retires, whichever is first
owner         oc-monitoring-ops · CL-320
\`\`\`

Rollback remains \`CLAUSE_MODEL=claude-sonnet-4-5\` + redeploy, until 2026-09-14.
After that the forward-fix is the only fix, which is why the gate ran before the
flip and not after it.

---

## 6. Checkpoint

\`\`\`json
// .checkpoints/oc-release-ops.checkpoint.json  (excerpt)
{
  "protocol_version": "1.1",
  "skill": "oc-release-ops",
  "phase": "shipped",
  "step": "v4.2.0-live",
  "status": "complete",
  "skill_state": {
    "current_release": {
      "version": "4.2.0",
      "type": "minor",
      "phase": "shipped",
      "shipped_at": "2026-06-18T16:24:11Z",
      "commit": "a9f2c17",
      "tag": "v4.2.0",
      "tag_signed": true,
      "release_ticket_id": "CL-318",
      "prs": [412, 413, 414],
      "evidence_runs": ["drift-20260618-1012-a41c", "rgr-20260618-1341-b0e7", "rgr-20260618-1408-b0e8"],
      "rollback": "CLAUSE_MODEL=claude-sonnet-4-5 (valid until 2026-09-14)"
    }
  },
  "pm_refs": [
    { "provider": "linear", "id": "CL-318", "role": "release" },
    { "provider": "linear", "id": "CL-320", "role": "monitoring" }
  ],
  "next_actions": [
    "oc-monitoring-ops: shadow-run window closes 2026-07-02",
    "Before 2026-09-14: remove claude-sonnet-4-5 from lib/llm/allowlist.ts and the rollback docs"
  ]
}
\`\`\`

---

## 7. Cadence note

The deprecation window was 90 days. This took one session — not because the
migration was trivial (three \`[BLOCKS]\`, one of which would have silently
disabled schema enforcement on risk flags, and two regression rounds) but
because the golden set already existed. Without it, the only available evidence
would have been "it looks fine", and the four clipped indemnification spans would
have reached production and stayed there until a general counsel found one.

The eval set built at launch is what turns a deprecation notice into a Tuesday.`,
    },
  ],
  skills: [
    "oc-claude-api",
    "oc-prompt-ops",
    "oc-release-ops",
    "oc-git-ops",
    "oc-deploy-ops",
    "oc-monitoring-ops",
  ],
  runtime: "≈ 12 exchanges",
  steps: [
    {
      type: "beat",
      phase: "operate",
      label: "01 · Scope",
      caption: "Deprecation notice lands. oc-claude-api greps before it edits.",
      skills: ["oc-claude-api"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "Deprecation notice landed Monday:\n\n  Model: claude-sonnet-4-5\n  Retirement: 2026-09-14\n  Replacement: claude-sonnet-4-6\n\nThat's the model behind our whole contract-review product — `clause-api`, TypeScript, `@anthropic-ai/sdk`.\n\nWhen we did the 3.5 → 4 swap we changed the id, everything looked fine, and recall quietly dropped. A customer's GC found the missed clause before we did. How do we not do that again?",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-claude-api",
      content:
`**Now using oc-claude-api** — \`/oc-claude-api migrate --from claude-sonnet-4-5 --to claude-sonnet-4-6\`. Step 0 is scope, not edits. The id is in 7 files, 11 matches: three callers, the allowlist (4.6 goes *alongside* 4.5), a fixture, two refs. The blast radius is elsewhere:

\`\`\`
$ rg -n 'role: "assistant"' lib/
  lib/clause/extract.ts:88    { role: "assistant", content: "{" },
\`\`\`

A last-assistant-turn prefill, and **it returns a 400 on 4.6** — not a one-line swap but a rewrite of how \`extract.ts\` gets clean JSON out.

Scope first: \`lib/\` + \`test/\`, or the three call sites? And is that prefill deliberate or inherited?`,
    },
    {
      type: "exchange",
      role: "user",
      content:
        "`lib/` and `test/`, leave `docs/` — I don't want doc churn in a diff I'm going to read line by line.\n\nThe prefill is deliberate — we added it on 3.5 because the model kept wrapping JSON in prose and our parser choked. Nobody's revisited it since. We send `temperature: 0` and no thinking anywhere.\n\nTwo back at you. Should we jump to Opus while we're in here? Sales would love \"powered by the best model\". And how long do these eval runs take? I have the afternoon, not the week.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-claude-api",
      artifacts: ["migration-playbook", "migration-pr"],
      content:
`**Opus: no, and not for the reason you'd guess.** The 1.67× price ($5/$25 vs $3/$15) you could justify; the cache you can't — its minimum cacheable prefix is 4,096 tokens against your **2,914**-token prompt, so it stops caching. The playbook also kills the folklore: 4.6 is neither cheaper (identical $3/$15) nor faster (default \`effort: "high"\`).

\`\`\`
[BLOCKS] extract.ts:88  prefill { role:"assistant", content:"{" } → 400 on 4.6
                        → output_config.format json_schema, from your zod
[BLOCKS] risk.ts:44     output_format → output_config.format — old key IGNORED,
                        not rejected: risk flags silently stop being schema-
                        constrained. This one would have shipped.
\`\`\`

**PR #412's defaults are still \`claude-sonnet-4-5\`**, so merging moves zero production requests; the flip is the release bump, after the gate. \`prompt-drift\` is red because nothing has run the golden set. That red is the point.

**Now using oc-prompt-ops** — \`/oc-prompt drift clause-extract --against claude-sonnet-4-6\`: byte-identical prompt, the *model* moved. **16 min, $13**.`,
    },
    {
      type: "beat",
      phase: "audit",
      label: "02 · Drift eval",
      caption: "oc-prompt-ops runs the unchanged prompt against the new model. 120 contracts, per-case.",
      skills: ["oc-prompt-ops"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "$13 and sixteen minutes is nothing. Run it.\n\nOne caveat on that golden set: nobody's touched it since launch, and a big chunk of the indemnification spans came out of one customer's MSA template — Kestrel. If indemnification regresses I need to know whether that's real or just us over-sampling one firm's drafting style.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-prompt-ops",
      artifacts: ["eval-delta"],
      content:
`\`drift-20260618-1012-a41c\` — 16m, $12.90, 120 contracts, \`temperature: 0\`, 4.6 arm at \`effort: low\`.

\`\`\`
  metric                   n     baseline       drift        Δ
  clause_set recall    1,338   1218 0.910   1258 0.940    +3.0
  span exact (contract)  120    108 0.900    104 0.867    −3.3
    └ indemnification     50     46 0.920     42 0.840    −8.0
  cost / contract   $0.041 → $0.038  −7.3%   ·   p95 4.1s → 3.6s
\`\`\`

**At n=120 the 95% half-width on a binary pass rate is ±9 points; on the indemnification slice, ±14.** Every Δ sits inside its own band except \`clause_set recall\` — the −8.0 included. What isn't noise:

\`\`\`
  per-case: 4 flips pass → fail, 0 the other way, all indemnification
  ctr-012 §11.1 · ctr-041 §9.1 · ctr-097 §9.2 · ctr-118 §14
  1.00 → 0.00 each, re-run 3× byte-identical
  VERDICT: DRIFT — per_case_regressions = 0. Block the re-pin.
\`\`\`

All four clip identically — \`ctr-041\` expects \`[14203, 15877]\`, 4.6 returns \`[14203, 14611]\`: same start, first-sentence stop, (a)–(c) gone. Against *"the exact text of the clause as it appears in the contract"*, 4.5 inferred "whole clause"; 4.6 read it literally. **Under-specified prompt**, not a model defect.

**Kestrel:** 22 of the 50 indemnification spans are Kestrel-family, and three of the four flips are Kestrel — but \`ctr-041\` is a bespoke AU agreement, same mechanism. The template is shared; the cause isn't.

**(a)** tighten the span instruction, MINOR bump, both models fixed; or **(b)** split per clause type, buying two cache namespaces and a dead model in 88 days.`,
    },
    {
      type: "exchange",
      role: "user",
      content:
        "(a), obviously — (b) is paying rent on a problem that has a deadline.\n\nBut show me `ctr-097` first. Kestrel is 30% of ARR; if their template is the one clipping I want to see it myself.\n\nAnd do not change that prompt's wording without me seeing the diff. It went through legal review — \"as it appears in the contract\" is in there because our counsel put it there.\n\nThe rule you want is probably \"the span ends at the next numbered heading\". About 90% of our clauses are numbered.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-prompt-ops",
      artifacts: ["prompt-diff", "regress-round-1", "checkpoint-prompt-ops"],
      content:
`\`ctr-097\` §9.2 — 1,578 chars expected at \`[21440, 23018]\`; 4.6 returned 366, stopping at the colon:

\`\`\`
4.6   "…indemnifies the Customer against all Losses arising from:"
lost  (a)–(c), plus "…not subject to clause 10."  ← disapplies the cap
\`\`\`

Your counsel's phrase survives untouched; what's missing is where the clause *ends*. \`v1.8.0-rc1\`, your rule:

\`\`\`diff
-  of the clause as it appears in the contract.
+  of the clause as it appears in the contract. The span MUST cover the
+  COMPLETE clause, INCLUDING every lettered sub-clause and any survival
+  sentence, ending before the next numbered heading.
\`\`\`

\`/oc-prompt regress\`, round 1 — \`rgr-20260618-1341-b0e7\`:

\`\`\`
  span exact 108/120 → 109/120 ✓   indemnification 46/50 → 48/50 ✓
  per-case:  6 fixed / 1 REGRESSED — ctr-063  1.00 → 0.00  ✗
  VERDICT: FAIL — every aggregate improved, ctr-063 regressed, and
           thresholds.per_case_regressions = 0. Candidate rejected.
\`\`\`

\`ctr-063\` is an OCR'd PDF where §10 crosses a page break and the running header repeats as \`10. LIMITATION OF LIABILITY (cont.)\` — a numbered heading, so the span stopped there. Your rule is right; the header is page furniture it couldn't know about. Note what an aggregate gate does here: +0.8 points, every slice green, ship it, and a limitation-of-liability clause loses its carve-outs.

\`v1.8.0\` exempts a clause's own repeated heading, and round 2 (\`rgr-…b0e8\`) clears: span exact **111/120** (+2.5), indemnification 48/50, 7 fixed, **0 regressed**, cost-gate PASS.

Two drift numbers were flattering and wrong. **Cost went up, not down**: the −7.3% was 4.6 emitting fewer output tokens while clipping spans, so net **+2.4%**. p95 is −9.8%, not −12.2%.

Baseline re-frozen at \`v1.8.0\` on 4.6, the 4.5 one kept so those numbers survive September. PR **#413** has both rounds.

**Now using oc-release-ops.**`,
    },
    {
      type: "beat",
      phase: "ship",
      label: "03 · Release",
      caption: "oc-release-ops plans, bumps, and tags. oc-git-ops signs it.",
      skills: ["oc-release-ops", "oc-git-ops"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "Good. Ship it — and I want something I can hand a customer's compliance team that proves it didn't get worse. Kestrel's vendor questionnaire has a line for \"describe your process for validating model changes\" and our answer is embarrassing.\n\nWe're on 4.1.3 — minor or patch? The response shape doesn't change, so part of me says patch.\n\nAnd staging first. Ten real contracts, me looking at them, before production. Not negotiable.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-release-ops",
      content:
`**Minor, and it isn't close.** Patch means "no observable behaviour change", and \`clauses[].span\` offsets widen on every multi-sentence clause. Same shape, new values — **4.2.0**.

\`\`\`
/oc-release plan  4.1.3 → 4.2.0 (MINOR)
  gates  prompt-drift ✓ prompt-regress ✓ cost-gate ✓ test 212/212 ✓
  bump   lib/llm/config.ts defaults → claude-sonnet-4-6  ← production moves
         prompts pin v1.7.0 → v1.8.0                        HERE, not in #412
\`\`\`

\`/oc-docs pr\` picked up \`docs/runbook.md\`, left out of #412. \`/oc-git-sync v4.2.0\` → **PR #414**, merged \`a9f2c17\`; \`/oc-git-release 4.2.0\` signs the tag — signed, not annotated: the tag claims the deployed bytes are the reviewed bytes.

Your questionnaire answer is that CL-318 bundle — strongest item, round 1: a candidate rejected on one contract after improving every aggregate.

**Now using oc-deploy-ops** — \`/oc-deploy staging\`:

\`\`\`
smoke  10 live contracts re-extracted vs prod: 6 identical, 4 spans
       widened (3 indemnification, 1 limitation), 0 clauses lost,
       0 schema errors.          HOLD — waiting on you.
\`\`\`

One of the four widened is Kestrel §9.`,
    },
    {
      type: "beat",
      phase: "monitor",
      label: "04 · Prod + watch",
      caption: "The user eyeballs staging. oc-deploy-ops ships prod; oc-monitoring-ops takes the watch.",
      skills: ["oc-deploy-ops", "oc-monitoring-ops"],
    },
    {
      type: "exchange",
      role: "user",
      content:
        "Looked at all four. The Kestrel §9 span is complete now — it carries (a) through (c) and the sentence that disapplies the cap, which is the sentence their GC cares about most. The other three are right too.\n\nGo. And set the shadow watch up before you tell me it's done, not after.",
    },
    {
      type: "exchange",
      role: "claude",
      skill: "oc-deploy-ops",
      artifacts: ["migration-release"],
      content:
`\`\`\`
/oc-deploy production                        2026-06-18T16:24Z
  4.2.0 · a9f2c17 · models 4.6 ×3 · clause-extract@v1.8.0 · traffic 100%
  error rate 0.00% over 30 min (n = 1,412) · p95 3.68s
\`\`\`

Watch first, as asked — **now using oc-monitoring-ops**:

\`\`\`
shadow-run  next 200 production contracts through both models, 4.5 control
alert       >5% divergence in clause count vs the 4.5 trailing average
window      to 2026-07-02 or 4.5 retirement · CL-320 · armed 16:31Z ✓
\`\`\`

CL-318 closed with the bundle: playbook, PRs #412 / #413 / #414, the drift run, **both** regression rounds, both baselines, the signed tag. Two dated actions sit on the checkpoints — the shadow window closes 2026-07-02, \`claude-sonnet-4-5\` leaves the allowlist before 2026-09-14. Until then, rollback is a redeploy with \`CLAUSE_MODEL=claude-sonnet-4-5\`.

**Bottom line:** the swap was three lines. What kept you out of the 3.5 → 4 situation was refusing to read deltas inside a ±9-point noise band, gating on four named contracts, and rejecting a candidate that improved every metric but broke one.`,
    },
  ],
};
