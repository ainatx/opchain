import { afterEach, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, writeFileSync, appendFileSync, unlinkSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { collect, discover } from '../../scripts/lib/time/transcripts.mjs';
import { timePaths, readJson, writePrivate } from '../../scripts/lib/time/paths.mjs';
import { recordPrompt } from '../../scripts/lib/time/prompts-hook.mjs';
import { fixture, user, assistant, queue, stamp, CANARY } from './fixtures/builder.mjs';
const fixtures = [];
const make = () => { const f = fixture(); fixtures.push(f); return f; };
afterEach(() => { for (const f of fixtures.splice(0)) f.cleanup(); });
function events(f) {
  return readdirSync(join(f.root, 'events')).filter(n => n.endsWith('.jsonl')).flatMap(n => readFileSync(join(f.root, 'events', n), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse));
}
function allFiles(path) { return readdirSync(path, { withFileTypes: true }).flatMap(e => e.isDirectory() ? allFiles(join(path, e.name)) : [join(path, e.name)]); }

it('fixtures #4/#5/#12/#17: subagents, global fork de-dup, sorted output, no text anywhere', async () => {
  const f = make();
  f.file('a.jsonl', [assistant('a', 900), user('u'), assistant('tool', 1, { message: { id: 'tool-msg', content: [{ type: 'tool_use', name: 'AskUserQuestion', id: 'ask-1', input: { secret: CANARY } }] } }),
    user('answer', 2, '', { message: { content: [{ type: 'tool_result', tool_use_id: 'ask-1', content: CANARY }] } }), user('bad', 3, `<foo>${CANARY}</foo>`),
    user('machine', 4, `<scheduled-task>${CANARY}</scheduled-task>`), { type: 'attachment', timestamp: stamp(5000), content: CANARY },
    { type: 'pr-link', timestamp: stamp(12), prNumber: 42, title: CANARY }, user('skill', 5, '<command-name>/oc-build</command-name>')]);
  f.file('b.jsonl', [user('u', 0, CANARY, { sessionId: 'fork' }), assistant('a', 900, { sessionId: 'fork', message: { id: 'msg-a', model: 'claude-opus-5', usage: { input_tokens: 1, output_tokens: 20, cache_creation: { ephemeral_1h_input_tokens: 30 } } } })]);
  f.file('a/subagents/agent-1.jsonl', [user('sub-user', 600), assistant('sub-work', 700)]);
  const report = await collect({ env: f.env });
  expect(report.files).toBe(3); expect(report.canary.duplicates).toMatchObject({ events: 2, messages: 1 });
  const rows = events(f);
  expect(rows.map(r => r.ts)).toEqual(rows.map(r => r.ts).sort());
  expect(rows.find(r => r.uuid === 'a')).toMatchObject({ usage: { input_tokens: 2, output_tokens: 20, cache_creation: { ephemeral_1h_input_tokens: 30 } } });
  expect(rows.find(r => r.uuid === 'sub-user')).toMatchObject({ parent_session: 'a', class: 'machine' });
  expect(rows.find(r => r.uuid === 'sub-work')).toMatchObject({ parent_session: 'a', class: 'assistant', usage: { output_tokens: 10 } });
  expect(rows.find(r => r.uuid === 'answer').class).toBe('human_answer');
  expect(rows.find(r => r.uuid === 'skill').skill).toBe('oc-build');
  expect(rows.find(r => r.pr)?.pr).toBe(42);
  for (const path of allFiles(f.root)) {
    expect(readFileSync(path, 'utf8')).not.toContain(CANARY);
    expect(statSync(path).mode & 0o777).toBe(0o600);
  }
  const before = rows;
  const rerun = await collect({ env: f.env });
  expect(rerun.bytes).toBe(0); expect(events(f)).toEqual(before);
});
it('fixture #11: queued prompt enqueue time, delayed user de-dup and cancellation across appends', async () => {
  const f = make();
  f.file('a.jsonl', [queue('q', 'enqueue', 0)]);
  await collect({ env: f.env }); expect(events(f).filter(r => r.class === 'human_prompt')).toHaveLength(1);
  f.file('a.jsonl', [queue('q', 'dequeue', 240), user('u', 240), queue('cancel', 'enqueue', 300, 'cancelled'), queue('cancel', 'remove', 301, 'cancelled')], true);
  const report = await collect({ env: f.env });
  expect(events(f).filter(r => r.class === 'human_prompt').map(r => r.ts)).toEqual([stamp(0)]);
  expect(report.canary.duplicates.queue).toBe(1);
});
it('fixture #3: hook replaces transcript prompt and survives empty transcript tree', async () => {
  const f = make(); f.file('a.jsonl', [user('u', 3), user('other', 3, 'other', { sessionId: 'different' })]);
  recordPrompt({ session_id: 'session-a', cwd: f.repo, prompt: CANARY }, f.env, new Date(stamp(0)));
  const report = await collect({ env: f.env });
  expect(report.canary.duplicates.hooks).toBe(1);
  expect(events(f).filter(r => r.class === 'human_prompt')).toHaveLength(2);
  expect(readFileSync(timePaths(f.env).prompts, 'utf8')).not.toContain(CANARY);
  appendFileSync(timePaths(f.env).prompts, '{bad}\n{}\n');
  expect((await collect({ env: f.env })).canary).toMatchObject({ pass: false, malformed_hooks: 2 });
});
it('cursor append, partial lines, truncate, inode replacement, deletion and interrupted publication', async () => {
  const f = make(), path = f.file('a.jsonl', [user('u')]);
  await collect({ env: f.env });
  appendFileSync(path, JSON.stringify(user('partial', 2)).slice(0, 30));
  await collect({ env: f.env }); expect(events(f)).toHaveLength(1);
  appendFileSync(path, JSON.stringify(user('partial', 2)).slice(30) + '\n');
  await collect({ env: f.env }); expect(events(f)).toHaveLength(2);
  const cursor = readJson(timePaths(f.env).cursor);
  // Roll cursor back to mimic a killed process after shard publication.
  cursor[path].offset = 0; writePrivate(timePaths(f.env).cursor, JSON.stringify(cursor));
  await collect({ env: f.env }); expect(events(f)).toHaveLength(2);
  writeFileSync(path, JSON.stringify(user('replacement', 5)) + '\n');
  await collect({ env: f.env }); expect(events(f).map(r => r.uuid)).toEqual(['replacement']);
  renameSync(path, path + '.old'); f.file('a.jsonl', [user('inode', 7)]);
  await collect({ env: f.env }); expect(events(f).map(r => r.uuid)).toEqual(['inode']);
  unlinkSync(path); await collect({ env: f.env });
  expect(readJson(timePaths(f.env).cursor)).toEqual({}); expect(events(f).map(r => r.uuid)).toEqual(['inode']);
});
it('missing files, malformed JSON, no timestamps, synthetic usage and untested versions remain best effort', async () => {
  const f = make(); expect(discover(join(f.home, 'missing'))).toEqual([]);
  expect((await collect({ env: f.env })).events).toBe(0);
  f.file('a.jsonl', ['{bad}', 'null', '[]', '42', '', user('no-date', 0, 'a', { timestamp: undefined }),
    user('new', 1, 'hello', { version: '99.0.0' }), assistant('synthetic', 2, { message: { id: 'synthetic', model: '<synthetic>', usage: { output_tokens: 10 } } })]);
  const report = await collect({ env: f.env });
  expect(report.canary).toMatchObject({ pass: false, malformed: 4, missing_timestamp: 1, untested_versions: ['99.0.0'] });
  expect(events(f).find(e => e.uuid === 'synthetic').usage).toBeUndefined();
});
it('full and unordered input produce equivalent classified events', async () => {
  const a = make(), b = make();
  const lines = [user('u', 0), assistant('a', 10), user('b', 5)];
  a.file('s.jsonl', lines); b.file('s.jsonl', [...lines].reverse());
  await collect({ env: a.env }); await collect({ env: b.env });
  const normalize = f => events(f).map(({ repo, ...row }) => row);
  expect(normalize(a)).toEqual(normalize(b));
});
it('refuses conflicting writers and incomplete storage configuration', async () => {
  const f = make(); mkdirSync(f.root); writeFileSync(join(f.root, 'collect.lock'), '');
  await expect(collect({ env: f.env })).rejects.toThrow();
  await expect(collect({ env: { OPCHAIN_TIME_HOME: f.root } })).rejects.toThrow('HOME');
});
it('first-seen UUID ownership stays stable when a lexically earlier fork is discovered later', async () => {
  const f = make(); f.file('z.jsonl', [user('u', 0, 'original', { sessionId: 'original' })]);
  await collect({ env: f.env });
  f.file('a.jsonl', [user('u', 0, 'copy', { sessionId: 'copy' })]);
  await collect({ env: f.env });
  expect(events(f)[0].session).toBe('original');
  await collect({ env: f.env }); expect(events(f)[0].session).toBe('original');
});
it('tool answer matching stays scoped to its session and survives reversed / appended calls', async () => {
  const f = make();
  const result = (id, sessionId) => user(id, 10, '', { sessionId, message: { content: [{ type: 'tool_result', tool_use_id: 'ask', content: CANARY }] } });
  f.file('a.jsonl', [result('answer', 'a'), result('wrong-session', 'b')]);
  await collect({ env: f.env }); expect(events(f).every(e => e.class === 'tool_result')).toBe(true);
  f.file('a.jsonl', [assistant('ask', 0, { sessionId: 'a', message: { content: [{ type: 'tool_use', name: 'ExitPlanMode', id: 'ask' }] } })], true);
  await collect({ env: f.env });
  expect(events(f).find(e => e.uuid === 'answer').class).toBe('human_answer');
  expect(events(f).find(e => e.uuid === 'wrong-session').class).toBe('tool_result');
});
it('content-free queue removals use ID and identical queued prompts remain distinct FIFO turns', async () => {
  const f = make();
  const removal = queue('cancel', 'remove', 1); delete removal.content;
  f.file('a.jsonl', [queue('cancel', 'enqueue', 0), removal,
    queue('first', 'enqueue', 2), queue('second', 'enqueue', 3), queue('first', 'dequeue', 4), user('first-user', 4),
    queue('second', 'dequeue', 5), user('second-user', 5)]);
  await collect({ env: f.env });
  expect(events(f).filter(e => e.class === 'human_prompt').map(e => e.ts)).toEqual([stamp(2), stamp(3)]);
});
it('per-event cwd follows switches, metadata cannot leak bodies, and failed sources flag canary', async () => {
  const f = make(); const path = f.file('a.jsonl', [user('a'), user('b', 2, 'text', { cwd: '/missing/repo-b' })]);
  await collect({ env: f.env }); expect(events(f).map(e => e.repo)).toEqual([f.repo, '/missing/repo-b']);
  // Existing cursor + unreadable newly appended bytes must retain prior cache.
  appendFileSync(path, JSON.stringify(user('c', 3)) + '\n');
  const { chmodSync } = await import('node:fs'); chmodSync(path, 0o000);
  try {
    const report = await collect({ env: f.env });
    expect(report.canary.pass).toBe(false); expect(report.canary.failures).toHaveLength(1);
    expect(events(f)).toHaveLength(2);
  } finally { chmodSync(path, 0o600); }
  const report = await collect({ env: f.env }); expect(report.canary.pass).toBe(true); expect(events(f)).toHaveLength(3);
});
it('queue records without cwd inherit their own session location across cwd changes', async () => {
  const f = make();
  f.file('a.jsonl', [user('first', 0), { ...queue('a', 'enqueue', 1), cwd: undefined },
    user('second', 2, 'next', { cwd: '/missing/repo-b' }), { ...queue('b', 'enqueue', 3, 'other'), cwd: undefined }]);
  await collect({ env: f.env });
  expect(events(f).filter(e => e.type === 'queue-operation').map(e => e.repo)).toEqual([f.repo, '/missing/repo-b']);
});

it('replays an unchanged source when its stored classifier format is obsolete', async () => {
  const f = make(); f.file('a.jsonl', [user('wrapped', 0, '<system-reminder>synthetic</system-reminder>hello')]);
  await collect({ env: f.env });
  const source = join(f.root, 'events', '.sources', readdirSync(join(f.root, 'events', '.sources'))[0]);
  const shard = JSON.parse(readFileSync(source)); delete shard.format;
  shard.records[0].event.class = 'quarantine'; writeFileSync(source, JSON.stringify(shard));
  const result = await collect({ env: f.env });
  expect(result.bytes).toBeGreaterThan(0);
  expect(events(f)[0].class).toBe('human_prompt');
  expect((await collect({ env: f.env })).bytes).toBe(0);
});
