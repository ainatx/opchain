// ow-tools 1.2.0, `calc date --calendar us-federal` (ow-tools design §5.4 and table
// row 20; the ow-uat Sprint 3 contract C11 and C19): the contract calendar ow-uat
// counts clause dates on. The fixture table of 2026 to 2030 is written out by hand;
// the skill's own no-tool table must equal what calc computes.
import { afterAll, describe, expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { addDate, usFederalHolidays, CALENDARS, FEDERAL_YEARS } from "../../plugins/ow-tools/lib/calc.mjs";
import { tableHolidays } from "../../scripts/ow-uat-acceptance.mjs";
import { PLUGIN, ROOT, cleanup, cli, tempDir } from "./helpers.js";

afterAll(cleanup);
const SPAWN = { timeout: 30_000 };
const FIX = JSON.parse(readFileSync(join(ROOT, "tests", "fixtures", "ow-tools", "us-federal-2026-2030.json"), "utf8"));

describe("calc --calendar us-federal", SPAWN, () => {
  it("matches the published federal holidays for 2026 to 2030, observed days included", () => {
    for (const [y, days] of Object.entries(FIX.observed)) expect(usFederalHolidays(Number(y)), y).toEqual(days);
  });
  it("puts each observed-day edge on the right weekday and in the right year", () => {
    for (const e of FIX.edges) {
      const y = Number(e.observed.slice(0, 4));
      expect(usFederalHolidays(y), e.why).toContain(e.observed);
      expect(usFederalHolidays(Number(e.holiday.slice(0, 4))), e.why).not.toContain(e.holiday);
    }
    // 2028-01-01 is a Saturday: 2027-12-31 is the holiday, and 2028 has no New Year's Day of its own.
    expect(usFederalHolidays(2028)).not.toContain("2028-01-01");
    expect(addDate({ from: "2027-12-30", businessDays: 1, calendar: "us-federal" })).toMatchObject({ date: "2028-01-03", holidays_skipped: ["2027-12-31"] });
  });
  it("the skill's no-tool table (contract-calendar.md, 2026 to 2031) equals what calc computes", () => {
    const calc = new Set([2026, 2027, 2028, 2029, 2030, 2031].flatMap((y) => usFederalHolidays(y)));
    expect([...tableHolidays()].sort()).toEqual([...calc].sort());
  });
  it("the worked case: Friday 2026-11-20 plus 10 business days is 2026-12-07 (weekdays alone: 2026-12-04)", () => {
    expect(addDate({ from: "2026-11-20", businessDays: 10, calendar: "us-federal" })).toEqual({ date: "2026-12-07", from: "2026-11-20", business_days: 10, calendar: "us-federal", holidays_skipped: ["2026-11-26"] });
    expect(addDate({ from: "2026-11-20", businessDays: 10 }).date).toBe("2026-12-04");
    expect(addDate({ from: "2026-12-07", businessDays: -10, calendar: "us-federal" }).date).toBe("2026-11-20");
  });
  it("the command line gives the same answer, and ow-uat's recorded calc output is what calc prints", () => {
    const r = cli(["calc", "date", "--from", "2026-11-20", "--business-days", "10", "--calendar", "us-federal"]);
    expect(r.status, r.stderr).toBe(0);
    const line = r.stdout.trim();
    expect(JSON.parse(line)).toMatchObject({ date: "2026-12-07", calendar: "us-federal" });
    const golden = readFileSync(join(ROOT, "tests", "fixtures", "ow-uat", "m-signoff-request-calc", "expected", "opchain-work", "uat", "mossgate-books", "signoff-requests.yaml"), "utf8");
    expect(golden).toContain(line.replace(/"/g, "'"));
  });
  it("--calendar with --days, or with --holidays, is a usage error (exit 2); an unknown calendar too", () => {
    expect(cli(["calc", "date", "--from", "2026-11-20", "--days", "10", "--calendar", "us-federal"]).status).toBe(2);
    expect(cli(["calc", "date", "--from", "2026-11-20", "--business-days", "10", "--calendar", "us-federal", "--holidays", "2026-11-27"]).status).toBe(2);
    expect(cli(["calc", "date", "--from", "2026-11-20", "--business-days", "10", "--calendar", "uk-england"]).status).toBe(2);
    expect(() => addDate({ from: "2026-11-20", days: 3, calendar: "us-federal" })).toThrow(/--business-days, not --days/);
  });
  it("refuses before 2022 and after 2099 with a stable reason code (exit 4)", () => {
    const before = cli(["calc", "date", "--from", "2021-12-20", "--business-days", "3", "--calendar", "us-federal", "--json"]);
    expect(before.status).toBe(4);
    expect(before.json).toMatchObject({ status: "refused", reason: "calendar-out-of-range" });
    const after = cli(["calc", "date", "--from", "2099-12-28", "--business-days", "10", "--calendar", "us-federal", "--json"]);
    expect(after.status).toBe(4);
    expect(after.json.reason).toBe("calendar-out-of-range");
    expect(FEDERAL_YEARS).toEqual([2022, 2099]);
    expect(addDate({ from: "2022-01-03", businessDays: 5, calendar: "us-federal" }).date).toBe("2022-01-10");
  });
  it("answers near both ends of the range: only a weekday the count reaches must lie in 2022 to 2099 (OW-04 R1-17)", () => {
    expect(addDate({ from: "2099-12-29", businessDays: 1, calendar: "us-federal" }).date).toBe("2099-12-30");
    expect(addDate({ from: "2022-01-20", businessDays: -5, calendar: "us-federal" })).toMatchObject({ date: "2022-01-12", holidays_skipped: ["2022-01-17"] });
    expect(addDate({ from: "2021-12-31", businessDays: 1, calendar: "us-federal" }).date).toBe("2022-01-03");
    expect(addDate({ from: "2030-12-20", businessDays: 10, calendar: "us-federal" })).toMatchObject({ date: "2031-01-07", holidays_skipped: ["2030-12-25", "2031-01-01"] });
    expect(() => addDate({ from: "2099-12-30", businessDays: 2, calendar: "us-federal" })).toThrow(/2100 is outside it/);
    expect(() => addDate({ from: "2022-01-04", businessDays: -2, calendar: "us-federal" })).toThrow(/2021 is outside it/);
  });
  it("version --json lists the capability (ow-uat detects it there, never by version number)", () => {
    const r = cli(["version", "--json"]);
    expect(r.status).toBe(0);
    expect(r.json.capabilities.calc).toEqual({ ready: true, calendars: ["us-federal"] });
    expect(CALENDARS).toEqual(["us-federal"]);
  });
  it("C19 and 1.1.0's fence: the calendar call runs with zero socket, DNS or fetch attempts", () => {
    const log = join(tempDir(), "fence.log");
    writeFileSync(log, "");
    const r = cli(["calc", "date", "--from", "2026-11-20", "--business-days", "10", "--calendar", "us-federal", "--json"], { env: { NODE_OPTIONS: `--import ${join(ROOT, "tests", "ow-tools", "fence.mjs")}`, OW_FENCE_LOG: log } });
    expect(r.status, r.stderr).toBe(0);
    expect(r.json).toMatchObject({ date: "2026-12-07", calendar: "us-federal" });
    expect(readFileSync(log, "utf8").trim()).toBe("");
    const out = cli(["calc", "date", "--from", "2099-12-28", "--business-days", "10", "--calendar", "us-federal", "--json"], { env: { NODE_OPTIONS: `--import ${join(ROOT, "tests", "ow-tools", "fence.mjs")}`, OW_FENCE_LOG: log } });
    expect(out.status).toBe(4);
    expect(readFileSync(log, "utf8").trim()).toBe("");
  });
  it("C19: calc opens no socket and adds no dependency (Node built-ins and its own modules only)", () => {
    const src = readFileSync(join(PLUGIN, "lib", "calc.mjs"), "utf8");
    const imports = [...src.matchAll(/from "([^"]+)"/g)].map((m) => m[1]);
    expect(imports.every((s) => s === "node:fs" || s.startsWith("./"))).toBe(true);
    expect(src).not.toMatch(/node:(?:net|http|https|dgram|tls|dns)|fetch\(|WebSocket/);
  });
  it("C19: the version line and both marketplace fields say 1.2.0; the manifest is current", () => {
    const plugin = JSON.parse(readFileSync(join(PLUGIN, ".claude-plugin", "plugin.json"), "utf8"));
    const market = JSON.parse(readFileSync(join(PLUGIN, ".claude-plugin", "marketplace.json"), "utf8"));
    expect(plugin.version).toBe("1.2.0");
    expect(market.metadata.version).toBe("1.2.0");
    expect(market.plugins[0].version).toBe("1.2.0");
    expect(readFileSync(join(PLUGIN, "SECURITY-MANIFEST.md"), "utf8")).toMatch(/^# ow-tools 1\.2\.0 — security manifest/);
    expect(cli(["help"]).stdout).toMatch(/--calendar us-federal/);
  });
});
