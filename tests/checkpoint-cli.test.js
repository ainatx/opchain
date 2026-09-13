// CLI-level tests for scripts/checkpoint.mjs, driven through OPCHAIN_ROOT /
// OPCHAIN_CHECKPOINTS_DIR against scratch repos. tests/checkpoint.test.js covers
// the exported pure helpers; the command functions had no tests at all, which is
// how `status <skill>` ignoring its argument and `doctor` validating a rebuilt
// path both shipped (2026-09-11 skill-chain audit, v1.9.1 Sprint 2).
import { describe, it, expect, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { spawnSync } from "node:child_process";
import { validate, applyUpdates, repoPathCandidate, projectName } from "../scripts/checkpoint.mjs";

const CLI = join(import.meta.dirname, "..", "scripts", "checkpoint.mjs");
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
