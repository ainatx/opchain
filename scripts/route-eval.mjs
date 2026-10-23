#!/usr/bin/env node
// Offline evaluation harness for the opchain skill router.
//
// Three commands:
//
//   build-dataset  — scan Claude Code transcripts (main sessions only) and label
//                    every human prompt with what the session actually did next:
//                    an explicit Skill call, an implied skill (git/deploy/audit
//                    commands), or nothing. Each row also carries the
//                    conversation context the hook sends (previous human prompt,
//                    tail of the last assistant message). Prints label counts
//                    and writes JSONL.
//
//   run            — route every dataset row through the router (or a canned
//                    fixture transport), store decision + trace per row, and
//                    write a markdown report: accuracy, per-skill P/R/F1, the
//                    false-suggestion rate on `none` rows, a threshold sweep
//                    computed from the stored probabilities (never re-queried),
//                    confusions, worst rows, token usage and cost, and what the
//                    suggest allowlist suppresses (decisions are stored with
//                    the allowlist off, OPCHAIN_ROUTE_SUGGEST_ALL semantics).
//
//   outcomes       — read the hook's route log and summarise the production
//                    outcome records (self-labelling): per-skill suggestions,
//                    follow rate, what the agent did instead, proxy TP/FP/FN,
//                    and the day-8 go/no-go verdict.
//
// The baseline this measures against is the audit's 0/229 PR gates entered
// (docs/audits/2026-10-08-opchain-effectiveness-audit.md §1, §3.1): a router
// that suggests nothing matches the baseline exactly, so the interesting
// number is recall on `implied` rows at a precision on `none` rows that the
// user will tolerate. See docs/runbooks/skill-router-eval.md.
//
// The router itself (plugins/opchain/hooks/lib/route-dispatch.cjs) is loaded
// lazily so this file — and its tests — work before that module lands.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.dirname(HERE);
// The shipped router's thresholds (tiered fits bar, core skill list). The report
// defaults read them from the same constants so the default report applies the
// bar the hook ships (2026-10-09 audit B-03), not a flat one of its own.
const ROUTER = require(path.join(REPO_ROOT, "plugins/opchain/hooks/lib/route-dispatch.cjs"));
const SHIPPED = ROUTER.DEFAULT_THRESHOLDS;

export const DEFAULTS = Object.freeze({
  since: "2026-09-14",
  projectsRoot: path.join(os.homedir(), ".claude", "projects"),
  projects: [
    "-Users-aidanelsesser-deftwright-site*",
    "-Users-aidanelsesser-repos-opchain*",
    "-Users-aidanelsesser-opchain*",
  ],
  datasetOut: "scratch/route-dataset.jsonl",
  evalOut: "scratch/route-eval.jsonl",
  reportOut: "scratch/route-eval.md",
  cacheFile: "scratch/route-cache.json",
  routeModule: "plugins/opchain/hooks/lib/route-dispatch.cjs",
  specFile: "plugins/opchain/hooks/route-spec.json",
  // Reporting thresholds: the shipped router's. `fits: null` means the tiered bar
  // (coreFits for `core`, otherFits for the rest); `--thresholds fits=X` sets a
  // flat bar instead, as OPCHAIN_ROUTE_FITS does in the hook.
  thresholds: { gate: SHIPPED.gate, fits: null, coreFits: SHIPPED.coreFits, otherFits: SHIPPED.otherFits, core: [...SHIPPED.core] },
  // Query-time thresholds: ask the router for everything so the sweep can be
  // computed offline from the stored fits/gate without a second round trip.
  // suggestAll = OPCHAIN_ROUTE_SUGGEST_ALL=1: store every skill's decision so
  // the report can show what the suggest allowlist removes.
  queryThresholds: { fits: 0, gate: 0, suggestAll: true },
  sweep: { fits: [0.3, 0.4, 0.5, 0.6, 0.7], gate: [0.3, 0.5] },
  concurrency: 4,
  maxAttempts: 6,
  promptMaxChars: 2000,
  previousRequestMaxChars: 200,
  assistantLastMaxChars: 400,
  routeLog: path.join(os.tmpdir(), "opchain-route-log.jsonl"),
  // Day-8 go/no-go (docs/runbooks/skill-router-eval.md).
  goNoGo: { minSuggestions: 30, minCorePrecision: 0.8, minSilentRate: 0.95 },
  coreSkills: [...ROUTER.CORE_SKILLS],
  evidenceMaxChars: 120,
  usdPerMillionInput: 0.042,
  apiKeyEnv: "TYPESAFE_API_KEY",
});

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      out._.push(a);
      continue;
    }
    const eq = a.indexOf("=");
    if (eq !== -1) {
      out[a.slice(2, eq)] = a.slice(eq + 1);
      continue;
    }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out[key] = true;
    else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

export function parseThresholds(text, fallback) {
  if (!text || text === true) return { ...fallback };
  const out = { ...fallback };
  for (const part of String(text).split(",")) {
    const [k, v] = part.split("=").map((s) => s.trim());
    if (k && v !== undefined && Number.isFinite(Number(v))) out[k] = Number(v);
  }
  return out;
}

function sha1(text) {
  return createHash("sha1").update(text).digest("hex");
}

function stableJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableJson(value[k])}`)
    .join(",")}}`;
}

// `context` is the router's request shape: off (default) sends no conversation,
// so the row's conversation does not affect the answer and is not hashed.
export function rowHash(row, { model, specVersion, context = false } = {}) {
  return sha1(stableJson({ prompt: row.prompt, repoState: row.repoState ?? null, conversation: context ? row.conversation ?? null : null, context: Boolean(context), model: model ?? null, specVersion: specVersion ?? null }));
}

