#!/usr/bin/env node
// Standalone consumer CLI. Keep this file dependency-free: it is served as /update.mjs.
import { createHash, randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, readlinkSync, symlinkSync,
  renameSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const ORIGIN = 'https://opchain.dev';
const TARGETS = ['.claude/skills', '.agents/skills', '.codex/skills'];
const RECEIPT = '.opchain-install.json';
const LOCK = '.opchain-update.lock';
const BACKUPS = '.opchain-backups';
const SEMVER = /^\d+\.\d+\.\d+$/;
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');

export function compareVersions(a, b) {
  for (let i = 0; i < 3; i++) {
    const delta = Number(a.split('.')[i]) - Number(b.split('.')[i]);
    if (delta) return Math.sign(delta);
  }
  return 0;
}

function safeSkillPath(path) {
  return typeof path === 'string' && /^oc-[a-z0-9-]+\//.test(path) &&
    path.split('/').every(part => /^[a-zA-Z0-9_@.()+-]+$/.test(part) && part !== '.' && part !== '..');
}

export function validateBundle(bundle) {
  if (bundle?.schema !== 1 || !SEMVER.test(bundle.version) || !Array.isArray(bundle.files) ||
      !Array.isArray(bundle.skills) || !bundle.skills.length || bundle.files.length > 20000) {
    throw new Error('Invalid update bundle');
  }
  const skills = new Set(bundle.skills);
  if (skills.size !== bundle.skills.length || [...skills].some(id => !/^oc-[a-z0-9-]+$/.test(id))) {
    throw new Error('Invalid skill inventory');
  }
  const files = new Map();
  const folded = new Set();
  for (const file of bundle.files) {
    if (!safeSkillPath(file.path) || !skills.has(file.path.split('/')[0]) ||
        folded.has(file.path.toLowerCase()) || ![0o644, 0o755].includes(file.mode) ||
        typeof file.content !== 'string' || !/^[a-f0-9]{64}$/.test(file.sha256)) {
      throw new Error(`Invalid or duplicate bundle path: ${file.path}`);
    }
    const bytes = Buffer.from(file.content, 'base64');
    if (bytes.toString('base64') !== file.content || digest(bytes) !== file.sha256) {
      throw new Error(`Checksum mismatch: ${file.path}`);
    }
    folded.add(file.path.toLowerCase());
    files.set(file.path, { ...file, bytes });
  }
  for (const path of files.keys()) {
    const parts = path.split('/');
    while (parts.pop() && parts.length) {
      if (folded.has(parts.join('/').toLowerCase())) throw new Error(`File/directory collision: ${path}`);
    }
  }
  for (const id of skills) {
    const skill = files.get(`${id}/SKILL.md`)?.bytes.toString();
    if (!skill?.startsWith('---\n') || !skill.includes(`\nname: ${id}\n`) ||
        !skill.includes(`\nversion: ${bundle.version}\n`) ||
        !files.has(`${id}/references/orchestrator.md`)) throw new Error(`Incomplete skill: ${id}`);
  }
  for (const path of ['oc-telemetry-ops/scripts/telemetry.mjs', 'oc-telemetry-ops/scripts/telemetry.runtime.mjs',
    'oc-checkpoint-protocol/scripts/checkpoint.mjs', 'oc-checkpoint-protocol/scripts/checkpoint.runtime.mjs']) {
    if (!files.has(path)) throw new Error(`Missing runtime: ${path}`);
  }
  if (bundle.runtime !== undefined) {
    const runtime = bundle.runtime;
    if (runtime?.schemaVersion !== 1 || !Array.isArray(runtime.owners) || !Array.isArray(runtime.files) || typeof runtime.runtimeContract !== 'string') throw new Error('Invalid runtime manifest');
    for (const owner of runtime.owners) {
      if (!skills.has(owner)) continue;
      for (const file of runtime.files) {
        const path = `${owner}/scripts/runtime/${file}`;
        if (!safeSkillPath(path) || !files.has(path)) throw new Error(`Missing runtime dependency: ${path}`);
      }
      if (!files.has(`${owner}/scripts/opchain.mjs`)) throw new Error(`Missing runtime launcher: ${owner}`);
      const embedded = JSON.parse(files.get(`${owner}/scripts/runtime/${runtime.layout === 'repository' ? 'scripts/' : ''}runtime-manifest.json`)?.bytes.toString() ?? 'null');
      if (JSON.stringify(embedded) !== JSON.stringify(runtime)) throw new Error(`Runtime manifest drift: ${owner}`);
    }
  }
  return files;
}

async function fetchBytes(url, fetcher) {
  const response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(30000), cache: 'no-store' });
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  const chunks = [];
  let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length;
    if (length > 20 * 1024 * 1024) throw new Error('Update download exceeds 20 MB');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function downloadRelease(fetcher = fetch) {
  const release = JSON.parse(await fetchBytes(`${ORIGIN}/opchain-update/latest.json`, fetcher));
  if (release.schema !== 1 || !SEMVER.test(release.version) || !/^[a-f0-9]{64}$/.test(release.sha256)) {
    throw new Error('Invalid release descriptor');
  }
  const bytes = await fetchBytes(`${ORIGIN}/opchain-update/${release.sha256}.json`, fetcher);
  if (digest(bytes) !== release.sha256) throw new Error('Release checksum mismatch');
  const bundle = JSON.parse(bytes);
  if (bundle.version !== release.version) throw new Error('Release version mismatch');
  validateBundle(bundle);
  return bundle;
}

// Check every path component, including dangling links. Atomic replacement below also
// avoids modifying another path through a hard-linked destination file.
function inspect(root, path) {
  let current = root;
  const parts = path.split('/');
  for (let i = 0; i < parts.length; i++) {
    current = join(current, parts[i]);
    let stat;
    try { stat = lstatSync(current); } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
    if (stat.isSymbolicLink()) throw new Error(`Refusing symlink: ${path}`);
    if (i < parts.length - 1 && !stat.isDirectory()) throw new Error(`Not a directory: ${path}`);
    if (i === parts.length - 1) return stat;
  }
}

