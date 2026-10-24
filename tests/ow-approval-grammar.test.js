import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { approvedClause, clausesOf, relayedIn, retractedIn, sentencesOf } from "../scripts/lib/approval-grammar.mjs";
import { givenSurnameNames, makePeopleFindings, NON_NAME_WORDS, PHONE, personalDataFindings, recordWords } from "../scripts/lib/people-rules.mjs";
import { docPeopleFindings, successClaims } from "../scripts/ow-documentation-acceptance.mjs";
import * as FIX from "./ow-pr652-shared-fixes-forms.mjs";
import * as care from "../scripts/ow-care-acceptance.mjs";
import * as R3 from "./ow-pr652-round3-forms.mjs";
import * as R2 from "./ow-pr652-evaluator-r2-forms.mjs";
import * as draft from "../scripts/ow-draft-acceptance.mjs";
import * as handoff from "../scripts/ow-handoff-acceptance.mjs";
import * as vendor from "../scripts/ow-vendor-eval-acceptance.mjs";
import * as EVAL from "./ow-pr652-evaluator-forms.mjs";
import * as MINE from "./ow-pr652-builder-forms.mjs";
import { EVALUATOR_VENDOR } from "./ow-pr652-vendor-forms.mjs";

const verb = (text) => /\bapprove\b/i.test(text);
const names = (text, sentence) => /\bC-1\b/.test(sentence);
const grade = (text, profile, options = {}) => approvedClause(text, { profile, verb, accept: names, ...options });

describe("shared approval clause grammar", () => {
  for (const profile of ["draft", "handoff"]) {
    it(`${profile}: accepts affirmative clauses with harmless scope exclusions`, () => {
      for (const text of ["I approve C-1.", "I approve C-1, no changes needed.", "I approve C-1, not C-2.", "C-1 reads well, I approve it."]) expect(grade(text, profile), text).toBe(true);
    });
    it(`${profile}: refuses negation, retraction, conditional and hedged approvals`, () => {
      for (const text of ["I do not approve C-1.", "I approve C-1 if they reply.", "If they reply, I approve C-1.", "I approve C-1, once they reply.", "I think I approve C-1.", "I approve C-1. No, wait.", "Wait, I approve C-1.", "The document says I approve C-1."]) expect(grade(text, profile), text).toBe(false);
    });
    it(`${profile}: always applies the record's target predicate`, () => {
      expect(grade("I approve C-2.", profile)).toBe(false);
      expect(approvedClause("I approve C-1.", { profile, verb, accept: () => false })).toBe(false);
    });
  }
  it("preserves profile-specific scope and negative-content decisions", () => {
    expect(grade("I approve C-1, no conditions attached.", "handoff")).toBe(true);
    expect(approvedClause("No ongoing care.", { profile: "handoff", verb: () => true, allowNo: true })).toBe(true);
    expect(approvedClause("No ongoing care.", { profile: "draft", verb: () => true })).toBe(false);
    expect(grade("After the re-check passed, I approve C-1.", "handoff")).toBe(true);
    expect(grade("After they reply, I approve C-1.", "handoff")).toBe(false);
    expect(grade("I approve C-1. No, ow-care is not installed.", "handoff")).toBe(true);
    expect(grade("I approve C-1. No, ow-care is not installed.", "draft")).toBe(false);
  });
  it("keeps first-person waivers separate from reported client acts and the go-ahead email exception", () => {
    const clientWords = /\bclient\b/i;
    expect(grade("The client said I approve C-1.", "handoff", { relay: "none", clientWords })).toBe(false);
    expect(grade("The client said I approve C-1.", "handoff", { relay: "client", clientWords })).toBe(true);
    expect(grade("My colleague said I approve C-1.", "handoff", { relay: "client", clientWords })).toBe(false);
    const email = "The client's email shows the go-ahead for HELP-01.";
    const opts = { profile: "handoff", verb: (text) => /go-ahead/.test(text), clientWords };
    expect(approvedClause(email, { ...opts, relay: "client" })).toBe(false);
    expect(approvedClause(email, { ...opts, relay: "go-ahead-email" })).toBe(true);
  });
  it("reports a concrete refusal and rejects an invalid rule instead of choosing a default", () => {
    const reasons = [];
    expect(grade("I do not approve C-1.", "handoff", { report: (reason) => reasons.push(reason) })).toBe(false);
    expect(reasons).toContain("declines or says no");
    expect(() => approvedClause("I approve C-1.", { profile: "typo", verb })).toThrow(/unknown approval profile/);
    expect(() => approvedClause("I approve C-1.", { profile: "handoff", verb, relay: "typo" })).toThrow(/unknown approval relay/);
    expect(() => approvedClause("I approve C-1.", { profile: "draft" })).toThrow(/predicate functions/);
  });
  it("keeps clauses and sentence retractions distinct", () => {
    expect(sentencesOf("One. Two; three")).toEqual(["One.", "Two;", "three"]);
    expect(clausesOf("Waive TR-02, but not TR-01 and go.")).toEqual(["Waive TR-02", "but not TR-01", "go"]);
  });
});

