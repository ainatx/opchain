#!/usr/bin/env node
// Validates every catalog's <dir>/<id>/SKILL.md at build time. Catalogs come
// from catalogs.json: the oc- catalog (skills/) and the ow- catalog
// (skills-work/), each with its own prefix, frontmatter shape and protocol.
//
// Earlier this script also generated src/generated/skill-prompts.js for the
// worker's Try-It chat. The Try-It chat was removed in `claude/remove-try-it`,
// so the only remaining job is to assert end-to-end invariants — surfacing
// frontmatter errors here gives the build a clear message instead of a silent
// downstream mismatch in the Astro content collection.
//
// Astro reads skills/ directly via site/src/content.config.ts; this script
// is the equivalent guard for everything that runs *outside* the site build
// (the Worker, e2e tests, deploy pipeline). The ow- catalog feeds none of
// those outputs (catalogs.json `outputs` are null); it is validated here so
// it cannot drift while it waits to be wired in.

import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { matter } from "./lib/frontmatter.mjs";
import { declaredCommands, listSkillIds, loadCatalogs } from "./lib/catalogs.mjs";

const REQUIRED_FIELDS = [
  "name",
  "displayName",
  "version",
  "shortDesc",
  "phases",
  "triAgent",
  "commands",
  "description",
  "license",
];

// Claude Code truncates skill `description` frontmatter around ~1024 chars, which
// silently drops trigger phrases (and can drop the skill from the picker). Keep a
// hard ceiling so an over-long description fails the build instead of the field.
const DESCRIPTION_MAX = 1024;

function validateOcSkill(catalog, id) {
  const SKILLS_DIR = catalog.dir;
  const rel = catalog.relDir;
  const VALID_PHASES = new Set(catalog.phases);
  const skillPath = join(SKILLS_DIR, id, "SKILL.md");
  const raw = readFileSync(skillPath, "utf8");
  const { data, content } = matter(raw);

  for (const field of REQUIRED_FIELDS) {
    if (!(field in data)) {
      throw new Error(`${rel}/${id}/SKILL.md: missing required frontmatter field \`${field}\``);
    }
  }
  if (data.name !== id) {
    throw new Error(
      `${rel}/${id}/SKILL.md: frontmatter \`name: ${data.name}\` does not match directory name \`${id}\``,
    );
  }
  if (typeof data.description === "string" && data.description.length > DESCRIPTION_MAX) {
    throw new Error(
      `${rel}/${id}/SKILL.md: description is ${data.description.length} chars, over the ` +
      `${DESCRIPTION_MAX} limit — Claude Code truncates it and drops trigger phrases. Trim it.`,
    );
  }
  if (!Array.isArray(data.phases) || data.phases.length === 0) {
    throw new Error(`${rel}/${id}/SKILL.md: \`phases\` must be a non-empty array`);
  }
  for (const p of data.phases) {
    if (!VALID_PHASES.has(p)) {
      throw new Error(
        `${rel}/${id}/SKILL.md: unknown phase \`${p}\` (valid: ${[...VALID_PHASES].join(", ")})`,
      );
    }
  }
  if (typeof data.triAgent !== "boolean") {
    throw new Error(`${rel}/${id}/SKILL.md: \`triAgent\` must be a boolean`);
  }
  if (!Array.isArray(data.commands)) {
    throw new Error(`${rel}/${id}/SKILL.md: \`commands\` must be an array (use [] for none)`);
  }
  validateSkillFlags(rel, id, data);
  // Registry-drift checks (unknown flag names, unregistered command verbs,
  // missing skills.registry.<id>.enabled) live in scripts/check-skill-flags.mjs:
  // they need src/lib/flags/registry.js, which the extracted product repo
  // deliberately does not carry. This validator must stay product-pure.
  // Portability wiring runs last so frontmatter / flag errors surface
  // first (keeps error messages stable for callers that assert on them).
  validateProtocolWiring(catalog, id, content);
  validateReferencedFiles(catalog, id, content);
  return data;
}

