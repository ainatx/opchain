import { z } from "zod";
import { createHash } from "node:crypto";

export const GRADING_MODES = ["exact", "contains", "llm_judge"];
export const BLOCKED_CODES = [
  "missing_provider",
  "missing_credentials",
  "judge_verdict_required",
  "unsupported_grading_mode",
  "missing_baseline",
  "dataset_mismatch",
  "malformed_artifact",
  "interrupted",
  "unavailable_cost",
  "invalid_adapter_config",
];

export const EvalInputSchema = z.object({
  id: z.string().min(1),
  input: z.string(),
}).strict();

export const ExpectationSchema = z.object({
  mode: z.enum(GRADING_MODES).optional(),
  value: z.string().optional(),
  all: z.array(z.string().min(1)).min(1).optional(),
  any: z.array(z.string().min(1)).min(1).optional(),
  none: z.array(z.string().min(1)).min(1).optional(),
  criteria: z.string().min(1).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.mode === "exact" && value.value === undefined) {
    ctx.addIssue({ code: "custom", message: "exact expectations require value" });
  }
  if (value.mode === "contains" && !value.all && !value.any && !value.none) {
    ctx.addIssue({ code: "custom", message: "contains expectations require all, any, or none" });
  }
  if (value.mode === "llm_judge" && !value.criteria) {
    ctx.addIssue({ code: "custom", message: "llm_judge expectations require criteria" });
  }
});

export const EvalExpectedSchema = z.object({
  id: z.string().min(1),
  expect: ExpectationSchema,
}).strict();

export const EvalConfigSchema = z.object({
  prompt: z.string().min(1),
  model: z.string().min(1),
  grading: z.object({
    default_mode: z.enum(GRADING_MODES),
    judge: z.object({
      model: z.string().min(1),
      output_format: z.literal("json_schema"),
    }).strict().optional(),
  }).strict(),
  thresholds: z.object({
    pass_rate: z.number().min(0).max(1),
    regression_epsilon: z.number().min(0).max(1),
  }).strict(),
  cost: z.object({
    cost_per_eval: z.number().nonnegative().nullable(),
    budget_per_eval: z.number().positive().nullable().optional(),
    regression_pct: z.number().nonnegative().optional(),
  }).strict(),
}).strict();

export const CaseResultSchema = z.object({
  id: z.string().min(1),
  mode: z.enum(GRADING_MODES),
  status: z.enum(["pass", "fail", "blocked"]),
  score: z.number().min(0).max(1).nullable(),
  reason: z.string().min(1).optional(),
}).strict().superRefine((value, ctx) => {
  const expectedScore = value.status === "pass" ? 1 : value.status === "fail" ? 0 : null;
  if (value.score !== expectedScore) {
    ctx.addIssue({ code: "custom", message: `${value.status} cases require score ${expectedScore}` });
  }
});

export function summarizeCases(cases) {
  const counts = { pass: 0, fail: 0, blocked: 0 };
  for (const { status } of cases) counts[status] += 1;
  const graded = counts.pass + counts.fail;
  return { counts, passRate: graded === 0 ? null : counts.pass / graded };
}

export const EvalResultSchema = z.object({
  schema_version: z.literal(1),
  suite: z.string().min(1),
  dataset_id: z.string().regex(/^v1:sha256:[a-f0-9]{64}$/),
  status: z.enum(["completed", "blocked", "failed"]),
  cases: z.array(CaseResultSchema),
  usage: z.object({ input_tokens: z.number().int().nonnegative(), output_tokens: z.number().int().nonnegative() }).strict().optional(),
  counts: z.object({ pass: z.number().int().nonnegative(), fail: z.number().int().nonnegative(), blocked: z.number().int().nonnegative() }).strict(),
  pass_rate: z.number().min(0).max(1).nullable(),
  failure: z.object({
    code: z.enum(BLOCKED_CODES),
    message: z.string().min(1),
  }).strict().optional(),
}).strict().superRefine((value, ctx) => {
  const summary = summarizeCases(value.cases);
  if (JSON.stringify(value.counts) !== JSON.stringify(summary.counts)) {
    ctx.addIssue({ code: "custom", message: "result counts must equal case statuses" });
  }
  if (value.status === "completed") {
    if (summary.counts.blocked > 0) ctx.addIssue({ code: "custom", message: "completed results cannot contain blocked cases" });
    if (value.pass_rate !== summary.passRate) ctx.addIssue({ code: "custom", message: "completed pass_rate must equal graded case outcomes" });
    if (value.failure) ctx.addIssue({ code: "custom", message: "completed results cannot contain a failure" });
  } else {
    if (!value.failure) ctx.addIssue({ code: "custom", message: `${value.status} results require a non-authorizing failure` });
    if (value.pass_rate !== null) ctx.addIssue({ code: "custom", message: `${value.status} results require a null pass_rate` });
  }
});

