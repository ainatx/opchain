import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { writeFileSync, readFileSync, mkdirSync, utimesSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildBlocks, dayBounds, localDate, humanCadence } from '../../scripts/lib/time/blocks.mjs';
import { allocate } from '../../scripts/lib/time/allocate.mjs';
import { resolveMatter, limitMatters, reflogBranch, checkpointRefs } from '../../scripts/lib/time/matters.mjs';
import { priceFamily, priceUsage, messageUsage, usageTerms, PRICING } from '../../scripts/lib/time/cost.mjs';
import { roundMatters } from '../../scripts/lib/time/rounding.mjs';
import { narrative } from '../../scripts/lib/time/narrative.mjs';
import { gitActivity, summarizeActivity, prMetadata } from '../../scripts/lib/time/activity.mjs';
import { hash, draftHash, foldLedger, readLedger, transactLedger, verifyAllocations, withLedgerLock, validateEntry } from '../../scripts/lib/time/ledger.mjs';
import { loadContext, deriveDay, draftDay, verify } from '../../scripts/lib/time/derive.mjs';
import { parseConfig } from '../../scripts/lib/time/config.mjs';
import { timePaths, writePrivate } from '../../scripts/lib/time/paths.mjs';
import { addRepo } from '../../scripts/lib/time/registry.mjs';
import { collect } from '../../scripts/lib/time/transcripts.mjs';
import { fixture, user, assistant, CANARY } from './fixtures/builder.mjs';
const cli = fileURLToPath(new URL('../../scripts/timesheet.mjs', import.meta.url));
const fixtures = [];
const make = (git = false) => { const f = fixture({ git }); fixtures.push(f); return f; };
beforeEach(() => {
  const f = make();
  for (const key of ['HOME', 'OPCHAIN_TIME_HOME', 'GIT_CONFIG_GLOBAL', 'GIT_CONFIG_NOSYSTEM']) vi.stubEnv(key, f.env[key]);
});
afterEach(() => { vi.unstubAllEnvs(); fixtures.splice(0).forEach(f => f.cleanup()); });
const yaml = "client: { id: acme, name: Acme }\nrate: { hourly: 175, currency: USD }\nmatters: { ticket: '(ACME-\\d+)' }\n";
const config = (extra = {}) => ({ ...parseConfig(yaml).config, ...extra });
const ts = m => new Date(Date.UTC(2026, 8, 26, 10, m)).toISOString();
const event = (minute, extra = {}) => ({ ts: ts(minute), uuid: `e-${minute}`, session: 'a', parent_session: null,
  repo: '/a', branch: 'feature/ACME-1', type: 'assistant', class: 'assistant', ...extra });
const human = (minute, extra = {}) => event(minute, { type: 'user', class: 'human_prompt', ...extra });
const minutes = rows => rows.reduce((n, r) => n + (r.end - r.start) / 60000, 0);
const noActivity = { readRefs: () => [], readActivity: () => [] };
async function setup() {
  const f = make(true), paths = timePaths(f.env);
  addRepo(paths, f.repo, 'acme'); writePrivate(join(f.root, 'acme', 'billing.yaml'), yaml);
  f.file('session-a.jsonl', [user('h', 0, CANARY, { gitBranch: 'feature/ACME-1' }), assistant('a', 300, { gitBranch: 'feature/ACME-1' }),
    user('h2', 600, CANARY, { gitBranch: 'feature/ACME-1' }), assistant('b', 900, { gitBranch: 'feature/ACME-1' })]);
  await collect({ env: f.env });
  return { f, context: loadContext(f.env, f.repo), ledger: join(f.root, 'acme', 'ledger.jsonl') };
}
const draft = (id = 'acme-2026-09-26-general-t') => {
  const e = { entry: id, date: '2026-09-26', client: 'acme', type: 'time', matter: 'general', hours: 0.25, rate: 175, narrative: 'Work on general.' };
  return { ...e, event: 'entry.drafted', revision: 1, derivation: draftHash(e), at: ts(0) };
};
function chain(events) {
  let prev = null;
  return events.map(e => { const row = { v: 1, at: ts(0), ...e, prev }; row.hash = hash(row); prev = row.hash; return row; });
}

