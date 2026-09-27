import { readFileSync, existsSync, lstatSync, realpathSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { join, resolve, dirname, relative, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomInt, randomUUID } from 'node:crypto';
import { timePaths, clientPath, readJson, writePrivate } from './paths.mjs';
import { loadRegistry, createResolver, gitRoot } from './registry.mjs';
import { loadConfig, parseConfig, ConfigError } from './config.mjs';
import { dayBounds, localDate } from './blocks.mjs';
import { foldLedger, readLedger, transactLedger, verifyAllocations, LedgerError } from './ledger.mjs';
import { renderMarkdown, renderCsv, totals, hours, money } from './render.mjs';

export class UsageError extends Error { constructor(message) { super(message); this.exitCode = 2; } }
const git = (repo, args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', timeout: 1500, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
export function checkDate(date, zone = 'UTC') {
  try { dayBounds(date, zone); return date; } catch { throw new UsageError('Expected a valid YYYY-MM-DD date'); }
}
export function quarterHours(value) {
  const n = Number(value);
  if (value === '' || !Number.isFinite(n) || n < 0 || !Number.isInteger(n * 4)) throw new UsageError('Hours must be a nonnegative multiple of 0.25');
  return n;
}
export function requiredText(value, label, max = 240) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\x00-\x1f\x7f-\x9f]/.test(value)) throw new UsageError(`${label} must be nonempty text of at most ${max} characters`);
  return value.trim();
}
export function loadView(env = process.env, cwd = process.cwd()) {
  const paths = timePaths(env), registry = loadRegistry(paths), resolved = createResolver(registry)(cwd);
  if (resolved.client === 'internal') throw new UsageError("Repo isn't registered. Run: init --client <id> --name <name> --rate <n> --repo <path>");
  const dir = clientPath(paths, resolved.client), { config, warnings } = loadConfig(join(dir, 'billing.yaml'));
  if (config.client.id !== resolved.client) throw new ConfigError('Registry and billing client ids disagree');
  const ledger = join(dir, 'ledger.jsonl'), entries = [...foldLedger(readLedger(ledger)).values()];
  if (entries.some(e => e.client !== resolved.client)) throw new LedgerError('Wrong client ledger');
  return { paths, registry, client: resolved.client, repo: git(cwd, ['rev-parse', '--show-toplevel']), dir, ledger, config, warnings, entries,
    canary: readJson(paths.canary, null), today: localDate(Date.now(), config.timezone) };
}
export function assertUntracked(repo) {
  if (git(repo, ['ls-files', '--', 'timesheets', 'billing.yaml', 'ledger.jsonl'])) throw new LedgerError('Billing files are tracked in git. Remove them from the index before writing timesheets.');
}
function noSymlinks(path, boundary = dirname(dirname(resolve(path)))) {
  for (let p = resolve(path); ; p = dirname(p)) {
    try { if (lstatSync(p).isSymbolicLink()) throw new LedgerError('Refusing a symbolic-link output path'); }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (p === boundary || dirname(p) === p) break;
  }
}
export function initClient(options, env = process.env, cwd = process.cwd()) {
  const paths = timePaths(env), id = requiredText(options.client, 'Client id', 64);
  let dir; try { dir = clientPath(paths, id); } catch { throw new UsageError('Client id must be a lowercase slug, excluding internal'); }
  const name = requiredText(options.name, 'Client name'), rate = Number(options.rate);
  if (options.rate === undefined || options.rate === '' || !Number.isFinite(rate) || rate < 0) throw new UsageError('Rate must be a nonnegative number');
  const requested = resolve(options.repo || cwd), root = gitRoot(requested);
  if (!root) throw new UsageError('Not a git repository');
  const repo = git(requested, ['rev-parse', '--show-toplevel']);
  assertUntracked(repo);
  const registry = loadRegistry(paths), configPath = join(dir, 'billing.yaml');
  if ((existsSync(configPath) || registry[root]) && !options.force) throw new UsageError('Client or repo already exists; review it and use --force to replace configuration');
  // Reassigning historical events to another client would rewrite attribution.
  if (registry[root] && registry[root] !== id) throw new LedgerError('Repo already belongs to another client; preserve its billing history');
  let template = readFileSync(new URL('../../../docs/plans/time-tracking/billing.example.yaml', import.meta.url), 'utf8')
    .replace('  id: acme', `  id: ${JSON.stringify(id)}`).replace('  name: Acme Corp', `  name: ${JSON.stringify(name)}`)
    .replace('  hourly: 175', `  hourly: ${rate}`).replace('  currency: USD', `  currency: ${JSON.stringify(options.currency || 'USD')}`)
    .replace('timezone: America/Chicago', `timezone: ${JSON.stringify(options.timezone || 'America/Chicago')}`)
    .replace("  ticket: '(ACME-\\d+)'", "  ticket: ''");
  const { config } = parseConfig(template);
  for (const other of new Set(Object.values(registry))) {
    if (other === id) continue;
    const existing = loadConfig(join(clientPath(paths, other), 'billing.yaml')).config;
    for (const key of ['timezone', 'overlap', 'idle_minutes', 'agent_tail_cap_minutes']) {
      if (existing[key] !== config[key]) throw new ConfigError(`All clients must agree on ${key}; configure matching policy before init`);
    }
  }
  const ignore = join(repo, '.gitignore'); noSymlinks(ignore);
  const old = existsSync(ignore) ? readFileSync(ignore, 'utf8') : '';
  const alreadyIgnored = old.split(/\r?\n/).some(line => line === 'timesheets/' || line === '/timesheets/');
  writePrivate(configPath, template);
  writePrivate(paths.registry, JSON.stringify({ ...registry, [root]: id }, null, 2) + '\n');
  // writePrivate would chmod the repo directory: keep repo permissions unchanged.
  if (!alreadyIgnored) {
    writeFileSync(ignore, old + (old && !old.endsWith('\n') ? '\n' : '') + '/timesheets/\n', { mode: 0o600 });
  }
  return { repo, configPath, client: id, addedIgnore: !alreadyIgnored };
}
export function findEntry(state, prefix) {
  if (!prefix) throw new UsageError('Entry id or unique prefix required');
  const exact = state.get(prefix); if (exact) return exact;
  const matches = [...state.values()].filter(e => e.entry.startsWith(prefix));
  if (matches.length !== 1) throw new UsageError(matches.length ? 'Ambiguous entry prefix; use a longer id' : 'No matching entry');
  return matches[0];
}
export async function changeEntry(view, verb, prefix, options) {
  const reason = requiredText(options.reason, 'Reason');
  const changes = {};
  if (options.hours !== undefined) changes.hours = quarterHours(options.hours);
  for (const key of ['matter', 'narrative']) if (options[key] !== undefined) changes[key] = requiredText(options[key], key);
  if (options.amount !== undefined) {
    const n = Number(options.amount);
    if (options.amount === '' || !Number.isFinite(n) || n < 0) throw new UsageError('Amount must be nonnegative');
    changes.amount = n;
  }
  if (verb !== 'discard' && !Object.keys(changes).length) throw new UsageError('Supply --hours, --matter, --narrative or --amount');
  if (verb === 'discard' && Object.keys(changes).length) throw new UsageError('Discard accepts only --reason');
  return transactLedger(view.ledger, state => {
    const e = findEntry(state, prefix);
    if (e.type === 'time' && changes.amount !== undefined || e.type !== 'time' && (changes.hours !== undefined || changes.matter !== undefined)) throw new UsageError('Time entries use hours/matter; disbursements use amount');
    return [{ event: `entry.${{ edit: 'edited', amend: 'amended', discard: 'discarded' }[verb]}`, entry: e.entry,
      revision: e.revision + (verb === 'discard' ? 0 : 1), reason, ...(verb === 'discard' ? {} : { changes }) }];
  });
}
export async function addEntry(view, options) {
  const date = checkDate(options.date, view.config.timezone), matter = requiredText(options.matter, 'Matter'),
    narrative = requiredText(options.narrative, 'Narrative'), reason = requiredText(options.reason, 'Reason'), h = quarterHours(options.hours);
  if (options.hours === undefined) throw new UsageError('Hours required');
  return transactLedger(view.ledger, state => {
    let n = 1; const prefix = `${view.client}-${date}-m`;
    while (state.has(`${prefix}${n}`)) n++;
    return [{ event: 'entry.manual', entry: `${prefix}${n}`, revision: 1, type: 'time', date, client: view.client, matter,
      hours: h, rate: view.config.rate.hourly, currency: view.config.rate.currency, narrative, reason, billable: true,
      canary_pass: view.canary?.pass === true }];
  });
}
export function assertGlobalAllocations(view, current) {
  const entries = [];
  for (const client of new Set(Object.values(view.registry))) {
    const state = client === view.client && current ? current
      : foldLedger(readLedger(join(clientPath(view.paths, client), 'ledger.jsonl')));
    entries.push(...state.values());
  }
  verifyAllocations(entries);
}
export async function approveEntries(view, target) {
  const blocked = [], skipped = [];
  const result = await transactLedger(view.ledger, state => {
    assertGlobalAllocations(view, state);
    const byDate = /^\d{4}-\d\d-\d\d$/.test(target || '');
    if (byDate) checkDate(target, view.config.timezone);
    const selected = byDate ? [...state.values()].filter(e => e.date === target && e.status !== 'discarded') : [findEntry(state, target)];
    if (!selected.length) throw new LedgerError('No drafts to approve. Run draft first.');
    const canary = readJson(view.paths.canary, null);
    return selected.flatMap(e => {
      if (e.status === 'approved') { skipped.push(e.entry); return []; }
      const reason = !canary?.pass || e.canary_pass === false ? 'format canary failing; collect, verify and re-draft'
        : e.status === 'discarded' ? 'entry discarded' : e.billable === false ? 'nonbillable'
          : e.unpriced_share > 0 ? 'unpriced AI usage; source a price and re-draft or discard' : null;
      if (reason) { blocked.push({ entry: e.entry, reason }); return []; }
      return [{ event: 'entry.approved', entry: e.entry, revision: e.revision }];
    });
  });
  return { approved: result.length, blocked, skipped };
}
function writeOutput(path, contents) {
  noSymlinks(path);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temp = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temp, contents, { mode: 0o600, flag: 'wx' }); renameSync(temp, path);
}
export function writeTimesheet(view, date, { derived, warnings = [] } = {}) {
  assertUntracked(view.repo);
  const folder = join(view.repo, 'timesheets'), path = join(folder, `${checkDate(date)}.md`);
  noSymlinks(path, view.repo);
  // Verify effective ignores, including later negations, before writing billing data.
  try { git(view.repo, ['check-ignore', '-q', '--', path]); }
  catch { throw new LedgerError('timesheets/ is not ignored. Add /timesheets/ to .gitignore before drafting.'); }
  const entries = [...foldLedger(readLedger(view.ledger)).values()].filter(e => e.date === date);
  writeOutput(path, renderMarkdown({ config: view.config, date, entries, derived, warnings }));
  return path;
}
function outputLocation(view, requested, from, to) {
  const name = from.slice(0, 7) === to.slice(0, 7) ? from.slice(0, 7) : `${from}-to-${to}`;
  const path = resolve(requested || join(view.dir, 'exports', `${view.client}-${name}.csv`));
  let parent = dirname(path); while (!existsSync(parent)) parent = dirname(parent);
  const actual = join(realpathSync(parent), relative(parent, path));
  const repo = gitRoot(parent);
  if (repo) {
    const checkout = git(parent, ['rev-parse', '--show-toplevel']);
    if (!actual.startsWith(`${realpathSync(checkout)}${sep}timesheets${sep}`)) throw new LedgerError('Export inside a repository must be under ignored timesheets/');
    assertUntracked(checkout);
    try { git(checkout, ['check-ignore', '-q', '--', actual]); } catch { throw new LedgerError('Export location is not ignored'); }
  }
  // Never overwrite source state or configuration with a CSV.
  if (actual.startsWith(`${realpathSync(view.paths.root)}${sep}`) && !actual.startsWith(`${realpathSync(view.dir)}${sep}exports${sep}`)) throw new LedgerError('Export cannot replace billing state');
  if (!actual.endsWith('.csv')) throw new UsageError('Export filename must end in .csv');
  noSymlinks(path); return path;
}
export function exportEntries(view, options) {
  const from = checkDate(options.from, view.config.timezone), to = checkDate(options.to, view.config.timezone);
  if (from > to) throw new UsageError('--from must not follow --to');
  const all = [...foldLedger(readLedger(view.ledger)).values()].filter(e => e.date >= from && e.date <= to && e.status !== 'discarded');
  const approved = all.filter(e => e.status === 'approved');
  assertGlobalAllocations(view);
  if (!approved.length) throw new LedgerError('No approved entries. Review and approve a day before export.');
  approved.sort((a, b) => a.date.localeCompare(b.date) || a.entry.localeCompare(b.entry));
  const path = outputLocation(view, options.out, from, to), skipped = [...new Set(all.filter(e => e.status !== 'approved' && e.billable !== false).map(e => e.date))].sort();
  writeOutput(path, renderCsv(approved));
  const t = totals(approved);
  return { path, entries: approved.length, summary: `Exported ${approved.length} approved entries (${hours(t.hours)}, ${t.fees} + ${money(t.ai)} AI list-price eq.) · ${skipped.length} unapproved days skipped${skipped.length ? ': ' + skipped.join(', ') : ''}` };
}
export function sampleEntries(entries, count = 3, pick = randomInt) {
  if (!Number.isSafeInteger(count) || count < 1 || count > 100) throw new UsageError('--n must be an integer from 1 to 100');
  const pool = entries.filter(e => e.status === 'approved'), selected = [];
  while (pool.length && selected.length < count) selected.push(pool.splice(pick(pool.length), 1)[0]);
  return selected;
}
// Add content-free cached evidence for review without mutating historical rows.
export function reviewEvidence(context, entries) {
  return entries.map(e => {
    if (e.type !== 'time' || !e.allocation?.length) return e;
    const events = context.events.filter(event => context.resolver(event.repo).client === e.client && e.allocation.some(s => Date.parse(event.ts) >= s.start && Date.parse(event.ts) <= s.end));
    return { ...e, review_evidence: {
      prompts: events.filter(x => x.class === 'human_prompt' && !x.parent_session).length,
      answers: events.filter(x => x.class === 'human_answer' && !x.parent_session).length,
      note: 'Current cached activity in allocated intervals; historical allocation retained',
    } };
  });
}
