#!/usr/bin/env node
// Cross-skill contract gate. Two checks, both computed from SKILL.md frontmatter
// rather than prose, because the 2026-09-11 skill-chain audit found the chain
// describing handoffs its own frontmatter did not back:
//
//   verbs  Every `/oc-*` verb the catalog cites names a root some skill declares
//          in `commands:`, and every `/<root> <subcommand>` is declared by the
//          root's owner. Read: SKILL.md bodies and frontmatter descriptions,
//          skills/<id>/references/*.md (not the bundled copies), and
//          skills/orchestrator.md outside §7 (§7 copies the descriptions).
//          Each skill's own command menu must list only declared verbs.
//   s7     orchestrator.md §7 carries exactly one block per invocable skill,
//          byte-identical to that skill's frontmatter `description:`, in
//          catalog order, and nothing else. `--write` regenerates it; then run
//          `npm run sync-bundles` and `npm run sync-plugin-skills`.
//
// How strictly text is read (see scanText): quoted verbs (backticks, or
// `"/oc-…"` strings such as a Skill() call's args) are strict. Unquoted text is
// loose, because "/oc-audit to find bugs" is a verb and an English word: an
// unquoted subcommand is checked only when its owner documents that exact pair
// as a command. Unquoted roots are checked everywhere except frontmatter
// descriptions, which may keep trigger aliases that are not commands
// (oc-migration-ops' "/oc-upgrade"). Not read: a subcommand separated by more
// than one space, single-quoted '/oc-…' strings, and "- /oc-…" list-style menus.
// Runs in pretest/prebuild next to check-skill-flags.
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { matter } from "./lib/frontmatter.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NOT_INVOCABLE = new Set(["oc-checkpoint-protocol"]);
// Generated copies of skills/orchestrator.md and the protocol; their sources are scanned.
const BUNDLED = new Set(["orchestrator.md", "checkpoint-protocol.md"]);
const S7_HEADING = "## 7. Skill Descriptions (Trigger Optimization)";

export function loadSkills(skillsDir) {
  return readdirSync(skillsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(skillsDir, e.name, "SKILL.md")))
    .map((e) => e.name)
    .sort()
    .map((id) => {
      const raw = readFileSync(join(skillsDir, id, "SKILL.md"), "utf8");
      const end = raw.startsWith("---\n") ? raw.indexOf("\n---", 3) : -1;
      return {
        id,
        raw,
        data: matter(raw).data,
        frontmatter: end < 0 ? "" : raw.slice(4, end),
        body: end < 0 ? raw : raw.slice(end + 4),
        // body line N is file line N + offset
        bodyOffset: end < 0 ? 0 : raw.slice(0, end + 4).split("\n").length - 1,
      };
    });
}

function verbIndex(skills) {
  const owner = new Map(); // "/oc-audit" -> skill id
  const declared = new Set(); // "/oc-audit pre-deploy"
  const withSubs = new Set(); // roots that declare at least one subcommand
  for (const s of skills) {
    for (const c of Array.isArray(s.data.commands) ? s.data.commands : []) {
      const v = String(c).trim().replace(/\s+/g, " ");
      const root = v.split(" ")[0];
      declared.add(v);
      if (!owner.has(root)) owner.set(root, s.id);
      if (v.includes(" ")) withSubs.add(root);
    }
  }
  return { owner, declared, withSubs };
}

// A subcommand is a whole lower-case word: `/oc-git-sync v<semver>` has an argument, not a "v".
const VERB = /(?<![\w/.-])(\/oc-[a-z0-9-]+)(?: ([a-z][a-z0-9-]*)(?![\w<>{}\[\]=\/-]))?/g;

/**
 * Does the owner document `/<root> <sub>` as a command: a menu line
 * ("  /oc-audit fix-all   Run …"), a backticked citation, or a heading
 * ("## Phase 2 (`/oc-audit fix <id>`)")? Prose like "run /oc-audit to …" is not.
 */
function documentsSub(owner, root, sub) {
  const v = `${root} ${sub}`.replace(/[-/]/g, "\\$&");
  const menu = new RegExp(`^\\s*${v}(?![\\w-])`, "m");
  const cited = new RegExp(`[\`(]${v}(?![\\w-])`);
  return menu.test(owner.body) || cited.test(owner.body);
}

