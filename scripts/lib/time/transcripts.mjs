import { readdirSync, statSync, unlinkSync, openSync, closeSync } from 'node:fs';
import { basename, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { classify, contentText, toolCalls, normalizeUsage, maxUsage } from './classify.mjs';
import { emptyCounts, observe, mergeCounts, checkCanary } from './canary.mjs';
import { readLines, startOffset } from './cursor.mjs';
import { timePaths, privateDir, readJson, writePrivate, absolutePath } from './paths.mjs';
import { createResolver, loadRegistry } from './registry.mjs';
import { digest, mergePrompts } from './prompts-hook.mjs';
import { reconcileQueue } from './queue.mjs';

// Classification changes require replaying available raw sources. Never silently
// reuse old classifications merely because a source's byte cursor is current.
const SOURCE_FORMAT = 3;

function entries(path) {
  try { return readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
export function discover(projects) {
  const files = [];
  for (const project of entries(projects).filter(e => e.isDirectory())) {
    const root = join(projects, project.name);
    for (const item of entries(root)) {
      if (item.isFile() && item.name.endsWith('.jsonl')) files.push({ path: join(root, item.name), session: basename(item.name, '.jsonl'), parent: null });
      if (item.isDirectory()) for (const child of entries(join(root, item.name, 'subagents'))) {
        if (child.isFile() && child.name.endsWith('.jsonl')) files.push({ path: join(root, item.name, 'subagents', child.name), session: basename(child.name, '.jsonl'), parent: item.name });
      }
    }
  }
  return files;
}
const identifier = value => typeof value === 'string' && /^[\w.:/-]{1,256}$/.test(value) ? value : null;
const timestamp = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;

function normalize(line, file, offset, resolver, counts) {
  const classification = classify(line, { subagent: !!file.parent });
  observe(counts, line, classification);
  const ts = timestamp(line.timestamp);
  if (!ts) return null;
  const session = file.parent ? file.session : identifier(line.sessionId) || file.session;
  const event = { ts, uuid: identifier(line.uuid) || `source:${digest(file.path)}:${offset}`, session,
    parent_session: file.parent, repo: resolver(line.cwd).repo,
    branch: typeof line.gitBranch === 'string' ? line.gitBranch.slice(0, 256) : null,
    class: classification.class, type: classification.class === 'unknown' ? 'unknown' : line.type };
  if (line.type === 'assistant') {
    const id = identifier(line.message?.id);
    if (id) event.message = { id };
    if (typeof line.message?.model === 'string' && /^(?:claude-[\w.-]+|<synthetic>)$/.test(line.message.model)) event.model = line.message.model;
    event.usage = normalizeUsage(line.message?.usage);
  }
  if (line.type === 'pr-link' && Number.isSafeInteger(line.prNumber) && line.prNumber > 0) event.pr = line.prNumber;
  if (absolutePath(line.cwd)) event.worktree = line.cwd;
  const text = contentText(line);
  const skill = text.match(/^\s*<command-name>\/?(oc-[a-z0-9-]+)<\/command-name>/)?.[1];
  if (skill) event.skill = skill;
  const record = { event, missingCwd: !absolutePath(line.cwd) };
  if (line.type === 'user') {
    record.fingerprint = digest(text);
    if (event.class === 'tool_result') record.answers = (line.message?.content || []).filter(b => b?.type === 'tool_result')
      .map(b => identifier(b.tool_use_id)).filter(Boolean);
  }
  if (line.type === 'queue-operation') {
    record.queue = ['enqueue', 'dequeue', 'remove'].includes(line.operation) ? line.operation : 'unknown';
    record.queueId = identifier(line.queueId ?? line.id);
    // Queue content uses the same text extraction as user turns. No content is persisted.
    record.fingerprint = digest(text);
    event.class = record.queue === 'enqueue' && !file.parent ? 'human_prompt' : 'machine';
  }
  return record;
}

export function materialize(shards, hooks = []) {
  let eventDuplicates = 0, messageDuplicates = 0;
  const ordered = [...shards].sort((a, b) => a.order - b.order);
  const tools = Object.assign(Object.create(null), ...shards.map(s => s.tools));
  const usage = new Map(), seen = new Set(), records = [];
  // Cost maxima include UUID copies and partial assistant streaming records.
  for (const shard of ordered) for (const r of shard.records) {
    const { event } = r;
    if (event.message?.id && event.model !== '<synthetic>') {
      const key = event.message.id, previous = usage.get(key);
      if (previous) messageDuplicates++;
      usage.set(key, { model: previous?.model || event.model, usage: maxUsage(previous?.usage || {}, event.usage || {}) });
    }
    if (seen.has(event.uuid)) { eventDuplicates++; continue; }
    seen.add(event.uuid); records.push({ ...r, event: { ...event } });
  }
  for (const r of records) {
    if (!r.event.parent_session && r.answers?.some(id => Object.hasOwn(tools, `${r.event.session}:${id}`))) r.event.class = 'human_answer';
    if (r.event.message?.id) {
      const max = usage.get(r.event.message.id);
      if (max) { r.event.usage = max.usage; r.event.model = max.model; usage.delete(r.event.message.id); }
      else { delete r.event.message; delete r.event.usage; }
    }
  }
  // Queue records in some client versions omit cwd. Use the parent session's
  // nearest preceding explicit repo (or its first explicit repo), never a global
  // last cwd from another session. Explicit cwd changes always win.
  const locations = new Map();
  records.sort((a, b) => a.event.ts.localeCompare(b.event.ts));
  for (const r of records) {
    if (!r.missingCwd) {
      const key = r.event.parent_session || r.event.session, list = locations.get(key) || [];
      list.push(r.event); locations.set(key, list);
    }
  }
  for (const r of records) if (r.missingCwd) {
    const list = locations.get(r.event.parent_session || r.event.session) || [];
    let lo = 0, hi = list.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (list[mid].ts <= r.event.ts) lo = mid + 1; else hi = mid; }
    const location = list[Math.max(0, lo - 1)];
    if (location) { r.event.repo = location.repo; r.event.branch ??= location.branch; }
  }
  const queue = reconcileQueue(records, { sorted: true });
  const merged = mergePrompts(queue.records.map(r => r.event), hooks);
  merged.events.sort((a, b) => a.ts.localeCompare(b.ts) || a.uuid.localeCompare(b.uuid));
  return { events: merged.events, duplicates: { events: eventDuplicates, messages: messageDuplicates, queue: queue.duplicates, hooks: merged.duplicates } };
}

async function readHooks(paths, resolver) {
  const hooks = [], seen = new Set();
  let malformed = 0;
  let stat;
  try { stat = statSync(paths.prompts); } catch (error) { if (error.code === 'ENOENT') return { hooks, malformed }; throw error; }
  await readLines(paths.prompts, stat, null, raw => {
    try {
      const line = JSON.parse(raw), ts = timestamp(line.ts), session = identifier(line.session_id);
      if (!ts || !session || !absolutePath(line.cwd)) { malformed++; return; }
      const uuid = `hook:${digest(`${ts}:${session}:${line.cwd}`)}`;
      if (seen.has(uuid)) return;
      seen.add(uuid);
      hooks.push({ ts, uuid, session, parent_session: null, repo: resolver(line.cwd).repo, worktree: line.cwd,
        branch: null, class: 'human_prompt', type: 'user' });
    } catch { malformed++; }
  });
  return { hooks, malformed };
}

export async function collect({ env = process.env, projects } = {}) {
  const started = performance.now(), paths = timePaths(env);
  if (!projects && !env.HOME) throw new Error('HOME is required to discover transcripts');
  projects ??= join(env.HOME, '.claude', 'projects');
  privateDir(paths.root); privateDir(paths.events); privateDir(paths.sources);
  // Serialize collection so a second process cannot publish stale cursors/cache.
  const lock = join(paths.root, 'collect.lock');
  const fd = openSync(lock, 'wx', 0o600);
  try { return await collectLocked(); }
  finally { closeSync(fd); unlinkSync(lock); }

  async function collectLocked() {
    const resolver = createResolver(loadRegistry(paths));
    const cursor = readJson(paths.cursor, {}), nextCursor = {};
    const files = discover(projects), runCounts = [], failures = [];
    const shards = new Map();
    // Retain normalized history when Claude Code expires the original files.
    for (const item of entries(paths.sources)) if (item.isFile() && item.name.endsWith('.json')) {
      shards.set(item.name.slice(0, -5), readJson(join(paths.sources, item.name)));
    }
    let bytes = 0;
    for (const file of files) {
      const key = digest(file.path), shardPath = join(paths.sources, `${key}.json`);
      try {
        const stat = statSync(file.path), previous = cursor[file.path];
        const stored = shards.get(key);
        const consistent = stored?.format === SOURCE_FORMAT && JSON.stringify(stored?.cursor) === JSON.stringify(previous);
        const start = consistent ? startOffset(previous, stat) : 0;
        if (previous && start === stat.size && shards.has(key)) { nextCursor[file.path] = previous; continue; }
        const old = shards.get(key);
        const reset = start === 0 || !old;
        const shard = reset ? { format: SOURCE_FORMAT, order: old?.order ?? Math.max(-1, ...[...shards.values()].map(s => s.order)) + 1, records: [], tools: {}, counts: emptyCounts() } : structuredClone(old);
        const counts = emptyCounts();
        const next = await readLines(file.path, stat, reset ? null : previous, (raw, offset) => {
          if (!raw.trim()) return;
          let line;
          try { line = JSON.parse(raw); if (!line || Array.isArray(line) || typeof line !== 'object') throw new Error(); }
          catch { counts.malformed++; return; }
          for (const [id, name] of toolCalls(line)) if (identifier(id) && !['__proto__', 'constructor', 'prototype'].includes(id)) shard.tools[`${file.parent ? file.session : identifier(line.sessionId) || file.session}:${id}`] = name;
          const record = normalize(line, file, offset, resolver, counts);
          if (record) shard.records.push(record);
        });
        shard.counts = mergeCounts([shard.counts, counts]);
        // Shard and cursor are paired: an interrupted publish causes a safe replay
        // of this source, never an append to already committed normalized bytes.
        shard.cursor = next;
        writePrivate(shardPath, `${JSON.stringify(shard)}\n`);
        shards.set(key, shard); nextCursor[file.path] = next;
        runCounts.push(counts); bytes += next.offset - (reset ? 0 : start);
      } catch { failures.push(key); if (cursor[file.path]) nextCursor[file.path] = cursor[file.path]; }
    }
    const hookResult = await readHooks(paths, resolver);
    const output = materialize([...shards.values()], hookResult.hooks);
    const months = new Map();
    for (const event of output.events) {
      const month = event.ts.slice(0, 7), list = months.get(month) || [];
      list.push(JSON.stringify(event)); months.set(month, list);
    }
    for (const [month, rows] of months) writePrivate(join(paths.events, `${month}.jsonl`), `${rows.join('\n')}\n`);
    for (const item of entries(paths.events)) if (/^\d{4}-\d\d\.jsonl$/.test(item.name) && !months.has(item.name.slice(0, 7))) unlinkSync(join(paths.events, item.name));
    const canary = checkCanary(mergeCounts([...shards.values()].map(s => s.counts)));
    canary.failures = failures; canary.malformed_hooks = hookResult.malformed;
    canary.pass &&= !failures.length && !hookResult.malformed;
    canary.run = checkCanary(mergeCounts(runCounts));
    canary.duplicates = output.duplicates;
    writePrivate(paths.canary, `${JSON.stringify(canary, null, 2)}\n`);
    writePrivate(paths.cursor, `${JSON.stringify(nextCursor)}\n`);
    return { events: output.events.length, files: files.length, bytes, seconds: (performance.now() - started) / 1000, canary };
  }
}