// ── PR #652: the approval grammar, the person-name rules and the not-a-bidder statement, held to two form sets ──────────
// tests/ow-pr652-evaluator-forms.mjs is the PR's independent evaluator's untuned set (sha256 286373f9…ea17, hashed before
// the evaluator read any test). tests/ow-pr652-builder-forms.mjs is the builder's own set, written and hashed (f50fdb6e…bf0b)
// before any rule was changed; its rules were then written after the first run showed what it missed, so the builder's
// "after" numbers are tuned and only the evaluator's set is untuned. Both are permanent plants. A form marked "?" in the
// evaluator's set was uncertain to its author and is not asserted.
const sha = (file) => createHash("sha256").update(readFileSync(new URL(file, import.meta.url))).digest("hex");
const wantD = { signoff: { candidate: "C-1" }, client: { candidate: "C-1", role: "the operations manager" }, permission: { what: "name" }, brief: {}, push: { files: ["a.pdf"] }, waiver: { check: "Sources", candidate: "C-1" } };
const wantH = {
  waiver: { id: "TR-01", ids: ["TR-01"], names: ["the trace"], excluded: [] },
  "go-ahead": { id: "HELP-01", names: ["the help request"], role: "operations manager" },
  hours: { id: "HELP-01", names: ["the help request"], hours: 2 },
  keep: { file: "agreed/scope.md", names: ["scope.md"] },
};
const draftAccepts = (kind, text) => draft.sessionApproval(kind, draft.sessionLines(`Robin: ${text}`, "Robin"), wantD[kind]).length === 0;
const handoffAccepts = (kind, text) => handoff.sessionApproval(kind, handoff.sessionEntries(`Robin: ${text}`, "Robin"), wantH[kind], { client: "Larkspur" }).length === 0;

describe("PR #652 form sets are the ones hashed", () => {
  it("the files are byte-identical to the hashed sets", () => {
    expect(sha("./ow-pr652-evaluator-forms.mjs")).toBe("286373f9d57a1c3ca562c9e2648e4b1062711cd7c7a82b805c667ec8ea1eea17");
    expect(sha("./ow-pr652-builder-forms.mjs")).toBe("f50fdb6eb5c9dfa6e5980cefd66d4ebe938db07f3d220704668bfd411b8abf0b");
  });
  it("the sets are large enough to mean something", () => {
    expect(EVAL.DRAFT.length + EVAL.HANDOFF.length).toBeGreaterThanOrEqual(119);
    expect(MINE.DRAFT.length + MINE.HANDOFF.length).toBeGreaterThanOrEqual(80);
    expect(MINE.PEOPLE.length).toBeGreaterThanOrEqual(20);
    expect(MINE.BIDDER.length).toBeGreaterThanOrEqual(10);
  });
});

