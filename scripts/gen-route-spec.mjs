#!/usr/bin/env node
// Codegen: skills/oc-*/SKILL.md frontmatter + scripts/route-spec.overrides.json
// → plugins/opchain/hooks/route-spec.json, the catalog the UserPromptSubmit
// router (plugins/opchain/hooks/route-prompt.cjs) sends to TypeSafe/Jev.
//
// Why a generated file: the hook must be dependency-free CommonJS and must not
// parse 36 SKILL.md files on every prompt. The spec is tracked (the plugin
// ships it) and gated by `--check` in pretest/prebuild, same pattern as
// sync-plugin-skills.mjs. Deterministic: sorted keys, stable formatting.
//
//   node scripts/gen-route-spec.mjs            # write
//   node scripts/gen-route-spec.mjs --check    # exit 1 on drift / contract errors
//   node scripts/gen-route-spec.mjs --out <p>  # write elsewhere (tests)
//
// Per skill: { phases, index, full, notFor?, verbs, baseVerb, verbQuestion }.
//   index   ≤160 chars, written about the idea the user has, not the flag name
//           (TypeSafe cookbook rule) — from overrides, else shortDesc.
//   full    the frontmatter description, used only in the rerank request.
//   verbs   { "/oc-x sub": description } from frontmatter `commands:`;
//           description from overrides, else the SKILL.md command-reference line.
//   baseVerb the verb used when the request names no sub-task.
// Gates: the three Noul questions of the cookbook recipe (acts / procedure /
// prose), kept here so the hook and the eval share one wording.
// suggestAllow: overrides `suggest.allow`, sorted — the skills the router may
// SUGGEST (evidence gate; every skill stays a Choice option). Unknown,
// duplicate or verb-less ids and a missing `suggest.reason` are problems.

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml"; // namespace import: js-yaml 5 dropped the default export

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_OUT = join(ROOT, "plugins", "opchain", "hooks", "route-spec.json");
export const DEFAULT_OVERRIDES = join(ROOT, "scripts", "route-spec.overrides.json");
// The `+route<N>` suffix of spec.version. Bump it whenever the generated spec's
// content changes without a catalog version bump (an overrides edit, a new
// verb): spec.version keys the hook's decision cache and the eval's row hash,
// so an unbumped change would serve decisions made against the old spec.
// 2: `/oc-update doctor` verb (2026-10-09).
export const SPEC_SCHEMA_VERSION = 2;
export const INDEX_MAX = 160;

export const GATES = Object.freeze({
  acts: "The request asks the assistant to act on code, files, a repository, a service or a deployment — to change or inspect something concrete — rather than only to answer a question in prose.",
  procedure: "Doing this request well means following a documented multi-step procedure with checks (a workflow someone has written down), not improvising a one-off answer.",
  prose: "The request can be answered completely in prose alone, with no tools, files, commands or actions.",
});

function frontmatter(text, file) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) throw new Error(`${file}: no frontmatter`);
  return yaml.load(m[1]) ?? {};
}

/** `  /oc-audit diff            Audit git diff or staged changes` → { verb, text } */
function commandReferenceLines(body) {
  const out = new Map();
  for (const raw of body.split("\n")) {
    // Optional `[arg]` / `<arg>` placeholders between the verb and the gap:
    // `  /oc-audit fix <id>        Fix a single finding with verification`
    const m = /^\s*(\/oc-[a-z0-9-]+(?: [a-z0-9-]+)?)((?: [[<][^\]>]*[\]>])*)\s{2,}(\S.*?)\s*$/.exec(raw);
    if (!m) continue;
    const text = m[3].replace(/\s+/g, " ");
    if (!out.has(m[1])) out.set(m[1], text);
  }
  return out;
}

function sortObject(obj) {
  return Object.fromEntries(Object.keys(obj).sort().map((k) => [k, obj[k]]));
}

