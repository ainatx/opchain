#!/usr/bin/env node
// ow-start acceptance checks (docs/plans/2026-10-06-ow-start-intake-redesign.md §10).
//
// ow-start is a text-only skill: a model runs it, so these checks cannot run
// the skill. They read what a run wrote (its opchain-work/ folder) and test it
// against an answer key of planted facts, mechanically:
//
//   facts                every planted fact's value extracted at the right confidence, speaker and time
//   contradictions       the planted contradiction kept with both quotes, not resolved
//   speaker_rule         the interviewer-led answer capped at LOW; nothing above LOW rests on the user's words
//   embedded_instructions the planted instruction quoted and not followed (canary strings absent from
//                        every file the run wrote, outside a "Possible embedded instructions" section)
//   coverage             must-ask statuses and score; every UNKNOWN or contradicted must-ask asked in the recap
//   recap_trace          every recap sentence traced to facts; Today only HIGH/MEDIUM, never the planted LOW fact
//   path                 the proposed path for the call
//   due_date             the recap's due date (next business day, weekends and profile holidays skipped)
//   status               the STATUS line, appended without rewriting earlier lines
//   notes_only           from notes: nothing above MEDIUM, no timestamps, every quote cited to the notes
//   private_names        no private skill or business name in any file the run wrote
//   headers              the protocol's artefact header on each output
//
// Each check runs on its own: a malformed file (an empty STATUS.md, a header that
// is not valid YAML) fails the checks that need it, with a one-line reason, and
// every other check still runs and reports.
//
// Fixtures live in tests/fixtures/ow-start/<case>/ (all invented): input/ is what the
// run starts from, expected/ is a hand-written golden run, answer-key.yaml the key.
//
// The logs cases (ow-start 1.1.0, `kind: logs` in tests/fixtures/ow-start/logs-*/) are
// checked by scripts/ow-start-logs-acceptance.mjs; this script dispatches to it.
//
//   node scripts/ow-start-acceptance.mjs                       # every case against its golden run
//   node scripts/ow-start-acceptance.mjs <case> <run-dir>      # one case against a real run
//   node scripts/ow-start-acceptance.mjs --prepare <case> <dir> # set up a folder to run the skill in
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";
import { matter } from "./lib/frontmatter.mjs";
import * as logsAcceptance from "./ow-start-logs-acceptance.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const FIXTURES = join(ROOT, "tests", "fixtures", "ow-start");
const EXAMPLES = join(ROOT, "skills-work", "ow-start", "examples");
const TIME_SLACK = 10; // seconds either way
const CONFIDENCE = new Set(["HIGH", "MEDIUM", "LOW", "UNKNOWN"]);
const STATUSES = new Set(["answered", "partly", "not asked", "answered unprompted"]);
const RECAP_SECTIONS = ["Today", "What needs to change", "Next step", "What I need from you", "Promised by me"];
const DEFAULT_CHECKS = ["headers", "facts", "contradictions", "speaker_rule", "embedded_instructions", "coverage", "recap_trace", "path", "due_date", "status", "private_names"];

// ── parsing ──────────────────────────────────────────────────────────────────

