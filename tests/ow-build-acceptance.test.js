// ow-build acceptance tests (docs/plans/2026-10-08-ow-build-design.md §10 and §12.7).
// ow-build is a text-only skill, so a model has to run it. These tests prove
// the mechanical half: every §10 case except "Real use" (Sprint 6) and every
// §12.7 case has an invented golden run that passes
// scripts/ow-build-acceptance.mjs; each case has a planted failure the checker
// catches, including paraphrases matched by meaning; each check fails on its
// own when a file is malformed (C11); and the skill text keeps the rules the
// checker cannot see. To check a real run:
// node scripts/ow-build-acceptance.mjs --prepare <case> <dir>.
import { afterAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import * as yaml from "js-yaml";
import { FIXTURES, checkBlocks, expectedRoute, htmlWords, listCases, loadKey, prepare, quoteMilestones, runCase, sprintMap, validateEmailHtml, words } from "../scripts/ow-build-acceptance.mjs";
import { checkEdges, checkFamily, checkProtocolCopies } from "../scripts/check-skill-contracts.mjs";
import { loadCatalogs } from "../scripts/lib/catalogs.mjs";
import { matter } from "../scripts/lib/frontmatter.mjs";

const ROOT = join(import.meta.dirname, "..");
const SKILL = join(ROOT, "skills-work", "ow-build");
const CLI = join(ROOT, "scripts", "ow-build-acceptance.mjs");
const scratch = [];
afterAll(() => scratch.forEach((d) => rmSync(d, { recursive: true, force: true })));
const temp = (p) => { const d = mkdtempSync(join(tmpdir(), p)); scratch.push(d); return d; };

const CASES = [
  "change-declined", "change-fix-too-big", "change-in-scope", "change-not-a-defect", "change-priced", "change-sent", "change-signed", "change-uat-extension", "change-uat-repriced", "change-uat-too-big", "change-uat-unpriced", "change-unpriced",
  "demo-record", "demo-script", "invoice-acceptance", "invoice-booking", "invoice-booking-small", "invoice-co", "invoice-delivery-backstop",
  "invoice-delivery-handoff", "invoice-delivery-refused", "invoice-demo", "invoice-documentation", "invoice-documentation-refused",
  "margin-internal", "ready-failing", "ready-passing",
  "route-fix", "route-fix-not-a-defect", "route-folder", "route-folder-demo", "route-folder-ready", "route-folder-run", "route-folder-signed", "route-folder-signoff",
  "route-signed-plan", "route-trigger-delivered", "route-trigger-signoff", "route-uat", "route-uat-repriced", "route-uat-too-big",
  "run-escalated", "run-m1-done", "run-m1-next", "run-no-builder", "signature-gate",
  "start", "start-nine-checks", "start-no-build", "start-quick", "start-resume", "start-resume-spec", "start-uncovered", "update",
];
const B = "opchain-work/builds/larkspur-ceramics";
const MB = "opchain-work/builds/mossgate-books";
const FB = "opchain-work/builds/fernhill-florists";

/** The case's run as a real folder (starting state, the builder's files, the golden output), edited by `edits` (root-relative path -> fn). */
function mutated(caseName, edits = {}) {
  const dir = temp("ow-build-run-");
  prepare(caseName, dir);
  let home = caseName;
  while (loadKey(join(FIXTURES, home)).run) home = loadKey(join(FIXTURES, home)).run;
  for (const part of ["builder", "expected"]) if (existsSync(join(FIXTURES, home, part))) cpSync(join(FIXTURES, home, part), dir, { recursive: true });
  for (const [rel, edit] of Object.entries(edits)) {
    const path = join(dir, rel);
    const before = existsSync(path) ? readFileSync(path, "utf8") : null;
    const after = edit(before);
    if (after === before) throw new Error(`mutation of ${rel} changed nothing`);
    mkdirSync(dirname(path), { recursive: true });
    if (after === null) rmSync(path, { force: true });
    else writeFileSync(path, after);
  }
  return dir;
}
const failures = (caseName, runDir) => Object.fromEntries(runCase(caseName, runDir).filter((r) => r.problems.length).map((r) => [r.check, r.problems.join("\n")]));
/** Edit an email and its text twin the same way. */
const both = (rel, fn) => ({ [`${rel}.html`]: fn, [`${rel}.txt`]: fn });

describe("golden runs", () => {
  it("has a case for every §10 test except Real use (Sprint 6), and every §12.7 test", () => {
    expect(listCases()).toEqual(CASES);
    const sections = listCases().map((c) => loadKey(join(FIXTURES, c)).section).join("\n");
    for (const s of [
      // §10
      "Weekly update", "Margin stays internal", "In scope vs change (already in scope)", "In scope vs change (a real change, priced)", "In scope vs change (no price-book unit stops and asks)",
      "Signature gate (an email reply is not a signature)", "Signature gate (a signed amendment recorded)",
      "Payment triggers (40/40/20, booking)", "Payment triggers (40/40/20, working demo)", "Payment triggers (40/40/20, the ow-uat sign-off)", "Payment triggers (50/50, booking)",
      "Payment triggers (50/50, delivery under the backstop)", "Payment triggers (50/50, delivery at the handoff)", "Payment triggers (50/50, the delivery half invoiced once)", "Payment triggers (a signed change order)", "Payment triggers (documentation & training delivered, B4)", "Payment triggers (documentation & training invoiced once, B4)",
      "Ready for UAT (one failing check)", "Ready for UAT (every check passing)",
      "Requests from UAT and handoff (one extension change order)", "Requests from UAT and handoff (too big for a change order)",
      "Milestone demo (script)", "Milestone demo (record, the working-demo trigger)",
      // §12.7
      "Builder integration (opchain mode, a signed Build Plan)", "Builder integration (nine checks reach spec/06-testing.md)", "Builder integration (an uncovered check stops -start)",
      "Builder integration (no build entry)", "Builder integration (a quick-quote job)",
      "Running a milestone (one sprint per call, sprints left)", "Running a milestone (the last sprint passes; NEXT is the demo)", "Running a milestone (an escalating sprint stops the milestone)",
      // C4
      "Inbound route (ow-build-plan's signed NEXT)", "Inbound route (a UAT-nn file)", "Inbound route (a FIX-nn file)", "Inbound route (a build folder, by files first)",
      // Sprint 2 round 1 and the owner decisions of 2026-10-16
      "Requests from UAT and handoff (Not a defect)", "Requests from UAT and handoff (a UAT request too big for a change order)",
      "Running a milestone (no builder: the user's report)", "Builder integration (resume after the builder planned in another session)",
      "Inbound route (a FIX-nn classed Not a defect)", "Inbound route (a UAT-nn classed Change)",
      "Inbound route (a build folder: a sprint to run)", "Inbound route (a build folder: a milestone ready for its demo)", "Inbound route (a build folder: an amendment out, now signed)",
      "Inbound route (a build folder: every milestone demoed)", "Inbound route (a build folder after the UAT sign-off)",
      "Inbound route (ow-uat's sign-off file)", "Inbound route (ow-documentation's delivered file)",
      // Sprint 2 round 2 (D2, D3, D5)
      "Requests from UAT and handoff (a UAT request with no unit stops and asks)", "Requests from UAT and handoff (an unpriced UAT request priced later, once)", "Inbound route (a UAT-nn whose row is unpriced)",
      "Builder integration (resume after the ledger, before spec/)", "Signature gate (a change order recorded as sent)", "Signature gate (a change order declined)",
    ]) expect(sections).toContain(s);
  });

  for (const c of CASES) {
    it(`${c}: every check passes on the hand-written golden run`, () => {
      expect(failures(c)).toEqual({});
    });
  }

  it("a golden run laid out as a real folder still passes (the --prepare path)", () => {
    for (const c of ["start", "update", "change-priced", "invoice-delivery-backstop", "start-nine-checks"]) expect(failures(c, mutated(c)), c).toEqual({});
  });

  it("the CLI checks every golden run and exits 0", () => {
    const r = spawnSync(process.execPath, [CLI], { encoding: "utf8" });
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(r.stdout.match(/golden run\): \d+\/\d+ checks pass/g)).toHaveLength(CASES.length);
  });

  it("--prepare lays out the starting state without the case's own output or the builder's in-session files", () => {
    const dir = temp("ow-build-prep-");
    prepare("run-m1-done", dir);
    expect(existsSync(join(dir, B, "build.yaml"))).toBe(true);
    expect(readFileSync(join(dir, B, "build.yaml"), "utf8")).not.toMatch(/n: 2\n/);
    expect(existsSync(join(dir, "larkspur-repo", "sprints", "sprint-1", "eval-round-2.md"))).toBe(true);
    expect(existsSync(join(dir, "larkspur-repo", "sprints", "sprint-2", "eval-round-1.md"))).toBe(false);
    expect(existsSync(join(dir, "session", "git-log.txt"))).toBe(true);
    expect(() => prepare("run-m1-done", dir)).toThrow(/already exists/);
  });
});

