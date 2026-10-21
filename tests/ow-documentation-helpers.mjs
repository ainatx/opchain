// Shared helpers for the ow-documentation tests: a golden run copied into a real folder and edited (a
// planted failure), and the checks that fail on it. Not a test file. Replacements are literal: a planted
// sentence is inserted as written, never through `$1`-style patterns (OW-02 round 4's harness bug).
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { FIXTURES, loadKey, prepare, runCase, stubPng } from "../scripts/ow-documentation-acceptance.mjs";
import { matter } from "../scripts/lib/frontmatter.mjs";

const scratch = [];
export const cleanup = () => scratch.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true }));
export const temp = (p) => { const d = mkdtempSync(join(tmpdir(), p)); scratch.push(d); return d; };

const laidOut = new Map();
/** The case's run as a real folder (its starting state and golden output, the indexed images as stub PNGs), edited by `edits`. */
export function mutated(caseName, edits = {}) {
  if (!laidOut.has(caseName) || !existsSync(laidOut.get(caseName))) laidOut.set(caseName, layOut(caseName));
  const dir = temp("ow-doc-run-");
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
/** Lay a case's run out once per test file; each plant edits its own copy. */
function layOut(caseName) {
  const dir = temp("ow-doc-base-");
  prepare(caseName, dir);
  let home = caseName;
  while (typeof loadKey(join(FIXTURES, home)).run === "string") home = loadKey(join(FIXTURES, home)).run;
  if (existsSync(join(FIXTURES, home, "expected"))) cpSync(join(FIXTURES, home, "expected"), dir, { recursive: true });
  // The images a golden's own index clears: tests write them, the repository never holds one.
  const idx = join(dir, "opchain-work", "docs");
  if (existsSync(idx)) {
    for (const slug of readdirSafe(idx)) {
      const f = join(idx, slug, "shots", "index.md");
      if (!existsSync(f)) continue;
      for (const m of matter(readFileSync(f, "utf8")).content.matchAll(/^\| [^|]+ \| [^|]+ \| (shots\/[^ |]+\.png) \|/gm)) {
        const p = join(idx, slug, m[1]);
        if (!existsSync(p)) { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, stubPng()); }
      }
    }
  }
  return dir;
}
function readdirSafe(d) { try { return readdirSync(d); } catch { return []; } }
/** { check: problems } for every check that fails on the run. */
export const failures = (caseName, runDir) => Object.fromEntries(runCase(caseName, runDir).filter((r) => r.problems.length).map((r) => [r.check, r.problems.join("\n")]));
/** A literal replacement that must match: the plant fails loudly if the golden moved. */
export const rep = (a, b) => (t) => { if (t == null || !t.includes(a)) throw new Error(`no match: ${String(a).slice(0, 70)}`); const i = t.indexOf(a); return t.slice(0, i) + b + t.slice(i + a.length); };
/** Append text literally. */
export const append = (s) => (t) => `${t ?? ""}${s}`;
export const golden = (caseName, rel) => readFileSync(join(FIXTURES, caseName, "expected", rel), "utf8");
