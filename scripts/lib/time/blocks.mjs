// Absolute instants drive elapsed time; calendar boundaries use the billing zone.
const MINUTE = 60_000;
const formatters = new Map();
export function localDate(instant, timezone = 'UTC') {
  if (!formatters.has(timezone)) formatters.set(timezone, new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }));
  return formatters.get(timezone).format(new Date(instant));
}
export function dayBounds(date, timezone = 'UTC') {
  if (!/^\d{4}-\d\d-\d\d$/.test(date) || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error('Invalid date');
  const center = Date.parse(`${date}T12:00:00Z`);
  const boundary = target => {
    let lo = center - 2 * 86400000, hi = center + 2 * 86400000;
    while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (localDate(mid, timezone) < target) lo = mid + 1; else hi = mid; }
    return lo;
  };
  const next = new Date(Date.parse(`${date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
  const start = boundary(date), end = boundary(next);
  return { start, end };
}
export const isHuman = e => !e.parent_session && ['human_prompt', 'human_answer'].includes(e.class);
const extendsBlock = e => ['user', 'assistant'].includes(e.type) || (e.type === 'queue-operation' && e.class === 'human_prompt');

export function buildBlocks(events, config) {
  const sessions = new Map(), result = [];
  for (const e of events.filter(extendsBlock).sort((a, b) => a.ts.localeCompare(b.ts) || a.uuid.localeCompare(b.uuid))) {
    const session = e.parent_session || e.session;
    const list = sessions.get(session) || []; list.push(e); sessions.set(session, list);
  }
  for (const [session, list] of sessions) {
    let group = [];
    const flush = () => {
      const humans = group.filter(isHuman);
      if (!humans.length) return;
      const first = Date.parse(humans[0].ts), lastHuman = Date.parse(humans.at(-1).ts);
      const end = Math.min(Date.parse(group.at(-1).ts), config.agent_tail_cap_minutes === null ? Infinity : lastHuman + config.agent_tail_cap_minutes * MINUTE);
      // Split at repo/branch transitions, human touches, and midnight. Subagents
      // keep continuity but do not move the parent's current work attribution.
      const parents = group.filter(e => !e.parent_session);
      const cuts = new Set([first, end]);
      let location;
      for (const e of parents) {
        if ((isHuman(e) || e.repo !== location?.repo || e.branch !== location?.branch) && Date.parse(e.ts) > first && Date.parse(e.ts) < end) cuts.add(Date.parse(e.ts));
        location = e;
      }
      let midnight = dayBounds(localDate(first, config.timezone), config.timezone).end;
      while (midnight < end) { cuts.add(midnight); midnight = dayBounds(localDate(midnight, config.timezone), config.timezone).end; }
      const points = [...cuts].sort((a, b) => a - b);
      let parentIndex = 0, humanIndex = 0;
      for (let i = 0; i < points.length - 1; i++) {
        const start = points[i], stop = points[i + 1];
        if (stop <= start) continue;
        while (parentIndex + 1 < parents.length && Date.parse(parents[parentIndex + 1].ts) <= start) parentIndex++;
        while (humanIndex + 1 < humans.length && Date.parse(humans[humanIndex + 1].ts) <= start) humanIndex++;
        const event = parents[parentIndex], touch = Date.parse(humans[humanIndex].ts);
        result.push({ session, start, end: stop, date: localDate(start, config.timezone), event,
          last_touch: touch, agent_only_start: Math.max(start, lastHuman) });
      }
    };
    for (const e of list) {
      if (group.length && Date.parse(e.ts) - Date.parse(group.at(-1).ts) > config.idle_minutes * MINUTE) { flush(); group = []; }
      group.push(e);
    }
    flush();
  }
  return result.sort((a, b) => a.start - b.start || a.session.localeCompare(b.session));
}

// Human cadence measures intervals between human touches separated by <= idle.
export function humanCadence(events, config) {
  const groups = new Map(), spans = [];
  for (const e of events.filter(isHuman).sort((a, b) => a.ts.localeCompare(b.ts))) {
    const previous = groups.get(e.session), now = Date.parse(e.ts);
    if (previous && now - Date.parse(previous.ts) <= config.idle_minutes * MINUTE) {
      spans.push({ start: Date.parse(previous.ts), end: now, event: previous, session: e.session,
        last_touch: Date.parse(previous.ts), agent_only_start: now });
    }
    groups.set(e.session, e);
  }
  return spans;
}
