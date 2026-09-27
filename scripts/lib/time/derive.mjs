import { readFileSync, readdirSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { timePaths, clientPath, readJson } from './paths.mjs';
import { loadRegistry, createResolver } from './registry.mjs';
import { loadConfig, ConfigError } from './config.mjs';
import { buildBlocks, dayBounds, humanCadence } from './blocks.mjs';
import { allocate } from './allocate.mjs';
import { resolveMatter, checkpointRefs, limitMatters } from './matters.mjs';
import { messageUsage, priceUsage, PRICING } from './cost.mjs';
import { roundMatters } from './rounding.mjs';
import { gitActivity, summarizeActivity, prMetadata } from './activity.mjs';
import { narrative } from './narrative.mjs';
import { hash, draftHash, transactLedger, readLedger, foldLedger, verifyAllocations, LedgerError } from './ledger.mjs';

export function loadContext(env = process.env, cwd = process.cwd()) {
  const paths = timePaths(env);
  const registry = loadRegistry(paths), resolver = createResolver(registry);
  const client = resolver(cwd).client;
  if (client === 'internal') throw new ConfigError('Repo is not registered; register it before drafting');
  const lock = join(paths.root, 'collect.lock');
  let fd;
  try { fd = openSync(lock, 'wx', 0o600); }
  catch (error) { if (error.code === 'EEXIST') throw new LedgerError('Collector is busy; retry after collection'); throw error; }
  try {
    const configs = new Map(), warnings = [];
    for (const id of [...new Set(Object.values(registry))].sort()) {
      const loaded = loadConfig(join(clientPath(paths, id), 'billing.yaml'));
      if (loaded.config.client.id !== id) throw new ConfigError('Registry and billing client ids disagree');
      configs.set(id, loaded.config); warnings.push(...loaded.warnings);
    }
    const config = configs.get(client);
    for (const other of configs.values()) for (const key of ['timezone', 'overlap', 'idle_minutes', 'agent_tail_cap_minutes']) {
      if (other[key] !== config[key]) throw new ConfigError(`All registered clients must agree on ${key} for global allocation`);
    }
    const events = [];
    try {
      for (const file of readdirSync(paths.events).filter(n => /^\d{4}-\d\d\.jsonl$/.test(n)).sort()) {
        for (const line of readFileSync(join(paths.events, file), 'utf8').split('\n').filter(Boolean)) events.push(JSON.parse(line));
      }
    } catch (e) { if (e.code !== 'ENOENT') throw new LedgerError('Invalid normalized event cache; run collect'); }
    events.sort((a, b) => a.ts.localeCompare(b.ts) || a.uuid.localeCompare(b.uuid));
    return { paths, registry, resolver, client, config, configs, events, warnings,
      canary: readJson(paths.canary, { pass: false }) };
  } finally { closeSync(fd); unlinkSync(lock); }
}

export function deriveDay(context, date, { pricing = PRICING, readRefs = checkpointRefs, readActivity = gitActivity, readPr = prMetadata } = {}) {
  const { config, client, events, resolver } = context, bounds = dayBounds(date, config.timezone);
  const clip = blocks => blocks.filter(b => b.start < bounds.end && b.end > bounds.start).map(b => ({ ...b, start: Math.max(b.start, bounds.start), end: Math.min(b.end, bounds.end) }));
  const belongs = e => resolver(e.repo).client === client;
  const blocks = clip(buildBlocks(events, config));
  const relevantSessions = new Set(blocks.filter(b => belongs(b.event)).map(b => b.session));
  const refs = new Map(), prCache = context.prMetadataCache ??= new Map();
  const prs = events.filter(e => e.pr && relevantSessions.has(e.session) && belongs(e) && Date.parse(e.ts) < bounds.end).map(e => {
    const key = `${e.repo}:${e.pr}`;
    if (!prCache.has(key)) prCache.set(key, readPr(e.repo, e.pr));
    return { ...e, ...prCache.get(key), branch: prCache.get(key).branch || e.branch };
  });
  // Metadata can change matter mid-block without extending engaged time.
  const segments = blocks.flatMap(b => {
    if (!belongs(b.event)) return [b];
    if (!refs.has(b.event.repo)) refs.set(b.event.repo, readRefs(b.event.repo));
    const points = [b.start, b.end, ...refs.get(b.event.repo).flatMap(r => [Date.parse(r.active_from), Date.parse(r.active_to)]),
      ...prs.filter(p => p.session === b.session).map(p => Date.parse(p.ts))];
    const cuts = [...new Set(points.filter(n => Number.isFinite(n) && n >= b.start && n <= b.end))].sort((a, c) => a - c);
    return cuts.slice(0, -1).map((start, i) => ({ ...b, start, end: cuts[i + 1] }));
  });
  const allocation = allocate(segments, config.overlap);
  const cadence = allocate(clip(humanCadence(events, config)), config.overlap);
  let rows = [];
  for (const s of allocation.slices.filter(s => belongs(s.event))) {
    const e = s.event;
    if (!refs.has(e.repo)) refs.set(e.repo, readRefs(e.repo));
    const matter = resolveMatter({ ...e, ts: new Date(s.start).toISOString() }, config, { refs: refs.get(e.repo), prs });
    rows.push({ ...matter, raw_minutes: s.minutes, agent_only_minutes: s.agent_only_minutes, slices: [s] });
  }
  rows = limitMatters(rows, config.matters);
  const grouped = new Map();
  for (const r of rows) {
    // Keep nonbillable evidence separate even if a capped matter name merges.
    const key = `${r.matter}:${r.billable}`;
    const old = grouped.get(key);
    if (old) { old.raw_minutes += r.raw_minutes; old.agent_only_minutes += r.agent_only_minutes; old.slices.push(...r.slices); }
    else grouped.set(key, { ...r, category: r.billable ? 'time' : 'excluded', slices: [...r.slices] });
  }
  const activityCache = new Map();
  const input_hash = hash({ algorithm: 1, date, config, pricing, events: events.filter(e => Date.parse(e.ts) < bounds.end), refs: [...refs], prs, canary: context.canary.pass });
  const entries = roundMatters([...grouped.values()].sort((a, b) => a.matter.localeCompare(b.matter) || Number(b.billable) - Number(a.billable)), config).map(r => {
    const evidenceEvents = events.filter(e => belongs(e) && r.slices.some(s => (e.parent_session || e.session) === s.session && Date.parse(e.ts) >= s.start && Date.parse(e.ts) <= s.end));
    const commits = r.slices.flatMap(s => {
      const key = `${s.event.repo}:${s.event.branch}`;
      if (!activityCache.has(key)) activityCache.set(key, readActivity(s.event.repo, s.event.branch, bounds.start, bounds.end));
      return activityCache.get(key).filter(c => Date.parse(c.at) >= s.start && Date.parse(c.at) < s.end);
    });
    const sources = summarizeActivity(evidenceEvents, commits);
    const entry = { entry: `${client}-${date}-${encodeURIComponent(r.matter)}${r.category === 'time' ? '-t' : '-nonbillable'}`, type: 'time', date, client,
      matter: r.matter, matter_source: r.matter_source, raw_minutes: r.raw_minutes, agent_only_minutes: r.agent_only_minutes,
      rounding_added_minutes: r.rounding_added_minutes, hours: r.hours, rate: config.rate.hourly, currency: config.rate.currency,
      billable: r.billable, narrative: narrative(r.matter, sources), sources,
      allocation: r.slices.map(s => ({ start: s.start, end: s.end, share: s.share })), input_hash, canary_pass: context.canary.pass };
    entry.derivation = draftHash(entry); return entry;
  });
  // De-duplicate globally FIRST. A fork copied into another day/client cannot
  // move or double-count cost; first canonical event owns the merged usage.
  const messages = messageUsage(events).filter(e => belongs(e) && Date.parse(e.ts) >= bounds.start && Date.parse(e.ts) < bounds.end);
  const cost = priceUsage(messages, pricing);
  if (config.ai_cost.mode !== 'none' && messages.length) {
    const entry = { entry: `${client}-${date}-ai`, type: 'disbursement', date, client,
      amount: Math.round(cost.amount * (config.ai_cost.mode === 'markup' ? 1 + config.ai_cost.markup_pct / 100 : 1) * 100) / 100,
      currency: 'USD', basis: 'api-list', label: 'AI compute (list-price equivalent)', narrative: 'AI compute (list-price equivalent).',
      unpriced_share: cost.unpriced_share, unpriced_models: cost.unpriced_models, tokens: cost.tokens, models: cost.models,
      input_hash, canary_pass: context.canary.pass };
    entry.derivation = draftHash(entry); entries.push(entry);
  }
  return { date, entries, union_minutes: allocation.union_minutes,
    block_minutes: rows.reduce((n, r) => n + r.raw_minutes, 0),
    human_cadence_minutes: cadence.slices.filter(s => belongs(s.event)).reduce((n, s) => n + s.minutes, 0),
    internal_minutes: allocation.slices.filter(s => resolver(s.event.repo).client === 'internal').reduce((n, s) => n + s.minutes, 0),
    cost, warnings: [...context.warnings] };
}

export async function draftDay(context, date, options = {}) {
  const result = deriveDay(context, date, options);
  const path = join(clientPath(context.paths, context.client), 'ledger.jsonl');
  const appended = await transactLedger(path, state => {
    const existing = [...state.values()].filter(e => e.date === date), next = new Map(result.entries.map(e => [e.entry, e]));
    const changed = existing.filter(e => e.status !== 'discarded').some(e => e.derivation !== next.get(e.entry)?.derivation) || result.entries.some(e => !state.has(e.entry));
    if (changed && existing.some(e => ['approved', 'amended', 'edited'].includes(e.status))) {
      result.warnings.push(`Protected ${date}: derivation drift; entries unchanged. Use amend for approved entries.`); return [];
    }
    const events = [];
    for (const e of result.entries) {
      const old = state.get(e.entry);
      if ((old?.status !== 'discarded' && old?.derivation === e.derivation) || (old?.status === 'discarded' && old.reason !== 'No longer derived')) continue;
      events.push({ ...e, event: 'entry.drafted', revision: (old?.revision || 0) + 1, ...(options.at ? { at: options.at } : {}) });
    }
    for (const e of existing) if (!next.has(e.entry) && e.status !== 'discarded') events.push({ event: 'entry.discarded', entry: e.entry,
      revision: e.revision, reason: 'No longer derived', ...(options.at ? { at: options.at } : {}) });
    return events;
  });
  return { ...result, appended: appended.length };
}

export function verify(context) {
  const checks = [], entries = [];
  const check = (label, action) => { try { action(); checks.push({ pass: true, label }); } catch { checks.push({ pass: false, label }); } };
  for (const id of context.configs.keys()) check(`Ledger ${id}: hashes, revisions and immutable approvals`, () => {
    const state = foldLedger(readLedger(join(clientPath(context.paths, id), 'ledger.jsonl')));
    for (const e of state.values()) {
      if (e.client !== id) throw new LedgerError('Wrong client ledger');
      const bounds = dayBounds(e.date, context.config.timezone);
      if ((e.allocation || []).some(s => s.start < bounds.start || s.end > bounds.end)) throw new LedgerError('Allocation crosses billing day');
      entries.push(e);
    }
  });
  check('Global raw allocation is within wall-clock union', () => verifyAllocations(entries));
  check('Format canary', () => { if (!context.canary.pass) throw new LedgerError('Canary failing'); });
  for (const repo of Object.keys(context.registry)) check(`No billing files tracked: ${repo}`, () => {
    const tracked = execFileSync('git', ['-C', repo, 'ls-files', '--', 'timesheets', 'billing.yaml', 'ledger.jsonl'], { encoding: 'utf8', timeout: 1000, stdio: ['ignore', 'pipe', 'ignore'] });
    if (tracked.trim()) throw new LedgerError('Billing files tracked');
  });
  return { pass: checks.every(c => c.pass), checks };
}
