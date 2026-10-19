// Planted failures for ow-uat (Sprint 3 contract C17: plants are permanent). Each
// plant edits a golden run (or a copy of skills-work/) and must fail the check it
// targets; each meaning check also has its must-pass controls, written before the
// rules (tests/ow-uat-sentences.mjs). A skip is allowed only when it names an
// owner decision; there are none here. Grouped by the contract's criteria.
import { afterAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as yaml from "js-yaml";
import { FIXTURES, PUBLISHED_TEST_CARDS, addBusinessDays, appliesOnTheDate, blockDigest, credentialFindings, dataFindings, edgesWriterDrift, exitCriteria, expectedRoute, falsePassFindings, handoffFieldDrift, internalFindings, internalReads, listCases, loadKey, peopleFindings, runCase, runView, sentences, tableHolidays, termsBlock, termsTextMismatches } from "../scripts/ow-uat-acceptance.mjs";
import { addDate } from "../plugins/ow-tools/lib/calc.mjs";
import { FIXTURES as BUILD_FX, expectedRoute as buildRoute, prepare as buildPrepare, runCase as buildCaseRun } from "../scripts/ow-build-acceptance.mjs";
import { checkEdges, checkFamily, checkProtocolCopies, checkVerbs } from "../scripts/check-skill-contracts.mjs";
import { loadCatalogs } from "../scripts/lib/catalogs.mjs";
import { matter } from "../scripts/lib/frontmatter.mjs";
import * as S from "./ow-uat-sentences.mjs";
import { cleanup, failures, golden, mutated, rep, temp } from "./ow-uat-helpers.mjs";

const ROOT = join(import.meta.dirname, "..");
afterAll(cleanup, 120_000);
const L = "opchain-work/uat/larkspur-ceramics";
const M = "opchain-work/uat/mossgate-books";
const append = (s) => (t) => `${t}${s}`;
/** A planted run fails `check` (and, if given, with a message matching `re`). */
const plant = (id, desc, caseName, edits, check, re) => it(`${id}: ${desc}`, () => {
  const out = failures(caseName, mutated(caseName, edits));
  expect(Object.keys(out), JSON.stringify(out, null, 1).slice(0, 1500)).toContain(check);
  if (re) expect(out[check]).toMatch(re);
});

// ── C1, C2, C3: the catalog, the edges and the family names ─────────────────
describe("C1-C3: catalog, edges and family plants (check-skill-contracts, gen-skills-catalog)", () => {
  const E = "ow-uat/skill.edges.yaml", B = "ow-uat/SKILL.md", R = (f) => `ow-uat/references/${f}`;
  const contract = (id, desc, edits, want, { catalog = false } = {}) => it(`${id}: ${desc}`, () => {
    const dir = temp("ow-uat-family-");
    cpSync(join(ROOT, "skills-work"), dir, { recursive: true });
    for (const [rel, fn] of Object.entries(edits)) {
      const p = join(dir, rel);
      const before = readFileSync(p, "utf8");
      const after = fn(before);
      if (after === before) throw new Error(`${id}: ${rel} unchanged`);
      writeFileSync(p, after);
    }
    const cats = loadCatalogs({ root: ROOT, env: { OPCHAIN_WORK_SKILLS_DIR: dir } });
    const out = [...checkEdges(cats), ...checkFamily(cats), ...checkProtocolCopies(cats), ...(checkVerbs(null, { catalogs: cats }) ?? [])];
    if (catalog) {
      const gen = spawnSync(process.execPath, [join(ROOT, "scripts", "gen-skills-catalog.mjs")], { env: { ...process.env, OPCHAIN_WORK_SKILLS_DIR: dir }, encoding: "utf8" });
      expect(gen.status).not.toBe(0);
      out.push(gen.stderr + gen.stdout);
    }
    expect(out.join("\n")).toMatch(want);
  });
  contract("K01", "a one-sided edge: ow-uat drops its reads row for ready-for-uat.md", { [E]: (t) => t.replace(/ {2}- from: ow-build\n {4}path: builds\/<client>\/ready-for-uat\.md\n(?: {4}[^\n]+\n)+/, "") }, /hands off builds\/<client>\/ready-for-uat\.md to ow-uat, but skills-work\/ow-uat\/skill\.edges\.yaml has no reads row/);
  contract("K02", "-run writing UAT-nn.md", { [E]: rep("  - { path: uat/<client>/evidence/index.md, verb: /ow-uat-run }\n", "  - { path: uat/<client>/evidence/index.md, verb: /ow-uat-run }\n  - { path: uat/<client>/defects/UAT-nn.md, verb: /ow-uat-run }\n") }, /uat\/<\*>\/defects\/uat-nn\.md: 2 writers/);
  contract("K03", "--sent writing signoff.md", { [E]: rep("  - { path: uat/<client>/backstop.md, verb: /ow-uat-signoff --backstop }\n", "  - { path: uat/<client>/backstop.md, verb: /ow-uat-signoff --backstop }\n  - { path: uat/<client>/signoff.md, verb: /ow-uat-signoff --sent }\n") }, /uat\/<\*>\/signoff\.md: 2 writers/);
  contract("K04", "a dangling NEXT (an undeclared verb in a slash hint)", { [B]: rep("(where slash commands exist: /ow-uat-pack)", "(where slash commands exist: /ow-uat-bundle)") }, /`\/ow-uat-bundle` is not declared/);
  contract("K05", "an unoffered field: ow-build reads a field of signoff.md that ow-uat does not hand off", { "ow-build/skill.edges.yaml": rep("fields: [signed or deemed date, request number]", "fields: [signed or deemed date, request number, invoice amount]") }, /reads field `invoice amount` of uat\/<client>\/signoff\.md/);
  contract("K06", "O1: an in-place read whose producer does not write the file", { [E]: rep("    path: builds/<client>/changes/requests.md\n", "    path: builds/<client>/changes/requests-log.md\n"), [B]: rep("`builds/<client>/changes/requests.md` (in place)", "`builds/<client>/changes/requests-log.md` (in place)") }, /reads builds\/<client>\/changes\/requests-log\.md in place from ow-build, which skills-work\/ow-build\/skill\.edges\.yaml does not write/);
  contract("K07", "O1: an in-place read with no chain of hand-offs (ow-start reading ow-uat's sign-off in place)", { "ow-start/skill.edges.yaml": rep("reads:\n", "reads:\n  - { from: ow-uat, path: uat/<client>/signoff.md, in_place: true, if_absent: Ask, if_mismatch: Use what parses }\n") }, /reads uat\/<client>\/signoff\.md in place from ow-uat, but no chain of hand-offs from ow-uat to ow-start lists it at every hop/);
  contract("K08", "OD-1: a hop drops the file (ow-build's ready hand-off stops handing on the plan's roles map)", { "ow-build/skill.edges.yaml": rep("      - { path: plans/<client>/map/roles.md, in_place: true }\n", "") }, /ow-uat\/skill\.edges\.yaml: reads plans\/<client>\/map\/roles\.md in place from ow-build-plan, but no chain of hand-offs from ow-build-plan to ow-uat lists it at every hop \(owner decision OD-1\)/);
  contract("K08b", "OD-1 (Evaluator O1z): ow-build-plan reads ow-uat's signoff.md in place; a chain reaches it, but no hop past ow-build lists the file", { "ow-build-plan/skill.edges.yaml": rep("reads:\n", "reads:\n  - { from: ow-uat, path: uat/<client>/signoff.md, in_place: true, if_absent: Ask, if_mismatch: Use what parses }\n") }, /ow-build-plan\/skill\.edges\.yaml: reads uat\/<client>\/signoff\.md in place from ow-uat, but no chain of hand-offs from ow-uat to ow-build-plan lists it at every hop \(owner decision OD-1\)/);
  contract("K08c", "OD-1: an in-place hand-off entry the receiver neither reads nor hands on", { "ow-build/skill.edges.yaml": rep("      - { path: plans/<client>/map/roles.md, in_place: true }\n", "      - { path: plans/<client>/map/roles.md, in_place: true }\n      - { path: plans/<client>/risks.md, in_place: true }\n") }, /hands on plans\/<client>\/risks\.md in place to ow-uat, which neither reads it nor hands it on in place/);
  contract("K09", "O2: secrets-seen.log written by a second skill", { "ow-build/skill.edges.yaml": rep("  - { path: STATUS.md, verb: /ow-build-start, append: true }\n", "  - { path: STATUS.md, verb: /ow-build-start, append: true }\n  - { path: uat/<client>/secrets-seen.log, verb: /ow-build-change, append: true }\n") }, /secrets-seen\.log is a skill-local append log of ow-uat \(its append_logs\); ow-build \/ow-build-change cannot write it/);
  contract("K10", "O2: the local log written without append: true", { [E]: rep("  - { path: uat/<client>/secrets-seen.log, verb: /ow-uat-run, append: true }", "  - { path: uat/<client>/secrets-seen.log, verb: /ow-uat-run }") }, /secrets-seen\.log is a skill-local append log; \/ow-uat-run must declare append: true/);
  contract("K11", "a written file the Verbs table never names", { [E]: rep("  - { path: uat/<client>/runs/RUN-nn.md, verb: /ow-uat-run }\n", "  - { path: uat/<client>/runs/RUN-nn.md, verb: /ow-uat-run }\n  - { path: uat/<client>/runs/notes.md, verb: /ow-uat-run }\n") }, /does not name uat\/<client>\/runs\/notes\.md in the Writes column of `\/ow-uat-run`/);
  contract("K12", "a sign-off STATUS template that does not name the request", { [R("phase-signoff.md")]: rep("`next: ow-uat /ow-uat-signoff uat/<client>/ | awaiting: sending request <n> by <planned send date>`", "`next: ow-uat /ow-uat-signoff uat/<client>/ | awaiting: sending it by <planned send date>`") }, /does not name request <n> \(catalogs\.json statusNames: \/ow-uat-signoff\)/);
  contract("K13", "routes.paths drops the folder route", { [E]: rep("paths: [builds/<client>/ready-for-uat.md, uat/<client>/]", "paths: [builds/<client>/ready-for-uat.md]") }, /routes\.paths does not list uat\/<slug>\//);
  contract("K14", "a NEXT template drifting into a phase file", { [R("phase-pack.md")]: append("\n    NEXT: say \"use ow-uat-run to import the packs for uat/<client>/\"   (where slash commands exist: /ow-uat-run)\n          It will read: pack.yaml\n          [no folder attached: attach it when you say it]\n    IF IT IS NOT AVAILABLE: by hand.\n") }, /the NEXT template "use ow-uat-run to import the packs for uat\/<client>\/" matches no hands_off say/);
  contract("K15", "the documentation NEXT with the design's old wording (O5): no declared verb", { [B]: rep("say \"use ow-documentation-start on uat/<client>/\"   (where slash commands exist: /ow-documentation-start)", "say \"use ow-documentation on uat/<client>/\"   (where slash commands exist: /ow-documentation)") }, /`\/ow-documentation` is not declared|matches no hands_off say/);
  contract("K16", "a hand-off to ow-build with no fields while ow-build reads fields", { [E]: rep("      - { path: uat/<client>/backstop.md, fields: [backstop date] }", "      - uat/<client>/backstop.md") }, /hands off uat\/<client>\/backstop\.md to ow-build with no fields list/);
  contract("C2", "the body pushed to ~4,600 tokens fails the catalog, not just a test", { [B]: append(`\n${"Padding sentence for the token budget plant. ".repeat(42)}\n`) }, /over the 4500-token budget/, { catalog: true });
  contract("C2b", "the protocol copy differs", { [R("ow-protocol.md")]: append("\nA local change.\n") }, /ow-uat\/references\/ow-protocol\.md differs/);
  contract("C3a", "llc-ops in a reference", { [R("phase-run.md")]: append("\nHand the results to llc-ops.\n") }, /names `llc-ops`, a private skill/);
  contract("C3b", "the brand with a space", { [R("phase-run.md")]: append("\nAs Deft wright does it.\n") }, /names `Deft wright`, a business/);
  contract("C3c", "the brand with a hyphen", { [R("phase-run.md")]: append("\nAs Deft-wright does it.\n") }, /names `Deft-wright`, a business/);
  contract("C3d", "the brand in another case", { [R("phase-run.md")]: append("\nAs DEFTWRIGHT does it.\n") }, /names `DEFTWRIGHT`, a business/);
  contract("C3e", "an oc- skill named without its prefix", { [R("phase-defect.md")]: append("\nThe app-architect builder fixes it.\n") }, /names `app-architect`, a skill from another catalog/);
  contract("C3f", "a price in words", { [R("self-checks.md")]: append("\nAn extra session is fifteen hundred dollars.\n") }, /names `fifteen hundred dollars`, a price \(an amount in words\)/);
  contract("C3g", "a pasted clause sentence", { [R("phase-signoff.md")]: append("\nThe client shall be deemed to have accepted the build ten business days after the request is sent.\n") }, /contract clause wording/);
  contract("C3h", "the invented test clause pasted into skill text", { [R("contract-calendar.md")]: append("\nINVENTED TEST CLAUSE, not contract wording: a request is deemed accepted ten business days after it is sent unless the client signs it.\n") }, /contract clause wording/);
  contract("C3i", "a currency amount in skill text", { [B]: rep("I sign and send nothing.", "I sign and send nothing. Extra sessions are $175.") }, /a price \(a currency amount\)/);
  // The Evaluator's round-1 family plants (h/family.mjs), kept (C17). R1-11: clause wording by category,
  // an oc- name however spaced, a price with no currency.
  contract("EV-CL1", "a pasted clause without 'shall' (taken to have accepted ... ten (10) Business Days)", { [R("phase-signoff.md")]: append("\nThe Client will be taken to have accepted the Deliverables if it does not reject them in writing within ten (10) Business Days of receipt.\n") }, /contract clause wording/);
  contract("EV-CL2", "a drafted clause sentence (acceptance is deemed given ten business days after ...)", { [R("signoff-schemas.md")]: append("\nAcceptance is deemed given ten business days after the request is delivered.\n") }, /contract clause wording/);
  contract("EV-CL3", "a drafted backstop clause (becomes due five business days after a readiness notice)", { [R("phase-signoff.md")]: append("\nThe delivery payment becomes due five business days after a readiness notice, whether or not the client has acted.\n") }, /contract clause wording/);
  contract("EV-NM1", "the brand possessive", { [R("phase-run.md")]: append("\nUpload it to Deftwright's portal.\n") }, /names `Deftwright`, a business/);
  contract("EV-NM2", "the private skill with an underscore", { [R("phase-run.md")]: append("\nHand the clause to llc_ops.\n") }, /names `llc_ops`, a private skill/);
  contract("EV-NM3", "an oc- skill name with spaces (oc code auditor)", { [R("phase-run.md")]: append("\nThe oc code auditor reviews it.\n") }, /names `code auditor`, a skill from another catalog/);
  contract("EV-PR1", "a price as 1.5k", { [R("self-checks.md")]: append("\nA further session is about 1.5k.\n") }, /names `1\.5k`, a price \(an amount with no currency\)/);
  contract("EV-PR2", "a price per hour with no currency", { [R("self-checks.md")]: append("\nThe extension is billed at 95 an hour.\n") }, /a price \(an amount with no currency\)/);
  contract("EV-PR3", "USD1,500 with no space", { [R("self-checks.md")]: append("\nAn extra round is USD1,500.\n") }, /a price \(a currency amount\)/);
  contract("EV-O1x", "in_place as the string \"true\"", { [E]: rep("    path: builds/<client>/ledger.md\n    in_place: true\n", "    path: builds/<client>/ledger.md\n    in_place: \"true\"\n") }, /in_place must be true or left out/);
  contract("EV-O1y", "ow-start reads ow-build's ledger.md in place (no chain carries it to ow-start)", { "ow-start/skill.edges.yaml": rep("reads:\n", "reads:\n  - { from: ow-build, path: builds/<client>/ledger.md, in_place: true, if_absent: Ask, if_mismatch: Use what parses }\n") }, /reads builds\/<client>\/ledger\.md in place from ow-build, but no chain of hand-offs from ow-build to ow-start lists it at every hop/);
  contract("EV-O2x", "ow-build also declares ow-uat's secrets-seen.log as its own append log", { "ow-build/skill.edges.yaml": rep("writes:\n", "append_logs: [uat/<client>/secrets-seen.log]\nwrites:\n  - { path: uat/<client>/secrets-seen.log, verb: /ow-build-change, append: true }\n") }, /is already a skill-local append log of|a log has one owning skill/);
  contract("EV-O2y", "ow-uat's append_logs names a log no row writes", { [E]: rep("append_logs: [uat/<client>/secrets-seen.log]", "append_logs: [uat/<client>/secrets-seen.log, uat/<client>/access.log]") }, /append_logs names uat\/<client>\/access\.log, but no writes row of ow-uat appends to it/);
  contract("EV-WE2", "a second verb (/ow-uat-defect) writes backstop-log.yaml", { [E]: rep("  - { path: uat/<client>/backstop.md, verb: /ow-uat-signoff --backstop }", "  - { path: uat/<client>/backstop.md, verb: /ow-uat-signoff --backstop }\n  - { path: uat/<client>/backstop-log.yaml, verb: /ow-uat-defect }") }, /backstop-log\.yaml: 2 writers|does not name uat\/<client>\/backstop-log\.yaml/);
  contract("EV-TB1", "the token cap dodged by moving phase detail into the frontmatter description", { [B]: rep("  fixing code, signing anything, or sending anything: it never marks\n  acceptance without every required scenario passing after the last fix.", `  fixing code, signing anything, or sending anything: it never marks\n  acceptance without every required scenario passing after the last fix. ${"It also explains every phase in detail here so the body stays small. ".repeat(28)}`) }, /description is \d+ chars, over the 1024/, { catalog: true });
});

// ── C4: every route cell, planted ────────────────────────────────────────────
describe("C4: a plant per route cell", () => {
  const all = listCases().filter((c) => Boolean(loadKey(join(FIXTURES, c)).route));
  it("there are route cases to plant", () => expect(all.length).toBeGreaterThanOrEqual(25));
  for (const c of all) {
    const key = loadKey(join(FIXTURES, c));
    const slug = key.slug;
    const U = `opchain-work/uat/${slug}`;
    if (["nothing", "ask"].includes(String(key.route.expect))) {
      plant(`R-${c}`, `the route writes nothing (${key.route.expect}): a written uat.yaml is caught`, c, { [`${U}/uat.yaml`]: (t) => (t == null ? "ow_artefact: ow-uat/uat\n" : `${t}# planted\n`) }, "route", /the route writes nothing/);
    } else {
      const other = key.route.expect === "pack" ? `${U}/runs/RUN-99.md` : `${U}/pack.yaml`;
      plant(`R-${c}`, `a file of another verb written on the ${key.route.expect} route is caught`, c, { [other]: (t) => `${t ?? ""}planted: true\n` }, "route", /but the route runs|written by/);
    }
  }
  plant("R-replan", "a re-plan over a frozen basis (plan complete): agreed/ rewritten", "route-ready-complete", { [`${L}/agreed/acceptance.md`]: append("\n<!-- planted re-freeze -->\n") }, "route");
  plant("R-request", "a request rewritten on the drafted route", "route-signoff-drafted", { [`${L}/signoff-request-1.md`]: append("\nA new line.\n") }, "route");
  it("R-wrongverb: the folder route at the drafted stage never lands on the confirmation run", () => {
    const run = runView("route-folder-drafted");
    const key = { ...loadKey(join(FIXTURES, run.home)), ...loadKey(join(FIXTURES, "route-folder-drafted")) };
    key.today = loadKey(join(FIXTURES, run.home)).today;
    expect(expectedRoute(run, key)).not.toContain("run");
    expect(expectedRoute(run, key)).toContain("signoff --sent");
  });
});

// ── C5: ow-build reads ow-uat's real files ───────────────────────────────────
describe("C5: ow-build's checker on ow-uat's goldens", () => {
  /** A minimal view of ow-uat's golden world for ow-build's route function. */
  const view = (caseName) => { const r = runView(caseName); return { ...r, priorRead: r.read, priorExists: r.exists, priorAll: r.all }; };
  const route = (caseName, from) => buildRoute(view(caseName), { slug: from.split("/")[1] }, from);
  it("a Change routes to -change; an extension set to -change; Defect, Training gap, Environment or data route to nothing", () => {
    expect(route("defect-change-portal", "uat/larkspur-ceramics/defects/UAT-06.md")).toBe("change");
    expect(route("defect-change-text", "uat/larkspur-ceramics/defects/UAT-07.md")).toBe("change");
    expect(route("defect-extension", "uat/larkspur-ceramics/defects/UAT-03.md")).toBe("change");
    expect(route("defect-extension", "uat/larkspur-ceramics/defects/UAT-04.md")).toBe("change");
    expect(route("defect-triage", "uat/larkspur-ceramics/defects/UAT-03.md")).toBe("nothing");
    expect(route("defect-triage", "uat/larkspur-ceramics/defects/UAT-01.md")).toBe("nothing");
    expect(route("defect-triage", "uat/larkspur-ceramics/defects/UAT-02.md")).toBe("nothing");
    expect(route("defect-retest", "uat/larkspur-ceramics/defects/UAT-08.md")).toBe("nothing");
  });
  it("a Duplicate routes to nothing (class line read as ow-build reads it)", () => {
    const r = view("defect-retest");
    const dup = { ...r, read: (rel) => (rel.endsWith("UAT-08.md") ? r.read(rel).replace("class: Defect", "class: Duplicate").replace("status: moved to punch list", "status: closed -> UAT-03") : r.read(rel)) };
    expect(buildRoute(dup, { slug: "larkspur-ceramics" }, "uat/larkspur-ceramics/defects/UAT-08.md")).toBe("nothing");
  });
  it("signoff.md and backstop.md route to the invoice", () => {
    expect(route("signoff-signed", "uat/larkspur-ceramics/signoff.md")).toBe("invoice");
    expect(route("m-backstop", "uat/mossgate-books/backstop.md")).toBe("invoice");
  });
  it("deliverable 6: ow-build's UAT inputs are byte-identical copies of ow-uat's goldens, with no stand-in left", () => {
    const B = join(ROOT, "tests", "fixtures", "ow-build");
    const pairs = [
      ["change-uat-extension/input", "defect-extension", `${L}/defects/UAT-03.md`],
      ["change-uat-extension/input", "defect-extension", `${L}/defects/UAT-04.md`],
      ["change-uat-extension/input", "defect-extension", `${L}/defects/UAT-05.md`],
      ["change-uat-too-big/input", "defect-change-portal", `${L}/defects/UAT-06.md`],
      ["change-uat-unpriced/input", "defect-change-text", `${L}/defects/UAT-07.md`],
      ["invoice-acceptance/input", "signoff-signed", `${L}/signoff.md`],
      ["invoice-delivery-backstop/input", "m-backstop", `${M}/backstop.md`],
    ];
    for (const [where, uatCase, rel] of pairs) expect(readFileSync(join(B, where, rel), "utf8"), `${where}/${rel}`).toBe(golden(uatCase, rel));
    const stale = spawnSync("grep", ["-rl", "ow-uat is not built yet", join(B)], { encoding: "utf8" }).stdout.trim();
    expect(stale).toBe("");
  });
  it("ow-build's goldens that read them still pass", async () => {
    const { runCase: buildCase } = await import("../scripts/ow-build-acceptance.mjs");
    for (const c of ["change-uat-extension", "change-uat-too-big", "change-uat-unpriced", "change-uat-repriced", "change-sent", "change-declined", "invoice-acceptance", "invoice-delivery-backstop", "invoice-delivery-refused", "invoice-delivery-handoff", "route-uat", "route-uat-too-big", "route-uat-repriced", "route-trigger-signoff", "route-folder-signoff"]) {
      const bad = buildCase(c).filter((r) => r.problems.length);
      expect(bad, `${c}: ${JSON.stringify(bad)}`).toEqual([]);
    }
  });
  it("ow-build reads every field of the files ow-uat hands it, in ow-uat's golden shapes", () => {
    const s = matter(golden("signoff-signed", `${L}/signoff.md`)).data;
    expect(s.request).toBe(2);
    expect(s.signed instanceof Date ? s.signed.toISOString().slice(0, 10) : s.signed).toBe("2027-01-27");
    expect(matter(golden("m-backstop", `${M}/backstop.md`)).data.backstop_date).toBeTruthy();
    for (const id of ["UAT-03", "UAT-04", "UAT-05"]) expect(golden("defect-extension", `${L}/defects/${id}.md`)).toMatch(/^class: Defect$[\s\S]*extension requested, client cause: testers absent from session 2 on 2027-01-12/m);
    const gov = yaml.load(golden("m-plan-no-uat-line", `${M}/uat.yaml`)).terms.governing;
    expect(gov.statement).toMatch(/acceptance is the shop manager's sign-off/i);
    expect(gov.stated_by).toBe("Robin");
    expect(readFileSync(join(ROOT, "skills-work", "ow-build", "references", "phase-invoice.md"), "utf8")).toMatch(/When `uat\/<client>\/uat\.yaml` records the user's dated statement of which acceptance or delivery definition governs this job/);
  });
});

// ── C6: no internal numbers (owner decisions D1, D2) ─────────────────────────
describe("C6: the regression net for our side, and its must-pass controls", () => {
  const ctx = { user: "Robin", legit: new Set([225000, 260000, 400000, 1745000, 698000, 349000, 80000]) };
  it(`has at least 30 must-pass client sentences (${S.C6_CONTROLS.length})`, () => expect(S.C6_CONTROLS.length).toBeGreaterThanOrEqual(30));
  for (const s of S.C6_CONTROLS) it(`control passes: ${s}`, () => expect(internalFindings(s, ctx)).toEqual([]));
  for (const s of S.C6_PLANTS) it(`plant caught: ${s}`, () => expect(internalFindings(s, ctx).length).toBeGreaterThan(0));
  for (const s of S.HELDOUT_OURS) it(`held-out our-side sentence caught: ${s}`, () => expect(internalFindings(s, ctx).length).toBeGreaterThan(0));
  for (const s of S.HELDOUT_LEGIT) it(`held-out legitimate sentence passes: ${s}`, () => expect(internalFindings(s, ctx)).toEqual([]));
  plant("N01", "a request says extra sessions are charged at our session rate", "signoff-request-2", { [`${L}/signoff-request-2.md`]: rep("## The build tested\n", "## The build tested\nAny extra session is charged at our session rate.\n") }, "internal_numbers");
  plant("N02", "a client reason gives our effort on a fix", "defect-escalated", { [`${L}/defects/UAT-04.md`]: rep("it stays at no charge.", "it stays at no charge, though we spent two days on it.") }, "internal_numbers");
  plant("N03", "a pack gives the extension rate as a figure", "pack", { [`${L}/uat-pack-bookkeeper.md`]: rep("## Dates\n", "## Dates\nAn extra session is USD 175.00 at the extension rate.\n") }, "internal_numbers");
  plant("N04", "the HTML pack carries our margin", "pack", { [`${L}/export/uat-pack-bookkeeper.html`]: rep("<h2 style=\"color:#1a1a1a\">Dates</h2>", "<h2 style=\"color:#1a1a1a\">Dates</h2>\n<p>Our margin on this test is thin.</p>") }, "internal_numbers");
  plant("N05", "the acceptance record says the fixes ran past what we planned", "signoff-signed", { [`${L}/acceptance-record.md`]: rep("Every check in the agreed basis, with its final result.", "Every check in the agreed basis, with its final result. The fixes ran past what we had planned.") }, "internal_numbers");
  plant("N06", "an addendum gives our hours", "signoff-addendum", { [`${L}/acceptance-addendum-CO-04.md`]: rep("it marks no payment.", "it marks no payment. Robin logged 12 hours on the fix.") }, "internal_numbers");
  plant("N07", "the punch list says a fix cost us more than the UAT line", "signoff-signed", { [`${L}/punch-list.md`]: rep("Each is fixed after handoff at no charge.", "Each is fixed after handoff at no charge, though fixing them costs us more than the UAT line.") }, "internal_numbers");
  it("N08: a planted read of price-book.yaml, margin.md or a time export in the skill fails", () => {
    const dir = temp("ow-uat-skill-");
    cpSync(join(ROOT, "skills-work", "ow-uat"), dir, { recursive: true });
    expect(internalReads(dir)).toEqual([]);
    for (const line of ["Read `price-book.yaml` for the extension rate.", "Open `margin.md` to see what the fixes cost.", "Use the time export to report the fix hours."]) {
      writeFileSync(join(dir, "references", "phase-defect.md"), `${readFileSync(join(ROOT, "skills-work", "ow-uat", "references", "phase-defect.md"), "utf8")}\n${line}\n`);
      expect(internalReads(dir).join("\n"), line).toMatch(/reads an internal file/);
    }
  });
});

// ── C7: credentials, people, data (never waived) ─────────────────────────────
describe("C7: the four checks that are never waived", () => {
  const records = ["Ridgeline Builders", "Northgate Homes", "Harlow Kitchens", "PO-88213", "PO-88219", "PO-88224", "PO-88231", "Ridgeline Commons"];
  for (const [name, controls, plants, fn] of [
    ["credentials", S.C7_CREDENTIAL_CONTROLS, S.C7_CREDENTIAL_PLANTS, (s) => credentialFindings(s)],
    ["people", S.C7_PEOPLE_CONTROLS, S.C7_PEOPLE_PLANTS, (s) => peopleFindings(s, S.PEOPLE_CONTEXT)],
    ["data", S.C7_DATA_CONTROLS, S.C7_DATA_PLANTS, (s) => dataFindings(s, { records })],
  ]) {
    it(`${name}: at least 10 must-pass controls (${controls.length})`, () => expect(controls.length).toBeGreaterThanOrEqual(10));
    for (const s of controls) it(`${name} control passes: ${s}`, () => expect(fn(s)).toEqual([]));
    for (const s of plants) it(`${name} plant caught: ${s}`, () => expect(fn(s).length).toBeGreaterThan(0));
  }
  for (const [name, set, fn] of [["credentials", S.HELDOUT_OTHER.credentials, (s) => credentialFindings(s)], ["people", S.HELDOUT_OTHER.people, (s) => peopleFindings(s, S.PEOPLE_CONTEXT)], ["data", S.HELDOUT_OTHER.data, (s) => dataFindings(s, { records })]]) {
    for (const s of set.caught) it(`held-out ${name} caught: ${s}`, () => expect(fn(s).length).toBeGreaterThan(0));
    for (const s of set.legit) it(`held-out ${name} legitimate passes: ${s}`, () => expect(fn(s)).toEqual([]));
  }
  plant("W01", "a run keeps the password from the results file", "run-session-1", { [`${L}/runs/RUN-01.md`]: rep("no sandbox login yet; a credential in the note was not copied", "no sandbox login yet; tried password: Glaze#44") }, "credentials");
  plant("W02", "secrets-seen.log holds the value", "run-session-1", { [`${L}/secrets-seen.log`]: rep("| session: 1", "| session: 1 | value: Glaze#44") }, "secrets", /never the value/);
  plant("W03", "secrets-seen.log entry without its source", "run-session-1", { [`${L}/secrets-seen.log`]: rep(" | source: uat/larkspur-ceramics/evidence/results-session-1.csv row 7 (SC-07 note)", "") }, "secrets");
  plant("W04", "the reset NEXT is not printed", "run-session-1", { "printed.md": rep(" A credential seen: ask the operations manager to reset the bookkeeper tester's login.", "") }, "secrets");
  plant("W05", "a run keeps the Name column", "run-session-1", { [`${L}/runs/RUN-01.md`]: rep("| scenario | proves | tester |", "| scenario | proves | Name | tester |") }, "people");
  plant("W06", "a tester's name in a client reason", "defect-triage", { [`${L}/defects/UAT-03.md`]: rep("The fix is at no charge.", "The fix is at no charge. Jess Arden found it.") }, "people");
  plant("W07", "an email address in a pack", "pack", { [`${L}/uat-pack-order-coordinator.md`]: rep("## Reporting a problem\n", "## Reporting a problem\nWrite to jess.arden@larkspur.example.\n") }, "people");
  plant("W08", "a scenario pasting three real order rows (the design's Real data case)", "plan", { [`${L}/scenarios/SC-01.md`]: rep("## Data (by pointer only)", "| order | customer | code | qty |\n|---|---|---|---|\n| PO-88213 | Ridgeline Builders | LC-1204 | 40 |\n\n## Data (by pointer only)") }, "scenarios", /Data check/);
  plant("W09", "the acceptance record cites a video not cleared", "signoff-signed", { [`${L}/acceptance-record.md`]: rep("| ops-T1-sc04-confirmation-view.png (cleared) |", "| bk-T1-sc06-screen-recording.mov (cleared) |") }, "signed", /not mark cleared/);
  plant("W10", "a run says a customer's name from the client's records", "run-confirmation", { [`${L}/runs/RUN-03.md`]: rep("the date column on the confirmation view is cut off on a narrow screen", "the date column is cut off for Ridgeline Builders") }, "data");
  plant("W11", "uat.yaml records a tester's name", "plan", { [`${L}/uat.yaml`]: rep("  - { role: order coordinator, id: oc-T1 }", "  - { role: order coordinator, id: oc-T1, name: Jess Arden }") }, "plan", /holds more than role and id/);
  plant("W12", "the client contact recorded by name", "plan", { [`${L}/uat.yaml`]: rep("client_contact: operations manager", "client_contact: Tomas Vey") }, "plan", /a role, never a name/);
  plant("W13", "a test account carries a login", "signoff-signed", { [`${L}/signoff.md`]: rep("{ role: test sender, environment: the Larkspur staging mailbox, created_by: builder }", "{ role: test sender, environment: the Larkspur staging mailbox, created_by: builder, login: sender01 }") }, "signed", /never a login/);
  it("W14: the self-check text refuses a typed waiver for each of the four", () => {
    const t = readFileSync(join(ROOT, "skills-work", "ow-uat", "references", "self-checks.md"), "utf8");
    expect(t).toMatch(/\*\*No credentials, People by role or id, Data check and No private names are never waived\*\*: a typed waiver for one of them is refused, and the verb stays stopped\./);
    expect(readFileSync(join(ROOT, "skills-work", "ow-uat", "references", "phase-pack.md"), "utf8")).toMatch(/A typed waiver of the four that are never waived is refused\./);
  });
});

// ── C8: no false pass ────────────────────────────────────────────────────────
describe("C8: who tested", () => {
  it(`has at least 10 must-pass controls (${S.C8_CONTROLS.length})`, () => expect(S.C8_CONTROLS.length).toBeGreaterThanOrEqual(10));
  for (const s of S.C8_CONTROLS) it(`control passes: ${s}`, () => expect(falsePassFindings(s, S.FALSE_PASS_CONTEXT)).toEqual([]));
  for (const s of S.C8_PLANTS) it(`plant caught: ${s}`, () => expect(falsePassFindings(s, S.FALSE_PASS_CONTEXT).length).toBeGreaterThan(0));
  for (const s of S.HELDOUT_OTHER.false_pass.caught) it(`held-out caught: ${s}`, () => expect(falsePassFindings(s, S.HELDOUT_FALSE_PASS_CONTEXT).length).toBeGreaterThan(0));
  for (const s of S.HELDOUT_OTHER.false_pass.legit) it(`held-out legitimate passes: ${s}`, () => expect(falsePassFindings(s, S.HELDOUT_FALSE_PASS_CONTEXT)).toEqual([]));
  plant("F01", "\"your shop manager confirmed AC-1.1\" on a user-alone pass", "m-signoff-request", { [`${M}/signoff-request-1.md`]: rep("## The build tested\n", "## The build tested\nYour shop manager confirmed AC-1.1 in session 2.\n") }, "false_pass");
  plant("F02", "\"UAT-05 is fixed\" with no retested-pass on the latest build", "defect-fixed", { [`${L}/defects/UAT-05.md`]: rep("The fix is at no charge.", "The fix is at no charge. UAT-05 is fixed.") }, "false_pass");
  plant("F03", "a user-stated pass written under a tester's role", "m-run-user-alone", { [`${M}/runs/RUN-03.md`]: rep("| SC-01 | AC-1.1 | none (the user alone) | pass | 2 of 2 | user alone |", "| SC-01 | AC-1.1 | none (the user alone) | pass | 2 of 2 | shop manager |") }, "run", /written under the shop manager's role/);
  plant("F04", "the request drops the builder-run list", "m-signoff-request", { [`${M}/signoff-request-1.md`]: rep("- AC-1.1, AC-1.2 and AC-2.1: run by Robin alone on 18 November 2026, after the shop's tester did not attend on 12 and 17 November 2026", "None: your people ran every check.") }, "signoff", /checked by the builder; not tested by your people/i);
  plant("F05", "a pass with no run_by", "run-confirmation", { [`${L}/runs/RUN-03.md`]: rep("| SC-02 | AC-1.2 | order coordinator oc-T1 | pass | 2 of 2 | order coordinator |", "| SC-02 | AC-1.2 | order coordinator oc-T1 | pass | 2 of 2 |  |") }, "run");
  plant("F06", "printed NEXT calls an unretested problem fixed", "defect-fixed", { "printed.md": rep("    IF IT IS NOT AVAILABLE: retest each fixed scenario and every required scenario in session 3.", "    IF IT IS NOT AVAILABLE: UAT-04 is resolved, so nothing more is needed.") }, "false_pass");
});

// ── C9: the exit criteria and the request lifecycle ──────────────────────────
describe("C9: exit criteria 1-5 and the request lifecycle", () => {
  plant("X01", "Coverage: removing a required scenario fails at -plan", "plan", { [`${L}/scenarios/SC-07.md`]: () => null }, "plan", /Acceptance coverage: AC-5\.2 has no required scenario/);
  plant("X02", "Required scenario: a request written while AC-5.2's required scenario was not run", "signoff-required-not-run", { [`${L}/signoff-request-1.md`]: () => golden("signoff-request-1", `${L}/signoff-request-1.md`) }, "refused");
  plant("X03", "Regression: a request written over the regression", "signoff-regression", { [`${L}/signoff-request-1.md`]: () => golden("signoff-request-1", `${L}/signoff-request-1.md`) }, "refused");
  plant("X04", "Session date: a pre-fix session labelled with the fixed build", "run-confirmation", { [`${L}/runs/RUN-03.md`]: rep("session_date: 2027-01-21", "session_date: 2027-01-14") }, "run", /the latest build change on or before 2027-01-14 is larkspur-uat-2/);
  plant("X05", "Session date: the request cites a run held before the fix", "signoff-session-date", { [`${L}/signoff-request-1.md`]: () => golden("signoff-request-1", `${L}/signoff-request-1.md`) }, "refused");
  plant("X06", "supersession: request 1 left sent after UAT-09", "signoff-request-2", { [`${L}/signoff-requests.yaml`]: (t) => t.replace(/status: superseded\n/, "status: sent\n") }, "signoff", /marks every earlier drafted or sent request superseded|is sent; it is superseded/);
  plant("X07", "supersession by date instead of rec: the why names no event", "signoff-request-2", { [`${L}/signoff-requests.yaml`]: (t) => t.replace(/why: "UAT-09[^"]*"/, 'why: "a later date"') }, "signoff", /does not name the event/);
  plant("X08", "request 3 written without superseding request 2", "signoff-request-3", { [`${L}/signoff-requests.yaml`]: (t) => t.replace(/(- n: 2[\s\S]*?status: )superseded/, "$1sent") }, "signoff");
  plant("X09", "a signature recorded on a superseded request", "signed-superseded-refused", { [`${L}/signoff.md`]: () => golden("signoff-signed", `${L}/signoff.md`) }, "refused");
  plant("X10", "after the signature date: UAT-11 put on the punch list", "signed-after-signature-date", { [`${L}/punch-list.md`]: rep("| UAT-10 |", "| UAT-11 | The confirmation view did not load | major | 2027-01-28 | yes |\n| UAT-10 |") }, "signed", /punch-list\.md lists/);
  plant("X11", "late minor: UAT-10 marked as on the signed list", "signoff-signed", { [`${L}/punch-list.md`]: rep("no: reported after request 2; not on the signed list", "yes") }, "signed", /reported after the request/);
  plant("X12", "a request written while a criterion fails (the condition still stands)", "signoff-condition-too-big", { [`${L}/signoff-request-1.md`]: () => golden("signoff-request-1", `${L}/signoff-request-1.md`) }, "refused");
  plant("X13", "the rec order broken: a new history line reuses an old rec", "defect-retest", { [`${L}/defects/UAT-03.md`]: rep("rec 42: retested-pass in RUN-03", "rec 20: retested-pass in RUN-03") }, "defect", /does not follow/);
  plant("X14", "new recs skip a number", "run-confirmation", { [`${L}/runs/RUN-03.md`]: (t) => t.replace(/^rec: (\d+)$/m, (_, n) => `rec: ${Number(n) + 7}`) }, "rec", /no gap/);
  plant("X15", "--sent changes another request's row", "signoff-sent-2", { [`${L}/signoff-requests.yaml`]: rep("build_label: larkspur-uat-3", "build_label: larkspur-uat-3b") }, "signoff");
  plant("X16", "a minor that is not on the punch list blocks; a request written anyway", "defect-late-minor", { [`${L}/signoff-request-3.md`]: () => golden("signoff-request-1", `${L}/signoff-request-1.md`) }, "writes");
  it("X17: the exit criteria count Defects only: a Change or Training gap typed major never blocks", () => {
    const run = runView("defect-retest");
    const key = loadKey(join(FIXTURES, "defect-retest"));
    expect(exitCriteria(run, key, { asOfDate: "2027-01-22" })).toEqual({});
    const asDefect = { ...run, read: (rel) => (rel.endsWith("UAT-07.md") ? run.read(rel).replace("class: Change", "class: Defect") : run.read(rel)), all: run.all };
    expect(exitCriteria(asDefect, key, { asOfDate: "2027-01-22" })["3"]).toContain("UAT-07");
  });
  it("X18: a fix to an addendum UAT-nn never makes the main checks stale", () => {
    const run = runView("defect-addendum-fixed");
    const key = loadKey(join(FIXTURES, "defect-addendum-fixed"));
    expect(exitCriteria(run, key, { asOfDate: "2027-01-27" })).toEqual({});
  });
});

// ── C10: triage and the rapid fix phase ──────────────────────────────────────
describe("C10: triage, bounds, conditions", () => {
  plant("T01", "a UAT-nn that cites no basis", "defect-triage", { [`${L}/defects/UAT-04.md`]: rep("basis: AC-5.1 (acceptance.md), as frozen in uat/larkspur-ceramics/agreed/", "basis: the invoices") }, "defect", /Triage cites the basis/);
  plant("T02", "a Defect from a failing required scenario typed minor", "defect-triage", { [`${L}/defects/UAT-03.md`]: rep("severity: major", "severity: minor") }, "defect", /major or higher/);
  plant("T03", "one client-side event, but one open Defect lacks the extension request", "defect-extension", { [`${L}/defects/UAT-05.md`]: rep("- 2027-01-13 rec 29: extension requested, client cause: testers absent from session 2 on 2027-01-12\n", "") }, "defect", /UAT-05/);
  plant("T04", "a Defect past its quoted fix rounds with no escalation", "defect-escalated", { [`${L}/defects/UAT-04.md`]: (t) => t.replace(/- 2027-01-27 rec \d+: escalated to Robin: open past 2 fix rounds\n/, "") }, "defect", /escalated/);
  plant("T05", "a builder-caused overrun with no 'no charge' extension", "defect-escalated", { [`${L}/defects/UAT-04.md`]: (t) => t.replace(/- 2027-01-27 rec \d+: extended, builder cause \(no charge\)\n/, "") }, "defect", /builder cause/);
  plant("T06", "a too-big condition that lapses on its own (O6)", "defect-condition-too-big", { [`${L}/defects/UAT-06.md`]: rep("status: condition too big; blocks until withdrawn", "status: condition lapsed") }, "defect", /never lapses/);
  plant("T07", "a major moved to the punch list", "defect-retest", { [`${L}/defects/UAT-08.md`]: rep("severity: cosmetic", "severity: major") }, "defect", /only a minor or cosmetic/);
  plant("T08", "after sign-off, -defect logs a new problem from the main scenarios", "defect-punch-step0", { [`${L}/defects/UAT-12.md`]: () => golden("defect-supersedes", `${L}/defects/UAT-09.md`).replace(/UAT-09/g, "UAT-12") }, "defect", /logged after sign-off/);
  plant("T09", "a fixed record with no build label", "defect-fixed", { [`${L}/defects/UAT-04.md`]: (t) => t.replace(/fixed, build larkspur-uat-3 \(reported by the builder; recorded by Robin\)/, "fixed (the builder says so)") }, "defect");
  plant("T10", "a history line in no fixed form", "defect-triage", { [`${L}/defects/UAT-01.md`]: rep("triaged Training gap, minor, against WP-2", "triaged as a training thing") }, "defect", /fixed forms/);
  plant("T11", "a Change marked retested-pass", "defect-change-text", { [`${L}/defects/UAT-07.md`]: rep("status: raised as change request", "status: retested-pass") }, "defect", /terminal state of class Defect only/);
  plant("T12", "a condition's change order recorded without the condition line", "defect-condition", { [`${L}/defects/UAT-07.md`]: (t) => t.replace(/- 2027-01-19 rec \d+: condition: CO-03, operations manager, 2027-01-19\n/, "") }, "defect", /condition: CO-03/);
  plant("T13", "an earlier history line rewritten", "defect-fixed", { [`${L}/defects/UAT-03.md`]: rep("logged from RUN-01 SC-01 (fail, 9 of 10)", "logged from RUN-01 SC-01 (fail, 8 of 10)") }, "write_once");
  plant("T14", "the after-sign-off report is logged anyway", "defect-after-signoff", { [`${L}/defects/UAT-12.md`]: () => golden("defect-supersedes", `${L}/defects/UAT-09.md`) }, "refused");
});

// ── C11, C12: the contract calendar, deemed acceptance and the backstop ──────
describe("C11-C12: the calendar, deemed acceptance and the backstop", () => {
  plant("D01", "the deemed date counted Mon-Fri (2026-12-04)", "m-signoff-request", { [`${M}/signoff-request-1.md`]: (t) => t.replace("deemed_date: 2026-12-07", "deemed_date: 2026-12-04").replace("accepted on 7 December 2026", "accepted on 4 December 2026") }, "signoff", /2026-12-07/);
  plant("D02", "the first sentence leaves out the deemed date", "m-signoff-request", { [`${M}/signoff-request-1.md`]: rep("If you neither sign this request nor send us a qualifying defect report, it will be deemed accepted on 7 December 2026 under TEST-1 of our contract. ", "") }, "signoff", /first sentence/);
  plant("D03", "a reworded frozen clause", "m-plan", { [`${M}/uat.yaml`]: rep("a sign-off request is deemed accepted ten business days after it is sent", "a request counts as accepted ten working days after sending") }, "plan", /byte-equal/);
  plant("D04", "clauses frozen although the contract inputs say not set", "plan", { [`${L}/uat.yaml`]: rep("clauses: none", "clauses:\n  status: as signed, confirmed by Robin 2027-01-04\n  deemed_acceptance: { ref: \"X\", business_days: 10, calendar: \"us-federal\", wording: \"made up\" }") }, "plan", /clauses: none/);
  plant("D05", "a late notice moves the deemed date", "m-deemed-moved", { [`${M}/signoff-requests.yaml`]: rep("sent: 2026-12-04, notice_rec", "sent: 2026-12-07, notice_rec") }, "deemed", /a late notice never moves the date/);
  plant("D06", "deemed acceptance applied with clauses none", "deemed-clauses-none", { [`${L}/signoff.md`]: () => golden("signoff-signed", `${L}/signoff.md`) }, "refused");
  plant("D07", "deemed acceptance applied on a calendar that is not supported", "m-deemed-calendar-unsupported", { [`${M}/signoff.md`]: () => golden("m-deemed", `${M}/signoff.md`) }, "refused");
  plant("D08", "deemed acceptance applied before the moved date", "m-deemed-too-early", { [`${M}/signoff.md`]: () => golden("m-deemed", `${M}/signoff.md`) }, "refused_writes");
  plant("D09", "a superseded request deemed accepted", "m-deemed-superseded", { [`${M}/signoff.md`]: () => golden("m-deemed", `${M}/signoff.md`) }, "refused_writes");
  plant("D10", "the deemed date recorded as the sent date + 10 ignoring a timely notice", "m-deemed-moved", { [`${M}/signoff.md`]: (t) => t.replace("signed: 2026-12-11", "signed: 2026-12-07") }, "signed");
  plant("D11", "a second backstop.md", "backstop-exists", { [`${M}/backstop.md`]: (t) => `${t}\nWritten again.\n` }, "refused");
  plant("D12", "the backstop date without the builder's delay", "m-backstop", { [`${M}/backstop.md`]: rep("backstop_date: 2027-01-15", "backstop_date: 2027-01-14") }, "backstop", /2027-01-15/);
  plant("D13", "the backstop written before its date", "backstop-not-passed", { [`${M}/backstop.md`]: () => golden("m-backstop", `${M}/backstop.md`) }, "refused");
  plant("D14", "the backstop applied on a larger project", "backstop-not-two-payment", { [`${L}/backstop.md`]: () => golden("m-backstop", `${M}/backstop.md`) }, "refused");
  plant("D15", "the backstop applied after the notes were delivered", "backstop-notes-delivered", { [`${M}/backstop.md`]: () => golden("m-backstop", `${M}/backstop.md`) }, "refused");
  plant("D16", "the backstop applied with the delivery half invoiced", "backstop-ledger-invoiced", { [`${M}/backstop.md`]: () => golden("m-backstop", `${M}/backstop.md`) }, "refused");
  plant("D17", "the readiness notice names no listed client dependency", "m-readiness", { [`${M}/backstop-log.yaml`]: rep("the weekly till export in the shared folder by 7:00 each Monday, from the shop manager", "a cheque from the shop") }, "backstop", /not a listed client dependency/);
  plant("D18", "the calc source not recorded", "m-signoff-request-calc", { [`${M}/signoff-requests.yaml`]: (t) => t.replace(/\n    calc: "[^"]*"/, "") }, "calendar");
  it("D19: a request's stated deemed date from the calendar matches the table (the worked case)", () => {
    const run = runView("m-signoff-request");
    const d = matter(run.read(`${M}/signoff-request-1.md`)).data.deemed_date;
    expect(d instanceof Date ? d.toISOString().slice(0, 10) : String(d)).toBe("2026-12-07");
  });
});

// ── C13: write-once and per-step resume ──────────────────────────────────────
describe("C13: write-once and per-step resume", () => {
  plant("S01", "a re-freeze on resume", "plan-resume", { [`${L}/agreed/acceptance.md`]: append("\n") }, "plan_resume", /never re-freezes/);
  plant("S02", "a plan step redone on resume", "plan-resume", { [`${L}/uat.yaml`]: rep("{ step: basis, rec: 1, date: 2027-01-04 }", "{ step: basis, rec: 1, date: 2027-01-05 }") }, "plan_resume", /redone on resume/);
  plant("S03", "an edited run", "run-confirmation", { [`${L}/runs/RUN-01.md`]: rep("| SC-02 | AC-1.2 | order coordinator oc-T1 | pass |", "| SC-02 | AC-1.2 | order coordinator oc-T1 | fail |") }, "write_once", /never edited/);
  plant("S04", "signoff.md written before the punch-list step", "signoff-signed-cut", { [`${L}/signoff.md`]: () => golden("signoff-signed", `${L}/signoff.md`) }, "signing_steps");
  plant("S05", "the resume rewrites the acceptance record", "signoff-signed-resume", { [`${L}/acceptance-record.md`]: append("\n") }, "write_once");
  plant("S06", "the resume asks the accounts again and changes them", "signoff-signed-resume", { [`${L}/signoff-requests.yaml`]: (t) => t.replace(/(- n: 2[\s\S]*?test_accounts:\n)(?: {6}- [^\n]+\n)+/, "$1      - { role: bookkeeper tester, environment: the QuickBooks Online sandbox, created_by: builder }\n") }, "signing_steps");
  plant("S07", "signing steps out of order", "signoff-signed", { [`${L}/signoff-requests.yaml`]: (t) => t.replace("- { step: acceptance-record,", "- { step: punch-list-x,") }, "signed", /signing_steps/);
  plant("S08", "a sign-off file rewritten later", "defect-punch-step0", { [`${L}/punch-list.md`]: append("\n| UAT-11 | late | minor | 2027-01-28 | yes |\n") }, "write_once");
  plant("S09", "a request rewritten", "signoff-sent-1", { [`${L}/signoff-request-1.md`]: append("\nA correction.\n") }, "write_once");
  plant("S10", "the scenario step recorded with no scenarios written", "plan-cut", { [`${L}/uat.yaml`]: rep("  - { step: gitignore, rec: 9, date: 2027-01-04 }", "  - { step: gitignore, rec: 9, date: 2027-01-04 }\n  - { step: scenarios, rec: 10, date: 2027-01-04 }") }, "plan");
  plant("S11", "STATUS.md rewritten", "pack", { "opchain-work/STATUS.md": (t) => t.replace(/^\d{4}/m, "1999") }, "status", /rewritten/);
});

// ── C14: the hand-offs to the next stages ────────────────────────────────────
describe("C14: hand-offs to the next stages", () => {
  plant("H01", "signoff.md without the test accounts", "signoff-signed", { [`${L}/signoff.md`]: (t) => t.replace(/test_accounts:\n(?: {2}- [^\n]+\n)+/, "") }, "handoff_fields", /test_accounts/);
  plant("H02", "the documentation NEXT before the handoff", "signoff-signed", { "printed.md": (t) => { const a = t.indexOf("    THEN: say \"use ow-handoff-start"); const b = t.indexOf("    THEN: documentation bought"); const end = t.indexOf("    IF IT IS NOT AVAILABLE"); return t.slice(0, a) + t.slice(b, end) + t.slice(a, b) + t.slice(end); } }, "next");
  plant("H03", "a documentation NEXT although the line was declined", "signoff-signed-declined", { "printed.md": append("    THEN: documentation bought, say \"use ow-documentation-start on uat/larkspur-ceramics/\"   (where slash commands exist: /ow-documentation-start)\n          It will read: signoff.md\n          [no folder attached: attach it when you say it]\n") }, "next");
  plant("H04", "an acceptance invoice NEXT on a smaller project", "m-deemed", { "printed.md": rep("    NEXT: say \"use ow-handoff-start", "    NEXT: say \"use ow-build to invoice the acceptance payment from uat/mossgate-books/signoff.md\"   (where slash commands exist: /ow-build-invoice)\n          It will read: signoff.md\n          [no folder attached: attach it when you say it]\n    THEN: say \"use ow-handoff-start") }, "next");
  plant("H05", "contract-terms.md without the ownership terms", "plan", { [`${L}/agreed/contract-terms.md`]: (t) => t.replace(/## Ownership\n[^\n]*\n\n/, "") }, "plan", /ownership terms/);
  plant("H06", "the old documentation wording (O5)", "signoff-signed", { "printed.md": rep("say \"use ow-documentation-start on uat/larkspur-ceramics/\"", "say \"use ow-documentation on uat/larkspur-ceramics/\"") }, "next");
  plant("H07", "signoff.md without the post-acceptance change order", "signoff-signed", { [`${L}/signoff.md`]: rep("post_acceptance_cos: [CO-04]", "post_acceptance_cos: []") }, "signed", /post_acceptance_cos/);
  plant("H08", "the addendum without the confirmation date", "signoff-addendum", { [`${L}/acceptance-addendum-CO-04.md`]: rep("confirmed 2027-02-09 by operations manager; not verified by this skill", "confirmed by the operations manager") }, "addendum");
});

// ── C15: the pack and its exports ────────────────────────────────────────────
describe("C15: the pack and its exports", () => {
  plant("P01", "a name column in the results template", "pack", { [`${L}/export/results-template.csv`]: (t) => t.replace("tester id,scenario,", "name,tester id,scenario,").replace(/^,(SC-\d+)/gm, ",,$1") }, "pack", /exactly the six columns/);
  plant("P02", "an internal section left in the HTML export", "pack", { [`${L}/export/uat-pack-bookkeeper.html`]: rep("</body>", "<h2>Self-checks (same-session self-check)</h2>\n</body>") }, "pack", /internal section/);
  plant("P03", "an image with no alt text", "pack", { [`${L}/export/uat-pack-bookkeeper.html`]: rep("</body>", "<img src=\"view.png\">\n</body>") }, "pack", /alt text/);
  plant("P04", "a skipped heading level in the Markdown source (the ow-tools preflight)", "pack", { [`${L}/uat-pack-bookkeeper.md`]: rep("## Dates\n", "#### Dates\n") }, "pack", /preflight/);
  plant("P05", "low-contrast text in the HTML pack", "pack", { [`${L}/export/uat-pack-bookkeeper.html`]: rep("color:#1a1a1a;font-family", "color:#bbbbbb;font-family") }, "pack", /contrast|under 4\.5/);
  plant("P06", "a pack that names no login source", "pack", { [`${L}/uat-pack-bookkeeper.md`]: rep("Your login comes from the operations manager.", "Ask anyone for a login.") }, "pack", /your login comes from/);
  plant("P07", "a production pack written with an unmarked side effect", "pack-production-refused", { [`${L}/pack.yaml`]: () => golden("pack", `${L}/pack.yaml`) }, "refused");
  plant("P08", "a pack written over a scenario with pasted rows", "pack-real-data-refused", { [`${L}/pack.yaml`]: () => golden("pack", `${L}/pack.yaml`) }, "refused");
  plant("P09", "a pack written over a basis mismatch", "pack-basis-mismatch", { [`${L}/pack.yaml`]: () => golden("pack", `${L}/pack.yaml`) }, "refused");
  plant("P10", "a production plan with a synthetic data source", "plan", { [`${L}/uat.yaml`]: (t) => t.replace(`environment: { name: "the Larkspur staging mailbox, a copy of the order sheet and the QuickBooks Online sandbox", production: no }`, `environment: { name: "the live mailbox", production: "client decision: operations manager 2027-01-04" }`).replace(/  real:\n(?: {4}- [^\n]+\n)+/, "  real: []\n") }, "plan", /production test with a synthetic data source/);
  plant("P11", "a scenario missing from the pack", "pack", { [`${L}/pack.yaml`]: rep("scenarios: [SC-06, SC-07, SC-12]", "scenarios: [SC-06, SC-07]") }, "pack");
});

// ── the rest: headers, writes, plan terms, private names, STATUS ─────────────
describe("headers, writes, terms, private names", () => {
  plant("G01", "a header without written_by", "plan", { [`${L}/scenarios/SC-01.md`]: rep("written_by: ow-uat 1.0.0 (protocol 1)\n", "") }, "headers");
  plant("G02", "--sent writes signoff.md (run level, mode-exact)", "signoff-sent-1", { [`${L}/signoff.md`]: () => golden("signoff-signed", `${L}/signoff.md`) }, "writes", /--signed, \/ow-uat-signoff --deemed/);
  plant("G03", "-run writes a UAT-nn (run level)", "run-session-1", { [`${L}/defects/UAT-01.md`]: () => golden("defect-triage", `${L}/defects/UAT-01.md`) }, "writes");
  plant("G04", "-pack rewrites uat.yaml", "pack", { [`${L}/uat.yaml`]: append("# planted\n") }, "writes");
  plant("G05", "the quoted fix rounds changed at -plan", "plan", { [`${L}/uat.yaml`]: rep("  fix_rounds: 2\n", "  fix_rounds: 3\n") }, "plan", /fix_rounds/);
  plant("G06", "an agreed copy edited", "plan", { [`${L}/agreed/scope.md`]: append("\nA small edit.\n") }, "plan", /byte-for-byte/);
  plant("G07", "a quick quote with no UAT line, bounds not from offers.md", "m-plan-no-uat-line", { [`${M}/uat.yaml`]: rep("  fix_business_days: 3", "  fix_business_days: 5") }, "plan", /offers\.md uat\.defaults/);
  plant("G08", "an older quote's acceptance wording with no governing statement", "m-plan-no-uat-line", { [`${M}/uat.yaml`]: (t) => t.replace(/  governing: \{[^\n]*\}\n/, "  governing: none\n") }, "plan", /governs/);
  plant("G09", "a private business name in a request", "signoff-request-1", { [`${L}/signoff-request-1.md`]: rep("## Environment\n", "## Environment\nAs Deftwright tests it.\n") }, "private_names");
  plant("G10", "a STATUS next: carrying a mode", "signoff-sent-1", { "opchain-work/STATUS.md": (t) => t.replace(/next: ow-uat \/ow-uat-signoff uat\/larkspur-ceramics\/ \| awaiting: sign-off by operations manager on request 1 by 2027-01-29\n$/, "next: ow-uat /ow-uat-signoff --signed uat/larkspur-ceramics/ | awaiting: sign-off by operations manager on request 1 by 2027-01-29\n") }, "status");
  plant("G11", "a role scenario standing in for a required one (the plan writes none for AC-5.2)", "plan", { [`${L}/scenarios/SC-07.md`]: rep("kind: required", "kind: role") }, "plan", /AC-5\.2 has no required scenario/);
  plant("G12", "a no-show recorded as passes", "run-no-show", { [`${L}/runs/RUN-02.md`]: rep("| SC-01 | AC-1.1 | order coordinator oc-T1 | not run |", "| SC-01 | AC-1.1 | order coordinator oc-T1 | pass |") }, "run");
});

// ── OW-04 round 1: the Evaluator's plants, kept (C17) ─────────────────────────
// Every plant from the round-1 harnesses (h/plant2.mjs, plant2b, family, reads,
// malformed, placement, fresh1, fresh1b, fresh1c), ported to the golden runs.
// The unedited run passes every check, so any failing check is the plant's.
const plantAny = (id, desc, caseName, edits) => it(`${id}: ${desc}`, () => {
  expect(Object.keys(failures(caseName, mutated(caseName, edits))).length, `${id} slipped`).toBeGreaterThan(0);
});
const control = (id, desc, caseName, edits) => it(`${id}: ${desc}`, () => {
  expect(failures(caseName, mutated(caseName, edits)), id).toEqual({});
});
const app = (s) => (t) => `${t}${s}`;
const del = () => () => null;
const add = (s) => () => s;
const HDR = (a, ws, sub, d) => `---\now_artefact: ow-uat/${a}\nschema: 1\nwritten_by: ow-uat 1.0.0 (protocol 1)\nworkstream: ${ws}\nsubject: ${sub}\ncreated: ${d}\nclock: user-stated\norigin: skill\n---\n`;
describe("OW-04 R1: route cells grade more than the verb (R1-6) and deletions (R1-4)", () => {
  plant("RT01", "route-ready-cut: the resume re-freezes agreed/acceptance.md", "route-ready-cut", { [`${L}/agreed/acceptance.md`]: app("\n<!-- re-frozen on resume -->\n") }, "route", /agreed\/ is frozen/);
  plant("RT02", "route-folder-sent-signed: the --signed run also rewrites signoff-request-2.md", "route-folder-sent-signed", { [`${L}/signoff-request-2.md`]: app("\nAmended after signing.\n") }, "route");
  plant("RT03", "route-folder-fixed: the confirmation run edits RUN-01.md", "route-folder-fixed", { [`${L}/runs/RUN-01.md`]: rep("| SC-01 | AC-1.1 | order coordinator oc-T1 | fail | 9 of 10 |", "| SC-01 | AC-1.1 | order coordinator oc-T1 | pass | 10 of 10 |") }, "route", /written once and never edited/);
  plantAny("RT04", "route-signoff-deemed: --deemed also rewrites the request's first sentence", "route-signoff-deemed", { [`${M}/signoff-request-1.md`]: rep("it will be deemed accepted on 7 December 2026", "it was deemed accepted on 7 December 2026") });
  plantAny("RT05", "route-documentation-several: picks a client without asking", "route-documentation-several", { "printed.md": add("    DONE: refused: the exit criteria do not hold for larkspur-ceramics -> nothing written\n    NEXT: say \"use ow-uat-run on uat/larkspur-ceramics/\"   (where slash commands exist: /ow-uat-run)\n") });
  plantAny("RT06", "route-plan-addendum: the addendum route copies CO-04 into agreed/", "route-plan-addendum", { [`${L}/agreed/CO-04.md`]: add("---\nid: CO-04\n---\n") });
  plant("RT07", "route-folder-open-defects: the triage run deletes the RUN-01 it triaged", "route-folder-open-defects", { [`${L}/runs/RUN-01.md`]: del() }, "route", /deleted/);
  plantAny("RT08", "route-signoff-unmet: the printed gaps leave out criterion 5's UAT-02", "route-signoff-unmet", { "printed.md": rep("          5. an environment problem not closed: UAT-02\n", "") });
  plantAny("RT09", "route-folder-drafted: a malformed signoff-requests.yaml (the malformed probe a route cell let through)", "route-folder-drafted", { [`${L}/signoff-requests.yaml`]: add("- not a map\n") });
  plant("RS08", "run-retest: the new run deletes an earlier run (RUN-02, the no-show)", "run-retest", { [`${L}/runs/RUN-02.md`]: del() }, "write_once", /deleted by this run/);
});

describe("OW-04 R1: writer modes, exact to the mode and pinned (R1-13)", () => {
  plantAny("WM01", "--keep-frozen copies agreed/acceptance.md again", "plan-keep-frozen", { [`${L}/agreed/acceptance.md`]: app("\n") });
  plant("WM02", "--readiness writes backstop.md", "m-readiness", { [`${M}/backstop.md`]: add(`${HDR("backstop", "mossgate-books", "uat/mossgate-books/signoff.md", "2027-01-07")}# Delivery backstop: Mossgate Books\n`) }, "writes");
  plant("WM03", "--sent writes acceptance-record.md", "signoff-sent-1", { [`${L}/acceptance-record.md`]: add(`${HDR("acceptance-record", "larkspur-ceramics", "uat/larkspur-ceramics/signoff-request-1.md", "2027-01-22")}# Acceptance record: Larkspur Ceramics\n`) }, "writes");
  plantAny("WM04", "-defect writes signoff-requests.yaml (marks request 1 superseded itself)", "defect-supersedes", { [`${L}/signoff-requests.yaml`]: (t) => (t ?? "").replace("status: sent", "status: superseded") });
  plantAny("WM05", "--addendum CO-04 rewrites punch-list.md", "signoff-addendum", { [`${L}/punch-list.md`]: app("| UAT-12 | added | minor | 2027-02-09 | yes |\n") });
  plant("WM06", "-run writes a new scenario SC-13.md", "run-confirmation", { [`${L}/scenarios/SC-13.md`]: add(`${HDR("scenario", "larkspur-ceramics", "uat/larkspur-ceramics/agreed/acceptance.md", "2027-01-21")}# SC-13: extra\n`) }, "writes");
  plantAny("WM07", "--deemed writes export/signoff-request-1.pdf (only plain -signoff exports)", "m-deemed", { [`${M}/export/signoff-request-1.pdf`]: add("%PDF-1.7\n") });
  plant("WM08", "--builder-delay writes backstop.md", "m-builder-delay", { [`${M}/backstop.md`]: add(`${HDR("backstop", "mossgate-books", "uat/mossgate-books/signoff.md", "2027-01-11")}# Delivery backstop: Mossgate Books\n`) }, "writes");
  plant("WM09", "plain -signoff (request 2) writes signoff.md", "signoff-request-2", { [`${L}/signoff.md`]: add(`${HDR("signoff", "larkspur-ceramics", "uat/larkspur-ceramics/signoff-request-2.md", "2027-01-26")}# Sign-off: Larkspur Ceramics\n`) }, "writes");
  plant("WM10", "-pack writes evidence/index.md", "pack", { [`${L}/evidence/index.md`]: add(`${HDR("evidence-index", "larkspur-ceramics", "uat/larkspur-ceramics/runs/", "2027-01-05")}| item | from | kind | state | note |\n|---|---|---|---|---|\n`) }, "writes");
  it("WE1: widening a writer's modes in skill.edges.yaml (--deemed writing the request) is drift from the pinned C1 table", () => {
    const edges = readFileSync(join(ROOT, "skills-work", "ow-uat", "skill.edges.yaml"), "utf8");
    expect(edgesWriterDrift(edges)).toEqual([]);
    const wide = rep("  - { path: uat/<client>/signoff-request-<n>.md, verb: /ow-uat-signoff }", "  - { path: uat/<client>/signoff-request-<n>.md, verb: /ow-uat-signoff, modes: [--deemed] }")(edges);
    expect(edgesWriterDrift(wide).join("\n")).toMatch(/lets \/ow-uat-signoff --deemed write uat\/<client>\/signoff-request-<n>\.md/);
    // ... and the run-level check does not widen with it: a --deemed run that writes a request still fails.
    expect(failures("m-deemed", mutated("m-deemed", { [`${M}/signoff-request-2.md`]: add(`${HDR("signoff-request", "mossgate-books", "uat/mossgate-books/uat.yaml", "2026-12-08")}# Sign-off request 2\n`) }))).toHaveProperty("writes");
  });
  it("WE1b: a lost writer and a new file are drift too", () => {
    const edges = readFileSync(join(ROOT, "skills-work", "ow-uat", "skill.edges.yaml"), "utf8");
    expect(edgesWriterDrift(rep("  - { path: uat/<client>/backstop.md, verb: /ow-uat-signoff --backstop }\n", "")(edges)).join("\n")).toMatch(/writes no uat\/<client>\/backstop\.md/);
    expect(edgesWriterDrift(rep("  - { path: uat/<client>/backstop.md, verb: /ow-uat-signoff --backstop }\n", "  - { path: uat/<client>/backstop.md, verb: /ow-uat-signoff --backstop }\n  - { path: uat/<client>/notes.md, verb: /ow-uat-run }\n")(edges)).join("\n")).toMatch(/writes uat\/<client>\/notes\.md, which the C1 table does not list/);
  });
  it("HE1: dropping a field the handoff reads (test accounts) from signoff.md's hand-off is drift from the pinned H1 list", () => {
    const edges = readFileSync(join(ROOT, "skills-work", "ow-uat", "skill.edges.yaml"), "utf8");
    expect(handoffFieldDrift(edges)).toEqual([]);
    expect(handoffFieldDrift(rep("post-acceptance change orders, test accounts, delivery backstop date]", "post-acceptance change orders, delivery backstop date]")(edges)).join("\n")).toMatch(/signoff\.md no longer hands off "test accounts"/);
    expect(handoffFieldDrift(rep("      - { path: uat/<client>/defects/UAT-nn.md, fields: [class, Training gap topic] }\n", "")(edges)).join("\n")).toMatch(/\/ow-documentation-start: the hand-off drops uat\/<client>\/defects\/UAT-nn\.md/);
  });
});

describe("OW-04 R1: per-step resume (R1-3, R1-5) at other cut points", () => {
  control("RS00", "CONTROL: a correct -plan resume after the terms step", "plan-resume-terms", {});
  plant("RS01", "plan cut after terms: the resume re-freezes agreed/scope.md", "plan-resume-terms", { [`${L}/agreed/scope.md`]: app("\n") }, "plan_resume", /never re-freezes/);
  plant("RS02", "plan cut after terms: the resume redoes 'terms' (a new rec)", "plan-resume-terms", { [`${L}/uat.yaml`]: rep("{ step: terms, rec: 2,", "{ step: terms, rec: 3,") }, "plan_resume", /redone on resume/);
  plant("RS03", "plan-resume: the recorded people step's testers change on resume (oc-T1 to oc-T9)", "plan-resume", { [`${L}/uat.yaml`]: rep("{ role: order coordinator, id: oc-T1 }", "{ role: order coordinator, id: oc-T9 }") }, "plan_resume", /testers, written by the recorded people step, changed/);
  plant("RS04", "plan-resume: the recorded schedule step's session 2 moves on resume", "plan-resume", { [`${L}/uat.yaml`]: rep("{ session: 2, date: 2027-01-12,", "{ session: 2, date: 2027-01-13,") }, "plan_resume", /schedule, written by the recorded schedule step, changed/);
  plant("RS04b", "plan-resume: the resumed step dated the day of the cut (R1-16)", "plan-resume", { [`${L}/uat.yaml`]: rep("{ step: scenarios, rec: 10, date: 2027-01-05 }", "{ step: scenarios, rec: 10, date: 2027-01-04 }") }, "plan_resume", /finished in this session/);
  for (const at of ["record", "accounts", "acceptance-record"]) control(`RS05-${at}`, `CONTROL: a correct --signed resume after ${at} (first-time writes and the first-time accounts question are not rewrites)`, `signoff-signed-resume-${at}`, {});
  plant("RS06", "--signed cut after record: the resume redoes 'record' with a new rec", "signoff-signed-resume-record", { [`${L}/signoff-requests.yaml`]: (t) => t.replace(/\{ step: record, rec: (\d+),/, (_, n) => `{ step: record, rec: ${Number(n) + 4},`) }, "signing_steps", /redone on resume/);
  plant("RS06b", "--signed cut after accounts: the resume changes the accounts recorded at the cut", "signoff-signed-resume-accounts", { [`${L}/signoff-requests.yaml`]: (t) => t.replace(/(  - n: 2[\s\S]*?test_accounts:\n)(      - [^\n]*\n)/, "$1") }, "signing_steps", /test accounts changed on resume/);
  plant("RS06c", "--signed cut after acceptance-record: the resume rewrites the acceptance record", "signoff-signed-resume-acceptance-record", { [`${L}/acceptance-record.md`]: app("\n") }, "signing_steps", /rewritten on resume/);
  plant("RS07", "signoff-signed-resume: signoff.md written before the punch-list step is recorded", "signoff-signed-resume", { [`${L}/signoff-requests.yaml`]: (t) => t.replace(/(      - \{ step: punch-list[^\n]*\n)(      - \{ step: signoff[^\n]*\n)/, "$2$1") }, "signing_steps");
});

describe("OW-04 R1: deemed, the backstop and the frozen clauses (R1-7, OD-4, OD-5)", () => {
  plantAny("DB01", "clauses none: --deemed writes signoff.md anyway", "deemed-clauses-none", { [`${L}/signoff.md`]: add(`${HDR("signoff", "larkspur-ceramics", "x", "2027-02-02")}# Sign-off\n`) });
  plantAny("DB02", "no backstop clause: --backstop writes backstop.md anyway", "backstop-no-clause", { [`${M}/backstop.md`]: add(`${HDR("backstop", "mossgate-books", "x", "2027-01-18")}# Delivery backstop\n`) });
  plantAny("DB03", "m-deemed: signoff.md dated the Mon-Fri date 2026-12-04", "m-deemed", { [`${M}/signoff.md`]: (t) => t.replace("signed: 2026-12-07", "signed: 2026-12-04").replace("on 2026-12-07; applied", "on 2026-12-04; applied") });
  plantAny("DB04", "m-deemed: the deemed line drops 'client response not received'", "m-deemed", { [`${M}/signoff.md`]: rep("; client response not received", "") });
  plant("DB05", "m-backstop: the backstop date counted from acceptance alone", "m-backstop", { [`${M}/backstop.md`]: rep("backstop_date: 2027-01-15", "backstop_date: 2026-12-21") }, "backstop");
  plantAny("DB06", "m-signoff-request: the day after Thanksgiving counted as a holiday", "m-signoff-request", { [`${M}/signoff-request-1.md`]: (t) => t.replace("deemed_date: 2026-12-07", "deemed_date: 2026-12-08").replace("on 7 December 2026 under", "on 8 December 2026 under"), [`${M}/signoff-requests.yaml`]: rep("stated_deemed_date: 2026-12-07", "stated_deemed_date: 2026-12-08") });
  plant("DB07", "m-signoff-request: the first sentence states the date but not the clause", "m-signoff-request", { [`${M}/signoff-request-1.md`]: rep(" under TEST-1 of our contract", " under our contract") }, "signoff", /does not name the clause/);
  plant("DB08", "m-plan: a drafted third clause added to the frozen block (R1-7)", "m-plan", { [`${M}/uat.yaml`]: rep("calendars: {", "  cannot_reproduce: { ref: \"TEST-3\", business_days: 3, calendar: \"us-federal\", wording: \"A notice is timely within three business days.\" }\ncalendars: {") }, "plan", /no drafted clause/);
  plant("DB09", "m-plan: the frozen clause wording loses one character", "m-plan", { [`${M}/uat.yaml`]: rep("ten business days after it is sent unless", "ten business days after it is sent, unless") }, "plan", /never reworded/);
  plant("DB10", "m-plan: clauses frozen but calendars.contract says none (R1-7)", "m-plan", { [`${M}/uat.yaml`]: rep("calendars: { contract: us-federal,", "calendars: { contract: none,") }, "plan", /calendars\.contract is "none" beside frozen clauses/);
  plant("DB11", "m-plan: the clause's calendar normalised in the frozen copy", "m-plan", { [`${M}/uat.yaml`]: rep("ref: \"TEST-1\", business_days: 10, calendar: \"us-federal\"", "ref: \"TEST-1\", business_days: 10, calendar: \"US federal\"") }, "plan", /never reworded/);
  plant("DB12", "m-deemed: the request row's deemed_date left at none", "m-deemed", { [`${M}/signoff-requests.yaml`]: rep("\n    deemed_date: 2026-12-07", "\n    deemed_date: none") }, "deemed");
  it("DB13: OD-4: on the backstop date itself --backstop refuses (backstop-on-the-date); from the day after it applies (m-backstop)", () => {
    expect(failures("backstop-on-the-date", mutated("backstop-on-the-date"))).toEqual({});
    expect(loadKey(join(FIXTURES, "backstop-on-the-date")).backstop_refused.reason).toBe("the backstop date has not passed");
    expect(String(loadKey(join(FIXTURES, "m-backstop")).today)).toMatch(/2027-01-18/);
    expect(runCase("m-backstop").filter((r) => r.problems.length)).toEqual([]);
  });
  it("DB13b: OD-4: backstop.md written on the backstop date is caught", () => {
    const dir = mutated("m-backstop", {});
    const keyed = runCase("backstop-on-the-date", dir);
    expect(keyed.find((r) => r.check === "refused").problems.join("\n")).toMatch(/backstop\.md was written/);
  });
  plant("DB14", "OD-5: the terms block's digest left out of the contract-terms.md basis row", "plan", { [`${L}/uat.yaml`]: (t) => t.replace(/, block: terms, digest: "sha256:[0-9a-f]+"/, "") }, "plan", /owner decision OD-5/);
  plant("DB15", "OD-5: a digest that is not the frozen terms block's", "m-plan", { [`${M}/uat.yaml`]: (t) => t.replace(/digest: "sha256:[0-9a-f]{4}/, 'digest: "sha256:0000') }, "plan", /digest is/);
  plant("DB16", "OD-5: --refreeze copies the whole contract-inputs.md over contract-terms.md", "plan-refreeze-terms", { [`${L}/agreed/contract-terms.md`]: () => readFileSync(join(FIXTURES, "plan-refreeze-terms", "input", "opchain-work", "plans", "larkspur-ceramics", "contract-inputs.md"), "utf8") }, "plan_mode", /only the terms block/);
  plant("DB17", "OD-5: -pack runs over a changed terms block", "pack-terms-mismatch", { [`${L}/pack.yaml`]: () => golden("pack", `${L}/pack.yaml`) }, "basis", /basis mismatch/);
  it("DB18: OD-5 and R1-2: no golden run shows a basis mismatch it did not refuse (contract-terms.md, an extract, compares by its block's digest)", () => {
    const bad = listCases().map((c) => [c, runCase(c).find((r) => r.check === "basis")]).filter(([, r]) => r && r.problems.length);
    expect(bad).toEqual([]);
  });
  plantAny("O6a", "a too-big condition withdrawn by the builder's user, not a client role", "defect-condition-withdrawn", { [`${L}/defects/UAT-06.md`]: rep("condition withdrawn by operations manager 2027-01-18", "condition withdrawn by Robin 2027-01-18") });
  plant("O6b", "the too-big condition recorded without the requests.md row it read", "defect-condition-too-big", { [`${L}/defects/UAT-06.md`]: rep("condition too big for a change order (builds/larkspur-ceramics/changes/requests.md R-05); blocks until withdrawn", "condition too big for a change order; blocks until withdrawn") }, "defect");
  plant("O6c", "a too-big condition whose client reason says it does not block sign-off (R1-16)", "defect-condition-too-big", { [`${L}/defects/UAT-06.md`]: rep("so it blocks sign-off until you withdraw the condition.", "and it does not block sign-off.") }, "defect", /says it does not block sign-off/);
  plantAny("O8a", "calendar not supported: --deemed writes signoff.md anyway", "m-deemed-calendar-unsupported", { [`${M}/signoff.md`]: add(`${HDR("signoff", "mossgate-books", "x", "2026-12-08")}request: 1\nacceptance: deemed\n---\n# Sign-off\n`) });
});

describe("OW-04 R1: hand-off fields (R1-18)", () => {
  plantAny("HF01", "signoff.md without delivery_backstop_date", "signoff-signed", { [`${L}/signoff.md`]: rep("delivery_backstop_date: not applicable (larger project)\n", "") });
  plant("HF02", "punch-list.md without the logged date column (the handoff's reported date)", "signoff-signed", { [`${L}/punch-list.md`]: (t) => t.replace("| UAT-nn | What | Severity | Logged | On the signed list |\n|---|---|---|---|---|", "| UAT-nn | What | Severity | On the signed list |\n|---|---|---|---|").replace(/ \| 2027-01-2\d \|/g, " |") }, "signed", /logged/);
  plantAny("HF03", "a test account with a login field", "signoff-signed", { [`${L}/signoff.md`]: rep("created_by: builder }", "created_by: builder, login: sender-test }") });
  plantAny("HF04", "the request row's test accounts dropped (the resume source)", "signoff-signed", { [`${L}/signoff-requests.yaml`]: (t) => t.replace(/(  - n: 2[\s\S]*?    test_accounts:\n)(?:      - [^\n]*\n)+/, "$1      []\n").replace("    test_accounts:\n      []\n", "    test_accounts: []\n") });
  it("C5/R1-18: ow-build applies uat.yaml's governing definition: its golden passes, and a request that drops the quoted statement fails", () => {
    expect(readFileSync(join(BUILD_FX, "invoice-delivery-governing", "input", "opchain-work", "uat", "mossgate-books", "uat.yaml"), "utf8")).toBe(golden("m-plan-no-uat-line", `${M}/uat.yaml`));
    expect(buildCaseRun("invoice-delivery-governing").filter((r) => r.problems.length)).toEqual([]);
    const dir = temp("ow-build-gov-");
    buildPrepare("invoice-delivery-governing", dir);
    cpSync(join(BUILD_FX, "invoice-delivery-governing", "expected"), dir, { recursive: true });
    const f = join(dir, "opchain-work", "builds", "mossgate-books", "invoices", "INV-request-delivery.md");
    writeFileSync(f, readFileSync(f, "utf8").replace(/\nThe quote defines acceptance differently[^\n]*\n/, "\n"));
    expect(buildCaseRun("invoice-delivery-governing", dir).find((r) => r.check === "invoice").problems.join("\n")).toMatch(/records the definition that governs this job/);
  });
});

describe("OW-04 R1: the calendar (R1-17)", () => {
  plant("CA01", "an ow-tools without the capability: a calc --calendar call recorded anyway (imitated)", "m-signoff-request-nocap", { [`${M}/signoff-requests.yaml`]: rep("deemed date: contract-calendar.md table; not machine-checked", "ow-tools calc date --from 2026-11-20 --business-days 10 --calendar us-federal") }, "calendar");
  plant("CA02", "an ow-tools without the capability: the missing capability not said", "m-signoff-request-nocap", { [`${M}/signoff-requests.yaml`]: rep("ow-tools version --json lists no calendar under capabilities.calc (no us-federal calendar); ", ""), [`${M}/signoff-request-1.md`]: rep("ow-tools version --json lists no calendar under capabilities.calc (no us-federal calendar); ", "") }, "calendar");
  it("CA03: the no-tool table crosses 2030 into 2031: 2030-12-20 plus 10 business days is 2031-01-07", () => {
    expect(addBusinessDays("2030-12-20", 10, tableHolidays())).toBe("2031-01-07");
    expect(tableHolidays().has("2031-01-01")).toBe(true);
  });
});

describe("OW-04 R1: malformed files fail per check and never crash (C16)", () => {
  for (const [i, [c, rel, body]] of [
    ["signoff-signed", `${L}/signoff-requests.yaml`, "requests: [ { n: 2, status: signed\n"],
    ["signoff-signed", `${L}/signoff.md`, "---\nrequest: 2\nacceptance: sig"],
    ["signoff-signed", `${L}/acceptance-record.md`, Buffer.from([0, 1, 2, 255, 254, 0, 10]).toString("latin1")],
    ["run-session-1", `${L}/runs/RUN-01.md`, "---\nid: RUN-01\n---\n| scenario | proves |\n|---|\n| SC-01 |"],
    ["run-session-1", `${L}/evidence/index.md`, "| item |\n"],
    ["m-backstop", `${M}/backstop.md`, "---\nbackstop_date: not-a-date\n---\n"],
    ["m-deemed", `${M}/signoff-requests.yaml`, "requests: 7\n"],
    ["defect-fixed", `${L}/defects/UAT-05.md`, "---\nid: [UAT-05\n---\n"],
    ["plan", `${L}/uat.yaml`, "plan_steps: { step: basis }\nbasis: none\nchecks: AC-1.1\n"],
    ["pack", `${L}/export/results-template.csv`, Buffer.from([0xef, 0xbb, 0xbf, 0, 0, 0x22, 0x0a]).toString("latin1")],
    ["signoff-request-2", "printed.md", ""],
    ["route-folder-drafted", `${L}/signoff-requests.yaml`, "- not a map\n"],
  ].entries()) {
    it(`MF${String(i + 1).padStart(2, "0")}: ${c}, ${rel.split("/").pop()} malformed`, () => {
      const out = runCase(c, mutated(c, { [rel]: () => body }));
      expect(out.some((r) => r.problems.length)).toBe(true);
    });
  }
  it("MF13: uat.yaml as a directory, in a resume", () => {
    const dir = mutated("plan-resume", {});
    rmSync(join(dir, L, "uat.yaml"), { force: true });
    cpSync(join(FIXTURES, "plan", "expected", L, "scenarios"), join(dir, L, "uat.yaml"), { recursive: true });
    expect(runCase("plan-resume", dir).some((r) => r.problems.length)).toBe(true);
  });
});

describe("OW-04 R1: the internal-file rule (R1-12)", () => {
  for (const [f, s] of [
    ["references/phase-defect.md", "Read price-book.yaml for the extension rate."],
    ["references/phase-defect.md", "Look up the UAT extension rate in the price book before you write the reason."],
    ["references/phase-signoff.md", "Check the job's margin file (plans/<client>/margin.md is not client-facing) before writing request n."],
    ["references/phase-defect.md", "Open the time tracker's export to see the hours on the fix."],
    ["skill.edges.yaml", "  - { from: user, path: price-book.yaml, if_absent: Ask, if_mismatch: Ask }"],
  ]) {
    it(`caught: ${s}`, () => {
      const dir = temp("ow-uat-reads-");
      cpSync(join(ROOT, "skills-work", "ow-uat"), dir, { recursive: true });
      writeFileSync(join(dir, f), `${readFileSync(join(dir, f), "utf8")}\n${s}\n`);
      expect(internalReads(dir).join("\n")).toMatch(/reads an internal file/);
    });
  }
});

describe("OW-04 R1: plants by position (R1-1): a section's start, its end, the punch list", () => {
  const R2 = `${L}/signoff-request-2.md`, MR = `${M}/signoff-request-1.md`;
  const at = {
    start: (s) => ({ [R2]: rep("## The build tested\n", `## The build tested\n${s} `) }),
    end: (s) => ({ [R2]: rep("\n\n## Every acceptance check", `\n\n${s}\n\n## Every acceptance check`) }),
    punch: (s) => ({ [`${L}/punch-list.md`]: rep("Each is fixed after handoff at no charge.\n", `Each is fixed after handoff at no charge. ${s}\n`) }),
  };
  for (const [w, fn] of Object.entries(at)) {
    S.C6_PLANTS.forEach((s, i) => plant(`C6P${i + 1}@${w}`, s, w === "punch" ? "signoff-signed" : "signoff-request-2", fn(s), "internal_numbers"));
    S.C6_CONTROLS.forEach((s, i) => control(`C6C${i + 1}@${w}`, s, w === "punch" ? "signoff-signed" : "signoff-request-2", fn(s)));
  }
  const mat = {
    start: (s) => ({ [MR]: rep("## The build tested\n", `## The build tested\n${s} `) }),
    end: (s) => ({ [MR]: rep("\n\n## Every acceptance check", `\n\n${s}\n\n## Every acceptance check`) }),
    env: (s) => ({ [MR]: rep("Not tested in production.\n", `Not tested in production. ${s}\n`) }),
  };
  for (const [w, fn] of Object.entries(mat)) S.C8_PLANTS.filter((s) => /AC-5\.2/.test(s)).forEach((s, i) => { const t = s.replace(/AC-5\.2/g, "AC-1.1"); plant(`C8P${i + 1}@${w}`, t, "m-signoff-request", fn(t), "false_pass"); });
  it("the splitter ends a sentence at a heading, a list item, a table row and a blank line", () => {
    expect(sentences("Your team confirmed AC-1.1.\n\n## Checked by the builder; not tested by your people\n- AC-1.1: run by Robin alone")).toEqual(["Your team confirmed AC-1.1.", "Checked by the builder; not tested by your people", "AC-1.1: run by Robin alone"]);
    expect(sentences("One line\nwraps here. Next one.\n| a | b |\nAfter")).toEqual(["One line wraps here.", "Next one.", "| a | b |", "After"]);
  });
});

describe("OW-04 R1: the Evaluator's untuned sentences, at the placements it used (R1-8 to R1-10, OD-3)", () => {
  const req2 = (s) => ({ [`${L}/signoff-request-2.md`]: rep("\n\n## Every acceptance check", `\n\n${s}\n\n## Every acceptance check`) });
  const start = (s) => ({ [`${L}/signoff-request-2.md`]: rep("## The build tested\n", `## The build tested\n${s} `) });
  const mreq = (s) => ({ [`${M}/signoff-request-1.md`]: rep("\n\n## Every acceptance check", `\n\n${s}\n\n## Every acceptance check`) });
  const uat05 = (s) => ({ [`${L}/defects/UAT-05.md`]: rep("The fix is at no charge.\n", `The fix is at no charge. ${s}\n`) });
  const punch = (s) => ({ [`${L}/punch-list.md`]: rep("Each is fixed after handoff at no charge.\n", `Each is fixed after handoff at no charge. ${s}\n`) });
  const pack = (s) => ({
    [`${L}/uat-pack-order-coordinator.md`]: rep("write it in the results template instead of your name.\n", `write it in the results template instead of your name. ${s}\n`),
    [`${L}/export/uat-pack-order-coordinator.html`]: rep("write it in the results template instead of your name.</p>", `write it in the results template instead of your name. ${s.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`),
  });
  const run1 = (s) => ({ [`${L}/runs/RUN-01.md`]: rep("- a password in the note of SC-07: not copied; logged in secrets-seen.log", `- a password in the note of SC-07: not copied; logged in secrets-seen.log\n- ${s}`) });
  const sc06 = (s) => ({ [`${L}/scenarios/SC-06.md`]: rep("fields: lines, quantities.\n", `fields: lines, quantities.\n${s}\n`) });
  const n2 = (i) => String(i + 1).padStart(2, "0");
  S.EV1_OURS.forEach((s, i) => {
    plant(`A${n2(i)}@request-end`, s, "signoff-request-2", req2(s), "internal_numbers");
    plant(`A${n2(i)}@request-start`, s, "signoff-request-2", start(s), "internal_numbers");
    plant(`A${n2(i)}@UAT-05`, s, "defect-fixed", uat05(s), "internal_numbers");
  });
  S.EV1_CLIENT.forEach((s, i) => {
    control(`B${n2(i)}@request-end`, s, "signoff-request-2", req2(s));
    control(`B${n2(i)}@request-start`, s, "signoff-request-2", start(s));
    control(`B${n2(i)}@punch`, s, "signoff-signed", punch(s));
  });
  S.EV1_CRED_PLANTS.forEach((s, i) => { plant(`CP${n2(i)}@pack`, s, "pack", pack(s), "credentials"); plant(`CP${n2(i)}@run`, s, "run-session-1", run1(s), "credentials"); });
  S.EV1_CRED_CONTROLS.forEach((s, i) => control(`CC${n2(i)}@pack`, s, "pack", pack(s)));
  S.EV1_PEOPLE_PLANTS.forEach((s, i) => { plant(`DP${n2(i)}@pack`, s, "pack", pack(s), "people"); plant(`DP${n2(i)}@request`, s, "signoff-request-2", req2(s), "people"); });
  S.EV1_PEOPLE_CONTROLS.forEach((s, i) => control(`DC${n2(i)}@pack`, s, "pack", pack(s)));
  S.EV1_DATA_PLANTS.forEach((s, i) => { plantAny(`EP${n2(i)}@scenario`, s, "plan", sc06(s)); plantAny(`EP${n2(i)}@pack`, s, "pack", pack(s)); });
  // Owner decision OD-3: prose naming one record value, with no delimited row, contact, card or ID-like shape, stays with the self-check.
  S.EV1_DATA_SELF_CHECK.forEach((s) => it.skip(`OD-3, the self-check's (not the checker's): ${s}`, () => {}));
  S.EV1_DATA_CONTROLS.forEach((s, i) => control(`EC${n2(i)}@scenario`, s, "plan", sc06(s)));
  S.EV1_FP_PLANTS.forEach(([w, s], i) => plant(`FP${n2(i)}`, s, w === "m" ? "m-signoff-request" : "defect-fixed", w === "m" ? mreq(s) : uat05(s), "false_pass"));
  S.EV1_FP_CONTROLS.forEach(([w, s], i) => control(`FC${n2(i)}`, s, w === "m" ? "m-signoff-request" : "defect-fixed", w === "m" ? mreq(s) : uat05(s)));
  const MF = `${M}/signoff-request-1.md`;
  const mplaces = {
    start: (s) => ({ [MF]: rep("\nBuild mossgate-uat-1, tested in", `\n${s} Build mossgate-uat-1, tested in`) }),
    records: (s) => ({ [MF]: rep("- 1 reorder list in the spreadsheet copy (SC-03)\n", `- 1 reorder list in the spreadsheet copy (SC-03)\n\n${s}\n`) }),
    env: (s) => ({ [MF]: rep("Not tested in production.\n", `Not tested in production. ${s}\n`) }),
  };
  for (const [where, fn] of Object.entries(mplaces)) {
    S.EV1_FP_PLANTS.filter(([w]) => w === "m").forEach(([, s], i) => plant(`FP-m${i + 1}@${where}`, s, "m-signoff-request", fn(s), "false_pass"));
    S.EV1_FP_CONTROLS.filter(([w]) => w === "m").forEach(([, s], i) => control(`FC-m${i + 1}@${where}`, s, "m-signoff-request", fn(s)));
  }
});

describe("OW-04 R1: O7 wording against the quoted bounds", () => {
  // The round-1 harness placed these in defect-fixed's UAT-05, which is fixed but not yet retested; there "fixed on
  // 14 January" also calls it fixed before its retest (C8, R1-16). The O7 wording is for a fix the client retested,
  // so the controls sit in defect-retest's UAT-05 (retested-pass); the plants stay in defect-fixed.
  const r05 = (s) => ({ [`${L}/defects/UAT-05.md`]: rep("The fix is at no charge.\n", `The fix is at no charge. ${s}\n`) });
  plant("O7a", "after the quoted bounds, plus our extra work", "defect-fixed", r05("It was fixed on 15 January, after the 5 business days quoted, at no charge; it took us three extra days of work."), "internal_numbers");
  plant("O7b", "past the quoted bounds because our fix took longer than we planned", "defect-fixed", r05("It came back two business days past the quoted bounds because our fix took longer than we planned."), "internal_numbers");
  plant("O7c", "the extension rate named", "defect-fixed", r05("A further round would be at the extension rate."), "internal_numbers");
  plant("O7i", "our own plan, no number", "defect-fixed", r05("The fix ran past what we had planned for it."), "internal_numbers");
  plant("O7j", "our effort after the bounds", "defect-fixed", r05("After the 5 business days quoted it took our developer another two days."), "internal_numbers");
  for (const [id, s] of [
    ["O7d", "It was fixed on 15 January, within the 5 business days quoted, at no charge."],
    ["O7e", "This is the third fix round, one more than the 2 quoted, at no charge."],
    ["O7f", "Fixed on 14 January, after the 5 business days quoted, at no charge."],
    ["O7g", "It came back two business days after the quoted 5, at no charge."],
    ["O7h", "It needed a third fix round, past the 2 rounds quoted, at no charge."],
  ]) {
    control(id, `CONTROL (retested): ${s}`, "defect-retest", r05(s));
    it(`${id}: CONTROL (the C6 rule alone): ${s}`, () => expect(internalFindings(s, { user: "Robin" })).toEqual([]));
  }
});

describe("OW-04 round 2: the held-out set written before any round-2 rule changed", () => {
  for (const s of S.HELDOUT2_OURS) it(`our side caught: ${s}`, () => expect(internalFindings(s, {}).length).toBeGreaterThan(0));
  for (const s of S.HELDOUT2_LEGIT) it(`legitimate passes every meaning rule: ${s}`, () => {
    expect(internalFindings(s, S.HELDOUT2_CTX)).toEqual([]);
    expect(dataFindings(s, {})).toEqual([]);
    expect(falsePassFindings(s, S.HELDOUT2_FALSE_PASS_CONTEXT)).toEqual([]);
    expect(peopleFindings(s, { user: "Robin", people: [], client: "Larkspur Ceramics" })).toEqual([]);
    expect(credentialFindings(s)).toEqual([]);
  });
  for (const s of S.HELDOUT2_DATA) it(`data caught by the data rule: ${s.split("\n")[0]}`, () => expect(dataFindings(s, {}).length).toBeGreaterThan(0));
  for (const s of S.HELDOUT2_FALSE_PASS) it(`who tested caught: ${s}`, () => expect(falsePassFindings(s, S.HELDOUT2_FALSE_PASS_CONTEXT).length).toBeGreaterThan(0));
});

// ── OW-04 round 2: the Evaluator's plants, kept (C17) ─────────────────────────
// Every plant from the round-2 harnesses (h/plant3.mjs, family2, wp6, fn2,
// fresh2 with sentences2, fresh2b, o7post, and the zz2 cases), ported to the
// golden runs and to the skills-work tree. IDs are the Evaluator's.
const E = "ow-uat/skill.edges.yaml";
const family = (id, desc, edits, want = true) => it(`${id}: ${desc}`, () => {
  const dir = temp("ow-uat-family2-");
  cpSync(join(ROOT, "skills-work"), dir, { recursive: true });
  for (const [rel, fn] of Object.entries(edits)) {
    const p = join(dir, rel);
    const before = readFileSync(p, "utf8");
    const after = fn(before);
    if (after === before) throw new Error(`${id}: ${rel} unchanged`);
    writeFileSync(p, after);
  }
  const cats = loadCatalogs({ root: ROOT, env: { OPCHAIN_WORK_SKILLS_DIR: dir } });
  const out = [...checkEdges(cats), ...checkFamily(cats), ...checkProtocolCopies(cats), ...(checkVerbs(null, { catalogs: cats }) ?? [])];
  if (want) expect(out.length, `${id} slipped`).toBeGreaterThan(0);
  else expect(out, id).toEqual([]);
});
describe("OW-04 R2: deletions, recorded steps, route cells and the digest in a run (h/plant3.mjs)", () => {
  plant("X01", "run-retest deletes RUN-02.md (the no-show)", "run-retest", { [`${L}/runs/RUN-02.md`]: del() }, "write_once", /deleted/);
  plant("X02", "signoff-signed deletes the superseded signoff-request-1.md", "signoff-signed", { [`${L}/signoff-request-1.md`]: del() }, "write_once", /deleted/);
  plant("X03", "m-backstop deletes backstop-log.yaml", "m-backstop", { [`${M}/backstop-log.yaml`]: del() }, "write_once", /deleted/);
  plant("X04", "defect-retest deletes ow-build's ledger.md (another skill's file)", "defect-retest", { "opchain-work/builds/larkspur-ceramics/ledger.md": del() }, "write_once", /deleted/);
  plant("X05", "run-confirmation deletes secrets-seen.log", "run-confirmation", { [`${L}/secrets-seen.log`]: del() }, "write_once", /deleted/);
  plantAny("X06", "route-folder-planned (-pack) deletes a scenario", "route-folder-planned", { [`${L}/scenarios/SC-12.md`]: del() });
  plant("X07", "plan-addendum deletes agreed/CO-01.md", "plan-addendum", { [`${L}/agreed/CO-01.md`]: del() }, "write_once", /deleted/);
  plantAny("S01", "plan-resume: tester id oc-T1 -> oc-T9", "plan-resume", { [`${L}/uat.yaml`]: rep("{ role: order coordinator, id: oc-T1 }", "{ role: order coordinator, id: oc-T9 }") });
  plantAny("S02", "plan-resume: session 2 moved", "plan-resume", { [`${L}/uat.yaml`]: rep("{ session: 2, date: 2027-01-12,", "{ session: 2, date: 2027-01-13,") });
  plantAny("S03", "plan-resume-terms: the recorded terms step's documentation_sku changed", "plan-resume-terms", { [`${L}/uat.yaml`]: rep("documentation_sku: bought", "documentation_sku: declined") });
  plantAny("S04", "plan-resume: the gitignore answer changed", "plan-resume", { [`${L}/uat.yaml`]: rep("answer: not a git repo", "answer: no") });
  plantAny("S05", "signoff-signed-resume-accounts: test accounts changed after the recorded accounts step", "signoff-signed-resume-accounts", { [`${L}/signoff-requests.yaml`]: (t) => t.replace("created_by: builder }", "created_by: client operations manager }") });
  plantAny("S06", "--keep-frozen also changes the testers", "plan-keep-frozen", { [`${L}/uat.yaml`]: rep("{ role: order coordinator, id: oc-T1 }", "{ role: order coordinator, id: oc-T9 }") });
  plantAny("S07", "--add-co also moves session 3", "plan-add-co", { [`${L}/uat.yaml`]: rep("{ session: 3, date: 2027-01-21,", "{ session: 3, date: 2027-01-22,") });
  plant("S08", "R2-5: --refreeze acceptance.md also changes the testers (a refreeze touches one file)", "plan-refreeze", { [`${L}/uat.yaml`]: rep("{ role: order coordinator, id: oc-T1 }", "{ role: order coordinator, id: oc-T9 }") }, "write_once", /changed under --refreeze agreed\/acceptance\.md/);
  plant("S09", "R2-5: --refreeze acceptance.md also changes the frozen clauses' calendar", "plan-refreeze", { [`${L}/uat.yaml`]: (t) => t.replace(/calendars: \{ contract: [^,]+,/, "calendars: { contract: us-federal,") }, "write_once", /calendars, written by the recorded terms step, changed under --refreeze/);
  plant("S09b", "R2-5: --refreeze acceptance.md also rewrites another basis row", "plan-refreeze", { [`${L}/uat.yaml`]: (t) => t.replace(/(\{ file: agreed\/scope\.md, [^}]*frozen: )2027-01-04/, "$12027-01-05") }, "write_once", /a row other than agreed\/acceptance\.md's changed/);
  control("S09c", "R2-5 CONTROL: --refreeze contract-terms.md re-confirms the terms and clauses (plan-refreeze-terms as written)", "plan-refreeze-terms", {});
  plantAny("S10", "plan-resume-terms: the resume's steps dated the cut day", "plan-resume-terms", { [`${L}/uat.yaml`]: (t) => t.replace(/(\{ step: (?:mix|people|environment), rec: \d+, date: )2027-01-05/g, "$12027-01-04") });
  plant("RC01", "route-ready-cut: the resume re-freezes agreed/acceptance.md", "route-ready-cut", { [`${L}/agreed/acceptance.md`]: app("\n<!-- re-frozen -->\n") }, "route");
  plantAny("RC02", "route-folder-fixed: the confirmation run edits RUN-01.md", "route-folder-fixed", { [`${L}/runs/RUN-01.md`]: rep("| SC-01 | AC-1.1 | order coordinator oc-T1 | fail | 9 of 10 |", "| SC-01 | AC-1.1 | order coordinator oc-T1 | pass | 10 of 10 |") });
  plantAny("RC03", "route-folder-drafted: a malformed signoff-requests.yaml", "route-folder-drafted", { [`${L}/signoff-requests.yaml`]: () => "- not a map\n" });
  plant("RC04", "route-signoff-deemed: signoff.md without 'applied by' (a route cell grades its run by that run's own rules)", "route-signoff-deemed", { [`${M}/signoff.md`]: rep("; applied by Robin", "") }, "signed", /applied by/);
  plantAny("RC05", "route-folder-sent-signed: the --signed run edits a history entry of request 1", "route-folder-sent-signed", { [`${L}/signoff-requests.yaml`]: rep("{ status: sent, rec: 52, date: 2027-01-22 }", "{ status: sent, rec: 52, date: 2027-01-23 }") });
  plantAny("RC06", "route-plan-addendum: the addendum run rewrites an existing scenario", "route-plan-addendum", { [`${L}/scenarios/SC-01.md`]: app("\nEdited.\n") });
  it("RC00: every route cell that names a run also passes that run's own checks (CONTROL: the goldens)", () => {
    const routes = listCases().filter((c) => typeof loadKey(join(FIXTURES, c)).run === "string");
    expect(routes.length).toBeGreaterThan(10);
    for (const c of routes) expect(runCase(c).filter((r) => r.problems.length), c).toEqual([]);
  });
  plant("DD01", "m-plan: the terms digest off by one hex digit", "m-plan", { [`${M}/uat.yaml`]: (t) => t.replace(/digest: "sha256:([0-9a-f])/, (_m, c) => `digest: "sha256:${c === "0" ? "1" : "0"}`) }, "plan", /digest is/);
  plant("DD02", "m-plan: the contract-terms basis row without block: terms", "m-plan", { [`${M}/uat.yaml`]: rep("block: terms, ", "") }, "plan", /names no block/);
  plant("DD03", "plan-refreeze-terms: --refreeze copies contract-inputs.md whole", "plan-refreeze-terms", { [`${L}/agreed/contract-terms.md`]: () => runView("plan-refreeze-terms").priorRead("opchain-work/plans/larkspur-ceramics/contract-inputs.md") }, "plan_mode", /only the terms block/);
  plant("DD04", "plan-refreeze-terms: the basis row keeps the old digest", "plan-refreeze-terms", { [`${L}/uat.yaml`]: (t) => { const old = runView("plan-refreeze-terms").priorRead(`${L}/uat.yaml`).match(/digest: "sha256:[0-9a-f]+"/)[0]; return t.replace(/digest: "sha256:[0-9a-f]+"/, old); } }, "plan_mode", /after --refreeze/);
  plant("DD05", "pack-terms-mismatch: the pack written anyway over the terms mismatch", "pack-terms-mismatch", { [`${L}/pack.yaml`]: () => runView("pack").read(`${L}/pack.yaml`) }, "basis", /basis mismatch/);
});

describe("OW-04 R2: OD-1 chains and the pinned tables (h/family2.mjs, h/wp6.mjs)", () => {
  const B = "ow-build/skill.edges.yaml", BP = "ow-build-plan/skill.edges.yaml";
  family("OD1-0", "CONTROL: the real tree", {}, false);
  family("OD1a", "ow-build's ready hop drops scope.md and names it only as a field of ready-for-uat.md", { [B]: (t) => rep("      - { path: plans/<client>/scope.md, in_place: true }\n", "")(t).replace("fields: [ready, build_label, environment,", "fields: [ready, plans/<client>/scope.md, build_label, environment,") });
  family("OD1b", "ow-build-plan's signed hop drops map/roles.md (first hop of roles.md's chain)", { [BP]: rep("      - { path: plans/<client>/map/roles.md, in_place: true }   # owner decision OD-1: handed on for ow-uat, which reads it in place\n", "") });
  family("OD1c", "roles.md handed on in place to the wrong receiver", { [BP]: (t) => rep("      - { path: plans/<client>/map/roles.md, in_place: true }   # owner decision OD-1: handed on for ow-uat, which reads it in place\n", "")(t) });
  family("OD1d", "in_place: false on a hand-on entry", { [B]: rep("      - { path: plans/<client>/quote.md, in_place: true }", "      - { path: plans/<client>/quote.md, in_place: false }") });
  family("OD1e", "a hand-on in place of a file no family skill writes", { [B]: rep("      - { path: plans/<client>/quote.md, in_place: true }", "      - { path: plans/<client>/quote.md, in_place: true }\n      - { path: plans/<client>/quote-v2.md, in_place: true }") });
  family("OD1f", "a hand-on in place to ow-uat of a file ow-uat neither reads nor hands on (map/data.md)", { [B]: rep("      - { path: plans/<client>/quote.md, in_place: true }", "      - { path: plans/<client>/quote.md, in_place: true }\n      - { path: plans/<client>/map/data.md, in_place: true }") });
  family("OD1g", "CONTROL: the same hop spelled ./plans/<client>/scope.md", { [B]: rep("      - { path: plans/<client>/scope.md, in_place: true }", "      - { path: ./plans/<client>/scope.md, in_place: true }") }, false);
  family("OD1h", "ow-uat reads plans/<client>/map/systems.md in place, which ow-build never hands on", { [E]: rep("  - from: ow-handoff\n", "  - { from: ow-build-plan, path: plans/<client>/map/systems.md, in_place: true, if_absent: Ask, if_mismatch: Use what parses }\n  - from: ow-handoff\n") });
  family("OD1i", "ow-build's ledger.md dropped from the ready hop (one-hop chain)", { [B]: rep("      - { path: builds/<client>/ledger.md, fields: [the delivery payment's state] }\n", "") });
  family("OD1j", "ow-build-plan reads ow-uat's signoff.md in place (no hop lists it toward ow-build-plan)", { [BP]: rep("  - from: ow-uat\n    path: uat/<client>/defects/UAT-nn.md\n", "  - { from: ow-uat, path: uat/<client>/signoff.md, in_place: true, if_absent: Ask, if_mismatch: Use what parses }\n  - from: ow-uat\n    path: uat/<client>/defects/UAT-nn.md\n") });
  const edges = () => readFileSync(join(ROOT, "skills-work", E), "utf8");
  const drift = (id, desc, fn, which, want = /./) => it(`${id}: ${desc}`, () => {
    const out = (which === "w" ? edgesWriterDrift : handoffFieldDrift)(fn(edges()));
    if (want === null) expect(out).toEqual([]);
    else expect(out.join("\n")).toMatch(want);
  });
  drift("WP0", "CONTROL: the real edges against WRITER_PIN", (t) => t, "w", null);
  drift("WP1", "backstop-log.yaml widened to --backstop", rep("  - { path: uat/<client>/backstop-log.yaml, verb: /ow-uat-signoff --readiness, modes: [--builder-delay] }", "  - { path: uat/<client>/backstop-log.yaml, verb: /ow-uat-signoff --readiness, modes: [--builder-delay, --backstop] }"), "w");
  drift("WP2", "evidence/index.md also written by -defect", rep("  - { path: uat/<client>/evidence/index.md, verb: /ow-uat-run }", "  - { path: uat/<client>/evidence/index.md, verb: /ow-uat-run }\n  - { path: uat/<client>/evidence/index.md, verb: /ow-uat-defect }"), "w");
  drift("WP3", "a new written file (notes.md) the C1 table lacks", rep("  - { path: uat/<client>/backstop.md, verb: /ow-uat-signoff --backstop }", "  - { path: uat/<client>/backstop.md, verb: /ow-uat-signoff --backstop }\n  - { path: uat/<client>/notes.md, verb: /ow-uat-run }"), "w");
  drift("WP4", "secrets-seen.log loses -pack as an appender", rep("  - { path: uat/<client>/secrets-seen.log, verb: /ow-uat-pack, append: true }\n", ""), "w");
  drift("WP5", "--deemed renamed --deem on signoff.md", rep("  - { path: uat/<client>/signoff.md, verb: /ow-uat-signoff --signed, modes: [--deemed] }", "  - { path: uat/<client>/signoff.md, verb: /ow-uat-signoff --signed, modes: [--deem] }"), "w");
  drift("WP6", "secrets-seen.log appended by -run without append: true (the pin now holds the flag)", rep("  - { path: uat/<client>/secrets-seen.log, verb: /ow-uat-run, append: true }", "  - { path: uat/<client>/secrets-seen.log, verb: /ow-uat-run }"), "w", /without append: true/);
  family("WP6b", "the same, through the family rule (h/wp6.mjs)", { [E]: rep("  - { path: uat/<client>/secrets-seen.log, verb: /ow-uat-run, append: true }", "  - { path: uat/<client>/secrets-seen.log, verb: /ow-uat-run }") });
  drift("HP0", "CONTROL: the real edges against HANDOFF_PIN", (t) => t, "h", null);
  drift("HP1", "the punch-list hand-off drops 'logged date'", rep("fields: [each item, its UAT-nn, logged date, reported after request]", "fields: [each item, its UAT-nn, reported after request]"), "h", /logged date/);
  drift("HP2", "R2-7: the handoff hand-off drops acceptance-addendum-CO-nn.md (H1 reads it)", rep("      - { path: uat/<client>/acceptance-addendum-CO-nn.md, fields: [checks, results, confirmation date] }\n", ""), "h", /drops uat\/<client>\/acceptance-addendum-CO-nn\.md/);
  drift("HP3", "R2-7: the handoff hand-off drops uat.yaml's governing definition (H2: -delivered reads it)", (t) => t.replace(/(    verb: \/ow-handoff-start[\s\S]*?)      - \{ path: uat\/<client>\/uat\.yaml, fields: \[the governing acceptance or delivery definition, dated\] \}\n/, "$1"), "h", /\/ow-handoff-start: the hand-off drops uat\/<client>\/uat\.yaml/);
  drift("HP4", "R2-7: the handoff hand-off drops agreed/acceptance.md (H1: -start copies agreed/)", rep("      - { path: uat/<client>/agreed/acceptance.md, fields: [the agreed checks] }\n", ""), "h", /drops uat\/<client>\/agreed\/acceptance\.md/);
  drift("HP4b", "R2-7: the handoff hand-off drops agreed/CO-nn.md", rep("      - { path: uat/<client>/agreed/CO-nn.md, fields: [the change orders in the acceptance] }\n", ""), "h", /drops uat\/<client>\/agreed\/CO-nn\.md/);
  drift("HP5", "R2-7: the documentation hand-off drops signoff.md (§4.1 reads it)", rep("      - { path: uat/<client>/signoff.md, fields: [signed or deemed date] }\n      - { path: uat/<client>/uat.yaml, fields: [roles, tester ids, environment, test data] }", "      - { path: uat/<client>/uat.yaml, fields: [roles, tester ids, environment, test data] }"), "h", /\/ow-documentation-start: the hand-off drops uat\/<client>\/signoff\.md/);
  drift("HP6", "R2-7: the fix hand-off loses the punch list", rep("    files: [uat/<client>/punch-list.md]", "    files: []"), "h", /\/ow-handoff-fix: the hand-off drops uat\/<client>\/punch-list\.md/);
});

describe("OW-04 R2: the terms block's digest and the calendar a year at a time (h/fn2.mjs)", () => {
  const ci = readFileSync(join(FIXTURES, "m-plan", "input", "opchain-work", "plans", "mossgate-books", "contract-inputs.md"), "utf8");
  const chg = (t) => t.replace('delivery_backstop: { ref: "TEST-2", business_days: 10,', 'delivery_backstop: { ref: "TEST-2", business_days: 20,');
  const crlf = ci.replace(/\n/g, "\r\n");
  const blank = ci.replace(/(\n {2}deemed_acceptance: [^\n]*\n)( {2}delivery_backstop:)/, "$1\n$2");
  const cmt = ci.replace(/(\n {2}deemed_acceptance: [^\n]*\n)( {2}delivery_backstop:)/, "$1# approved 2026-10-20\n$2");
  it("DG1: a trailing space on the deemed clause line changes the digest", () => expect(blockDigest(ci.replace(/(deemed_acceptance: [^\n]*)\n/, "$1 \n"))).not.toBe(blockDigest(ci)));
  it("DG2: R2-4: a CRLF contract-inputs.md: a changed backstop clause changes the digest, and line endings alone do not", () => {
    expect(blockDigest(chg(crlf))).not.toBe(blockDigest(crlf));
    expect(blockDigest(crlf)).toBe(blockDigest(ci));
    expect(termsBlock(crlf)).toMatch(/^schedule: 50\/50\npayment_terms_days: 14\n/);
  });
  it("DG3: R2-4: a blank line inside contract_clauses: a changed backstop clause changes the digest", () => { expect(blank).not.toBe(ci); expect(blockDigest(chg(blank))).not.toBe(blockDigest(blank)); });
  it("DG4: R2-4: a column-0 comment inside contract_clauses: a changed backstop clause changes the digest", () => { expect(cmt).not.toBe(ci); expect(blockDigest(chg(cmt))).not.toBe(blockDigest(cmt)); });
  it("DG5: the two clauses reordered upstream change the digest", () => {
    const reord = ci.replace(/( {2}deemed_acceptance: [^\n]*\n)( {2}delivery_backstop: [^\n]*\n)/, "$2$1");
    expect(reord).not.toBe(ci);
    expect(blockDigest(reord)).not.toBe(blockDigest(ci));
  });
  it("DG6: a word changed in ## Ownership changes the digest (Larkspur's contract inputs)", () => {
    const lci = readFileSync(join(FIXTURES, "pack-terms-mismatch", "input", "opchain-work", "plans", "larkspur-ceramics", "contract-inputs.md"), "utf8");
    expect(blockDigest(lci.replace("The work is yours", "The work is ours"))).not.toBe(blockDigest(lci));
  });
  it("DG7: CONTROL: fixed_price is outside the terms block", () => expect(blockDigest(ci.replace("fixed_price: 2100.00", "fixed_price: 2200.00"))).toBe(blockDigest(ci)));
  it("DG8: OD-6: payment_terms_days changed after the freeze changes the digest", () => expect(blockDigest(ci.replace("payment_terms_days: 14", "payment_terms_days: 30"))).not.toBe(blockDigest(ci)));
  it("DG9: OD-6: the schedule 50/50 changed to 40/40/20 changes the digest", () => expect(blockDigest(ci.replace("schedule: 50/50", "schedule: 40/40/20"))).not.toBe(blockDigest(ci)));
  it("DG10: R2-1: with no code, the text comparison sees a changed clause, schedule or payment terms, and nothing on the golden", () => {
    const u = yaml.load(golden("m-plan", `${M}/uat.yaml`));
    const ct = golden("m-plan", `${M}/agreed/contract-terms.md`);
    expect(termsTextMismatches(ci, u, ct)).toEqual([]);
    expect(termsTextMismatches(crlf, u, ct)).toEqual([]);
    expect(termsTextMismatches(chg(ci), u, ct)).toEqual(["contract_clauses.delivery_backstop"]);
    expect(termsTextMismatches(ci.replace("schedule: 50/50", "schedule: 40/40/20"), u, ct)).toEqual(["schedule"]);
    expect(termsTextMismatches(ci.replace("payment_terms_days: 14", "payment_terms_days: 30"), u, ct)).toEqual(["payment_terms_days"]);
    expect(termsTextMismatches(ci, { ...u, clauses: "none" }, ct)).toEqual(["contract_clauses (frozen as none)"]);
  });
  it("DG11: R2-1: the text comparison agrees with every golden that froze the terms", () => {
    let n = 0;
    for (const c of listCases()) {
      const key = loadKey(join(FIXTURES, c));
      if (typeof key.run === "string" || !key.slug) continue;
      const v = runView(c);
      const ytext = v.read(`opchain-work/uat/${key.slug}/uat.yaml`);
      const up = v.read(`opchain-work/plans/${key.slug}/contract-inputs.md`);
      if (!ytext || !up || /--refreeze|--keep-frozen/.test(String(key.verbs)) || /mismatch|changed|schedule|incidental|clause-on-date|nocode-price|nocode-testmix|negated/.test(c)) continue;
      let u; try { u = yaml.load(ytext); } catch { continue; }
      if (!u?.terms) continue;
      expect(termsTextMismatches(up, u, v.read(`opchain-work/uat/${key.slug}/agreed/contract-terms.md`)), c).toEqual([]);
      n++;
    }
    expect(n).toBeGreaterThan(50);
  });
  const d = (from, n) => { try { return addDate({ from, businessDays: n, calendar: "us-federal" }).date; } catch (e) { return `refused:${e.extra?.reason ?? e.message}`; } };
  for (const [id, from, n, want] of [
    ["YC1", "2032-12-30", 1, "2033-01-03"], ["YC2", "2023-01-03", -1, "2022-12-30"], ["YC3", "2022-12-23", 1, "2022-12-27"], ["YC4", "2028-02-25", 3, "2028-03-01"],
    ["YC5", "2096-02-28", 1, "2096-02-29"], ["YC6", "2099-12-30", 1, "2099-12-31"], ["YC7", "2100-01-04", -2, "refused:calendar-out-of-range"], ["YC8", "2021-12-30", 1, "refused:calendar-out-of-range"],
    ["YC9", "2027-12-30", 1, "2028-01-03"], ["YC10", "2038-12-30", 1, "2039-01-03"], ["YC11", "2050-12-30", 1, "2051-01-03"], ["YC12", "2026-01-01", 0, "2026-01-01"],
  ]) it(`${id}: calc --calendar us-federal ${from} ${n >= 0 ? "+" : ""}${n} = ${want}`, () => expect(d(from, n)).toBe(want));
  it("YC13: the checker's table oracle refuses a count that leaves 2026-2031 (the skill asks the user there); calc answers it", () => {
    expect(() => addBusinessDays("2031-12-26", 5, tableHolidays())).toThrow(/leaves the contract calendar table \(2026 to 2031\)/);
    expect(d("2031-12-26", 5)).toBe("2032-01-05");
    expect(addBusinessDays("2031-12-19", 5, tableHolidays())).toBe("2031-12-29");
  });
});

describe("OW-04 R2: OD-4 and OD-5 cases, now goldens (the Evaluator's zz2 cases)", () => {
  plant("ZZ01", "zz2-backstop-on-date: backstop.md written on the backstop date", "backstop-on-the-date", { [`${M}/backstop.md`]: add(golden("m-backstop", `${M}/backstop.md`)) }, "refused");
  control("ZZ02", "CONTROL: zz2-backstop-day-after (m-backstop, on 2027-01-18)", "m-backstop", {});
  control("ZZ03", "CONTROL: zz2-backstop-clause-on-date (the frozen clause says it falls due on the backstop date itself)", "backstop-clause-on-date", {});
  plant("ZZ04", "R2-6: zz2-backstop-incidental: backstop.md written on the date, the clause only counting a notice 'from the same day'", "backstop-incidental", { [`${M}/backstop.md`]: add(golden("backstop-clause-on-date", `${M}/backstop.md`)) }, "refused");
  plant("ZZ05", "OD-6: zz2-code-pack-changed (the payment terms changed): the pack written anyway", "pack-payment-terms-changed", Object.fromEntries([`${M}/pack.yaml`, `${M}/uat-pack-shop-manager.md`].map((f) => [f, add(golden("m-pack", f))])), "basis", /basis mismatch/);
  plant("ZZ06", "R2-1: zz2-nocode-pack-changed: with no code, a changed clause, and the pack written anyway", "pack-terms-nocode-changed", Object.fromEntries([`${M}/pack.yaml`, `${M}/uat-pack-shop-manager.md`].map((f) => [f, add(golden("m-pack", f))])), "basis", /basis mismatch \(agreed\/contract-terms\.md\)/);
  control("ZZ07", "CONTROL: zz2-nocode-pack-same (no code, nothing changed upstream)", "pack-terms-nocode", {});
  plant("ZZ08", "OD-6 and R2-1: with no code, the schedule changed, and the pack written anyway", "pack-terms-nocode-schedule", { [`${M}/pack.yaml`]: add(golden("m-pack", `${M}/pack.yaml`)) }, "basis");
  plant("ZZ09", "R2-10: -defect triages UAT-01 over the mismatch", "defect-terms-mismatch", { [`${M}/defects/UAT-01.md`]: () => golden("m-defect-no-steps", `${M}/defects/UAT-01.md`) }, "basis", /triaged over a basis mismatch/);
  plant("ZZ10", "R2-10: -defect's printed block does not name the mismatch", "defect-terms-mismatch", { "printed.md": (t) => t.replace(/agreed\/contract-terms\.md/g, "the agreed terms").replace(/contract-terms\.md/g, "the terms") }, "basis", /does not name agreed\/contract-terms\.md/);
  plant("ZZ11", "R2-1: -plan with no code freezes a clause that differs from contract_clauses", "m-plan-nocode", { [`${M}/uat.yaml`]: rep('ref: "TEST-1", business_days: 10,', 'ref: "TEST-1", business_days: 15,') }, "plan", /frozen with no code/);
  plant("ZZ12", "R2-1 and OD-6: -plan with no code freezes another payment schedule", "m-plan-nocode", { [`${M}/uat.yaml`]: rep("  schedule: 50/50\n", "  schedule: 40/40/20\n") }, "plan", /schedule as frozen differs/);
  it("ZZ13: R2-6: only explicit clause wording moves the backstop to its own date", () => {
    for (const w of ["The delivery half falls due on the backstop date itself.", "It applies on the backstop date.", "The payment becomes due on that date.", "This clause takes effect from and including the backstop date."]) expect(appliesOnTheDate({ wording: w }), w).toBe(true);
    for (const w of ["The readiness notice counts from the same day it is sent.", "Days are counted from the same day.", "A notice sent on that date is timely.", "no sooner than the later of ten business days after acceptance"]) expect(appliesOnTheDate({ wording: w }), w).toBe(false);
  });
});

describe("OW-04 R2: the Evaluator's untuned set through the file pipeline (h/fresh2.mjs, h/sentences2.mjs)", () => {
  const R2 = `${L}/signoff-request-2.md`, MR = `${M}/signoff-request-1.md`;
  const reqStart = (s) => ({ [R2]: rep("## The build tested\n", `## The build tested\n${s} `) });
  const reqEnd = (s) => ({ [R2]: rep("\n\n## Every acceptance check", `\n\n${s}\n\n## Every acceptance check`) });
  const reqRecords = (s) => ({ [R2]: rep("## Records created during testing\n", `## Records created during testing\n${s}\n\n`) });
  const uat05 = (s) => ({ [`${L}/defects/UAT-05.md`]: rep("The fix is at no charge.\n", `The fix is at no charge. ${s}\n`) });
  const punch = (s) => ({ [`${L}/punch-list.md`]: rep("Each is fixed after handoff at no charge.\n", `Each is fixed after handoff at no charge. ${s}\n`) });
  const packLine = (s) => ({
    [`${L}/uat-pack-order-coordinator.md`]: rep("write it in the results template instead of your name.\n", `write it in the results template instead of your name. ${s}\n`),
    [`${L}/export/uat-pack-order-coordinator.html`]: rep("write it in the results template instead of your name.</p>", `write it in the results template instead of your name. ${s.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`),
  });
  const packBlock = (s) => ({ [`${L}/uat-pack-order-coordinator.md`]: rep("\n## Reporting a problem\n", `\n${s}\n\n## Reporting a problem\n`) });
  const sc06 = (s) => ({ [`${L}/scenarios/SC-06.md`]: rep("fields: lines, quantities.\n", `fields: lines, quantities.\n\n${s}\n`) });
  const run1 = (s) => ({ [`${L}/runs/RUN-01.md`]: rep("- a password in the note of SC-07: not copied; logged in secrets-seen.log", `- a password in the note of SC-07: not copied; logged in secrets-seen.log\n- ${s}`) });
  const mStart = (s) => ({ [MR]: rep("## The build tested\n", `## The build tested\n${s} `) });
  const mEnd = (s) => ({ [MR]: rep("\n\n## Every acceptance check", `\n\n${s}\n\n## Every acceptance check`) });
  for (const [id, s] of Object.entries(S.EV2_OURS)) {
    plant(`${id}@start`, s, "signoff-request-2", reqStart(s), "internal_numbers");
    plant(`${id}@end`, s, "signoff-request-2", reqEnd(s), "internal_numbers");
    plant(`${id}@reason`, s, "defect-fixed", uat05(s), "internal_numbers");
  }
  for (const [id, s] of Object.entries(S.EV2_LEGIT)) {
    control(`${id}@start`, s, "signoff-request-2", reqStart(s));
    control(`${id}@end`, s, "signoff-request-2", reqEnd(s));
    control(`${id}@punch`, s, "signoff-signed", punch(s));
  }
  for (const [id, s] of Object.entries(S.EV2_DATA_PLANT)) {
    plant(`${id}@scenario`, s.split("\n")[0], "plan", sc06(s), "data");
    plant(`${id}@pack`, s.split("\n")[0], "pack", packBlock(s), "data");
    plant(`${id}@request`, s.split("\n")[0], "signoff-request-2", reqRecords(s), "data");
  }
  for (const [id, s] of Object.entries(S.EV2_DATA_CONTROL)) {
    control(`${id}@scenario`, s.split("\n")[0], "plan", sc06(s));
    control(`${id}@pack`, s.split("\n")[0], "pack", packBlock(s));
    control(`${id}@request`, s.split("\n")[0], "signoff-request-2", reqRecords(s));
  }
  for (const [id, [w, s]] of Object.entries(S.EV2_FP_PLANT)) {
    if (w === "m") { plant(`${id}@start`, s, "m-signoff-request", mStart(s), "false_pass"); plant(`${id}@end`, s, "m-signoff-request", mEnd(s), "false_pass"); }
    else plant(`${id}@reason`, s, "defect-fixed", uat05(s), "false_pass");
  }
  for (const [id, [w, s]] of Object.entries(S.EV2_FP_CONTROL)) {
    if (w === "m") { control(`${id}@start`, s, "m-signoff-request", mStart(s)); control(`${id}@end`, s, "m-signoff-request", mEnd(s)); }
    else control(`${id}@reason`, s, "defect-fixed", uat05(s));
  }
  for (const [id, s] of Object.entries(S.EV2_PEOPLE_PLANT)) { plant(`${id}@pack`, s, "pack", packLine(s), "people"); plant(`${id}@request`, s, "signoff-request-2", reqStart(s), "people"); }
  for (const [id, s] of Object.entries(S.EV2_PEOPLE_CONTROL)) { control(`${id}@pack`, s, "pack", packLine(s)); control(`${id}@request`, s, "signoff-request-2", reqStart(s)); }
  for (const [id, s] of Object.entries(S.EV2_CRED_PLANT)) { plant(`${id}@pack`, s, "pack", packLine(s), "credentials"); plant(`${id}@run`, s, "run-session-1", run1(s), "credentials"); }
  for (const [id, s] of Object.entries(S.EV2_CRED_CONTROL)) { control(`${id}@pack`, s, "pack", packLine(s)); control(`${id}@run`, s, "run-session-1", run1(s)); }
  // h/fresh2b.mjs: OD-7, legitimate long tables (schedules, counts by session, volumes) pass at any length.
  const Q = {
    Q1: "| Session | Date | Start | Testers |\n|---|---|---|---|\n| 1 | 2027-01-07 | 10:00 | 3 |\n| 2 | 2027-01-12 | 14:00 | 3 |\n| 3 | 2027-01-21 | 09:30 | 3 |\n| 4 | 2027-01-26 | 10:00 | 2 |\n| 5 | 2027-02-04 | 10:00 | 1 |",
    Q2: "| Session | Logged | Defects | Changes |\n|---|---|---|---|\n| Session 1 | 5 | 3 | 0 |\n| Session 2 | 0 | 0 | 0 |\n| Session 3 | 2 | 1 | 1 |\n| Retest | 1 | 1 | 0 |\n| Addendum | 2 | 1 | 0 |",
    Q3: "| Week | Orders in the test | Passed |\n|---|---|---|\n| 1 | 40 | 38 |\n| 2 | 42 | 42 |\n| 3 | 39 | 39 |\n| 4 | 41 | 41 |\n| 5 | 40 | 40 |",
    Q4: "| Month | Invoices you raise |\n|---|---|\n| September | 96 |\n| October | 101 |\n| November | 99 |\n| December | 140 |\n| January | 95 |",
    Q5: "| Step | Expected count | Cases |\n|---|---|---|\n| 1 | 10 | 10 |\n| 2 | 2 | 2 |\n| 3 | 3 | 3 |\n| 4 | 10 | 10 |\n| 5 | 60 | 60 |",
  };
  for (const [id, s] of Object.entries(Q)) { control(`${id}@scenario`, `OD-7 CONTROL: ${s.split("\n")[0]}`, "plan", sc06(s)); control(`${id}@pack`, `OD-7 CONTROL: ${s.split("\n")[0]}`, "pack", packBlock(s)); }
  // h/o7post.mjs: the O7 wording in a reason after the retest passed.
  const r05 = (s) => ({ [`${L}/defects/UAT-05.md`]: rep("The fix is at no charge.\n", `The fix is at no charge. ${s}\n`) });
  control("O7p1", "the design's O7 example, after the retest", "defect-retest", r05("Fixed on 14 January, after the 5 business days quoted, at no charge."));
  control("O7p2", "fixed within the bounds, after the retest", "defect-retest", r05("It was fixed on 15 January, within the 5 business days quoted, at no charge."));
  control("O7p3", "round 3 of 2 quoted, after the retest", "defect-retest", r05("It needed a third fix round, past the 2 rounds quoted, at no charge."));
  plant("O7p4", "our effort after the bounds, after the retest", "defect-retest", r05("It was fixed after the 5 business days quoted; it took us three extra days of work."), "internal_numbers");
});

describe("OW-04 round 3: the held-out set written before any round-3 rule changed", () => {
  const legitCtx = { user: "Robin", legit: new Set([120000, 698000, 349000, 400000]) };
  const people = { user: "Robin", people: [], client: "Larkspur Ceramics" };
  for (const s of S.HELDOUT3_OURS) it(`our side caught: ${s}`, () => expect(internalFindings(s, { user: "Robin" }).length).toBeGreaterThan(0));
  for (const s of S.HELDOUT3_LEGIT) it(`legitimate passes every meaning rule: ${s}`, () => {
    expect(internalFindings(s, legitCtx)).toEqual([]);
    expect(falsePassFindings(s, S.HELDOUT3_FP_CONTEXT)).toEqual([]);
    expect(dataFindings(s, {})).toEqual([]);
    expect(peopleFindings(s, people)).toEqual([]);
    expect(credentialFindings(s)).toEqual([]);
  });
  for (const s of S.HELDOUT3_FALSE_PASS.caught) it(`who tested caught: ${s}`, () => expect(falsePassFindings(s, S.HELDOUT3_FP_CONTEXT).length).toBeGreaterThan(0));
  for (const s of S.HELDOUT3_FALSE_PASS.legit) it(`R2-2: a negation, future or invitation passes: ${s}`, () => expect(falsePassFindings(s, S.HELDOUT3_FP_CONTEXT)).toEqual([]));
  for (const s of S.HELDOUT3_CREDENTIALS.caught) it(`credential caught: ${s}`, () => expect(credentialFindings(s).length).toBeGreaterThan(0));
  for (const s of S.HELDOUT3_CREDENTIALS.legit) it(`credential CONTROL: ${s}`, () => expect(credentialFindings(s)).toEqual([]));
  for (const s of S.HELDOUT3_TABLES.caught) it(`OD-7: a table of personal or ID-like rows is caught by the data rule: ${s.split("\n")[0]}`, () => expect(dataFindings(s, {}).length).toBeGreaterThan(0));
  for (const s of S.HELDOUT3_TABLES.legit) it(`OD-7: a count or schedule table passes at any length: ${s.split("\n")[0]}`, () => expect(dataFindings(s, {})).toEqual([]));
});

// ── OW-04 follow-up (ow-uat 1.0.1): the round-3 plants and owner decisions R3-4 and R3-6, kept (C17) ──
describe("OW-04 R3: owner decision R3-6 (a changed check list is not refrozen; sign-off counts agreed/)", () => {
  const ACC = `${L}/agreed/acceptance.md`;
  const upstream = () => runView("plan-refreeze-checks-changed").priorRead("opchain-work/plans/larkspur-ceramics/acceptance.md");
  control("R6-0", "CONTROL: the refusal golden (nothing written; AC-6.1, the change order and --add-co named)", "plan-refreeze-checks-changed", {});
  plant("R6-1", "the refreeze done anyway: acceptance.md copied, AC-6.1 added to uat.yaml checks (the Evaluator's zz3-refreeze-adds-check)", "plan-refreeze-checks-changed", {
    [ACC]: () => upstream(),
    [`${L}/uat.yaml`]: () => golden("plan", `${L}/uat.yaml`).replace("checks: [AC-1.1, AC-1.2, AC-2.1, AC-3.1, AC-4.1, AC-5.1, AC-5.2, AC-CO-01.1, AC-CO-01.2]", "checks: [AC-1.1, AC-1.2, AC-2.1, AC-3.1, AC-4.1, AC-5.1, AC-5.2, AC-6.1, AC-CO-01.1, AC-CO-01.2]"),
  }, "refreeze_checks", /over a changed check list \(AC-6\.1\)/);
  plant("R6-2", "the refusal names no change order and no --add-co", "plan-refreeze-checks-changed", { "printed.md": (t) => t.replace(/[^\n]*--add-co[^\n]*\n/g, "").replace(/change order/g, "update") }, "refreeze_checks", /change order and --add-co/);
  plant("R6-3", "the refusal does not name the changed check", "plan-refreeze-checks-changed", { "printed.md": (t) => t.replace(/AC-6\.1/g, "the new check") }, "refreeze_checks", /does not name AC-6\.1/);
  it("R6-4: a check in agreed/ that uat.yaml does not list still counts for exit criterion 1 (sign-off never passes an untested check)", () => {
    const key = loadKey(join(FIXTURES, "signoff-request-2"));
    const v = runView("signoff-request-2");
    const extra = `${v.read(ACC)}\n### AC-6.1\n- when: the bookkeeper exports the month's invoices\n- then: the export lists every invoice once\n- cases: 1\n- kind: normal\n`;
    const view = { ...v, read: (f) => (f.endsWith("agreed/acceptance.md") ? extra : v.read(f)) };
    expect(exitCriteria(v, key)[1] ?? []).not.toContain("AC-6.1");
    expect(exitCriteria(view, key)[1]).toContain("AC-6.1");
  });
});

describe("OW-04 R3: owner decision R3-4 (published test cards and test-marked ids are test data)", () => {
  const sc06 = (s) => ({ [`${L}/scenarios/SC-06.md`]: rep("fields: lines, quantities.\n", `fields: lines, quantities.\n\n${s}\n`) });
  const records = (s) => ({ [`${L}/signoff-request-2.md`]: rep("## Records created during testing\n", `## Records created during testing\n${s}\n\n`) });
  for (const [id, s] of [
    ["R4-C1", "Pay with the provider's test card 4242 4242 4242 4242 in test mode."],
    ["R4-C2", "A declined payment uses the provider's test card 4000000000000002."],
    ["R4-C3", "| Card | Expect |\n|---|---|\n| 5555 5555 5555 4444 | approved in test mode |\n| 4000 0000 0000 9995 | declined: insufficient funds |"],
  ]) control(`${id}@scenario`, `CONTROL: ${s.split("\n")[0]}`, "plan", sc06(s));
  for (const [id, s] of [
    ["R4-C4", "- Invoice 100001 in the sandbox, created by SC-06: delete after sign-off."],
    ["R4-C5", "| Record | Where | Created by |\n|---|---|---|\n| Invoice 100001 | QuickBooks Online sandbox | SC-06 |\n| Invoice 100002 | QuickBooks Online sandbox | SC-06 |"],
    ["R4-C6", "- Test order 58219 in the staging mailbox: delete after sign-off."],
  ]) control(`${id}@request`, `CONTROL: ${s.split("\n")[0]}`, "signoff-request-2", records(s));
  for (const [id, s, place] of [
    ["R4-P1", "Charge card 4111 1111 1111 1110 for the order.", "scenario"],
    ["R4-P2", "Invoice 100001 for Ridgeway Cafe was paid on 2 December.", "request"],
    ["R4-P3", "| Card | Amount |\n|---|---|\n| 4242 4242 4242 4241 | 54.00 |", "scenario"],
    ["R4-P4", "| Sandbox buyer | buyer@ridgeway.example |", "scenario"],
  ]) plant(`${id}@${place}`, s.split("\n")[0], place === "scenario" ? "plan" : "signoff-request-2", place === "scenario" ? sc06(s) : records(s), "data");
  it("R4-5: the allowlist is Stripe's published numbers only, digits only, and every one passes the Luhn check", () => {
    const luhn = (n) => [...n].reverse().reduce((a, d, i) => a + (i % 2 ? ((2 * d) % 10) + Math.floor((2 * d) / 10) : Number(d)), 0) % 10 === 0;
    expect(PUBLISHED_TEST_CARDS.size).toBeLessThanOrEqual(30);
    for (const n of PUBLISHED_TEST_CARDS) { expect(n).toMatch(/^\d{14,19}$/); expect(luhn(n), n).toBe(true); }
    expect(PUBLISHED_TEST_CARDS.has("4111111111111111")).toBe(false);
  });
});

describe("OW-04 R3: the Evaluator's round-3 functions (h/fn3.mjs)", () => {
  const ci = readFileSync(join(FIXTURES, "m-plan", "input", "opchain-work", "plans", "mossgate-books", "contract-inputs.md"), "utf8");
  const chg = (t) => t.replace('delivery_backstop: { ref: "TEST-2", business_days: 10,', 'delivery_backstop: { ref: "TEST-2", business_days: 20,');
  const BOM = "﻿";
  it("DG-BOM: R3-5: a BOM-prefixed contract-inputs.md: a changed clause changes the digest, and the BOM alone does not", () => {
    expect(blockDigest(BOM + ci)).not.toBe(blockDigest(chg(BOM + ci)));
    expect(blockDigest(BOM + ci)).toBe(blockDigest(ci));
  });
  it("DG-CRLF, DG-TRAIL, DG-BLANK, DG-CMT, DG-SCHED, DG-TERMS, DG-SCHED-DEL", () => {
    expect(blockDigest(ci.replace(/\n/g, "\r\n"))).not.toBe(blockDigest(chg(ci).replace(/\n/g, "\r\n")));
    expect(blockDigest(ci.replace(/\n/g, "\r\n"))).toBe(blockDigest(ci));
    expect(blockDigest(ci)).not.toBe(blockDigest(ci.replace(/(deemed_acceptance: [^\n]*)\n/, "$1 \n")));
    const blank = ci.replace(/(\n {2}deemed_acceptance: [^\n]*\n)( {2}delivery_backstop:)/, "$1\n$2");
    const cmt = ci.replace(/(\n {2}deemed_acceptance: [^\n]*\n)( {2}delivery_backstop:)/, "$1# approved\n$2");
    expect(blockDigest(blank)).not.toBe(blockDigest(chg(blank)));
    expect(blockDigest(cmt)).not.toBe(blockDigest(chg(cmt)));
    for (const t of [ci.replace("schedule: 50/50", "schedule: 40/40/20"), ci.replace("payment_terms_days: 14", "payment_terms_days: 30"), ci.replace("schedule: 50/50\n", "")]) expect(blockDigest(t)).not.toBe(blockDigest(ci));
  });
  it("NC-*: R3-1: the no-code comparison sees a removed schedule, a removed clause, a removed Ownership section, and a BOM file's changed clause; a BOM alone is no change", () => {
    const u = yaml.load(golden("m-plan", `${M}/uat.yaml`));
    const terms = golden("m-plan", `${M}/agreed/contract-terms.md`);
    expect(termsTextMismatches(ci, u, terms)).toEqual([]);
    expect(termsTextMismatches(chg(ci), u, terms).length).toBeGreaterThan(0);
    expect(termsTextMismatches(ci.replace("schedule: 50/50\n", ""), u, terms)).toEqual(["schedule (removed upstream)"]);
    expect(termsTextMismatches(ci.replace(/\n {2}delivery_backstop: [^\n]*/, ""), u, terms).length).toBeGreaterThan(0);
    expect(termsTextMismatches(BOM + ci, u, terms)).toEqual([]);
    expect(termsTextMismatches(chg(BOM + ci), u, terms).length).toBeGreaterThan(0);
    const t2 = terms.replace("Not stated in the contract inputs or the quick scope.", "The client owns the code on final payment.");
    expect(termsTextMismatches(ci, u, t2)).toEqual(["Ownership (removed upstream)"]);
  });
  it("NC-L: R3-1: Larkspur's UAT line, price and test mix, against the line contract-terms.md quotes", () => {
    const v = runView("plan");
    const lci = v.priorRead("opchain-work/plans/larkspur-ceramics/contract-inputs.md");
    const u = yaml.load(v.read(`${L}/uat.yaml`));
    const terms = v.read(`${L}/agreed/contract-terms.md`);
    expect(termsTextMismatches(lci, u, terms)).toEqual([]);
    expect(termsTextMismatches(lci.replace("price: 2250.00 }", "price: 2400.00 }"), u, terms)).toEqual(["uat.price"]);
    expect(termsTextMismatches(lci.replace('bookkeeper: WP-5"', 'bookkeeper: WP-4, WP-5"'), u, terms)).toEqual(["uat.test_mix"]);
    expect(termsTextMismatches(lci.replace(/^uat: [^\n]*\n/m, ""), u, terms)).toEqual(["uat (removed upstream)"]);
  });
  const on = (w) => appliesOnTheDate({ wording: w });
  for (const [id, w, want] of [
    ["BS-on", "The delivery half falls due on the backstop date.", true], ["BS-after", "The delivery half falls due after the backstop date.", false],
    ["BS-neg", "The delivery half does not apply on the backstop date itself.", false], ["BS-never", "The delivery half never falls due on the backstop date; it falls due the day after.", false],
    ["BS-incid", "The readiness notice counts from the same day it is sent.", false], ["BS-incl", "It becomes payable from and including the backstop date.", true],
    ["BS-neg2", "It doesn't fall due on the backstop date.", false], ["BS-later", "It falls due later than, never on, the backstop date.", false],
  ]) it(`${id}: R3-2: "${w}" ${want ? "applies" : "does not apply"} on the date`, () => expect(on(w)).toBe(want));
  const df = (t) => dataFindings(t, {});
  for (const [id, t, want] of [
    ["TB-orders", "| Orders | Total | Status |\n|---|---|---|\n| 58213 | 214.50 | paid |\n| 58214 | 88.00 | open |", true],
    ["TB-accounts", "| Accounts | Balance | Due |\n|---|---|---|\n| 99120345 | 1,045.00 | 2026-12-01 |", true],
    ["TB-client", "| Client | Total | Paid |\n|---|---|---|\n| Ridgeway Cafe | 214.50 | yes |\n| Fernhill Deli | 88.00 | no |", true],
    ["TB-store", "| Store | Contact | Orders |\n|---|---|---|\n| Ridgeway Cafe | buyer@ridgeway.example | 4 |", true],
    ["TB-counts", "| Orders | Passed | Failed |\n|---|---|---|\n| 40 | 38 | 2 |\n| 42 | 42 | 0 |\n| 39 | 39 | 0 |\n| 41 | 41 | 0 |\n| 40 | 40 | 0 |", false],
    ["TB-testcard", "Pay with the provider's test card 4242 4242 4242 4242 in test mode.", false],
    ["TB-sandbox-inv", "Invoice 100001 in the sandbox was created by SC-06 and can be deleted.", false],
  ]) it(`${id}: R3-3 and R3-4: ${want ? "caught" : "passes"}: ${t.split("\n")[0]}`, () => expect(df(t).length > 0).toBe(want));
  it("TB-client-own: the client's own name under a Client column is not a record value", () => expect(dataFindings("| Client | Sessions |\n|---|---|\n| Larkspur Ceramics | 3 |", { client: "Larkspur Ceramics" })).toEqual([]));
  const edges = () => readFileSync(join(ROOT, "skills-work", "ow-uat", "skill.edges.yaml"), "utf8");
  const hd = (fn) => handoffFieldDrift(fn(edges()));
  it("HP-0: CONTROL: the real edges", () => expect(hd((t) => t)).toEqual([]));
  it("HP-fix, HP-dated, HP-pointers, HP-verb: each drift is caught", () => {
    expect(hd((t) => t.replace(/( {4}verb: \/ow-handoff-fix\n {4}say: [^\n]*\n {4}files: )\[uat\/<client>\/punch-list\.md\]/, "$1[]")).length).toBeGreaterThan(0);
    expect(hd((t) => t.replace(/( {4}verb: \/ow-handoff-start[\s\S]*?uat\/<client>\/uat\.yaml, fields: \[the governing acceptance or delivery definition), dated\]/, "$1]")).length).toBeGreaterThan(0);
    expect(hd((t) => t.replace("fields: [role, steps, expected result, data pointers]", "fields: [role, steps, expected result]")).length).toBeGreaterThan(0);
    expect(hd((t) => t.replace("verb: /ow-handoff-start", "verb: /ow-handoff-begin")).length).toBeGreaterThan(0);
  });
  const owTools = (args) => { const r = spawnSync(join(ROOT, "plugins", "ow-tools", "bin", "ow-tools"), args, { encoding: "utf8" }); let j = null; try { j = JSON.parse(r.stdout); } catch { /* not JSON */ } return { status: r.status, j }; };
  it("OT-1 to OT-8: ow-tools 1.2.0's calendar under 1.1.x's CLI", () => {
    const d = (from, flag, n, ...rest) => owTools(["calc", "date", "--from", from, flag, String(n), ...rest, "--json"]);
    let r = d("2026-11-20", "--business-days", 10, "--calendar", "us-federal"); expect([r.status, r.j?.date]).toEqual([0, "2026-12-07"]);
    r = d("2099-12-30", "--business-days", 2, "--calendar", "us-federal"); expect([r.status, r.j?.reason]).toEqual([4, "calendar-out-of-range"]);
    expect(d("2026-11-20", "--days", 10, "--calendar", "us-federal").status).toBe(2);
    r = d("2026-11-20", "--days", 10); expect([r.status, r.j?.calendar, r.j?.date]).toEqual([0, "every day", "2026-11-30"]);
    r = owTools(["version", "--json"]); expect(r.j?.capabilities?.calc?.calendars).toEqual(["us-federal"]);
    expect(d("2026-11-20", "--business-days", 10, "--calendar", "US-Federal").status).toBe(2);
    r = d("2026-11-20", "--business-days", 10, "--holidays", "2026-11-26"); expect([r.status, r.j?.date, r.j?.calendar]).toEqual([0, "2026-12-07", "Mon-Fri"]);
    expect(d("2021-12-30", "--business-days", 1, "--calendar", "us-federal").status).toBe(4);
  });
});

describe("OW-04 R3: the Evaluator's round-3 run-level cases, now goldens (zz3)", () => {
  const MS = `${M}/`;
  const packM = Object.fromEntries([`${M}/pack.yaml`, `${M}/uat-pack-shop-manager.md`].map((f) => [f, add(golden("m-pack", f))]));
  const packL = Object.fromEntries([`${L}/pack.yaml`, `${L}/uat-pack-order-coordinator.md`].map((f) => [f, add(golden("pack", f))]));
  for (const c of ["pack-terms-nocode-price", "pack-terms-nocode-testmix", "pack-terms-nocode-schedule-removed", "backstop-negated"]) control(`ZZ3-${c}`, `CONTROL: the ${c} golden refuses as it should`, c, {});
  plant("ZZ3-1", "R3-1: no code, the UAT price changed, the pack written anyway", "pack-terms-nocode-price", packL, "basis", /basis mismatch/);
  plant("ZZ3-2", "R3-1: no code, the test mix changed, the pack written anyway", "pack-terms-nocode-testmix", packL, "basis", /basis mismatch/);
  plant("ZZ3-3", "R3-1: no code, the schedule removed upstream, the pack written anyway", "pack-terms-nocode-schedule-removed", packM, "basis", /basis mismatch/);
  plant("ZZ3-4", "R3-2: a negated clause sentence, backstop.md written on the date", "backstop-negated", { [`${MS}backstop.md`]: add(golden("backstop-clause-on-date", `${M}/backstop.md`)) }, "refused");
});

describe("OW-04 R3: the Evaluator's untuned round-3 set through the file pipeline (h/fresh3.mjs, h/sentences3.mjs)", () => {
  const R2 = `${L}/signoff-request-2.md`, MR = `${M}/signoff-request-1.md`;
  const reqStart = (s) => ({ [R2]: rep("## The build tested\n", `## The build tested\n${s} `) });
  const reqRecords = (s) => ({ [R2]: rep("## Records created during testing\n", `## Records created during testing\n${s}\n\n`) });
  const uat05 = (s) => ({ [`${L}/defects/UAT-05.md`]: rep("The fix is at no charge.\n", `The fix is at no charge. ${s}\n`) });
  const punch = (s) => ({ [`${L}/punch-list.md`]: rep("Each is fixed after handoff at no charge.\n", `Each is fixed after handoff at no charge. ${s}\n`) });
  const packLine = (s) => ({
    [`${L}/uat-pack-order-coordinator.md`]: rep("write it in the results template instead of your name.\n", `write it in the results template instead of your name. ${s}\n`),
    [`${L}/export/uat-pack-order-coordinator.html`]: rep("write it in the results template instead of your name.</p>", `write it in the results template instead of your name. ${s.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`),
  });
  const packBlock = (s) => ({ [`${L}/uat-pack-order-coordinator.md`]: rep("\n## Reporting a problem\n", `\n${s}\n\n## Reporting a problem\n`) });
  const sc06 = (s) => ({ [`${L}/scenarios/SC-06.md`]: rep("fields: lines, quantities.\n", `fields: lines, quantities.\n\n${s}\n`) });
  const run1 = (s) => ({ [`${L}/runs/RUN-01.md`]: rep("- a password in the note of SC-07: not copied; logged in secrets-seen.log", `- a password in the note of SC-07: not copied; logged in secrets-seen.log\n- ${s}`) });
  const mStart = (s) => ({ [MR]: rep("## The build tested\n", `## The build tested\n${s} `) });
  const mEnd = (s) => ({ [MR]: rep("\n\n## Every acceptance check", `\n\n${s}\n\n## Every acceptance check`) });
  for (const [id, s] of Object.entries(S.EV3_OURS)) { plant(`${id}@start`, s, "signoff-request-2", reqStart(s), "internal_numbers"); plant(`${id}@reason`, s, "defect-fixed", uat05(s), "internal_numbers"); }
  for (const [id, s] of Object.entries(S.EV3_LEGIT)) { control(`${id}@start`, s, "signoff-request-2", reqStart(s)); control(`${id}@punch`, s, "signoff-signed", punch(s)); }
  for (const [id, [w, s]] of Object.entries(S.EV3_FP_PLANT)) {
    if (w === "m") { plant(`${id}@start`, s, "m-signoff-request", mStart(s), "false_pass"); plant(`${id}@end`, s, "m-signoff-request", mEnd(s), "false_pass"); }
    else plant(`${id}@reason`, s, "defect-fixed", uat05(s), "false_pass");
  }
  for (const [id, [w, s]] of Object.entries(S.EV3_FP_CONTROL)) {
    if (w === "m") { control(`${id}@start`, s, "m-signoff-request", mStart(s)); control(`${id}@end`, s, "m-signoff-request", mEnd(s)); }
    else control(`${id}@reason`, s, "defect-fixed", uat05(s));
  }
  for (const [id, s] of Object.entries(S.EV3_CRED_PLANT)) { plant(`${id}@pack`, s, "pack", packLine(s), "credentials"); plant(`${id}@run`, s, "run-session-1", run1(s), "credentials"); }
  for (const [id, s] of Object.entries(S.EV3_CRED_CONTROL)) { control(`${id}@pack`, s, "pack", packLine(s)); control(`${id}@run`, s, "run-session-1", run1(s)); }
  for (const [id, s] of Object.entries(S.EV3_TABLE_PLANT)) { plant(`${id}@scenario`, s.split("\n")[0], "plan", sc06(s), "data"); plant(`${id}@pack`, s.split("\n")[0], "pack", packBlock(s), "data"); plant(`${id}@request`, s.split("\n")[0], "signoff-request-2", reqRecords(s), "data"); }
  for (const [id, s] of Object.entries(S.EV3_TABLE_CONTROL)) { control(`${id}@scenario`, s.split("\n")[0], "plan", sc06(s)); control(`${id}@pack`, s.split("\n")[0], "pack", packBlock(s)); control(`${id}@request`, s.split("\n")[0], "signoff-request-2", reqRecords(s)); }
  for (const [id, s] of Object.entries(S.EV3_PROSE_PLANT)) { plant(`${id}@scenario`, s, "plan", sc06(s), "data"); plant(`${id}@request`, s, "signoff-request-2", reqRecords(s), "data"); }
  for (const [id, s] of Object.entries(S.EV3_PROSE_CONTROL)) { control(`${id}@scenario`, s, "plan", sc06(s)); control(`${id}@request`, s, "signoff-request-2", reqRecords(s)); control(`${id}@pack`, s, "pack", packBlock(s)); }
});

describe("OW-04 follow-up: the held-out set written before any follow-up rule changed", () => {
  const legitCtx = { user: "Robin", legit: new Set([120000, 698000, 349000, 400000]) };
  const people = { user: "Robin", people: [], client: "Larkspur Ceramics" };
  for (const s of S.HELDOUT4_OURS) it(`our side caught: ${s}`, () => expect(internalFindings(s, { user: "Robin" }).length).toBeGreaterThan(0));
  for (const s of S.HELDOUT4_LEGIT) it(`legitimate passes every meaning rule: ${s}`, () => {
    expect(internalFindings(s, legitCtx)).toEqual([]);
    expect(falsePassFindings(s, S.HELDOUT4_FP_CONTEXT)).toEqual([]);
    expect(dataFindings(s, {})).toEqual([]);
    expect(peopleFindings(s, people)).toEqual([]);
    expect(credentialFindings(s)).toEqual([]);
  });
  for (const s of S.HELDOUT4_FALSE_PASS.caught) it(`who tested caught: ${s}`, () => expect(falsePassFindings(s, S.HELDOUT4_FP_CONTEXT).length).toBeGreaterThan(0));
  for (const s of S.HELDOUT4_FALSE_PASS.legit) it(`a negation, future or invitation passes: ${s}`, () => expect(falsePassFindings(s, S.HELDOUT4_FP_CONTEXT)).toEqual([]));
  for (const s of S.HELDOUT4_CREDENTIALS.caught) it(`credential caught: ${s}`, () => expect(credentialFindings(s).length).toBeGreaterThan(0));
  for (const s of S.HELDOUT4_CREDENTIALS.legit) it(`credential CONTROL: ${s}`, () => expect(credentialFindings(s)).toEqual([]));
});
