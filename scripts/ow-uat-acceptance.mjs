#!/usr/bin/env node
// ow-uat acceptance checks (docs/plans/2026-10-09-ow-uat-design.md §11 and the
// Sprint 3 contract, sprints/release-2.1/ow-sprint-3/contract.md, C1 to C19).
//
// ow-uat is a text-only skill: a model runs it, so these checks cannot run the
// skill. They read what a run wrote (its opchain-work/ folder) and what it
// printed (printed.md, the NEXT block, saved at the top of the run folder), and
// test them against an answer key, the frozen basis, the runs, the problems and
// the contract calendar, mechanically. One check per rule:
//
//   headers        the protocol's artefact header on each file this skill writes
//   writes         every file written belongs to a verb this run ran, mode-exact (skill.edges.yaml)
//   write_once     runs, requests, scenarios, agreed/ and the sign-off files never change; logs only grow
//   status         STATUS.md lines appended, never rewritten, as the key expects
//   rec            new recording-order numbers continue from the highest under uat/<client>/, one by one
//   route          "use ow-uat… on <path>" and the folder route land on the verb the files call for
//   refused        a refusal writes nothing and says why; refused_writes: only the files it may update
//   criteria       the exit criteria computed from the files, gap by gap, and named in what was printed
//   next           the NEXT blocks printed, in order
//   plan           uat.yaml, the frozen basis (byte-for-byte), the terms, the clauses, people, steps
//   plan_mode      --add-co, --addendum, --keep-frozen, --refreeze, each exact
//   plan_resume    a cut-off -plan resumes at the first missing step and never re-freezes
//   scenarios      one required scenario per check; data by pointer; side effects marked
//   pack           every pack passes the ow-tools preflight; HTML checks; the results template's six columns
//   run            session date, build label, run_by and source per row, the import, evidence states
//   secrets        secrets-seen.log: kind, role, source, session; never the value; the reset NEXT
//   defect         class, severity, basis, history by rec, terminal states, bounds, extensions, conditions
//   signoff        requests: the first sentence, every check's pass, the builder-run list, supersession by rec
//   signed         the signature or deemed acceptance: the three files, steps, accounts, the punch list
//   deemed         the deemed date: the latest of sent + N, the stated date and notice + 5 (contract calendar)
//   backstop       the backstop date; backstop_refused: the one refusal the files call for
//   addendum       a later change order's checks and the client's confirmation
//   calendar       a clause date recomputed from the contract calendar, and its source recorded
//   handoff_fields what the handoff and the documentation read is there (H1, ow-documentation §4.1)
//   internal_numbers, people, credentials, data, false_pass   the meaning checks (C6, C7, C8)
//   private_names  no private skill or business name
//   basis          the resume step's basis-mismatch rule (OD-5): run for every -pack and -signoff
//                  case whether or not its key lists it
//
// The writer of each file is pinned here (WRITER_PIN, the contract's C1 table), and so are
// the fields the next stages read (HANDOFF_PIN, C14); edgesWriterDrift and handoffFieldDrift
// hold skill.edges.yaml to them (OW-04 round 1, R1-13).
//
// Each check runs on its own: a malformed file fails the checks that need it,
// with a one-line reason, and every other check still runs and reports.
//
//   node scripts/ow-uat-acceptance.mjs                        # every case against its golden run
//   node scripts/ow-uat-acceptance.mjs <case> <run-dir>       # one case against a real run
//   node scripts/ow-uat-acceptance.mjs --prepare <case> <dir> # set up a folder to run the skill in
import { createHash } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";
import { matter } from "./lib/frontmatter.mjs";
import { runView as buildRunView, OURS, MONEY_QTY, OUR_MONEY, OVER_PLAN, TIME_QTY } from "./ow-build-acceptance.mjs";
import { preflight } from "../plugins/ow-tools/lib/preflight.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const FIXTURES = join(ROOT, "tests", "fixtures", "ow-uat");
const SKILL = join(ROOT, "skills-work", "ow-uat");
const OW = "opchain-work/";
const CLOCKS = /^(tool|host-supplied|user-stated|assumed)$/;
const TEXT = /\.(md|ya?ml|txt|json|csv|html|log)$/;
const PLAN_STEPS = ["basis", "terms", "mix", "people", "environment", "data", "schedule", "side_effects", "gitignore", "scenarios"];
const SIGN_STEPS = ["record", "accounts", "acceptance-record", "punch-list", "signoff"];

// ── small helpers ────────────────────────────────────────────────────────────

const reason = (e) => String(e?.message ?? e).split("\n")[0].trim();
export const iso = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? v : String(v).trim());
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const written = (d) => { const [y, m, dd] = iso(d).split("-").map(Number); return `${dd} ${MONTHS[m - 1]} ${y}`; };
const U = (key) => `${OW}uat/${key.slug}`;
const asList = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const cents = (v) => Math.round(Number(String(v).replace(/,/g, "")) * 100);

export function loadKey(caseDir) {
  const key = yaml.load(readFileSync(join(caseDir, "answer-key.yaml"), "utf8"));
  if (!key || typeof key !== "object" || Array.isArray(key)) throw new Error("the answer key is not a map");
  return key;
}
function walk(dir, base = dir) {
  if (!existsSync(dir)) return [];
  if (!lstatSync(dir).isDirectory()) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p, base) : [relative(base, p).split("\\").join("/")];
  });
}

// ── the contract calendar and profile.md's calendar ─────────────────────────

/** The observed US federal holidays from the skill's own table (references/contract-calendar.md §4). */
export function tableHolidays(file = join(SKILL, "references", "contract-calendar.md")) {
  const text = readFileSync(file, "utf8");
  const sec = text.slice(text.indexOf("## 4."));
  const days = new Set([...sec.matchAll(/^\| (\d{4}-\d{2}-\d{2}) \| (?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) \|/gm)].map((m) => m[1]));
  // The years the table covers: a count that leaves them is the user's to answer (design departure 27), not this oracle's.
  const years = [...days].map((x) => Number(x.slice(0, 4)));
  days.range = years.length ? [Math.min(...years), Math.max(...years)] : null;
  return days;
}
const day = (s) => new Date(`${iso(s)}T00:00:00Z`);
const fmt = (d) => d.toISOString().slice(0, 10);
/**
 * N business days after `from` (from itself never counted), skipping weekends and `holidays`. A holiday table with
 * a `range` refuses a count that steps outside its years (the skill asks the user there; the Evaluator's YC13).
 */
export function addBusinessDays(from, n, holidays) {
  let d = day(from);
  let left = n;
  const outside = (x) => holidays.range && (x.getUTCFullYear() < holidays.range[0] || x.getUTCFullYear() > holidays.range[1]);
  if (outside(d) && n > 0) throw new Error(`${fmt(d)} is outside the contract calendar table (${holidays.range.join(" to ")}): the skill asks the user`);
  while (left > 0) {
    d = new Date(d.getTime() + 86400000);
    if (outside(d)) throw new Error(`the count from ${iso(from)} leaves the contract calendar table (${holidays.range.join(" to ")}) at ${fmt(d)}: the skill asks the user`);
    const w = d.getUTCDay();
    if (w === 0 || w === 6 || holidays.has(fmt(d))) continue;
    left--;
  }
  return fmt(d);
}
/** Business days from `a` to `b` (a not counted, b counted). */
export function businessDaysBetween(a, b, holidays) {
  let n = 0;
  for (let d = new Date(day(a).getTime() + 86400000); d <= day(b); d = new Date(d.getTime() + 86400000)) {
    const w = d.getUTCDay();
    if (w !== 0 && w !== 6 && !holidays.has(fmt(d))) n++;
  }
  return n;
}
const contractCal = () => tableHolidays();
function profileCal(run) {
  try { return new Set((matter(run.read(`${OW}profile.md`) ?? "").data.holidays ?? []).map(iso)); } catch { return new Set(); }
}

// ── layering: this skill's cases, then the ow-build worlds they name ─────────

function owner(caseName, seen = new Set()) {
  if (seen.has(caseName)) throw new Error(`run cycle at ${caseName}`);
  seen.add(caseName);
  const key = loadKey(join(FIXTURES, caseName));
  return typeof key.run === "string" ? owner(key.run, seen) : caseName;
}
/** This skill's layers under a case, newest first, and the ow-build cases its chain names, closest first. */
function chain(caseName, seen = new Set()) {
  if (seen.has(caseName)) throw new Error(`base cycle at ${caseName}`);
  seen.add(caseName);
  const dir = join(FIXTURES, caseName);
  const key = loadKey(dir);
  const layers = [{ dir: join(dir, "input"), mount: "" }, { dir: join(dir, "session"), mount: "session/" }];
  const builds = key.build_case ? [key.build_case] : [];
  if (key.base) {
    const b = chain(key.base, seen);
    layers.push({ dir: join(FIXTURES, key.base, "expected"), mount: "" }, ...b.layers);
    for (const c of b.builds) if (!builds.includes(c)) builds.push(c);
  }
  return { layers, builds };
}
const inLayer = (l, rel) => (rel.startsWith(l.mount) && existsSync(join(l.dir, rel.slice(l.mount.length))) && !lstatSync(join(l.dir, rel.slice(l.mount.length))).isDirectory() ? join(l.dir, rel.slice(l.mount.length)) : null);

/**
 * A view of a run: read(rel) finds a root-relative file (opchain-work/…, session/…, printed.md)
 * in the run, the layers under it, then the ow-build worlds; written() lists what this skill wrote.
 */
export function runView(caseName, runDir = null) {
  const home = owner(caseName);
  const { layers: prior, builds } = chain(home);
  const buildViews = builds.map((c) => buildRunView(c));
  const runLayer = runDir ? { dir: runDir, mount: "" } : { dir: join(FIXTURES, home, "expected"), mount: "" };
  const findIn = (ls, rel) => { for (const l of ls) { const p = inLayer(l, rel); if (p) return p; } return null; };
  const readFrom = (ls, rel) => {
    // A path the run turned into a folder is a broken file, never a reason to read the layer below.
    for (const l of ls.slice(0, ls[0] === runLayer ? 1 : 0)) if (rel.startsWith(l.mount) && existsSync(join(l.dir, rel.slice(l.mount.length))) && lstatSync(join(l.dir, rel.slice(l.mount.length))).isDirectory()) throw new Error(`${rel} is a folder, not a file`);
    const p = findIn(ls, rel);
    if (p) return readFileSync(p, "utf8");
    for (const v of buildViews) { const t = v.read(rel); if (t != null) return t; }
    return null;
  };
  const listOf = (ls) => {
    const seen = new Set();
    for (const l of ls) for (const r of walk(l.dir)) seen.add(l.mount + r);
    for (const v of buildViews) for (const r of v.all()) seen.add(r);
    return [...seen].sort();
  };
  const writtenFiles = () => {
    const all = walk(runLayer.dir).filter((r) => r.startsWith(OW));
    if (!runDir) return all.sort();
    return all.filter((r) => { const before = readFrom(prior, r); return before == null || before !== readFileSync(join(runDir, r), "utf8"); }).sort();
  };
  // A view is read-only, so every read and listing is computed once (a checked run reads the same files many times).
  const cache = new Map(), priorCache = new Map();
  const once = (fn) => { let v; return () => (v ??= fn()); };
  const read = (rel) => { if (!cache.has(rel)) cache.set(rel, readFrom([runLayer, ...prior], rel)); return cache.get(rel); };
  const priorRead = (rel) => { if (!priorCache.has(rel)) priorCache.set(rel, readFrom(prior, rel)); return priorCache.get(rel); };
  const all = once(() => listOf([runLayer, ...prior]));
  const priorAll = once(() => listOf(prior));
  const writtenOnce = once(writtenFiles);
  return {
    home,
    read,
    priorRead,
    exists: (rel) => read(rel) != null,
    priorExists: (rel) => priorRead(rel) != null,
    all: () => [...all()],
    priorAll: () => [...priorAll()],
    written: () => [...writtenOnce()],
    printed: () => { const p = inLayer(runLayer, "printed.md"); return p ? readFileSync(p, "utf8") : null; },
    // A real run folder holds the whole workspace after the run, so a file it lacks was deleted
    // (R1-4); a golden lists only what the run wrote, so it cannot show a deletion.
    realRun: Boolean(runDir),
    inRun: (rel) => (runDir ? existsSync(join(runDir, rel)) : true),
  };
}
const priorView = (run) => ({ ...run, read: run.priorRead, exists: run.priorExists, all: run.priorAll });

/** Parse a file once; throws a one-line reason the calling check reports. */
function parsed(text, rel, kind) {
  if (text == null) throw new Error(`${rel} was not written`);
  try {
    if (kind === "yaml") {
      const v = yaml.load(text) ?? {};
      if (typeof v !== "object" || Array.isArray(v)) throw new Error("the top level is not a map");
      return v;
    }
    return matter(text);
  } catch (e) {
    throw new Error(`${rel}: ${kind === "yaml" ? "not valid YAML" : "header is not valid YAML"} (${reason(e)})`);
  }
}
const md = (view, rel) => parsed(view.read(rel), rel, "md");
const yml = (view, rel) => parsed(view.read(rel), rel, "yaml");

// ── the terms block and its digest (owner decision OD-5) ─────────────────────

// OD-6: the block covers the payment schedule and payment_terms_days as well as the clauses.
const TERMS_KEYS = new Set(["uat", "schedule", "payment_terms_days", "acceptance_definition", "delivery_definition", "documentation_sku", "contract_clauses"]);
const TOP_KEY = /^[A-Za-z_][\w-]*\s*:/;
/**
 * The terms block of contract-inputs.md (references/uat-yaml-schema.md §6): the header lines uat, schedule,
 * payment_terms_days, acceptance_definition, delivery_definition, documentation_sku and contract_clauses (each
 * with its indented lines, up to the next top-level key), then the "## Ownership" section, as they stand, in file
 * order, with one final newline. Line endings count as "\n" whatever the file uses, and a blank line or a
 * comment line inside a key's lines is skipped, so the clauses after it still count (R2-4).
 */
