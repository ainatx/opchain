import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildUpdateBundle } from '../scripts/build-update-bundle.mjs';
import { COMPONENTS, KNOWN_PLUGINS, claudeConfigDir, componentsBanner, doctor, findClaudeCli, formatDoctor, main, pluginState, uncommittedInstall } from '../scripts/update-opchain.mjs';

const skill = (id, version) => `---\nname: ${id}\nversion: ${version}\n---\n# ${id}\n`;
// gc.auto=0: committing a full skills install leaves enough loose objects for a
// detached `git gc --auto`, which can still be writing into tmp during afterAll.
const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', '-c', 'gc.auto=0', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function put(root, path, text) {
  mkdirSync(join(root, path, '..'), { recursive: true });
  writeFileSync(join(root, path), text);
}

// Every Claude config dir here is a fake under tmp; the real ~/.claude is never read.
let temp, config, repo;
beforeAll(() => {
  temp = mkdtempSync(join(tmpdir(), 'oc-doctor-'));
  config = join(temp, 'config');
  repo = join(temp, 'repo');

  // Global surface: one skill at an old version.
  put(config, 'skills/oc-foo/SKILL.md', skill('oc-foo', '1.0.0'));
  // Plugin cache (current two-level layout) at 2.0.0, registered in installed_plugins.json.
  const cache = 'plugins/cache/opchain/opchain/2.0.0';
  put(config, `${cache}/skills/oc-foo/SKILL.md`, skill('oc-foo', '2.0.0'));
  put(config, `${cache}/skills/oc-bar/SKILL.md`, skill('oc-bar', '2.0.0'));
  put(config, 'plugins/installed_plugins.json', JSON.stringify({ version: 2, plugins: { 'opchain@opchain': [{ scope: 'user', installPath: join(config, cache), version: '2.0.0' }] } }));

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
    const report = doctor({ root: repo, configDir: config });
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
    expect(text).toContain('user scope; installed_plugins.json 2.0.0');
    expect(text).toContain('WARN: version mismatch across surfaces');
  });

  it('is clean for a committed single-surface install and reports symlinked skills', () => {
    const root = join(temp, 'clean');
    mkdirSync(join(root, 'skills/oc-foo'), { recursive: true });
    writeFileSync(join(root, 'skills/oc-foo/SKILL.md'), skill('oc-foo', '3.0.0'));
    mkdirSync(join(root, '.claude/skills'), { recursive: true });
    execFileSync('ln', ['-s', '../../skills/oc-foo', join(root, '.claude/skills/oc-foo')]);
    const report = doctor({ root, configDir: join(temp, 'empty-config') });
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
    const report = doctor({ root, configDir: join(temp, 'empty-config') });
    expect(report.worktrees.length).toBe(2);
    expect(report.worktrees.map(w => w.branch).sort()).toEqual(['feature', 'main']);
    expect(report.worktrees.every(w => w.versions.join() === '4.0.0' && w.count === 1)).toBe(true);
    expect(formatDoctor(report)).toMatch(/worktree\s+\S+authoring-wt\s+1\s+4\.0\.0\s+feature/);
  });

  it('runs from the CLI as `doctor` and `--doctor`, exits 0, and emits JSON on request', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.stubEnv('CLAUDE_CONFIG_DIR', config);
    try {
      expect(await main(['doctor', '--json', `--root=${repo}`])).toBe(0);
      const report = JSON.parse(log.mock.calls.at(-1)[0]);
      expect(report.findings.map(f => f.code)).toContain('duplicate-surfaces');
      expect(await main(['--doctor', `--root=${repo}`])).toBe(0);
      expect(log.mock.calls.at(-1)[0]).toContain('opchain doctor');
    } finally { vi.unstubAllEnvs(); }
  });

  it('uncommittedInstall lists only paths under the install targets', () => {
    const dirty = uncommittedInstall(repo);
    expect(dirty).toEqual(['?? .agents/skills/oc-baz/SKILL.md']);
    expect(uncommittedInstall(join(temp, 'empty-config'))).toEqual([]);
  });
});

const OPCHAIN = KNOWN_PLUGINS[0];
const OW_TOOLS = KNOWN_PLUGINS[1];
const settings = (root, file, data) => put(root, `.claude/${file}`, JSON.stringify(data));
const installed = (dir, plugins, version = 2) => put(dir, 'plugins/installed_plugins.json', JSON.stringify({ version, plugins }));
const marketplaces = (...plugins) => Object.fromEntries(plugins.map(p => [p.marketplace, { source: { ...p.source } }]));

