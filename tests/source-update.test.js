import { afterEach, describe, expect, it, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import * as updater from '../scripts/update-opchain.mjs';

const SOURCE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IDS = ['oc-checkpoint-protocol', 'oc-telemetry-ops'];
const SKILL = 'skills/oc-telemetry-ops/SKILL.md';
const LINK = '.claude/skills/oc-telemetry-ops';
const CONSENT = '.checkpoints/oc-telemetry-ops.checkpoint.json';
const STORE = '.checkpoints/usage.sqlite';
const roots = [];
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true }));
});
function temp() {
  const root = mkdtempSync(join(tmpdir(), 'oc-source-update-'));
  roots.push(root);
  return root;
}
function put(root, path, content) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}
function fixture({ git = true } = {}) {
  const root = temp();
  for (const id of IDS) cpSync(join(SOURCE, 'skills', id), join(root, 'skills', id), { recursive: true });
  put(root, 'skills/orchestrator.md', readFileSync(join(SOURCE, 'skills/orchestrator.md'), 'utf8') + '\nLocal checkout authoritative marker.\n');
  for (const file of ['local-checkpoint-store.js', 'checkpoint-store.js']) put(root, `src/lib/mcp/${file}`, readFileSync(join(SOURCE, 'src/lib/mcp', file)));
  cpSync(join(SOURCE, 'scripts'), join(root, 'scripts'), { recursive: true });
  put(root, 'package.json', '{"name":"opchain-source-fixture","type":"module"}\n');
  if (git) {
    const init = spawnSync('git', ['init', '-q', root], { encoding: 'utf8' });
    expect(init.status, init.stderr).toBe(0);
  }
  return root;
}
function files(root, subdir = '', includeRecovery = false) {
  const out = {};
  for (const entry of readdirSync(join(root, subdir), { withFileTypes: true })) {
    if (!subdir && (entry.name === '.git' || (!includeRecovery && ['.opchain-backups', '.opchain-update.lock'].includes(entry.name)))) continue;
    const path = subdir ? `${subdir}/${entry.name}` : entry.name;
    const stat = lstatSync(join(root, path));
    if (stat.isSymbolicLink()) out[path] = { link: readlinkSync(join(root, path)) };
    else if (stat.isDirectory()) Object.assign(out, files(root, path, includeRecovery));
    else out[path] = { bytes: readFileSync(join(root, path)).toString('base64'), mode: stat.mode & 0o777 };
  }
  return out;
}
function generatorsPass(root) {
  for (const script of ['sync-skill-bundles.mjs', 'sync-plugin-skills.mjs']) {
    const env = { ...process.env };
    delete env.OPCHAIN_SKILLS_DIR;
    const check = spawnSync(process.execPath, [join(root, 'scripts', script), '--check'], { cwd: root, env, encoding: 'utf8' });
    expect(check.status, check.stderr).toBe(0);
  }
}
function store(root, enabled) {
  put(root, CONSENT, JSON.stringify({ telemetry_handle: { enabled, id: 'anon-existing', since: '2026-01-01T00:00:00Z', sink: STORE }, custom: 'keep exact checkpoint formatting' }, null, 4) + '\n');
  const db = new DatabaseSync(join(root, STORE));
  db.exec('CREATE TABLE runs (id INTEGER); INSERT INTO runs VALUES (1); CREATE TABLE events (id INTEGER);');
  db.close();
}

