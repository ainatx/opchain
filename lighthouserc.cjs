// LHCI config — uses .cjs so per-route thresholds can carry inline reasons.
//
// Calibration data — median of 3 runs on PR #495 (2026-09-08). Best Practices
// is shown as it reads once the preview server below answers /api/health
// (verified locally: the 404 was the category's only deduction):
//   /                          Perf 0.99  A11y 1.00  Best 1.00  SEO 1.00
//   /skills                    Perf 0.99  A11y 1.00  Best 1.00  SEO 1.00
//   /skills/oc-app-architect   Perf 1.00  A11y 1.00  Best 1.00  SEO 1.00
//   /skills/oc-release-ops     Perf 0.99  A11y 1.00  Best 1.00  SEO 1.00
//   /architecture              Perf 0.99  A11y 1.00  Best 1.00  SEO 1.00
//   /demo                      Perf 0.97  A11y 1.00  Best 1.00  SEO 1.00
//   /changelog                 Perf 0.99  A11y 1.00  Best 1.00  SEO 1.00
//
// Best Practices read 0.96 on every route from 2026-08 to 2026-09-11. That was
// not a site regression: the Header's live-version chip fetches /api/health on
// load, `astro preview` has no Worker routes, and the resulting console 404
// failed the weight-1 `errors-in-console` audit. The gate is 0.95, so the whole
// site sat one deduction from a red required check. scripts/lhci-preview.mjs
// serves the same static build plus that one route; every other /api/* path
// still 404s so an unstubbed fetch shows up here as the error it would be. It
// gzips text above 1 KiB the way Vite's preview does: Lighthouse's simulated
// throttling prices transfer size, and an uncompressed /demo (1.4 MB of HTML)
// scored 0.83 on the first run of PR #498 against 0.97 compressed.
//
// Every route is now `error`-level. /architecture, /skills/oc-app-architect,
// /skills/oc-release-ops and /changelog had sat at `warn` "awaiting
// calibration" since v1.3; the medians above are stable, so they gate. The
// skill detail pages share one Astro template, so two of them are enough to
// catch template-level regressions. Thinnest margin: /demo Perf at 0.97.
// Earlier history: roadmap/05-post-sprint-7-backlog.md B-01 (initial
// calibration) and B-08 (/demo a11y raised back from 0.91).

const ROUTE_GATE = {
  "categories:performance":    ["error", { minScore: 0.95 }],
  "categories:accessibility":  ["error", { minScore: 0.95 }],
  "categories:best-practices": ["error", { minScore: 0.95 }],
  "categories:seo":            ["error", { minScore: 0.95 }],
};

module.exports = {
  ci: {
    collect: {
      // scripts/lhci-preview.mjs, not `astro preview`: the same site/dist,
      // plus a 200 for /api/health. Run from site/ (see lighthouse.yml).
      startServerCommand: "node ../scripts/lhci-preview.mjs --dir dist --host 127.0.0.1 --port 4321",
      startServerReadyPattern: "Local",
      url: [
        "http://127.0.0.1:4321/",
        "http://127.0.0.1:4321/skills",
        "http://127.0.0.1:4321/skills/oc-app-architect",
        "http://127.0.0.1:4321/skills/oc-release-ops",
        "http://127.0.0.1:4321/architecture",
        "http://127.0.0.1:4321/demo",
        "http://127.0.0.1:4321/changelog",
      ],
      numberOfRuns: 3,
      settings: { preset: "desktop" },
    },
    assert: {
      assertMatrix: [
        { matchingUrlPattern: ":4321/$",                    assertions: ROUTE_GATE },
        { matchingUrlPattern: "/skills$",                   assertions: ROUTE_GATE },
        { matchingUrlPattern: "/skills/oc-app-architect$",  assertions: ROUTE_GATE },
        { matchingUrlPattern: "/skills/oc-release-ops$",    assertions: ROUTE_GATE },
        { matchingUrlPattern: "/architecture$",             assertions: ROUTE_GATE },
        { matchingUrlPattern: "/demo$",                     assertions: ROUTE_GATE },
        { matchingUrlPattern: "/changelog$",                assertions: ROUTE_GATE },
      ],
    },
    upload: { target: "temporary-public-storage" },
  },
};
