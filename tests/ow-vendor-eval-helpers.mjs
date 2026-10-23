// Shared helpers for the ow-vendor-eval tests: a golden run laid out as a real run folder and edited (a planted
// failure), and the checks that fail on it. Not a test file. Replacements are literal: a planted sentence is
// inserted as written, never through `$1`-style patterns (OW-02 round 4's harness bug).
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { FIXTURES, loadKey, prepare, runCase } from "../scripts/ow-vendor-eval-acceptance.mjs";

const walkFiles = (d, b = d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walkFiles(join(d, e.name), b) : [join(d, e.name).slice(b.length + 1)]));
const scratch = [];
export const cleanup = () => scratch.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true }));
export const temp = (p) => { const d = mkdtempSync(join(tmpdir(), p)); scratch.push(d); return d; };
const home = (c) => { let h = c; while (typeof loadKey(join(FIXTURES, h)).run === "string") h = loadKey(join(FIXTURES, h)).run; return h; };

const laidOut = new Map();
/** The case's run as a real folder (its starting state and golden output), edited by `edits` ({ rel: fn(text|null) → text|null }). */
export function mutated(caseName, edits = {}) {
  if (!laidOut.has(caseName) || !existsSync(laidOut.get(caseName))) {
    const dir = temp("ow-ve-base-");
    prepare(caseName, dir);
    const h = home(caseName);
    if (existsSync(join(FIXTURES, h, "expected"))) {
      cpSync(join(FIXTURES, h, "expected"), dir, { recursive: true });
      // The binary exports an export.json lists: a golden records the tool's report, never the bytes; a real run has the
      // files, so the laid-out run gets a stub of each (the checker reads their presence, never their contents).
      for (const rel of walkFiles(join(FIXTURES, h, "expected")).filter((r) => /\.export\.json$/.test(r))) {
        const out = JSON.parse(readFileSync(join(FIXTURES, h, "expected", rel), "utf8")).outputs ?? [];
        for (const f of out) writeFileSync(join(dir, dirname(rel), f), f.endsWith(".pdf") ? "%PDF-1.4\n% stub\n" : "PK\u0003\u0004stub");
      }
    }
    laidOut.set(caseName, dir);
  }
  const dir = temp("ow-ve-run-");
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
/** { check: problems } for every check that fails on the run. */
export const failures = (caseName, runDir, opts) => Object.fromEntries(runCase(caseName, runDir, opts).filter((r) => r.problems.length).map((r) => [r.check, r.problems.join("\n")]));
/** A literal replacement that must match: the plant fails loudly if the golden moved. */
export const rep = (a, b) => (t) => { if (t == null || !t.includes(a)) throw new Error(`no match: ${String(a).slice(0, 70)}`); const i = t.indexOf(a); return t.slice(0, i) + b + t.slice(i + a.length); };
export const repAll = (a, b) => (t) => { if (t == null || !t.includes(a)) throw new Error(`no match: ${String(a).slice(0, 70)}`); return t.split(a).join(b); };
export const append = (s) => (t) => `${t ?? ""}${s}`;
export const put = (s) => () => s;
export const del = () => () => null;
export const golden = (caseName, rel) => readFileSync(join(FIXTURES, caseName, "expected", rel), "utf8");
export const input = (caseName, rel) => readFileSync(join(FIXTURES, caseName, "input", rel), "utf8");
