import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { BASELINE_PATH, baselinePrCommands, baselineRefreshRefusal, latestDeployment, refreshBaseline } from '../scripts/deploy.mjs';
import { ancestorVerdict, deploymentRecord, resolveConfig, writeDeployCheckpoint } from '../plugins/opchain/templates/deploy.mjs';
import { validate } from '../scripts/checkpoint.mjs';

const repo = resolve(import.meta.dirname, '..');
const RELEASE_SHA = '91a2124e01a8ff53ea6d4be2931911cbecabf620';
const NEW_SHA = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';
const NEW_SHORT = 'a1b2c3d';
const DEPLOYMENT = { deploymentId: '11111111-1111-4111-8111-111111111111', versionId: '22222222-2222-4222-8222-222222222222', percentage: 100, createdOn: '2026-10-08T12:00:00Z' };
const VERSION_DETAIL = {
  id: DEPLOYMENT.versionId,
  resources: {
    script: { etag: 'f'.repeat(64), handlers: ['fetch'] },
    bindings: [{ name: 'ROADMAP_GITHUB_TOKEN' }, { name: 'ASSETS' }, { name: 'NOTIFY' }],
  },
};

/** A baseline shaped like the checked-in one (tag 91a2124, runtime 0f3410c). */
function fixture() {
  const live = JSON.parse(readFileSync(join(repo, BASELINE_PATH), 'utf8'));
  live.release = { ...live.release, sourceSha: RELEASE_SHA, sourceShortSha: RELEASE_SHA.slice(0, 7) };
  return live;
}

describe('latestDeployment', () => {
  it('returns the newest deployment by created_on and its 100% version', () => {
    const inventory = [
      { id: 'old', created_on: '2026-08-20T00:00:00Z', versions: [{ version_id: 'v-old', percentage: 100 }] },
      { id: 'new', created_on: '2026-08-29T14:47:30Z', versions: [{ version_id: 'v-new', percentage: 100 }] },
    ];
    expect(latestDeployment(inventory)).toEqual({ deploymentId: 'new', versionId: 'v-new', percentage: 100, createdOn: '2026-08-29T14:47:30Z' });
    expect(latestDeployment(JSON.stringify(inventory.reverse()))).toMatchObject({ deploymentId: 'new' });
    expect(() => latestDeployment([{ id: 'split', created_on: '2026-08-30T00:00:00Z', versions: [{ version_id: 'a', percentage: 90 }, { version_id: 'b', percentage: 10 }] }])).toThrow('no 100% active version');
  });
});

