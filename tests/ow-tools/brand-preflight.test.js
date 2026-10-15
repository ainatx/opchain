// ow-tools design §5.2: brand.yaml reader, contrast, and the export preflight.
import { afterAll, describe, expect, it } from "vitest";
import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
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

  it("removes the ow-protocol v1 header block and keeps the banner line after it", () => {
    const r = check(
      "---\now_artefact: ow-build-plan/quote\nschema: 1\nwritten_by: ow-build-plan 1.0.0 (protocol 1)\nworkstream: plans/acme\nsubject: none\ncreated: 2026-10-09\nclock: tool\norigin: skill\n---\nCONFIDENTIAL — Acme\n\n# Quote\n\nTotal.\n",
    );
    expect(r).toMatchObject({ ok: true, banner: "CONFIDENTIAL — Acme", title: "Quote" });
    expect(r.body).not.toMatch(/ow_artefact|written_by|^---$/m);
  });

  it("leaves a header-less document's first line alone", () => {
    expect(check("---\ntitle: x\n---\n# A\n").banner).toBeNull();
  });

  it("also reads the audit's older one-line header with the banner above it", () => {
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
    ["# A\n\n![](map.png)\n", /line 3: an image has no alt text/],
    ["# A\n\n![Map](missing.png)\n", /line 3: an image file was not found/],
    ["# A\n\n![Map](https://example.com/m.png)\n", /remote/],
    ["# A\n\n| Step |  |\n| --- | --- |\n", /line 3: a table header cell is empty/],
    ["# A\n\nRead [here](https://example.com).\n", /line 3: link text like "here"/],
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

// F-001 (2026-10-14 audit): a marker that differs only in case or spacing is
// still a marker; any other comment mentioning "internal" is refused, so the
// internal section can never reach the client silently.
describe("export preflight: internal markers", () => {
  const dir = tempDir();
  const check = (md) => preflight(md, join(dir, "doc.md"));
  const SECRET = "unit margin 41 percent zq";

  it.each([
    ["<!-- ow:internal -->", "<!-- ow:end-internal -->"],
    ["<!-- OW:INTERNAL -->", "<!-- OW:END-INTERNAL -->"],
    ["<!-- ow: internal -->", "<!-- ow : end-internal -->"],
    ["<!--ow:Internal-->", "<!--ow:End-Internal-->"],
    ["  <!--   Ow :Internal   -->", "<!-- ow:end - internal -->"],
  ])("strips a section marked %j … %j", (open, close) => {
    const r = check(`# Quote\n\nTotal.\n\n${open}\n## Appendix\n${SECRET}\n${close}\n`);
    expect(r.problems).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.removedSections).toBe(1);
    expect(r.body).not.toMatch(/Appendix|margin|internal/i);
  });

  it.each([
    ["<!-- OW:INTERNAL -->"],
    ["<!-- ow: internal -->"],
    ["<!--ow:Internal-->"],
  ])("refuses an unclosed section opened with %j", (open) => {
    const r = check(`# Quote\n\n${open}\n${SECRET}\n`);
    expect(r.ok).toBe(false);
    expect(r.problems.join("\n")).toMatch(/line 3: ow:internal section never closed/);
  });

  it.each([
    ["<!-- ow-internal -->\nsecret\n<!-- ow:end-internal -->", /line 3: an HTML comment mentions "internal" but is not a marker/],
    ["<!-- internal pricing below -->", /line 3: an HTML comment mentions "internal"/],
    ["<!-- ow:internal start -->", /line 3: an HTML comment mentions "internal"/],
    ["Total. <!-- ow:internal -->", /line 3: an HTML comment mentions "internal"/],
    ["<!--\now:internal\n-->", /line 3: an HTML comment mentions "internal"/],
    ["Text\n\n<!-- internal notes, never closed", /line 5: an HTML comment mentions "internal"/],
    ["```\n<!-- OW internal -->\n```", /line 4: an HTML comment mentions "internal"/],
    ["<!-- ow:intrenal -->\nsecret\n<!-- ow:end-internal -->", /line 5: ow:end-internal without an opening/],
    ["ow: internal", /line 3: stray ow:internal marker/],
  ])("refuses a malformed marker: %j", (md, re) => {
    const r = check(`# Quote\n\n${md}\n`);
    expect(r.ok).toBe(false);
    expect(r.problems.join("\n")).toMatch(re);
  });

  it("refuses nested markers", () => {
    const r = check("# Q\n\n<!-- ow:internal -->\na\n<!-- OW:INTERNAL -->\nb\n<!-- ow:end-internal -->\n<!-- ow:end-internal -->\n");
    expect(r.ok).toBe(false);
    expect(r.problems.join("\n")).toMatch(/line 5: an ow:internal section opens inside another one/);
    expect(r.problems.join("\n")).toMatch(/line 8: ow:end-internal without an opening/);
  });

  // SA-006 / design §8: messages carry line numbers, never the document's text.
  it("names lines, never quotes the document's text", () => {
    const r = check(
      `# Quote\n\nWe charge ${SECRET} on this.\n\n<!-- ow:internal -->\n${SECRET}\n<!-- ow:end-internal -->\n\n![](secret-diagram-zq.png)\n\nRead [click here](https://example.com/zq-private).\n`,
    );
    expect(r.ok).toBe(false);
    const all = r.problems.join("\n");
    expect(all).toMatch(/line 3: text from the internal section \(line 6\) also appears here/);
    expect(all).toMatch(/line 9: an image has no alt text/);
    expect(all).toMatch(/line 11: link text like/);
    expect(all).not.toMatch(/margin|secret-diagram|zq|click here/);
  });
});

// F-003 / SA-003 (2026-10-14 audit): images stay inside the document's folder
// (or its opchain-work/ folder), symlinks are resolved first, and only real
// PNG, JPEG and GIF files are accepted.
describe("export preflight: image files", () => {
  const JPEG = Buffer.from("ffd8ffe000104a46494600010100000100010000ffd9", "hex");
  const GIF = Buffer.from("47494638396101000100800000000000ffffff2c00000000010001000002024401003b", "hex");

  function layout() {
    const d = tempDir();
    const docDir = join(d, "client", "docs");
    mkdirSync(docDir, { recursive: true });
    writeFileSync(join(docDir, "map.png"), png());
    writeFileSync(join(docDir, "photo.jpg"), JPEG);
    writeFileSync(join(docDir, "anim.gif"), GIF);
    writeFileSync(join(docDir, "fake.png"), "stand-in for a private file, not an image\n");
    writeFileSync(join(docDir, "drawing.svg"), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    writeFileSync(join(d, "client", "secret.png"), png());
    writeFileSync(join(d, "id_ed25519"), "stand-in for a private file, not an image\n");
    symlinkSync(join(d, "id_ed25519"), join(docDir, "logo.png"));
    return { d, docDir, check: (md) => preflight(md, join(docDir, "doc.md")) };
  }

  it("accepts PNG, JPEG and GIF beside the document and records the detected type", () => {
    const { check } = layout();
    const r = check("# A\n\n![Map](map.png)\n\n![Photo](photo.jpg)\n\n![Anim](anim.gif)\n");
    expect(r.problems).toEqual([]);
    expect(r.images.map((i) => i.type)).toEqual(["png", "jpg", "gif"]);
    expect(r.images[0].abs.endsWith(join("docs", "map.png"))).toBe(true);
    expect(r.images[0].abs.startsWith("/")).toBe(true);
  });

  it.each([
    ["![Key](../../id_ed25519)", /line 3: an image is outside the document's folder/],
    ["![Up](../secret.png)", /line 3: an image is outside the document's folder/],
    ["![Logo](logo.png)", /line 3: an image is outside the document's folder/],
    ["![Fake](fake.png)", /line 3: an image is not a PNG, JPEG or GIF file/],
    ["![Vector](drawing.svg)", /line 3: an image is not a PNG, JPEG or GIF file/],
    ["![Bad](a%zz.png)", /line 3: an image path has a malformed %-escape/],
    ["![Dir](.)", /line 3: an image is not a PNG, JPEG or GIF file/],
  ])("refuses %j", (md, re) => {
    const { check } = layout();
    const r = check(`# A\n\n${md}\n`);
    expect(r.ok).toBe(false);
    expect(r.problems.join("\n")).toMatch(re);
    expect(r.problems.join("\n")).not.toMatch(/id_ed25519|secret|logo|fake|drawing/);
  });

  it("allows an image anywhere under the enclosing opchain-work/ folder, and nothing above it", () => {
    const d = tempDir();
    const ws = join(d, "opchain-work", "plans", "acme");
    mkdirSync(ws, { recursive: true });
    mkdirSync(join(d, "opchain-work", "brand"));
    writeFileSync(join(d, "opchain-work", "brand", "diagram.png"), png());
    writeFileSync(join(d, "outside.png"), png());
    const check = (md) => preflight(md, join(ws, "plan.md"));
    expect(check("# A\n\n![Diagram](../../brand/diagram.png)\n").problems).toEqual([]);
    expect(check("# A\n\n![Out](../../../outside.png)\n").problems.join("\n")).toMatch(/line 3: an image is outside the opchain-work folder/);
  });
});