for (const [label, set] of [["evaluator", EVAL], ["builder", MINE]]) {
  describe(`PR #652 session approvals (${label} set)`, () => {
    for (const [id, kind, text, expected] of set.DRAFT) {
      if (expected.endsWith("?")) continue;
      it(`draft ${id} ${kind}: ${expected === "A" ? "accepts" : "declines"} ${JSON.stringify(text)}`, () => expect(draftAccepts(kind, text)).toBe(expected === "A"));
    }
    for (const [id, kind, text, expected] of set.HANDOFF) {
      if (expected.endsWith("?")) continue;
      it(`handoff ${id} ${kind}: ${expected === "A" ? "accepts" : "declines"} ${JSON.stringify(text)}`, () => expect(handoffAccepts(kind, text)).toBe(expected === "A"));
    }
  });
  describe(`PR #652 people (${label} set): ow-draft, ow-handoff and ow-vendor-eval read the same rules`, () => {
    const ctx = { user: "Robin", client: "Larkspur", names: [] };
    for (const [id, text, person] of set.PEOPLE) {
      it(`${id}: ${person ? "flags" : "passes"} ${JSON.stringify(text)}`, () => {
        expect(draft.peopleFindings(text, ctx).length > 0, "ow-draft").toBe(person);
        expect(handoff.peopleFindings(text, ctx).length > 0 || handoff.peopleBeside(text, "Robin").length > 0, "ow-handoff").toBe(person);
        expect(vendor.vePeopleFindings(text, ctx).length > 0, "ow-vendor-eval").toBe(person);
      });
    }
  });
}

describe("PR #652 decisions the sets rest on", () => {
  it('"C-1 is approved" with no actor is the user\'s own where the record is the user\'s own, in ow-draft and ow-handoff alike', () => {
    expect(draftAccepts("signoff", "C-1 is approved.")).toBe(true);
    expect(handoffAccepts("waiver", "TR-01 is waived.")).toBe(true);
    // ...but never when someone else is the agent, or when the sentence is a relayed report.
    for (const text of ["C-1 is approved by the owner.", "The owner says C-1 is approved.", "Per the ticket, C-1 is approved.", "C-1 is approved, the owner says."]) expect(draftAccepts("signoff", text), text).toBe(false);
    for (const text of ["TR-01 is waived by Pat.", "Per the ticket, TR-01 is waived.", "The client says TR-01 is waived."]) expect(handoffAccepts("waiver", text), text).toBe(false);
    // A reported client act needs the client named, in both skills.
    expect(draftAccepts("client", "C-1 is approved.")).toBe(false);
    expect(handoffAccepts("go-ahead", "HELP-01 is approved.")).toBe(false);
  });
  it("a no or not inside an approval approves its object; scope phrases are not refusals; a bare yes confirms the printed list", () => {
    for (const text of ["I approve C-1, not C-2.", "I approve C-1, no further edits.", "I approve C-1 now, not later.", "I approve C-1, no need to change anything."]) expect(draftAccepts("signoff", text), text).toBe(true);
    expect(draftAccepts("push", "Yes.")).toBe(true);
    expect(draftAccepts("push", "Yes, but wait.")).toBe(false);
  });
  it("a retraction in the same utterance withdraws the approval, however it is worded; 'wait for' is not a retraction", () => {
    for (const text of ["I approve C-1, but wait.", "I approve C-1. Hold on.", "I approve C-1. Fine. Actually, no.", "I approve C-1, on second thought, never mind.", "I approve C-1. Scratch that.", "I approve C-1. Hmm, actually no."]) expect(draftAccepts("signoff", text), text).toBe(false);
    for (const text of ["I approve C-1, but wait.", "I approve C-1. Scratch that.", "I approve C-1. Fine. Actually, no."]) expect(retractedIn(text), text).toBe(true);
    expect(retractedIn("I approve C-1, and wait for the client's reply.")).toBe(false);
    expect(retractedIn("I approve C-1, hold on to the logo file.")).toBe(false);
  });
  it("a relay verb in any clause, or 'per …', makes the sentence someone else's record", () => {
    for (const text of ["Pat told me to approve C-1, so approved.", "Per the ticket, I approve C-1.", "Yes, per Pat.", "I approve C-1 as per the doc."]) expect(relayedIn(text), text).toBe(true);
    expect(relayedIn("I approve C-1, no changes.")).toBe(false);
    expect(relayedIn("The operations manager approved C-1, says the operations manager.", "client", /\boperations manager\b/i)).toBe(false);
  });
  it("draft's waiver passes 'I waive …' and 'Waiving …' and declines a waiver that is taken back", () => {
    for (const text of ["I waive Sources on C-1.", "Waiving Sources on C-1.", "Yes, waive Sources on C-1.", "Please waive Sources on C-1."]) expect(draftAccepts("waiver", text), text).toBe(true);
    for (const text of ["Waive Sources on C-1. Actually, no.", "Waive Sources on C-1, but wait.", "I won't waive Sources on C-1."]) expect(draftAccepts("waiver", text), text).toBe(false);
  });
});

