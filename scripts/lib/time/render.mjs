// Pure renderers. No transcript access, terminal control sequences or colour.
export const clean = value => String(value ?? '').replace(/[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/g, ' ').replace(/\s+/g, ' ').trim();
export function wrap(value, width = 100, indent = '') {
  const words = clean(value).split(' '), lines = []; let line = indent;
  for (let word of words) {
    if (line.length > indent.length && line.length + word.length + 1 > width) { lines.push(line); line = indent; }
    while (word.length > width - indent.length) {
      if (line !== indent) { lines.push(line); line = indent; }
      lines.push(indent + word.slice(0, width - indent.length)); word = word.slice(width - indent.length);
    }
    if (word) line += (line === indent ? '' : ' ') + word;
  }
  if (line !== indent) lines.push(line);
  return lines.join('\n');
}
export const hours = n => `${Number(n || 0).toFixed(2)}h`;
export const raw = n => { const m = Math.round(n || 0); return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`; };
export const money = (n, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n || 0);
export const amount = e => e.type === 'time' ? e.hours * e.rate : e.amount;
export const status = e => e.status === 'edited' ? `AMENDED r${e.revision}` : (e.status || 'draft').toUpperCase();
export const active = entries => entries.filter(e => e.status !== 'discarded' && e.billable !== false);
const sum = (rows, key) => rows.reduce((n, r) => n + (r[key] || 0), 0);
export function totals(entries) {
  const rows = active(entries), time = rows.filter(e => e.type === 'time'), ai = rows.filter(e => e.type === 'disbursement');
  const fees = new Map();
  for (const e of time) fees.set(e.currency || 'USD', (fees.get(e.currency || 'USD') || 0) + amount(e));
  return { hours: sum(time, 'hours'), raw: sum(time, 'raw_minutes'), rounding: sum(time, 'rounding_added_minutes'),
    fees: [...fees].map(([c, n]) => money(n, c)).join(' + ') || money(0), ai: sum(ai, 'amount') };
}
const day = date => `${new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))} ${date}`;
const dayStatus = entries => active(entries).length && active(entries).every(e => e.status === 'approved') ? 'APPROVED' : 'DRAFT';
const markdown = s => clean(s).replace(/[\\`*_{}\[\]<>|#]/g, '\\$&');
const short = (s, n) => clean(s).length <= n ? clean(s) : `${clean(s).slice(0, n - 1)}…`;
export function evidence(e) {
  const source = e.sources || {}, lines = [];
  if (e.type === 'time') {
    lines.push(`${source.sessions || 0} sessions · ${source.commits || 0} commits · ${source.files || 0} files touched`);
    if (e.review_evidence) lines.push(`${e.review_evidence.prompts} prompts · ${e.review_evidence.answers} answers · current cached intervals`);
    if (source.prs?.length) lines.push(`PRs ${source.prs.map(n => `#${n}`).join(', ')}`);
    if (source.skills?.length) lines.push(`skills ${source.skills.join(', ')}`);
    for (const s of e.allocation || []) lines.push(`${new Date(s.start).toISOString()} – ${new Date(s.end).toISOString()} · share ${s.share}`);
  } else {
    lines.push(`${e.tokens || 0} tokens · unpriced ${((e.unpriced_share || 0) * 100).toFixed(1)}%`);
    for (const [model, value] of Object.entries(e.models || {})) lines.push(`${model}: ${typeof value === 'number' ? money(value) : money(value.amount)} (list-price eq.)`);
  }
  const wrapped = lines.flatMap(line => wrap(line, 100, '    · ').split('\n'));
  return [...wrapped.slice(0, 5), ...(wrapped.length > 5 ? [`    · +${wrapped.length - 5} more evidence lines; spotcheck for allocations`] : [])].join('\n');
}
export function renderMarkdown({ config, date, entries, derived, warnings = [] }) {
  const t = totals(entries), state = dayStatus(entries), lines = [wrap(`# Timesheet · ${markdown(config.client.name)} · ${day(date)}`), ''];
  if (!entries.length || entries.every(e => e.status === 'discarded' || e.billable === false)) {
    lines.push('No billable activity found in local Claude Code sessions.', wrap(`Worked in a cloud session? Run: add --date ${date} --matter <m> --hours <h>`), 'Include --narrative and --reason.');
  } else {
    const approved = entries.map(e => e.approved_at).filter(Boolean).sort().at(-1);
    lines.push(wrap(`**${state}**${state === 'APPROVED' && approved ? ` ${approved}` : ''} · ${hours(t.hours)} · ${t.fees} time + ${money(t.ai)} AI (list-price eq.)`),
      wrap(`${active(entries).filter(e => e.status !== 'approved').length} entries awaiting review · Rate ${money(config.rate.hourly, config.rate.currency)}/h`),
      wrap(`${config.increment_hours}h, rounded ${config.rounding} per ${config.rounding_scope} · tz ${config.timezone}`), '',
      '| Status | Matter | Raw | Hours | Amount |', '|---|---|---:|---:|---:|');
    for (const e of entries) lines.push(`| ${short(status(e), 14)} | ${markdown(short(e.matter || 'AI', 18))} | ${e.type === 'time' ? raw(e.raw_minutes) : '—'} | ${e.type === 'time' ? hours(e.hours) : '—'} | ${money(amount(e), e.currency)} |`);
    lines.push('');
    for (const e of entries) {
      lines.push(wrap(`### ${markdown(e.entry)}`), wrap(markdown(e.narrative), 72));
      if (e.reason) lines.push(wrap(`Revision ${e.revision}: ${markdown(e.reason)}`, 72));
      lines.push('');
    }
    lines.push(wrap(`Derivation rounding: ${Math.round(t.rounding)}m. Saved raw: ${raw(t.raw)}; reviewed total: ${hours(t.hours)}.`),
      wrap(`Agent-only time included: ${raw(sum(active(entries), 'agent_only_minutes'))}. Human-cadence estimate: ${derived ? raw(derived.human_cadence_minutes) : 'run review for current estimate'}.`));
  }
  for (const warning of warnings) lines.push(wrap(`! ${markdown(warning)}`));
  lines.push('', `Review: \`npm run timesheet -- review ${date}\``);
  return lines.join('\n') + '\n';
}
export function renderReview({ config, date, entries, canary, derived, warnings = [], quarantine = false }) {
  if (!entries.length) return `No drafts for ${date}. Run: draft ${date}\n`;
  const t = totals(entries), lines = [wrap(`${config.client.name} · ${day(date)} · ${dayStatus(entries)} ${hours(t.hours)} · ${t.fees} + ${money(t.ai)} AI (list-price eq.)`), ''];
  for (const e of entries) {
    lines.push(wrap(`${status(e)} · ${e.entry}`, 100, '  '));
    lines.push(wrap(e.type === 'time'
      ? `${hours(e.hours)} · raw ${raw(e.raw_minutes)} · agent-only ${raw(e.agent_only_minutes)} · source ${e.matter_source || 'manual'}${e.billable === false ? ' · NONBILLABLE' : ''}`
      : `${money(e.amount, e.currency)} (list-price eq.) · unpriced ${((e.unpriced_share || 0) * 100).toFixed(1)}%`, 100, '    '));
    lines.push(wrap(e.narrative, 72, '    '), evidence(e));
    if (e.reason) lines.push(wrap(`Reason: ${e.reason}`, 72, '    '));
    if (e.unpriced_share > 0) lines.push(wrap(`✗ ${e.entry}: unpriced models ${e.unpriced_models?.join(', ') || 'unknown'}. Approve will refuse; source a price or discard.`));
    lines.push('');
  }
  lines.push(wrap(`Day totals · block model ${raw(derived?.block_minutes ?? t.raw)} · human cadence ${derived ? raw(derived.human_cadence_minutes) : 'unavailable'} · rounding ${Math.round(t.rounding)}m`));
  if (derived) lines.push(`Overlap · ${raw(derived.internal_minutes)} internal excluded`);
  lines.push(wrap(`${canary?.pass ? '✓' : '✗'} Format canary ${((canary?.share || 0) * 100).toFixed(1)}% unknown/quarantined${canary?.pass ? '' : '; approval blocked. Run verify; see transcript-format.md.'}`));
  if (canary?.quarantine) lines.push(`! Quarantined ${canary.quarantine} ${canary.quarantine === 1 ? 'line' : 'lines'} · details: review --quarantine`);
  if (quarantine) {
    lines.push('Quarantine metadata only (no prompt text):');
    for (const [envelope, count] of Object.entries(canary?.envelopes || {})) lines.push(wrap(`  ${envelope}: ${count}`));
    for (const version of canary?.untested_versions || []) lines.push(`  Untested version: ${version}`);
  }
  for (const warning of warnings) lines.push(wrap(`! ${warning}`));
  lines.push('', wrap(`Next: approve ${date} · edit <id> --hours 2.25 --reason "…" · discard <id> --reason "…"`));
  return lines.join('\n') + '\n';
}
export function renderToday(client, date, entries) {
  const rows = active(entries).filter(e => e.date === date);
  if (!rows.length) return '';
  const t = totals(rows);
  return wrap(`Today (${day(date)}) · ${client} ${hours(t.hours)} ${dayStatus(rows).toLowerCase()} so far · ${rows.filter(e => e.type === 'time').map(e => `${e.matter} ${hours(e.hours)}`).join(', ')} · AI ${money(t.ai)} (list-price eq.)`) + '\n';
}
export function renderNudge(client, today, entries, canary) {
  let message;
  if (!canary) return '';
  if (!canary.pass) message = `oc-time · ${client}: ✗ transcript format check failing, run verify`;
  else {
    const pending = active(entries).filter(e => e.status !== 'approved' && e.date < today);
    const dates = [...new Set(pending.map(e => e.date))].sort();
    if (dates.length) message = `oc-time · ${client}: ${dates.length} ${dates.length === 1 ? 'day' : 'days'} awaiting approval (${dates.slice(0, 3).map(d => d.slice(5)).join(', ')}${dates.length > 3 ? ', …' : ''}, ${hours(totals(pending).hours)}) · review ${dates[0]}`;
    else {
      const current = active(entries).filter(e => e.date === today && e.status !== 'approved');
      if (current.length) message = `oc-time · ${client}: ${hours(totals(current).hours)} draft today`;
    }
  }
  return message ? JSON.stringify({ systemMessage: clean(message) }) + '\n' : '';
}
const csvCell = value => {
  let s = clean(value);
  // Spreadsheet formula injection is possible even in a quoted CSV cell.
  if (/^[=+@-]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};
export function renderCsv(entries) {
  const header = 'date,client,matter,type,hours,rate,amount,currency,narrative,entry_id,revision,raw_minutes,label';
  const rows = entries.filter(e => e.status === 'approved').map(e => [e.date, e.client, e.matter || 'AI', e.type,
    e.type === 'time' ? e.hours.toFixed(2) : '', e.type === 'time' ? e.rate.toFixed(2) : '', amount(e).toFixed(2),
    e.currency || 'USD', e.narrative, e.entry, e.revision, e.raw_minutes ?? '', e.type === 'disbursement' ? 'list-price equivalent' : ''].map(csvCell).join(','));
  return [header, ...rows].join('\n') + '\n';
}
