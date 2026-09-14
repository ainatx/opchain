import { readFile, writeFile } from "node:fs/promises";
import { load } from "js-yaml";
import { validateDataset } from "./schema.mjs";

export async function readJson(path) { return JSON.parse(await readFile(path, "utf8")); }
export async function writeJson(path, value) { await writeFile(path, `${JSON.stringify(value, null, 2)}\n`); }
export async function loadDataset(directory) {
  const jsonl = async (name) => (await readFile(`${directory}/${name}`, "utf8")).trim().split("\n").filter(Boolean).map(JSON.parse);
  return validateDataset({ inputs: await jsonl("inputs.jsonl"), expected: await jsonl("expected.jsonl"), config: load(await readFile(`${directory}/eval.yaml`, "utf8")) });
}
