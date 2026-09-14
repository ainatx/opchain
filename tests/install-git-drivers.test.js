import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { HOOK_MARKER, PRE_COMMIT_HOOK, VERIFICATION_MARKER } from "../scripts/install-git-drivers.mjs";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "install-git-drivers.mjs");

// Every git call runs in a throwaway repo with its own identity, so the
// developer's global config (signing, hooksPath, templates) cannot leak in.
const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@example.com",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@example.com",
};

function git(cwd, ...args) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", env: GIT_ENV });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr}`);
  return r.stdout.trim();
}

function install(cwd) {
  return spawnSync(process.execPath, [SCRIPT], { cwd, encoding: "utf8", env: GIT_ENV });
}

let repo;

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "oc-git-drivers-"));
  git(repo, "init", "-q", "-b", "main");
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe("install-git-drivers: per-clone bootstrap", () => {
  it("installs the verifier hook without registering an unavailable merge driver", () => {
    const r = install(repo);
    expect(r.status, r.stderr).toBe(0);
    const mergeDriver = spawnSync("git", ["config", "--get", "merge.opchain-checkpoint.driver"], {
      cwd: repo,
      encoding: "utf8",
      env: GIT_ENV,
    });
    expect(mergeDriver.status).toBe(1);

    const hook = join(repo, ".git", "hooks", "pre-commit");
    expect(readFileSync(hook, "utf8")).toBe(PRE_COMMIT_HOOK);
    expect(statSync(hook).mode & 0o111, "hook must be executable").not.toBe(0);
  });

  it("is idempotent", () => {
    install(repo);
    const before = readFileSync(join(repo, ".git", "hooks", "pre-commit"), "utf8");
    const r = install(repo);
    expect(r.status).toBe(0);
    expect(readFileSync(join(repo, ".git", "hooks", "pre-commit"), "utf8")).toBe(before);
  });

  it("never overwrites a pre-commit hook it did not write", () => {
    const hook = join(repo, ".git", "hooks", "pre-commit");
    mkdirSync(dirname(hook), { recursive: true });
    writeFileSync(hook, "#!/bin/sh\necho someone-elses-hook\n");
    const r = install(repo);
    expect(r.status).toBe(0);
    expect(readFileSync(hook, "utf8")).toBe("#!/bin/sh\necho someone-elses-hook\n");
    expect(r.stderr).toContain("not managed by opchain");
    expect(r.stderr).toContain(VERIFICATION_MARKER);
  });

  it("honours core.hooksPath", () => {
    git(repo, "config", "core.hooksPath", ".githooks");
    const r = install(repo);
    expect(r.status, r.stderr).toBe(0);
    expect(readFileSync(join(repo, ".githooks", "pre-commit"), "utf8")).toContain(HOOK_MARKER);
  });

  it("skips entirely under OPCHAIN_SKIP_GIT_DRIVERS=1", () => {
    const r = spawnSync(process.execPath, [SCRIPT], {
      cwd: repo,
      encoding: "utf8",
      env: { ...GIT_ENV, OPCHAIN_SKIP_GIT_DRIVERS: "1" },
    });
    expect(r.status).toBe(0);
    expect(() => statSync(join(repo, ".git", "hooks", "pre-commit"))).toThrow();
  });
});

// Each integration fixture initializes and commits a repository through real
// hooks and multiple Node generators; allow slow CI without relaxing assertions.
describe("the pre-commit hook", () => {
  // Stand-in sync scripts: each writes a marker into the mirror it owns, the
  // way the real generators rewrite plugins/opchain/skills and
  // skills/<id>/references/*.md from skills/.
  function scaffold() {
    mkdirSync(join(repo, "scripts"), { recursive: true });
    mkdirSync(join(repo, "skills", "oc-demo", "references"), { recursive: true });
    mkdirSync(join(repo, "plugins", "opchain", "skills"), { recursive: true });
    writeFileSync(
      join(repo, "scripts", "sync-skill-bundles.mjs"),
      `import { writeFileSync } from "node:fs";
writeFileSync("skills/oc-demo/references/orchestrator.md", "regenerated bundle\\n");`,
    );
    writeFileSync(
      join(repo, "scripts", "sync-plugin-skills.mjs"),
      `import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("plugins/opchain/skills/oc-demo", { recursive: true });
writeFileSync("plugins/opchain/skills/oc-demo/SKILL.md", "regenerated mirror\\n");`,
    );
    writeFileSync(join(repo, "scripts", "merge-checkpoint.mjs"), "process.exit(0);\n");
    writeFileSync(join(repo, "package.json"), '{"name":"opchain-dev"}\n');
    writeFileSync(join(repo, "skills", "oc-demo", "SKILL.md"), "version: 1\n");
    writeFileSync(join(repo, "skills", "oc-demo", "references", "orchestrator.md"), "stale bundle\n");
    writeFileSync(join(repo, "plugins", "opchain", "skills", ".keep"), "");
    git(repo, "add", "-A");
    git(repo, "-c", "commit.gpgsign=false", "commit", "-q", "-m", "seed");
    expect(install(repo).status).toBe(0);
    expect(git(repo, "config", "merge.opchain-checkpoint.driver")).toContain("scripts/merge-checkpoint.mjs");
  }

  it("regenerates and stages both mirrors when skills/ is staged", { timeout: 20_000 }, () => {
    scaffold();
    writeFileSync(join(repo, "skills", "oc-demo", "SKILL.md"), "version: 2\n");
    git(repo, "add", "skills/oc-demo/SKILL.md");
    git(repo, "-c", "commit.gpgsign=false", "commit", "-q", "-m", "bump");

    const committed = git(repo, "show", "--name-only", "--format=", "HEAD").split("\n").sort();
    expect(committed).toEqual([
      "plugins/opchain/skills/oc-demo/SKILL.md",
      "skills/oc-demo/SKILL.md",
      "skills/oc-demo/references/orchestrator.md",
    ]);
    expect(git(repo, "show", "HEAD:skills/oc-demo/references/orchestrator.md")).toBe("regenerated bundle");
    expect(git(repo, "status", "--porcelain")).toBe("");
  });

  it("does nothing when skills/ is not part of the commit", { timeout: 20_000 }, () => {
    scaffold();
    writeFileSync(join(repo, "README.md"), "hello\n");
    git(repo, "add", "README.md");
    git(repo, "-c", "commit.gpgsign=false", "commit", "-q", "-m", "docs");
    expect(git(repo, "show", "--name-only", "--format=", "HEAD")).toBe("README.md");
  });

  it("can be skipped once with OPCHAIN_SKIP_MIRROR_SYNC=1, leaving the drift for CI", { timeout: 20_000 }, () => {
    scaffold();
    writeFileSync(join(repo, "skills", "oc-demo", "SKILL.md"), "version: 3\n");
    git(repo, "add", "skills/oc-demo/SKILL.md");
    const r = spawnSync("git", ["-c", "commit.gpgsign=false", "commit", "-q", "-m", "skip"], {
      cwd: repo,
      encoding: "utf8",
      env: { ...GIT_ENV, OPCHAIN_SKIP_MIRROR_SYNC: "1" },
    });
    expect(r.status, r.stderr).toBe(0);
    expect(git(repo, "show", "--name-only", "--format=", "HEAD")).toBe("skills/oc-demo/SKILL.md");
  });
});
