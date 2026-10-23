import { copyFileSync, mkdirSync, symlinkSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const TAG_GATE_SOURCES = [
  "scripts/check-release-tag.mjs",
  "scripts/prepare-ow-tools-pin.mjs",
  "scripts/lib/catalogs.mjs",
  "scripts/lib/frontmatter.mjs",
  "scripts/lib/ow-tools-release.mjs",
  "scripts/lib/work-release.mjs",
];
const YAML_PACKAGE = dirname(createRequire(import.meta.url).resolve("js-yaml/package.json"));

// All isolated release entrypoints share the tag gate's import closure. Copy
// real current sources (including files not yet in HEAD), never fallback stubs
// or release data. Missing sources fail setup; release assertions stay local.
export function copyReleaseGateFixture(root, additionalSources = []) {
  const sources = [...new Set([...TAG_GATE_SOURCES, ...additionalSources])];
  for (const file of sources) {
    const target = join(root, file);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(ROOT, file), target);
  }
  // Mount only the real installed YAML dependency used by frontmatter.mjs.
  mkdirSync(join(root, "node_modules"), { recursive: true });
  symlinkSync(YAML_PACKAGE, join(root, "node_modules", "js-yaml"), "dir");
  return sources;
}
