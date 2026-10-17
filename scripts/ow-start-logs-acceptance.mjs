#!/usr/bin/env node
// ow-start 1.1.0 logs acceptance checks (docs/plans/2026-10-16-ow-start-logs-amendment.md §9,
// and the OW-08 contract, sprints/release-2.1/ow-08/contract.md, C4 to C17).
//
// ow-start is a text-only skill: a model runs it, so these checks cannot run the
// skill. They read what a run wrote (its opchain-work/ folder, a .gitignore at
// the run's root) and the screen it printed (printed/<verb>.md, saved outside
// opchain-work/), and test them against an answer key, mechanically. One check
// per rule:
//
//   headers        the protocol header on each logs file this run wrote
//   writes         every file written belongs to a verb this run ran (skill.edges.yaml); none in audio/;
//                  a verb that writes nothing wrote nothing
//   write_once     agenda.md (unless a confirmed redo), notes.md and DEC-nn.md are never overwritten
//   status         STATUS.md appended, never rewritten; the lines the key expects; no duplicate line
//   status_grammar no client text in STATUS: every logs line in the closed grammar, owners attendee roles
//   route          the run landed on one verb: its printed screen, its prescribed text and structure, nothing
//                  else printed; a route that writes nothing prints no DONE: or Appended: line
//   agenda         every expected item with its source; closed and other-workstream items absent
//   notes          attendees by role, decisions, actions and open questions as the key expects
//   trace          every decision, action and open question cites words that are at that time (±10 s),
//                  on that notes line, or in that file
//   owner_date     every action has an owner role and a due date, or "no date: asked"
//   embedded       the planted instruction quoted, never followed
//   follow_up      four parts in order, owners by role, ow-build's email validator, the .txt twin; none
//                  for an internal meeting
//   follow_up_clean  no internal notes and none of OUR numbers (D1), by category, keyed on our side
//   people         no name, email or phone number in any file written (category rules)
//   private_names  no private skill or business name, however spaced or cased
//   decision       every field, the review and supersession rules, only the decisions the user picked
//   index          /ow-start-log lists other skills' files by path, date and one header key; copies nothing
//   business       nothing crosses between logs/business/ and a client's files
//   gitignore      asks once without the two lines, adds them only on yes; never asks when present
//   screen         the printed screen shows the prescribed text and structure the key names, and nothing it must not
//   handling       the handling question is asked only when no value is stored, once, and the answer kept in the
//                  logs header; asked again in any words while a value is stored, it fails
//
// Owner decision R1-4: a screen is graded only on text the references prescribe and on structure. In a key,
// `says`, `ask` and `must` are each one prescribed text; `tokens` are groups of ids, dates, paths, file
// names, workstreams and roles that must share a line (the step-0 echo never counts); `never` and
// `must_not` are guards that fail a wrong screen. tests/ow-start-logs-acceptance.test.js holds every key to this.
//
// Each check runs on its own: a malformed file (notes.md as a folder, a header
// that is not valid YAML, a truncated STATUS line, a binary transcript, an empty
// screen) fails the checks that need it, with a one-line reason, and every
// other check still runs and reports.
//
// Fixtures: tests/fixtures/ow-start/logs-*/ (all invented). A case's starting
// state is layered: its own input/ (and session/, what the user brings), the run
// of its `base:` case, ow-build-plan's `plan_case:` golden, ow-build's
// `build_cases:` goldens, then the shared workspace and ow-start's examples.
// expected/ is the hand-written golden run. Dispatched from
// scripts/ow-start-acceptance.mjs, so the documented command checks both.
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";
import { matter } from "./lib/frontmatter.mjs";
import { runView as buildRunView, validateEmailHtml, htmlWords, words, categoryFindings, OURS, MONEY_QTY } from "./ow-build-acceptance.mjs";
import { runLayers as planRunLayers } from "./ow-build-plan-acceptance.mjs";
import { familyNameRules } from "./check-skill-contracts.mjs";
import { loadCatalogs } from "./lib/catalogs.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const FIXTURES = join(ROOT, "tests", "fixtures", "ow-start");
const EXAMPLES = join(ROOT, "skills-work", "ow-start", "examples");
const EDGES = join(ROOT, "skills-work", "ow-start", "skill.edges.yaml");
const OW = "opchain-work/";
const TEXT = /\.(md|ya?ml|txt|json|csv|html)$/;
const CLOCKS = /^(tool|host-supplied|user-stated|assumed)$/;
const SLACK = 10; // seconds either way
const WORKING_NOTE = "This is a working note made by an AI assistant at your instruction. It is not a signature or an official record.";
const GITIGNORE_LINES = ["opchain-work/**/audio/", "opchain-work/**/transcript.*"];
const FOLLOW_UP_PARTS = ["Thanks", "What we decided", "Who does what by when", "Still open"];
const DEFAULT_CHECKS = ["headers", "writes", "write_once", "status", "status_grammar", "route", "people", "private_names"];

// ── small helpers ────────────────────────────────────────────────────────────

const reason = (e) => String(e?.message ?? e).split("\n")[0].trim();
const iso = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? v : String(v).trim());
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const norm = (s) => String(s).toLowerCase().replace(/[“”"'‘’]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const seconds = (t) => { const p = String(t).split(":").map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; };
const verbFile = (verb) => `printed/${String(verb).split(" ")[0].replace(/^\/ow-start-?/, "").replace(/^\/ow-/, "") || "start"}.md`;

export function loadKey(caseDir) {
  const key = yaml.load(readFileSync(join(caseDir, "answer-key.yaml"), "utf8"));
  if (!key || typeof key !== "object" || Array.isArray(key)) throw new Error("the answer key is not a map");
  return key;
}

function walk(dir, base = dir) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p, base) : [relative(base, p).split("\\").join("/")];
  });
}

// ── the run: layered files ───────────────────────────────────────────────────

const SHARED = {
  [`${OW}profile.md`]: join(FIXTURES, "workspace", "profile.md"),
  [`${OW}offers.md`]: join(EXAMPLES, "offers.md"),
  [`${OW}handoffs.yaml`]: join(EXAMPLES, "handoffs.yaml"),
};

/** A case's starting state, newest first: [{ dir, mount } | { view }]. */
function priorLayers(caseName, seen = new Set(), { session = true } = {}) {
  if (seen.has(caseName)) throw new Error(`base cycle at ${caseName}`);
  seen.add(caseName);
  const dir = join(FIXTURES, caseName);
  const key = loadKey(dir);
  // session/ is what the user brings to this run only; a base case's session is not carried forward.
  const layers = [{ dir: join(dir, "input"), mount: "" }, ...(session ? [{ dir: join(dir, "session"), mount: "session/" }] : [])];
  if (key.base) layers.push(...runLayers(key.base, seen));
  // Other skills' real goldens (never fresh stand-ins): ow-build's change orders, ow-build-plan's offer.
  for (const c of key.build_cases ?? []) layers.push({ view: buildRunView(c) });
  if (key.plan_case) layers.push(...planRunLayers(key.plan_case).map((d) => ({ dir: d, mount: OW })));
  return layers;
}
function runLayers(caseName, seen = new Set()) {
  return [{ dir: join(FIXTURES, caseName, "expected"), mount: "", golden: true }, ...priorLayers(caseName, seen, { session: false })];
}
function inLayer(l, rel) {
  if (l.view) return rel.startsWith(OW) && l.view.exists(rel) ? { view: l.view, rel } : null;
  if (l.golden && rel.startsWith("printed/")) return null; // a base case's screen is not this run's state
  if (!rel.startsWith(l.mount)) return null;
  const p = join(l.dir, rel.slice(l.mount.length));
  return existsSync(p) ? { path: p } : null;
}
function listLayer(l) {
  if (l.view) return l.view.all().filter((r) => r.startsWith(OW));
  return walk(l.dir).map((r) => l.mount + r).filter((r) => !(l.golden && r.startsWith("printed/")));
}
const readHit = (hit) => (hit.view ? hit.view.read(hit.rel) : readFileSync(hit.path, "utf8"));
const bytesHit = (hit) => (hit.view ? Buffer.from(hit.view.read(hit.rel) ?? "") : readFileSync(hit.path));

/**
 * A view of a run: read(rel) finds a root-relative file (opchain-work/…, printed/…,
 * session/…, .gitignore) in the run or the layers under it; written() lists what
 * the run itself wrote; prior* read the starting state.
 */
export function runView(caseName, runDir = null) {
  const prior = priorLayers(caseName);
  const top = { dir: runDir ?? join(FIXTURES, caseName, "expected"), mount: "" };
  const layers = [top, ...prior];
  const find = (ls, rel) => {
    for (const l of ls) {
      // A path that is a folder in the run is unreadable there, not hidden by a layer below (C17).
      if (!l.view && rel.startsWith(l.mount) && existsSync(join(l.dir, rel.slice(l.mount.length))) && lstatSync(join(l.dir, rel.slice(l.mount.length))).isDirectory()) return { folder: true };
      const h = inLayer(l, rel);
      if (h) return h;
    }
    return SHARED[rel] && existsSync(SHARED[rel]) ? { path: SHARED[rel] } : null;
  };
  const readFrom = (ls) => (rel) => {
    const h = find(ls, rel);
    if (!h) return null;
    if (h.folder) throw new Error(`${rel} is a folder, not a file`);
    return readHit(h);
  };
  const listOf = (ls) => [...new Set(ls.flatMap(listLayer))].sort();
  const writtenFiles = () => {
    const mine = walk(top.dir).filter((r) => !r.startsWith("printed/") && !r.startsWith("session/"));
    if (!runDir) return mine.sort();
    return mine.filter((r) => {
      const h = find(prior, r);
      return !h || h.folder || !bytesHit(h).equals(readFileSync(join(runDir, r)));
    }).sort();
  };
  const isDir = (rel) => existsSync(join(top.dir, rel)) && lstatSync(join(top.dir, rel)).isDirectory();
  return {
    read: readFrom(layers), priorRead: readFrom(prior),
    exists: (rel) => find(layers, rel) != null, priorExists: (rel) => find(prior, rel) != null,
    all: () => listOf(layers), priorAll: () => listOf(prior), written: writtenFiles, isDir,
    printed: () => walk(join(top.dir, "printed")).map((r) => `printed/${r}`),
    screen: (rel) => { const p = join(top.dir, rel); return existsSync(p) && statSync(p).isFile() ? readFileSync(p, "utf8") : null; },
  };
}