describe('refreshBaseline', () => {
  it('production: records the new ids, fingerprint and bindings, moves the approved runtime, and keeps the schema', () => {
    const before = fixture();
    const { baseline, changes, carriedOver, pendingProduction } = refreshBaseline(before, {
      target: 'production', liveVersion: NEW_SHORT, fullSha: NEW_SHA, deployment: DEPLOYMENT, versionDetail: VERSION_DETAIL,
      approval: 'Post-tag PRs #600 #601, reviewed.', now: '2026-10-08T12:05:00.000Z',
    });
    expect(before).toEqual(fixture()); // pure: input untouched
    expect(Object.keys(baseline)).toEqual(Object.keys(before)); // schema preserved, same top-level order
    expect(baseline.environments.production).toMatchObject({
      worker: 'opchain-dev', hostname: 'opchain.dev', deploymentId: DEPLOYMENT.deploymentId, versionId: DEPLOYMENT.versionId,
      trafficPercentage: 100, scriptEtag: 'f'.repeat(64), handlers: ['fetch'], bindings: ['ASSETS', 'NOTIFY', 'ROADMAP_GITHUB_TOKEN'], observabilityEnabled: true,
    });
    expect(baseline.environments.staging).toEqual(before.environments.staging);
    expect(baseline.release).toEqual(before.release);
    expect(baseline.runtime).toEqual({ sha: NEW_SHA, shortSha: NEW_SHORT, approval: 'Post-tag PRs #600 #601, reviewed.' });
    expect(baseline.pointInTimeEvidence.healthVersion).toBe(NEW_SHORT);
    expect(baseline.pointInTimeEvidence.note).toContain(DEPLOYMENT.deploymentId);
    expect(baseline.deployLag).toEqual(before.deployLag);
    expect(carriedOver).toEqual([]);
    expect(pendingProduction).toBe(false);
    expect(changes).toEqual(expect.arrayContaining([
      `environments.production.deploymentId: ${before.environments.production.deploymentId} → ${DEPLOYMENT.deploymentId}`,
      `environments.production.versionId: ${before.environments.production.versionId} → ${DEPLOYMENT.versionId}`,
      `runtime: ${before.runtime.shortSha} → ${NEW_SHORT}`,
      `pointInTimeEvidence.healthVersion → ${NEW_SHORT}`,
    ]));
  });

  it('production at the tagged release SHA removes the runtime block', () => {
    const { baseline, changes } = refreshBaseline(fixture(), { target: 'production', liveVersion: RELEASE_SHA.slice(0, 7), fullSha: RELEASE_SHA, deployment: DEPLOYMENT, versionDetail: VERSION_DETAIL });
    expect(baseline.runtime).toBeUndefined();
    expect(changes).toContain('runtime: removed (production serves the tagged release v2.0.4)');
  });

  it('staging: refreshes only the staging half and flags that production is still pending', () => {
    const before = fixture();
    const { baseline, changes, pendingProduction } = refreshBaseline(before, { target: 'staging', liveVersion: NEW_SHORT, fullSha: NEW_SHA, deployment: DEPLOYMENT });
    expect(baseline.environments.staging).toMatchObject({ deploymentId: DEPLOYMENT.deploymentId, versionId: DEPLOYMENT.versionId, scriptEtag: before.environments.staging.scriptEtag });
    expect(baseline.environments.production).toEqual(before.environments.production);
    expect(baseline.runtime).toEqual(before.runtime);
    expect(baseline.pointInTimeEvidence).toEqual(before.pointInTimeEvidence);
    expect(pendingProduction).toBe(true);
    expect(changes.some(c => c.startsWith('runtime'))).toBe(false);
  });

  it('carries over fingerprint fields when wrangler returns no version detail, and writes a TODO approval when none is given', () => {
    const { baseline, carriedOver } = refreshBaseline(fixture(), { target: 'production', liveVersion: NEW_SHORT, fullSha: NEW_SHA, deployment: DEPLOYMENT });
    expect(carriedOver).toEqual(['scriptEtag', 'handlers', 'bindings']);
    expect(baseline.environments.production.scriptEtag).toBe(fixture().environments.production.scriptEtag);
    expect(baseline.runtime.approval).toMatch(/^TODO: list the reviewed PRs between v2\.0\.4 and a1b2c3d/);
  });

  it('refuses inconsistent evidence instead of blessing it', () => {
    expect(() => refreshBaseline(fixture(), { target: 'production', liveVersion: 'deadbee', fullSha: NEW_SHA, deployment: DEPLOYMENT })).toThrow('not a prefix of deployed SHA');
    expect(() => refreshBaseline(fixture(), { target: 'production', liveVersion: NEW_SHORT, fullSha: NEW_SHA, deployment: { ...DEPLOYMENT, percentage: 50 } })).toThrow('100% traffic');
    expect(() => refreshBaseline(fixture(), { target: 'production', liveVersion: NEW_SHORT, fullSha: NEW_SHORT, deployment: DEPLOYMENT })).toThrow('40-hex');
    expect(() => refreshBaseline(fixture(), { target: 'preview', liveVersion: NEW_SHORT, fullSha: NEW_SHA, deployment: DEPLOYMENT })).toThrow('unknown target');
    expect(() => refreshBaseline(fixture(), { target: 'production', liveVersion: NEW_SHORT, fullSha: NEW_SHA, deployment: { versionId: 'x' } })).toThrow('deploymentId');
  });

  it('round-trips: a second refresh of the same deployment reports no changes', () => {
    const first = refreshBaseline(fixture(), { target: 'production', liveVersion: NEW_SHORT, fullSha: NEW_SHA, deployment: DEPLOYMENT, versionDetail: VERSION_DETAIL, approval: 'ok', now: 't' });
    const second = refreshBaseline(first.baseline, { target: 'production', liveVersion: NEW_SHORT, fullSha: NEW_SHA, deployment: DEPLOYMENT, versionDetail: VERSION_DETAIL, approval: 'ok', now: 't' });
    expect(second.changes).toEqual([`pointInTimeEvidence.healthVersion → ${NEW_SHORT}`]); // the evidence stamp is always re-asserted
    expect(second.baseline).toEqual(first.baseline);
  });
});

