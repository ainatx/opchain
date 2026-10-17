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
import { PANDOC_FROM, exportDoc, imagesPandocReads } from "../../plugins/ow-tools/lib/export.mjs";
import { PANDOC_DECK_FROM } from "../../plugins/ow-tools/lib/pptx.mjs";
import { preflight } from "../../plugins/ow-tools/lib/preflight.mjs";
import { fromMinor, toMinor, total } from "../../plugins/ow-tools/lib/calc.mjs";
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

  // P03 was an equivalent mutant: this pandoc already marks the header row.
  // A pandoc that doesn't (a stand-in that strips the mark from real output)
  // shows ow-tools sets it itself.
  it("P03: a header row pandoc left unmarked is marked by ow-tools", () => {
    const ws = deckWorkspace();
    const real = spawnSync("sh", ["-c", "command -v pandoc"], { encoding: "utf8" }).stdout.trim();
    const bin = join(tempDir(), "bin");
    mkdirSync(bin);
    const log = join(bin, "stripped.log");
    writeFileSync(
      join(bin, "pandoc"),
      `#!/bin/sh\n"${real}" "$@" || exit $?\nout=""; prev=""; pptx=0\nfor a in "$@"; do\n  [ "$prev" = "-o" ] && out="$a"\n  [ "$prev" = "-t" ] && [ "$a" = "pptx" ] && pptx=1\n  prev="$a"\ndone\n[ "$pptx" = 1 ] || exit 0\nd=$(mktemp -d)\ncd "$d" && unzip -q "$out" && for f in ppt/slides/slide*.xml; do sed 's/ firstRow="1"//g' "$f" > "$f.x" && mv "$f.x" "$f"; done && rm -f "$out" && zip -q -r -X "$out" . && echo stripped >> "${log}"\ncd / && rm -rf "$d"\n`,
      { mode: 0o755 },
    );
    const r = cli(["export", join(ws, "deck.md"), "--formats", "pptx", "--json"], { env: { PATH: `${bin}:${process.env.PATH}` } });
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(readFileSync(log, "utf8")).toContain("stripped");
    const tables = Object.values(pptxParts(r.json.outputs.pptx)).join("\n").match(/<a:tblPr[^>]*>/g);
    expect(tables.length).toBeGreaterThan(0);
    for (const t of tables) expect(t).toContain('firstRow="1"');
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
    expect(r.json.message).toBe("pandoc could not read the document: pandoc: the last line says what broke");
  });
});

// ---- Sprint T round 2 -------------------------------------------------------------

