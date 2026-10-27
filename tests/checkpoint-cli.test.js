// CLI-level tests for scripts/checkpoint.mjs, driven through OPCHAIN_ROOT /
// OPCHAIN_CHECKPOINTS_DIR against scratch repos. tests/checkpoint.test.js covers
// the exported pure helpers; the command functions had no tests at all, which is
// how `status <skill>` ignoring its argument and `doctor` validating a rebuilt
// path both shipped (2026-09-11 skill-chain audit, v1.9.1 Sprint 2).
import { describe, it, expect, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, copyFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { spawnSync } from "node:child_process";
import { validate, applyUpdates, repoPathCandidate, projectName, frontmatterList, SCAFFOLD_NEXT_ACTION } from "../scripts/checkpoint.mjs";
import { evaluateReleaseEvidence, readHandoffStore } from "../scripts/lib/release-evidence.mjs";
import { vendorRuntime } from "../scripts/install-git-drivers.mjs";

const CLI = join(import.meta.dirname, "..", "scripts", "checkpoint.mjs");
const RELEASE_EVIDENCE = join(import.meta.dirname, "..", "scripts", "lib", "release-evidence.mjs");
const scratch = [];
afterAll(() => scratch.forEach((d) => rmSync(d, { recursive: true, force: true })));

function git(args, cwd) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
  return r.stdout.trim();
}

/** A scratch git repo with a .checkpoints/ dir and one commit on main. */
function repo() {
  const root = mkdtempSync(join(tmpdir(), "oc-cli-"));
  scratch.push(root);
  git(["init", "-q", "-b", "main"], root);
  git(["config", "user.email", "t@t"], root);
  git(["config", "user.name", "t"], root);
  writeFileSync(join(root, "README.md"), "x\n");
  git(["add", "-A"], root);
  git(["-c", "core.hooksPath=/dev/null", "commit", "-qm", "init"], root);
  mkdirSync(join(root, ".checkpoints"));
  return root;
}

function cp(skill, extra = {}) {
  const now = new Date().toISOString();
  return {
    protocol_version: "1.1",
    skill,
    project: "t",
    project_dir: "/nowhere",
    created_at: now,
    updated_at: now,
    phase: "p",
    step: "s",
    status: "complete",
    progress_summary: "summary.",
    ...extra,
  };
}

function write(root, file, data) {
  writeFileSync(join(root, ".checkpoints", file), JSON.stringify(data, null, 2));
}

