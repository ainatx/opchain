// End to end, in a scratch consumer repository with a vendored runtime: two pull
// requests that each bind their pre-PR evidence land on main in either order with
// no conflict, and `release-evidence --stage pr` passes on both heads. Before the
// per-branch handoff store, every binding appended to the same two checkpoint files,
// so the second PR conflicted as soon as the first merged (deftwright-site #260/#261,
// 2026-10-27) — the last test reproduces that with the shared-checkpoint layout.
import { afterAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { vendorRuntime } from "../scripts/install-git-drivers.mjs";

const CLI = join(import.meta.dirname, "..", "scripts", "checkpoint.mjs");
const ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@example.com",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@example.com",
};
delete ENV.CLAUDE_PLUGIN_ROOT;
const READER = ".opchain/runtime/scripts/lib/release-evidence.mjs";
const BOUND = [["oc-docs-forge", "pr-docs-v1"], ["oc-repo-ops", "pr-readiness-v1"]];
// ~4 s each unloaded: a dozen git, binder and verifier children per test.
const SPAWN_HEAVY = 90_000;

const scratch = [];
afterAll(() => scratch.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

function sh(root, command, args) {
  return spawnSync(command, args, { cwd: root, env: { ...ENV, OPCHAIN_ROOT: root, OPCHAIN_CHECKPOINTS_DIR: join(root, ".checkpoints") }, encoding: "utf8" });
}

function git(root, ...args) {
  const r = sh(root, "git", ["-c", "core.hooksPath=/dev/null", ...args]);
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr || r.stdout}`);
  return r.stdout.trim();
}

/** Exit status of a merge of `ref` into `base`, computed without touching the checkout. */
function mergeConflicts(root, base, ref) {
  const r = sh(root, "git", ["merge-tree", "--write-tree", "--name-only", base, ref]);
  return { clean: r.status === 0, files: r.stdout.trim().split("\n").slice(1).filter(Boolean) };
}

/** A consumer repository enrolled with this checkout's runtime and pushed to a bare
 *  origin. `oldReader` commits a base-branch reader that predates the store. */
function consumer({ oldReader = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), "oc-store-merge-"));
  const remote = mkdtempSync(join(tmpdir(), "oc-store-origin-"));
  scratch.push(root, remote);
  git(remote, "init", "-q", "--bare", "-b", "main");
  git(root, "init", "-q", "-b", "main");
  writeFileSync(join(root, "README.md"), "fixture\n");
  writeFileSync(join(root, ".gitignore"), ".checkpoints/*.lock\n");
  writeFileSync(join(root, ".bugcheck.json"), `${JSON.stringify({
    mode: "strict",
    verification: { required_checks: ["tests"], commands: { tests: ["node", "-e", "0"] }, timeout_ms: 20000 },
  })}\n`);
  vendorRuntime(root);
  if (oldReader) writeFileSync(join(root, READER), "// release-evidence.mjs from before the handoff store\n");
  git(root, "add", "-A");
  git(root, "commit", "-qm", "enroll");
  git(root, "remote", "add", "origin", remote);
  git(root, "push", "-q", "-u", "origin", "main");
  return root;
}

function bind(root, skill, policy) {
  const r = sh(root, process.execPath, [CLI, "handoff", skill, policy, "--verdict", "PASS", "--scope", "fixture", "--json"]);
  if (r.status !== 0) throw new Error(r.stderr);
  return JSON.parse(r.stdout);
}

function bindAll(root) {
  const stores = BOUND.map(([skill, policy]) => bind(root, skill, policy).store);
  git(root, "add", ".checkpoints");
  git(root, "commit", "-qm", "chore(evidence): bind pre-PR handoffs");
  return stores;
}

/** A feature branch off origin/main: one content commit, then its evidence commit. */
function feature(root, branch, file, { runtime = false } = {}) {
  git(root, "checkout", "-q", "-b", branch, "origin/main");
  if (runtime) vendorRuntime(root);
  writeFileSync(join(root, file), `${branch}\n`);
  git(root, "add", "-A");
  git(root, "commit", "-qm", `feat: ${branch}`);
  return bindAll(root);
}

/** What the consumer's CI runs: the verifier on the head, then the evidence gate. */
function evidence(root) {
  const verified = sh(root, process.execPath, [join(root, ".opchain/runtime/scripts/verify-candidate.mjs"), "run", "--repo", root, "--json"]);
  if (verified.status !== 0) throw new Error(`verify-candidate: ${verified.stdout}${verified.stderr}`);
  const r = sh(root, process.execPath, [join(root, READER), "--stage", "pr", "--repo", root, "--bypass-source", "trailers", "--json"]);
  return { code: r.status, report: JSON.parse((r.stdout || r.stderr).trim()) };
}

function detail(result, id) {
  return result.report.checks.find((check) => check.id === id).detail;
}

/** The squash merge GitHub's merge button makes, pushed so origin/main follows. */
function land(root, branch) {
  git(root, "checkout", "-q", "main");
  git(root, "merge", "-q", "--squash", branch);
  git(root, "commit", "-qm", `${branch} (#1)`);
  git(root, "push", "-q", "origin", "main");
}

function storeFiles(root, policy) {
  const walk = (dir, prefix = "") => readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => (entry.isDirectory() ? walk(join(dir, entry.name), `${prefix}${entry.name}/`) : [`${prefix}${entry.name}`]));
  return walk(join(root, ".checkpoints", "handoffs", policy)).sort();
}

