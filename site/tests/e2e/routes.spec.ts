import { writeFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

// ── colour helpers for the /security CTA test ──────────────────────────────
// Parse a computed CSS colour (Chromium serialises sRGB as `rgb()`/`rgba()`;
// color-mix() results can come back as `color(srgb …)`). Returns sRGB in
// 0..1 plus alpha, or null for anything else.
function parseCssColor(value: string): [number, number, number, number] | null {
  const alphaOf = (raw: string | undefined) =>
    raw === undefined ? 1 : raw.endsWith("%") ? parseFloat(raw) / 100 : parseFloat(raw);
  const legacy = value.match(
    /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/,
  );
  if (legacy) {
    return [Number(legacy[1]) / 255, Number(legacy[2]) / 255, Number(legacy[3]) / 255, alphaOf(legacy[4])];
  }
  const modern = value.match(
    /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/,
  );
  if (modern) {
    return [Number(modern[1]), Number(modern[2]), Number(modern[3]), alphaOf(modern[4])];
  }
  return null;
}

function relativeLuminance([r, g, b]: number[]): number {
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG 2.x contrast ratio between two computed colours; 0 if unparseable. */
function contrastRatio(a: string, b: string): number {
  const pa = parseCssColor(a);
  const pb = parseCssColor(b);
  if (!pa || !pb) return 0;
  const la = relativeLuminance(pa);
  const lb = relativeLuminance(pb);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

interface Paint {
  color: string;
  background: string;
  ratio: number;
  opaque: boolean;
}

async function paint(el: Locator): Promise<Paint> {
  const { color, background } = await el.evaluate((node) => {
    const cs = getComputedStyle(node);
    return { color: cs.color, background: cs.backgroundColor };
  });
  const fg = parseCssColor(color);
  const bg = parseCssColor(background);
  return {
    color,
    background,
    ratio: contrastRatio(color, background),
    opaque: fg !== null && bg !== null && fg[3] === 1 && bg[3] === 1,
  };
}

async function expectNoContrastViolations(page: Page, selector: string) {
  const { violations } = await new AxeBuilder({ page })
    .include(selector)
    .withRules(["color-contrast"])
    .analyze();
  expect(violations).toEqual([]);
}

/**
 * Smoke: every top-level route renders.
 *
 * For each route we assert:
 *   - expected HTTP status (200 or listed)
 *   - an h1 matches the page (regex)
 *   - Axe finds zero violations (B-02, B-11)
 */

interface RouteSpec {
  path: string;
  h1: RegExp;
  /** Axe rule IDs to disable for this route, with a one-line reason. */
  disabledRules?: { id: string; reason: string }[];
}

// B-11: "/" is fully clean after B-10. All other routes still have pre-existing
// light-mode color-contrast failures that require a dedicated sweep. Remove this
// disable per-route as each one is fixed.
const COLOR_CONTRAST_DISABLE = {
  id: "color-contrast",
  reason: "B-11: light-mode contrast sweep in progress — fix and remove per-route",
};

const ROUTES: RouteSpec[] = [
  { path: "/",              h1: /opchain/i },
  { path: "/architecture",  h1: /opchain skills ecosystem/i,  disabledRules: [COLOR_CONTRAST_DISABLE] },
  { path: "/install",       h1: /four flows/i,                disabledRules: [COLOR_CONTRAST_DISABLE] },
  { path: "/skills",        h1: /every skill, filterable/i,  disabledRules: [COLOR_CONTRAST_DISABLE] },
  { path: "/skills/oc-app-architect", h1: /app architect/i,      disabledRules: [COLOR_CONTRAST_DISABLE] },
  { path: "/skills/oc-code-auditor",  h1: /code auditor/i,       disabledRules: [COLOR_CONTRAST_DISABLE] },
  {
    path: "/demo",
    // The page intro h1 is "Watch a finished run." after the magazine
    // cover relocated to the homepage (port chunk 2). The rotating
    // scenario title now lives on / as an <h2>.
    h1: /watch a finished run/i,
    disabledRules: [
      COLOR_CONTRAST_DISABLE,
      {
        id: "region",
        reason:
          "chat-bubble mock content sits inside main but Axe wants extra landmarks",
      },
    ],
  },
  { path: "/privacy",    h1: /privacy/i,    disabledRules: [COLOR_CONTRAST_DISABLE] },
  { path: "/styleguide", h1: /styleguide/i, disabledRules: [COLOR_CONTRAST_DISABLE] },
  { path: "/pipeline-builder", h1: /design your opchain stack/i, disabledRules: [COLOR_CONTRAST_DISABLE] },
  {
    path: "/security",
    h1: /security disclosure/i,
    disabledRules: [
      COLOR_CONTRAST_DISABLE,
      {
        id: "link-in-text-block",
        reason:
          "the analytics config row inlines a /privacy link inside prose; needs the same underline-on-rest CSS sweep as /changelog — track separately from this PR",
      },
    ],
  },
  // v1.3 carry-over from v1.2: /changelog joined the route smoke suite.
  {
    path: "/changelog",
    h1: /changelog/i,
    disabledRules: [
      COLOR_CONTRAST_DISABLE,
      {
        id: "link-in-text-block",
        reason:
          "changelog inlines /demo anchor links inside paragraphs; needs an underline-on-rest CSS sweep — track separately from this PR",
      },
    ],
  },
  // v1.6 "the instrumented pipeline": /dashboard renders the anonymized usage
  // aggregate + replays. Labeled sample data until a live export ships.
  { path: "/dashboard", h1: /instrumented pipeline/i, disabledRules: [COLOR_CONTRAST_DISABLE] },
];

test.describe("routes render", () => {
  for (const { path, h1, disabledRules } of ROUTES) {
    test(`${path} returns 200 with its h1`, async ({ page }) => {
      const res = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(res, `no response for ${path}`).not.toBeNull();
      expect(res!.status(), `unexpected status for ${path}`).toBe(200);
      await expect(page.locator("h1").first()).toHaveText(h1);
    });

    test(`Axe ${path} reports zero a11y violations`, async ({
      page,
    }, testInfo) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      let builder = new AxeBuilder({ page }).withTags([
        "wcag2a",
        "wcag2aa",
        "wcag21a",
        "wcag21aa",
        "best-practice",
      ]);
      if (disabledRules?.length) {
        builder = builder.disableRules(disabledRules.map((r) => r.id));
      }
      const { violations } = await builder.analyze();
      // Persist the JSON to disk so the post-test PR-comment step can
      // surface it. Path-based attach (rather than body-based) writes
      // an actual file to the test's outputDir; body-based attach only
      // lives in the HTML report metadata.
      if (violations.length > 0) {
        const slug =
          path === "/" ? "root" : path.replace(/^\//, "").replace(/\//g, "_");
        const file = testInfo.outputPath(`axe-violations-${slug}.json`);
        writeFileSync(file, JSON.stringify(violations, null, 2));
        await testInfo.attach(`axe-violations-${slug}.json`, {
          path: file,
          contentType: "application/json",
        });
      }
      expect(
        violations.map((v) => ({ id: v.id, nodes: v.nodes.length })),
        `Axe ${path}: unexpected violations — see attached artifact, then either fix in source or add to disabledRules in routes.spec.ts with a reason`,
      ).toEqual([]);
    });
  }

  test("/security private-advisory CTA keeps legible text", async ({ page }) => {
    // Guards the #465 regression: the CTA's text vanished against its fill in
    // one theme. The invariant is the *relationship* between text and fill
    // (opaque, ≥ 4.5:1, Axe-clean, and hover visibly restyles the button),
    // not the palette. An earlier version pinned Forge rgb() literals, which
    // the v2.0 Slate & Emerald token sheet broke on PR #490 without any
    // legibility regression. Palette changes must not touch this test.
    await page.goto("/security", { waitUntil: "domcontentloaded" });
    const selector = ".sec-cta-btn";
    const cta = page.getByRole("link", {
      name: "Open a private security advisory on GitHub",
    });

    await expect(cta).toBeVisible();
    for (const theme of ["dark", "light"] as const) {
      await page.evaluate((value) => {
        document.documentElement.setAttribute("data-theme", value);
      }, theme);
      await page.mouse.move(0, 0);

      const rest = await paint(cta);
      expect(rest.opaque, `${theme}: rest paint must be opaque (${rest.color} on ${rest.background})`).toBe(true);
      expect(
        rest.ratio,
        `${theme}: rest text ${rest.color} on ${rest.background} is ${rest.ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
      await expectNoContrastViolations(page, selector);

      await cta.hover();
      const hover = await paint(cta);
      expect(hover.opaque, `${theme}: hover paint must be opaque (${hover.color} on ${hover.background})`).toBe(true);
      expect(
        hover.ratio,
        `${theme}: hover text ${hover.color} on ${hover.background} is ${hover.ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(hover.background, `${theme}: hover must restyle the fill`).not.toBe(rest.background);
      await expectNoContrastViolations(page, selector);
    }
  });

  test("404 route renders the 404 page", async ({ page }) => {
    const res = await page.goto("/definitely-not-a-real-route", {
      waitUntil: "domcontentloaded",
    });
    expect(res!.status()).toBe(404);
    await expect(page.locator("h1").first()).toHaveText(/nothing to see here/i);
  });
});
