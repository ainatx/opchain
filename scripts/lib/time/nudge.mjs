// Runs inside a time-limited child. No collector, normalized event or transcript reads.
import { fileURLToPath } from 'node:url';
import { loadView } from './cli-service.mjs';
import { renderNudge } from './render.mjs';
export function nudge(env, cwd) {
  try {
    const view = loadView(env, cwd);
    return renderNudge(view.client, view.today, view.entries, view.canary);
  } catch { return ''; }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) process.stdout.write(nudge(process.env, process.argv[2]));
