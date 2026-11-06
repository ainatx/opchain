// opchain.work — build-time helpers for the /work section.
//
// Reads the `work` content collection (skills-work/<id>/SKILL.md, defined in
// content.config.ts) and each skill's skill.edges.yaml, the ow- cross-talk
// contract's edge data (skills-work/README.md "Edges"). Everything here runs at
// build; nothing reaches the browser. The ow- catalog is in no oc- output, so
// this module never imports lib/skills.ts, and the two catalogs' counts are
// never summed.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { getCollection, type CollectionEntry } from "astro:content";
import { STAGES, WORK_SKILLS, type Stage } from "../data/work";

export type WorkEntry = CollectionEntry<"work">;

// ── repository paths ────────────────────────────────────────────────────────

/** Walk up from this file until catalogs.json is found (robust to Vite bundling depth). */
export function resolveRepoRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    if (existsSync(path.join(dir, "catalogs.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(process.cwd(), "..");
}

/** The ow- catalog directory: OPCHAIN_WORK_SKILLS_DIR or <repo>/skills-work (catalogs.json `dirEnv`). */
export function workSkillsDir(): string {
  return process.env.OPCHAIN_WORK_SKILLS_DIR
    ? path.resolve(process.env.OPCHAIN_WORK_SKILLS_DIR)
    : path.join(resolveRepoRoot(), "skills-work");
}

interface CatalogsFile {
  catalogs: Array<{ id: string; planned?: string[]; addons?: Record<string, string[]>; brandNames?: string[]; privateNames?: string[] }>;
}

function owCatalog() {
  const file = path.join(resolveRepoRoot(), "catalogs.json");
  const parsed = JSON.parse(readFileSync(file, "utf8")) as CatalogsFile;
  const ow = parsed.catalogs.find((c) => c.id === "ow");
  if (!ow) throw new Error("catalogs.json: no `ow` catalog");
  return ow;
}

/** Family skills not built yet (catalogs.json `ow.planned`). Never named on a /work page. */
export function plannedIds(): string[] {
  return [...(owCatalog().planned ?? [])];
}

/** Add-ons the family hands files to (catalogs.json `ow.addons`): today ow-tools. */
export function addonIds(): string[] {
  return Object.keys(owCatalog().addons ?? {});
}

// ── the collection ──────────────────────────────────────────────────────────

function stageIndex(id: string): number {
  const stage = WORK_SKILLS[id]?.stage;
  const i = STAGES.findIndex((s) => s.key === stage);
  return i === -1 ? STAGES.length : i;
}

/** Every ow- skill, in stage order (cross-stage last), then by id. */
export async function getAllWorkSkills(): Promise<WorkEntry[]> {
  const entries: WorkEntry[] = await getCollection("work");
  return entries.sort((a: WorkEntry, b: WorkEntry) => {
    const d = stageIndex(a.data.name) - stageIndex(b.data.name);
    return d !== 0 ? d : a.data.name.localeCompare(b.data.name);
  });
}

export async function getWorkSkill(id: string): Promise<WorkEntry | undefined> {
  const entries: WorkEntry[] = await getCollection("work");
  return entries.find((e: WorkEntry) => e.data.name === id);
}

export function stageOf(id: string): Stage {
  const key = WORK_SKILLS[id]?.stage ?? "cross-stage";
  return STAGES.find((s) => s.key === key) ?? STAGES[STAGES.length - 1];
}

/** `metadata.commands` is one space-separated string in Agent Skills frontmatter. */
export function commandsOf(entry: WorkEntry): string[] {
  return entry.data.metadata.commands.trim().split(/\s+/).filter(Boolean);
}

// ── skill.edges.yaml ────────────────────────────────────────────────────────

export interface EdgeWrite { path: string; verb: string; modes?: string[]; append?: boolean; once?: boolean; seeded_by?: string }
export interface EdgeRead {
  from: string;
  path: string;
  fields?: string[];
  if_absent?: string;
  if_mismatch?: string;
  shared?: boolean;
  in_place?: boolean;
  index?: boolean;
  named?: boolean;
}
export interface EdgeHandoff {
  when: string;
  to?: string;
  destination?: string;
  verb?: string;
  say?: string;
  files?: Array<{ path: string; fields?: string[]; in_place?: boolean }>;
  if_unavailable?: string;
}
export interface EdgesFile {
  schema: number;
  skill: string;
  routes?: { verb: string; reference: string; paths: string[] };
  writes?: EdgeWrite[];
  append_logs?: string[];
  reads?: EdgeRead[];
  hands_off?: EdgeHandoff[];
}

export function readEdges(id: string): EdgesFile {
  const file = path.join(workSkillsDir(), id, "skill.edges.yaml");
  const parsed = yaml.load(readFileSync(file, "utf8")) as EdgesFile;
  if (!parsed || parsed.skill !== id) throw new Error(`${file}: skill must be ${id}`);
  return parsed;
}

/** One row of the reads table on /work/<id>: a source and the files read from it. */
export interface ReadGroup {
  from: string;
  /** "skill" (a family skill), "addon", "user" (files the user owns), "any" (any workspace file). */
  kind: "skill" | "addon" | "user" | "any";
  rows: EdgeRead[];
}

/** One row of the hands-off table: who receives, on what, when. */
export interface HandoffRow {
  to: string;
  kind: "skill" | "addon" | "destination";
  verb: string;
  when: string;
}

export interface SkillEdges {
  /** Files this skill writes, grouped by the verb that writes them. */
  writes: Array<{ verb: string; paths: string[] }>;
  appendLogs: string[];
  /** What it reads from others (its own files and planned skills left out). */
  reads: ReadGroup[];
  /** Where it hands work (its own verbs left out). */
  handsOff: HandoffRow[];
  /** The verb other skills hand files to, and the paths it routes. */
  routes?: { verb: string; paths: string[] };
}

const PLACEHOLDER_ORDER = ["user", "any"];

/**
 * The edges of one skill, shaped for its page. A `planned` skill (catalogs.json)
 * is left out of every table: nothing under /work names a skill that is not
 * built (scripts/check-release-surfaces.mjs probes the built HTML for that).
 */
export function skillEdges(id: string): SkillEdges {
  const e = readEdges(id);
  const planned = new Set(plannedIds());
  const addons = new Set(addonIds());
  const byVerb = new Map<string, string[]>();
  for (const w of e.writes ?? []) {
    const verb = w.modes?.length ? `${w.verb} (${w.modes.join(" ")})` : w.verb;
    const list = byVerb.get(verb) ?? [];
    if (!list.includes(w.path)) list.push(w.path);
    byVerb.set(verb, list);
  }
  const groups = new Map<string, ReadGroup>();
  for (const r of e.reads ?? []) {
    if (!r.from || r.from === id || planned.has(r.from)) continue;
    const kind: ReadGroup["kind"] = r.from === "user" ? "user" : r.from === "any" ? "any" : addons.has(r.from) ? "addon" : "skill";
    const g = groups.get(r.from) ?? { from: r.from, kind, rows: [] };
    g.rows.push(r);
    groups.set(r.from, g);
  }
  const reads = [...groups.values()].sort((a, b) => {
    const pa = PLACEHOLDER_ORDER.indexOf(a.from), pb = PLACEHOLDER_ORDER.indexOf(b.from);
    if (pa !== pb) return (pa === -1 ? -1 : pa) - (pb === -1 ? -1 : pb);
    return stageIndex(a.from) - stageIndex(b.from) || a.from.localeCompare(b.from);
  });
  const handsOff: HandoffRow[] = [];
  for (const h of e.hands_off ?? []) {
    if (h.to === id) continue;
    if (h.to && planned.has(h.to)) continue;
    if (h.to) handsOff.push({ to: h.to, kind: addons.has(h.to) ? "addon" : "skill", verb: h.verb ?? "", when: h.when });
    else if (h.destination) handsOff.push({ to: h.destination, kind: "destination", verb: "", when: h.when });
  }
  return {
    writes: [...byVerb.entries()].map(([verb, paths]) => ({ verb, paths })),
    appendLogs: e.append_logs ?? [],
    reads,
    handsOff,
    routes: e.routes ? { verb: e.routes.verb, paths: e.routes.paths } : undefined,
  };
}

// ── the family graph (for the opchain.work architecture diagram) ───────────

export interface FamilyEdge {
  from: string;
  to: string;
  /** Every `when:` the producer hands off on. */
  whens: string[];
  /** The receiving verbs. */
  verbs: string[];
}

/**
 * Every hand-off between two built family skills, one edge per ordered pair.
 * Reads are not edges here: the contract makes each handed-off file a reads
 * row on the receiver, so hands_off already carries the direction of work.
 */
export function familyEdges(ids: string[]): FamilyEdge[] {
  const built = new Set(ids);
  const map = new Map<string, FamilyEdge>();
  for (const id of ids) {
    for (const h of readEdges(id).hands_off ?? []) {
      if (!h.to || h.to === id || !built.has(h.to)) continue;
      const key = `${id}→${h.to}`;
      const edge = map.get(key) ?? { from: id, to: h.to, whens: [], verbs: [] };
      if (!edge.whens.includes(h.when)) edge.whens.push(h.when);
      if (h.verb && !edge.verbs.includes(h.verb)) edge.verbs.push(h.verb);
      map.set(key, edge);
    }
  }
  return [...map.values()];
}

/** Which family skills hand files to an add-on (ow-tools), with the verb. */
export function addonEdges(ids: string[]): Array<{ from: string; to: string; verb: string }> {
  const addons = new Set(addonIds());
  const out: Array<{ from: string; to: string; verb: string }> = [];
  for (const id of ids) {
    for (const h of readEdges(id).hands_off ?? []) {
      if (!h.to || !addons.has(h.to)) continue;
      if (!out.some((o) => o.from === id && o.to === h.to && o.verb === (h.verb ?? ""))) out.push({ from: id, to: h.to, verb: h.verb ?? "" });
    }
  }
  return out;
}

// ── the body's "## Verbs" table ─────────────────────────────────────────────

export interface VerbRow { verb: string; does: string }

/**
 * The "## Verbs" table of a SKILL.md body, as (verb, what it does) pairs. The
 * ow- skills share the table shape (Verb | Does | Writes, some with When or
 * Reference); the "Does" column is used when present, else "Writes". Cells
 * keep their backticks; the page renders them as <code>.
 */
export function verbsTable(body: string): VerbRow[] {
  const m = body.match(/^## Verbs[^\n]*\n([\s\S]*?)(?=^## |\n*$)/m);
  if (!m) return [];
  const lines = m[1].split("\n").filter((l) => l.trim().startsWith("|"));
  if (lines.length < 2) return [];
  const cells = (l: string) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  const header = cells(lines[0]).map((h) => h.toLowerCase());
  let col = header.findIndex((h) => h === "does");
  if (col === -1) col = header.findIndex((h) => h.startsWith("writes"));
  if (col === -1) col = header.length - 1;
  const rows: VerbRow[] = [];
  for (const line of lines.slice(2)) {
    const c = cells(line);
    if (c.length < 2 || !c[0]) continue;
    rows.push({ verb: c[0], does: c[col] ?? "" });
  }
  return rows;
}

/** Escape HTML, then turn `code` spans into <code>. For table cells from SKILL.md. */
export function inlineCode(text: string): string {
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc.replace(/`([^`]+)`/g, "<code>$1</code>");
}
