/**
 * The skill router's status, as every site page states it.
 *
 * Router release terms (sprints/release-2.1/ow-family-sprint-plan.md, Track E,
 * owner 2026-10-16): term 1, each mention calls it "experimental preview";
 * term 4, `OPCHAIN_ROUTE_MODE=live` was unsupported until the shadow-period
 * go/no-go (docs/runbooks/skill-router-eval.md §6) recorded a GO. Until then
 * router copy read "experimental preview, shadow only, verdict pending"
 * (Track S decision D7, owner 2026-10-17).
 *
 * The go/no-go recorded a GO on 2026-11-05
 * (docs/audits/2026-11-05-jev-performance-since-install.md: 65 suggestions,
 * precision 0.836, recall 0.836, silent rate 0.954). Per Track S S5 that makes
 * live mode a supported opt-in and drops "verdict pending"; shadow stays the
 * shipped default, and whether the router changes skill use is not measured
 * yet. The experimental-label e2e (site/tests/e2e/router-label.spec.ts) reads
 * these constants, so the pages and the test move together.
 */
export const ROUTER_LABEL = "experimental preview, shadow by default, live opt-in since GO (2026-11-05)";

/** How every page names live mode now that a GO is recorded. */
export const ROUTER_LIVE_MODE =
  "supported as an opt-in since the shadow-period go/no-go recorded a GO on 2026-11-05";
