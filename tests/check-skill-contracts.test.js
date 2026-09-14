// scripts/check-skill-contracts.mjs — the cross-skill verb and orchestrator §7
// gates added in v1.9.1 Sprint 4. Each drift case builds a scratch skills tree
// that carries one defect the 2026-09-11 skill-chain audit found in the real
// catalog, and proves the check reports it.
import { describe, it, expect, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { checkVerbs, checkS7, descriptionBlock } from "../scripts/check-skill-contracts.mjs";

const ROOT = join(import.meta.dirname, "..");
const CLI = join(ROOT, "scripts", "check-skill-contracts.mjs");
const scratch = [];
afterAll(() => scratch.forEach((d) => rmSync(d, { recursive: true, force: true })));

function skill(dir, id, { commands, description, body = "" }) {
  mkdirSync(join(dir, id), { recursive: true });
  const fm = [
    "---",
    `name: ${id}`,
    "commands:",
    ...commands.map((c) => `  - ${c}`),
    "description: >",
    ...description.map((l) => `  ${l}`),
    "---",
    "",
    `# ${id}`,
    "",
    body,
  ].join("\n");
  writeFileSync(join(dir, id, "SKILL.md"), fm);
}

const AUDIT_DESC = ["Code auditor. Use for /oc-audit, \"audit this\"."];
const DEPLOY_DESC = ["Deploy pipeline. Use for /oc-deploy,", "\"ship it\"."];

function s7(blocks) {
  return blocks.map(([id, lines]) => `# ${id}\ndescription: >\n${lines.map((l) => `  ${l}`).join("\n")}\n`).join("\n");
}

function orchestrator({ prose = "", section7 }) {
  return [
    "# Orchestrator",
    "",
    "## 3. Active Chaining Protocol",
    "",
    prose,
    "",
    "## 7. Skill Descriptions (Trigger Optimization)",
    "",
    "```yaml",
    section7 + "```",
    "",
    "## 8. Ecosystem Awareness",
    "",
  ].join("\n");
}

/** A consistent two-skill tree: both checks pass on it unchanged. */
function tree({ auditBody = "", deployBody = "", prose, section7 } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "oc-contracts-"));
  scratch.push(dir);
  skill(dir, "oc-code-auditor", { commands: ["/oc-audit", "/oc-audit pre-deploy"], description: AUDIT_DESC, body: auditBody });
  skill(dir, "oc-deploy-ops", { commands: ["/oc-deploy", "/oc-deploy staging", "/oc-deploy rollback"], description: DEPLOY_DESC, body: deployBody });
  skill(dir, "oc-checkpoint-protocol", { commands: [], description: ["The schema."] });
  writeFileSync(
    join(dir, "orchestrator.md"),
    orchestrator({ prose: prose ?? "Error in deploy → suggest /oc-deploy rollback.", section7: section7 ?? s7([["oc-code-auditor", AUDIT_DESC], ["oc-deploy-ops", DEPLOY_DESC]]) }),
  );
  return dir;
}

