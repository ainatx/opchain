#!/usr/bin/env node
// check-work-install.mjs — the clean-folder install check for the ow- catalog
// (REL-01). Installs the built artefacts into an empty directory the way a
// user would and verifies that every file of every skill, the ow-protocol copy
// each skill carries, and the licence files arrive byte-identical to
// skills-work/. Fails on a missing, extra or changed file.
//
//   node scripts/check-work-install.mjs                 # public/ artefacts vs skills-work/
//   node scripts/check-work-install.mjs --public <dir> --source <dir> --docs <dir>
//   node scripts/check-work-install.mjs --json
//
// What it checks:
//   1. opchain-work-skills.zip, unzipped into <empty>/.claude/skills/, yields
//      every skills-work/<id>/ tree exactly, plus ow-protocol.md, README.md,
//      LICENSE and NOTICE at the root, and nothing else.
//   2. Each per-skill zip (work/<id>.zip) yields that one skill plus its own
//      LICENSE and NOTICE inside the folder, and nothing else.
//   3. Every installed references/ow-protocol.md equals skills-work/ow-protocol.md.
//   4. The docs tree (public/docs/work) holds each skill's SKILL.md, references/
//      and CHANGELOG.md byte-identical, plus ow-protocol.md, LICENSE, NOTICE.
//   5. Each installed SKILL.md's frontmatter `name:` matches its folder.
//
// Exit 0 when every check passes, 1 otherwise (the failures are listed).
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

function arg(name, dflt) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? resolve(process.argv[i + 1]) : dflt;
}

export function listFiles(dir, base = dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(p, base));
    else if (e.isFile()) out.push(relative(base, p).split(sep).join("/"));
  }
  return out;
}

const same = (a, b) => existsSync(a) && existsSync(b) && readFileSync(a).equals(readFileSync(b));

function skillIds(source) {
  return readdirSync(source, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(source, d.name, "SKILL.md")))
    .map((d) => d.name)
    .sort();
}

function unzip(zip, dest) {
  mkdirSync(dest, { recursive: true });
  const r = spawnSync("unzip", ["-q", zip, "-d", dest], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`unzip ${zip}: ${(r.stderr || r.stdout).trim()}`);
}

/** Compare an installed skill folder with its source folder; returns problems. */
function compareSkill(id, installed, sourceDir, protocol, { extras = [] } = {}) {
  const problems = [];
  if (!existsSync(installed)) return [`${id}: not installed`];
  const want = listFiles(sourceDir);
  const have = listFiles(installed);
  for (const f of want) {
    if (!have.includes(f)) problems.push(`${id}/${f}: missing from the install`);
    else if (!same(join(sourceDir, f), join(installed, f))) problems.push(`${id}/${f}: differs from skills-work`);
  }
  for (const f of have) {
    if (!want.includes(f) && !extras.includes(f)) problems.push(`${id}/${f}: not in skills-work (extra file)`);
  }
  const copy = join(installed, "references", "ow-protocol.md");
  if (!existsSync(copy)) problems.push(`${id}/references/ow-protocol.md: missing (every ow- skill carries the protocol)`);
  else if (!readFileSync(copy).equals(protocol)) problems.push(`${id}/references/ow-protocol.md: differs from ow-protocol.md`);
  const text = existsSync(join(installed, "SKILL.md")) ? readFileSync(join(installed, "SKILL.md"), "utf8") : "";
  const name = /^---\n[\s\S]*?^name:\s*"?([^"\n]+)"?\s*$[\s\S]*?\n---/m.exec(text)?.[1];
  if (name !== id) problems.push(`${id}/SKILL.md: frontmatter name is ${JSON.stringify(name ?? null)}, folder is ${id}`);
  return problems;
}

