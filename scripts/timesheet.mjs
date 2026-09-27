#!/usr/bin/env node
// Keep hook startup small: the collector and git resolver are loaded only for collect.
const args = process.argv.slice(2);
if (args[0] === 'hook' && args[1] === 'prompt') {
  try {
    const { readFileSync } = await import('node:fs');
    const { recordPrompt } = await import('./lib/time/prompts-hook.mjs');
    recordPrompt(readFileSync(0, 'utf8'));
  } catch { /* Hooks must never block the host session or emit prompt content. */ }
  process.exitCode = 0;
} else if (args[0] === 'collect' && args.slice(1).every(a => a === '--report')) {
  try {
    const { collect } = await import('./lib/time/transcripts.mjs');
    const report = await collect();
    if (args.includes('--report')) console.log(JSON.stringify(report, null, 2));
    else console.log(`Collected ${report.events} events from ${report.files} files (${report.seconds.toFixed(2)}s) · canary ${(report.canary.share * 100).toFixed(1)}%`);
    if (!report.canary.pass) console.error('! Format canary failed; inspect collect --report before using these events.');
  } catch { console.error('Collection failed: check storage permissions, registry, and collect.lock.'); process.exitCode = 2; }
} else {
  console.error('Usage: node scripts/timesheet.mjs collect [--report] | hook prompt');
  process.exitCode = 2;
}
