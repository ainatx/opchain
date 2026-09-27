#!/usr/bin/env node
// Hooks avoid loading the collector and run independently of the ordinary CLI.
const args = process.argv.slice(2);
if (args.includes('--help') || args[0] === 'help') {
  try { const { help } = await import('./lib/time/cli.mjs'); console.log(help(args[0] === 'help' ? args[1] : args[0] === '--help' ? undefined : args[0]).trimEnd()); }
  catch { console.error('✗ Unknown command. Run: timesheet help'); process.exitCode = 2; }
} else if (args[0] === 'hook' && args[1] === 'prompt') {
  try {
    const { readFileSync } = await import('node:fs');
    const { recordPrompt } = await import('./lib/time/prompts-hook.mjs');
    recordPrompt(readFileSync(0, 'utf8'));
  } catch { /* Hooks must never block the host session or emit prompt content. */ }
  process.exitCode = 0;
} else if (args[0] === 'nudge') {
  try {
    if (args.length === 3 && args[1] === '--cwd') {
      const { execFileSync } = await import('node:child_process');
      const { fileURLToPath } = await import('node:url');
      const output = execFileSync(process.execPath, [fileURLToPath(new URL('./lib/time/nudge.mjs', import.meta.url)), args[2]],
        { encoding: 'utf8', timeout: 400, killSignal: 'SIGKILL', maxBuffer: 16384, stdio: ['ignore', 'pipe', 'ignore'] });
      if (output) process.stdout.write(output);
    }
  } catch { /* Slow or unavailable cache: stay silent and end the child. */ }
  process.exitCode = 0;
} else {
  try {
    const { runCli } = await import('./lib/time/cli.mjs');
    process.exitCode = await runCli(args, { cwd: process.env.npm_lifecycle_event === 'timesheet' ? process.env.INIT_CWD || process.cwd() : process.cwd() });
  } catch (error) {
    const { wrap } = await import('./lib/time/render.mjs');
    console.error(wrap(`✗ ${error.exitCode ? error.message : 'Unavailable billing data or storage. Check configuration, permissions and locks.'}`));
    process.exitCode = error.exitCode || 2;
  }
}
