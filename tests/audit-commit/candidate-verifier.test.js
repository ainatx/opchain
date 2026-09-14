import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const SOURCE_ROOT = resolve(import.meta.dirname, "../..");
const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
  GIT_AUTHOR_NAME: "Verifier Fixture",
  GIT_AUTHOR_EMAIL: "verifier@example.invalid",
  GIT_COMMITTER_NAME: "Verifier Fixture",
  GIT_COMMITTER_EMAIL: "verifier@example.invalid",
};
const scratches = [];

afterEach(() => {
  while (scratches.length) rmSync(scratches.pop(), { recursive: true, force: true });
});

function git(root, ...args) {
  const result = spawnSync("git", args, { cwd: root, env: GIT_ENV, encoding: "utf8" });
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

function digest(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function initialize() {
  const root = mkdtempSync(join(tmpdir(), "opchain-candidate-fixture-"));
  scratches.push(root);
  git(root, "init", "-q", "-b", "main");
  mkdirSync(join(root, ".opchain"), { recursive: true });
  writeFileSync(join(root, ".opchain", "enrolled"), "candidate verification enabled\n");
  copyRuntime(root);
  return root;
}

function verifier(root, action, extraEnv = {}) {
  return spawnSync(process.execPath, [join(root, "scripts", "verify-candidate.mjs"), action, "--repo", root, "--json"], {
    cwd: root,
    env: { ...GIT_ENV, ...extraEnv },
    encoding: "utf8",
  });
}

function receiptFiles(root) {
  const receipts = join(realpathSync(root), ".git", "opchain", "verification-receipts");
  const output = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else if (entry.name.endsWith(".json")) output.push(fullPath);
    }
  };
  visit(receipts);
  return output;
}

