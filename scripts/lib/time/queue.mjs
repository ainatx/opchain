// Only hashes/IDs survive parsing. Match repeated identical prompts FIFO, using
// enqueue time rather than the delayed user turn. Removed prompts never bill.
export function reconcileQueue(records) {
  const pending = new Map(), delivered = new Map(), cancelled = new Set();
  let duplicates = 0;
  for (const record of [...records].sort((a, b) => a.event.ts.localeCompare(b.event.ts))) {
    const { event, queue } = record;
    let key = `${event.parent_session || event.session}:${record.fingerprint}`;
    if ((queue === 'remove' || queue === 'dequeue') && record.queueId) {
      const match = [...pending.entries()].find(([k, rows]) => k.startsWith(`${event.parent_session || event.session}:`) && rows.some(r => r.queueId === record.queueId));
      if (match) key = match[0];
    }
    if (queue === 'enqueue') {
      const list = pending.get(key) || []; list.push(record); pending.set(key, list);
    } else if (queue === 'remove' || queue === 'dequeue') {
      const list = pending.get(key) || [];
      const original = record.queueId ? list.find(r => r.queueId === record.queueId) : list[0];
      if (!original) continue;
      list.splice(list.indexOf(original), 1);
      if (queue === 'remove') cancelled.add(original);
      else { const ready = delivered.get(key) || []; ready.push(original); delivered.set(key, ready); }
    } else if (event.class === 'human_prompt' && record.fingerprint) {
      const list = delivered.get(key) || [];
      const waiting = pending.get(key) || [];
      const original = list.shift() || waiting.shift();
      if (original) { cancelled.add(record); duplicates++; }
    }
  }
  return { records: records.filter(r => !cancelled.has(r) && (!r.queue || r.queue === 'enqueue')), duplicates };
}
