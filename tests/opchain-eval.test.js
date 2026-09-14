// Validates the dogfooding eval set at prompts/opchain-eval/ (the worked
// example for oc-prompt-ops /oc-prompt eval). This is the "parses cleanly +
// stays consistent with the real catalog" guard the v1.5 Sprint 3 plan calls
// for — it does NOT run an LLM (routing is non-deterministic); it asserts the
// set is well-formed and that every expected route points at a real skill and
// a registered command verb, so the set can't silently rot.

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml"; // namespace import: js-yaml 5 dropped the default export, v4 keeps the named ones
// The verb→flag drift gate lives in the site half (scripts/check-skill-flags.mjs
// + the registry). This suite moves to the product repo at the split, where the
// registry is absent — so the import degrades to a skip instead of an error.
let isKnown = null;
try {
  ({ isKnown } = await import("../src/lib/flags/registry.js"));
} catch {
  // product-repo context: no registry, verb gating is checked site-side
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EVAL_DIR = join(ROOT, "prompts", "opchain-eval");
const SKILLS_DIR = process.env.OPCHAIN_SKILLS_DIR ?? join(ROOT, "skills");

function readJsonl(file) {
  return readFileSync(join(EVAL_DIR, file), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l, i) => {
      try {
        return JSON.parse(l);
      } catch (err) {
        throw new Error(`${file} line ${i + 1} is not valid JSON: ${err.message}`);
      }
    });
}

const inputs = readJsonl("inputs.jsonl");
const expected = readJsonl("expected.jsonl");
const config = yaml.load(readFileSync(join(EVAL_DIR, "eval.yaml"), "utf8"));

const skillDirs = new Set(
  readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(SKILLS_DIR, d.name, "SKILL.md")))
    .map((d) => d.name),
);

const VALID_MODES = new Set(["exact", "contains", "llm_judge"]);

// Collision cases: requests two skills' trigger copy both claim. `contains`
// cannot grade these (a wrong route that names the right skill in passing still
// contains both tokens), so each must be `llm_judge` with criteria that name
// the wrong-side skill. Add an id here when you add a collision case.
const COLLISION_CASES = [
  "route-004", // code-auditor vs security-auditor
  "route-008", // claude-api vs migration-ops
  "route-009", // agent-forge vs app-architect
  "route-011", // dash-forge vs ux-engineer / signal-forge
  "route-015", // bug-check vs git-ops
  "route-018", // compliance-ops vs code-auditor
  "route-019", "route-020", // security-hardening vs security-auditor
  "route-021", "route-022", "route-023", // security-auditor vs compliance-ops
  "route-024", "route-025", // api-dev vs data-ops (schema drift)
  "route-026", // data-ops vs integrations-engineer
  "route-027", "route-028", // scale-ops vs qa-ops (load test)
  "route-029", "route-030", // git-ops vs release-ops ("tag the release")
  "route-031", // fleet-ops vs deploy-ops
  "route-032", "route-033", // telemetry-ops vs monitoring-ops
  "route-034", // cost-ops vs scale-ops / claude-api
  "route-035", // signal-forge vs dash-forge / data-ops
  "route-036", // modularize-ops vs migration-ops
  "route-037", // migration-ops vs integrations-engineer
  "route-039", // repo-ops vs docs-forge (PR ready vs PR docs)
  "route-040", // ux-engineer vs app-architect
];
const NOT_INVOCABLE = new Set(["oc-checkpoint-protocol"]);

function frontmatterCommands(id) {
  const raw = readFileSync(join(SKILLS_DIR, id, "SKILL.md"), "utf8");
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  const fm = m ? yaml.load(m[1]) : {};
  return Array.isArray(fm?.commands) ? fm.commands.map(String) : [];
}

// Every case names its route as `all: [<skill>, <command>]`, whatever the mode.
// Pull the skill token (a real skills/<id>) and the command token (a "/verb")
// out of the `all` array so we can assert both point at something real.
function routeTargets(expectObj) {
  const all = expectObj?.all ?? [];
  return {
    skill: all.find((t) => skillDirs.has(t)),
    command: all.find((t) => typeof t === "string" && t.startsWith("/")),
  };
}

