// ow-tools design §5.2: brand.yaml reader, contrast, and the export preflight.
import { afterAll, describe, expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { contrast, loadBrand, parseBrandYaml, validateBrand } from "../../plugins/ow-tools/lib/brand.mjs";
import { preflight } from "../../plugins/ow-tools/lib/preflight.mjs";
import { PLUGIN, cleanup, png, tempDir, write } from "./helpers.js";

afterAll(cleanup);

describe("brand.yaml", () => {
  it("reads the shipped example", () => {
    const raw = parseBrandYaml(readFileSync(join(PLUGIN, "examples", "brand.yaml"), "utf8"));
    const b = validateBrand(raw, PLUGIN);
    expect(b).toMatchObject({ schema: 1, name: "Example Studio", lang: "en-US", page: "letter" });
    expect(b.headerText).toBe("#FFFFFF");
  });

  it("reads block and inline maps, quotes and comments", () => {
    const raw = parseBrandYaml('schema: 1\nname: "Acme # 1" # trailing\ncolors: { text: "#111111", accent: \'#2E6B4F\' }\nfonts:\n  body: Inter\n');
    expect(raw).toEqual({ schema: "1", name: "Acme # 1", colors: { text: "#111111", accent: "#2E6B4F" }, fonts: { body: "Inter" } });
  });

  it.each([
    ["colour: blue", /unknown key "colour"/],
    ["colors:\n  txt: '#000000'", /unknown key "colors.txt"/],
    ["name: &a Acme", /anchors/],
    ["footer: |\n  two lines", /multi-line/],
    ["name: A\nname: B", /appears twice/],
    ["name:\tA", /tabs/],
  ])("refuses %j", (yaml, re) => {
    expect(() => validateBrand(parseBrandYaml(`schema: 1\n${yaml}`), "/")).toThrow(re);
  });

  it("computes WCAG contrast", () => {
    expect(contrast("#000000", "#FFFFFF")).toBe(21);
    expect(contrast("#767676", "#FFFFFF")).toBe(4.54);
  });

  it("refuses body text below 4.5:1 and names the ratio", () => {
    expect(() => validateBrand({ colors: { text: "#888888" } }, "/")).toThrow(/3\.54:1; body text needs at least 4\.5:1/);
  });

  // Every colour has black or white text at 4.58:1 or better, so the header
  // text is always readable; the brand only chooses which.
  it("picks black or white for the table header, whichever reads better", () => {
    expect(validateBrand({ colors: { accent: "#F2C14E" } }, "/").headerText).toBe("#000000");
    expect(validateBrand({ colors: { accent: "#2E6B4F" } }, "/").headerText).toBe("#FFFFFF");
    expect(validateBrand({ colors: { accent: "#808080" } }, "/").ratios.table_header).toBeGreaterThanOrEqual(4.5);
  });

  it("falls back to the text colour for links when the accent is too light, so links stay readable", () => {
    expect(validateBrand({ colors: { accent: "#F2C14E" } }, "/").link).toBe("#1A1A1A");
  });

  it("requires a PNG logo inside the brand folder, with alt text", () => {
    const d = tempDir();
    writeFileSync(join(d, "logo.png"), png());
    writeFileSync(join(d, "logo.svg"), "<svg/>");
    expect(validateBrand({ logo: "logo.png", logo_alt: "Acme logo" }, d).logoPath).toBe(join(d, "logo.png"));
    expect(() => validateBrand({ logo: "logo.png" }, d)).toThrow(/logo_alt is required/);
    expect(() => validateBrand({ logo: "logo.svg", logo_alt: "x" }, d)).toThrow(/PNG/);
    expect(() => validateBrand({ logo: "../logo.png", logo_alt: "x" }, d)).toThrow(/inside the brand folder/);
  });

  it("finds opchain-work/brand.yaml above the document, or uses neutral styling", () => {
    const d = tempDir();
    const md = write(join(d, "opchain-work", "plans", "acme", "plan.md"), "# Plan\n");
    expect(loadBrand(md).path).toBeNull();
    write(join(d, "opchain-work", "brand.yaml"), "schema: 1\nname: Acme\n");
    expect(loadBrand(md)).toMatchObject({ path: join(d, "opchain-work", "brand.yaml"), brand: { name: "Acme" } });
  });
});

describe("export preflight", () => {
  const dir = tempDir();
  writeFileSync(join(dir, "map.png"), png());
  const check = (md) => preflight(md, join(dir, "doc.md"));

  it("passes a clean document and reports its title", () => {
    const r = check("# Build Plan\n\n## Scope\n\n![Process map: email to system](map.png)\n\n| Step | Who |\n| --- | --- |\n| 1 | Office |\n\nSee [the scope](#scope).\n");
    expect(r).toMatchObject({ ok: true, title: "Build Plan", problems: [] });
  });

  it("removes the R3 header, keeps the banner, and strips internal sections", () => {
    const r = check(
      "CONFIDENTIAL\now_artefact: quote | schema: 1\n\n# Quote\n\nTotal $13,000.\n\n<!-- ow:internal -->\n## Appendix\nintegration unit 6,500.00\n<!-- ow:end-internal -->\n",
    );
    expect(r.ok).toBe(true);
    expect(r.banner).toBe("CONFIDENTIAL");
    expect(r.body).not.toMatch(/ow_artefact|Appendix|6,500\.00|ow:internal/);
    expect(r.removedSections).toBe(1);
  });

  it.each([
    ["## No title\n", /exactly one level-1 heading/],
    ["# A\n\n# B\n", /line 3: a second level-1 heading/],
    ["# A\n\n### Skipped\n", /line 3: heading level jumps from 1 to 3/],
    ["# A\n\n![](map.png)\n", /line 3: image map\.png has no alt text/],
    ["# A\n\n![Map](missing.png)\n", /image not found: missing\.png/],
    ["# A\n\n![Map](https://example.com/m.png)\n", /remote/],
    ["# A\n\n| Step |  |\n| --- | --- |\n", /line 3: a table header cell is empty/],
    ["# A\n\nRead [here](https://example.com).\n", /link text "here"/],
    ["# A\n\nSee [https://example.com](https://example.com).\n", /bare URL as link text/],
    ["# A\n\nSee <https://example.com>.\n", /bare URL as link text/],
    ["# A\n\n<div>raw</div>\n", /raw HTML/],
    ["# A\n\n<!-- ow:internal -->\nsecret\n", /never closed/],
    ["# A\n\n<!-- ow:end-internal -->\n", /without an opening/],
  ])("refuses %j", (md, re) => {
    const r = check(md);
    expect(r.ok).toBe(false);
    expect(r.problems.join("\n")).toMatch(re);
  });

  it("ignores headings and HTML inside fenced code", () => {
    expect(check("# A\n\n```\n# not a heading\n<div>\n```\n").ok).toBe(true);
  });

  it("treats a setext underline as a heading", () => {
    expect(check("Title\n=====\n\nSub\n---\n").title).toBe("Title");
  });
});
