// Sprint T: T6 export --xlsx (C6, C7, C8) and T2 export --pptx (C9, C10),
// plus the export record (SA-007 (b)) and the zip writer.
import { afterAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";
import { buildWorkbook, checkFormula, readSheetFolder } from "../../plugins/ow-tools/lib/xlsx.mjs";
import { crc32, zip } from "../../plugins/ow-tools/lib/zip.mjs";
import { deckChecks } from "../../plugins/ow-tools/lib/pptx.mjs";
import { ROOT, cleanup, cli, has, png, stub, tempDir, write } from "./helpers.js";

const SPAWN = { timeout: 30_000 };
afterAll(cleanup);
const FIX = join(ROOT, "tests", "fixtures", "ow-tools", "sprint-t");
const NODE_DIR = process.execPath.replace(/\/node$/, "");

// Every part of a zip, read with Node only (no unzip needed).
function unzipAll(buf) {
  const parts = {};
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let k = 0; k < count; k++) {
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extra = buf.readUInt16LE(p + 30);
    const comment = buf.readUInt16LE(p + 32);
    const off = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    const lName = buf.readUInt16LE(off + 26);
    const lExtra = buf.readUInt16LE(off + 28);
    const data = buf.subarray(off + 30 + lName + lExtra, off + 30 + lName + lExtra + size);
    parts[name] = (method === 8 ? inflateRawSync(data) : data).toString("utf8");
    p += 46 + nameLen + extra + comment;
  }
  return parts;
}

function sheetCopy(name = "sheet-two") {
  const d = join(tempDir(), "DR-01");
  cpSync(join(FIX, name), join(d, "sheet"), { recursive: true });
  return join(d, "sheet");
}

describe("zip writer", () => {
  it("writes a standard zip that unzip reads, with the table CRC-32", () => {
    expect(crc32(Buffer.from("123456789"))).toBe(0xcbf43926);
    const buf = zip([{ name: "a.txt", data: "hello" }, { name: "dir/b.bin", data: Buffer.alloc(1000, 7), store: true }]);
    expect(unzipAll(buf)["a.txt"]).toBe("hello");
    if (has("unzip")) {
      const f = write(join(tempDir(), "t.zip"), "");
      writeFileSync(f, buf);
      expect(spawnSync("unzip", ["-tq", f], { encoding: "utf8" }).status).toBe(0);
    }
  });
});

