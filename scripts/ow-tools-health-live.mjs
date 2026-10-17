#!/usr/bin/env node
// Opt-in live check of `ow-tools health` against public hosts, for the
// owner's manual verification (Sprint T contract, Test requirements). It is
// NOT a test and NOT an npm script: CI never runs it, because it reaches the
// internet. Run it yourself: `node scripts/ow-tools-health-live.mjs`.
//
// What it sends: the name and version of one invented-project dependency
// (lodash 4.17.21, a public npm package) to api.osv.dev and its name to
// registry.npmjs.org; example.com to its RDAP server (via data.iana.org); a
// TLS handshake and a GET to example.com. The result's `requests` list shows
// each request ow-tools made.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const { health, healthText } = await import(join(ROOT, "plugins", "ow-tools", "lib", "health.mjs"));

const d = mkdtempSync(join(tmpdir(), "ow-health-live-"));
try {
  mkdirSync(join(d, "app"));
  writeFileSync(join(d, "app", "package.json"), JSON.stringify({ name: "live-check", version: "1.0.0", private: true, dependencies: { lodash: "^4.17.21" } }));
  writeFileSync(
    join(d, "app", "package-lock.json"),
    JSON.stringify({
      name: "live-check",
      version: "1.0.0",
      lockfileVersion: 3,
      packages: {
        "": { name: "live-check", version: "1.0.0", dependencies: { lodash: "^4.17.21" } },
        "node_modules/lodash": { version: "4.17.21", resolved: "https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz" },
      },
    }),
  );
  writeFileSync(join(d, "health.yaml"), "schema: 1\nrepo: app\nhosts: [example.com]\ndomains: [example.com]\nurls: [https://example.com/]\n");
  const r = await health({ config: join(d, "health.yaml"), noNetwork: process.argv.includes("--no-network") }, { env: { ...process.env, OW_TOOLS_HOME: join(d, "home") } });
  if (process.argv.includes("--json")) process.stdout.write(`${JSON.stringify(r, null, 2)}\n`);
  else {
    process.stdout.write(`${healthText(r)}\n\nRequests made:\n`);
    for (const q of r.requests) process.stdout.write(`  ${q.kind === "tls" ? `TLS ${q.host}:${q.port}` : `${q.method} https://${q.host}${q.path}${q.bytes ? ` (${q.bytes}-byte body)` : ""}`}\n`);
  }
} finally {
  rmSync(d, { recursive: true, force: true });
}
