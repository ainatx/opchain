import { afterEach, it, expect } from 'vitest';
import { writeFileSync, readFileSync, statSync, appendFileSync, unlinkSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { timePaths, privateDir, writePrivate, readJson, clientPath, absolutePath } from '../../scripts/lib/time/paths.mjs';
import { startOffset, readLines } from '../../scripts/lib/time/cursor.mjs';
import { addRepo, loadRegistry, createResolver, gitRoot } from '../../scripts/lib/time/registry.mjs';
import { parseConfig, parseBillingYaml, loadConfig } from '../../scripts/lib/time/config.mjs';
import { recordPrompt } from '../../scripts/lib/time/prompts-hook.mjs';
import { fixture, CANARY } from './fixtures/builder.mjs';
const fixtures = [];
const make = options => { const f = fixture(options); fixtures.push(f); return f; };
afterEach(() => { for (const f of fixtures.splice(0)) f.cleanup(); });

it('private storage, missing HOME, safe paths and JSON failures', () => {
  const f = make(), paths = timePaths(f.env);
  expect(paths.root).toBe(f.root);
  expect(timePaths({ HOME: f.home }).root).toBe(join(f.home, '.opchain/time'));
  expect(() => timePaths({})).toThrow('HOME');
  privateDir(paths.root); chmodSync(paths.root, 0o755); privateDir(paths.root);
  writePrivate(paths.registry, '{}');
  expect(statSync(paths.root).mode & 0o777).toBe(0o700);
  expect(statSync(paths.registry).mode & 0o777).toBe(0o600);
  expect(readJson(paths.registry)).toEqual({});
  expect(readJson(join(f.root, 'missing'), 'fallback')).toBe('fallback');
  writeFileSync(paths.registry, '{'); expect(() => readJson(paths.registry)).toThrow();
  expect(clientPath(paths, 'acme')).toBe(join(paths.root, 'acme'));
  for (const id of ['../bad', '', 'internal', null]) expect(() => clientPath(paths, id)).toThrow();
  expect(absolutePath('relative')).toBe(false); expect(absolutePath('/foo\0bar')).toBe(false);
});
it('cursor handles UTF-8, partial final lines, append, truncate, replacement and rewrites', async () => {
  const f = make(), path = join(f.home, 'log');
  writeFileSync(path, 'é🙂\npartial');
  const first = [], cursor = await readLines(path, statSync(path), null, line => first.push(line));
  expect(first).toEqual(['é🙂']); expect(cursor.offset).toBe(Buffer.byteLength('é🙂\n'));
  appendFileSync(path, '-done\nnext\n');
  const more = [], second = await readLines(path, statSync(path), cursor, line => more.push(line));
  expect(more).toEqual(['partial-done', 'next']);
  expect(startOffset(second, statSync(path))).toBe(second.offset);
  writeFileSync(path, 'x\n'); expect(startOffset(second, statSync(path))).toBe(0);
  expect(startOffset(second, { ...statSync(path), ino: second.inode + 1 })).toBe(0);
  expect(startOffset(second, { ino: second.inode, size: second.size, mtimeMs: second.mtime + 1 })).toBe(0);
  expect(startOffset(null, statSync(path))).toBe(0);
  const empty = await readLines(path, statSync(path), { inode: statSync(path).ino, size: 2, offset: 2, mtime: statSync(path).mtimeMs }, () => { throw new Error(); });
  expect(empty.offset).toBe(2);
});
it('registry resolves worktrees, per-event cwd, longest deleted-path prefix and internal repos', () => {
  const f = make({ git: true }), paths = timePaths(f.env), worktree = join(f.home, 'worktree');
  expect(loadRegistry(paths)).toEqual({});
  const root = addRepo(paths, f.repo, 'acme');
  f.command('worktree', 'add', '-q', '-b', 'fixture-work', worktree);
  const lookup = createResolver({ ...loadRegistry(paths), [join(root, 'nested')]: 'other' });
  expect(lookup(worktree)).toEqual({ repo: root, client: 'acme' });
  expect(lookup(worktree)).toEqual({ repo: root, client: 'acme' });
  expect(lookup(join(root, 'nested/deleted'))).toEqual({ repo: join(root, 'nested'), client: 'other' });
  expect(lookup(`${root}-different`).client).toBe('internal');
  expect(lookup(undefined)).toEqual({ repo: 'internal', client: 'internal' });
  expect(gitRoot(join(f.home, 'absent'))).toBe(null);
  expect(() => addRepo(paths, f.home, 'bad')).toThrow('Not a git');
  for (const value of [[], null, { relative: 'acme' }, { '/tmp/valid': '../bad' }]) {
    writePrivate(paths.registry, JSON.stringify(value)); expect(() => loadRegistry(paths)).toThrow();
  }
});
it('prompt hook records metadata only and absorbs invalid payloads/storage errors', () => {
  const f = make(), paths = timePaths(f.env), now = new Date('2026-09-26T10:00:00Z');
  expect(recordPrompt({ session_id: 'abc', cwd: f.repo, prompt: CANARY }, f.env, now)).toBe(true);
  expect(JSON.parse(readFileSync(paths.prompts, 'utf8'))).toEqual({ ts: now.toISOString(), session_id: 'abc', cwd: f.repo });
  expect(statSync(paths.prompts).mode & 0o777).toBe(0o600);
  for (const input of ['{', null, {}, { session_id: 'bad id', cwd: f.repo }, { session_id: 'a', cwd: 'relative' }]) expect(recordPrompt(input, f.env)).toBe(false);
  expect(recordPrompt({ session_id: 'a', cwd: f.repo }, {})).toBe(false);
  const blocker = join(f.home, 'file'); writeFileSync(blocker, 'x');
  expect(recordPrompt(JSON.stringify({ session_id: 'a', cwd: f.repo }), { ...f.env, OPCHAIN_TIME_HOME: blocker })).toBe(false);
});
const base = "client: { id: acme, name: 'Acme Corp' }\nrate: { hourly: 175, currency: USD }\n";
it('config defaults, inline / nested YAML, comments, rules and line-numbered warnings', () => {
  const result = parseConfig(base + "agent_tail_cap_minutes: null\nmatters:\n  ticket: '(ACME-\\d+)'\n  rules:\n    - branch: '^chore/deps'\n      billable: false\n      matter: deps\n  default: general\nunknown_option: ignored\n");
  expect(result.config).toMatchObject({ idle_minutes: 10, agent_tail_cap_minutes: null, rounding_scope: 'client-day', matters: { ticket: '(ACME-\\d+)', rules: [{ branch: '^chore/deps', billable: false, matter: 'deps' }] } });
  expect(result.warnings).toEqual(['billing.yaml:11: unknown key']);
  expect(parseBillingYaml("a: [1, true, false, ~, 'it''s', \"line\\nnext\"] # comment\nb: { c: 1 }\n").value).toEqual({ a: [1, true, false, null, "it's", 'line\nnext'], b: { c: 1 } });
  expect(parseBillingYaml('# only comment').value).toEqual({});
  const f = make(), path = join(f.home, 'billing.yaml'); writeFileSync(path, base);
  expect(loadConfig(path).config.rate.hourly).toBe(175);
});
it.each([
  ['version: 2', 'version'], ['increment_hours: 0', 'increment_hours'], ['idle_minutes: -1', 'idle_minutes'],
  ['agent_tail_cap_minutes: bad', 'agent_tail'], ['rounding: down', 'rounding'], ['overlap: wrong', 'overlap'],
  ['timezone: Invalid/Zone', 'timezone'], ['matters: { max_per_day: 1.5 }', 'integer'],
  ['matters: { ticket: "[" }', 'regex'], [`matters: { ticket: '${'a'.repeat(201)}' }`, '200'],
  ['matters: { rules: bad }', 'sequence'], ['matters: { rules: [{branch: x, billable: yes}] }', 'boolean'],
  ['ai_cost: { mode: free }', 'unsupported'], ['ai_cost: { markup_pct: -1 }', 'number'], ['matters: null', 'mapping'],
  ['client: {id: internal, name: A}', 'invalid id'], ['rate: {hourly: nope, currency: USD}', 'number'],
])('config rejects %s', (row, message) => {
  const source = row.startsWith('client:') ? `${row}\nrate: {hourly: 1, currency: USD}` : row.startsWith('rate:') ? `client: {id: a, name: A}\n${row}` : base + row;
  expect(() => parseConfig(source)).toThrow(message);
});
it.each([' a: 1', 'a: "unfinished', 'a: [1', '\ta: 1', 'a: &alias', 'a: 1\na: 2', '__proto__: x', 'a: {b: 1, b: 2}', 'a: "bad\\q"', '- a: 1', 'a: 1\n  b: 2', 'a:\n  - b: 1\n  c: 2', 'a:\n  - b: 1\n    b: 2'])('YAML rejects unsupported or ambiguous form %s', source => expect(() => parseBillingYaml(source)).toThrow('billing.yaml:'));
