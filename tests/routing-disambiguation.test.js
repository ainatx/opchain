// Pins the v1.9 routing-collision decisions (plan §2 D1–D4, §7 risk 3) at the
// surface the router actually reads: each SKILL.md's `description:`
// frontmatter. The near-miss verb pair /oc-hardening (oc-security-auditor:
// assess) vs /oc-harden (oc-security-hardening: execute) is defended only by
// cross-referencing lines in both descriptions — if either line is edited
// away (they're under ≤1024-char pressure), routing regresses silently. This
// suite turns that into a CI failure. The LLM-behavioural side of the same
// pins lives in prompts/opchain-eval/ (the llm_judge collision cases,
// /oc-prompt eval); the deterministic MCP `route` side is the last block below.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml"; // namespace import: js-yaml 5 dropped the default export, v4 keeps the named ones
import { route } from "../src/lib/mcp/routing.js";

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

// "tag the release" is the catalog's one exact quoted-phrase collision: both
// oc-git-ops and oc-release-ops quote it in their descriptions. The tag verb
// belongs to oc-git-ops (/oc-git-release, required by `npm run
// check-release-tag`); oc-release-ops plans and bumps, then hands the tag off.
// orchestrator.md §4 records that ownership, and the MCP router must follow it.
describe("\"tag the release\" belongs to oc-git-ops /oc-git-release", () => {
  it("orchestrator.md §4 routes it to oc-git-ops, not oc-release-ops", () => {
    const md = readFileSync(join(SKILLS_DIR, "orchestrator.md"), "utf8");
    const row = md.split("\n").find((l) => /^\|.*"Tag the release"/i.test(l));
    expect(row, "§4 has no \"Tag the release\" row").toBeDefined();
    const cells = row.split("|").map((c) => c.trim());
    expect(cells[2]).toBe("oc-git-ops");
    expect(cells[3]).toBe("/oc-git-release");
    // The release row must not also claim the phrase (first match would be ambiguous).
    const releaseRow = md.split("\n").find((l) => /\|\s*oc-release-ops\s*\|\s*\/oc-release plan/.test(l));
    expect(releaseRow).toBeDefined();
    expect(releaseRow).not.toMatch(/tag the release/i);
  });

  it("oc-git-ops' description keeps the phrase and the tag verb together", () => {
    expect(description("oc-git-ops")).toMatch(/\/oc-git-release\b/);
    expect(description("oc-git-ops")).toMatch(/tag the release/i);
  });
});