function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`);
}

function ensureDir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

function writeJsonl(file, rows) {
  ensureDir(file);
  fs.writeFileSync(file, rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""));
}

function pct(n, d) {
  return d ? `${((100 * n) / d).toFixed(1)}%` : "n/a";
}

function f3(x) {
  return Number.isFinite(x) ? x.toFixed(3) : "n/a";
}

function head(text, n = 80) {
  const flat = String(text ?? "").replace(/\s+/g, " ").trim();
  return flat.length > n ? `${flat.slice(0, n - 1)}…` : flat;
}

function mdEscape(text) {
  return String(text).replace(/\|/g, "\\|");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// build-dataset
// ---------------------------------------------------------------------------

export const IMPLIED_RULES = [
  { skill: "oc-git-ops", source: "bash", re: /gh pr create|git commit|git push/ },
  { skill: "oc-deploy-ops", source: "bash", re: /npm run deploy|wrangler deploy/ },
  { skill: "oc-code-auditor", source: "text", re: /\/oc-audit|oc-code-auditor/ },
];

function userTexts(record) {
  const c = record?.message?.content;
  if (typeof c === "string") return { texts: [c], toolResult: false };
  if (!Array.isArray(c)) return { texts: [], toolResult: false };
  return {
    texts: c.filter((p) => p && p.type === "text" && typeof p.text === "string").map((p) => p.text),
    toolResult: c.some((p) => p && p.type === "tool_result"),
  };
}

/** Is this transcript record a human-typed prompt (not a tool result, meta
 *  envelope, task notification or slash command)? Returns the text or null. */
export function humanPromptText(record) {
  if (!record || record.type !== "user" || record.isMeta || record.isSidechain) return null;
  const { texts, toolResult } = userTexts(record);
  if (toolResult || texts.length === 0) return null;
  const text = texts.join("\n").trim();
  if (!text || text.startsWith("<") || text.includes("<command-name>")) return null;
  if (HARNESS_ENVELOPE_RE.test(text)) return null;
  return text;
}

// Harness-authored user records that carry no human intent: interruption
// markers and directory-permission acknowledgements. Artifact-comment relays
// ("[Artifact comment sent to Claude]") are kept — a person wrote those.
const HARNESS_ENVELOPE_RE = /^(\[Request interrupted by user[^\]]*\]|Request directory (approved|denied)\b)/;

function stripSkillPrefix(name) {
  const s = String(name ?? "").trim();
  return s.startsWith("opchain:") ? s.slice("opchain:".length) : s;
}

/** Derive the label for one prompt from the assistant records that followed it. */
export function deriveLabel(assistantRecords, { evidenceMaxChars = DEFAULTS.evidenceMaxChars } = {}) {
  let implied = null;
  for (const rec of assistantRecords) {
    const parts = Array.isArray(rec?.message?.content) ? rec.message.content : [];
    for (const part of parts) {
      if (!part || typeof part !== "object") continue;
      if (part.type === "tool_use" && part.name === "Skill") {
        const skill = stripSkillPrefix(part.input?.skill);
        if (skill.startsWith("oc-")) {
          const args = typeof part.input?.args === "string" ? ` ${part.input.args}` : "";
          return { kind: "skill", skill, evidence: head(redactText(`Skill ${skill}${args}`), evidenceMaxChars) };
        }
      }
      if (implied) continue;
      if (part.type === "tool_use" && part.name === "Bash" && typeof part.input?.command === "string") {
        for (const rule of IMPLIED_RULES) {
          if (rule.source === "bash" && rule.re.test(part.input.command)) {
            implied = { kind: "implied", skill: rule.skill, evidence: head(redactText(`Bash ${part.input.command}`), evidenceMaxChars) };
            break;
          }
        }
      } else if (part.type === "text" && typeof part.text === "string") {
        for (const rule of IMPLIED_RULES) {
          if (rule.source === "text" && rule.re.test(part.text)) {
            const m = part.text.match(rule.re);
            const at = Math.max(0, part.text.indexOf(m[0]) - 40);
            implied = { kind: "implied", skill: rule.skill, evidence: head(redactText(`text …${part.text.slice(at, at + 100)}`), evidenceMaxChars) };
            break;
          }
        }
      }
    }
  }
  return implied ?? { kind: "none", skill: null, evidence: "" };
}

// Credentials pasted into a prompt or a Bash command must not land in the
// dataset either: the stored prompt and label evidence go through the router's
// own redactSecrets (before any truncation, so a cut key cannot slip past the
// patterns), or this minimal fallback when the module is absent.
const FALLBACK_SECRET_PATTERNS = [
  /\bapikey_[A-Za-z0-9_-]{16,}/g,
  /\bsk-(?:ant-|proj-|live-|test-)?[A-Za-z0-9_-]{20,}/g,
  /\bgithub_pat_[A-Za-z0-9_]{30,}/g,
  /\bgh[pousr]_[A-Za-z0-9]{30,}/g,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}/gi,
];
let secretRedactor;
export function redactText(text) {
  if (secretRedactor === undefined) {
    try {
      secretRedactor = loadRouteModule().redactSecrets ?? null;
    } catch {
      secretRedactor = null;
    }
  }
  if (secretRedactor) return secretRedactor(text);
  let out = String(text ?? "");
  for (const re of FALLBACK_SECRET_PATTERNS) out = out.replace(re, "[REDACTED]");
  return out;
}

// The router's own redactor/normaliser when it is present, so the dataset
// stores exactly what route() will send; a plain head/tail otherwise.
let conversationNormaliser;
function normaliseConversation(raw) {
  if (conversationNormaliser === undefined) {
    try {
      conversationNormaliser = loadRouteModule().normalizeConversation ?? null;
    } catch {
      conversationNormaliser = null;
    }
  }
  if (conversationNormaliser) return conversationNormaliser(raw);
  const prev = typeof raw.previous_request === "string" && raw.previous_request.trim() ? raw.previous_request.trim() : null;
  const last = typeof raw.assistant_last === "string" && raw.assistant_last.trim() ? raw.assistant_last.trim() : null;
  const n = DEFAULTS.assistantLastMaxChars;
  return {
    previous_request: prev ? prev.slice(0, DEFAULTS.previousRequestMaxChars) : null,
    assistant_last: last ? (last.length > n ? `…${last.slice(last.length - (n - 1))}` : last) : null,
  };
}

function assistantTextParts(record) {
  const c = record?.message?.content;
  if (typeof c === "string") return c.trim() ? [c] : [];
  if (!Array.isArray(c)) return [];
  return c.filter((p) => p && p.type === "text" && typeof p.text === "string" && p.text.trim()).map((p) => p.text);
}

export function repoStateFromRecord(record) {
  const cwd = record?.cwd ?? null;
  return {
    gitBranch: record?.gitBranch ?? null,
    cwd,
    isDeftwright: typeof cwd === "string" && cwd.includes("deftwright"),
    isWorktree: typeof cwd === "string" && cwd.includes("/.claude/worktrees/"),
  };
}

async function readRecords(file) {
  const records = [];
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      records.push(JSON.parse(line));
    } catch {
      // Truncated or partial line (a session still being written). Skip it.
    }
  }
  return records;
}

/** Turn one session's records into labelled prompt rows. */
export function rowsFromRecords(records, { projectDir, session, since, promptMaxChars = DEFAULTS.promptMaxChars } = {}) {
  const sinceIso = since ? new Date(since).toISOString() : null;
  const rows = [];
  const seen = new Set();
  let current = null;
  // Conversation context, same rules as the hook (route-dispatch
  // conversationFromRecords): the previous human prompt (any, even a deduped
  // or pre-cutoff one) and the last assistant message's text — all text blocks
  // sharing its message.id — before this prompt.
  let previousHuman = null;
  let lastAssistant = { id: null, texts: [] };

  const flush = () => {
    if (!current) return;
    const label = deriveLabel(current.assistant);
    const prompt = redactText(current.text);
    const row = {
      id: `${session}:${current.record.uuid ?? sha1(current.text).slice(0, 12)}`,
      project_dir: projectDir,
      session,
      at: current.record.timestamp ?? null,
      prompt: prompt.length > promptMaxChars ? prompt.slice(0, promptMaxChars) : prompt,
      cwd: current.record.cwd ?? null,
      gitBranch: current.record.gitBranch ?? null,
      label,
      turnsUntilNextPrompt: current.assistant.length,
      repoState: repoStateFromRecord(current.record),
      conversation: current.conversation,
    };
    rows.push(row);
    current = null;
  };

  for (const rec of records) {
    if (!rec || typeof rec !== "object" || rec.isSidechain) continue;
    const text = humanPromptText(rec);
    if (text !== null) {
      flush();
      const conversation = normaliseConversation({ previous_request: previousHuman, assistant_last: lastAssistant.texts.join("\n") });
      previousHuman = text;
      const ts = rec.timestamp ?? null;
      if (sinceIso && ts && ts < sinceIso) continue;
      const key = text.replace(/\s+/g, " ").trim();
      if (seen.has(key)) continue;
      seen.add(key);
      current = { record: rec, text, assistant: [], conversation };
      continue;
    }
    if (rec.type === "assistant") {
      const parts = assistantTextParts(rec);
      if (parts.length) {
        const id = rec.message?.id ?? null;
        if (id && id === lastAssistant.id) lastAssistant.texts.push(...parts);
        else lastAssistant = { id, texts: parts };
      }
    }
    if (current && rec.type === "assistant") current.assistant.push(rec);
  }
  flush();
  return rows;
}

export function listTranscriptFiles({ projectsRoot, projects }) {
  if (!fs.existsSync(projectsRoot)) return [];
  const patterns = projects.map(globToRegExp);
  const files = [];
  for (const dir of fs.readdirSync(projectsRoot).sort()) {
    if (!patterns.some((re) => re.test(dir))) continue;
    const full = path.join(projectsRoot, dir);
    if (!fs.statSync(full).isDirectory()) continue;
    // Main sessions only: *.jsonl directly in the project dir, never */subagents/*.
    for (const name of fs.readdirSync(full).sort()) {
      if (!name.endsWith(".jsonl")) continue;
      const fp = path.join(full, name);
      if (fs.statSync(fp).isFile()) files.push({ projectDir: dir, file: fp, session: name.slice(0, -".jsonl".length) });
    }
  }
  return files;
}

export function firstWord(prompt) {
  const w = String(prompt).trim().split(/\s+/)[0] ?? "";
  return w.toLowerCase().replace(/^[^a-z0-9/@#]+|[^a-z0-9/@#]+$/g, "");
}

export function summarizeDataset(rows) {
  const byKind = {};
  const bySkill = {};
  const firstWords = {};
  for (const r of rows) {
    byKind[r.label.kind] = (byKind[r.label.kind] ?? 0) + 1;
    if (r.label.skill) {
      const key = `${r.label.skill} (${r.label.kind})`;
      bySkill[key] = (bySkill[key] ?? 0) + 1;
    }
    if (r.label.kind === "none") {
      const w = firstWord(r.prompt) || "(punctuation)";
      firstWords[w] = (firstWords[w] ?? 0) + 1;
    }
  }
  const sortDesc = (o) => Object.entries(o).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return { total: rows.length, byKind: sortDesc(byKind), bySkill: sortDesc(bySkill), noneFirstWords: sortDesc(firstWords).slice(0, 20) };
}

export async function buildDataset(opts = {}) {
  const projectsRoot = opts.projectsRoot ?? DEFAULTS.projectsRoot;
  const projects = opts.projects ?? DEFAULTS.projects;
  const since = opts.since ?? DEFAULTS.since;
  const files = listTranscriptFiles({ projectsRoot, projects });
  const rows = [];
  const sessions = new Set();
  // A session resumed from another worktree has its transcript copied into
  // both project dirs; ids are session:uuid, so keep the first copy only.
  const seenIds = new Set();
  let duplicates = 0;
  for (const { projectDir, file, session } of files) {
    const records = await readRecords(file);
    const sessionRows = rowsFromRecords(records, { projectDir, session, since });
    if (sessionRows.length) sessions.add(session);
    for (const row of sessionRows) {
      if (seenIds.has(row.id)) {
        duplicates++;
        continue;
      }
      seenIds.add(row.id);
      rows.push(row);
    }
  }
  rows.sort((a, b) => String(a.at ?? "").localeCompare(String(b.at ?? "")) || a.id.localeCompare(b.id));
  if (opts.out) writeJsonl(opts.out, rows);
  return { rows, files: files.length, sessions: sessions.size, duplicates, summary: summarizeDataset(rows) };
}

export function formatDatasetSummary({ rows, files, sessions, duplicates = 0, summary }, out) {
  const lines = [];
  lines.push(`scanned ${files} main-session transcript(s); ${sessions} produced prompts; ${rows.length} labelled prompt(s)${duplicates ? ` (${duplicates} duplicate id(s) from copied transcripts dropped)` : ""}${out ? ` → ${out}` : ""}`);
  lines.push("", "label kinds:");
  for (const [k, n] of summary.byKind) lines.push(`  ${k.padEnd(8)} ${String(n).padStart(6)}  ${pct(n, summary.total)}`);
  lines.push("", "per skill:");
  for (const [k, n] of summary.bySkill) lines.push(`  ${k.padEnd(32)} ${String(n).padStart(6)}`);
  lines.push("", "20 most common first words of `none` prompts:");
  for (const [w, n] of summary.noneFirstWords) lines.push(`  ${w.padEnd(20)} ${String(n).padStart(6)}`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// run — routing
// ---------------------------------------------------------------------------

/** JSON-file-backed cache handed to route() and used for harness-level reuse. */
export class FileCache {
  constructor(file) {
    this.file = file;
    this.data = {};
    this.dirty = false;
    if (file && fs.existsSync(file)) {
      try {
        this.data = JSON.parse(fs.readFileSync(file, "utf8")) ?? {};
      } catch {
        this.data = {};
      }
    }
  }
  has(key) {
    return Object.prototype.hasOwnProperty.call(this.data, key);
  }
  get(key) {
    return this.data[key];
  }
  set(key, value) {
    this.data[key] = value;
    this.dirty = true;
    return this;
  }
  delete(key) {
    const had = this.has(key);
    delete this.data[key];
    if (had) this.dirty = true;
    return had;
  }
  get size() {
    return Object.keys(this.data).length;
  }
  flush() {
    if (!this.file || !this.dirty) return;
    ensureDir(this.file);
    fs.writeFileSync(this.file, JSON.stringify(this.data));
    this.dirty = false;
  }
}

/** A transport that answers every request with the canned fixture content. */
export function fixtureTransport(answers) {
  const reply = async () => (typeof answers === "function" ? answers() : structuredClone(answers));
  const fn = (..._args) => reply();
  fn.send = fn;
  fn.complete = fn;
  fn.request = fn;
  fn.classify = fn;
  fn.fixture = true;
  return fn;
}

export function loadRouteModule(modulePath = path.join(REPO_ROOT, DEFAULTS.routeModule)) {
  const abs = path.isAbsolute(modulePath) ? modulePath : path.join(REPO_ROOT, modulePath);
  if (!fs.existsSync(abs)) {
    const err = new Error(`route module not found at ${abs} — the router (plugins/opchain/hooks/lib/route-dispatch.cjs) has not landed, or pass --route-module <path>`);
    err.code = "ROUTE_MODULE_MISSING";
    throw err;
  }
  const mod = require(abs);
  if (typeof mod.route !== "function") throw new Error(`route module ${abs} does not export route()`);
  return mod;
}

export function loadSpec(specFile, { optional = false } = {}) {
  const abs = path.isAbsolute(specFile) ? specFile : path.join(REPO_ROOT, specFile);
  if (!fs.existsSync(abs)) {
    if (optional) return { skills: {} };
    const err = new Error(`route spec not found at ${abs} — run scripts/gen-route-spec.mjs or pass --spec <file>`);
    err.code = "SPEC_MISSING";
    throw err;
  }
  return JSON.parse(fs.readFileSync(abs, "utf8"));
}

export function specVersionOf(spec) {
  if (spec && typeof spec.version === "string") return spec.version;
  return sha1(stableJson(spec ?? null)).slice(0, 12);
}

// Retry 429 and 5xx (TypeSafe's overload is 529). route() never throws for a
// transport failure; it returns trace.error = "typesafe <status>: …", which
// runEval rethrows so it reaches this check (2026-10-09 audit B-01).
function isRetryable(err) {
  if (!err) return false;
  const status = Number(err.status ?? err.statusCode ?? err.response?.status);
  if (status === 429 || (status >= 500 && status <= 599)) return true;
  return /\b429\b|rate.?limit|too many requests|\btypesafe 5\d\d\b/i.test(String(err.message ?? err));
}

function statusFromTraceError(text) {
  const m = /\btypesafe (\d{3})\b/.exec(String(text));
  return m ? Number(m[1]) : undefined;
}

function retryAfterMs(err, attempt) {
  // An explicit retryAfterMs is milliseconds; `retryAfter` and the HTTP
  // Retry-After header are seconds (an HTTP-date form is ignored).
  const ms = Number(err?.retryAfterMs);
  if (Number.isFinite(ms) && ms > 0) return ms;
  const seconds = Number(err?.retryAfter ?? err?.headers?.["retry-after"] ?? err?.response?.headers?.get?.("retry-after"));
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  return Math.min(30_000, 1000 * 2 ** attempt) + Math.floor(Math.random() * 250);
}

async function withBackoff(fn, { maxAttempts = DEFAULTS.maxAttempts, sleepFn = sleep, onRetry } = {}) {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (!isRetryable(err) || attempt >= maxAttempts) throw err;
      const wait = retryAfterMs(err, attempt);
      onRetry?.(attempt, wait, err);
      await sleepFn(wait);
    }
  }
}

async function mapPool(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const lanes = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(lanes);
  return results;
}

/** Extract {input, output} token counts from whatever shape the trace uses. */
export function usageFromTrace(trace) {
  const out = { input: 0, output: 0 };
  const seen = new Set();
  const walk = (v, depth) => {
    if (!v || typeof v !== "object" || depth > 6 || seen.has(v)) return;
    seen.add(v);
    if (Array.isArray(v)) {
      for (const x of v) walk(x, depth + 1);
      return;
    }
    for (const [k, val] of Object.entries(v)) {
      if (typeof val === "number") {
        if (/^(input_tokens|inputTokens|prompt_tokens|promptTokens)$/.test(k)) out.input += val;
        else if (/^(output_tokens|outputTokens|completion_tokens|completionTokens)$/.test(k)) out.output += val;
      } else walk(val, depth + 1);
    }
  };
  walk(trace, 0);
  return out;
}

export function stratifiedSample(rows, limit, seed = 42) {
  if (!limit || rows.length <= limit) return rows.slice();
  let s = seed >>> 0 || 1;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
  const strata = new Map();
  for (const r of rows) {
    const key = r.label.kind === "none" ? "none" : `${r.label.kind}:${r.label.skill}`;
    if (!strata.has(key)) strata.set(key, []);
    strata.get(key).push(r);
  }
  for (const list of strata.values()) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
  }
  // One from every stratum first, then proportional to stratum size.
  const picked = [];
  const cursors = new Map([...strata.keys()].map((k) => [k, 0]));
  const take = (key) => {
    const list = strata.get(key);
    const c = cursors.get(key);
    if (c >= list.length) return false;
    picked.push(list[c]);
    cursors.set(key, c + 1);
    return true;
  };
  for (const key of strata.keys()) {
    if (picked.length >= limit) break;
    take(key);
  }
  const keys = [...strata.keys()];
  let guard = 0;
  while (picked.length < limit && guard++ < rows.length * 2) {
    for (const key of keys) {
      if (picked.length >= limit) break;
      const share = strata.get(key).length / rows.length;
      if (rand() < share || keys.length === 1) take(key);
    }
  }
  return picked;
}

/**
 * Route every row. `routeFn` has the interface of route-dispatch's route();
 * `previous` is the prior results file (keyed by id + hash) so cached
 * decisions are never re-queried.
 */
export async function runEval({ rows, routeFn, transport, spec, cache, previous = [], model, concurrency = DEFAULTS.concurrency, queryThresholds = DEFAULTS.queryThresholds, log = () => {}, sleepFn }) {
  const specVersion = specVersionOf(spec);
  const prevById = new Map(previous.map((r) => [r.id, r]));
  const started = Date.now();
  let queried = 0;
  let reused = 0;
  let retries = 0;
  const results = await mapPool(rows, concurrency, async (row) => {
    const hash = rowHash(row, { model, specVersion, context: Boolean(queryThresholds.context) });
    const prev = prevById.get(row.id);
    // Error rows (a thrown error, or route()'s trace.error) are never reused.
    if (prev && prev.hash === hash && !prev.error && !prev.trace?.error && prev.decision !== undefined) {
      reused++;
      return { ...prev, cached: true };
    }
    const cacheKey = `route:${hash}`;
    const hit = cache?.has?.(cacheKey) ? cache.get(cacheKey) : null;
    // Earlier versions cached failed rows as decision: null; skip those too.
    if (hit && !hit.error && !hit.trace?.error) {
      reused++;
      return { id: row.id, hash, label: row.label, prompt: head(row.prompt, 200), repoState: row.repoState, conversation: row.conversation ?? null, decision: hit.decision ?? null, trace: hit.trace ?? null, cached: true, elapsedMs: 0 };
    }
    const t0 = Date.now();
    try {
      const res = await withBackoff(async () => {
        const r = await routeFn({ prompt: row.prompt, repoState: row.repoState, conversation: row.conversation ?? null, spec, transport, thresholds: queryThresholds, cache });
        if (r?.trace?.error) {
          const e = new Error(String(r.trace.error));
          e.status = statusFromTraceError(r.trace.error);
          e.trace = r.trace;
          throw e;
        }
        return r;
      }, {
        sleepFn,
        onRetry: (attempt, wait, err) => {
          retries++;
          log(`${err?.status ?? "retryable error"} on ${row.id}: retry ${attempt} in ${wait}ms`);
        },
      });
      queried++;
      const record = { id: row.id, hash, label: row.label, prompt: head(row.prompt, 200), repoState: row.repoState, conversation: row.conversation ?? null, decision: res?.decision ?? null, trace: res?.trace ?? null, cached: false, elapsedMs: Date.now() - t0 };
      cache?.set?.(cacheKey, { decision: record.decision, trace: record.trace });
      return record;
    } catch (err) {
      queried++;
      // Not cached under route:<hash>: the next run queries this row again.
      return { id: row.id, hash, label: row.label, prompt: head(row.prompt, 200), repoState: row.repoState, conversation: row.conversation ?? null, decision: null, trace: err?.trace ?? null, cached: false, elapsedMs: Date.now() - t0, error: String(err?.message ?? err) };
    }
  });
  cache?.flush?.();
  return { results, stats: { queried, reused, retries, wallMs: Date.now() - started, specVersion, model: model ?? null } };
}

// ---------------------------------------------------------------------------
// run — metrics
// ---------------------------------------------------------------------------

/**
 * The `fits` bar for `skill`: a flat `thresholds.fits` when set, else the
 * shipped tiered bar (route-dispatch fitsThreshold: coreFits for core skills,
 * otherFits for the rest), with the router's defaults for any tier not given.
 */
export function fitsBarFor(thresholds, skill) {
  return ROUTER.fitsThreshold({ ...SHIPPED, ...thresholds }, skill);
}

/** "fits ≥ 0.6 (core) / 0.9 (other), gate ≥ 0.5" or "fits ≥ 0.5, gate ≥ 0.5". */
export function describeThresholds(thresholds) {
  const T = { ...SHIPPED, ...thresholds };
  const fits = T.fits !== null && T.fits !== undefined ? `fits ≥ ${T.fits}` : `fits ≥ ${T.coreFits} (core) / ${T.otherFits} (other)`;
  return `${fits}, gate ≥ ${T.gate}`;
}

/**
 * The skill the router would surface at these thresholds, or null. With an
 * `allow` list (spec.suggestAllow) a non-listed skill is suppressed unless the
 * decision came from an explicit mention — the hook's evidence gate.
 */
export function suggestedAt(decision, thresholds, allow = null) {
  if (!decision || !decision.skill) return null;
  const fits = Number(decision.fits ?? decision.confidence ?? 0);
  const gate = decision.gate === undefined || decision.gate === null ? 1 : typeof decision.gate === "boolean" ? (decision.gate ? 1 : 0) : Number(decision.gate);
  if (!(fits >= fitsBarFor(thresholds, decision.skill)) || !(gate >= thresholds.gate)) return null;
  if (Array.isArray(allow) && !decision.explicit && !allow.includes(decision.skill)) return null;
  return decision.skill;
}

function confidenceOf(decision) {
  if (!decision) return 0;
  const c = Number(decision.confidence ?? decision.fits ?? 0);
  return Number.isFinite(c) ? c : 0;
}

export function computeMetrics(results, thresholds = DEFAULTS.thresholds, { allow = null } = {}) {
  const labelled = results.filter((r) => r.label.kind === "skill" || r.label.kind === "implied");
  const noneRows = results.filter((r) => r.label.kind === "none");
  const perSkill = {};
  const touch = (s) => (perSkill[s] ??= { tp: 0, fp: 0, fn: 0, support: 0 });
  let top1 = 0;
  let suggestedTotal = 0;
  let suggestedCorrect = 0;
  let noneSuggested = 0;
  const confusions = {};
  const scored = [];
  for (const r of results) {
    const suggested = suggestedAt(r.decision, thresholds, allow);
    const truth = r.label.skill ?? null;
    const correct = suggested === truth;
    if (suggested) suggestedTotal++;
    if (suggested && correct) suggestedCorrect++;
    if (truth) {
      touch(truth).support++;
      if (correct) {
        top1++;
        touch(truth).tp++;
      } else {
        touch(truth).fn++;
        if (suggested) touch(suggested).fp++;
      }
    } else if (suggested) {
      noneSuggested++;
      touch(suggested).fp++;
    }
    if (!correct) {
      const key = `${truth ?? "(none)"} → ${suggested ?? "(none)"}`;
      confusions[key] = (confusions[key] ?? 0) + 1;
    }
    scored.push({ ...r, suggested, correct, confidence: confidenceOf(r.decision) });
  }
  const perSkillRows = Object.entries(perSkill)
    .map(([skill, c]) => {
      const precision = c.tp + c.fp ? c.tp / (c.tp + c.fp) : NaN;
      const recall = c.tp + c.fn ? c.tp / (c.tp + c.fn) : NaN;
      const f1 = Number.isFinite(precision) && Number.isFinite(recall) && precision + recall ? (2 * precision * recall) / (precision + recall) : NaN;
      return { skill, ...c, precision, recall, f1 };
    })
    .sort((a, b) => b.support - a.support || a.skill.localeCompare(b.skill));
  const lowestConfidentCorrect = scored
    .filter((r) => r.correct && r.suggested)
    .sort((a, b) => a.confidence - b.confidence)
    .slice(0, 10);
  const highestConfidentWrong = scored
    .filter((r) => !r.correct && r.suggested)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);
  return {
    thresholds,
    total: results.length,
    labelled: labelled.length,
    none: noneRows.length,
    errors: results.filter((r) => r.error).length,
    top1Accuracy: labelled.length ? top1 / labelled.length : NaN,
    suggestionRate: results.length ? suggestedTotal / results.length : NaN,
    precision: suggestedTotal ? suggestedCorrect / suggestedTotal : NaN,
    recall: labelled.length ? top1 / labelled.length : NaN,
    falseSuggestionRate: noneRows.length ? noneSuggested / noneRows.length : NaN,
    noneHoldRate: noneRows.length ? 1 - noneSuggested / noneRows.length : NaN,
    perSkill: perSkillRows,
    confusions: Object.entries(confusions)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 15),
    lowestConfidentCorrect,
    highestConfidentWrong,
  };
}

export function thresholdSweep(results, sweep = DEFAULTS.sweep) {
  const rows = [];
  for (const gate of sweep.gate) {
    for (const fits of sweep.fits) {
      const m = computeMetrics(results, { fits, gate });
      rows.push({ fits, gate, suggestionRate: m.suggestionRate, precision: m.precision, recall: m.recall, falseSuggestionRate: m.falseSuggestionRate, noneHoldRate: m.noneHoldRate });
    }
  }
  return rows;
}

export function totalUsage(results) {
  const total = { input: 0, output: 0, rowsWithUsage: 0 };
  for (const r of results) {
    const u = usageFromTrace(r.trace);
    if (u.input || u.output) total.rowsWithUsage++;
    total.input += u.input;
    total.output += u.output;
  }
  return total;
}

/**
 * What the suggest allowlist removes at these thresholds: every suggestion
 * whose skill is not listed (explicit mentions are exempt), split into the
 * ones that matched the label (recall the gate costs) and the ones that did
 * not (false suggestions the gate saves).
 */
export function allowlistSuppression(results, thresholds, allow) {
  if (!Array.isArray(allow)) return null;
  const perSkill = {};
  let total = 0;
  for (const r of results) {
    const open = suggestedAt(r.decision, thresholds);
    if (!open || suggestedAt(r.decision, thresholds, allow)) continue;
    total++;
    const s = (perSkill[open] ??= { skill: open, suppressed: 0, matchedLabel: 0, wrong: 0 });
    s.suppressed++;
    if ((r.label.skill ?? null) === open) s.matchedLabel++;
    else s.wrong++;
  }
  const gated = computeMetrics(results, thresholds, { allow });
  return {
    total,
    perSkill: Object.values(perSkill).sort((a, b) => b.suppressed - a.suppressed || a.skill.localeCompare(b.skill)),
    gated,
  };
}

export function renderReport({ results, stats, thresholds = DEFAULTS.thresholds, sweep = DEFAULTS.sweep, usdPerMillionInput = DEFAULTS.usdPerMillionInput, datasetPath, allow = null, generatedAt = new Date().toISOString() }) {
  const m = computeMetrics(results, thresholds);
  const sw = thresholdSweep(results, sweep);
  const usage = totalUsage(results);
  const cost = (usage.input / 1e6) * usdPerMillionInput;
  const kinds = {};
  for (const r of results) kinds[r.label.kind] = (kinds[r.label.kind] ?? 0) + 1;
  const L = [];
  L.push("# Skill router evaluation", "");
  L.push(`Generated ${generatedAt}${datasetPath ? ` from \`${datasetPath}\`` : ""}. Default thresholds: ${describeThresholds(thresholds)}.`, "");
  L.push("## Overall", "");
  L.push("| Metric | Value |", "|---|---|");
  L.push(`| Rows | ${m.total} |`);
  for (const k of ["skill", "implied", "none"]) L.push(`| Rows labelled \`${k}\` | ${kinds[k] ?? 0} |`);
  L.push(`| Rows with router errors | ${m.errors} |`);
  L.push(`| Suggestion rate (all rows) | ${pct(Math.round(m.suggestionRate * m.total), m.total)} |`);
  L.push(`| Top-1 accuracy (skill + implied) | ${f3(m.top1Accuracy)} |`);
  L.push(`| Precision of suggestions (all rows) | ${f3(m.precision)} |`);
  L.push(`| Recall on labelled rows | ${f3(m.recall)} |`);
  L.push(`| False-suggestion rate on \`none\` rows | ${f3(m.falseSuggestionRate)} |`);
  L.push("");
  L.push("## Per-skill precision / recall / F1", "");
  L.push("| Skill | Support | TP | FP | FN | Precision | Recall | F1 |", "|---|---:|---:|---:|---:|---:|---:|---:|");
  for (const s of m.perSkill) L.push(`| ${s.skill} | ${s.support} | ${s.tp} | ${s.fp} | ${s.fn} | ${f3(s.precision)} | ${f3(s.recall)} | ${f3(s.f1)} |`);
  if (!m.perSkill.length) L.push("| (no skills suggested or labelled) | | | | | | | |");
  L.push("");
  L.push("## Threshold sweep", "");
  L.push("Computed from the stored `fits` / `gate` values — no re-querying. `none hold` is the share of `none` rows the router left alone (the runbook asks for ≥ 0.95 before lowering a threshold).", "");
  L.push("| fits ≥ | gate ≥ | Suggestion rate | Precision | Recall | False-suggestion (none) | none hold |", "|---:|---:|---:|---:|---:|---:|---:|");
  for (const r of sw) L.push(`| ${r.fits} | ${r.gate} | ${f3(r.suggestionRate)} | ${f3(r.precision)} | ${f3(r.recall)} | ${f3(r.falseSuggestionRate)} | ${f3(r.noneHoldRate)} |`);
  L.push("");
  L.push("## Confusions (label → suggested)", "");
  if (m.confusions.length) {
    L.push("| Label → Suggested | Count |", "|---|---:|");
    for (const [k, n] of m.confusions) L.push(`| ${mdEscape(k)} | ${n} |`);
  } else L.push("None.");
  L.push("");
  L.push("## Lowest-confidence correct suggestions", "");
  if (m.lowestConfidentCorrect.length) {
    L.push("| Confidence | Skill | Prompt |", "|---:|---|---|");
    for (const r of m.lowestConfidentCorrect) L.push(`| ${f3(r.confidence)} | ${r.suggested} | ${mdEscape(head(r.prompt, 80))} |`);
  } else L.push("None.");
  L.push("");
  L.push("## Highest-confidence wrong suggestions", "");
  if (m.highestConfidentWrong.length) {
    L.push("| Confidence | Label | Suggested | Prompt |", "|---:|---|---|---|");
    for (const r of m.highestConfidentWrong) L.push(`| ${f3(r.confidence)} | ${r.label.skill ?? "(none)"} | ${r.suggested} | ${mdEscape(head(r.prompt, 80))} |`);
  } else L.push("None.");
  L.push("");
  L.push("## Suppressed by allowlist", "");
  const sup = allowlistSuppression(results, thresholds, allow);
  if (!sup) L.push("No `suggestAllow` in the spec: nothing is gated.");
  else {
    L.push(`Decisions are stored with the allowlist off. At the reporting thresholds the spec's \`suggestAllow\` (${allow.length} skills) suppresses **${sup.total}** suggestion(s); explicit mentions are exempt.`, "");
    L.push("| Metric | Without allowlist | With allowlist |", "|---|---:|---:|");
    L.push(`| Suggestion rate (all rows) | ${f3(m.suggestionRate)} | ${f3(sup.gated.suggestionRate)} |`);
    L.push(`| Precision of suggestions | ${f3(m.precision)} | ${f3(sup.gated.precision)} |`);
    L.push(`| Recall on labelled rows | ${f3(m.recall)} | ${f3(sup.gated.recall)} |`);
    L.push(`| False-suggestion rate on \`none\` rows | ${f3(m.falseSuggestionRate)} | ${f3(sup.gated.falseSuggestionRate)} |`);
    L.push("");
    if (sup.perSkill.length) {
      L.push("| Skill | Suppressed | Matched the label (recall lost) | Wrong (false suggestion saved) |", "|---|---:|---:|---:|");
      for (const s of sup.perSkill) L.push(`| ${s.skill} | ${s.suppressed} | ${s.matchedLabel} | ${s.wrong} |`);
    } else L.push("No suggestion was suppressed.");
  }
  L.push("");
  L.push("## Cost and time", "");
  L.push("| Metric | Value |", "|---|---|");
  L.push(`| Rows queried this run | ${stats?.queried ?? 0} |`);
  L.push(`| Rows reused from cache | ${stats?.reused ?? 0} |`);
  L.push(`| 429 retries | ${stats?.retries ?? 0} |`);
  L.push(`| Input tokens (all stored traces) | ${usage.input} |`);
  L.push(`| Output tokens (all stored traces) | ${usage.output} |`);
  L.push(`| Rows reporting usage | ${usage.rowsWithUsage} / ${results.length} |`);
  L.push(`| Estimated cost at $${usdPerMillionInput}/M input tokens | $${cost.toFixed(4)} |`);
  L.push(`| Wall time | ${((stats?.wallMs ?? 0) / 1000).toFixed(1)}s |`);
  if (stats?.model) L.push(`| Model | ${stats.model} |`);
  if (stats?.specVersion) L.push(`| Spec version | ${stats.specVersion} |`);
  L.push("");
  return L.join("\n");
}

