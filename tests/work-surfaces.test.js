// /work — opchain.work, the ow- planning family's site section (release 2.1,
// WEB-02, audit item 18). Three guards:
//   1. every built ow- skill has intro copy and (once built) a page, and every
//      intro-copy key has a skill folder, so the section and the catalog move
//      together;
//   2. no ow- id leaks into an oc- output, and the site never sums the two
//      catalogs' counts;
//   3. nothing under /work names the business or the private skill the ow-
//      catalog forbids (catalogs.json brandNames / privateNames), and no
//      currency amount: the ow- designs open with a business's promises, and
//      the site describes behaviour, never quotes a price.
// The dist half runs when site/dist/work exists (CI builds the site after
// Vitest, so it is a local and post-build guard; the source half always runs).
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { loadCatalogs, listSkillIds } from "../scripts/lib/catalogs.mjs";
import { checkWorkSurfaces } from "../scripts/check-release-surfaces.mjs";

const ROOT = join(import.meta.dirname, "..");
const ow = loadCatalogs({ env: {} }).find((c) => c.id === "ow");
const skillIds = listSkillIds(ow.dir);
const PAGES = join(ROOT, "site/src/pages/work");
const DIST = join(ROOT, "site/dist/work");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** Keys of the WORK_SKILLS map in site/src/data/work.ts, read as text (no TS loader in Vitest here). */
function introKeys() {
  const text = readFileSync(join(ROOT, "site/src/data/work.ts"), "utf8");
  const block = text.match(/export const WORK_SKILLS[^{]*\{([\s\S]*?)\n\};/);
  expect(block, "WORK_SKILLS map not found in site/src/data/work.ts").toBeTruthy();
  return [...block[1].matchAll(/^\s{2}"(ow-[a-z-]+)":\s*\{/gm)].map((m) => m[1]);
}

describe("/work and the ow- catalog move together", () => {
  it("every built ow- skill has intro copy, and every key has a skill folder", () => {
    expect(introKeys().sort()).toEqual(skillIds);
  });

  it("every intro-copy key names a stage the rail knows", () => {
    const text = readFileSync(join(ROOT, "site/src/data/work.ts"), "utf8");
    const stages = [...text.matchAll(/key:\s*"([a-z-]+)"/g)].map((m) => m[1]);
    const used = [...text.matchAll(/stage:\s*"([a-z-]+)"/g)].map((m) => m[1]);
    for (const u of used) expect(stages, `stage ${u} is not on the rail`).toContain(u);
  });

  it("catalogs.json names the section as the ow- catalog's one output", () => {
    expect(ow.outputs.site).toBe("site/src/pages/work");
    expect(existsSync(join(ROOT, ow.outputs.site, "index.astro"))).toBe(true);
    expect(existsSync(join(ROOT, ow.outputs.site, "[id].astro"))).toBe(true);
  });

  it("no planned ow- skill has a page or a mention under /work", () => {
    const report = checkWorkSurfaces({ root: ROOT });
    expect(report.length).toBeGreaterThanOrEqual(2);
    expect(report.filter((r) => !r.pass).map((r) => `${r.label}: ${r.detail}`)).toEqual([]);
  });

  it.skipIf(!existsSync(DIST))("the built site has one page per ow- skill, and no extra skill page", () => {
    const pages = readdirSync(DIST, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith("ow-") && d.name !== "ow-tools")
      .map((d) => d.name)
      .sort();
    expect(pages).toEqual(skillIds);
    for (const id of skillIds) expect(existsSync(join(DIST, id, "index.html"))).toBe(true);
    for (const fixed of ["index.html", "ow-tools/index.html", "install/index.html", "changelog/index.html"]) {
      expect(existsSync(join(DIST, fixed)), fixed).toBe(true);
    }
  });
});

describe("no ow- id in any oc- output", () => {
  const ocOutputs = [
    "src/generated/mcp-catalog.json",
    ".github/workflows/mirror-public.yml",
  ];
  it.each(ocOutputs)("%s never names an ow- skill", (rel) => {
    const text = readFileSync(join(ROOT, rel), "utf8");
    for (const id of skillIds) expect(text, `${rel} names ${id}`).not.toMatch(new RegExp(`\\b${id}\\b`));
  });

  it("the plugin skills tree and .claude/skills hold no ow- folder", () => {
    for (const dir of ["plugins/opchain/skills", ".claude/skills"]) {
      const full = join(ROOT, dir);
      if (!existsSync(full)) continue;
      const owDirs = readdirSync(full).filter((n) => n.startsWith("ow-"));
      expect(owDirs, `${dir} holds ${owDirs.join(", ")}`).toEqual([]);
    }
  });

  it.skipIf(!existsSync(join(ROOT, "site/dist/skills.json")) && !existsSync(join(ROOT, "public/skills.json")))(
    "the machine-readable oc- catalog (skills.json) holds no ow- skill",
    () => {
      const file = ["site/dist/skills.json", "public/skills.json"].map((r) => join(ROOT, r)).find(existsSync);
      const text = readFileSync(file, "utf8");
      for (const id of skillIds) expect(text).not.toMatch(new RegExp(`"${id}"`));
    },
  );

  it("the site's oc- surfaces never read the work collection", () => {
    // lib/skills.ts is the oc- catalog's helper; it must not import lib/work.ts,
    // and /skills must not list ow- ids, so the two catalogs' counts stay apart.
    const skillsLib = readFileSync(join(ROOT, "site/src/lib/skills.ts"), "utf8");
    expect(skillsLib).not.toMatch(/lib\/work|getCollection\("work"\)/);
    for (const rel of ["site/src/pages/skills/index.astro", "site/src/pages/skills/[id].astro"]) {
      const text = readFileSync(join(ROOT, rel), "utf8");
      expect(text, rel).not.toMatch(/getCollection\("work"\)|lib\/work"/);
    }
  });
});

describe("no business, private skill or price under /work", () => {
  const forbidden = [...(ow.brandNames ?? []), ...(ow.privateNames ?? [])];
  // Matched however spaced, hyphenated, underscored, joined or cased (the family
  // name rule, scripts/check-skill-contracts.mjs familyNameRules).
  const loose = (name) => new RegExp(name.split(/[-_\s]+/).map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[-_\\s]*"), "i");
  // An amount: a currency sign and at least two figures ($1 in a replace
  // pattern is not one), or a figure with a currency code.
  const currency = /(?:^|[\s(>])(?:[$€£]\s?\d[\d,.]+|\d[\d,]*(?:\.\d+)?\s?(?:USD|EUR|GBP)\b)/;

  const sources = [
    ...walk(PAGES),
    join(ROOT, "site/src/data/work.ts"),
    join(ROOT, "site/src/lib/work.ts"),
    join(ROOT, "site/src/layouts/WorkPage.astro"),
  ];
  it.each(sources.map((f) => [relative(ROOT, f), f]))("%s is clean", (_rel, file) => {
    const text = readFileSync(file, "utf8");
    for (const name of forbidden) expect(text, `names ${name}`).not.toMatch(loose(name));
    expect(text, "carries a currency amount").not.toMatch(currency);
  });

  it.skipIf(!existsSync(DIST))("the built /work HTML is clean", () => {
    for (const file of walk(DIST).filter((f) => f.endsWith(".html"))) {
      const text = readFileSync(file, "utf8");
      for (const name of forbidden) expect(text, `${relative(ROOT, file)} names ${name}`).not.toMatch(loose(name));
      // Strip the inlined page scripts and styles: the amount rule is about copy.
      const copy = text.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "");
      expect(copy, `${relative(ROOT, file)} carries a currency amount`).not.toMatch(currency);
    }
  });
});
