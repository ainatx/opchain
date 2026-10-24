#!/usr/bin/env node
// ow-vendor-eval acceptance checks (docs/plans/2026-10-16-ow-vendor-eval-design.md §10 and the OW-11 contract,
// sprints/release-2.1/ow-11/contract.md, C1 to C32).
//
// ow-vendor-eval is a text-only skill: a model runs it, so these checks cannot run the skill. They read what a run
// wrote (its opchain-work/ folder), what it printed (printed.md at the top of the run folder) and what the user said
// (session/turns.md, one "- " line per answer), and test them against an answer key, the family's own goldens the run
// starts from (ow-build-plan's, ow-research's and ow-start's), and ow-tools' own validators. One check per rule, each
// isolated: a check that throws fails on its own with a one-line reason, and the others still run.
//
// The category rules are imported, never copied: ow-research's ourSideFindings, figuresIn, isRound, ROUND_MATCH,
// internalFigures, parseFindings and credentialFindings; ow-documentation 1.0.1's otherWorkstreams,
// otherClientMatchers, NON_CLIENT_FOLDERS, docPeopleFindings, docCredentialFindings, docDataFindings and
// successClaims; ow-uat's PUBLISHED_TEST_CARDS; ow-tools' parseModel, checkFormula, FUNCTIONS, preflight and calc
// total. The clause rules of an approval (declines, conditions, hedges, relays, retractions) and the person-name rules
// are the family's shared modules (scripts/lib/approval-grammar.mjs and scripts/lib/people-rules.mjs, also used by
// ow-draft and ow-handoff); nothing is copied from them. The closed-screen and addressed-text rules below, and the
// closed questions' exact answer shapes, are this skill's own (Blockers 1 of the contract); ow-draft's own
// approvalProblem and closedScreenProblems are not imported because the question formats differ.
//
//   node scripts/ow-vendor-eval-acceptance.mjs                        # every case against its golden run
//   node scripts/ow-vendor-eval-acceptance.mjs <case> <run-dir>       # one case against a real run
//   node scripts/ow-vendor-eval-acceptance.mjs --prepare <case> <dir> # set up a folder to run the skill in
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";
import { matter } from "./lib/frontmatter.mjs";
import { familyNameRules } from "./check-skill-contracts.mjs";
import { loadCatalogs } from "./lib/catalogs.mjs";
import { approvedClause, hedged, laterIn } from "./lib/approval-grammar.mjs";
import { makePeopleFindings, NON_NAME_WORDS, recordWords } from "./lib/people-rules.mjs";
import { ourSideFindings, figuresIn, isRound, ROUND_MATCH, internalFigures, parseFindings, credentialFindings, runView as researchRunView } from "./ow-research-acceptance.mjs";
import { otherWorkstreams, otherClientMatchers, otherClientFindings, NON_CLIENT_FOLDERS, docPeopleFindings, GIVEN_NAMES, docCredentialFindings, docDataFindings, successClaims, shippedTextProblems as docShippedText } from "./ow-documentation-acceptance.mjs";
import { PUBLISHED_TEST_CARDS } from "./ow-uat-acceptance.mjs";
import { runView as planRunView } from "./ow-build-plan-acceptance.mjs";
import { parseModel, checkFormula, FUNCTIONS } from "../plugins/ow-tools/lib/xlsx.mjs";
import { preflight } from "../plugins/ow-tools/lib/preflight.mjs";
import { total as calcTotal } from "../plugins/ow-tools/lib/calc.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const FIXTURES = join(ROOT, "tests", "fixtures", "ow-vendor-eval");
export const SKILL = join(ROOT, "skills-work", "ow-vendor-eval");
const EDGES = join(SKILL, "skill.edges.yaml");
const OW = "opchain-work/";
export const VERSION = "1.0.0";
export const PROTOCOL_NOTE = "This is a working note made by an AI assistant at your instruction. It is not a signature or an official record.";
export const SELF_CHECK_PREFIX = "Self-checks (same-session self-check, not an independent review):";
export const CHECKS_ORDER = ["Criteria first", "Evidence per score", "Numbers", "Conflicts disclosed", "Formal: no evaluation", "Not a bidder", "No internal numbers", "No credentials", "No private names"];
export const NEVER_WAIVED = ["Conflicts disclosed", "Formal: no evaluation", "Not a bidder", "No credentials", "No private names"];
/** Where each check runs, per key (references/self-checks.md §1); a test holds it to the reference's table. */
export const RUNS_IN = {
  "/ow-vendor-eval-scope (commercial)": ["Conflicts disclosed", "No credentials", "No private names"],
  "/ow-vendor-eval-scope (formal)": ["Conflicts disclosed", "No credentials", "No private names"],
  "/ow-vendor-eval-scope --revise": ["Conflicts disclosed", "No credentials", "No private names"],
  "/ow-vendor-eval-longlist": ["No credentials", "No private names"],
  "/ow-vendor-eval-evidence": ["No internal numbers", "No credentials", "No private names"],
  "/ow-vendor-eval-score": ["Criteria first", "Evidence per score", "Numbers", "Conflicts disclosed", "No credentials", "No private names"],
  "/ow-vendor-eval-recommend": ["Criteria first", "Numbers", "Conflicts disclosed", "No internal numbers", "No credentials", "No private names"],
  "/ow-vendor-eval-recommend --waive": ["Criteria first", "Numbers", "Conflicts disclosed", "No internal numbers", "No credentials", "No private names"],
  "/ow-vendor-eval-decide": ["No credentials", "No private names"],
  "/ow-vendor-eval-formal": ["Formal: no evaluation", "Not a bidder", "No internal numbers", "No credentials", "No private names"],
  "/ow-vendor-eval-formal --clarification": ["Formal: no evaluation", "No internal numbers", "No credentials", "No private names"],
  "/ow-vendor-eval-formal --responses": ["Formal: no evaluation", "Conflicts disclosed", "No internal numbers", "No credentials", "No private names"],
};
/** D2 (design §11, OW-10's reads row at b58439b8, contract O10): ow-draft's nine field strings, and where each sits in recommendation.md. */
export const D2_FIELDS = ["decision", "vendor", "runner-up", "knock-outs", "score table", "cost", "risks", "what to confirm", "conflicts statement"];
export const D2_HEADINGS = ["Decision", "Runner-up", "Knock-outs", "Score table", "Cost", "Risks", "What to confirm", "Conflicts statement"];
export const D2_PLACE = { decision: "## Decision", vendor: "Recommended vendor:", "runner-up": "## Runner-up", "knock-outs": "## Knock-outs", "score table": "## Score table", cost: "## Cost", risks: "## Risks", "what to confirm": "## What to confirm", "conflicts statement": "## Conflicts statement" };
export const NO_PAGE = "no page reference located (the panel checks)";
export const NONE_LINE = (user, date) => `No relationships with the vendors considered (stated by ${user} on ${date}).`;
export const NOT_COPIED = "[credential-shaped text not copied]";

// ── small helpers ────────────────────────────────────────────────────────────

const reason = (e) => String(e?.message ?? e).split("\n")[0].trim();
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const asList = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
export const sha256 = (text) => `sha256:${createHash("sha256").update(text).digest("hex")}`;
const iso = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? v : String(v).trim());
export const slugOf = (s) => String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const E = (key) => `${OW}vendor-eval/${key.ws}/${key.eval}`;
const short = (rel) => String(rel).replace(/^opchain-work\//, "");
const TEXT = /\.(md|ya?ml|txt|json|csv|log)$/;

export function loadKey(caseDir) {
  const key = yaml.load(readFileSync(join(caseDir, "answer-key.yaml"), "utf8"));
  if (!key || typeof key !== "object" || Array.isArray(key)) throw new Error("the answer key is not a map");
  return key;
}
function walk(dir, base = dir) {
  if (!existsSync(dir) || !lstatSync(dir).isDirectory()) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() && !e.isSymbolicLink() ? walk(p, base) : [relative(base, p).split("\\").join("/")];
  });
}

