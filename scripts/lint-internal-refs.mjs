#!/usr/bin/env node
// Gate: no internal identifiers in the shipped product text.
//
// The skills/ + plugins/ trees are distributed verbatim (zips, plugin cache,
// public mirror), so maintainer/client identifiers that leak into examples
// propagate to every install — and the bundled references/ copies multiply a
// single source leak 29x (2026-08-22 OSS-readiness audit, findings PX-04 /
// AF-3: 47 affected files). Seam S3 scrubbed them to neutral fixtures
// (acme-*, example.com, Meridian); this gate keeps them out. Product-pure:
// no imports outside node builtins, honors OPCHAIN_SKILLS_DIR, and moves to
// the contributor repo with the product.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = process.env.OPCHAIN_SKILLS_DIR ?? join(ROOT, "skills");
const PLUGINS_DIR = join(ROOT, "plugins");

// Case-insensitive internal names, plus personal-identity markers. Word
// bounds keep e.g. "guidance"/"dosage" safe; extend the list when a new
// internal name is coined rather than loosening it.
const BANNED = [
  /\baidops(?:-core)?\b/i,
  /\bpenthreshold\b/i,
  /\bgtrackr?\b/i,
  /\/Users\/aidan\b/i,
  /\baidan@/i,
  /privaterelay\.appleid/i,
  /\bAidan\b/,
];

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isSymbolicLink()) continue; // plugins/opchain/skills -> ../../skills
    if (e.isDirectory()) yield* walk(p);
    else if (/\.(md|ya?ml|json|cjs|mjs|js|sh)$/.test(e.name)) yield p;
  }
}

// The licensor's legal name on a copyright line is the one sanctioned use
// (decision D2 of the OSS-split plan); everywhere else the name is leakage.
const ALLOWED_LINE = /Copyright \d{4} Aidan Elsesser/;

// Every other catalog in catalogs.json (the ow- catalog in skills-work/) ships
// text too, so it is walked as well. Optional: the extracted product repo may
// carry no catalogs.json.
const OTHER_CATALOG_DIRS = [];
try {
  const { catalogs } = JSON.parse(readFileSync(join(ROOT, "catalogs.json"), "utf8"));
  for (const c of catalogs) {
    if (c.dir === "skills") continue;
    OTHER_CATALOG_DIRS.push((c.dirEnv && process.env[c.dirEnv]) || join(ROOT, c.dir));
  }
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}

const hits = [];
for (const base of [SKILLS_DIR, PLUGINS_DIR, ...OTHER_CATALOG_DIRS]) {
  let st;
  try { st = statSync(base); } catch { continue; }
  if (!st.isDirectory()) continue;
  for (const file of walk(base)) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (ALLOWED_LINE.test(line)) return;
      for (const re of BANNED) {
        if (re.test(line)) {
          hits.push(`${relative(ROOT, file)}:${i + 1}: ${line.trim().slice(0, 120)} [${re}]`);
          break;
        }
      }
    });
  }
}

if (hits.length > 0) {
  console.error(`✗ internal identifiers in shipped product text (${hits.length}):`);
  for (const h of hits) console.error(`  ${h}`);
  console.error("Replace with neutral fixtures (acme-app / example.com / Meridian — see docs/plans/2026-08-22-oss-split-licensing-compliance.md §2.3 S3).");
  process.exit(1);
}
console.log(`✓ no internal identifiers in skills/, plugins/${OTHER_CATALOG_DIRS.length ? " or " + OTHER_CATALOG_DIRS.map((d) => relative(ROOT, d) + "/").join(", ") : ""}`);
