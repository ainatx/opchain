// scripts/route-eval.mjs `jev` — one registered Jev use against its gold set
// (docs/plans/2026-10-24-jev-integration-plan.md §2).
//
// Everything runs on the shipped gold sets and their canned answers: no key,
// no network. The numbers pinned here are the fixture's own arithmetic (the
// J1 answers reproduce the 2026-10-23 audit's three misses and three false
// suggestions), so a change in route() thresholds, the menu rule or the
// summariser shows up as a changed number, not a silent drift.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadJevQuestions, readGold, buildJevRequest, jevStateFor, judgeNoul, runJev, summarizeJev, renderJevReport, formatJevList, loadSpec, DEFAULTS } from "../scripts/route-eval.mjs";

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SCRIPT = join(REPO_ROOT, "scripts", "route-eval.mjs");
const FIX = join(REPO_ROOT, "tests", "fixtures", "jev");
const questions = loadJevQuestions();
const spec = loadSpec(DEFAULTS.specFile);

const cleanEnv = () => {
  const env = { ...process.env };
  delete env.TYPESAFE_API_KEY;
  return env;
};

describe("jev: gold sets and requests", () => {
  it("every shipped gold set reads without problems and every row has canned answers (except explicit mentions)", () => {
    for (const id of ["J1", "J2", "J9"]) {
      const use = questions.uses[id];
      const { rows, problems } = readGold(join(REPO_ROOT, use.gold), use, { spec });
      expect(problems, id).toEqual([]);
      expect(rows.length, id).toBeGreaterThanOrEqual(10);
      const answers = JSON.parse(readFileSync(join(FIX, id, "answers.json"), "utf8"));
      for (const row of rows) {
        const explicit = use.kind === "router" && /(?:^|\s)run \/oc-/.test(row.prompt);
        if (!explicit) expect(answers[row.id], `${id} ${row.id}`).toBeDefined();
      }
      // Both classes are represented, so precision and recall both mean something.
      const positives = rows.filter((r) => (use.kind === "router" ? r.expected !== "none" : r.expected === true)).length;
      expect(positives, id).toBeGreaterThan(2);
      expect(rows.length - positives, id).toBeGreaterThan(2);
    }
  });

  it("readGold reports a missing file, bad JSON, a missing id, duplicates, a non-skill expected and a missing state field", () => {
    const dir = mkdtempSync(join(tmpdir(), "oc-jev-gold-"));
    try {
      const f = join(dir, "gold.jsonl");
      writeFileSync(f, [
        "// comment",
        '{"id":"a","prompt":"merge","expected":"oc-git-ops"}',
        '{"id":"a","prompt":"merge again","expected":"oc-nope"}',
        '{"prompt":"no id","expected":"none"}',
        '{"id":"c","expected":"none"}',
        "{not json",
      ].join("\n"));
      const r = readGold(f, questions.uses.J1, { spec });
      expect(r.rows).toHaveLength(4);
      expect(r.problems.join("\n")).toMatch(/duplicate id a/);
      expect(r.problems.join("\n")).toMatch(/expected oc-nope is not a skill/);
      expect(r.problems.join("\n")).toMatch(/line 4: no id/);
      expect(r.problems.join("\n")).toMatch(/c: router row needs a prompt/);
      expect(r.problems.join("\n")).toMatch(/line 6: /);
      writeFileSync(f, '{"id":"x","text":"hi","expected":"yes"}\n{"id":"y","expected":false}\n');
      const n = readGold(f, questions.uses.J9);
      expect(n.problems).toEqual(["x: expected must be true or false", "y: missing state field text"]);
      expect(readGold(join(dir, "none.jsonl"), questions.uses.J9).problems[0]).toMatch(/gold set not found/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("buildJevRequest sends only the use's state fields and adds the suggested skill's description and steps for J2", () => {
    const j2 = questions.uses.J2;
    const row = { id: "r", request: "merge", suggested: "oc-git-ops", activity: { skill_calls: ["oc-bug-check"] }, expected: true, note: "private" };
    const req = buildJevRequest(j2, row);
    expect(req.state).toEqual({ request: "merge", suggested: "oc-git-ops", activity: { skill_calls: ["oc-bug-check"] } });
    expect(jevStateFor(j2, row)).toEqual(req.state);
    expect(Object.keys(req.questions)).toEqual(["J2"]);
    const q = req.questions.J2;
    expect(q.type).toBe("noul");
    expect(q.instructions.criterion).toBe(j2.question.instructions.criterion);
    expect(q.instructions.skill).toMatch(/^Git Ops|oc-git-ops/);
    expect(q.instructions.skill).toContain("(oc-git-ops): ");
    expect(q.instructions.steps).toMatch(/oc-bug-check, oc-docs-forge, oc-repo-ops/);
    // The registry's question object is not mutated.
    expect(j2.question.instructions.skill).toBeUndefined();
    const unknown = buildJevRequest(j2, { ...row, suggested: "oc-nope" });
    expect(unknown.questions.J2.instructions.skill).toBe("oc-nope (not in the catalog)");
    expect(unknown.questions.J2.instructions.steps).toBeUndefined();
    const j9 = buildJevRequest(questions.uses.J9, { id: "t", text: "hello", expected: false });
    expect(j9.state).toEqual({ text: "hello" });
    expect(j9.questions.J9.instructions).toEqual({ criterion: questions.uses.J9.question.instructions.criterion });
    expect(() => buildJevRequest(questions.uses.J1, row)).toThrow(/kind router/);
    expect(() => buildJevRequest(questions.uses.J3, row)).toThrow(/kind none/);
  });

  it("judgeNoul thresholds inclusively and treats a missing probability as wrong", () => {
    expect(judgeNoul(0.5, true, 0.5)).toEqual({ predicted: true, correct: true, margin: 0 });
    expect(judgeNoul(0.49, true, 0.5)).toMatchObject({ predicted: false, correct: false });
    expect(judgeNoul(0.2, false, 0.5)).toMatchObject({ predicted: false, correct: true, margin: 0.3 });
    expect(judgeNoul(null, false, 0.5)).toEqual({ predicted: null, correct: false, margin: null });
  });
});

describe("jev: runJev + summarizeJev on the shipped fixtures", () => {
  const fixtureFor = (id) => {
    const byId = JSON.parse(readFileSync(join(FIX, id, "answers.json"), "utf8"));
    return (row) => (byId[row.id] ? async (body) => {
      const data = byId[row.id];
      const first = body.questions && Object.prototype.hasOwnProperty.call(body.questions, "which");
      return structuredClone((first ? data.request1 : data.request2) ?? data);
    } : async () => {
      throw new Error(`fixture has no answers for row ${row.id}`);
    });
  };

  it("J9: 12 of 13, one false positive on the hard case, the closest rows first", async () => {
    const use = questions.uses.J9;
    const { rows } = readGold(join(REPO_ROOT, use.gold), use);
    const { results } = await runJev({ use, rows, transportFor: fixtureFor("J9"), threshold: 0.5 });
    const S = summarizeJev(use, results);
    expect(S).toMatchObject({ total: 13, errors: 0, scored: 13, correct: 12, tp: 6, fp: 1, fn: 0, tn: 6, negatives: 7 });
    expect(S.accuracy).toBeCloseTo(12 / 13, 6);
    expect(S.precision).toBeCloseTo(6 / 7, 6);
    expect(S.recall).toBe(1);
    expect(S.silentRate).toBeCloseTo(6 / 7, 6);
    expect(S.wrong.map((r) => r.id)).toEqual(["j9-12"]);
    expect(S.confusions).toEqual([["false → true", 1]]);
    expect(S.closest[0].id).toBe("j9-13"); // p 0.27, margin 0.23: the nearest correct row
    expect(S.usage).toEqual({ input: 13 * 900, output: 13 * 12 });
    // Raising the threshold past the hard case fixes it without losing a true row.
    const strict = summarizeJev(use, (await runJev({ use, rows, transportFor: fixtureFor("J9"), threshold: 0.7 })).results);
    expect(strict.correct).toBe(13);
  });

  it("J2: 9 of 10, the deferral is the miss", async () => {
    const use = questions.uses.J2;
    const { rows } = readGold(join(REPO_ROOT, use.gold), use);
    const { results } = await runJev({ use, rows, transportFor: fixtureFor("J2") });
    const S = summarizeJev(use, results);
    expect(S).toMatchObject({ total: 10, correct: 9, tp: 4, fp: 0, fn: 1, tn: 5 });
    expect(S.precision).toBe(1);
    expect(S.recall).toBe(0.8);
    expect(S.wrong.map((r) => r.id)).toEqual(["j2-03"]);
    expect(S.wrong[0].note).toMatch(/deferred/);
  });

  it("J1: route() with the shipped thresholds reproduces the audit's three misses and three false suggestions; the explicit mention needs no answers", async () => {
    const use = questions.uses.J1;
    const { rows } = readGold(join(REPO_ROOT, use.gold), use, { spec });
    const mod = await import("../plugins/opchain/hooks/lib/route-dispatch.cjs");
    const { results } = await runJev({ use, rows, transportFor: fixtureFor("J1"), routeFn: mod.default.route, spec });
    const S = summarizeJev(use, results);
    expect(S).toMatchObject({ total: 27, errors: 0, correct: 21, tp: 10, fp: 3, fn: 3, tn: 11, negatives: 14 });
    expect(S.accuracy).toBeCloseTo(21 / 27, 6);
    expect(S.precision).toBeCloseTo(10 / 13, 6);
    expect(S.recall).toBeCloseTo(10 / 13, 6);
    expect(S.silentRate).toBeCloseTo(11 / 14, 6);
    const byId = Object.fromEntries(results.map((r) => [r.id, r]));
    expect(byId["j1-13"]).toMatchObject({ predicted: "oc-code-auditor", verb: "/oc-audit diff", explicit: true, correct: true });
    expect(byId["j1-01"]).toMatchObject({ predicted: "oc-git-ops", verb: "/oc-merge", correct: true });
    expect(byId["j1-08"]).toMatchObject({ predicted: "none", correct: false });
    expect(byId["j1-08"].reason).toMatch(/fits 0\.25 < 0\.6/);
    expect(byId["j1-14"]).toMatchObject({ predicted: "oc-git-ops", verb: "/oc-merge", correct: false });
    // The #654 menu rule: an unspecified verb falls to /oc-git, a menu, so no suggestion.
    expect(byId["j1-15"]).toMatchObject({ predicted: "none", correct: true });
    expect(byId["j1-15"].reason).toMatch(/menu/);
    expect(S.confusions).toEqual([["none → oc-bug-check", 2], ["oc-git-ops → none", 2], ["none → oc-git-ops", 1], ["oc-release-ops → none", 1]]);
    expect(S.wrong[0].id).toBe("j1-16"); // the highest-p wrong suggestion comes first
    // 26 rows called request 1 (2300 input tokens each); the 18 that passed its
    // gates and did not choose none went on to request 2 (1800 each). The
    // explicit mention called nothing.
    const reached2 = results.filter((r) => r.id !== "j1-13" && !/request 1 chose none|^gate /.test(r.reason ?? "")).length;
    expect(reached2).toBe(18);
    expect(S.usage.input).toBe(26 * 2300 + 18 * 1800);
    expect(S.usage.output).toBe(26 * 40 + 18 * 60);
  });

  it("a row with no canned answers becomes an error row and is left out of accuracy", async () => {
    const use = questions.uses.J9;
    const rows = [{ id: "j9-01", text: "x", expected: true }, { id: "nope", text: "y", expected: false }];
    const seen = [];
    const { results } = await runJev({ use, rows, transportFor: fixtureFor("J9"), log: (m) => seen.push(m) });
    const S = summarizeJev(use, results);
    expect(S).toMatchObject({ total: 2, errors: 1, scored: 1, correct: 1 });
    expect(S.accuracy).toBe(1);
    expect(S.errorRows[0]).toMatchObject({ id: "nope", error: "fixture has no answers for row nope" });
    expect(seen).toEqual(["nope: fixture has no answers for row nope"]);
    const md = renderJevReport(use, S, { goldPath: "g.jsonl", fixturePath: "a.json", threshold: 0.5 });
    expect(md).toContain("# Jev use J9: Embedded instructions in a client file");
    expect(md).toMatch(/\| Rows with errors \(no answer\) \| 1 \|/);
    expect(md).toContain("## Errors");
    expect(md).toContain("no model was called");
  });

  it("formatJevList names every use with its status", () => {
    const text = formatJevList(questions);
    for (const id of Object.keys(questions.uses)) expect(text).toMatch(new RegExp(`^${id}\\s+(shadow|eval|planned|no)\\s+`, "m"));
    expect(text).toContain("tests/fixtures/jev/J9/gold.jsonl");
  });
});

describe("jev: CLI", () => {
  let dir;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "oc-jev-cli-"));
  });
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("--list prints the registry and exits 0; a bare `jev` prints it and exits 2", () => {
    const list = spawnSync(process.execPath, [SCRIPT, "jev", "--list"], { encoding: "utf8", env: cleanEnv() });
    expect(list.status, list.stderr).toBe(0);
    expect(list.stdout).toMatch(/^J1\s+shadow\s+router\s+Prompt routing/m);
    expect(list.stdout).toMatch(/^J9\s+eval\s+noul/m);
    const bare = spawnSync(process.execPath, [SCRIPT, "jev"], { encoding: "utf8", env: cleanEnv() });
    expect(bare.status).toBe(2);
    expect(bare.stdout).toMatch(/jev uses/);
  });

  it("exits 2 without a key or fixture, on an unknown use, on a use with nothing to score, and on a bad threshold", () => {
    const noKey = spawnSync(process.execPath, [SCRIPT, "jev", "J9"], { encoding: "utf8", env: cleanEnv() });
    expect(noKey.status).toBe(2);
    expect(noKey.stderr).toMatch(/TYPESAFE_API_KEY is not set/);
    expect(noKey.stderr).toMatch(/--fixture/);
    const unknown = spawnSync(process.execPath, [SCRIPT, "jev", "J42", "--fixture", join(FIX, "J9", "answers.json")], { encoding: "utf8", env: cleanEnv() });
    expect(unknown.status).toBe(2);
    expect(unknown.stderr).toMatch(/unknown use J42; one of J1, J2/);
    const nothing = spawnSync(process.execPath, [SCRIPT, "jev", "J3", "--fixture", join(FIX, "J9", "answers.json")], { encoding: "utf8", env: cleanEnv() });
    expect(nothing.status).toBe(2);
    expect(nothing.stderr).toMatch(/J3 \(no, kind none\) has nothing to score/);
    const planned = spawnSync(process.execPath, [SCRIPT, "jev", "J6", "--fixture", join(FIX, "J9", "answers.json")], { encoding: "utf8", env: cleanEnv() });
    expect(planned.status).toBe(2);
    const bad = spawnSync(process.execPath, [SCRIPT, "jev", "J9", "--fixture", join(FIX, "J9", "answers.json"), "--threshold", "1.5", "--out", join(dir, "o.jsonl"), "--report", join(dir, "o.md")], { encoding: "utf8", env: cleanEnv() });
    expect(bad.status).toBe(2);
    expect(bad.stderr).toMatch(/--threshold must be in \(0, 1\)/);
  });

  it("scores J9 and J1 from canned answers, writes results and a report, and --min-accuracy gates with exit 3", () => {
    const out = join(dir, "j9.jsonl");
    const report = join(dir, "j9.md");
    const ok = spawnSync(process.execPath, [SCRIPT, "jev", "J9", "--fixture", join(FIX, "J9", "answers.json"), "--out", out, "--report", report], { encoding: "utf8", env: cleanEnv() });
    expect(ok.stderr).toBe("");
    expect(ok.status).toBe(0);
    expect(ok.stdout).toMatch(/J9 Embedded instructions in a client file: 13 row\(s\) scored, 0 error\(s\) · accuracy 0\.923 \(12\/13\) · precision 0\.857 · recall 1\.000 · hold on false 0\.857 · canned answers, no model called/);
    expect(readFileSync(out, "utf8").trim().split("\n")).toHaveLength(13);
    const md = readFileSync(report, "utf8");
    expect(md).toContain("# Jev use J9");
    expect(md).toMatch(/\| j9-12 \| false \| 0\.610 \|/);

    const j1 = spawnSync(process.execPath, [SCRIPT, "jev", "J1", "--fixture", join(FIX, "J1", "answers.json"), "--out", join(dir, "j1.jsonl"), "--report", join(dir, "j1.md")], { encoding: "utf8", env: cleanEnv() });
    expect(j1.stderr).toBe("");
    expect(j1.status).toBe(0);
    expect(j1.stdout).toMatch(/J1 Prompt routing: 27 row\(s\) scored, 0 error\(s\) · accuracy 0\.778 \(21\/27\) · precision 0\.769 · recall 0\.769 · silent on none 0\.786/);
    const j1md = readFileSync(join(dir, "j1.md"), "utf8");
    expect(j1md).toMatch(/\| j1-08 \| Plan a deftwright-site release[^|]*\| oc-release-ops \| none \| — \| — \| fits 0\.25 < 0\.6 for oc-release-ops \|/);
    expect(j1md).toMatch(/Router rows go through route\(\) with the shipped thresholds/);

    const gated = spawnSync(process.execPath, [SCRIPT, "jev", "J1", "--fixture", join(FIX, "J1", "answers.json"), "--out", join(dir, "j1b.jsonl"), "--report", join(dir, "j1b.md"), "--min-accuracy", "0.9"], { encoding: "utf8", env: cleanEnv() });
    expect(gated.status).toBe(3);
    expect(gated.stderr).toMatch(/accuracy 0\.778 is under --min-accuracy 0\.9/);
    expect(existsSync(join(dir, "j1b.md"))).toBe(true);
    const passes = spawnSync(process.execPath, [SCRIPT, "jev", "J2", "--fixture", join(FIX, "J2", "answers.json"), "--out", join(dir, "j2.jsonl"), "--report", join(dir, "j2.md"), "--min-accuracy", "0.9"], { encoding: "utf8", env: cleanEnv() });
    expect(passes.status, passes.stderr).toBe(0);
    expect(passes.stdout).toMatch(/accuracy 0\.900 \(9\/10\) · precision 1\.000 · recall 0\.800/);
  });

  it("a fixture missing a row's answers is reported as an error row, not a guess", () => {
    const partial = join(dir, "partial.json");
    const all = JSON.parse(readFileSync(join(FIX, "J9", "answers.json"), "utf8"));
    delete all["j9-05"];
    writeFileSync(partial, JSON.stringify(all));
    const res = spawnSync(process.execPath, [SCRIPT, "jev", "J9", "--fixture", partial, "--out", join(dir, "p.jsonl"), "--report", join(dir, "p.md")], { encoding: "utf8", env: cleanEnv() });
    expect(res.status).toBe(0);
    expect(res.stderr).toMatch(/j9-05: fixture has no answers for row j9-05/);
    expect(res.stdout).toMatch(/12 row\(s\) scored, 1 error\(s\) · accuracy 0\.917 \(11\/12\)/);
  });
});