describe("exact staged-candidate verification", () => {
  it("does not gate a repository that has not explicitly enrolled", () => {
    const root = mkdtempSync(join(tmpdir(), "opchain-unenrolled-fixture-"));
    scratches.push(root);
    git(root, "init", "-q", "-b", "main");
    copyRuntime(root);
    const result = verifier(root, "run");
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ ok: true, skipped: true, reason: "repository is not enrolled" });
  });

  it("allows only audited, content-bound built-in scanner exceptions", { timeout: 30_000 }, () => {
    const root = initialize();
    const intentionalFixture = "debug" + "ger\n-----BEGIN PRIVATE " + "KEY-----\n";
    mkdirSync(join(root, "docs"), { recursive: true });
    writeFileSync(join(root, "docs", "scanner-fixture.md"), intentionalFixture);
    writeFileSync(
      join(root, ".bugcheck.json"),
      `${JSON.stringify({
        mode: "strict",
        verification: {
          required_checks: ["anti_patterns", "secrets"],
          timeout_ms: 10_000,
          scan_exceptions: {
            anti_patterns: [{ path: "docs/scanner-fixture.md", digest: digest(intentionalFixture) }],
            secrets: [{ path: "docs/scanner-fixture.md", digest: digest(intentionalFixture) }],
          },
        },
      })}\n`,
    );
    git(root, "add", "-A");
    git(root, "-c", "core.hooksPath=/dev/null", "commit", "-q", "-m", "audited scanner exception");

    const accepted = verifier(root, "run");
    expect(accepted.status, accepted.stderr).toBe(0);
    expect(JSON.parse(accepted.stdout)).toMatchObject({ ok: true, verdict: "PASS" });

    writeFileSync(join(root, "docs", "scanner-fixture.md"), `${intentionalFixture}changed\n`);
    git(root, "add", "docs/scanner-fixture.md");
    const stale = verifier(root, "run");
    expect(stale.status).toBe(1);
    expect(JSON.parse(stale.stdout).error).toContain("digest is stale for docs/scanner-fixture.md");
  });

  it("scans the immutable candidate tree after a build creates an ignored matching file", { timeout: 30_000 }, () => {
    const root = initialize();
    writeFileSync(join(root, ".gitignore"), "generated-secret.txt\n");
    writeFileSync(
      join(root, "build.mjs"),
      `import { writeFileSync } from "node:fs";
writeFileSync("generated-secret.txt", "-----BEGIN PRIVATE " + "KEY-----\\n");
`,
    );
    writeFileSync(
      join(root, ".bugcheck.json"),
      `${JSON.stringify({
        verification: {
          required_checks: ["build", "secrets"],
          commands: { build: ["node", "build.mjs"] },
          timeout_ms: 10_000,
        },
      })}\n`,
    );
    git(root, "add", "-A");
    git(root, "-c", "core.hooksPath=/dev/null", "commit", "-q", "-m", "generated output fixture");

    const result = verifier(root, "run");
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ ok: true, verdict: "PASS" });
  });

  it("still fails on a matching tracked candidate blob and reports only its safe path", { timeout: 30_000 }, () => {
    const root = initialize();
    writeFileSync(join(root, "tracked-secret.txt"), "-----BEGIN PRIVATE " + "KEY-----\n");
    writeFileSync(
      join(root, ".bugcheck.json"),
      `${JSON.stringify({ verification: { required_checks: ["secrets"], timeout_ms: 10_000 } })}\n`,
    );
    git(root, "add", "-A");
    git(root, "-c", "core.hooksPath=/dev/null", "commit", "-q", "-m", "tracked secret fixture");

    const result = verifier(root, "run");
    expect(result.status).toBe(1);
    const output = JSON.parse(result.stdout);
    expect(output.failures).toEqual([
      expect.objectContaining({ id: "secrets", status: "FAIL", diagnostic: "tracked-secret.txt" }),
    ]);
    expect(result.stdout).not.toContain("BEGIN PRIVATE KEY");
  });

  it("returns UTF-8-byte-capped redacted command diagnostics without putting them in receipts", { timeout: 30_000 }, () => {
    const root = initialize();
    writePolicy(root, ["node", "failing-check.mjs"]);
    writeFileSync(
      join(root, "failing-check.mjs"),
      `process.stderr.write("🙂".repeat(5000) + "\\nuseful assertion failure\\nAPI_TOKEN=" + "not-a-real-secret-value\\n");
process.exit(1);
`,
    );
    git(root, "add", "-A");
    git(root, "-c", "core.hooksPath=/dev/null", "commit", "-q", "-m", "diagnostic fixture");

    const result = verifier(root, "run");
    expect(result.status).toBe(1);
    const output = JSON.parse(result.stdout);
    expect(output.failures[0].diagnostic).toContain("useful assertion failure");
    expect(output.failures[0].diagnostic).toContain("API_TOKEN=[REDACTED]");
    expect(output.failures[0].diagnostic).not.toContain("not-a-real-secret-value");
    expect(output.failures[0].diagnostic).toContain("[output truncated; showing final bytes]");
    expect(output.failures[0].diagnostic).not.toContain("�");
    expect(Buffer.byteLength(output.failures[0].diagnostic, "utf8")).toBeLessThanOrEqual(8 * 1024);
    const receipt = JSON.parse(readFileSync(output.receipt_path, "utf8"));
    expect(JSON.stringify(receipt)).not.toContain("useful assertion failure");
  });

  it("checks partial staging, writes externally, and rejects a later staged mutation", { timeout: 30_000 }, () => {
    const root = initialize();
    writePolicy(root, ["node", "check-candidate.mjs"]);
    writeFileSync(
      join(root, "check-candidate.mjs"),
      `import { readFileSync } from "node:fs";
process.exit(readFileSync("subject.txt", "utf8") === "candidate\\n" ? 0 : 1);\n`,
    );
    writeFileSync(join(root, "subject.txt"), "base\n");
    git(root, "add", "-A");
    git(root, "-c", "core.hooksPath=/dev/null", "commit", "-q", "-m", "seed");

    writeFileSync(join(root, "subject.txt"), "candidate\n");
    git(root, "add", "subject.txt");
    writeFileSync(join(root, "subject.txt"), "working copy differs\n");
    const expectedTree = git(root, "write-tree");

    const verified = verifier(root, "run");
    expect(verified.status, verified.stderr).toBe(0);
    const result = JSON.parse(verified.stdout);
    expect(result).toMatchObject({ ok: true, verdict: "PASS", candidate_tree: expectedTree });
    expect(result.receipt_path.startsWith(join(realpathSync(root), ".git"))).toBe(true);
    expect(statSync(result.receipt_path).mode & 0o777).toBe(0o600);
    expect(git(root, "status", "--porcelain")).toContain("MM subject.txt");

    const enforced = verifier(root, "enforce");
    expect(enforced.status, enforced.stderr).toBe(0);
    expect(JSON.parse(enforced.stdout)).toMatchObject({ ok: true, candidate_tree: expectedTree });

    writeFileSync(join(root, "subject.txt"), "mutated after verification\n");
    git(root, "add", "subject.txt");
    const stale = verifier(root, "enforce");
    expect(stale.status).toBe(1);
    expect(JSON.parse(stale.stdout)).toMatchObject({ ok: false, error: "no matching PASS receipt" });
  });

  it("runs after the staging-mutating hook and blocks a failed candidate check", { timeout: 30_000 }, () => {
    const root = initialize();
    writePolicy(root, ["node", "check-generated.mjs"]);
    mkdirSync(join(root, "skills", "oc-demo", "references"), { recursive: true });
    mkdirSync(join(root, "plugins", "opchain", "skills"), { recursive: true });
    writeFileSync(join(root, "skills", "oc-demo", "SKILL.md"), "version: 1\n");
    writeFileSync(join(root, "skills", "oc-demo", "references", "orchestrator.md"), "stale\n");
    writeFileSync(join(root, "plugins", "opchain", "skills", ".keep"), "");
    writeFileSync(
      join(root, "scripts", "sync-skill-bundles.mjs"),
      `import { writeFileSync } from "node:fs";
writeFileSync("skills/oc-demo/references/orchestrator.md", "regenerated bundle\\n");\n`,
    );
    writeFileSync(
      join(root, "scripts", "sync-plugin-skills.mjs"),
      `import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("plugins/opchain/skills/oc-demo", { recursive: true });
writeFileSync("plugins/opchain/skills/oc-demo/SKILL.md", "regenerated mirror\\n");\n`,
    );
    writeFileSync(join(root, "scripts", "merge-checkpoint.mjs"), "process.exit(0);\n");
    writeFileSync(join(root, "package.json"), '{"name":"opchain-dev"}\n');
    writeFileSync(
      join(root, "check-generated.mjs"),
      `import { readFileSync } from "node:fs";
process.exit(readFileSync("plugins/opchain/skills/oc-demo/SKILL.md", "utf8") === "regenerated mirror\\n" ? 0 : 1);\n`,
    );
    git(root, "add", "-A");
    git(root, "-c", "core.hooksPath=/dev/null", "commit", "-q", "-m", "seed");

    const installed = spawnSync(process.execPath, [join(root, "scripts", "install-git-drivers.mjs")], {
      cwd: root,
      env: GIT_ENV,
      encoding: "utf8",
    });
    expect(installed.status, installed.stderr).toBe(0);

    writeFileSync(join(root, "skills", "oc-demo", "SKILL.md"), "version: 2\n");
    git(root, "add", "skills/oc-demo/SKILL.md");
    const committed = spawnSync("git", ["-c", "commit.gpgsign=false", "commit", "-q", "-m", "verified"], {
      cwd: root,
      env: GIT_ENV,
      encoding: "utf8",
    });
    expect(committed.status, committed.stderr).toBe(0);
    const committedTree = git(root, "show", "-s", "--format=%T", "HEAD");
    const receipts = receiptFiles(root).map((file) => JSON.parse(readFileSync(file, "utf8")));
    expect(receipts.some((receipt) => receipt.verdict === "PASS" && receipt.candidate.tree === committedTree)).toBe(true);
    expect(git(root, "show", "HEAD:plugins/opchain/skills/oc-demo/SKILL.md")).toBe("regenerated mirror");

    writeFileSync(join(root, "check-generated.mjs"), "process.exit(1);\n");
    git(root, "add", "check-generated.mjs");
    const before = git(root, "rev-parse", "HEAD");
    const blocked = spawnSync("git", ["-c", "commit.gpgsign=false", "commit", "-q", "-m", "must block"], {
      cwd: root,
      env: GIT_ENV,
      encoding: "utf8",
    });
    expect(blocked.status).not.toBe(0);
    expect(git(root, "rev-parse", "HEAD")).toBe(before);
  });

  it("mounts nested package dependencies without adding them to the candidate", { timeout: 30_000 }, () => {
    const root = initialize();
    writePolicy(root, ["node", "check-nested.mjs"]);
    mkdirSync(join(root, "site", "node_modules", "fixture-package"), { recursive: true });
    writeFileSync(join(root, ".gitignore"), "node_modules/\n");
    writeFileSync(join(root, "site", "package.json"), '{"private":true,"type":"module"}\n');
    writeFileSync(join(root, "site", "node_modules", "fixture-package", "index.mjs"), 'export const marker = "nested dependency";\n');
    writeFileSync(
      join(root, "check-nested.mjs"),
      `import { marker } from "./site/node_modules/fixture-package/index.mjs";
process.exit(marker === "nested dependency" ? 0 : 1);\n`,
    );
    git(root, "add", "-A");
    git(root, "-c", "core.hooksPath=/dev/null", "commit", "-q", "-m", "nested package");

    const verified = verifier(root, "run");
    expect(verified.status, verified.stderr).toBe(0);
    expect(JSON.parse(verified.stdout)).toMatchObject({ ok: true, verdict: "PASS" });
    expect(git(root, "ls-files")).not.toContain("node_modules");
  });

  it("provides isolated Git metadata and strips inherited live Git pointers", { timeout: 30_000 }, () => {
    const root = initialize();
    writePolicy(root, ["node", "check-git-view.mjs"]);
    writeFileSync(join(root, "subject.txt"), "git-aware candidate\n");
    writeFileSync(
      join(root, "check-git-view.mjs"),
      `import { spawnSync } from "node:child_process";
const git = (...args) => spawnSync("git", args, { encoding: "utf8" });
const files = git("ls-files");
const tree = git("rev-parse", "HEAD^{tree}");
const write = git("update-ref", "refs/heads/check-write", "HEAD");
const ok = files.status === 0 && files.stdout.includes("subject.txt") &&
  tree.status === 0 && tree.stdout.trim() === process.env.OPCHAIN_CANDIDATE_TREE && write.status === 0;
process.exit(ok ? 0 : 1);\n`,
    );
    git(root, "add", "-A");
    git(root, "-c", "core.hooksPath=/dev/null", "commit", "-q", "-m", "git-aware check");

    const verified = verifier(root, "run", {
      GIT_DIR: join(root, ".git"),
      GIT_WORK_TREE: root,
      GIT_INDEX_FILE: join(root, ".git", "index"),
    });
    expect(verified.status, verified.stderr).toBe(0);
    expect(JSON.parse(verified.stdout)).toMatchObject({ ok: true, verdict: "PASS" });
    const liveRef = spawnSync("git", ["show-ref", "--verify", "--quiet", "refs/heads/check-write"], {
      cwd: root,
      env: GIT_ENV,
    });
    expect(liveRef.status).toBe(1);
  });
});