export function termsBlock(text) {
  // R3-5: a byte-order mark before the front matter is not a term; it is dropped before anything is read.
  const t = String(text ?? "").replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const m = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(t);
  const head = m ? m[1].split("\n") : [];
  const body = m ? t.slice(m[0].length) : t;
  const parts = [];
  for (let i = 0; i < head.length; i++) {
    const k = /^([a-z_]+):/.exec(head[i])?.[1];
    if (!k || !TERMS_KEYS.has(k)) continue;
    const lines = [head[i]];
    while (i + 1 < head.length && !TOP_KEY.test(head[i + 1])) {
      i++;
      if (/^\s+\S/.test(head[i]) && !/^\s*#/.test(head[i])) lines.push(head[i]);
    }
    parts.push(lines.join("\n"));
  }
  const own = /^## Ownership[^\n]*\n[\s\S]*?(?=^## |(?![\s\S]))/m.exec(body);
  if (own) parts.push(own[0].replace(/\s+$/, ""));
  return `${parts.join("\n")}\n`;
}
export const blockDigest = (text) => `sha256:${createHash("sha256").update(termsBlock(text), "utf8").digest("hex")}`;
const NO_CODE_DIGEST = /^none \(no code here\)$/;
const canon = (v) => (Array.isArray(v) ? `[${v.map(canon).join(",")}]` : v && typeof v === "object" ? `{${Object.keys(v).sort().map((k) => `${k}:${canon(v[k])}`).join(",")}}` : JSON.stringify(String(v ?? "").trim()));
/**
 * OD-5's no-code path, as the owner confirmed it after round 2 (R2-1): every part of the terms block compared as
 * text with what the plan froze: uat.yaml `clauses` with `contract_clauses`, `terms.schedule` and
 * `terms.payment_terms_days` with their header lines (OD-6), the UAT line, the definitions and the documentation
 * SKU, and contract-terms.md's Ownership with the `## Ownership` section. Returns the parts that differ; nothing
 * is skipped once the terms step has frozen them.
 */
export function termsTextMismatches(upstream, u, termsMd) {
  const out = [];
  if (!u || (u.terms === undefined && u.clauses === undefined)) return out;
  let ci;
  try { ci = matter(String(upstream ?? "").replace(/^﻿/, "").replace(/\r\n?/g, "\n")); } catch { return ["contract-inputs.md (does not parse)"]; }
  const d = ci.data ?? {};
  const t = u.terms ?? {};
  let frozenMd = { content: "" };
  try { frozenMd = matter(String(termsMd ?? "")); } catch { /* an unreadable frozen copy differs below */ }
  const cc = d.contract_clauses;
  const frozen = u.clauses;
  if (cc && typeof cc === "object") {
    if (!frozen || typeof frozen !== "object") out.push("contract_clauses (frozen as none)");
    else for (const k of new Set([...Object.keys(cc), ...Object.keys(frozen).filter((x) => x !== "status")])) if (canon(cc[k]) !== canon(frozen[k])) out.push(`contract_clauses.${k}`);
  } else if (frozen && typeof frozen === "object") out.push("contract_clauses (not set upstream)");
  // R3-1: a part removed upstream is a difference too. The schedule, payment terms and SKU always come from
  // contract-inputs.md; the UAT line and the definitions do when the terms say they were quoted from it.
  const fromInputs = /contract-inputs/.test(String(t.bounds ?? ""));
  for (const k of ["schedule", "payment_terms_days", "documentation_sku", "acceptance_definition", "delivery_definition"]) {
    if (d[k] === undefined) {
      const always = ["schedule", "payment_terms_days", "documentation_sku"].includes(k);
      if ((always || fromInputs) && t[k] !== undefined && !/^none\b/i.test(String(t[k]))) out.push(`${k} (removed upstream)`);
      continue;
    }
    if (canon(d[k]) !== canon(t[k])) out.push(k);
  }
  if (d.uat && typeof d.uat === "object") {
    for (const k of ["size", "tester_roles", "sessions", "fix_rounds", "fix_business_days"]) if (d.uat[k] !== undefined && canon(d.uat[k]) !== canon(t[k])) out.push(`uat.${k}`);
    // R3-1: the UAT line's price and test mix, against the line contract-terms.md quotes.
    const line = sectionOf(frozenMd.content ?? "", "User acceptance testing") ?? "";
    if (d.uat.price !== undefined && ![...line.matchAll(/(?:USD|EUR|GBP|[$€£])\s?(\d[\d,]*(?:\.\d+)?)/gi)].some((m) => cents(m[1]) === cents(d.uat.price))) out.push("uat.price");
    if (d.uat.test_mix !== undefined && !same(mixOf(String(d.uat.test_mix)), mixInLine(line, asList(d.uat.tester_roles).map(String)))) out.push("uat.test_mix");
  } else if (fromInputs && t.size !== undefined) out.push("uat (removed upstream)");
  const own = (sectionOf(ci.content ?? "", "Ownership") ?? "").trim();
  const frozenOwn = (sectionOf(frozenMd.content ?? "", "Ownership") ?? "").trim();
  if (own && own !== frozenOwn) out.push("Ownership");
  else if (!own && frozenOwn && !/^Not stated\b/i.test(frozenOwn)) out.push("Ownership (removed upstream)");
  return out;
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/** A test mix ("order coordinator: WP-1, WP-2; bookkeeper: WP-5") as role -> sorted work packages. */
function mixOf(text) {
  const out = {};
  for (const part of text.split(";")) {
    const m = /^\s*([^:]+?)\s*:\s*(.*)$/.exec(part);
    if (m) out[m[1].trim().toLowerCase()] = [...new Set(m[2].match(/\bWP-\d+\b/g) ?? [])].sort();
  }
  return Object.fromEntries(Object.entries(out).sort());
}
/** The same map read from a quoted UAT line: each role's work packages, up to the next role named or a ";". */
function mixInLine(line, roles) {
  const out = {};
  const low = line.toLowerCase();
  const at = roles.flatMap((r) => [...low.matchAll(new RegExp(esc(r.toLowerCase()), "g"))].map((m) => ({ r: r.toLowerCase(), i: m.index, end: m.index + m[0].length }))).sort((a, b) => a.i - b.i);
  at.forEach((x, n) => {
    const stop = Math.min(n + 1 < at.length ? at[n + 1].i : line.length, ...[line.indexOf(";", x.end)].filter((k) => k >= 0));
    for (const wp of line.slice(x.end, stop).match(/\bWP-\d+\b/g) ?? []) (out[x.r] ??= new Set()).add(wp);
  });
  return Object.fromEntries(Object.entries(out).map(([r, s]) => [r, [...s].sort()]).sort());
}

/**
 * The basis mismatches a verb must report (routing-and-resume.md §1.3): byte copies by bytes, contract-terms.md by
 * its block's digest, or with no code by every part of the block as text (OD-5, OD-6, R2-1).
 */
export function basisMismatches(view, key) {
  const dir = U(key);
  let u;
  try { u = uatOf(view, dir); } catch { return []; }
  const kept = new Set(asList(u.events).map((e) => String(e.event).match(/^kept_frozen (\S+?):?(?:\s|$)/)?.[1]).filter(Boolean));
  const out = [];
  for (const b of asList(u.basis)) {
    const file = String(b.file ?? "");
    if (!file || kept.has(file)) continue;
    const frozen = view.read(`${dir}/${file}`);
    const up = b.from ? view.read(`${OW}${b.from}`) : null;
    if (frozen == null || up == null) continue;
    if (/contract-terms\.md$/.test(file)) {
      if (/^sha256:/.test(String(b.digest))) { if (blockDigest(up) !== String(b.digest)) out.push(file); }
      else if (termsTextMismatches(up, u, frozen).length) out.push(file);
      continue;
    }
    if (up !== frozen) out.push(file);
  }
  return out;
}

// ── reading the skill's own files ────────────────────────────────────────────

function sectionOf(content, name) {
  const m = new RegExp(`^## ${esc(name)}[^\\n]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m").exec(content);
  return m ? m[1] : null;
}
function tableRows(text) {
  const lines = String(text ?? "").split("\n").filter((l) => l.trim().startsWith("|"));
  if (lines.length < 2) return [];
  const cells = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  const head = cells(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(2).map((l) => Object.fromEntries(cells(l).map((c, i) => [head[i] ?? `c${i}`, c])));
}
export const internalSplit = (content) => {
  const out = [];
  let internal = false;
  const removed = [];
  for (const l of String(content).split("\n")) {
    if (/^\s*<!--\s*ow\s*:\s*internal\s*-->\s*$/i.test(l)) { internal = true; continue; }
    if (/^\s*<!--\s*ow\s*:\s*end\s*-\s*internal\s*-->\s*$/i.test(l)) { internal = false; continue; }
    (internal ? removed : out).push(l);
  }
  return { client: out.join("\n"), internal: removed.join("\n") };
};

export function uatOf(view, slugDir) {
  return yml(view, `${slugDir}/uat.yaml`);
}
export function runsOf(view, slugDir) {
  const out = [];
  for (const f of view.all().filter((x) => new RegExp(`^${esc(slugDir)}/runs/RUN-\\d+\\.md$`).test(x))) {
    const { data, content } = parsed(view.read(f), f, "md");
    const rows = tableRows(content.split("## Dropped at import")[0]).map((r) => ({ sc: r.scenario, proves: r.proves, tester: r.tester, result: r.result, cases: r.cases, run_by: r.run_by, source: r.source, note: r.note, records: r["records created"], evidence: r.evidence }));
    out.push({ file: f, id: data.id, rec: Number(data.rec), session: data.session, kind: data.kind, session_date: iso(data.session_date), imported: iso(data.imported), build: String(data.build ?? "").split(" (")[0].trim(), rows, data, content });
  }
  return out.sort((a, b) => a.rec - b.rec);
}
const FIELD = (content, name) => (new RegExp(`^${esc(name)}: (.*)$`, "m").exec(content) ?? [])[1]?.trim();
export function defectsOf(view, slugDir) {
  const out = [];
  for (const f of view.all().filter((x) => new RegExp(`^${esc(slugDir)}/defects/UAT-\\d+\\.md$`).test(x))) {
    const { data, content } = parsed(view.read(f), f, "md");
    const history = [...(sectionOf(content, "History") ?? "").matchAll(/^- (\d{4}-\d{2}-\d{2}) rec (\d+): (.+)$/gm)].map((m) => ({ date: m[1], rec: Number(m[2]), text: m[3].trim() }));
    out.push({ file: f, id: data.id ?? f.match(/UAT-\d+/)[0], from: FIELD(content, "from") ?? "", cls: FIELD(content, "class") ?? "", severity: FIELD(content, "severity") ?? "", status: FIELD(content, "status") ?? "", basis: FIELD(content, "basis") ?? "", triaged: FIELD(content, "triaged"), round: Number(FIELD(content, "round") ?? 0), history, reason: (sectionOf(content, "Reason (for the client)") ?? "").trim(), content, data });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}
export function scenariosOf(view, slugDir) {
  const out = [];
  for (const f of view.all().filter((x) => new RegExp(`^${esc(slugDir)}/scenarios/SC-\\d+\\.md$`).test(x))) {
    const { data, content } = parsed(view.read(f), f, "md");
    out.push({ file: f, ...data, id: data.id, content });
  }
  return out.sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
}
export function requestsOf(view, slugDir) {
  const t = view.read(`${slugDir}/signoff-requests.yaml`);
  if (t == null) return [];
  const y = parsed(t, `${slugDir}/signoff-requests.yaml`, "yaml");
  return (y.requests ?? []).map((r) => ({ ...r, written: iso(r.written), sent: iso(r.sent) === "none" ? null : iso(r.sent) }));
}
/** Every rec number a file of this skill defines (not the recs it cites in passing): a header or
 *  YAML `rec:`/`written_rec:`, a flow map's `rec:`, a history line's `rec <n>:`, a log line's `| rec <n> |`. */
export function recsOf(view, slugDir) {
  const recs = [];
  for (const f of view.all().filter((x) => x.startsWith(`${slugDir}/`) && TEXT.test(x) && !/\/agreed\/|\/evidence\/(?!index\.md)/.test(x))) {
    const t = view.read(f) ?? "";
    for (const re of [/^\s*(?:written_)?rec: (\d+)\s*$/gm, /[{,]\s*rec: (\d+)\s*[,}]/g, /^- \d{4}-\d{2}-\d{2} rec (\d+): /gm, /\| rec (\d+) \|/g]) {
      for (const m of t.matchAll(re)) recs.push(Number(m[1]));
    }
  }
  return recs.filter((n) => Number.isFinite(n));
}

// ── terminal states, the latest build label, the exit criteria ──────────────

const TERMINAL = {
  Defect: /^(?:retested-pass|moved to punch list|withdrawn by client\b.*|after sign-off)$/,
  Change: /^(?:raised as change request|condition met|condition lapsed|after sign-off)$/,
  "Training gap": /^(?:passed to documentation|after sign-off)$/,
  "Environment or data": /^(?:closed|after sign-off)$/,
  Duplicate: /^closed -> UAT-\d+$/,
};
export const isTerminal = (d) => Boolean(TERMINAL[d.cls]?.test(d.status));
const isCondition = (d) => /^condition\b/.test(d.status) && !/^condition (?:met|lapsed)$/.test(d.status);
const firstRec = (d) => d.history[0]?.rec ?? 0;
const addendumIds = (scenarios) => new Set(scenarios.filter((s) => s.kind === "addendum").map((s) => s.id));
const fromAddendum = (d, scenarios) => [...addendumIds(scenarios)].some((id) => new RegExp(`\\b${id}\\b`).test(d.from));

/** The latest build label of the main test as of a rec (or a date): ready-for-uat.md, then each `fixed` on a main UAT-nn, each delivery of a change order in agreed/. */
export function latestBuild(view, key, { asOfDate = null, asOfRec = Infinity, all = false } = {}) {
  const dir = U(key);
  const uat = uatOf(view, dir);
  let best = { label: String(uat.ready?.build_label ?? "").split(" (")[0], rec: 0, date: "0000-00-00" };
  const scen = scenariosOf(view, dir);
  const agreedCos = new Set(view.all().filter((f) => new RegExp(`^${esc(dir)}/agreed/CO-\\d+\\.md$`).test(f)).map((f) => f.match(/CO-\d+/)[0]));
  const cand = [];
  for (const d of defectsOf(view, dir)) {
    if (fromAddendum(d, scen) && !all) continue;
    for (const h of d.history) { const m = h.text.match(/^fixed, build (\S+)/); if (m) cand.push({ label: m[1], rec: h.rec, date: h.date }); }
  }
  for (const e of uat.events ?? []) {
    const m = String(e.event).match(/^(CO-\d+) delivered (\S+), build (\S+)/);
    if (m && (all || agreedCos.has(m[1]))) cand.push({ label: m[3], rec: Number(e.rec), date: iso(e.date) });
  }
  for (const c of cand) if (c.rec <= asOfRec && (!asOfDate || c.date <= asOfDate) && c.rec > best.rec) best = c;
  return best;
}
/** The build label a session on `date` ran against: the latest change on or before that date. */
export function buildOnDate(view, key, date) {
  return latestBuild(view, key, { asOfDate: date, all: true }).label;
}

/**
 * The exit criteria (design §8), as of a date. Returns { "1": [checks], "2": [scenarios], "3": [UAT-nn],
 * "4": [UAT-nn], "5": [UAT-nn] } with only the criteria that fail. `request` gives criterion 4's exemption.
 */
export function exitCriteria(view, key, { asOfDate = null, request = null } = {}) {
  const dir = U(key);
  const uat = uatOf(view, dir);
  // Owner decision R3-6: every check in agreed/ counts, whatever uat.yaml lists, so sign-off never passes a check
  // that nobody tested (a check that reached agreed/ without its scenario stays a gap under criterion 1).
  const agreedChecks = asList(uat.basis).filter((b) => /(?:acceptance|quick-scope|CO-\d+)\.md$/.test(String(b.file))).flatMap((b) => checkIdsIn(view.read(`${dir}/${b.file}`)));
  const checks = [...new Set([...asList(uat.checks).map(String), ...agreedChecks])];
  const scen = scenariosOf(view, dir);
  const runs = runsOf(view, dir).filter((r) => !asOfDate || r.session_date <= asOfDate);
  const defects = defectsOf(view, dir).filter((d) => !asOfDate || (d.history[0]?.date ?? "0") <= asOfDate);
  const latest = latestBuild(view, key, { asOfDate }).label;
  const gaps = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  for (const c of checks) {
    const req = scen.filter((s) => s.kind === "required" && String(s.proves) === c).map((s) => s.id);
    const ok = runs.some((r) => r.build === latest && r.rows.some((x) => req.includes(x.sc) && x.result === "pass"));
    if (!ok) gaps[1].push(c);
  }
  const main = scen.filter((s) => s.kind !== "addendum");
  for (const s of main) {
    const last = [...runs].reverse().find((r) => r.rows.some((x) => x.sc === s.id && x.result !== "not run"));
    const row = last?.rows.find((x) => x.sc === s.id);
    if (row && /^(fail|blocked)$/.test(row.result) && !defects.some((d) => new RegExp(`\\b${s.id}\\b`).test(d.from))) gaps[2].push(s.id);
  }
  for (const d of defects) {
    if (fromAddendum(d, scen) || d.status === "after sign-off") continue;
    if (d.cls === "Defect" && /^(blocker|major)$/.test(d.severity) && !isTerminal(d)) gaps[3].push(d.id);
    else if (isCondition(d)) gaps[3].push(d.id);
    if (d.cls === "Defect" && /^(minor|cosmetic)$/.test(d.severity) && !isTerminal(d)) {
      const exempt = request && firstRec(d) > Number(request.written_rec);
      if (!exempt) gaps[4].push(d.id);
    }
    if (d.cls === "Environment or data" && !isTerminal(d)) gaps[5].push(d.id);
  }
  return Object.fromEntries(Object.entries(gaps).filter(([, v]) => v.length));
}

/** Why a live request is superseded, by rec: the first event after its written_rec (or a higher request). */
export function supersededBy(view, key, request, { asOfDate = null } = {}) {
  const dir = U(key);
  const after = (rec, date) => rec > Number(request.written_rec) && (!asOfDate || date <= asOfDate);
  const scen = scenariosOf(view, dir);
  for (const r of requestsOf(view, dir)) if (r.n > request.n && after(Number(r.written_rec), r.written)) return { rec: Number(r.written_rec), why: `request ${r.n}` };
  const events = [];
  for (const d of defectsOf(view, dir)) {
    const major = d.cls === "Defect" && /^(blocker|major)$/.test(d.severity);
    for (const h of d.history) {
      if (!after(h.rec, h.date)) continue;
      if (/^reproduced by the builder/.test(h.text) && major) events.push({ rec: h.rec, why: `${d.id} reproduced` });
      if (/^cannot reproduce notice sent .*\blate\b/.test(h.text)) events.push({ rec: h.rec, why: `${d.id} late notice` });
      if (/^condition: /.test(h.text)) events.push({ rec: h.rec, why: `${d.id} condition` });
      if (/^fixed, build /.test(h.text) && !fromAddendum(d, scen)) events.push({ rec: h.rec, why: `${d.id} fixed` });
    }
  }
  const uat = uatOf(view, dir);
  for (const e of uat.events ?? []) {
    if (!after(Number(e.rec), iso(e.date))) continue;
    if (/^added CO-\d+/.test(e.event) || /^refrozen /.test(e.event)) events.push({ rec: Number(e.rec), why: e.event });
    const m = String(e.event).match(/^(CO-\d+) delivered/);
    if (m && view.exists(`${dir}/agreed/${m[1]}.md`)) events.push({ rec: Number(e.rec), why: e.event });
  }
  return events.sort((a, b) => a.rec - b.rec)[0] ?? null;
}

// ── the meaning checks (C6, C7, C8): category rules keyed on who a statement is about ──

/**
 * Sentences, split at structure first (OW-04 round 1, R1-1): a heading, a table row, a blank line and a
 * list item each end what came before, so a section's last sentence never runs into the next heading.
 * Then each block splits at sentence ends.
 */
export function sentences(text) {
  const blocks = [];
  let cur = [];
  const flush = () => { if (cur.length) blocks.push(cur.join(" ")); cur = []; };
  for (const line of String(text ?? "").split("\n")) {
    if (!line.trim()) { flush(); continue; }
    if (/^\s*(?:#{1,6}\s|\|)/.test(line)) { flush(); blocks.push(line.replace(/^\s*#{1,6}\s+/, "")); continue; }
    if (/^\s*(?:[-*+]|\d+[.)])\s/.test(line)) { flush(); cur.push(line.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "")); continue; }
    cur.push(line.trim());
  }
  flush();
  return blocks.flatMap((b) => b.replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[A-Z0-9"(])/)).map((s) => s.trim()).filter(Boolean);
}
/** Who did it: us (a first-person subject, our developer or builder, the user by name) or a client person. */
const OUR_AGENT = (user) => new RegExp(`\\b(?:we|we've|we're|I|I've|I'm|us|our|ours|me|my|the builder|our builder|our developer|the developer|developers?|engineers?${user ? `|${esc(user)}` : ""})\\b`, "i");
const CLIENT_AGENT = /\b(?:your (?:[\w-]+ ){0,2}?(?:team|testers?|staff|people|coordinator|manager|bookkeeper|owner|lead)|the (?:order coordinator|operations manager|bookkeeper|shop manager|owner|tester|testers|client)|(?:order coordinator|operations manager|bookkeeper|shop manager)|each tester|testers)\b/i;
/** Effort words: the time went into our work. */
const EFFORT_WORD = /\b(?:took|takes|taking|spent|spend(?:s|ing)?|went into|go(?:es)? into|ate up|eats? up|used up|put in|put into|sunk|sank|sinks?|sinking|logged|billable|consumed|effort|of work|of (?:development|developer|building|coding|fixing) ?(?:time)?|developer[- ](?:time|hours?|days?)|rework|man[- ]?days?|person[- ]?days?)\b/i;
/** A quantity of data, not of time: "a week of your October orders". */
const DATA_SPAN = /\b(?:a|one|two|three|four|\d+|half a) (?:days?|weeks?|months?) of (?:your|the client's|the shop's|their|the) ?(?:[A-Z][a-z]+ )?(?:orders|data|sales|exports|records|invoices|purchase orders)\b/i;
/** The test's own duration: a session's length, the time a client person needs, a scenario's length (R1-9). */
const TEST_DURATION = /\b(?:session|sessions|lasted|lasts|runs? from|allow|testers? (?:needs?|will have)|to run their scenarios|break at)\b|\b(?:each|every|a|the|this|that) (?:scenario|check|test|run)s? (?:takes?|lasts?|needs?)\b/i;
/** Ours when we, our people or the user named are the subject: a pricing modifier, our plan or estimate, our time (R1-9). */
// "raises our UAT price by": added after the OW-04 follow-up held-out measurement.
// A fraction as the modifier ("adds a quarter to our UAT price"): added after the round-3 held-out measurement.
const PRICE_MODIFIER = /\badds?\s+(?:about\s+|roughly\s+)?\d+(?:\.\d+)?\s?%\s+to\b|\badds?\s+(?:about\s+|roughly\s+)?(?:a (?:quarter|third|half|fifth|tenth)|half|one[- ](?:quarter|third|fifth))\s+(?:to|on)\b|\b\d+(?:\.\d+)?\s?%\s+(?:on top|extra|uplift|surcharge|premium|more for)\b|\b(?:uplift|surcharge|premium|mark-?up) of \d+(?:\.\d+)?\s?%|\bmark(?:s|ed|ing)?[- ]?up\s+by\b|\b(?:raises?|increases?|lifts?|bumps? up)\s+(?:our|the)\s+(?:[\w-]+\s+){0,2}(?:price|rate|fee|line)\s+by\b/i;
// "contingency" and "blew through": added after the round-2 held-out measurement.
const OUR_PLAN = /\b(?:effort|time|hours?|days?|budget|estimate|allowance|contingency|buffer)\s+(?:that\s+)?(?:we|I)\s+(?:had\s+)?(?:budgeted|planned(?: for)?|estimated|allowed|set aside|allocated|scoped|set(?: ourselves)?)\b|\bas (?:long|much) as (?:we|I) (?:had )?(?:estimated|planned|expected|budgeted|quoted ourselves)\b|\b(?:estimated|sized|scoped|budgeted|planned|priced) internally\b|\binternally\b[^.]{0,40}\b(?:sized|estimated|scoped|budgeted|planned|priced|took|cost)\b|\b(?:budget|estimate)s? (?:we|I) set (?:ourselves|myself)\b/i;
const OUR_PLAN_OVER = /\b(?:past|over|beyond|exceed\w*|more than|longer than|twice|double|half|a third|a quarter|used up|used|ran through|went through|blew through|blown through|burned through|ate into|exhausted)\b/i;
const BARE_RATE = /\b(?:charged|billed|priced|invoiced)\s+(?:at|as)\s+\d[\d,]*(?:\.\d+)?\b|\b\d[\d,]*(?:\.\d+)?\s+(?:an|per|a)\s+(?:hour|hr|day)\b|\bat \d[\d,]*(?:\.\d+)? (?:each|per (?:session|round|role|tester))\b/i;
const QUOTED_BOUNDS = /\b(?:quoted|fix rounds?|business days quoted|bounds)\b/i;
const INTERNAL_PRICE = /\b(?:our (?:[\w-]+ )?(?:rates?|prices?|pricing|charges?|fees?|costs?)|(?:session|extension|per-?session|per-?round|hourly|day|internal) (?:rate|price)s?|rate card|price ?book|unit prices?|modifiers?|multipliers?|mark-?ups?|surcharges?|uplift)\b/i;
// R2-9: "spent more on fixes than the line brings in" (O20). "cost our developer …": added after the round-3
// held-out measurement.
const OUR_COST = /\bcost(?:s|ing)? (?:us|me|our (?:developers?|builders?|team|people|engineers?))\b|\bmoney pit\b|\b(?:running |run |runs |ran )?at a loss\b|\bour (?:cost|costs|margin|profit)\b|\bmargins?\b|\bprofit(?:s|able)?\b|\blos(?:e|es|ing|t) money\b|\bunderwater\b|\bin the red\b|\bout of pocket\b|\bpushes our cost\b|\b(?:spent|spend|spending|cost|costs|costing)(?: us)? (?:far |much |a lot |rather |a little )?more\b[^.;]{0,40}\bthan\b|\bthan (?:the|our|this|that) [\w\s-]{0,30}\b(?:brings in|pays|earns|covers)\b/i;
// R2-9: carrying a cost ourselves, as an idiom ("we are eating the cost of the third round", O11).
// "carrying the cost" and "bearing the cost": added after the OW-04 follow-up held-out measurement.
const OUR_COST_IDIOM = /\b(?:eat|eats|eating|ate|absorb|absorbs|absorbing|absorbed|swallow|swallows|swallowing|swallowed|carry|carries|carrying|carried|bear|bears|bearing|bore)\s+(?:the|that|this|those|these)\s+(?:extra\s+|additional\s+|whole\s+)?costs?\b/i;
// R2-9: "roughly 20% more effort than we allowed for testing" (O16).
// "our internal plan had … we needed" and "overran our … budget": added after the OW-04 follow-up held-out measurement.
const OVERRUN = /\b(?:over|above|beyond|past|exceed\w*) (?:our |the |what we )?(?:budget|estimate[ds]?|plan(?:ned)?)\b|\bran past what (?:we|I)\b|\bover budget\b|\bunder-?estimat\w*\b|\bunder-?quot\w*\b|\bwe had allowed\b[^.]*\bneeded\b|\babove the budget we\b|\b(?:went|ran|came in) well (?:over|above)\b|\bover (?:our |my )?estimate\b|\b(?:more|longer)\s+(?:[\w-]+\s+)?(?:effort|time|work|hours|days|cost|money|fix(?:es|ing)?|rework)\s+than (?:we|I)\b|\b(?:more|longer) than (?:we|I) (?:had )?(?:budgeted|planned|estimated|allowed|allocated|set aside)\b|\b(?:our|my) (?:own |internal )?(?:plan|estimate|budget)\b[^.]{0,40}\b(?:we|I) (?:needed|took|used|spent)\b|\bover-?r(?:an|un|uns|unning) (?:our|my|the) (?:[\w-]+ )?(?:budget|estimate|plan|allowance)\b|\b(?:twice|double|triple|(?:two|three|four|five|\d+) times)\s+(?:our|my|the)\s+(?:own\s+|internal\s+|original\s+)?(?:estimate|plan|budget|allowance)\b/i;
// R2-9: our time named as such ("Robin's time on the sandbox setup was most of Monday", O10).
const OUR_TIME = (user) => new RegExp(`\\b(?:our|my|the developer's|our developer's|the builder's${user ? `|${esc(user)}'s` : ""})\\s+(?:[\\w-]+\\s+)?(?:time|hours|effort|work)\\b`, "i");
const HOURS_OURS = /\b\d+(?:[.,]\d+)?\s*(?:billable |developer )?(?:h|hrs?|hours?)\b/i;
const MONEY_IN_WORDS_OR_BARE = /\b(?:flat|of|at) \d{2,}(?:[.,]\d+)? (?:a|per|each) (?:time|session|round|role)\b/i;

/**
 * C6: the our-side findings in one client sentence (owner decision D1). `ctx.legit` holds the
 * amounts (cents) a client may see: the quoted UAT line, signed change orders, the fixed price and payments.
 */
export function internalFindings(s, ctx = {}) {
  const out = [];
  const t = s.replace(/`[^`]*`/g, " ").replace(/\b(?:AC|SC|UAT|RUN|CO)-[\w.-]+/g, " ");
  const ours = OUR_AGENT(ctx.user).test(t);
  const client = CLIENT_AGENT.test(t);
  // The client's own process ("your month-end close takes four days") with no first person and no user named: theirs (R1-9).
  const yours = /\byour\b/i.test(t) && !ours;
  // 1. Our hours or effort: a quantity of time with an effort word or our subject, not the test's own duration or a data span.
  const time = t.match(TIME_QTY);
  if (time && !DATA_SPAN.test(t)) {
    const effort = EFFORT_WORD.test(t);
    const byUs = ours && !(client && !/\b(?:we|us|our)\b/i.test(t));
    const clientTime = (client || yours) && !ours;
    const future = /\b(?:will|'ll|shall|going to)\b/i.test(t);
    if ((effort && byUs) || (effort && !client && !yours && !TEST_DURATION.test(t) && !future) || (byUs && !future && !TEST_DURATION.test(t) && !clientTime && !/\b\d{1,2} (?:January|February|March|April|May|June|July|August|September|October|November|December)\b/.test(t))) {
      if (!(clientTime && !effort)) out.push(["our hours or effort", time[0]]);
    }
  }
  if (HOURS_OURS.test(t) && (ours || /\b(?:billable|logged|developer)\b/i.test(t)) && !out.length) out.push(["our hours", t.match(HOURS_OURS)[0]]);
  // A named day or part of one that went to our work ("ate up most of our Thursday": added after the first held-out
  // measurement; "Robin spent the best part of Thursday": R1-9).
  const ourDay = t.match(/\b(?:most|all|half|much) of (?:our|my) (?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|morning|afternoon|evening|day|week)\b|\b(?:our|my) (?:whole|entire) (?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|morning|afternoon|evening|day|week)\b/i)
    ?? (ours && !client && (EFFORT_WORD.test(t) || OUR_TIME(ctx.user).test(t)) ? t.match(/\b(?:most|all|half|much|the (?:best|better|greater) part|the bulk) of (?:the |a |an )?(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|morning|afternoon|evening|day|week|weekend)\b/i)
      // "spent the morning chasing …": added after the round-2 held-out measurement.
      ?? t.match(/\b(?:spent|spend|took|lost|gave up) (?:the|a|an|our|my) (?:(?:whole|entire|best|better|greater) (?:part )?of (?:the |a |an |our |my )?|whole |entire )?(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|morning|afternoon|evening|day|week|weekend)\b/i) : null);
  if (ourDay && !out.some(([w]) => /hours|effort/.test(w))) out.push(["our hours or effort", ourDay[0]]);
  // Our extra hours named without a number ("Robin worked late twice to finish the retest build", the Evaluator's T04).
  const late = ours && !client && t.match(/\b(?:work(?:s|ed|ing)?|stay(?:s|ed|ing)?) (?:late|overtime|into the night|(?:through|over) the weekend)\b|\blate nights?\b|\ball-nighters?\b/i);
  if (late && !out.some(([w]) => /hours|effort/.test(w))) out.push(["our hours or effort", late[0]]);
  // Our own plan or estimate measured against what happened (R1-9): "past the effort we had budgeted", "as long as we estimated internally".
  const plan = t.match(OUR_PLAN);
  if (plan && (OUR_PLAN_OVER.test(t) || /\binternally\b/i.test(t))) out.push(["an overrun against our own plan", plan[0]]);
  // A modifier on our price ("adds 15% to the UAT line") or a rate with no currency ("charged at 120 each").
  const mod = t.match(PRICE_MODIFIER);
  if (mod) out.push(["our rates or price-book internals", mod[0]]);
  const bare = t.match(BARE_RATE);
  if (bare && !t.match(MONEY_QTY)) out.push(["an amount of ours (a rate)", bare[0]]);
  // 2. Money of ours: an amount in rate or price-book context, or ours, that is not a client-facing figure.
  for (const m of t.matchAll(new RegExp(MONEY_QTY.source, "gi"))) {
    const full = t.slice(m.index).match(/^(?:USD|EUR|GBP|[$€£])\s?(\d[\d,]*(?:\.\d+)?)/i);
    if (full && ctx.legit?.has(cents(full[1]))) continue;
    if (INTERNAL_PRICE.test(t) || (ours && /\b(?:cost|costs|charge|charged|rate|price|priced|pay|paid)\b/i.test(t))) out.push(["an amount of ours (a rate or price-book figure)", m[0]]);
  }
  if (MONEY_IN_WORDS_OR_BARE.test(t)) out.push(["an amount of ours (a rate)", t.match(MONEY_IN_WORDS_OR_BARE)[0]]);
  // 3. Rates and price-book internals, named without a number (the client's own price list is theirs, R2-9).
  const theirPrices = /\byour (?:own )?(?:price ?lists?|prices|price ?book|pricing|rates?|catalog(?:ue)?|tariff)\b/i.test(t) && !ours;
  for (const m of t.matchAll(new RegExp(INTERNAL_PRICE.source, "gi"))) {
    if (theirPrices) break;
    const before = t.slice(Math.max(0, m.index - 30), m.index);
    if (/\byour(?: own)?\s+(?:[\w-]+\s+)?$|\bclient's\s+$/i.test(before) || /\bquoted\b/i.test(t.slice(m.index - 12, m.index)) || /^[\w\s-]{0,20}\b(?:from|in|on|of) your\b/i.test(t.slice(m.index + m[0].length, m.index + m[0].length + 30))) continue;
    if (/^(?:our (?:[\w-]+ )?(?:prices?|pricing|fees?))$/i.test(m[0]) && !/\b(?:rate|per|session|round|extension|margin|cost)\b/i.test(t)) continue;
    out.push(["our rates or price-book internals", m[0]]);
    break;
  }
  // 4. Our cost, margin, profit or loss.
  const om = t.match(OUR_COST) ?? t.match(OUR_MONEY) ?? (ours && !client ? t.match(OUR_COST_IDIOM) : null);
  if (om) out.push(["our cost or margin", om[0]]);
  // 5. An overrun against our own plan (not the quoted bounds: owner decision O7).
  const ov = t.match(OVERRUN) ?? t.match(OVER_PLAN);
  if (ov && !(QUOTED_BOUNDS.test(t) && !/\b(?:we|our|I)\b/i.test(ov[0]))) out.push(["an overrun against our own plan", ov[0]]);
  return out;
}

const CRED_LABEL = /\b(?:password|passwd|pwd|pass(?:word)?|passcode|secret(?: word| key)?|api[_ -]?key|access[_ -]?key|private[_ -]?key|token)\b(?:\s*[:=]\s*|\s+(?:is|was|with|as)\s+|\s+)["']?([^\s"',;|]+)/gi;
const CRED_SHAPE = /\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{8,}|\bgh[pousr]_[A-Za-z0-9]{20,}|\bAKIA[0-9A-Z]{16}\b|\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}|\bxox[bpas]-[A-Za-z0-9-]{10,}|\bBearer\s+[A-Za-z0-9._-]{16,}/;
const URL_USERINFO = /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/@]+@/i;
const SECRETISH = (v) => /\d/.test(v) || /[#!$%&*@^~+=]/.test(v) || (/[a-z]/.test(v) && /[A-Z]/.test(v) && v.length >= 8);
/** C7, credentials: a labelled secret value, a key- or token-shaped string, a login in an address. */
export function credentialFindings(text) {
  const out = [];
  for (const line of String(text ?? "").split("\n")) {
    for (const m of line.matchAll(CRED_LABEL)) if (SECRETISH(m[1]) && !/^(?:rec|row|\d+)$/i.test(m[1]) && !/^kind:\s*$/i.test(line.slice(Math.max(0, m.index - 6), m.index))) out.push(["a labelled secret value", m[0]]);
    const s = line.match(CRED_SHAPE);
    if (s) out.push(["a key- or token-shaped string", s[0]]);
    // A value named as the password after it ("Glazier!88 as the pass"): added after the held-out measurement.
    for (const m of line.matchAll(/(?<![\w-])(\S*[\d#!$%&*@^~+=]\S*)\s+as (?:the |our |their |a )?(?:pass|password|passcode|secret)\b/gi)) if (SECRETISH(m[1]) && !/^(?:\d+|rec)$/i.test(m[1])) out.push(["a labelled secret value", m[0]]);
    // A login written as user / password ("the login for oc-T1 is oc-t1 / Spring2026!"), and a PIN (R1-10).
    for (const m of line.matchAll(/\b(?:login|log-in|sign[- ]in|credentials?|user(?: ?name)?|account)\b[^.\n]{0,40}?\b(?:is|:|=)\s*\S+\s*[/|:]\s*(\S+)/gi)) if (SECRETISH(m[1].replace(/[.,;]$/, "")) && /[\d#!$%&*@^~+=]/.test(m[1])) out.push(["a login and its password", m[0]]);
    // R3-7: "sign in with <user> and <password>" (the Evaluator's K05).
    for (const m of line.matchAll(/\b(?:sign|log)[- ]?(?:in|on)\s+(?:with|as|using)\s+\S+\s+(?:and|with|plus|,)\s+(?:(?:the\s+)?(?:password|passcode)\s+)?([^\s"',;]+)/gi)) if (SECRETISH(m[1].replace(/[.,;:!?]+$/, "")) && /[\d#!$%&*@^~+=]/.test(m[1])) out.push(["a login and its password", m[0]]);
    // R2-9: a PIN or code with its digits ("PIN 4471 opens the till"), with or without a colon or "is".
    // A verification code, and a few words between the label and its digits: added after the OW-04 follow-up held-out measurement.
    const pin = line.match(/\b(?:pin|pin code|passcode|one-time code|otp|access code|door code|alarm code|security code|verification code)\b(?:\s+(?!is\b|was\b|of\b)[a-z]+){0,3}?\s*(?:[:=]|is|was|of)?\s*\d{4,8}\b/i);
    if (pin) out.push(["a labelled secret value", pin[0]]);
    // R2-9: "the password for the test sender is Morning-Glory-81": the label, what it is for, then the value.
    for (const m of line.matchAll(/\b(?:password|passwd|passcode|pass ?phrase|secret|access code)\s+(?:for|of|to|on)\b[^.:\n]{0,50}?\b(?:is|was|:|=)\s*["']?([^\s"',;|]+)/gi)) if (SECRETISH(m[1].replace(/[.,;:!?]+$/, "")) && !/^(?:rec|row|\d{1,3})$/i.test(m[1])) out.push(["a labelled secret value", m[0]]);
    // R2-9: a pass phrase is words, not a token ("pass phrase: blue kiln seven").
    const phrase = line.match(/\bpass[- ]?phrase\b\s*(?:[:=]|\bis\b)\s*["']?[A-Za-z0-9][^\s"',;|]*(?:\s+[A-Za-z0-9][^\s"',;|.]*)+/i);
    if (phrase) out.push(["a labelled secret value", phrase[0]]);
    // R2-9: a login written user/password, however plain ("the creds are admin/admin", "log in with ops / ops").
    const pair = line.match(/\b(?:creds|credentials|log ?in with|sign ?in with|login|log-in|user(?:name)? and password)\b(?:\s+(?:are|is|with))?\s*[:=]?\s*([A-Za-z0-9._@-]+)\s*\/\s*([A-Za-z0-9._@!#$%^&*+=-]+)/i);
    // The same word as user and password ("tester / tester"): added after the OW-04 follow-up held-out measurement.
    if (pair && (!/^(?:the|a|an|your|their|our|role|tester|testers)$/i.test(pair[1]) || pair[1].toLowerCase() === pair[2].replace(/[.,;:!?]+$/, "").toLowerCase())) out.push(["a login and its password", pair[0]]);
    const u = line.match(URL_USERINFO);
    if (u) out.push(["a login in an address", u[0]]);
  }
  return out;
}

const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
// A phone number: North American with or without the area code (R1-10: "555-0142"), a UK-style grouping,
// or any run of digits after a phone label.
const PHONE = /(?:\+\d{1,3}[\s.-]?)?\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b|(?<![\d-])\d{3}[-.]\d{4}(?![\d-])|\b0\d{3,4} \d{3} \d{3,4}\b|\b(?:tel|phone|mobile|cell)\b\.?:?\s*\+?\d[\d\s().-]{6,}\d/i;
const NAME_HEADER = /^(?:name|names|full name|tester name|tester \(full name\)|first name|last name|surname|email|e-mail|phone|mobile)$/i;
const NOT_A_NAME = new Set(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", ...MONTHS, "The", "A", "An", "This", "That", "Each", "Every", "Your", "Our", "QuickBooks", "Online", "Example", "Studio", "Sandbox", "Session", "Request", "Defect", "Change", "Training", "Environment", "Duplicate", "Build", "Client", "User", "Tester", "Robin"]);
/** C7, people: an email or phone shape, a name column, a listed tester name, a capitalised name in a person's slot. */
export function peopleFindings(text, ctx = {}) {
  const out = [];
  // Every part of a listed name counts (R1-10: a surname alone, "L. Okafor"), in any case ("JESS ARDEN").
  const people = [...new Set((ctx.people ?? []).flatMap((n) => [n, ...String(n).split(/\s+/)]).filter((n) => n && n !== ctx.user && n.length >= 3))];
  const allow = new Set([...NOT_A_NAME, ...String(ctx.client ?? "").split(/\s+/), ctx.user].filter(Boolean));
  for (const line of String(text ?? "").split("\n")) {
    const e = line.match(EMAIL); if (e) out.push(["an email address", e[0]]);
    const p = line.match(PHONE); if (p && !/\b\d{4}-\d{2}-\d{2}\b/.test(p[0]) && !/\b\d{4}-\d{2}-\d{2}\b/.test(line.slice(Math.max(0, p.index - 5), p.index + p[0].length + 3))) out.push(["a phone number", p[0]]);
    if (/^\s*\|/.test(line)) for (const c of line.split("|").map((x) => x.trim())) if (NAME_HEADER.test(c)) out.push(["a name column", c]);
    if (/^[^|]*,/.test(line) && line.split(",").some((c) => NAME_HEADER.test(c.trim())) && line.split(",").some((c) => /^tester id$|^scenario$/i.test(c.trim()))) out.push(["a name column", "Name"]);
    for (const n of people) if (new RegExp(`(?<![\\w@-])${esc(n)}(?![\\w-])`, n.includes(" ") || n === n.toUpperCase() ? "i" : "").test(line) || new RegExp(`(?<![\\w@-])${esc(n.toUpperCase())}(?![\\w-])`).test(line)) { out.push(["a listed tester's name", n]); break; }
    // A capitalised name in a person's slot ("run by", "reported by"). "from" and "call" are not slots: "Orders from New York" (R1-10).
    // R2-9: a slot word in any case ("Tester: Dana Whitfield").
    for (const m of line.matchAll(/\b(?:[Bb]y|[Tt]ested by|[Rr]un by|[Rr]an by|[Rr]eported by|[Tt]hanks to|[Tt]ester|TESTER|[Nn]ame|NAME|[Cc]ontact|[Ss]igned by)\b\)?:?\s+([A-Z][a-z]+)(?:\s+([A-Z][a-z]+))?/g)) {
      const words = [m[1], m[2]].filter(Boolean);
      if (words.every((w) => allow.has(w))) continue;
      if (words.length === 2 || (m[0].toLowerCase().startsWith("thanks") || /^(?:tested|run|ran|reported) by$/i.test(m[0].split(/\s+/).slice(0, 2).join(" ")))) out.push(["a person's name", words.join(" ")]);
    }
  }
  return out;
}

/** The client's record values (customers, order numbers, codes) from its own files, for the data check. */
export function recordValues(view, key) {
  const vals = new Set();
  for (const f of view.all().filter((x) => new RegExp(`^${esc(OW)}plans/${esc(key.slug)}/inbox/.*\\.(csv|txt)$`).test(x))) {
    const t = view.read(f) ?? "";
    for (const m of t.matchAll(/\b[A-Z][a-z]+(?: [A-Z][a-z]+)+\b/g)) if (!/^(?:Glazed|Floor|Please|Our|Your|Description|Ship|Line|Date|Site)\b/.test(m[0])) vals.add(m[0]);
    for (const m of t.matchAll(/\bPO-\d{4,}\b/g)) vals.add(m[0]);
  }
  for (const v of key.records ?? []) vals.add(String(v));
  return vals;
}
const CODEISH = /\b[A-Z]{2}-\d{3,}\b|\b\d{3,}-?[A-Z]{2}\b|\b[a-z]{2} \d{4}\b/;
// Owner decision OD-3: generic shapes. An ID-like token (a 5+ digit number, a prefixed code, a #-number, a long
// mixed code, an account number), never one of this skill's own ids, a date, a range ("ids 10480 to 10489") or a placeholder.
const OUR_ID = /^(?:AC|SC|UAT|RUN|CO|WP|LC|INV-request)-/;
const ID_TOKEN = /(?<![\w./-])(?:#?[A-Z]{2,5}-\d{3,}(?:-\d+)*|#[A-Z]?\d{4,}|\d{5,}(?:-\d{1,4})?|(?=[A-Z0-9]*\d)(?=[A-Z0-9]*[A-Z])[A-Z0-9]{10,})(?![\w/-])/g;
const CARD = /\b(?:\d{4}[ -]){3}\d{1,4}\b|\b\d{15,16}\b|\bcard (?:ending|ending in|number|no\.?)\s*(?:in\s+)?\d{4}\b/i;
const RANGE = /(?:#?[A-Z]{0,5}-?\d{3,})\s*(?:to|through|–|—)\s*(?:#?[A-Z]{0,5}-?\d{3,})/g;
const idTokens = (s) => [...String(s).replace(RANGE, " ").matchAll(ID_TOKEN)].map((m) => m[0]).filter((t) => !OUR_ID.test(t) && !/^\d{4}-\d{2}-\d{2}$/.test(t));
/** The shape a field has: an email, a phone number, a card-like number or an ID-like token. */
function valueShape(field) {
  if (EMAIL.test(field)) return "an email address";
  if (CARD.test(field)) return "a card-like number";
  if (PHONE.test(field)) return "a phone number";
  if (idTokens(field).length) return "an ID-like token";
  return null;
}
/** A delimited row's fields: a table row by its pipes, else commas, semicolons or tabs (three fields or more). */
function rowFields(line) {
  if (/^\s*\|/.test(line)) return line.split("|").map((c) => c.trim()).filter(Boolean);
  // A pasted table row inside a sentence ("… | 10482 | Hannah's Bakery | 54.00 |"): the part between the first and last pipe.
  if ((line.match(/\|/g) ?? []).length >= 3) return line.slice(line.indexOf("|"), line.lastIndexOf("|") + 1).split("|").map((c) => c.trim()).filter(Boolean);
  // A pipe row with no outer pipes ("H. Brandt | 555-0147 | 78704"): added after the round-2 held-out measurement.
  for (const d of ["\t", "|", ";", ","]) { const f = line.split(d).map((c) => c.trim()).filter(Boolean); if (f.length >= 3) return f; }
  return [];
}
// Owner decision OD-7: a table is judged by its content, never by its length. A column whose header counts
// something ("Orders in the test", "Expected count", "Problems") holds counts, not ids, so a bare number there is
// not ID-like; a column headed by a record noun ("Order", "Invoice", "Account", "Card") keeps the ID-token rule.
const ID_HEADER = /\b(?:ids?|#|refs?|reference|numbers?|no\.?|order|invoice|account|acct|card|customer|member|tracking|sku|code|ticket|case|record)\b/i;
const COUNT_HEADER = /\b(?:counts?|qty|quantity|totals?|volume|expected|amount|share|price|passed|failed|logged|fixed|retested|minutes|hours|days|testers|sessions|week|month|session|step|run|round)\b|\b[a-z]+[^\Wsu]s\b/i;
const isCountColumn = (h) => /\b(?:number|no\.?) of\b/i.test(h) || (!ID_HEADER.test(h) && COUNT_HEADER.test(h));
// A column of people or customers by its header: any capitalised name in it is a record value (OD-7: names;
// R3-3: "Client", "Customers", "Company", "Store" too).
const NAME_COLUMN = /^(?:customers?(?: name)?|clients?(?: name)?|name|names|full name|contacts?(?: name)?|recipients?|ship to|buyers?|payees?|bill to|compan(?:y|ies)|business(?:es)?|stores?|shops?|vendors?|suppliers?)$/i;
// Owner decision R3-4: a payment provider's published test card is test data, never a record value. A small list:
// Stripe's published test numbers (brands, debit and prepaid, and the documented declines), and Visa's published
// test card 4111 1111 1111 1111 (owner decision 2026-10-19, ow-uat 1.0.2). A number not listed, or a real card
// shape, is still refused.
export const PUBLISHED_TEST_CARDS = new Set([
  "4111111111111111",
  "4242424242424242", "4000056655665556", "5555555555554444", "2223003122003222", "5200828282828210", "5105105105105100",
  "378282246310005", "371449635398431", "6011111111111117", "6011000990139424", "3056930009020004", "36227206271667",
  "3566002020360505", "6200000000000005", "4000000000000002", "4000000000009995", "4000000000009987", "4000000000009979",
  "4000000000000069", "4000000000000127", "4000000000000119", "4000002500003155", "4000002760003184", "4000003800000446",
]);
/** The text with every published test card number taken out (R3-4), whatever its spacing. */
const withoutTestCards = (s) => String(s).replace(/\b(?:\d{4}[ -]){3}\d{1,4}\b|\b\d{14,19}\b/g, (m) => (PUBLISHED_TEST_CARDS.has(m.replace(/[ -]/g, "")) ? " " : m));
// R3-4: a record id marked as made for the test (in the sandbox, a test order, created by a scenario) is a clean-up
// pointer, not a client record. The mark must be on the row, its header or the sentence; an email, phone, card or
// name beside it is still a record value.
const TEST_MARK = /\bsandbox\b|\btest[- ](?:mode|orders?|invoices?|records?|accounts?|customers?|data|environment|copy|system|tenant|store|payments?|transactions?)\b|\b(?:created|made|entered) (?:during|in|for|by) (?:the )?(?:test|testing|session \d+|SC-\d+)\b|\bcreated by SC-\d+/i;
const NOT_A_RECORD_NAME = /^(?:Test|Synthetic|Sample|Anonymi[sz]ed|Example|None|Not|N\/A|Any|Each|Every)\b/;
const SEPARATOR = /^\s*\|[\s:|-]+\|\s*$/;
/** A table row's cells, by its pipes, keeping empty cells inside the row so they line up with the header. */
const cellsOf = (line) => { const c = line.split("|").map((x) => x.trim()); return c.slice(/^\s*\|/.test(line) ? 1 : 0, /\|\s*$/.test(line) ? -1 : undefined); };
/** C7, data (OD-3, OD-7): values copied from the client's own files, a delimited row or table row that holds a contact, card, ID-like value or a name, a labelled record field. */
export function dataFindings(text, ctx = {}) {
  const out = [];
  const lines = String(text ?? "").split("\n");
  let header = null, headerLine = "";
  lines.forEach((raw, i) => {
    for (const v of ctx.records ?? []) if (raw.includes(v)) { out.push(["a value copied from a client record", v]); break; }
    const line = withoutTestCards(raw);
    const pipe = /^\s*\|/.test(line);
    if (!pipe) { header = null; headerLine = ""; }
    else if (SEPARATOR.test(line)) { header = i > 0 && /^\s*\|/.test(lines[i - 1]) ? cellsOf(lines[i - 1]) : null; headerLine = header ? lines[i - 1] : ""; return; }
    else if (i + 1 < lines.length && SEPARATOR.test(lines[i + 1])) return; // a header row
    const marked = TEST_MARK.test(line) || TEST_MARK.test(headerLine);
    const fields = pipe ? cellsOf(line) : rowFields(line);
    if (fields.filter(Boolean).length >= (pipe ? 2 : 3)) {
      const shape = fields.map((c, k) => {
        // A bare number under a column that counts is a count, unless it is five digits or more with no separator
        // (R3-3: "Orders" over order numbers).
        if (header && isCountColumn(String(header[k] ?? "")) && /^#?\d[\d,]*(?:\.\d+)?$/.test(c) && !/^#?\d{5,}$/.test(c)) return EMAIL.test(c) || CARD.test(c) ? valueShape(c) : null;
        const s = valueShape(c);
        return s === "an ID-like token" && marked ? null : s;
      }).find(Boolean);
      const named = header && fields.some((c, k) => NAME_COLUMN.test(String(header[k] ?? "")) && /\b[A-Z][a-z'’]+/.test(c) && !NOT_A_RECORD_NAME.test(c) && !(ctx.client && c.includes(ctx.client)));
      if (shape) out.push([`a pasted record row (${shape})`, line.trim().slice(0, 60)]);
      else if (named) out.push(["a pasted record row (a name)", line.trim().slice(0, 60)]);
      else if (pipe && fields.filter(Boolean).length >= 3 && fields.some((c) => CODEISH.test(c) && !OUR_ID.test(c) && !/^LC-nnnn/.test(c)) && fields.some((c) => /^\d+$/.test(c))) out.push(["a pasted record row", line.trim().slice(0, 60)]);
    }
    const card = !fields.length && line.match(CARD);
    if (card) out.push(["a card-like number", card[0]]);
    const lab = line.match(/\b(?:customer|ship to|address|client name|account name)\s*:\s*[A-Z0-9][^,;.|]*/i);
    if (lab) out.push(["a labelled record field", lab[0]]);
    // A record id named in prose ("Account 99120345 for Harbor Florists …", the Evaluator's DP09). Prose naming a
    // record with no id-like token stays with the self-check (OD-3).
    const idProse = !pipe && !marked && line.replace(RANGE, " ").match(/\b(?:order|account|acct|invoice|customer|member|card|ticket|booking|policy|tracking)\s+(?:no\.?\s*|number\s+|#\s?)?(#?[A-Z]{2,5}-\d{3,}(?:-\d+)*|#?\d{5,})(?![\w/-])/i);
    if (idProse && !OUR_ID.test(idProse[1])) out.push(["a record id in prose", idProse[0]]);
  });
  return out;
}

const CREDIT_VERB = /\b(?:confirmed|verified|tested|checked|signed off|approved|ran|run|validated|accepted|passed)\b/i;
// R1-8: "the shop's own tester", "your own team", "your staff" are the client's people too.
// R2-9: "confirmed by the shop", "by the client", "by you": the client as the agent.
const CLIENT_PEOPLE = /\b(?:your (?:[\w-]+ ){0,2}?(?:team|people|testers?|staff|coordinator|manager|bookkeeper)|the (?:client|shop|store|company|business)'s (?:own )?(?:team|people|testers?|staff)|(?:order coordinator|operations manager|bookkeeper|shop manager)|by (?:the )?(?:shop|client|store|company|business)|by you(?:rselves)?)\b/i;
// R1-8: "corrected", "no longer occurs", "now works" call it fixed too.
const DONE = /\b(?:fixed|resolved|sorted|done|working|works|closed|cleared|repaired|squashed|dealt with|corrected|put right|taken care of|no longer (?:occurs|happens|appears|fails|shows)|behav(?:es|ing) (?:as agreed|correctly|as expected)|gone away|went away|disappeared)\b/i;
const RETEST_PENDING = /\bretest\b[^.]*\b(?:due|pending|next|to come|awaited|in session)\b|\bnot yet retested\b|\bawaiting (?:its |the )?retest\b|\breported\b[^.]*\bfixed\b|\bpassed its retest\b|\bretested-pass\b|\b(?:will|to) (?:be )?retest(?:ed)?\b/i;
// "the checks were each …": added after the OW-04 follow-up held-out measurement.
// A claim about every check, with no check named ("Your people ran all three checks").
const ALL_CHECKS = /\b(?:all|every|each|both)\b(?: (?:of )?(?:the|your|our|three|four|five|six|seven|eight|nine|ten))*\s+(?:acceptance\s+)?checks?\b|\ball\s+(?:three|four|five|six|seven|eight|nine|ten)\s+checks\b|\b(?:the|your)\s+(?:acceptance\s+)?checks\s+(?:were|have been|are)\s+(?:all|both|each|every one)\b/i;
// R2-2: an invitation ("is welcome to run AC-1.1") is not a claim that it was run.
const NOT_A_CLAIM = /\b(?:please|if you (?:would like|want|wish)|you (?:may|can|could)|would like your|will (?:test|run|retest)|to test it|(?:is|are) (?:welcome|free|invited) to|feel free to|may (?:want|wish) to|(?:can|could|may) (?:try|run|rerun|test))\b/i;
/**
 * R2-2: a word that calls a problem fixed, said of the future, under a condition or negated, is no claim:
 * "it will be closed", "once it is fixed", "not fixed yet", "has not been resolved".
 */
const doneClaims = (s) => [...s.matchAll(new RegExp(DONE.source, "gi"))].filter((m) => {
  const before = s.slice(Math.max(0, m.index - 40), m.index);
  if (/\b(?:not|n't|never|nor|neither|nothing|no one)\b(?:\s+(?:yet|been|be|is|are|was|were|being|fully|quite|completely|properly|still|really))*\s*$/i.test(before)) return false;
  if (/(?:\b(?:will|would|shall|going to|should|must|can|could|may|might)|'ll)(?:\s+(?:then|also|only|soon|now|still))?(?:\s+(?:be|get|have been|become))?(?:\s+(?:marked|recorded|shown|listed|called|set)(?:\s+as)?)?\s*$|\bto (?:be|get|become)\s*$/i.test(before)) return false;
  if (/\b(?:once|when|if|after|until|unless|before)\b[^.,;]{0,30}$/i.test(before)) return false;
  return true;
});
/**
 * C8: a client sentence crediting a builder-only check to the client's people, or calling an unretested UAT-nn
 * fixed. `self` is the UAT-nn a reason belongs to: its sentences are about it even when they name no id (R1-16).
 */
export function falsePassFindings(s, ctx = {}, self = null) {
  const out = [];
  const negated = /\b(?:none|no|not|never|neither)\b/i.test(s);
  for (const ac of ctx.userAlone ?? []) {
    const at = s.search(new RegExp(`\\b${esc(ac)}(?!\\w|\\.\\d)`));
    if (at < 0) continue;
    if (/\b(?:builder|user alone|by the user|not tested by your people|checked by the builder|alone|did not attend|didn't attend)\b/i.test(s)) continue;
    if (new RegExp(`\\b(?:except|other than|apart from|but not|not)\\b[^.]{0,25}${esc(ac)}`, "i").test(s)) continue;
    if (NOT_A_CLAIM.test(s)) continue;
    if (CLIENT_PEOPLE.test(s) && CREDIT_VERB.test(s)) out.push(["a builder-only check credited to the client's people", ac]);
  }
  if ((ctx.userAlone ?? []).length && !out.length && ALL_CHECKS.test(s) && CLIENT_PEOPLE.test(s) && CREDIT_VERB.test(s) && !negated && !NOT_A_CLAIM.test(s) && !/\b(?:except|other than|apart from|but not|besides|builder|user alone)\b/i.test(s)) {
    out.push(["every check credited to the client's people, though some passed only with the user alone", ctx.userAlone.join(", ")]);
  }
  for (const id of ctx.notRetested ?? []) {
    const named = new RegExp(`\\b${esc(id)}\\b`).test(s);
    if (!named && !(self === id && !/\bUAT-\d+\b/.test(s))) continue;
    const m = doneClaims(s)[0];
    if (m && !RETEST_PENDING.test(s)) out.push(["a problem called fixed before its retest passed", `${id} ${m[0]}`]);
  }
  return out;
}

// ── the files a client reads ─────────────────────────────────────────────────

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
function clientOutputs(run, key) {
  const dir = U(key);
  return run.written().filter((f) => f.startsWith(`${dir}/`) && (/\/uat-pack-[^/]+\.md$/.test(f) || /\/export\/.*\.(?:html|csv)$/.test(f) || /\/signoff-request-\d+\.md$/.test(f) || /\/(?:acceptance-record|punch-list)\.md$/.test(f) || /\/acceptance-addendum-CO-\d+\.md$/.test(f) || /\/defects\/UAT-\d+\.md$/.test(f)));
}
function clientTextOf(run, f) {
  const t = run.read(f) ?? "";
  if (f.endsWith(".html")) return decode(t.replace(/<title>[\s\S]*?<\/title>/i, "").replace(/<\/(?:p|li|h\d|tr|td|th)>/g, ". ").replace(/<[^>]+>/g, " "));
  if (f.endsWith(".csv")) return t;
  const { content } = matter(t);
  if (/\/defects\/UAT-\d+\.md$/.test(f)) return sectionOf(content, "Reason (for the client)") ?? "";
  return internalSplit(content).client;
}
/** Amounts a client may see: the quoted UAT line, signed change orders, the fixed price, the payments, the documentation line. */
function legitAmounts(run, key) {
  const out = new Set();
  const add = (v) => { const c = cents(v); if (Number.isFinite(c) && c > 0) out.add(c); };
  for (const f of [`${OW}plans/${key.slug}/quote.md`, `${OW}plans/${key.slug}/contract-inputs.md`]) {
    try { const d = matter(run.read(f) ?? "").data; add(d.fixed_price); (d.payments ?? []).forEach(add); add(d.uat?.price); add(d.documentation_price); add(d.documentation_training?.price); } catch { /* reported elsewhere */ }
  }
  for (const f of run.all().filter((x) => new RegExp(`^${esc(OW)}builds/${esc(key.slug)}/changes/CO-\\d+\\.md$`).test(x))) {
    try { const d = matter(run.read(f)).data; if (d.status === "signed") add(d.price); } catch { /* reported elsewhere */ }
  }
  return out;
}
const proseOf = (text) => String(text).split("\n").filter((l) => !/^\s*\|/.test(l) && !/^\s*(?:NEXT|DONE|IF IT IS NOT AVAILABLE)\b/.test(l.trim())).join("\n");

// ── checks ───────────────────────────────────────────────────────────────────

function checkHeaders(key, run) {
  const p = [];
  for (const f of run.written()) {
    if (/\/agreed\/(?!contract-terms\.md)/.test(f) || /\/export\/.*\.(?:html|csv|pdf|docx)$/.test(f) || /\/evidence\/(?!index\.md)/.test(f) || f === `${OW}STATUS.md`) continue;
    let data;
    try {
      data = /\.ya?ml$/.test(f) ? parsed(run.read(f), f, "yaml") : parsed(run.read(f), f, "md").data;
    } catch (e) { p.push(reason(e)); continue; }
    const name = f.match(/[^/]+$/)[0];
    if (!String(data.ow_artefact ?? "").startsWith("ow-uat/")) p.push(`${f}: ow_artefact is ${data.ow_artefact ?? "missing"}, expected ow-uat/<artefact>`);
    if (data.schema !== 1) p.push(`${f}: schema is ${data.schema}`);
    if (!/^ow-uat \d+\.\d+\.\d+ \(protocol 1\)$/.test(String(data.written_by ?? ""))) p.push(`${f}: written_by is "${data.written_by}"`);
    if (data.workstream !== key.slug) p.push(`${f}: workstream is ${data.workstream}`);
    if (!data.subject) p.push(`${f}: no subject`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso(data.created) ?? "")) p.push(`${f}: created is "${iso(data.created)}"`);
    else if (key.today && iso(data.created) > iso(key.today)) p.push(`${f}: created ${iso(data.created)} is after today (${iso(key.today)})`);
    if (!CLOCKS.test(String(data.clock ?? ""))) p.push(`${f}: clock is "${data.clock}"`);
    if (data.origin !== "skill") p.push(`${f}: origin is ${data.origin}`);
    if (name === "secrets-seen.log" && !/^---\n/.test(run.read(f) ?? "")) p.push(`${f}: the log starts with the protocol header block`);
  }
  return p;
}

const EDGES = join(SKILL, "skill.edges.yaml");
/**
 * The writer of each file, exact to the mode: the Sprint 3 contract's C1 table, pinned here so the
 * run-level check does not widen when the edges do (OW-04 round 1, R1-13). `edgesWriterDrift` holds
 * skill.edges.yaml to it. An append log takes any mode of its verbs.
 */
export const WRITER_PIN = [
  ["uat/<client>/uat.yaml", ["/ow-uat-plan", "/ow-uat-plan --add-co", "/ow-uat-plan --addendum", "/ow-uat-plan --keep-frozen", "/ow-uat-plan --refreeze"]],
  ["uat/<client>/agreed/scope.md", ["/ow-uat-plan", "/ow-uat-plan --refreeze"]],
  ["uat/<client>/agreed/acceptance.md", ["/ow-uat-plan", "/ow-uat-plan --refreeze"]],
  ["uat/<client>/agreed/quick-scope.md", ["/ow-uat-plan", "/ow-uat-plan --refreeze"]],
  ["uat/<client>/agreed/contract-terms.md", ["/ow-uat-plan", "/ow-uat-plan --refreeze"]],
  ["uat/<client>/agreed/CO-nn.md", ["/ow-uat-plan", "/ow-uat-plan --add-co", "/ow-uat-plan --refreeze"]],
  ["uat/<client>/scenarios/SC-nn.md", ["/ow-uat-plan", "/ow-uat-plan --add-co", "/ow-uat-plan --addendum"]],
  ["uat/<client>/pack.yaml", ["/ow-uat-pack"]],
  ["uat/<client>/uat-pack-<role>.md", ["/ow-uat-pack"]],
  ["uat/<client>/export/uat-pack-<role>.html", ["/ow-uat-pack"]],
  ["uat/<client>/export/uat-pack-<role>.pdf", ["/ow-uat-pack"]],
  ["uat/<client>/export/uat-pack-<role>.docx", ["/ow-uat-pack"]],
  ["uat/<client>/export/results-template.csv", ["/ow-uat-pack"]],
  ["uat/<client>/runs/RUN-nn.md", ["/ow-uat-run"]],
  ["uat/<client>/evidence/index.md", ["/ow-uat-run"]],
  ["uat/<client>/defects/UAT-nn.md", ["/ow-uat-defect"]],
  ["uat/<client>/signoff-request-<n>.md", ["/ow-uat-signoff"]],
  ["uat/<client>/export/signoff-request-<n>.pdf", ["/ow-uat-signoff"]],
  ["uat/<client>/export/signoff-request-<n>.docx", ["/ow-uat-signoff"]],
  ["uat/<client>/signoff-requests.yaml", ["/ow-uat-signoff", "/ow-uat-signoff --sent", "/ow-uat-signoff --signed", "/ow-uat-signoff --deemed", "/ow-uat-signoff --readiness", "/ow-uat-signoff --builder-delay", "/ow-uat-signoff --backstop", "/ow-uat-signoff --addendum"]],
  ["uat/<client>/signoff.md", ["/ow-uat-signoff --signed", "/ow-uat-signoff --deemed"]],
  ["uat/<client>/acceptance-record.md", ["/ow-uat-signoff --signed", "/ow-uat-signoff --deemed"]],
  ["uat/<client>/punch-list.md", ["/ow-uat-signoff --signed", "/ow-uat-signoff --deemed"]],
  ["uat/<client>/backstop-log.yaml", ["/ow-uat-signoff --readiness", "/ow-uat-signoff --builder-delay"]],
  ["uat/<client>/backstop.md", ["/ow-uat-signoff --backstop"]],
  ["uat/<client>/acceptance-addendum-CO-nn.md", ["/ow-uat-signoff --addendum"]],
  ["uat/<client>/secrets-seen.log", ["/ow-uat-plan", "/ow-uat-pack", "/ow-uat-run", "/ow-uat-defect", "/ow-uat-signoff"], "append"],
];
const pathRe = (path) => new RegExp(`^${`${OW}${path}`.split(/(<[^>]+>|\bnn\b)/).map((s) => (/^<[^>]+>$/.test(s) ? "[^/]+" : s === "nn" ? "\\d+" : esc(s))).join("")}$`, "i");
/** Every file this skill may write, with the verbs (and modes) that may write it (WRITER_PIN). */
export function writerRows() {
  return WRITER_PIN.map(([path, verbs, append]) => ({ path, re: pathRe(path), verbs, append: append === "append" }));
}
export const writersOf = (rel) => [...new Set(writerRows().filter((r) => r.re.test(rel)).flatMap((r) => r.verbs))];
const writtenBy = (rel, verb) => writerRows().some((r) => r.re.test(rel) && (r.verbs.includes(verb) || (r.append && r.verbs.includes(String(verb).split(" ")[0]))));
/** Where skill.edges.yaml's writes differ from the pinned C1 table: a widened or narrowed writer, a new or a lost file. */
export function edgesWriterDrift(edgesText = readFileSync(EDGES, "utf8")) {
  const e = yaml.load(edgesText);
  const got = new Map();
  const p = [];
  for (const w of e?.writes ?? []) {
    if (w.path === "STATUS.md") continue;
    const root = String(w.verb).split(" ")[0];
    got.set(w.path, [...(got.get(w.path) ?? []), String(w.verb), ...(w.modes ?? []).map((m) => `${root} ${m}`)]);
    // An append log is appended by every writer, never rewritten (the Evaluator's WP6: the pin now holds the flag too).
    const pin = WRITER_PIN.find(([q]) => q === w.path);
    if (pin?.[2] === "append" && w.append !== true) p.push(`skill.edges.yaml: ${w.verb} writes ${w.path} without append: true; the C1 table has it as an append log`);
  }
  for (const [path, verbs] of WRITER_PIN) {
    const g = got.get(path);
    if (!g) { p.push(`skill.edges.yaml writes no ${path}; the C1 table has ${verbs.join(", ")}`); continue; }
    const extra = g.filter((v) => !verbs.includes(v)), lost = verbs.filter((v) => !g.includes(v));
    if (extra.length) p.push(`skill.edges.yaml lets ${extra.join(", ")} write ${path}; the C1 table allows only ${verbs.join(", ")}`);
    if (lost.length) p.push(`skill.edges.yaml drops ${lost.join(", ")} as a writer of ${path}`);
  }
  for (const path of got.keys()) if (!WRITER_PIN.some(([q]) => q === path)) p.push(`skill.edges.yaml writes ${path}, which the C1 table does not list`);
  return p;
}
function checkWrites(key, run) {
  const p = [];
  const verbs = asList(key.verbs).map(String);
  if (!verbs.length) return ["answer key: verbs lists no verb this run ran"];
  for (const f of run.written()) {
    if (f === `${OW}STATUS.md`) continue;
    const ws = writersOf(f);
    if (!ws.length) { p.push(`${f}: no verb of this skill writes this file (the C1 writer table)`); continue; }
    if (!verbs.some((v) => writtenBy(f, v))) p.push(`${f}: written in a run of ${verbs.join(", ")}, but only ${ws.join(", ")} may write it (one writer per file, exact to the mode)`);
  }
  return p;
}

/** The uat.yaml keys each plan step writes; a recorded step's keys never change on a resume (R1-5). */
const STEP_KEYS = { basis: ["ready", "basis", "checks", "cos"], terms: ["terms", "clauses", "calendars"], mix: ["mix"], people: ["client_contact", "testers"], environment: ["environment"], data: ["test_data"], schedule: ["schedule"], side_effects: ["side_effects"], gitignore: ["gitignore"] };
function recordedStepsChanged(a, b, refreeze = null) {
  const p = [];
  const modes = asList(b.events).length > asList(a.events).length; // a -plan mode may extend checks, cos and basis
  // R2-5: --refreeze changes only the file it names: that one basis row, and for contract-terms.md the terms,
  // clauses and contract calendar the user confirms again (OD-5, OD-6). Every other recorded output stands.
  const terms = /contract-terms\.md$/.test(String(refreeze ?? ""));
  const others = (y) => JSON.stringify(asList(y.basis).filter((r) => r?.file !== refreeze));
  for (const s of asList(a.plan_steps).map((x) => x.step)) {
    for (const k of STEP_KEYS[s] ?? []) {
      if (refreeze) {
        if (k === "basis") { if (others(a) !== others(b)) p.push(`uat.yaml basis: a row other than ${refreeze}'s changed; --refreeze changes only the file it names`); continue; }
        if (terms && ["terms", "clauses", "calendars"].includes(k)) continue;
        if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) p.push(`uat.yaml ${k}, written by the recorded ${s} step, changed under --refreeze ${refreeze}; a refreeze changes only the file it names${terms ? " and the terms the user confirms again" : ""}`);
        continue;
      }
      if (modes && ["basis", "checks", "cos"].includes(k)) continue;
      if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) p.push(`uat.yaml ${k}, written by the recorded ${s} step, changed; a recorded step's outputs stand on a resume`);
    }
  }
  return p;
}

