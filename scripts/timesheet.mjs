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
} else if (['draft', 'verify'].includes(args[0])) {
  try {
    const { loadContext, draftDay, verify } = await import('./lib/time/derive.mjs');
    const { localDate, dayBounds } = await import('./lib/time/blocks.mjs');
    if (args[0] === 'verify') {
      if (args.length !== 1) throw new Error('Usage: verify');
      const result = verify(loadContext());
      for (const check of result.checks) console.log(`${check.pass ? '✓' : '✗'} ${check.label}`);
      process.exitCode = result.pass ? 0 : 1;
    } else {
      let context = loadContext();
      const today = localDate(Date.now(), context.config.timezone);
      let dates;
      if (args.length <= 2 && !args[1]?.startsWith('--')) dates = [args[1] || today];
      else if (args.length === 3 && args[1] === '--since') {
        const since = args[2]; dayBounds(since, context.config.timezone);
        if (since > today) throw new Error('Invalid date range');
        dates = [];
        for (let d = since; d <= today; d = new Date(Date.parse(`${d}T00:00:00Z`) + 86400000).toISOString().slice(0, 10)) dates.push(d);
      } else throw new Error('Usage: draft [YYYY-MM-DD] | draft --since YYYY-MM-DD');
      for (const date of dates) dayBounds(date, context.config.timezone);
      const { collect } = await import('./lib/time/transcripts.mjs');
      await collect(); context = loadContext();
      for (const date of dates) {
        const result = await draftDay(context, date);
        console.log(`${date} · block ${result.block_minutes.toFixed(2)}m · human cadence ${result.human_cadence_minutes.toFixed(2)}m · unpriced ${(result.cost.unpriced_share * 100).toFixed(1)}% · appended ${result.appended}`);
        for (const warning of result.warnings) console.error(`! ${warning}`);
        if (result.cost.unpriced_models.length) console.error(`! Unpriced models: ${result.cost.unpriced_models.join(', ')}`);
      }
      if (!context.canary.pass) { console.error('✗ Format canary failed; drafts written but approval blocked.'); process.exitCode = 1; }
    }
  } catch (error) {
    console.error(error.exitCode ? `✗ ${error.message}` : '✗ Invalid arguments or unavailable billing data.');
    process.exitCode = error.exitCode || 2;
  }
} else {
  console.error('Usage: node scripts/timesheet.mjs collect [--report] | hook prompt | draft [date] [--since date] | verify');
  process.exitCode = 2;
}
