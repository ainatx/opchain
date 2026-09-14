import { z } from "zod";

/** Cost fields shared by eval configuration and future measured run artifacts. */
export const EvalCostSchema = z.object({
  cost_per_eval: z.number().nonnegative().nullable(),
  budget_per_eval: z.number().positive().nullable().optional(),
  regression_pct: z.number().nonnegative().optional(),
}).strict();

export const MeasuredEvalCostSchema = EvalCostSchema.extend({
  status: z.literal("measured"),
  cost_per_eval: z.number().finite().nonnegative(),
  currency: z.literal("USD"),
  source: z.literal("explicit_rates"),
  measurement_id: z.string().min(1),
  dataset_id: z.string().regex(/^v1:sha256:[a-f0-9]{64}$/),
  usage: z.object({ input_tokens: z.number().int().nonnegative(), output_tokens: z.number().int().nonnegative() }).strict(),
  rates: z.object({ input_per_million: z.number().finite().nonnegative(), output_per_million: z.number().finite().nonnegative() }).strict(),
}).strict();

export const EvalCostBaselineSchema = z.object({
  schema_version: z.literal(1),
  dataset_id: z.string().regex(/^v1:sha256:[a-f0-9]{64}$/),
  currency: z.literal("USD"),
  cost_per_eval: z.number().finite().nonnegative(),
}).strict();

export const UnavailableEvalCostSchema = z.object({
  status: z.literal("unavailable"),
  reason: z.enum(["missing_usage", "missing_pricing"]),
}).strict();
