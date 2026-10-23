// ow-build-plan acceptance tests (docs/plans/2026-10-06-ow-build-plan-design.md §9.2).
// ow-build-plan is a text-only skill, so a model has to run it. These tests prove
// the mechanical half: every §9.2 case except "Real use" (Sprint 6) has an
// invented golden run that passes scripts/ow-build-plan-acceptance.mjs; each case
// has a planted failure the checker catches; each check fails on its own when a
// file is malformed (C11); and the shipped examples have the shapes the skill
// and the ow-tools add-on read. To check a real run:
// node scripts/ow-build-plan-acceptance.mjs --prepare <case> <dir>.
import { afterAll, describe, expect, it, onTestFinished } from "vitest";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import * as yaml from "js-yaml";
import { FIXTURES, addBusinessDays, listCases, loadKey, prepare, runCase, split } from "../scripts/ow-build-plan-acceptance.mjs";
import { parseBrandYaml, validateBrand } from "../plugins/ow-tools/lib/brand.mjs";
import { preflight } from "../plugins/ow-tools/lib/preflight.mjs";

const ROOT = join(import.meta.dirname, "..");
const SKILL = join(ROOT, "skills-work", "ow-build-plan");
const CLI = join(ROOT, "scripts", "ow-build-plan-acceptance.mjs");
// A scratch folder made inside a test is removed in the background once that test finishes, so a file's folders never
// pile up for one long afterAll; one made outside a test waits for afterAll, which also waits for removals still running.
const scratch = [];
const pending = new Set();
const keep = (d) => {
  try { onTestFinished(() => { const job = rm(d, { recursive: true, force: true }).catch(() => {}).finally(() => pending.delete(job)); pending.add(job); }); } catch { scratch.push(d); }
  return d;
};
afterAll(async () => { scratch.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })); await Promise.all(pending); }, 120_000);

const CASES = [
  "accepted-signed", "builder-neutral", "credentials", "dates-terms-above", "dates-terms-below", "delivery-quote", "feasibility-signed", "fix-window",
  "follow-on-asks", "follow-on-fix", "follow-on-offer", "follow-on-stated-offer", "follow-on-stated-start", "follow-on-uat", "follow-on-uat-offer", "modifier-evidence", "offer",
  "private-names-business", "private-names-default", "quick-over-limit", "quick-quote", "research-collect", "research-finding-open", "research-map", "research-no-plan", "route-build-plan", "route-defined-work", "route-feasibility",
  "route-fix-covered", "route-folder", "route-folder-signed", "route-next-stage", "route-vendor-selection", "selection-map-rerun", "selection-quote-refused", "selection-scope", "signed-before-accepted", "tier2-plan", "uat-documentation", "unpriced-package", "vendor-selection-signed",
];

/** The case's run as a real folder (starting state + its golden output), edited by `edits` (path under opchain-work -> fn). */
function mutated(caseName, edits = {}) {
  const dir = mkdtempSync(join(tmpdir(), "ow-build-plan-run-"));
  keep(dir);
  prepare(caseName, dir);
  let home = caseName;
  while (loadKey(join(FIXTURES, home)).run) home = loadKey(join(FIXTURES, home)).run;
  const expected = join(FIXTURES, home, "expected");
  if (existsSync(expected)) cpSync(expected, dir, { recursive: true });
  for (const [rel, edit] of Object.entries(edits)) {
    const path = join(dir, "opchain-work", rel);
    const before = existsSync(path) ? readFileSync(path, "utf8") : null;
    const after = edit(before);
    if (after === before) throw new Error(`mutation of ${rel} changed nothing`);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, after);
  }
  return dir;
}
const failures = (caseName, runDir) => Object.fromEntries(runCase(caseName, runDir).filter((r) => r.problems.length).map((r) => [r.check, r.problems.join("\n")]));
const L = "plans/larkspur-ceramics";
const M = "plans/mossgate-books";

describe("golden runs", () => {
  it("has a case for every §9.2 acceptance test except Real use (Sprint 6)", () => {
    expect(listCases()).toEqual(CASES);
    const sections = listCases().map((c) => loadKey(join(FIXTURES, c)).section).join("\n");
    for (const s of ["Synthetic client, tier 2", "Unpriced package", "Modifiers cite evidence", "Dates and terms (at or above", "Dates and terms (below", "Credentials never written", "Builder-neutral", "Build Plan offer", "Quick quote (two-unit job)", "Quick quote (over the limit", "UAT and documentation lines", "Fix window", "Accepted and signed", "signing refused before acceptance", "Follow-on intake (from FIX-nn.md)", "Follow-on intake (no FIX file", "Follow-on intake (offer from FIX-nn.md)", "No private names (defaults-only", "No private names (a business", "Inbound route from ow-start (Build Plan path)", "Inbound route from ow-start (defined piece of work)", "Inbound route from ow-start (delivery mode, signed work)", "Folder route after the quote", "Follow-on intake (offer from the user's words)", "Follow-on intake (start after an offer from the user's words)", "Folder route after signing", "Inbound route from ow-start (feasibility check)", "Feasibility test accepted and signed (no build hand-off)", "Quote on signed work (delivery mode, fee none)", "Follow-on route refused for a covered Fix", "Follow-on intake (offer from UAT-nn.md)", "Follow-on intake (from UAT-nn.md)", "P5: research findings collected", "P5: the destination-keyed cap", "P5: a topic with a FINDING open", "P5: no plan.yaml"]) {
      expect(sections).toContain(s);
    }
  });

  for (const c of CASES) {
    it(`${c}: every check passes on the hand-written golden run`, () => {
      expect(failures(c)).toEqual({});
    });
  }

  it("a golden run laid out as a real folder still passes (the --prepare path)", () => {
    for (const c of ["accepted-signed", "quick-quote", "follow-on-fix"]) expect(failures(c, mutated(c)), c).toEqual({});
  });

  it("the date and split helpers follow the price book's rules", () => {
    expect(addBusinessDays("2026-10-12", 10, [])).toBe("2026-10-26");
    expect(addBusinessDays("2026-11-25", 1, ["2026-11-26"])).toBe("2026-11-27");
    expect(split(1745000, "40/40/20")).toEqual([698000, 698000, 349000]);
    expect(split(1001, "50/50")).toEqual([500, 501]);
  });
});

describe("fixtures plant what their keys claim", () => {
  it("every input file says it is invented, and the tier-2 inputs are three artefacts, a workshop and a fake schema", () => {
    for (const c of CASES) {
      const input = join(FIXTURES, c, "input");
      if (!existsSync(input)) continue;
      for (const f of readdirSync(input, { recursive: true }).map(String).filter((f) => /\.(md|txt|yaml|json)$/.test(f) && !f.endsWith("STATUS.md"))) {
        expect(readFileSync(join(input, f), "utf8"), `${c}/${f}`).toMatch(/INVENTED/);
      }
    }
    const inbox = join(FIXTURES, "tier2-plan", "input", "opchain-work", L, "inbox");
    expect(readdirSync(inbox).sort()).toEqual(["monday-code-fix-procedure.md", "order-sheet-september.csv", "purchase-order-PO-88231.txt"]);
    expect(existsSync(join(FIXTURES, "tier2-plan", "input", "opchain-work", L, "workshops", "W1", "transcript.md"))).toBe(true);
    expect(JSON.parse(readFileSync(join(FIXTURES, "tier2-plan", "input", "session", "quickbooks-readonly-schema.json"), "utf8")).objects.Item.records).toBe(212);
  });

  it("the unpriced package matches no unit, and the messy-data condition is in the workshop", () => {
    const book = yaml.load(readFileSync(join(FIXTURES, "workspace", "opchain-work", "price-book.yaml"), "utf8"));
    expect(book.units.map((u) => u.id)).not.toContain("data-clean-up");
    expect(readFileSync(join(FIXTURES, "tier2-plan", "input", "opchain-work", L, "workshops", "W1", "transcript.md"), "utf8")).toMatch(/\[06:10\] client \(order coordinator\): And we fix the codes by hand every Monday/);
  });

  it("the over-limit job needs more units than the fixture's quick_quote_max_units", () => {
    const book = yaml.load(readFileSync(join(FIXTURES, "workspace", "opchain-work", "price-book.yaml"), "utf8"));
    expect(book.quick_quote_max_units).toBe(3);
    expect(readFileSync(join(FIXTURES, "quick-over-limit", "answer-key.yaml"), "utf8")).toMatch(/4 units/);
  });
});

