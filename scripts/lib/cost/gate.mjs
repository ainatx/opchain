import { EvalCostBaselineSchema, EvalCostSchema, MeasuredEvalCostSchema, UnavailableEvalCostSchema } from "./schema.mjs";
import { EvalResultSchema } from "../prompt-eval/schema.mjs";

/** Derives cost from preserved adapter usage and caller-supplied, versioned rates. */
export function attributeCost({ result, rates, measurementId }) {
  const parsed = EvalResultSchema.parse(result);
  if (!parsed.usage) return UnavailableEvalCostSchema.parse({ status: "unavailable", reason: "missing_usage" });
  if (!rates) return UnavailableEvalCostSchema.parse({ status: "unavailable", reason: "missing_pricing" });
  const input = rates.input_per_million;
  const output = rates.output_per_million;
  if (![input, output].every((value) => Number.isFinite(value) && value >= 0)) throw new Error("rates must be finite non-negative numbers");
  return MeasuredEvalCostSchema.parse({
    status: "measured", source: "explicit_rates", currency: "USD", dataset_id: parsed.dataset_id,
    measurement_id: measurementId, usage: parsed.usage, rates,
    cost_per_eval: (parsed.usage.input_tokens * input + parsed.usage.output_tokens * output) / 1_000_000,
  });
}

export function freezeCostBaseline(measured) {
  const value = MeasuredEvalCostSchema.parse(measured);
  return EvalCostBaselineSchema.parse({ schema_version: 1, dataset_id: value.dataset_id, currency: value.currency, cost_per_eval: value.cost_per_eval });
}

/** Uses only supplied measured costs; missing cost data blocks rather than guessing. */
export function evaluateCostGate({ cost, measured, baseline }) {
  const config = EvalCostSchema.parse(cost);
  if (measured?.status === "unavailable") {
    const unavailable = UnavailableEvalCostSchema.parse(measured);
    return { verdict: "blocked", reason: unavailable.reason };
  }
  const current = MeasuredEvalCostSchema.parse(measured);
  if (!baseline) return { verdict: "blocked", reason: "missing_baseline" };
  const frozen = EvalCostBaselineSchema.parse(baseline);
  if (current.dataset_id !== frozen.dataset_id) return { verdict: "blocked", reason: "dataset_mismatch" };
  const budgetFail = config.budget_per_eval !== undefined && config.budget_per_eval !== null && current.cost_per_eval > config.budget_per_eval;
  const regressionFail = config.regression_pct !== undefined && current.cost_per_eval > frozen.cost_per_eval * (1 + config.regression_pct);
  return { verdict: budgetFail || regressionFail ? "fail" : "pass", budgetFail, regressionFail };
}
