// The documentation export fixtures (ow-tools design §4.2's -export row; the ow-documentation OW-05 contract
// C9, C13, C15): every ow-documentation golden client document and every repository copy passes the export
// preflight (Node only, so it always runs); every deck passes the deck rules; every golden capture plan passes
// ow-tools' own plan validator (no browser). A guide exports to PDF and Word and the deck to PPTX with pandoc
// and Typst; without them the real-binary half skips, and says so.
import { afterAll, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { preflight } from "../../plugins/ow-tools/lib/preflight.mjs";
import { deckChecks } from "../../plugins/ow-tools/lib/pptx.mjs";
import { readPlan } from "../../plugins/ow-tools/lib/capture.mjs";
import { ROOT, cleanup, cli, has, png, tempDir, unzipText } from "./helpers.js";

afterAll(cleanup);
const SPAWN = { timeout: 120_000 };
const FX = join(ROOT, "tests", "fixtures", "ow-documentation");
const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));

// Every client document a golden wrote (guides, SOPs, runbook, handover, the training kit), and every repo copy.
const docs = [], copies = [], plans = [];
const seen = new Set();
for (const c of readdirSync(FX).filter((n) => existsSync(join(FX, n, "expected")))) {
  for (const f of walk(join(FX, c, "expected"))) {
    const rel = relative(join(FX, c, "expected"), f);
    const text = readFileSync(f, "utf8");
    if (/\/capture-plan\.json$/.test(rel)) plans.push({ c, rel, json: JSON.parse(text) });
    if (seen.has(text)) continue;
    if (/^opchain-work\/docs\/[^/]+\/(?:guides|sops|handover|training)\/.+\.md$|^opchain-work\/docs\/[^/]+\/runbook\.md$/.test(rel)) { seen.add(text); docs.push({ c, rel, text }); }
    if (/^larkspur-repo\/docs\/(?:client-handbook|handover)\/.+\.md$|^opchain-work\/docs\/[^/]+\/export\/markdown\/.+\.md$/.test(rel)) { seen.add(text); copies.push({ c, rel, text }); }
  }
}
/** Lay a document out with a real PNG at every image it names (the repository never holds one). */
function layOut(d) {
  const ws = tempDir("owt-doc-");
  const path = join(ws, d.rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, d.text);
  for (const m of d.text.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const img = resolve(dirname(path), m[1]);
    if (!img.startsWith(ws)) continue;
    mkdirSync(dirname(img), { recursive: true });
    writeFileSync(img, png());
  }
  return path;
}
const ready = has("pandoc") && has("typst") && has("zip") && has("unzip");

describe("ow-documentation documents: the export preflight and the deck rules (any machine)", () => {
  it("every document type has goldens, for both clients", () => {
    for (const t of ["guides/", "sops/", "runbook.md", "handover/", "training/deck.md", "training/facilitator.md", "training/modules/", "training/cards/", "training/videos/"]) expect(docs.some((d) => d.rel.includes(t)), t).toBe(true);
    expect(docs.some((d) => d.rel.includes("/mossgate-books/"))).toBe(true);
    expect(copies.length).toBeGreaterThanOrEqual(16);
  });
  for (const d of docs) {
    it(`${d.c}: ${d.rel.split("/").slice(3).join("/")} passes the preflight, its header and internal section removed`, () => {
      const r = preflight(d.text, layOut(d));
      expect(r.problems ?? [], JSON.stringify(r.problems)).toEqual([]);
      expect(r.ok).toBe(true);
      expect(r.body).not.toMatch(/ow_artefact|written_by|Same-session self-check|ow:internal/);
      expect(r.removedSections).toBe(1);
      if (/\/deck\.md$/.test(d.rel)) expect(deckChecks(r.lines).problems).toEqual([]);
    });
  }
  for (const d of copies) {
    it(`${d.c}: the repo copy ${d.rel} passes the preflight, with no ow- header or internal section`, () => {
      const r = preflight(d.text, layOut(d));
      expect(r.problems ?? [], JSON.stringify(r.problems)).toEqual([]);
      expect(d.text).not.toMatch(/^ow_artefact:|ow:internal|Same-session self-check/m);
    });
  }
  it("a slide with two images fails the deck rules, and an internal line in a speaker note fails the preflight", () => {
    const deck = docs.find((d) => /\/deck\.md$/.test(d.rel));
    const two = deck.text.replace("![The orders mailbox with new purchase orders](../shots/SC-01-1.png)\n", "![The orders mailbox with new purchase orders](../shots/SC-01-1.png)\n![The order sheet](../shots/SC-01-2.png)\n");
    expect(two).not.toBe(deck.text);
    expect(deckChecks(preflight(two, layOut({ ...deck, text: two })).lines).problems.length).toBeGreaterThan(0);
    const note = deck.text.replace("::: notes\nAsk each person their role;", "::: notes\n<!-- ow:internal -->\nAsk each person their role;");
    expect(note).not.toBe(deck.text);
    const r = preflight(note, layOut({ ...deck, text: note }));
    expect(r.ok && deckChecks(r.lines).problems.length === 0).toBe(false);
  });
});

