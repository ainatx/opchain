import { describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createHttpJsonAdapter } from "../../scripts/lib/prompt-eval/adapter-http-json.mjs";
import { selectAdapter } from "../../scripts/lib/prompt-eval/cli.mjs";
import { freezeBaseline } from "../../scripts/lib/prompt-eval/schema.mjs";
import { evaluateRegression, runDataset } from "../../scripts/lib/prompt-eval/runner.mjs";
import { attributeCost, evaluateCostGate, freezeCostBaseline } from "../../scripts/lib/cost/gate.mjs";

const dataset = {
  inputs: [{ id: "one", input: "route this" }],
  expected: [{ id: "one", expect: { mode: "contains", all: ["oc-prompt"] } }],
  config: {
    prompt: "routing", model: "configured-model", grading: { default_mode: "contains" },
    thresholds: { pass_rate: 1, regression_epsilon: 0.05 },
    cost: { cost_per_eval: null, budget_per_eval: 0.02, regression_pct: 0.5 },
  },
};

describe("F2 runner and gates", () => {
  it("uses only an explicitly configured HTTP adapter, with mocked network", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output: "use oc-prompt", usage: { input_tokens: 1, output_tokens: 1 } })));
    const adapter = createHttpJsonAdapter({ endpoint: "https://adapter.test/run", apiKey: "test-key", fetchFn });
    const result = await runDataset({ dataset, adapter });
    expect(result).toMatchObject({ schema_version: 1, status: "completed", pass_rate: 1, counts: { pass: 1, fail: 0, blocked: 0 } });
    expect(fetchFn).toHaveBeenCalledWith("https://adapter.test/run", expect.objectContaining({ headers: expect.objectContaining({ authorization: "Bearer test-key" }) }));
  });

  it("blocks missing adapters and interrupted or malformed adapter responses", async () => {
    await expect(runDataset({ dataset })).resolves.toMatchObject({ status: "blocked", failure: { code: "missing_provider" } });
    const adapter = { run: async () => ({ output: "x", usage: { input_tokens: 1, output_tokens: 1 } }), judge: async () => ({ score: 2, usage: { input_tokens: 1, output_tokens: 1 } }) };
    const judgeDataset = { ...dataset, expected: [{ id: "one", expect: { mode: "llm_judge", criteria: "be right" } }], config: { ...dataset.config, grading: { default_mode: "contains", judge: { model: "configured-judge", output_format: "json_schema" } } } };
    await expect(runDataset({ dataset: judgeDataset, adapter })).resolves.toMatchObject({ status: "blocked", failure: { code: "interrupted" } });
    expect(() => createHttpJsonAdapter({ endpoint: "https://adapter.test/run" })).toThrow(/credentials/);
    const noJudge = { ...judgeDataset, config: { ...judgeDataset.config, grading: { default_mode: "contains" } } };
    const untouched = { run: vi.fn(), judge: vi.fn() };
    await expect(runDataset({ dataset: noJudge, adapter: untouched })).rejects.toThrow(/explicit model/);
    expect(untouched.run).not.toHaveBeenCalled();
    expect(untouched.judge).not.toHaveBeenCalled();
    await expect(runDataset({ dataset, adapter: { run: async () => { throw new Error("mock interruption"); } } })).resolves.toMatchObject({ status: "blocked", failure: { code: "interrupted" } });
  });

  it("maps invalid CLI adapter configuration to blocked-result failures", () => {
    expect(selectAdapter({})).toMatchObject({ failure: { code: "missing_provider" } });
    expect(selectAdapter({ adapter: "other", apiKey: "key", endpoint: "https://adapter.test" })).toMatchObject({ failure: { code: "invalid_adapter_config" } });
    expect(selectAdapter({ adapter: "http-json", endpoint: "https://adapter.test" })).toMatchObject({ failure: { code: "missing_credentials" } });
    expect(selectAdapter({ adapter: "http-json", apiKey: "key" })).toMatchObject({ failure: { code: "invalid_adapter_config" } });
  });

  it("writes blocked artifacts for invalid CLI adapter setup without a provider call", async () => {
    const directory = await mkdtemp(join(tmpdir(), "opchain-eval-"));
    const output = join(directory, "result.json");
    await Promise.all([
      writeFile(join(directory, "inputs.jsonl"), '{"id":"one","input":"route"}\n'),
      writeFile(join(directory, "expected.jsonl"), '{"id":"one","expect":{"all":["oc-prompt"]}}\n'),
      writeFile(join(directory, "eval.yaml"), "prompt: routing\nmodel: configured-model\ngrading:\n  default_mode: contains\nthresholds:\n  pass_rate: 1\n  regression_epsilon: 0\ncost:\n  cost_per_eval: null\n"),
    ]);
    try {
      for (const [args, code] of [
        [[], "missing_provider"],
        [["--adapter", "http-json", "--api-key-env", "EMPTY_KEY"], "missing_credentials"],
        [["--adapter", "http-json", "--api-key-env", "TEST_KEY"], "invalid_adapter_config"],
      ]) {
        const child = spawnSync(process.execPath, ["scripts/prompt-eval.mjs", "run", directory, "--out", output, ...args], { cwd: process.cwd(), env: { ...process.env, TEST_KEY: "key" } });
        expect(child.status).toBe(2);
        expect(JSON.parse(await readFile(output, "utf8"))).toMatchObject({ status: "blocked", failure: { code } });
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("writes an unavailable-cost artifact and exits blocked when CLI pricing is absent", async () => {
    const directory = await mkdtemp(join(tmpdir(), "opchain-cost-"));
    try {
      const result = await runDataset({ dataset, adapter: { run: async () => ({ output: "oc-prompt", usage: { input_tokens: 10, output_tokens: 2 } }) } });
      await Promise.all([
        writeFile(join(directory, "inputs.jsonl"), JSON.stringify(dataset.inputs[0]) + "\n"),
        writeFile(join(directory, "expected.jsonl"), JSON.stringify(dataset.expected[0]) + "\n"),
        writeFile(join(directory, "eval.yaml"), "prompt: routing\nmodel: configured-model\ngrading:\n  default_mode: contains\nthresholds:\n  pass_rate: 1\n  regression_epsilon: 0\ncost:\n  cost_per_eval: null\n"),
        writeFile(join(directory, "result.json"), JSON.stringify(result)),
      ]);
      const output = join(directory, "cost.json");
      const child = spawnSync(process.execPath, ["scripts/cost.mjs", "attribute", directory, "--result", join(directory, "result.json"), "--out", output], { cwd: process.cwd() });
      expect(child.status).toBe(2);
      expect(JSON.parse(await readFile(output, "utf8"))).toMatchObject({ status: "unavailable", reason: "missing_pricing" });
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it("freezes versioned results and fails aggregate or per-case quality regression", async () => {
    const adapter = { run: async () => ({ output: "oc-prompt", usage: { input_tokens: 1, output_tokens: 1 } }) };
    const result = await runDataset({ dataset, adapter });
    const baseline = freezeBaseline({ dataset, result });
    const candidate = { ...result, cases: [{ ...result.cases[0], status: "fail", score: 0, reason: "changed" }], counts: { pass: 0, fail: 1, blocked: 0 }, pass_rate: 0 };
    expect(evaluateRegression({ dataset, result: candidate, baseline })).toMatchObject({ verdict: "fail", aggregate: true, regressions: ["one"] });
    expect(evaluateRegression({ dataset, result, baseline })).toMatchObject({ verdict: "pass" });
    expect(evaluateRegression({ dataset, result: { ...result, cases: [], counts: { pass: 0, fail: 0, blocked: 0 }, pass_rate: null }, baseline })).toMatchObject({ verdict: "blocked", reason: /case set/ });
  });

  it("gates only explicit measured costs and blocks unavailable or mismatched data", async () => {
    const result = await runDataset({ dataset, adapter: { run: async () => ({ output: "oc-prompt", usage: { input_tokens: 10, output_tokens: 2 } }) } });
    const rates = { input_per_million: 1000, output_per_million: 10000 };
    const measured = attributeCost({ result, rates, measurementId: "run-1" });
    expect(measured).toMatchObject({ source: "explicit_rates", usage: result.usage, cost_per_eval: 0.03 });
    const baseline = freezeCostBaseline({ ...measured, cost_per_eval: 0.01 });
    expect(evaluateCostGate({ cost: dataset.config.cost, measured, baseline })).toMatchObject({ verdict: "fail", budgetFail: true, regressionFail: true });
    expect(evaluateCostGate({ cost: dataset.config.cost, measured })).toMatchObject({ verdict: "blocked", reason: "missing_baseline" });
    expect(evaluateCostGate({ cost: dataset.config.cost, measured: { status: "unavailable", reason: "missing_usage" }, baseline })).toMatchObject({ verdict: "blocked", reason: "missing_usage" });
    expect(evaluateCostGate({ cost: dataset.config.cost, measured: { ...measured, dataset_id: result.dataset_id.replace(/.$/, "0") }, baseline })).toMatchObject({ verdict: "blocked", reason: "dataset_mismatch" });
    expect(attributeCost({ result: { ...result, usage: undefined }, rates, measurementId: "run-2" })).toMatchObject({ status: "unavailable", reason: "missing_usage" });
    expect(attributeCost({ result, measurementId: "run-3" })).toMatchObject({ status: "unavailable", reason: "missing_pricing" });
  });
});