export const EvalBaselineSchema = z.object({
  schema_version: z.literal(1),
  suite: z.string().min(1),
  dataset_id: z.string().regex(/^v1:sha256:[a-f0-9]{64}$/),
  pass_rate: z.number().min(0).max(1),
  cases: z.record(z.string().min(1), z.boolean()),
}).strict().superRefine((value, ctx) => {
  const outcomes = Object.values(value.cases);
  const passRate = outcomes.length === 0 ? null : outcomes.filter(Boolean).length / outcomes.length;
  if (passRate === null || value.pass_rate !== passRate) {
    ctx.addIssue({ code: "custom", message: "baseline pass_rate must equal its case outcomes" });
  }
});

/** Validates requirements that depend on the suite's resolved default mode. */
export function validateResolvedExpectation(expect, defaultMode) {
  const parsed = ExpectationSchema.parse(expect);
  const mode = parsed.mode ?? defaultMode;
  if (mode === "exact" && parsed.value === undefined) {
    throw new Error("exact expectations require value");
  }
  if (mode === "contains" && !parsed.all && !parsed.any && !parsed.none) {
    throw new Error("contains expectations require all, any, or none");
  }
  if (mode === "llm_judge" && !parsed.criteria) {
    throw new Error("llm_judge expectations require criteria");
  }
  return { ...parsed, mode };
}

/** Validates the three dataset components and their stable ID join. */
export function validateDataset({ inputs, expected, config }) {
  const parsedInputs = z.array(EvalInputSchema).parse(inputs);
  const parsedExpected = z.array(EvalExpectedSchema).parse(expected);
  const parsedConfig = EvalConfigSchema.parse(config);
  const inputIds = new Set(parsedInputs.map(({ id }) => id));
  const expectedIds = new Set(parsedExpected.map(({ id }) => id));
  if (inputIds.size !== parsedInputs.length || expectedIds.size !== parsedExpected.length) {
    throw new Error("dataset IDs must be unique");
  }
  if (inputIds.size !== expectedIds.size || [...inputIds].some((id) => !expectedIds.has(id))) {
    throw new Error("inputs and expected records must have matching IDs");
  }
  parsedExpected.forEach(({ expect }) => validateResolvedExpectation(expect, parsedConfig.grading.default_mode));
  if (parsedExpected.some(({ expect }) => (expect.mode ?? parsedConfig.grading.default_mode) === "llm_judge") && !parsedConfig.grading.judge) {
    throw new Error("llm_judge expectations require grading.judge with an explicit model");
  }
  return { inputs: parsedInputs, expected: parsedExpected, config: parsedConfig };
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

/** Stable identity for a resolved dataset; changing it requires a new baseline. */
export function datasetIdentity(dataset) {
  const resolved = validateDataset(dataset);
  const canonical = {
    inputs: [...resolved.inputs].sort((a, b) => a.id.localeCompare(b.id)),
    expected: [...resolved.expected].sort((a, b) => a.id.localeCompare(b.id)),
    config: resolved.config,
  };
  return `v1:sha256:${createHash("sha256").update(JSON.stringify(canonicalize(canonical))).digest("hex")}`;
}

function sameIds(left, right) {
  return left.length === right.length && left.every((id) => right.includes(id));
}

/** Freezes only a complete, identity-bound result against its exact dataset. */
export function freezeBaseline({ dataset, result }) {
  const resolved = validateDataset(dataset);
  const parsedResult = EvalResultSchema.parse(result);
  const identity = datasetIdentity(resolved);
  const ids = resolved.inputs.map(({ id }) => id).sort();
  const resultIds = parsedResult.cases.map(({ id }) => id).sort();
  if (parsedResult.status !== "completed" || !sameIds(ids, resultIds)) {
    throw new Error("a baseline requires a completed result for every dataset case");
  }
  if (parsedResult.dataset_id !== identity) throw new Error("result dataset identity does not match the dataset");
  return EvalBaselineSchema.parse({
    schema_version: 1,
    suite: parsedResult.suite,
    dataset_id: identity,
    pass_rate: parsedResult.pass_rate,
    cases: Object.fromEntries(parsedResult.cases.map(({ id, status }) => [id, status === "pass"])),
  });
}

/** Refuses stale or partial baselines before a future regression gate uses them. */
export function validateBaseline({ dataset, baseline }) {
  const resolved = validateDataset(dataset);
  const parsed = EvalBaselineSchema.parse(baseline);
  const ids = resolved.inputs.map(({ id }) => id).sort();
  if (parsed.dataset_id !== datasetIdentity(resolved) || !sameIds(ids, Object.keys(parsed.cases).sort())) {
    throw new Error("baseline does not match the canonical dataset");
  }
  return parsed;
}
