// Shared helpers for the ow-uat tests: a golden run copied into a real folder and
// edited (a planted failure), and the checks that fail on it. Not a test file.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { FIXTURES, loadKey, prepare, runCase } from "../scripts/ow-uat-acceptance.mjs";

const scratch = [];
export const cleanup = () => scratch.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true }));
export const temp = (p) => { const d = mkdtempSync(join(tmpdir(), p)); scratch.push(d); return d; };

/** The case's run as a real folder (its starting state and golden output), edited by `edits` (root-relative path -> fn; null deletes). */
export function mutated(caseName, edits = {}) {
  const dir = temp("ow-uat-run-");
  prepare(caseName, dir);
  let home = caseName;
  while (typeof loadKey(join(FIXTURES, home)).run === "string") home = loadKey(join(FIXTURES, home)).run;
  if (existsSync(join(FIXTURES, home, "expected"))) cpSync(join(FIXTURES, home, "expected"), dir, { recursive: true });
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
/** { check: problems } for every check that fails on the run. */
export const failures = (caseName, runDir) => Object.fromEntries(runCase(caseName, runDir).filter((r) => r.problems.length).map((r) => [r.check, r.problems.join("\n")]));
/** A replacement that must match: the plant fails loudly if the golden moved. */
export const rep = (a, b) => (t) => { if (t == null || !t.includes(a)) throw new Error(`no match: ${String(a).slice(0, 70)}`); return t.replace(a, b); };
export const golden = (caseName, rel) => readFileSync(join(FIXTURES, caseName, "expected", rel), "utf8");
