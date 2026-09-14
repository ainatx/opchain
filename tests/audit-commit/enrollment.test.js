import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { HOOK_MARKER, VERIFICATION_MARKER } from "../../scripts/install-git-drivers.mjs";

const SOURCE_ROOT = resolve(import.meta.dirname, "../..");
const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
  GIT_AUTHOR_NAME: "Enrollment Fixture",
  GIT_AUTHOR_EMAIL: "enrollment@example.invalid",
  GIT_COMMITTER_NAME: "Enrollment Fixture",
  GIT_COMMITTER_EMAIL: "enrollment@example.invalid",
};
const scratches = [];

afterEach(() => {
  while (scratches.length) rmSync(scratches.pop(), { recursive: true, force: true });
});

function run(executable, args, cwd, env = GIT_ENV) {
  return spawnSync(executable, args, { cwd, env, encoding: "utf8" });
}

function git(root, ...args) {
  const result = run("git", args, root);
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function copyRuntime(targetRoot, sourceRoot = SOURCE_ROOT) {
  mkdirSync(join(targetRoot, "scripts", "lib"), { recursive: true });
  for (const relativePath of [
    join("scripts", "install-git-drivers.mjs"),
    join("scripts", "verify-candidate.mjs"),
    join("scripts", "lib", "verification-receipt.cjs"),
  ]) {
    cpSync(join(sourceRoot, relativePath), join(targetRoot, relativePath));
  }
}

function setup(options = {}) {
  const container = mkdtempSync(join(tmpdir(), "opchain enrollment "));
  scratches.push(container);
  const artifact = join(container, "plugin artifact");
  const repo = join(container, "target repo");
  mkdirSync(artifact);
  mkdirSync(repo);
  copyRuntime(artifact, join(SOURCE_ROOT, "plugins", "opchain"));
  git(repo, "init", "-q", "-b", "main");
  writeFileSync(
    join(repo, ".bugcheck.json"),
    `${JSON.stringify({
      verification: {
        required_checks: ["tests"],
        commands: { tests: ["node", "check-candidate.mjs"] },
        timeout_ms: 10000,
      },
    })}\n`,
  );
  writeFileSync(
    join(repo, "check-candidate.mjs"),
    `import { readFileSync } from "node:fs";
process.exit(["safe\\n", "later\\n"].includes(readFileSync("subject.txt", "utf8")) ? 0 : 1);\n`,
  );
  writeFileSync(join(repo, "subject.txt"), "safe\n");
  if (options.repoRuntime) copyRuntime(repo);
  if (options.enrolled) {
    mkdirSync(join(repo, ".opchain"));
    writeFileSync(join(repo, ".opchain", "enrolled"), "explicit\n");
  }
  git(repo, "add", "-A");
  git(repo, "-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "seed");
  return { artifact, container, repo };
}

function enroll(installerRoot, repo) {
  return run(
    process.execPath,
    [join(installerRoot, "scripts", "install-git-drivers.mjs"), "--enroll", "--repo", repo],
    repo,
  );
}

function installedPaths(repo) {
  const common = git(repo, "rev-parse", "--absolute-git-dir");
  return {
    hook: join(common, "hooks", "pre-commit"),
    verifier: join(common, "opchain", "commit-gate", "v1", "verify-candidate.mjs"),
    receipt: join(common, "opchain", "commit-gate", "v1", "lib", "verification-receipt.cjs"),
  };
}

function commitSubject(repo, content, message) {
  writeFileSync(join(repo, "subject.txt"), `${content}\n`);
  git(repo, "add", "subject.txt");
  return run("git", ["-c", "commit.gpgsign=false", "commit", "-q", "-m", message], repo);
}

describe("explicit commit-boundary enrollment", () => {
  it("enrolls a fresh plugin-only repository from the packaged artifact and protects later commits", { timeout: 30_000 }, () => {
    const { artifact, repo } = setup();
    const result = enroll(artifact, repo);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("enrolled Git commit boundary");
    const paths = installedPaths(repo);
    expect(readFileSync(paths.hook, "utf8")).toContain(HOOK_MARKER);
    expect(existsSync(paths.verifier)).toBe(true);
    expect(existsSync(paths.receipt)).toBe(true);
    expect(existsSync(join(repo, ".opchain"))).toBe(true);
    expect(run("git", ["config", "--get", "merge.opchain-checkpoint.driver"], repo).status).toBe(1);

    rmSync(artifact, { recursive: true, force: true });
    mkdirSync(join(repo, "skills"));
    writeFileSync(join(repo, "skills", "example.txt"), "unrelated project skill\n");
    git(repo, "add", "skills/example.txt");
    const valid = commitSubject(repo, "later", "later valid");
    expect(valid.status, valid.stderr).toBe(0);
    expect(git(repo, "show", "--name-only", "--format=", "HEAD")).toContain("skills/example.txt");
    const before = git(repo, "rev-parse", "HEAD");
    const blocked = commitSubject(repo, "invalid", "later invalid");
    expect(blocked.status).not.toBe(0);
    expect(git(repo, "rev-parse", "HEAD")).toBe(before);
  });

  it("enrolls from repository-local source and uses the installed runtime on a later commit", { timeout: 30_000 }, () => {
    const { repo } = setup({ repoRuntime: true });
    const result = enroll(repo, repo);
    expect(result.status, result.stderr).toBe(0);
    const paths = installedPaths(repo);
    expect(existsSync(paths.verifier)).toBe(true);
    expect(existsSync(paths.receipt)).toBe(true);

    rmSync(join(repo, "scripts"), { recursive: true, force: true });
    git(repo, "add", "-A");
    writeFileSync(join(repo, "subject.txt"), "later\n");
    git(repo, "add", "subject.txt");
    const committed = run("git", ["-c", "commit.gpgsign=false", "commit", "-q", "-m", "later repo-only"], repo);
    expect(committed.status, committed.stderr).toBe(0);
  });

  it("keeps combined repository and plugin enrollment idempotent and protects later commits", { timeout: 30_000 }, () => {
    const { artifact, repo } = setup({ repoRuntime: true });
    const repoEnrollment = enroll(repo, repo);
    expect(repoEnrollment.status, repoEnrollment.stderr).toBe(0);
    const beforeHook = readFileSync(installedPaths(repo).hook, "utf8");
    const pluginEnrollment = enroll(artifact, repo);
    expect(pluginEnrollment.status, pluginEnrollment.stderr).toBe(0);
    expect(readFileSync(installedPaths(repo).hook, "utf8")).toBe(beforeHook);

    const before = git(repo, "rev-parse", "HEAD");
    const blocked = commitSubject(repo, "invalid", "combined invalid");
    expect(blocked.status).not.toBe(0);
    expect(git(repo, "rev-parse", "HEAD")).toBe(before);
  });

  it("fails enrolled setup nonzero without overwriting a foreign hook", () => {
    const { artifact, repo } = setup({ enrolled: true });
    const paths = installedPaths(repo);
    mkdirSync(join(paths.hook, ".."), { recursive: true });
    const foreign = "#!/bin/sh\necho foreign-hook\n";
    writeFileSync(paths.hook, foreign);
    chmodSync(paths.hook, 0o755);

    const result = enroll(artifact, repo);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("BLOCKED");
    expect(result.stderr).toContain("left unchanged");
    expect(result.stderr).toContain(VERIFICATION_MARKER);
    expect(readFileSync(paths.hook, "utf8")).toBe(foreign);
    expect(existsSync(paths.verifier)).toBe(true);
    expect(existsSync(paths.receipt)).toBe(true);
  });

  it("publishes an actionable plugin command for explicit enrollment", () => {
    const wrapper = readFileSync(join(SOURCE_ROOT, "plugins", "opchain", "commands", "oc-enroll.md"), "utf8");
    expect(wrapper).toContain('node "${CLAUDE_PLUGIN_ROOT}/scripts/install-git-drivers.mjs" --enroll');
    expect(wrapper).toContain("BLOCKED");
  });

  it("does not let the package-preparation escape hatch fake explicit enrollment", () => {
    const { artifact, repo } = setup();
    const result = run(
      process.execPath,
      [join(artifact, "scripts", "install-git-drivers.mjs"), "--enroll", "--repo", repo],
      repo,
      { ...GIT_ENV, OPCHAIN_SKIP_GIT_DRIVERS: "1" },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("prevents explicit enrollment");
    expect(existsSync(join(repo, ".opchain"))).toBe(false);
  });
});