describe('blocks #2 #7', () => {
  it('excludes autonomous work, metadata stamps and zero-length blocks', () => {
    expect(buildBlocks([event(0), event(5)], config())).toEqual([]);
    expect(buildBlocks([human(0)], config())).toEqual([]);
    const rows = buildBlocks([human(0), event(5), event(10, { type: 'attachment' }), event(12, { type: 'system' }), event(14, { type: 'pr-link' })], config());
    expect(minutes(rows)).toBe(5);
  });
  it('caps the tail at 30, supports null and splits 11-minute idle gaps', () => {
    const events = [human(0), ...[5, 10, 15, 20, 25, 30, 35, 40].map(n => event(n))];
    const blocks = buildBlocks(events, config());
    expect(minutes(blocks)).toBe(30);
    expect(allocate(blocks).slices.reduce((n, s) => n + s.agent_only_minutes, 0)).toBe(30);
    expect(minutes(buildBlocks(events, config({ agent_tail_cap_minutes: null })))).toBe(40);
    expect(minutes(buildBlocks([human(0), event(11)], config()))).toBe(0);
    expect(minutes(buildBlocks([human(0), event(5), human(20), event(25)], config()))).toBe(10);
  });
  it('uses subagent continuity without human credit, switches cwd per parent event', () => {
    const blocks = buildBlocks([human(0), event(5, { parent_session: 'a', session: 'sub' }), event(10, { parent_session: 'a', session: 'sub' }), human(15, { repo: '/b' }), event(20, { repo: '/b' })], config());
    expect(minutes(blocks)).toBe(20); expect(blocks.at(-1).event.repo).toBe('/b');
    expect(buildBlocks([human(0, { parent_session: 'a', session: 'sub' }), event(5)], config())).toEqual([]);
    expect(minutes(humanCadence([human(0), human(5), human(20)], config()))).toBe(5);
  });
  it('splits at local midnight and handles spring/fall DST elapsed time', () => {
    const c = config({ timezone: 'America/Chicago', idle_minutes: 180 });
    const b = buildBlocks([human(0, { ts: '2026-09-27T04:55:00Z' }), event(1, { ts: '2026-09-27T05:05:00Z' })], c);
    expect(b.map(r => [r.date, (r.end - r.start) / 60000])).toEqual([['2026-09-26', 5], ['2026-09-27', 5]]);
    expect(dayBounds('2026-03-08', c.timezone).end - dayBounds('2026-03-08', c.timezone).start).toBe(23 * 3600000);
    expect(dayBounds('2026-11-01', c.timezone).end - dayBounds('2026-11-01', c.timezone).start).toBe(25 * 3600000);
    expect(minutes(buildBlocks([human(0, { ts: '2026-03-08T07:55:00Z' }), event(1, { ts: '2026-03-08T08:05:00Z' })], c))).toBe(10);
    expect(localDate('2026-09-26T01:00:00Z', c.timezone)).toBe('2026-09-25');
    expect(() => dayBounds('bad')).toThrow(); expect(() => dayBounds('2026-02-30')).toThrow();
  });
});

describe('allocation #8 #9', () => {
  it('internal competes globally and last-touch changes at human boundaries', () => {
    const blocks = buildBlocks([human(0), event(5), human(10), event(15), human(5, { session: 'b', repo: 'internal' }), event(15, { session: 'b', repo: 'internal' })], config());
    const last = allocate(blocks), split = allocate(blocks, 'split-even');
    expect(last.union_minutes).toBe(15);
    expect(last.slices.filter(s => s.event.repo === 'internal').reduce((n, s) => n + s.minutes, 0)).toBe(5);
    expect(split.slices.filter(s => s.session === 'a').reduce((n, s) => n + s.minutes, 0)).toBe(10);
    expect(() => allocate([], 'bad')).toThrow(); expect(() => allocate([{ start: 1, end: 0 }])).toThrow();
    expect(allocate([{ start: 0, end: 0 }]).slices).toEqual([]);
  });
  it('200 seeded multi-session days satisfy union and split-share invariants', () => {
    let seed = 142857;
    const rand = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);
    for (let day = 0; day < 200; day++) {
      const blocks = Array.from({ length: 20 }, (_, i) => {
        const start = Math.floor(rand() * 1300) * 60000, end = start + Math.floor(rand() * 120) * 60000;
        return { session: `s${i % 7}`, start, end, last_touch: start, agent_only_start: start };
      });
      for (const policy of ['last-touch', 'split-even']) {
        const result = allocate(blocks, policy);
        const occupied = new Set(blocks.flatMap(b => Array.from({ length: (b.end - b.start) / 60000 }, (_, i) => b.start / 60000 + i)));
        expect(result.allocated_minutes).toBeLessThanOrEqual(occupied.size + 1e-7);
        expect(result.union_minutes).toBe(occupied.size);
        expect(verifyAllocations([{ ...draft(), allocation: result.slices.map(s => ({ start: s.start, end: s.end, share: s.share })), raw_minutes: result.allocated_minutes }])).toBe(true);
      }
    }
  });
});

