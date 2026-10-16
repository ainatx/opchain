#!/usr/bin/env node
// ow-build acceptance checks (docs/plans/2026-10-08-ow-build-design.md §10 and §12.7).
//
// ow-build is a text-only skill: a model runs it, so these checks cannot run
// the skill. They read what a run wrote (its opchain-work/ folder and the
// client project's spec/) and test it against an answer key, the signed Build
// Plan, the price book and the builder's own files, mechanically. One check per
// design rule:
//
//   headers           the protocol's artefact header on each output
//   route             "use ow-build on <path>" (and ow-build-plan's signed NEXT) lands on one verb, by files first
//   start             build.yaml from the signed plan: milestones, checks, sources, the builder's mode, the map
//   start_stopped     a sprint plan that leaves a check (or a milestone) uncovered stops -start: no map, no -run
//   spec              opchain mode: five spec/ files from the right sources; every check verbatim in 06-testing.md
//   no_spec           no builder: no spec/, the public default (or the say: line) recorded as printed
//   ledger            the payment schedule from the quote; booking due at signing; the arithmetic tool-checked or marked
//   run               one sprint of one milestone per call; its result read from the builder's report and checkpoint
//   update            the weekly update: sections, every "This week" sentence traced, progress counted from passing checks
//   margin            margin.md: hours, share, burn and the overrun flag, computed from the time export and the quote
//   demo_script       a walk-through of every check of the milestone, and what is not in it
//   demo_record       every check's result, adjustments classed, the working-demo trigger human-confirmed, no ledger write
//   change            a request classed in scope, priced, unpriced (asked), an extension, or too big for a change order
//   signature_gate    a change order with only an agreement in principle is never reported or handed over as started
//   signed            a signed amendment recorded: the change order's checks appended to spec/06-testing.md, nothing else
//   invoice           the invoice requests a met trigger produces, with the ledger's amounts; the delivery half once
//   invoice_refused   nothing written when no new trigger is met (a second delivery half)
//   ready             ready-for-uat.md: every check with its run; a failing check is no ready and no trigger
//   email             every .html is well formed, accessible by construction, and has a .txt twin with the same words
//   internal_numbers  no hours, effort, rates, margin, unit prices or modifiers in client outputs or spec/, by meaning
//   no_false_done     nothing not passing is called done, working or ready, however worded
//   builder_name      the builder's name and say: lines appear in no file ow-build writes
//   status            STATUS.md lines appended, never rewritten
//   private_names     no private skill or business name, except a handoffs.yaml say: line printed exactly
//
// Each check runs on its own: a malformed file fails the checks that need it,
// with a one-line reason, and every other check still runs and reports.
//
// Fixtures live in tests/fixtures/ow-build/<case>/ (all invented). A case's
// starting state is layered: its own input/ (and session/, what the user brings
// to the session), the builder/ files the builder writes during the run, then
// the run of its `base:` case, any `extra:` layers, then (via `plan_case:`) an
// ow-build-plan golden run, then the shared workspace and the skills' shipped
// examples. expected/ is the hand-written golden run. A case with `run: <case>`
// grades that case's run against its own answer key.
//
//   node scripts/ow-build-acceptance.mjs                        # every case against its golden run
//   node scripts/ow-build-acceptance.mjs <case> <run-dir>       # one case against a real run
//   node scripts/ow-build-acceptance.mjs --prepare <case> <dir> # set up a folder to run the skill in
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";
import { matter } from "./lib/frontmatter.mjs";
import { runLayers as planRunLayers } from "./ow-build-plan-acceptance.mjs";
import { preflight } from "../plugins/ow-tools/lib/preflight.mjs";
import { split as calcSplit, total as calcTotal } from "../plugins/ow-tools/lib/calc.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const FIXTURES = join(ROOT, "tests", "fixtures", "ow-build");
const PLAN_WORKSPACE = join(ROOT, "tests", "fixtures", "ow-build-plan", "workspace", "opchain-work");
const OW = "opchain-work/";
const CLOCKS = /^(tool|host-supplied|user-stated|assumed)$/;
const TEXT = /\.(md|ya?ml|txt|json|csv|html)$/;
const PUBLIC_BUILD = "give build-request.md to whoever builds it";
const PUBLIC_INVOICE = "create this invoice in your invoicing tool";
const PUBLIC_CHANGE = "send change-inputs-CO-nn.md to whoever drafts your contracts, as an amendment";
const SHARED = {
  [`${OW}price-book.yaml`]: join(PLAN_WORKSPACE, "price-book.yaml"),
  [`${OW}profile.md`]: join(PLAN_WORKSPACE, "profile.md"),
  [`${OW}offers.md`]: join(ROOT, "skills-work", "ow-build-plan", "examples", "offers.md"),
  [`${OW}handoffs.yaml`]: join(ROOT, "skills-work", "ow-build", "examples", "handoffs.yaml"),
};

// ── small helpers ────────────────────────────────────────────────────────────

const reason = (e) => String(e?.message ?? e).split("\n")[0].trim();
const iso = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? v : String(v).trim());
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const cents = (v) => Math.round(Number(String(v).replace(/,/g, "")) * 100);
const money = (c) => (c / 100).toFixed(2);
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const written = (date) => {
  const [y, m, d] = iso(date).split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};
/** 6980 -> a pattern for "6,980.00", "6980.00", "6,980" or "6980". */
const amountRe = (c) => {
  const whole = Math.floor(c / 100);
  const w = [...new Set([whole.toLocaleString("en-US"), String(whole)])].map(esc).join("|");
  const dec = String(c % 100).padStart(2, "0");
  return new RegExp(`(?<![\\d,.])(?:${w})${c % 100 ? `\\.${dec}` : `(?:\\.${dec})?`}(?![\\d])`);
};

