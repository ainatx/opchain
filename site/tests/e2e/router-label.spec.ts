import { expect, test } from "@playwright/test";
import { ROUTER_LABEL } from "../../src/data/router-status";

/**
 * Router release terms on the rendered site (Track S row 49, from Track E E3).
 *
 * Source: sprints/release-2.1/ow-family-sprint-plan.md, Track E, "Router
 * release terms" (owner, 2026-10-16), and sprints/release-2.1/
 * track-s-site-surfaces.md row 49:
 *
 *   - term 1: /install, /privacy, /security and /architecture show the
 *     "experimental preview" label beside their router copy. Until the
 *     shadow-period go/no-go records a verdict the label reads exactly
 *     ROUTER_LABEL ("experimental preview, shadow only, verdict pending").
 *   - term 3: /privacy names api.typesafe.ai.
 *   - term 4: no page says OPCHAIN_ROUTE_MODE=live without "unsupported" in
 *     the same block, until a GO is recorded.
 *
 * Router copy is marked with `data-router-copy`; each such block must carry
 * the label itself, so a router paragraph added later without the label fails
 * here rather than in review.
 */

const LABEL_PAGES = ["/install", "/privacy", "/security", "/architecture", "/glossary"];

// Every built page that can mention the router. The changelog card is S0's
// (main) and already labelled; it is scanned for the live-mode rule too.
const LIVE_MODE_PAGES = [
  "/",
  "/install",
  "/privacy",
  "/security",
  "/architecture",
  "/glossary",
  "/changelog",
  "/for-agencies",
];

test.describe("skill router: experimental-preview label", () => {
  for (const path of LABEL_PAGES) {
    test(`${path} labels every block of router copy`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const blocks = page.locator("[data-router-copy]");
      const count = await blocks.count();
      expect(count, `${path}: no [data-router-copy] block`).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const block = blocks.nth(i);
        const text = (await block.textContent()) ?? "";
        expect(text, `${path}: router block ${i} has no label`).toContain("experimental preview");
        await expect(
          block.locator("[data-router-label]").first(),
          `${path}: router block ${i} lacks the RouterLabel component`,
        ).toHaveText(ROUTER_LABEL);
      }

      // At least one label is actually on screen at this viewport (the
      // architecture page swaps desktop and mobile diagrams with CSS).
      const visibleLabels = page.locator("[data-router-label]:visible");
      expect(await visibleLabels.count(), `${path}: no visible router label`).toBeGreaterThan(0);

      // Router copy outside a labelled block: any text in <main> or the
      // enforcement map that names the router's key, endpoint or name. A
      // same-page jump link (a table of contents) is navigation, not copy; a
      // text that carries "experimental preview" itself is labelled in place.
      const unlabelled = await page.evaluate(() => {
        const ROUTER_TEXT = /TYPESAFE_API_KEY|api\.typesafe\.ai|skill router|Jev rail/i;
        const roots = Array.from(document.querySelectorAll("main, #enforcement-map"));
        const out: string[] = [];
        for (const root of roots) {
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            const text = n.textContent ?? "";
            if (!ROUTER_TEXT.test(text)) continue;
            const el = n.parentElement;
            if (el?.closest("[data-router-copy]")) continue;
            if (el?.closest('a[href^="#"]')) continue;
            if (/experimental preview/i.test(text)) continue;
            out.push(text.trim().slice(0, 120));
          }
        }
        return out;
      });
      expect(unlabelled, `${path}: router copy outside a labelled [data-router-copy] block`).toEqual([]);
    });
  }

  test("/privacy names api.typesafe.ai in the router disclosure", async ({ page }) => {
    await page.goto("/privacy", { waitUntil: "domcontentloaded" });
    const router = page.locator("#router[data-router-copy]");
    await expect(router).toBeVisible();
    await expect(router).toContainText("api.typesafe.ai");
    await expect(router).toContainText("OPCHAIN_ROUTE_CONTEXT=1");
    await expect(router).toContainText("$TMPDIR/opchain-route-log.jsonl");
    await expect(router).toContainText("OPCHAIN_ROUTE=0");
  });

  for (const path of LIVE_MODE_PAGES) {
    test(`${path} never offers OPCHAIN_ROUTE_MODE=live as supported`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      // For every element whose own text names live mode, the nearest block
      // around it must say "unsupported".
      const offenders = await page.evaluate(() => {
        const BLOCK = "p, li, dd, td, pre, .kv, .jrail-anchor, figure, blockquote, text, title";
        const out: string[] = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (!(n.textContent ?? "").includes("OPCHAIN_ROUTE_MODE=live")) continue;
          const el = n.parentElement;
          const block = el?.closest(BLOCK) ?? el;
          const text = block?.textContent ?? "";
          if (!/unsupported/i.test(text)) out.push(text.trim().slice(0, 160));
        }
        // aria-labels are read aloud: hold them to the same rule.
        for (const el of Array.from(document.querySelectorAll("[aria-label]"))) {
          const label = el.getAttribute("aria-label") ?? "";
          if (/OPCHAIN_ROUTE_MODE=live|live mode/i.test(label) && !/unsupported/i.test(label)) {
            out.push(`aria-label: ${label.slice(0, 160)}`);
          }
        }
        return out;
      });
      expect(offenders, `${path}: live mode named without "unsupported"`).toEqual([]);
    });
  }
});