describe('matters #10', () => {
  it('uses active source/child then PR then branch then default with HEAD fallback', () => {
    const e = human(5), c = config(), prs = [{ session: 'a', ts: ts(0), title: 'Fix ACME-2', branch: '' }];
    const refs = [{ role: 'source', identifier: 'ACME-3', active_from: ts(0), active_to: ts(10) }];
    expect(resolveMatter(e, c, { refs, prs }).matter).toBe('ACME-3');
    expect(resolveMatter(e, c, { refs: [{ ...refs[0], active_to: ts(4) }], prs }).matter).toBe('ACME-2');
    expect(resolveMatter(e, c, { refs: [{ ...refs[0], active_from: undefined }] }).matter).toBe('ACME-1');
    expect(resolveMatter({ ...e, branch: 'HEAD' }, c, { branchAt: () => 'fix/ACME-4' }).matter).toBe('ACME-4');
    expect(resolveMatter({ ...e, branch: 'HEAD' }, c, { branchAt: () => null }).matter).toBe('general');
    expect(resolveMatter(e, config({ matters: { ...c.matters, rules: [{ branch: '^feature', billable: false }] } })).billable).toBe(false);
    expect(resolveMatter(e, config({ matters: { ...c.matters, ticket: '', rules: [{ branch: '^feature', matter: 'deps' }] } })).matter).toBe('deps');
  });
  it('merges 8 matters to six, preserving billable flags and smallest totals', () => {
    const rows = Array.from({ length: 8 }, (_, i) => ({ matter: `M${i}`, raw_minutes: i + 1, billable: i !== 0 }));
    const limited = limitMatters(rows, { max_per_day: 6, default: 'general' });
    expect(new Set(limited.map(r => r.matter)).size).toBe(6);
    expect(limited.slice(0, 3).map(r => r.matter)).toEqual(['general', 'general', 'general']);
    expect(limited[0].billable).toBe(false);
    expect(limitMatters(rows, { max_per_day: 9, default: 'general' })).toEqual(rows);
  });
  it('reads local checkpoint activation and resolves historical reflog or missing repo', () => {
    const f = make(true); f.command('checkout', '-qb', 'fix/ACME-9');
    expect(reflogBranch(f.repo, new Date(Date.now() + 1000).toISOString())).toBe('fix/ACME-9');
    expect(reflogBranch(f.repo, '2000-01-01')).toBe(null); expect(reflogBranch('/missing', ts(0))).toBe(null);
    expect(checkpointRefs(f.repo)).toEqual([]);
    mkdirSync(join(f.repo, '.checkpoints'));
    writeFileSync(join(f.repo, '.checkpoints', 'a.checkpoint.json'), JSON.stringify({ pm_refs: [{ role: 'child', id: 'ACME-9', active_from: ts(0) }] }));
    writeFileSync(join(f.repo, '.checkpoints', 'bad.checkpoint.json'), '{bad');
    writeFileSync(join(f.repo, '.checkpoints', 'none.checkpoint.json'), '{}');
    expect(checkpointRefs(f.repo)).toHaveLength(1);
  });
});

