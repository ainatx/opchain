// ow-uat acceptance tests (docs/plans/2026-10-09-ow-uat-design.md §11 and the
// Sprint 3 contract, sprints/release-2.1/ow-sprint-3/contract.md), as relaxed by
// the 2026-11-03 audience reversal. A model has to run ow-uat. These tests prove the mechanical
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
afterAll(cleanup, 120_000);

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
  it("frontmatter: Agent Skills keys only, version 2.0.0, protocol 2, six verbs", () => {
    const { data } = matter(readFileSync(join(SKILL, "SKILL.md"), "utf8"));
    expect(Object.keys(data).sort()).toEqual(["compatibility", "description", "license", "metadata", "name"]);
    expect(data.metadata.version).toBe("2.0.1");
    expect(data.metadata.protocol).toBe("2");
    expect(data.metadata.commands.split(" ")).toEqual(["/ow-uat", "/ow-uat-plan", "/ow-uat-pack", "/ow-uat-run", "/ow-uat-defect", "/ow-uat-signoff"]);
  });
  it("the body has the welcome, every verb and mode, the question and approval budget, the CRM section and what comes next", () => {
    const b = body();
    for (const v of ["`/ow-uat`", "`/ow-uat on <path>`", "`/ow-uat-plan`", "`/ow-uat-plan --add-co`", "`/ow-uat-plan --addendum`", "`/ow-uat-plan --keep-frozen <file>`", "`/ow-uat-plan --refreeze <file>`", "`/ow-uat-pack`", "`/ow-uat-run`", "`/ow-uat-defect`", "`/ow-uat-signoff`", "`/ow-uat-signoff --sent <n> <date>`", "`/ow-uat-signoff --signed <n> <date> <client role>`", "`/ow-uat-signoff --deemed <n>`", "`/ow-uat-signoff --readiness <date> <dependency>`", "`/ow-uat-signoff --builder-delay <days> <reason>`", "`/ow-uat-signoff --backstop`", "`/ow-uat-signoff --addendum`"]) expect(b, v).toContain(v);
    expect(b).toMatch(/## Welcome/);
    expect(b).toMatch(/\*\*At most three questions per verb\*\*/);
    expect(b).toMatch(/\*\*One approval\*\*: before a sign-off request is sent to the client, and before a signature/);
    expect(b).toMatch(/## Where it lives in the CRM/);
    for (const o of ["`acceptance_criteria`", "`support_requests`", "`ow-tools dw`", "`/api/admin/ingest/*`"]) expect(b, o).toContain(o);
    expect(b).toMatch(/Never overwrite a human-edited version/);
    expect(b).toMatch(/published only when the call returned success/);
    expect(b).toMatch(/## What comes next/);
  });
  it("the kept money and acceptance rules are in the body", () => {
    const b = body();
    expect(b).toMatch(/Never mark acceptance unless every required scenario passes on the latest build, after the last fix/);
    expect(b).toMatch(/a signature or acceptance is the user's statement, with its date, never verified/i);
    expect(b).toMatch(/a request too big for a change order goes to `\/ow-build-plan` as a follow-on/);
    expect(b).toMatch(/priced in writing and agreed before work starts/);
    expect(b).toMatch(/shown to the user as absolute dates/);
    expect(b).toMatch(/no `-signoff` mode runs over an undecided mismatch/);
  });
  it("R1-14 in the phase text: no new request over a live one, the follow-up on profile.md's calendar, the backstop from the day after (OD-4)", () => {
    const ref = (f) => readFileSync(join(SKILL, "references", f), "utf8");
    expect(ref("phase-signoff.md")).toMatch(/A live request that nothing supersedes means no new one[^\n]*write request n\+1 only when the user asks/);
    expect(ref("phase-signoff.md")).toMatch(/follow_up_business_days` counted on `profile\.md`'s calendar \(not a clause date\)/);
    expect(ref("phase-signoff.md")).toMatch(/the backstop date has not passed \(it applies from the day after it/);
    expect(readFileSync(join(ROOT, "docs", "plans", "2026-10-09-ow-uat-design.md"), "utf8")).toMatch(/the date hasn't passed \(it applies from the day after the backstop date/);
  });
  it("a signature on a superseded request marks nothing; sending one is the user's word", () => {
    const s = readFileSync(join(SKILL, "references", "phase-signoff.md"), "utf8");
    expect(s).toMatch(/A signature on a superseded request marks nothing/);
    expect(s).toMatch(/the user may still send it on their word, but a superseded request never becomes acceptance/);
    expect(s).toMatch(/\*\*Never mark acceptance without every required scenario passing after the last fix\.\*\*/);
    expect(s).toMatch(/signature not verified by this skill/);
  });
  it("OD-5: the schema, the routing file and -plan say the terms block is compared by digest and refrozen alone", () => {
    const ref = (f) => readFileSync(join(SKILL, "references", f), "utf8");
    expect(ref("uat-yaml-schema.md")).toMatch(/\*\*The terms block and its digest\*\* \(owner decisions OD-5, OD-6\)/);
    expect(ref("routing-and-resume.md")).toMatch(/for `agreed\/contract-terms\.md`, compare the `digest` in its basis row with the digest of the same terms block/);
    expect(ref("phase-plan.md")).toMatch(/quote only the terms block again \(never copy `contract-inputs\.md` whole\)/);
  });
  it("OD-6 and R2-1: the block covers the schedule and payment terms; with no code every part is compared as text; the mismatch is reported and the user decides", () => {
    const ref = (f) => readFileSync(join(SKILL, "references", f), "utf8");
    expect(ref("uat-yaml-schema.md")).toMatch(/the header lines `uat:`, `schedule:`, `payment_terms_days:`, `acceptance_definition:`/);
    expect(ref("uat-yaml-schema.md")).toMatch(/compare every part of the block as text, saying it is not machine-checked: `contract_clauses` with `uat\.yaml` `clauses`, `schedule` and `payment_terms_days` with `terms`[\s\S]{0,400}?\. Never skip a part\./);
    expect(ref("uat-yaml-schema.md")).toMatch(/skipping blank and comment lines\)[\s\S]*Read line endings as single newlines/);
    expect(ref("routing-and-resume.md")).toMatch(/with `digest: "none \(no code here\)"`, compare every part of the block as text: the clauses, the payment schedule and payment terms/);
    expect(ref("routing-and-resume.md")).toMatch(/report it with both dates, and the user decides/);
    expect(ref("routing-and-resume.md")).toMatch(/\*\*Every `-signoff` mode waits for that decision\*\*/);
    expect(ref("phase-plan.md")).toMatch(/taking `terms` and `clauses` again only after the user confirms them/);
  });
  it("R2-8 (departure 26): the client reason follows a condition's status, in the format and in the phase", () => {
    const ref = (f) => readFileSync(join(SKILL, "references", f), "utf8");
    expect(ref("defect-format.md")).toMatch(/\*\*The client reason follows the status\.\*\* The reason does not stop at triage: rewrite it when a condition is set[^.]*met[^.]*lapses or is withdrawn/);
    expect(ref("defect-format.md")).toMatch(/never at odds with the status \(section 5\)/);
    expect(ref("phase-defect.md")).toMatch(/Rewrite the client reason each time the condition is set, met, lapses or is withdrawn/);
  });
  it("the kept owner decisions in the text: R3-6, R3-4, R3-1, R3-5, R3-2, and the changelog", () => {
    const ref = (f) => readFileSync(join(SKILL, "references", f), "utf8");
    expect(ref("phase-plan.md")).toMatch(/\*\*A changed check list is not refrozen\*\*[^\n]*owner decision R3-6\)[^\n]*write nothing, name each changed check, and say that a new check comes in through a change order, with its scenario, its test and its price/);
    expect(ref("self-checks.md")).toMatch(/Test data is not a record value \(owner decision R3-4\): a payment provider's published test card[\s\S]*A real card shape, or an id with no such mark, still is\./);
    expect(ref("uat-yaml-schema.md")).toMatch(/the UAT line's price and test mix with the line `contract-terms\.md` quotes[\s\S]*A part removed upstream is a difference too\. Never skip a part\./);
    expect(ref("uat-yaml-schema.md")).toMatch(/ignore a byte-order mark at the start of the file/);
    expect(ref("phase-signoff.md")).toMatch(/or says it does not apply or never falls due on that date, does not/);
    const skill = readFileSync(join(SKILL, "SKILL.md"), "utf8");
    expect(skill).toMatch(/^  version: "2\.0\.1"$/m);
    expect(skill).toMatch(/^ow-uat 2\.0\.1 · protocol 2 · Core bundle$/m);
    const log = readFileSync(join(SKILL, "CHANGELOG.md"), "utf8");
    expect(log).toMatch(/^## 2\.0\.0 \(2026-11-03\): the audience reversal/m);
    expect(log).toContain("docs/plans/2026-11-03-ow-audience-reversal.md");
    expect(log).toMatch(/\*\*The CRM is the record\*\*/);
    expect(log.indexOf("## 2.0.0 (2026-11-03)")).toBeLessThan(log.indexOf("## 1.0.2 (2026-10-19)"));
    expect(log.indexOf("## 1.0.2 (2026-10-19)")).toBeLessThan(log.indexOf("## 1.0.1 (2026-10-19)"));
    for (const d of ["R3-6", "R3-4"]) expect(log).toContain(`owner decision ${d}`);
  });
  it("R2-6 (OD-4) and OD-7 in the text: an explicit clause moves the backstop; a table is judged by its rows", () => {
    const ref = (f) => readFileSync(join(SKILL, "references", f), "utf8");
    expect(ref("phase-signoff.md")).toMatch(/unless the clause says in so many words that it applies on that date; wording that merely counts something "from the same day", or says it does not apply or never falls due on that date, does not/);
    expect(ref("self-checks.md")).toMatch(/A table is judged by what its rows hold, never by its length[^.]*\(owner decision OD-7\)/);
  });
  it("owner decisions in the text: O5 documentation next, O6 too big, O7 bounds, O8 calendar, what is never waived, the calendar's table of dates", () => {
    const ref = (f) => readFileSync(join(SKILL, "references", f), "utf8");
    expect(ref("phase-signoff.md")).toMatch(/`\/ow-documentation-start`/);
    expect(ref("defect-format.md")).toMatch(/keeps blocking sign-off until the client withdraws it[\s\S]{0,80}It never lapses on its own/);
    expect(ref("self-checks.md")).toMatch(/owner decision O7: "fixed on 14 January, after the 5 business days quoted, at no charge"/);
    expect(ref("contract-calendar.md")).toMatch(/\*\*not supported\*\* \(owner decision O8\)/);
    expect(ref("contract-calendar.md")).toMatch(/\*\*shown to the user as an absolute date\*\*/);
    expect(ref("self-checks.md")).toMatch(/except on credentials, client data, private names and acceptance, which are not waived/);
    for (const c of ["our hours or effort on fixes or on the test", "our rates and the price book's internals", "our cost or margin", "our overruns against our own plan or estimate"]) expect(ref("self-checks.md"), c).toContain(c);
  });
});
