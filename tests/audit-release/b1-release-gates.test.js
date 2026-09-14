import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkReleaseSurfaces } from "../../scripts/check-release-surfaces.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function sequence(...args) {
  return spawnSync(process.execPath, ["scripts/release-sequence.mjs", ...args], {
    cwd: ROOT,
    encoding: "utf8",
  });
}

describe("B1 release gate regressions", () => {
  it("separates pre-tag from post-tag validation", () => {
    const list = sequence("--list");
    expect(list.status).toBe(0);
    expect(list.stdout).toContain("pre-tag:");
    expect(list.stdout).toContain("post-tag:");
    expect(list.stdout).toMatch(/post-tag:\n\s+release-tag\s+fail/);
  });

  it("does not authorize a release when required local tooling is absent", () => {
    const source = readFileSync(join(ROOT, "scripts/release-sequence.mjs"), "utf8");
    expect(source).toMatch(/id: "site-e2e"[\s\S]*?incomplete: true/);
    expect(source).toMatch(/id: "lighthouse-budgets"[^\n]+cls: "fail"/);
    expect(source).toContain('const failed = results.filter((r) => !r.ok && r.cls === "fail")');
  });

  it("uses the same approved-baseline monitor policy as CI", () => {
    const source = readFileSync(join(ROOT, "scripts/release-sequence.mjs"), "utf8");
    expect(source).toContain('id: "approved-baseline"');
    expect(source).toContain("cloudflare-monitor.mjs control-plane --environment");
    expect(source).toContain('id: "deploy-relevance"');
    expect(source).toContain("cloudflare-monitor.mjs deploy-diff");
    expect(source).not.toContain('id: "deploy-lag"');
  });

  it("checks every required full-semver installation surface", () => {
    const report = checkReleaseSurfaces();
    expect(report.releaseVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(report.errors).toEqual([]);
    for (const label of [
      "skill catalog frontmatter",
      "release seal catalogVersion",
      "MCP server version",
      "marketplace metadata version",
      "marketplace plugin version",
      "plugin manifest version",
    ]) {
      const row = report.results.find((result) => result.label === label);
      expect(row?.value, label).toBe(report.releaseVersion);
    }
  });
});
