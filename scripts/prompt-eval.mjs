import { selectAdapter } from "./lib/prompt-eval/cli.mjs";
import { blockedResult, evaluateRegression, runDataset } from "./lib/prompt-eval/runner.mjs";
import { freezeBaseline } from "./lib/prompt-eval/schema.mjs";
import { loadDataset, readJson, writeJson } from "./lib/prompt-eval/io.mjs";

const [command, datasetPath, ...args] = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};
const dataset = await loadDataset(datasetPath);
if (command === "run") {
  const keyName = option("--api-key-env");
  const selected = selectAdapter({ adapter: option("--adapter"), endpoint: option("--endpoint"), apiKey: keyName ? process.env[keyName] : undefined });
  const result = selected.failure ? blockedResult(dataset, selected.failure.code, selected.failure.message) : await runDataset({ dataset, adapter: selected.adapter });
  await writeJson(option("--out"), result);
  process.exitCode = result.status === "completed" && result.pass_rate >= dataset.config.thresholds.pass_rate ? 0 : 2;
} else if (command === "baseline") {
  await writeJson(option("--out"), freezeBaseline({ dataset, result: await readJson(option("--result")) }));
} else if (command === "regress") {
  const verdict = evaluateRegression({ dataset, result: await readJson(option("--result")), baseline: await readJson(option("--baseline")) });
  process.stdout.write(`${JSON.stringify(verdict)}\n`);
  process.exitCode = verdict.verdict === "pass" ? 0 : 2;
} else throw new Error("usage: prompt-eval.mjs <run|baseline|regress> <dataset-dir> ...");
