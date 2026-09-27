import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as r from '../../scripts/lib/time/render.mjs';
import { base, entries, date, canary } from './fixtures/surface-data.mjs';
const golden = name => readFileSync(new URL(`./fixtures/surfaces/${name}`, import.meta.url), 'utf8');
const approved = entries.map(e => ({ ...e, status: 'approved', approved_at: '2026-09-28T23:40:00Z' }));
const cases = {
  'draft.md': () => r.renderMarkdown(base),
  'approved.md': () => r.renderMarkdown({ ...base, entries: approved }),
  'empty.md': () => r.renderMarkdown({ ...base, entries: [] }),
  'review.txt': () => r.renderReview(base),
  'review-unpriced.txt': () => r.renderReview({ ...base, entries: [entries[0], { ...entries[1], unpriced_share: .12, unpriced_models: ['claude-opus-6'] }] }),
  'review-canary.txt': () => r.renderReview({ ...base, canary: { pass: false, share: .024, quarantine: 2, envelopes: { unknown: 2 }, untested_versions: ['9.0.0'] }, quarantine: true }),
  'review-drift.txt': () => r.renderReview({ ...base, entries: approved, warnings: ['Approved day differs from current derivation; entries unchanged. Use amend to change it.'] }),
  'review-empty.txt': () => r.renderReview({ ...base, entries: [] }),
  'export.csv': () => r.renderCsv(approved),
  'today.txt': () => r.renderToday('meridian', date, entries),
  'nudge-past.json': () => r.renderNudge('meridian', '2026-09-29', entries, canary),
  'nudge-today.json': () => r.renderNudge('meridian', date, entries, canary),
  'nudge-canary.json': () => r.renderNudge('meridian', date, entries, { pass: false }),
  'nudge-empty.txt': () => r.renderNudge('meridian', date, [], canary),
};
for (const [name, render] of Object.entries(cases)) it(`explicit golden ${name}`, () => {
  const text = render(); expect(text).toBe(golden(name));
  if (!name.endsWith('.csv') && !name.endsWith('.json')) expect(text.split('\n').every(line => line.length <= 100)).toBe(true);
});
it('escapes controls, markup and spreadsheet formulas; preserves quoted CSV fields', () => {
  expect(r.clean(' a\x1b[31m\n b ')).not.toContain('\x1b');
  const row = { ...approved[0], matter: '=SUM(A1)', narrative: '=@SUM(1,"two")', status: 'approved' };
  expect(r.renderCsv([row])).toContain("'=SUM(A1)"); expect(r.renderCsv([row])).toContain('"\'=@SUM(1,""two"")"');
  expect(r.renderCsv([{ ...row, status: 'amended' }]).split('\n')).toHaveLength(2);
  expect(r.renderMarkdown({ ...base, entries: [{ ...row, narrative: '[link](url)|<script>', reason: 'Reason', status: 'edited' }] })).toContain('\\[link\\]');
});
it('long words/narratives wrap, evidence caps, days truncate, currencies remain separate', () => {
  expect(r.wrap('x'.repeat(240), 72).split('\n').every(s => s.length <= 72)).toBe(true);
  const many = { ...entries[0], sources: { ...entries[0].sources, skills: Array(30).fill('oc-app-architect') }, allocation: Array(8).fill(entries[0].allocation[0]) };
  expect(r.evidence(many)).toContain('+');
  const days = ['21','22','23','24'].map(d => ({ ...entries[0], date: `2026-09-${d}` }));
  expect(r.renderNudge('meridian', '2026-09-29', days, canary)).toContain('4 days');
  expect(r.renderNudge('meridian', date, entries, null)).toBe('');
  expect(r.renderToday('meridian', '2026-09-29', entries)).toBe('');
  expect(r.renderNudge('meridian', date, approved, canary)).toBe('');
  expect(r.totals([{ ...entries[0], currency: 'GBP' }, entries[0]]).fees).toContain('£');
  expect(r.renderMarkdown({ ...base, entries: [{ ...entries[0], status: 'discarded' }] })).toContain('No billable');
  expect(r.renderReview({ ...base, entries: [{ ...entries[0], billable: false, reason: 'Excluded' }], derived: undefined })).toContain('NONBILLABLE');
  expect(r.renderMarkdown({ ...base, derived: undefined, warnings: ['Warning'] })).toContain('! Warning');
  expect(r.evidence({ ...entries[1], models: { model: { amount: 1 } } })).toContain('$1.00');
});