/** Markdown sections by heading text (any level), keeping the raw lines. */
function sections(content, level = 2) {
  const out = new Map();
  let cur = null;
  const re = new RegExp(`^${"#".repeat(level)}\\s+(.+?)\\s*$`);
  for (const line of content.split("\n")) {
    const h = line.match(re);
    if (h) { cur = h[1].trim(); out.set(cur, []); continue; }
    if (cur && new RegExp(`^#{1,${level - 1}}\\s`).test(line)) cur = null;
    if (cur) out.get(cur).push(line);
  }
  return out;
}
export const sectionText = (content, name, level = 2) => {
  for (const [k, v] of sections(content, level)) if (k.toLowerCase().startsWith(name.toLowerCase())) return v.join("\n");
  return null;
};
/** Rows of the first table after a heading (any level) matching `heading`, keyed by lower-case header. */
function tableAfter(content, heading) {
  const lines = content.split("\n");
  const h = lines.findIndex((l) => /^#{2,4}\s/.test(l) && heading.test(l.replace(/^#{2,4}\s+/, "")));
  if (h < 0) return null;
  let i = h + 1;
  while (i < lines.length && !lines[i].trim().startsWith("|")) {
    if (/^#{1,4}\s/.test(lines[i])) return [];
    i++;
  }
  const cells = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  const header = cells(lines[i] ?? "").map((c) => c.toLowerCase());
  const rows = [];
  for (let j = i + 2; j < lines.length && lines[j].trim().startsWith("|"); j++) {
    const c = cells(lines[j]);
    rows.push(Object.fromEntries(header.map((k, n) => [k, c[n] ?? ""])));
  }
  return rows;
}
/** Rows of the first table anywhere in `content`. */
function firstTable(content) {
  const lines = content.split("\n");
  const i = lines.findIndex((l) => l.trim().startsWith("|"));
  if (i < 0) return [];
  return tableAfter(["## x", ...lines.slice(i)].join("\n"), /^x$/) ?? [];
}
/** `### AC-n.m` blocks: id -> the raw `- key: value` lines and a key map. */
export function checkBlocks(content) {
  const out = new Map();
  let cur = null;
  for (const line of content.split("\n")) {
    const h = line.match(/^###\s+(AC-[A-Z0-9.-]+)\s*$/);
    if (h) { cur = { id: h[1], lines: [], keys: {} }; out.set(cur.id, cur); continue; }
    if (/^#{1,3}\s/.test(line)) { cur = null; continue; }
    const kv = cur && line.match(/^-\s+([a-z][a-z ]*):\s*(.*)$/i);
    if (kv) { cur.lines.push(line.trimEnd()); cur.keys[kv[1].trim().toLowerCase()] = kv[2].trim(); }
  }
  return out;
}
/** Split a client part (no header) at the ow:internal markers. */
function internalSplit(content) {
  const lines = content.split("\n");
  const a = lines.findIndex((l) => /^\s*<!--\s*ow\s*:\s*internal\s*-->\s*$/i.test(l));
  const z = lines.findIndex((l) => /^\s*<!--\s*ow\s*:\s*end\s*-\s*internal\s*-->\s*$/i.test(l));
  if (a < 0 || z < a) return { client: content, internal: "", marked: false };
  return { client: [...lines.slice(0, a), ...lines.slice(z + 1)].join("\n"), internal: lines.slice(a + 1, z).join("\n"), marked: true };
}

// ── the run: layered files ───────────────────────────────────────────────────

export function loadKey(caseDir) {
  const key = yaml.load(readFileSync(join(caseDir, "answer-key.yaml"), "utf8"));
  if (!key || typeof key !== "object" || Array.isArray(key)) throw new Error("the answer key is not a map");
  return key;
}
function walk(dir, base = dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p, base) : [relative(base, p).split("\\").join("/")];
  });
}
/** The case whose folder holds the run (follows `run:`). */
function owner(caseName, seen = new Set()) {
  if (seen.has(caseName)) throw new Error(`run cycle at ${caseName}`);
  seen.add(caseName);
  const key = loadKey(join(FIXTURES, caseName));
  return key.run ? owner(key.run, seen) : caseName;
}
/** A case's starting state, newest first: [{ dir, mount }]. */
function priorLayers(caseName, seen = new Set()) {
  if (seen.has(caseName)) throw new Error(`base cycle at ${caseName}`);
  seen.add(caseName);
  const dir = join(FIXTURES, caseName);
  const key = loadKey(dir);
  const layers = [{ dir: join(dir, "builder"), mount: "" }, { dir: join(dir, "input"), mount: "" }, { dir: join(dir, "session"), mount: "session/" }];
  if (key.base) layers.push(...runLayers(key.base, seen));
  for (const x of key.extra ?? []) layers.push({ dir: join(FIXTURES, x), mount: "" });
  if (key.plan_case) layers.push(...planRunLayers(key.plan_case).map((d) => ({ dir: d, mount: OW })));
  return layers;
}
function runLayers(caseName, seen = new Set()) {
  return [{ dir: join(FIXTURES, caseName, "expected"), mount: "" }, ...priorLayers(caseName, seen)];
}
const inLayer = (l, rel) => rel.startsWith(l.mount) && existsSync(join(l.dir, rel.slice(l.mount.length))) ? join(l.dir, rel.slice(l.mount.length)) : null;

/** What a run touches: its own writes live under opchain-work/ and <repo>/spec/. */
const ownWrite = (rel) => rel.startsWith(OW) || /^[^/]+\/spec\//.test(rel);

/**
 * A view of a run: read(rel) finds a root-relative file (opchain-work/…, <repo>/…,
 * session/…) in the run or the layers under it; written() lists what ow-build
 * itself wrote; priorRead reads the starting state.
 */
export function runView(caseName, runDir = null) {
  const home = owner(caseName);
  const prior = priorLayers(home);
  const layers = runDir ? [{ dir: runDir, mount: "" }] : [{ dir: join(FIXTURES, home, "expected"), mount: "" }, ...prior];
  const find = (rel) => {
    for (const l of layers) { const p = inLayer(l, rel); if (p) return p; }
    return SHARED[rel] && existsSync(SHARED[rel]) ? SHARED[rel] : null;
  };
  const priorFind = (rel) => {
    for (const l of prior) { const p = inLayer(l, rel); if (p) return p; }
    return SHARED[rel] && existsSync(SHARED[rel]) ? SHARED[rel] : null;
  };
  const listOf = (ls) => {
    const seen = new Set();
    for (const l of ls) for (const r of walk(l.dir)) seen.add(l.mount + r);
    return [...seen].sort();
  };
  const writtenFiles = () => {
    if (!runDir) return walk(join(FIXTURES, home, "expected")).filter(ownWrite).sort();
    return walk(runDir).filter(ownWrite).filter((r) => {
      const p = priorFind(r);
      return !p || !readFileSync(p).equals(readFileSync(join(runDir, r)));
    }).sort();
  };
  const cache = new Map();
  const read = (rel) => {
    if (!cache.has(rel)) { const p = find(rel); cache.set(rel, p ? readFileSync(p, "utf8") : null); }
    return cache.get(rel);
  };
  const priorRead = (rel) => { const p = priorFind(rel); return p ? readFileSync(p, "utf8") : null; };
  return { home, read, priorRead, exists: (rel) => find(rel) != null, priorExists: (rel) => priorFind(rel) != null, all: () => listOf(layers), priorAll: () => listOf(prior), written: writtenFiles };
}

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
const md = (run, rel) => parsed(run.read(rel), rel, "md");
const yml = (run, rel) => parsed(run.read(rel), rel, "yaml");
const priorMd = (run, rel) => parsed(run.priorRead(rel), `${rel} (before the run)`, "md");
const priorYml = (run, rel) => parsed(run.priorRead(rel), `${rel} (before the run)`, "yaml");
const build = (key) => `${OW}builds/${key.slug}`;
const plan = (key) => `${OW}plans/${key.plan_slug ?? key.slug}`;
const book = (run) => yml(run, `${OW}price-book.yaml`);

function handoffs(run) {
  const text = run.read(`${OW}handoffs.yaml`);
  if (text == null) return {};
  try {
    const doc = yaml.load(text);
    return doc && typeof doc === "object" ? doc : {};
  } catch (e) {
    throw new Error(`handoffs.yaml: not valid YAML (${reason(e)})`);
  }
}
const sayOf = (run, dest) => { const d = handoffs(run)[dest]; return d && typeof d === "object" && typeof d.say === "string" ? d.say : null; };
/** The builder's name and lines, from handoffs.yaml only (opchain mode). */
function builderNames(run) {
  const b = handoffs(run).build;
  if (!b || typeof b !== "object") return [];
  const out = [];
  if (typeof b.checkpoint === "string" && b.checkpoint.trim()) out.push(b.checkpoint.trim());
  for (const k of ["plan", "sprint", "fix", "say"]) if (typeof b[k] === "string") out.push(b[k].split("{")[0].trim());
  return out.filter((s) => s.length > 3);
}

/** The signed plan's checks: acceptance.md, or quick-scope.md for a quick quote. */
function planChecks(run, key) {
  const quote = md(run, `${plan(key)}/quote.md`).data;
  const quick = quote.mode === "quick";
  const rel = `${plan(key)}/${quick ? "quick-scope.md" : "acceptance.md"}`;
  return { quick, rel, checks: checkBlocks(md(run, rel).content), quote };
}
/** The quote's Milestones list: "1. Work packages 1, 2 and 4: …" -> [{ id: M1, wps: [WP-1, …] }]. */
export function quoteMilestones(content) {
  const sec = sectionText(content, "Milestones") ?? "";
  return sec.split("\n").map((l) => l.match(/^\s*(\d+)\.\s+Work packages? ([\d, and]+):/)).filter(Boolean)
    .map((m) => ({ id: `M${m[1]}`, wps: m[2].split(/,|and/).map((s) => s.trim()).filter(Boolean).map((n) => `WP-${n}`) }));
}
const wpOf = (ac) => `WP-${String(ac).replace(/^AC-/, "").split(".")[0]}`;

/**
 * The documentation & training line (ow-documentation amendment B4): bought in
 * contract-inputs.md, at its documentation_price. Declined, or no
 * contract-inputs.md: no line and no trigger.
 */
export function documentationLine(run, key) {
  const text = run.read(`${plan(key)}/contract-inputs.md`);
  if (text == null) return null;
  const d = parsed(text, `${plan(key)}/contract-inputs.md`, "md").data;
  return d.documentation_sku === "bought" ? { amount: d.documentation_price } : null;
}

/** The builder's project folder (root-relative), from build.yaml's builder.repo. */
function repoOf(run, key) {
  const b = (() => { try { return yml(run, `${build(key)}/build.yaml`); } catch { return null; } })();
  const repo = String(b?.builder?.repo ?? key.repo ?? "").replace(/^\.\.\//, "");
  return repo && repo !== "none" ? repo : key.repo;
}

/** The latest evaluation report of a sprint, and its verdict and per-check results. */
export function sprintReport(run, repo, n) {
  const dir = `${repo}/sprints/sprint-${n}/`;
  const rounds = run.all().filter((f) => f.startsWith(dir) && /eval-round-(\d+)\.md$/.test(f))
    .map((f) => ({ f, m: Number(f.match(/eval-round-(\d+)\.md$/)[1]) })).sort((a, b) => a.m - b.m);
  if (!rounds.length) return null;
  const { f, m } = rounds.at(-1);
  const text = run.read(f) ?? "";
  const verdict = (text.match(/###\s*Verdict:\s*\**\s*(PASS|FAIL)/i) ?? [])[1]?.toUpperCase() ?? null;
  const pass = new Set(), fail = new Set();
  for (const line of text.split("\n")) {
    const r = line.match(/(AC-[\w.-]+)\s*(?:—|-|\|)\s*(PASS|FAIL)\b/);
    if (r) (r[2] === "PASS" ? pass : fail).add(r[1]);
  }
  return { file: f.slice(repo.length + 1), path: f, round: m, verdict, pass: [...pass], fail: [...fail] };
}
function checkpoint(run, repo) {
  const name = handoffs(run).build?.checkpoint;
  const rel = `${repo}/.checkpoints/${name}.checkpoint.json`;
  const text = name ? run.read(rel) : null;
  if (!text) return null;
  try { return JSON.parse(text); } catch (e) { throw new Error(`${rel}: not valid JSON (${reason(e)})`); }
}

// ── the email: HTML well-formedness and the text twin ────────────────────────

const VOID = new Set(["meta", "img", "br", "hr"]);
const ALLOWED = new Set(["html", "head", "meta", "title", "body", "table", "tbody", "thead", "tr", "td", "th", "h1", "h2", "h3", "p", "ul", "ol", "li", "a", "img", "br", "hr", "strong", "em", "span"]);
const PARENTS = { tr: ["table", "tbody", "thead"], td: ["tr"], th: ["tr"], li: ["ul", "ol"], tbody: ["table"], thead: ["table"], head: ["html"], body: ["html"], title: ["head"], meta: ["head"] };

/** Validate one email's HTML as the template's rules say; returns problems. */
export function validateEmailHtml(html) {
  const p = [];
  if (!/^<!DOCTYPE html>\s*\n/i.test(html)) p.push("does not start with <!DOCTYPE html>");
  const body = html.replace(/^<!DOCTYPE html>/i, "");
  const tokens = [...body.matchAll(/<!--[\s\S]*?-->|<\/?([A-Za-z][A-Za-z0-9]*)([^<>]*?)(\/?)>|([^<]+)|(<)/g)];
  const stack = [];
  const seen = { h1: 0, title: "", img: 0, headings: [], tablesWithoutRole: 0, width600: false };
  let lang = false, charset = false;
  for (const m of tokens) {
    const [raw, name, attrs = "", , text, stray] = m;
    if (stray) { p.push("a raw < in the text (write &lt;)"); continue; }
    if (raw.startsWith("<!--")) { p.push("an HTML comment (it would travel with an attached copy)"); continue; }
    if (text !== undefined) {
      if (/&(?![a-z]+;|#\d+;|#x[0-9a-f]+;)/i.test(text)) p.push(`a raw & in the text ("${text.trim().slice(0, 30)}")`);
      if (stack.at(-1) === "title") seen.title += text;
      continue;
    }
    const tag = name;
    if (tag !== tag.toLowerCase()) p.push(`<${tag}> is not lower case`);
    const t = tag.toLowerCase();
    const closing = raw.startsWith("</");
    if (!ALLOWED.has(t)) { p.push(`<${t}> is not an element the email template uses${/^(script|style|link|iframe|form|object|embed)$/.test(t) ? " (email clients strip it, and it is never allowed)" : ""}`); }
    if (closing) {
      if (VOID.has(t)) { p.push(`</${t}>: ${t} is a void element`); continue; }
      if (stack.at(-1) !== t) { p.push(`</${t}> closes ${stack.at(-1) ? `<${stack.at(-1)}>` : "nothing"}`); const i = stack.lastIndexOf(t); if (i >= 0) stack.length = i; continue; }
      stack.pop();
      continue;
    }
    // Attributes: name="value", lower case, no duplicates, no event handlers.
    const names = [];
    const rest = attrs.replace(/\s+([a-zA-Z-]+)="([^"]*)"/g, (_, n, v) => {
      names.push(n);
      if (n !== n.toLowerCase()) p.push(`<${t} ${n}>: attribute names are lower case`);
      if (/^on/i.test(n)) p.push(`<${t} ${n}>: no event handlers`);
      if ((n === "src" || n === "href") && /^(?:https?:)?\/\//i.test(v) && n === "src") p.push(`<${t} src>: no remote images`);
      return "";
    }).trim();
    if (rest && rest !== "/") p.push(`<${t}>: an attribute is not written name="value" ("${rest.slice(0, 30)}")`);
    if (new Set(names).size !== names.length) p.push(`<${t}>: a duplicate attribute`);
    const attr = (n) => (attrs.match(new RegExp(`\\s${n}="([^"]*)"`)) ?? [])[1];
    const parent = PARENTS[t];
    if (parent && !parent.includes(stack.at(-1))) p.push(`<${t}> sits inside <${stack.at(-1) ?? "nothing"}>, not ${parent.map((x) => `<${x}>`).join(" or ")}`);
    if (t === "html") lang = Boolean(attr("lang"));
    if (t === "meta" && /utf-8/i.test(attr("charset") ?? "")) charset = true;
    if (t === "h1") seen.h1++;
    if (/^h[1-3]$/.test(t)) seen.headings.push(Number(t[1]));
    if (t === "img") { seen.img++; if (!(attr("alt") ?? "").trim()) p.push("an <img> without alt text"); }
    if (t === "table" && attr("role") !== "presentation") seen.tablesWithoutRole++;
    if (t === "table" && attr("width") === "600") seen.width600 = true;
    if (t === "a") {
      const i = tokens.indexOf(m);
      const label = (tokens[i + 1]?.[4] ?? "").trim();
      if (/^(?:here|click here|https?:\/\/\S+)$/i.test(label)) p.push(`a link whose text is "${label}"; link text says where it goes`);
    }
    if (!VOID.has(t) && raw.endsWith("/>")) p.push(`<${t} />: only void elements close themselves`);
    if (!VOID.has(t)) stack.push(t);
  }
  if (stack.length) p.push(`unclosed: ${stack.map((t) => `<${t}>`).join(" ")}`);
  if (!lang) p.push("<html> has no lang");
  if (!charset) p.push('no <meta charset="utf-8">');
  if (!seen.title.trim()) p.push("no <title>");
  if (seen.h1 !== 1) p.push(`${seen.h1} <h1> headings; exactly one`);
  seen.headings.forEach((h, i) => { if (i && h > seen.headings[i - 1] + 1) p.push(`a heading skips from h${seen.headings[i - 1]} to h${h}`); });
  if (seen.tablesWithoutRole) p.push(`${seen.tablesWithoutRole} layout table(s) without role="presentation"`);
  if (!seen.width600) p.push("no 600 px content table");
  if (/<style|<link|<script/i.test(html)) p.push("a <style>, <link> or <script> element; every style is inline");
  return p;
}
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", middot: "·", mdash: "—", ndash: "–", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…" };
const decode = (s) => s.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e) => e[0] === "#" ? String.fromCodePoint(e[1] === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENTITIES[e.toLowerCase()] ?? m);
/** The words a reader sees: the title is not shown, links read "text (address)". */
export function htmlWords(html) {
  const bodyOnly = html.replace(/[\s\S]*?<body[^>]*>/i, "").replace(/<\/body>[\s\S]*$/i, "");
  const text = bodyOnly.replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, t) => `${t} (${href})`).replace(/<[^>]+>/g, " ");
  return words(decode(text));
}
export const words = (s) => (s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);

function checkEmailPair(run, htmlRel) {
  const p = [];
  const html = run.read(htmlRel);
  if (html == null) return [`${htmlRel} was not written`];
  for (const x of validateEmailHtml(html)) p.push(`${htmlRel}: ${x}`);
  const txtRel = htmlRel.replace(/\.html$/, ".txt");
  const txt = run.read(txtRel);
  if (txt == null) return [...p, `${txtRel} was not written; every email has a plain-text twin`];
  const a = htmlWords(html), b = words(txt);
  if (a.join(" ") !== b.join(" ")) {
    let i = 0;
    while (i < a.length && a[i] === b[i]) i++;
    p.push(`${txtRel}: the twin's words differ from the HTML's at word ${i + 1} ("${a.slice(i, i + 6).join(" ")}" in the HTML, "${b.slice(i, i + 6).join(" ")}" in the text)`);
  }
  return p;
}

// ── meaning-based term matching ──────────────────────────────────────────────

/** Internal numbers, by meaning: however a paraphrase words it (design §9.1, §12.7). */
export const INTERNAL_TERMS = [
  [/\b\d+(?:[.,]\d+)?\s*(?:h|hrs?|hours?)\b/i, "an hour count"],
  [/\bhours?\b|\bhrs\b/i, "hours"],
  [/\b(?:effort|person[- ]?days?|man[- ]?days?|days? of (?:work|effort|development)|time (?:spent|logged|booked|tracked)|timesheets?|billable|logged)\b/i, "effort"],
  [/\b(?:hourly|per hour|day rate|rates?)\b/i, "a rate"],
  [/\b(?:margins?|profit|burn(?:ed|ing|s)?|overrun|over-?ran|over budget|under budget|budgets?)\b/i, "margin"],
  [/\b(?:unit prices?|modifiers?|mark-?up)\b/i, "pricing internals"],
  [/(?:^|[\s(])[x×]\s?\d+\.\d+\b/i, "a modifier factor"],
  [/\b(?:checkpoints?|evaluators?|rubrics?|gates?|sprints?|scores?|scored)\b/i, "a tool word"],
];
/**
 * Spec words (§12.2, §12.7): no price, fee, payment terms, margin or pricing
 * internals of ours. A client's own data may hold a field called "price" or a
 * cost figure (Sprint 1 eval round 1, bug 6), so the word "price" alone and a
 * client's currency amount are not ours; our amounts are matched by value.
 */
const SPEC_TERMS = [
  [/\b(?:fixed price|our price|the price of (?:the|this) (?:build|work|job|change)|priced|pricing|fees?|quoted|quotation|rates?|hourly|margins?|budgets?|unit prices?|modifiers?|mark-?up|payments? (?:schedule|terms)|deposit|instal?ments?)\b/i, "price wording"],
];
/** "Done", however worded (design §9.1 No false done). */
export const DONE_WORDS = /\b(?:done|finished|complete[ds]?|completed|working|works|worked|ready|live|delivered|shipped|passe[sd]|passing|in place|wrapped up|sorted|up and running|good to go|ticked off|signed off|all set|nailed|landed|launched|rolled out|in production|operational|functional|fully functional|behind us)\b/i;
/** "Started", however worded (design §6 signature gate). */
export const STARTED_WORDS = /\b(?:start(?:ed|ing|s)?|begun|began|underway|under way|in progress|working on|work on|building|built|added|adding|making progress|kicked off|on it|picked up|got going|rolling|implement(?:ed|ing)?|develop(?:ed|ing)?|handed (?:it )?to the builder|making headway|progressing|first cut|first pass|prototyp(?:e|ed|ing)|sketch(?:ed|ing)?|scaffold(?:ed|ing)?)\b/i;

/** Amounts (cents) that are internal: price-book units, quote pricing lines, the extension rate, margin figures. */
function internalAmounts(run, key) {
  const out = new Set();
  const add = (v) => { const c = cents(v); if (Number.isFinite(c) && c >= 10000) out.add(c); };
  try {
    const b = book(run);
    for (const u of b.units ?? []) add(u.price);
    add(b.uat?.extension?.per_session_or_round);
    add(b.uat?.per_extra_role);
  } catch { /* the ledger and other checks report a broken price book */ }
  const q = run.read(`${plan(key)}/quote.md`);
  if (q) {
    const { internal } = internalSplit(matter(q).content);
    for (const r of tableAfter(internal, /^pricing lines/i) ?? []) { add(r.amount); add(r["unit price"]); }
  }
  const m = run.read(`${build(key)}/margin.md`);
  if (m) {
    const { data, content } = matter(m);
    add(data.internal_hour_value?.amount);
    for (const r of firstTable(content)) { add(r.burn); add(r["share of fixed price"]); }
  }
  return out;
}
/** Amounts a client may see: the fixed price, the payments, the quote's client lines, change-order prices. */
function legitAmounts(run, key) {
  const out = new Set();
  const add = (v) => { const c = cents(v); if (Number.isFinite(c) && c > 0) out.add(c); };
  const q = run.read(`${plan(key)}/quote.md`);
  if (q) {
    const d = matter(q).data;
    add(d.fixed_price); add(d.build_total); (d.payments ?? []).forEach(add); add(d.uat?.price);
    if (typeof d.documentation_training?.price === "number") add(d.documentation_training.price);
  }
  for (const f of run.all().filter((x) => new RegExp(`^${esc(build(key))}/changes/CO-\\d+\\.md$`).test(x))) {
    try { add(matter(run.read(f)).data.price); } catch { /* reported by change */ }
  }
  return out;
}
/** Decimal hour totals from margin.md (e.g. "45.5"): internal wherever they appear. */
function hourFigures(run, key) {
  const m = run.read(`${build(key)}/margin.md`);
  if (!m) return [];
  const rows = firstTable(matter(m).content);
  return rows.map((r) => String(r.hours ?? "").trim()).filter((h) => /^\d+\.\d+$/.test(h));
}

// ── checks ───────────────────────────────────────────────────────────────────

const ARTEFACT = (rel) => {
  if (/\/spec\/([^/]+)\.md$/.test(rel)) return `ow-build/spec-${rel.match(/\/spec\/([^/]+)\.md$/)[1]}`;
  const name = rel.split("/").pop().replace(/\.(md|ya?ml)$/, "");
  if (/^\d{4}-\d{2}-\d{2}-checks$/.test(name)) return "ow-build/update-checks";
  if (/^M\d+-script$/.test(name)) return "ow-build/demo-script";
  if (/^M\d+-record$/.test(name)) return "ow-build/demo-record";
  if (/^CO-\d+$/.test(name)) return "ow-build/change-order";
  if (/^change-inputs-CO-\d+$/.test(name)) return "ow-build/change-inputs";
  if (/^INV-request-/.test(name)) return "ow-build/invoice-request";
  return `ow-build/${name}`;
};
const rootRel = (key, rel) => (rel.startsWith("spec/") ? `${key.repo}/${rel}` : `${OW}${rel}`);

function checkHeaders(key, run) {
  const p = [];
  for (const out of key.outputs ?? []) {
    const rel = rootRel(key, out);
    let data;
    try { data = rel.endsWith(".yaml") ? yml(run, rel) : md(run, rel).data; } catch (e) { p.push(reason(e)); continue; }
    const want = ARTEFACT(rel);
    if (data.ow_artefact !== want) p.push(`${out}: ow_artefact is ${data.ow_artefact}, expected ${want}`);
    if (String(data.schema) !== "1") p.push(`${out}: schema is ${data.schema}, expected 1`);
    if (!/^ow-build \d+\.\d+\.\d+ \(protocol 1\)$/.test(data.written_by ?? "")) p.push(`${out}: written_by is "${data.written_by}"`);
    if (data.workstream !== key.slug) p.push(`${out}: workstream is ${data.workstream}, expected ${key.slug}`);
    if (!data.subject) p.push(`${out}: subject is missing`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso(data.created) ?? "")) p.push(`${out}: created "${iso(data.created)}" is not a YYYY-MM-DD date`);
    if (!CLOCKS.test(data.clock ?? "")) p.push(`${out}: clock "${data.clock}" is not tool, host-supplied, user-stated or assumed`);
    if (data.origin !== "skill") p.push(`${out}: origin is "${data.origin}", expected skill`);
  }
  return p;
}

