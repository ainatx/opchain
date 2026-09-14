/**
 * Foreground static preview server for the Playwright harness.
 *
 * Playwright's `webServer` needs a command that stays attached until it is
 * killed. Astro 7's `astro preview` CLI no longer promises that: when the
 * `am-i-vibing` detector sees an AI coding agent (Claude Code exports
 * `CLAUDECODE=1`; other agents have their own markers) the CLI forks a
 * detached daemon, prints "Preview server running (pid …)" and exits.
 * Playwright then reports "Process from config.webServer exited early",
 * the daemon outlives the run, and the NEXT run in any worktree finds a
 * server already on the port. That is how a preview started 2026-09-01
 * from another worktree's `site/` held 127.0.0.1:4321 for ten days and
 * quietly served its HTML to every other worktree's e2e suite. The CLI
 * also keeps a per-project lock file (`.astro/preview.json`) and refuses
 * to start while a human's own `astro preview` runs in the same worktree.
 *
 * This launcher uses Astro's public programmatic API instead. It boots the
 * same static server the CLI would, minus agent detection, daemonising,
 * `--json` logging, and the lock file, and it stays in the foreground
 * until the server closes or the process is signalled — which is how
 * Playwright stops it. Nothing here survives the test run.
 *
 * Usage (from `site/`): node tests/e2e/preview-server.mjs --port <n> [--host <addr>]
 */
import { fileURLToPath } from "node:url";
import { preview } from "astro";

function flag(name, fallback) {
  const at = process.argv.indexOf(name);
  return at !== -1 && process.argv[at + 1] !== undefined
    ? process.argv[at + 1]
    : fallback;
}

const port = Number(flag("--port"));
if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  console.error("preview-server: --port <1-65535> is required");
  process.exit(2);
}
const host = flag("--host", "127.0.0.1");

// `site/` — the Astro project root, resolved from this file so the server
// serves THIS worktree's `dist/` no matter where the command was run from.
const root = fileURLToPath(new URL("../../", import.meta.url));

// Inline `server.{host,port}` override astro.config.mjs, exactly as the
// CLI's `--host` / `--port` flags do (see astro/dist/cli/flags.js).
const server = await preview({ root, server: { host, port } });

let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  await server.stop();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

await server.closed();
