#!/usr/bin/env node
// Cross-skill contract gate, run over every catalog in catalogs.json (the oc-
// catalog in skills/, the ow- catalog in skills-work/). The checks are computed
// from SKILL.md frontmatter rather than prose, because the 2026-09-11
// skill-chain audit found the chain describing handoffs its own frontmatter did
// not back:
//
//   verbs  Every `/oc-*` or `/ow-*` verb any catalog cites names a root some
//          skill declares (oc-: frontmatter `commands:`; ow-: the
//          `metadata.commands` string, plus verbs catalogs.json assigns to an
//          add-on), and every `/<root> <subcommand>` is declared by the root's
//          owner. One merged index serves every catalog, built with each
//          catalog's own verb prefix. Read: SKILL.md bodies and frontmatter
//          descriptions, <dir>/<id>/references/*.md (not the bundled copies),
//          and skills/orchestrator.md outside §7 (§7 copies the descriptions).
//          Each skill's own command menu must list only declared verbs.
//   s7     orchestrator.md §7 carries exactly one block per invocable oc- skill,
//          byte-identical to that skill's frontmatter `description:`, in
//          catalog order, and nothing else. `--write` regenerates it; then run
//          `npm run sync-bundles` and `npm run sync-plugin-skills`.
//   family For a catalog with a private-name list (ow-): no file in a skill
//          names a skill from another catalog, a private skill or a business,
//          or says one skill invokes or chains to another (contract R1),
//          and every `<prefix>` name is a family member (a skill, a planned
//          skill, an add-on, or the protocol file). Every NEXT block leads with
//          `use <family id>` and carries its IF IT IS NOT AVAILABLE branch; the
//          body's Reads-from rows have non-empty absent and mismatch cases and
//          its Hands-off rows a non-empty unavailable branch. (ow-start design
//          §8.1; ow- cross-talk contract R5–R7.)
//   protocol  For a catalog whose protocol is a shared file (ow-), every
//          skill's copy is byte-identical to the source. `--write` refreshes
//          the copies.
//   edges  For a catalog with an edges file (ow-, contract R15): every skill
//          carries <id>/skill.edges.yaml listing what it writes (with the one
//          writer verb), reads (with absent and mismatch cases) and hands off
//          (with an unavailable branch). Edges are reciprocal inside the family:
//          every hands-off file has a reads-from row in the receiver, and every
//          reads-from row has a hands-off row in the producer (or the producer
//          writes it as a shared workspace file). No file has two writer verbs
//          across the family, except the append-only logs the protocol declares.
//          Every NEXT target resolves: `use <id>` with a slash verb that <id>
//          owns, or a handoffs.yaml destination a family example declares.
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
import { copyFileSync, readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";
import { matter } from "./lib/frontmatter.mjs";
import { declaredCommands, escapeRegExp, listSkillIds, loadCatalogs } from "./lib/catalogs.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NOT_INVOCABLE = new Set(["oc-checkpoint-protocol"]);
// Generated copies of skills/orchestrator.md and the protocol; their sources are scanned.
const BUNDLED = new Set(["orchestrator.md", "checkpoint-protocol.md"]);
const S7_HEADING = "## 7. Skill Descriptions (Trigger Optimization)";
// A bare skills directory handed to checkVerbs() is read as the oc- catalog.
const OC_DEFAULT = {
  id: "oc", relDir: "skills", prefix: "oc-", verbPrefix: "/oc-", frontmatter: "oc",
  protocol: { kind: "orchestrator" }, notInvocable: [...NOT_INVOCABLE],
};

export function loadSkills(skillsDir) {
  return listSkillIds(skillsDir).map((id) => {
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

function verbIndex(entries, catalogs) {
  const owner = new Map(); // "/oc-audit" -> skill id
  const declared = new Set(); // "/oc-audit pre-deploy"
  const withSubs = new Set(); // roots that declare at least one subcommand
  const add = (verb, id) => {
    const v = String(verb).trim().replace(/\s+/g, " ");
    const root = v.split(" ")[0];
    declared.add(v);
    if (!owner.has(root)) owner.set(root, id);
    if (v.includes(" ")) withSubs.add(root);
  };
  for (const { skill, catalog } of entries) {
    for (const c of declaredCommands(skill.data, catalog)) add(c, skill.id);
  }
  // Verbs a catalog assigns to an add-on (ow-tools provides /ow-start-transcribe),
  // and verbs of a planned skill that a NEXT block may already name.
  for (const c of catalogs) {
    for (const [addon, verbs] of Object.entries(c.addons ?? {})) for (const v of verbs) add(v, addon);
    for (const [planned, verbs] of Object.entries(c.plannedVerbs ?? {})) for (const v of verbs) add(v, planned);
  }
  return { owner, declared, withSubs };
}

// A subcommand is a whole lower-case word: `/oc-git-sync v<semver>` has an argument, not a "v".
function verbPatterns(catalogs) {
  const alt = catalogs.map((c) => escapeRegExp(c.verbPrefix)).join("|");
  return {
    verb: new RegExp(`(?<![\\w/.-])((?:${alt})[a-z0-9-]+)(?: ([a-z][a-z0-9-]*)(?![\\w<>{}\\[\\]=\\/-]))?`, "g"),
    quoted: new RegExp(`\`([^\`\\n]+)\`|"((?:${alt})[^"\\n]*)"`, "g"),
    menu: new RegExp(`^\\s+((?:${alt})[a-z0-9-]+)((?: [a-z][a-z0-9-]*)?)(?: [<\\[][^\\s]*[>\\]])*\\s{2,}\\S`),
  };
}

/**
 * Does the owner document `/<root> <sub>` as a command: a menu line
 * ("  /oc-audit fix-all   Run …"), a backticked citation, or a heading
 * ("## Phase 2 (`/oc-audit fix <id>`)")? Prose like "run /oc-audit to …" is not.
 */
function documentsSub(owner, root, sub) {
  if (!owner) return false; // an add-on has no SKILL.md here to document anything
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
function scanText({ file, text, lineOffset, self, index, bySkill, patterns, unquotedRoots, problems }) {
  text.split("\n").forEach((line, i) => {
    const where = `${file}:${i + 1 + lineOffset}`;
    const spans = [...line.matchAll(patterns.quoted)].map((m) => ({ s: m[1] ?? m[2], quoted: true }));
    spans.push({ s: line.replace(patterns.quoted, " "), quoted: false });
    for (const { s, quoted } of spans) {
      for (const m of s.matchAll(patterns.verb)) {
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
function checkMenu(s, file, index, patterns, problems) {
  let fenced = false;
  s.body.split("\n").forEach((line, i) => {
    if (/^\s*```/.test(line)) { fenced = !fenced; return; }
    if (!fenced) return;
    const m = line.match(patterns.menu);
    if (!m) return;
    const v = (m[1] + m[2]).trim();
    const where = `${file}:${i + 1 + s.bodyOffset}`;
    if (!index.owner.has(m[1])) problems.push(`${where}: menu verb \`${m[1]}\` is not declared by any skill's frontmatter commands`);
    else if (m[2] && !index.declared.has(v)) problems.push(`${where}: menu verb \`${v}\` is not declared by its owner ${index.owner.get(m[1])}`);
  });
}

/**
 * Verb check. `checkVerbs(dir)` reads one bare tree as the oc- catalog (the
 * shape the unit tests build); `checkVerbs(null, { catalogs })` reads every
 * catalog against one merged verb index.
 */
export function checkVerbs(skillsDir, { catalogs } = {}) {
  const cats = catalogs ?? [{ ...OC_DEFAULT, dir: skillsDir }];
  const entries = cats.flatMap((catalog) => loadSkills(catalog.dir).map((skill) => ({ skill, catalog })));
  const index = verbIndex(entries, cats);
  const patterns = verbPatterns(cats);
  const bySkill = new Map(entries.map(({ skill }) => [skill.id, skill]));
  const problems = [];
  const scan = (opts) => scanText({ index, bySkill, patterns, problems, ...opts });
  for (const { skill: s, catalog } of entries) {
    const file = `${catalog.relDir}/${s.id}/SKILL.md`;
    checkMenu(s, file, index, patterns, problems);
    scan({ file, text: s.body, lineOffset: s.bodyOffset, self: s.id, unquotedRoots: true });
    const desc = descriptionBlock(s.frontmatter);
    if (desc) {
      const offset = s.raw.split("\n").findIndex((l) => /^description:/.test(l));
      // A description may carry unquoted trigger aliases that are not commands
      // (oc-migration-ops' "/oc-upgrade"); quoted verbs and subcommands still count.
      scan({ file, text: desc, lineOffset: offset, self: s.id, unquotedRoots: false });
    }
    const refs = join(catalog.dir, s.id, "references");
    const skip = catalog.protocol?.kind === "file" ? new Set([basename(catalog.protocol.copy)]) : BUNDLED;
    if (existsSync(refs)) {
      for (const f of readdirSync(refs).filter((n) => n.endsWith(".md") && !skip.has(n)).sort()) {
        scan({ file: `${catalog.relDir}/${s.id}/references/${f}`, text: readFileSync(join(refs, f), "utf8"), lineOffset: 0, self: s.id, unquotedRoots: true });
      }
    }
  }
  for (const catalog of cats) {
    if (catalog.protocol?.kind === "file") {
      // One scan of the shared protocol source; the per-skill copies are byte-checked.
      const src = join(catalog.dir, catalog.protocol.source);
      if (existsSync(src)) scan({ file: `${catalog.relDir}/${catalog.protocol.source}`, text: readFileSync(src, "utf8"), lineOffset: 0, self: null, unquotedRoots: true });
      continue;
    }
    const orchPath = join(catalog.dir, "orchestrator.md");
    if (catalog.protocol?.kind !== "orchestrator" || !existsSync(orchPath)) continue;
    const orch = readFileSync(orchPath, "utf8");
    const s7 = sectionBounds(orch);
    // §7 is a copy of the frontmatter descriptions, which are scanned above.
    const before = s7 ? orch.slice(0, s7.start) : orch;
    scan({ file: `${catalog.relDir}/orchestrator.md`, text: before, lineOffset: 0, self: null, unquotedRoots: true });
    if (s7) {
      const offset = orch.slice(0, s7.end).split("\n").length - 1;
      scan({ file: `${catalog.relDir}/orchestrator.md`, text: orch.slice(s7.end), lineOffset: offset, self: null, unquotedRoots: true });
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

// ── protocol copies (ow-) ────────────────────────────────────────────────────

/** Every skill in a shared-file-protocol catalog carries a byte-identical copy of the source. */
export function checkProtocolCopies(catalogs, { write = false } = {}) {
  const problems = [];
  for (const c of catalogs) {
    if (c.protocol?.kind !== "file") continue;
    const src = join(c.dir, c.protocol.source);
    if (!existsSync(src)) { problems.push(`${c.relDir}/${c.protocol.source}: protocol source is missing`); continue; }
    const want = readFileSync(src);
    for (const id of listSkillIds(c.dir)) {
      const copy = join(c.dir, id, c.protocol.copy);
      if (existsSync(copy) && readFileSync(copy).equals(want)) continue;
      if (write) {
        if (!existsSync(dirname(copy))) problems.push(`${c.relDir}/${id}/${dirname(c.protocol.copy)}/ is missing`);
        else copyFileSync(src, copy);
        continue;
      }
      problems.push(`${c.relDir}/${id}/${c.protocol.copy} ${existsSync(copy) ? "differs from" : "is missing; copy"} ${c.relDir}/${c.protocol.source} (run \`node scripts/check-skill-contracts.mjs --write\`)`);
    }
  }
  return problems;
}

// ── family rules (ow-) ───────────────────────────────────────────────────────

function textFiles(dir, rel = "") {
  const out = [];
  for (const e of readdirSync(join(dir, rel), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...textFiles(dir, r));
    else if (/\.(md|txt|json|ya?ml|csv)$/.test(e.name)) out.push(r);
  }
  return out;
}

/** Cells of the first markdown table after `heading` in `body`, as { header, rows, line }. */
function tableAfter(body, heading) {
  const lines = body.split("\n");
  const h = lines.findIndex((l) => l.trim().toLowerCase() === heading.toLowerCase());
  if (h < 0) return null;
  let i = h + 1;
  while (i < lines.length && !lines[i].trim().startsWith("|")) {
    if (/^#{1,3} /.test(lines[i])) return { header: [], rows: [], line: h };
    i++;
  }
  const cells = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  const header = i < lines.length ? cells(lines[i]) : [];
  const rows = [];
  for (let j = i + 2; j < lines.length && lines[j].trim().startsWith("|"); j++) rows.push({ cells: cells(lines[j]), line: j });
  return { header, rows, line: h };
}

const EMPTY_CELL = /^(?:|-|—|–|n\/a|none|tbd)$/i;
const PASS_THROUGH = /proceed as if|as if (?:it )?passed|assume (?:it )?(?:passed|exists)/i;

function checkEdgeTables(s, file, problems) {
  const at = (line) => `${file}:${line + 1 + s.bodyOffset}`;
  const specs = [
    { heading: "## Reads from", required: [/^if absent/i, /^if mismatch/i] },
    { heading: "## Hands off to", required: [/^if (?:it is )?not available/i] },
  ];
  for (const { heading, required } of specs) {
    const t = tableAfter(s.body, heading);
    if (!t) { problems.push(`${file}: no "${heading}" section (ow- contract R5/R6: edge rows live in the body)`); continue; }
    if (!t.rows.length) { problems.push(`${at(t.line)}: "${heading}" has no table rows`); continue; }
    for (const re of required) {
      const col = t.header.findIndex((h) => re.test(h));
      if (col < 0) { problems.push(`${at(t.line)}: "${heading}" table has no column matching ${re}`); continue; }
      for (const row of t.rows) {
        const cell = row.cells[col] ?? "";
        if (EMPTY_CELL.test(cell)) problems.push(`${at(row.line)}: "${t.header[col]}" is empty`);
        else if (PASS_THROUGH.test(cell)) problems.push(`${at(row.line)}: "${t.header[col]}" may never proceed as if the input passed`);
      }
    }
  }
}

const DESTINATION = /handoffs\.yaml `([a-z_]+)`/g;

/**
 * NEXT blocks (contract R7): each leads with `use <family id>`, carries its IF
 * IT IS NOT AVAILABLE branch, and names a target that resolves: a slash verb
 * the named skill owns, or a handoffs.yaml destination a family example
 * declares (work leaving the family, protocol §11).
 */
function checkNextBlocks(file, text, lineOffset, ctx, problems) {
  const { known, owners, destinations, bodies, verbNames } = ctx;
  const lines = text.split("\n");
  let count = 0;
  // "use <skill id>", or "use <verb name>" (owner decision 2026-10-16): the skill that owns it.
  const skillOf = (w) => (known.has(w) ? w : verbNames?.has(w) ? owners.get(`/${w}`) ?? w : w);
  const destinationsIn = (line, where) => {
    for (const d of line.matchAll(DESTINATION)) {
      if (!destinations.has(d[1])) problems.push(`${where}: names handoffs.yaml \`${d[1]}\`, which no family examples/handoffs.yaml declares`);
    }
  };
  lines.forEach((line, i) => {
    const where = `${file}:${i + 1 + lineOffset}`;
    if (/^\s*IF IT IS NOT AVAILABLE:/.test(line)) destinationsIn(line, where);
    const m = line.match(/^\s*NEXT:\s*(.*)$/);
    if (!m) return;
    count++;
    if (/^none\b/i.test(m[1])) return;
    const use = m[1].match(/say "use ([a-z0-9-]+)/);
    const dest = /^handoffs\.yaml `[a-z_]+`/.test(m[1]);
    // The protocol's own template keeps the placeholder `use <skill id>`.
    if (!use && /say "use <[^>]+>/.test(m[1])) { /* template */ }
    else if (dest) destinationsIn(m[1], where);
    else if (!use) problems.push(`${where}: NEXT must lead with the skill id: say "use <skill id> …" (ow- contract R7), or name a handoffs.yaml destination`);
    else if (!known.has(skillOf(use[1]))) problems.push(`${where}: NEXT names \`${use[1]}\`, which is not an ow- skill, planned skill, add-on or a declared verb`);
    else {
      const useSkill = skillOf(use[1]);
      const verb = m[1].match(/\(where slash commands exist: (\/[a-z0-9-]+)((?: --[a-z][a-z0-9-]*)*)/);
      if (verb && !owners.has(verb[1])) problems.push(`${where}: NEXT's verb \`${verb[1]}\` is not declared by any skill, add-on or planned skill`);
      else if (verb && owners.get(verb[1]) !== useSkill) problems.push(`${where}: NEXT says "use ${use[1]}" but its verb \`${verb[1]}\` belongs to ${owners.get(verb[1])}`);
      else if (verb && use[1] !== useSkill && verb[1] !== `/${use[1]}`) problems.push(`${where}: NEXT names the verb ${use[1]} but its slash hint is \`${verb[1]}\``);
      else if (verb && verb[2] && bodies?.has(useSkill) && !verb[2].trim().split(/\s+/).every((f) => bodies.get(useSkill).includes(`\`${verb[1]} ${f}`))) problems.push(`${where}: NEXT's \`${verb[1]}${verb[2]}\` is not a mode ${useSkill}'s body documents`);
    }
    let ok = false;
    for (let j = i + 1; j < Math.min(lines.length, i + 8); j++) {
      if (/^\s*IF IT IS NOT AVAILABLE:/.test(lines[j])) { ok = true; break; }
      if (/^\s*(?:NEXT|DONE):/.test(lines[j])) break;
    }
    if (!ok) problems.push(`${where}: NEXT block has no "IF IT IS NOT AVAILABLE:" line (the missing-skill branch)`);
  });
  // Protocol §9: every printed "use <id>" line is followed by what the next step reads, and what to
  // attach when no folder is attached.
  lines.forEach((line, i) => {
    if (!/^\s{4,}[A-Z][A-Z ]*:.*say "use (?!<)[a-z0-9-]+/.test(line)) return;
    const after = [];
    for (let j = i + 1; j < lines.length && /^\s{6,}\S/.test(lines[j]); j++) after.push(lines[j]);
    const where = `${file}:${i + 1 + lineOffset}`;
    // The slash hint on any template line (NEXT, or a later line such as WHEN IT IS SIGNED) resolves too.
    const use0 = line.match(/say "use ([a-z0-9-]+)/)[1];
    const use = known.has(use0) ? use0 : verbNames?.has(use0) ? owners.get(`/${use0}`) ?? use0 : use0;
    const hint = line.match(/\(where slash commands exist: (\/[a-z0-9-]+)((?: --[a-z][a-z0-9-]*)*)/);
    if (hint && !/^\s*NEXT:/.test(line)) {
      if (!owners.has(hint[1])) problems.push(`${where}: the slash hint \`${hint[1]}\` is not declared by any skill, add-on or planned skill`);
      else if (owners.get(hint[1]) !== use) problems.push(`${where}: the line says "use ${use}" but \`${hint[1]}\` belongs to ${owners.get(hint[1])}`);
    }
    if (hint && hint[2] && bodies?.has(use) && !hint[2].trim().split(/\s+/).every((f) => bodies.get(use).includes(`\`${hint[1]} ${f}`))) {
      if (!/^\s*NEXT:/.test(line)) problems.push(`${where}: \`${hint[1]}${hint[2]}\` is not a mode ${use}'s body documents`);
    }
    if (!after.some((l) => /^\s+It will read:/.test(l))) problems.push(`${where}: this NEXT template has no "It will read:" line (protocol §9)`);
    if (!after.some((l) => /^\s+\[no folder attached:/.test(l))) problems.push(`${where}: this NEXT template has no "[no folder attached: …]" line (protocol §9)`);
  });
  return count;
}

/** Top-level keys of every family skill's examples/handoffs.yaml: the destinations a NEXT may name. */
function familyDestinations(c, ids) {
  const out = new Set();
  for (const id of ids) {
    const f = join(c.dir, id, "examples", "handoffs.yaml");
    if (!existsSync(f)) continue;
    for (const m of readFileSync(f, "utf8").matchAll(/^([a-z_]+):/gm)) out.add(m[1]);
  }
  for (const k of ["ow_artefact", "schema", "written_by", "workstream", "subject", "created", "clock", "origin"]) out.delete(k);
  return out;
}

/** Slash verb -> owner, for one catalog: its skills' declared verbs, add-on verbs and planned verbs. */
function familyVerbOwners(c, skills) {
  const owners = new Map();
  for (const s of skills) for (const v of declaredCommands(s.data, c)) owners.set(v.split(" ")[0], s.id);
  for (const [addon, verbs] of Object.entries(c.addons ?? {})) for (const v of verbs) owners.set(v, addon);
  for (const [planned, verbs] of Object.entries(c.plannedVerbs ?? {})) for (const v of verbs) owners.set(v, planned);
  return owners;
}

/**
 * Family rules for every catalog that declares private names (ow-, design §8.1):
 * nothing in a skill names another catalog's skill, a private skill or a
 * business; every own-prefix name is a known family member; NEXT blocks and
 * edge rows are complete.
 */
const NUMWORDS = "(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million)";
export function checkFamily(catalogs) {
  const problems = [];
  for (const c of catalogs) {
    if (!Array.isArray(c.privateNames)) continue;
    const ids = listSkillIds(c.dir);
    const protocolName = c.protocol?.kind === "file" ? basename(c.protocol.source, ".md") : null;
    const known = new Set([...ids, ...(c.planned ?? []), ...Object.keys(c.addons ?? {}), ...(protocolName ? [protocolName] : [])]);
    // A NEXT may name the receiving verb itself ("use ow-uat-plan on …", owner decision 2026-10-16):
    // a declared or planned verb's name, without its slash, is a family name too.
    const verbNames = new Set();
    for (const s of loadSkills(c.dir)) for (const v of declaredCommands(s.data, c)) verbNames.add(v.split(" ")[0].slice(1));
    for (const vs of Object.values(c.plannedVerbs ?? {})) for (const v of vs) verbNames.add(v.slice(1));
    for (const vs of Object.values(c.addons ?? {})) for (const v of vs) verbNames.add(v.slice(1));
    const others = catalogs.filter((o) => o !== c).map((o) => o.prefix);
    // Another catalog's skill named without its prefix ("app-architect") is still that skill.
    const stems = catalogs.filter((o) => o !== c).flatMap((o) => (existsSync(o.dir) ? listSkillIds(o.dir) : []).map((id) => id.slice(o.prefix.length)).filter((s) => s.includes("-")));
    const stemRe = stems.length ? new RegExp(`(?<![\\w/-])(?:${stems.map(escapeRegExp).join("|")})(?![\\w-])`, "i") : null;
    const foreign = others.length ? new RegExp(`(?<![\\w-])(?:${others.map(escapeRegExp).join("|")})[a-z0-9]+(?:-[a-z0-9]+)*`, "g") : null;
    const own = new RegExp(`(?<![\\w/-])${escapeRegExp(c.prefix)}[a-z0-9]+(?:-[a-z0-9]+)*`, "g");
    const named = [
      // R1: edges are files and NEXT blocks; ow- text never claims one skill drives another.
      { re: /\bchains? to\b|\binvok(?:e|es|ed|ing)\b|\bauto\b|\bactively invoke/i, what: "wording the cross-talk contract (R1) keeps out of ow- text" },
      // A private skill, however it is spaced ("llc ops", "llc_ops", "llcops").
      ...c.privateNames.map((n) => ({ re: new RegExp(`(?<![\\w-])${String(n).split(/[-_\s]+/).map(escapeRegExp).join("[\\s_-]?")}(?![\\w-])`, "i"), what: "a private skill" })),
      // A business, however it is spaced or hyphenated ("Deft wright", "Deft-wright").
      ...(c.brandNames ?? []).map((n) => ({ re: new RegExp(`\\b${[...n].map(escapeRegExp).join("[\\s-]?")}\\b`, "i"), what: "a business" })),
      ...(stemRe ? [{ re: stemRe, what: "a skill from another catalog, named without its prefix" }] : []),
      // No real price in skill text: a currency amount, in figures or as "<n> dollars".
      { re: /[$€£]\s?\d|\b\d[\d,]*(?:\.\d+)?\s?(?:dollars?|euros?|pounds? sterling|USD|EUR|GBP)\b|\b(?:USD|EUR|GBP)\s?\d/i, what: "a price (a currency amount)" },
      // ... or in words ("fifteen hundred dollars").
      { re: new RegExp(`\\b${NUMWORDS}(?:[\\s-]+(?:and[\\s-]+)?${NUMWORDS})*\\s+(?:dollars?|euros?|pounds?|bucks|quid|grand)\\b`, "i"), what: "a price (an amount in words)" },
    ];
    const files = ids.flatMap((id) => textFiles(join(c.dir, id)).map((r) => ({ rel: `${c.relDir}/${id}/${r}`, abs: join(c.dir, id, r) })));
    // A missing source is reported by checkProtocolCopies.
    if (protocolName && existsSync(join(c.dir, c.protocol.source))) {
      files.push({ rel: `${c.relDir}/${c.protocol.source}`, abs: join(c.dir, c.protocol.source) });
    }
    for (const f of files) {
      readFileSync(f.abs, "utf8").split("\n").forEach((line, i) => {
        const where = `${f.rel}:${i + 1}`;
        for (const m of foreign ? line.matchAll(foreign) : []) {
          problems.push(`${where}: names \`${m[0]}\`, a skill outside the ${c.prefix} family (handoffs leaving the family go through the workspace's handoffs.yaml)`);
        }
        for (const { re, what } of named) {
          const m = line.match(re);
          if (m) problems.push(`${where}: names \`${m[0]}\`, ${what}${what.startsWith("a ") ? `; public ${c.prefix} text never does (business wording lives in the user's own files)` : ""}`);
        }
        for (const m of line.matchAll(own)) {
          if (!known.has(m[0]) && !verbNames.has(m[0])) problems.push(`${where}: \`${m[0]}\` is not an ${c.prefix} skill, planned skill, add-on or the protocol file`);
        }
      });
    }
    const skills = loadSkills(c.dir);
    const ctx = { known, verbNames, owners: familyVerbOwners(c, skills), destinations: familyDestinations(c, ids), bodies: new Map(skills.map((x) => [x.id, x.body])) };
    for (const s of skills) {
      const file = `${c.relDir}/${s.id}/SKILL.md`;
      if (checkNextBlocks(file, s.body, s.bodyOffset, ctx, problems) === 0) {
        problems.push(`${file}: the body carries no NEXT template (ow- contract R6/R7)`);
      }
      checkEdgeTables(s, file, problems);
      const refs = join(c.dir, s.id, "references");
      if (existsSync(refs)) {
        for (const r of readdirSync(refs).filter((n) => n.endsWith(".md")).sort()) {
          checkNextBlocks(`${c.relDir}/${s.id}/references/${r}`, readFileSync(join(refs, r), "utf8"), 0, ctx, problems);
        }
      }
    }
  }
  return problems;
}

// ── edges (ow-, contract R15) ────────────────────────────────────────────────

/** `intake/<client>/recap.md` and `intake/<slug>/recap.md` are the same file. */
/**
 * One spelling per file: placeholders match any placeholder, a leading
 * `opchain-work/` or `./` and `.` segments drop, slashes collapse, and case is
 * folded (macOS treats `Contract-Inputs.md` and `contract-inputs.md` as one file).
 */
export const normPath = (p) => {
  const segs = [];
  for (const seg of String(p).trim().replace(/\\/g, "/").split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") { segs.pop(); continue; }
    segs.push(seg);
  }
  return segs.join("/")
    // `<client>-<n>` (a follow-on folder) is still one placeholder segment.
    .replace(/<[^>]+>(?:-<[^>]+>)*/g, "<*>")
    .replace(/^opchain-work\//, "")
    .toLowerCase();
};
const filled = (v) => typeof v === "string" ? !EMPTY_CELL.test(v.trim()) : Array.isArray(v) ? v.length > 0 : v != null;

/** Files the protocol declares append-only: a backticked name on a line that says "append-only". */
export function appendOnlyFiles(c) {
  const src = c.protocol?.kind === "file" ? join(c.dir, c.protocol.source) : null;
  if (!src || !existsSync(src)) return new Set();
  const out = new Set();
  for (const line of readFileSync(src, "utf8").split("\n")) {
    if (!/append-only/i.test(line)) continue;
    for (const m of line.matchAll(/`([A-Za-z0-9_.\/-]+\.(?:md|ya?ml))`/g)) out.add(m[1]);
  }
  return out;
}

/** Shape problems in one edges file; returns the rows it could read. */
function readEdges(c, s, problems) {
  const rel = `${c.relDir}/${s.id}/${c.edges}`;
  const abs = join(c.dir, s.id, c.edges);
  if (!existsSync(abs)) { problems.push(`${rel}: missing (ow- contract R15: every skill declares its edges)`); return null; }
  let e;
  try {
    e = yaml.load(readFileSync(abs, "utf8"));
  } catch (err) {
    problems.push(`${rel}: not valid YAML (${String(err.message).split("\n")[0]})`);
    return null;
  }
  if (!e || typeof e !== "object") { problems.push(`${rel}: empty`); return null; }
  if (e.schema !== 1) problems.push(`${rel}: schema is ${e.schema}, expected 1`);
  if (e.skill !== s.id) problems.push(`${rel}: skill is ${e.skill}, expected ${s.id}`);
  const out = { id: s.id, rel, writes: [], reads: [], hands_off: [], routes: e.routes ?? null };
  for (const key of ["writes", "reads", "hands_off"]) {
    if (!Array.isArray(e[key])) { problems.push(`${rel}: \`${key}\` must be a list`); continue; }
    out[key] = e[key].filter((row, n) => {
      if (row && typeof row === "object" && !Array.isArray(row)) return true;
      problems.push(`${rel}: ${key}[${n}] is not a map`);
      return false;
    });
  }
  return out;
}

/**
 * Edge rules for every catalog with an edges file (ow-): each skill's
 * skill.edges.yaml is complete and matches its body tables; edges are
 * reciprocal; one writer verb per file across the family.
 */
export function checkEdges(catalogs) {
  const problems = [];
  for (const c of catalogs) {
    if (!c.edges) continue;
    const ids = listSkillIds(c.dir);
    const skills = loadSkills(c.dir);
    const planned = new Set(c.planned ?? []);
    const addons = new Set(Object.keys(c.addons ?? {}));
    const destinations = familyDestinations(c, ids);
    const appendOnly = appendOnlyFiles(c);
    const owners = familyVerbOwners(c, skills);
    const bodies = new Map(skills.map((x) => [x.id, x.body]));
    // A verb with a mode (`/ow-x-quote --accepted`) is real only when its owner's body cites it in backticks.
    const modeDocumented = (owner, verb) => {
      const parts = String(verb).trim().split(/\s+/);
      if (parts.length === 1) return true;
      const body = bodies.get(owner);
      if (body == null) return true; // a planned skill or an add-on: no text to check yet
      return parts.slice(1).every((m) => body.includes(`\`${parts[0]} ${m}`));
    };
    const edges = new Map();
    for (const s of skills) {
      const e = readEdges(c, s, problems);
      if (!e) continue;
      edges.set(s.id, e);
      const verbs = new Set(declaredCommands(s.data, c));
      const readsTable = (tableAfter(s.body, "## Reads from")?.rows ?? []).map((r) => r.cells.join(" | ")).join("\n");
      const handsTable = (tableAfter(s.body, "## Hands off to")?.rows ?? []).map((r) => r.cells.join(" | ")).join("\n");
      const verbRoot = (v) => String(v ?? "").trim().split(/\s+/)[0];
      e.writes.forEach((w, n) => {
        const at = `${e.rel}: writes[${n}] (${w.path})`;
        if (!filled(w.path)) problems.push(`${e.rel}: writes[${n}] has no path`);
        if (!verbs.has(verbRoot(w.verb))) problems.push(`${at}: writer verb \`${w.verb}\` is not one of ${s.id}'s declared verbs`);
        else if (!modeDocumented(s.id, w.verb)) problems.push(`${at}: writer mode \`${w.verb}\` is not a mode ${s.id}'s body documents`);
        if (w.modes !== undefined) {
          if (!Array.isArray(w.modes) || !w.modes.length) problems.push(`${at}: modes must be a non-empty list of flags`);
          else for (const m of w.modes) if (!modeDocumented(s.id, `${verbRoot(w.verb)} ${m}`)) problems.push(`${at}: mode \`${verbRoot(w.verb)} ${m}\` is not a mode ${s.id}'s body documents`);
        }
        if (w.seeded_by !== undefined && !verbs.has(verbRoot(w.seeded_by))) problems.push(`${at}: seeded_by \`${w.seeded_by}\` is not one of ${s.id}'s declared verbs (only the owning skill may seed its own file)`);
      });
      e.reads.forEach((r, n) => {
        const at = `${e.rel}: reads[${n}] (${r.path})`;
        if (!filled(r.path)) problems.push(`${e.rel}: reads[${n}] has no path`);
        if (!(r.from === "user" || r.from === "any" || ids.includes(r.from) || planned.has(r.from) || addons.has(r.from))) {
          problems.push(`${at}: from \`${r.from}\` is not a family skill, planned skill, add-on, "user" or "any"`);
        }
        for (const k of ["if_absent", "if_mismatch"]) {
          if (!filled(r[k])) problems.push(`${at}: ${k} is empty (ow- contract R5)`);
          else if (PASS_THROUGH.test(r[k])) problems.push(`${at}: ${k} may never proceed as if the input passed`);
        }
        if (r.shared === true && String(r.path).includes("/")) problems.push(`${at}: shared: true is for workspace files at the top of opchain-work/ (profile.md, STATUS.md); ${r.path} is a client file, so it needs a hands-off row`);
        // A skill's reads of its own earlier files are detailed in its phase files, not the body table.
        if (filled(r.path) && r.from !== s.id && !readsTable.includes(String(r.path))) problems.push(`${at}: the body's "## Reads from" table does not name ${r.path}`);
      });
      // The other way round: every file the body's "## Reads from" table names has a reads row
      // (a row dropped from the edges while the body still reads the file fails).
      const readPaths = new Set(e.reads.filter((r) => filled(r.path)).map((r) => normPath(r.path)));
      const pathCells = (tableAfter(s.body, "## Reads from")?.rows ?? []).map((r) => r.cells[1] ?? "").join("\n");
      for (const m of pathCells.matchAll(/`([^`\s]+)`/g)) {
        const span = m[1].replace(/:$/, "");
        if (!/\/|\.(?:md|ya?ml|json|csv)$/.test(span) || /^\/|^(?:references|examples)\//.test(span)) continue;
        if (!readPaths.has(normPath(span))) problems.push(`${e.rel}: the body's "## Reads from" table reads ${span}, which has no reads row`);
      }
      e.hands_off.forEach((h, n) => {
        const at = `${e.rel}: hands_off[${n}] (${h.when ?? "?"})`;
        if (!filled(h.when)) problems.push(`${e.rel}: hands_off[${n}] has no \`when\``);
        if (h.destination !== undefined) {
          if (!destinations.has(h.destination)) problems.push(`${at}: destination \`${h.destination}\` is not declared in any family examples/handoffs.yaml`);
        } else if (h.to === "none") {
          // A terminal row: nothing follows.
        } else if (!(ids.includes(h.to) || planned.has(h.to) || addons.has(h.to))) {
          problems.push(`${at}: to \`${h.to}\` is not a family skill, planned skill or add-on (work leaving the family names a handoffs.yaml destination instead)`);
        }
        if (!filled(h.if_unavailable)) problems.push(`${at}: if_unavailable is empty (ow- contract R6)`);
        if (!Array.isArray(h.files)) problems.push(`${at}: files must be a list`);
        if (h.to !== "none" && h.to !== undefined && !filled(h.say)) problems.push(`${at}: no say: line`);
        if (filled(h.say) && !handsTable.includes(String(h.say))) problems.push(`${at}: the body's "## Hands off to" table does not carry "${h.say}"`);
        // The row's verb resolves to the receiving skill (or its planned or add-on verbs).
        if (h.verb !== undefined && h.to !== undefined && h.to !== "none") {
          const owner = owners.get(verbRoot(h.verb));
          if (!owner) problems.push(`${at}: verb \`${h.verb}\` is not declared by any skill, add-on or planned skill`);
          else if (owner !== h.to) problems.push(`${at}: verb \`${h.verb}\` belongs to ${owner}, not to ${h.to}`);
          else if (!modeDocumented(owner, h.verb)) problems.push(`${at}: \`${h.verb}\` is not a mode ${owner}'s body documents`);
        }
      });
      // R15: every handoff to a family skill has its NEXT template in the body, saying
      // exactly the edges say:, and every NEXT template's say: is an edges row.
      // (An add-on prints its own instructions; a destination row has a handoffs.yaml NEXT.)
      const templateSays = new Set();
      s.body.split("\n").forEach((line) => {
        if (!/^ {4,}\S/.test(line)) return;
        for (const m of line.matchAll(/say "(use [^"]+)"/g)) templateSays.add(m[1]);
      });
      // The routing verb ("use <id> on <path>"): its reference must exist, the body must point to it from
      // the verb's row, and the reference must cover every path the edges route.
      if (e.routes) {
        const rt = e.routes;
        const refPath = join(c.dir, s.id, String(rt.reference ?? ""));
        if (!filled(rt.verb) || !filled(rt.reference) || !Array.isArray(rt.paths) || !rt.paths.length) problems.push(`${e.rel}: routes needs verb, reference and paths`);
        else if (!existsSync(refPath)) problems.push(`${e.rel}: routes reference ${rt.reference} does not exist`);
        else {
          const verbRows = (tableAfter(s.body, "## Verbs")?.rows ?? []).map((r) => r.cells.join(" | "));
          const pointer = verbRows.some((l) => l.includes(`\`${rt.verb} on <path>\``) && l.includes(`\`${rt.reference}\``));
          if (!pointer) problems.push(`${c.relDir}/${s.id}/SKILL.md: the "## Verbs" table has no \`${rt.verb} on <path>\` row pointing to \`${rt.reference}\` (the routing rules live there)`);
          const refText = readFileSync(refPath, "utf8");
          const cited = new Set([...refText.matchAll(/`([^`\s]+)`/g)].map((m) => normPath(m[1])));
          for (const path of rt.paths) if (!cited.has(normPath(path))) problems.push(`${c.relDir}/${s.id}/${rt.reference}: no route for ${path}, which ${e.rel} routes`);
          // The other way round: a path the reference routes (a "### " route heading names it) is in routes.paths.
          const routed = new Set(rt.paths.map(normPath));
          for (const line of refText.split("\n").filter((l) => /^###\s/.test(l))) {
            for (const m of line.matchAll(/`([^`\s]+)`/g)) if (/\//.test(m[1]) && !routed.has(normPath(m[1]))) problems.push(`${c.relDir}/${s.id}/${rt.reference}: routes ${m[1]} (${line.replace(/^###\s*/, "").slice(0, 40)}…), which ${e.rel} routes.paths does not list`);
          }
        }
      }
      // A phase file that reads a client file (a backticked path with a placeholder, on a line that reads)
      // has that file in the edges: a reads row, its own writes, or a route.
      const known = new Set([...e.reads.map((r) => normPath(r.path)), ...e.writes.map((w) => normPath(w.path)), ...(e.routes?.paths ?? []).map(normPath)]);
      const refDir = join(c.dir, s.id, "references");
      for (const r of existsSync(refDir) ? readdirSync(refDir).filter((n) => /^phase-.*\.md$/.test(n)).sort() : []) {
        readFileSync(join(refDir, r), "utf8").split("\n").forEach((line, i) => {
          if (!/\bread(?:s|ing)?\b/i.test(line)) return;
          for (const m of line.matchAll(/`([a-z][\w.-]*\/<[a-z]+>\/[^`\s]+\.(?:md|ya?ml|json|csv))`/g)) {
            if (!known.has(normPath(m[1]))) problems.push(`${c.relDir}/${s.id}/references/${r}:${i + 1}: reads ${m[1]}, which ${e.rel} has no reads row for (nor writes or routes)`);
          }
        });
      }
      const edgeSays = new Set(e.hands_off.filter((h) => filled(h.say) && !addons.has(h.to)).map((h) => String(h.say)));
      for (const say of edgeSays) if (!templateSays.has(say)) problems.push(`${e.rel}: the handoff "${say}" has no NEXT template in ${s.id}'s body (ow- contract R15)`);
      for (const say of templateSays) if (!edgeSays.has(say)) problems.push(`${c.relDir}/${s.id}/SKILL.md: the NEXT template "${say}" matches no hands_off say: in ${e.rel}`);
      for (const h of e.hands_off) {
        if (h.destination !== undefined && !new RegExp(`^\\s+(?:NEXT|IF IT IS NOT AVAILABLE):\\s*handoffs\\.yaml \`${escapeRegExp(String(h.destination))}\``, "m").test(s.body)) {
          problems.push(`${e.rel}: the handoff to handoffs.yaml \`${h.destination}\` has no NEXT template in ${s.id}'s body (ow- contract R15)`);
        }
      }
    }

    // A say of the form "use <id> on <path>" lands on <id>'s routing verb, for a path its routes cover.
    for (const p of edges.values()) {
      for (const h of p.hands_off) {
        const m = String(h.say ?? "").match(/^use ([a-z0-9-]+) on (\S+)$/);
        if (!m || !edges.has(m[1])) continue;
        const rt = edges.get(m[1]).routes;
        if (!rt) { problems.push(`${p.rel}: "${h.say}" hands a file to ${m[1]}, which declares no routes (the verb that takes "on <path>")`); continue; }
        if (String(h.verb ?? "") !== String(rt.verb)) problems.push(`${p.rel}: "${h.say}" must name ${m[1]}'s routing verb ${rt.verb}, not ${h.verb ?? "no verb"}`);
        if (!(rt.paths ?? []).some((x) => normPath(x) === normPath(m[2]))) problems.push(`${p.rel}: "${h.say}" hands ${m[2]}, which ${m[1]}'s routes do not cover`);
      }
    }

    // One writer verb per file across the family; append-only logs excepted.
    const writers = new Map();
    for (const e of edges.values()) {
      for (const w of e.writes) {
        if (!filled(w.path)) continue;
        const k = normPath(w.path);
        if (!writers.has(k)) writers.set(k, []);
        writers.get(k).push({ skill: e.id, verb: String(w.verb ?? "").trim(), append: w.append === true, rel: e.rel, path: w.path });
      }
    }
    for (const [k, list] of writers) {
      const name = list[0].path;
      const declaredAppend = appendOnly.has(name);
      if (declaredAppend) {
        for (const w of list) if (!w.append) problems.push(`${w.rel}: ${name} is append-only (protocol); ${w.verb} must declare append: true`);
        continue;
      }
      for (const w of list) if (w.append) problems.push(`${w.rel}: ${name} is not an append-only file in the protocol, so ${w.verb} cannot append to it`);
      const distinct = [...new Set(list.map((w) => `${w.skill} ${w.verb}`))];
      if (distinct.length > 1) problems.push(`${k}: ${distinct.length} writers (${distinct.join(", ")}); one writer verb per file (ow- contract R3)`);
    }

    // Reciprocity inside the family. A planned skill or add-on has no edges file yet.
    const writes = (id, path) => (edges.get(id)?.writes ?? []).some((w) => normPath(w.path) === normPath(path));
    for (const p of edges.values()) {
      for (const h of p.hands_off) {
        const files = Array.isArray(h.files) ? h.files : [];
        for (const f of files) {
          const path = typeof f === "string" ? f : f?.path;
          if (!filled(path)) { problems.push(`${p.rel}: a hands_off file to ${h.to ?? h.destination} has no path`); continue; }
          if (!writes(p.id, path)) problems.push(`${p.rel}: hands off ${path}, which ${p.id} does not write`);
          const r = edges.get(h.to);
          if (!r) continue;
          const row = r.reads.find((x) => x.from === p.id && normPath(x.path) === normPath(path));
          if (!row) { problems.push(`${p.rel}: hands off ${path} to ${h.to}, but ${r.rel} has no reads row for it from ${p.id}`); continue; }
          const offered = typeof f === "object" && Array.isArray(f.fields) ? new Set(f.fields.map(String)) : null;
          // Fields read must be fields handed off (D8): a producer that hands a file to a reader of named fields lists them.
          if (!offered && Array.isArray(row.fields) && row.fields.length) problems.push(`${p.rel}: hands off ${path} to ${h.to} with no fields list, but ${r.rel} reads fields ${row.fields.join(", ")} of it; list the fields it hands off`);
          if (offered && Array.isArray(row.fields)) {
            for (const field of row.fields.map(String)) if (!offered.has(field)) problems.push(`${r.rel}: reads field \`${field}\` of ${path}, which ${p.rel} does not hand off`);
          }
        }
      }
    }
    for (const r of edges.values()) {
      for (const row of r.reads) {
        if (!filled(row.path) || !ids.includes(row.from)) continue;
        const p = edges.get(row.from);
        if (!p) continue;
        if (!writes(p.id, row.path)) { problems.push(`${r.rel}: reads ${row.path} from ${p.id}, which ${p.rel} does not write`); continue; }
        if (p.id === r.id || row.shared === true) continue; // its own file, or a workspace file the producer keeps for the family
        const matched = p.hands_off.some((h) => h.to === r.id && (h.files ?? []).some((f) => normPath(typeof f === "string" ? f : f?.path) === normPath(row.path)));
        if (!matched) problems.push(`${r.rel}: reads ${row.path} from ${p.id}, but ${p.rel} has no hands_off row to ${r.id} carrying it`);
      }
    }
  }
  return problems;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const write = process.argv.includes("--write");
  const catalogs = loadCatalogs({ root: ROOT });
  const oc = catalogs.find((c) => c.protocol?.kind === "orchestrator");
  const s7 = oc ? checkS7(oc.dir, { write }) : [];
  const protocol = checkProtocolCopies(catalogs, { write });
  const verbs = checkVerbs(null, { catalogs });
  const family = checkFamily(catalogs);
  const edges = checkEdges(catalogs);
  const all = [...s7, ...protocol, ...verbs, ...family, ...edges];
  for (const p of all) console.error(`✗ ${p}`);
  if (all.length) {
    console.error(`${all.length} cross-skill contract problem(s).`);
    process.exit(1);
  }
  console.log(
    `✓ cross-skill contracts hold across ${catalogs.map((c) => `${c.relDir}/`).join(" + ")}: every cited verb is declared; ` +
    `orchestrator.md §7 matches frontmatter; ow- skills name only their family and carry the protocol; ow- edges are reciprocal with one writer per file${write ? " (regenerated)" : ""}`,
  );
}
