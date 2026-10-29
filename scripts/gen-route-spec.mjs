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
//   node scripts/gen-route-spec.mjs            # write both outputs
//   node scripts/gen-route-spec.mjs --check    # exit 1 on drift / contract errors in either
//   node scripts/gen-route-spec.mjs --out <p>  # write the spec elsewhere (tests)
//   node scripts/gen-route-spec.mjs --questions-out <p> --uses <p>   # the second output (tests)
//
// Second output, plugins/opchain/hooks/jev-questions.json: the registry of Jev
// uses (scripts/jev-uses.json, hand-written: id, status, wording) expanded with
// what only the generator knows — J1's gates, request rules and `none` text
// from the router's own constants, J2's skill options from the spec. One
// wording per use, shared by every caller and by `route-eval jev <use>`
// (docs/plans/2026-10-24-jev-integration-plan.md §2).
//
// Per skill: { phases, index, full, notFor?, verbs, baseVerb, verbQuestion, menuVerbs? }.
//   index   ≤160 chars, written about the idea the user has, not the flag name
//           (TypeSafe cookbook rule) — from overrides, else shortDesc.
//   full    the frontmatter description, used only in the rerank request.
//   verbs   { "/oc-x sub": description } from frontmatter `commands:`;
//           description from overrides, else the SKILL.md command-reference line.
//   baseVerb the verb used when the request names no sub-task.
//   menuVerbs verbs that only print the skill's command menu (isMenuVerb); the
//           router does not suggest them (route-dispatch evaluate()).
// Gates: the three Noul questions of the cookbook recipe (acts / procedure /
// prose), kept here so the hook and the eval share one wording.
// suggestAllow: overrides `suggest.allow`, sorted — the skills the router may
// SUGGEST (evidence gate; every skill stays a Choice option). Unknown,
// duplicate or verb-less ids and a missing `suggest.reason` are problems.

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import * as yaml from "js-yaml"; // namespace import: js-yaml 5 dropped the default export

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_OUT = join(ROOT, "plugins", "opchain", "hooks", "route-spec.json");
export const DEFAULT_OVERRIDES = join(ROOT, "scripts", "route-spec.overrides.json");
export const DEFAULT_USES = join(ROOT, "scripts", "jev-uses.json");
export const DEFAULT_QUESTIONS_OUT = join(ROOT, "plugins", "opchain", "hooks", "jev-questions.json");
const ROUTER_MODULE = join(ROOT, "plugins", "opchain", "hooks", "lib", "route-dispatch.cjs");
export const USE_STATUSES = Object.freeze(["shadow", "eval", "planned", "no"]);
export const USE_KINDS = Object.freeze(["router", "noul", "choice", "none"]);
// The `+route<N>` suffix of spec.version. Bump it whenever the generated spec's
// content changes without a catalog version bump (an overrides edit, a new
// verb): spec.version keys the hook's decision cache and the eval's row hash,
// so an unbumped change would serve decisions made against the old spec.
// 2: `/oc-update doctor` verb (2026-10-09).
// 3: `menuVerbs`, `/oc-merge`, request rules and the 2026-10-23 routing copy.
// 4: plan §3 copy (2026-10-26): opening a PR is /oc-git-sync, /oc-pr only drafts,
//    release planning that names staging/production is oc-release-ops (and its
//    /oc-release plan step), and a message that only names the checks is not a
//    bug-check run (in that skill's notFor: a global request rule for it
//    silenced "MERGE?" and primed "check").
export const SPEC_SCHEMA_VERSION = 4;
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

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Does invoking `verb` with nothing after it print the skill's command menu?
 * Its command-reference line says so ("/oc-repo  Show this menu"), the body
 * says "When the user types `/oc-git`, display this menu", or the overrides
 * list it in `menuVerbs`. The router never suggests such a verb.
 */
function isMenuVerb(verb, { line, body, listed }) {
  if (listed) return true;
  if (line && menuish(line)) return true;
  return new RegExp(`types\\s+\`?${escapeRe(verb)}\`?,?\\s+(?:display|show)\\s+(?:this|the)\\s+(?:command\\s+)?menu`, "i").test(body);
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
    const body = text.slice(text.indexOf("\n---", 3) + 4);
    const ref = commandReferenceLines(body);
    const displayName = String(fm.displayName ?? id);

    const verbs = {};
    const menuVerbs = [];
    const listedMenus = Array.isArray(ov.menuVerbs) ? ov.menuVerbs.map(String) : [];
    for (const verb of listedMenus) {
      if (!commands.includes(verb)) problems.push(`${id}: menuVerbs entry ${verb} is not in frontmatter commands`);
    }
    for (const verb of commands) {
      if (isMenuVerb(verb, { line: ref.get(verb), body, listed: listedMenus.includes(verb) })) menuVerbs.push(verb);
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
    if (menuVerbs.length) entry.menuVerbs = [...menuVerbs].sort();
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

/** Sorted keys at every object level; arrays keep their order. */
function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((k) => [k, sortDeep(value[k])]));
  return value;
}