function read(root, path) {
  const stat = inspect(root, path);
  if (!stat) return null;
  if (!stat.isFile()) throw new Error(`Expected file: ${path}`);
  return { bytes: readFileSync(join(root, path)), mode: stat.mode & 0o777 };
}

export function projectRoot(cwd = process.cwd()) {
  try { return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return cwd; }
}

function targetsFor(root, target) {
  const explicit = { claude: [TARGETS[0]], codex: [TARGETS[1]], both: TARGETS.slice(0, 2) };
  if (target && !explicit[target]) throw new Error('Use --target=claude, codex, or both');
  if (target) return explicit[target];
  const installed = TARGETS.filter(path => {
    const stat = inspect(root, path);
    if (!stat) return false;
    if (!stat.isDirectory()) throw new Error(`Expected skills directory: ${path}`);
    return readdirSync(join(root, path)).some(id => /^oc-[a-z0-9-]+$/.test(id) && inspect(root, `${path}/${id}/SKILL.md`));
  });
  if (installed.includes(TARGETS[2]) && !installed.includes(TARGETS[1])) installed.push(TARGETS[1]);
  return installed.length ? installed : [TARGETS[0]];
}

export async function telemetryHealth(root) {
  // Match telemetry.mjs: only machine-local SQLite consent is authoritative.
  // Tracked checkpoint handles are historical and cannot opt this machine in.
  const off = { enabled: false, healthy: true, message: 'OFF (unchanged)' };
  const sink = '.checkpoints/usage.sqlite';
  if (!inspect(root, sink)?.isFile()) return off;
  for (const suffix of ['-wal', '-shm', '-journal']) inspect(root, sink + suffix);
  let db;
  let scratch;
  let enabled = null;
  try {
    const { DatabaseSync } = await import('node:sqlite');
    // Even a read-only SQLite connection can create WAL/SHM sidecars. Inspect
    // a private temporary copy so checks never write to the consuming repo.
    scratch = mkdtempSync(join(tmpdir(), 'opchain-telemetry-health-'));
    const snapshot = join(scratch, 'usage.sqlite');
    copyFileSync(join(root, sink), snapshot);
    for (const suffix of ['-wal', '-journal']) {
      if (inspect(root, sink + suffix)?.isFile()) copyFileSync(join(root, sink + suffix), snapshot + suffix);
    }
    db = new DatabaseSync(snapshot, { readOnly: true });
    // Legacy stores without local metadata remain off, exactly as telemetry's
    // readLocalConsent does. Unreadable stores are unknown, never a healthy OFF.
    if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='telemetry_meta'").get()) return off;
    enabled = db.prepare('SELECT value FROM telemetry_meta WHERE key = ?').get('consent_enabled')?.value === 'true';
    if (!enabled) return off;
    const rows = db.prepare('SELECT COUNT(*) AS n FROM runs').get().n;
    db.prepare('SELECT COUNT(*) AS n FROM events').get();
    return { enabled: true, healthy: true, message: `ON (unchanged), ${rows} recorded runs retained` };
  } catch {
    return { enabled, healthy: false, message: enabled === true
      ? 'ON (unchanged), but the local database could not be read'
      : 'UNKNOWN (unchanged), the local consent database could not be read' };
  } finally {
    db?.close();
    if (scratch) rmSync(scratch, { recursive: true, force: true });
  }
}

function receiptPath(path) {
  return TARGETS.some(target => path.startsWith(target + '/') && safeSkillPath(path.slice(target.length + 1)));
}

function replace(root, path, value) {
  inspect(root, path);
  const dest = join(root, path);
  if (value === null) { rmSync(dest, { force: true }); return; }
  mkdirSync(dirname(dest), { recursive: true });
  const temp = `${dest}.opchain-${randomUUID()}`;
  try {
    writeFileSync(temp, value.bytes, { flag: 'wx', mode: value.mode });
    chmodSync(temp, value.mode);
    renameSync(temp, dest);
  } finally { rmSync(temp, { force: true }); }
}

export async function installBundle(bundle, { root = projectRoot(), target, check = false, beforeWrite = () => {} } = {}) {
  root = realpathSync(resolve(root));
  if (inspect(root, LOCK)) throw new Error(`Another or interrupted update owns ${LOCK}. Inspect its recovery.txt before proceeding.`);
  const files = validateBundle(bundle);
  const targets = targetsFor(root, target);
  const telemetry = await telemetryHealth(root); // Inspect local consent before any mutation; never rewrite it.
  const previous = read(root, RECEIPT);
  const receipt = previous ? JSON.parse(previous.bytes) : { schema: 1, files: {} };
  if (receipt.schema !== 1 || !receipt.files || typeof receipt.files !== 'object' || Array.isArray(receipt.files) ||
      Object.entries(receipt.files).some(([path, hash]) => !receiptPath(path) || !/^[a-f0-9]{64}$/.test(hash))) {
    throw new Error('Invalid installed file inventory');
  }
  if (receipt.version && (!SEMVER.test(receipt.version) || compareVersions(receipt.version, bundle.version) > 0)) {
    throw new Error('Refusing to downgrade a newer installed release');
  }
  const desired = new Map();
  const inventory = { ...receipt.files };
  for (const targetPath of targets) {
    for (const [path, file] of files) {
      const dest = `${targetPath}/${path}`;
      const current = read(root, dest);
      if (path.endsWith('/SKILL.md') && current) {
        const version = /^version:\s*(\d+\.\d+\.\d+)\s*$/m.exec(current.bytes.toString())?.[1];
        if (version && compareVersions(version, bundle.version) > 0) throw new Error(`Newer skill already installed: ${dest}`);
        const name = /^name:\s*(\S+)\s*$/m.exec(current.bytes.toString())?.[1];
        if (name !== path.split('/')[0]) throw new Error(`Skill name collision: ${dest}`);
      }
      desired.set(dest, { bytes: file.bytes, mode: file.mode });
      inventory[dest] = file.sha256;
    }
  }
  const retained = [];
  for (const [path, hash] of Object.entries(receipt.files)) {
    if (!targets.some(targetPath => path.startsWith(targetPath + '/')) || desired.has(path)) continue;
    const current = read(root, path);
    if (current && digest(current.bytes) === hash) desired.set(path, null);
    else if (current) retained.push(path);
    delete inventory[path];
  }
  const ignored = read(root, '.gitignore')?.bytes.toString() ?? '';
  const rules = ['/.checkpoints/usage.sqlite', '/.checkpoints/usage.sqlite-*', `/${BACKUPS}/`, `/${LOCK}/`];
  const missing = rules.filter(rule => !ignored.split(/\r?\n/).includes(rule));
  if (missing.length) desired.set('.gitignore', { bytes: Buffer.from(ignored + (ignored && !ignored.endsWith('\n') ? '\n' : '') + '\n# Opchain local state\n' + missing.join('\n') + '\n'), mode: 0o644 });
  desired.set(RECEIPT, { bytes: json({ schema: 1, version: bundle.version, files: inventory }), mode: 0o644 });
  const result = await applyChanges(root, desired, { check, beforeWrite, release: { version: bundle.version, sha256: digest(Buffer.from(JSON.stringify(bundle) + "\n")) } });
  return { ...result, version: bundle.version, targets, telemetry, retained };
}

