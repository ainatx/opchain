// The tester-pack export fixtures (ow-tools design table row 18; the ow-uat Sprint 3
// contract C15): every ow-uat golden pack, one per tester role, and every sign-off
// request pass the export preflight (Node only, so it always runs) and export to
// PDF and Word with pandoc and Typst. Without them the real-binary half skips, and
// says so.
import { afterAll, describe, expect, it } from "vitest";
import { cpSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { preflight } from "../../plugins/ow-tools/lib/preflight.mjs";
import { ROOT, cleanup, cli, has, pdfText, tempDir, unzipText } from "./helpers.js";

afterAll(cleanup);
const SPAWN = { timeout: 60_000 };
const FX = join(ROOT, "tests", "fixtures", "ow-uat");
const docs = [];
for (const c of readdirSync(FX)) {
  const dir = join(FX, c, "expected", "opchain-work", "uat");
  if (!existsSync(dir)) continue;
  for (const slug of readdirSync(dir)) for (const f of readdirSync(join(dir, slug))) {
    if (/^uat-pack-[a-z-]+\.md$|^signoff-request-\d+\.md$/.test(f)) docs.push({ c, slug, f, path: join(dir, slug, f) });
  }
}
const ready = has("pandoc") && has("typst") && has("zip") && has("unzip");

describe("ow-uat packs and sign-off requests: the export preflight (any machine)", () => {
  it("there is a pack per tester role and the sign-off requests", () => {
    const packs = docs.filter((d) => d.f.startsWith("uat-pack-")).map((d) => `${d.slug}/${d.f}`);
    for (const p of ["larkspur-ceramics/uat-pack-order-coordinator.md", "larkspur-ceramics/uat-pack-operations-manager.md", "larkspur-ceramics/uat-pack-bookkeeper.md", "mossgate-books/uat-pack-shop-manager.md"]) expect(packs).toContain(p);
    expect(docs.filter((d) => d.f.startsWith("signoff-request-")).length).toBeGreaterThanOrEqual(4);
  });
  for (const d of docs) {
    it(`${d.c}: ${d.f} passes the preflight, with its header and internal section removed`, () => {
      const r = preflight(readFileSync(d.path, "utf8"), d.path);
      expect(r.problems ?? [], JSON.stringify(r.problems)).toEqual([]);
      expect(r.ok).toBe(true);
      expect(r.body).not.toMatch(/ow_artefact|written_by|Same-session self-check/);
      expect(r.removedSections).toBe(1);
      expect(r.title).toMatch(/^(?:User acceptance testing: .+ pack, |Sign-off request \d+: )/);
    });
  }
});

describe.skipIf(!ready)("ow-uat packs and sign-off requests: a real export (pandoc + Typst installed)", SPAWN, () => {
  const sample = docs.filter((d) => ["pack", "m-pack", "signoff-request-2", "m-signoff-request"].includes(d.c));
  for (const d of sample) {
    it(`${d.c}: ${d.f} exports to PDF and Word, without the internal section`, () => {
      const ws = tempDir("owt-uat-");
      cpSync(d.path, join(ws, d.f));
      const r = cli(["export", join(ws, d.f), "--json"]);
      expect(r.status, r.stdout + r.stderr).toBe(0);
      expect(r.json.status).toBe("done");
      const base = d.f.replace(/\.md$/, "");
      const pdf = pdfText(readFileSync(join(ws, "export", `${base}.pdf`)));
      expect(pdf).toContain("/StructTreeRoot");
      const doc = unzipText(join(ws, "export", `${base}.docx`), "word/document.xml");
      expect(doc).not.toMatch(/Same-session self-check|ow_artefact|written_by/);
      expect(doc).toContain("w:tblHeader");
    });
  }
});

describe.runIf(!ready)("the real-binary export skips without pandoc and Typst, and says so", () => {
  it("names what is missing", () => {
    const r = cli(["version", "--json"]);
    expect(r.json.capabilities.export.ready).toBe(false);
    console.log("ow-uat pack export: skipped, pandoc and Typst are not installed here (the preflight above still ran)");
  });
});
