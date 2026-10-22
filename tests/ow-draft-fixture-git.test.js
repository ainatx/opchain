import { afterAll, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { cleanup, failures, mutated } from './ow-draft-helpers.mjs';

afterAll(cleanup);

it('creates independent real Git repositories for repeated copies of one case', () => {
  const first = mutated('b-deliver-case');
  const second = mutated('b-deliver-case', {}, { branch: 'draft/other' });
  const git = (dir, ...args) => spawnSync('git', ['-C', join(dir, 'site'), ...args], { encoding: 'utf8' });
  for (const dir of [first, second]) {
    expect(git(dir, 'rev-parse', '--verify', 'HEAD').status).toBe(0);
    expect(git(dir, 'fsck', '--no-dangling').status).toBe(0);
  }
  expect(git(first, 'branch', '--show-current').stdout.trim()).toBe('draft/case-study');
  expect(git(second, 'branch', '--show-current').stdout.trim()).toBe('draft/other');
  expect(failures('b-deliver-case', second).deliver).toMatch(/not draft\/case-study/);
  expect(failures('b-deliver-case', first)).toEqual({});
});
