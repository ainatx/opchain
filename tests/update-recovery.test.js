import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { buildUpdateBundle } from '../scripts/build-update-bundle.mjs';
import { recoverUpdate } from '../scripts/update-opchain.mjs';
const roots = [];
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));
function crash() {
  const base = mkdtempSync(join(tmpdir(), 'opchain-recovery-')); roots.push(base);
  const root = join(base, 'consumer'); mkdirSync(root);
  const pub = join(base, 'public'); const release = buildUpdateBundle({ publicDir: pub });
  const child = join(base, 'child.mjs');
  writeFileSync(child, `import {readFileSync} from 'node:fs';
import {installBundle} from ${JSON.stringify(pathToFileURL(resolve('scripts/update-opchain.mjs')).href)};
await installBundle(JSON.parse(readFileSync(${JSON.stringify(join(pub, 'opchain-update', release.sha256 + '.json'))})),{root:${JSON.stringify(root)},beforeWrite(p,n){if(n===2)process.exit(99)}});`);
  expect(spawnSync(process.execPath, [child]).status).toBe(99);
  const backup = '.opchain-backups/' + readdirSync(join(root, '.opchain-backups'))[0];
  const journal = JSON.parse(readFileSync(join(root, backup, 'journal.json')));
  return { root, backup, journal, release };
}
describe('abrupt updater termination', () => {
  it('pins the exact artifact and both states before the first install write', () => {
    const {root, backup, journal, release} = crash();
    expect(journal.release.sha256).toBe(release.sha256);
    expect(journal.status).toBe('prepared');
    expect(journal.changes[0].before).toBe(null);
    expect(journal.changes[0].after.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(existsSync(join(root, '.opchain-install.json'))).toBe(false);
    expect(recoverUpdate({root, backup, check:true}).changed).toBe(2);
    expect(existsSync(join(root, '.opchain-update.lock'))).toBe(true);
    expect(recoverUpdate({root, backup}).status).toBe('recovered');
    expect(existsSync(join(root, journal.changes[0].path))).toBe(false);
    expect(existsSync(join(root, '.opchain-update.lock'))).toBe(false);
  });
  it('leaves subsequent user changes and the lock untouched on conflict', () => {
    const {root, backup, journal} = crash();
    const file = join(root, journal.changes[0].path);
    writeFileSync(file, 'user edit after crash');
    expect(() => recoverUpdate({root, backup})).toThrow('Recovery conflict');
    expect(readFileSync(file, 'utf8')).toBe('user edit after crash');
    expect(existsSync(join(root, '.opchain-update.lock'))).toBe(true);
  });
  it('rejects traversal and a forged live-owner recovery request', () => {
    const {root, backup, journal} = crash();
    expect(() => recoverUpdate({root, backup:'../outside'})).toThrow('backup directory');
    journal.ownerPid = process.pid;
    writeFileSync(join(root, backup, 'journal.json'), JSON.stringify(journal));
    expect(() => recoverUpdate({root, backup})).toThrow('still be running');
  });
  it('clears only the stale lock after a completed recovery was interrupted', () => {
    const {root, backup} = crash();
    recoverUpdate({root, backup});
    mkdirSync(join(root, '.opchain-update.lock'));
    writeFileSync(join(root, '.opchain-update.lock/recovery.txt'), `Inspect ${backup}/journal.json before removing this lock.\n`);
    expect(recoverUpdate({root, backup, check:true}).changed).toBe(0);
    expect(recoverUpdate({root, backup}).status).toBe('recovered');
    expect(existsSync(join(root, '.opchain-update.lock'))).toBe(false);
  });
  it('never rolls back a completed install when clearing its stale lock', () => {
    const {root, backup, journal} = crash();
    journal.status = 'complete'; journal.changes = journal.changes.slice(0,2);
    writeFileSync(join(root, backup, 'journal.json'), JSON.stringify(journal));
    const file = join(root, journal.changes[0].path), before = readFileSync(file);
    expect(recoverUpdate({root, backup}).status).toBe('complete');
    expect(readFileSync(file)).toEqual(before);
  });

});
