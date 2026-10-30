// REL-01: distribution and integrity for the ow- catalog (skills-work/).
// The ow- zips and docs tree refuse to build on a failed catalog check, the
// clean-folder install check sees every file arrive, and the mirror carries
// skills-work/ whole with release tags for the ow-tools pin (SA-001).
import { afterAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkWorkInstall } from "../scripts/check-work-install.mjs";

const ROOT = join(import.meta.dirname, "..");
const SKILLS_WORK = join(ROOT, "skills-work");
const ZIP = join(ROOT, "scripts", "make-work-skills-zip.sh");
const DOCS = join(ROOT, "scripts", "sync-work-docs.sh");
const scratch = [];
afterAll(() => scratch.forEach((d) => rmSync(d, { recursive: true, force: true })));
const temp = (prefix) => { const d = realpathSync(mkdtempSync(join(tmpdir(), prefix))); scratch.push(d); return d; };
const run = (cmd, args, env) => spawnSync(cmd, args, { cwd: ROOT, env: { ...process.env, ...env }, encoding: "utf8" });

// The checkers run in each case (~0.5 s each), several times under load.
const SLOW = { timeout: 60_000 };

/** A copy of skills-work/ with one planted fault, or none. */
function plantedTree(fault) {
  const dir = join(temp("ow-tree-"), "skills-work");
  cpSync(SKILLS_WORK, dir, { recursive: true });
  if (fault === "protocol-copy-drift") {
    writeFileSync(join(dir, "ow-start", "references", "ow-protocol.md"), "# not the protocol\n");
  } else if (fault === "frontmatter") {
    const p = join(dir, "ow-build", "SKILL.md");
    writeFileSync(p, readFileSync(p, "utf8").replace(/^name: ow-build$/m, "name: ow-built"));
  } else if (fault === "executable") {
    writeFileSync(join(dir, "ow-uat", "install.sh"), "#!/bin/sh\necho hi\n", { mode: 0o755 });
  }
  return dir;
}

