import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { UPGRADE_PROMPT } from "../../src/data/upgrade-prompt";

const scenarios = ["update-opchain", "bootstrap-opchain", "hindsight-and-evolve"];
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("opchain-demo-welcome-seen", "1");
    localStorage.setItem("opchain-consent", "declined");
  });
});

for (const width of [375, 1280]) {
  for (const theme of ["dark", "light"]) {
    test(`upgrade prompt copies exactly at ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "clipboard", { value: {
          writeText: async (text: string) => { (window as any).__copiedPrompt = text; },
        } });
      });
      await page.goto("/install");
      await page.evaluate((value) => document.documentElement.dataset.theme = value, theme);
      await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });
      const prompt = page.locator(".upgrade-prompt");
      await expect(prompt).toBeVisible();
      expect(await prompt.evaluate((el) => !!(el.compareDocumentPosition(document.querySelector('.flow')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
      await page.getByRole("button", { name: "Copy upgrade prompt", exact: true }).click();
      expect(await page.evaluate(() => (window as any).__copiedPrompt)).toBe(UPGRADE_PROMPT);
      await expect(page.locator("#upgrade-copy-status")).toContainText("Copied.");
      await page.getByText("Read the upgrade prompt", { exact: true }).click();
      await expect(page.getByRole("region", { name: "Upgrade prompt text" })).toHaveText(UPGRADE_PROMPT);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      const audit = await new AxeBuilder({ page }).include(".upgrade-prompt").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(audit.violations.map((v) => v.id)).toEqual([]);
    });
  }
  for (const id of scenarios) {
    test(`${id} exposes its full conversation and example artifacts at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/demo");
      if (width < 768) {
        const root = page.locator("[data-mobile-workbench]");
        await expect(root.locator("[data-mw-scenario]")).toHaveCount(15);
        await root.locator(`[data-mw-scenario="${id}"]`).click();
        const stream = root.locator(`[data-mw-stream="${id}"]`);
        await expect(stream).toBeVisible();
        await expect(stream).toContainText(id === "hindsight-and-evolve" ? "candidate remains unadopted" : "/oc-update check");
        await root.locator('[data-mw-tab="io"]').click();
        await root.locator(`[data-mw-io="${id}"] .output-row`).first().click();
      } else {
        await page.locator(`.tree-folder[data-scenario="${id}"]`).click();
        const pane = page.locator(`[data-scenario-pane="${id}"]`);
        await expect(pane).toContainText(/scripted/i);
        expect(await pane.locator('[data-view="transcript"]').textContent()).toContain(id === "hindsight-and-evolve" ? "candidate remains unadopted" : "/oc-update check");
        await pane.locator('[data-view="summary"] .output-row').first().click();
      }
      await expect(page.locator("dialog#output-modal")).toBeVisible();
      await expect(page.locator("dialog#output-modal .modal-body")).toContainText("Scripted example");
    });
  }
}

test("blocked clipboard opens a selectable prompt and announces the fallback", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { value: {
    writeText: async () => { throw new Error("Clipboard blocked"); },
  } }));
  await page.goto("/install");
  await page.getByRole("button", { name: "Copy upgrade prompt", exact: true }).click();
  await expect(page.locator("#upgrade-copy-status")).toContainText("Copy was blocked");
  await expect(page.getByRole("region", { name: "Upgrade prompt text" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Upgrade prompt text" })).toHaveText(UPGRADE_PROMPT);
});
