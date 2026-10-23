import { afterAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROOT } from "../scripts/lib/catalogs.mjs";
import { makeWorkSkillsZip } from "../scripts/make-work-skills-zip.mjs";
import { checkWorkRelease, renderWorkRelease, sha256, workReleaseManifest } from "../scripts/lib/work-release.mjs";
import { scoreTriggerResults, triggerQueries } from "../scripts/ow-trigger-queries.mjs";
import { checkWorkSurfaces } from "../scripts/check-release-surfaces.mjs";
import { checkOwToolsPin, prepareOwToolsPin } from "../scripts/prepare-ow-tools-pin.mjs";
import { checkReleaseTag } from "../scripts/check-release-tag.mjs";

const scratch = [];
const temp = () => { const path = mkdtempSync(join(tmpdir(), "ow-distribution-test-")); scratch.push(path); return path; };
afterAll(() => scratch.forEach((path) => rmSync(path, { recursive: true, force: true })));

describe("ow- distribution", { timeout: 30_000 }, () => {
  it("installs a complete text-only skill from a clean archive and preserves site/oc files", () => {
    const out = temp();
    mkdirSync(join(out, "work"));
    writeFileSync(join(out, "work", "index.html"), "site");
    writeFileSync(join(out, "work", "ow-obsolete.zip"), "old");
    writeFileSync(join(out, "opchain-skills.zip"), "oc");
    const manifest = makeWorkSkillsZip({ env: { OPCHAIN_PUBLIC_DIR: out } });
    expect(manifest.skills.length).toBeGreaterThanOrEqual(7);
    const archive = join(out, "work", "ow-start.zip");
    const entry = manifest.skills.find((skill) => skill.id === "ow-start");
    expect(entry.sha256).toBe(createHash("sha256").update(readFileSync(archive)).digest("hex"));
    const workspace = temp();
    const destination = join(workspace, ".claude", "skills");
    mkdirSync(destination, { recursive: true });
    const unpack = spawnSync("unzip", ["-q", archive, "-d", destination], { encoding: "utf8" });
    expect(unpack.status, unpack.stderr).toBe(0);
    for (const file of ["SKILL.md", "references/ow-protocol.md", "LICENSE", "NOTICE"]) expect(existsSync(join(destination, "ow-start", file))).toBe(true);
    expect(readFileSync(join(destination, "ow-start", "references/ow-protocol.md"))).toEqual(readFileSync(join(ROOT, "skills-work/ow-protocol.md")));
    expect(readFileSync(join(out, "work/index.html"), "utf8")).toBe("site");
    expect(readFileSync(join(out, "opchain-skills.zip"), "utf8")).toBe("oc");
    expect(existsSync(join(out, "work/ow-obsolete.zip"))).toBe(false);
    expect(JSON.parse(readFileSync(join(out, "work/manifest.json"), "utf8"))).toEqual(manifest);
    expect(makeWorkSkillsZip({ env: { OPCHAIN_PUBLIC_DIR: out } })).toEqual(manifest);
  });

  it("refuses a planted catalog failure before replacing any output", () => {
    const source = temp();
    cpSync(join(ROOT, "skills-work"), source, { recursive: true });
    const file = join(source, "ow-start/SKILL.md");
    writeFileSync(file, readFileSync(file, "utf8").replace('protocol: "1"', 'protocol: "99"'));
    const out = temp();
    writeFileSync(join(out, "opchain-work-skills.zip"), "keep-existing-download");
    expect(() => makeWorkSkillsZip({ env: { OPCHAIN_WORK_SKILLS_DIR: source, OPCHAIN_PUBLIC_DIR: out } })).toThrow(/protocol/);
    expect(readFileSync(join(out, "opchain-work-skills.zip"), "utf8")).toBe("keep-existing-download");
    expect(existsSync(join(out, "work"))).toBe(false);
  });

  it("rejects symlinked output roots, work directories and archive paths into source before writing", () => {
    const source = temp();
    cpSync(join(ROOT, "skills-work"), source, { recursive: true });
    const before = renderWorkRelease(ROOT, "2.1.0");
    for (const kind of ["root", "work", "archive"]) {
      const folder = temp();
      const out = join(folder, "public");
      if (kind === "root") symlinkSync(join(source, "ow-start"), out);
      else {
        mkdirSync(out);
        if (kind === "work") symlinkSync(join(source, "ow-start"), join(out, "work"));
        else {
          mkdirSync(join(out, "work"));
          symlinkSync(join(source, "ow-start/SKILL.md"), join(out, "work/ow-start.zip"));
        }
      }
      expect(() => makeWorkSkillsZip({ env: { OPCHAIN_WORK_SKILLS_DIR: source, OPCHAIN_PUBLIC_DIR: out } })).toThrow(/overlap/);
      expect(existsSync(join(source, "ow-start/work"))).toBe(false);
      expect(readFileSync(join(source, "ow-start/SKILL.md"))).toEqual(readFileSync(join(ROOT, "skills-work/ow-start/SKILL.md")));
    }
    expect(renderWorkRelease(ROOT, "2.1.0")).toBe(before);
  });

  it("rejects linked license and bundle README sources without reading external bytes", () => {
    const outside = join(temp(), "outside.txt");
    writeFileSync(outside, "external material");
    const root = temp();
    for (const file of ["catalogs.json", "NOTICE"]) cpSync(join(ROOT, file), join(root, file));
    symlinkSync(outside, join(root, "LICENSE"));
    const out = temp();
    const env = { OPCHAIN_SKILLS_DIR: join(ROOT, "skills"), OPCHAIN_WORK_SKILLS_DIR: join(ROOT, "skills-work"), OPCHAIN_PUBLIC_DIR: out };
    expect(() => makeWorkSkillsZip({ root, env })).toThrow(/regular source file/);
    expect(existsSync(join(out, "work"))).toBe(false);
    const source = temp();
    cpSync(join(ROOT, "skills-work"), source, { recursive: true });
    rmSync(join(source, "README.md"));
    symlinkSync(outside, join(source, "README.md"));
    expect(() => makeWorkSkillsZip({ env: { ...env, OPCHAIN_WORK_SKILLS_DIR: source } })).toThrow(/regular source file/);
    expect(existsSync(join(out, "work"))).toBe(false);
    expect(readFileSync(outside, "utf8")).toBe("external material");
  });

  it("mirrors the ow- source and preserves work downloads through the site build", () => {
    const workflow = readFileSync(join(ROOT, ".github/workflows/mirror-public.yml"), "utf8");
    expect(workflow).toContain("- 'skills-work/**'");
    expect(workflow).toContain('cp -R skills-work "$STAGE/skills-work"');
    const build = readFileSync(join(ROOT, "scripts/build-site.sh"), "utf8");
    expect(build).toContain("opchain-work-skills.zip");
    expect(build).toContain("for catalog in skills work");
    expect(build).toContain("work/manifest.json");
  });

  it("installs copied mirror folders with the documented clean-folder commands", () => {
    const workspace = temp();
    cpSync(join(ROOT, "skills-work"), join(workspace, "opchain-source/skills-work"), { recursive: true });
    const result = spawnSync("bash", ["-c", "mkdir -p .claude/skills\nfor ow_skill in opchain-source/skills-work/ow-*/SKILL.md; do\n  cp -R \"${ow_skill%/SKILL.md}\" .claude/skills/\ndone\ntest -f .claude/skills/ow-start/SKILL.md\ncmp opchain-source/skills-work/ow-protocol.md .claude/skills/ow-start/references/ow-protocol.md"], { cwd: workspace, encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
    expect(existsSync(join(workspace, ".claude/skills/ow-draft/SKILL.md"))).toBe(true);
  });
});

function releaseFixture() {
  const pin = pinFixture();
  prepareOwToolsPin(pin.args);
  const root = pin.root;
  mkdirSync(join(root, "skills-work/ow-demo/references"), { recursive: true });
  writeFileSync(join(root, "skills-work/ow-protocol.md"), "# Protocol v1\n");
  writeFileSync(join(root, "skills-work/ow-demo/SKILL.md"), '---\nname: ow-demo\nmetadata:\n  version: "1.2.3"\n---\n# Demo\n');
  writeFileSync(join(root, "skills-work/ow-demo/references/notes.md"), "Notes\n");
  const manifest = renderWorkRelease(root, "2.1.0");
  const seal = { workCatalogSha256: sha256(manifest) };
  const git = (args, cwd, options) => {
    if (args[0] === "ls-tree") return args.at(-1) === "plugins/ow-tools" ? pin.git(args, cwd, options) : "skills-work/ow-demo/SKILL.md\nskills-work/ow-demo/references/notes.md\nskills-work/ow-protocol.md";
    if (args[0] === "show") {
      const file = args[1].slice(args[1].indexOf(":") + 1);
      if (file === "work-release.json") return manifest;
      try { return readFileSync(join(root, file), options?.binary ? undefined : "utf8"); } catch { return null; }
    }
    return null;
  };
  return { root, manifest, seal, git, args: { cwd: root, version: "2.1.0", seal, git } };
}

describe("per-skill release sealing", () => {
  it("preserves per-skill versions and verifies the exact tagged tree", () => {
    const fixture = releaseFixture();
    expect(workReleaseManifest(fixture.root, "2.1.0").skills["ow-demo"].version).toBe("1.2.3");
    expect(checkWorkRelease({ ...fixture.args, ref: "v2.1.0" })).toBeNull();
  });
  it("rejects post-tag source changes even with the same skill version", () => {
    const fixture = releaseFixture();
    writeFileSync(join(fixture.root, "skills-work/ow-demo/references/notes.md"), "Changed\n");
    expect(checkWorkRelease(fixture.args)).toMatch(/differs from the current/);
  });
  it("rejects an unsealed extra tagged file or a tag's substituted content", () => {
    const fixture = releaseFixture();
    const extra = (args, ...rest) => args[0] === "ls-tree" && args.at(-1) === "skills-work" ? `${fixture.git(args, ...rest)}\nskills-work/ow-demo/hidden.md` : fixture.git(args, ...rest);
    expect(checkWorkRelease({ ...fixture.args, git: extra })).toMatch(/different ow- file inventory/);
    const tampered = (args, ...rest) => args[0] === "show" && args[1].endsWith("references/notes.md") ? "Tampered\n" : fixture.git(args, ...rest);
    expect(checkWorkRelease({ ...fixture.args, git: tampered })).toMatch(/differs from its sealed content/);
  });
  it("rejects a tag's substituted or missing plugin record and marketplace overlays", () => {
    const fixture = releaseFixture();
    for (const content of [null, "{}\n"]) {
      const tampered = (args, ...rest) => args[0] === "show" && args[1].endsWith(":ow-tools-release.json") ? content : fixture.git(args, ...rest);
      expect(checkWorkRelease({ ...fixture.args, ref: "v2.1.0", git: tampered })).toMatch(/ow-tools-release.json differs from its sealed content/);
    }
    const marketplace = JSON.parse(readFileSync(join(fixture.root, "plugins/ow-tools/.claude-plugin/marketplace.json"), "utf8"));
    marketplace.plugins[0].hooks = { SessionStart: [{ hooks: [{ type: "command", command: "unexpected" }] }] };
    const tampered = (args, ...rest) => args[0] === "show" && args[1].endsWith(":plugins/ow-tools/.claude-plugin/marketplace.json") ? JSON.stringify(marketplace) : fixture.git(args, ...rest);
    expect(checkWorkRelease({ ...fixture.args, ref: "v2.1.0", git: tampered })).toMatch(/marketplace differs from the sealed descriptor/);
  });
  it("rejects current runtime drift after preparation even with an unchanged plugin version", () => {
    const fixture = releaseFixture();
    writeFileSync(join(fixture.root, "plugins/ow-tools/lib/cli.mjs"), "changed\n");
    expect(checkWorkRelease(fixture.args)).toMatch(/current ow-tools runtime differs/);
  });
  it("rejects tagged runtime additions, removals, binary changes and forbidden modes", () => {
    const fixture = releaseFixture();
    const runtimeTree = fixture.git(["ls-tree", "-r", "-z", "v2.1.0", "--", "plugins/ow-tools"]);
    const row = runtimeTree.split("\0").find((line) => line.endsWith("/lib/cli.mjs"));
    for (const tree of [
      `${runtimeTree}100644 blob ${"c".repeat(40)}\tplugins/ow-tools/extra.mjs\0`,
      runtimeTree.replace(`${row}\0`, ""),
    ]) {
      const tampered = (args, ...rest) => args[0] === "ls-tree" && args.at(-1) === "plugins/ow-tools" ? tree : args[0] === "show" && args[1].endsWith("/extra.mjs") ? Buffer.from("extra") : fixture.git(args, ...rest);
      expect(checkWorkRelease({ ...fixture.args, ref: "v2.1.0", git: tampered })).toMatch(/runtime file inventory differs/);
    }
    for (const mode of ["100755", "120000", "160000"]) {
      const tree = runtimeTree.replace(row, row.replace("100644 blob", `${mode} ${mode === "160000" ? "commit" : "blob"}`));
      const tampered = (args, ...rest) => args[0] === "ls-tree" && args.at(-1) === "plugins/ow-tools" ? tree : fixture.git(args, ...rest);
      expect(checkWorkRelease({ ...fixture.args, ref: "v2.1.0", git: tampered })).toMatch(/runtime (differs|Git mode is forbidden)/);
    }
    const binary = (args, ...rest) => args[0] === "show" && args[1].endsWith("/fixture.bin") ? Buffer.from([0, 0xfe, 0x80, 10]) : fixture.git(args, ...rest);
    expect(checkWorkRelease({ ...fixture.args, ref: "v2.1.0", git: binary })).toMatch(/runtime differs.*fixture.bin/);
  });
  it("preserves binary bytes through the real release gate Git adapter", () => {
    const fixture = releaseFixture();
    const root = fixture.root;
    mkdirSync(join(root, "skills/oc-demo"), { recursive: true });
    mkdirSync(join(root, ".github/workflows"), { recursive: true });
    writeFileSync(join(root, "skills/oc-demo/SKILL.md"), "---\nversion: 2.1.0\n---\n");
    writeFileSync(join(root, ".github/workflows/publish-mcp-registry.yml"), "fixture\n");
    writeFileSync(join(root, "server.json"), "{}\n");
    writeFileSync(join(root, "work-release.json"), fixture.manifest);
    writeFileSync(join(root, "release-seal.json"), JSON.stringify({ schemaVersion: 1, generation: 1, catalogVersion: "2.1.0", publisherWorkflowSha256: sha256("fixture\n"), serverJsonSha256: sha256("{}\n"), ...fixture.seal }));
    for (const args of [["init", "-q"], ["add", "-A"], ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "-c", "commit.gpgsign=false", "commit", "-qm", "runtime fixture"]]) {
      const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
      expect(result.status, result.stderr).toBe(0);
    }
    // A missing tag is expected: the entire sealed HEAD, including binary blobs,
    // must pass first before the release gate can request that tag.
    expect(checkReleaseTag({ cwd: root, skillsDir: join(root, "skills"), fetch: false, verifyRemote: false }).reason).toBe("missing-tag");
  });
  it("leaves old releases without an ow- seal compatible", () => {
    expect(checkWorkRelease({ version: "2.0.4", seal: {} })).toBeNull();
    expect(checkWorkRelease({ version: "2.1.0", seal: {} })).toMatch(/must bind the ow- catalog/);
  });
});

describe("ow- trigger result harness", () => {
  it("covers both trigger outcomes for every built skill and grades complete synthetic answers", () => {
    const cases = triggerQueries();
    expect(cases.length).toBeGreaterThanOrEqual(28);
    const run = { model: "harness-test", source: "synthetic", results: cases.map((row) => ({ id: row.id, trigger: row.shouldTrigger })) };
    expect(scoreTriggerResults(cases, run)).toMatchObject({ ok: true, source: "synthetic" });
    run.results[0].trigger = !run.results[0].trigger;
    expect(scoreTriggerResults(cases, run).ok).toBe(false);
  });
  it("rejects missing, duplicate and unknown capture rows", () => {
    const cases = triggerQueries();
    const result = scoreTriggerResults(cases, { model: "harness-test", source: "synthetic", results: [{ id: cases[0].id, trigger: true }, { id: cases[0].id, trigger: true }, { id: "unknown", trigger: true }] });
    expect(result.errors.join("\n")).toMatch(/duplicate/);
    expect(result.errors.join("\n")).toMatch(/unknown/);
    expect(result.errors.join("\n")).toMatch(/missing/);
  });
});

function pinFixture() {
  const root = temp();
  const commit = "b".repeat(40);
  const plugin = "plugins/ow-tools";
  const files = {
    ".claude-plugin/plugin.json": JSON.stringify({ version: "1.3.1" }),
    ".claude-plugin/marketplace.json": JSON.stringify({ name: "opchain-work-tools", owner: { name: "Fixture" }, metadata: { version: "1.3.1" }, plugins: [{ name: "ow-tools", version: "1.3.1", source: { ref: "main" } }] }),
    "lib/cli.mjs": "console.log('fixture');\n",
    "fixture.bin": Buffer.from([0, 0xff, 0x80, 10]),
    "README.md": "Fixture\n",
  };
  const security = `# ow-tools 1.3.1 — security manifest\n\n## Files\n\n| File | SHA-256 |\n|---|---|\n${Object.entries(files).map(([file, content]) => `| \`${file}\` | \`${sha256(content)}\` |`).join("\n")}\n`;
  files["SECURITY-MANIFEST.md"] = security;
  for (const [file, content] of Object.entries(files)) {
    const target = join(root, plugin, file);
    mkdirSync(join(target, ".."), { recursive: true });
    writeFileSync(target, content);
  }
  const git = (args, _cwd, { binary = false } = {}) => {
    if (args[0] === "remote") return "https://github.com/asfbay-bit/opchain-skills.git";
    if (args[0] === "rev-parse") return commit;
    if (args[0] === "ls-remote") return `${commit}\trefs/tags/ow-tools-v1.3.1`;
    if (args[0] === "ls-tree") return Object.keys(files).sort().map((path) => `100644 blob ${"c".repeat(40)}\t${plugin}/${path}\0`).join("");
    if (args[0] === "show") {
      const content = files[args[1].split(`${plugin}/`)[1]];
      return binary ? Buffer.from(content) : content;
    }
    throw new Error(`unexpected git operation ${args[0]}`);
  };
  return { root, commit, git, security, args: { root, commit, git, mirror: temp() } };
}

describe("durable ow-tools pin preparation", () => {
  it("records the actual installed manifest hash outside the plugin and pins both tag and commit", () => {
    const fixture = pinFixture();
    const record = prepareOwToolsPin(fixture.args);
    expect(record).toMatchObject({ version: "1.3.1", source: { ref: "ow-tools-v1.3.1", sha: fixture.commit }, securityManifestSha256: sha256(fixture.security) });
    expect(checkOwToolsPin(fixture.root)).toBeNull();
    // Updating the current pointer does not change the pinned snapshot's hash.
    expect(prepareOwToolsPin(fixture.args)).toEqual(record);
  });
  it("rejects a missing remote tag and content drift before writing a pin", () => {
    const fixture = pinFixture();
    const missing = (args, ...rest) => args[0] === "ls-remote" ? "" : fixture.git(args, ...rest);
    expect(() => prepareOwToolsPin({ ...fixture.args, git: missing })).toThrow(/public release tag is missing/);
    expect(existsSync(join(fixture.root, "ow-tools-release.json"))).toBe(false);
    writeFileSync(join(fixture.root, "plugins/ow-tools/lib/cli.mjs"), "changed\n");
    expect(() => prepareOwToolsPin(fixture.args)).toThrow(/differs from reviewed/);
    expect(existsSync(join(fixture.root, "ow-tools-release.json"))).toBe(false);
  });
  it("refuses changed, added, removed, executable or symlinked runtime paths after preparation", () => {
    const mutations = [
      (dir) => writeFileSync(join(dir, "lib/cli.mjs"), "changed\n"),
      (dir) => writeFileSync(join(dir, "extra.mjs"), "added\n"),
      (dir) => rmSync(join(dir, "lib/cli.mjs")),
      (dir) => chmodSync(join(dir, "lib/cli.mjs"), 0o755),
      (dir) => { rmSync(join(dir, "lib/cli.mjs")); symlinkSync("../README.md", join(dir, "lib/cli.mjs")); },
      (dir) => { rmSync(join(dir, "lib"), { recursive: true }); symlinkSync(temp(), join(dir, "lib")); },
    ];
    for (const mutate of mutations) {
      const fixture = pinFixture();
      prepareOwToolsPin(fixture.args);
      mutate(join(fixture.root, "plugins/ow-tools"));
      expect(checkOwToolsPin(fixture.root)).toMatch(/runtime (differs|file inventory differs|symlink is forbidden)/);
    }
  });
  it("refuses missing or malformed recorded runtime inventories", () => {
    const fixture = pinFixture();
    const record = prepareOwToolsPin(fixture.args);
    for (const runtimeFiles of [undefined, {}, { ".claude-plugin/plugin.json": { mode: "120000", sha256: "a".repeat(64) } }]) {
      writeFileSync(join(fixture.root, "ow-tools-release.json"), JSON.stringify({ ...record, runtimeFiles }));
      expect(checkOwToolsPin(fixture.root)).toMatch(/(no complete runtime inventory|invalid ow-tools runtime inventory entry)/);
    }
  });
  it("refuses marketplace runtime overlays even when the source pin is unchanged", () => {
    const fixture = pinFixture();
    prepareOwToolsPin(fixture.args);
    const file = join(fixture.root, "plugins/ow-tools/.claude-plugin/marketplace.json");
    const marketplace = JSON.parse(readFileSync(file, "utf8"));
    for (const key of ["hooks", "commands", "agents", "skills", "dependencies", "strict"]) {
      const changed = structuredClone(marketplace);
      changed.plugins[0][key] = key === "strict" ? false : {};
      writeFileSync(file, JSON.stringify(changed));
      expect(checkOwToolsPin(fixture.root)).toMatch(/must not overlay/);
      expect(() => prepareOwToolsPin(fixture.args)).toThrow(/must not overlay/);
    }
  });

  it("refuses a marketplace with no named owner", () => {
    const fixture = pinFixture();
    const file = join(fixture.root, "plugins/ow-tools/.claude-plugin/marketplace.json");
    const marketplace = JSON.parse(readFileSync(file, "utf8"));
    delete marketplace.owner;
    writeFileSync(file, JSON.stringify(marketplace));
    expect(() => prepareOwToolsPin(fixture.args)).toThrow(/named owner/);
  });

  it("rejects an incorrect security table and an unpinned release record", () => {
    const fixture = pinFixture();
    const broken = (args, ...rest) => args[0] === "show" && args[1].endsWith("SECURITY-MANIFEST.md") ? fixture.security.replace(sha256("Fixture\n"), "0".repeat(64)) : fixture.git(args, ...rest);
    expect(() => prepareOwToolsPin({ ...fixture.args, git: broken })).toThrow(/manifest digest mismatch/);
    expect(checkOwToolsPin(fixture.root)).toMatch(/missing/);
    const record = prepareOwToolsPin(fixture.args);
    record.source.ref = "main";
    writeFileSync(join(fixture.root, "ow-tools-release.json"), JSON.stringify(record));
    expect(checkOwToolsPin(fixture.root)).toMatch(/not pinned/);
  });
});

describe("ow- live-release surfaces", () => {
  it("requires the release cut but permits deferred planned skills once built pages and pins are present", () => {
    const fixture = pinFixture();
    prepareOwToolsPin(fixture.args);
    const files = {
      "catalogs.json": JSON.stringify({ catalogs: [{ id: "ow", outputs: { site: "site/src/pages/work" }, planned: ["ow-care", "ow-vendor-eval", "ow-controls", "ow-currency"] }] }),
      "site/src/content.config.ts": "work: glob({base:'../skills-work'})",
      "site/src/lib/work.ts": "export const getWorkSkills = () => getCollection('work');",
      "site/src/pages/work/[id].astro": "getStaticPaths = () => getWorkSkills();",
      "site/src/pages/work/index.astro": "getWorkSkills()",
      "site/src/pages/work/install.astro": "/opchain-work-skills.zip",
      "skills-work/ow-demo/SKILL.md": "# ow-demo",
    };
    for (const [file, content] of Object.entries(files)) {
      mkdirSync(join(fixture.root, file, ".."), { recursive: true });
      writeFileSync(join(fixture.root, file), content);
    }
    expect(checkWorkSurfaces({ root: fixture.root, releaseVersion: "2.0.4" }).errors).toEqual([expect.stringMatching(/before the 2.1 release/)]);
    expect(checkWorkSurfaces({ root: fixture.root, releaseVersion: "2.1.0" }).errors).toEqual([]);
    rmSync(join(fixture.root, "ow-tools-release.json"));
    expect(checkWorkSurfaces({ root: fixture.root, releaseVersion: "2.1.0" }).errors.join("\n")).toMatch(/pin a durable/);
  });
});