describe('pluginState', () => {
  it('knows exactly the two first-party plugins and their marketplace sources', () => {
    expect(KNOWN_PLUGINS.map(p => [p.id, p.marketplace])).toEqual([['opchain@opchain', 'opchain'], ['ow-tools@opchain-work-tools', 'opchain-work-tools']]);
    expect(OPCHAIN.source).toEqual({ source: 'github', repo: 'asfbay-bit/opchain-skills' });
    expect(OW_TOOLS.source).toEqual({ source: 'url', url: 'https://raw.githubusercontent.com/asfbay-bit/opchain-skills/main/plugins/ow-tools/.claude-plugin/marketplace.json' });
  });

  it('counts user entries and project/local entries for this repo only, and reads enabledPlugins per settings file', () => {
    const base = join(temp, 'scopes');
    const root = join(base, 'repo');
    const other = join(base, 'other');
    const cfg = join(base, 'config');
    mkdirSync(root, { recursive: true });
    mkdirSync(other, { recursive: true });
    symlinkSync(root, join(base, 'repo-link')); // projectPath recorded through a symlink still matches
    settings(root, 'settings.json', { extraKnownMarketplaces: marketplaces(OPCHAIN), enabledPlugins: { 'opchain@opchain': true } });
    settings(root, 'settings.local.json', { extraKnownMarketplaces: marketplaces(OW_TOOLS), enabledPlugins: { 'ow-tools@opchain-work-tools': true, 'opchain@opchain': false } });
    installed(cfg, {
      'opchain@opchain': [
        { scope: 'user', version: '2.0.4', installPath: join(cfg, 'cache/opchain/2.0.4') },
        { scope: 'project', version: '2.1.0', installPath: join(cfg, 'cache/opchain/2.1.0'), projectPath: join(base, 'repo-link') },
        { scope: 'project', version: '9.9.9', installPath: join(cfg, 'cache/opchain/9.9.9'), projectPath: other },
      ],
      'ow-tools@opchain-work-tools': [
        { scope: 'local', version: '1.0.0', installPath: join(cfg, 'cache/ow-tools/1.0.0'), projectPath: root },
        { scope: 'local', version: '0.9.0', installPath: join(cfg, 'cache/ow-tools/0.9.0'), projectPath: other },
      ],
    });

    const [opchain, owTools] = pluginState(root, { configDir: cfg });
    expect(opchain).toMatchObject({ id: 'opchain@opchain', marketplace: 'opchain', sourceOk: true, enabledHere: true, enabledIn: ['project'], scope: 'project', installedVersion: '2.1.0', installPath: join(cfg, 'cache/opchain/2.1.0') });
    expect(opchain.entries.map(e => `${e.scope}@${e.version}`)).toEqual(['project@2.1.0', 'user@2.0.4']);
    expect(owTools).toMatchObject({ id: 'ow-tools@opchain-work-tools', sourceOk: true, enabledHere: true, enabledIn: ['local'], scope: 'local', installedVersion: '1.0.0' });
    expect(owTools.entries).toHaveLength(1);

    // From the other repo, its own project install wins and this repo's does not count.
    const fromOther = pluginState(other, { configDir: cfg });
    expect(fromOther[0].entries.map(e => `${e.scope}@${e.version}`)).toEqual(['project@9.9.9', 'user@2.0.4']);
    expect(fromOther[0]).toMatchObject({ sourceOk: false, enabledHere: false, enabledIn: [] });
  });

  it('tolerates a missing installed_plugins.json and missing settings', () => {
    const root = join(temp, 'bare');
    mkdirSync(root, { recursive: true });
    const rows = pluginState(root, { configDir: join(temp, 'no-config') });
    expect(rows.map(r => r.id)).toEqual(KNOWN_PLUGINS.map(p => p.id));
    for (const row of rows) expect(row).toMatchObject({ sourceOk: false, enabledHere: false, enabledIn: [], scope: null, installedVersion: null, installPath: null, entries: [] });
  });

  it('reads the older single-object shape as a user install', () => {
    const cfg = join(temp, 'old-config');
    installed(cfg, { 'opchain@opchain': { version: '1.9.1', installPath: join(cfg, 'cache/opchain/1.9.1') } }, 1);
    const [opchain] = pluginState(repo, { configDir: cfg });
    expect(opchain).toMatchObject({ scope: 'user', installedVersion: '1.9.1', installPath: join(cfg, 'cache/opchain/1.9.1') });
  });

  it('marks an unrecognised marketplace source as not ok', () => {
    const cfg = join(temp, 'no-config');
    const sourceOk = (project, local) => {
      const root = mkdtempSync(join(temp, 'source-'));
      if (project) settings(root, 'settings.json', { extraKnownMarketplaces: project });
      if (local) settings(root, 'settings.local.json', { extraKnownMarketplaces: local });
      return pluginState(root, { configDir: cfg })[0].sourceOk;
    };
    expect(sourceOk(marketplaces(OPCHAIN))).toBe(true);
    expect(sourceOk({ opchain: { source: { source: 'github', repo: 'someone/opchain-fork' } } })).toBe(false);
    expect(sourceOk({ opchain: { source: { ...OPCHAIN.source, ref: 'evil' } } })).toBe(false);
    expect(sourceOk({ opchain: { source: { source: 'url', url: OW_TOOLS.source.url } } })).toBe(false);
    expect(sourceOk(marketplaces(OPCHAIN), { opchain: { source: { source: 'github', repo: 'someone/opchain-fork' } } })).toBe(false);
  });

  it('honours CLAUDE_CONFIG_DIR, falling back to $HOME/.claude', () => {
    expect(claudeConfigDir({ CLAUDE_CONFIG_DIR: '/x/config', HOME: '/h' })).toBe('/x/config');
    expect(claudeConfigDir({ HOME: '/h' })).toBe(join('/h', '.claude'));
    const cfg = join(temp, 'env-config');
    installed(cfg, { 'opchain@opchain': [{ scope: 'user', version: '3.3.3', installPath: join(cfg, 'cache/opchain/3.3.3') }] });
    vi.stubEnv('CLAUDE_CONFIG_DIR', cfg);
    try {
      expect(pluginState(repo)[0].installedVersion).toBe('3.3.3');
      expect(doctor({ root: repo }).configDir).toBe(cfg);
      expect(doctor({ root: repo }).surfaces.find(s => s.name === 'global').path).toBe(join(cfg, 'skills'));
    } finally { vi.unstubAllEnvs(); }
  });
});

