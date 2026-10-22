// The handoff-notes export fixtures (ow-tools design §2 row 17, §4.2's ow-handoff -package row; OW-06 contract
// deliverable 6, moved to PR 2): every ow-handoff golden handoff-notes.md passes the export preflight (Node only,
// so it always runs), and its client copy (no ow-tools) carries no ow- header; with pandoc and Typst the notes
// export to PDF and Word through the real CLI. Without them the real-binary half skips, and says so. ow-tools
// takes no bump for these tests.
import { afterAll, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { preflight } from "../../plugins/ow-tools/lib/preflight.mjs";
import { ROOT, cleanup, cli, has, tempDir } from "./helpers.js";

afterAll(cleanup);
const FX = join(ROOT, "tests", "fixtures", "ow-handoff");
const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));
const notes = [], copies = [];
const seen = new Set();
for (const c of readdirSync(FX).filter((n) => existsSync(join(FX, n, "expected")))) {
  for (const f of walk(join(FX, c, "expected"))) {
    const rel = relative(join(FX, c, "expected"), f);
    const text = readFileSync(f, "utf8");
    if (seen.has(text)) continue;
    if (/^opchain-work\/handoffs\/[^/]+\/handoff-notes\.md$/.test(rel)) { seen.add(text); notes.push({ c, rel, text }); }
    if (/^opchain-work\/handoffs\/[^/]+\/export\/handoff-notes\.md$/.test(rel)) { seen.add(text); copies.push({ c, rel, text }); }
  }
}
const ready = has("pandoc") && has("typst");

describe("ow-handoff's Handoff notes: the export preflight (any machine)", () => {
  it("both clients have golden notes, and the no-ow-tools client copy exists", () => {
    expect(notes.some((d) => d.rel.includes("/larkspur-ceramics/"))).toBe(true);
    expect(notes.some((d) => d.rel.includes("/mossgate-books/"))).toBe(true);
    expect(copies.length).toBeGreaterThanOrEqual(1);
  });
  for (const d of notes) {
    it(`${d.c}: ${d.rel.split("/").slice(2).join("/")} passes the preflight, its ow- header removed`, () => {
      const ws = tempDir("owt-ho-");
      const p = join(ws, d.rel);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, d.text);
      const r = preflight(d.text, p);
      expect(r.problems ?? [], JSON.stringify(r.problems)).toEqual([]);
      expect(r.ok).toBe(true);
      expect(r.body).not.toMatch(/ow_artefact|written_by|ow:internal/);
    });
  }
  for (const d of copies) it(`${d.c}: the client copy has no ow- header or internal text`, () => expect(d.text).not.toMatch(/^---\n|ow_artefact|ow:internal/m));
});

describe(`the real export (${ready ? "pandoc and Typst present" : "SKIPPED: pandoc or Typst is not installed here"})`, () => {
  it.skipIf(!ready)("the Larkspur notes export to PDF and Word through ow-tools export", () => {
    const d = notes.find((x) => x.rel.includes("/larkspur-ceramics/"));
    const ws = tempDir("owt-ho-x-");
    const p = join(ws, d.rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, d.text);
    const out = join(dirname(p), "export");
    const r = cli(["export", p, "--out", out, "--json"], { cwd: ws });
    expect(r.status, `${r.stdout}\n${r.stderr}`.slice(0, 600)).toBe(0);
    expect(existsSync(join(out, "handoff-notes.pdf"))).toBe(true);
    expect(existsSync(join(out, "handoff-notes.docx"))).toBe(true);
  }, 120_000);
});
