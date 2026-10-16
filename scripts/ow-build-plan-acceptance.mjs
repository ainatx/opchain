#!/usr/bin/env node
// ow-build-plan acceptance checks (docs/plans/2026-10-06-ow-build-plan-design.md §9.2).
//
// ow-build-plan is a text-only skill: a model runs it, so these checks cannot
// run the skill. They read what a run wrote (its opchain-work/ folder) and test
// it against an answer key and the price book, mechanically. One check per
// design rule:
//
//   headers           the protocol's artefact header on each output
//   offer             fee, weeks, credit and validity match the tier in the price book
//   start             tier, weeks and dates from the price book and profile; every LOW/UNKNOWN fact and
//                     every unasked must-ask becomes a collection request
//   follow_on         a FIX-nn.md request is the intake beside the earlier plan; without one, the user's words
//   plan_checks       acceptance coverage, out of scope present, risk owners, evidence trace
//   credentials       a read-only key used in the session appears in no file; the access is logged
//   builder_neutral   the assembled plan names no price, no price-book unit and no wording from these skills
//   unpriced          every package maps to price-book units or a recorded manual price; nothing estimated
//   modifiers         every modifier cites an evidence row that shows its condition
//   dates_terms       validity, credit deadline, payment split above/below the threshold, due days
//   uat_lines         the testing line for the build's size, the per-role add-on, the declinable training line
//   internal_appendix the internal appendix inside the ow:internal markers; the ow-tools preflight strips it
//   fix_window        "<N> days of fixes" from offers.md in quote.md and contract-inputs.md
//   accepted          contract-inputs.md as the schema says, with the contract NEXT
//   signed            build-request.md only after acceptance, with no prices and the build NEXT
//   signed_refusal    --signed before --accepted writes nothing
//   quick             a small job: quick scope and quote, no map; tester roles by role only
//   quick_refusal     a job over quick_quote_max_units: no quote, a Build Plan recommended
//   status            STATUS.md lines appended, never rewritten
//   private_names     no private skill or business name in anything the run wrote, except the user's
//                     own handoffs.yaml say: line printed exactly
//
// Each check runs on its own: a malformed file fails the checks that need it,
// with a one-line reason, and every other check still runs and reports.
//
// Fixtures live in tests/fixtures/ow-build-plan/<case>/ (all invented). A case's
// starting state is layered: its own input/, then the run of its `base:` case,
// then (via `ow_start:`) an ow-start golden run, then the shared workspace and
// the skill's shipped examples. expected/ is the hand-written golden run. A case
// with `run: <case>` grades that case's run against its own answer key.
//
//   node scripts/ow-build-plan-acceptance.mjs                        # every case against its golden run
//   node scripts/ow-build-plan-acceptance.mjs <case> <run-dir>       # one case against a real run
//   node scripts/ow-build-plan-acceptance.mjs --prepare <case> <dir> # set up a folder to run the skill in
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";
import { matter } from "./lib/frontmatter.mjs";
import { preflight } from "../plugins/ow-tools/lib/preflight.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const FIXTURES = join(ROOT, "tests", "fixtures", "ow-build-plan");
const OW_START_FIXTURES = join(ROOT, "tests", "fixtures", "ow-start");
const EXAMPLES = join(ROOT, "skills-work", "ow-build-plan", "examples");
const WORKSPACE = join(FIXTURES, "workspace", "opchain-work");
const TEXT = /\.(md|ya?ml|txt|json|csv)$/;
const CLOCKS = /^(tool|host-supplied|user-stated|assumed)$/;
const TIERS = ["one_system", "two_systems", "three_plus_or_mvp"];
const SIZES = ["S", "M", "L"];
const FRAGMENT = 8; // characters of a credential in a row that count as "a part of one"
const PUBLIC_CONTRACT = "send contract-inputs.md to whoever drafts your contracts, or fill your own SOW template from it";
const PUBLIC_BUILD = "give build-request.md to whoever builds it";
/**
 * A Build Plan credit, by meaning (eval round 4, N4): the credit line, a paraphrase
 * ("the planning fee is deducted"), or the Build Plan fee named at all.
 */
const CREDIT_WORDS = /Build Plan (?:credit|fee)|\bcredit(?:s|ed|ing)? (?:against|towards?|to|on)\b|\b(?:planning|plan) fee\b|\bdeduct(?:s|ed|ing|ion)?\b|\boffset(?:s|ting)? against\b|\bcount(?:s|ed)? (?:towards?|against)\b/i;
const normWords = (t) => String(t ?? "").replace(/\s+/g, " ").trim().toLowerCase();

// ── small helpers ────────────────────────────────────────────────────────────

const reason = (e) => String(e?.message ?? e).split("\n")[0].trim();
const iso = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? v : String(v).trim());
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const cents = (v) => Math.round(Number(String(v).replace(/,/g, "")) * 100);
const money = (c) => (c / 100).toFixed(2);
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function addDays(date, n) {
  const d = new Date(`${iso(date)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function addBusinessDays(date, n, holidays = []) {
  const skip = new Set(holidays.map(iso));
  let d = iso(date);
  for (let left = n; left > 0;) {
    d = addDays(d, 1);
    const wd = new Date(`${d}T00:00:00Z`).getUTCDay();
    if (wd !== 0 && wd !== 6 && !skip.has(d)) left--;
  }
  return d;
}
export const written = (date) => {
  const [y, m, d] = iso(date).split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};
/** 2250 -> a pattern for "2,250.00", "2250.00", "2,250" or "2250". */
const amountRe = (c) => {
  const whole = Math.floor(c / 100);
  const grouped = whole.toLocaleString("en-US");
  const dec = String(c % 100).padStart(2, "0");
  const w = [...new Set([grouped, String(whole)])].map(esc).join("|");
  return new RegExp(`(?<![\\d,.])(?:${w})${c % 100 ? `\\.${dec}` : `(?:\\.${dec})?`}(?![\\d])`);
};
/** 17450.00 -> patterns for "17k", "17.5k", "17.45k", "17 thousand". */
function shorthand(c) {
  const k = c / 100000;
  const forms = new Set([Math.floor(k), Math.round(k), Number(k.toFixed(1)), Number(k.toFixed(2))].map(String));
  return [...forms].map((f) => new RegExp(`(?<![\\d.])${esc(f)}\\s?(?:k|K|thousand)\\b`));
}

export function split(totalCents, schedule) {
  const pct = schedule.split("/").map(Number);
  const shares = pct.map((p) => Math.floor((totalCents * p) / 100));
  shares[shares.length - 1] += totalCents - shares.reduce((a, b) => a + b, 0);
  return shares;
}

/** Markdown sections by heading text (any level), keeping the raw lines. */
function sections(content, level = 2) {
  const out = new Map();
  let cur = null;
  const re = new RegExp(`^${"#".repeat(level)}\\s+(.+?)\\s*$`);
  let fenced = false;
  for (const line of content.split("\n")) {
    if (/^\s*```/.test(line)) fenced = !fenced;
    if (fenced || /^\s*```/.test(line)) { if (cur) out.get(cur).push(line); continue; }
    const h = line.match(re);
    if (h) { cur = h[1].trim(); out.set(cur, []); continue; }
    if (cur && new RegExp(`^#{1,${level - 1}}\\s`).test(line)) cur = null;
    if (cur) out.get(cur).push(line);
  }
  return out;
}
const sectionText = (content, name, level = 2) => {
  for (const [k, v] of sections(content, level)) if (k.toLowerCase().startsWith(name.toLowerCase())) return v.join("\n");
  return null;
};
/** Rows of the first table after a heading (any level) matching `heading`. */
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
/** `### ID` blocks with `- key: value` lines. */
function keyedBlocks(content, idRe) {
  const out = new Map();
  let cur = null;
  for (const line of content.split("\n")) {
    const h = line.match(/^###\s+(\S+)(?:\s+(.*))?$/);
    if (h) { cur = idRe.test(h[1]) ? { id: h[1], title: (h[2] ?? "").trim(), keys: {} } : null; if (cur) out.set(cur.id, cur); continue; }
    if (/^#{1,2}\s/.test(line)) { cur = null; continue; }
    const kv = cur && line.match(/^-\s+([a-z][a-z ]*):\s*(.*)$/i);
    if (kv) cur.keys[kv[1].trim().toLowerCase()] = kv[2].trim();
  }
  return out;
}
/** `- [HIGH E-01, E-09] text` fact lines. */
function factLines(content) {
  const out = [];
  content.split("\n").forEach((line, i) => {
    const m = line.match(/^\s*(?:-|\d+\.)\s+\[(HIGH|MEDIUM|LOW|UNKNOWN)([^\]]*)\]\s*(.*)$/);
    if (m) out.push({ line: i + 1, confidence: m[1], cites: [...m[2].matchAll(/E-\d+/g)].map((x) => x[0]), text: m[3] });
  });
  return out;
}

// ── the run: layered files ───────────────────────────────────────────────────

export function loadKey(caseDir) {
  return yaml.load(readFileSync(join(caseDir, "answer-key.yaml"), "utf8"));
}

function walk(dir, base = dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p, base) : [relative(base, p)];
  });
}

/** Layers (directories holding opchain-work contents), newest first, for a case's starting state. */
function priorLayers(caseName, seen = new Set()) {
  if (seen.has(caseName)) throw new Error(`base cycle at ${caseName}`);
  seen.add(caseName);
  const dir = join(FIXTURES, caseName);
  const key = loadKey(dir);
  if (key.run) return priorLayers(key.run, seen);
  const layers = [join(dir, "input", "opchain-work")];
  if (key.base) layers.push(...runLayers(key.base, seen));
  if (key.ow_start) layers.push(join(OW_START_FIXTURES, key.ow_start, "expected", "opchain-work"), join(OW_START_FIXTURES, key.ow_start, "input", "opchain-work"));
  return layers;
}
function runLayers(caseName, seen = new Set()) {
  const dir = join(FIXTURES, caseName);
  const key = loadKey(dir);
  if (key.run) return runLayers(key.run, seen);
  return [join(dir, "expected", "opchain-work"), ...priorLayers(caseName, seen)];
}
const SHIPPED = { "price-book.yaml": join(WORKSPACE, "price-book.yaml"), "profile.md": join(WORKSPACE, "profile.md"), "offers.md": join(EXAMPLES, "offers.md"), "handoffs.yaml": join(EXAMPLES, "handoffs.yaml") };

/** The case whose folder holds the run (follows `run:`). */
function owner(caseName) {
  const key = loadKey(join(FIXTURES, caseName));
  return key.run ? owner(key.run) : caseName;
}

/**
 * A view of a run: read(rel) finds a file in the run (or, for a golden run, in the
 * layers under it); written lists what the run itself wrote.
 */
export function runView(caseName, runDir = null) {
  const home = owner(caseName);
  const prior = [...priorLayers(home)];
  const layers = runDir ? [join(runDir, "opchain-work")] : [join(FIXTURES, home, "expected", "opchain-work"), ...prior];
  const find = (rel) => {
    for (const l of layers) if (existsSync(join(l, rel))) return join(l, rel);
    if (!runDir && SHIPPED[rel] && existsSync(SHIPPED[rel])) return SHIPPED[rel];
    return null;
  };
  const priorFind = (rel) => {
    for (const l of prior) if (existsSync(join(l, rel))) return join(l, rel);
    return SHIPPED[rel] && existsSync(SHIPPED[rel]) ? SHIPPED[rel] : null;
  };
  const all = () => {
    const seen = new Set();
    for (const l of layers) for (const r of walk(l)) seen.add(r);
    return [...seen].sort();
  };
  const writtenFiles = () => {
    if (!runDir) return walk(join(FIXTURES, home, "expected", "opchain-work")).sort();
    // A real run: everything in the folder that is not an unchanged starting file.
    return walk(join(runDir, "opchain-work")).filter((r) => {
      const p = priorFind(r);
      return !p || !readFileSync(p).equals(readFileSync(join(runDir, "opchain-work", r)));
    }).sort();
  };
  const cache = new Map();
  const read = (rel) => {
    if (cache.has(rel)) return cache.get(rel);
    const p = find(rel);
    const v = p ? readFileSync(p, "utf8") : null;
    cache.set(rel, v);
    return v;
  };
  return { home, read, exists: (rel) => find(rel) != null, all, written: writtenFiles, path: find, priorRead: (rel) => { const p = priorFind(rel); return p ? readFileSync(p, "utf8") : null; } };
}

