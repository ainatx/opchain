import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const LOCAL_SERVER = join(ROOT, "mcp", "local-server.mjs");
const rpc = (method, params, id) => ({ jsonrpc: "2.0", id, method, params });

function skillBody(name = "oc-safe") {
  return [
    "---",
    `name: ${name}`,
    "displayName: Safe fixture",
    "version: 1.0.0",
    "shortDesc: Safe fixture.",
    "phases: [build]",
    "triAgent: false",
    "commands: [/oc-safe]",
    "description: Safe fixture.",
    "---",
    "# Safe fixture",
    "",
  ].join("\n");
}

function runLocal(skillsDir, projectDir, messages) {
  return spawnSync(process.execPath, [LOCAL_SERVER], {
    cwd: ROOT,
    env: { ...process.env, OPCHAIN_SKILLS_DIR: skillsDir, OPCHAIN_PROJECT_DIR: projectDir },
    input: `${messages.map((message) => JSON.stringify(message)).join("\n")}\n`,
    encoding: "utf8",
    timeout: 15_000,
  });
}

describe("local MCP reference containment", () => {
  it("omits and refuses external file and directory symlinks while preserving canonical and legacy reads", () => {
    const fixture = mkdtempSync(join(tmpdir(), "opchain-reference-containment-"));
    const skills = join(fixture, "skills");
    const project = join(fixture, "project");
    const skill = join(skills, "oc-safe");
    const references = join(skill, "references");
    const outside = join(fixture, "outside");
    const secret = "SA-192-02 external content must remain private";
    try {
      mkdirSync(references, { recursive: true });
      mkdirSync(outside, { recursive: true });
      mkdirSync(project);
      writeFileSync(join(skills, "orchestrator.md"), "# Orchestrator\n");
      writeFileSync(join(skill, "SKILL.md"), skillBody());
      writeFileSync(join(references, "guide.md"), "# Trusted guide\n");
      writeFileSync(join(outside, "secret.md"), secret);
      symlinkSync(join(outside, "secret.md"), join(references, "external-file.md"));
      symlinkSync(outside, join(references, "external-directory"));

      const result = runLocal(skills, project, [
        rpc("resources/read", { uri: "opchain://skill/oc-safe/references/v1/manifest.json" }, 1),
        rpc("resources/read", { uri: "opchain://skill/oc-safe/references/v1/guide.md" }, 2),
        rpc("resources/read", { uri: "opchain://skill/oc-safe/references/guide.md" }, 3),
        rpc("resources/read", { uri: "opchain://skill/oc-safe/references/v1/external-file.md" }, 4),
        rpc("resources/read", { uri: "opchain://skill/oc-safe/references/v1/external-directory/secret.md" }, 5),
      ]);
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).not.toContain(secret);
      const responses = result.stdout.trim().split("\n").map((line) => JSON.parse(line));
      const manifest = JSON.parse(responses[0].result.contents[0].text);
      expect(manifest.files.map((file) => file.path)).toEqual(["references/guide.md"]);
      expect(responses[1].result.contents[0].text).toContain("Trusted guide");
      expect(responses[2].result.contents[0].text).toContain("Trusted guide");
      expect(responses[3].error.code).toBe(-32602);
      expect(responses[4].error.code).toBe(-32602);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("rejects a symlinked SKILL.md before catalog or body loading", () => {
    const fixture = mkdtempSync(join(tmpdir(), "opchain-skill-containment-"));
    const skills = join(fixture, "skills");
    const project = join(fixture, "project");
    const skill = join(skills, "oc-linked");
    const outside = join(fixture, "outside-skill.md");
    const secret = "SA-192-02 linked skill body must remain private";
    try {
      mkdirSync(skill, { recursive: true });
      mkdirSync(project);
      writeFileSync(join(skills, "orchestrator.md"), "# Orchestrator\n");
      writeFileSync(outside, `${skillBody("oc-linked")}\n${secret}\n`);
      symlinkSync(outside, join(skill, "SKILL.md"));

      const result = runLocal(skills, project, [rpc("tools/call", { name: "get_skill", arguments: { id: "oc-linked" } }, 1)]);
      expect(result.status).not.toBe(0);
      expect(`${result.stdout}\n${result.stderr}`).not.toContain(secret);
      expect(result.stderr).toContain("refused an unsafe SKILL.md path");
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });
});