describe("ow-tools export --formats xlsx (T6)", SPAWN, () => {
  it("C6: formula cells carry <f> and no value; one bold frozen header row; formats from the map; Sources sheet; recalc on load", () => {
    const src = sheetCopy();
    const r = cli(["export", src, "--formats", "xlsx", "--json"]);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(r.json.sheets).toEqual(["Costs", "Rates", "Sources"]);
    const parts = unzipAll(readFileSync(r.json.outputs.xlsx));
    const costs = parts["xl/worksheets/sheet1.xml"];
    expect(costs).toMatch(/<c r="D2" s="\d+"><f>B2\*C2<\/f><\/c>/);
    expect(costs).toContain("<f>SUM(D2:D4)</f>");
    for (const f of costs.match(/<c [^>]*><f>[^<]*<\/f>[^/]*?<\/c>/g)) expect(f).not.toMatch(/<v>/);
    expect(parts["xl/worksheets/sheet2.xml"]).toContain("<f>ROUND(Costs!D5*(1+B2),2)</f>");
    for (let k = 1; k <= 3; k++) {
      const s = parts[`xl/worksheets/sheet${k}.xml`];
      expect(s).toContain('<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>');
      expect(s.match(/<row r="1">.*?<\/row>/)[0].match(/s="(\d+)"/g).every((x) => x === 's="1"')).toBe(true);
    }
    expect(parts["xl/styles.xml"]).toContain('<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>');
    expect(parts["xl/styles.xml"]).toContain('formatCode="&quot;USD &quot;#,##0.00"');
    expect(parts["xl/styles.xml"]).toMatch(/numFmtId="10"[^>]*applyNumberFormat/); // percent on Rates!B2
    expect(parts["xl/workbook.xml"]).toContain('<calcPr calcId="191029" fullCalcOnLoad="1"/>');
    expect(parts["xl/worksheets/sheet1.xml"]).toContain("<oddHeader>&amp;CCONFIDENTIAL — Harbor Cafe</oddHeader>");
    expect(parts["docProps/core.xml"]).toContain("<dc:title>Fit-out costs</dc:title>");
  });

  it("C6: the same input gives byte-identical output", () => {
    const src = sheetCopy();
    const a = cli(["export", src, "--formats", "xlsx", "--out", join(src, "..", "a"), "--json"]);
    const b = cli(["export", src, "--formats", "xlsx", "--out", join(src, "..", "b"), "--json"]);
    expect(readFileSync(a.json.outputs.xlsx).equals(readFileSync(b.json.outputs.xlsx))).toBe(true);
    expect(statSync(a.json.outputs.xlsx).mode & 0o777).toBe(0o600);
  });

  it("O13: a vendor-eval blank workbook has no Sources sheet", () => {
    const book = readSheetFolder(join(FIX, "sheet-vendor-blank"));
    expect(book.order).toEqual(["Evaluator-1", "Evaluator-2"]);
    expect(unzipAll(buildWorkbook(book))["xl/workbook.xml"]).not.toContain("Sources");
  });

  const plant = (mutate) => {
    const src = sheetCopy();
    mutate(src);
    return cli(["export", src, "--formats", "xlsx", "--json"]);
  };
  const modelWith = (src, cell, formula) =>
    writeFileSync(join(src, "model.md"), readFileSync(join(src, "model.md"), "utf8").replace("| D5 | =SUM(D2:D4) | currency:USD |", `| ${cell} | ${formula} | currency:USD |`));

  it.each([
    ["a typed value in a mapped formula cell", (s) => writeFileSync(join(s, "Costs.csv"), readFileSync(join(s, "Costs.csv"), "utf8").replace("Total,,,", "Total,,,9001.50")), "typed-value-in-formula-cell", "Costs!D5"],
    ["a reference to an unknown sheet", (s) => modelWith(s, "D5", "=SUM(Secret!A1:A4)"), "unknown-sheet", "Costs!D5"],
    ["a reference to an unknown cell", (s) => modelWith(s, "D5", "=SUM(D2:D400)"), "unknown-cell", "Costs!D5"],
    ["a function outside the allowlist", (s) => modelWith(s, "D5", "=INDIRECT(A1)"), "function-not-allowed", "Costs!D5"],
    ["an external-workbook reference", (s) => modelWith(s, "D5", "=[Prices.xlsx]Sheet1!A1"), "external-reference", "Costs!D5"],
    ["a DDE-style formula", (s) => modelWith(s, "D5", "=cmd\\|' /C calc'!A0"), "dde-or-link-formula", "Costs!D5"],
    ["a WEBSERVICE formula", (s) => modelWith(s, "D5", '=WEBSERVICE("https://example.test/x")'), "dde-or-link-formula", "Costs!D5"],
    ["a HYPERLINK formula", (s) => modelWith(s, "D5", '=HYPERLINK("https://example.test","x")'), "dde-or-link-formula", "Costs!D5"],
  ])("C7: refuses %s (exit 4, naming sheet!cell, never a value)", (_, mutate, reason, cell) => {
    const r = plant(mutate);
    expect(r.status, r.stdout).toBe(4);
    expect(r.json).toMatchObject({ reason, cell });
    expect(r.json.message.startsWith(`${cell}:`)).toBe(true);
    expect(r.json.message).not.toMatch(/9001|Secret|INDIRECT|Prices|calc|example\.test/);
  });

  it("C7: formula-looking CSV text is written as a string, never a formula", () => {
    const src = sheetCopy();
    writeFileSync(join(src, "Costs.csv"), readFileSync(join(src, "Costs.csv"), "utf8").replace("Dashboard,", '"=HYPERLINK(""https://example.test"")",').replace("Intake form", '"+SUM(1,2)"').replace("Training session", "@cmd"));
    const r = cli(["export", src, "--formats", "xlsx", "--json"]);
    expect(r.status).toBe(0);
    const s = unzipAll(readFileSync(r.json.outputs.xlsx))["xl/worksheets/sheet1.xml"];
    expect(s.match(/<f>/g)).toHaveLength(4); // only the four mapped cells
    expect(s).toMatch(/t="inlineStr"><is><t xml:space="preserve">=HYPERLINK\(&quot;https:\/\/example\.test&quot;\)<\/t>/);
    expect(s).toMatch(/t="inlineStr"><is><t xml:space="preserve">\+SUM\(1,2\)<\/t>/);
    expect(s).toMatch(/t="inlineStr"><is><t xml:space="preserve">@cmd<\/t>/);
    expect(unzipAll(readFileSync(r.json.outputs.xlsx))["xl/styles.xml"]).toContain('quotePrefix="1"');
  });

  it("checks formulas token by token", () => {
    expect(checkFormula("=sum(a1:b2)+'Other sheet'!$C$3", "S!A1")).toEqual({ text: "SUM(A1:B2)+'Other sheet'!$C$3", refs: [{ sheet: null, range: "a1:b2" }, { sheet: "Other sheet", range: "$C$3" }] });
    expect(() => checkFormula("=SUM(A1", "S!A1")).toThrow(/unbalanced/);
    expect(() => checkFormula("=foo", "S!A1")).toThrow(expect.objectContaining({ extra: expect.objectContaining({ reason: "formula-syntax" }) }));
    expect(() => checkFormula("={1,2}", "S!A1")).toThrow(expect.objectContaining({ extra: expect.objectContaining({ reason: "formula-syntax" }) }));
  });

  it("C8 (real soffice): LibreOffice computes the same values ow-tools calc does", (ctx) => {
    if (!has("soffice")) {
      ctx.skip("LibreOffice (soffice) is not installed; C8 is a real-binary check");
      return;
    }
    const src = sheetCopy();
    const r = cli(["export", src, "--formats", "xlsx", "--json"]);
    const out = join(src, "..", "csv");
    mkdirSync(out);
    spawnSync("soffice", ["--headless", "--convert-to", "csv", "--outdir", out, r.json.outputs.xlsx], { encoding: "utf8", timeout: 60000 });
    const csv = readFileSync(join(out, "sheet.csv"), "utf8");
    const items = [{ label: "Intake form", quantity: 2, unit_price: "1500.00" }, { label: "Dashboard", quantity: 1, unit_price: "2500.50" }, { label: "Training session", quantity: 3, unit_price: "400.00" }];
    const calc = cli(["calc", "total", "--items", write(join(src, "..", "items.json"), JSON.stringify(items)), "--json"]);
    expect(csv.replace(/[^0-9.\n,]/g, "")).toContain(calc.json.total.replace(/\.00$/, ""));
  });

  it("writes the export record beside the output and says when it replaced a file (SA-007 b)", () => {
    const src = sheetCopy();
    const a = cli(["export", src, "--formats", "xlsx", "--json"], { env: { OW_TOOLS_NOW: "2026-10-16T15:00:00Z" } });
    expect(a.json.replaced).toEqual([]);
    const rec = JSON.parse(readFileSync(a.json.record, "utf8"));
    expect(rec).toMatchObject({ ow_artefact: "ow-tools/export-record", schema: 1, name: "sheet" });
    expect(rec.outputs.xlsx).toMatchObject({ file: "sheet.xlsx", source: "sheet/", source_form: "ow-tools-tree-v1", replaced: false, clock: "tool", time: "2026-10-16T15:00:00.000Z" });
    expect(rec.outputs.xlsx.sha256).toBe(a.json.sha256.xlsx);
    expect(rec.outputs.xlsx.written_by).toMatch(/^ow-tools \d+\.\d+\.\d+$/);
    const b = cli(["export", src, "--formats", "xlsx"]);
    expect(b.stdout).toContain(`Replaced: ${a.json.outputs.xlsx}`);
    expect(JSON.parse(readFileSync(a.json.record, "utf8")).outputs.xlsx.replaced).toBe(true);
    expect(statSync(a.json.record).mode & 0o777).toBe(0o600);
  });

  it("refuses a symlinked sheet folder or CSV before writing anything", () => {
    const src = sheetCopy();
    const link = join(src, "..", "linked");
    symlinkSync(src, link);
    let r = cli(["export", link, "--formats", "xlsx", "--json"]);
    expect(r.status).toBe(4);
    expect(r.json.reason).toBe("symlink-in-tree");
    expect(existsSync(join(src, "..", "export"))).toBe(false);
    symlinkSync(join(src, "Rates.csv"), join(src, "Linked.csv"));
    r = cli(["export", src, "--formats", "xlsx", "--json"]);
    expect(r.status).toBe(4);
    expect(r.json).toMatchObject({ reason: "symlink-in-tree", path: "Linked.csv" });
  });

  it("needs only Node: never exit 3 for xlsx", () => {
    const src = sheetCopy();
    const r = cli(["export", src, "--formats", "xlsx", "--json"], { env: { PATH: `${NODE_DIR}:/nonexistent` } });
    expect(r.status).toBe(0);
  });
});

