import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for opchain.dev e2e tests.
 *
 * Target: the static Astro build served by Astro's preview server. The
 * Worker (and its feedback / redirect logic) is NOT exercised by this
 * harness — those flows live in Vitest tests and a future e2e suite
 * that boots `wrangler dev`.
 *
 * Scope: static pages + client-side islands (filter, consent banner,
 * copy-to-clipboard). Consent tests rely on `PUBLIC_POSTHOG_KEY` and
 * `PUBLIC_POSTHOG_HOST` being set at BUILD time so
 * the banner's accept path can fire the PostHog bootstrap. The CI
 * pipeline sets that env before running `astro build`; for local runs
 * `npm run test:e2e` inherits whatever is in your shell (unset →
 * consent-accept test is skipped).
 *
 * Which server, which port. Several git worktrees of this repo live side
 * by side on a maintainer's machine. With a fixed port 4321 and
 * `reuseExistingServer: !CI`, a preview left running by ONE worktree was
 * silently adopted by `npm run test:e2e` in EVERY other worktree, so the
 * suite passed or failed against the wrong `dist/`. Observed 2026-09-11:
 * a spec that should have failed against the current build passed
 * because a preview started 2026-09-01 from another worktree's `site/`
 * was still serving its HTML on 4321. Three rules close that hole:
 *
 *   1. The port is derived from this worktree's path (see
 *      `worktreePort()`), so parallel worktrees never share one.
 *      `PW_PORT=<n>` overrides it. CI keeps 4321 — it runs on a clean
 *      runner and already starts its own server.
 *   2. `reuseExistingServer` is always false. If something is already
 *      listening on the port, Playwright aborts with "<url> is already
 *      used" instead of testing whatever that process happens to serve.
 *      Find it with `lsof -nP -iTCP:<port> -sTCP:LISTEN` and kill it by
 *      hand. Do NOT switch the flag back on to get past that error —
 *      the silent wrong-build pass above is exactly what it re-enables.
 *   3. The server is booted by `tests/e2e/preview-server.mjs`, not the
 *      `astro preview` CLI. Under an AI coding agent the Astro 7 CLI
 *      forks a detached daemon and exits, which is both why Playwright
 *      reported "exited early" and where the orphan on 4321 came from.
 *      The launcher uses Astro's programmatic `preview()` and stays in
 *      the foreground, so nothing outlives the run.
 */

/**
 * Stable per-worktree preview port.
 *
 * Hashes the directory this config lives in (not `process.cwd()`, which
 * changes with how the suite is invoked) into 20000–29999: above the
 * common dev-server ports, below the Linux and macOS ephemeral ranges.
 * Two worktrees colliding would need matching SHA-256 prefixes mod 10000;
 * if that ever happens, `PW_PORT` is the escape hatch.
 */
function worktreePort(): number {
  const override = Number(process.env.PW_PORT);
  if (Number.isInteger(override) && override > 0 && override < 65536) {
    return override;
  }
  if (process.env.CI) return 4321;
  const here = fileURLToPath(new URL(".", import.meta.url));
  const digest = createHash("sha256").update(here).digest();
  return 20000 + (digest.readUInt32BE(0) % 10000);
}

const PORT = worktreePort();

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }], ["list"]]
    : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Astro's static preview server over `dist/`, in the foreground (rule 3
    // above). The Worker is not booted — /api/* routes are mocked per-test
    // via `page.route()`.
    command: `node tests/e2e/preview-server.mjs --host 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    // Never adopt a server we did not start (rule 2 above).
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