const USE_ID_RE = /^J[1-9][0-9]*$/;

/**
 * jev-uses.json + the spec → { questions, problems }. Every use keeps its
 * registry fields; a `router` use gains the router's gates, rules, `none` and
 * `unspecified` texts, thresholds and core list; a use with a `question` gains
 * the API-shaped Noul (or Choice) question; J2-style `steps` become per-skill
 * `skills` entries (displayName, index, steps) over every routable skill;
 * J8-style `sections` (name → definition) pass through whitespace-collapsed.
 */
export function buildJevQuestions({ spec, usesPath = DEFAULT_USES, routerPath = ROUTER_MODULE, root = ROOT } = {}) {
  const problems = [];
  if (!existsSync(usesPath)) return { questions: null, problems: [`uses file not found: ${usesPath}`] };
  let registry;
  try {
    registry = JSON.parse(readFileSync(usesPath, "utf8"));
  } catch (err) {
    return { questions: null, problems: [`${usesPath}: ${err.message}`] };
  }
  const router = require(routerPath);
  const uses = {};
  const entries = registry && registry.uses && typeof registry.uses === "object" ? registry.uses : null;
  if (!entries) problems.push("jev-uses: `uses` object is required");
  for (const [id, use] of Object.entries(entries ?? {})) {
    if (!USE_ID_RE.test(id)) problems.push(`jev-uses: id ${id} is not J<n>`);
    if (!use || typeof use !== "object") {
      problems.push(`jev-uses: ${id} is not an object`);
      continue;
    }
    const name = String(use.name ?? "").trim();
    if (!name) problems.push(`jev-uses: ${id} has no name`);
    if (!USE_STATUSES.includes(use.status)) problems.push(`jev-uses: ${id} status ${JSON.stringify(use.status)} is not one of ${USE_STATUSES.join("/")}`);
    if (!USE_KINDS.includes(use.kind)) problems.push(`jev-uses: ${id} kind ${JSON.stringify(use.kind)} is not one of ${USE_KINDS.join("/")}`);
    if (!String(use.summary ?? "").trim()) problems.push(`jev-uses: ${id} has no summary`);
    const active = use.status === "shadow" || use.status === "eval";
    if (active) {
      if (!Array.isArray(use.state) || !use.state.length || use.state.some((f) => typeof f !== "string" || !f)) problems.push(`jev-uses: ${id} (${use.status}) needs a non-empty \`state\` field list`);
      if (typeof use.gold !== "string" || !use.gold) problems.push(`jev-uses: ${id} (${use.status}) needs a \`gold\` path`);
      else if (!existsSync(isAbsolute(use.gold) ? use.gold : join(root, use.gold))) problems.push(`jev-uses: ${id} gold set missing: ${use.gold}`);
      if (!String(use.caller ?? "").trim()) problems.push(`jev-uses: ${id} (${use.status}) needs a \`caller\``);
    } else if (!String(use.reason ?? "").trim()) problems.push(`jev-uses: ${id} (${use.status}) needs a \`reason\``);
    if (use.kind === "none" && active) problems.push(`jev-uses: ${id} is kind none but status ${use.status}`);

    const out = { id, ...use };
    delete out.question;
    delete out.steps;
    if (use.kind === "router") {
      out.spec = "route-spec.json";
      out.gates = spec.gates;
      out.rules = router.REQUEST_RULES;
      out.none = router.NONE_DESCRIPTION;
      out.unspecified = router.UNSPECIFIED_DESCRIPTION;
      const T = router.DEFAULT_THRESHOLDS;
      out.thresholds = { gate: T.gate, coreFits: T.coreFits, otherFits: T.otherFits, minTopProb: T.minTopProb, verb: T.verb };
      out.core = [...router.CORE_SKILLS].sort();
      if (use.question) problems.push(`jev-uses: ${id} is kind router; its questions come from route-dispatch, not a \`question\``);
    } else if (use.kind === "noul" || use.kind === "choice") {
      const q = use.question;
      if (active) {
        if (!q || typeof q !== "object" || !String(q.criterion ?? "").trim()) problems.push(`jev-uses: ${id} (${use.status}) needs question.criterion`);
        if (use.kind === "noul" && (!q || !String(q.true ?? "").trim() || !String(q.false ?? "").trim())) problems.push(`jev-uses: ${id} needs question.true and question.false`);
        if (use.kind === "choice" && (!q || !q.options || typeof q.options !== "object" || Object.keys(q.options).length < 2)) problems.push(`jev-uses: ${id} needs question.options with at least two entries`);
        if (use.kind === "choice" && use.positive !== undefined && !(q && q.options && Object.prototype.hasOwnProperty.call(q.options, use.positive))) problems.push(`jev-uses: ${id} positive ${JSON.stringify(use.positive)} is not one of its options`);
        if (typeof use.threshold !== "number" || !(use.threshold > 0 && use.threshold < 1)) problems.push(`jev-uses: ${id} (${use.status}) needs a threshold in (0, 1)`);
      }
      if (q && typeof q === "object") {
        const clean = (v) => String(v ?? "").replace(/\s+/g, " ").trim();
        out.question =
          use.kind === "noul"
            ? { type: "noul", instructions: { criterion: clean(q.criterion) }, criteria: { true: clean(q.true), false: clean(q.false) } }
            : { type: "choice", instructions: { task: clean(q.criterion) }, criteria: sortObject(Object.fromEntries(Object.entries(q.options ?? {}).map(([k, v]) => [k, clean(v)]))) };
      }
    } else if (use.question) problems.push(`jev-uses: ${id} is kind none and carries a question`);

    if (use.sections !== undefined) {
      const bad = !use.sections || typeof use.sections !== "object" || Array.isArray(use.sections) || !Object.keys(use.sections).length;
      if (bad || Object.values(use.sections).some((v) => typeof v !== "string" || !v.trim())) problems.push(`jev-uses: ${id} sections must be an object of name → definition`);
      else out.sections = Object.fromEntries(Object.entries(use.sections).map(([k, v]) => [k, v.replace(/\s+/g, " ").trim()]));
    }
    if (use.steps !== undefined) {
      if (!use.steps || typeof use.steps !== "object" || Array.isArray(use.steps)) problems.push(`jev-uses: ${id} steps must be an object of skill → [skills]`);
      else {
        const routable = Object.keys(spec.skills).filter((s) => spec.skills[s].baseVerb && Object.keys(spec.skills[s].verbs || {}).length);
        for (const [skill, steps] of Object.entries(use.steps)) {
          if (!spec.skills[skill]) problems.push(`jev-uses: ${id} steps names unknown skill ${skill}`);
          if (!Array.isArray(steps) || steps.some((x) => !spec.skills[x])) problems.push(`jev-uses: ${id} steps for ${skill} must list known skills`);
        }
        const skills = {};
        for (const skill of routable) {
          skills[skill] = { displayName: spec.skills[skill].displayName, index: spec.skills[skill].index, steps: [...(use.steps[skill] ?? [])].sort() };
        }
        out.skills = sortObject(skills);
      }
    }
    uses[id] = sortDeep(out);
  }
  const questions = {
    generatedFrom: spec.generatedFrom ?? null,
    schema: Number(registry?.schema) || 1,
    uses: sortObject(uses),
    version: spec.version,
  };
  return { questions, problems };
}

