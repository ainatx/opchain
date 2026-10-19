// ow-uat acceptance tests (docs/plans/2026-10-09-ow-uat-design.md §11 and the
// Sprint 3 contract, sprints/release-2.1/ow-sprint-3/contract.md). ow-uat is a
// text-only skill, so a model has to run it. These tests prove the mechanical
// half: every §11 case except "Real use" (Sprint 6) and every C4 route cell has
// an invented golden run that passes scripts/ow-uat-acceptance.mjs; each check
// fails on its own when a file is malformed (C16); the contract calendar's
// table follows the federal rules; the skill text keeps the rules the checker
// cannot see. Planted failures live in tests/ow-uat-plants.test.js.
import { afterAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FIXTURES, addBusinessDays, listCases, loadKey, runCase, tableHolidays } from "../scripts/ow-uat-acceptance.mjs";
import { estimateTokens } from "../scripts/gen-skills-catalog.mjs";
import { checkProtocolCopies } from "../scripts/check-skill-contracts.mjs";
import { loadCatalogs } from "../scripts/lib/catalogs.mjs";
import { matter } from "../scripts/lib/frontmatter.mjs";
import * as yaml from "js-yaml";
import { cleanup, mutated, temp } from "./ow-uat-helpers.mjs";

const ROOT = join(import.meta.dirname, "..");
const SKILL = join(ROOT, "skills-work", "ow-uat");
const CLI = join(ROOT, "scripts", "ow-uat-acceptance.mjs");
afterAll(cleanup);