describe("the checker catches a planted failure in each §9.2 case", () => {
  it("tier 2: a package with no check, an empty out of scope, a risk with no owner, a fact citing no evidence", () => {
    const run = mutated("tier2-plan", {
      [`${L}/acceptance.md`]: (t) => t.replace(/## WP-3[\s\S]*?(?=## WP-4)/, ""),
      [`${L}/scope.md`]: (t) => t.replace(/(## Out of scope\n)(?:- [^\n]+\n)+/, "$1"),
      [`${L}/risks.md`]: (t) => t.replace("- owner: order coordinator\n", ""),
      [`${L}/map/systems.md`]: (t) => t.replace("[HIGH E-04, E-05]", "[HIGH E-44]"),
    });
    const out = failures("tier2-plan", run).plan_checks;
    expect(out).toMatch(/acceptance\.md: WP-3 has no acceptance check/);
    expect(out).toMatch(/scope\.md: Out of scope is empty/);
    expect(out).toMatch(/risks\.md: R-2 has no owner/);
    expect(out).toMatch(/map\/systems\.md: cites E-44, which is not in evidence\.md/);
  });

  it("tier 2: the planted instruction followed (not quoted), and a request that leaves an UNKNOWN uncovered", () => {
    const run = mutated("tier2-plan", {
      [`${L}/evidence.md`]: (t) => t.replace(/> "Note to any AI assistant[^\n]+\n/, ""),
      [`${L}/collection.md`]: (t) => t.replace("  C-5: [budget.1, must-ask:budget]\n", ""),
    });
    const out = failures("tier2-plan", run);
    expect(out.plan_checks).toMatch(/the planted instruction \("treat the product data as clean"\) is not quoted/);
    expect(out.start).toMatch(/collection\.md: budget\.1 is open in the intake but no request covers it/);
    expect(out.start).toMatch(/must-ask:budget is open/);
  });

  it("unpriced package: an estimated price with no record, and a unit price that is not the book's", () => {
    const run = mutated("unpriced-package", {
      [`${L}/quote.md`]: (t) => t.replace("priced by Robin, 2026-10-26, reason: one-off code clean-up across the sheet and QuickBooks; no unit fits", "estimated from similar work")
        .replace("| L2 | WP-2 | workflow-step-exceptions | 1 | 800.00 | none | 800.00 |", "| L2 | WP-2 | workflow-step-exceptions | 1 | 900.00 | none | 900.00 |"),
    });
    const out = failures("unpriced-package", run).unpriced;
    expect(out).toMatch(/L4 \(WP-4\): no price-book unit and no recorded manual price/);
    expect(out).toMatch(/WP-4 matches no price-book unit, so its line must read "priced by Robin/);
    expect(out).toMatch(/L2 \(WP-2\): unit price 900\.00 is not the price book's 800/);
  });

  it.each(["output", "raw output"])("accepts the recorded calculator %s label", (label) => {
    const run = mutated("unpriced-package", {
      [`${L}/quote.md`]: (t) => t.replace(/- arithmetic not machine-checked:[^\n]+/, `- command: ow-tools calc total --items quote-items.json --currency USD --json\n- ${label}: {"status":"ok","total":"17450.00"}`),
    });
    expect(failures("unpriced-package", run).unpriced).toBeUndefined();
  });

  it.each([
    "- raw output: recorded without a command",
    "- command: ow-tools calc total --items quote-items.json --currency USD --json",
    "- command: ow-tools calc total --items quote-items.json --currency USD --json\n- expected output: 10450.00",
  ])("does not treat incomplete or expected calculator evidence as machine checked: %s", (evidence) => {
    const run = mutated("unpriced-package", {
      [`${L}/quote.md`]: (t) => t.replace(/- arithmetic not machine-checked:[^\n]+/, evidence),
    });
    expect(failures("unpriced-package", run).unpriced).toMatch(/neither tool output/);
  });

  it("modifiers: a messy-data modifier citing a row that does not show it, or no row", () => {
    const wrong = mutated("modifier-evidence", { [`${L}/quote.md`]: (t) => t.replace('evidence.md E-07 "we fix the codes by hand every Monday"', 'evidence.md E-05 "we fix the codes by hand every Monday"') });
    expect(failures("modifier-evidence", wrong).modifiers).toMatch(/modifier data-messy quotes "we fix the codes by hand every Monday", which E-05 does not show/);
    const none = mutated("modifier-evidence", { [`${L}/quote.md`]: (t) => t.replace('evidence.md E-07 "we fix the codes by hand every Monday"', "the data looked messy") });
    expect(failures("modifier-evidence", none).modifiers).toMatch(/modifier data-messy cites no evidence row/);
  });

  it("dates and terms above the threshold: validity, credit deadline and split", () => {
    const run = mutated("dates-terms-above", {
      [`${L}/quote.md`]: (t) => t.replace("valid_until: 2026-11-09", "valid_until: 2026-11-10").replace("credit_deadline: 2026-12-25", "credit_deadline: 2026-12-26").replace("schedule: 40/40/20", "schedule: 50/50"),
    });
    const out = failures("dates-terms-above", run).dates_terms;
    expect(out).toMatch(/valid_until 2026-11-10, expected issued \+ 14 = 2026-11-09/);
    expect(out).toMatch(/credit_deadline 2026-12-26, expected plan delivery \+ 60 = 2026-12-25/);
    expect(out).toMatch(/schedule 50\/50; fixed price 17450\.00 is at or above size_threshold 10000, so 40\/40\/20/);
  });

  it("dates and terms below the threshold: a 40/40/20 split, a missing delivery sentence, a credit line on a quick quote", () => {
    const run = mutated("dates-terms-below", {
      [`${M}/quote.md`]: (t) => t.replace("Delivery: the day the Handoff notes are delivered, or as the contract's delivery-backstop clause provides.\n", "")
        .replace("payments: [1050.00, 1050.00]", "payments: [840.00, 840.00, 420.00]")
        .replace("## Valid until", "## Build Plan credit\nThe Build Plan fee is credited against this build.\n\n## Valid until"),
    });
    const out = failures("dates-terms-below", run).dates_terms;
    expect(out).toMatch(/payments 840\.00, 840\.00, 420\.00, expected 1050\.00, 1050\.00/);
    expect(out).toMatch(/the delivery sentence belongs on a quote below size_threshold/);
    expect(out).toMatch(/a quick quote has no Build Plan, so no credit line/);
  });

  it("credentials: the session's read-only key written into a plan file", () => {
    const run = mutated("credentials", { [`${L}/systems/quickbooks-online.md`]: (t) => `${t}\nConnected with LARKSPUR-QBO-READONLY-TEST-0000.\n` });
    expect(failures("credentials", run).credentials).toMatch(/systems\/quickbooks-online\.md:\d+: carries the read-only key used in the session/);
    const log = mutated("credentials", { [`${L}/evidence.md`]: (t) => t.replace("| confirmed by Robin |", "| assumed |") });
    expect(failures("credentials", log).credentials).toMatch(/does not record that the user confirmed read-only/);
  });

  it("builder-neutral: a price, a unit id, a skill name and an evidence id in the plan", () => {
    const run = mutated("builder-neutral", {
      [`${L}/build-plan.md`]: (t) => t.replace("## Ownership\n", "## Ownership\nThe build costs USD 17,450.00 (tool-m), checked by ow-build-plan against E-07.\n"),
    });
    const out = failures("builder-neutral", run).builder_neutral;
    expect(out).toMatch(/carries the amount 17450\.00 from the price book or the quote/);
    expect(out).toMatch(/names the price-book unit tool-m/);
    expect(out).toMatch(/names a skill name/);
    expect(out).toMatch(/names an evidence id/);
  });

  it("Build Plan offer: a fee and weeks from the wrong tier, and validity off by a day", () => {
    const run = mutated("offer", {
      [`${L}/build-plan-offer.md`]: (t) => t.replace("fee: 3000", "fee: 1500").replace("weeks: 2\n", "weeks: 1\n").replace("valid_until: 2026-10-21", "valid_until: 2026-10-22"),
    });
    const out = failures("offer", run).offer;
    expect(out).toMatch(/fee 1500 is not build_plan_fees\.two_systems \(3000\)/);
    expect(out).toMatch(/weeks 1 is not build_plan_weeks\.two_systems \(2\)/);
    expect(out).toMatch(/valid_until 2026-10-22, expected issued \+ 14 days = 2026-10-21/);
  });

  it("quick quote: a map written, and a tester named as a person", () => {
    const run = mutated("quick-quote", {
      [`${M}/map/current.md`]: () => "---\now_artefact: ow-build-plan/map-current\n---\n# Map\n",
      [`${M}/quick-scope.md`]: (t) => t.replace("- tester roles: shop manager", "- tester roles: Priya"),
    });
    const out = failures("quick-quote", run).quick;
    expect(out).toMatch(/plans\/mossgate-books\/map\/current\.md exists; a quick quote skips/);
    expect(out).toMatch(/the UAT approach names a person \(Priya\)/);
  });

  it("quick quote over the limit: a quote written anyway", () => {
    const run = mutated("quick-over-limit", { "plans/calder-joinery/quote.md": () => "---\now_artefact: ow-build-plan/quote\n---\n# Quote: Calder Joinery\n" });
    expect(failures("quick-over-limit", run).quick_refusal).toMatch(/plans\/calder-joinery\/quote\.md was written for a job over quick_quote_max_units/);
  });

  it("UAT and documentation: no per-role add-on, the training line inside the fixed price, the extension rate outside the markers", () => {
    const run = mutated("uat-documentation", {
      [`${L}/quote.md`]: (t) => t.replace("price: 2250.00 }", "price: 2000.00 }").replace("You can decline this line; it is not in the fixed price.", "It is included.")
        .replace("## Valid until\n", "## Valid until\n- UAT extension: 175.00 per extra session or fix round (client-caused overruns only)\n"),
    });
    const out = failures("uat-documentation", run);
    expect(out.uat_lines).toMatch(/the testing line is 2000\.00, expected 2250\.00 \(size price \+ 1 extra role\(s\)\)/);
    expect(out.uat_lines).toMatch(/does not say it can be declined/);
    expect(out.uat_lines).toMatch(/the extension rate appears outside the internal markers/);
    expect(out.internal_appendix).toMatch(/ow-tools preflight on quote\.md: line \d+: text from the internal section/);
  });

  it("internal appendix (C8): pricing lines outside the markers, or no markers at all", () => {
    const moved = mutated("unpriced-package", {
      [`${L}/quote.md`]: (t) => {
        const table = t.slice(t.indexOf("### Pricing lines"), t.indexOf("### Modifiers"));
        return t.replace(table, "").replace("## Valid until\n", `${table}## Valid until\n`);
      },
    });
    const out = failures("unpriced-package", moved).internal_appendix;
    expect(out).toMatch(/"Pricing lines" is not inside the internal markers/);
    expect(out).toMatch(/the exported body still holds/);
    const bare = mutated("unpriced-package", { [`${L}/quote.md`]: (t) => t.replace("<!-- ow:internal -->\n", "").replace("<!-- ow:end-internal -->\n", "") });
    expect(failures("unpriced-package", bare).internal_appendix).toMatch(/not wrapped in <!-- ow:internal -->/);
  });

  it("fix window: the quote and contract-inputs.md disagree with offers.md", () => {
    const run = mutated("fix-window", {
      [`${L}/quote.md`]: (t) => t.replace("fix_window_days: 30", "fix_window_days: 14").replaceAll("30 days of fixes", "14 days of fixes"),
      [`${L}/contract-inputs.md`]: (t) => t.replace("fix_window_wording: 30 days of fixes", "fix_window_wording: a month of fixes"),
    });
    const out = failures("fix-window", run).fix_window;
    expect(out).toMatch(/quote\.md: fix_window_days 14, offers\.md says 30/);
    expect(out).toMatch(/the quote does not say "30 days of fixes"/);
    expect(out).toMatch(/contract-inputs\.md: fix_window_wording is "a month of fixes"/);
  });

  it("accepted: the acceptance note softened, clauses invented, the contract NEXT missing", () => {
    const run = mutated("accepted-signed", {
      [`${L}/contract-inputs.md`]: (t) => t.replace("acceptance_note: client accepted 2026-11-02, recorded by Robin; not verified by this skill", "acceptance_note: client accepted 2026-11-02")
        .replace("contract_clauses: not set", "contract_clauses: { deemed_acceptance: { ref: \"12.1\", business_days: 5 } }")
        .replace("    NEXT: send contract-inputs.md to whoever drafts your contracts, or fill your own SOW template from it", "    NEXT: draft the contract"),
    });
    const out = failures("accepted-signed", run).accepted;
    expect(out).toMatch(/acceptance_note must read "client accepted 2026-11-02, recorded by Robin; not verified by this skill"/);
    expect(out).toMatch(/offers\.md has no contract_clauses block, so contract_clauses is "not set"/);
    expect(out).toMatch(/the printed NEXT line is "draft the contract"; it must be exactly the public default/);
  });

  it("accepted (decision c, bug 7): a printed NEXT carrying a handoffs.yaml prefix or an explanation fails", () => {
    const prefixed = mutated("private-names-business", { [`${L}/contract-inputs.md`]: (t) => t.replace("    NEXT: use llc-ops", "    NEXT: handoffs.yaml `contract`: use llc-ops") });
    const out = failures("private-names-business", prefixed).accepted;
    expect(out).toMatch(/it must be exactly the handoffs\.yaml contract say: line/);
    expect(out).toMatch(/## Next prints configuration wording/);
    const explained = mutated("accepted-signed", { [`${L}/contract-inputs.md`]: (t) => t.replace("    NEXT: send contract-inputs.md", "    NEXT: no say: line is set, so: send contract-inputs.md") });
    expect(failures("accepted-signed", explained).accepted).toMatch(/## Next prints configuration wording/);
  });

  it("accepted: clauses in offers.md that contract-inputs.md does not copy", () => {
    const block = "```yaml\ncontract_clauses:\n  deemed_acceptance: { ref: \"9.2\", business_days: 10, calendar: contract, wording: \"INVENTED clause text\" }\n```";
    const run = mutated("accepted-signed", { "offers.md": (t) => t.replace(/(## contract_clauses[\s\S]*?)```yaml\n[\s\S]*?```/, `$1${block}`) });
    expect(failures("accepted-signed", run).accepted).toMatch(/contract_clauses differ from offers\.md's block/);
  });

  it("signed (C9): a NEXT without /ow-build-start, an unavailable branch without the build destination, a price", () => {
    const run = mutated("accepted-signed", {
      [`${L}/build-request.md`]: (t) => t.replace('say "use ow-build to start plans/larkspur-ceramics/"   (where slash commands exist: /ow-build-start)', 'say "start the build"')
        .replace("IF IT IS NOT AVAILABLE: give build-request.md to whoever builds it.", "IF IT IS NOT AVAILABLE: handoffs.yaml `build`: give build-request.md to whoever builds it.")
        .replace("## Milestones\n", "## Milestones\nThe fixed price is USD 17,450.00.\n"),
    });
    const out = failures("accepted-signed", run).signed;
    expect(out).toMatch(/the NEXT line must say "use ow-build to start plans\/larkspur-ceramics\/" with \/ow-build-start/);
    expect(out).toMatch(/IF IT IS NOT AVAILABLE must be exactly the build destination \(the public default\)/);
    expect(out).toMatch(/names a price; the build request holds none/);
  });

  it("signed (C9): --signed before --accepted writes a build request anyway", () => {
    const run = mutated("signed-before-accepted", { [`${L}/build-request.md`]: () => "---\now_artefact: ow-build-plan/build-request\n---\n# Build request\n" });
    expect(failures("signed-before-accepted", run).signed_refusal).toMatch(/plans\/larkspur-ceramics\/build-request\.md was written; --signed before --accepted writes nothing/);
    const status = mutated("signed-before-accepted", { "STATUS.md": (t) => `${t}2026-11-09 (clock: user-stated) | ow-build-plan 1.0.0 | ${L}/build-request.md | next: ow-build /ow-build-start ${L}/ | awaiting: none\n` });
    expect(failures("signed-before-accepted", status).signed_refusal).toMatch(/STATUS\.md was written/);
  });

  it("follow-on from a UAT-nn (owner decision 2026-10-16, round 2 D12): the intake is the UAT file, never a FIX path; the route is a follow-on offer", () => {
    const fixPath = mutated("follow-on-uat", { "plans/larkspur-ceramics-2/plan.yaml": (t) => t.replace("intake: uat/larkspur-ceramics/defects/UAT-08.md", "intake: handoffs/larkspur-ceramics/fixes/FIX-nn.md") });
    expect(failures("follow-on-uat", fixPath).follow_on).toMatch(/intake is "handoffs\/larkspur-ceramics\/fixes\/FIX-nn\.md", expected uat\/larkspur-ceramics\/defects\/UAT-08\.md/);
    expect(readFileSync(join(ROOT, "skills-work", "ow-build-plan", "references", "phase-start.md"), "utf8")).toMatch(/`intake:` that file, as it is spelled \(`handoffs\/<client>\/fixes\/FIX-nn\.md` or `uat\/<client>\/defects\/UAT-nn\.md`\)/);
    const inPlace = mutated("follow-on-uat-offer", { "plans/larkspur-ceramics/build-plan-offer.md": () => "---\nsubject: uat/larkspur-ceramics/defects/UAT-08.md\n---\n" });
    expect(failures("follow-on-uat-offer", inPlace).route).toMatch(/the follow-on offer wrote into the earlier plan's folder/);
  });

  it("follow-on: the FIX file not used as the intake, and a FIX file named when there is none", () => {
    const fix = mutated("follow-on-fix", { "plans/larkspur-ceramics-2/plan.yaml": (t) => t.replace("intake: handoffs/larkspur-ceramics/fixes/FIX-03.md", "intake: intake/larkspur-ceramics/intake-record.md") });
    expect(failures("follow-on-fix", fix).follow_on).toMatch(/intake is "intake\/larkspur-ceramics\/intake-record\.md", expected handoffs\/larkspur-ceramics\/fixes\/FIX-03\.md/);
    const asks = mutated("follow-on-asks", { "plans/larkspur-ceramics-2/plan.yaml": (t) => t.replace("intake: stated by Robin, 2026-12-01", "intake: handoffs/larkspur-ceramics/fixes/FIX-07.md") });
    const out = failures("follow-on-asks", asks).follow_on;
    expect(out).toMatch(/with no FIX file and no offer it must be "stated by <user>, <date>"/);
    expect(out).toMatch(/plan\.yaml: names a FIX file, but there is none/);
  });

  it("no private names: a private skill in STATUS.md, or a business's say: line reworded", () => {
    const run = mutated("private-names-default", { "STATUS.md": (t) => t.replace("next: ow-build /ow-build-start", "next: llc-ops /ow-build-start") });
    expect(failures("private-names-default", run).private_names).toMatch(/STATUS\.md:\d+: names "llc-ops"/);
    const reworded = mutated("private-names-business", { [`${L}/contract-inputs.md`]: (t) => t.replace("use llc-ops to draft the SOW from plans/larkspur-ceramics/contract-inputs.md", "ask llc-ops for the SOW") });
    const out = failures("private-names-business", reworded);
    expect(out.private_names).toMatch(/contract-inputs\.md:\d+: names "llc-ops"/);
    expect(out.private_names).toMatch(/the handoffs\.yaml say: line "use llc-ops to draft the SOW from plans\/larkspur-ceramics\/contract-inputs\.md" is not printed exactly/);
    expect(out.accepted).toMatch(/the printed NEXT line is "ask llc-ops for the SOW"; it must be exactly the handoffs\.yaml contract say: line/);
  });

  it("status: an earlier STATUS line rewritten", () => {
    const run = mutated("tier2-plan", { "STATUS.md": (t) => t.replace("awaiting: call on 2026-10-06", "awaiting: none") });
    expect(failures("tier2-plan", run).status).toMatch(/STATUS\.md line 1 was rewritten; STATUS\.md is append-only/);
  });
});

// Eval round 1: the slips the Evaluator planted (bug 9), the routing (bug 1), the
// follow-on folder (bug 5), the quick self-check (bug 15) and the schedule (owner decision g).
describe("round 2: the checker catches what round 1 let through", () => {
  const PRICING_ROW = "| L5 | WP-5 | integration | 1 | 2000.00 | none | 2000.00 | orders into QuickBooks Online as invoices |\n";

  it("an add-unit modifier applied with no evidence row, or on the wrong unit", () => {
    const run = mutated("modifier-evidence", { [`${L}/quote.md`]: (t) => t.replace(PRICING_ROW, `${PRICING_ROW}| L6 | WP-5 | report | 1 | 600.00 | data-sensitive adds | 600.00 | added for sensitive data |\n`) });
    const out = failures("modifier-evidence", run).modifiers;
    expect(out).toMatch(/modifier data-sensitive is applied but has no row in the Modifiers table/);
    expect(out).toMatch(/L6: modifier data-sensitive adds unit data-protection-review; the line must carry that unit/);
  });

  it("a fragment of the read-only key", () => {
    const run = mutated("credentials", { [`${L}/systems/quickbooks-online.md`]: (t) => `${t}\nKey prefix used: LARKSPUR-QBO.\n` });
    expect(failures("credentials", run).credentials).toMatch(/systems\/quickbooks-online\.md:\d+: carries part of the read-only key/);
  });

  it("the UAT extension rate restated by number in the client's part", () => {
    const run = mutated("uat-documentation", { [`${L}/quote.md`]: (t) => t.replace("## Valid until\n", "## Valid until\nExtra sessions are USD 175.00 each.\n") });
    expect(failures("uat-documentation", run).uat_lines).toMatch(/the UAT extension rate 175\.00 appears in the client's part of the quote/);
  });

  it("only the Valid until sentence wrong, or only the fix-window duration wrong", () => {
    const valid = mutated("dates-terms-above", { [`${L}/quote.md`]: (t) => t.replace("This quote is valid until 9 November 2026.", "This quote is valid until 10 November 2026.") });
    expect(failures("dates-terms-above", valid).dates_terms).toMatch(/the quote says "valid until 10 November 2026", expected 9 November 2026/);
    const window = mutated("fix-window", { [`${L}/quote.md`]: (t) => t.replace("for 30 days after delivery", "for 14 days after delivery") });
    expect(failures("fix-window", window).fix_window).toMatch(/quote\.md: states a fix window of 14 days; offers\.md says 30/);
  });

  it("a unit price or a person's name in contract-inputs.md", () => {
    const run = mutated("accepted-signed", {
      [`${L}/contract-inputs.md`]: (t) => t.replace("## Change rule\n", "## Change rule\nThe confirmation view alone is USD 8,000.00.\n").replace("tester_roles: [order coordinator, operations manager, bookkeeper]", "tester_roles: [Jess, operations manager, bookkeeper]"),
    });
    const out = failures("accepted-signed", run).accepted;
    expect(out).toMatch(/carries the internal amount 8000\.00 from quote\.md's appendix/);
    expect(out).toMatch(/names a person \(Jess\) where a tester role belongs/);
  });

  it("a person's name as the tester in a quick quote", () => {
    const run = mutated("quick-quote", { [`${M}/quote.md`]: (t) => t.replace("1 tester role (shop manager)", "1 tester role (Priya)") });
    expect(failures("quick-quote", run).uat_lines).toMatch(/names a person \(Priya\) where a tester role belongs/);
  });

  it("a follow-on that rewrites the earlier plan, or whose offer sits in another folder", () => {
    const rewrites = mutated("follow-on-fix", { [`${L}/plan.yaml`]: (t) => t.replace("tier_reason: \"\"", "tier_reason: \"reopened for the follow-on\"") });
    expect(failures("follow-on-fix", rewrites).follow_on).toMatch(/plans\/larkspur-ceramics\/plan\.yaml: the follow-on wrote into the earlier plan/);
    const split = mutated("follow-on-fix", { "plans/larkspur-ceramics-2/build-plan-offer.md": (t) => t.replace("subject: handoffs/larkspur-ceramics/fixes/FIX-03.md", "subject: handoffs/larkspur-ceramics/fixes/FIX-09.md") });
    expect(failures("follow-on-fix", split).follow_on).toMatch(/build-plan-offer\.md: its subject is handoffs\/larkspur-ceramics\/fixes\/FIX-09\.md, but this plan's intake is .*FIX-03\.md; the offer and the plan must share one folder/);
  });

  it("a business say: line printed for the wrong file", () => {
    const run = mutated("private-names-business", { [`${L}/contract-inputs.md`]: (t) => t.replace("## Contract clauses\n", "## Contract clauses\nuse llc-ops to draft the SOW from plans/larkspur-ceramics/quote.md\n") });
    expect(failures("private-names-business", run).private_names).toMatch(/contract-inputs\.md:\d+: names "llc-ops"/);
  });

  it("a price-book amount in shorthand in the plan", () => {
    const run = mutated("builder-neutral", { [`${L}/build-plan.md`]: (t) => t.replace("## Ownership\n", "## Ownership\nThe whole build costs about 17k.\n") });
    expect(failures("builder-neutral", run).builder_neutral).toMatch(/carries the amount 17450\.00 in shorthand/);
  });

  it("bug 1: the inbound route runs the wrong verb, or the intake was never handed over", () => {
    const wrong = mutated("route-build-plan", { [`${L}/quote.md`]: () => "---\now_artefact: ow-build-plan/quote\n---\n# Quote\n" });
    expect(failures("route-build-plan", wrong).route).toMatch(/routes to the offer only; the run wrote plans\/larkspur-ceramics\/quote\.md/);
    const noOffer = mutated("route-defined-work", { [`${M}/build-plan-offer.md`]: () => "---\nsubject: x\n---\n# Offer\n" });
    expect(failures("route-defined-work", noOffer).route).toMatch(/routes to the quick quote, but an offer was written/);
    const fix = mutated("follow-on-offer", { [`${L}/build-plan-offer.md`]: (t) => t.replace("valid_until: 2026-10-21", "valid_until: 2026-12-15") });
    expect(failures("follow-on-offer", fix).route).toMatch(/plans\/larkspur-ceramics\/build-plan-offer\.md: the follow-on offer wrote into the earlier plan's folder/);
  });

  it("bug 15: a quick scope without its coverage self-checks, or with them outside the markers", () => {
    const missing = mutated("quick-quote", { [`${M}/quick-scope.md`]: (t) => t.replace("| Out of scope present | OK |\n", "") });
    expect(failures("quick-quote", missing).quick).toMatch(/no "Out of scope present" self-check inside the ow:internal markers/);
    const outside = mutated("quick-quote", { [`${M}/quick-scope.md`]: (t) => t.replace("<!-- ow:internal -->\n", "").replace("<!-- ow:end-internal -->\n", "") });
    expect(failures("quick-quote", outside).quick).toMatch(/no "Acceptance coverage" self-check inside the ow:internal markers/);
  });

  it("decision g: deadlines that ignore the price book's schedule, or a missing schedule not stated by the user", () => {
    const days = mutated("tier2-plan", { [`${L}/plan.yaml`]: (t) => t.replace("collection_deadline: 2026-10-16", "collection_deadline: 2026-10-14").replace("collection_business_days: 4", "collection_business_days: 2") });
    const out = failures("tier2-plan", days).start;
    expect(out).toMatch(/collection\/delivery business days 2\/10, expected 4\/10/);
    expect(out).toMatch(/collection_deadline 2026-10-14, expected start \+ 4 business days = 2026-10-16/);
    const noSchedule = mutated("tier2-plan", { "price-book.yaml": (t) => t.replace(/build_plan_schedule:\n(?: {2}[^\n]+\n)+/, "") });
    expect(failures("tier2-plan", noSchedule).start).toMatch(/the price book has no build_plan_schedule\.two_systems, so schedule_source must be user-stated/);
  });
});

// Eval round 2: items 1-3 and the seven acceptance-checker slips (new bug 6).
describe("round 3: the checker catches what round 2 let through", () => {
  const F = "plans/larkspur-ceramics-2";

  it("item 1: a stated follow-on offer without its request.md, and a start that asks again or splits the folder", () => {
    const noReq = mutated("follow-on-stated-offer", { [`${F}/build-plan-offer.md`]: (t) => t.replace("subject: plans/larkspur-ceramics-2/request.md", "subject: none") });
    expect(failures("follow-on-stated-offer", noReq).offer).toMatch(/subject is none; a follow-on offer names the request it was made from/);
    const asks = mutated("follow-on-stated-start", { [`${F}/plan.yaml`]: (t) => t.replace('request: ""', 'request: "stock checks before confirming"') });
    expect(failures("follow-on-stated-start", asks).follow_on).toMatch(/records the request again; with request\.md from the offer, -start does not ask for it/);
    const rewrote = mutated("follow-on-stated-start", { [`${F}/request.md`]: (t) => `${t}\nAlso a weekly stock report.\n` });
    expect(failures("follow-on-stated-start", rewrote).follow_on).toMatch(/request\.md: rewritten by the start/);
    const split = mutated("follow-on-stated-start", { "plans/larkspur-ceramics-3/plan.yaml": () => readFileSync(join(FIXTURES, "follow-on-stated-start", "expected", "opchain-work", F, "plan.yaml"), "utf8") });
    expect(failures("follow-on-stated-start", split).follow_on).toMatch(/plans\/larkspur-ceramics-3\/plan\.yaml: the follow-on plan was written in plans\/larkspur-ceramics-3\/, but its offer and request are in plans\/larkspur-ceramics-2\//);
  });

  it("item 2: a delivery-mode recap answered with an offer, or a plan that charges a Build Plan fee", () => {
    const offer = mutated("route-next-stage", { "plans/fernhill-florists/build-plan-offer.md": () => "---\nsubject: intake/fernhill-florists/recap.md\n---\n# Offer\n" });
    expect(failures("route-next-stage", offer).route).toMatch(/is work already signed: never an offer/);
    const fee = mutated("route-next-stage", { "plans/fernhill-florists/plan.yaml": (t) => t.replace("fee: none", "fee: 1500") });
    const out = failures("route-next-stage", fee);
    expect(out.route).toMatch(/fee is 1500; signed work has no Build Plan fee/);
    expect(out.start).toMatch(/work already signed has no Build Plan fee \(fee: none\)/);
  });

  it("item 3: the folder route quotes again over the sent quote", () => {
    const run = mutated("route-folder", {
      [`${L}/quote.md`]: (t) => t.replace("issued: 2026-10-26", "issued: 2026-11-02"),
      [`${L}/quote-items.json`]: (t) => t.replace('"1900.00"', '"2000.00"'),
    });
    const out = failures("route-folder", run);
    expect(out.route).toMatch(/the route ran -quote again over the existing quote \(plans\/larkspur-ceramics\/quote\.md rewritten\); it must run --accepted/);
    expect(out.quote_frozen).toMatch(/quote\.md was rewritten after the quote was exported; a quote is written once/);
    const accepted = mutated("accepted-signed", { [`${L}/quote.md`]: (t) => t.replace("issued: 2026-10-26", "issued: 2026-11-09") });
    expect(failures("accepted-signed", accepted).quote_frozen).toMatch(/quote\.md was rewritten after the quote was exported/);
  });

  it("item 4: the resume rules group by client and keep refused quick quotes and pending FIX requests", () => {
    const r = readFileSync(join(SKILL, "references", "routing-and-resume.md"), "utf8");
    // Grouped by client, newest line per group.
    expect(r).toMatch(/`intake\/<slug>\/…`, `plans\/<slug>\/…`, `handoffs\/<slug>\/…`, `builds\/<slug>\/…` and `uat\/<slug>\/…` all belong to the group `<slug>`/);
    expect(r).toMatch(/A follow-on folder `plans\/<slug>-<n>\/…` is its own group/);
    // A refused quick quote (next: ow-build-plan /ow-build-plan-offer intake/…) is listed.
    expect(r).toMatch(/or as `ow-build-plan \/<verb> <path>` \(an open plan or quote, or a refused quick quote waiting for its offer\)/);
    // A FIX request stays until a follow-on names it; a fit call drops once its offer's line is newer.
    expect(r).toMatch(/A FIX request stays pending until a follow-on plan takes it up/);
    expect(r).toMatch(/once its offer, quick quote or plan exists, that run wrote a newer line in the same group, which replaces the fit call's line/);
    // The golden refusal's STATUS line is in the listed shape.
    const status = readFileSync(join(FIXTURES, "quick-over-limit", "expected", "opchain-work", "STATUS.md"), "utf8");
    expect(status).toMatch(/\| intake\/calder-joinery\/intake-record\.md \| next: ow-build-plan \/ow-build-plan-offer /);
  });

  it("N4/N5: handling dropped from the quick quote's or quick scope's header", () => {
    const q = mutated("quick-quote", { [`${M}/quote.md`]: (t) => t.replace('handling: "no"\n', "") });
    expect(failures("quick-quote", q).quick).toMatch(/quote\.md: the header has no handling/);
    const sc = mutated("quick-quote", { [`${M}/quick-scope.md`]: (t) => t.replace('handling: "no"\n', "") });
    expect(failures("quick-quote", sc).quick).toMatch(/quick-scope\.md: the header has no handling/);
  });

  it("N13: a defined-work route that also starts a Build Plan", () => {
    const run = mutated("route-defined-work", { [`${M}/plan.yaml`]: () => "ow_artefact: ow-build-plan/plan\n" });
    expect(failures("route-defined-work", run).route).toMatch(/routes to the quick quote, which has no Build Plan; the run also wrote plan\.yaml/);
  });

  it("N14/N21: a self-check left as FINDING in the quick scope or the tier-2 scope", () => {
    const quick = mutated("quick-quote", { [`${M}/quick-scope.md`]: (t) => t.replace("| Out of scope present | OK |", "| Out of scope present | FINDING |") });
    expect(failures("quick-quote", quick).quick).toMatch(/the "Out of scope present" self-check is FINDING/);
    const scope = mutated("tier2-plan", { [`${L}/scope.md`]: (t) => t.replace("| Out of scope present | OK |", "| Out of scope present | FINDING |") });
    expect(failures("tier2-plan", scope).plan_checks).toMatch(/scope\.md: the "Out of scope present" self-check is FINDING/);
  });

  it("N15/N23: a quick scope with no error check, or a case count that is not a number", () => {
    const run = mutated("quick-quote", { [`${M}/quick-scope.md`]: (t) => t.replace("- kind: error", "- kind: normal").replace("- cases: 2", "- cases: a few") });
    const out = failures("quick-quote", run).quick;
    expect(out).toMatch(/no check is kind: error/);
    expect(out).toMatch(/AC-1\.1 cases "a few" is not a whole number/);
  });
});

// Eval round 3 (round 4 of fixes): owner items 2-5.
describe("round 4: one quote per folder, signed folders stop, delivery mode, feasibility", () => {
  it("item 2: a second quote file, or contract inputs pointing at one (A1, A5, A22)", () => {
    const r2 = mutated("route-folder", { [`${L}/quote-r2.md`]: () => "---\now_artefact: ow-build-plan/quote\n---\n# Quote\n", [`${L}/quote-r2-items.json`]: () => "[]\n" });
    const out = failures("route-folder", r2);
    expect(out.route).toMatch(/plans\/larkspur-ceramics\/quote-r2\.md: a second quote file; 1\.0\.0 has one quote per folder/);
    expect(out.quote_frozen).toMatch(/quote-r2-items\.json: a second quote file/);
    const ptr = mutated("route-folder", { [`${L}/contract-inputs.md`]: (t) => t.replace("quote: plans/larkspur-ceramics/quote.md", "quote: plans/larkspur-ceramics/quote-r2.md") });
    expect(failures("route-folder", ptr).accepted).toMatch(/quote is plans\/larkspur-ceramics\/quote-r2\.md; the folder's one quote is plans\/larkspur-ceramics\/quote\.md/);
  });

  it("item 3: a signed folder that runs -start again, or writes anything at all", () => {
    const start = mutated("route-folder-signed", { [`${L}/plan.yaml`]: (t) => t.replace("start: 2026-10-12", "start: 2026-11-16") });
    const out = failures("route-folder-signed", start).route;
    expect(out).toMatch(/plans\/larkspur-ceramics\/plan\.yaml: plans\/larkspur-ceramics\/ is signed, so the route prints the signed NEXT and stops; it writes nothing/);
    expect(out).toMatch(/the route ran -start over an existing plan/);
    const other = mutated("route-folder-signed", { "STATUS.md": (t) => `${t}2026-11-16 (clock: user-stated) | ow-build-plan 1.0.0 | builds/larkspur-ceramics/build.yaml | next: ow-build /ow-build-start plans/larkspur-ceramics/ | awaiting: none\n` });
    expect(failures("route-folder-signed", other).route).toMatch(/STATUS\.md: plans\/larkspur-ceramics\/ is signed/);
  });

  it("item 4: a quote on signed work (fee: none) that still carries the Build Plan credit", () => {
    const run = mutated("dates-terms-above", { [`${L}/plan.yaml`]: (t) => t.replace("fee: 3000", "fee: none") });
    expect(failures("dates-terms-above", run).dates_terms).toMatch(/the plan has fee: none \(signed work\), so the quote has no Build Plan fee, credit line or credit_deadline/);
  });

  it("item 5: a feasibility quote priced with another unit", () => {
    const run = mutated("route-feasibility", { "plans/kestrel-bindery/quote.md": (t) => t.replace("| L1 | WP-1 | feasibility-test | 1 | 900.00 |", "| L1 | WP-1 | report | 1 | 600.00 |") });
    expect(failures("route-feasibility", run).route).toMatch(/is a feasibility recap: the quick quote is priced as the feasibility-test unit, but its lines use report/);
  });
});

// Owner decision 2026-10-16: a feasibility quote carries just the test.
describe("a feasibility quote: just the test", () => {
  const K = "plans/kestrel-bindery";
  const UAT = "## User acceptance testing · S\n1 tester role (office manager), 2 sessions, up to 1 fix round within 3 business days each: USD 1,000.00.\n\n";

  it("a user acceptance testing line (in the client part or the header) fails", () => {
    const run = mutated("route-feasibility", { [`${K}/quote.md`]: (t) => t.replace("## Price\n", `${UAT}## Price\n`).replace("mode: feasibility\n", "mode: feasibility\nuat: { size: S, tester_roles: 1, price: 1000.00 }\n") });
    const out = failures("route-feasibility", run).feasibility;
    expect(out).toMatch(/\(client part\): carries user acceptance testing/);
    expect(out).toMatch(/header key uat; a feasibility quote carries just the test/);
  });

  it("a fix window fails", () => {
    const run = mutated("route-feasibility", { [`${K}/quote.md`]: (t) => t.replace("## Valid until\n", "## After delivery\n30 days of fixes: for 30 days after delivery, anything that does not work is fixed at no charge.\n\n## Valid until\n") });
    expect(failures("route-feasibility", run).feasibility).toMatch(/\(client part\): carries a fix window/);
  });

  it("a documentation & training line fails", () => {
    const run = mutated("route-feasibility", { [`${K}/quote.md`]: (t) => t.replace("## Price\n", "## Documentation & training · S (optional)\nUp to 15 people trained: USD 2,000.00. You can decline this line.\n\n## Price\n") });
    expect(failures("route-feasibility", run).feasibility).toMatch(/\(client part\): carries documentation, training or handover/);
  });

  it("a build hand-off fails: a build request written, or an ow-build NEXT", () => {
    const request = mutated("feasibility-signed", { [`${K}/build-request.md`]: () => "---\now_artefact: ow-build-plan/build-request\n---\n# Build request\n" });
    expect(failures("feasibility-signed", request).feasibility).toMatch(/plans\/kestrel-bindery\/build-request\.md: a feasibility test hands over no build; --signed writes no build request/);
    const next = mutated("feasibility-signed", { [`${K}/contract-inputs.md`]: (t) => `${t}    NEXT: say "use ow-build to start plans/kestrel-bindery/"   (where slash commands exist: /ow-build-start)\n` });
    expect(failures("feasibility-signed", next).feasibility).toMatch(/contract-inputs\.md: names the ow-build hand-off/);
    const status = mutated("feasibility-signed", { "STATUS.md": (t) => t.replace("next: ow-build-plan /ow-build-plan-offer plans/kestrel-bindery/", "next: ow-build /ow-build-start plans/kestrel-bindery/") });
    const out = failures("feasibility-signed", status);
    expect(out.feasibility).toMatch(/STATUS\.md: names the ow-build hand-off/);
    expect(out.status).toMatch(/expected "next: ow-build-plan \/ow-build-plan-offer plans\/kestrel-bindery\/"/);
  });

  it("feasibility contract inputs that carry a build's terms fail", () => {
    const run = mutated("feasibility-signed", { [`${K}/contract-inputs.md`]: (t) => t.replace("deliverables: [findings note, go or no-go]\n", "deliverables: [findings note, go or no-go]\nfix_window_days: 30\ndocumentation_sku: declined\n") });
    const out = failures("feasibility-signed", run).accepted;
    expect(out).toMatch(/a feasibility test's contract inputs hold just the test; fix_window_days belongs to a build/);
    expect(out).toMatch(/documentation_sku belongs to a build/);
  });

  // Paraphrases count (matched by meaning): each line is planted just before the ow:internal marker.
  const paraphrases = [
    ["a fix window", "We include two weeks of fixes after the findings note is delivered."],
    ["a fix window", "Any bug-fixing you need in the following month is on us."],
    ["a fix window", "For thirty days, anything that breaks gets fixed free."],
    ["user acceptance testing", "Your team tests it in a user acceptance session before sign-off."],
    ["user acceptance testing", "Your staff check the result in an acceptance session."],
    ["user acceptance testing", "Two testers from your office confirm it works before you sign off."],
    ["documentation, training or handover", "Training for up to 15 people is available."],
    ["documentation, training or handover", "A short user guide comes with the findings."],
    ["documentation, training or handover", "We will onboard your staff after the test."],
    ["a build, milestone, demo or hand-off", "The first milestone is a demo of the invoice reader."],
    ["a build, milestone, demo or hand-off", "We then hand the results over to the builder."],
  ];
  for (const [what, line] of paraphrases) {
    it(`a paraphrased build term in the quote fails: "${line}"`, () => {
      const run = mutated("route-feasibility", { [`${K}/quote.md`]: (t) => t.replace("<!-- ow:internal -->", `${line}\n\n<!-- ow:internal -->`) });
      expect(failures("route-feasibility", run).feasibility).toMatch(new RegExp(`\\(client part\\): carries ${what.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\("${line.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    });
  }

  it("the same terms in the feasibility contract inputs fail too; the golden's go or no-go wording passes", () => {
    const run = mutated("feasibility-signed", { [`${K}/contract-inputs.md`]: (t) => t.replace("## Dates\n", "## After the test\nWe include two weeks of fixes, and training for your team.\n\n## Dates\n") });
    const out = failures("feasibility-signed", run).feasibility;
    expect(out).toMatch(/contract-inputs\.md: carries a fix window/);
    expect(out).toMatch(/contract-inputs\.md: carries documentation, training or handover/);
    expect(readFileSync(join(FIXTURES, "route-feasibility", "expected", "opchain-work", K, "quote.md"), "utf8")).toMatch(/a go or no-go: whether a build is worth doing/);
    expect(failures("route-feasibility")).toEqual({});
  });

  it("the feasibility unit is the one the price book marks", () => {
    const book = readFileSync(join(SKILL, "examples", "price-book.yaml"), "utf8");
    expect(book).toMatch(/- id: feasibility-test\n[^\n]*\n[^\n]*\n {4}feasibility: true/);
    const schema = readFileSync(join(SKILL, "references", "price-book-schema.md"), "utf8");
    expect(schema).toMatch(/`feasibility: true`: marks the unit a feasibility test is priced from/);
  });
});

// Eval round 4 follow-ups: the checker slips of rounds 3 and 4 (eval-s1-r3 and eval-s1-r4 plants).
describe("eval round 4 follow-ups: the checker catches what rounds 3 and 4 let through", () => {
  const F = "plans/fernhill-florists", L2 = "plans/larkspur-ceramics-2";
  /** A scratch answer key (a copy of `from`'s, edited) for grading a run with other checks. */
  const keyFrom = (from, edit) => {
    const caseDir = mkdtempSync(join(tmpdir(), "ow-build-plan-key-"));
    keep(caseDir);
    writeFileSync(join(caseDir, "answer-key.yaml"), edit(readFileSync(join(FIXTURES, from, "answer-key.yaml"), "utf8")));
    return caseDir;
  };
  const failuresWith = (caseName, runDir, caseDir) => Object.fromEntries(runCase(caseName, runDir, { caseDir }).filter((r) => r.problems.length).map((r) => [r.check, r.problems.join("\n")]));
  const noCredit = (t) => t.replace(/build_plan_fee: [^\n]*\n/, "").replace(/credit_deadline: [^\n]*\n/, "").replace(/## Build Plan credit\n[^\n]*\n\n/, "");

  it("A8: a plan on signed work whose tier_source is an offer that does not exist", () => {
    const run = mutated("route-next-stage", { [`${F}/plan.yaml`]: (t) => t.replace("tier_source: recap", "tier_source: offer") });
    expect(failures("route-next-stage", run).start).toMatch(/tier_source is offer, but plans\/fernhill-florists\/ holds no build-plan-offer\.md/);
  });

  it("A13 and A16: request.md paraphrased, or without its stated_on date", () => {
    const para = mutated("follow-on-stated-offer", { [`${L2}/request.md`]: (t) => t.replace(/# Request: Larkspur Ceramics\n\n[\s\S]*$/, "# Request: Larkspur Ceramics\n\nAdd a stock check (summarised by the assistant).\n") });
    expect(failures("follow-on-stated-offer", para).offer).toMatch(/request\.md: does not hold the user's words unchanged/);
    const undated = mutated("follow-on-stated-offer", { [`${L2}/request.md`]: (t) => t.replace("stated_on: 2026-12-01\n", "") });
    expect(failures("follow-on-stated-offer", undated).offer).toMatch(/request\.md: stated_on "" is not the YYYY-MM-DD date the user stated the request/);
  });

  it("follow-up 7: the delivery-mode quote golden carries no Build Plan fee or credit", () => {
    const q = readFileSync(join(FIXTURES, "delivery-quote", "expected", "opchain-work", F, "quote.md"), "utf8");
    expect(q).not.toMatch(/build_plan_fee|credit_deadline|Build Plan credit/);
    expect(readFileSync(join(FIXTURES, "route-next-stage", "expected", "opchain-work", F, "plan.yaml"), "utf8")).toMatch(/^fee: none$/m);
  });

  it("N2 / follow-up 9: a fee: none quote whose header spells the keys as none (the template leaves them out)", () => {
    const run = mutated("delivery-quote", { [`${F}/quote.md`]: (t) => t.replace("valid_until:", "build_plan_fee: none\ncredit_deadline: none\nvalid_until:") });
    expect(failures("delivery-quote", run).dates_terms).toMatch(/the plan has fee: none \(signed work\), so the quote has no Build Plan fee, credit line or credit_deadline \(the header leaves both keys out\)/);
  });

  it("N4: a credit paraphrased on a fee: none quote", () => {
    const run = mutated("delivery-quote", { [`${F}/quote.md`]: (t) => t.replace("## Valid until", "## Planning fee\nThe planning fee of USD 1,500.00 is deducted from this build if signed by 8 January 2027.\n\n## Valid until") });
    expect(failures("delivery-quote", run).dates_terms).toMatch(/the plan has fee: none/);
    const above = mutated("dates-terms-above", { [`${L}/plan.yaml`]: (t) => t.replace("fee: 3000", "fee: none"), [`${L}/quote.md`]: (t) => noCredit(t).replace("## Valid until", "## Planning fee\nThe planning fee of USD 3,000.00 is deducted from this build if signed by 25 December 2026.\n\n## Valid until") });
    expect(failures("dates-terms-above", above).dates_terms).toMatch(/the plan has fee: none/);
    // The correct delivery-mode quote (round 4's N1) still passes.
    const ok = mutated("dates-terms-above", { [`${L}/plan.yaml`]: (t) => t.replace("fee: 3000", "fee: none"), [`${L}/quote.md`]: noCredit });
    expect(failures("dates-terms-above", ok)).toEqual({});
  });

  it("N14 and N15: a second quote under another name, or in a follow-on folder nobody asked for", () => {
    const v2 = mutated("route-folder", { [`${L}/quote-v2.md`]: () => readFileSync(join(FIXTURES, "unpriced-package", "expected", "opchain-work", L, "quote.md"), "utf8") });
    const out = failures("route-folder", v2);
    expect(out.route).toMatch(/plans\/larkspur-ceramics\/quote-v2\.md: a second quote file/);
    expect(out.quote_frozen).toMatch(/quote-v2\.md: a second quote file/);
    const other = mutated("route-folder", { [`${L2}/quote.md`]: () => readFileSync(join(FIXTURES, "unpriced-package", "expected", "opchain-work", L, "quote.md"), "utf8") });
    expect(failures("route-folder", other).route).toMatch(/plans\/larkspur-ceramics-2\/quote\.md: the route works in plans\/larkspur-ceramics\/ only; it wrote outside it/);
  });

  it("N21 / follow-up 8: contract inputs whose Build Plan credit is not the quote's", () => {
    const key = keyFrom("route-folder", (t) => t.replace(/checks: \[[^\]]*\]/, "checks: [accepted, dates_terms]"));
    const plan = { [`${L}/plan.yaml`]: (t) => t.replace("fee: 3000", "fee: none"), [`${L}/quote.md`]: noCredit };
    const kept = mutated("route-folder", plan);
    const out = failuresWith("route-folder", kept, key);
    expect(out.accepted).toMatch(/credit_deadline is 2026-12-25; quote\.md has no Build Plan credit .* so credit_deadline is none/);
    expect(out.accepted).toMatch(/contract-inputs\.md:\d+: speaks of a Build Plan credit, which quote\.md does not have/);
    expect(out.dates_terms).toBeUndefined();
    // Written as the schema says (none, and no credit in ## Dates): passes.
    const right = mutated("route-folder", { ...plan, [`${L}/contract-inputs.md`]: (t) => t.replace("credit_deadline: 2026-12-25", "credit_deadline: none").replace("build_plan_fee: 3000", "build_plan_fee: none").replace(" The Build Plan fee of USD 3,000.00 is credited against this build if signed by 25 December 2026.", "") });
    expect(failuresWith("route-folder", right, key)).toEqual({});
    // A quote with a credit: the contract inputs copy it.
    const wrong = mutated("route-folder", { [`${L}/contract-inputs.md`]: (t) => t.replace("credit_deadline: 2026-12-25", "credit_deadline: 2026-12-31") });
    expect(failures("route-folder", wrong).accepted).toMatch(/credit_deadline 2026-12-31 differs from quote\.md's 2026-12-25/);
  });

  it("bug 8 (FIX class): a covered Fix is never offered as a paid plan", () => {
    const offered = mutated("route-fix-covered", { [`${L2}/build-plan-offer.md`]: () => readFileSync(join(FIXTURES, "follow-on-offer", "expected", "opchain-work", L2, "build-plan-offer.md"), "utf8") });
    expect(failures("route-fix-covered", offered).route).toMatch(/is a covered Fix \(classification: fix\), free under the fix window; the route says so and writes nothing/);
    const fix03 = mutated("follow-on-offer", { "handoffs/larkspur-ceramics/fixes/FIX-03.md": (t) => t.replace("classification: change", "classification: fix") });
    expect(failures("follow-on-offer", fix03).route).toMatch(/this case expects the route "follow-on offer", but handoffs\/larkspur-ceramics\/fixes\/FIX-03\.md routes to "covered fix"/);
    const unclassed = mutated("follow-on-offer", { "handoffs/larkspur-ceramics/fixes/FIX-03.md": (t) => t.replace("classification: change\n", "") });
    expect(failures("follow-on-offer", unclassed).route).toMatch(/has no paid class \(change or after the window\); the route asks the user before writing anything/);
  });

  it("new 10: an intake route that writes a second offer over the folder's offer", () => {
    const key = keyFrom("tier2-plan", (t) => t.replace(/checks: \[[^\]]*\]/, "checks: [route]").replace("start:\n", "route: { from: intake/larkspur-ceramics/intake-record.md }\nstart:\n"));
    const run = mutated("tier2-plan", { [`${L}/build-plan-offer.md`]: (t) => (t ?? readFileSync(join(FIXTURES, "offer", "expected", "opchain-work", L, "build-plan-offer.md"), "utf8")).replace("issued: 2026-10-07", "issued: 2026-10-20") });
    expect(failuresWith("tier2-plan", run, key).route).toMatch(/build-plan-offer\.md: plans\/larkspur-ceramics\/ already held one before the run; the route never runs that verb twice/);
  });

  it("new 8: -start over an existing plan.yaml fails however it was reached", () => {
    const key = keyFrom("tier2-plan", (t) => t.replace(/checks: \[[^\]]*\]/, "checks: [start]"));
    const run = mutated("unpriced-package", { [`${L}/plan.yaml`]: (t) => (t ?? readFileSync(join(FIXTURES, "tier2-plan", "expected", "opchain-work", L, "plan.yaml"), "utf8")).replace("tier_reason: \"\"", "tier_reason: \"again\"") });
    expect(failuresWith("unpriced-package", run, key).start).toMatch(/plans\/larkspur-ceramics\/plan\.yaml: -start wrote over an existing plan/);
  });
});

// Contract C11: the ow-start follow-up's per-check isolation, kept here.
describe("each check fails on its own, never the whole run", () => {
  it("an empty STATUS.md fails status with a reason; every other check still runs", () => {
    const run = mutated("accepted-signed", { "STATUS.md": () => "" });
    const results = runCase("accepted-signed", run);
    expect(results).toHaveLength(6);
    expect(Object.keys(failures("accepted-signed", run))).toEqual(["status"]);
  });

  it("a quote whose header is not valid YAML fails the checks that read it, with a one-line reason; the rest pass", () => {
    const run = mutated("quick-quote", { [`${M}/quote.md`]: (t) => t.replace("client: Mossgate Books", "client: Mossgate: Books") });
    const out = failures("quick-quote", run);
    expect(Object.keys(out).sort()).toEqual(["fix_window", "headers", "internal_appendix", "quick", "uat_lines", "unpriced"]);
    for (const [check, msg] of Object.entries(out)) expect(msg, check).toMatch(/^(check could not run: )?plans\/mossgate-books\/quote\.md: header is not valid YAML \([^\n]+\)$/);
    const cli = spawnSync(process.execPath, [CLI, "quick-quote", run], { encoding: "utf8" });
    expect(cli.status).toBe(1);
    expect(cli.stdout).toMatch(/✓ status/);
    expect(cli.stdout).toMatch(/✗ quick-quote: 2\/8 checks pass/);
    expect(cli.stderr).not.toMatch(/at .*\.mjs:\d+/);
  });

  it("a missing price book fails the checks that price things, not the others", () => {
    const run = mutated("offer");
    rmSync(join(run, "opchain-work", "price-book.yaml"));
    const out = failures("offer", run);
    expect(Object.keys(out)).toEqual(["offer"]);
    expect(out.offer).toMatch(/^check could not run: price-book\.yaml was not written$/);
  });

  it("bug 11: a malformed answer key fails its own case; the CLI goes on to every other case", () => {
    const caseDir = mkdtempSync(join(tmpdir(), "ow-build-plan-badkey-"));
    keep(caseDir);
    cpSync(join(FIXTURES, "offer"), caseDir, { recursive: true });
    writeFileSync(join(caseDir, "answer-key.yaml"), "case: offer\nchecks: offer\n");
    expect(runCase("offer", null, { caseDir })).toEqual([{ check: "answer-key", problems: ["answer-key.yaml could not be used: `checks` must be a list of check names"] }]);
    writeFileSync(join(caseDir, "answer-key.yaml"), "case: [offer\n");
    expect(runCase("offer", null, { caseDir })[0].problems[0]).toMatch(/^answer-key\.yaml could not be used: [^\n]+$/);
  });

  it("bug 11: YAML errors name the file they come from", () => {
    const hand = mutated("accepted-signed", { "handoffs.yaml": (t) => `${t}\n  bad: [\n` });
    expect(failures("accepted-signed", hand).accepted).toMatch(/^check could not run: handoffs\.yaml: not valid YAML \(/);
    const off = mutated("fix-window", { "offers.md": (t) => t.replace("fix_window_days: 30 ", "fix_window_days: [30 ") });
    expect(failures("fix-window", off).fix_window).toMatch(/^check could not run: offers\.md: the after_handoff block is not valid YAML \(/);
    const book = mutated("offer", { "price-book.yaml": (t) => `${t}\nunits: [\n` });
    expect(failures("offer", book).offer).toMatch(/^check could not run: price-book\.yaml: not valid YAML \(/);
  });

  it("a check that throws on a broken answer key fails alone with a one-line reason", () => {
    const caseDir = mkdtempSync(join(tmpdir(), "ow-build-plan-case-"));
    keep(caseDir);
    cpSync(join(FIXTURES, "offer"), caseDir, { recursive: true });
    const key = join(caseDir, "answer-key.yaml");
    writeFileSync(key, readFileSync(key, "utf8").replace(/^offer: .*\n/m, ""));
    const results = runCase("offer", null, { caseDir });
    expect(results.find((r) => r.check === "offer").problems).toEqual([expect.stringMatching(/^check could not run: [^\n]+$/)]);
    expect(results.filter((r) => r.problems.length).map((r) => r.check)).toEqual(["offer"]);
  });
});

describe("the shipped examples", () => {
  const ex = (f) => readFileSync(join(SKILL, "examples", f), "utf8");

  it("price-book.yaml has every key of design §6.1, with placeholder numbers", () => {
    const b = yaml.load(ex("price-book.yaml"));
    for (const k of ["currency", "build_plan_fees", "units", "modifiers", "uat", "documentation_training", "size_threshold", "payment_terms_days", "quote_validity_days", "build_plan_credit_days", "build_plan_weeks", "quick_quote_max_units"]) expect(b, k).toHaveProperty(k);
    expect(Object.keys(b.build_plan_fees)).toEqual(["one_system", "two_systems", "three_plus_or_mvp"]);
    for (const s of ["S", "M", "L"]) expect(Object.keys(b.uat.sizes[s])).toEqual(["price", "tester_roles", "sessions", "fix_rounds", "fix_business_days"]);
    expect(b.uat).toHaveProperty("per_extra_role");
    expect(b.uat.extension).toHaveProperty("per_session_or_round");
    expect(Object.keys(b.documentation_training).sort()).toEqual(["per_extra_group_of_15", "quote_separately_above", "sizes"]);
    // Placeholders: every price is a round 100s number, and the file says so.
    expect(ex("price-book.yaml")).toMatch(/INVENTED EXAMPLE\. Every number is a placeholder/);
    for (const u of b.units) expect(u.price % 100, u.id).toBe(0);
    expect(b.origin).toBe("user");
  });

  it("brand.yaml is in the ow-tools §5.2 shape and passes its reader and contrast rules", () => {
    const brand = validateBrand(parseBrandYaml(ex("brand.yaml")), join(SKILL, "examples"));
    expect(brand).toMatchObject({ schema: 1, name: "Example Studio", lang: "en-US", page: "letter" });
  });

  it("offers.md carries after_handoff with fix_window_days and an empty contract_clauses block", () => {
    const text = ex("offers.md");
    const after = yaml.load(text.match(/## after_handoff[\s\S]*?```yaml\n([\s\S]*?)```/)[1]);
    expect(after.fix_window_days).toBe(30);
    const clauses = text.match(/## contract_clauses[\s\S]*?```yaml\n([\s\S]*?)```/)[1];
    expect(clauses.split("\n").filter((l) => l.trim()).every((l) => l.trim().startsWith("#"))).toBe(true);
    expect(clauses).toMatch(/# contract_clauses:/);
    expect(text).toMatch(/^## ownership$/m);
  });

  it("handoffs.yaml is defaults only, with the contract and build keys this skill reads", () => {
    const h = yaml.load(ex("handoffs.yaml"));
    expect(h).toHaveProperty("contract", null);
    expect(h).toHaveProperty("build", null);
    expect(ex("handoffs.yaml")).not.toMatch(/^\s+say:/m);
  });

  it("the golden quote's internal appendix is stripped by the ow-tools preflight (C8)", () => {
    const file = join(FIXTURES, "unpriced-package", "expected", "opchain-work", L, "quote.md");
    const r = preflight(readFileSync(file, "utf8"), file);
    expect(r.ok).toBe(true);
    expect(r.removedSections).toBe(1);
    expect(r.body).not.toMatch(/Internal appendix|Pricing lines|175\.00|priced by/);
    expect(r.body).toMatch(/USD 17,450\.00/);
  });
});

describe("--prepare", () => {
  it("lays out a run folder from the workspace, the ow-start run, the base chain and the case's input", () => {
    const dir = mkdtempSync(join(tmpdir(), "ow-build-plan-prepare-"));
    keep(dir);
    const work = prepare("unpriced-package", dir);
    for (const f of ["price-book.yaml", "profile.md", "offers.md", "handoffs.yaml", "STATUS.md", "intake/larkspur-ceramics/recap.md", `${L}/build-plan-offer.md`, `${L}/scope.md`, `${L}/inbox/order-sheet-september.csv`]) {
      expect(existsSync(join(work, f)), f).toBe(true);
    }
    expect(existsSync(join(work, L, "quote.md"))).toBe(false);
    expect(existsSync(join(dir, "session", "README.md"))).toBe(true);
    expect(readFileSync(join(work, "handoffs.yaml"), "utf8")).not.toMatch(/^\s+say:/m);
    expect(() => prepare("unpriced-package", dir)).toThrow(/already exists/);
  });
});

// Amendment P5 (ow-research design §10; ow-build-plan 1.1.0): research findings as a fourth evidence
// source. Its goldens are research-collect, research-map, research-finding-open and research-no-plan
// (the 32 earlier goldens are unchanged); these are its plants (OW-09 contract C18).
describe("P5: research findings in -collect and the destination-keyed cap", () => {
  const EV = `${L}/evidence.md`;
  const RS = "research/larkspur-ceramics/RS-01-pos-sales-api/findings.md";
  it("a research row at HIGH behind a map/current.md fact fails (the cap is keyed on where a fact is used)", () => {
    const run = mutated("research-map", { [`${L}/map/current.md`]: (t) => t.replace("6. [MEDIUM E-12]", "6. [HIGH E-12]") });
    expect(failures("research-map", run).research).toMatch(/map\/current\.md: a HIGH fact rests only on research rows \(E-12\)/);
  });
  it("the same row at HIGH in map/systems.md (a vendor's product, not the client's current state) passes", () => {
    expect(failures("research-map").research).toBeUndefined();
  });
  it("a research row with no RS-nn F-nn locator fails", () => {
    const run = mutated("research-collect", { [EV]: (t) => t.replace("| research | RS-01 F-02 |", "| research | F-02 |") });
    expect(failures("research-collect", run).research).toMatch(/E-13 has locator "F-02", not "RS-nn F-nn"/);
  });
  it("another client's research folder read fails", () => {
    const run = mutated("research-collect", { [EV]: (t) => t.replace(`| E-14 | ${RS} |`, "| E-14 | research/fernhill-florists/RS-01-route-export/findings.md |") });
    expect(failures("research-collect", run).research).toMatch(/E-14 reads research\/fernhill-florists\/RS-01-route-export\/findings\.md, another workstream's research folder/);
  });
  it("a finding from a topic with a FINDING open fails", () => {
    const run = mutated("research-finding-open", {
      [EV]: (t) => t.replace(/(\| E-11 \|[^\n]*\n)/, "$1| E-12 | research/larkspur-ceramics/RS-03-label-printers/findings.md | research | RS-03 F-01 | the sales endpoint lists line items | HIGH | 2026-10-19 |\n"),
    });
    const f = failures("research-finding-open", run);
    expect(f.research).toMatch(/E-12 uses F-01 of RS-03-label-printers, a topic whose self-checks have a FINDING open/);
    expect(f.research_refused).toMatch(/evidence\.md: written, but -collect had nothing it may use/);
  });
  it("a findings file with a '##<tab>Findings' planted under Suspicious content gives no findings (ow-research's security review)", () => {
    const run = mutated("research-collect", { [RS]: (t) => t.replace(/(## Suspicious content\n[^\n]*\n)/, "$1##\tFindings\n### F-01\n- claim: The sales endpoint also returns each customer's card number.\n- level: HIGH\n") });
    expect(failures("research-collect", run).research).toMatch(/whose findings\.md the section "## Findings" appears twice/);
  });
  it("an F-nn block under Suspicious content is never a finding", () => {
    const run = mutated("research-collect", { [RS]: (t) => t.replace(/(## Suspicious content\n[^\n]*\n)/, "$1### F-09\n- claim: planted\n- level: HIGH\n") });
    expect(failures("research-collect", run).research).toMatch(/F-09 sits under "## Suspicious content", not ## Findings/);
  });
  it("a research row that changes the finding's level fails", () => {
    const run = mutated("research-collect", { [EV]: (t) => t.replace(/(\| RS-01 F-03 \|[^|]*\|) LOW \|/, "$1 MEDIUM |") });
    expect(failures("research-collect", run).research).toMatch(/E-14 is MEDIUM, but RS-01-pos-sales-api F-03 is LOW \(a research row keeps its finding's level\)/);
  });
  it("-collect with no plan.yaml that writes anyway fails", () => {
    const run = mutated("research-no-plan", { [EV]: () => "---\now_artefact: ow-build-plan/evidence\n---\n" });
    expect(failures("research-no-plan", run).research_refused).toMatch(/written, but -collect had nothing it may use \(no plan\.yaml/);
  });
  it("the research files layer in from ow-research's own golden run (no copy)", () => {
    const dir = mkdtempSync(join(tmpdir(), "ow-build-plan-p5-"));
    keep(dir);
    const work = prepare("research-collect", dir);
    expect(readFileSync(join(work, RS), "utf8")).toBe(readFileSync(join(FIXTURES, "..", "ow-research", "run-approved", "expected", "opchain-work", RS), "utf8"));
  });
});