describe("per-branch handoff store: concurrent PRs merge in either order", () => {
  for (const [first, second, update] of [["feature/a", "feature/b", "merge"], ["feature/b", "feature/a", "rebase"]]) {
    it(`${first} lands first, then ${second} after a ${update} from main`, { timeout: SPAWN_HEAVY }, () => {
      const root = consumer();
      expect(feature(root, "feature/a", "a.txt")).toEqual(["handoffs", "handoffs"]);
      expect(feature(root, "feature/b", "b.txt")).toEqual(["handoffs", "handoffs"]);
      for (const branch of [first, second]) {
        git(root, "checkout", "-q", branch);
        expect(evidence(root).code).toBe(0);
      }

      land(root, first);
      // The step that conflicted on the shared checkpoints: either PR still merges.
      expect(mergeConflicts(root, "main", second)).toEqual({ clean: true, files: [] });

      git(root, "checkout", "-q", second);
      const up = update === "merge" ? sh(root, "git", ["merge", "-q", "--no-edit", "main"]) : sh(root, "git", ["rebase", "-q", "main"]);
      expect(up.status, up.stderr).toBe(0);
      // main's change is new to this tree, so the old binding no longer covers it ...
      const stale = evidence(root);
      expect(stale.code).toBe(1);
      expect(detail(stale, "oc-docs-forge")).toContain("no handoff under .checkpoints/handoffs/pr-docs-v1/ or in .checkpoints/oc-docs-forge.checkpoint.json is bound to");
      // ... and the rebind rewrites only this branch's own two files.
      bindAll(root);
      expect(git(root, "diff", "--name-only", "HEAD~1", "HEAD").split("\n").sort()).toEqual([
        `.checkpoints/handoffs/pr-docs-v1/${second}.json`,
        `.checkpoints/handoffs/pr-readiness-v1/${second}.json`,
      ]);
      const passed = evidence(root);
      expect(passed.code).toBe(0);
      expect(detail(passed, "oc-repo-ops")).toContain(`(.checkpoints/handoffs/pr-readiness-v1/${second}.json)`);

      expect(mergeConflicts(root, "main", second).clean).toBe(true);
      land(root, second);
      for (const [, policy] of BOUND) expect(storeFiles(root, policy)).toEqual(["feature/a.json", "feature/b.json"]);
      expect(readdirSync(join(root, ".checkpoints")).filter((name) => name.endsWith(".checkpoint.json"))).toEqual([]);
    });
  }

  it("the PR that vendors a store-reading runtime binds into the shared checkpoint, which the gate still accepts; the next PR uses the store", { timeout: SPAWN_HEAVY }, () => {
    const root = consumer({ oldReader: true });
    // The base branch's reader is what a consumer's evidence workflow runs.
    expect(feature(root, "chore/runtime", "c.txt", { runtime: true })).toEqual(["checkpoint", "checkpoint"]);
    const legacy = JSON.parse(readFileSync(join(root, ".checkpoints", "oc-docs-forge.checkpoint.json"), "utf8"));
    expect(legacy.handoffs).toEqual([expect.objectContaining({ type: "verification.verdict", payload: expect.objectContaining({ policy: "pr-docs-v1" }) })]);
    const accepted = evidence(root);
    expect(accepted.code).toBe(0);
    expect(detail(accepted, "oc-docs-forge")).not.toContain(".checkpoints/handoffs/");

    land(root, "chore/runtime");
    expect(feature(root, "feature/next", "d.txt")).toEqual(["handoffs", "handoffs"]);
    expect(evidence(root).code).toBe(0);
  });

  it("for contrast: two PRs binding into the shared checkpoints conflict once one of them lands", { timeout: SPAWN_HEAVY }, () => {
    const root = consumer({ oldReader: true });
    expect(feature(root, "feature/x", "x.txt", { runtime: true })).toEqual(["checkpoint", "checkpoint"]);
    expect(feature(root, "feature/y", "y.txt", { runtime: true })).toEqual(["checkpoint", "checkpoint"]);
    land(root, "feature/x");
    expect(mergeConflicts(root, "main", "feature/y")).toEqual({
      clean: false,
      files: expect.arrayContaining([".checkpoints/oc-docs-forge.checkpoint.json", ".checkpoints/oc-repo-ops.checkpoint.json"]),
    });
  });
});
