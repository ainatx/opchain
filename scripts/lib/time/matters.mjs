import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function reflogBranch(repo, ts) {
  try {
    const output = execFileSync('git', ['-C', repo, 'reflog', 'show', '--date=iso-strict', '--format=%gD%x09%gs', 'HEAD'],
      { encoding: 'utf8', timeout: 1000, stdio: ['ignore', 'pipe', 'ignore'] });
    for (const line of output.split('\n')) {
      const match = line.match(/HEAD@\{([^}]+)\}\tcheckout: moving from \S+ to (.+)$/);
      if (match && Date.parse(match[1]) <= Date.parse(ts) && !/^(HEAD|[a-f0-9]{7,40})$/.test(match[2])) return match[2];
    }
  } catch { /* Missing/deleted repos have no historical branch evidence. */ }
  return null;
}
export function checkpointRefs(repo) {
  try {
    return readdirSync(join(repo, '.checkpoints')).filter(n => n.endsWith('.checkpoint.json')).sort().flatMap(name => {
      try {
        const data = JSON.parse(readFileSync(join(repo, '.checkpoints', name), 'utf8'));
        return Array.isArray(data.pm_refs) ? data.pm_refs : [];
      } catch { return []; }
    });
  } catch { return []; }
}
export function resolveMatter(event, config, { refs = [], prs = [], branchAt = reflogBranch } = {}) {
  const rules = config.matters, ticket = value => {
    if (!rules.ticket || typeof value !== 'string') return null;
    const match = value.slice(0, 512).match(new RegExp(rules.ticket));
    return match?.[1] || match?.[0] || null;
  };
  const ts = Date.parse(event.ts);
  for (const ref of refs) {
    // Never infer a historical ticket from an undated present-day checkpoint.
    if (!['source', 'child'].includes(ref.role) || !Number.isFinite(Date.parse(ref.active_from)) || Date.parse(ref.active_from) > ts ||
      (ref.active_to && (!Number.isFinite(Date.parse(ref.active_to)) || Date.parse(ref.active_to) <= ts))) continue;
    const matter = ticket(ref.identifier || ref.id);
    if (matter) return { matter, matter_source: 'pm_refs', billable: true };
  }
  for (const pr of [...prs].filter(p => p.session === (event.parent_session || event.session) && p.ts <= event.ts).sort((a, b) => b.ts.localeCompare(a.ts))) {
    const matter = ticket(pr.branch) || ticket(pr.title);
    if (matter) return { matter, matter_source: 'pr-link', billable: true };
  }
  const branch = event.branch === 'HEAD' ? branchAt(event.worktree || event.repo, event.ts) : event.branch;
  for (const rule of rules.rules) if (typeof branch === 'string' && new RegExp(rule.branch).test(branch.slice(0, 256))) {
    return { matter: rule.matter || ticket(branch) || rules.default, matter_source: 'branch', billable: rule.billable !== false };
  }
  const matter = ticket(branch);
  return { matter: matter || rules.default, matter_source: matter ? 'branch' : 'default', billable: true };
}

export function limitMatters(rows, { max_per_day: max, default: fallback }) {
  const names = [...new Set(rows.map(r => r.matter))];
  if (names.length <= max) return rows;
  const totals = new Map(names.map(m => [m, rows.filter(r => r.matter === m).reduce((n, r) => n + r.raw_minutes, 0)]));
  const keep = new Set(names.filter(m => m !== fallback).sort((a, b) => totals.get(b) - totals.get(a) || a.localeCompare(b)).slice(0, max - 1));
  return rows.map(r => keep.has(r.matter) ? r : { ...r, matter: fallback, matter_source: 'max_per_day' });
}
