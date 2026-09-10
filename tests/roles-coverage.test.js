import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { getSkillRole } from "../site/src/lib/roles.ts";
import { walkthroughs } from "../site/src/data/walkthroughs/index";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function skillDirs() {
  return readdirSync(resolve(repoRoot, "skills"), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

/**
 * Guards two kinds of silent drift that both render as "wrong colour on the
 * /demo workbench" rather than as an error:
 *
 *   1. A skill ships under skills/ but never gets a ROLE_BY_NAME entry, so
 *      getSkillRole() falls back to "specialist". Eleven skills added between
 *      v1.6 and v1.9 were in this state before v2.0.
 *   2. A walkthrough names a skill that doesn't exist — a typo, or a skill
 *      renamed out from under the scenario. Nothing else in the build reads
 *      walkthrough skill ids, so this is otherwise invisible.
 */
describe("skill role coverage", () => {
  it("maps every skill in skills/ to an explicit role", () => {
    const unmapped = skillDirs().filter(
      (name) => getSkillRole(name) === "specialist" && !EXPLICIT_SPECIALISTS.has(name)
    );
    expect(unmapped).toEqual([]);
  });

  it("only references real skills from walkthrough skills[]", () => {
    const known = new Set(skillDirs());
    const bad = [];
    for (const w of walkthroughs) {
      for (const s of w.skills) if (!known.has(s)) bad.push(`${w.id} → ${s}`);
    }
    expect(bad).toEqual([]);
  });

  it("only references real skills from beat skill badges", () => {
    const known = new Set(skillDirs());
    const bad = [];
    for (const w of walkthroughs) {
      for (const step of w.steps) {
        if (step.type === "beat") {
          for (const s of step.skills ?? []) if (!known.has(s)) bad.push(`${w.id} → ${s}`);
        } else if (step.type === "exchange" && step.skill) {
          if (!known.has(step.skill)) bad.push(`${w.id} → ${step.skill}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});

/**
 * oc-git-ops chains to oc-bug-check before every commit — see
 * skills/orchestrator.md §3 ("/oc-git-commit or /oc-git-sync starts →
 * oc-bug-check"). The repo enforces the same edge with a PreToolUse hook that
 * refuses a commit until the gate records a PASS bound to the working tree.
 *
 * A scenario that shows oc-git-ops without oc-bug-check therefore depicts a
 * pipeline that cannot run. Scenarios that never commit are exempt: a gate
 * with nothing to check is padding, not proof.
 */
describe("pipeline invariants in walkthroughs", () => {
  it("shows oc-bug-check wherever a scenario uses oc-git-ops", () => {
    const violations = walkthroughs
      .filter((w) => w.skills.includes("oc-git-ops") && !w.skills.includes("oc-bug-check"))
      .map((w) => w.id);
    expect(violations).toEqual([]);
  });

  it("shows oc-bug-check before oc-deploy-ops wherever both commit and deploy appear", () => {
    const violations = walkthroughs
      .filter(
        (w) =>
          w.skills.includes("oc-deploy-ops") &&
          w.skills.includes("oc-git-ops") &&
          !w.skills.includes("oc-bug-check")
      )
      .map((w) => w.id);
    expect(violations).toEqual([]);
  });
});

/**
 * Skills whose role genuinely IS "specialist". Listed explicitly so the
 * fallback can't masquerade as a real mapping — adding a skill here is a
 * deliberate act, forgetting one is a test failure.
 */
const EXPLICIT_SPECIALISTS = new Set([
  "oc-claude-api",
  "oc-dash-forge",
  "oc-docs-forge",
  "oc-git-ops",
  "oc-migration-ops",
  "oc-modularize-ops",
  "oc-monitoring-ops",
  "oc-prompt-ops",
  "oc-reverse-spec",
  "oc-security-hardening",
]);
