import { createHash, randomUUID } from 'node:crypto';
import { openSync, closeSync, readFileSync, writeFileSync, appendFileSync, unlinkSync, statSync, fsyncSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { privateDir } from './paths.mjs';

export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export const hash = value => `sha256:${createHash('sha256').update(canonical(value)).digest('hex')}`;
export class LedgerError extends Error { constructor(message) { super(message); this.exitCode = 1; } }
const fail = message => { throw new LedgerError(message); };
const nonnegative = n => Number.isFinite(n) && n >= 0;
const reserved = new Set(['v', 'at', 'event', 'revision', 'prev', 'hash', 'status', 'derivation', 'approved_at', 'edited_at']);
export function draftHash(row) {
  return hash(Object.fromEntries(Object.entries(row).filter(([key]) => !reserved.has(key))));
}
export function validateEntry(row) {
  if (!['time', 'disbursement'].includes(row.type) || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(row.client) ||
      typeof row.entry !== 'string' || !row.entry.startsWith(`${row.client}-${row.date}-`) ||
      !/^\d{4}-\d\d-\d\d$/.test(row.date) || typeof row.narrative !== 'string' || row.narrative.length > 240) fail('Invalid entry identity or narrative');
  if (row.type === 'time' && (!nonnegative(row.hours) || !nonnegative(row.rate) || typeof row.matter !== 'string')) fail('Invalid time entry');
  if (row.type === 'disbursement' && (!nonnegative(row.amount) || !nonnegative(row.unpriced_share) || row.unpriced_share > 1)) fail('Invalid disbursement');
  if (row.raw_minutes !== undefined && !nonnegative(row.raw_minutes)) fail('Invalid raw minutes');
  if (row.allocation) {
    let total = 0;
    for (const s of row.allocation) {
      if (!nonnegative(s.start) || !nonnegative(s.end) || s.end <= s.start || !(s.share > 0 && s.share <= 1)) fail('Invalid allocation proof');
      total += (s.end - s.start) / 60000 * s.share;
    }
    if (Math.abs(total - row.raw_minutes) > 1e-7) fail('Allocation proof does not match raw minutes');
  }
}

export function foldLedger(rows) {
  const state = new Map();
  let previous = null;
  for (const row of rows) {
    const { hash: digest, ...unsigned } = row;
    if (row.v !== 1 || !Number.isFinite(Date.parse(row.at)) || row.prev !== previous || hash(unsigned) !== digest) fail('Ledger hash chain failed');
    previous = digest;
    const old = state.get(row.entry);
    if (['entry.drafted', 'entry.manual'].includes(row.event)) {
      if (old && (row.event === 'entry.manual' || ['approved', 'amended', 'edited'].includes(old.status))) fail('Protected entry cannot be replaced');
      if (row.revision !== (old?.revision || 0) + 1) fail('Invalid draft revision');
      validateEntry(row);
      if (row.event === 'entry.drafted' && row.derivation !== draftHash(row)) fail('Derivation hash failed');
      if (row.event === 'entry.manual' && !row.reason?.trim()) fail('Manual reason required');
      state.set(row.entry, { ...row, status: 'draft' });
      continue;
    }
    if (!old) fail('Unknown entry');
    if (['entry.edited', 'entry.amended'].includes(row.event)) {
      if (!row.reason?.trim() || !row.changes || Object.keys(row.changes).some(k => !['hours', 'matter', 'narrative', 'amount'].includes(k))) fail('Invalid edit or reason');
      if ((row.event === 'entry.amended') !== (old.status === 'approved') || old.status === 'discarded') fail('Approved entries require amend; drafts require edit');
      if (row.revision !== old.revision + 1) fail('Invalid edit revision');
      const next = { ...old, ...row.changes, reason: row.reason, edited_at: row.at, revision: row.revision, status: row.event === 'entry.amended' ? 'amended' : 'edited' };
      validateEntry(next); state.set(row.entry, next);
    } else if (row.event === 'entry.approved') {
      if (row.revision !== old.revision || ['discarded', 'approved'].includes(old.status)) fail('Invalid approval revision or status');
      if (old.canary_pass === false || old.billable === false || old.unpriced_share > 0) fail('Approval blocked: canary, nonbillable or unpriced');
      state.set(row.entry, { ...old, status: 'approved', approved_at: row.at });
    } else if (row.event === 'entry.discarded') {
      if (!row.reason?.trim() || row.revision !== old.revision || old.status === 'approved') fail('Invalid discard');
      state.set(row.entry, { ...old, status: 'discarded', reason: row.reason });
    } else fail('Unknown ledger event');
  }
  return state;
}
export function readLedger(path) {
  let text;
  try { text = readFileSync(path, 'utf8'); } catch (e) { if (e.code === 'ENOENT') return []; throw e; }
  if (text && !text.endsWith('\n')) fail('Incomplete ledger line');
  try { return text.split('\n').filter(Boolean).map(line => JSON.parse(line)); }
  catch { fail('Corrupt ledger line'); }
}
export function verifyAllocations(entries) {
  const changes = new Map();
  for (const e of entries) {
    if (e.status === 'discarded') continue;
    validateEntry(e);
    for (const s of e.allocation || []) {
      changes.set(s.start, (changes.get(s.start) || 0) + s.share);
      changes.set(s.end, (changes.get(s.end) || 0) - s.share);
    }
  }
  let active = 0;
  for (const [, delta] of [...changes].sort((a, b) => a[0] - b[0])) {
    active += delta;
    if (active > 1 + 1e-7 || active < -1e-7) fail('Global allocation exceeds wall-clock union; re-draft stale clients');
  }
  return true;
}
export async function withLedgerLock(path, action, { timeout = 5000 } = {}) {
  privateDir(dirname(path));
  const lock = join(dirname(path), 'ledger.lock'), started = Date.now(), token = randomUUID();
  let fd;
  while (fd === undefined) {
    try { fd = openSync(lock, 'wx', 0o600); }
    catch (e) {
      if (e.code !== 'EEXIST') throw e;
      // Serialize dead-owner recovery too: two reapers must not unlink a new
      // writer's lock between the inode check and removal.
      let reaper;
      try {
        reaper = openSync(`${lock}.reap`, 'wx', 0o600);
        const stat = statSync(lock), holder = JSON.parse(readFileSync(lock, 'utf8'));
        let dead = false;
        if (Number.isSafeInteger(holder.pid) && holder.pid > 0) {
          try { process.kill(holder.pid, 0); } catch (error) { dead = error.code === 'ESRCH'; }
        }
        if (dead && Date.now() - stat.mtimeMs > 60000 && statSync(lock).ino === stat.ino) { unlinkSync(lock); continue; }
      } catch { /* A new lock may be incomplete, or another reaper owns recovery. */ }
      finally { if (reaper !== undefined) { closeSync(reaper); unlinkSync(`${lock}.reap`); } }
      if (Date.now() - started >= timeout) fail('Ledger busy: lock timeout; retry when the owner exits');
      await sleep(Math.min(50, 5 + Date.now() - started));
    }
  }
  try { writeFileSync(fd, JSON.stringify({ pid: process.pid, token })); return await action(); }
  finally {
    closeSync(fd);
    if (JSON.parse(readFileSync(lock, 'utf8')).token === token) unlinkSync(lock);
  }
}
export async function transactLedger(path, createEvents, options) {
  return withLedgerLock(path, async () => {
    const rows = readLedger(path), state = foldLedger(rows), events = await createEvents(state);
    if (!events.length) return [];
    let previous = rows.at(-1)?.hash || null;
    const next = events.map(event => {
      const row = { ...event, v: 1, at: event.at || new Date().toISOString(), prev: previous };
      row.hash = hash(row); previous = row.hash; return row;
    });
    foldLedger([...rows, ...next]); // Validate the entire transaction before any append.
    const fd = openSync(path, 'a', 0o600);
    try { appendFileSync(fd, next.map(r => JSON.stringify(r)).join('\n') + '\n'); fsyncSync(fd); }
    finally { closeSync(fd); }
    return next;
  }, options);
}