function sameEntry(a, b) {
  if (!a || !b) return a === b;
  if (a.link !== undefined || b.link !== undefined) return a.link === b.link;
  return a.mode === b.mode && a.bytes.equals(b.bytes);
}

function readEntry(root, path) {
  if (!/^\.claude\/skills\/[^/]+$/.test(path)) return read(root, path);
  inspect(root, dirname(path));
  let stat;
  try { stat = lstatSync(join(root, path)); } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
  if (!stat.isSymbolicLink()) throw new Error(`Expected source skill symlink: ${path}`);
  const link = readlinkSync(join(root, path));
  const target = resolve(dirname(join(root, path)), link);
  if (!target.startsWith(join(root, 'skills') + '/')) throw new Error(`Refusing external source link: ${path}`);
  return { link, mode: 0o777 };
}

function replaceEntry(root, path, value) {
  if (value?.link !== undefined || /^\.claude\/skills\/[^/]+$/.test(path)) {
    inspect(root, dirname(path));
    const dest = join(root, path);
    mkdirSync(dirname(dest), { recursive: true });
    const temp = `${dest}.opchain-${randomUUID()}`;
    try {
      if (!value) { rmSync(dest, { force: true }); return; }
      symlinkSync(value.link, temp);
      renameSync(temp, dest);
    } finally { rmSync(temp, { force: true }); }
  } else replace(root, path, value);
}

function applyChanges(root, desired, { check = false, beforeWrite = () => {}, guard = () => {}, release = null } = {}) {
  const changes = [...desired].map(([path, after]) => ({ path, before: readEntry(root, path), after }))
    .filter(({ before, after }) => !sameEntry(before, after));
  const result = { changed: changes.length, backup: null };
  guard(); // Check-only/current results must describe the source we actually read.
  if (check || !changes.length) return result;

  inspect(root, LOCK);
  inspect(root, BACKUPS);
  mkdirSync(join(root, LOCK)); // Exclusive lock: a crashed update requires reviewing its journal first.
  const backup = `${BACKUPS}/${Date.now()}-${randomUUID()}`;
  const applied = [];
  let keepLock = false;
  try {
    // The plan was read before taking the lock. Refuse to overwrite changes
    // made by another updater or editor in that interval.
    for (const { path, before } of changes) {
      const now = readEntry(root, path);
      if (!sameEntry(before, now)) {
        throw new Error(`File changed while preparing update: ${path}`);
      }
    }
    guard();
    mkdirSync(join(root, backup), { recursive: true, mode: 0o700 });
    result.backup = backup;
    const journal = { schema: 2, release, ownerPid: process.pid, status: 'preparing', changes: changes.map(({ path, before, after }) => ({ path, before: entryIdentity(before), after: entryIdentity(after) })) };
    replace(root, `${backup}/journal.json`, { bytes: json(journal), mode: 0o600 });
    writeFileSync(join(root, LOCK, 'recovery.txt'), `Inspect ${backup}/journal.json before removing this lock.\n`);
    for (const { path, before } of changes) {
      if (before?.bytes) replace(root, `${backup}/files/${path}`, before);
    }
    journal.status = 'prepared';
    replace(root, `${backup}/journal.json`, { bytes: json(journal), mode: 0o600 });
    for (const change of changes) {
      beforeWrite(change.path, applied.length);
      if (!sameEntry(readEntry(root, change.path), change.before)) throw new Error(`File changed during update: ${change.path}`);
      replaceEntry(root, change.path, change.after);
      applied.push(change);
    }
    for (const [path, after] of desired) {
      const actual = readEntry(root, path);
      if (!sameEntry(actual, after)) {
        throw new Error(`Installed verification failed: ${path}`);
      }
    }
    journal.status = 'complete';
    replace(root, `${backup}/journal.json`, { bytes: json(journal), mode: 0o600 });
  } catch (error) {
    try {
      for (const { path, before, after } of applied.reverse()) {
        const now = readEntry(root, path);
        if (sameEntry(now, before)) continue;
        if (!sameEntry(now, after)) throw new Error(`Recovery conflict; preserve user edits: ${path}`);
        replaceEntry(root, path, before);
      }
    } catch (recoveryError) {
      keepLock = true;
      throw new Error(`Update and automatic recovery failed. Lock retained; recover from ${backup}/journal.json. ${recoveryError.message}`, { cause: error });
    }
    throw new Error(`Update failed; previous files restored. Backup: ${backup}. ${error.message}`, { cause: error });
  } finally { if (!keepLock) rmSync(join(root, LOCK), { recursive: true, force: true }); }
  return result;
}

