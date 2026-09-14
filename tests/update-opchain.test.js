import { afterEach, describe, expect, it, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { digest, downloadRelease, installBundle, validateBundle } from '../scripts/update-opchain.mjs';

const roots = [];
const CLAUDE = '.claude/skills';
const CODEX = '.agents/skills';
const LEGACY = '.codex/skills';
const RECEIPT = '.opchain-install.json';
const CONSENT = '.checkpoints/oc-telemetry-ops.checkpoint.json';
const STORE = '.checkpoints/usage.sqlite';
const SKILL = 'oc-telemetry-ops/SKILL.md';
const SKILLS = ['oc-telemetry-ops', 'oc-checkpoint-protocol'];
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));

function temporary() {
  const root = mkdtempSync(join(tmpdir(), 'oc-update-test-'));
  roots.push(root);
  return root;
}
function put(root, path, bytes, mode = 0o644) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), bytes);
  chmodSync(join(root, path), mode);
}
function file(path, text, mode = 0o644) {
  const bytes = Buffer.from(text);
  return { path, mode, content: bytes.toString('base64'), sha256: digest(bytes) };
}
function bundle(version = '2.0.0', extra = []) {
  return {
    schema: 1, version, skills: SKILLS,
    files: [
      ...SKILLS.flatMap(id => [
        file(`${id}/SKILL.md`, `---\nname: ${id}\nversion: ${version}\n---\nRelease ${version}\n`),
        file(`${id}/references/orchestrator.md`, '# Shared protocol\n'),
      ]),
      ...[['oc-telemetry-ops', 'telemetry'], ['oc-checkpoint-protocol', 'checkpoint']].flatMap(([id, name]) => [
        file(`${id}/scripts/${name}.mjs`, '// fixture launcher\n', 0o755),
        file(`${id}/scripts/${name}.runtime.mjs`, '// fixture runtime\n'),
      ]),
      ...extra,
    ],
  };
}
function snapshot(root, subdir = '') {
  const result = {};
  for (const entry of readdirSync(join(root, subdir), { withFileTypes: true })) {
    if (!subdir && ['.opchain-backups', '.opchain-update.lock'].includes(entry.name)) continue;
    const path = subdir ? `${subdir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) Object.assign(result, snapshot(root, path));
    else if (entry.isFile()) result[path] = { content: readFileSync(join(root, path)).toString('base64'), mode: lstatSync(join(root, path)).mode & 0o777 };
  }
  return result;
}
function consent(root, enabled) {
  put(root, CONSENT, JSON.stringify({ protocol_version: '1.1', custom: 'preserve me', telemetry_handle: {
    enabled, id: 'anon-preserve', since: '2026-01-01T00:00:00Z', sink: STORE,
  } }, null, 2) + '\n');
}
function database(root) {
  mkdirSync(join(root, '.checkpoints'), { recursive: true });
  const db = new DatabaseSync(join(root, STORE));
  db.exec('CREATE TABLE runs (id INTEGER); INSERT INTO runs VALUES (1); CREATE TABLE events (id INTEGER);');
  db.close();
}
function seed(root, target, release = bundle()) {
  for (const item of release.files) put(root, `${target}/${item.path}`, Buffer.from(item.content, 'base64'), item.mode);
}

// These fixtures execute installer functions only against temporary directories.
// Download tests supply in-memory responses; no test calls the public service.
describe('repository updater installation', () => {
  it('fresh install writes the full bundle, executable modes, receipt and narrow ignore rules', async () => {
    const root = temporary();
    put(root, 'package.json', '{"name":"consumer"}\n');
    put(root, '.gitignore', '# existing\nnode_modules/');
    const result = await installBundle(bundle(), { root });
    expect(result.targets).toEqual([CLAUDE]);
    expect(result.changed).toBeGreaterThan(0);
    for (const item of bundle().files) {
      const path = join(root, CLAUDE, item.path);
      expect(readFileSync(path)).toEqual(Buffer.from(item.content, 'base64'));
      expect(lstatSync(path).mode & 0o777).toBe(item.mode);
    }
    const receipt = JSON.parse(readFileSync(join(root, RECEIPT)));
    expect(receipt.version).toBe('2.0.0');
    expect(Object.keys(receipt.files)).toHaveLength(bundle().files.length);
    const ignored = readFileSync(join(root, '.gitignore'), 'utf8');
    expect(ignored).toContain('node_modules/');
    expect(ignored).toContain('/.checkpoints/usage.sqlite\n');
    expect(ignored).toContain('/.checkpoints/usage.sqlite-*\n');
    expect(ignored.split('\n')).not.toContain('/.checkpoints/');
    expect(readFileSync(join(root, 'package.json'), 'utf8')).toBe('{"name":"consumer"}\n');
    expect(existsSync(join(root, '.checkpoints'))).toBe(false);
    expect(existsSync(join(root, '.opchain-update.lock'))).toBe(false);
  });

  it('updates managed content and retains exact prior bytes in its backup', async () => {
    const root = temporary();
    await installBundle(bundle('1.9.0'), { root });
    const old = readFileSync(join(root, CLAUDE, SKILL));
    const result = await installBundle(bundle(), { root });
    expect(readFileSync(join(root, CLAUDE, SKILL), 'utf8')).toContain('version: 2.0.0');
    expect(readFileSync(join(root, result.backup, 'files', CLAUDE, SKILL))).toEqual(old);
    expect(JSON.parse(readFileSync(join(root, result.backup, 'journal.json'))).status).toBe('complete');
  });

  it('is idempotent and repairs missing content or changed executable permissions', async () => {
    const root = temporary();
    await installBundle(bundle(), { root });
    const before = snapshot(root);
    const result = await installBundle(bundle(), { root });
    expect(result.changed).toBe(0);
    expect(result.backup).toBe(null);
    expect(snapshot(root)).toEqual(before);
    rmSync(join(root, CLAUDE, 'oc-telemetry-ops/scripts/telemetry.runtime.mjs'));
    chmodSync(join(root, CLAUDE, 'oc-telemetry-ops/scripts/telemetry.mjs'), 0o644);
    const repaired = await installBundle(bundle(), { root });
    expect(repaired.changed).toBe(2);
    expect(snapshot(root)).toEqual(before);
  });

  it('preserves unrelated skills, custom extras, checkpoints, and host configuration', async () => {
    const root = temporary();
    seed(root, CLAUDE, bundle('1.9.0'));
    const preserved = {
      [`${CLAUDE}/my-skill/SKILL.md`]: '# user skill',
      [`${CLAUDE}/oc-telemetry-ops/my-notes.md`]: '# local customization',
      '.checkpoints/oc-app-architect.checkpoint.json': '{"phase":"ongoing"}',
      '.claude/settings.json': '{"hooks":{"custom":true}}',
      '.codex/config.toml': 'existing = true',
    };
    for (const [path, value] of Object.entries(preserved)) put(root, path, value);
    await installBundle(bundle(), { root });
    for (const [path, value] of Object.entries(preserved)) expect(readFileSync(join(root, path), 'utf8')).toBe(value);
  });

  it('backs up local modifications to an upstream file before replacing it', async () => {
    const root = temporary();
    await installBundle(bundle('1.9.0'), { root });
    const local = readFileSync(join(root, CLAUDE, SKILL), 'utf8') + '\nLocal instructions\n';
    put(root, `${CLAUDE}/${SKILL}`, local);
    const result = await installBundle(bundle(), { root });
    expect(readFileSync(join(root, result.backup, 'files', CLAUDE, SKILL), 'utf8')).toBe(local);
  });

  it('removes obsolete unchanged managed files but preserves customized obsolete files', async () => {
    const root = temporary();
    const unchanged = 'oc-telemetry-ops/references/obsolete.md';
    const customized = 'oc-telemetry-ops/references/customized.md';
    await installBundle(bundle('1.9.0', [file(unchanged, 'old'), file(customized, 'old')]), { root });
    put(root, `${CLAUDE}/${customized}`, 'user changes');
    const result = await installBundle(bundle(), { root });
    expect(existsSync(join(root, CLAUDE, unchanged))).toBe(false);
    expect(readFileSync(join(root, CLAUDE, customized), 'utf8')).toBe('user changes');
    expect(result.retained).toContain(`${CLAUDE}/${customized}`);
    expect(JSON.parse(readFileSync(join(root, RECEIPT))).files).not.toHaveProperty(`${CLAUDE}/${customized}`);
  });

  it('check mode reports pending changes without writing files or lock/backup directories', async () => {
    const root = temporary();
    const result = await installBundle(bundle(), { root, check: true });
    expect(result.changed).toBeGreaterThan(0);
    expect(readdirSync(root)).toEqual([]);
  });

  it.each([['codex', [CODEX]], ['both', [CLAUDE, CODEX]]])('supports explicit %s targets', async (target, expected) => {
    const root = temporary();
    expect((await installBundle(bundle(), { root, target })).targets).toEqual(expected);
    for (const dest of expected) expect(existsSync(join(root, dest, SKILL))).toBe(true);
    if (target === 'codex') expect(existsSync(join(root, CLAUDE))).toBe(false);
  });

  it('updates every detected installation and migrates the legacy Codex location', async () => {
    const root = temporary();
    seed(root, CLAUDE, bundle('1.9.0'));
    seed(root, LEGACY, bundle('1.9.0'));
    const result = await installBundle(bundle(), { root });
    expect(new Set(result.targets)).toEqual(new Set([CLAUDE, CODEX, LEGACY]));
    for (const target of [CLAUDE, CODEX, LEGACY]) expect(readFileSync(join(root, target, SKILL), 'utf8')).toContain('version: 2.0.0');
  });
});

describe('telemetry preservation', () => {
  it.each([true, false])('retains consent=%s, identity, timestamps, and database bytes across upgrades', async enabled => {
    const root = temporary();
    consent(root, enabled);
    database(root);
    const cp = readFileSync(join(root, CONSENT));
    const db = readFileSync(join(root, STORE));
    await installBundle(bundle('1.9.0'), { root });
    const result = await installBundle(bundle(), { root });
    expect(result.telemetry.enabled).toBe(enabled);
    expect(result.telemetry.healthy).toBe(true);
    expect(readFileSync(join(root, CONSENT))).toEqual(cp);
    expect(readFileSync(join(root, STORE))).toEqual(db);
  });

  it('preserves absent consent even when a database exists', async () => {
    const root = temporary();
    database(root);
    const db = readFileSync(join(root, STORE));
    const result = await installBundle(bundle(), { root });
    expect(result.telemetry.enabled).toBe(false);
    expect(existsSync(join(root, CONSENT))).toBe(false);
    expect(readFileSync(join(root, STORE))).toEqual(db);
  });

  it('does not modify an active WAL database while inspecting telemetry health', async () => {
    const root = temporary();
    consent(root, true);
    const db = new DatabaseSync(join(root, STORE));
    try {
      db.exec('PRAGMA journal_mode=WAL; CREATE TABLE runs (id INTEGER); INSERT INTO runs VALUES (1); CREATE TABLE events (id INTEGER);');
      const main = readFileSync(join(root, STORE));
      const wal = readFileSync(join(root, STORE + '-wal'));
      const result = await installBundle(bundle(), { root });
      expect(result.telemetry.healthy).toBe(true);
      expect(readFileSync(join(root, STORE))).toEqual(main);
      expect(readFileSync(join(root, STORE + '-wal'))).toEqual(wal);
    } finally { db.close(); }
  });

  it('read-only checks do not create sidecars for a closed WAL database', async () => {
    const root = temporary();
    consent(root, true);
    const db = new DatabaseSync(join(root, STORE));
    db.exec('PRAGMA journal_mode=WAL; CREATE TABLE runs (id INTEGER); INSERT INTO runs VALUES (1); CREATE TABLE events (id INTEGER);');
    db.close();
    expect(existsSync(join(root, STORE + '-wal'))).toBe(false);
    const before = snapshot(root);
    const result = await installBundle(bundle(), { root, check: true });
    expect(result.telemetry).toMatchObject({ enabled: true, healthy: true });
    expect(result.telemetry.message).toContain('1 recorded runs');
    expect(snapshot(root)).toEqual(before);
  });

  it.each(['missing', 'corrupt'])('reports enabled telemetry with %s database unhealthy without repairing state', async state => {
    const root = temporary();
    consent(root, true);
    if (state === 'corrupt') put(root, STORE, 'this is not SQLite');
    const cp = readFileSync(join(root, CONSENT));
    const result = await installBundle(bundle(), { root });
    expect(result.telemetry).toMatchObject({ enabled: true, healthy: false });
    expect(readFileSync(join(root, CONSENT))).toEqual(cp);
    if (state === 'missing') expect(existsSync(join(root, STORE))).toBe(false);
    else expect(readFileSync(join(root, STORE), 'utf8')).toBe('this is not SQLite');
    expect(existsSync(join(root, CLAUDE, SKILL))).toBe(true);
  });

  it('rejects unreadable consent JSON before any mutation', async () => {
    const root = temporary();
    put(root, CONSENT, '{broken');
    const before = snapshot(root);
    await expect(installBundle(bundle(), { root })).rejects.toThrow();
    expect(snapshot(root)).toEqual(before);
    expect(existsSync(join(root, '.opchain-backups'))).toBe(false);
  });
});

describe('untrusted bundle and local-state validation', () => {
  it.each(['../outside', 'oc-telemetry-ops/../../outside', '/absolute/file', 'oc-telemetry-ops/evil\\file', 'oc-telemetry-ops/./file'])('rejects path %s before writes', async path => {
    const root = temporary();
    await expect(installBundle(bundle('2.0.0', [file(path, 'malicious')]), { root })).rejects.toThrow();
    expect(readdirSync(root)).toEqual([]);
  });

  it('rejects bad hashes, duplicate case-insensitive paths, missing runtimes and file/directory collisions', () => {
    const bad = bundle();
    bad.files[0].sha256 = '0'.repeat(64);
    expect(() => validateBundle(bad)).toThrow(/checksum/i);
    expect(() => validateBundle(bundle('2.0.0', [file('oc-telemetry-ops/skill.md', 'duplicate')]))).toThrow(/duplicate/i);
    expect(() => validateBundle({ ...bundle(), files: bundle().files.filter(f => !f.path.endsWith('telemetry.runtime.mjs')) })).toThrow(/runtime/i);
    expect(() => validateBundle(bundle('2.0.0', [file('oc-telemetry-ops/references', 'collision')]))).toThrow(/collision/i);
  });

  it.each(['.claude', `${CLAUDE}/oc-telemetry-ops`, `${CLAUDE}/${SKILL}`, '.gitignore', RECEIPT])('rejects destination symlink at %s without changing its referent', async path => {
    const root = temporary();
    const outside = temporary();
    put(outside, 'sentinel', 'leave intact');
    mkdirSync(dirname(join(root, path)), { recursive: true });
    symlinkSync(path.endsWith('.md') || [RECEIPT, '.gitignore'].includes(path) ? join(outside, 'sentinel') : outside, join(root, path));
    await expect(installBundle(bundle(), { root })).rejects.toThrow(/symlink/i);
    expect(readFileSync(join(outside, 'sentinel'), 'utf8')).toBe('leave intact');
    expect(readdirSync(outside)).toEqual(['sentinel']);
  });

  it.each(['not json', '{"schema":2,"files":{}}', '{"schema":1,"files":[]}', JSON.stringify({ schema: 1, files: { '../outside': 'a'.repeat(64) } })])('rejects invalid receipt %s before mutation', async receipt => {
    const root = temporary();
    put(root, RECEIPT, receipt);
    const before = snapshot(root);
    await expect(installBundle(bundle(), { root })).rejects.toThrow();
    expect(snapshot(root)).toEqual(before);
  });

  it('refuses downgrade based on either receipt or unmanaged installed skill version', async () => {
    const managed = temporary();
    await installBundle(bundle('2.1.0'), { root: managed });
    const before = snapshot(managed);
    await expect(installBundle(bundle(), { root: managed })).rejects.toThrow(/downgrade|newer/i);
    expect(snapshot(managed)).toEqual(before);
    const unmanaged = temporary();
    seed(unmanaged, CLAUDE, bundle('2.1.0'));
    await expect(installBundle(bundle(), { root: unmanaged })).rejects.toThrow(/newer/i);
    expect(existsSync(join(unmanaged, RECEIPT))).toBe(false);
  });

  it('refuses colliding skill names and active update locks', async () => {
    const collision = temporary();
    put(collision, `${CLAUDE}/${SKILL}`, '---\nname: my-custom-skill\nversion: 1.0.0\n---\n');
    await expect(installBundle(bundle(), { root: collision })).rejects.toThrow(/collision/i);
    const locked = temporary();
    mkdirSync(join(locked, '.opchain-update.lock'));
    put(locked, '.opchain-update.lock/recovery.txt', 'existing recovery journal');
    await expect(installBundle(bundle(), { root: locked })).rejects.toThrow();
    expect(readFileSync(join(locked, '.opchain-update.lock/recovery.txt'), 'utf8')).toBe('existing recovery journal');
    expect(existsSync(join(locked, CLAUDE))).toBe(false);
  });
});

describe('failure recovery', () => {
  it('removes newly created files when a fresh installation fails partway through', async () => {
    const root = temporary();
    put(root, 'README.md', 'consumer-owned');
    const before = snapshot(root);
    await expect(installBundle(bundle(), { root, beforeWrite: (_path, index) => {
      if (index === 3) throw new Error('simulated fresh-install failure');
    } })).rejects.toThrow(/previous files restored/);
    expect(snapshot(root)).toEqual(before);
    expect(existsSync(join(root, '.opchain-update.lock'))).toBe(false);
  });

  it('restores prior bytes and modes after a simulated mid-write failure', async () => {
    const root = temporary();
    await installBundle(bundle('1.9.0'), { root });
    const before = snapshot(root);
    await expect(installBundle(bundle(), { root, beforeWrite: (_path, index) => {
      if (index === 1) throw new Error('simulated disk failure');
    } })).rejects.toThrow(/previous files restored/);
    expect(snapshot(root)).toEqual(before);
    expect(existsSync(join(root, '.opchain-update.lock'))).toBe(false);
    expect(readdirSync(join(root, '.opchain-backups')).length).toBe(2);
  });

  it('preserves concurrent user edits and retains recovery when verification detects a conflict', async () => {
    const root = temporary();
    await installBundle(bundle('1.9.0'), { root });
    const before = snapshot(root);
    await expect(installBundle(bundle(), { root, beforeWrite: (path) => {
      if (path === RECEIPT) put(root, `${CLAUDE}/${SKILL}`, 'tampered during update');
    } })).rejects.toThrow(/Recovery conflict/i);
    expect(readFileSync(join(root, `${CLAUDE}/${SKILL}`), 'utf8')).toBe('tampered during update');
    expect(existsSync(join(root, '.opchain-update.lock'))).toBe(true);
  });

  it('retains the recovery lock when rollback itself cannot restore an applied file', async () => {
    const root = temporary();
    const outside = temporary();
    put(outside, 'sentinel', 'untouched');
    await installBundle(bundle('1.9.0'), { root });
    let first;
    await expect(installBundle(bundle(), { root, beforeWrite: (path, index) => {
      if (!index) first = path;
      if (index === 1) {
        rmSync(join(root, first));
        symlinkSync(join(outside, 'sentinel'), join(root, first));
        throw new Error('simulated rollback obstruction');
      }
    } })).rejects.toThrow();
    expect(readFileSync(join(outside, 'sentinel'), 'utf8')).toBe('untouched');
    expect(existsSync(join(root, '.opchain-update.lock/recovery.txt'))).toBe(true);
  });
});

describe('release downloads', () => {
  function releaseFixture() {
    const release = bundle();
    const bytes = Buffer.from(JSON.stringify(release));
    const descriptor = { schema: 1, version: release.version, sha256: digest(bytes) };
    return { release, bytes, descriptor };
  }

  it('downloads only the pinned digest URL and verifies the complete release', async () => {
    const { release, bytes, descriptor } = releaseFixture();
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(descriptor))).mockResolvedValueOnce(new Response(bytes));
    expect(await downloadRelease(fetcher)).toEqual(release);
    expect(fetcher.mock.calls.map(call => call[0])).toEqual([
      'https://opchain.dev/opchain-update/latest.json',
      `https://opchain.dev/opchain-update/${descriptor.sha256}.json`,
    ]);
    for (const [, options] of fetcher.mock.calls) expect(options.redirect).toBe('error');
  });

  it.each(['network', 'http', 'truncated', 'hash', 'version'])('fails closed for %s download failure', async failure => {
    const { bytes, descriptor } = releaseFixture();
    const fetcher = vi.fn();
    if (failure === 'network') fetcher.mockRejectedValue(new Error('offline'));
    else if (failure === 'http') fetcher.mockResolvedValue(new Response('unavailable', { status: 503 }));
    else {
      if (failure === 'version') descriptor.version = '2.0.1';
      fetcher.mockResolvedValueOnce(new Response(JSON.stringify(descriptor)));
      if (failure === 'truncated') fetcher.mockRejectedValueOnce(new Error('stream terminated'));
      else fetcher.mockResolvedValueOnce(new Response(failure === 'hash' ? Buffer.from('wrong bytes') : bytes));
    }
    await expect(downloadRelease(fetcher)).rejects.toThrow();
  });
});
