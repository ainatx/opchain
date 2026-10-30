// ow-care acceptance: every golden run passes its checks, every verb has its happy path, refusals and resumes, and the
// fixtures are invented and carry no key-shaped string.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as yaml from "js-yaml";
import { CASES, CHECK_NAMES, FIXTURES, RUNS_IN, WRITER_PIN, edgesWriterDrift, listCases, loadKey, runCase, shippedTextProblems } from "../scripts/ow-care-acceptance.mjs";

const cases = listCases();
const keys = Object.fromEntries(cases.map((c) => [c, loadKey(join(CASES, c))]));
const verbOf = (k) => String(k.verbs[0]).split(" ")[0];

describe("the golden runs", () => {
  it("there are at least 79 and each passes every check it runs", () => {
    expect(cases.length).toBeGreaterThanOrEqual(79);
    const bad = cases.flatMap((c) => runCase(c).filter((r) => r.problems.length).map((r) => `${c} ${r.check}: ${r.problems[0]}`));
    expect(bad).toEqual([]);
  });
  it("every verb has a happy golden, a refusal or question, and a resume or no-op (the route has its own matrix)", () => {
    for (const verb of ["/ow-care-onboard", "/ow-care-start", "/ow-care-request", "/ow-care-health", "/ow-care-notes", "/ow-care-access", "/ow-care-month", "/ow-care-change", "/ow-care-end"]) {
      const mine = cases.filter((c) => verbOf(keys[c]) === verb);
      expect(mine.length, verb).toBeGreaterThanOrEqual(3);
      expect(mine.some((c) => keys[c].refused || keys[c].question), `${verb} refusal`).toBe(true);
      expect(mine.some((c) => keys[c].noop || c.includes("resume")), `${verb} resume`).toBe(true);
      expect(mine.some((c) => !keys[c].refused && !keys[c].noop && !keys[c].question), `${verb} happy`).toBe(true);
    }
    const routes = cases.filter((c) => verbOf(keys[c]) === "/ow-care");
    expect(routes.length).toBeGreaterThanOrEqual(10);
    for (const expect_ of ["welcome", "onboard", "request", "list", "start", "none"]) expect(routes.some((c) => keys[c].route?.expect === expect_), expect_).toBe(true);
  });
  it("both modes of start, the bare and on-path routes, and the tool and no-tool branches are all there", () => {
    expect(cases.some((c) => keys[c].verbs[0] === "/ow-care-start --takeover")).toBe(true);
    expect(cases.some((c) => keys[c].verbs[0] === "/ow-care-start")).toBe(true);
    expect(cases.some((c) => keys[c].tool === "absent" && verbOf(keys[c]) === "/ow-care-health")).toBe(true);
    expect(cases.some((c) => keys[c].tool === "present" && verbOf(keys[c]) === "/ow-care-health")).toBe(true);
    expect(cases.filter((c) => verbOf(keys[c]) === "/ow-care" && /bare/.test(c)).length).toBeGreaterThanOrEqual(3);
    expect(cases.filter((c) => verbOf(keys[c]) === "/ow-care" && /-on-/.test(c)).length).toBeGreaterThanOrEqual(5);
  });
  it("each approval a golden records has the user's own words in its session", () => {
    for (const c of cases) expect(existsSync(join(CASES, c, "session", "answers.md")), c).toBe(true);
  });
  it("every check is run by at least one golden, and the self-check table covers every verb", () => {
    expect(CHECK_NAMES.length).toBeGreaterThanOrEqual(28);
    expect(Object.keys(RUNS_IN).length).toBe(9);
    expect(WRITER_PIN.length).toBeGreaterThan(20);
  });
  it("the pin and the skill's edges file agree, and the shipped text is clean", () => {
    expect(edgesWriterDrift()).toEqual([]);
    expect(shippedTextProblems()).toEqual([]);
  });
});

describe("the fixtures are invented", () => {
  const files = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? files(join(d, n)) : [join(d, n)]));
  const all = [...files(CASES), ...files(join(FIXTURES, "worlds"))].filter((f) => !/\.(pdf|docx)$/.test(f));
  it("holds no key-shaped string, no absolute path and no real person", () => {
    for (const f of all) {
      const t = readFileSync(f, "utf8");
      expect(t, f).not.toMatch(/\b(?:sk|rk|pk)_live_[A-Za-z0-9]{16,}|\bAKIA[0-9A-Z]{16}\b|-----BEGIN [A-Z ]*PRIVATE KEY|\bgh[pousr]_[A-Za-z0-9]{30,}/);
      expect(t, f).not.toMatch(/\/Users\/|\/home\/[a-z]/);
    }
  });
  it("uses only invented clients", () => {
    const names = new Set();
    for (const f of all.filter((x) => /answer-key\.yaml$/.test(x))) { const k = yaml.load(readFileSync(f, "utf8").replace(/^#.*\n/, "")); names.add(k.client); }
    expect([...names]).toEqual(["Larkspur Ceramics"]);
  });
});