function run(root, ...args) {
  const r = spawnSync("node", [CLI, ...args], {
    encoding: "utf8",
    env: { ...process.env, OPCHAIN_ROOT: root, OPCHAIN_CHECKPOINTS_DIR: join(root, ".checkpoints") },
  });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

describe("status <skill>", () => {
  it("exits non-zero when that skill has no checkpoint", () => {
    const root = repo();
    write(root, "oc-code-auditor.checkpoint.json", cp("oc-code-auditor"));
    const r = run(root, "status", "oc-security-auditor");
    expect(r.code).toBe(1);
    expect(r.out).toContain('no checkpoint for "oc-security-auditor"');
    expect(r.out).not.toContain("oc-code-auditor");
  });

  it("prints only the named checkpoint when it exists", () => {
    const root = repo();
    write(root, "oc-code-auditor.checkpoint.json", cp("oc-code-auditor", { progress_summary: "auditor summary." }));
    write(root, "oc-git-ops.checkpoint.json", cp("oc-git-ops", { progress_summary: "git summary." }));
    const r = run(root, "status", "oc-code-auditor");
    expect(r.code).toBe(0);
    expect(r.out).toContain("auditor summary.");
    expect(r.out).not.toContain("git summary.");
  });

  it("--brief skips a queued action whose PR already shows complete", () => {
    const root = repo();
    write(
      root,
      "oc-git-ops.checkpoint.json",
      cp("oc-git-ops", {
        status: "in_progress",
        progress_table: [{ id: "pr-123", label: "PR #123", status: "complete" }],
        next_actions: ["Merge #123", "Open the follow-up PR"],
      }),
    );
    const r = run(root, "status", "--brief");
    expect(r.code).toBe(0);
    expect(r.out).toContain("Next: Open the follow-up PR");
  });
});

describe("update operators", () => {
  it("appends with either suffix order and never writes a literal `+` key", () => {
    const obj = { skill_state: { merged_prs: [{ pr: 1 }] } };
    applyUpdates(obj, ['--skill_state.merged_prs+:json={"pr":2}', '--skill_state.merged_prs:json+={"pr":3}']);
    expect(obj.skill_state.merged_prs).toEqual([{ pr: 1 }, { pr: 2 }, { pr: 3 }]);
    expect(Object.keys(obj.skill_state)).toEqual(["merged_prs"]);
  });

  it("adds an array value as one element, as documented", () => {
    const obj = {};
    applyUpdates(obj, ["--list:json+=[1,2]"]);
    expect(obj.list).toEqual([[1, 2]]);
  });

  it("refuses a key that still carries an operator", () => {
    expect(() => applyUpdates({}, ["--a+b=1"])).toThrow(/not a valid field path/);
    expect(() => applyUpdates({}, ["--a:jsonx=1"])).toThrow(/not a valid field path/);
  });

  it("writes the combined form end to end through the CLI", () => {
    const root = repo();
    write(root, "oc-git-ops.checkpoint.json", cp("oc-git-ops", { skill_state: { merged_prs: [] } }));
    const r = run(root, "update", "oc-git-ops", '--skill_state.merged_prs+:json={"pr":518}');
    expect(r.code).toBe(0);
    const data = JSON.parse(readFileSync(join(root, ".checkpoints", "oc-git-ops.checkpoint.json"), "utf8"));
    expect(data.skill_state).toEqual({ merged_prs: [{ pr: 518 }] });
  });
});

describe("validator: status and blockers agree", () => {
  const path = "/x/oc-a.checkpoint.json";

  it("warns on blocked with no blockers", () => {
    const { errors, warnings } = validate(path, cp("oc-a", { status: "blocked" }));
    expect(errors).toEqual([]);
    expect(warnings.some((w) => /"blocked" but no blockers/.test(w))).toBe(true);
  });

  it("warns on complete with an open user decision", () => {
    const data = cp("oc-a", { blockers: [{ id: "b1", description: "pick one", needs: "user_decision" }] });
    const { errors, warnings } = validate(path, data);
    expect(errors).toEqual([]);
    expect(warnings.some((w) => /"complete" but blockers\[0\] still needs a user decision/.test(w))).toBe(true);
  });

  it("stays quiet on a consistent blocked checkpoint", () => {
    const data = cp("oc-a", {
      status: "blocked",
      blockers: [{ id: "b1", description: "waiting", needs: "external_dep" }],
    });
    expect(validate(path, data).warnings.filter((w) => /blocker/.test(w))).toEqual([]);
  });

  it("accepts ISO-8601 offsets as well as Z", () => {
    const data = cp("oc-a", { created_at: "2026-09-10T00:00:00+00:00", updated_at: "2026-09-10T01:00:00-05:00" });
    expect(validate(path, data).errors).toEqual([]);
    expect(validate(path, cp("oc-a", { created_at: "2026-09-10 00:00:00" })).errors).toContain(
      "created_at must be ISO-8601 (Z or ±hh:mm)",
    );
  });

  it("rejects offsets and dates that match the shape but are not real instants", () => {
    for (const bad of ["2026-09-10T00:00:00+99:99", "2026-09-10T00:00:00+24:00", "2026-13-10T00:00:00Z"]) {
      expect(validate(path, cp("oc-a", { updated_at: bad })).errors).toContain("updated_at must be ISO-8601 (Z or ±hh:mm)");
    }
  });
});

describe("argument hygiene", () => {
  it("status <skill> tolerates a null blocker", () => {
    const root = repo();
    write(root, "oc-a.checkpoint.json", cp("oc-a", { blockers: [null, { id: "b1", description: "d" }] }));
    const r = run(root, "status", "oc-a");
    expect(r.code).toBe(0);
    expect(r.out).toContain("- b1: d");
    expect(r.out).not.toContain("TypeError");
  });

  it("status ignores a positional that is not a skill name, as before", () => {
    const root = repo();
    write(root, "oc-a.checkpoint.json", cp("oc-a"));
    for (const arg of ["2026-09-01T00:00:00Z", "2026-09-01"]) {
      const r = run(root, "status", arg);
      expect(r.code).toBe(0);
      expect(r.out).toContain("# Session state");
    }
  });

  it("every status view tolerates a null blocker", () => {
    const root = repo();
    write(root, "oc-a.checkpoint.json", cp("oc-a", { status: "in_progress", next_actions: ["x"], blockers: [null] }));
    for (const args of [["status"], ["status", "--brief"], ["next"]]) {
      const r = run(root, ...args);
      expect(r.out).not.toContain("TypeError");
    }
  });

  it("commands that open a checkpoint refuse a path for a skill name", () => {
    const root = repo();
    for (const verb of ["show", "done", "reset", "update"]) {
      const r = run(root, verb, "../escape");
      expect(r.code).toBe(1);
      expect(r.out).toContain('"../escape" is not a skill name');
    }
  });

  it("update reports a bad operator without a stack trace", () => {
    const root = repo();
    write(root, "oc-a.checkpoint.json", cp("oc-a"));
    const r = run(root, "update", "oc-a", "--a+b=1");
    expect(r.code).toBe(1);
    expect(r.out).toContain("not a valid field path");
    expect(r.out).not.toMatch(/\n\s+at /);
  });
});

describe("doctor", () => {
  it("catches a filename that does not match its skill", () => {
    const root = repo();
    write(root, "oc-wrong.checkpoint.json", cp("oc-right"));
    const r = run(root, "doctor");
    expect(r.code).toBe(1);
    expect(r.out).toContain("filename oc-wrong.checkpoint.json does not match");
  });

  it("flags a verified_for_sha that is missing or not in HEAD's history", () => {
    const root = repo();
    const main = git(["rev-parse", "HEAD"], root);
    git(["switch", "-q", "-c", "side"], root);
    writeFileSync(join(root, "side.txt"), "side\n");
    git(["add", "-A"], root);
    git(["-c", "core.hooksPath=/dev/null", "commit", "-qm", "side"], root);
    const side = git(["rev-parse", "HEAD"], root);
    git(["switch", "-q", "main"], root);

    write(root, "oc-repo-ops.checkpoint.json", cp("oc-repo-ops", { skill_state: { verified_for_sha: side } }));
    write(root, "oc-docs-forge.checkpoint.json", cp("oc-docs-forge", { skill_state: { verified_for_sha: "0123456789abcdef0123" } }));
    write(root, "oc-git-ops.checkpoint.json", cp("oc-git-ops", { skill_state: { verified_for_sha: main } }));

    const r = run(root, "doctor");
    expect(r.out).toMatch(/\[oc-repo-ops\] skill_state\.verified_for_sha \w+ is not in HEAD's history/);
    expect(r.out).toMatch(/\[oc-docs-forge\] skill_state\.verified_for_sha \w+ is not a commit in this clone/);
    expect(r.out).not.toMatch(/\[oc-git-ops\] skill_state\.verified_for_sha/);
  });

  it("reports every missing generated file, not only the first three", () => {
    const root = repo();
    const files = ["docs/a.md", "tests/b.test.js", "plugins/c.json", "specs/d.md", "e.md"];
    write(root, "oc-a.checkpoint.json", cp("oc-a", { context_primer: { generated_files: files } }));
    const r = run(root, "doctor");
    for (const f of files) expect(r.out).toContain(`missing path: ${f}`);
  });
});

describe("helpers", () => {
  it("repoPathCandidate keeps path-like entries and drops prose", () => {
    expect(repoPathCandidate("src/a.ts (this file, updated)")).toBe("src/a.ts");
    expect(repoPathCandidate("skills/x/pack.yml updated with frameworks: [a]")).toBe("skills/x/pack.yml");
    expect(repoPathCandidate("README.md")).toBe("README.md");
    expect(repoPathCandidate("docs/plans/")).toBe("docs/plans/");
    expect(repoPathCandidate("https://example.com/x.md")).toBeNull();
    expect(repoPathCandidate("/abs/path.md")).toBeNull();
    expect(repoPathCandidate("{a,b}.md")).toBeNull();
    expect(repoPathCandidate("PR merged upstream")).toBeNull();
    expect(repoPathCandidate("`src/a.ts`")).toBe("src/a.ts");
    expect(repoPathCandidate("docs/x.md:12")).toBe("docs/x.md");
    expect(repoPathCandidate("../outside/file.md")).toBeNull();
    expect(repoPathCandidate("v1.9.0")).toBeNull();
    expect(repoPathCandidate("3.5")).toBeNull();
    expect(repoPathCandidate("Node.js")).toBeNull();
    expect(repoPathCandidate("opchain.dev")).toBeNull();
    expect(repoPathCandidate("CHANGELOG.md")).toBe("CHANGELOG.md");
  });

  it("projectName follows package.json, then the directory", () => {
    const root = mkdtempSync(join(tmpdir(), "oc-proj-"));
    scratch.push(root);
    expect(projectName(root)).toBe(basename(root));
    writeFileSync(join(root, "package.json"), JSON.stringify({ name: "acme-app" }));
    expect(projectName(root)).toBe("acme-app");
    writeFileSync(join(root, "package.json"), JSON.stringify({ name: "opchain-dev" }));
    expect(projectName(root)).toBe("opchain.dev");
  });
});

// stdout and stderr kept apart (for --json output).
function runSplit(root, ...args) {
  const r = spawnSync("node", [CLI, ...args], {
    encoding: "utf8",
    env: { ...process.env, OPCHAIN_ROOT: root, OPCHAIN_CHECKPOINTS_DIR: join(root, ".checkpoints") },
  });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

function readCp(root, skill) {
  return JSON.parse(readFileSync(join(root, ".checkpoints", `${skill}.checkpoint.json`), "utf8"));
}

function readStored(root, policy, branch) {
  return JSON.parse(readFileSync(join(root, ".checkpoints", "handoffs", policy, `${branch}.json`), "utf8"));
}

function skillMd(root, skill, frontmatter, body = "") {
  mkdirSync(join(root, "skills", skill), { recursive: true });
  writeFileSync(join(root, "skills", skill, "SKILL.md"), `---\nname: ${skill}\n${frontmatter}\n---\n# ${skill}\n${body}`);
}

// 2026-10-24 skill-to-skill investigation: a sprint's acceptance checks as a typed
// handoff, so a reader outside the build loop stops parsing eval-round-M.md.
describe("acceptance", () => {
  it("publishes one acceptance.checks handoff per sprint, replacing an earlier round", () => {
    const root = repo();
    write(root, "oc-app-architect.checkpoint.json", cp("oc-app-architect", { phase: "build", step: "sprint-2" }));
    const miss = run(root, "acceptance", "oc-app-architect", "--sprint", "sprint-2", "--verdict", "PASS", "--source", "sprints/sprint-2/eval-round-1.md", "--check", "AC-2.1=PASS", "--check", "AC-2.2=FAIL");
    expect(miss.code).toBe(1);
    expect(miss.out).toContain("PASS needs every check PASS");
    const r1 = runSplit(root, "acceptance", "oc-app-architect", "--sprint", "sprint-2", "--verdict", "FAIL", "--source", "sprints/sprint-2/eval-round-1.md", "--check", "AC-2.1=PASS", "--check", "AC-2.2=fail", "--json");
    expect(r1.code, r1.stderr).toBe(0);
    const out = JSON.parse(r1.stdout);
    expect(out.handoff).toMatchObject({
      type: "acceptance.checks",
      producer: { skill: "oc-app-architect" },
      artifact: { kind: "file", id: "sprints/sprint-2/eval-round-1.md" },
      payload: { sprint: "sprint-2", verdict: "FAIL", checks: [{ id: "AC-2.1", status: "PASS" }, { id: "AC-2.2", status: "FAIL" }] },
    });
    expect(out.handoff.artifact.digest).toBeUndefined(); // the report is not in this scratch repo
    const r2 = run(root, "acceptance", "oc-app-architect", "--sprint", "sprint-2", "--verdict", "PASS", "--source", "sprints/sprint-2/eval-round-2.md", "--check", "AC-2.1=PASS", "--check", "AC-2.2=PASS");
    expect(r2.code, r2.out).toBe(0);
    expect(r2.out).toContain("2 of 2 checks PASS");
    expect(r2.out).toContain("replaced 1 earlier result(s) for this sprint");
    const data = readCp(root, "oc-app-architect");
    expect(data.handoffs).toHaveLength(1);
    expect(data.handoffs[0].payload.verdict).toBe("PASS");
    expect(run(root, "validate").code).toBe(0);
    // Needs a checkpoint, a sprint, a source and at least one check.
    expect(run(root, "acceptance", "oc-qa-ops", "--sprint", "sprint-1", "--verdict", "FAIL", "--source", "x.md", "--check", "A=FAIL").code).toBe(1);
    expect(run(root, "acceptance", "oc-app-architect", "--verdict", "FAIL", "--source", "x.md", "--check", "A=FAIL").out).toContain("--sprint");
    expect(run(root, "acceptance", "oc-app-architect", "--sprint", "sprint-3", "--verdict", "FAIL", "--source", "x.md").out).toContain("at least one --check");
    expect(run(root, "acceptance", "oc-app-architect", "--sprint", "sprint-3", "--verdict", "FAIL", "--source", "x.md", "--check", "A=MAYBE").out).toContain("status must be");
  });
});

// 2026-10-08 effectiveness audit, I-06: the scaffold sentence validated and shipped.
describe("scaffold placeholder", () => {
  const path = "/x/oc-a.checkpoint.json";

  it("validate rejects the scaffold sentence anywhere but an untouched scaffold", () => {
    const filler = validate(path, cp("oc-a", { status: "complete", next_actions: [SCAFFOLD_NEXT_ACTION] }));
    expect(filler.errors.some((e) => /scaffold placeholder/.test(e) && /--next_actions:json/.test(e))).toBe(true);
    const objectForm = validate(path, cp("oc-a", { next_actions: [{ text: ` ${SCAFFOLD_NEXT_ACTION}` }] }));
    expect(objectForm.errors.some((e) => /scaffold placeholder/.test(e))).toBe(true);
    const scaffold = validate(path, cp("oc-a", { phase: "init", step: "scaffolded", status: "in_progress", next_actions: [SCAFFOLD_NEXT_ACTION] }));
    expect(scaffold.errors).toEqual([]);
  });

  it("update on a missing file fails without a next action, names the flag, and writes nothing", () => {
    const root = repo();
    const r = run(root, "update", "oc-security-auditor", "--status=complete", "--phase=verify", "--step=posture", "--progress_summary=x");
    expect(r.code).toBe(1);
    expect(r.out).toContain('no checkpoint exists yet for "oc-security-auditor"');
    expect(r.out).toContain(`--next_actions:json='["<the next concrete action>"]'`);
    expect(existsSync(join(root, ".checkpoints", "oc-security-auditor.checkpoint.json"))).toBe(false);
  });

  it("update on a missing file succeeds with --next_actions:json and never writes the placeholder", () => {
    const root = repo();
    const r = run(root, "update", "oc-a", "--status=complete", "--phase=verify", "--step=s", "--progress_summary=x", '--next_actions:json=["Ship it"]');
    expect(r.code).toBe(0);
    expect(readCp(root, "oc-a").next_actions).toEqual(["Ship it"]);
    // --next_actions=<one action> is wrapped; the append form works on the fresh file too.
    const root2 = repo();
    expect(run(root2, "update", "oc-b", "--status=complete", "--phase=p", "--step=s", "--progress_summary=x", "--next_actions=Do the thing").code).toBe(0);
    expect(readCp(root2, "oc-b").next_actions).toEqual(["Do the thing"]);
    const root3 = repo();
    expect(run(root3, "update", "oc-c", "--status=complete", "--phase=p", "--step=s", "--progress_summary=x", "--next_actions+=First").code).toBe(0);
    expect(readCp(root3, "oc-c").next_actions).toEqual(["First"]);
  });

  it("update on an existing file keeps its contract (no next_actions needed)", () => {
    const root = repo();
    write(root, "oc-a.checkpoint.json", cp("oc-a"));
    expect(run(root, "update", "oc-a", "--step=later").code).toBe(0);
    expect(readCp(root, "oc-a").step).toBe("later");
  });

  it("validate and doctor both surface the placeholder", () => {
    const root = repo();
    write(root, "oc-a.checkpoint.json", cp("oc-a", { next_actions: [SCAFFOLD_NEXT_ACTION] }));
    write(root, "oc-s.checkpoint.json", cp("oc-s", { phase: "init", step: "scaffolded", status: "in_progress", next_actions: [SCAFFOLD_NEXT_ACTION] }));
    const v = run(root, "validate");
    expect(v.code).toBe(1);
    expect(v.out).toMatch(/✗ oc-a\.checkpoint\.json[\s\S]*scaffold placeholder/);
    const d = run(root, "doctor");
    expect(d.out).toMatch(/✗ \[oc-a\] next_actions\[0\] is the scaffold placeholder/);
    expect(d.out).toMatch(/⚠ \[oc-s\] next_actions still carries the scaffold placeholder/);
  });
});

// I-09: phase ids the skill does not declare passed checkpoint:validate.
describe("phase allowlist", () => {
  it("frontmatterList reads flow and block lists", () => {
    expect(frontmatterList("name: x\nphases: [plan, build]\ntriAgent: true", "phases")).toEqual(["plan", "build"]);
    expect(frontmatterList("checkpoint_phases:\n  - discover\n  - 'spec'\n  - build-loop # comment\ncommands: []", "checkpoint_phases")).toEqual(["discover", "spec", "build-loop"]);
    expect(frontmatterList("phases: [build]", "checkpoint_phases")).toBeNull();
  });

  it("rejects an undeclared phase when SKILL.md declares checkpoint_phases, listing the allowed ids", () => {
    const root = repo();
    skillMd(root, "oc-app-architect", "phases: [plan, build]\ncheckpoint_phases: [discover, spec, design, sprint-plan, build-loop, launch]");
    write(root, "oc-app-architect.checkpoint.json", cp("oc-app-architect", { phase: "sprint-plan" }));
    expect(run(root, "validate").code).toBe(0);
    const r = run(root, "update", "oc-app-architect", "--phase=master-2-workstreams");
    expect(r.code).toBe(1);
    expect(r.out).toContain('phase "master-2-workstreams" is not declared by skills/oc-app-architect/SKILL.md');
    expect(r.out).toContain("checkpoint_phases: discover, spec, design, sprint-plan, build-loop, launch");
    expect(readCp(root, "oc-app-architect").phase).toBe("sprint-plan"); // nothing written
    expect(run(root, "update", "oc-app-architect", "--phase=build-loop").code).toBe(0);
  });

  it("only warns when SKILL.md carries the pipeline taxonomy alone, and is silent without a SKILL.md", () => {
    const root = repo();
    skillMd(root, "oc-b", "phases: [build]", '```json\n{ "phase": "pr-docs" }\n```\n');
    write(root, "oc-b.checkpoint.json", cp("oc-b", { phase: "verify" }));
    write(root, "oc-c.checkpoint.json", cp("oc-c", { phase: "anything" }));
    const r = run(root, "validate");
    expect(r.code).toBe(0);
    expect(r.out).toContain('⚠ phase "verify" is not declared by skills/oc-b/SKILL.md (phases: build, pr-docs)');
    expect(r.out).not.toContain('phase "anything"');
    // A body example id counts in advisory mode.
    write(root, "oc-b.checkpoint.json", cp("oc-b", { phase: "pr-docs" }));
    expect(run(root, "validate").out).not.toContain("is not declared");
  });

  it("warns on a step with whitespace but never errors", () => {
    const { errors, warnings } = validate("/x/oc-a.checkpoint.json", cp("oc-a", { step: "spec-gate awaiting approval" }));
    expect(errors).toEqual([]);
    expect(warnings.some((w) => /step "spec-gate awaiting approval" contains whitespace/.test(w))).toBe(true);
  });
});

// I-05 / Q5-F1: one binder instead of four hand-written ones.
describe("handoff", () => {
  function candidateOf(root) {
    const r = spawnSync("node", [RELEASE_EVIDENCE, "--repo", root, "--print-candidate", "--json"], { encoding: "utf8" });
    if (r.status !== 0) throw new Error(r.stderr);
    return JSON.parse(r.stdout);
  }

  // The PR-stage policies go to the per-branch store, never the shared checkpoint:
  // that shared file is what made every sibling PR conflict after a merge.
  it("writes a PR-stage verdict to .checkpoints/handoffs/<policy>/<branch>.json the matcher accepts, leaving the checkpoint alone", () => {
    const root = repo();
    const before = cp("oc-docs-forge", { phase: "pr-docs", skill_state: { docs_changed: ["README.md"] } });
    write(root, "oc-docs-forge.checkpoint.json", before);
    const r = runSplit(root, "handoff", "oc-docs-forge", "--policy", "pr-docs-v1", "--verdict", "PASS", "--scope", "README only", "--evidence", "README.md", "--evidence", "CHANGELOG.md", "--json");
    expect(r.code).toBe(0);
    const out = JSON.parse(r.stdout);
    const cand = candidateOf(root);
    expect(out).toMatchObject({ store: "handoffs", file: ".checkpoints/handoffs/pr-docs-v1/main.json", candidate: cand.candidate, replaced: 0 });

    const stored = readStored(root, "pr-docs-v1", "main");
    expect(stored).toMatchObject({
      id: `oc-docs-forge-pr-docs-v1-${cand.candidate_identity.id.slice(7, 19)}`,
      contract_version: "1.0",
      type: "verification.verdict",
      producer: { skill: "oc-docs-forge" },
      candidate: cand.candidate_identity,
      payload: { verdict: "PASS", policy: "pr-docs-v1", scope: "README only", evidence: ["README.md", "CHANGELOG.md"] },
    });
    expect(stored.verified_at).toBe(stored.created_at);
    expect(readCp(root, "oc-docs-forge")).toEqual(before); // no handoffs[], no verified_for_sha

    const result = evaluateReleaseEvidence({
      stage: "pr",
      candidate: cand.candidate,
      candidateIdentity: cand.candidate_identity,
      tree: cand.tree,
      repositoryId: "fixture",
      receipt: null,
      checkpoints: { "oc-docs-forge": readCp(root, "oc-docs-forge") },
      handoffStore: { "pr-docs-v1": readHandoffStore(join(root, ".checkpoints"), "pr-docs-v1") },
    });
    expect(result.checks.find((c) => c.id === "oc-docs-forge")).toMatchObject({ status: "PASS", detail: `pr-docs-v1 covers ${cand.candidate_identity.id} (.checkpoints/handoffs/pr-docs-v1/main.json)` });
    expect(result.checks.find((c) => c.id === "oc-repo-ops").status).toBe("FAIL"); // not bound here
  });

  it("names the file after the branch, so two branches never write the same one", () => {
    const root = repo();
    git(["checkout", "-qb", "claude/feature-a"], root);
    const a = JSON.parse(runSplit(root, "handoff", "oc-repo-ops", "pr-readiness-v1", "--verdict", "PASS", "--scope", "a", "--json").stdout);
    git(["checkout", "-qb", "feature-a"], root); // "/" is a directory, not a character that collides with "-"
    const b = JSON.parse(runSplit(root, "handoff", "oc-repo-ops", "pr-readiness-v1", "--verdict", "PASS", "--scope", "b", "--json").stdout);
    git(["checkout", "-q", "--detach"], root);
    const detached = JSON.parse(runSplit(root, "handoff", "oc-repo-ops", "pr-readiness-v1", "--verdict", "PASS", "--scope", "c", "--json").stdout);
    expect([a.file, b.file, detached.file]).toEqual([
      ".checkpoints/handoffs/pr-readiness-v1/claude/feature-a.json",
      ".checkpoints/handoffs/pr-readiness-v1/feature-a.json",
      `.checkpoints/handoffs/pr-readiness-v1/detached/${git(["rev-parse", "HEAD"], root).slice(0, 12)}.json`,
    ]);
    expect(existsSync(join(root, ".checkpoints", "oc-repo-ops.checkpoint.json"))).toBe(false);
  });

  it("binds into the shared checkpoint when the reader predates the store (back-compat)", () => {
    const root = repo();
    write(root, "oc-docs-forge.checkpoint.json", cp("oc-docs-forge", { phase: "pr-docs", skill_state: { docs_changed: ["README.md"] } }));
    // First in the binder's lookup order: a reader that prints no handoff_store.
    mkdirSync(join(root, "scripts", "lib"), { recursive: true });
    writeFileSync(join(root, "scripts", "lib", "release-evidence.mjs"), [
      'import { spawnSync } from "node:child_process";',
      `const r = spawnSync(process.execPath, [${JSON.stringify(RELEASE_EVIDENCE)}, ...process.argv.slice(2)], { encoding: "utf8" });`,
      "const report = JSON.parse(r.stdout); delete report.handoff_store;",
      "process.stdout.write(JSON.stringify(report)); process.exitCode = r.status;",
    ].join("\n"));
    const r = runSplit(root, "handoff", "oc-docs-forge", "pr-docs-v1", "--verdict", "PASS", "--scope", "README only", "--json");
    expect(r.code).toBe(0);
    expect(JSON.parse(r.stdout)).toMatchObject({ store: "checkpoint", file: "oc-docs-forge.checkpoint.json" });
    expect(existsSync(join(root, ".checkpoints", "handoffs"))).toBe(false);
    const cand = candidateOf(root);
    const data = readCp(root, "oc-docs-forge");
    expect(data.handoffs).toHaveLength(1);
    expect(data.handoffs[0]).toMatchObject({ producer: { skill: "oc-docs-forge" }, candidate: cand.candidate_identity, payload: { verdict: "PASS", policy: "pr-docs-v1" } });
    expect(data.skill_state).toEqual({ docs_changed: ["README.md"], verified_for_sha: cand.candidate });
    expect(data.record_updated_at).toBe(data.updated_at);
    const result = evaluateReleaseEvidence({ stage: "pr", candidate: cand.candidate, candidateIdentity: cand.candidate_identity, tree: cand.tree, repositoryId: "fixture", receipt: null, checkpoints: { "oc-docs-forge": data } });
    expect(result.checks.find((c) => c.id === "oc-docs-forge")).toMatchObject({ status: "PASS", detail: `pr-docs-v1 covers ${cand.candidate_identity.id}` });
  });

  it("re-binding on the branch overwrites its own file so the matcher stays unambiguous", () => {
    const root = repo();
    expect(run(root, "handoff", "oc-repo-ops", "--policy=pr-readiness-v1", "--verdict=PASS", "--scope=first").code).toBe(0);
    const r = run(root, "handoff", "oc-repo-ops", "--policy=pr-readiness-v1", "--verdict=FAIL", "--scope=second");
    expect(r.code).toBe(0);
    expect(r.out).toContain("replaced this branch's earlier handoff for the same candidate");
    expect(readdirSync(join(root, ".checkpoints", "handoffs", "pr-readiness-v1"))).toEqual(["main.json"]);
    expect(readStored(root, "pr-readiness-v1", "main").payload).toMatchObject({ verdict: "FAIL", policy: "pr-readiness-v1", scope: "second" });
    const cand = candidateOf(root);
    const handoffStore = { "pr-readiness-v1": readHandoffStore(join(root, ".checkpoints"), "pr-readiness-v1") };
    const result = evaluateReleaseEvidence({ stage: "pr", candidate: cand.candidate, candidateIdentity: cand.candidate_identity, tree: cand.tree, repositoryId: "fixture", receipt: null, handoffStore });
    expect(result.checks.find((c) => c.id === "oc-repo-ops")).toMatchObject({ status: "FAIL", detail: expect.stringContaining("verdict is FAIL") });

    // A code change is a new candidate: the same file is rebound, never a second one.
    writeFileSync(join(root, "README.md"), "y\n");
    git(["-c", "core.hooksPath=/dev/null", "commit", "-qam", "change"], root);
    const rebound = run(root, "handoff", "oc-repo-ops", "--policy=pr-readiness-v1", "--verdict=PASS", "--scope=third");
    expect(rebound.out).toContain(`replaced this branch's earlier handoff for ${cand.candidate_identity.id}`);
    expect(readdirSync(join(root, ".checkpoints", "handoffs", "pr-readiness-v1"))).toEqual(["main.json"]);
  });

  it("re-binding the same candidate in the shared checkpoint replaces the earlier entry", () => {
    const root = repo();
    write(root, "oc-code-auditor.checkpoint.json", cp("oc-code-auditor"));
    expect(run(root, "handoff", "oc-code-auditor", "--policy=pre-deploy-code-audit-v1", "--verdict=PASS", "--scope=first").code).toBe(0);
    const r = run(root, "handoff", "oc-code-auditor", "--policy=pre-deploy-code-audit-v1", "--verdict=FAIL", "--scope=second");
    expect(r.code).toBe(0);
    expect(r.out).toContain("replaced 1 earlier handoff(s)");
    const data = readCp(root, "oc-code-auditor");
    expect(data.handoffs).toHaveLength(1);
    expect(data.handoffs[0].payload).toMatchObject({ verdict: "FAIL", policy: "pre-deploy-code-audit-v1", scope: "second" });
    const cand = candidateOf(root);
    const result = evaluateReleaseEvidence({ stage: "deploy", candidate: cand.candidate, candidateIdentity: cand.candidate_identity, tree: cand.tree, repositoryId: "fixture", receipt: null, checkpoints: { "oc-code-auditor": data } });
    expect(result.checks.find((c) => c.id === "oc-code-auditor")).toMatchObject({ status: "FAIL", detail: expect.stringContaining("verdict is FAIL") });
  });

  it("accepts the policy positionally, as release-evidence's FAIL detail spells it", () => {
    const root = repo();
    write(root, "oc-repo-ops.checkpoint.json", cp("oc-repo-ops"));
    const r = run(root, "handoff", "oc-repo-ops", "pr-readiness-v1", "--verdict", "PASS", "--scope", "hygiene clean");
    expect(r.code).toBe(0);
    expect(readStored(root, "pr-readiness-v1", "main").payload).toMatchObject({ policy: "pr-readiness-v1", verdict: "PASS" });
    const twice = run(root, "handoff", "oc-repo-ops", "pr-readiness-v1", "other-v1", "--verdict", "PASS", "--scope", "x");
    expect(twice.code).toBe(1);
    expect(twice.out).toContain('unexpected argument "other-v1"');
  });

  it("scaffolds a valid complete checkpoint when none exists", () => {
    const root = repo();
    const r = run(root, "handoff", "oc-code-auditor", "--policy", "pre-deploy-code-audit-v1", "--verdict", "PASS", "--scope", "deploy delta", "--summary", "Audited the deploy delta.");
    expect(r.code).toBe(0);
    const data = readCp(root, "oc-code-auditor");
    expect(data).toMatchObject({ phase: "verify", step: "pre-deploy-code-audit-v1", status: "complete", progress_summary: "Audited the deploy delta.", next_actions: [] });
    expect(data.handoffs[0].payload.evidence).toBeUndefined();
    expect(run(root, "validate").code).toBe(0);
  });

  it("creates new files in a phase the skill declares, so validate stays quiet", () => {
    const root = repo();
    skillMd(root, "oc-repo-ops", "phases: [build]", '```json\n{ "phase": "pr-verify" }\n```\n');
    skillMd(root, "oc-strict", "phases: [build]\ncheckpoint_phases: [audit, verify, report]");
    expect(run(root, "handoff", "oc-repo-ops", "repo-audit-v1", "--verdict", "PASS", "--scope", "x").code).toBe(0);
    expect(run(root, "handoff", "oc-strict", "x-v1", "--verdict", "PASS", "--scope", "x").code).toBe(0);
    expect(readCp(root, "oc-repo-ops").phase).toBe("pr-verify");
    expect(readCp(root, "oc-strict").phase).toBe("verify");
    const v = run(root, "validate");
    expect(v.code).toBe(0);
    expect(v.out).not.toContain("is not declared");
  });

  // Audit C-05: `handoff` failed in consumer repos because the CLI copy they ran had
  // no lib/release-evidence.mjs beside it. The skill-bundled runtime now carries it
  // (scripts/runtime-manifest.json); a bare CLI copy still falls back to the
  // consumer's .opchain/runtime/ or the plugin root.
  it("finds release-evidence.mjs in the bundled runtime, a consumer's .opchain/runtime/, or the plugin root", () => {
    const root = repo();
    const bundle = mkdtempSync(join(tmpdir(), "oc-cli-bundle-"));
    scratch.push(bundle);
    mkdirSync(join(bundle, "scripts"));
    const bundled = join(bundle, "scripts", "checkpoint.mjs");
    copyFileSync(CLI, bundled);
    const env = { ...process.env, OPCHAIN_ROOT: root, OPCHAIN_CHECKPOINTS_DIR: join(root, ".checkpoints") };
    delete env.CLAUDE_PLUGIN_ROOT;
    const args = [bundled, "handoff", "oc-docs-forge", "pr-docs-v1", "--verdict", "PASS", "--scope", "x", "--json"];
    const missing = spawnSync("node", args, { encoding: "utf8", env });
    expect(missing.status).toBe(1);
    expect(missing.stderr).toContain(".opchain/runtime/scripts/lib/");

    const viaPlugin = spawnSync("node", args, { encoding: "utf8", env: { ...env, CLAUDE_PLUGIN_ROOT: join(import.meta.dirname, "..", "plugins", "opchain") } });
    expect(viaPlugin.stderr).toBe("");
    expect(viaPlugin.status).toBe(0);

    const bundledRuntime = join(import.meta.dirname, "..", "skills", "oc-checkpoint-protocol", "scripts", "runtime", "scripts", "checkpoint.mjs");
    const viaBundle = spawnSync("node", [bundledRuntime, ...args.slice(1)], { encoding: "utf8", env });
    expect(viaBundle.stderr).toBe("");
    expect(viaBundle.status).toBe(0);

    vendorRuntime(root);
    const viaVendored = spawnSync("node", args, { encoding: "utf8", env });
    expect(viaVendored.stderr).toBe("");
    expect(viaVendored.status).toBe(0);
    const out = JSON.parse(viaVendored.stdout);
    expect(out.store).toBe("handoffs");
    expect(readStored(root, "pr-docs-v1", "main").candidate.id).toBe(out.handoff.candidate.id);
  });

  it("refuses bad options and a path for a skill name", () => {
    const root = repo();
    write(root, "oc-a.checkpoint.json", cp("oc-a"));
    const noPolicy = run(root, "handoff", "oc-a", "--verdict", "PASS", "--scope", "x");
    expect(noPolicy.code).toBe(1);
    expect(noPolicy.out).toContain("--policy is required");
    expect(noPolicy.out).toContain("usage: checkpoint handoff");
    const badVerdict = run(root, "handoff", "oc-a", "--policy", "x-v1", "--verdict", "MAYBE", "--scope", "x");
    expect(badVerdict.code).toBe(1);
    expect(badVerdict.out).toContain("--verdict must be one of PASS|FAIL|INCOMPLETE");
    const noScope = run(root, "handoff", "oc-a", "--policy", "x-v1", "--verdict", "PASS");
    expect(noScope.code).toBe(1);
    expect(noScope.out).toContain("--scope is required");
    const danglingValue = run(root, "handoff", "oc-a", "--policy", "--verdict", "PASS", "--scope", "x");
    expect(danglingValue.code).toBe(1);
    expect(danglingValue.out).toContain("--policy needs a value");
    expect(readCp(root, "oc-a").handoffs).toBeUndefined();
    const escape = run(root, "handoff", "../escape", "--policy", "x-v1", "--verdict", "PASS", "--scope", "x");
    expect(escape.code).toBe(1);
    expect(escape.out).toContain('"../escape" is not a skill name');
  });
});

// The store grows one file per merged branch; the release PR (one at a time) prunes it.
describe("prune-handoffs", () => {
  it("deletes every store file not bound to the current candidate, and nothing on --dry-run", () => {
    const root = repo();
    const stale = (id) => JSON.stringify({ type: "verification.verdict", candidate: { kind: "git_tree_projection", id: `sha256:${id.repeat(64)}` } });
    mkdirSync(join(root, ".checkpoints", "handoffs", "pr-docs-v1", "claude"), { recursive: true });
    writeFileSync(join(root, ".checkpoints", "handoffs", "pr-docs-v1", "claude", "merged-a.json"), stale("a"));
    writeFileSync(join(root, ".checkpoints", "handoffs", "pr-docs-v1", "claude", "merged-b.json"), "{ not json");
    expect(run(root, "handoff", "oc-docs-forge", "pr-docs-v1", "--verdict", "PASS", "--scope", "release").code).toBe(0);
    write(root, "oc-docs-forge.checkpoint.json", cp("oc-docs-forge"));

    const dry = JSON.parse(runSplit(root, "prune-handoffs", "--dry-run", "--json").stdout);
    expect(dry).toMatchObject({ ok: true, dry_run: true, kept: [".checkpoints/handoffs/pr-docs-v1/main.json"] });
    expect(dry.removed.sort()).toEqual([".checkpoints/handoffs/pr-docs-v1/claude/merged-a.json", ".checkpoints/handoffs/pr-docs-v1/claude/merged-b.json"]);
    expect(existsSync(join(root, ".checkpoints", "handoffs", "pr-docs-v1", "claude", "merged-a.json"))).toBe(true);

    const r = run(root, "prune-handoffs");
    expect(r.code).toBe(0);
    expect(r.out).toContain("pruned 2 handoff file(s)");
    expect(readdirSync(join(root, ".checkpoints", "handoffs", "pr-docs-v1"))).toEqual(["main.json"]); // the emptied claude/ directory goes too
    expect(existsSync(join(root, ".checkpoints", "oc-docs-forge.checkpoint.json"))).toBe(true); // never touches checkpoints
  });
});
