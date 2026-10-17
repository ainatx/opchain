import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { appendFileSync, chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { buildUpdateBundle } from '../scripts/build-update-bundle.mjs';
import { EXIT_PLUGINS, KNOWN_PLUGINS, componentsBanner, doctor, findClaudeCli, localSkillCopies, main, updatePlugins } from '../scripts/update-opchain.mjs';

// The plugin step (docs/plans/2026-10-16-oc-update-plugins-design.md §5.2) drives
// the real `claude` CLI. Here a stub `claude` on PATH records every argv and fakes
// what `plugin update` does to installed_plugins.json, under a tmp
// CLAUDE_CONFIG_DIR. PATH holds only the stub and git, so the real CLI and the
// real ~/.claude are never reached.
const [OPCHAIN, OW_TOOLS] = KNOWN_PLUGINS;
let temp, stubBin, gitBin, pub, release;

const STUB = `import { appendFileSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const KNOWN = ${JSON.stringify(KNOWN_PLUGINS)};
const argv = process.argv.slice(2);
appendFileSync(process.env.STUB_LOG, JSON.stringify({ argv, cwd: realpathSync(process.cwd()) }) + '\\n');
const plan = JSON.parse(readFileSync(process.env.STUB_PLAN, 'utf8'));
const call = argv.join(' ');
if ((plan.fail ?? []).some(prefix => call.startsWith(prefix))) {
  process.stderr.write('Error: stub failure for ' + call + '\\nsecond line\\nthird line\\n');
  process.exit(1);
}
if (argv[0] === 'plugin' && argv[1] === 'update') {
  const [id, , scope] = argv.slice(2);
  const file = join(process.env.CLAUDE_CONFIG_DIR, 'plugins/installed_plugins.json');
  const data = JSON.parse(readFileSync(file, 'utf8'));
  for (const entry of data.plugins[id] ?? []) {
    if (entry.scope === scope && realpathSync(entry.projectPath) === realpathSync(process.cwd()) && plan.bump?.[id]) entry.version = plan.bump[id];
  }
  writeFileSync(file, JSON.stringify(data));
}
// What Claude Code does for --with-plugins: declare the marketplace / enable the plugin in the
// repository's settings, record the install, and unpack it (opchain ships skills/).
const settingsFile = join(process.cwd(), '.claude/settings.json');
const settings = () => { try { return JSON.parse(readFileSync(settingsFile, 'utf8')); } catch { return {}; } };
if (argv[0] === 'plugin' && argv[1] === 'marketplace' && argv[2] === 'add') {
  const plugin = KNOWN.find(p => (p.source.repo ?? p.source.url) === argv[3]);
  const data = settings();
  data.extraKnownMarketplaces = { ...data.extraKnownMarketplaces, [plugin.marketplace]: { source: plugin.source } };
  mkdirSync(join(process.cwd(), '.claude'), { recursive: true });
  writeFileSync(settingsFile, JSON.stringify(data));
}
if (argv[0] === 'plugin' && argv[1] === 'install') {
  const [id, , scope] = argv.slice(2);
  const data = settings();
  data.enabledPlugins = { ...data.enabledPlugins, [id]: true };
  writeFileSync(settingsFile, JSON.stringify(data));
  const version = plan.installVersion ?? '9.9.9';
  const installPath = join(process.env.CLAUDE_CONFIG_DIR, 'plugins/cache', id, version);
  if (id.startsWith('opchain@')) {
    mkdirSync(join(installPath, 'skills/oc-update'), { recursive: true });
    writeFileSync(join(installPath, 'skills/oc-update/SKILL.md'), '---\\nname: oc-update\\nversion: ' + version + '\\n---\\n');
  }
  const file = join(process.env.CLAUDE_CONFIG_DIR, 'plugins/installed_plugins.json');
  let installed;
  try { installed = JSON.parse(readFileSync(file, 'utf8')); } catch { installed = { version: 2, plugins: {} }; }
  installed.plugins[id] = [...(installed.plugins[id] ?? []), { scope, version, installPath, projectPath: realpathSync(process.cwd()) }];
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, JSON.stringify(installed));
}
`;

function put(root, path, text) {
  mkdirSync(join(root, path, '..'), { recursive: true });
  writeFileSync(join(root, path), text);
}

beforeAll(() => {
  temp = realpathSync(mkdtempSync(join(tmpdir(), 'oc-update-plugins-')));
  stubBin = join(temp, 'stub-bin');
  put(temp, 'stub.mjs', STUB);
  put(stubBin, 'claude', `#!/bin/sh\nexec "${process.execPath}" "${join(temp, 'stub.mjs')}" "$@"\n`);
  chmodSync(join(stubBin, 'claude'), 0o755);
  // git alone, linked into its own directory: the directory git normally lives in may also hold the real claude.
  gitBin = join(temp, 'git-bin');
  mkdirSync(gitBin);
  const git = (process.env.PATH ?? '').split(delimiter).map(dir => join(dir, 'git')).find(path => existsSync(path));
  symlinkSync(git, join(gitBin, 'git'));
  pub = join(temp, 'public');
  release = buildUpdateBundle({ publicDir: pub });
}, 60_000);
afterAll(() => rmSync(temp, { recursive: true, force: true }));

let repo, config, log, plan;
beforeEach(ctx => {
  const dir = join(temp, ctx.task.id);
  repo = join(dir, 'repo');
  config = join(dir, 'config');
  log = join(dir, 'calls.jsonl');
  plan = join(dir, 'plan.json');
  mkdirSync(repo, { recursive: true });
  mkdirSync(config, { recursive: true });
  writeFileSync(log, '');
  writeFileSync(plan, '{}');
  vi.stubEnv('PATH', [stubBin, gitBin].join(delimiter));
  vi.stubEnv('CLAUDE_CONFIG_DIR', config);
  vi.stubEnv('STUB_LOG', log);
  vi.stubEnv('STUB_PLAN', plan);
  vi.stubGlobal('fetch', async url => new Response(readFileSync(join(pub, new URL(url).pathname))));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const calls = () => readFileSync(log, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
const setPlan = value => writeFileSync(plan, JSON.stringify(value));
const marketplaces = (...plugins) => Object.fromEntries(plugins.map(p => [p.marketplace, { source: { ...p.source } }]));
function enable(file, ...plugins) {
  put(repo, `.claude/${file}`, JSON.stringify({ extraKnownMarketplaces: marketplaces(...plugins), enabledPlugins: Object.fromEntries(plugins.map(p => [p.id, true])) }));
}
function installed(plugins) {
  put(config, 'plugins/installed_plugins.json', JSON.stringify({ version: 2, plugins }));
}
const entry = (scope, version, projectPath) => ({ scope, version, installPath: join(config, 'cache', version), ...(projectPath ? { projectPath } : {}) });
function capture() {
  const out = vi.spyOn(console, 'log').mockImplementation(() => {});
  const err = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  return { out: () => out.mock.calls.flat().join('\n'), err: () => err.mock.calls.flat().join('\n') };
}

describe('updatePlugins', () => {
  it('runs exactly two calls for an enabled plugin from the known source, in the repository, and reports before → after', async () => {
    enable('settings.json', OPCHAIN);
    installed({ [OPCHAIN.id]: [entry('project', '2.0.4', repo)] });
    setPlan({ bump: { [OPCHAIN.id]: '2.1.0' } });
    const io = capture();
    expect(await main(['plugins', `--root=${repo}`])).toBe(0);
    expect(calls()).toEqual([
      { argv: ['plugin', 'marketplace', 'update', 'opchain'], cwd: repo },
      { argv: ['plugin', 'update', 'opchain@opchain', '--scope', 'project'], cwd: repo },
    ]);
    expect(io.out()).toContain('opchain@opchain (project): 2.0.4 → 2.1.0');
    expect(io.out().split('\n').at(-1)).toBe('Restart Claude Code to load the new hooks.');
  });

  it('says already current, without a restart, when the version does not move', () => {
    enable('settings.json', OPCHAIN);
    installed({ [OPCHAIN.id]: [entry('project', '2.1.0', repo)] });
    const result = updatePlugins({ root: repo });
    expect(result).toMatchObject({ failed: false, changed: false, calls: 2 });
    expect(result.lines).toEqual(['Plugins:', '  opchain@opchain (project): already current (2.1.0)']);
  });

  it('updates a local-scope install with --scope local and says it is not shared with the repo', () => {
    enable('settings.local.json', OW_TOOLS);
    installed({ [OW_TOOLS.id]: [entry('local', '1.0.0', repo)] });
    setPlan({ bump: { [OW_TOOLS.id]: '1.1.0' } });
    const result = updatePlugins({ root: repo });
    expect(calls().map(c => c.argv)).toEqual([
      ['plugin', 'marketplace', 'update', 'opchain-work-tools'],
      ['plugin', 'update', 'ow-tools@opchain-work-tools', '--scope', 'local'],
    ]);
    expect(result.lines).toContain('  ow-tools@opchain-work-tools (local, not shared with the repo): 1.0.0 → 1.1.0');
  });

  it('skips a plugin whose marketplace source is not the known one, with zero calls', () => {
    put(repo, '.claude/settings.json', JSON.stringify({
      extraKnownMarketplaces: { opchain: { source: { source: 'github', repo: 'someone/opchain-fork' } } },
      enabledPlugins: { [OPCHAIN.id]: true },
    }));
    installed({ [OPCHAIN.id]: [entry('project', '2.0.4', repo)] });
    const result = updatePlugins({ root: repo });
    expect(calls()).toEqual([]);
    expect(result.failed).toBe(false);
    expect(result.lines.join('\n')).toContain('opchain@opchain: skipped — the "opchain" marketplace source in .claude/settings*.json is not the known Opchain source.');
  });

  it('skips a plugin enabled for the repo but not installed for this user, with zero calls', () => {
    enable('settings.json', OPCHAIN);
    const result = updatePlugins({ root: repo });
    expect(calls()).toEqual([]);
    expect(result.lines.join('\n')).toContain('opchain@opchain (project): enabled but not installed for you; skipped. Run /plugin install opchain@opchain --scope project');
  });

  it('leaves a user-scope install alone and only mentions it when it lags the release', () => {
    installed({ [OPCHAIN.id]: [entry('user', '2.0.0')] });
    expect(updatePlugins({ root: repo, releaseVersion: '2.0.0' }).lines).toEqual(['Plugins: none enabled for this repository.']);
    const lines = updatePlugins({ root: repo, releaseVersion: '2.1.0' }).lines;
    expect(lines.join('\n')).toContain('opchain@opchain (user): 2.0.0 — user scope belongs to your whole machine; /oc-update leaves it alone.');
    expect(calls()).toEqual([]);
  });

  it('stops at a failed marketplace update and reports it, keeping the error short', () => {
    enable('settings.json', OPCHAIN);
    installed({ [OPCHAIN.id]: [entry('project', '2.0.4', repo)] });
    setPlan({ fail: ['plugin marketplace update'] });
    const result = updatePlugins({ root: repo });
    expect(calls()).toHaveLength(1);
    expect(result.failed).toBe(true);
    expect(result.lines).toContain('  opchain@opchain (project): FAILED — marketplace update: Error: stub failure for plugin marketplace update opchain second line');
  });
});

describe('--check', () => {
  it('makes zero CLI calls and compares opchain with the fetched release; ow-tools only reports what is installed', async () => {
    enable('settings.json', OPCHAIN, OW_TOOLS);
    installed({ [OPCHAIN.id]: [entry('project', '1.0.0', repo)], [OW_TOOLS.id]: [entry('project', '1.0.0', repo)] });
    const io = capture();
    expect(await main(['--check', '--target=claude', `--root=${repo}`])).toBe(0);
    expect(calls()).toEqual([]);
    expect(io.out()).toContain(`opchain@opchain (project): installed 1.0.0, available ${release.version}`);
    expect(io.out()).toContain('ow-tools@opchain-work-tools (project): installed 1.0.0; run /oc-update to compare');
    expect(existsSync(join(repo, '.claude/skills'))).toBe(false);

    expect(await main(['plugins', '--check', `--root=${repo}`])).toBe(0);
    expect(calls()).toEqual([]);
  }, 60_000);
});

describe('/oc-update with plugins', () => {
  it('without the Claude Code CLI installs skills, prints the skipped message and exits 0', async () => {
    vi.stubEnv('PATH', gitBin);
    expect(findClaudeCli()).toBeNull();
    enable('settings.json', OPCHAIN);
    installed({ [OPCHAIN.id]: [entry('project', '2.0.4', repo)] });
    const io = capture();
    expect(await main(['--target=claude', `--root=${repo}`])).toBe(0);
    expect(existsSync(join(repo, '.claude/skills/oc-update/SKILL.md'))).toBe(true);
    expect(io.out().split('\n')[0]).toBe(componentsBanner());
    expect(io.out()).toContain('plugins: skipped (Claude Code CLI not found). In Claude Code run `/plugin marketplace update opchain` and `/plugin update opchain@opchain`.');
    expect(calls()).toEqual([]);
  }, 60_000);

  it('a plugin failure keeps the installed skills and exits with the plugin code, saying which part failed', async () => {
    enable('settings.json', OPCHAIN);
    installed({ [OPCHAIN.id]: [entry('project', '2.0.4', repo)] });
    setPlan({ fail: ['plugin update'] });
    const io = capture();
    const code = await main(['--target=claude', `--root=${repo}`]);
    expect(code).toBe(EXIT_PLUGINS);
    expect(code).not.toBe(0);
    expect(io.out().split('\n')[0]).toBe(componentsBanner({ cli: true }));
    expect(io.out()).toContain('files updated and verified');
    expect(JSON.parse(readFileSync(join(repo, '.opchain-install.json'), 'utf8')).version).toBe(release.version);
    expect(existsSync(join(repo, '.claude/skills/oc-update/SKILL.md'))).toBe(true);
    expect(existsSync(join(repo, '.opchain-update.lock'))).toBe(false);
    expect(io.err()).toContain('opchain@opchain (project): FAILED — Error: stub failure for plugin update opchain@opchain --scope project');
    expect(io.err()).toContain('Plugin update failed; skills are unaffected.');
    expect(calls().map(c => c.argv[1])).toEqual(['marketplace', 'update']);
  }, 60_000);
});

describe('host detection', () => {
  it('finds only an executable claude in an absolute PATH entry', () => {
    expect(findClaudeCli({ PATH: [stubBin, gitBin].join(delimiter) })).toBe(join(stubBin, 'claude'));
    expect(findClaudeCli({ PATH: gitBin })).toBeNull();
    expect(findClaudeCli({})).toBeNull();
    // A repository-planted ./claude: relative entries resolve against the cwd, so they never count.
    const cwdClaude = join(process.cwd(), 'claude');
    expect(existsSync(cwdClaude)).toBe(false);
    writeFileSync(cwdClaude, '#!/bin/sh\n', { mode: 0o755 });
    try { expect(findClaudeCli({ PATH: ['.', ''].join(delimiter) })).toBeNull(); }
    finally { rmSync(cwdClaude); }
    put(temp, 'not-exec/claude', '#!/bin/sh\n');
    expect(findClaudeCli({ PATH: join(temp, 'not-exec') })).toBeNull();
  });

  it('banner is truthful per host', () => {
    expect(componentsBanner({ cli: true })).toBe('This command ships: skills, plugin hooks, commit-gate runtime (project-scope plugins). Cannot update: user-scope plugins (use /plugin update), time CLI (use git pull in ~/repos/opchain-time).');
    expect(componentsBanner()).toMatch(/^This command ships: skills\. Cannot update: plugin hooks \+ commit-gate runtime/);
  });
});

// ---------------------------------------------------------------------------
// S3: --with-plugins and the duplicate guard (design §5.3, §5.4, §7 decisions 2–3).
// ---------------------------------------------------------------------------
async function run(args) {
  const out = []; const err = []; const warn = [];
  const spies = [
    vi.spyOn(console, 'log').mockImplementation((...a) => out.push(a.join(' '))),
    vi.spyOn(console, 'error').mockImplementation((...a) => err.push(a.join(' '))),
    vi.spyOn(console, 'warn').mockImplementation((...a) => warn.push(a.join(' '))),
  ];
  try { return { code: await main(args), out: out.join('\n'), err: err.join('\n'), warn: warn.join('\n') }; }
  finally { for (const spy of spies) spy.mockRestore(); }
}
function tree(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, withFileTypes: true }).filter(e => e.isFile())
    .map(e => join(e.parentPath, e.name).slice(dir.length + 1)).sort();
}
const ADD_OPCHAIN = [['plugin', 'marketplace', 'add', 'asfbay-bit/opchain-skills', '--scope', 'project'], ['plugin', 'install', 'opchain@opchain', '--scope', 'project']];
const ADD_OW_TOOLS = [['plugin', 'marketplace', 'add', OW_TOOLS.source.url, '--scope', 'project'], ['plugin', 'install', 'ow-tools@opchain-work-tools', '--scope', 'project']];
const installLocal = async target => expect((await run([`--target=${target}`, `--root=${repo}`])).code).toBe(0);

describe('--with-plugins', () => {
  it('a bare flag adds opchain only, at project scope, and writes no .claude/skills copy', async () => {
    const r = await run(['--with-plugins', `--root=${repo}`]);
    expect(r.code).toBe(0);
    expect(calls().map(c => c.argv)).toEqual(ADD_OPCHAIN);
    expect(calls().every(c => c.cwd === repo)).toBe(true);
    expect(r.out).toContain('opchain@opchain: installed 9.9.9 — enabled for you, NOT yet for the repo — commit .claude/settings.json');
    expect(r.out).toContain('Restart Claude Code to load the new hooks.');
    expect(r.out).toContain('no repo-local skills to update here; the opchain plugin provides them');
    expect(existsSync(join(repo, '.claude/skills'))).toBe(false);
    expect(existsSync(join(repo, '.opchain-install.json'))).toBe(false);
  }, 60_000);

  it('adds ow-tools only when named, alone or with opchain', async () => {
    expect((await run(['--with-plugins=ow-tools', `--root=${repo}`])).code).toBe(0);
    expect(calls().map(c => c.argv)).toEqual(ADD_OW_TOOLS);
    writeFileSync(log, '');
    rmSync(join(repo, '.claude/settings.json'));
    rmSync(join(config, 'plugins'), { recursive: true });
    rmSync(join(repo, '.claude/skills'), { recursive: true }); // ow-tools alone kept the local skills; start clean
    rmSync(join(repo, '.opchain-install.json'));
    expect((await run(['--with-plugins=opchain,ow-tools', `--root=${repo}`])).code).toBe(0);
    expect(calls().map(c => c.argv)).toEqual([...ADD_OPCHAIN, ...ADD_OW_TOOLS]);
  }, 60_000);

  it('says already enabled and leaves an enabled plugin to the update step', async () => {
    enable('settings.json', OPCHAIN);
    installed({ [OPCHAIN.id]: [entry('project', '2.0.4', repo)] });
    const r = await run(['--with-plugins', `--root=${repo}`]);
    expect(r.code).toBe(0);
    expect(r.out).toContain('opchain@opchain: already enabled for this repository; the update step keeps it current.');
    expect(calls().map(c => c.argv[1])).toEqual(['marketplace', 'update']); // S2's two calls, no add/install
  }, 60_000);

  it('refuses an unknown plugin name before anything changes', async () => {
    await expect(run(['--with-plugins=opchain,bogus', `--root=${repo}`])).rejects.toThrow('Unknown plugin "bogus" for --with-plugins. Known: opchain, ow-tools. No files changed.');
    expect(calls()).toEqual([]);
    expect(tree(repo)).toEqual([]);
  });

  it('refuses a Codex-only install', async () => {
    await installLocal('codex');
    const before = tree(repo);
    await expect(run(['--with-plugins', `--root=${repo}`])).rejects.toThrow(/Codex-only \(\.agents\/skills\)\. Plugins are a Claude Code feature and Codex has no plugin system/);
    expect(calls()).toEqual([]);
    expect(tree(repo)).toEqual(before);
  }, 60_000);

  it('without the CLI prints the /plugin commands, adds nothing and keeps local skills', async () => {
    await installLocal('claude');
    vi.stubEnv('PATH', gitBin);
    const r = await run(['--with-plugins', '--drop-local-skills', `--root=${repo}`]);
    expect(r.code).toBe(0);
    expect(r.out).toContain('plugins: not added (Claude Code CLI not found). In Claude Code run `/plugin marketplace add asfbay-bit/opchain-skills` and `/plugin install opchain@opchain`, choosing project scope.');
    expect(r.out).toContain('Local skills: kept');
    expect(localSkillCopies(repo).length).toBeGreaterThan(0);
    expect(calls()).toEqual([]);
  }, 60_000);
});

describe('duplicate guard', () => {
  it('with local copies, --with-plugins refuses without --drop-local-skills or --keep-both', async () => {
    await installLocal('claude');
    const before = tree(repo);
    await expect(run(['--with-plugins', `--root=${repo}`])).rejects.toThrow(/receipt-managed oc-\* skills, and the opchain plugin would load the same skills a second time\. Re-run with --drop-local-skills .* or --keep-both\. No files changed\./);
    await expect(run(['--with-plugins', '--drop-local-skills', '--keep-both', `--root=${repo}`])).rejects.toThrow('Choose one of --drop-local-skills and --keep-both.');
    await expect(run(['--drop-local-skills', `--root=${repo}`])).rejects.toThrow(/only when the opchain plugin replaces them/);
    expect(calls()).toEqual([]);
    expect(tree(repo)).toEqual(before);
  }, 60_000);

  it('--drop-local-skills backs up and removes only matching receipt files, keeps a customised one and leaves .agents/skills alone', async () => {
    await installLocal('both');
    put(repo, '.claude/skills/my-own-skill/SKILL.md', '---\nname: my-own-skill\n---\n');
    const custom = '.claude/skills/oc-update/references/orchestrator.md';
    appendFileSync(join(repo, custom), '\nlocal edit\n');
    const agents = tree(join(repo, '.agents/skills'));
    const agentsUpdate = readFileSync(join(repo, '.agents/skills/oc-update/SKILL.md'));
    const local = localSkillCopies(repo);

    const r = await run(['--with-plugins', '--drop-local-skills', `--root=${repo}`]);
    expect(r.code).toBe(0);
    expect(calls().map(c => c.argv)).toEqual(ADD_OPCHAIN);
    expect(r.out).toContain(`Local skills: removed ${local.length - 1} receipt-managed files from .claude/skills`);
    expect(r.out).toContain(`Kept 1 customized files in .claude/skills (no longer receipt-managed): ${custom}`);
    expect(tree(join(repo, '.claude/skills'))).toEqual(['my-own-skill/SKILL.md', 'oc-update/references/orchestrator.md']);
    expect(readFileSync(join(repo, custom), 'utf8')).toContain('local edit');
    expect(tree(join(repo, '.agents/skills'))).toEqual(agents);
    expect(readFileSync(join(repo, '.agents/skills/oc-update/SKILL.md'))).toEqual(agentsUpdate);
    const receipt = JSON.parse(readFileSync(join(repo, '.opchain-install.json'), 'utf8'));
    expect(Object.keys(receipt.files).filter(path => path.startsWith('.claude/'))).toEqual([]);
    expect(Object.keys(receipt.files).filter(path => path.startsWith('.agents/')).length).toBe(agents.length);
    // The removal went through the backup + journal like any update.
    const backup = /Previous files: (\.opchain-backups\/\S+)/.exec(r.out.split('Local skills:')[1])[1];
    const journal = JSON.parse(readFileSync(join(repo, backup, 'journal.json'), 'utf8'));
    expect(journal.status).toBe('complete');
    expect(journal.changes.filter(c => c.after === null).map(c => c.path).sort()).toEqual(local.filter(path => path !== custom).sort());
    expect(existsSync(join(repo, backup, 'files/.claude/skills/oc-update/SKILL.md'))).toBe(true);
    expect(existsSync(join(repo, '.opchain-update.lock'))).toBe(false);
  }, 60_000);

  it('rehearsal: local skills → plugin only in one command, and doctor shows no duplicate', async () => {
    await installLocal('claude');
    expect(localSkillCopies(repo).length).toBeGreaterThan(0);
    expect((await run(['--with-plugins', '--drop-local-skills', `--root=${repo}`])).code).toBe(0);
    expect(localSkillCopies(repo)).toEqual([]);
    expect(tree(join(repo, '.claude/skills'))).toEqual([]); // emptied skill dirs pruned; .claude/skills itself stays
    expect(readdirSync(join(repo, '.claude/skills'))).toEqual([]);
    const report = doctor({ root: repo, configDir: config });
    expect(report.surfaces.find(s => s.scope === 'plugin')).toMatchObject({ count: 1, pluginScope: 'project' });
    expect(report.findings.map(f => f.code)).not.toContain('duplicate-surfaces');
    // And a second plain run neither re-creates the copies nor warns.
    const again = await run([`--root=${repo}`]);
    expect(again.code).toBe(0);
    expect(again.warn).not.toContain('duplicate:');
  }, 60_000);

  it('--keep-both adds the plugin, keeps updating the local copies, and warns', async () => {
    await installLocal('claude');
    const copies = localSkillCopies(repo).length;
    const r = await run(['--with-plugins', '--keep-both', `--root=${repo}`]);
    expect(r.code).toBe(0);
    expect(calls().map(c => c.argv)).toEqual(ADD_OPCHAIN);
    expect(localSkillCopies(repo).length).toBe(copies);
    expect(r.warn.match(/duplicate:/g)).toHaveLength(1);
    expect(r.warn).toContain('Pick one: plugin only — re-run with --drop-local-skills');
  }, 60_000);

  it('plain /oc-update with both surfaces warns once, updates both and exits 0', async () => {
    await installLocal('claude');
    enable('settings.json', OPCHAIN);
    installed({ [OPCHAIN.id]: [entry('project', '2.0.4', repo)] });
    const r = await run([`--root=${repo}`]);
    expect(r.code).toBe(0);
    expect(r.warn.match(/duplicate:/g)).toHaveLength(1);
    expect(calls().map(c => c.argv[1])).toEqual(['marketplace', 'update']);
    expect(localSkillCopies(repo).length).toBeGreaterThan(0);
    const finding = doctor({ root: repo, configDir: config }).findings.find(f => f.code === 'duplicate-surfaces');
    expect(finding).toBeUndefined(); // the fake install has no cache dir: no plugin skill surface
  }, 60_000);

  it('a failed install keeps the local skills and exits with the plugin code', async () => {
    await installLocal('claude');
    setPlan({ fail: ['plugin install'] });
    const r = await run(['--with-plugins', '--drop-local-skills', `--root=${repo}`]);
    expect(r.code).toBe(EXIT_PLUGINS);
    expect(r.err).toContain('opchain@opchain: FAILED — Error: stub failure for plugin install opchain@opchain --scope project');
    expect(r.out).toContain('Local skills: kept');
    expect(localSkillCopies(repo).length).toBeGreaterThan(0);
  }, 60_000);
});

describe('doctor remedy', () => {
  it('names --drop-local-skills when the plugin and .claude/skills both load the same skills', async () => {
    await installLocal('claude');
    expect((await run(['--with-plugins', '--keep-both', `--root=${repo}`])).code).toBe(0);
    const finding = doctor({ root: repo, configDir: config }).findings.find(f => f.code === 'duplicate-surfaces');
    expect(finding.remedy).toContain('/oc-update --drop-local-skills');
    expect(finding.message).toContain('pick one: plugin only — /oc-update --drop-local-skills');
  }, 60_000);
});
