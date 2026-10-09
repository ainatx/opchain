// Skill catalogs (catalogs.json at the repo root): the oc- catalog in skills/
// and the ow- catalog in skills-work/. gen-skills-catalog.mjs and
// check-skill-contracts.mjs iterate these instead of reading one global
// skills directory, so a second catalog is validated rather than skipped.
//
// Each catalog's directory can be overridden by its own env var (dirEnv):
// OPCHAIN_SKILLS_DIR for oc-, OPCHAIN_WORK_SKILLS_DIR for ow-. An override
// moves that one catalog; it never re-points another catalog's checks.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const REQUIRED = ["id", "dir", "prefix", "verbPrefix", "frontmatter", "protocol", "outputs"];

/** Read and sanity-check catalogs.json; returns entries with an absolute `dir`. */
export function loadCatalogs({ root = ROOT, env = process.env } = {}) {
  const file = join(root, "catalogs.json");
  const { catalogs } = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(catalogs) || catalogs.length === 0) {
    throw new Error("catalogs.json: `catalogs` must be a non-empty array");
  }
  const seen = { id: new Set(), dir: new Set(), prefix: new Set() };
  return catalogs.map((c) => {
    for (const f of REQUIRED) {
      if (!(f in c)) throw new Error(`catalogs.json: catalog ${c.id ?? "?"} is missing \`${f}\``);
    }
    if (c.verbPrefix !== `/${c.prefix}`) {
      throw new Error(`catalogs.json: catalog ${c.id}: verbPrefix must be "/" + prefix`);
    }
    if (!/^[a-z]+-$/.test(c.prefix)) {
      throw new Error(`catalogs.json: catalog ${c.id}: prefix must look like "xx-"`);
    }
    for (const [key, value] of [["id", c.id], ["dir", c.dir], ["prefix", c.prefix]]) {
      if (seen[key].has(value)) throw new Error(`catalogs.json: duplicate ${key} \`${value}\``);
      seen[key].add(value);
    }
    const override = c.dirEnv ? env[c.dirEnv] : undefined;
    return { ...c, dir: override ? resolve(override) : join(root, c.dir), relDir: c.dir };
  });
}

/** Skill ids in a catalog directory: subdirectories holding a SKILL.md, sorted. */
export function listSkillIds(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(dir, d.name, "SKILL.md")))
    .map((d) => d.name)
    .sort();
}

/** The verbs a skill declares: oc- uses top-level `commands:`, ow- a `metadata.commands` string. */
export function declaredCommands(data, catalog) {
  if (catalog.frontmatter === "agent-skills") {
    const raw = data?.metadata?.commands;
    return typeof raw === "string" ? raw.trim().split(/\s+/).filter(Boolean) : [];
  }
  return Array.isArray(data?.commands) ? data.commands.map((c) => String(c)) : [];
}

export function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&");
}
