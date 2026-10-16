import { expect, test } from "@playwright/test";

/**
 * /changelog page + /demo scenario picker — kept in lockstep with the
 * release entries as opchain version-bumps.
 *
 * /changelog uses the Option C v2 layout: three full-width ARIA tabs —
 * "Just Released" (release history, newest first), "Coming Next" (the next
 * slot, v1.9 assurance and governed delivery — direction set), and "Planned"
 * (v2.1 "The ow- planning family + enforcement at chokepoints" in Coming Next,
 * with the skill router labelled "experimental preview"; Planned holds v2.2
 * "Installs anywhere + the open-source split", direction set, and two
 * advisory-vote groups rendered as "later"). The newest release (v1.9, shipped
 * Sep 2026) is the open hero in Just Released, with v1.8 / v1.7 / v1.6 collapsed
 * heroes below it; each card is a button[aria-expanded] disclosure.
 * Deep links: #v1-9/#v1-8/#v1-7/#v1-6 → Just Released; #v2-0 → Coming Next;
 * #v2-1 → Coming Next; #v2-2/#agency-delivery/#discovery-depth → Planned; the
 * old ids #v2-3 and #installs-anywhere resolve through HASH_ALIASES; #v1-4 still
 * carries the /coverage link.
 *
 * Two specs:
 *   1. /changelog — three tabs; v1.9 is the open hero in Just Released;
 *      the v1.4 card still deep-links to /coverage; Coming Next leads with
 *      the selected v1.9 assurance direction; Planned sets v2.2 (not votable)
 *      and keeps advisory voting on the "later" groups (every rendered item in
 *      them is votable — the items themselves come from live GitHub Issues at
 *      build time, so the spec asserts structure, never a specific issue set).
 *
 *   2. /demo — every curated scenario remains pickable on /demo. v1.5
 *      ("Build the AI app") added the four AI-native scenarios (RAG, agent,
 *      model migration, AI-safety gate) and retired the two enterprise-MCP
 *      scenarios + the superseded v1.2 PM scenario + the release dogfood;
 *      the set now includes fifteen.
 */

// Every scenario folder that must remain pickable on /demo — the full set of
// fifteen, kept in lockstep with site/src/data/walkthroughs/index.ts.
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
  "update-opchain",
  "bootstrap-opchain",
  "hindsight-and-evolve",
];

