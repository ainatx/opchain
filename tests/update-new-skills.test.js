import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildUpdateBundle } from '../scripts/build-update-bundle.mjs';
import { installBundle } from '../scripts/update-opchain.mjs';

// Consumers run the updater they already have installed, not the one in the
// release they are about to receive. So the next release must be readable by an
// older updater, and a skill id that did not exist before must still land in
// every installed location. tests/fixtures/update/updater-2.0.4.mjs is the
// updater shipped in v2.0.4 (`git show v2.0.4:scripts/update-opchain.mjs`), the
// oldest one still in the field. It stays at 2.0.4 on purpose: don't refresh it.
const root = resolve(import.meta.dirname, '..');
const RELEASED = join(root, 'tests/fixtures/update/updater-2.0.4.mjs');
const NEW_SKILL = 'oc-zz-new-skill';
let temp, pub, prior, next, nextVersion;

function bump(version) {
  const [major, minor] = version.split('.').map(Number);
  return `${major}.${minor + 1}.0`;
}
function stageSkills(dir, version) {
  cpSync(join(root, 'skills'), dir, { recursive: true, dereference: true });
  for (const id of readdirSync(dir).filter(id => id.startsWith('oc-'))) {
    const path = join(dir, id, 'SKILL.md');
    writeFileSync(path, readFileSync(path, 'utf8').replace(/^version: \d+\.\d+\.\d+$/m, `version: ${version}`));
  }
}
function readBundle(publicDir, release) {
  return JSON.parse(readFileSync(join(publicDir, `opchain-update/${release.sha256}.json`)));
}

beforeAll(() => {
  temp = mkdtempSync(join(tmpdir(), 'oc-update-new-skills-'));
  // The release consumers already have: this tree as it stands.
  const priorPub = join(temp, 'prior-public');
  prior = readBundle(priorPub, buildUpdateBundle({ publicDir: priorPub }));
  // The next release: one minor up, plus a skill id the prior release never had.
  nextVersion = bump(prior.version);
  const skills = join(temp, 'next-skills');
  stageSkills(skills, nextVersion);
  mkdirSync(join(skills, NEW_SKILL, 'references'), { recursive: true });
  writeFileSync(join(skills, NEW_SKILL, 'SKILL.md'), `---\nname: ${NEW_SKILL}\nversion: ${nextVersion}\ndescription: added in the next release\n---\n# New\n`);
  cpSync(join(skills, 'oc-update/references/orchestrator.md'), join(skills, NEW_SKILL, 'references/orchestrator.md'));
  pub = join(temp, 'next-public');
  next = readBundle(pub, buildUpdateBundle({ skillsDir: skills, publicDir: pub }));
}, 60_000);
afterAll(() => rmSync(temp, { recursive: true, force: true }));

async function consumer(name) {
  const dir = join(temp, name);
  mkdirSync(dir);
  writeFileSync(join(dir, 'README.md'), 'consumer\n');
  mkdirSync(join(dir, '.checkpoints'));
  writeFileSync(join(dir, '.checkpoints/oc-app-architect.checkpoint.json'), '{"phase":"build"}\n');
  mkdirSync(join(dir, '.claude/skills/my-own-skill'), { recursive: true });
  writeFileSync(join(dir, '.claude/skills/my-own-skill/SKILL.md'), '---\nname: my-own-skill\n---\n');
  await installBundle(prior, { root: dir, target: 'claude' });
  // A legacy Codex install, written the way pre-.agents releases left it.
  for (const file of prior.files) {
    const dest = join(dir, '.codex/skills', file.path);
    mkdirSync(join(dest, '..'), { recursive: true });
    writeFileSync(dest, Buffer.from(file.content, 'base64'), { mode: file.mode });
  }
  return dir;
}
function runUpdater(updater, cwd) {
  const preload = join(temp, 'transport.mjs');
  writeFileSync(preload, `import { readFileSync } from 'node:fs';
    import { join } from 'node:path';
    globalThis.fetch = async url => {
      if (new URL(url).origin !== 'https://opchain.dev') throw new Error('unexpected origin');
      return new Response(readFileSync(join(${JSON.stringify(pub)}, new URL(url).pathname)));
    };`);
  // A tmp Claude config dir: this tree's updater reads plugin state after skills, and
  // nothing here enables a plugin, so it never runs the CLI or reads the real ~/.claude.
  const env = { ...process.env, CLAUDE_CONFIG_DIR: join(temp, 'claude-config') };
  return spawnSync(process.execPath, ['--import', preload, updater], { cwd, encoding: 'utf8', env });
}

describe('a release that adds a skill', () => {
  it.each([
    ['the updater shipped in v2.0.4', 'from-2.0.4', () => RELEASED],
    ['the updater in this tree', 'from-current', () => join(pub, 'update.mjs')],
  ])('%s installs the new skill into every detected location', async (_, name, updater) => {
    const dir = await consumer(name);
    const checkpoint = readFileSync(join(dir, '.checkpoints/oc-app-architect.checkpoint.json'));
    const run = runUpdater(updater(), dir);
    expect(run.status, run.stderr).toBe(0);
    expect(run.stdout).toContain(`Opchain ${nextVersion}`);
    for (const target of ['.claude/skills', '.agents/skills', '.codex/skills']) {
      expect(existsSync(join(dir, target, NEW_SKILL, 'SKILL.md')), `${NEW_SKILL} in ${target}`).toBe(true);
      const ids = readdirSync(join(dir, target)).filter(id => id.startsWith('oc-'));
      expect(ids.sort()).toEqual(next.skills);
      for (const id of ids) expect(readFileSync(join(dir, target, id, 'SKILL.md'), 'utf8')).toMatch(new RegExp(`^version: ${nextVersion}$`, 'm'));
    }
    const receipt = JSON.parse(readFileSync(join(dir, '.opchain-install.json'), 'utf8'));
    expect(receipt.version).toBe(nextVersion);
    // SKILL.md, references/orchestrator.md, LICENSE and NOTICE, in each of the three locations.
    expect(Object.keys(receipt.files).filter(path => path.includes(`/${NEW_SKILL}/`))).toHaveLength(4 * 3);
    expect(readFileSync(join(dir, '.checkpoints/oc-app-architect.checkpoint.json'))).toEqual(checkpoint);
    expect(existsSync(join(dir, '.claude/skills/my-own-skill/SKILL.md'))).toBe(true);
    expect(existsSync(join(dir, '.opchain-update.lock'))).toBe(false);
    // Skills only: plugins and hook settings belong to the host's plugin manager.
    expect(existsSync(join(dir, '.claude/settings.json'))).toBe(false);
    expect(runUpdater(updater(), dir).stdout).toContain('already current');
  // Two full installs plus two CLI spawns over a ~13 MB bundle.
  }, 60_000);
});