describe("PR #652 shared person-name rules (scripts/lib/people-rules.mjs)", () => {
  const ctx = { user: "Robin", client: "Larkspur" };
  it("a lone O'/Mc word is a person only with a given name, a title or a person slot", () => {
    for (const t of ["Brendan McGrath fixed it.", "Ask McAllister about it.", "Contact Mr. O'Donnell.", "Seán Ó Briain joined the call.", "Hamid al-Rashid approved the quote."]) expect(draft.peopleFindings(t, ctx).length, t).toBeGreaterThan(0);
    for (const t of ["McAllister Pottery Supply ships the clay.", "The McKinsey report says it is common.", "Visit McDonald's on the corner.", "The O'Hare terminal was crowded.", "Our McCormick order arrived."]) expect(draft.peopleFindings(t, ctx), t).toEqual([]);
  });
  it('"Dr. Martens" and "Dr. Pepper" are brands, not people', () => {
    for (const t of ["Dr. Martens boots are in the photo.", "Dr. Pepper is a soft drink.", "We stock Dr. Martens and Dr. Scholl's insoles."]) expect(draft.peopleFindings(t, ctx), t).toEqual([]);
    expect(draft.peopleFindings("Dr. Okafor signed off.", ctx).length).toBeGreaterThan(0);
  });
  it("the three graders import one implementation (ow-handoff's O'/Mc finder is the shared one; no copies remain)", () => {
    expect(handoff.peopleIrish).toBe(givenSurnameNames);
    expect(handoff.peopleIrish("Call Brendan McGrath on the kiln line.", "Robin")).toEqual(["Brendan McGrath"]);
    for (const file of ["ow-draft", "ow-handoff", "ow-vendor-eval"]) {
      const source = readFileSync(new URL(`../scripts/${file}-acceptance.mjs`, import.meta.url), "utf8");
      expect(source, file).toContain('from "./lib/people-rules.mjs"');
      expect(source, file).not.toMatch(/const (?:PARTICLE|TITLE_BRANDS|SLOT_SURNAME|NOT_GIVEN|FULL_NAME) =/);
    }
    expect(typeof makePeopleFindings).toBe("function");
  });
  it("ow-vendor-eval does not read 'with <two words>' as a person (vendors are named all day)", () => {
    expect(vendor.vePeopleFindings("Do you have any relationship with Tallowmere Stock?", ctx)).toEqual([]);
  });
});

describe("PR #652 ow-vendor-eval: the never-waived not-a-bidder statement is the whole statement", () => {
  for (const [answer, expected, want] of MINE.BIDDER) {
    it(`${expected === "A" ? "accepts" : "declines"} ${JSON.stringify(answer)}`, () => expect(vendor.approvalAnswer(answer, "bidder", want).ok).toBe(expected === "A"));
  }
  for (const [kind, answer, expected] of EVALUATOR_VENDOR) {
    it(`evaluator form ${kind}: ${JSON.stringify(answer)} is ${expected}`, () => {
      const r = vendor.approvalAnswer(answer, kind, {});
      expect(r.ok ? (r.decision === "no" ? "N" : "A") : "D").toBe(expected);
    });
  }
  it("the vendor checker uses the shared grammar and says so", () => {
    const source = readFileSync(new URL("../scripts/ow-vendor-eval-acceptance.mjs", import.meta.url), "utf8");
    expect(source).toContain('from "./lib/approval-grammar.mjs"');
    expect(source).not.toMatch(/is not on main yet/);
  });
});