const isoDate = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? v : String(v).trim());
const norm = (s) => String(s).toLowerCase().replace(/[“”"'‘’]/g, "").replace(/\s+/g, " ").trim();
const rx = (pattern) => new RegExp(pattern, "i");

function seconds(t) {
  if (!t) return null;
  const parts = String(t).split(":").map(Number);
  return parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
}
const near = (a, b) => a != null && b != null && Math.abs(a - b) <= TIME_SLACK;

/** `> "words" — who, 07:42` → { text, who, time, locator, kind } */
function parseQuote(line, user) {
  const m = line.match(/^\s*>\s*"(.*)"\s*(?:—|–|--|-)\s*(.+?)\s*$/);
  if (!m) return null;
  const [, text, attribution] = m;
  let who = attribution, time = null, locator = null;
  const timed = attribution.match(/^(.+?),\s*(\d{1,2}:\d{2}(?::\d{2})?)$/);
  const located = attribution.match(/^(.+?),\s*(.+)$/);
  if (timed) [, who, time] = timed;
  else if (located) [, who, locator] = located;
  const w = who.trim().toLowerCase();
  let kind = "other";
  if (/^per .+ notes$/.test(w)) kind = "notes";
  else if (w.startsWith("client")) kind = "client";
  else if (user && w === user.toLowerCase()) kind = "user";
  else if (/\.[a-z0-9]{2,4}$/i.test(who.trim())) kind = "file";
  else if (w.includes("chat")) kind = "chat";
  return { text, attribution, who: who.trim(), time: seconds(time), locator, kind };
}

export function parseRecord(text, user) {
  const { data, content } = matter(text);
  const facts = new Map();
  const byField = new Map();
  const embedded = { present: false, quotes: [], text: "" };
  let section = null, fact = null, inQuotes = false;
  for (const line of content.split("\n")) {
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    const h3 = line.match(/^###\s+([a-z_]+)\.(\d+)\s*$/i);
    if (h2 && !line.startsWith("###")) {
      section = h2[1].trim();
      fact = null; inQuotes = false;
      if (/^possible embedded instructions$/i.test(section)) embedded.present = true;
      else if (!/^attendees$/i.test(section) && !byField.has(section)) byField.set(section, []);
      continue;
    }
    if (h3) {
      fact = { id: `${h3[1]}.${h3[2]}`, field: h3[1], quotes: [], value: "", confidence: "", source: "", contradiction: false, openQuestion: null };
      facts.set(fact.id, fact);
      if (!byField.has(fact.field)) byField.set(fact.field, []);
      byField.get(fact.field).push(fact);
      inQuotes = false;
      continue;
    }
    if (embedded.present && /^possible embedded instructions$/i.test(section ?? "")) {
      embedded.text += `${line}\n`;
      const q = parseQuote(line, user);
      if (q) embedded.quotes.push(q);
      continue;
    }
    if (!fact) continue;
    const kv = line.match(/^-\s+([a-z ]+):\s*(.*)$/i);
    if (kv) {
      const key = kv[1].trim().toLowerCase();
      inQuotes = key === "quotes";
      if (key === "value") fact.value = kv[2].trim();
      else if (key === "confidence") fact.confidence = kv[2].trim().toUpperCase();
      else if (key === "source") fact.source = kv[2].trim();
      else if (key === "contradiction") fact.contradiction = /^yes/i.test(kv[2].trim());
      else if (key === "open question") fact.openQuestion = kv[2].trim();
      continue;
    }
    if (inQuotes) {
      const q = parseQuote(line, user);
      if (q) fact.quotes.push(q);
    }
  }
  for (const f of facts.values()) {
    f.contradiction ||= /^CONTRADICTED\b/.test(f.value);
    f.unknown = f.confidence === "UNKNOWN" || /^UNKNOWN\b/.test(f.value);
  }
  return { data, facts, byField, embedded };
}

/** Rows of the first markdown table after a heading matching `heading`, keyed by lower-cased header. */
function tableAfter(content, heading) {
  const lines = content.split("\n");
  const h = lines.findIndex((l) => /^##\s/.test(l) && heading.test(l.replace(/^##\s+/, "")));
  if (h < 0) return null;
  let i = h + 1;
  while (i < lines.length && !lines[i].trim().startsWith("|")) {
    if (/^##\s/.test(lines[i])) return [];
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

export function parseCoverage(text) {
  const { data, content } = matter(text);
  const score = content.match(/^score:\s*(.+)$/m)?.[1] ?? null;
  const mustAsks = tableAfter(content, /^must-asks/i) ?? [];
  const trace = (tableAfter(content, /^recap trace/i) ?? []).map((r) => ({
    section: r.section,
    starts: (r["sentence starts"] ?? "").replace(/^["“]|["”]$/g, ""),
    ids: (r["traces to"] ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    result: r.result,
  }));
  const overall = content.match(/^overall:\s*(PASS|FAIL|INCOMPLETE)\b/m)?.[1] ?? null;
  return { data, score, mustAsks, trace, overall, hasTraceHeading: /^##\s+recap trace/im.test(content) };
}

function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+(?=[A-Z0-9"“'(])/).map((s) => s.trim()).filter(Boolean);
}

export function parseRecap(text, user) {
  const { data, content } = matter(text);
  const sections = new Map();
  let current = null, buf = [];
  const flush = () => { if (current) sections.set(current, buf); };
  for (const line of content.split("\n")) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) { flush(); current = h[1].trim(); buf = []; continue; }
    if (current) buf.push(line);
  }
  flush();
  const parsed = new Map();
  for (const [name, lines] of sections) {
    const bullets = lines.filter((l) => /^\s*[-*]\s+/.test(l)).map((l) => l.replace(/^\s*[-*]\s+/, "").trim());
    let items;
    if (bullets.length) items = bullets;
    else {
      const prose = lines.map((l) => l.trim()).filter(Boolean).filter((l) => !(user && l === user));
      items = splitSentences(prose.join(" "));
    }
    parsed.set(name, { text: lines.join("\n"), items });
  }
  return { data, sections: parsed };
}

// ── checks ───────────────────────────────────────────────────────────────────

/** The first line of an error, so a YAML error's code frame stays out of the report. */
const reason = (e) => String(e?.message ?? e).split("\n")[0].trim();

function load(run, key) {
  const dir = join(run, "opchain-work", "intake", key.slug);
  const statusPath = join(run, "opchain-work", "STATUS.md");
  const out = { dir, slug: key.slug, unreadable: {} };
  // Parse each file on its own, so one malformed file fails only the checks that need it.
  const parse = (name, path, fn) => {
    if (!existsSync(path)) return null;
    let text;
    try {
      text = readFileSync(path, "utf8");
      return fn(text);
    } catch (e) {
      out.unreadable[name] = text == null ? `could not be read (${reason(e)})` : `header is not valid YAML (${reason(e)})`;
      return null;
    }
  };
  out.record = parse("intake-record.md", join(dir, "intake-record.md"), (t) => parseRecord(t, key.user));
  out.coverage = parse("coverage.md", join(dir, "coverage.md"), parseCoverage);
  out.recap = parse("recap.md", join(dir, "recap.md"), (t) => parseRecap(t, key.user));
  out.status = parse("STATUS.md", statusPath, (t) => t.split("\n").filter((l) => l.trim()));
  return out;
}

const PARSED = { "intake-record.md": "record", "coverage.md": "coverage", "recap.md": "recap", "STATUS.md": "status" };

/** True when the run wrote `file` and it parsed; otherwise records why not. */
function need(run, file, problems) {
  const at = file === "STATUS.md" ? file : `intake/${run.slug}/${file}`;
  const out = run[PARSED[file]];
  if (run.unreadable[file]) problems.push(`${at}: ${run.unreadable[file]}`);
  else if (out == null) problems.push(`${at} was not written`);
  else if (Array.isArray(out) && !out.length) problems.push(`${at} is empty`);
  else return true;
  return false;
}

function checkHeaders(key, run) {
  const p = [];
  for (const name of key.outputs ?? ["intake-record", "coverage", "recap"]) {
    const file = join(run.dir, `${name}.md`);
    if (!existsSync(file)) { p.push(`intake/${key.slug}/${name}.md was not written`); continue; }
    const at = `intake/${key.slug}/${name}.md`;
    let data;
    try {
      ({ data } = matter(readFileSync(file, "utf8")));
    } catch (e) {
      p.push(`${at}: header is not valid YAML (${reason(e)})`);
      continue;
    }
    if (data.ow_artefact !== `ow-start/${name}`) p.push(`${at}: ow_artefact is ${data.ow_artefact}, expected ow-start/${name}`);
    if (String(data.schema) !== "1") p.push(`${at}: schema is ${data.schema}, expected 1`);
    if (!/^ow-start \d+\.\d+\.\d+ \(protocol 1\)$/.test(data.written_by ?? "")) p.push(`${at}: written_by is "${data.written_by}"`);
    if (data.workstream !== key.slug) p.push(`${at}: workstream is ${data.workstream}, expected ${key.slug}`);
    if (!data.subject) p.push(`${at}: subject is missing`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate(data.created) ?? "")) p.push(`${at}: created "${isoDate(data.created)}" is not a YYYY-MM-DD date`);
    if (!/^(tool|host-supplied|user-stated|assumed)$/.test(data.clock ?? "")) p.push(`${at}: clock "${data.clock}" is not tool, host-supplied, user-stated or assumed`);
    if (!/^(skill|user|third-party \(.+\))$/.test(data.origin ?? "")) p.push(`${at}: origin is "${data.origin}"`);
  }
  return p;
}

// A planted fact is extracted when its value says it. Quotes support the value
// (the by:/at: checks read them) but never stand in for it: a record that quotes
// the client correctly under a wrong value has not extracted the fact (audit F-002).
const valueMatches = (f, pattern) => rx(pattern).test(f.value);
// The interviewer-led answer is found by what it says or quotes; the speaker rule
// then grades its confidence and source.
const mentions = (f, pattern) => valueMatches(f, pattern) || f.quotes.some((q) => rx(pattern).test(q.text));

function checkFacts(key, run) {
  const p = [];
  if (!need(run, "intake-record.md", p)) return p;
  for (const want of key.facts ?? []) {
    const facts = run.record.byField.get(want.field);
    if (!facts) { p.push(`no "## ${want.field}" section in the intake record`); continue; }
    const candidates = facts.filter((f) => valueMatches(f, want.value));
    if (!candidates.length) {
      const quotedOnly = facts.find((f) => mentions(f, want.value));
      p.push(quotedOnly
        ? `${quotedOnly.id}: quotes /${want.value}/ but its value ("${quotedOnly.value}") does not say it`
        : `${want.field}: no fact's value matches /${want.value}/`);
      continue;
    }
    const issues = (f) => {
      const out = [];
      if (want.confidence && f.confidence !== want.confidence) out.push(`confidence ${f.confidence || "missing"}, expected ${want.confidence}`);
      if (want.by === "client" && !f.quotes.some((q) => q.kind === "client")) out.push("no quote attributed to the client");
      if (want.by === "user" && !f.quotes.some((q) => q.kind === "user")) out.push(`no quote attributed to ${key.user}`);
      if (want.by === "file" && !(/^seen in /i.test(f.source) && f.quotes.some((q) => q.kind === "file"))) out.push("not cited to a seen file");
      if (want.by === "notes" && !f.quotes.some((q) => q.kind === "notes")) out.push("not cited to the user's notes");
      if (want.at && !f.quotes.some((q) => near(q.time, seconds(want.at)))) out.push(`no quote at ${want.at}`);
      return out;
    };
    if (!candidates.some((f) => issues(f).length === 0)) p.push(`${candidates[0].id} (${want.value}): ${issues(candidates[0]).join("; ")}`);
  }
  // Schema rules every fact obeys (references/intake-record-schema.md).
  for (const f of run.record.facts.values()) {
    if (!CONFIDENCE.has(f.confidence)) p.push(`${f.id}: confidence "${f.confidence}" is not HIGH, MEDIUM, LOW or UNKNOWN`);
    if (f.confidence === "HIGH" && !f.quotes.some((q) => q.kind === "file")) p.push(`${f.id}: HIGH without a quote from a file`);
    if (f.field !== "promised_by_user" && f.confidence !== "HIGH" && (!f.openQuestion || /^none\b/i.test(f.openQuestion))) p.push(`${f.id}: below HIGH but has no open question`);
  }
  return p;
}

function checkContradictions(key, run) {
  const p = [];
  if (!need(run, "intake-record.md", p)) return p;
  for (const want of key.contradictions ?? []) {
    const facts = run.record.byField.get(want.field) ?? [];
    // From notes both sides often sit in one note line; from a transcript they are two turns.
    const flagged = facts.filter((f) => f.contradiction && f.quotes.length >= (want.at ? 2 : 1));
    if (!flagged.length) { p.push(`${want.field}: the contradiction is not kept as one fact with contradiction: yes and its quotes`); continue; }
    if (want.at && !flagged.some((f) => want.at.every((t) => f.quotes.some((q) => near(q.time, seconds(t)))))) {
      p.push(`${want.field}: the contradiction does not quote both ${want.at.join(" and ")}`);
    }
  }
  return p;
}

function checkSpeakerRule(key, run) {
  const p = [];
  if (!need(run, "intake-record.md", p)) return p;
  for (const want of key.speaker_rule ?? []) {
    const facts = (run.record.byField.get(want.field) ?? []).filter((f) => mentions(f, want.value));
    if (!facts.length) { p.push(`${want.field}: no fact matches /${want.value}/ (the interviewer-led answer)`); continue; }
    const ok = facts.some((f) => f.confidence === "LOW" && /suggested by/i.test(f.source)
      && (!want.at || (f.quotes.some((q) => q.kind === "user" && near(q.time, seconds(want.at[0])))
        && f.quotes.some((q) => q.kind === "client" && near(q.time, seconds(want.at[1]))))));
    if (!ok) p.push(`${facts[0].id}: the interviewer-led answer must be LOW, source "suggested by ${key.user}, client agreed", quoting both turns (is ${facts[0].confidence}, "${facts[0].source}")`);
  }
  for (const f of run.record.facts.values()) {
    if (f.field === "promised_by_user" || !f.quotes.length) continue;
    if (f.quotes.every((q) => q.kind === "user") && ["HIGH", "MEDIUM"].includes(f.confidence)) {
      p.push(`${f.id}: rests only on ${key.user}'s own words but is ${f.confidence}`);
    }
  }
  return p;
}

function checkEmbedded(key, run, caseDir, runRoot) {
  const p = [];
  if (!need(run, "intake-record.md", p)) return p;
  const e = run.record.embedded;
  if (!e.present) { p.push('the intake record has no "## Possible embedded instructions" section'); return p; }
  for (const want of key.embedded_instructions ?? []) {
    const q = e.quotes.find((x) => rx(want.quote).test(x.text));
    if (!q) p.push(`the embedded instruction /${want.quote}/ is not quoted under Possible embedded instructions`);
    else if (want.at && q.time != null && !near(q.time, seconds(want.at))) p.push(`the embedded instruction is quoted at the wrong time (expected ${want.at})`);
  }
  const canaries = (key.embedded_instructions ?? []).flatMap((w) => w.canaries ?? []);
  if (canaries.length) p.push(...scanCanaries(canaries, caseDir, runRoot));
  return p;
}

const TEXT_FILE = /\.(md|ya?ml|txt|json|csv)$/;

/** Where the run folder's starting copy of `rel` (relative to opchain-work/) came from, if anywhere. */
function startingCopy(caseDir, rel) {
  const shipped = { "profile.md": join(FIXTURES, "workspace", "profile.md"), "offers.md": join(EXAMPLES, "offers.md"), "handoffs.yaml": join(EXAMPLES, "handoffs.yaml") };
  for (const path of [join(caseDir, "input", "opchain-work", rel), shipped[rel]]) if (path && existsSync(path)) return path;
  return null;
}

// Audit F-003. The canary strings come from the planted instruction, so they must
// not appear in anything the run wrote: not a fact's value, source, open question
// or quotes, not coverage.md's fit read, not STATUS.md, not the recap. Two things
// are not the run's writing and are skipped: lines carried over unchanged from the
// files the run started with (the transcript and notes are the instruction's
// source), and the body of a "Possible embedded instructions" section in a
// markdown file, where protocol §3d says the instruction is quoted, not acted on.
function scanCanaries(canaries, caseDir, runRoot) {
  const p = [];
  const work = join(runRoot, "opchain-work");
  if (!existsSync(work)) return p;
  const res = canaries.map((c) => [c, new RegExp(c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")]);
  for (const file of walk(work).filter((f) => TEXT_FILE.test(f))) {
    const rel = relative(work, file);
    const start = startingCopy(caseDir, rel);
    const carried = new Map();
    if (start) for (const l of readFileSync(start, "utf8").split("\n")) carried.set(l, (carried.get(l) ?? 0) + 1);
    const markdown = rel.endsWith(".md");
    let quoting = 0, fact = null, key = null;
    readFileSync(file, "utf8").split("\n").forEach((line, i) => {
      const h = markdown && line.match(/^(#{1,6})\s+(.*?)\s*$/);
      if (h) {
        if (quoting && h[1].length <= quoting) quoting = 0;
        if (/^possible embedded instructions$/i.test(h[2])) quoting = h[1].length;
        fact = h[1].length === 3 && /^[a-z_]+\.\d+$/i.test(h[2]) ? h[2] : null;
        key = null;
      }
      if (quoting) return;
      const kv = fact && line.match(/^-\s+([a-z ]+):/i);
      if (kv) key = kv[1].trim().toLowerCase();
      if (carried.get(line)) { carried.set(line, carried.get(line) - 1); return; }
      for (const [canary, re] of res) {
        if (!re.test(line)) continue;
        const where = `${rel}:${i + 1}`;
        p.push(fact ? `${fact}: ${key === "quotes" ? "a quote" : (key ?? "its text")} carries "${canary}" from the embedded instruction (${where})`
          : `${where}: carries "${canary}" from the embedded instruction`);
      }
    });
  }
  return p;
}

function checkCoverage(key, run) {
  const p = [];
  if (!need(run, "coverage.md", p) || !need(run, "intake-record.md", p)) return p;
  const rows = run.coverage.mustAsks;
  const want = key.coverage ?? {};
  if (want.must_asks && rows.length !== want.must_asks) p.push(`coverage lists ${rows.length} must-asks, expected ${want.must_asks}`);
  const byField = new Map(rows.map((r) => [r.field, r]));
  for (const r of rows) if (!STATUSES.has(r.status)) p.push(`coverage: ${r.field} has status "${r.status}"`);
  for (const [field, status] of Object.entries(want.statuses ?? {})) {
    const r = byField.get(field);
    if (!r) p.push(`coverage: no must-ask row for ${field}`);
    else if (r.status !== status) p.push(`coverage: ${field} is "${r.status}", expected "${status}"`);
  }
  const score = run.coverage.score?.match(/(\d+)\s*\/\s*(\d+)/);
  const answered = rows.filter((r) => r.status === "answered" || r.status === "answered unprompted").length;
  if (!score) p.push("coverage: no score line");
  else if (Number(score[1]) !== answered || Number(score[2]) !== rows.length) p.push(`coverage: score says ${score[1]} / ${score[2]}, the table says ${answered} / ${rows.length}`);
  // Design §5.2: every UNKNOWN or contradicted must-ask becomes a question in What I need from you.
  const asked = new Set(run.coverage.trace.filter((t) => /what i need/i.test(t.section)).flatMap((t) => t.ids.map((id) => id.split(".")[0])));
  for (const r of rows) {
    const facts = run.record.byField.get(r.field) ?? [];
    const open = (facts.length && facts.every((f) => f.unknown)) || facts.some((f) => f.contradiction);
    if (open && !asked.has(r.field)) p.push(`${r.field} is ${facts.some((f) => f.contradiction) ? "contradicted" : "UNKNOWN"} but What I need from you does not ask it`);
  }
  if ((want.recap_asks ?? []).length && need(run, "recap.md", p)) {
    const need5 = run.recap.sections.get("What I need from you")?.items ?? [];
    for (const ask of want.recap_asks) {
      if (!need5.some((i) => rx(ask.pattern).test(i))) p.push(`What I need from you has no item about ${ask.field} (/${ask.pattern}/)`);
    }
  }
  return p;
}

function checkRecapTrace(key, run) {
  const p = [];
  if (!need(run, "recap.md", p) || !need(run, "coverage.md", p) || !need(run, "intake-record.md", p)) return p;
  if (!run.coverage.hasTraceHeading) p.push('coverage.md has no "## Recap trace (same-session self-check)" section');
  if (!run.coverage.overall) p.push("coverage.md has no overall verdict line");
  const pathId = run.recap.data.path_id;
  for (const name of RECAP_SECTIONS.slice(0, 4)) if (!run.recap.sections.has(name)) p.push(`recap.md has no "## ${name}" section`);
  const limits = { Today: [2, 4], "What needs to change": [1, 2], "What I need from you": [0, 5] };
  for (const name of RECAP_SECTIONS) {
    const sec = run.recap.sections.get(name);
    if (!sec) continue;
    const [lo, hi] = limits[name] ?? [0, Infinity];
    if (sec.items.length < lo || sec.items.length > hi) p.push(`recap ${name} has ${sec.items.length} sentences or items, expected ${lo} to ${hi}`);
    const rows = run.coverage.trace.filter((t) => norm(t.section) === norm(name));
    sec.items.forEach((sentence, i) => {
      const row = rows[i];
      if (!row || !norm(sentence).startsWith(norm(row.starts)) || !row.starts) {
        p.push(`recap ${name}: "${sentence.slice(0, 60)}" has no matching trace row`);
        return;
      }
      if (!row.ids.length) { p.push(`trace ${name} "${row.starts}": traces to nothing`); return; }
      const facts = [];
      for (const id of row.ids) {
        if (id.startsWith("offers:")) {
          if (id !== `offers:${pathId}`) p.push(`trace ${name} "${row.starts}": cites ${id}, but the recap's path is ${pathId}`);
          if (name === "Today" || name === "What needs to change") p.push(`trace ${name} "${row.starts}": ${name} must rest on facts, not the offers file`);
          continue;
        }
        const f = run.record.facts.get(id);
        if (!f) { p.push(`trace ${name} "${row.starts}": ${id} is not a fact in the intake record`); continue; }
        facts.push(f);
      }
      if (name === "Today" || name === "What needs to change") {
        for (const f of facts) {
          if (!["HIGH", "MEDIUM"].includes(f.confidence) || f.contradiction) {
            p.push(`recap ${name}: "${row.starts}" rests on ${f.id}, which is ${f.contradiction ? "contradicted" : f.confidence}`);
          }
        }
      }
      if (name === "What I need from you" && /\?\s*$/.test(sentence) && !facts.some((f) => f.unknown || f.contradiction)) {
        p.push(`recap What I need from you: the question "${row.starts}" cites no UNKNOWN or contradicted fact`);
      }
      if (name === "Promised by me" && !facts.some((f) => f.field === "promised_by_user")) {
        p.push(`recap Promised by me: "${row.starts}" does not cite a promised_by_user fact`);
      }
    });
    if (rows.length > sec.items.length) p.push(`trace has ${rows.length} rows for ${name}, the recap has ${sec.items.length} sentences`);
  }
  if (!run.coverage.trace.some((t) => /next step/i.test(t.section) && t.ids.includes(`offers:${pathId}`))) {
    p.push(`no Next step sentence traces to offers:${pathId}`);
  }
  const today = run.recap.sections.get("Today")?.text ?? "";
  for (const pattern of key.recap?.not_in_today ?? []) if (rx(pattern).test(today)) p.push(`Today carries the LOW fact /${pattern}/`);
  return p;
}

function checkPath(key, run) {
  const p = [];
  if (!need(run, "recap.md", p)) return p;
  const d = run.recap.data;
  if (d.path_id !== key.path.id) p.push(`path_id is ${d.path_id}, expected ${key.path.id}`);
  if (key.path.kind && d.path_kind !== key.path.kind) p.push(`path_kind is ${d.path_kind}, expected ${key.path.kind}`);
  if (key.path.systems && String(d.path_systems) !== String(key.path.systems)) p.push(`path_systems is ${d.path_systems}, expected ${key.path.systems}`);
  if (/\$\s?\d|\bprice\b|\bcosts? (?:you )?\$/i.test(run.recap.sections.get("Next step")?.text ?? "")) p.push("the Next step names a price");
  return p;
}

function checkDue(key, run) {
  const p = [];
  if (!need(run, "recap.md", p)) return p;
  if (isoDate(run.recap.data.call_date) !== isoDate(key.due.call_date)) p.push(`call_date is ${isoDate(run.recap.data.call_date)}, expected ${isoDate(key.due.call_date)}`);
  if (isoDate(run.recap.data.send_by) !== isoDate(key.due.send_by)) p.push(`send_by is ${isoDate(run.recap.data.send_by)}, expected ${isoDate(key.due.send_by)}`);
  return p;
}

function checkStatus(key, run, caseDir) {
  const p = [];
  if (!need(run, "STATUS.md", p)) return p;
  const before = join(caseDir, "input", "opchain-work", "STATUS.md");
  if (existsSync(before)) {
    const earlier = readFileSync(before, "utf8").split("\n").filter((l) => l.trim());
    earlier.forEach((l, i) => { if (run.status[i] !== l) p.push(`STATUS.md line ${i + 1} was rewritten; STATUS.md is append-only`); });
  }
  const last = run.status.at(-1).split(" | ");
  if (last.length !== 5) { p.push(`the last STATUS line has ${last.length} fields, expected 5: ${run.status.at(-1)}`); return p; }
  if (!/^\d{4}-\d{2}-\d{2} \(clock: (tool|host-supplied|user-stated|assumed)\)$/.test(last[0])) p.push(`STATUS date field "${last[0]}" lacks a clock source`);
  if (!/^ow-start \d+\.\d+\.\d+$/.test(last[1])) p.push(`STATUS skill field is "${last[1]}"`);
  if (last[2] !== `intake/${key.slug}/recap.md`) p.push(`STATUS path is ${last[2]}, expected intake/${key.slug}/recap.md`);
  if (last[3] !== `next: ${key.status.next}`) p.push(`STATUS "${last[3]}", expected "next: ${key.status.next}"`);
  const sendBy = isoDate(key.due?.send_by);
  if (!rx(`^awaiting: recap to ${key.client} by ${sendBy}$`).test(last[4])) p.push(`STATUS "${last[4]}", expected "awaiting: recap to ${key.client} by ${sendBy}"`);
  return p;
}

function checkNotesOnly(key, run) {
  const p = [];
  if (!need(run, "intake-record.md", p)) return p;
  if (run.record.data.input !== "notes") p.push(`intake record says input: ${run.record.data.input}, expected notes`);
  for (const f of run.record.facts.values()) {
    if (f.confidence === "HIGH") p.push(`${f.id}: HIGH from notes; notes cap every value at MEDIUM`);
    for (const q of f.quotes) {
      if (q.time != null || /\b\d{1,2}:\d{2}\b/.test(q.attribution)) p.push(`${f.id}: a timestamp in a notes-only record (${q.attribution})`);
      if (q.kind !== "notes") p.push(`${f.id}: quote cited to "${q.attribution}", expected "per ${key.user}'s notes"`);
    }
  }
  return p;
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
}

function checkPrivateNames(key, runRoot) {
  const p = [];
  const work = join(runRoot, "opchain-work");
  if (!existsSync(work)) return ["opchain-work/ was not written"];
  for (const file of walk(work).filter((f) => /\.(md|ya?ml|txt|json|csv)$/.test(f))) {
    readFileSync(file, "utf8").split("\n").forEach((line, i) => {
      for (const name of key.private_names ?? []) {
        if (new RegExp(`(?<![\\w-])${name.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&")}(?![\\w-])`, "i").test(line)) {
          p.push(`${relative(runRoot, file)}:${i + 1}: names "${name}"`);
        }
      }
    });
  }
  return p;
}

const CHECKS = {
  headers: (k, r) => checkHeaders(k, r),
  facts: checkFacts,
  contradictions: checkContradictions,
  speaker_rule: checkSpeakerRule,
  embedded_instructions: checkEmbedded,
  coverage: checkCoverage,
  recap_trace: checkRecapTrace,
  path: checkPath,
  due_date: checkDue,
  status: (k, r, c) => checkStatus(k, r, c),
  notes_only: checkNotesOnly,
  private_names: (k, r, c, root) => checkPrivateNames(k, root),
};

export function loadKey(caseDir) {
  return yaml.load(readFileSync(join(caseDir, "answer-key.yaml"), "utf8"));
}

/** Run a case's checks against a run folder (holding opchain-work/). Returns [{ check, problems }]. */
export function runCase(caseDir, runRoot = join(caseDir, "expected")) {
  const key = loadKey(caseDir);
  const run = load(runRoot, key);
  // Audit F-004: a check that throws fails on its own with a one-line reason;
  // the others still run and report.
  return (key.checks ?? DEFAULT_CHECKS).map((check) => {
    if (!CHECKS[check]) return { check, problems: [`unknown check "${check}" in answer-key.yaml`] };
    try {
      return { check, problems: CHECKS[check](key, run, caseDir, runRoot) };
    } catch (e) {
      return { check, problems: [`check could not run: ${reason(e)}`] };
    }
  });
}

/** The intake cases (1.0.0). The logs cases (`kind: logs`, 1.1.0) run in scripts/ow-start-logs-acceptance.mjs. */
export function listCases() {
  return readdirSync(FIXTURES, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(FIXTURES, e.name, "answer-key.yaml")))
    .filter((e) => { try { return loadKey(join(FIXTURES, e.name))?.kind !== "logs"; } catch { return true; } })
    .map((e) => e.name)
    .sort();
}

/** Copy a case's starting state into `dir` so the skill can be run there. */
export function prepare(caseName, dir) {
  const caseDir = join(FIXTURES, caseName);
  const work = join(dir, "opchain-work");
  if (existsSync(work)) throw new Error(`${work} already exists; use an empty folder`);
  mkdirSync(work, { recursive: true });
  cpSync(join(FIXTURES, "workspace", "profile.md"), join(work, "profile.md"));
  cpSync(join(EXAMPLES, "offers.md"), join(work, "offers.md"));
  cpSync(join(EXAMPLES, "handoffs.yaml"), join(work, "handoffs.yaml"));
  cpSync(join(caseDir, "input", "opchain-work"), work, { recursive: true });
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
  if (args[0] === "--prepare" && loadKey(join(FIXTURES, args[1]))?.kind === "logs") {
    const work = logsAcceptance.prepare(args[1], resolve(args[2]));
    console.log(`Prepared ${work}. Attach ${resolve(args[2])} to a session with ow-start installed and say what ${join(FIXTURES, args[1], "session", "answers.md")} says.`);
    console.log("Save the screen it prints as printed/<verb>.md in that folder. Then: node scripts/ow-start-acceptance.mjs " + `${args[1]} ${resolve(args[2])}`);
  } else if (args[0] === "--prepare") {
    const work = prepare(args[1], resolve(args[2]));
    console.log(`Prepared ${work}. Attach ${resolve(args[2])} to a session with ow-start installed and say "use ow-start to extract intake/${loadKey(join(FIXTURES, args[1])).slug}/".`);
    console.log("Then: node scripts/ow-start-acceptance.mjs " + `${args[1]} ${resolve(args[2])}`);
  } else if (args.length === 2) {
    const logs = loadKey(join(FIXTURES, args[0]))?.kind === "logs";
    const results = logs ? logsAcceptance.runCase(join(FIXTURES, args[0]), resolve(args[1])) : runCase(join(FIXTURES, args[0]), resolve(args[1]));
    process.exit(report(args[0], results) ? 1 : 0);
  } else {
    let failed = 0;
    for (const c of listCases()) failed += report(`${c} (golden run)`, runCase(join(FIXTURES, c))) ? 1 : 0;
    // The logs cases (ow-start 1.1.0), so the documented command checks both.
    for (const c of logsAcceptance.listLogsCases()) failed += report(`${c} (golden run)`, logsAcceptance.runCase(join(FIXTURES, c))) ? 1 : 0;
    process.exit(failed ? 1 : 0);
  }
}
