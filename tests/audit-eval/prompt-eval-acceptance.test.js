import { describe, expect, it } from "vitest";
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

const source = process.cwd();

async function startMockProvider() {
  const server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    if (JSON.parse(body).input === "interrupt") return request.socket.destroy();
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ output: "oc-prompt", usage: { input_tokens: 10, output_tokens: 2 } }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return { endpoint: `http://127.0.0.1:${port}`, close: () => new Promise((resolve) => server.close(resolve)) };
}

async function copyArtifact(root) {
  const artifact = join(root, "artifact");
  await mkdir(join(artifact, "scripts", "lib"), { recursive: true });
  await Promise.all([
    cp(join(source, "scripts", "prompt-eval.mjs"), join(artifact, "scripts", "prompt-eval.mjs")),
    cp(join(source, "scripts", "cost.mjs"), join(artifact, "scripts", "cost.mjs")),
    cp(join(source, "scripts", "lib", "prompt-eval"), join(artifact, "scripts", "lib", "prompt-eval"), { recursive: true }),
    cp(join(source, "scripts", "lib", "cost"), join(artifact, "scripts", "lib", "cost"), { recursive: true }),
    cp(join(source, "node_modules", "js-yaml"), join(artifact, "node_modules", "js-yaml"), { recursive: true }),
    cp(join(source, "node_modules", "zod"), join(artifact, "node_modules", "zod"), { recursive: true }),
    writeFile(join(artifact, "package.json"), JSON.stringify({ type: "module", dependencies: { "js-yaml": "declared", zod: "declared" } })),
  ]);
  return artifact;
}

function command(artifact, args, env = {}) {
  return spawnSync(process.execPath, args, { cwd: artifact, encoding: "utf8", env: { ...process.env, ...env } });
}

function asyncCommand(artifact, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: artifact, env: { ...process.env, ...env } });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}

async function writeDataset(directory, input = "route") {
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(join(directory, "inputs.jsonl"), `${JSON.stringify({ id: "one", input })}\n`),
    writeFile(join(directory, "expected.jsonl"), '{"id":"one","expect":{"all":["oc-prompt"]}}\n'),
    writeFile(join(directory, "eval.yaml"), "prompt: routing\nmodel: configured-model\ngrading:\n  default_mode: contains\nthresholds:\n  pass_rate: 1\n  regression_epsilon: 0\ncost:\n  cost_per_eval: null\n  budget_per_eval: 0.02\n  regression_pct: 0.5\n"),
  ]);
}