describe("make-work-skills-zip + sync-work-docs + check-work-install", SLOW, () => {
  it("builds the combined zip, nine per-skill zips, the docs tree and the manifest hash; the clean-folder install check passes", () => {
    const pub = temp("ow-pub-");
    const z = run("bash", [ZIP], { OPCHAIN_PUBLIC_DIR: pub });
    expect(z.status, z.stderr).toBe(0);
    const d = run("bash", [DOCS], { OPCHAIN_WORK_DOCS_DIR: join(pub, "docs", "work") });
    expect(d.status, d.stderr).toBe(0);

    expect(existsSync(join(pub, "opchain-work-skills.zip"))).toBe(true);
    const ids = readdirSync(SKILLS_WORK).filter((n) => existsSync(join(SKILLS_WORK, n, "SKILL.md"))).sort();
    expect(ids.length).toBe(9);
    expect(readdirSync(join(pub, "work")).filter((f) => f.endsWith(".zip")).sort()).toEqual(ids.map((id) => `${id}.zip`).sort());

    const result = checkWorkInstall({ source: SKILLS_WORK, publicDir: pub, docs: join(pub, "docs", "work") });
    expect(result.problems).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.counts).toMatchObject({ skills: 9, perSkillZips: 9 });
    expect(result.counts.files).toBeGreaterThan(100);

    // The oc- outputs are untouched: no ow- skill in the oc- zip's namespace.
    expect(existsSync(join(pub, "opchain-skills.zip"))).toBe(false);
    expect(existsSync(join(pub, "skills"))).toBe(false);

    // SA-001: the manifest's hash, published apart from the mirror, matches the tree.
    const line = readFileSync(join(pub, "work", "ow-tools-security-manifest.sha256"), "utf8");
    const manifest = readFileSync(join(ROOT, "plugins", "ow-tools", "SECURITY-MANIFEST.md"));
    expect(line).toBe(`${createHash("sha256").update(manifest).digest("hex")}  SECURITY-MANIFEST.md\n`);
  });

  it("the install check reports a missing or changed file", () => {
    const pub = temp("ow-pub-");
    expect(run("bash", [ZIP], { OPCHAIN_PUBLIC_DIR: pub }).status).toBe(0);
    expect(run("bash", [DOCS], { OPCHAIN_WORK_DOCS_DIR: join(pub, "docs", "work") }).status).toBe(0);
    // Drift the docs tree after the build, and drop one per-skill zip.
    writeFileSync(join(pub, "docs", "work", "ow-care", "SKILL.md"), "stale\n");
    rmSync(join(pub, "work", "ow-draft.zip"));
    const r = checkWorkInstall({ source: SKILLS_WORK, publicDir: pub, docs: join(pub, "docs", "work") });
    expect(r.ok).toBe(false);
    expect(r.problems).toEqual(expect.arrayContaining([
      "docs/work/ow-care/SKILL.md: missing or differs",
      expect.stringMatching(/ow-draft\.zip: missing$/),
    ]));
    // The CLI form exits 1 and lists them.
    const cli = run(process.execPath, [join(ROOT, "scripts", "check-work-install.mjs"), "--public", pub, "--docs", join(pub, "docs", "work")]);
    expect(cli.status).toBe(1);
    expect(cli.stderr).toMatch(/clean-folder install failed/);
  });

  // Audit G20: a zip must never be built from a tree the catalog checks reject.
  for (const fault of ["protocol-copy-drift", "frontmatter", "executable"]) {
    it(`the zip and docs steps refuse a planted catalog failure (${fault}) before removing or writing anything`, () => {
      const tree = plantedTree(fault);
      const pub = temp("ow-pub-");
      mkdirSync(join(pub, "work"));
      writeFileSync(join(pub, "opchain-work-skills.zip"), "keep");
      writeFileSync(join(pub, "work", "ow-start.zip"), "keep");
      const z = run("bash", [ZIP], { OPCHAIN_WORK_SKILLS_DIR: tree, OPCHAIN_PUBLIC_DIR: pub });
      expect(z.status).toBe(1);
      expect(z.stderr).toMatch(/refusing to zip .*(gen-skills-catalog|check-skill-contracts) failed for the ow- catalog \(nothing written\)/);
      expect(readFileSync(join(pub, "opchain-work-skills.zip"), "utf8")).toBe("keep");
      expect(readFileSync(join(pub, "work", "ow-start.zip"), "utf8")).toBe("keep");

      const docs = join(temp("ow-docs-"), "docs", "work");
      const d = run("bash", [DOCS], { OPCHAIN_WORK_SKILLS_DIR: tree, OPCHAIN_WORK_DOCS_DIR: docs });
      expect(d.status).toBe(1);
      expect(d.stderr).toMatch(/refusing to publish .*(gen-skills-catalog|check-skill-contracts) failed for the ow- catalog \(nothing written\)/);
      expect(existsSync(docs)).toBe(false);
    });
  }

  it("both scripts refuse a tree holding oc- skills, before the catalog checks", () => {
    const pub = temp("ow-pub-");
    const z = run("bash", [ZIP], { OPCHAIN_WORK_SKILLS_DIR: join(ROOT, "skills"), OPCHAIN_PUBLIC_DIR: pub });
    expect(z.status).toBe(1);
    expect(z.stderr).toMatch(/refusing to zip .*oc-[a-z-]+ is not in the ow- catalog/);
    expect(readdirSync(pub)).toEqual([]);
    const docs = join(temp("ow-docs-"), "docs", "work");
    const d = run("bash", [DOCS], { OPCHAIN_WORK_SKILLS_DIR: join(ROOT, "skills"), OPCHAIN_WORK_DOCS_DIR: docs });
    expect(d.status).toBe(1);
    expect(d.stderr).toMatch(/refusing to publish .*oc-[a-z-]+ is not in the ow- catalog/);
    expect(existsSync(docs)).toBe(false);
  });

  it("the build runs them: sync-docs chains sync-work-docs, make-zip chains make-work-skills-zip, build-site preserves the zips and runs the install check", () => {
    // No new npm script: the root package.json is bundled into five oc- skills'
    // runtime, so the ow- steps hang off the existing prebuild scripts.
    const { scripts } = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    expect(Object.keys(scripts).filter((k) => /work/.test(k))).toEqual([]);
    expect(readFileSync(join(ROOT, "scripts", "sync-docs.sh"), "utf8")).toContain('OPCHAIN_WORK_DOCS_DIR="${OPCHAIN_WORK_DOCS_DIR:-$DEST/work}" bash "$ROOT/scripts/sync-work-docs.sh"');
    expect(readFileSync(join(ROOT, "scripts", "make-skills-zip.sh"), "utf8")).toContain('OPCHAIN_PUBLIC_DIR="$PUBLIC" bash "$ROOT/scripts/make-work-skills-zip.sh"');
    const site = readFileSync(join(ROOT, "scripts", "build-site.sh"), "utf8");
    expect(site).toMatch(/^PRESERVE=\(docs opchain-skills\.zip opchain-work-skills\.zip /m);
    expect(site).toContain('for z in "${PUBLIC}"/work/*.zip "${PUBLIC}"/work/*.sha256; do');
    expect(site).toContain('node "${ROOT}/scripts/check-work-install.mjs"');
    const steps = scripts.prebuild.split(" && ");
    expect(steps.indexOf("npm run sync-docs")).toBeLessThan(steps.indexOf("npm run make-zip"));
    expect(steps.indexOf("npm run make-zip")).toBeLessThan(steps.indexOf("npm run build-site"));
  });

  it("the oc- zip script also writes the ow- zips into the same public dir, so one make-zip serves both catalogs", () => {
    const pub = temp("oc-ow-pub-");
    const r = run("bash", [join(ROOT, "scripts", "make-skills-zip.sh")], { OPCHAIN_PUBLIC_DIR: pub });
    expect(r.status, r.stderr).toBe(0);
    expect(existsSync(join(pub, "opchain-skills.zip"))).toBe(true);
    expect(existsSync(join(pub, "opchain-work-skills.zip"))).toBe(true);
    expect(existsSync(join(pub, "skills", "oc-git-ops.zip"))).toBe(true);
    expect(existsSync(join(pub, "work", "ow-start.zip"))).toBe(true);
    const docs = join(temp("oc-ow-docs-"), "docs");
    const d = run("bash", [join(ROOT, "scripts", "sync-docs.sh")], { OPCHAIN_DOCS_DIR: docs });
    expect(d.status, d.stderr).toBe(0);
    expect(existsSync(join(docs, "oc-git-ops", "SKILL.md"))).toBe(true);
    expect(existsSync(join(docs, "work", "ow-start", "SKILL.md"))).toBe(true);
    expect(checkWorkInstall({ source: SKILLS_WORK, publicDir: pub, docs: join(docs, "work") }).ok).toBe(true);
  });
});

