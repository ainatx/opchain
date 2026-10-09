// catalogs.json and the per-catalog checks (ow-start design §9 item 1; the ow-
// pack audit's "catalogs.json BEFORE any ow- SKILL.md"). Three things are proven
// here: both catalogs validate; the ow- rules (Agent Skills frontmatter,
// text-only packaging, protocol copies, family names, NEXT blocks, edge rows)
// catch what they claim to; and every script that writes an oc- build output
// refuses a tree holding another catalog's skills before deleting or writing
// anything, so pointing OPCHAIN_SKILLS_DIR at skills-work/ is no longer destructive.
import { afterAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { loadCatalogs } from "../scripts/lib/catalogs.mjs";
import { validateCatalog } from "../scripts/gen-skills-catalog.mjs";
import { checkFamily, checkProtocolCopies, checkVerbs } from "../scripts/check-skill-contracts.mjs";

const ROOT = join(import.meta.dirname, "..");
const scratch = [];
afterAll(() => scratch.forEach((d) => rmSync(d, { recursive: true, force: true })));
// Real paths: a script's "run only when invoked directly" check compares its own
// resolved URL with argv[1], and macOS's tmpdir sits behind a /var symlink.
const temp = (prefix) => { const d = realpathSync(mkdtempSync(join(tmpdir(), prefix))); scratch.push(d); return d; };

describe("catalogs.json", () => {
  const catalogs = loadCatalogs({ env: {} });
  const byId = Object.fromEntries(catalogs.map((c) => [c.id, c]));

  it("declares the oc- catalog in skills/ and the ow- catalog in skills-work/", () => {
    expect(catalogs.map((c) => [c.id, c.relDir, c.prefix, c.verbPrefix])).toEqual([
      ["oc", "skills", "oc-", "/oc-"],
      ["ow", "skills-work", "ow-", "/ow-"],
    ]);
  });

  it("keeps the ow- catalog out of every oc- build output, by name", () => {
    expect(Object.keys(byId.ow.outputs).sort()).toEqual(["docs", "flagRegistry", "mcpCatalog", "mirror", "plugin", "zip"]);
    expect(Object.values(byId.ow.outputs).every((v) => v === null)).toBe(true);
    expect(Object.values(byId.oc.outputs).every((v) => typeof v === "string")).toBe(true);
  });

  it("moves one catalog per env override, never the other", () => {
    const moved = loadCatalogs({ env: { OPCHAIN_SKILLS_DIR: "/tmp/vendored-skills" } });
    expect(moved.find((c) => c.id === "oc").dir).toBe("/tmp/vendored-skills");
    expect(moved.find((c) => c.id === "ow").dir).toBe(join(ROOT, "skills-work"));
  });

  it("validates both real catalogs", () => {
    expect(validateCatalog(byId.oc).length).toBeGreaterThanOrEqual(36);
    expect(validateCatalog(byId.ow)).toEqual(["ow-start"]);
  });

  it("the real tree passes the protocol, verb and family checks", () => {
    expect(checkProtocolCopies(catalogs)).toEqual([]);
    expect(checkVerbs(null, { catalogs })).toEqual([]);
    expect(checkFamily(catalogs)).toEqual([]);
  });

  it("the ow- catalog appears in no tracked oc- output", () => {
    const mcp = readFileSync(join(ROOT, "src", "generated", "mcp-catalog.json"), "utf8");
    expect(mcp).not.toMatch(/"ow-start"/);
    expect(existsSync(join(ROOT, "plugins", "opchain", "skills", "ow-start"))).toBe(false);
    expect(existsSync(join(ROOT, ".claude", "skills", "ow-start"))).toBe(false);
    expect(readFileSync(join(ROOT, ".github", "workflows", "mirror-public.yml"), "utf8")).not.toMatch(/skills-work/);
  });
});

// ── a scratch ow- catalog ────────────────────────────────────────────────────

const PROTOCOL = "# ow- protocol (version 1)\n\nShared rules for the scratch family.\n";
const BODY = [
  "# ow-demo",
  "",
  "Open `references/ow-protocol.md` and run its step 0. If you cannot open it, say so and stop.",
  "",
  "## Reads from",
  "",
  "| From | Path | If absent | If mismatch |",
  "|---|---|---|---|",
  "| the user | notes | Ask for notes | Use what parses |",
  "",
  "## Hands off to",
  "",
  "| When | Next skill | Say | If not available |",
  "|---|---|---|---|",
  "| Done | ow-later | \"use ow-later on out.md\" | out.md stands alone |",
  "",
  "    DONE: demo -> out.md",
  "    NEXT: say \"use ow-later on out.md\"   (where slash commands exist: /ow-demo)",
  "    IF IT IS NOT AVAILABLE: out.md stands alone.",
  "",
].join("\n");
const FRONTMATTER = [
  "name: ow-demo",
  "description: >",
  "  ow-demo writes a demo recap from your notes. Use for /ow-demo.",
  "license: Apache-2.0",
  "metadata:",
  "  version: \"1.0.0\"",
  "  protocol: \"1\"",
  "  bundle: core",
  "  network: none",
  "  commands: /ow-demo",
].join("\n");

function owTree({ frontmatter = FRONTMATTER, body = BODY, files = {} } = {}) {
  const dir = temp("ow-catalog-");
  mkdirSync(join(dir, "ow-demo", "references"), { recursive: true });
  writeFileSync(join(dir, "ow-protocol.md"), PROTOCOL);
  writeFileSync(join(dir, "ow-demo", "references", "ow-protocol.md"), PROTOCOL);
  writeFileSync(join(dir, "ow-demo", "SKILL.md"), `---\n${frontmatter}\n---\n${body}`);
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, "ow-demo", rel)), { recursive: true });
    writeFileSync(join(dir, "ow-demo", rel), text);
  }
  const ocDir = temp("oc-catalog-");
  const ow = {
    id: "ow", dir, relDir: "skills-work", prefix: "ow-", verbPrefix: "/ow-", frontmatter: "agent-skills",
    protocol: { kind: "file", source: "ow-protocol.md", copy: "references/ow-protocol.md", version: 1 },
    bodyTokenBudget: 5000, planned: ["ow-later"], addons: { "ow-tools": ["/ow-demo-transcribe"] },
    privateNames: ["llc-ops"], brandNames: ["Privateco"], requiredSkills: [], notInvocable: [],
  };
  const oc = { id: "oc", dir: ocDir, relDir: "skills", prefix: "oc-", verbPrefix: "/oc-", frontmatter: "oc", protocol: { kind: "orchestrator" }, outputs: {} };
  return { dir, ow, catalogs: [oc, ow] };
}