// ---- pptx ------------------------------------------------------------------------
const pptxReady = has("pandoc") && has("zip") && has("unzip");

function deckWorkspace() {
  const d = tempDir();
  const ws = join(d, "opchain-work", "docs", "harbor-cafe", "training");
  mkdirSync(join(d, "opchain-work", "brand"), { recursive: true });
  write(join(d, "opchain-work", "brand.yaml"), 'schema: 1\nname: Example Studio\nlogo: brand/logo.png\nlogo_alt: Example Studio logo\ncolors: { primary: "#1F4E79", accent: "#2E6B4F" }\nfonts: { heading: Inter, body: Source Serif 4 }\nlang: en-US\n');
  writeFileSync(join(d, "opchain-work", "brand", "logo.png"), png(80, 30));
  mkdirSync(ws, { recursive: true });
  cpSync(join(FIX, "deck", "deck.md"), join(ws, "deck.md"));
  writeFileSync(join(ws, "queue.png"), png());
  return ws;
}

function pptxParts(file) {
  const dir = join(tempDir(), "x");
  mkdirSync(dir);
  spawnSync("unzip", ["-q", file, "-d", dir]);
  const out = {};
  const walk = (p, rel) => {
    for (const e of readdirSync(p, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(p, e.name), `${rel}${e.name}/`);
      else out[`${rel}${e.name}`] = readFileSync(join(p, e.name)).toString("latin1");
    }
  };
  walk(dir, "");
  return out;
}

