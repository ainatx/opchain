// The held-out sets for ow-care's checker (tests/ow-care-heldout.mjs): hashed before any rule existed, measured on the
// first version of the rules ("before", untuned) and again after the rules were fixed ("after", tuned on the same sets,
// so no longer an independent number). Everything is invented.
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { measure } from "./ow-care-heldout-measure.mjs";
import * as H from "./ow-care-heldout.mjs";

/** Measured once on the first version of scripts/ow-care-acceptance.mjs, before any rule was changed (recorded, not reproducible). */
const BEFORE = {
  sessions: [131, 139], sessionsMustFail: [98, 99], sessionsControls: [33, 40], injections: [16, 22], legitimate: [20, 22], internalFail: [13, 16], internalPass: [16, 16],
  credFail: [16, 16], credPass: [15, 16], privFail: [15, 16], privPass: [15, 16], otherFail: [15, 15], otherPass: [15, 15], peopleFail: [13, 16], peoplePass: [14, 16],
  claimsFail: [21, 22], claimsPass: [16, 20], reply: [12, 12], periods: [18, 18], ends: [11, 11], ledgers: [12, 12], invoices: [11, 11], accessLines: [12, 12], healthLines: [12, 12],
};
const BEFORE_ALL = [439, 471];

describe("the held-out sets", () => {
  it("are unchanged since they were hashed, before any rule was written", () => {
    expect(createHash("sha256").update(JSON.stringify(H.HELDOUT)).digest("hex")).toBe(H.HELDOUT_DIGEST);
  });
  it("are big enough: >= 60 approval forms (>= 40 must-fail, >= 20 controls), 15 injection wordings and 15 legitimate sentences, 15/15 per category", () => {
    expect(H.SESSIONS.length).toBeGreaterThanOrEqual(60);
    expect(H.SESSIONS.filter((s) => !s[3]).length).toBeGreaterThanOrEqual(40);
    expect(H.SESSIONS.filter((s) => s[3]).length).toBeGreaterThanOrEqual(20);
    expect(H.INJECTIONS.length).toBeGreaterThanOrEqual(15);
    expect(H.LEGITIMATE.length).toBeGreaterThanOrEqual(15);
    for (const k of ["INTERNAL_FAIL", "INTERNAL_PASS", "CREDENTIAL_FAIL", "CREDENTIAL_PASS", "PRIVATE_FAIL", "PRIVATE_PASS", "OTHER_CLIENT_FAIL", "OTHER_CLIENT_PASS", "PEOPLE_FAIL", "PEOPLE_PASS"]) expect(H[k].length, k).toBeGreaterThanOrEqual(15);
    expect(H.CLAIMS_FAIL.length).toBeGreaterThanOrEqual(20);
    expect(H.CLAIMS_PASS.length).toBeGreaterThanOrEqual(20);
  });
  it("every kind of approval has own, relayed, conditional, declined and hedged forms or controls", () => {
    const kinds = new Set(H.SESSIONS.map((s) => s[0]));
    expect([...kinds].sort()).toEqual(["change", "choice", "class", "credit", "goahead", "grant", "healthconfirm", "hours", "list", "localcopy", "proposal", "removal", "waiver"]);
    for (const k of kinds) { const rows = H.SESSIONS.filter((s) => s[0] === k); expect(rows.some((r) => r[3]), k).toBe(true); expect(rows.filter((r) => !r[3]).length, k).toBeGreaterThanOrEqual(2); }
  });
  it("before (untuned, recorded): 439 of 471 forms handled as the sets say", () => {
    const total = Object.entries(BEFORE).filter(([k]) => !/^sessions(MustFail|Controls)$/.test(k)).reduce((s, [, v]) => s + v[1], 0);
    expect(total).toBe(BEFORE_ALL[1]);
    expect(Object.entries(BEFORE).filter(([k]) => !/^sessions(MustFail|Controls)$/.test(k)).reduce((s, [, v]) => s + v[0], 0)).toBe(BEFORE_ALL[0]);
  });
  it("after (tuned on these sets, so not independent): every form is handled as the set says", () => {
    const m = measure();
    for (const [k, v] of Object.entries(m)) expect(v.misses, `${k}: ${v.correct}/${v.total}`).toEqual([]);
    for (const [k, [, total]] of Object.entries(BEFORE)) expect(m[k].total, k).toBe(total);
  });
});
