#!/usr/bin/env node
// Validate the text-only ow- distribution before replacing public artifacts.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCatalogs, ROOT } from "./lib/catalogs.mjs";
import { matter } from "./lib/frontmatter.mjs";
import { validateCatalog } from "./gen-skills-catalog.mjs";
import { checkEdges, checkFamily, checkProtocolCopies, checkVerbs } from "./check-skill-contracts.mjs";

const digest = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
const within = (parent, path) => {
  const rel = relative(parent, path);
  return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`));
};

// Resolve even an output that does not exist yet through its nearest existing
// ancestor. A symlink at public/, work/, or an artifact must not re-enter source.
function canonical(path) {
  let parent = resolve(path);
  const tail = [];
  for (;;) {
    try {
      lstatSync(parent);
      return resolve(realpathSync(parent), ...tail);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      // A dangling symlink exists but has no canonical destination: refuse it.
      try { if (lstatSync(parent).isSymbolicLink()) throw new Error(`output has a dangling symlink: ${parent}`); } catch (probe) { if (probe.code !== "ENOENT") throw probe; }
      const next = dirname(parent);
      if (next === parent) throw error;
      tail.unshift(basename(parent));
      parent = next;
    }
  }
}

export function makeWorkSkillsZip({ root = ROOT, env = process.env } = {}) {
  const catalogs = loadCatalogs({ root, env });
  const catalog = catalogs.find((c) => c.id === "ow");
  if (!catalog) throw new Error("ow- catalog is not configured");
  const ids = validateCatalog(catalog);
  const errors = [...checkProtocolCopies(catalogs), ...checkVerbs(null, { catalogs }), ...checkFamily(catalogs), ...checkEdges(catalogs)];
  if (errors.length) throw new Error(`ow- distribution refused: ${errors.join("\n")}`);
  const publicDir = resolve(env.OPCHAIN_PUBLIC_DIR ?? join(root, "public"));
  const sourceDir = realpathSync(catalog.dir);
  for (const output of [publicDir, join(publicDir, "work"), join(publicDir, "opchain-work-skills.zip"), join(publicDir, "work/manifest.json"), ...ids.map((id) => join(publicDir, "work", `${id}.zip`))]) {
    const target = canonical(output);
    if (within(sourceDir, target) || within(target, sourceDir)) throw new Error("ow- distribution output must not contain or overlap its source catalog");
  }
  for (const [path, required] of [[join(root, "LICENSE"), true], [join(root, "NOTICE"), true], [join(catalog.dir, catalog.protocol.source), true], [join(catalog.dir, "README.md"), false]]) {
    let stat;
    try { stat = lstatSync(path); } catch (error) {
      if (!required && error.code === "ENOENT") continue;
      throw new Error(`ow- distribution needs a regular source file: ${path}`);
    }
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`ow- distribution needs a regular source file (no symlinks): ${path}`);
  }
  const temp = mkdtempSync(join(tmpdir(), "opchain-work-zip-"));
  const source = join(temp, "source");
  const artifacts = join(temp, "artifacts");
  mkdirSync(source);
  mkdirSync(artifacts);
  const archiveFiles = (entry) => {
    const path = join(source, entry);
    try {
      return readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((child) => archiveFiles(`${entry}/${child.name}`));
    } catch (error) {
      if (error.code !== "ENOTDIR") throw error;
      // ZIP's first representable date; fixed UTC makes rebuild hashes stable.
      utimesSync(path, 315532800, 315532800);
      return [entry];
    }
  };
  const zip = (out, entries) => {
    const files = entries.flatMap(archiveFiles).sort();
    const result = spawnSync("zip", ["-q", "-X", "-9", out, ...files], { cwd: source, encoding: "utf8", env: { ...process.env, TZ: "UTC" } });
    if (result.status !== 0) throw new Error(`ow- archive failed: ${result.error?.message ?? result.stderr ?? "zip unavailable"}`);
  };
  try {
    const manifest = { schemaVersion: 1, catalog: "ow", protocolVersion: catalog.protocol.version, skills: [] };
    for (const id of ids) {
      cpSync(join(catalog.dir, id), join(source, id), { recursive: true });
      for (const file of ["LICENSE", "NOTICE"]) cpSync(join(root, file), join(source, id, file));
      const out = join(artifacts, `${id}.zip`);
      zip(out, [id]);
      const { data } = matter(readFileSync(join(catalog.dir, id, "SKILL.md"), "utf8"));
      manifest.skills.push({ id, version: data.metadata.version, url: `/work/${id}.zip`, sha256: digest(out) });
    }
    for (const file of ["LICENSE", "NOTICE"]) cpSync(join(root, file), join(source, file));
    if (existsSync(join(catalog.dir, "README.md"))) cpSync(join(catalog.dir, "README.md"), join(source, "README.md"));
    const combined = join(temp, "opchain-work-skills.zip");
    zip(combined, [...ids, "LICENSE", "NOTICE", ...(existsSync(join(source, "README.md")) ? ["README.md"] : [])]);
    manifest.bundle = { url: "/opchain-work-skills.zip", sha256: digest(combined) };
    writeFileSync(join(artifacts, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    // /work also holds site HTML; /skills belongs to the oc- catalog.
    mkdirSync(join(publicDir, "work"), { recursive: true });
    for (const old of readdirSync(join(publicDir, "work"))) {
      if (/^ow-[a-z0-9-]+\.zip$/.test(old) && !ids.some((id) => `${id}.zip` === old)) rmSync(join(publicDir, "work", old));
    }
    for (const id of ids) cpSync(join(artifacts, `${id}.zip`), join(publicDir, "work", `${id}.zip`));
    cpSync(join(artifacts, "manifest.json"), join(publicDir, "work", "manifest.json"));
    cpSync(combined, join(publicDir, "opchain-work-skills.zip"));
    return manifest;
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const manifest = makeWorkSkillsZip();
    console.log(`✓ ow- distribution: ${manifest.skills.length} per-skill archives, combined archive and SHA-256 manifest`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