function entryIdentity(value) {
  if (value === null) return null;
  return value.link !== undefined ? { link: value.link } : { sha256: digest(value.bytes), mode: value.mode };
}

function sameIdentity(value, identity) {
  return JSON.stringify(entryIdentity(value)) === JSON.stringify(identity);
}

function recoveryPath(path) {
  return receiptPath(path) || (path.startsWith('plugins/opchain/skills/') && safeSkillPath(path.slice('plugins/opchain/skills/'.length))) || path === '.gitignore' || path === RECEIPT ||
    /^\.claude\/skills\/(oc-[a-z0-9-]+|README\.md|orchestrator\.md)$/.test(path) ||
    /^(skills|plugins\/opchain\/skills)\/(README\.md|orchestrator\.md|oc-[a-z0-9-]+\/(references\/(orchestrator|checkpoint-protocol|runtime-contract)\.md|scripts\/[a-zA-Z0-9_./-]+))$/.test(path);
}

// Recovery is intentionally offline: the immutable journal, not latest.json,
// identifies both expected states. Never overwrite a subsequent user edit.
export function recoverUpdate({ root = projectRoot(), backup, check = false } = {}) {
  root = realpathSync(resolve(root));
  if (typeof backup !== 'string' || !/^\.opchain-backups\/[0-9]+-[a-f0-9-]+$/.test(backup)) throw new Error('Specify the recorded repo-relative backup directory');
  const journal = JSON.parse(read(root, `${backup}/journal.json`)?.bytes ?? 'null');
  if (journal?.schema !== 2 || !Array.isArray(journal.changes) || !['preparing','prepared','complete','recovered'].includes(journal.status)) throw new Error('Unsupported recovery journal; inspect manually without deleting the lock');
  if (!Number.isInteger(journal.ownerPid) || journal.ownerPid < 1) throw new Error('Invalid recovery owner');
  try { process.kill(journal.ownerPid, 0); throw new Error('Updater process may still be running; recovery refused'); }
  catch (error) { if (error.code !== 'ESRCH') throw error; }
  const seen = new Set();
  const validIdentity = value => value === null || (value && typeof value === 'object' && !Array.isArray(value) &&
    (typeof value.link === 'string' ? Object.keys(value).length === 1 : /^[a-f0-9]{64}$/.test(value.sha256) && Number.isInteger(value.mode) && value.mode >= 0 && value.mode <= 0o777));
  const restore = [];
  for (const entry of journal.changes) {
    const { path, before, after } = entry;
    if (typeof path !== 'string' || path.split('/').some(p => !p || p === '.' || p === '..') || !recoveryPath(path) || seen.has(path) || !validIdentity(before) || !validIdentity(after)) throw new Error('Invalid recovery entry');
    seen.add(path);
    for (const value of [before, after]) if (value?.link !== undefined) {
      if (!/^\.claude\/skills\/[^/]+$/.test(path) || !resolve(root, dirname(path), value.link).startsWith(join(root, 'skills') + '/')) throw new Error('Unsafe recovery link');
    }
    const current = readEntry(root, path);
    if (['complete', 'recovered'].includes(journal.status)) {
      if (!sameIdentity(current, journal.status === 'complete' ? after : before)) throw new Error(`Recovery conflict; terminal transaction changed: ${path}`);
      continue;
    }
    if (sameIdentity(current, before)) continue;
    if (!sameIdentity(current, after)) throw new Error(`Recovery conflict; preserve user edits: ${path}`);
    if (journal.status === 'preparing') throw new Error(`Files changed before preparation completed: ${path}`);
    let original = before === null ? null : before.link !== undefined ? { link: before.link, mode: 0o777 } : read(root, `${backup}/files/${path}`);
    if (!sameIdentity(original, before)) throw new Error(`Missing or corrupt backup: ${path}`);
    restore.push({ path, original, observed: current });
  }
  const lock = inspect(root, LOCK);
  if (!lock?.isDirectory()) throw new Error('Recovery requires the interrupted update lock');
  const pointer = read(root, `${LOCK}/recovery.txt`)?.bytes.toString();
  if (pointer !== `Inspect ${backup}/journal.json before removing this lock.\n`) throw new Error('Lock belongs to a different update');
  if (check) return { changed: restore.length, release: journal.release, status: journal.status };
  if (['complete', 'recovered'].includes(journal.status)) {
    rmSync(join(root, LOCK), { recursive: true });
    return { changed: 0, release: journal.release, status: journal.status };
  }
  for (const { path, observed } of restore) if (!sameEntry(readEntry(root, path), observed)) throw new Error(`Recovery conflict: ${path}`);
  for (const { path, original } of restore.reverse()) replaceEntry(root, path, original);
  journal.status = 'recovered';
  replace(root, `${backup}/journal.json`, { bytes: json(journal), mode: 0o600 });
  rmSync(join(root, LOCK), { recursive: true });
  return { changed: restore.length, release: journal.release, status: 'recovered' };
}

const SOURCE_MARKERS = ['skills/orchestrator.md', 'skills/oc-checkpoint-protocol/SKILL.md',
  'scripts/sync-skill-bundles.mjs', 'scripts/sync-plugin-skills.mjs'];

export function isSourceRepo(root) {
  // Ordinary consumer projects may have an unrelated file/link named skills.
  // Only inspect ownership after the complete source marker set is present.
  if (!SOURCE_MARKERS.every(path => existsSync(join(root, path)))) return false;
  if (!SOURCE_MARKERS.every(path => inspect(root, path)?.isFile())) return false;
  try {
    return realpathSync(execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000,
    }).trim()) === realpathSync(root);
  } catch { return false; }
}

