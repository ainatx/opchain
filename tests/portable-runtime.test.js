import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = [];
afterEach(() => fixtures.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));

function fixture(git = true) {
  const root = mkdtempSync(join(tmpdir(), 'opchain-portable-'));
  fixtures.push(root);
  const skills = join(root, '.agents', 'skills');
  for (const skill of ['oc-telemetry-ops', 'oc-checkpoint-protocol']) {
    cpSync(join(source, 'skills', skill), join(skills, skill), { recursive: true });
  }
  if (git) {
    const result = spawnSync('git', ['init', '-q', root], { encoding: 'utf8' });
    expect(result.status, result.stderr).toBe(0);
  }
  const nested = join(root, 'src', 'nested');
  mkdirSync(nested, { recursive: true });
  return { root, nested, skills };
}

function run(f, name, args, options = {}) {
  const skill = name === 'telemetry' ? 'oc-telemetry-ops' : 'oc-checkpoint-protocol';
  const env = { ...process.env };
  delete env.OPCHAIN_ROOT;
  delete env.OPCHAIN_CHECKPOINTS_DIR;
  return spawnSync(process.execPath, [join(f.skills, skill, 'scripts', `${name}.mjs`), ...args], {
    cwd: options.cwd ?? f.nested, env: { ...env, ...options.env }, encoding: 'utf8',
  });
}

describe('installed portable runtime', () => {
  it('keeps no-consent telemetry off without creating project or installed state', () => {
    const f = fixture();
    const status = run(f, 'telemetry', ['status']);
    expect(status.status, status.stderr).toBe(0);
    expect(status.stdout).toContain('OFF');
    expect(run(f, 'telemetry', ['record', '--skill=oc-app-architect']).status).toBe(0);
    expect(existsSync(join(f.root, '.checkpoints'))).toBe(false);
    expect(existsSync(join(f.skills, 'oc-telemetry-ops', '.checkpoints'))).toBe(false);
    expect(existsSync(join(f.nested, '.checkpoints'))).toBe(false);
  });

  it('meters at the consuming repo root and preserves enabled consent during status and record', () => {
    const f = fixture();
    const enable = run(f, 'telemetry', ['enable']);
    expect(enable.status, enable.stderr).toBe(0);
    const checkpoint = join(f.root, '.checkpoints', 'oc-telemetry-ops.checkpoint.json');
    writeFileSync(checkpoint, '{"legacy":"unchanged"}');
    const before = readFileSync(checkpoint, 'utf8');
    expect(run(f, 'telemetry', ['record', '--skill=oc-app-architect', '--phase=build']).status).toBe(0);
    const status = run(f, 'telemetry', ['status']);
    expect(status.status, status.stderr).toBe(0);
    expect(status.stdout).toContain('1 metered run');
    expect(readFileSync(checkpoint, 'utf8')).toBe(before);
    expect(existsSync(join(f.nested, '.checkpoints'))).toBe(false);
    expect(existsSync(join(f.skills, 'oc-telemetry-ops', '.checkpoints'))).toBe(false);
  });

  it('preserves disabled settings and the existing store byte-for-byte', () => {
    const f = fixture();
    expect(run(f, 'telemetry', ['enable']).status).toBe(0);
    expect(run(f, 'telemetry', ['disable']).status).toBe(0);
    const checkpoint = join(f.root, '.checkpoints', 'oc-telemetry-ops.checkpoint.json');
    const store = join(f.root, '.checkpoints', 'usage.sqlite');
    writeFileSync(checkpoint, '{"legacy":"unchanged"}');
    const before = readFileSync(checkpoint);
    const dbBefore = readFileSync(store);
    expect(run(f, 'telemetry', ['record', '--skill=oc-app-architect']).status).toBe(0);
    expect(run(f, 'telemetry', ['status']).stdout).toContain('OFF');
    expect(readFileSync(checkpoint)).toEqual(before);
    expect(readFileSync(store)).toEqual(dbBefore);
  });

  it('executes the guarded checkpoint CLI from a subdirectory', () => {
    const f = fixture();
    mkdirSync(join(f.root, '.checkpoints'));
    writeFileSync(join(f.root, '.checkpoints', 'oc-test.checkpoint.json'), '{"marker":"consuming-repo"}');
    const result = run(f, 'checkpoint', ['show', 'oc-test']);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('consuming-repo');
  });

  it('honors an explicit root and falls back to cwd outside Git', () => {
    const f = fixture(false);
    expect(run(f, 'telemetry', ['enable'], { cwd: f.root }).status).toBe(0);
    expect(existsSync(join(f.root, '.checkpoints', 'usage.sqlite'))).toBe(true);
    const status = run(f, 'telemetry', ['status'], { env: { OPCHAIN_ROOT: f.root } });
    expect(status.status, status.stderr).toBe(0);
    expect(status.stdout).toContain('ENABLED');
    expect(existsSync(join(f.nested, '.checkpoints'))).toBe(false);
  });

  it('checks distributed runtime and launcher drift', () => {
    const f = fixture(false);
    cpSync(join(source, 'skills', 'orchestrator.md'), join(f.skills, 'orchestrator.md'));
    const check = () => spawnSync(process.execPath, [join(source, 'scripts', 'sync-skill-bundles.mjs'), '--check'], {
      env: { ...process.env, OPCHAIN_SKILLS_DIR: f.skills }, encoding: 'utf8',
    });
    expect(check().status).toBe(0);
    writeFileSync(join(f.skills, 'oc-telemetry-ops', 'scripts', 'telemetry.runtime.mjs'), '// stale');
    rmSync(join(f.skills, 'oc-checkpoint-protocol', 'scripts', 'checkpoint.mjs'));
    const result = check();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('telemetry.runtime.mjs');
    expect(result.stderr).toContain('checkpoint.mjs (missing)');
  });
});
