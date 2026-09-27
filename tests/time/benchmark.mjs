// Run separately from the full suite: concurrent build/test processes distort
// process-startup latency. Uses synthetic transcripts and a private temporary HOME.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { collect } from '../../scripts/lib/time/transcripts.mjs';
import { fixture, user, CANARY } from './fixtures/builder.mjs';
const f = fixture(), cli = fileURLToPath(new URL('../../scripts/timesheet.mjs', import.meta.url));
try {
  const times = [];
  for (let i = 0; i < 20; i++) {
    const start = performance.now();
    const result = spawnSync(process.execPath, [cli, 'hook', 'prompt'], { env: f.env, encoding: 'utf8', input: JSON.stringify({ session_id: 'session-a', cwd: f.repo, prompt: CANARY }) });
    times.push(performance.now() - start);
    assert.equal(result.status, 0); assert.equal(result.stdout + result.stderr, '');
  }
  const median = times.sort((a, b) => a - b)[10];
  f.file('s.jsonl', Array.from({ length: 10000 }, (_, i) => user(`before-${i}`, i)));
  const initial = await collect({ env: f.env });
  f.file('s.jsonl', Array.from({ length: 10000 }, (_, i) => user(`after-${i}`, 10000 + i)), true);
  const incremental = await collect({ env: f.env });
  console.log(JSON.stringify({ hook_median_ms: median, samples: 20, initial_seconds: initial.seconds,
    append_seconds: incremental.seconds, appended_lines: incremental.canary.run.lines, bytes_read: incremental.bytes }, null, 2));
  assert.equal(incremental.canary.run.lines, 10000);
  assert.ok(median < (process.env.CI ? 150 : 50), 'prompt hook median exceeds budget');
  assert.ok(incremental.seconds < (process.env.CI ? 3 : 1), '10k append exceeds budget');
} finally { f.cleanup(); }
