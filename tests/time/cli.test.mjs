import { afterEach, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { collect } from '../../scripts/lib/time/transcripts.mjs';
import { fixture, user, CANARY } from './fixtures/builder.mjs';
const cli = fileURLToPath(new URL('../../scripts/timesheet.mjs', import.meta.url));
const fixtures = [];
const make = () => { const f = fixture(); fixtures.push(f); return f; };
afterEach(() => { for (const f of fixtures.splice(0)) { try { chmodSync(f.root, 0o700); } catch {} f.cleanup(); } });
const run = (f, args, input = '', env = f.env) => spawnSync(process.execPath, [cli, ...args], { env, input, encoding: 'utf8' });
it('collect CLI prints summary/report, canary warning and redacted operational errors', () => {
  const f = make(); f.file('s.jsonl', [user('a')]);
  const normal = run(f, ['collect']);
  expect(normal.status).toBe(0); expect(normal.stdout).toMatch(/^Collected 1 events from 1 files \([\d.]+s\) · canary 0.0%\n$/);
  const report = run(f, ['collect', '--report']);
  expect(report.status).toBe(0); expect(JSON.parse(report.stdout)).toMatchObject({ events: 1, bytes: 0, canary: { pass: true } });
  f.file('s.jsonl', [user('q', 1, `<foo>${CANARY}</foo>`)], true);
  const bad = run(f, ['collect']); expect(bad.status).toBe(0); expect(bad.stderr).toContain('Format canary failed'); expect(bad.stdout + bad.stderr).not.toContain(CANARY);
  writeFileSync(join(f.root, 'registry.json'), CANARY);
  const invalid = run(f, ['collect']); expect(invalid.status).toBe(2); expect(invalid.stderr).not.toContain(CANARY);
  expect(run(f, ['draft']).status).toBe(2); expect(run(f, ['collect', '--bad']).status).toBe(2);
});
it('fixture #17: hook always silent/zero, including permissions failure', () => {
  const f = make(), payload = JSON.stringify({ session_id: 'session-a', cwd: f.repo, prompt: CANARY });
  const result = run(f, ['hook', 'prompt'], payload);
  expect(result.status).toBe(0); expect(result.stdout).toBe(''); expect(result.stderr).toBe('');
  expect(readFileSync(join(f.root, 'prompts.jsonl'), 'utf8')).not.toContain(CANARY);
  const invalid = run(f, ['hook', 'prompt'], '{bad}'); expect(invalid.status).toBe(0); expect(invalid.stdout + invalid.stderr).toBe('');
  chmodSync(join(f.root, 'prompts.jsonl'), 0o400);
  const denied = run(f, ['hook', 'prompt'], payload); expect(denied.status).toBe(0); expect(denied.stdout + denied.stderr).toBe('');
  const blocker = join(f.home, 'blocker'); writeFileSync(blocker, 'not a directory');
  const blocked = run(f, ['hook', 'prompt'], payload, { ...f.env, OPCHAIN_TIME_HOME: blocker }); expect(blocked.status).toBe(0); expect(blocked.stdout + blocked.stderr).toBe('');
});
it('fixture #19: 10k-line append does not reread old transcript bytes', async () => {
  const f = make(); f.file('s.jsonl', Array.from({ length: 10000 }, (_, i) => user(`before-${i}`, i)));
  await collect({ env: f.env });
  f.file('s.jsonl', Array.from({ length: 10000 }, (_, i) => user(`after-${i}`, 10000 + i)), true);
  const report = await collect({ env: f.env });
  expect(report.events).toBe(20000); expect(report.canary.run.lines).toBe(10000);

});