describe('baselinePrCommands', () => {
  it('prints the exact branch/commit/PR commands and nothing executes them', () => {
    const commands = baselinePrCommands({ target: 'production', liveVersion: NEW_SHORT, changes: ['runtime: 0f3410c → a1b2c3d'], carriedOver: ['scriptEtag'] });
    expect(commands[0]).toContain('cloudflare-monitor.mjs control-plane');
    expect(commands).toContain(`git switch -c chore/baseline-${NEW_SHORT}`);
    expect(commands).toContain(`git add ${BASELINE_PATH}`);
    expect(commands.find(c => c.startsWith('git commit'))).toBe(`git commit -s -m 'chore(monitoring): refresh release baseline to ${NEW_SHORT} (production)'`);
    expect(commands.find(c => c.startsWith('git push'))).toBe(`git push -u origin chore/baseline-${NEW_SHORT}`);
    const pr = commands.find(c => c.startsWith('gh pr create'));
    expect(pr).toContain("--title 'chore(monitoring): refresh release baseline to a1b2c3d (production)' --body-file - <<'OPCHAIN_BASELINE_PR_BODY'\n");
    expect(pr).toContain('runtime: 0f3410c → a1b2c3d');
    expect(pr).toContain('Carried over from the previous baseline');
    const staging = baselinePrCommands({ target: 'staging', liveVersion: NEW_SHORT, changes: [], pendingProduction: true });
    expect(staging.at(-1)).toContain('production is still on the previous baseline');
  });

  // Audit C-08: `--body "…`…`…"` ran the backticked text as command substitution when pasted.
  it('is paste-safe: run through a shell, backticks stay literal and newlines are real', () => {
    const commands = baselinePrCommands({ target: 'production', liveVersion: NEW_SHORT, changes: ["it's `$(touch /nonexistent/pwned)`"], carriedOver: ['scriptEtag'] });
    const pr = commands.find(c => c.startsWith('gh pr create'));
    const asCat = pr.replace(/^gh pr create --title '[^']*' --body-file -/, 'cat');
    expect(asCat.startsWith('cat <<')).toBe(true);
    const body = spawnSync('bash', ['-c', `    ${asCat}`], { encoding: 'utf8' });
    expect(body.status).toBe(0);
    expect(body.stderr).toBe('');
    expect(body.stdout).toContain('Baseline refreshed by `scripts/deploy.mjs --refresh-baseline` after the production deploy');
    expect(body.stdout).toContain("- it's `$(touch /nonexistent/pwned)`\n");
    expect(body.stdout).toContain('\n\nVerification:\n- [ ] `node .github/scripts/cloudflare-monitor.mjs control-plane`');
    const title = spawnSync('bash', ['-c', `printf %s ${commands.find(c => c.startsWith('git commit')).slice('git commit -s -m '.length)}`], { encoding: 'utf8' });
    expect(title.stdout).toBe(`chore(monitoring): refresh release baseline to ${NEW_SHORT} (production)`);
  });
});

// Audit C-09: --refresh-baseline blessed an off-main staging preview.
describe('baselineRefreshRefusal', () => {
  it('refuses a branch preview or a HEAD that is not origin/main, and allows exact main', () => {
    expect(baselineRefreshRefusal({ allowOffMain: true, head: NEW_SHA, originMain: NEW_SHA })).toContain('OPCHAIN_ALLOW_OFF_MAIN_STAGING=1');
    expect(baselineRefreshRefusal({ allowOffMain: false, head: NEW_SHA, originMain: 'b'.repeat(40) })).toContain('is not origin/main');
    expect(baselineRefreshRefusal({ allowOffMain: false, head: null, originMain: NEW_SHA })).toContain('cannot resolve');
    expect(baselineRefreshRefusal({ allowOffMain: false, head: NEW_SHA, originMain: NEW_SHA })).toBeNull();
  });
});