describe("verbs", () => {
  it("passes a tree whose handoffs all name declared verbs", () => {
    const dir = tree({ deployBody: "Run `/oc-audit pre-deploy` before `/oc-deploy staging`." });
    expect(checkVerbs(dir)).toEqual([]);
  });

  it("flags a handoff to a subcommand the owner does not declare", () => {
    const dir = tree({ deployBody: "First run `/oc-audit security`." });
    const problems = checkVerbs(dir);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/skills\/oc-deploy-ops\/SKILL\.md:\d+: `\/oc-audit security` is not declared by its owner oc-code-auditor/);
  });

  it("reports the real file line of the offending citation", () => {
    const dir = tree({ deployBody: "line one\nline two\nFirst run `/oc-audit security`." });
    const [problem] = checkVerbs(dir);
    const line = Number(problem.match(/SKILL\.md:(\d+):/)[1]);
    const text = readFileSync(join(dir, "oc-deploy-ops", "SKILL.md"), "utf8").split("\n")[line - 1];
    expect(text).toContain("/oc-audit security");
  });

  it("flags a verb no skill declares, quoted in a skill or unquoted in orchestrator prose", () => {
    const dir = tree({ auditBody: "Commit with `/oc-git-commit`.", prose: "Error in deploy → suggest /oc-rollback." });
    const problems = checkVerbs(dir);
    expect(problems.some((p) => /oc-code-auditor\/SKILL\.md:\d+: `\/oc-git-commit` is not declared/.test(p))).toBe(true);
    expect(problems.some((p) => /orchestrator\.md:\d+: `\/oc-rollback` is not declared/.test(p))).toBe(true);
  });

  it("flags an unquoted verb no skill declares in a SKILL.md body, but allows a description trigger alias", () => {
    const dir = tree({ deployBody: "On failure, suggest /oc-rollback." });
    skill(dir, "oc-migration-ops", { commands: ["/oc-migrate"], description: ["Migrations. Use for /oc-migrate, /oc-upgrade."] });
    expect(checkVerbs(dir)).toEqual([expect.stringMatching(/oc-deploy-ops\/SKILL\.md:\d+: `\/oc-rollback` is not declared/)]);
  });

  it("does not read an English word after an unquoted verb, or a skill's own verbs, as a handoff", () => {
    const dir = tree({
      auditBody: "Run `/oc-audit fix-all` yourself.",
      prose: "Use /oc-audit to find bugs, then /oc-deploy staging.",
    });
    expect(checkVerbs(dir)).toEqual([]);
  });

  it("reads frontmatter descriptions: an unquoted subcommand the owner documents but does not declare", () => {
    const dir = tree();
    skill(dir, "oc-qa-ops", {
      commands: ["/oc-qa"],
      description: ["Test strategy. NOT writing tests (/oc-audit test-bootstrap)."],
    });
    // oc-code-auditor documents the verb in its menu without declaring it
    skill(dir, "oc-code-auditor", {
      commands: ["/oc-audit", "/oc-audit pre-deploy"],
      description: AUDIT_DESC,
      body: "```\n  /oc-audit pre-deploy      Gate\n```\n\nRun `/oc-audit test-bootstrap` on untested code.",
    });
    const problems = checkVerbs(dir);
    expect(problems.some((p) => /oc-qa-ops\/SKILL\.md:\d+: `\/oc-audit test-bootstrap` is not declared by its owner/.test(p))).toBe(true);
  });

  it("reads a quoted verb inside a code block, such as a Skill() call's args", () => {
    const dir = tree({ deployBody: "```\nSkill(skill=\"oc-code-auditor\", args=\"/oc-audit verify\")\n```" });
    expect(checkVerbs(dir).join("\n")).toMatch(/`\/oc-audit verify` is not declared by its owner oc-code-auditor/);
  });

  it("reads a skill's references/, but not the bundled protocol copies", () => {
    const dir = tree();
    mkdirSync(join(dir, "oc-deploy-ops", "references"));
    writeFileSync(join(dir, "oc-deploy-ops", "references", "runbook.md"), "Then `/oc-app-architect`.\n");
    writeFileSync(join(dir, "oc-deploy-ops", "references", "orchestrator.md"), "Stale copy: `/oc-rollback`.\n");
    const problems = checkVerbs(dir);
    expect(problems).toEqual(["skills/oc-deploy-ops/references/runbook.md:1: `/oc-app-architect` is not declared by any skill's frontmatter commands"]);
  });

  it("flags a skill's own menu verb that its frontmatter does not declare", () => {
    const dir = tree({ auditBody: "```\nAUDIT COMMANDS\n  /oc-audit pre-deploy      Gate\n  /oc-audit fix <id>        Fix one finding\n```" });
    expect(checkVerbs(dir).join("\n")).toMatch(/menu verb `\/oc-audit fix` is not declared by its owner oc-code-auditor/);
  });

  it("flags an undeclared subcommand of a root that declares none, when quoted", () => {
    const dir = tree({ deployBody: "Then `/oc-git bogus`, and `/oc-git-sync v<semver>` stays an argument." });
    skill(dir, "oc-git-ops", { commands: ["/oc-git", "/oc-git-sync"], description: ["Git."] });
    expect(checkVerbs(dir)).toHaveLength(1);
    expect(checkVerbs(dir).join("\n")).toMatch(/`\/oc-git bogus` is not declared by its owner oc-git-ops/);
  });

  it("leaves §7 trigger phrases to the s7 check", () => {
    const dir = tree({ section7: s7([["oc-code-auditor", ["Use for /oc-auditx."]], ["oc-deploy-ops", DEPLOY_DESC]]) });
    expect(checkVerbs(dir)).toEqual([]);
  });
});

