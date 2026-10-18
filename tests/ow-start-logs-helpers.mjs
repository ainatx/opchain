// Helpers for the ow-start 1.1.0 logs tests (OW-08). Not a test file itself.
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { FIXTURES, runCase, runView } from "../scripts/ow-start-logs-acceptance.mjs";

export const L = "opchain-work/logs/larkspur-ceramics";
export const B = "opchain-work/logs/business";

/** Scratch folders made by these helpers; call cleanup() in afterAll. */
const scratch = [];
export const cleanup = () => scratch.forEach((d) => rmSync(d, { recursive: true, force: true }));
export const temp = (prefix) => { const d = mkdtempSync(join(tmpdir(), prefix)); scratch.push(d); return d; };

/** A copy of a case's golden run as a real run folder, with `edits` applied (null deletes; a function gets the current text). */
export function mutated(caseName, edits = {}) {
  const dir = temp("ow08-logs-");
  cpSync(join(FIXTURES, caseName, "expected"), dir, { recursive: true });
  const view = runView(caseName);
  for (const [rel, edit] of Object.entries(edits)) {
    const p = join(dir, rel);
    if (edit === null) { rmSync(p, { recursive: true, force: true }); continue; }
    let before;
    try { before = readFileSync(p, "utf8"); } catch { before = view.priorRead(rel) ?? ""; }
    const after = typeof edit === "function" ? edit(before) : edit;
    if (after === before) throw new Error(`mutation of ${rel} changed nothing`);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, after);
  }
  return dir;
}

/** { check: problems } for the checks that fail on a run folder (the golden run when dir is null). */
export const failures = (c, dir = null) => Object.fromEntries(runCase(join(FIXTURES, c), dir).filter((r) => r.problems.length).map((r) => [r.check, r.problems.join("\n")]));

/** A replace that must match. */
export const rep = (a, b) => (t) => { if (!t.includes(a)) throw new Error(`no match: ${String(a).slice(0, 70)}`); return t.split(a).join(b); };

export function walkFiles(dir) {
  try { statSync(dir); } catch { return []; }
  return readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walkFiles(p) : [p]; });
}
