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
    maxWorkers: 2,
    include: ["tests/**/*.test.js", "tests/**/*.test.mjs"],
    // The Worker relies on `crypto.subtle` which is available in Node 20+.
    // No additional environment shim needed.
  },
});
