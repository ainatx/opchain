# Prompt evaluation F1 contract

F1 accepts a dataset as `{ inputs, expected, config }`: parsed JSONL input rows
`{ id, input }`, parsed JSONL expectation rows `{ id, expect }`, and the parsed
`eval.yaml` object. IDs are required, unique, and equal across both JSONL files.
`exact`, `contains`, and `llm_judge` are the only modes. Exact and contains are
case-insensitive after trim; contains supports `all`, `any`, and `none`.

An evaluation result is schema version 1 with suite name, canonical `dataset_id`,
terminal status, per-case results, derived counts, and a nullable pass rate.
Pass/fail/blocked cases must score 1/0/null respectively; a completed result
contains no blocked cases and its count and pass-rate fields must equal its case
outcomes. A frozen baseline carries the same dataset identity and derives its
aggregate from its Boolean outcomes. Freezing validates the complete case-ID set;
changing the canonical dataset identity requires a new baseline.

The adapter boundary for F2 is `run({ input, model }) -> { output, usage }` and
`judge({ output, criteria, model }) -> { score, reason, usage }`. Each method is
provided by an explicit caller-selected adapter. F1 intentionally does not load,
discover, or call an adapter. A missing adapter, credentials, or structured
judge verdict yields `status: "blocked"` with one of the documented failure
codes; it never silently passes, attempts an unauthorised network request, or
invent token/cost data. Cost configuration can be unavailable (`cost_per_eval:
null`), but a measured-cost artifact must explicitly be `status: "measured"`
with a finite amount, usage totals, and a measurement identity; unavailable
measurement is a separate explicit status.

F2 requires a configured `grading.judge.model` before a judge-mode case is
accepted or an adapter is called. The HTTP adapter requires both output and
integer input/output usage counters. `cost attribute` derives USD only from
that preserved run usage and caller-supplied `input_per_million` /
`output_per_million` rates; missing usage or rates writes an explicit
unavailable-cost artifact rather than a guessed amount.

F2 commands are `node scripts/prompt-eval.mjs run|baseline|regress <dataset-dir>`
and `node scripts/cost.mjs baseline|gate <dataset-dir>`. Required packaging
inventory: prompt-eval imports `adapter-http-json.mjs`, `io.mjs`, `runner.mjs`,
`grader.mjs`, and `schema.mjs`; cost imports `io.mjs`, `gate.mjs`, and both
schemas. Coordinator wiring request: add `"prompt-eval": "node
scripts/prompt-eval.mjs"` and `"cost": "node scripts/cost.mjs"` aliases, and
map `/oc-prompt eval|baseline|regress` and `/oc-cost baseline|gate` to them.
