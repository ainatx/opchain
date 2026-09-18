import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { copyFileSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const ENTRYPOINTS = [
  "scripts/check-release-tag.mjs",
  "scripts/check-release-surfaces.mjs",
  "scripts/lib/release-evidence.mjs",
];
const SURFACE_FIXTURES = [
  "README.md",
  "plugins/opchain/README.md",
  "mirror/README.md",
];
const ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
  GIT_AUTHOR_NAME: "Release CLI fixture",
  GIT_AUTHOR_EMAIL: "release-cli@example.invalid",
  GIT_COMMITTER_NAME: "Release CLI fixture",
  GIT_COMMITTER_EMAIL: "release-cli@example.invalid",
};

for (const key of [
  "GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_COMMON_DIR",
  "GIT_OBJECT_DIRECTORY", "GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_NAMESPACE", "GIT_PREFIX",
]) delete ENV[key];

// Exercise the actual entrypoints, not just their imported checker functions.
// URL-escaped paths must run the gate and preserve both success and refusal.
describe.each(["checkout", "release candidate #1%"])("release CLI in %s", (name) => {
  let scratch;
  let repo;
  let version;
  const command = (executable, args) => spawnSync(executable, args, {
    cwd: repo || ROOT, env: ENV, encoding: "utf8", timeout: 15000,
  });
  const cli = (script, ...args) => command(process.execPath, [script, ...args]);
  const git = (...args) => {
    const result = command("git", ["-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", ...args]);
    expect(result.status, result.stderr).toBe(0);
    return result.stdout.trim();
  };

  beforeAll(() => {
    scratch = mkdtempSync(join(tmpdir(), "opchain-release-cli-"));
    const target = join(scratch, name);
    git("clone", "--quiet", "--no-local", "--no-tags", ROOT, target);
    repo = target;
    for (const file of [...ENTRYPOINTS, ...SURFACE_FIXTURES]) copyFileSync(join(ROOT, file), join(repo, file));
    // Include the current uncommitted gate and the live-claim files it reads.
    git("add", ...ENTRYPOINTS, ...SURFACE_FIXTURES);
    git("commit", "--allow-empty", "-qm", "fixture: current release CLI gates");
    git("remote", "set-url", "origin", join(scratch, "absent-local-remote"));
    version = JSON.parse(readFileSync(join(repo, "release-seal.json"), "utf8")).catalogVersion;
  }, 30000);

  afterAll(() => { if (scratch) rmSync(scratch, { recursive: true, force: true }); });

  it("allows a missing tag only before signing, then blocks post-tag", () => {
    const pre = cli("scripts/release-sequence.mjs", "--stage", "pre-tag", "--version", version);
    const post = cli("scripts/release-sequence.mjs", "--stage", "post-tag");
    expect(post.status, `${post.stdout}\n${post.stderr}`).toBe(1);
    expect(`${post.stdout}${post.stderr}`).toContain(`no v${version} tag exists`);
    expect(pre.status, `${pre.stdout}\n${pre.stderr}`).toBe(0);
    expect(pre.stdout).toContain("pre-tag: 3 ok");
  });

  it("runs the tag gate when invoked through a symlink", () => {
    const alias = join(repo, "scripts", "tag-gate-alias.mjs");
    symlinkSync("check-release-tag.mjs", alias);
    try {
      const result = cli(alias, "--local", "--no-fetch", "--json");
      expect(result.status, result.stdout).toBe(1);
      expect(JSON.parse(result.stdout)).toMatchObject({ ok: false, reason: "missing-tag" });
    } finally {
      rmSync(alias);
    }
  });

  it("emits a refusal for a lightweight unsigned release tag", () => {
    git("tag", `v${version}`);
    try {
      const result = cli("scripts/check-release-tag.mjs", "--local", "--no-fetch", "--json");
      expect(result.status, result.stdout).toBe(1);
      expect(JSON.parse(result.stdout)).toMatchObject({ ok: false, reason: "unsigned-tag" });
    } finally {
      git("tag", "-d", `v${version}`);
    }
  });

  it("reports matching release surfaces and blocks drift", () => {
    const clean = cli("scripts/check-release-surfaces.mjs");
    expect(clean.status, clean.stderr).toBe(0);
    expect(clean.stdout).toContain("all live-claim surfaces agree");
    const serverPath = join(repo, "server.json");
    const original = readFileSync(serverPath, "utf8");
    try {
      writeFileSync(serverPath, JSON.stringify({ ...JSON.parse(original), version: "0.0.0" }));
      const drift = cli("scripts/check-release-surfaces.mjs");
      expect(drift.status, drift.stdout).toBe(1);
      expect(drift.stderr).toContain("release-surface drift");
    } finally {
      writeFileSync(serverPath, original);
    }
  });

  it("prints candidate identity and refuses absent executable evidence", () => {
    const identity = cli("scripts/lib/release-evidence.mjs", "--print-candidate", "--json");
    expect(identity.status, identity.stderr).toBe(0);
    expect(JSON.parse(identity.stdout)).toMatchObject({
      ok: true,
      candidate: git("rev-parse", "HEAD"),
      candidate_identity: { kind: "git_tree_projection" },
    });
    const gate = cli("scripts/lib/release-evidence.mjs", "--stage", "deploy", "--json");
    expect(gate.status, gate.stdout).toBe(1);
    expect(JSON.parse(gate.stderr)).toMatchObject({ ok: false, verdict: "FAIL" });
  });
});