/** Parse a file once; throws a one-line reason the calling check reports. */
function parsed(run, rel, kind) {
  const text = run.read(rel);
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
const book = (run) => parsed(run, "price-book.yaml", "yaml");
const profile = (run) => parsed(run, "profile.md", "md").data;
const plansDir = (key) => `plans/${key.slug}`;

/** offers.md: the yaml block under `## after_handoff`, and contract_clauses if uncommented. */
function offers(run) {
  const text = run.read("offers.md");
  if (text == null) throw new Error("offers.md is missing");
  const block = (name) => {
    const sec = sectionText(text, name);
    const m = sec?.match(/```ya?ml\n([\s\S]*?)```/);
    // A block of comments only (the shipped empty contract_clauses) holds nothing.
    if (!m || m[1].split("\n").every((l) => !l.trim() || l.trim().startsWith("#"))) return null;
    try {
      return yaml.load(m[1]);
    } catch (e) {
      throw new Error(`offers.md: the ${name} block is not valid YAML (${reason(e)})`);
    }
  };
  return { after: block("after_handoff") ?? {}, clauses: block("contract_clauses"), ownership: sectionText(text, "ownership") };
}
function handoffSay(run, dest) {
  const text = run.read("handoffs.yaml");
  if (!text) return null;
  let doc;
  try { doc = yaml.load(text); } catch (e) { throw new Error(`handoffs.yaml: not valid YAML (${reason(e)})`); }
  const d = doc?.[dest];
  return d && typeof d === "object" && typeof d.say === "string" ? d.say : null;
}

// ── checks ───────────────────────────────────────────────────────────────────

function checkHeaders(key, run) {
  const p = [];
  for (const rel of key.outputs ?? []) {
    let data;
    try {
      data = rel.endsWith(".yaml") ? parsed(run, rel, "yaml") : parsed(run, rel, "md").data;
    } catch (e) { p.push(reason(e)); continue; }
    const name = rel.split("/").pop().replace(/\.(md|ya?ml)$/, "");
    const want = rel.includes("/map/") ? `ow-build-plan/map-${name}` : `ow-build-plan/${name}`;
    if (data.ow_artefact !== want) p.push(`${rel}: ow_artefact is ${data.ow_artefact}, expected ${want}`);
    if (String(data.schema) !== "1") p.push(`${rel}: schema is ${data.schema}, expected 1`);
    if (!/^ow-build-plan \d+\.\d+\.\d+ \(protocol 1\)$/.test(data.written_by ?? "")) p.push(`${rel}: written_by is "${data.written_by}"`);
    if (data.workstream !== (key.workstream ?? key.slug)) p.push(`${rel}: workstream is ${data.workstream}, expected ${key.workstream ?? key.slug}`);
    if (!data.subject) p.push(`${rel}: subject is missing`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso(data.created) ?? "")) p.push(`${rel}: created "${iso(data.created)}" is not a YYYY-MM-DD date`);
    if (!CLOCKS.test(data.clock ?? "")) p.push(`${rel}: clock "${data.clock}" is not tool, host-supplied, user-stated or assumed`);
    if (data.origin !== "skill") p.push(`${rel}: origin is "${data.origin}", expected skill`);
  }
  return p;
}

function checkOffer(key, run) {
  const p = [];
  const rel = `${plansDir(key)}/build-plan-offer.md`;
  const { data, content } = parsed(run, rel, "md");
  const b = book(run);
  const tier = key.offer.tier;
  if (data.tier !== tier) p.push(`${rel}: tier is ${data.tier}, expected ${tier}`);
  if (cents(data.fee) !== cents(b.build_plan_fees?.[tier])) p.push(`${rel}: fee ${data.fee} is not build_plan_fees.${tier} (${b.build_plan_fees?.[tier]})`);
  if (Number(data.weeks) !== Number(b.build_plan_weeks?.[tier])) p.push(`${rel}: weeks ${data.weeks} is not build_plan_weeks.${tier} (${b.build_plan_weeks?.[tier]})`);
  if (Number(data.credit_days) !== Number(b.build_plan_credit_days)) p.push(`${rel}: credit_days ${data.credit_days} is not build_plan_credit_days (${b.build_plan_credit_days})`);
  if (Number(data.payment_terms_days) !== Number(b.payment_terms_days)) p.push(`${rel}: payment_terms_days ${data.payment_terms_days} is not the price book's ${b.payment_terms_days}`);
  if (data.currency !== b.currency) p.push(`${rel}: currency ${data.currency} is not the price book's ${b.currency}`);
  const valid = addDays(data.issued, Number(b.quote_validity_days));
  if (iso(data.valid_until) !== valid) p.push(`${rel}: valid_until ${iso(data.valid_until)}, expected issued + ${b.quote_validity_days} days = ${valid}`);
  if (key.offer.issued && iso(data.issued) !== iso(key.offer.issued)) p.push(`${rel}: issued ${iso(data.issued)}, expected ${iso(key.offer.issued)}`);
  if (!content.includes(written(valid))) p.push(`${rel}: the offer does not say it is valid until ${written(valid)}`);
  if (!amountRe(cents(b.build_plan_fees?.[tier])).test(content)) p.push(`${rel}: the offer text does not state the fee`);
  if (!new RegExp(`\\b${b.build_plan_credit_days} days\\b`).test(content)) p.push(`${rel}: the offer text does not state the ${b.build_plan_credit_days}-day credit`);
  for (const s of ["What you get", "How long", "Fee", "Credit", "Valid until"]) if (sectionText(content, s) == null) p.push(`${rel}: no "## ${s}" section`);
  // A follow-on stated in the user's words: the offer records the request and names it as its subject.
  if (key.offer.request) {
    if (data.subject !== key.offer.request) p.push(`${rel}: subject is ${data.subject}; a follow-on offer names the request it was made from (${key.offer.request})`);
    if (!run.written().includes(key.offer.request)) p.push(`${key.offer.request} was not written; the offer records a stated follow-on request before it is offered`);
    else p.push(...requestProblems(run, key.offer.request, key.offer.request_words));
  }
  return p;
}

/**
 * A follow-on request in the user's words (plans/<client>-<n>/request.md): the
 * ow-build-plan/request header with origin: user, stated_by and stated_on (eval
 * round 3, A16), and, when the answer key records them, the user's own words
 * unchanged (A13: a paraphrase is not the request).
 */
function requestProblems(run, rel, words) {
  const p = [];
  const req = parsed(run, rel, "md");
  const d = req.data;
  if (d.ow_artefact !== "ow-build-plan/request" || d.origin !== "user" || !d.stated_by || !req.content.trim()) p.push(`${rel}: needs the ow-build-plan/request header (origin: user, stated_by) and the user's words`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso(d.stated_on) ?? "")) p.push(`${rel}: stated_on "${iso(d.stated_on) ?? ""}" is not the YYYY-MM-DD date the user stated the request`);
  if (words) {
    const body = req.content.replace(/^#[^\n]*\n/m, "");
    if (!normWords(body).includes(normWords(words))) p.push(`${rel}: does not hold the user's words unchanged ("${String(words).slice(0, 50)}…"); the request is recorded as said, never summarised`);
  }
  return p;
}

