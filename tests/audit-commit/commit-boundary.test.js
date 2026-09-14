import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const SOURCE_ROOT = resolve(import.meta.dirname, "../..");
const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
  GIT_AUTHOR_NAME: "A3 Fixture",
  GIT_AUTHOR_EMAIL: "a3@example.invalid",
  GIT_COMMITTER_NAME: "A3 Fixture",
  GIT_COMMITTER_EMAIL: "a3@example.invalid",
};
const scratches = [];

afterEach(() => {
  while (scratches.length) rmSync(scratches.pop(), { recursive: true, force: true });
});

function run(executable, args, options = {}) {
  return spawnSync(executable, args, {
    cwd: options.cwd,
    env: options.env || GIT_ENV,
    encoding: "utf8",
  });
}

function git(root, ...args) {
  const result = run("git", args, { cwd: root });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function copyRuntime(root) {
  mkdirSync(join(root, "scripts", "lib"), { recursive: true });
  cpSync(join(SOURCE_ROOT, "scripts", "verify-candidate.mjs"), join(root, "scripts", "verify-candidate.mjs"));
  cpSync(
    join(SOURCE_ROOT, "scripts", "lib", "verification-receipt.cjs"),
    join(root, "scripts", "lib", "verification-receipt.cjs"),
  );
  cpSync(join(SOURCE_ROOT, "scripts", "install-git-drivers.mjs"), join(root, "scripts", "install-git-drivers.mjs"));
}

function writePolicy(root, command) {
  writeFileSync(
    join(root, ".bugcheck.json"),
    `${JSON.stringify({
      mode: "strict",
      verification: {
        required_checks: ["tests"],
        commands: { tests: command },
        timeout_ms: 10000,
      },
    })}\n`,
  );
}

function initialize(options = {}) {
  const container = mkdtempSync(join(tmpdir(), "opchain A3 "));
  scratches.push(container);
  const root = join(container, "main repo");
  mkdirSync(root);
  git(root, "init", "-q", "-b", "main");
  mkdirSync(join(root, ".opchain"), { recursive: true });
  writeFileSync(join(root, ".opchain", "enrolled"), "candidate verification enabled\n");
  copyRuntime(root);
  writePolicy(root, options.command || ["node", "check-candidate.mjs"]);
  writeFileSync(
    join(root, "check-candidate.mjs"),
    `import { readFileSync } from "node:fs";
const accepted = new Set(["safe\\n", "staged\\n", "alternate\\n", "worktree\\n"]);
process.exit(accepted.has(readFileSync("subject.txt", "utf8")) ? 0 : 1);\n`,
  );
  writeFileSync(join(root, "subject.txt"), "safe\n");
  if (options.trackedCheckpoint) {
    mkdirSync(join(root, ".checkpoints"), { recursive: true });
    writeFileSync(join(root, ".checkpoints", "oc-bug-check.checkpoint.json"), '{"step":"seed"}\n');
  }
  git(root, "add", "-A");
  git(root, "-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "seed");
  const installed = run(process.execPath, [join(root, "scripts", "install-git-drivers.mjs")], { cwd: root });
  if (installed.status !== 0) throw new Error(`installer failed: ${installed.stderr}`);
  return { container, root };
}

function commonDir(root) {
  const commonValue = git(root, "rev-parse", "--git-common-dir");
  return realpathSync(isAbsolute(commonValue) ? commonValue : resolve(root, commonValue));
}

function receiptFiles(root) {
  const receiptRoot = join(commonDir(root), "opchain", "verification-receipts");
  if (!existsSync(receiptRoot)) return [];
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else if (entry.name.endsWith(".json")) files.push(fullPath);
    }
  };
  visit(receiptRoot);
  return files;
}

function receipts(root) {
  return receiptFiles(root).map((file) => JSON.parse(readFileSync(file, "utf8")));
}

