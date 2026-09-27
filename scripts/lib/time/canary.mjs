import { KNOWN_TYPES } from './classify.mjs';

// This baseline is exercised by synthetic fixtures; the owner's replay must
// establish whether newer producer versions require additional fixtures.
export const TESTED_VERSION = '2.1.0';
export const emptyCounts = () => ({ lines: 0, users: 0, unknown: 0, quarantine: 0,
  malformed: 0, missing_timestamp: 0, types: {}, envelopes: {}, versions: {}, days: {} });
const bump = (map, key, n = 1) => { map[key] = (map[key] || 0) + n; };
export function observe(counts, line, classification) {
  counts.lines++;
  const type = KNOWN_TYPES.has(line.type) ? line.type : 'unknown';
  bump(counts.types, type);
  bump(counts.envelopes, classification.envelope);
  const version = typeof line.version === 'string' && /^\d+\.\d+\.\d+$/.test(line.version) ? line.version : 'missing-or-invalid';
  bump(counts.versions, version);
  const ts = Date.parse(line.timestamp);
  if (!Number.isFinite(ts)) counts.missing_timestamp++;
  const day = Number.isFinite(ts) ? new Date(ts).toISOString().slice(0, 10) : 'undated';
  const row = counts.days[day] ??= { users: 0, unknown: 0, quarantine: 0 };
  for (const [key, yes] of Object.entries({ users: line.type === 'user', unknown: type === 'unknown', quarantine: classification.class === 'quarantine' })) {
    if (yes) { counts[key]++; row[key]++; }
  }
}
export function mergeCounts(items) {
  const result = emptyCounts();
  for (const item of items) {
    for (const key of ['lines', 'users', 'unknown', 'quarantine', 'malformed', 'missing_timestamp']) result[key] += item[key];
    for (const key of ['types', 'envelopes', 'versions']) for (const [name, count] of Object.entries(item[key])) bump(result[key], name, count);
    for (const [day, counts] of Object.entries(item.days)) {
      const row = result.days[day] ??= { users: 0, unknown: 0, quarantine: 0 };
      for (const key of Object.keys(row)) row[key] += counts[key];
    }
  }
  return result;
}
const newer = (a, b) => {
  const left = a.split('.').map(Number), right = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] > right[i];
  return false;
};
export function checkCanary(counts, testedVersion = TESTED_VERSION) {
  const share = row => (row.unknown + row.quarantine) / Math.max(1, row.users);
  const versions = Object.keys(counts.versions).filter(v => /^\d+\.\d+\.\d+$/.test(v));
  versions.sort((a, b) => newer(a, b) ? 1 : newer(b, a) ? -1 : 0);
  const untested_versions = versions.filter(v => newer(v, testedVersion));
  const days = Object.fromEntries(Object.entries(counts.days).map(([day, row]) => [day, { ...row, share: share(row), pass: share(row) <= 0.01 }]));
  return { ...counts, days, share: share(counts), version_min: versions[0] ?? null,
    version_max: versions.at(-1) ?? null, tested_version: testedVersion, untested_versions,
    pass: counts.malformed === 0 && Object.values(days).every(d => d.pass) && !untested_versions.length };
}