// ---------------------------------------------------------------------------
// outcomes — production self-labels from the hook's route log
// ---------------------------------------------------------------------------
//
// Scoring (docs/audits/2026-10-23-jev-router-shadow-performance.md): every
// routed prompt is rescored from its session's full transcript plus subagent
// transcripts, over a window that closes at the end of the reply turn, the
// next human turn, or --window-minutes after the prompt. The hook's stored
// outcome records are the fallback when a transcript is gone: they read a
// 256 KB tail, skip subagents, and until this rework had no horizon (one
// window ran 36 h in an autonomous session). Hand labels (--labels) override
// the proxy per row.

// Raw command classes (outcome.raw) and the skill whose work they are.
export const RAW_CLASS_SKILL = Object.freeze({
  git_commit: "oc-git-ops",
  git_push: "oc-git-ops",
  git_sync: "oc-git-ops",
  gh_pr_create: "oc-git-ops",
  gh_pr_merge: "oc-git-ops",
  merge_handoff: "oc-git-ops",
  deploy: "oc-deploy-ops",
});
const RAW_CLASS_LABEL = Object.freeze({
  git_commit: "git", git_push: "git", git_sync: "git", gh_pr_create: "git", gh_pr_merge: "git", merge_handoff: "merge handoff", deploy: "deploy",
});
// Skills a skill runs as its own steps (its SKILL.md; orchestrator.md §3): after
// S was suggested, a call to one of these is S's work under way, not a miss.
// oc-git-ops gates commits on oc-bug-check and PRs on oc-docs-forge → oc-repo-ops;
// oc-deploy-ops opens with the oc-code-auditor + oc-security-auditor audit gate;
// oc-release-ops hands its PR to oc-docs-forge → oc-git-ops and ships via oc-deploy-ops.
export const SKILL_STEPS = Object.freeze({
  "oc-git-ops": Object.freeze(["oc-bug-check", "oc-docs-forge", "oc-repo-ops"]),
  "oc-deploy-ops": Object.freeze(["oc-code-auditor", "oc-security-auditor"]),
  "oc-release-ops": Object.freeze(["oc-docs-forge", "oc-git-ops", "oc-deploy-ops"]),
});
export const LABEL_NONE = "none";
export const LABEL_AMBIGUOUS = "ambiguous";