describe.skipIf(!pptxReady)("ow-tools export --formats pptx (real pandoc)", SPAWN, () => {
  it("C9: six H2 → six slides with six notes slides; the H1 is the title only (O14); theme, master logo, banner on every slide", () => {
    const ws = deckWorkspace();
    const r = cli(["export", join(ws, "deck.md"), "--formats", "pptx", "--json"]);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(r.json).toMatchObject({ slides: 6, notes_slides: 6, banner: true });
    const parts = pptxParts(r.json.outputs.pptx);
    const slides = Object.keys(parts).filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k));
    expect(slides).toHaveLength(6);
    expect(Object.keys(parts).filter((k) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(k))).toHaveLength(6);
    for (const s of slides) {
      expect(parts[s].match(/type="(title|ctrTitle)"/g) || [], s).toHaveLength(1);
      expect(parts[s], s).toContain('name="Banner"');
      expect(Buffer.from(parts[s], "latin1").toString("utf8")).toContain("CONFIDENTIAL — Harbor Cafe training");
    }
    expect(Object.values(parts).join("")).not.toContain("Order intake: live training</a:t></a:r></a:p></p:txBody></p:sp></p:spTree>"); // no title slide
    expect(parts["docProps/core.xml"]).toContain("<dc:title>Order intake: live training</dc:title>");
    expect(parts["ppt/theme/theme1.xml"]).toContain('<a:accent2><a:srgbClr val="2E6B4F"/></a:accent2>');
    expect(parts["ppt/theme/theme1.xml"]).toContain('<a:dk2><a:srgbClr val="1F4E79"/></a:dk2>');
    expect(parts["ppt/theme/theme1.xml"]).toMatch(/<a:majorFont><a:latin typeface="Inter"/);
    expect(parts["ppt/theme/theme1.xml"]).toMatch(/<a:minorFont><a:latin typeface="Source Serif 4"/);
    expect(parts["ppt/slideMasters/slideMaster1.xml"]).toMatch(/<p:cNvPr id="9101" name="Logo" descr="Example Studio logo" ?\/>/);
    expect(parts["ppt/slideMasters/_rels/slideMaster1.xml.rels"]).toContain("rIdOwLogo");
    const notes = Object.entries(parts).filter(([k]) => /notesSlide\d+\.xml$/.test(k)).map(([, v]) => v).join("");
    expect(notes).toContain("Walk through each step on the test environment.");
  });

  it("C10: every picture has a description from its alt text, every table a header row, and no internal or header text anywhere", () => {
    const ws = deckWorkspace();
    const r = cli(["export", join(ws, "deck.md"), "--formats", "pptx", "--json"]);
    const parts = pptxParts(r.json.outputs.pptx);
    const all = Object.values(parts).join("\n");
    for (const pic of all.match(/<p:pic>[\s\S]*?<\/p:pic>/g)) expect(pic).toMatch(/<p:cNvPr[^>]*descr="[^"]+"/);
    expect(all).toContain('descr="The order queue, with three test orders waiting"');
    const tables = all.match(/<a:tblPr[^>]*>/g);
    expect(tables.length).toBeGreaterThan(0);
    for (const t of tables) expect(t).toContain('firstRow="1"');
    expect(all).not.toMatch(/internal-rate-zz|Internal notes|ow_artefact|written_by|ow:internal/);
  });

  it("O14: a setext title is the deck's title too, never a slide", () => {
    const ws = deckWorkspace();
    write(join(ws, "setext.md"), "Deck title\n==========\n\n## One\n\nA.\n\n## Two\n\nB.\n");
    const r = cli(["export", join(ws, "setext.md"), "--formats", "pptx", "--json"]);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(r.json.slides).toBe(2);
    expect(Object.values(pptxParts(r.json.outputs.pptx)).join("")).not.toMatch(/={5,}/);
  });

  it("writes the export record and reports a replaced deck", () => {
    const ws = deckWorkspace();
    cli(["export", join(ws, "deck.md"), "--formats", "pptx"]);
    const r = cli(["export", join(ws, "deck.md"), "--formats", "pptx", "--json"]);
    expect(r.json.replaced).toEqual([r.json.outputs.pptx]);
    const rec = JSON.parse(readFileSync(join(ws, "export", "deck.export.json"), "utf8"));
    expect(rec.outputs.pptx).toMatchObject({ file: "deck.pptx", source: "deck.md", source_form: "file-bytes", replaced: true });
  });
});