// Behavioural side of the same decisions at the MCP `route` tool. First match
// wins in src/lib/mcp/routing.js, so each pair pins the ordering: moving a
// generic row above a specific one flips one of these.
describe("MCP route() resolves each collision pair deliberately", () => {
  const catalog = JSON.parse(readFileSync(join(ROOT, "src", "generated", "mcp-catalog.json"), "utf8"));
  const PAIRS = [
    // [request, expected skill, expected phase, the skill it must NOT go to]
    ["tag the release", "oc-git-ops", "/oc-git-release", "oc-release-ops"],
    ["tag the release for v1.9.1", "oc-git-ops", "/oc-git-release", "oc-release-ops"],
    ["cut a release", "oc-release-ops", "/oc-release plan", "oc-git-ops"],
    ["ship v1.3", "oc-release-ops", "/oc-release plan", "oc-deploy-ops"],
    ["ship it", "oc-deploy-ops", "/oc-deploy staging", "oc-release-ops"],
    ["build an agent", "oc-agent-forge", "/oc-agent plan", "oc-app-architect"],
    ["build a Claude agent that triages issues", "oc-agent-forge", "/oc-agent plan", "oc-app-architect"],
    ["build me an app", "oc-app-architect", "/oc-discover", "oc-agent-forge"],
    ["set up usage metering", "oc-telemetry-ops", "/oc-telemetry status", "oc-monitoring-ops"],
    ["add telemetry for which skills people use", "oc-telemetry-ops", "/oc-telemetry status", "oc-monitoring-ops"],
    ["set up monitoring and error tracking", "oc-monitoring-ops", "/oc-monitor setup", "oc-telemetry-ops"],
    ["instrument this signup flow", "oc-signal-forge", "/oc-signal frame", "oc-monitoring-ops"],
    ["deploy multiple containers", "oc-fleet-ops", "/oc-fleet topology", "oc-deploy-ops"],
    ["deploy this to kubernetes", "oc-fleet-ops", "/oc-fleet topology", "oc-deploy-ops"],
    ["write the terraform for our cluster", "oc-fleet-ops", "/oc-fleet topology", "oc-deploy-ops"],
    ["deploy this", "oc-deploy-ops", "/oc-deploy staging", "oc-fleet-ops"],
    ["what did this cost", "oc-cost-ops", "/oc-cost report", "oc-scale-ops"],
    ["put a budget gate on the eval", "oc-cost-ops", "/oc-cost report", "oc-scale-ops"],
    ["can this handle more users?", "oc-scale-ops", "/oc-scale audit", "oc-cost-ops"],
    ["prompt caching", "oc-claude-api", "/oc-claude-api", "oc-scale-ops"],
    ["caching strategy for the product api", "oc-scale-ops", "/oc-scale audit", "oc-claude-api"],
    ["model migration to the new Opus", "oc-claude-api", "/oc-claude-api", "oc-migration-ops"],
    ["plan a load test", "oc-qa-ops", "/oc-qa pyramid", "oc-scale-ops"],
    ["load test the checkout api", "oc-scale-ops", "/oc-scale audit", "oc-qa-ops"],
    ["harden this", "oc-security-hardening", "/oc-harden baseline", "oc-security-auditor"],
    ["is the infra hardened?", "oc-security-auditor", "/oc-security posture", "oc-security-hardening"],
    ["soc 2 evidence", "oc-compliance-ops", "/oc-comply scope", "oc-security-auditor"],
    ["soc 2 readiness", "oc-security-auditor", "/oc-security posture", "oc-compliance-ops"],
    ["audit-ready", "oc-compliance-ops", "/oc-comply scope", "oc-code-auditor"],
    ["quick audit", "oc-bug-check", "/oc-bugcheck", "oc-code-auditor"],
    ["check this before I commit", "oc-bug-check", "/oc-bugcheck", "oc-git-ops"],
    ["commit my changes", "oc-git-ops", "/oc-git-sync", "oc-bug-check"],
    ["our openapi spec drifted from the handlers", "oc-api-dev", "/oc-api design", "oc-data-ops"],
    ["warehouse schema drift", "oc-data-ops", "/oc-data-ops design", "oc-api-dev"],
    ["sync salesforce into the warehouse", "oc-data-ops", "/oc-data-ops design", "oc-integrations-engineer"],
    ["connect to salesforce", "oc-integrations-engineer", "/oc-integrate plan", "oc-data-ops"],
    ["break up the monolith", "oc-modularize-ops", "/oc-modularize assess", "oc-migration-ops"],
    ["migrate from heroku to fly", "oc-migration-ops", "/oc-migrate assess", "oc-modularize-ops"],
    ["design a dashboard", "oc-dash-forge", "/oc-data-forge", "oc-ux-engineer"],
    ["design our api", "oc-api-dev", "/oc-api design", "oc-app-architect"],
    // Compliance is claimed only by frameworks and artefacts, not the bare word.
    ["OWASP compliance", "oc-security-auditor", "/oc-security posture", "oc-compliance-ops"],
    ["make the site WCAG compliant", "oc-ux-engineer", "/oc-uxe eval", "oc-compliance-ops"],
    ["compliance checklist for HIPAA", "oc-compliance-ops", "/oc-comply scope", "oc-security-auditor"],
    // Resume requests win over the domain they mention.
    ["where did I leave off on the data pipeline", "oc-orchestrator", "/oc-ops status", "oc-data-ops"],
    ["continue where we left off with the dashboard", "oc-orchestrator", "/oc-ops status", "oc-dash-forge"],
    // Quoted description triggers that used to land on a neighbour.
    ["accessibility audit", "oc-ux-engineer", "/oc-uxe eval", "oc-code-auditor"],
    ["pre-deploy check", "oc-code-auditor", "/oc-audit full", "oc-deploy-ops"],
    ["the pen test found an open redirect", "oc-security-hardening", "/oc-harden baseline", "oc-security-auditor"],
    ["data visualization design", "oc-dash-forge", "/oc-data-forge", "oc-app-architect"],
    ["design a report view", "oc-dash-forge", "/oc-data-forge", "oc-app-architect"],
    ["deploy to VMs", "oc-fleet-ops", "/oc-fleet topology", "oc-deploy-ops"],
    ["unit vs integration", "oc-qa-ops", "/oc-qa pyramid", "oc-integrations-engineer"],
    ["derive a KPI", "oc-signal-forge", "/oc-signal frame", "oc-dash-forge"],
    ["rate limit this endpoint", "oc-security-hardening", "/oc-harden baseline", "oc-security-auditor"],
  ];

  // Requests a too-broad pattern used to claim. Each must NOT reach the named skill.
  const NOT_ROUTED = [
    ["build a compliance app", "oc-compliance-ops"],
    ["set up telemetry for my service", "oc-telemetry-ops"],
    ["embedding a video in the landing page", "oc-rag-forge"],
    ["we keep hitting the GitHub rate limit", "oc-security-hardening"],
    ["what does the helm of this project think", "oc-fleet-ops"],
  ];
  for (const [query, notSkill] of NOT_ROUTED) {
    it(`"${query}" does not route to ${notSkill}`, () => {
      expect(route(query, catalog).skill).not.toBe(notSkill);
    });
  }

  for (const [query, skill, phase, notSkill] of PAIRS) {
    it(`"${query}" → ${skill} (not ${notSkill})`, () => {
      const r = route(query, catalog);
      expect(r.skill).toBe(skill);
      expect(r.skill).not.toBe(notSkill);
      expect(r.phase).toBe(phase);
      expect(r.confident).toBe(true);
    });
  }
});