function readLogRecords(file, { since } = {}) {
  if (!fs.existsSync(file)) return [];
  const sinceIso = since ? new Date(since).toISOString() : null;
  const out = [];
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    let rec;
    try {
      rec = JSON.parse(t);
    } catch {
      continue;
    }
    if (!rec || typeof rec !== "object") continue;
    if (sinceIso && typeof rec.at === "string" && rec.at < sinceIso) continue;
    out.push(rec);
  }
  return out;
}

export function readOutcomeRecords(file, { since } = {}) {
  return readLogRecords(file, { since }).filter((r) => r.type === "outcome");
}

/** Routing records (one per routed prompt) from the route log. */
export function readRouteRecords(file, { since } = {}) {
  return readLogRecords(file, { since }).filter((r) => !r.type && r.session_id && r.prompt_hash && typeof r.at === "string");
}

/**
 * Hand labels, JSONL: { session_id, prompt_hash, label, note? } where label is
 * a skill id, "none" or "ambiguous". Judge the prompt text alone (the router
 * sends no conversation by default), so one label fits every copy of a
 * prompt repeated in a session. Lines starting with `//` are comments.
 */
export function readLabels(file) {
  const map = new Map();
  if (!file || !fs.existsSync(file)) return map;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("//")) continue;
    let rec;
    try {
      rec = JSON.parse(t);
    } catch {
      continue;
    }
    if (rec && rec.session_id && rec.prompt_hash && typeof rec.label === "string" && rec.label) map.set(`${rec.session_id}|${rec.prompt_hash}`, rec.label);
  }
  return map;
}