describe("ow-tools export --formats pptx preflight (any machine)", SPAWN, () => {
  const deck = (body) => `# Deck\n\n${body}`;
  const problems = (text) => deckChecks(text.split("\n")).problems;

  it.each([
    ["an H3 outside the notes", "## One\n\n### Sub\n", "line 5: a deck has one heading per slide"],
    ["text between the title and the first slide", "Intro text\n\n## One\n", "line 3: text between the title"],
    ["two visuals on one slide", "## One\n\n![a](a.png)\n\n![b](b.png)\n", "line 7: a slide holds at most one image or table"],
    ["an unclosed notes block", "## One\n\n::: notes\nsay\n", "line 5: a ::: notes block is never closed"],
    ["another kind of div", "## One\n\n::: columns\n:::\n", "line 5: only ::: notes blocks"],
  ])("refuses %s, naming the line", (_, body, msg) => {
    expect(problems(deck(body)).join("\n")).toContain(msg);
  });

  it("allows H3 inside the notes and one visual per slide", () => {
    expect(problems(deck("## One\n\n![a](a.png)\n\n::: notes\n### Talking point\n:::\n\n## Two\n\n| A |\n| --- |\n| 1 |\n"))).toEqual([]);
  });

  it("C10: the 1.0.0 rules still run on a deck, before any engine (exit 4)", () => {
    const ws = deckWorkspace();
    write(join(ws, "bad.md"), "# Deck\n\n## One\n\n![](queue.png)\n\n#### Deep\n\n[here](https://example.test)\n");
    const r = cli(["export", join(ws, "bad.md"), "--formats", "pptx", "--json"]);
    expect(r.status).toBe(4);
    expect(r.json.reason).toBe("preflight");
    expect(r.json.problems).toEqual(expect.arrayContaining([
      "line 5: an image has no alt text",
      "line 7: heading level jumps from 2 to 4",
      expect.stringMatching(/^line 9: link text like "here"/),
      "line 7: a deck has one heading per slide (##); H3 or deeper goes in the slide text or the notes",
    ]));
    expect(existsSync(join(ws, "export"))).toBe(false);
  });

  it("C22: pptx without pandoc or zip is exit 3 naming them", () => {
    const ws = deckWorkspace();
    const r = cli(["export", join(ws, "deck.md"), "--formats", "pptx", "--json"], { env: { PATH: `${NODE_DIR}:/nonexistent` } });
    expect(r.status).toBe(3);
    expect(r.json.missing).toEqual(["pandoc", "zip", "unzip"]);
  });

  it("a pandoc failure is exit 5 with one line (stub pandoc)", () => {
    const ws = deckWorkspace();
    const bin = join(tempDir(), "bin");
    mkdirSync(bin);
    stub(bin, "pandoc", 'echo "first line" >&2; echo "pandoc: the last line says what broke" >&2; exit 64');
    for (const z of ["zip", "unzip"]) stub(bin, z, "exit 0");
    const r = cli(["export", join(ws, "deck.md"), "--formats", "pptx", "--json"], { env: { PATH: `${bin}:${NODE_DIR}:/bin:/usr/bin` } });
    expect(r.status).toBe(5);
    expect(r.json.message).toBe("pandoc could not write its default reference deck: pandoc: the last line says what broke");
  });
});
