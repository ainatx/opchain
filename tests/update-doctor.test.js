import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildUpdateBundle } from '../scripts/build-update-bundle.mjs';
import { COMPONENTS, componentsBanner, doctor, formatDoctor, main, uncommittedInstall } from '../scripts/update-opchain.mjs';

const skill = (id, version) => `---\nname: ${id}\nversion: ${version}\n---\n# ${id}\n`;
const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function put(root, path, text) {
  mkdirSync(join(root, path, '..'), { recursive: true });
  writeFileSync(join(root, path), text);
}

let temp, home, repo;
beforeAll(() => {
  temp = mkdtempSync(join(tmpdir(), 'oc-doctor-'));
  home = join(temp, 'home');
  repo = join(temp, 'repo');

  // Global surface: one skill at an old version.
  put(home, '.claude/skills/oc-foo/SKILL.md', skill('oc-foo', '1.0.0'));
  // Plugin cache (current two-level layout) at 2.0.0, registered in installed_plugins.json.
  const cache = '.claude/plugins/cache/opchain/opchain/2.0.0';
  put(home, `${cache}/skills/oc-foo/SKILL.md`, skill('oc-foo', '2.0.0'));
  put(home, `${cache}/skills/oc-bar/SKILL.md`, skill('oc-bar', '2.0.0'));
  put(home, '.claude/plugins/installed_plugins.json', JSON.stringify({ version: 2, plugins: { 'opchain@opchain': [{ scope: 'user', installPath: join(home, cache), version: '2.0.0' }] } }));

  // Repo-local surface in a git repo: committed oc-foo, then an uncommitted
  // oc-baz install, and HEAD parked one commit behind origin/main.
  mkdirSync(repo);
  git(repo, 'init', '-q', '-b', 'main');
  put(repo, '.claude/skills/oc-foo/SKILL.md', skill('oc-foo', '2.0.0'));
  git(repo, 'add', '.');
  git(repo, 'commit', '-q', '-m', 'install');
  put(repo, 'README.md', 'later\n');
  git(repo, 'add', '.');
  git(repo, 'commit', '-q', '-m', 'later');
  git(repo, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  git(repo, 'reset', '-q', '--hard', 'HEAD~1');
  put(repo, '.agents/skills/oc-baz/SKILL.md', skill('oc-baz', '2.0.0'));
});
afterAll(() => rmSync(temp, { recursive: true, force: true }));
afterEach(() => vi.restoreAllMocks());

describe('components', () => {
  it('says up front what /oc-update cannot ship', () => {
    expect(COMPONENTS.map(c => c.id)).toEqual(['skills', 'plugin-hooks', 'commit-gate-runtime', 'time-cli']);
    const banner = componentsBanner();
    expect(banner).toMatch(/^This command ships: skills\. Cannot update: /);
    expect(banner).toContain('plugin hooks + commit-gate runtime (use /plugin marketplace update opchain)');
    expect(banner).toContain('time CLI (use git pull in ~/repos/opchain-time)');
  });
});

describe('doctor', () => {
  it('enumerates every surface with versions and flags duplicates, mismatches, a dirty install and a parked checkout', () => {
    const report = doctor({ root: repo, home });
    const byName = Object.fromEntries(report.surfaces.map(s => [s.name, s]));
    expect(byName.global).toMatchObject({ count: 1, versions: ['1.0.0'], kinds: ['dir'] });
    expect(byName['repo-local .claude/skills']).toMatchObject({ count: 1, versions: ['2.0.0'] });
    expect(byName['repo-local .agents/skills']).toMatchObject({ count: 1, versions: ['2.0.0'] });
    expect(byName['plugin cache']).toMatchObject({ count: 2, versions: ['2.0.0'], installedVersion: '2.0.0', registered: true });

    const codes = report.findings.map(f => f.code);
    expect(codes).toEqual(expect.arrayContaining(['duplicate-surfaces', 'version-mismatch', 'uncommitted-install', 'parked-checkout']));
    expect(report.findings.find(f => f.code === 'duplicate-surfaces').skills).toEqual(['oc-foo']);
    expect(report.findings.find(f => f.code === 'version-mismatch').versions).toEqual(['1.0.0', '2.0.0']);
    expect(report.findings.find(f => f.code === 'uncommitted-install').message).toContain('installed but NOT committed');
    expect(report.findings.find(f => f.code === 'parked-checkout').message).toBe('checkout 1 commits behind origin/main');
    expect(report.ok).toBe(false);

    const text = formatDoctor(report);
    expect(text).toContain('duplicate surfaces: 1 skills load from more than one place');
    expect(text).toContain('plugin cache');
    expect(text).toContain('installed_plugins.json 2.0.0');
    expect(text).toContain('WARN: version mismatch across surfaces');
  });

  it('is clean for a committed single-surface install and reports symlinked skills', () => {
    const root = join(temp, 'clean');
    mkdirSync(join(root, 'skills/oc-foo'), { recursive: true });
    writeFileSync(join(root, 'skills/oc-foo/SKILL.md'), skill('oc-foo', '3.0.0'));
    mkdirSync(join(root, '.claude/skills'), { recursive: true });
    execFileSync('ln', ['-s', '../../skills/oc-foo', join(root, '.claude/skills/oc-foo')]);
    const report = doctor({ root, home: join(temp, 'empty-home') });
    expect(report.findings).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.surfaces.find(s => s.name === 'repo-local .claude/skills')).toMatchObject({ count: 1, kinds: ['symlink'], versions: ['3.0.0'] });
    expect(formatDoctor(report)).toContain('OK: one version everywhere');
  });

  it('lists worktrees with their lockstep version for an authoring checkout', () => {
    const root = join(temp, 'authoring');
    mkdirSync(root);
    git(root, 'init', '-q', '-b', 'main');
    put(root, 'skills/orchestrator.md', '# rules\n');
    put(root, 'skills/oc-foo/SKILL.md', skill('oc-foo', '4.0.0'));
    git(root, 'add', '.');
    git(root, 'commit', '-q', '-m', 'init');
    git(root, 'worktree', 'add', '-q', join(temp, 'authoring-wt'), '-b', 'feature');
    const report = doctor({ root, home: join(temp, 'empty-home') });
    expect(report.worktrees.length).toBe(2);
    expect(report.worktrees.map(w => w.branch).sort()).toEqual(['feature', 'main']);
    expect(report.worktrees.every(w => w.versions.join() === '4.0.0' && w.count === 1)).toBe(true);
    expect(formatDoctor(report)).toMatch(/worktree\s+\S+authoring-wt\s+1\s+4\.0\.0\s+feature/);
  });

  it('runs from the CLI as `doctor` and `--doctor`, exits 0, and emits JSON on request', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const previousHome = process.env.HOME;
    process.env.HOME = home;
    try {
      expect(await main(['doctor', '--json', `--root=${repo}`])).toBe(0);
      const report = JSON.parse(log.mock.calls.at(-1)[0]);
      expect(report.findings.map(f => f.code)).toContain('duplicate-surfaces');
      expect(await main(['--doctor', `--root=${repo}`])).toBe(0);
      expect(log.mock.calls.at(-1)[0]).toContain('opchain doctor');
    } finally { process.env.HOME = previousHome; }
  });

  it('uncommittedInstall lists only paths under the install targets', () => {
    const dirty = uncommittedInstall(repo);
    expect(dirty).toEqual(['?? .agents/skills/oc-baz/SKILL.md']);
    expect(uncommittedInstall(join(temp, 'empty-home'))).toEqual([]);
  });
});

