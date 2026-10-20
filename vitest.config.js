import { defineConfig } from "vitest/config";

export default defineConfig({
  // Replace the build-time version identifier so `src/index.js` imports cleanly.
  define: {
    __OPCHAIN_VERSION__: JSON.stringify("test"),
  },
  test: {
    environment: "node",
    // Git/process fixtures each spawn their own children. Bound file workers
    // to avoid machine-wide contention turning ordinary checks into timeouts.
    // Three since 2026-10-19: at two, the suite (539 s of file time) no longer
    // fit the commit gate's budget (.bugcheck.json verification.timeout_ms).
    maxWorkers: 3,
    // Spawn-heavy suites (git fixtures, CLI child processes) sat near the 5 s
    // default and flaked under machine load (audit A-09). Real hangs still fail.
    testTimeout: 20_000,
    hookTimeout: 20_000,
    include: ["tests/**/*.test.js", "tests/**/*.test.mjs"],
    // The Worker relies on `crypto.subtle` which is available in Node 20+.
    // No additional environment shim needed.
  },
});
