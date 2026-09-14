/**
 * The brand-generation mark that rides the wordmark: "opchain" + a small
 * "2.0" badge (lockup option A, decided 2026-09-07).
 *
 * This is NOT the release version. `Header.astro`'s CURRENT_RELEASE ("v1.9",
 * "v2.0", "v2.1" …) is the live claim of what has shipped and is bound to
 * every other release surface by scripts/check-release-surfaces.mjs. The
 * lockup generation only moves on a MAJOR: it stays "2.0" through v2.1, v2.2,
 * v2.3, and becomes "3.0" when the next major lands.
 *
 * Because it names a generation, it is a *forward* surface in the sense of
 * skills/oc-release-ops/references/site-release-surfaces.md (F9): it is set
 * in the build PR of the major that introduces it, and that PR must not deploy
 * ahead of the cut — the same rule the v2.0 architecture rail follows.
 */
export const LOCKUP_GENERATION = "2.0";