/** The verb that is a prefix of the most sibling verbs; ties → frontmatter order. */
function pickBaseVerb(commands) {
  let best = commands[0];
  let bestScore = -1;
  for (const c of commands) {
    const score = commands.filter((o) => o !== c && o.startsWith(c + " ")).length;
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return best;
}

function menuish(text) {
  return /show (this|the) menu|command reference|this menu/i.test(text);
}

export function buildSpec({ skillsDir = join(ROOT, "skills"), overridesPath = DEFAULT_OVERRIDES } = {}) {
  const overrides = existsSync(overridesPath) ? JSON.parse(readFileSync(overridesPath, "utf8")) : { skills: {} };
  const ids = readdirSync(skillsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith("oc-") && existsSync(join(skillsDir, e.name, "SKILL.md")))
    .map((e) => e.name)
    .sort();

  const problems = [];
  const skills = {};
  let catalogVersion = null;

  for (const id of ids) {
    const file = join(skillsDir, id, "SKILL.md");
    const text = readFileSync(file, "utf8");
    const fm = frontmatter(text, file);
    if (fm.name !== id) problems.push(`${id}: frontmatter name "${fm.name}" != directory`);
    catalogVersion ??= fm.version ?? null;
    const ov = overrides.skills?.[id] ?? {};
    const commands = Array.isArray(fm.commands) ? fm.commands.map(String) : [];
    const ref = commandReferenceLines(text.slice(text.indexOf("\n---", 3) + 4));
    const displayName = String(fm.displayName ?? id);

    const verbs = {};
    for (const verb of commands) {
      let desc = ov.verbs?.[verb];
      if (!desc) {
        const line = ref.get(verb);
        if (line && !menuish(line)) desc = line;
      }
      if (!desc) {
        const sub = verb.includes(" ") ? verb.split(" ").slice(1).join(" ") : null;
        desc = sub
          ? `The "${sub}" step of ${displayName}.`
          : `Open ${displayName} at its entry point when the request names no particular step.`;
      }
      verbs[verb] = desc;
    }
    for (const verb of Object.keys(ov.verbs ?? {})) {
      if (!commands.includes(verb)) problems.push(`${id}: override verb ${verb} is not in frontmatter commands`);
    }

    const index = String(ov.index ?? fm.shortDesc ?? "").replace(/\s+/g, " ").trim();
    if (!index) problems.push(`${id}: no index description`);
    if (index.length > INDEX_MAX) problems.push(`${id}: index is ${index.length} chars (max ${INDEX_MAX})`);
    const full = String(fm.description ?? "").replace(/\s+/g, " ").trim();
    if (!full) problems.push(`${id}: frontmatter description missing`);

    const baseVerb = ov.baseVerb ?? (commands.length ? pickBaseVerb(commands) : null);
    if (baseVerb && !commands.includes(baseVerb)) problems.push(`${id}: baseVerb ${baseVerb} is not a declared command`);

    const entry = {
      baseVerb,
      displayName,
      full,
      index,
      phases: Array.isArray(fm.phases) ? [...fm.phases].map(String) : [],
      verbQuestion:
        ov.verbQuestion ??
        `Which ${displayName} step does the request ask for? Choose "unspecified" when it names no particular step.`,
      verbs: sortObject(verbs),
    };
    if (ov.notFor) entry.notFor = String(ov.notFor).replace(/\s+/g, " ").trim();
    skills[id] = sortObject(entry);
  }

  for (const id of Object.keys(overrides.skills ?? {})) {
    if (!skills[id]) problems.push(`override for unknown skill ${id}`);
  }

  // Evidence gate: overrides `suggest.allow` → spec.suggestAllow (sorted). The
  // router keeps every skill as an option but suggests only these.
  let suggestAllow;
  if (overrides.suggest !== undefined) {
    const allow = overrides.suggest?.allow;
    if (!Array.isArray(allow) || !allow.length) problems.push("suggest.allow must be a non-empty array of skill ids");
    else {
      const seen = new Set();
      for (const id of allow) {
        if (typeof id !== "string") problems.push(`suggest.allow: ${JSON.stringify(id)} is not a skill id`);
        else if (seen.has(id)) problems.push(`suggest.allow: duplicate ${id}`);
        else if (!skills[id]) problems.push(`suggest.allow: unknown skill ${id}`);
        else if (!skills[id].baseVerb) problems.push(`suggest.allow: ${id} has no verbs, so it is not routable`);
        seen.add(id);
      }
      suggestAllow = [...seen].filter((id) => typeof id === "string").sort();
    }
    if (!String(overrides.suggest?.reason ?? "").trim()) problems.push("suggest.reason is required (say what evidence admits a skill)");
  }

  const spec = {
    gates: sortObject(GATES),
    generatedFrom: catalogVersion,
    skills: sortObject(skills),
    ...(suggestAllow ? { suggestAllow } : {}),
    version: `${catalogVersion ?? "0.0.0"}+route${SPEC_SCHEMA_VERSION}`,
  };
  return { spec, problems };
}

export function renderSpec(spec) {
  return JSON.stringify(spec, null, 2) + "\n";
}

function main() {
  const argv = process.argv.slice(2);
  const check = argv.includes("--check");
  const outIdx = argv.indexOf("--out");
  const out = outIdx >= 0 ? argv[outIdx + 1] : DEFAULT_OUT;
  const skillsDir = process.env.OPCHAIN_SKILLS_DIR ?? join(ROOT, "skills");

  const { spec, problems } = buildSpec({ skillsDir });
  if (problems.length) {
    console.error("gen-route-spec: contract problems:\n  " + problems.join("\n  "));
    process.exit(1);
  }
  const rendered = renderSpec(spec);
  if (check) {
    const current = existsSync(out) ? readFileSync(out, "utf8") : null;
    if (current !== rendered) {
      console.error(`gen-route-spec --check: ${out} is stale — run \`npm run gen-route-spec\``);
      process.exit(1);
    }
    console.log(`gen-route-spec --check: ${Object.keys(spec.skills).length} skills, in sync`);
    return;
  }
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, rendered);
  console.log(`gen-route-spec: wrote ${out} (${Object.keys(spec.skills).length} skills, catalog ${spec.generatedFrom})`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