// The shared orchestration protocol is what carries the welcome flow, ACTIVE
// cross-skill chaining, and checkpoint discovery. Every skill must (a) bundle it
// and (b) instruct the model to read it on first invocation — except the protocol
// source skill itself, which IS the checkpoint doc and is never invoked directly.
function validateProtocolWiring(catalog, id, content) {
  const rel = catalog.relDir;
  if (id === catalog.protocol.sourceSkill) return; // the protocol doc itself; not invoked directly

  // (a) Must instruct reading the bundled orchestrator protocol on first invocation.
  if (!/On first invocation, read\s+`?references\/orchestrator\.md`?/i.test(content)) {
    throw new Error(
      `${rel}/${id}/SKILL.md: missing the first-invocation bootstrap line ` +
      "(\"On first invocation, read `references/orchestrator.md` ...\"). Without it the " +
      "shared welcome/chaining/checkpoint protocol never loads on a user machine.",
    );
  }
  // (b) The bundled protocol files must actually exist (run `npm run sync-bundles`).
  for (const f of ["references/orchestrator.md", "references/checkpoint-protocol.md"]) {
    if (!existsSync(join(catalog.dir, id, f))) {
      throw new Error(
        `${rel}/${id}/${f} is missing — run \`npm run sync-bundles\` to bundle it. ` +
        "Shipping a skill without the shared protocol breaks cross-skill chaining and checkpoints.",
      );
    }
  }
}

function validateReferencedFiles(catalog, id, content) {
  // Every backtick-quoted `references/<name>` cited in the body must exist in the
  // shipped skill tree. A dangling citation means the model is told to read a file
  // that isn't in the zip — the exact failure that broke portability.
  // The ow- catalog also cites its shipped examples/ the same way.
  const rel = catalog.relDir;
  const cited = catalog.frontmatter === "oc"
    ? /`(references\/[A-Za-z0-9._\/-]+)`/g
    : /`((?:references|examples)\/[A-Za-z0-9._\/-]+)`/g;
  const seen = new Set();
  for (const m of content.matchAll(cited)) {
    const file = m[1];
    if (seen.has(file)) continue;
    seen.add(file);
    if (!existsSync(join(catalog.dir, id, file))) {
      throw new Error(
        `${rel}/${id}/SKILL.md: references \`${file}\` but ${rel}/${id}/${file} does not exist ` +
        "(dangling bundled-file citation — it won't be in the distributed skill).",
      );
    }
  }
}

function validateSkillFlags(rel, id, data) {
  const flags = data.flags;
  if (flags === undefined || flags === null) return;
  if (typeof flags !== "object") {
    throw new Error(`${rel}/${id}/SKILL.md: \`flags\` must be an object`);
  }
  if (flags.required !== undefined) {
    if (!Array.isArray(flags.required)) {
      throw new Error(`${rel}/${id}/SKILL.md: \`flags.required\` must be an array`);
    }
    for (const name of flags.required) {
      if (typeof name !== "string") {
        throw new Error(`${rel}/${id}/SKILL.md: \`flags.required[]\` entries must be strings`);
      }
    }
  }
  if (flags.exposes !== undefined) {
    if (!Array.isArray(flags.exposes)) {
      throw new Error(`${rel}/${id}/SKILL.md: \`flags.exposes\` must be an array`);
    }
    for (const entry of flags.exposes) {
      if (!entry || typeof entry !== "object") {
        throw new Error(`${rel}/${id}/SKILL.md: each \`flags.exposes\` entry must be an object`);
      }
      if (typeof entry.name !== "string") {
        throw new Error(`${rel}/${id}/SKILL.md: \`flags.exposes[].name\` is required`);
      }
      if (!["boolean", "string", "number"].includes(typeof entry.default)) {
        throw new Error(
          `${rel}/${id}/SKILL.md: flags.exposes[${entry.name}].default must be a ` +
          `boolean, string or number (got ${typeof entry.default})`,
        );
      }
    }
  }
}

// ── agent-skills catalogs (ow-) ─────────────────────────────────────────────
// Frontmatter is limited to the keys the Agent Skills format allows, because a
// claude.ai upload refuses any other top-level key; catalog fields live under
// `metadata`, whose values are strings. Packaging follows the ow- authoring
// standard (docs/audits/2026-09-18-ow-pack-design-audit.md): text files only,
// no hidden or executable files, no network text in a `network: none` skill,
// and a SKILL.md body under the catalog's token budget.
const AGENT_SKILLS_KEYS = new Set(["name", "description", "license", "allowed-tools", "metadata", "compatibility"]);
const TEXT_FILE = /\.(md|txt|json|ya?ml|csv)$/;
const SAFE_NAME = /^[A-Za-z0-9._-]+$/;
const NETWORK_TEXT = [
  /https?:\/\//i,
  /\bwww\./i,
  /\bMCP\b/,
  /\bfetch(?:es|ed|ing)?\b/i,
  /\bweb[ -]search\b/i,
  /\b(?:search|brows)(?:e|es|ed|ing)? the (?:web|internet)\b/i,
];

