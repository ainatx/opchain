import { it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fixture, user, assistant, CANARY } from './fixtures/builder.mjs';
import { initClient, loadView, findEntry, changeEntry, addEntry, approveEntries, exportEntries, sampleEntries, quarterHours, requiredText, checkDate, writeTimesheet } from '../../scripts/lib/time/cli-service.mjs';
import { runCli, parseArgs, help, driftWarnings } from '../../scripts/lib/time/cli.mjs';
import { transactLedger, draftHash, readLedger, foldLedger } from '../../scripts/lib/time/ledger.mjs';
import { writePrivate } from '../../scripts/lib/time/paths.mjs';
import * as render from '../../scripts/lib/time/render.mjs';
const cli = fileURLToPath(new URL('../../scripts/timesheet.mjs', import.meta.url));
vi.mock('node:fs', async importOriginal => {
  const fs = await importOriginal();
  return { ...fs, readFileSync: vi.fn(fs.readFileSync) };
});
let f;
beforeEach(() => {
  f = fixture({ git: true });
  for (const key of ['HOME', 'OPCHAIN_TIME_HOME', 'GIT_CONFIG_GLOBAL', 'GIT_CONFIG_NOSYSTEM']) vi.stubEnv(key, f.env[key]);
});
afterEach(() => { vi.unstubAllEnvs(); f.cleanup(); });
const init = (extra = {}) => initClient({ client: 'meridian', name: 'Meridian Freight', rate: '175', repo: f.repo, timezone: 'UTC', ...extra }, f.env, f.repo);
const view = () => loadView(f.env, f.repo);
const run = async args => {
  let stdout = '', stderr = '';
  try { const status = await runCli(args, { env: f.env, cwd: f.repo, out: s => { stdout += s; }, err: s => { stderr += s; } }); return { status, stdout, stderr }; }
  catch (e) { return { status: e.exitCode || 2, stdout, stderr: e.message }; }
};
const spawn = args => spawnSync(process.execPath, [cli, ...args], { env: f.env, cwd: f.repo, encoding: 'utf8' });
async function seed({ unknown = false } = {}) {
  init(); f.file('session-a.jsonl', [user('h'), assistant('a', 300, unknown ? { message: { id: 'unknown', model: 'claude-opus-99', content: [], usage: { output_tokens: 10 } } } : {})]);
  const result = await run(['draft', '2026-09-26']); expect(result.status, result.stderr).toBe(0);
  return view();
}
it('init #15 writes only gitignore to checkout and preserves comments/policies privately', () => {
  const before = readdirSync(f.repo); const result = init();
  expect(readdirSync(f.repo).filter(n => !before.includes(n))).toEqual(['.gitignore']);
  expect(result.addedIgnore).toBe(true);
  expect(readFileSync(result.configPath, 'utf8')).toContain('# Stable client');
  expect(view().config.matters.ticket).toBe('');
  expect(statSync(result.configPath).mode & 0o777).toBe(0o600);
  expect(statSync(join(f.root, 'meridian')).mode & 0o777).toBe(0o700);
  expect(() => init()).toThrow(/force/);
  expect(init({ force: true }).addedIgnore).toBe(false);
  expect(() => init({ client: 'elsewhere', force: true })).toThrow(/another client/);
  expect(existsSync(join(f.home, '.claude', 'settings.json'))).toBe(false);
});
it('rejects unsafe initialization and inconsistent global policies before writes', () => {
  for (const options of [{ rate: '-1' }, { client: '../oops' }, { name: '' }, { timezone: 'bad' }, { repo: f.home }]) expect(() => init(options)).toThrow();
  init();
  const other = join(f.home, 'other'); mkdirSync(other);
  spawnSync('git', ['init', '-q', other], { env: f.env });
  expect(() => init({ client: 'second', repo: other, timezone: 'America/Chicago' })).toThrow(/agree/);
  writeFileSync(join(f.repo, 'billing.yaml'), 'secret'); f.command('add', 'billing.yaml');
  expect(() => init({ force: true })).toThrow(/tracked/);
});
it('CLI full daily loop #17 #18: edits, manual, approval, export, amend and re-approval', async () => {
  const initialized = await run(['init', '--client', 'meridian', '--name', 'Meridian Freight', '--rate', '175', '--repo', f.repo, '--timezone', 'UTC']);
  expect(initialized.status).toBe(0);
  f.file('session-a.jsonl', [user('h'), assistant('a', 300)]);
  expect((await run(['collect'])).status).toBe(0);
  expect((await run(['draft', '2026-09-26'])).status).toBe(0);
  const id = 'meridian-2026-09-26-general-t';
  expect((await run(['edit', id, '--hours', '0.50', '--reason', 'Read spec before prompt'])).status).toBe(0);
  expect((await run(['add', '--date', '2026-09-26', '--matter', 'calls', '--hours', '0.25', '--narrative', 'Planning call.', '--reason', 'Offline work'])).status).toBe(0);
  const review = await run(['review', '2026-09-26']); expect(review.stdout).toContain('AMENDED r2');
  expect((await run(['approve', '2026-09-26'])).status).toBe(0);
  const csvArgs = ['export', '--from', '2026-09-01', '--to', '2026-09-30'];
  const first = await run(csvArgs); expect(first.status, first.stderr).toBe(0); expect(first.stdout).toContain('Exported 3 approved entries');
  const path = join(f.root, 'meridian', 'exports', 'meridian-2026-09.csv');
  expect(readFileSync(path, 'utf8')).toContain('0.50,175.00,87.50,USD');
  const before = readFileSync(view().ledger, 'utf8');
  expect((await run(['draft', '2026-09-26'])).stdout).toContain('appended 0');
  f.file('session-a.jsonl', [assistant('later', 480)], true);
  expect((await run(['draft', '2026-09-26'])).stderr).toContain('drift'); expect(readFileSync(view().ledger, 'utf8')).toBe(before);
  expect((await run(['edit', id, '--hours', '0.75', '--reason', 'Correction'])).status).toBe(1);
  expect((await run(['amend', id, '--hours', '0.75', '--reason', 'Correction'])).stdout).toContain('re-approve required');
  await run(csvArgs); expect(readFileSync(path, 'utf8')).not.toContain(id);
  expect((await run(['approve', id])).status).toBe(0);
  await run(csvArgs); expect(readFileSync(path, 'utf8')).toContain('0.75,175.00,131.25,USD');
  expect((await run(['verify'])).status).toBe(0);
  expect((await run(['spotcheck', '--n', '3'])).stdout).toContain('allocation segments');
  for (const output of [view().ledger, path, join(f.repo, 'timesheets', '2026-09-26.md')]) {
    expect(readFileSync(output, 'utf8')).not.toContain(CANARY); expect(statSync(output).mode & 0o777).toBe(0o600);
  }
});
it('partial approval blocks unknown AI but approves priced time; discards stay excluded', async () => {
  const v = await seed({ unknown: true });
  const result = await run(['approve', '2026-09-26']); expect(result.status).toBe(1); expect(result.stdout).toContain('approved 1');
  expect((await run(['review', '2026-09-26', '--quarantine'])).stdout).toContain('claude-opus-99');
  expect((await run(['discard', 'meridian-2026-09-26-ai', '--reason', 'Not charged'])).status).toBe(0);
  const exported = exportEntries(view(), { from: '2026-09-26', to: '2026-09-26' });
  expect(readFileSync(exported.path, 'utf8')).not.toContain('disbursement');
  expect((await run(['approve', 'meridian-2026-09-26-ai'])).status).toBe(1);
  expect((await run(['approve', '2026-09-26'])).stdout).toContain('already approved 1');
  const original = readFileSync(v.ledger, 'utf8');
  expect((await run(['discard', 'meridian-2026-09-26-general-t', '--reason', 'oops'])).status).toBe(1);
  expect(readFileSync(v.ledger, 'utf8')).toBe(original);
});
it('fresh canary blocks stale passing drafts and cached false canary blocks manual approval', async () => {
  const v = await seed(); writePrivate(v.paths.canary, JSON.stringify({ pass: false, share: .02 }));
  expect((await run(['approve', '2026-09-26'])).stdout).toContain('blocked 2');
  expect((await run(['review', '2026-09-26'])).stdout).toContain('approval blocked');
  await addEntry(view(), { date: '2026-09-25', matter: 'work', hours: '.25', narrative: 'Work.', reason: 'Manual' });
  writePrivate(v.paths.canary, JSON.stringify({ pass: true }));
  expect((await approveEntries(view(), '2026-09-25')).blocked).toHaveLength(1);
});
it('unique prefix resolution and reasons prevent ambiguous or accidental changes', async () => {
  await seed();
  const state = new Map(view().entries.map(e => [e.entry, e]));
  expect(findEntry(state, 'meridian-2026-09-26-g').matter).toBe('general');
  expect(() => findEntry(state, 'meridian')).toThrow(/Ambiguous/);
  expect(() => findEntry(state, 'missing')).toThrow(/No matching/);
  expect(() => findEntry(state, '')).toThrow(/required/);
  for (const args of [ ['edit', 'meridian-2026-09-26-g', '--hours', '.5'], ['edit', 'meridian-2026-09-26-g', '--reason', 'x'], ['edit', 'meridian-2026-09-26-ai', '--hours', '.5', '--reason', 'x'], ['add', '--date', 'bad'], ['edit', 'meridian-2026-09-26-g', '--hours', '.3', '--reason', 'x'] ]) expect((await run(args)).status).toBe(2);
  expect((await run(['amend', 'meridian-2026-09-26-g', '--hours', '.5', '--reason', 'x'])).status).toBe(1);
  expect((await run(['edit', 'meridian-2026-09-26-ai', '--amount', '2.5', '--narrative', 'Compute.', '--reason', 'Reconciled'])).status).toBe(0);
  expect((await run(['edit', 'meridian-2026-09-26-g', '--matter', 'new', '--reason', 'Matter correction'])).status).toBe(0);
});
it('export rejects config overwrite, tracked/unignored repo output, invalid ranges and no approvals', async () => {
  await seed(); expect(() => exportEntries(view(), { from: '2026-09-01', to: '2026-09-30' })).toThrow(/No approved/);
  await approveEntries(view(), '2026-09-26');
  const opts = { from: '2026-09-01', to: '2026-09-30' };
  expect(() => exportEntries(view(), { ...opts, from: '2026-10-01' })).toThrow(/follow/);
  for (const out of [join(f.repo, 'bad.csv'), join(f.root, 'registry.json'), join(f.home, 'bad.txt')]) expect(() => exportEntries(view(), { ...opts, out })).toThrow();
  expect(exportEntries(view(), { ...opts, out: join(f.repo, 'timesheets', 'export.csv') }).entries).toBe(2);
  writeFileSync(join(f.repo, '.gitignore'), '');
  expect(() => writeTimesheet(view(), '2026-09-26')).toThrow(/not ignored/);
  expect(() => exportEntries(view(), { ...opts, out: join(f.repo, 'timesheets', 'another.csv') })).toThrow(/not ignored/);
  f.command('add', '-f', 'timesheets/2026-09-26.md');
  expect((await run(['draft', '2026-09-26'])).status).toBe(1);
});
it('rejects symlink output without modifying its destination', async () => {
  await seed(); await approveEntries(view(), '2026-09-26');
  const target = join(f.home, 'private.csv'); writeFileSync(target, 'preserve');
  const link = join(f.home, 'alias.csv'); symlinkSync(target, link);
  expect(() => exportEntries(view(), { from: '2026-09-01', to: '2026-09-30', out: link })).toThrow(/symbolic/);
  expect(readFileSync(target, 'utf8')).toBe('preserve');
});
it('every help is available, unknown flags/extra values are errors and empty views guide the user', async () => {
  for (const verb of ['init','collect','draft','review','edit','amend','add','approve','discard','export','today','verify','spotcheck','nudge','hook']) expect(help(verb)).toContain('Usage:');
  expect(() => help('wrong')).toThrow();
  for (const args of [['bad'], ['today','extra'], ['review','--bad'], ['draft','--since'], ['draft','--since','--bad'], ['draft','x','--since','y'], ['init','--force','--force'], ['edit']]) expect(() => parseArgs(args)).toThrow();
  init(); expect((await run(['today'])).stdout).toBe(''); expect((await run(['spotcheck'])).stdout).toContain('No approved');
  expect((await run(['review', '2026-09-26'])).stdout).toContain('No drafts');
  expect((await run(['approve','2026-09-26'])).status).toBe(1);
  expect((await run(['help'])).status).toBe(0); expect((await run(['review','--help'])).status).toBe(0);
  expect(spawn(['nudge','--help']).status).toBe(0); expect(spawn(['wrong']).status).toBe(2);
});
it('nudge #13 #19 isolates clients, is cache-only, silent on errors and under budget', async () => {
  await seed();
  // Make transcript/event discovery impossible without affecting ledger-only hook reads.
  const { rmSync } = await import('node:fs'); rmSync(f.projects, { recursive: true }); rmSync(join(f.root, 'events'), { recursive: true });
  const hook = spawn(['nudge','--cwd',f.repo]); expect(hook.status).toBe(0); expect(JSON.parse(hook.stdout).systemMessage).toContain('meridian');
  expect(hook.stdout).not.toContain('other-client');
  expect(spawn(['nudge','--cwd',f.home]).stdout).toBe(''); expect(spawn(['nudge']).status).toBe(0);
  writePrivate(view().paths.canary, JSON.stringify({ pass: false })); expect(spawn(['nudge','--cwd',f.repo]).stdout).toContain('format check failing');
  writePrivate(join(f.root,'registry.json'), '{bad'); expect(spawn(['nudge','--cwd',f.repo]).stdout).toBe('');
  const started = performance.now(); spawn(['nudge','--cwd',f.repo]);
  expect(performance.now()-started).toBeLessThan(process.env.CI ? 1500 : 500);
});
it('samples distinct approved entries and validates scalar inputs', () => {
  const rows = [{ entry: 'a', status: 'approved' }, { entry: 'b', status: 'approved' }, { entry: 'c', status: 'draft' }];
  expect(sampleEntries(rows, 3, () => 0).map(e => e.entry)).toEqual(['a','b']);
  expect(() => sampleEntries(rows, 0)).toThrow(); expect(() => sampleEntries(rows, 101)).toThrow();
  for (const h of ['', '-1', '0.3','no']) expect(() => quarterHours(h)).toThrow();
  expect(quarterHours('.25')).toBe(.25); expect(() => requiredText('\n','Reason')).toThrow();
  expect(() => checkDate('2026-02-30')).toThrow();
  expect(driftWarnings([], { entries: [], date: '2026-09-26' })).toEqual([]);
});
it('cached nudge reads only registry/config/ledger/canary, including a different registered client', async () => {
  await seed();
  const other = join(f.home, 'other'); mkdirSync(other); spawnSync('git', ['init','-q',other], { env:f.env });
  init({ client: 'other-client', repo: other });
  const { nudge } = await import('../../scripts/lib/time/nudge.mjs');
  const reads = vi.mocked(readFileSync); reads.mockClear();
  const text = nudge(f.env, f.repo);
  expect(text).toContain('meridian'); expect(text).not.toContain('other-client');
  expect(reads.mock.calls.map(([p]) => String(p)).every(p => /registry\.json$|billing\.yaml$|ledger\.jsonl$|canary\.json$/.test(p))).toBe(true);
  expect(nudge(f.env, other)).toBe(''); expect(nudge(f.env, f.home)).toBe(''); reads.mockClear();
});
it('process daily loop and npm original cwd resolve the same client', () => {
  expect(spawn(['init','--client','meridian','--name','Meridian Freight','--rate','175','--timezone','UTC','--repo',f.repo]).status).toBe(0);
  f.file('session-a.jsonl',[user('h'),assistant('a',300)]);
  for (const args of [['collect'],['draft','2026-09-26'],['review','2026-09-26'],
    ['edit','meridian-2026-09-26-g','--hours','.5','--reason','Reading'],
    ['add','--date','2026-09-26','--matter','call','--hours','.25','--narrative','Planning call.','--reason','Offline'],
    ['approve','2026-09-26'],['export','--from','2026-09-01','--to','2026-09-30'],['verify'],['spotcheck']]) {
    const result = spawn(args); expect(result.status, `${args[0]}: ${result.stderr}`).toBe(0);
  }
  const result = spawnSync(process.execPath, [cli, 'review', '2026-09-26'], { cwd: f.home, env: { ...f.env, npm_lifecycle_event: 'timesheet', INIT_CWD: f.repo }, encoding: 'utf8' });
  expect(result.status).toBe(0); expect(result.stdout).toContain('Meridian Freight');
});
it('a slow git lookup cannot hang the nudge beyond the hook budget', async () => {
  await seed();
  const bin = join(f.home,'bin'); mkdirSync(bin);
  writeFileSync(join(bin,'git'), '#!/bin/sh\nexec /bin/sleep 3\n', { mode: 0o700 });
  const start = performance.now();
  const result = spawnSync(process.execPath, [cli,'nudge','--cwd',f.repo], { env:{...f.env,PATH:`${bin}:${f.env.PATH}`}, encoding:'utf8',timeout:2000 });
  expect(result.status).toBe(0); expect(result.stdout+result.stderr).toBe('');
  expect(performance.now()-start).toBeLessThan(process.env.CI ? 1500 : 500);
});
it('nonbillable lines stay blocked, pending export days are reported, and manual IDs never collide', async () => {
  await seed();
  const options={ date:'2026-09-25',matter:'call',hours:'.25',narrative:'Call.',reason:'Offline' };
  await Promise.all([addEntry(view(),options),addEntry(view(),options)]);
  expect(view().entries.filter(e=>e.date==='2026-09-25').map(e=>e.entry).sort()).toEqual(['meridian-2026-09-25-m1','meridian-2026-09-25-m2']);
  const e={entry:'meridian-2026-09-26-excluded-t',type:'time',client:'meridian',date:'2026-09-26',matter:'excluded',hours:0,rate:175,narrative:'Excluded.',billable:false};
  await transactLedger(view().ledger,()=>[{...e,derivation:draftHash(e),event:'entry.drafted',revision:1}]);
  expect((await approveEntries(view(),'2026-09-26')).blocked[0].reason).toBe('nonbillable');
  const result=exportEntries(view(),{from:'2026-09-01',to:'2026-10-01'});
  expect(result.summary).toContain('1 unapproved days skipped: 2026-09-25');
  expect(result.path).toContain('2026-09-01-to-2026-10-01');
});
it('stale cross-client allocations block approval and export before double billing', async () => {
  await seed(); await approveEntries(view(),'2026-09-26');
  const other = join(f.home,'other'); mkdirSync(other); spawnSync('git',['init','-q',other],{env:f.env});
  init({client:'second',repo:other});
  const source=view().entries.find(e=>e.type==='time');
  const e={...source,client:'second',entry:'second-2026-09-26-general-t',status:undefined};
  delete e.hash; delete e.prev; delete e.v; delete e.at; delete e.approved_at; delete e.status;
  e.derivation=draftHash(e); e.event='entry.drafted'; e.revision=1;
  await transactLedger(join(f.root,'second','ledger.jsonl'),()=>[e]);
  await expect(approveEntries(view(),'2026-09-26')).rejects.toThrow(/wall-clock/);
  expect(()=>exportEntries(view(),{from:'2026-09-01',to:'2026-09-30'})).toThrow(/wall-clock/);
});
