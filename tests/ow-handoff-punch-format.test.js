import { afterAll, describe, expect, it } from "vitest";
import { cleanup, failures, mutated } from "./ow-handoff-helpers.mjs";
import { punchLoggedDate } from "../scripts/ow-uat-acceptance.mjs";

afterAll(cleanup, 120_000);
const P = "opchain-work/uat/larkspur-ceramics/punch-list.md";
const check = (edit) => failures("fix-punch", mutated("fix-punch", { [P]: edit })).fix;

describe("UAT punch-list dates survive the handoff boundary", () => {
  it.each(["22 January 2027", "January 22, 2027"])("accepts the published logged date header and %s", (date) => {
    expect(check((text) => text.replace(/\| Logged \|/i, "| Logged date |").replace("2027-01-22", date))).toBeUndefined();
  });

  it.each(["31 February 2027", "2027-02-31", "tomorrow", ""])("rejects an invalid logged date: %s", (date) => {
    expect(check((text) => text.replace("2027-01-22", date))).toMatch(/logged date is missing or invalid/);
    expect(punchLoggedDate(date)).toBeNull();
  });

  it("still compares the reported date to the actual UAT date", () => {
    expect(check((text) => text.replace("2027-01-22", "23 January 2027"))).toMatch(/reported is 2027-01-22; the UAT-nn's logged date is 2027-01-23/);
  });

  it.each(["2027-01-22", "2027-01-23", "invalid"])("rejects duplicate date columns instead of choosing an alias: %s", (other) => {
    expect(check((text) => text.replace(/\| Logged \|/i, "| Logged | Logged date |")
      .replace("| 2027-01-22 |", `| 2027-01-22 | ${other} |`)
      .replace("| 2027-01-27 |", "| 2027-01-27 | 2027-01-27 |"))).toMatch(/logged date is missing or invalid/);
  });

  it("does not alias the machine-facing UAT-nn identifier", () => {
    expect(check((text) => text.replace(/\| UAT-nn \|/i, "| UAT |"))).toMatch(/logged 0 times/);
  });
});