/** Body token estimate: ~4 characters per token, the same rule of thumb the SKILL.md guidance uses. */
export function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

function walkSkillTree(dir, base = dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    out.push({ path: p, rel: p.slice(base.length + 1), name: e.name, entry: e });
    if (e.isDirectory() && !e.isSymbolicLink()) walkSkillTree(p, base, out);
  }
  return out;
}

function validateAgentSkill(catalog, id) {
  const rel = catalog.relDir;
  const where = `${rel}/${id}/SKILL.md`;
  const raw = readFileSync(join(catalog.dir, id, "SKILL.md"), "utf8");
  const { data, content } = matter(raw);

  for (const key of Object.keys(data)) {
    if (!AGENT_SKILLS_KEYS.has(key)) {
      throw new Error(
        `${where}: frontmatter key \`${key}\` is not an Agent Skills key ` +
        `(allowed: ${[...AGENT_SKILLS_KEYS].join(", ")}); put catalog fields under \`metadata\``,
      );
    }
  }
  if (data.name !== id) {
    throw new Error(`${where}: frontmatter \`name: ${data.name}\` does not match directory name \`${id}\``);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id.length > 64) {
    throw new Error(`${where}: name must be kebab-case and at most 64 characters`);
  }
  const desc = data.description;
  if (typeof desc !== "string" || !desc.trim()) throw new Error(`${where}: \`description\` is required`);
  if (desc.length > DESCRIPTION_MAX) {
    throw new Error(`${where}: description is ${desc.length} chars, over the ${DESCRIPTION_MAX} limit`);
  }
  if (/[<>]/.test(desc)) throw new Error(`${where}: description cannot contain angle brackets`);
  if (!desc.slice(0, 200).includes(id)) {
    throw new Error(`${where}: the first 200 characters of the description must name the typeable id \`${id}\``);
  }
  if (typeof data.license !== "string" || !data.license) throw new Error(`${where}: \`license\` is required`);
  if (data.compatibility !== undefined && (typeof data.compatibility !== "string" || data.compatibility.length > 500)) {
    throw new Error(`${where}: \`compatibility\` must be a string of at most 500 characters`);
  }
  const meta = data.metadata;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) throw new Error(`${where}: \`metadata\` must be a map`);
  for (const [k, v] of Object.entries(meta)) {
    if (typeof v !== "string") throw new Error(`${where}: metadata.${k} must be a string (Agent Skills metadata is string to string)`);
  }
  if (!/^\d+\.\d+\.\d+$/.test(meta.version ?? "")) throw new Error(`${where}: metadata.version must be a semver string`);
  if (meta.protocol !== String(catalog.protocol.version)) {
    throw new Error(`${where}: metadata.protocol is \`${meta.protocol}\`; the catalog protocol is version ${catalog.protocol.version}`);
  }
  if (!["none", "declared"].includes(meta.network)) throw new Error(`${where}: metadata.network must be "none" or "declared"`);
  if (!meta.bundle) throw new Error(`${where}: metadata.bundle is required`);
  const commands = declaredCommands(data, catalog);
  if (!commands.includes(`/${id}`)) throw new Error(`${where}: metadata.commands must include \`/${id}\``);
  for (const c of commands) {
    if (!c.startsWith(catalog.verbPrefix) || !/^\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c)) {
      throw new Error(`${where}: command \`${c}\` must be a ${catalog.verbPrefix}* verb`);
    }
  }

  // Protocol: a two-line pointer in the body, and the byte-identical copy
  // (check-skill-contracts.mjs compares the bytes; --write refreshes them).
  const copy = catalog.protocol.copy;
  if (!content.includes(`\`${copy}\``) || !/if you cannot open it, say so and stop/i.test(content)) {
    throw new Error(
      `${where}: missing the protocol pointer: open \`${copy}\` before acting, ` +
      "and \"if you cannot open it, say so and stop\"",
    );
  }
  if (!existsSync(join(catalog.dir, id, copy))) {
    throw new Error(`${rel}/${id}/${copy} is missing — run \`node scripts/check-skill-contracts.mjs --write\``);
  }
  if (/`references\/phase-[^`]+`/.test(content) && !/do not run (?:this|a) phase from memory/i.test(content)) {
    throw new Error(`${where}: cites a phase file but never says "do not run this phase from memory"`);
  }
  validateReferencedFiles(catalog, id, content);

  const budget = catalog.bodyTokenBudget;
  if (budget && estimateTokens(content) > budget) {
    throw new Error(
      `${where}: body is ~${estimateTokens(content)} tokens, over the ${budget}-token budget; ` +
      "move phase detail into references/",
    );
  }

  for (const f of walkSkillTree(join(catalog.dir, id))) {
    const at = `${rel}/${id}/${f.rel}`;
    const st = lstatSync(f.path);
    if (st.isSymbolicLink()) throw new Error(`${at}: symlinks are not allowed in a text-only skill`);
    if (!SAFE_NAME.test(f.name) || f.name.startsWith(".")) {
      throw new Error(`${at}: file and folder names must be ASCII letters, digits, '.', '_' or '-', and not hidden`);
    }
    if (f.entry.isDirectory()) {
      if (f.name === "hooks" || f.name === "scripts") throw new Error(`${at}: a text-only skill carries no ${f.name}/`);
      continue;
    }
    if (!TEXT_FILE.test(f.name)) throw new Error(`${at}: only .md .txt .json .yaml .yml .csv files may ship in a text-only skill`);
    if (st.mode & 0o111) throw new Error(`${at}: executable bit set; a text-only skill ships no executables`);
    if (meta.network === "none") {
      const lines = readFileSync(f.path, "utf8").split("\n");
      lines.forEach((line, i) => {
        for (const re of NETWORK_TEXT) {
          if (re.test(line)) {
            throw new Error(`${at}:${i + 1}: network text (${re}) in a \`network: none\` skill: ${line.trim().slice(0, 100)}`);
          }
        }
      });
    }
  }
  return data;
}

