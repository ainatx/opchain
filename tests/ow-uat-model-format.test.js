import { afterAll, describe, expect, it } from "vitest";
import { printedSays, runCase } from "../scripts/ow-uat-acceptance.mjs";
import { cleanup, mutated, rep } from "./ow-uat-helpers.mjs";

afterAll(cleanup, 120_000);

const CASE = "signoff-signed";
const U = "opchain-work/uat/larkspur-ceramics";
const result = (dir, check) => runCase(CASE, dir).find((r) => r.check === check).problems;
const unindent = (text) => text.replace(/^ {4}(?=[A-Z][A-Z ]*:)/gm, "");

describe("UAT model captures follow the published schema, not incidental golden formatting", () => {
  it("preserves the unchanged signed golden's expectations", () => {
    expect(runCase(CASE).filter((r) => r.problems.length)).toEqual([]);
  });

  it("reads unindented NEXT/THEN lines while retaining their exact sequence", () => {
    const dir = mutated(CASE, { "printed.md": unindent });
    expect(result(dir, "next")).toEqual([]);
  });

  it("does not mistake an ordinary prose quote for a NEXT directive", () => {
    expect(printedSays('The user may say "use ow-handoff-start on uat/larkspur-ceramics/".')).toEqual([]);
  });

  it("still rejects out-of-order unindented handoffs", () => {
    const dir = mutated(CASE, { "printed.md": (text) => unindent(text)
      .replace('"use ow-handoff-start on uat/larkspur-ceramics/"', '"use ow-documentation-start on uat/larkspur-ceramics/"')
      .replace('THEN: documentation bought, say "use ow-documentation-start on uat/larkspur-ceramics/"', 'THEN: documentation bought, say "use ow-handoff-start on uat/larkspur-ceramics/"') });
    expect(result(dir, "next").join("\n")).toMatch(/expected, in this order/);
  });

  it("still rejects a missing unindented handoff", () => {
    const dir = mutated(CASE, { "printed.md": (text) => unindent(text).replace(/^THEN: say "use ow-handoff-start[^\n]*\n/m, "") });
    expect(result(dir, "next").join("\n")).toMatch(/expected, in this order/);
  });

  it("still requires a slash hint on an unindented say line", () => {
    const dir = mutated(CASE, { "printed.md": (text) => unindent(text).replace("(where slash commands exist: /ow-handoff-start)", "") });
    expect(result(dir, "next").join("\n")).toMatch(/has no slash hint/);
  });

  it("accepts the schema's Build label column", () => {
    const dir = mutated(CASE, { [`${U}/acceptance-record.md`]: rep("| Build |", "| Build label |") });
    expect(result(dir, "signed")).toEqual([]);
  });

  it("does not accept a wrong build under the documented alias", () => {
    const dir = mutated(CASE, { [`${U}/acceptance-record.md`]: (text) => rep("| Build |", "| Build label |")(text).replace(/larkspur-uat-4/g, "larkspur-uat-3") });
    expect(result(dir, "signed").join("\n")).toMatch(/build larkspur-uat-3/);
  });

  it("accepts the schema's Logged date column and written-out client dates", () => {
    const dir = mutated(CASE, { [`${U}/punch-list.md`]: (text) => rep("| Logged |", "| Logged date |")(text)
      .replace("| 2027-01-22 |", "| 22 January 2027 |")
      .replace("| 2027-01-27 |", "| January 27, 2027 |") });
    expect(result(dir, "signed")).toEqual([]);
  });

  for (const value of ["", "31 February 2027", "January 32, 2027", "sometime in January", "22/01/2027"]) {
    it(`rejects an absent or invalid written-out logged date: ${JSON.stringify(value)}`, () => {
      const dir = mutated(CASE, { [`${U}/punch-list.md`]: (text) => rep("| Logged |", "| Logged date |")(text).replace("| 2027-01-22 |", `| ${value} |`) });
      expect(result(dir, "signed").join("\n")).toMatch(/has no logged date/);
    });
  }

  it("does not alias Item to the schema's required UAT-nn column", () => {
    const dir = mutated(CASE, { [`${U}/punch-list.md`]: rep("| UAT-nn |", "| Item |") });
    expect(result(dir, "signed").join("\n")).toMatch(/punch-list\.md columns/);
  });

  it("still rejects a late minor marked on the signed list with schema aliases", () => {
    const dir = mutated(CASE, { [`${U}/punch-list.md`]: (text) => rep("| Logged |", "| Logged date |")(text)
      .replace("| 2027-01-27 |", "| 27 January 2027 |")
      .replace("no: reported after request 2; not on the signed list", "yes") });
    expect(result(dir, "signed").join("\n")).toMatch(/reported after the request/);
  });

  it("still rejects a missing logged column", () => {
    const dir = mutated(CASE, { [`${U}/punch-list.md`]: rep("| Logged |", "| Notes |") });
    expect(result(dir, "signed").join("\n")).toMatch(/has no logged date/);
  });
});
