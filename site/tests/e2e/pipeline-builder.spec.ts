import { expect, test, type Page } from "@playwright/test";

/**
 * /pipeline-builder recommends from the live skills catalog, not a frozen
 * table. The build serialises the catalog into #pipeline-catalog; these tests
 * walk the wizard and assert the result uses it: the gate rail is always in
 * the bundle, v1.6–v1.9 skills appear when the answers call for them, every
 * blurb is the catalog's shortDesc, and the CLAUDE.md starter names the gates.
 * Exact bundles are not hard-coded, so adding a skill doesn't break the suite.
 */

// Which wizard step asks each question.
const STEP_OF: Record<string, number> = { kind: 1, team: 2, deploy: 3, surface: 4, aiapp: 4 };

async function finish(page: Page, answers: Record<string, string>) {
  for (const name of Object.keys(answers)) {
    expect(STEP_OF[name], `unknown wizard question "${name}"`).toBeDefined();
  }
  await page.goto("/pipeline-builder");
  for (let step = 1; step <= 4; step++) {
    const section = page.locator(`.step[data-step="${step}"]`);
    for (const [name, value] of Object.entries(answers)) {
      if (STEP_OF[name] !== step) continue;
      // The radio itself is visually hidden; the user clicks its card. A typo
      // in an answer must fail here, not silently fall back to the default.
      const card = section.locator(`label.opt-card:has(input[name="${name}"][value="${value}"])`);
      await expect(card, `no answer card for ${name}=${value}`).toHaveCount(1);
      await card.click();
      await expect(card.locator("input")).toBeChecked();
    }
    await section.locator("[data-next]").click();
  }
  await expect(page.locator('.step[data-step="5"]')).toBeVisible();
}

async function recommended(page: Page) {
  return page.locator("#rec-skills .rec-skill .name").allTextContents();
}

test.describe("pipeline builder", () => {
  test("ships the catalog and always recommends the commit and pre-PR gates", async ({ page }) => {
    await finish(page, {});
    const catalog = JSON.parse((await page.locator("#pipeline-catalog").textContent()) || "[]");
    expect(catalog.length, "catalog serialised at build time").toBeGreaterThanOrEqual(33);

    const skills = await recommended(page);
    for (const id of ["oc-git-ops", "oc-bug-check", "oc-docs-forge", "oc-repo-ops"]) {
      expect(skills).toContain(id);
    }

    const byId = new Map<string, string>(catalog.map((s: { id: string; shortDesc: string }) => [s.id, s.shortDesc]));
    const rows = page.locator("#rec-skills .rec-skill");
    for (let i = 0; i < (await rows.count()); i++) {
      const id = (await rows.nth(i).locator(".name").textContent())!.trim();
      expect(byId.has(id), `${id} is not in the catalog`).toBe(true);
      await expect(rows.nth(i).locator(".why")).toHaveText(byId.get(id)!);
    }

    const claudeMd = await page.locator("#claude-md").textContent();
    expect(claudeMd).toContain("runs the `oc-bug-check` gate");
    expect(claudeMd).toContain("runs the pre-PR gate");
  });

  test("pulls in v1.6–v1.9 skills when the answers call for them", async ({ page }) => {
    await finish(page, { kind: "data", team: "large", deploy: "self-hosted", aiapp: "agent" });
    const skills = await recommended(page);
    for (const id of [
      "oc-data-ops",
      "oc-signal-forge",
      "oc-release-ops",
      "oc-qa-ops",
      "oc-security-hardening",
      "oc-compliance-ops",
      "oc-fleet-ops",
      "oc-cost-ops",
      "oc-agent-forge",
    ]) {
      expect(skills).toContain(id);
    }
    const claudeMd = await page.locator("#claude-md").textContent();
    expect(claudeMd).toContain("`oc-security-hardening`");
    expect(claudeMd).toContain("`/oc-git-release`");
  });
});
