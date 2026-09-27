import { it, expect, afterEach, beforeEach, vi } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixture, user, assistant, CANARY } from './fixtures/builder.mjs';
import { addRepo } from '../../scripts/lib/time/registry.mjs';
import { timePaths, writePrivate } from '../../scripts/lib/time/paths.mjs';
import { draftHash, readLedger, foldLedger } from '../../scripts/lib/time/ledger.mjs';
const cli = fileURLToPath(new URL('../../scripts/timesheet.mjs', import.meta.url));
const ledgerModule = new URL('../../scripts/lib/time/ledger.mjs', import.meta.url).href;
const fixtures = [];
beforeEach(() => {
  const f = fixture(); fixtures.push(f);
  for (const key of ['HOME', 'OPCHAIN_TIME_HOME', 'GIT_CONFIG_GLOBAL', 'GIT_CONFIG_NOSYSTEM']) vi.stubEnv(key, f.env[key]);
});
afterEach(() => { vi.unstubAllEnvs(); fixtures.splice(0).forEach(f => f.cleanup()); });
function setup() {
  const f = fixture({ git: true }); fixtures.push(f);
  addRepo(timePaths(f.env), f.repo, 'acme');
  writeFileSync(join(f.repo, '.gitignore'), '/timesheets/\n');
  writePrivate(join(f.root, 'acme', 'billing.yaml'), 'client: { id: acme, name: Acme }\nrate: { hourly: 100, currency: USD }\n');
  f.file('session-a.jsonl', [user('h'), assistant('a', 300)]);
  return f;
}
const run = (f, args) => spawnSync(process.execPath, [cli, ...args], { cwd: f.repo, env: f.env, encoding: 'utf8' });
it('draft and verify run end to end with stable bytes and actionable exit codes', () => {
  const f = setup(), ledger = join(f.root, 'acme', 'ledger.jsonl');
  const first = run(f, ['draft', '2026-09-26']);
  expect(first.status).toBe(0); expect(first.stdout).toContain('block 5.00m · human cadence 0.00m'); expect(first.stdout).toContain('appended 2');
  const bytes = readFileSync(ledger, 'utf8'); expect(run(f, ['draft', '2026-09-26']).stdout).toContain('appended 0');
  expect(readFileSync(ledger, 'utf8')).toBe(bytes);
  expect(run(f, ['verify']).status).toBe(0);
  writeFileSync(ledger, bytes.replace('"hours":0.25', '"hours":9'));
  expect(run(f, ['verify']).status).toBe(1);
  writeFileSync(ledger, bytes);
  expect(run(f, ['draft', 'invalid']).status).toBe(2); expect(run(f, ['verify', 'extra']).status).toBe(2);
  expect(run(f, ['draft', '--bad']).status).toBe(2); expect(run(f, ['draft', '--since', '9999-01-01']).status).toBe(2);
  const range = run(f, ['draft', '--since', new Date().toISOString().slice(0, 10)]); expect(range.status).toBe(0);
  f.file('session-a.jsonl', [user('q', 10, `<unknown>${CANARY}</unknown>`)], true);
  const bad = run(f, ['draft', '2026-09-26']); expect(bad.status).toBe(1); expect(bad.stderr).toContain('canary');
  expect(bad.stdout + bad.stderr + readFileSync(ledger, 'utf8')).not.toContain(CANARY);
  expect(run(f, ['verify']).status).toBe(1);
});
it('twenty separate processes append intact rows to one locked ledger', async () => {
  const f = setup(), ledger = join(f.root, 'acme', 'ledger.jsonl');
  const results = await Promise.all(Array.from({ length: 20 }, (_, i) => new Promise(resolve => {
    const row = { entry: `acme-2026-09-26-${i}-t`, type: 'time', date: '2026-09-26', client: 'acme', matter: 'general', hours: .25, rate: 1, narrative: 'Work on general.' };
    row.derivation = draftHash(row); row.event = 'entry.drafted'; row.revision = 1;
    const script = `import { transactLedger } from ${JSON.stringify(ledgerModule)}; await transactLedger(${JSON.stringify(ledger)}, () => [${JSON.stringify(row)}]);`;
    const child = spawn(process.execPath, ['--input-type=module', '-e', script], { env: f.env, cwd: f.repo, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = ''; child.stderr.on('data', d => { stderr += d; }); child.on('close', code => resolve({ code, stderr }));
  })));
  expect(results.every(r => r.code === 0)).toBe(true);
  expect(readLedger(ledger)).toHaveLength(20); expect(foldLedger(readLedger(ledger)).size).toBe(20);
});
