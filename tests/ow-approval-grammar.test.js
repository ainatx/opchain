import { describe, expect, it } from "vitest";
import { approvedClause, clausesOf, sentencesOf } from "../scripts/lib/approval-grammar.mjs";

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
