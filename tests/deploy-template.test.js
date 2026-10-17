// Consumer deploy template (plugins/opchain/templates/deploy.mjs): the guards the
// 2026-10-09 v2.1 consolidation audit found failing open (C-01, A-06/C-02, C-03).
// Pure helpers are tested directly; the refusals are driven end to end against a
// scratch clone of a bare "origin", so nothing here touches a network or a platform.
import { afterAll, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  ALLOW_UNKNOWN_LIVE_FLAG, DEPLOY_CHECKPOINT_PATH, ancestorVerdict, cleanTreeVerdict, deploymentRecord, parseTarget, readLiveVersion, writeDeployCheckpoint,
} from '../plugins/opchain/templates/deploy.mjs';
import { validate } from '../scripts/checkpoint.mjs';

const TEMPLATE = resolve(import.meta.dirname, '..', 'plugins', 'opchain', 'templates', 'deploy.mjs');
const SHA = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';
const scratch = [];
afterAll(() => scratch.forEach((d) => rmSync(d, { recursive: true, force: true })));

function tmp(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  scratch.push(dir);
  return dir;
}

function git(args, cwd) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}

/** A clone whose HEAD is origin/main, with package.json carrying `deploy`. */
function consumer(deploy, { trackCheckpoints = false } = {}) {
  const origin = tmp('oc-deploy-origin-');
  git(['init', '-q', '--bare', '-b', 'main'], origin);
  const root = tmp('oc-deploy-clone-');
  git(['clone', '-q', origin, root], root);
  git(['config', 'user.email', 't@t'], root);
  git(['config', 'user.name', 't'], root);
  git(['symbolic-ref', 'HEAD', 'refs/heads/main'], root);
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'myapp', opchain: { deploy } }, null, 2));
  if (trackCheckpoints) {
    // A consumer that tracks .checkpoints/: the deploy checkpoint is committed.
    mkdirSync(join(root, '.checkpoints'));
    writeFileSync(join(root, DEPLOY_CHECKPOINT_PATH), '{}\n');
  } else writeFileSync(join(root, '.gitignore'), '.checkpoints/\n');
  git(['add', '-A'], root);
  git(['-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'init'], root);
  git(['push', '-q', 'origin', 'main'], root);
  return root;
}

function deploy(root, ...args) {
  const r = spawnSync(process.execPath, [TEMPLATE, ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, MYAPP_PROD_GO: '1' } });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

// Never reaches a platform: the "deploy command" just says it ran and fails.
const FAKE_COMMAND = [process.execPath, '-e', "console.log('FAKE-DEPLOY-RAN'); process.exit(7)"];
const UNREACHABLE = 'http://127.0.0.1:9';

describe('target selection (C-01)', () => {
  it('requires exactly one of --staging / --prod; no default, no env var', () => {
    expect(parseTarget(['--staging'])).toEqual({ staging: true, env: 'staging' });
    expect(parseTarget(['--prod'])).toEqual({ staging: false, env: 'production' });
    expect(parseTarget([]).error).toContain('Production requires an explicit --prod argument; no environment variable is accepted');
    expect(parseTarget(['--staging', '--prod']).error).toContain('not both');
  });

  it('refuses a bare run before touching git, even with the old <PROJECT>_PROD_GO=1 exported', () => {
    const root = tmp('oc-deploy-empty-');
    const r = deploy(root);
    expect(r.code).toBe(1);
    expect(r.out).toContain('REFUSING: no target given');
    expect(r.out).not.toContain('origin/main');
  });
});

describe('clean tree (C-02)', () => {
  it('cleanTreeVerdict lists dirty paths and passes a clean tree', () => {
    expect(cleanTreeVerdict('')).toBeNull();
    expect(cleanTreeVerdict(null)).toContain('cannot inspect');
    expect(cleanTreeVerdict(' M src/a.js\n?? b.txt')).toContain('    ?? b.txt');
    // Only the exact checkpoint the template writes is ignored.
    expect(cleanTreeVerdict(` M ${DEPLOY_CHECKPOINT_PATH}`)).toBeNull();
    expect(cleanTreeVerdict(`M ${DEPLOY_CHECKPOINT_PATH}`)).toBeNull(); // first line as git() trims it
    expect(cleanTreeVerdict(` M .checkpoints/oc-git-ops.checkpoint.json\n M ${DEPLOY_CHECKPOINT_PATH}`)).toContain('oc-git-ops.checkpoint.json');
    // The checkpoint CLI's leftover lock beside it is ignored too; other locks are not.
    expect(cleanTreeVerdict(`?? ${DEPLOY_CHECKPOINT_PATH}.lock`)).toBeNull();
    expect(cleanTreeVerdict('?? .checkpoints/oc-git-ops.checkpoint.json.lock')).toContain('oc-git-ops.checkpoint.json.lock');
  });

  it('staging then prod on the same main commit succeeds when .checkpoints/ is tracked; other dirt still refuses', () => {
    const ok = [process.execPath, '-e', "console.log('FAKE-DEPLOY-OK')"];
    const root = consumer({ staging: { command: ok }, production: { command: ok } }, { trackCheckpoints: true });
    const staging = deploy(root, '--staging');
    expect(staging.out).toContain('FAKE-DEPLOY-OK');
    expect(staging.code).toBe(0);
    expect(staging.out).not.toContain('commit it with the deploy evidence');
    expect(git(['status', '--porcelain'], root)).toBe(`M ${DEPLOY_CHECKPOINT_PATH}`);
    const prod = deploy(root, '--prod');
    expect(prod.out).toContain('✓ working tree clean');
    expect(prod.code).toBe(0);
    const data = JSON.parse(readFileSync(join(root, DEPLOY_CHECKPOINT_PATH), 'utf8'));
    expect(data.skill_state.deployments.map((d) => d.env)).toEqual(['staging', 'production']);
    writeFileSync(join(root, '.checkpoints', 'oc-other.checkpoint.json'), '{}\n');
    const dirty = deploy(root, '--prod');
    expect(dirty.code).toBe(1);
    expect(dirty.out).toContain('?? .checkpoints/oc-other.checkpoint.json');
    expect(dirty.out).not.toContain('FAKE-DEPLOY-OK');
  });

  it('refuses a dirty tree on origin/main', () => {
    const root = consumer({ staging: { command: FAKE_COMMAND } });
    writeFileSync(join(root, 'stray.txt'), 'x\n');
    const r = deploy(root, '--staging');
    expect(r.code).toBe(1);
    expect(r.out).toContain('✓ HEAD');
    expect(r.out).toContain('the working tree is dirty');
    expect(r.out).toContain('?? stray.txt');
    expect(r.out).not.toContain('FAKE-DEPLOY-RAN');
  });
});

describe('unreadable live version (A-06 / C-02)', () => {
  it('ancestorVerdict refuses an unknown live version unless the one-shot flag is passed', () => {
    const refused = ancestorVerdict({ live: null, head: SHA, problem: 'https://x/api/health returned HTTP 403 (a bot challenge)' });
    expect(refused.ok).toBe(false);
    expect(refused.reason).toContain('HTTP 403 (a bot challenge)');
    expect(refused.reason).toContain(ALLOW_UNKNOWN_LIVE_FLAG);
    expect(ancestorVerdict({ live: null, head: SHA, problem: 'down', allowUnknownLive: true })).toMatchObject({ ok: true, warn: true });
    expect(ancestorVerdict({ live: null, head: SHA })).toMatchObject({ ok: true }); // no URL configured
  });

  it('readLiveVersion names why it has no version', async () => {
    expect(await readLiveVersion(null, '/api/health', 'version')).toEqual({ version: null, problem: null });
    const down = await readLiveVersion(UNREACHABLE, '/api/health', 'version');
    expect(down.version).toBeNull();
    expect(down.problem).toContain('is unreachable');
  });

  it('refuses when the configured health URL is unreachable, and --allow-unknown-live proceeds once', () => {
    const root = consumer({ staging: { url: UNREACHABLE, command: FAKE_COMMAND } });
    const refused = deploy(root, '--staging');
    expect(refused.code).toBe(1);
    expect(refused.out).toContain('cannot read the live version');
    expect(refused.out).toContain('re-run once with --allow-unknown-live');
    expect(refused.out).not.toContain('FAKE-DEPLOY-RAN');

    const allowed = deploy(root, '--staging', '--allow-unknown-live');
    expect(allowed.out).toContain('--allow-unknown-live: proceeding without the ancestor check');
    expect(allowed.out).toContain('FAKE-DEPLOY-RAN');
    expect(allowed.code).toBe(7);
  });
});

describe('checkpoint fallback (C-03)', () => {
  const at = '2026-10-09T12:00:00.000Z';

  it('keeps existing next_actions and the rest of the file', () => {
    const root = tmp('oc-deploy-cp-');
    mkdirSync(join(root, '.checkpoints'));
    const path = join(root, '.checkpoints', 'oc-deploy-ops.checkpoint.json');
    const nextActions = [{ text: 'Watch the error rate for an hour', done_when: 'an hour with no new errors' }, 'Tag the release'];
    writeFileSync(path, JSON.stringify({ protocol_version: '1.1', skill: 'oc-deploy-ops', project: 'myapp', project_dir: root, created_at: at, updated_at: at, phase: 'deploy', step: 'staging', status: 'complete', progress_summary: 'earlier.', next_actions: nextActions, custom: 1 }, null, 2));
    const result = writeDeployCheckpoint(root, deploymentRecord({ env: 'production', sha: SHA, url: null, smoke: 'skipped', at }), { cli: null });
    expect(result.via).toBe('json');
    const data = JSON.parse(readFileSync(path, 'utf8'));
    expect(data.next_actions).toEqual(nextActions);
    expect(data.custom).toBe(1);
    expect(validate(path, data).errors).toEqual([]);
  });

  it('refuses to overwrite a corrupt checkpoint and warns instead', () => {
    const root = tmp('oc-deploy-cp-');
    mkdirSync(join(root, '.checkpoints'));
    const path = join(root, '.checkpoints', 'oc-deploy-ops.checkpoint.json');
    writeFileSync(path, '{ "skill": "oc-deploy-ops", truncated');
    const warn = console.warn;
    const warnings = [];
    console.warn = (m) => warnings.push(m);
    try {
      const result = writeDeployCheckpoint(root, deploymentRecord({ env: 'staging', sha: SHA, url: null, smoke: 'skipped', at }), { cli: null });
      expect(result).toEqual({ via: 'skipped', path });
    } finally { console.warn = warn; }
    expect(readFileSync(path, 'utf8')).toBe('{ "skill": "oc-deploy-ops", truncated');
    expect(warnings.join('\n')).toContain('NOT overwriting it');
    expect(warnings.join('\n')).toContain(SHA);
  });
});