// ── parsing ──────────────────────────────────────────────────────────────────

const header = (text, rel) => {
  try { return matter(text); } catch (e) { throw new Error(`${rel}: header is not valid YAML (${reason(e)})`); }
};
const sectionsOf = (content) => {
  const out = new Map();
  let cur = null;
  for (const line of content.split("\n")) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h && !line.startsWith("###")) { cur = h[1]; out.set(cur, []); continue; }
    if (cur) out.get(cur).push(line);
  }
  return out;
};

/** `> "words" — who, 07:42` | `> "words" — your notes, line 4` | `> "words" — file.csv, row 3` */
export function parseSource(line) {
  const m = line.match(/^\s*>\s*"(.*)"\s*(?:—|–|--|-)\s*(.+?)\s*$/);
  if (!m) return null;
  const [, text, attribution] = m;
  const timed = attribution.match(/^(.+?),\s*(\d{1,2}:\d{2}(?::\d{2})?)$/);
  if (timed) return { text, who: timed[1].trim(), time: seconds(timed[2]), kind: "transcript" };
  const noted = attribution.match(/^your notes,\s*line\s+(\d+)$/i);
  if (noted) return { text, line: Number(noted[1]), kind: "notes" };
  const file = attribution.match(/^(.+?),\s*(.+)$/);
  if (file) return { text, file: file[1].trim(), locator: file[2].trim(), kind: "file" };
  return { text, who: attribution, kind: "other" };
}

/** notes.md → { data, attendees, items: [{ kind: D|A|Q, id, fields, sources }], embedded } */
export function parseNotes(text, rel = "notes.md") {
  const { data, content } = header(text, rel);
  const secs = sectionsOf(content);
  const attendees = (secs.get("Attendees (roles)") ?? []).filter((l) => /^\s*-\s+/.test(l)).map((l) => {
    const m = l.replace(/^\s*-\s+/, "").match(/^(.+?)(?:\s+\((SPEAKER_\d+)[^)]*\))?\s*$/);
    return { role: m[1].trim(), label: m[2] ?? null };
  });
  const items = [];
  for (const [name, kind] of [["Decisions", "D"], ["Actions", "A"], ["Open questions", "Q"]]) {
    let cur = null, key = null;
    for (const line of secs.get(name) ?? []) {
      const h = line.match(/^###\s+(\S+)\s*$/);
      if (h) { cur = { kind, id: h[1], fields: {}, sources: [] }; items.push(cur); key = null; continue; }
      if (!cur) continue;
      const kv = line.match(/^-\s+([a-z ]+):\s*(.*)$/i);
      if (kv) { key = kv[1].trim().toLowerCase(); cur.fields[key] = kv[2].trim(); continue; }
      const s = parseSource(line);
      if (s && key === "source") cur.sources.push(s);
    }
  }
  const embeddedLines = secs.get("Possible embedded instructions");
  return { data, attendees, items, embedded: embeddedLines ? embeddedLines.join("\n") : null, sections: secs };
}

/** A transcript as [{ at, who, text }]: `[MM:SS] who: text` or `[MM:SS] CHAT (who): text`. */
export function parseTranscript(text) {
  if (/\u0000/.test(text)) throw new Error("the transcript is not text (binary)");
  const lines = [];
  for (const l of text.split("\n")) {
    const m = l.match(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s+(?:CHAT \(([^)]+)\)|([^:]+)):\s*(.*)$/);
    if (m) lines.push({ at: seconds(m[1]), who: (m[2] ?? m[3]).trim(), chat: Boolean(m[2]), text: m[4] });
  }
  const roles = new Map();
  for (const l of text.split("\n")) { const m = l.match(/^-\s+(SPEAKER_\d+):\s+([^·]+?)\s+·/); if (m) roles.set(m[1], m[2].trim()); }
  return { lines, roles };
}

function agendaRows(content) {
  const lines = content.split("\n");
  const i = lines.findIndex((l) => /^\|\s*#\s*\|/.test(l));
  if (i < 0) return [];
  const rows = [];
  for (let j = i + 2; j < lines.length && lines[j].trim().startsWith("|"); j++) {
    const c = lines[j].trim().replace(/^\||\|$/g, "").split("|").map((x) => x.trim());
    rows.push({ n: c[0], item: c[1] ?? "", source: c[2] ?? "" });
  }
  return rows;
}

const statusLines = (text) => text.split("\n").filter((l) => l.trim());
const fields5 = (line) => line.split(" | ");

// ── the meaning rules (D1, D2; controls in tests/ow-start-logs-sentences.mjs) ──

/** Sentences of a text: each line, split at sentence ends; list markers and an owner's "role:" kept. */
export function sentencesOf(text) {
  return String(text).split("\n").map((l) => l.replace(/^\s*(?:[-*]|\d+\.)\s+/, "").trim()).filter(Boolean)
    .flatMap((l) => l.split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/)).map((s) => s.trim()).filter(Boolean);
}