describe('pricing #6', () => {
  it('sources all seven families and uses model-specific cache multipliers', () => {
    expect(Object.keys(PRICING)).toHaveLength(7);
    for (const [family, p] of Object.entries(PRICING)) {
      const cost = priceUsage([{ model: family, usage: { input_tokens: 1e6, output_tokens: 1e6, cache_read_input_tokens: 1e6,
        cache_creation: { ephemeral_5m_input_tokens: 1e6, ephemeral_1h_input_tokens: 1e6 } } }]);
      expect(cost.amount).toBeCloseTo(p.input * (1 + p.cache_read_mult + 1.25 + 2) + p.output);
      expect(cost.unpriced_share).toBe(0); expect(p.source).toMatch(/^https:\/\/platform.claude.com/); expect(p.verified_on).toBe('2026-09-27');
    }
    expect(PRICING['claude-fable-5-1'].cache_read_mult).toBe(.025); expect(PRICING['claude-opus-5-5'].cache_read_mult).toBe(.05);
    expect(priceFamily('claude-haiku-4-5-20251001')).toBe('claude-haiku-4-5'); expect(priceFamily('claude-opus-5-9')).toBe(null);
  });
  it('takes global field maxima, skips synthetic, avoids cache aggregate double-counts', () => {
    const a = event(0, { message: { id: 'same' }, model: 'claude-opus-5', usage: { input_tokens: 10, output_tokens: 1 } });
    const result = messageUsage([a, { ...a, session: 'fork', usage: { input_tokens: 1, output_tokens: 20 } }, event(2, { model: '<synthetic>', message: { id: 'skip' } }), event(3)]);
    expect(result).toHaveLength(1); expect(result[0].usage).toEqual({ input_tokens: 10, output_tokens: 20 });
    expect(usageTerms({ cache_creation_input_tokens: 100, cache_creation: { ephemeral_1h_input_tokens: 30 } })).toEqual([0, 0, 0, 70, 30]);
    expect(usageTerms({})).toEqual([0, 0, 0, 0, 0]);
    expect(priceUsage([{ model: '<synthetic>' }]).amount).toBe(0);
    expect(priceUsage([{ model: 'unknown', usage: { input_tokens: 1 } }]).unpriced_share).toBe(1);
    expect(priceUsage([{}]).unpriced_share).toBe(1);
    expect(priceUsage(messageUsage([a, { ...a, model: 'different' }])).unpriced_share).toBe(1);
    expect(() => priceUsage([a], { 'claude-opus-5': { input: 1 } })).toThrow();
  });
});