describe("F3 copied-artifact acceptance", () => {
  it("runs the copied CLIs without source/cache imports and fails closed on required paths", async () => {
    const root = await mkdtemp(join(tmpdir(), "opchain-f3-artifact-"));
    const provider = await startMockProvider();
    try {
      const artifact = await copyArtifact(root);
      const dataset = join(artifact, "fixture");
      const paths = Object.fromEntries(["result", "baseline", "candidate", "rates", "cost", "costBaseline", "unavailable", "interrupted"].map((name) => [name, join(dataset, `${name}.json`)]));
      await writeDataset(dataset);
      const resolved = command(artifact, ["--input-type=module", "--eval", "console.log(import.meta.resolve('zod'))"]);
      expect(resolved.status).toBe(0);
      expect(resolved.stdout).toContain(artifact);
      expect(resolved.stdout).not.toContain(source);
      expect(resolved.stdout).not.toContain(".codex/plugins");

      const missingInputs = command(artifact, ["scripts/prompt-eval.mjs", "run", join(artifact, "missing"), "--out", paths.result]);
      expect(missingInputs.status).not.toBe(0);
      const credentials = command(artifact, ["scripts/prompt-eval.mjs", "run", dataset, "--adapter", "http-json", "--endpoint", provider.endpoint, "--api-key-env", "NO_SUCH_KEY", "--out", paths.result]);
      expect(credentials.status).toBe(2);
      expect(JSON.parse(await readFile(paths.result, "utf8"))).toMatchObject({ status: "blocked", failure: { code: "missing_credentials" } });

      const run = await asyncCommand(artifact, ["scripts/prompt-eval.mjs", "run", dataset, "--adapter", "http-json", "--endpoint", provider.endpoint, "--api-key-env", "ARTIFACT_KEY", "--out", paths.result], { ARTIFACT_KEY: "mock-key" });
      expect(run.status).toBe(0);
      expect(command(artifact, ["scripts/prompt-eval.mjs", "baseline", dataset, "--result", paths.result, "--out", paths.baseline]).status).toBe(0);
      const result = JSON.parse(await readFile(paths.result, "utf8"));
      const candidate = { ...result, cases: [{ ...result.cases[0], status: "fail", score: 0, reason: "regressed" }], counts: { pass: 0, fail: 1, blocked: 0 }, pass_rate: 0 };
      await writeFile(paths.candidate, JSON.stringify(candidate));
      const missingEvalBaseline = command(artifact, ["scripts/prompt-eval.mjs", "regress", dataset, "--result", paths.candidate]);
      expect(missingEvalBaseline.status).not.toBe(0);
      const regression = command(artifact, ["scripts/prompt-eval.mjs", "regress", dataset, "--result", paths.candidate, "--baseline", paths.baseline]);
      expect(regression.status).toBe(2);
      expect(JSON.parse(regression.stdout)).toMatchObject({ verdict: "fail", regressions: ["one"] });

      const noPricing = command(artifact, ["scripts/cost.mjs", "attribute", dataset, "--result", paths.result, "--measurement-id", "mock-run", "--out", paths.unavailable]);
      expect(noPricing.status).toBe(2);
      expect(JSON.parse(await readFile(paths.unavailable, "utf8"))).toMatchObject({ status: "unavailable", reason: "missing_pricing" });
      await writeFile(paths.rates, JSON.stringify({ input_per_million: 1000, output_per_million: 10000 }));
      expect(command(artifact, ["scripts/cost.mjs", "attribute", dataset, "--result", paths.result, "--rates", paths.rates, "--measurement-id", "mock-run", "--out", paths.cost]).status).toBe(0);
      const missingCostBaseline = command(artifact, ["scripts/cost.mjs", "gate", dataset, "--measured", paths.cost]);
      expect(missingCostBaseline.status).toBe(2);
      expect(JSON.parse(missingCostBaseline.stdout)).toMatchObject({ verdict: "blocked", reason: "missing_baseline" });
      expect(command(artifact, ["scripts/cost.mjs", "baseline", dataset, "--measured", paths.cost, "--out", paths.costBaseline]).status).toBe(0);
      const budget = command(artifact, ["scripts/cost.mjs", "gate", dataset, "--measured", paths.cost, "--baseline", paths.costBaseline]);
      expect(budget.status).toBe(2);
      expect(JSON.parse(budget.stdout)).toMatchObject({ verdict: "fail", budgetFail: true });

      const interruptedDataset = join(artifact, "interrupted");
      await writeDataset(interruptedDataset, "interrupt");
      const interrupted = await asyncCommand(artifact, ["scripts/prompt-eval.mjs", "run", interruptedDataset, "--adapter", "http-json", "--endpoint", provider.endpoint, "--api-key-env", "ARTIFACT_KEY", "--out", paths.interrupted], { ARTIFACT_KEY: "mock-key" });
      expect(interrupted.status).toBe(2);
      expect(JSON.parse(await readFile(paths.interrupted, "utf8"))).toMatchObject({ status: "blocked", failure: { code: "interrupted" } });
    } finally {
      await provider.close();
      await rm(root, { recursive: true, force: true });
    }
  // This journey launches multiple real Node CLIs; preserve assertions under full-suite contention.
  }, 60_000);
});
