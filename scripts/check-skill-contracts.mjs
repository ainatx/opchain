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
  // Verbs a catalog assigns to an add-on (ow-tools provides /ow-start-transcribe).
  for (const c of catalogs) {
    for (const [addon, verbs] of Object.entries(c.addons ?? {})) for (const v of verbs) add(v, addon);
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

function checkNextBlocks(file, text, lineOffset, known, problems) {
  const lines = text.split("\n");
  let count = 0;
  lines.forEach((line, i) => {
    const m = line.match(/^\s*NEXT:\s*(.*)$/);
    if (!m) return;
    count++;
    const where = `${file}:${i + 1 + lineOffset}`;
    if (/^none\b/i.test(m[1])) return;
    const use = m[1].match(/say "use ([a-z0-9-]+)/);
    // The protocol's own template keeps the placeholder `use <skill id>`.
    if (!use && /say "use <[^>]+>/.test(m[1])) { /* template */ }
    else if (!use) problems.push(`${where}: NEXT must lead with the skill id: say "use <skill id> …" (ow- contract R7)`);
    else if (!known.has(use[1])) problems.push(`${where}: NEXT names \`${use[1]}\`, which is not an ow- skill, planned skill or add-on`);
    let ok = false;
    for (let j = i + 1; j < Math.min(lines.length, i + 8); j++) {
      if (/^\s*IF IT IS NOT AVAILABLE:/.test(lines[j])) { ok = true; break; }
      if (/^\s*(?:NEXT|DONE):/.test(lines[j])) break;
    }
    if (!ok) problems.push(`${where}: NEXT block has no "IF IT IS NOT AVAILABLE:" line (the missing-skill branch)`);
  });
  return count;
}

/**
 * Family rules for every catalog that declares private names (ow-, design §8.1):
 * nothing in a skill names another catalog's skill, a private skill or a
 * business; every own-prefix name is a known family member; NEXT blocks and
 * edge rows are complete.
 */
export function checkFamily(catalogs) {
  const problems = [];
  for (const c of catalogs) {
    if (!Array.isArray(c.privateNames)) continue;
    const ids = listSkillIds(c.dir);
    const protocolName = c.protocol?.kind === "file" ? basename(c.protocol.source, ".md") : null;
    const known = new Set([...ids, ...(c.planned ?? []), ...Object.keys(c.addons ?? {}), ...(protocolName ? [protocolName] : [])]);
    const others = catalogs.filter((o) => o !== c).map((o) => o.prefix);
    const foreign = others.length ? new RegExp(`(?<![\\w-])(?:${others.map(escapeRegExp).join("|")})[a-z0-9]+(?:-[a-z0-9]+)*`, "g") : null;
    const own = new RegExp(`(?<![\\w/-])${escapeRegExp(c.prefix)}[a-z0-9]+(?:-[a-z0-9]+)*`, "g");
    const named = [
      // R1: edges are files and NEXT blocks; ow- text never claims one skill drives another.
      { re: /\bchains? to\b|\binvok(?:e|es|ed|ing)\b|\bauto\b|\bactively invoke/i, what: "wording the cross-talk contract (R1) keeps out of ow- text" },
      ...c.privateNames.map((n) => ({ re: new RegExp(`(?<![\\w-])${escapeRegExp(n)}(?![\\w-])`, "i"), what: "a private skill" })),
      ...(c.brandNames ?? []).map((n) => ({ re: new RegExp(`\\b${escapeRegExp(n)}\\b`, "i"), what: "a business" })),
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
          if (!known.has(m[0])) problems.push(`${where}: \`${m[0]}\` is not an ${c.prefix} skill, planned skill, add-on or the protocol file`);
        }
      });
    }
    for (const s of loadSkills(c.dir)) {
      const file = `${c.relDir}/${s.id}/SKILL.md`;
      if (checkNextBlocks(file, s.body, s.bodyOffset, known, problems) === 0) {
        problems.push(`${file}: the body carries no NEXT template (ow- contract R6/R7)`);
      }
      checkEdgeTables(s, file, problems);
      const refs = join(c.dir, s.id, "references");
      if (existsSync(refs)) {
        for (const r of readdirSync(refs).filter((n) => n.endsWith(".md")).sort()) {
          checkNextBlocks(`${c.relDir}/${s.id}/references/${r}`, readFileSync(join(refs, r), "utf8"), 0, known, problems);
        }
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
  const all = [...s7, ...protocol, ...verbs, ...family];
  for (const p of all) console.error(`✗ ${p}`);
  if (all.length) {
    console.error(`${all.length} cross-skill contract problem(s).`);
    process.exit(1);
  }
  console.log(
    `✓ cross-skill contracts hold across ${catalogs.map((c) => `${c.relDir}/`).join(" + ")}: every cited verb is declared; ` +
    `orchestrator.md §7 matches frontmatter; ow- skills name only their family and carry the protocol${write ? " (regenerated)" : ""}`,
  );
}