/** session id → main-session transcript path, across every project dir under `projectsRoot`. */
export function transcriptIndex(projectsRoot) {
  const map = new Map();
  let dirs = [];
  try {
    dirs = fs.readdirSync(projectsRoot);
  } catch {
    return map;
  }
  for (const d of dirs) {
    let files = [];
    try {
      files = fs.readdirSync(path.join(projectsRoot, d));
    } catch {
      continue;
    }
    for (const f of files) {
      if (!f.endsWith(".jsonl")) continue;
      const file = path.join(projectsRoot, d, f);
      const sid = f.slice(0, -".jsonl".length);
      // A resumed session can be copied into a second project dir; keep the newest copy.
      const prev = map.get(sid);
      if (!prev || fs.statSync(file).mtimeMs > fs.statSync(prev).mtimeMs) map.set(sid, file);
    }
  }
  return map;
}

function readJsonlRecords(file) {
  const out = [];
  let text = "";
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    return out;
  }
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      /* torn line */
    }
  }
  return out;
}

/** Records of every subagent transcript of a session (`<project>/<sid>/subagents/*.jsonl`). */
function readSubagentRecords(transcriptFile) {
  const dir = path.join(path.dirname(transcriptFile), path.basename(transcriptFile, ".jsonl"), "subagents");
  let files = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
  } catch {
    return [];
  }
  return files.flatMap((f) => readJsonlRecords(path.join(dir, f)));
}

/**
 * Rescore one routing record from its session's records: ROUTER.outcomeWindow
 * anchored on the prompt copy at or before the routing time, then the activity
 * of the main records inside the window plus subagent records stamped inside
 * it. Null when the prompt cannot be anchored.
 */
