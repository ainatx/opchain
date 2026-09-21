import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { buildUpdateBundle } from '../scripts/build-update-bundle.mjs';
import { digest, downloadRelease, installBundle } from '../scripts/update-opchain.mjs';
import worker from '../src/index.js';

const root = resolve(import.meta.dirname, '..');
let temp, pub, release, descriptor, bundle;
beforeAll(() => {
  temp = mkdtempSync(join(tmpdir(), 'oc-update-release-'));
  pub = join(temp, 'public');
  release = buildUpdateBundle({ publicDir: pub });
  descriptor = readFileSync(join(pub, 'opchain-update/latest.json'));
  bundle = JSON.parse(readFileSync(join(pub, `opchain-update/${release.sha256}.json`)));
});
afterAll(() => rmSync(temp, { recursive: true, force: true }));

describe('complete release artifact', () => {
  it('pins all skill resources and executable runtime copies in one reproducible release', () => {
    expect(buildUpdateBundle({ publicDir: pub })).toEqual(release);
    expect(JSON.parse(descriptor).sha256).toBe(release.sha256);
    const paths = new Set(bundle.files.map(file => file.path));
    for (const skill of bundle.skills) {
      expect(paths.has(`${skill}/SKILL.md`)).toBe(true);
      expect(paths.has(`${skill}/LICENSE`)).toBe(true);
      expect(paths.has(`${skill}/NOTICE`)).toBe(true);
    }
    for (const [skill, filename, canonical] of [
      ['oc-telemetry-ops', 'runtime/scripts/telemetry.mjs', 'telemetry.mjs'],
      ['oc-checkpoint-protocol', 'runtime/scripts/checkpoint.mjs', 'checkpoint.mjs'],
      ['oc-update', 'update.mjs', 'update-opchain.mjs'],
    ]) {
      const file = bundle.files.find(file => file.path === `${skill}/scripts/${filename}`);
      expect(Buffer.from(file.content, 'base64')).toEqual(readFileSync(join(root, 'scripts', canonical)));
    }
    expect(bundle.files.some(file => file.path.includes('.checkpoints/'))).toBe(false);
  });

  it('downloads the built artifact, installs it, and runs its actual portable CLIs', async () => {
    const fetched = await downloadRelease(async url => new Response(readFileSync(join(pub, new URL(url).pathname))));
    const consumer = join(temp, 'consumer');
    mkdirSync(consumer);
    const result = await installBundle(fetched, { root: consumer, target: 'codex' });
    expect(result.changed).toBeGreaterThan(bundle.files.length);
    const skillRoot = join(consumer, '.agents/skills');
    const telemetry = spawnSync(process.execPath, [join(skillRoot, 'oc-telemetry-ops/scripts/telemetry.mjs'), 'status'], { cwd: consumer, encoding: 'utf8' });
    expect(telemetry.status, telemetry.stderr).toBe(0);
    expect(telemetry.stdout).toContain('OFF');
    expect(existsSync(join(consumer, '.checkpoints'))).toBe(false);
    expect(spawnSync(process.execPath, [join(skillRoot, 'oc-checkpoint-protocol/scripts/checkpoint.mjs'), 'list'], { cwd: consumer }).status).toBe(0);
    expect(spawnSync(process.execPath, [join(skillRoot, 'oc-update/scripts/update.mjs'), '--help'], { cwd: consumer }).status).toBe(0);
    expect((await installBundle(fetched, { root: consumer })).changed).toBe(0);
  // Two full installs plus three CLI spawns: ~0.6s idle, past vitest's 5s
  // default under load (commit-gate timeout on 2026-09-17).
  }, 30_000);

  it('executes the distributed updater CLI with an offline first-party transport', () => {
    const consumer = join(temp, 'cli-consumer');
    mkdirSync(consumer);
    const preload = join(temp, 'transport.mjs');
    writeFileSync(preload, `import { readFileSync } from 'node:fs';
      import { join } from 'node:path';
      globalThis.fetch = async url => {
        if (new URL(url).origin !== 'https://opchain.dev') throw new Error('unexpected origin');
        return new Response(readFileSync(join(${JSON.stringify(pub)}, new URL(url).pathname)));
      };`);
    const run = args => spawnSync(process.execPath, ['--import', preload, join(pub, 'update.mjs'), ...args], { cwd: consumer, encoding: 'utf8' });
    const check = run(['--check']);
    expect(check.status, check.stderr).toBe(0);
    expect(check.stdout).toContain('would change');
    expect(existsSync(join(consumer, '.claude'))).toBe(false);
    const install = run([]);
    expect(install.status, install.stderr).toBe(0);
    expect(install.stdout).toContain('updated and verified');
    expect(run([]).stdout).toContain('already current');
    mkdirSync(join(consumer, '.checkpoints'));
    writeFileSync(join(consumer, '.checkpoints/oc-telemetry-ops.checkpoint.json'), '{"telemetry_handle":{"enabled":true}}');
    // A copied historical opt-in is not local consent and must not fail health.
    const copied = run(['--check']);
    expect(copied.status, copied.stderr).toBe(0);
    expect(copied.stdout).toContain('Telemetry: OFF');
    // Explicit local consent with missing usage tables is genuinely unhealthy.
    const db = new DatabaseSync(join(consumer, '.checkpoints/usage.sqlite'));
    db.exec("CREATE TABLE telemetry_meta (key TEXT PRIMARY KEY, value TEXT); INSERT INTO telemetry_meta VALUES ('consent_enabled', 'true');");
    db.close();
    const originalStore = readFileSync(join(consumer, '.checkpoints/usage.sqlite'));
    const unhealthy = run([]);
    expect(unhealthy.status).toBe(2);
    expect(unhealthy.stderr).toContain('telemetry needs attention');
    const unhealthyCheck = run(['--check']);
    expect(unhealthyCheck.status).toBe(2);
    expect(unhealthyCheck.stderr).toContain('without installing');
    expect(unhealthyCheck.stderr).not.toContain('Skills are ready');
    expect(readFileSync(join(consumer, '.checkpoints/usage.sqlite'))).toEqual(originalStore);
    const alias = join(temp, 'public-alias');
    symlinkSync(pub, alias, 'dir');
    const aliased = spawnSync(process.execPath, [join(alias, 'update.mjs'), '--help'], { cwd: consumer, encoding: 'utf8' });
    expect(aliased.status, aliased.stderr).toBe(0);
    expect(aliased.stdout).toContain('opchain update');
  // Seven updater CLI spawns take ~1.3s idle but 5.7s on a loaded machine; at
  // vitest's 5s default this flaked the commit gate's tests check.
  }, 30_000);
});

