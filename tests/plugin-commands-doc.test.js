// plugins/opchain/README.md documents which slash commands the plugin
// registers. The 2026-09-11 audit found the set was listed nowhere, so users
// typed declared-but-unregistered verbs expecting them to exist. This pins the
// README table to the real commands/ directory, and pins the next-suggestion
// hook's command map to workflow commands; explicit enrollment is setup.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN = join(ROOT, "plugins", "opchain");

const shipped = readdirSync(join(PLUGIN, "commands"))
  .filter((f) => f.endsWith(".md"))
  .map((f) => `/${f.replace(/\.md$/, "")}`)
  .sort();

describe("plugin slash commands are documented as shipped", () => {
  const readme = readFileSync(join(PLUGIN, "README.md"), "utf8");
  const section = readme.split("## Registered slash commands")[1]?.split(/\n## /)[0] ?? "";

  it("the README has a Registered slash commands section", () => {
    expect(section.length).toBeGreaterThan(0);
  });

  it("the README table lists exactly the commands/*.md files", () => {
    const rows = [...section.matchAll(/^\| `(\/oc-[a-z0-9-]+)` \| (oc-[a-z0-9-]+) \|/gm)];
    expect(rows.map((m) => m[1]).sort()).toEqual(shipped);
  });

  it("each table row names the skill its command file invokes", () => {
    for (const m of section.matchAll(/^\| `\/(oc-[a-z0-9-]+)` \| (oc-[a-z0-9-]+) \|/gm)) {
      const body = readFileSync(join(PLUGIN, "commands", `${m[1]}.md`), "utf8");
      expect(body, `commands/${m[1]}.md does not invoke ${m[2]}`).toContain(`\`${m[2]}\``);
    }
  });

  it("the count in prose matches the directory", () => {
    const words = { 12: "twelve", 13: "thirteen", 14: "fourteen" };
    expect(section).toContain(`registers ${words[shipped.length] ?? shipped.length} slash commands`);
  });

  it("next-suggestion.cjs maps every workflow command; enrollment stays a setup action", () => {
    const hook = readFileSync(join(PLUGIN, "hooks", "next-suggestion.cjs"), "utf8");
    const map = hook.split("const COMMANDS = {")[1]?.split("};")[0] ?? "";
    const targets = [...map.matchAll(/"(oc-[a-z0-9-]+)":\s*"(\/oc-[a-z0-9-]+)"/g)].map((m) => m[2]).sort();
    expect(targets).toEqual(shipped.filter((command) => command !== "/oc-enroll"));
    expect(readFileSync(join(PLUGIN, "commands", "oc-enroll.md"), "utf8")).toContain("not a next-skill handoff");
  });
});