/**
 * Quoted spans (backticks, or a double-quoted string that starts with a verb, as in
 * `args="/oc-monitor health"`) are read strictly: the root must be declared and so
 * must any subcommand, whether or not the root declares others. Unquoted text is read loosely, because "/oc-audit to find…"
 * is a verb followed by an English word: a root is checked only when
 * `unquotedRoots` is set, and a subcommand only when its owner's SKILL.md documents
 * that exact `/<root> <sub>` pair (so it is a real subcommand) without declaring it.
 */
function scanText({ file, text, lineOffset, self, index, bySkill, unquotedRoots, problems }) {
  const QUOTED = /`([^`\n]+)`|"(\/oc-[^"\n]*)"/g;
  text.split("\n").forEach((line, i) => {
    const where = `${file}:${i + 1 + lineOffset}`;
    const spans = [...line.matchAll(QUOTED)].map((m) => ({ s: m[1] ?? m[2], quoted: true }));
    spans.push({ s: line.replace(QUOTED, " "), quoted: false });
    for (const { s, quoted } of spans) {
      for (const m of s.matchAll(VERB)) {
        const [, root, sub] = m;
        const own = index.owner.get(root);
        if (!own) {
          if (quoted || unquotedRoots) problems.push(`${where}: \`${root}\` is not declared by any skill's frontmatter commands`);
          continue;
        }
        if (!sub || own === self || index.declared.has(`${root} ${sub}`)) continue;
        if (quoted || documentsSub(bySkill.get(own), root, sub)) {
          problems.push(`${where}: \`${root} ${sub}\` is not declared by its owner ${own}`);
        }
      }
    }
  });
}

/**
 * A skill's own command menu — a line inside a fenced block shaped like
 * "  /oc-audit fix <id>     Fix a single finding" — lists only verbs its
 * frontmatter declares. A menu root owned by another skill is a handoff and is
 * held to the same rule.
 */
function checkMenu(s, index, problems) {
  let fenced = false;
  s.body.split("\n").forEach((line, i) => {
    if (/^\s*```/.test(line)) { fenced = !fenced; return; }
    if (!fenced) return;
    const m = line.match(/^\s+(\/oc-[a-z0-9-]+)((?: [a-z][a-z0-9-]*)?)(?: [<\[][^\s]*[>\]])*\s{2,}\S/);
    if (!m) return;
    const v = (m[1] + m[2]).trim();
    const where = `skills/${s.id}/SKILL.md:${i + 1 + s.bodyOffset}`;
    if (!index.owner.has(m[1])) problems.push(`${where}: menu verb \`${m[1]}\` is not declared by any skill's frontmatter commands`);
    else if (m[2] && !index.declared.has(v)) problems.push(`${where}: menu verb \`${v}\` is not declared by its owner ${index.owner.get(m[1])}`);
  });
}

export function checkVerbs(skillsDir) {
  const skills = loadSkills(skillsDir);
  const index = verbIndex(skills);
  const bySkill = new Map(skills.map((s) => [s.id, s]));
  const problems = [];
  const scan = (opts) => scanText({ index, bySkill, problems, ...opts });
  for (const s of skills) {
    checkMenu(s, index, problems);
    scan({ file: `skills/${s.id}/SKILL.md`, text: s.body, lineOffset: s.bodyOffset, self: s.id, unquotedRoots: true });
    const desc = descriptionBlock(s.frontmatter);
    if (desc) {
      const offset = s.raw.split("\n").findIndex((l) => /^description:/.test(l));
      // A description may carry unquoted trigger aliases that are not commands
      // (oc-migration-ops' "/oc-upgrade"); quoted verbs and subcommands still count.
      scan({ file: `skills/${s.id}/SKILL.md`, text: desc, lineOffset: offset, self: s.id, unquotedRoots: false });
    }
    const refs = join(skillsDir, s.id, "references");
    if (existsSync(refs)) {
      for (const f of readdirSync(refs).filter((n) => n.endsWith(".md") && !BUNDLED.has(n)).sort()) {
        scan({ file: `skills/${s.id}/references/${f}`, text: readFileSync(join(refs, f), "utf8"), lineOffset: 0, self: s.id, unquotedRoots: true });
      }
    }
  }
  const orchPath = join(skillsDir, "orchestrator.md");
  if (existsSync(orchPath)) {
    const orch = readFileSync(orchPath, "utf8");
    const s7 = sectionBounds(orch);
    // §7 is a copy of the frontmatter descriptions, which are scanned above.
    const before = s7 ? orch.slice(0, s7.start) : orch;
    scan({ file: "skills/orchestrator.md", text: before, lineOffset: 0, self: null, unquotedRoots: true });
    if (s7) {
      const offset = orch.slice(0, s7.end).split("\n").length - 1;
      scan({ file: "skills/orchestrator.md", text: orch.slice(s7.end), lineOffset: offset, self: null, unquotedRoots: true });
    }
  }
  return problems;
}

