// Minimal YAML-frontmatter parser for SKILL.md files, replacing gray-matter.
//
// gray-matter@4.0.3 is unmaintained (no release since 2019) and pins its own
// js-yaml@^3.13.1, which carries unpatchable Dependabot alerts (its v3-API
// safeLoad/safeDump calls are incompatible with js-yaml 4.x+, so the nested
// dependency can never be bumped). SKILL.md frontmatter is a narrow, fully
// first-party-authored format — standard `---\n...\n---\n` YAML delimiters,
// no alternate engines (TOML/JSON) or custom delimiters ever used — so the
// full gray-matter API surface isn't needed; this covers exactly what
// scripts/gen-skills-catalog.mjs and scripts/gen-mcp-catalog.mjs call.

import * as yaml from "js-yaml"; // namespace import: js-yaml 5 dropped the default export, v4 keeps the named ones

const DELIM = /^---\r?\n/;
const CLOSING_DELIM = /\r?\n---\r?\n?/;

/**
 * Parse `---\nYAML\n---\nbody` into `{ data, content }`, matching the subset
 * of gray-matter's behavior this repo relies on. Input without a leading
 * `---` delimiter is treated as having no frontmatter (data: {}, content:
 * the raw input unchanged) — same fallback gray-matter uses.
 */
export function matter(raw) {
  if (!DELIM.test(raw)) {
    return { data: {}, content: raw };
  }
  const afterOpen = raw.slice(raw.match(DELIM)[0].length);
  const closeMatch = afterOpen.match(CLOSING_DELIM);
  if (!closeMatch) {
    return { data: {}, content: raw };
  }
  const yamlBlock = afterOpen.slice(0, closeMatch.index);
  const content = afterOpen.slice(closeMatch.index + closeMatch[0].length);
  const data = yaml.load(yamlBlock) ?? {};
  return { data, content };
}