test.describe("/changelog", () => {
  test("three tabs; Just Released is active with the v2.0 hero open", async ({ page }) => {
    await page.goto("/changelog");

    // Three ARIA tabs; Just Released is selected by default and its panel is
    // shown while Coming Next and Planned are hidden.
    await expect(page.locator('[role="tab"]')).toHaveCount(3);
    await expect(page.locator("#tab-released")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#panel-released")).toBeVisible();
    await expect(page.locator("#panel-coming")).toBeHidden();
    await expect(page.locator("#panel-planned")).toBeHidden();

    // The newest release (v2.0) is the accent hero, open on load, tagged
    // with its version range + a non-empty compatibility note (changelog-recipe rule).
    const hero = page.locator("#v2-0.hero-card--released");
    await expect(hero).toBeVisible();
    await expect(hero.locator(".hero-ver")).toContainText("v2.0.0 → v2.0.4");

    // A patch never creates a new hero: v2.0.1/v2.0.2 share a compact rel-card,
    // and v2.0.3 and v2.0.4 get their own.
    await expect(page.locator("#v2-0-1.rel-card")).toBeVisible();
    await expect(page.locator("#v2-0-3.rel-card")).toBeVisible();
    await expect(page.locator("#v2-0-4.rel-card")).toBeVisible();
    await expect(page.locator("#v1-9-2.rel-card")).toBeVisible();
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

  test("Coming Next holds v2.1 (direction set) and the 2.0 deep link opens its release", async ({ page }) => {
    await page.goto("/changelog#v2-0");
    await expect(page.locator("#panel-released #v2-0")).toBeVisible();
    await page.locator("#tab-coming").click();
    await expect(page.locator("#panel-coming")).toBeVisible();
    await expect(page.locator("#panel-coming #v2-1 .pc-timing")).toHaveText(/direction set/i);
    // Two themes (owner, 2026-10-16): the ow- planning family and enforcement.
    await expect(page.locator("#panel-coming #v2-1 .pc-title")).toHaveText(
      "The ow- planning family + enforcement at chokepoints",
    );
    // Router release term 1: every router mention carries the label.
    await page.locator("#panel-coming #v2-1 [data-disclosure-toggle]").click();
    await expect(page.locator("#panel-coming #v2-1")).toContainText(/skill router/i);
    await expect(page.locator("#panel-coming #v2-1")).toContainText(/experimental preview/i);
    // Forward copy only: nothing on the card claims 2.1 shipped.
    await expect(page.locator("#panel-coming #v2-1")).not.toContainText(/\bshipped\b/i);
    await expect(page.locator("#panel-coming #v2-1 [data-vote-target]")).toHaveCount(0);
    await expect(page.locator("#panel-coming #v2-0")).toHaveCount(0);
  });

  test("deep-link #v2-1 opens Coming Next and the v2.1 card", async ({ page }) => {
    await page.goto("/changelog#v2-1");
    await expect(page.locator("#tab-coming")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#v2-1 [data-disclosure-toggle]")).toHaveAttribute("aria-expanded", "true");
  });

  test("old deep-link #v2-3 lands on the Discovery and pipeline depth group", async ({ page }) => {
    await page.goto("/changelog#v2-3");
    await expect(page.locator("#tab-planned")).toHaveAttribute("aria-selected", "true");
    await expect(
      page.locator("#discovery-depth [data-disclosure-toggle]"),
    ).toHaveAttribute("aria-expanded", "true");
    await expect(page).toHaveURL(/#discovery-depth$/);
  });

  test("Planned sets v2.2 (Installs anywhere + the open-source split) and votes on the later groups", async ({ page }) => {
    await page.goto("/changelog");
    await page.locator("#tab-planned").click();

    await expect(page.locator("#panel-planned")).toBeVisible();
    // v2.0 moved to Coming Next at the v1.9 cut; Planned is the votable set.
    await expect(page.locator("#panel-planned #v2-0")).toHaveCount(0);
    await expect(page.locator("#panel-planned #v2-1")).toHaveCount(0);
    // 2026-10-16: v2.2 is Installs anywhere + the OSS split, direction set and
    // not votable; the vote groups carry no release number ("later").
    await expect(page.locator("#v2-2 .pc-title")).toHaveText(/installs anywhere/i);
    await expect(page.locator("#v2-2 .pc-title")).toHaveText(/open-source split/i);
    await expect(page.locator("#v2-2 .pc-timing")).toHaveText(/direction set/i);
    await expect(page.locator("#v2-2 [data-vote-target]")).toHaveCount(0);
    await expect(page.locator("#v2-3")).toHaveCount(0);
    await expect(page.locator("#agency-delivery .pc-title")).toHaveText(/agency and multi-project/i);
    await expect(page.locator("#agency-delivery .ver-pill")).toHaveText("later");
    await expect(page.locator("#discovery-depth .pc-title")).toHaveText(/discovery and pipeline depth/i);
    await expect(page.locator("#discovery-depth .ver-pill")).toHaveText("later");
    // v1.8 shipped (Just Released) and v1.9 is the fixed Coming Next slot.
    await expect(page.locator("#panel-planned #v1-8")).toHaveCount(0);
    await expect(page.locator("#panel-planned #v1-9")).toHaveCount(0);

    // v2.0 is committed (Coming Next, not votable). The planned items are
    // pulled from GitHub Issues when CI builds the site (scripts/gen-roadmap.mjs
    // → roadmap.json, gitignored), so which issues exist — and how many — is
    // live data, not something this spec can pin: the 2026-08-27 and
    // 2026-09-07 runs failed on unrelated PRs after issue edits on the public
    // repo. What the page owns is the structure: every rendered planned item
    // carries a vote control keyed by its issue number, every vote control
    // lives inside a planned group, and there is at least one. An empty
    // roadmap (GitHub unreachable at build) still fails here, loudly, which
    // ci.yml documents as the intended outcome.
    await expect(page.locator("#v2-0 [data-vote-target]")).toHaveCount(0);
    let votable = 0;
    for (const group of ["agency-delivery", "discovery-depth"]) {
      await page.locator(`#${group} [data-disclosure-toggle]`).click();
      const items = page.locator(`#${group} .horizon-item`);
      const votes = page.locator(`#${group} [data-vote-target]`);
      const count = await items.count();
      await expect(votes).toHaveCount(count);
      for (let i = 0; i < count; i += 1) {
        await expect(votes.nth(i)).toBeVisible();
        await expect(votes.nth(i)).toHaveAttribute("data-vote-target", /^\d+$/);
      }
      votable += count;
    }
    // RELEASING.md F4: the vote block needs a top-3, so at least three votable
    // options must render. An empty roadmap (GitHub unreachable at build) fails
    // here too, loudly.
    expect(
      votable,
      "fewer than three votable planned items rendered — was roadmap.json empty at build time?",
    ).toBeGreaterThanOrEqual(3);
    await expect(page.locator("[data-vote-target]")).toHaveCount(votable);
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

  test("deep-link #v2-0 opens the Just Released tab and the v2.0 hero", async ({ page }) => {
    await page.goto("/changelog#v2-0");
    await expect(page.locator("#tab-released")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#panel-released")).toBeVisible();
    await expect(
      page.locator("#v2-0 [data-disclosure-toggle]"),
    ).toHaveAttribute("aria-expanded", "true");
  });

  test("deep-link #v2-2 opens the Planned tab and the v2.2 card", async ({ page }) => {
    await page.goto("/changelog#v2-2");
    await expect(page.locator("#tab-planned")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#panel-planned")).toBeVisible();
    await expect(
      page.locator("#v2-2 [data-disclosure-toggle]"),
    ).toHaveAttribute("aria-expanded", "true");
  });

  test("old deep-link #installs-anywhere lands on the v2.2 card", async ({ page }) => {
    await page.goto("/changelog#installs-anywhere");
    await expect(page.locator("#tab-planned")).toHaveAttribute("aria-selected", "true");
    await expect(
      page.locator("#v2-2 [data-disclosure-toggle]"),
    ).toHaveAttribute("aria-expanded", "true");
    await expect(page).toHaveURL(/#v2-2$/);
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
