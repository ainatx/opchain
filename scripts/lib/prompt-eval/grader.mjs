import { CaseResultSchema, GRADING_MODES, summarizeCases, validateResolvedExpectation } from "./schema.mjs";

function normalized(value) {
  return value.trim().toLocaleLowerCase();
}

function includesAll(output, values) {
  return !values || values.every((value) => output.includes(normalized(value)));
}

function includesAny(output, values) {
  return !values || values.some((value) => output.includes(normalized(value)));
}

function includesNone(output, values) {
  return !values || values.every((value) => !output.includes(normalized(value)));
}

/**
 * Grades only deterministic modes. Judge-mode deliberately returns blocked:
 * F2 will obtain a structured verdict through a configured provider adapter.
 */
export function gradeCase({ id, output, expect, defaultMode }) {
  const expectation = validateResolvedExpectation(expect, defaultMode);
  const { mode } = expectation;
  if (!GRADING_MODES.includes(mode)) throw new Error(`unsupported grading mode: ${mode}`);
  if (mode === "llm_judge") {
    return CaseResultSchema.parse({
      id, mode, status: "blocked", score: null,
      reason: "judge_verdict_required: no provider adapter is authorized in F1",
    });
  }

  const actual = normalized(output);
  const passed = mode === "exact"
    ? actual === normalized(expectation.value)
    : includesAll(actual, expectation.all)
      && includesAny(actual, expectation.any)
      && includesNone(actual, expectation.none);
  return CaseResultSchema.parse({
    id, mode, status: passed ? "pass" : "fail", score: passed ? 1 : 0,
    ...(passed ? {} : { reason: `${mode} expectation did not match` }),
  });
}

export function summarizeDeterministic(results) {
  return summarizeCases(results).passRate;
}
