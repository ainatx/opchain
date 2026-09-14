import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { FEATURES, PLATFORMS, SOURCES, DEFAULT_EXTRAS, SELECTABLE } from "../../src/data/comparison";

test("initial HTML and dynamic columns retain their exact source links", async ({ page }) => {
  await page.goto("/compare");
  await expect(page.locator("#cmp-head [data-col]")).toHaveCount(5);
  for (const id of SELECTABLE) {
    await page.getByRole("button", { name: "Clear selection", exact: true }).click();
    await page.locator(`[data-chip="${id}"]`).click();
    for (const feature of FEATURES) {
      const cell = page.locator(`[data-feature="${feature.id}"] td[data-col="${id}"]`);
      await expect(cell.locator(".cell-v")).toHaveText(PLATFORMS[id].cells[feature.id].v);
      const refs = PLATFORMS[id].cells[feature.id].sources;
      await expect(cell.locator("a")).toHaveCount(refs.length);
      for (const ref of refs) await expect(cell.locator(`[data-source="${ref}"]`)).toHaveAttribute("href", SOURCES[ref].url);
    }
  }
  await page.locator('[data-preset="agents"]').click();
  await expect(page.locator('[data-chip="devin"]')).toBeDisabled();
  await page.reload();
  await expect(page.locator('#cmp-head [data-col="codex"]')).toBeVisible();
  await expect(page.locator('[data-preset="agents"]')).toHaveAttribute("aria-pressed", "true");
  await page.locator('[data-preset="workflows"]').click();
  await expect(page.locator("#cmp-head [data-col]")).toHaveCount(5);
});

for (const [name, stored, expected] of [
  ["corrupt", "{bad", DEFAULT_EXTRAS],
  ["duplicates and unknown IDs", '["cursor","cursor","retired","codex"]', ["cursor", "codex"]],
  ["retired hosts", '["zed","vscode"]', DEFAULT_EXTRAS],
  ["intentional empty", "[]", []],
  ["wrong shape", '{"cursor":true}', DEFAULT_EXTRAS],
] as const) {
  test(`saved selection recovers from ${name}`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("opchain-compare-selection", value), stored);
    await page.goto("/compare");
    await expect(page.locator("#cmp-head [data-col]")).toHaveCount(expected.length + 1);
    expect(await page.locator("#cmp-head [data-col]").evaluateAll((els) => els.map((el) => el.getAttribute("data-col")))).toEqual(["opchain", ...expected]);
  });
}

test("no-JavaScript readers get a complete cited default table", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(test.info().project.use.baseURL + "/compare");
  await expect(page.locator("#cmp-body tr[data-feature]")).toHaveCount(FEATURES.length);
  await expect(page.locator("#cmp-body td")).toHaveCount(FEATURES.length * 5);
  expect(await page.locator("#cmp-body td").evaluateAll((cells) => cells.every((cell) => cell.querySelector("a[data-source]")))).toBe(true);
  await expect(page.locator("noscript p")).toContainText("default comparison");
  await context.close();
});

test("blocked storage does not prevent choosing a comparison", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } }));
  await page.goto("/compare");
  await page.locator('[data-preset="agents"]').click();
  await expect(page.locator('#cmp-head [data-col="codex"]')).toBeVisible();
});

for (const width of [375, 768, 1280]) {
  test(`readable and accessible at ${width}px in both themes`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/compare");
    // Audit settled palettes, not an intermediate frame of the theme transition.
    await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });
    for (const theme of ["dark", "light"]) {
      await page.evaluate((value) => document.documentElement.dataset.theme = value, theme);
      const palette = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        return { background: root.getPropertyValue("--bg").trim(), accent: root.getPropertyValue("--accent").trim() };
      });
      expect(palette).toEqual(theme === "dark"
        ? { background: "#12191f", accent: "#2be179" }
        : { background: "#e9f0f7", accent: "#0d7a3e" });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      const region = page.locator("#comparison-region");
      await region.focus();
      await expect(region).toBeFocused();
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => region.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
      const results = await new AxeBuilder({ page }).include("main.page").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(results.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([]);
      await page.screenshot({ path: `test-results/compare-${width}-${theme}.png`, fullPage: true });
    }
    await page.getByRole("button", { name: "Clear selection", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#cmp-head [data-col]")).toHaveCount(1);
  });
}
