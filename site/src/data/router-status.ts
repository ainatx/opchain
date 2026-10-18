/**
 * The skill router's status, as every site page states it.
 *
 * Router release terms (sprints/release-2.1/ow-family-sprint-plan.md, Track E,
 * owner 2026-10-16): term 1, each mention calls it "experimental preview";
 * term 4, `OPCHAIN_ROUTE_MODE=live` is unsupported until the shadow-period
 * go/no-go (docs/runbooks/skill-router-eval.md §6) records a GO. With no
 * verdict yet, router copy reads exactly the label below (Track S decision D7,
 * owner 2026-10-17).
 *
 * One place to change at the release cut (Track S S5): a recorded GO makes
 * live mode "supported, opt-in" and replaces "verdict pending"; a NO-GO keeps
 * live mode unsupported. The experimental-label e2e
 * (site/tests/e2e/router-label.spec.ts) reads this constant, so the pages and
 * the test move together.
 */
export const ROUTER_LABEL = "experimental preview, shadow only, verdict pending";

/** How every page names live mode until a GO is recorded. */
export const ROUTER_LIVE_MODE = "unsupported until the go/no-go records a GO";