/** Write-once files never change; logs and records only grow. */
function checkWriteOnce(key, run) {
  const p = [];
  const dir = U(key);
  const mode = asList(key.verbs).join(" ");
  // A real run folder holds the whole workspace: a file the layers below held and the run does not was deleted (R1-4).
  if (run.realRun) for (const f of run.priorAll().filter((x) => x.startsWith(OW))) if (!run.inRun(f)) p.push(`${f}: deleted by this run; nothing this skill or another wrote is ever deleted (runs, requests, the sign-off files, logs and evidence stay)`);
  for (const f of run.written()) {
    const before = run.priorRead(f);
    if (before == null) continue;
    const after = run.read(f) ?? "";
    if (before === after) continue;
    if (/\/runs\/RUN-\d+\.md$|\/signoff-request-\d+\.md$|\/(?:signoff|acceptance-record|punch-list|backstop)\.md$|\/acceptance-addendum-CO-\d+\.md$|\/scenarios\/SC-\d+\.md$|\/evidence\/(?!index\.md)[^/]+$/.test(f)) { p.push(`${f}: written once and never edited, but this run changed it`); continue; }
    if (/\/agreed\//.test(f)) { if (!/--refreeze/.test(mode)) p.push(`${f}: agreed/ is frozen; only -plan --refreeze copies a file again`); continue; }
    if (/\/secrets-seen\.log$|\/evidence\/index\.md$/.test(f)) {
      const keep = /index\.md$/ .test(f) ? before.split("\n").filter((l) => l.startsWith("| ") && !/^\| item \|/.test(l)) : before.split("\n");
      for (const l of keep) if (!after.includes(l)) p.push(`${f}: an earlier line was rewritten or removed ("${l.slice(0, 60)}")`);
      continue;
    }
    if (/\/defects\/UAT-\d+\.md$/.test(f)) {
      const h0 = [...(sectionOf(matter(before).content, "History") ?? "").matchAll(/^- .+$/gm)].map((m) => m[0]);
      const h1 = [...(sectionOf(matter(after).content, "History") ?? "").matchAll(/^- .+$/gm)].map((m) => m[0]);
      h0.forEach((l, i) => { if (h1[i] !== l) p.push(`${f}: history line ${i + 1} was rewritten; history lines are only added`); });
      continue;
    }
    if (/\/uat\.yaml$/.test(f)) {
      try {
        const a = yaml.load(before), b = yaml.load(after);
        (a.plan_steps ?? []).forEach((s, i) => { if (JSON.stringify(b.plan_steps?.[i]) !== JSON.stringify(s)) p.push(`${f}: plan step ${s.step} (rec ${s.rec}) was changed; a recorded step is never redone`); });
        const refrozen = /--refreeze/.test(mode) ? (asList(b.events).slice(asList(a.events).length).map((e) => String(e?.event ?? "").match(/^refrozen (\S+?):/)?.[1]).find(Boolean) ?? key.plan_mode?.file ?? "(the file it names)") : null;
        p.push(...recordedStepsChanged(a, b, refrozen).map((x) => `${f}: ${x}`));
        (a.events ?? []).forEach((s, i) => { if (JSON.stringify(b.events?.[i]) !== JSON.stringify(s)) p.push(`${f}: event rec ${s.rec} was changed`); });
        const keep = (y) => JSON.stringify({ ...y, events: undefined, plan_steps: undefined, basis: undefined, checks: undefined, cos: undefined, created: undefined });
        if (!/--add-co|--refreeze|--keep-frozen|--addendum/.test(mode) && (a.plan_steps ?? []).some((s) => s.step === "scenarios") && keep(a) !== keep(b)) p.push(`${f}: a complete plan's keys changed outside a -plan mode`);
      } catch (e) { p.push(`${f}: ${reason(e)}`); }
      continue;
    }
    if (/\/signoff-requests\.yaml$/.test(f)) {
      try {
        const a = yaml.load(before).requests ?? [], b = yaml.load(after).requests ?? [];
        for (const r of a) {
          const s = b.find((x) => x.n === r.n);
          if (!s) { p.push(`${f}: request ${r.n}'s row was removed`); continue; }
          for (const k of ["written", "written_rec", "build_label", "stated_deemed_date"]) if (String(s[k]) !== String(r[k])) p.push(`${f}: request ${r.n}'s ${k} changed`);
          (r.status_history ?? []).forEach((h, i) => { if (JSON.stringify(s.status_history?.[i]) !== JSON.stringify(h)) p.push(`${f}: request ${r.n}'s status history entry ${i + 1} was rewritten`); });
        }
      } catch (e) { p.push(`${f}: ${reason(e)}`); }
    }
  }
  // A run deletes nothing this skill wrote earlier (a real run only: a golden lists its writes).
  return p;
}

function checkStatus(key, run) {
  const p = [];
  const now = run.read(`${OW}STATUS.md`);
  if (now == null) return ["STATUS.md was not written"];
  const lines = now.split("\n").filter((l) => l.trim());
  const before = (run.priorRead(`${OW}STATUS.md`) ?? "").split("\n").filter((l) => l.trim());
  before.forEach((l, i) => { if (lines[i] !== l) p.push(`STATUS.md line ${i + 1} was rewritten; STATUS.md is append-only`); });
  const added = lines.slice(before.length);
  const want = key.status?.lines ?? [];
  if (added.length !== want.length) p.push(`STATUS.md gained ${added.length} line(s), expected ${want.length}`);
  added.forEach((line, i) => {
    const f = line.split(" | ");
    const n = before.length + i + 1;
    const w = want[i];
    if (f.length !== 5) { p.push(`STATUS line ${n} has ${f.length} fields, expected 5`); return; }
    if (!/^\d{4}-\d{2}-\d{2} \(clock: (tool|host-supplied|user-stated|assumed)\)$/.test(f[0])) p.push(`STATUS line ${n}: date field "${f[0]}" lacks a clock source`);
    if (!/^ow-uat \d+\.\d+\.\d+$/.test(f[1])) p.push(`STATUS line ${n}: skill field is "${f[1]}"`);
    if (/\bnext: [a-z0-9-]+ \/[a-z0-9-]+ --/.test(f[3])) p.push(`STATUS line ${n}: next: carries a mode (protocol §5)`);
    if (!w) return;
    if (f[2] !== w.path) p.push(`STATUS line ${n}: path ${f[2]}, expected ${w.path}`);
    if (f[3] !== `next: ${w.next}`) p.push(`STATUS line ${n}: "${f[3]}", expected "next: ${w.next}"`);
    if (f[4] !== `awaiting: ${w.awaiting}`) p.push(`STATUS line ${n}: "${f[4]}", expected "awaiting: ${w.awaiting}"`);
  });
  return p;
}

function checkRec(key, run) {
  const p = [];
  const dir = U(key);
  const prior = recsOf(priorView(run), dir);
  const priorMax = prior.length ? Math.max(...prior) : 0;
  const now = [];
  for (const f of run.written().filter((x) => x.startsWith(`${dir}/`) && TEXT.test(x) && !/\/agreed\/|\/evidence\/(?!index\.md)/.test(x))) {
    const before = run.priorRead(f) ?? "";
    const t = run.read(f) ?? "";
    const old = new Set(recsOf({ all: () => [f], read: () => before }, dir));
    for (const r of recsOf({ all: () => [f], read: () => t }, dir)) if (!old.has(r)) now.push(r);
  }
  const fresh = [...new Set(now)].sort((a, b) => a - b);
  fresh.forEach((r, i) => {
    if (r <= priorMax) p.push(`rec ${r} is not after the highest rec already under ${dir}/ (${priorMax}); recording order is one more than the highest`);
    else if (r !== priorMax + 1 + i) p.push(`rec ${r}: the new recs should run on from ${priorMax + 1} with no gap (found ${fresh.join(", ")})`);
  });
  return p;
}

// ── routes ───────────────────────────────────────────────────────────────────

/** The verbs a handed-over path or wording may run, files first (references/routing-and-resume.md §3). */
export function expectedRoute(run, key) {
  const r = key.route ?? {};
  const view = priorView(run);
  const dir = U(key);
  const today = iso(key.today ?? run.today);
  const signed = view.exists(`${dir}/signoff.md`);
  const hasUat = view.exists(`${dir}/uat.yaml`);
  const uat = hasUat ? (() => { try { return uatOf(view, dir); } catch { return {}; } })() : null;
  const planned = Boolean(uat?.plan_steps?.some((s) => s.step === "scenarios"));
  const reqs = hasUat ? requestsOf(view, dir) : [];
  const live = reqs.filter((q) => /^(drafted|sent)$/.test(q.status) && !supersededBy(view, key, q));
  const crit = () => (planned ? exitCriteria(view, key, { asOfDate: today, request: live.at(-1) ?? null }) : { 1: ["not planned"] });
  const clauseOk = Boolean(uat?.clauses && typeof uat.clauses === "object" && uat.clauses.deemed_acceptance) && !/not supported/.test(String(uat?.calendars?.contract ?? ""));
  const say = r.say ?? (r.from ? `use ow-uat on ${r.from}` : "");
  if (r.from && /^builds\/[^/]+\/ready-for-uat\.md$/.test(r.from)) {
    if (signed || planned) return ["nothing"];
    if (hasUat) return ["plan"];
    const ready = view.read(`${OW}${r.from}`);
    if (ready == null) return ["nothing"];
    try { const d = matter(ready).data; if (String(d.ready) !== "yes" || Number(d.checks_passing) !== Number(d.checks_total)) return ["nothing"]; } catch { return ["nothing"]; }
    return ["plan"];
  }
  if (/^use ow-uat-plan --addendum CO-\d+$/.test(say)) return ["plan --addendum"];
  if (say === "use ow-uat-signoff") {
    const unsigned = view.all().filter((f) => /^opchain-work\/uat\/[^/]+\/uat\.yaml$/.test(f) && !view.exists(f.replace(/uat\.yaml$/, "signoff.md")));
    if (unsigned.length !== 1) return ["ask"];
  }
  if (/^use ow-uat-signoff(?: on uat\/[^/]+\/)?$/.test(say)) {
    if (signed) return ["nothing"];
    if (Object.keys(crit()).length) return ["nothing"];
    const sent = live.find((q) => q.status === "sent");
    if (sent) {
      const due = sent.deemed_date && sent.deemed_date !== "none" ? iso(sent.deemed_date) : iso(sent.stated_deemed_date);
      return clauseOk && /^\d{4}/.test(due ?? "") && today > due ? ["signoff --deemed"] : ["nothing"];
    }
    if (live.length) return ["nothing"];
    return ["signoff"];
  }
  if (/^use ow-uat-defect on uat\/[^/]+\/$/.test(say)) {
    if (!signed) return ["defect"];
    const addendum = scenariosOf(view, dir).some((s) => s.kind === "addendum");
    return addendum ? ["defect", "nothing"] : ["nothing"];
  }
  if (r.from && /^uat\/[^/]+\/$/.test(r.from)) {
    if (signed) {
      const add = scenariosOf(view, dir).filter((s) => s.kind === "addendum");
      const open = add.filter((s) => !view.exists(`${dir}/acceptance-addendum-${s.co}.md`));
      if (open.length) {
        const runs = runsOf(view, dir);
        const failed = runs.some((x) => x.rows.some((y) => open.some((s) => s.id === y.sc) && /^(fail|blocked)$/.test(y.result))) && !defectsOf(view, dir).some((d) => open.some((s) => new RegExp(`\\b${s.id}\\b`).test(d.from)));
        return failed ? ["defect"] : ["run", "defect", "signoff --addendum", "plan --addendum"];
      }
      const cos = view.all().filter((f) => new RegExp(`^${esc(OW)}builds/${esc(key.slug)}/changes/CO-\\d+\\.md$`).test(f)).map((f) => f.match(/CO-\d+/)[0]);
      let pa = [];
      try { pa = asList(md(view, `${dir}/signoff.md`).data.post_acceptance_cos).map(String); } catch { /* reported elsewhere */ }
      const waiting = pa.filter((c) => cos.includes(c) && !add.some((s) => s.co === c));
      return waiting.length ? ["plan --addendum", "nothing"] : ["nothing"];
    }
    if (!hasUat || !planned) return ["plan"];
    if (!view.exists(`${dir}/pack.yaml`)) return ["pack"];
    const runs = runsOf(view, dir);
    const due = asList(uat.schedule).filter((s) => iso(s.date) <= today && !runs.some((x) => String(x.session) === String(s.session)));
    const ok = new Set();
    if (due.length) ok.add("run");
    const defects = defectsOf(view, dir);
    const unnamed = runs.some((x) => x.rows.some((y) => /^(fail|blocked)$/.test(y.result) && !defects.some((d) => new RegExp(`\\b${y.sc}\\b`).test(d.from))));
    const untriaged = defects.some((d) => d.cls === "not triaged");
    if (unnamed || untriaged) { ok.add("defect"); return [...ok]; }
    const c = crit();
    if (Object.keys(c).length) { ok.add("run"); ok.add("defect"); return [...ok]; }
    const drafted = live.find((q) => q.status === "drafted");
    if (drafted) return ["signoff --sent", "nothing"];
    const sent = live.find((q) => q.status === "sent");
    if (sent) {
      const dueDate = iso(sent.deemed_date && sent.deemed_date !== "none" ? sent.deemed_date : sent.stated_deemed_date);
      return ["signoff --signed", "nothing", ...(clauseOk && /^\d{4}/.test(dueDate ?? "") && today > dueDate ? ["signoff --deemed"] : [])];
    }
    return ["signoff"];
  }
  return null;
}
const verbLabel = (v) => String(v).replace(/^\/ow-uat-?/, "").trim() || "route";
function checkRoute(key, run) {
  const p = [];
  let exp;
  try { exp = expectedRoute(run, key); } catch (e) { return [`route: ${reason(e)}`]; }
  if (!exp) return [`route: ${key.route?.from ?? key.route?.say} is not a path or wording ow-uat routes`];
  const want = String(key.route?.expect ?? "");
  if (!exp.includes(want)) p.push(`this case expects the route "${want}", but the files route ${key.route?.from ?? key.route?.say} to ${exp.map((v) => `"${v}"`).join(" or ")}`);
  const w = run.written().filter((f) => f !== `${OW}STATUS.md`);
  if (want === "nothing" || want === "ask") {
    for (const f of w) p.push(`${f}: the route writes nothing here (${want})`);
    if (run.realRun) for (const f of run.priorAll().filter((x) => x.startsWith(OW))) if (!run.inRun(f)) p.push(`route: ${f}: deleted; the route writes nothing here (${want})`);
    return p;
  }
  if (!w.length) p.push(`the route runs ${want}, but the run wrote nothing`);
  for (const f of w) if (!writtenBy(f, `/ow-uat-${want}`)) p.push(`${f}: written by ${writersOf(f).map(verbLabel).join(" or ") || "no verb"}, but the route runs ${want}`);
  // R1-6: a route cell grades more than the verb: the route never re-freezes agreed/, never rewrites or deletes
  // a write-once file, and what it writes parses.
  p.push(...checkWriteOnce({ ...key, verbs: [`/ow-uat-${want}`] }, run).map((x) => `route: ${x}`));
  for (const f of w.filter((x) => /\.ya?ml$/.test(x))) { try { parsed(run.read(f), f, "yaml"); } catch (e) { p.push(`route: ${reason(e)}`); } }
  return p;
}

function checkRefused(key, run) {
  const p = [];
  const allowed = new Set(asList(key.refused_writes?.only));
  for (const f of run.written()) if (!allowed.has(f.replace(OW, "")) && !allowed.has(f)) p.push(`${f} was written; this run refuses (${key.refused?.reason ?? key.refused_writes?.reason}) and writes nothing${allowed.size ? ` but ${[...allowed].join(", ")}` : ""}`);
  const printed = run.printed();
  if (printed == null) { p.push("printed.md is missing: a refusal says why"); return p; }
  if (!/\brefused\b|\bno re-plan\b|\bnothing written\b/i.test(printed)) p.push("printed.md does not say the run refused or wrote nothing");
  for (const n of asList(key.refused?.names)) if (!printed.includes(String(n))) p.push(`printed.md does not name ${n}`);
  for (const s of asList(key.refused?.says)) if (!printed.toLowerCase().includes(String(s).toLowerCase())) p.push(`printed.md does not say "${s}"`);
  return p;
}
const checkRefusedWrites = (key, run) => checkRefused({ ...key, refused: key.refused ?? { reason: key.refused_writes?.reason } }, run);

function checkCriteria(key, run) {
  const p = [];
  const req = requestsOf(priorView(run), U(key)).find((q) => /^(drafted|sent)$/.test(q.status)) ?? null;
  let got;
  try { got = exitCriteria(priorView(run), key, { asOfDate: iso(key.today), request: req }); } catch (e) { return [`the exit criteria could not be computed: ${reason(e)}`]; }
  const want = Object.fromEntries(Object.entries(key.criteria ?? {}).map(([k, v]) => [String(k), asList(v).map(String).sort()]));
  const norm = Object.fromEntries(Object.entries(got).map(([k, v]) => [k, [...v].sort()]));
  if (JSON.stringify(norm) !== JSON.stringify(Object.fromEntries(Object.keys({ ...want, ...norm }).sort().map((k) => [k, norm[k] ?? []]).filter(([, v]) => v.length)))) {
    // compare key by key for a readable message
  }
  for (const k of new Set([...Object.keys(want), ...Object.keys(norm)])) {
    const a = (norm[k] ?? []).join(", "), b = (want[k] ?? []).join(", ");
    if (a !== b) p.push(`exit criterion ${k}: the files give [${a}], the key expects [${b}]`);
  }
  const printed = run.printed() ?? "";
  for (const ids of Object.values(norm)) {
    const allChecks = ids.length > 6 && /every check/.test(printed);
    for (const id of ids) if (!allChecks && !printed.includes(id)) p.push(`printed.md does not name ${id}, a gap of the exit criteria (every gap is named)`);
  }
  return p;
}

/** The say lines and handoffs.yaml destinations a printed NEXT block names, in order. */
export function printedSays(text) {
  const out = [];
  for (const line of String(text ?? "").split("\n")) {
    const say = line.match(/say "(use [^"]+)"/);
    if (say && /^\s+[A-Z][A-Z ]*:/.test(line)) out.push(say[1]);
    const dest = line.match(/^\s+NEXT: (handoffs\.yaml `[a-z_]+`)/);
    if (dest) out.push(dest[1]);
  }
  return out;
}
function checkNext(key, run) {
  const p = [];
  const printed = run.printed();
  if (printed == null) return ["printed.md is missing: save the NEXT block the run printed"];
  const got = printedSays(printed);
  const want = asList(key.next).map(String);
  if (got.join(" | ") !== want.join(" | ")) p.push(`the NEXT blocks printed say [${got.join(" | ")}]; expected, in this order, [${want.join(" | ")}]`);
  for (const line of printed.split("\n")) {
    if (!/say "use (?!<)/.test(line) || !/^\s+[A-Z][A-Z ]*:/.test(line)) continue;
    if (!/\(where slash commands exist: \/ow-[a-z0-9-]+/.test(line)) p.push(`printed.md: "${line.trim().slice(0, 70)}" has no slash hint`);
  }
  return p;
}

// ── -plan ────────────────────────────────────────────────────────────────────

/** The check ids an agreed/ (or upstream) file defines: "### AC-…" headings. */
const checkIdsIn = (text) => [...String(text ?? "").matchAll(/^### (AC-[\w.-]+)\s*$/gm)].map((m) => m[1]);
/** A check's fields in a plan file. */
function checkBlock(text, id) {
  const m = new RegExp(`^### ${esc(id)}\\s*\\n([\\s\\S]*?)(?=^#{2,3} |(?![\\s\\S]))`, "m").exec(String(text ?? ""));
  if (!m) return null;
  const f = (k) => (new RegExp(`^- ${k}: (.*)$`, "m").exec(m[1]) ?? [])[1];
  return { when: f("when"), then: f("then"), how: f("how we check"), data: f("test data"), cases: Number(f("cases")), kind: f("kind") };
}
function checkPlan(key, run) {
  const p = [];
  const dir = U(key);
  const want = key.plan ?? {};
  let u;
  try { u = uatOf(run, dir); } catch (e) { return [reason(e)]; }
  const steps = asList(u.plan_steps).map((s) => s.step);
  const n = want.steps ?? 10;
  if (steps.join(",") !== PLAN_STEPS.slice(0, n).join(",")) p.push(`uat.yaml plan_steps are [${steps.join(", ")}]; expected the first ${n} of [${PLAN_STEPS.join(", ")}], in order`);
  const recs = asList(u.plan_steps).map((s) => Number(s.rec));
  recs.forEach((r, i) => { if (i && r <= recs[i - 1]) p.push(`uat.yaml plan_steps: rec ${r} does not follow rec ${recs[i - 1]}`); });
  // Keys of steps not recorded are not written.
  const stepKeys = { terms: ["terms", "clauses", "calendars"], mix: ["mix"], people: ["client_contact", "testers"], environment: ["environment"], data: ["test_data"], schedule: ["schedule"], side_effects: ["side_effects"], gitignore: ["gitignore"] };
  for (const [s, ks] of Object.entries(stepKeys)) for (const k of ks) {
    if (steps.includes(s) && u[k] === undefined) p.push(`uat.yaml: the ${s} step is recorded but ${k} is missing`);
    if (!steps.includes(s) && u[k] !== undefined) p.push(`uat.yaml: ${k} is written, but the ${s} step is not recorded`);
  }
  // The entry: a ready build with every check passing.
  const ready = run.priorRead(`${OW}builds/${key.slug}/ready-for-uat.md`);
  if (ready == null) p.push("ready-for-uat.md does not exist: -plan stops before writing anything");
  else {
    try { const d = matter(ready).data; if (String(d.ready) !== "yes") p.push("ready-for-uat.md says ready: no: -plan stops"); if (String(u.ready?.build_label) !== String(d.build_label ?? "").split(" (")[0]) p.push(`uat.yaml ready.build_label ${u.ready?.build_label}; ready-for-uat.md says ${d.build_label}`); } catch (e) { p.push(`ready-for-uat.md: ${reason(e)}`); }
  }
  // The frozen basis: byte-for-byte copies of the upstream files, and contract-terms.md quoted exactly.
  const agreedChecks = [];
  for (const b of asList(u.basis)) {
    const rel = `${dir}/${b.file}`;
    const now = run.read(rel);
    if (now == null) { p.push(`${b.file} is in uat.yaml basis but was not written`); continue; }
    if (/contract-terms\.md$/.test(b.file)) {
      const ci = run.priorRead(`${OW}plans/${key.slug}/contract-inputs.md`) ?? "";
      const q = run.priorRead(`${OW}plans/${key.slug}/quote.md`) ?? "";
      const inc = sectionOf(matter(now).content, "Included");
      const qInc = sectionOf(matter(q).content, "What I will deliver") ?? "";
      for (const r of tableRows(inc)) if (!qInc.includes(`| ${r.includes} |`) && !qInc.includes(r.includes)) p.push(`contract-terms.md: the included block for "${r["work package"]}" is not quoted from quote.md's client part`);
      const own = (sectionOf(matter(now).content, "Ownership") ?? "").trim();
      const ciOwn = (sectionOf(matter(ci).content, "Ownership") ?? "").trim();
      if (ciOwn && own !== ciOwn) p.push("contract-terms.md: the ownership terms are not quoted exactly from contract-inputs.md");
      if (!ciOwn && !/^Not stated\b/.test(own)) p.push("contract-terms.md: no ownership terms upstream, so it says they are not stated");
      // OD-5: the basis row names the block copied from contract-inputs.md and its digest, never the whole file.
      if (b.block !== "terms") p.push(`uat.yaml basis: ${b.file} names no block (block: terms); its upstream is compared by the terms block's digest, never the whole file (owner decision OD-5)`);
      if (NO_CODE_DIGEST.test(String(b.digest))) {
        // R2-1: with no code, every part of the block is compared as text; the comparison is never skipped.
        for (const x of termsTextMismatches(ci, u, now)) p.push(`uat.yaml basis: ${b.file} is frozen with no code ("none (no code here)"), and ${x} as frozen differs from contract-inputs.md (owner decisions OD-5, OD-6)`);
      } else if (String(b.digest) !== blockDigest(ci)) p.push(`uat.yaml basis: ${b.file} digest is "${b.digest}"; the terms block of contract-inputs.md as frozen is ${blockDigest(ci)} (owner decision OD-5)`);
      continue;
    }
    const upstream = run.priorRead(`${OW}${b.from}`);
    if (upstream == null) { p.push(`${b.file}: its upstream ${b.from} does not exist`); continue; }
    if (upstream !== now) p.push(`${b.file} is not a byte-for-byte copy of ${b.from} (the frozen basis)`);
    agreedChecks.push(...checkIdsIn(now));
  }
  if (!asList(u.basis).some((b) => /acceptance\.md$|quick-scope\.md$/.test(b.file))) p.push("uat.yaml basis freezes no acceptance checks (acceptance.md, or quick-scope.md for a quick-quote job)");
  const checks = asList(u.checks).map(String);
  if ([...agreedChecks].sort().join() !== [...checks].sort().join()) p.push(`uat.yaml checks [${checks.join(", ")}] are not every check in agreed/ [${agreedChecks.join(", ")}]`);
  if (want.checks && checks.length !== want.checks) p.push(`uat.yaml lists ${checks.length} checks; this case has ${want.checks}`);
  // The change orders: signed ones (not extensions) before -plan join the basis; the rest do not.
  for (const f of run.priorAll().filter((x) => new RegExp(`^${esc(OW)}builds/${esc(key.slug)}/changes/CO-\\d+\\.md$`).test(x))) {
    let d; try { d = matter(run.priorRead(f)).data; } catch { continue; }
    const inAgreed = asList(u.basis).some((b) => b.file === `agreed/${d.id}.md`);
    const should = d.status === "signed" && d.kind !== "extension";
    if (steps.includes("basis") && should !== inAgreed) p.push(`${d.id} (${d.status}${d.kind === "extension" ? ", extension" : ""}) ${should ? "is signed before -plan and joins" : "does not join"} the basis`);
  }
  if (!steps.includes("terms")) return p;
  // The terms: the quoted UAT line (contract-inputs.md, else quote.md), else offers.md defaults.
  const ci = (() => { try { return matter(run.priorRead(`${OW}plans/${key.slug}/contract-inputs.md`) ?? "").data; } catch { return {}; } })();
  const qd = (() => { try { return matter(run.priorRead(`${OW}plans/${key.slug}/quote.md`) ?? "").data; } catch { return {}; } })();
  const t = u.terms ?? {};
  const line = ci.uat ?? qd.uat;
  const bounds = ci.uat ? "quoted (contract-inputs.md)" : qd.uat ? "quoted (quote.md)" : null;
  if (bounds) {
    if (String(t.bounds) !== bounds) p.push(`uat.yaml terms.bounds is "${t.bounds}"; the UAT line is ${bounds}`);
    for (const k of ["sessions", "fix_rounds", "fix_business_days"]) if (Number(t[k]) !== Number(line[k])) p.push(`uat.yaml terms.${k} ${t[k]}; the quoted UAT line says ${line[k]}`);
  } else {
    let offers = {};
    try { offers = yaml.load((/```yaml\n(uat:[\s\S]*?)```/.exec(run.priorRead(`${OW}offers.md`) ?? "") ?? [])[1] ?? "") ?? {}; } catch { /* asked */ }
    const def = offers.uat?.defaults;
    if (def) {
      if (String(t.bounds) !== "not quoted (offers default)") p.push(`uat.yaml terms.bounds is "${t.bounds}"; with no UAT line, the bounds come from offers.md: not quoted (offers default)`);
      for (const k of ["sessions", "fix_rounds", "fix_business_days"]) if (Number(t[k]) !== Number(def[k])) p.push(`uat.yaml terms.${k} ${t[k]}; offers.md uat.defaults says ${def[k]}`);
    } else if (!/^not quoted \(user-stated/.test(String(t.bounds))) p.push(`uat.yaml terms.bounds is "${t.bounds}"; with no UAT line and no offers default, the user states them`);
  }
  if (want.bounds && String(t.bounds) !== String(want.bounds)) p.push(`uat.yaml terms.bounds "${t.bounds}"; this case expects "${want.bounds}"`);
  const quotedRoles = Array.isArray(line?.tester_roles) ? line.tester_roles.map(String) : null;
  const qs = run.priorRead(`${OW}plans/${key.slug}/quick-scope.md`) ?? run.priorRead(`${OW}plans/${key.slug}/scope.md`) ?? "";
  const approach = (/^- tester roles: (.*)$/m.exec(qs) ?? [])[1]?.split(/,\s*/).map((s) => s.trim());
  const roles = asList(t.tester_roles).map(String);
  if (quotedRoles && roles.join() !== quotedRoles.join()) p.push(`uat.yaml terms.tester_roles [${roles.join(", ")}]; the quoted UAT line says [${quotedRoles.join(", ")}]`);
  if (!quotedRoles && approach && roles.join() !== approach.join()) p.push(`uat.yaml terms.tester_roles [${roles.join(", ")}]; the scope's UAT approach says [${approach.join(", ")}]`);
  if (String(t.schedule) !== String(ci.schedule ?? qd.schedule)) p.push(`uat.yaml terms.schedule ${t.schedule}; the quote says ${ci.schedule ?? qd.schedule}`);
  const docSku = ci.documentation_sku ?? "none";
  if (String(t.documentation_sku) !== String(docSku)) p.push(`uat.yaml terms.documentation_sku ${t.documentation_sku}; contract-inputs.md says ${docSku}`);
  // The definitions: as quoted, or the user's dated statement of which governs.
  const quoteAcc = (sectionOf(matter(run.priorRead(`${OW}plans/${key.slug}/quote.md`) ?? "").content, "Acceptance") ?? "").trim().split("\n")[0];
  const acc = ci.acceptance_definition ?? quoteAcc;
  if (acc && String(t.acceptance_definition).trim() !== String(acc).trim()) p.push(`uat.yaml terms.acceptance_definition is not the quoted wording ("${String(acc).slice(0, 50)}…")`);
  const current = /sign off user acceptance testing/.test(String(acc));
  if (!current && !(t.governing && typeof t.governing === "object" && t.governing.statement && t.governing.stated_by && /^\d{4}-\d{2}-\d{2}$/.test(iso(t.governing.date) ?? ""))) p.push("the quote defines acceptance differently from the current wording: uat.yaml records the user's dated statement of which definition governs (terms.governing)");
  if (current && t.governing && t.governing !== "none") p.push("terms.governing is set although the quote's acceptance wording is the current one");
  if (want.governing && !(t.governing && typeof t.governing === "object")) p.push("this case expects a governing statement");
  // The clauses: frozen unchanged from contract-inputs.md, only after the user confirms; else clauses none.
  const cc = ci.contract_clauses;
  if (cc && typeof cc === "object") {
    if (want.clauses === "none") { if (u.clauses !== "none") p.push("the user did not confirm the clauses: uat.yaml clauses: none"); }
    else {
      const c = u.clauses;
      if (!c || typeof c !== "object") p.push("contract-inputs.md holds contract_clauses: -plan freezes them in uat.yaml once the user confirms");
      else {
        if (!/^as signed, confirmed by \S+ \d{4}-\d{2}-\d{2}$/.test(String(c.status ?? ""))) p.push(`uat.yaml clauses.status is "${c.status}"; expected "as signed, confirmed by <user> <date>"`);
        for (const k of ["deemed_acceptance", "delivery_backstop"]) {
          if (!cc[k] && !c[k]) continue;
          if (JSON.stringify(c[k]) !== JSON.stringify(cc[k])) p.push(`uat.yaml clauses.${k} is not byte-equal to contract-inputs.md's (a clause is never reworded)`);
        }
        // R1-7: the frozen block holds only what the contract inputs hold, and its calendar is the clauses'.
        for (const k of Object.keys(c)) if (k !== "status" && !(k in cc)) p.push(`uat.yaml clauses.${k} is not in contract-inputs.md's contract_clauses: a clause the contract inputs do not hold is never added (no drafted clause)`);
        const cal = String(c.deemed_acceptance?.calendar ?? c.delivery_backstop?.calendar ?? "");
        const want = /^(us-federal|us federal|united states federal|weekdays except us federal holidays)$/i.test(cal) ? "us-federal" : `not supported (${cal})`;
        if (String(u.calendars?.contract) !== want) p.push(`uat.yaml calendars.contract is "${u.calendars?.contract}" beside frozen clauses on the ${cal} calendar; it is "${want}"`);
      }
    }
  } else if (u.clauses !== "none") p.push(`contract-inputs.md has no clauses (${cc ?? "absent"}): uat.yaml clauses: none`);
  if (u.clauses === "none" && !/^none\b/.test(String(u.calendars?.contract ?? ""))) p.push(`uat.yaml calendars.contract is "${u.calendars?.contract}" with clauses: none; it is none`);
  if (!steps.includes("people")) return p;
  // People: a role and the id the client chose; never a name.
  for (const tr of asList(u.testers)) {
    if (!tr.role || !tr.id) p.push(`uat.yaml testers: ${JSON.stringify(tr)} needs role and id`);
    if (Object.keys(tr).some((k) => !["role", "id"].includes(k))) p.push(`uat.yaml testers: ${JSON.stringify(tr)} holds more than role and id`);
    if (tr.role && !roles.includes(String(tr.role))) p.push(`uat.yaml testers: role "${tr.role}" is not a tester role of the UAT line`);
  }
  if (want.testers && asList(u.testers).length !== want.testers) p.push(`uat.yaml lists ${asList(u.testers).length} testers; this case has ${want.testers}`);
  if (/[A-Z][a-z]+ [A-Z][a-z]+/.test(String(u.client_contact ?? "")) || !u.client_contact) p.push(`uat.yaml client_contact "${u.client_contact}" is a role, never a name`);
  if (!steps.includes("environment")) return p;
  const prod = u.environment?.production;
  if (prod && prod !== "no" && !/^client decision: .+ \d{4}-\d{2}-\d{2}$/.test(String(prod))) p.push(`uat.yaml environment.production "${prod}": a production test needs the client's recorded decision (role and date)`);
  if (steps.includes("data") && prod && prod !== "no" && /synthetic/.test(String(u.test_data?.default)) && !asList(u.test_data?.real).length) p.push("a production test with a synthetic data source is refused");
  if (steps.includes("data")) {
    const accText = run.read(`${dir}/agreed/acceptance.md`) ?? run.read(`${dir}/agreed/quick-scope.md`) ?? "";
    for (const c of checks) {
      const b = checkBlock(accText, c) ?? checkBlock(run.read(`${dir}/agreed/${c.replace(/^AC-(CO-\d+)\..*$/, "$1")}.md`), c);
      if (b && /\b(?:real|September's|the client's|the shop sends|past weeks?)\b/i.test(`${b.how} ${b.data}`) && !/made for the test/.test(b.data ?? "") && !asList(u.test_data?.real).some((r) => String(r.check) === c)) p.push(`${c}'s "how we check" names real data: uat.yaml test_data.real records the client's decision for it`);
    }
  }
  if (steps.includes("scenarios")) {
    const req = scenariosOf(run, dir).filter((s) => s.kind === "required");
    for (const c of checks) if (!req.some((s) => String(s.proves) === c)) p.push(`Acceptance coverage: ${c} has no required scenario`);
    if (want.required !== undefined && req.length !== want.required) p.push(`${req.length} required scenarios; N checks give N required scenarios (${want.required})`);
    if (want.scenarios !== undefined && scenariosOf(run, dir).length !== want.scenarios) p.push(`${scenariosOf(run, dir).length} scenarios; this case expects ${want.scenarios}`);
  } else if (scenariosOf(run, dir).length && run.written().some((f) => /\/scenarios\//.test(f))) p.push("scenarios were written, but the scenarios step is not recorded");
  return p;
}

function checkPlanMode(key, run) {
  const p = [];
  const dir = U(key);
  const m = key.plan_mode ?? {};
  let before, after;
  try { before = uatOf(priorView(run), dir); after = uatOf(run, dir); } catch (e) { return [reason(e)]; }
  const newEvents = asList(after.events).slice(asList(before.events).length);
  if (newEvents.length !== 1) p.push(`${m.mode} records ${newEvents.length} events in uat.yaml; one per run`);
  const ev = String(newEvents[0]?.event ?? "");
  const wroteAgreed = run.written().filter((f) => /\/agreed\//.test(f));
  if (m.mode === "--add-co") {
    if (!new RegExp(`^added ${m.co} to the acceptance`).test(ev)) p.push(`the event is "${ev}"; expected "added ${m.co} to the acceptance (…)"`);
    const co = run.priorRead(`${OW}builds/${key.slug}/changes/${m.co}.md`);
    if (co == null) p.push(`builds/${key.slug}/changes/${m.co}.md does not exist`);
    else {
      if (matter(co).data.status !== "signed") p.push(`${m.co} is ${matter(co).data.status}: only a signed change order joins the basis`);
      if (run.read(`${dir}/agreed/${m.co}.md`) !== co) p.push(`agreed/${m.co}.md is not a byte-for-byte copy of the signed change order`);
      for (const c of asList(m.checks)) {
        if (!asList(after.checks).includes(c)) p.push(`uat.yaml checks does not add ${c}`);
        if (!scenariosOf(run, dir).some((s) => s.kind === "required" && s.proves === c)) p.push(`no required scenario for ${c}`);
      }
    }
    for (const f of wroteAgreed) if (!f.endsWith(`/${m.co}.md`)) p.push(`${f}: --add-co copies only the change order it adds`);
  } else if (m.mode === "--addendum") {
    if (!(new RegExp(`^addendum scenarios for ${m.co}\\b`).test(ev) || new RegExp(`^${m.co} delivered \\d{4}-\\d{2}-\\d{2}, build ${esc(m.delivered ?? "\\S+")}$`).test(ev))) p.push(`the event is "${ev}"; expected the addendum scenarios or "${m.co} delivered <date>, build <label>"`);
    if (wroteAgreed.length) p.push(`--addendum writes nothing to agreed/ (wrote ${wroteAgreed.join(", ")}): the change order is not in this acceptance`);
    if (JSON.stringify(after.checks) !== JSON.stringify(before.checks)) p.push("--addendum changes uat.yaml checks; the change order is outside the basis");
    for (const id of asList(m.scenarios)) {
      const s = scenariosOf(run, dir).find((x) => x.id === id);
      if (!s) p.push(`${id} was not written`);
      else if (s.kind !== "addendum" || s.co !== m.co) p.push(`${id}: kind ${s.kind}, co ${s.co}; an addendum scenario is kind addendum, co ${m.co}`);
    }
  } else if (m.mode === "--keep-frozen") {
    if (!new RegExp(`^kept_frozen ${esc(m.file)}\\b`).test(ev)) p.push(`the event is "${ev}"; expected "kept_frozen ${m.file}: …"`);
    if (wroteAgreed.length) p.push("--keep-frozen copies nothing into agreed/");
  } else if (m.mode === "--refreeze") {
    if (!new RegExp(`^refrozen ${esc(m.file)}\\b`).test(ev)) p.push(`the event is "${ev}"; expected "refrozen ${m.file}: …"`);
    const b = asList(after.basis).find((x) => x.file === m.file);
    if (!b) p.push(`${m.file} is not in uat.yaml basis`);
    else if (/contract-terms\.md$/.test(m.file)) {
      // OD-5: only the terms block is quoted again, never the whole contract-inputs.md; the row takes its new digest.
      const up = run.priorRead(`${OW}${b.from}`) ?? "";
      const now = run.read(`${dir}/${m.file}`) ?? "";
      if (now === up) p.push(`${m.file} is a copy of the whole ${b.from}; --refreeze quotes only the terms block (owner decision OD-5)`);
      if (NO_CODE_DIGEST.test(String(b.digest))) for (const x of termsTextMismatches(up, after, now)) p.push(`uat.yaml basis: ${m.file} refrozen with no code, and ${x} as frozen still differs from ${b.from} (owner decisions OD-5, OD-6)`);
      else if (String(b.digest) !== blockDigest(up)) p.push(`uat.yaml basis: ${m.file} digest ${b.digest} after --refreeze; the terms block upstream now is ${blockDigest(up)}`);
      const own = (sectionOf(matter(now).content, "Ownership") ?? "").trim(), upOwn = (sectionOf(matter(up).content, "Ownership") ?? "").trim();
      if (upOwn && own !== upOwn) p.push(`${m.file}: the ownership terms are not quoted again exactly from ${b.from}`);
      for (const s of ["Included", "User acceptance testing", "Acceptance and delivery"]) if (sectionOf(matter(now).content, s) == null) p.push(`${m.file}: "## ${s}" was lost on --refreeze (the handoff reads it)`);
    } else if (run.read(`${dir}/${m.file}`) !== run.priorRead(`${OW}${b.from}`)) p.push(`${m.file} is not a byte-for-byte copy of ${b.from} after --refreeze`);
    for (const f of wroteAgreed) if (!f.endsWith(m.file)) p.push(`${f}: --refreeze copies only the file it names`);
  }
  if (m.agreed_unchanged && wroteAgreed.length) p.push(`agreed/ must not change in ${m.mode}`);
  if (JSON.stringify(after.plan_steps) !== JSON.stringify(before.plan_steps)) p.push("a -plan mode never changes plan_steps");
  return p;
}

function checkPlanResume(key, run) {
  const p = [];
  const dir = U(key);
  let before, after;
  try { before = uatOf(priorView(run), dir); after = uatOf(run, dir); } catch (e) { return [reason(e)]; }
  const b = asList(before.plan_steps), a = asList(after.plan_steps);
  b.forEach((s, i) => { if (JSON.stringify(a[i]) !== JSON.stringify(s)) p.push(`plan step ${s.step} was redone on resume (rec ${s.rec}); a resume starts at the first missing step`); });
  const first = a[b.length]?.step;
  if (key.plan_resume?.from_step && first !== key.plan_resume.from_step) p.push(`the resume starts at ${first}; the first missing step is ${key.plan_resume.from_step}`);
  for (const f of run.written()) if (/\/agreed\//.test(f)) p.push(`${f}: a resume never re-freezes agreed/`);
  if (JSON.stringify(after.basis) !== JSON.stringify(before.basis)) p.push("uat.yaml basis changed on resume: the frozen dates move and raise a false basis mismatch");
  p.push(...recordedStepsChanged(before, after));
  // A step finished in this session is dated today (R1-16: a resume's steps carry the resume's date).
  for (const s of a.slice(b.length)) if (key.today && iso(s.date) !== iso(key.today)) p.push(`plan step ${s.step} (rec ${s.rec}) is dated ${iso(s.date)}; it finished in this session (${iso(key.today)})`);
  return p;
}

function checkScenarios(key, run) {
  const p = [];
  const dir = U(key);
  let uat;
  try { uat = uatOf(run, dir); } catch (e) { return [reason(e)]; }
  const accText = run.read(`${dir}/agreed/acceptance.md`) ?? run.read(`${dir}/agreed/quick-scope.md`) ?? "";
  const records = recordValues(run, key);
  for (const f of run.written().filter((x) => /\/scenarios\/SC-\d+\.md$/.test(x))) {
    let s;
    try { const { data, content } = md(run, f); s = { ...data, content }; } catch (e) { p.push(reason(e)); continue; }
    for (const k of ["id", "kind", "proves", "role", "side_effect", "cases_required", "data"]) if (s[k] === undefined) p.push(`${f}: no ${k}`);
    if (!/^(required|role|real-case|exception|addendum)$/.test(String(s.kind))) p.push(`${f}: kind ${s.kind}`);
    if (s.role && !asList(uat.terms?.tester_roles).map(String).includes(String(s.role))) p.push(`${f}: role ${s.role} is not a tester role`);
    const d = s.data ?? {};
    for (const k of ["source", "ids", "count", "fields"]) if (d[k] === undefined || d[k] === "") p.push(`${f}: data.${k} is missing (data by pointer: source, ids, count, fields)`);
    if (s.kind === "required") {
      const coFile = /^AC-CO-\d+/.test(String(s.proves)) ? run.read(`${dir}/agreed/${String(s.proves).replace(/^AC-(CO-\d+)\..*$/, "$1")}.md`) : accText;
      const b = checkBlock(coFile, String(s.proves));
      if (!b) p.push(`${f}: ${s.proves} is not a check in agreed/`);
      else if (Number(s.cases_required) !== b.cases) p.push(`${f}: cases_required ${s.cases_required}; ${s.proves} has ${b.cases} cases`);
    }
    if (s.kind === "addendum" && !/^CO-\d+$/.test(String(s.co))) p.push(`${f}: an addendum scenario names its change order (co)`);
    for (const h of ["Steps", "Expected result", "Data (by pointer only)"]) if (sectionOf(s.content, h) == null) p.push(`${f}: no "## ${h}" section`);
    for (const [what, hit] of dataFindings(s.content, { records })) p.push(`${f}: Data check: ${what} ("${hit}"); a scenario cites data by pointer only`);
  }
  return p;
}

// ── -pack ────────────────────────────────────────────────────────────────────

const lum = (hex) => { const c = hex.replace("#", ""); const v = [0, 2, 4].map((i) => parseInt(c.length === 3 ? c[i / 2] + c[i / 2] : c.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
/** The HTML pack's checks (no ow-tools): lang, title, one h1, no skipped headings, table headers, contrast, nothing internal. */
export function htmlPackProblems(html) {
  const p = [];
  if (!/<html[^>]*\blang="[a-z]{2}(?:-[A-Z]{2})?"/.test(html)) p.push("no lang attribute on <html>");
  if (!/<title>[^<]+<\/title>/.test(html)) p.push("no <title>");
  const hs = [...html.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
  if (hs.filter((h) => h === 1).length !== 1) p.push(`${hs.filter((h) => h === 1).length} h1 headings; exactly one`);
  hs.forEach((h, i) => { if (i && h > hs[i - 1] + 1) p.push(`a heading skips from h${hs[i - 1]} to h${h}`); });
  for (const t of html.match(/<table[\s\S]*?<\/table>/g) ?? []) if (!/<th\b/.test(t)) p.push("a table has no header cells (th)");
  const bg = (/background(?:-color)?:\s*(#[0-9a-fA-F]{3,6})/.exec(html) ?? [])[1] ?? "#ffffff";
  for (const m of html.matchAll(/(?<![-\w])color:\s*(#[0-9a-fA-F]{3,6})/g)) if (contrast(m[1], bg) < 4.5) p.push(`text colour ${m[1]} on ${bg} is ${contrast(m[1], bg).toFixed(2)}:1, under 4.5:1`);
  if (/same-session self-check|ow:internal|Self-checks/i.test(html)) p.push("an internal section reached the export");
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\balt="[^"]+"/.test(m[0])) p.push("an image has no alt text");
  return p;
}
export const RESULT_COLUMNS = "tester id,scenario,result,cases passed,note,records created";
function checkPack(key, run) {
  const p = [];
  const dir = U(key);
  let uat, pack;
  try { uat = uatOf(run, dir); pack = yml(run, `${dir}/pack.yaml`); } catch (e) { return [reason(e)]; }
  const roles = asList(uat.terms?.tester_roles).map(String);
  const packs = asList(pack.packs);
  if (key.pack?.roles !== undefined && packs.length !== key.pack.roles) p.push(`pack.yaml lists ${packs.length} packs; one per tester role (${key.pack.roles})`);
  for (const r of roles) if (!packs.some((x) => x.role === r)) p.push(`no pack for the tester role ${r}`);
  const scen = scenariosOf(run, dir).filter((s) => s.kind !== "addendum");
  for (const x of packs) {
    const src = `${dir}/${x.source}`;
    const text = run.read(src);
    if (text == null) { p.push(`${x.source}: the pack's Markdown source was not written`); continue; }
    const pre = preflight(text, join(ROOT, src));
    for (const pr of pre.problems ?? []) p.push(`${x.source}: the ow-tools preflight refuses: ${pr}`);
    const mine = scen.filter((s) => s.role === x.role).map((s) => s.id).sort();
    if (asList(x.scenarios).map(String).sort().join() !== mine.join()) p.push(`${x.source}: scenarios [${asList(x.scenarios).join(", ")}]; the role's are [${mine.join(", ")}]`);
    for (const id of mine) if (!text.includes(id)) p.push(`${x.source}: does not list ${id}`);
    if (!new RegExp(`your login comes from (?:the )?${esc(String(uat.client_contact))}`, "i").test(text)) p.push(`${x.source}: does not say "your login comes from ${uat.client_contact}"`);
    for (const e of asList(x.exports)) {
      const rel = `${dir}/${e}`;
      if (!run.exists(rel)) { p.push(`${e}: listed but not written`); continue; }
      if (rel.endsWith(".html")) for (const pr of htmlPackProblems(run.read(rel))) p.push(`${e}: ${pr}`);
    }
    if (key.ow_tools === "absent" && asList(x.exports).some((e) => /\.(pdf|docx)$/.test(e))) p.push(`${x.source}: PDF or Word exports listed with no ow-tools in this session`);
  }
  if (key.ow_tools === "absent" && !/not available/.test(String(pack.export_tool))) p.push("pack.yaml export_tool: without ow-tools the skill says the HTML pack only");
  const csv = run.read(`${dir}/export/results-template.csv`);
  if (csv == null) p.push("export/results-template.csv was not written");
  else {
    const [head, ...rows] = csv.trimEnd().split("\n");
    if (head !== RESULT_COLUMNS) p.push(`results-template.csv header is "${head}"; exactly the six columns "${RESULT_COLUMNS}"`);
    const ids = rows.map((r) => r.split(",")[1]).sort();
    const want = packs.flatMap((x) => asList(x.scenarios).map(String)).sort();
    if (ids.join() !== want.join()) p.push(`results-template.csv rows [${ids.join(", ")}]; one per scenario in the packs [${want.join(", ")}]`);
  }
  return p;
}

// ── -run ─────────────────────────────────────────────────────────────────────

function csvRows(text) {
  const [head, ...rows] = String(text ?? "").trimEnd().split("\n");
  const h = head.split(",").map((x) => x.trim().toLowerCase());
  return rows.map((r) => Object.fromEntries(r.split(",").map((c, i) => [h[i], c.trim()])));
}
function checkRun(key, run) {
  const p = [];
  const dir = U(key);
  const want = key.run ?? {};
  const rel = `${dir}/runs/${want.id}.md`;
  let r;
  try { r = runsOf(run, dir).find((x) => x.id === want.id); if (!r) throw new Error(`${rel} was not written`); } catch (e) { return [reason(e)]; }
  if (iso(r.session_date) !== iso(want.session_date)) p.push(`${want.id}: session_date ${r.session_date}; the session took place on ${want.session_date} (never the import date)`);
  const label = buildOnDate(priorView(run), key, r.session_date);
  if (r.build !== label) p.push(`${want.id}: build ${r.build}; the latest build change on or before ${r.session_date} is ${label}`);
  if (want.build && r.build !== want.build) p.push(`${want.id}: build ${r.build}; this case expects ${want.build}`);
  let uat; try { uat = uatOf(run, dir); } catch (e) { return [...p, reason(e)]; }
  const roles = asList(uat.terms?.tester_roles).map(String);
  const scen = new Map(scenariosOf(run, dir).map((s) => [s.id, s]));
  for (const x of r.rows) {
    const s = scen.get(x.sc);
    if (!s) { p.push(`${want.id}: ${x.sc} is not a scenario`); continue; }
    if (x.proves !== String(s.proves)) p.push(`${want.id}: ${x.sc} proves ${s.proves}, not ${x.proves}`);
    if (!/^(pass|fail|blocked|not run)$/.test(x.result)) p.push(`${want.id}: ${x.sc} result "${x.result}"`);
    if (!new RegExp(`^\\d+ of ${s.cases_required}$`).test(x.cases ?? "")) p.push(`${want.id}: ${x.sc} cases "${x.cases}"; cases passed out of ${s.cases_required}`);
    const runBy = x.run_by ?? "";
    if (!(roles.includes(runBy) || /^user with .+$/.test(runBy) || runBy === "user alone" || (runBy === "none (not run)" && x.result === "not run"))) p.push(`${want.id}: ${x.sc} run_by "${runBy}": a tester role, "user with <client role>" or "user alone"`);
    if (!/^(results file \S+|user-stated \(as reported\))$/.test(x.source ?? "")) p.push(`${want.id}: ${x.sc} source "${x.source}"`);
    if (/^user-stated/.test(x.source ?? "") && roles.includes(runBy)) p.push(`${want.id}: ${x.sc} is user-stated but written under the ${runBy}'s role (No false pass)`);
    if (x.result === "pass" && (!runBy || runBy === "none (not run)")) p.push(`${want.id}: ${x.sc} passes with no run_by`);
  }
  if (want.no_show) {
    if (r.kind !== "no-show") p.push(`${want.id}: kind ${r.kind}; a session the client did not attend is a no-show run`);
    for (const x of r.rows) { if (x.result !== "not run") p.push(`${want.id}: ${x.sc} is ${x.result} in a no-show run`); if (!/client did not attend; invited \d{4}-\d{2}-\d{2}/.test(x.note ?? "")) p.push(`${want.id}: ${x.sc}'s note does not say "client did not attend; invited <dates>"`); }
  }
  if (want.user_alone) for (const x of r.rows) if (x.result === "pass" && x.run_by !== "user alone") p.push(`${want.id}: ${x.sc} was run by the user alone; run_by "${x.run_by}"`);
  if (want.results) {
    const csv = run.read(`${OW}${want.results}`);
    if (csv == null) p.push(`${want.results} is not in evidence/`);
    else {
      const name = want.results.split("/").pop();
      const head = csv.split("\n")[0].split(",").map((h) => h.trim().toLowerCase());
      if (!head.includes("scenario") || !head.includes("result") || /[\u0000-\u0008]/.test(csv)) p.push(`${name} does not parse as a results template (tester id, scenario, result, cases passed, note, records created); -run lists what it could not read and guesses nothing`);
      for (const x of r.rows) if (x.source === `results file ${name}` && !csvRows(csv).some((c) => c.scenario === x.sc)) p.push(`${want.id}: ${x.sc} cites ${name}, which has no row for it`);
      for (const c of csvRows(csv)) {
        const x = r.rows.find((y) => y.sc === c.scenario);
        if (!x) { p.push(`${want.id}: ${c.scenario} from ${name} was not imported`); continue; }
        if (x.result !== c.result) p.push(`${want.id}: ${c.scenario} is ${x.result}; ${name} says ${c.result}`);
        if (!String(x.cases).startsWith(`${c["cases passed"]} of`)) p.push(`${want.id}: ${c.scenario} cases ${x.cases}; ${name} says ${c["cases passed"]}`);
        if (x.source !== `results file ${name}`) p.push(`${want.id}: ${c.scenario} source "${x.source}"; it came from results file ${name}`);
      }
      const named = csv.split("\n")[0].split(",").map((h) => h.trim()).filter((h) => NAME_HEADER.test(h));
      const dropped = sectionOf(r.content, "Dropped at import") ?? "";
      for (const h of named) if (!dropped.includes(`"${h}"`)) p.push(`${want.id}: ${name} has a "${h}" column; -run drops it and says so under "Dropped at import"`);
      const idx = run.read(`${dir}/evidence/index.md`) ?? "";
      const row = tableRows(idx).find((x) => x.item === name);
      if (!row) p.push(`evidence/index.md has no row for ${name}`);
      else if (!/^pointer only \(imported results file\)$/.test(row.state)) p.push(`evidence/index.md: ${name} is "${row.state}"; an imported results file is pointer only`);
    }
  }
  const idx = run.read(`${dir}/evidence/index.md`);
  if (idx != null) for (const x of tableRows(idx)) if (!/^(cleared|pointer only \(.+\)|NOT-CHECKED \(.+\))$/.test(x.state ?? "")) p.push(`evidence/index.md: ${x.item} state "${x.state}"; one of cleared, pointer only (<reason>), NOT-CHECKED (<format>)`);
  if (idx != null) for (const x of tableRows(idx)) if (/\.(mov|mp4|webm|avi)$/i.test(x.item) && !/^NOT-CHECKED/.test(x.state)) p.push(`evidence/index.md: ${x.item} is a video, which the data check cannot inspect: NOT-CHECKED`);
  return p;
}

function checkSecrets(key, run) {
  const p = [];
  const dir = U(key);
  const log = run.read(`${dir}/secrets-seen.log`);
  const before = run.priorRead(`${dir}/secrets-seen.log`) ?? "";
  if (log == null) return ["secrets-seen.log was not written"];
  const lines = log.split("\n").filter((l) => /\| kind: /.test(l));
  const added = lines.filter((l) => !before.includes(l));
  if (key.secrets?.entries !== undefined && added.length !== key.secrets.entries) p.push(`secrets-seen.log gained ${added.length} entries; ${key.secrets.entries} credential(s) were seen`);
  for (const l of added) {
    if (!/^\d{4}-\d{2}-\d{2} \(clock: [a-z-]+\) \| ow-uat \d+\.\d+\.\d+ \| rec \d+ \| kind: [a-z ]+ \| role: [a-z -]+ \| source: \S.* \| session: \S+$/.test(l)) p.push(`secrets-seen.log: "${l.slice(0, 80)}" is not "<date> | ow-uat <v> | rec <n> | kind | role | source | session"`);
  }
  for (const v of asList(key.secrets?.values).map(String)) {
    const pieces = [v, ...(v.length >= 6 ? [v.slice(0, 4), v.slice(-4)] : [])];
    for (const f of run.written()) for (const piece of pieces) if ((run.read(f) ?? "").includes(piece)) { p.push(`${f}: holds the credential seen ("${piece === v ? "the value" : "part of it"}"); never the value`); break; }
  }
  if (key.secrets?.reset && !(run.printed() ?? "").includes(key.secrets.reset)) p.push(`printed.md does not say "${key.secrets.reset}"`);
  return p;
}

// ── -defect ──────────────────────────────────────────────────────────────────

const HISTORY_FORMS = [
  /^logged from RUN-\d+ SC-\d+ \((?:fail|blocked|pass|not run), \d+ of \d+\)$/, /^logged from a report by [a-z ]+, arrived \d{4}-\d{2}-\d{2}$/, /^logged from a passing run, RUN-\d+ SC-\d+$/,
  /^triaged (?:Defect|Change|Training gap|Environment or data|Duplicate), (?:blocker|major|minor|cosmetic), against .+$/,
  /^sent to the builder \(round \d+\)$/, /^fixed, build \S+ \(reported by the builder; recorded by \S+\)$/, /^set-up fixed \d{4}-\d{2}-\d{2}: .+ \(as reported\)$/,
  /^retested-pass in RUN-\d+$/, /^retested-fail in RUN-\d+ \(round \d+\)$/,
  /^extension requested, client cause: .+$/, /^extended, client cause, CO-\d+$/, /^extended, builder cause \(no charge\)$/,
  /^escalated to \S+: open past (?:\d+ fix rounds|\d+ business days from triage \(\d{4}-\d{2}-\d{2}\))$/,
  /^condition: .+, [a-z ]+, \d{4}-\d{2}-\d{2}$/, /^condition met: CO-\d+ added to agreed\/ \(rec \d+\)$/, /^condition lapsed: CO-\d+ declined \d{4}-\d{2}-\d{2}$/, /^condition too big for a change order \(.+\); blocks until withdrawn$/, /^condition withdrawn by [a-z ]+ \d{4}-\d{2}-\d{2}$/,
  /^moved to punch list$/, /^passed to documentation$/, /^closed \(RUN-\d+ passed\)$/, /^closed -> UAT-\d+$/, /^raised as change request$/, /^withdrawn by client [a-z ]+ \d{4}-\d{2}-\d{2}$/,
  /^qualifying report: names AC-[\w.-]+ with steps$/, /^reproduced by the builder$/, /^cannot reproduce notice sent \d{4}-\d{2}-\d{2} \((?:within 3 business days of arrival|late: \d+ business days)\)$/, /^not qualifying: no failing check or no steps; asked for details$/,
  /^request \d+ will be superseded$/, /^after sign-off$/,
];
function checkDefect(key, run) {
  const p = [];
  const dir = U(key);
  const want = key.defect ?? {};
  let uat, defects;
  try { uat = uatOf(run, dir); defects = defectsOf(run, dir); } catch (e) { return [reason(e)]; }
  const prior = (() => { try { return defectsOf(priorView(run), dir); } catch { return []; } })();
  const checks = new Set(asList(uat.checks).map(String));
  const scen = scenariosOf(run, dir);
  const writtenIds = run.written().filter((f) => /\/defects\/UAT-\d+\.md$/.test(f)).map((f) => f.match(/UAT-\d+/)[0]);
  const signed = run.priorExists(`${dir}/signoff.md`);
  for (const d of defects.filter((x) => writtenIds.includes(x.id))) {
    const at = `${d.id}`;
    if (!/^(Defect|Change|Training gap|Environment or data|Duplicate|not triaged)$/.test(d.cls)) p.push(`${at}: class "${d.cls}"`);
    if (d.cls !== "not triaged" && !/^(blocker|major|minor|cosmetic)$/.test(d.severity)) p.push(`${at}: severity "${d.severity}"`);
    if (d.cls !== "not triaged" && !(/\bas (?:frozen in|recorded in|signed in) /.test(d.basis))) p.push(`${at}: basis "${d.basis}" does not cite the basis item it was judged against (Triage cites the basis)`);
    const cited = d.basis.match(/\b(AC-[\w.-]*\d|WP-\d+|CO-\d+)\b/)?.[1];
    if (d.cls === "Defect" && cited && /^AC-/.test(cited) && !checks.has(cited) && !fromAddendum(d, scen)) p.push(`${at}: basis ${cited} is not a check in agreed/`);
    if (d.cls === "Defect" && fromAddendum(d, scen) && !/CO-\d+/.test(d.basis)) p.push(`${at}: a problem from an addendum scenario is judged against its change order`);
    if (/^RUN-\d+, SC-\d+/.test(d.from)) {
      const [rid, sid] = [d.from.match(/RUN-\d+/)[0], d.from.match(/SC-\d+/)[0]];
      const row = runsOf(run, dir).find((r) => r.id === rid)?.rows.find((x) => x.sc === sid);
      if (!row) p.push(`${at}: from ${rid} ${sid}, which is not in that run`);
      else if (row.result === "fail" && scen.find((s) => s.id === sid)?.kind === "required" && d.cls === "Defect" && !/^(blocker|major)$/.test(d.severity)) p.push(`${at}: a Defect from a failing required scenario is major or higher`);
    }
    d.history.forEach((h, i) => {
      if (!HISTORY_FORMS.some((re) => re.test(h.text))) p.push(`${at}: history "${h.text}" is not one of the fixed forms (defect-format.md §4)`);
      if (i && h.rec <= d.history[i - 1].rec) p.push(`${at}: history rec ${h.rec} does not follow rec ${d.history[i - 1].rec}`);
      if (i && h.date < d.history[i - 1].date) p.push(`${at}: history date ${h.date} is before ${d.history[i - 1].date}`);
    });
    const before = prior.find((x) => x.id === d.id);
    if (before) before.history.forEach((h, i) => { if (JSON.stringify(d.history[i]) !== JSON.stringify(h)) p.push(`${at}: an earlier history line changed`); });
    if (/^fixed$/.test(d.status) && !d.history.some((h) => /^(fixed, build \S+|set-up fixed)/.test(h.text))) p.push(`${at}: status fixed with no "fixed, build <label>" line: a fix needs the build label the user gives`);
    if (d.cls !== "not triaged" && d.history.length && !d.history.some((h) => h.text.startsWith("triaged") || /^cannot reproduce/.test(h.text))) p.push(`${at}: never triaged`);
    if (d.cls === "Defect" && /^moved to punch list$/.test(d.status) && /^(blocker|major)$/.test(d.severity)) p.push(`${at}: only a minor or cosmetic Defect moves to the punch list`);
    if (d.cls !== "Defect" && /^(retested-pass|moved to punch list)$/.test(d.status)) p.push(`${at}: ${d.status} is a terminal state of class Defect only`);
    // R1-16: the client reason never contradicts the status ("does not block sign-off" on a condition that blocks).
    if (isCondition(d) && /\b(?:does not|doesn't|will not|won't|never) block\b/i.test(d.reason)) p.push(`${at}: the client reason says it does not block sign-off, but "${d.status}" is a condition that blocks it`);
    if (signed && !fromAddendum(d, scen) && !(before) && d.status !== "after sign-off") p.push(`${at}: logged after sign-off from the main scenarios; -defect refuses (a covered fix for the handoff)`);
  }
  for (const [id, cls] of Object.entries(want.classes ?? {})) { const d = defects.find((x) => x.id === id); if (!d) p.push(`${id} was not written`); else if (d.cls !== cls) p.push(`${id}: class ${d.cls}; this case expects ${cls}`); }
  for (const [id, st] of Object.entries(want.terminal ?? {})) { const d = defects.find((x) => x.id === id); if (!d) p.push(`${id} was not written`); else { if (d.status !== st) p.push(`${id}: status "${d.status}"; this case expects "${st}"`); if (!isTerminal(d)) p.push(`${id}: "${d.status}" is not a terminal state of class ${d.cls}`); } }
  for (const [id, label] of Object.entries(want.fixed ?? {})) { const d = defects.find((x) => x.id === id); if (!d?.history.some((h) => h.text.startsWith(`fixed, build ${label} `))) p.push(`${id}: no "fixed, build ${label}" line`); }
  if (want.extension) {
    const line = `extension requested, client cause: ${want.extension.event}`;
    for (const id of want.extension.ids) { const d = defects.find((x) => x.id === id); if (!d?.history.some((h) => h.text === line)) p.push(`${id}: no "${line}" line (every UAT-nn one client-side event affects carries it)`); }
    const open = defects.filter((d) => d.cls === "Defect" && !isTerminal(d)).map((d) => d.id);
    for (const id of open) if (!want.extension.ids.includes(id)) p.push(`${id} is an open Defect the event affects, but it carries no extension request`);
  }
  for (const [id, co] of Object.entries(want.condition ?? {})) { const d = defects.find((x) => x.id === id); if (!d?.history.some((h) => new RegExp(`^condition: ${co}, `).test(h.text))) p.push(`${id}: no "condition: ${co}, <client role>, <date>" line`); }
  if (want.supersedes) {
    const status = run.read(`${OW}STATUS.md`) ?? "";
    const added = status.split("\n").slice((run.priorRead(`${OW}STATUS.md`) ?? "").split("\n").length - 1).join("\n");
    for (const [id, n] of Object.entries(want.supersedes)) {
      const d = defects.find((x) => x.id === id);
      if (!d?.history.some((h) => h.text === `request ${n} will be superseded`)) p.push(`${id}: no "request ${n} will be superseded" line`);
      if (!added.includes(`request ${n} will be superseded`)) p.push(`STATUS.md: no line saying request ${n} will be superseded (-defect cannot write signoff-requests.yaml)`);
    }
    if (!Object.keys(want.supersedes).length) for (const d of defects.filter((x) => writtenIds.includes(x.id))) if (d.history.some((h) => /will be superseded/.test(h.text) && !(prior.find((x) => x.id === d.id)?.history.some((g) => g.rec === h.rec)))) p.push(`${d.id}: says a request will be superseded, but nothing here supersedes one (a minor, a report without steps, or after the signature date)`);
  }
  for (const [id, n] of Object.entries(want.notice ?? {})) {
    const d = defects.find((x) => x.id === id);
    const h = d?.history.find((x) => /^cannot reproduce notice sent/.test(x.text));
    if (!h) { p.push(`${id}: no cannot-reproduce notice line`); continue; }
    const days = businessDaysBetween(n.arrived, n.sent, contractCal());
    const timely = days <= 3;
    if (timely !== Boolean(n.timely)) p.push(`${id}: the notice went ${days} business days after the report (contract calendar); the key says timely: ${n.timely}`);
    if (timely && !/within 3 business days of arrival/.test(h.text)) p.push(`${id}: the notice was timely (${days} business days) but the line says "${h.text}"`);
    if (!timely && !new RegExp(`late: ${days} business days`).test(h.text)) p.push(`${id}: the notice was late (${days} business days); the line says "${h.text}"`);
    if (!timely && !d.history.some((x) => /^request \d+ will be superseded$/.test(x.text))) p.push(`${id}: a late notice supersedes the request like a qualifying report`);
  }
  for (const [id] of Object.entries(want.escalated ?? {})) {
    const d = defects.find((x) => x.id === id);
    if (!d?.history.some((h) => /^escalated to /.test(h.text))) p.push(`${id}: open past its bounds but not escalated`);
  }
  for (const id of asList(want.builder_cause)) { const d = defects.find((x) => x.id === id); if (!d?.history.some((h) => h.text === "extended, builder cause (no charge)")) p.push(`${id}: no "extended, builder cause (no charge)" line`); }
  for (const id of asList(want.too_big)) {
    const d = defects.find((x) => x.id === id);
    const rq = run.read(`${OW}builds/${key.slug}/changes/requests.md`) ?? "";
    const row = rq.split("\n").find((l) => new RegExp(`\\b${id}\\.md\\b`).test(l));
    if (!row || !/too big for a change order/.test(row)) p.push(`${id}: builds/${key.slug}/changes/requests.md has no "too big" row for it, so the too-big condition has no basis`);
    if (!d?.history.some((h) => /^condition too big for a change order \(.*requests\.md R-\d+\); blocks until withdrawn$/.test(h.text))) p.push(`${id}: the too-big condition is not recorded as blocking until withdrawn, citing the requests.md row (owner decision O6)`);
    if (/lapsed/.test(d?.status ?? "")) p.push(`${id}: a too-big condition never lapses on its own (O6)`);
  }
  for (const id of asList(want.after_signoff)) { const d = defects.find((x) => x.id === id); if (d?.status !== "after sign-off") p.push(`${id}: logged after the signature date: status "after sign-off"`); }
  for (const [id, co] of Object.entries(want.addendum ?? {})) { const d = defects.find((x) => x.id === id); if (!d || !new RegExp(`\\b${co}\\b`).test(d.basis)) p.push(`${id}: judged against ${co}`); }
  // Fix bounds (a regression net for the self-check): an open blocker or major Defect past its bounds has an extension or escalation entry.
  const hol = profileCal(run);
  for (const d of defects) {
    if (d.cls !== "Defect" || !/^(blocker|major)$/.test(d.severity) || isTerminal(d) || !d.triaged || fromAddendum(d, scen)) continue;
    const pastDays = iso(key.today) > addBusinessDays(d.triaged, Number(uat.terms?.fix_business_days ?? 0), hol);
    const pastRounds = d.round > Number(uat.terms?.fix_rounds ?? 0);
    const covered = d.history.some((h) => /^(?:extension requested|extended|escalated to)/.test(h.text));
    if ((pastDays || pastRounds) && !covered) p.push(`${d.id}: open past its ${pastRounds ? `${uat.terms?.fix_rounds} fix rounds` : `${uat.terms?.fix_business_days} business days`} with no extension or escalation entry (Fix bounds)`);
    if (pastRounds && !d.history.some((h) => /^escalated to /.test(h.text))) p.push(`${d.id}: past ${uat.terms?.fix_rounds} fix rounds: escalated to the user`);
  }
  return p;
}

// ── -signoff ─────────────────────────────────────────────────────────────────

function checkSignoff(key, run) {
  const p = [];
  const dir = U(key);
  const want = key.signoff ?? {};
  let rows, priorRows, uat;
  try { rows = requestsOf(run, dir); priorRows = requestsOf(priorView(run), dir); uat = uatOf(run, dir); } catch (e) { return [reason(e)]; }
  // Supersession by rec: every earlier live request a later event outranks is marked, naming the event.
  for (const n of asList(want.superseded)) {
    const r = rows.find((x) => x.n === n);
    if (r?.status !== "superseded") { p.push(`request ${n} is ${r?.status ?? "missing"}; it is superseded`); continue; }
    const why = supersededBy(priorView(run), key, priorRows.find((x) => x.n === n) ?? r) ?? (rows.some((x) => x.n > n) ? { rec: Math.max(...rows.filter((x) => x.n > n).map((x) => Number(x.written_rec))), why: "a higher request" } : null);
    const last = asList(r.status_history).at(-1);
    if (!why) p.push(`request ${n} is marked superseded, but nothing recorded after its written_rec (${r.written_rec}) supersedes it`);
    else if (!String(last?.why ?? "").includes(String(why.rec)) && !String(last?.why ?? "").includes(why.why.split(" ")[0])) p.push(`request ${n}'s superseded entry does not name the event that outranks it (${why.why}, rec ${why.rec})`);
  }
  for (const r of rows) {
    const before = priorRows.find((x) => x.n === r.n);
    if (before && /^(drafted|sent)$/.test(before.status) && r.status === before.status) {
      const sup = supersededBy(run, key, r, {});
      if (sup && !asList(want.superseded).includes(r.n) && run.written().some((f) => /signoff-requests\.yaml$/.test(f))) p.push(`request ${r.n} stays ${r.status}, but ${sup.why} (rec ${sup.rec}) after it was written supersedes it`);
    }
  }
  if (want.sent) {
    const r = rows.find((x) => x.n === want.request);
    const b = priorRows.find((x) => x.n === want.request);
    if (b?.status !== "drafted") p.push(`--sent acts only on a drafted request; request ${want.request} was ${b?.status}`);
    if (r?.status !== "sent" || iso(r.sent) !== iso(want.sent)) p.push(`request ${want.request}: status ${r?.status}, sent ${r?.sent}; expected sent ${want.sent}`);
    for (const x of rows) if (x.n !== want.request && JSON.stringify(x) !== JSON.stringify(priorRows.find((y) => y.n === x.n))) p.push(`--sent changed request ${x.n}'s row`);
    return p;
  }
  if (want.refused) {
    if (run.written().some((f) => /signoff-request-\d+\.md$/.test(f))) p.push("the exit criteria fail: no request is written");
    return p;
  }
  if (!want.request) return p;
  const rel = `${dir}/signoff-request-${want.request}.md`;
  let q;
  try { q = md(run, rel); } catch (e) { return [...p, reason(e)]; }
  if (run.priorExists(rel)) p.push(`${rel} existed already: a request is never overwritten`);
  const last = priorRows.length ? Math.max(...priorRows.map((x) => x.n)) : 0;
  if (want.request !== last + 1) p.push(`request ${want.request}: the next number is ${last + 1}`);
  const row = rows.find((x) => x.n === want.request);
  if (!row) p.push(`signoff-requests.yaml has no row for request ${want.request}`);
  else {
    if (row.status !== "drafted") p.push(`request ${want.request}'s row is ${row.status}; a new request is drafted`);
    if (Number(row.written_rec) !== Number(q.data.rec)) p.push(`request ${want.request}: written_rec ${row.written_rec}; the request's rec is ${q.data.rec}`);
    if (!/^\S+ \d{4}-\d{2}-\d{2}: /.test(String(row.post_acceptance_cos?.confirmed ?? ""))) p.push(`request ${want.request}: the user's answer on post-acceptance change orders is recorded with who and when`);
  }
  for (const x of priorRows) if (/^(drafted|sent)$/.test(x.status) && rows.find((y) => y.n === x.n)?.status !== "superseded") p.push(`writing request ${want.request} marks every earlier drafted or sent request superseded; request ${x.n} is ${rows.find((y) => y.n === x.n)?.status}`);
  // Exit criteria hold.
  const gaps = exitCriteria(run, key, { asOfDate: iso(key.today) });
  for (const [k, v] of Object.entries(gaps)) p.push(`exit criterion ${k} fails (${v.join(", ")}): no request is written`);
  const latest = latestBuild(run, key).label;
  if (String(q.data.build_label) !== latest) p.push(`${rel}: build_label ${q.data.build_label}; the latest build label is ${latest}`);
  if (want.build && String(q.data.build_label) !== want.build) p.push(`${rel}: build_label ${q.data.build_label}; expected ${want.build}`);
  // The first sentence: the deemed date (contract calendar), or the two no-date forms.
  const body = internalSplit(q.content).client.replace(/^#[^\n]*\n+/m, "").trim();
  const first = sentences(body)[0] ?? "";
  if (uat.clauses === "none") {
    if (!/no deemed-acceptance clause/.test(first)) p.push(`${rel}: with clauses none, the first sentence says the contract has no deemed-acceptance clause ("${first.slice(0, 70)}")`);
    if (!/^none \(clauses: none\)$/.test(String(q.data.deemed_date))) p.push(`${rel}: deemed_date "${q.data.deemed_date}" with clauses none`);
  } else {
    const c = uat.clauses?.deemed_acceptance;
    const supported = /^(us-federal|us federal|united states federal|weekdays except us federal holidays)$/i.test(String(c?.calendar ?? ""));
    if (!supported) { if (!/can't be computed here/.test(first)) p.push(`${rel}: the clause's calendar is not supported: the first sentence says the date can't be computed here (O8)`); }
    else {
      const want2 = addBusinessDays(iso(q.data.planned_send), Number(c.business_days), contractCal());
      if (iso(q.data.deemed_date) !== want2) p.push(`${rel}: deemed_date ${iso(q.data.deemed_date)}; the planned send ${iso(q.data.planned_send)} + ${c.business_days} business days on the contract calendar is ${want2}`);
      if (!first.includes(written(want2))) p.push(`${rel}: the first sentence does not state the deemed date (${written(want2)}): "${first.slice(0, 80)}"`);
      if (!first.includes(String(c.ref))) p.push(`${rel}: the first sentence does not name the clause (${c.ref})`);
      if (want.first && iso(want.first) !== want2) p.push(`the key's deemed date ${want.first} is not ${want2}`);
      if (!/not machine-checked|ow-tools calc date --from \d{4}-\d{2}-\d{2} --business-days \d+ --calendar us-federal/.test(String(q.data.deemed_date_source))) p.push(`${rel}: deemed_date_source records neither the calc command and output nor "not machine-checked"`);
    }
  }
  if (!/Signing this request accepts the build against the agreed acceptance checks\./.test(body)) p.push(`${rel}: does not say that signing accepts the build against the agreed acceptance checks`);
  // Every check with its passing run on the latest label, run_by and source.
  const tbl = tableRows(sectionOf(q.content, "Every acceptance check"));
  const runs = runsOf(run, dir);
  const builderOnly = [];
  for (const c of asList(uat.checks).map(String)) {
    const r = tbl.find((x) => x.check === c);
    if (!r) { p.push(`${rel}: ${c} is not listed`); continue; }
    const req = scenariosOf(run, dir).filter((s) => s.kind === "required" && s.proves === c).map((s) => s.id);
    const passes = runs.filter((x) => x.build === latest).flatMap((x) => x.rows.filter((y) => req.includes(y.sc) && y.result === "pass").map((y) => ({ run: x, row: y })));
    if (!passes.length) { p.push(`${rel}: ${c} has no passing run on ${latest}`); continue; }
    const m = passes.find((x) => r["run and date"]?.startsWith(`${x.run.id}, `));
    if (!m) p.push(`${rel}: ${c} cites "${r["run and date"]}", not a run where it passed on ${latest}`);
    else {
      if (r["run by"] !== m.row.run_by) p.push(`${rel}: ${c} run by "${r["run by"]}"; ${m.run.id} says "${m.row.run_by}"`);
      if (r.source !== m.row.source) p.push(`${rel}: ${c} source "${r.source}"; ${m.run.id} says "${m.row.source}"`);
    }
    if (passes.every((x) => x.row.run_by === "user alone")) builderOnly.push(c);
  }
  const bo = sectionOf(q.content, "Checked by the builder; not tested by your people") ?? "";
  for (const c of builderOnly) if (!bo.includes(c)) p.push(`${rel}: ${c}'s only pass is the user alone: it is listed under "Checked by the builder; not tested by your people"`);
  if (!builderOnly.length && !/^None\b/.test(bo.trim())) p.push(`${rel}: lists builder-only checks, but every check was run by the client's people`);
  if (want.builder_only && builderOnly.sort().join() !== asList(want.builder_only).sort().join()) p.push(`builder-only checks [${builderOnly.join(", ")}]; the key expects [${asList(want.builder_only).join(", ")}]`);
  for (const co of asList(want.post_acceptance)) if (!(sectionOf(q.content, "Change requests and later change orders") ?? "").includes(co) || !asList(row?.post_acceptance_cos?.listed).includes(co)) p.push(`${rel}: ${co}, signed after the freeze and not added, is listed as post-acceptance (and in its row)`);
  for (const h of ["The build tested", "Every acceptance check", "Checked by the builder; not tested by your people", "Punch list", "Change requests and later change orders", "Records created during testing", "Environment"]) if (sectionOf(q.content, h) == null) p.push(`${rel}: no "## ${h}" section`);
  if (/^\s*(?:NEXT|DONE):/m.test(internalSplit(q.content).client)) p.push(`${rel}: a NEXT block in a client-facing request`);
  return p;
}

export const PUNCH_COLUMNS = ["uat-nn", "what", "severity", "logged", "on the signed list"];
function checkSigned(key, run) {
  const p = [];
  const dir = U(key);
  const want = key.signed ?? {};
  let s, rows, priorRows, uat;
  try { s = md(run, `${dir}/signoff.md`); rows = requestsOf(run, dir); priorRows = requestsOf(priorView(run), dir); uat = uatOf(run, dir); } catch (e) { return [reason(e)]; }
  for (const f of ["signoff.md", "acceptance-record.md", "punch-list.md"]) if (run.priorExists(`${dir}/${f}`)) p.push(`${f} existed already: written once`);
  const d = s.data;
  const deemed = want.acceptance === "deemed";
  if (Number(d.request) !== want.request) p.push(`signoff.md request ${d.request}; expected ${want.request}`);
  if (iso(d.signed) !== iso(want.date)) p.push(`signoff.md signed ${iso(d.signed)}; expected ${want.date}`);
  if (String(d.signer_role) !== String(want.signer)) p.push(`signoff.md signer_role ${d.signer_role}; expected ${want.signer}`);
  if (String(d.acceptance) !== (deemed ? "deemed" : "signed")) p.push(`signoff.md acceptance ${d.acceptance}`);
  if (String(d.build_label) !== String(want.build)) p.push(`signoff.md build_label ${d.build_label}; expected ${want.build}`);
  const line = deemed ? new RegExp(`deemed accepted under \\S+ on ${iso(want.date)}; applied by \\S+; client response not received`) : new RegExp(`signed ${iso(want.date)} by ${esc(want.signer)} on request ${want.request}; signature not verified by this skill`);
  if (!line.test(s.content)) p.push(`signoff.md does not record "${deemed ? "deemed accepted under <ref> on <date>; applied by <user>; client response not received" : `signed ${want.date} by ${want.signer} on request ${want.request}; signature not verified by this skill`}"`);
  if (asList(d.post_acceptance_cos).map(String).sort().join() !== asList(want.post_acceptance).sort().join()) p.push(`signoff.md post_acceptance_cos [${asList(d.post_acceptance_cos).join(", ")}]; expected [${asList(want.post_acceptance).join(", ")}]`);
  // Test access listed: every account has environment and created-by, never a login.
  const acc = asList(d.test_accounts);
  if (want.accounts !== undefined && acc.length !== want.accounts) p.push(`signoff.md lists ${acc.length} test accounts; expected ${want.accounts}`);
  for (const a of acc) {
    if (!a.role || !a.environment || !a.created_by) p.push(`signoff.md test account ${JSON.stringify(a)}: role, environment and created_by`);
    if (Object.keys(a).some((k) => !["role", "environment", "created_by"].includes(k))) p.push(`signoff.md test account ${JSON.stringify(a)} holds more than role, environment and created-by (never a login)`);
  }
  const small = String(uat.terms?.schedule) === "50/50";
  if (!small && !/^not applicable/.test(String(d.delivery_backstop_date))) p.push("signoff.md delivery_backstop_date: not applicable on a larger project");
  if (small && uat.clauses?.delivery_backstop) {
    const earliest = addBusinessDays(iso(want.date), Number(uat.clauses.delivery_backstop.business_days), contractCal());
    if (!String(d.delivery_backstop_date).includes(earliest)) p.push(`signoff.md delivery_backstop_date "${d.delivery_backstop_date}": no sooner than ${earliest} (acceptance + ${uat.clauses.delivery_backstop.business_days} business days)`);
  }
  // The request: drafted or sent and not superseded as of the date.
  const req = priorRows.find((x) => x.n === want.request);
  if (!req || !/^(drafted|sent)$/.test(req.status)) p.push(`request ${want.request} was ${req?.status ?? "missing"}: only a drafted or sent request is signed`);
  else {
    const sup = supersededBy(priorView(run), key, req, { asOfDate: iso(want.date) });
    if (sup) p.push(`request ${want.request} is superseded as of ${want.date} (${sup.why}): refuse`);
    const gaps = exitCriteria(priorView(run), key, { asOfDate: iso(want.date), request: req });
    for (const [k, v] of Object.entries(gaps)) p.push(`exit criterion ${k} fails as of ${want.date} (${v.join(", ")})`);
  }
  const row = rows.find((x) => x.n === want.request);
  if (row?.status !== (deemed ? "deemed" : "signed")) p.push(`request ${want.request}'s row is ${row?.status}`);
  const steps = asList(row?.signing_steps);
  if (steps.map((x) => x.step).join(",") !== SIGN_STEPS.join(",")) p.push(`signing_steps [${steps.map((x) => x.step).join(", ")}]; expected [${SIGN_STEPS.join(", ")}] (signoff.md last)`);
  steps.forEach((x, i) => { if (i && Number(x.rec) <= Number(steps[i - 1].rec)) p.push(`signing_steps: ${x.step} rec ${x.rec} does not follow ${steps[i - 1].step}`); });
  if (JSON.stringify(asList(row?.test_accounts)) !== JSON.stringify(acc)) p.push("the request row's test_accounts and signoff.md's differ (a cut-off --signed resumes from the row)");
  // The acceptance record: every check in agreed/, evidence by cleared pointer only.
  const ar = (() => { try { return md(run, `${dir}/acceptance-record.md`); } catch (e) { p.push(reason(e)); return null; } })();
  if (ar) {
    const tbl = tableRows(ar.content);
    const cleared = new Set(tableRows(run.read(`${dir}/evidence/index.md`) ?? "").filter((x) => x.state === "cleared").map((x) => x.item));
    for (const c of asList(uat.checks).map(String)) if (!tbl.some((x) => x.check === c)) p.push(`acceptance-record.md: ${c} is missing; it covers every check in agreed/`);
    for (const x of tbl) {
      if (x.build !== String(want.build)) p.push(`acceptance-record.md: ${x.check} build ${x.build}`);
      const ev = String(x.evidence ?? "");
      if (ev !== "none cited") for (const item of ev.split(/,\s*/)) { const name = item.replace(/ \(cleared\)$/, ""); if (!cleared.has(name)) p.push(`acceptance-record.md: ${x.check} cites ${name}, which evidence/index.md does not mark cleared`); }
    }
  }
  // The punch list: the signed minors and cosmetics, and those reported after the request.
  const pl = (() => { try { return md(run, `${dir}/punch-list.md`); } catch (e) { p.push(reason(e)); return null; } })();
  if (pl) {
    const tbl = tableRows(pl.content);
    // R1-18: the columns the handoff reads, the logged date among them (ow-handoff -fix takes it as "reported").
    const head = (String(pl.content).split("\n").find((l) => /^\s*\|/.test(l)) ?? "").trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim().toLowerCase());
    const empty = !head.join("") && /^No items\.?$/m.test(pl.content);
    if (!empty && head.join("|") !== PUNCH_COLUMNS.join("|")) p.push(`punch-list.md columns are [${head.join(", ")}]; exactly [${PUNCH_COLUMNS.join(", ")}] (the handoff reads each)`);
    for (const x of tbl) if (!/^\d{4}-\d{2}-\d{2}$/.test(x.logged ?? "")) p.push(`punch-list.md: ${x["uat-nn"]} has no logged date ("${x.logged ?? ""}")`);
    const ids = tbl.map((x) => x["uat-nn"]);
    if (ids.sort().join() !== asList(want.punch).sort().join()) p.push(`punch-list.md lists [${ids.join(", ")}]; expected [${asList(want.punch).join(", ")}]`);
    for (const x of tbl) {
      const late = asList(want.late).includes(x["uat-nn"]);
      if (late && !/^no: reported after request \d+; not on the signed list$/.test(x["on the signed list"] ?? "")) p.push(`punch-list.md: ${x["uat-nn"]} was reported after the request: "no: reported after request <n>; not on the signed list"`);
      if (!late && x["on the signed list"] !== "yes") p.push(`punch-list.md: ${x["uat-nn"]} is on the signed list`);
    }
  }
  // NEXT, in order: step 0, the acceptance invoice (larger), the handoff, documentation (bought).
  return p;
}

/** C13: --signed and --deemed record each step as it finishes; signoff.md is written last; a resume starts at the first missing step. */
function checkSigningSteps(key, run) {
  const p = [];
  const dir = U(key);
  const want = key.signing_steps ?? {};
  let rows, prior;
  try { rows = requestsOf(run, dir); prior = requestsOf(priorView(run), dir); } catch (e) { return [reason(e)]; }
  const row = rows.find((x) => x.n === want.request);
  const steps = asList(row?.signing_steps).map((s) => s.step);
  if (steps.join(",") !== asList(want.steps).join(",")) p.push(`request ${want.request}: signing_steps [${steps.join(", ")}]; expected [${asList(want.steps).join(", ")}]`);
  if (steps.join(",") !== SIGN_STEPS.slice(0, steps.length).join(",")) p.push(`signing_steps run in the order ${SIGN_STEPS.join(", ")} (signoff.md last)`);
  const has = (f) => run.exists(`${dir}/${f}`);
  const fileOf = { "acceptance-record": "acceptance-record.md", "punch-list": "punch-list.md", signoff: "signoff.md" };
  for (const [step, f] of Object.entries(fileOf)) {
    if (steps.includes(step) && !has(f)) p.push(`signing_steps records ${step}, but ${f} does not exist`);
    if (!steps.includes(step) && has(f)) p.push(`${f} exists, but signing_steps does not record ${step}: each file is written before its step is recorded`);
  }
  if (want.signoff === "absent" && has("signoff.md")) p.push("a --signed cut off before its last step has no signoff.md (the marker is written last)");
  if (want.resumed_from) {
    const priorRow = prior.find((x) => x.n === want.request);
    const before = asList(priorRow?.signing_steps);
    const done = new Set(before.map((s) => s.step));
    before.forEach((s, i) => { if (JSON.stringify(row?.signing_steps?.[i]) !== JSON.stringify(s)) p.push(`signing step ${s.step} was redone on resume`); });
    const first = asList(row?.signing_steps)[before.length]?.step;
    if (first !== want.resumed_from) p.push(`the resume starts at ${first}; the first missing step is ${want.resumed_from}`);
    // R1-3: a file or an answer the cut-off run already gave stands; one it never got is written or asked now, once.
    for (const [step, f] of [["acceptance-record", "acceptance-record.md"], ["punch-list", "punch-list.md"]]) {
      const rel = `${dir}/${f}`;
      if (run.priorExists(rel) && run.written().includes(rel) && run.priorRead(rel) !== run.read(rel)) p.push(`${f} was rewritten on resume`);
      if (!done.has(step) && run.priorExists(rel)) p.push(`${f} existed before its ${step} step was recorded`);
    }
    if (done.has("accounts") && JSON.stringify(row?.test_accounts) !== JSON.stringify(priorRow?.test_accounts)) p.push("the test accounts changed on resume: they were asked at the recorded accounts step and are kept in the row");
  }
  return p;
}

function checkDeemed(key, run) {
  const p = [];
  const dir = U(key);
  const want = key.deemed ?? {};
  let uat, rows;
  try { uat = uatOf(run, dir); rows = requestsOf(run, dir); } catch (e) { return [reason(e)]; }
  const c = uat.clauses?.deemed_acceptance;
  if (!c) return ["deemed acceptance needs the frozen clause: clauses none refuses"];
  const cal = contractCal();
  const dates = [addBusinessDays(iso(want.sent), Number(c.business_days), cal), iso(want.stated), ...asList(want.notices).map((n) => addBusinessDays(iso(n), 5, cal))].sort();
  const date = dates.at(-1);
  if (date !== iso(want.want)) p.push(`the deemed date is the latest of [${dates.join(", ")}] = ${date}; the key expects ${want.want}`);
  const row = rows.find((x) => /^(sent|deemed)$/.test(x.status) || x.deemed_date);
  if (row && iso(row.deemed_date) !== date) p.push(`the request row's deemed_date is ${iso(row.deemed_date)}; it is ${date}`);
  if (row) for (const n of asList(row.notices)) if (businessDaysBetween(iso(n.arrived), iso(n.sent), cal) > 3) p.push(`the row counts a notice sent ${iso(n.sent)}, more than 3 business days after ${iso(n.arrived)}: a late notice never moves the date`);
  if (iso(key.today) <= date) {
    if (!want.refused) p.push(`today (${key.today}) is not after the deemed date ${date}: --deemed refuses`);
    if (run.exists(`${dir}/signoff.md`) && !run.priorExists(`${dir}/signoff.md`)) p.push("signoff.md was written before the deemed date passed");
  } else if (want.refused) p.push(`the deemed date ${date} has passed; the key says refused`);
  return p;
}

function checkBackstop(key, run) {
  const p = [];
  const dir = U(key);
  const want = key.backstop ?? {};
  let uat, log, s;
  try { uat = uatOf(run, dir); log = yml(run, `${dir}/backstop-log.yaml`); s = md(run, `${dir}/signoff.md`); } catch (e) { return [reason(e)]; }
  const cl = uat.clauses?.delivery_backstop;
  if (!cl) return ["the backstop needs the frozen backstop clause"];
  const cal = contractCal();
  const delay = asList(log.builder_delay).reduce((a, x) => a + Number(x.days), 0);
  if (iso(log.readiness?.date) !== iso(want.readiness)) p.push(`backstop-log.yaml readiness ${iso(log.readiness?.date)}; expected ${want.readiness}`);
  if (!/^recorded by \S+; not verified by this skill$/.test(String(log.readiness?.recorded ?? ""))) p.push("backstop-log.yaml: the readiness notice is recorded as reported (\"recorded by <user>; not verified by this skill\")");
  if (delay !== Number(want.delay ?? 0)) p.push(`backstop-log.yaml builder delay ${delay} days; expected ${want.delay}`);
  const dep = String(log.readiness?.dependency ?? "");
  const scope = (run.read(`${dir}/agreed/scope.md`) ?? "") + (run.read(`${OW}plans/${key.slug}/build-request.md`) ?? "");
  if (!scope.toLowerCase().includes(dep.toLowerCase())) p.push(`backstop-log.yaml: the dependency "${dep}" is not a listed client dependency`);
  const base = [addBusinessDays(iso(s.data.signed), Number(cl.business_days), cal), addBusinessDays(iso(log.readiness?.date), 5, cal)].sort().at(-1);
  const date = addBusinessDays(base, delay, cal);
  if (date !== iso(want.want)) p.push(`the backstop date is the later of acceptance + ${cl.business_days} and notice + 5 (${base}), plus ${delay} delay days = ${date}; the key expects ${want.want}`);
  if (want.written) {
    let b;
    try { b = md(run, `${dir}/backstop.md`); } catch (e) { return [...p, reason(e)]; }
    if (run.priorExists(`${dir}/backstop.md`)) p.push("backstop.md existed already: written once");
    if (iso(b.data.backstop_date) !== date) p.push(`backstop.md backstop_date ${iso(b.data.backstop_date)}; it is ${date}`);
    if (iso(key.today) < date || (iso(key.today) === date && !appliesOnTheDate(cl))) p.push(`backstop.md written on ${iso(key.today)}, before the backstop date ${date} had passed (it applies from the day after, unless the frozen clause says otherwise: owner decision OD-4)`);
    if (!/recorded by \S+; not verified by this skill/i.test(b.content)) p.push("backstop.md: \"recorded by <user>; not verified by this skill\"");
    if (!/not machine-checked|ow-tools calc/.test(String(b.data.calc))) p.push("backstop.md records the calc call or \"not machine-checked\"");
  }
  return p;
}

/**
 * OD-4: the backstop applies from the day after its date, unless the frozen clause says in so many words that it
 * applies (falls due, takes effect) on that date. Incidental wording, such as a notice that "counts from the same
 * day it is sent", never moves it (R2-6).
 */
export const appliesOnTheDate = (clause) => {
  // R3-2: each sentence of the clause on its own; a negated one ("does not apply on the backstop date", "never
  // falls due on it") or one that moves it later ("after", "later than") never counts as "on the date".
  const NEG = /\b(?:not|never|no longer|cannot)\b|n't\b/i;
  return String(clause?.wording ?? "").split(/(?<=[.;])\s+/).some((s) => {
    const m = /\b(?:appl(?:y|ies)|falls? due|(?:is|are|becomes?) (?:due|payable)|takes? effect)\b([^.;]{0,40}?)\b(?:on|from(?: and including)?) (?:the backstop date|that date|the date itself|the backstop day)\b/i.exec(s)
      ?? /\b()(?:on|from(?: and including)?) the backstop date itself\b/i.exec(s);
    if (!m) return false;
    if (NEG.test(s.slice(Math.max(0, m.index - 25), m.index)) || NEG.test(m[1] ?? "")) return false;
    return !/\b(?:after|later than|following|other than)\b/i.test(m[1] ?? "");
  });
};
/** The one refusal the files call for (design §8.2), in the design's order. */
export function backstopRefusal(view, key, today, answers = "") {
  const dir = U(key);
  let uat; try { uat = uatOf(view, dir); } catch { return "no uat.yaml"; }
  if (String(uat.terms?.schedule) !== "50/50") return "the project is not on the two-payment schedule";
  if (!uat.clauses?.delivery_backstop) return "no backstop clause";
  if (/not supported/.test(String(uat.calendars?.contract))) return "calendar-not-supported";
  let log; try { log = yml(view, `${dir}/backstop-log.yaml`); } catch { return "no readiness notice"; }
  if (!log.readiness?.date) return "no readiness notice";
  if (view.exists(`${dir}/backstop.md`)) return "backstop.md exists";
  let signed; try { signed = iso(md(view, `${dir}/signoff.md`).data.signed); } catch { return "not signed off"; }
  const cal = contractCal();
  const base = [addBusinessDays(signed, Number(uat.clauses.delivery_backstop.business_days), cal), addBusinessDays(iso(log.readiness.date), 5, cal)].sort().at(-1);
  const date = addBusinessDays(base, asList(log.builder_delay).reduce((a, x) => a + Number(x.days), 0), cal);
  if (today < date || (today === date && !appliesOnTheDate(uat.clauses.delivery_backstop))) return "the backstop date has not passed";
  if (/\b(?:set up|resolved|in place|done|arrived|delivered)\b/i.test(answers) && /\bexport|dependency|login|access\b/i.test(answers) && !/\bnot\b|\bstill\b/i.test(answers)) return "the dependency is no longer outstanding";
  const dates = view.read(`${OW}handoffs/${key.slug}/dates.yaml`);
  if (dates && /handoff_date: \d{4}-\d{2}-\d{2}/.test(dates)) return "the notes were delivered";
  const ledger = view.read(`${OW}builds/${key.slug}/ledger.md`);
  if (ledger) { try { if ((matter(ledger).data.payments ?? []).some((x) => x.trigger === "delivery" && /^(requested|paid)$/.test(x.state))) return "the delivery half is invoiced"; } catch { /* unreadable: not invoiced */ } }
  return null;
}
function checkBackstopRefused(key, run) {
  const answers = run.read("session/answers.md") ?? "";
  const got = backstopRefusal(priorView(run), key, iso(key.today), answers);
  return got === key.backstop_refused?.reason ? [] : [`the files call for the refusal "${got ?? "none: the backstop applies"}"; the key expects "${key.backstop_refused?.reason}"`];
}

function checkAddendum(key, run) {
  const p = [];
  const dir = U(key);
  const want = key.addendum ?? {};
  const rel = `${dir}/acceptance-addendum-${want.co}.md`;
  let a;
  try { a = md(run, rel); } catch (e) { return [reason(e)]; }
  if (run.priorExists(rel)) p.push(`${rel} existed already: written once`);
  if (!run.priorExists(`${dir}/signoff.md`)) p.push("an addendum is for a change order after sign-off");
  if (run.exists(`${dir}/agreed/${want.co}.md`)) p.push(`${want.co} is in agreed/: it is part of the acceptance, not an addendum`);
  if (!new RegExp(`confirmed ${iso(want.date)} by ${esc(want.role)}; not verified by this skill`).test(a.content)) p.push(`${rel}: "confirmed ${want.date} by ${want.role}; not verified by this skill"`);
  const scen = scenariosOf(run, dir).filter((s) => s.kind === "addendum" && s.co === want.co);
  const defects = defectsOf(run, dir).filter((d) => scen.some((s) => new RegExp(`\\b${s.id}\\b`).test(d.from)));
  let uat; try { uat = uatOf(run, dir); } catch (e) { return [...p, reason(e)]; }
  const cands = [];
  for (const e of asList(uat.events)) { const m = String(e.event).match(new RegExp(`^${want.co} delivered \\S+, build (\\S+)`)); if (m) cands.push({ label: m[1], rec: Number(e.rec) }); }
  for (const d of defects) for (const h of d.history) { const m = h.text.match(/^fixed, build (\S+)/); if (m) cands.push({ label: m[1], rec: h.rec }); }
  const latest = cands.sort((x, y) => y.rec - x.rec)[0]?.label;
  if (latest !== want.build) p.push(`the latest of ${want.co}'s delivery and the fixes on its UAT-nn is ${latest}; the key says ${want.build}`);
  const runs = runsOf(run, dir);
  for (const c of asList(want.checks)) {
    const ids = scen.filter((s) => s.proves === c).map((s) => s.id);
    if (!runs.some((r) => r.build === latest && r.rows.some((x) => ids.includes(x.sc) && x.result === "pass"))) p.push(`${c} has no pass on ${latest}`);
    if (!tableRows(a.content).some((x) => x.check === c && x.build === latest)) p.push(`${rel}: ${c} with its pass on ${latest} is not recorded`);
  }
  for (const d of defects) if (/^(blocker|major)$/.test(d.severity) && !isTerminal(d)) p.push(`${d.id} (from ${want.co}'s scenarios) is open`);
  if (/\binvoice|payment due|\bpaid\b/i.test(internalSplit(a.content).client.replace(/it marks no payment/i, ""))) p.push(`${rel}: an addendum never marks a payment`);
  return p;
}

function checkCalendar(key, run) {
  const p = [];
  const c = key.calendar ?? {};
  const got = addBusinessDays(iso(c.from), Number(c.days), contractCal());
  if (got !== iso(c.want)) p.push(`${c.from} + ${c.days} business days on the contract calendar is ${got}; the key says ${c.want}`);
  const weekdays = addBusinessDays(iso(c.from), Number(c.days), new Set());
  if (weekdays === got && key.calendar?.holiday) p.push(`no holiday falls in the span: the case does not exercise the calendar`);
  const where = run.written().map((f) => run.read(f) ?? "").join("\n");
  if (c.source === "table" && !/contract-calendar\.md table; not machine-checked/.test(where) && run.written().length) p.push("the date came from the table: it is labelled \"contract-calendar.md table; not machine-checked\"");
  // R1-17: an ow-tools without the calendar capability: the table, labelled, the missing capability said, and no calc call imitated.
  if (c.capability === "missing") {
    if (!/version --json lists no calendar|lacks the calendar capability|no us-federal calendar/.test(where)) p.push("ow-tools here lacks the calendar capability: the run records that version --json lists no calendar, then uses the table");
    if (/--calendar us-federal/.test(where)) p.push("a calc call with --calendar is recorded, but this ow-tools has no calendar capability (never imitate a call)");
  }
  if (c.source === "calc") {
    if (!new RegExp(`ow-tools calc date --from ${iso(c.from)} --business-days ${c.days} --calendar us-federal`).test(where)) p.push("the date came from ow-tools: the command is recorded");
    if (!new RegExp(`'date':'${got}'|"date":"${got}"`).test(where)) p.push("the date came from ow-tools: its raw output is recorded");
    if (!/version --json/.test(where)) p.push("ow-tools is detected by its version --json capability, and that is recorded");
  }
  return p;
}

/**
 * The fields the next stages read (C14: ow-handoff's H1 and ow-documentation's §4.1), pinned: the
 * readers are planned skills with no edges yet, so reciprocity cannot hold skill.edges.yaml to them
 * (OW-04 round 1, HE1). `handoffFieldDrift` does.
 */
export const HANDOFF_PIN = {
  "/ow-handoff-start": {
    "uat/<client>/signoff.md": ["request", "signed or deemed date", "signer role", "build label", "post-acceptance change orders", "test accounts", "delivery backstop date"],
    "uat/<client>/acceptance-record.md": ["each check", "final result", "cases passed", "run and date", "run_by", "build label", "cleared evidence"],
    "uat/<client>/punch-list.md": ["each item", "its UAT-nn", "logged date", "reported after request"],
    // R2-7: H1 also copies agreed/ and reads the addendum; H2 (-delivered) reads the governing definition.
    "uat/<client>/agreed/scope.md": ["the agreed basis"],
    "uat/<client>/agreed/acceptance.md": ["the agreed checks"],
    "uat/<client>/agreed/quick-scope.md": ["the agreed basis"],
    "uat/<client>/agreed/CO-nn.md": ["the change orders in the acceptance"],
    "uat/<client>/agreed/contract-terms.md": ["included", "ownership terms"],
    "uat/<client>/acceptance-addendum-CO-nn.md": ["checks", "results", "confirmation date"],
    "uat/<client>/secrets-seen.log": ["kind", "role", "source", "session"],
    "uat/<client>/evidence/index.md": ["item", "state", "cleared"],
    "uat/<client>/uat.yaml": ["the governing acceptance or delivery definition", "dated"],
    // OW-06 ruling O2 (a data edit): the files ow-handoff reads in place, carried on at this hop.
    "plans/<client>/contract-inputs.md": [],
    "plans/<client>/quote.md": [],
    "plans/<client>/map/systems.md": [],
    "plans/<client>/evidence.md": [],
    "builds/<client>/build.yaml": [],
    "builds/<client>/ledger.md": [],
    "builds/<client>/changes/CO-nn.md": [],
  },
  "/ow-handoff-fix": {
    // OW-06 ruling O2: the punch list with the fields ow-handoff -fix reads.
    "uat/<client>/punch-list.md": ["each item", "its UAT-nn", "logged date"],
  },
  "/ow-documentation-start": {
    "uat/<client>/signoff.md": ["signed or deemed date"],
    "uat/<client>/uat.yaml": ["roles", "tester ids", "environment", "test data"],
    "uat/<client>/scenarios/SC-nn.md": ["role", "steps", "expected result", "data pointers"],
    "uat/<client>/defects/UAT-nn.md": ["class", "Training gap topic"],
    "uat/<client>/evidence/index.md": ["cleared items"],
    // OW-05 ruling O2 (a data edit): the files ow-documentation reads in place, carried on at this hop.
    "plans/<client>/contract-inputs.md": [],
    "plans/<client>/scope.md": [],
    "plans/<client>/quick-scope.md": [],
    "plans/<client>/map/roles.md": [],
    "plans/<client>/map/future.md": [],
    "builds/<client>/build.yaml": [],
    "builds/<client>/ledger.md": [],
    "builds/<client>/changes/CO-nn.md": [],
    "<repo>/spec/02-architecture.md": [],
    "<repo>/spec/04-integrations.md": [],
    "<repo>/spec/scope-and-milestones.md": [],
  },
};
/** OW-05 ruling O2: every in-place entry of a hand-off stays marked in place (a hop that hands on another skill's file). */
export const IN_PLACE_PIN = { "/ow-handoff-start": ["plans/<client>/contract-inputs.md", "plans/<client>/quote.md", "plans/<client>/map/systems.md", "plans/<client>/evidence.md", "builds/<client>/build.yaml", "builds/<client>/ledger.md", "builds/<client>/changes/CO-nn.md"], "/ow-documentation-start": ["plans/<client>/contract-inputs.md", "plans/<client>/scope.md", "plans/<client>/quick-scope.md", "plans/<client>/map/roles.md", "plans/<client>/map/future.md", "builds/<client>/build.yaml", "builds/<client>/ledger.md", "builds/<client>/changes/CO-nn.md", "<repo>/spec/02-architecture.md", "<repo>/spec/04-integrations.md", "<repo>/spec/scope-and-milestones.md"] };
export function handoffFieldDrift(edgesText = readFileSync(EDGES, "utf8")) {
  const e = yaml.load(edgesText);
  const p = [];
  for (const [verb, files] of Object.entries(HANDOFF_PIN)) {
    const h = asList(e?.hands_off).find((x) => x.verb === verb);
    if (!h) { p.push(`skill.edges.yaml has no hand-off to ${verb}`); continue; }
    for (const [path, fields] of Object.entries(files)) {
      const f = asList(h.files).find((x) => (typeof x === "string" ? x : x?.path) === path);
      if (!f) { p.push(`${verb}: the hand-off drops ${path}`); continue; }
      const got = new Set(asList(f.fields).map(String));
      for (const k of fields) if (!got.has(k)) p.push(`${verb}: ${path} no longer hands off "${k}" (the next stage reads it)`);
      if ((IN_PLACE_PIN[verb] ?? []).includes(path) && f.in_place !== true) p.push(`${verb}: ${path} is handed on in place (ow-build's or ow-build-plan's file); mark it in_place: true`);
    }
  }
  return p;
}
function checkHandoffFields(key, run) {
  const p = [];
  const dir = U(key);
  const signedRun = run.exists(`${dir}/signoff.md`);
  if (signedRun) {
    let s; try { s = md(run, `${dir}/signoff.md`).data; } catch (e) { return [reason(e)]; }
    for (const k of ["request", "acceptance", "signed", "signer_role", "build_label", "post_acceptance_cos", "test_accounts", "delivery_backstop_date"]) if (s[k] === undefined) p.push(`signoff.md: no ${k} (the handoff reads it, H1)`);
    if (!run.exists(`${dir}/acceptance-record.md`)) p.push("acceptance-record.md is missing (H1)");
    if (!run.exists(`${dir}/punch-list.md`)) p.push("punch-list.md is missing (H1)");
    const ct = run.read(`${dir}/agreed/contract-terms.md`) ?? "";
    for (const h of ["Included", "Ownership"]) if (sectionOf(matter(ct).content, h) == null) p.push(`agreed/contract-terms.md: no "## ${h}" (the handoff freezes the included block and the ownership terms from agreed/)`);
    const log = run.read(`${dir}/secrets-seen.log`);
    if (log != null) for (const l of log.split("\n").filter((x) => /\| kind: /.test(x))) for (const f of ["kind:", "role:", "source:", "session:"]) if (!l.includes(f)) p.push(`secrets-seen.log: an entry without ${f}`);
    const idx = run.read(`${dir}/evidence/index.md`);
    if (idx != null && !tableRows(idx).every((x) => x.state)) p.push("evidence/index.md: an item without its state");
    let uat; try { uat = uatOf(run, dir); } catch (e) { return [...p, reason(e)]; }
    for (const k of ["testers", "environment", "test_data"]) if (uat[k] === undefined) p.push(`uat.yaml: no ${k} (documentation reads it, §4.1)`);
    for (const s2 of scenariosOf(run, dir)) for (const k of ["role", "data"]) if (s2[k] === undefined) p.push(`${s2.id}: no ${k} (documentation reads it, §4.1)`);
    for (const d of defectsOf(run, dir).filter((x) => /training/i.test(x.cls) && x.cls !== "Training gap")) p.push(`${d.id}: class "${d.cls}"; documentation reads the class "Training gap" exactly (§4.1)`);
  }
  if (key.addendum) {
    const a = run.read(`${dir}/acceptance-addendum-${key.addendum.co}.md`) ?? "";
    if (!/confirmed \d{4}-\d{2}-\d{2} by /.test(a)) p.push("the addendum gives the change order's acceptance date (H1)");
  }
  return p;
}

// ── the meaning checks over a run ────────────────────────────────────────────

function meaningCtx(run, key) {
  const dir = U(key);
  const ctx = { user: key.user, people: asList(key.people), client: key.client, records: [...recordValues(run, key)], legit: legitAmounts(run, key), userAlone: [], notRetested: [] };
  try {
    const uat = uatOf(run, dir);
    const latest = latestBuild(run, key).label;
    const scen = scenariosOf(run, dir);
    const runs = runsOf(run, dir);
    for (const c of asList(uat.checks).map(String)) {
      const ids = scen.filter((s) => s.kind === "required" && s.proves === c).map((s) => s.id);
      const passes = runs.filter((r) => r.build === latest).flatMap((r) => r.rows.filter((x) => ids.includes(x.sc) && x.result === "pass"));
      if (passes.length && passes.every((x) => x.run_by === "user alone")) ctx.userAlone.push(c);
    }
    for (const d of defectsOf(run, dir)) if (d.cls === "Defect" && d.status !== "retested-pass" && d.history.some((h) => /^fixed, build/.test(h.text))) ctx.notRetested.push(d.id);
    for (const d of defectsOf(run, dir)) if (d.cls === "Defect" && !d.history.some((h) => /^fixed, build/.test(h.text)) && !isTerminal(d)) ctx.notRetested.push(d.id);
  } catch { /* the checks that read these report it */ }
  return ctx;
}
function checkInternalNumbers(key, run) {
  const p = [];
  const ctx = meaningCtx(run, key);
  for (const f of clientOutputs(run, key)) {
    for (const s of sentences(proseOf(clientTextOf(run, f)))) for (const [what, hit] of internalFindings(s, ctx)) p.push(`${f}: carries ${what} ("${hit}" in "${s.slice(0, 70)}")`);
    for (const line of clientTextOf(run, f).split("\n").filter((l) => /^\s*\|/.test(l))) for (const [what, hit] of internalFindings(line.replace(/\|/g, ". "), ctx)) p.push(`${f}: a table cell carries ${what} ("${hit}")`);
  }
  p.push(...internalReads(SKILL));
  return p;
}
/** C6: the skill's own text never tells the model to read margin.md, a time export or price-book.yaml. */
export function internalReads(skillDir) {
  const p = [];
  for (const f of walk(skillDir).filter((x) => x === "SKILL.md" || x.startsWith("references/") || x === "skill.edges.yaml")) {
    readFileSync(join(skillDir, f), "utf8").split("\n").forEach((l, i) => {
      // R1-12: the file however named ("the price book", "the job's margin file", "the time tracker's export"), read
      // by any verb of reading; only a negated reading verb ("never read", "do not open") is the rule itself.
      const file = l.match(/\bmargin(?:\.md| file)\b|\bprice[- ]?book(?:\.yaml)?\b|\btime[- ](?:tracker'?s?|tracking|sheet)?\s?exports?\b|\btimesheets?\b|\bpath: price-book\.yaml\b/i);
      if (!file) return;
      const verb = /\b(?:read|reads|reading|open|opens|look (?:up|at)|looks (?:up|at)|check|checks|consult|consults|use|uses|load|loads|import|imports|see|pull|pulls|refer to)\b|\bfrom:/i.exec(l);
      if (!verb) return;
      if (/\b(?:never|not|no|don't|nothing)\b[^.]{0,30}$/i.test(l.slice(0, verb.index + verb[0].length))) return;
      p.push(`skills-work/ow-uat/${f}:${i + 1}: reads an internal file ("${file[0]}"); ow-uat never reads margin.md, a time export or price-book.yaml`);
    });
  }
  return p;
}
function checkPeople(key, run) {
  const p = [];
  const ctx = meaningCtx(run, key);
  for (const f of run.written().filter((x) => TEXT.test(x) && !/\/agreed\/(?!contract-terms)/.test(x) && x !== `${OW}STATUS.md`)) {
    const text = f.endsWith(".html") ? clientTextOf(run, f) : run.read(f) ?? "";
    for (const [what, hit] of peopleFindings(text, ctx)) p.push(`${f}: People by role or id: ${what} ("${hit}")`);
  }
  return p;
}
function checkCredentials(key, run) {
  const p = [];
  for (const f of run.written().filter((x) => TEXT.test(x))) for (const [what, hit] of credentialFindings(run.read(f) ?? "")) p.push(`${f}: No credentials: ${what} ("${hit}")`);
  for (const [what, hit] of credentialFindings(run.printed() ?? "")) p.push(`printed.md: No credentials: ${what} ("${hit}")`);
  return p;
}
function checkData(key, run) {
  const p = [];
  const ctx = meaningCtx(run, key);
  const dir = U(key);
  for (const f of run.written().filter((x) => /\/scenarios\/|\/uat-pack-|\/export\/.*\.html$|\/signoff-request-\d+\.md$|\/acceptance-record\.md$|\/acceptance-addendum-|\/runs\/RUN-/.test(x))) {
    const text = f.endsWith(".html") ? clientTextOf(run, f) : (run.read(f) ?? "");
    for (const [what, hit] of dataFindings(text, ctx)) p.push(`${f}: Data check: ${what} ("${hit}")`);
  }
  const cleared = new Set(tableRows(run.read(`${dir}/evidence/index.md`) ?? "").filter((x) => x.state === "cleared").map((x) => x.item));
  for (const f of run.written().filter((x) => /\/(?:acceptance-record|acceptance-addendum-CO-\d+|signoff-request-\d+)\.md$/.test(x))) {
    for (const m of (run.read(f) ?? "").matchAll(/\b([\w.-]+\.(?:png|jpe?g|gif|mov|mp4|webm|pdf))\b/gi)) if (!cleared.has(m[1])) p.push(`${f}: cites ${m[1]}, which is not cleared in evidence/index.md (only cleared items are reused)`);
  }
  return p;
}
function checkFalsePass(key, run) {
  const p = [];
  const ctx = meaningCtx(run, key);
  for (const f of clientOutputs(run, key)) {
    const self = f.match(/\/defects\/(UAT-\d+)\.md$/)?.[1] ?? null;
    for (const s of sentences(proseOf(clientTextOf(run, f)))) for (const [what, hit] of falsePassFindings(s, ctx, self)) p.push(`${f}: No false pass: ${what} ("${hit}" in "${s.slice(0, 70)}")`);
  }
  for (const line of (run.printed() ?? "").split("\n")) {
    const text = line.replace(/^\s+(?:[A-Z][A-Z ]*):/, "").replace(/say "[^"]*"\s*\(where slash commands exist:[^)]*\)/, "");
    for (const s of sentences(text)) for (const [what, hit] of falsePassFindings(s, ctx)) p.push(`printed.md: No false pass: ${what} ("${hit}")`);
  }
  return p;
}
function checkPrivateNames(key, run) {
  const p = [];
  for (const rel of [...run.written().filter((r) => TEXT.test(r)), "printed.md"]) {
    const text = rel === "printed.md" ? run.printed() ?? "" : run.read(rel) ?? "";
    text.split("\n").forEach((line, i) => {
      for (const n of asList(key.private_names)) {
        const re = new RegExp(`(?<![\\w-])${[...String(n)].map(esc).join("[\\s-]?")}(?![\\w-])`, "i");
        if (re.test(line)) p.push(`${rel}:${i + 1}: names "${n}"`);
      }
    });
  }
  return p;
}

/**
 * The resume step's basis-mismatch rule, applied to every -pack, -defect and -signoff run (OW-04 round 1,
 * R1-2; round 2, R2-10; owner decisions OD-5, OD-6): byte copies by bytes, contract-terms.md by the terms
 * block's digest, or as text with no code. A mismatch blocks the verb (for -defect, its triage); with none,
 * nothing here. Run for every such case, whatever its key lists.
 */
function checkBasis(key, run) {
  const verbs = asList(key.verbs).map(String);
  let m;
  try { m = basisMismatches(priorView(run), key); } catch (e) { return [reason(e)]; }
  if (!m.length) return [];
  const p = [];
  const allowed = new Set(asList(key.refused_writes?.only));
  // R2-10: a -defect run may still log a problem over a mismatch; triage is what the mismatch blocks.
  const onlyDefect = !verbs.some((v) => /^\/ow-uat-(?:pack|signoff)\b/.test(v));
  const triages = (t) => (String(t ?? "").match(/^- \d{4}-\d{2}-\d{2} rec \d+: triaged\b/gm) ?? []).length;
  for (const f of run.written()) {
    if (f === `${OW}STATUS.md` || allowed.has(f.replace(OW, ""))) continue;
    if (onlyDefect) {
      if (/\/defects\/UAT-\d+\.md$/.test(f) && triages(run.read(f)) > triages(run.priorRead(f))) p.push(`${f} was triaged over a basis mismatch (${m.join(", ")}): -defect triage waits for -plan --keep-frozen or --refreeze; logging the problem still works`);
      continue;
    }
    p.push(`${f} was written over a basis mismatch (${m.join(", ")}): ${verbs.join(", ")} refuses until -plan --keep-frozen or --refreeze`);
  }
  const printed = run.printed() ?? "";
  for (const f of m) if (!printed.includes(f.replace(/^agreed\//, ""))) p.push(`printed.md does not name ${f}, the basis mismatch`);
  return p;
}
const basisApplies = (key) => asList(key.verbs).some((v) => /^\/ow-uat-(?:pack|signoff|defect)\b/.test(String(v)));

/**
 * Owner decision R3-6: `--refreeze` of agreed/acceptance.md (or quick-scope.md) refuses when the check list upstream
 * differs from the frozen one. A new check reaches the test through a change order (its scenario, test and price),
 * then `--add-co`. Run for every --refreeze case: over a changed check list the run writes nothing, and its printed
 * block names the changed checks and the change-order path.
 */
function checkRefreezeChecks(key, run) {
  const dir = U(key);
  let u;
  try { u = uatOf(priorView(run), dir); } catch (e) { return [reason(e)]; }
  const named = String(key.plan_mode?.file ?? "");
  const p = [];
  for (const b of asList(u.basis).filter((x) => /(?:^|\/)(?:acceptance|quick-scope)\.md$/.test(String(x.file)))) {
    if (named && named !== b.file) continue;
    const frozen = run.priorRead(`${dir}/${b.file}`), up = run.priorRead(`${OW}${b.from}`);
    if (frozen == null || up == null) continue;
    const was = new Set(checkIdsIn(frozen)), now = new Set(checkIdsIn(up));
    const changed = [...[...now].filter((c) => !was.has(c)), ...[...was].filter((c) => !now.has(c))];
    if (!changed.length) continue;
    for (const f of run.written()) if (f !== `${OW}STATUS.md`) p.push(`${f} was written by --refreeze ${b.file} over a changed check list (${changed.join(", ")}): it refuses; a new check comes in through a change order and --add-co (owner decision R3-6)`);
    const printed = run.printed() ?? "";
    for (const c of changed) if (!printed.includes(c)) p.push(`printed.md does not name ${c}, the changed check`);
    if (!/--add-co|to add CO-/.test(printed) || !/change order/i.test(printed)) p.push("printed.md does not point to the change order and --add-co (owner decision R3-6)");
  }
  return p;
}
const refreezeApplies = (key) => asList(key.verbs).some((v) => /^\/ow-uat-plan --refreeze\b/.test(String(v)));

const CHECKS = {
  headers: checkHeaders, writes: checkWrites, write_once: checkWriteOnce, status: checkStatus, rec: checkRec,
  route: checkRoute, refused: checkRefused, refused_writes: checkRefusedWrites, criteria: checkCriteria, next: checkNext,
  plan: checkPlan, plan_mode: checkPlanMode, plan_resume: checkPlanResume, scenarios: checkScenarios, pack: checkPack,
  run: checkRun, secrets: checkSecrets, defect: checkDefect, signoff: checkSignoff, signed: checkSigned, deemed: checkDeemed,
  backstop: checkBackstop, backstop_refused: checkBackstopRefused, signing_steps: checkSigningSteps, addendum: checkAddendum, calendar: checkCalendar,
  handoff_fields: checkHandoffFields, internal_numbers: checkInternalNumbers, people: checkPeople, credentials: checkCredentials,
  data: checkData, false_pass: checkFalsePass, private_names: checkPrivateNames, basis: checkBasis, refreeze_checks: checkRefreezeChecks,
};

/** Run a case's checks against its golden run, or a real run folder. Returns [{ check, problems }]. */
export function runCase(caseName, runDir = null, { caseDir = join(FIXTURES, caseName) } = {}) {
  let key;
  try {
    key = loadKey(caseDir);
    if (!Array.isArray(key.checks)) throw new Error("`checks` must be a list of check names");
  } catch (e) {
    return [{ check: "answer-key", problems: [`answer-key.yaml could not be used: ${reason(e)}`] }];
  }
  let run;
  try {
    run = runView(caseName, runDir);
    if (typeof key.run === "string") {
      const home = loadKey(join(FIXTURES, run.home));
      // A route cell grades the run it names by that run's own rules too, not the route alone (the Evaluator's RC04).
      key = { ...home, ...key, today: key.today ?? home.today, verbs: home.verbs, run: home.run, checks: [...new Set([...key.checks, ...asList(home.checks)])] };
    }
  } catch (e) {
    return key.checks.map((check) => ({ check, problems: [`run could not be read: ${reason(e)}`] }));
  }
  const checks = [...key.checks, ...(basisApplies(key) && !key.checks.includes("basis") ? ["basis"] : []), ...(refreezeApplies(key) && !key.checks.includes("refreeze_checks") ? ["refreeze_checks"] : [])];
  return checks.map((check) => {
    if (!CHECKS[check]) return { check, problems: [`unknown check "${check}" in answer-key.yaml`] };
    try {
      return { check, problems: CHECKS[check](key, run) };
    } catch (e) {
      return { check, problems: [`check could not run: ${reason(e)}`] };
    }
  });
}

export function listCases() {
  return readdirSync(FIXTURES, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(FIXTURES, e.name, "answer-key.yaml")))
    .map((e) => e.name)
    .sort();
}

/** Copy a case's starting state into `dir` so the skill can be run there. */
export function prepare(caseName, dir) {
  const home = owner(caseName);
  if (existsSync(join(dir, "opchain-work"))) throw new Error(`${join(dir, "opchain-work")} already exists; use an empty folder`);
  const view = runView(home);
  for (const rel of view.priorAll()) {
    const t = view.priorRead(rel);
    if (t == null) continue;
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), t);
  }
  for (const rel of [`${OW}price-book.yaml`, `${OW}profile.md`, `${OW}offers.md`, `${OW}handoffs.yaml`]) {
    const t = view.priorRead(rel);
    if (t != null && !existsSync(join(dir, rel))) { mkdirSync(dirname(join(dir, rel)), { recursive: true }); writeFileSync(join(dir, rel), t); }
  }
  return join(dir, "opchain-work");
}

function report(name, results) {
  let failed = 0;
  for (const { check, problems } of results) {
    if (problems.length) {
      failed++;
      console.log(`  ✗ ${check}`);
      for (const pr of problems) console.log(`      ${pr}`);
    } else console.log(`  ✓ ${check}`);
  }
  console.log(`${failed ? "✗" : "✓"} ${name}: ${results.length - failed}/${results.length} checks pass`);
  return failed;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  try {
    if (args[0] === "--prepare") {
      const work = prepare(args[1], resolve(args[2]));
      const key = loadKey(join(FIXTURES, args[1]));
      console.log(`Prepared ${work}. Attach ${resolve(args[2])} to a session with ow-uat installed and follow tests/fixtures/ow-uat/README.md for "${key.case}" (${key.section}).`);
      console.log(`Save the NEXT block the run prints as ${join(resolve(args[2]), "printed.md")}, then: node scripts/ow-uat-acceptance.mjs ${args[1]} ${resolve(args[2])}`);
    } else if (args.length === 2) {
      process.exit(report(args[0], runCase(args[0], resolve(args[1]))) ? 1 : 0);
    } else {
      let failed = 0;
      for (const c of listCases()) failed += report(`${c} (golden run)`, runCase(c)) ? 1 : 0;
      process.exit(failed ? 1 : 0);
    }
  } catch (e) {
    console.error(`ow-uat-acceptance: ${reason(e)}`);
    process.exit(2);
  }
}