export function rescoreRoute(route, { mainRecords, subRecords = [], windowMs = ROUTER.OUTCOME_WINDOW_MS }) {
  const before = new Date(Date.parse(route.at) + 5000).toISOString();
  const w = ROUTER.outcomeWindow(mainRecords, { forPromptHash: route.prompt_hash, afterAt: route.at, before, windowMs });
  if (!w) return null;
  const acc = { skill_calls: [], raw: ROUTER.emptyRaw() };
  for (let i = w.start; i < w.end; i++) ROUTER.addRecordActivity(acc, mainRecords[i]);
  const startMs = Date.parse(w.startAt);
  const endMs = w.endAt ? Date.parse(w.endAt) : windowMs ? startMs + windowMs : Infinity;
  for (const rec of subRecords) {
    const t = rec && typeof rec.timestamp === "string" ? Date.parse(rec.timestamp) : NaN;
    if (t >= startMs && t <= endMs) ROUTER.addRecordActivity(acc, rec, { includeSidechain: true });
  }
  return { anchor: w.anchor, window_end: w.endReason, skill_calls: acc.skill_calls, raw: acc.raw };
}

/**
 * One scored row per routing record: rescored from the transcript when
 * `index` has the session (source "transcript"), else the hook's stored
 * outcome record for that prompt (source "log"), else dropped and counted in
 * `unscored`. Labels from `labels` are attached as `label`.
 */
export function scoreRoutes(routes, { index = new Map(), outcomes = [], labels = new Map(), windowMs = ROUTER.OUTCOME_WINDOW_MS } = {}) {
  const sessions = new Map();
  const load = (sid) => {
    if (!sessions.has(sid)) {
      const file = index.get(sid);
      sessions.set(sid, file ? { mainRecords: readJsonlRecords(file), subRecords: readSubagentRecords(file) } : null);
    }
    return sessions.get(sid);
  };
  const stored = new Map();
  for (const o of outcomes) {
    const key = `${o.session_id}|${o.for_prompt_hash}`;
    (stored.get(key) ?? stored.set(key, []).get(key)).push(o);
  }
  const rows = [];
  let unscored = 0;
  for (const r of routes) {
    const suggested = r.decision && r.decision.skill ? r.decision.skill : null;
    const base = {
      session_id: r.session_id,
      for_prompt_hash: r.prompt_hash,
      at: r.at,
      prompt_head: r.prompt_head ?? null,
      suggested,
      explicit: Boolean(r.decision && r.decision.explicit),
      mode: r.mode ?? null,
    };
    const key = `${r.session_id}|${r.prompt_hash}`;
    let scored = null;
    const session = load(r.session_id);
    if (session) {
      const s = rescoreRoute(r, { ...session, windowMs });
      if (s) scored = { ...s, source: "transcript" };
    }
    if (!scored) {
      const o = (stored.get(key) ?? []).find((x) => !x.at || x.at >= r.at);
      if (o) scored = { anchor: o.anchor ?? null, window_end: o.window_end ?? null, skill_calls: o.skill_calls ?? [], raw: o.raw ?? {}, source: "log" };
    }
    if (!scored) {
      unscored++;
      continue;
    }
    const row = { ...base, ...scored, followed: suggested ? scored.skill_calls.includes(suggested) : null };
    if (labels.has(key)) row.label = labels.get(key);
    rows.push(row);
  }
  return { rows, unscored };
}

/** Skills the session's activity points at: oc-* Skill calls ∪ raw command classes. */
function activitySkills(o) {
  const set = new Set((o.skill_calls ?? []).filter((s) => String(s).startsWith("oc-")));
  for (const [k, on] of Object.entries(o.raw ?? {})) if (on && RAW_CLASS_SKILL[k]) set.add(RAW_CLASS_SKILL[k]);
  return set;
}

/** Did the session do S's work: call S or one of its steps, or run S's raw command class? */
function relatedTo(S, o, steps = SKILL_STEPS) {
  const calls = o.skill_calls ?? [];
  if (calls.includes(S) || (steps[S] ?? []).some((s) => calls.includes(s))) return true;
  return Object.entries(o.raw ?? {}).some(([k, on]) => on && RAW_CLASS_SKILL[k] === S);
}

/** "Skill oc-x + raw git" — what happened after the prompt. */
function describeActivity(o) {
  const parts = (o.skill_calls ?? []).map((s) => `Skill ${s}`);
  const raw = [...new Set(Object.entries(o.raw ?? {}).filter(([, on]) => on).map(([k]) => RAW_CLASS_LABEL[k] ?? k))];
  for (const r of raw) parts.push(`raw ${r}`);
  return parts.length ? parts.join(" + ") : "nothing";
}

/**
 * TP / FP / FN / TN per row. A labelled row is judged against its label:
 * suggestion S on label L is TP when S = L, else FP (and an FN for L); no
 * suggestion is FN on a skill label and TN on "none"; "ambiguous" is left out
 * of every rate. An unlabelled row falls back to the proxy:
 *   TP  suggestion S and the session then did S's work (relatedTo)
 *   FP  suggestion S with no activity related to S
 *   FN  no suggestion, but an oc-* Skill call or a raw git/deploy class followed
 *   TN  no suggestion and no pipeline activity ("silent" on a non-pipeline prompt)
 *
 * Outcomes of an explicit mention (`explicit: true`, the user typed the
 * `/oc-*` command, routed at p=1 with no model call) measure the user, not
 * the router, so they are left out of every go/no-go metric and suggestion
 * count and reported on their own as `explicit` (2026-10-09 audit B-04).
 *
 * `followed` (the suggested skill was then called) means something only in
 * live mode, where the suggestion was injected; in shadow nobody saw it, so
 * the shadow figure is reported as unprompted calls, the audit baseline.
 */
export function summarizeOutcomes(allRecords, { coreSkills = DEFAULTS.coreSkills, goNoGo = DEFAULTS.goNoGo, steps = SKILL_STEPS } = {}) {
  const isExplicit = (o) => o.explicit === true && Boolean(o.suggested);
  const explicitRecords = allRecords.filter(isExplicit);
  const records = allRecords.filter((o) => !isExplicit(o));
  const explicitFollowed = explicitRecords.filter((o) => (o.skill_calls ?? []).includes(o.suggested)).length;
  const perSkill = {};
  const touch = (s) => (perSkill[s] ??= { skill: s, suggestions: 0, followed: 0, relatedRaw: 0, tp: 0, fp: 0, fn: 0 });
  const transitions = {};
  const byMode = {};
  const sources = {};
  const windowEnds = {};
  const review = [];
  let suggestions = 0;
  let labelled = 0;
  let ambiguous = 0;
  let unlabelledSuggestions = 0;
  let nonPipeline = 0;
  const proxy = { tp: 0, fp: 0, fn: 0, tn: 0 };
  const core = { tp: 0, fp: 0 };
  const hit = (kind, S) => {
    proxy[kind]++;
    if (S) touch(S)[kind]++;
    if (S && coreSkills.includes(S) && (kind === "tp" || kind === "fp")) core[kind]++;
  };
  for (const o of records) {
    const S = o.suggested ?? null;
    const mode = o.mode ?? "unknown";
    const label = o.label ?? null;
    if (o.source) sources[o.source] = (sources[o.source] ?? 0) + 1;
    if (o.window_end) windowEnds[o.window_end] = (windowEnds[o.window_end] ?? 0) + 1;
    const bm = (byMode[mode] ??= { mode, outcomes: 0, suggestions: 0, followed: 0 });
    bm.outcomes++;
    if (S) {
      suggestions++;
      bm.suggestions++;
      const row = touch(S);
      row.suggestions++;
      if ((o.skill_calls ?? []).includes(S)) {
        bm.followed++;
        row.followed++;
      }
      if (Object.entries(o.raw ?? {}).some(([k, on]) => on && RAW_CLASS_SKILL[k] === S)) row.relatedRaw++;
      const key = `${mode}\u0000${S}\u0000${describeActivity(o)}`;
      transitions[key] = (transitions[key] ?? 0) + 1;
    }
    if (label === LABEL_AMBIGUOUS) {
      ambiguous++;
      continue;
    }
    if (label) {
      labelled++;
      if (label === LABEL_NONE) nonPipeline++;
      if (S && S === label) hit("tp", S);
      else if (S) {
        hit("fp", S);
        if (label !== LABEL_NONE) hit("fn", label);
      } else if (label !== LABEL_NONE) hit("fn", label);
      else hit("tn", null);
      continue;
    }
    const act = activitySkills(o);
    if (!act.size) nonPipeline++;
    if (S) {
      const ok = relatedTo(S, o, steps);
      hit(ok ? "tp" : "fp", S);
      unlabelledSuggestions++;
      review.push({ ...o, verdict: ok ? "TP" : "FP", then: describeActivity(o) });
    } else if (act.size) {
      proxy.fn++;
      for (const s of act) touch(s).fn++;
      review.push({ ...o, verdict: "FN", then: describeActivity(o) });
    } else proxy.tn++;
  }
  const silentRate = nonPipeline ? proxy.tn / nonPipeline : NaN;
  const corePrecision = core.tp + core.fp ? core.tp / (core.tp + core.fp) : NaN;
  const live = byMode.live ?? { suggestions: 0, followed: 0 };
  const shadow = byMode.shadow ?? { suggestions: 0, followed: 0 };
  const checks = [
    { name: `suggestions ≥ ${goNoGo.minSuggestions}`, value: suggestions, pass: suggestions >= goNoGo.minSuggestions },
    { name: `precision on core skills ≥ ${goNoGo.minCorePrecision}`, value: corePrecision, pass: Number.isFinite(corePrecision) && corePrecision >= goNoGo.minCorePrecision },
    { name: `silent rate on non-pipeline prompts ≥ ${goNoGo.minSilentRate}`, value: silentRate, pass: Number.isFinite(silentRate) && silentRate >= goNoGo.minSilentRate },
    // The proxy cannot tell a deferred merge from a wrong suggestion (it agreed with
    // hand labels on 12 of 14 suggestions on 2026-10-23), so live mode waits on labels.
    { name: "every suggestion hand-labelled", value: `${suggestions - unlabelledSuggestions}/${suggestions}`, pass: unlabelledSuggestions === 0 },
  ];
  return {
    total: allRecords.length,
    routed: records.length,
    explicit: { total: explicitRecords.length, followed: explicitFollowed, followRate: explicitRecords.length ? explicitFollowed / explicitRecords.length : NaN },
    suggestions,
    followed: live.followed,
    followRate: live.suggestions ? live.followed / live.suggestions : NaN,
    unprompted: { calls: shadow.followed, suggestions: shadow.suggestions, rate: shadow.suggestions ? shadow.followed / shadow.suggestions : NaN },
    sources,
    windowEnds,
    labelled,
    ambiguous,
    unlabelledSuggestions,
    proxy: {
      ...proxy,
      precision: proxy.tp + proxy.fp ? proxy.tp / (proxy.tp + proxy.fp) : NaN,
      recall: proxy.tp + proxy.fn ? proxy.tp / (proxy.tp + proxy.fn) : NaN,
      coreTp: core.tp,
      coreFp: core.fp,
      corePrecision,
      nonPipeline,
      silentRate,
    },
    byMode: Object.values(byMode).map((m) => ({ ...m, followRate: m.suggestions ? m.followed / m.suggestions : NaN })).sort((a, b) => a.mode.localeCompare(b.mode)),
    perSkill: Object.values(perSkill)
      .map((r) => ({ ...r, followRate: r.suggestions ? r.followed / r.suggestions : NaN, proxyPrecision: r.tp + r.fp ? r.tp / (r.tp + r.fp) : NaN }))
      .sort((a, b) => b.suggestions - a.suggestions || b.fn - a.fn || a.skill.localeCompare(b.skill)),
    transitions: Object.entries(transitions)
      .map(([k, n]) => {
        const [mode, suggested, then] = k.split("\u0000");
        return { mode, suggested, then, count: n };
      })
      .sort((a, b) => b.count - a.count || a.suggested.localeCompare(b.suggested) || a.then.localeCompare(b.then)),
    review: review.sort((a, b) => String(a.at ?? "").localeCompare(String(b.at ?? ""))),
    goNoGo: { checks, go: checks.every((c) => c.pass) },
  };
}

