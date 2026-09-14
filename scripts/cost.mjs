import { attributeCost, evaluateCostGate, freezeCostBaseline } from "./lib/cost/gate.mjs";
import { loadDataset, readJson, writeJson } from "./lib/prompt-eval/io.mjs";

const [command, datasetPath, ...args] = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};
const dataset = await loadDataset(datasetPath);
const measured = option("--measured") ? await readJson(option("--measured")) : undefined;
if (command === "attribute") {
  const attribution = attributeCost({ result: await readJson(option("--result")), rates: option("--rates") ? await readJson(option("--rates")) : undefined, measurementId: option("--measurement-id") });
  await writeJson(option("--out"), attribution);
  process.exitCode = attribution.status === "measured" ? 0 : 2;
} else if (command === "baseline") {
  await writeJson(option("--out"), freezeCostBaseline(measured));
} else if (command === "gate") {
  const verdict = evaluateCostGate({ cost: dataset.config.cost, measured, baseline: option("--baseline") ? await readJson(option("--baseline")) : undefined });
  process.stdout.write(`${JSON.stringify(verdict)}\n`);
  process.exitCode = verdict.verdict === "pass" ? 0 : 2;
} else throw new Error("usage: cost.mjs <attribute|baseline|gate> <dataset-dir> ...");