describe("round 2: xlsx bounds, scoping and markers (X04–X07, F-019, SA-018)", SPAWN, () => {
  const run = (mutate) => {
    const src = sheetCopy();
    mutate(src);
    return { src, r: cli(["export", src, "--formats", "xlsx", "--json"]) };
  };
  const model = (src, fn) => writeFileSync(join(src, "model.md"), fn(readFileSync(join(src, "model.md"), "utf8")));
  const setD5 = (src, cell, formula) => model(src, (m) => m.replace("| D5 | =SUM(D2:D4) | currency:USD |", `| ${cell} | ${formula} | currency:USD |`));

  it("X04: a CSV over 10 MB is refused (exit 2) before it is read", () => {
    const { r } = run((s) => writeFileSync(join(s, "Costs.csv"), `Item,Units\n${"x,1\n".repeat(2_700_000)}`));
    expect(r.status).toBe(2);
    expect(r.json.message).toBe("Costs.csv is over 10 MB");
  });

  it.each([["=SUM(E2:E4)"], ["=Z2"], ["=Rates!C2"]])("X05: a reference past the sheet's columns (%s) is unknown-cell", (f) => {
    const { r } = run((s) => setD5(s, "D5", f));
    expect(r.status).toBe(4);
    expect(r.json).toMatchObject({ reason: "unknown-cell", cell: "Costs!D5" });
  });

  it.each([['=IMPORTXML("https://example.test","//a")'], ['=IMAGE("https://example.test/x.png")'], ['=IMPORTDATA("https://example.test")'], ['=FILTERXML("<a/>","//a")']])("X06: %s is refused as reaching outside the workbook", (f) => {
    const { r } = run((s) => setD5(s, "D5", f));
    expect(r.status).toBe(4);
    expect(r.json.reason).toBe("dde-or-link-formula");
  });

  it("X07: a formula in the header row is refused", () => {
    const { r } = run((s) => setD5(s, "D1", "=1+1"));
    expect(r.status).toBe(4);
    expect(r.json).toMatchObject({ reason: "formula-in-header", cell: "Costs!D1" });
  });

  it.each([["A1048577"], ["XFE5"], ["A9999999"]])("F-019: a mapped cell past Excel's grid (%s) is refused", (cell) => {
    const { r, src } = run((s) => setD5(s, cell, "=1"));
    expect(r.status).toBe(2);
    expect(existsSync(join(src, "..", "export"))).toBe(false);
  });

  it("F-019: the last cell of the grid is written at once, not by walking 17 billion cells", () => {
    const t0 = Date.now();
    const { r } = run((s) => setD5(s, "XFD1048576", "=1"));
    expect(r.status, r.stdout).toBe(0);
    expect(Date.now() - t0).toBeLessThan(10_000);
    expect(unzipAll(readFileSync(r.json.outputs.xlsx))["xl/worksheets/sheet1.xml"]).toContain('<dimension ref="A1:XFD1048576"/>');
  });

  it("F-019: a CSV row wider than a worksheet is refused", () => {
    const { r } = run((s) => writeFileSync(join(s, "Costs.csv"), `${"h,".repeat(16384)}h\n`));
    expect(r.status).toBe(2);
    expect(r.json.message).toMatch(/^Costs\.csv row 1 has more columns than a worksheet holds/);
  });

  it.each([
    ["an ow:internal section", "<!-- ow:internal -->\n## Sheet: Margin\n\n| Cell | Formula | Format |\n| --- | --- | --- |\n<!-- ow:end-internal -->\n"],
    ["a misspelt marker", "<!-- OW: Internal-only -->\n"],
    ["an unclosed comment mentioning internal", "<!-- internal pricing below\n"],
  ])("SA-018: model.md with %s is refused, naming the line", (_, block) => {
    const { r, src } = run((s) => {
      writeFileSync(join(s, "Margin.csv"), "Unit,Cost\nx,61.50\n");
      model(s, (m) => `${m}\n${block}`);
    });
    expect(r.status).toBe(4);
    expect(r.json.reason).toBe("preflight");
    expect(r.json.message).toMatch(/^model\.md line \d+: an internal-section marker/);
    expect(r.stdout).not.toContain("61.50");
    expect(existsSync(join(src, "..", "export"))).toBe(false);
  });

  it("SA-018: a CSV that model.md doesn't name never ships (exit 4, sheet-not-in-model since OD-8)", () => {
    const { r, src } = run((s) => writeFileSync(join(s, "Margin.csv"), "Unit,Cost\nx,61.50\n"));
    expect(r.status).toBe(4);
    expect(r.json).toMatchObject({ reason: "sheet-not-in-model", sheet: "Margin" });
    expect(existsSync(join(src, "..", "export"))).toBe(false);
  });
});

