// ow-documentation acceptance tests (docs/plans/2026-10-16-ow-documentation-design.md §10 and the OW-05
// contract, sprints/release-2.1/ow-05/contract.md). ow-documentation is a text-only skill, so a model has to
// run it. These tests prove the mechanical half: every §10 case except "Real use" (REL-02) and every C4 route
// cell has an invented golden run that passes scripts/ow-documentation-acceptance.mjs, each laid out as a real
// run folder too; each check fails on its own when a file is malformed (C23); the catalog holds the body to
// its budget; the shared files stay byte-identical; ow-build's checker reads these goldens as its own (B4);
// and P3 leaves acceptance testing's digests where they were. Planted failures: tests/ow-documentation-plants.test.js.
import { afterAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as yaml from "js-yaml";
import { FIXTURES, HANDOFF_PIN, STEPS, edgesWriterDrift, handoffFieldDrift, listCases, loadKey, runCase, runView, shippedTextProblems, stepNameProblems } from "../scripts/ow-documentation-acceptance.mjs";
import { estimateTokens } from "../scripts/gen-skills-catalog.mjs";
import { blockDigest, handoffFieldDrift as uatHandoffDrift } from "../scripts/ow-uat-acceptance.mjs";
import { metTriggers, runCase as buildCase, runView as buildView } from "../scripts/ow-build-acceptance.mjs";
import { runCase as planCase } from "../scripts/ow-build-plan-acceptance.mjs";
import { checkEdges, checkProtocolCopies } from "../scripts/check-skill-contracts.mjs";
import { loadCatalogs } from "../scripts/lib/catalogs.mjs";
import { matter } from "../scripts/lib/frontmatter.mjs";
import { cleanup, mutated, temp } from "./ow-documentation-helpers.mjs";

const ROOT = join(import.meta.dirname, "..");
const SKILL = join(ROOT, "skills-work", "ow-documentation");
const CLI = join(ROOT, "scripts", "ow-documentation-acceptance.mjs");
afterAll(cleanup);

const CASES = listCases();
const keys = Object.fromEntries(CASES.map((c) => [c, loadKey(join(FIXTURES, c))]));
const body = () => { const t = readFileSync(join(SKILL, "SKILL.md"), "utf8"); return t.slice(t.indexOf("\n---", 3) + 4); };

describe("golden runs", () => {
  it("there are at least 90 cases, one per §10 case and C4 cell", () => expect(CASES.length).toBeGreaterThanOrEqual(90));
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
  }, 300000);
  it("every design §10 case except Real use has a golden (by section)", () => {
    const sections = Object.values(keys).map((k) => String(k.section ?? "")).join("\n");
    for (const s of ["Declined", "Scope freeze", "Coverage", "Trace|C7", "Screenshots", "Training record", "Adoption", "Delivery", "Payment", "Train-the-trainer", "C17|handoff_fields|H3", "Private names|private_names"]) {
      const re = new RegExp(s);
      expect(re.test(sections) || Object.values(keys).some((k) => asList(k.checks).some((x) => re.test(x))), s).toBe(true);
    }
  });
  it("every C4 route cell has a case", () => {
    const routes = Object.values(keys).filter((k) => k.route).map((k) => `${k.route.say ?? k.route.from} -> ${k.route.expect}`).join("\n");
    for (const want of [/on uat\/larkspur-ceramics\/ -> start/, /on uat\/larkspur-ceramics\/ -> nothing/, /on uat\/larkspur-ceramics\/ -> refused/, /on uat\/mossgate-books\/ -> refused/, /on uat\/larkspur-ceramics\/ -> ask/, /^use ow-documentation-start -> start/m, /^use ow-documentation-start -> ask/m,
      /docs\/larkspur-ceramics\/ -> capture/, /docs\/larkspur-ceramics\/ -> write guides/, /docs\/larkspur-ceramics\/ -> write runbook/, /docs\/larkspur-ceramics\/ -> export/, /docs\/larkspur-ceramics\/ -> rollout$/m, /docs\/larkspur-ceramics\/ -> rollout --session/, /docs\/larkspur-ceramics\/ -> rollout --checkin/, /docs\/larkspur-ceramics\/ -> nothing/]) expect(routes, String(want)).toMatch(want);
    // The capture, export, delivered and rollout entry stages each have a golden.
    for (const c of ["capture", "capture-no-tools", "capture-exit-3", "capture-http-origin", "capture-decision-asked", "capture-production", "capture-production-refused", "capture-signed-out", "capture-partial",
      "export-placeholder-refused", "export-finding-refused", "export-no-tools", "export-repo-not-ours", "export-connector", "export", "export-resume-mid-push",
      "delivered-refused", "delivered", "delivered-ledger-requested", "delivered-again", "delivered-update",
      "rollout-plan-early", "rollout-plan", "rollout-session", "rollout-checkin-14", "rollout-close-wait", "rollout-close-window", "rollout-closed", "write-all-written", "train-all-written"]) expect(CASES, c).toContain(c);
  });
  it("C20: a golden for a cut at every step of -start, -capture, -export (after the confirmation and mid-push) and --session", () => {
    for (const s of STEPS["/ow-documentation-start"].slice(1)) expect(CASES, s).toContain(`start-resume-${s}`);
    for (const s of ["plan", "run", "check"]) expect(CASES).toContain(`capture-resume-${s}`);
    for (const s of ["repo", "confirm", "push", "mid-push"]) expect(CASES).toContain(`export-resume-${s}`);
    expect(CASES).toContain("rollout-session-46");
  });
});

