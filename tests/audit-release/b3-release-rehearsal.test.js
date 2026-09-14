import { describe, expect, it } from "vitest";
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { collectDeployDiff } from "../../.github/scripts/cloudflare-monitor.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const RELEASE = "a".repeat(40);
const RUNTIME = "b".repeat(40);
const TAG_OBJECT = "c".repeat(40);

function command(commandName, args, cwd) {
  return spawnSync(commandName, args, { cwd, encoding: "utf8" });
}

function disposableUntaggedClone() {
  const fixture = mkdtempSync(join(tmpdir(), "opchain-b3-release-"));
  const repo = join(fixture, "repo");
  const clone = command("git", ["clone", "--no-local", "--no-tags", ROOT, repo], fixture);
  if (clone.status !== 0) throw new Error(clone.stderr || "could not create release rehearsal clone");
  // B1 is deliberately still uncommitted in this audit worktree. Carry only
  // its owned release scripts into the disposable clone; no source checkout or
  // release ref is changed by the rehearsal.
  for (const file of ["scripts/release-sequence.mjs", "scripts/check-release-surfaces.mjs"]) {
    copyFileSync(join(ROOT, file), join(repo, file));
  }
  writeFileSync(join(repo, ".b3-fixture"), "disposable release rehearsal only\n");
  for (const args of [
    ["config", "user.email", "b3-fixture@example.invalid"],
    ["config", "user.name", "B3 fixture"],
    ["add", "scripts/release-sequence.mjs", "scripts/check-release-surfaces.mjs", ".b3-fixture"],
    ["commit", "-m", "fixture: release rehearsal"],
  ]) {
    const result = command("git", args, repo);
    if (result.status !== 0) throw new Error(result.stderr || `git ${args.join(" ")} failed`);
  }
  // The gate may try to refresh tags. Pointing this disposable clone at a
  // nonexistent local remote proves the local pre-tag/post-tag behavior without
  // consulting the network or modifying the source checkout.
  const remote = command("git", ["remote", "set-url", "origin", join(fixture, "no-origin")], repo);
  if (remote.status !== 0) throw new Error(remote.stderr || "could not isolate release rehearsal remote");
  return { fixture, repo };
}

describe("B3 release-failure rehearsals", () => {
  it("accepts an untagged candidate only before signing and refuses it after the tag boundary", () => {
    const { fixture, repo } = disposableUntaggedClone();
    try {
      const version = JSON.parse(readFileSync(join(repo, "release-seal.json"), "utf8")).catalogVersion;
      expect(command("git", ["rev-parse", "-q", "--verify", `refs/tags/v${version}`], repo).status).not.toBe(0);
      const preTag = command(process.execPath, ["scripts/release-sequence.mjs", "--stage", "pre-tag", "--version", version], repo);
      expect(preTag.status, `${preTag.stdout}\n${preTag.stderr}`).toBe(0);
      expect(preTag.stdout).toContain("tag-gate-expects-missing");

      const postTag = command(process.execPath, ["scripts/release-sequence.mjs", "--stage", "post-tag"], repo);
      expect(postTag.status).toBe(1);
      expect(`${postTag.stdout}${postTag.stderr}`).toContain(`no v${version} tag exists`);
      expect(`${postTag.stdout}${postTag.stderr}`).toContain("release-tag");
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  }, 30_000);

  it("keeps an approved older runtime as the deploy-diff base when newer docs arrive on main", () => {
    const baseline = {
      release: { tag: "v1.9.1", tagObject: TAG_OBJECT, sourceSha: RELEASE, sourceShortSha: "aaaaaaa" },
      runtime: { sha: RUNTIME, shortSha: "bbbbbbb", approval: "reviewed hotfix" },
      deployLag: { nonDeployPathPrefixes: ["docs/", ".checkpoints/"], nonDeployPaths: [] },
    };
    const run = (args) => {
      if (args[0] === "cat-file" && args[1] === "-e") return "";
      if (args[0] === "cat-file" && args[1] === "-t") return "tag";
      if (args[0] === "rev-parse" && args[1] === "refs/tags/v1.9.1") return TAG_OBJECT;
      if (args[0] === "rev-parse" && args[1] === "v1.9.1^{commit}") return RELEASE;
      if (args[0] === "rev-parse" && args[1] === "--verify") return "origin/main";
      if (args[0] === "merge-base") return "";
      if (args[0] === "diff") return "docs/runbooks/newer-than-runtime.md\n";
      throw new Error(`unexpected git command: ${args.join(" ")}`);
    };

    const result = collectDeployDiff(baseline, { run });
    expect(result).toMatchObject({
      baseSha: RUNTIME,
      baseShortSha: "bbbbbbb",
      deployRelevant: [],
      nonDeploy: ["docs/runbooks/newer-than-runtime.md"],
    });
  });
});
