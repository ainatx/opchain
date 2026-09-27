import { readFileSync } from 'node:fs';
import { maxUsage, normalizeUsage } from './classify.mjs';
export const PRICING = JSON.parse(readFileSync(new URL('./pricing.json', import.meta.url), 'utf8'));
export function priceFamily(model, pricing = PRICING) {
  // A dated suffix belongs to the family; an unknown future version does not.
  return Object.keys(pricing).sort((a, b) => b.length - a.length).find(f => model === f || model?.startsWith(`${f}-`) && /^\d{8}$/.test(model.slice(f.length + 1))) || null;
}
export function usageTerms(usage = {}) {
  const u = normalizeUsage(usage), creation = u.cache_creation || {};
  const hour = creation.ephemeral_1h_input_tokens || 0;
  const five = Math.max(creation.ephemeral_5m_input_tokens || 0, (u.cache_creation_input_tokens || 0) - hour);
  return [u.input_tokens || 0, u.output_tokens || 0, u.cache_read_input_tokens || 0, five, hour];
}
export function messageUsage(events) {
  const messages = new Map();
  for (const e of events) {
    if (!e.message?.id || e.model === '<synthetic>') continue;
    const old = messages.get(e.message.id);
    messages.set(e.message.id, old ? { ...old, usage: maxUsage(old.usage, normalizeUsage(e.usage)),
      model: old.model === e.model ? old.model : 'conflicting-model' } : { ...e, usage: normalizeUsage(e.usage) });
  }
  return [...messages.values()];
}
export function priceUsage(messages, pricing = PRICING) {
  let amount = 0, tokens = 0, unpriced_tokens = 0;
  const unpriced = new Set(), models = new Map();
  for (const e of messages) {
    if (e.model === '<synthetic>') continue;
    const terms = usageTerms(e.usage), count = terms.reduce((a, b) => a + b, 0), family = priceFamily(e.model, pricing);
    tokens += count;
    if (!family) { unpriced_tokens += count; unpriced.add(e.model || 'missing-model'); continue; }
    const p = pricing[family];
    if (!p.source?.startsWith('https://') || !/^\d{4}-\d\d-\d\d$/.test(p.verified_on) ||
      ['input', 'output', 'cache_read_mult', 'cache_write_5m_mult', 'cache_write_1h_mult'].some(k => !Number.isFinite(p[k]) || p[k] < 0)) throw new Error('Invalid pricing provenance or rate');
    const cost = (terms[0] * p.input + terms[1] * p.output + terms[2] * p.input * p.cache_read_mult +
      terms[3] * p.input * p.cache_write_5m_mult + terms[4] * p.input * p.cache_write_1h_mult) / 1e6;
    amount += cost; models.set(family, (models.get(family) || 0) + cost);
  }
  return { amount, tokens, unpriced_tokens, unpriced_share: tokens ? unpriced_tokens / tokens : (unpriced.size ? 1 : 0),
    unpriced_models: [...unpriced].sort(), models: Object.fromEntries([...models].sort()) };
}