/** Intake facts below MEDIUM (LOW or UNKNOWN), and must-asks not asked or partly asked. */
function openIntake(run, intakeDir) {
  const record = run.read(`${intakeDir}/intake-record.md`);
  const facts = [];
  if (record) {
    const { content } = matter(record);
    let id = null;
    for (const line of content.split("\n")) {
      const h = line.match(/^###\s+([a-z_]+\.\d+)\s*$/);
      if (h) { id = h[1]; continue; }
      const c = id && line.match(/^-\s+confidence:\s*(\w+)/);
      if (c && /^(LOW|UNKNOWN)$/.test(c[1]) && !id.startsWith("promised_by_user")) facts.push(id);
    }
  }
  const coverage = run.read(`${intakeDir}/coverage.md`);
  const asks = coverage ? (tableAfter(matter(coverage).content, /^must-asks/i) ?? []).filter((r) => /^(not asked|partly)$/.test(r.status)).map((r) => `must-ask:${r.field}`) : [];
  return [...facts, ...asks];
}

function checkStart(key, run) {
  const p = [];
  const dir = plansDir(key);
  const plan = parsed(run, `${dir}/plan.yaml`, "yaml");
  const b = book(run);
  const holidays = (profile(run).holidays ?? []).map(iso);
  const want = key.start;
  if (plan.tier !== want.tier) p.push(`plan.yaml: tier is ${plan.tier}, expected ${want.tier}`);
  if (!TIERS.includes(plan.tier)) p.push(`plan.yaml: tier ${plan.tier} is not one of ${TIERS.join(", ")}`);
  // Where the tier came from (eval round 3, A8): an offer only when there is one.
  if (!["offer", "recap", "user-stated"].includes(plan.tier_source)) p.push(`plan.yaml: tier_source is ${plan.tier_source}, not offer, recap or user-stated`);
  else if (plan.tier_source === "offer" && !run.exists(`${dir}/build-plan-offer.md`)) p.push(`plan.yaml: tier_source is offer, but ${dir}/ holds no build-plan-offer.md (signed work has no offer; the tier comes from the recap or the user)`);
  if (want.tier_source && plan.tier_source !== want.tier_source) p.push(`plan.yaml: tier_source is ${plan.tier_source}, expected ${want.tier_source}`);
  // Never -start over an existing plan (eval round 4, new 8), however -start was reached.
  if (run.priorRead(`${dir}/plan.yaml`) != null && run.written().includes(`${dir}/plan.yaml`)) p.push(`${dir}/plan.yaml: -start wrote over an existing plan; a folder with a plan resumes at its next step, and a second plan is a follow-on`);
  const weeks = Number(b.build_plan_weeks?.[plan.tier]);
  if (Number(plan.weeks) !== weeks) p.push(`plan.yaml: weeks ${plan.weeks} is not build_plan_weeks.${plan.tier} (${weeks})`);
  if (want.fee === "none") { if (plan.fee !== "none") p.push(`plan.yaml: fee is ${plan.fee}; work already signed has no Build Plan fee (fee: none)`); }
  else if (want.fee !== undefined && cents(plan.fee) !== cents(want.fee)) p.push(`plan.yaml: fee ${plan.fee}, expected ${want.fee}`);
  if (iso(plan.start) !== iso(want.start)) p.push(`plan.yaml: start ${iso(plan.start)}, expected ${iso(want.start)}`);
  // The deadlines are the user's: build_plan_schedule.<tier> in the price book, or stated by the user.
  const sched = b.build_plan_schedule?.[plan.tier];
  let cDays, dDays;
  if (sched) {
    if (plan.schedule_source !== "price-book") p.push(`plan.yaml: schedule_source is ${plan.schedule_source}; the price book has build_plan_schedule.${plan.tier}`);
    cDays = Number(sched.collection_business_days); dDays = Number(sched.delivery_business_days);
  } else {
    if (plan.schedule_source !== "user-stated") p.push(`plan.yaml: the price book has no build_plan_schedule.${plan.tier}, so schedule_source must be user-stated`);
    cDays = Number(plan.collection_business_days); dDays = Number(plan.delivery_business_days);
    if (!(cDays > 0 && dDays > 0)) p.push("plan.yaml: a user-stated schedule records collection_business_days and delivery_business_days");
  }
  if (Number(plan.collection_business_days) !== cDays || Number(plan.delivery_business_days) !== dDays) p.push(`plan.yaml: collection/delivery business days ${plan.collection_business_days}/${plan.delivery_business_days}, expected ${cDays}/${dDays}`);
  const collect = addBusinessDays(plan.start, cDays, holidays);
  const deliver = addBusinessDays(plan.start, dDays, holidays);
  if (iso(plan.collection_deadline) !== collect) p.push(`plan.yaml: collection_deadline ${iso(plan.collection_deadline)}, expected start + ${cDays} business days = ${collect}`);
  if (iso(plan.plan_delivery) !== deliver) p.push(`plan.yaml: plan_delivery ${iso(plan.plan_delivery)}, expected start + ${dDays} business days = ${deliver}`);
  if (want.intake && plan.intake !== want.intake) p.push(`plan.yaml: intake is "${plan.intake}", expected "${want.intake}"`);
  // The collection list.
  const { data, content } = parsed(run, `${dir}/collection.md`, "md");
  const covers = new Set(Object.values(data.covers ?? {}).flat().map(String));
  if (want.intake_dir) {
    for (const id of openIntake(run, want.intake_dir)) if (!covers.has(id)) p.push(`collection.md: ${id} is open in the intake but no request covers it`);
  }
  for (const s of ["Send us", "Access we ask for (read-only)", "Workshops"]) if (sectionText(content, s) == null) p.push(`collection.md: no "## ${s}" section`);
  if (!content.includes(written(collect))) p.push(`collection.md: does not ask for the material by ${written(collect)}`);
  const body = content.split("\n");
  body.forEach((l, i) => {
    if (/\b(HIGH|MEDIUM|LOW|UNKNOWN)\b|\b[a-z_]+\.\d+\b|\bE-\d+\b/.test(l)) p.push(`collection.md:${i + 1}: client text carries a confidence label, fact id or evidence id`);
  });
  return p;
}

function checkFollowOn(key, run) {
  const p = [];
  const dir = plansDir(key);
  const want = key.follow_on;
  // One follow-on folder: no plan.yaml written into any other plans/<client>-<n>/ (eval round 2, N20b).
  const client = want.follows.split("/")[1];
  for (const f of run.written()) {
    const m = f.match(new RegExp(`^plans/(${esc(client)}-\\d+)/plan\\.yaml$`));
    if (m && `plans/${m[1]}` !== dir) p.push(`${f}: the follow-on plan was written in plans/${m[1]}/, but its offer and request are in ${dir}/; one follow-on, one folder`);
  }
  const plan = parsed(run, `${dir}/plan.yaml`, "yaml");
  if (plan.follows !== want.follows) p.push(`plan.yaml: follows is "${plan.follows}", expected "${want.follows}"`);
  if (!run.exists(`${want.follows}plan.yaml`)) p.push(`the earlier plan ${want.follows}plan.yaml is not beside the follow-on`);
  for (const f of run.written()) if (f.startsWith(want.follows)) p.push(`${f}: the follow-on wrote into the earlier plan; it reads it for context only`);
  // The intake: a FIX file, the request.md its offer recorded, or (no offer) the user's words.
  const intake = want.fix ?? want.request ?? null;
  const offerRel = `${dir}/build-plan-offer.md`;
  if (run.exists(offerRel)) {
    const subject = parsed(run, offerRel, "md").data.subject;
    if (subject !== intake) p.push(`${offerRel}: its subject is ${subject}, but this plan's intake is ${intake ?? "the user's words"}; the offer and the plan must share one folder and one request`);
  } else if (want.request) p.push(`${offerRel} is missing; a request.md comes from the follow-on offer in the same folder`);
  if (intake) {
    if (plan.intake !== intake) p.push(`plan.yaml: intake is "${plan.intake}", expected ${intake}`);
    if (!run.exists(intake)) p.push(`${intake} does not exist in the run`);
    if (want.request) {
      if (String(plan.request ?? "").trim()) p.push("plan.yaml: records the request again; with request.md from the offer, -start does not ask for it");
      if (run.written().includes(want.request)) p.push(`${want.request}: rewritten by the start; the offer wrote it and -start only reads it`);
      p.push(...requestProblems(run, want.request, want.request_words));
    }
  } else {
    if (!/^stated by \S.*, \d{4}-\d{2}-\d{2}$/.test(String(plan.intake ?? ""))) p.push(`plan.yaml: intake is "${plan.intake}"; with no FIX file and no offer it must be "stated by <user>, <date>"`);
    if (!String(plan.request ?? "").trim()) p.push("plan.yaml: no request recorded in the user's words");
    for (const f of run.written()) if (/FIX-\d+/.test(run.read(f) ?? "")) p.push(`${f}: names a FIX file, but there is none for this follow-on`);
  }
  return p;
}

/**
 * A quote is written once (eval round 2, new bug 2): once it has been exported or
 * accepted, a run never writes quote.md or quote-items.json again. 1.0.0 has no
 * revised quotes (owner decision 2026-10-15): a second quote file fails too.
 */
function checkQuoteFrozen(key, run) {
  const p = [];
  const dir = plansDir(key);
  const before = run.priorRead(`${dir}/quote.md`);
  if (before == null) return [`this case starts with no ${dir}/quote.md to keep`];
  const exported = (run.priorRead("STATUS.md") ?? "").split("\n").some((l) => l.includes(`${dir}/export/`)) || run.priorRead(`${dir}/export/export-report.md`) != null;
  const accepted = run.priorRead(`${dir}/contract-inputs.md`) != null;
  if (!exported && !accepted) return ["this case's quote was neither exported nor accepted before the run"];
  for (const f of ["quote.md", "quote-items.json"]) if (run.written().includes(`${dir}/${f}`)) p.push(`${dir}/${f} was rewritten after the quote was ${accepted ? "accepted" : "exported"}; a quote is written once`);
  p.push(...secondQuotes(run, dir));
  return p;
}

/**
 * No second quote file: a different quote is a new Build Plan or follow-on. Any
 * file in the folder named like a quote (quote-r2.md, quote-v2.md, revised-quote.md)
 * other than the one quote, its items and their exports is a second quote (eval
 * round 4, N14).
 */
const ONE_QUOTE = /^(?:quote\.md|quote-items\.json|export\/quote\.(?:pdf|docx))$/;
function secondQuotes(run, dir) {
  return run.written()
    .filter((f) => f.startsWith(`${dir}/`) && /quote/i.test(f.split("/").pop()) && !ONE_QUOTE.test(f.slice(dir.length + 1)))
    .map((f) => `${f}: a second quote file; 1.0.0 has one quote per folder (a different quote is a new Build Plan or follow-on)`);
}

function evidenceIds(run, dir) {
  const ev = run.read(`${dir}/evidence.md`);
  if (ev == null) throw new Error(`${dir}/evidence.md was not written`);
  const rows = tableAfter(matter(ev).content, /^register/i) ?? [];
  return new Map(rows.map((r) => [r.id, r]));
}

function checkPlan(key, run) {
  const p = [];
  const dir = plansDir(key);
  const ev = evidenceIds(run, dir);
  // Evidence trace over the map and the scope.
  for (const f of ["current", "future", "roles", "systems", "data"]) {
    const rel = `${dir}/map/${f}.md`;
    const text = run.read(rel);
    if (text == null) { p.push(`${rel} was not written`); continue; }
    for (const fl of factLines(matter(text).content)) {
      if ((fl.confidence === "HIGH" || fl.confidence === "MEDIUM") && !fl.cites.length) p.push(`${rel}: a ${fl.confidence} fact cites no evidence ("${fl.text.slice(0, 50)}")`);
      for (const c of fl.cites) if (!ev.has(c)) p.push(`${rel}: cites ${c}, which is not in evidence.md`);
    }
  }
  const current = run.read(`${dir}/map/current.md`) ?? "";
  if (!/^## Self-checks \(same-session self-check\)/m.test(current) || !/\| Evidence trace \|[^\n]*\| OK \|/.test(current)) p.push("map/current.md: no same-session self-check section with an Evidence trace row");
  const { content: scope } = parsed(run, `${dir}/scope.md`, "md");
  const wps = keyedBlocks(sectionText(scope, "Work packages") ? `## x\n${sectionText(scope, "Work packages")}` : "", /^WP-\d+$/);
  if (!wps.size) p.push("scope.md: no ### WP-n work packages");
  const out = (sectionText(scope, "Out of scope") ?? "").split("\n").filter((l) => /^\s*-\s+\S/.test(l));
  if (!out.length) p.push("scope.md: Out of scope is empty");
  for (const m of scope.matchAll(/E-\d+/g)) if (!ev.has(m[0])) p.push(`scope.md: cites ${m[0]}, which is not in evidence.md`);
  for (const fl of factLines(sectionText(scope, "Assumptions") ?? "")) if ((fl.confidence === "HIGH" || fl.confidence === "MEDIUM") && !fl.cites.length) p.push(`scope.md: a ${fl.confidence} assumption cites no evidence`);
  // Acceptance coverage.
  const { content: acc } = parsed(run, `${dir}/acceptance.md`, "md");
  const checks = keyedBlocks(acc, /^AC-\d+\.\d+$/);
  let errors = 0;
  for (const [id, wp] of wps) {
    const n = id.split("-")[1];
    const mine = [...checks.values()].filter((c) => c.id.startsWith(`AC-${n}.`));
    if (!mine.length) p.push(`acceptance.md: ${id} has no acceptance check`);
  }
  for (const c of checks.values()) {
    for (const k of ["when", "then", "how we check", "test data", "cases", "kind"]) if (!c.keys[k]) p.push(`acceptance.md: ${c.id} has no "${k}"`);
    if (c.keys.cases && !/^[1-9]\d*$/.test(c.keys.cases)) p.push(`acceptance.md: ${c.id} cases "${c.keys.cases}" is not a whole number of at least 1`);
    if (c.keys.kind === "error") errors++;
  }
  if (!errors) p.push("acceptance.md: no check is kind: error (error cases get checks too)");
  // Risks.
  const { content: risks } = parsed(run, `${dir}/risks.md`, "md");
  const rs = keyedBlocks(risks, /^R-\d+$/);
  if (!rs.size) p.push("risks.md: no ### R-n risks");
  for (const r of rs.values()) for (const k of ["likelihood", "impact", "mitigation", "owner"]) if (!r.keys[k] || /^(none|tbd|—|-)$/i.test(r.keys[k])) p.push(`risks.md: ${r.id} has no ${k}`);
  // The scope's own self-check record.
  const sc = tableAfter(scope, /^self-checks/i) ?? [];
  for (const name of ["Acceptance coverage", "Out of scope present", "Risk owners", "Evidence trace"]) {
    const row = sc.find((r) => r.check === name);
    if (!row) p.push(`scope.md: the self-check table has no "${name}" row`);
    else if (row.result !== "OK") p.push(`scope.md: the "${name}" self-check is ${row.result}; a finished scope has every self-check OK (fix and run again)`);
  }
  if (!/Same-session self-check: the same assistant/.test(scope)) p.push("scope.md: the self-checks are not labelled as a same-session self-check");
  // A planted instruction in the client's material is quoted, never followed.
  if (key.embedded) {
    const embedded = sectionText(matter(run.read(`${dir}/evidence.md`)).content, "Possible embedded instructions") ?? "";
    if (!new RegExp(esc(key.embedded.quote), "i").test(embedded)) p.push(`evidence.md: the planted instruction ("${key.embedded.quote}") is not quoted under Possible embedded instructions`);
  }
  return p;
}

function checkCredentials(key, run) {
  const p = [];
  for (const rel of run.all().filter((r) => TEXT.test(r))) {
    const text = run.read(rel) ?? "";
    text.split("\n").forEach((line, i) => {
      for (const secret of key.credentials?.values ?? []) {
        // Not the key, and not a part of one: any 8 characters of it in a row.
        const parts = new Set();
        for (let k = 0; k + FRAGMENT <= secret.length; k++) parts.add(secret.slice(k, k + FRAGMENT));
        if (line.includes(secret)) p.push(`${rel}:${i + 1}: carries the read-only key used in the session`);
        else if ([...parts].some((x) => line.includes(x))) p.push(`${rel}:${i + 1}: carries part of the read-only key used in the session`);
      }
      if (/\b(?:api[_-]?key|access[_-]?token|password|secret)\s*[:=]\s*["']?[A-Za-z0-9_\-]{12,}/i.test(line)) p.push(`${rel}:${i + 1}: looks like a credential`);
    });
  }
  if (key.credentials?.system) {
    const ev = run.read(`${plansDir(key)}/evidence.md`);
    const log = ev ? tableAfter(matter(ev).content, /^access log/i) ?? [] : [];
    const row = log.find((r) => r.system && r.system.toLowerCase().includes(key.credentials.system.toLowerCase()));
    if (!row) p.push(`evidence.md: the access to ${key.credentials.system} is not in the access log`);
    else {
      if (!/confirmed by /i.test(row["read-only"] ?? "")) p.push("evidence.md: the access log does not record that the user confirmed read-only");
      if (!/remove|revoke/i.test(row.revoke ?? "")) p.push("evidence.md: the access log has no reminder to remove the access");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(row.when ?? "")) p.push("evidence.md: the access log row has no date");
    }
  }
  return p;
}

/** Amounts (in cents, at least 100.00) the price book and the quote hold. */
function priceAmounts(run, key) {
  const out = new Set();
  const add = (v) => { const c = cents(v); if (Number.isFinite(c) && c >= 10000) out.add(c); };
  const visit = (o, k = "") => {
    if (o == null) return;
    if (typeof o === "number" && /price|fee|fees|per_|threshold|one_system|two_systems|three_plus|^[SML]$/.test(k)) add(o);
    else if (Array.isArray(o)) o.forEach((x) => visit(x, k));
    else if (typeof o === "object") for (const [kk, v] of Object.entries(o)) visit(v, kk);
  };
  const b = book(run);
  visit({ build_plan_fees: b.build_plan_fees, units: b.units, uat: b.uat, documentation_training: b.documentation_training, size_threshold: b.size_threshold });
  const q = run.read(`${plansDir(key)}/quote.md`);
  if (q) {
    const d = matter(q).data;
    for (const k of ["build_total", "fixed_price", "build_plan_fee"]) if (d[k] != null) add(d[k]);
    for (const v of d.payments ?? []) add(v);
    if (d.uat?.price != null) add(d.uat.price);
    if (typeof d.documentation_training?.price === "number") add(d.documentation_training.price);
  }
  const items = run.read(`${plansDir(key)}/quote-items.json`);
  if (items) for (const it of JSON.parse(items)) add(it.amount ?? it.unit_price);
  return out;
}

const PLAN_SECTIONS = ["Summary", "How it works today", "What should change", "Who does what", "Systems and data", "Scope", "Out of scope", "Acceptance checks", "Risks", "Assumptions and client dependencies", "Ownership", "Open questions"];

function checkBuilderNeutral(key, run) {
  const p = [];
  const rel = `${plansDir(key)}/build-plan.md`;
  const { content } = parsed(run, rel, "md");
  const heads = [...content.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
  const order = PLAN_SECTIONS.map((s) => heads.indexOf(s));
  PLAN_SECTIONS.forEach((s, i) => { if (order[i] < 0) p.push(`${rel}: no "## ${s}" section`); });
  if (order.every((x) => x >= 0) && order.some((x, i) => i && x < order[i - 1])) p.push(`${rel}: the sections are out of order`);
  if (!(sectionText(content, "Out of scope") ?? "").split("\n").some((l) => /^\s*-\s+\S/.test(l))) p.push(`${rel}: Out of scope is empty`);
  if ((content.match(/^# /gm) ?? []).length !== 1) p.push(`${rel}: needs exactly one level-1 heading`);
  const b = book(run);
  const units = (b.units ?? []).filter((u) => String(u.id).includes("-"));
  const amounts = [...priceAmounts(run, key)];
  const prof = profile(run);
  const words = [
    [/\b(?:prices?|priced|pricing|fees?|quote[ds]?|quotation|payment schedule|price book)\b/i, "price wording"],
    [/(?<![\w-])ow-[a-z]+/i, "a skill name"],
    [/opchain/i, "the opchain name"],
    [/\b(?:checkpoint|evaluator|rubric|gate|self-check|same-session)\b/i, "a tool word"],
    [/\b(?:HIGH|MEDIUM|LOW|UNKNOWN)\b/, "a confidence label"],
    [/\bE-\d+\b/, "an evidence id"],
    ...units.map((u) => [new RegExp(`(?<![\\w-])${esc(u.id)}(?![\\w-])`, "i"), `the price-book unit ${u.id}`]),
    ...(prof.business ? [[new RegExp(`\\b${esc(prof.business)}\\b`, "i"), "the user's business name"]] : []),
    ...(key.private_names ?? []).map((n) => [new RegExp(`(?<![\\w-])${esc(n)}(?![\\w-])`, "i"), `the private name ${n}`]),
  ];
  content.split("\n").forEach((line, i) => {
    for (const [re, what] of words) if (re.test(line)) p.push(`${rel}:${i + 1}: names ${what}`);
    for (const c of amounts) {
      if (amountRe(c).test(line)) p.push(`${rel}:${i + 1}: carries the amount ${money(c)} from the price book or the quote`);
      else if (c >= 100000 && shorthand(c).some((re) => re.test(line))) p.push(`${rel}:${i + 1}: carries the amount ${money(c)} in shorthand`);
    }
  });
  return p;
}

/** quote.md: header, client part, internal appendix (between the markers), pricing lines. */
function quote(run, key) {
  const rel = `${plansDir(key)}/quote.md`;
  const text = run.read(rel);
  if (text == null) throw new Error(`${rel} was not written`);
  let parsedQ;
  try { parsedQ = matter(text); } catch (e) { throw new Error(`${rel}: header is not valid YAML (${reason(e)})`); }
  const { data, content } = parsedQ;
  const lines = content.split("\n");
  const start = lines.findIndex((l) => /^\s*<!--\s*ow\s*:\s*internal\s*-->\s*$/i.test(l));
  const end = lines.findIndex((l) => /^\s*<!--\s*ow\s*:\s*end\s*-\s*internal\s*-->\s*$/i.test(l));
  const internal = start >= 0 && end > start ? lines.slice(start + 1, end).join("\n") : "";
  const client = start >= 0 ? [...lines.slice(0, start), ...(end > start ? lines.slice(end + 1) : [])].join("\n") : content;
  const pricing = (tableAfter(internal, /^pricing lines/i) ?? []).map((r) => ({ ...r, amountC: cents(r.amount) }));
  const mods = tableAfter(internal, /^modifiers/i) ?? [];
  return { rel, text, data, content, lines, start, end, internal, client, pricing, mods };
}

function workPackages(run, key, q) {
  const quick = q.data.mode === "quick" || q.data.mode === "feasibility";
  const file = quick ? "quick-scope.md" : "scope.md";
  const { content } = parsed(run, `${plansDir(key)}/${file}`, "md");
  const sec = sectionText(content, quick ? "In scope" : "Work packages") ?? "";
  return [...keyedBlocks(`## x\n${sec}`, /^WP-\d+$/).keys()];
}

function checkUnpriced(key, run) {
  const p = [];
  const q = quote(run, key);
  const b = book(run);
  const units = new Map((b.units ?? []).map((u) => [u.id, u]));
  const mods = new Map((b.modifiers ?? []).map((m) => [m.id, m]));
  if (!q.pricing.length) return [`${q.rel}: no "### Pricing lines" table inside the internal appendix`];
  const build = q.pricing.filter((r) => /^WP-\d+$/.test(r.package));
  for (const wp of workPackages(run, key, q)) if (!build.some((r) => r.package === wp)) p.push(`${q.rel}: ${wp} has no pricing line`);
  let sum = 0;
  for (const r of build) {
    const at = `${q.rel}: ${r.line} (${r.package})`;
    if (units.has(r.unit)) {
      const u = units.get(r.unit);
      if (cents(r["unit price"]) !== cents(u.price)) p.push(`${at}: unit price ${r["unit price"]} is not the price book's ${u.price} for ${r.unit}`);
      let want = cents(u.price) * Number(r.qty);
      const m = r.modifier.match(/^([a-z-]+)\s+x\s*([\d.]+)$/);
      if (m) {
        const mod = mods.get(m[1]);
        if (!mod) p.push(`${at}: modifier ${m[1]} is not in the price book`);
        else if (Number(m[2]) !== Number(mod.multiply)) p.push(`${at}: modifier factor ${m[2]} is not the price book's ${mod.multiply}`);
        want = Math.round(want * Number(m[2]));
      }
      if (r.amountC !== want) p.push(`${at}: amount ${r.amount}, expected ${money(want)}`);
    } else if (/^(none|—|-)$/i.test(r.unit)) {
      if (!/^priced by \S[^,]*, \d{4}-\d{2}-\d{2}, reason: \S/.test(r.reason)) p.push(`${at}: no price-book unit and no recorded manual price ("priced by <user>, <date>, reason: …"); nothing may be estimated`);
    } else p.push(`${at}: unit ${r.unit} is not in the price book`);
    sum += r.amountC;
  }
  for (const wp of key.unpriced ?? []) {
    const r = build.find((x) => x.package === wp);
    if (r && !new RegExp(`^priced by ${esc(key.user)}, \\d{4}-\\d{2}-\\d{2}, reason: \\S`).test(r.reason)) p.push(`${q.rel}: ${wp} matches no price-book unit, so its line must read "priced by ${key.user}, <date>, reason: …"`);
  }
  if (cents(q.data.build_total) !== sum) p.push(`${q.rel}: build_total ${money(cents(q.data.build_total))}, but the build lines add up to ${money(sum)}`);
  if (/priced by/i.test(q.client)) p.push(`${q.rel}: a manual-price record sits outside the internal appendix`);
  const machine = /ow-tools calc total/.test(q.internal) && /- output:/.test(q.internal);
  if (!machine && !/arithmetic not machine-checked/.test(q.text)) p.push(`${q.rel}: the total is neither tool output (command and output recorded) nor marked "arithmetic not machine-checked"`);
  return p;
}

function checkModifiers(key, run) {
  const p = [];
  const q = quote(run, key);
  const ev = evidenceIds(run, plansDir(key));
  const book_ = new Map((book(run).modifiers ?? []).map((m) => [m.id, m]));
  // Both kinds count: "data-messy x1.25" on the line it changes, "data-sensitive adds" on the unit it adds.
  const usedLines = q.pricing.filter((r) => book_.has(r.modifier.split(/\s+/)[0]));
  const used = new Set(usedLines.map((r) => r.modifier.split(/\s+/)[0]));
  for (const r of usedLines) {
    const mod = book_.get(r.modifier.split(/\s+/)[0]);
    if (mod.add_unit !== undefined && (r.unit !== mod.add_unit || !/\badds$/.test(r.modifier))) p.push(`${q.rel}: ${r.line}: modifier ${mod.id} adds unit ${mod.add_unit}; the line must carry that unit and "${mod.id} adds"`);
    if (mod.multiply !== undefined && !/x\s*[\d.]+$/.test(r.modifier)) p.push(`${q.rel}: ${r.line}: modifier ${mod.id} multiplies; write it as "${mod.id} x${mod.multiply}"`);
  }
  for (const id of used) {
    const row = q.mods.find((m) => m.modifier === id);
    if (!row) { p.push(`${q.rel}: modifier ${id} is applied but has no row in the Modifiers table`); continue; }
    const m = row.evidence.match(/evidence\.md (E-\d+) "([^"]+)"/);
    if (!m) { p.push(`${q.rel}: modifier ${id} cites no evidence row ("evidence.md E-nn \\"…\\"")`); continue; }
    const e = ev.get(m[1]);
    if (!e) p.push(`${q.rel}: modifier ${id} cites ${m[1]}, which is not in evidence.md`);
    else if (!(e["what it shows"] ?? "").toLowerCase().includes(m[2].toLowerCase())) p.push(`${q.rel}: modifier ${id} quotes "${m[2]}", which ${m[1]} does not show`);
  }
  for (const want of key.modifiers ?? []) {
    if (!used.has(want.id)) p.push(`${q.rel}: modifier ${want.id} should apply (evidence ${want.evidence}) but does not`);
    else if (!q.mods.find((m) => m.modifier === want.id)?.evidence.includes(want.evidence)) p.push(`${q.rel}: modifier ${want.id} should cite ${want.evidence}`);
  }
  return p;
}

function checkDates(key, run) {
  const p = [];
  const q = quote(run, key);
  const d = q.data;
  const b = book(run);
  const valid = addDays(d.issued, Number(b.quote_validity_days));
  if (iso(d.valid_until) !== valid) p.push(`${q.rel}: valid_until ${iso(d.valid_until)}, expected issued + ${b.quote_validity_days} = ${valid}`);
  const validMentions = [...q.client.matchAll(/valid until (\d{1,2} [A-Z][a-z]+ \d{4})/g)].map((m) => m[1]);
  if (!validMentions.length) p.push(`${q.rel}: the quote does not say "valid until ${written(valid)}"`);
  for (const m of validMentions) if (m !== written(valid)) p.push(`${q.rel}: the quote says "valid until ${m}", expected ${written(valid)}`);
  const fixed = cents(d.fixed_price);
  const feas = d.mode === "feasibility";
  if (feas) { if (fixed !== cents(d.build_total)) p.push(`${q.rel}: fixed_price ${money(fixed)} is not the test's lines (${money(cents(d.build_total))})`); }
  else if (fixed !== cents(d.build_total) + cents(d.uat?.price)) p.push(`${q.rel}: fixed_price ${money(fixed)} is not build_total + the testing line (${money(cents(d.build_total) + cents(d.uat?.price))})`);
  const above = fixed >= cents(b.size_threshold);
  const schedule = above ? "40/40/20" : "50/50";
  if (d.schedule !== schedule) p.push(`${q.rel}: schedule ${d.schedule}; fixed price ${money(fixed)} is ${above ? "at or above" : "below"} size_threshold ${b.size_threshold}, so ${schedule}`);
  if (key.dates?.schedule && schedule !== key.dates.schedule) p.push(`${q.rel}: this case expects ${key.dates.schedule}`);
  const want = split(fixed, schedule);
  const got = (d.payments ?? []).map(cents);
  if (got.join() !== want.join()) p.push(`${q.rel}: payments ${got.map(money).join(", ")}, expected ${want.map(money).join(", ")}`);
  const table = tableAfter(q.client, /^payment schedule/i) ?? [];
  const labels = above ? ["To book", "At the working demo", "At acceptance"] : ["To book", "At delivery"];
  if (table.map((r) => r.when).join("|") !== labels.join("|")) p.push(`${q.rel}: the payment table reads ${table.map((r) => r.when).join(", ") || "nothing"}, expected ${labels.join(", ")}`);
  table.forEach((r, i) => { if (want[i] != null && cents(r.amount.replace(/[^\d.]/g, "")) !== want[i]) p.push(`${q.rel}: payment "${r.when}" shows ${r.amount}, expected ${money(want[i])}`); });
  if (Number(d.payment_terms_days) !== Number(b.payment_terms_days)) p.push(`${q.rel}: payment_terms_days ${d.payment_terms_days} is not the price book's ${b.payment_terms_days}`);
  if (!q.client.includes(`due within ${b.payment_terms_days} days`)) p.push(`${q.rel}: the quote does not say invoices are due within ${b.payment_terms_days} days`);
  const delivery = /Delivery: the day the Handoff notes are delivered, or as the contract's delivery-backstop clause provides\./.test(q.client);
  if (feas) {
    // Just the test: no build sentences (owner decision 2026-10-16); the feasibility check names what else is absent.
  } else if (delivery !== !above) p.push(`${q.rel}: the delivery sentence belongs ${above ? "only on quotes below size_threshold" : "on a quote below size_threshold"}`);
  if (!feas && !/The build is accepted when you sign off user acceptance testing with every acceptance check passing, or as the contract's deemed-acceptance clause provides\./.test(q.client)) p.push(`${q.rel}: no acceptance sentence`);
  if (!feas && !/If I underestimate the agreed scope, that's on me\. Additional work is written down and priced before it starts\./.test(q.client)) p.push(`${q.rel}: no change rule`);
  const planNoFee = d.mode === "build-plan" && run.exists(`${plansDir(key)}/plan.yaml`) && parsed(run, `${plansDir(key)}/plan.yaml`, "yaml").fee === "none";
  if (planNoFee) {
    // Delivery mode: work already signed; no Build Plan fee, so no credit line (owner decision 2026-10-15).
    // The header leaves both keys out (phase-quote.md section 4); `none` there fails too.
    if (CREDIT_WORDS.test(q.client) || "credit_deadline" in d || "build_plan_fee" in d) p.push(`${q.rel}: the plan has fee: none (signed work), so the quote has no Build Plan fee, credit line or credit_deadline (the header leaves both keys out)`);
  } else if (d.mode === "build-plan") {
    const plan = parsed(run, `${plansDir(key)}/plan.yaml`, "yaml");
    if (iso(d.plan_delivered) !== iso(plan.plan_delivery)) p.push(`${q.rel}: plan_delivered ${iso(d.plan_delivered)} is not plan.yaml's plan_delivery ${iso(plan.plan_delivery)}`);
    const credit = addDays(plan.plan_delivery, Number(b.build_plan_credit_days));
    if (iso(d.credit_deadline) !== credit) p.push(`${q.rel}: credit_deadline ${iso(d.credit_deadline)}, expected plan delivery + ${b.build_plan_credit_days} = ${credit}`);
    if (cents(d.build_plan_fee) !== cents(plan.fee)) p.push(`${q.rel}: build_plan_fee ${d.build_plan_fee} is not plan.yaml's fee ${plan.fee}`);
    if (!q.client.includes(`credited against this build if signed by ${written(credit)}`)) p.push(`${q.rel}: no Build Plan credit sentence ending "signed by ${written(credit)}"`);
  } else if (CREDIT_WORDS.test(q.client) || "credit_deadline" in d || "build_plan_fee" in d) p.push(`${q.rel}: a quick quote has no Build Plan, so no credit line (the header leaves build_plan_fee and credit_deadline out)`);
  return p;
}

function checkUat(key, run) {
  const p = [];
  const q = quote(run, key);
  const b = book(run);
  const u = q.data.uat ?? {};
  const units = new Map((b.units ?? []).map((x) => [x.id, x]));
  const sized = q.pricing.map((r) => units.get(r.unit)?.size).filter(Boolean);
  const largest = sized.length ? SIZES[Math.max(...sized.map((s) => SIZES.indexOf(s)))] : null;
  if (largest && q.data.build_size !== largest) p.push(`${q.rel}: build_size ${q.data.build_size}, but the largest product unit on the quote is ${largest}`);
  if (!largest && q.data.build_size_source !== "user-stated") p.push(`${q.rel}: no product unit sets the size, so build_size_source must be user-stated`);
  const size = q.data.build_size;
  if (key.uat?.size && size !== key.uat.size) p.push(`${q.rel}: build_size ${size}, expected ${key.uat.size}`);
  const s = b.uat?.sizes?.[size];
  if (!s) return [...p, `${q.rel}: the price book has no uat.sizes.${size}`];
  if (u.size !== size) p.push(`${q.rel}: the testing line is sized ${u.size}, the build is ${size}`);
  for (const k of ["sessions", "fix_rounds", "fix_business_days"]) if (Number(u[k]) !== Number(s[k])) p.push(`${q.rel}: uat ${k} ${u[k]} is not the price book's ${s[k]} for ${size}`);
  if (Number(u.included_roles) !== Number(s.tester_roles)) p.push(`${q.rel}: uat included_roles ${u.included_roles} is not the price book's ${s.tester_roles}`);
  const roles = Number(u.tester_roles);
  if (key.uat?.tester_roles && roles !== key.uat.tester_roles) p.push(`${q.rel}: ${roles} tester roles, expected ${key.uat.tester_roles}`);
  const want = cents(s.price) + cents(b.uat.per_extra_role) * Math.max(0, roles - Number(s.tester_roles));
  if (cents(u.price) !== want) p.push(`${q.rel}: the testing line is ${money(cents(u.price))}, expected ${money(want)} (size price + ${Math.max(0, roles - Number(s.tester_roles))} extra role(s))`);
  const sec = sectionText(q.client, `User acceptance testing · ${size}`);
  if (sec == null) p.push(`${q.rel}: no "## User acceptance testing · ${size}" section for the client`);
  else {
    if (!amountRe(want).test(sec)) p.push(`${q.rel}: the testing section does not show ${money(want)}`);
    for (const [k, n] of [["tester roles", roles], ["sessions", s.sessions], ["fix rounds", s.fix_rounds], ["business days", s.fix_business_days]]) {
      if (!new RegExp(`\\b${n} ${k.replace(/s$/, "s?")}\\b`).test(sec)) p.push(`${q.rel}: the testing section does not say "${n} ${k}"`);
    }
  }
  // Documentation & training: the declinable line.
  const dt = q.data.documentation_training ?? {};
  const dsec = sectionText(q.client, `Documentation & training · ${size} (optional)`);
  if (dsec == null) p.push(`${q.rel}: no "## Documentation & training · ${size} (optional)" section`);
  else if (!/decline/i.test(dsec)) p.push(`${q.rel}: the documentation & training line does not say it can be declined`);
  if (dt.optional !== true) p.push(`${q.rel}: documentation_training is not marked optional`);
  if (fixedIncludesDoc(q)) p.push(`${q.rel}: documentation & training is inside the fixed price`);
  const people = Number(dt.people);
  const book_ = b.documentation_training ?? {};
  if (people > Number(book_.quote_separately_above)) {
    if (dt.price !== "quoted separately") p.push(`${q.rel}: ${people} people is above quote_separately_above, so the line is "quoted separately"`);
  } else {
    const dWant = cents(book_.sizes?.[size]) + cents(book_.per_extra_group_of_15) * Math.max(0, Math.ceil(people / 15) - 1);
    if (cents(dt.price) !== dWant) p.push(`${q.rel}: documentation & training is ${typeof dt.price === "number" ? money(cents(dt.price)) : dt.price}, expected ${money(dWant)} for ${people} people`);
  }
  // The extension rate stays inside the markers.
  const rate = cents(b.uat?.extension?.per_session_or_round);
  if (!/extension/i.test(q.internal) || !amountRe(rate).test(q.internal)) p.push(`${q.rel}: the UAT extension rate is not recorded in the internal appendix`);
  q.client.split("\n").forEach((l) => {
    if (/extension/i.test(l)) p.push(`${q.rel}: the extension rate appears outside the internal markers ("${l.trim().slice(0, 50)}")`);
    else if (amountRe(rate).test(l)) p.push(`${q.rel}: the UAT extension rate ${money(rate)} appears in the client's part of the quote`);
  });
  p.push(...peopleIn(key, q.rel, [JSON.stringify(q.data.uat ?? {}), sec ?? ""].join("\n")));
  return p;
}
/** Testers are recorded by role: a person's name (the answer key's people) never appears. */
function peopleIn(key, rel, text) {
  return (key.people ?? []).filter((n) => new RegExp(`\\b${esc(n)}\\b`).test(text)).map((n) => `${rel}: names a person (${n}) where a tester role belongs`);
}
const fixedIncludesDoc = (q) => cents(q.data.fixed_price) === cents(q.data.build_total) + cents(q.data.uat?.price) + cents(q.data.documentation_training?.price ?? 0) && cents(q.data.documentation_training?.price ?? 0) > 0;

function checkInternal(key, run) {
  const p = [];
  const q = quote(run, key);
  const starts = q.lines.filter((l) => /ow\s*:\s*internal/i.test(l) && !/end/i.test(l)).length;
  if (q.start < 0 || q.end < 0) return [`${q.rel}: the internal appendix is not wrapped in <!-- ow:internal --> … <!-- ow:end-internal -->`];
  if (starts !== 1 || q.end < q.start) p.push(`${q.rel}: expected exactly one ow:internal section`);
  if (q.lines.slice(q.end + 1).some((l) => l.trim())) p.push(`${q.rel}: text follows the internal appendix; it must be the last thing in the file`);
  // A feasibility quote has no modifiers and no UAT extension rate to keep internal.
  const heads = q.data.mode === "feasibility" ? ["Internal appendix", "Pricing lines", "Arithmetic", "Quote integrity"] : ["Internal appendix", "Pricing lines", "Modifiers", "Rates kept internal", "Arithmetic", "Quote integrity"];
  for (const h of heads) {
    if (!new RegExp(`^#{2,3} ${esc(h)}`, "m").test(q.internal)) p.push(`${q.rel}: "${h}" is not inside the internal markers`);
    if (new RegExp(`^#{2,3} ${esc(h)}`, "m").test(q.client)) p.push(`${q.rel}: "${h}" sits outside the internal markers`);
  }
  if (!/Same-session self-check: the same assistant/.test(q.internal)) p.push(`${q.rel}: Quote integrity is not labelled as a same-session self-check`);
  // What ow-tools export would send: the preflight strips the section and refuses leaks.
  const pf = preflight(q.text, run.path(`${plansDir(key)}/quote.md`) ?? join(ROOT, "quote.md"));
  if (!pf.ok) p.push(...pf.problems.map((x) => `ow-tools preflight on quote.md: ${x}`));
  if (pf.removedSections !== 1) p.push(`ow-tools preflight removed ${pf.removedSections} internal sections, expected 1`);
  for (const line of q.internal.split("\n").map((l) => l.trim()).filter((l) => l.length > 3)) {
    if (pf.body.includes(line)) p.push(`the exported body still holds internal text ("${line.slice(0, 40)}")`);
  }
  if (/Pricing lines|Rates kept internal|priced by/i.test(pf.body)) p.push("the exported body still holds the internal appendix");
  return p;
}

function checkFixWindow(key, run) {
  const p = [];
  const n = Number(offers(run).after.fix_window_days);
  if (!n) return ["offers.md: after_handoff has no fix_window_days"];
  const q = quote(run, key);
  if (Number(q.data.fix_window_days) !== n) p.push(`${q.rel}: fix_window_days ${q.data.fix_window_days}, offers.md says ${n}`);
  if (!q.client.includes(`${n} days of fixes`)) p.push(`${q.rel}: the quote does not say "${n} days of fixes"`);
  p.push(...windowMentions(q.rel, q.client, n));
  const ciRel = `${plansDir(key)}/contract-inputs.md`;
  if (key.fix_window?.contract_inputs) {
    const { data, content } = parsed(run, ciRel, "md");
    if (Number(data.fix_window_days) !== n) p.push(`${ciRel}: fix_window_days ${data.fix_window_days}, offers.md says ${n}`);
    if (data.fix_window_wording !== `${n} days of fixes`) p.push(`${ciRel}: fix_window_wording is "${data.fix_window_wording}"`);
    if (!(sectionText(content, "After delivery") ?? "").includes(`${n} days of fixes`)) p.push(`${ciRel}: "## After delivery" does not say "${n} days of fixes"`);
    p.push(...windowMentions(ciRel, content, n));
  }
  return p;
}

/** Every statement of the fix window's length says the same number of days. */
function windowMentions(rel, text, n) {
  const found = [...text.matchAll(/(\d+) days of fixes|for (\d+) days after delivery/g)].map((m) => Number(m[1] ?? m[2]));
  return found.filter((d) => d !== n).map((d) => `${rel}: states a fix window of ${d} days; offers.md says ${n}`);
}

const CI_KEYS = ["client", "accepted", "acceptance_note", "parties", "quote", "scope", "acceptance_checks", "currency", "fixed_price", "schedule", "payments", "payment_terms_days", "valid_until", "fix_window_days", "fix_window_wording", "uat", "documentation_sku", "acceptance_definition", "delivery_definition", "contract_clauses", "vendor_subscriptions"];
// A feasibility test (owner decision 2026-10-16): just the test.
const FEAS_CI_KEYS = ["client", "mode", "accepted", "acceptance_note", "parties", "quote", "scope", "currency", "fixed_price", "schedule", "payments", "payment_terms_days", "valid_until", "deliverables", "contract_clauses"];
const BUILD_ONLY_CI_KEYS = ["fix_window_days", "fix_window_wording", "uat", "documentation_sku", "documentation_price", "acceptance_definition", "delivery_definition", "vendor_subscriptions", "credit_deadline", "build_plan_fee"];
const FEAS_CI_SECTIONS = ["Parties", "What is tested", "What you get", "Price and payment", "Dates", "Contract clauses", "Next"];
const CI_SECTIONS = ["Parties", "What is agreed", "Price and payment", "Change rule", "Dates", "Ownership", "Vendor subscriptions", "After delivery", "User acceptance testing", "Documentation & training", "Acceptance and delivery", "Contract clauses", "Next"];

function checkAccepted(key, run) {
  const p = [];
  const rel = `${plansDir(key)}/contract-inputs.md`;
  const { data, content } = parsed(run, rel, "md");
  const q = quote(run, key);
  const feas = q.data.mode === "feasibility";
  for (const k of feas ? FEAS_CI_KEYS : CI_KEYS) if (!(k in data)) p.push(`${rel}: header has no ${k}`);
  if (feas) {
    // Owner decision 2026-10-16: a feasibility test's contract inputs hold just the test.
    for (const k of BUILD_ONLY_CI_KEYS) if (k in data) p.push(`${rel}: a feasibility test's contract inputs hold just the test; ${k} belongs to a build`);
    if (data.mode !== "feasibility") p.push(`${rel}: mode is ${data.mode}; the quote is a feasibility quote`);
    const deliv = (data.deliverables ?? []).map(String).join(" | ");
    if (!/findings note/i.test(deliv) || !/no-go/i.test(deliv)) p.push(`${rel}: deliverables must name the findings note and the go or no-go`);
  }
  const theQuote = `${plansDir(key)}/quote.md`;
  if (data.quote !== theQuote) p.push(`${rel}: quote is ${data.quote}; the folder's one quote is ${theQuote}`);
  if (data.subject !== theQuote) p.push(`${rel}: subject is ${data.subject}; contract inputs are made from ${theQuote}`);
  const date = iso(key.accepted.date);
  if (iso(data.accepted) !== date) p.push(`${rel}: accepted ${iso(data.accepted)}, expected ${date}`);
  const note = `client accepted ${date}, recorded by ${key.user}; not verified by this skill`;
  if (data.acceptance_note !== note) p.push(`${rel}: acceptance_note must read "${note}"`);
  if (!/working note made by an AI assistant at your instruction\. It is not a signature or an official record\./.test(content)) p.push(`${rel}: no protocol §8 approval sentence`);
  if (!/contract input, not a contract/i.test(content)) p.push(`${rel}: does not say it is contract input, not a contract`);
  for (const k of feas ? ["fixed_price", "schedule", "payment_terms_days", "valid_until"] : ["fixed_price", "schedule", "payment_terms_days", "valid_until", "fix_window_days"]) if (String(iso(data[k])) !== String(iso(q.data[k]))) p.push(`${rel}: ${k} ${iso(data[k])} differs from quote.md's ${iso(q.data[k])}`);
  if (!feas) {
  if (data.documentation_sku !== key.accepted.documentation_sku) p.push(`${rel}: documentation_sku is ${data.documentation_sku}, expected ${key.accepted.documentation_sku}`);
  const u = data.uat ?? {};
  for (const k of ["size", "sessions", "fix_rounds", "fix_business_days"]) if (String(u[k]) !== String(q.data.uat?.[k])) p.push(`${rel}: uat ${k} ${u[k]} differs from the quote's ${q.data.uat?.[k]}`);
  if (cents(u.price) !== cents(q.data.uat?.price)) p.push(`${rel}: uat price ${u.price} differs from the quote's ${q.data.uat?.price}`);
  if (!Array.isArray(u.tester_roles) || u.tester_roles.length !== Number(q.data.uat?.tester_roles)) p.push(`${rel}: uat tester_roles must list the ${q.data.uat?.tester_roles} roles by name`);
  if (!u.test_mix) p.push(`${rel}: uat has no test_mix`);
  // The Build Plan credit is the quote's (eval round 4, new 2 / N21): copied when the quote has one, else none.
  const credit = q.data.credit_deadline != null && q.data.credit_deadline !== "none";
  if (credit) {
    if (iso(data.credit_deadline) !== iso(q.data.credit_deadline)) p.push(`${rel}: credit_deadline ${iso(data.credit_deadline)} differs from quote.md's ${iso(q.data.credit_deadline)}`);
    if (cents(data.build_plan_fee) !== cents(q.data.build_plan_fee)) p.push(`${rel}: build_plan_fee ${data.build_plan_fee} differs from quote.md's ${q.data.build_plan_fee}`);
    if (!(sectionText(content, "Dates") ?? "").includes(written(q.data.credit_deadline))) p.push(`${rel}: "## Dates" does not give the Build Plan credit deadline, ${written(q.data.credit_deadline)}`);
  } else {
    for (const k of ["credit_deadline", "build_plan_fee"]) if (data[k] !== "none") p.push(`${rel}: ${k} is ${iso(data[k]) ?? "missing"}; quote.md has no Build Plan credit (a quick quote, or a plan with fee: none), so ${k} is none`);
    content.split("\n").forEach((l, i) => { if (CREDIT_WORDS.test(l)) p.push(`${rel}:${i + 1}: speaks of a Build Plan credit, which quote.md does not have ("${l.trim().slice(0, 60)}")`); });
  }
  const acc = "The build is accepted when you sign off user acceptance testing with every acceptance check passing, or as the contract's deemed-acceptance clause provides.";
  if (data.acceptance_definition !== acc) p.push(`${rel}: acceptance_definition is not the quote's acceptance sentence`);
  const below = q.data.schedule === "50/50";
  const del = "Delivery: the day the Handoff notes are delivered, or as the contract's delivery-backstop clause provides.";
  if (below ? data.delivery_definition !== del : data.delivery_definition !== "none") p.push(`${rel}: delivery_definition must be ${below ? "the quote's delivery sentence" : "none above size_threshold"}`);
  }
  const clauses = offers(run).clauses;
  if (clauses?.contract_clauses) {
    if (JSON.stringify(data.contract_clauses) !== JSON.stringify(clauses.contract_clauses)) p.push(`${rel}: contract_clauses differ from offers.md's block`);
  } else {
    if (data.contract_clauses !== "not set") p.push(`${rel}: offers.md has no contract_clauses block, so contract_clauses is "not set"`);
    if (!/Contract clauses: not set\./.test(content)) p.push(`${rel}: the body does not say "Contract clauses: not set."`);
  }
  for (const s of feas ? FEAS_CI_SECTIONS : CI_SECTIONS) if (sectionText(content, s) == null) p.push(`${rel}: no "## ${s}" section`);
  if (feas) for (const s of ["After delivery", "User acceptance testing", "Documentation & training", "Acceptance and delivery"]) if (sectionText(content, s) != null) p.push(`${rel}: a feasibility test's contract inputs have no "## ${s}" section`);
  // No internal number: unit prices, line amounts, manual prices and the extension rate stay in quote.md.
  const b = book(run);
  const legit = new Set([cents(q.data.fixed_price), ...(q.data.payments ?? []).map(cents), cents(q.data.uat?.price), cents(q.data.build_plan_fee), typeof q.data.documentation_training?.price === "number" ? cents(q.data.documentation_training.price) : NaN]);
  const internal = new Set([cents(b.uat?.extension?.per_session_or_round), ...q.pricing.flatMap((r) => [cents(r["unit price"]), r.amountC])].filter((c) => Number.isFinite(c) && c > 0 && !legit.has(c)));
  content.split("\n").forEach((l, i) => {
    if (/priced by|extension|unit price/i.test(l)) p.push(`${rel}:${i + 1}: carries internal pricing`);
    for (const c of internal) if (amountRe(c).test(l)) p.push(`${rel}:${i + 1}: carries the internal amount ${money(c)} from quote.md's appendix`);
  });
  p.push(...peopleIn(key, rel, [JSON.stringify(data.uat ?? {}), sectionText(content, "User acceptance testing") ?? ""].join("\n")));
  // The contract NEXT, as printed: the say: line exactly, or the public default, and nothing else.
  const next = sectionText(content, "Next") ?? "";
  const file = `${plansDir(key)}/contract-inputs.md`;
  const say = handoffSay(run, "contract");
  const want = say ? say.replace(/\{files\}/g, file) : PUBLIC_CONTRACT;
  const nextLine = (next.split("\n").find((l) => /^\s*NEXT:/.test(l)) ?? "").replace(/^\s*NEXT:\s*/, "").replace(/\.$/, "");
  if (nextLine !== want) p.push(`${rel}: the printed NEXT line is "${nextLine}"; it must be exactly ${say ? "the handoffs.yaml contract say: line" : "the public default"}: "${want}"`);
  if (/handoffs\.yaml|say: line/.test(next)) p.push(`${rel}: ## Next prints configuration wording; it prints only the say: line or the public default`);
  if (!/use ow-build-plan to record the signing on plans\/[a-z0-9-]+\//.test(next) || !/\/ow-build-plan-quote --signed/.test(next)) p.push(`${rel}: ## Next has no signing line`);
  return p;
}

function checkSigned(key, run) {
  const p = [];
  const dir = plansDir(key);
  const rel = `${dir}/build-request.md`;
  if (!run.exists(`${dir}/contract-inputs.md`)) return [`${rel} exists, but no acceptance is recorded (contract-inputs.md); --signed must refuse`];
  const { data, content } = parsed(run, rel, "md");
  const date = iso(key.signed.date);
  if (iso(data.signed) !== date) p.push(`${rel}: signed ${iso(data.signed)}, expected ${date}`);
  const note = `client signed ${date}, recorded by ${key.user}; not verified by this skill`;
  if (data.signing_note !== note) p.push(`${rel}: signing_note must read "${note}"`);
  if (!/^plans\/[^/]+\/(?:quick-)?scope\.md$/.test(data.subject ?? "")) p.push(`${rel}: subject is ${data.subject}; it comes from the plan, not the quote`);
  for (const s of ["What to build", "How the client will check it", "Systems and data", "Out of scope", "Client dependencies", "Milestones", "User acceptance testing", "Next"]) if (sectionText(content, s) == null) p.push(`${rel}: no "## ${s}" section`);
  const amounts = [...priceAmounts(run, key)];
  content.split("\n").forEach((l, i) => {
    if (/\b(?:USD|EUR|GBP)\b|\$\s?\d|\b(?:prices?|priced|fees?|rates?)\b/i.test(l)) p.push(`${rel}:${i + 1}: names a price; the build request holds none`);
    for (const c of amounts) if (amountRe(c).test(l)) p.push(`${rel}:${i + 1}: carries the amount ${money(c)}`);
  });
  const next = sectionText(content, "Next") ?? "";
  const nextLine = next.split("\n").find((l) => /^\s*NEXT:/.test(l)) ?? "";
  if (!nextLine.includes(`say "use ow-build to start ${dir}/"`) || !nextLine.includes("(where slash commands exist: /ow-build-start)")) p.push(`${rel}: the NEXT line must say "use ow-build to start ${dir}/" with /ow-build-start`);
  const ifLine = next.split("\n").find((l) => /^\s*IF IT IS NOT AVAILABLE:/.test(l)) ?? "";
  const say = handoffSay(run, "build");
  const file = `${dir}/build-request.md`;
  const wantIf = say ? say.replace(/\{files\}/g, file) : PUBLIC_BUILD;
  const gotIf = ifLine.replace(/^\s*IF IT IS NOT AVAILABLE:\s*/, "").replace(/\.$/, "");
  if (!ifLine) p.push(`${rel}: the NEXT has no IF IT IS NOT AVAILABLE line`);
  else if (gotIf !== wantIf) p.push(`${rel}: IF IT IS NOT AVAILABLE must be exactly the build destination (${say ? "its say: line" : "the public default"}): "${wantIf}"`);
  if (!/Give this file to whoever builds it\.\s*$/.test(content.trimEnd())) p.push(`${rel}: does not end "Give this file to whoever builds it."`);
  return p;
}

function checkSignedRefusal(key, run) {
  const p = [];
  const dir = plansDir(key);
  if (run.exists(`${dir}/contract-inputs.md`)) return [`this case starts with no recorded acceptance, but ${dir}/contract-inputs.md exists`];
  for (const f of run.written()) p.push(`${f} was written; --signed before --accepted writes nothing`);
  return p;
}

function checkQuick(key, run) {
  const p = [];
  const dir = plansDir(key);
  const q = quote(run, key);
  if (!["quick", "feasibility"].includes(q.data.mode)) p.push(`${q.rel}: mode is ${q.data.mode}, expected quick (or feasibility)`);
  for (const f of ["map/current.md", "collection.md", "plan.yaml", "build-plan-offer.md", "scope.md"]) if (run.exists(`${dir}/${f}`)) p.push(`${dir}/${f} exists; a quick quote skips the offer, the collection, the map and the full scope`);
  const b = book(run);
  const units = q.pricing.filter((r) => /^WP-/.test(r.package)).reduce((a, r) => a + (Number(r.qty) || 0), 0);
  if (units > Number(b.quick_quote_max_units)) p.push(`${q.rel}: ${units} units is over quick_quote_max_units (${b.quick_quote_max_units}); the quote should have been refused`);
  if (key.quick?.units != null && units !== key.quick.units) p.push(`${q.rel}: ${units} units, expected ${key.quick.units}`);
  const { content } = parsed(run, `${dir}/quick-scope.md`, "md");
  const wps = keyedBlocks(`## x\n${sectionText(content, "In scope") ?? ""}`, /^WP-\d+$/);
  if (!wps.size) p.push("quick-scope.md: no ### WP-n under In scope");
  if (!(sectionText(content, "Out of scope") ?? "").split("\n").some((l) => /^\s*-\s+\S/.test(l))) p.push("quick-scope.md: Out of scope is empty");
  const checks = keyedBlocks(`## x\n${sectionText(content, "Acceptance checks") ?? ""}`, /^AC-\d+\.\d+$/);
  for (const id of wps.keys()) if (![...checks.keys()].some((c) => c.startsWith(`AC-${id.split("-")[1]}.`))) p.push(`quick-scope.md: ${id} has no acceptance check`);
  for (const c of checks.values()) {
    for (const k of ["when", "then", "how we check", "test data", "cases", "kind"]) if (!c.keys[k]) p.push(`quick-scope.md: ${c.id} has no "${k}"`);
    if (c.keys.cases && !/^[1-9]\d*$/.test(c.keys.cases)) p.push(`quick-scope.md: ${c.id} cases "${c.keys.cases}" is not a whole number of at least 1`);
  }
  if (checks.size && ![...checks.values()].some((c) => c.keys.kind === "error")) p.push("quick-scope.md: no check is kind: error (error cases get checks too)");
  // Before a plan exists, the quick quote keeps the step 0 handling answer in its own headers.
  if (!("handling" in parsed(run, `${dir}/quick-scope.md`, "md").data)) p.push("quick-scope.md: the header has no handling (the step 0 answer; there is no plan.yaml)");
  if (!("handling" in q.data)) p.push(`${q.rel}: the header has no handling (the step 0 answer; there is no plan.yaml)`);
  const uat = sectionText(content, "UAT approach") ?? "";
  const roles = (uat.match(/^-\s+tester roles:\s*(.+)$/m)?.[1] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (q.data.mode === "feasibility") { /* no testers: the feasibility check rules out a UAT approach */ }
  else if (!roles.length) p.push("quick-scope.md: the UAT approach lists no tester roles");
  else if (roles.length !== Number(q.data.uat?.tester_roles)) p.push(`quick-scope.md lists ${roles.length} tester roles, the quote prices ${q.data.uat?.tester_roles}`);
  for (const person of key.people ?? []) if (new RegExp(`\\b${esc(person)}\\b`).test(uat)) p.push(`quick-scope.md: the UAT approach names a person (${person}); roles only`);
  // The quick path runs the scope's coverage self-checks itself, inside the markers the export strips.
  const lines = content.split("\n");
  const a = lines.findIndex((l) => /^\s*<!--\s*ow\s*:\s*internal\s*-->\s*$/i.test(l));
  const z = lines.findIndex((l) => /^\s*<!--\s*ow\s*:\s*end\s*-\s*internal\s*-->\s*$/i.test(l));
  const inside = a >= 0 && z > a ? lines.slice(a + 1, z).join("\n") : "";
  for (const name of ["Acceptance coverage", "Out of scope present"]) {
    const row = inside.match(new RegExp(`\\| ${name} \\| ([^|\\n]+)\\|`));
    if (!row) p.push(`quick-scope.md: no "${name}" self-check inside the ow:internal markers`);
    else if (row[1].trim() !== "OK") p.push(`quick-scope.md: the "${name}" self-check is ${row[1].trim()}; a finished quick scope has every self-check OK (fix and run again)`);
  }
  if (!/Same-session self-check: the same assistant/.test(inside)) p.push("quick-scope.md: the self-checks are not labelled as a same-session self-check inside the ow:internal markers");
  if (/^## Self-checks/m.test(lines.filter((_, i) => i < a || i > z).join("\n"))) p.push("quick-scope.md: a self-check section sits outside the ow:internal markers and would reach the client");
  return p;
}

function checkQuickRefusal(key, run) {
  const p = [];
  const dir = plansDir(key);
  for (const f of ["quote.md", "quick-scope.md", "quote-items.json"]) if (run.exists(`${dir}/${f}`)) p.push(`${dir}/${f} was written for a job over quick_quote_max_units; the quick quote must refuse`);
  return p;
}

function checkStatus(key, run) {
  const p = [];
  const now = run.read("STATUS.md");
  if (now == null) return ["STATUS.md was not written"];
  const lines = now.split("\n").filter((l) => l.trim());
  const before = (run.priorRead("STATUS.md") ?? "").split("\n").filter((l) => l.trim());
  before.forEach((l, i) => { if (lines[i] !== l) p.push(`STATUS.md line ${i + 1} was rewritten; STATUS.md is append-only`); });
  const added = lines.slice(before.length);
  const want = key.status?.lines ?? [];
  if (added.length !== want.length) p.push(`STATUS.md gained ${added.length} line(s), expected ${want.length}`);
  added.forEach((line, i) => {
    const f = line.split(" | ");
    const w = want[i];
    if (f.length !== 5) { p.push(`STATUS line ${before.length + i + 1} has ${f.length} fields, expected 5`); return; }
    if (!/^\d{4}-\d{2}-\d{2} \(clock: (tool|host-supplied|user-stated|assumed)\)$/.test(f[0])) p.push(`STATUS line ${before.length + i + 1}: date field "${f[0]}" lacks a clock source`);
    if (!/^ow-build-plan \d+\.\d+\.\d+$/.test(f[1])) p.push(`STATUS line ${before.length + i + 1}: skill field is "${f[1]}"`);
    if (!w) return;
    if (f[2] !== w.path) p.push(`STATUS line ${before.length + i + 1}: path ${f[2]}, expected ${w.path}`);
    if (f[3] !== `next: ${w.next}`) p.push(`STATUS line ${before.length + i + 1}: "${f[3]}", expected "next: ${w.next}"`);
    if (f[4] !== `awaiting: ${w.awaiting}`) p.push(`STATUS line ${before.length + i + 1}: "${f[4]}", expected "awaiting: ${w.awaiting}"`);
  });
  return p;
}

function checkPrivateNames(key, run) {
  const p = [];
  const names = key.private_names ?? [];
  // The user's own say: lines, filled with the file each destination is for.
  const files = { contract: `${plansDir(key)}/contract-inputs.md`, build: `${plansDir(key)}/build-request.md` };
  const allowed = Object.entries(files).map(([d, f]) => handoffSay(run, d)?.replace(/\{files\}/g, f)).filter(Boolean);
  for (const rel of run.written().filter((r) => TEXT.test(r))) {
    (run.read(rel) ?? "").split("\n").forEach((line, i) => {
      for (const n of names) {
        const re = new RegExp(`(?<![\\w-])${esc(n)}(?![\\w-])`, "i");
        if (!re.test(line)) continue;
        // The user's own say: line, printed exactly, is the one place a private name may appear.
        const stripped = allowed.reduce((l, say) => l.split(say).join(" "), line);
        if (re.test(stripped)) p.push(`${rel}:${i + 1}: names "${n}"`);
      }
    });
  }
  for (const say of key.require_say ?? []) {
    const filled = say.replace(/\{files\}/g, `${plansDir(key)}/contract-inputs.md`);
    if (!run.written().some((r) => (run.read(r) ?? "").includes(filled))) p.push(`the handoffs.yaml say: line "${filled}" is not printed exactly`);
  }
  return p;
}

/**
 * "use ow-build-plan on <path>" (bug 1 of eval round 1): the handed-over file
 * decides the verb. An intake record goes by the recap's path_kind
 * (build-plan -> the offer, defined-work -> the quick quote); a FIX-nn.md
 * becomes a follow-on offer in its own folder.
 */
function checkRoute(key, run) {
  const p = [];
  const from = key.route.from;
  const dir = plansDir(key);
  const written = run.written();
  const has = (f) => written.includes(`${dir}/${f}`);
  const prior = (f) => run.priorRead(`${dir}/${f}`) != null;
  let expect;
  if (/\/fixes\/FIX-\d+\.md$/.test(from)) {
    // Read the FIX file's class first (eval round 3, bug 8): a covered Fix is free under the fix window.
    const fix = run.read(from);
    let cls = null;
    try { cls = fix == null ? null : String(matter(fix).data.classification ?? "").trim().toLowerCase(); } catch { cls = null; }
    expect = cls === "fix" ? "covered fix" : cls === "change" || cls === "after the window" ? "follow-on offer" : "ask";
  }
  else if (/^intake\/[^/]+\/intake-record\.md$/.test(from)) {
    const recap = run.read(from.replace(/intake-record\.md$/, "recap.md"));
    const kind = recap ? matter(recap).data.path_kind : null;
    expect = { "build-plan": "offer", "defined-work": "quick quote", "feasibility": "quick quote", "next-stage": "start" }[kind] ?? "ask";
    // Never twice (eval round 4, new 10): a folder that already holds what the verb writes is routed as a folder.
    const already = { offer: "build-plan-offer.md", "quick quote": "quote.md", start: "plan.yaml" }[expect];
    if (already && prior(already)) {
      if (has(already)) p.push(`${dir}/${already}: ${dir}/ already held one before the run; the route never runs that verb twice, it routes the folder instead`);
      expect = "existing folder";
    }
    if (kind === "feasibility" && run.written().includes(`${dir}/quote.md`)) {
      // A feasibility test is priced as the price book's feasibility-test unit, nothing else.
      const units = quote(run, key).pricing.filter((r) => /^WP-/.test(r.package)).map((r) => r.unit);
      const marked = (book(run).units ?? []).filter((u) => u.feasibility === true).map((u) => u.id);
      const want = marked.length ? marked.join(" or ") : (key.route.unit ?? "feasibility-test");
      if (!units.length || units.some((u) => !(marked.length ? marked.includes(u) : u === want))) p.push(`${from} is a feasibility recap: the quick quote is priced as the ${want} unit, but its lines use ${units.join(", ") || "none"}`);
    }
    const before = (run.priorRead("STATUS.md") ?? "").split("\n").filter((l) => l.trim()).at(-1) ?? "";
    if (!before.includes(`next: ow-build-plan on ${from}`)) p.push(`the starting STATUS.md does not hand ${from} to ow-build-plan (its newest line is "${before}")`);
  } else if (/^plans\/[^/]+\/$/.test(from)) {
    // A folder routes by its files first (routing-and-resume.md 2.3); an existing quote is never quoted again.
    const exported = prior("export/export-report.md") || (run.priorRead("STATUS.md") ?? "").split("\n").some((l) => l.includes(`${dir}/export/`));
    if (prior("build-request.md")) expect = "nothing";
    else if (prior("contract-inputs.md")) expect = "signed";
    else if (prior("quote.md") && exported) expect = "accepted";
    else expect = "next step";
  } else return [`route: ${from} is neither an intake record, a FIX file nor a plans/ folder`];
  if (key.route.expect && key.route.expect !== expect) p.push(`this case expects the route "${key.route.expect}", but ${from} routes to "${expect}"`);
  const offer = has("build-plan-offer.md");
  const quick = has("quick-scope.md") || has("quote.md");
  const planWork = ["plan.yaml", "collection.md", "evidence.md", "scope.md"].filter(has).concat(written.filter((f) => f.startsWith(`${dir}/map/`)).map((f) => f.slice(dir.length + 1)));
  if (expect === "offer" || expect === "follow-on offer") {
    if (!offer) p.push(`${from} routes to /ow-build-plan-offer, but ${dir}/build-plan-offer.md was not written`);
    if (quick || has("plan.yaml")) p.push(`${from} routes to the offer only; the run wrote ${written.filter((f) => /quote|scope|plan\.yaml/.test(f)).join(", ")}`);
    if (offer) {
      const subject = parsed(run, `${dir}/build-plan-offer.md`, "md").data.subject;
      const want = expect === "offer" ? from.replace(/intake-record\.md$/, "recap.md") : from;
      if (subject !== want) p.push(`${dir}/build-plan-offer.md: subject ${subject}, expected ${want}`);
    }
    if (expect === "follow-on offer") {
      const client = from.split("/")[1];
      if (!new RegExp(`^${esc(client)}-\\d+$`).test(key.slug)) p.push(`a follow-on goes in plans/${client}-<n>/, not ${dir}/`);
      for (const f of written) if (f.startsWith(`plans/${client}/`)) p.push(`${f}: the follow-on offer wrote into the earlier plan's folder`);
    }
  } else if (expect === "quick quote") {
    if (!has("quick-scope.md") || !has("quote.md")) p.push(`${from} routes to /ow-build-plan-quote --quick, but ${dir}/quick-scope.md and quote.md were not both written`);
    if (offer) p.push(`${from} routes to the quick quote, but an offer was written`);
    if (planWork.length) p.push(`${from} routes to the quick quote, which has no Build Plan; the run also wrote ${planWork.join(", ")}`);
    if (has("quick-scope.md") && parsed(run, `${dir}/quick-scope.md`, "md").data.subject !== from) p.push(`${dir}/quick-scope.md: its subject is not ${from}`);
  } else if (expect === "start") {
    if (!has("plan.yaml") || !has("collection.md")) p.push(`${from} is delivery-mode work already signed, which routes to /ow-build-plan-start; ${dir}/plan.yaml and collection.md were not both written`);
    if (offer) p.push(`${from} is work already signed: never an offer, but ${dir}/build-plan-offer.md was written`);
    if (quick) p.push(`${from} routes to -start, but a quote or quick scope was written`);
    if (has("plan.yaml")) {
      const plan = parsed(run, `${dir}/plan.yaml`, "yaml");
      if (plan.intake !== from) p.push(`${dir}/plan.yaml: intake is ${plan.intake}, expected ${from}`);
      if (plan.fee !== "none") p.push(`${dir}/plan.yaml: fee is ${plan.fee}; signed work has no Build Plan fee`);
    }
  } else if (expect === "accepted" || expect === "signed") {
    const want = expect === "accepted" ? "contract-inputs.md" : "build-request.md";
    if (!has(want)) p.push(`${from} holds a ${expect === "accepted" ? "sent quote" : "accepted quote"}, so it routes to /ow-build-plan-quote --${expect}; ${dir}/${want} was not written`);
    for (const f of ["quote.md", "quote-items.json"]) if (has(f)) p.push(`${from}: the route ran -quote again over the existing quote (${dir}/${f} rewritten); it must run --${expect}`);
    if (expect === "accepted" && has("build-request.md")) p.push(`${from}: a build request was written before the acceptance was recorded`);
  } else if (expect === "nothing") {
    // Signed: print the signed NEXT and stop. Nothing is written anywhere, and no other skill's verb is run.
    for (const f of written) p.push(`${f}: ${from} is signed, so the route prints the signed NEXT and stops; it writes nothing`);
  } else if (expect === "covered fix") {
    // A covered Fix is free under the fix window: never offered, started or quoted as paid work.
    for (const f of written) p.push(`${f}: ${from} is a covered Fix (classification: fix), free under the fix window; the route says so and writes nothing`);
  } else if (expect === "ask" && /\/fixes\/FIX-\d+\.md$/.test(from)) {
    for (const f of written) p.push(`${f}: ${from} has no paid class (change or after the window); the route asks the user before writing anything`);
  } else if (expect === "ask" && written.some((f) => f.startsWith(`${dir}/`))) p.push(`${from} has no path this skill routes on its own, so it asks before writing; the run wrote ${dir}/`);
  // Never -start over an existing plan, and never a second quote file.
  if (prior("plan.yaml") && has("plan.yaml")) p.push(`${dir}/plan.yaml: the route ran -start over an existing plan; a folder with a plan resumes at its next step`);
  p.push(...secondQuotes(run, dir));
  // A route works in one folder (eval round 4, N15): nothing else but its STATUS line.
  if (!["nothing", "covered fix"].includes(expect)) {
    for (const f of written) if (!f.startsWith(`${dir}/`) && f !== "STATUS.md") p.push(`${f}: the route works in ${dir}/ only; it wrote outside it`);
  }
  return p;
}

/**
 * What a feasibility test never offers (owner decision 2026-10-16), by meaning:
 * fix periods however worded, client acceptance testing or sign-off, training,
 * documentation or handover, and any build, milestone, demo or hand-off to a
 * builder. "Whether a build is worth doing" (the go or no-go) stays allowed.
 */
const FEASIBILITY_FORBIDDEN = [
  [/\bfix(?:es|ing)?\b|bug[- ]?fix|\bfixed (?:free|for free|at no (?:extra )?charge)\b|\bwarranty\b|\bdefects? (?:period|window)\b|\b(?:after[- ]?care|care) period\b|\banything that breaks\b|\b(?:days?|weeks?|months?|fortnight) of (?:support|cover|corrections)\b/i, "a fix window"],
  [/\buser acceptance\b|\bUAT\b|\btesters?\b|\bacceptance (?:tests?|testing|sessions?|run|sign[- ]?off)\b|\bsign(?:s|ed|ing)?[- ]off\b|\btests? it in\b|\b(?:your|the client's|their) (?:team|staff|people|users) (?:tests?|checks?|tries|try)\b/i, "user acceptance testing"],
  [/\btrain(?:ing|ed|s|er)?\b|\bdocumentation\b|\bguides?\b|\bmanuals?\b|\bhand-?over\b|\bonboard(?:ing|ed)?\b|\bwalk-?through\b|\bhow-to\b/i, "documentation, training or handover"],
  [/\bmilestones?\b|\bdemos?\b|\bhand-?off\b|\bhand(?:s|ed)? (?:it |the results |them )?(?:over |on )?to (?:the |a |your )?builder|\bbuilders?\b|\bbuild request\b|\bow-build\b(?!-plan)|\bwe (?:will |then )?build\b|\bthe build (?:starts|includes|will|phase)\b|\bbuild phase\b/i, "a build, milestone, demo or hand-off"],
];

/**
 * A feasibility quote carries just the test (owner decision 2026-10-16): price,
 * what is tested, what the client gets (a findings note and a go or no-go),
 * payment terms and validity. No testing line, fix window, training line, or
 * build hand-off anywhere in the run.
 */
function checkFeasibility(key, run) {
  const p = [];
  const dir = plansDir(key);
  const q = quote(run, key);
  if (q.data.mode !== "feasibility") p.push(`${q.rel}: mode is ${q.data.mode}, expected feasibility`);
  for (const k of ["uat", "documentation_training", "fix_window_days", "build_size", "build_size_source", "vendor_subscriptions", "credit_deadline", "build_plan_fee"]) {
    if (k in q.data) p.push(`${q.rel}: header key ${k}; a feasibility quote carries just the test`);
  }
  // Matched by meaning, not by one phrase (paraphrases count): a feasibility test offers none of these.
  const scan = (rel, text) => text.split("\n").forEach((l) => {
    for (const [re, what] of FEASIBILITY_FORBIDDEN) if (re.test(l)) p.push(`${rel}: carries ${what} ("${l.trim().slice(0, 60)}"); a feasibility test offers none`);
  });
  scan(`${q.rel} (client part)`, q.client);
  const ciRel = `${dir}/contract-inputs.md`;
  if (run.exists(ciRel)) scan(ciRel, parsed(run, ciRel, "md").content);
  for (const s of ["What is tested", "What you get", "Price", "Payment schedule", "Valid until"]) if (sectionText(q.client, s) == null) p.push(`${q.rel}: no "## ${s}" section`);
  const get = sectionText(q.client, "What you get") ?? "";
  if (!/findings note/i.test(get) || !/no-go/i.test(get)) p.push(`${q.rel}: "What you get" must name the findings note and the go or no-go`);
  if (!amountRe(cents(q.data.fixed_price)).test(sectionText(q.client, "Price") ?? "")) p.push(`${q.rel}: "## Price" does not state the price ${money(cents(q.data.fixed_price))}`);
  const scope = run.read(`${dir}/quick-scope.md`);
  if (scope && sectionText(matter(scope).content, "UAT approach") != null) p.push(`${dir}/quick-scope.md: a feasibility test has no testers, so no "## UAT approach"`);
  // No build hand-off: no build request, and no NEXT to ow-build, anywhere the run wrote.
  for (const f of run.written()) {
    if (/\/build-request\.md$/.test(f)) p.push(`${f}: a feasibility test hands over no build; --signed writes no build request`);
    if (/use ow-build to start|\/ow-build-start/.test(run.read(f) ?? "")) p.push(`${f}: names the ow-build hand-off; after a feasibility test the findings note follows, and on a go a Build Plan offer`);
  }
  return p;
}

const CHECKS = {
  feasibility: checkFeasibility,
  route: checkRoute,
  quote_frozen: checkQuoteFrozen,
  headers: checkHeaders,
  offer: checkOffer,
  start: checkStart,
  follow_on: checkFollowOn,
  plan_checks: checkPlan,
  credentials: checkCredentials,
  builder_neutral: checkBuilderNeutral,
  unpriced: checkUnpriced,
  modifiers: checkModifiers,
  dates_terms: checkDates,
  uat_lines: checkUat,
  internal_appendix: checkInternal,
  fix_window: checkFixWindow,
  accepted: checkAccepted,
  signed: checkSigned,
  signed_refusal: checkSignedRefusal,
  quick: checkQuick,
  quick_refusal: checkQuickRefusal,
  status: checkStatus,
  private_names: checkPrivateNames,
};

/** Run a case's checks against its golden run, or a real run folder. Returns [{ check, problems }]. */
export function runCase(caseName, runDir = null, { caseDir = join(FIXTURES, caseName) } = {}) {
  let key;
  try {
    key = loadKey(caseDir);
    if (!key || typeof key !== "object") throw new Error("the answer key is not a map");
    if (!Array.isArray(key.checks)) throw new Error("`checks` must be a list of check names");
  } catch (e) {
    // A broken key fails this case on its own; the other cases still run (eval round 1, bug 11).
    return [{ check: "answer-key", problems: [`answer-key.yaml could not be used: ${reason(e)}`] }];
  }
  let run;
  try {
    run = runView(caseName, runDir);
  } catch (e) {
    return (key.checks ?? []).map((check) => ({ check, problems: [`run could not be read: ${reason(e)}`] }));
  }
  // Audit F-004 (ow-start follow-up): a check that throws fails on its own with a
  // one-line reason; the others still run and report.
  return (key.checks ?? []).map((check) => {
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
  const work = join(dir, "opchain-work");
  if (existsSync(work)) throw new Error(`${work} already exists; use an empty folder`);
  mkdirSync(work, { recursive: true });
  for (const [rel, src] of Object.entries(SHIPPED)) cpSync(src, join(work, rel));
  for (const layer of [...priorLayers(owner(caseName))].reverse()) if (existsSync(layer)) cpSync(layer, work, { recursive: true });
  // Session material (what the user does in the session, such as connecting read-only access) along the chain.
  for (const layer of priorLayers(owner(caseName))) {
    const session = join(layer, "..", "session");
    if (layer.startsWith(FIXTURES) && existsSync(session)) cpSync(session, join(dir, "session"), { recursive: true });
  }
  return work;
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
      console.log(`Prepared ${work}. Attach ${resolve(args[2])} to a session with ow-build-plan installed and follow tests/fixtures/ow-build-plan/README.md for "${key.case}" (${key.section}).`);
      console.log(`Then: node scripts/ow-build-plan-acceptance.mjs ${args[1]} ${resolve(args[2])}`);
    } else if (args.length === 2) {
      process.exit(report(args[0], runCase(args[0], resolve(args[1]))) ? 1 : 0);
    } else {
      let failed = 0;
      for (const c of listCases()) failed += report(`${c} (golden run)`, runCase(c)) ? 1 : 0;
      process.exit(failed ? 1 : 0);
    }
  } catch (e) {
    console.error(`ow-build-plan-acceptance: ${reason(e)}`);
    process.exit(2);
  }
}