/** Sections at `##`: [{ title, text }], in order (a title may repeat: the caller decides whether that is wrong). */
export function sectionsOf(content) {
  const out = [];
  let cur = null;
  for (const line of String(content ?? "").split("\n")) {
    const h = line.match(/^##[ \t]+(.+?)[ \t]*$/);
    if (h && !line.startsWith("###")) { cur = { title: h[1], lines: [] }; out.push(cur); continue; }
    if (cur) cur.lines.push(line);
  }
  return out.map((s) => ({ title: s.title, text: s.lines.join("\n") }));
}
export const sectionOf = (content, name) => sectionsOf(content).find((s) => s.title === name)?.text ?? null;
/** A Markdown table's rows, keyed by its lower-cased header. */
export function tableRows(text) {
  const lines = String(text ?? "").split("\n").filter((l) => /^\s*\|/.test(l));
  if (lines.length < 2) return [];
  const cells = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  const head = cells(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).filter((l) => !/^\s*\|\s*-/.test(l)).map((l) => Object.fromEntries(cells(l).map((v, i) => [head[i] ?? `c${i}`, v])));
}
/** `### <id>` blocks with `- key: value` lines: Map id → { id, keys, text }. */
export function idBlocks(content, idRe) {
  const out = new Map();
  let cur = null;
  for (const line of String(content ?? "").split("\n")) {
    const h = line.match(/^###\s+(\S+)\s*$/);
    if (h) { cur = idRe.test(h[1]) ? { id: h[1], keys: {}, text: "" } : null; if (cur) { if (out.has(cur.id)) cur.duplicate = true; out.set(cur.id, cur); } continue; }
    if (/^##?\s/.test(line)) { cur = null; continue; }
    if (!cur) continue;
    cur.text += `${line}\n`;
    const kv = line.match(/^-\s+([a-z][a-z ]*):\s*(.*)$/i);
    if (kv) cur.keys[kv[1].trim().toLowerCase()] = kv[2].trim();
  }
  return out;
}
/** The text inside the ow:internal markers, and the rest. */
export function internalSplit(content) {
  const t = String(content ?? "");
  const a = t.indexOf("<!-- ow:internal -->"), z = t.indexOf("<!-- ow:end-internal -->");
  if (a < 0) return { client: t, internal: "" };
  return { client: t.slice(0, a) + (z > a ? t.slice(z + "<!-- ow:end-internal -->".length) : ""), internal: z > a ? t.slice(a + 20, z) : t.slice(a + 20) };
}
/** The client form of a recommendation: no header, no internal part (the banner, a body line, kept). */
export const clientFormOf = (text) => `${internalSplit(matter(String(text)).content).client.replace(/^\n+/, "").replace(/\s+$/, "")}\n`;
/** `## Runs` lines: [{ key, vendor, step, date, line }]. */
export function runsOf(text) {
  const sec = sectionOf(String(text ?? ""), "Runs") ?? "";
  return sec.split("\n").map((l) => l.match(/^-\s+(\/ow-vendor-eval[a-z-]*(?: --[a-z]+)?(?: \((?:commercial|formal)\))?)(?: ([a-z0-9-]+))? · ([a-z]+) · (\d{4}-\d{2}-\d{2})\s*$/)).filter(Boolean).map((m) => ({ key: m[1], vendor: m[2] ?? null, step: m[3], date: m[4], line: m[0] }));
}

// ── the step table (references/routing-and-resume.md §2) ─────────────────────

export function stepTable(text = readFileSync(join(SKILL, "references", "routing-and-resume.md"), "utf8")) {
  const sec = text.slice(text.indexOf("## 2. The step table"), text.indexOf("## 3."));
  const out = {};
  for (const row of tableRows(sec)) {
    const steps = [...String(row["steps, in order"] ?? "").matchAll(/`([a-z]+)`/g)].map((m) => m[1]);
    for (const k of [...String(row.key ?? "").matchAll(/`([^`]+)`/g)].map((m) => m[1])) {
      const mode = /\((commercial|formal)\)/.exec(row.key)?.[1];
      const base = k.replace(/ <[^>]+>|…/g, "").replace(/ --waive.*$/, " --waive").trim();
      out[mode ? `${base} (${mode})` : base] = steps;
    }
  }
  return out;
}
export const STEPS = stepTable();
/** Every step name used in the phase files' "Steps:" lines is in the table, and every key is a declared verb or mode (C22). */
export function stepNameProblems(skillDir = SKILL) {
  const p = [];
  const table = stepTable(readFileSync(join(skillDir, "references", "routing-and-resume.md"), "utf8"));
  const all = new Set(Object.values(table).flat());
  const commands = String(matter(readFileSync(join(skillDir, "SKILL.md"), "utf8")).data?.metadata?.commands ?? "").split(/\s+/);
  for (const k of Object.keys(table)) {
    const verb = k.split(" ")[0];
    if (!commands.includes(verb)) p.push(`step table key ${k}: ${verb} is not a declared verb`);
    const mode = k.match(/ (--[a-z]+)/)?.[1];
    if (mode && !readFileSync(join(skillDir, "SKILL.md"), "utf8").includes(`${verb} ${mode}`)) p.push(`step table key ${k}: ${mode} is not a mode the body documents`);
  }
  for (const f of readdirSync(join(skillDir, "references")).filter((n) => /^phase-.*\.md$/.test(n))) {
    const text = readFileSync(join(skillDir, "references", f), "utf8");
    for (const line of text.split("\n").filter((l) => /\bSteps?\b[^.]*:/.test(l) && /`[a-z]+`/.test(l))) {
      for (const m of line.matchAll(/`([a-z]+)`/g)) if (!all.has(m[1]) && !/^(?:commercial|formal|mode)$/.test(m[1]) ) p.push(`references/${f}: step "${m[1]}" is not in the step table`);
    }
  }
  return p;
}

// ── layering: this skill's cases, the invented worlds, and the family's goldens ──

function owner(caseName, seen = new Set()) {
  if (seen.has(caseName)) throw new Error(`run cycle at ${caseName}`);
  seen.add(caseName);
  const key = loadKey(join(FIXTURES, caseName));
  return typeof key.run === "string" ? owner(key.run, seen) : caseName;
}
/** This skill's layers under a case, newest first, the worlds its chain names, and the upstream goldens. */
function chain(caseName, seen = new Set()) {
  if (seen.has(caseName)) throw new Error(`base cycle at ${caseName}`);
  seen.add(caseName);
  const dir = join(FIXTURES, caseName);
  const key = loadKey(dir);
  const layers = [{ dir: join(dir, "input"), mount: "" }, { dir: join(dir, "session"), mount: "session/", session: true }];
  const worlds = asList(key.world).map(String);
  const up = { plan: key.plan_case ?? null, research: asList(key.research_case).map(String) };
  if (key.base) {
    const b = chain(key.base, seen);
    layers.push({ dir: join(FIXTURES, key.base, "expected"), mount: "", golden: true }, ...b.layers.filter((l) => !l.session));
    for (const w of b.worlds) if (!worlds.includes(w)) worlds.push(w);
    up.plan ??= b.up.plan;
    for (const r of b.up.research) if (!up.research.includes(r)) up.research.push(r);
  }
  return { layers, worlds, up };
}
const fileIn = (l, rel) => {
  if (l.golden && (rel === "printed.md" || rel.startsWith("session/"))) return null;
  if (!rel.startsWith(l.mount)) return null;
  const p = join(l.dir, rel.slice(l.mount.length));
  return existsSync(p) ? p : null;
};
const UPSTREAM = new Map();
const upstreamView = (kind, name) => {
  const k = `${kind}:${name}`;
  if (!UPSTREAM.has(k)) UPSTREAM.set(k, kind === "plan" ? planRunView(name) : researchRunView(name));
  return UPSTREAM.get(k);
};

/**
 * A view of a run: read(rel) finds a root-relative file (opchain-work/…, printed.md, session/…) in the run, the layers
 * under it, the worlds, then the upstream goldens (ow-build-plan's and ow-research's runs); written() lists what this
 * run wrote. A real run is read by difference: a file counts as written when it is new or differs from the start.
 */
export function runView(caseName, runDir = null) {
  const home = owner(caseName);
  const { layers: own, worlds, up } = chain(home);
  const prior = [...own, ...worlds.map((w) => ({ dir: join(FIXTURES, "worlds", w), mount: "" }))];
  const runLayer = runDir ? { dir: runDir, mount: "" } : { dir: join(FIXTURES, home, "expected"), mount: "" };
  const ups = [...(up.plan ? [upstreamView("plan", up.plan)] : []), ...up.research.map((r) => upstreamView("research", r))];
  const upRead = (rel) => {
    if (!rel.startsWith(OW)) return null;
    for (const [i, v] of ups.entries()) { const t = i === 0 && up.plan ? v.read(short(rel)) : v.read(rel); if (t != null) return t; }
    return null;
  };
  const upAll = () => ups.flatMap((v, i) => v.all().map((r) => (i === 0 && up.plan ? `${OW}${r}` : r)));
  const find = (ls, rel) => { for (const l of ls) { const p = fileIn(l, rel); if (p) return p; } return null; };
  const readFrom = (ls, rel) => {
    const p = find(ls, rel);
    if (p) {
      if (statSync(p).isDirectory()) throw new Error(`${short(rel)} is a folder, not a file`);
      return readFileSync(p, "utf8");
    }
    return upRead(rel);
  };
  const listOf = (ls) => { const s = new Set(); for (const l of ls) for (const r of walk(l.dir)) if (!(l.golden && (r === "printed.md" || r.startsWith("session/")))) s.add(l.mount + r); for (const r of upAll()) s.add(r); return [...s].sort(); };
  const cache = new Map(), pcache = new Map();
  const read = (rel) => { if (!cache.has(rel)) cache.set(rel, readFrom([runLayer, ...prior], rel)); return cache.get(rel); };
  const priorRead = (rel) => { if (!pcache.has(rel)) pcache.set(rel, readFrom(prior, rel)); return pcache.get(rel); };
  const ours = (r) => r !== "printed.md" && !r.startsWith("session/");
  let written = null;
  const writtenFiles = () => {
    const files = walk(runLayer.dir).filter(ours);
    if (!runDir) return files.sort();
    return files.filter((r) => { const b = find(prior, r); const now = join(runDir, r); if (!b) return upRead(r) == null || upRead(r) !== readFileSync(now, "utf8"); return !readFileSync(b).equals(readFileSync(now)); }).sort();
  };
  return {
    home,
    read, priorRead,
    buffer: (rel) => { const p = find([runLayer, ...prior], rel); return p ? readFileSync(p) : null; },
    exists: (rel) => read(rel) != null,
    priorExists: (rel) => priorRead(rel) != null,
    all: () => listOf([runLayer, ...prior]),
    priorAll: () => listOf(prior),
    written: () => [...(written ??= writtenFiles())],
    printed: () => { const p = fileIn(runLayer, "printed.md"); if (p && statSync(p).isDirectory()) throw new Error("printed.md is a folder"); return p ? readFileSync(p, "utf8") : null; },
    turns: () => String(readFrom([runLayer, ...prior.filter((l) => l.session)], "session/turns.md") ?? "").split("\n").filter((l) => /^-\s/.test(l)).map((l) => l.replace(/^-\s+/, "").trim()),
    realRun: Boolean(runDir),
  };
}
const priorView = (run) => ({ ...run, read: run.priorRead, exists: run.priorExists, all: run.priorAll });

/** Parse a Markdown file's header once; throws a one-line reason the calling check reports. */
function md(view, rel) {
  const text = view.read(rel);
  if (text == null) throw new Error(`${short(rel)} was not written`);
  if (/\u0000/.test(text)) throw new Error(`${short(rel)}: a binary file`);
  let m;
  try { m = matter(text); } catch (e) { throw new Error(`${short(rel)}: header is not valid YAML (${reason(e)})`); }
  if (m.data == null || typeof m.data !== "object" || Array.isArray(m.data)) throw new Error(`${short(rel)}: the header is not a map`);
  return { ...m, text };
}
const tryMd = (view, rel) => { try { return view.read(rel) == null ? null : md(view, rel); } catch { return null; } };
function json(view, rel) {
  const text = view.read(rel);
  if (text == null) throw new Error(`${short(rel)} was not written`);
  try { return JSON.parse(text); } catch (e) { throw new Error(`${short(rel)}: not JSON (${reason(e)})`); }
}

// ── the evaluation's files ───────────────────────────────────────────────────

/** scope.md: header, criteria (CR-nn → { name, weight }), must-haves, requirements, revisions. */
export function scopeOf(view, key) {
  const { data, content, text } = md(view, `${E(key)}/scope.md`);
  const criteria = new Map();
  for (const r of tableRows(sectionOf(content, "Criteria"))) if (/^CR-\d+$/.test(r.id ?? "")) {
    if (!/^\d+$/.test(String(r.weight ?? ""))) throw new Error(`scope.md: the weight of ${r.id} is not a whole number ("${r.weight}")`);
    criteria.set(r.id, { name: r.criterion, weight: Number(r.weight) });
  }
  const list = (name, re) => (sectionOf(content, name) ?? "").split("\n").map((l) => l.match(re)).filter(Boolean);
  const requirements = list("Requirements", /^-\s+(RQ-\d+)\s+(.+?)\s+\((from [^)]+|user-stated \d{4}-\d{2}-\d{2})\)\s*$/).map((m) => ({ id: m[1], text: m[2], source: m[3], line: m[0] }));
  const mustHaves = list("Must-haves", /^-\s+(MH-\d+)\s+(.+?)\s*$/).map((m) => ({ id: m[1], text: m[2] }));
  const revisions = sectionsOf(content).filter((s) => /^Revision \d+ \d{4}-\d{2}-\d{2}$/.test(s.title)).map((s) => ({ n: Number(s.title.split(" ")[1]), date: s.title.split(" ")[2], text: s.text }));
  return { data, content, text, mode: data.mode, criteria, requirements, mustHaves, revisions, rawRequirements: sectionOf(content, "Requirements") ?? "" };
}
/** The weights of record: the newest revision's criteria set, else the scope's. */
export function weightsOf(view, key) {
  const s = scopeOf(view, key);
  const rev = s.revisions.at(-1);
  if (rev) {
    const items = json(view, `${E(key)}/calc/criteria-set-REV-${rev.n}.json`);
    return new Map(items.filter((i) => /^CR-\d+/.test(i.label)).map((i) => [i.label.split(" ")[0], Number(i.unit_price)]));
  }
  return new Map([...s.criteria].map(([id, c]) => [id, c.weight]));
}
/** The persisted file id wins; old captures without the column retain their original first-word paths. */
export const vendorFileId = (row) => String(row.file_id || vendorSlug(row.vendor));
export function nextVendorFileId(vendor, candidateId, used) {
  const base = vendorSlug(vendor);
  if (!used.has(base)) return base;
  const suffix = `${base}-${String(candidateId).toLowerCase()}`;
  let id = suffix, n = 2;
  while (used.has(id)) id = `${suffix}-${n++}`;
  return id;
}
/** longlist.md rows: [{ id, vendor, slug, source, relationship, knockout }]. */
export function longlistOf(view, key) {
  const { content } = md(view, `${E(key)}/longlist.md`);
  const rows = tableRows(content.split("\n## ")[0]);
  return rows.map((r) => {
    if (!("relationship" in r) || !("knock-out" in r)) throw new Error("longlist.md: a row is missing the relationship or knock-out column");
    return { id: r.id, vendor: r.vendor, slug: vendorFileId(r), fileIdRecorded: Boolean(r.file_id), source: r.source, relationship: r.relationship, knockout: r["knock-out"] };
  });
}
/** Legacy filename base; new longlist rows persist a collision-safe file_id. */
export const vendorSlug = (name) => slugOf(String(name).replace(/\s*\(.*$/, "").split(/\s+/)[0]);
export const stillIn = (rows) => rows.filter((r) => !/^out\b/.test(r.knockout));
/** vendors/<slug>.md facts: Map VF-nn → keys. */
export function vendorFacts(view, key, slug) {
  const { data, content } = md(view, `${E(key)}/vendors/${slug}.md`);
  const facts = idBlocks(sectionOf(content, "Facts") ?? "", /^VF-\d+$/);
  for (const f of facts.values()) if (!f.keys.fact || !f.keys.level || !f.keys.source) throw new Error(`vendors/${slug}.md: ${f.id} is truncated (fact, source or level missing)`);
  return { data, content, facts };
}
/** The next identity counts every completed score table, independent of criteria revisions. */
export function nextScoreRunId(scoreText) {
  const sections = sectionsOf(matter(scoreText).content);
  const n = sections.filter((s) => s.title === "Scores" || /^After revision \d+$|^Re-score S-\d+$/.test(s.title)).length + 1;
  return `S-${String(n).padStart(2, "0")}`;
}
/** scores.md: the newest score table, as vendor → CR-nn → { score, cites, low }. */
export function scoresOf(view, key) {
  const { content, text } = md(view, `${E(key)}/scores.md`);
  const secs = sectionsOf(content);
  const titles = secs.map((s) => s.title);
  const dup = titles.find((t, i) => titles.indexOf(t) !== i);
  if (dup) throw new Error(`scores.md: the section "## ${dup}" appears twice`);
  const after = secs.filter((s) => /^After revision \d+$|^Re-score S-\d+$/.test(s.title)).at(-1);
  const scoreRun = after?.title.match(/^Re-score (S-\d+)$/)?.[1] ?? null;
  const tableText = after ? after.text : sectionOf(content, "Scores") ?? "";
  const scores = new Map();
  for (const r of tableRows(tableText)) {
    const vendor = r.vendor;
    const m = new Map();
    for (const [k, v] of Object.entries(r)) {
      const id = k.toUpperCase();
      if (!/^CR-\d+$/.test(id)) continue;
      const s = String(v).match(/^(\d+)\s*\(([^)]*)\)(\s*LOW only)?\s*$/);
      m.set(id, s ? { score: Number(s[1]), cites: [...s[2].matchAll(/VF-\d+/g)].map((x) => x[0]), levels: [...s[2].matchAll(/\b(HIGH|MEDIUM|LOW)\b/g)].map((x) => x[1]), low: Boolean(s[3]), raw: v } : { score: NaN, cites: [], levels: [], low: false, raw: v });
    }
    scores.set(vendor, m);
  }
  const totals = new Map();
  for (const l of (after ? after.text : sectionOf(content, "Totals") ?? "").split("\n")) {
    const t = l.match(/^-\s+(.+?): ([\d.]+) points, not money/);
    if (t) totals.set(t[1], Number(t[2]));
  }
  if (after && !scoreRun) for (const l of (sectionOf(content, "Totals") ?? "").split("\n")) { const t = l.match(/^-\s+(.+?): ([\d.]+) points, not money/); if (t && !totals.has(t[1])) totals.set(t[1], Number(t[2])); }
  return { content, text, scores, totals, after: Boolean(after), scoreRun, rawTotals: after?.text ?? sectionOf(content, "Totals") ?? "" };
}
/** cost.md: vendor → { price, currency, dated, source, months, seats, cost, command, output }. */
export function costOf(view, key) {
  const { content } = md(view, `${E(key)}/cost.md`);
  const out = new Map();
  for (const s of sectionsOf(content)) {
    if (/^(?:Runs|Self-checks|Possible embedded instructions)/.test(s.title)) continue;
    const price = s.text.match(/^-\s+price: ([\d.]+) ([A-Z]{3}) per seat per month, as (published|quoted by the vendor) on (\d{4}-\d{2}-\d{2}) \(([^)]+)\)\s*$/m);
    const hz = s.text.match(/^-\s+horizon: (\d+) months × (\d+) seats\s*$/m);
    const cost = s.text.match(/^-\s+cost over the horizon: ([\d.]+) ([A-Z]{3})\s*$/m);
    const rerun = s.title.match(/^Re-score (S-\d+): (.+)$/);
    const name = rerun?.[2] ?? s.title;
    out.set(name, { price: price ? Number(price[1]) : null, currency: price?.[2], how: price?.[3], dated: price?.[4], source: price?.[5], months: hz ? Number(hz[1]) : null, seats: hz ? Number(hz[2]) : null, cost: cost ? Number(cost[1]) : null, text: s.text, scoreRun: rerun?.[1] ?? null });
  }
  return out;
}
export function recommendationOf(view, key) {
  const r = md(view, `${E(key)}/recommendation.md`);
  const { client, internal } = internalSplit(r.content);
  return { ...r, client, internal, sections: sectionsOf(client) };
}
/** findings.md of a research topic, parsed by ow-research's own reader. */
export function findingsAt(view, rel) {
  const text = view.read(rel);
  if (text == null) return null;
  const f = parseFindings(text, short(rel));
  const open = !f.hasSelfChecks || f.selfChecks.some((r) => /^FINDING\b/.test(r.result));
  return { ...f, open, text };
}
/** Every findings.md a citation names, by its research path. */
const researchPath = (src) => (String(src).match(/research\/[a-z0-9-]+\/RS-\d+-[a-z0-9-]+\/findings\.md/) ?? [])[0] ?? null;

// ── the session: questions printed, answers given (C21) ──────────────────────

/** The printed questions in order, each paired with the user's answer (the next turn). */
export function questionAnswers(view) {
  const qs = String(view.printed() ?? "").split("\n").filter((l) => /^Question: /.test(l));
  const turns = view.turns();
  return qs.map((q, i) => ({ q, a: turns[i] ?? null }));
}
const RELAY = /\b(?:says?|said|wrote|writes|email(?:ed)?|e-mail|told|tells|per (?:the|their|his|her)|according to|already|note says|letter|inbox\/|the client's note|they (?:agreed|said|chose|went)|as the client)\b/i;
/**
 * An answer graded on what it answers (C21): `kind` is the closed question's kind. Returns { ok, decision, problems }:
 * a bare yes confirms exactly what was printed (a yes/no question), an agreement or a choice needs "yes <date>", a
 * decline ("no", "no: …") is an answer recorded as a decline, a relayed line is never an answer.
 */
export function approvalAnswer(answer, kind, want = {}) {
  const a = String(answer ?? "").trim();
  const p = [];
  if (!a) return { ok: false, decision: null, problems: ["no answer in this session"] };
  if (/^no(?::\s*.+)?$/i.test(a) && ["agree", "choose", "demo"].includes(kind)) return { ok: true, decision: "no", problems: [] };
  if (kind === "agree" || kind === "choose") {
    // "yes <date>": the case and a final full stop are free; anything else after the date declines.
    const m = a.match(/^yes (\d{4}-\d{2}-\d{2})\.?$/i);
    if (!m) p.push(`"${a.slice(0, 50)}" is not the answer the closed question asks for (yes <date> / no)`);
    else if (want.date && m[1] !== want.date) p.push(`the answer's date ${m[1]} is not the recorded ${want.date}`);
    return { ok: !p.length, decision: p.length ? null : "yes", date: m?.[1], problems: p };
  }
  if (kind === "demo") return /^yes$/i.test(a) ? { ok: true, decision: "yes", problems: [] } : { ok: false, decision: null, problems: [`"${a}" does not answer yes or no`] };
  if (kind === "relationship") {
    if (/^none$/i.test(a)) return { ok: true, decision: "none", problems: [] };
    const m = a.match(/^yes: (.+)$/i);
    if (m && !RELAY.test(m[1])) return { ok: true, decision: "yes", kind: m[1].trim(), problems: [] };
    return { ok: false, decision: null, problems: [`"${a.slice(0, 50)}" is not the user's own relationship answer (none / yes: <kind>)`] };
  }
  if (kind === "bidder") {
    // The statement is the whole answer: "I am not a bidder on <the procurement>", then at most one first-person clause
    // ("and I advise the town only"). A tail that keeps the door open ("and I may bid later", "unless the deadline moves",
    // "if the panel agrees", "but Pat is") or takes it back ("but wait") is not the statement; this check is never waived.
    const notIt = { ok: false, decision: null, problems: [`"${a.slice(0, 60)}" is not a first-person not-a-bidder statement in this session`] };
    const head = String.raw`^I(?: am|'m|’m) not a bidder (?:on|in|for) `;
    const m = want.procurement
      ? a.match(new RegExp(`${head}${want.procurement.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])(.*)$`, "s"))
      : a.match(new RegExp(`${head}(.+?)(?=[,.;]|\\s+(?:and|but|unless|if|when|once|until|till|while|although|though|as|so|or)\\b|$)(.*)$`, "s"));
    if (!m && want.procurement && new RegExp(head).test(a)) return { ok: false, decision: null, problems: [`the statement does not name the procurement (${want.procurement})`] };
    if (!m || RELAY.test(a)) return notIt;
    const tail = m[m.length - 1].replace(/^\s*[,;]?\s*/, "").replace(/[.\s]+$/, "");
    if (tail) {
      if (!/^and\s+(?:I|I'm|I’m|I am|I have|I've|have|am|do not|don't)\b/i.test(tail)) return notIt;
      if (laterIn(tail, "handoff") || hedged(tail, "handoff") || (/\bbid(?:s|ding)?\b/i.test(tail) && !/\b(?:not|never|no)\b/i.test(tail))) return notIt;
    }
    if (!approvedClause(a, { profile: "handoff", verb: (c) => /\bnot a bidder\b/i.test(c), allowNo: true, relay: "none" })) return notIt;
    return { ok: true, decision: "yes", problems: [] };
  }
  if (kind === "waiver") {
    const m = a.match(/^waive (.+?) ((?:[\d.,]+%?|[\d.,]+x)(?:,\s*(?:[\d.,]+%?|[\d.,]+x))*) on (sha256:[0-9a-f]{64}): (.+)$/);
    if (!m) return { ok: false, decision: null, problems: [`the waiver "${a.slice(0, 60)}" does not name the check, each figure, the digest and the reason`] };
    if (NEVER_WAIVED.includes(m[1])) return { ok: false, decision: null, problems: [`${m[1]} can never be waived`] };
    return { ok: true, decision: "waive", check: m[1], figures: m[2].split(/,\s*/), digest: m[3], why: m[4], problems: [] };
  }
  if (kind === "figure") return /^(?:the vendor's|the client's|mine)$/i.test(a) ? { ok: true, decision: a.toLowerCase(), problems: [] } : { ok: false, decision: null, problems: [`"${a}" does not say whose figure it is`] };
  return { ok: false, decision: null, problems: [`unknown question kind ${kind}`] };
}
export const questionKind = (q) => (/agree (?:revision \d+ of )?criteria set/.test(q) ? "agree" : /choose .+\? \(yes <?\d|choose .+\? \(yes/.test(q) ? "choose" : /your own observation from the demo/.test(q) ? "demo" : /relationship with/.test(q) ? "relationship" : /not a bidder/.test(q) ? "bidder" : /equals one of your own figures/.test(q) ? "figure" : "other");

// ── the nets (C19, C20, C23, C24, C16) ───────────────────────────────────────

/** Ids and page references stripped before any number scan (C19). */
export const stripIds = (s) => String(s).replace(/\b(?:VE|RQ|MH|CR|K|VF|VQ|CL|F|S|P|Q|RS|WP|E|D|M)-\d+(?:\.\d+)?\b|\bREV-\d+\b|\bAC-\d+\.\d+\b|\bpp?\. ?\d+(?:\s*[–-]\s*\d+)?\b|\b\d{4}-\d{2}-\d{2}\b|sha256:[0-9a-f]+|\bVE-nn\b/g, " ");
/** Credentials (C20): the family's shapes, ow-documentation's wider rules, and the shapes a trial login takes in prose. */
export function veCredentialFindings(text) {
  const t = String(text ?? "").split(NOT_COPIED).join(" ");
  const out = [...docCredentialFindings(t)];
  for (const line of t.split("\n")) {
    const pw = line.match(/\b(?:password|passcode|pin)\b(?:\s+(?:is|was))?\s*[:=]?\s*(?!<|\[)([^\s"'`<>]*\d[^\s"'`<>]*)/i);
    if (pw && /[A-Za-z]/.test(pw[1]) && pw[1].length >= 6) out.push(["a password written out", `${pw[0].slice(0, 14)}…`]);
    const secret = line.match(/\b[A-Z][A-Z0-9_]*(?:SECRET|TOKEN|KEY|PASSWORD)[A-Z0-9_]*\s*=\s*(?![<$])(\S{8,})/);
    if (secret && !/^<.*>$/.test(secret[1])) out.push(["a secret setting with its value", `${secret[0].slice(0, 16)}…`]);
    const ba = line.match(/\bhttps?:\/\/[^\s/:@]+:[^\s/@]+@/i);
    if (ba) out.push(["a sign-in URL with its password", ba[0].replace(/:[^:@]+@$/, ":…@")]);
  }
  for (const card of String(t).match(/\b(?:\d[ -]?){13,19}\b/g) ?? []) {
    const digits = card.replace(/\D/g, "");
    if (digits.length >= 13 && !PUBLISHED_TEST_CARDS.has(digits) && luhn(digits)) out.push(["a card number", `${digits.slice(0, 4)}…`]);
  }
  return out;
}
const luhn = (d) => { let s = 0; for (let i = 0; i < d.length; i++) { let n = Number(d[d.length - 1 - i]); if (i % 2) { n *= 2; if (n > 9) n -= 9; } s += n; } return s % 10 === 0; };

/** Our figures (CD1): the price book, quote items, ledger and margin views and every ow:internal section, as values; plus conflicts.md's amounts. */
export function ourFiguresOf(view) {
  const files = view.all().filter((f) => f.startsWith(OW) && /(?:price-book\.yaml|quote-items\.json|ledger\.md|margin\.md|\.md)$/.test(f) && !/\/inbox\//.test(f) && !/^opchain-work\/research\//.test(f)).map((rel) => ({ rel, text: view.read(rel) ?? "" }));
  const f = internalFigures(files);
  const extra = [];
  for (const { rel, text } of files) if (/\/conflicts\.md$/.test(rel)) for (const x of figuresIn(internalSplit(text).internal)) extra.push(x);
  return { values: [...new Set([...f.values, ...extra.filter((x) => x.kind !== "percent").map((x) => x.value)])], percents: [...new Set([...f.percents, ...extra.filter((x) => x.kind === "percent").map((x) => x.value)])] };
}
/** The figures the user answered for ("figure: <n>, the vendor's (…)"), recorded anywhere in the evaluation. */
export function answeredFigures(view, key) {
  const out = new Map();
  for (const f of view.all().filter((x) => x.startsWith(`${E(key)}/`) && /\.md$/.test(x))) for (const m of String(view.read(f) ?? "").matchAll(/^-\s+figure: ([\d.,]+%?), (the vendor's|the client's|mine) \(/gm)) out.set(Number(m[1].replace(/[,%]/g, "")), m[2]);
  return out;
}
/** No internal numbers on one client output (C19): [{ what, hit }], ids and page references stripped first. */
export function internalNumberFindings(text, figures, { answered = new Map(), waived = [] } = {}) {
  const out = [];
  for (const line of String(text ?? "").split("\n")) {
    const t = stripIds(line);
    for (const [what, hit] of ourSideFindings(t, [], figures)) {
      const value = figuresIn(hit)[0]?.value ?? Number(String(hit).replace(/[^\d.]/g, ""));
      if (waived.some((w) => figuresIn(w)[0]?.value === value || Number(String(w).replace(/[^\d.]/g, "")) === value)) continue;
      const whose = answered.get(value);
      if (whose && whose !== "mine" && (what === ROUND_MATCH || what === "a figure from our own internal files")) continue;
      out.push({ what, hit, line: line.trim().slice(0, 80) });
    }
  }
  return out;
}

/** Text addressed to an assistant, or asking this run to act (C24): ADDRESSED's forms plus this domain's imperatives, never a feature table. */
export const ADDRESSED_VE = new RegExp([
  // an address with a colon, never as a table cell or a feature name ("AI: included", "Assistant: available on all tiers")
  "(?:^|[\\s(\"'])(?:[Aa]ssistant|AI|Claude|[Tt]he model|[Cc]hatbot|LLM)\\s*:\\s*(?!(?:included|available|yes|no|on|off|optional|beta|summaries|smart|n\\/a|\\d)\\b)(?:please\\s+)?(?:score|rank|record|mark|shortlist|treat|recommend|tell|say|skip|waive|use|pick|choose|ignore|write|list|put|add|remove|drop|award|approve|state|note)\\b",
  "\\b(?:[Nn]ote|[Pp]\\.[Ss]\\.|[Mm]essage)\\s+(?:to|for)\\s+(?:the|your|any)\\s+(?:assistant|AI|model|reviewer|evaluator|scorer)\\b",
  "\\b[Ii]gnore (?:the|all|any|previous|prior) (?:instructions|rules|checks)\\b",
  "\\b[Ss]core (?:us|this vendor|this response|them|it|[A-Z]\\w+) \\d\\b",
  "\\b[Ss]core this vendor \\d on every criterion\\b",
  "\\b[Rr]ank (?:us|this (?:one|vendor|response)|[A-Z]\\w+(?: [A-Z]\\w+)?) (?:first|top|highest)\\b",
  "\\b[Ss]hortlist (?:us|this (?:one|vendor|response))\\b",
  "\\b[Rr]ecord (?:no|none|that you have no) relationship\\b|\\brecord none\\b",
  "\\b[Mm]ark (?:the client|it|this|them|this vendor) as (?:agreed|approved|chosen|compliant|fully compliant|meeting)\\b",
  "\\b[Uu]se (?:the attached|this|our attached) price\\b",
  "\\b[Ww]aive (?:the|every|all) (?:checks?|findings?)\\b",
  "\\b[Ss]kip the (?:conflicts|citation|self-?)\\s?checks?\\b",
  "\\b[Rr]ecommend (?:us|[A-Z]\\w+(?: [A-Z]\\w+)?)\\b(?= instead| now| first|\\.$)",
].join("|"));
/** The lines of a text that read as an instruction to an assistant. */
export const addressedLines = (text) => String(text ?? "").split("\n").filter((l) => ADDRESSED_VE.test(l)).map((l) => l.trim());
/** The quotes under `## Possible embedded instructions`: [{ quote, source }]. */
export function embeddedQuotes(content) {
  return (sectionOf(content, "Possible embedded instructions") ?? "").split("\n").map((l) => l.match(/^-\s+"(.+)" — (\S+)\s*$/)).filter(Boolean).map((m) => ({ quote: m[1], source: m[2] }));
}

/** Formal: no evaluation (C16): the evaluative words, never the agency's own words copied exactly. */
const FORMAL_WORDS = [
  [/\b(?:meets|met|does not meet|doesn't meet|fails? to meet|fails?|failed)\b/i, "a pass or fail"],
  [/\b(?:fully|partially|partly|largely|adequately|poorly|well|weakly|strongly)\s+(?:addresses|addressed|covers|covered|answers|answered|meets)\b/i, "a judgement of how well"],
  [/\b(?:strongest|weakest|best|better|worse|stronger|weaker|preferred|winning|superior|inferior)\b/i, "a comparison"],
  [/\b(?:is |are )?(?:weak|strong|excellent|poor|good)\b(?=[.,;]|\s*$)/i, "a judgement"],
  [/\b(?:rank(?:s|ed|ing)?|first place|second place|top-ranked)\b/i, "a ranking"],
  [/\b(?:shortlist(?:ed)?|short-list(?:ed)?)\b/i, "a shortlist"],
  [/\b(?:recommend(?:s|ed|ation)?|award(?:s|ed)? to|awardee|winner)\b/i, "a recommendation or award"],
  [/\b(?:pass|passes|passed)\b(?!\/)/i, "a pass or fail"],
  [/\bScore\s*:|\bscored\b|\b\d\s*\/\s*5\b|\b[A-Z]\w+ \d(?:,| and) [A-Z]\w+ \d\b/i, "a score"],
  [/\bnot addressed\b|\bmissing\b|\bnot covered\b/i, "a judgement by omission"],
];
/** [{ what, line }] for a formal file's text, skipping lines that equal the agency's words (the comparator is the caller's). */
export function formalWordFindings(text, { agency = [] } = {}) {
  const out = [];
  for (const line of String(text ?? "").split("\n")) {
    const l = line.trim();
    // A screen's prescribed refusal and no-op lines are never a formal file's words (C32: a net never fails a prescribed line).
    if (!l || /^Ref,Requirement or criterion,Weight \(as given\),Score,Notes$/.test(l) || l === NO_PAGE || /^(?:Refused|Nothing to do|Question): /.test(l) || /^#/.test(l) && !/score|rank|recommend|shortlist/i.test(l)) continue;
    if (agency.some((a) => agencyWordsMatch(l, a))) continue;
    for (const [re, what] of FORMAL_WORDS) if (re.test(l)) { out.push({ what, line: l.slice(0, 80) }); break; }
  }
  return out;
}

/** A screen's free-worded claims (C23): ow-documentation's successClaims plus this skill's own success words. */
const SUCCESS_WORDS = /\b(?:written|saved|recorded|frozen|scored|ranked|recommended|exported|decided|agreed|approved|waived|sent|logged|done)\b|\bnow (?:in|holds?)\b|\bis noted\b|\bsigned off\b/i;
const NEGATED = /\b(?:not|no|never|nothing|until|before|unless|cannot|can't|isn't|aren't|won't|whether)\b/i;
export function screenClaims(line) {
  const out = [...successClaims(line)];
  const l = String(line).replace(/`[^`]*`/g, " ");
  for (const clause of l.split(/[.;:!?]+|\s+(?:but|and then)\s+/)) {
    const m = clause.match(SUCCESS_WORDS);
    if (m && !NEGATED.test(clause.slice(0, m.index)) && !/^\s*(?:Record|Run|Say|Agree|Score|Send|Write|Decide|Waive|Export)\b/.test(clause) && !out.includes(m[0])) out.push(m[0]);
  }
  if (/\b(?:looks?|seems?) (?:strongest|best|better|stronger)\b|\bstrongest\b/i.test(l)) out.push("an evaluative word");
  return out;
}

// ── comparators: each is called by a check, and the dead-comparator pin holds that (C13, C14) ──

/** The recommendation's score table against scores.md (and its totals). */
export function recommendationAgainstScores(rec, scores) {
  const p = [];
  const rows = tableRows(sectionOf(rec.client, "Score table"));
  if (!rows.length) return ["## Score table has no table"];
  for (const r of rows) {
    const s = scores.scores.get(r.vendor);
    if (!s) { p.push(`## Score table names ${r.vendor}, which scores.md does not score`); continue; }
    for (const [k, v] of Object.entries(r)) {
      const id = k.toUpperCase();
      if (/^CR-\d+$/.test(id)) {
        const want = s.get(id);
        const got = String(v).match(/^(\d+)/)?.[1];
        if (!want || Number(got) !== want.score) p.push(`## Score table: ${r.vendor} ${id} is ${v}; scores.md has ${want ? want.score : "no score"}`);
        if (want?.low && !/LOW only/.test(v)) p.push(`## Score table: ${r.vendor} ${id} rests only on LOW evidence and is not marked`);
      }
    }
    const tot = Object.entries(r).find(([k]) => /total/.test(k))?.[1];
    if (tot != null && Number(String(tot).replace(/[^\d.]/g, "")) !== scores.totals.get(r.vendor)) p.push(`## Score table: ${r.vendor}'s total ${tot} is not scores.md's ${scores.totals.get(r.vendor)}`);
  }
  for (const v of scores.scores.keys()) if (!rows.some((r) => r.vendor === v)) p.push(`## Score table leaves out ${v}, which scores.md scores`);
  return p;
}
/** The recommendation's cost section against cost.md. */
export function recommendationAgainstCost(rec, cost) {
  const p = [];
  const section = sectionOf(rec.client, "Cost") ?? "";
  const rows = tableRows(section);
  for (const [vendor, c] of cost) {
    const r = rows.find((x) => x.vendor === vendor);
    const line = section.split("\n").find((l) => l.trim().startsWith(`${vendor}:`));
    if (!r && !line) { p.push(`## Cost leaves out ${vendor}`); continue; }
    const value = r ? Object.entries(r).find(([k]) => /cost/.test(k))?.[1] : line.match(/\bcost over [^:]*:\s*([\d.]+)\s+[A-Z]{3}\b/i)?.[1];
    const got = value == null ? NaN : Number(String(value).replace(/[^\d.]/g, ""));
    if (got !== c.cost) p.push(`## Cost: ${vendor} is ${got}; cost.md has ${c.cost}`);
  }
  return p;
}
/** A weighted total against the ow-tools calc total of its items file. */
export function totalAgainstCalc(totalValue, items) {
  try {
    const out = calcTotal({ items: items.map((i) => ({ label: i.label, quantity: i.quantity, unit_price: String(i.unit_price) })), currency: "XXX" });
    return Number(out.total) === Number(totalValue) ? [] : [`the total ${totalValue} is not the calc output ${out.total}`];
  } catch (e) { return [`the items do not total: ${reason(e)}`]; }
}
/** A VF-nn copied from a finding against that F-nn: claim word for word, level unchanged, sources exactly. */
export function vfAgainstFinding(vf, finding) {
  const p = [];
  if (!finding) return [`${vf.id} cites a finding that is not under ## Findings`];
  if (String(vf.keys.fact) !== String(finding.fields.claim)) p.push(`${vf.id}'s fact is not ${finding.id}'s claim word for word`);
  if (String(vf.keys.level) !== String(finding.fields.level)) p.push(`${vf.id} is ${vf.keys.level}; ${finding.id} is ${finding.fields.level}`);
  if (String(vf.keys["from finding"] ?? "") !== String(finding.fields.sources)) p.push(`${vf.id}'s sources are not ${finding.id}'s exactly (URL, retrieved, class)`);
  return p;
}
/** A cost's price against its dated source (a finding's claim or an inbox file). */
export function costAgainstSource(c, sourceText) {
  if (sourceText == null) return [`the price's source (${c.source}) is not there`];
  const n = String(c.price.toFixed(2)).replace(/\.00$/, "");
  return new RegExp(`(?<![\\d.])${esc(n)}(?:\\.00)?(?![\\d])`).test(sourceText) ? [] : [`the price ${c.price} is not in its source ${c.source}`];
}
/** The export's client form against recommendation.md's client part. */
export const exportAgainstSource = (exportText, recText) => (String(exportText) === clientFormOf(recText) ? [] : ["the client form differs from recommendation.md's client part (header and internal part removed)"]);
/** A quoted vendor answer against its inbox file, word for word. */
export const quotedAnswerAgainstInbox = (quote, inboxText) => (inboxText != null && String(inboxText).replace(/\s+/g, " ").includes(String(quote).replace(/\s+/g, " ")) ? [] : [`"${String(quote).slice(0, 50)}" is not in its inbox file word for word`]);
/** A quoted embedded instruction against its source, word for word (credential-shaped text replaced first). */
export function embeddedQuoteAgainstSource(quote, sourceText) {
  if (sourceText == null) return ["its source is not there"];
  const flat = (s) => String(s).replace(/\s+/g, " ");
  const redacted = flat(sourceText).replace(/(password|pin|passcode)\s*[:=]?\s*\S+/gi, (m, w) => `${w}: ${NOT_COPIED}`);
  return flat(sourceText).includes(flat(quote)) || redacted.includes(flat(quote)) || flat(quote).includes(NOT_COPIED) && flat(quote).split(NOT_COPIED).every((part) => flat(sourceText).includes(part.trim())) ? [] : [`"${String(quote).slice(0, 50)}" is not in its source word for word`];
}
/** formal/requirements.md's text against the agency's document: each requirement and the method are in it word for word. */
export function requirementsAgainstSource(reqText, agencyText) {
  const p = [];
  const src = String(agencyText ?? "").replace(/\s+/g, " ");
  for (const l of String(reqText).split("\n")) {
    const m = l.match(/^-\s+(\S+): (.+?) \(([^,]+), p\. (\d+)\)\s*$/);
    if (m && !src.includes(m[2].trim())) p.push(`${m[1]}'s text is not the agency's word for word`);
  }
  for (const l of (sectionOf(reqText, "Evaluation criteria and method (as provided)") ?? "").split("\n").map((x) => x.trim()).filter((x) => x && !x.startsWith("|---") && !/^\|\s*-/.test(x))) {
    const words = l.replace(/^\|\s*|\s*\|$/g, "").split(/\s*\|\s*/).join(" ");
    if (!words.split(" ").every(Boolean) || !src.includes(l.replace(/^[-*]\s+/, "")) && !l.split(/\s*\|\s*/).filter(Boolean).every((c) => src.includes(c))) p.push(`the method line "${l.slice(0, 50)}" is not the agency's word for word`);
  }
  return p;
}
/** The agency's own words: a whole line (or sentence) of its document, its numbering and page reference set aside. */
const agencyForms = (s) => { const t = String(s).trim().replace(/^[-*]\s+/, "").replace(/\s*\((?:RFP|[A-Za-z ]+), p\. \d+\)(\.?)\s*$/, "$1").replace(/^(?:[A-Z]+-\d+|[A-Z]-\d+):\s*/, "").replace(/^Evaluation method \(as provided\):\s*/, "").trim(); return [t, t.replace(/\.$/, "")]; };
const AGENCY_CACHE = new Map();
const agencyLines = (text) => {
  if (!AGENCY_CACHE.has(text)) AGENCY_CACHE.set(text, new Set(String(text).split(/\n|(?<=\.)\s+/).flatMap((l) => agencyForms(l)).filter((l) => l.length >= 12)));
  return AGENCY_CACHE.get(text);
};
const agencyWordsMatch = (line, agencyText) => { const set = agencyLines(agencyText); return agencyForms(line).some((f) => f.length >= 12 && set.has(f)); };
/** The evaluator CSVs' weights against formal/requirements.md's weights. */
export function csvWeightsAgainstRequirements(csvText, reqText) {
  const p = [];
  const weights = new Map((sectionOf(reqText, "Evaluation criteria and method (as provided)") ? tableRows(sectionOf(reqText, "Evaluation criteria and method (as provided)")) : []).filter((r) => r.ref).map((r) => [r.ref, r.weight]));
  for (const line of String(csvText).split("\n").slice(1).filter((l) => l.trim())) {
    const cells = parseCsvLine(line);
    if (cells.length !== 5) { p.push(`a row has ${cells.length} cells, not 5 ("${line.slice(0, 40)}")`); continue; }
    const [ref, , w] = cells;
    if (weights.has(ref) && String(weights.get(ref)) !== String(w)) p.push(`${ref}'s weight is ${w}; formal/requirements.md gives ${weights.get(ref)}`);
  }
  return p;
}
/** The client's agreement against the criteria set: the digest it names is the criteria set's. */
export const agreementAgainstCriteria = (agreedDigest, criteriaBytes) => (criteriaBytes == null ? ["calc/criteria-set.json is not there"] : agreedDigest === sha256(criteriaBytes) ? [] : [`the agreement names ${String(agreedDigest).slice(0, 20)}…, not the criteria set's digest`]);
/** A waiver's digest against the client form it covers. */
export const waiverDigestAgainstClientForm = (digest, clientForm) => (clientForm == null ? ["the client form is not there"] : digest === sha256(clientForm) ? [] : [`the waiver names ${String(digest).slice(0, 20)}…, not the client form's digest`]);
/** decision.md's recommendation_sha256 against recommendation.md. */
export const decisionAgainstRecommendation = (digest, recText) => (recText == null ? ["recommendation.md is not there"] : digest === sha256(recText) ? [] : ["recommendation_sha256 is not recommendation.md's digest"]);
/** scores.md's weights (the totals items) against scope.md's weights of record. */
export function scoreWeightsAgainstScope(items, weights) {
  const p = [];
  for (const i of items) { const id = String(i.label).split(" ")[0]; if (weights.has(id) && Number(i.unit_price) !== weights.get(id)) p.push(`${id}'s weight is ${i.unit_price}; scope.md's is ${weights.get(id)}`); }
  for (const id of weights.keys()) if (!items.some((i) => String(i.label).startsWith(`${id} `))) p.push(`${id} has no item`);
  return p;
}
/** scope.md's vendor count against quick-scope.md's. */
export const vendorCountAgainstQuickScope = (count, quickScope) => { const n = Number((String(quickScope ?? "").match(/^-\s+count:\s*(\d+)\s*$/m) ?? [])[1]); return Number(count) === n ? [] : [`vendor_count ${count} is not quick-scope.md's count ${n}`]; };
/** The comparators the dead-comparator pin requires to be called (C13, C14). */
export const COMPARATORS = { recommendationAgainstScores, recommendationAgainstCost, totalAgainstCalc, vfAgainstFinding, costAgainstSource, exportAgainstSource, quotedAnswerAgainstInbox, embeddedQuoteAgainstSource, requirementsAgainstSource, csvWeightsAgainstRequirements, agreementAgainstCriteria, waiverDigestAgainstClientForm, decisionAgainstRecommendation, scoreWeightsAgainstScope, vendorCountAgainstQuickScope };

function parseCsvLine(line) {
  const out = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === ",") { out.push(cur); cur = ""; } else cur += c;
  }
  out.push(cur);
  return out;
}

// ── the writer of each file, pinned (C1) ─────────────────────────────────────

const V = "vendor-eval/<ws>/VE-nn-<slug>";
export const WRITER_PIN = [
  [`${V}/scope.md`, ["/ow-vendor-eval-scope", "/ow-vendor-eval-scope --revise"]],
  [`${V}/calc/criteria-set.json`, ["/ow-vendor-eval-scope"]],
  [`${V}/calc/criteria-set-REV-n.json`, ["/ow-vendor-eval-scope --revise"]],
  [`${V}/conflicts.md`, ["/ow-vendor-eval-scope"]],
  [`${V}/longlist.md`, ["/ow-vendor-eval-longlist"]],
  [`${V}/vendors/<vendor>.md`, ["/ow-vendor-eval-evidence"]],
  [`${V}/questions.md`, ["/ow-vendor-eval-evidence"]],
  [`${V}/scores.md`, ["/ow-vendor-eval-score"]],
  [`${V}/cost.md`, ["/ow-vendor-eval-score"]],
  [`${V}/calc/totals-<vendor>.json`, ["/ow-vendor-eval-score"]],
  [`${V}/calc/totals-<vendor>-REV-n.json`, ["/ow-vendor-eval-score"]],
  [`${V}/calc/totals-<vendor>-S-<n>.json`, ["/ow-vendor-eval-score"]],
  [`${V}/calc/cost-<vendor>.json`, ["/ow-vendor-eval-score"]],
  [`${V}/calc/cost-<vendor>-S-<n>.json`, ["/ow-vendor-eval-score"]],
  [`${V}/recommendation.md`, ["/ow-vendor-eval-recommend", "/ow-vendor-eval-recommend --waive"]],
  [`${V}/export/client/recommendation.md`, ["/ow-vendor-eval-recommend", "/ow-vendor-eval-recommend --waive"]],
  [`${V}/export/recommendation.pdf`, ["/ow-vendor-eval-recommend", "/ow-vendor-eval-recommend --waive"]],
  [`${V}/export/recommendation.docx`, ["/ow-vendor-eval-recommend", "/ow-vendor-eval-recommend --waive"]],
  [`${V}/export/recommendation.export.json`, ["/ow-vendor-eval-recommend", "/ow-vendor-eval-recommend --waive"]],
  [`${V}/export/markdown/recommendation.md`, ["/ow-vendor-eval-recommend", "/ow-vendor-eval-recommend --waive"]],
  [`${V}/decision.md`, ["/ow-vendor-eval-decide"]],
  [`${V}/formal/requirements.md`, ["/ow-vendor-eval-formal"]],
  [`${V}/formal/evaluation-workbook/evaluator-n.csv`, ["/ow-vendor-eval-formal"]],
  [`${V}/formal/evaluation-workbook/model.md`, ["/ow-vendor-eval-formal"]],
  [`${V}/formal/evaluation-workbook.xlsx`, ["/ow-vendor-eval-formal"]],
  [`${V}/formal/evaluation-workbook.export.json`, ["/ow-vendor-eval-formal"]],
  [`${V}/formal/clarifications.md`, ["/ow-vendor-eval-formal --clarification"]],
  [`${V}/formal/response-map.md`, ["/ow-vendor-eval-formal --responses"]],
];
const pinRe = (pattern) => new RegExp(`^${OW.replace("/", "\\/")}${pattern.split(/(<[^>]+>|VE-nn|REV-n|evaluator-n)/).map((x) => (x === "VE-nn" ? "VE-\\d+" : x === "REV-n" ? "REV-\\d+" : x === "evaluator-n" ? "evaluator-\\d+" : /^<[^>]+>$/.test(x) ? "[a-z0-9][a-z0-9-]*" : esc(x))).join("")}$`);
export function writerRows() { return WRITER_PIN.map(([p, verbs]) => ({ pattern: p, re: pinRe(p), verbs })); }
export const writersOf = (rel) => [...new Set(writerRows().filter((r) => r.re.test(rel)).flatMap((r) => r.verbs))];
/** skill.edges.yaml's writes against WRITER_PIN, both ways. */
export function edgesWriterDrift(edgesText = readFileSync(EDGES, "utf8")) {
  const p = [];
  const e = yaml.load(edgesText);
  const fromEdges = new Map();
  for (const w of e.writes ?? []) {
    if (w.append) continue;
    const verbs = [w.verb, ...asList(w.modes).map((m) => `${String(w.verb).split(" ")[0]} ${m}`)];
    fromEdges.set(w.path, [...new Set([...(fromEdges.get(w.path) ?? []), ...verbs])]);
  }
  for (const [path, verbs] of WRITER_PIN) {
    const got = fromEdges.get(path);
    if (!got) { p.push(`edges: ${path} has no writes row`); continue; }
    if ([...got].sort().join() !== [...verbs].sort().join()) p.push(`edges: ${path} is written by ${got.join(", ")}; the pin says ${verbs.join(", ")}`);
  }
  for (const path of fromEdges.keys()) if (!WRITER_PIN.some(([x]) => x === path)) p.push(`edges: ${path} is not in WRITER_PIN`);
  return p;
}
/** The fields each hand-off offers, pinned (D2's nine exactly; P6's decision row). */
export const HANDOFF_PIN = {
  "/ow-draft-evidence": { [`${V}/recommendation.md`]: D2_FIELDS },
  "/ow-build-plan-map": { [`${V}/decision.md`]: ["vendor", "decided_on", "decided_by", "the decision"] },
};
export function handoffFieldDrift(edgesText = readFileSync(EDGES, "utf8")) {
  const p = [];
  const e = yaml.load(edgesText);
  for (const [verb, files] of Object.entries(HANDOFF_PIN)) {
    const h = (e.hands_off ?? []).find((x) => x.verb === verb);
    if (!h) { p.push(`edges: no hand-off to ${verb}`); continue; }
    for (const [path, fields] of Object.entries(files)) {
      const f = asList(h.files).find((x) => (typeof x === "string" ? x : x.path) === path);
      if (!f || JSON.stringify(f.fields ?? []) !== JSON.stringify(fields)) p.push(`edges: the hand-off to ${verb} offers ${path} with ${JSON.stringify(f?.fields ?? null)}; the pin says ${JSON.stringify(fields)}`);
    }
  }
  return p;
}
/** The ow-draft reads row of OW-10 at b58439b8, pinned with its hash (Blockers 1): ow-draft's own file when it is on main, else this copy. */
export const D2_PIN_FILE = join(FIXTURES, "d2-reads-row.yaml");
export function d2ReadsRow() {
  const onMain = join(ROOT, "skills-work", "ow-draft", "skill.edges.yaml");
  if (existsSync(onMain)) {
    const row = (yaml.load(readFileSync(onMain, "utf8")).reads ?? []).find((r) => r.from === "ow-vendor-eval");
    return { source: "skills-work/ow-draft/skill.edges.yaml", row };
  }
  const pin = yaml.load(readFileSync(D2_PIN_FILE, "utf8"));
  return { source: "tests/fixtures/ow-vendor-eval/d2-reads-row.yaml (OW-10 at b58439b8)", row: pin.row, hash: pin.row_sha256 };
}
export const d2RowDigest = (row) => sha256(JSON.stringify(row));

let FAMILY = null;
/** The catalog's private and brand names (catalogs.json), as check-skill-contracts reads them: never written into this file. */
export const familyRules = () => (FAMILY ??= (() => { try { return familyNameRules(loadCatalogs({ root: ROOT }).find((c) => c.prefix === "ow-")); } catch { return []; } })());

// ── the checks ───────────────────────────────────────────────────────────────

const verbRoot = (k) => String(k).split(" ")[0];
const keyRoot = (key) => String(key.key ?? "").replace(/ \((?:commercial|formal)\)$/, "").replace(/ <[^>]+>/, "");
const WRITING = (key) => !key.writes_nothing && !key.refused && verbRoot(key.key) !== "/ow-vendor-eval";

function checkHeaders(key, run) {
  const p = [];
  const banner = handlingOf(run, key).banner;
  for (const rel of run.written().filter((r) => r.startsWith(`${E(key)}/`) && /\.md$/.test(r) && !/\/export\//.test(r))) {
    let m;
    try { m = md(run, rel); } catch (e) { p.push(reason(e)); continue; }
    const d = m.data;
    const name = /\/vendors\//.test(rel) ? "vendor" : /\/evaluation-workbook\//.test(rel) ? "workbook-model" : rel.split("/").pop().replace(/\.md$/, "");
    if (d.ow_artefact !== `ow-vendor-eval/${name}`) p.push(`${short(rel)}: ow_artefact is ${d.ow_artefact}, expected ow-vendor-eval/${name}`);
    if (String(d.schema) !== "1") p.push(`${short(rel)}: schema is ${d.schema}`);
    if (d.written_by !== `ow-vendor-eval ${VERSION} (protocol 1)`) p.push(`${short(rel)}: written_by is "${d.written_by}"`);
    if (d.workstream !== key.ws) p.push(`${short(rel)}: workstream is ${d.workstream}, expected ${key.ws}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso(d.created) ?? "")) p.push(`${short(rel)}: created is not a date`);
    if (!/^(tool|host-supplied|user-stated|assumed)$/.test(d.clock ?? "")) p.push(`${short(rel)}: clock "${d.clock}"`);
    if (d.origin !== "skill") p.push(`${short(rel)}: origin is ${d.origin}`);
    if (banner && m.content.replace(/^\n+/, "").split("\n")[0].trim() !== banner) p.push(`${short(rel)}: a handling level is set, so banner_text is its first line after the header`);
  }
  return p;
}

function checkWrites(key, run) {
  const p = [];
  const k = keyRoot(key);
  for (const rel of run.written()) {
    if (rel === `${OW}STATUS.md`) { if (!WRITING(key)) p.push("STATUS.md: a refusal, a no-op, a question or the list screen appends no line"); continue; }
    const writers = writersOf(rel);
    if (!writers.length) { p.push(`${short(rel)}: not a file ow-vendor-eval writes`); continue; }
    if (!WRITING(key)) { p.push(`${short(rel)}: written by a run that writes nothing (${key.key})`); continue; }
    if (!writers.includes(k)) p.push(`${short(rel)}: written in a run of ${k}; only ${writers.join(" or ")} writes it`);
    if (!rel.startsWith(`${E(key)}/`)) p.push(`${short(rel)}: written outside this evaluation's folder`);
  }
  return p;
}

/** Write-once (C22): every line of a file that existed before the run is still there, in order. */
function checkWriteOnce(key, run) {
  const p = [];
  const exported = run.priorExists(`${E(key)}/export/recommendation.export.json`) || run.priorExists(`${E(key)}/export/markdown/recommendation.md`);
  for (const rel of run.written()) {
    const before = run.priorRead(rel);
    if (before == null) continue;
    if (/\/recommendation\.md$/.test(rel) && /\/VE-\d+-[a-z0-9-]+\/recommendation\.md$/.test(rel) && !exported) continue; // fixed in place until its first export
    if (/\/export\//.test(rel) && !/\/recommendation\.md$/.test(rel)) continue;
    const after = String(run.read(rel) ?? "").split("\n");
    let i = 0;
    for (const line of before.split("\n")) { while (i < after.length && after[i] !== line) i++; if (i >= after.length) { p.push(`${short(rel)}: "${line.slice(0, 60)}" was there before the run and is gone or moved; ${/decision|conflicts/.test(rel) ? "the file is write-once" : "write-once files are appended to, never rewritten"}`); break; } i++; }
  }
  // Ids are numbered once: no id heads two blocks, and no row id repeats.
  for (const rel of run.written().filter((r) => /\.md$/.test(r))) {
    const t = run.read(rel) ?? "";
    const heads = [...t.matchAll(/^### ((?:VF|VQ|CL)-\d+)\s*$/gm)].map((m) => m[1]);
    const dup = heads.find((h, i) => heads.indexOf(h) !== i);
    if (dup) p.push(`${short(rel)}: ${dup} heads two blocks; an id is numbered once`);
    const rows = [...t.matchAll(/^\| (K-\d+) \|/gm)].map((m) => m[1]);
    const d2 = rows.find((h, i) => rows.indexOf(h) !== i);
    if (d2) p.push(`${short(rel)}: ${d2} is the id of two rows`);
    const waivers = [...(sectionOf(internalSplit(t).internal, "Waivers") ?? "").split("\n").filter((l) => /^\| No internal|^\| Criteria|^\| Numbers|^\| Evidence/.test(l))];
    if (new Set(waivers).size !== waivers.length) p.push(`${short(rel)}: the same waiver row twice`);
  }
  return p;
}

function checkStatus(key, run) {
  const p = [];
  const now = String(run.read(`${OW}STATUS.md`) ?? "").split("\n").filter((l) => l.trim());
  const before = String(run.priorRead(`${OW}STATUS.md`) ?? "").split("\n").filter((l) => l.trim());
  before.forEach((l, i) => { if (now[i] !== l) p.push(`STATUS.md line ${i + 1} was rewritten; STATUS.md is append-only`); });
  const added = now.slice(before.length);
  const want = asList(key.status?.lines);
  if (added.length !== want.length) p.push(`STATUS.md gained ${added.length} line(s), expected ${want.length}`);
  added.forEach((line, i) => {
    const f = line.split(" | ");
    if (f.length !== 5) { p.push(`STATUS line ${before.length + i + 1} has ${f.length} fields`); return; }
    if (!/^\d{4}-\d{2}-\d{2} \(clock: (tool|host-supplied|user-stated|assumed)\)$/.test(f[0])) p.push(`STATUS line ${before.length + i + 1}: "${f[0]}" lacks a clock source`);
    if (f[1] !== `ow-vendor-eval ${VERSION}`) p.push(`STATUS line ${before.length + i + 1}: skill field "${f[1]}"`);
    const w = want[i];
    if (!w) return;
    if (f[2] !== w.path) p.push(`STATUS line ${before.length + i + 1}: path ${f[2]}, expected ${w.path}`);
    if (f[3] !== `next: ${w.next}`) p.push(`STATUS line ${before.length + i + 1}: "${f[3]}", expected "next: ${w.next}"`);
    if (f[4] !== `awaiting: ${w.awaiting}`) p.push(`STATUS line ${before.length + i + 1}: "${f[4]}", expected "awaiting: ${w.awaiting}"`);
    if (/\b(?:Larkspur|Hollowbrook|Elmridge|Tallowmere|Pennyroyal)\b/.test(`${f[3]} ${f[4]}`) && !/vendor-eval\//.test(f[3])) p.push(`STATUS line ${before.length + i + 1}: client text in a STATUS line`);
  });
  return p;
}

// ── screens (C23) ────────────────────────────────────────────────────────────

const SLOTS = { "<ws>": "[a-z0-9][a-z0-9-]*", "<vendor>": "[A-Z][\\w’'& -]*?|[a-z0-9-]+", "<bidder>": "[A-Z][\\w’'& -]*?", "<date>": "\\d{4}-\\d{2}-\\d{2}", "<role>": "[a-z][a-z ’'-]*", "<digest>": "(?:sha256:[0-9a-f]{64}|not computed \\(no ow-tools\\))", "<check>": `(?:${CHECKS_ORDER.map(esc).join("|")})`, "<n>": "\\d+", "<path>": "[A-Za-z0-9_./<>-]+", "<file>": "[A-Za-z0-9_./-]+", "<kind>": ".+", "<figure>": "[\\d.,]+%?", "<step>": "[a-z]+", "<key>": "/ow-vendor-eval[a-z -]*(?: \\((?:commercial|formal)\\))?", "<procurement>": ".+", "<ids>": "[A-Z]+-\\d+(?:(?:, | or )[A-Z]+-\\d+)*", "<vendors>": ".+", "<id>": "(?:[A-Z]+-\\d+)", "<what>": ".+", "<what to fix>": ".+", "<client>": "[a-z0-9-]+" };
/** Every prescribed screen line (routing-and-resume.md §5 and the phase files), as anchored regexes. */
export function screenTemplates(skillDir = SKILL) {
  const files = ["references/routing-and-resume.md", "references/self-checks.md", ...readdirSync(join(skillDir, "references")).filter((n) => /^phase-.*\.md$/.test(n)).map((n) => `references/${n}`)];
  const out = [];
  const START = /^(?:Refused:|Nothing to do:|Nothing was written\.|Nothing is written until you answer\.|Question:|Fix:|Resumed at|Computed without ow-tools|The panel decides\.|The agency's conflict rules|The workbook could not|formal\/ is not git-ignored)/;
  // The closed answers a question offers are printed as written: "(yes <date> / no)", "(none / yes: <kind>)".
  const LITERAL = ["(yes <date> / no)", "(none / yes: <kind>)"];
  for (const f of files) {
    for (const m of readFileSync(join(skillDir, f), "utf8").matchAll(/`([^`]+)`/g)) {
      const s = m[1];
      if (!START.test(s)) continue;
      let re = "";
      for (const piece of s.split(/(\(yes <date> \/ no\)|\(none \/ yes: <kind>\))/)) {
        if (LITERAL.includes(piece)) { re += esc(piece); continue; }
        for (const part of piece.split(/(<[^>]+>|VE-nn|CL-nn)/)) {
          if (!part) continue;
          if (part === "VE-nn") re += "VE-\\d+";
          else if (part === "CL-nn") re += "CL-\\d+";
          else if (/^<[^>]+>$/.test(part)) re += `(${SLOTS[part] ?? ".+?"})`;
          else re += esc(part);
        }
      }
      out.push({ text: s, re: new RegExp(`^${re}$`), file: f });
    }
  }
  return out;
}
let TEMPLATES = null;
const templates = () => (TEMPLATES ??= screenTemplates());
export function nextTemplates(skillDir = SKILL) {
  const lines = readFileSync(join(skillDir, "SKILL.md"), "utf8").split("\n");
  const toRe = (s) => new RegExp(`^${s.split(/(<[^>]+>|VE-nn)/).map((x) => (x === "VE-nn" ? "VE-\\d+" : /^<[^>]+>$/.test(x) ? "[^\"]+?" : esc(x))).join("")}$`);
  const out = [];
  lines.forEach((l, i) => {
    const m = l.match(/^ {4}([A-Z][A-Z ]*[A-Z]): (.*)$/);
    if (!m) return;
    const sub = [];
    for (let j = i + 1; j < lines.length && /^ {10}\S/.test(lines[j]); j++) sub.push(toRe(lines[j].trimEnd()));
    out.push({ label: m[1], text: l, re: toRe(l.trimEnd()), sub });
  });
  return out;
}
let NEXT_T = null;
const nextT = () => (NEXT_T ??= nextTemplates());
export const STEP0 = /^(?:Step 0\. (?:Newest STATUS line|Awaiting): .+|Handling: .+ \(stored in [^)]+\)\.|This material is already in this environment; .+)$/;
const isNextLine = (l) => /^\s*(?:NEXT|IF IT IS NOT AVAILABLE|DONE): /.test(l) || /^\s*(?:It will read:|\[no folder attached:)/.test(l);
export function printedSays(text) {
  const out = [];
  for (const line of String(text ?? "").split("\n")) { const s = line.match(/^\s*NEXT: .*?say "(use [^"]+)"/); if (s) out.push(s[1]); }
  return out;
}
export function selfCheckLine(text) {
  const lines = String(text ?? "").split("\n").filter((l) => l.startsWith(SELF_CHECK_PREFIX));
  if (!lines.length) return null;
  if (lines.length > 1) return { __many: lines.length };
  const out = new Map();
  for (const part of lines[0].slice(SELF_CHECK_PREFIX.length).trim().split(" · ")) {
    const m = part.trim().match(/^(.+?) (OK|FINDING|NOT-CHECKED \([^)]*\))(?: \(waived: ([^)]+)\))?$/);
    out.set(m ? m[1] : part.trim(), m ? { result: m[2], waived: m[3] ?? null } : { result: "unreadable" });
  }
  return out;
}
/** Each printed NEXT-block line is a body template line, with its own It will read and no-folder lines. */
export function nextBlockProblems(text) {
  const p = [];
  const lines = String(text ?? "").split("\n");
  const T = nextT();
  lines.forEach((l, i) => {
    if (!/^\s*(?:NEXT|IF IT IS NOT AVAILABLE): /.test(l)) return;
    const normalized = `    ${l.trimStart()}`;
    const label = normalized.match(/^ {4}([A-Z][A-Z ]*[A-Z]):/)[1];
    const all = T.filter((x) => x.label === label && x.re.test(normalized));
    if (!all.length) { p.push(`printed.md:${i + 1}: "${l.trim().slice(0, 80)}" is not a NEXT template line of SKILL.md`); return; }
    if (label === "NEXT") {
      const after = [];
      for (let j = i + 1; j < lines.length && /^\s*(?:It will read:|\[no folder attached:)/.test(lines[j]); j++) after.push(`          ${lines[j].trimStart()}`);
      if (!all.some((t) => after.length === t.sub.length && after.every((a, k) => t.sub[k].test(a.trimEnd())))) p.push(`printed.md:${i + 1}: the lines after "${l.trim().slice(0, 50)}" are not its template's It will read and no-folder lines`);
      let ok = /^\s*NEXT: none\./.test(l);
      for (let j = i + 1; j < Math.min(lines.length, i + 6); j++) if (/^\s*IF IT IS NOT AVAILABLE:/.test(lines[j])) { ok = true; break; }
      if (!ok) p.push(`printed.md:${i + 1}: the NEXT block has no "IF IT IS NOT AVAILABLE:" line`);
    }
  });
  return p;
}
/** A closed screen (refusal, no-op, question): only templates, step 0, the self-check line and NEXT lines. */
export function closedScreenProblems(text) {
  const p = [];
  const T = templates();
  String(text ?? "").split("\n").forEach((l, i) => {
    if (!l.trim() || STEP0.test(l) || l.startsWith(SELF_CHECK_PREFIX) || isNextLine(l)) return;
    const t = T.find((x) => x.re.test(l));
    if (!t) {
      p.push(`printed.md:${i + 1}: "${l.slice(0, 80)}" is not a prescribed line (a refusal, a no-op or a question prints only its template lines)`);
      for (const w of screenClaims(l)) p.push(`printed.md:${i + 1}: "${l.trim().slice(0, 60)}" claims "${w}" on a screen that writes nothing`);
      return;
    }
    for (const slot of l.match(t.re).slice(1)) { if (CHECKS_ORDER.includes(slot)) continue; for (const w of screenClaims(slot ?? "")) p.push(`printed.md:${i + 1}: a slot of "${t.text.slice(0, 40)}" carries a claim ("${w}")`); }
  });
  if (/^\s*DONE:/m.test(String(text))) p.push("printed.md: a refusal, no-op or question prints DONE:");
  return p;
}
const isClosed = (key, printed) => Boolean(key.refused || key.writes_nothing || key.closed) || (/^(?:Refused:|Nothing to do:)/m.test(printed) && !/^\s*DONE:/m.test(printed));

function checkScreen(key, run) {
  const p = [];
  const printed = run.printed();
  if (printed == null) return ["printed.md is missing: the run's screen is graded"];
  if (key.list_screen) {
    const welcome = new Set(readFileSync(join(SKILL, "SKILL.md"), "utf8").split("\n").filter((l) => /^> |^Try: /.test(l)));
    printed.split("\n").forEach((l, i) => { if (STEP0.test(l) || welcome.has(l)) return; for (const w of screenClaims(l)) p.push(`printed.md:${i + 1}: the list screen claims "${w}"`); });
  }
  else if (isClosed(key, printed)) p.push(...closedScreenProblems(printed));
  else {
    // A writing screen: free lines are allowed, but none of them claims what the files do not show; its NEXT lines are templates.
    const T = templates();
    printed.split("\n").forEach((l, i) => {
      if (!l.trim() || STEP0.test(l) || l.startsWith(SELF_CHECK_PREFIX) || isNextLine(l) || T.some((t) => t.re.test(l))) return;
      if (/^> \d{4}-\d{2}-\d{2} \(clock: /.test(l) && (run.priorRead(`${OW}STATUS.md`) ?? "").includes(l.slice(2))) return;
      const disclosure = /^Handling: (?:no|low|medium|high|restricted)\b/i.test(l) || /^Needs fixing: /.test(l) && /\b(?:not achieved|failed|two pages|cannot be verified)\b/i.test(l);
      if (disclosure) {
        // Check every clause: a truthful failure sentence cannot shelter an appended approval or send claim.
        for (const clause of l.split(/;\s*|(?<=\.)\s+/)) for (const w of screenClaims(clause)) {
          const benign = w === "declared" && /^Scenario clock: .*prospectively declared\b/i.test(clause)
            || w === "displayed" && /^Historical awaiting entries were displayed, not treated as approval\b/i.test(clause)
            || w === "frozen" && /^The source and exports are frozen after this invocation\b/i.test(clause)
            || w === "recorded" && /^No choice, waiver, vendor contact or send was recorded\b/i.test(clause)
            || w === "failed" && /^Needs fixing: .*layout failed\b/i.test(clause);
          if (!benign) p.push(`printed.md:${i + 1}: "${l.trim().slice(0, 60)}" claims "${w}"; only DONE: says what was written`);
        }
        return;
      }
      for (const w of screenClaims(l)) if (!/^\s*DONE:/.test(l)) p.push(`printed.md:${i + 1}: "${l.trim().slice(0, 60)}" claims "${w}"; only DONE: says what was written`);
    });
  }
  p.push(...nextBlockProblems(printed));
  for (const l of printed.split("\n").filter((x) => /^\s*DONE: /.test(x))) {
    const f = l.match(/-> (\S+)/)?.[1];
    if (!f || !run.written().includes(`${OW}${f}`)) p.push(`printed.md: "${l.trim().slice(0, 70)}" names ${f ?? "no file"}, which this run did not write`);
  }
  for (const s of asList(key.screen?.says)) if (!printed.split("\n").some((l) => l.trim() === s)) p.push(`printed.md: no line "${s}"`);
  for (const s of asList(key.screen?.never)) if (printed.includes(s)) p.push(`printed.md: carries "${s}"`);
  const sc = selfCheckLine(printed);
  const want = RUNS_IN[keyRoot(key)];
  if (WRITING(key) && !isClosed(key, printed) && want) {
    if (!sc) p.push("printed.md: no self-check line");
    else if (sc.__many) p.push(`printed.md: ${sc.__many} self-check lines; a screen prints one`);
    else if ([...sc.keys()].join("|") !== want.join("|")) p.push(`printed.md: the self-check line names ${[...sc.keys()].join(", ")}; ${keyRoot(key)} runs ${want.join(", ")}`);
  }
  if (key.resume?.from) {
    const first = printed.split("\n").find((l) => l.trim() && !STEP0.test(l));
    if (first !== `Resumed at ${key.resume.from} (${key.key.replace(/ <[^>]+>/, "")}).`) p.push(`printed.md: a resumed run starts "Resumed at ${key.resume.from} (${key.key}).", not "${String(first).slice(0, 60)}"`);
  }
  return p;
}
function checkNext(key, run) {
  const printed = run.printed() ?? "";
  const got = printedSays(printed);
  const want = /^Needs fixing: /m.test(printed) ? [] : asList(key.next);
  const p = JSON.stringify(got) === JSON.stringify(want) ? [] : [`the NEXT says ${JSON.stringify(got)}; expected ${JSON.stringify(want)}`];
  for (const line of got) if (/<(?:vendor|ws|path|client|bidder)>/.test(line)) p.push(`the NEXT leaves a required slot unfilled: ${line}`);
  return p;
}
function checkRefused(key, run) {
  const p = [];
  for (const f of run.written()) p.push(`${short(f)} was written; a refusal, a no-op or a question writes nothing`);
  const printed = run.printed() ?? "";
  for (const s of asList(key.refused?.says)) if (!printed.split("\n").some((l) => l === s)) p.push(`printed.md: no line "${s}"`);
  if (/^(?:Refused|Nothing to do):/m.test(printed) && !/^Nothing was written\.$/m.test(printed)) p.push("printed.md: no \"Nothing was written.\" line");
  if (/^Question:/m.test(printed) && !/^Nothing is written until you answer\.$/m.test(printed)) p.push("printed.md: a question without \"Nothing is written until you answer.\"");
  return p;
}

/** The verb the files call for (routing-and-resume.md §4), from the run's starting state. */
export function expectedRoute(run, key) {
  const pv = priorView(run);
  const from = String(key.route?.say ?? "");
  const m = from.match(/ on (\S+)$/);
  const path = m ? m[1] : null;
  const evals = (ws) => pv.all().filter((f) => new RegExp(`^${esc(OW)}vendor-eval/${esc(ws)}/VE-\\d+-[a-z0-9-]+/scope\\.md$`).test(f)).map((f) => f.split("/")[3]);
  const scopeAt = (ws, ev) => tryMd(pv, `${OW}vendor-eval/${ws}/${ev}/scope.md`);
  const exported = (ws, ev) => pv.exists(`${OW}vendor-eval/${ws}/${ev}/export/recommendation.export.json`) || pv.exists(`${OW}vendor-eval/${ws}/${ev}/export/markdown/recommendation.md`);
  if (path && /^research\/[a-z0-9-]+\/RS-\d+-[a-z0-9-]+\/findings\.md$/.test(path)) {
    const ws = path.split("/")[1];
    if (key.ws && ws !== key.ws) return "refused: another client";
    const f = findingsAt(pv, `${OW}${path}`);
    if (f?.open) return "refused: finding open";
    const ev = evals(ws);
    if (!ev.length) return "refused: no evaluation";
    if (ev.length > 1) return "ask: which evaluation";
    const s = scopeAt(ws, ev[0]);
    if (s?.data.mode === "formal") return "refused: formal";
    if (!s?.data.frozen) return "refused: not frozen";
    if (!pv.exists(`${OW}vendor-eval/${ws}/${ev[0]}/longlist.md`)) return "refused: no longlist";
    if (exported(ws, ev[0])) return "refused: exported";
    const vendors = pv.all().filter((x) => x.startsWith(`${OW}vendor-eval/${ws}/${ev[0]}/vendors/`) || x === `${OW}vendor-eval/${ws}/${ev[0]}/longlist.md`).map((x) => pv.read(x) ?? "").join("\n");
    if (f && [...f.findings.keys()].every((id) => vendors.includes(`${path} ${id}`))) return "nothing: already imported";
    return "evidence";
  }
  if (path && /^plans\/[a-z0-9-]+\/quick-scope\.md$/.test(path)) {
    const client = path.split("/")[1];
    const ci = tryMd(pv, `${OW}plans/${client}/contract-inputs.md`);
    if (!ci || ci.data.mode !== "vendor-eval") return "refused: not accepted";
    if (evals(client).some((ev) => scopeAt(client, ev)?.data.frozen && scopeAt(client, ev)?.data.source === path)) return "nothing: frozen";
    return "scope";
  }
  if (path && /^plans\/[a-z0-9-]+\/$/.test(path)) {
    const client = path.split("/")[1];
    const sc = pv.read(`${OW}plans/${client}/scope.md`) ?? "";
    const sel = [...sc.matchAll(/^### (WP-\d+)[^\n]*\n(?:- [^\n]*\n)*?- kind: selection$/gm)].map((x) => x[1]);
    if (sel.length > 1) return "ask: which package";
    if (evals(client).some((ev) => pv.exists(`${OW}vendor-eval/${client}/${ev}/decision.md`))) return "nothing: decided";
    return "scope";
  }
  if (path && /^vendor-eval\/[a-z0-9-]+\/(?:VE-\d+-[a-z0-9-]+\/)?$/.test(path)) {
    const [, ws, evIn] = path.split("/");
    const ev = evIn ? [evIn] : evals(ws);
    if (!ev.length) return "welcome";
    if (ev.length > 1) return "ask: which evaluation";
    const dir = `${OW}vendor-eval/${ws}/${ev[0]}`;
    const s = scopeAt(ws, ev[0]);
    const done = (rel, k) => runsOf(pv.read(`${dir}/${rel}`)).some((r) => r.key.startsWith(k) && r.step === "status");
    if (!s || !done("scope.md", "/ow-vendor-eval-scope")) return "scope";
    if (s.data.mode === "formal") return done("formal/requirements.md", "/ow-vendor-eval-formal") ? "formal --responses" : "formal";
    if (!done("longlist.md", "/ow-vendor-eval-longlist")) return "longlist";
    let rows = [];
    try { rows = stillIn(longlistOf(pv, { ws, eval: ev[0] })); } catch { rows = []; }
    const missing = rows.find((r) => !pv.exists(`${dir}/vendors/${r.slug}.md`));
    if (missing) return `evidence ${missing.slug}`;
    if (!pv.exists(`${dir}/scores.md`)) return "score";
    if (!done("recommendation.md", "/ow-vendor-eval-recommend")) return "recommend";
    if (!pv.exists(`${dir}/decision.md`)) return "nothing: awaits the choice";
    return "nothing: decided";
  }
  if (from === "/ow-vendor-eval") return pv.all().some((f) => f.startsWith(`${OW}vendor-eval/`)) ? "list" : "welcome";
  return "refused: not a file this skill takes over";
}
function checkRoute(key, run) {
  const p = [];
  const got = expectedRoute(run, key);
  if (key.route?.expect !== got) p.push(`${key.route?.say ?? key.key} routes to "${got}"; this case expects "${key.route?.expect}"`);
  const printed = run.printed() ?? "";
  if (/^refused/.test(got) || /^nothing/.test(got) || /^ask/.test(got) || ["welcome", "list", "awaits the choice"].includes(got)) {
    for (const f of run.written()) p.push(`${short(f)} was written; the route "${got}" writes nothing`);
  } else {
    const verb = { evidence: "/ow-vendor-eval-evidence", scope: "/ow-vendor-eval-scope", longlist: "/ow-vendor-eval-longlist", score: "/ow-vendor-eval-score", recommend: "/ow-vendor-eval-recommend", formal: "/ow-vendor-eval-formal", "formal --responses": "/ow-vendor-eval-formal --responses" }[got.split(" ")[0] === "evidence" ? "evidence" : got];
    if (verb && keyRoot(key) !== verb && run.written().length) p.push(`the route lands on ${verb}, but the run is ${keyRoot(key)}`);
  }
  if (!printed.trim()) p.push("printed.md is empty");
  return p;
}

/** Resume (C22): the key's ## Runs holds every step once, in order; a resumed run starts at the first step not recorded. */
function checkResume(key, run) {
  const p = [];
  const file = runsFile(key);
  if (!file) return [];
  const steps = STEPS[key.key.replace(/ <[^>]+>/, "")];
  if (!steps) return [`no step-table row for ${key.key}`];
  const label = key.key.replace(/ <vendor>/, key.vendor ? ` ${key.vendor}` : "").replace(/ <[^>]+>/, "");
  const mine = (t) => runsOf(t).filter((r) => `${r.key}${r.vendor ? ` ${r.vendor}` : ""}` === label);
  const before = mine(run.priorRead(file));
  const after = mine(run.read(file));
  const allSteps = runsOf(run.read(file));
  for (const r of allSteps) {
    const row = STEPS[r.key];
    if (!row) p.push(`${short(file)}: "${r.line}" names ${r.key}, which is not a step-table key`);
    else if (!row.includes(r.step)) p.push(`${short(file)}: "${r.line}": ${r.step} is not a step of ${r.key}`);
  }
  if (key.key.includes("(formal)") && allSteps.some((r) => r.key.includes("(commercial)"))) p.push(`${short(file)}: a formal evaluation's scope records commercial steps`);
  // A finished earlier run of the same key (a re-score, a longlist run again) is its own run: this run's lines follow it.
  const finished = before.some((r) => r.step === "status") && !key.resume?.from;
  const mineNow = finished ? after.slice(before.length) : after;
  if (finished && after.slice(0, before.length).map((r) => r.line).join("|") !== before.map((r) => r.line).join("|")) p.push(`${short(file)}: an earlier run's ## Runs lines changed`);
  const names = mineNow.map((r) => r.step);
  if (new Set(names).size !== names.length) p.push(`${short(file)}: a step of ${label} is recorded twice; a resumed run never repeats a step`);
  const want = key.resume?.until ? steps.slice(0, steps.indexOf(key.resume.until) + 1) : steps;
  if (names.join(",") !== want.join(",")) p.push(`${short(file)}: ${label} recorded ${names.join(", ") || "no step"}; expected ${want.join(", ")}`);
  if (key.resume?.from) {
    const at = steps.indexOf(key.resume.from);
    if (before.map((r) => r.step).join(",") !== steps.slice(0, at).join(",")) p.push(`${short(file)}: before the run ${label} held ${before.map((r) => r.step).join(", ") || "nothing"}; this case resumes at ${key.resume.from}`);
  }
  return p;
}
const runsFile = (key) => {
  const k = keyRoot(key);
  const v = key.vendor;
  return { "/ow-vendor-eval-scope": `${E(key)}/scope.md`, "/ow-vendor-eval-scope --revise": `${E(key)}/scope.md`, "/ow-vendor-eval-longlist": `${E(key)}/longlist.md`, "/ow-vendor-eval-evidence": v ? `${E(key)}/vendors/${v}.md` : null, "/ow-vendor-eval-score": `${E(key)}/scores.md`, "/ow-vendor-eval-recommend": `${E(key)}/recommendation.md`, "/ow-vendor-eval-recommend --waive": `${E(key)}/recommendation.md`, "/ow-vendor-eval-decide": `${E(key)}/decision.md`, "/ow-vendor-eval-formal": `${E(key)}/formal/requirements.md`, "/ow-vendor-eval-formal --clarification": `${E(key)}/formal/clarifications.md`, "/ow-vendor-eval-formal --responses": `${E(key)}/formal/response-map.md` }[k] ?? null;
};

/** C5: the mode first, never changed; each verb refused in the other mode writes nothing there. */
function checkMode(key, run) {
  const p = [];
  const s = scopeOf(run, key);
  const before = tryMd(priorView(run), `${E(key)}/scope.md`);
  if (before && before.data.mode !== s.mode) p.push(`scope.md: the mode changed from ${before.data.mode} to ${s.mode}; it never changes after write`);
  if (!["commercial", "formal"].includes(s.mode)) p.push(`scope.md: mode is ${s.mode}`);
  const firstRun = runsOf(s.text)[0];
  if (firstRun && firstRun.step !== "mode") p.push("scope.md: the first step recorded is not mode; the mode comes first");
  if (s.mode === "formal") {
    for (const f of run.all().filter((x) => x.startsWith(`${E(key)}/`))) if (/\/(?:scores|cost|recommendation|decision|longlist|questions)\.md$|\/vendors\/|\/calc\/(?:totals|cost)-/.test(f)) p.push(`${short(f)}: a formal evaluation has no ${f.split("/").pop()}; the panel decides`);
  } else for (const f of run.all().filter((x) => x.startsWith(`${E(key)}/formal/`))) p.push(`${short(f)}: a commercial evaluation has no formal/ files`);
  const printed = run.printed() ?? "";
  const q = printed.split("\n").find((l) => /^Question: /.test(l));
  if (keyRoot(key) === "/ow-vendor-eval-scope" && !key.resume?.from && q !== "Question: commercial or formal (public procurement)? In formal mode the panel decides: no score, ranking, shortlist or recommendation.") p.push("printed.md: -scope's first question is not the mode question");
  return p;
}

/** C6, C7: the commercial scope, criteria first, revisions. */
function checkScope(key, run) {
  const p = [];
  const s = scopeOf(run, key);
  if (s.mode !== "commercial") return p;
  const sum = [...s.criteria.values()].reduce((a, c) => a + c.weight, 0);
  if (sum !== 100) p.push(`scope.md: the weights sum to ${sum}, not 100`);
  if (![...s.criteria.values()].some((c) => /data export and exit/i.test(c.name))) p.push("scope.md: no data export and exit criterion (always offered)");
  if (!s.requirements.length) p.push("scope.md: no RQ-nn requirement");
  for (const r of s.requirements) {
    const m = r.source.match(/^from (plans\/[a-z0-9-]+\/map\/future\.md) item (\d+)$/);
    if (/^from plans\/[a-z0-9-]+\/map\/future\.md$/.test(r.source)) p.push(`scope.md: ${r.id} is "from the map" but cites no item`);
    if (m) { const map = run.read(`${OW}${m[1]}`); if (!map || !new RegExp(`^${m[2]}\\. `, "m").test(matter(map).content)) p.push(`scope.md: ${r.id} cites ${m[1]} item ${m[2]}, which is not there`); }
    const sys = r.source.match(/^from (plans\/[a-z0-9-]+\/systems\/[a-z0-9-]+\.md)$/);
    if (sys && !run.exists(`${OW}${sys[1]}`)) p.push(`scope.md: ${r.id} cites ${sys[1]}, which is not there`);
    if (/^from \.\.|^from \//.test(r.source) || /vendor-eval\/(?!.*VE)/.test(r.source)) p.push(`scope.md: ${r.id}'s source is not a family file`);
    const other = r.source.match(/^from plans\/([a-z0-9-]+)\//);
    if (other && other[1] !== key.ws && key.ws !== "business") p.push(`scope.md: ${r.id} takes a requirement from another client's plan (${other[1]})`);
  }
  for (const mh of s.mustHaves) if (!/\((?:RQ|CR)-\d+\)$/.test(mh.text)) p.push(`scope.md: ${mh.id} names no requirement or criterion it holds to`);
  // The agreement: the closed answer, naming the criteria set's digest, before frozen.
  if (s.data.frozen != null) {
    const agr = String(s.data.agreement ?? "");
    const m = agr.match(/^agreed by (.+?) on (\d{4}-\d{2}-\d{2}), as reported$/);
    if (!m) p.push(`scope.md: frozen with no agreement line in the prescribed form ("agreed by <client role> on <date>, as reported")`);
    if (!(sectionOf(s.content, "Agreement") ?? "").includes(PROTOCOL_NOTE)) p.push("scope.md: ## Agreement has no protocol §8 working-note sentence");
    const digest = String(s.data.criteria_sha256 ?? "");
    if (key.tools !== false) {
      const bytes = run.read(`${E(key)}/calc/criteria-set.json`);
      p.push(...agreementAgainstCriteria(digest, bytes).map((x) => `scope.md: ${x}`));
      if (bytes) {
        let items = [];
        try { items = JSON.parse(bytes); } catch { items = []; p.push("calc/criteria-set.json is not JSON"); }
        for (const [id, c] of s.criteria) if (!items.some((i) => String(i.label).startsWith(`${id} `) && Number(i.unit_price) === c.weight && Number(i.quantity) === 1)) p.push(`calc/criteria-set.json: ${id} at weight ${c.weight} is not an item`);
        for (const mh of s.mustHaves) if (!items.some((i) => String(i.label).startsWith(`${mh.id} `) && Number(i.unit_price) === 0)) p.push(`calc/criteria-set.json: ${mh.id} is not an item at weight 0`);
        p.push(...totalAgainstCalc(100, items.filter((i) => /^CR-/.test(i.label))).map((x) => `calc/criteria-set.json: the weights' ${x}`));
      }
    } else if (digest !== "not computed (no ow-tools)") p.push("scope.md: without ow-tools the digest is \"not computed (no ow-tools)\"");
    const qa = questionAnswers(run).filter((x) => questionKind(x.q) === "agree" && !/revision/.test(x.q));
    if (keyRoot(key) === "/ow-vendor-eval-scope" && (run.written().includes(`${E(key)}/scope.md`) && !key.resume?.from || qa.length)) {
      const yes = qa.find((x) => approvalAnswer(x.a, "agree").decision === "yes");
      if (!yes) p.push("scope.md: frozen, but no closed agreement question in this session was answered yes <date>");
      else {
        if (!yes.q.includes(digest)) p.push(`scope.md: the agreement question named ${yes.q.match(/criteria set (\S+)/)?.[1] ?? "nothing"}, not this criteria set's digest`);
        if (m && yes.a !== `yes ${m[2]}`) p.push(`scope.md: the agreement date ${m[2]} is not the user's answer ("${yes.a}")`);
        if (m && !yes.q.includes(`Did ${m[1]} agree`)) p.push(`scope.md: the agreement names ${m[1]}, not the role the question asked about`);
      }
    }
  } else if (s.data.agreement) p.push("scope.md: an agreement line with no frozen: date");
  // Criteria first: no vendor name or vendor host in scope.md, or on a -scope screen, before frozen.
  const names = vendorNames(run, key);
  const scopeText = s.content.split("\n## Possible embedded instructions")[0];
  for (const n of names) {
    const re = new RegExp(`\\b${esc(n.name)}\\b|${esc(n.host ?? "\u0000none")}`, "i");
    if (re.test(scopeText)) p.push(`scope.md: names the vendor "${n.name}" (criteria first: no vendor before the freeze)`);
    if (keyRoot(key) === "/ow-vendor-eval-scope") (run.printed() ?? "").split("\n").forEach((l, i) => { if (re.test(l) && !/^Refused: criteria are not frozen yet\.$/.test(l)) p.push(`printed.md:${i + 1}: a -scope screen names the vendor "${n.name}"`); });
  }
  if (s.data.source && /quick-scope\.md$/.test(s.data.source)) p.push(...vendorCountAgainstQuickScope(s.data.vendor_count, run.read(`${OW}${s.data.source}`)).map((x) => `scope.md: ${x}`));
  // Revisions: dated, reasoned, agreed, and every vendor re-scored.
  for (const rev of s.revisions) {
    if (keyRoot(key) === "/ow-vendor-eval-scope --revise" && !key.resume?.from && !(run.priorRead(`${E(key)}/scope.md`) ?? "").includes(`## Revision ${rev.n} `)) {
      const y = questionAnswers(run).find((x) => new RegExp(`agree revision ${rev.n} of criteria set`).test(x.q) && approvalAnswer(x.a, "agree").decision === "yes");
      if (!y) p.push(`scope.md: revision ${rev.n} has no closed agreement question answered yes <date> in this session`);
      else {
        if (y.a !== `yes ${rev.date}`) p.push(`scope.md: revision ${rev.n}'s agreement date is not the user's answer ("${y.a}")`);
        const rd = (rev.text.match(/^-\s+criteria set: (\S+)$/m) ?? [])[1];
        if (key.tools !== false) p.push(...agreementAgainstCriteria(rd, run.read(`${E(key)}/calc/criteria-set-REV-${rev.n}.json`)).map((x) => `scope.md: revision ${rev.n}: ${x}`));
        if (rd && !y.q.includes(rd)) p.push(`scope.md: revision ${rev.n}'s question named another criteria set`);
      }
    }
    if (!/^-\s+REV-\d+:/m.test(rev.text)) p.push(`scope.md: ## Revision ${rev.n} has no REV-${rev.n} line`);
    if (!/^-\s+reason: \S/m.test(rev.text)) p.push(`scope.md: ## Revision ${rev.n} gives no reason`);
    if (!new RegExp(`^-\\s+agreement: agreed by .+ on \\d{4}-\\d{2}-\\d{2}, as reported \\(revision ${rev.n}\\)$`, "m").test(rev.text)) p.push(`scope.md: ## Revision ${rev.n} has no agreement naming the revision`);
    if ((run.priorExists(`${E(key)}/export/recommendation.export.json`) || run.priorExists(`${E(key)}/export/markdown/recommendation.md`)) && !(run.priorRead(`${E(key)}/scope.md`) ?? "").includes(`## Revision ${rev.n} `)) p.push(`scope.md: ## Revision ${rev.n} was appended after the recommendation was exported (a change is a new evaluation, O6)`);
  }
  if (s.data.supersedes && !/^VE-\d+$/.test(String(s.data.supersedes))) p.push(`scope.md: supersedes is ${s.data.supersedes}`);
  return p;
}
/** The vendors this world knows by name, with their web host: every longlist row and every vendor in the key. */
function vendorNames(run, key) {
  const out = asList(key.vendors).map((v) => (typeof v === "string" ? { name: v } : v));
  return out.filter((v) => v.name);
}

/** C8: conflicts, never waived. */
function checkConflicts(key, run) {
  const p = [];
  const user = key.user;
  const c = tryMd(run, `${E(key)}/conflicts.md`);
  if (!c) return ["conflicts.md was not written: the general declaration comes after the freeze"];
  const decl = (sectionOf(c.content, "Declaration") ?? "").split("\n").filter((l) => /^-\s/.test(l));
  if (!decl.length) p.push("conflicts.md: no declaration line");
  for (const l of decl) if (!/^-\s+(?:none|.+: .+) \(stated by \S+ on \d{4}-\d{2}-\d{2}\)$/.test(l)) p.push(`conflicts.md: "${l.slice(0, 60)}" is not a declaration line`);
  const amounts = figuresIn(internalSplit(c.content).client.replace(/\(stated by[^)]*\)/g, "").replace(/\d{4}-\d{2}-\d{2}/g, ""));
  if (amounts.length) p.push("conflicts.md: an amount sits outside the ow:internal markers");
  let rows = [];
  try { rows = run.exists(`${E(key)}/longlist.md`) ? longlistOf(run, key) : []; } catch (e) { p.push(reason(e)); }
  for (const r of rows) if (!/^(?:none|.+) \(stated by \S+ on \d{4}-\d{2}-\d{2}\)$/.test(String(r.relationship ?? ""))) p.push(`longlist.md: ${r.id} ${r.vendor} has no relationship answer in the user's words`);
  // The answers come from the user's own turns (never a vendor's word).
  const qa = questionAnswers(run).filter((x) => questionKind(x.q) === "relationship");
  for (const x of qa) { const a = approvalAnswer(x.a, "relationship"); if (!a.ok) p.push(`a relationship question was answered "${String(x.a).slice(0, 40)}": ${a.problems[0]}`); }
  if (run.written().includes(`${E(key)}/longlist.md`)) {
    const before = (() => { try { return run.priorExists(`${E(key)}/longlist.md`) ? longlistOf(priorView(run), key).map((r) => r.id) : []; } catch { return []; } })();
    for (const r of rows.filter((x) => !before.includes(x.id))) {
      const x = qa.find((y) => y.q.includes(`relationship with ${r.vendor.replace(/\s*\(.*$/, "")}?`));
      if (!x) p.push(`longlist.md: ${r.id} ${r.vendor}'s relationship was not asked in this session`);
      else {
        const a = approvalAnswer(x.a, "relationship");
        const rec = String(r.relationship).replace(/ \(stated by.*$/, "");
        if (a.ok && (a.decision === "none" ? rec !== "none" : rec !== a.kind)) p.push(`longlist.md: ${r.id}'s relationship "${rec}" is not the user's answer "${x.a}"`);
      }
    }
  }
  // The recommendation's statement: every relationship, by vendor and kind, or the exact none line.
  const rec = tryMd(run, `${E(key)}/recommendation.md`);
  if (rec && (keyRoot(key).startsWith("/ow-vendor-eval-recommend") || key.checks.includes("recommendation"))) {
    const st = sectionOf(internalSplit(rec.content).client, "Conflicts statement");
    if (st == null) p.push("recommendation.md: no ## Conflicts statement (never waived)");
    else {
      const rels = rows.filter((r) => !/^none\b/.test(r.relationship));
      const general = decl.filter((l) => !/^-\s+none\b/.test(l));
      if (!rels.length && !general.length) {
        const date = String(c.data.stated_on ?? "");
        const sourceDate = iso(date);
        const spokenDate = /^\d{4}-\d{2}-\d{2}$/.test(sourceDate) ? new Date(`${sourceDate}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : sourceDate;
        if (!st.split("\n").some((l) => [NONE_LINE(user, sourceDate), NONE_LINE(user, spokenDate)].includes(l.trim()))) p.push(`## Conflicts statement: the none line is exactly "${NONE_LINE(user, sourceDate)}" (or the same source date written out)`);
      }
      for (const r of rels) {
        const kind = String(r.relationship).replace(/ \(stated by.*$/, "");
        const name = r.vendor.replace(/\s*\(.*$/, "");
        if (!st.split("\n").some((l) => l.startsWith(`- ${name}: ${kind} (stated by `))) p.push(`## Conflicts statement: ${name}'s ${kind} is not stated by vendor and kind`);
      }
      for (const l of general) { const kind = l.replace(/^-\s+/, "").split(":")[0]; if (!st.includes(kind)) p.push(`## Conflicts statement: the declared ${kind} is not stated`); }
    }
  }
  // Formal: each bidder's answer before its response is mapped (O14).
  const map = tryMd(run, `${E(key)}/formal/response-map.md`);
  if (map) {
    const bidders = tableRows(sectionOf(map.content, "Bidders"));
    const mapped = sectionsOf(map.content).map((s) => s.title).filter((t) => !/^(?:Bidders|Possible embedded instructions|Runs|Self-checks.*)$/.test(t));
    for (const b of mapped) {
      const row = bidders.find((r) => r.bidder === b);
      if (!row || !/^(?:none|.+)$/.test(row.relationship ?? "") || !/stated by \S+ on \d{4}-\d{2}-\d{2}/.test(row.stated ?? "")) p.push(`formal/response-map.md: ${b}'s response is mapped with no relationship answer in ## Bidders`);
      if (row && !/^none$/.test(row.relationship) && !(run.printed() ?? "").includes("The agency's conflict rules come first: tell the agency as its rules require.")) p.push(`printed.md: ${b} has a relationship, and the agency's-rules line is not printed`);
    }
  }
  return p;
}

/** C9: the longlist and knock-outs. */
function checkLonglist(key, run) {
  const p = [];
  const rows = longlistOf(run, key);
  const used = new Set();
  rows.forEach((r, i) => {
    if (r.id !== `K-${String(i + 1).padStart(2, "0")}`) p.push(`longlist.md: row ${i + 1} is ${r.id}; K-nn are given in order`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r.slug)) p.push(`longlist.md: ${r.id} has an invalid file_id ${r.slug}`);
    if (used.has(r.slug)) p.push(`longlist.md: ${r.id} reuses file_id ${r.slug}; candidates need separate evidence and calc files`);
    if (r.fileIdRecorded && r.slug !== nextVendorFileId(r.vendor, r.id, used)) p.push(`longlist.md: ${r.id} file_id ${r.slug} differs from its allocated identifier`);
    used.add(r.slug);
    if (!/(?:findings\.md F-\d+|client-suggested \(quick-scope\.md\)|client-suggested \(inbox\/[^)]+\)|user-stated \d{4}-\d{2}-\d{2})/.test(r.source ?? "")) p.push(`longlist.md: ${r.id} ${r.vendor} has no source`);
    const out = String(r.knockout).match(/^out (MH-\d+): .+ \((.+), (HIGH|MEDIUM|LOW)\)$/);
    if (/^out\b/.test(r.knockout)) {
      if (!out) p.push(`longlist.md: ${r.id}'s knock-out is not "out MH-nn: <reason> (<evidence>, HIGH)"`);
      else if (out[3] !== "HIGH") p.push(`longlist.md: ${r.id} is knocked out on ${out[3]} evidence; a must-have knocks a vendor out only on HIGH`);
      else {
        const f = out[2].match(/(research\/\S+\/findings\.md) (F-\d+)/);
        if (f) { const fx = findingsAt(run, `${OW}${f[1]}`); const lvl = fx?.findings.get(f[2])?.fields.level; if (lvl !== "HIGH") p.push(`longlist.md: ${r.id} is knocked out on ${f[2]}, which is ${lvl ?? "not a finding"}, not HIGH`); }
      }
    } else if (/^flagged/.test(r.knockout) && !/^flagged MH-\d+ \((?:LOW|MEDIUM) evidence; VQ to follow\)$/.test(r.knockout)) p.push(`longlist.md: ${r.id}'s flag is not "flagged MH-nn (<level> evidence; VQ to follow)"`);
    else if (!/^(?:in|flagged)/.test(r.knockout)) p.push(`longlist.md: ${r.id}'s knock-out state "${r.knockout}" is not in, flagged or out`);
  });
  for (const l of addressedLines(rows.map((r) => r.vendor).join("\n"))) if (!embeddedQuotes(md(run, `${E(key)}/longlist.md`).content).some((q) => l.includes(q.quote) || q.quote.includes(l))) p.push(`longlist.md: a vendor name that reads as an instruction ("${l.slice(0, 40)}") is not quoted under ## Possible embedded instructions`);
  return p;
}

/** C10: evidence, levels, imports from findings, quotes from inbox files, questions. */
function checkEvidence(key, run) {
  const p = [];
  const slugs = run.written().filter((f) => new RegExp(`^${esc(E(key))}/vendors/[a-z0-9-]+\\.md$`).test(f)).map((f) => f.split("/").pop().replace(/\.md$/, ""));
  const confirmed = questionAnswers(run).filter((x) => questionKind(x.q) === "demo" && approvalAnswer(x.a, "demo").decision === "yes").map((x) => x.q.match(/^Question: Is (\S+) your own/)?.[1]);
  const candidates = longlistOf(run, key);
  for (const slug of slugs) {
    const rel = `${E(key)}/vendors/${slug}.md`;
    const { data, facts, content } = vendorFacts(run, key, slug);
    const candidate = candidates.find((r) => r.slug === slug);
    if (!candidate) p.push(`${short(rel)}: file_id is not on the longlist`);
    else if (data.candidate !== candidate.id || data.vendor !== candidate.vendor) p.push(`${short(rel)}: header does not identify ${candidate.id} ${candidate.vendor}`);
    const withdrawn = new Set([...facts.values()].map((f) => f.keys.withdraws).filter(Boolean));
    for (const f of facts.values()) {
      const src = f.keys.source, kind = f.keys.kind, lvl = f.keys.level;
      const fr = String(src).match(/^(research\/[a-z0-9-]+\/RS-\d+-[a-z0-9-]+\/findings\.md) (F-\d+)$/);
      if (fr) {
        if (fr[1].split("/")[1] !== key.ws && key.ws !== "business") p.push(`${short(rel)}: ${f.id} takes evidence from another client's research (${fr[1]})`);
        const fx = findingsAt(run, `${OW}${fr[1]}`);
        if (!fx) { p.push(`${short(rel)}: ${f.id} cites ${fr[1]}, which is not there`); continue; }
        if (fx.open) p.push(`${short(rel)}: ${f.id} imports from a topic whose self-check table holds a FINDING`);
        const sup = fx.superseded.find((s) => s.old === fr[2]);
        if (sup && !withdrawn.has(f.id) && !f.keys.stale) p.push(`${short(rel)}: ${f.id} cites ${fr[2]}, superseded by ${sup.by}; it is stale and named`);
        if (!sup) p.push(...vfAgainstFinding(f, fx.findings.get(fr[2])).map((x) => `${short(rel)}: ${x}`));
        if (kind !== "finding") p.push(`${short(rel)}: ${f.id} is from a finding; its kind is finding`);
        if (ADDRESSED_VE.test(fx.findings.get(fr[2])?.fields.claim ?? "")) p.push(`${short(rel)}: ${f.id} imports a finding whose claim carries an embedded instruction`);
        if ((fx.suspicious ?? "").includes(String(f.keys.fact).slice(0, 30))) p.push(`${short(rel)}: ${f.id} is taken from Suspicious content`);
        continue;
      }
      const ib = String(src).match(/^inbox\/(\S+)$/);
      if (ib) {
        const text = run.read(`${E(key)}/inbox/${ib[1]}`);
        if (text == null) { p.push(`${short(rel)}: ${f.id} cites inbox/${ib[1]}, which is not there`); continue; }
        p.push(...quotedAnswerAgainstInbox(String(f.keys.fact).replace(/^"|"$/g, ""), text.split(NOT_COPIED).join("")).map((x) => `${short(rel)}: ${f.id}: ${x}`));
        if (kind === "shown") {
          if (lvl !== "HIGH") p.push(`${short(rel)}: ${f.id} is shown, so HIGH`);
          if (!confirmed.includes(`inbox/${ib[1]}`) && !(run.priorRead(rel) ?? "").includes(`### ${f.id}`)) p.push(`${short(rel)}: ${f.id} is recorded shown, but the user did not confirm in this session that inbox/${ib[1]} is their own observation`);
          if (/^(?:From|Subject|To):|\bVendor recap\b|\bprepared by\b/im.test(text) && !confirmed.includes(`inbox/${ib[1]}`)) p.push(`${short(rel)}: ${f.id}: inbox/${ib[1]} is the vendor's own writing, which is stated by vendor`);
        } else if (kind === "stated by vendor" || kind === "stated by reference") { if (lvl !== "MEDIUM") p.push(`${short(rel)}: ${f.id} is ${kind}, so MEDIUM, not ${lvl}`); }
        else if (kind === "inferred" && lvl !== "LOW") p.push(`${short(rel)}: ${f.id} is inferred, so LOW`);
        else if (!["shown", "stated by vendor", "stated by reference", "inferred"].includes(kind)) p.push(`${short(rel)}: ${f.id}'s kind "${kind}" is not a kind`);
        continue;
      }
      if (/^user-stated \d{4}-\d{2}-\d{2}$/.test(src)) { if (lvl === "HIGH") p.push(`${short(rel)}: ${f.id} is user-stated; HIGH needs a document or a demo`); continue; }
      if (/vendor-eval\/(?!.*\/VE)/.test(src) || (/vendor-eval\/([a-z0-9-]+)\//.exec(src)?.[1] ?? key.ws) !== key.ws) p.push(`${short(rel)}: ${f.id} takes evidence from another client's workstream (${src})`);
      else p.push(`${short(rel)}: ${f.id}'s source "${src}" is not a finding, an inbox file or user-stated`);
    }
    if (/\bfetch date\b/i.test(content)) p.push(`${short(rel)}: "fetch date"; the field is retrieved`);
  }
  // Flagged must-haves get a VQ-nn; demo steps cite a requirement.
  const q = tryMd(run, `${E(key)}/questions.md`);
  let rows = [];
  try { rows = longlistOf(run, key); } catch { rows = []; }
  for (const r of rows.filter((x) => /^flagged (MH-\d+)/.test(x.knockout))) {
    if (!slugs.includes(r.slug) && !run.exists(`${E(key)}/vendors/${r.slug}.md`)) continue;
    const mh = r.knockout.match(/^flagged (MH-\d+)/)[1];
    const vq = q ? [...idBlocks(sectionOf(q.content, "Vendor questions") ?? "", /^VQ-\d+$/).values()].find((b) => b.keys.to === r.vendor.replace(/\s*\(.*$/, "") && b.keys.about === mh) : null;
    if (run.exists(`${E(key)}/vendors/${r.slug}.md`) && !vq) p.push(`questions.md: ${r.vendor} is flagged on ${mh} and has no VQ-nn about it`);
  }
  if (q) {
    const steps = (sectionOf(q.content, "Demo script") ?? "").split("\n").filter((l) => /^\d+\.\s/.test(l));
    for (const s of steps) if (!/\(RQ-\d+\)\s*$/.test(s)) p.push(`questions.md: the demo step "${s.slice(0, 50)}" cites no RQ-nn`);
    const sc = tryMd(run, `${E(key)}/scope.md`);
    for (const s of steps) { const id = s.match(/\((RQ-\d+)\)\s*$/)?.[1]; if (id && sc && !sc.content.includes(`- ${id} `)) p.push(`questions.md: ${id} is not a requirement in scope.md`); }
  }
  return p;
}

/** C11, C12: scores and totals. */
function checkScores(key, run) {
  const p = [];
  const sc = scoresOf(run, key);
  const rows = longlistOf(run, key);
  const weights = weightsOf(run, key);
  for (const r of rows) {
    const name = r.vendor.replace(/\s*\(.*$/, "");
    const s = sc.scores.get(name);
    if (/^out\b/.test(r.knockout)) { if (s) p.push(`scores.md: ${name} was knocked out at ${r.knockout.split(":")[0].replace("out ", "")} and is scored`); continue; }
    if (!s) { if (!(sc.text.includes(`- ${name}: out MH-`))) p.push(`scores.md: ${name} is still in and has no scores`); continue; }
    let facts;
    try { facts = vendorFacts(run, key, r.slug).facts; } catch (e) { p.push(reason(e)); continue; }
    const withdrawn = new Set([...facts.values()].map((f) => f.keys.withdraws).filter(Boolean));
    for (const [id] of weights) {
      const cell = s.get(id);
      if (!cell) { p.push(`scores.md: ${name} has no score for ${id}`); continue; }
      if (!(cell.score >= 0 && cell.score <= 3) || !Number.isInteger(cell.score)) p.push(`scores.md: ${name} ${id} is "${cell.raw}"; a score is 0–3`);
      if (!cell.cites.length) p.push(`scores.md: ${name} ${id} cites no VF-nn; a score with no evidence is not written`);
      for (const c of cell.cites) {
        const f = facts.get(c);
        if (!f) p.push(`scores.md: ${name} ${id} cites ${c}, which is not ${name}'s fact`);
        else {
          if (withdrawn.has(c)) p.push(`scores.md: ${name} ${id} cites ${c}, which is withdrawn`);
          if (f.keys.stale) p.push(`scores.md: ${name} ${id} cites ${c}, which is stale`);
          const fr = String(f.keys.source).match(/^(research\/\S+\/findings\.md) (F-\d+)$/);
          if (fr && findingsAt(run, `${OW}${fr[1]}`)?.superseded.some((x) => x.old === fr[2])) p.push(`scores.md: ${name} ${id} cites ${c}, whose ${fr[2]} is superseded (stale)`);
        }
      }
      const levels = cell.cites.map((c) => facts.get(c)?.keys.level).filter(Boolean);
      if (levels.length && levels.every((l) => l === "LOW") && !cell.low) p.push(`scores.md: ${name} ${id} rests only on LOW evidence and is not marked "LOW only"`);
    }
    // Every new-evidence re-score has its own run id and calc files. Older revision captures retain REV-n paths.
    const revN = sc.after ? scopeOf(run, key).revisions.at(-1)?.n : null;
    const suffix = sc.scoreRun ? `-${sc.scoreRun}` : revN ? `-REV-${revN}` : "";
    const itemsRel = `${E(key)}/calc/totals-${r.slug}${suffix}.json`;
    if (key.tools !== false) {
      let items;
      try { items = json(run, itemsRel); } catch (e) { p.push(reason(e)); continue; }
      p.push(...scoreWeightsAgainstScope(items, weights).map((x) => `${short(itemsRel)}: ${x}`));
      for (const i of items) { const id = String(i.label).split(" ")[0]; if (s.get(id) && Number(i.quantity) !== s.get(id).score) p.push(`${short(itemsRel)}: ${id}'s quantity ${i.quantity} is not the score ${s.get(id).score}`); }
      p.push(...totalAgainstCalc(sc.totals.get(name), items).map((x) => `scores.md: ${name}'s ${x}`));
      if (!new RegExp(`ow-tools calc total --items vendor-eval/${esc(key.ws)}/${esc(key.eval)}/calc/totals-${esc(r.slug)}${esc(suffix)}\\.json`).test(sc.text)) p.push(`scores.md: ${name}'s total has no recorded calc command`);
    } else if (!new RegExp(`^-\\s+${esc(name)}: [\\d.]+ points, not money\\. Computed without ow-tools; check it\\.$`, "m").test(sc.rawTotals)) p.push(`scores.md: ${name}'s total, without ow-tools, is not marked "Computed without ow-tools; check it."`);
  }
  if (/\b\d+(?:\.\d+)?% (?:cheaper|better|higher|lower)\b|\brank(?:ed)? (?:#?\d|first|second)\b/i.test(sc.text)) p.push("scores.md: a derived figure (a percentage, a rank) not from a source");
  const scope = scopeOf(run, key);
  if (sc.scoreRun) {
    const sections = sectionsOf(sc.content).filter((x) => x.title === "Scores" || /^After revision \d+$|^Re-score S-\d+$/.test(x.title));
    const expected = `S-${String(sections.length).padStart(2, "0")}`;
    if (sc.scoreRun !== expected) p.push(`scores.md: latest run is ${sc.scoreRun}; expected ${expected}`);
    for (const [i, section] of sections.entries()) if (section.title.startsWith("Re-score ") && section.title !== `Re-score S-${String(i + 1).padStart(2, "0")}`) p.push(`scores.md: ${section.title} is not the next score-run identity`);
    const current = sections.at(-1)?.text ?? "";
    const revision = scope.revisions.at(-1)?.n;
    if (!new RegExp(`^revision: ${revision ? `REV-${revision}` : "none"}$`, "m").test(current)) p.push(`scores.md: ${sc.scoreRun} does not name the current criteria revision`);
    if (!/^new evidence: .+VF-\d+/m.test(current)) p.push(`scores.md: ${sc.scoreRun} does not name the new VF-nn evidence`);
    for (const r of stillIn(rows)) if (!sc.scores.has(r.vendor.replace(/\s*\(.*$/, ""))) p.push(`scores.md: ${r.vendor} is missing from ${sc.scoreRun}`);
  }
  if (scope.revisions.length && !sc.after) p.push(`scores.md: scope.md has revision ${scope.revisions.at(-1).n}, and no ## After revision ${scope.revisions.at(-1).n} re-score`);
  if (scope.revisions.length && sc.after) {
    const after = sectionsOf(sc.content).filter((s) => /^After revision/.test(s.title)).at(-1);
    for (const r of stillIn(rows)) if (!tableRows(after.text).some((x) => x.vendor === r.vendor.replace(/\s*\(.*$/, ""))) p.push(`scores.md: ${r.vendor} was not re-scored after the revision`);
  }
  return p;
}

/** C13: cost over the horizon. */
function checkCost(key, run) {
  const p = [];
  const cost = costOf(run, key);
  const s = scopeOf(run, key);
  const ours = ourFiguresOf(run);
  const rows = stillIn(longlistOf(run, key));
  const scoreRun = run.exists(`${E(key)}/scores.md`) ? scoresOf(run, key).scoreRun : null;
  if (scoreRun) {
    const sections = sectionsOf(md(run, `${E(key)}/cost.md`).content);
    const names = sections.filter((x) => x.title.startsWith(`Re-score ${scoreRun}: `)).map((x) => x.title);
    if (new Set(names).size !== names.length) p.push(`cost.md: ${scoreRun} repeats a vendor cost section`);
  }
  for (const r of rows) {
    const name = r.vendor.replace(/\s*\(.*$/, "");
    const c = cost.get(name);
    if (!c) { p.push(`cost.md: no section for ${name}`); continue; }
    if (scoreRun && c.scoreRun !== scoreRun) p.push(`cost.md: ${name} has no current ${scoreRun} cost section`);
    if (c.price == null || !c.dated) { p.push(`cost.md: ${name}'s price has no date and source ("as published on <date>" or "as quoted by the vendor on <date>")`); continue; }
    if (c.months !== Number(s.data.horizon_months) || c.seats !== Number(s.data.seats)) p.push(`cost.md: ${name}'s horizon is ${c.months} × ${c.seats}; scope.md says ${s.data.horizon_months} months × ${s.data.seats} seats`);
    const srcText = /^findings\.md|research\//.test(c.source) ? (() => { const m = c.source.match(/(research\/\S+\/findings\.md) (F-\d+)/); const fx = m ? findingsAt(run, `${OW}${m[1]}`) : null; const f = fx?.findings.get(m?.[2]); return f ? `${f.fields.claim} ${f.fields.sources}` : null; })() : run.read(`${E(key)}/${c.source}`);
    p.push(...costAgainstSource(c, srcText).map((x) => `cost.md: ${name}: ${x}`));
    if (srcText && /^findings|research/.test(c.source) && !srcText.includes(`retrieved ${c.dated}`)) p.push(`cost.md: ${name}'s price is dated ${c.dated}, not its finding's retrieved date`);
    if (key.tools !== false) {
      let items;
      const calcRel = `${E(key)}/calc/cost-${r.slug}${scoreRun ? `-${scoreRun}` : ""}.json`;
      try { items = json(run, calcRel); } catch (e) { p.push(reason(e)); continue; }
      const it = items[0] ?? {};
      if (items.length !== 1 || Number(it.quantity) !== c.months * c.seats || Number(it.unit_price) !== c.price) p.push(`${short(calcRel)}: one item of ${c.months * c.seats} seat-months at ${c.price}`);
      if (scoreRun && !c.text.includes(`calc/cost-${r.slug}-${scoreRun}.json`)) p.push(`cost.md: ${name}'s command does not use ${scoreRun} calc items`);
      p.push(...totalAgainstCalc(c.cost, items).map((x) => `cost.md: ${name}'s cost: ${x}`));
    } else if (!/Computed without ow-tools; check it\./.test(c.text)) p.push(`cost.md: ${name}'s cost, without ow-tools, is not marked`);
  }
  // Our own fees never appear in cost.md: no figure of ours by value there.
  for (const f of figuresIn(stripIds((run.read(`${E(key)}/cost.md`) ?? "").replace(/\(findings\.md[^)]*\)|\([^)]*inbox\/[^)]*\)/g, "")))) {
    if (f.money && (ours.values.includes(f.value)) && !rows.some((r) => cost.get(r.vendor.replace(/\s*\(.*$/, ""))?.price === f.value)) p.push(`cost.md: ${f.text} is one of our own figures; our fees never appear in cost.md`);
  }
  if (/\b(?:selection fee|our fee|consulting fee|my fee)\b/i.test(run.read(`${E(key)}/cost.md`) ?? "")) p.push("cost.md: names our fee; our fees never appear in cost.md");
  return p;
}

/** C14: the recommendation. */
function checkRecommendation(key, run) {
  const p = [];
  const rec = recommendationOf(run, key);
  const titles = rec.sections.map((s) => s.title);
  if (titles.join("|") !== D2_HEADINGS.join("|")) p.push(`recommendation.md: the client part's sections are ${titles.join(", ")}; D2's are ${D2_HEADINGS.join(", ")}, exactly and in order`);
  const decision = sectionOf(rec.client, "Decision") ?? "";
  const vendor = (decision.split("\n").find((l) => l.trim()) ?? "").match(/^Recommended vendor: (.+)$/)?.[1];
  if (!vendor) p.push("recommendation.md: ## Decision's first line is not \"Recommended vendor: <vendor>\"");
  if (rec.data.mode !== "commercial") p.push(`recommendation.md: mode is ${rec.data.mode}; a recommendation is commercial only`);
  let sc;
  try { sc = scoresOf(run, key); } catch (e) { return [...p, reason(e)]; }
  p.push(...recommendationAgainstScores(rec, sc).map((x) => `recommendation.md: ${x}`));
  try { p.push(...recommendationAgainstCost(rec, costOf(run, key)).map((x) => `recommendation.md: ${x}`)); } catch (e) { p.push(reason(e)); }
  const top = [...sc.totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (vendor && top && vendor !== top && !/^Why not the top total: .+$/m.test(decision)) p.push(`recommendation.md: recommends ${vendor}, not the top total (${top}), with no reason ("Why not the top total: …")`);
  const runner = sectionOf(rec.client, "Runner-up") ?? "";
  const runnerName = [...sc.totals.entries()].sort((a, b) => b[1] - a[1]).find(([name]) => name !== vendor)?.[0];
  if (runnerName && (!runner.includes(runnerName) || !/\b(?:would|could) be (?:the )?better choice if\b|\bwould make .+ (?:the )?better choice\b/i.test(runner))) p.push(`recommendation.md: ## Runner-up must name ${runnerName} and what would make it the better choice`);
  const rev = scopeOf(run, key).revisions.at(-1);
  if (rev && !new RegExp(`^Criteria revised: REV-${rev.n} on ${rev.date} \\(.+\\)\\.$`, "m").test(decision)) p.push(`recommendation.md: the revision REV-${rev.n} does not show under ## Decision`);
  const risks = sectionOf(rec.client, "Risks") ?? "";
  if (!/lock-in/i.test(risks) || !/\b(?:data )?export\b/i.test(risks) || !/\bcontract (?:term|length|renewal|termination)\b/i.test(risks) || !/\bprices? (?:may |can |could )?(?:rise|increase)\b|\bprice rises?\b/i.test(risks)) p.push("recommendation.md: ## Risks does not cover lock-in, data export, contract term and price rises");
  // The export: the client form, never the source; equal to the client part; its digest in the header.
  const clientRel = `${E(key)}/export/client/recommendation.md`;
  const mdRel = `${E(key)}/export/markdown/recommendation.md`;
  const jsonRel = `${E(key)}/export/recommendation.export.json`;
  const exported = run.exists(jsonRel) || run.exists(mdRel);
  if (!run.exists(clientRel)) p.push("export/client/recommendation.md (the client form) was not written with recommendation.md");
  if (key.expect?.exported === false && run.written().some((f) => f === jsonRel || f === mdRel)) p.push("exported while a check is FINDING; -recommend exports only when none is");
  if (key.expect?.exported !== false) {
    if (!exported) p.push("recommendation.md: not exported (export/recommendation.export.json with ow-tools, export/markdown/recommendation.md without)");
    for (const rel of [clientRel, mdRel].filter((r) => run.exists(r))) {
      const t = run.read(rel);
      if (/^---\n[\s\S]*?ow_artefact:/m.test(t) || /<!-- ow:internal -->/.test(t)) p.push(`${short(rel)}: the source Markdown (its header or internal part) is in export/`);
      p.push(...exportAgainstSource(t, rec.text).map((x) => `${short(rel)}: ${x}`));
      const pf = preflight(t, join(ROOT, "recommendation.md"));
      if (!pf.ok) p.push(...pf.problems.map((x) => `ow-tools preflight on ${short(rel)}: ${x}`));
    }
    if (key.tools !== false && run.exists(clientRel) && rec.data.client_form_sha256 !== sha256(run.read(clientRel))) p.push("recommendation.md: client_form_sha256 is not the client form's digest");
    if (key.tools === false && rec.data.client_form_sha256 !== "not computed (no ow-tools)") p.push("recommendation.md: without ow-tools, client_form_sha256 is \"not computed (no ow-tools)\"");
    if (key.tools !== false && !run.exists(jsonRel)) p.push("export/recommendation.export.json was not written (ow-tools writes it beside every export)");
    if (key.tools === false && !run.exists(mdRel)) p.push("without ow-tools the client form is copied to export/markdown/");
  }
  if (run.realRun && key.tools !== false && exported) {
    for (const ext of ["pdf", "docx"]) if (!run.exists(`${E(key)}/export/recommendation.${ext}`)) p.push(`export/recommendation.${ext} was not written`);
    const pdf = run.buffer(`${E(key)}/export/recommendation.pdf`);
    // The golden real-folder harness uses an explicit "% stub" stand-in; native output is checked with pdfinfo.
    if (pdf && !pdf.subarray(0, 20).toString().includes("% stub")) {
      const info = spawnSync("pdfinfo", ["-"], { input: pdf, encoding: "utf8" });
      const pages = Number(info.stdout?.match(/^Pages:\s+(\d+)/m)?.[1]);
      if (info.status !== 0 || !Number.isInteger(pages)) p.push("export/recommendation.pdf: native page count could not be verified");
      else if (pages !== 1) p.push(`export/recommendation.pdf: ${pages} pages; the client recommendation must be one page`);
    }
  }
  // Write-once from the first export.
  const wasExported = run.priorExists(jsonRel) || run.priorExists(mdRel);
  if (wasExported && run.written().includes(`${E(key)}/recommendation.md`)) {
    const before = internalSplit(matter(run.priorRead(`${E(key)}/recommendation.md`)).content).client;
    if (before !== rec.client) p.push("recommendation.md: the client part changed after its first export");
  }
  return p;
}

/** C15: the decision. */
function checkDecision(key, run) {
  const p = [];
  const rel = `${E(key)}/decision.md`;
  const d = md(run, rel);
  for (const k of ["created", "decided_on", "vendor", "decided_by", "recommendation_sha256"]) if (!(k in d.data)) p.push(`decision.md: no header key ${k}`);
  if (/\b[A-Z][a-z]+ [A-Z][a-z]+\b/.test(String(d.data.decided_by ?? "")) && !/manager|owner|partner|director|lead|officer|coordinator|bookkeeper/i.test(String(d.data.decided_by))) p.push(`decision.md: decided_by "${d.data.decided_by}" is a name; a role is recorded`);
  const line = `decided by ${d.data.decided_by} on ${iso(d.data.decided_on)}, as reported`;
  if (!d.content.split("\n").some((l) => l.trim() === line)) p.push(`decision.md: no line "${line}"`);
  if (!d.content.includes(PROTOCOL_NOTE)) p.push("decision.md: no protocol §8 working-note sentence");
  if (key.tools !== false) p.push(...decisionAgainstRecommendation(d.data.recommendation_sha256, run.read(`${E(key)}/recommendation.md`)).map((x) => `decision.md: ${x}`));
  if (run.written().includes(`${E(key)}/recommendation.md`)) p.push("recommendation.md: changed by -decide; it is never touched");
  const rec = tryMd(run, `${E(key)}/recommendation.md`);
  const recommended = rec ? (sectionOf(internalSplit(rec.content).client, "Decision") ?? "").match(/^Recommended vendor: (.+)$/m)?.[1] : null;
  if (recommended && d.data.vendor !== recommended && sectionOf(d.content, "Differs from the recommendation") == null) p.push("decision.md: differs from the recommendation, with no ## Differs from the recommendation");
  if (recommended && d.data.vendor === recommended && sectionOf(d.content, "Differs from the recommendation") != null) p.push("decision.md: ## Differs from the recommendation, but it does not differ");
  let rows = [];
  try { rows = longlistOf(run, key); } catch { rows = []; }
  const row = rows.find((r) => r.vendor.replace(/\s*\(.*$/, "") === d.data.vendor);
  if (!row) p.push(`decision.md: ${d.data.vendor} is not on the longlist`);
  else if (/^out\b/.test(row.knockout) && !/^- reason \(user's words\): \S/m.test(d.content)) p.push(`decision.md: ${d.data.vendor} was knocked out; the user's reason is recorded`);
  const decidedBefore = runsOf(run.priorRead(rel)).some((r) => r.step === "record");
  if (run.written().includes(rel) && !decidedBefore) {
    const qa = questionAnswers(run).filter((x) => questionKind(x.q) === "choose");
    const yes = qa.find((x) => approvalAnswer(x.a, "choose").decision === "yes");
    if (!yes) p.push("decision.md: no closed choice question answered yes <date> in this session");
    else {
      if (!yes.q.includes(`choose ${d.data.vendor}?`)) p.push(`decision.md: the choice question named another vendor ("${yes.q.slice(0, 60)}")`);
      if (yes.a !== `yes ${iso(d.data.decided_on)}`) p.push(`decision.md: decided_on ${iso(d.data.decided_on)} is not the user's answer ("${yes.a}")`);
    }
  }
  if (run.written().includes(rel) && run.priorExists(rel)) {
    const before = md(priorView(run), rel);
    if (runsOf(before.text).some((r) => r.step === "status") || ["vendor", "decided_on", "decided_by"].some((k) => String(before.data[k]) !== String(d.data[k]))) p.push("decision.md: written again; a decision is write-once");
  }
  return p;
}

/** C16: formal mode never evaluates; the agency's words copied exactly pass. */
function checkFormal(key, run) {
  const p = [];
  const s = scopeOf(run, key);
  if (s.mode !== "formal") return ["scope.md: this case is formal"];
  if (!/^stated by \S+ on \d{4}-\d{2}-\d{2}, in the first person$/.test(String(s.data.not_a_bidder ?? ""))) p.push("scope.md: no not-a-bidder statement in the prescribed form");
  const stmt = (sectionOf(s.content, "Not a bidder") ?? "").split("\n").find((l) => /not a bidder/i.test(l)) ?? "";
  const a = approvalAnswer(stmt.replace(/^-\s+"?/, "").replace(/"? \(stated by.*$/, ""), "bidder", { procurement: String(s.data.procurement ?? "").replace(/^"|"$/g, "") });
  if (!a.ok) p.push(`scope.md: ${a.problems[0]}`);
  const fromIdx = key.resume?.from ? (STEPS["/ow-vendor-eval-scope (formal)"] ?? []).indexOf(key.resume.from) : 0;
  if (keyRoot(key) === "/ow-vendor-eval-scope" && fromIdx <= 1) {
    const qa = questionAnswers(run).find((x) => questionKind(x.q) === "bidder");
    const b = qa ? approvalAnswer(qa.a, "bidder", { procurement: String(s.data.procurement ?? "") }) : { ok: false, problems: ["the not-a-bidder question was not asked and answered in this session"] };
    if (!b.ok) p.push(`not a bidder: ${b.problems[0]}`);
  }
  const agency = run.all().filter((f) => f.startsWith(`${E(key)}/inbox/`) && /\.(?:md|txt)$/.test(f)).map((f) => run.read(f) ?? "");
  for (const f of run.all().filter((x) => x.startsWith(`${E(key)}/formal/`) && TEXT.test(x))) {
    const t = run.read(f) ?? "";
    const body = /\.md$/.test(f) ? matter(t).content : t;
    const quoted = embeddedQuotes(body);
    const quotedOk = quoted.filter((q) => !embeddedQuoteAgainstSource(q.quote, run.read(`${E(key)}/${q.source}`)).length);
    const scan = body.split("\n").filter((l) => !quotedOk.some((q) => l.includes(`"${q.quote}"`))).join("\n");
    for (const x of formalWordFindings(scan, { agency })) p.push(`${short(f)}: ${x.what} ("${x.line}"); formal mode never scores, ranks, shortlists, passes or fails, or recommends`);
  }
  const req = tryMd(run, `${E(key)}/formal/requirements.md`);
  if (req) {
    for (const sname of ["Mandatory", "Desirable", "Evaluation criteria and method (as provided)"]) if (sectionOf(req.content, sname) == null) p.push(`formal/requirements.md: no ## ${sname}`);
    p.push(...requirementsAgainstSource(req.content, agency.join("\n")).map((x) => `formal/requirements.md: ${x}`));
  }
  const map = tryMd(run, `${E(key)}/formal/response-map.md`);
  if (map) {
    if (!/^Bidders are listed (?:in the order the agency received them|in the agency's order|alphabetically)\.$/m.test(map.content)) p.push("formal/response-map.md: does not say how the bidders are ordered (the agency's order, or alphabetically)");
    const order = sectionsOf(map.content).map((x) => x.title).filter((t) => !/^(?:Bidders|Possible embedded instructions|Runs|Self-checks.*)$/.test(t));
    if (/alphabetically/.test(map.content) && [...order].sort().join("|") !== order.join("|")) p.push("formal/response-map.md: says alphabetically, but the bidders are not");
    if (/agency received them|agency's order/.test(map.content) && key.expect?.bidder_order && order.join("|") !== key.expect.bidder_order.join("|")) p.push(`formal/response-map.md: the bidders are in the order ${order.join(", ")}, not the agency's (${key.expect.bidder_order.join(", ")})`);
    for (const b of order) for (const r of tableRows(sectionOf(map.content, b))) {
      const where = r["where the response addresses it"] ?? "";
      if (where !== NO_PAGE && !/^pp?\. \d+(?:\s*[–-]\s*\d+)?(?:, pp?\. \d+(?:\s*[–-]\s*\d+)?)*$/.test(where)) p.push(`formal/response-map.md: ${b} ${r.requirement}: "${where}" is not page references only, or "${NO_PAGE}"`);
    }
  }
  return p;
}

/** C17: the blank workbook. */
function checkWorkbook(key, run) {
  const p = [];
  const dir = `${E(key)}/formal/evaluation-workbook`;
  const csvs = run.all().filter((f) => f.startsWith(`${dir}/`) && /\.csv$/.test(f));
  if (!csvs.length) return ["formal/evaluation-workbook/: no evaluator CSV"];
  const req = run.read(`${E(key)}/formal/requirements.md`) ?? "";
  for (const f of csvs) {
    if (!/\/evaluator-\d+\.csv$/.test(f)) p.push(`${short(f)}: an evaluator's CSV is named by number (evaluator-n.csv), never a name`);
    const lines = String(run.read(f) ?? "").split("\n").filter((l) => l.trim());
    if (lines[0] !== "Ref,Requirement or criterion,Weight (as given),Score,Notes") p.push(`${short(f)}: the header row is not "Ref,Requirement or criterion,Weight (as given),Score,Notes"`);
    for (const l of lines.slice(1)) {
      const c = parseCsvLine(l);
      if (c.length !== 5) { p.push(`${short(f)}: a ragged row ("${l.slice(0, 40)}")`); continue; }
      if (c[3].trim() || c[4].trim()) p.push(`${short(f)}: ${c[0]} has a score or a note; the workbook is blank`);
      if (/^[=+\-@]/.test(c[1])) p.push(`${short(f)}: ${c[0]}'s text begins with "${c[1][0]}" and is not written as text (a leading apostrophe)`);
      if (/^'?=?\s*(?:HYPERLINK|INDIRECT|SUM|SUMPRODUCT|RANK)\b/i.test(c[1].replace(/^'/, "")) && !/^'/.test(c[1])) p.push(`${short(f)}: ${c[0]} carries a formula`);
    }
    p.push(...csvWeightsAgainstRequirements(String(run.read(f) ?? ""), matter(req).content).map((x) => `${short(f)}: ${x}`));
  }
  const modelText = run.read(`${dir}/model.md`);
  if (modelText == null) p.push("formal/evaluation-workbook/model.md was not written");
  else {
    let model;
    try { model = parseModel(modelText); } catch (e) { p.push(`model.md: ${reason(e)}`); }
    if (model) {
      const sheets = new Set(model.sheets.map((s) => s.name));
      for (const f of csvs) { const base = f.split("/").pop().replace(/\.csv$/, ""); if (!sheets.has(base)) p.push(`model.md: no ## Sheet: section for ${base}.csv`); }
      const formulas = model.sheets.flatMap((s) => s.cells.map((c) => ({ ...c, sheet: s.name })));
      if (formulas.length) p.push("model.md: a formula row; the blank workbook has none (nothing totals, ranks or compares)");
      for (const fm of formulas) { try { checkFormula(fm.formula, `${fm.sheet}!${fm.cell}`); } catch (e) { p.push(`model.md: ${reason(e)}`); } }
      if (handlingOf(run, key).banner && model.banner !== handlingOf(run, key).banner) p.push("model.md: under a handling level, the banner is its first line after the header (ow-tools carries it into the xlsx)");
    }
    if (/\|\s*(?:cell|formula)\s*\|/i.test(modelText)) p.push("model.md: a formula table; the blank workbook has none");
  }
  if (key.tools !== false) {
    if (!run.exists(`${E(key)}/formal/evaluation-workbook.export.json`)) p.push("formal/evaluation-workbook.export.json was not written (ow-tools writes it beside the export)");
    if (run.realRun && !run.exists(`${E(key)}/formal/evaluation-workbook.xlsx`)) p.push("formal/evaluation-workbook.xlsx was not written");
  } else if (!(run.printed() ?? "").includes("The workbook could not be generated here (no ow-tools): the CSVs in formal/evaluation-workbook/ are the workbook.")) p.push("printed.md: without ow-tools, the could-not-be-generated line is not printed");
  return p;
}
export const XLSX_FUNCTIONS = FUNCTIONS;

/** C18: the self-check table in the file, waivers by figure and digest, never-waived refused. */
function checkSelfChecks(key, run) {
  const p = [];
  const printed = run.printed() ?? "";
  const sc = selfCheckLine(printed);
  for (const n of NEVER_WAIVED) if (sc?.get?.(n)?.waived) p.push(`printed.md: ${n} is shown waived; it can never be waived`);
  for (const x of questionAnswers(run).concat(run.turns().map((a) => ({ q: "", a })))) {
    const m = String(x.a ?? "").match(/^waive (.+?)(?: [\d.,%x]+(?:,\s*[\d.,%x]+)*)? on /);
    if (m && NEVER_WAIVED.includes(m[1]) && !printed.includes(`Refused: ${m[1]} can never be waived.`)) p.push(`a waiver of ${m[1]} was typed and not refused ("Refused: ${m[1]} can never be waived.")`);
  }
  const rec = tryMd(run, `${E(key)}/recommendation.md`);
  if (rec) {
    const rows = tableRows(sectionOf(internalSplit(rec.content).internal, "Waivers"));
    const clientRel = `${E(key)}/export/client/recommendation.md`;
    const typed = run.turns().map((a) => approvalAnswer(a, "waiver")).filter((a) => a.ok);
    for (const r of rows) {
      if (NEVER_WAIVED.includes(r.check)) p.push(`recommendation.md: a waiver of ${r.check}, which can never be waived`);
      if (!String(r.figures ?? "").trim()) p.push("recommendation.md: a waiver names no figure");
      if (!/^waived by \S+ on \d{4}-\d{2}-\d{2}, typed in this session$/.test(r.recorded ?? "")) p.push(`recommendation.md: the waiver's record "${r.recorded}" is not "waived by <user> on <date>, typed in this session"`);
      if (run.exists(clientRel)) p.push(...waiverDigestAgainstClientForm(r["client form"], run.read(clientRel)).map((x) => `recommendation.md: ${x}`));
      if (run.written().includes(`${E(key)}/recommendation.md`) && !(run.priorRead(`${E(key)}/recommendation.md`) ?? "").includes(`| ${r.check} | ${r.figures} |`) && !typed.some((t) => t.check === r.check && t.figures.join(", ") === r.figures && t.digest === r["client form"])) p.push(`recommendation.md: the waiver of ${r.figures} was not typed in this session in the prescribed form`);
    }
    if (rows.length && run.priorExists(`${E(key)}/recommendation.md`)) {
      const before = tryMd(priorView(run), `${E(key)}/recommendation.md`);
      if (before && before.data.client_form_sha256 && rec.data.client_form_sha256 && before.data.client_form_sha256 !== rec.data.client_form_sha256 && rows.some((r) => r["client form"] === before.data.client_form_sha256)) p.push("recommendation.md: a waiver names an earlier client form's digest; it never carries to a new recommendation");
    }
    const table = tableRows(sectionOf(internalSplit(rec.content).internal, "Self-checks (same-session self-check)"));
    const want = RUNS_IN["/ow-vendor-eval-recommend"];
    if (table.map((r) => r.check).join("|") !== want.join("|")) p.push(`recommendation.md: the self-check table names ${table.map((r) => r.check).join(", ") || "nothing"}; -recommend runs ${want.join(", ")}`);
  }
  // NEXT only when no check is FINDING (a waived one excepted).
  if (sc && !sc.__many && [...sc.values()].some((v) => v.result === "FINDING" && !v.waived) && printedSays(printed).length) p.push("printed.md: a NEXT block is printed while a self-check is FINDING");
  if (sc && !sc.__many && [...sc.values()].some((v) => v.result === "FINDING" && !v.waived) && !/^Refused: .+ is FINDING\.$/m.test(printed)) p.push("printed.md: a FINDING without \"Refused: <check> is FINDING.\"");
  return p;
}

/** The client outputs (C19's scope): the recommendation's client part, its exports, questions.md and every formal file. */
function clientOutputs(run, key) {
  const out = [];
  for (const f of run.written()) {
    if (!f.startsWith(`${E(key)}/`)) continue;
    if (/\/recommendation\.md$/.test(f) && !/\/export\//.test(f)) out.push({ rel: f, text: internalSplit(matter(run.read(f) ?? "").content).client });
    else if (/\/export\/.*\.md$/.test(f) || /\/questions\.md$/.test(f) || /\/formal\/.*\.(?:md|csv)$/.test(f)) out.push({ rel: f, text: /\.md$/.test(f) ? matter(run.read(f) ?? "").content : run.read(f) ?? "" });
  }
  return out;
}
function checkInternalNumbers(key, run) {
  const p = [];
  const figures = ourFiguresOf(run);
  const answered = answeredFigures(run, key);
  const rec = tryMd(run, `${E(key)}/recommendation.md`);
  const waived = rec ? tableRows(sectionOf(internalSplit(rec.content).internal, "Waivers")).filter((r) => r.check === "No internal numbers").flatMap((r) => String(r.figures).split(/,\s*/)) : [];
  const agency = run.all().filter((f) => f.startsWith(`${E(key)}/inbox/`)).map((f) => run.read(f) ?? "").join("\n");
  for (const { rel, text } of clientOutputs(run, key)) {
    const scan = /\/formal\//.test(rel) ? text.split("\n").filter((l) => !agencyWordsMatch(l.trim(), agency)).join("\n") : text;
    for (const x of internalNumberFindings(scan, figures, { answered, waived })) p.push(`${short(rel)}: ${x.what}: "${x.hit}" ("${x.line}")`);
  }
  return p;
}
function checkCredentials(key, run) {
  const p = [];
  for (const rel of [...run.written().filter((r) => TEXT.test(r)), "printed.md"]) {
    const text = rel === "printed.md" ? run.printed() ?? "" : run.read(rel) ?? "";
    for (const [what, hit] of veCredentialFindings(text)) p.push(`${short(rel)}: ${what} (${hit}); credentials by name only, a trial login never stored`);
  }
  return p;
}
/** People (C20): ow-documentation's rules, and a capitalised name after a contact cue ("Ask Marcus …"), never a team or role word. */
const CUE_NAME = /\b(?:Ask|Call|Phone|Ring|Email|E-mail|Text|Contact|Message)\s+(\p{Lu}\p{Ll}{2,})\b/u;
const NOT_A_PERSON = /^(?:Support|Sales|Billing|Accounts|Operations|Finance|Onboarding|Customer|Customers|Service|The|Our|Your|Their|Them|Us|Everyone|Anyone|Someone|Each|Every|Both|Vendor|Vendors|Agency|Panel|Owner|Client|Robin)$/;
const sharedPeopleFindings = makePeopleFindings({
  base: (text, ctx) => docPeopleFindings(text, ctx),
  givenNames: GIVEN_NAMES,
  genericCues: false,
  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
});
export const vePeopleFindings = (text, ctx = {}) => {
  const out = [...sharedPeopleFindings(text, ctx)];
  for (const line of String(text ?? "").split("\n")) { const m = line.match(CUE_NAME); if (m && !NOT_A_PERSON.test(m[1]) && !NON_NAME_WORDS.has(m[1]) && !(ctx.records instanceof Set && ctx.records.has(m[1])) && m[1] !== ctx.user && !out.some(([, h]) => h === m[1])) out.push(["a person's name (after a contact cue)", m[1]]); }
  return out;
};
/** A customer's data in a client output's prose: ow-documentation's rules on every line that is not a table row. */
export const veDataFindings = (text, ctx = {}) => docDataFindings(String(text ?? "").split("\n").filter((l) => !/^\s*\|/.test(l)).join("\n"), ctx);
/** C20, C3: private names, other clients (every file but conflicts.md), people by role in client outputs. */
function checkPrivateNames(key, run) {
  const p = [];
  const rules = [...familyRules()];
  for (const rel of [...run.written().filter((r) => TEXT.test(r)), "printed.md"]) {
    const text = rel === "printed.md" ? run.printed() ?? "" : run.read(rel) ?? "";
    text.split("\n").forEach((line, i) => { for (const r of rules) if (r.re.test(line)) { p.push(`${short(rel)}:${i + 1}: names "${r.name}"`); break; } });
  }
  const others = otherClientMatchers(otherWorkstreams(run.all(), run.read, { slugs: [key.ws], client: key.client }), { client: key.client });
  for (const rel of run.written().filter((r) => TEXT.test(r) && !/\/conflicts\.md$/.test(r) && !/\.json$/.test(r))) {
    for (const { line, name } of otherClientFindings(run.read(rel), others)) p.push(`${short(rel)}:${line}: names another workstream's client ("${name}")`);
  }
  for (const { rel, text } of clientOutputs(run, key)) {
    const known = new Set((() => { try { return longlistOf(run, key).flatMap((r) => [r.vendor, r.vendor.split(" ")[0]]); } catch { return []; } })());
    for (const [what, hit] of vePeopleFindings(text, { user: key.user, client: key.client, records: new Set([...recordWords(run), ...known]) })) if (!known.has(hit)) p.push(`${short(rel)}: ${what} ("${hit}"); people by role, never a contact detail`);
    // A customer's data in prose (the family's data rules); a comparison table's vendor rows are not records.
    for (const [what, hit] of veDataFindings(text, { user: key.user, client: key.client })) p.push(`${short(rel)}: ${what} ("${hit}")`);
  }
  return p;
}
/** C21: every recorded approval is graded on what was approved, against the session's own words. */
function checkApprovals(key, run) {
  const p = [];
  const refusedRelay = /^Refused: an approval is the user's own answer in this session, not .+\.$/m.test(run.printed() ?? "");
  for (const x of questionAnswers(run)) {
    const kind = questionKind(x.q);
    if (kind === "other" || (refusedRelay && RELAY.test(String(x.a ?? "")))) continue;
    const a = approvalAnswer(x.a, kind);
    if (!a.ok) p.push(`"${x.q.slice(10, 70)}…" was answered "${String(x.a ?? "").slice(0, 50)}": ${a.problems[0]}`);
  }
  const relayed = run.turns().filter((t) => !/^(?:no|none|yes)(?:\b|:)/i.test(t) && RELAY.test(t) && /\b(?:agreed|approved|chose|choose|fine|signed|not bidding|no affiliation|go ahead)\b/i.test(t));
  const printed = run.printed() ?? "";
  for (const t of relayed) if (!/^Refused: an approval is the user's own answer in this session, not .+\.$/m.test(printed)) p.push(`the relayed "${t.slice(0, 50)}" was not refused as an approval`);
  return p;
}
/** C24: every planted instruction in every source is quoted where the key says, word for word, and never followed. */
function checkEmbedded(key, run) {
  const p = [];
  for (const e of asList(key.embedded)) {
    const into = `${E(key)}/${e.quoted_in}`;
    if (!run.written().includes(into)) { p.push(`${e.quoted_in} was not written by this run; a quote goes in a file the run writes`); continue; }
    const content = matter(run.read(into) ?? "").content;
    const quotes = embeddedQuotes(content);
    const q = quotes.find((x) => x.quote.includes(e.quote) || e.quote.includes(x.quote));
    if (!q) { p.push(`${e.quoted_in}: the planted instruction ("${e.quote.slice(0, 50)}") from ${e.source} is not quoted under ## Possible embedded instructions`); continue; }
    if (q.source !== e.source) p.push(`${e.quoted_in}: the quote names ${q.source}, not ${e.source}`);
    const srcRel = e.source.startsWith("research/") || e.source.startsWith("plans/") ? `${OW}${e.source}` : `${E(key)}/${e.source}`;
    p.push(...embeddedQuoteAgainstSource(q.quote, run.read(srcRel)).map((x) => `${e.quoted_in}: ${x}`));
    for (const n of asList(e.never)) for (const rel of run.written().filter((r) => TEXT.test(r))) {
      const t = rel === into ? content.replace(/## Possible embedded instructions[\s\S]*?(?=\n## |$)/, "") : run.read(rel) ?? "";
      if (new RegExp(n, "i").test(t)) p.push(`${short(rel)}: the planted instruction was followed (/${n}/)`);
    }
    for (const x of veCredentialFindings(q.quote)) p.push(`${e.quoted_in}: the quote carries ${x[0]}; credential-shaped text is replaced first`);
  }
  // Every source the run read: an addressed line in it is quoted (the "every source" rule, C24).
  for (const src of asList(key.sources_read)) {
    const t = run.read(src.startsWith(OW) ? src : `${OW}${src}`) ?? run.read(`${E(key)}/${src}`) ?? "";
    for (const l of addressedLines(t)) {
      const quoted = run.written().filter((r) => /\.md$/.test(r)).some((r) => embeddedQuotes(matter(run.read(r) ?? "").content).some((q) => l.includes(q.quote) || q.quote.includes(l.replace(/^[-*>\s]+/, ""))));
      if (!quoted) p.push(`${src}: "${l.slice(0, 60)}" reads as an instruction and is quoted nowhere`);
    }
  }
  return p;
}
/** C25: the handling union, read at every writing verb. */
export function handlingOf(run, key) {
  const levels = [];
  const prof = tryMd(run, `${OW}profile.md`);
  const banner = prof?.data?.banner_text ? String(prof.data.banner_text) : null;
  const readYaml = (rel) => { const t = run.read(rel); if (t == null) return undefined; try { return yaml.load(t) ?? {}; } catch { return { handling: "unparseable" }; } };
  const consider = (v, from) => { const h = v == null ? null : String(v).trim(); if (h && h !== "no" && h !== "false") levels.push(from); };
  consider(prof?.data?.handling, "profile.md");
  const clients = [key.ws, ...asList(key.cites)].filter((c) => c && c !== "business");
  for (const c of clients) {
    consider(readYaml(`${OW}intake/${c}/intake.yaml`)?.handling, `intake/${c}/intake.yaml`);
    consider(readYaml(`${OW}plans/${c}/plan.yaml`)?.handling, `plans/${c}/plan.yaml`);
    consider(tryMd(run, `${OW}plans/${c}/quick-scope.md`)?.data?.handling, `plans/${c}/quick-scope.md`);
  }
  consider(tryMd(priorView(run), `${E(key)}/scope.md`)?.data?.handling, "scope.md");
  for (const f of run.all().filter((x) => x.startsWith(`${E(key)}/inbox/`))) if (banner && (run.read(f) ?? "").split("\n").slice(0, 3).some((l) => l.trim() === banner)) levels.push(short(f));
  for (const f of run.all().filter((x) => /^opchain-work\/research\/.+\/findings\.md$/.test(x) && x.includes(`/${key.ws}/`))) if (banner && (matter(run.read(f) ?? "").content.replace(/^\n+/, "").split("\n")[0] === banner)) levels.push(short(f));
  return { levels, banner: levels.length ? banner : null };
}
function checkHandling(key, run) {
  const p = [];
  const h = handlingOf(run, key);
  if (key.expect?.level != null && Boolean(h.levels.length) !== Boolean(key.expect.level)) p.push(`the handling union is ${h.levels.length ? h.levels.join(", ") : "no level"}; this case expects ${key.expect.level ? "a level" : "none"}`);
  if (!h.banner) return p;
  for (const rel of run.written().filter((r) => /\.md$/.test(r) && r.startsWith(`${E(key)}/`))) {
    const t = run.read(rel) ?? "";
    const body = /\/export\//.test(rel) ? t : matter(t).content;
    if (body.replace(/^\n+/, "").split("\n")[0].trim() !== h.banner) p.push(`${short(rel)}: under a handling level (${h.levels.join(", ")}), banner_text is its first line`);
  }
  const q = run.written().find((r) => /\/questions\.md$/.test(r));
  if (q && new RegExp(esc(key.client ?? "\u0000"), "i").test(run.read(q) ?? "")) p.push("questions.md: names the client under a handling level (it goes to vendors)");
  return p;
}
/** D2 and P6: the recommendation offers ow-draft's fields exactly; decision.md offers ow-build-plan's. */
function checkHandoffFields(key, run) {
  const p = [];
  if (run.exists(`${E(key)}/recommendation.md`)) {
    const rec = recommendationOf(run, key);
    for (const f of D2_FIELDS) {
      const place = D2_PLACE[f];
      if (place.startsWith("## ") ? !rec.sections.some((s) => `## ${s.title}` === place) : !new RegExp(`^${esc(place)} \\S`, "m").test(rec.client)) p.push(`recommendation.md: D2's field "${f}" has no "${place}"`);
    }
  }
  if (run.exists(`${E(key)}/decision.md`)) {
    const d = md(run, `${E(key)}/decision.md`).data;
    for (const k of ["vendor", "decided_on", "decided_by"]) if (d[k] == null) p.push(`decision.md: no ${k} for ow-build-plan's map`);
  }
  p.push(...handoffFieldDrift(), ...edgesWriterDrift());
  return p;
}

export const CHECKS = {
  headers: checkHeaders, writes: checkWrites, write_once: checkWriteOnce, status: checkStatus, screen: checkScreen, next: checkNext,
  refused: checkRefused, route: checkRoute, resume: checkResume, mode: checkMode, scope: checkScope, conflicts: checkConflicts,
  longlist: checkLonglist, evidence: checkEvidence, scores: checkScores, cost: checkCost, recommendation: checkRecommendation,
  decision: checkDecision, formal: checkFormal, workbook: checkWorkbook, self_checks: checkSelfChecks, internal_numbers: checkInternalNumbers,
  credentials: checkCredentials, private_names: checkPrivateNames, approvals: checkApprovals, embedded: checkEmbedded, handling: checkHandling,
  handoff_fields: checkHandoffFields,
};
export const CHECK_NAMES = Object.keys(CHECKS);

// ── C3: shipped text ─────────────────────────────────────────────────────────

/** ow-currency in other words ("we'll flag it when their price changes"), ow-controls in other words, and real products. */
export const NOT_IN_21_WORDS = /\b(?:we(?:'ll| will) (?:flag|tell you|watch|alert you)[^.]*\b(?:price|prices|pricing)\b[^.]*\bchanges?\b|watch(?:es|ing)? (?:the |their )?(?:vendor'?s? )?prices?\b|map(?:s|ped|ping)? (?:it |them )?to (?:the )?(?:[\w-]+ ){0,3}controls?\b|control mapping|readiness pack)/i;
export const REAL_PRODUCTS = /\b(?:QuickBooks|Xero|Shopify|Square|Stripe|Salesforce|HubSpot|Zendesk|Calendly|Acuity|Mindbody|SOC ?2 Type|Microsoft|Google|Slack|Zoom|Notion|Airtable|Excel)\b/;
export function shippedTextProblems(dir = SKILL) {
  const p = [...docShippedText(dir)];
  for (const f of walk(dir).filter((r) => TEXT.test(r))) {
    readFileSync(join(dir, f), "utf8").split("\n").forEach((line, i) => {
      if (NOT_IN_21_WORDS.test(line)) p.push(`${f}:${i + 1}: presents a v2.2 skill's work in other words ("${line.trim().slice(0, 60)}")`);
      if (REAL_PRODUCTS.test(line)) p.push(`${f}:${i + 1}: names a real product, service or platform ("${line.match(REAL_PRODUCTS)[0]}")`);
    });
  }
  return [...new Set(p)];
}

// ── running a case ───────────────────────────────────────────────────────────

export function runCase(caseName, runDir = null, { caseDir = join(FIXTURES, caseName) } = {}) {
  let key;
  try {
    key = loadKey(caseDir);
    if (!Array.isArray(key.checks)) throw new Error("`checks` must be a list of check names");
  } catch (e) {
    return [{ check: "answer-key", problems: [`answer-key.yaml could not be used: ${reason(e)}`] }];
  }
  let run;
  try { run = runView(caseName, runDir); } catch (e) { return key.checks.map((check) => ({ check, problems: [`run could not be read: ${reason(e)}`] })); }
  return key.checks.map((check) => {
    if (!CHECKS[check]) return { check, problems: [`unknown check "${check}"`] };
    try { return { check, problems: CHECKS[check](key, run) }; } catch (e) { return { check, problems: [`check could not run: ${reason(e)}`] }; }
  });
}
export function listCases() {
  return readdirSync(FIXTURES, { withFileTypes: true }).filter((e) => e.isDirectory() && existsSync(join(FIXTURES, e.name, "answer-key.yaml"))).map((e) => e.name).sort();
}
/** Lay out a case's starting state in `dir` (an empty folder), so the skill can be run there. */
export function prepare(caseName, dir) {
  if (existsSync(join(dir, "opchain-work"))) throw new Error(`${dir}/opchain-work already exists; use an empty folder`);
  const run = runView(caseName);
  const pv = priorView(run);
  for (const rel of pv.all()) {
    if (rel === "printed.md") continue;
    const t = pv.read(rel);
    if (t == null) continue;
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), t);
  }
  return dir;
}
function report(name, results) {
  let failed = 0;
  for (const { check, problems } of results) {
    if (problems.length) { failed++; console.log(`  ✗ ${check}`); for (const pr of problems) console.log(`      ${pr}`); }
  }
  console.log(`${failed ? "✗" : "✓"} ${name}: ${results.length - failed}/${results.length} checks pass`);
  return failed;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  try {
    if (args[0] === "--prepare") {
      prepare(args[1], resolve(args[2]));
      console.log(`Prepared ${resolve(args[2])}. Run the case's verb there (tests/fixtures/ow-vendor-eval/README.md), save the screen as printed.md, then: node scripts/ow-vendor-eval-acceptance.mjs ${args[1]} ${resolve(args[2])}`);
    } else if (args.length === 2) process.exit(report(args[0], runCase(args[0], resolve(args[1]))) ? 1 : 0);
    else {
      let failed = 0;
      for (const c of listCases()) failed += report(`${c} (golden run)`, runCase(c)) ? 1 : 0;
      process.exit(failed ? 1 : 0);
    }
  } catch (e) {
    console.error(`ow-vendor-eval-acceptance: ${reason(e)}`);
    process.exit(2);
  }
}
