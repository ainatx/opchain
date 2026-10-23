// ow-draft acceptance tests (docs/plans/2026-10-16-ow-draft-design.md §11 and the OW-10 contract,
// sprints/release-2.1/ow-10/contract.md). ow-draft is a text-only skill, so a model has to run it. These tests prove the
// mechanical half: every §11 case except "Real use" (REL-02), ow-research's deferred Downstream test, every C4 route
// cell and a cut at every step of every key has an invented golden run that passes scripts/ow-draft-acceptance.mjs,
// each laid out as a real run folder too; the catalog holds the body to its budget; the shared files stay
// byte-identical; the deck and sheet build through ow-tools' own code. Planted failures: tests/ow-draft-plants.test.js.
import { afterAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FIXTURES, HANDOFF_PIN, STEPS, clientForm, edgesWriterDrift, evidenceOf, handoffFieldDrift, listCases, loadKey, otherWorkstreams, runCase, runView, shippedTextProblems, stepNameProblems } from "../scripts/ow-draft-acceptance.mjs";
import { NON_CLIENT_FOLDERS } from "../scripts/ow-documentation-acceptance.mjs";
import { estimateTokens } from "../scripts/gen-skills-catalog.mjs";
import { checkProtocolCopies } from "../scripts/check-skill-contracts.mjs";
import { loadCatalogs } from "../scripts/lib/catalogs.mjs";
import { preflight } from "../plugins/ow-tools/lib/preflight.mjs";
import { deckChecks } from "../plugins/ow-tools/lib/pptx.mjs";
import { buildWorkbook, readSheetFolder } from "../plugins/ow-tools/lib/xlsx.mjs";
import { cleanup, mutated, temp } from "./ow-draft-helpers.mjs";

const ROOT = join(import.meta.dirname, "..");
const SKILL = join(ROOT, "skills-work", "ow-draft");
const CLI = join(ROOT, "scripts", "ow-draft-acceptance.mjs");
afterAll(cleanup);
const CASES = listCases();
const keys = Object.fromEntries(CASES.map((c) => [c, loadKey(join(FIXTURES, c))]));
const body = () => { const t = readFileSync(join(SKILL, "SKILL.md"), "utf8"); return t.slice(t.indexOf("\n---", 3) + 4); };
const MD = "opchain-work/drafts/mossgate-books/DR-01-order-record-retention";

describe("golden runs", () => {
  it("there are at least 130 cases", () => expect(CASES.length).toBeGreaterThanOrEqual(130));
  for (const c of CASES) {
    it(`${c} passes every check its answer key names, and the meaning checks`, () => {
      const out = runCase(c);
      expect(out.filter((r) => r.problems.length), JSON.stringify(out.filter((r) => r.problems.length), null, 1)).toEqual([]);
    });
  }
  it("every golden, laid out as a real run folder, passes too (real-run mode reads by difference)", () => {
    const bad = [];
    for (const c of CASES) { const out = runCase(c, mutated(c)).filter((r) => r.problems.length); if (out.length) bad.push(`${c}: ${JSON.stringify(out).slice(0, 300)}`); }
    expect(bad).toEqual([]);
  }, 600000);
  it("every design §11 case except Real use has a golden (by section)", () => {
    const sections = Object.values(keys).map((k) => String(k.section ?? "")).join("\n");
    for (const s of ["§11 Sources|C10", "§11 Numbers", "§11 Naming", "C5", "§11 Candidate", "§11 Client comms", "§11 Deck", "§11 Delivery", "D1 Downstream", "§11 Private names"]) expect(sections, s).toMatch(new RegExp(s));
  });
  it("every C4 route cell and every step of every key has a case", () => {
    for (const c of ["m-route-no-brief", "m-route-evidence", "m-route-several", "m-route-candidate", "m-route-signed", "m-route-delivered", "l-evidence-other-client-refused", "m-evidence-again", "m-freeze-stale", "m-route-selfcheck-finding",
      "m-voice", "m-voice-two-samples", "m-voice-six-samples", "m-voice-approve", "m-voice-revision", "l-voice-larkspur-unapproved", "m-brief", "m-brief-internal-refused", "l-brief-comms-wrong-voice", "m-brief-again", "b-permission-name", "b-permission-quote",
      "m-freeze-again", "b-freeze-post", "m-freeze-no-tools", "m-waive-credentials-refused", "m-waive-sources", "m-signoff-finding-refused", "m-signoff-older-refused", "l-signoff-comms", "l-signoff-client", "m-signoff-again",
      "m-deliver-no-signoff", "m-deliver-changed-refused", "l-deliver-comms-refused", "m-deliver-no-tools", "b-deliver-case", "m-deliver-connector", "m-deliver", "l-deliver-handling", "m-deliver-push-cut", "m-deliver-again",
      // The folder route (round 1 M2): every §4.3 stage, the workstream, a findings path, anything else, and /ow-draft.
      "f-on-brief", "f-on-evidence", "f-on-writing", "f-on-finding", "f-on-clean", "f-on-signed", "f-on-awaiting-client", "f-on-delivered", "f-on-push-cut", "f-on-no-brief",
      "f-on-ws-one", "f-on-ws-several", "f-on-ws-none", "f-on-findings", "f-on-other", "f-list-welcome", "f-list-every-draft", "f-list-awaiting", "f-list-again", "f-on-again"]) expect(CASES, c).toContain(c);
    const cut = Object.values(keys).filter((k) => k.resume).map((k) => `${k.resume.key} ${k.resume.cut_after}`);
    for (const [k, steps] of Object.entries(STEPS)) {
      const own = k === "/ow-draft-write" ? ["draft", "status"] : steps;
      for (const s of own) expect(cut, `${k} cut after ${s}`).toContain(`${k} ${s}`);
    }
    for (const s of ["sheets", "model", "sources"]) expect(cut).toContain(`/ow-draft-write ${s}`);
  });
  it("one golden per type and per kind", () => {
    const by = (f) => new Set(CASES.filter((c) => keys[c].verbs === "/ow-draft-freeze").map((c) => { try { return f(runView(c)); } catch { return null; } }));
    void by;
    for (const c of ["m-freeze", "l-freeze-deck", "l-freeze-sheet", "l-freeze-comms", "b-freeze-post", "b-freeze-newsletter", "b-freeze-case", "b-freeze-policy"]) expect(CASES).toContain(c);
  });
});

