// evidence:pr lists the pull request's commits that no PASS receipt covers,
// so the bypass count survives the squash merge that discards the local
// bug-check checkpoint (audit I-04), and fails the gate when any such commit
// carries no Opchain-Bypass: trailer. Deploy-stage behaviour is unchanged.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  bypassAccountabilityCheck,
  collectBypassedCommits,
  evaluateReleaseEvidence,
} from "../scripts/lib/release-evidence.mjs";

const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@example.com",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@example.com",
};

const candidate = "a".repeat(40);
const tree = "b".repeat(40);

function evaluate(stage, bypasses) {
  return evaluateReleaseEvidence({ stage, candidate, tree, repositoryId: "sha256:" + "0".repeat(64), receipt: null, checkpoints: {}, bypasses });
}

function check(report) {
  return report.checks.find((entry) => entry.id === "bypass-accountability");
}

describe("bypass-accountability check", () => {
  const base = { mode: "runtime", base: "c".repeat(40), range: `${"c".repeat(40)}..HEAD`, examined: 3 };

  it("passes when every commit has a receipt", () => {
    const report = evaluate("pr", { ...base, commits: [] });
    expect(check(report)).toMatchObject({ status: "PASS" });
    expect(report.bypassed_commits).toEqual([]);
    expect(report.bypass_mode).toBe("runtime");
  });

  it("warns, not fails, when every bypassed commit carries its trailer", () => {
    const commits = [{ commit: "d".repeat(40), subject: "wip", trailer: true, receipt: false, record: { reason: "owner ok", source: "no-verify" }, rewrite: false }];
    const report = evaluate("pr", { ...base, commits });
    expect(check(report).status).toBe("WARN");
    expect(report.verdict).toBe("FAIL"); // the fixture has no receipt and no checkpoints
    expect(report.checks.filter((entry) => entry.status === "FAIL").map((entry) => entry.id)).toEqual(["executable-verification", "oc-docs-forge", "oc-repo-ops"]);
    expect(report.bypassed_commits).toEqual([{ commit: "d".repeat(40), tree: null, subject: "wip", trailer: true, rewrite: false, reason: "owner ok", source: "no-verify" }]);
  });

  it("fails when a bypassed commit has no trailer and names it with the amend command", () => {
    const commits = [
      { commit: "d".repeat(40), subject: "wip", trailer: true, receipt: false, record: null, rewrite: false },
      { commit: "e".repeat(40), subject: "sneaky", trailer: false, receipt: false, record: { source: "no-verify" }, rewrite: false },
    ];
    const result = check(evaluate("pr", { ...base, commits }));
    expect(result.status).toBe("FAIL");
    expect(result.detail).toContain("eeeeeee");
    expect(result.detail).not.toContain("ddddddd");
    expect(result.detail).toContain("--trailer");
  });

  it("excuses rebase and cherry-pick rewrites bypass-list verified", () => {
    const commits = [{ commit: "f".repeat(40), subject: "rebased", trailer: false, receipt: false, record: { source: "rebase", reason: "rewritten by rebase" }, rewrite: true }];
    const result = check(evaluate("pr", { ...base, commits }));
    expect(result.status).toBe("WARN");
    expect(result.detail).toContain("1 rebase/cherry-pick rewrite");
  });

  it("reports skipped and unavailable modes as warnings", () => {
    expect(bypassAccountabilityCheck({ mode: "skipped", reason: "no origin/main", commits: [] })).toMatchObject({ status: "WARN" });
    expect(bypassAccountabilityCheck({ mode: "unavailable", reason: "bypass-list failed: exit 1", commits: [] }).detail).toContain("re-run /oc-enroll");
    expect(bypassAccountabilityCheck(null).status).toBe("WARN");
  });

  it("does not touch the deploy stage or a pr report without bypass data", () => {
    const deploy = evaluate("deploy", { ...base, commits: [] });
    expect(check(deploy)).toBeUndefined();
    expect(deploy.bypassed_commits).toBeUndefined();
    const pr = evaluate("pr", null);
    expect(check(pr)).toBeUndefined();
    expect(pr.checks).toHaveLength(3);
  });

  it("tells the author how to bind a missing handoff", () => {
    const report = evaluate("pr", null);
    expect(report.checks[1].detail).toContain("npm run checkpoint -- handoff oc-docs-forge pr-docs-v1");
    expect(report.checks[2].detail).toContain("npm run checkpoint -- handoff oc-repo-ops pr-readiness-v1");
  });

  it("never prints a self-approval command for the pre-deploy audits (C-06)", () => {
    const report = evaluate("deploy", null);
    const audit = report.checks.find((entry) => entry.id === "oc-code-auditor");
    const security = report.checks.find((entry) => entry.id === "oc-security-auditor");
    for (const entry of [audit, security]) {
      expect(entry.status).toBe("FAIL");
      expect(entry.detail).not.toContain("--verdict PASS");
      expect(entry.detail).not.toContain("npm run checkpoint -- handoff");
    }
    expect(audit.detail).toContain("/oc-audit pre-deploy");
    expect(security.detail).toContain("/oc-security");
  });
});