export function renderOutcomesReport(summary, { logPath, since, labelsPath, windowMinutes, generatedAt = new Date().toISOString() } = {}) {
  const S = summary;
  const L = [];
  const src = S.sources ?? {};
  const scored = Object.keys(src).length > 0;
  L.push("# Skill router outcomes (production self-labels)", "");
  L.push(`Generated ${generatedAt}${logPath ? ` from \`${logPath}\`` : ""}${since ? ` since ${since}` : ""}. One row per routed prompt: what the hook suggested (or, in shadow mode, would have suggested) and what the session did next.`, "");
  if (scored) {
    L.push(`Rows are rescored from the session transcripts (subagents included) over a window that closes at the end of the reply turn, at the next human turn, or ${windowMinutes ?? ROUTER.OUTCOME_WINDOW_MS / 60000} min after the prompt; the hook's stored outcome record is used only when a transcript is gone. Hand labels${labelsPath ? ` from \`${labelsPath}\`` : ""} override the proxy.`, "");
  }
  L.push("## Go / no-go (day 8)", "");
  L.push("| Check | Value | Pass |", "|---|---:|---|");
  for (const c of S.goNoGo.checks) L.push(`| ${c.name} | ${typeof c.value === "string" || Number.isInteger(c.value) ? c.value : f3(c.value)} | ${c.pass ? "yes" : "**no**"} |`);
  L.push("", `**Verdict: ${S.goNoGo.go ? "GO — live mode is justified" : "NO-GO — stay in shadow"}.**`, "");
  L.push("## Overall", "");
  L.push("| Metric | Value |", "|---|---|");
  L.push(`| Routed prompts scored | ${S.total} |`);
  if (scored) {
    L.push(`| Scored from transcripts / stored outcome records | ${src.transcript ?? 0} / ${src.log ?? 0} |`);
    const we = S.windowEnds ?? {};
    L.push(`| Window closed by end of reply turn / next human turn / horizon / still open | ${we.turn_end ?? 0} / ${we.next_prompt ?? 0} / ${we.horizon ?? 0} / ${we.open ?? 0} |`);
  }
  L.push(`| Hand-labelled (ambiguous, left out of every rate) | ${S.labelled + S.ambiguous} (${S.ambiguous}) |`);
  L.push(`| Explicit \`/oc-*\` mentions (excluded from every metric here; ${S.explicit.followed} followed) | ${S.explicit.total} |`);
  L.push(`| Suggestions (incl. shadow would-have) | ${S.suggestions} |`);
  L.push(`| Follow rate, live mode (suggested skill then called) | ${f3(S.followRate)} |`);
  L.push(`| Shadow: suggested skill called unprompted (baseline, nobody saw the suggestion) | ${S.unprompted.calls} / ${S.unprompted.suggestions} |`);
  L.push(`| TP / FP / FN / TN | ${S.proxy.tp} / ${S.proxy.fp} / ${S.proxy.fn} / ${S.proxy.tn} |`);
  L.push(`| Precision (all skills) | ${f3(S.proxy.precision)} |`);
  L.push(`| Recall | ${f3(S.proxy.recall)} |`);
  L.push(`| Precision (core skills: ${S.proxy.coreTp} TP / ${S.proxy.coreFp} FP) | ${f3(S.proxy.corePrecision)} |`);
  L.push(`| Silent rate on non-pipeline prompts (${S.proxy.nonPipeline}) | ${f3(S.proxy.silentRate)} |`);
  L.push("");
  L.push("| Mode | Outcomes | Suggestions | Suggested skill called | Rate |", "|---|---:|---:|---:|---:|");
  for (const m of S.byMode) L.push(`| ${m.mode} | ${m.outcomes} | ${m.suggestions} | ${m.followed} | ${f3(m.followRate)} |`);
  if (!S.byMode.length) L.push("| (no outcome records) | | | | |");
  L.push("");
  L.push("## Per skill", "");
  L.push("Unlabelled rows use the proxy. TP: the session then called the skill or one of its own steps (oc-git-ops: bug-check, docs-forge, repo-ops; oc-deploy-ops: the code + security audit gate; oc-release-ops: docs-forge, git-ops, deploy-ops), or ran its raw command class (git commit/push/merge/rebase, `gh pr create`/`merge`, auto-merge, a `gh pr merge` handed to the user → oc-git-ops; `npm run deploy`, `wrangler deploy`, `scripts/deploy.mjs` → oc-deploy-ops). FP: no related activity. FN: related activity with no suggestion.", "");
  L.push("| Skill | Suggestions | Called | Related raw | TP | FP | Precision | FN |", "|---|---:|---:|---:|---:|---:|---:|---:|");
  for (const r of S.perSkill) L.push(`| ${r.skill} | ${r.suggestions} | ${r.followed} | ${r.relatedRaw} | ${r.tp} | ${r.fp} | ${f3(r.proxyPrecision)} | ${r.fn} |`);
  if (!S.perSkill.length) L.push("| (none) | | | | | | | |");
  L.push("");
  L.push("## What happened after each suggestion", "");
  L.push("In shadow mode read a row as \"would have suggested X; the agent then called skill Y / ran raw git|deploy\".", "");
  if (S.transitions.length) {
    L.push("| Mode | Suggested | Then | Count |", "|---|---|---|---:|");
    for (const t of S.transitions) L.push(`| ${t.mode} | ${t.suggested} | ${mdEscape(t.then)} | ${t.count} |`);
  } else L.push("No suggestions.");
  L.push("");
  L.push("## Rows to review", "");
  const rv = S.review ?? [];
  const labelHow = `Label a row by appending \`{"session_id":"…","prompt_hash":"…","label":"<skill>|none|ambiguous"}\` to the labels file${labelsPath ? ` (\`${labelsPath}\`)` : ""}. Judge the prompt text alone; the router sees nothing else.`;
  const table = (rows) => {
    L.push("| When (UTC) | Session | Prompt hash | Prompt | Suggested | Then | Proxy |", "|---|---|---|---|---|---|---|");
    for (const r of rows) L.push(`| ${String(r.at ?? "").slice(5, 16)} | ${r.session_id ?? ""} | ${r.for_prompt_hash ?? ""} | ${mdEscape(head(r.prompt_head ?? "", 60))} | ${r.suggested ?? "—"} | ${mdEscape(r.then)} | ${r.verdict} |`);
  };
  const sugRows = rv.filter((r) => r.suggested);
  const fnRows = rv.filter((r) => !r.suggested);
  L.push(labelHow, "");
  L.push(`### Unlabelled suggestions (${sugRows.length}): the gate waits on these`, "");
  if (sugRows.length) table(sugRows);
  else L.push("None.");
  L.push("", `### Unlabelled proxy misses (${fnRows.length})`, "");
  L.push("Pipeline activity after a prompt the router left alone. Most are work the prompt did not ask for (the agent committing on its own); label the ones whose text did ask.", "");
  if (fnRows.length) table(fnRows);
  else L.push("None.");
  L.push("");
  return L.join("\n");
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function usage() {
  return [
    "usage:",
    "  node scripts/route-eval.mjs build-dataset [--since 2026-09-14] [--out scratch/route-dataset.jsonl] [--projects <glob[,glob]>] [--projects-root ~/.claude/projects]",
    "  node scripts/route-eval.mjs outcomes [--log $TMPDIR/opchain-route-log.jsonl] [--since <date>] [--report <file>]",
    "        [--labels <log dir>/route-labels.jsonl] [--window-minutes 30] [--projects-root ~/.claude/projects] [--rows <file>] [--no-rescore]",
    "  node scripts/route-eval.mjs run --dataset <file> [--limit N] [--sample stratified] [--out scratch/route-eval.jsonl] [--report scratch/route-eval.md]",
    "        [--fixture <answers.json>] [--route-module <path>] [--spec <file>] [--cache scratch/route-cache.json] [--model <id>]",
    "        [--thresholds gate=0.5,coreFits=0.6,otherFits=0.9 | fits=0.5] [--query-thresholds fits=0,gate=0] [--concurrency 4] [--seed 42] [--context]",
    `  ${DEFAULTS.apiKeyEnv} is required for run unless --fixture is given.`,
  ].join("\n");
}

