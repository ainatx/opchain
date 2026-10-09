// ow-tools design §5.2: real pandoc + Typst export. Skips (and says so) when
// the tools aren't installed, e.g. in CI; the preflight suite runs everywhere.
import { afterAll, describe, expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, cli, has, pdfText, png, tempDir, unzipText, write } from "./helpers.js";

// Each case spawns bin/ow-tools (and git/stubs): ~0.2-0.6 s idle, several
// times that under machine load, so these suites get 30 s, not vitest's 5 s.
const SPAWN = { timeout: 30_000 };

afterAll(cleanup);
const ready = has("pandoc") && has("typst") && has("zip") && has("unzip");

const QUOTE = `---
ow_artefact: ow-build-plan/quote
schema: 1
written_by: ow-build-plan 1.0.0 (protocol 1)
workstream: plans/meridian-tile
subject: plans/meridian-tile/scope.md
created: 2026-10-09
clock: tool
origin: skill
---
CONFIDENTIAL — prepared for Meridian Floor & Tile

# Quote: Meridian order intake

## Work packages

![Order process: email arrives, then it is retyped](map.png)

| Package | Price (USD) |
| --- | ---: |
| WP-1 Order intake | 8,000.00 |

See [how payments work](#payments).

### Payments

40% to book, 40% at the working demo, 20% at acceptance.

<!-- ow:internal -->
## Internal appendix

| Unit | Unit price |
| --- | --- |
| integration-unit-zz | 6,500.00 |
<!-- ow:end-internal -->
`;

function workspace() {
  const d = tempDir();
  const ws = join(d, "opchain-work", "plans", "meridian-tile");
  write(join(d, "opchain-work", "brand.yaml"), 'schema: 1\nname: Example Studio\nlogo: brand/logo.png\nlogo_alt: Example Studio logo\ncolors: { primary: "#1F4E79", accent: "#2E6B4F" }\nfooter: Example Studio · example.com\nlang: en-US\n');
  write(join(d, "opchain-work", "brand", "logo.png"), "");
  writeFileSync(join(d, "opchain-work", "brand", "logo.png"), png(80, 30));
  write(join(ws, "quote.md"), QUOTE);
  writeFileSync(join(ws, "map.png"), png());
  return { d, ws };
}

describe.skipIf(!ready)("ow-tools export (pandoc + Typst installed)", SPAWN, () => {
  it("builds a tagged PDF/UA-1 PDF and a branded Word file, without the internal appendix", () => {
    const { ws } = workspace();
    const r = cli(["export", join(ws, "quote.md"), "--json"]);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(r.json).toMatchObject({ status: "done", title: "Quote: Meridian order intake", removed_internal_sections: 1, banner: true });
    expect(r.json.statement).toMatch(/this is not a conformance test/);
    expect(r.json.sha256.pdf).toMatch(/^[0-9a-f]{64}$/);

    const pdf = pdfText(readFileSync(join(ws, "export", "quote.pdf")));
    expect(pdf).toContain("/StructTreeRoot");
    expect(pdf).toMatch(/\/Lang\s*\(en-US\)|\/Lang\s*\(en\)/);
    expect(pdf).toMatch(/\/Marked\s+true/);
    expect(pdf).toContain("pdfuaid");
    expect(pdf).toContain("Quote: Meridian order intake");

    const docx = join(ws, "export", "quote.docx");
    const doc = unzipText(docx, "word/document.xml");
    expect(doc).toContain('w:pStyle w:val="Heading1"');
    expect(doc).toContain('<w:tblHeader w:val="on" />');
    expect(doc).toContain('descr="Order process: email arrives, then it is retyped"');
    expect(doc).toContain('w:headerReference w:type="default" r:id="rIdOwHeader"');
    expect(doc).not.toMatch(/integration-unit-zz|6,500\.00|ow_artefact|written_by/);
    expect(unzipText(docx, "docProps/core.xml")).toContain("<dc:title>Quote: Meridian order intake</dc:title>");
    expect(unzipText(docx, "word/header-ow.xml")).toContain('descr="Example Studio logo"');
    expect(unzipText(docx, "word/header-ow.xml")).toContain("CONFIDENTIAL — prepared for Meridian Floor &amp; Tile");
    expect(unzipText(docx, "word/footer-ow.xml")).toContain("NUMPAGES");
    expect(unzipText(docx, "word/styles.xml")).toContain('w:fill="2E6B4F"');
  });

  it("exports only the formats asked for", () => {
    const { ws } = workspace();
    const r = cli(["export", join(ws, "quote.md"), "--formats", "docx", "--out", join(ws, "out"), "--json"]);
    expect(r.status).toBe(0);
    expect(Object.keys(r.json.outputs)).toEqual(["docx"]);
  });
});

describe("ow-tools export refusals (any machine)", SPAWN, () => {
  it("refuses an inaccessible document before any engine runs (exit 4)", () => {
    const { ws } = workspace();
    write(join(ws, "bad.md"), "# A\n\n![](map.png)\n\n### Jump\n");
    const r = cli(["export", join(ws, "bad.md"), "--json"]);
    expect(r.status).toBe(4);
    expect(r.json.problems).toEqual(["line 3: image map.png has no alt text", "line 5: heading level jumps from 1 to 3"]);
  });

  it("refuses a brand below contrast with the measured ratio", () => {
    const { d, ws } = workspace();
    write(join(d, "opchain-work", "brand.yaml"), 'schema: 1\ncolors: { text: "#999999" }\n');
    const r = cli(["export", join(ws, "quote.md"), "--json"]);
    expect(r.status).toBe(4);
    expect(r.json.message).toMatch(/2\.85:1/);
  });

  it("names missing engines (exit 3)", () => {
    const { ws } = workspace();
    const r = cli(["export", join(ws, "quote.md"), "--json"], { env: { PATH: `${process.execPath.replace(/\/node$/, "")}:/bin` } });
    expect(r.status).toBe(3);
    expect(r.json.missing).toEqual(expect.arrayContaining(["pandoc", "typst"]));
  });
});