describe("§12.7 builder integration: planted failures", () => {
  it("nine checks: one check missing from spec/06-testing.md, one copied with a changed case count", () => {
    const run = mutated("start-nine-checks", {
      "fernhill-repo/spec/06-testing.md": (t) => t.replace(/### AC-3\.3\n(?:- [^\n]+\n)+\n/, "").replace("- cases: 5\n", "- cases: 4\n"),
    });
    const out = failures("start-nine-checks", run).spec;
    expect(out).toMatch(/spec\/06-testing\.md: AC-3\.3 is missing \(every acceptance check reaches the builder\)/);
    expect(out).toMatch(/AC-1\.1 does not carry "- cases: 5" verbatim/);
  });

  it("an uncovered check recorded as mapped anyway, or a map with no stop", () => {
    const run = mutated("start-uncovered", {
      [`${FB}/build.yaml`]: (t) => t.replace(/map_check: "stopped:[^\n]*"/, "map_check: OK").replace("    checks: [AC-1.1, AC-1.2, AC-1.3, AC-2.1, AC-2.2]\n", "    checks: [AC-1.1, AC-1.2, AC-1.3, AC-2.1, AC-2.2]\n    sprints: [1, 2]\n"),
      "opchain-work/STATUS.md": (t) => t.replace(/next: ow-build on builds\/fernhill-florists\/ \| awaiting: none\n$/, "next: ow-build /ow-build-run builds/fernhill-florists/ | awaiting: none\n"),
    });
    const out = failures("start-uncovered", run).start_stopped;
    expect(out).toMatch(/map_check is "OK"; a sprint plan that leaves AC-3\.3 uncovered stops -start/);
    expect(out).toMatch(/M1 has a sprints list; a stopped map records none/);
    expect(out).toMatch(/STATUS\.md: points at -run while the map is stopped/);
  });

  it("the map is the sprint plan's: a sprint moved to the wrong milestone fails", () => {
    const run = mutated("start", { [`${B}/build.yaml`]: (t) => t.replace("    sprints: [1, 2]", "    sprints: [1]").replace("    sprints: [3, 4]", "    sprints: [2, 3, 4]") });
    expect(failures("start", run).start).toMatch(/M1 sprints 1; the sprint plan's citations make them 1, 2/);
  });

  it("-run M1 runs only M1's sprints, one per call", () => {
    const other = mutated("run-m1-next", {
      [`${B}/build.yaml`]: (t) => t.replace("  - n: 1\n    milestone: M1\n    handed: 2026-11-11", "  - n: 3\n    milestone: M2\n    handed: 2026-11-11"),
    });
    expect(failures("run-m1-next", other).run).toMatch(/sprint 3 \(M2\) is not one of M1's sprints 1, 2/);
    const two = mutated("run-m1-next", {
      [`${B}/build.yaml`]: (t) => `${t.trimEnd()}\n  - n: 2\n    milestone: M1\n    handed: 2026-11-12\n`,
    });
    expect(failures("run-m1-next", two).run).toMatch(/2 sprint entries changed; one call runs one sprint/);
  });

  it("-run reads the newest report: a pass recorded from round 1's FAIL, or checks not in the report", () => {
    const run = mutated("run-m1-next", {
      [`${B}/build.yaml`]: (t) => t.replace("report: sprints/sprint-1/eval-round-2.md", "report: sprints/sprint-1/eval-round-1.md").replace("checks_passing: [AC-1.1, AC-1.2]", "checks_passing: [AC-1.1, AC-1.2, AC-2.1]"),
    });
    const out = failures("run-m1-next", run).run;
    expect(out).toMatch(/sprint 1 report is sprints\/sprint-1\/eval-round-1\.md; the newest is sprints\/sprint-1\/eval-round-2\.md/);
    expect(out).toMatch(/checks_passing AC-1\.1, AC-1\.2, AC-2\.1; the report marks AC-1\.1, AC-1\.2 PASS/);
  });

  it("-run points to the M1 demo only when every M1 sprint passes", () => {
    const early = mutated("run-m1-next", { "opchain-work/STATUS.md": (t) => t.replace(/next: ow-build \/ow-build-run builds\/larkspur-ceramics\/ \| awaiting: M1 sprint 2\n$/, "next: ow-build /ow-build-demo builds/larkspur-ceramics/ | awaiting: M1 sprint 2\n") });
    expect(failures("run-m1-next", early).run).toMatch(/the newest line must point at \/ow-build-run/);
    const late = mutated("run-m1-done", { "opchain-work/STATUS.md": (t) => t.replace(/next: ow-build \/ow-build-demo builds\/larkspur-ceramics\/ \| awaiting: M1 demo\n$/, "next: ow-build /ow-build-run builds/larkspur-ceramics/ | awaiting: M1 demo\n") });
    expect(failures("run-m1-done", late).run).toMatch(/the newest line must point at \/ow-build-demo \(every sprint of M1 passes: the demo\)/);
    // D10: the STATUS line names the milestone and what it waits on.
    const unnamed = mutated("run-m1-next", { "opchain-work/STATUS.md": (t) => t.replace(/awaiting: M1 sprint 2\n$/, "awaiting: none\n") });
    expect(failures("run-m1-next", unnamed).run).toMatch(/the newest line must name the milestone: "awaiting: M1 sprint 2"/);
  });

  it("an escalating sprint stops the milestone: not recorded as escalated, checks credited, the milestone moving on", () => {
    const run = mutated("run-escalated", {
      [`${B}/build.yaml`]: (t) => t.replace("result: escalated", "result: not passed yet").replace("    checks_passing: []\n    blocker: b2", "    checks_passing: [AC-2.1]\n    blocker: b2").replace("    status: stopped", "    status: in progress"),
    });
    const out = failures("run-escalated", run).run;
    expect(out).toMatch(/sprint 2 result is not passed yet; the builder's files \(sprints\/sprint-2\/eval-round-3\.md: FAIL, a blocker\) make it escalated/);
    expect(out).toMatch(/sprint 2 did not pass, so no check passes from it/);
    expect(out).toMatch(/M1 status is in progress, expected stopped/);
  });

  it("no build entry: spec/ written anyway, or a handover other than the public default", () => {
    const run = mutated("start-no-build", {
      "larkspur-repo/spec/06-testing.md": () => "---\now_artefact: ow-build/spec-06-testing\n---\n# Testing\n",
      [`${B}/build.yaml`]: (t) => t.replace("handover: give build-request.md to whoever builds it", "handover: handed to the builder"),
    });
    const out = failures("start-no-build", run).no_spec;
    expect(out).toMatch(/larkspur-repo\/spec\/06-testing\.md: no builder in this session, so -start writes no spec\//);
    expect(out).toMatch(/with no build entry it is the public default "give build-request\.md to whoever builds it"/);
  });

  it("quick-quote job: spec/ sourced from files a quick quote does not have", () => {
    const run = mutated("start-quick", {
      "mossgate-repo/spec/02-architecture.md": (t) => t.replace("- `plans/mossgate-books/build-request.md` (Systems and data)", "- `plans/mossgate-books/map/systems.md`").replace("A quick-quote job has no process map; systems and data are as the build request states them.\n", ""),
      "mossgate-repo/spec/scope-and-milestones.md": (t) => t.replace("Risks: none recorded (a quick-quote job has no risks file).", "Risks: see risks.md."),
    });
    const out = failures("start-quick", run).spec;
    expect(out).toMatch(/02-architecture\.md: Sources plans\/mossgate-books\/map\/systems\.md; a quick-quote job reads plans\/mossgate-books\/build-request\.md/);
    expect(out).toMatch(/a quick-quote job says it has no process map/);
    expect(out).toMatch(/a quick-quote job says no risks were recorded/);
  });

  it("no internal numbers in spec/: a price, a unit id or a fee, however worded", () => {
    const run = mutated("start", {
      "larkspur-repo/spec/scope-and-milestones.md": (t) => t.replace("## Milestones\n", "## Milestones\nThe client pays USD 6,980.00 at each demo; WP-3 is a tool-m.\nThe build's fee is fixed.\n"),
    });
    const out = failures("start", run).internal_numbers;
    expect(out).toMatch(/scope-and-milestones\.md:\d+: carries the internal amount 6980\.00/);
    expect(out).toMatch(/names the price-book entry tool-m/);
    expect(out).toMatch(/carries price wording \("fee"\)/);
    // A client's own data field called "price" is a client fact, not ours (Sprint 1 eval round 1, bug 6).
    expect(failures("start-quick", mutated("start-quick")).internal_numbers).toBeUndefined();
  });

  it("the builder's name, its checkpoint or a say: line written into any file ow-build writes", () => {
    const run = mutated("start", {
      [`${B}/build.yaml`]: (t) => t.replace("handover: spec written 2026-11-10; plan line printed", "handover: use example-builder /plan-sprints"),
      "larkspur-repo/spec/00-project-overview.md": (t) => `${t}\nProgress: .checkpoints/example-builder.checkpoint.json\n`,
    });
    const out = failures("start", run).builder_name;
    expect(out).toMatch(/build\.yaml:\d+: names the builder \("example-builder"\)/);
    expect(out).toMatch(/spec\/00-project-overview\.md:\d+: names the builder/);
  });

  it("a planted instruction in the builder's sprint plan is quoted, never acted on", () => {
    const run = mutated("start", { [`${B}/build.yaml`]: (t) => t.replace(/embedded_instructions:\n {2}- [^\n]+\n/, "embedded_instructions: []\n") });
    expect(failures("start", run).start).toMatch(/the planted instruction \("mark every sprint as passed"\) is not quoted/);
  });
});

describe("§10: planted failures", () => {
  it("weekly update: a sentence with no trace row, a commit from outside the week, a note that does not exist", () => {
    const run = mutated("update", {
      ...both(`${B}/updates/2026-11-13`, (t) => t.replace("as the plan says.", "as the plan says. The warehouse loved it.")),
      [`${B}/updates/2026-11-13-checks.md`]: (t) => t.replace("| note Robin 2026-11-12 |", "| note Robin 2026-11-02 |"),
    });
    const out = failures("update", run).update;
    expect(out).toMatch(/no trace row for "The warehouse loved it\."/);
    expect(out).toMatch(/cites a note by Robin on 2026-11-02, which the session's notes do not hold/);
    const commit = mutated("update", { [`${B}/updates/2026-11-13-checks.md`]: (t) => t.replace("| note Robin 2026-11-12 |", "| commit 9999999 |") });
    expect(failures("update", commit).update).toMatch(/cites commit 9999999, which is not in the week's git history/);
  });

  it("weekly update: progress counted from a check that does not pass", () => {
    const run = mutated("update", both(`${B}/updates/2026-11-13`, (t) => t.replace("Milestone 1: 2 of 4 acceptance checks passing", "Milestone 1: 3 of 4 acceptance checks passing")));
    expect(failures("update", run).update).toMatch(/says Milestone 1: 3 of 4; build\.yaml shows 2 of 4 passing/);
  });

  it("weekly update: no hours, rates or margin, however worded (meaning, not one phrase)", () => {
    for (const [plant, what] of [
      ["We put 31 hours into the order intake.", /an hour count|hours/],
      ["It took about four days of work to get right.", /effort/],
      ["Time logged this week was higher than planned.", /effort/],
      ["The first milestone ran over budget, which is on us.", /margin/],
      ["Our day rate covers this.", /a rate/],
      ["The two-page fix scored well with the evaluator.", /a tool word/],
    ]) {
      const run = mutated("update", both(`${B}/updates/2026-11-13`, (t) => t.replace("No new risks this week.", `No new risks this week. ${plant}`)));
      expect(failures("update", run).internal_numbers, plant).toMatch(what);
    }
  });

  it("margin stays internal: the overrun's figures in the client update, an unflagged overrun, a wrong burn", () => {
    const leak = mutated("margin-internal", both(`${B}/updates/2026-11-13`, (t) => t.replace("No new risks this week.", "No new risks this week. Milestone 1 is at 31.0 against its share.")));
    const out = failures("margin-internal", leak);
    expect(out.margin).toMatch(/carries the margin figure 31\.0/);
    expect(out.internal_numbers).toMatch(/carries the hour figure 31\.0/);
    const flag = mutated("margin-internal", { [`${B}/margin.md`]: (t) => t.replace("| M1 | 31.0 | 5200.00 | 5580.00 | over its share |", "| M1 | 31.0 | 5200.00 | 5580.00 | — |") });
    expect(failures("margin-internal", flag).margin).toMatch(/M1 flag "—"; burn 5580\.00 is over its share 5200\.00/);
    const burn = mutated("margin-internal", { [`${B}/margin.md`]: (t) => t.replace("| M1 | 31.0 | 5200.00 | 5580.00 |", "| M1 | 31.0 | 5200.00 | 5000.00 |") });
    expect(failures("margin-internal", burn).margin).toMatch(/M1 burn 5000\.00, expected 5580\.00/);
  });

  it("no false done, by meaning: a feature whose check does not pass called finished, live or sorted", () => {
    for (const plant of ["The confirmation view is finished.", "Invoices into QuickBooks are live.", "The code clean-up is all sorted.", "The confirmation view has landed.", "QuickBooks invoicing is up and running."]) {
      const run = mutated("update", both(`${B}/updates/2026-11-13`, (t) => t.replace("No new risks this week.", `No new risks this week. ${plant}`)));
      expect(failures("update", run).no_false_done, plant).toMatch(/but its check does not pass/);
    }
  });

  it("in scope vs change: an in-scope request charged as a change order", () => {
    const run = mutated("change-in-scope", {
      [`${B}/changes/requests.md`]: (t) => t.replace("| in scope (AC-1.2) | no charge; on the builder's list |", "| change | CO-01 (draft) |"),
      [`${B}/changes/CO-01.md`]: () => "---\nid: CO-01\nprice: 600.00\n---\n# Change order CO-01\n",
    });
    const out = failures("change-in-scope", run).change;
    expect(out).toMatch(/the request is classed "change"; it is in scope \(AC-1\.2\)/);
    expect(out).toMatch(/an in-scope request has no change order and no charge/);
  });

  it("in scope vs change: a priced change with a unit price off the book, an estimate, no error check", () => {
    const run = mutated("change-priced", {
      [`${B}/changes/CO-01.md`]: (t) => t.replace("| C2 | report | 1 | 600.00 | none | 600.00 | the stock column on the confirmation view |", "| C2 | none | 1 | none | none | 700.00 | estimated from similar work |\n| C3 | report | 1 | 650.00 | none | 650.00 | a second view |")
        .replace("price: 2600.00", "price: 3350.00").replace("USD 2,600.00, invoiced", "USD 3,350.00, invoiced").replace("- kind: error", "- kind: normal"),
    });
    const out = failures("change-priced", run).change;
    expect(out).toMatch(/C2 has no unit and no recorded manual price \("priced by <user>, <date>, reason: …"\); nothing is estimated/);
    expect(out).toMatch(/C3 unit price 650\.00 is not the price book's 600 for report/);
  });

  it("in scope vs change: no unit, yet a change order written (nothing is estimated)", () => {
    const run = mutated("change-unpriced", {
      [`${B}/changes/requests.md`]: (t) => t.replace("unpriced: no price-book unit; asked Robin 2026-12-01", "CO-02 (draft)"),
      [`${B}/changes/CO-02.md`]: () => "---\nid: CO-02\nkind: change\nprice: 400.00\n---\n# Change order CO-02\n",
    });
    const out = failures("change-unpriced", run).change;
    expect(out).toMatch(/with no unit it stops and asks: "unpriced: no price-book unit; asked Robin <date>"/);
    expect(out).toMatch(/nothing is priced or written while a unit is missing/);
  });

  it("signature gate: an email reply recorded as signed, the work started, the checks in spec/, the ledger and an invoice", () => {
    const run = mutated("signature-gate", {
      [`${B}/changes/CO-01.md`]: (t) => t.replace("status: amendment out", "status: signed").replace("work: not started", "work: started 2026-12-02"),
      "larkspur-repo/spec/06-testing.md": (t) => `${t}\n## Change order CO-01 (signed 2026-12-02)\n\n### AC-CO-01.1\n- when: x\n`,
      [`${B}/invoices/INV-request-CO-01.md`]: () => "---\ntrigger: CO-01\n---\n",
    });
    const out = failures("signature-gate", run).signature_gate;
    expect(out).toMatch(/status is signed; an agreement in principle \(an email reply\) moves it to amendment out, never to signed/);
    expect(out).toMatch(/work is "started 2026-12-02"; until the amendment is signed the work is not started/);
    expect(out).toMatch(/carries CO-01's checks before its amendment is signed/);
    expect(out).toMatch(/an invoice for an unsigned change order/);
  });

  it("signature gate: the update reports unsigned work as started, by meaning", () => {
    for (const plant of ["the builder has started on it", "work is under way", "we are building the stock column", "the stock column is in progress", "we are making headway on it", "a first cut of the stock column exists"]) {
      const run = mutated("signature-gate", both(`${B}/updates/2026-12-04`, (t) => t.replace("amendment out for signing; work not started.", `amendment out for signing; work not started, but ${plant}.`)));
      expect(failures("signature-gate", run).signature_gate, plant).toMatch(/"Changes" reports (?:CO-01|a change) as started/);
    }
    const elsewhere = mutated("signature-gate", both(`${B}/updates/2026-12-04`, (t) => t.replace("The order confirmation view continues,", "We have begun the stock column on the order confirmation view, and it continues,")));
    expect(failures("signature-gate", elsewhere).signature_gate).toMatch(/"Next week" reports CO-01 as started \("begun"\)/);
    const unlisted = mutated("signature-gate", both(`${B}/updates/2026-12-04`, (t) => t.replace("CO-01, stock on hand on the confirmation view: agreed in principle on 2 December 2026, amendment out for signing; work not started.", "None yet.")));
    expect(failures("signature-gate", unlisted).signature_gate).toMatch(/Changes does not list CO-01/);
  });

  it("signature gate: the printed change-order NEXT is the business's say: line, exactly", () => {
    const run = mutated("signature-gate", { [`${B}/changes/change-inputs-CO-01.md`]: (t) => t.replace("NEXT: use llc-ops to draft the amendment from", "NEXT: handoffs.yaml `change_order`: use llc-ops to draft the amendment from") });
    expect(failures("signature-gate", run).signature_gate).toMatch(/it must be exactly the change_order say: line/);
  });

  it("a signed amendment: recorded before the agreement, or the spec's earlier text rewritten", () => {
    const early = mutated("change-signed", {}); // golden: OK
    expect(failures("change-signed", early)).toEqual({});
    const rewrite = mutated("change-signed", {
      "larkspur-repo/spec/06-testing.md": (t) => t.replace("- cases: 10\n", "- cases: 9\n"),
      [`${B}/changes/CO-01.md`]: (t) => t.replace("signature not verified by this skill\n", "signature verified\n"),
    });
    const out = failures("change-signed", rewrite).signed;
    expect(out).toMatch(/06-testing\.md: rewritten by -change --signed; its only writer is -start/);
    expect(failures("change-signed", rewrite).writes).toMatch(/only \/ow-build-start may write it \(one writer per file\)/);
    expect(out).toMatch(/signature_note must read "signed amendment received 2026-12-07, recorded by Robin; signature not verified by this skill"/);
  });

  it("payment triggers (40/40/20): the acceptance payment from ready-for-uat, a wrong amount, an invented tool output", () => {
    const ready = mutated("ready-passing", {
      [`${B}/invoices/INV-request-acceptance.md`]: () => "---\ntrigger: acceptance\namount: 3490.00\n---\nready-for-uat.md\n",
    });
    expect(failures("ready-passing", ready).ready).toMatch(/INV-request-acceptance\.md: -ready marks no payment trigger and writes no acceptance record/);
    const amount = mutated("invoice-demo", {
      [`${B}/invoices/INV-request-working-demo.md`]: (t) => t.replace("amount: 6980.00", "amount: 7000.00").replace('"amounts":["6980.00","6980.00","3490.00"]', '"amounts":["7000.00","7000.00","3450.00"]'),
    });
    const out = failures("invoice-demo", amount).invoice;
    expect(out).toMatch(/amount 7000\.00; the ledger \(or the change order\) says 6980\.00/);
    expect(out).toMatch(/the recorded output is not what "ow-tools calc split --total 17450\.00 --schedule 40\/40\/20" prints/);
  });

  it("payment triggers: the working demo invoiced although the user did not confirm it", () => {
    const run = mutated("invoice-demo", { [`${B}/demos/M1-record.md`]: (t) => t.replace('trigger_confirmed: "working demo confirmed by Robin 2026-11-25: the client saw it working"', "trigger_confirmed: not confirmed") });
    expect(failures("invoice-demo", run).invoice).toMatch(/invoice requests written: working-demo; the triggers met and not yet requested are none/);
  });

  it("payment triggers (50/50): the delivery half requested before handoff or backstop, and a second delivery half", () => {
    const early = mutated("invoice-booking-small", { [`${MB}/invoices/INV-request-delivery.md`]: () => "---\ntrigger: delivery\namount: 1050.00\n---\n" });
    expect(failures("invoice-booking-small", early).invoice).toMatch(/invoice requests written: booking, delivery; the triggers met and not yet requested are booking/);
    const twice = mutated("invoice-delivery-refused", { [`${MB}/invoices/INV-request-delivery-2.md`]: () => "---\ntrigger: delivery\n---\n" });
    expect(failures("invoice-delivery-refused", twice).invoice_refused).toMatch(/INV-request-delivery-2\.md was written; the delivery half was already requested under the backstop/);
  });

  it("payment triggers: the ledger written by -demo, or a payment's amount changed in the ledger", () => {
    const demo = mutated("demo-record", { [`${B}/ledger.md`]: (t) => t.replace("state: not met }\n  - { trigger: acceptance", "state: due }\n  - { trigger: acceptance") });
    expect(failures("demo-record", demo).demo_record).toMatch(/ledger\.md: -demo writes no ledger row and no invoice request/);
    const amount = mutated("invoice-acceptance", { [`${B}/ledger.md`]: (t) => t.replace("trigger: acceptance, share: 20, amount: 3490.00", "trigger: acceptance, share: 20, amount: 3500.00") });
    expect(failures("invoice-acceptance", amount).invoice).toMatch(/acceptance's amount changed; it comes from the quote/);
  });

  it("B4: a declined documentation line invoiced anyway, or invoiced twice; a ledger that copies a declined line", () => {
    const declined = mutated("invoice-documentation", { "opchain-work/plans/larkspur-ceramics/contract-inputs.md": (t) => t.replace("documentation_sku: bought", "documentation_sku: declined") });
    expect(failures("invoice-documentation", declined).invoice).toMatch(/invoice requests written: documentation; the triggers met and not yet requested are none/);
    const undelivered = mutated("invoice-documentation", { "opchain-work/docs/larkspur-ceramics/delivered.md": () => null });
    expect(failures("invoice-documentation", undelivered).invoice).toMatch(/the triggers met and not yet requested are none/);
    const twice = mutated("invoice-documentation-refused", { [`${B}/invoices/INV-request-documentation-2.md`]: () => "---\ntrigger: documentation\namount: 4000.00\n---\n" });
    expect(failures("invoice-documentation-refused", twice).invoice_refused).toMatch(/INV-request-documentation-2\.md was written; the documentation line was already requested/);
    const copied = mutated("start-quick", { [`${MB}/ledger.md`]: (t) => t.replace("documentation: none", "documentation: { sku: bought, amount: 2000.00, state: not met }") });
    expect(failures("start-quick", copied).ledger).toMatch(/the documentation line was declined or not recorded, so documentation is "none"/);
    const missing = mutated("start", { [`${B}/ledger.md`]: (t) => t.replace("documentation: { sku: bought, amount: 4000.00, state: not met }\n", "") });
    expect(failures("start", missing).ledger).toMatch(/contract-inputs\.md says documentation_sku: bought, so the ledger carries the documentation line/);
  });

  it("ledger arithmetic: payments that do not add up, a tool output that is not real, the working demo picked by the skill", () => {
    const run = mutated("start", {
      [`${B}/ledger.md`]: (t) => t.replace("trigger: acceptance, share: 20, amount: 3490.00", "trigger: acceptance, share: 20, amount: 3400.00")
        .replace("output: '{\"total\":\"17450.00\",\"schedule\":\"40/40/20\",\"amounts\":[\"6980.00\",\"6980.00\",\"3490.00\"]}'", "output: 'all good'")
        .replace("working_demo_source: user-stated 2026-11-10", "working_demo_source: assumed"),
    });
    const out = failures("start", run).ledger;
    expect(out).toMatch(/the payments add up to 17360\.00, not the fixed price 17450\.00/);
    expect(out).toMatch(/the recorded output is not what "ow-tools calc split/);
    expect(out).toMatch(/working_demo_source must be "user-stated <date>" \(the skill never picks one\)/);
  });

  it("ready for UAT: ready with a failing check, a failing build handed to acceptance testing, an unsigned change order's checks", () => {
    const run = mutated("ready-failing", {
      [`${B}/ready-for-uat.md`]: (t) => t.replace("ready: no", "ready: yes").replace("NEXT: the build destination's fix line, for AC-5.2 with this file (printed in the session; the builder's line is not written here)", 'NEXT: say "use ow-uat on builds/larkspur-ceramics/ready-for-uat.md"'),
    });
    const out = failures("ready-failing", run).ready;
    expect(out).toMatch(/ready is yes; 1 check\(s\) do not pass/);
    expect(out).toMatch(/a failing check goes back to the builder; NEXT never hands a failing build to acceptance testing/);
    const pass = mutated("ready-failing", { [`${B}/ready-for-uat.md`]: (t) => t.replace("| AC-5.2 | fail |", "| AC-5.2 | pass |") });
    expect(failures("ready-failing", pass).ready).toMatch(/AC-5\.2 is pass; the builder's report passes it and the confirmation pass says not pass/);
  });

  it("requests from UAT: an extension with another unit, new checks, a post-acceptance mark, a UAT-nn left out", () => {
    const run = mutated("change-uat-extension", {
      [`${B}/changes/CO-02.md`]: (t) => t.replace("adds_checks: []", "adds_checks: [AC-CO-02.1]").replace("requests: [uat/larkspur-ceramics/defects/UAT-03.md, uat/larkspur-ceramics/defects/UAT-04.md, uat/larkspur-ceramics/defects/UAT-05.md]", "requests: [uat/larkspur-ceramics/defects/UAT-03.md, uat/larkspur-ceramics/defects/UAT-04.md]\npost_acceptance: false")
        .replace("| C1 | uat.extension | 1 | 175.00 | none | 175.00 |", "| C1 | uat.extension | 1 | 175.00 | none | 175.00 | one extra session |\n| C2 | report | 1 | 600.00 | none | 600.00 |").replace("price: 175.00", "price: 775.00").replace("USD 175.00, invoiced", "USD 775.00, invoiced"),
    });
    const out = failures("change-uat-extension", run).change;
    expect(out).toMatch(/an extension change order adds no acceptance checks/);
    expect(out).toMatch(/an extension is priced from uat\.extension only, no other unit/);
    expect(out).toMatch(/requests does not cite uat\/larkspur-ceramics\/defects\/UAT-05\.md/);
    expect(out).toMatch(/carries a post-acceptance mark; acceptance testing decides that/);
  });

  it("requests from UAT: one event split into two change orders", () => {
    const run = mutated("change-uat-extension", { [`${B}/changes/CO-03.md`]: () => "---\nid: CO-03\nkind: extension\nprice: 175.00\n---\n# CO-03\n" });
    expect(failures("change-uat-extension", run).change).toMatch(/2 change orders written; one client-side event is one change order/);
  });

  it("requests from the handoff: a FIX-nn at the limit priced as a change order, and no ow-build-plan hand-off", () => {
    const run = mutated("change-fix-too-big", {
      [`${B}/changes/requests.md`]: (t) => t.replace("too big for a change order (3 units; limit 3)", "CO-03 (draft)"),
      [`${B}/changes/CO-03.md`]: () => "---\nid: CO-03\nkind: change\nprice: 8000.00\n---\n# CO-03\n",
      "opchain-work/STATUS.md": (t) => t.replace("next: ow-build-plan on handoffs/larkspur-ceramics/fixes/FIX-07.md", "next: ow-build /ow-build-change builds/larkspur-ceramics/"),
    });
    const out = failures("change-fix-too-big", run).change;
    expect(out).toMatch(/at or over the limit it is "too big for a change order \(<n> units; limit <max>\)"/);
    expect(out).toMatch(/a request too big for a change order gets none/);
    expect(out).toMatch(/must hand handoffs\/larkspur-ceramics\/fixes\/FIX-07\.md to ow-build-plan/);
  });

  it("demo: a script missing a check and the out-of-milestone list; a record with the trigger decided by the skill", () => {
    const script = mutated("demo-script", { [`${B}/demos/M1-script.md`]: (t) => t.replace(/### AC-4\.1\n(?:- [^\n]+\n)+/, "").replace("- WP-5 Orders from the sheet into QuickBooks Online (milestone 2)\n", "") });
    const s = failures("demo-script", script).demo_script;
    expect(s).toMatch(/no walk-through for AC-4\.1/);
    expect(s).toMatch(/"Not in this milestone" does not list WP-5/);
    const record = mutated("demo-record", {
      [`${B}/demos/M1-record.md`]: (t) => t.replace('trigger_confirmed: "working demo confirmed by Robin 2026-11-25: the client saw it working"', "trigger_confirmed: met (the demo went well)").replace("| \"Could the confirmation view show stock on hand for each line?\" | change |", "| \"Could the confirmation view show stock on hand for each line?\" | in scope (WP-3) |"),
    });
    const r = failures("demo-record", record).demo_record;
    expect(r).toMatch(/trigger_confirmed must read "working demo confirmed by Robin <date>: the client saw it working"/);
    expect(r).toMatch(/"stock on hand" is classed in scope \(WP-3\), expected change/);
  });

  it("email: a broken tag, no alt text, a <style> block, a raw &, two h1, a skipped heading, a twin that differs", () => {
    const run = mutated("demo-record", {
      [`${B}/demos/M1-summary.html`]: (t) => t.replace("<h2 style=\"margin:16px 0 8px 0;font-size:18px;color:#1F4E79;\">Not yet</h2>", "<h3>Not yet</h3><img src=\"logo.png\">").replace("</head>", "<style>p{color:red}</style>\n</head>")
        .replace("4 of 4 checks working.</p>", "4 of 4 checks working & more.</p><h1>Again</h1>").replace("<li style=\"margin:0 0 4px 0;\">Every sampled product code is in the LC-nnnn form.</li>", "<li style=\"margin:0 0 4px 0;\">Every sampled product code is in the LC-nnnn form."),
    });
    const out = failures("demo-record", run).email;
    expect(out).toMatch(/an <img> without alt text/);
    expect(out).toMatch(/<style> is not an element the email template uses/);
    expect(out).toMatch(/a raw & in the text/);
    expect(out).toMatch(/2 <h1> headings; exactly one/);
    expect(out).toMatch(/<\/ul> closes <li>|unclosed/);
    expect(out).toMatch(/the twin's words differ from the HTML's/);
    const noTwin = mutated("update", { [`${B}/updates/2026-11-13.txt`]: () => null });
    expect(failures("update", noTwin).email).toMatch(/2026-11-13\.txt was not written; every email has a plain-text twin/);
  });

  it("the HTML validator passes every golden email and the twin rule compares words, not layout", () => {
    const emails = [];
    const walk = (d) => readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith(".html") && emails.push(join(d, e.name))));
    walk(FIXTURES);
    expect(emails.length).toBeGreaterThanOrEqual(5);
    for (const f of emails) {
      expect(validateEmailHtml(readFileSync(f, "utf8")), f).toEqual([]);
      expect(htmlWords(readFileSync(f, "utf8")).join(" "), f).toBe(words(readFileSync(f.replace(/\.html$/, ".txt"), "utf8")).join(" "));
    }
    expect(validateEmailHtml("<!DOCTYPE html>\n<html><body><p onclick=\"x()\">hi</p></body></html>").join("\n")).toMatch(/no event handlers[\s\S]*<html> has no lang[\s\S]*no <title>/);
  });

  it("private names: a private skill or the business outside the user's own say: line", () => {
    const run = mutated("signature-gate", { [`${B}/changes/change-inputs-CO-01.md`]: (t) => t.replace("## What changes", "Drafted with llc-ops for Deftwright.\n\n## What changes") });
    const out = failures("signature-gate", run).private_names;
    expect(out).toMatch(/names "llc-ops"/);
    expect(out).toMatch(/names "Deftwright"/);
  });
});

describe("routing (contract C4): every inbound edge lands on exactly one verb", () => {
  it("each golden route lands where its key says", () => {
    for (const c of CASES.filter((x) => x.startsWith("route-"))) expect(failures(c), c).toEqual({});
  });

  it("a UAT-nn of class Defect, Training gap or Duplicate is not a change: the route writes nothing", () => {
    const run = mutated("route-uat", {
      "opchain-work/uat/larkspur-ceramics/defects/UAT-03.md": (t) => t.replace("- 2027-01-13 extension requested, client cause: testers absent from session 2 on 2027-01-12\n", ""),
    });
    expect(failures("route-uat", run).route).toMatch(/this case expects the route "change", but uat\/larkspur-ceramics\/defects\/UAT-03\.md routes to "nothing"/);
  });

  it("a FIX-nn of class Fix is a covered fix: not this skill's", () => {
    const run = mutated("route-fix", { "opchain-work/handoffs/larkspur-ceramics/fixes/FIX-07.md": (t) => t.replace("class: Change", "class: Fix") });
    expect(failures("route-fix", run).route).toMatch(/routes to "nothing"/);
  });

  it("the signed plan's NEXT on a build that has started routes the folder, never -start again; an unsigned plan routes nowhere", () => {
    const state = (files) => ({ priorRead: (r) => files[r] ?? null, priorExists: (r) => r in files, priorAll: () => Object.keys(files), read: (r) => files[r] ?? null });
    const key = { slug: "acme" };
    const started = state({ "opchain-work/builds/acme/build.yaml": "map_check: OK\n", "opchain-work/plans/acme/build-request.md": "x" });
    expect(expectedRoute(started, key, "plans/acme/")).toBe("folder");
    const stopped = state({ "opchain-work/builds/acme/build.yaml": "map_check: \"stopped: AC-3.3\"\n", "opchain-work/plans/acme/build-request.md": "x" });
    expect(expectedRoute(stopped, key, "plans/acme/build-request.md")).toBe("start");
    expect(expectedRoute(state({}), key, "plans/acme/")).toBe("nothing");
    expect(expectedRoute(state({ "opchain-work/uat/acme/defects/UAT-01.md": "class: Change\n" }), key, "uat/acme/defects/UAT-01.md")).toBe("change");
    expect(expectedRoute(state({ "opchain-work/uat/acme/defects/UAT-01.md": "no class line\n" }), key, "uat/acme/defects/UAT-01.md")).toBe("ask");
    expect(expectedRoute(state({ "opchain-work/handoffs/acme/fixes/FIX-01.md": "class: After the window\n" }), key, "handoffs/acme/fixes/FIX-01.md")).toBe("change");
    // Bug 1: a build whose map is pending, or a ledger and spec/ with no build.yaml, resumes -start.
    expect(expectedRoute(state({ "opchain-work/builds/acme/build.yaml": "map_check: pending\n", "opchain-work/plans/acme/build-request.md": "x" }), key, "plans/acme/")).toBe("start");
    expect(expectedRoute(state({ "opchain-work/builds/acme/ledger.md": "x", "opchain-work/plans/acme/build-request.md": "x" }), key, "plans/acme/")).toBe("start");
    // Bug 4: route: care is care hours, not a change order; Not a defect is recorded by -change at no charge.
    expect(expectedRoute(state({ "opchain-work/handoffs/acme/fixes/FIX-02.md": "class: After the window\nroute: care\n" }), key, "handoffs/acme/fixes/FIX-02.md")).toBe("nothing");
    expect(expectedRoute(state({ "opchain-work/handoffs/acme/fixes/FIX-03.md": "class: Not a defect\n" }), key, "handoffs/acme/fixes/FIX-03.md")).toBe("change");
    // Bug 4: a request is priced once, whether its row or a change order cites it.
    const priced = { "opchain-work/uat/acme/defects/UAT-02.md": "class: Change\n", "opchain-work/builds/acme/changes/CO-01.md": "---\nrequests: [uat/acme/defects/UAT-02.md]\n---\n" };
    expect(expectedRoute(state(priced), key, "uat/acme/defects/UAT-02.md")).toBe("nothing");
    const row = (from, result) => ({ "opchain-work/uat/acme/defects/UAT-04.md": "class: Change\n", "opchain-work/builds/acme/changes/requests.md": `---\nx: 1\n---\n| # | from | result |\n|---|---|---|\n| R-01 | ${from} | ${result} |\n` });
    expect(expectedRoute(state(row("./opchain-work/uat/acme/defects/UAT-04.md", "CO-02 (draft)")), key, "uat/acme/defects/UAT-04.md")).toBe("nothing");
    // D7: the id however spelled (no .md, the bare id, no zero).
    for (const from of ["UAT-04", "uat/acme/defects/UAT-4", "UAT-4.md"]) expect(expectedRoute(state(row(from, "CO-02 (draft)")), key, "uat/acme/defects/UAT-04.md"), from).toBe("nothing");
    // D2: an unpriced row settles nothing; the request is priced when it comes back.
    expect(expectedRoute(state(row("uat/acme/defects/UAT-04.md", "unpriced: no price-book unit; asked Robin 2027-01-01")), key, "uat/acme/defects/UAT-04.md")).toBe("change");
    // Bug 3: the sibling payment-trigger files route to -invoice once the build has a ledger.
    for (const from of ["uat/acme/signoff.md", "uat/acme/backstop.md", "handoffs/acme/dates.yaml", "docs/acme/delivered.md"]) {
      expect(expectedRoute(state({ "opchain-work/builds/acme/ledger.md": "x" }), key, from), from).toBe("invoice");
      expect(expectedRoute(state({}), key, from), from).toBe("nothing");
    }
  });

  it("a route that runs a second verb's files fails", () => {
    const run = mutated("route-folder", { [`${B}/changes/requests.md`]: (t) => `${t}| R-09 | 2026-11-25 | "x" | stated | change | CO-09 (draft) |\n` });
    expect(failures("route-folder", run).route).toMatch(/written by change, but builds\/larkspur-ceramics\/ routes to invoice/);
  });
});

describe("C11: each check fails on its own and the checker never crashes", () => {
  it("a malformed build.yaml fails only the checks that read it, with a reason", () => {
    const run = mutated("start", { [`${B}/build.yaml`]: (t) => `${t}\n  bad: [\n` });
    const out = failures("start", run);
    expect(out.start).toMatch(/build\.yaml: not valid YAML/);
    expect(out.spec).toBeUndefined();
    expect(out.ledger).toBeUndefined();
    expect(out.status).toBeUndefined();
  });

  it("a malformed ledger, price book, handoffs.yaml, STATUS directory or binary file: reasons, no crash", () => {
    const cases = [
      ["invoice-booking", { [`${B}/ledger.md`]: (t) => t.replace("currency: USD", "currency: [USD") }, "invoice"],
      ["change-priced", { "opchain-work/price-book.yaml": () => "\u0000\u0001binary" }, "change"],
      ["start", { "opchain-work/handoffs.yaml": (t) => `${t}\n  oops: [\n` }, "start"],
      ["update", { "opchain-work/STATUS.md": () => null }, "status"],
      ["update", { [`${B}/updates/2026-11-13-checks.md`]: () => "---\nperiod: [\n---\n" }, "update"],
    ];
    for (const [c, edits, check] of cases) {
      const results = runCase(c, mutated(c, edits));
      expect(Array.isArray(results), c).toBe(true);
      const r = results.find((x) => x.check === check);
      expect(r.problems.length, `${c} ${check}`).toBeGreaterThan(0);
      expect(r.problems.join("\n"), `${c} ${check}`).not.toMatch(/TypeError|undefined is not/);
    }
  });

  it("a broken answer key fails that case alone; an unknown check is named", () => {
    const dir = temp("ow-build-key-");
    cpSync(join(FIXTURES, "start"), join(dir, "start"), { recursive: true });
    writeFileSync(join(dir, "start", "answer-key.yaml"), "checks: [\n");
    expect(runCase("start", null, { caseDir: join(dir, "start") })[0].problems[0]).toMatch(/answer-key\.yaml could not be used/);
    writeFileSync(join(dir, "start", "answer-key.yaml"), "checks: nope\n");
    expect(runCase("start", null, { caseDir: join(dir, "start") })[0].problems[0]).toMatch(/`checks` must be a list/);
    writeFileSync(join(dir, "start", "answer-key.yaml"), "checks: [no_such_check]\n");
    expect(runCase("start", null, { caseDir: join(dir, "start") })[0].problems[0]).toMatch(/unknown check "no_such_check"/);
  });

  it("every case's checks run against an empty run folder without throwing", () => {
    for (const c of CASES) {
      const dir = temp("ow-build-empty-");
      mkdirSync(join(dir, "opchain-work"));
      const r = runCase(c, dir);
      expect(Array.isArray(r), c).toBe(true);
      for (const x of r) expect(x.problems.join("\n"), `${c} ${x.check}`).not.toMatch(/TypeError|is not a function/);
    }
  });
});

describe("helpers read the formats the skill writes", () => {
  it("quote milestones, the sprint map and check blocks", () => {
    const q = readFileSync(join(ROOT, "tests/fixtures/ow-build-plan/unpriced-package/expected/opchain-work/plans/larkspur-ceramics/quote.md"), "utf8");
    const ms = quoteMilestones(matter(q).content);
    expect(ms).toEqual([{ id: "M1", wps: ["WP-1", "WP-2", "WP-4"] }, { id: "M2", wps: ["WP-3", "WP-5"] }]);
    const checks = checkBlocks(readFileSync(join(ROOT, "tests/fixtures/ow-build-plan/tier2-plan/expected/opchain-work/plans/larkspur-ceramics/acceptance.md"), "utf8"));
    expect([...checks.keys()]).toEqual(["AC-1.1", "AC-1.2", "AC-2.1", "AC-3.1", "AC-4.1", "AC-5.1", "AC-5.2"]);
    const map = sprintMap(readFileSync(join(FIXTURES, "start/builder/larkspur-repo/sprints/sprint-plan.md"), "utf8"), ms, checks);
    expect(Object.fromEntries(map.byMilestone)).toEqual({ M1: [1, 2], M2: [3, 4] });
    expect(map.uncovered).toEqual([]);
  });
});

describe("the skill text keeps the rules the checker cannot see", () => {
  const body = () => { const t = readFileSync(join(SKILL, "SKILL.md"), "utf8"); return t.slice(t.indexOf("\n---", 3) + 4); };
  const ref = (f) => readFileSync(join(SKILL, "references", f), "utf8");

  it("C2: the body stays under 4,500 tokens, a cap the catalog enforces; the protocol copy is byte-identical", () => {
    expect(Math.ceil(body().length / 4)).toBeLessThan(4500);
    // Enforced at build time (gen-skills-catalog), not only here; the over-budget plant is C18 in ow-build-plants.test.js.
    expect(loadCatalogs({ root: ROOT }).find((c) => c.id === "ow").bodyTokenBudgets).toEqual({ "ow-build": 4500 });
    expect(readFileSync(join(SKILL, "references", "ow-protocol.md"))).toEqual(readFileSync(join(ROOT, "skills-work", "ow-protocol.md")));
    expect(checkProtocolCopies(loadCatalogs({ root: ROOT }))).toEqual([]);
  });

  it("frontmatter: Agent Skills keys only, version 1.0.0, protocol 1, every verb declared", () => {
    const { data } = matter(readFileSync(join(SKILL, "SKILL.md"), "utf8"));
    expect(Object.keys(data).sort()).toEqual(["compatibility", "description", "license", "metadata", "name"]);
    expect(data.metadata.version).toBe("1.0.0");
    expect(data.metadata.protocol).toBe("1");
    expect(data.metadata.commands.split(" ")).toEqual(["/ow-build", "/ow-build-start", "/ow-build-run", "/ow-build-update", "/ow-build-demo", "/ow-build-change", "/ow-build-invoice", "/ow-build-ready"]);
  });

  it("C3: the skill names no oc- skill, no private skill, no business and no real price; a planted builder name fails", () => {
    expect(checkFamily(loadCatalogs({ root: ROOT }))).toEqual([]);
    const dir = temp("ow-build-family-");
    cpSync(join(ROOT, "skills-work"), dir, { recursive: true });
    writeFileSync(join(dir, "ow-build", "references", "builder-integration.md"), `${ref("builder-integration.md")}\nSay "use oc-app-architect /oc-build sprint 1".\n`);
    writeFileSync(join(dir, "ow-build", "references", "phase-change.md"), `${ref("phase-change.md")}\nFor Deftwright, llc-ops drafts it.\n`);
    const out = checkFamily(loadCatalogs({ env: { OPCHAIN_WORK_SKILLS_DIR: dir } })).join("\n");
    expect(out).toMatch(/names `oc-app-architect`, a skill outside the ow- family/);
    expect(out).toMatch(/names `llc-ops`, a private skill/);
    expect(out).toMatch(/names `Deftwright`, a business/);
    for (const f of readdirSync(join(SKILL, "references")).concat("SKILL.md")) {
      const t = f === "SKILL.md" ? readFileSync(join(SKILL, f), "utf8") : ref(f);
      expect(t, f).not.toMatch(/\$\s?\d|USD \d/);
    }
  });

  it("C4: ow-build-plan's signed NEXT now resolves to ow-build's real verb, and ow-build is no longer planned", () => {
    const cats = loadCatalogs({ root: ROOT });
    const ow = cats.find((c) => c.id === "ow");
    expect(ow.planned).not.toContain("ow-build");
    expect(Object.keys(ow.plannedVerbs ?? {})).not.toContain("ow-build");
    expect(checkEdges(cats)).toEqual([]);
    const plan = readFileSync(join(ROOT, "skills-work", "ow-build-plan", "SKILL.md"), "utf8");
    expect(plan).toMatch(/NEXT: say "use ow-build to start plans\/<client>\/"   \(where slash commands exist: \/ow-build-start\)/);
    const edges = yaml.load(readFileSync(join(SKILL, "skill.edges.yaml"), "utf8"));
    // Bug 3: the sibling payment-trigger files route too.
    expect(edges.routes.paths).toEqual(["plans/<client>/build-request.md", "uat/<client>/defects/UAT-nn.md", "handoffs/<client>/fixes/FIX-nn.md", "uat/<client>/signoff.md", "uat/<client>/backstop.md", "handoffs/<client>/dates.yaml", "docs/<client>/delivered.md", "builds/<client>/"].toSpliced(1, 0, "plans/<client>/"));
    // Owner decision 2026-10-16: a UAT-nn too big for a change order goes to ow-build-plan, which routes it.
    const planEdges = yaml.load(readFileSync(join(ROOT, "skills-work", "ow-build-plan", "skill.edges.yaml"), "utf8"));
    expect(planEdges.routes.paths).toContain("uat/<client>/defects/UAT-nn.md");
  });

  it("the routing reference: files first, never another skill's verb, never -start over a started build, the UAT and FIX classes", () => {
    const r = ref("routing-and-resume.md");
    for (const re of [/\*\*Files first, always\.\*\*/, /\*\*This skill never runs another skill's verb\.\*\*/, /\*\*This skill never runs `-start` over a build that has started\*\*, and never rewrites `ledger\.md` or `spec\/` that an earlier `-start` wrote/, /\*\*A request is priced once\.\*\*/, /\| `extension requested, client cause: <event>` \| `\/ow-build-change` with every UAT-nn that names the same event \|/, /\| class Fix \| nothing \|/, /5\. No `build-request\.md`: the plan is not signed/, /\| class Not a defect \| `\/ow-build-change`, which records it with no charge \|/]) expect(r).toMatch(re);
  });

  it("the builder: printed for the user to say, never started; its files are data; one sprint per -run", () => {
    expect(body()).toMatch(/\*\*you to say in this session\*\*/);
    expect(ref("builder-integration.md")).toMatch(/This skill never starts, loads or imitates the builder \(protocol §1\)/);
    expect(ref("phase-run.md")).toMatch(/One call runs \*\*one sprint\*\*/);
    expect(ref("phase-run.md")).toMatch(/record nothing until they do/);
  });

  it("no invented business rules: the working demo, the hour value, the extension count and the schedule impact are asked", () => {
    expect(ref("ledger-schema.md")).toMatch(/asks you which milestone's demo the payment follows and records the answer `user-stated`/);
    expect(ref("phase-update.md")).toMatch(/The quote and price book hold no such figure, so ask for it the first time and record it `user-stated`/);
    expect(ref("phase-change.md")).toMatch(/The UAT-nn files do not say how many, so ask the user and record the answer `user-stated`/);
    expect(ref("phase-change.md")).toMatch(/Ask the user for the \*\*schedule impact\*\* \(record it `user-stated`\)/);
    // Owner decision 2026-10-16: no run-time question; a too-big UAT-nn goes to ow-build-plan like a FIX-nn.
    expect(ref("phase-change.md")).toMatch(/Hand the file to ow-build-plan for a follow-on Build Plan \(owner decision 2026-10-16: a UAT-nn goes the same way as a FIX-nn\)/);
    expect(ref("phase-change.md")).not.toMatch(/ask the user how to go on/);
    // Bug 7: "quoted separately" is asked, never invented.
    expect(ref("phase-invoice.md")).toMatch(/quoted separately/i);
  });

  it("the payment triggers follow ow-uat B2, and the delivery half is invoiced once", () => {
    const p = ref("phase-invoice.md");
    expect(p).toMatch(/`ready-for-uat\.md` is \*\*not\*\* this trigger/);
    expect(p).toMatch(/Whichever comes \*\*first\*\*: `handoffs\/<client>\/dates\.yaml` `handoff_date`/);
    expect(p).toMatch(/\*\*The delivery half is invoiced once\.\*\*/);
    expect(p).toMatch(/\*\*The governing definition\.\*\*/);
    // B4 (owner-approved 2026-10-16): the documentation line, only when bought, invoiced once.
    expect(p).toMatch(/\| `documentation` \(the documentation & training line, only when bought\) \| `plans\/<client>\/contract-inputs\.md` says `documentation_sku: bought` and `docs\/<client>\/delivered\.md` exists/);
    expect(p).toMatch(/\*\*The documentation line is invoiced once\*\*/);
  });

  it("the shared handoffs.yaml example: byte-identical in all three skills, defaults only, both build modes shown with placeholders", () => {
    const files = ["ow-start", "ow-build-plan", "ow-build"].map((s) => readFileSync(join(ROOT, "skills-work", s, "examples", "handoffs.yaml"), "utf8"));
    expect(files[1]).toBe(files[0]);
    expect(files[2]).toBe(files[0]);
    const h = yaml.load(files[2]);
    for (const k of ["contract", "build", "change_order", "invoice"]) expect(h).toHaveProperty(k, null);
    expect(files[2]).toMatch(/#\s+mode: other/);
    expect(files[2]).toMatch(/#\s+mode: opchain/);
    expect(files[2]).toMatch(/#\s+fix: "use <builder> <its quick-feature verb> \{description\}"/);
    expect(files[2]).not.toMatch(/\boc-[a-z]/);
  });
});

describe("round-2 text rules (Sprint 2 round 3)", () => {
  const ref = (f) => readFileSync(join(SKILL, "references", f), "utf8");
  it("D3: -start records each step and resumes at the first one not done", () => {
    expect(ref("phase-start.md")).toMatch(/\*\*resume at the first step its `start_steps` list does not hold\*\*/);
    expect(ref("phase-start.md")).toMatch(/Then write `build\.yaml` with `map_check: pending` and `start_steps: \[answers\]`/);
    expect(ref("build-yaml-schema.md")).toMatch(/start_steps: \[answers, ledger, builder, spec, plan_line\]/);
  });
  it("D11 and D10: the folder route invoices a due booking before resuming -start, and a stopped milestone has its step", () => {
    const r = ref("routing-and-resume.md");
    expect(r.indexOf("2. A payment trigger is met")).toBeGreaterThan(0);
    expect(r.indexOf("2. A payment trigger is met")).toBeLessThan(r.indexOf("3. `build.yaml` has `map_check: pending`"));
    expect(r).toMatch(/If it is `stopped` by an escalation, say so with its blocker and ask whether it is resolved/);
    expect(ref("phase-run.md")).toMatch(/awaiting: M<n> sprint <k>/);
  });
  it("D2: an unpriced row settles nothing; D5: each change-order move adds one known history line", () => {
    expect(ref("phase-change.md")).toMatch(/A row whose result is `unpriced: …` does \*\*not\*\* settle it/);
    expect(ref("phase-change.md")).toMatch(/`sent <date>`; `agreed in principle <date>, recorded by <user>; not a signature`/);
  });
  it("D9: the too-big NEXT carries the slash hint", () => {
    expect(readFileSync(join(SKILL, "SKILL.md"), "utf8")).toMatch(/NEXT: say "use ow-build-plan on handoffs\/<client>\/fixes\/FIX-nn\.md"   \(where slash commands exist: \/ow-build-plan\)/);
  });
  it("D1: the self-checks name the categories, and what a checker cannot catch", () => {
    expect(ref("self-checks.md")).toMatch(/\*\*The categories of an internal number\.\*\*/);
    expect(ref("self-checks.md")).toMatch(/\*\*What a checker cannot catch\.\*\*/);
  });
});