export async function main(argv = process.argv.slice(2), { env = process.env, stdout = process.stdout, stderr = process.stderr } = {}) {
  const args = parseArgs(argv);
  const command = args._[0];
  const resolve = (p) => (path.isAbsolute(p) ? p : path.resolve(process.cwd(), p));

  if (command === "build-dataset") {
    const out = resolve(args.out ?? DEFAULTS.datasetOut);
    const projects = args.projects ? String(args.projects).split(",").map((s) => s.trim()).filter(Boolean) : DEFAULTS.projects;
    const projectsRoot = args["projects-root"] ? resolve(String(args["projects-root"])) : DEFAULTS.projectsRoot;
    const result = await buildDataset({ since: args.since ?? DEFAULTS.since, out, projects, projectsRoot });
    stdout.write(`${formatDatasetSummary(result, out)}\n`);
    return 0;
  }

  if (command === "outcomes") {
    const logPath = resolve(String(args.log && args.log !== true ? args.log : env.OPCHAIN_ROUTE_LOG || DEFAULTS.routeLog));
    const since = args.since && args.since !== true ? String(args.since) : null;
    if (!fs.existsSync(logPath)) {
      stderr.write(`outcomes: no route log at ${logPath} (pass --log <file>; the hook writes $TMPDIR/opchain-route-log.jsonl by default)\n`);
      return 2;
    }
    const windowMinutes = args["window-minutes"] !== undefined && args["window-minutes"] !== true ? Number(args["window-minutes"]) : ROUTER.OUTCOME_WINDOW_MS / 60000;
    if (!Number.isFinite(windowMinutes) || windowMinutes < 0) {
      stderr.write(`outcomes: --window-minutes must be a number ≥ 0 (0 = no horizon)\n`);
      return 2;
    }
    // Labels default to route-labels.jsonl beside the log they label.
    const labelsArg = args.labels && args.labels !== true ? resolve(String(args.labels)) : path.join(path.dirname(logPath), "route-labels.jsonl");
    const labelsPath = fs.existsSync(labelsArg) ? labelsArg : null;
    if (args.labels && args.labels !== true && !labelsPath) {
      stderr.write(`outcomes: no labels file at ${labelsArg}\n`);
      return 2;
    }
    const labels = readLabels(labelsPath);
    let rows;
    let unscored = 0;
    if (args["no-rescore"]) {
      // The hook's stored outcome records as written (pre-2026-10-23 scoring input).
      rows = readOutcomeRecords(logPath, { since }).map((o) => {
        const key = `${o.session_id}|${o.for_prompt_hash}`;
        return labels.has(key) ? { ...o, label: labels.get(key) } : o;
      });
    } else {
      const projectsRoot = args["projects-root"] && args["projects-root"] !== true ? resolve(String(args["projects-root"])) : DEFAULTS.projectsRoot;
      ({ rows, unscored } = scoreRoutes(readRouteRecords(logPath, { since }), {
        index: transcriptIndex(projectsRoot),
        outcomes: readOutcomeRecords(logPath),
        labels,
        windowMs: windowMinutes * 60000,
      }));
    }
    if (args.rows && args.rows !== true) writeJsonl(resolve(String(args.rows)), rows);
    const summary = summarizeOutcomes(rows);
    const report = renderOutcomesReport(summary, { logPath, since, labelsPath: labelsPath ?? labelsArg, windowMinutes });
    const src = summary.sources;
    const sourceNote = args["no-rescore"] ? "stored outcome records" : `${src.transcript ?? 0} rescored from transcripts, ${src.log ?? 0} from stored records, ${unscored} unscored`;
    if (args.report && args.report !== true) {
      const reportPath = resolve(String(args.report));
      ensureDir(reportPath);
      fs.writeFileSync(reportPath, report);
      stdout.write(`${summary.total} outcome(s) (${sourceNote}; ${summary.labelled + summary.ambiguous} labelled) · ${summary.suggestions} suggestion(s) · ${summary.explicit.total} explicit (excluded) · core precision ${f3(summary.proxy.corePrecision)} · recall ${f3(summary.proxy.recall)} · silent rate ${f3(summary.proxy.silentRate)} → ${summary.goNoGo.go ? "GO" : "NO-GO"}\nreport → ${reportPath}\n`);
    } else stdout.write(`${report}\n`);
    return 0;
  }

  if (command === "run") {
    if (!args.dataset) {
      stderr.write(`run: --dataset <file> is required\n${usage()}\n`);
      return 2;
    }
    const fixture = args.fixture ? resolve(String(args.fixture)) : null;
    const apiKey = env[DEFAULTS.apiKeyEnv];
    if (!fixture && !apiKey) {
      stderr.write(`run: ${DEFAULTS.apiKeyEnv} is not set. Export it (the router's classification endpoint key) or pass --fixture <answers.json> to use a canned transport.\n`);
      return 2;
    }
    let mod;
    try {
      mod = loadRouteModule(args["route-module"] ? resolve(String(args["route-module"])) : undefined);
    } catch (err) {
      stderr.write(`run: ${err.message}\n`);
      return 2;
    }
    let spec;
    try {
      spec = loadSpec(args.spec ? resolve(String(args.spec)) : DEFAULTS.specFile, { optional: Boolean(fixture) });
    } catch (err) {
      stderr.write(`run: ${err.message}\n`);
      return 2;
    }
    const model = args.model ?? env.TYPESAFE_MODEL ?? undefined;
    const transport = fixture ? fixtureTransport(JSON.parse(fs.readFileSync(fixture, "utf8"))) : mod.httpTransport({ apiKey, model, timeoutMs: Number(args["timeout-ms"] ?? 20_000) });

    let rows = readJsonl(resolve(String(args.dataset)));
    const limit = args.limit ? Number(args.limit) : 0;
    if (limit && rows.length > limit) {
      rows = args.sample === "stratified" ? stratifiedSample(rows, limit, Number(args.seed ?? 42)) : rows.slice(0, limit);
    }
    const out = resolve(args.out ?? DEFAULTS.evalOut);
    const reportPath = resolve(args.report ?? DEFAULTS.reportOut);
    const cache = new FileCache(args.cache === "none" ? null : resolve(args.cache ?? DEFAULTS.cacheFile));
    const previous = readJsonl(out);
    const thresholds = parseThresholds(args.thresholds, DEFAULTS.thresholds);
    const queryThresholds = parseThresholds(args["query-thresholds"], DEFAULTS.queryThresholds);
    // --context routes with conversation context (OPCHAIN_ROUTE_CONTEXT semantics); default off.
    if (args.context === true || args.context === "1" || process.env.OPCHAIN_ROUTE_CONTEXT === "1") queryThresholds.context = true;
    const concurrency = Math.max(1, Math.min(DEFAULTS.concurrency, Number(args.concurrency ?? DEFAULTS.concurrency) || DEFAULTS.concurrency));

    const { results, stats } = await runEval({ rows, routeFn: mod.route, transport, spec, cache, previous, model, concurrency, queryThresholds, log: (msg) => stderr.write(`${msg}\n`) });
    writeJsonl(out, results);
    const allow = Array.isArray(spec.suggestAllow) ? spec.suggestAllow : null;
    const report = renderReport({ results, stats, thresholds, allow, datasetPath: path.relative(process.cwd(), resolve(String(args.dataset))) });
    ensureDir(reportPath);
    fs.writeFileSync(reportPath, report);
    const m = computeMetrics(results, thresholds);
    stdout.write(`routed ${results.length} row(s): ${stats.queried} queried, ${stats.reused} reused, ${stats.retries} retries, ${m.errors} error(s), ${(stats.wallMs / 1000).toFixed(1)}s\n`);
    stdout.write(`top-1 ${f3(m.top1Accuracy)} · precision ${f3(m.precision)} · recall ${f3(m.recall)} · false-suggestion on none ${f3(m.falseSuggestionRate)} (${describeThresholds(thresholds)})\n`);
    const sup = allowlistSuppression(results, thresholds, allow);
    if (sup) stdout.write(`allowlist suppresses ${sup.total} suggestion(s) → precision ${f3(sup.gated.precision)} · recall ${f3(sup.gated.recall)} · false-suggestion on none ${f3(sup.gated.falseSuggestionRate)}\n`);
    stdout.write(`results → ${out}\nreport  → ${reportPath}\n`);
    return 0;
  }

  stderr.write(`${usage()}\n`);
  return command ? 2 : 1;
}

const invokedDirectly = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      process.stderr.write(`route-eval: ${err?.stack ?? err}\n`);
      process.exit(1);
    },
  );
}