describe("s7", () => {
  it("passes when every invocable skill has an identical block in catalog order", () => {
    expect(checkS7(tree())).toEqual([]);
  });

  it("flags a block that drifted from the frontmatter description", () => {
    const dir = tree({ section7: s7([["oc-code-auditor", ["Code auditor. Use for /oc-audit, \"security audit\"."]], ["oc-deploy-ops", DEPLOY_DESC]]) });
    expect(checkS7(dir).join("\n")).toMatch(/oc-code-auditor differs from skills\/oc-code-auditor\/SKILL\.md/);
  });

  it("flags a missing block and a block for a skill that is not in skills/", () => {
    const dir = tree({ section7: s7([["oc-code-auditor", AUDIT_DESC], ["oc-hindsight", ["A v2.0 skill."]]]) });
    const out = checkS7(dir).join("\n");
    expect(out).toMatch(/no block for oc-deploy-ops/);
    expect(out).toMatch(/block for oc-hindsight, which is not an invocable skill/);
  });

  it("flags out-of-order blocks", () => {
    const dir = tree({ section7: s7([["oc-deploy-ops", DEPLOY_DESC], ["oc-code-auditor", AUDIT_DESC]]) });
    expect(checkS7(dir).join("\n")).toMatch(/out of catalog order/);
  });

  it("--write regenerates the block from frontmatter and leaves the rest of the file alone", () => {
    const dir = tree({ section7: s7([["oc-hindsight", ["A v2.0 skill."]]]) });
    const before = readFileSync(join(dir, "orchestrator.md"), "utf8");
    expect(checkS7(dir, { write: true })).toEqual([]);
    const after = readFileSync(join(dir, "orchestrator.md"), "utf8");
    expect(checkS7(dir)).toEqual([]);
    expect(after).not.toContain("oc-hindsight");
    expect(after.slice(0, before.indexOf("```yaml"))).toBe(before.slice(0, before.indexOf("```yaml")));
    expect(after.endsWith("## 8. Ecosystem Awareness\n")).toBe(true);
  });

  it("--write never touches a yaml block outside §7", () => {
    const dir = tree();
    const path = join(dir, "orchestrator.md");
    const noBlock = readFileSync(path, "utf8").replace(/```yaml\n[\s\S]*?```\n/, "").replace("## 8. Ecosystem Awareness\n", "## 8. Ecosystem Awareness\n\n```yaml\nkeep: me\n```\n");
    writeFileSync(path, noBlock);
    expect(checkS7(dir, { write: true })[0]).toMatch(/no .* yaml block/);
    expect(readFileSync(path, "utf8")).toBe(noBlock);
  });

  it("reads a description block that is followed by another key", () => {
    const fm = "name: x\ndescription: >\n  Line one\n  line two.\ngovernance:\n  owner: y";
    expect(descriptionBlock(fm)).toBe("description: >\n  Line one\n  line two.");
  });
});

describe("CLI", () => {
  it("exits 1 with each problem on stderr for a drifted tree", () => {
    const dir = tree({ deployBody: "Run `/oc-audit security`." });
    const r = spawnSync(process.execPath, [CLI], { env: { ...process.env, OPCHAIN_SKILLS_DIR: dir }, encoding: "utf8" });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/`\/oc-audit security` is not declared/);
  });

  it("passes on the real catalog", () => {
    const env = { ...process.env };
    delete env.OPCHAIN_SKILLS_DIR;
    const r = spawnSync(process.execPath, [CLI], { env, encoding: "utf8" });
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
  });
});