describe('consumer install messaging', () => {
  it('warns when the install is not committed and short-circuits a no-op second run to one line', async () => {
    const pub = join(temp, 'public');
    const release = buildUpdateBundle({ publicDir: pub });
    expect(release.version).toMatch(/^\d+\.\d+\.\d+$/);
    vi.stubGlobal('fetch', async url => new Response(readFileSync(join(pub, new URL(url).pathname))));
    const consumer = join(temp, 'consumer');
    mkdirSync(consumer);
    git(consumer, 'init', '-q', '-b', 'main');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(await main([`--root=${consumer}`, '--target=claude'])).toBe(0);
    const first = log.mock.calls.flat().join('\n');
    expect(first.split('\n')[0]).toBe(componentsBanner());
    expect(first).toContain('files updated and verified');
    expect(warn.mock.calls.flat().join('\n')).toContain('installed but NOT committed — commit .claude/skills or the next session will run the old version');

    log.mockClear(); warn.mockClear();
    expect(await main([`--root=${consumer}`, '--target=claude', '--check'])).toBe(0);
    const lines = log.mock.calls.flat().join('\n').split('\n');
    expect(lines).toEqual([componentsBanner(), 'Checking the latest Opchain release…', `opchain ${release.version} is already current on .claude/skills. Telemetry: OFF (unchanged).`]);
    expect(warn).not.toHaveBeenCalled(); // --check never nags about commits

    git(consumer, 'add', '.');
    git(consumer, 'commit', '-q', '-m', 'install opchain');
    log.mockClear(); warn.mockClear();
    expect(await main([`--root=${consumer}`, '--target=claude'])).toBe(0);
    expect(log.mock.calls.flat().join('\n')).toContain(`opchain ${release.version} is already current on .claude/skills.`);
    expect(warn).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  }, 60_000);
});