describe("A3 Git commit-boundary acceptance", () => {
  it("commits the partially staged candidate with a tracked checkpoint", { timeout: 30_000 }, () => {
    const { root } = initialize({ trackedCheckpoint: true });
    writeFileSync(join(root, "subject.txt"), "staged\n");
    git(root, "add", "subject.txt");
    writeFileSync(join(root, "subject.txt"), "working copy differs\n");
    writeFileSync(join(root, ".checkpoints", "oc-bug-check.checkpoint.json"), '{"step":"candidate"}\n');
    git(root, "add", ".checkpoints/oc-bug-check.checkpoint.json");

    const committed = run("git", ["-c", "commit.gpgsign=false", "commit", "-q", "-m", "partial"], { cwd: root });
    expect(committed.status, committed.stderr).toBe(0);
    expect(git(root, "show", "HEAD:subject.txt")).toBe("staged");
    expect(git(root, "show", "HEAD:.checkpoints/oc-bug-check.checkpoint.json")).toBe('{"step":"candidate"}');
    expect(readFileSync(join(root, "subject.txt"), "utf8")).toBe("working copy differs\n");

    const committedTree = git(root, "show", "-s", "--format=%T", "HEAD");
    expect(receipts(root).some((receipt) => receipt.verdict === "PASS" && receipt.candidate.tree === committedTree)).toBe(true);
  });

  it("blocks mutations committed through a compound command or command substitution", { timeout: 30_000 }, () => {
    const { root } = initialize();
    const before = git(root, "rev-parse", "HEAD");
    const compound = run(
      "sh",
      ["-c", 'printf "invalid\\n" > subject.txt && git add subject.txt && git -c commit.gpgsign=false commit -qm compound'],
      { cwd: root },
    );
    expect(compound.status).not.toBe(0);
    expect(git(root, "rev-parse", "HEAD")).toBe(before);

    writeFileSync(join(root, "subject.txt"), "also invalid\n");
    git(root, "add", "subject.txt");
    const substitution = run(
      "sh",
      ["-c", 'echo "$(git -c commit.gpgsign=false commit -qm substitution 2>&1)"'],
      { cwd: root },
    );
    expect(substitution.status).toBe(0);
    expect(substitution.stdout).toContain("candidate verification failed");
    expect(git(root, "rev-parse", "HEAD")).toBe(before);
  });

  it("resolves git -C and an explicit alternate Git index/environment", { timeout: 30_000 }, () => {
    const { container, root } = initialize();
    writeFileSync(join(root, "subject.txt"), "invalid\n");
    git(root, "add", "subject.txt");
    const before = git(root, "rev-parse", "HEAD");
    const targeted = run(
      "git",
      ["-C", root, "-c", "commit.gpgsign=false", "commit", "-q", "-m", "targeted"],
      { cwd: container },
    );
    expect(targeted.status).not.toBe(0);
    expect(git(root, "rev-parse", "HEAD")).toBe(before);

    const alternateIndex = join(container, "alternate.index");
    const explicitEnv = {
      ...GIT_ENV,
      GIT_DIR: join(root, ".git"),
      GIT_WORK_TREE: root,
      GIT_INDEX_FILE: alternateIndex,
    };
    expect(run("git", ["read-tree", "HEAD"], { cwd: container, env: explicitEnv }).status).toBe(0);
    writeFileSync(join(root, "subject.txt"), "alternate\n");
    expect(run("git", ["add", "subject.txt"], { cwd: container, env: explicitEnv }).status).toBe(0);
    writeFileSync(join(root, "subject.txt"), "working copy differs\n");
    const committed = run(
      "git",
      ["-c", "commit.gpgsign=false", "commit", "-q", "-m", "alternate index"],
      { cwd: container, env: explicitEnv },
    );
    expect(committed.status, committed.stderr).toBe(0);
    expect(git(root, "show", "HEAD:subject.txt")).toBe("alternate");
    const committedTree = git(root, "show", "-s", "--format=%T", "HEAD");
    expect(receipts(root).some((receipt) => receipt.verdict === "PASS" && receipt.candidate.tree === committedTree)).toBe(true);
  });

  it("uses the shared repository identity and receipt store from a linked worktree", { timeout: 30_000 }, () => {
    const { container, root } = initialize();
    const linked = join(container, "linked worktree");
    git(root, "worktree", "add", "-q", "-b", "a3-linked", linked, "HEAD");
    writeFileSync(join(linked, "subject.txt"), "worktree\n");
    git(linked, "add", "subject.txt");
    const committed = run("git", ["-c", "commit.gpgsign=false", "commit", "-q", "-m", "linked"], { cwd: linked });
    expect(committed.status, committed.stderr).toBe(0);
    const committedTree = git(linked, "show", "-s", "--format=%T", "HEAD");
    expect(receipts(linked).some((receipt) => receipt.verdict === "PASS" && receipt.candidate.tree === committedTree)).toBe(true);
    expect(commonDir(linked)).toBe(commonDir(root));
  });

  it("fails closed when a required executable is unavailable", { timeout: 30_000 }, () => {
    const { root } = initialize({ command: ["opchain-required-tool-that-does-not-exist"] });
    writeFileSync(join(root, "subject.txt"), "staged\n");
    git(root, "add", "subject.txt");
    const before = git(root, "rev-parse", "HEAD");
    const committed = run("git", ["-c", "commit.gpgsign=false", "commit", "-q", "-m", "missing tool"], { cwd: root });
    expect(committed.status).not.toBe(0);
    expect(git(root, "rev-parse", "HEAD")).toBe(before);
    expect(receipts(root).some((receipt) => receipt.verdict === "UNSUPPORTED" && receipt.checks[0].status === "UNSUPPORTED")).toBe(true);
  });

  it("rejects a candidate whose real index changes during verification", { timeout: 30_000 }, () => {
    const { root } = initialize();
    writePolicy(root, ["node", "mutate-index.mjs", root]);
    writeFileSync(
      join(root, "mutate-index.mjs"),
      `import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
const target = process.argv[2];
writeFileSync(join(target, "late.txt"), "late mutation\\n");
const result = spawnSync("git", ["-C", target, "add", "late.txt"], { stdio: "inherit" });
process.exit(result.status ?? 1);\n`,
    );
    git(root, "add", ".bugcheck.json", "mutate-index.mjs");
    git(root, "-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "mutation fixture");
    writeFileSync(join(root, "subject.txt"), "staged\n");
    git(root, "add", "subject.txt");
    const before = git(root, "rev-parse", "HEAD");
    const committed = run("git", ["-c", "commit.gpgsign=false", "commit", "-q", "-m", "late mutation"], { cwd: root });
    expect(committed.status).not.toBe(0);
    expect(committed.stderr).toContain("staged candidate changed during verification");
    expect(git(root, "rev-parse", "HEAD")).toBe(before);
    expect(git(root, "diff", "--cached", "--name-only").split("\n")).toContain("late.txt");
    expect(receiptFiles(root)).toHaveLength(0);
  });
});
