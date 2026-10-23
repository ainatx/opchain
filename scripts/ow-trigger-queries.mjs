#!/usr/bin/env node
// Score captured routing decisions. This script does not call a model and
// passing fabricated/synthetic answers does not establish host behavior.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCatalogs, listSkillIds, ROOT } from "./lib/catalogs.mjs";
import { matter } from "./lib/frontmatter.mjs";

export function triggerQueries(root = ROOT) {
  const catalog = loadCatalogs({ root, env: {} }).find((c) => c.id === "ow");
  const cases = JSON.parse(readFileSync(join(root, "tests/fixtures/ow-triggers/queries.json"), "utf8"));
  const ids = listSkillIds(catalog.dir);
  const keys = new Set();
  for (const row of cases) {
    if (!row.id || keys.has(row.id) || typeof row.query !== "string" || !row.query.trim() || typeof row.shouldTrigger !== "boolean") throw new Error("invalid or duplicate trigger query");
    keys.add(row.id);
  }
  for (const id of ids) {
    for (const shouldTrigger of [true, false]) {
      if (!cases.some((row) => row.skill === id && row.shouldTrigger === shouldTrigger)) throw new Error(`${id} has no ${shouldTrigger ? "positive" : "negative"} trigger query`);
    }
  }
  return cases.filter((row) => ids.includes(row.skill)).map((row) => ({
    ...row,
    description: matter(readFileSync(join(catalog.dir, row.skill, "SKILL.md"), "utf8")).data.description,
  }));
}

export function scoreTriggerResults(cases, run) {
  if (!run || !Array.isArray(run.results)) throw new Error("results must be an object with a results array");
  if (typeof run.model !== "string" || !run.model.trim() || typeof run.source !== "string" || !run.source.trim()) throw new Error("record the actual model and capture source (use source: synthetic only for harness tests)");
  const seen = new Set();
  const expected = new Map(cases.map((row) => [row.id, row]));
  const errors = [];
  for (const row of run.results) {
    if (seen.has(row.id)) errors.push(`${row.id}: duplicate result`);
    seen.add(row.id);
    if (!expected.has(row.id)) errors.push(`${row.id}: unknown query`);
    else if (typeof row.trigger !== "boolean") errors.push(`${row.id}: trigger must be boolean`);
    else if (row.trigger !== expected.get(row.id).shouldTrigger) errors.push(`${row.id}: expected trigger=${expected.get(row.id).shouldTrigger}, received ${row.trigger}`);
  }
  for (const row of cases) if (!seen.has(row.id)) errors.push(`${row.id}: missing result`);
  return { ok: errors.length === 0, source: run.source, model: run.model, cases: cases.length, errors };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const cases = triggerQueries();
    const resultAt = process.argv.indexOf("--results");
    if (resultAt >= 0 && process.argv[resultAt + 1]) {
      const report = scoreTriggerResults(cases, JSON.parse(readFileSync(process.argv[resultAt + 1], "utf8")));
      console.log(JSON.stringify(report, null, 2));
      if (!report.ok) process.exitCode = 1;
    } else if (process.argv.includes("--prompts")) {
      console.log(JSON.stringify(cases.map(({ shouldTrigger, ...row }) => row), null, 2));
    } else {
      console.log(`✓ ${cases.length} trigger queries cover both outcomes for every built ow- skill. Use --prompts for capture input, --results <file> to score recorded decisions.`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
