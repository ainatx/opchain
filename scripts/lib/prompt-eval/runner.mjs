import { EvalResultSchema, datasetIdentity, summarizeCases, validateBaseline, validateDataset } from "./schema.mjs";
import { gradeCase } from "./grader.mjs";

export function blockedResult(dataset, code, message, cases = []) {
  const identity = datasetIdentity(dataset);
  return EvalResultSchema.parse({
    schema_version: 1, suite: dataset.config.prompt, dataset_id: identity, status: "blocked",
    cases, counts: summarizeCases(cases).counts, pass_rate: null, failure: { code, message },
  });
}

/** Runs a validated dataset through an explicitly selected adapter, without fallback calls. */
export async function runDataset({ dataset, adapter }) {
  const resolved = validateDataset(dataset);
  if (!adapter) return blockedResult(resolved, "missing_provider", "an adapter must be explicitly selected");
  const expectedById = new Map(resolved.expected.map((row) => [row.id, row.expect]));
  const cases = [];
  const usage = { input_tokens: 0, output_tokens: 0 };
  try {
    for (const input of resolved.inputs) {
      const expect = expectedById.get(input.id);
      const mode = expect.mode ?? resolved.config.grading.default_mode;
      const response = await adapter.run({ input: input.input, model: resolved.config.model });
      usage.input_tokens += response.usage.input_tokens;
      usage.output_tokens += response.usage.output_tokens;
      if (mode === "llm_judge") {
        const judge = await adapter.judge({ output: response.output, criteria: expect.criteria, model: resolved.config.grading.judge?.model });
        if ((judge.score !== 0 && judge.score !== 1) || typeof judge.reason !== "string") {
          throw new Error("provider returned a malformed judge verdict");
        }
        usage.input_tokens += judge.usage.input_tokens;
        usage.output_tokens += judge.usage.output_tokens;
        cases.push({ id: input.id, mode, status: judge.score === 1 ? "pass" : "fail", score: judge.score, reason: judge.reason });
      } else {
        cases.push(gradeCase({ id: input.id, output: response.output, expect, defaultMode: resolved.config.grading.default_mode }));
      }
    }
  } catch (error) {
    return blockedResult(resolved, "interrupted", error.message, cases);
  }
  const summary = summarizeCases(cases);
  return EvalResultSchema.parse({
    schema_version: 1, suite: resolved.config.prompt, dataset_id: datasetIdentity(resolved), status: "completed",
    cases, usage, counts: summary.counts, pass_rate: summary.passRate,
  });
}

/** Both aggregate and previously-passing per-case regressions fail the quality gate. */
export function evaluateRegression({ dataset, result, baseline }) {
  const current = EvalResultSchema.parse(result);
  const frozen = validateBaseline({ dataset, baseline });
  if (current.status !== "completed") return { verdict: "blocked", reason: "result is not completed" };
  if (current.dataset_id !== frozen.dataset_id) return { verdict: "blocked", reason: "dataset mismatch" };
  const resolved = validateDataset(dataset);
  const expectedIds = resolved.inputs.map(({ id }) => id).sort();
  const resultIds = current.cases.map(({ id }) => id).sort();
  if (expectedIds.length !== resultIds.length || expectedIds.some((id) => !resultIds.includes(id))) {
    return { verdict: "blocked", reason: "result case set does not match dataset" };
  }
  const epsilon = resolved.config.thresholds.regression_epsilon;
  const byId = new Map(current.cases.map((entry) => [entry.id, entry.status === "pass"]));
  const regressions = Object.entries(frozen.cases).filter(([id, passed]) => passed && !byId.get(id)).map(([id]) => id);
  const aggregate = frozen.pass_rate - current.pass_rate > epsilon;
  return { verdict: aggregate || regressions.length ? "fail" : "pass", regressions, aggregate };
}