describe("the public mirror carries the ow- catalog (REL-01) and release tags (SA-001)", () => {
  const wf = readFileSync(join(ROOT, ".github", "workflows", "mirror-public.yml"), "utf8");

  it("triggers on skills-work/ and on v* tags, validates the protocol and README, and stages the folder whole", () => {
    expect(wf).toMatch(/^\s+- 'skills-work\/\*\*'$/m);
    expect(wf).toMatch(/^\s+tags: \['v\*'\]$/m);
    expect(wf).toContain("skills-work/ow-protocol.md skills-work/README.md");
    expect(wf).toContain('cp -R skills-work "$STAGE/skills-work"');
  });

  it("pushes a release tag as a tag of the same name, and main only on a branch push", () => {
    expect(wf).toContain('SOURCE_REF_TYPE: ${{ github.ref_type }}');
    expect(wf).toMatch(/if \[\[ "\$SOURCE_REF_TYPE" == "tag" \]\]; then\n\s+#[^\n]*\n(\s+#[^\n]*\n)*\s+git tag -a "\$SOURCE_REF_NAME"/);
    expect(wf).toContain('git push --force origin "refs/tags/${SOURCE_REF_NAME}"');
    expect(wf).toMatch(/else\n\s+git push --force origin main/);
  });

  it("the public README installs the ow- skills from the mirror or the zip and names the verify steps", () => {
    const readme = readFileSync(join(ROOT, "mirror", "README.md"), "utf8");
    expect(readme).toContain("https://opchain.dev/opchain-work-skills.zip");
    expect(readme).toMatch(/skills-work\/ow-start .*\.claude\/skills\//);
    expect(readme).toContain("references/ow-protocol.md");
    expect(readme).toContain("ow-tools-security-manifest.sha256");
  });
});
