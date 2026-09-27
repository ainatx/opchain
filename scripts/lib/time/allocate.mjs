// Sweep every endpoint once. Allocation is global; internal work competes equally.
export function allocate(blocks, policy = 'last-touch') {
  if (!['last-touch', 'split-even'].includes(policy)) throw new Error('Invalid overlap policy');
  const changes = new Map();
  for (const [id, b] of blocks.entries()) {
    if (!Number.isFinite(b.start) || !Number.isFinite(b.end) || b.end < b.start) throw new Error('Invalid interval');
    if (b.end === b.start) continue;
    for (const [at, add] of [[b.start, true], [b.end, false]]) {
      const rows = changes.get(at) || []; rows.push({ id, add, b }); changes.set(at, rows);
    }
  }
  const times = [...changes.keys()].sort((a, b) => a - b), active = new Map(), slices = [];
  let union_minutes = 0;
  for (let i = 0; i < times.length - 1; i++) {
    const start = times[i], end = times[i + 1];
    for (const c of changes.get(start)) { if (c.add) active.set(c.id, c.b); else active.delete(c.id); }
    // Defensive session de-dup: overlapping worktree/subagent copies never get
    // extra shares. Stable session ordering breaks simultaneous human ties.
    const sessions = new Map();
    for (const b of active.values()) {
      const old = sessions.get(b.session);
      if (!old || b.last_touch > old.last_touch) sessions.set(b.session, b);
    }
    const covering = [...sessions.values()].sort((a, b) => b.last_touch - a.last_touch || a.session.localeCompare(b.session));
    if (!covering.length) continue;
    union_minutes += (end - start) / 60000;
    const winners = policy === 'last-touch' ? covering.slice(0, 1) : covering;
    for (const b of winners) slices.push({ ...b, start, end, share: 1 / winners.length,
      minutes: (end - start) / 60000 / winners.length,
      agent_only_minutes: Math.max(0, end - Math.max(start, b.agent_only_start)) / 60000 / winners.length });
  }
  const allocated_minutes = slices.reduce((sum, s) => sum + s.minutes, 0);
  if (allocated_minutes > union_minutes + 1e-7) throw new Error('Allocation exceeds union');
  return { slices, union_minutes, allocated_minutes };
}
