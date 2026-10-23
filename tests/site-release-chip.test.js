import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const header = readFileSync("site/src/components/Header.astro", "utf8");
const skillsPage = readFileSync("site/src/pages/skills/index.astro", "utf8");
const statusPage = readFileSync("site/src/pages/status.astro", "utf8");

describe("site release chip", () => {
  it("keeps the header chip as a hard-coded release label", () => {
    expect(header).toContain('const CURRENT_RELEASE = "v2.0";');
    expect(header).toContain('const CURRENT_RELEASE_HREF = "/changelog#v2-0";');
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
    const callout = skillsPage.match(/<a\b(?=[^>]*class="release-callout")([^>]*)>([\s\S]*?)<\/a>/);
    expect(callout).not.toBeNull();
    expect(callout[1]).toContain('href="/changelog#v2-0"');
    // The link's visible release text supplies its accessible name. A shorter
    // override breaks voice-control matching (covered by the browser Axe suite).
    expect(callout[1]).not.toMatch(/aria-(?:label|labelledby)\s*=/);
    expect(callout[2]).toContain('<span class="release-callout-tag">v2.0 · SHIPPED</span>');
    expect(callout[2]).toContain("Update, remember and improve");
    expect(callout[2]).toContain("<code>oc-update</code>");
    expect(callout[2]).toContain("<code>oc-evolve</code>");
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