function treeFiles(root, path) {
  const files = new Map();
  const walk = current => {
    const stat = inspect(root, current);
    if (!stat) return;
    if (stat.isDirectory()) for (const name of readdirSync(join(root, current)).sort()) walk(`${current}/${name}`);
    else if (stat.isFile()) files.set(current, read(root, current));
    else throw new Error(`Unsupported source file: ${current}`);
  };
  walk(path);
  return files;
}

function assertSnapshot(root, path, snapshot) {
  const current = treeFiles(root, path);
  if (current.size !== snapshot.size || [...snapshot].some(([file, value]) => !sameEntry(value, current.get(file)))) {
    throw new Error(`Source changed while preparing update: ${path}. Re-run after the edit finishes.`);
  }
}

export async function syncSourceRepo({ root = projectRoot(), check = false, beforeWrite = () => {} } = {}) {
  root = realpathSync(resolve(root));
  if (inspect(root, LOCK)) throw new Error(`Another or interrupted update owns ${LOCK}. Inspect its recovery.txt before proceeding.`);
  if (!isSourceRepo(root)) throw new Error('Source mode requires an Opchain Git source checkout with its canonical sync scripts.');
  const telemetry = await telemetryHealth(root);
  const source = treeFiles(root, 'skills');
  const scripts = treeFiles(root, 'scripts');
  const originalPlugin = treeFiles(root, 'plugins/opchain/skills');
  const originalPluginRuntime = treeFiles(root, 'plugins/opchain/scripts');
  const originalPluginSrc = treeFiles(root, 'plugins/opchain/src');
  const runtimeManifest = JSON.parse(read(root, 'scripts/runtime-manifest.json').bytes);
  const support = new Map();
  for (const path of runtimeManifest.files.filter(path => !path.startsWith('scripts/'))) {
    if (path !== 'package.json' && !/^src\/[a-zA-Z0-9_./-]+$/.test(path)) throw new Error(`Invalid runtime source: ${path}`);
    const value = read(root, path);
    if (!value) throw new Error(`Missing runtime source: ${path}`);
    support.set(path, value);
  }
  const ids = [...source.keys()].filter(path => /^skills\/oc-[a-z0-9-]+\/SKILL.md$/.test(path)).map(path => path.split('/')[1]);
  const versions = new Set();
  for (const id of ids) {
    const text = source.get(`skills/${id}/SKILL.md`).bytes.toString();
    const version = /^version:\s*(\d+\.\d+\.\d+)\s*$/m.exec(text)?.[1];
    if (!version || !text.includes(`\nname: ${id}\n`)) throw new Error(`Invalid source skill: ${id}`);
    versions.add(version);
  }
  if (!ids.length || versions.size !== 1) throw new Error('Source skills must have one consistent release version.');
  const stage = mkdtempSync(join(tmpdir(), 'opchain-source-update-'));
  try {
    for (const [path, value] of [...source, ...scripts, ...support]) replace(stage, path, value);
    // Run this checkout's own generators against a staged copy, including all
    // helper sources. Never run destructive mirror generation in the live repo.
    const env = { ...process.env };
    for (const key of Object.keys(env)) if (key.startsWith('OPCHAIN_') || ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE'].includes(key)) delete env[key];
    for (const script of ['sync-skill-bundles.mjs', 'sync-plugin-skills.mjs']) {
      try {
        execFileSync(process.execPath, [join(stage, 'scripts', script)], {
          cwd: stage, env, encoding: 'utf8', timeout: 30000, maxBuffer: 16 * 1024 * 1024,
          stdio: ['ignore', 'pipe', 'pipe'],
        });
      } catch (error) {
        throw new Error(`Source generator ${script} failed before installation: ${error.stderr || error.message}`);
      }
    }
    const generated = treeFiles(stage, 'skills');
    for (const [path, value] of source) {
      if (sameEntry(value, generated.get(path))) continue;
      if (!/^skills\/oc-[a-z0-9-]+\/(references\/(orchestrator|checkpoint-protocol|runtime-contract)\.md|scripts\/(?:[^/]+\.mjs|runtime\/[a-zA-Z0-9_./-]+))$/.test(path)) {
        throw new Error(`Generator tried to modify authored source: ${path}`);
      }
    }
    for (const path of generated.keys()) {
      if (!source.has(path) && !/^skills\/oc-[a-z0-9-]+\/(references\/(orchestrator|checkpoint-protocol|runtime-contract)\.md|scripts\/(?:[^/]+\.mjs|runtime\/[a-zA-Z0-9_./-]+))$/.test(path)) {
        throw new Error(`Unexpected generated source file: ${path}`);
      }
    }
    const plugin = treeFiles(stage, 'plugins/opchain/skills');
    if (plugin.size !== generated.size || [...generated].some(([path, value]) => !sameEntry(value, plugin.get(`plugins/opchain/${path}`)))) {
      throw new Error('Generated plugin mirror does not match the staged skills.');
    }
    // sync-plugin-skills also mirrors src/lib/mcp/checkpoint-contract.js (the --ci evidence gate's dependency).
    const pluginRuntime = new Map([...treeFiles(stage, 'plugins/opchain/scripts'), ...treeFiles(stage, 'plugins/opchain/src')]);
    const desired = new Map([...generated, ...plugin, ...pluginRuntime]);
    for (const path of source.keys()) if (!generated.has(path)) desired.set(path, null);
    for (const path of originalPlugin.keys()) if (!plugin.has(path)) desired.set(path, null);
    for (const id of [...ids, ...['README.md', 'orchestrator.md'].filter(name => source.has(`skills/${name}`))]) {
      desired.set(`.claude/skills/${id}`, { link: `../../skills/${id}`, mode: 0o777 });
    }
    // Inspect all existing entries too, including obsolete links. Keep unrelated
    // entries; never follow or replace a link to outside the canonical tree.
    if (inspect(root, '.claude/skills')) {
      for (const name of readdirSync(join(root, '.claude/skills'))) {
        if (/^oc-[a-z0-9-]+$/.test(name)) readEntry(root, `.claude/skills/${name}`);
      }
    }
    if ([...desired].some(([path, after]) => !sameEntry(readEntry(root, path), after))) {
      const ignored = read(root, '.gitignore');
      const text = ignored?.bytes.toString() ?? '';
      const rules = [`/${BACKUPS}/`, `/${LOCK}/`].filter(rule => !text.split(/\r?\n/).includes(rule));
      if (rules.length) desired.set('.gitignore', { bytes: Buffer.from(text + (text && !text.endsWith('\n') ? '\n' : '') + '\n# Opchain source-update recovery\n' + rules.join('\n') + '\n'), mode: ignored?.mode ?? 0o644 });
    }
    const result = applyChanges(root, desired, { check, beforeWrite, guard: () => {
      assertSnapshot(root, 'skills', source);
      assertSnapshot(root, 'scripts', scripts);
      for (const [path, value] of support) {
        if (!sameEntry(read(root, path), value)) throw new Error(`Source changed while preparing update: ${path}`);
      }
      assertSnapshot(root, 'plugins/opchain/skills', originalPlugin);
      assertSnapshot(root, 'plugins/opchain/scripts', originalPluginRuntime);
      assertSnapshot(root, 'plugins/opchain/src', originalPluginSrc);
    } });
    return { ...result, mode: 'source', version: [...versions][0], skills: ids.length,
      targets: ['skills/', 'plugins/opchain/skills/', '.claude/skills/'], telemetry, retained: [] };
  } finally { rmSync(stage, { recursive: true, force: true }); }
}

// ---------------------------------------------------------------------------
// Components. /oc-update ships skill files and nothing else. The 2026-10-08
// effectiveness audit (I-11) found a session asked to "update opchain" that
// could not be served because hooks and the time CLI live elsewhere, so the
// agent improvised a global-settings side-install. Say what this command can
// and cannot ship before doing anything.
// ---------------------------------------------------------------------------
export const COMPONENTS = Object.freeze([
  { id: 'skills', label: 'skills', shippedBy: 'update', how: '/oc-update' },
  { id: 'plugin-hooks', label: 'plugin hooks', shippedBy: 'plugin', how: '/plugin marketplace update opchain' },
  { id: 'commit-gate-runtime', label: 'commit-gate runtime', shippedBy: 'plugin', how: '/plugin marketplace update opchain' },
  { id: 'time-cli', label: 'time CLI', shippedBy: 'checkout', how: 'git pull in ~/repos/opchain-time' },
]);

export function componentsBanner() {
  const ships = COMPONENTS.filter(c => c.shippedBy === 'update').map(c => c.label).join(', ');
  const byHow = new Map();
  for (const c of COMPONENTS.filter(c => c.shippedBy !== 'update')) byHow.set(c.how, [...(byHow.get(c.how) ?? []), c.label]);
  const cannot = [...byHow].map(([how, labels]) => `${labels.join(' + ')} (use ${how})`).join(', ');
  return `This command ships: ${ships}. Cannot update: ${cannot}.`;
}

function git(cwd, args, { timeout = 10000 } = {}) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout }).replace(/\n$/, '');
  } catch { return null; }
}