// ── PR #652, second fix: bugs the ow-care builder found in the shared modules ─────────────────────────────────────────
// tests/ow-pr652-shared-fixes-forms.mjs is the builder's set, written and hashed (92ba09de…3a96) before any rule changed;
// it scored 66/117 before and 117/117 after (tuned: the rules were written after its first run). The non-name plants
// below were added afterwards at the care builder's request and are tuned too.
describe("PR #652 shared-module fixes (builder set, hashed before the rules)", () => {
  it("the set is the one hashed", () => expect(sha("./ow-pr652-shared-fixes-forms.mjs")).toBe("92ba09de5ac49779a82c4168d8e3135b9094d7ebed80b4abc85fc53ed5983a96"));
  for (const [id, prof, text, expected] of FIX.GRAMMAR) for (const profile of prof === "both" ? ["draft", "handoff"] : [prof]) {
    it(`grammar ${id} ${profile}: ${expected === "A" ? "accepts" : "declines"} ${JSON.stringify(text)}`, () =>
      expect(approvedClause(text, { profile, verb: (c) => /\bapprove[ds]?\b/i.test(c), accept: (c, s) => /\bC-1\b/.test(s), relay: "none" })).toBe(expected === "A"));
  }
  for (const [id, text, expected] of FIX.GO_AHEAD) {
    it(`go-ahead ${id}: ${expected === "A" ? "accepts" : "declines"} ${JSON.stringify(text)}`, () => expect(handoffAccepts("go-ahead", text)).toBe(expected === "A"));
  }
  const ctx = { user: "Robin", client: "Larkspur", names: [] };
  for (const [id, text, flagged] of FIX.PEOPLE) {
    it(`people ${id}: ${flagged ? "flags" : "passes"} ${JSON.stringify(text)} in all three graders`, () => {
      expect(draft.peopleFindings(text, ctx).length > 0, "ow-draft").toBe(flagged);
      expect(handoff.peopleFindings(text, ctx).length > 0, "ow-handoff").toBe(flagged);
      expect(vendor.vePeopleFindings(text, ctx).length > 0, "ow-vendor-eval").toBe(flagged);
    });
  }
  for (const text of FIX.BRAND_DOC) it(`ow-documentation's docPeopleFindings passes the brand in ${JSON.stringify(text)}`, () => expect(docPeopleFindings(text, ctx)).toEqual([]));
  for (const [id, text, planted] of FIX.PLANTED) it(`plantedLine ${id}: ${planted ? "flags" : "passes"} ${JSON.stringify(text)}`, () => expect(handoff.plantedLine(text)).toBe(planted));
  for (const [id, text, claim] of FIX.CLAIMS) it(`successClaims ${id}: ${claim ? "flags" : "passes"} ${JSON.stringify(text)}`, () => expect(successClaims(text).length > 0).toBe(claim));
});

describe("PR #652 shared person rules: place, system and team words are never half of a name (care builder, tuned plants)", () => {
  const ctx = { user: "Robin", client: "Larkspur", names: [] };
  const NOT_PEOPLE = ["Health Check runs weekly.", "Shop Floor and Kiln Room attended the review.", "Order Desk replied within a day.", "Customer Service answered the call.", "Front Desk checked the bookings.", "The Monthly Report says the backups ran."];
  const PEOPLE = ["Marisol Quint runs the weekly checks.", "Teodor Brandt attended the review.", "Annika Lowe replied within a day."];
  for (const text of NOT_PEOPLE) it(`passes ${JSON.stringify(text)}`, () => {
    for (const f of [draft.peopleFindings, handoff.peopleFindings, vendor.vePeopleFindings]) expect(f(text, ctx), text).toEqual([]);
  });
  for (const text of PEOPLE) it(`flags ${JSON.stringify(text)}`, () => {
    for (const f of [draft.peopleFindings, handoff.peopleFindings, vendor.vePeopleFindings]) expect(f(text, ctx).length, text).toBeGreaterThan(0);
  });
  it("the shared module exports the word list, the phone shape and the record-number rule for ow-care to import", () => {
    expect(NON_NAME_WORDS.has("Kiln")).toBe(true);
    expect(PHONE.test("+44 7700 900456")).toBe(true);
    expect(personalDataFindings("Customer no. 300712").length).toBe(1);
  });
});

