// Shared helpers for the ow-uat tests: a golden run copied into a real folder and
// edited (a planted failure), and the checks that fail on it. Not a test file.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { onTestFinished } from "vitest";
import { FIXTURES, loadKey, prepare, runCase } from "../scripts/ow-uat-acceptance.mjs";

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
