import { parseConfig } from '../../../scripts/lib/time/config.mjs';
export const config = parseConfig('client: { id: meridian, name: Meridian Freight }\nrate: { hourly: 175, currency: USD }\ntimezone: America/Chicago\n').config;
export const date = '2026-09-28';
export const entries = [
  { entry: 'meridian-2026-09-28-MER-214-t', client: 'meridian', date, type: 'time', matter: 'MER-214', status: 'draft', revision: 1,
    hours: 2, rate: 175, currency: 'USD', raw_minutes: 118, agent_only_minutes: 34, rounding_added_minutes: 2,
    matter_source: 'pr-link #88', narrative: 'Carrier rate-card import: built parser and validation; opened PR #88.',
    sources: { sessions: 2, commits: 2, files: 11, prs: [88], skills: ['oc-app-architect', 'oc-bug-check'] },
    allocation: [{ start: Date.parse('2026-09-28T14:12:00Z'), end: Date.parse('2026-09-28T16:10:00Z'), share: 1 }] },
  { entry: 'meridian-2026-09-28-ai', client: 'meridian', date, type: 'disbursement', status: 'draft', revision: 1,
    amount: 6.42, currency: 'USD', unpriced_share: 0, tokens: 2100000, models: { 'claude-opus-5-5': 6.42 },
    narrative: 'AI compute (list-price equivalent).' },
];
export const canary = { pass: true, share: .003, quarantine: 1, envelopes: { unknown: 1 } };
export const derived = { date, entries, block_minutes: 118, human_cadence_minutes: 80, internal_minutes: 41 };
export const base = { config, date, entries, canary, derived };