describe("ow-documentation capture plans: ow-tools' own validator (no browser)", () => {
  it("every golden capture plan, the production one included", () => {
    expect(new Set(plans.map((p) => p.c)).size).toBeGreaterThanOrEqual(5);
    expect(plans.some((p) => p.json.environment === "production")).toBe(true);
    for (const p of plans) expect(() => readPlan(p.json), `${p.c}`).not.toThrow();
  });
  it("production without the decision, an http:// origin and a step outside the origins are refused", () => {
    const prod = plans.find((p) => p.json.environment === "production").json;
    const { decision, ...noDecision } = prod;
    expect(decision).toBeTruthy();
    expect(() => readPlan(noDecision)).toThrow(/decision/);
    const uat = plans.find((p) => p.json.environment === "uat").json;
    expect(() => readPlan({ ...uat, allowed_origins: ["http://orders-staging.larkspur.example"] })).toThrow();
    expect(() => readPlan({ ...uat, steps: [{ id: "SC-01-1", do: "navigate", url: "https://elsewhere.example/" }] })).toThrow();
  });
});

describe.skipIf(!ready)("ow-documentation documents: a real export (pandoc + Typst installed)", SPAWN, () => {
  it("a guide exports to PDF and Word, without the internal section", () => {
    const d = docs.find((x) => /\/guides\/order-coordinator\.md$/.test(x.rel) && x.c === "write-guides");
    const path = layOut(d);
    const r = cli(["export", path, "--out", join(dirname(path), "..", "export", "guides"), "--json"]);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(r.json.status).toBe("done");
    expect(existsSync(r.json.outputs.pdf)).toBe(true);
    const doc = unzipText(r.json.outputs.docx, "word/document.xml");
    expect(doc).not.toMatch(/Same-session self-check|ow_artefact|written_by/);
  });
  for (const t of ["sops/", "runbook.md", "handover/", "training/facilitator.md", "training/modules/", "training/cards/", "training/videos/"]) {
    it(`a ${t.replace(/\/$|\.md$/, "").replace("training/", "")} document exports to PDF and Word into its type's folder`, () => {
      const d = docs.find((x) => x.rel.includes(`/${t}`) && x.rel.includes("/larkspur-ceramics/"));
      const path = layOut(d);
      const r = cli(["export", path, "--out", join(dirname(path), "export-check"), "--json"]);
      expect(r.status, r.stdout + r.stderr).toBe(0);
      expect(Object.keys(r.json.outputs).sort()).toEqual(["docx", "pdf"]);
      expect(unzipText(r.json.outputs.docx, "word/document.xml")).not.toMatch(/Same-session self-check|ow_artefact|written_by/);
    });
  }
  it("the deck exports to PPTX with --formats pptx", () => {
    const d = docs.find((x) => /\/training\/deck\.md$/.test(x.rel));
    const path = layOut(d);
    const r = cli(["export", path, "--formats", "pptx", "--out", join(dirname(path), "..", "export", "training"), "--json"]);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(r.json.status).toBe("done");
    expect(r.json.slides).toBeGreaterThan(5);
    expect(existsSync(r.json.outputs.pptx)).toBe(true);
  });
  it("text after a slide's image makes pandoc split the slide, and the export refuses the deck (the checker's deck rule)", () => {
    const d = docs.find((x) => /\/training\/deck\.md$/.test(x.rel));
    const text = d.text.replace("Came up in testing: UAT-01.\n\n![The exceptions list with lines waiting](../shots/SC-10-1.png)\n", "![The exceptions list with lines waiting](../shots/SC-10-1.png)\n\nCame up in testing: UAT-01.\n");
    expect(text).not.toBe(d.text);
    const path = layOut({ ...d, text });
    const r = cli(["export", path, "--formats", "pptx", "--out", join(dirname(path), "..", "export", "training"), "--json"]);
    expect(r.status).not.toBe(0);
    expect(r.stdout + r.stderr).toMatch(/pandoc made \d+ slides from \d+ slide headings/);
  });
});

describe.runIf(!ready)("the real-binary export skips without pandoc and Typst, and says so", () => {
  it("names what is missing", () => {
    const r = cli(["version", "--json"]);
    expect(r.json.capabilities.export.ready).toBe(false);
    console.log("ow-documentation export: skipped, pandoc and Typst are not installed here (the preflight above still ran)");
  });
});