describe('source repository update', () => {
  it.each([true, false])('rejects a concurrent source edit even when check=%s would otherwise report current', async check => {
    const root = fixture();
    await updater.syncSourceRepo({ root });
    const scriptPath = 'scripts/sync-plugin-skills.mjs';
    const script = readFileSync(join(root, scriptPath), 'utf8');
    put(root, scriptPath, script + `\nimport { appendFileSync as simulateEditor } from 'node:fs';\nsimulateEditor(${JSON.stringify(join(root, 'scripts/telemetry.mjs'))}, '\\n// concurrent source edit\\n');\n`);
    const before = readFileSync(join(root, 'skills/oc-telemetry-ops/scripts/runtime/scripts/telemetry.mjs'));
    await expect(updater.syncSourceRepo({ root, check })).rejects.toThrow('Source changed while preparing update: scripts');
    expect(readFileSync(join(root, 'skills/oc-telemetry-ops/scripts/runtime/scripts/telemetry.mjs'))).toEqual(before);
  });

  it('automatically selects the checked-out source path before any network call', async () => {
    const root = fixture();
    const fetch = vi.fn(() => { throw new Error('network must not be called for a source checkout'); });
    vi.stubGlobal('fetch', fetch);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await updater.main([`--root=${root}`]);
    expect(result).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
    generatorsPass(root);
    expect(lstatSync(join(root, LINK)).isSymbolicLink()).toBe(true);
    expect(realpathSync(join(root, LINK))).toBe(realpathSync(join(root, 'skills/oc-telemetry-ops')));
  });

  it('checks drift without creating or modifying any repository files', async () => {
    const root = fixture();
    put(root, 'plugins/opchain/skills/oc-telemetry-ops/references/orchestrator.md', 'stale plugin reference');
    const before = files(root, '', true);
    const entries = readdirSync(root);
    const result = await updater.syncSourceRepo({ root, check: true });
    expect(result.changed).toBeGreaterThan(0);
    expect(files(root, '', true)).toEqual(before);
    expect(readdirSync(root)).toEqual(entries);
    expect(existsSync(join(root, '.opchain-update.lock'))).toBe(false);
  });

  it('repairs bundled references, runtimes, and plugin drift from local canonical files', async () => {
    const root = fixture();
    const localSkill = readFileSync(join(root, SKILL), 'utf8') + '\nUncommitted local skill instruction.\n';
    put(root, SKILL, localSkill);
    const localRuntime = readFileSync(join(root, 'scripts/telemetry.mjs'), 'utf8') + '\n// Local canonical runtime marker.\n';
    put(root, 'scripts/telemetry.mjs', localRuntime);
    put(root, 'skills/oc-telemetry-ops/references/orchestrator.md', 'stale generated reference');
    put(root, 'skills/oc-telemetry-ops/scripts/runtime/scripts/telemetry.mjs', 'stale generated runtime');
    put(root, 'plugins/opchain/skills/oc-telemetry-ops/SKILL.md', 'stale plugin copy');
    put(root, 'plugins/opchain/skills/oc-telemetry-ops/obsolete-generated.md', 'stale extra');
    const result = await updater.syncSourceRepo({ root });
    expect(result.changed).toBeGreaterThan(0);
    expect(readFileSync(join(root, SKILL), 'utf8')).toBe(localSkill);
    expect(readFileSync(join(root, 'plugins/opchain', SKILL), 'utf8')).toBe(localSkill);
    expect(readFileSync(join(root, 'skills/oc-telemetry-ops/scripts/runtime/scripts/telemetry.mjs'), 'utf8')).toBe(localRuntime);
    expect(readFileSync(join(root, 'skills/oc-telemetry-ops/references/orchestrator.md'))).toEqual(readFileSync(join(root, 'skills/orchestrator.md')));
    expect(existsSync(join(root, 'plugins/opchain/skills/oc-telemetry-ops/obsolete-generated.md'))).toBe(false);
    generatorsPass(root);
  });

  it('adds missing and repairs broken in-repository skill links', async () => {
    const root = fixture();
    mkdirSync(join(root, '.claude/skills'), { recursive: true });
    symlinkSync('../../skills/oc-retired-missing', join(root, LINK));
    await updater.syncSourceRepo({ root });
    for (const id of IDS) {
      const link = join(root, '.claude/skills', id);
      expect(lstatSync(link).isSymbolicLink()).toBe(true);
      expect(readlinkSync(link)).toBe(`../../skills/${id}`);
      expect(realpathSync(link)).toBe(realpathSync(join(root, 'skills', id)));
    }
  });

  it('is idempotent once generated copies and source links agree', async () => {
    const root = fixture();
    await updater.syncSourceRepo({ root });
    const before = files(root, '', true);
    const result = await updater.syncSourceRepo({ root });
    expect(result.changed).toBe(0);
    expect(files(root, '', true)).toEqual(before);
  });

  it('preserves unrelated work, host config, custom skills, and source skill extras', async () => {
    const root = fixture();
    const preserved = {
      'src/uncommitted.js': 'export const work = "in progress";\n',
      '.claude/settings.json': '{"hooks":{"custom":true}}\n',
      '.claude/skills/my-personal/SKILL.md': '# unrelated personal skill\n',
      'skills/oc-telemetry-ops/custom-notes.md': '# keep my source customization\n',
      'plugins/opchain/hooks/custom.cjs': '// existing host hook\n',
      '.checkpoints/oc-app-architect.checkpoint.json': '{"phase":"working"}\n',
    };
    for (const [path, content] of Object.entries(preserved)) put(root, path, content);
    await updater.syncSourceRepo({ root });
    for (const [path, content] of Object.entries(preserved)) expect(readFileSync(join(root, path), 'utf8')).toBe(content);
  });

  it.each([true, false])('preserves consent=%s, identifiers, timestamps, and SQLite bytes', async enabled => {
    const root = fixture();
    store(root, enabled);
    const cp = readFileSync(join(root, CONSENT));
    const db = readFileSync(join(root, STORE));
    await updater.syncSourceRepo({ root });
    expect(readFileSync(join(root, CONSENT))).toEqual(cp);
    expect(readFileSync(join(root, STORE))).toEqual(db);
  });

  it('never creates absent telemetry consent or state', async () => {
    const root = fixture();
    await updater.syncSourceRepo({ root });
    expect(existsSync(join(root, CONSENT))).toBe(false);
    expect(existsSync(join(root, STORE))).toBe(false);
  });

  it.each(['missing', 'corrupt'])('retains enabled telemetry with a %s database without inventing replacement state', async state => {
    const root = fixture();
    store(root, true);
    if (state === 'missing') rmSync(join(root, STORE));
    else put(root, STORE, 'corrupt existing SQLite bytes');
    const before = files(root, '.checkpoints');
    await updater.syncSourceRepo({ root });
    expect(files(root, '.checkpoints')).toEqual(before);
  });

  it.each(['installed skill', 'canonical skill', 'canonical file', 'generator'])('refuses an unsafe outside symlink in %s without touching source or destination', async kind => {
    const root = fixture();
    const outside = temp();
    put(outside, 'sentinel', 'untouched external content');
    let path;
    let destination = outside;
    if (kind === 'installed skill') path = LINK;
    else if (kind === 'canonical skill') path = 'skills/oc-telemetry-ops';
    else if (kind === 'canonical file') { path = 'skills/orchestrator.md'; destination = join(outside, 'sentinel'); }
    else { path = 'scripts/sync-skill-bundles.mjs'; destination = join(outside, 'sentinel'); }
    rmSync(join(root, path), { recursive: true, force: true });
    mkdirSync(dirname(join(root, path)), { recursive: true });
    symlinkSync(destination, join(root, path));
    const before = files(root, '', true);
    await expect(updater.syncSourceRepo({ root })).rejects.toThrow();
    expect(files(root, '', true)).toEqual(before);
    expect(readFileSync(join(outside, 'sentinel'), 'utf8')).toBe('untouched external content');
    expect(readdirSync(outside)).toEqual(['sentinel']);
  });

  it('does not overwrite a user-owned directory where a source link should be', async () => {
    const root = fixture();
    put(root, `${LINK}/SKILL.md`, '# locally owned installed skill');
    const before = files(root, '', true);
    await expect(updater.syncSourceRepo({ root })).rejects.toThrow();
    expect(files(root, '', true)).toEqual(before);
  });

  it('runs both generators in staging and leaves the checkout unchanged if either fails', async () => {
    const root = fixture();
    // Bundling runs first and changes its staging tree. The second generator's
    // failure must prevent both its own output and the first one's from landing.
    put(root, 'scripts/sync-plugin-skills.mjs', 'process.stderr.write("fixture generator failure\\n"); process.exit(23);\n');
    const before = files(root, '', true);
    await expect(updater.syncSourceRepo({ root })).rejects.toThrow(/generator|failed|23/i);
    expect(files(root, '', true)).toEqual(before);
    expect(existsSync(join(root, '.opchain-update.lock'))).toBe(false);
  });

  it('rolls back applied file changes after an injected mid-write failure', async () => {
    const root = fixture();
    put(root, 'plugins/opchain/skills/oc-telemetry-ops/SKILL.md', 'old generated skill copy');
    const before = files(root);
    let called = 0;
    await expect(updater.syncSourceRepo({ root, beforeWrite: (_path, index) => {
      called++;
      if (index === 2) throw new Error('simulated source update write failure');
    } })).rejects.toThrow();
    expect(called).toBeGreaterThan(2);
    expect(files(root)).toEqual(before);
    expect(existsSync(join(root, '.opchain-update.lock'))).toBe(false);
  });

  it('restores the exact prior broken symlink when a later link write fails', async () => {
    const root = fixture();
    mkdirSync(join(root, '.claude/skills'), { recursive: true });
    const first = '.claude/skills/oc-checkpoint-protocol';
    const original = '../../skills/retired-checkpoint-copy';
    symlinkSync(original, join(root, first));
    const before = files(root);
    let links = 0;
    await expect(updater.syncSourceRepo({ root, beforeWrite: path => {
      if (path.startsWith('.claude/skills/') && ++links === 2) throw new Error('simulated link update failure');
    } })).rejects.toThrow();
    expect(links).toBe(2);
    expect(readlinkSync(join(root, first))).toBe(original);
    expect(files(root)).toEqual(before);
  });
});