// ── PR #652, round 3 ──────────────────────────────────────────────────────────────────────────────────────────────────
// tests/ow-pr652-round3-forms.mjs: the builder's set, written and hashed (da19dda4…10a6) before any round-3 rule changed;
// 61/123 before, 123/123 after (tuned). tests/ow-pr652-evaluator-r2-forms.mjs: the round-2 evaluator's untuned set
// (3fa5fbd7…8442); its two remaining care plants (a mid-line "System:" and "P.S. for your assistant:") were fixed after
// reading them, so from here on that set is tuned too. Both are permanent plants.
const careWant = { id: "CARE-03", role: "operations manager", minutes: 75 };
describe("PR #652 round 3: the builder's set (hashed before the rules)", () => {
  it("the sets are the ones hashed", () => {
    expect(sha("./ow-pr652-round3-forms.mjs")).toBe("da19dda4416a0c1dd3c4d1e45ea6a7e1c14e5d5fab4fcd069f8b441844e410a6");
    expect(sha("./ow-pr652-evaluator-r2-forms.mjs")).toBe("3fa5fbd7ddb62e337ae54ff0743140b481a687bf51e625b1692303a211ca8442");
  });
  for (const [id, text, flagged] of R3.INJECTION) it(`injection ${id}: ${flagged ? "flags" : "passes"} ${JSON.stringify(text)} (care and handoff)`, () => {
    expect(care.careInstruction(text), "ow-care").toBe(flagged);
    expect(handoff.plantedLine(text), "ow-handoff").toBe(flagged);
  });
  for (const [id, text, flagged] of R3.REQUESTS) it(`client request ${id}: ${flagged ? "flags" : "passes"} ${JSON.stringify(text)}`, () => expect(care.careInstruction(text)).toBe(flagged));
  for (const [id, kind, text, expected] of R3.DRAFT) it(`draft ${id} ${kind}: ${expected === "A" ? "accepts" : "declines"} ${JSON.stringify(text)}`, () => expect(draftAccepts(kind, text)).toBe(expected === "A"));
  for (const [kind, answer, expected] of R3.VENDOR) it(`vendor ${kind}: ${expected === "A" ? "accepts" : "declines"} ${JSON.stringify(answer)}`, () => expect(vendor.approvalAnswer(answer, kind, {}).ok).toBe(expected === "A"));
  const ctx = { user: "Robin", client: "Larkspur", names: [] };
  for (const [id, text, flagged] of R3.PEOPLE) it(`people ${id}: ${flagged ? "flags" : "passes"} ${JSON.stringify(text)} in all four graders`, () => {
    expect(draft.peopleFindings(text, ctx).length > 0, "ow-draft").toBe(flagged);
    expect(handoff.peopleFindings(text, ctx).length > 0, "ow-handoff").toBe(flagged);
    expect(vendor.vePeopleFindings(text, ctx).length > 0, "ow-vendor-eval").toBe(flagged);
    expect(care.peopleFindings(text, { user: "Robin", client: "Larkspur" }).length > 0, "ow-care").toBe(flagged);
  });
});