function checkStart(key, run) {
  const p = [];
  const rel = `${build(key)}/build.yaml`;
  const b = yml(run, rel);
  const want = key.start;
  const request = md(run, `${plan(key)}/build-request.md`).data;
  const { quick, checks, quote } = planChecks(run, key);
  if (b.client !== key.client) p.push(`build.yaml: client is ${b.client}, expected ${key.client}`);
  if (iso(b.signed) !== iso(request.signed)) p.push(`build.yaml: signed ${iso(b.signed)}; build-request.md says ${iso(request.signed)}`);
  if (b.quote_mode !== (quick ? "quick" : "build-plan")) p.push(`build.yaml: quote_mode is ${b.quote_mode}; quote.md mode is ${quote.mode}`);
  const planHandling = quick ? quote.handling : (run.read(`${plan(key)}/plan.yaml`) ? yml(run, `${plan(key)}/plan.yaml`).handling : undefined);
  if (planHandling !== undefined && String(b.handling) !== String(planHandling)) p.push(`build.yaml: handling is "${b.handling}"; the plan holds "${planHandling}"`);
  if (!/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/.test(b.update_day ?? "")) p.push(`build.yaml: update_day "${b.update_day}" is not a weekday`);
  else if (new Date(`${iso(b.first_update)}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }) !== b.update_day) p.push(`build.yaml: first_update ${iso(b.first_update)} is not a ${b.update_day}`);
  if (want.first_update && iso(b.first_update) !== iso(want.first_update)) p.push(`build.yaml: first_update ${iso(b.first_update)}, expected ${iso(want.first_update)}`);
  for (const s of ["git", "checkpoints", "time", "notes"]) if (!(s in (b.sources ?? {}))) p.push(`build.yaml: sources has no ${s}`);
  // Milestones: from the quote's Milestones list; every check of their packages; never moved.
  const ms = quoteMilestones(md(run, `${plan(key)}/quote.md`).content);
  if (!ms.length) p.push("quote.md: no Milestones list to read");
  const got = b.milestones ?? [];
  if (got.map((m) => m.id).join() !== ms.map((m) => m.id).join()) p.push(`build.yaml: milestones ${got.map((m) => m.id).join(", ") || "none"}; the quote has ${ms.map((m) => m.id).join(", ")}`);
  for (const m of ms) {
    const g = got.find((x) => x.id === m.id);
    if (!g) continue;
    if ((g.work_packages ?? []).join() !== m.wps.join()) p.push(`build.yaml: ${m.id} work packages ${(g.work_packages ?? []).join(", ")}; the quote says ${m.wps.join(", ")}`);
    const mine = [...checks.keys()].filter((c) => m.wps.includes(wpOf(c)));
    if ((g.checks ?? []).join() !== mine.join()) p.push(`build.yaml: ${m.id} checks ${(g.checks ?? []).join(", ")}; its packages' checks are ${mine.join(", ")}`);
  }
  const covered = new Set(got.flatMap((m) => m.checks ?? []));
  for (const c of checks.keys()) if (!covered.has(c)) p.push(`build.yaml: ${c} is in no milestone`);
  // The builder's mode and the map.
  const h = handoffs(run).build;
  const mode = !h || typeof h !== "object" ? "none" : h.mode === "opchain" ? "opchain" : "other";
  if (b.builder?.mode !== mode) p.push(`build.yaml: builder.mode is ${b.builder?.mode}; handoffs.yaml's build entry makes it ${mode}`);
  if (mode === "opchain" && !key.start_stopped) {
    if (b.map_check !== "OK") p.push(`build.yaml: map_check is "${b.map_check}", expected OK`);
    const plan_ = run.read(`${key.repo}/sprints/sprint-plan.md`);
    if (plan_ == null) p.push(`${key.repo}/sprints/sprint-plan.md: no sprint plan to map`);
    else {
      const map = sprintMap(plan_, ms, checks);
      for (const m of got) {
        const w = map.byMilestone.get(m.id) ?? [];
        if ((m.sprints ?? []).join() !== w.join()) p.push(`build.yaml: ${m.id} sprints ${(m.sprints ?? []).join(", ") || "none"}; the sprint plan's citations make them ${w.join(", ") || "none"}`);
      }
    }
    if (!b.builder?.sprint_plan?.approved) p.push("build.yaml: no record of the sprint plan's approval (the user's)");
    if (want.milestones) for (const [id, s] of Object.entries(want.milestones)) if ((got.find((m) => m.id === id)?.sprints ?? []).join() !== s.join()) p.push(`build.yaml: ${id} sprints, expected ${s.join(", ")}`);
  }
  if ((b.sprints ?? []).length) p.push("build.yaml: -start hands no sprint; sprints must be empty");
  if (key.embedded) {
    const e = (b.embedded_instructions ?? []).map(String).join("\n");
    if (!e.includes(key.embedded)) p.push(`build.yaml: the planted instruction ("${key.embedded}") is not quoted under embedded_instructions`);
  }
  // -start never runs over a started build.
  if (run.priorRead(rel) != null && (priorYml(run, rel).map_check === "OK")) p.push("build.yaml: -start ran over a build that had started");
  return p;
}

/** The milestone each sprint belongs to, by the check ids its section cites. */
export function sprintMap(planText, milestones, checks) {
  const msOf = (ac) => milestones.find((m) => m.wps.includes(wpOf(ac)))?.id;
  const sprints = [...planText.matchAll(/^##\s+Sprint\s+(\d+)\b[^\n]*\n([\s\S]*?)(?=^##\s+Sprint\s+\d+|(?![\s\S]))/gm)].map((m) => ({ n: Number(m[1]), cites: [...new Set([...m[2].matchAll(/\bAC-\d+\.\d+\b/g)].map((x) => x[0]))].filter((c) => checks.has(c)) }));
  const byMilestone = new Map();
  const cited = new Set();
  const split = [];
  for (const s of sprints) {
    s.cites.forEach((c) => cited.add(c));
    const ms = [...new Set(s.cites.map(msOf).filter(Boolean))];
    if (ms.length > 1) split.push(s.n);
    if (ms.length === 1) byMilestone.set(ms[0], [...(byMilestone.get(ms[0]) ?? []), s.n]);
  }
  const uncovered = [...checks.keys()].filter((c) => !cited.has(c));
  const empty = milestones.filter((m) => !byMilestone.has(m.id)).map((m) => m.id);
  return { byMilestone, uncovered, empty, split };
}

function checkStartStopped(key, run) {
  const p = [];
  const b = yml(run, `${build(key)}/build.yaml`);
  const { checks } = planChecks(run, key);
  const ms = quoteMilestones(md(run, `${plan(key)}/quote.md`).content);
  const map = sprintMap(run.read(`${key.repo}/sprints/sprint-plan.md`) ?? "", ms, checks);
  const gaps = [...map.uncovered, ...map.empty];
  if (!gaps.length) return ["the sprint plan covers every check and milestone; this case has nothing to stop on"];
  if (!/^stopped:/.test(String(b.map_check ?? ""))) p.push(`build.yaml: map_check is "${b.map_check}"; a sprint plan that leaves ${gaps.join(", ")} uncovered stops -start`);
  for (const g of gaps) if (!String(b.map_check ?? "").includes(g)) p.push(`build.yaml: map_check does not name ${g}, which no sprint covers`);
  for (const m of b.milestones ?? []) if ((m.sprints ?? []).length) p.push(`build.yaml: ${m.id} has a sprints list; a stopped map records none`);
  const status = (run.read(`${OW}STATUS.md`) ?? "").split("\n").filter(Boolean).at(-1) ?? "";
  if (/\/ow-build-run/.test(status)) p.push("STATUS.md: points at -run while the map is stopped");
  return p;
}

const SPEC_FILES = ["00-project-overview", "02-architecture", "04-integrations", "06-testing", "scope-and-milestones"];
const SPEC_SOURCES = {
  full: { "00-project-overview": ["build-plan.md", "scope.md"], "02-architecture": ["map/systems.md", "map/data.md", "map/future.md"], "04-integrations": ["map/systems.md", "scope.md"], "06-testing": ["acceptance.md"], "scope-and-milestones": ["scope.md", "risks.md", "quote.md"] },
  quick: { "00-project-overview": ["build-request.md", "quick-scope.md"], "02-architecture": ["build-request.md"], "04-integrations": ["build-request.md", "quick-scope.md"], "06-testing": ["quick-scope.md"], "scope-and-milestones": ["quick-scope.md", "quote.md"] },
};

function checkSpec(key, run) {
  const p = [];
  const { quick, rel: checksRel, checks } = planChecks(run, key);
  const mode = quick ? "quick" : "full";
  const planDir = plan(key).slice(OW.length);
  for (const f of SPEC_FILES) {
    const rel = `${key.repo}/spec/${f}.md`;
    if (!run.written().includes(rel)) { p.push(`${rel} was not written`); continue; }
    const { data, content } = md(run, rel);
    if (!content.includes(`The signed Build Plan is the source of truth: \`${planDir}/\`. Change it there, not here.`)) p.push(`${rel}: no source-of-truth line naming ${planDir}/`);
    const sources = [...(sectionText(content, "Sources") ?? "").matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    const want = SPEC_SOURCES[mode][f].map((s) => `${planDir}/${s}`);
    if (sources.sort().join() !== [...want].sort().join()) p.push(`${rel}: Sources ${sources.join(", ") || "none"}; a ${mode === "quick" ? "quick-quote job" : "full Build Plan"} reads ${want.join(", ")}`);
    if (!want.map((w) => w).includes(data.subject) && data.subject !== want[0]) p.push(`${rel}: subject ${data.subject} is not one of its sources`);
  }
  if (quick) {
    const arch = run.read(`${key.repo}/spec/02-architecture.md`) ?? "";
    if (!/A quick-quote job has no process map; systems and data are as the build request states them\./.test(arch)) p.push("spec/02-architecture.md: a quick-quote job says it has no process map");
    const sm = run.read(`${key.repo}/spec/scope-and-milestones.md`) ?? "";
    if (!/Risks: none recorded \(a quick-quote job has no risks file\)\./.test(sm)) p.push("spec/scope-and-milestones.md: a quick-quote job says no risks were recorded");
  }
  // Every check of the plan, verbatim, with its test data and case count.
  const testing = run.read(`${key.repo}/spec/06-testing.md`);
  if (testing != null) {
    const got = checkBlocks(matter(testing).content);
    if (key.spec?.checks != null && checks.size !== key.spec.checks) p.push(`${checksRel}: holds ${checks.size} checks; this case expects ${key.spec.checks}`);
    for (const [id, c] of checks) {
      const g = got.get(id);
      if (!g) { p.push(`spec/06-testing.md: ${id} is missing (every acceptance check reaches the builder)`); continue; }
      for (const line of c.lines) if (!g.lines.includes(line)) p.push(`spec/06-testing.md: ${id} does not carry "${line}" verbatim`);
    }
    const extra = [...got.keys()].filter((id) => !checks.has(id) && !/^AC-CO-/.test(id));
    if (extra.length) p.push(`spec/06-testing.md: checks not in the plan: ${extra.join(", ")}`);
  }
  return p;
}

function checkNoSpec(key, run) {
  const p = [];
  for (const f of run.written()) if (/\/spec\//.test(f)) p.push(`${f}: no builder in this session, so -start writes no spec/`);
  const b = yml(run, `${build(key)}/build.yaml`);
  const h = handoffs(run).build;
  const none = !h || typeof h !== "object";
  if (b.builder?.mode !== (none ? "none" : "other")) p.push(`build.yaml: builder.mode is ${b.builder?.mode}, expected ${none ? "none" : "other"}`);
  if (none && b.builder?.handover !== PUBLIC_BUILD) p.push(`build.yaml: builder.handover is "${b.builder?.handover}"; with no build entry it is the public default "${PUBLIC_BUILD}"`);
  if (!none && b.builder?.handover !== "say: line printed") p.push(`build.yaml: builder.handover is "${b.builder?.handover}"; the say: line is printed, never written`);
  if (!/^not applicable/.test(String(b.map_check ?? ""))) p.push(`build.yaml: map_check is "${b.map_check}"; with no builder it is not applicable`);
  if ((b.milestones ?? []).some((m) => (m.sprints ?? []).length)) p.push("build.yaml: sprints mapped with no builder");
  return p;
}

/** The recorded arithmetic is real tool output for the stated command, or marked not machine-checked. */
function arithmeticProblems(rel, a, want) {
  if (a === "not machine-checked") return [];
  if (!a || typeof a !== "object" || !a.command || a.output == null) return [`${rel}: arithmetic is neither a recorded tool run (command and output) nor "not machine-checked"`];
  const sp = String(a.command).match(/^ow-tools calc split --total (\S+) --schedule (\S+)$/);
  const tt = String(a.command).match(/^ow-tools calc total --items (\S+)$/);
  let real;
  try {
    if (sp) real = calcSplit({ total: sp[1], schedule: sp[2] });
    else if (tt) return [];  // the items file lives where the run put it; its output is compared with the amounts below
    else return [`${rel}: arithmetic command "${a.command}" is not an ow-tools calc call`];
  } catch (e) { return [`${rel}: arithmetic command fails: ${reason(e)}`]; }
  const p = [];
  if (JSON.stringify(real) !== String(a.output).trim()) p.push(`${rel}: the recorded output is not what "${a.command}" prints (${JSON.stringify(real)}); never invent a machine fact`);
  if (want && sp && (cents(sp[1]) !== cents(want.total) || sp[2] !== want.schedule)) p.push(`${rel}: the arithmetic splits ${sp[1]} by ${sp[2]}, not the quote's ${want.total} by ${want.schedule}`);
  return p;
}

const TRIGGERS = { "40/40/20": [["booking", 40], ["working-demo", 40], ["acceptance", 20]], "50/50": [["booking", 50], ["delivery", 50]] };

function checkLedger(key, run) {
  const p = [];
  const rel = `${build(key)}/ledger.md`;
  const { data, content } = md(run, rel);
  const q = md(run, `${plan(key)}/quote.md`).data;
  const request = md(run, `${plan(key)}/build-request.md`).data;
  if (!/This is not an accounting record\./.test(content)) p.push(`${rel}: does not say it is not an accounting record`);
  for (const k of ["currency", "schedule", "payment_terms_days"]) if (String(data[k]) !== String(q[k])) p.push(`${rel}: ${k} ${data[k]}; the quote says ${q[k]}`);
  if (cents(data.fixed_price) !== cents(q.fixed_price)) p.push(`${rel}: fixed_price ${data.fixed_price}; the quote says ${q.fixed_price}`);
  const rows = TRIGGERS[q.schedule];
  if (!rows) return [...p, `quote.md: schedule ${q.schedule} is neither 40/40/20 nor 50/50`];
  const pay = data.payments ?? [];
  if (pay.map((x) => `${x.trigger}:${x.share}`).join() !== rows.map(([t, s]) => `${t}:${s}`).join()) p.push(`${rel}: payment rows ${pay.map((x) => `${x.trigger} ${x.share}`).join(", ")}; ${q.schedule} has ${rows.map(([t, s]) => `${t} ${s}`).join(", ")}`);
  pay.forEach((x, i) => { if (q.payments?.[i] != null && cents(x.amount) !== cents(q.payments[i])) p.push(`${rel}: ${x.trigger} amount ${money(cents(x.amount))}; the quote's payment is ${money(cents(q.payments[i]))}`); });
  const sum = pay.reduce((a, x) => a + cents(x.amount), 0);
  if (sum !== cents(q.fixed_price)) p.push(`${rel}: the payments add up to ${money(sum)}, not the fixed price ${money(cents(q.fixed_price))}`);
  const booking = pay.find((x) => x.trigger === "booking");
  const wantBooking = key.ledger?.booking ?? "due";
  if (booking && booking.state !== wantBooking) p.push(`${rel}: booking is ${booking.state}, expected ${wantBooking} (met at the signing)`);
  if (booking && iso(booking.met) !== iso(request.signed)) p.push(`${rel}: booking met ${iso(booking.met)}; the signing is ${iso(request.signed)}`);
  for (const x of pay) if (x.trigger !== "booking" && x.state !== (key.ledger?.states?.[x.trigger] ?? "not met")) p.push(`${rel}: ${x.trigger} is ${x.state}, expected ${key.ledger?.states?.[x.trigger] ?? "not met"}`);
  // The working demo: the quote's one milestone, else the user's answer (the quote does not say).
  if (q.schedule === "40/40/20") {
    const ms = quoteMilestones(md(run, `${plan(key)}/quote.md`).content);
    if (ms.length === 1 && (data.working_demo !== ms[0].id || data.working_demo_source !== "quote")) p.push(`${rel}: one milestone, so working_demo is ${ms[0].id} from the quote`);
    if (ms.length > 1) {
      if (!/^user-stated \d{4}-\d{2}-\d{2}$/.test(String(data.working_demo_source ?? ""))) p.push(`${rel}: ${ms.length} milestones and one working-demo payment: working_demo_source must be "user-stated <date>" (the skill never picks one)`);
      if (key.ledger?.working_demo && data.working_demo !== key.ledger.working_demo) p.push(`${rel}: working_demo is ${data.working_demo}, expected ${key.ledger.working_demo} (the user's answer)`);
    }
  } else if (data.working_demo != null && data.working_demo !== "none") p.push(`${rel}: a 50/50 schedule has no working-demo payment`);
  // The documentation line (B4): copied when bought, outside the fixed price; none otherwise.
  const doc = documentationLine(run, key);
  if (doc) {
    const d = data.documentation;
    if (!d || typeof d !== "object" || d.sku !== "bought") p.push(`${rel}: contract-inputs.md says documentation_sku: bought, so the ledger carries the documentation line (documentation: { sku: bought, amount, state })`);
    else {
      if (cents(d.amount) !== cents(doc.amount)) p.push(`${rel}: documentation amount ${money(cents(d.amount))}; contract-inputs.md says ${money(cents(doc.amount))}`);
      const want = key.ledger?.states?.documentation ?? "not met";
      if (d.state !== want) p.push(`${rel}: documentation is ${d.state}, expected ${want}`);
    }
  } else if (data.documentation !== "none") p.push(`${rel}: the documentation line was declined or not recorded, so documentation is "none" and there is no such trigger`);
  p.push(...arithmeticProblems(rel, data.arithmetic, { total: q.fixed_price, schedule: q.schedule }));
  if (key.ledger?.machine_checked === true && data.arithmetic === "not machine-checked") p.push(`${rel}: this case ran ow-tools; the arithmetic must be recorded`);
  if (key.ledger?.machine_checked === false && data.arithmetic !== "not machine-checked") p.push(`${rel}: ow-tools was not installed in this case; the arithmetic is "not machine-checked"`);
  return p;
}

function checkRun(key, run) {
  const p = [];
  const rel = `${build(key)}/build.yaml`;
  const after = yml(run, rel);
  const before = priorYml(run, rel);
  const want = key.sprint;
  const ms = after.milestones ?? [];
  const m = ms.find((x) => x.id === want.milestone);
  if (!m) return [`build.yaml: no milestone ${want.milestone}`];
  // Exactly one sprint, of this milestone, the next unfinished one.
  const b0 = new Map((before.sprints ?? []).map((s) => [s.n, s]));
  const changed = (after.sprints ?? []).filter((s) => JSON.stringify(s) !== JSON.stringify(b0.get(s.n)));
  if ((after.sprints ?? []).length < (before.sprints ?? []).length) p.push("build.yaml: a sprint entry was removed");
  if (changed.length !== 1) return [...p, `build.yaml: ${changed.length} sprint entries changed; one call runs one sprint`];
  const s = changed[0];
  if (s.milestone !== want.milestone || !(m.sprints ?? []).includes(s.n)) p.push(`build.yaml: sprint ${s.n} (${s.milestone}) is not one of ${want.milestone}'s sprints ${(m.sprints ?? []).join(", ")}`);
  const handedBefore = (before.sprints ?? []).find((x) => x.milestone === want.milestone && x.handed && !x.result);
  const next = handedBefore?.n ?? (m.sprints ?? []).find((n) => b0.get(n)?.result !== "pass");
  if (s.n !== next) p.push(`build.yaml: ran sprint ${s.n}; the next unfinished sprint of ${want.milestone} is ${next}`);
  for (const other of ms) {
    const was = (before.milestones ?? []).find((x) => x.id === other.id);
    if (other.id !== want.milestone && JSON.stringify(was) !== JSON.stringify(other)) p.push(`build.yaml: ${other.id} changed; -run ${want.milestone} touches only ${want.milestone}`);
  }
  // The result, from the builder's files.
  const repo = repoOf(run, key);
  const report = sprintReport(run, repo, s.n);
  const cp = checkpoint(run, repo);
  const blocked = (cp?.blockers ?? []).find((x) => String(x.blocking ?? "") === `sprint-${s.n}`) ?? ((cp?.progress_table ?? []).find((x) => x.id === `sprint-${s.n}` && /^(blocked|failed)$/.test(x.status)) ? { id: "progress_table" } : null);
  const expect = !report ? undefined : report.verdict === "PASS" ? "pass" : report.verdict === "FAIL" && blocked ? "escalated" : report.verdict === "FAIL" ? "not passed yet" : undefined;
  if ((s.result ?? undefined) !== expect) p.push(`build.yaml: sprint ${s.n} result is ${s.result ?? "none"}; the builder's files (${report ? `${report.file}: ${report.verdict ?? "no verdict"}` : "no report"}${blocked ? ", a blocker" : ""}) make it ${expect ?? "none (still handed)"}`);
  if (want.result && s.result !== want.result) p.push(`build.yaml: sprint ${s.n} result is ${s.result}, this case expects ${want.result}`);
  if (s.result) {
    if (report && s.report !== report.file) p.push(`build.yaml: sprint ${s.n} report is ${s.report}; the newest is ${report.file}`);
    if (!s.confirmed_by) p.push(`build.yaml: sprint ${s.n} has no confirmed_by: a builder's verdict counts only once the user confirms it`);
  }
  if (s.result === "pass" && report && [...(s.checks_passing ?? [])].sort().join() !== [...report.pass].sort().join()) p.push(`build.yaml: sprint ${s.n} checks_passing ${(s.checks_passing ?? []).join(", ")}; the report marks ${report.pass.join(", ")} PASS`);
  if (s.result !== "pass" && (s.checks_passing ?? []).length) p.push(`build.yaml: sprint ${s.n} did not pass, so no check passes from it`);
  if (s.result === "escalated" && !s.blocker) p.push(`build.yaml: sprint ${s.n} escalated with no blocker recorded`);
  // The milestone's status and the next step.
  // From what the builder's files show, not from what the run recorded.
  const resultOf = (n) => (n === s.n ? expect : (after.sprints ?? []).find((x) => x.n === n)?.result);
  const done = (m.sprints ?? []).every((n) => resultOf(n) === "pass");
  const wantStatus = done ? "ready for demo" : expect === "escalated" ? "stopped" : "in progress";
  if (m.status !== wantStatus) p.push(`build.yaml: ${want.milestone} status is ${m.status}, expected ${wantStatus}`);
  const last = (run.read(`${OW}STATUS.md`) ?? "").split("\n").filter(Boolean).at(-1) ?? "";
  const nextVerb = done ? "/ow-build-demo" : "/ow-build-run";
  if (!last.includes(`next: ow-build ${nextVerb} builds/${key.slug}/`)) p.push(`STATUS.md: the newest line must point at ${nextVerb} (${done ? `every sprint of ${want.milestone} passes: the demo` : "a sprint is left, not passed yet or escalated"}), not "${last.split(" | ")[3] ?? last}"`);
  for (const f of run.written()) if (f !== rel && f !== `${OW}STATUS.md`) p.push(`${f}: -run writes build.yaml and STATUS.md only`);
  return p;
}

/** "This week" sentences: split on sentence ends. */
const sentences = (text) => (text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+/g) ?? []).map((s) => s.trim()).filter(Boolean);
const htmlSection = (html, name) => {
  const m = html.match(new RegExp(`<h2[^>]*>\\s*${esc(name)}\\s*</h2>([\\s\\S]*?)(?=<h2|</td>\\s*</tr>\\s*<tr>\\s*<td[^>]*border-top|$)`, "i"));
  return m ? decode(m[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim() : null;
};
const UPDATE_SECTIONS = ["This week", "Milestone progress", "Next week", "Needs from you", "Changes", "Risks"];

/** Checks passing per milestone, as build.yaml records them (sprints with result pass). */
function passingByMilestone(b) {
  const pass = new Set((b.sprints ?? []).filter((s) => s.result === "pass").flatMap((s) => s.checks_passing ?? []));
  return new Map((b.milestones ?? []).map((m) => [m.id, (m.checks ?? []).filter((c) => pass.has(c))]));
}

function checkUpdate(key, run) {
  const p = [];
  const date = iso(key.update.date);
  const htmlRel = `${build(key)}/updates/${date}.html`;
  const html = run.read(htmlRel);
  if (html == null) return [`${htmlRel} was not written`];
  const heads = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => decode(m[1]).trim());
  if (heads.join("|") !== UPDATE_SECTIONS.join("|")) p.push(`${htmlRel}: sections ${heads.join(", ")}; expected ${UPDATE_SECTIONS.join(", ")}`);
  // Trace: every This week sentence has a row, and every row's source exists.
  const week = sentences(htmlSection(html, "This week") ?? "");
  if (week.length < 3 || week.length > 5) p.push(`${htmlRel}: This week has ${week.length} sentences; 3 to 5`);
  const checksRel = `${build(key)}/updates/${date}-checks.md`;
  const { data: cd, content: cc } = md(run, checksRel);
  const trace = tableAfter(cc, /^trace/i) ?? [];
  const period = String(cd.period ?? "").match(/^(\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})$/);
  if (!period) p.push(`${checksRel}: period "${cd.period}" is not "<date> to <date>"`);
  const gitLog = run.read("session/git-log.txt") ?? "";
  const notes = run.read("session/notes.md") ?? "";
  const repo = repoOf(run, key);
  const cp = (() => { try { return checkpoint(run, repo); } catch { return null; } })();
  for (const s of week) {
    const row = trace.find((r) => r.sentence === s);
    if (!row) { p.push(`${checksRel}: no trace row for "${s.slice(0, 60)}"`); continue; }
    const src = row.source ?? "";
    let m;
    if ((m = src.match(/^commit ([0-9a-f]{7,40})$/))) {
      const line = gitLog.split("\n").find((l) => l.startsWith(m[1]));
      if (!line) p.push(`${checksRel}: "${s.slice(0, 40)}…" cites commit ${m[1]}, which is not in the week's git history`);
      else if (period) { const d = (line.match(/\d{4}-\d{2}-\d{2}/) ?? [])[0]; if (!d || d < period[1] || d > period[2]) p.push(`${checksRel}: commit ${m[1]} (${d}) is outside the week ${period[1]} to ${period[2]}`); }
    } else if ((m = src.match(/^report (\S+)$/))) {
      if (!run.exists(`${repo}/${m[1]}`)) p.push(`${checksRel}: cites the report ${m[1]}, which the builder did not write`);
    } else if ((m = src.match(/^checkpoint (\S+)$/))) {
      if (!(cp?.progress_table ?? []).some((x) => x.id === m[1])) p.push(`${checksRel}: cites checkpoint row ${m[1]}, which the checkpoint's progress_table does not hold`);
    } else if ((m = src.match(/^note (\S+) (\d{4}-\d{2}-\d{2})$/))) {
      if (m[1] !== key.user || !notes.includes(m[2])) p.push(`${checksRel}: cites a note by ${m[1]} on ${m[2]}, which the session's notes do not hold`);
    } else p.push(`${checksRel}: source "${src}" is not a commit, report, checkpoint row or note`);
  }
  for (const r of trace) if (!week.includes(r.sentence)) p.push(`${checksRel}: trace row "${String(r.sentence).slice(0, 40)}…" is not a This week sentence`);
  // Milestone progress: k of m from passing checks only.
  const b = yml(run, `${build(key)}/build.yaml`);
  const passing = passingByMilestone(b);
  const prog = htmlSection(html, "Milestone progress") ?? "";
  for (const m of b.milestones ?? []) {
    const n = m.id.slice(1);
    const got = prog.match(new RegExp(`Milestone ${n}: (\\d+) of (\\d+) acceptance checks passing`));
    const k = passing.get(m.id)?.length ?? 0;
    if (!got) p.push(`${htmlRel}: Milestone progress has no "Milestone ${n}: <k> of <m> acceptance checks passing" line`);
    else if (Number(got[1]) !== k || Number(got[2]) !== (m.checks ?? []).length) p.push(`${htmlRel}: says Milestone ${n}: ${got[1]} of ${got[2]}; build.yaml shows ${k} of ${(m.checks ?? []).length} passing`);
  }
  for (const [ms, d] of Object.entries(cd.next_demo ?? {})) {
    const when = String(d).match(/^(\d{4}-\d{2}-\d{2}) \((user-stated|quote|build\.yaml)[^)]*\)$/);
    if (!when) p.push(`${checksRel}: next_demo ${ms} "${d}" has no date with its source`);
    else if (!prog.includes(written(when[1]))) p.push(`${htmlRel}: Milestone progress does not give ${ms}'s next demo date, ${written(when[1])}`);
  }
  // The checks file's own self-checks.
  const sc = tableAfter(cc, /^self-checks/i) ?? [];
  for (const name of ["No internal numbers", "Trace", "No false done", "Priced and signed before work", "No private names"]) {
    const row = sc.find((r) => r.check === name);
    if (!row) p.push(`${checksRel}: no "${name}" self-check`);
    else if (row.result !== "OK") p.push(`${checksRel}: "${name}" is ${row.result}; fix and re-run while any is FINDING`);
  }
  if (!/Same-session self-check: the same assistant/.test(cc)) p.push(`${checksRel}: the self-checks are not labelled as a same-session self-check`);
  // A planted instruction in a commit message or note is quoted, never followed.
  if (key.embedded && !(sectionText(cc, "Possible embedded instructions") ?? "").includes(key.embedded)) p.push(`${checksRel}: the planted instruction ("${key.embedded}") is not quoted under Possible embedded instructions`);
  // Unsigned change orders: only in Changes, and "not started" there.
  p.push(...changeGateIn(run, key, htmlRel, html));
  return p;
}

/** A change order not yet signed appears only in Changes, marked not started (design §6 step 4). */
function changeGateIn(run, key, rel, html) {
  const p = [];
  const cos = run.all().filter((f) => new RegExp(`^${esc(build(key))}/changes/CO-\\d+\\.md$`).test(f)).map((f) => ({ f, d: matter(run.read(f)).data }));
  for (const { d } of cos) {
    if (d.status === "signed" || d.status === "declined") continue;
    const id = d.id;
    const phrases = [id, ...((key.change_phrases ?? {})[id] ?? [])];
    // Anywhere in the update, a sentence about it never reports the work as started.
    for (const name of UPDATE_SECTIONS.filter((s) => s !== "Changes")) {
      for (const s of sentences(htmlSection(html, name) ?? "")) {
        if (!phrases.some((ph) => new RegExp(`\\b${esc(ph)}\\b`, "i").test(s))) continue;
        const m = s.replace(/not started/gi, " ").match(STARTED_WORDS);
        if (m) p.push(`${rel}: "${name}" reports ${id} as started ("${m[0]}") before its amendment is signed ("${s.slice(0, 60)}")`);
      }
    }
    const ch = htmlSection(html, "Changes") ?? "";
    const line = sentences(ch).filter((s) => phrases.some((ph) => new RegExp(`\\b${esc(ph)}\\b`, "i").test(s)));
    if (!line.length) p.push(`${rel}: Changes does not list ${id}`);
    for (const s of line) {
      if (!/not started/i.test(s)) p.push(`${rel}: Changes lists ${id} without "not started" ("${s.slice(0, 60)}")`);
      const rest = s.replace(/not started/gi, " ");
      const m = rest.match(STARTED_WORDS);
      if (m) p.push(`${rel}: Changes reports ${id} as started ("${m[0]}") before its amendment is signed`);
    }
  }
  return p;
}

function checkMargin(key, run) {
  const p = [];
  const rel = `${build(key)}/margin.md`;
  const { data, content } = md(run, rel);
  const b = yml(run, `${build(key)}/build.yaml`);
  const exportRel = String(b.sources?.time?.export ?? "").replace(/^\.\.\//, "");
  const csv = run.read(exportRel);
  if (csv == null) return [`${exportRel}: the time export named in build.yaml is not there`];
  const date = iso(key.update.date);
  const rows = csv.split("\n").slice(1).map((l) => l.split(",")).filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r[0]) && r[0] <= date);
  const hours = new Map();
  for (const r of rows) hours.set(r[2]?.trim(), (hours.get(r[2]?.trim()) ?? 0) + Number(r[1]));
  const q = matter(run.read(`${plan(key)}/quote.md`) ?? "").content;
  const lines = tableAfter(internalSplit(q).internal, /^pricing lines/i) ?? [];
  const value = cents(data.internal_hour_value?.amount);
  if (!Number.isFinite(value) || value <= 0) p.push(`${rel}: no internal_hour_value amount`);
  if (!/^user-stated \d{4}-\d{2}-\d{2}$/.test(String(data.internal_hour_value?.source ?? ""))) p.push(`${rel}: internal_hour_value is not marked user-stated with a date (the quote and price book hold no such figure)`);
  const table = firstTable(content);
  for (const m of b.milestones ?? []) {
    const row = table.find((r) => r.milestone === m.id);
    if (!row) { p.push(`${rel}: no row for ${m.id}`); continue; }
    const h = hours.get(m.id) ?? 0;
    if (Number(row.hours) !== h) p.push(`${rel}: ${m.id} hours ${row.hours}; the time export holds ${h} up to ${date}`);
    const share = lines.filter((l) => (m.work_packages ?? []).includes(l.package)).reduce((a, l) => a + cents(l.amount), 0);
    if (cents(row["share of fixed price"]) !== share) p.push(`${rel}: ${m.id} share ${row["share of fixed price"]}; the quote's lines for ${(m.work_packages ?? []).join(", ")} add up to ${money(share)}`);
    const burn = Math.round(h * value);
    if (cents(row.burn) !== burn) p.push(`${rel}: ${m.id} burn ${row.burn}, expected ${money(burn)} (hours × the internal hour value)`);
    const over = burn > share;
    if (over !== /over its share/i.test(row.flag ?? "")) p.push(`${rel}: ${m.id} flag "${row.flag}"; burn ${money(burn)} is ${over ? "over" : "within"} its share ${money(share)}`);
  }
  if (key.margin?.overrun && !/over its share/i.test(table.find((r) => r.milestone === key.margin.overrun)?.flag ?? "")) p.push(`${rel}: ${key.margin.overrun} runs over its share and is not flagged`);
  if (!/never a charge to the client/i.test(content)) p.push(`${rel}: does not say an overrun is never a charge to the client`);
  // The overrun stays here: no client output carries these figures (internal_numbers checks the terms).
  const figures = [...hourFigures(run, key), ...table.flatMap((r) => [r.burn])].filter((x) => x && cents(x) >= 10000 || /^\d+\.\d+$/.test(x ?? ""));
  for (const f of run.written().filter((x) => /\.(html|txt)$/.test(x))) {
    const text = run.read(f) ?? "";
    for (const fig of figures) if (new RegExp(`(?<![\\d,.])${esc(fig)}(?![\\d])`).test(text)) p.push(`${f}: carries the margin figure ${fig}`);
  }
  return p;
}

function checkDemoScript(key, run) {
  const p = [];
  const ms = key.demo.milestone;
  const rel = `${build(key)}/demos/${ms}-script.md`;
  const { data, content } = md(run, rel);
  const b = yml(run, `${build(key)}/build.yaml`);
  const m = (b.milestones ?? []).find((x) => x.id === ms);
  if (!m) return [`build.yaml: no milestone ${ms}`];
  if (data.milestone !== ms) p.push(`${rel}: milestone is ${data.milestone}`);
  if ((data.checks ?? []).join() !== (m.checks ?? []).join()) p.push(`${rel}: checks ${(data.checks ?? []).join(", ")}; ${ms} has ${(m.checks ?? []).join(", ")}`);
  if (!/user-stated/.test(String(data.demo_date ?? ""))) p.push(`${rel}: demo_date is not marked user-stated`);
  const blocks = checkBlocks(sectionText(content, "Walk-through") ? `## x\n${sectionText(content, "Walk-through")}` : "");
  for (const c of m.checks ?? []) {
    const bl = blocks.get(c);
    if (!bl) { p.push(`${rel}: no walk-through for ${c}`); continue; }
    for (const k of ["show", "test data", "working looks like", "ask"]) if (!bl.keys[k]) p.push(`${rel}: ${c} has no "${k}"`);
  }
  const not = sectionText(content, "Not in this milestone") ?? "";
  for (const other of (b.milestones ?? []).filter((x) => x.id !== ms)) for (const wp of other.work_packages ?? []) if (!not.includes(wp)) p.push(`${rel}: "Not in this milestone" does not list ${wp}`);
  if (m.status !== "ready for demo" && !key.demo.without_builder) p.push(`build.yaml: ${ms} is ${m.status}; the script follows every sprint passing`);
  return p;
}

const RESULT = /^(works|not yet|not shown)$/;
function checkDemoRecord(key, run) {
  const p = [];
  const ms = key.demo.milestone;
  const rel = `${build(key)}/demos/${ms}-record.md`;
  const { data, content } = md(run, rel);
  const b = yml(run, `${build(key)}/build.yaml`);
  const m = (b.milestones ?? []).find((x) => x.id === ms);
  const results = tableAfter(content, /^results/i) ?? [];
  for (const c of m?.checks ?? []) {
    const r = results.find((x) => x.check === c);
    if (!r) p.push(`${rel}: no result for ${c}`);
    else if (!RESULT.test(r.result)) p.push(`${rel}: ${c} result "${r.result}" is not works, not yet or not shown`);
  }
  const adj = tableAfter(content, /^requested adjustments/i) ?? [];
  for (const w of key.demo.adjustments ?? []) {
    const r = adj.find((x) => x.request.toLowerCase().includes(w.says.toLowerCase()));
    if (!r) p.push(`${rel}: the request "${w.says}" is not in Requested adjustments`);
    else if (w.class === "change" ? r.class !== "change" : !new RegExp(`^in scope \\(${esc(w.class.replace(/^in scope /, "").replace(/[()]/g, ""))}\\)$`).test(r.class)) p.push(`${rel}: "${w.says}" is classed ${r.class}, expected ${w.class}`);
  }
  // The working-demo payment: human-decided, only for the milestone the ledger names.
  const ledger = md(run, `${build(key)}/ledger.md`).data;
  const isTrigger = ledger.schedule === "40/40/20" && ledger.working_demo === ms;
  if ((data.payment_trigger === "working demo") !== isTrigger) p.push(`${rel}: payment_trigger is "${data.payment_trigger}"; the ledger's working demo is ${ledger.working_demo ?? "none"}`);
  const confirmed = /^working demo confirmed by \S.*, \d{4}-\d{2}-\d{2}: the client saw it working$|^working demo confirmed by \S+ \d{4}-\d{2}-\d{2}: the client saw it working$/.test(String(data.trigger_confirmed ?? ""));
  if (isTrigger && key.demo.confirmed === true && !confirmed) p.push(`${rel}: trigger_confirmed must read "working demo confirmed by ${key.user} <date>: the client saw it working" once the user confirms`);
  if (key.demo.confirmed === false && confirmed) p.push(`${rel}: the user did not confirm the demo, but the record marks the trigger met`);
  if (!isTrigger && confirmed) p.push(`${rel}: ${ms} is not the working-demo milestone, so no trigger is confirmed`);
  // -demo writes no ledger row and no invoice request.
  for (const f of run.written()) if (/\/ledger\.md$|\/invoices\//.test(f)) p.push(`${f}: -demo writes no ledger row and no invoice request; -invoice reads the record`);
  // The client's summary calls working only what works.
  const sum = run.read(`${build(key)}/demos/${ms}-summary.html`);
  if (sum == null) p.push(`demos/${ms}-summary.html was not written`);
  else {
    const works = results.filter((r) => r.result === "works").length;
    const mm = decode(sum.replace(/<[^>]+>/g, " ")).match(/(\d+) of (\d+) checks working/);
    if (!mm || Number(mm[1]) !== works || Number(mm[2]) !== results.length) p.push(`demos/${ms}-summary.html: must say "${works} of ${results.length} checks working"`);
  }
  return p;
}

function coFiles(run, key) {
  return run.all().filter((f) => new RegExp(`^${esc(build(key))}/changes/CO-\\d+\\.md$`).test(f));
}

/** A change order's pricing lines (internal), checked against the price book. */
function pricingProblems(run, key, rel, data, internal) {
  const p = [];
  const b = book(run);
  const units = new Map((b.units ?? []).map((u) => [u.id, u]));
  const lines = tableAfter(internal, /^pricing lines/i) ?? [];
  if (!lines.length) return [`${rel}: no "### Pricing lines" inside the internal markers`];
  let sum = 0;
  for (const l of lines) {
    const amt = cents(l.amount);
    sum += amt;
    if (l.unit === "uat.extension") {
      const rate = cents(b.uat?.extension?.per_session_or_round);
      if (cents(l["unit price"]) !== rate || amt !== rate * Number(l.qty)) p.push(`${rel}: the extension line must be qty × the price book's uat.extension rate ${money(rate)}`);
    } else if (units.has(l.unit)) {
      const u = units.get(l.unit);
      if (cents(l["unit price"]) !== cents(u.price)) p.push(`${rel}: ${l.line} unit price ${l["unit price"]} is not the price book's ${u.price} for ${l.unit}`);
      if (/^none$/i.test(l.modifier ?? "none") && amt !== cents(u.price) * Number(l.qty)) p.push(`${rel}: ${l.line} amount ${l.amount}, expected ${money(cents(u.price) * Number(l.qty))}`);
      if (!/^none$/i.test(l.modifier ?? "none") && !/evidence\.md E-\d+|the request/i.test(l.reason ?? "")) p.push(`${rel}: ${l.line} applies a modifier with no evidence cited`);
    } else if (/^(none|—|-)$/i.test(l.unit)) {
      if (!new RegExp(`^priced by ${esc(key.user)}, \\d{4}-\\d{2}-\\d{2}, reason: \\S`).test(l.reason ?? "")) p.push(`${rel}: ${l.line} has no unit and no recorded manual price ("priced by <user>, <date>, reason: …"); nothing is estimated`);
    } else p.push(`${rel}: ${l.line} unit ${l.unit} is not in the price book`);
    if (!String(l.reason ?? "").trim()) p.push(`${rel}: ${l.line} gives no reason`);
  }
  if (sum !== cents(data.price)) p.push(`${rel}: price ${data.price}; the pricing lines add up to ${money(sum)}`);
  p.push(...arithmeticProblems(rel, data.arithmetic));
  return { problems: p, lines };
}

function checkChange(key, run) {
  const p = [];
  const want = key.change;
  const reqRel = `${build(key)}/changes/requests.md`;
  const { content: rc } = md(run, reqRel);
  const rows = firstTable(rc);
  const before = run.priorRead(reqRel) ? firstTable(matter(run.priorRead(reqRel)).content) : [];
  before.forEach((r, i) => { if (JSON.stringify(rows[i]) !== JSON.stringify(r)) p.push(`${reqRel}: row ${r["#"]} was rewritten; rows are added, never rewritten`); });
  const added = rows.slice(before.length);
  if (added.length !== 1) p.push(`${reqRel}: ${added.length} rows added; one request, one row`);
  const row = added[0] ?? {};
  const newCos = run.written().filter((f) => /\/changes\/CO-\d+\.md$/.test(f) && !run.priorExists(f));
  const result = String(row.result ?? "");
  switch (want.kind) {
    case "in scope":
      if (!/^in scope \((?:WP|AC)-[\d.]+\)$/.test(String(row.class ?? ""))) p.push(`${reqRel}: the request is classed "${row.class}"; it is in scope (${want.cites})`);
      if (want.cites && !String(row.class ?? "").includes(want.cites)) p.push(`${reqRel}: the in-scope row cites ${row.class}, expected ${want.cites}`);
      if (!/^no charge; on the builder's list$/.test(result)) p.push(`${reqRel}: an in-scope request's result is "no charge; on the builder's list"`);
      if (newCos.length) p.push(`${newCos.join(", ")}: an in-scope request has no change order and no charge`);
      break;
    case "unpriced":
      if (!new RegExp(`^unpriced: no price-book unit; asked ${esc(key.user)} \\d{4}-\\d{2}-\\d{2}$`).test(result)) p.push(`${reqRel}: the result is "${result}"; with no unit it stops and asks: "unpriced: no price-book unit; asked ${key.user} <date>"`);
      if (newCos.length) p.push(`${newCos.join(", ")}: nothing is priced or written while a unit is missing`);
      break;
    case "too big": {
      if (!/^too big for a change order \(\d+ units; limit \d+\)$|^excluded: /.test(result)) p.push(`${reqRel}: the result is "${result}"; at or over the limit it is "too big for a change order (<n> units; limit <max>)"`);
      const lim = Number(book(run).quick_quote_max_units);
      const n = Number((result.match(/\((\d+) units/) ?? [])[1]);
      if (want.units != null && n !== want.units) p.push(`${reqRel}: ${n} units, expected ${want.units}`);
      if (Number.isFinite(n) && n < lim) p.push(`${reqRel}: ${n} units is under the limit ${lim}; that is a change order, not too big`);
      if (newCos.length) p.push(`${newCos.join(", ")}: a request too big for a change order gets none`);
      const last = (run.read(`${OW}STATUS.md`) ?? "").split("\n").filter(Boolean).at(-1) ?? "";
      if (want.from && !last.includes(`next: ow-build-plan on ${want.from}`)) p.push(`STATUS.md: the newest line must hand ${want.from} to ow-build-plan ("next: ow-build-plan on ${want.from}")`);
      break;
    }
    case "change":
    case "extension": {
      if (newCos.length !== 1) { p.push(`${newCos.length} change orders written; ${want.kind === "extension" ? "one client-side event is one change order" : "one request, one change order"}`); break; }
      const rel = newCos[0];
      const { data, content } = md(run, rel);
      const { client, internal, marked } = internalSplit(content);
      if (!marked) p.push(`${rel}: the internal part is not inside the ow:internal markers`);
      if (data.id !== rel.match(/(CO-\d+)\.md$/)[1]) p.push(`${rel}: id is ${data.id}`);
      if (data.kind !== want.kind) p.push(`${rel}: kind is ${data.kind}, expected ${want.kind}`);
      if (data.status !== "draft") p.push(`${rel}: status is ${data.status}; a new change order is a draft`);
      if (data.work !== "not started") p.push(`${rel}: work is "${data.work}"; nothing starts before a signed amendment`);
      if (data.payment !== "on signature") p.push(`${rel}: payment is "${data.payment}"; a change order's default is on signature`);
      if (!/^".+" \(user-stated \d{4}-\d{2}-\d{2}\)$|^.+ \(user-stated \d{4}-\d{2}-\d{2}\)$/.test(String(data.schedule_impact ?? ""))) p.push(`${rel}: schedule_impact is not recorded user-stated`);
      if (!new RegExp(`^${esc(data.id)} \\(draft\\)$`).test(result)) p.push(`${reqRel}: the row's result is "${result}", expected "${data.id} (draft)"`);
      const pr = pricingProblems(run, key, rel, data, internal);
      p.push(...(pr.problems ?? pr));
      for (const s of ["What changes", "Why", "Price", "Schedule", "Acceptance checks it adds", "Approval"]) if (sectionText(client, s) == null) p.push(`${rel}: no "## ${s}" section`);
      if (!/approved only by a signed amendment/i.test(sectionText(client, "Approval") ?? "") || !/not approval/i.test(sectionText(client, "Approval") ?? "")) p.push(`${rel}: the approval line must say only a signed amendment approves it, and a reply is not approval`);
      if (!amountRe(cents(data.price)).test(sectionText(client, "Price") ?? "")) p.push(`${rel}: "## Price" does not state ${money(cents(data.price))}`);
      const adds = checkBlocks(`## x\n${sectionText(client, "Acceptance checks it adds") ?? ""}`);
      if (want.kind === "extension") {
        if ((data.adds_checks ?? []).length || adds.size) p.push(`${rel}: an extension change order adds no acceptance checks`);
        const lines = pr.lines ?? [];
        if (lines.some((l) => l.unit !== "uat.extension")) p.push(`${rel}: an extension is priced from uat.extension only, no other unit`);
        for (const u of want.requests ?? []) if (!(data.requests ?? []).includes(u)) p.push(`${rel}: requests does not cite ${u}`);
        for (const u of want.requests ?? []) if (!(sectionText(client, "Why") ?? "").includes(u.split("/").pop().replace(/\.md$/, ""))) p.push(`${rel}: Why does not name ${u.split("/").pop().replace(/\.md$/, "")}`);
        if (want.qty != null && lines.reduce((a, l) => a + Number(l.qty), 0) !== want.qty) p.push(`${rel}: ${lines.reduce((a, l) => a + Number(l.qty), 0)} extra sessions or rounds, expected ${want.qty} (the user's answer)`);
      } else {
        if (!(data.adds_checks ?? []).length) p.push(`${rel}: a change adds at least one acceptance check`);
        for (const id of data.adds_checks ?? []) {
          if (!/^AC-CO-\d+\.\d+$/.test(id)) p.push(`${rel}: added check id ${id} is not AC-CO-nn.m`);
          const bl = adds.get(id);
          if (!bl) { p.push(`${rel}: ${id} is not written under "Acceptance checks it adds"`); continue; }
          for (const k of ["when", "then", "how we check", "test data", "cases", "kind"]) if (!bl.keys[k]) p.push(`${rel}: ${id} has no "${k}"`);
        }
        if (want.units) for (const [u, n] of Object.entries(want.units)) if ((pr.lines ?? []).filter((l) => l.unit === u).reduce((a, l) => a + Number(l.qty), 0) !== n) p.push(`${rel}: expected ${n} × ${u}`);
      }
      // The client part has no internal number; the email is the client part only.
      const pf = preflight(run.read(rel), join(ROOT, "CO.md"));
      if (pf.removedSections !== 1) p.push(`${rel}: ow-tools preflight removed ${pf.removedSections} internal sections, expected 1`);
      const html = run.read(rel.replace(/\.md$/, ".html")) ?? "";
      if (/Pricing lines|unit price|priced by/i.test(html)) p.push(`${rel.replace(/\.md$/, ".html")}: carries the internal appendix`);
      break;
    }
    default:
      p.push(`answer key: change.kind "${want.kind}" is not in scope, change, extension, unpriced or too big`);
  }
  // Never a post-acceptance mark, in any change order (ow-uat B3).
  for (const f of coFiles(run, key)) if (/post[-_ ]?acceptance/i.test(run.read(f) ?? "")) p.push(`${f}: carries a post-acceptance mark; acceptance testing decides that, never the change order`);
  if (want.from) {
    const rel = `${OW}${want.from}`;
    if (!run.exists(rel)) p.push(`${want.from}: the request file is not in the run`);
    if (run.written().includes(rel)) p.push(`${want.from}: -change rewrote the request file it reads`);
  }
  return p;
}

function checkSignatureGate(key, run) {
  const p = [];
  const id = key.gate.co;
  const rel = `${build(key)}/changes/${id}.md`;
  const { data } = md(run, rel);
  if (data.status !== "amendment out") p.push(`${rel}: status is ${data.status}; an agreement in principle (an email reply) moves it to amendment out, never to signed`);
  if (data.work !== "not started") p.push(`${rel}: work is "${data.work}"; until the amendment is signed the work is not started`);
  if (data.signature_note) p.push(`${rel}: has a signature_note with no signed amendment recorded`);
  if (!(data.history ?? []).some((h) => new RegExp(`^agreed in principle \\d{4}-\\d{2}-\\d{2}, recorded by ${esc(key.user)}; not a signature$`).test(String(h)))) p.push(`${rel}: history has no "agreed in principle <date>, recorded by ${key.user}; not a signature"`);
  const ci = `${build(key)}/changes/change-inputs-${id}.md`;
  if (!run.exists(ci)) p.push(`${ci} was not written; the amendment is drafted from it`);
  else {
    const { content } = md(run, ci);
    if (!/This is contract input for an amendment, not an amendment\./.test(content)) p.push(`${ci}: does not say it is contract input, not an amendment`);
    const say = sayOf(run, "change_order");
    const file = `builds/${key.slug}/changes/change-inputs-${id}.md`;
    const wantNext = say ? say.replace(/\{files\}/g, file) : PUBLIC_CHANGE.replace("CO-nn", id);
    const nextLine = ((sectionText(content, "Next") ?? "").split("\n").find((l) => /^\s*NEXT:/.test(l)) ?? "").replace(/^\s*NEXT:\s*/, "").replace(/\.$/, "");
    if (nextLine !== wantNext) p.push(`${ci}: the printed NEXT is "${nextLine}"; it must be exactly ${say ? "the change_order say: line" : "the public default"}: "${wantNext}"`);
  }
  // Nothing has started: no checks in spec/, no builder hand-off, no ledger row or invoice for it.
  const repo = repoOf(run, key);
  const testing = run.read(`${repo}/spec/06-testing.md`) ?? "";
  if (new RegExp(`Change order ${esc(id)}`).test(testing) || (data.adds_checks ?? []).some((c) => testing.includes(c))) p.push(`${repo}/spec/06-testing.md: carries ${id}'s checks before its amendment is signed`);
  const ledger = md(run, `${build(key)}/ledger.md`).data;
  if ((ledger.change_orders ?? []).some((c) => c.id === id)) p.push(`ledger.md: lists ${id} before it is signed`);
  if (run.exists(`${build(key)}/invoices/INV-request-${id}.md`)) p.push(`invoices/INV-request-${id}.md: an invoice for an unsigned change order`);
  // The week's update, when this run wrote one, says not started.
  for (const f of run.written().filter((x) => /\/updates\/\d{4}-\d{2}-\d{2}\.html$/.test(x))) p.push(...changeGateIn(run, key, f, run.read(f)));
  return p;
}

function checkSigned(key, run) {
  const p = [];
  const id = key.signed.co;
  const date = iso(key.signed.date);
  const rel = `${build(key)}/changes/${id}.md`;
  const { data } = md(run, rel);
  const before = priorMd(run, rel).data;
  if (before.status !== "amendment out") p.push(`${rel}: was ${before.status} before; --signed records a signature only after the agreement (amendment out)`);
  if (data.status !== "signed") p.push(`${rel}: status is ${data.status}, expected signed`);
  const note = `signed amendment received ${date}, recorded by ${key.user}; signature not verified by this skill`;
  if (data.signature_note !== note) p.push(`${rel}: signature_note must read "${note}"`);
  if (data.work !== `handed to the builder ${date}`) p.push(`${rel}: work is "${data.work}", expected "handed to the builder ${date}"`);
  const repo = repoOf(run, key);
  const tRel = `${repo}/spec/06-testing.md`;
  const was = run.priorRead(tRel) ?? "";
  const now = run.read(tRel) ?? "";
  if (data.kind === "extension") {
    if (now !== was) p.push(`${tRel}: an extension change order adds nothing to spec/`);
  } else {
    if (!now.startsWith(was.replace(/\n*$/, ""))) p.push(`${tRel}: the earlier text changed; a signed change order only appends`);
    const sec = sectionText(now, `Change order ${id} (signed ${date})`);
    if (sec == null) p.push(`${tRel}: no "## Change order ${id} (signed ${date})" section`);
    else {
      const blocks = checkBlocks(`## x\n${sec}`);
      const coBlocks = checkBlocks(`## x\n${sectionText(internalSplit(matter(run.read(rel)).content).client, "Acceptance checks it adds") ?? ""}`);
      for (const c of data.adds_checks ?? []) {
        if (!blocks.has(c)) p.push(`${tRel}: ${c} is not appended`);
        else for (const line of coBlocks.get(c)?.lines ?? []) if (!blocks.get(c).lines.includes(line)) p.push(`${tRel}: ${c} does not carry "${line}" verbatim`);
      }
    }
  }
  const last = (run.read(`${OW}STATUS.md`) ?? "").split("\n").filter(Boolean).at(-1) ?? "";
  if (!last.includes(`next: ow-build /ow-build-invoice builds/${key.slug}/`)) p.push("STATUS.md: a signed change order is invoiced on signature; the newest line must point at -invoice");
  return p;
}

/** Which triggers the run's files meet, per phase-invoice.md §1 (and the uat.yaml governing statement). */
function metTriggers(run, key, ledger) {
  const met = [];
  const ok = (rel) => run.exists(`${OW}${rel}`);
  for (const x of ledger.payments ?? []) {
    if (x.trigger === "booking") met.push({ trigger: "booking", basis: "build-request.md" });
    if (x.trigger === "working-demo") {
      const rec = run.read(`${build(key)}/demos/${ledger.working_demo}-record.md`);
      if (rec && /^working demo confirmed by /.test(String(matter(rec).data.trigger_confirmed ?? ""))) met.push({ trigger: "working-demo", basis: `demos/${ledger.working_demo}-record.md` });
    }
    if (x.trigger === "acceptance" && ok(`uat/${key.slug}/signoff.md`)) met.push({ trigger: "acceptance", basis: `uat/${key.slug}/signoff.md` });
    if (x.trigger === "delivery") {
      const dates = run.read(`${OW}handoffs/${key.slug}/dates.yaml`);
      const hd = dates ? iso(yaml.load(dates)?.handoff_date) : null;
      const bs = run.read(`${OW}uat/${key.slug}/backstop.md`);
      const bd = bs ? iso(matter(bs).data.backstop_date) : null;
      const first = [hd && { d: hd, basis: "dates.yaml" }, bd && { d: bd, basis: "backstop.md" }].filter(Boolean).sort((a, b) => a.d.localeCompare(b.d))[0];
      if (first) met.push({ trigger: "delivery", basis: first.basis, date: first.d });
    }
  }
  const doc = documentationLine(run, key);
  if (doc && run.exists(`${OW}docs/${key.slug}/delivered.md`)) met.push({ trigger: "documentation", basis: `docs/${key.slug}/delivered.md`, amount: doc.amount });
  for (const f of coFiles(run, key)) {
    const d = matter(run.read(f)).data;
    if (d.status === "signed") met.push({ trigger: d.id, basis: `changes/${d.id}.md`, amount: d.price });
  }
  return met;
}

function checkInvoice(key, run) {
  const p = [];
  const lRel = `${build(key)}/ledger.md`;
  const after = md(run, lRel).data;
  const before = priorMd(run, lRel).data;
  const q = md(run, `${plan(key)}/quote.md`).data;
  const met = metTriggers(run, key, after);
  const requested = (l) => new Set((l.payments ?? []).filter((x) => /^(requested|paid)$/.test(x.state)).map((x) => x.trigger).concat((l.change_orders ?? []).filter((c) => /^(requested|paid)$/.test(c.state)).map((c) => c.id), /^(requested|paid)$/.test(l.documentation?.state ?? "") ? ["documentation"] : []));
  const was = requested(before);
  const wantNew = met.filter((m) => !was.has(m.trigger)).map((m) => m.trigger);
  if (key.invoice?.triggers && wantNew.join() !== key.invoice.triggers.join()) p.push(`the files meet ${wantNew.join(", ") || "no new trigger"}; this case expects ${key.invoice.triggers.join(", ")}`);
  const newReqs = run.written().filter((f) => /\/invoices\/INV-request-[^/]+\.md$/.test(f) && !run.priorExists(f));
  const got = newReqs.map((f) => f.match(/INV-request-([^/]+)\.md$/)[1]);
  if (got.sort().join() !== [...wantNew].sort().join()) p.push(`invoice requests written: ${got.join(", ") || "none"}; the triggers met and not yet requested are ${wantNew.join(", ") || "none"}`);
  for (const f of newReqs) {
    const trig = f.match(/INV-request-([^/]+)\.md$/)[1];
    const { data, content } = md(run, f);
    const m = met.find((x) => x.trigger === trig);
    const row = (after.payments ?? []).find((x) => x.trigger === trig);
    const amount = row ? row.amount : m?.amount;
    if (data.trigger !== trig) p.push(`${f}: trigger is ${data.trigger}`);
    if (cents(data.amount) !== cents(amount)) p.push(`${f}: amount ${money(cents(data.amount))}; the ledger (or the change order) says ${money(cents(amount))}`);
    if (row && String(data.share) !== String(row.share)) p.push(`${f}: share ${data.share}; the ledger says ${row.share}`);
    if (Number(data.due_days) !== Number(q.payment_terms_days)) p.push(`${f}: due_days ${data.due_days}; the quote says ${q.payment_terms_days}`);
    if (data.currency !== q.currency) p.push(`${f}: currency ${data.currency}`);
    if (m && !String(data.basis ?? "").includes(m.basis.split("/").pop())) p.push(`${f}: basis "${data.basis}" does not name ${m.basis}`);
    if (!/This is a request for your invoicing tool, not an invoice\. The ledger is not an accounting record\./.test(content)) p.push(`${f}: does not say it is a request, not an invoice, and that the ledger is not an accounting record`);
    if (!amountRe(cents(data.amount)).test(content) || !new RegExp(`due within ${q.payment_terms_days} days`).test(content)) p.push(`${f}: the text does not state the amount and "due within ${q.payment_terms_days} days"`);
    p.push(...arithmeticProblems(f, data.arithmetic, row ? { total: q.fixed_price, schedule: q.schedule } : null));
    const say = sayOf(run, "invoice");
    const want = say ? say.replace(/\{files\}/g, f.slice(OW.length)) : PUBLIC_INVOICE;
    const nextLine = ((sectionText(content, "Next") ?? "").split("\n").find((l) => /^\s*NEXT:/.test(l)) ?? "").replace(/^\s*NEXT:\s*/, "").replace(/\.$/, "");
    if (nextLine !== want) p.push(`${f}: the printed NEXT is "${nextLine}"; it must be exactly ${say ? "the invoice say: line" : "the public default"}: "${want}"`);
    if (row && row.state !== "requested") p.push(`ledger.md: ${trig} is ${row.state} after its request; expected requested`);
    if (!row && trig === "documentation") {
      const d = after.documentation;
      if (!d || typeof d !== "object" || d.state !== "requested") p.push(`ledger.md: the documentation line is ${d?.state ?? d ?? "missing"} after its request; expected requested`);
      else if (cents(d.amount) !== cents(m?.amount)) p.push(`ledger.md: documentation amount ${money(cents(d.amount))}; contract-inputs.md says ${money(cents(m?.amount))}`);
    } else if (!row) {
      const co = (after.change_orders ?? []).find((c) => c.id === trig);
      if (!co) p.push(`ledger.md: the signed change order ${trig} is not in change_orders`);
      else {
        if (co.state !== "requested") p.push(`ledger.md: ${trig} is ${co.state} after its request; expected requested`);
        if (cents(co.amount) !== cents(m?.amount)) p.push(`ledger.md: ${trig} amount ${co.amount}; the change order's price is ${m?.amount}`);
        if (String(co.terms ?? "") !== "on signature") p.push(`ledger.md: ${trig} terms "${co.terms}"; the change order says on signature`);
      }
    }
    if (!(after.invoice_requests ?? []).some((r) => String(r.file ?? "").endsWith(f.split("/").pop()))) p.push(`ledger.md: no invoice_requests row for ${f.split("/").pop()}`);
  }
  if (/^(requested|paid)$/.test(before.documentation?.state ?? "") && after.documentation?.state !== before.documentation.state) p.push(`ledger.md: the documentation line moved back from ${before.documentation.state}`);
  // Only this verb writes the ledger, and a request is never repeated.
  for (const x of before.payments ?? []) {
    const y = (after.payments ?? []).find((z) => z.trigger === x.trigger);
    if (y && cents(y.amount) !== cents(x.amount)) p.push(`ledger.md: ${x.trigger}'s amount changed; it comes from the quote`);
    if (/^(requested|paid)$/.test(x.state) && y?.state !== x.state) p.push(`ledger.md: ${x.trigger} moved back from ${x.state}`);
  }
  for (const f of run.written()) if (!/\/invoices\/|\/ledger\.md$|STATUS\.md$/.test(f)) p.push(`${f}: -invoice writes invoice requests, the ledger and STATUS.md only`);
  for (const f of newReqs) if (/ready-for-uat/.test(run.read(f) ?? "")) p.push(`${f}: ready-for-uat.md is not a payment trigger`);
  return p;
}

function checkInvoiceRefused(key, run) {
  const p = [];
  for (const f of run.written()) p.push(`${f} was written; ${key.invoice_refused ?? "no new trigger is met"}, so -invoice writes nothing`);
  const l = md(run, `${build(key)}/ledger.md`).data;
  const del = (l.payments ?? []).find((x) => x.trigger === "delivery");
  if (key.invoice_refused_delivery && !/^(requested|paid)$/.test(del?.state ?? "")) p.push("ledger.md: this case starts with the delivery half already requested; the refusal case needs that state");
  return p;
}

function checkReady(key, run) {
  const p = [];
  const rel = `${build(key)}/ready-for-uat.md`;
  const { data, content } = md(run, rel);
  const b = yml(run, `${build(key)}/build.yaml`);
  const { checks } = planChecks(run, key);
  const coChecks = coFiles(run, key).flatMap((f) => { const d = matter(run.read(f)).data; return d.status === "signed" ? d.adds_checks ?? [] : []; });
  const all = [...checks.keys(), ...coChecks];
  const unsignedCo = coFiles(run, key).flatMap((f) => { const d = matter(run.read(f)).data; return d.status !== "signed" ? d.adds_checks ?? [] : []; });
  // Every milestone demoed first.
  for (const m of b.milestones ?? []) if (!run.exists(`${build(key)}/demos/${m.id}-record.md`)) p.push(`${rel}: written before ${m.id}'s demo was recorded`);
  const demoed = tableAfter(content, /^milestones demoed/i) ?? [];
  for (const m of b.milestones ?? []) if (!demoed.some((r) => r.milestone === m.id)) p.push(`${rel}: Milestones demoed has no ${m.id}`);
  const rows = tableAfter(content, /^builder's run/i) ?? [];
  for (const c of all) {
    const r = rows.find((x) => x.check === c);
    if (!r) { p.push(`${rel}: no row for ${c}`); continue; }
    if (!/^(pass|fail|not run)$/.test(r.result)) p.push(`${rel}: ${c} result "${r.result}" is not pass, fail or not run`);
    if (!/\b\d+ of \d+\b/.test(r["cases passed"] ?? "")) p.push(`${rel}: ${c} cases passed "${r["cases passed"]}" is not "<k> of <n>"`);
    const n = Number(checks.get(c)?.keys.cases);
    if (n && !new RegExp(`of ${n}\\b`).test(r["cases passed"] ?? "")) p.push(`${rel}: ${c} has ${n} cases in the plan; the row says ${r["cases passed"]}`);
    if (!r["test data"]) p.push(`${rel}: ${c} has no test data pointer`);
  }
  for (const c of unsignedCo) if (rows.some((x) => x.check === c)) p.push(`${rel}: ${c} belongs to a change order not yet signed`);
  // A check passes only with the builder's report and the user's confirmation pass both saying so.
  const confirm = run.read("session/confirmation.md") ?? "";
  for (const r of rows) {
    const s = (b.sprints ?? []).find((x) => (x.checks_passing ?? []).includes(r.check));
    const ok = new RegExp(`^- ${esc(r.check)}: pass\\b`, "m").test(confirm);
    const isCo = coChecks.includes(r.check);
    const shouldPass = ok && (isCo || Boolean(s));
    if ((r.result === "pass") !== shouldPass) p.push(`${rel}: ${r.check} is ${r.result}; the builder's report ${s || isCo ? "passes it" : "does not pass it"} and the confirmation pass says ${ok ? "pass" : "not pass"}`);
  }
  const failing = rows.filter((r) => r.result !== "pass").map((r) => r.check);
  if (key.ready?.failing && failing.join() !== key.ready.failing.join()) p.push(`${rel}: failing ${failing.join(", ") || "none"}, expected ${key.ready.failing.join(", ") || "none"}`);
  const ready = failing.length === 0;
  if (String(data.ready) !== (ready ? "yes" : "no")) p.push(`${rel}: ready is ${data.ready}; ${failing.length} check(s) do not pass`);
  if (Number(data.checks_total) !== all.length || Number(data.checks_passing) !== all.length - failing.length) p.push(`${rel}: checks_total/checks_passing ${data.checks_total}/${data.checks_passing}, expected ${all.length}/${all.length - failing.length}`);
  for (const k of ["build_label", "environment"]) if (!/\(user-stated\)$/.test(String(data[k] ?? ""))) p.push(`${rel}: ${k} is not recorded user-stated`);
  for (const s of ["Test environment", "Known issues", "Test data", "Build label", "Next"]) if (sectionText(content, s) == null) p.push(`${rel}: no "## ${s}" section`);
  const next = sectionText(content, "Next") ?? "";
  const toUat = `use ow-uat on builds/${key.slug}/ready-for-uat.md`;
  if (ready && !next.includes(toUat)) p.push(`${rel}: every check passes, so NEXT is "${toUat}"`);
  if (!ready && next.includes(toUat)) p.push(`${rel}: a failing check goes back to the builder; NEXT never hands a failing build to acceptance testing`);
  // No payment trigger and no acceptance record.
  for (const f of run.written()) if (/\/ledger\.md$|\/invoices\/|acceptance-record|signoff/.test(f)) p.push(`${f}: -ready marks no payment trigger and writes no acceptance record`);
  const last = (run.read(`${OW}STATUS.md`) ?? "").split("\n").filter(Boolean).at(-1) ?? "";
  if (ready && !last.includes(`next: ow-uat on builds/${key.slug}/ready-for-uat.md`)) p.push("STATUS.md: ready, so the newest line hands ready-for-uat.md to ow-uat");
  if (!ready && !last.includes(`next: ow-build /ow-build-ready builds/${key.slug}/`)) p.push("STATUS.md: not ready, so the newest line points back at -ready");
  return p;
}

/** Client outputs: emails, and the client parts of change orders, demo summaries and readiness. */
function clientFiles(run) {
  return run.written().filter((f) => /\.(html|txt)$/.test(f) || /\/ready-for-uat\.md$/.test(f) || /\/changes\/CO-\d+\.md$/.test(f) || /\/invoices\//.test(f) || /\/change-inputs-CO-\d+\.md$/.test(f));
}
function clientText(run, f) {
  const t = run.read(f) ?? "";
  if (f.endsWith(".md")) return internalSplit(matter(t).content).client.replace(/^## Next[\s\S]*$/m, "");
  if (f.endsWith(".html")) return decode(t.replace(/<title>[\s\S]*?<\/title>/i, "").replace(/<[^>]+>/g, " "));
  return t;
}

function checkInternalNumbers(key, run) {
  const p = [];
  const internal = internalAmounts(run, key);
  const legit = legitAmounts(run, key);
  const hours = hourFigures(run, key);
  let units = [], mods = [];
  try { const b = book(run); units = (b.units ?? []).map((u) => u.id).filter((id) => id.includes("-")); mods = (b.modifiers ?? []).map((m) => m.id); } catch { /* a broken price book is reported by the checks that price */ }
  const scan = (f, text, terms, amounts) => text.split("\n").forEach((line, i) => {
    const l = line.replace(/`[^`]*`/g, " ");
    for (const [re, what] of terms) { const m = l.match(re); if (m) p.push(`${f}:${i + 1}: carries ${what} ("${m[0].trim()}")`); }
    for (const id of [...units, ...mods]) if (new RegExp(`(?<![\\w-])${esc(id)}(?![\\w-])`).test(l)) p.push(`${f}:${i + 1}: names the price-book entry ${id}`);
    for (const c of amounts) if (amountRe(c).test(l)) p.push(`${f}:${i + 1}: carries the internal amount ${money(c)}`);
    for (const h of hours) if (new RegExp(`(?<![\\d,.])${esc(h)}(?![\\d])`).test(l)) p.push(`${f}:${i + 1}: carries the hour figure ${h}`);
  });
  // ready-for-uat.md is read by acceptance testing, not sent: it may name the builder's reports, never a number of ours.
  for (const f of clientFiles(run)) scan(f, clientText(run, f), /ready-for-uat\.md$/.test(f) ? INTERNAL_TERMS.filter(([, w]) => w !== "a tool word") : INTERNAL_TERMS, [...internal].filter((c) => !legit.has(c)));
  // spec/: no price at all, client-facing or not (§12.7).
  const all = new Set([...internal, ...legit]);
  for (const f of run.written().filter((x) => /\/spec\//.test(x))) {
    const { content } = matter(run.read(f) ?? "");
    scan(f, content.replace(/^## Sources[\s\S]*$/m, ""), [...SPEC_TERMS, ...INTERNAL_TERMS.filter(([, w]) => /margin|pricing internals|modifier factor/.test(w))], [...all]);
  }
  return p;
}

/** Nothing not passing is called done, working or ready (design §9.1), by meaning. */
function checkNoFalseDone(key, run) {
  const p = [];
  const phrases = key.not_passing ?? [];
  if (!phrases.length) return ["answer key: not_passing lists no features to watch"];
  for (const f of run.written().filter((x) => /\.(html|txt)$/.test(x) || /\/ready-for-uat\.md$/.test(x))) {
    // Prose only: a table row's result column is checked by its own check.
    for (const s of sentences(clientText(run, f).split("\n").filter((l) => !l.trim().startsWith("|")).join("\n"))) {
      for (const ph of phrases) {
        if (!new RegExp(`\\b${esc(ph)}\\b`, "i").test(s)) continue;
        const neg = s.replace(/\bnot (?:yet )?(?:done|finished|complete|working|ready|live|passing)\b|\bnot yet\b|\b\d+ of \d+ (?:acceptance )?checks (?:passing|working)\b/gi, " ");
        const m = neg.match(DONE_WORDS);
        if (m) p.push(`${f}: calls "${ph}" ${m[0]} ("${s.slice(0, 70)}"), but its check does not pass`);
      }
    }
  }
  return p;
}

function checkEmail(key, run) {
  const p = [];
  const htmls = run.written().filter((f) => f.endsWith(".html"));
  if (!htmls.length) return ["this run wrote no email"];
  for (const f of htmls) p.push(...checkEmailPair(run, f));
  return p;
}

function checkBuilderName(key, run) {
  const p = [];
  const names = builderNames(run);
  if (!names.length) return key.builder_name === "none" ? [] : ["handoffs.yaml has no builder to keep out of the files"];
  for (const f of run.written().filter((x) => TEXT.test(x))) {
    (run.read(f) ?? "").split("\n").forEach((line, i) => {
      for (const n of names) if (line.includes(n)) p.push(`${f}:${i + 1}: names the builder ("${n}"); its name and lines stay in handoffs.yaml`);
    });
  }
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
    if (!/^ow-build \d+\.\d+\.\d+$/.test(f[1])) p.push(`STATUS line ${n}: skill field is "${f[1]}"`);
    if (!w) return;
    if (f[2] !== w.path) p.push(`STATUS line ${n}: path ${f[2]}, expected ${w.path}`);
    if (f[3] !== `next: ${w.next}`) p.push(`STATUS line ${n}: "${f[3]}", expected "next: ${w.next}"`);
    if (f[4] !== `awaiting: ${w.awaiting}`) p.push(`STATUS line ${n}: "${f[4]}", expected "awaiting: ${w.awaiting}"`);
  });
  return p;
}

function checkPrivateNames(key, run) {
  const p = [];
  const names = key.private_names ?? [];
  // The user's own say: lines for destinations this skill prints into a file, filled with that file.
  const allowed = [];
  for (const f of run.written()) {
    const ci = f.match(/changes\/(change-inputs-CO-\d+\.md)$/);
    if (ci) { const s = sayOf(run, "change_order"); if (s) allowed.push(s.replace(/\{files\}/g, f.slice(OW.length))); }
    if (/\/invoices\/INV-request-/.test(f)) { const s = sayOf(run, "invoice"); if (s) allowed.push(s.replace(/\{files\}/g, f.slice(OW.length))); }
  }
  for (const rel of run.written().filter((r) => TEXT.test(r))) {
    (run.read(rel) ?? "").split("\n").forEach((line, i) => {
      for (const n of names) {
        const re = new RegExp(`(?<![\\w-])${esc(n)}(?![\\w-])`, "i");
        if (!re.test(line)) continue;
        const stripped = allowed.reduce((l, say) => l.split(say).join(" "), line);
        if (re.test(stripped)) p.push(`${rel}:${i + 1}: names "${n}"`);
      }
    });
  }
  return p;
}

/**
 * "use ow-build on <path>" and ow-build-plan's signed NEXT: the handed-over
 * file decides the verb (routing-and-resume.md §2), files first.
 */
export function expectedRoute(run, key, from) {
  const slug = from.split("/")[1];
  const b = run.priorRead(`${OW}builds/${slug}/build.yaml`);
  const started = b ? (() => { try { return yaml.load(b); } catch { return {}; } })() : null;
  if (/^plans\/[^/]+\/(?:build-request\.md)?$/.test(from)) {
    if (started && /^(OK|not applicable)/.test(String(started.map_check ?? ""))) return "folder";
    if (started) return "start";
    return run.priorExists(`${OW}plans/${slug}/build-request.md`) ? "start" : "nothing";
  }
  if (/^uat\/[^/]+\/defects\/UAT-\d+\.md$/.test(from)) {
    const t = run.read(`${OW}${from}`) ?? "";
    if (/extension requested, client cause/i.test(t) || /^class:\s*Change\b/im.test(t)) return "change";
    return /^class:\s*\S/im.test(t) ? "nothing" : "ask";
  }
  if (/^handoffs\/[^/]+\/fixes\/FIX-\d+\.md$/.test(from)) {
    const t = run.read(`${OW}${from}`) ?? "";
    if (/^class:\s*(Change|After the window)\b/im.test(t)) return "change";
    return /^class:\s*\S/im.test(t) ? "nothing" : "ask";
  }
  if (/^builds\/[^/]+\/$/.test(from)) return "folder";
  return null;
}
/** The verb a folder route picks (routing-and-resume.md 2.4), for the cases the fixtures reach. */
function folderRoute(run, key) {
  const lRel = `${build(key)}/ledger.md`;
  if (!run.priorExists(`${build(key)}/build.yaml`)) return "start";
  const ledger = priorMd(run, lRel).data;
  const prior = { ...run, read: run.priorRead, exists: run.priorExists, all: run.priorAll };
  const met = metTriggers(prior, key, ledger);
  const done = new Set((ledger.payments ?? []).filter((x) => /^(requested|paid)$/.test(x.state)).map((x) => x.trigger).concat((ledger.change_orders ?? []).filter((c) => /^(requested|paid)$/.test(c.state)).map((c) => c.id), /^(requested|paid)$/.test(ledger.documentation?.state ?? "") ? ["documentation"] : []));
  if (met.some((m) => !done.has(m.trigger))) return "invoice";
  return "other";
}

function checkRoute(key, run) {
  const p = [];
  const from = key.route.from;
  let expect = expectedRoute(run, key, from);
  if (expect === "folder") expect = folderRoute(run, key);
  if (!expect) return [`route: ${from} is not a path ow-build routes`];
  if (key.route.expect && key.route.expect !== expect) p.push(`this case expects the route "${key.route.expect}", but ${from} routes to "${expect}"`);
  const w = run.written();
  const wrote = (re) => w.some((f) => re.test(f));
  const verbFiles = {
    start: /\/build\.yaml$|\/ledger\.md$|\/spec\//,
    change: /\/changes\//,
    invoice: /\/invoices\/|\/ledger\.md$/,
  };
  if (expect === "start" && !wrote(/\/builds\/[^/]+\/build\.yaml$/)) p.push(`${from} routes to /ow-build-start, but no build.yaml was written`);
  if (expect === "change" && !wrote(/\/changes\/requests\.md$/)) p.push(`${from} routes to /ow-build-change, but changes/requests.md gained no row`);
  if (expect === "invoice" && !wrote(/\/invoices\//)) p.push(`${from} routes to /ow-build-invoice, but no invoice request was written`);
  if (expect === "nothing" || expect === "ask") for (const f of w) p.push(`${f}: ${from} ${expect === "nothing" ? "is not this skill's to run" : "needs the user's answer first"}; the route writes nothing`);
  for (const [verb, re] of Object.entries(verbFiles)) {
    if (verb === expect) continue;
    for (const f of w) if (re.test(f) && !(verbFiles[expect]?.test(f))) p.push(`${f}: written by ${verb}, but ${from} routes to ${expect}`);
  }
  for (const f of w) if (/\/updates\/|\/demos\/|ready-for-uat/.test(f)) p.push(`${f}: a route runs one verb; this file belongs to another`);
  return p;
}

const CHECKS = {
  route: checkRoute,
  headers: checkHeaders,
  start: checkStart,
  start_stopped: checkStartStopped,
  spec: checkSpec,
  no_spec: checkNoSpec,
  ledger: checkLedger,
  run: checkRun,
  update: checkUpdate,
  margin: checkMargin,
  demo_script: checkDemoScript,
  demo_record: checkDemoRecord,
  change: checkChange,
  signature_gate: checkSignatureGate,
  signed: checkSigned,
  invoice: checkInvoice,
  invoice_refused: checkInvoiceRefused,
  ready: checkReady,
  email: checkEmail,
  internal_numbers: checkInternalNumbers,
  no_false_done: checkNoFalseDone,
  builder_name: checkBuilderName,
  status: checkStatus,
  private_names: checkPrivateNames,
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
  } catch (e) {
    return key.checks.map((check) => ({ check, problems: [`run could not be read: ${reason(e)}`] }));
  }
  return key.checks.map((check) => {
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
  mkdirSync(join(dir, "opchain-work"), { recursive: true });
  for (const [rel, src] of Object.entries(SHARED)) cpSync(src, join(dir, rel));
  // Oldest first, so newer layers win; this case's own builder/ files are what the builder writes in the session.
  const layers = priorLayers(home).filter((l) => l.dir !== join(FIXTURES, home, "builder"));
  for (const l of [...layers].reverse()) if (existsSync(l.dir)) cpSync(l.dir, join(dir, l.mount), { recursive: true });
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
      console.log(`Prepared ${work}. Attach ${resolve(args[2])} to a session with ow-build installed and follow tests/fixtures/ow-build/README.md for "${key.case}" (${key.section}).`);
      console.log(`Then: node scripts/ow-build-acceptance.mjs ${args[1]} ${resolve(args[2])}`);
    } else if (args.length === 2) {
      process.exit(report(args[0], runCase(args[0], resolve(args[1]))) ? 1 : 0);
    } else {
      let failed = 0;
      for (const c of listCases()) failed += report(`${c} (golden run)`, runCase(c)) ? 1 : 0;
      process.exit(failed ? 1 : 0);
    }
  } catch (e) {
    console.error(`ow-build-acceptance: ${reason(e)}`);
    process.exit(2);
  }
}
