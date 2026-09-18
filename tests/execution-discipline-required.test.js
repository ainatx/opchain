import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const SKILLS = join(ROOT, "skills");
const PLUGIN = join(ROOT, "plugins/opchain/skills");

const REQUIRED = /On first invocation, read `references\/orchestrator\.md`[\s\S]*?apply §0 Execution Discipline/;
const BLOCK = /Do not start skill-specific work until that section is in context/;
const CLOCK = /\*\*Every turn:\*\* start the reply with the current local date, time, and IANA timezone\. Do not omit this on later turns\./;
const GOAL = /\*\*Then set the goal\.\*\* State one concrete outcome and observable acceptance criteria before other work\./;
const CLOCK_THEN_GOAL = new RegExp(`${CLOCK.source}\\n\\n${GOAL.source}`);

function listSkills(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(dir, e.name, "SKILL.md")))
    .map((e) => e.name)
    .sort();
}

function sectionZero(orchestrator) {
  const start = orchestrator.indexOf("## 0. Execution Discipline");
  const end = orchestrator.indexOf("\n## 1. ", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return orchestrator.slice(start, end);
}

/**
 * Imaginary host: only SKILL.md is in context until the agent follows its
 * first-invocation instruction and loads the bundled orchestrator reference.
 */
function startSkill(id, trees = [SKILLS]) {
  const reads = [];
  function load(rel) {
    for (const tree of trees) {
      const path = join(tree, rel);
      if (existsSync(path)) {
        reads.push(rel);
        return readFileSync(path, "utf8");
      }
    }
    throw new Error(`missing ${rel}`);
  }
  const skillMd = load(`${id}/SKILL.md`);
  const body = skillMd.replace(/^---[\s\S]*?\n---\n/, "");
  const req = body.match(
    /read `([^`]+)`(?: \(if present; otherwise the shared `([^`]+)`\))? and apply §0 Execution Discipline/,
  );
  if (!req) {
    return { skillMd, body, required: null, agreement: null, reads };
  }
  const bundled = `${id}/${req[1]}`;
  const fallback = req[2];
  const orchestrator = existsSync(join(trees[0], bundled)) ? load(bundled) : load(fallback);
  return { skillMd, body, required: req[1], agreement: sectionZero(orchestrator), reads };
}

describe("every skill requires the shared execution agreement", () => {
  const ids = listSkills(SKILLS);

  it("covers all 36 catalog skills, including oc-checkpoint-protocol", () => {
    expect(ids).toHaveLength(36);
    expect(ids).toContain("oc-checkpoint-protocol");
  });

  it("each SKILL.md requires §0 before skill-specific work", () => {
    const missing = ids.filter((id) => {
      const text = readFileSync(join(SKILLS, id, "SKILL.md"), "utf8");
      return !REQUIRED.test(text) || !BLOCK.test(text);
    });
    expect(missing).toEqual([]);
  });

  it("each SKILL.md itself requires a date/time stamp on every turn", () => {
    const missing = ids.filter((id) => {
      const text = readFileSync(join(SKILLS, id, "SKILL.md"), "utf8");
      return !CLOCK.test(text);
    });
    expect(missing).toEqual([]);
  });

  it("each SKILL.md sets the goal immediately after the clock", () => {
    const missing = ids.filter((id) => {
      const text = readFileSync(join(SKILLS, id, "SKILL.md"), "utf8");
      return !CLOCK_THEN_GOAL.test(text);
    });
    expect(missing).toEqual([]);
  });

  it("plugin copies stay byte-identical", () => {
    const drift = ids.filter((id) => {
      const a = readFileSync(join(SKILLS, id, "SKILL.md"));
      const b = readFileSync(join(PLUGIN, id, "SKILL.md"));
      return !a.equals(b);
    });
    expect(drift).toEqual([]);
  });
});

describe("imaginary skill start", () => {
  it("/oc-bugcheck SKILL.md alone still requires clock then goal", () => {
    const skillMd = readFileSync(join(SKILLS, "oc-bug-check", "SKILL.md"), "utf8");
    expect(skillMd).toMatch(CLOCK_THEN_GOAL);
    expect(skillMd).not.toMatch(/smallest complete solution/);
    expect(skillMd).not.toMatch(/planning evidence, not SLAs/);
  });

  it("a later /oc-bugcheck turn still has clock then goal without re-reading orchestrator.md", () => {
    const skillMd = readFileSync(join(SKILLS, "oc-bug-check", "SKILL.md"), "utf8");
    const laterTurn = {
      previousReads: ["oc-bug-check/SKILL.md"],
      user: "run it again",
      skillStillInContext: skillMd,
    };
    expect(laterTurn.skillStillInContext).toMatch(/Do not omit this on later turns/);
    expect(laterTurn.skillStillInContext).toMatch(/IANA timezone/);
    expect(laterTurn.skillStillInContext).toMatch(/Then set the goal/);
    expect(laterTurn.skillStillInContext.indexOf("Every turn:")).toBeLessThan(
      laterTurn.skillStillInContext.indexOf("Then set the goal."),
    );
  });

  it("following the required read puts §0 in context before bug-check work", () => {
    const start = startSkill("oc-bug-check");
    expect(start.reads).toEqual([
      "oc-bug-check/SKILL.md",
      "oc-bug-check/references/orchestrator.md",
    ]);
    expect(start.agreement).toMatch(/Define the outcome/);
    expect(start.agreement).toMatch(/smallest complete solution/);
    expect(start.agreement).toMatch(/current local date and time/);
    expect(start.agreement).toMatch(/planning evidence, not SLAs/);
    expect(start.body.indexOf("§0 Execution Discipline")).toBeLessThan(
      start.body.indexOf("Pre-commit QA gate"),
    );
  });

  it("oc-checkpoint-protocol requires the same read even though it has no slash command", () => {
    const start = startSkill("oc-checkpoint-protocol");
    expect(start.required).toBe("references/orchestrator.md");
    expect(start.reads).toEqual([
      "oc-checkpoint-protocol/SKILL.md",
      "oc-checkpoint-protocol/references/orchestrator.md",
    ]);
    expect(start.agreement).toMatch(/Save a proportional plan/);
  });

  it("every catalog skill's required read resolves to a §0 that names the clock", () => {
    for (const id of listSkills(SKILLS)) {
      const start = startSkill(id);
      expect(start.required, id).toBeTruthy();
      expect(start.agreement, id).toMatch(/current local date and time/);
      expect(start.reads[0], id).toBe(`${id}/SKILL.md`);
      expect(start.reads[1], id).toMatch(/orchestrator\.md$/);
    }
  });
});