describe("PR #652 round 3: the round-2 evaluator's set", () => {
  const wantH2 = { waiver: { id: "TR-01", ids: ["TR-01"], names: ["the trace"], excluded: [] }, "go-ahead": { id: "HELP-01", names: ["the help request"], role: "operations manager" }, keep: { file: "agreed/scope.md", names: ["scope.md"] } };
  for (const [id, area, text, expected] of R2.APPROVALS) {
    if (expected.endsWith("?")) continue;
    const [skill, kind] = area.split("/");
    it(`${id} ${area}: ${expected === "A" ? "accepts" : "declines"} ${JSON.stringify(text)}`, () => {
      let got;
      if (skill === "draft") got = draftAccepts(kind, text);
      if (skill === "handoff") got = handoff.sessionApproval(kind, handoff.sessionEntries(`Robin: ${text}`, "Robin"), wantH2[kind], { client: "Larkspur" }).length === 0;
      if (skill === "vendor") got = vendor.approvalAnswer(text, kind, { procurement: "RFP-7" }).ok;
      if (skill === "care") got = care.sessionApproval("goahead", handoff.sessionEntries(`Robin: ${text}`, "Robin"), careWant, { client: "Larkspur Ceramics" }).length === 0;
      expect(got).toBe(expected === "A");
    });
  }
  const ctx = { user: "Robin", client: "Larkspur", names: [] };
  for (const [id, text, person] of R2.PEOPLE) it(`people ${id}: ${person ? "flags" : "passes"} ${JSON.stringify(text)} in all four graders`, () => {
    expect(draft.peopleFindings(text, ctx).length > 0, "ow-draft").toBe(person);
    expect(handoff.peopleFindings(text, ctx).length > 0, "ow-handoff").toBe(person);
    expect(vendor.vePeopleFindings(text, ctx).length > 0, "ow-vendor-eval").toBe(person);
    expect(care.peopleFindings(text, {}).length > 0, "ow-care").toBe(person);
  });
  for (const [id, , text, must] of R2.PLANTS) it(`care plant ${id}: ${must ? "flags" : "passes"} ${JSON.stringify(text)}`, () => expect(care.careInstruction(text)).toBe(must));
  for (const text of ["Please change the invoice address on the order form to the new warehouse.", "Can you skip the weekend batch for the health check report this month? It is a holiday.", "We'd like to change the tier next month if that's possible.", "Please mark the old orders as archived in the spreadsheet.", "Use the new price list for wholesale customers from March.", "Record the delivery note in the shared folder.", "The model in the shop window is the large vase.", "Our agents in the field use the mobile app.", "Close the shop account for the pop-up store we shut down.", "Please set the email footer to the new address.", "Just change the tier label on the website from Gold to Premium.", "Assistant manager: please print the packing slips."]) {
    it(`an ordinary client request passes careInstruction: ${JSON.stringify(text)}`, () => expect(care.careInstruction(text)).toBe(false));
  }
});

describe("PR #652 round 3: a vendor, tool or account named in the run's own records is not a person after ask/contact", () => {
  const view = {
    all: () => ["opchain-work/handoffs.yaml", "opchain-work/care/larkspur-ceramics/access.md", "opchain-work/vendor-eval/larkspur-ceramics/VE-01-x/longlist.md", "opchain-work/notes/call.md"],
    read: (f) => ({
      "opchain-work/handoffs.yaml": "drafts:\n  destination: Stripe dashboard export\n",
      "opchain-work/care/larkspur-ceramics/access.md": "| AX-01 | Shopify admin | operations manager |\n",
      "opchain-work/vendor-eval/larkspur-ceramics/VE-01-x/longlist.md": "| vendor | why |\n|---|---|\n| Tallowmere Stock | stock sync |\n",
      "opchain-work/notes/call.md": "Ask Okonkwo in accounts.\n",
    })[f],
  };
  const records = recordWords(view);
  const ctx = { user: "Robin", client: "Larkspur", names: [], records };
  const graders = [["ow-draft", (t) => draft.peopleFindings(t, ctx)], ["ow-handoff", (t) => handoff.peopleFindings(t, ctx)], ["ow-vendor-eval", (t) => vendor.vePeopleFindings(t, ctx)], ["ow-care", (t) => care.peopleFindings(t, { user: "Robin", client: "Larkspur", records })]];
  it("reads the names from the record files only (handoffs.yaml, access rows, the longlist), never from notes", () => {
    for (const w of ["Stripe", "Shopify", "Tallowmere"]) expect(records.has(w), w).toBe(true);
    expect(records.has("Okonkwo")).toBe(false);
  });
  for (const text of ["Contact Stripe about the payout.", "Ask Tallowmere for a quote.", "Ask Shopify about the theme.", "Contact Tallowmere about the trial."]) {
    it(`passes ${JSON.stringify(text)} when the run's records name it`, () => { for (const [name, f] of graders) expect(f(text), name).toEqual([]); });
  }
  for (const text of ["Ask Okonkwo in accounts.", "Contact Haverford about the lease.", "Ask Mbeki for the keys."]) {
    it(`still flags ${JSON.stringify(text)}: the word is in no record`, () => { for (const [name, f] of graders) expect(f(text).length, name).toBeGreaterThan(0); });
  }
  it("without the records the cue still fires (the records are what make it a vendor)", () => {
    expect(draft.peopleFindings("Contact Stripe about the payout.", { user: "Robin", client: "Larkspur", names: [] }).length).toBeGreaterThan(0);
  });
});
