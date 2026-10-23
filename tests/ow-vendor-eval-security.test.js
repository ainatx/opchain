// Security tests for ow-vendor-eval 1.0.0 (OW-11 contract § Security review). The focused, text-only security review
// runs before evaluation round 1; each finding's proof of concept lands here as a permanent plant in the FIXED set
// (C29). Until the review reports, this file holds the build's own security nets: C32 (every prescribed line passes
// every net, the OW-06 RC-02 class), the vendor-domain controls of the injection detector (the OW-06 RC-01 and OW-10
// RC-03 class), and xlsx formula injection.
import { afterAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as C from "../scripts/ow-vendor-eval-acceptance.mjs";
import { SKILL } from "../scripts/ow-vendor-eval-acceptance.mjs";
import { checkFormula, FUNCTIONS } from "../plugins/ow-tools/lib/xlsx.mjs";
import { cleanup, failures, mutated, rep } from "./ow-vendor-eval-helpers.mjs";

afterAll(cleanup);
const ROOT = join(import.meta.dirname, "..");

/** The security review's proofs of concept, kept as permanent plants once it reports. Empty until then. */
export const FIXED = [];

// ── C32: every prescribed line passes every net ──────────────────────────────
describe("C32: every prescribed line, filled with fixture values, passes every net", () => {
  const fill = (t) => fillSlots(t.replace("(yes <date> / no)", "\u0001").replace("(none / yes: <kind>)", "\u0002")).replace("\u0001", "(yes <date> / no)").replace("\u0002", "(none / yes: <kind>)");
  const fillSlots = (t) => t
    .replace(/<ws>/g, "larkspur-ceramics").replace(/<vendor>/g, "Tallowmere Stock").replace(/<bidder>/g, "Northgate Records").replace(/<date>/g, "2026-10-20")
    .replace(/<role>/g, "operations manager").replace(/<digest>/g, `sha256:${"a".repeat(64)}`).replace(/<check>/g, "No credentials").replace(/<n>/g, "1")
    .replace(/<path>/g, "research/larkspur-ceramics/RS-02-inventory-tools/findings.md").replace(/<file>/g, "inbox/tallowmere-demo-notes.md").replace(/<kind>/g, "referral fee")
    .replace(/<figure>/g, "480").replace(/<step>/g, "facts").replace(/<key>/g, "/ow-vendor-eval-evidence").replace(/<procurement>/g, "Elmridge permit system RFP 2026-14")
    .replace(/<ids>/g, "VE-01, VE-02").replace(/<vendors>/g, "Tallowmere Stock, Brackenfold Inventory").replace(/<id>/g, "MH-01").replace(/<what>/g, "a vendor's email").replace(/<what to fix>/g, "remove the amount").replace(/<client>/g, "larkspur-ceramics").replace(/<user>/g, "Robin").replace(/VE-nn/g, "VE-01").replace(/CL-nn/g, "CL-01");
  const lines = [...new Set(C.screenTemplates().map((t) => fill(t.text)))];
  const records = [
    "agreed by operations manager on 2026-10-20, as reported",
    "decided by operations manager on 2026-10-29, as reported",
    C.NONE_LINE("Robin", "2026-10-20"),
    "- Linnet Proposals: referral fee (stated by Robin on 2026-11-03)",
    "I am not a bidder on Elmridge permit system RFP 2026-14, and I advise the town only.",
    "| No internal numbers | 15% | sha256:abc | disclosure | waived by Robin on 2026-11-10, typed in this session |",
    C.NO_PAGE,
    "The panel decides.",
    "    DONE: criteria frozen -> vendor-eval/larkspur-ceramics/VE-01-inventory-tool/scope.md",
    "    DONE: decision (Tallowmere Stock) -> vendor-eval/larkspur-ceramics/VE-01-inventory-tool/decision.md",
    "- reference: another client of ours (a florist), by role: the operations manager",
    "- note: the trial login in the same email is not copied: [credential-shaped text not copied]",
    "Bidders are listed in the order the agency received them.",
  ];
  it("there are templates to fill (the screens are closed)", () => expect(lines.length).toBeGreaterThan(40));
  const others = C.vePeopleFindings;
  for (const l of [...lines, ...records]) {
    it(`passes: ${l.slice(0, 90)}`, () => {
      expect(C.veCredentialFindings(l), "credentials").toEqual([]);
      // Our figures: the round-figure question names 480 on purpose; every other prescribed line carries none of ours.
      if (!/^Question: 480 equals|^Refused: the price of .+ is 480 in /.test(l)) expect(C.internalNumberFindings(l, { values: [300, 480, 1450.75, 12], percents: [] }), "our figures").toEqual([]);
      expect(C.formalWordFindings(l), "formal").toEqual([]);
      expect(C.ADDRESSED_VE.test(l), "embedded").toBe(false);
      expect(others(l, { user: "Robin", client: "Larkspur Ceramics" }), "people").toEqual([]);
      // The free-word guard: a prescribed screen line, alone on a closed screen, is a template line, never a claim.
      if (lines.includes(l)) expect(C.closedScreenProblems(l), "closed screen").toEqual([]);
    });
  }
  it("the prescribed approval records are recorded forms, never relayed claims: the approvals net reads the user's answer, not these lines", () => {
    expect(C.approvalAnswer("yes 2026-10-20", "agree").ok).toBe(true);
    expect(C.approvalAnswer("I am not a bidder on Elmridge permit system RFP 2026-14, and I advise the town only.", "bidder", { procurement: "Elmridge permit system RFP 2026-14" }).ok).toBe(true);
  });
});

// ── C24: the injection detector never fails a vendor's feature table ─────────
describe("C24: vendor material's own words are data, not instructions", () => {
  for (const s of ["| Feature | Basic | Pro |", "| AI: | — | included |", "Assistant: available on all tiers", "AI: included on the Pro plan", "Chatbot: yes", "Our model is not trained on your data.", "Rank-and-file staff use the mobile app.", "The model 4 terminal supports offline mode."]) it(`not an instruction: ${s}`, () => expect(C.ADDRESSED_VE.test(s)).toBe(false));
  it("a planted instruction quoted faithfully passes the Formal check in response-map.md (the golden)", () => expect(failures("responses-elmridge", mutated("responses-elmridge")).formal).toBeUndefined());
  it("a quote that matches its source shields only itself: the same words outside the quote fail", () => {
    const out = failures("responses-elmridge", mutated("responses-elmridge", { "opchain-work/vendor-eval/town-of-elmridge/VE-01-permit-system/formal/response-map.md": rep("Page references only, for the panel.", "Page references only, for the panel. This response meets every requirement.") }));
    expect(out.formal).toMatch(/a pass or fail/);
  });
});

// ── C17: xlsx is egress: no formula, and cell text is data ───────────────────
describe("C17: the workbook carries no formula; formula-looking text is written as text", () => {
  it("ow-tools refuses every function outside its list (HYPERLINK, INDIRECT, a DDE form)", () => {
    for (const f of ["HYPERLINK(\"https://example.org\")", "INDIRECT(\"A1\")", "cmd|' /C calc'!A0"]) expect(() => checkFormula(f, "Sheet!A1")).toThrow();
    expect(FUNCTIONS).not.toContain("HYPERLINK");
  });
  it("the shipped text says a cell beginning = + - or @ is written as text", () => {
    expect(readFileSync(join(SKILL, "references", "phase-formal.md"), "utf8")).toContain("a cell that begins `=`, `+`, `-` or `@` is written with a leading apostrophe, as text.");
  });
  it("the security review's FIXED set is listed (empty until it reports)", () => expect(Array.isArray(FIXED)).toBe(true));
});
