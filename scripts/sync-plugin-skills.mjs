#!/usr/bin/env node
// Materialise plugins/opchain/skills as a real directory copied from skills/.
//
// This replaced a `../../skills` symlink (seam S5 of the OSS-split plan).
// Why a copy: enterprises can only SHA-pin a plugin via a `git-subdir` source
// — a sparse clone of plugins/opchain that would not contain ../../skills —
// or an `archive` source; `claude plugin validate` doesn't follow symlinks;
// and Windows checkouts need core.symlinks for the link to exist at all. Git
// content-addresses the duplicated blobs, so the repo cost is only this sync
// step, gated by `--check` in pretest/prebuild (same pattern as
// sync-skill-bundles.mjs).
//
//   node scripts/sync-plugin-skills.mjs           # copy skills/ -> plugins/opchain/skills/
//   node scripts/sync-plugin-skills.mjs --check   # exit 1 on any drift
import {
  cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync,
} from "node:fs";
import { basename, join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = process.env.OPCHAIN_SKILLS_DIR ?? join(ROOT, "skills");
const DEST = join(ROOT, "plugins", "opchain", "skills");
const CHECK = process.argv.includes("--check");
// Enrollment must remain usable from a plugin-only artifact.
const RUNTIME = ["scripts/install-git-drivers.mjs", "scripts/verify-candidate.mjs", "scripts/lib/verification-receipt.cjs",
  // audit 2026-10-08 I-04/I-01: bypass records + the evidence gate the `--ci` installer vendors into consumer repos
  "scripts/lib/bypass-record.cjs", "scripts/lib/release-evidence.mjs", "src/lib/mcp/checkpoint-contract.js",
  // /oc-spec runs it from the plugin in consumer repos
  "scripts/scaffold-spec.mjs"];
function runtimeDrift() {
  return RUNTIME.flatMap(file => {
    const target = join(ROOT, "plugins", "opchain", file);
    if (!existsSync(join(ROOT, file))) return []; // optional in reduced source trees (fixtures, partial checkouts)
    return !existsSync(target) || !readFileSync(join(ROOT, file)).equals(readFileSync(target))
      ? [`runtime content drift: ${file}`] : [];
  });
}

// The dev plugin carries the oc- catalog only (catalogs.json: the ow- catalog's
// plugin output is null). cpSync below copies every entry of SRC, so the guard
// looks at every entry the way the copy will: a directory, or a symlink resolving
// to one, must be an oc- directory, and no symlink may resolve outside SRC.
// Refuse any other tree before the rmSync below can run.
function foreignEntries() {
  const rootReal = realpathSync(SRC);
  const out = [];
  for (const e of readdirSync(SRC, { withFileTypes: true })) {
    if (!e.isSymbolicLink()) {
      if (e.isDirectory() && !e.name.startsWith("oc-")) out.push(e.name);
      continue;
    }
    let real;
    try {
      real = realpathSync(join(SRC, e.name));
    } catch {
      out.push(`${e.name} (symlink that does not resolve)`);
      continue;
    }
    if (!real.startsWith(rootReal + sep)) out.push(`${e.name} (symlink to ${real}, outside ${SRC})`);
    else if (statSync(real).isDirectory() && !(e.name.startsWith("oc-") && basename(real).startsWith("oc-"))) out.push(`${e.name} (symlink to ${basename(real)})`);
  }
  return out;
}

const foreign = foreignEntries();
if (foreign.length) {
  console.error(`✗ refusing to build plugins/opchain/skills from ${SRC}: ${foreign.join(", ")} not in the oc- catalog (catalogs.json)`);
  process.exit(1);
}

function listFiles(dir, base = dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isSymbolicLink()) throw new Error(`unexpected symlink in tree: ${p}`);
    if (e.isDirectory()) out.push(...listFiles(p, base));
    else out.push(relative(base, p));
  }
  return out.sort();
}

function drift() {
  if (!existsSync(DEST)) return ["plugins/opchain/skills is missing"];
  if (lstatSync(DEST).isSymbolicLink()) return ["plugins/opchain/skills is still a symlink — run npm run sync-plugin-skills"];
  const a = listFiles(SRC);
  const b = listFiles(DEST);
  const problems = [];
  const bSet = new Set(b);
  for (const f of a) if (!bSet.has(f)) problems.push(`missing in plugin copy: ${f}`);
  const aSet = new Set(a);
  for (const f of b) if (!aSet.has(f)) problems.push(`stale extra in plugin copy: ${f}`);
  for (const f of a) {
    if (!bSet.has(f)) continue;
    if (!readFileSync(join(SRC, f)).equals(readFileSync(join(DEST, f)))) {
      problems.push(`content drift: ${f}`);
    }
  }
  return problems;
}

if (CHECK) {
  const problems = [...drift(), ...runtimeDrift()];
  if (problems.length > 0) {
    console.error(`✗ plugins/opchain/skills drifted from skills/ (${problems.length}):`);
    for (const p of problems.slice(0, 20)) console.error(`  ${p}`);
    if (problems.length > 20) console.error(`  … and ${problems.length - 20} more`);
    console.error("Run `npm run sync-plugin-skills` and commit the result.");
    process.exit(1);
  }
  console.log("✓ plugins/opchain/skills matches skills/");
} else {
  // The copy keeps symlinks as links and the --check pass refuses any, so refuse
  // a symlink anywhere in SRC here, before the plugin copy is deleted.
  try {
    listFiles(SRC);
  } catch (e) {
    console.error(`✗ refusing to build plugins/opchain/skills from ${SRC}: ${e.message}`);
    process.exit(1);
  }
  if (existsSync(DEST)) rmSync(DEST, { recursive: true, force: true });
  mkdirSync(dirname(DEST), { recursive: true });
  cpSync(SRC, DEST, { recursive: true });
  for (const file of RUNTIME) {
    if (!existsSync(join(ROOT, file))) continue; // optional in reduced source trees
    const target = join(ROOT, "plugins", "opchain", file);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(join(ROOT, file), target);
  }
  console.log(`Synced skills/ -> plugins/opchain/skills (${listFiles(DEST).length} files)`);
}
