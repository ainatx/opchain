import { expect, test } from "@playwright/test";

/**
 * /changelog page + /demo scenario picker — kept in lockstep with the
 * release entries as opchain version-bumps.
 *
 * /changelog uses the Option C v2 layout: three full-width ARIA tabs —
 * "Just Released" (release history, newest first), "Coming Next" (the next
 * slot, v1.9 assurance and governed delivery — direction set), and "Planned"
 * (votable v2.1 / v2.2 / v2.3 cards). The newest release (v1.9, shipped
 * Sep 2026) is the open hero in Just Released, with v1.8 / v1.7 / v1.6 collapsed
 * heroes below it; each card is a button[aria-expanded] disclosure.
 * Deep links: #v1-9/#v1-8/#v1-7/#v1-6 → Just Released; #v2-0 → Coming Next;
 * #v2-1/#v2-2/#v2-3 → Planned; #v1-4 still carries the /coverage link.
 *
 * Two specs:
 *   1. /changelog — three tabs; v1.9 is the open hero in Just Released;
 *      the v1.4 card still deep-links to /coverage; Coming Next leads with
 *      the selected v1.9 assurance direction; Planned commits v2.0 and
 *      establishes voting across v2.1-v2.3 (7 votable items).
 *
 *   2. /demo — every curated scenario remains pickable on /demo. v1.5
 *      ("Build the AI app") added the four AI-native scenarios (RAG, agent,
 *      model migration, AI-safety gate) and retired the two enterprise-MCP
 *      scenarios + the superseded v1.2 PM scenario + the release dogfood;
 *      the set holds at twelve.
 */

// Every scenario folder that must remain pickable on /demo — the full set of
// twelve, kept in lockstep with site/src/data/walkthroughs/index.ts.
const ALL_PICKABLE = [
  "concept-to-shipped",
  "rag-answer-bot",
  "agent-triage",
  "model-migration",
  "ai-safety-gate",
  "dashboard-rescue",
  "legacy-revive",
  "stripe-ship",
  "postgres-migration",
  "security-hardening",
  "runtime-pm-loop",
  "django-render-shipped",
];