const CASES = listCases();
const body = () => { const t = readFileSync(join(SKILL, "SKILL.md"), "utf8"); return t.slice(t.indexOf("\n---", 3) + 4); };
const asList = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
/** The rows of the body table under a heading, as arrays of cells (header and separator dropped). */
const b2rows = (text, heading) => {
  const sec = text.slice(text.indexOf(heading) + heading.length).split(/\n## /)[0];
  return sec.split("\n").filter((l) => l.startsWith("|")).slice(2).map((l) => l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
};

describe("golden runs", () => {
  it("there are at least 100 cases, one per §11 case and C4 cell", () => {
    expect(CASES.length).toBeGreaterThanOrEqual(100);
  });
  for (const c of CASES) {
    it(`${c} passes every check its answer key names`, () => {
      const out = runCase(c);
      expect(out.filter((r) => r.problems.length), JSON.stringify(out.filter((r) => r.problems.length), null, 1)).toEqual([]);
      expect(out.length).toBeGreaterThan(0);
    });
  }
  it("every design §11 case except Real use has a golden (by section)", () => {
    const sections = CASES.map((c) => String(loadKey(join(FIXTURES, c)).section ?? "")).join("\n");
    for (const s of ["Coverage", "Required scenario", "Regression", "Entry gate", "Triage", "Condition", "Post-acceptance|Addendum", "Rapid fix", "Punch list", "Request lifecycle", "After the signature date", "Addendum", "Late minor", "Session date", "Deemed", "No-show", "Backstop", "Names", "Credentials", "Real data", "Production", "Test accounts", "After sign-off", "Quick-quote job"]) {
      expect(sections, s).toMatch(new RegExp(s));
    }
  });
  it("every C4 route cell has a case", () => {
    const routes = CASES.map((c) => loadKey(join(FIXTURES, c))).filter((k) => k.route).map((k) => `${k.route.from ?? k.route.say} -> ${k.route.expect}`);
    for (const want of [
      /builds\/larkspur-ceramics\/ready-for-uat\.md -> plan/, /ready-for-uat\.md -> nothing/,
      /use ow-uat-signoff on uat\/[^/]+\/ -> nothing/, /use ow-uat-signoff on uat\/mossgate-books\/ -> signoff --deemed/,
      /use ow-uat-defect on uat\/[^/]+\/ -> defect/, /use ow-uat-defect on uat\/[^/]+\/ -> nothing/, /use ow-uat-plan --addendum CO-04 -> plan --addendum/,
      /use ow-uat-signoff -> signoff/, /use ow-uat-signoff -> ask/,
      /uat\/larkspur-ceramics\/ -> pack/, /uat\/larkspur-ceramics\/ -> run/, /uat\/larkspur-ceramics\/ -> defect/, /uat\/larkspur-ceramics\/ -> signoff$/m,
      /uat\/larkspur-ceramics\/ -> signoff --sent/, /uat\/larkspur-ceramics\/ -> signoff --signed/, /uat\/larkspur-ceramics\/ -> plan --addendum/,
    ]) expect(routes.join("\n"), String(want)).toMatch(want);
    expect(routes.length).toBeGreaterThanOrEqual(25);
  });
});

describe("the checker as a command", () => {
  it("checks every golden run, and a prepared real run", () => {
    const all = spawnSync(process.execPath, [CLI], { encoding: "utf8" });
    expect(all.status, all.stdout.slice(-2000)).toBe(0);
    const dir = mutated("signoff-signed");
    const one = spawnSync(process.execPath, [CLI, "signoff-signed", dir], { encoding: "utf8" });
    expect(one.status, one.stdout).toBe(0);
    const bad = mutated("signoff-signed", { "opchain-work/uat/larkspur-ceramics/punch-list.md": () => null });
    expect(spawnSync(process.execPath, [CLI, "signoff-signed", bad], { encoding: "utf8" }).status).toBe(1);
  }, 180000);
  it("--prepare lays out the starting state and refuses a folder already in use", () => {
    const dir = temp("ow-uat-prep-");
    const r = spawnSync(process.execPath, [CLI, "--prepare", "plan", dir], { encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
    expect(existsSync(join(dir, "opchain-work/builds/larkspur-ceramics/ready-for-uat.md"))).toBe(true);
    expect(existsSync(join(dir, "opchain-work/uat/larkspur-ceramics/uat.yaml"))).toBe(false);
    expect(spawnSync(process.execPath, [CLI, "--prepare", "plan", dir], { encoding: "utf8" }).status).toBe(2);
  });
});

// C16: a malformed file fails the checks that need it, with a reason, and every other check still runs.
describe("C16: the checker fails per check and never crashes", () => {
  const U = "opchain-work/uat/larkspur-ceramics";
  const probe = (caseName, edits, hit) => {
    const dir = mutated(caseName, edits);
    const out = runCase(caseName, dir);
    // Every check the key names runs, plus the basis-mismatch check a -pack, -defect or -signoff run always gets (R2-10).
    const k = loadKey(join(FIXTURES, caseName));
    expect(out.length).toBe(k.checks.length + (asList(k.verbs).some((v) => /^\/ow-uat-(?:pack|signoff|defect)\b/.test(v)) && !k.checks.includes("basis") ? 1 : 0));
    for (const r of out) for (const p of r.problems) expect(p).not.toMatch(/TypeError|undefined is not|Cannot read prop/);
    const failed = out.filter((r) => r.problems.length).map((r) => r.check);
    expect(failed.length).toBeGreaterThan(0);
    expect(failed.length).toBeLessThan(out.length);
    if (hit) expect(failed).toContain(hit);
    return out;
  };
  it("uat.yaml as a directory", () => {
    const dir = mutated("pack");
    rmSync(join(dir, `${U}/uat.yaml`));
    mkdirSync(join(dir, `${U}/uat.yaml`));
    const out = runCase("pack", dir);
    expect(out.find((r) => r.check === "pack").problems.join()).toMatch(/uat\.yaml/);
    expect(out.find((r) => r.check === "status").problems).toEqual([]);
  });
  it("a binary results file", () => probe("run-session-1", { [`${U}/evidence/results-session-1.csv`]: () => "\u0000\u0001ÿ\u0002PK\u0003\u0004binary" }, "run"));
  it("invalid YAML in signoff-requests.yaml", () => probe("signoff-sent-1", { [`${U}/signoff-requests.yaml`]: () => "requests: [ { n: 1, status: sent\n  - :::" }, "signoff"));
  it("a truncated request", () => probe("signoff-request-1", { [`${U}/signoff-request-1.md`]: (t) => t.slice(0, 120) }, "signoff"));
  it("a truncated run and an unreadable UAT-nn header", () => {
    probe("run-confirmation", { [`${U}/runs/RUN-03.md`]: (t) => t.slice(0, 200) }, "run");
    probe("defect-retest", { [`${U}/defects/UAT-03.md`]: (t) => t.replace("---\now_artefact", "---\now_artefact: [unclosed") }, "defect");
  });
  it("an answer key that is not a map", () => {
    const dir = temp("ow-uat-key-");
    writeFileSync(join(dir, "answer-key.yaml"), "- just a list\n");
    expect(runCase("plan", null, { caseDir: dir })[0].problems[0]).toMatch(/answer-key\.yaml could not be used/);
  });
});

describe("C11: the contract calendar", () => {
  it("the table holds the federal holidays for 2026 to 2031, observed days included", () => {
    const t = tableHolidays();
    expect(t.size).toBe(66);
    for (const d of ["2026-07-03", "2026-11-26", "2027-06-18", "2027-07-05", "2027-12-24", "2027-12-31", "2028-11-10", "2029-11-12"]) expect(t.has(d), d).toBe(true);
    for (const d of ["2026-07-04", "2027-06-19", "2027-07-04", "2028-01-01", "2026-11-27"]) expect(t.has(d), d).toBe(false);
  });
  it("the table equals the rules of 5 U.S.C. 6103, computed here independently", () => {
    const d = (y, m, dd) => new Date(Date.UTC(y, m - 1, dd));
    const nth = (y, m, wd, n) => { let x = d(y, m, 1); while (x.getUTCDay() !== wd) x = d(y, m, x.getUTCDate() + 1); return d(y, m, x.getUTCDate() + 7 * (n - 1)); };
    const last = (y, m, wd) => { let x = d(y, m + 1, 0); while (x.getUTCDay() !== wd) x = d(y, m, x.getUTCDate() - 1); return x; };
    const obs = (x) => (x.getUTCDay() === 6 ? new Date(x - 864e5) : x.getUTCDay() === 0 ? new Date(+x + 864e5) : x);
    const want = new Set();
    for (let y = 2026; y <= 2031; y++) for (const h of [d(y, 1, 1), nth(y, 1, 1, 3), nth(y, 2, 1, 3), last(y, 5, 1), d(y, 6, 19), d(y, 7, 4), nth(y, 9, 1, 1), nth(y, 10, 1, 2), d(y, 11, 11), nth(y, 11, 4, 4), d(y, 12, 25)]) want.add(obs(h).toISOString().slice(0, 10));
    want.delete("2025-12-31");
    want.add("2027-12-31"); // New Year's Day 2028, a Saturday, is observed in 2027.
    expect([...tableHolidays()].sort()).toEqual([...want].sort());
  });
  it("the worked case: sent Friday 2026-11-20 plus 10 business days is 2026-12-07 (weekdays alone: 2026-12-04)", () => {
    expect(addBusinessDays("2026-11-20", 10, tableHolidays())).toBe("2026-12-07");
    expect(addBusinessDays("2026-11-20", 10, new Set())).toBe("2026-12-04");
    expect(addBusinessDays("2027-12-30", 1, tableHolidays())).toBe("2028-01-03");
  });
  it("R1-17: the no-tool path crosses into 2031 (2030-12-20 plus 10 business days is 2031-01-07), and the text says where the table ends", () => {
    expect(addBusinessDays("2030-12-20", 10, tableHolidays())).toBe("2031-01-07");
    expect(readFileSync(join(SKILL, "references", "contract-calendar.md"), "utf8")).toMatch(/A count that starts before 2026 or runs past 2031 leaves the table/);
  });
});

describe("the skill text keeps the rules the checker cannot see", () => {
  it("C2: the body is under 4,500 tokens, a cap the catalog enforces; the protocol copy and the shared examples are byte-identical", () => {
    expect(estimateTokens(body())).toBeLessThan(4500);
    expect(loadCatalogs({ root: ROOT }).find((c) => c.id === "ow").bodyTokenBudgets["ow-uat"]).toBe(4500);
    expect(readFileSync(join(SKILL, "references", "ow-protocol.md"))).toEqual(readFileSync(join(ROOT, "skills-work", "ow-protocol.md")));
    expect(checkProtocolCopies(loadCatalogs({ root: ROOT }))).toEqual([]);
    for (const f of ["offers.md", "handoffs.yaml"]) for (const id of ["ow-start", "ow-build-plan", "ow-uat"]) {
      expect(readFileSync(join(ROOT, "skills-work", id, "examples", f), "utf8"), `${id}/${f}`).toBe(readFileSync(join(ROOT, "skills-work", "ow-build-plan", "examples", f), "utf8"));
    }
    expect(readFileSync(join(ROOT, "skills-work", "ow-build", "examples", "handoffs.yaml"), "utf8")).toBe(readFileSync(join(ROOT, "skills-work", "ow-uat", "examples", "handoffs.yaml"), "utf8"));
  });
  it("frontmatter: Agent Skills keys only, version 1.0.0, protocol 1, six verbs", () => {
    const { data } = matter(readFileSync(join(SKILL, "SKILL.md"), "utf8"));
    expect(Object.keys(data).sort()).toEqual(["compatibility", "description", "license", "metadata", "name"]);
    expect(data.metadata.version).toBe("1.0.0");
    expect(data.metadata.protocol).toBe("1");
    expect(data.metadata.commands.split(" ")).toEqual(["/ow-uat", "/ow-uat-plan", "/ow-uat-pack", "/ow-uat-run", "/ow-uat-defect", "/ow-uat-signoff"]);
  });
  it("the body has the welcome, every verb and mode, every file it reads named, the hands-off rows and NEXT blocks with slash hints", () => {
    const b = body();
    for (const v of ["`/ow-uat`", "`/ow-uat on <path>`", "`/ow-uat-plan`", "`/ow-uat-plan --add-co`", "`/ow-uat-plan --addendum`", "`/ow-uat-plan --keep-frozen <file>`", "`/ow-uat-plan --refreeze <file>`", "`/ow-uat-pack`", "`/ow-uat-run`", "`/ow-uat-defect`", "`/ow-uat-signoff`", "`/ow-uat-signoff --sent <n> <date>`", "`/ow-uat-signoff --signed <n> <date> <client role>`", "`/ow-uat-signoff --deemed <n>`", "`/ow-uat-signoff --readiness <date> <dependency>`", "`/ow-uat-signoff --builder-delay <days> <reason>`", "`/ow-uat-signoff --backstop`", "`/ow-uat-signoff --addendum`"]) expect(b, v).toContain(v);
    expect(b).toMatch(/## Welcome \(first run: no `opchain-work\/uat\/`\)/);
    for (const f of ["ready-for-uat.md", "changes/CO-nn.md", "changes/requests.md", "ledger.md", "scope.md", "acceptance.md", "quick-scope.md", "contract-inputs.md", "quote.md", "map/roles.md", "map/future.md", "dates.yaml", "offers.md", "handoffs.yaml", "brand.yaml", "evidence/<file>"]) expect(b, f).toContain(f);
    expect(b.match(/where slash commands exist: \/ow-[a-z-]+/g).length).toBeGreaterThanOrEqual(21);
  });
  it("R1-15: the Reads from table has one row per file: no row names two files, and every file the edges read from another skill has exactly one row", () => {
    const rows = b2rows(body(), "## Reads from");
    const pathsOf = (cell) => [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1].replace(/:$/, "")).filter((s) => /\/|\.(?:md|ya?ml|csv|log)$/.test(s));
    for (const r of rows) expect(pathsOf(r[1] ?? ""), r.join(" | ")).toHaveLength(r[1] && /its own files/.test(r[1]) ? 0 : 1);
    const edges = yaml.load(readFileSync(join(SKILL, "skill.edges.yaml"), "utf8"));
    for (const rd of edges.reads.filter((x) => x.from !== "ow-uat")) {
      const n = rows.filter((r) => pathsOf(r[1] ?? "").includes(rd.path)).length;
      expect(n, rd.path).toBe(1);
    }
  });
  it("R1-14: the build notes reached the phase text: no new request over a live one, the follow-up on profile.md's calendar, the backstop from the day after (OD-4); the body's signed NEXT prints step 0 first", () => {
    const ref = (f) => readFileSync(join(SKILL, "references", f), "utf8");
    expect(ref("phase-signoff.md")).toMatch(/A live request that nothing supersedes means no new one[^\n]*write request n\+1 only when the user asks/);
    expect(ref("phase-signoff.md")).toMatch(/follow_up_business_days` counted on `profile\.md`'s calendar \(not a clause date\)/);
    expect(ref("phase-signoff.md")).toMatch(/the backstop date has not passed \(it applies from the day after it/);
    expect(readFileSync(join(ROOT, "docs", "plans", "2026-10-09-ow-uat-design.md"), "utf8")).toMatch(/the date hasn't passed \(it applies from the day after the backstop date/);
    const signed = body().split("    DONE: signed <date>")[1].split("\n\n")[0];
    expect(signed.indexOf('"use ow-uat-defect on uat/<client>/"')).toBeGreaterThan(-1);
    expect(signed.indexOf('"use ow-uat-defect on uat/<client>/"')).toBeLessThan(signed.indexOf("use ow-build to invoice the acceptance payment"));
  });
  it("OD-5: the schema, the resume step and -plan say the terms block is compared by digest and refrozen alone", () => {
    const ref = (f) => readFileSync(join(SKILL, "references", f), "utf8");
    expect(ref("uat-yaml-schema.md")).toMatch(/\*\*The terms block and its digest\*\* \(owner decisions OD-5, OD-6\)/);
    expect(ref("routing-and-resume.md")).toMatch(/for `agreed\/contract-terms\.md`, compare the `digest` in its basis row with the digest of the same terms block/);
    expect(ref("phase-plan.md")).toMatch(/quote only the terms block again \(never copy `contract-inputs\.md` whole\)/);
  });
  it("OD-6 and R2-1: the block covers the schedule and payment terms; with no code every part is compared as text, never skipped", () => {
    const ref = (f) => readFileSync(join(SKILL, "references", f), "utf8");
    expect(ref("uat-yaml-schema.md")).toMatch(/the header lines `uat:`, `schedule:`, `payment_terms_days:`, `acceptance_definition:`/);
    expect(ref("uat-yaml-schema.md")).toMatch(/compare every part of the block as text, saying it is not machine-checked: `contract_clauses` with `uat\.yaml` `clauses`, `schedule` and `payment_terms_days` with `terms`[\s\S]{0,160}?\. Never skip a part\./);
    expect(ref("uat-yaml-schema.md")).toMatch(/skipping blank and comment lines\)[\s\S]*Read line endings as single newlines/);
    expect(ref("routing-and-resume.md")).toMatch(/with `digest: "none \(no code here\)"`, compare every part of the block as text: the clauses, the payment schedule and payment terms/);
    expect(ref("routing-and-resume.md")).toMatch(/It blocks `-pack`, `-defect` triage and every `-signoff` mode/);
    expect(ref("phase-plan.md")).toMatch(/refreezing `terms` and `clauses` only after the user confirms them again\. Nothing else in `uat\.yaml` changes/);
  });
  it("R2-8 (departure 26): the client reason follows a condition's status, in the format and in the phase", () => {
    const ref = (f) => readFileSync(join(SKILL, "references", f), "utf8");
    expect(ref("defect-format.md")).toMatch(/\*\*The client reason follows the status\.\*\* The reason is not written once at triage: rewrite it when a condition is set[^.]*met[^.]*lapses or is withdrawn/);
    expect(ref("defect-format.md")).toMatch(/never at odds with the status \(section 5\)/);
    expect(ref("phase-defect.md")).toMatch(/Rewrite the client reason each time the condition is set, met, lapses or is withdrawn/);
  });
  it("R2-6 (OD-4) and OD-7 in the text: an explicit clause moves the backstop; a table is judged by its rows", () => {
    const ref = (f) => readFileSync(join(SKILL, "references", f), "utf8");
    expect(ref("phase-signoff.md")).toMatch(/unless the frozen clause says in so many words that it applies on that date; wording that merely counts something "from the same day" does not/);
    expect(ref("self-checks.md")).toMatch(/A table is judged by what its rows hold, never by its length[^.]*\(owner decision OD-7\)/);
  });
  it("owner decisions in the text: O4 resume screen, O5 documentation NEXT, O6 too big, O7 bounds, O8 calendar, the never-waived four", () => {
    const ref = (f) => readFileSync(join(SKILL, "references", f), "utf8");
    expect(ref("routing-and-resume.md")).toMatch(/## 2\. `\/ow-uat`: the resume screen \(owner decision O4\)/);
    expect(ref("phase-signoff.md")).toMatch(/`use ow-documentation-start on uat\/<client>\/`/);
    expect(ref("defect-format.md")).toMatch(/keeps blocking sign-off until the client withdraws it[\s\S]{0,80}It never lapses on its own/);
    expect(ref("self-checks.md")).toMatch(/owner decision O7: "fixed on 14 January, after the 5 business days quoted, at no charge"/);
    expect(ref("contract-calendar.md")).toMatch(/\*\*not supported\*\* \(owner decision O8\)/);
    expect(ref("self-checks.md")).toMatch(/\*\*No credentials, People by role or id, Data check and No private names are never waived\*\*: a typed waiver for one of them is refused/);
    for (const c of ["our hours or effort on fixes or on the test", "our rates and the price book's internals", "our cost or margin", "our overruns against our own plan or estimate"]) expect(ref("self-checks.md"), c).toContain(c);
  });
});
