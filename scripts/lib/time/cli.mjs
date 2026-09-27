import { collect } from './transcripts.mjs';
import { loadContext, draftDay, deriveDay, verify } from './derive.mjs';
import { loadView, initClient, checkDate, changeEntry, addEntry, approveEntries, exportEntries, sampleEntries, writeTimesheet, assertUntracked, reviewEvidence, UsageError } from './cli-service.mjs';
import { draftHash } from './ledger.mjs';
import { renderReview, renderToday, evidence, wrap } from './render.mjs';

export const USAGE = {
  init: 'init --client <id> --name <name> --rate <n> --repo <path> [--currency USD] [--timezone America/Chicago] [--force]',
  collect: 'collect [--report]', draft: 'draft [YYYY-MM-DD] [--since YYYY-MM-DD]', review: 'review [YYYY-MM-DD] [--quarantine]',
  edit: 'edit <id> [--hours <h>] [--matter <m>] [--narrative <text>] [--amount <n>] --reason <text>',
  amend: 'amend <id> [--hours <h>] [--matter <m>] [--narrative <text>] [--amount <n>] --reason <text>',
  add: 'add --date YYYY-MM-DD --matter <m> --hours <h> --narrative <text> --reason <text>',
  approve: 'approve <YYYY-MM-DD|id>', discard: 'discard <id> --reason <text>',
  export: 'export --from YYYY-MM-DD --to YYYY-MM-DD [--out <file.csv>]', today: 'today', verify: 'verify',
  spotcheck: 'spotcheck [--n 3]', nudge: 'nudge --cwd <path>', hook: 'hook prompt', help: 'help [verb]',
};
const FLAGS = {
  init: ['client', 'name', 'rate', 'repo', 'currency', 'timezone', 'force'], collect: ['report'], draft: ['since'], review: ['quarantine'],
  edit: ['hours', 'matter', 'narrative', 'amount', 'reason'], amend: ['hours', 'matter', 'narrative', 'amount', 'reason'],
  add: ['date', 'matter', 'hours', 'narrative', 'reason'], approve: [], discard: ['reason'], export: ['from', 'to', 'out'], today: [], verify: [], spotcheck: ['n'],
};
const booleans = new Set(['force', 'report', 'quarantine']);
export function help(verb) {
  if (verb && !USAGE[verb]) throw new UsageError('Unknown command');
  return (verb ? wrap(`Usage: ${USAGE[verb]}`) : ['Timesheet — local drafts, human review and approved exports.', '', ...Object.values(USAGE).map(s => wrap(s)), '', 'Exit: 0 success · 1 refused · 2 usage/config error. Hooks always exit 0.'].join('\n')) + '\n';
}
export function parseArgs(args) {
  const [verb, ...rest] = args;
  if (!Object.hasOwn(FLAGS, verb)) throw new UsageError('Unknown command. Run: timesheet help');
  const options = {}, positional = [];
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (!a.startsWith('--')) { positional.push(a); continue; }
    const key = a.slice(2);
    if (!FLAGS[verb].includes(key) || Object.hasOwn(options, key)) throw new UsageError(`Unknown or duplicate option: ${a}`);
    if (booleans.has(key)) options[key] = true;
    else {
      if (rest[i + 1] === undefined || rest[i + 1].startsWith('--')) throw new UsageError(`Value required for ${a}`);
      options[key] = rest[++i];
    }
  }
  const maximum = ['draft', 'review', 'edit', 'amend', 'approve', 'discard'].includes(verb) ? 1 : 0;
  if (positional.length > maximum || ['edit', 'amend', 'approve', 'discard'].includes(verb) && positional.length !== 1) throw new UsageError(`Usage: ${USAGE[verb]}`);
  if (verb === 'draft' && positional.length && options.since) throw new UsageError('Use a date or --since, not both');
  return { verb, options, positional };
}
export function driftWarnings(entries, derived) {
  const next = new Map(derived.entries.map(e => [e.entry, e]));
  const protectedRows = entries.filter(e => ['approved', 'edited', 'amended'].includes(e.status));
  if (!protectedRows.length) return [];
  const changed = entries.some(e => e.status !== 'discarded' && e.derivation && e.derivation !== next.get(e.entry)?.derivation)
    || derived.entries.some(e => !entries.some(old => old.entry === e.entry));
  return changed ? [`Protected ${derived.date}: derivation drift; current block model ${derived.block_minutes.toFixed(2)}m. Entries unchanged. Use amend for approved entries; review edits before re-approval.`] : [];
}
export async function runCli(args, { env = process.env, cwd = process.cwd(), out = s => process.stdout.write(s), err = s => process.stderr.write(s) } = {}) {
  if (args[0] === 'help' || args.includes('--help') || args[0] === '--help') {
    out(help(args[0] === 'help' ? args[1] : args[0] === '--help' ? undefined : args[0])); return 0;
  }
  const { verb, options, positional } = parseArgs(args), print = s => out(wrap(s) + '\n');
  if (verb === 'init') {
    const result = initClient(options, env, cwd);
    print(`✓ Created ${result.configPath} (configure matters.ticket for your client)`);
    print(`✓ Registered ${result.repo} → ${result.client}`);
    print(`✓ ${result.addedIgnore ? 'Added' : 'Kept'} /timesheets/ in ${result.repo}/.gitignore`);
    print('! Hooks not installed. See docs/plans/time-tracking/README.md#hooks'); print('Next: draft'); return 0;
  }
  if (verb === 'collect') {
    const report = await collect({ env });
    if (options.report) out(JSON.stringify(report, null, 2) + '\n');
    else print(`Collected ${report.events} events from ${report.files} files (${report.seconds.toFixed(2)}s) · canary ${(report.canary.share * 100).toFixed(1)}%`);
    if (!report.canary.pass) err('! Format canary failed; inspect collect --report before using these events.\n');
    return 0;
  }
  if (verb === 'verify') {
    const result = verify(loadContext(env, cwd));
    for (const check of result.checks) print(`${check.pass ? '✓' : '✗'} ${check.label}`);
    return result.pass ? 0 : 1;
  }
  let view = loadView(env, cwd);
  if (verb === 'today') { out(renderToday(view.client, view.today, view.entries)); return 0; }
  if (verb === 'draft') {
    const start = checkDate(options.since || positional[0] || view.today, view.config.timezone), end = options.since ? view.today : start;
    if (start > end) throw new UsageError('--since cannot be in the future');
    assertUntracked(view.repo);
    await collect({ env });
    const context = loadContext(env, cwd); view = loadView(env, cwd);
    for (let date = start; date <= end; date = new Date(Date.parse(`${date}T12:00:00Z`) + 86400000).toISOString().slice(0, 10)) {
      const result = await draftDay(context, date);
      const path = writeTimesheet(view, date, { derived: result, warnings: result.warnings });
      print(`${date} · block ${result.block_minutes.toFixed(2)}m · human cadence ${result.human_cadence_minutes.toFixed(2)}m · unpriced ${(result.cost.unpriced_share * 100).toFixed(1)}% · appended ${result.appended}`);
      print(`✓ ${path}`);
      for (const warning of result.warnings) err(wrap(`! ${warning}`) + '\n');
    }
    if (!context.canary.pass) { err('✗ Format canary failed; drafts written but approval blocked.\n'); return 1; }
    return 0;
  }
  if (verb === 'review') {
    const date = checkDate(positional[0] || view.today, view.config.timezone), entries = view.entries.filter(e => e.date === date);
    const context = entries.length ? loadContext(env, cwd) : undefined;
    const derived = context ? deriveDay(context, date) : undefined;
    out(renderReview({ ...view, date, entries: context ? reviewEvidence(context, entries) : entries, derived, quarantine: options.quarantine,
      warnings: [...view.warnings, ...(derived ? driftWarnings(entries, derived) : [])] })); return 0;
  }
  if (['edit', 'amend', 'discard', 'add', 'approve'].includes(verb)) {
    // Preflight the output location before appending, so a tracked timesheet never
    // receives billing data. The authoritative append remains valid if rendering fails.
    assertUntracked(view.repo);
    let dates, code = 0;
    if (verb === 'approve') {
      const result = await approveEntries(view, positional[0]);
      print(`✓ approved ${result.approved} · ${result.blocked.length ? '✗' : '✓'} blocked ${result.blocked.length} · already approved ${result.skipped.length}`);
      for (const b of result.blocked) print(`✗ ${b.entry}: ${b.reason}`);
      code = result.blocked.length ? 1 : 0;
      dates = [...new Set(view.entries.filter(e => /^\d{4}-\d\d-\d\d$/.test(positional[0]) ? e.date === positional[0] : e.entry.startsWith(positional[0])).map(e => e.date))];
    } else {
      const rows = verb === 'add' ? await addEntry(view, options) : await changeEntry(view, verb, positional[0], options);
      const state = loadView(env, cwd).entries;
      dates = [...new Set(rows.map(r => state.find(e => e.entry === r.entry).date))];
      const row = rows[0];
      print(`✓ ${verb === 'add' ? `added ${row.entry}` : `${{ edit: 'edited', amend: 'amended', discard: 'discarded' }[verb]} r${row.revision}`}${verb === 'amend' ? ', re-approve required' : ''}`);
    }
    for (const date of dates) {
      try { writeTimesheet(view, date); }
      catch (error) { err(wrap(`! Ledger saved; timesheet not refreshed: ${error.exitCode ? error.message : 'output unavailable'}. Run draft to retry.`) + '\n'); }
    }
    return code;
  }
  if (verb === 'export') { const result = exportEntries(view, options); print(result.summary); print(`✓ ${result.path}`); return 0; }
  if (verb === 'spotcheck') {
    const selected = sampleEntries(view.entries, options.n === undefined ? 3 : Number(options.n));
    if (!selected.length) { print('No approved entries. Review and approve a day before spotcheck.'); return 0; }
    for (const e of selected) {
      print(`APPROVED · ${e.entry} · revision ${e.revision}`); print(e.narrative); out(evidence(e) + '\n');
      print(`Raw ${e.raw_minutes ?? 'manual'} minutes · allocation segments ${(e.allocation || []).length} · derivation ${e.derivation || 'manual'}`);
      if (e.derivation && e.derivation !== draftHash(e)) print('! Entry was edited; inspect the ledger revisions and reason.');
    }
    return 0;
  }
  throw new UsageError('Unknown command');
}