export function checkWorkInstall({
  source = join(ROOT, "skills-work"),
  publicDir = join(ROOT, "public"),
  docs = join(publicDir, "docs", "work"),
  keep = false,
} = {}) {
  const problems = [];
  const ids = skillIds(source);
  if (ids.length === 0) return { ok: false, problems: [`${source}: no skills`], ids, counts: {} };
  const protocolPath = join(source, "ow-protocol.md");
  if (!existsSync(protocolPath)) return { ok: false, problems: [`${protocolPath}: missing`], ids, counts: {} };
  const protocol = readFileSync(protocolPath);
  const licence = readFileSync(join(ROOT, "LICENSE"));
  const notice = readFileSync(join(ROOT, "NOTICE"));
  const counts = { skills: ids.length, files: 0, perSkillZips: 0, docsFiles: 0 };

  const scratch = mkdtempSync(join(tmpdir(), "ow-install-"));
  try {
    // 1. the combined zip into an empty project's .claude/skills/
    const combined = join(publicDir, "opchain-work-skills.zip");
    if (!existsSync(combined)) problems.push(`${combined}: missing (run npm run make-work-zip)`);
    else {
      const skillsDir = join(scratch, "project", ".claude", "skills");
      unzip(combined, skillsDir);
      for (const id of ids) {
        const p = compareSkill(id, join(skillsDir, id), join(source, id), protocol);
        problems.push(...p);
        counts.files += listFiles(join(source, id)).length;
      }
      for (const [f, bytes] of [["ow-protocol.md", protocol], ["LICENSE", licence], ["NOTICE", notice]]) {
        const got = join(skillsDir, f);
        if (!existsSync(got)) problems.push(`combined zip: ${f} missing at the root`);
        else if (!readFileSync(got).equals(bytes)) problems.push(`combined zip: ${f} differs`);
      }
      if (existsSync(join(source, "README.md")) && !same(join(source, "README.md"), join(skillsDir, "README.md"))) {
        problems.push("combined zip: README.md missing or differs");
      }
      const top = readdirSync(skillsDir).sort();
      const allowed = new Set([...ids, "ow-protocol.md", "README.md", "LICENSE", "NOTICE"]);
      for (const entry of top) if (!allowed.has(entry)) problems.push(`combined zip: unexpected top-level entry ${entry}`);
    }

    // 2. per-skill zips
    for (const id of ids) {
      const zip = join(publicDir, "work", `${id}.zip`);
      if (!existsSync(zip)) {
        problems.push(`${zip}: missing`);
        continue;
      }
      const dest = join(scratch, "per-skill", id, ".claude", "skills");
      unzip(zip, dest);
      const top = readdirSync(dest);
      if (top.length !== 1 || top[0] !== id) problems.push(`${id}.zip: top level is ${JSON.stringify(top)}, expected [${id}]`);
      problems.push(...compareSkill(id, join(dest, id), join(source, id), protocol, { extras: ["LICENSE", "NOTICE"] }));
      for (const [f, bytes] of [["LICENSE", licence], ["NOTICE", notice]]) {
        const got = join(dest, id, f);
        if (!existsSync(got)) problems.push(`${id}.zip: ${id}/${f} missing`);
        else if (!readFileSync(got).equals(bytes)) problems.push(`${id}.zip: ${id}/${f} differs`);
      }
      counts.perSkillZips += 1;
    }

    // 4. the docs tree
    if (!existsSync(docs)) problems.push(`${docs}: missing (run npm run sync-work-docs)`);
    else {
      for (const id of ids) {
        const files = listFiles(join(source, id)).filter((f) => f === "SKILL.md" || f === "CHANGELOG.md" || f.startsWith("references/"));
        for (const f of files) {
          if (!same(join(source, id, f), join(docs, id, f))) problems.push(`docs/work/${id}/${f}: missing or differs`);
          counts.docsFiles += 1;
        }
        const extra = existsSync(join(docs, id)) ? listFiles(join(docs, id)).filter((f) => !files.includes(f)) : [];
        for (const f of extra) problems.push(`docs/work/${id}/${f}: not a published file (extra)`);
      }
      for (const [f, bytes] of [["ow-protocol.md", protocol], ["LICENSE", licence], ["NOTICE", notice]]) {
        const got = join(docs, f);
        if (!existsSync(got)) problems.push(`docs/work/${f}: missing`);
        else if (!readFileSync(got).equals(bytes)) problems.push(`docs/work/${f}: differs`);
      }
    }
  } finally {
    if (!keep) rmSync(scratch, { recursive: true, force: true });
  }
  return { ok: problems.length === 0, problems, ids, counts, scratch: keep ? scratch : null };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const source = arg("--source", join(ROOT, "skills-work"));
  const publicDir = arg("--public", join(ROOT, "public"));
  const docs = arg("--docs", join(publicDir, "docs", "work"));
  const result = checkWorkInstall({ source, publicDir, docs });
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.ok) {
    const c = result.counts;
    console.log(`✓ clean-folder install: ${c.skills} ow- skills, ${c.files} files from opchain-work-skills.zip, ${c.perSkillZips} per-skill zips, ${c.docsFiles} docs files, every ow-protocol copy identical`);
  } else {
    console.error(`✗ clean-folder install failed (${result.problems.length}):`);
    for (const p of result.problems) console.error(`  - ${p}`);
  }
  process.exit(result.ok ? 0 : 1);
}