describe('doctor plugin surfaces', () => {
  it('counts the plugin only via the user entry in the 2026-10-16 layout (1 user + 3 project installs for other repos)', () => {
    const base = join(temp, 'layout');
    const cfg = join(base, 'config');
    const root = join(base, 'repo');
    put(root, '.claude/skills/oc-foo/SKILL.md', skill('oc-foo', '2.0.4'));
    const cache = version => join(cfg, 'plugins/cache/opchain/opchain', version);
    const otherRepos = ['wt-a', 'try', 'deftwright'].map(name => join(base, name));
    for (const dir of otherRepos) mkdirSync(dir, { recursive: true });
    // The other repos' caches hold a different version: counting any of them would
    // add a version-mismatch finding and a second plugin surface.
    put(cache('2.0.4'), 'skills/oc-foo/SKILL.md', skill('oc-foo', '2.0.4'));
    put(cache('1.0.0'), 'skills/oc-foo/SKILL.md', skill('oc-foo', '1.0.0'));
    installed(cfg, { 'opchain@opchain': [
      { scope: 'user', version: '2.0.4', installPath: cache('2.0.4') },
      ...otherRepos.map(projectPath => ({ scope: 'project', version: '1.0.0', installPath: cache('1.0.0'), projectPath })),
    ] });

    const report = doctor({ root, configDir: cfg });
    const pluginSurfaces = report.surfaces.filter(s => s.scope === 'plugin');
    expect(pluginSurfaces).toHaveLength(1);
    expect(pluginSurfaces[0]).toMatchObject({ path: join(cache('2.0.4'), 'skills'), pluginScope: 'user', installedVersion: '2.0.4', versions: ['2.0.4'] });
    expect(report.plugins[0]).toMatchObject({ scope: 'user', installedVersion: '2.0.4', entries: [expect.objectContaining({ scope: 'user' })] });
    const codes = report.findings.map(f => f.code);
    expect(codes).toContain('duplicate-surfaces'); // repo-local + user plugin, both 2.0.4
    expect(codes).not.toContain('version-mismatch');
    expect(codes).not.toContain('plugin-cache-missing');
  });

  it('lists ow-tools by version only and reports whether each plugin is enabled repo-wide', () => {
    const base = join(temp, 'ow');
    const cfg = join(base, 'config');
    const root = join(base, 'repo');
    mkdirSync(root, { recursive: true });
    settings(root, 'settings.json', { extraKnownMarketplaces: marketplaces(OPCHAIN, OW_TOOLS), enabledPlugins: { 'ow-tools@opchain-work-tools': true } });
    put(join(cfg, 'cache/ow-tools/1.0.0'), 'hooks/hooks.json', '{}');
    installed(cfg, { 'ow-tools@opchain-work-tools': [{ scope: 'project', version: '1.0.0', installPath: join(cfg, 'cache/ow-tools/1.0.0'), projectPath: root }] });

    const report = doctor({ root, configDir: cfg });
    expect(report.surfaces.filter(s => s.scope === 'plugin')).toEqual([]); // no oc- skills, no skill surface
    expect(report.findings).toEqual([]); // and no plugin-cache-missing for a plugin that ships no skills/
    const text = formatDoctor(report);
    expect(text).toMatch(/opchain@opchain\s+no\s+no\s+marketplace source ok/);
    expect(text).toMatch(/ow-tools@opchain-work-tools\s+1\.0\.0 \(project\)\s+yes\s+marketplace source ok/);
  });

  it('flags a counted install whose cache has no skills/ directory, and treats project + user sharing a cache as one surface', () => {
    const base = join(temp, 'shared');
    const cfg = join(base, 'config');
    const root = join(base, 'repo');
    mkdirSync(root, { recursive: true });
    const shared = join(cfg, 'cache/opchain/2.0.4');
    put(shared, 'skills/oc-foo/SKILL.md', skill('oc-foo', '2.0.4'));
    installed(cfg, { 'opchain@opchain': [
      { scope: 'user', version: '2.0.4', installPath: shared },
      { scope: 'project', version: '2.0.4', installPath: shared, projectPath: realpathSync(root) },
      { scope: 'local', version: '2.1.0', installPath: join(cfg, 'cache/opchain/gone'), projectPath: root },
    ] });
    const report = doctor({ root, configDir: cfg });
    expect(report.surfaces.filter(s => s.scope === 'plugin').map(s => s.pluginScope)).toEqual(['project']);
    expect(report.findings.map(f => f.code)).toEqual(['plugin-cache-missing']);
    expect(report.findings[0].message).toContain('opchain@opchain 2.1.0 (local)');
  });
});

