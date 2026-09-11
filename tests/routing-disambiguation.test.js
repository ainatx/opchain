// Pins the v1.9 routing-collision decisions (plan §2 D1–D4, §7 risk 3) at the
// surface the router actually reads: each SKILL.md's `description:`
// frontmatter. The near-miss verb pair /oc-hardening (oc-security-auditor:
// assess) vs /oc-harden (oc-security-hardening: execute) is defended only by
// cross-referencing lines in both descriptions — if either line is edited
// away (they're under ≤1024-char pressure), routing regresses silently. This
// suite turns that into a CI failure. The behavioral side of the same pin
// lives in prompts/opchain-eval/ (route-016..route-028, /oc-prompt eval).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = process.env.OPCHAIN_SKILLS_DIR ?? join(ROOT, "skills");

function description(id) {
  const raw = readFileSync(join(SKILLS_DIR, id, "SKILL.md"), "utf8");
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) throw new Error(`${id}/SKILL.md has no frontmatter block`);
  return yaml.load(m[1]).description;
}

describe("v1.9 routing collisions stay disambiguated in trigger copy", () => {
  it("/oc-hardening (assess) vs /oc-harden (execute): each description names the other side", () => {
    const auditor = description("oc-security-auditor");
    const hardening = description("oc-security-hardening");
    // \b keeps /oc-harden from matching inside /oc-hardening.
    expect(auditor).toMatch(/\/oc-harden\b/);
    expect(auditor).toMatch(/oc-security-hardening\b/);
    expect(hardening).toMatch(/\/oc-hardening\b/);
    expect(hardening).toMatch(/oc-security-auditor\b/);
  });

  it("schema drift: oc-api-dev owns spec<->code, oc-data-ops owns warehouse — cross-referenced both ways", () => {
    expect(description("oc-api-dev")).toMatch(/oc-data-ops\b/);
    expect(description("oc-data-ops")).toMatch(/oc-api-dev\b/);
  });

  it("SOC 2: compliance-ops names both halves of the security pair; auditor names the register owner", () => {
    const comply = description("oc-compliance-ops");
    expect(comply).toMatch(/oc-security-auditor\b/);
    expect(comply).toMatch(/oc-security-hardening\b/);
    expect(description("oc-security-auditor")).toMatch(/oc-compliance-ops\b/);
  });

  it("warehouse sync: integrations-engineer carves out the pipeline to data-ops, and vice versa", () => {
    expect(description("oc-integrations-engineer")).toMatch(/oc-data-ops\b/);
    expect(description("oc-data-ops")).toMatch(/oc-integrations-engineer\b/);
  });

  it("load test: qa-ops (planning) names oc-scale-ops as the execution owner", () => {
    expect(description("oc-qa-ops")).toMatch(/oc-scale-ops\b/);
  });

  it("metric vs estate: signal-forge names oc-data-ops as pipeline owner, and vice versa (D4)", () => {
    expect(description("oc-signal-forge")).toMatch(/oc-data-ops\b/);
    expect(description("oc-data-ops")).toMatch(/oc-signal-forge\b/);
  });
});