/** The client's people as the subject: "your team", "your coordinator", "the client ops lead". */
const CLIENT_SIDE = /\b(?:your|the client'?s?|their)\s+(?:[\w-]+\s+){0,3}?(?:team|people|staff|coordinator|lead|owner|manager|bookkeeper|accountant|warehouse|business|process|customers?|testers?|ops)\b/i;

/**
 * Follow-up clean (C7), by category and keyed on OUR side (owner decision D1): the
 * ow-build category rules (imported, not copied: our time with an effort word or a
 * first-person subject, money in price context or ours, a ratio of a price, our side
 * of the money, an overrun against our plan), plus internal markers and a margin
 * that is not the client's. A quantity of time whose only people are the client's
 * is the client's effort, not ours.
 */
export function followUpFindings(s, { user = null } = {}) {
  const out = [];
  const t = String(s);
  if (/ow:(?:internal|end-internal)|<!--/i.test(t)) out.push(["an internal marker or comment", t.match(/ow:(?:internal|end-internal)|<!--/i)[0]]);
  if (/^\s*#*\s*internal\b|\b(?:internal notes?|not for the client)\b/i.test(t)) out.push(["internal notes", t.match(/internal notes?|not for the client|internal/i)[0]]);
  const ours = OURS.test(t) || (user ? new RegExp(`\\b${esc(user)}\\b`).test(t) : false);
  for (const [what, hit] of categoryFindings("", t, new Set(), { user })) {
    if (/time or effort/.test(what) && !ours && CLIENT_SIDE.test(t)) continue;
    // A ratio of the client's own price is theirs (D1: "your price list goes up by about 5%").
    if (/ratio/.test(what) && !ours && /\b(?:your|their|the client'?s)\s+(?:[\w-]+\s+){0,2}?(?:price|prices|price list|rates?|fees?|charges?|costs?|margin)\b/i.test(t)) continue;
    out.push([what, hit]);
  }
  for (const [re, what] of OUR_SIDE_WORDING) { const m = t.match(re); if (m) out.push([what, m[0]]); }
  return out;
}

/**
 * Our side in plain words, with or without an amount (round 1 m1; D1's categories):
 * our rates, charges and fees; our charging, billing of time, quoting low or high,
 * absorbing a cost, padding an estimate; a mark-up, a margin or a budget that is not
 * the client's. "Take a small hit" and other idioms stay with the self-check (D2).
 */
const NOT_THEIRS = "(?<!\\b(?:your|their|client'?s?|the client's)\\s+)";
const OUR_SIDE_WORDING = [
  [/\b(?:our|my)\s+(?:[\w-]+\s+){0,2}?(?:rates?|charges?|fees?|pricing|prices|premiums?|mark-?ups?|costs?|budgets?|margins?|profits?)\b/i, "our rate, charge, cost or margin (said without an amount)"],
  [/\b(?:I|we)(?:'m|'re|'ll|'ve| am| are| will| would| have| had| just| already)*\s+(?:charg(?:e|es|ed|ing)\b(?!\s+(?:your|the)\s+(?:card|account))|absorb(?:s|ed|ing)?\b|pad(?:ded|ding)?\s+(?:the|our|my|this)\s+(?:estimate|quote|price|budget|hours)\b|mark(?:ed|ing)?\s+(?:it\s+|this\s+)?up\b|discount(?:ed|ing)?\s+(?:it|this|the\s+\w+|our)\b)/i, "our charging, absorbing or padding"],
  [/\b(?:I|we)\b[^.]{0,25}\bbill(?:s|ed|ing)?\b[^.]{0,30}\b(?:time|hours?|effort|separately)\b/i, "our billing of time"],
  [/\b(?:I|we)\s+(?:have\s+|had\s+|'ve\s+)?quoted\b[^.]{0,30}\b(?:at|low|high|below|above|under|too)\b/i, "how we quoted it"],
  [/\babsorb(?:s|ed|ing)?\s+(?:the|this|that|any)?\s*(?:extra\s+)?(?:cost|costs|overrun|time|hours)\b/i, "a cost we absorb"],
  [new RegExp(`${NOT_THEIRS}\\bmark-?ups?\\b`, "i"), "a mark-up that is not the client's"],
  [new RegExp(`${NOT_THEIRS}\\bmargins?\\b`, "i"), "a margin that is not the client's"],
  [new RegExp(`${NOT_THEIRS}\\b(?:over|under)\\s+(?:the\\s+|our\\s+|my\\s+)?budget\\b`, "i"), "over or under our budget"],
  [/\bbudget(?:ed)?\s+(?:effort|hours|time|days)\b|\bdiscounted\s+(?:rate|price|fee)\b|\b(?:blended|day|hourly|standard|usual|normal)\s+rate\b(?<!\byour\s+\w+\s+rate)/i, "our rate or budgeted effort"],
  // Round 2 m1: the plain wording that still slipped, by category.
  [/\b(?:I|we)\b[^.]{0,20}\b(?:bill|charge|invoic)\w*\b[^.]{0,30}\b(?:by the (?:half[\s-])?(?:day|hour|week|month)|per (?:hour|day|half[\s-]day)|hourly|at (?:my|our)\b|at cost|separately|on top)/i, "the basis we bill or charge on"],
  [/\bat\s+(?:my|our)\s+(?:usual|normal|standard|regular|full|discounted|hourly|daily)\b/i, "our usual basis for a price"],
  [/\b(?:I|we)(?:'ve|'d| have| had)?\s+(?:\w+ly\s+)?(?:spent|spend|put in|sank|sunk|lost)\b(?![^.]*\bwith (?:you|your)\b)[^.]{0,25}?\b(?:(?:most|all|half|part) of\s+)?(?:the\s+)?(?:whole\s+)?(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|day|days|week|weekend|evening|evenings|morning|afternoon|night|nights)\b/i, "a span of our effort"],
  [/\b(?:used up|burned through|burnt through|burned|burnt|blown through|eaten (?:up|into)|ran through|run through|gone through)\b[^.]{0,30}\b(?:hours|days|budget|time|contingency|allowance|buffer|estimate)\b(?<=^(?=.*\b(?:I|we|our|my|us)\b).*)/i, "an allowance of ours used up"],
  [/\b(?:hours|days|time|budget)\s+(?:that\s+)?(?:we|I)\s+(?:had\s+)?(?:set aside|budgeted|planned|allowed|allocated)\b/i, "an allowance of ours"],
  [/\b(?:I|we)(?:'ll| will| would)?\s+(?:\w+ly\s+)?(?:add|put|apply|charge)\b[^.]{0,20}(?:\d+(?:\.\d+)?\s?%|\bper ?cent\b|\bpercent\b)/i, "a percentage we add to a price"],
  [/\b(?:my|our)\s+(?:time|hours|effort|days)\b(?!\s+(?:on the call|together|today|with you|this morning|this afternoon))/i, "our time or effort (without a number)"],
  [/\b(?:I|we)(?:'ve| have| had)?\s+(?:\w+ly\s+)?(?:priced|quoted|charged|billed|estimated|underestimated|overestimated)\b[^.]{0,30}\b(?:below|under|above|over|at a loss|at cost|too|low|high)\b/i, "how we priced or quoted it"],
  [/\b(?:quote|quoted|price|priced|estimate|estimated)\b[^.]{0,40}\btoo\s+(?:low|high|tight|thin)\b(?<=^(?=.*\b(?:I|we|our|my|us)\b).*)/i, "an under- or over-quote of ours"],
  [/(?<!\b(?:your|their)\s+(?:\w+\s+)?)\bbillable\b/i, "billable time of ours"],
];

const HONORIFIC = /\b(?:Mr|Mrs|Ms|Mx|Miss|Dr|Prof)\.?\s+[A-Z][a-z]+/;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
// A phone number: with an area code ("512-555-0147", "(512) 555-0199", "+1 512 555 0177"), or a
// 7-digit local number ("555-0142", "555 0123"); an ISO date (4-2-2) is never one.
// An international number with a country code ("+44 20 7946 0958"), or 10 or 11 digits unformatted
// ("5125550199") count too (round 2 m6).
const PHONE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{3}\)\s?|\b\d{3}[\s.-])\d{3}[\s.-]\d{4}\b|(?<![\d.-])\b\d{3}[\s.-]\d{4}\b(?![.-]\d)|(?<![\w+])\+\d{1,3}(?:[\s.-]?\(?\d\)?){7,12}(?!\d)|(?<![\w.,-])\d{10,11}(?![\w.,-])/;
// `<Name> from <Organisation>`. Mid-sentence, a capitalised word before "from <Capitalised>" is a
// name. At the start of a sentence it may be a noun ("Stoneware from Laguna arrives"), so there it
// counts only when a person's verb follows the organisation ("Jordan from Larkspur will send").
const NAME_FROM_ORG = /\b([A-Z][a-z]+) from (?:the )?[A-Z][\w&'-]*(?:\s+[A-Z][\w&'-]*)*/g;
const PERSON_VERB = /^\s*(?:(?:will|would|can|could|should|is going to|'ll)\s+(?:send|draft|bring|pay|review|check|confirm|call|email|write|sign|approve|share|join|attend|handle|own|lead|look|follow|reply|prepare|update|provide|meet|book|chase|test|run|ask|tell|let)\b|(?:said|says|asked|asks|confirmed|confirms|sent|sends|agreed|agrees|wants|wanted|called|calls|emailed|emails|mentioned|told|tells|approved|approves|signed|signs|wrote|writes|replied|replies|joined|attended|offered|promised|noted|explained|suggested|prefers|needs|thinks|thought|knows)\b)/;
const sentenceStart = (before) => /^(?:\s*(?:[-*]|\d+\.)\s+)?$|[.!?]["”)]?\s+$/.test(before);

/**
 * People by role (C12), by category: an email address, a phone number, a known
 * person's name (case-sensitive, whole word), an honorific with a name,
 * `<Name> from <Organisation>`, a `cc:` line that names someone (a role is fine).
 * No generic capitalised-word rule.
 */
export function peopleFindings(line, names = []) {
  const out = [];
  const l = String(line);
  if (EMAIL.test(l)) out.push(["an email address", l.match(EMAIL)[0]]);
  if (PHONE.test(l)) out.push(["a phone number", l.match(PHONE)[0]]);
  for (const n of names) if (new RegExp(`(?<![\\w-])${esc(n)}(?![\\w-])`).test(l)) out.push(["a person's name", n]);
  if (HONORIFIC.test(l)) out.push(["an honorific with a name", l.match(HONORIFIC)[0]]);
  for (const m of l.matchAll(NAME_FROM_ORG)) {
    if (sentenceStart(l.slice(0, m.index)) && !PERSON_VERB.test(l.slice(m.index + m[0].length))) continue;
    out.push(["a name from an organisation", m[0]]);
  }
  const cc = l.match(/^\s*b?cc\s*:\s*(.*)$/i);
  if (cc && (/\b[A-Z][a-z]/.test(cc[1]) || EMAIL.test(cc[1]))) out.push(["a cc: line that names someone", l.trim().slice(0, 30)]);
  return out;
}

/** No private names (C13): catalogs.json's rule (privateNames, brandNames), never a per-key copy. */
let nameRulesCache = null;
export function privateNameFindings(line) {
  if (!nameRulesCache) {
    const ow = loadCatalogs({ root: ROOT, env: {} }).find((c) => Array.isArray(c.privateNames));
    nameRulesCache = ow ? familyNameRules(ow) : [];
  }
  const out = [];
  for (const r of nameRulesCache) { const m = String(line).match(r.re); if (m) out.push([r.what, m[0]]); }
  return out;
}

// ── STATUS: the closed grammar (C8, never waived) ─────────────────────────────

const DATE = "\\d{4}-\\d{2}-\\d{2}";
const WS = "[a-z0-9]+(?:-[a-z0-9]+)*";
// A role: lower-case words, an acronym ("client CFO", "client IT lead") or a possessive ("client's
// bookkeeper"), with at least one lower-case word, so a name ("Dana") is never one (round 1 m8).
const ROLE_WORD = "(?:[a-z]+(?:['’]s)?|[A-Z]{2,5}(?:['’]s)?)";
const ROLE = `(?=(?:[A-Z]{2,5}(?:['’]s)?[ -])*[a-z])${ROLE_WORD}(?:[ -]${ROLE_WORD}){0,4}`;
const LINE_RE = new RegExp(`^(${DATE}) \\(clock: (?:tool|host-supplied|user-stated|assumed)\\) \\| ow-start \\d+\\.\\d+\\.\\d+ \\| (logs/(${WS})/(?:meetings/(MTG-\\d{2,})/(?:agenda\\.md|notes\\.md(?:#(A-\\d{2,}))?)|decisions/(DEC-\\d{2,})\\.md)) \\| next: (.+) \\| awaiting: (.+)$`);

/** Problems with one logs STATUS line against the closed grammar; `roles(mtg)` gives that meeting's attendee roles. */
export function statusLineProblems(line, roles = () => null) {
  const m = String(line).match(LINE_RE);
  if (!m) return ["is not in the logs STATUS form (date and clock | ow-start <version> | a logs path with its id | next: | awaiting:), or carries text outside it"];
  const [, , path, ws, mtg, action, dec, next, awaiting] = m;
  const p = [];
  const open = [`ow-start /ow-start-action logs/${ws}/`, `ow-start /ow-start-log-meeting logs/${ws}/`];
  const closed = next.match(new RegExp(`^none \\(closed: (done|dropped|reviewed|held ${DATE}|superseded by DEC-\\d{2,})\\)$`));
  if (!open.includes(next) && !closed) p.push(`next: "${next}" is not one of the logs forms`);
  const role = (r) => { const known = mtg ? roles(mtg) : null; if (r !== "you" && known && !known.includes(r)) p.push(`owner "${r}" is not an attendee role in ${mtg}'s notes.md`); };
  let a;
  if (awaiting === "none") { if (!closed || !/^held/.test(closed[1])) p.push(`awaiting: none belongs only to a meeting's held line`); }
  else if ((a = awaiting.match(new RegExp(`^none \\((done|dropped|superseded) ${DATE}\\)$`)))) { if (!closed || !closed[1].startsWith(a[1])) p.push(`awaiting "${awaiting}" does not match next "${next}"`); }
  else if ((a = awaiting.match(new RegExp(`^none \\(reviewed ${DATE}, kept\\)$`)))) { if (!dec || !closed || closed[1] !== "reviewed") p.push(`a reviewed line belongs to a decision`); }
  else if ((a = awaiting.match(new RegExp(`^meeting on ${DATE}$`)))) { if (!/agenda\.md$/.test(path) || next !== open[1]) p.push(`awaiting a meeting belongs to an agenda line that hands to /ow-start-log-meeting`); }
  else if ((a = awaiting.match(new RegExp(`^(A-\\d{2,}) \\((${ROLE})\\)(?: by ${DATE}|, no date)$`)))) { if (a[1] !== action || next !== open[0]) p.push(`awaiting ${a[1]} must sit on its own action's path with next: ${open[0]}`); role(a[2]); }
  else if ((a = awaiting.match(new RegExp(`^(DEC-\\d{2,}) review by ${DATE}$`)))) { if (a[1] !== dec || next !== open[0]) p.push(`awaiting ${a[1]}'s review must sit on its decision's path with next: ${open[0]}`); }
  else p.push(`awaiting: "${awaiting}" is not one of the logs forms (ids, roles and dates only)`);
  if (closed && /^(done|dropped)$/.test(closed[1]) && !action) p.push(`a ${closed[1]} line belongs to an action path (#A-nn)`);
  if (closed && /^superseded|^reviewed$/.test(closed[1]) && !dec) p.push(`a ${closed[1]} line belongs to a decision path`);
  return p;
}

// ── checks ───────────────────────────────────────────────────────────────────

const logsWritten = (run) => run.written().filter((f) => f.startsWith(`${OW}logs/`));
const ws = (key) => `${OW}logs/${key.workstream}`;

function need(run, rel) {
  const t = run.read(rel);
  if (t == null) throw new Error(`${rel.replace(OW, "")} was not written`);
  return t;
}

function checkHeaders(key, run) {
  const p = [];
  const kinds = { "agenda.md": "ow-start/agenda", "notes.md": "ow-start/meeting-notes" };
  for (const f of logsWritten(run).filter((x) => x.endsWith(".md"))) {
    const at = f.slice(OW.length);
    let data;
    try { ({ data } = header(run.read(f), at)); } catch (e) { p.push(reason(e)); continue; }
    const name = f.split("/").pop();
    const want = kinds[name] ?? (/^DEC-\d+\.md$/.test(name) ? "ow-start/decision" : null);
    if (!want) { p.push(`${at}: not a logs file this skill writes`); continue; }
    if (data.ow_artefact !== want) p.push(`${at}: ow_artefact is ${data.ow_artefact}, expected ${want}`);
    if (String(data.schema) !== "1") p.push(`${at}: schema is ${data.schema}, expected 1`);
    if (data.written_by !== "ow-start 1.1.0 (protocol 1)") p.push(`${at}: written_by is "${data.written_by}", expected "ow-start 1.1.0 (protocol 1)"`);
    if (data.workstream !== key.workstream) p.push(`${at}: workstream is ${data.workstream}, expected ${key.workstream}`);
    if (!data.subject) p.push(`${at}: subject is missing`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso(data.created) ?? "")) p.push(`${at}: created "${iso(data.created)}" is not a date`);
    if (!CLOCKS.test(data.clock ?? "")) p.push(`${at}: clock "${data.clock}" is not tool, host-supplied, user-stated or assumed`);
    if (data.origin !== "skill") p.push(`${at}: origin is "${data.origin}", expected skill`);
    const id = f.match(/(MTG-\d+|DEC-\d+)/)?.[1];
    if (id && data.id !== id) p.push(`${at}: id is ${data.id}, expected ${id}`);
  }
  return p;
}

let writerCache = null;
/** The logs writes rows of skill.edges.yaml as [{ re, verbs }] (the one-writer rule's own source). */
export function logsWriters() {
  if (!writerCache) {
    const e = yaml.load(readFileSync(EDGES, "utf8"));
    writerCache = (e.writes ?? []).filter((w) => String(w.path).startsWith("logs/")).map((w) => ({
      path: String(w.path),
      re: new RegExp(`^${OW}${String(w.path).split(/(<[^>]+>|\bnn\b)/).map((s) => (/^<[^>]+>$/.test(s) ? "[^/]+" : s === "nn" ? "\\d{2,}" : esc(s))).join("")}$`),
      verbs: [String(w.verb)],
    }));
  }
  return writerCache;
}

function checkWrites(key, run) {
  const p = [];
  const verbs = key.verbs ?? [];
  if (!verbs.length) return ["answer key: verbs lists no verb this run ran"];
  const written = run.written();
  for (const f of written) {
    if (f === ".gitignore") continue; // graded by the gitignore check
    if (/\/audio\//.test(f)) { p.push(`${f}: written into audio/; this skill never writes there or transcribes`); continue; }
    if (f === `${OW}STATUS.md`) continue;
    const rows = logsWriters().filter((r) => r.re.test(f));
    if (!rows.length) { p.push(`${f}: no logs verb of this skill writes this file (skill.edges.yaml)`); continue; }
    if (!rows.some((r) => r.verbs.some((v) => verbs.includes(v)))) p.push(`${f}: written in a run of ${verbs.join(", ")}, but only ${rows.flatMap((r) => r.verbs).join(", ")} may write it (one writer per file)`);
  }
  if (key.writes_nothing && written.some((f) => f !== ".gitignore")) p.push(`${verbs.join(", ")} writes nothing here, but the run wrote ${written.filter((f) => f !== ".gitignore").map((f) => f.replace(OW, "")).join(", ")}`);
  return p;
}

function checkWriteOnce(key, run) {
  const p = [];
  for (const f of run.written()) {
    if (!/\/(agenda|notes)\.md$|\/DEC-\d+\.md$/.test(f) || !run.priorExists(f)) continue;
    const meeting = f.replace(/\/[^/]+$/, "");
    if (f.endsWith("/agenda.md") && key.redo_agenda && !run.exists(`${meeting}/notes.md`)) continue;
    p.push(`${f.replace(OW, "")} existed before this run and was written again; ${f.endsWith("agenda.md") ? "an agenda is replaced only on a confirmed redo, before the meeting is logged" : "it is written once and never overwritten"}`);
  }
  return p;
}

function checkStatus(key, run) {
  const p = [];
  const before = statusLines(run.priorRead(`${OW}STATUS.md`) ?? "");
  const after = statusLines(need(run, `${OW}STATUS.md`));
  before.forEach((l, i) => { if (after[i] !== l) p.push(`STATUS.md line ${i + 1} was rewritten; STATUS.md is append-only`); });
  const added = after.slice(before.length);
  const want = key.status?.lines ?? [];
  // A duplicate repeats its item's newest line (logs-schema §6); an older line may come back
  // (A-01 moved to the 23rd, then back to the 16th: round 1 m4).
  const sig = (l) => fields5(l).slice(2).join(" | ");
  const newest = new Map();
  for (const l of before) newest.set(fields5(l)[2], sig(l));
  for (const l of added) {
    if (newest.get(fields5(l)[2]) === sig(l)) p.push(`a duplicate STATUS line: "${sig(l)}" is already its item's newest line`);
    newest.set(fields5(l)[2], sig(l));
  }
  if (added.length !== want.length) p.push(`${added.length} STATUS line(s) appended, expected ${want.length}`);
  want.forEach((w, i) => {
    const l = added[i];
    if (!l) return;
    const f = fields5(l);
    if (f.length !== 5) { p.push(`appended line ${i + 1} has ${f.length} fields, expected 5: ${l}`); return; }
    if (!/^\d{4}-\d{2}-\d{2} \(clock: (tool|host-supplied|user-stated|assumed)\)$/.test(f[0])) p.push(`appended line ${i + 1}: "${f[0]}" lacks a date with its clock source`);
    if (f[1] !== "ow-start 1.1.0") p.push(`appended line ${i + 1}: skill field is "${f[1]}"`);
    if (f[2] !== w.path) p.push(`appended line ${i + 1}: path ${f[2]}, expected ${w.path}`);
    if (f[3] !== `next: ${w.next}`) p.push(`appended line ${i + 1}: "${f[3]}", expected "next: ${w.next}"`);
    if (f[4] !== `awaiting: ${w.awaiting}`) p.push(`appended line ${i + 1}: "${f[4]}", expected "awaiting: ${w.awaiting}"`);
  });
  return p;
}

/** The attendee roles of a meeting's notes.md, or null when there are none to read. */
const rolesOf = (run, workstream) => (mtg) => {
  try { const t = run.read(`${OW}logs/${workstream}/meetings/${mtg}/notes.md`); return t == null ? null : parseNotes(t).attendees.map((a) => a.role); } catch { return null; }
};

function checkStatusGrammar(key, run) {
  const p = [];
  const lines = statusLines(need(run, `${OW}STATUS.md`));
  lines.forEach((l, i) => {
    const path = fields5(l)[2] ?? "";
    if (!/^logs\//.test(path) && !/^\d{4}-\d{2}-\d{2} \([^)]*\) \| ow-start [^|]*\| logs\//.test(l)) return;
    const w = path.split("/")[1] ?? "";
    for (const x of statusLineProblems(l, rolesOf(run, w))) p.push(`STATUS.md line ${i + 1} ${x}`);
  });
  return p;
}

function checkRoute(key, run) {
  const p = [];
  const r = key.route ?? {};
  const want = verbFile(r.verb ?? key.verbs?.[0]);
  const printed = run.printed();
  if (!printed.includes(want)) return [`${want} was not saved (the screen the run printed)`];
  for (const x of printed) if (x !== want) p.push(`${x}: the run printed for another verb; one verb per run`);
  const screen = run.screen(want) ?? "";
  if (!screen.trim()) return [`${want} is empty`];
  // Owner decision R1-4: a screen is graded on the text the skill prescribes (says, ask) and on
  // structure (tokens: ids, paths, dates and roles together on one line), never on golden wording.
  // Guards (`never`) are compiled per line, so `^` anchors a line (round 2 D1′b).
  for (const s of r.says ?? []) if (!new RegExp(s, "im").test(screen)) p.push(`${want} does not say /${s}/`);
  p.push(...tokenProblems(want, screen, r.tokens));
  for (const s of r.never ?? []) if (new RegExp(s, "m").test(screen)) p.push(`${want} says /${s}/, which this route never prints`);
  // A route that writes nothing never reports a result: no DONE line, no appended STATUS line (round 2 D1′b).
  if (key.writes_nothing) {
    for (const [re, what] of [[/^\s*DONE:/m, "a DONE: line"], [/^\s*Appended:/m, "an Appended: line"]]) if (re.test(screen)) p.push(`${want} prints ${what}, but this route writes nothing`);
  }
  if (r.ask && run.written().some((f) => f !== ".gitignore")) p.push(`the route asks first (${r.ask}), but the run wrote ${run.written().join(", ")}`);
  if (r.ask && !new RegExp(r.ask, "im").test(screen)) p.push(`${want} does not ask /${r.ask}/`);
  return p;
}

/**
 * Structure on a screen: each group of tokens (ids, paths, dates, roles, and the few words the
 * references prescribe) appears together on one line, in any order and any wording around them.
 * The step-0 echo of the newest STATUS line is the protocol's, not the route's, so it never counts.
 * An id matches as a whole word ("A-01" is not in "A-010").
 */
function tokenProblems(rel, screen, groups = []) {
  const lines = String(screen).split("\n").filter((l) => !/^\s*Step 0\b/.test(l)).map((l) => l.toLowerCase());
  const has = (l, t) => { const s = String(t).toLowerCase(); return /^[a-z]+(?:-|_)?\d+$/.test(s) ? new RegExp(`(?<![\\w-])${esc(s)}(?![\\w-])`).test(l) : l.includes(s); };
  return (groups ?? []).filter((g) => !lines.some((l) => g.every((t) => has(l, t))))
    .map((g) => `${rel} has no line with ${g.map((t) => `"${t}"`).join(", ")} together`);
}

function checkAgenda(key, run) {
  const p = [];
  const a = key.agenda;
  const rel = `${ws(key)}/meetings/${a.id}/agenda.md`;
  const { data, content } = header(need(run, rel), rel.replace(OW, ""));
  const rows = agendaRows(content);
  if (!rows.length) p.push("the agenda has no item table (| # | Item | Source |)");
  if (!/^Purpose:\s*\S/m.test(content)) p.push("the agenda has no Purpose: line (the run asks the purpose)");
  if (!data.length) p.push("the agenda header has no length (the run asks the length)");
  if (!Array.isArray(data.attendees) || !data.attendees.length) p.push("the agenda header lists no attendees by role");
  else for (const r of data.attendees) if (!new RegExp(`^${ROLE}$`).test(String(r))) p.push(`attendee "${r}" is not a role`);
  if (iso(data.meeting_date) !== iso(a.date)) p.push(`meeting_date is ${iso(data.meeting_date)}, expected ${iso(a.date)}`);
  for (const want of a.items ?? []) {
    if (!rows.some((r) => new RegExp(want.item, "i").test(r.item) && (!want.source || r.source === want.source))) p.push(`no agenda item /${want.item}/ with source ${want.source ?? "(any)"}`);
  }
  if (a.count != null && rows.length !== a.count) p.push(`the agenda has ${rows.length} items, expected ${a.count}`);
  for (const bad of a.absent ?? []) for (const r of rows) if (new RegExp(bad, "i").test(`${r.item} ${r.source}`)) p.push(`agenda item ${r.n} carries /${bad}/, which must not appear (closed, or another workstream)`);
  const status = statusLines(run.read(`${OW}STATUS.md`) ?? "");
  const session = run.all().filter((f) => f.startsWith("session/")).map((f) => f.split("/").pop());
  for (const r of rows) {
    const s = r.source;
    if (!s) { p.push(`agenda item ${r.n} ("${r.item.slice(0, 40)}") has no source`); continue; }
    if (s === "you" || session.includes(s)) continue;
    const st = s.match(/^STATUS\.md:\s*(\S+)$/);
    if (st) { if (!status.some((l) => fields5(l)[2] === st[1])) p.push(`agenda item ${r.n}: source ${s} names no STATUS line`); continue; }
    const path = s.replace(/#.*$/, "");
    if (!run.exists(`${OW}${path}`)) { p.push(`agenda item ${r.n}: source ${s} does not exist`); continue; }
    const frag = s.match(/#((?:A|Q)-?\d+)$/)?.[1];
    if (frag && !new RegExp(`^###\\s+${esc(frag)}\\s*$`, "m").test(run.read(`${OW}${path}`) ?? "")) p.push(`agenda item ${r.n}: ${path} has no ${frag}`);
  }
  return p;
}

function notesOf(key, run) {
  const rel = `${ws(key)}/meetings/${key.notes.id}/notes.md`;
  if (run.isDir(rel)) throw new Error(`${rel.replace(OW, "")} is a folder, not a file`);
  return parseNotes(need(run, rel), rel.replace(OW, ""));
}

function checkNotes(key, run) {
  const p = [];
  const n = key.notes;
  const notes = notesOf(key, run);
  const d = notes.data;
  for (const s of ["Attendees (roles)", "Agenda covered", "Decisions", "Actions", "Open questions", "Not covered", "Possible embedded instructions"]) if (!notes.sections.has(s)) p.push(`notes.md has no "## ${s}" section`);
  if (![...notes.sections.keys()].some((s) => /^Self-checks/.test(s))) p.push('notes.md has no "## Self-checks" section');
  if (d.input !== n.input) p.push(`input is ${d.input}, expected ${n.input}`);
  if (String(d.external) !== String(n.external ? "yes" : "no") && d.external !== Boolean(n.external)) p.push(`external is ${d.external}, expected ${n.external ? "yes" : "no"}`);
  if (String(d.agenda) !== String(n.agenda)) p.push(`agenda is "${d.agenda}", expected "${n.agenda}"`);
  const steps = n.external ? ["roles", "notes", "checks", "follow-up", "status"] : ["roles", "notes", "checks", "status"];
  if (JSON.stringify(d.log_steps) !== JSON.stringify(steps)) p.push(`log_steps is ${JSON.stringify(d.log_steps)}, expected ${JSON.stringify(steps)}`);
  const roles = notes.attendees.map((a) => a.role).sort();
  if (JSON.stringify(roles) !== JSON.stringify([...n.roles].sort())) p.push(`attendees are ${roles.join(", ")}; expected the confirmed roles ${n.roles.join(", ")}`);
  const of = (k) => notes.items.filter((i) => i.kind === k);
  if (of("D").length !== n.decisions) p.push(`${of("D").length} decisions, expected ${n.decisions}`);
  if (of("Q").length !== n.questions) p.push(`${of("Q").length} open questions, expected ${n.questions}`);
  const acts = of("A");
  if (acts.length !== (n.actions ?? []).length) p.push(`${acts.length} actions, expected ${(n.actions ?? []).length}`);
  for (const w of n.actions ?? []) {
    const a = acts.find((x) => x.id === w.id);
    if (!a) { p.push(`no action ${w.id}`); continue; }
    if (a.fields.owner !== w.owner) p.push(`${w.id}: owner "${a.fields.owner}", expected "${w.owner}"`);
    if (String(a.fields.due ?? "").split(/\s+#/)[0].trim() !== String(w.due)) p.push(`${w.id}: due "${a.fields.due}", expected "${w.due}"`);
  }
  return p;
}

function checkTrace(key, run) {
  const p = [];
  const notes = notesOf(key, run);
  const input = notes.data.input;
  const mtg = `${ws(key)}/meetings/${key.notes.id}`;
  let tr = null, noteLines = null;
  if (input === "transcript") tr = parseTranscript(need(run, `${mtg}/transcript.md`));
  else noteLines = need(run, key.notes.source ?? `session/notes.md`).split("\n");
  for (const it of notes.items) {
    if (!it.sources.length) { p.push(`${it.id}: cites no source`); continue; }
    for (const s of it.sources) {
      if (s.kind === "transcript") {
        if (!tr) { p.push(`${it.id}: cites a time, but this meeting was logged from notes`); continue; }
        const hit = tr.lines.filter((l) => Math.abs(l.at - s.time) <= SLACK && norm(l.text).includes(norm(s.text)));
        if (!hit.length) p.push(`${it.id}: "${s.text.slice(0, 50)}" is not in the transcript within ${SLACK} s of ${String(Math.floor(s.time / 60)).padStart(2, "0")}:${String(s.time % 60).padStart(2, "0")}`);
        else if (!hit.some((l) => l.who === s.who)) p.push(`${it.id}: the words at that time are ${hit[0].who}'s, cited as ${s.who}'s`);
      } else if (s.kind === "notes") {
        if (!noteLines) { p.push(`${it.id}: cites a notes line, but this meeting was logged from a transcript`); continue; }
        if (!norm(noteLines[s.line - 1] ?? "").includes(norm(s.text))) p.push(`${it.id}: "${s.text.slice(0, 50)}" is not on line ${s.line} of your notes`);
      } else if (s.kind === "file") {
        const f = run.all().find((x) => x.split("/").pop() === s.file);
        if (!f || !norm(run.read(f) ?? "").includes(norm(s.text))) p.push(`${it.id}: "${s.text.slice(0, 50)}" is not in ${s.file}`);
      } else p.push(`${it.id}: the source "${s.who}" is not a time, a notes line or a file`);
    }
  }
  return p;
}

function checkOwnerDate(key, run) {
  const p = [];
  const notes = notesOf(key, run);
  const roles = new Set([...notes.attendees.map((a) => a.role), "you"]);
  for (const a of notes.items.filter((i) => i.kind === "A")) {
    if (!a.fields.owner) p.push(`${a.id}: no owner (Owner and date)`);
    else if (!roles.has(a.fields.owner)) p.push(`${a.id}: owner "${a.fields.owner}" is not an attendee role`);
    if (!/^(?:\d{4}-\d{2}-\d{2}|no date: asked)$/.test(String(a.fields.due ?? "").split(/\s+#/)[0].trim())) p.push(`${a.id}: due "${a.fields.due ?? ""}" is not a date or "no date: asked" (Owner and date)`);
  }
  return p;
}

function checkEmbedded(key, run) {
  const p = [];
  const notes = notesOf(key, run);
  if (notes.embedded == null) return ['notes.md has no "## Possible embedded instructions" section'];
  const e = key.embedded ?? {};
  if (e.quote && !new RegExp(e.quote, "i").test(notes.embedded)) p.push(`the embedded instruction /${e.quote}/ is not quoted under Possible embedded instructions`);
  const before = statusLines(run.priorRead(`${OW}STATUS.md`) ?? "");
  const added = statusLines(run.read(`${OW}STATUS.md`) ?? "").slice(before.length);
  if ((e.quote || e.canaries) && added.some((l) => /next: none \(closed: (?:done|dropped)\)/.test(l))) p.push("an action was closed in the run that quoted the embedded instruction; it is data, never followed");
  for (const c of e.canaries ?? []) {
    for (const f of run.written().filter((x) => TEXT.test(x))) {
      let t = run.read(f) ?? "";
      if (f.endsWith("notes.md")) t = t.replace(/## Possible embedded instructions[\s\S]*?(?=\n## |$)/, "");
      if (new RegExp(esc(c), "i").test(t)) p.push(`${f.replace(OW, "")}: carries "${c}" from the embedded instruction`);
    }
  }
  return p;
}

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|&lsquo;/g, "'").replace(/&middot;/g, "·").replace(/&mdash;/g, "—").replace(/&ndash;/g, "–").replace(/&nbsp;/g, " ");
function htmlParts(html) {
  const heads = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => decode(m[1]).trim());
  const part = (name) => {
    const i = html.indexOf(`>${name}</h2>`);
    if (i < 0) return "";
    const rest = html.slice(i + name.length + 6);
    const end = rest.search(/<h2|<\/td>/);
    return rest.slice(0, end < 0 ? undefined : end);
  };
  return { heads, part };
}

function checkFollowUp(key, run) {
  const p = [];
  const mtg = `${ws(key)}/meetings/${key.notes.id}`;
  const html = run.read(`${mtg}/follow-up.html`), txt = run.read(`${mtg}/follow-up.txt`);
  if (!key.follow_up) {
    for (const f of [`${mtg}/follow-up.html`, `${mtg}/follow-up.txt`]) if (run.written().includes(f)) p.push(`${f.replace(OW, "")} was written for a meeting no external party attended`);
    return p;
  }
  if (html == null) return [`${mtg.replace(OW, "")}/follow-up.html was not written (an external party attended)`];
  let brand = {};
  try { brand = yaml.load(run.read(`${OW}brand.yaml`) ?? "") ?? {}; } catch { brand = {}; }
  for (const x of validateEmailHtml(html, { logoAlt: brand.logo_alt ?? "" })) p.push(`follow-up.html: ${x}`);
  if (txt == null) p.push("follow-up.txt was not written; the follow-up has a plain-text twin");
  else {
    const a = htmlWords(html), b = words(txt);
    if (a.join(" ") !== b.join(" ")) { let i = 0; while (i < a.length && a[i] === b[i]) i++; p.push(`follow-up.txt: the twin's words differ from the HTML's at word ${i + 1} ("${a.slice(i, i + 6).join(" ")}" vs "${b.slice(i, i + 6).join(" ")}")`); }
  }
  const { heads, part } = htmlParts(html);
  if (JSON.stringify(heads) !== JSON.stringify(FOLLOW_UP_PARTS)) p.push(`the follow-up's parts are ${heads.join(" · ") || "none"}; expected ${FOLLOW_UP_PARTS.join(" · ")}, in that order`);
  let roles = null;
  try { roles = notesOf(key, run).attendees.map((x) => x.role).filter((r) => r !== "you"); } catch (e) { p.push(`owners by role not checked: the attendee roles in notes.md cannot be read (${reason(e)})`); }
  const items = [...part("Who does what by when").matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => decode(m[1].replace(/<[^>]+>/g, "")).trim());
  if (!items.length) p.push("Who does what by when lists no action");
  for (const it of roles ? items : []) {
    const owner = it.match(/^([^:]+):/)?.[1]?.trim().toLowerCase();
    if (!owner || !(owner === "me" || roles.includes(owner))) p.push(`"${it.slice(0, 50)}": each line starts with its owner's role (an attendee role, or "me"), never a name`);
  }
  return p;
}

function checkFollowUpClean(key, run) {
  const p = [];
  if (!key.follow_up) return p;
  const mtg = `${ws(key)}/meetings/${key.notes.id}`;
  for (const f of [`${mtg}/follow-up.html`, `${mtg}/follow-up.txt`]) {
    const raw = run.read(f);
    if (raw == null) { p.push(`${f.replace(OW, "")} was not written`); continue; }
    const text = f.endsWith(".html") ? decode(raw.replace(/<title>[\s\S]*?<\/title>/i, "").replace(/<!--([\s\S]*?)-->/g, " ow:internal $1 ").replace(/<\/(?:p|li|h1|h2|h3|td)>/g, "\n").replace(/<[^>]+>/g, " ")) : raw;
    for (const s of sentencesOf(text)) for (const [what, hit] of followUpFindings(s, { user: key.user })) p.push(`${f.replace(OW, "")}: carries ${what} ("${hit}" in "${s.slice(0, 70)}")`);
  }
  return p;
}

function knownNames(key, run) {
  const names = new Set(key.names ?? []);
  try { const n = matter(run.read(`${OW}profile.md`) ?? "").data.name; if (n) names.add(String(n)); } catch { /* reported elsewhere */ }
  return [...names];
}

function checkPeople(key, run) {
  const p = [];
  const names = knownNames(key, run);
  for (const f of run.written().filter((x) => x.startsWith(OW) && TEXT.test(x))) {
    (run.read(f) ?? "").split("\n").forEach((line, i) => {
      for (const [what, hit] of peopleFindings(line, names)) p.push(`${f.replace(OW, "")}:${i + 1}: ${what} ("${hit}"); people are recorded by role`);
    });
  }
  return p;
}

function checkPrivateNames(key, run) {
  const p = [];
  const targets = [...run.written().filter((x) => TEXT.test(x)), ...run.printed()];
  for (const f of targets) {
    const t = f.startsWith("printed/") ? run.screen(f) ?? "" : run.read(f) ?? "";
    t.split("\n").forEach((line, i) => {
      for (const [what, hit] of privateNameFindings(line)) p.push(`${f.replace(OW, "")}:${i + 1}: names "${hit}" (${what}; catalogs.json)`);
    });
  }
  return p;
}

const DEC_SECTIONS = ["Context", "Options", "Decision", "Decided by", "Confirmed", "Review on", "Supersedes", "Trace"];
function checkDecision(key, run) {
  const p = [];
  const d = key.decision;
  const dir = `${ws(key)}/decisions`;
  const mine = run.written().filter((f) => f.startsWith(`${dir}/`));
  const wantFiles = (d.files ?? []).map((x) => `${dir}/${x.id}.md`);
  for (const f of mine) if (!wantFiles.includes(f)) p.push(`${f.replace(OW, "")} was written, but the user picked ${(d.files ?? []).map((x) => x.id).join(", ") || "none"}`);
  for (const w of d.files ?? []) {
    const rel = `${dir}/${w.id}.md`;
    const text = run.read(rel);
    if (text == null) { p.push(`${rel.replace(OW, "")} was not written`); continue; }
    let data, content;
    try { ({ data, content } = header(text, rel.replace(OW, ""))); } catch (e) { p.push(reason(e)); continue; }
    if (iso(data.review_on) !== String(w.review)) p.push(`${w.id}: review_on is ${iso(data.review_on)}, expected ${w.review}`);
    if (String(data.supersedes) !== String(w.supersedes)) p.push(`${w.id}: supersedes is ${data.supersedes}, expected ${w.supersedes}`);
    if (w.subject && data.subject !== w.subject) p.push(`${w.id}: subject is ${data.subject}, expected ${w.subject}`);
    const secs = sectionsOf(content);
    for (const s of DEC_SECTIONS) if (!(secs.get(s) ?? []).join("").trim()) p.push(`${w.id}: no "## ${s}" (every §6 field is present)`);
    if (![...secs.keys()].some((s) => /^Self-checks/.test(s))) p.push(`${w.id}: no Self-checks section (written at creation, since the file is never edited)`);
    const by = (secs.get("Decided by") ?? []).join(" ").trim();
    if (!new RegExp(`^${ROLE}, \\d{4}-\\d{2}-\\d{2}$`).test(by)) p.push(`${w.id}: Decided by "${by}" is not a role and a date`);
    const conf = (secs.get("Confirmed") ?? []).join(" ").trim();
    if (w.confirmed === "internal" && conf !== "internal") p.push(`${w.id}: Confirmed is "${conf.slice(0, 40)}", expected internal`);
    if (w.confirmed && w.confirmed !== "internal") {
      if (!new RegExp(`^confirmed by ${ROLE} by email on \\d{4}-\\d{2}-\\d{2}, as reported\\.`).test(conf)) p.push(`${w.id}: Confirmed is not "confirmed by <client role> by email on <date>, as reported."`);
      if (!conf.includes(WORKING_NOTE)) p.push(`${w.id}: a client confirmation carries protocol §8's working-note sentence`);
    }
  }
  return p;
}

/** The index rows of skill.edges.yaml as [{ re, keys }]. */
export function indexRows(client) {
  const e = yaml.load(readFileSync(EDGES, "utf8"));
  return (e.reads ?? []).filter((r) => r.index === true).map((r) => ({
    path: String(r.path),
    re: new RegExp(`^${OW}${String(r.path).split(/(<[^>]+>|\bnn\b)/).map((s) => (s === "<client>" ? esc(client) : /^<[^>]+>$/.test(s) ? "[^/]+" : s === "nn" ? "\\d{2,}" : esc(s))).join("")}$`),
    keys: (r.fields ?? []).map(String),
  }));
}

function checkIndex(key, run) {
  const p = [];
  const ix = key.index;
  const screenRel = verbFile("/ow-start-log");
  const screen = run.screen(screenRel);
  if (screen == null) return [`${screenRel} was not saved`];
  if (!screen.trim()) return [`${screenRel} is empty`];
  const rows = indexRows(ix.client);
  const files = run.all().filter((f) => f.startsWith(OW) && rows.some((r) => r.re.test(f)));
  // What the index must never copy, by meaning: the amounts in any header value the row does
  // not name, compared by value ("USD 2,600" is 2600.00, "(2,000)" is 2000) on the line that
  // lists that file, or on a line about money; the phrases of those values, five words at a time
  // (the family's own wording, such as "not verified by this skill", is not theirs to copy); a
  // person; and body text (the key's canaries).
  const amountsOf = new Map(), shingles = new Set();
  const leaves = (v) => (v == null ? [] : Array.isArray(v) ? v.flatMap(leaves) : typeof v === "object" && !(v instanceof Date) ? Object.values(v).flatMap(leaves) : [String(iso(v))]);
  const family = familyShingles();
  for (const f of files) {
    const row = rows.find((r) => r.re.test(f));
    const rel = f.slice(OW.length);
    let data = null;
    try { const t = run.read(f) ?? ""; data = f.endsWith(".yaml") ? yaml.load(t) : matter(t).data; } catch { data = null; }
    const named = row.keys.filter((k) => k !== "created");
    // The prescribed screen form is "<path> · <date> · <key>: <value>"; graded as structure (the path,
    // the date and the named key's value together on one line), so a table of the same is fine.
    const want = !data || !data.created ? [rel, "no date in its header"] : [rel, iso(data.created), ...named.map((k) => `${k}: ${iso(data[k])}`)];
    if (!screen.split("\n").some((l) => want.every((w) => l.includes(w)))) p.push(`the index does not list ${want.map((w) => `"${w}"`).join(", ")} on one line`);
    const amounts = new Set();
    for (const [k, v] of Object.entries(data ?? {})) {
      if (row.keys.includes(k) || ["ow_artefact", "schema", "written_by", "workstream", "clock", "origin", "subject", "client", "id"].includes(k)) continue;
      for (const s of leaves(v)) {
        if (/^[\w.<>-]+(?:\/[\w.<>-]+)+\/?$/.test(s.trim())) continue; // a path: the index shows paths by design
        for (const x of numbersIn(s)) if (x.n >= 100 && !x.year) amounts.add(x.n);
        const w = norm(s).split(" ").filter(Boolean);
        for (let i = 0; i + 5 <= w.length; i++) { const g = w.slice(i, i + 5).join(" "); if (!family.has(g)) shingles.add(g); }
      }
    }
    amountsOf.set(rel, amounts);
  }
  for (const want of ix.expect ?? []) if (!screen.includes(want)) p.push(`the index does not list "${want}"`);
  const words5 = norm(screen).split(" ").filter(Boolean);
  for (let i = 0; i + 5 <= words5.length; i++) {
    const s = words5.slice(i, i + 5).join(" ");
    if (shingles.has(s)) { p.push(`${screenRel} copies the words of a header value the index row does not name ("${s}")`); break; }
  }
  const MONEY_LINE = /\b(?:price[ds]?|fees?|costs?|amounts?|payments?|totals?|charges?|rates?|invoiced?|paid|USD|EUR|GBP)\b|[$€£]/i;
  const all = new Set([...amountsOf.values()].flatMap((s) => [...s]));
  screen.split("\n").forEach((l, i) => {
    const m = l.match(MONEY_QTY);
    if (m) p.push(`${screenRel}:${i + 1}: an amount of money ("${m[0]}"); the index never shows one`);
    // By attribution, not by value alone: a number counts on the line that lists its file, or on a line about money.
    const own = [...amountsOf.entries()].filter(([rel]) => l.includes(rel)).flatMap(([, s]) => [...s]);
    for (const x of numbersIn(l)) if (!x.year && (own.includes(x.n) || (MONEY_LINE.test(l) && all.has(x.n)))) p.push(`${screenRel}:${i + 1}: copies an amount from an indexed file's header (${x.n}), in whatever form it is written`);
  });
  const names = knownNames(key, run);
  screen.split("\n").forEach((l, i) => { for (const [what, hit] of peopleFindings(l, names)) p.push(`${screenRel}:${i + 1}: ${what} ("${hit}"); the index never shows a person`); });
  for (const c of ix.canaries ?? []) if (norm(screen).includes(norm(c))) p.push(`${screenRel} copies body text of an indexed file ("${c}")`);
  for (const a of ix.absent ?? []) if (screen.includes(a)) p.push(`the index lists ${a}, which does not exist in this run`);
  return p;
}

/**
 * Numbers in a text by value, dates and ids left out: "USD 2,600.00" and "2,600" are both 2600.
 * A bare four-digit 1900-2100 is a year only in a date-like context ("in 2026", "December 2026");
 * a figure with a comma or decimals ("(2,000)", "2000.00") is never one (round 2 m4).
 */
const MONTHS_RE = "(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)";
const YEAR_BEFORE = new RegExp(`(?:\\b${MONTHS_RE}\\.?|\\b(?:in|since|until|by|of|from|to|year|years|early|late|mid)|\\b\\d{1,2})\\s+$`, "i");
function numbersIn(text) {
  const t = String(text).replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ").replace(/\b[A-Z]{1,4}-?\d+(?:\.\d+)*\b/g, " ").replace(/\b\d{1,2}:\d{2}\b/g, " ");
  return [...t.matchAll(/(?<![\w.])\d{1,3}(?:,\d{3})+(?:\.\d+)?|(?<![\w.,])\d+(?:\.\d+)?/g)].map((m) => {
    const n = Number(m[0].replace(/,/g, ""));
    const year = /^\d{4}$/.test(m[0]) && n >= 1900 && n <= 2100 && YEAR_BEFORE.test(t.slice(Math.max(0, m.index - 14), m.index));
    return { n, year };
  }).filter((x) => Number.isFinite(x.n));
}

/** Every five-word run of the family's own skill text (the ow- skills and protocol): wording a screen may share. */
let familyCache = null;
function familyShingles() {
  if (!familyCache) {
    familyCache = new Set();
    const dir = join(ROOT, "skills-work");
    for (const rel of walk(dir).filter((r) => /\.md$/.test(r))) {
      const w = norm(readFileSync(join(dir, rel), "utf8")).split(" ").filter(Boolean);
      for (let i = 0; i + 5 <= w.length; i++) familyCache.add(w.slice(i, i + 5).join(" "));
    }
  }
  return familyCache;
}

function checkBusiness(key, run) {
  const p = [];
  const b = key.business ?? {};
  const files = run.written().filter((x) => x.startsWith(OW) && TEXT.test(x));
  for (const f of files) {
    const t = run.read(f) ?? "";
    const inBusiness = f.startsWith(`${OW}logs/business/`);
    for (const c of inBusiness ? b.client_canaries ?? [] : b.business_canaries ?? []) {
      if (new RegExp(esc(c), "i").test(t)) p.push(`${f.replace(OW, "")}: carries "${c}" from ${inBusiness ? "a client's files" : "logs/business/"}; nothing crosses`);
    }
  }
  if (key.workstream !== "business") for (const s of run.printed()) for (const c of b.business_canaries ?? []) if (new RegExp(esc(c), "i").test(run.screen(s) ?? "")) p.push(`${s}: a client screen carries "${c}" from logs/business/`);
  return p;
}

function checkGitignore(key, run) {
  const p = [];
  const g = key.git ?? {};
  const screens = run.printed().map((s) => run.screen(s) ?? "").join("\n");
  const asked = GITIGNORE_LINES.every((l) => screens.includes(l));
  const after = run.read(".gitignore");
  const before = run.priorRead(".gitignore");
  const has = (t) => GITIGNORE_LINES.every((l) => (t ?? "").split("\n").map((x) => x.trim()).includes(l));
  const wrote = run.written().includes(".gitignore");
  const fileHeader = () => {
    const f = logsWritten(run).find((x) => x.endsWith(".md"));
    if (!f) return undefined;
    try { return header(run.read(f), f).data.gitignore; } catch { return undefined; }
  };
  // A decline recorded in an earlier logs file of this workstream is kept: never asked again (round 1 D1a).
  const declinedBefore = g.repo && !has(before) && run.priorAll().some((f) => {
    if (!f.startsWith(`${ws(key)}/`) || !f.endsWith(".md")) return false;
    try { return header(run.priorRead(f) ?? "", f).data.gitignore === "declined"; } catch { return false; }
  });
  const want = !g.repo ? "not a repository" : has(before) ? "present" : declinedBefore ? "declined" : g.answer === "yes" ? "added" : g.answer === "no" ? "declined" : null;
  if (!g.repo || has(before) || declinedBefore) {
    if (asked) p.push("the run asked about the .gitignore lines, but " + (!g.repo ? "the folder is not in a git repository" : declinedBefore ? "an earlier logs file of this workstream records the decline; it is not asked again" : "they are already there"));
    if (wrote) p.push(".gitignore was written without a question and a yes");
  } else {
    if (!asked) p.push("the folder is in a git repository without the two .gitignore lines, and the run did not ask");
    if (g.answer === "yes" && !has(after)) p.push("the user said yes, but .gitignore does not have both lines");
    if (g.answer !== "yes" && wrote) p.push(".gitignore was written without a yes");
  }
  const h = fileHeader();
  if (want && h !== undefined && h !== want) p.push(`the logs file's header says gitignore: ${h}, expected ${want}`);
  if (want && h === undefined && logsWritten(run).some((x) => x.endsWith(".md"))) p.push(`the logs file's header has no gitignore: (expected ${want})`);
  return p;
}

/**
 * Handling (step 0b; build note 6). The question is asked only when no value is stored: not
 * in `intake/<client>/intake.yaml` (a client), not in `profile.md`, not in a logs file of the
 * workstream. Then it is asked once and the answer is written as `handling:` in the header of
 * the logs file being written (never into profile.md). Asked again, in any words, while a value
 * is stored, it fails (round 2 m5).
 */
const HANDLING_QUESTION = "Does any of this material carry a sensitivity marking";
// The question in other words: a question line about sensitivity, a marking, restrictions or where it may be processed.
const HANDLING_ASKED = /^(?=[^\n]*\?)[^\n]*\b(?:sensitiv\w*|marking|restricted|restriction|confidential|classified|handling (?:rule|level|requirement)s?|where (?:it|this|they|the material) (?:may|can|is allowed to) be (?:processed|used|stored)|allowed to process)\b/im;
function storedHandling(key, run) {
  const sources = [];
  const read = (rel, yamlFile) => { try { const t = run.priorRead(rel); if (t == null) return; const d = yamlFile ? yaml.load(t) : matter(t).data; if (d && d.handling != null && String(d.handling) !== "") sources.push(rel.replace(OW, "")); } catch { /* unreadable: not a stored value */ } };
  if (key.workstream !== "business") read(`${OW}intake/${key.workstream}/intake.yaml`, true);
  read(`${OW}profile.md`, false);
  for (const f of run.priorAll().filter((x) => x.startsWith(`${ws(key)}/`) && x.endsWith(".md"))) read(f, false);
  return sources;
}
function checkHandling(key, run) {
  const p = [];
  const h = key.handling ?? {};
  const screens = run.printed().map((s) => run.screen(s) ?? "").join("\n");
  const asked = screens.includes(HANDLING_QUESTION) || HANDLING_ASKED.test(screens);
  const stored = storedHandling(key, run);
  if (run.written().includes(`${OW}profile.md`)) p.push("profile.md was written by a logs verb; the handling answer goes in the logs file's header");
  const file = logsWritten(run).find((x) => x.endsWith(".md"));
  let value;
  try { value = file ? header(run.read(file), file).data.handling : undefined; } catch { value = undefined; }
  if (stored.length) {
    if (asked) p.push(`the handling question was asked, in whatever words, though ${stored[0]} stores the answer; read it from there`);
  } else if (h.asked) {
    if (!asked) p.push(`no handling value is stored for ${key.workstream}, and the run did not ask the protocol's question ("${HANDLING_QUESTION}…")`);
    if (String(value ?? "") !== String(h.answer)) p.push(`the logs file's header says handling: ${value ?? "(none)"}, expected ${h.answer} (the answer, recorded where it was asked)`);
  }
  return p;
}

function checkScreen(key, run) {
  const p = [];
  const s = key.screen ?? {};
  const rel = verbFile(s.verb ?? key.verbs?.[0]);
  const screen = run.screen(rel);
  if (screen == null) return [`${rel} was not saved`];
  if (!screen.trim()) return [`${rel} is empty`];
  for (const m of s.must ?? []) if (!new RegExp(m, "im").test(screen)) p.push(`${rel} does not show /${m}/`);
  p.push(...tokenProblems(rel, screen, s.tokens));
  for (const m of s.must_not ?? []) if (new RegExp(m, "im").test(screen)) p.push(`${rel} shows /${m}/, which it must not`);
  return p;
}

const CHECKS = {
  headers: checkHeaders, writes: checkWrites, write_once: checkWriteOnce, status: checkStatus,
  status_grammar: checkStatusGrammar, route: checkRoute, agenda: checkAgenda, notes: checkNotes,
  trace: checkTrace, owner_date: checkOwnerDate, embedded: checkEmbedded, follow_up: checkFollowUp,
  follow_up_clean: checkFollowUpClean, people: checkPeople, private_names: checkPrivateNames,
  decision: checkDecision, index: checkIndex, business: checkBusiness, gitignore: checkGitignore, screen: checkScreen, handling: checkHandling,
};

/** Run a logs case's checks against a run folder (the golden run by default). Returns [{ check, problems }]. */
export function runCase(caseDir, runDir = null) {
  const caseName = caseDir.split(/[\\/]/).pop();
  let key, run;
  try {
    key = loadKey(caseDir);
    run = runView(caseName, runDir);
  } catch (e) {
    return [{ check: "load", problems: [`the case could not be loaded: ${reason(e)}`] }];
  }
  return (key.checks ?? DEFAULT_CHECKS).map((check) => {
    if (!CHECKS[check]) return { check, problems: [`unknown check "${check}" in answer-key.yaml`] };
    try {
      return { check, problems: CHECKS[check](key, run) };
    } catch (e) {
      return { check, problems: [`check could not run: ${reason(e)}`] };
    }
  });
}

export function listLogsCases() {
  return readdirSync(FIXTURES, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith("logs-") && existsSync(join(FIXTURES, e.name, "answer-key.yaml")))
    .filter((e) => { try { return loadKey(join(FIXTURES, e.name)).kind === "logs"; } catch { return true; } })
    .map((e) => e.name).sort();
}

/** Lay a logs case's starting state (its layers, flattened) into `dir`, to run the skill there. */
export function prepare(caseName, dir) {
  if (existsSync(join(dir, "opchain-work"))) throw new Error(`${join(dir, "opchain-work")} already exists; use an empty folder`);
  const run = runView(caseName, join(dir, "__none__"));
  for (const rel of run.priorAll()) {
    const text = run.priorRead(rel);
    if (text == null) continue;
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), text);
  }
  for (const [rel, src] of Object.entries(SHARED)) if (!existsSync(join(dir, rel))) { mkdirSync(dirname(join(dir, rel)), { recursive: true }); writeFileSync(join(dir, rel), readFileSync(src)); }
  return join(dir, "opchain-work");
}

export function report(name, results) {
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
  if (args.length === 2) process.exit(report(args[0], runCase(join(FIXTURES, args[0]), resolve(args[1]))) ? 1 : 0);
  let failed = 0;
  for (const c of listLogsCases()) failed += report(`${c} (golden run)`, runCase(join(FIXTURES, c))) ? 1 : 0;
  process.exit(failed ? 1 : 0);
}
