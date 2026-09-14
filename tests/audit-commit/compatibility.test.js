import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");
const scratches = [];
afterEach(() => {
  while (scratches.length) rmSync(scratches.pop(), { recursive: true, force: true });
});

describe("hook ownership and portable commands", () => {
  it("leaves commit authorization exclusively at the Git commit boundary", () => {
    const local = JSON.parse(readFileSync(join(ROOT, ".claude/settings.json"), "utf8"));
    const plugin = JSON.parse(readFileSync(join(ROOT, "plugins/opchain/hooks/hooks.json"), "utf8"));
    const installer = readFileSync(join(ROOT, "scripts/install-git-drivers.mjs"), "utf8");
    expect(local.hooks.PreToolUse).toBeUndefined();
    expect(plugin.hooks.PreToolUse).toBeUndefined();
    expect(installer).toContain('node "$runtime_root/verify-candidate.mjs" run');
  });

  it("starts every registered plugin hook when the install path contains spaces", () => {
    const root = mkdtempSync(join(tmpdir(), "opchain plugin with spaces "));
    scratches.push(root);
    cpSync(join(ROOT, "plugins/opchain/hooks"), join(root, "hooks"), { recursive: true });
    const registration = JSON.parse(readFileSync(join(root, "hooks/hooks.json"), "utf8"));
    const commands = Object.values(registration.hooks).flatMap((entries) =>
      entries.flatMap((entry) => entry.hooks.map((hook) => hook.command)),
    );
    expect(commands).toHaveLength(2);
    for (const command of commands) {
      expect(command).toMatch(/^node "\$\{CLAUDE_PLUGIN_ROOT\}\/hooks\/[a-z-]+\.cjs"$/);
      const result = spawnSync("sh", ["-c", command], {
        cwd: root,
        env: { ...process.env, CLAUDE_PLUGIN_ROOT: root },
        input: JSON.stringify({ tool_name: "Read", cwd: root, tool_input: {} }),
        encoding: "utf8",
      });
      expect(result.status, result.stderr).toBe(0);
    }
  });
});

describe("documented private-key header scan", () => {
  it("matches generic, RSA, EC, and OpenSSH headers without embedding key material", () => {
    const root = mkdtempSync(join(tmpdir(), "opchain pem headers "));
    scratches.push(root);
    const headers = {
      "generic.txt": "-----BEGIN PRIVATE KEY-----\n",
      "rsa.txt": "-----BEGIN RSA PRIVATE KEY-----\n",
      "ec.txt": "-----BEGIN EC PRIVATE KEY-----\n",
      "openssh.txt": "-----BEGIN OPENSSH PRIVATE KEY-----\n",
      "public.txt": "-----BEGIN PUBLIC KEY-----\n",
    };
    for (const [name, body] of Object.entries(headers)) writeFileSync(join(root, name), body);

    const skill = readFileSync(join(ROOT, "skills/oc-bug-check/SKILL.md"), "utf8");
    const section = skill.slice(skill.indexOf("# Private-key headers"));
    const block = section.slice(0, section.indexOf("\n\n"));
    const command = block
      .split("\n")
      .slice(1)
      .join("\n")
      .replace(/\\\n\s*/g, " ");
    const result = spawnSync("sh", ["-c", command], { cwd: root, encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
    for (const name of ["generic.txt", "rsa.txt", "ec.txt", "openssh.txt"]) {
      expect(result.stdout).toContain(name);
    }
    expect(result.stdout).not.toContain("public.txt");
  });
});
