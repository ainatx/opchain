import { it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

it('excludes tracked evidence changes from the projection while retaining source identity', { timeout: 20_000 }, () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'opchain-projection-'));
  const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null', GIT_AUTHOR_NAME: 'Fixture', GIT_COMMITTER_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.test', GIT_COMMITTER_EMAIL: 'fixture@example.test' };
  const git = (...args) => {
    const result = spawnSync('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', ...args], { cwd: repo, env, encoding: 'utf8' });
    expect(result.status, result.stderr).toBe(0);
  };
  const snapshot = () => {
    const result = spawnSync(process.execPath, [path.resolve('scripts/lib/release-evidence.mjs'), '--repo', repo, '--print-candidate', '--json'], { env, encoding: 'utf8' });
    expect(result.status, result.stderr).toBe(0);
    return JSON.parse(result.stdout);
  };
  try {
    git('init', '-q');
    fs.mkdirSync(path.join(repo, '.checkpoints'));
    const evidence = path.join(repo, '.checkpoints/state.json');
    const source = path.join(repo, 'source.txt');
    fs.writeFileSync(evidence, '{"value":1}'); fs.writeFileSync(source, 'one');
    git('add', '.'); git('commit', '-qm', 'seed'); const first = snapshot();
    fs.writeFileSync(evidence, '{"value":2}');
    git('add', '.'); git('commit', '-qm', 'evidence'); const second = snapshot();
    expect(second.tree).not.toBe(first.tree);
    expect(second.candidate_identity).toEqual(first.candidate_identity);
    fs.writeFileSync(source, 'two');
    git('add', '.'); git('commit', '-qm', 'source');
    expect(snapshot().candidate_identity).not.toEqual(second.candidate_identity);
  } finally { fs.rmSync(repo, { recursive: true, force: true }); }
});
