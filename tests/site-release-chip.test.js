import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const header = readFileSync("site/src/components/Header.astro", "utf8");
const skillsPage = readFileSync("site/src/pages/skills/index.astro", "utf8");
const statusPage = readFileSync("site/src/pages/status.astro", "utf8");

describe("site release chip", () => {
  it("keeps the header chip as a hard-coded release label", () => {
    expect(header).toContain('const CURRENT_RELEASE = "v1.9";');
    expect(header).toContain('const CURRENT_RELEASE_HREF = "/changelog#v1-9";');
    expect(header).toContain("data-version-chip");
    expect(header).toContain('data-release-version={CURRENT_RELEASE}');
    expect(header).toContain('<span class="vchip-tag">{CURRENT_RELEASE}</span>');
    expect(header).not.toContain("versionChipLabel");
  });

  it("uses /api/health only to color the release chip", () => {
    expect(header).toContain('fetch("/api/health"');
    expect(header).toContain('body.ok === true || body.status === "ok"');
    expect(header).not.toContain("live Worker ${version}");
  });

  it("keeps the Skill Library release callout on the current release", () => {
    expect(skillsPage).toContain('href="/changelog#v1-9"');
    expect(skillsPage).toContain('aria-label="See what shipped in opchain v1.9"');
    expect(skillsPage).toContain('<span class="release-callout-tag">v1.9 · SHIPPED</span>');
    expect(skillsPage).toContain("Assurance &amp; governed delivery");
    expect(skillsPage).toContain("<code>oc-qa-ops</code>");
    expect(skillsPage).toContain("<code>oc-security-hardening</code>");
  });

  // The release-version location map lives in a shipped skill doc
  // (skills/oc-release-ops/references/version-locations.md); a site test
  // asserting its literal content was the last cross-boundary read blocking
  // the OSS split (seam S5) — that doc's coverage moves with the product.

  it("documents the actual health payload shape on the status page", () => {
    expect(statusPage).toContain("<code>ok: true</code>");
    expect(statusPage).toContain('json.ok === true || json.status === "ok"');
  });
});