describe('rounding #16 and metadata narratives #17', () => {
  it('rounds per scope and distributes integer units by largest remainder', () => {
    const rows = [{ matter: 'a', raw_minutes: 61 }, { matter: 'b', raw_minutes: 23 }, { matter: 'c', raw_minutes: 118 }];
    const client = roundMatters(rows, config());
    expect(client.map(r => r.hours)).toEqual([1, .5, 2]); expect(client.reduce((n, r) => n + r.rounding_added_minutes, 0)).toBe(8);
    expect(roundMatters(rows, config({ rounding_scope: 'matter-day' })).map(r => r.hours)).toEqual([1.25, .5, 2]);
    expect(roundMatters([{ matter: 'a', raw_minutes: 16 }], config({ rounding: 'nearest' }))[0].hours).toBe(.25);
    expect(roundMatters([{ matter: 'a', raw_minutes: 1 }, { matter: 'b', raw_minutes: 1 }], config()).every(r => !r.billable)).toBe(true);
    expect(roundMatters([{ matter: 'a', raw_minutes: 1 }, { matter: 'b', raw_minutes: 4 }], config()).reduce((n, r) => n + r.hours, 0)).toBe(.25);
    expect(roundMatters([{ matter: 'a', raw_minutes: 10, billable: false }], config())[0].hours).toBe(0);
    expect(roundMatters([], config())).toEqual([]);
  });
  it('keeps only metadata and bounds deterministic narratives', () => {
    const a = summarizeActivity([event(0, { skill: 'oc-build', pr: 12 }), event(1, { skill: 'bad' })], [{ hash: 'x', prs: [3], files: ['a'] }, { hash: 'x', prs: [3], files: ['a'] }]);
    expect(a).toEqual({ sessions: 1, commits: 1, prs: [3, 12], skills: ['oc-build'], files: 1 });
    expect(narrative('general', summarizeActivity([]))).toBe('Work on general.');
    expect(narrative('ACME-1', a)).toBe(narrative('ACME-1', a));
    expect(narrative('x'.repeat(400), a)).toHaveLength(240);
    expect(narrative('x', { ...a, commits: 2 })).toContain('2 commits');
    expect(gitActivity('/missing', 'branch', 0, 1)).toEqual([]);
  });
  it('collects only own commits on the named branch in the time window', () => {
    const f = make(true); f.command('checkout', '-qb', 'test-activity');
    writeFileSync(join(f.repo, 'test.txt'), 'fixture'); f.command('add', 'test.txt');
    f.command('-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'change #42');
    const commits = gitActivity(f.repo, 'test-activity', Date.now() - 60000, Date.now() + 1000);
    expect(commits.some(c => c.prs.includes(42) && c.files.includes('test.txt'))).toBe(true);
    expect(gitActivity(f.repo, 'HEAD', 0, Date.now())).toEqual([]);
    f.command('config', 'user.email', 'other@example.invalid');
    expect(gitActivity(f.repo, 'test-activity', 0, Date.now() + 1000)).toEqual([]);
  });
});


describe('ledger #14 #18', () => {
  it('enforces revisions, reasoned edits, immutable approval and reapproval after amend', () => {
    const d = draft();
    const edit = { event: 'entry.edited', entry: d.entry, revision: 2, changes: { hours: .5 }, reason: 'Reading' };
    const approval = { event: 'entry.approved', entry: d.entry, revision: 2 };
    const amend = { event: 'entry.amended', entry: d.entry, revision: 3, changes: { hours: .75 }, reason: 'Correction' };
    const rows = chain([d, edit, approval, amend]);
    expect(foldLedger(rows).get(d.entry)).toMatchObject({ status: 'amended', hours: .75, revision: 3 });
    expect(foldLedger(chain([d, edit, approval, amend, { ...approval, revision: 3 }])).get(d.entry).status).toBe('approved');
    expect(() => foldLedger(chain([d, edit, approval, { ...d, revision: 3 }]))).toThrow(/Protected/);
    expect(() => foldLedger(chain([d, { ...edit, reason: '' }]))).toThrow(/reason/);
    expect(() => foldLedger(chain([d, { ...edit, changes: { raw_minutes: 99 } }]))).toThrow();
    expect(() => foldLedger(chain([d, { ...edit, revision: 8 }]))).toThrow(/revision/);
    expect(() => foldLedger(chain([d, { ...approval, revision: 5 }]))).toThrow(/revision/);
    expect(() => foldLedger(chain([d, amend]))).toThrow(/amend/);
    expect(() => foldLedger(chain([edit]))).toThrow(/Unknown entry/);
    expect(() => foldLedger(chain([d, { entry: d.entry, event: 'oops' }]))).toThrow(/Unknown ledger/);
    const modified = chain([d]); modified[0].hours = 100;
    expect(() => foldLedger(modified)).toThrow(/hash chain/);
    expect(() => foldLedger(chain([{ ...d, derivation: 'sha256:bad' }]))).toThrow(/Derivation/);
    expect(() => foldLedger(chain([{ ...d, revision: 4 }]))).toThrow(/revision/);
    const manual = { ...d, event: 'entry.manual', reason: 'Cloud session' };
    expect(foldLedger(chain([manual])).get(d.entry).status).toBe('draft');
    expect(() => foldLedger(chain([{ ...manual, reason: '' }]))).toThrow(/reason/);
    const discard = { event: 'entry.discarded', entry: d.entry, revision: 1, reason: 'Personal' };
    expect(foldLedger(chain([d, discard])).get(d.entry).status).toBe('discarded');
    expect(() => foldLedger(chain([d, { ...discard, reason: '' }]))).toThrow(/discard/);
    expect(() => foldLedger(chain([d, { ...approval, revision: 1 }, discard]))).toThrow(/discard/);
    expect(() => foldLedger(chain([d, discard, { ...approval, revision: 1 }]))).toThrow();
  });
  it('blocks unpriced/nonbillable/canary approvals and rejects invalid proofs/fields', () => {
    for (const extra of [{ canary_pass: false }, { billable: false }, { type: 'disbursement', amount: 1, unpriced_share: .1 }]) {
      const d = { ...draft(), ...extra }; d.derivation = draftHash(d);
      expect(() => foldLedger(chain([d, { event: 'entry.approved', entry: d.entry, revision: 1 }]))).toThrow(/blocked/);
    }
    for (const extra of [{ client: '?' }, { hours: -1 }, { raw_minutes: -1 }, { type: 'disbursement', amount: -1 },
      { allocation: [{ start: 10, end: 1, share: 1 }] }, { raw_minutes: 4, allocation: [{ start: 0, end: 60000, share: 1 }] }]) {
      expect(() => validateEntry({ ...draft(), ...extra })).toThrow();
    }
    expect(() => verifyAllocations([{ ...draft(), raw_minutes: 1, allocation: [{ start: 0, end: 60000, share: 1 }] },
      { ...draft('acme-2026-09-26-other-t'), raw_minutes: 1, allocation: [{ start: 0, end: 60000, share: 1 }] }])).toThrow(/union/);
  });
  it('serializes 20 writers, breaks only stale dead PID locks and releases on exceptions', async () => {
    const f = make(), ledger = join(f.root, 'acme', 'ledger.jsonl');
    await Promise.all(Array.from({ length: 20 }, (_, i) => transactLedger(ledger, () => [draft(`acme-2026-09-26-${i}-t`)])));
    expect(readLedger(ledger)).toHaveLength(20); expect(foldLedger(readLedger(ledger)).size).toBe(20);
    expect(statSync(ledger).mode & 0o777).toBe(0o600);
    const lock = join(f.root, 'acme', 'ledger.lock');
    writeFileSync(lock, JSON.stringify({ pid: 2147483647 })); utimesSync(lock, new Date(0), new Date(0));
    await transactLedger(ledger, () => []); expect(existsSync(lock)).toBe(false);
    await expect(withLedgerLock(ledger, () => { throw new Error('failure'); })).rejects.toThrow('failure'); expect(existsSync(lock)).toBe(false);
    for (const content of [JSON.stringify({ pid: process.pid }), 'partial', JSON.stringify({ pid: -1 })]) {
      writeFileSync(lock, content); utimesSync(lock, new Date(0), new Date(0));
      await expect(withLedgerLock(ledger, () => {}, { timeout: 0 })).rejects.toThrow(/busy/);
    }
  });
  it('fails closed on malformed or partial append and validates before writing', async () => {
    const f = make(), path = join(f.home, 'ledger.jsonl');
    expect(readLedger(path)).toEqual([]);
    writeFileSync(path, '{bad}\n'); expect(() => readLedger(path)).toThrow(/Corrupt/);
    writeFileSync(path, '{}'); expect(() => readLedger(path)).toThrow(/Incomplete/);
    writeFileSync(path, '');
    await expect(transactLedger(path, () => [{ ...draft(), revision: 2 }])).rejects.toThrow();
    expect(readFileSync(path, 'utf8')).toBe('');
  });
});

describe('derive and verify golden flows', () => {
  it('golden day is deterministic, privacy-safe and verify passes then detects tampering', async () => {
    const { f, context, ledger } = await setup();
    const first = await draftDay(context, '2026-09-26', { ...noActivity, at: ts(60) });
    expect(first.appended).toBe(2); expect(first.block_minutes).toBe(15); expect(first.human_cadence_minutes).toBe(10);
    const bytes = readFileSync(ledger, 'utf8'); expect(bytes).not.toContain(CANARY);
    expect(first.entries.map(({ entry, type, hours, raw_minutes, agent_only_minutes, amount, unpriced_share }) =>
      Object.fromEntries(Object.entries({ entry, type, hours, raw_minutes, agent_only_minutes, amount, unpriced_share }).filter(([, v]) => v !== undefined))))
      .toEqual(JSON.parse(readFileSync(new URL('./fixtures/golden-day.json', import.meta.url), 'utf8')));
    expect((await draftDay(context, '2026-09-26', noActivity)).appended).toBe(0);
    expect(readFileSync(ledger, 'utf8')).toBe(bytes); expect(verify(context).pass).toBe(true);
    writeFileSync(ledger, bytes.replace('"hours":0.25', '"hours":7'));
    expect(verify(context).pass).toBe(false);
    writeFileSync(ledger, bytes);
    writeFileSync(join(f.repo, 'billing.yaml'), 'private'); f.command('add', 'billing.yaml');
    expect(verify(context).pass).toBe(false);
  });
  it('preserves approved day on drift and refuses replacing human edits', async () => {
    const { context, ledger } = await setup(); await draftDay(context, '2026-09-26', noActivity);
    const d = readLedger(ledger)[0];
    await transactLedger(ledger, () => [{ event: 'entry.approved', entry: d.entry, revision: 1 }]);
    const bytes = readFileSync(ledger, 'utf8'); context.config.rate.hourly = 200;
    const result = await draftDay(context, '2026-09-26', noActivity);
    expect(result.warnings.join(' ')).toContain('drift'); expect(result.appended).toBe(0); expect(readFileSync(ledger, 'utf8')).toBe(bytes);
    context.events = []; expect((await draftDay(context, '2026-09-26', noActivity)).warnings.join(' ')).toContain('drift');
  });
  it('replaces drafts and retires removed matters without rewriting history', async () => {
    const { context, ledger } = await setup(); await draftDay(context, '2026-09-26', noActivity);
    context.config.rate.hourly = 200;
    expect((await draftDay(context, '2026-09-26', noActivity)).appended).toBe(2);
    context.events = [];
    expect((await draftDay(context, '2026-09-26', noActivity)).appended).toBe(2);
    expect([...foldLedger(readLedger(ledger)).values()].every(e => e.status === 'discarded')).toBe(true);
    expect((await draftDay(context, '2026-09-26', noActivity)).appended).toBe(0);
  });
  it('handles none/markup, missing models, billable rules and multi-matter aggregation', async () => {
    const { context } = await setup();
    context.config.ai_cost.mode = 'none'; expect(deriveDay(context, '2026-09-26', noActivity).entries).toHaveLength(1);
    context.config.ai_cost.mode = 'markup'; context.config.ai_cost.markup_pct = 25;
    context.events.find(e => e.message).usage = { input_tokens: 1e6 };
    expect(deriveDay(context, '2026-09-26', noActivity).entries.at(-1).amount).toBe(6.25);
    context.events.find(e => e.message).model = 'unknown';
    expect(deriveDay(context, '2026-09-26', noActivity).cost.unpriced_share).toBeGreaterThan(0);
    context.config.matters.rules = [{ branch: '.*', billable: false }];
    expect(deriveDay(context, '2026-09-26', noActivity).entries[0].hours).toBe(0);
  });
  it('concurrent duplicate draft calls append one generation', async () => {
    const { context, ledger } = await setup();
    await Promise.all(Array.from({ length: 8 }, () => draftDay(context, '2026-09-26', noActivity)));
    expect(readLedger(ledger)).toHaveLength(2);
  });
  it('fails closed for unregistered/invalid context and inconsistent global policies', async () => {
    const f = make(true); expect(() => loadContext(f.env, f.repo)).toThrow(/registered/);
    const { f: g, context } = await setup();
    writePrivate(join(g.root, 'other', 'billing.yaml'), yaml.replaceAll('acme', 'other') + 'overlap: split-even\n');
    writePrivate(join(g.root, 'registry.json'), JSON.stringify({ [g.repo]: 'acme', [join(g.home, 'other')]: 'other' }));
    expect(() => loadContext(g.env, g.repo)).toThrow(/agree/);
    writePrivate(join(g.root, 'other', 'billing.yaml'), yaml); expect(() => loadContext(g.env, g.repo)).toThrow(/ids/);
    context.canary.pass = false; expect(verify(context).pass).toBe(false);
  });
});

it('PR metadata adapter is bounded, optional and never needs prompt text', () => {
  expect(prMetadata('/missing', 1)).toEqual({}); expect(prMetadata('/missing', -1)).toEqual({});
  expect(prMetadata('/unused', 1, { run: () => JSON.stringify({ headRefName: 'fix/ACME-9', title: 'ACME-9 title' }) })).toEqual({ branch: 'fix/ACME-9', title: 'ACME-9 title' });
  expect(prMetadata('/unused', 1, { run: () => '{}' })).toEqual({ branch: null, title: null });
});
it('matter metadata splits only existing time and PR title is never persisted', async () => {
  const { context, ledger } = await setup();
  context.events.push({ ...event(7), repo: context.events[0].repo, type: 'pr-link', pr: 7, session: 'session-a' });
  context.events.sort((a, b) => a.ts.localeCompare(b.ts));
  const result = await draftDay(context, '2026-09-26', { ...noActivity,
    readRefs: () => [{ role: 'source', identifier: 'ACME-99', active_from: ts(0), active_to: ts(3) }],
    readPr: () => ({ branch: 'fix/ACME-88', title: CANARY }) });
  const time = result.entries.filter(e => e.type === 'time');
  expect(time.map(e => [e.matter, e.raw_minutes])).toEqual([['ACME-1', 4], ['ACME-88', 8], ['ACME-99', 3]]);
  expect(result.block_minutes).toBe(15); expect(readFileSync(ledger, 'utf8')).not.toContain(CANARY);
});
it('retired drafts can reappear while explicit user discards stay discarded', async () => {
  const { context, ledger } = await setup(), events = context.events;
  await draftDay(context, '2026-09-26', noActivity);
  context.events = []; await draftDay(context, '2026-09-26', noActivity);
  context.events = events;
  expect((await draftDay(context, '2026-09-26', noActivity)).appended).toBe(2);
  const d = [...foldLedger(readLedger(ledger)).values()][0];
  await transactLedger(ledger, () => [{ event: 'entry.discarded', entry: d.entry, revision: d.revision, reason: 'Personal' }]);
  context.config.rate.hourly = 190;
  await draftDay(context, '2026-09-26', noActivity);
  expect(foldLedger(readLedger(ledger)).get(d.entry).status).toBe('discarded');
});
it('same matter can hold both excluded and subminimum raw time without duplicate IDs', async () => {
  const { context } = await setup();
  context.config.min_minutes = 50;
  context.config.matters.rules = [{ branch: 'feature', matter: 'general' }, { branch: 'chore', matter: 'general', billable: false }];
  context.events[2].branch = 'chore'; context.events[3].branch = 'chore';
  const rows = deriveDay(context, '2026-09-26', noActivity).entries;
  expect(new Set(rows.map(r => r.entry)).size).toBe(rows.length);
});
it('full explicit golden ledger matches collected fixture derivation byte for byte', async () => {
  const f = make(true), paths = timePaths(f.env);
  addRepo(paths, f.repo, 'acme');
  writePrivate(join(f.root, 'acme', 'billing.yaml'), 'client: { id: acme, name: Acme }\nrate: { hourly: 175, currency: USD }\n');
  f.file('session-a.jsonl', [user('human'), assistant('agent', 300)]);
  await collect({ env: f.env });
  const context = loadContext(f.env, f.repo);
  // Canonical fixture path makes hashes portable while exercising real collection.
  context.events = context.events.map(e => ({ ...e, repo: '/fixture/repo', worktree: '/fixture/repo' }));
  context.resolver = () => ({ repo: '/fixture/repo', client: 'acme' });
  await draftDay(context, '2026-09-26', { ...noActivity, at: '2026-09-26T11:00:00.000Z' });
  expect(readFileSync(join(f.root, 'acme', 'ledger.jsonl'), 'utf8')).toBe(readFileSync(new URL('./fixtures/golden-ledger.jsonl', import.meta.url), 'utf8'));
  expect(verify(context).pass).toBe(true);
});
it('commented billing example parses and includes the documented defaults', () => {
  const example = parseConfig(readFileSync(new URL('../../docs/plans/time-tracking/billing.example.yaml', import.meta.url), 'utf8'));
  expect(example.warnings).toEqual([]); expect(example.config).toMatchObject({ timezone: 'America/Chicago', overlap: 'last-touch', agent_tail_cap_minutes: 30 });
});
it('context snapshot excludes collector races and rejects malformed cache', async () => {
  const { f } = await setup(), lock = join(f.root, 'collect.lock');
  writeFileSync(lock, ''); expect(() => loadContext(f.env, f.repo)).toThrow(/busy/);
  const { unlinkSync } = await import('node:fs'); unlinkSync(lock);
  writeFileSync(join(f.root, 'events', '2026-09.jsonl'), '{bad}\n');
  expect(() => loadContext(f.env, f.repo)).toThrow(/cache/); expect(existsSync(lock)).toBe(false);
});
it('cost maxima are global before client/date filtering and HEAD resolves in the original worktree', async () => {
  const { context } = await setup();
  const source = context.events.find(e => e.message);
  context.events.push({ ...source, uuid: 'fork', session: 'fork', ts: '2026-09-27T10:00:00Z', repo: '/unregistered', usage: { output_tokens: 1e6 } });
  expect(deriveDay(context, '2026-09-26', noActivity).cost.amount).toBeGreaterThan(25);
  expect(deriveDay(context, '2026-09-27', noActivity).cost.tokens).toBe(0);
  let path;
  const matter = resolveMatter(human(0, { branch: 'HEAD', worktree: '/original-worktree' }), config(), { branchAt: p => { path = p; return 'fix/ACME-42'; } });
  expect(path).toBe('/original-worktree'); expect(matter.matter).toBe('ACME-42');
});
it('queries PR metadata only for active sessions and reuses it across a replay', async () => {
  const { context } = await setup(), repo = context.events[0].repo;
  context.events.push(event(1, { session: 'session-a', repo, type: 'pr-link', pr: 1 }), event(2, { session: 'unrelated', repo, type: 'pr-link', pr: 2 }));
  let reads = 0;
  const options = { ...noActivity, readPr: () => { reads++; return { branch: 'fix/ACME-4' }; } };
  deriveDay(context, '2026-09-26', options); deriveDay(context, '2026-09-26', options);
  expect(reads).toBe(1);
});
