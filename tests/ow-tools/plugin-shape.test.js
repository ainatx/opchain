// ow-tools design §3, §7, §8: what ships, where it's published, and the
// family rules every file in the plugin follows.
import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { accessSync, constants, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { PLUGIN, ROOT, has } from "./helpers.js";

// Each case spawns bin/ow-tools (and git/stubs): ~0.2-0.6 s idle, several
// times that under machine load, so these suites get 30 s, not vitest's 5 s.
const SPAWN = { timeout: 30_000 };

const read = (p) => readFileSync(join(PLUGIN, p), "utf8");
const json = (p) => JSON.parse(read(p));

function* files(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* files(p);
    else yield p;
  }
}
const textFiles = [...files(PLUGIN)].filter((p) => /\.(md|mjs|py|json|yaml|toml|typ)$|\/bin\/ow-tools$/.test(p));

describe("ow-tools plugin shape", SPAWN, () => {
  const plugin = json(".claude-plugin/plugin.json");

  it("declares that it runs code", () => {
    expect(plugin).toMatchObject({ name: "ow-tools", license: "Apache-2.0" });
    expect(plugin.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(plugin.description).toMatch(/^Runs code on your machine\./);
  });

  it("has its own marketplace manifest listing only ow-tools, from the public mirror", () => {
    const m = json(".claude-plugin/marketplace.json");
    expect(m.name).toBe("opchain-work-tools");
    expect(m.plugins).toHaveLength(1);
    expect(m.plugins[0]).toMatchObject({
      name: "ow-tools",
      version: plugin.version,
      source: { source: "git-subdir", url: "https://github.com/asfbay-bit/opchain-skills.git", path: "plugins/ow-tools", ref: "main" },
    });
    expect(m.plugins[0].source.sha).toBeUndefined(); // the mirror force-pushes each sync
  });

  it("is never listed in the dev marketplace", () => {
    const dev = JSON.parse(readFileSync(join(ROOT, ".claude-plugin", "marketplace.json"), "utf8"));
    expect(dev.plugins.map((p) => p.name)).not.toContain("ow-tools");
    expect(JSON.stringify(dev)).not.toContain("ow-tools");
  });

  it("ships no package.json, so Claude Code never runs an npm install for it", () => {
    for (const f of ["package.json", "package-lock.json", "npm-shrinkwrap.json", "bun.lock"]) {
      expect(existsSync(join(PLUGIN, f)), f).toBe(false);
    }
    for (const f of textFiles.filter((p) => p.endsWith(".mjs"))) {
      for (const [, spec] of readFileSync(f, "utf8").matchAll(/from "([^"]+)"/g)) {
        expect(spec.startsWith("node:") || spec.startsWith("./"), `${relative(PLUGIN, f)} imports ${spec}`).toBe(true);
      }
    }
  });

  it("wires the SessionStart hook to the executable bin/ow-tools", () => {
    const h = json("hooks/hooks.json").hooks.SessionStart[0];
    expect(h.matcher).toBe("startup|clear|compact");
    expect(h.hooks[0].command).toBe('"${CLAUDE_PLUGIN_ROOT}/bin/ow-tools" hook session-start');
    expect(() => accessSync(join(PLUGIN, "bin", "ow-tools"), constants.X_OK)).not.toThrow();
  });

  it("pins Python 3.12 and a committed lock for pyannote", () => {
    expect(read("python/pyproject.toml")).toMatch(/requires-python = "==3\.12\.\*"/);
    expect(read("python/pyproject.toml")).toMatch(/"pyannote\.audio==\d+\.\d+\.\d+"/);
    expect(read("python/uv.lock")).toContain('name = "pyannote-audio"');
    expect(existsSync(join(PLUGIN, "python", ".venv"))).toBe(false);
  });

  it("has skills whose name matches the folder and whose description leads with the command", () => {
    for (const id of readdirSync(join(PLUGIN, "skills"))) {
      const text = read(`skills/${id}/SKILL.md`);
      const fm = /^---\n([\s\S]*?)\n---/.exec(text)[1];
      expect(fm).toMatch(new RegExp(`^name: ${id}$`, "m"));
      const desc = /^description: "?(.*?)"?$/m.exec(fm)[1];
      expect(desc.length).toBeLessThanOrEqual(1024);
      expect(desc.slice(0, 40)).toContain(`/${id}`);
    }
  });

  it("names no private skill, no skill outside the ow- family, and no business", () => {
    for (const f of textFiles) {
      const text = readFileSync(f, "utf8");
      expect(text, relative(PLUGIN, f)).not.toMatch(/llc-ops|deftwright/i);
      expect(text, relative(PLUGIN, f)).not.toMatch(/\boc-[a-z]+-?[a-z]*\b/);
    }
  });

  it("uses no overclaiming gate words (audit A:117)", () => {
    for (const f of textFiles.filter((p) => !p.endsWith("uv.lock"))) {
      expect(readFileSync(f, "utf8"), relative(PLUGIN, f)).not.toMatch(/\b(enforce[sd]?|guarantee[sd]?|certified|compliant|fails closed|mechanically)\b/i);
    }
  });

  it("keeps SECURITY-MANIFEST.md current", () => {
    const r = spawnSync(process.execPath, [join(ROOT, "scripts", "gen-ow-tools-manifest.mjs"), "--check"], { encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
  });

  it("is in the public mirror's required inputs", () => {
    const wf = readFileSync(join(ROOT, ".github", "workflows", "mirror-public.yml"), "utf8");
    for (const f of [".claude-plugin/plugin.json", ".claude-plugin/marketplace.json", "hooks/hooks.json", "bin/ow-tools", "python/uv.lock"]) {
      expect(wf).toContain(`plugins/ow-tools/${f}`);
    }
  });

  it("ships the licence and notice", () => {
    expect(statSync(join(PLUGIN, "LICENSE")).size).toBeGreaterThan(1000);
    expect(read("NOTICE")).toMatch(/Copyright \d{4}/);
  });

  it.skipIf(!has("claude"))("passes claude plugin validate --strict", () => {
    for (const target of [".claude-plugin/plugin.json", ".claude-plugin/marketplace.json"]) {
      const r = spawnSync("claude", ["plugin", "validate", join(PLUGIN, target), "--strict"], { encoding: "utf8" });
      expect(r.status, r.stdout + r.stderr).toBe(0);
    }
  });
});