describe("D1: ow-research's deferred Downstream test", () => {
  it("-evidence reads run-regulations' findings.md and cites F-01 and F-02 with their source URLs and retrieved dates, exactly", () => {
    const run = runView("m-route-evidence");
    const e = evidenceOf(run, { draft: "drafts/mossgate-books/DR-01-order-record-retention" });
    const f = run.read("opchain-work/research/mossgate-books/RS-01-order-record-retention/findings.md");
    expect(e.items.get("E-01").source).toBe("research/mossgate-books/RS-01-order-record-retention/findings.md#F-01");
    for (const [id, fid] of [["E-01", "F-01"], ["E-02", "F-02"]]) {
      const src = f.split(`### ${fid}\n`)[1].match(/^- sources: (.+)$/m)[1];
      expect(e.items.get(id).sources).toBe(src);
      expect(src).toMatch(/https:\/\/\S+, retrieved 2026-10-22/);
    }
  });
});

describe("the checker as a command", () => {
  it("checks a prepared real run, and fails a broken one", () => {
    expect(spawnSync(process.execPath, [CLI, "m-signoff", mutated("m-signoff")], { encoding: "utf8" }).status).toBe(0);
    expect(spawnSync(process.execPath, [CLI, "m-signoff", mutated("m-signoff", { [`${MD}/signoff.md`]: () => null })], { encoding: "utf8" }).status).toBe(1);
  }, 180000);
  it("--prepare lays out the starting state and refuses a folder already in use", () => {
    const dir = temp("ow-draft-prep-");
    expect(spawnSync(process.execPath, [CLI, "--prepare", "m-write", dir], { encoding: "utf8" }).status).toBe(0);
    expect(existsSync(join(dir, MD, "evidence.md"))).toBe(true);
    expect(existsSync(join(dir, MD, "draft.md"))).toBe(false);
    expect(spawnSync(process.execPath, [CLI, "--prepare", "m-write", dir], { encoding: "utf8" }).status).toBe(2);
  });
});

