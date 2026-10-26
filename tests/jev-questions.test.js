// scripts/gen-route-spec.mjs — the second output, plugins/opchain/hooks/
// jev-questions.json, generated from scripts/jev-uses.json plus the route spec
// (docs/plans/2026-10-24-jev-integration-plan.md §2).
//
// The quiet failures are the interesting ones: a use whose wording drifted
// from the tracked file, J1's gates or rules diverging from what the router
// actually sends, a skill missing from J2's options, a gold set that moved.
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSpec, buildJevQuestions, renderQuestions, DEFAULT_QUESTIONS_OUT, DEFAULT_USES, USE_STATUSES, USE_KINDS } from "../scripts/gen-route-spec.mjs";
import { SKILL_STEPS } from "../scripts/route-eval.mjs";

const require = createRequire(import.meta.url);
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const GEN = join(ROOT, "scripts", "gen-route-spec.mjs");
const ROUTER = require("../plugins/opchain/hooks/lib/route-dispatch.cjs");

const { spec } = buildSpec();
const { questions, problems } = buildJevQuestions({ spec });
const registry = JSON.parse(readFileSync(DEFAULT_USES, "utf8"));

describe("gen-route-spec: jev-questions contract", () => {
  it("builds without problems, deterministically, with sorted keys", () => {
    expect(problems).toEqual([]);
    expect(renderQuestions(buildJevQuestions({ spec }).questions)).toBe(renderQuestions(questions));
    const sorted = (o) => JSON.stringify(Object.keys(o)) === JSON.stringify([...Object.keys(o)].sort());
    expect(sorted(questions)).toBe(true);
    expect(sorted(questions.uses)).toBe(true);
    for (const u of Object.values(questions.uses)) expect(sorted(u), u.id).toBe(true);
    expect(Object.keys(questions)).toEqual(["generatedFrom", "schema", "uses", "version"]);
  });

  it("is versioned with the spec and names J1 to J9 with a legal status and kind", () => {
    expect(questions.version).toBe(spec.version);
    expect(questions.generatedFrom).toBe(spec.generatedFrom);
    expect(Object.keys(questions.uses)).toEqual(["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8", "J9"]);
    for (const [id, u] of Object.entries(questions.uses)) {
      expect(u.id).toBe(id);
      expect(USE_STATUSES).toContain(u.status);
      expect(USE_KINDS).toContain(u.kind);
      expect(u.name.length).toBeGreaterThan(3);
      expect(u.summary.length).toBeGreaterThan(40);
      if (u.status === "shadow" || u.status === "eval") {
        expect(existsSync(join(ROOT, u.gold)), `${id} gold`).toBe(true);
        expect(u.caller, id).toBeTruthy();
        expect(Array.isArray(u.state) && u.state.length > 0, id).toBe(true);
      } else expect(u.reason, id).toBeTruthy();
    }
    expect(questions.uses.J1.status).toBe("shadow");
    expect(questions.uses.J2.status).toBe("eval");
    expect(questions.uses.J9.status).toBe("eval");
  });

  it("J1 carries exactly what the router sends: the spec's gates, REQUEST_RULES, the none/unspecified texts and the shipped thresholds", () => {
    const j1 = questions.uses.J1;
    expect(j1.kind).toBe("router");
    expect(j1.spec).toBe("route-spec.json");
    expect(j1.gates).toEqual(spec.gates);
    expect(j1.rules).toEqual(ROUTER.REQUEST_RULES);
    expect(j1.none).toBe(ROUTER.NONE_DESCRIPTION);
    expect(j1.unspecified).toBe(ROUTER.UNSPECIFIED_DESCRIPTION);
    const T = ROUTER.DEFAULT_THRESHOLDS;
    expect(j1.thresholds).toEqual({ gate: T.gate, coreFits: T.coreFits, otherFits: T.otherFits, minTopProb: T.minTopProb, verb: T.verb });
    expect(j1.core).toEqual([...ROUTER.CORE_SKILLS].sort());
    expect(j1.question).toBeUndefined();
  });

  it("J2 and J9 carry an API-shaped Noul question; J2 lists every routable skill with the eval's own steps", () => {
    for (const id of ["J2", "J9"]) {
      const q = questions.uses[id].question;
      expect(q.type).toBe("noul");
      expect(q.instructions.criterion.length).toBeGreaterThan(80);
      expect(Object.keys(q.criteria)).toEqual(["false", "true"]);
      expect(questions.uses[id].threshold).toBe(0.5);
    }
    const routable = Object.keys(spec.skills).filter((s) => spec.skills[s].baseVerb && Object.keys(spec.skills[s].verbs).length).sort();
    expect(Object.keys(questions.uses.J2.skills)).toEqual(routable);
    for (const [skill, entry] of Object.entries(questions.uses.J2.skills)) {
      expect(entry.displayName).toBe(spec.skills[skill].displayName);
      expect(entry.index).toBe(spec.skills[skill].index);
      expect(entry.steps).toEqual([...(SKILL_STEPS[skill] ?? [])].sort());
    }
    expect(questions.uses.J2.state).toEqual(["request", "suggested", "activity"]);
    expect(questions.uses.J9.state).toEqual(["text"]);
    // The protocol text is quoted, never edited: the use names its source.
    expect(questions.uses.J9.summary).toMatch(/ow-protocol\.md §3d/);
    expect(questions.uses.J9.caller).toMatch(/no ow- skill text changes/);
  });

  it("the registry's wording is applied verbatim (whitespace-normalised)", () => {
    for (const [id, u] of Object.entries(registry.uses)) {
      const out = questions.uses[id];
      expect(out.name).toBe(u.name);
      expect(out.summary).toBe(u.summary);
      if (u.question && out.kind === "noul") {
        const clean = (v) => String(v).replace(/\s+/g, " ").trim();
        expect(out.question.instructions.criterion).toBe(clean(u.question.criterion));
        expect(out.question.criteria.true).toBe(clean(u.question.true));
        expect(out.question.criteria.false).toBe(clean(u.question.false));
      }
    }
  });

  it("the tracked plugins/opchain/hooks/jev-questions.json is in sync", () => {
    expect(readFileSync(DEFAULT_QUESTIONS_OUT, "utf8")).toBe(renderQuestions(questions));
  });

  it("flags a bad registry: id shape, status, kind, missing wording, unknown steps skill, missing gold, a router use with a question", () => {
    const dir = mkdtempSync(join(tmpdir(), "oc-jev-uses-"));
    try {
      const uses = join(dir, "uses.json");
      writeFileSync(
        uses,
        JSON.stringify({
          schema: 1,
          uses: {
            X1: { name: "bad id", status: "eval", kind: "noul", summary: "s", state: ["text"], gold: "nope.jsonl", caller: "c", threshold: 0.5, question: { criterion: "c", true: "t", false: "f" } },
            J2: { name: "", status: "live", kind: "essay", summary: "" },
            J3: { name: "router with question", status: "shadow", kind: "router", summary: "a router use that should not carry a question", state: ["request"], gold: "tests/fixtures/jev/J1/gold.jsonl", caller: "c", question: { criterion: "x" } },
            J4: { name: "steps", status: "planned", kind: "noul", summary: "steps naming an unknown skill", reason: "r", steps: { "oc-nope": ["oc-git-ops"], "oc-git-ops": ["oc-also-nope"] } },
            J5: { name: "no reason", status: "no", kind: "none", summary: "a rejected use without a reason" },
            J6: { name: "noul without question", status: "eval", kind: "noul", summary: "an eval use missing its question and threshold", state: ["text"], gold: "tests/fixtures/jev/J9/gold.jsonl", caller: "c" },
          },
        }),
      );
      const bad = buildJevQuestions({ spec, usesPath: uses }).problems.join("\n");
      expect(bad).toMatch(/id X1 is not J<n>/);
      expect(bad).toMatch(/X1 gold set missing: nope\.jsonl/);
      expect(bad).toMatch(/J2 has no name/);
      expect(bad).toMatch(/J2 status "live" is not one of/);
      expect(bad).toMatch(/J2 kind "essay" is not one of/);
      expect(bad).toMatch(/J2 has no summary/);
      expect(bad).toMatch(/J3 is kind router; its questions come from route-dispatch/);
      expect(bad).toMatch(/J4 steps names unknown skill oc-nope/);
      expect(bad).toMatch(/J4 steps for oc-git-ops must list known skills/);
      expect(bad).toMatch(/J5 \(no\) needs a `reason`/);
      expect(bad).toMatch(/J6 \(eval\) needs question\.criterion/);
      expect(bad).toMatch(/J6 \(eval\) needs a threshold/);
      expect(buildJevQuestions({ spec, usesPath: join(dir, "missing.json") }).problems[0]).toMatch(/uses file not found/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("gen-route-spec: CLI writes and checks both outputs", () => {
  it("writes jev-questions.json beside the spec; --check fails when either drifts; a bad registry exits 1", () => {
    const dir = mkdtempSync(join(tmpdir(), "oc-jev-questions-cli-"));
    const out = join(dir, "route-spec.json");
    const qOut = join(dir, "jev-questions.json");
    try {
      const write = spawnSync(process.execPath, [GEN, "--out", out], { encoding: "utf8" });
      expect(write.status, write.stderr).toBe(0);
      expect(write.stdout).toMatch(/9 jev uses/);
      expect(existsSync(qOut)).toBe(true);
      expect(readFileSync(qOut, "utf8")).toBe(renderQuestions(questions));

      const ok = spawnSync(process.execPath, [GEN, "--check", "--out", out], { encoding: "utf8" });
      expect(ok.status, ok.stderr).toBe(0);
      expect(ok.stdout).toMatch(/36 skills, 9 jev uses, in sync/);

      writeFileSync(qOut, readFileSync(qOut, "utf8").replace('"name": "Prompt routing"', '"name": "Prompt routing DRIFT"'));
      const drift = spawnSync(process.execPath, [GEN, "--check", "--out", out], { encoding: "utf8" });
      expect(drift.status).toBe(1);
      expect(drift.stderr).toMatch(/jev-questions\.json is stale/);

      const elsewhere = join(dir, "q2.json");
      const alt = spawnSync(process.execPath, [GEN, "--out", out, "--questions-out", elsewhere], { encoding: "utf8" });
      expect(alt.status, alt.stderr).toBe(0);
      expect(readFileSync(elsewhere, "utf8")).toBe(renderQuestions(questions));

      const badUses = join(dir, "uses.json");
      mkdirSync(dirname(badUses), { recursive: true });
      writeFileSync(badUses, JSON.stringify({ schema: 1, uses: { J1: { name: "x", status: "shadow", kind: "router", summary: "s" } } }));
      const bad = spawnSync(process.execPath, [GEN, "--out", out, "--uses", badUses], { encoding: "utf8" });
      expect(bad.status).toBe(1);
      expect(bad.stderr).toMatch(/jev-uses problems/);
      expect(bad.stderr).toMatch(/J1 \(shadow\) needs a `gold` path/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