describe('consumer install messaging', () => {
  it('warns when the install is not committed and short-circuits a no-op second run to one line', async () => {
    const pub = join(temp, 'public');
    const release = buildUpdateBundle({ publicDir: pub });
    expect(release.version).toMatch(/^\d+\.\d+\.\d+$/);
    vi.stubGlobal('fetch', async url => new Response(readFileSync(join(pub, new URL(url).pathname))));
    // No plugins enabled here, so the plugin step makes no CLI call and prints one line.
    vi.stubEnv('CLAUDE_CONFIG_DIR', join(temp, 'messaging-config'));
    const banner = componentsBanner({ cli: Boolean(findClaudeCli()) });
    const consumer = join(temp, 'consumer');
    mkdirSync(consumer);
    git(consumer, 'init', '-q', '-b', 'main');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(await main([`--root=${consumer}`, '--target=claude'])).toBe(0);
    const first = log.mock.calls.flat().join('\n');
    expect(first.split('\n')[0]).toBe(banner);
    expect(first).toContain('files updated and verified');
    expect(warn.mock.calls.flat().join('\n')).toContain('installed but NOT committed — commit .claude/skills or the next session will run the old version');

    log.mockClear(); warn.mockClear();
    expect(await main([`--root=${consumer}`, '--target=claude', '--check'])).toBe(0);
    const lines = log.mock.calls.flat().join('\n').split('\n');
    expect(lines).toEqual([banner, 'Checking the latest Opchain release…', `opchain ${release.version} is already current on .claude/skills. Telemetry: OFF (unchanged).`, 'Plugins: none enabled for this repository.']);
    expect(warn).not.toHaveBeenCalled(); // --check never nags about commits

    git(consumer, 'add', '.');
    git(consumer, 'commit', '-q', '-m', 'install opchain');
    log.mockClear(); warn.mockClear();
    expect(await main([`--root=${consumer}`, '--target=claude'])).toBe(0);
    expect(log.mock.calls.flat().join('\n')).toContain(`opchain ${release.version} is already current on .claude/skills.`);
    expect(warn).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  }, 60_000);
});
