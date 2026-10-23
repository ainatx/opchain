// ow-vendor-eval acceptance tests (docs/plans/2026-10-16-ow-vendor-eval-design.md §10 and the OW-11 contract,
// sprints/release-2.1/ow-11/contract.md). ow-vendor-eval is a text-only skill, so a model has to run it. These tests
// prove the mechanical half: every §10 case except "Real use" (REL-02) and every C4 route cell has an invented golden
// run that passes scripts/ow-vendor-eval-acceptance.mjs, each laid out as a real run folder too; a cut golden for every
// step of every key; the catalog holds the body to its budget; the shared examples stay byte-identical; the D2 field
// strings match ow-draft's; the versions are the ones this sprint bumps. Planted failures: ow-vendor-eval-plants.test.js.
import { afterAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as yaml from "js-yaml";
import * as C from "../scripts/ow-vendor-eval-acceptance.mjs";
import { FIXTURES, SKILL, STEPS, listCases, loadKey, runCase } from "../scripts/ow-vendor-eval-acceptance.mjs";
import { estimateTokens, validateCatalog } from "../scripts/gen-skills-catalog.mjs";
import { loadCatalogs } from "../scripts/lib/catalogs.mjs";
import { matter } from "../scripts/lib/frontmatter.mjs";
import { cleanup, mutated, temp } from "./ow-vendor-eval-helpers.mjs";

const ROOT = join(import.meta.dirname, "..");
const CLI = join(ROOT, "scripts", "ow-vendor-eval-acceptance.mjs");
afterAll(cleanup);
/** The versions this sprint ships, in one place (C31: if OW-07 lands first, they become 1.4.0 and 1.3.0 here only). */
const EXPECTED_VERSIONS = { "ow-vendor-eval": "1.0.0", "ow-build-plan": "1.4.0", "ow-start": "1.3.0" };

const CASES = listCases();
const keys = Object.fromEntries(CASES.map((c) => [c, loadKey(join(FIXTURES, c))]));
const bodyOf = (id) => { const t = readFileSync(join(ROOT, "skills-work", id, "SKILL.md"), "utf8"); return t.slice(t.indexOf("\n---", 3) + 4); };

describe("golden runs", () => {
  it("there are at least 130 cases (every §10 case, C4 cell and resume cut)", () => expect(CASES.length).toBeGreaterThanOrEqual(130));
  for (const c of CASES) {
    it(`${c} passes every check its answer key names`, () => {
      const out = runCase(c);
      expect(out.filter((r) => r.problems.length), JSON.stringify(out.filter((r) => r.problems.length), null, 1)).toEqual([]);
      expect(out.length).toBeGreaterThan(0);
    });
  }
  it("every golden, laid out as a real run folder, passes too (real-run mode reads by difference)", () => {
    const bad = [];
    for (const c of CASES) { const out = runCase(c, mutated(c)).filter((r) => r.problems.length); if (out.length) bad.push(`${c}: ${JSON.stringify(out).slice(0, 300)}`); }
    expect(bad).toEqual([]);
  }, 600000);
  it("every design §10 case except Real use has a golden", () => {
    const want = { "Criteria first": ["scope-vendor-named", "revise-larkspur", "score-after-revision"], "Knock-outs": ["longlist-larkspur", "evidence-larkspur-brackenfold"], Scores: ["score-larkspur"], Cost: ["score-hollowbrook"], Conflicts: ["recommend-larkspur", "waive-business", "recommend-business-finding"], "Decision differs": ["decide-hollowbrook-runner-up"], Formal: ["formal-no-bidder", "formal-elmridge", "responses-elmridge"], "Private names": ["recommend-larkspur"] };
    for (const [test, cases] of Object.entries(want)) for (const c of cases) expect(CASES, `${test}: ${c}`).toContain(c);
  });
  it("every C4 route cell has a case", () => {
    for (const c of ["route-research-no-evaluation", "route-research-not-frozen", "route-research-no-longlist", "route-research-longlist", "route-research-several", "route-research-after-scores", "route-research-after-recommendation", "route-research-formal", "route-research-other-client", "route-research-again", "route-research-finding-open", "evidence-stale",
      "scope-hollowbrook", "route-quick-scope-frozen", "route-quick-scope-not-accepted", "longlist-hollowbrook",
      "scope-larkspur", "route-plan-decided", "route-plan-two-packages",
      "scope-formal", "scope-vendor-named", "scope-weights-99", "scope-no-agreement", "scope-again", "revise-larkspur", "revise-refused",
      "longlist-no-scope", "longlist-larkspur", "longlist-ask", "longlist-add",
      "evidence-not-on-longlist", "evidence-knocked-out", "evidence-larkspur-tallowmere", "evidence-larkspur-brackenfold", "evidence-no-source",
      "score-missing-evidence", "score-no-relationship", "score-larkspur", "score-no-tools", "score-after-revision", "score-again",
      "recommend-business-finding", "waive-refused-conflicts", "waive-business", "recommend-larkspur", "recommend-no-tools", "recommend-again", "recommend-handling",
      "decide-no-recommendation", "decide-larkspur", "decide-hollowbrook-runner-up", "decide-knocked-out", "decide-again", "decide-other-refused",
      "formal-commercial-refused", "formal-no-bidder", "formal-no-conflicts", "formal-elmridge", "formal-no-tools", "clarification-elmridge", "responses-elmridge", "formal-rank-refused",
      "list-welcome", "list-evaluations", "route-folder-scoped", "route-folder-longlisted", "route-folder-evidence", "route-folder-scored", "route-folder-recommended", "route-folder-decided", "route-folder-formal", "route-folder-formal-materials", "route-folder-several"]) expect(CASES, c).toContain(c);
  });
  it("C22: a cut golden for every step of every key", () => {
    for (const [base, key] of [["scope-larkspur", "/ow-vendor-eval-scope (commercial)"], ["scope-formal", "/ow-vendor-eval-scope (formal)"], ["longlist-larkspur", "/ow-vendor-eval-longlist"], ["evidence-larkspur-tallowmere", "/ow-vendor-eval-evidence"], ["score-larkspur", "/ow-vendor-eval-score"], ["recommend-larkspur", "/ow-vendor-eval-recommend"], ["waive-business", "/ow-vendor-eval-recommend --waive"], ["decide-larkspur", "/ow-vendor-eval-decide"], ["formal-elmridge", "/ow-vendor-eval-formal"], ["clarification-elmridge", "/ow-vendor-eval-formal --clarification"], ["responses-elmridge", "/ow-vendor-eval-formal --responses"]]) {
      for (const s of STEPS[key].slice(0, -1)) expect(CASES, `${base} cut after ${s}`).toContain(`${base}--cut-${s}`);
    }
    // --revise and the one-step keys: a run of their own, and a re-run (the list screen).
    for (const c of ["revise-larkspur", "list-evaluations"]) expect(CASES).toContain(c);
  });
  it("C24: fifteen sources, each with a planted instruction quoted in a file its run writes", () => {
    const sources = new Set(Object.values(keys).flatMap((k) => (k.embedded ?? []).map((e) => e.source)));
    expect(sources.size).toBeGreaterThanOrEqual(15);
  });
});

describe("the checker as a command", () => {
  it("checks a prepared real run, and fails a broken one; --prepare refuses a folder in use", () => {
    const ok = spawnSync(process.execPath, [CLI, "decide-larkspur", mutated("decide-larkspur")], { encoding: "utf8" });
    expect(ok.status, ok.stdout).toBe(0);
    const bad = mutated("decide-larkspur", { "opchain-work/vendor-eval/larkspur-ceramics/VE-01-inventory-tool/decision.md": () => null });
    expect(spawnSync(process.execPath, [CLI, "decide-larkspur", bad], { encoding: "utf8" }).status).toBe(1);
    const dir = temp("ow-ve-prep-");
    expect(spawnSync(process.execPath, [CLI, "--prepare", "score-larkspur", dir], { encoding: "utf8" }).status).toBe(0);
    expect(existsSync(join(dir, "opchain-work/vendor-eval/larkspur-ceramics/VE-01-inventory-tool/vendors/brackenfold.md"))).toBe(true);
    expect(existsSync(join(dir, "opchain-work/vendor-eval/larkspur-ceramics/VE-01-inventory-tool/scores.md"))).toBe(false);
    expect(spawnSync(process.execPath, [CLI, "--prepare", "score-larkspur", dir], { encoding: "utf8" }).status).toBe(2);
  }, 120000);
});

describe("C1, C2: the catalog, the body and the description", () => {
  it("the body is at most 4,100 tokens (the cap is 4,500, enforced by the catalog)", () => {
    expect(estimateTokens(bodyOf("ow-vendor-eval"))).toBeLessThanOrEqual(4100);
    const ow = JSON.parse(readFileSync(join(ROOT, "catalogs.json"), "utf8")).catalogs.find((c) => c.id === "ow");
    expect(ow.bodyTokenBudgets["ow-vendor-eval"]).toBe(4500);
  });
  it("a planted 4,600-token body fails the catalog", () => {
    const dir = temp("ow-ve-cat-");
    cpSync(join(ROOT, "skills-work"), dir, { recursive: true });
    const p = join(dir, "ow-vendor-eval", "SKILL.md");
    writeFileSync(p, `${readFileSync(p, "utf8")}\n${"x".repeat(4 * 4600 - bodyOf("ow-vendor-eval").length)}\n`);
    const cat = loadCatalogs({ root: ROOT, env: { OPCHAIN_WORK_SKILLS_DIR: dir } }).find((c) => c.prefix === "ow-");
    expect(() => validateCatalog(cat)).toThrow(/ow-vendor-eval[\s\S]*budget/);
  });
  it("a 1,025-character description fails the catalog", () => {
    const dir = temp("ow-ve-desc-");
    cpSync(join(ROOT, "skills-work"), dir, { recursive: true });
    const p = join(dir, "ow-vendor-eval", "SKILL.md");
    const t = readFileSync(p, "utf8");
    const d = matter(t).data.description;
    writeFileSync(p, t.replace("  shortlisting or recommending.\n", `  shortlisting or recommending. ${"y".repeat(1025 - d.length)}\n`));
    const cat = loadCatalogs({ root: ROOT, env: { OPCHAIN_WORK_SKILLS_DIR: dir } }).find((c) => c.prefix === "ow-");
    expect(() => validateCatalog(cat)).toThrow(/description/);
  });
  it("the description names the skill early, has no angle brackets, and says public procurement is never scored", () => {
    const d = matter(readFileSync(join(SKILL, "SKILL.md"), "utf8")).data.description;
    expect(d.length).toBeLessThanOrEqual(1024);
    expect(d.slice(0, 200)).toContain("ow-vendor-eval");
    expect(d).not.toMatch(/[<>]/);
    expect(d).toMatch(/never scores, ranks or recommends/);
    expect(d).toMatch(/NOT for searching for vendor facts, writing a longer report, quoting the selection job, contacting vendors or signing up for trials, legal or procurement advice/);
  });
  it("network: none, bundle: core, and the protocol copy byte-identical", () => {
    const m = matter(readFileSync(join(SKILL, "SKILL.md"), "utf8")).data.metadata;
    expect(m.network).toBe("none");
    expect(m.bundle).toBe("core");
    expect(readFileSync(join(SKILL, "references", "ow-protocol.md"), "utf8")).toBe(readFileSync(join(ROOT, "skills-work", "ow-protocol.md"), "utf8"));
  });
  it("C2: offers.md is byte-identical in every skill that ships it, and price-book.yaml ships only in ow-build-plan", () => {
    const copies = ["ow-start", "ow-build-plan", "ow-uat"].map((s) => readFileSync(join(ROOT, "skills-work", s, "examples", "offers.md"), "utf8"));
    expect(new Set(copies).size).toBe(1);
    expect(copies[0]).toMatch(/## path: vendor-selection\n\n- label: Help choosing a tool\n- kind: defined-work\n- quote: vendor-eval\n- systems: none/);
    expect(existsSync(join(SKILL, "examples"))).toBe(false);
    const drift = copies[0].replace("vendor-selection", "vendor selection");
    expect(new Set([...copies, drift]).size).toBe(2);
    expect(readFileSync(join(ROOT, "skills-work", "ow-build-plan", "examples", "price-book.yaml"), "utf8")).toMatch(/vendor_selection:[^\n]*\n  sizes: \{ S: \{ price: \d+ \}, M: \{ price: \d+ \}, L: \{ price: \d+ \} \}\n  size_by_vendors: \{ S: 3, M: 5, L: 8 \}/);
  });
  it("C2, C26: ow-build-plan's and ow-start's bodies stay within their budgets after P6 and S2", () => {
    expect(estimateTokens(bodyOf("ow-build-plan"))).toBeLessThanOrEqual(4500);
    expect(estimateTokens(bodyOf("ow-start"))).toBeLessThanOrEqual(4500);
  });
  it("C22: the step table's names are the only ones the phase files use, and every key is a declared verb or mode", () => expect(C.stepNameProblems()).toEqual([]));
  it("C18: RUNS_IN is the self-check table of references/self-checks.md", () => {
    const t = readFileSync(join(SKILL, "references", "self-checks.md"), "utf8");
    for (const check of C.CHECKS_ORDER) expect(t).toContain(`| ${check} |`);
    const n = Object.values(C.RUNS_IN).flat();
    for (const check of C.CHECKS_ORDER) expect(n, check).toContain(check);
    for (const w of C.NEVER_WAIVED) expect(readFileSync(join(SKILL, "SKILL.md"), "utf8")).toContain(w);
  });
  it("C1: WRITER_PIN and HANDOFF_PIN match skill.edges.yaml", () => { expect(C.edgesWriterDrift()).toEqual([]); expect(C.handoffFieldDrift()).toEqual([]); });
  it("C3: the shipped text passes the family's names, ids, scripts, v2.2 and real-product rules", () => expect(C.shippedTextProblems()).toEqual([]));
});

describe("D2, P6, S2: the edges with ow-draft, ow-build-plan and ow-start", () => {
  it("D2: ow-vendor-eval offers exactly the fields ow-draft's reads row takes (OW-10's row, pinned with its digest until it is on main)", () => {
    const { row, hash, source } = C.d2ReadsRow();
    if (hash) expect(C.d2RowDigest(row), source).toBe(hash);
    const mine = yaml.load(readFileSync(join(SKILL, "skill.edges.yaml"), "utf8")).hands_off.find((h) => h.verb === "/ow-draft-evidence");
    expect(mine.files[0].path).toBe(row.path);
    expect(mine.files[0].fields).toEqual(row.fields);
    expect(row.if_mismatch).toMatch(/deny formal or contradictory modes; carry conflicts statement word for word/);
    expect(C.D2_FIELDS).toEqual(row.fields);
    expect(Object.keys(C.D2_PLACE)).toEqual(row.fields);
  });
  it("D2: formal or contradictory mode cannot route recommendation evidence into a draft", () => {
    const route = readFileSync(join(ROOT, "skills-work/ow-draft/references/routing-and-resume.md"), "utf8");
    const evidence = readFileSync(join(ROOT, "skills-work/ow-draft/references/phase-evidence.md"), "utf8");
    const read = yaml.load(readFileSync(join(ROOT, "skills-work/ow-draft/skill.edges.yaml"), "utf8")).reads.find((r) => r.from === "ow-vendor-eval");
    expect(route).toContain("Check the sibling `scope.md` and recommendation header before routing.");
    expect(route).toContain("a missing or conflicting mode, or a `formal/` path routes nowhere: refuse and write nothing");
    expect(evidence).toContain("Both must say `mode: commercial`");
    expect(evidence).toContain("Refused: a formal-mode evaluation hands ow-draft nothing.");
    expect(evidence).toContain("a formal-mode vendor evaluation file (including `formal/` and a forged recommendation)");
    expect(read.if_mismatch).toMatch(/deny formal or contradictory modes/);
    expect(evidence).toContain("conflicts statement, which a draft that uses the recommendation carries word for word");
  });
  it("P6: ow-build-plan's -map re-run reads ow-vendor-eval's decision.md byte for byte", () => {
    expect(readFileSync(join(ROOT, "tests/fixtures/ow-build-plan/selection-map-rerun/input/opchain-work/vendor-eval/larkspur-ceramics/VE-01-inventory-tool/decision.md"), "utf8")).toBe(readFileSync(join(FIXTURES, "decide-larkspur/expected/opchain-work/vendor-eval/larkspur-ceramics/VE-01-inventory-tool/decision.md"), "utf8"));
  });
  it("P6: ow-build-plan's new goldens pass its own checker", async () => {
    const { runCase: planCase } = await import("../scripts/ow-build-plan-acceptance.mjs");
    for (const c of ["route-vendor-selection", "vendor-selection-signed", "selection-scope", "selection-quote-refused", "selection-map-rerun"]) expect(planCase(c).filter((r) => r.problems.length), c).toEqual([]);
  });
  it("S2: ow-start's new golden passes its own checker; ow-research's run-vendor-eval passes its own", async () => {
    const { runCase: startCase } = await import("../scripts/ow-start-acceptance.mjs");
    expect(startCase(join(ROOT, "tests/fixtures/ow-start/hollowbrook-vendor-selection")).filter((r) => r.problems.length)).toEqual([]);
    const { runCase: researchCase } = await import("../scripts/ow-research-acceptance.mjs");
    expect(researchCase("run-vendor-eval").filter((r) => r.problems.length)).toEqual([]);
  });
  it("S2: ow-start's index reads decision.md by created and decided_on only", () => {
    const row = yaml.load(readFileSync(join(ROOT, "skills-work/ow-start/skill.edges.yaml"), "utf8")).reads.find((r) => r.from === "ow-vendor-eval");
    expect(row).toMatchObject({ index: true, path: "vendor-eval/<ws>/VE-nn-<slug>/decision.md", fields: ["created", "decided_on"] });
    expect(readFileSync(join(ROOT, "skills-work/ow-start/references/logs-status-and-index.md"), "utf8")).toContain("| Decision (vendor chosen) | ow-vendor-eval | `vendor-eval/<ws>/VE-nn-<slug>/decision.md` | `created`, `decided_on` |");
  });
  it("C27: hand-off and read fields match on both ends (ow-research's offer is read exactly)", () => {
    const mine = yaml.load(readFileSync(join(SKILL, "skill.edges.yaml"), "utf8"));
    const rs = yaml.load(readFileSync(join(ROOT, "skills-work/ow-research/skill.edges.yaml"), "utf8")).hands_off.find((h) => h.verb === "/ow-vendor-eval-evidence");
    const offered = (rs.files ?? []).flatMap((f) => (typeof f === "string" ? [] : f.fields ?? []));
    const read = mine.reads.find((r) => r.from === "ow-research").fields;
    if (offered.length) for (const f of read) expect(offered, f).toContain(f);
    expect(read).toEqual(["F-nn", "claim", "level", "sources"]);
  });
});

describe("C31: versions and records", () => {
  it("each skill's frontmatter and body line say its version, with a CHANGELOG entry", () => {
    for (const [id, v] of Object.entries(EXPECTED_VERSIONS)) {
      const t = readFileSync(join(ROOT, "skills-work", id, "SKILL.md"), "utf8");
      expect(matter(t).data.metadata.version, id).toBe(v);
      expect(t, id).toContain(`${id} ${v} · protocol 1`);
      expect(readFileSync(join(ROOT, "skills-work", id, "CHANGELOG.md"), "utf8"), id).toMatch(new RegExp(`^## ${v.replace(/\./g, "\\.")} \\(`, "m"));
    }
    for (const id of ["ow-start", "ow-build-plan", "ow-uat"]) expect(readFileSync(join(ROOT, "skills-work", id, "CHANGELOG.md"), "utf8"), id).toContain("## Unreleased: data edits from OW-11 (ow-vendor-eval 1.0.0)");
  });
  it("catalogs.json: ow-vendor-eval out of planned and plannedVerbs, its budget set, its STATUS id named", () => {
    const ow = JSON.parse(readFileSync(join(ROOT, "catalogs.json"), "utf8")).catalogs.find((c) => c.id === "ow");
    expect(ow.planned).not.toContain("ow-vendor-eval");
    expect(ow.plannedVerbs["ow-vendor-eval"]).toBeUndefined();
    expect(ow.statusNames["/ow-vendor-eval-scope"]).toBe("VE-");
  });
  it("the design has its build notes; the sibling designs point to them", () => {
    expect(readFileSync(join(ROOT, "docs/plans/2026-10-16-ow-vendor-eval-design.md"), "utf8")).toMatch(/## 13\. Build notes \(ow-vendor-eval 1\.0\.0, OW-11\)/);
    expect(readFileSync(join(ROOT, "docs/plans/2026-10-06-ow-build-plan-design.md"), "utf8")).toMatch(/ow-vendor-eval 1\.0\.0, OW-11/);
    expect(readFileSync(join(ROOT, "docs/plans/2026-10-06-ow-start-intake-redesign.md"), "utf8")).toMatch(/ow-vendor-eval 1\.0\.0, OW-11/);
  });
});