test.describe("/changelog", () => {
  test("three tabs; Just Released is active with the v1.9 hero open", async ({ page }) => {
    await page.goto("/changelog");

    // Three ARIA tabs; Just Released is selected by default and its panel is
    // shown while Coming Next and Planned are hidden.
    await expect(page.locator('[role="tab"]')).toHaveCount(3);
    await expect(page.locator("#tab-released")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#panel-released")).toBeVisible();
    await expect(page.locator("#panel-coming")).toBeHidden();
    await expect(page.locator("#panel-planned")).toBeHidden();

    // The newest release (v1.9) is the accent hero, open on load, tagged
    // with its version + a non-empty compatibility note (changelog-recipe rule).
    const hero = page.locator("#v1-9.hero-card--released");
    await expect(hero).toBeVisible();
    await expect(hero.locator(".hero-ver")).toContainText("v1.9.0");
    await expect(hero.locator(".hero-head")).toHaveAttribute("aria-expanded", "true");
    await expect(hero.locator(".compat-box")).toBeVisible();
    await expect(hero.locator(".compat-box")).not.toBeEmpty();

    // v1.8 remains in the panel as a collapsed previous-release hero.
    const prev = page.locator("#v1-8.hero-card--released");
    await expect(prev).toBeVisible();
    await expect(prev.locator(".hero-head")).toHaveAttribute("aria-expanded", "false");

    await expect(page.locator("#skill-install-portability")).toBeVisible();
    await expect(page.locator("#skill-install-portability .rc-title")).toHaveText(
      "Skill install portability patch",
    );
  });

  test("the v1.4 entry deep-links to /coverage (the pack catalog)", async ({ page }) => {
    await page.goto("/changelog");
    // v1.4 is a collapsed past release; expand its disclosure, then the
    // /coverage link becomes visible.
    await page.locator("#v1-4 [data-disclosure-toggle]").click();
    const link = page.locator(`#v1-4 a[href="/coverage"]`).first();
    await expect(link, "expected /changelog v1.4 entry to deep-link to /coverage")
      .toBeVisible();
  });

  test("Coming Next leads with the committed v2.0 self-improving pipeline", async ({ page }) => {
    await page.goto("/changelog");
    await page.locator("#tab-coming").click();

    await expect(page.locator("#panel-coming")).toBeVisible();
    // v1.9 shipped; Coming Next owns the committed v2.0 release (hero card),
    // open by default and not votable.
    await expect(page.locator("#v2-0.hero-card--next .hero-title")).toHaveText(
      /self-improving pipeline/i,
    );
    await expect(page.locator("#v2-0 .hero-ver")).toContainText("v2.0");
    await expect(page.locator("#v2-0 [data-disclosure-toggle]")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expect(page.locator("#v2-0 [data-vote-target]")).toHaveCount(0);
    // v1.9 lives in Just Released now, not here.
    await expect(page.locator("#panel-coming #v1-9")).toHaveCount(0);
  });

  test("Planned establishes voting for v2.1-v2.3", async ({ page }) => {
    await page.goto("/changelog");
    await page.locator("#tab-planned").click();

    await expect(page.locator("#panel-planned")).toBeVisible();
    // v2.0 moved to Coming Next at the v1.9 cut; Planned is the votable set.
    await expect(page.locator("#panel-planned #v2-0")).toHaveCount(0);
    await expect(page.locator("#v2-1 .pc-title")).toHaveText(/distribution and installation/i);
    await expect(page.locator("#v2-2 .pc-title")).toHaveText(/agency and multi-project/i);
    await expect(page.locator("#v2-3 .pc-title")).toHaveText(/discovery and pipeline depth/i);
    // v1.8 shipped (Just Released) and v1.9 is the fixed Coming Next slot.
    await expect(page.locator("#panel-planned #v1-8")).toHaveCount(0);
    await expect(page.locator("#panel-planned #v1-9")).toHaveCount(0);

    // v2.0 is committed (Coming Next, not votable); the seven candidates in
    // v2.1-v2.3 remain votable under their existing GitHub issue numbers,
    // preserving vote history.
    await expect(page.locator("#v2-0 [data-vote-target]")).toHaveCount(0);
    const votingGroups = [
      ["v2-1", ["1", "4", "5"]],
      ["v2-2", ["2", "7"]],
      ["v2-3", ["3", "6"]],
    ] as const;
    for (const [group, ids] of votingGroups) {
      await page.locator(`#${group} [data-disclosure-toggle]`).click();
      for (const id of ids) {
        await expect(page.locator(`#${group} [data-vote-target="${id}"]`)).toBeVisible();
      }
    }
    await expect(page.locator("[data-vote-target]")).toHaveCount(7);
  });

  test("deep-link #v1-6 opens the Just Released tab and the v1.6 card", async ({ page }) => {
    await page.goto("/changelog#v1-6");
    await expect(page.locator("#tab-released")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#panel-released")).toBeVisible();
    await expect(
      page.locator("#v1-6 [data-disclosure-toggle]"),
    ).toHaveAttribute("aria-expanded", "true");
  });

  test("deep-link #v1-7 opens the Just Released tab and the v1.7 card", async ({ page }) => {
    await page.goto("/changelog#v1-7");
    await expect(page.locator("#tab-released")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#panel-released")).toBeVisible();
    await expect(
      page.locator("#v1-7 [data-disclosure-toggle]"),
    ).toHaveAttribute("aria-expanded", "true");
  });

  test("deep-link #v1-8 opens the Just Released tab and the v1.8 card", async ({ page }) => {
    await page.goto("/changelog#v1-8");
    await expect(page.locator("#tab-released")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#panel-released")).toBeVisible();
    await expect(
      page.locator("#v1-8 [data-disclosure-toggle]"),
    ).toHaveAttribute("aria-expanded", "true");
  });

  test("deep-link #v1-9 opens the Just Released tab and the v1.9 card", async ({ page }) => {
    await page.goto("/changelog#v1-9");
    await expect(page.locator("#tab-released")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#panel-released")).toBeVisible();
    await expect(
      page.locator("#v1-9 [data-disclosure-toggle]"),
    ).toHaveAttribute("aria-expanded", "true");
  });

  test("deep-link #v2-0 opens the Coming Next tab and the v2.0 hero", async ({ page }) => {
    await page.goto("/changelog#v2-0");
    await expect(page.locator("#tab-coming")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#panel-coming")).toBeVisible();
    await expect(
      page.locator("#v2-0 [data-disclosure-toggle]"),
    ).toHaveAttribute("aria-expanded", "true");
  });

  test("deep-link #v2-3 opens the Planned tab and the v2.3 group", async ({ page }) => {
    await page.goto("/changelog#v2-3");
    await expect(page.locator("#tab-planned")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#panel-planned")).toBeVisible();
    await expect(
      page.locator("#v2-3 [data-disclosure-toggle]"),
    ).toHaveAttribute("aria-expanded", "true");
  });
});

test.describe("/demo — all curated scenarios pickable", () => {
  // Mirror demo-workbench.spec.ts: pre-set the welcome popup as seen so
  // its scrim doesn't intercept clicks.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("opchain-demo-welcome-seen", "1");
      } catch {
        /* ignore */
      }
    });
  });

  for (const id of ALL_PICKABLE) {
    test(`${id} folder is pickable and reveals its summary pane`, async ({ page }) => {
      await page.goto("/demo");
      const folder = page.locator(`.tree-folder[data-scenario="${id}"]`);
      await expect(folder, `tree folder for ${id} not present on /demo`).toBeVisible();
      await folder.click();
      const pane = page.locator(`[data-scenario-pane="${id}"]`);
      await expect(pane).toBeVisible();
      await expect(pane.locator('[data-view="summary"]')).toBeVisible();
    });
  }
});