// Files under the install targets that git sees as modified or untracked. An
// install that is written but never committed runs the OLD version in every
// other checkout and in the next session on a different branch (get-ripped ran
// 1.8.2 against a 2.0.0 install for weeks; see memory note 2026-09-18).
export function uncommittedInstall(root, targets = TARGETS) {
  const present = targets.filter(target => existsSync(join(root, target)));
  if (!present.length || git(root, ['rev-parse', '--is-inside-work-tree']) !== 'true') return [];
  const status = git(root, ['status', '--porcelain', '--untracked-files=all', '--', ...present]);
  return status ? status.split('\n').filter(Boolean) : [];
}

function skillVersion(text) {
  const head = text.startsWith('---\n') ? text.slice(4, text.indexOf('\n---', 4) + 1) : '';
  return /^version:\s*(\d+\.\d+\.\d+)\s*$/m.exec(head || text)?.[1] ?? null;
}

function readSkillDir(dir) {
  // Returns [{ id, version, kind }] for every oc-* entry holding a SKILL.md.
  let names;
  try { names = readdirSync(dir); } catch { return []; }
  const skills = [];
  for (const name of names.sort()) {
    if (!/^oc-[a-z0-9-]+$/.test(name)) continue;
    const path = join(dir, name);
    let kind = 'dir';
    try {
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) {
        kind = 'symlink';
        try { realpathSync(path); } catch { kind = 'broken-symlink'; }
      } else if (!stat.isDirectory()) continue;
    } catch { continue; }
    let version = null;
    try { version = skillVersion(readFileSync(join(path, 'SKILL.md'), 'utf8')); } catch { if (kind !== 'broken-symlink') continue; }
    skills.push({ id: name, version, kind });
  }
  return skills;
}

function summarizeSurface(surface) {
  const versions = [...new Set(surface.skills.map(s => s.version ?? 'unknown'))].sort();
  const kinds = [...new Set(surface.skills.map(s => s.kind))].sort();
  return { ...surface, count: surface.skills.length, versions, kinds };
}

export function readInstalledPlugins(home) {
  try {
    const data = JSON.parse(readFileSync(join(home, '.claude/plugins/installed_plugins.json'), 'utf8'));
    const entries = [];
    for (const [key, list] of Object.entries(data?.plugins ?? {})) {
      if (!/^opchain(@|$)/.test(key)) continue;
      for (const entry of Array.isArray(list) ? list : [list]) entries.push({ key, installPath: entry?.installPath ?? null, version: entry?.version ?? null, scope: entry?.scope ?? null });
    }
    return entries;
  } catch { return []; }
}