describe("prompts/opchain-eval — dataset integrity", () => {
  it("has at least 10 cases (a meaningful regression set)", () => {
    expect(inputs.length).toBeGreaterThanOrEqual(10);
  });

  it("covers every invocable skill in at least one case", () => {
    const covered = new Set(expected.map((r) => routeTargets(r.expect).skill));
    const missing = [...skillDirs].filter((id) => !NOT_INVOCABLE.has(id) && !covered.has(id));
    expect(missing, `skills with no eval case: ${missing.join(", ")}`).toEqual([]);
  });

  it("every input has a unique id and a non-empty input string", () => {
    const ids = new Set();
    for (const row of inputs) {
      expect(typeof row.id).toBe("string");
      expect(row.id.length).toBeGreaterThan(0);
      expect(ids.has(row.id), `duplicate input id ${row.id}`).toBe(false);
      ids.add(row.id);
      expect(typeof row.input).toBe("string");
      expect(row.input.trim().length).toBeGreaterThan(0);
    }
  });

  it("inputs and expected join 1:1 on id", () => {
    const inIds = inputs.map((r) => r.id).sort();
    const exIds = expected.map((r) => r.id).sort();
    expect(exIds).toEqual(inIds);
  });
});

describe("prompts/opchain-eval — expected routes point at real skills + commands", () => {
  for (const row of expected) {
    it(`${row.id} has a valid grader and routes to a real skill + registered command`, () => {
      expect(row.expect, `${row.id} missing expect block`).toBeDefined();
      expect(VALID_MODES.has(row.expect.mode), `${row.id} bad mode ${row.expect.mode}`).toBe(true);
      const { skill, command } = routeTargets(row.expect);
      expect(skill, `${row.id} expect.all names no real skill`).toBeDefined();
      expect(command, `${row.id} expect.all names no /command`).toBeDefined();
      const verb = command.replace(/^\//, "").split(/\s+/, 1)[0];
      if (isKnown) {
        expect(
          isKnown(`skills.command.${verb}.enabled`),
          `command /${verb} has no registry flag`,
        ).toBe(true);
      }
      expect(
        frontmatterCommands(skill),
        `${row.id}: ${skill} does not declare ${command}`,
      ).toContain(command);
    });
  }
});

describe("prompts/opchain-eval — collision cases are graded strictly", () => {
  const byId = new Map(expected.map((r) => [r.id, r]));

  it("pins \"tag the release\" to oc-git-ops /oc-git-release", () => {
    const row = inputs.find((r) => /\btag the release\b/i.test(r.input));
    expect(row, "no eval case for \"tag the release\"").toBeDefined();
    expect(byId.get(row.id).expect.all).toEqual(["oc-git-ops", "/oc-git-release"]);
    expect(COLLISION_CASES).toContain(row.id);
  });

  for (const id of COLLISION_CASES) {
    it(`${id} is llm_judge with criteria naming the wrong-side skill`, () => {
      const row = byId.get(id);
      expect(row, `${id} is listed as a collision case but has no expected row`).toBeDefined();
      expect(row.expect.mode).toBe("llm_judge");
      expect(typeof row.expect.criteria).toBe("string");
      const { skill } = routeTargets(row.expect);
      const named = [...row.expect.criteria.matchAll(/\boc-[a-z]+(?:-[a-z]+)*\b/g)].map((m) => m[0]);
      const wrongSide = named.filter((id2) => id2 !== skill && skillDirs.has(id2));
      expect(wrongSide.length, `${id} criteria names no competing skill`).toBeGreaterThan(0);
    });
  }

  it("every llm_judge case carries criteria", () => {
    for (const row of expected.filter((r) => r.expect.mode === "llm_judge")) {
      expect(typeof row.expect.criteria, `${row.id} has no criteria`).toBe("string");
      expect(row.expect.criteria.length).toBeGreaterThan(0);
    }
  });
});

describe("prompts/opchain-eval — eval.yaml", () => {
  it("parses and declares the canonical grading + thresholds", () => {
    expect(config.prompt).toBe("opchain-routing");
    expect(VALID_MODES.has(config.grading.default_mode)).toBe(true);
  });

  it("declares sane pass + regression thresholds", () => {
    expect(config.thresholds.pass_rate).toBeGreaterThan(0);
    expect(config.thresholds.pass_rate).toBeLessThanOrEqual(1);
    expect(config.thresholds.regression_epsilon).toBeGreaterThan(0);
  });

  it("pass_rate tolerates zero failures, so no collision case is expendable", () => {
    const n = expected.length;
    // The gate passes when passes / n >= pass_rate. With one case failing the
    // rate is (n - 1) / n; that must fall below the threshold.
    expect((n - 1) / n).toBeLessThan(config.thresholds.pass_rate);
  });
});