function validateProtocolSource(catalog) {
  const src = join(catalog.dir, catalog.protocol.source);
  if (!existsSync(src)) throw new Error(`${catalog.relDir}/${catalog.protocol.source} (the ${catalog.prefix} protocol source) is missing`);
  const first = readFileSync(src, "utf8").split("\n", 1)[0];
  if (!first.includes(`(version ${catalog.protocol.version})`)) {
    throw new Error(
      `${catalog.relDir}/${catalog.protocol.source}: first line must declare "(version ${catalog.protocol.version})" ` +
      "to match catalogs.json protocol.version",
    );
  }
}

/** Validate one catalog; returns the skill ids it holds. Throws on the first problem. */
export function validateCatalog(catalog) {
  if (!existsSync(catalog.dir)) throw new Error(`catalog ${catalog.id}: ${catalog.relDir}/ does not exist`);
  const ids = listSkillIds(catalog.dir);
  if (ids.length === 0) {
    throw new Error(`no ${catalog.relDir}/ directories with a SKILL.md found`);
  }
  for (const id of ids) {
    if (!id.startsWith(catalog.prefix)) {
      throw new Error(`${catalog.relDir}/${id}: skill id does not start with the catalog prefix \`${catalog.prefix}\``);
    }
  }
  if (catalog.frontmatter === "oc") {
    ids.map((id) => validateOcSkill(catalog, id));
  } else if (catalog.frontmatter === "agent-skills") {
    validateProtocolSource(catalog);
    ids.map((id) => validateAgentSkill(catalog, id));
  } else {
    throw new Error(`catalogs.json: catalog ${catalog.id} has unknown frontmatter kind \`${catalog.frontmatter}\``);
  }
  // Invariant: a catalog's foundational skills must always be present.
  for (const required of catalog.requiredSkills ?? []) {
    if (!ids.includes(required)) {
      throw new Error(`invariant: ${catalog.relDir}/${required} must exist`);
    }
  }
  return ids;
}

function main() {
  for (const catalog of loadCatalogs()) {
    const ids = validateCatalog(catalog);
    if (catalog.id === "oc") {
      console.log(`✓ skill catalog validated: ${ids.length} skills`);
    } else {
      console.log(`✓ ${catalog.id} catalog validated: ${ids.length} skill${ids.length === 1 ? "" : "s"} (${catalog.relDir}/)`);
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
