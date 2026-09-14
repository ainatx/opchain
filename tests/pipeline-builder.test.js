// /pipeline-builder recommends from the live catalog.
//
// The 2026-09-11 audit found the page recommended from a 21-skill table frozen
// at v1.5: it could never suggest the commit/pre-PR gates or any v1.6–v1.9
// skill, and the CLAUDE.md it generated described a pipeline without them.
// The decision table now lives in site/src/lib/pipeline-builder.ts and the
// page passes it the content-collection catalog. These tests walk every answer
// combination against the real skills/ tree.
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml"; // namespace import: js-yaml 5 dropped the default export
import {
  ANSWER_SPACE,
  FOUNDATION,
  NOT_RECOMMENDED,
  blurbs,
  claudeMdStarter,
  recommend,
  referencedSkillIds,
} from "../site/src/lib/pipeline-builder";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = process.env.OPCHAIN_SKILLS_DIR ?? join(ROOT, "skills");

const catalog = readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(SKILLS_DIR, d.name, "SKILL.md")))
  .map((d) => {
    const raw = readFileSync(join(SKILLS_DIR, d.name, "SKILL.md"), "utf8");
    const fm = yaml.load(raw.match(/^---\n([\s\S]*?)\n---/)[1]);
    return { id: d.name, shortDesc: String(fm.shortDesc) };
  });
const catalogIds = new Set(catalog.map((s) => s.id));

function* allAnswers() {
  for (const kind of ANSWER_SPACE.kind)
    for (const team of ANSWER_SPACE.team)
      for (const deploy of ANSWER_SPACE.deploy)
        for (const surface of ANSWER_SPACE.surface)
          for (const aiApp of ANSWER_SPACE.aiApp) yield { kind, team, deploy, surface, aiApp };
}

describe("pipeline-builder decision table ↔ the skills catalog", () => {
  it("every skill the table can recommend exists in skills/", () => {
    const unknown = referencedSkillIds().filter((id) => !catalogIds.has(id));
    expect(unknown).toEqual([]);
  });

  it("every catalog skill is recommended by some answer combination, or excluded with a reason", () => {
    const reachable = new Set();
    for (const a of allAnswers()) recommend(a, catalog).forEach((id) => reachable.add(id));
    const missing = [...catalogIds].filter((id) => !reachable.has(id) && !(id in NOT_RECOMMENDED));
    expect(missing, `never recommended: ${missing.join(", ")}`).toEqual([]);
    for (const [id, reason] of Object.entries(NOT_RECOMMENDED)) {
      expect(catalogIds.has(id), `NOT_RECOMMENDED names unknown skill ${id}`).toBe(true);
      expect(reachable.has(id), `${id} is listed as not recommended but is`).toBe(false);
      expect(reason.length).toBeGreaterThan(0);
    }
  });

  it("does not recommend usage telemetry by team size", () => {
    for (const a of allAnswers()) expect(recommend(a, catalog)).not.toContain("oc-telemetry-ops");
  });

  it("every recommendation carries the commit gate and the pre-PR gate", () => {
    for (const id of ["oc-git-ops", "oc-bug-check", "oc-docs-forge", "oc-repo-ops"]) {
      expect(FOUNDATION).toContain(id);
    }
    for (const a of allAnswers()) {
      const skills = recommend(a, catalog);
      for (const id of ["oc-git-ops", "oc-bug-check", "oc-docs-forge", "oc-repo-ops"]) {
        expect(skills, `${JSON.stringify(a)} misses ${id}`).toContain(id);
      }
    }
  });

  it("drops a skill the catalog does not carry", () => {
    const partial = catalog.filter((s) => s.id !== "oc-repo-ops");
    const a = { kind: "web-app", team: "solo", deploy: "cloudflare", surface: "claude-code", aiApp: "none" };
    expect(recommend(a, partial)).not.toContain("oc-repo-ops");
  });

  it("descriptions come from each skill's frontmatter shortDesc", () => {
    const b = blurbs(catalog);
    for (const s of catalog) expect(b[s.id]).toBe(s.shortDesc);
  });
});

describe("pipeline-builder CLAUDE.md starter reflects the recommendation", () => {
  const b = blurbs(catalog);

  it("lists every recommended skill with its catalog description and names no other skill", () => {
    for (const a of allAnswers()) {
      const skills = recommend(a, catalog);
      const md = claudeMdStarter(a, skills, b);
      for (const id of skills) expect(md).toContain(`- ${id} — ${b[id]}`);
      // Catalog descriptions in the installed list may mention neighbours; the
      // instructions written by the builder (everything after it) may not.
      const instructions = md.split("## How to work in this repo")[1];
      const named = new Set(instructions.match(/\boc-[a-z]+(?:-[a-z]+)*\b/g) ?? []);
      const stray = [...named].filter((id) => catalogIds.has(id) && !skills.includes(id));
      expect(stray, `${JSON.stringify(a)} names unrecommended skills`).toEqual([]);
    }
  });

  it("describes the commit gate and the pre-PR gate with their real verbs", () => {
    for (const a of allAnswers()) {
      const md = claudeMdStarter(a, recommend(a, catalog), b);
      expect(md).toContain(
        "- Before every commit, `oc-git-ops` runs the `oc-bug-check` gate (`/oc-bugcheck`); only a PASS for this tree clears the commit",
      );
      expect(md).toMatch(/Before every PR, `oc-git-ops` runs the pre-PR gate: `oc-docs-forge` \(`\/oc-docs pr`\).*`oc-repo-ops` \(`\/oc-repo verify`\)/);
      expect(md).not.toContain("/oc-repo audit");
    }
  });

  it("says 'Ship via oc-deploy-ops' only when oc-deploy-ops is recommended", () => {
    for (const a of allAnswers()) {
      const skills = recommend(a, catalog);
      const md = claudeMdStarter(a, skills, b);
      expect(md.includes("Ship via `oc-deploy-ops`"), JSON.stringify(a)).toBe(skills.includes("oc-deploy-ops"));
    }
    const cli = { kind: "cli", team: "solo", deploy: "fly", surface: "claude-code", aiApp: "none" };
    expect(recommend(cli, catalog)).not.toContain("oc-deploy-ops");
    expect(claudeMdStarter(cli, recommend(cli, catalog), b)).toContain("Fly.io — no opchain deploy skill in this bundle");
  });

  it("names v1.9 assurance skills when the answers pull them in", () => {
    const a = { kind: "data", team: "large", deploy: "self-hosted", surface: "both", aiApp: "agent" };
    const skills = recommend(a, catalog);
    const md = claudeMdStarter(a, skills, b);
    for (const id of ["oc-security-hardening", "oc-compliance-ops", "oc-qa-ops", "oc-data-ops", "oc-fleet-ops", "oc-release-ops"]) {
      expect(skills).toContain(id);
      expect(md).toMatch(new RegExp(`\`${id}\``));
    }
  });
});
