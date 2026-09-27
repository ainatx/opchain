import { appendFileSync, chmodSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { absolutePath, privateDir, timePaths } from './paths.mjs';

export const digest = value => createHash('sha256').update(value).digest('hex');
export function recordPrompt(input, env = process.env, now = new Date()) {
  try {
    const line = typeof input === 'string' ? JSON.parse(input) : input;
    if (!line || typeof line.session_id !== 'string' || !/^[\w-]{1,128}$/.test(line.session_id) || !absolutePath(line.cwd)) return false;
    const paths = timePaths(env);
    privateDir(paths.root);
    appendFileSync(paths.prompts, `${JSON.stringify({ ts: now.toISOString(), session_id: line.session_id, cwd: line.cwd })}\n`, { mode: 0o600 });
    chmodSync(paths.prompts, 0o600);
    return true;
  } catch { return false; }
}
export function mergePrompts(events, hooks) {
  const bySession = new Map();
  for (const hook of hooks) {
    const stamps = bySession.get(hook.session) || [];
    stamps.push(Date.parse(hook.ts)); bySession.set(hook.session, stamps);
  }
  for (const stamps of bySession.values()) stamps.sort((a, b) => a - b);
  let duplicates = 0;
  const result = events.filter(event => {
    if (event.class !== 'human_prompt' || event.parent_session) return true;
    const stamps = bySession.get(event.session) || [], at = Date.parse(event.ts);
    let lo = 0, hi = stamps.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (stamps[mid] < at - 5000) lo = mid + 1; else hi = mid; }
    if (lo < stamps.length && stamps[lo] <= at + 5000) { duplicates++; return false; }
    return true;
  });
  return { events: [...result, ...hooks], duplicates };
}
