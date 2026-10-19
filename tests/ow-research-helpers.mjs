// Shared helpers for the ow-research acceptance and plant tests: a golden run laid out as a
// real folder (the --prepare path) and edited, and the checks that fail on it. Not a test file.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { onTestFinished } from "vitest";
import { FIXTURES, loadKey, prepare, runCase } from "../scripts/ow-research-acceptance.mjs";

/** Scratch folders. One made inside a test is removed in the background once that test finishes, so a file's folders
 *  never pile up for one long afterAll (CI: ~1,500 at once outlived the 20s hook timeout) and the removal overlaps the
 *  next test instead of blocking it. One made outside a test (while collecting, or in beforeAll) waits for cleanup(),
 *  which the test files await in afterAll; it also waits for any removal still running. */
const scratch = [];
const pending = new Set();
const remove = (d) => rmSync(d, { recursive: true, force: true });
const removeLater = (d) => { const job = rm(d, { recursive: true, force: true }).catch(() => {}).finally(() => pending.delete(job)); pending.add(job); };
export const cleanup = async () => { scratch.splice(0).forEach(remove); await Promise.all(pending); };
export const temp = (p) => {
  const d = mkdtempSync(join(tmpdir(), p));
  try { onTestFinished(() => removeLater(d)); } catch { scratch.push(d); } // outside a test: kept for cleanup()
  return d;
};

/** The case's run as a real folder (starting state + its golden output), edited by `edits` (root-relative path -> fn). */
export function mutated(caseName, edits = {}) {
  const dir = temp("ow-research-run-");
  prepare(caseName, dir);
  let home = caseName;
  while (loadKey(join(FIXTURES, home)).run) home = loadKey(join(FIXTURES, home)).run;
  const expected = join(FIXTURES, home, "expected");
  if (existsSync(expected)) cpSync(expected, dir, { recursive: true });
  for (const [rel, edit] of Object.entries(edits)) {
    const path = join(dir, rel);
    const before = existsSync(path) && statSync(path).isFile() ? readFileSync(path, "utf8") : null;
    const after = edit(before, path);
    if (after === undefined) continue; // the edit acted on the folder itself
    if (after === before) throw new Error(`mutation of ${rel} changed nothing`);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, after);
  }
  return dir;
}
/** { check: "problem\nproblem" } for every check that fails on the run. */
export const failures = (caseName, runDir) => Object.fromEntries(runCase(caseName, runDir).filter((r) => r.problems.length).map((r) => [r.check, r.problems.join("\n")]));
/** Edit `rel` of `caseName`'s golden with `fn` and return the failing checks. */
export const plant = (caseName, edits) => failures(caseName, mutated(caseName, edits));
/** A string replacement that must hit. */
export const rep = (a, b) => (t) => { if (t == null || !t.includes(a)) throw new Error(`no match: ${String(a).slice(0, 70)}`); return t.replace(a, b); };