/** The raw `description: >` block (key line included) from a skill's frontmatter. */
export function descriptionBlock(frontmatter) {
  const lines = frontmatter.split("\n");
  const start = lines.findIndex((l) => /^description:/.test(l));
  if (start < 0) return null;
  let end = start + 1;
  while (end < lines.length && (lines[end] === "" || /^\s/.test(lines[end]))) end++;
  while (end > start + 1 && lines[end - 1] === "") end--;
  return lines.slice(start, end).join("\n");
}

function sectionBounds(orch) {
  const h = orch.indexOf(S7_HEADING);
  if (h < 0) return null;
  const next = orch.indexOf("\n## ", h + S7_HEADING.length);
  const limit = next < 0 ? orch.length : next;
  const open = orch.indexOf("```yaml\n", h);
  const close = open < 0 ? -1 : orch.indexOf("\n```", open + 8);
  if (open < 0 || close < 0 || close > limit) return null;
  return { start: h, end: close + 4, bodyStart: open + 8, bodyEnd: close + 1 };
}

export function renderS7(skills) {
  return skills
    .filter((s) => !NOT_INVOCABLE.has(s.id))
    .map((s) => `# ${s.id}\n${descriptionBlock(s.frontmatter)}\n`)
    .join("\n");
}

export function checkS7(skillsDir, { write = false } = {}) {
  const skills = loadSkills(skillsDir);
  const orchPath = join(skillsDir, "orchestrator.md");
  const orch = readFileSync(orchPath, "utf8");
  const b = sectionBounds(orch);
  if (!b) return [`skills/orchestrator.md: no "${S7_HEADING}" yaml block`];
  const problems = [];
  for (const s of skills) {
    if (!NOT_INVOCABLE.has(s.id) && !descriptionBlock(s.frontmatter)) {
      problems.push(`skills/${s.id}/SKILL.md: frontmatter has no description block`);
    }
  }
  if (problems.length) return problems;
  const want = renderS7(skills);
  const have = orch.slice(b.bodyStart, b.bodyEnd);
  if (have === want) return [];
  if (write) {
    writeFileSync(orchPath, orch.slice(0, b.bodyStart) + want + orch.slice(b.bodyEnd));
    return [];
  }
  const blocks = (txt) => new Map([...txt.matchAll(/^# (\S+)\n([\s\S]*?)(?=^# \S+\n|(?![\s\S]))/gm)].map((m) => [m[1], m[2].trimEnd()]));
  const h = blocks(have), w = blocks(want);
  for (const id of w.keys()) {
    if (!h.has(id)) problems.push(`orchestrator.md §7: no block for ${id}`);
    else if (h.get(id) !== w.get(id)) problems.push(`orchestrator.md §7: ${id} differs from skills/${id}/SKILL.md frontmatter description`);
  }
  for (const id of h.keys()) if (!w.has(id)) problems.push(`orchestrator.md §7: block for ${id}, which is not an invocable skill in skills/`);
  if (!problems.length) problems.push("orchestrator.md §7: blocks are out of catalog order or spacing differs");
  return problems.map((p) => `${p} (run \`node scripts/check-skill-contracts.mjs --write\`)`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const skillsDir = process.env.OPCHAIN_SKILLS_DIR ?? join(ROOT, "skills");
  const write = process.argv.includes("--write");
  const s7 = checkS7(skillsDir, { write });
  const verbs = checkVerbs(skillsDir);
  for (const p of [...s7, ...verbs]) console.error(`✗ ${p}`);
  if (s7.length || verbs.length) {
    console.error(`${s7.length + verbs.length} cross-skill contract problem(s).`);
    process.exit(1);
  }
  console.log(`✓ cross-skill contracts hold: every cited verb is declared; orchestrator.md §7 matches frontmatter${write ? " (regenerated)" : ""}`);
}