describe("ow- frontmatter and packaging (gen-skills-catalog)", () => {
  it("passes the scratch skill as built", () => {
    expect(validateCatalog(owTree().ow)).toEqual(["ow-demo"]);
  });

  const rejects = (name, opts, message) => it(name, () => {
    expect(() => validateCatalog(owTree(opts).ow)).toThrow(message);
  });

  rejects("a top-level key the Agent Skills format does not allow", { frontmatter: `${FRONTMATTER}\nversion: 1.0.0` }, /`version` is not an Agent Skills key/);
  rejects("a description whose first 200 characters do not name the id", { frontmatter: FRONTMATTER.replace("ow-demo writes", "This writes").replace("Use for /ow-demo.", `${"x ".repeat(110)}Use ow-demo.`) }, /must name the typeable id/);
  rejects("angle brackets in the description", { frontmatter: FRONTMATTER.replace("from your notes", "from <notes>") }, /angle brackets/);
  rejects("a non-string metadata value", { frontmatter: FRONTMATTER.replace('protocol: "1"', "protocol: 1") }, /metadata\.protocol must be a string/);
  rejects("a protocol version that does not match the catalog", { frontmatter: FRONTMATTER.replace('protocol: "1"', 'protocol: "2"') }, /catalog protocol is version 1/);
  rejects("no protocol pointer in the body", { body: BODY.replace(" If you cannot open it, say so and stop.", "") }, /missing the protocol pointer/);
  rejects("a body over the token budget", { body: BODY + "word ".repeat(5000) }, /over the 5000-token budget/);
  rejects("a script file", { files: { "references/run.sh": "echo hi\n" } }, /only \.md \.txt \.json \.yaml \.yml \.csv/);
  rejects("a hidden file", { files: { ".mcp.json": "{}\n" } }, /not hidden/);
  rejects("a hooks folder", { files: { "hooks/readme.md": "x\n" } }, /carries no hooks\//);
  rejects("network text in a network: none skill", { files: { "references/more.md": "See https://example.com for more.\n" } }, /network text/);
  rejects("a cited reference that does not exist", { body: `${BODY}\nSee \`references/missing.md\`.\n` }, /references `references\/missing\.md` but/);

  it("refuses an executable file", () => {
    const t = owTree({ files: { "references/notes.md": "x\n" } });
    chmodSync(join(t.dir, "ow-demo", "references", "notes.md"), 0o755);
    expect(() => validateCatalog(t.ow)).toThrow(/executable bit set/);
  });

  it("refuses a skill without the catalog prefix", () => {
    const t = owTree();
    cpSync(join(t.dir, "ow-demo"), join(t.dir, "demo"), { recursive: true });
    expect(() => validateCatalog(t.ow)).toThrow(/skills-work\/demo: skill id does not start with the catalog prefix `ow-`/);
  });
});

describe("ow- family, NEXT and edge rules (check-skill-contracts)", () => {
  it("passes the scratch skill as built", () => {
    const t = owTree();
    expect(checkFamily(t.catalogs)).toEqual([]);
    expect(checkVerbs(null, { catalogs: t.catalogs })).toEqual([]);
    expect(checkProtocolCopies(t.catalogs)).toEqual([]);
  });

  const family = (opts) => checkFamily(owTree(opts).catalogs).join("\n");

  it("flags a private skill name, wherever it appears in the skill", () => {
    expect(family({ files: { "examples/handoffs.yaml": 'contract:\n  say: "use llc-ops to draft it"\n' } }))
      .toMatch(/skills-work\/ow-demo\/examples\/handoffs\.yaml:2: names `llc-ops`, a private skill/);
  });

  it("flags a skill from another catalog, as a name or a verb", () => {
    const out = family({ files: { "references/next.md": "Then use oc-app-architect, or run `/oc-discover`.\n" } });
    expect(out).toMatch(/names `oc-app-architect`, a skill outside the ow- family/);
    expect(out).toMatch(/names `oc-discover`, a skill outside the ow- family/);
  });

  it("flags wording that says one skill drives another (contract R1)", () => {
    const out = family({ files: { "references/next.md": "This step invokes the next skill, which chains to the last.\n" } });
    expect(out).toMatch(/names `invokes`, wording the cross-talk contract \(R1\) keeps out/);
    expect(family({ files: { "references/next.md": "The recap is never sent automatically.\n" } })).toBe("");
  });

  it("flags a business name", () => {
    expect(family({ files: { "references/voice.md": "Write like Privateco does.\n" } })).toMatch(/names `Privateco`, a business/);
  });

  it("flags an ow- name that is not a skill, planned skill, add-on or the protocol", () => {
    const out = family({ files: { "references/next.md": "Then say use ow-review on it; ow-tools and ow-later are fine, and so is ow-protocol.md.\n" } });
    expect(out).toMatch(/`ow-review` is not an ow- skill/);
    expect(out).not.toMatch(/ow-tools|ow-later|ow-protocol/);
  });

  it("flags a NEXT block with no missing-skill branch, or one that does not lead with the skill id", () => {
    expect(family({ body: BODY.replace("    IF IT IS NOT AVAILABLE: out.md stands alone.\n", "") })).toMatch(/NEXT block has no "IF IT IS NOT AVAILABLE:" line/);
    expect(family({ body: BODY.replace('NEXT: say "use ow-later on out.md"', "NEXT: run /ow-demo again") })).toMatch(/NEXT must lead with the skill id/);
    expect(family({ body: BODY.replace('"use ow-later on out.md"   (', '"use ow-nothing on out.md"   (') })).toMatch(/NEXT names `ow-nothing`/);
  });

  it("flags an empty absent-case, a pass-through absent-case, and missing edge sections", () => {
    expect(family({ body: BODY.replace("| Ask for notes |", "| — |") })).toMatch(/"If absent" is empty/);
    expect(family({ body: BODY.replace("| Ask for notes |", "| Proceed as if it passed |") })).toMatch(/may never proceed as if the input passed/);
    expect(family({ body: BODY.replace("| out.md stands alone |", "|  |") })).toMatch(/"If not available" is empty/);
    expect(family({ body: BODY.replace("## Hands off to", "## Afterwards") })).toMatch(/no "## Hands off to" section/);
  });

  it("checks ow- verbs in the merged index: undeclared fails, an add-on's verb resolves, and so does a cross-catalog citation", () => {
    const t = owTree({ files: { "references/more.md": "Run `/ow-demo-transcribe`, then `/ow-demo-extra`.\n" } });
    const problems = checkVerbs(null, { catalogs: t.catalogs });
    expect(problems).toEqual(["skills-work/ow-demo/references/more.md:1: `/ow-demo-extra` is not declared by any skill's frontmatter commands"]);
    mkdirSync(join(t.catalogs[0].dir, "oc-host"));
    writeFileSync(join(t.catalogs[0].dir, "oc-host", "SKILL.md"), "---\nname: oc-host\ncommands:\n  - /oc-host\ndescription: >\n  Host.\n---\n\nHand the file to `/ow-demo`, never `/ow-gone`.\n");
    expect(checkVerbs(null, { catalogs: t.catalogs })).toEqual([
      "skills/oc-host/SKILL.md:9: `/ow-gone` is not declared by any skill's frontmatter commands",
      "skills-work/ow-demo/references/more.md:1: `/ow-demo-extra` is not declared by any skill's frontmatter commands",
    ]);
  });

  it("finds a drifted or missing protocol copy, and --write repairs it", () => {
    const t = owTree();
    writeFileSync(join(t.dir, "ow-demo", "references", "ow-protocol.md"), "stale\n");
    expect(checkProtocolCopies(t.catalogs)).toEqual([
      "skills-work/ow-demo/references/ow-protocol.md differs from skills-work/ow-protocol.md (run `node scripts/check-skill-contracts.mjs --write`)",
    ]);
    expect(checkProtocolCopies(t.catalogs, { write: true })).toEqual([]);
    expect(readFileSync(join(t.dir, "ow-demo", "references", "ow-protocol.md"), "utf8")).toBe(PROTOCOL);
  });
});

// ── the oc- output scripts refuse another catalog's tree ─────────────────────

describe("oc- output scripts refuse a tree holding ow- skills", () => {
  const SKILLS_WORK = join(ROOT, "skills-work");
  const run = (cmd, args, env, cwd = ROOT) => spawnSync(cmd, args, { cwd, env: { ...process.env, ...env }, encoding: "utf8" });

  it("make-skills-zip refuses before removing anything", () => {
    const pub = temp("oc-zip-guard-");
    mkdirSync(join(pub, "skills"));
    writeFileSync(join(pub, "opchain-skills.zip"), "keep");
    writeFileSync(join(pub, "skills", "oc-x.zip"), "keep");
    const r = run("bash", [join(ROOT, "scripts", "make-skills-zip.sh")], { OPCHAIN_SKILLS_DIR: SKILLS_WORK, OPCHAIN_PUBLIC_DIR: pub });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/refusing to zip .*ow-start is not in the oc- catalog/);
    expect(readFileSync(join(pub, "opchain-skills.zip"), "utf8")).toBe("keep");
    expect(readFileSync(join(pub, "skills", "oc-x.zip"), "utf8")).toBe("keep");
  });

  it("sync-docs refuses before writing", () => {
    const docs = join(temp("oc-docs-guard-"), "docs");
    const r = run("bash", [join(ROOT, "scripts", "sync-docs.sh")], { OPCHAIN_SKILLS_DIR: SKILLS_WORK, OPCHAIN_DOCS_DIR: docs });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/refusing to publish .*ow-start is not in the oc- catalog/);
    expect(existsSync(docs)).toBe(false);
  });

  it("sync-plugin-skills refuses before deleting the plugin copy", () => {
    // A throwaway root, so a broken guard could only ever delete scratch files.
    const root = temp("oc-plugin-guard-");
    mkdirSync(join(root, "scripts"), { recursive: true });
    cpSync(join(ROOT, "scripts", "sync-plugin-skills.mjs"), join(root, "scripts", "sync-plugin-skills.mjs"));
    mkdirSync(join(root, "plugins", "opchain", "skills", "oc-x"), { recursive: true });
    writeFileSync(join(root, "plugins", "opchain", "skills", "oc-x", "SKILL.md"), "keep");
    cpSync(SKILLS_WORK, join(root, "skills-work"), { recursive: true });
    const r = run(process.execPath, [join(root, "scripts", "sync-plugin-skills.mjs")], { OPCHAIN_SKILLS_DIR: join(root, "skills-work") }, root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/refusing to build plugins\/opchain\/skills from .*ow-start not in the oc- catalog/);
    expect(readFileSync(join(root, "plugins", "opchain", "skills", "oc-x", "SKILL.md"), "utf8")).toBe("keep");
  });

  it("sync-skill-bundles refuses before bundling the oc- protocol into ow- skills", () => {
    const copy = join(temp("oc-bundle-guard-"), "skills-work");
    cpSync(SKILLS_WORK, copy, { recursive: true });
    const r = run(process.execPath, [join(ROOT, "scripts", "sync-skill-bundles.mjs")], { OPCHAIN_SKILLS_DIR: copy });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/refusing to bundle the oc- protocol into .*ow-start not in the oc- catalog/);
    expect(readdirSync(join(copy, "ow-start", "references"))).not.toContain("orchestrator.md");
  });

  it("gen-mcp-catalog refuses before writing the hosted catalog", () => {
    const root = temp("oc-mcp-guard-");
    mkdirSync(join(root, "scripts", "lib"), { recursive: true });
    cpSync(join(ROOT, "scripts", "gen-mcp-catalog.mjs"), join(root, "scripts", "gen-mcp-catalog.mjs"));
    cpSync(join(ROOT, "scripts", "lib", "frontmatter.mjs"), join(root, "scripts", "lib", "frontmatter.mjs"));
    const require = createRequire(import.meta.url);
    symlinkSync(dirname(dirname(require.resolve("js-yaml/package.json"))), join(root, "node_modules"), "dir");
    const r = run(process.execPath, [join(root, "scripts", "gen-mcp-catalog.mjs")], { OPCHAIN_SKILLS_DIR: SKILLS_WORK }, root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/refusing to build the hosted catalog from .*ow-start not in the oc- catalog/);
    expect(existsSync(join(root, "src", "generated", "mcp-catalog.json"))).toBe(false);
  });
});
