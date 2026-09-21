import { describe, it, expect } from "vitest";
import { checkReleaseSurfaces } from "../scripts/check-release-surfaces.mjs";

/**
 * Guards against release-surface drift (the "we shipped vN but the site still
 * says vN-1" bug that v1.6 S7 exists to fix). Every live-claim site surface —
 * Header chip, homepage release bar + stat, changelog Just-Released hero,
 * styleguide badge — must agree on the same release line.
 *
 * Catalog of surfaces + the build-PR-vs-deploy split:
 * skills/oc-release-ops/references/site-release-surfaces.md
 */
describe("release surfaces are consistent", () => {
  const report = checkReleaseSurfaces();

  it("every live-claim surface resolves to a release value (no probe broke)", () => {
    const broken = report.results.filter((r) => r.error);
    expect(
      broken.map((r) => `${r.label}: ${r.error}`),
      "a release-surface probe failed to find its pattern — the markup changed; update scripts/check-release-surfaces.mjs",
    ).toEqual([]);
  });

  it("all live-claim surfaces agree on the same release line", () => {
    expect(
      report.errors,
      `release-surface drift — fix per site-release-surfaces.md (resolved: ${report.expected})`,
    ).toEqual([]);
    expect(report.ok).toBe(true);
  });
});

// A launch rehearsal may lead the public ledger only under explicit metadata.
// The same tree without that marker must fail rather than silently pass.
describe("launch presentation boundary", () => {
  it("requires the launch marker and rejects a mismatched release", async () => {
    const { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join, dirname } = await import("node:path");
    const root = mkdtempSync(join(tmpdir(), "opchain-release-surfaces-"));
    try {
      const files = new Set(checkReleaseSurfaces().results.map((r) => r.file));
      files.delete("skills/*/SKILL.md");
      files.add("skills/oc-update/SKILL.md");
      for (const file of files) {
        mkdirSync(dirname(join(root, file)), { recursive: true });
        copyFileSync(file, join(root, file));
      }
      const ledger = join(root, "skills/CHANGELOG.md");
      writeFileSync(ledger, readFileSync(ledger, "utf8").replace(/^## \[(\d+\.\d+\.\d+)\]/m, "## [0.0.0]"));
      const marker = join(root, "release-preview.json");
      const preview = { schemaVersion: 1, status: "staging-preview", releaseDate: null,
        presentation: "release", baseline: "0.0.0", version: checkReleaseSurfaces().releaseVersion };
      writeFileSync(marker, JSON.stringify(preview));
      expect(checkReleaseSurfaces({ root }).ok).toBe(true);
      writeFileSync(marker, JSON.stringify({ ...preview, version: "3.0.0" }));
      expect(checkReleaseSurfaces({ root }).ok).toBe(false);
      writeFileSync(marker, JSON.stringify({ ...preview, status: "released" }));
      expect(checkReleaseSurfaces({ root }).ok).toBe(false);
      rmSync(marker);
      expect(checkReleaseSurfaces({ root }).ok).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("open-hero hero-ver tracks the catalog patch", () => {
  it("fails when the open hero-ver lags the catalog", async () => {
    const { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join, dirname } = await import("node:path");
    const root = mkdtempSync(join(tmpdir(), "opchain-release-surfaces-"));
    try {
      const files = new Set(checkReleaseSurfaces().results.map((r) => r.file));
      files.delete("skills/*/SKILL.md");
      files.add("skills/oc-update/SKILL.md");
      for (const file of files) {
        mkdirSync(dirname(join(root, file)), { recursive: true });
        copyFileSync(file, join(root, file));
      }
      const changelog = join(root, "site/src/pages/changelog.astro");
      writeFileSync(
        changelog,
        readFileSync(changelog, "utf8").replace(
          /(<article class="hero-card hero-card--released is-open"[\s\S]*?<span class="hero-ver">)[^<]+/,
          "$1v2.0.0 · Sep 14, 2026",
        ),
      );
      const report = checkReleaseSurfaces({ root });
      expect(report.ok).toBe(false);
      expect(report.errors.some((error) => error.includes("hero-ver"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

// The 2.0.3 changelog said the mirror README, plugin README and skill-page chip
// were gated; the 2.0.3 feature-execution audit found each could go stale with
// CI green. Each mutation below must now fail, and only on its own probe.
describe("surfaces the 2.0.3 changelog named are gated", () => {
  async function mutated(file, edit) {
    const { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join, dirname } = await import("node:path");
    const root = mkdtempSync(join(tmpdir(), "opchain-release-surfaces-"));
    const files = new Set(checkReleaseSurfaces().results.map((r) => r.file));
    files.delete("skills/*/SKILL.md");
    files.add("skills/oc-update/SKILL.md");
    for (const f of files) {
      mkdirSync(dirname(join(root, f)), { recursive: true });
      copyFileSync(f, join(root, f));
    }
    const target = join(root, file);
    const before = readFileSync(target, "utf8");
    const after = edit(before);
    expect(after, `mutation for ${file} did not apply`).not.toBe(before);
    writeFileSync(target, after);
    return root;
  }

  const line = checkReleaseSurfaces().expected; // e.g. "v2.0"
  it.each([
    ["mirror README leading version", "mirror/README.md", (t) => t.replace(/^> Opchain \d+\.\d+\.\d+ ·/m, "> Opchain 0.0.1 ·")],
    ["plugin README leading version", "plugins/opchain/README.md", (t) => t.replace(/^> \*\*Opchain \d+\.\d+\.\d+\.\*\*/m, "> **Opchain 0.0.1.**")],
    ["styleguide version Badge (full)", "site/src/pages/styleguide.astro", (t) => t.replace(/(<Badge[^>]*>)v\d+\.\d+\.\d+(<\/Badge>)/, `$1${line}.99$2`)],
    ["skill-page loop tag", "site/src/pages/skills/[id].astro", (t) => t.replace(/(<span class="inloop-tag">v\d+\.\d+) · shipped/, "$1 · next")],
    ["skill-page loop tag", "site/src/pages/skills/[id].astro", (t) => t.replace(/<span class="inloop-tag">v\d+\.\d+ · shipped/, '<span class="inloop-tag">v99.0 · shipped')],
  ])("fails when the %s lags (%s)", async (label, file, edit) => {
    const { rmSync } = await import("node:fs");
    const root = await mutated(file, edit);
    try {
      const report = checkReleaseSurfaces({ root });
      expect(report.ok).toBe(false);
      expect(report.errors.every((error) => error.startsWith(label))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("lets the skill-page loop tag trail the release line", async () => {
    const { rmSync } = await import("node:fs");
    const root = await mutated("site/src/pages/skills/[id].astro", (t) =>
      t.replace(/<span class="inloop-tag">v\d+\.\d+ · shipped/, '<span class="inloop-tag">v1.0 · shipped'));
    try {
      expect(checkReleaseSurfaces({ root }).errors).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
