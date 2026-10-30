// js-yaml ships no types and the site has no @types/js-yaml; lib/work.ts only
// needs `load`. The package resolves from the repository root's node_modules
// (the same copy scripts/check-skill-contracts.mjs reads the edges files with).
declare module "js-yaml" {
  export function load(src: string, opts?: { filename?: string }): unknown;
}