export function renderQuestions(questions) {
  return JSON.stringify(questions, null, 2) + "\n";
}

function main() {
  const argv = process.argv.slice(2);
  const check = argv.includes("--check");
  const flag = (name, fallback) => {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
  };
  const out = flag("--out", DEFAULT_OUT);
  const questionsOut = flag("--questions-out", out === DEFAULT_OUT ? DEFAULT_QUESTIONS_OUT : join(dirname(out), "jev-questions.json"));
  const usesPath = flag("--uses", DEFAULT_USES);
  const skillsDir = process.env.OPCHAIN_SKILLS_DIR ?? join(ROOT, "skills");

  const { spec, problems } = buildSpec({ skillsDir });
  if (problems.length) {
    console.error("gen-route-spec: contract problems:\n  " + problems.join("\n  "));
    process.exit(1);
  }
  const { questions, problems: useProblems } = buildJevQuestions({ spec, usesPath });
  if (useProblems.length) {
    console.error("gen-route-spec: jev-uses problems:\n  " + useProblems.join("\n  "));
    process.exit(1);
  }
  const rendered = renderSpec(spec);
  const renderedQuestions = renderQuestions(questions);
  const nUses = Object.keys(questions.uses).length;
  if (check) {
    const current = existsSync(out) ? readFileSync(out, "utf8") : null;
    if (current !== rendered) {
      console.error(`gen-route-spec --check: ${out} is stale — run \`npm run gen-route-spec\``);
      process.exit(1);
    }
    const currentQuestions = existsSync(questionsOut) ? readFileSync(questionsOut, "utf8") : null;
    if (currentQuestions !== renderedQuestions) {
      console.error(`gen-route-spec --check: ${questionsOut} is stale — run \`npm run gen-route-spec\``);
      process.exit(1);
    }
    console.log(`gen-route-spec --check: ${Object.keys(spec.skills).length} skills, ${nUses} jev uses, in sync`);
    return;
  }
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, rendered);
  mkdirSync(dirname(questionsOut), { recursive: true });
  writeFileSync(questionsOut, renderedQuestions);
  console.log(`gen-route-spec: wrote ${out} (${Object.keys(spec.skills).length} skills, catalog ${spec.generatedFrom}) and ${questionsOut} (${nUses} jev uses)`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