describe('bootstrap execution', () => {
  it('executes only a fully downloaded script and forwards arguments', () => {
    const bin = join(temp, 'bin');
    mkdirSync(bin);
    const curl = join(bin, 'curl');
    // Fake only the transport, using the real shell and Node interpreter.
    writeFileSync(curl, '#!/bin/sh\nwhile [ "$#" -gt 0 ]; do if [ "$1" = "-o" ]; then shift; dest="$1"; fi; shift; done\nprintf \'console.log(JSON.stringify(process.argv.slice(2)))\\n\' > "$dest"\nexit "${CURL_EXIT:-0}"\n');
    chmodSync(curl, 0o755);
    const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
    const ok = spawnSync('sh', [join(pub, 'update'), '--check', '--root=/path with spaces'], { env, encoding: 'utf8' });
    expect(ok.status, ok.stderr).toBe(0);
    expect(JSON.parse(ok.stdout)).toEqual(['--check', '--root=/path with spaces']);
    const failed = spawnSync('sh', [join(pub, 'update')], { env: { ...env, CURL_EXIT: '22' }, encoding: 'utf8' });
    expect(failed.status).toBe(22);
    expect(failed.stdout).toBe('');
    const truncated = readFileSync(join(pub, 'update'), 'utf8').split('\n').slice(0, -2).join('\n');
    const partial = spawnSync('sh', [], { input: truncated, env, encoding: 'utf8' });
    expect(partial.stdout).toBe('');
  });
});

describe('update download HTTP routes', () => {
  it.each(['/update', '/update.mjs', '/opchain-update/latest.json'])(
    'serves %s with a revalidated cache policy', async path => {
      const env = { ASSETS: { fetch: async () => new Response('artifact') } };
      const result = await worker.fetch(new Request(`https://opchain.dev${path}`), env);
      expect(result.status).toBe(200);
      expect(result.headers.get('Cache-Control')).toBe('no-cache');
      expect(result.headers.get('Content-Type')).toBe(path.endsWith('.json') ? 'application/json' : 'text/plain; charset=utf-8');
      expect(await result.text()).toBe('artifact');
    });
  it('caches a digest-addressed payload immutably and rejects an HTML fallback', async () => {
    const path = `/opchain-update/${digest('test')}.json`;
    const env = { ASSETS: { fetch: async () => new Response('{}') } };
    const response = await worker.fetch(new Request(`https://opchain.dev${path}`), env);
    expect(response.headers.get('Cache-Control')).toContain('immutable');
    env.ASSETS.fetch = async () => new Response('<html>fallback</html>', { headers: { 'Content-Type': 'text/html' } });
    expect((await worker.fetch(new Request('https://opchain.dev/update'), env)).status).toBe(404);
  });
});