describe("round 2: C8 cell by cell (real soffice)", SPAWN, () => {
  it("every computed cell LibreOffice recalculates equals what ow-tools calc computes", (ctx) => {
    if (!has("soffice")) {
      ctx.skip("LibreOffice (soffice) is not installed; C8 is a real-binary check");
      return;
    }
    const src = sheetCopy();
    const r = cli(["export", src, "--formats", "xlsx", "--json"]);
    const out = join(src, "..", "csv");
    mkdirSync(out);
    // Every sheet to its own CSV (LibreOffice 7.2+), raw values, UTF-8.
    spawnSync("soffice", ["--headless", "--convert-to", 'csv:Text - txt - csv (StarCalc):44,34,76,1,,0,false,true,false,false,false,-1', "--outdir", out, r.json.outputs.xlsx], { encoding: "utf8", timeout: 120000 });
    const sheet = (name) => {
      const f = readdirSync(out).find((n) => n.includes(name) && n.endsWith(".csv"));
      expect(f, `LibreOffice wrote the ${name} sheet`).toBeTruthy();
      return readFileSync(join(out, f), "utf8").trim().split(/\r?\n/).map((l) => l.split(","));
    };
    const costs = sheet("Costs");
    const rates = sheet("Rates");
    const lines = [["2", "1500.00"], ["1", "2500.50"], ["3", "400.00"]].map(([quantity, unit_price], k) => ({ label: `line ${k + 1}`, quantity: Number(quantity), unit_price }));
    const each = lines.map((l) => total({ items: [l] }).total);
    const sum = total({ items: lines }).total;
    const withContingency = fromMinor((toMinor(sum) * 110n + 50n) / 100n); // ROUND(x × 1.1, 2), half up
    const num = (s) => Number(String(s).replace(/"/g, ""));
    each.forEach((v, k) => expect(num(costs[k + 1][3]), `Costs!D${k + 2}`).toBe(Number(v)));
    expect(num(costs[4][3]), "Costs!D5").toBe(Number(sum));
    expect(num(rates[2][1]), "Rates!B3").toBe(Number(withContingency));
  });
});

describe("round 2: export failures leave export/ as it was (Bug 4, SA-017, E01)", SPAWN, () => {
  it.each([["---"], ["***"], ["___"], ["- - -"]])("Bug 4: a deck line %s is refused before pandoc runs", (rule) => {
    const ws = deckWorkspace();
    write(join(ws, "rule.md"), `# Deck\n\n## One\n\nFirst part.\n\n${rule}\n\nSecond part.\n\n## Two\n\nB.\n`);
    const r = cli(["export", join(ws, "rule.md"), "--formats", "pptx", "--json"]);
    expect(r.status).toBe(4);
    expect(r.json.problems).toEqual(["line 7: a line of ---, *** or ___ (a thematic break or a setext heading) would start an extra slide; use ## headings for slides"]);
    expect(existsSync(join(ws, "export"))).toBe(false);
  });

  it.skipIf(!(pptxReady && has("typst")))("Bug 4: when a later format fails, export/ keeps the previous good files and gets nothing new", () => {
    const ws = deckWorkspace();
    const good = cli(["export", join(ws, "deck.md"), "--formats", "pptx", "--json"]);
    expect(good.status).toBe(0);
    const before = Object.fromEntries(readdirSync(join(ws, "export")).map((n) => [n, readFileSync(join(ws, "export", n)).toString("base64")]));
    // pandoc and Typst work; zip fails, so the PowerPoint part fails after the PDF was built.
    const bin = join(tempDir(), "bin");
    mkdirSync(bin);
    for (const t of ["pandoc", "typst", "unzip"]) symlinkSync(spawnSync("sh", ["-c", `command -v ${t}`], { encoding: "utf8" }).stdout.trim(), join(bin, t));
    symlinkSync(process.execPath, join(bin, "node"));
    stub(bin, "zip", 'echo "zip: no space left" >&2; exit 9');
    const r = cli(["export", join(ws, "deck.md"), "--formats", "pdf,pptx", "--json"], { env: { PATH: `${bin}:/bin` } });
    expect(r.status, r.stdout).toBe(5);
    const after = Object.fromEntries(readdirSync(join(ws, "export")).map((n) => [n, readFileSync(join(ws, "export", n)).toString("base64")]));
    expect(after).toEqual(before); // no deck.pdf, no unbranded deck, the record unchanged
  });

  it.skipIf(!(pptxReady && has("typst")))("E01: PDF, Word and PowerPoint exports are written 0600", () => {
    const ws = deckWorkspace();
    const r = cli(["export", join(ws, "deck.md"), "--formats", "pdf,docx,pptx", "--json"]);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    for (const f of ["pdf", "docx", "pptx"]) expect(statSync(r.json.outputs[f]).mode & 0o777, f).toBe(0o600);
    expect(statSync(r.json.record).mode & 0o777).toBe(0o600);
  });
});

describe("round 2: image containment by pandoc's own reading (SA-010 / F-012)", SPAWN, () => {
  const CANARY = "ZQ-IMAGE-CANARY-7731";
  function poc(form) {
    const root = tempDir();
    const secret = write(join(root, "elsewhere", "private.png"), "");
    writeFileSync(secret, Buffer.concat([png(4, 4), Buffer.from(CANARY)]));
    const key = write(join(root, "id_test_key"), `${CANARY}\n`);
    const md = write(join(root, "doc", "deck.md"), `# Title\n\n## Slide one\n\n${form(secret, key)}\n`);
    return { root, md };
  }
  const FORMS = [
    ["brackets in the alt text", (p) => `![a [b] c](${p})`],
    ["a single-quoted title", (p) => `![alt](${p} 'title')`],
    ["a shortcut reference", (p) => `![logo]\n\n[logo]: ${p}`],
    ["a collapsed reference", (p) => `![logo][]\n\n[logo]: ${p}`],
    ["a non-image key file", (_, k) => `![key](${k} 'x')`],
  ];
  it.each(FORMS.flatMap(([n, f]) => ["pptx", "docx", "pdf"].map((fmt) => [n, fmt, f])))("refuses %s (%s) and embeds nothing", (_, fmt, form) => {
    const { root, md } = poc(form);
    const r = cli(["export", md, "--formats", fmt, "--json"]);
    expect(r.status, r.stdout).toBe(4);
    expect(r.json.reason).toBe("preflight");
    // The preflight names the line itself; pandoc's AST check is the second layer.
    expect(r.json.problems[0]).toMatch(/^line 5: (an image not written as !\[alt\]\(file\)|reference-style images are not supported)/);
    expect(existsSync(join(root, "doc", "export"))).toBe(false);
  });

  it.skipIf(!has("pandoc"))("the pandoc check alone catches a reference image the line check never saw", () => {
    const d = tempDir();
    const f = write(join(d, "doc.md"), "# T\n\n![logo]\n\n[logo]: /etc/hosts\n\n![ok](assets/img-0.png)\n");
    let err;
    try {
      imagesPandocReads(f, "gfm-autolink_bare_uris", new Set(["assets/img-0.png"]), d);
    } catch (e) {
      err = e;
    }
    expect(err?.extra?.reason).toBe("unchecked-image"); // its own reason since round 3
    expect(err.message).toMatch(/1 image\(s\) pandoc would read are not in the form/);
    expect(imagesPandocReads(write(join(d, "ok.md"), "# T\n\n![ok](assets/img-0.png)\n"), "gfm-autolink_bare_uris", new Set(["assets/img-0.png"]), d)).toEqual(["assets/img-0.png"]);
  });
});

// ---- Sprint T round 3 -------------------------------------------------------------

describe("round 3: YAML metadata never reaches an export (Bug 1, R29)", SPAWN, () => {
  const CANARY = "ZQ-META-CANARY-5521";
  // The evaluator's repro: an ow- header, a banner, then a YAML block whose
  // abstract is Markdown holding an escaped image of a file outside the folder.
  function repro(form = "hdr") {
    const root = tempDir();
    const secret = join(root, "secret", "client-secret.png");
    mkdirSync(join(root, "secret"));
    writeFileSync(secret, Buffer.concat([png(4, 4), Buffer.from(CANARY)]));
    const yaml = `---\nabstract: "!\\x5Bdiagram](${secret})"\n...\n`;
    const text = {
      hdr: `---\now_artefact: ow-documentation/guide\nschema: 1\n---\nCONFIDENTIAL — Acme\n\n${yaml}\n# Guide\n\n## Steps\n\nDo the thing.\n`,
      top: `${yaml}\n# Guide\n\n## Steps\n\nDo the thing.\n`,
      mid: `# Guide\n\nIntro text.\n\n${yaml}\n## Steps\n\nDo the thing.\n`,
    }[form];
    const md = write(join(root, "ws", "opchain-work", "docs", "acme", `${form}.md`), text);
    return { root, md, secret };
  }

  it.each(["pdf", "docx", "pptx"].flatMap((fmt) => ["hdr", "top", "mid"].map((form) => [form, fmt])))("the %s YAML block is refused before pandoc runs (%s), naming its line", (form, fmt) => {
    const { md } = repro(form);
    const r = cli(["export", md, "--formats", fmt, "--json"]);
    expect(r.status, r.stdout).toBe(4);
    expect(r.json.reason).toBe("preflight");
    expect(r.json.problems.join("\n")).toMatch(/line \d+: a YAML metadata block is not exported/);
    expect(existsSync(join(md, "..", "export"))).toBe(false);
  });

  it("a horizontal rule, a paragraph with a colon and another rule are not a YAML block", () => {
    const d = tempDir();
    const md = write(join(d, "doc.md"), "# T\n\nIntro.\n\n---\n\nNote: this is text.\n\n---\n\nEnd.\n");
    expect(preflight(readFileSync(md, "utf8"), md).problems).toEqual([]);
  });

  it.skipIf(!has("pandoc"))("pandoc's readers read no YAML metadata, and the image check walks the metadata when a reader does", () => {
    const { root, md } = repro("top");
    for (const from of [PANDOC_FROM, PANDOC_DECK_FROM]) {
      expect(from).toMatch(/-yaml_metadata_block$/);
      const ast = JSON.parse(spawnSync("pandoc", [md, "-f", from, "-t", "json"], { encoding: "utf8" }).stdout);
      expect(ast.meta, from).toEqual({});
      expect(imagesPandocReads(md, from, new Set(), root), from).toEqual([]);
      // The second layer: a reader with metadata on still can't slip an image past.
      let err = null;
      try {
        imagesPandocReads(md, `${from}+yaml_metadata_block`, new Set(), root);
      } catch (e) {
        err = e;
      }
      expect(err?.extra?.reason, from).toBe("unchecked-image");
    }
  });

  const bypass = (text, src) => ({ ...preflight(text, src), problems: [] });
  it.skipIf(!(has("pandoc") && has("zip") && has("unzip")))("with the preflight bypassed, Word gets the block as text and embeds nothing", async () => {
    const { md } = repro("hdr");
    const r = await exportDoc({ file: md, formats: ["docx"] }, { preflight: bypass });
    const parts = unzipAll(readFileSync(r.outputs.docx));
    expect(Object.keys(parts).filter((n) => n.startsWith("word/media/"))).toEqual([]);
    expect(Object.values(parts).join("")).not.toContain(CANARY);
  });

  it.skipIf(!(has("pandoc") && has("typst")))("with the preflight bypassed, the PDF embeds nothing either", async () => {
    const { md } = repro("hdr");
    const r = await exportDoc({ file: md, formats: ["pdf"] }, { preflight: bypass });
    expect(readFileSync(r.outputs.pdf).includes(Buffer.from(CANARY))).toBe(false);
  });

  // R29: the pandoc AST check reached directly, for every format, with a
  // preflight that sees nothing wrong.
  it.skipIf(!(has("pandoc") && has("zip") && has("unzip")))("R29: with the preflight bypassed, the pandoc check alone refuses an image outside the folder (pdf, docx, pptx)", async () => {
    for (const fmt of ["pdf", "docx", "pptx"]) {
      const root = tempDir();
      const secret = write(join(root, "elsewhere", "private.png"), "");
      writeFileSync(secret, Buffer.concat([png(4, 4), Buffer.from(CANARY)]));
      const md = write(join(root, "doc", "deck.md"), `# Title\n\n## Slide one\n\n![logo]\n\n[logo]: ${secret}\n`);
      const err = await exportDoc({ file: md, formats: [fmt] }, { preflight: bypass }).catch((e) => e);
      expect(err?.extra?.reason, fmt).toBe("unchecked-image");
      expect(existsSync(join(root, "doc", "export")), fmt).toBe(false);
    }
  });
});

describe("round 3: escaped backticks open no code span (Bug 8)", SPAWN, () => {
  it.each([
    ["an escaped pair", "See \\`<img src=\"/etc/hosts\" alt=\"x\">\\` here."],
    ["an escaped opener", "See \\`<b>x</b>` here."],
    ["a double escape", "See \\`\\`<i>x</i>\\`\\` here."],
  ])("refuses raw HTML behind %s", (_, line) => {
    const d = tempDir();
    const md = write(join(d, "doc.md"), `# T\n\n${line}\n`);
    expect(preflight(readFileSync(md, "utf8"), md).problems).toEqual(["line 3: raw HTML is not exported; use Markdown"]);
  });

  it.each(["pdf", "docx", "pptx"])("the evaluator's repro is refused (%s)", (fmt) => {
    const d = tempDir();
    const md = write(join(d, "doc.md"), "# Guide\n\n## Steps\n\nSee \\`<img src=\"/etc/hosts\" alt=\"x\">\\` here.\n");
    const r = cli(["export", md, "--formats", fmt, "--json"]);
    expect(r.status).toBe(4);
    expect(r.json.problems).toEqual(["line 5: raw HTML is not exported; use Markdown"]);
  });

  it("a real code span with HTML in it is still fine", () => {
    const d = tempDir();
    const md = write(join(d, "doc.md"), "# T\n\nWrite `<div>` or ``a ` <span> `` in code.\n");
    expect(preflight(readFileSync(md, "utf8"), md).problems).toEqual([]);
  });
});

describe("round 3: OD-8, a CSV the model doesn't name has its own reason", SPAWN, () => {
  function run(change) {
    const src = sheetCopy();
    change(src);
    return { r: cli(["export", src, "--formats", "xlsx", "--json"]), src };
  }
  it("sheet-not-in-model for a CSV with no section; unknown-sheet for a section with no CSV", () => {
    const a = run((s) => writeFileSync(join(s, "Margin.csv"), "Unit,Cost\nx,61.50\n"));
    expect(a.r.json).toMatchObject({ reason: "sheet-not-in-model", sheet: "Margin" });
    const b = run((s) => writeFileSync(join(s, "model.md"), `${readFileSync(join(s, "model.md"), "utf8")}\n## Sheet: Extra\n\n| Cell | Formula | Format |\n| --- | --- | --- |\n| B2 | | integer |\n`));
    expect(b.r.status).toBe(4);
    expect(b.r.json.reason).toBe("unknown-sheet");
  });
});

// The 1.1.0 re-review's PoCs (docs/audits/2026-10-16-ow-tools-1.1-security-posture.md),
// each a permanent test: PoC 3 and 12 (image forms), 12b (a reference
// definition beside a good inline image) and 4 (Excel bounds, formulas).
describe("round 3: the re-review's image and workbook PoCs", SPAWN, () => {
  const CANARY = "ZQ-OUTSIDE-FILE-CANARY";
  const LEGIT = "ZQ-LEGIT-ONLY";
  const marked = (label) => Buffer.concat([png(4, 4), Buffer.from(label)]);
  function doc(form) {
    const root = tempDir();
    const secret = join(root, "outside", "private.png");
    mkdirSync(join(root, "outside"));
    writeFileSync(secret, marked(CANARY));
    mkdirSync(join(root, "doc"));
    writeFileSync(join(root, "doc", "img-ok.png"), marked(LEGIT));
    const md = write(join(root, "doc", "deck.md"), `# Title\n\n## Slide one\n\n${form(secret)}\n`);
    return { root, md };
  }
  const REFUSED = [
    ["PoC 3: nested brackets", (p) => `![a [b] c](${p})`, /an image not written as/],
    ["PoC 3: a single-quoted title", (p) => `![alt](${p} 'title')`, /an image not written as/],
    ["PoC 3: a shortcut reference", (p) => `![logo]\n\n[logo]: ${p}`, /reference-style images are not supported|an image not written as/],
    ["PoC 3: an angle-bracket path", (p) => `![alt](<${p}>)`, /raw HTML is not exported|an image/],
    ["PoC 12: an HTML img", (p) => `<img src="${p}" alt="x">`, /raw HTML is not exported/],
    ["PoC 12: a raw HTML block", (p) => `<div><img src="${p}"></div>`, /raw HTML is not exported/],
    ["PoC 12: a data URI", () => "![x](data:image/png;base64,iVBORw0KGgo=)", /an image/],
    ["PoC 12: an image in an HTML comment", (p) => `<!-- ![x](${p}) -->`, /an image/],
  ];
  it.skipIf(!pptxReady).each(REFUSED.flatMap(([n, f, why]) => ["pptx", "docx"].map((fmt) => [n, fmt, f, why])))("%s (%s) is refused and embeds nothing", (_, fmt, form, why) => {
    const { root, md } = doc(form);
    const r = cli(["export", md, "--formats", fmt, "--json"]);
    expect(r.status, r.stdout).toBe(4);
    expect(r.json.problems.join("\n")).toMatch(why);
    expect(existsSync(join(root, "doc", "export"))).toBe(false);
  });

  it.skipIf(!pptxReady).each(["pptx", "docx"])("PoC 12b: a reference definition beside a good inline image embeds only the good image (%s)", (fmt) => {
    const { md } = doc((p) => `![good](img-ok.png)\n\n[good]: ${p}`);
    const r = cli(["export", md, "--formats", fmt, "--json"]);
    expect(r.status, r.stdout).toBe(0);
    const parts = unzipAll(readFileSync(r.json.outputs[fmt]));
    const media = Object.keys(parts).filter((n) => /^(ppt|word)\/media\//.test(n));
    expect(media.length).toBeGreaterThan(0);
    const raw = readFileSync(r.json.outputs[fmt]);
    // Stored or deflated, the outside file's bytes never reach the package.
    for (const n of media) expect(parts[n].includes(CANARY), n).toBe(false);
    expect(raw.includes(Buffer.from(CANARY))).toBe(false);
  });

  it("PoC 4: cells past Excel's grid are refused, a far cell inside it costs one cell, and DDE or _xlfn web formulas are refused", () => {
    const mk = (cell) => ({ sheets: new Map([["S", { name: "S", rows: [["h1", "h2"], ["1", "2"]], map: new Map(), formats: [] }]]), order: ["S"], model: { title: null, banner: null, sheets: [{ name: "S", line: 1, cells: [{ line: 2, cell, formula: "=1", format: "" }] }] } });
    for (const cell of ["A1048577", "A9999999"]) expect(() => buildWorkbook(mk(cell)), cell).toThrow(/Cell column/);
    const t = Date.now();
    expect(buildWorkbook(mk("ZZ20000")).length).toBeLessThan(10000);
    expect(Date.now() - t).toBeLessThan(2000);
    const reason = (f) => {
      try {
        checkFormula(f, "S!B2");
        return "accepted";
      } catch (e) {
        return e.extra?.reason;
      }
    };
    expect(reason("=IF(1,\"=cmd|' /C calc'!A0\",0)")).toBe("dde-or-link-formula");
    expect(reason('=_xlfn.WEBSERVICE("x")')).toBe("formula-syntax");
    expect(reason("=SUM(A1)")).toBe("accepted");
  });
});