describe('consumer deploy template', () => {
  it('derives the env-var prefix and commands from package.json', () => {
    expect(resolveConfig({ name: '@deftwright/site' })).toMatchObject({
      project: 'DEFTWRIGHT_SITE', env: 'production', url: null, command: ['npx', 'wrangler', 'deploy'],
      envVars: { allowOffMainStaging: 'DEFTWRIGHT_SITE_ALLOW_OFF_MAIN_STAGING' },
    });
    expect(resolveConfig({ name: 'x' }).envVars).not.toHaveProperty('prodGo'); // C-01: no env-var production go-ahead
    expect(resolveConfig({ name: 'x', opchain: { deploy: { project: 'MYAPP', staging: { url: 'https://s.example', command: ['npm', 'run', 'ship:staging'] }, smoke: ['npm', 'run', 'smoke'] } } }, { staging: true }))
      .toMatchObject({ project: 'MYAPP', env: 'staging', url: 'https://s.example', command: ['npm', 'run', 'ship:staging'], smoke: ['npm', 'run', 'smoke'] });
    expect(resolveConfig({}).project).toBe('PROJECT');
  });

  it('ancestorVerdict refuses a HEAD that would drop live commits and names them', () => {
    expect(ancestorVerdict({ live: null, head: NEW_SHA })).toMatchObject({ ok: true });
    expect(ancestorVerdict({ live: 'abc1234', head: NEW_SHA, isAncestor: true, lost: [] })).toMatchObject({ ok: true });
    const refused = ancestorVerdict({ live: 'abc1234', head: NEW_SHA, isAncestor: false, lost: ['abc1234 fix: hot patch', 'bbb2222 feat: thing'] });
    expect(refused.ok).toBe(false);
    expect(refused.reason).toContain('discard 2 commit(s)');
    expect(refused.reason).toContain('abc1234 fix: hot patch');
    expect(ancestorVerdict({ live: 'abc1234', head: NEW_SHA, isAncestor: null, lost: [] }).reason).toContain("not in this repository's history");
  });

  it('writes a checkpoint the opchain validator accepts when no checkpoint CLI is present', () => {
    const root = mkdtempSync(join(tmpdir(), 'oc-deploy-template-'));
    try {
      const record = deploymentRecord({ env: 'staging', sha: NEW_SHA, url: 'https://s.example', smoke: 'PASS', at: '2026-10-08T12:00:00.000Z' });
      const result = writeDeployCheckpoint(root, record, { cli: null, projectName: 'myapp' });
      expect(result).toEqual({ via: 'json', path: join(root, '.checkpoints/oc-deploy-ops.checkpoint.json') });
      const data = JSON.parse(readFileSync(result.path, 'utf8'));
      expect(data).toMatchObject({ protocol_version: '1.1', skill: 'oc-deploy-ops', project: 'myapp', phase: 'deploy', step: 'staging', status: 'complete' });
      expect(data.skill_state.deployments).toEqual([record]);
      expect(validate(result.path, data).errors).toEqual([]);
      // Second deploy appends and keeps created_at.
      const second = deploymentRecord({ env: 'production', sha: NEW_SHA, url: 'https://p.example', smoke: 'skipped', at: '2026-10-08T13:00:00.000Z' });
      writeDeployCheckpoint(root, second, { cli: null });
      const again = JSON.parse(readFileSync(result.path, 'utf8'));
      expect(again.created_at).toBe('2026-10-08T12:00:00.000Z');
      expect(again.skill_state.deployments).toHaveLength(2);
      expect(again.skill_state).toMatchObject({ current_env: 'production', staging_version: NEW_SHORT, production_version: NEW_SHORT });
      expect(validate(result.path, again).errors).toEqual([]);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