describe("the checker as a command", () => {
  // Every golden is checked in-process above; the command line is checked on one prepared real run, passing and failing.
  it("checks a prepared real run, and fails a broken one", () => {
    const one = spawnSync(process.execPath, [CLI, "delivered", mutated("delivered")], { encoding: "utf8" });
    expect(one.status, one.stdout).toBe(0);
    const bad = mutated("delivered", { "opchain-work/docs/larkspur-ceramics/delivered.md": () => null });
    expect(spawnSync(process.execPath, [CLI, "delivered", bad], { encoding: "utf8" }).status).toBe(1);
  }, 180000);
  it("--prepare lays out the starting state, writes the indexed images as stubs, and refuses a folder already in use", () => {
    const dir = temp("ow-doc-prep-");
    const r = spawnSync(process.execPath, [CLI, "--prepare", "write-guides", dir], { encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
    expect(existsSync(join(dir, "opchain-work/docs/larkspur-ceramics/shots/index.md"))).toBe(true);
    expect(readFileSync(join(dir, "opchain-work/docs/larkspur-ceramics/shots/SC-10-1.png")).subarray(0, 4).toString("latin1")).toBe("\u0089PNG");
    expect(existsSync(join(dir, "opchain-work/docs/larkspur-ceramics/guides/order-coordinator.md"))).toBe(false);
    expect(existsSync(join(dir, "larkspur-repo/alerts.yaml"))).toBe(true);
    expect(spawnSync(process.execPath, [CLI, "--prepare", "write-guides", dir], { encoding: "utf8" }).status).toBe(2);
  });
});

// C23: a malformed file fails the checks that need it, with a reason, and every other check still runs.
describe("C23: the checker fails per check and never crashes", () => {
  const D = "opchain-work/docs/larkspur-ceramics";
  const probe = (caseName, edits, hit, setup = null) => {
    const dir = mutated(caseName, edits);
    if (setup) setup(dir);
    const out = runCase(caseName, dir);
    expect(out.length).toBe(loadKey(join(FIXTURES, caseName)).checks.length);
    for (const r of out) for (const p of r.problems) expect(p).not.toMatch(/TypeError|undefined is not|Cannot read prop|is not a function/);
    const failed = out.filter((r) => r.problems.length).map((r) => r.check);
    expect(failed.length).toBeGreaterThan(0);
    expect(failed.length).toBeLessThan(out.length);
    if (hit) expect(failed).toContain(hit);
    return out;
  };
  it("docs.yaml as a directory", () => probe("start", {}, "start", (dir) => { rmSync(join(dir, `${D}/docs.yaml`)); mkdirSync(join(dir, `${D}/docs.yaml`)); }));
  it("invalid YAML in docs.yaml", () => probe("start", { [`${D}/docs.yaml`]: (t) => t.replace("scope:\n", "scope: [ {\n") }, "start"));
  it("a truncated shots/index.md row", () => probe("capture", { [`${D}/shots/index.md`]: (t) => t.replace("| SC-10-1 | SC-10 step 1 | shots/SC-10-1.png | cleared |", "| SC-10-1 | SC-10 step") }, "capture"));
  it("a binary deliveries.yaml", () => probe("export", { [`${D}/deliveries.yaml`]: () => "\u0000\u0001ÿPK\u0003\u0004binary" }, "export"));
  it("a missing printed screen", () => probe("delivered", { "printed.md": () => null }, "screen"));
  it("a .png that is not a PNG", () => probe("capture", {}, "capture", (dir) => writeFileSync(join(dir, `${D}/shots/SC-10-1.png`), "GIF89a not a png")));
  it("a repo path that is a symlink out of the repository", () => probe("export", {}, "export", (dir) => {
    const target = join(dir, "larkspur-repo/docs/client-handbook/runbook.md");
    const outside = join(temp("ow-doc-outside-"), "elsewhere.md");
    writeFileSync(outside, readFileSync(target, "utf8"));
    rmSync(target);
    symlinkSync(outside, target);
  }));
  it("an answer key that is not a map", () => {
    const dir = temp("ow-doc-key-");
    writeFileSync(join(dir, "answer-key.yaml"), "- just a list\n");
    expect(runCase("start", null, { caseDir: dir })[0].problems[0]).toMatch(/answer-key\.yaml could not be used/);
  });
});

describe("C2: body, frontmatter, the shared files", () => {
  const catalog = (mutate) => {
    const dir = temp("ow-doc-cat-");
    cpSync(join(ROOT, "skills-work"), dir, { recursive: true });
    mutate(dir);
    return spawnSync(process.execPath, [join(ROOT, "scripts", "gen-skills-catalog.mjs")], { encoding: "utf8", env: { ...process.env, OPCHAIN_WORK_SKILLS_DIR: dir } });
  };
  it("the body is at most 4,100 tokens (built), under the catalog's 4,500 cap; the description at most 900 characters", () => {
    expect(estimateTokens(body())).toBeLessThanOrEqual(4100);
    const { data } = matter(readFileSync(join(SKILL, "SKILL.md"), "utf8"));
    expect(data.description.length).toBeLessThanOrEqual(900);
    expect(data.description.slice(0, 200)).toContain("ow-documentation");
    expect(data.metadata.network).toBe("declared");
    expect(data.metadata.version).toBe("1.0.2");
    expect(loadCatalogs({ root: ROOT }).find((c) => c.prefix === "ow-").bodyTokenBudgets["ow-documentation"]).toBe(4500);
  });
  it("a planted 4,600-token body fails the catalog itself", () => {
    const r = catalog((dir) => writeFileSync(join(dir, "ow-documentation/SKILL.md"), `${readFileSync(join(SKILL, "SKILL.md"), "utf8")}\n${"Planted filler sentence. ".repeat(Math.ceil((4600 * 4 - body().length) / 25))}\n`));
    expect(r.status).not.toBe(0);
    expect(r.stderr + r.stdout).toMatch(/ow-documentation\/SKILL\.md: body is ~\d+ tokens, over the 4500-token budget/);
  });
  it("a 1,025-character description fails the catalog", () => {
    const r = catalog((dir) => {
      const p = join(dir, "ow-documentation/SKILL.md");
      const t = readFileSync(p, "utf8");
      writeFileSync(p, t.replace("  fixing code, or sending anything without your confirmation.\n", `  fixing code, or sending anything without your confirmation. ${"x".repeat(1025)}\n`));
    });
    expect(r.status).not.toBe(0);
    expect(r.stderr + r.stdout).toMatch(/description is \d+ chars, over the 1024 limit/);
  });
  it("the protocol copy is byte-identical, and the shared handoffs.yaml (with docs) is byte-identical in every skill", () => {
    expect(checkProtocolCopies(loadCatalogs({ root: ROOT }))).toEqual([]);
    const copies = ["ow-start", "ow-build-plan", "ow-build", "ow-uat", "ow-documentation"].map((s) => readFileSync(join(ROOT, "skills-work", s, "examples", "handoffs.yaml")));
    for (const c of copies) expect(c.equals(copies[0])).toBe(true);
    expect(copies[0].toString()).toMatch(/^docs: /m);
    expect(copies[0].toString()).toMatch(/^#   docs:\n#     repo: \{ path: docs\/client-handbook\/, handover_path: docs\/handover\/ \}/m);
  });
  it("a one-byte drift in any handoffs.yaml copy is a difference", () => {
    const a = readFileSync(join(ROOT, "skills-work/ow-uat/examples/handoffs.yaml"));
    const b = Buffer.from(a); b[b.length - 2] ^= 1;
    expect(a.equals(b)).toBe(false);
  });
});

describe("C3, C20, C1: the skill's own text and its pins", () => {
  it("C3: no private or brand name, oc- skill, price, evaluation id, script name or skill outside 2.1", () => expect(shippedTextProblems()).toEqual([]));
  it("C20: every step name used anywhere is in the step table, and the checker's steps are the table's", () => expect(stepNameProblems()).toEqual([]));
  it("C1: skill.edges.yaml matches the pinned writers exactly, and the hand-off fields the next stages read", () => {
    expect(edgesWriterDrift()).toEqual([]);
    expect(handoffFieldDrift()).toEqual([]);
    expect(uatHandoffDrift()).toEqual([]);
  });
  it("C1: the family's edges hold with ow-documentation built (four live links, in-place chains)", () => {
    expect(checkEdges(loadCatalogs({ root: ROOT }))).toEqual([]);
    const cats = loadCatalogs({ root: ROOT }).find((c) => c.prefix === "ow-");
    expect(cats.planned).not.toContain("ow-documentation");
    // ow-handoff is built (OW-06): its verbs are declared in its own frontmatter, no longer planned.
    expect(cats.planned).not.toContain("ow-handoff");
    expect(cats.plannedVerbs["ow-handoff"]).toBeUndefined();
    expect(readFileSync(join(ROOT, "skills-work", "ow-handoff", "SKILL.md"), "utf8")).toMatch(/commands: .*\/ow-handoff-notes .*\/ow-handoff-package/);
    expect(cats.plannedVerbs["ow-care"]).toEqual(expect.arrayContaining(["/ow-care-request"]));
    expect(cats.statusNames["/ow-documentation-rollout"]).toBe("G-");
  });
});

describe("C17: hand-off fields (H3's producer side, ow-build's B4, ow-care §1)", () => {
  const v = runView("delivered");
  const D = "opchain-work/docs/larkspur-ceramics";
  it("H3: OP-nn ids and titles, the delivery date, planned_delivery and capture_profile, the handover path and files", () => {
    const rb = matter(v.read(`${D}/runbook.md`));
    expect(rb.data.ops).toEqual(["OP-01", "OP-02", "OP-03", "OP-04", "OP-05", "OP-06", "OP-07"]);
    expect([...rb.content.matchAll(/^### (OP-\d+): .+$/gm)].map((m) => m[1])).toEqual(rb.data.ops);
    expect(String(matter(v.read(`${D}/delivered.md`)).data.delivered instanceof Date ? matter(v.read(`${D}/delivered.md`)).data.delivered.toISOString().slice(0, 10) : matter(v.read(`${D}/delivered.md`)).data.delivered)).toBe("2027-02-15");
    const d = yaml.load(v.read(`${D}/docs.yaml`));
    expect(d.capture_profile).toBe("larkspur-ceramics");
    expect(d.planned_delivery).toBeTruthy();
    const del = yaml.load(v.read(`${D}/deliveries.yaml`));
    expect(del.repo.handover_path).toBe("docs/handover/");
    expect(del.repo.files.map((f) => f.path)).toEqual(expect.arrayContaining(["docs/handover/README.md", "docs/handover/run-and-deploy.md"]));
  });
  it("the pinned field lists are what ow-build reads, and what ow-start indexes", () => {
    const build = yaml.load(readFileSync(join(ROOT, "skills-work/ow-build/skill.edges.yaml"), "utf8"));
    const row = build.reads.find((r) => r.path === "docs/<client>/delivered.md");
    expect(row.fields).toEqual(HANDOFF_PIN["/ow-build-invoice"]["docs/<client>/delivered.md"]);
    const start = yaml.load(readFileSync(join(ROOT, "skills-work/ow-start/skill.edges.yaml"), "utf8"));
    const idx = start.reads.find((r) => r.path === "docs/<client>/docs.yaml");
    expect(idx.fields).toEqual(["created", "trainer"]);
    expect(yaml.load(v.read(`${D}/docs.yaml`)).trainer).toMatch(/^(user|client)$/);
  });
});

describe("cross-skill parity: ow-build reads these goldens as its own (B4)", () => {
  it("ow-build's documentation fixture is a byte copy of the delivered golden (delivered: 2027-02-15)", () => {
    const ours = readFileSync(join(FIXTURES, "delivered/expected/opchain-work/docs/larkspur-ceramics/delivered.md"));
    const theirs = readFileSync(join(ROOT, "tests/fixtures/ow-build/invoice-documentation/input/opchain-work/docs/larkspur-ceramics/delivered.md"));
    expect(theirs.equals(ours)).toBe(true);
    expect(ours.toString()).toMatch(/^delivered: 2027-02-15$/m);
  });
  const key = { slug: "larkspur-ceramics" };
  const viewWith = (ledgerState, deliveredRel) => {
    const v = buildView("change-fix-too-big");
    const delivered = deliveredRel ? readFileSync(join(FIXTURES, deliveredRel), "utf8") : null;
    return { ...v, exists: (rel) => (rel === "opchain-work/docs/larkspur-ceramics/delivered.md" ? delivered != null : v.exists(rel)), read: (rel) => (rel === "opchain-work/docs/larkspur-ceramics/delivered.md" ? delivered : v.read(rel)), ledgerState };
  };
  const docTriggers = (v, ledger) => metTriggers(v, key, ledger).filter((m) => m.trigger === "documentation");
  it("bought and delivered: one documentation request", () => {
    const v = viewWith("not met", "delivered/expected/opchain-work/docs/larkspur-ceramics/delivered.md");
    const ledger = matter(v.read("opchain-work/builds/larkspur-ceramics/ledger.md")).data;
    expect(docTriggers(v, ledger).length).toBe(1);
  });
  // Round 1 nit: the old version set the ledger state and asserted it back. The real cover is ow-build's own
  // invoice-documentation-refused, which runs over the swapped byte copy: ow-build writes nothing a second time.
  it("already requested: ow-build refuses a second request over the byte copy, and -delivered prints no invoice NEXT", () => {
    const refused = loadKey(join(ROOT, "tests/fixtures/ow-build/invoice-documentation-refused"));
    expect(refused.base).toBe("invoice-documentation");
    expect(buildCase("invoice-documentation-refused").filter((r) => r.problems.length)).toEqual([]);
    const printed = readFileSync(join(FIXTURES, "delivered-ledger-requested/expected/printed.md"), "utf8");
    expect(printed).not.toMatch(/use ow-build to invoice the documentation line/);
    expect(runCase("delivered-ledger-requested").every((r) => !r.problems.length)).toBe(true);
  });
  it("declined: none", () => {
    const v = buildView("invoice-booking-small");
    const ledger = matter(v.read("opchain-work/builds/mossgate-books/ledger.md")).data;
    expect(metTriggers({ ...v, exists: (rel) => (/docs\/mossgate-books\/delivered\.md$/.test(rel) ? true : v.exists(rel)) }, { slug: "mossgate-books" }, ledger).filter((m) => m.trigger === "documentation")).toEqual([]);
  });
  // ow-build's own test file runs all of its goldens; here, the one case whose stand-in was swapped.
  it("ow-build's invoice-documentation golden still passes (the stand-in swapped)", () => {
    expect(buildCase("invoice-documentation").filter((r) => r.problems.length)).toEqual([]);
  });
});

describe("C18: P3 in ow-build-plan (1.2.0)", () => {
  const ci = () => readFileSync(join(ROOT, "tests/fixtures/ow-build-plan/accepted-signed/expected/opchain-work/plans/larkspur-ceramics/contract-inputs.md"), "utf8");
  it("documentation_people is top-level (6, the quote's), and the body says when the line is invoiced", () => {
    expect(ci()).toMatch(/^documentation_people: 6$/m);
    expect(ci()).toMatch(/invoiced when the documents are delivered/);
    const bp = readFileSync(join(ROOT, "skills-work/ow-build-plan/SKILL.md"), "utf8");
    expect(bp).toMatch(/version: "1\.2\.1"/);
    // P3 on top of P5: the body stays under the catalog's enforced 4,500-token cap.
    expect(loadCatalogs({ root: ROOT }).find((c) => c.prefix === "ow-").bodyTokenBudgets["ow-build-plan"]).toBe(4500);
    expect(estimateTokens(bp.slice(bp.indexOf("\n---", 3) + 4))).toBeLessThanOrEqual(4500);
    expect(readFileSync(join(ROOT, "skills-work/ow-build-plan/CHANGELOG.md"), "utf8")).toMatch(/^## 1\.2\.0 \(2026-10-19\): amendment P3/m);
  });
  it("ow-uat's terms digests are unchanged by P3", () => {
    const uat = yaml.load(runView("start").read("opchain-work/uat/larkspur-ceramics/uat.yaml"));
    const row = uat.basis.find((b) => b.file === "agreed/contract-terms.md");
    expect(blockDigest(ci())).toBe(row.digest);
    expect(row.digest).toBe("sha256:eb78a5c46a94aea94972758789e62eec4e622fe46a022d44281d74bc5306ed27");
  });
  // ow-build-plan's and ow-uat's own test files run all of their goldens; here, the six P3 updated on purpose.
  it("ow-build-plan's six goldens P3 updated on purpose pass", () => {
    for (const c of ["accepted-signed", "route-folder", "private-names-business", "delivery-quote", "quick-quote", "unpriced-package", "uat-documentation"]) expect(planCase(c).filter((r) => r.problems.length), c).toEqual([]);
  });
});

describe("the trigger queries and the fixtures' README", () => {
  it("at least 5 should-trigger and 3 should-not-trigger prompts, with the three the contract names", () => {
    const q = yaml.load(readFileSync(join(FIXTURES, "trigger-queries.yaml"), "utf8"));
    expect(q.should_trigger.length).toBeGreaterThanOrEqual(5);
    expect(q.should_not_trigger.length).toBeGreaterThanOrEqual(3);
    const not = q.should_not_trigger.map((x) => x.goes_to).join("\n");
    for (const w of ["ow-handoff", "ow-draft", "none: fixing code"]) expect(not).toContain(w);
  });
  it("no image is committed; the git-ignore line covers the fixtures' shots", () => {
    const tracked = spawnSync("git", ["ls-files", "tests/fixtures/ow-documentation"], { cwd: ROOT, encoding: "utf8" }).stdout.split("\n").filter(Boolean);
    expect(tracked.filter((f) => /\.png$/.test(f))).toEqual([]);
    expect(readFileSync(join(ROOT, ".gitignore"), "utf8")).toMatch(/^tests\/fixtures\/ow-documentation\/\*\*\/shots\/\*\.png$/m);
  });
});

function asList(v) { return Array.isArray(v) ? v : v == null ? [] : [v]; }
