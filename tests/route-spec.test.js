// scripts/gen-route-spec.mjs — the router's catalog generator.
//
// The spec is what TypeSafe/Jev sees, so the interesting failures are quiet
// ones: a skill or verb silently dropped, an override silently ignored, a
// tracked route-spec.json that drifted from skills/ without --check noticing.
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";
import { buildSpec, renderSpec, DEFAULT_OUT, DEFAULT_OVERRIDES, INDEX_MAX } from "../scripts/gen-route-spec.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SKILLS = join(ROOT, "skills");
const GEN = join(ROOT, "scripts", "gen-route-spec.mjs");

const skillIds = readdirSync(SKILLS)
  .filter((n) => n.startsWith("oc-") && existsSync(join(SKILLS, n, "SKILL.md")))
  .sort();

function frontmatter(id) {
  const text = readFileSync(join(SKILLS, id, "SKILL.md"), "utf8");
  return yaml.load(/^---\r?\n([\s\S]*?)\r?\n---/.exec(text)[1]);
}

const { spec, problems } = buildSpec();
const overrides = JSON.parse(readFileSync(DEFAULT_OVERRIDES, "utf8"));

describe("gen-route-spec: contract", () => {
  it("builds without contract problems", () => {
    expect(problems).toEqual([]);
  });

  it("is deterministic across runs", () => {
    const again = buildSpec();
    expect(renderSpec(again.spec)).toBe(renderSpec(spec));
  });

  it("emits sorted keys at every level", () => {
    const sorted = (o) => JSON.stringify(Object.keys(o)) === JSON.stringify([...Object.keys(o)].sort());
    expect(sorted(spec)).toBe(true);
    expect(sorted(spec.skills)).toBe(true);
    expect(sorted(spec.gates)).toBe(true);
    for (const entry of Object.values(spec.skills)) {
      expect(sorted(entry)).toBe(true);
      expect(sorted(entry.verbs)).toBe(true);
    }
  });

  it("includes every oc-* skill, stamped with the lockstep catalog version", () => {
    expect(Object.keys(spec.skills)).toEqual(skillIds);
    expect(spec.generatedFrom).toBe(frontmatter(skillIds[0]).version);
    expect(spec.version).toBe(`${spec.generatedFrom}+route3`);
    expect(Object.keys(spec.gates)).toEqual(["acts", "procedure", "prose"]);
  });

  it("includes every frontmatter verb with a description, and a declared baseVerb", () => {
    for (const id of skillIds) {
      const fm = frontmatter(id);
      const commands = Array.isArray(fm.commands) ? fm.commands.map(String) : [];
      const entry = spec.skills[id];
      expect(Object.keys(entry.verbs).sort(), id).toEqual([...commands].sort());
      for (const [verb, desc] of Object.entries(entry.verbs)) {
        expect(typeof desc, `${id} ${verb}`).toBe("string");
        expect(desc.length, `${id} ${verb}`).toBeGreaterThan(8);
      }
      if (commands.length) expect(commands, id).toContain(entry.baseVerb);
      else expect(entry.baseVerb).toBeNull();
      expect(entry.phases).toEqual(fm.phases.map(String));
      expect(entry.full).toBe(String(fm.description).replace(/\s+/g, " ").trim());
    }
  });

  it("keeps every index description idea-level and within the option budget", () => {
    for (const [id, entry] of Object.entries(spec.skills)) {
      expect(entry.index.length, id).toBeGreaterThan(20);
      expect(entry.index.length, id).toBeLessThanOrEqual(INDEX_MAX);
      expect(entry.verbQuestion.length, id).toBeGreaterThan(10);
    }
  });

  it("applies the hand-written overrides verbatim", () => {
    for (const [id, ov] of Object.entries(overrides.skills)) {
      const entry = spec.skills[id];
      expect(entry, id).toBeDefined();
      if (ov.index) expect(entry.index).toBe(ov.index.replace(/\s+/g, " ").trim());
      if (ov.notFor) expect(entry.notFor).toBe(ov.notFor.replace(/\s+/g, " ").trim());
      if (ov.verbQuestion) expect(entry.verbQuestion).toBe(ov.verbQuestion);
      if (ov.baseVerb) expect(entry.baseVerb).toBe(ov.baseVerb);
      for (const [verb, desc] of Object.entries(ov.verbs ?? {})) expect(entry.verbs[verb], `${id} ${verb}`).toBe(desc);
    }
    // The sibling-confusion pairs the audit called out carry a notFor.
    for (const id of [
      "oc-bug-check", "oc-code-auditor", "oc-security-auditor",
      "oc-git-ops", "oc-release-ops", "oc-deploy-ops",
      "oc-app-architect", "oc-stack-forge", "oc-ux-engineer",
    ]) {
      expect(spec.skills[id].notFor, id).toMatch(/oc-/);
    }
  });

  it("copies overrides `suggest.allow` into suggestAllow, sorted, every id a routable skill", () => {
    expect(spec.suggestAllow).toEqual([...overrides.suggest.allow].sort());
    expect(overrides.suggest.reason.length).toBeGreaterThan(40);
    for (const id of spec.suggestAllow) {
      expect(spec.skills[id], id).toBeDefined();
      expect(spec.skills[id].baseVerb, id).toBeTruthy();
    }
    // The seven core pipeline skills plus the 2026-10-09 eval's labelled positives.
    expect(spec.suggestAllow).toEqual([
      "oc-app-architect", "oc-bug-check", "oc-code-auditor", "oc-dash-forge", "oc-deploy-ops", "oc-docs-forge",
      "oc-git-ops", "oc-orchestrator", "oc-release-ops", "oc-repo-ops", "oc-update", "oc-ux-engineer",
    ]);
    // Key order stays sorted with the new top-level field.
    expect(Object.keys(spec)).toEqual(["gates", "generatedFrom", "skills", "suggestAllow", "version"]);
  });

  it("flags unknown, duplicate and verb-less allowlist ids and a missing reason; no `suggest` → no suggestAllow", () => {
    const dir = mkdtempSync(join(tmpdir(), "oc-route-spec-allow-"));
    try {
      const skillsDir = join(dir, "skills");
      mkdirSync(join(skillsDir, "oc-a"), { recursive: true });
      mkdirSync(join(skillsDir, "oc-b"), { recursive: true });
      writeFileSync(join(skillsDir, "oc-a", "SKILL.md"), "---\nname: oc-a\nversion: 9.9.9\nshortDesc: the a skill does a things\nphases: [build]\ncommands: [/oc-a]\ndescription: d\n---\n# a\n");
      writeFileSync(join(skillsDir, "oc-b", "SKILL.md"), "---\nname: oc-b\nversion: 9.9.9\nshortDesc: the b skill has no verbs\nphases: [build]\ndescription: d\n---\n# b\n");
      const ov = join(dir, "overrides.json");
      writeFileSync(ov, JSON.stringify({ skills: {}, suggest: { allow: ["oc-a", "oc-a", "oc-b", "oc-nope"] } }));
      const bad = buildSpec({ skillsDir, overridesPath: ov }).problems.join("\n");
      expect(bad).toMatch(/suggest\.allow: duplicate oc-a/);
      expect(bad).toMatch(/suggest\.allow: oc-b has no verbs/);
      expect(bad).toMatch(/suggest\.allow: unknown skill oc-nope/);
      expect(bad).toMatch(/suggest\.reason is required/);
      writeFileSync(ov, JSON.stringify({ skills: {}, suggest: { allow: ["oc-a"], reason: "evidence" } }));
      const ok = buildSpec({ skillsDir, overridesPath: ov });
      expect(ok.problems).toEqual([]);
      expect(ok.spec.suggestAllow).toEqual(["oc-a"]);
      writeFileSync(ov, JSON.stringify({ skills: {} }));
      expect(buildSpec({ skillsDir, overridesPath: ov }).spec.suggestAllow).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("the tracked plugins/opchain/hooks/route-spec.json is in sync with skills/", () => {
    expect(readFileSync(DEFAULT_OUT, "utf8")).toBe(renderSpec(spec));
  });

  it("drops a frontmatter name/directory mismatch and an override for an unknown skill into problems", () => {
    const dir = mkdtempSync(join(tmpdir(), "oc-route-spec-"));
    try {
      writeFileSync(join(dir, "overrides.json"), JSON.stringify({ skills: { "oc-nope": { index: "x" } } }));
      const skillsDir = join(dir, "skills");
      mkdirSync(join(skillsDir, "oc-a"), { recursive: true });
      writeFileSync(
        join(skillsDir, "oc-a", "SKILL.md"),
        "---\nname: oc-b\nversion: 9.9.9\nshortDesc: s\nphases: [build]\ncommands: [/oc-a]\ndescription: d\n---\n# a\n",
      );
      const res = buildSpec({ skillsDir, overridesPath: join(dir, "overrides.json") });
      expect(res.problems.join("\n")).toMatch(/oc-a: frontmatter name "oc-b"/);
      expect(res.problems.join("\n")).toMatch(/override for unknown skill oc-nope/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("gen-route-spec: CLI --check", () => {
  it("passes on a fresh write and fails once the output drifts", () => {
    const dir = mkdtempSync(join(tmpdir(), "oc-route-spec-cli-"));
    const out = join(dir, "route-spec.json");
    try {
      const write = spawnSync(process.execPath, [GEN, "--out", out], { encoding: "utf8" });
      expect(write.status, write.stderr).toBe(0);
      expect(existsSync(out)).toBe(true);

      const ok = spawnSync(process.execPath, [GEN, "--check", "--out", out], { encoding: "utf8" });
      expect(ok.status, ok.stderr).toBe(0);
      expect(ok.stdout).toMatch(/in sync/);

      writeFileSync(out, readFileSync(out, "utf8").replace('"index": "', '"index": "DRIFT '));
      const drift = spawnSync(process.execPath, [GEN, "--check", "--out", out], { encoding: "utf8" });
      expect(drift.status).toBe(1);
      expect(drift.stderr).toMatch(/stale/);

      // Drift in the allowlist alone is caught too.
      const fresh = spawnSync(process.execPath, [GEN, "--out", out], { encoding: "utf8" });
      expect(fresh.status, fresh.stderr).toBe(0);
      const edited = JSON.parse(readFileSync(out, "utf8"));
      edited.suggestAllow = edited.suggestAllow.filter((id) => id !== "oc-update");
      writeFileSync(out, JSON.stringify(edited, null, 2) + "\n");
      const allowDrift = spawnSync(process.execPath, [GEN, "--check", "--out", out], { encoding: "utf8" });
      expect(allowDrift.status).toBe(1);
      expect(allowDrift.stderr).toMatch(/stale/);

      rmSync(out);
      const missing = spawnSync(process.execPath, [GEN, "--check", "--out", out], { encoding: "utf8" });
      expect(missing.status).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
