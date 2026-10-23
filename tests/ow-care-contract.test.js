import { describe, expect, it } from "vitest";
import { readFileSync, mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { hours } from "../plugins/ow-tools/lib/calc.mjs";
import { addDate } from "../plugins/ow-tools/lib/calc.mjs";
import { preflight } from "../plugins/ow-tools/lib/preflight.mjs";

const root = join(import.meta.dirname, "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const file = (p) => JSON.parse(read(p));

describe("OW-07 integration contract", () => {
  it("uses one exact protocol copy and documents all approved care verbs", () => {
    expect(read("skills-work/ow-care/references/ow-protocol.md")).toBe(read("skills-work/ow-protocol.md"));
    const skill = read("skills-work/ow-care/SKILL.md");
    for (const verb of ["onboard", "start", "request", "health", "notes", "access", "month", "change", "end"]) {
      expect(skill).toContain(`\`/ow-care-${verb}\``);
    }
    expect(skill).toContain("source: handoff|takeover");
    expect(skill).toContain("same-session self-check");
  });

  it("keeps takeover intake and onboarding pricing distinct from a build", () => {
    const start = read("skills-work/ow-start/references/phase-extract.md");
    const quote = read("skills-work/ow-build-plan/references/phase-quote.md");
    expect(start).toContain("kind: care-takeover");
    expect(quote).toContain("mode: onboarding");
    for (const exclusion of ["UAT", "fix window", "documentation/training", "build handoff"]) expect(quote).toContain(exclusion);
    expect(quote).toContain("No care tier subscription price is charged by this quote.");
  });

  it("reuses integer-minute T4 for one-month rollover and approved extra", () => {
    const input = file("tests/fixtures/ow-tools/sprint-t/hours/care-example.json");
    const out = hours({ ledger: input, rollover: "0.25,unused,1" });
    expect(out.months[0]).toMatchObject({ rolled_over: 45, lapsed: 135 });
    expect(out.months[1]).toMatchObject({ available: 525, extra: 75 });
    const unapproved = structuredClone(input);
    delete unapproved.months[1].extra_approved;
    expect(() => hours({ ledger: unapproved, rollover: "0.25,unused,1" })).toThrow();
  });

  it("counts the approved holiday reply example from its effective received day", () => {
    // Friday 2026-11-20 at 18:00 is outside the frozen 09:00-17:00 window.
    // Monday 2026-11-23 is a client-calendar holiday, making Tuesday effective.
    const due = addDate({ from: "2026-11-24", businessDays: 2, holidays: ["2026-11-23"] });
    expect(due.date).toBe("2026-11-26");
    expect(read("skills-work/ow-care/references/entry-and-requests.md")).toContain("Outside working hours counts from the next working day");
  });

  it("preserves H4's client-specific frozen rollover, even when the example differs from the site rule", () => {
    const source = read("tests/fixtures/ow-handoff/close-care-installed/expected/opchain-work/handoffs/larkspur-ceramics/care-start.md");
    expect(source).toContain("rollover: { share: 0.5, of: unused, months: 1 }");
    const entry = read("skills-work/ow-care/references/entry-and-requests.md");
    expect(entry).toContain("The actual offer governs even when the shipped example differs from the site's 25% wording.");
    expect(entry).toContain("latest");
  });

  it("keeps a closed month's 45-minute carry when the next month's rule changes", () => {
    const t = file("tests/fixtures/ow-care/changed-rule.json");
    const { effective_rollover: oldRule, ...oldInput } = t.closed_month;
    const { effective_rollover: newRule, ...newInput } = t.next_month;
    const old = hours({ ledger: { schema: 1, months: [oldInput] }, rollover: oldRule }).months[0];
    const wrongReplay = hours({ ledger: { schema: 1, months: [oldInput, newInput] }, rollover: newRule });
    expect(old.rolled_over).toBe(t.expected.old_rolled_over);
    expect(wrongReplay.months[0].rolled_over).toBe(90); // proves one-rule replay is unsafe
    const opening = old.rolled_over;
    const fromIncluded = t.next_month.entries[0].minutes - opening;
    const ownUnused = t.next_month.included - fromIncluded;
    const newRolled = Math.floor((ownUnused * 0.5) / 15) * 15;
    expect({ opening, ownUnused, newRolled }).toEqual({
      opening: t.expected.next_rolled_in,
      ownUnused: t.expected.next_own_unused,
      newRolled: t.expected.next_rolled_over,
    });
    const guidance = read("skills-work/ow-care/references/month-and-end.md");
    expect(guidance).toContain("never replay historical months with a newly effective rule");
    expect(guidance).toContain("not machine-checked; check it");
  });

  it("strips marked internal receipts but retains client handling and the report", () => {
    const path = join(root, "tests/fixtures/ow-care/export-source.md");
    const result = preflight(read("tests/fixtures/ow-care/export-source.md"), path);
    expect(result.ok).toBe(true);
    expect(result.removedSections).toBe(1);
    expect(result.banner).toBe("CONFIDENTIAL — prepared for the client operations role");
    expect(result.body).toContain("A certificate needs attention");
    expect(result.body).not.toMatch(/Internal appendix|private\.json|Same-session self-check|ow:internal/);
    const skill = read("skills-work/ow-care/SKILL.md");
    expect(skill).toContain("<!-- ow:internal -->");
    expect(skill).toContain("<!-- ow:end-internal -->");
  });

  it("requests final extras and credit without an unwanted renewal", () => {
    const guidance = read("skills-work/ow-care/references/month-and-end.md");
    expect(guidance).toContain("INV-request-care-final-settlement.md");
    expect(guidance).toContain("no prepaid renewal line");
    expect(read("skills-work/ow-care/skill.edges.yaml")).toContain("INV-request-care-final-settlement.md");
    const extra = 75 * 250 / 60;
    const credit = 30 * (3200 / 480);
    expect(extra - credit).toBe(112.5);
  });

  it("has bounded prospective inputs and semantic answer keys for every verb path", () => {
    const book = file("tests/fixtures/ow-care/casebook.json");
    expect(book.cases.length).toBeGreaterThanOrEqual(30);
    const ids = new Set(book.cases.map((c) => c.id));
    expect(ids.size).toBe(book.cases.length);
    for (const verb of ["onboard", "start", "request", "health", "notes", "access", "month", "change", "end"]) {
      const cases = book.cases.filter((c) => c.verb === `/ow-care-${verb}`);
      expect(cases.length).toBeGreaterThanOrEqual(3);
      expect(cases.some((c) => c.id.includes("refusal"))).toBe(true);
      expect(cases.some((c) => c.id.includes("resume"))).toBe(true);
    }
    for (const c of book.cases) {
      expect(c.clock).toContain("America/Chicago");
      expect(["present", "absent"]).toContain(c.tool);
      expect(read(`tests/fixtures/ow-care/seed/${c.seed}/opchain-work/STATUS.md`)).toBeDefined();
      expect(c.session_answers.length).toBeGreaterThan(20);
      expect(c.checks.length).toBeGreaterThan(0);
    }
  });

  it("grades grouped and decimal invoice amounts by value without accepting a different charge", () => {
    const dir = mkdtempSync(join(tmpdir(), "ow-care-amount-"));
    try {
      const care = join(dir, "opchain-work/care/larkspur-ceramics");
      for (const folder of ["requests", "invoices"]) mkdirSync(join(care, folder), { recursive: true });
      writeFileSync(join(dir, "case-id"), "start-after-build\n");
      writeFileSync(join(care, "care.yaml"), "rollover: { share: 0.5 }\n");
      writeFileSync(join(care, "requests/CARE-01.md"), "FIX-01\nhours_minutes: 0\n");
      writeFileSync(join(care, "requests/CARE-02.md"), "FIX-02\n");
      for (const [amount, expected] of [["3,000", 0], ["3000.00", 0], ["3,001", 1], ["13,000", 1], ["-3,000", 1]]) {
        writeFileSync(join(care, "invoices/INV-request-care-M-01.md"), `Amount: USD ${amount}\n`);
        const result = spawnSync(process.execPath, [join(root, "tests/fixtures/ow-care/grade.mjs"), "start-after-build", dir], { encoding: "utf8" });
        expect(result.status, `${amount}: ${result.stderr}`).toBe(expected);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