describe("C2, C29: the catalog, the body budget, the shared files and the version", () => {
  it("the body is shipped at 4,100 tokens or fewer, under the catalog's 4,500 cap", () => expect(estimateTokens(body())).toBeLessThanOrEqual(4100));
  const catalogRun = (edit) => {
    const dir = mkdtempSync(join(tmpdir(), "ow-draft-cat-"));
    try {
      cpSync(join(ROOT, "skills-work"), dir, { recursive: true });
      const p = join(dir, "ow-draft", "SKILL.md");
      writeFileSync(p, edit(readFileSync(p, "utf8")));
      return spawnSync(process.execPath, [join(ROOT, "scripts", "gen-skills-catalog.mjs")], { encoding: "utf8", env: { ...process.env, OPCHAIN_WORK_SKILLS_DIR: dir } });
    } finally { rmSync(dir, { recursive: true, force: true }); }
  };
  it("a planted 4,600-token body fails the catalog", () => {
    const r = catalogRun((t) => `${t}\n${"word ".repeat(4600 * 4 / 5)}\n`);
    expect(r.status).not.toBe(0);
    expect(r.stderr + r.stdout).toMatch(/over the 4500-token budget/);
  });
  it("a 1,025-character description fails", () => {
    const r = catalogRun((t) => t.replace("  publishing or sending anything without your confirmation.\n", `  publishing or sending anything without your confirmation. ${"x".repeat(1025)}\n`));
    expect(r.status).not.toBe(0);
  });
  it("the protocol copy and the shared handoffs.yaml (with drafts) are byte-identical in every skill that ships them", () => {
    expect(checkProtocolCopies(loadCatalogs({ root: ROOT }))).toEqual([]);
    const copies = ["ow-start", "ow-build-plan", "ow-build", "ow-uat", "ow-documentation", "ow-draft"].map((s) => readFileSync(join(ROOT, "skills-work", s, "examples", "handoffs.yaml")));
    for (const c of copies) expect(c.equals(copies[0])).toBe(true);
    expect(copies[0].toString()).toMatch(/^drafts: /m);
    expect(copies[0].toString()).toMatch(/^#     blog: \{ repo: \.\.\/site, path: src\/content\/blog\/ \}$/m);
    const b = Buffer.from(copies[0]); b[b.length - 2] ^= 1;
    expect(copies[0].equals(b)).toBe(false);
  });
  it("C29: current frontmatter and body version retain the initial release and sibling data-edit history", () => {
    const t = readFileSync(join(SKILL, "SKILL.md"), "utf8");
    expect(t).toMatch(/version: "1\.0\.1"/);
    expect(body()).toMatch(/ow-draft 1\.0\.1 · protocol 1/);
    expect(readFileSync(join(SKILL, "CHANGELOG.md"), "utf8")).toMatch(/^## 1\.0\.0 \(2026-10-21\)/m);
    for (const s of ["ow-start", "ow-build-plan", "ow-build", "ow-uat"]) expect(readFileSync(join(ROOT, "skills-work", s, "CHANGELOG.md"), "utf8"), s).toMatch(/^## Unreleased: data edits from OW-10 \(ow-draft 1\.0\.0\)$/m);
    // Round 1 m7: ow-documentation's own shipped-text scan refuses an evaluation id in its changelog, so its heading names the build instead.
    expect(readFileSync(join(ROOT, "skills-work", "ow-documentation", "CHANGELOG.md"), "utf8")).toMatch(/^## Unreleased: data edits from the ow-draft 1\.0\.0 build$/m);
  });
});

describe("C3, C22, C1, C25: the skill's own text and its pins", () => {
  it("C3: no private or brand name, oc- skill, price, evaluation id, script, platform or skill outside 2.1", () => expect(shippedTextProblems()).toEqual([]));
  it("C22: every step name used anywhere is in the step table, and every key a declared verb and mode", () => expect(stepNameProblems()).toEqual([]));
  it("C1, C25: skill.edges.yaml matches the pinned writers and the pinned read fields", () => {
    expect(edgesWriterDrift()).toEqual([]);
    expect(handoffFieldDrift()).toEqual([]);
    expect(HANDOFF_PIN.reads["research/<ws>/RS-nn-<slug>/findings.md"]).toEqual(["Answer", "F-nn", "claim", "level", "sources", "Conflicts", "Gaps"]);
  });
  it("the other-client rule is ow-documentation's, imported (its 1.0.1 fixes landed; no wrapper), with ow-draft's own non-client areas left out", () => {
    const run = runView("m-freeze");
    expect(NON_CLIENT_FOLDERS.frameworks).toContain("research");
    const slugs = otherWorkstreams(run, { ws: "mossgate-books", client: "Mossgate Books" }).map((x) => x.slug);
    expect(slugs).toContain("larkspur-ceramics");
    for (const x of ["samples", "frameworks", "business", "mossgate-books"]) expect(slugs).not.toContain(x);
  });
});

describe("C9, C15: the deck and the sheet through ow-tools' own code", () => {
  it("design §11 Deck: the client form passes the preflight and the deck rules, with six slides (five content slides plus Sources), each with notes", () => {
    const run = runView("l-freeze-deck");
    const cf = run.read("opchain-work/drafts/larkspur-ceramics/DR-01-quarterly-review/candidates/C-1/quarterly-review.md");
    const pf = preflight(cf, join(temp("ow-draft-deck0-"), "quarterly-review.md"));
    expect(pf.problems).toEqual([]);
    const { problems, slides } = deckChecks(pf.lines);
    expect(problems).toEqual([]);
    expect(slides).toBe(6);
    expect((cf.match(/^::: notes$/gm) ?? []).length).toBe(6);
    const dir = temp("ow-draft-deck-");
    writeFileSync(join(dir, "quarterly-review.md"), cf);
    expect(preflight(cf, join(dir, "quarterly-review.md")).problems ?? []).toEqual([]);
  });
  it("design §11 Deck, real binary: a six-H2 client form exports to a six-slide PPTX (skips honestly without pandoc)", (ctx) => {
    if (spawnSync("pandoc", ["--version"]).status !== 0) { ctx.skip(); return; }
    const run = runView("l-freeze-deck");
    const dir = temp("ow-draft-pptx-");
    writeFileSync(join(dir, "quarterly-review.md"), run.read("opchain-work/drafts/larkspur-ceramics/DR-01-quarterly-review/candidates/C-1/quarterly-review.md"));
    const r = spawnSync(join(ROOT, "plugins/ow-tools/bin/ow-tools"), ["export", join(dir, "quarterly-review.md"), "--formats", "pptx", "--out", join(dir, "out")], { encoding: "utf8" });
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(existsSync(join(dir, "out", "quarterly-review.pptx"))).toBe(true);
  }, 120000);
  // Round 1 m10: the document's client form through the real binaries, PDF (Typst) and Word (pandoc); each skips
  // honestly, as a skipped test, on a machine without its binary.
  for (const [fmt, bin, magic] of [["pdf", "typst", "%PDF"], ["docx", "pandoc", "PK"]]) {
    it(`design §11 Delivery, real binary: the memo's client form exports to ${fmt} (skips without ${bin})`, (ctx) => {
      if (spawnSync(bin, ["--version"]).status !== 0) { ctx.skip(); return; }
      const run = runView("m-freeze");
      const dir = temp(`ow-draft-${fmt}-`);
      writeFileSync(join(dir, "order-record-retention.md"), run.read(`${MD}/candidates/C-1/order-record-retention.md`));
      const r = spawnSync(join(ROOT, "plugins/ow-tools/bin/ow-tools"), ["export", join(dir, "order-record-retention.md"), "--formats", fmt, "--out", join(dir, "out")], { encoding: "utf8" });
      expect(r.status, r.stdout + r.stderr).toBe(0);
      const out = join(dir, "out", `order-record-retention.${fmt}`);
      expect(existsSync(out)).toBe(true);
      expect(readFileSync(out).subarray(0, magic.length).toString("latin1")).toBe(magic);
    }, 120000);
  }
  it("design §11 Numbers: the sheet's candidate folder builds an XLSX with its formulas (Node only)", () => {
    const dir = mutated("l-freeze-sheet");
    const folder = join(dir, "opchain-work/drafts/larkspur-ceramics/DR-02-cost-comparison/candidates/C-1/cost-comparison");
    const read = readSheetFolder(folder);
    expect(read.model.sheets[0].cells.find((x) => x.cell === "D4").formula).toBe("=SUM(D2:D3)");
    const wb = buildWorkbook(read, { title: "cost comparison" });
    expect(Buffer.from(wb).subarray(0, 2).toString("latin1")).toBe("PK");
  });
  it("the client form is the module's transform of the candidate (documents, decks, emails, posts, newsletters)", () => {
    for (const [c, d, slug, type] of [["m-freeze", MD, "order-record-retention", "document"], ["l-freeze-comms", "opchain-work/drafts/larkspur-ceramics/DR-03-email-orders-announcement", "email-orders-announcement", "email"], ["b-freeze-post", "opchain-work/drafts/business/DR-02-care-plans-post", "care-plans-post", "post"]]) {
      const run = runView(c);
      const e = evidenceOf(run, { draft: d.replace("opchain-work/", "") });
      expect(run.read(`${d}/candidates/C-1/${slug}.md`)).toBe(clientForm(run.read(`${d}/candidates/C-1.md`), type, e.items));
    }
  });
});