describe("collectBypassedCommits against a repository", () => {
  let scratch;
  let repo;
  let shas;

  const git = (...args) => {
    const r = spawnSync("git", ["-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", ...args], { cwd: repo, encoding: "utf8", env: GIT_ENV });
    if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr}`);
    return r.stdout.trim();
  };
  const commit = (message, ...extra) => {
    git("commit", "-q", "--allow-empty", "-m", message, ...extra);
    return git("rev-parse", "HEAD");
  };
  const context = () => ({ root: repo, commonDir: join(repo, ".git"), candidate: git("rev-parse", "HEAD") });

  // The fixture runtime answers bypass-list from a marker directory of
  // "receipts" and the interface's record files; the gate only reads that shape.
  const STUB = `#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
const args = process.argv.slice(2); const action = args.shift();
const opt = (n) => { const i = args.indexOf(n); return i === -1 ? null : args[i + 1]; };
const repo = opt("--repo");
const g = (...a) => spawnSync("git", a, { cwd: repo, encoding: "utf8" }).stdout.trim();
if (action !== "bypass-list") { process.stderr.write("stub: unsupported " + action + "\\n"); process.exit(2); }
const receipts = join(repo, ".git", "opchain", "test-receipts");
const out = g("rev-list", opt("--range")).split("\\n").filter(Boolean).map((commit) => {
  const tree = g("rev-parse", commit + "^{tree}");
  const record = join(repo, ".git", "opchain", "bypasses", "v1", commit + ".json");
  // Like the real verifier: a rewrite counts only when its original had a receipt.
  let original = null;
  try { original = JSON.parse(readFileSync(record, "utf8")).rewritten_from || null; } catch {}
  const rewrite = Boolean(original) && existsSync(join(receipts, g("rev-parse", original + "^{tree}")));
  return { commit, tree, receipt: existsSync(join(receipts, tree)) ? "PASS" : "none", bypassRecord: existsSync(record), trailer: Boolean(g("log", "-1", "--format=%(trailers:key=Opchain-Bypass,valueonly)", commit)), rewrite };
});
process.stdout.write(JSON.stringify(out));
`;

  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "opchain-release-evidence-"));
    repo = join(scratch, "repo");
    const remote = join(scratch, "origin.git");
    mkdirSync(repo);
    spawnSync("git", ["init", "-q", "--bare", "-b", "main", remote], { env: GIT_ENV });
    git("init", "-q", "-b", "main");
    writeFileSync(join(repo, "README.md"), "seed\n");
    git("add", "README.md");
    shas = { seed: commit("seed") };
    git("remote", "add", "origin", remote);
    git("push", "-q", "origin", "main");
    git("checkout", "-qb", "feature");
    writeFileSync(join(repo, "a.txt"), "a\n");
    git("add", "a.txt");
    shas.gated = commit("gated change");
    writeFileSync(join(repo, "b.txt"), "b\n");
    git("add", "b.txt");
    shas.trailer = commit("wip", "--trailer", "Opchain-Bypass: owner approved; tests red on main");
    writeFileSync(join(repo, "c.txt"), "c\n");
    git("add", "c.txt");
    shas.silent = commit("silent bypass");
    writeFileSync(join(repo, "d.txt"), "d\n");
    git("add", "d.txt");
    shas.prose = commit("mentions it\n\nOpchain-Bypass: appears mid-paragraph here, not as a trailer\nso this is prose");
  });

  afterEach(() => {
    rmSync(scratch, { recursive: true, force: true });
  });

  it("falls back to a trailer scan when no runtime is enrolled (CI)", () => {
    const result = collectBypassedCommits(context());
    expect(result.mode).toBe("trailer-scan");
    expect(result.base).toBe(shas.seed);
    expect(result.examined).toBe(4);
    // A-08: a line in prose is not a trailer.
    expect(result.commits.map((entry) => entry.commit)).toEqual([shas.trailer]);
    // A-04: the silent bypass is invisible here, and the check says so instead of passing.
    const verdict = bypassAccountabilityCheck(result);
    expect(verdict).toMatchObject({ status: "WARN" });
    expect(verdict.detail).toContain("trailer scan only");
    expect(verdict.detail).toContain("not detectable here");
  });

  it("does not report a pass in trailer-scan mode even with no trailers at all (A-04)", () => {
    const verdict = bypassAccountabilityCheck({ mode: "trailer-scan", base: shas.seed, range: `${shas.seed}..HEAD`, examined: 2, commits: [] });
    expect(verdict.status).toBe("WARN");
    expect(verdict.detail).toMatch(/^not evaluated/);
  });

  it("reads trailers only when asked, even with a runtime enrolled (CI: npm ci enrolls one)", () => {
    const runtime = join(repo, ".git", "opchain", "commit-gate", "v1");
    mkdirSync(runtime, { recursive: true });
    writeFileSync(join(runtime, "verify-candidate.mjs"), STUB);
    const result = collectBypassedCommits(context(), { source: "trailers" });
    expect(result.mode).toBe("trailer-scan");
    expect(result.commits.map((entry) => entry.commit)).toEqual([shas.trailer]);
    expect(bypassAccountabilityCheck(result)).toMatchObject({ status: "WARN" });
  });

  it("uses the enrolled runtime's bypass-list and fails the silent bypass", () => {
    const runtime = join(repo, ".git", "opchain", "commit-gate", "v1");
    mkdirSync(runtime, { recursive: true });
    writeFileSync(join(runtime, "verify-candidate.mjs"), STUB);
    const receipts = join(repo, ".git", "opchain", "test-receipts");
    mkdirSync(receipts, { recursive: true });
    writeFileSync(join(receipts, git("rev-parse", `${shas.gated}^{tree}`)), "PASS");
    const records = join(repo, ".git", "opchain", "bypasses", "v1");
    mkdirSync(records, { recursive: true });
    writeFileSync(join(records, `${shas.silent}.json`), JSON.stringify({ schema: "opchain.bypass-record", version: 1, commit: shas.silent, reason: null, source: "no-verify" }));

    const result = collectBypassedCommits(context());
    expect(result.mode).toBe("runtime");
    expect(result.examined).toBe(4);
    expect(result.commits.map((entry) => entry.commit).sort()).toEqual([shas.trailer, shas.silent, shas.prose].sort());
    const silent = result.commits.find((entry) => entry.commit === shas.silent);
    expect(silent).toMatchObject({ trailer: false, rewrite: false, subject: "silent bypass" });
    expect(silent.record).toMatchObject({ source: "no-verify" });
    const verdict = bypassAccountabilityCheck(result);
    expect(verdict.status).toBe("FAIL");
    expect(verdict.detail).toContain(shas.silent.slice(0, 7));

    // A record that only says it is a rewrite excuses nothing (A-01) ...
    writeFileSync(join(records, `${shas.silent}.json`), JSON.stringify({ commit: shas.silent, reason: "rewritten by rebase; the original commits were gated", source: "rebase" }));
    const claimed = collectBypassedCommits(context());
    expect(claimed.commits.find((entry) => entry.commit === shas.silent).rewrite).toBe(false);
    expect(bypassAccountabilityCheck(claimed).status).toBe("FAIL");

    // ... one whose original had a receipt does; a merge commit is never examined.
    writeFileSync(join(records, `${shas.silent}.json`), JSON.stringify({ commit: shas.silent, source: "rebase", rewritten_from: shas.gated }));
    writeFileSync(join(records, `${shas.prose}.json`), JSON.stringify({ commit: shas.prose, source: "rebase", rewritten_from: shas.gated }));
    git("checkout", "-q", "main");
    commit("main moved");
    git("push", "-q", "origin", "main");
    git("checkout", "-q", "feature");
    git("merge", "-q", "--no-ff", "main", "-m", "merge main");
    const excused = collectBypassedCommits(context());
    expect(excused.commits.map((entry) => entry.commit).sort()).toEqual([shas.trailer, shas.silent, shas.prose].sort());
    expect(excused.commits.find((entry) => entry.commit === shas.silent).rewrite).toBe(true);
    expect(bypassAccountabilityCheck(excused).status).toBe("WARN");
  });

  it("reports a runtime whose bypass-list verb is missing as unavailable, not as a pass", () => {
    const runtime = join(repo, ".git", "opchain", "commit-gate", "v1");
    mkdirSync(runtime, { recursive: true });
    writeFileSync(join(runtime, "verify-candidate.mjs"), "process.stderr.write('unknown argument: bypass-list\\n'); process.exit(1);\n");
    const result = collectBypassedCommits(context());
    expect(result.mode).toBe("unavailable");
    expect(result.reason).toContain("unknown argument");
    expect(bypassAccountabilityCheck(result).status).toBe("WARN");
  });

  it("skips when nothing on the remote can serve as a base", () => {
    git("remote", "remove", "origin");
    git("branch", "-D", "main");
    const result = collectBypassedCommits(context());
    expect(result.mode).toBe("skipped");
    expect(result.commits).toEqual([]);
  });
});