function pluginCacheSkillDirs(home) {
  // ~/.claude/plugins/cache/opchain/<plugin>/<version>/skills (current layout) and
  // ~/.claude/plugins/cache/opchain/<version>/skills (older layout) both count.
  const base = join(home, '.claude/plugins/cache/opchain');
  const found = [];
  const visit = (dir, depth) => {
    if (existsSync(join(dir, 'skills'))) { found.push(join(dir, 'skills')); return; }
    if (depth === 0) return;
    let names; try { names = readdirSync(dir); } catch { return; }
    for (const name of names.sort()) { try { if (lstatSync(join(dir, name)).isDirectory()) visit(join(dir, name), depth - 1); } catch {} }
  };
  if (existsSync(base)) visit(base, 2);
  return found;
}

function worktreeEntries(root) {
  const raw = git(root, ['worktree', 'list', '--porcelain']);
  if (!raw) return [];
  const entries = [];
  let current = null;
  for (const line of raw.split('\n')) {
    if (line.startsWith('worktree ')) { current = { path: line.slice(9), branch: null, head: null }; entries.push(current); }
    else if (current && line.startsWith('HEAD ')) current.head = line.slice(5, 12);
    else if (current && line.startsWith('branch ')) current.branch = line.slice(7).replace(/^refs\/heads\//, '');
    else if (current && line === 'detached') current.branch = '(detached)';
  }
  return entries;
}

function behindOriginMain(dir) {
  const count = git(dir, ['rev-list', '--count', 'HEAD..origin/main']);
  return count === null ? null : Number(count);
}

// Enumerate every place a Claude Code / Codex session may load oc-* skills from
// and say which ones disagree. Exit 0 always: this is a report, not a gate.
export function doctor({ root = projectRoot(), home = process.env.HOME ?? '' } = {}) {
  root = resolve(root);
  const report = { root, home, surfaces: [], worktrees: [], findings: [] };
  const loadable = [];
  const add = (surface) => { const s = summarizeSurface(surface); report.surfaces.push(s); if (s.loadable) loadable.push(s); return s; };

  if (home) add({ name: 'global', path: join(home, '.claude/skills'), scope: 'global', loadable: true, skills: readSkillDir(join(home, '.claude/skills')) });
  for (const target of TARGETS) add({ name: `repo-local ${target}`, path: join(root, target), scope: 'repo-local', loadable: true, skills: readSkillDir(join(root, target)) });
  const plugins = home ? readInstalledPlugins(home) : [];
  for (const dir of home ? pluginCacheSkillDirs(home) : []) {
    const owner = plugins.find(p => p.installPath && (dir === join(p.installPath, 'skills') || dir.startsWith(p.installPath + '/')));
    add({ name: 'plugin cache', path: dir, scope: 'plugin', loadable: true, installedVersion: owner?.version ?? null, registered: Boolean(owner), skills: readSkillDir(dir) });
  }
  for (const plugin of plugins.filter(p => p.installPath && !existsSync(join(p.installPath, 'skills')))) {
    report.findings.push({ level: 'warn', code: 'plugin-cache-missing', message: `installed_plugins.json lists ${plugin.key} ${plugin.version} at ${plugin.installPath} but no skills/ directory is there` });
  }

  const authoring = existsSync(join(root, 'skills/orchestrator.md')) && readSkillDir(join(root, 'skills')).length > 0;
  if (authoring) {
    for (const entry of worktreeEntries(root)) {
      const skills = readSkillDir(join(entry.path, 'skills'));
      const versions = [...new Set(skills.map(s => s.version ?? 'unknown'))].sort();
      const behind = entry.branch === 'main' ? behindOriginMain(entry.path) : null;
      report.worktrees.push({ ...entry, count: skills.length, versions, behind });
      if (behind > 0) report.findings.push({ level: 'warn', code: 'parked-checkout', message: `${entry.path} is on main but ${behind} commits behind origin/main (skills ${versions.join('/')})` });
    }
  }

  // Duplicates: the same skill id present on more than one loadable surface.
  const bySkill = new Map();
  for (const surface of loadable) for (const skill of surface.skills) bySkill.set(skill.id, [...(bySkill.get(skill.id) ?? []), surface]);
  const duplicated = [...bySkill].filter(([, surfaces]) => surfaces.length > 1);
  if (duplicated.length) {
    const names = [...new Set(duplicated.flatMap(([, s]) => s.map(x => `${x.name} (${x.count} @${x.versions.join('/')})`)))];
    report.findings.push({ level: 'warn', code: 'duplicate-surfaces', skills: duplicated.map(([id]) => id), message: `duplicate surfaces: ${duplicated.length} skills load from more than one place — ${names.join(' + ')}` });
  }
  const populated = loadable.filter(s => s.count);
  const allVersions = [...new Set(populated.flatMap(s => s.versions))].sort();
  if (allVersions.length > 1) report.findings.push({ level: 'warn', code: 'version-mismatch', versions: allVersions, message: `version mismatch across surfaces: ${populated.map(s => `${s.name} @${s.versions.join('/')}`).join(', ')}` });
  for (const surface of populated.filter(s => s.versions.length > 1)) report.findings.push({ level: 'warn', code: 'mixed-versions', message: `${surface.name} mixes versions ${surface.versions.join(', ')}` });
  for (const surface of populated.filter(s => s.scope === 'plugin' && s.installedVersion && s.versions.some(v => v !== s.installedVersion))) {
    report.findings.push({ level: 'warn', code: 'plugin-version-drift', message: `plugin cache skills are ${surface.versions.join('/')} but installed_plugins.json says ${surface.installedVersion}` });
  }
  const dirty = uncommittedInstall(root);
  if (dirty.length) report.findings.push({ level: 'warn', code: 'uncommitted-install', paths: dirty, message: `installed but NOT committed — ${dirty.length} path(s) under ${TARGETS.join('/')} are modified or untracked; commit them or the next session will run the old version` });
  if (git(root, ['rev-parse', '--abbrev-ref', 'HEAD']) === 'main') {
    const behind = behindOriginMain(root);
    if (behind > 0) report.findings.push({ level: 'warn', code: 'parked-checkout', message: `checkout ${behind} commits behind origin/main` });
  }
  report.ok = report.findings.length === 0;
  return report;
}

export function formatDoctor(report) {
  const lines = [`opchain doctor — ${report.root}`, componentsBanner(), ''];
  const rows = [['surface', 'path', 'skills', 'version', 'notes']];
  for (const s of report.surfaces) {
    const notes = [];
    if (s.count && s.kinds.length) notes.push(s.kinds.join('+'));
    if (s.scope === 'plugin') notes.push(s.registered ? `installed_plugins.json ${s.installedVersion}` : 'not in installed_plugins.json');
    rows.push([s.name, s.path, String(s.count), s.count ? s.versions.join('/') : '—', notes.join('; ')]);
  }
  for (const w of report.worktrees) {
    const notes = [w.branch ?? '', w.behind > 0 ? `${w.behind} behind origin/main` : ''].filter(Boolean).join('; ');
    rows.push(['worktree', w.path, String(w.count), w.count ? w.versions.join('/') : '—', notes]);
  }
  const widths = rows[0].map((_, i) => Math.max(...rows.map(r => r[i].length)));
  for (const row of rows) lines.push(row.map((cell, i) => cell.padEnd(widths[i])).join('  ').trimEnd());
  lines.push('');
  if (!report.findings.length) lines.push('OK: one version everywhere, nothing duplicated, install committed.');
  for (const f of report.findings) lines.push(`${f.level.toUpperCase()}: ${f.message}`);
  return lines.join('\n');
}

export async function main(args = process.argv.slice(2)) {
  if (args.includes('--help')) {
    console.log('opchain update [--check] [--source] [--target=claude|codex|both] [--root=/path/to/repo]\nopchain update doctor [--json] [--root=/path/to/repo]\nSource checkouts sync from their current skills/ tree; consumer installs download releases. Preserves telemetry and checkpoints.\ndoctor lists every install surface (global, repo-local, plugin cache, worktrees) with versions and flags duplicates, mismatches, uncommitted installs and parked checkouts.\n' + componentsBanner());
    return 0;
  }
  const options = {};
  for (const arg of args) {
    if (arg === '--check') options.check = true;
    else if (arg === '--source') options.source = true;
    else if (arg === 'doctor' || arg === '--doctor') options.doctor = true;
    else if (arg === '--json') options.json = true;
    else if (arg.startsWith('--target=')) options.target = arg.slice(9);
    else if (arg.startsWith('--root=')) options.root = arg.slice(7);
    else throw new Error(`Unknown option: ${arg}`);
  }
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 13)) throw new Error('Opchain requires Node.js 22.13 or newer. No files changed.');
  const root = realpathSync(resolve(options.root ?? projectRoot()));
  if (options.doctor) {
    const report = doctor({ root });
    console.log(options.json ? JSON.stringify(report, null, 2) : formatDoctor(report));
    return 0;
  }
  if (options.json) throw new Error('--json is only valid with doctor');
  const sourceMode = options.source || isSourceRepo(root);
  if (sourceMode && options.target) throw new Error('Source mode maintains the checkout links; --target is only for consumer installs.');
  if (!sourceMode) console.log(componentsBanner());
  console.log(sourceMode ? 'Checking Opchain against this source checkout…' : 'Checking the latest Opchain release…');
  const result = sourceMode ? await syncSourceRepo({ ...options, root }) : await installBundle(await downloadRelease(), options);
  if (!result.changed) {
    // No-op runs used to pay the full welcome text; six of six /oc-update runs
    // in the audit corpus changed nothing. One line, then out.
    console.log(`opchain ${result.version} is already current on ${result.targets.join(', ')}. Telemetry: ${result.telemetry.message}.`);
    if (!result.telemetry.healthy) console.error(`${options.check ? 'Check completed without installing' : 'Skills are current'}; telemetry needs attention. Restore the local database or run /oc-telemetry status to investigate. Consent was preserved.`);
    if (!sourceMode && !options.check) warnUncommitted(root, result.targets);
    return result.telemetry.healthy ? 0 : 2;
  }
  console.log(`Opchain ${result.version}: ${options.check ? `${result.changed} files would change` : `${result.changed} files updated and verified`}.`);
  console.log(`Skills: ${result.targets.join(', ')}\nTelemetry: ${result.telemetry.message}.`);
  if (sourceMode) console.log(`${options.check ? 'Source check completed without installing' : 'Source checkout synchronized'}; Git branch and authored skill definitions retained. No release download.`);
  if (result.backup) console.log(`Previous files: ${result.backup}`);
  if (result.retained.length) console.log(`Kept ${result.retained.length} customized obsolete files.`);
  if (!result.telemetry.healthy) console.error(`${options.check ? 'Check completed without installing' : 'Skills are ready'}; telemetry needs attention. Restore the local database or run /oc-telemetry status to investigate. Consent was preserved.`);
  if (!options.check) console.log('Start a new agent session if the updated skills do not appear.');
  if (!sourceMode && !options.check) warnUncommitted(root, result.targets);
  return result.telemetry.healthy ? 0 : 2;
}

function warnUncommitted(root, targets) {
  const dirty = uncommittedInstall(root, targets);
  if (!dirty.length) return;
  let dirs = [...new Set(dirty.map(line => line.slice(3).split('/').slice(0, 2).join('/')))].filter(d => TARGETS.includes(d));
  if (!dirs.length) dirs = targets;
  const where = dirs.length > 1 ? `${dirs[0]} (and ${dirs.slice(1).join(', ')})` : dirs[0];
  console.warn(`installed but NOT committed — commit ${where} or the next session will run the old version (${dirty.length} path(s) modified or untracked).`);
}

if (process.argv[1] && existsSync(process.argv[1]) && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  main().then(code => { process.exitCode = code; }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
