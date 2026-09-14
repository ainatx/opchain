import { describe, expect, it } from "vitest";
import { gradeCase, summarizeDeterministic } from "../../scripts/lib/prompt-eval/grader.mjs";
import {
  datasetIdentity, EvalBaselineSchema, EvalConfigSchema, EvalResultSchema, freezeBaseline,
  validateBaseline, validateDataset,
} from "../../scripts/lib/prompt-eval/schema.mjs";
import { EvalCostSchema, MeasuredEvalCostSchema, UnavailableEvalCostSchema } from "../../scripts/lib/cost/schema.mjs";

describe("F1 deterministic prompt-eval core", () => {
  it("grades normalized exact and contains expectations", () => {
    expect(gradeCase({ id: "one", output: "  YES ", expect: { mode: "exact", value: "yes" }, defaultMode: "contains" }).status).toBe("pass");
    expect(gradeCase({ id: "two", output: "Use oc-prompt, never a provider.", expect: { mode: "contains", all: ["oc-prompt"], none: ["network"] }, defaultMode: "contains" }).status).toBe("pass");
    expect(gradeCase({ id: "three", output: "oc-prompt and network", expect: { mode: "contains", all: ["oc-prompt"], none: ["network"] }, defaultMode: "contains" }).status).toBe("fail");
  });

  it("blocks judge grading without selecting or calling a provider", () => {
    const result = gradeCase({ id: "judge", output: "an answer", expect: { mode: "llm_judge", criteria: "must be useful" }, defaultMode: "contains" });
    expect(result).toMatchObject({ status: "blocked", score: null });
    expect(result.reason).toMatch(/judge_verdict_required/);
  });

  it("validates joined datasets and rejects mismatched IDs", () => {
    const config = { prompt: "routing", model: "configured-model", grading: { default_mode: "contains" }, thresholds: { pass_rate: 1, regression_epsilon: 0.05 }, cost: { cost_per_eval: null } };
    expect(validateDataset({ inputs: [{ id: "a", input: "x" }], expected: [{ id: "a", expect: { all: ["x"] } }], config }).inputs).toHaveLength(1);
    expect(() => validateDataset({ inputs: [{ id: "a", input: "x" }], expected: [{ id: "b", expect: { all: ["x"] } }], config })).toThrow(/matching IDs/);
    expect(() => validateDataset({ inputs: [{ id: "a", input: "x" }], expected: [{ id: "a", expect: { all: ["x"] } }], config: { ...config, grading: { default_mode: "exact" } } })).toThrow(/exact expectations require value/);
    expect(() => validateDataset({ inputs: [{ id: "a", input: "x" }], expected: [{ id: "a", expect: { all: [] } }], config })).toThrow();
  });

  it("makes blocked results and measured costs explicit", () => {
    const datasetId = "v1:sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    expect(EvalResultSchema.parse({ schema_version: 1, suite: "routing", dataset_id: datasetId, status: "blocked", cases: [], counts: { pass: 0, fail: 0, blocked: 0 }, pass_rate: null, failure: { code: "missing_provider", message: "select an adapter" } }).status).toBe("blocked");
    expect(() => EvalResultSchema.parse({ schema_version: 1, suite: "routing", dataset_id: datasetId, status: "completed", cases: [{ id: "a", mode: "exact", status: "fail", score: 1 }], counts: { pass: 1, fail: 0, blocked: 0 }, pass_rate: 1 })).toThrow();
    expect(EvalCostSchema.parse({ cost_per_eval: null })).toEqual({ cost_per_eval: null });
    const rates = { input_per_million: 1, output_per_million: 2 };
    expect(MeasuredEvalCostSchema.parse({ status: "measured", dataset_id: datasetId, cost_per_eval: 0.02, currency: "USD", source: "explicit_rates", measurement_id: "run-1", usage: { input_tokens: 10, output_tokens: 2 }, rates }).source).toBe("explicit_rates");
    expect(() => MeasuredEvalCostSchema.parse({ status: "measured", dataset_id: datasetId, cost_per_eval: null, currency: "USD", source: "explicit_rates", measurement_id: "run-1", usage: { input_tokens: 10, output_tokens: 2 }, rates })).toThrow();
    expect(UnavailableEvalCostSchema.parse({ status: "unavailable", reason: "missing_usage" }).status).toBe("unavailable");
  });

  it("freezes only complete results for their canonical dataset", () => {
    const dataset = { inputs: [{ id: "one", input: "x" }], expected: [{ id: "one", expect: { all: ["x"] } }], config: { prompt: "routing", model: "configured-model", grading: { default_mode: "contains" }, thresholds: { pass_rate: 1, regression_epsilon: 0.05 }, cost: { cost_per_eval: null } } };
    const identity = datasetIdentity(dataset);
    const result = { schema_version: 1, suite: "routing", dataset_id: identity, status: "completed", cases: [{ id: "one", mode: "contains", status: "pass", score: 1 }], counts: { pass: 1, fail: 0, blocked: 0 }, pass_rate: 1 };
    const baseline = freezeBaseline({ dataset, result });
    expect(validateBaseline({ dataset, baseline }).cases.one).toBe(true);
    expect(() => validateBaseline({ dataset: { ...dataset, inputs: [{ id: "two", input: "x" }], expected: [{ id: "two", expect: { all: ["x"] } }] }, baseline })).toThrow(/canonical dataset/);
    expect(() => EvalBaselineSchema.parse({ ...baseline, pass_rate: 0 })).toThrow(/case outcomes/);
    expect(summarizeDeterministic([{ status: "pass" }, { status: "blocked" }, { status: "fail" }])).toBe(0.5);
    expect(EvalConfigSchema.parse({ prompt: "routing", model: "configured-model", grading: { default_mode: "contains" }, thresholds: { pass_rate: 1, regression_epsilon: 0.05 }, cost: { cost_per_eval: null } }).prompt).toBe("routing");
  });
});
