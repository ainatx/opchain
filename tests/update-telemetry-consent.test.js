import { afterEach, describe, expect, it, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { digest, main, telemetryHealth } from '../scripts/update-opchain.mjs';

const roots = [];
afterEach(() => {
  vi.unstubAllGlobals(); vi.restoreAllMocks();
  roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true }));
});
function fixture({ enabled, tracked, broken = false, corrupt = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'oc-local-consent-')); roots.push(root);
  mkdirSync(join(root, '.checkpoints'));
  if (tracked !== undefined) writeFileSync(join(root, '.checkpoints/oc-telemetry-ops.checkpoint.json'),
    JSON.stringify({ telemetry_handle: { enabled: tracked } }) + '\n');
  if (corrupt) writeFileSync(join(root, '.checkpoints/usage.sqlite'), 'unreadable existing database');
  else if (enabled !== undefined) {
    const db = new DatabaseSync(join(root, '.checkpoints/usage.sqlite'));
    db.exec('CREATE TABLE telemetry_meta(key TEXT PRIMARY KEY,value TEXT); CREATE TABLE events(id INTEGER);');
    db.prepare('INSERT INTO telemetry_meta VALUES(?,?)').run('consent_enabled', String(enabled));
    if (!broken) db.exec('CREATE TABLE runs(id INTEGER); INSERT INTO runs VALUES(1);');
    db.close();
  }
  return root;
}
function state(root) {
  return Object.fromEntries(readdirSync(join(root, '.checkpoints')).sort().map(name =>
    [name, readFileSync(join(root, '.checkpoints', name)).toString('base64')]));
}
function transport() {
  const skills = ['oc-checkpoint-protocol', 'oc-telemetry-ops'];
  const files = skills.flatMap(skill => [
    [`${skill}/SKILL.md`, `---\nname: ${skill}\nversion: 2.0.0\n---\n`],
    [`${skill}/references/orchestrator.md`, '# fixture'],
    ...[skill.includes('telemetry') ? 'telemetry' : 'checkpoint'].flatMap(name => [
      [`${skill}/scripts/${name}.mjs`, '// fixture'],
      [`${skill}/scripts/${name}.runtime.mjs`, '// fixture'],
    ]),
  ]).map(([path, text]) => ({ path, mode: 0o644, content: Buffer.from(text).toString('base64'), sha256: digest(text) }));
  const bytes = JSON.stringify({ schema: 1, version: '2.0.0', skills, files });
  vi.stubGlobal('fetch', async url => new Response(url.endsWith('/latest.json')
    ? JSON.stringify({ schema: 1, version: '2.0.0', sha256: digest(bytes) }) : bytes));
}

describe('updater uses machine-local telemetry consent', () => {
  it.each([
    ['enabled without tracked checkpoint', { enabled: true }, true, true],
    ['enabled with stale tracked OFF', { enabled: true, tracked: false }, true, true],
    ['enabled with missing runs table', { enabled: true, broken: true }, true, false],
    ['disabled with stale tracked ON', { enabled: false, tracked: true }, false, true],
    ['copied tracked ON without local store', { tracked: true }, false, true],
    ['corrupt local store has unknown consent', { corrupt: true }, null, false],
  ])('%s, without modifying stored state', async (_name, options, enabled, healthy) => {
    const root = fixture(options), before = state(root);
    expect(await telemetryHealth(root)).toMatchObject({ enabled, healthy });
    expect(state(root)).toEqual(before);
  });

  it.each([true, false])('CLI check=%s returns exit 2 for locally enabled unhealthy telemetry', async check => {
    const root = fixture({ enabled: true, broken: true }), before = state(root);
    transport(); const output = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await main([`--root=${root}`, ...(check ? ['--check'] : [])])).toBe(2);
    expect(output.mock.calls.flat().join('\n')).toContain('Telemetry: ON');
    expect(error.mock.calls.flat().join('\n')).toContain('telemetry needs attention');
    expect(state(root)).toEqual(before);
    if (check) expect(readdirSync(root)).toEqual(['.checkpoints']);
  });

  it('CLI check returns success/OFF for a copied tracked opt-in with no local store', async () => {
    const root = fixture({ tracked: true }), before = state(root);
    transport(); const output = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await main([`--root=${root}`, '--check'])).toBe(0);
    expect(output.mock.calls.flat().join('\n')).toContain('Telemetry: OFF');
    expect(state(root)).toEqual(before);
  });
});
