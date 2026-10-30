// Shared helpers for the ow-care tests: a golden run copied into a real folder and edited (a planted failure), and the
// checks that fail on it. Not a test file. Replacements are literal: a planted sentence is inserted as written.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import * as yaml from "js-yaml";
import { CASES, fakeKey, loadKey, prepare, runCase } from "../scripts/ow-care-acceptance.mjs";

const scratch = [];
export const cleanup = () => scratch.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true }));
export const temp = (p) => { const d = mkdtempSync(join(tmpdir(), p)); scratch.push(d); return d; };

const laidOut = new Map();
/** The case's run as a real folder (its starting state plus its golden output), edited by `edits`. */
export function mutated(caseName, edits = {}) {
  if (!laidOut.has(caseName) || !existsSync(laidOut.get(caseName))) {
    const dir = temp("ow-care-base-");
    prepare(caseName, dir);
    if (existsSync(join(CASES, caseName, "expected"))) cpSync(join(CASES, caseName, "expected"), dir, { recursive: true });
    laidOut.set(caseName, dir);
  }
  const dir = temp("ow-care-run-");
  cpSync(laidOut.get(caseName), dir, { recursive: true });
  for (const [rel, edit] of Object.entries(edits)) {
    const path = join(dir, rel);
    const before = existsSync(path) ? readFileSync(path, "utf8") : null;
    const after = edit(before);
    if (after === before) throw new Error(`mutation of ${rel} changed nothing`);
    mkdirSync(dirname(path), { recursive: true });
    if (after === null) rmSync(path, { recursive: true, force: true });
    else writeFileSync(path, after);
  }
  return dir;
}
/** { check: problems } for every check that fails on the run (under an optional patched answer key). */
export function failures(caseName, runDir, patch = null) {
  let caseDir;
  if (patch) {
    caseDir = temp("ow-care-key-");
    writeFileSync(join(caseDir, "answer-key.yaml"), yaml.dump({ ...loadKey(join(CASES, caseName)), ...patch }));
  }
  return Object.fromEntries(runCase(caseName, runDir, caseDir ? { caseDir } : {}).filter((r) => r.problems.length).map((r) => [r.check, r.problems.join("\n")]));
}
/**
 * A planted starting state: `files` (path -> edit of the file's text, or null to create) go into a temporary case's input
 * and into the run folder alike, so the verb "read" them and the run is graded against them.
 */
export function failuresWithState(caseName, files, { patch = {}, runEdits = {} } = {}) {
  const caseDir = temp("ow-care-state-");
  writeFileSync(join(caseDir, "answer-key.yaml"), yaml.dump({ ...loadKey(join(CASES, caseName)), ...patch }));
  const edits = { ...runEdits };
  const base = mutated(caseName);
  for (const [rel, fn] of Object.entries(files)) {
    const before = (() => { try { return readFileSync(join(base, rel), "utf8"); } catch { return null; } })();
    const after = fn(before);
    if (after == null) continue;
    if (!rel.startsWith("session/")) { mkdirSync(dirname(join(caseDir, "input", rel)), { recursive: true }); writeFileSync(join(caseDir, "input", rel), after); }
    edits[rel] = () => after;
  }
  const dir = mutated(caseName, edits);
  return Object.fromEntries(runCase(caseName, dir, { caseDir }).filter((r) => r.problems.length).map((r) => [r.check, r.problems.join("\n")]));
}
export const rep = (a, b) => (t) => { if (t == null || !t.includes(a)) throw new Error(`no match: ${String(a).slice(0, 70)}`); const i = t.indexOf(a); return t.slice(0, i) + b + t.slice(i + a.length); };
export const append = (s) => (t) => `${t ?? ""}${s}`;
export const put = (s) => () => s;
export const del = () => () => null;
export const golden = (caseName, rel) => readFileSync(join(CASES, caseName, "expected", rel), "utf8");
export { fakeKey };
